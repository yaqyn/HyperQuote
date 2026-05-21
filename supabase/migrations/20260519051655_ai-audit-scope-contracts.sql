create or replace function app_private.assert_ai_read_scope(
	p_agent_scope public.ai_agent_scope,
	p_read_entities text[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
	read_entity text;
	entity text;
begin
	foreach read_entity in array coalesce(p_read_entities, '{}')
	loop
		entity := lower(btrim(read_entity));
		if entity = '' then
			continue;
		end if;

		if p_agent_scope = 'website' and entity not in ('website_index', 'public_docs', 'published_catalog') then
			raise exception 'website_ai_read_scope_denied' using errcode = '42501';
		end if;

		if p_agent_scope = 'portal' and entity not in (
			'published_products',
			'customer_docs',
			'customer_orders',
			'customer_drafts',
			'customer_profile',
			'active_draft'
		) then
			raise exception 'portal_ai_read_scope_denied' using errcode = '42501';
		end if;

		if p_agent_scope = 'employee' then
			if entity like 'ceo_%'
				or entity like 'search_%'
				or entity in ('salary', 'salaries', 'employee_salary', 'raw_export', 'secrets', 'tokens')
			then
				raise exception 'employee_ai_read_scope_denied' using errcode = '42501';
			end if;
			if entity in ('finance', 'customer_payments', 'supplier_payments', 'private_finance') and not public.can_access_panel('finance') then
				raise exception 'employee_ai_finance_scope_denied' using errcode = '42501';
			end if;
			if entity in ('inventory', 'inventory_stock', 'supplier_costs') and not public.can_access_panel('inventory') then
				raise exception 'employee_ai_inventory_scope_denied' using errcode = '42501';
			end if;
			if entity in ('warehouse', 'loading_tasks', 'receiving_tasks') and not public.can_access_panel('warehouse') then
				raise exception 'employee_ai_warehouse_scope_denied' using errcode = '42501';
			end if;
			if entity in ('dispatch', 'deliveries', 'driver_locations') and not public.can_access_panel('dispatch') then
				raise exception 'employee_ai_dispatch_scope_denied' using errcode = '42501';
			end if;
			if entity in ('admin', 'employees', 'roles', 'exports') and not public.can_access_panel('admin') then
				raise exception 'employee_ai_admin_scope_denied' using errcode = '42501';
			end if;
		end if;

		if p_agent_scope = 'search' and entity not like 'ceo_%' and entity <> 'ceo_search_index' then
			raise exception 'search_ai_read_scope_denied' using errcode = '42501';
		end if;
	end loop;
end;
$$;

revoke all on function app_private.assert_ai_read_scope(public.ai_agent_scope, text[]) from public;

create or replace function public.record_ai_tool_call(
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
set search_path = public
as $$
declare
	v_employee_id uuid;
	audit_row public.ai_tool_call_audit%rowtype;
begin
	if p_tool_name is null or length(trim(p_tool_name)) = 0 then
		raise exception 'ai_tool_name_required' using errcode = '23514';
	end if;

	if p_agent_scope = 'website' and p_write_entity_type is not null then
		raise exception 'website_ai_is_read_only' using errcode = '42501';
	end if;

	if p_agent_scope = 'portal' and public.current_customer_id() is null then
		raise exception 'customer_required_for_portal_ai' using errcode = '42501';
	end if;

	if p_agent_scope in ('employee', 'search') then
		v_employee_id := public.current_employee_id();
		if v_employee_id is null then
			raise exception 'employee_required_for_ai' using errcode = '42501';
		end if;
	end if;

	if p_agent_scope = 'search' and not public.can_access_ceo_search() then
		raise exception 'ceo_required_for_search_ai' using errcode = '42501';
	end if;

	perform app_private.assert_ai_read_scope(p_agent_scope, coalesce(p_read_entities, '{}'));

	if p_agent_scope = 'search' and p_write_entity_type is not null then
		raise exception 'search_ai_is_read_only' using errcode = '42501';
	end if;

	if p_write_entity_type is not null and not coalesce(p_approved_by_user, false) then
		raise exception 'ai_write_requires_user_approval' using errcode = '42501';
	end if;

	insert into public.ai_tool_call_audit (
		actor_user_id,
		actor_employee_id,
		agent_scope,
		tool_name,
		read_entities,
		write_entity_type,
		write_entity_id,
		approved_by_user,
		input_summary,
		output_summary
	)
	values (
		auth.uid(),
		v_employee_id,
		p_agent_scope,
		p_tool_name,
		coalesce(p_read_entities, '{}'),
		p_write_entity_type,
		p_write_entity_id,
		coalesce(p_approved_by_user, false),
		coalesce(p_input_summary, '{}'::jsonb),
		coalesce(p_output_summary, '{}'::jsonb)
	)
	returning * into audit_row;

	return audit_row;
end;
$$;
