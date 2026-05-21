create policy warehouse_advisor_employee_read
	on public.employees for select
	to authenticated
	using (
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
	);

create policy warehouse_advisor_role_read
	on public.employee_roles for select
	to authenticated
	using (
		public.can_access_panel('warehouse')
		and role in ('admin', 'warehouse')
	);
