drop policy if exists drivers_read_self_or_ops on public.drivers;

create policy drivers_read_self_or_ops
	on public.drivers for select
	to authenticated
	using (
		user_id = (select auth.uid())
		or public.current_driver_id() = id
		or public.can_access_panel('warehouse')
		or public.can_access_panel('dispatch')
		or public.can_access_panel('admin')
		or public.is_employee_with_role('ceo')
	);
