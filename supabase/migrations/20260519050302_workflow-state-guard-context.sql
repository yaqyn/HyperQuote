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

create or replace function public.prevent_direct_state_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
	state_column text := tg_argv[0];
begin
	if tg_op = 'UPDATE'
		and to_jsonb(old)->>state_column is distinct from to_jsonb(new)->>state_column
		and not app_private.workflow_state_change_is_authorized()
		and coalesce(auth.role(), '') <> 'service_role'
	then
		raise exception 'state_updates_must_use_rpc' using errcode = '42501';
	end if;

	return new;
end;
$$;
