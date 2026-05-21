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
