drop function if exists public.warehouse_assign_loading_driver(uuid, uuid);

create or replace function public.warehouse_assign_loading_driver(
	p_order_id uuid,
	p_driver_id uuid,
	p_truck_id uuid default null
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

	select * into driver
	from public.drivers
	where id = p_driver_id
	for update;

	if driver.id is null then
		raise exception 'driver_not_found' using errcode = '02000';
	end if;

	if driver.status <> 'available' then
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

	if p_truck_id is not null then
		select * into truck
		from public.trucks
		where id = p_truck_id
		for update;

		if truck.id is null then
			raise exception 'truck_not_found' using errcode = '02000';
		end if;

		if truck.driver_id is distinct from driver.id then
			raise exception 'truck_not_assigned_to_driver' using errcode = '23514';
		end if;

		if truck.status <> 'available' then
			raise exception 'truck_not_available' using errcode = '23514';
		end if;
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
	values (task.id, driver.id, p_truck_id, '[]'::jsonb)
	on conflict (loading_task_id, driver_id) do update
	set truck_id = excluded.truck_id
	returning * into assignment;

	insert into public.deliveries (order_id, loading_task_id, driver_id, truck_id, status)
	select p_order_id, task.id, driver.id, p_truck_id, 'assigned'
	where not exists (
		select 1
		from public.deliveries existing
		where existing.order_id = p_order_id
		  and existing.driver_id = driver.id
		  and existing.truck_id is not distinct from p_truck_id
		  and existing.status in ('assigned', 'accepted', 'in_transit', 'arrived')
	)
	on conflict do nothing
	returning * into delivery;

	if p_truck_id is not null then
		update public.trucks
		set status = 'loading'
		where id = p_truck_id;
	end if;

	perform public.log_activity(
		'loading_task',
		task.id,
		'warehouse_loading_driver_assigned',
		jsonb_build_object(
			'employee_id', employee_id,
			'order_id', p_order_id,
			'driver_id', driver.id,
			'truck_id', p_truck_id,
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
				'truck_id', p_truck_id
			)
		);
	end if;

	return assignment;
end;
$$;

revoke all on function public.warehouse_assign_loading_driver(uuid, uuid, uuid) from public;
grant execute on function public.warehouse_assign_loading_driver(uuid, uuid, uuid) to authenticated;
