select set_config('app.audited_registry_write', 'on', false);

create table public.product_families (
	id uuid primary key default gen_random_uuid(),
	category_id uuid not null references public.categories(id) on delete restrict,
	slug text not null unique,
	name text not null,
	name_ar text not null,
	description text not null default '',
	description_ar text not null default '',
	image_url text,
	is_active boolean not null default true,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	unique (category_id, slug),
	constraint product_families_slug_not_blank check (btrim(slug) <> ''),
	constraint product_families_name_not_blank check (btrim(name) <> ''),
	constraint product_families_name_ar_language check (name_ar ~ '[ء-ي]'),
	constraint product_families_image_url_not_blank
		check (image_url is null or btrim(image_url) <> '')
);

create table public.product_types (
	id uuid primary key default gen_random_uuid(),
	product_family_id uuid not null references public.product_families(id) on delete restrict,
	slug text not null unique,
	name text not null,
	name_ar text not null,
	description text not null default '',
	description_ar text not null default '',
	image_url text,
	is_active boolean not null default true,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	unique (product_family_id, slug),
	constraint product_types_slug_not_blank check (btrim(slug) <> ''),
	constraint product_types_name_not_blank check (btrim(name) <> ''),
	constraint product_types_name_ar_language check (name_ar ~ '[ء-ي]'),
	constraint product_types_image_url_not_blank
		check (image_url is null or btrim(image_url) <> '')
);

alter table public.products
	add column if not exists product_type_id uuid references public.product_types(id) on delete set null;

create index if not exists product_families_category_id_idx
	on public.product_families (category_id);

create index if not exists product_types_product_family_id_idx
	on public.product_types (product_family_id);

create index if not exists products_product_type_id_idx
	on public.products (product_type_id)
	where is_active;

alter table public.product_families enable row level security;
alter table public.product_types enable row level security;

drop policy if exists product_families_read_active on public.product_families;
create policy product_families_read_active
	on public.product_families for select
	to authenticated
	using (
		is_active
		or public.can_access_panel('admin')
		or public.can_access_panel('inventory')
		or public.is_employee_with_role('ceo')
	);

drop policy if exists product_types_read_active on public.product_types;
create policy product_types_read_active
	on public.product_types for select
	to authenticated
	using (
		is_active
		or public.can_access_panel('admin')
		or public.can_access_panel('inventory')
		or public.is_employee_with_role('ceo')
	);

drop policy if exists product_families_admin_insert on public.product_families;
create policy product_families_admin_insert
	on public.product_families for insert
	to authenticated
	with check (public.can_access_panel('admin', true));

drop policy if exists product_families_admin_update on public.product_families;
create policy product_families_admin_update
	on public.product_families for update
	to authenticated
	using (public.can_access_panel('admin', true))
	with check (public.can_access_panel('admin', true));

drop policy if exists product_families_admin_delete on public.product_families;
create policy product_families_admin_delete
	on public.product_families for delete
	to authenticated
	using (public.can_access_panel('admin', true));

drop policy if exists product_types_admin_insert on public.product_types;
create policy product_types_admin_insert
	on public.product_types for insert
	to authenticated
	with check (public.can_access_panel('admin', true));

drop policy if exists product_types_admin_update on public.product_types;
create policy product_types_admin_update
	on public.product_types for update
	to authenticated
	using (public.can_access_panel('admin', true))
	with check (public.can_access_panel('admin', true));

drop policy if exists product_types_admin_delete on public.product_types;
create policy product_types_admin_delete
	on public.product_types for delete
	to authenticated
	using (public.can_access_panel('admin', true));

revoke all on table public.product_families from public, anon, authenticated;
revoke all on table public.product_types from public, anon, authenticated;
grant select, insert, update, delete on table public.product_families to service_role;
grant select, insert, update, delete on table public.product_types to service_role;

create or replace function app_private.catalog_slug_part(value text)
returns text
language sql
immutable
strict
set search_path = public
as $$
	select coalesce(
		nullif(
			regexp_replace(
				regexp_replace(lower(btrim(value)), '[^a-z0-9]+', '-', 'g'),
				'(^-|-$)',
				'',
				'g'
			),
			''
		),
		'general'
	)
$$;

insert into public.categories (slug, name, name_ar, is_active)
select distinct
	btrim(p.category),
	initcap(replace(btrim(p.category), '_', ' ')),
	'تصنيف ' || initcap(replace(btrim(p.category), '_', ' ')),
	true
from public.products p
where btrim(coalesce(p.category, '')) <> ''
	and not exists (
		select 1
		from public.categories c
		where c.slug = btrim(p.category)
	);

insert into public.product_families (
	category_id,
	slug,
	name,
	name_ar,
	description,
	description_ar,
	image_url,
	is_active
)
select distinct on (c.slug)
	c.id,
	c.slug,
	c.name,
	coalesce(nullif(c.name_ar, ''), 'تصنيف ' || c.name),
	coalesce(c.description, ''),
	coalesce(c.description_ar, ''),
	c.image_url,
	c.is_active
from public.products p
join public.categories c on c.slug = p.category
where btrim(coalesce(p.category, '')) <> ''
order by c.slug
on conflict (slug) do update
set
	category_id = excluded.category_id,
	name = excluded.name,
	name_ar = excluded.name_ar,
	description = excluded.description,
	description_ar = excluded.description_ar,
	image_url = excluded.image_url,
	is_active = excluded.is_active,
	updated_at = now();

with desired_types as (
	select distinct on (
		pf.id,
		app_private.catalog_slug_part(
			coalesce(nullif(p.subcategory, ''), p.name, 'general')
		)
	)
		pf.id as product_family_id,
		pf.slug || '-' || app_private.catalog_slug_part(
			coalesce(nullif(p.subcategory, ''), p.name, 'general')
		) as slug,
		initcap(
			replace(
				coalesce(nullif(p.subcategory, ''), p.name, 'General'),
				'_',
				' '
			)
		) as name,
		coalesce(
			nullif(p.subcategory_ar, ''),
			nullif(p.name_ar, ''),
			'نوع ' || initcap(
				replace(
					coalesce(nullif(p.subcategory, ''), p.name, 'General'),
					'_',
					' '
				)
			)
		) as name_ar,
		coalesce(p.description, '') as description,
		coalesce(p.description_ar, '') as description_ar,
		p.image_urls[1] as image_url
	from public.products p
	join public.product_families pf on pf.slug = p.category
	order by
		pf.id,
		app_private.catalog_slug_part(
			coalesce(nullif(p.subcategory, ''), p.name, 'general')
		),
		p.name
)
insert into public.product_types (
	product_family_id,
	slug,
	name,
	name_ar,
	description,
	description_ar,
	image_url,
	is_active
)
select
	product_family_id,
	slug,
	name,
	name_ar,
	description,
	description_ar,
	image_url,
	true
from desired_types
on conflict (slug) do update
set
	product_family_id = excluded.product_family_id,
	name = excluded.name,
	name_ar = excluded.name_ar,
	description = excluded.description,
	description_ar = excluded.description_ar,
	image_url = excluded.image_url,
	is_active = excluded.is_active,
	updated_at = now();

update public.products p
set product_type_id = pt.id
from public.product_families pf
join public.product_types pt on pt.product_family_id = pf.id
where pf.slug = p.category
	and pt.slug = pf.slug || '-' || app_private.catalog_slug_part(
		coalesce(nullif(p.subcategory, ''), p.name, 'general')
	)
	and p.product_type_id is distinct from pt.id;

create or replace function app_private.ensure_product_hierarchy()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
	category_row public.categories%rowtype;
	family_row public.product_families%rowtype;
	type_slug text;
	type_name text;
	type_name_ar text;
	type_row public.product_types%rowtype;
begin
	if btrim(coalesce(new.category, '')) = '' then
		raise exception 'product_category_required' using errcode = '23514';
	end if;

	select *
	into category_row
	from public.categories
	where slug = btrim(new.category);

	if category_row.id is null then
		insert into public.categories (slug, name, name_ar, is_active)
		values (
			btrim(new.category),
			initcap(replace(btrim(new.category), '_', ' ')),
			'تصنيف ' || initcap(replace(btrim(new.category), '_', ' ')),
			true
		)
		returning * into category_row;
	end if;

	select *
	into family_row
	from public.product_families
	where slug = category_row.slug;

	if family_row.id is null then
		insert into public.product_families (
			category_id,
			slug,
			name,
			name_ar,
			description,
			description_ar,
			image_url,
			is_active
		)
		values (
			category_row.id,
			category_row.slug,
			category_row.name,
			coalesce(nullif(category_row.name_ar, ''), 'تصنيف ' || category_row.name),
			coalesce(category_row.description, ''),
			coalesce(category_row.description_ar, ''),
			category_row.image_url,
			category_row.is_active
		)
		returning * into family_row;
	end if;

	type_slug := family_row.slug || '-' || app_private.catalog_slug_part(
		coalesce(nullif(new.subcategory, ''), new.name, 'general')
	);
	type_name := initcap(
		replace(coalesce(nullif(new.subcategory, ''), new.name, 'General'), '_', ' ')
	);
	type_name_ar := coalesce(
		nullif(new.subcategory_ar, ''),
		nullif(new.name_ar, ''),
		'نوع ' || type_name
	);

	select *
	into type_row
	from public.product_types
	where slug = type_slug;

	if type_row.id is null then
		insert into public.product_types (
			product_family_id,
			slug,
			name,
			name_ar,
			description,
			description_ar,
			image_url,
			is_active
		)
		values (
			family_row.id,
			type_slug,
			type_name,
			type_name_ar,
			coalesce(new.description, ''),
			coalesce(new.description_ar, ''),
			new.image_urls[1],
			true
		)
		returning * into type_row;
	end if;

	new.product_type_id := type_row.id;
	return new;
end;
$$;

drop trigger if exists products_catalog_hierarchy_assign on public.products;
create trigger products_catalog_hierarchy_assign
	before insert or update of category, subcategory, subcategory_ar, name, name_ar, product_type_id
	on public.products
	for each row execute function app_private.ensure_product_hierarchy();

drop view if exists public.catalog_product_hierarchy;
create view public.catalog_product_hierarchy
with (security_invoker = true) as
select
	p.id,
	p.sku,
	p.slug,
	p.name,
	p.name_ar,
	p.description,
	p.description_ar,
	p.category,
	p.subcategory,
	p.subcategory_ar,
	p.brand,
	p.manufacturer,
	p.specifications,
	p.specifications_ar,
	p.unit_of_measure,
	p.unit_of_measure_ar,
	p.weight_kg,
	p.price_range_min,
	p.price_range_max,
	p.price_tier,
	p.availability_status,
	p.image_urls,
	p.tags,
	p.is_stockable,
	p.is_active,
	p.updated_at,
	c.id as category_id,
	c.slug as category_slug,
	c.name as category_name,
	c.name_ar as category_name_ar,
	c.description as category_description,
	c.description_ar as category_description_ar,
	c.image_url as category_image_url,
	pf.id as product_family_id,
	pf.slug as product_family_slug,
	pf.name as product_family_name,
	pf.name_ar as product_family_name_ar,
	pf.description as product_family_description,
	pf.description_ar as product_family_description_ar,
	pf.image_url as product_family_image_url,
	pt.id as product_type_id,
	pt.slug as product_type_slug,
	pt.name as product_type_name,
	pt.name_ar as product_type_name_ar,
	pt.description as product_type_description,
	pt.description_ar as product_type_description_ar,
	pt.image_url as product_type_image_url
from public.products p
left join public.product_types pt on pt.id = p.product_type_id
left join public.product_families pf on pf.id = pt.product_family_id
left join public.categories c on c.id = pf.category_id;

revoke all on table public.catalog_product_hierarchy from public, anon, authenticated;
grant select on table public.catalog_product_hierarchy to service_role;

select set_config('app.audited_registry_write', '', false);
