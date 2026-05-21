drop policy if exists internal_customer_payment_access on public.customer_payments;
drop policy if exists internal_supplier_payment_access on public.supplier_payments;

create policy customer_payments_finance_customer_select
	on public.customer_payments for select
	to authenticated
	using (
		public.can_access_panel('finance')
		or public.is_employee_with_role('ceo')
		or exists (
			select 1
			from public.orders o
			where o.id = order_id
			  and o.customer_id = public.current_customer_id()
		)
	);

create policy customer_payments_finance_insert
	on public.customer_payments for insert
	to authenticated
	with check (public.can_access_panel('finance', true));

create policy customer_payments_finance_update
	on public.customer_payments for update
	to authenticated
	using (public.can_access_panel('finance', true))
	with check (public.can_access_panel('finance', true));

create policy customer_payments_finance_delete
	on public.customer_payments for delete
	to authenticated
	using (public.can_access_panel('finance', true));

create policy supplier_payments_finance_select
	on public.supplier_payments for select
	to authenticated
	using (
		public.can_access_panel('finance')
		or public.is_employee_with_role('ceo')
	);

create policy supplier_payments_finance_insert
	on public.supplier_payments for insert
	to authenticated
	with check (public.can_access_panel('finance', true));

create policy supplier_payments_finance_update
	on public.supplier_payments for update
	to authenticated
	using (public.can_access_panel('finance', true))
	with check (public.can_access_panel('finance', true));

create policy supplier_payments_finance_delete
	on public.supplier_payments for delete
	to authenticated
	using (public.can_access_panel('finance', true));
