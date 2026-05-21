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
		'employee_role_removed',
		'internal_employee_created',
		'internal_employee_role_assigned',
		'internal_employee_role_removed'
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
end;
$$;
