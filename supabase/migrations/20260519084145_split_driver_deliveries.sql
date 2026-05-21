create unique index if not exists deliveries_active_assignment_unique_idx
	on public.deliveries (order_id, driver_id, truck_id)
	where status in ('assigned', 'accepted', 'in_transit', 'arrived');

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
		  and existing.driver_id = driver.id
		  and existing.truck_id is not distinct from truck.id
		  and existing.status in ('assigned', 'accepted', 'in_transit', 'arrived')
	)
	on conflict do nothing
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

do $$
declare
	created_delivery public.deliveries%rowtype;
begin
	for created_delivery in
		insert into public.deliveries (order_id, loading_task_id, driver_id, truck_id, status)
		select lt.order_id, lt.id, ltd.driver_id, ltd.truck_id, 'assigned'
		from public.loading_tasks lt
		join public.loading_task_drivers ltd on ltd.loading_task_id = lt.id
		join public.orders o on o.id = lt.order_id
		where lt.status = 'approved'
		  and o.status in ('dispatch_ready', 'dispatch_assigned', 'out_for_delivery')
		  and not exists (
			select 1
			from public.deliveries existing
			where existing.order_id = lt.order_id
			  and existing.driver_id = ltd.driver_id
			  and existing.truck_id is not distinct from ltd.truck_id
			  and existing.status in ('assigned', 'accepted', 'in_transit', 'arrived')
		  )
		on conflict do nothing
		returning *
	loop
		perform public.log_activity(
			'delivery',
			created_delivery.id,
			'driver_assigned_delivery',
			jsonb_build_object(
				'backfill', true,
				'order_id', created_delivery.order_id,
				'loading_task_id', created_delivery.loading_task_id,
				'driver_id', created_delivery.driver_id,
				'truck_id', created_delivery.truck_id
			)
		);
	end loop;
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

	if p_delivery_id is null and exists (
		select 1 from public.deliveries
		where driver_id = v_driver_id
		  and status in ('assigned', 'accepted', 'in_transit', 'arrived')
	) then
		raise exception 'delivery_scope_required' using errcode = '42501';
	end if;

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
