update auth.users
set
	phone = null,
	phone_confirmed_at = null,
	phone_change = '',
	phone_change_token = '',
	phone_change_sent_at = null,
	updated_at = now()
where nullif(btrim(coalesce(phone, '')), '') is not null
  and raw_app_meta_data ->> 'pool' in ('internal', 'driver');

create or replace function app_private.prevent_non_customer_auth_phone()
returns trigger
language plpgsql
security definer
set search_path = auth, public, app_private
as $$
declare
	auth_pool text;
	has_phone_identity boolean;
begin
	auth_pool := new.raw_app_meta_data ->> 'pool';
	has_phone_identity :=
		nullif(btrim(coalesce(new.phone, '')), '') is not null
		or nullif(btrim(coalesce(new.phone_change, '')), '') is not null;

	if has_phone_identity and auth_pool in ('internal', 'driver') then
		raise exception using
			errcode = '23514',
			message = 'Only customer Auth users may use phone login';
	end if;

	return new;
end;
$$;

revoke all on function app_private.prevent_non_customer_auth_phone() from public;
revoke all on function app_private.prevent_non_customer_auth_phone() from anon, authenticated;

drop trigger if exists auth_users_prevent_non_customer_auth_phone on auth.users;
create trigger auth_users_prevent_non_customer_auth_phone
before insert or update of phone, phone_change, raw_app_meta_data on auth.users
for each row
execute function app_private.prevent_non_customer_auth_phone();

create or replace function app_private.prevent_cross_account_auth_user_reuse()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
	linked_auth_phone text;
	linked_auth_pool text;
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

	select
		u.raw_app_meta_data ->> 'pool',
		nullif(btrim(coalesce(u.phone, '')), '')
	into linked_auth_pool, linked_auth_phone
	from auth.users u
	where u.id = new.user_id;

	if tg_table_name = 'employees' then
		if linked_auth_pool is distinct from 'internal' then
			raise exception using
				errcode = '23514',
				message = 'Employee login accounts must use the internal Auth pool';
		end if;
		if linked_auth_phone is not null then
			raise exception using
				errcode = '23514',
				message = 'Employee login accounts must not use phone Auth';
		end if;
	end if;

	if tg_table_name = 'drivers' then
		if linked_auth_pool is distinct from 'driver' then
			raise exception using
				errcode = '23514',
				message = 'Driver login accounts must use the driver Auth pool';
		end if;
		if linked_auth_phone is not null then
			raise exception using
				errcode = '23514',
				message = 'Driver login accounts must not use phone Auth';
		end if;
	end if;

	if tg_table_name = 'customers' and linked_auth_pool in ('internal', 'driver') then
		raise exception using
			errcode = '23514',
			message = 'Customer login accounts must not use internal or driver Auth pools';
	end if;

	return new;
end;
$$;

revoke all on function app_private.prevent_cross_account_auth_user_reuse() from public;
revoke all on function app_private.prevent_cross_account_auth_user_reuse() from anon, authenticated;
