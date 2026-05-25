create or replace function app_private.sync_confirmed_customer_email()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
	if new.email_confirmed_at is null or nullif(btrim(new.email), '') is null then
		return new;
	end if;

	update public.customers
	set email = new.email
	where user_id = new.id
	  and email is distinct from new.email;

	return new;
end;
$$;

drop trigger if exists auth_users_sync_confirmed_customer_email on auth.users;
create trigger auth_users_sync_confirmed_customer_email
after insert or update of email, email_confirmed_at on auth.users
for each row
execute function app_private.sync_confirmed_customer_email();

update public.customers c
set email = u.email
from auth.users u
where c.user_id = u.id
  and u.email_confirmed_at is not null
  and nullif(btrim(u.email), '') is not null
  and c.email is distinct from u.email;
