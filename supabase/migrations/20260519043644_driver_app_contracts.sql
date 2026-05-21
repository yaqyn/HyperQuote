alter type public.audit_event_type add value if not exists 'driver_location_updated';
alter type public.audit_event_type add value if not exists 'driver_assigned_delivery';
alter type public.audit_event_type add value if not exists 'customer_signature_captured';
alter type public.audit_event_type add value if not exists 'driver_rejection_proof_uploaded';

create schema if not exists app_private;

create or replace function app_private.driver_localized_text(value text)
returns jsonb
language sql
stable
set search_path = public
as $$
	select jsonb_build_object('en', coalesce(value, ''), 'ar', coalesce(value, ''))
$$;

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
				'name', app_private.driver_localized_text(coalesce(p.name, qri.customer_description)),
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

create or replace function public.driver_update_location(
	p_latitude numeric,
	p_longitude numeric,
	p_accuracy_meters numeric default null,
	p_delivery_id uuid default null,
	p_heading numeric default null,
	p_speed_kmh numeric default null
)
returns public.driver_locations
language plpgsql
security definer
set search_path = public
as $$
declare
	v_driver_id uuid;
	location_row public.driver_locations%rowtype;
begin
	v_driver_id := public.current_driver_id();
	if v_driver_id is null then
		raise exception 'driver_required' using errcode = '42501';
	end if;
	perform app_private.allow_workflow_state_change();

	if p_delivery_id is not null and not exists (
		select 1 from public.deliveries
		where id = p_delivery_id
		  and deliveries.driver_id = v_driver_id
		  and status in ('assigned', 'accepted', 'in_transit', 'arrived')
	) then
		raise exception 'delivery_not_assigned_to_driver' using errcode = '42501';
	end if;

	insert into public.driver_locations (
		driver_id,
		delivery_id,
		latitude,
		longitude,
		accuracy_meters,
		heading,
		speed_kmh
	)
	values (v_driver_id, p_delivery_id, p_latitude, p_longitude, p_accuracy_meters, p_heading, p_speed_kmh)
	returning * into location_row;

	insert into public.driver_online_states (driver_id, status, last_seen_at)
	values (v_driver_id, 'online', now())
	on conflict (driver_id) do update
	set status = 'online', last_seen_at = excluded.last_seen_at;

	update public.drivers
	set status = case when status = 'offline' then 'available' else status end
	where id = v_driver_id;

	perform public.log_activity(
		'driver',
		v_driver_id,
		'driver_location_updated',
		jsonb_build_object(
			'delivery_id', p_delivery_id,
			'latitude', p_latitude,
			'longitude', p_longitude,
			'accuracy_meters', p_accuracy_meters
		)
	);

	return location_row;
end;
$$;

create or replace function public.warehouse_assign_loading_driver(
	p_order_id uuid,
	p_truck_id uuid
)
returns public.loading_task_drivers
language plpgsql
security definer
set search_path = public
as $$
declare
	employee_id uuid;
	target_order public.orders%rowtype;
	task public.loading_tasks%rowtype;
	truck public.trucks%rowtype;
	driver public.drivers%rowtype;
	online public.driver_online_states%rowtype;
	assignment public.loading_task_drivers%rowtype;
	delivery public.deliveries%rowtype;
begin
	employee_id := public.require_panel('warehouse', true);
	perform app_private.allow_workflow_state_change();

	select * into target_order
	from public.orders
	where id = p_order_id
	for update;

	if target_order.id is null then
		raise exception 'order_not_found' using errcode = '02000';
	end if;

	if target_order.status not in ('inventory_reserved', 'warehouse_loading') then
		raise exception 'invalid_warehouse_loading_assignment_transition_%', target_order.status using errcode = '23514';
	end if;

	select * into truck
	from public.trucks
	where id = p_truck_id
	for update;

	if truck.id is null then
		raise exception 'truck_not_found' using errcode = '02000';
	end if;

	if truck.status <> 'available' then
		raise exception 'truck_not_available' using errcode = '23514';
	end if;

	select * into driver
	from public.drivers
	where id = truck.driver_id
	for update;

	if driver.id is null or driver.status <> 'available' then
		raise exception 'driver_not_available' using errcode = '23514';
	end if;

	select * into online
	from public.driver_online_states
	where driver_id = driver.id;

	if online.driver_id is null
		or online.status <> 'online'
		or online.last_seen_at < now() - interval '15 minutes' then
		raise exception 'driver_not_online' using errcode = '23514';
	end if;

	insert into public.loading_tasks (order_id, advisor_employee_id, status)
	values (p_order_id, employee_id, 'loading')
	on conflict (order_id) do update
	set
		advisor_employee_id = excluded.advisor_employee_id,
		status = 'loading',
		proof = public.loading_tasks.proof - 'advisor_marked_ready',
		updated_at = now()
	returning * into task;

	update public.orders
	set status = 'warehouse_loading'
	where id = p_order_id;

	insert into public.loading_task_drivers (
		loading_task_id,
		driver_id,
		truck_id,
		assigned_items
	)
	values (task.id, driver.id, truck.id, '[]'::jsonb)
	on conflict (loading_task_id, driver_id) do update
	set truck_id = excluded.truck_id
	returning * into assignment;

	insert into public.deliveries (order_id, loading_task_id, driver_id, truck_id, status)
	select p_order_id, task.id, driver.id, truck.id, 'assigned'
	where not exists (
		select 1
		from public.deliveries existing
		where existing.order_id = p_order_id
		  and existing.status in ('assigned', 'accepted', 'in_transit', 'arrived')
	)
	returning * into delivery;

	update public.trucks
	set status = 'loading'
	where id = truck.id;

	perform public.log_activity(
		'loading_task',
		task.id,
		'warehouse_loading_driver_assigned',
		jsonb_build_object(
			'employee_id', employee_id,
			'order_id', p_order_id,
			'driver_id', driver.id,
			'truck_id', truck.id,
			'delivery_id', delivery.id
		)
	);

	if delivery.id is not null then
		perform public.log_activity(
			'delivery',
			delivery.id,
			'driver_assigned_delivery',
			jsonb_build_object(
				'employee_id', employee_id,
				'order_id', p_order_id,
				'loading_task_id', task.id,
				'driver_id', driver.id,
				'truck_id', truck.id
			)
		);
	end if;

	return assignment;
end;
$$;

create or replace function public.driver_start_delivery(p_delivery_id uuid)
returns public.deliveries
language plpgsql
security definer
set search_path = public
as $$
declare
	v_driver_id uuid;
	updated public.deliveries%rowtype;
	target_order public.orders%rowtype;
begin
	v_driver_id := public.current_driver_id();
	if v_driver_id is null then
		raise exception 'driver_required' using errcode = '42501';
	end if;

	select o.* into target_order
	from public.orders o
	join public.deliveries d on d.order_id = o.id
	where d.id = p_delivery_id
	  and d.driver_id = v_driver_id
	for update of o;

	if target_order.id is null then
		raise exception 'delivery_not_found_or_invalid_transition' using errcode = '02000';
	end if;

	if target_order.status not in ('dispatch_ready', 'dispatch_assigned') then
		raise exception 'delivery_not_released_by_warehouse' using errcode = '23514';
	end if;

	perform app_private.allow_workflow_state_change();

	update public.deliveries
	set status = 'in_transit', started_at = now()
	where id = p_delivery_id
	  and deliveries.driver_id = v_driver_id
	  and status = 'accepted'
	returning * into updated;

	if updated.id is null then
		raise exception 'delivery_not_found_or_invalid_transition' using errcode = '02000';
	end if;

	update public.orders
	set status = 'out_for_delivery'
	where id = updated.order_id;

	perform public.log_activity(
		'delivery',
		updated.id,
		'driver_delivery_started',
		jsonb_build_object('driver_id', v_driver_id, 'from_status', 'accepted', 'to_status', 'in_transit', 'order_status', 'out_for_delivery')
	);

	return updated;
end;
$$;

create or replace function public.driver_confirm_delivery(
	p_delivery_id uuid,
	p_signature_path text,
	p_signer_name text,
	p_latitude numeric,
	p_longitude numeric
)
returns public.deliveries
language plpgsql
security definer
set search_path = public
as $$
declare
	v_driver_id uuid;
	updated public.deliveries%rowtype;
	target_order public.orders%rowtype;
begin
	v_driver_id := public.current_driver_id();
	if v_driver_id is null then
		raise exception 'driver_required' using errcode = '42501';
	end if;
	perform public.require_delivery_signature(p_signature_path, p_signer_name);
	perform app_private.allow_workflow_state_change();

	update public.deliveries
	set status = 'completed', completed_at = now()
	where id = p_delivery_id
	  and deliveries.driver_id = v_driver_id
	  and status = 'arrived'
	returning * into updated;

	if updated.id is null then
		raise exception 'delivery_not_found_or_invalid_transition' using errcode = '02000';
	end if;

	select * into target_order from public.orders where id = updated.order_id;

	insert into public.delivery_proofs (
		delivery_id,
		driver_id,
		proof_type,
		proof_path,
		signer_name,
		location
	)
	values (
		p_delivery_id,
		v_driver_id,
		'signature',
		p_signature_path,
		p_signer_name,
		jsonb_build_object('latitude', p_latitude, 'longitude', p_longitude)
	);

	update public.orders
	set status = 'delivered', delivered_at = now()
	where id = updated.order_id;

	perform app_private.consume_order_reservations(updated.order_id);

	update public.drivers
	set status = 'available'
	where id = v_driver_id;

	update public.trucks
	set status = 'available'
	where id = updated.truck_id;

	perform public.log_activity(
		'delivery',
		updated.id,
		'customer_signature_captured',
		jsonb_build_object(
			'driver_id', v_driver_id,
			'order_id', updated.order_id,
			'customer_id', target_order.customer_id,
			'truck_id', updated.truck_id,
			'signer_name', p_signer_name,
			'latitude', p_latitude,
			'longitude', p_longitude
		)
	);

	perform public.log_activity(
		'delivery',
		updated.id,
		'driver_delivery_confirmed',
		jsonb_build_object('driver_id', v_driver_id, 'to_status', 'delivered')
	);
	return updated;
end;
$$;

create or replace function public.driver_reject_delivery(p_delivery_id uuid, p_reason text, p_proof jsonb)
returns public.deliveries
language plpgsql
security definer
set search_path = public
as $$
declare
	v_driver_id uuid;
	updated public.deliveries%rowtype;
begin
	v_driver_id := public.current_driver_id();
	if v_driver_id is null then
		raise exception 'driver_required' using errcode = '42501';
	end if;
	if p_reason is null or length(trim(p_reason)) < 3 then
		raise exception 'driver_rejection_reason_required' using errcode = '23514';
	end if;
	perform public.require_rejection_proof(p_proof);
	perform app_private.allow_workflow_state_change();

	update public.deliveries
	set status = 'rejected', rejection_reason = trim(p_reason), rejection_proof = p_proof
	where id = p_delivery_id
	  and deliveries.driver_id = v_driver_id
	  and status in ('assigned', 'accepted', 'in_transit', 'arrived')
	returning * into updated;

	if updated.id is null then
		raise exception 'delivery_not_found_or_invalid_transition' using errcode = '02000';
	end if;

	update public.orders
	set status = 'warehouse_loading'
	where id = updated.order_id;

	update public.loading_tasks
	set status = 'rejected',
		rejection_reason = trim(p_reason),
		proof = p_proof
	where id = updated.loading_task_id;

	update public.drivers
	set status = 'available'
	where id = v_driver_id;

	update public.trucks
	set status = 'available'
	where id = updated.truck_id;

	perform public.log_activity(
		'delivery',
		updated.id,
		'driver_rejection_proof_uploaded',
		jsonb_build_object('driver_id', v_driver_id, 'reason', trim(p_reason), 'proof', p_proof)
	);

	perform public.log_activity(
		'delivery',
		updated.id,
		'driver_delivery_rejected',
		jsonb_build_object('to_status', 'rejected', 'reason', trim(p_reason), 'proof', p_proof)
	);
	perform public.log_activity(
		'order',
		updated.order_id,
		'delivery_returned_to_warehouse_loading',
		jsonb_build_object('delivery_id', updated.id, 'to_status', 'warehouse_loading')
	);
	return updated;
end;
$$;

grant execute on function public.driver_app_dashboard() to authenticated;
grant execute on function public.driver_update_location(numeric, numeric, numeric, uuid, numeric, numeric) to authenticated;
grant execute on function public.driver_confirm_delivery(uuid, text, text, numeric, numeric) to authenticated;
grant execute on function public.driver_reject_delivery(uuid, text, jsonb) to authenticated;
