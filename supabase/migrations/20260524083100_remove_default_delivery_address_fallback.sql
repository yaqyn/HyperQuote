drop trigger if exists quote_requests_apply_default_delivery_address
	on public.quote_requests;

drop function if exists app_private.apply_default_quote_delivery_address();

create or replace function app_private.driver_delivery_payload(delivery public.deliveries)
returns jsonb
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
	order_row public.orders%rowtype;
	request_row public.quote_requests%rowtype;
	customer_row public.customers%rowtype;
	address_row public.customer_addresses%rowtype;
	truck_row public.trucks%rowtype;
	location_row public.driver_locations%rowtype;
	item_rows jsonb;
	proof_row jsonb;
	address_text text;
	route_distance_km numeric;
	eta_minutes integer;
begin
	select * into order_row from public.orders where id = delivery.order_id;
	if order_row.id is not null then
		select * into request_row from public.quote_requests where id = order_row.quote_request_id;
		select * into customer_row from public.customers where id = order_row.customer_id;
	end if;
	if request_row.delivery_address_id is not null then
		select * into address_row
		from public.customer_addresses
		where id = request_row.delivery_address_id
		  and label = 'Sales quote site';
	end if;
	if delivery.truck_id is not null then
		select * into truck_row from public.trucks where id = delivery.truck_id;
	end if;
	if delivery.driver_id is not null then
		select * into location_row
		from public.driver_locations
		where driver_id = delivery.driver_id
		  and (delivery_id = delivery.id or delivery_id is null)
		order by
			case when delivery_id = delivery.id then 0 else 1 end,
			recorded_at desc
		limit 1;
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
	if location_row.id is not null
		and address_row.latitude is not null
		and address_row.longitude is not null then
		route_distance_km := app_private.distance_km_between(
			location_row.latitude,
			location_row.longitude,
			address_row.latitude,
			address_row.longitude
		);
	end if;
	eta_minutes := app_private.delivery_eta_minutes(
		route_distance_km,
		location_row.speed_kmh,
		delivery.status::text
	);

	select coalesce(
		jsonb_agg(
			jsonb_build_object(
				'id', qri.id,
				'name', app_private.driver_localized_text(coalesce(p.name, qri.customer_description, '')),
				'quantity', app_private.driver_localized_text(concat(qri.quantity::text, ' ', qri.unit_of_measure)),
				'notes', case
					when qri.notes is null then null
					else app_private.driver_localized_text(qri.notes)
				end
			)
			order by qri.sort_order, qri.created_at
		),
		'[]'::jsonb
	)
	into item_rows
	from public.quote_request_items qri
	left join public.products p on p.id = qri.product_id
	where qri.quote_request_id = order_row.quote_request_id;

	select jsonb_build_object(
		'capturedAt', dp.created_at,
		'location', dp.location,
		'signatureDataUrl', coalesce(dp.proof_path, ''),
		'signerName', coalesce(dp.signer_name, '')
	)
	into proof_row
	from public.delivery_proofs dp
	where dp.delivery_id = delivery.id
	order by dp.created_at desc
	limit 1;

	return jsonb_build_object(
		'id', delivery.id,
		'deliveryNumber', delivery.delivery_number,
		'orderName', app_private.driver_localized_text(coalesce(order_row.order_number, request_row.request_number, delivery.delivery_number)),
		'customer', jsonb_build_object(
			'name', app_private.driver_localized_text(coalesce(customer_row.company_name, '')),
			'phone', coalesce(address_row.phone, customer_row.phone, ''),
			'role', app_private.driver_localized_text(coalesce(customer_row.contact_name, ''))
		),
		'warehouseContact', jsonb_build_object(
			'name', app_private.driver_localized_text(''),
			'phone', '',
			'role', app_private.driver_localized_text('')
		),
		'address', jsonb_build_object(
			'address', app_private.driver_localized_text(coalesce(address_text, '')),
			'label', app_private.driver_localized_text('Dropoff'),
			'latitude', address_row.latitude,
			'longitude', address_row.longitude
		),
		'origin', jsonb_build_object(
			'address', app_private.driver_localized_text(''),
			'label', app_private.driver_localized_text('Warehouse'),
			'latitude', null,
			'longitude', null
		),
		'items', item_rows,
		'notes', app_private.driver_localized_text(coalesce(request_row.notes, '')),
		'scheduledWindow', app_private.driver_localized_text(coalesce(request_row.delivery_date::text, '')),
		'etaMinutes', eta_minutes,
		'status', delivery.status::text,
		'driverId', delivery.driver_id,
		'truckId', delivery.truck_id,
		'truckPlate', truck_row.plate_number,
		'acceptedAt', case when delivery.status in ('accepted', 'in_transit', 'arrived', 'completed') then delivery.updated_at else null end,
		'departedAt', delivery.started_at,
		'arrivedAt', delivery.arrived_at,
		'completedAt', delivery.completed_at,
		'rejectionReason', delivery.rejection_reason,
		'rejectionProof', delivery.rejection_proof,
		'proof', proof_row
	);
end;
$$;

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
	route_distance_km numeric := 0;
	eta_minutes integer;
	estimated_arrival timestamptz;
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
		  and customer_id = v_customer_id
		  and label = 'Sales quote site';
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
	if driver_point is not null and destination_point is not null then
		route_distance_km := app_private.distance_km_between(
			location_row.latitude,
			location_row.longitude,
			address_row.latitude,
			address_row.longitude
		);
	end if;
	stage := case
		when target_order.status = 'delivered' or target_delivery.status = 'completed' then 'delivered'
		when target_order.status in ('dispatch_assigned', 'out_for_delivery') or target_delivery.status in ('assigned', 'accepted', 'in_transit', 'arrived') then 'out_for_delivery'
		when target_order.status in ('inventory_reserved', 'warehouse_loading', 'dispatch_ready') then 'being_prepared'
		else 'confirmed'
	end;
	eta_minutes := case
		when target_order.status = 'delivered' or target_delivery.status = 'completed' then 0
		when driver_point is null or destination_point is null then null
		else app_private.delivery_eta_minutes(
			route_distance_km,
			location_row.speed_kmh,
			target_delivery.status::text
		)
	end;
	estimated_arrival := case
		when target_order.status = 'delivered' or target_delivery.status = 'completed' then
			coalesce(target_delivery.completed_at, target_order.delivered_at, target_delivery.updated_at)
		when eta_minutes is null then null
		else now() + make_interval(mins => eta_minutes)
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
		'estimatedArrival', case
			when estimated_arrival is null then null
			else to_jsonb(estimated_arrival) #>> '{}'
		end,
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
			'distanceKm', coalesce(route_distance_km, 0)
		)
	);
end;
$$;

revoke all on function public.customer_order_delivery_tracking(uuid) from public;
revoke all on function public.customer_order_delivery_tracking(uuid) from anon;
revoke all on function public.customer_order_delivery_tracking(uuid) from authenticated;
