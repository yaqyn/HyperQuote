drop policy if exists admin_employee_roles_read on public.employee_roles;
drop policy if exists warehouse_advisor_role_read on public.employee_roles;

create policy employee_roles_internal_select
	on public.employee_roles for select
	to authenticated
	using (
		public.can_access_panel('admin')
		or public.is_employee_with_role('ceo')
		or (
			public.can_access_panel('warehouse')
			and role in ('admin', 'warehouse')
		)
	);

drop policy if exists employees_read_self_or_admin on public.employees;
drop policy if exists warehouse_advisor_employee_read on public.employees;

create policy employees_internal_select
	on public.employees for select
	to authenticated
	using (
		user_id = (select auth.uid())
		or public.can_access_panel('admin')
		or public.is_employee_with_role('ceo')
		or (
			public.can_access_panel('warehouse')
			and status = 'active'
			and (
				is_ceo
				or exists (
					select 1
					from public.employee_roles er
					where er.employee_id = employees.id
						and er.role in ('admin', 'warehouse')
				)
			)
		)
	);

drop policy if exists supplier_payments_finance_select on public.supplier_payments;
drop policy if exists warehouse_supplier_payment_receiving_read on public.supplier_payments;

create policy supplier_payments_internal_select
	on public.supplier_payments for select
	to authenticated
	using (
		public.can_access_panel('finance')
		or public.can_access_panel('warehouse')
		or public.is_employee_with_role('ceo')
	);

drop policy if exists internal_supplier_access on public.suppliers;
drop policy if exists warehouse_supplier_receiving_read on public.suppliers;

create policy suppliers_internal_select
	on public.suppliers for select
	to authenticated
	using (
		public.can_access_panel('inventory')
		or public.can_access_panel('finance')
		or public.can_access_panel('admin')
		or public.can_access_panel('warehouse')
		or public.is_employee_with_role('ceo')
	);

create policy suppliers_internal_insert
	on public.suppliers for insert
	to authenticated
	with check (
		public.can_access_panel('inventory')
		or public.can_access_panel('finance')
		or public.can_access_panel('admin')
		or public.is_employee_with_role('ceo')
	);

create policy suppliers_internal_update
	on public.suppliers for update
	to authenticated
	using (
		public.can_access_panel('inventory')
		or public.can_access_panel('finance')
		or public.can_access_panel('admin')
		or public.is_employee_with_role('ceo')
	)
	with check (
		public.can_access_panel('inventory')
		or public.can_access_panel('finance')
		or public.can_access_panel('admin')
		or public.is_employee_with_role('ceo')
	);

create policy suppliers_internal_delete
	on public.suppliers for delete
	to authenticated
	using (
		public.can_access_panel('inventory')
		or public.can_access_panel('finance')
		or public.can_access_panel('admin')
		or public.is_employee_with_role('ceo')
	);
