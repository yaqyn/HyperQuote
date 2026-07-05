select set_config('app.audited_registry_write', 'on', false);

create or replace function app_private.catalog_family_slug(
	category_slug text,
	product_group text
)
returns text
language sql
immutable
strict
set search_path = public
as $$
	select app_private.catalog_slug_part(category_slug)
		|| '-'
		|| app_private.catalog_slug_part(product_group)
$$;

with desired_families as (
	select distinct on (
		c.id,
		app_private.catalog_family_slug(
			c.slug,
			coalesce(nullif(p.subcategory, ''), p.name, 'general')
		)
	)
		c.id as category_id,
		app_private.catalog_family_slug(
			c.slug,
			coalesce(nullif(p.subcategory, ''), p.name, 'general')
		) as slug,
		initcap(
			regexp_replace(
				coalesce(nullif(p.subcategory, ''), p.name, 'General'),
				'[-_]+',
				' ',
				'g'
			)
		) as name,
		coalesce(
			nullif(p.subcategory_ar, ''),
			nullif(p.name_ar, ''),
			'منتج ' || initcap(
				regexp_replace(
					coalesce(nullif(p.subcategory, ''), p.name, 'General'),
					'[-_]+',
					' ',
					'g'
				)
			)
		) as name_ar,
		coalesce(p.description, '') as description,
		coalesce(p.description_ar, '') as description_ar,
		p.image_urls[1] as image_url,
		p.is_active
	from public.products p
	join public.categories c on c.slug = p.category
	where btrim(coalesce(p.category, '')) <> ''
	order by
		c.id,
		app_private.catalog_family_slug(
			c.slug,
			coalesce(nullif(p.subcategory, ''), p.name, 'general')
		),
		p.name
)
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
select
	category_id,
	slug,
	name,
	name_ar,
	description,
	description_ar,
	image_url,
	is_active
from desired_families
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
	select distinct on (p.slug)
		pf.id as product_family_id,
		p.slug,
		p.name,
		coalesce(nullif(p.name_ar, ''), 'نوع ' || p.name) as name_ar,
		coalesce(p.description, '') as description,
		coalesce(p.description_ar, '') as description_ar,
		p.image_urls[1] as image_url,
		p.is_active
	from public.products p
	join public.categories c on c.slug = p.category
	join public.product_families pf
		on pf.category_id = c.id
		and pf.slug = app_private.catalog_family_slug(
			c.slug,
			coalesce(nullif(p.subcategory, ''), p.name, 'general')
		)
	where btrim(coalesce(p.category, '')) <> ''
	order by p.slug, p.name
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
	is_active
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
from public.product_types pt
where pt.slug = p.slug
	and p.product_type_id is distinct from pt.id;

create or replace function app_private.ensure_product_hierarchy()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
	category_row public.categories%rowtype;
	family_slug text;
	family_name text;
	family_name_ar text;
	family_row public.product_families%rowtype;
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

	family_slug := app_private.catalog_family_slug(
		category_row.slug,
		coalesce(nullif(new.subcategory, ''), new.name, 'general')
	);
	family_name := initcap(
		regexp_replace(
			coalesce(nullif(new.subcategory, ''), new.name, 'General'),
			'[-_]+',
			' ',
			'g'
		)
	);
	family_name_ar := coalesce(
		nullif(new.subcategory_ar, ''),
		nullif(new.name_ar, ''),
		'منتج ' || family_name
	);

	select *
	into family_row
	from public.product_families
	where slug = family_slug;

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
			family_slug,
			family_name,
			family_name_ar,
			coalesce(new.description, ''),
			coalesce(new.description_ar, ''),
			new.image_urls[1],
			true
		)
		returning * into family_row;
	end if;

	select *
	into type_row
	from public.product_types
	where slug = new.slug;

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
			new.slug,
			new.name,
			coalesce(nullif(new.name_ar, ''), 'نوع ' || new.name),
			coalesce(new.description, ''),
			coalesce(new.description_ar, ''),
			new.image_urls[1],
			new.is_active
		)
		returning * into type_row;
	else
		update public.product_types
		set
			product_family_id = family_row.id,
			name = new.name,
			name_ar = coalesce(nullif(new.name_ar, ''), type_row.name_ar),
			description = coalesce(new.description, ''),
			description_ar = coalesce(new.description_ar, ''),
			image_url = new.image_urls[1],
			is_active = new.is_active,
			updated_at = now()
		where id = type_row.id
		returning * into type_row;
	end if;

	new.product_type_id := type_row.id;
	return new;
end;
$$;

select set_config('app.audited_registry_write', '', false);
