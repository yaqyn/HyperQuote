drop policy if exists employees_dispatch_advisor_directory_select on public.employees;
drop policy if exists employee_roles_dispatch_advisor_directory_select on public.employee_roles;

drop policy if exists employee_roles_internal_select on public.employee_roles;
create policy employee_roles_internal_select
	on public.employee_roles for select
	to authenticated
	using (
		public.can_access_panel('admin')
		or public.is_employee_with_role('ceo')
		or (
			public.can_access_panel('warehouse')
			and role in ('admin', 'warehouse')
		)
		or (
			public.can_access_panel('dispatch')
			and role in ('admin', 'ceo', 'dispatch', 'warehouse')
		)
	);

drop policy if exists employees_internal_select on public.employees;
create policy employees_internal_select
	on public.employees for select
	to authenticated
	using (
		user_id = (select auth.uid())
		or public.can_access_panel('admin')
		or public.is_employee_with_role('ceo')
		or (
			public.can_access_panel('warehouse')
			and status = 'active'
			and (
				is_ceo
				or exists (
					select 1
					from public.employee_roles er
					where er.employee_id = employees.id
					  and er.role in ('admin', 'warehouse')
				)
			)
		)
		or (
			public.can_access_panel('dispatch')
			and status = 'active'
			and (
				is_ceo
				or exists (
					select 1
					from public.employee_roles er
					where er.employee_id = employees.id
					  and er.role in ('admin', 'ceo', 'dispatch', 'warehouse')
				)
			)
		)
	);

create or replace function app_private.finalize_delivered_order_if_ready(
	p_order_id uuid
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

	finalized := app_private.finalize_delivered_order_if_ready(p_order_id);
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

	perform app_private.finalize_delivered_order_if_ready(updated.order_id);
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

	perform app_private.finalize_delivered_order_if_ready(updated.order_id);
	return updated;
end;
$$;

drop function if exists app_private.finalize_delivered_order_if_ready(uuid, jsonb);
