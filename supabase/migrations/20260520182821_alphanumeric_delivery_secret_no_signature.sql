alter table app_private.order_delivery_secrets
	drop constraint if exists order_delivery_secrets_code_check;

alter table app_private.order_delivery_secrets
	add column if not exists revealed_at timestamptz;

create or replace function app_private.generate_delivery_secret_code()
returns text
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
	alphabet constant text := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
	entropy text;
	code text := '';
	byte_hex text;
begin
	entropy := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');

	for position_index in 1..8 loop
		byte_hex := substr(entropy, ((position_index - 1) * 2) + 1, 2);
		code := code || substr(
			alphabet,
			((('x' || byte_hex)::bit(8)::integer % char_length(alphabet)) + 1),
			1
		);
	end loop;

	return code;
end;
$$;

create or replace function app_private.extract_delivery_secret_code(p_value text)
returns text
language plpgsql
immutable
set search_path = public, app_private
as $$
declare
	normalized text;
	match text[];
begin
	normalized := upper(regexp_replace(coalesce(p_value, ''), '[[:space:]-]+', '', 'g'));

	if normalized = '' then
		return null;
	end if;

	match := regexp_match(normalized, '^(?:HQDELIVERY:[0-9A-F]{32}:)?([2-9A-HJ-NP-Z]{8})$');
	if match is not null then
		return match[1];
	end if;

	return null;
end;
$$;

update app_private.order_delivery_secrets
set code = app_private.generate_delivery_secret_code(),
	generated_at = now(),
	verified_at = null,
	verified_by_driver_id = null,
	verified_delivery_id = null
where code !~ '^[2-9A-HJ-NP-Z]{8}$';

alter table app_private.order_delivery_secrets
	add constraint order_delivery_secrets_code_check
	check (code ~ '^[2-9A-HJ-NP-Z]{8}$');

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
set search_path = public, app_private
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
	-- Keep legacy RPC parameter names callable while proof now comes from the customer code.
	perform p_signature_path, p_signer_name;

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

	if not exists (
		select 1
		from app_private.order_delivery_secrets secrets
		where secrets.order_id = updated.order_id
		  and secrets.verified_delivery_id = updated.id
		  and secrets.verified_by_driver_id = v_driver_id
		  and secrets.verified_at is not null
	) then
		raise exception 'delivery_secret_not_verified' using errcode = '23514';
	end if;

	select * into target_order
	from public.orders
	where id = updated.order_id;

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
		jsonb_build_object(
			'driver_id', v_driver_id,
			'order_id', updated.order_id,
			'customer_id', target_order.customer_id,
			'truck_id', updated.truck_id,
			'proof_type', 'delivery_secret',
			'latitude', p_latitude,
			'longitude', p_longitude,
			'to_status', 'completed'
		)
	);

	perform app_private.finalize_delivered_order_if_ready(updated.order_id);
	return updated;
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
				'proof', coalesce(p_proof, '{}'::jsonb)
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

create or replace function public.driver_confirm_arrival_secret_result(
	p_delivery_id uuid,
	p_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
	confirmed public.deliveries%rowtype;
begin
	select * into confirmed
	from public.driver_confirm_arrival_secret(p_delivery_id, p_code);

	return jsonb_build_object(
		'ok', true,
		'deliveryId', confirmed.id,
		'status', confirmed.status
	);
exception
	when sqlstate '02000' or sqlstate '23514' or sqlstate '42501' then
		return jsonb_build_object(
			'ok', false,
			'error', sqlerrm
		);
end;
$$;

grant execute on function public.driver_confirm_arrival_secret_result(uuid, text) to authenticated;

create or replace function public.customer_get_delivery_secret(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
	v_customer_id uuid;
	target_order public.orders%rowtype;
	secret_code text;
begin
	v_customer_id := public.current_customer_id();
	if v_customer_id is null then
		raise exception 'customer_required' using errcode = '42501';
	end if;

	select * into target_order
	from public.orders
	where id = p_order_id
	  and customer_id = v_customer_id
	for update;

	if target_order.id is null then
		raise exception 'order_not_found' using errcode = '02000';
	end if;

	if target_order.status <> 'out_for_delivery' then
		raise exception 'delivery_secret_unavailable' using errcode = '23514';
	end if;

	if not exists (
		select 1
		from public.deliveries
		where order_id = target_order.id
		  and status in ('in_transit', 'arrived')
	) then
		raise exception 'delivery_secret_unavailable' using errcode = '23514';
	end if;

	secret_code := app_private.ensure_delivery_secret_for_order(target_order.id);

	update app_private.order_delivery_secrets
	set revealed_at = coalesce(revealed_at, now())
	where order_id = target_order.id;

	perform public.log_activity(
		'order',
		target_order.id,
		'portal_order_viewed',
		jsonb_build_object('delivery_secret_revealed', true)
	);

	return jsonb_build_object(
		'code', secret_code,
		'payload', concat('HQDELIVERY:', target_order.id::text, ':', secret_code)
	);
end;
$$;

grant execute on function public.customer_get_delivery_secret(uuid) to authenticated;
