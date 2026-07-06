alter table public.quote_request_locations
	add column if not exists location_label text;

alter table public.order_delivery_locations
	add column if not exists location_label text;

alter table public.customer_quote_carts
	add column if not exists locations jsonb not null default '[]'::jsonb,
	add column if not exists associates jsonb not null default '[]'::jsonb;

alter table public.quote_request_locations
	drop constraint if exists quote_request_locations_location_label_check,
	add constraint quote_request_locations_location_label_check
		check (location_label is null or length(btrim(location_label)) between 1 and 240);

alter table public.order_delivery_locations
	drop constraint if exists order_delivery_locations_location_label_check,
	add constraint order_delivery_locations_location_label_check
		check (location_label is null or length(btrim(location_label)) between 1 and 240);

update public.order_delivery_locations odl
set location_label = qrl.location_label
from public.quote_request_locations qrl
where qrl.id = odl.quote_request_location_id
	and odl.location_label is distinct from qrl.location_label;

create or replace function app_private.ensure_order_delivery_locations(p_order_id uuid)
returns integer
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
	target_order public.orders%rowtype;
	location_count integer := 0;
begin
	select * into target_order
	from public.orders
	where id = p_order_id;

	if target_order.id is null then
		raise exception 'order_not_found' using errcode = '02000';
	end if;

	if target_order.quote_request_id is null then
		return 0;
	end if;

	perform app_private.ensure_quote_request_default_location(target_order.quote_request_id);

	insert into public.order_delivery_locations (
		order_id,
		quote_request_location_id,
		address_id,
		location_label,
		sort_order,
		delivery_date,
		delivery_hour,
		delivery_period
	)
	select
		target_order.id,
		qrl.id,
		qrl.address_id,
		qrl.location_label,
		qrl.sort_order,
		qrl.delivery_date,
		qrl.delivery_hour,
		qrl.delivery_period
	from public.quote_request_locations qrl
	where qrl.quote_request_id = target_order.quote_request_id
	on conflict (order_id, quote_request_location_id) do update
	set address_id = excluded.address_id,
		location_label = excluded.location_label,
		sort_order = excluded.sort_order,
		delivery_date = excluded.delivery_date,
		delivery_hour = excluded.delivery_hour,
		delivery_period = excluded.delivery_period,
		updated_at = now();

	get diagnostics location_count = row_count;
	return location_count;
end;
$$;
