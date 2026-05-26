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

revoke all on function app_private.workflow_state_change_is_authorized() from public;

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
	release_driver_ids uuid[] := '{}'::uuid[];
	release_truck_ids uuid[] := '{}'::uuid[];
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

	select coalesce(array_agg(distinct release_candidate.driver_id) filter (where release_candidate.driver_id is not null), '{}'::uuid[])
	into release_driver_ids
	from (
		select driver_id
		from public.loading_task_drivers
		where loading_task_id = task.id
		union
		select driver_id
		from public.deliveries
		where order_id = p_order_id
		  and loading_task_id = task.id
	) as release_candidate(driver_id);

	select coalesce(array_agg(distinct release_candidate.truck_id) filter (where release_candidate.truck_id is not null), '{}'::uuid[])
	into release_truck_ids
	from (
		select truck_id
		from public.loading_task_drivers
		where loading_task_id = task.id
		union
		select truck_id
		from public.deliveries
		where order_id = p_order_id
		  and loading_task_id = task.id
	) as release_candidate(truck_id);

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
	where id = any(release_driver_ids)
	  and status <> 'disabled';

	update public.trucks
	set status = 'available'
	where id = any(release_truck_ids)
	  and status <> 'maintenance';

	perform public.log_activity(
		'order',
		p_order_id,
		'delivery_returned_to_warehouse_loading',
		jsonb_build_object(
			'delivery_id', first_delivery.id,
			'loading_task_id', task.id,
			'released_driver_ids', to_jsonb(release_driver_ids),
			'released_truck_ids', to_jsonb(release_truck_ids),
			'to_status', 'warehouse_loading',
			'reason', reason_text
		)
	);

	return first_delivery;
end;
$$;

revoke all on function public.dispatch_return_loaded_order(uuid, text, jsonb) from public;
revoke execute on function public.dispatch_return_loaded_order(uuid, text, jsonb) from anon, authenticated;
grant execute on function public.dispatch_return_loaded_order(uuid, text, jsonb) to service_role;

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
begin
	raise exception 'driver_contact_dispatch_required' using errcode = '42501';
end;
$$;

create or replace function public.service_driver_reject_delivery(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_delivery_id uuid,
	p_reason text,
	p_proof jsonb
)
returns public.deliveries
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	raise exception 'driver_contact_dispatch_required' using errcode = '42501';
end;
$$;

revoke all on function public.driver_reject_delivery(uuid, text, jsonb) from public;
revoke execute on function public.driver_reject_delivery(uuid, text, jsonb) from anon, authenticated, service_role;
revoke all on function public.service_driver_reject_delivery(uuid, text, uuid, text, jsonb) from public;
revoke execute on function public.service_driver_reject_delivery(uuid, text, uuid, text, jsonb) from anon, authenticated, service_role;
