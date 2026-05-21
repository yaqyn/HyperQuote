drop policy if exists employees_dispatch_advisor_directory_select on public.employees;
create policy employees_dispatch_advisor_directory_select
	on public.employees for select
	to authenticated
	using (
		public.can_access_panel('dispatch', true)
		and status = 'active'
		and (
			is_ceo
			or exists (
				select 1
				from public.employee_roles er
				where er.employee_id = employees.id
				  and er.role in ('admin', 'ceo', 'dispatch', 'warehouse')
			)
		)
	);

drop policy if exists employee_roles_dispatch_advisor_directory_select on public.employee_roles;
create policy employee_roles_dispatch_advisor_directory_select
	on public.employee_roles for select
	to authenticated
	using (
		public.can_access_panel('dispatch', true)
		and role in ('admin', 'ceo', 'dispatch', 'warehouse')
	);
