drop policy if exists customer_payments_admin_customer_metrics on public.customer_payments;
drop policy if exists internal_customer_payment_access on public.customer_payments;
create policy internal_customer_payment_access
	on public.customer_payments for all
	to authenticated
	using (
		public.can_access_panel('admin')
		or public.can_access_panel('sales')
		or public.can_access_panel('inventory')
		or public.can_access_panel('finance')
		or public.can_access_panel('warehouse')
		or public.is_employee_with_role('ceo')
	)
	with check (public.can_access_panel('finance', true));

drop policy if exists pricing_rules_admin_write on public.pricing_rules;
drop policy if exists pricing_rules_admin_insert on public.pricing_rules;
drop policy if exists pricing_rules_admin_update on public.pricing_rules;
drop policy if exists pricing_rules_admin_delete on public.pricing_rules;

create policy pricing_rules_admin_insert
	on public.pricing_rules for insert
	to authenticated
	with check (public.can_access_panel('admin', true));

create policy pricing_rules_admin_update
	on public.pricing_rules for update
	to authenticated
	using (public.can_access_panel('admin', true))
	with check (public.can_access_panel('admin', true));

create policy pricing_rules_admin_delete
	on public.pricing_rules for delete
	to authenticated
	using (public.can_access_panel('admin', true));

drop policy if exists trucks_admin_access on public.trucks;
