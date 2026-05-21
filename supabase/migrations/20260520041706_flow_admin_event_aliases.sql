alter type public.audit_event_type add value if not exists 'admin_role_assigned';
alter type public.audit_event_type add value if not exists 'admin_role_removed';
alter type public.audit_event_type add value if not exists 'admin_database_exported';

create or replace function public.admin_record_audit(
	p_entity_type text,
	p_entity_id uuid,
	p_action public.audit_event_type,
	p_reason text,
	p_details jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
	employee_id uuid;
begin
	employee_id := public.require_panel('admin', true);
	if p_entity_type is null or length(trim(p_entity_type)) = 0 then
		raise exception 'admin_entity_type_required' using errcode = '23514';
	end if;
	if p_entity_id is null then
		raise exception 'admin_entity_id_required' using errcode = '23514';
	end if;
	if p_reason is null or length(trim(p_reason)) < 8 then
		raise exception 'admin_reason_required' using errcode = '23514';
	end if;
	if p_action not in (
		'admin_record_created',
		'admin_record_updated',
		'admin_record_deactivated',
		'admin_export_created',
		'admin_database_exported',
		'employee_role_assigned',
		'employee_role_removed',
		'internal_employee_created',
		'internal_employee_role_assigned',
		'internal_employee_role_removed',
		'admin_role_assigned',
		'admin_role_removed'
	) then
		raise exception 'invalid_admin_audit_action' using errcode = '23514';
	end if;

	perform public.log_activity(
		p_entity_type,
		p_entity_id,
		p_action,
		jsonb_build_object(
			'employee_id', employee_id,
			'reason', trim(p_reason)
		) || coalesce(p_details, '{}'::jsonb)
	);
end;
$$;

create or replace function public.admin_assign_employee_role(
	p_employee_id uuid,
	p_role public.employee_role,
	p_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
	actor_employee_id uuid;
begin
	actor_employee_id := public.require_panel('admin', true);
	if p_employee_id is null then
		raise exception 'employee_id_required' using errcode = '23514';
	end if;
	if p_reason is null or length(trim(p_reason)) < 8 then
		raise exception 'admin_role_reason_required' using errcode = '23514';
	end if;

	insert into public.employee_roles (employee_id, role)
	values (p_employee_id, p_role)
	on conflict (employee_id, role) do nothing;

	perform public.log_activity(
		'employee',
		p_employee_id,
		'internal_employee_role_assigned',
		jsonb_build_object(
			'employee_id', actor_employee_id,
			'role', p_role,
			'reason', trim(p_reason)
		)
	);
	perform public.log_activity(
		'employee',
		p_employee_id,
		'admin_role_assigned',
		jsonb_build_object(
			'employee_id', actor_employee_id,
			'role', p_role,
			'reason', trim(p_reason)
		)
	);
end;
$$;

create or replace function public.admin_remove_employee_role(
	p_employee_id uuid,
	p_role public.employee_role,
	p_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
	actor_employee_id uuid;
begin
	actor_employee_id := public.require_panel('admin', true);
	if p_employee_id is null then
		raise exception 'employee_id_required' using errcode = '23514';
	end if;
	if p_reason is null or length(trim(p_reason)) < 8 then
		raise exception 'admin_role_reason_required' using errcode = '23514';
	end if;

	delete from public.employee_roles
	where employee_id = p_employee_id
	  and role = p_role;

	perform public.log_activity(
		'employee',
		p_employee_id,
		'internal_employee_role_removed',
		jsonb_build_object(
			'employee_id', actor_employee_id,
			'role', p_role,
			'reason', trim(p_reason)
		)
	);
	perform public.log_activity(
		'employee',
		p_employee_id,
		'admin_role_removed',
		jsonb_build_object(
			'employee_id', actor_employee_id,
			'role', p_role,
			'reason', trim(p_reason)
		)
	);
end;
$$;

create or replace function public.admin_export_data(
	p_scope text,
	p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
	employee_id uuid;
	export_id uuid := gen_random_uuid();
	payload jsonb;
	event_details jsonb;
begin
	employee_id := public.require_panel('admin', true);
	if p_reason is null or length(trim(p_reason)) < 8 then
		raise exception 'admin_export_reason_required' using errcode = '23514';
	end if;
	if p_scope not in (
		'products',
		'categories',
		'customers',
		'drivers',
		'suppliers',
		'employees',
		'pricing_rules',
		'trucks'
	) then
		raise exception 'unsupported_admin_export_scope' using errcode = '23514';
	end if;

	if p_scope = 'products' then
		select jsonb_agg(to_jsonb(p) - 'search_vector') into payload
		from public.products p;
	elsif p_scope = 'categories' then
		select jsonb_agg(to_jsonb(c)) into payload
		from public.categories c;
	elsif p_scope = 'customers' then
		select jsonb_agg(
			jsonb_build_object(
				'id', c.id,
				'company_name', c.company_name,
				'contact_name', c.contact_name,
				'phone_present', c.phone is not null,
				'email_domain', case when c.email is null then null else split_part(c.email, '@', 2) end,
				'status', c.status,
				'trade_license_status', c.trade_license_status,
				'tier', c.tier,
				'credit_limit', c.credit_limit,
				'payment_history', c.payment_history,
				'assigned_sales_rep_id', c.assigned_sales_rep_id,
				'created_at', c.created_at,
				'updated_at', c.updated_at
			)
		) into payload
		from public.customers c;
	elsif p_scope = 'drivers' then
		select jsonb_agg(
			jsonb_build_object(
				'id', d.id,
				'full_name', d.full_name,
				'email_domain', case when d.email is null then null else split_part(d.email, '@', 2) end,
				'phone_present', d.phone is not null,
				'status', d.status,
				'vehicle_label', d.vehicle_label,
				'created_at', d.created_at,
				'updated_at', d.updated_at
			)
		) into payload
		from public.drivers d;
	elsif p_scope = 'trucks' then
		select jsonb_agg(to_jsonb(t)) into payload
		from public.trucks t;
	elsif p_scope = 'suppliers' then
		select jsonb_agg(to_jsonb(s)) into payload
		from public.suppliers s;
	elsif p_scope = 'pricing_rules' then
		select jsonb_agg(to_jsonb(pr)) into payload
		from public.pricing_rules pr;
	elsif p_scope = 'employees' then
		select jsonb_agg(
			jsonb_build_object(
				'id', e.id,
				'full_name', e.full_name,
				'email_domain', split_part(e.email, '@', 2),
				'phone_present', e.phone is not null,
				'status', e.status,
				'is_ceo', e.is_ceo,
				'roles', coalesce(roles.roles, '[]'::jsonb),
				'created_at', e.created_at,
				'updated_at', e.updated_at
			)
		) into payload
		from public.employees e
		left join lateral (
			select jsonb_agg(er.role order by er.role) as roles
			from public.employee_roles er
			where er.employee_id = e.id
		) roles on true;
	end if;

	event_details := jsonb_build_object(
		'employee_id', employee_id,
		'scope', p_scope,
		'reason', trim(p_reason),
		'row_count', coalesce(jsonb_array_length(coalesce(payload, '[]'::jsonb)), 0)
	);

	perform public.log_activity(
		'admin_export',
		export_id,
		'admin_export_created',
		event_details
	);
	perform public.log_activity(
		'admin_export',
		export_id,
		'admin_database_exported',
		event_details
	);

	return jsonb_build_object(
		'export_id', export_id,
		'scope', p_scope,
		'generated_at', now(),
		'rows', coalesce(payload, '[]'::jsonb)
	);
end;
$$;
