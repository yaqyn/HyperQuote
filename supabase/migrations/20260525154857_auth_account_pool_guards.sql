create schema if not exists app_private;

create or replace function app_private.normalized_login_email(p_email text)
returns text
language sql
immutable
set search_path = public
as $$
	select lower(nullif(btrim(p_email), ''))
$$;

revoke all on function app_private.normalized_login_email(text) from public;
revoke all on function app_private.normalized_login_email(text) from anon, authenticated;

create or replace function app_private.prevent_cross_account_email_reuse()
returns trigger
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
	clean_email text;
begin
	clean_email := app_private.normalized_login_email(new.email);
	if clean_email is null then
		return new;
	end if;

	if exists (
		select 1
		from public.customers c
		where app_private.normalized_login_email(c.email) = clean_email
		  and (tg_table_name <> 'customers' or c.id <> new.id)
	) then
		raise exception using
			errcode = '23505',
			message = 'Email is already used by another customer, employee, or driver login account';
	end if;

	if exists (
		select 1
		from public.employees e
		where app_private.normalized_login_email(e.email) = clean_email
		  and (tg_table_name <> 'employees' or e.id <> new.id)
	) then
		raise exception using
			errcode = '23505',
			message = 'Email is already used by another customer, employee, or driver login account';
	end if;

	if exists (
		select 1
		from public.drivers d
		where app_private.normalized_login_email(d.email) = clean_email
		  and (tg_table_name <> 'drivers' or d.id <> new.id)
	) then
		raise exception using
			errcode = '23505',
			message = 'Email is already used by another customer, employee, or driver login account';
	end if;

	return new;
end;
$$;

revoke all on function app_private.prevent_cross_account_email_reuse() from public;
revoke all on function app_private.prevent_cross_account_email_reuse() from anon, authenticated;

create or replace function app_private.prevent_cross_account_auth_user_reuse()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
	if new.user_id is null then
		return new;
	end if;

	if exists (
		select 1
		from public.customers c
		where c.user_id = new.user_id
		  and (tg_table_name <> 'customers' or c.id <> new.id)
	) then
		raise exception using
			errcode = '23505',
			message = 'Auth user is already linked to another customer, employee, or driver account';
	end if;

	if exists (
		select 1
		from public.employees e
		where e.user_id = new.user_id
		  and (tg_table_name <> 'employees' or e.id <> new.id)
	) then
		raise exception using
			errcode = '23505',
			message = 'Auth user is already linked to another customer, employee, or driver account';
	end if;

	if exists (
		select 1
		from public.drivers d
		where d.user_id = new.user_id
		  and (tg_table_name <> 'drivers' or d.id <> new.id)
	) then
		raise exception using
			errcode = '23505',
			message = 'Auth user is already linked to another customer, employee, or driver account';
	end if;

	return new;
end;
$$;

revoke all on function app_private.prevent_cross_account_auth_user_reuse() from public;
revoke all on function app_private.prevent_cross_account_auth_user_reuse() from anon, authenticated;

drop trigger if exists customers_prevent_cross_account_email_reuse on public.customers;
create trigger customers_prevent_cross_account_email_reuse
before insert or update of email on public.customers
for each row
execute function app_private.prevent_cross_account_email_reuse();

drop trigger if exists employees_prevent_cross_account_email_reuse on public.employees;
create trigger employees_prevent_cross_account_email_reuse
before insert or update of email on public.employees
for each row
execute function app_private.prevent_cross_account_email_reuse();

drop trigger if exists drivers_prevent_cross_account_email_reuse on public.drivers;
create trigger drivers_prevent_cross_account_email_reuse
before insert or update of email on public.drivers
for each row
execute function app_private.prevent_cross_account_email_reuse();

drop trigger if exists customers_prevent_cross_account_auth_user_reuse on public.customers;
create trigger customers_prevent_cross_account_auth_user_reuse
before insert or update of user_id on public.customers
for each row
execute function app_private.prevent_cross_account_auth_user_reuse();

drop trigger if exists employees_prevent_cross_account_auth_user_reuse on public.employees;
create trigger employees_prevent_cross_account_auth_user_reuse
before insert or update of user_id on public.employees
for each row
execute function app_private.prevent_cross_account_auth_user_reuse();

drop trigger if exists drivers_prevent_cross_account_auth_user_reuse on public.drivers;
create trigger drivers_prevent_cross_account_auth_user_reuse
before insert or update of user_id on public.drivers
for each row
execute function app_private.prevent_cross_account_auth_user_reuse();
