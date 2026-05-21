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
	created_delivery public.deliveries%rowtype;
	created_count integer := 0;
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
		created_delivery := null;

		insert into public.deliveries (
			order_id,
			loading_task_id,
			driver_id,
			truck_id,
			status
		)
		select
			target_task.order_id,
			target_task.id,
			assignment.driver_id,
			assignment.truck_id,
			'assigned'
		where not exists (
			select 1
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
		)
		returning * into created_delivery;

		if created_delivery.id is not null then
			created_count := created_count + 1;
			perform public.log_activity(
				'delivery',
				created_delivery.id,
				'driver_assigned_delivery',
				jsonb_build_object(
					'employee_id', p_employee_id,
					'order_id', target_task.order_id,
					'loading_task_id', target_task.id,
					'driver_id', created_delivery.driver_id,
					'truck_id', created_delivery.truck_id,
					'source_action', p_source_action
				)
			);
		end if;
	end loop;

	return created_count;
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

with repaired_tasks as (
	select lt.id
	from public.loading_tasks lt
	join public.orders o on o.id = lt.order_id
	where lt.status = 'approved'
	  and o.status in ('dispatch_ready', 'dispatch_assigned', 'out_for_delivery')
	  and exists (
		select 1
		from public.loading_task_drivers ltd
		where ltd.loading_task_id = lt.id
		  and ltd.driver_id is not null
	  )
	  and not exists (
		select 1
		from public.deliveries existing
		where existing.loading_task_id = lt.id
		  and existing.status in (
			'assigned',
			'accepted',
			'in_transit',
			'arrived',
			'completed'
		  )
	  )
	  and exists (
		select 1
		from public.deliveries rejected
		where rejected.loading_task_id = lt.id
		  and rejected.status = 'rejected'
	  )
)
select app_private.ensure_loading_task_active_deliveries(
	id,
	null,
	'migration_repair_reassign_after_rejection'
)
from repaired_tasks;
