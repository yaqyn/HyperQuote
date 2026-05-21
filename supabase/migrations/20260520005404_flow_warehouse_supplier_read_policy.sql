create policy warehouse_supplier_receiving_read
	on public.suppliers for select
	to authenticated
	using (public.can_access_panel('warehouse') or public.is_employee_with_role('ceo'));
