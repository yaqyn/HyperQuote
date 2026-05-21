do $$
begin
	create type public.customer_tier as enum ('A', 'B', 'C', 'new');
exception
	when duplicate_object then null;
end $$;

do $$
begin
	create type public.customer_payment_history as enum ('excellent', 'good', 'fair', 'poor');
exception
	when duplicate_object then null;
end $$;

alter table public.customers
	add column if not exists tier public.customer_tier not null default 'new',
	add column if not exists credit_limit numeric not null default 0 check (credit_limit >= 0),
	add column if not exists payment_history public.customer_payment_history not null default 'fair',
	add column if not exists assigned_sales_rep_id uuid references public.employees(id) on delete set null;

drop policy if exists drivers_admin_insert on public.drivers;
create policy drivers_admin_insert
	on public.drivers for insert
	to authenticated
	with check (public.can_access_panel('admin', true));

drop policy if exists drivers_admin_delete on public.drivers;
create policy drivers_admin_delete
	on public.drivers for delete
	to authenticated
	using (public.can_access_panel('admin', true));

drop policy if exists trucks_admin_access on public.trucks;
create policy trucks_admin_access
	on public.trucks for all
	to authenticated
	using (
		public.can_access_panel('admin')
		or public.can_access_panel('dispatch')
		or public.can_access_panel('warehouse')
		or public.is_employee_with_role('ceo')
	)
	with check (
		public.can_access_panel('admin', true)
		or public.can_access_panel('dispatch', true)
		or public.can_access_panel('warehouse', true)
	);

drop policy if exists customer_payments_admin_customer_metrics on public.customer_payments;
create policy customer_payments_admin_customer_metrics
	on public.customer_payments for select
	to authenticated
	using (
		public.can_access_panel('admin')
		or public.can_access_panel('sales')
		or public.can_access_panel('finance')
		or public.is_employee_with_role('ceo')
	);
