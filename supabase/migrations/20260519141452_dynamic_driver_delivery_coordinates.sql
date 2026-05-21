alter table public.customer_addresses
	add column if not exists latitude numeric,
	add column if not exists longitude numeric;

create or replace function app_private.driver_delivery_payload(delivery public.deliveries)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
	order_row public.orders%rowtype;
	request_row public.quote_requests%rowtype;
	customer_row public.customers%rowtype;
	address_row public.customer_addresses%rowtype;
	truck_row public.trucks%rowtype;
	item_rows jsonb;
	proof_row jsonb;
	address_text text;
begin
	select * into order_row from public.orders where id = delivery.order_id;
	if order_row.id is not null then
		select * into request_row from public.quote_requests where id = order_row.quote_request_id;
		select * into customer_row from public.customers where id = order_row.customer_id;
	end if;
	if request_row.delivery_address_id is not null then
		select * into address_row from public.customer_addresses where id = request_row.delivery_address_id;
	end if;
	if delivery.truck_id is not null then
		select * into truck_row from public.trucks where id = delivery.truck_id;
	end if;

	address_text := nullif(trim(concat_ws(', ', address_row.street, address_row.area, address_row.city, address_row.governorate)), '');

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
		'etaMinutes', null,
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

create or replace function public.driver_app_dashboard()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
	v_driver_id uuid;
	driver_row public.drivers%rowtype;
	online_row public.driver_online_states%rowtype;
	location_row public.driver_locations%rowtype;
	deliveries_json jsonb;
	active_delivery jsonb;
	next_delivery jsonb;
	completed_today integer;
	open_deliveries integer;
begin
	v_driver_id := public.current_driver_id();
	if v_driver_id is null then
		raise exception 'driver_required' using errcode = '42501';
	end if;

	select * into driver_row from public.drivers where id = v_driver_id;
	select * into online_row from public.driver_online_states where driver_id = v_driver_id;
	select * into location_row
	from public.driver_locations
	where driver_id = v_driver_id
	order by recorded_at desc
	limit 1;

	select coalesce(jsonb_agg(app_private.driver_delivery_payload(d) order by d.created_at desc), '[]'::jsonb)
	into deliveries_json
	from public.deliveries d
	where d.driver_id = v_driver_id
	  and (
		d.status in ('assigned', 'accepted', 'in_transit', 'arrived')
		or d.created_at >= now() - interval '1 day'
		or d.completed_at >= now() - interval '1 day'
	  );

	select app_private.driver_delivery_payload(d)
	into active_delivery
	from public.deliveries d
	where d.driver_id = v_driver_id
	  and d.status in ('accepted', 'in_transit', 'arrived')
	order by d.updated_at desc
	limit 1;

	select app_private.driver_delivery_payload(d)
	into next_delivery
	from public.deliveries d
	where d.driver_id = v_driver_id
	  and d.status = 'assigned'
	order by d.created_at asc
	limit 1;

	select count(*)::integer
	into completed_today
	from public.deliveries
	where driver_id = v_driver_id
	  and status = 'completed'
	  and completed_at::date = current_date;

	select count(*)::integer
	into open_deliveries
	from public.deliveries
	where driver_id = v_driver_id
	  and status = 'assigned';

	return jsonb_build_object(
		'currentDriver', jsonb_build_object(
			'id', driver_row.id,
			'email', driver_row.email,
			'name', app_private.driver_localized_text(driver_row.full_name),
			'phone', driver_row.phone,
			'status', driver_row.status::text,
			'onlineStatus', coalesce(online_row.status::text, 'offline'),
			'vehicle', app_private.driver_localized_text(coalesce(driver_row.vehicle_label, '')),
			'location', case
				when location_row.id is null then null
				else jsonb_build_object(
					'accuracyMeters', location_row.accuracy_meters,
					'heading', location_row.heading,
					'latitude', location_row.latitude,
					'longitude', location_row.longitude,
					'recordedAt', location_row.recorded_at,
					'source', location_row.source::text,
					'speedKmh', location_row.speed_kmh
				)
			end
		),
		'activeDelivery', active_delivery,
		'completedToday', completed_today,
		'deliveries', deliveries_json,
		'nextDelivery', next_delivery,
		'openDeliveries', open_deliveries
	);
end;
$$;
