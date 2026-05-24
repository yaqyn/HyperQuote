create or replace function app_private.ensure_loading_task_active_deliveries(
	p_loading_task_id uuid,
	p_employee_id uuid default null,
	p_source_action text default 'warehouse_approve_loading'
)
returns integer
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
	target_task public.loading_tasks%rowtype;
	assignment public.loading_task_drivers%rowtype;
	existing_delivery public.deliveries%rowtype;
	active_delivery public.deliveries%rowtype;
	started_delivery_count integer := 0;
	from_delivery_status text;
begin
	select * into target_task
	from public.loading_tasks
	where id = p_loading_task_id;

	if target_task.id is null then
		raise exception 'loading_task_not_found' using errcode = '02000';
	end if;

	for assignment in
		select *
		from public.loading_task_drivers
		where loading_task_id = target_task.id
		  and driver_id is not null
		order by created_at
	loop
		existing_delivery := null;
		active_delivery := null;
		from_delivery_status := null;

		select * into existing_delivery
		from public.deliveries existing
		where existing.order_id = target_task.order_id
		  and existing.loading_task_id = target_task.id
		  and existing.driver_id = assignment.driver_id
		  and existing.truck_id is not distinct from assignment.truck_id
		  and existing.status in (
			'assigned',
			'accepted',
			'in_transit',
			'arrived',
			'completed'
		  )
		order by
			case existing.status
				when 'assigned' then 1
				when 'accepted' then 2
				when 'in_transit' then 3
				when 'arrived' then 4
				else 5
			end,
			existing.created_at
		limit 1
		for update;

		if existing_delivery.id is null then
			insert into public.deliveries (
				order_id,
				loading_task_id,
				driver_id,
				truck_id,
				status,
				started_at
			)
			values (
				target_task.order_id,
				target_task.id,
				assignment.driver_id,
				assignment.truck_id,
				'in_transit',
				now()
			)
			returning * into active_delivery;

			from_delivery_status := 'warehouse_signoff';

			perform public.log_activity(
				'delivery',
				active_delivery.id,
				'driver_assigned_delivery',
				jsonb_build_object(
					'employee_id', p_employee_id,
					'order_id', target_task.order_id,
					'loading_task_id', target_task.id,
					'driver_id', active_delivery.driver_id,
					'truck_id', active_delivery.truck_id,
					'source_action', p_source_action,
					'auto_started', true
				)
			);
		elsif existing_delivery.status in ('assigned', 'accepted') then
			from_delivery_status := existing_delivery.status::text;

			update public.deliveries
			set status = 'in_transit',
				started_at = coalesce(started_at, now())
			where id = existing_delivery.id
			returning * into active_delivery;
		else
			active_delivery := existing_delivery;
		end if;

		update public.drivers
		set status = 'on_delivery'
		where id = assignment.driver_id;

		if from_delivery_status is not null then
			started_delivery_count := started_delivery_count + 1;

			perform public.log_activity(
				'delivery',
				active_delivery.id,
				'driver_delivery_started',
				jsonb_build_object(
					'driver_id', active_delivery.driver_id,
					'employee_id', p_employee_id,
					'from_status', from_delivery_status,
					'to_status', 'in_transit',
					'order_status', 'out_for_delivery',
					'source_action', p_source_action
				)
			);
		end if;
	end loop;

	return started_delivery_count;
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
	started_delivery_count integer;
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
	set status = 'out_for_delivery'
	where id = updated.order_id;

	started_delivery_count := app_private.ensure_loading_task_active_deliveries(
		updated.id,
		employee_id,
		'warehouse_approve_loading'
	);

	perform app_private.ensure_delivery_secret_for_order(updated.order_id);

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
			'to_status', 'out_for_delivery',
			'proof', coalesce(p_proof, '{}'::jsonb),
			'started_delivery_count', started_delivery_count
		)
	);
	return updated;
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
	target_delivery public.deliveries%rowtype;
	target_order public.orders%rowtype;
begin
	v_driver_id := public.current_driver_id();
	if v_driver_id is null then
		raise exception 'driver_required' using errcode = '42501';
	end if;

	select d.* into target_delivery
	from public.deliveries d
	join public.orders o on o.id = d.order_id
	where d.id = p_delivery_id
	  and d.driver_id = v_driver_id
	for update of d, o;

	if target_delivery.id is null then
		raise exception 'delivery_not_found_or_invalid_transition' using errcode = '02000';
	end if;

	select * into target_order
	from public.orders
	where id = target_delivery.order_id;

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
	  and status in ('assigned', 'accepted')
	returning * into updated;

	if updated.id is null then
		raise exception 'delivery_not_found_or_invalid_transition' using errcode = '02000';
	end if;

	update public.orders
	set status = 'out_for_delivery'
	where id = updated.order_id
	  and status <> 'out_for_delivery';

	update public.drivers
	set status = 'on_delivery'
	where id = v_driver_id;

	perform app_private.ensure_delivery_secret_for_order(updated.order_id);

	perform public.log_activity(
		'delivery',
		updated.id,
		'driver_delivery_started',
		jsonb_build_object(
			'driver_id', v_driver_id,
			'from_status', target_delivery.status::text,
			'to_status', 'in_transit',
			'order_status', 'out_for_delivery'
		)
	);

	return updated;
end;
$$;
