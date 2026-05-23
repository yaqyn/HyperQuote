create or replace function app_private.apply_default_quote_delivery_address()
returns trigger
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	if new.delivery_address_id is null and new.status <> 'draft' then
		select id into new.delivery_address_id
		from public.customer_addresses
		where customer_id = new.customer_id
		order by is_default desc, updated_at desc, created_at desc
		limit 1;
	end if;

	return new;
end;
$$;

drop trigger if exists quote_requests_apply_default_delivery_address
	on public.quote_requests;

create trigger quote_requests_apply_default_delivery_address
	before insert or update of status, delivery_address_id, customer_id
	on public.quote_requests
	for each row
	execute function app_private.apply_default_quote_delivery_address();

with default_addresses as (
	select distinct on (customer_id)
		customer_id,
		id
	from public.customer_addresses
	order by customer_id, is_default desc, updated_at desc, created_at desc
)
update public.quote_requests qr
set delivery_address_id = default_addresses.id
from default_addresses
where qr.customer_id = default_addresses.customer_id
  and qr.delivery_address_id is null
  and qr.status <> 'draft';

create or replace function public.customer_order_delivery_tracking(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
	v_customer_id uuid;
	target_order public.orders%rowtype;
	target_delivery public.deliveries%rowtype;
	request_row public.quote_requests%rowtype;
	address_row public.customer_addresses%rowtype;
	driver_row public.drivers%rowtype;
	truck_row public.trucks%rowtype;
	location_row public.driver_locations%rowtype;
	address_text text;
	destination_point jsonb;
	driver_point jsonb;
	stage text;
begin
	v_customer_id := public.current_customer_id();
	if v_customer_id is null then
		raise exception 'customer_required' using errcode = '42501';
	end if;

	select * into target_order
	from public.orders
	where id = p_order_id
	  and customer_id = v_customer_id;

	if target_order.id is null then
		raise exception 'order_not_found' using errcode = '02000';
	end if;

	select * into target_delivery
	from public.deliveries
	where order_id = target_order.id
	  and status in ('assigned', 'accepted', 'in_transit', 'arrived', 'completed')
	order by
		case status
			when 'arrived' then 1
			when 'in_transit' then 2
			when 'accepted' then 3
			when 'assigned' then 4
			else 5
		end,
		updated_at desc
	limit 1;

	if target_delivery.id is null then
		return null;
	end if;

	select * into request_row
	from public.quote_requests
	where id = target_order.quote_request_id;

	if request_row.delivery_address_id is not null then
		select * into address_row
		from public.customer_addresses
		where id = request_row.delivery_address_id
		  and customer_id = v_customer_id;
	end if;

	if address_row.id is null then
		select * into address_row
		from public.customer_addresses
		where customer_id = v_customer_id
		order by is_default desc, updated_at desc, created_at desc
		limit 1;
	end if;

	if target_delivery.driver_id is not null then
		select * into driver_row
		from public.drivers
		where id = target_delivery.driver_id;

		select * into location_row
		from public.driver_locations
		where driver_id = target_delivery.driver_id
		  and (delivery_id = target_delivery.id or delivery_id is null)
		order by
			case when delivery_id = target_delivery.id then 0 else 1 end,
			recorded_at desc
		limit 1;
	end if;

	if target_delivery.truck_id is not null then
		select * into truck_row
		from public.trucks
		where id = target_delivery.truck_id;
	end if;

	select nullif(string_agg(address_part, ', ' order by first_seen), '')
	into address_text
	from (
		select
			min(part_order) as first_seen,
			(array_agg(address_part order by part_order))[1] as address_part
		from (
			values
				(1, nullif(trim(address_row.street), '')),
				(2, nullif(trim(address_row.area), '')),
				(3, nullif(trim(address_row.city), '')),
				(4, nullif(trim(address_row.governorate), ''))
		) as parts(part_order, address_part)
		where address_part is not null
		group by lower(address_part)
	) as unique_parts;
	destination_point := app_private.map_point_json(address_row.latitude, address_row.longitude);
	driver_point := app_private.map_point_json(location_row.latitude, location_row.longitude);
	stage := case
		when target_order.status = 'delivered' or target_delivery.status = 'completed' then 'delivered'
		when target_order.status in ('dispatch_assigned', 'out_for_delivery') or target_delivery.status in ('assigned', 'accepted', 'in_transit', 'arrived') then 'out_for_delivery'
		when target_order.status in ('inventory_reserved', 'warehouse_loading', 'dispatch_ready') then 'being_prepared'
		else 'confirmed'
	end;

	return jsonb_build_object(
		'id', target_delivery.id,
		'orderId', target_order.id,
		'orderNumber', target_order.order_number,
		'orderStatus', target_order.status::text,
		'deliveryNumber', target_delivery.delivery_number,
		'deliveryStatus', target_delivery.status::text,
		'driverId', coalesce(target_delivery.driver_id::text, ''),
		'driverName', coalesce(driver_row.full_name, ''),
		'driverPhone', coalesce(driver_row.phone, ''),
		'truckNumber', coalesce(truck_row.plate_number, ''),
		'vehiclePlate', coalesce(truck_row.plate_number, driver_row.vehicle_label, ''),
		'currentStage', stage,
		'estimatedArrival', to_jsonb(coalesce(target_delivery.started_at, target_delivery.updated_at, now()) + interval '30 minutes') #>> '{}',
		'lastUpdated', to_jsonb(coalesce(location_row.recorded_at, target_delivery.updated_at, target_order.updated_at)) #>> '{}',
		'hasActivePOD', exists (
			select 1
			from public.delivery_proofs proofs
			where proofs.delivery_id = target_delivery.id
		),
		'dispatchContacts', '[]'::jsonb,
		'route', jsonb_build_object(
			'origin', coalesce(driver_row.full_name, target_delivery.delivery_number),
			'originLocation', driver_point,
			'destination', coalesce(address_text, target_order.order_number),
			'destinationLocation', destination_point,
			'driverLocation', driver_point,
			'distanceKm', app_private.distance_km_between(
				location_row.latitude,
				location_row.longitude,
				address_row.latitude,
				address_row.longitude
			)
		)
	);
end;
$$;

revoke all on function public.customer_order_delivery_tracking(uuid) from public;
revoke all on function public.customer_order_delivery_tracking(uuid) from anon;
revoke all on function public.customer_order_delivery_tracking(uuid) from authenticated;
