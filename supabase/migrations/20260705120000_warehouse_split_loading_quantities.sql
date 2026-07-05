create or replace function app_private.loading_item_slug(p_item jsonb)
returns text
language sql
immutable
set search_path = public, app_private
as $$
	select case jsonb_typeof(p_item)
		when 'string' then p_item #>> '{}'
		when 'object' then p_item->>'productSlug'
		else null
	end;
$$;

create or replace function app_private.loading_item_quantity(
	p_item jsonb,
	p_order_quantity numeric
)
returns numeric
language sql
immutable
set search_path = public, app_private
as $$
	select case
		when jsonb_typeof(p_item) = 'string' then p_order_quantity
		when jsonb_typeof(p_item) = 'object'
			and jsonb_typeof(p_item->'quantity') = 'number'
			then greatest(0, (p_item->>'quantity')::numeric)
		else 0
	end;
$$;

create or replace function app_private.loading_product_total_quantity(
	p_loading_task_id uuid,
	p_product_slug text,
	p_order_quantity numeric
)
returns numeric
language sql
stable
set search_path = public, app_private
as $$
	select coalesce(sum(app_private.loading_item_quantity(item, p_order_quantity)), 0)
	from public.loading_task_drivers ltd
	cross join lateral jsonb_array_elements(coalesce(ltd.assigned_items, '[]'::jsonb)) as entries(item)
	where ltd.loading_task_id = p_loading_task_id
	  and app_private.loading_item_slug(item) = p_product_slug;
$$;

create or replace function app_private.loading_assignment_has_quantity(
	p_assigned_items jsonb
)
returns boolean
language sql
immutable
set search_path = public, app_private
as $$
	select exists (
		select 1
		from jsonb_array_elements(coalesce(p_assigned_items, '[]'::jsonb)) as entries(item)
		where case jsonb_typeof(item)
			when 'string' then true
			when 'object' then jsonb_typeof(item->'quantity') = 'number'
				and (item->>'quantity')::numeric > 0
			else false
		end
	);
$$;

create or replace function public.warehouse_set_loading_item_quantity(
	p_order_id uuid,
	p_truck_id uuid,
	p_product_slug text,
	p_quantity numeric,
	p_exclusive boolean default false
)
returns public.loading_tasks
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
	task public.loading_tasks%rowtype;
	target_order public.orders%rowtype;
	order_quantity numeric;
	total_quantity numeric;
	clean_quantity numeric;
begin
	perform public.require_panel('warehouse', true);
	perform app_private.allow_workflow_state_change();

	clean_quantity := greatest(0, coalesce(p_quantity, 0));

	select * into target_order
	from public.orders
	where id = p_order_id
	for update;

	if target_order.id is null then
		raise exception 'order_not_found' using errcode = '02000';
	end if;

	if target_order.status <> 'warehouse_loading' then
		raise exception 'invalid_warehouse_item_quantity_transition_%', target_order.status using errcode = '23514';
	end if;

	select * into task
	from public.loading_tasks
	where order_id = p_order_id
	for update;

	if task.id is null or task.status not in ('loading', 'rejected') then
		raise exception 'loading_task_not_ready' using errcode = '23514';
	end if;

	select qi.quantity into order_quantity
	from public.quote_request_items qi
	join public.products p on p.id = qi.product_id
	where qi.quote_request_id = target_order.quote_request_id
	  and p.slug = p_product_slug;

	if order_quantity is null then
		raise exception 'loading_item_not_on_order' using errcode = '23514';
	end if;

	if clean_quantity > order_quantity then
		raise exception 'loaded_quantity_exceeds_order_line' using errcode = '23514';
	end if;

	if not exists (
		select 1
		from public.loading_task_drivers
		where loading_task_id = task.id
		  and truck_id = p_truck_id
	) then
		raise exception 'truck_not_assigned_to_loading_task' using errcode = '23514';
	end if;

	update public.loading_task_drivers ltd
	set assigned_items = coalesce(
		(
			select jsonb_agg(item)
			from jsonb_array_elements(coalesce(ltd.assigned_items, '[]'::jsonb)) as entries(item)
			where app_private.loading_item_slug(item) is distinct from p_product_slug
		),
		'[]'::jsonb
	)
	where ltd.loading_task_id = task.id
	  and (p_exclusive or ltd.truck_id = p_truck_id);

	if clean_quantity > 0 then
		update public.loading_task_drivers
		set assigned_items = assigned_items || jsonb_build_array(
			jsonb_build_object(
				'productSlug', p_product_slug,
				'quantity', clean_quantity
			)
		)
		where loading_task_id = task.id
		  and truck_id = p_truck_id;
	end if;

	select app_private.loading_product_total_quantity(
		task.id,
		p_product_slug,
		order_quantity
	) into total_quantity;

	if total_quantity > order_quantity then
		raise exception 'loaded_quantity_exceeds_order_line' using errcode = '23514';
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
			'quantity', clean_quantity,
			'exclusive', p_exclusive,
			'loaded', clean_quantity > 0
		)
	);

	return task;
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
	order_quantity numeric;
	already_here boolean;
begin
	select * into target_order
	from public.orders
	where id = p_order_id;

	if target_order.id is null then
		raise exception 'order_not_found' using errcode = '02000';
	end if;

	select * into task
	from public.loading_tasks
	where order_id = p_order_id;

	if task.id is null then
		raise exception 'loading_task_not_ready' using errcode = '23514';
	end if;

	select qi.quantity into order_quantity
	from public.quote_request_items qi
	join public.products p on p.id = qi.product_id
	where qi.quote_request_id = target_order.quote_request_id
	  and p.slug = p_product_slug;

	select exists (
		select 1
		from public.loading_task_drivers ltd
		cross join lateral jsonb_array_elements(coalesce(ltd.assigned_items, '[]'::jsonb)) as entries(item)
		where ltd.loading_task_id = task.id
		  and ltd.truck_id = p_truck_id
		  and app_private.loading_item_slug(item) = p_product_slug
		  and app_private.loading_item_quantity(item, order_quantity) > 0
	) into already_here;

	return public.warehouse_set_loading_item_quantity(
		p_order_id,
		p_truck_id,
		p_product_slug,
		case when already_here then 0 else order_quantity end,
		true
	);
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
		  and not app_private.loading_assignment_has_quantity(ltd.assigned_items)
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
			or app_private.loading_product_total_quantity(
				task.id,
				p.slug,
				qi.quantity
			) <> qi.quantity
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

create or replace function public.warehouse_approve_loading(
	p_loading_task_id uuid,
	p_proof jsonb
)
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
			or app_private.loading_product_total_quantity(
				p_loading_task_id,
				p.slug,
				qi.quantity
			) <> qi.quantity
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

create or replace function public.service_warehouse_set_loading_item_quantity(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_order_id uuid,
	p_truck_id uuid,
	p_product_slug text,
	p_quantity numeric,
	p_exclusive boolean default false
)
returns public.loading_tasks
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	return public.warehouse_set_loading_item_quantity(
		p_order_id,
		p_truck_id,
		p_product_slug,
		p_quantity,
		p_exclusive
	);
end;
$$;

revoke all on function public.warehouse_set_loading_item_quantity(uuid, uuid, text, numeric, boolean)
	from public, anon, authenticated;
grant execute on function public.warehouse_set_loading_item_quantity(uuid, uuid, text, numeric, boolean)
	to service_role;

revoke all on function public.service_warehouse_set_loading_item_quantity(uuid, text, uuid, uuid, text, numeric, boolean)
	from public, anon, authenticated;
grant execute on function public.service_warehouse_set_loading_item_quantity(uuid, text, uuid, uuid, text, numeric, boolean)
	to service_role;
