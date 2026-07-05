select set_config('app.audited_registry_write', 'on', false);

insert into public.categories (slug, name, name_ar, description, description_ar)
values
	('cement', 'Cement Products', 'منتجات الأسمنت', 'Cement, concrete, and finishing cement materials.', 'مواد الأسمنت والخرسانة وأسمنت التشطيب.'),
	('steel', 'Steel Products', 'منتجات الحديد', 'Rebar, mesh, and steel profile materials.', 'حديد التسليح والشبك والقطاعات المعدنية.'),
	('timber', 'Wood Products', 'منتجات الخشب', 'Timber, plywood, and formwork wood materials.', 'الأخشاب والأبلكاش وخشب الشدة.')
on conflict (slug) do update
set
	name = excluded.name,
	name_ar = excluded.name_ar,
	description = excluded.description,
	description_ar = excluded.description_ar,
	is_active = true;

update public.categories
set is_active = false
where slug = 'tree';

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
		('CEM-WHT-EZZ-001', 'ezz-al-arab-white-cement', 'Ezz Al Arab White Cement', 'أسمنت أبيض عز العرب', 'White cement bags for premium finishing work.', 'أكياس أسمنت أبيض لأعمال التشطيب الممتازة.', 'cement', 'white-cement', 'أسمنت أبيض', 'bag', 'كيس', 310, 380, 'premium'::public.price_tier, array['cement', 'white-cement', 'ezz'], 260, 40, 160, 248),
		('CEM-WHT-MOD-001', 'modern-white-cement', 'Modern White Cement', 'أسمنت أبيض مودرن', 'White cement bags for tiles, plaster, and finishing.', 'أكياس أسمنت أبيض للبلاط والمحارة والتشطيب.', 'cement', 'white-cement', 'أسمنت أبيض', 'bag', 'كيس', 285, 350, 'mid_range'::public.price_tier, array['cement', 'white-cement', 'modern'], 240, 40, 150, 228),
		('CEM-OPC-LAF-001', 'lafarge-portland-cement', 'Lafarge Portland Cement', 'أسمنت بورتلاندي لافارج', 'Ordinary Portland cement bags for structural works.', 'أكياس أسمنت بورتلاندي للأعمال الإنشائية.', 'cement', 'portland-cement', 'أسمنت بورتلاندي', 'bag', 'كيس', 185, 235, 'mid_range'::public.price_tier, array['cement', 'portland', 'lafarge'], 900, 120, 560, 148),
		('CEM-OPC-SUEZ-001', 'suez-portland-cement', 'Suez Portland Cement', 'أسمنت بورتلاندي السويس', 'Portland cement bags for concrete and masonry.', 'أكياس أسمنت بورتلاندي للخرسانة والمباني.', 'cement', 'portland-cement', 'أسمنت بورتلاندي', 'bag', 'كيس', 175, 225, 'budget'::public.price_tier, array['cement', 'portland', 'suez'], 840, 120, 540, 140),
		('CEM-RMX-C25-001', 'cemex-ready-mix-c25', 'Cemex Ready Mix Concrete C25', 'خرسانة جاهزة سيمكس C25', 'C25 ready mix concrete supplied per cubic meter.', 'خرسانة جاهزة C25 بالمتر المكعب.', 'cement', 'ready-mix-concrete', 'خرسانة جاهزة', 'm3', 'متر مكعب', 1320, 1780, 'mid_range'::public.price_tier, array['concrete', 'ready-mix', 'cemex'], 55, 8, 32, 1110),
		('CEM-RMX-LAF-C30-001', 'lafarge-ready-mix-c30', 'Lafarge Ready Mix Concrete C30', 'خرسانة جاهزة لافارج C30', 'C30 ready mix concrete supplied per cubic meter.', 'خرسانة جاهزة C30 بالمتر المكعب.', 'cement', 'ready-mix-concrete', 'خرسانة جاهزة', 'm3', 'متر مكعب', 1480, 1980, 'premium'::public.price_tier, array['concrete', 'ready-mix', 'lafarge'], 48, 8, 30, 1240),
		('STL-RBR-EZZ-12-001', 'ezz-rebar-12mm', 'Ezz Rebar 12mm', 'حديد تسليح عز 12 مم', '12mm Ezz rebar supplied by ton.', 'حديد تسليح عز 12 مم بالطن.', 'steel', 'rebar', 'حديد تسليح', 'ton', 'طن', 38500, 43800, 'premium'::public.price_tier, array['steel', 'rebar', 'ezz'], 36, 5, 22, 34900),
		('STL-RBR-BES-16-001', 'beshay-rebar-16mm', 'Beshay Rebar 16mm', 'حديد تسليح بشاي 16 مم', '16mm Beshay rebar supplied by ton.', 'حديد تسليح بشاي 16 مم بالطن.', 'steel', 'rebar', 'حديد تسليح', 'ton', 'طن', 37200, 42600, 'mid_range'::public.price_tier, array['steel', 'rebar', 'beshay'], 32, 5, 20, 33750),
		('STL-MSH-EGY-A142-001', 'egyptian-steel-mesh-a142', 'Egyptian Steel Mesh A142', 'شبك حديد المصريين A142', 'A142 welded steel mesh sheets.', 'ألواح شبك حديد ملحوم A142.', 'steel', 'steel-mesh', 'شبك حديد', 'sheet', 'لوح', 1180, 1580, 'mid_range'::public.price_tier, array['steel', 'mesh', 'a142'], 90, 12, 56, 940),
		('STL-MSH-EZZ-A193-001', 'ezz-welded-mesh-a193', 'Ezz Welded Mesh A193', 'شبك حديد عز A193', 'A193 welded steel mesh sheets.', 'ألواح شبك حديد ملحوم A193.', 'steel', 'steel-mesh', 'شبك حديد', 'sheet', 'لوح', 1390, 1820, 'premium'::public.price_tier, array['steel', 'mesh', 'a193', 'ezz'], 80, 12, 48, 1080),
		('STL-PRF-BES-IPE-001', 'beshay-ipe-steel-profile', 'Beshay IPE Steel Profile', 'قطاع حديد IPE بشاي', 'IPE steel profile for structural framing.', 'قطاع حديد IPE للأعمال الإنشائية.', 'steel', 'steel-profiles', 'قطاعات حديد', 'piece', 'قطعة', 760, 1180, 'premium'::public.price_tier, array['steel', 'profile', 'ipe'], 96, 16, 60, 620),
		('STL-PRF-SUEZ-ANG-001', 'suez-steel-angle-profile', 'Suez Steel Angle Profile', 'زاوية حديد السويس', 'Steel angle profile for support and installation.', 'زاوية حديد للتدعيم والتركيب.', 'steel', 'steel-profiles', 'قطاعات حديد', 'piece', 'قطعة', 220, 370, 'budget'::public.price_tier, array['steel', 'profile', 'angle'], 150, 25, 92, 168),
		('WOD-TMB-SWE-PINE-001', 'swedish-pine-timber', 'Swedish Pine Timber', 'خشب سويدي موسكي', 'Swedish pine timber for framing and formwork.', 'خشب سويدي موسكي للشدة والأعمال الخشبية.', 'timber', 'structural-timber', 'خشب إنشائي', 'piece', 'قطعة', 210, 310, 'mid_range'::public.price_tier, array['wood', 'timber', 'pine'], 130, 20, 82, 164),
		('WOD-TMB-ROM-WW-001', 'romanian-whitewood-timber', 'Romanian Whitewood Timber', 'خشب روماني أبيض', 'Romanian whitewood timber for construction use.', 'خشب روماني أبيض للاستخدامات الإنشائية.', 'timber', 'structural-timber', 'خشب إنشائي', 'piece', 'قطعة', 190, 285, 'budget'::public.price_tier, array['wood', 'timber', 'whitewood'], 118, 20, 76, 150),
		('WOD-PLY-MRN-18-001', 'marine-plywood-18mm', 'Marine Plywood 18mm', 'أبلكاش بحري 18 مم', '18mm marine plywood sheets for durable formwork.', 'ألواح أبلكاش بحري 18 مم للشدة المتينة.', 'timber', 'plywood', 'أبلكاش', 'sheet', 'لوح', 720, 980, 'premium'::public.price_tier, array['wood', 'plywood', 'marine'], 72, 12, 46, 570),
		('WOD-PLY-FILM-18-001', 'film-faced-plywood-18mm', 'Film Faced Plywood 18mm', 'أبلكاش فيلم 18 مم', '18mm film faced plywood sheets for repeated pours.', 'ألواح أبلكاش فيلم 18 مم للاستخدام المتكرر.', 'timber', 'plywood', 'أبلكاش', 'sheet', 'لوح', 620, 860, 'mid_range'::public.price_tier, array['wood', 'plywood', 'film-faced'], 84, 12, 54, 495),
		('WOD-FRM-RED-001', 'red-formwork-board', 'Red Formwork Board', 'لوح شدة أحمر', 'Red formwork boards for concrete shuttering.', 'ألواح شدة حمراء لصب الخرسانة.', 'timber', 'formwork-boards', 'ألواح شدة', 'piece', 'قطعة', 155, 235, 'budget'::public.price_tier, array['wood', 'formwork', 'board'], 170, 25, 110, 118),
		('WOD-FRM-WHT-001', 'white-formwork-board', 'White Formwork Board', 'لوح شدة أبيض', 'White formwork boards for clean concrete work.', 'ألواح شدة بيضاء لأعمال الخرسانة النظيفة.', 'timber', 'formwork-boards', 'ألواح شدة', 'piece', 'قطعة', 175, 260, 'mid_range'::public.price_tier, array['wood', 'formwork', 'board'], 150, 25, 96, 136)
),
retired_products as (
	update public.products
	set
		is_active = false,
		availability_status = 'hidden'::public.catalog_availability_status
	where slug in (
		'wood',
		'plywood',
		'timber-beam',
		'steel-rebar',
		'steel-mesh',
		'steel-angle',
		'portland-cement',
		'white-cement',
		'ready-mix-concrete'
	)
	and slug not in (select slug from seed_products)
	returning id
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
		('CEM-WHT-EZZ-001', 248),
		('CEM-WHT-MOD-001', 228),
		('CEM-OPC-LAF-001', 148),
		('CEM-OPC-SUEZ-001', 140),
		('CEM-RMX-C25-001', 1110),
		('CEM-RMX-LAF-C30-001', 1240),
		('STL-RBR-EZZ-12-001', 34900),
		('STL-RBR-BES-16-001', 33750),
		('STL-MSH-EGY-A142-001', 940),
		('STL-MSH-EZZ-A193-001', 1080),
		('STL-PRF-BES-IPE-001', 620),
		('STL-PRF-SUEZ-ANG-001', 168),
		('WOD-TMB-SWE-PINE-001', 164),
		('WOD-TMB-ROM-WW-001', 150),
		('WOD-PLY-MRN-18-001', 570),
		('WOD-PLY-FILM-18-001', 495),
		('WOD-FRM-RED-001', 118),
		('WOD-FRM-WHT-001', 136)
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
