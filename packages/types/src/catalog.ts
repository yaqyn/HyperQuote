// Shared product catalog — consumed by the website (public market), the
// internal sales panel (quote builder), and the internal inventory panel.
// Keeping a single source ensures a product edited in one surface stays
// consistent everywhere. When the real Supabase backend comes online, both
// apps replace their mock fallbacks with DB queries and this array shrinks
// to types only.

export const IMG_BASE = 'https://websiteassets.hyperquote.net/Images'

/** Broad category axis — the 6 categories the website groups by. */
export const BROAD_CATEGORIES = [
	'cement',
	'steel',
	'aggregates',
	'bricks',
	'timber',
	'finishing',
] as const
export type BroadCategory = (typeof BROAD_CATEGORIES)[number]

/** Hero image per broad category — used on marketing cards and inventory tiles. */
export const BROAD_CATEGORY_IMAGES: Record<BroadCategory, string> = {
	cement: `${IMG_BASE}/cement.webp`,
	steel: `${IMG_BASE}/steel.webp`,
	aggregates: `${IMG_BASE}/Aggregates.webp`,
	bricks: `${IMG_BASE}/bricks.webp`,
	timber: `${IMG_BASE}/wood.webp`,
	finishing: `${IMG_BASE}/finish.webp`,
}

/**
 * Maps a specific (subcategory-style) category value to one of the 6 broad
 * categories. The DB schema allows richer granularity; the marketing and
 * inventory surfaces roll it up to 6 buckets.
 */
const SPECIFIC_TO_BROAD: Record<string, BroadCategory> = {
	// cement
	cement: 'cement',
	ready_mix_concrete: 'cement',
	// steel + adjacent hardware
	reinforcing_steel: 'steel',
	structural_steel: 'steel',
	aluminum_profiles: 'steel',
	hardware_fasteners: 'steel',
	pipes_pvc: 'steel',
	pipes_metal: 'steel',
	electrical_cable: 'steel',
	electrical_conduit: 'steel',
	// aggregates + stones
	aggregates: 'aggregates',
	sand: 'aggregates',
	marble: 'aggregates',
	granite: 'aggregates',
	// masonry
	bricks: 'bricks',
	blocks: 'bricks',
	// timber & wet-envelope
	lumber: 'timber',
	plywood: 'timber',
	insulation: 'timber',
	waterproofing: 'timber',
	roofing: 'timber',
	// finishing
	tiles_porcelain: 'finishing',
	tiles_ceramic: 'finishing',
	paint: 'finishing',
	glass: 'finishing',
	gypsum_board: 'finishing',
	adhesives: 'finishing',
}

export function getBroadCategory(specific: string): BroadCategory {
	return SPECIFIC_TO_BROAD[specific] ?? 'finishing'
}

export function getCategoryImage(specific: string): string {
	return BROAD_CATEGORY_IMAGES[getBroadCategory(specific)]
}

export type PriceTier = 'budget' | 'mid_range' | 'premium'
export type AvailabilityStatus = 'available' | 'low_stock' | 'out_of_stock'

export interface CatalogProduct {
	id: string
	slug: string
	sku: string
	name: string
	name_ar: string
	description: string
	description_ar: string
	category: string
	subcategory: string
	brand: string | null
	manufacturer: string
	specifications: Record<string, unknown>
	unit_of_measure: string
	weight_kg: number
	price_range_min: number
	price_range_max: number
	price_tier: PriceTier
	availability_status: AvailabilityStatus
	tags: string[]
	is_stockable: boolean
	/**
	 * Optional product image URL. Shown in the admin registry and may be
	 * surfaced elsewhere later. Nullable so baked catalog entries without
	 * an image don't need an empty value written against them.
	 */
	pictureUrl?: string | null
}

/**
 * The canonical product list. Every entry is real-ish Egyptian construction
 * material data — use across marketing, sales quotes, and inventory.
 */
export const CATALOG_PRODUCTS: CatalogProduct[] = [
	// ── Cement ──
	{
		id: 'p-001',
		slug: 'portland-cement-cemi-42-5n',
		sku: 'CEM-001',
		name: 'Portland Cement CEM I 42.5N',
		name_ar: 'أسمنت بورتلاندي CEM I 42.5N',
		description:
			'High-quality ordinary Portland cement for general construction, foundations, and structural concrete.',
		description_ar:
			'أسمنت بورتلاندي عادي عالي الجودة مناسب للبناء العام والأساسات والخرسانة الإنشائية.',
		category: 'cement',
		subcategory: 'ordinary_portland',
		brand: 'Sinai Cement',
		manufacturer: 'Sinai Cement Company',
		specifications: {
			strength_class: '42.5N',
			type: 'CEM I',
			standard: 'EN 197-1',
		},
		unit_of_measure: 'bag',
		weight_kg: 50,
		price_range_min: 85,
		price_range_max: 110,
		price_tier: 'budget',
		availability_status: 'available',
		tags: ['cement', 'structural', 'foundations'],
		is_stockable: true,
	},
	{
		id: 'p-002',
		slug: 'sulfate-resistant-cement-cem-v',
		sku: 'CEM-002',
		name: 'Sulfate Resistant Cement CEM V',
		name_ar: 'أسمنت مقاوم للكبريتات CEM V',
		description:
			'Sulfate resistant Portland cement for foundations in high-sulfate soil. Ideal for coastal and underground structures.',
		description_ar:
			'أسمنت بورتلاندي مقاوم للكبريتات للأساسات في التربة عالية الكبريتات.',
		category: 'cement',
		subcategory: 'sulfate_resistant',
		brand: 'Suez Cement',
		manufacturer: 'Suez Cement Group',
		specifications: {
			strength_class: '42.5N',
			type: 'CEM V',
			standard: 'EN 197-1',
			sulfate_resistance: 'high',
		},
		unit_of_measure: 'bag',
		weight_kg: 50,
		price_range_min: 95,
		price_range_max: 125,
		price_tier: 'mid_range',
		availability_status: 'available',
		tags: ['cement', 'sulfate', 'foundations', 'coastal'],
		is_stockable: true,
	},

	// ── Reinforcing Steel ──
	{
		id: 'p-003',
		slug: 'steel-rebar-16mm-grade-60',
		sku: 'STL-001',
		name: 'Steel Rebar 16mm Grade 60',
		name_ar: 'حديد تسليح ١٦مم درجة ٦٠',
		description:
			'High-strength deformed steel reinforcement bar, 16mm diameter, Grade 60 (420 MPa yield). 12m standard length.',
		description_ar:
			'حديد تسليح مشرشر عالي المتانة، قطر ١٦مم، درجة ٦٠. طول قياسي ١٢ متر.',
		category: 'reinforcing_steel',
		subcategory: 'deformed_bars',
		brand: 'Ezz Steel',
		manufacturer: 'Ezz Steel Industries',
		specifications: {
			diameter_mm: 16,
			grade: '60',
			yield_mpa: 420,
			length_m: 12,
		},
		unit_of_measure: 'ton',
		weight_kg: 1000,
		price_range_min: 32000,
		price_range_max: 38000,
		price_tier: 'mid_range',
		availability_status: 'available',
		tags: ['steel', 'rebar', 'reinforcement', 'structural'],
		is_stockable: true,
	},
	{
		id: 'p-004',
		slug: 'steel-rebar-10mm-grade-60',
		sku: 'STL-002',
		name: 'Steel Rebar 10mm Grade 60',
		name_ar: 'حديد تسليح ١٠مم درجة ٦٠',
		description:
			'Deformed reinforcement bar, 10mm diameter for slabs, beams, and light structural elements.',
		description_ar:
			'حديد تسليح مشرشر قطر ١٠مم للبلاطات والكمرات والعناصر الإنشائية الخفيفة.',
		category: 'reinforcing_steel',
		subcategory: 'deformed_bars',
		brand: 'Ezz Steel',
		manufacturer: 'Ezz Steel Industries',
		specifications: {
			diameter_mm: 10,
			grade: '60',
			yield_mpa: 420,
			length_m: 12,
		},
		unit_of_measure: 'ton',
		weight_kg: 1000,
		price_range_min: 33000,
		price_range_max: 39000,
		price_tier: 'mid_range',
		availability_status: 'available',
		tags: ['steel', 'rebar', 'slabs'],
		is_stockable: true,
	},
	{
		id: 'p-005',
		slug: 'welded-wire-mesh-6mm-200x200',
		sku: 'STL-003',
		name: 'Welded Wire Mesh 6mm 200×200',
		name_ar: 'شبك حديد ملحوم ٦مم ٢٠٠×٢٠٠',
		description:
			'Welded steel wire mesh sheets for slab reinforcement. Wire diameter 6mm, grid 200×200mm, sheet size 2.4×6m.',
		description_ar:
			'ألواح شبك حديد ملحوم لتسليح البلاطات. قطر السلك ٦مم، شبكة ٢٠٠×٢٠٠مم.',
		category: 'reinforcing_steel',
		subcategory: 'wire_mesh',
		brand: 'Egyptian Steel',
		manufacturer: 'Egyptian Steel Group',
		specifications: {
			wire_diameter_mm: 6,
			grid_mm: '200×200',
			sheet_size_m: '2.4×6',
		},
		unit_of_measure: 'sheet',
		weight_kg: 42,
		price_range_min: 850,
		price_range_max: 1100,
		price_tier: 'mid_range',
		availability_status: 'available',
		tags: ['steel', 'mesh', 'slabs'],
		is_stockable: true,
	},

	// ── Aggregates & Sand ──
	{
		id: 'p-006',
		slug: 'crushed-gravel-size-1',
		sku: 'AGG-001',
		name: 'Crushed Gravel — Size 1 (20mm)',
		name_ar: 'زلط مكسر — مقاس ١ (٢٠مم)',
		description:
			'Washed crushed limestone gravel for concrete production. Size 1 (5-20mm), low clay content.',
		description_ar:
			'زلط حجر جيري مكسر ومغسول لإنتاج الخرسانة. مقاس ١ (٥-٢٠مم).',
		category: 'aggregates',
		subcategory: 'crushed_gravel',
		brand: null,
		manufacturer: 'Attaka Quarries',
		specifications: {
			size_mm: '5-20',
			type: 'crushed limestone',
			clay_content: '< 2%',
		},
		unit_of_measure: 'ton',
		weight_kg: 1000,
		price_range_min: 180,
		price_range_max: 250,
		price_tier: 'budget',
		availability_status: 'available',
		tags: ['aggregates', 'gravel', 'concrete'],
		is_stockable: true,
	},
	{
		id: 'p-007',
		slug: 'washed-sand-fine',
		sku: 'SND-001',
		name: 'Washed Sand — Fine Grade',
		name_ar: 'رمل مغسول — ناعم',
		description:
			'Fine washed natural sand for plastering and finishing. Low silt content, consistent grain size.',
		description_ar: 'رمل طبيعي ناعم مغسول للمحارة والتشطيبات. نسبة طمي منخفضة.',
		category: 'sand',
		subcategory: 'fine_sand',
		brand: null,
		manufacturer: 'Nile Sand Works',
		specifications: { grade: 'fine', silt_content: '< 3%', source: 'natural' },
		unit_of_measure: 'ton',
		weight_kg: 1000,
		price_range_min: 120,
		price_range_max: 180,
		price_tier: 'budget',
		availability_status: 'available',
		tags: ['sand', 'plastering', 'finishing'],
		is_stockable: true,
	},

	// ── Bricks & Blocks ──
	{
		id: 'p-008',
		slug: 'red-clay-bricks-standard',
		sku: 'BRK-001',
		name: 'Red Clay Bricks — Standard',
		name_ar: 'طوب أحمر — قياسي',
		description:
			'Standard red clay bricks for walls and partitions. Dimensions: 25 × 12 × 6.5 cm.',
		description_ar:
			'طوب أحمر قياسي للحوائط والقواطع. الأبعاد: ٢٥ × ١٢ × ٦.٥ سم.',
		category: 'bricks',
		subcategory: 'red_clay',
		brand: 'Helwan Bricks',
		manufacturer: 'Helwan Brick Works',
		specifications: {
			dimensions_cm: '25×12×6.5',
			compressive_strength_mpa: 7,
			water_absorption: '< 15%',
		},
		unit_of_measure: 'piece',
		weight_kg: 2.8,
		price_range_min: 1.2,
		price_range_max: 1.8,
		price_tier: 'budget',
		availability_status: 'low_stock',
		tags: ['bricks', 'clay', 'masonry', 'walls'],
		is_stockable: true,
	},
	{
		id: 'p-009',
		slug: 'concrete-hollow-blocks-20cm',
		sku: 'BLK-001',
		name: 'Concrete Hollow Blocks 20cm',
		name_ar: 'بلوك خرساني مفرغ ٢٠سم',
		description:
			'Load-bearing concrete hollow blocks, 20cm width. For exterior walls and structural partitions.',
		description_ar:
			'بلوك خرساني مفرغ حامل للأحمال، عرض ٢٠سم. للحوائط الخارجية والقواطع الإنشائية.',
		category: 'blocks',
		subcategory: 'hollow_concrete',
		brand: 'National Blocks',
		manufacturer: 'National Concrete Products',
		specifications: {
			width_cm: 20,
			type: 'hollow',
			load_bearing: true,
			compressive_strength_mpa: 5,
		},
		unit_of_measure: 'piece',
		weight_kg: 15,
		price_range_min: 8,
		price_range_max: 12,
		price_tier: 'budget',
		availability_status: 'available',
		tags: ['blocks', 'concrete', 'walls', 'structural'],
		is_stockable: true,
	},

	// ── Tiles ──
	{
		id: 'p-010',
		slug: 'porcelain-floor-tile-60x60-beige',
		sku: 'TIL-001',
		name: 'Porcelain Floor Tile 60×60 Beige',
		name_ar: 'بلاط بورسلين أرضي ٦٠×٦٠ بيج',
		description:
			'Polished porcelain floor tile, 60×60cm. Beige marble-look finish. Suitable for living rooms, lobbies, and commercial spaces.',
		description_ar:
			'بلاط بورسلين أرضي مصقول ٦٠×٦٠سم. لون بيج بمظهر رخامي. مناسب للصالونات والمداخل.',
		category: 'tiles_porcelain',
		subcategory: 'floor_polished',
		brand: 'Cleopatra',
		manufacturer: 'Cleopatra Group',
		specifications: {
			size_cm: '60×60',
			finish: 'polished',
			color: 'beige',
			thickness_mm: 9.5,
			slip_rating: 'R9',
		},
		unit_of_measure: 'sqm',
		weight_kg: 22,
		price_range_min: 180,
		price_range_max: 280,
		price_tier: 'mid_range',
		availability_status: 'available',
		tags: ['tiles', 'porcelain', 'floor', 'beige'],
		is_stockable: true,
	},
	{
		id: 'p-011',
		slug: 'ceramic-wall-tile-30x60-white',
		sku: 'TIL-002',
		name: 'Ceramic Wall Tile 30×60 White Gloss',
		name_ar: 'بلاط سيراميك حائط ٣٠×٦٠ أبيض لامع',
		description:
			'Glossy white ceramic wall tile for bathrooms and kitchens. Easy to clean, water resistant.',
		description_ar:
			'بلاط سيراميك حائط أبيض لامع للحمامات والمطابخ. سهل التنظيف ومقاوم للماء.',
		category: 'tiles_ceramic',
		subcategory: 'wall_gloss',
		brand: 'Lecico',
		manufacturer: 'Lecico Egypt',
		specifications: {
			size_cm: '30×60',
			finish: 'gloss',
			color: 'white',
			thickness_mm: 8,
		},
		unit_of_measure: 'sqm',
		weight_kg: 18,
		price_range_min: 90,
		price_range_max: 140,
		price_tier: 'budget',
		availability_status: 'available',
		tags: ['tiles', 'ceramic', 'wall', 'bathroom', 'kitchen'],
		is_stockable: true,
	},

	// ── Paint ──
	{
		id: 'p-012',
		slug: 'interior-acrylic-paint-white-18l',
		sku: 'PNT-001',
		name: 'Interior Acrylic Paint — White 18L',
		name_ar: 'دهان أكريليك داخلي — أبيض ١٨ لتر',
		description:
			'Washable interior acrylic paint with excellent coverage. Matte finish, low VOC. Coverage: 12-14 sqm per liter.',
		description_ar:
			'دهان أكريليك داخلي قابل للغسيل بتغطية ممتازة. لمعة مطفية، انبعاثات منخفضة.',
		category: 'paint',
		subcategory: 'interior_acrylic',
		brand: 'Jotun',
		manufacturer: 'Jotun Egypt',
		specifications: {
			volume_l: 18,
			finish: 'matte',
			coverage_sqm_per_l: '12-14',
			voc: 'low',
		},
		unit_of_measure: 'bucket',
		weight_kg: 28,
		price_range_min: 1200,
		price_range_max: 1600,
		price_tier: 'mid_range',
		availability_status: 'available',
		tags: ['paint', 'interior', 'acrylic', 'white'],
		is_stockable: true,
	},

	// ── Pipes ──
	{
		id: 'p-013',
		slug: 'pvc-pressure-pipe-110mm-6bar',
		sku: 'PIP-001',
		name: 'PVC Pressure Pipe 110mm 6 Bar',
		name_ar: 'مواسير PVC ضغط ١١٠مم ٦ بار',
		description:
			'PVC pressure pipe for water supply and irrigation. 110mm diameter, 6 bar working pressure, 6m length.',
		description_ar:
			'مواسير PVC ضغط لشبكات المياه والري. قطر ١١٠مم، ضغط تشغيل ٦ بار، طول ٦ متر.',
		category: 'pipes_pvc',
		subcategory: 'pressure',
		brand: 'Kalde',
		manufacturer: 'Kalde Egypt',
		specifications: {
			diameter_mm: 110,
			pressure_bar: 6,
			length_m: 6,
			standard: 'EN 1452',
		},
		unit_of_measure: 'piece',
		weight_kg: 8.5,
		price_range_min: 180,
		price_range_max: 250,
		price_tier: 'budget',
		availability_status: 'available',
		tags: ['pipes', 'pvc', 'water', 'plumbing'],
		is_stockable: true,
	},

	// ── Electrical ──
	{
		id: 'p-014',
		slug: 'copper-cable-3x2-5mm-pvc',
		sku: 'ELC-001',
		name: 'Copper Cable 3×2.5mm² PVC',
		name_ar: 'كابل نحاس ٣×٢.٥مم² PVC',
		description:
			'Multi-core copper cable, 3 cores × 2.5mm² PVC insulated. For general lighting and power circuits.',
		description_ar:
			'كابل نحاس متعدد الأنوية، ٣ أنوية × ٢.٥مم² معزول PVC. للإنارة ودوائر القوى.',
		category: 'electrical_cable',
		subcategory: 'multi_core',
		brand: 'El Sewedy',
		manufacturer: 'El Sewedy Cables',
		specifications: {
			cores: 3,
			cross_section_mm2: 2.5,
			insulation: 'PVC',
			conductor: 'copper',
		},
		unit_of_measure: 'roll',
		weight_kg: 25,
		price_range_min: 2800,
		price_range_max: 3500,
		price_tier: 'mid_range',
		availability_status: 'available',
		tags: ['cable', 'electrical', 'copper', 'wiring'],
		is_stockable: true,
	},

	// ── Waterproofing ──
	{
		id: 'p-015',
		slug: 'bituminous-membrane-4mm-sbs',
		sku: 'WPR-001',
		name: 'Bituminous Membrane 4mm SBS',
		name_ar: 'لفائف بيتومينية ٤مم SBS',
		description:
			'Modified bituminous waterproofing membrane with SBS polymer, 4mm thickness. Torch-applied, for roofs and basements.',
		description_ar:
			'لفائف عزل بيتومينية معدلة ببوليمر SBS، سمك ٤مم. تطبيق باللهب، للأسطح والأقبية.',
		category: 'waterproofing',
		subcategory: 'bituminous_membrane',
		brand: 'Bitumode',
		manufacturer: 'Bitumode Egypt',
		specifications: {
			thickness_mm: 4,
			polymer: 'SBS',
			application: 'torch',
			roll_size_m: '1×10',
		},
		unit_of_measure: 'roll',
		weight_kg: 45,
		price_range_min: 350,
		price_range_max: 500,
		price_tier: 'mid_range',
		availability_status: 'available',
		tags: ['waterproofing', 'membrane', 'roof', 'basement'],
		is_stockable: true,
	},

	// ── Insulation ──
	{
		id: 'p-016',
		slug: 'expanded-polystyrene-50mm',
		sku: 'INS-001',
		name: 'Expanded Polystyrene Board 50mm',
		name_ar: 'ألواح فوم بوليسترين ٥٠مم',
		description:
			'EPS thermal insulation board, 50mm thickness. Density 15 kg/m³. For walls, roofs, and floors.',
		description_ar: 'ألواح عزل حراري فوم بوليسترين، سمك ٥٠مم. كثافة ١٥ كجم/م³.',
		category: 'insulation',
		subcategory: 'eps',
		brand: null,
		manufacturer: 'Cairo Foam',
		specifications: {
			thickness_mm: 50,
			density_kg_m3: 15,
			thermal_conductivity: '0.038 W/mK',
			type: 'EPS',
		},
		unit_of_measure: 'sqm',
		weight_kg: 0.75,
		price_range_min: 35,
		price_range_max: 55,
		price_tier: 'budget',
		availability_status: 'available',
		tags: ['insulation', 'thermal', 'eps', 'foam'],
		is_stockable: true,
	},

	// ── Gypsum ──
	{
		id: 'p-017',
		slug: 'gypsum-board-12-5mm-standard',
		sku: 'GYP-001',
		name: 'Gypsum Board 12.5mm Standard',
		name_ar: 'ألواح جبس ١٢.٥مم قياسي',
		description:
			'Standard gypsum board for interior walls and ceilings. 12.5mm thickness, 1.2×2.4m sheets.',
		description_ar:
			'ألواح جبس قياسية للحوائط والأسقف الداخلية. سمك ١٢.٥مم، مقاس ١.٢×٢.٤ متر.',
		category: 'gypsum_board',
		subcategory: 'standard',
		brand: 'Gypsemsr',
		manufacturer: 'Gypsemsr Egypt',
		specifications: {
			thickness_mm: 12.5,
			size_m: '1.2×2.4',
			type: 'standard',
			fire_rating: 'Class A',
		},
		unit_of_measure: 'sheet',
		weight_kg: 22,
		price_range_min: 85,
		price_range_max: 120,
		price_tier: 'budget',
		availability_status: 'available',
		tags: ['gypsum', 'drywall', 'ceiling', 'partition'],
		is_stockable: true,
	},

	// ── Ready Mix Concrete ──
	{
		id: 'p-018',
		slug: 'ready-mix-concrete-c30',
		sku: 'RMC-001',
		name: 'Ready Mix Concrete C30/37',
		name_ar: 'خرسانة جاهزة C30/37',
		description:
			'Structural ready-mix concrete, grade C30/37 (30 MPa cube strength). Delivered by mixer truck within Greater Cairo.',
		description_ar:
			'خرسانة جاهزة إنشائية، درجة C30/37 (٣٠ ميجا باسكال). توصيل بعربة خلاطة داخل القاهرة الكبرى.',
		category: 'ready_mix_concrete',
		subcategory: 'structural',
		brand: 'CEMEX',
		manufacturer: 'CEMEX Egypt',
		specifications: {
			grade: 'C30/37',
			cube_strength_mpa: 30,
			slump_mm: '100-150',
			max_aggregate_mm: 20,
		},
		unit_of_measure: 'cubic_meter',
		weight_kg: 2400,
		price_range_min: 1800,
		price_range_max: 2400,
		price_tier: 'mid_range',
		availability_status: 'available',
		tags: ['concrete', 'ready-mix', 'structural'],
		is_stockable: false,
	},

	// ── Aluminum ──
	{
		id: 'p-019',
		slug: 'aluminum-window-profile-white',
		sku: 'ALU-001',
		name: 'Aluminum Window Profile — White',
		name_ar: 'بروفيل ألومنيوم شبابيك — أبيض',
		description:
			'Powder-coated aluminum window profile, white finish. Thermal break design for energy efficiency.',
		description_ar:
			'بروفيل ألومنيوم شبابيك دهان بودرة أبيض. تصميم قطع حراري لكفاءة الطاقة.',
		category: 'aluminum_profiles',
		subcategory: 'window',
		brand: 'Alumisr',
		manufacturer: 'Alumisr Industries',
		specifications: {
			finish: 'powder_coat_white',
			thermal_break: true,
			section: 'casement',
		},
		unit_of_measure: 'linear_meter',
		weight_kg: 1.8,
		price_range_min: 120,
		price_range_max: 180,
		price_tier: 'mid_range',
		availability_status: 'available',
		tags: ['aluminum', 'windows', 'profiles'],
		is_stockable: true,
	},

	// ── Marble ──
	{
		id: 'p-020',
		slug: 'sinai-pearl-marble-slab',
		sku: 'MRB-001',
		name: 'Sinai Pearl Marble Slab',
		name_ar: 'رخام سيناء بيرل — ألواح',
		description:
			'Natural Egyptian marble from Sinai quarries. Cream/beige tones with subtle veining. Polished finish, 2cm thickness.',
		description_ar:
			'رخام مصري طبيعي من محاجر سيناء. درجات كريمي/بيج مع عروق خفيفة. مصقول، سمك ٢سم.',
		category: 'marble',
		subcategory: 'natural_slab',
		brand: null,
		manufacturer: 'Sinai Marble',
		specifications: {
			thickness_cm: 2,
			finish: 'polished',
			origin: 'Sinai, Egypt',
			color: 'cream/beige',
		},
		unit_of_measure: 'sqm',
		weight_kg: 54,
		price_range_min: 450,
		price_range_max: 700,
		price_tier: 'premium',
		availability_status: 'available',
		tags: ['marble', 'natural', 'sinai', 'luxury'],
		is_stockable: true,
	},

	// ── Plywood ──
	{
		id: 'p-021',
		slug: 'marine-plywood-18mm',
		sku: 'PLY-001',
		name: 'Marine Plywood 18mm',
		name_ar: 'خشب أبلكاش بحري ١٨مم',
		description:
			'Water-resistant marine plywood, 18mm thickness. For formwork, shuttering, and exterior applications.',
		description_ar:
			'خشب أبلكاش بحري مقاوم للماء، سمك ١٨مم. للشدات والتطبيقات الخارجية.',
		category: 'plywood',
		subcategory: 'marine',
		brand: null,
		manufacturer: 'Import — Indonesia',
		specifications: {
			thickness_mm: 18,
			type: 'marine',
			size_m: '1.22×2.44',
			glue: 'WBP',
		},
		unit_of_measure: 'sheet',
		weight_kg: 18,
		price_range_min: 450,
		price_range_max: 650,
		price_tier: 'mid_range',
		availability_status: 'low_stock',
		tags: ['plywood', 'marine', 'formwork', 'shuttering'],
		is_stockable: true,
	},

	// ── Adhesives ──
	{
		id: 'p-022',
		slug: 'tile-adhesive-c2-white-25kg',
		sku: 'ADH-001',
		name: 'Tile Adhesive C2 White 25kg',
		name_ar: 'لاصق بلاط C2 أبيض ٢٥كجم',
		description:
			'Cementitious tile adhesive class C2 for porcelain and large format tiles. White, flexible, for walls and floors.',
		description_ar:
			'لاصق بلاط أسمنتي درجة C2 للبورسلين والبلاط كبير المقاس. أبيض ومرن للحوائط والأرضيات.',
		category: 'adhesives',
		subcategory: 'tile_adhesive',
		brand: 'Saveto',
		manufacturer: 'Saveto Egypt',
		specifications: {
			class: 'C2',
			color: 'white',
			weight_kg: 25,
			coverage_sqm: '4-6',
		},
		unit_of_measure: 'bag',
		weight_kg: 25,
		price_range_min: 120,
		price_range_max: 180,
		price_tier: 'mid_range',
		availability_status: 'available',
		tags: ['adhesive', 'tile', 'cement', 'installation'],
		is_stockable: true,
	},

	// ── Glass ──
	{
		id: 'p-023',
		slug: 'clear-float-glass-6mm',
		sku: 'GLS-001',
		name: 'Clear Float Glass 6mm',
		name_ar: 'زجاج شفاف ٦مم',
		description:
			'Standard clear float glass, 6mm thickness. For windows, partitions, and general glazing. Cut to size available.',
		description_ar:
			'زجاج شفاف قياسي، سمك ٦مم. للشبابيك والقواطع والزجاج العام. متاح القطع حسب المقاس.',
		category: 'glass',
		subcategory: 'clear_float',
		brand: null,
		manufacturer: 'Saint-Gobain Egypt',
		specifications: {
			thickness_mm: 6,
			type: 'clear float',
			light_transmission: '89%',
		},
		unit_of_measure: 'sqm',
		weight_kg: 15,
		price_range_min: 120,
		price_range_max: 180,
		price_tier: 'mid_range',
		availability_status: 'available',
		tags: ['glass', 'float', 'windows', 'glazing'],
		is_stockable: true,
	},

	// ── Hardware ──
	{
		id: 'p-024',
		slug: 'galvanized-bolts-m16x100',
		sku: 'HDW-001',
		name: 'Galvanized Bolts M16×100mm (Box/50)',
		name_ar: 'مسامير جلفنة M16×100مم (علبة/٥٠)',
		description:
			'Hot-dip galvanized hex bolts, M16 × 100mm, Grade 8.8. Box of 50 pieces with nuts and washers.',
		description_ar:
			'مسامير سداسية مجلفنة بالغمس الساخن، M16 × ١٠٠مم، درجة ٨.٨. علبة ٥٠ قطعة بالصواميل والورد.',
		category: 'hardware_fasteners',
		subcategory: 'bolts',
		brand: null,
		manufacturer: 'Import — China',
		specifications: {
			size: 'M16×100',
			grade: '8.8',
			finish: 'hot-dip galvanized',
			qty_per_box: 50,
		},
		unit_of_measure: 'box',
		weight_kg: 12,
		price_range_min: 280,
		price_range_max: 400,
		price_tier: 'budget',
		availability_status: 'available',
		tags: ['bolts', 'fasteners', 'hardware', 'galvanized'],
		is_stockable: true,
	},
]

export function getCatalogProductBySlug(
	slug: string,
): CatalogProduct | undefined {
	return CATALOG_PRODUCTS.find((p) => p.slug === slug)
}

export function getCatalogProductBySku(
	sku: string,
): CatalogProduct | undefined {
	return CATALOG_PRODUCTS.find((p) => p.sku === sku)
}

export function getCatalogProductByName(
	name: string,
): CatalogProduct | undefined {
	return CATALOG_PRODUCTS.find((p) => p.name === name)
}

export function groupByBroadCategory(
	products: CatalogProduct[],
): Record<BroadCategory, CatalogProduct[]> {
	const groups: Record<BroadCategory, CatalogProduct[]> = {
		cement: [],
		steel: [],
		aggregates: [],
		bricks: [],
		timber: [],
		finishing: [],
	}
	for (const p of products) {
		groups[getBroadCategory(p.category)].push(p)
	}
	return groups
}
