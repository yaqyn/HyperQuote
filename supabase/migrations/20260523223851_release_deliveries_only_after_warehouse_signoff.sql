create temporary table if not exists pg_temp.pre_release_delivery_cleanup_drivers
on commit drop as
select distinct d.driver_id
from public.deliveries d
join public.orders o on o.id = d.order_id
where d.driver_id is not null
  and d.status in ('assigned', 'accepted', 'in_transit', 'arrived')
  and o.status in ('inventory_reserved', 'warehouse_loading');

delete from public.deliveries d
using public.orders o
where o.id = d.order_id
  and d.status in ('assigned', 'accepted', 'in_transit', 'arrived')
  and o.status in ('inventory_reserved', 'warehouse_loading');

update public.drivers driver
set status = 'available'
where driver.status = 'on_delivery'
  and exists (
	select 1
	from pg_temp.pre_release_delivery_cleanup_drivers cleanup
	where cleanup.driver_id = driver.id
  )
  and not exists (
	select 1
	from public.deliveries active_delivery
	join public.orders active_order on active_order.id = active_delivery.order_id
	where active_delivery.driver_id = driver.id
	  and active_delivery.status in ('accepted', 'in_transit', 'arrived')
	  and active_order.status in (
		'dispatch_ready',
		'dispatch_assigned',
		'out_for_delivery'
	  )
  );

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

	if exists (
		select 1
		from public.loading_task_drivers ltd
		join public.loading_tasks lt on lt.id = ltd.loading_task_id
		join public.orders o on o.id = lt.order_id
		where (ltd.driver_id = driver.id or (p_truck_id is not null and ltd.truck_id = p_truck_id))
		  and lt.order_id <> p_order_id
		  and o.status in ('warehouse_loading', 'dispatch_ready', 'dispatch_assigned', 'out_for_delivery')
	) then
		raise exception 'driver_not_available' using errcode = '23514';
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
			'released_to_driver_app', false
		)
	);

	return assignment;
end;
$$;

create or replace function public.warehouse_replace_loading_driver(
	p_order_id uuid,
	p_from_truck_id uuid,
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
	target_assignment public.loading_task_drivers%rowtype;
	truck public.trucks%rowtype;
	driver public.drivers%rowtype;
	online public.driver_online_states%rowtype;
	updated_assignment public.loading_task_drivers%rowtype;
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

	if target_order.status <> 'warehouse_loading' then
		raise exception 'invalid_warehouse_driver_replace_transition_%', target_order.status using errcode = '23514';
	end if;

	select * into task
	from public.loading_tasks
	where order_id = p_order_id
	for update;

	if task.id is null or task.status = 'approved' then
		raise exception 'loading_task_not_ready' using errcode = '23514';
	end if;

	select * into target_assignment
	from public.loading_task_drivers
	where loading_task_id = task.id
	  and truck_id = p_from_truck_id
	for update;

	if target_assignment.id is null then
		raise exception 'truck_not_assigned_to_loading_task' using errcode = '02000';
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

	if exists (
		select 1
		from public.loading_task_drivers ltd
		join public.loading_tasks lt on lt.id = ltd.loading_task_id
		join public.orders o on o.id = lt.order_id
		where ltd.id <> target_assignment.id
		  and (ltd.driver_id = driver.id or (p_truck_id is not null and ltd.truck_id = p_truck_id))
		  and o.status in ('warehouse_loading', 'dispatch_ready', 'dispatch_assigned', 'out_for_delivery')
	) then
		raise exception 'driver_not_available' using errcode = '23514';
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

		if truck.id <> p_from_truck_id and truck.status <> 'available' then
			raise exception 'truck_not_available' using errcode = '23514';
		end if;
	end if;

	update public.loading_task_drivers
	set driver_id = driver.id,
		truck_id = p_truck_id
	where id = target_assignment.id
	returning * into updated_assignment;

	update public.trucks
	set status = 'available'
	where id = p_from_truck_id
	  and id is distinct from p_truck_id;

	if p_truck_id is not null then
		update public.trucks
		set status = 'loading'
		where id = p_truck_id;
	end if;

	update public.loading_tasks
	set status = 'loading',
		proof = proof - 'advisor_marked_ready',
		updated_at = now()
	where id = task.id;

	perform public.log_activity(
		'loading_task',
		task.id,
		'warehouse_loading_driver_assigned',
		jsonb_build_object(
			'employee_id', employee_id,
			'order_id', p_order_id,
			'from_truck_id', p_from_truck_id,
			'driver_id', driver.id,
			'truck_id', p_truck_id,
			'replaced', true,
			'released_to_driver_app', false
		)
	);

	return updated_assignment;
end;
$$;

create or replace function public.warehouse_approve_loading(p_loading_task_id uuid, p_proof jsonb)
returns public.loading_tasks
language plpgsql
security definer
set search_path = public
as $$
declare
	employee_id uuid;
	updated public.loading_tasks%rowtype;
	target_order public.orders%rowtype;
	created_delivery_count integer;
begin
	employee_id := public.require_panel('warehouse', true);
	perform app_private.allow_workflow_state_change();

	select o.* into target_order
	from public.orders o
	join public.loading_tasks lt on lt.order_id = o.id
	where lt.id = p_loading_task_id
	for update of o;

	if target_order.id is null then
		raise exception 'loading_task_not_found' using errcode = '02000';
	end if;

	if target_order.status <> 'warehouse_loading' then
		raise exception 'invalid_warehouse_approve_transition_%', target_order.status using errcode = '23514';
	end if;

	if not exists (
		select 1
		from public.loading_tasks
		where id = p_loading_task_id
		  and status = 'loading'
		  and proof->>'advisor_marked_ready' = 'true'
	) then
		raise exception 'loading_not_marked_ready' using errcode = '23514';
	end if;

	if exists (
		select 1
		from public.quote_request_items qi
		left join public.products p on p.id = qi.product_id
		where qi.quote_request_id = target_order.quote_request_id
		  and (
			p.id is null
			or not exists (
				select 1
				from public.loading_task_drivers ltd
				where ltd.loading_task_id = p_loading_task_id
				  and ltd.assigned_items ? p.slug
			)
		  )
	) then
		raise exception 'not_every_item_loaded' using errcode = '23514';
	end if;

	perform 1
	from public.drivers d
	where d.id in (
		select ltd.driver_id
		from public.loading_task_drivers ltd
		where ltd.loading_task_id = p_loading_task_id
	)
	for update;

	perform 1
	from public.trucks t
	where t.id in (
		select ltd.truck_id
		from public.loading_task_drivers ltd
		where ltd.loading_task_id = p_loading_task_id
		  and ltd.truck_id is not null
	)
	for update;

	if exists (
		select 1
		from public.loading_task_drivers ltd
		join public.drivers d on d.id = ltd.driver_id
		left join public.trucks t on t.id = ltd.truck_id
		left join public.driver_online_states online on online.driver_id = ltd.driver_id
		where ltd.loading_task_id = p_loading_task_id
		  and (
			d.status <> 'available'
			or ltd.truck_id is null
			or t.id is null
			or t.driver_id is distinct from d.id
			or t.status <> 'loading'
			or online.driver_id is null
			or online.status <> 'online'
			or online.last_seen_at < now() - interval '15 minutes'
			or exists (
				select 1
				from public.loading_task_drivers other_ltd
				join public.loading_tasks other_lt on other_lt.id = other_ltd.loading_task_id
				join public.orders other_order on other_order.id = other_lt.order_id
				where other_ltd.id <> ltd.id
				  and (
					other_ltd.driver_id = ltd.driver_id
					or other_ltd.truck_id is not distinct from ltd.truck_id
				  )
				  and other_order.status in (
					'warehouse_loading',
					'dispatch_ready',
					'dispatch_assigned',
					'out_for_delivery'
				  )
			)
		  )
	) then
		raise exception 'assigned_driver_unavailable' using errcode = '23514';
	end if;

	update public.loading_tasks
	set status = 'approved',
		proof = coalesce(proof, '{}'::jsonb) || coalesce(p_proof, '{}'::jsonb),
		rejection_reason = null
	where id = p_loading_task_id
	returning * into updated;

	if updated.id is null then
		raise exception 'loading_task_not_found' using errcode = '02000';
	end if;

	update public.orders
	set status = 'dispatch_ready'
	where id = updated.order_id;

	created_delivery_count := app_private.ensure_loading_task_active_deliveries(
		updated.id,
		employee_id,
		'warehouse_approve_loading'
	);

	update public.trucks
	set status = 'dispatched'
	where id in (
		select truck_id
		from public.loading_task_drivers
		where loading_task_id = updated.id
		  and truck_id is not null
	);

	perform public.log_activity(
		'loading_task',
		updated.id,
		'warehouse_loading_approved',
		jsonb_build_object(
			'from_status', 'warehouse_loading',
			'to_status', 'dispatch_ready',
			'proof', coalesce(p_proof, '{}'::jsonb),
			'created_delivery_count', created_delivery_count
		)
	);
	return updated;
end;
$$;

create or replace function public.driver_accept_delivery(p_delivery_id uuid)
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

	if target_order.status not in ('dispatch_ready', 'dispatch_assigned', 'out_for_delivery') then
		raise exception 'delivery_not_released_by_warehouse' using errcode = '23514';
	end if;

	perform app_private.allow_workflow_state_change();

	update public.deliveries
	set status = 'accepted'
	where id = p_delivery_id
	  and deliveries.driver_id = v_driver_id
	  and status = 'assigned'
	returning * into updated;

	if updated.id is null then
		raise exception 'delivery_not_found_or_invalid_transition' using errcode = '02000';
	end if;

	update public.drivers
	set status = 'on_delivery'
	where id = v_driver_id;

	perform public.log_activity(
		'delivery',
		updated.id,
		'driver_delivery_accepted',
		jsonb_build_object('driver_id', v_driver_id, 'from_status', 'assigned', 'to_status', 'accepted')
	);

	return updated;
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
		select 1
		from public.deliveries d
		join public.orders o on o.id = d.order_id
		where d.driver_id = v_driver_id
		  and d.status in ('assigned', 'accepted', 'in_transit', 'arrived')
		  and o.status in ('dispatch_ready', 'dispatch_assigned', 'out_for_delivery')
	) then
		raise exception 'delivery_scope_required' using errcode = '42501';
	end if;

	if p_delivery_id is not null and not exists (
		select 1
		from public.deliveries d
		join public.orders o on o.id = d.order_id
		where d.id = p_delivery_id
		  and d.driver_id = v_driver_id
		  and d.status in ('assigned', 'accepted', 'in_transit', 'arrived')
		  and o.status in ('dispatch_ready', 'dispatch_assigned', 'out_for_delivery')
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
			'accuracy_meters', p_accuracy_meters,
			'heading', p_heading,
			'speed_kmh', p_speed_kmh
		)
	);

	return location_row;
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
	join public.orders o on o.id = d.order_id
	where d.driver_id = v_driver_id
	  and (
		(
			d.status in ('assigned', 'accepted', 'in_transit', 'arrived')
			and o.status in ('dispatch_ready', 'dispatch_assigned', 'out_for_delivery')
		)
		or (
			d.status in ('completed', 'rejected')
			and (d.created_at >= now() - interval '1 day' or d.completed_at >= now() - interval '1 day')
		)
	  );

	select app_private.driver_delivery_payload(d)
	into active_delivery
	from public.deliveries d
	join public.orders o on o.id = d.order_id
	where d.driver_id = v_driver_id
	  and d.status in ('accepted', 'in_transit', 'arrived')
	  and o.status in ('dispatch_ready', 'dispatch_assigned', 'out_for_delivery')
	order by d.updated_at desc
	limit 1;

	select app_private.driver_delivery_payload(d)
	into next_delivery
	from public.deliveries d
	join public.orders o on o.id = d.order_id
	where d.driver_id = v_driver_id
	  and d.status = 'assigned'
	  and o.status in ('dispatch_ready', 'dispatch_assigned', 'out_for_delivery')
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
	from public.deliveries d
	join public.orders o on o.id = d.order_id
	where d.driver_id = v_driver_id
	  and d.status = 'assigned'
	  and o.status in ('dispatch_ready', 'dispatch_assigned', 'out_for_delivery');

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

create or replace function public.service_warehouse_replace_loading_driver(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_order_id uuid,
	p_from_truck_id uuid,
	p_driver_id uuid,
	p_truck_id uuid default null
)
returns public.loading_task_drivers
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	return public.warehouse_replace_loading_driver(
		p_order_id,
		p_from_truck_id,
		p_driver_id,
		p_truck_id
	);
end;
$$;

revoke all on function public.service_warehouse_replace_loading_driver(uuid, text, uuid, uuid, uuid, uuid)
	from public, anon, authenticated;
grant execute on function public.service_warehouse_replace_loading_driver(uuid, text, uuid, uuid, uuid, uuid)
	to service_role;
revoke all on function public.warehouse_replace_loading_driver(uuid, uuid, uuid, uuid)
	from public, anon, authenticated;
grant execute on function public.warehouse_replace_loading_driver(uuid, uuid, uuid, uuid)
	to service_role;
