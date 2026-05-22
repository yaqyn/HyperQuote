create or replace function public.is_important_activity(
	p_action public.audit_event_type,
	p_entity_type text,
	p_details jsonb default '{}'::jsonb
)
returns boolean
language sql
immutable
set search_path = public
as $$
	select
		not (coalesce(p_details, '{}'::jsonb) ? 'source_action')
		and (
			p_action in (
				'admin_export_created',
				'customer_profile_claimed',
				'customer_payment_followup_recorded',
				'customer_payment_recorded',
				'customer_quote_accepted',
				'customer_quote_declined',
				'customer_quote_line_response_submitted',
				'customer_quote_negotiation_requested',
				'customer_order_saved_as_draft',
				'customer_signature_captured',
				'customer_signed_in',
				'customer_signed_up',
				'delivery_returned_to_warehouse_loading',
				'dispatch_delivery_completed',
				'dispatch_delivery_rejected',
				'dispatch_driver_assigned',
				'driver_assigned_delivery',
				'driver_delivery_accepted',
				'driver_delivery_arrived',
				'driver_delivery_confirmed',
				'driver_delivery_rejected',
				'driver_delivery_route_reopened',
				'driver_delivery_started',
				'driver_rejection_proof_uploaded',
				'draft_created',
				'draft_saved',
				'draft_submitted',
				'draft_updated',
				'internal_employee_created',
				'internal_employee_role_assigned',
				'internal_employee_role_removed',
				'inventory_order_evaluated',
				'inventory_price_updated',
				'manual_order_created',
				'order_submitted',
				'order_stock_reserved',
				'price_update_requested',
				'provisional_customer_created',
				'provisional_customer_confirmed',
				'sales_call_note_recorded',
				'sales_customer_called',
				'sales_order_canceled',
				'sales_order_claimed',
				'sales_order_confirmed',
				'sales_order_opened',
				'sales_order_rejected',
				'sales_order_requeued',
				'sales_quote_approved',
				'sales_quote_draft_saved',
				'sales_quote_edited',
				'supplier_payment_followup_recorded',
				'supplier_payment_recorded',
				'supplier_refill_canceled',
				'supplier_refill_created',
				'support_assigned',
				'support_conversation_linked_to_customer',
				'support_reply_sent',
				'support_status_updated',
				'support_ticket_created',
				'support_ticket_reply_sent',
				'portal_draft_saved',
				'portal_order_viewed',
				'quote_request_submitted',
				'admin_role_assigned',
				'admin_role_removed',
				'admin_database_exported',
				'warehouse_loading_approved',
				'warehouse_loading_driver_assigned',
				'warehouse_loading_driver_removed',
				'warehouse_loading_marked_ready',
				'warehouse_loading_rejected',
				'warehouse_loading_reset',
				'warehouse_loading_started',
				'warehouse_receiving_approved',
				'warehouse_receiving_rejected',
				'whatsapp_message_ingested',
				'website_draft_saved'
			)
			or (
				p_action in (
					'admin_record_created',
					'admin_record_updated',
					'admin_record_deactivated'
				)
				and p_entity_type in (
					'customer',
					'driver',
					'employee',
					'pricing_rule',
					'product',
					'supplier',
					'supplier_product_link',
					'truck'
				)
			)
			or (
				p_action in ('employee_role_assigned', 'employee_role_removed')
				and p_entity_type = 'employee'
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
	with service_context as (
		select
			coalesce(auth.role(), '') = 'service_role' as is_service_role,
			nullif(current_setting('app.actor_user_id', true), '') as actor_user_id
	)
	select
		(
			select is_service_role and actor_user_id is null
			from service_context
		)
		or exists (
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

create or replace function public.service_can_access_panel(
	p_actor_user_id uuid,
	p_actor_pool text,
	required_panel text,
	write_required boolean default false
)
returns boolean
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	return public.can_access_panel(required_panel, write_required);
end;
$$;

create or replace function public.service_create_support_ticket(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_subject text,
	p_message text,
	p_requester_email text,
	p_requester_name text default null,
	p_requester_phone text default null,
	p_client_key text default null,
	p_source text default null
)
returns public.support_tickets
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	return public.create_support_ticket(
		p_subject,
		p_message,
		p_requester_email,
		p_requester_name,
		p_requester_phone,
		p_client_key,
		p_source
	);
end;
$$;

create or replace function public.service_inventory_evaluate_order(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_order_id uuid
)
returns public.orders
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	return public.inventory_evaluate_order(p_order_id);
end;
$$;

create or replace function public.service_warehouse_start_loading(
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
	return public.warehouse_start_loading(p_order_id);
end;
$$;

drop function if exists public.service_warehouse_assign_loading_driver(
	uuid,
	text,
	uuid,
	uuid
);

create or replace function public.service_warehouse_assign_loading_driver(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_order_id uuid,
	p_driver_id uuid,
	p_truck_id uuid default null
)
returns public.loading_task_drivers
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	return public.warehouse_assign_loading_driver(
		p_order_id,
		p_driver_id,
		p_truck_id
	);
end;
$$;

revoke all on function public.service_can_access_panel(uuid, text, text, boolean)
	from public, anon, authenticated;
revoke all on function public.service_create_support_ticket(
	uuid,
	text,
	text,
	text,
	text,
	text,
	text,
	text,
	text
) from public, anon, authenticated;
revoke all on function public.service_inventory_evaluate_order(uuid, text, uuid)
	from public, anon, authenticated;
revoke all on function public.service_warehouse_start_loading(uuid, text, uuid)
	from public, anon, authenticated;
revoke all on function public.service_warehouse_assign_loading_driver(uuid, text, uuid, uuid, uuid)
	from public, anon, authenticated;

grant execute on function public.service_can_access_panel(uuid, text, text, boolean)
	to service_role;
grant execute on function public.service_create_support_ticket(
	uuid,
	text,
	text,
	text,
	text,
	text,
	text,
	text,
	text
) to service_role;
grant execute on function public.service_inventory_evaluate_order(uuid, text, uuid)
	to service_role;
grant execute on function public.service_warehouse_start_loading(uuid, text, uuid)
	to service_role;
grant execute on function public.service_warehouse_assign_loading_driver(uuid, text, uuid, uuid, uuid)
	to service_role;
