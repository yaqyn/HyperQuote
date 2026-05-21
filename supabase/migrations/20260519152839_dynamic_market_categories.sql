drop policy if exists admin_categories_access on public.categories;
drop policy if exists admin_categories_insert on public.categories;
drop policy if exists admin_categories_update on public.categories;
drop policy if exists admin_categories_delete on public.categories;

create policy admin_categories_insert
	on public.categories for insert
	to authenticated
	with check (public.can_access_panel('admin', true));

create policy admin_categories_update
	on public.categories for update
	to authenticated
	using (public.can_access_panel('admin', true))
	with check (public.can_access_panel('admin', true));

create policy admin_categories_delete
	on public.categories for delete
	to authenticated
	using (public.can_access_panel('admin', true));

drop policy if exists market_categories_read_active on public.categories;
create policy market_categories_read_active
	on public.categories for select
	to anon, authenticated
	using (
		is_active
		or public.can_access_panel('admin')
		or public.can_access_panel('inventory')
		or public.is_employee_with_role('ceo')
	);

grant select on public.categories to anon, authenticated;
