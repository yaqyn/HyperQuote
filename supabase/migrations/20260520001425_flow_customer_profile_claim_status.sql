create or replace function public.claim_customer_profile(p_phone text)
returns public.customers
language plpgsql
security definer
set search_path = public, auth
as $$
declare
	actor_user_id uuid := auth.uid();
	actor_phone_digits text;
	claim_phone_digits text := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');
	target_customer public.customers%rowtype;
	claimed_customer public.customers%rowtype;
begin
	if actor_user_id is null then
		raise exception 'not_authenticated' using errcode = '28000';
	end if;

	select regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g')
	into actor_phone_digits
	from auth.users
	where id = actor_user_id;

	if claim_phone_digits = '' or actor_phone_digits <> claim_phone_digits then
		raise exception 'phone_mismatch' using errcode = '42501';
	end if;

	select *
	into target_customer
	from public.customers
	where regexp_replace(phone, '[^0-9]', '', 'g') = claim_phone_digits
	  and user_id is null
	  and status = 'unclaimed'
	for update;

	if target_customer.id is null then
		raise exception 'claimable_customer_not_found' using errcode = 'P0002';
	end if;

	update public.customers
	set
		user_id = actor_user_id,
		status = 'claimed',
		updated_at = now()
	where id = target_customer.id
	returning * into claimed_customer;

	perform public.log_activity(
		'customer',
		claimed_customer.id,
		'customer_profile_claimed',
		jsonb_build_object(
			'phone', claimed_customer.phone,
			'user_id', actor_user_id,
			'from_status', target_customer.status,
			'to_status', claimed_customer.status
		)
	);

	return claimed_customer;
end;
$$;

create or replace function public.find_claimable_customer_profile(p_phone text)
returns table(id uuid, company_name text, user_id uuid)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
	actor_user_id uuid := auth.uid();
	actor_phone_digits text;
	claim_phone_digits text := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');
begin
	if actor_user_id is null then
		raise exception 'not_authenticated' using errcode = '28000';
	end if;

	select regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g')
	into actor_phone_digits
	from auth.users
	where auth.users.id = actor_user_id;

	if claim_phone_digits = '' or actor_phone_digits <> claim_phone_digits then
		raise exception 'phone_mismatch' using errcode = '42501';
	end if;

	return query
	select c.id, c.company_name, c.user_id
	from public.customers c
	where regexp_replace(c.phone, '[^0-9]', '', 'g') = claim_phone_digits
	  and c.user_id is null
	  and c.status = 'unclaimed'
	limit 1;
end;
$$;
