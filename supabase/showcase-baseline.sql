select set_config('app.audited_registry_write', 'on', false);

insert into public.categories (slug, name, name_ar, description, description_ar)
values
	('tree', 'Tree', 'خشب', 'Wood and timber materials.', 'مواد الخشب والأخشاب.'),
	('steel', 'Steel', 'حديد', 'Steel reinforcement and profiles.', 'حديد التسليح والقطاعات المعدنية.'),
	('cement', 'Cement', 'أسمنت', 'Cement and concrete materials.', 'مواد الأسمنت والخرسانة.')
on conflict (slug) do update
set
	name = excluded.name,
	name_ar = excluded.name_ar,
	description = excluded.description,
	description_ar = excluded.description_ar,
	is_active = true;

update public.suppliers
set
	name = 'HyperQuote Showcase Supplier',
	phone = '+201000000004',
	status = 'active'
where email = 'supplier@hyperquote.net';

insert into public.suppliers (name, phone, email)
select 'HyperQuote Showcase Supplier', '+201000000004', 'supplier@hyperquote.net'
where not exists (
	select 1
	from public.suppliers
	where email = 'supplier@hyperquote.net'
);

with seed_products (
	sku,
	slug,
	name,
	name_ar,
	description,
	description_ar,
	category,
	subcategory,
	subcategory_ar,
	unit_of_measure,
	unit_of_measure_ar,
	price_range_min,
	price_range_max,
	price_tier,
	tags,
	on_hand_quantity,
	minimum_quantity,
	good_quantity,
	raw_cost
) as (
	values
		('WOOD-001', 'wood', 'Wood', 'خشب', 'General construction wood.', 'خشب عام للاستخدامات الإنشائية.', 'tree', 'wood', 'خشب', 'piece', 'قطعة', 180, 260, 'budget'::public.price_tier, array['wood', 'tree'], 120, 20, 80, 145),
		('PLY-001', 'plywood', 'Plywood', 'أبلكاش', 'Plywood sheets for formwork and finishing.', 'ألواح أبلكاش للشدة والتشطيبات.', 'tree', 'sheets', 'ألواح', 'sheet', 'لوح', 420, 620, 'mid_range'::public.price_tier, array['wood', 'sheet'], 90, 15, 60, 330),
		('TIM-001', 'timber-beam', 'Timber Beam', 'كمرة خشب', 'Timber beams for temporary works.', 'كمرات خشب للأعمال المؤقتة.', 'tree', 'beams', 'كمرات', 'piece', 'قطعة', 650, 950, 'premium'::public.price_tier, array['wood', 'beam'], 55, 10, 35, 520),
		('REBAR-001', 'steel-rebar', 'Rebar', 'حديد تسليح', 'Reinforcement steel bars.', 'أسياخ حديد تسليح.', 'steel', 'rebar', 'تسليح', 'ton', 'طن', 38000, 43000, 'mid_range'::public.price_tier, array['steel', 'rebar'], 30, 5, 20, 34200),
		('MESH-001', 'steel-mesh', 'Steel Mesh', 'شبك حديد', 'Welded steel mesh sheets.', 'ألواح شبك حديد ملحوم.', 'steel', 'mesh', 'شبك', 'sheet', 'لوح', 1250, 1700, 'mid_range'::public.price_tier, array['steel', 'mesh'], 75, 12, 45, 980),
		('ANGLE-001', 'steel-angle', 'Steel Angle', 'زاوية حديد', 'Steel angle profiles.', 'زوايا حديد للتركيب والتدعيم.', 'steel', 'profiles', 'قطاعات', 'piece', 'قطعة', 210, 360, 'budget'::public.price_tier, array['steel', 'profile'], 140, 25, 90, 165),
		('CEM-001', 'portland-cement', 'Cement', 'أسمنت', 'Standard cement bags.', 'أكياس أسمنت قياسي.', 'cement', 'cement', 'أسمنت', 'bag', 'كيس', 185, 230, 'budget'::public.price_tier, array['cement', 'bag'], 800, 100, 500, 142),
		('WHITE-001', 'white-cement', 'White Cement', 'أسمنت أبيض', 'White cement for finishing.', 'أسمنت أبيض لأعمال التشطيب.', 'cement', 'cement', 'أسمنت', 'bag', 'كيس', 280, 360, 'mid_range'::public.price_tier, array['cement', 'white'], 260, 40, 160, 220),
		('CONC-001', 'ready-mix-concrete', 'Ready Mix', 'خرسانة جاهزة', 'Ready mix concrete per cubic meter.', 'خرسانة جاهزة بالمتر المكعب.', 'cement', 'concrete', 'خرسانة', 'm3', 'متر مكعب', 1350, 1900, 'premium'::public.price_tier, array['concrete', 'ready-mix'], 45, 8, 30, 1120)
),
upserted_products as (
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
	select
		sku,
		slug,
		name,
		name_ar,
		description,
		description_ar,
		category,
		subcategory,
		subcategory_ar,
		'{}'::jsonb,
		'{}'::jsonb,
		unit_of_measure,
		unit_of_measure_ar,
		price_range_min,
		price_range_max,
		price_tier,
		'available'::public.catalog_availability_status,
		'{}'::text[],
		tags,
		true,
		true
	from seed_products
	on conflict (slug) do update
	set
		sku = excluded.sku,
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
		is_active = excluded.is_active
	returning id, sku
)
insert into public.inventory_stock (
	product_id,
	on_hand_quantity,
	reserved_quantity,
	minimum_quantity,
	good_quantity
)
select
	upserted_products.id,
	seed_products.on_hand_quantity,
	0,
	seed_products.minimum_quantity,
	seed_products.good_quantity
from upserted_products
join seed_products using (sku)
on conflict (product_id) do update
set
	on_hand_quantity = excluded.on_hand_quantity,
	reserved_quantity = excluded.reserved_quantity,
	minimum_quantity = excluded.minimum_quantity,
	good_quantity = excluded.good_quantity;

with seed_products (sku, raw_cost) as (
	values
		('WOOD-001', 145),
		('PLY-001', 330),
		('TIM-001', 520),
		('REBAR-001', 34200),
		('MESH-001', 980),
		('ANGLE-001', 165),
		('CEM-001', 142),
		('WHITE-001', 220),
		('CONC-001', 1120)
)
insert into public.supplier_product_links (
	supplier_id,
	product_id,
	raw_cost,
	lead_time_days,
	min_order_qty,
	is_primary,
	last_quoted_at
)
select suppliers.id, products.id, seed_products.raw_cost, 1, 1, true, now()
from public.suppliers
cross join seed_products
join public.products on products.sku = seed_products.sku
where suppliers.email = 'supplier@hyperquote.net'
on conflict (supplier_id, product_id) do update
set
	raw_cost = excluded.raw_cost,
	lead_time_days = excluded.lead_time_days,
	min_order_qty = excluded.min_order_qty,
	is_primary = excluded.is_primary,
	last_quoted_at = excluded.last_quoted_at;

select set_config('app.audited_registry_write', '', false);
