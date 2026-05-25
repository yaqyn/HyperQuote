create or replace function public.service_clear_customer_pending_email_change(
	p_user_id uuid,
	p_expected_pending_email text
)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
	v_expected text := lower(trim(coalesce(p_expected_pending_email, '')));
begin
	if coalesce(auth.role(), '') <> 'service_role' then
		raise exception 'service role required';
	end if;

	if p_user_id is null or v_expected = '' then
		return false;
	end if;

	update auth.users
	set
		email_change = '',
		email_change_token_current = '',
		email_change_token_new = '',
		email_change_sent_at = null,
		email_change_confirm_status = 0,
		updated_at = now()
	where id = p_user_id
	  and lower(coalesce(email_change, '')) = v_expected
	  and email_confirmed_at is null;

	return found;
end;
$$;

revoke all on function public.service_clear_customer_pending_email_change(uuid, text)
	from public;
revoke all on function public.service_clear_customer_pending_email_change(uuid, text)
	from anon;
revoke all on function public.service_clear_customer_pending_email_change(uuid, text)
	from authenticated;
grant execute on function public.service_clear_customer_pending_email_change(uuid, text)
	to service_role;
