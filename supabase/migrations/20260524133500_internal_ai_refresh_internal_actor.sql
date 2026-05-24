create or replace function public.service_refresh_ceo_search_documents_if_dirty(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_force boolean default false
)
returns integer
language plpgsql
security definer
set search_path = public, app_private, extensions
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	if p_actor_pool <> 'internal' or public.current_employee_id() is null then
		raise exception 'internal_employee_required_for_search_refresh' using errcode = '42501';
	end if;

	return app_private.refresh_ceo_search_documents_if_dirty(coalesce(p_force, false));
end;
$$;

revoke all privileges on function public.service_refresh_ceo_search_documents_if_dirty(uuid, text, boolean)
	from anon, authenticated, public;
grant execute on function public.service_refresh_ceo_search_documents_if_dirty(uuid, text, boolean)
	to service_role;
