alter table public.quote_requests
	add column if not exists delivery_address_text text,
	add column if not exists delivery_latitude numeric,
	add column if not exists delivery_longitude numeric;

update public.quote_requests qr
set
	delivery_address_text = nullif(concat_ws(', ', nullif(trim(a.street), ''), nullif(trim(a.area), ''), nullif(trim(a.city), ''), nullif(trim(a.governorate), '')), ''),
	delivery_latitude = a.latitude,
	delivery_longitude = a.longitude
from public.customer_addresses a
where a.id = qr.delivery_address_id
	and qr.delivery_latitude is null
	and qr.delivery_longitude is null;

alter table public.quote_requests
	drop constraint if exists quote_requests_delivery_point_pair,
	add constraint quote_requests_delivery_point_pair check (
		(delivery_latitude is null and delivery_longitude is null)
		or (
			delivery_latitude between 21.7 and 31.8
			and delivery_longitude between 24.6 and 36.9
			and nullif(trim(delivery_address_text), '') is not null
		)
	);

comment on column public.quote_requests.delivery_address_text is
	'Read-only address derived from the map-selected delivery point at quote time.';
comment on column public.quote_requests.delivery_latitude is
	'Canonical latitude snapshot selected on the quote map.';
comment on column public.quote_requests.delivery_longitude is
	'Canonical longitude snapshot selected on the quote map.';

create or replace function app_private.require_quote_delivery_snapshot_on_submit()
returns trigger
language plpgsql
set search_path = public, app_private
as $$
declare
	v_address public.customer_addresses%rowtype;
	v_site_id uuid;
begin
	if old.status = 'draft' and new.status <> 'draft' then
		if new.delivery_latitude is null or new.delivery_longitude is null then
			if new.delivery_address_id is not null then
				select * into v_address
				from public.customer_addresses
				where id = new.delivery_address_id
					and customer_id = new.customer_id;
			end if;
			if v_address.latitude is null or v_address.longitude is null then
				raise exception 'map_selected_delivery_point_required' using errcode = '23514';
			end if;
			new.delivery_address_text := nullif(concat_ws(', ',
				nullif(trim(v_address.street), ''), nullif(trim(v_address.area), ''),
				nullif(trim(v_address.city), ''), nullif(trim(v_address.governorate), '')
			), '');
			new.delivery_latitude := v_address.latitude;
			new.delivery_longitude := v_address.longitude;
		end if;

		if new.delivery_address_id is not null then
			select id into v_site_id
			from public.customer_addresses
			where id = new.delivery_address_id
				and customer_id = new.customer_id
				and label = 'Sales quote site';
		end if;
		if v_site_id is null then
			perform set_config('app.quote_map_location_write', 'true', true);
			insert into public.customer_addresses (
				customer_id, label, street, area, city, governorate,
				latitude, longitude, is_default
			) values (
				new.customer_id, 'Sales quote site', new.delivery_address_text,
				null, '', '', new.delivery_latitude, new.delivery_longitude, false
			) returning id into v_site_id;
			perform set_config('app.quote_map_location_write', 'false', true);
			new.delivery_address_id := v_site_id;
		end if;
	end if;
	return new;
end;
$$;

drop trigger if exists quote_requests_require_delivery_snapshot_on_submit
	on public.quote_requests;
create trigger quote_requests_require_delivery_snapshot_on_submit
	before update of status on public.quote_requests
	for each row execute function app_private.require_quote_delivery_snapshot_on_submit();

create or replace function app_private.guard_sales_quote_site_location()
returns trigger
language plpgsql
set search_path = public, app_private
as $$
begin
	if coalesce(current_setting('app.quote_map_location_write', true), '') <> 'true'
		and (coalesce(new.label, '') = 'Sales quote site' or coalesce(old.label, '') = 'Sales quote site') then
		raise exception 'sales_quote_location_map_required' using errcode = '42501';
	end if;
	return coalesce(new, old);
end;
$$;

drop trigger if exists customer_addresses_guard_sales_quote_site_location
	on public.customer_addresses;
create trigger customer_addresses_guard_sales_quote_site_location
	before insert or update or delete on public.customer_addresses
	for each row execute function app_private.guard_sales_quote_site_location();

create or replace function public.sales_set_quote_delivery_location(
	p_quote_request_id uuid,
	p_address_text text,
	p_street text,
	p_area text,
	p_city text,
	p_governorate text,
	p_latitude numeric,
	p_longitude numeric
)
returns public.quote_requests
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
	v_request public.quote_requests%rowtype;
	v_address_id uuid;
begin
	perform public.require_panel('sales', true);
	if nullif(trim(p_address_text), '') is null
		or p_latitude not between 21.7 and 31.8
		or p_longitude not between 24.6 and 36.9 then
		raise exception 'invalid_delivery_point' using errcode = '22023';
	end if;

	select * into v_request
	from public.quote_requests
	where id = p_quote_request_id
	for update;
	if v_request.id is null or v_request.customer_id is null then
		raise exception 'quote_request_not_found' using errcode = '02000';
	end if;

	if v_request.delivery_address_id is not null then
		select id into v_address_id
		from public.customer_addresses
		where id = v_request.delivery_address_id
			and customer_id = v_request.customer_id
			and label = 'Sales quote site';
	end if;
	perform set_config('app.quote_map_location_write', 'true', true);

	if v_address_id is null then
		insert into public.customer_addresses (
			customer_id, label, street, area, city, governorate,
			latitude, longitude, is_default
		) values (
			v_request.customer_id, 'Sales quote site', trim(p_street),
			nullif(trim(p_area), ''), trim(p_city), trim(p_governorate),
			p_latitude, p_longitude, false
		) returning id into v_address_id;
	else
		update public.customer_addresses
		set street = trim(p_street), area = nullif(trim(p_area), ''),
			city = trim(p_city), governorate = trim(p_governorate),
			latitude = p_latitude, longitude = p_longitude
		where id = v_address_id;
	end if;

	update public.quote_requests
	set delivery_address_id = v_address_id,
		delivery_address_text = trim(p_address_text),
		delivery_latitude = p_latitude,
		delivery_longitude = p_longitude
	where id = p_quote_request_id
	returning * into v_request;
	perform set_config('app.quote_map_location_write', 'false', true);

	return v_request;
end;
$$;

create or replace function public.service_sales_set_quote_delivery_location(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_quote_request_id uuid,
	p_address_text text,
	p_street text,
	p_area text,
	p_city text,
	p_governorate text,
	p_latitude numeric,
	p_longitude numeric
)
returns public.quote_requests
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	return public.sales_set_quote_delivery_location(
		p_quote_request_id, p_address_text, p_street, p_area, p_city,
		p_governorate, p_latitude, p_longitude
	);
end;
$$;

revoke all on function public.sales_set_quote_delivery_location(uuid, text, text, text, text, text, numeric, numeric) from public, anon, authenticated;
revoke all on function public.service_sales_set_quote_delivery_location(uuid, text, uuid, text, text, text, text, text, numeric, numeric) from public, anon, authenticated;
grant execute on function public.service_sales_set_quote_delivery_location(uuid, text, uuid, text, text, text, text, text, numeric, numeric) to service_role;
