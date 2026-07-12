create or replace function app_private.clear_employee_auth_metadata(
	target_user_id uuid
)
returns void
language sql
security definer
set search_path = auth
as $$
	update auth.users
	set raw_app_meta_data =
		coalesce(raw_app_meta_data, '{}'::jsonb)
		- 'pool'
		- 'roles'
		- 'employee_id'
	where id = target_user_id;
$$;

create or replace function app_private.sync_employee_auth_metadata_for(
	target_employee_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, auth, app_private
as $$
declare
	target_user_id uuid;
	target_status public.profile_status;
	target_is_ceo boolean;
	target_roles jsonb;
begin
	select e.user_id, e.status, e.is_ceo
	into target_user_id, target_status, target_is_ceo
	from public.employees e
	where e.id = target_employee_id;

	if target_user_id is null then
		return;
	end if;

	if target_status <> 'active' then
		perform app_private.clear_employee_auth_metadata(target_user_id);
		return;
	end if;

	select coalesce(jsonb_agg(distinct er.role), '[]'::jsonb)
	into target_roles
	from public.employee_roles er
	where er.employee_id = target_employee_id;

	if target_is_ceo and not target_roles ? 'ceo' then
		target_roles := target_roles || jsonb_build_array('ceo');
	end if;

	update auth.users
	set raw_app_meta_data =
		coalesce(raw_app_meta_data, '{}'::jsonb)
		|| jsonb_build_object(
			'pool', 'internal',
			'roles', target_roles,
			'employee_id', target_employee_id
		)
	where id = target_user_id;
end;
$$;

create or replace function app_private.sync_employee_auth_metadata()
returns trigger
language plpgsql
security definer
set search_path = public, auth, app_private
as $$
begin
	if tg_op = 'DELETE' then
		perform app_private.clear_employee_auth_metadata(old.user_id);
		return old;
	end if;

	if tg_op = 'UPDATE' and old.user_id is distinct from new.user_id then
		perform app_private.clear_employee_auth_metadata(old.user_id);
	end if;

	perform app_private.sync_employee_auth_metadata_for(new.id);
	return new;
end;
$$;

drop trigger if exists employees_sync_auth_metadata on public.employees;
create trigger employees_sync_auth_metadata
	after insert or delete or update of user_id, status, is_ceo
	on public.employees
	for each row execute function app_private.sync_employee_auth_metadata();

revoke all on function app_private.clear_employee_auth_metadata(uuid)
	from public, anon, authenticated;
revoke all on function app_private.sync_employee_auth_metadata_for(uuid)
	from public, anon, authenticated;
revoke all on function app_private.sync_employee_auth_metadata()
	from public, anon, authenticated;

select app_private.sync_employee_auth_metadata_for(id)
from public.employees;
