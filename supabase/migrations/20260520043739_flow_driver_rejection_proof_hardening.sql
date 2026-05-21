create or replace function public.require_driver_rejection_proof(proof jsonb)
returns void
language plpgsql
immutable
set search_path = public
as $$
declare
	location jsonb;
	latitude numeric;
	longitude numeric;
begin
	perform public.require_rejection_proof(proof);

	if length(trim(coalesce(proof->>'reason', ''))) < 3 then
		raise exception 'driver_rejection_reason_proof_required' using errcode = '23514';
	end if;

	if length(trim(coalesce(proof->>'evidenceText', ''))) < 3 then
		raise exception 'driver_rejection_evidence_required' using errcode = '23514';
	end if;

	location := proof->'location';
	if location is null or jsonb_typeof(location) <> 'object' then
		raise exception 'driver_rejection_location_required' using errcode = '23514';
	end if;

	begin
		latitude := nullif(location->>'latitude', '')::numeric;
		longitude := nullif(location->>'longitude', '')::numeric;
	exception when invalid_text_representation then
		raise exception 'driver_rejection_location_required' using errcode = '23514';
	end;

	if latitude is null
		or longitude is null
		or latitude = 0
		or longitude = 0
		or latitude < -90
		or latitude > 90
		or longitude < -180
		or longitude > 180 then
		raise exception 'driver_rejection_location_required' using errcode = '23514';
	end if;
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
	perform public.require_driver_rejection_proof(p_proof);
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

grant execute on function public.require_driver_rejection_proof(jsonb) to authenticated;
grant execute on function public.driver_reject_delivery(uuid, text, jsonb) to authenticated;
