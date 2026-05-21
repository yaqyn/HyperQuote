create table if not exists public.pricing_rules (
	product_category text primary key,
	target_margin numeric not null check (target_margin >= 0),
	floor_margin numeric not null check (floor_margin >= 0),
	absolute_min_margin numeric not null check (absolute_min_margin >= 0),
	active boolean not null default true,
	updated_by_employee_id uuid references public.employees(id) on delete set null,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

alter table public.pricing_rules enable row level security;

drop policy if exists pricing_rules_internal_read on public.pricing_rules;
create policy pricing_rules_internal_read
	on public.pricing_rules for select
	to authenticated
	using (public.current_employee_id() is not null);

drop policy if exists pricing_rules_admin_write on public.pricing_rules;
create policy pricing_rules_admin_write
	on public.pricing_rules for all
	to authenticated
	using (public.can_access_panel('admin', true))
	with check (public.can_access_panel('admin', true));

insert into public.pricing_rules (
	product_category,
	target_margin,
	floor_margin,
	absolute_min_margin
)
values
	('cement_concrete', 20, 14, 8),
	('steel_rebar', 15, 10, 6),
	('lumber_timber', 18, 12, 8),
	('roofing', 25, 18, 12),
	('specialty_custom', 38, 25, 15)
on conflict (product_category) do nothing;

grant select on public.pricing_rules to authenticated;
