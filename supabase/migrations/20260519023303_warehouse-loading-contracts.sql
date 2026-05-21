alter type public.audit_event_type add value if not exists 'warehouse_loading_driver_assigned';
alter type public.audit_event_type add value if not exists 'warehouse_loading_driver_removed';
alter type public.audit_event_type add value if not exists 'warehouse_loading_item_toggled';
alter type public.audit_event_type add value if not exists 'warehouse_loading_marked_ready';
alter type public.audit_event_type add value if not exists 'warehouse_loading_reset';

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
			'truck_id', truck.id
		)
	);

	return assignment;
end;
$$;

create or replace function public.warehouse_toggle_loading_item(
	p_order_id uuid,
	p_truck_id uuid,
	p_product_slug text
)
returns public.loading_tasks
language plpgsql
security definer
set search_path = public
as $$
declare
	task public.loading_tasks%rowtype;
	target_order public.orders%rowtype;
	already_here boolean;
begin
	perform public.require_panel('warehouse', true);
	perform app_private.allow_workflow_state_change();

	select * into target_order
	from public.orders
	where id = p_order_id
	for update;

	if target_order.id is null then
		raise exception 'order_not_found' using errcode = '02000';
	end if;

	if target_order.status <> 'warehouse_loading' then
		raise exception 'invalid_warehouse_item_toggle_transition_%', target_order.status using errcode = '23514';
	end if;

	select * into task
	from public.loading_tasks
	where order_id = p_order_id
	for update;

	if task.id is null or task.status not in ('loading', 'rejected') then
		raise exception 'loading_task_not_ready' using errcode = '23514';
	end if;

	if not exists (
		select 1
		from public.quote_request_items qi
		join public.products p on p.id = qi.product_id
		where qi.quote_request_id = target_order.quote_request_id
		  and p.slug = p_product_slug
	) then
		raise exception 'loading_item_not_on_order' using errcode = '23514';
	end if;

	if not exists (
		select 1
		from public.loading_task_drivers
		where loading_task_id = task.id
		  and truck_id = p_truck_id
	) then
		raise exception 'truck_not_assigned_to_loading_task' using errcode = '23514';
	end if;

	select exists (
		select 1
		from public.loading_task_drivers
		where loading_task_id = task.id
		  and truck_id = p_truck_id
		  and assigned_items ? p_product_slug
	) into already_here;

	update public.loading_task_drivers
	set assigned_items = coalesce(
		(
			select jsonb_agg(item)
			from jsonb_array_elements_text(loading_task_drivers.assigned_items) as item
			where item <> p_product_slug
		),
		'[]'::jsonb
	)
	where loading_task_id = task.id;

	if not already_here then
		update public.loading_task_drivers
		set assigned_items = assigned_items || jsonb_build_array(p_product_slug)
		where loading_task_id = task.id
		  and truck_id = p_truck_id;
	end if;

	update public.loading_tasks
	set status = 'loading',
		proof = proof - 'advisor_marked_ready',
		updated_at = now()
	where id = task.id
	returning * into task;

	perform public.log_activity(
		'loading_task',
		task.id,
		'warehouse_loading_item_toggled',
		jsonb_build_object(
			'order_id', p_order_id,
			'truck_id', p_truck_id,
			'product_slug', p_product_slug,
			'loaded', not already_here
		)
	);

	return task;
end;
$$;

create or replace function public.warehouse_mark_loading_ready(p_order_id uuid)
returns public.loading_tasks
language plpgsql
security definer
set search_path = public
as $$
declare
	task public.loading_tasks%rowtype;
	target_order public.orders%rowtype;
begin
	perform public.require_panel('warehouse', true);
	perform app_private.allow_workflow_state_change();

	select * into target_order
	from public.orders
	where id = p_order_id
	for update;

	if target_order.id is null then
		raise exception 'order_not_found' using errcode = '02000';
	end if;

	if target_order.status <> 'warehouse_loading' then
		raise exception 'invalid_warehouse_ready_transition_%', target_order.status using errcode = '23514';
	end if;

	select * into task
	from public.loading_tasks
	where order_id = p_order_id
	for update;

	if task.id is null or task.status not in ('loading', 'rejected') then
		raise exception 'loading_task_not_ready' using errcode = '23514';
	end if;

	if exists (
		select 1
		from public.loading_task_drivers ltd
		where ltd.loading_task_id = task.id
		  and jsonb_array_length(ltd.assigned_items) = 0
	) then
		raise exception 'assigned_truck_has_no_items' using errcode = '23514';
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
				where ltd.loading_task_id = task.id
				  and ltd.assigned_items ? p.slug
			)
		  )
	) then
		raise exception 'not_every_item_loaded' using errcode = '23514';
	end if;

	update public.loading_tasks
	set status = 'loading',
		proof = jsonb_set(coalesce(proof, '{}'::jsonb), '{advisor_marked_ready}', 'true'::jsonb, true),
		updated_at = now()
	where id = task.id
	returning * into task;

	perform public.log_activity(
		'loading_task',
		task.id,
		'warehouse_loading_marked_ready',
		jsonb_build_object('order_id', p_order_id)
	);

	return task;
end;
$$;

create or replace function public.warehouse_reset_loading(p_order_id uuid)
returns public.loading_tasks
language plpgsql
security definer
set search_path = public
as $$
declare
	task public.loading_tasks%rowtype;
begin
	perform public.require_panel('warehouse', true);
	perform app_private.allow_workflow_state_change();

	select * into task
	from public.loading_tasks
	where order_id = p_order_id
	for update;

	if task.id is null then
		raise exception 'loading_task_not_found' using errcode = '02000';
	end if;

	if task.status = 'approved' then
		raise exception 'loading_task_already_approved' using errcode = '23514';
	end if;

	update public.trucks
	set status = 'available'
	where id in (
		select truck_id
		from public.loading_task_drivers
		where loading_task_id = task.id
		  and truck_id is not null
	);

	delete from public.loading_task_drivers
	where loading_task_id = task.id;

	update public.loading_tasks
	set status = 'pending',
		proof = '{}'::jsonb,
		rejection_reason = null,
		updated_at = now()
	where id = task.id
	returning * into task;

	update public.orders
	set status = 'inventory_reserved'
	where id = p_order_id
	  and status = 'warehouse_loading';

	perform public.log_activity(
		'loading_task',
		task.id,
		'warehouse_loading_reset',
		jsonb_build_object('order_id', p_order_id)
	);

	return task;
end;
$$;

create or replace function public.warehouse_remove_loading_driver(
	p_order_id uuid,
	p_truck_id uuid
)
returns public.loading_tasks
language plpgsql
security definer
set search_path = public
as $$
declare
	task public.loading_tasks%rowtype;
	target_assignment public.loading_task_drivers%rowtype;
begin
	perform public.require_panel('warehouse', true);
	perform app_private.allow_workflow_state_change();

	select * into task
	from public.loading_tasks
	where order_id = p_order_id
	for update;

	if task.id is null then
		raise exception 'loading_task_not_found' using errcode = '02000';
	end if;

	if task.status = 'approved' then
		raise exception 'loading_task_already_approved' using errcode = '23514';
	end if;

	select * into target_assignment
	from public.loading_task_drivers
	where loading_task_id = task.id
	  and truck_id = p_truck_id
	for update;

	if target_assignment.id is null then
		raise exception 'truck_not_assigned_to_loading_task' using errcode = '02000';
	end if;

	if jsonb_array_length(target_assignment.assigned_items) > 0 then
		raise exception 'truck_still_has_items' using errcode = '23514';
	end if;

	delete from public.loading_task_drivers
	where id = target_assignment.id;

	update public.trucks
	set status = 'available'
	where id = p_truck_id;

	update public.loading_tasks
	set status = case
			when exists (
				select 1 from public.loading_task_drivers
				where loading_task_id = task.id
			) then 'loading'::public.loading_task_status
			else 'pending'::public.loading_task_status
		end,
		proof = proof - 'advisor_marked_ready',
		updated_at = now()
	where id = task.id
	returning * into task;

	if task.status = 'pending' then
		update public.orders
		set status = 'inventory_reserved'
		where id = p_order_id
		  and status = 'warehouse_loading';
	end if;

	perform public.log_activity(
		'loading_task',
		task.id,
		'warehouse_loading_driver_removed',
		jsonb_build_object('order_id', p_order_id, 'truck_id', p_truck_id)
	);

	return task;
end;
$$;

create or replace function public.warehouse_approve_loading(p_loading_task_id uuid, p_proof jsonb)
returns public.loading_tasks
language plpgsql
security definer
set search_path = public
as $$
declare
	updated public.loading_tasks%rowtype;
	target_order public.orders%rowtype;
begin
	perform public.require_panel('warehouse', true);
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
			'proof', coalesce(p_proof, '{}'::jsonb)
		)
	);
	return updated;
end;
$$;

create or replace function public.warehouse_reject_loading(p_loading_task_id uuid, p_reason text, p_proof jsonb)
returns public.loading_tasks
language plpgsql
security definer
set search_path = public
as $$
declare
	updated public.loading_tasks%rowtype;
begin
	perform public.require_panel('warehouse', true);
	perform public.require_rejection_proof(p_proof);
	perform app_private.allow_workflow_state_change();

	update public.loading_tasks
	set status = 'rejected',
		rejection_reason = p_reason,
		proof = (coalesce(p_proof, '{}'::jsonb) - 'advisor_marked_ready')
	where id = p_loading_task_id
	  and status in ('loading', 'rejected')
	returning * into updated;

	if updated.id is null then
		raise exception 'loading_task_not_found_or_invalid_transition' using errcode = '02000';
	end if;

	update public.orders
	set status = 'warehouse_loading'
	where id = updated.order_id
	  and status = 'warehouse_loading';

	perform public.log_activity(
		'loading_task',
		updated.id,
		'warehouse_loading_rejected',
		jsonb_build_object('to_status', 'warehouse_loading', 'reason', p_reason, 'proof', p_proof)
	);
	return updated;
end;
$$;

grant execute on function public.warehouse_assign_loading_driver(uuid, uuid) to authenticated;
grant execute on function public.warehouse_toggle_loading_item(uuid, uuid, text) to authenticated;
grant execute on function public.warehouse_mark_loading_ready(uuid) to authenticated;
grant execute on function public.warehouse_reset_loading(uuid) to authenticated;
grant execute on function public.warehouse_remove_loading_driver(uuid, uuid) to authenticated;

drop policy if exists internal_truck_access on public.trucks;
create policy internal_truck_access
	on public.trucks for all
	to authenticated
	using (
		public.can_access_panel('warehouse')
		or public.can_access_panel('dispatch')
		or public.can_access_panel('admin')
		or public.is_employee_with_role('ceo')
	)
	with check (
		public.can_access_panel('warehouse', true)
		or public.can_access_panel('dispatch', true)
		or public.can_access_panel('admin', true)
	);

drop policy if exists internal_loading_task_access on public.loading_tasks;
create policy internal_loading_task_access
	on public.loading_tasks for all
	to authenticated
	using (
		public.can_access_panel('inventory')
		or public.can_access_panel('warehouse')
		or public.can_access_panel('dispatch')
		or public.is_employee_with_role('ceo')
	)
	with check (
		public.can_access_panel('warehouse', true)
		or public.can_access_panel('dispatch', true)
	);

drop policy if exists internal_loading_task_driver_access on public.loading_task_drivers;
create policy internal_loading_task_driver_access
	on public.loading_task_drivers for all
	to authenticated
	using (
		public.can_access_panel('warehouse')
		or public.can_access_panel('dispatch')
		or public.is_employee_with_role('ceo')
	)
	with check (
		public.can_access_panel('warehouse', true)
		or public.can_access_panel('dispatch', true)
	);

drop policy if exists internal_driver_online_state_access on public.driver_online_states;
create policy internal_driver_online_state_access
	on public.driver_online_states for select
	to authenticated
	using (
		public.can_access_panel('warehouse')
		or public.can_access_panel('dispatch')
		or public.can_access_panel('admin')
		or public.is_employee_with_role('ceo')
		or driver_id = public.current_driver_id()
	);
