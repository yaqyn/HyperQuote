create or replace function app_private.current_actor_user_id()
returns uuid
language plpgsql
stable
security definer
set search_path = public, app_private
as $$
declare
	actor_user_id text := nullif(current_setting('app.actor_user_id', true), '');
begin
	if actor_user_id is not null then
		return actor_user_id::uuid;
	end if;
	return auth.uid();
exception
	when invalid_text_representation then
		return auth.uid();
end;
$$;

create or replace function app_private.set_service_actor(
	p_actor_user_id uuid,
	p_actor_pool text
)
returns void
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	if coalesce(auth.role(), '') <> 'service_role' then
		raise exception 'service_role_required' using errcode = '42501';
	end if;
	if p_actor_user_id is null then
		raise exception 'actor_user_id_required' using errcode = '23514';
	end if;
	if p_actor_pool not in ('external', 'internal', 'driver') then
		raise exception 'valid_actor_pool_required' using errcode = '23514';
	end if;

	perform set_config('app.actor_user_id', p_actor_user_id::text, true);
	perform set_config('app.actor_pool', p_actor_pool, true);
	perform set_config('request.jwt.claim.sub', p_actor_user_id::text, true);
	perform set_config(
		'request.jwt.claims',
		jsonb_build_object(
			'sub', p_actor_user_id::text,
			'role', 'authenticated',
			'pool', p_actor_pool
		)::text,
		true
	);
end;
$$;

create or replace function public.current_customer_id()
returns uuid
language sql
stable
security definer
set search_path = public, app_private
as $$
	select c.id
	from public.customers c
	where c.user_id = app_private.current_actor_user_id()
	limit 1
$$;

create or replace function public.current_employee_id()
returns uuid
language sql
stable
security definer
set search_path = public, app_private
as $$
	select e.id
	from public.employees e
	where e.user_id = app_private.current_actor_user_id()
	  and e.status = 'active'
	limit 1
$$;

create or replace function public.current_driver_id()
returns uuid
language sql
stable
security definer
set search_path = public, app_private
as $$
	select d.id
	from public.drivers d
	where d.user_id = app_private.current_actor_user_id()
	  and d.status <> 'disabled'
	limit 1
$$;

create or replace function public.is_employee_with_role(required_role text)
returns boolean
language sql
stable
security definer
set search_path = public, app_private
as $$
	select exists (
		select 1
		from public.employees e
		left join public.employee_roles er on er.employee_id = e.id
		where e.user_id = app_private.current_actor_user_id()
		  and e.status = 'active'
		  and (e.is_ceo or er.role::text = required_role or er.role = 'admin')
	)
$$;

create or replace function public.can_access_panel(
	required_panel text,
	write_required boolean default false
)
returns boolean
language sql
stable
security definer
set search_path = public, app_private
as $$
	select exists (
		select 1
		from public.employees e
		left join public.employee_roles er on er.employee_id = e.id
		left join public.employee_panel_permissions ep on ep.employee_id = e.id
		where e.user_id = app_private.current_actor_user_id()
		  and e.status = 'active'
		  and (
			e.is_ceo
			or er.role = 'admin'
			or er.role::text = required_panel
			or (
				ep.panel::text = required_panel
				and ep.can_read
				and (not write_required or ep.can_write)
			)
		  )
	)
$$;

create or replace function public.can_access_ceo_search()
returns boolean
language sql
stable
security definer
set search_path = public, app_private
as $$
	select exists (
		select 1
		from public.employees e
		left join public.employee_roles er on er.employee_id = e.id
		left join public.employee_panel_permissions ep on ep.employee_id = e.id
		where e.user_id = app_private.current_actor_user_id()
		  and e.status = 'active'
		  and (
			e.is_ceo
			or er.role = 'ceo'
			or (ep.panel = 'search' and ep.can_read)
		  )
	)
$$;

create or replace function public.service_require_panel(
	p_actor_user_id uuid,
	p_actor_pool text,
	required_panel text,
	write_required boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	return public.require_panel(required_panel, write_required);
end;
$$;

create or replace function public.service_current_employee_id(
	p_actor_user_id uuid,
	p_actor_pool text
)
returns uuid
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	return public.current_employee_id();
end;
$$;

create or replace function public.service_can_access_ceo_search(
	p_actor_user_id uuid,
	p_actor_pool text
)
returns boolean
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	return public.can_access_ceo_search();
end;
$$;

create or replace function public.service_log_activity(
	p_actor_user_id uuid,
	p_actor_pool text,
	entity_type text,
	entity_id uuid,
	action public.audit_event_type,
	details jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	perform public.log_activity(entity_type, entity_id, action, details);
end;
$$;

create or replace function public.service_record_ai_tool_call(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_agent_scope public.ai_agent_scope,
	p_tool_name text,
	p_read_entities text[] default '{}',
	p_write_entity_type text default null,
	p_write_entity_id uuid default null,
	p_approved_by_user boolean default false,
	p_input_summary jsonb default '{}'::jsonb,
	p_output_summary jsonb default '{}'::jsonb
)
returns public.ai_tool_call_audit
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	return public.record_ai_tool_call(
		p_agent_scope,
		p_tool_name,
		p_read_entities,
		p_write_entity_type,
		p_write_entity_id,
		p_approved_by_user,
		p_input_summary,
		p_output_summary
	);
end;
$$;

create or replace function public.service_find_claimable_customer_profile(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_phone text
)
returns table(id uuid, company_name text, user_id uuid)
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	return query select * from public.find_claimable_customer_profile(p_phone);
end;
$$;

create or replace function public.service_claim_customer_profile(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_phone text
)
returns public.customers
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	return public.claim_customer_profile(p_phone);
end;
$$;

create or replace function public.service_customer_submit_saved_quote_request(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_quote_request_id uuid,
	p_source text default 'portal'
)
returns public.quote_requests
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	return public.customer_submit_saved_quote_request(p_quote_request_id, p_source);
end;
$$;

create or replace function public.service_customer_record_quote_request_draft_saved(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_quote_request_id uuid,
	p_source text,
	p_context jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	perform public.customer_record_quote_request_draft_saved(
		p_quote_request_id,
		p_source,
		p_context
	);
end;
$$;

create or replace function public.service_customer_record_order_saved_as_draft(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_source_quote_request_id uuid,
	p_draft_quote_request_id uuid,
	p_source_order_id uuid default null,
	p_source text default 'portal'
)
returns void
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	perform public.customer_record_order_saved_as_draft(
		p_source_quote_request_id,
		p_draft_quote_request_id,
		p_source_order_id,
		p_source
	);
end;
$$;

create or replace function public.service_customer_record_portal_order_viewed(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_quote_request_id uuid,
	p_order_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	perform public.customer_record_portal_order_viewed(
		p_quote_request_id,
		p_order_id
	);
end;
$$;

create or replace function public.service_customer_accept_quote(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_quote_id uuid
)
returns public.orders
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	return public.customer_accept_quote(p_quote_id);
end;
$$;

create or replace function public.service_customer_decline_quote(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_quote_id uuid,
	p_reason text,
	p_notes text
)
returns public.quotes
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	return public.customer_decline_quote(p_quote_id, p_reason, p_notes);
end;
$$;

create or replace function public.service_customer_request_quote_negotiation(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_quote_id uuid,
	p_counter_type public.quote_counter_type,
	p_line_items jsonb,
	p_total_discount numeric,
	p_self_pickup boolean,
	p_notes text
)
returns public.quote_counter_offers
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	return public.customer_request_quote_negotiation(
		p_quote_id,
		p_counter_type,
		p_line_items,
		p_total_discount,
		p_self_pickup,
		p_notes
	);
end;
$$;

create or replace function public.service_customer_submit_quote_line_response(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_quote_id uuid,
	p_line_responses jsonb
)
returns public.quotes
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	return public.customer_submit_quote_line_response(
		p_quote_id,
		p_line_responses
	);
end;
$$;

create or replace function public.service_customer_get_delivery_secret(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_order_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	return public.customer_get_delivery_secret(p_order_id);
end;
$$;

create or replace function public.service_customer_order_delivery_tracking(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_order_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	return public.customer_order_delivery_tracking(p_order_id);
end;
$$;

create or replace function public.service_transfer_team_ownership(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_member_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	perform public.transfer_team_ownership(p_member_id);
end;
$$;

create or replace function public.service_set_employee_presence(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_status text,
	p_active_panel text default null
)
returns public.employee_presence
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	return public.set_employee_presence(p_status, p_active_panel);
end;
$$;

create or replace function public.service_claim_next_sales_order(
	p_actor_user_id uuid,
	p_actor_pool text
)
returns public.quote_requests
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	return public.claim_next_sales_order();
end;
$$;

create or replace function public.service_sales_claim_order(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_order_id uuid
)
returns public.quote_requests
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	return public.sales_claim_order(p_order_id);
end;
$$;

create or replace function public.service_sales_save_and_requeue(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_order_id uuid,
	p_note text default null,
	p_return_minutes integer default 10
)
returns public.quote_requests
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	return public.sales_save_and_requeue(p_order_id, p_note, p_return_minutes);
end;
$$;

create or replace function public.service_sales_reject_order(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_order_id uuid,
	p_reason text,
	p_proof jsonb
)
returns public.quote_requests
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	return public.sales_reject_order(p_order_id, p_reason, p_proof);
end;
$$;

create or replace function public.service_sales_cancel_order(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_order_id uuid,
	p_reason text,
	p_proof jsonb default '{}'::jsonb
)
returns public.quote_requests
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	return public.sales_cancel_order(p_order_id, p_reason, p_proof);
end;
$$;

create or replace function public.service_sales_record_call_note(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_order_id uuid,
	p_outcome text,
	p_notes text default null
)
returns public.sales_call_notes
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	return public.sales_record_call_note(p_order_id, p_outcome, p_notes);
end;
$$;

create or replace function public.service_sales_save_quote_version(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_order_id uuid,
	p_items jsonb,
	p_notes text default null
)
returns public.sales_quote_versions
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	return public.sales_save_quote_version(p_order_id, p_items, p_notes);
end;
$$;

create or replace function public.service_create_manual_order(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_customer_id uuid,
	p_items jsonb,
	p_notes text default null
)
returns public.quote_requests
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	return public.create_manual_order(p_customer_id, p_items, p_notes);
end;
$$;

create or replace function public.service_request_price_update(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_product_id uuid,
	p_order_id uuid,
	p_reason text
)
returns public.price_update_requests
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	return public.request_price_update(p_product_id, p_order_id, p_reason);
end;
$$;

create or replace function public.service_admin_record_audit(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_entity_type text,
	p_entity_id uuid,
	p_action public.audit_event_type,
	p_reason text,
	p_details jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	perform public.admin_record_audit(
		p_entity_type,
		p_entity_id,
		p_action,
		p_reason,
		p_details
	);
end;
$$;

create or replace function public.service_admin_assign_employee_role(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_employee_id uuid,
	p_role public.employee_role,
	p_reason text
)
returns void
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	perform public.admin_assign_employee_role(p_employee_id, p_role, p_reason);
end;
$$;

create or replace function public.service_admin_remove_employee_role(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_employee_id uuid,
	p_role public.employee_role,
	p_reason text
)
returns void
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	perform public.admin_remove_employee_role(p_employee_id, p_role, p_reason);
end;
$$;

create or replace function public.service_admin_disable_driver(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_driver_id uuid,
	p_reason text
)
returns void
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	perform public.admin_disable_driver(p_driver_id, p_reason);
end;
$$;

create or replace function public.service_admin_export_data(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_scope text,
	p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	return public.admin_export_data(p_scope, p_reason);
end;
$$;

create or replace function public.service_set_support_ticket_status(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_ticket_id uuid,
	p_status public.support_ticket_status
)
returns public.support_tickets
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	return public.set_support_ticket_status(p_ticket_id, p_status);
end;
$$;

create or replace function public.service_set_support_conversation_status(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_conversation_id uuid,
	p_status public.support_conversation_status
)
returns public.support_conversations
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	return public.set_support_conversation_status(p_conversation_id, p_status);
end;
$$;

create or replace function public.service_assign_support_ticket(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_ticket_id uuid
)
returns public.support_tickets
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	return public.assign_support_ticket(p_ticket_id);
end;
$$;

create or replace function public.service_assign_support_conversation(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_conversation_id uuid
)
returns public.support_conversations
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	return public.assign_support_conversation(p_conversation_id);
end;
$$;

create or replace function public.service_link_support_conversation_to_customer(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_conversation_id uuid
)
returns public.support_conversations
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	return public.link_support_conversation_to_customer(p_conversation_id);
end;
$$;

create or replace function public.service_send_support_conversation_reply(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_conversation_id uuid,
	p_body text,
	p_channel public.support_message_channel
)
returns public.support_messages
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	return public.send_support_conversation_reply(
		p_conversation_id,
		p_body,
		p_channel
	);
end;
$$;

create or replace function public.service_driver_app_dashboard(
	p_actor_user_id uuid,
	p_actor_pool text
)
returns jsonb
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	return public.driver_app_dashboard();
end;
$$;

create or replace function public.service_driver_accept_delivery(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_delivery_id uuid
)
returns public.deliveries
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	return public.driver_accept_delivery(p_delivery_id);
end;
$$;

create or replace function public.service_driver_start_delivery(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_delivery_id uuid
)
returns public.deliveries
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	return public.driver_start_delivery(p_delivery_id);
end;
$$;

create or replace function public.service_driver_confirm_arrival_secret_result(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_delivery_id uuid,
	p_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	return public.driver_confirm_arrival_secret_result(p_delivery_id, p_code);
end;
$$;

create or replace function public.service_driver_confirm_delivery(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_delivery_id uuid,
	p_signature_path text,
	p_signer_name text,
	p_latitude numeric,
	p_longitude numeric
)
returns public.deliveries
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	return public.driver_confirm_delivery(
		p_delivery_id,
		p_signature_path,
		p_signer_name,
		p_latitude,
		p_longitude
	);
end;
$$;

create or replace function public.service_driver_reject_delivery(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_delivery_id uuid,
	p_reason text,
	p_proof jsonb
)
returns public.deliveries
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	return public.driver_reject_delivery(p_delivery_id, p_reason, p_proof);
end;
$$;

create or replace function public.service_driver_reopen_delivery_route(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_delivery_id uuid
)
returns public.deliveries
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	return public.driver_reopen_delivery_route(p_delivery_id);
end;
$$;

create or replace function public.service_driver_set_online(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_online boolean
)
returns public.driver_online_states
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	return public.driver_set_online(p_online);
end;
$$;

create or replace function public.service_driver_update_location(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_latitude numeric,
	p_longitude numeric,
	p_accuracy_meters numeric default null,
	p_delivery_id uuid default null,
	p_heading numeric default null,
	p_speed_kmh numeric default null
)
returns public.driver_locations
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	return public.driver_update_location(
		p_latitude,
		p_longitude,
		p_accuracy_meters,
		p_delivery_id,
		p_heading,
		p_speed_kmh
	);
end;
$$;

create or replace function public.service_driver_list_active_drivers(
	p_actor_user_id uuid,
	p_actor_pool text
)
returns jsonb
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	return public.driver_list_active_drivers();
end;
$$;

create or replace function public.service_driver_list_team_messages(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_limit integer default 50
)
returns jsonb
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	return public.driver_list_team_messages(p_limit);
end;
$$;

create or replace function public.service_driver_send_team_message(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_body text
)
returns jsonb
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	return public.driver_send_team_message(p_body);
end;
$$;

create or replace function public.service_warehouse_assign_loading_driver(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_order_id uuid,
	p_truck_id uuid
)
returns public.loading_task_drivers
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	return public.warehouse_assign_loading_driver(p_order_id, p_truck_id);
end;
$$;

create or replace function public.service_warehouse_toggle_loading_item(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_order_id uuid,
	p_truck_id uuid,
	p_product_slug text
)
returns public.loading_tasks
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	return public.warehouse_toggle_loading_item(
		p_order_id,
		p_truck_id,
		p_product_slug
	);
end;
$$;

create or replace function public.service_warehouse_mark_loading_ready(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_order_id uuid
)
returns public.loading_tasks
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	return public.warehouse_mark_loading_ready(p_order_id);
end;
$$;

create or replace function public.service_warehouse_remove_loading_driver(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_order_id uuid,
	p_truck_id uuid
)
returns public.loading_tasks
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	return public.warehouse_remove_loading_driver(p_order_id, p_truck_id);
end;
$$;

create or replace function public.service_warehouse_approve_loading(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_loading_task_id uuid,
	p_proof jsonb
)
returns public.loading_tasks
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	return public.warehouse_approve_loading(p_loading_task_id, p_proof);
end;
$$;

create or replace function public.service_warehouse_reject_loading(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_loading_task_id uuid,
	p_reason text,
	p_proof jsonb
)
returns public.loading_tasks
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	return public.warehouse_reject_loading(p_loading_task_id, p_reason, p_proof);
end;
$$;

create or replace function public.service_warehouse_reset_loading(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_order_id uuid
)
returns public.loading_tasks
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	return public.warehouse_reset_loading(p_order_id);
end;
$$;

create or replace function public.service_dispatch_complete_delivery(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_delivery_id uuid,
	p_proof jsonb
)
returns public.deliveries
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	return public.dispatch_complete_delivery(p_delivery_id, p_proof);
end;
$$;

create or replace function public.service_dispatch_complete_loaded_order(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_order_id uuid,
	p_proof jsonb
)
returns public.deliveries
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	return public.dispatch_complete_loaded_order(p_order_id, p_proof);
end;
$$;

create or replace function public.service_dispatch_return_loaded_order(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_order_id uuid,
	p_reason text,
	p_proof jsonb
)
returns public.deliveries
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	return public.dispatch_return_loaded_order(p_order_id, p_reason, p_proof);
end;
$$;

create or replace function public.service_finance_cancel_customer_order(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_order_id uuid,
	p_reason text,
	p_proof jsonb default '{}'::jsonb
)
returns public.orders
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	return public.finance_cancel_customer_order(p_order_id, p_reason, p_proof);
end;
$$;

create or replace function public.service_finance_cancel_supplier_refill(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_refill_request_id uuid,
	p_reason text,
	p_proof jsonb default '{}'::jsonb
)
returns public.refill_requests
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	return public.finance_cancel_supplier_refill(
		p_refill_request_id,
		p_reason,
		p_proof
	);
end;
$$;

create or replace function public.service_record_customer_payment(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_order_id uuid,
	p_amount numeric,
	p_payment_fraction numeric,
	p_proof_path text
)
returns public.customer_payments
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	return public.record_customer_payment(
		p_order_id,
		p_amount,
		p_payment_fraction,
		p_proof_path
	);
end;
$$;

create or replace function public.service_record_supplier_payment(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_refill_request_id uuid,
	p_amount numeric,
	p_payment_fraction numeric,
	p_proof_path text
)
returns public.supplier_payments
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	return public.record_supplier_payment(
		p_refill_request_id,
		p_amount,
		p_payment_fraction,
		p_proof_path
	);
end;
$$;

create or replace function public.service_record_customer_payment_followup(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_order_id uuid,
	p_contact_channel text,
	p_outcome text,
	p_notes text,
	p_follow_up_state text,
	p_follow_up_due_at timestamptz
)
returns public.finance_payment_followups
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	return public.record_customer_payment_followup(
		p_order_id,
		p_contact_channel,
		p_outcome,
		p_notes,
		p_follow_up_state,
		p_follow_up_due_at
	);
end;
$$;

create or replace function public.service_record_supplier_payment_followup(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_refill_request_id uuid,
	p_contact_channel text,
	p_outcome text,
	p_notes text,
	p_follow_up_state text,
	p_follow_up_due_at timestamptz
)
returns public.finance_payment_followups
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	return public.record_supplier_payment_followup(
		p_refill_request_id,
		p_contact_channel,
		p_outcome,
		p_notes,
		p_follow_up_state,
		p_follow_up_due_at
	);
end;
$$;

create or replace function public.service_inventory_update_price(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_product_id uuid,
	p_supplier_id uuid,
	p_new_price numeric,
	p_proof_path text,
	p_notes text
)
returns public.price_updates
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	return public.inventory_update_price(
		p_product_id,
		p_supplier_id,
		p_new_price,
		p_proof_path,
		p_notes
	);
end;
$$;

create or replace function public.service_inventory_update_supplier_prices(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_supplier_id uuid,
	p_updates jsonb,
	p_proof_path text,
	p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	return public.inventory_update_supplier_prices(
		p_supplier_id,
		p_updates,
		p_proof_path,
		p_notes
	);
end;
$$;

create or replace function public.service_create_supplier_refill(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_product_id uuid,
	p_supplier_id uuid,
	p_quantity numeric,
	p_unit_cost numeric,
	p_proof jsonb
)
returns public.refill_requests
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	return public.create_supplier_refill(
		p_product_id,
		p_supplier_id,
		p_quantity,
		p_unit_cost,
		p_proof
	);
end;
$$;

create or replace function public.service_warehouse_approve_receiving(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_receiving_task_id uuid,
	p_proof jsonb
)
returns public.receiving_tasks
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	return public.warehouse_approve_receiving(p_receiving_task_id, p_proof);
end;
$$;

create or replace function public.service_warehouse_reject_receiving(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_receiving_task_id uuid,
	p_reason text,
	p_proof jsonb
)
returns public.receiving_tasks
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	return public.warehouse_reject_receiving(
		p_receiving_task_id,
		p_reason,
		p_proof
	);
end;
$$;

revoke all privileges on schema public from public, anon, authenticated;
grant usage, create on schema public to postgres, supabase_admin;
grant usage on schema public to service_role;

revoke all privileges on all tables in schema public from public, anon, authenticated;
revoke all privileges on all sequences in schema public from public, anon, authenticated;
revoke all privileges on all functions in schema public from public, anon, authenticated;

grant all privileges on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

do $$
declare
	owner_role text;
begin
	foreach owner_role in array array['postgres', 'supabase_admin']
	loop
		begin
			execute format(
				'alter default privileges for role %I in schema public revoke all on tables from public, anon, authenticated',
				owner_role
			);
			execute format(
				'alter default privileges for role %I in schema public revoke all on sequences from public, anon, authenticated',
				owner_role
			);
			execute format(
				'alter default privileges for role %I in schema public revoke execute on functions from public, anon, authenticated',
				owner_role
			);
			execute format(
				'alter default privileges for role %I in schema public grant all on tables to service_role',
				owner_role
			);
			execute format(
				'alter default privileges for role %I in schema public grant usage, select on sequences to service_role',
				owner_role
			);
			execute format(
				'alter default privileges for role %I in schema public grant execute on functions to service_role',
				owner_role
			);
		exception
			when insufficient_privilege then
				raise notice
					'skipping default privilege hardening for role %: migration role lacks membership',
					owner_role;
		end;
	end loop;
end;
$$;
