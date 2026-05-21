alter type public.audit_event_type add value if not exists 'driver_delivery_route_reopened';

create table if not exists app_private.order_delivery_secrets (
	order_id uuid primary key references public.orders(id) on delete cascade,
	code text not null check (code ~ '^[0-9]{6}$'),
	generated_at timestamptz not null default now(),
	verified_at timestamptz,
	verified_by_driver_id uuid references public.drivers(id) on delete set null,
	verified_delivery_id uuid references public.deliveries(id) on delete set null
);

alter table app_private.order_delivery_secrets enable row level security;

create or replace function app_private.generate_delivery_secret_code()
returns text
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
	random_number bigint;
begin
	random_number := (
		('x' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))::bit(32)::bigint
	);

	return ((random_number % 900000) + 100000)::text;
end;
$$;

create or replace function app_private.ensure_delivery_secret_for_order(p_order_id uuid)
returns text
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
	secret_code text;
begin
	insert into app_private.order_delivery_secrets (order_id, code)
	values (p_order_id, app_private.generate_delivery_secret_code())
	on conflict (order_id) do update
	set order_id = excluded.order_id
	returning code into secret_code;

	return secret_code;
end;
$$;

create or replace function app_private.extract_delivery_secret_code(p_value text)
returns text
language plpgsql
immutable
set search_path = public, app_private
as $$
declare
	normalized text;
	match text[];
begin
	normalized := upper(regexp_replace(coalesce(p_value, ''), '[[:space:]-]+', '', 'g'));

	if normalized = '' then
		return null;
	end if;

	match := regexp_match(normalized, '^(?:HQDELIVERY:[0-9A-F]{8}[0-9A-F]{4}[0-9A-F]{4}[0-9A-F]{4}[0-9A-F]{12}:)?([0-9]{6})$');
	if match is not null then
		return match[1];
	end if;

	match := regexp_match(normalized, '^(?:HQDELIVERY:[0-9A-F-]{36}:)?([0-9]{6})$');
	if match is not null then
		return match[1];
	end if;

	return null;
end;
$$;

create or replace function app_private.map_point_json(p_lat numeric, p_lng numeric)
returns jsonb
language sql
stable
set search_path = public, app_private
as $$
	select case
		when p_lat is null or p_lng is null then null::jsonb
		when p_lat < -90 or p_lat > 90 or p_lng < -180 or p_lng > 180 then null::jsonb
		else jsonb_build_object('lat', p_lat::double precision, 'lng', p_lng::double precision)
	end
$$;

create or replace function app_private.distance_km_between(
	p_lat_a numeric,
	p_lng_a numeric,
	p_lat_b numeric,
	p_lng_b numeric
)
returns numeric
language sql
stable
set search_path = public, app_private
as $$
	select case
		when p_lat_a is null or p_lng_a is null or p_lat_b is null or p_lng_b is null then 0
		when p_lat_a < -90 or p_lat_a > 90 or p_lat_b < -90 or p_lat_b > 90 then 0
		when p_lng_a < -180 or p_lng_a > 180 or p_lng_b < -180 or p_lng_b > 180 then 0
		else round((
			6371 * acos(least(1, greatest(-1,
				cos(radians(p_lat_a::double precision)) *
				cos(radians(p_lat_b::double precision)) *
				cos(radians(p_lng_b::double precision) - radians(p_lng_a::double precision)) +
				sin(radians(p_lat_a::double precision)) *
				sin(radians(p_lat_b::double precision))
			)))
		)::numeric, 1)
	end
$$;

create or replace function app_private.workflow_state_change_is_authorized()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
	stack text;
	allowed_function text;
	allowed_functions text[] := array[
		'public.customer_submit_saved_quote_request',
		'public.customer_accept_quote',
		'public.customer_decline_quote',
		'public.customer_request_quote_negotiation',
		'public.customer_submit_quote_line_response',
		'public.claim_next_sales_order',
		'public.sales_claim_order',
		'public.sales_save_and_requeue',
		'public.sales_confirm_order',
		'public.sales_reject_order',
		'public.sales_cancel_order',
		'public.record_supplier_payment',
		'public.reserve_order_stock',
		'public.finance_cancel_customer_order',
		'public.warehouse_start_loading',
		'public.warehouse_assign_loading_driver',
		'public.warehouse_toggle_loading_item',
		'public.warehouse_mark_loading_ready',
		'public.warehouse_reset_loading',
		'public.warehouse_remove_loading_driver',
		'public.warehouse_approve_loading',
		'public.warehouse_reject_loading',
		'public.warehouse_approve_receiving',
		'public.warehouse_reject_receiving',
		'public.dispatch_assign_driver',
		'public.dispatch_complete_delivery',
		'public.dispatch_reject_delivery',
		'public.dispatch_complete_loaded_order',
		'public.dispatch_return_loaded_order',
		'public.driver_set_online',
		'public.driver_accept_delivery',
		'public.driver_start_delivery',
		'public.driver_record_arrival',
		'public.driver_confirm_arrival_secret',
		'public.driver_reopen_delivery_route',
		'public.driver_update_location',
		'public.driver_confirm_delivery',
		'public.driver_reject_delivery',
		'public.admin_disable_driver'
	];
begin
	if coalesce(current_setting('app.workflow_rpc', true), '') <> 'on' then
		return false;
	end if;

	get diagnostics stack = pg_context;

	foreach allowed_function in array allowed_functions
	loop
		if stack like ('%PL/pgSQL function ' || allowed_function || '(%')
			or stack like ('%PL/pgSQL function ' || replace(allowed_function, 'public.', '') || '(%')
		then
			return true;
		end if;
	end loop;

	return false;
end;
$$;

create or replace function public.driver_start_delivery(p_delivery_id uuid)
returns public.deliveries
language plpgsql
security definer
set search_path = public, app_private
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

	if target_order.status not in ('dispatch_ready', 'dispatch_assigned', 'out_for_delivery') then
		raise exception 'delivery_not_released_by_warehouse' using errcode = '23514';
	end if;

	perform app_private.allow_workflow_state_change();

	update public.deliveries
	set status = 'in_transit',
		started_at = coalesce(started_at, now())
	where id = p_delivery_id
	  and deliveries.driver_id = v_driver_id
	  and status = 'accepted'
	returning * into updated;

	if updated.id is null then
		raise exception 'delivery_not_found_or_invalid_transition' using errcode = '02000';
	end if;

	update public.orders
	set status = 'out_for_delivery'
	where id = updated.order_id
	  and status <> 'out_for_delivery';

	perform app_private.ensure_delivery_secret_for_order(updated.order_id);

	perform public.log_activity(
		'delivery',
		updated.id,
		'driver_delivery_started',
		jsonb_build_object('driver_id', v_driver_id, 'from_status', 'accepted', 'to_status', 'in_transit', 'order_status', 'out_for_delivery')
	);

	return updated;
end;
$$;

create or replace function public.driver_record_arrival(p_delivery_id uuid)
returns public.deliveries
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
	v_driver_id uuid;
	target_delivery public.deliveries%rowtype;
	updated public.deliveries%rowtype;
begin
	v_driver_id := public.current_driver_id();
	if v_driver_id is null then
		raise exception 'driver_required' using errcode = '42501';
	end if;

	select * into target_delivery
	from public.deliveries
	where id = p_delivery_id
	  and driver_id = v_driver_id
	for update;

	if target_delivery.id is null or target_delivery.status <> 'in_transit' then
		raise exception 'delivery_not_found_or_invalid_transition' using errcode = '02000';
	end if;

	if exists (
		select 1
		from app_private.order_delivery_secrets secrets
		where secrets.order_id = target_delivery.order_id
	) then
		raise exception 'delivery_secret_required' using errcode = '23514';
	end if;

	perform app_private.allow_workflow_state_change();

	update public.deliveries
	set status = 'arrived',
		arrived_at = now()
	where id = p_delivery_id
	returning * into updated;

	perform public.log_activity(
		'delivery',
		updated.id,
		'driver_delivery_arrived',
		jsonb_build_object('driver_id', v_driver_id, 'from_status', 'in_transit', 'to_status', 'arrived', 'verification', 'legacy_no_secret')
	);

	return updated;
end;
$$;

create or replace function public.driver_confirm_arrival_secret(
	p_delivery_id uuid,
	p_code text
)
returns public.deliveries
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
	v_driver_id uuid;
	target_delivery public.deliveries%rowtype;
	secret_row app_private.order_delivery_secrets%rowtype;
	submitted_code text;
	updated public.deliveries%rowtype;
begin
	v_driver_id := public.current_driver_id();
	if v_driver_id is null then
		raise exception 'driver_required' using errcode = '42501';
	end if;

	submitted_code := app_private.extract_delivery_secret_code(p_code);
	if submitted_code is null then
		raise exception 'invalid_delivery_secret' using errcode = '23514';
	end if;

	select * into target_delivery
	from public.deliveries
	where id = p_delivery_id
	  and driver_id = v_driver_id
	for update;

	if target_delivery.id is null or target_delivery.status <> 'in_transit' then
		raise exception 'delivery_not_found_or_invalid_transition' using errcode = '02000';
	end if;

	select * into secret_row
	from app_private.order_delivery_secrets
	where order_id = target_delivery.order_id
	for update;

	if secret_row.order_id is null then
		perform app_private.ensure_delivery_secret_for_order(target_delivery.order_id);
		select * into secret_row
		from app_private.order_delivery_secrets
		where order_id = target_delivery.order_id
		for update;
	end if;

	if secret_row.code <> submitted_code then
		raise exception 'invalid_delivery_secret' using errcode = '23514';
	end if;

	perform app_private.allow_workflow_state_change();

	update public.deliveries
	set status = 'arrived',
		arrived_at = now()
	where id = p_delivery_id
	returning * into updated;

	update app_private.order_delivery_secrets
	set verified_at = now(),
		verified_by_driver_id = v_driver_id,
		verified_delivery_id = p_delivery_id
	where order_id = target_delivery.order_id;

	perform public.log_activity(
		'delivery',
		updated.id,
		'driver_delivery_arrived',
		jsonb_build_object('driver_id', v_driver_id, 'from_status', 'in_transit', 'to_status', 'arrived', 'verification', 'customer_secret')
	);

	return updated;
end;
$$;

create or replace function public.driver_reopen_delivery_route(p_delivery_id uuid)
returns public.deliveries
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
	v_driver_id uuid;
	updated public.deliveries%rowtype;
begin
	v_driver_id := public.current_driver_id();
	if v_driver_id is null then
		raise exception 'driver_required' using errcode = '42501';
	end if;

	perform app_private.allow_workflow_state_change();

	update public.deliveries
	set status = 'in_transit',
		arrived_at = null
	where id = p_delivery_id
	  and deliveries.driver_id = v_driver_id
	  and status = 'arrived'
	returning * into updated;

	if updated.id is null then
		raise exception 'delivery_not_found_or_invalid_transition' using errcode = '02000';
	end if;

	update app_private.order_delivery_secrets
	set verified_at = null,
		verified_by_driver_id = null,
		verified_delivery_id = null
	where order_id = updated.order_id
	  and verified_delivery_id = updated.id;

	perform public.log_activity(
		'delivery',
		updated.id,
		'driver_delivery_route_reopened',
		jsonb_build_object('driver_id', v_driver_id, 'from_status', 'arrived', 'to_status', 'in_transit')
	);

	return updated;
end;
$$;

create or replace function public.customer_get_delivery_secret(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
	v_customer_id uuid;
	target_order public.orders%rowtype;
	secret_code text;
begin
	v_customer_id := public.current_customer_id();
	if v_customer_id is null then
		raise exception 'customer_required' using errcode = '42501';
	end if;

	select * into target_order
	from public.orders
	where id = p_order_id
	  and customer_id = v_customer_id
	for update;

	if target_order.id is null then
		raise exception 'order_not_found' using errcode = '02000';
	end if;

	if target_order.status <> 'out_for_delivery' then
		raise exception 'delivery_secret_unavailable' using errcode = '23514';
	end if;

	if not exists (
		select 1
		from public.deliveries
		where order_id = target_order.id
		  and status in ('in_transit', 'arrived')
	) then
		raise exception 'delivery_secret_unavailable' using errcode = '23514';
	end if;

	secret_code := app_private.ensure_delivery_secret_for_order(target_order.id);

	perform public.log_activity(
		'order',
		target_order.id,
		'portal_order_viewed',
		jsonb_build_object('delivery_secret_revealed', true)
	);

	return jsonb_build_object(
		'code', secret_code,
		'payload', concat('HQDELIVERY:', target_order.id::text, ':', secret_code)
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
			when 'in_transit' then 1
			when 'arrived' then 2
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

	if target_delivery.driver_id is not null then
		select * into driver_row
		from public.drivers
		where id = target_delivery.driver_id;

		select * into location_row
		from public.driver_locations
		where driver_id = target_delivery.driver_id
		order by recorded_at desc
		limit 1;
	end if;

	if target_delivery.truck_id is not null then
		select * into truck_row
		from public.trucks
		where id = target_delivery.truck_id;
	end if;

	address_text := nullif(trim(concat_ws(', ', address_row.street, address_row.area, address_row.city, address_row.governorate)), '');
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
		'deliveryNumber', target_delivery.delivery_number,
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

grant execute on function public.driver_confirm_arrival_secret(uuid, text) to authenticated;
grant execute on function public.driver_reopen_delivery_route(uuid) to authenticated;
grant execute on function public.customer_get_delivery_secret(uuid) to authenticated;
grant execute on function public.customer_order_delivery_tracking(uuid) to authenticated;
