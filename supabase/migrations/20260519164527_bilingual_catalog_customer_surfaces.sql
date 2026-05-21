alter table public.categories
	alter column name_ar set default '';

update public.categories
set name_ar = name
where btrim(coalesce(name_ar, '')) = '';

alter table public.categories
	alter column name_ar set not null;

alter table public.products
	add column if not exists subcategory_ar text not null default '',
	add column if not exists specifications_ar jsonb not null default '{}'::jsonb,
	add column if not exists unit_of_measure_ar text not null default '';

update public.products p
set unit_of_measure_ar = case p.unit_of_measure
	when 'bag' then 'شيكارة'
	when 'ton' then 'طن'
	when 'metric_ton' then 'طن متري'
	when 'cubic_meter' then 'متر مكعب'
	when 'sqm' then 'متر مربع'
	when 'meter' then 'متر'
	when 'piece' then 'قطعة'
	when 'thousand' then 'ألف'
	when 'kg' then 'كجم'
	when 'liter' then 'لتر'
	when 'bundle' then 'حزمة'
	when 'box' then 'صندوق'
	when 'carton' then 'كرتونة'
	when 'set' then 'طقم'
	when 'pair' then 'زوج'
	when 'pallet' then 'بالتة'
	when 'roll' then 'لفة'
	when 'sheet' then 'لوح'
	else p.unit_of_measure
end
where btrim(p.unit_of_measure_ar) = '';

update public.products p
set subcategory_ar = coalesce(c.name_ar, p.subcategory)
from public.categories c
where p.subcategory = c.slug
	and btrim(p.subcategory_ar) = '';

update public.products
set subcategory_ar = coalesce(nullif(subcategory, ''), category)
where btrim(subcategory_ar) = ''
	and btrim(coalesce(subcategory, '')) <> '';

update public.products
set specifications_ar = specifications
where specifications <> '{}'::jsonb
	and specifications_ar = '{}'::jsonb;

alter table public.quote_request_items
	add column if not exists unit_of_measure_ar text not null default '';

alter table public.quote_items
	add column if not exists unit_of_measure_ar text not null default '';

update public.quote_request_items qri
set unit_of_measure_ar = coalesce(nullif(p.unit_of_measure_ar, ''), qri.unit_of_measure)
from public.products p
where qri.product_id = p.id
	and btrim(qri.unit_of_measure_ar) = '';

update public.quote_request_items
set unit_of_measure_ar = unit_of_measure
where btrim(unit_of_measure_ar) = '';

update public.quote_items qi
set unit_of_measure_ar = coalesce(nullif(p.unit_of_measure_ar, ''), qi.unit_of_measure)
from public.products p
where qi.product_id = p.id
	and btrim(qi.unit_of_measure_ar) = '';

update public.quote_items
set unit_of_measure_ar = unit_of_measure
where btrim(unit_of_measure_ar) = '';

alter table public.categories
	drop constraint if exists categories_name_ar_required,
	add constraint categories_name_ar_required
		check (btrim(name_ar) <> '');

alter table public.products
	drop constraint if exists products_name_ar_required,
	drop constraint if exists products_description_ar_required,
	drop constraint if exists products_unit_of_measure_ar_required,
	drop constraint if exists products_subcategory_ar_required,
	drop constraint if exists products_specifications_ar_object,
	drop constraint if exists products_specifications_ar_required_when_specs_present,
	add constraint products_name_ar_required
		check (btrim(name_ar) <> ''),
	add constraint products_description_ar_required
		check (
			description is null
			or btrim(description) = ''
			or btrim(coalesce(description_ar, '')) <> ''
		),
	add constraint products_unit_of_measure_ar_required
		check (btrim(unit_of_measure_ar) <> ''),
	add constraint products_subcategory_ar_required
		check (
			subcategory is null
			or btrim(subcategory) = ''
			or btrim(subcategory_ar) <> ''
		),
	add constraint products_specifications_ar_object
		check (jsonb_typeof(specifications_ar) = 'object'),
	add constraint products_specifications_ar_required_when_specs_present
		check (specifications = '{}'::jsonb or specifications_ar <> '{}'::jsonb);

alter table public.quote_request_items
	drop constraint if exists quote_request_items_unit_of_measure_ar_required,
	add constraint quote_request_items_unit_of_measure_ar_required
		check (btrim(unit_of_measure_ar) <> '');

alter table public.quote_items
	drop constraint if exists quote_items_unit_of_measure_ar_required,
	add constraint quote_items_unit_of_measure_ar_required
		check (btrim(unit_of_measure_ar) <> '');

create or replace function app_private.normalize_customer_quote_request_item()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
	parent_request record;
	catalog_product record;
	customer_id uuid;
begin
	select qr.customer_id, qr.status
	into parent_request
	from public.quote_requests qr
	where qr.id = new.quote_request_id;

	if parent_request.customer_id is null then
		raise exception 'quote_request_not_found' using errcode = '02000';
	end if;

	customer_id := public.current_customer_id();

	if customer_id is not null
		and parent_request.customer_id = customer_id
		and not (
			public.can_access_panel('sales', true)
			or public.can_access_panel('admin', true)
			or public.can_access_panel('inventory', true)
		)
	then
		if parent_request.status <> 'draft' then
			raise exception 'customer_quote_items_are_draft_only' using errcode = '42501';
		end if;

		if new.product_id is not null then
			select
				p.name,
				p.unit_of_measure,
				p.unit_of_measure_ar,
				p.price_range_min,
				p.price_range_max,
				p.is_active,
				p.availability_status::text as availability_status
			into catalog_product
			from public.products p
			where p.id = new.product_id;

			if catalog_product.name is null
				or not catalog_product.is_active
				or catalog_product.availability_status in ('hidden', 'out_of_stock')
			then
				raise exception 'product_not_orderable' using errcode = '23514';
			end if;

			new.customer_description := catalog_product.name;
			new.unit_of_measure := catalog_product.unit_of_measure;
			new.unit_of_measure_ar := catalog_product.unit_of_measure_ar;
			new.price_range_min := catalog_product.price_range_min;
			new.price_range_max := catalog_product.price_range_max;
			new.currency := 'EGP';
			new.match_confidence := 1;
			new.is_unmatched := false;
		else
			new.customer_description := left(btrim(coalesce(new.customer_description, '')), 500);
			new.unit_of_measure := left(btrim(coalesce(new.unit_of_measure, 'unit')), 80);
			new.unit_of_measure_ar := left(btrim(coalesce(new.unit_of_measure_ar, new.unit_of_measure)), 80);
			if new.customer_description = '' then
				raise exception 'customer_description_required' using errcode = '23514';
			end if;
			if new.unit_of_measure = '' then
				new.unit_of_measure := 'unit';
			end if;
			if new.unit_of_measure_ar = '' then
				new.unit_of_measure_ar := new.unit_of_measure;
			end if;
			new.price_range_min := null;
			new.price_range_max := null;
			new.currency := 'EGP';
			new.match_confidence := null;
			new.is_unmatched := true;
		end if;
	end if;

	if btrim(coalesce(new.unit_of_measure_ar, '')) = '' then
		new.unit_of_measure_ar := new.unit_of_measure;
	end if;

	return new;
end;
$$;

drop trigger if exists quote_request_items_customer_normalize on public.quote_request_items;
create trigger quote_request_items_customer_normalize
	before insert or update of product_id, customer_description, unit_of_measure, unit_of_measure_ar, price_range_min, price_range_max, currency
	on public.quote_request_items
	for each row
	execute function app_private.normalize_customer_quote_request_item();

create or replace function app_private.normalize_quote_item_unit_ar()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
	catalog_unit_ar text;
begin
	if btrim(coalesce(new.unit_of_measure_ar, '')) <> '' then
		return new;
	end if;

	if new.product_id is not null then
		select p.unit_of_measure_ar
		into catalog_unit_ar
		from public.products p
		where p.id = new.product_id;
	end if;

	new.unit_of_measure_ar := coalesce(
		nullif(btrim(catalog_unit_ar), ''),
		nullif(btrim(new.unit_of_measure), ''),
		'unit'
	);
	return new;
end;
$$;

drop trigger if exists quote_items_unit_ar_normalize on public.quote_items;
create trigger quote_items_unit_ar_normalize
	before insert or update of product_id, unit_of_measure, unit_of_measure_ar
	on public.quote_items
	for each row
	execute function app_private.normalize_quote_item_unit_ar();
