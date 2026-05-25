create or replace function public.service_customer_auth_has_password(
	p_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
	v_has_password boolean := false;
begin
	if coalesce(auth.role(), '') <> 'service_role' then
		raise exception 'service role required';
	end if;

	if p_user_id is null then
		return false;
	end if;

	select encrypted_password is not null
		and encrypted_password <> ''
		and (
			coalesce(email, '') <> ''
			or coalesce(email_change, '') <> ''
		)
	into v_has_password
	from auth.users
	where id = p_user_id;

	return coalesce(v_has_password, false);
end;
$$;

revoke all on function public.service_customer_auth_has_password(uuid)
	from public;
revoke all on function public.service_customer_auth_has_password(uuid)
	from anon;
revoke all on function public.service_customer_auth_has_password(uuid)
	from authenticated;
grant execute on function public.service_customer_auth_has_password(uuid)
	to service_role;

create or replace function public.service_customer_auth_verify_password(
	p_user_id uuid,
	p_password text
)
returns boolean
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
	v_password_hash text;
begin
	if coalesce(auth.role(), '') <> 'service_role' then
		raise exception 'service role required';
	end if;

	if p_user_id is null or coalesce(p_password, '') = '' then
		return false;
	end if;

	select encrypted_password
	into v_password_hash
	from auth.users
	where id = p_user_id
	  and (
	    coalesce(email, '') <> ''
	    or coalesce(email_change, '') <> ''
	  );

	if coalesce(v_password_hash, '') = '' then
		return false;
	end if;

	return v_password_hash = extensions.crypt(p_password, v_password_hash);
end;
$$;

revoke all on function public.service_customer_auth_verify_password(uuid, text)
	from public;
revoke all on function public.service_customer_auth_verify_password(uuid, text)
	from anon;
revoke all on function public.service_customer_auth_verify_password(uuid, text)
	from authenticated;
grant execute on function public.service_customer_auth_verify_password(uuid, text)
	to service_role;
