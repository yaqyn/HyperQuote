select set_config('app.audited_registry_write', 'on', false);

insert into public.categories (slug, name, name_ar, description, description_ar)
values ('tree', 'Tree', 'شجر', '', '')
on conflict (slug) do update
set
	name = excluded.name,
	name_ar = excluded.name_ar,
	description = excluded.description,
	description_ar = excluded.description_ar,
	is_active = true;

update public.suppliers
set
	name = 'Supplier',
	phone = '+201000000004',
	status = 'active'
where email = 'supplier@supplier.supplier';

insert into public.suppliers (name, phone, email)
select 'Supplier', '+201000000004', 'supplier@supplier.supplier'
where not exists (
	select 1
	from public.suppliers
	where email = 'supplier@supplier.supplier'
);

insert into public.products (
	sku,
	slug,
	name,
	name_ar,
	description,
	description_ar,
	category,
	subcategory,
	subcategory_ar,
	specifications,
	specifications_ar,
	unit_of_measure,
	unit_of_measure_ar,
	price_range_min,
	price_range_max,
	price_tier,
	availability_status,
	image_urls,
	tags,
	is_stockable,
	is_active
)
values (
	'WOOD',
	'wood',
	'Wood',
	'خشب',
	'Wood',
	'خشب',
	'tree',
	'tree',
	'شجر',
	'{}'::jsonb,
	'{}'::jsonb,
	'piece',
	'قطعة',
	1,
	1,
	'budget',
	'available',
	'{}'::text[],
	array['wood'],
	true,
	true
)
on conflict (sku) do update
set
	slug = excluded.slug,
	name = excluded.name,
	name_ar = excluded.name_ar,
	description = excluded.description,
	description_ar = excluded.description_ar,
	category = excluded.category,
	subcategory = excluded.subcategory,
	subcategory_ar = excluded.subcategory_ar,
	specifications = excluded.specifications,
	specifications_ar = excluded.specifications_ar,
	unit_of_measure = excluded.unit_of_measure,
	unit_of_measure_ar = excluded.unit_of_measure_ar,
	price_range_min = excluded.price_range_min,
	price_range_max = excluded.price_range_max,
	price_tier = excluded.price_tier,
	availability_status = excluded.availability_status,
	image_urls = excluded.image_urls,
	tags = excluded.tags,
	is_stockable = excluded.is_stockable,
	is_active = excluded.is_active;

insert into public.inventory_stock (
	product_id,
	on_hand_quantity,
	reserved_quantity,
	minimum_quantity,
	good_quantity
)
select id, 10, 0, 1, 10
from public.products
where slug = 'wood'
on conflict (product_id) do update
set
	on_hand_quantity = excluded.on_hand_quantity,
	reserved_quantity = excluded.reserved_quantity,
	minimum_quantity = excluded.minimum_quantity,
	good_quantity = excluded.good_quantity;

insert into public.supplier_product_links (
	supplier_id,
	product_id,
	raw_cost,
	lead_time_days,
	min_order_qty,
	is_primary
)
select suppliers.id, products.id, 1, 1, 1, true
from public.suppliers
cross join public.products
where suppliers.email = 'supplier@supplier.supplier'
	and products.slug = 'wood'
on conflict (supplier_id, product_id) do update
set
	raw_cost = excluded.raw_cost,
	lead_time_days = excluded.lead_time_days,
	min_order_qty = excluded.min_order_qty,
	is_primary = excluded.is_primary;

select set_config('app.audited_registry_write', '', false);
