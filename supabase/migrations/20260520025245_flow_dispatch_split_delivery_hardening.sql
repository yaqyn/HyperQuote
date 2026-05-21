create or replace function app_private.finalize_delivered_order_if_ready(
	p_order_id uuid,
	p_proof jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
	target_order public.orders%rowtype;
	open_delivery_count integer;
	completed_delivery_count integer;
begin
	select * into target_order
	from public.orders
	where id = p_order_id
	for update;

	if target_order.id is null then
		raise exception 'order_not_found' using errcode = '02000';
	end if;

	if target_order.status = 'delivered' then
		return true;
	end if;

	select count(*) into open_delivery_count
	from public.deliveries
	where order_id = p_order_id
	  and status in ('assigned', 'accepted', 'in_transit', 'arrived');

	if open_delivery_count > 0 then
		return false;
	end if;

	select count(*) into completed_delivery_count
	from public.deliveries
	where order_id = p_order_id
	  and status = 'completed';

	if completed_delivery_count = 0 then
		return false;
	end if;

	perform app_private.consume_order_reservations(p_order_id);

	update public.orders
	set status = 'delivered',
		delivered_at = coalesce(delivered_at, now())
	where id = p_order_id;

	return true;
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
	updated_delivery public.deliveries%rowtype;
	first_delivery public.deliveries%rowtype;
	finalized boolean;
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

	if target_order.status not in ('dispatch_ready', 'dispatch_assigned', 'out_for_delivery') then
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

	if not exists (
		select 1
		from public.loading_task_drivers
		where loading_task_id = task.id
		  and driver_id is not null
	) then
		raise exception 'loaded_driver_required' using errcode = '23514';
	end if;

	for assignment in
		select *
		from public.loading_task_drivers
		where loading_task_id = task.id
		order by created_at
	loop
		insert into public.deliveries (
			order_id,
			loading_task_id,
			driver_id,
			truck_id,
			status
		)
		select p_order_id, task.id, assignment.driver_id, assignment.truck_id, 'assigned'
		where not exists (
			select 1
			from public.deliveries existing
			where existing.order_id = p_order_id
			  and existing.loading_task_id = task.id
			  and existing.driver_id = assignment.driver_id
			  and existing.truck_id is not distinct from assignment.truck_id
			  and existing.status in ('assigned', 'accepted', 'in_transit', 'arrived', 'completed')
		)
		on conflict do nothing;
	end loop;

	for updated_delivery in
		update public.deliveries
		set status = 'completed',
			completed_at = now()
		where order_id = p_order_id
		  and loading_task_id = task.id
		  and status in ('assigned', 'accepted', 'in_transit', 'arrived')
		returning *
	loop
		if first_delivery.id is null then
			first_delivery := updated_delivery;
		end if;

		perform public.log_activity(
			'delivery',
			updated_delivery.id,
			'dispatch_delivery_completed',
			jsonb_build_object(
				'employee_id', employee_id,
				'order_id', p_order_id,
				'loading_task_id', task.id,
				'driver_id', updated_delivery.driver_id,
				'truck_id', updated_delivery.truck_id,
				'proof', p_proof
			)
		);
	end loop;

	if first_delivery.id is null then
		select * into first_delivery
		from public.deliveries
		where order_id = p_order_id
		  and loading_task_id = task.id
		  and status = 'completed'
		order by completed_at desc nulls last, updated_at desc
		limit 1;
	end if;

	if first_delivery.id is null then
		raise exception 'active_delivery_required' using errcode = '23514';
	end if;

	update public.drivers
	set status = 'available'
	where id in (
		select driver_id
		from public.loading_task_drivers
		where loading_task_id = task.id
	);

	update public.trucks
	set status = 'available'
	where id in (
		select truck_id
		from public.loading_task_drivers
		where loading_task_id = task.id
		  and truck_id is not null
	);

	finalized := app_private.finalize_delivered_order_if_ready(p_order_id, p_proof);
	if not finalized then
		raise exception 'dispatch_completion_did_not_finalize_order' using errcode = '23514';
	end if;

	return first_delivery;
end;
$$;

create or replace function public.dispatch_complete_delivery(p_delivery_id uuid, p_proof jsonb)
returns public.deliveries
language plpgsql
security definer
set search_path = public
as $$
declare
	employee_id uuid;
	updated public.deliveries%rowtype;
	finalized boolean;
begin
	employee_id := public.require_panel('dispatch', true);
	perform public.require_rejection_proof(p_proof);
	perform app_private.allow_workflow_state_change();

	update public.deliveries
	set status = 'completed',
		completed_at = now()
	where id = p_delivery_id
	  and status in ('assigned', 'accepted', 'in_transit', 'arrived')
	returning * into updated;

	if updated.id is null then
		raise exception 'delivery_not_found_or_invalid_transition' using errcode = '02000';
	end if;

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
		jsonb_build_object(
			'employee_id', employee_id,
			'order_id', updated.order_id,
			'loading_task_id', updated.loading_task_id,
			'driver_id', updated.driver_id,
			'truck_id', updated.truck_id,
			'proof', coalesce(p_proof, '{}'::jsonb)
		)
	);

	finalized := app_private.finalize_delivered_order_if_ready(updated.order_id, p_proof);
	return updated;
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
	finalized boolean;
begin
	v_driver_id := public.current_driver_id();
	if v_driver_id is null then
		raise exception 'driver_required' using errcode = '42501';
	end if;
	perform public.require_delivery_signature(p_signature_path, p_signer_name);
	perform app_private.allow_workflow_state_change();

	update public.deliveries
	set status = 'completed',
		completed_at = now()
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
		jsonb_build_object('driver_id', v_driver_id, 'to_status', 'completed')
	);

	finalized := app_private.finalize_delivered_order_if_ready(
		updated.order_id,
		jsonb_build_object(
			'driver_id', v_driver_id,
			'delivery_id', updated.id,
			'signature_path', p_signature_path,
			'signer_name', p_signer_name
		)
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
	updated_delivery public.deliveries%rowtype;
	first_delivery public.deliveries%rowtype;
	reason_text text;
begin
	employee_id := public.require_panel('dispatch', true);
	reason_text := nullif(trim(coalesce(p_reason, '')), '');
	if reason_text is null or length(reason_text) < 3 then
		raise exception 'dispatch_return_reason_required' using errcode = '23514';
	end if;
	perform public.require_rejection_proof(p_proof);
	perform app_private.allow_workflow_state_change();

	select * into target_order
	from public.orders
	where id = p_order_id
	for update;

	if target_order.id is null then
		raise exception 'order_not_found' using errcode = '02000';
	end if;

	if target_order.status not in ('dispatch_ready', 'dispatch_assigned', 'out_for_delivery') then
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

	if exists (
		select 1
		from public.deliveries
		where order_id = p_order_id
		  and loading_task_id = task.id
		  and status = 'completed'
	) then
		raise exception 'cannot_return_partially_completed_order' using errcode = '23514';
	end if;

	if not exists (
		select 1
		from public.loading_task_drivers
		where loading_task_id = task.id
		  and driver_id is not null
	) then
		raise exception 'loaded_driver_required' using errcode = '23514';
	end if;

	for assignment in
		select *
		from public.loading_task_drivers
		where loading_task_id = task.id
		order by created_at
	loop
		insert into public.deliveries (
			order_id,
			loading_task_id,
			driver_id,
			truck_id,
			status
		)
		select p_order_id, task.id, assignment.driver_id, assignment.truck_id, 'assigned'
		where not exists (
			select 1
			from public.deliveries existing
			where existing.order_id = p_order_id
			  and existing.loading_task_id = task.id
			  and existing.driver_id = assignment.driver_id
			  and existing.truck_id is not distinct from assignment.truck_id
			  and existing.status in ('assigned', 'accepted', 'in_transit', 'arrived', 'rejected', 'completed')
		)
		on conflict do nothing;
	end loop;

	for updated_delivery in
		update public.deliveries
		set status = 'rejected',
			rejection_reason = reason_text,
			rejection_proof = p_proof
		where order_id = p_order_id
		  and loading_task_id = task.id
		  and status in ('assigned', 'accepted', 'in_transit', 'arrived')
		returning *
	loop
		if first_delivery.id is null then
			first_delivery := updated_delivery;
		end if;

		perform public.log_activity(
			'delivery',
			updated_delivery.id,
			'dispatch_delivery_rejected',
			jsonb_build_object(
				'employee_id', employee_id,
				'order_id', p_order_id,
				'loading_task_id', task.id,
				'driver_id', updated_delivery.driver_id,
				'truck_id', updated_delivery.truck_id,
				'to_status', 'rejected',
				'reason', reason_text,
				'proof', p_proof
			)
		);
	end loop;

	if first_delivery.id is null then
		raise exception 'active_delivery_required' using errcode = '23514';
	end if;

	update public.orders
	set status = 'warehouse_loading'
	where id = p_order_id;

	update public.loading_tasks
	set status = 'rejected',
		rejection_reason = reason_text,
		proof = p_proof
	where id = task.id;

	update public.drivers
	set status = 'available'
	where id in (
		select driver_id
		from public.loading_task_drivers
		where loading_task_id = task.id
	);

	update public.trucks
	set status = 'available'
	where id in (
		select truck_id
		from public.loading_task_drivers
		where loading_task_id = task.id
		  and truck_id is not null
	);

	perform public.log_activity(
		'order',
		p_order_id,
		'delivery_returned_to_warehouse_loading',
		jsonb_build_object(
			'delivery_id', first_delivery.id,
			'loading_task_id', task.id,
			'to_status', 'warehouse_loading',
			'reason', reason_text
		)
	);

	return first_delivery;
end;
$$;

create or replace function public.driver_reject_delivery(
	p_delivery_id uuid,
	p_reason text,
	p_proof jsonb
)
returns public.deliveries
language plpgsql
security definer
set search_path = public
as $$
declare
	v_driver_id uuid;
	target_delivery public.deliveries%rowtype;
	updated_delivery public.deliveries%rowtype;
	reason_text text;
begin
	v_driver_id := public.current_driver_id();
	if v_driver_id is null then
		raise exception 'driver_required' using errcode = '42501';
	end if;
	reason_text := nullif(trim(coalesce(p_reason, '')), '');
	if reason_text is null or length(reason_text) < 3 then
		raise exception 'driver_rejection_reason_required' using errcode = '23514';
	end if;
	perform public.require_rejection_proof(p_proof);
	perform app_private.allow_workflow_state_change();

	select * into target_delivery
	from public.deliveries
	where id = p_delivery_id
	  and driver_id = v_driver_id
	  and status in ('assigned', 'accepted', 'in_transit', 'arrived')
	for update;

	if target_delivery.id is null then
		raise exception 'delivery_not_found_or_invalid_transition' using errcode = '02000';
	end if;

	for updated_delivery in
		update public.deliveries
		set status = 'rejected',
			rejection_reason = reason_text,
			rejection_proof = p_proof
		where order_id = target_delivery.order_id
		  and loading_task_id = target_delivery.loading_task_id
		  and status in ('assigned', 'accepted', 'in_transit', 'arrived')
		returning *
	loop
		if updated_delivery.id = target_delivery.id then
			target_delivery := updated_delivery;
		end if;

		perform public.log_activity(
			'delivery',
			updated_delivery.id,
			'driver_delivery_rejected',
			jsonb_build_object(
				'driver_id', v_driver_id,
				'rejected_delivery_id', target_delivery.id,
				'to_status', 'rejected',
				'reason', reason_text,
				'proof', p_proof
			)
		);
	end loop;

	update public.orders
	set status = 'warehouse_loading'
	where id = target_delivery.order_id;

	update public.loading_tasks
	set status = 'rejected',
		rejection_reason = reason_text,
		proof = p_proof
	where id = target_delivery.loading_task_id;

	update public.drivers
	set status = 'available'
	where id in (
		select driver_id
		from public.deliveries
		where order_id = target_delivery.order_id
		  and loading_task_id = target_delivery.loading_task_id
		  and status = 'rejected'
	);

	update public.trucks
	set status = 'available'
	where id in (
		select truck_id
		from public.deliveries
		where order_id = target_delivery.order_id
		  and loading_task_id = target_delivery.loading_task_id
		  and status = 'rejected'
		  and truck_id is not null
	);

	perform public.log_activity(
		'delivery',
		target_delivery.id,
		'driver_rejection_proof_uploaded',
		jsonb_build_object('driver_id', v_driver_id, 'reason', reason_text, 'proof', p_proof)
	);

	perform public.log_activity(
		'order',
		target_delivery.order_id,
		'delivery_returned_to_warehouse_loading',
		jsonb_build_object('delivery_id', target_delivery.id, 'to_status', 'warehouse_loading')
	);

	return target_delivery;
end;
$$;

grant execute on function public.dispatch_complete_loaded_order(uuid, jsonb) to authenticated;
grant execute on function public.dispatch_complete_delivery(uuid, jsonb) to authenticated;
grant execute on function public.dispatch_return_loaded_order(uuid, text, jsonb) to authenticated;
grant execute on function public.driver_start_delivery(uuid) to authenticated;
grant execute on function public.driver_confirm_delivery(uuid, text, text, numeric, numeric) to authenticated;
grant execute on function public.driver_reject_delivery(uuid, text, jsonb) to authenticated;
