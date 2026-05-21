create or replace function app_private.release_order_reservations(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
	line record;
	released jsonb := '[]'::jsonb;
begin
	for line in
		select product_id, sum(quantity) as quantity
		from public.inventory_reservations
		where order_id = p_order_id
		  and status = 'reserved'
		group by product_id
	loop
		update public.inventory_stock
		set reserved_quantity = reserved_quantity - line.quantity
		where product_id = line.product_id
		  and reserved_quantity >= line.quantity;

		if not found then
			raise exception 'reserved_stock_release_failed_for_product_%', line.product_id using errcode = '23514';
		end if;

		released := released || jsonb_build_array(
			jsonb_build_object(
				'product_id', line.product_id,
				'quantity', line.quantity
			)
		);
	end loop;

	update public.inventory_reservations
	set status = 'released'
	where order_id = p_order_id
	  and status = 'reserved';

	return released;
end;
$$;

revoke all on function app_private.release_order_reservations(uuid) from public;

create or replace function public.finance_cancel_customer_order(
	p_order_id uuid,
	p_reason text,
	p_proof jsonb default '{}'::jsonb
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
	employee_id uuid;
	target public.orders%rowtype;
	updated public.orders%rowtype;
	cancel_reason text;
	released jsonb := '[]'::jsonb;
begin
	employee_id := public.require_panel('finance', true);
	perform app_private.allow_workflow_state_change();
	cancel_reason := nullif(btrim(coalesce(p_reason, '')), '');

	if cancel_reason is null or length(cancel_reason) < 3 then
		raise exception 'cancel_reason_required' using errcode = '23514';
	end if;

	select * into target
	from public.orders
	where id = p_order_id
	for update;

	if target.id is null then
		raise exception 'order_not_found' using errcode = '02000';
	end if;

	if target.status not in ('confirmed_for_inventory', 'inventory_reserved') then
		raise exception 'invalid_finance_cancel_order_transition_%', target.status using errcode = '23514';
	end if;

	if target.status = 'inventory_reserved' then
		released := app_private.release_order_reservations(p_order_id);
	end if;

	update public.orders
	set status = 'canceled'
	where id = p_order_id
	returning * into updated;

	perform public.log_activity(
		'order',
		p_order_id,
		'sales_order_canceled',
		jsonb_build_object(
			'employee_id', employee_id,
			'from_status', target.status,
			'to_status', 'canceled',
			'reason', cancel_reason,
			'proof', coalesce(p_proof, '{}'::jsonb),
			'released_reservations', released
		)
	);

	return updated;
end;
$$;

grant execute on function public.finance_cancel_customer_order(uuid, text, jsonb) to authenticated;

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
		'public.driver_update_location',
		'public.driver_confirm_delivery',
		'public.driver_reject_delivery'
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
