revoke select on table public.products from anon;
revoke select on table public.products from authenticated;

grant select (
	id,
	sku,
	slug,
	name,
	name_ar,
	description,
	description_ar,
	category,
	subcategory,
	subcategory_ar,
	brand,
	manufacturer,
	specifications,
	specifications_ar,
	unit_of_measure,
	unit_of_measure_ar,
	weight_kg,
	price_range_min,
	price_range_max,
	price_tier,
	availability_status,
	image_urls,
	tags,
	is_stockable,
	is_active
) on public.products to anon, authenticated;

create index if not exists products_name_ar_trgm_idx
	on public.products using gin (name_ar gin_trgm_ops);

create index if not exists products_sku_trgm_idx
	on public.products using gin (sku gin_trgm_ops);

create index if not exists products_description_trgm_idx
	on public.products using gin (description gin_trgm_ops);

create index if not exists products_description_ar_trgm_idx
	on public.products using gin (description_ar gin_trgm_ops);

create index if not exists products_brand_trgm_idx
	on public.products using gin (brand gin_trgm_ops);
