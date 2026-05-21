revoke all privileges on table public.products from anon, authenticated;

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

grant select (updated_at) on public.products to authenticated;
