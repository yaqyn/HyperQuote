alter type public.audit_event_type add value if not exists 'admin_record_created';
alter type public.audit_event_type add value if not exists 'admin_record_updated';
alter type public.audit_event_type add value if not exists 'admin_record_deactivated';
alter type public.audit_event_type add value if not exists 'admin_export_created';
alter type public.audit_event_type add value if not exists 'employee_role_assigned';
alter type public.audit_event_type add value if not exists 'employee_role_removed';

alter table public.suppliers
	add column if not exists tier text not null default 'new',
	add column if not exists payment_terms text not null default '',
	add column if not exists rating numeric not null default 3,
	add column if not exists custom_badges text[] not null default '{}';

do $$
begin
	alter table public.suppliers
		add constraint suppliers_tier_check
		check (tier in ('preferred', 'approved', 'conditional', 'new'));
exception
	when duplicate_object then null;
end $$;

do $$
begin
	alter table public.suppliers
		add constraint suppliers_rating_check
		check (rating >= 0 and rating <= 5);
exception
	when duplicate_object then null;
end $$;

do $$
begin
	alter table public.suppliers
		add constraint suppliers_name_key unique (name);
exception
	when duplicate_object then null;
end $$;

drop policy if exists admin_categories_access on public.categories;
create policy admin_categories_access
	on public.categories for all
	to authenticated
	using (public.can_access_panel('admin'))
	with check (public.can_access_panel('admin', true));

drop policy if exists admin_employee_roles_read on public.employee_roles;
create policy admin_employee_roles_read
	on public.employee_roles for select
	to authenticated
	using (public.can_access_panel('admin') or public.is_employee_with_role('ceo'));

drop policy if exists admin_employee_permissions_read on public.employee_panel_permissions;
create policy admin_employee_permissions_read
	on public.employee_panel_permissions for select
	to authenticated
	using (public.can_access_panel('admin') or public.is_employee_with_role('ceo'));

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
		'employee_role_assigned',
		'employee_role_removed'
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
begin
	employee_id := public.require_panel('admin', true);
	if p_reason is null or length(trim(p_reason)) < 8 then
		raise exception 'admin_export_reason_required' using errcode = '23514';
	end if;
	if p_scope not in ('products', 'categories', 'suppliers', 'employees') then
		raise exception 'unsupported_admin_export_scope' using errcode = '23514';
	end if;

	if p_scope = 'products' then
		select jsonb_agg(to_jsonb(p) - 'search_vector') into payload
		from public.products p;
	elsif p_scope = 'categories' then
		select jsonb_agg(to_jsonb(c)) into payload
		from public.categories c;
	elsif p_scope = 'suppliers' then
		select jsonb_agg(to_jsonb(s)) into payload
		from public.suppliers s;
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

	perform public.log_activity(
		'admin_export',
		export_id,
		'admin_export_created',
		jsonb_build_object(
			'employee_id', employee_id,
			'scope', p_scope,
			'reason', trim(p_reason),
			'row_count', coalesce(jsonb_array_length(coalesce(payload, '[]'::jsonb)), 0)
		)
	);

	return jsonb_build_object(
		'export_id', export_id,
		'scope', p_scope,
		'generated_at', now(),
		'rows', coalesce(payload, '[]'::jsonb)
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
		'employee_role_assigned',
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
		'employee_role_removed',
		jsonb_build_object(
			'employee_id', actor_employee_id,
			'role', p_role,
			'reason', trim(p_reason)
		)
	);
end;
$$;

grant execute on function public.admin_record_audit(text, uuid, public.audit_event_type, text, jsonb) to authenticated;
grant execute on function public.admin_export_data(text, text) to authenticated;
grant execute on function public.admin_assign_employee_role(uuid, public.employee_role, text) to authenticated;
grant execute on function public.admin_remove_employee_role(uuid, public.employee_role, text) to authenticated;
