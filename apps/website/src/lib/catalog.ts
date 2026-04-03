import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { createSupabaseServerClient } from '@hyperquote/auth/server'
import { getRequest } from '@tanstack/react-start/server'

// ============================================================================
// Input Schemas
// ============================================================================

const catalogInput = z.object({
  category: z.array(z.string()).optional(),
  availability: z.enum(['all', 'available', 'low_stock']).optional(),
  priceTier: z.array(z.enum(['budget', 'mid_range', 'premium'])).optional(),
  search: z.string().optional(),
  sort: z
    .enum(['relevance', 'name', 'category', 'availability'])
    .default('relevance'),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(24),
})

const productBySlugInput = z.object({
  slug: z.string().min(1),
})

// ============================================================================
// Mock products for development (no Supabase connection yet)
// ============================================================================

const IMG = 'https://websiteassets.hyperquote.net/Images/cairo.webp'

const MOCK_PRODUCTS = [
  // ── Cement ──
  { id: 'mock-1', slug: 'portland-cement-cemi-42-5n', sku: 'CEM-001', name: 'Portland Cement CEM I 42.5N', name_ar: 'أسمنت بورتلاندي CEM I 42.5N', description: 'High-quality ordinary Portland cement for general construction, foundations, and structural concrete.', description_ar: 'أسمنت بورتلاندي عادي عالي الجودة مناسب للبناء العام والأساسات والخرسانة الإنشائية.', category: 'cement', subcategory: 'ordinary_portland', brand: 'Sinai Cement', manufacturer: 'Sinai Cement Company', specifications: { strength_class: '42.5N', type: 'CEM I', standard: 'EN 197-1' }, unit_of_measure: 'bag', weight_kg: 50, price_range_min: 85, price_range_max: 110, price_tier: 'budget', availability_status: 'available', image_urls: [IMG], tags: ['cement', 'structural', 'foundations'], is_stockable: true },
  { id: 'mock-2', slug: 'sulfate-resistant-cement-cem-v', sku: 'CEM-002', name: 'Sulfate Resistant Cement CEM V', name_ar: 'أسمنت مقاوم للكبريتات CEM V', description: 'Sulfate resistant Portland cement for foundations in high-sulfate soil. Ideal for coastal and underground structures.', description_ar: 'أسمنت بورتلاندي مقاوم للكبريتات للأساسات في التربة عالية الكبريتات.', category: 'cement', subcategory: 'sulfate_resistant', brand: 'Suez Cement', manufacturer: 'Suez Cement Group', specifications: { strength_class: '42.5N', type: 'CEM V', standard: 'EN 197-1', sulfate_resistance: 'high' }, unit_of_measure: 'bag', weight_kg: 50, price_range_min: 95, price_range_max: 125, price_tier: 'mid_range', availability_status: 'available', image_urls: [IMG], tags: ['cement', 'sulfate', 'foundations', 'coastal'], is_stockable: true },

  // ── Reinforcing Steel ──
  { id: 'mock-3', slug: 'steel-rebar-16mm-grade-60', sku: 'STL-001', name: 'Steel Rebar 16mm Grade 60', name_ar: 'حديد تسليح ١٦مم درجة ٦٠', description: 'High-strength deformed steel reinforcement bar, 16mm diameter, Grade 60 (420 MPa yield). 12m standard length.', description_ar: 'حديد تسليح مشرشر عالي المتانة، قطر ١٦مم، درجة ٦٠. طول قياسي ١٢ متر.', category: 'reinforcing_steel', subcategory: 'deformed_bars', brand: 'Ezz Steel', manufacturer: 'Ezz Steel Industries', specifications: { diameter_mm: 16, grade: '60', yield_mpa: 420, length_m: 12 }, unit_of_measure: 'ton', weight_kg: 1000, price_range_min: 32000, price_range_max: 38000, price_tier: 'mid_range', availability_status: 'available', image_urls: [IMG], tags: ['steel', 'rebar', 'reinforcement', 'structural'], is_stockable: true },
  { id: 'mock-4', slug: 'steel-rebar-10mm-grade-60', sku: 'STL-002', name: 'Steel Rebar 10mm Grade 60', name_ar: 'حديد تسليح ١٠مم درجة ٦٠', description: 'Deformed reinforcement bar, 10mm diameter for slabs, beams, and light structural elements.', description_ar: 'حديد تسليح مشرشر قطر ١٠مم للبلاطات والكمرات والعناصر الإنشائية الخفيفة.', category: 'reinforcing_steel', subcategory: 'deformed_bars', brand: 'Ezz Steel', manufacturer: 'Ezz Steel Industries', specifications: { diameter_mm: 10, grade: '60', yield_mpa: 420, length_m: 12 }, unit_of_measure: 'ton', weight_kg: 1000, price_range_min: 33000, price_range_max: 39000, price_tier: 'mid_range', availability_status: 'available', image_urls: [IMG], tags: ['steel', 'rebar', 'slabs'], is_stockable: true },
  { id: 'mock-5', slug: 'welded-wire-mesh-6mm-200x200', sku: 'STL-003', name: 'Welded Wire Mesh 6mm 200×200', name_ar: 'شبك حديد ملحوم ٦مم ٢٠٠×٢٠٠', description: 'Welded steel wire mesh sheets for slab reinforcement. Wire diameter 6mm, grid 200×200mm, sheet size 2.4×6m.', description_ar: 'ألواح شبك حديد ملحوم لتسليح البلاطات. قطر السلك ٦مم، شبكة ٢٠٠×٢٠٠مم.', category: 'reinforcing_steel', subcategory: 'wire_mesh', brand: 'Egyptian Steel', manufacturer: 'Egyptian Steel Group', specifications: { wire_diameter_mm: 6, grid_mm: '200×200', sheet_size_m: '2.4×6' }, unit_of_measure: 'sheet', weight_kg: 42, price_range_min: 850, price_range_max: 1100, price_tier: 'mid_range', availability_status: 'available', image_urls: [IMG], tags: ['steel', 'mesh', 'slabs'], is_stockable: true },

  // ── Aggregates & Sand ──
  { id: 'mock-6', slug: 'crushed-gravel-size-1', sku: 'AGG-001', name: 'Crushed Gravel — Size 1 (20mm)', name_ar: 'زلط مكسر — مقاس ١ (٢٠مم)', description: 'Washed crushed limestone gravel for concrete production. Size 1 (5-20mm), low clay content.', description_ar: 'زلط حجر جيري مكسر ومغسول لإنتاج الخرسانة. مقاس ١ (٥-٢٠مم).', category: 'aggregates', subcategory: 'crushed_gravel', brand: null, manufacturer: 'Attaka Quarries', specifications: { size_mm: '5-20', type: 'crushed limestone', clay_content: '< 2%' }, unit_of_measure: 'ton', weight_kg: 1000, price_range_min: 180, price_range_max: 250, price_tier: 'budget', availability_status: 'available', image_urls: [IMG], tags: ['aggregates', 'gravel', 'concrete'], is_stockable: true },
  { id: 'mock-7', slug: 'washed-sand-fine', sku: 'SND-001', name: 'Washed Sand — Fine Grade', name_ar: 'رمل مغسول — ناعم', description: 'Fine washed natural sand for plastering and finishing. Low silt content, consistent grain size.', description_ar: 'رمل طبيعي ناعم مغسول للمحارة والتشطيبات. نسبة طمي منخفضة.', category: 'sand', subcategory: 'fine_sand', brand: null, manufacturer: 'Nile Sand Works', specifications: { grade: 'fine', silt_content: '< 3%', source: 'natural' }, unit_of_measure: 'ton', weight_kg: 1000, price_range_min: 120, price_range_max: 180, price_tier: 'budget', availability_status: 'available', image_urls: [IMG], tags: ['sand', 'plastering', 'finishing'], is_stockable: true },

  // ── Bricks & Blocks ──
  { id: 'mock-8', slug: 'red-clay-bricks-standard', sku: 'BRK-001', name: 'Red Clay Bricks — Standard', name_ar: 'طوب أحمر — قياسي', description: 'Standard red clay bricks for walls and partitions. Dimensions: 25 × 12 × 6.5 cm.', description_ar: 'طوب أحمر قياسي للحوائط والقواطع. الأبعاد: ٢٥ × ١٢ × ٦.٥ سم.', category: 'bricks', subcategory: 'red_clay', brand: 'Helwan Bricks', manufacturer: 'Helwan Brick Works', specifications: { dimensions_cm: '25×12×6.5', compressive_strength_mpa: 7, water_absorption: '< 15%' }, unit_of_measure: 'piece', weight_kg: 2.8, price_range_min: 1.2, price_range_max: 1.8, price_tier: 'budget', availability_status: 'low_stock', image_urls: [IMG], tags: ['bricks', 'clay', 'masonry', 'walls'], is_stockable: true },
  { id: 'mock-9', slug: 'concrete-hollow-blocks-20cm', sku: 'BLK-001', name: 'Concrete Hollow Blocks 20cm', name_ar: 'بلوك خرساني مفرغ ٢٠سم', description: 'Load-bearing concrete hollow blocks, 20cm width. For exterior walls and structural partitions.', description_ar: 'بلوك خرساني مفرغ حامل للأحمال، عرض ٢٠سم. للحوائط الخارجية والقواطع الإنشائية.', category: 'blocks', subcategory: 'hollow_concrete', brand: 'National Blocks', manufacturer: 'National Concrete Products', specifications: { width_cm: 20, type: 'hollow', load_bearing: true, compressive_strength_mpa: 5 }, unit_of_measure: 'piece', weight_kg: 15, price_range_min: 8, price_range_max: 12, price_tier: 'budget', availability_status: 'available', image_urls: [IMG], tags: ['blocks', 'concrete', 'walls', 'structural'], is_stockable: true },

  // ── Tiles ──
  { id: 'mock-10', slug: 'porcelain-floor-tile-60x60-beige', sku: 'TIL-001', name: 'Porcelain Floor Tile 60×60 Beige', name_ar: 'بلاط بورسلين أرضي ٦٠×٦٠ بيج', description: 'Polished porcelain floor tile, 60×60cm. Beige marble-look finish. Suitable for living rooms, lobbies, and commercial spaces.', description_ar: 'بلاط بورسلين أرضي مصقول ٦٠×٦٠سم. لون بيج بمظهر رخامي. مناسب للصالونات والمداخل.', category: 'tiles_porcelain', subcategory: 'floor_polished', brand: 'Cleopatra', manufacturer: 'Cleopatra Group', specifications: { size_cm: '60×60', finish: 'polished', color: 'beige', thickness_mm: 9.5, slip_rating: 'R9' }, unit_of_measure: 'sqm', weight_kg: 22, price_range_min: 180, price_range_max: 280, price_tier: 'mid_range', availability_status: 'available', image_urls: [IMG], tags: ['tiles', 'porcelain', 'floor', 'beige'], is_stockable: true },
  { id: 'mock-11', slug: 'ceramic-wall-tile-30x60-white', sku: 'TIL-002', name: 'Ceramic Wall Tile 30×60 White Gloss', name_ar: 'بلاط سيراميك حائط ٣٠×٦٠ أبيض لامع', description: 'Glossy white ceramic wall tile for bathrooms and kitchens. Easy to clean, water resistant.', description_ar: 'بلاط سيراميك حائط أبيض لامع للحمامات والمطابخ. سهل التنظيف ومقاوم للماء.', category: 'tiles_ceramic', subcategory: 'wall_gloss', brand: 'Lecico', manufacturer: 'Lecico Egypt', specifications: { size_cm: '30×60', finish: 'gloss', color: 'white', thickness_mm: 8 }, unit_of_measure: 'sqm', weight_kg: 18, price_range_min: 90, price_range_max: 140, price_tier: 'budget', availability_status: 'available', image_urls: [IMG], tags: ['tiles', 'ceramic', 'wall', 'bathroom', 'kitchen'], is_stockable: true },

  // ── Paint ──
  { id: 'mock-12', slug: 'interior-acrylic-paint-white-18l', sku: 'PNT-001', name: 'Interior Acrylic Paint — White 18L', name_ar: 'دهان أكريليك داخلي — أبيض ١٨ لتر', description: 'Washable interior acrylic paint with excellent coverage. Matte finish, low VOC. Coverage: 12-14 sqm per liter.', description_ar: 'دهان أكريليك داخلي قابل للغسيل بتغطية ممتازة. لمعة مطفية، انبعاثات منخفضة.', category: 'paint', subcategory: 'interior_acrylic', brand: 'Jotun', manufacturer: 'Jotun Egypt', specifications: { volume_l: 18, finish: 'matte', coverage_sqm_per_l: '12-14', voc: 'low' }, unit_of_measure: 'bucket', weight_kg: 28, price_range_min: 1200, price_range_max: 1600, price_tier: 'mid_range', availability_status: 'available', image_urls: [IMG], tags: ['paint', 'interior', 'acrylic', 'white'], is_stockable: true },

  // ── Pipes ──
  { id: 'mock-13', slug: 'pvc-pressure-pipe-110mm-6bar', sku: 'PIP-001', name: 'PVC Pressure Pipe 110mm 6 Bar', name_ar: 'مواسير PVC ضغط ١١٠مم ٦ بار', description: 'PVC pressure pipe for water supply and irrigation. 110mm diameter, 6 bar working pressure, 6m length.', description_ar: 'مواسير PVC ضغط لشبكات المياه والري. قطر ١١٠مم، ضغط تشغيل ٦ بار، طول ٦ متر.', category: 'pipes_pvc', subcategory: 'pressure', brand: 'Kalde', manufacturer: 'Kalde Egypt', specifications: { diameter_mm: 110, pressure_bar: 6, length_m: 6, standard: 'EN 1452' }, unit_of_measure: 'piece', weight_kg: 8.5, price_range_min: 180, price_range_max: 250, price_tier: 'budget', availability_status: 'available', image_urls: [IMG], tags: ['pipes', 'pvc', 'water', 'plumbing'], is_stockable: true },

  // ── Electrical ──
  { id: 'mock-14', slug: 'copper-cable-3x2-5mm-pvc', sku: 'ELC-001', name: 'Copper Cable 3×2.5mm² PVC', name_ar: 'كابل نحاس ٣×٢.٥مم² PVC', description: 'Multi-core copper cable, 3 cores × 2.5mm² PVC insulated. For general lighting and power circuits.', description_ar: 'كابل نحاس متعدد الأنوية، ٣ أنوية × ٢.٥مم² معزول PVC. للإنارة ودوائر القوى.', category: 'electrical_cable', subcategory: 'multi_core', brand: 'El Sewedy', manufacturer: 'El Sewedy Cables', specifications: { cores: 3, cross_section_mm2: 2.5, insulation: 'PVC', conductor: 'copper' }, unit_of_measure: 'roll', weight_kg: 25, price_range_min: 2800, price_range_max: 3500, price_tier: 'mid_range', availability_status: 'available', image_urls: [IMG], tags: ['cable', 'electrical', 'copper', 'wiring'], is_stockable: true },

  // ── Waterproofing ──
  { id: 'mock-15', slug: 'bituminous-membrane-4mm-sbs', sku: 'WPR-001', name: 'Bituminous Membrane 4mm SBS', name_ar: 'لفائف بيتومينية ٤مم SBS', description: 'Modified bituminous waterproofing membrane with SBS polymer, 4mm thickness. Torch-applied, for roofs and basements.', description_ar: 'لفائف عزل بيتومينية معدلة ببوليمر SBS، سمك ٤مم. تطبيق باللهب، للأسطح والأقبية.', category: 'waterproofing', subcategory: 'bituminous_membrane', brand: 'Bitumode', manufacturer: 'Bitumode Egypt', specifications: { thickness_mm: 4, polymer: 'SBS', application: 'torch', roll_size_m: '1×10' }, unit_of_measure: 'roll', weight_kg: 45, price_range_min: 350, price_range_max: 500, price_tier: 'mid_range', availability_status: 'available', image_urls: [IMG], tags: ['waterproofing', 'membrane', 'roof', 'basement'], is_stockable: true },

  // ── Insulation ──
  { id: 'mock-16', slug: 'expanded-polystyrene-50mm', sku: 'INS-001', name: 'Expanded Polystyrene Board 50mm', name_ar: 'ألواح فوم بوليسترين ٥٠مم', description: 'EPS thermal insulation board, 50mm thickness. Density 15 kg/m³. For walls, roofs, and floors.', description_ar: 'ألواح عزل حراري فوم بوليسترين، سمك ٥٠مم. كثافة ١٥ كجم/م³.', category: 'insulation', subcategory: 'eps', brand: null, manufacturer: 'Cairo Foam', specifications: { thickness_mm: 50, density_kg_m3: 15, thermal_conductivity: '0.038 W/mK', type: 'EPS' }, unit_of_measure: 'sqm', weight_kg: 0.75, price_range_min: 35, price_range_max: 55, price_tier: 'budget', availability_status: 'available', image_urls: [IMG], tags: ['insulation', 'thermal', 'eps', 'foam'], is_stockable: true },

  // ── Gypsum ──
  { id: 'mock-17', slug: 'gypsum-board-12-5mm-standard', sku: 'GYP-001', name: 'Gypsum Board 12.5mm Standard', name_ar: 'ألواح جبس ١٢.٥مم قياسي', description: 'Standard gypsum board for interior walls and ceilings. 12.5mm thickness, 1.2×2.4m sheets.', description_ar: 'ألواح جبس قياسية للحوائط والأسقف الداخلية. سمك ١٢.٥مم، مقاس ١.٢×٢.٤ متر.', category: 'gypsum_board', subcategory: 'standard', brand: 'Gypsemsr', manufacturer: 'Gypsemsr Egypt', specifications: { thickness_mm: 12.5, size_m: '1.2×2.4', type: 'standard', fire_rating: 'Class A' }, unit_of_measure: 'sheet', weight_kg: 22, price_range_min: 85, price_range_max: 120, price_tier: 'budget', availability_status: 'available', image_urls: [IMG], tags: ['gypsum', 'drywall', 'ceiling', 'partition'], is_stockable: true },

  // ── Ready Mix Concrete ──
  { id: 'mock-18', slug: 'ready-mix-concrete-c30', sku: 'RMC-001', name: 'Ready Mix Concrete C30/37', name_ar: 'خرسانة جاهزة C30/37', description: 'Structural ready-mix concrete, grade C30/37 (30 MPa cube strength). Delivered by mixer truck within Greater Cairo.', description_ar: 'خرسانة جاهزة إنشائية، درجة C30/37 (٣٠ ميجا باسكال). توصيل بعربة خلاطة داخل القاهرة الكبرى.', category: 'ready_mix_concrete', subcategory: 'structural', brand: 'CEMEX', manufacturer: 'CEMEX Egypt', specifications: { grade: 'C30/37', cube_strength_mpa: 30, slump_mm: '100-150', max_aggregate_mm: 20 }, unit_of_measure: 'cubic_meter', weight_kg: 2400, price_range_min: 1800, price_range_max: 2400, price_tier: 'mid_range', availability_status: 'available', image_urls: [IMG], tags: ['concrete', 'ready-mix', 'structural'], is_stockable: false },

  // ── Aluminum ──
  { id: 'mock-19', slug: 'aluminum-window-profile-white', sku: 'ALU-001', name: 'Aluminum Window Profile — White', name_ar: 'بروفيل ألومنيوم شبابيك — أبيض', description: 'Powder-coated aluminum window profile, white finish. Thermal break design for energy efficiency.', description_ar: 'بروفيل ألومنيوم شبابيك دهان بودرة أبيض. تصميم قطع حراري لكفاءة الطاقة.', category: 'aluminum_profiles', subcategory: 'window', brand: 'Alumisr', manufacturer: 'Alumisr Industries', specifications: { finish: 'powder_coat_white', thermal_break: true, section: 'casement' }, unit_of_measure: 'linear_meter', weight_kg: 1.8, price_range_min: 120, price_range_max: 180, price_tier: 'mid_range', availability_status: 'available', image_urls: [IMG], tags: ['aluminum', 'windows', 'profiles'], is_stockable: true },

  // ── Marble ──
  { id: 'mock-20', slug: 'sinai-pearl-marble-slab', sku: 'MRB-001', name: 'Sinai Pearl Marble Slab', name_ar: 'رخام سيناء بيرل — ألواح', description: 'Natural Egyptian marble from Sinai quarries. Cream/beige tones with subtle veining. Polished finish, 2cm thickness.', description_ar: 'رخام مصري طبيعي من محاجر سيناء. درجات كريمي/بيج مع عروق خفيفة. مصقول، سمك ٢سم.', category: 'marble', subcategory: 'natural_slab', brand: null, manufacturer: 'Sinai Marble', specifications: { thickness_cm: 2, finish: 'polished', origin: 'Sinai, Egypt', color: 'cream/beige' }, unit_of_measure: 'sqm', weight_kg: 54, price_range_min: 450, price_range_max: 700, price_tier: 'premium', availability_status: 'available', image_urls: [IMG], tags: ['marble', 'natural', 'sinai', 'luxury'], is_stockable: true },

  // ── Plywood ──
  { id: 'mock-21', slug: 'marine-plywood-18mm', sku: 'PLY-001', name: 'Marine Plywood 18mm', name_ar: 'خشب أبلكاش بحري ١٨مم', description: 'Water-resistant marine plywood, 18mm thickness. For formwork, shuttering, and exterior applications.', description_ar: 'خشب أبلكاش بحري مقاوم للماء، سمك ١٨مم. للشدات والتطبيقات الخارجية.', category: 'plywood', subcategory: 'marine', brand: null, manufacturer: 'Import — Indonesia', specifications: { thickness_mm: 18, type: 'marine', size_m: '1.22×2.44', glue: 'WBP' }, unit_of_measure: 'sheet', weight_kg: 18, price_range_min: 450, price_range_max: 650, price_tier: 'mid_range', availability_status: 'low_stock', image_urls: [IMG], tags: ['plywood', 'marine', 'formwork', 'shuttering'], is_stockable: true },

  // ── Adhesives ──
  { id: 'mock-22', slug: 'tile-adhesive-c2-white-25kg', sku: 'ADH-001', name: 'Tile Adhesive C2 White 25kg', name_ar: 'لاصق بلاط C2 أبيض ٢٥كجم', description: 'Cementitious tile adhesive class C2 for porcelain and large format tiles. White, flexible, for walls and floors.', description_ar: 'لاصق بلاط أسمنتي درجة C2 للبورسلين والبلاط كبير المقاس. أبيض ومرن للحوائط والأرضيات.', category: 'adhesives', subcategory: 'tile_adhesive', brand: 'Saveto', manufacturer: 'Saveto Egypt', specifications: { class: 'C2', color: 'white', weight_kg: 25, coverage_sqm: '4-6' }, unit_of_measure: 'bag', weight_kg: 25, price_range_min: 120, price_range_max: 180, price_tier: 'mid_range', availability_status: 'available', image_urls: [IMG], tags: ['adhesive', 'tile', 'cement', 'installation'], is_stockable: true },

  // ── Glass ──
  { id: 'mock-23', slug: 'clear-float-glass-6mm', sku: 'GLS-001', name: 'Clear Float Glass 6mm', name_ar: 'زجاج شفاف ٦مم', description: 'Standard clear float glass, 6mm thickness. For windows, partitions, and general glazing. Cut to size available.', description_ar: 'زجاج شفاف قياسي، سمك ٦مم. للشبابيك والقواطع والزجاج العام. متاح القطع حسب المقاس.', category: 'glass', subcategory: 'clear_float', brand: null, manufacturer: 'Saint-Gobain Egypt', specifications: { thickness_mm: 6, type: 'clear float', light_transmission: '89%' }, unit_of_measure: 'sqm', weight_kg: 15, price_range_min: 120, price_range_max: 180, price_tier: 'mid_range', availability_status: 'available', image_urls: [IMG], tags: ['glass', 'float', 'windows', 'glazing'], is_stockable: true },

  // ── Hardware ──
  { id: 'mock-24', slug: 'galvanized-bolts-m16x100', sku: 'HDW-001', name: 'Galvanized Bolts M16×100mm (Box/50)', name_ar: 'مسامير جلفنة M16×100مم (علبة/٥٠)', description: 'Hot-dip galvanized hex bolts, M16 × 100mm, Grade 8.8. Box of 50 pieces with nuts and washers.', description_ar: 'مسامير سداسية مجلفنة بالغمس الساخن، M16 × ١٠٠مم، درجة ٨.٨. علبة ٥٠ قطعة بالصواميل والورد.', category: 'hardware_fasteners', subcategory: 'bolts', brand: null, manufacturer: 'Import — China', specifications: { size: 'M16×100', grade: '8.8', finish: 'hot-dip galvanized', qty_per_box: 50 }, unit_of_measure: 'box', weight_kg: 12, price_range_min: 280, price_range_max: 400, price_tier: 'budget', availability_status: 'available', image_urls: [IMG], tags: ['bolts', 'fasteners', 'hardware', 'galvanized'], is_stockable: true },
]

// ============================================================================
// Public columns — NEVER include last_purchase_price or weighted_avg_cost
// ============================================================================

const PUBLIC_COLUMNS = [
  'id',
  'slug',
  'sku',
  'name',
  'name_ar',
  'description',
  'description_ar',
  'category',
  'subcategory',
  'brand',
  'manufacturer',
  'specifications',
  'unit_of_measure',
  'weight_kg',
  'price_range_min',
  'price_range_max',
  'price_tier',
  'availability_status',
  'image_urls',
  'tags',
  'is_stockable',
].join(', ')

// ============================================================================
// getPublicCatalog — paginated, filterable product listing
// ============================================================================

export const getPublicCatalog = createServerFn()
  .inputValidator(catalogInput)
  .handler(async ({ data: input }) => {
    const request = getRequest()
    const { client } = createSupabaseServerClient({
      request,
      supabaseUrl: process.env.SUPABASE_URL ?? 'https://placeholder.supabase.co',
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? 'placeholder',
    })

    let query = client
      .from('products')
      .select(PUBLIC_COLUMNS, { count: 'exact' })
      .eq('is_active', true)

    // Category filter
    if (input.category?.length) {
      query = query.in('category', input.category)
    }

    // Availability filter
    if (input.availability && input.availability !== 'all') {
      query = query.eq('availability_status', input.availability)
    }

    // Price tier filter
    if (input.priceTier?.length) {
      query = query.in('price_tier', input.priceTier)
    }

    // Full-text search (server-side via PostgreSQL tsvector)
    if (input.search) {
      query = query.textSearch('search_vector', input.search, {
        type: 'websearch',
      })
    }

    // Sorting
    switch (input.sort) {
      case 'name':
        query = query.order('name')
        break
      case 'category':
        query = query.order('category')
        break
      case 'availability':
        query = query.order('availability_status')
        break
      // 'relevance' — no explicit sort, PostgreSQL handles it for text search
    }

    // Pagination
    const offset = (input.page - 1) * input.limit
    query = query.range(offset, offset + input.limit - 1)

    const { data, error, count } = await query

    if (error || !data?.length) {
      // Dev fallback: return mock products when Supabase is unavailable
      if (!process.env.SUPABASE_URL || process.env.SUPABASE_URL === 'https://placeholder.supabase.co') {
        let filtered = [...MOCK_PRODUCTS] as Record<string, unknown>[]
        if (input.category?.length) {
          filtered = filtered.filter((p) => input.category!.includes(p.category as string))
        }
        if (input.availability && input.availability !== 'all') {
          filtered = filtered.filter((p) => p.availability_status === input.availability)
        }
        if (input.priceTier?.length) {
          filtered = filtered.filter((p) => input.priceTier!.includes(p.price_tier as string))
        }
        if (input.search) {
          const q = input.search.toLowerCase()
          filtered = filtered.filter(
            (p) =>
              (p.name as string).toLowerCase().includes(q) ||
              (p.category as string).toLowerCase().includes(q) ||
              (p.brand as string | null)?.toLowerCase().includes(q),
          )
        }
        if (input.sort === 'name') filtered.sort((a, b) => (a.name as string).localeCompare(b.name as string))
        return { items: filtered, total: filtered.length, hasMore: false }
      }
      if (error) console.error('[getPublicCatalog] Supabase error:', error)
      return { items: [] as Record<string, unknown>[], total: 0, hasMore: false }
    }

    return {
      items: data ?? [],
      total: count ?? 0,
      hasMore: (count ?? 0) > offset + input.limit,
    }
  })

// ============================================================================
// getProductBySlug — single product lookup
// ============================================================================

export const getProductBySlug = createServerFn()
  .inputValidator(productBySlugInput)
  .handler(async ({ data: input }) => {
    const request = getRequest()
    const { client } = createSupabaseServerClient({
      request,
      supabaseUrl: process.env.SUPABASE_URL ?? 'https://placeholder.supabase.co',
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? 'placeholder',
    })

    const { data, error } = await client
      .from('products')
      .select(PUBLIC_COLUMNS)
      .eq('slug', input.slug)
      .eq('is_active', true)
      .single()

    if (error || !data) {
      // Dev fallback: check mock products
      if (!process.env.SUPABASE_URL || process.env.SUPABASE_URL === 'https://placeholder.supabase.co') {
        return MOCK_PRODUCTS.find((p) => p.slug === input.slug) ?? null
      }
      if (error) console.error('[getProductBySlug] Supabase error:', error)
      return null
    }

    return data
  })
