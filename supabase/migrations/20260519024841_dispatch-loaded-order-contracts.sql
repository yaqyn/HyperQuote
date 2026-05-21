create or replace function app_private.consume_order_reservations(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
	line record;
begin
	for line in
		select product_id, sum(quantity) as quantity
		from public.inventory_reservations
		where order_id = p_order_id
		  and status = 'reserved'
		group by product_id
	loop
		update public.inventory_stock
		set reserved_quantity = reserved_quantity - line.quantity,
			on_hand_quantity = on_hand_quantity - line.quantity
		where product_id = line.product_id
		  and reserved_quantity >= line.quantity
		  and on_hand_quantity >= line.quantity;

		if not found then
			raise exception 'reserved_stock_consume_failed_for_product_%', line.product_id using errcode = '23514';
		end if;
	end loop;

	update public.inventory_reservations
	set status = 'consumed'
	where order_id = p_order_id
	  and status = 'reserved';
end;
$$;

create or replace function public.dispatch_complete_loaded_order(
	p_order_id uuid,
	p_proof jsonb
)
returns public.deliveries
language plpgsql
security definer
set search_path = public
as $$
declare
	employee_id uuid;
	target_order public.orders%rowtype;
	task public.loading_tasks%rowtype;
	assignment public.loading_task_drivers%rowtype;
	delivery public.deliveries%rowtype;
begin
	employee_id := public.require_panel('dispatch', true);
	perform public.require_rejection_proof(p_proof);
	perform app_private.allow_workflow_state_change();

	select * into target_order
	from public.orders
	where id = p_order_id
	for update;

	if target_order.id is null then
		raise exception 'order_not_found' using errcode = '02000';
	end if;

	if target_order.status <> 'dispatch_ready' then
		raise exception 'invalid_dispatch_complete_transition_%', target_order.status using errcode = '23514';
	end if;

	select * into task
	from public.loading_tasks
	where order_id = p_order_id
	  and status = 'approved'
	for update;

	if task.id is null then
		raise exception 'approved_loading_task_required' using errcode = '23514';
	end if;

	select * into assignment
	from public.loading_task_drivers
	where loading_task_id = task.id
	order by created_at
	limit 1;

	if assignment.id is null then
		raise exception 'loaded_driver_required' using errcode = '23514';
	end if;

	insert into public.deliveries (
		order_id,
		loading_task_id,
		driver_id,
		truck_id,
		status,
		completed_at
	)
	values (
		p_order_id,
		task.id,
		assignment.driver_id,
		assignment.truck_id,
		'completed',
		now()
	)
	returning * into delivery;

	perform app_private.consume_order_reservations(p_order_id);

	update public.orders
	set status = 'delivered',
		delivered_at = now()
	where id = p_order_id;

	update public.drivers
	set status = 'available'
	where id = assignment.driver_id;

	update public.trucks
	set status = 'available'
	where id = assignment.truck_id;

	perform public.log_activity(
		'delivery',
		delivery.id,
		'dispatch_delivery_completed',
		jsonb_build_object(
			'employee_id', employee_id,
			'order_id', p_order_id,
			'loading_task_id', task.id,
			'proof', p_proof
		)
	);

	return delivery;
end;
$$;

create or replace function public.dispatch_complete_delivery(p_delivery_id uuid, p_proof jsonb)
returns public.deliveries
language plpgsql
security definer
set search_path = public
as $$
declare
	updated public.deliveries%rowtype;
begin
	perform public.require_panel('dispatch', true);
	perform public.require_rejection_proof(p_proof);
	perform app_private.allow_workflow_state_change();

	update public.deliveries
	set status = 'completed', completed_at = now()
	where id = p_delivery_id
	  and status in ('assigned', 'accepted', 'in_transit', 'arrived')
	returning * into updated;

	if updated.id is null then
		raise exception 'delivery_not_found_or_invalid_transition' using errcode = '02000';
	end if;

	perform app_private.consume_order_reservations(updated.order_id);

	update public.orders
	set status = 'delivered', delivered_at = now()
	where id = updated.order_id;

	update public.drivers
	set status = 'available'
	where id = updated.driver_id;

	update public.trucks
	set status = 'available'
	where id = updated.truck_id;

	perform public.log_activity(
		'delivery',
		updated.id,
		'dispatch_delivery_completed',
		jsonb_build_object('to_status', 'delivered', 'proof', coalesce(p_proof, '{}'::jsonb))
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
	  and status in ('arrived', 'in_transit', 'accepted')
	returning * into updated;

	if updated.id is null then
		raise exception 'delivery_not_found_or_invalid_transition' using errcode = '02000';
	end if;

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
		'driver_delivery_confirmed',
		jsonb_build_object('driver_id', v_driver_id, 'to_status', 'delivered')
	);
	return updated;
end;
$$;

create or replace function public.dispatch_return_loaded_order(
	p_order_id uuid,
	p_reason text,
	p_proof jsonb
)
returns public.deliveries
language plpgsql
security definer
set search_path = public
as $$
declare
	employee_id uuid;
	target_order public.orders%rowtype;
	task public.loading_tasks%rowtype;
	assignment public.loading_task_drivers%rowtype;
	delivery public.deliveries%rowtype;
begin
	employee_id := public.require_panel('dispatch', true);
	perform public.require_rejection_proof(p_proof);
	perform app_private.allow_workflow_state_change();

	select * into target_order
	from public.orders
	where id = p_order_id
	for update;

	if target_order.id is null then
		raise exception 'order_not_found' using errcode = '02000';
	end if;

	if target_order.status <> 'dispatch_ready' then
		raise exception 'invalid_dispatch_return_transition_%', target_order.status using errcode = '23514';
	end if;

	select * into task
	from public.loading_tasks
	where order_id = p_order_id
	  and status = 'approved'
	for update;

	if task.id is null then
		raise exception 'approved_loading_task_required' using errcode = '23514';
	end if;

	select * into assignment
	from public.loading_task_drivers
	where loading_task_id = task.id
	order by created_at
	limit 1;

	if assignment.id is null then
		raise exception 'loaded_driver_required' using errcode = '23514';
	end if;

	insert into public.deliveries (
		order_id,
		loading_task_id,
		driver_id,
		truck_id,
		status,
		rejection_reason,
		rejection_proof
	)
	values (
		p_order_id,
		task.id,
		assignment.driver_id,
		assignment.truck_id,
		'rejected',
		p_reason,
		p_proof
	)
	returning * into delivery;

	update public.orders
	set status = 'warehouse_loading'
	where id = p_order_id;

	update public.loading_tasks
	set status = 'rejected',
		rejection_reason = p_reason,
		proof = p_proof
	where id = task.id;

	update public.drivers
	set status = 'available'
	where id = assignment.driver_id;

	update public.trucks
	set status = 'available'
	where id = assignment.truck_id;

	perform public.log_activity(
		'delivery',
		delivery.id,
		'dispatch_delivery_rejected',
		jsonb_build_object(
			'employee_id', employee_id,
			'order_id', p_order_id,
			'loading_task_id', task.id,
			'to_status', 'rejected',
			'reason', p_reason,
			'proof', p_proof
		)
	);
	perform public.log_activity(
		'order',
		p_order_id,
		'delivery_returned_to_warehouse_loading',
		jsonb_build_object('delivery_id', delivery.id, 'to_status', 'warehouse_loading')
	);

	return delivery;
end;
$$;

grant execute on function public.dispatch_complete_loaded_order(uuid, jsonb) to authenticated;
grant execute on function public.dispatch_return_loaded_order(uuid, text, jsonb) to authenticated;
