-- Migration 008: Seed Products
-- 25 realistic Egyptian building materials across 19 categories.
-- Prices in EGP, realistic for Egyptian market (2024-2026).

-- Ensure seed tenant exists (idempotent)
INSERT INTO tenants (id, name, slug, domain, currency, timezone)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'HyperQuote Demo', 'hyperquote-demo', 'demo.hyperquote.net',
  'EGP', 'Africa/Cairo'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO products (
  tenant_id, sku, slug, name, name_ar, description, description_ar,
  category, subcategory, brand, manufacturer,
  specifications, unit_of_measure, weight_kg,
  price_range_min, price_range_max, price_tier,
  availability_status, image_urls, tags, is_active, is_stockable
) VALUES

-- ============================================================================
-- CEMENT (3)
-- ============================================================================
(
  '00000000-0000-0000-0000-000000000001',
  'CEM-OPC-425-50', 'portland-cement-cem-i-425n-50kg',
  'Portland Cement CEM I 42.5N 50kg', 'اسمنت بورتلاند CEM I 42.5N 50 كجم',
  'Ordinary Portland Cement conforming to ES 4756-1, ideal for general construction.',
  'اسمنت بورتلاند عادي مطابق للمواصفة المصرية ES 4756-1، مناسب للبناء العام.',
  'cement', 'opc', 'Sinai Cement', 'Sinai Cement Company',
  '{"standard": "ES 4756-1", "strength_class": "42.5N", "setting_time_min": "45 min", "origin": "Egypt"}'::jsonb,
  'bag_50kg', 50.0,
  85.00, 110.00, 'mid_range',
  'available',
  ARRAY['https://websiteassets.hyperquote.net/Images/cairo.webp'],
  ARRAY['cement', 'opc', 'construction'], TRUE, TRUE
),
(
  '00000000-0000-0000-0000-000000000001',
  'CEM-SRC-425-50', 'sulfate-resistant-cement-50kg',
  'Sulfate Resistant Cement CEM I 42.5N-SR 50kg', 'اسمنت مقاوم للكبريتات CEM I 42.5N-SR 50 كجم',
  'Sulfate resistant cement for foundations in saline soil conditions common in coastal Egypt.',
  'اسمنت مقاوم للكبريتات للأساسات في التربة الملحية الشائعة في المناطق الساحلية.',
  'cement', 'src', 'Suez Cement', 'Suez Cement Company',
  '{"standard": "ES 4756-1", "strength_class": "42.5N-SR", "c3a_max": "3.5%", "origin": "Egypt"}'::jsonb,
  'bag_50kg', 50.0,
  95.00, 130.00, 'mid_range',
  'available',
  ARRAY['https://websiteassets.hyperquote.net/Images/cairo.webp'],
  ARRAY['cement', 'sulfate-resistant', 'foundations'], TRUE, TRUE
),
(
  '00000000-0000-0000-0000-000000000001',
  'CEM-WPC-50', 'white-portland-cement-50kg',
  'White Portland Cement 50kg', 'اسمنت بورتلاند أبيض 50 كجم',
  'Premium white cement for architectural finishes and decorative applications.',
  'اسمنت أبيض ممتاز للتشطيبات المعمارية والتطبيقات الزخرفية.',
  'cement', 'white', 'Helwan Cement', 'Helwan Cement Company',
  '{"standard": "ES 583", "whiteness": ">85%", "origin": "Egypt"}'::jsonb,
  'bag_50kg', 50.0,
  180.00, 250.00, 'premium',
  'available',
  ARRAY['https://websiteassets.hyperquote.net/Images/cairo.webp'],
  ARRAY['cement', 'white', 'decorative'], TRUE, TRUE
),

-- ============================================================================
-- REINFORCING STEEL (2)
-- ============================================================================
(
  '00000000-0000-0000-0000-000000000001',
  'STL-REBAR-12-B500', 'steel-rebar-12mm-b500b',
  'Steel Rebar 12mm B500B', 'حديد تسليح 12 مم B500B',
  'High-strength deformed steel rebar 12mm diameter, grade B500B, per Egyptian standards.',
  'حديد تسليح عالي المقاومة قطر 12 مم درجة B500B طبقا للمواصفات المصرية.',
  'reinforcing_steel', '12mm', 'Ezz Steel', 'Ezz Dekhela Steel',
  '{"diameter_mm": 12, "grade": "B500B", "yield_strength_mpa": 500, "length_m": 12, "standard": "ES 262", "origin": "Egypt"}'::jsonb,
  'ton', 888.0,
  38000.00, 42000.00, 'mid_range',
  'available',
  ARRAY['https://websiteassets.hyperquote.net/Images/cairo.webp'],
  ARRAY['steel', 'rebar', 'reinforcement'], TRUE, TRUE
),
(
  '00000000-0000-0000-0000-000000000001',
  'STL-REBAR-16-B500', 'steel-rebar-16mm-b500b',
  'Steel Rebar 16mm B500B', 'حديد تسليح 16 مم B500B',
  'High-strength deformed steel rebar 16mm diameter, grade B500B.',
  'حديد تسليح عالي المقاومة قطر 16 مم درجة B500B.',
  'reinforcing_steel', '16mm', 'Ezz Steel', 'Ezz Dekhela Steel',
  '{"diameter_mm": 16, "grade": "B500B", "yield_strength_mpa": 500, "length_m": 12, "standard": "ES 262", "origin": "Egypt"}'::jsonb,
  'ton', 888.0,
  37500.00, 41500.00, 'mid_range',
  'low_stock',
  ARRAY['https://websiteassets.hyperquote.net/Images/cairo.webp'],
  ARRAY['steel', 'rebar', 'reinforcement'], TRUE, TRUE
),

-- ============================================================================
-- STRUCTURAL STEEL (1)
-- ============================================================================
(
  '00000000-0000-0000-0000-000000000001',
  'STL-IPE-200', 'steel-ipe-200-beam',
  'Steel IPE 200 Beam', 'كمرة حديد IPE 200',
  'Hot-rolled IPE 200 structural steel beam, 12m length.',
  'كمرة حديد IPE 200 مدرفلة على الساخن، طول 12 متر.',
  'structural_steel', 'ipe', 'Beshay Steel', 'Beshay Steel Group',
  '{"section": "IPE 200", "height_mm": 200, "width_mm": 100, "weight_kg_per_m": 22.4, "length_m": 12, "standard": "EN 10025", "origin": "Egypt"}'::jsonb,
  'ton', 268.8,
  42000.00, 48000.00, 'premium',
  'available',
  ARRAY['https://websiteassets.hyperquote.net/Images/cairo.webp'],
  ARRAY['steel', 'structural', 'beam'], TRUE, TRUE
),

-- ============================================================================
-- AGGREGATES (2)
-- ============================================================================
(
  '00000000-0000-0000-0000-000000000001',
  'AGG-CRUSH-20', 'crushed-stone-aggregate-20mm',
  'Crushed Stone Aggregate 20mm', 'زلط مكسر 20 مم',
  'Crushed limestone aggregate 20mm nominal size for concrete mix.',
  'زلط حجر جيري مكسر مقاس 20 مم للخلطات الخرسانية.',
  'aggregates', '20mm', NULL, 'Ain Sokhna Quarries',
  '{"nominal_size_mm": 20, "type": "crushed_limestone", "los_angeles_abrasion": "<30%", "origin": "Egypt"}'::jsonb,
  'cubic_meter', NULL,
  280.00, 380.00, 'budget',
  'available',
  ARRAY['https://websiteassets.hyperquote.net/Images/cairo.webp'],
  ARRAY['aggregate', 'crushed-stone', 'concrete'], TRUE, TRUE
),
(
  '00000000-0000-0000-0000-000000000001',
  'AGG-GRAVEL-10', 'gravel-aggregate-10mm',
  'Gravel Aggregate 10mm', 'حصى 10 مم',
  'Natural gravel 10mm for fine concrete work and plastering.',
  'حصى طبيعي 10 مم للأعمال الخرسانية الدقيقة والبياض.',
  'aggregates', '10mm', NULL, 'Fayoum Quarries',
  '{"nominal_size_mm": 10, "type": "natural_gravel", "origin": "Egypt"}'::jsonb,
  'cubic_meter', NULL,
  250.00, 350.00, 'budget',
  'available',
  ARRAY['https://websiteassets.hyperquote.net/Images/cairo.webp'],
  ARRAY['aggregate', 'gravel', 'plastering'], TRUE, TRUE
),

-- ============================================================================
-- SAND (1)
-- ============================================================================
(
  '00000000-0000-0000-0000-000000000001',
  'SND-WASH-01', 'washed-sand-concrete-grade',
  'Washed Sand (Concrete Grade)', 'رمل مغسول (درجة خرسانية)',
  'Clean washed sand suitable for concrete and mortar applications.',
  'رمل مغسول نظيف مناسب للخرسانة والمونة.',
  'sand', 'washed', NULL, 'Suez Quarries',
  '{"type": "washed", "fineness_modulus": "2.5-3.0", "silt_content_max": "3%", "origin": "Egypt"}'::jsonb,
  'cubic_meter', NULL,
  180.00, 260.00, 'budget',
  'available',
  ARRAY['https://websiteassets.hyperquote.net/Images/cairo.webp'],
  ARRAY['sand', 'washed', 'concrete'], TRUE, TRUE
),

-- ============================================================================
-- READY MIX CONCRETE (1)
-- ============================================================================
(
  '00000000-0000-0000-0000-000000000001',
  'RMC-C350-01', 'ready-mix-concrete-c350',
  'Ready Mix Concrete C350 (35 MPa)', 'خرسانة جاهزة C350 (35 ميجا باسكال)',
  'Ready mix concrete grade C350 (35 MPa) with 8cm slump, delivered by mixer truck.',
  'خرسانة جاهزة درجة C350 (35 ميجا باسكال) بهبوط 8 سم، توصيل بسيارة خلاطة.',
  'ready_mix_concrete', 'c350', 'AMIC', 'Arabian Mix Industrial Co.',
  '{"grade": "C350", "strength_mpa": 35, "slump_cm": 8, "max_aggregate_mm": 20, "origin": "Egypt"}'::jsonb,
  'cubic_meter', NULL,
  1800.00, 2400.00, 'mid_range',
  'available',
  ARRAY['https://websiteassets.hyperquote.net/Images/cairo.webp'],
  ARRAY['concrete', 'ready-mix', 'c350'], TRUE, FALSE
),

-- ============================================================================
-- BRICKS (2)
-- ============================================================================
(
  '00000000-0000-0000-0000-000000000001',
  'BRK-RED-STD', 'red-clay-brick-standard',
  'Red Clay Brick Standard 25x12x6.5cm', 'طوب أحمر قياسي 25x12x6.5 سم',
  'Standard fired red clay brick for walls and partitions.',
  'طوب أحمر مشوي قياسي للحوائط والقواطع.',
  'bricks', 'red_clay', NULL, 'Helwan Brick Factory',
  '{"dimensions_cm": "25x12x6.5", "compressive_strength_mpa": 7, "absorption_max": "22%", "origin": "Egypt"}'::jsonb,
  'piece', 2.8,
  1.50, 2.50, 'budget',
  'available',
  ARRAY['https://websiteassets.hyperquote.net/Images/cairo.webp'],
  ARRAY['brick', 'red', 'wall'], TRUE, TRUE
),
(
  '00000000-0000-0000-0000-000000000001',
  'BRK-SAND-LIM', 'sand-lime-brick-standard',
  'Sand Lime Brick 25x12x6.5cm', 'طوب رملي جيري 25x12x6.5 سم',
  'Autoclaved sand lime brick with smooth finish for interior walls.',
  'طوب رملي جيري بتشطيب ناعم للحوائط الداخلية.',
  'bricks', 'sand_lime', NULL, 'October Brick Co.',
  '{"dimensions_cm": "25x12x6.5", "compressive_strength_mpa": 10, "origin": "Egypt"}'::jsonb,
  'piece', 3.2,
  2.00, 3.50, 'mid_range',
  'low_stock',
  ARRAY['https://websiteassets.hyperquote.net/Images/cairo.webp'],
  ARRAY['brick', 'sand-lime', 'interior'], TRUE, TRUE
),

-- ============================================================================
-- BLOCKS (1)
-- ============================================================================
(
  '00000000-0000-0000-0000-000000000001',
  'BLK-CONC-20', 'concrete-block-20cm-hollow',
  'Concrete Block 20cm Hollow', 'بلوك خرساني 20 سم مفرغ',
  'Hollow concrete block 40x20x20cm for load-bearing and partition walls.',
  'بلوك خرساني مفرغ 40x20x20 سم للحوائط الحاملة والقواطع.',
  'blocks', 'hollow', NULL, 'National Block Co.',
  '{"dimensions_cm": "40x20x20", "compressive_strength_mpa": 5, "hollows": 2, "origin": "Egypt"}'::jsonb,
  'piece', 12.5,
  8.00, 14.00, 'budget',
  'available',
  ARRAY['https://websiteassets.hyperquote.net/Images/cairo.webp'],
  ARRAY['block', 'concrete', 'hollow'], TRUE, TRUE
),

-- ============================================================================
-- TILES CERAMIC (1)
-- ============================================================================
(
  '00000000-0000-0000-0000-000000000001',
  'TIL-CER-60', 'ceramic-floor-tile-60x60',
  'Ceramic Floor Tile 60x60cm Matt', 'بلاط سيراميك أرضي 60x60 سم مطفي',
  'First choice ceramic floor tile 60x60cm with matt finish, made in Egypt.',
  'بلاط سيراميك أرضي درجة أولى 60x60 سم تشطيب مطفي، صنع مصر.',
  'tiles_ceramic', 'floor', 'Cleopatra Group', 'Cleopatra Ceramics',
  '{"size_cm": "60x60", "finish": "matt", "thickness_mm": 9, "pei_rating": 4, "grade": "first_choice", "origin": "Egypt"}'::jsonb,
  'square_meter', NULL,
  120.00, 180.00, 'mid_range',
  'available',
  ARRAY['https://websiteassets.hyperquote.net/Images/cairo.webp'],
  ARRAY['tile', 'ceramic', 'floor'], TRUE, TRUE
),

-- ============================================================================
-- TILES PORCELAIN (1)
-- ============================================================================
(
  '00000000-0000-0000-0000-000000000001',
  'TIL-POR-80', 'porcelain-floor-tile-80x80-polished',
  'Porcelain Floor Tile 80x80cm Polished', 'بورسلين أرضي 80x80 سم مصقول',
  'Premium polished porcelain tile 80x80cm, marble effect, first choice.',
  'بورسلين مصقول ممتاز 80x80 سم بتأثير رخامي، درجة أولى.',
  'tiles_porcelain', 'floor', 'Lecico', 'Lecico Egypt',
  '{"size_cm": "80x80", "finish": "polished", "thickness_mm": 10, "water_absorption": "<0.5%", "grade": "first_choice", "origin": "Egypt"}'::jsonb,
  'square_meter', NULL,
  280.00, 420.00, 'premium',
  'available',
  ARRAY['https://websiteassets.hyperquote.net/Images/cairo.webp'],
  ARRAY['tile', 'porcelain', 'polished'], TRUE, TRUE
),

-- ============================================================================
-- PAINT (2)
-- ============================================================================
(
  '00000000-0000-0000-0000-000000000001',
  'PNT-INT-WHT-18', 'interior-emulsion-paint-white-18l',
  'Interior Emulsion Paint White 18L', 'دهان بلاستيك داخلي أبيض 18 لتر',
  'High-quality interior emulsion paint, brilliant white, washable finish.',
  'دهان بلاستيك داخلي عالي الجودة، أبيض لامع، قابل للغسيل.',
  'paint', 'interior_emulsion', 'Sipes', 'Sipes Paints Egypt',
  '{"volume_l": 18, "finish": "matt", "coverage_sqm_per_l": 12, "coats": 2, "color": "brilliant_white", "origin": "Egypt"}'::jsonb,
  'unit', 25.0,
  650.00, 900.00, 'mid_range',
  'available',
  ARRAY['https://websiteassets.hyperquote.net/Images/cairo.webp'],
  ARRAY['paint', 'interior', 'white', 'emulsion'], TRUE, TRUE
),
(
  '00000000-0000-0000-0000-000000000001',
  'PNT-EXT-ACR-18', 'exterior-acrylic-paint-18l',
  'Exterior Acrylic Paint 18L', 'دهان أكريليك خارجي 18 لتر',
  'Weather-resistant exterior acrylic paint, UV stable, for facades.',
  'دهان أكريليك خارجي مقاوم للعوامل الجوية، ثابت ضد الأشعة فوق البنفسجية.',
  'paint', 'exterior_acrylic', 'Jotun', 'Jotun Egypt',
  '{"volume_l": 18, "finish": "semi_gloss", "coverage_sqm_per_l": 10, "coats": 2, "origin": "Norway/Egypt"}'::jsonb,
  'unit', 28.0,
  1200.00, 1800.00, 'premium',
  'low_stock',
  ARRAY['https://websiteassets.hyperquote.net/Images/cairo.webp'],
  ARRAY['paint', 'exterior', 'acrylic', 'facade'], TRUE, TRUE
),

-- ============================================================================
-- WATERPROOFING (1)
-- ============================================================================
(
  '00000000-0000-0000-0000-000000000001',
  'WPR-BIT-MEM', 'bituminous-waterproofing-membrane-4mm',
  'Bituminous Waterproofing Membrane 4mm', 'لفائف عزل بيتومين 4 مم',
  'Modified bituminous waterproofing membrane, 4mm thick, torch-applied.',
  'لفائف عزل مائي بيتومين معدل، سمك 4 مم، لحام بالشعلة.',
  'waterproofing', 'bituminous_membrane', 'Index', 'Index SpA / Egypt',
  '{"thickness_mm": 4, "roll_size_sqm": 10, "application": "torch_applied", "reinforcement": "polyester", "origin": "Italy/Egypt"}'::jsonb,
  'roll', 28.0,
  350.00, 520.00, 'mid_range',
  'available',
  ARRAY['https://websiteassets.hyperquote.net/Images/cairo.webp'],
  ARRAY['waterproofing', 'bitumen', 'membrane'], TRUE, TRUE
),

-- ============================================================================
-- PIPES PVC (1)
-- ============================================================================
(
  '00000000-0000-0000-0000-000000000001',
  'PIP-PVC-110', 'pvc-pipe-110mm-6m',
  'PVC Pipe 110mm x 6m', 'ماسورة PVC 110 مم × 6 متر',
  'uPVC pressure pipe 110mm diameter, 6m length, for drainage and sewage.',
  'ماسورة PVC صلبة قطر 110 مم طول 6 متر للصرف الصحي.',
  'pipes_pvc', 'drainage', 'Abo El-Wafa', 'Abo El-Wafa Pipes',
  '{"diameter_mm": 110, "length_m": 6, "pressure_class": "PN6", "standard": "ES 993", "origin": "Egypt"}'::jsonb,
  'length', 3.5,
  85.00, 140.00, 'budget',
  'available',
  ARRAY['https://websiteassets.hyperquote.net/Images/cairo.webp'],
  ARRAY['pipe', 'pvc', 'drainage'], TRUE, TRUE
),

-- ============================================================================
-- ELECTRICAL CABLE (1)
-- ============================================================================
(
  '00000000-0000-0000-0000-000000000001',
  'ELC-CBL-25-100', 'electrical-cable-2x5mm-100m',
  'Electrical Cable 2x2.5mm 100m', 'سلك كهربائي 2×2.5 مم 100 متر',
  'Copper electrical cable 2x2.5mm, PVC insulated, 100m roll.',
  'سلك كهربائي نحاسي 2×2.5 مم معزول PVC، لفة 100 متر.',
  'electrical_cable', 'power', 'Elsewedy', 'Elsewedy Electric',
  '{"cores": 2, "cross_section_mm2": 2.5, "length_m": 100, "insulation": "PVC", "conductor": "copper", "standard": "ES 2142", "origin": "Egypt"}'::jsonb,
  'coil', 12.0,
  1800.00, 2600.00, 'mid_range',
  'available',
  ARRAY['https://websiteassets.hyperquote.net/Images/cairo.webp'],
  ARRAY['cable', 'electrical', 'copper'], TRUE, TRUE
),

-- ============================================================================
-- INSULATION (1)
-- ============================================================================
(
  '00000000-0000-0000-0000-000000000001',
  'INS-EPS-50', 'eps-insulation-board-50mm',
  'EPS Insulation Board 50mm', 'لوح عزل فوم EPS سمك 50 مم',
  'Expanded polystyrene (EPS) insulation board 50mm, 100x50cm sheets.',
  'لوح عزل بولي ستيرين ممدد (فوم) سمك 50 مم، مقاس 100×50 سم.',
  'insulation', 'eps', NULL, 'Chemical Industries Dev.',
  '{"thickness_mm": 50, "size_cm": "100x50", "density_kg_m3": 15, "r_value": 1.4, "origin": "Egypt"}'::jsonb,
  'sheet', 0.4,
  25.00, 45.00, 'budget',
  'available',
  ARRAY['https://websiteassets.hyperquote.net/Images/cairo.webp'],
  ARRAY['insulation', 'eps', 'thermal'], TRUE, TRUE
),

-- ============================================================================
-- PLYWOOD (1)
-- ============================================================================
(
  '00000000-0000-0000-0000-000000000001',
  'PLY-FORM-18', 'formwork-plywood-18mm',
  'Formwork Plywood 18mm 122x244cm', 'خشب أبلكاش شدة 18 مم 122×244 سم',
  'Film-faced formwork plywood 18mm for concrete shuttering, reusable 8-10 times.',
  'خشب أبلكاش مغطى بفيلم للشدات الخرسانية سمك 18 مم، قابل لإعادة الاستخدام 8-10 مرات.',
  'plywood', 'formwork', NULL, 'Chinese Import / Local Stock',
  '{"thickness_mm": 18, "size_cm": "122x244", "face": "film_faced", "reuse_cycles": "8-10", "origin": "China"}'::jsonb,
  'sheet', 22.0,
  320.00, 480.00, 'mid_range',
  'out_of_stock',
  ARRAY['https://websiteassets.hyperquote.net/Images/cairo.webp'],
  ARRAY['plywood', 'formwork', 'shuttering'], TRUE, TRUE
),

-- ============================================================================
-- ADHESIVES (1)
-- ============================================================================
(
  '00000000-0000-0000-0000-000000000001',
  'ADH-TILE-25', 'tile-adhesive-c1-25kg',
  'Tile Adhesive C1 25kg', 'لاصق بلاط C1 25 كجم',
  'Cement-based tile adhesive class C1 for interior ceramic and porcelain tiles.',
  'لاصق بلاط أساسه أسمنتي درجة C1 للسيراميك والبورسلين الداخلي.',
  'adhesives', 'tile_adhesive', 'Saveto', 'Saveto Egypt',
  '{"class": "C1", "coverage_sqm_per_bag": "5-7", "pot_life_min": 120, "origin": "Egypt"}'::jsonb,
  'bag_25kg', 25.0,
  55.00, 85.00, 'budget',
  'available',
  ARRAY['https://websiteassets.hyperquote.net/Images/cairo.webp'],
  ARRAY['adhesive', 'tile', 'cement-based'], TRUE, TRUE
),

-- ============================================================================
-- HARDWARE & FASTENERS (1)
-- ============================================================================
(
  '00000000-0000-0000-0000-000000000001',
  'HWR-ANK-M12', 'expansion-anchor-bolt-m12x100',
  'Expansion Anchor Bolt M12x100mm', 'مسمار تمدد M12×100 مم',
  'Heavy-duty expansion anchor bolt M12x100mm, zinc plated, for concrete.',
  'مسمار تمدد شديد التحمل M12×100 مم مجلفن للخرسانة.',
  'hardware_fasteners', 'anchor_bolt', 'Hilti', 'Hilti',
  '{"size": "M12x100", "material": "carbon_steel", "finish": "zinc_plated", "pull_out_kn": 25, "origin": "Germany"}'::jsonb,
  'piece', 0.12,
  18.00, 30.00, 'mid_range',
  'available',
  ARRAY['https://websiteassets.hyperquote.net/Images/cairo.webp'],
  ARRAY['anchor', 'bolt', 'fastener'], TRUE, TRUE
),

-- ============================================================================
-- GYPSUM BOARD (1)
-- ============================================================================
(
  '00000000-0000-0000-0000-000000000001',
  'GYP-STD-12', 'gypsum-board-standard-12mm',
  'Gypsum Board Standard 12.5mm 120x240cm', 'لوح جبس بورد قياسي 12.5 مم 120×240 سم',
  'Standard gypsum plasterboard 12.5mm for ceilings and partitions.',
  'لوح جبس بورد قياسي سمك 12.5 مم للأسقف والقواطع.',
  'gypsum_board', 'standard', 'Knauf', 'Knauf Egypt',
  '{"thickness_mm": 12.5, "size_cm": "120x240", "fire_rating": "A2", "edge": "tapered", "origin": "Egypt"}'::jsonb,
  'sheet', 26.0,
  95.00, 150.00, 'mid_range',
  'out_of_stock',
  ARRAY['https://websiteassets.hyperquote.net/Images/cairo.webp'],
  ARRAY['gypsum', 'plasterboard', 'ceiling'], TRUE, TRUE
);
