drop policy if exists customer_profiles_own on public.customers;

create policy customer_profiles_own
	on public.customers for select
	to authenticated
	using (
		user_id = (select auth.uid())
		or public.current_customer_id() = id
		or public.can_access_panel('customer_service')
		or public.can_access_panel('sales')
		or public.can_access_panel('finance')
		or public.can_access_panel('inventory')
		or public.can_access_panel('warehouse')
		or public.can_access_panel('dispatch')
		or public.can_access_panel('admin')
		or public.is_employee_with_role('ceo')
	);

drop policy if exists customers_own_addresses on public.customer_addresses;

create policy customers_own_addresses
	on public.customer_addresses for all
	to authenticated
	using (
		customer_id = public.current_customer_id()
		or public.can_access_panel('customer_service')
		or public.can_access_panel('sales')
		or public.can_access_panel('finance')
		or public.can_access_panel('inventory')
		or public.can_access_panel('warehouse')
		or public.can_access_panel('dispatch')
		or public.can_access_panel('admin')
		or public.is_employee_with_role('ceo')
	)
	with check (
		customer_id = public.current_customer_id()
		or public.can_access_panel('customer_service', true)
		or public.can_access_panel('sales', true)
		or public.can_access_panel('finance', true)
		or public.can_access_panel('inventory', true)
		or public.can_access_panel('warehouse', true)
		or public.can_access_panel('dispatch', true)
		or public.can_access_panel('admin', true)
	);

drop policy if exists quote_request_items_customer_employee_select
	on public.quote_request_items;

create policy quote_request_items_customer_employee_select
	on public.quote_request_items for select
	to authenticated
	using (exists (
		select 1 from public.quote_requests qr
		where qr.id = quote_request_id
		  and (
			qr.customer_id = public.current_customer_id()
			or public.can_access_panel('sales')
			or public.can_access_panel('finance')
			or public.can_access_panel('inventory')
			or public.can_access_panel('warehouse')
			or public.can_access_panel('dispatch')
			or public.is_employee_with_role('ceo')
		  )
	));
