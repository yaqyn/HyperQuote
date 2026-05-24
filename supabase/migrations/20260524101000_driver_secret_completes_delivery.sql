create or replace function public.driver_confirm_delivery(
	p_delivery_id uuid,
	p_signature_path text,
	p_signer_name text,
	p_latitude numeric,
	p_longitude numeric,
	p_code text
)
returns public.deliveries
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
	v_driver_id uuid;
	target_delivery public.deliveries%rowtype;
	secret_row app_private.order_delivery_secrets%rowtype;
	submitted_code text;
	updated public.deliveries%rowtype;
	target_order public.orders%rowtype;
begin
	v_driver_id := public.current_driver_id();
	if v_driver_id is null then
		raise exception 'driver_required' using errcode = '42501';
	end if;
	perform p_signature_path, p_signer_name;

	submitted_code := app_private.extract_delivery_secret_code(p_code);
	if submitted_code is null then
		raise exception 'invalid_delivery_secret' using errcode = '23514';
	end if;

	select * into target_delivery
	from public.deliveries
	where id = p_delivery_id
	  and driver_id = v_driver_id
	for update;

	if target_delivery.id is null
		or target_delivery.status not in ('in_transit', 'arrived') then
		raise exception 'delivery_not_found_or_invalid_transition' using errcode = '02000';
	end if;

	select * into secret_row
	from app_private.order_delivery_secrets
	where order_id = target_delivery.order_id
	for update;

	if secret_row.order_id is null then
		perform app_private.ensure_delivery_secret_for_order(target_delivery.order_id);
		select * into secret_row
		from app_private.order_delivery_secrets
		where order_id = target_delivery.order_id
		for update;
	end if;

	if secret_row.order_id is null or secret_row.code <> submitted_code then
		raise exception 'invalid_delivery_secret' using errcode = '23514';
	end if;

	perform app_private.allow_workflow_state_change();

	update app_private.order_delivery_secrets
	set verified_at = coalesce(verified_at, now()),
		verified_by_driver_id = v_driver_id,
		verified_delivery_id = p_delivery_id
	where order_id = target_delivery.order_id;

	update public.deliveries
	set status = 'completed',
		arrived_at = coalesce(arrived_at, now()),
		completed_at = now()
	where id = p_delivery_id
	returning * into updated;

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
			'from_status', target_delivery.status,
			'to_status', 'completed',
			'latitude', p_latitude,
			'longitude', p_longitude
		)
	);

	perform app_private.finalize_delivered_order_if_ready(updated.order_id);
	return updated;
end;
$$;

create or replace function public.service_driver_confirm_delivery(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_delivery_id uuid,
	p_signature_path text,
	p_signer_name text,
	p_latitude numeric,
	p_longitude numeric,
	p_code text
)
returns public.deliveries
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	return public.driver_confirm_delivery(
		p_delivery_id,
		p_signature_path,
		p_signer_name,
		p_latitude,
		p_longitude,
		p_code
	);
end;
$$;

revoke execute on function public.driver_confirm_delivery(
	uuid,
	text,
	text,
	numeric,
	numeric,
	text
) from public, anon, authenticated;
revoke execute on function public.service_driver_confirm_delivery(
	uuid,
	text,
	uuid,
	text,
	text,
	numeric,
	numeric,
	text
) from public, anon, authenticated;

grant execute on function public.driver_confirm_delivery(
	uuid,
	text,
	text,
	numeric,
	numeric,
	text
) to service_role;
grant execute on function public.service_driver_confirm_delivery(
	uuid,
	text,
	uuid,
	text,
	text,
	numeric,
	numeric,
	text
) to service_role;
