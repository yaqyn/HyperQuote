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
		'public.driver_reject_delivery',
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

create or replace function public.admin_disable_driver(
	p_driver_id uuid,
	p_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
	actor_employee_id uuid;
	target_driver public.drivers%rowtype;
	disable_reason text;
begin
	actor_employee_id := public.require_panel('admin', true);
	disable_reason := nullif(btrim(coalesce(p_reason, '')), '');

	if p_driver_id is null then
		raise exception 'driver_id_required' using errcode = '23514';
	end if;
	if disable_reason is null or length(disable_reason) < 8 then
		raise exception 'admin_driver_disable_reason_required' using errcode = '23514';
	end if;

	select * into target_driver
	from public.drivers
	where id = p_driver_id
	for update;

	if target_driver.id is null then
		raise exception 'driver_not_found' using errcode = '02000';
	end if;

	perform app_private.allow_workflow_state_change();

	update public.drivers
	set status = 'disabled'
	where id = p_driver_id;

	update public.trucks
	set driver_id = null
	where driver_id = p_driver_id;

	if target_driver.user_id is not null then
		update public.profiles
		set status = 'disabled'
		where auth_user_id = target_driver.user_id;
	end if;

	perform public.log_activity(
		'driver',
		p_driver_id,
		'admin_record_deactivated',
		jsonb_build_object(
			'employee_id', actor_employee_id,
			'reason', disable_reason,
			'scope', 'drivers'
		)
	);
end;
$$;

revoke all on function public.admin_disable_driver(uuid, text) from public;
grant execute on function public.admin_disable_driver(uuid, text) to authenticated;
