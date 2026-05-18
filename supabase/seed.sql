insert into public.categories (slug, name, name_ar)
values
	('cement', 'Cement', 'اسمنت'),
	('steel', 'Steel', 'حديد'),
	('aggregates', 'Aggregates', 'ركام'),
	('bricks', 'Bricks', 'طوب'),
	('timber', 'Timber', 'خشب'),
	('finishing', 'Finishing', 'تشطيبات')
on conflict (slug) do update
set name = excluded.name, name_ar = excluded.name_ar;

insert into public.suppliers (name, phone, email)
values
	('Cairo Building Materials', '+201000000001', 'ops+cairo-materials@hyperquote.local'),
	('Delta Steel Supply', '+201000000002', 'ops+delta-steel@hyperquote.local'),
	('Giza Aggregates Yard', '+201000000003', 'ops+giza-aggregates@hyperquote.local')
on conflict do nothing;

insert into public.products (
	sku,
	slug,
	name,
	name_ar,
	description,
	description_ar,
	category,
	subcategory,
	unit_of_measure,
	price_range_min,
	price_range_max,
	price_tier,
	availability_status,
	image_urls,
	tags,
	is_stockable
)
values
	(
		'CEM-OPC-42-5N',
		'portland-cement-cemi-42-5n',
		'Portland Cement CEM I 42.5N',
		'اسمنت بورتلاندي CEM I 42.5N',
		'General-purpose cement for concrete and masonry.',
		'اسمنت للاستخدام العام في الخرسانة والمباني.',
		'cement',
		'cement',
		'bag',
		82,
		95,
		'mid_range',
		'available',
		array['https://websiteassets.hyperquote.net/Images/cement.webp'],
		array['cement', 'concrete'],
		true
	),
	(
		'STL-RBR-16-G60',
		'steel-rebar-16mm-grade-60',
		'Steel Rebar 16mm Grade 60',
		'حديد تسليح 16 مم درجة 60',
		'High-strength reinforcing bar for structural concrete.',
		'حديد تسليح عالي المقاومة للخرسانة الانشائية.',
		'reinforcing_steel',
		'steel',
		'ton',
		31500,
		34500,
		'premium',
		'available',
		array['https://websiteassets.hyperquote.net/Images/steel.webp'],
		array['steel', 'rebar'],
		true
	),
	(
		'AGG-SND-FINE',
		'washed-sand-fine',
		'Washed Sand - Fine Grade',
		'رمل مغسول ناعم',
		'Fine washed sand for plastering and concrete mixes.',
		'رمل مغسول ناعم للمحارة وخلطات الخرسانة.',
		'sand',
		'aggregates',
		'cubic_meter',
		390,
		480,
		'budget',
		'available',
		array['https://websiteassets.hyperquote.net/Images/Aggregates.webp'],
		array['sand', 'aggregates'],
		true
	),
	(
		'BRK-RED-STD',
		'red-clay-bricks-standard',
		'Red Clay Bricks - Standard',
		'طوب احمر قياسي',
		'Standard red clay bricks for masonry walls.',
		'طوب احمر قياسي لاعمال المباني.',
		'bricks',
		'bricks',
		'thousand',
		2600,
		3100,
		'mid_range',
		'low_stock',
		array['https://websiteassets.hyperquote.net/Images/bricks.webp'],
		array['bricks', 'masonry'],
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
	unit_of_measure = excluded.unit_of_measure,
	price_range_min = excluded.price_range_min,
	price_range_max = excluded.price_range_max,
	price_tier = excluded.price_tier,
	availability_status = excluded.availability_status,
	image_urls = excluded.image_urls,
	tags = excluded.tags,
	is_stockable = excluded.is_stockable;

insert into public.inventory_stock (product_id, on_hand_quantity, reserved_quantity, minimum_quantity)
select id, 1000, 0, 100
from public.products
on conflict (product_id) do update
set on_hand_quantity = excluded.on_hand_quantity,
	reserved_quantity = excluded.reserved_quantity,
	minimum_quantity = excluded.minimum_quantity;
