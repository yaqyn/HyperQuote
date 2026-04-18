/**
 * Market server functions for portal.
 * Product catalog browsing with pagination and quick-add to draft.
 */
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { getAuthenticatedSupabase, isSupabaseConfigured } from './_supabase'

// ============================================================================
// Types
// ============================================================================

export interface ProductSpec {
	label: string
	labelAr: string
	value: string
}

export interface MarketProduct {
	id: string
	slug: string
	name: string
	nameAr: string
	description: string
	descriptionAr: string
	category: string
	unitOfMeasure: string
	priceRangeMin: number | null
	priceRangeMax: number | null
	availabilityStatus: 'available' | 'limited' | 'out_of_stock'
	imageUrl: string
	specs: ProductSpec[]
}

interface MarketProductsResponse {
	products: MarketProduct[]
	nextPage: number | null
	total: number
}

interface AddToDraftResponse {
	success: boolean
	draftId: string
}

// ============================================================================
// Schemas
// ============================================================================

const getMarketProductsInput = z.object({
	search: z.string().optional(),
	category: z.string().optional(),
	page: z.number().int().min(1).default(1),
	limit: z.number().int().min(1).max(50).default(20),
})

const addToActiveDraftInput = z.object({
	productId: z.string(),
	quantity: z.number().min(1),
	uom: z.string(),
})

// ============================================================================
// Mock data -- realistic Egyptian building materials
// ============================================================================

const IMG_BASE = 'https://websiteassets.hyperquote.net/Images'
const CATEGORY_IMG: Record<string, string> = {
	cement: `${IMG_BASE}/cement.webp`,
	reinforcing_steel: `${IMG_BASE}/steel.webp`,
	structural_steel: `${IMG_BASE}/steel.webp`,
	aggregates: `${IMG_BASE}/Aggregates.webp`,
	sand: `${IMG_BASE}/Aggregates.webp`,
	bricks: `${IMG_BASE}/bricks.webp`,
	wood: `${IMG_BASE}/wood.webp`,
	paints: `${IMG_BASE}/finish.webp`,
	waterproofing: `${IMG_BASE}/wood.webp`,
	plumbing: `${IMG_BASE}/steel.webp`,
	electrical: `${IMG_BASE}/steel.webp`,
	tiles: `${IMG_BASE}/finish.webp`,
	insulation: `${IMG_BASE}/wood.webp`,
	concrete: `${IMG_BASE}/cement.webp`,
	drywall: `${IMG_BASE}/finish.webp`,
	adhesives: `${IMG_BASE}/finish.webp`,
}
function imgFor(category: string) {
	return CATEGORY_IMG[category] ?? `${IMG_BASE}/cement.webp`
}

const MOCK_PRODUCTS: MarketProduct[] = [
	{
		id: 'prod-cement-opc',
		slug: 'portland-cement-opc-42-5n',
		name: 'Portland Cement OPC 42.5N',
		nameAr: 'اسمنت بورتلاندي عادي',
		description:
			'General purpose Portland cement for foundations, structural concrete, and masonry. Meets EN 197-1 standard.',
		descriptionAr:
			'اسمنت بورتلاندي عادي للأساسات والخرسانة الإنشائية والبناء. يلبي معيار EN 197-1.',
		category: 'cement',
		unitOfMeasure: 'ton',
		priceRangeMin: 1800,
		priceRangeMax: 2200,
		availabilityStatus: 'available',
		imageUrl: imgFor('cement'),
		specs: [
			{ label: 'Grade', labelAr: 'الدرجة', value: '42.5N' },
			{ label: 'Bag Size', labelAr: 'حجم الشيكارة', value: '50 kg' },
			{ label: 'Standard', labelAr: 'المعيار', value: 'EN 197-1' },
			{ label: 'Type', labelAr: 'النوع', value: 'OPC' },
		],
	},
	{
		id: 'prod-cement-src',
		slug: 'sulphate-resistant-cement',
		name: 'Sulphate Resistant Cement',
		nameAr: 'اسمنت مقاوم للكبريتات',
		description:
			'Sulfate resistant Portland cement for foundations in high-sulfate soil. Ideal for coastal and underground structures.',
		descriptionAr:
			'اسمنت بورتلاندي مقاوم للكبريتات للأساسات في التربة عالية الكبريتات. مثالي للمنشآت الساحلية والتحت أرضية.',
		category: 'cement',
		unitOfMeasure: 'ton',
		priceRangeMin: 2100,
		priceRangeMax: 2500,
		availabilityStatus: 'available',
		imageUrl: imgFor('cement'),
		specs: [
			{ label: 'Grade', labelAr: 'الدرجة', value: '42.5N' },
			{ label: 'Bag Size', labelAr: 'حجم الشيكارة', value: '50 kg' },
			{ label: 'Resistance', labelAr: 'المقاومة', value: 'High sulfate' },
		],
	},
	{
		id: 'prod-rebar-12',
		slug: 'steel-rebar-12mm-grade-60',
		name: 'Steel Rebar 12mm Grade 60',
		nameAr: 'حديد تسليح ١٢مم',
		description:
			'Deformed reinforcement bar, 12mm diameter, Grade 60 (420 MPa yield). 12m standard length.',
		descriptionAr: 'حديد تسليح مشرشر قطر ١٢مم درجة ٦٠. طول قياسي ١٢ متر.',
		category: 'reinforcing_steel',
		unitOfMeasure: 'ton',
		priceRangeMin: 36000,
		priceRangeMax: 40000,
		availabilityStatus: 'available',
		imageUrl: imgFor('reinforcing_steel'),
		specs: [
			{ label: 'Diameter', labelAr: 'القطر', value: '12 mm' },
			{ label: 'Grade', labelAr: 'الدرجة', value: '60' },
			{ label: 'Yield', labelAr: 'قوة الخضوع', value: '420 MPa' },
			{ label: 'Length', labelAr: 'الطول', value: '12 m' },
		],
	},
	{
		id: 'prod-rebar-16',
		slug: 'steel-rebar-16mm-grade-60',
		name: 'Steel Rebar 16mm Grade 60',
		nameAr: 'حديد تسليح ١٦مم',
		description:
			'High-strength deformed steel bar, 16mm diameter. For columns, beams, and structural elements.',
		descriptionAr:
			'حديد تسليح مشرشر عالي المتانة قطر ١٦مم. للأعمدة والكمرات والعناصر الإنشائية.',
		category: 'reinforcing_steel',
		unitOfMeasure: 'ton',
		priceRangeMin: 38000,
		priceRangeMax: 42000,
		availabilityStatus: 'available',
		imageUrl: imgFor('reinforcing_steel'),
		specs: [
			{ label: 'Diameter', labelAr: 'القطر', value: '16 mm' },
			{ label: 'Grade', labelAr: 'الدرجة', value: '60' },
			{ label: 'Yield', labelAr: 'قوة الخضوع', value: '420 MPa' },
			{ label: 'Length', labelAr: 'الطول', value: '12 m' },
		],
	},
	{
		id: 'prod-rebar-20',
		slug: 'steel-rebar-20mm-grade-60',
		name: 'Steel Rebar 20mm Grade 60',
		nameAr: 'حديد تسليح ٢٠مم',
		description:
			'Heavy-duty deformed steel bar, 20mm diameter. For heavy structural applications.',
		descriptionAr: 'حديد تسليح مشرشر للأحمال الثقيلة قطر ٢٠مم.',
		category: 'reinforcing_steel',
		unitOfMeasure: 'ton',
		priceRangeMin: 39000,
		priceRangeMax: 43000,
		availabilityStatus: 'limited',
		imageUrl: imgFor('reinforcing_steel'),
		specs: [
			{ label: 'Diameter', labelAr: 'القطر', value: '20 mm' },
			{ label: 'Grade', labelAr: 'الدرجة', value: '60' },
			{ label: 'Yield', labelAr: 'قوة الخضوع', value: '420 MPa' },
			{ label: 'Length', labelAr: 'الطول', value: '12 m' },
		],
	},
	{
		id: 'prod-sand-washed',
		slug: 'washed-sand',
		name: 'Washed Sand',
		nameAr: 'رمل مغسول',
		description:
			'Fine washed natural sand for plastering and finishing. Low silt content, consistent grain size.',
		descriptionAr: 'رمل طبيعي ناعم مغسول للمحارة والتشطيبات. نسبة طمي منخفضة.',
		category: 'sand',
		unitOfMeasure: 'cubic_meter',
		priceRangeMin: 180,
		priceRangeMax: 250,
		availabilityStatus: 'available',
		imageUrl: imgFor('sand'),
		specs: [
			{ label: 'Grade', labelAr: 'الدرجة', value: 'Fine' },
			{ label: 'Silt Content', labelAr: 'نسبة الطمي', value: '< 3%' },
			{ label: 'Source', labelAr: 'المصدر', value: 'Natural' },
		],
	},
	{
		id: 'prod-gravel-20',
		slug: 'crushed-gravel-20mm',
		name: 'Crushed Gravel 20mm',
		nameAr: 'زلط مجروش ٢٠مم',
		description:
			'Washed crushed limestone gravel for concrete production. Size 1 (5-20mm), low clay content.',
		descriptionAr: 'زلط حجر جيري مكسر ومغسول لإنتاج الخرسانة. مقاس ٥-٢٠مم.',
		category: 'aggregates',
		unitOfMeasure: 'cubic_meter',
		priceRangeMin: 200,
		priceRangeMax: 300,
		availabilityStatus: 'available',
		imageUrl: imgFor('aggregates'),
		specs: [
			{ label: 'Size', labelAr: 'المقاس', value: '5-20 mm' },
			{ label: 'Type', labelAr: 'النوع', value: 'Crushed limestone' },
			{ label: 'Clay Content', labelAr: 'نسبة الطين', value: '< 2%' },
		],
	},
	{
		id: 'prod-brick-red',
		slug: 'red-clay-brick-standard',
		name: 'Red Clay Brick Standard',
		nameAr: 'طوب أحمر',
		description:
			'Standard red clay bricks for walls and partitions. Dimensions: 25 × 12 × 6.5 cm.',
		descriptionAr:
			'طوب أحمر قياسي للحوائط والقواطع. الأبعاد: ٢٥ × ١٢ × ٦.٥ سم.',
		category: 'bricks',
		unitOfMeasure: 'piece',
		priceRangeMin: 0.8,
		priceRangeMax: 1.2,
		availabilityStatus: 'available',
		imageUrl: imgFor('bricks'),
		specs: [
			{ label: 'Dimensions', labelAr: 'الأبعاد', value: '25×12×6.5 cm' },
			{ label: 'Strength', labelAr: 'قوة التحمل', value: '7 MPa' },
			{ label: 'Absorption', labelAr: 'الامتصاص', value: '< 15%' },
		],
	},
	{
		id: 'prod-brick-cement',
		slug: 'cement-block-20cm',
		name: 'Cement Block 20cm',
		nameAr: 'بلوك أسمنتي ٢٠سم',
		description:
			'Load-bearing concrete hollow blocks, 20cm width. For exterior walls and structural partitions.',
		descriptionAr:
			'بلوك خرساني مفرغ حامل للأحمال عرض ٢٠سم. للحوائط الخارجية والقواطع الإنشائية.',
		category: 'bricks',
		unitOfMeasure: 'piece',
		priceRangeMin: 5,
		priceRangeMax: 8,
		availabilityStatus: 'available',
		imageUrl: imgFor('bricks'),
		specs: [
			{ label: 'Width', labelAr: 'العرض', value: '20 cm' },
			{ label: 'Type', labelAr: 'النوع', value: 'Hollow' },
			{ label: 'Load Bearing', labelAr: 'حامل أحمال', value: 'Yes' },
			{ label: 'Strength', labelAr: 'قوة التحمل', value: '5 MPa' },
		],
	},
	{
		id: 'prod-plywood-18',
		slug: 'plywood-18mm',
		name: 'Plywood 18mm',
		nameAr: 'خشب أبلكاش ١٨مم',
		description:
			'Multi-layer plywood sheets, 18mm thickness. For formwork, furniture, and general construction.',
		descriptionAr:
			'ألواح خشب أبلكاش متعددة الطبقات سمك ١٨مم. للشدات والأثاث والبناء العام.',
		category: 'wood',
		unitOfMeasure: 'sheet',
		priceRangeMin: 450,
		priceRangeMax: 600,
		availabilityStatus: 'available',
		imageUrl: imgFor('wood'),
		specs: [
			{ label: 'Thickness', labelAr: 'السمك', value: '18 mm' },
			{ label: 'Sheet Size', labelAr: 'مقاس اللوح', value: '2440×1220 mm' },
			{ label: 'Layers', labelAr: 'الطبقات', value: '13' },
		],
	},
	{
		id: 'prod-plywood-12',
		slug: 'plywood-12mm',
		name: 'Plywood 12mm',
		nameAr: 'خشب أبلكاش ١٢مم',
		description:
			'Multi-layer plywood sheets, 12mm thickness. For partitions, ceilings, and light formwork.',
		descriptionAr:
			'ألواح خشب أبلكاش سمك ١٢مم. للقواطع والأسقف والشدات الخفيفة.',
		category: 'wood',
		unitOfMeasure: 'sheet',
		priceRangeMin: 350,
		priceRangeMax: 480,
		availabilityStatus: 'limited',
		imageUrl: imgFor('wood'),
		specs: [
			{ label: 'Thickness', labelAr: 'السمك', value: '12 mm' },
			{ label: 'Sheet Size', labelAr: 'مقاس اللوح', value: '2440×1220 mm' },
			{ label: 'Layers', labelAr: 'الطبقات', value: '9' },
		],
	},
	{
		id: 'prod-paint-white',
		slug: 'acrylic-paint-white-18l',
		name: 'Acrylic Paint White 18L',
		nameAr: 'طلاء أكريليك أبيض ١٨ل',
		description:
			'Interior/exterior acrylic emulsion paint. Washable, low VOC, excellent coverage.',
		descriptionAr:
			'طلاء أكريليك مائي للداخل والخارج. قابل للغسيل، منخفض المركبات العضوية.',
		category: 'paints',
		unitOfMeasure: 'bucket',
		priceRangeMin: 800,
		priceRangeMax: 1200,
		availabilityStatus: 'available',
		imageUrl: imgFor('paints'),
		specs: [
			{ label: 'Volume', labelAr: 'الحجم', value: '18 L' },
			{ label: 'Finish', labelAr: 'اللمعة', value: 'Matt' },
			{ label: 'Coverage', labelAr: 'التغطية', value: '12 m²/L' },
			{ label: 'VOC', labelAr: 'المركبات العضوية', value: 'Low' },
		],
	},
	{
		id: 'prod-waterproofing',
		slug: 'bitumen-waterproofing-membrane',
		name: 'Bitumen Waterproofing Membrane',
		nameAr: 'عزل بيتوميني',
		description:
			'Self-adhesive modified bitumen membrane for roof and foundation waterproofing. 4mm thick.',
		descriptionAr:
			'رول عزل بيتوميني معدل ذاتي اللصق للأسطح والأساسات. سمك ٤مم.',
		category: 'waterproofing',
		unitOfMeasure: 'roll',
		priceRangeMin: 250,
		priceRangeMax: 400,
		availabilityStatus: 'available',
		imageUrl: imgFor('waterproofing'),
		specs: [
			{ label: 'Thickness', labelAr: 'السمك', value: '4 mm' },
			{ label: 'Roll Size', labelAr: 'مقاس الرول', value: '1×10 m' },
			{ label: 'Type', labelAr: 'النوع', value: 'Modified bitumen' },
		],
	},
	{
		id: 'prod-pvc-pipe',
		slug: 'pvc-pipe-110mm-6m',
		name: 'PVC Pipe 110mm 6m',
		nameAr: 'ماسورة PVC ١١٠مم',
		description:
			'Rigid PVC drainage pipe, 110mm diameter, 6m length. For sewage and rainwater systems.',
		descriptionAr:
			'ماسورة صرف PVC صلبة قطر ١١٠مم طول ٦ متر. لشبكات الصرف ومياه الأمطار.',
		category: 'plumbing',
		unitOfMeasure: 'piece',
		priceRangeMin: 120,
		priceRangeMax: 180,
		availabilityStatus: 'available',
		imageUrl: imgFor('plumbing'),
		specs: [
			{ label: 'Diameter', labelAr: 'القطر', value: '110 mm' },
			{ label: 'Length', labelAr: 'الطول', value: '6 m' },
			{ label: 'Pressure', labelAr: 'الضغط', value: 'SN4' },
		],
	},
	{
		id: 'prod-wire-2-5',
		slug: 'copper-wire-2-5mm',
		name: 'Copper Wire 2.5mm²',
		nameAr: 'سلك نحاس ٢.٥مم²',
		description:
			'Single-core copper conductor, PVC insulated, 2.5mm² cross-section. For power circuits.',
		descriptionAr: 'سلك نحاس أحادي النواة معزول PVC مقطع ٢.٥مم². لدوائر القوى.',
		category: 'electrical',
		unitOfMeasure: 'meter',
		priceRangeMin: 15,
		priceRangeMax: 25,
		availabilityStatus: 'available',
		imageUrl: imgFor('electrical'),
		specs: [
			{ label: 'Cross-section', labelAr: 'المقطع', value: '2.5 mm²' },
			{ label: 'Insulation', labelAr: 'العزل', value: 'PVC' },
			{ label: 'Cores', labelAr: 'الأنوية', value: '1' },
			{ label: 'Voltage', labelAr: 'الفولت', value: '450/750V' },
		],
	},
	{
		id: 'prod-tiles-ceramic',
		slug: 'ceramic-floor-tile-60x60',
		name: 'Ceramic Floor Tile 60×60',
		nameAr: 'بلاط سيراميك ٦٠×٦٠',
		description:
			'Glazed ceramic floor tile, 60×60cm. Suitable for residential and commercial floors.',
		descriptionAr:
			'بلاط سيراميك أرضي مزجج ٦٠×٦٠سم. مناسب للأرضيات السكنية والتجارية.',
		category: 'tiles',
		unitOfMeasure: 'sqm',
		priceRangeMin: 80,
		priceRangeMax: 150,
		availabilityStatus: 'available',
		imageUrl: imgFor('tiles'),
		specs: [
			{ label: 'Size', labelAr: 'المقاس', value: '60×60 cm' },
			{ label: 'Finish', labelAr: 'السطح', value: 'Glazed' },
			{ label: 'Slip Rating', labelAr: 'مقاومة الانزلاق', value: 'R9' },
		],
	},
	{
		id: 'prod-insulation-xps',
		slug: 'xps-insulation-board-50mm',
		name: 'XPS Insulation Board 50mm',
		nameAr: 'لوح عزل XPS ٥٠مم',
		description:
			'Extruded polystyrene insulation board, 50mm thick. High compressive strength for roofs and floors.',
		descriptionAr:
			'لوح عزل بوليسترين مبثوق سمك ٥٠مم. قوة ضغط عالية للأسطح والأرضيات.',
		category: 'insulation',
		unitOfMeasure: 'sqm',
		priceRangeMin: 60,
		priceRangeMax: 90,
		availabilityStatus: 'limited',
		imageUrl: imgFor('insulation'),
		specs: [
			{ label: 'Thickness', labelAr: 'السمك', value: '50 mm' },
			{ label: 'R-value', labelAr: 'قيمة العزل', value: '1.75 m²K/W' },
			{ label: 'Density', labelAr: 'الكثافة', value: '32 kg/m³' },
		],
	},
	{
		id: 'prod-concrete-mix',
		slug: 'ready-mix-concrete-c30',
		name: 'Ready Mix Concrete C30',
		nameAr: 'خرسانة جاهزة C30',
		description:
			'Factory-batched ready mix concrete, C30 grade. Delivered by mixer truck, minimum 6 m³ order.',
		descriptionAr:
			'خرسانة جاهزة من المصنع درجة C30. التوصيل بسيارة خلاطة، حد أدنى ٦ م³.',
		category: 'concrete',
		unitOfMeasure: 'cubic_meter',
		priceRangeMin: 1200,
		priceRangeMax: 1600,
		availabilityStatus: 'available',
		imageUrl: imgFor('concrete'),
		specs: [
			{ label: 'Grade', labelAr: 'الدرجة', value: 'C30' },
			{ label: 'Slump', labelAr: 'الهبوط', value: '100-150 mm' },
			{ label: 'Min Order', labelAr: 'أقل طلب', value: '6 m³' },
		],
	},
	{
		id: 'prod-gypsum-board',
		slug: 'gypsum-board-12mm',
		name: 'Gypsum Board 12mm',
		nameAr: 'ألواح جبس بورد ١٢مم',
		description:
			'Standard gypsum plasterboard, 12mm thick. For interior walls, ceilings, and dry lining.',
		descriptionAr: 'ألواح جبس بورد قياسية سمك ١٢مم. للحوائط الداخلية والأسقف.',
		category: 'drywall',
		unitOfMeasure: 'sheet',
		priceRangeMin: 120,
		priceRangeMax: 180,
		availabilityStatus: 'available',
		imageUrl: imgFor('drywall'),
		specs: [
			{ label: 'Thickness', labelAr: 'السمك', value: '12 mm' },
			{ label: 'Sheet Size', labelAr: 'مقاس اللوح', value: '2400×1200 mm' },
			{ label: 'Weight', labelAr: 'الوزن', value: '8.5 kg/m²' },
		],
	},
	{
		id: 'prod-mesh-wire',
		slug: 'welded-wire-mesh-4mm',
		name: 'Welded Wire Mesh 4mm',
		nameAr: 'شبك حديد ملحوم ٤مم',
		description:
			'Welded steel wire mesh sheets for slab reinforcement. Wire diameter 4mm, grid 200×200mm.',
		descriptionAr:
			'ألواح شبك حديد ملحوم لتسليح البلاطات. قطر السلك ٤مم، شبكة ٢٠٠×٢٠٠مم.',
		category: 'reinforcing_steel',
		unitOfMeasure: 'sheet',
		priceRangeMin: 250,
		priceRangeMax: 350,
		availabilityStatus: 'available',
		imageUrl: imgFor('reinforcing_steel'),
		specs: [
			{ label: 'Wire Diameter', labelAr: 'قطر السلك', value: '4 mm' },
			{ label: 'Grid', labelAr: 'الشبكة', value: '200×200 mm' },
			{ label: 'Sheet Size', labelAr: 'مقاس اللوح', value: '2.4×6 m' },
		],
	},
	{
		id: 'prod-adhesive-tile',
		slug: 'tile-adhesive-25kg',
		name: 'Tile Adhesive 25kg',
		nameAr: 'لاصق بلاط ٢٥كج',
		description:
			'Cement-based tile adhesive for floor and wall tiles. Suitable for interior and exterior use.',
		descriptionAr:
			'لاصق بلاط أسمنتي للأرضيات والحوائط. مناسب للاستخدام الداخلي والخارجي.',
		category: 'adhesives',
		unitOfMeasure: 'bag',
		priceRangeMin: 80,
		priceRangeMax: 130,
		availabilityStatus: 'available',
		imageUrl: imgFor('adhesives'),
		specs: [
			{ label: 'Weight', labelAr: 'الوزن', value: '25 kg' },
			{ label: 'Coverage', labelAr: 'التغطية', value: '4-5 m²' },
			{ label: 'Open Time', labelAr: 'وقت العمل', value: '20 min' },
		],
	},
	{
		id: 'prod-steel-angle',
		slug: 'steel-angle-50x50x5',
		name: 'Steel Angle 50×50×5mm',
		nameAr: 'زاوية حديد ٥٠×٥٠×٥مم',
		description:
			'Hot-rolled equal angle steel, 50×50×5mm. 6m standard length. For frames and structural supports.',
		descriptionAr: 'زاوية حديد متساوية مدرفلة على الساخن ٥٠×٥٠×٥مم. طول ٦ متر.',
		category: 'structural_steel',
		unitOfMeasure: 'piece',
		priceRangeMin: 180,
		priceRangeMax: 250,
		availabilityStatus: 'available',
		imageUrl: imgFor('structural_steel'),
		specs: [
			{ label: 'Dimensions', labelAr: 'الأبعاد', value: '50×50×5 mm' },
			{ label: 'Length', labelAr: 'الطول', value: '6 m' },
			{ label: 'Weight', labelAr: 'الوزن', value: '3.77 kg/m' },
		],
	},
]

// ============================================================================
// getMarketProducts
// ============================================================================

export const getMarketProducts = createServerFn()
	.inputValidator(getMarketProductsInput)
	.handler(async ({ data: input }): Promise<MarketProductsResponse> => {
		const page = input.page ?? 1
		const limit = input.limit ?? 20

		if (!isSupabaseConfigured()) {
			// Mock: filter + paginate
			let filtered = [...MOCK_PRODUCTS]

			if (input.search) {
				const lower = input.search.toLowerCase()
				const raw = input.search
				filtered = filtered.filter(
					(p) =>
						p.name.toLowerCase().includes(lower) ||
						p.nameAr.includes(raw) ||
						p.category.includes(lower),
				)
			}

			if (input.category) {
				const cats = input.category.split(',').map((c) => c.trim())
				filtered = filtered.filter((p) => cats.includes(p.category))
			}

			const total = filtered.length
			const start = (page - 1) * limit
			const end = start + limit
			const products = filtered.slice(start, end)
			const hasMore = end < total

			return {
				products,
				nextPage: hasMore ? page + 1 : null,
				total,
			}
		}

		// Real Supabase implementation
		const { supabase } = await getAuthenticatedSupabase()

		let query = supabase
			.from('products')
			.select(
				'id, slug, name, name_ar, description, description_ar, category, unit_of_measure, price_range_min, price_range_max, availability_status, image_urls, specs',
				{ count: 'exact' },
			)
			.eq('is_active', true)

		if (input.search) {
			query = query.textSearch('search_vector', input.search, {
				type: 'websearch',
				config: 'english',
			})
		}

		if (input.category) {
			query = query.eq('category', input.category)
		}

		const start = (page - 1) * limit
		query = query.order('name').range(start, start + limit - 1)

		const { data, error, count } = await query

		if (error) throw new Error(error.message)

		const total = count ?? 0
		const hasMore = start + limit < total

		return {
			products: (data ?? []).map((p): MarketProduct => {
				const category = p.category as string
				return {
					id: p.id as string,
					slug: p.slug as string,
					name: p.name as string,
					nameAr: p.name_ar as string,
					description: (p.description as string) ?? '',
					descriptionAr: (p.description_ar as string) ?? '',
					category,
					unitOfMeasure: p.unit_of_measure as string,
					priceRangeMin: (p.price_range_min as number) ?? null,
					priceRangeMax: (p.price_range_max as number) ?? null,
					availabilityStatus: p.availability_status as
						| 'available'
						| 'limited'
						| 'out_of_stock',
					imageUrl: (p.image_urls as string[])?.[0] ?? imgFor(category),
					specs: (p.specs as ProductSpec[]) ?? [],
				}
			}),
			nextPage: hasMore ? page + 1 : null,
			total,
		}
	})

// ============================================================================
// addToActiveDraft
// ============================================================================

const addToActiveDraft = createServerFn()
	.inputValidator(addToActiveDraftInput)
	.handler(async ({ data: input }): Promise<AddToDraftResponse> => {
		if (!isSupabaseConfigured()) {
			// Mock: always succeed
			return {
				success: true,
				draftId: 'DRAFT-001',
			}
		}

		const { supabase, session } = await getAuthenticatedSupabase()

		// Find or create active draft
		const userId = session.session.user.id
		const { data: existingDraft } = await supabase
			.from('quote_requests')
			.select('id')
			.eq('created_by', userId)
			.eq('status', 'draft')
			.order('updated_at', { ascending: false })
			.limit(1)
			.single()

		let draftId: string | undefined = existingDraft?.id

		if (!draftId) {
			const { data: newDraft, error: createError } = await supabase
				.from('quote_requests')
				.insert({ created_by: userId, status: 'draft' })
				.select('id')
				.single()

			if (createError) throw new Error(createError.message)
			draftId = newDraft?.id
		}

		if (!draftId) throw new Error('Failed to resolve draft id')

		// Add line item
		const { error: lineError } = await supabase
			.from('quote_request_items')
			.insert({
				quote_request_id: draftId,
				product_id: input.productId,
				quantity: input.quantity,
				unit_of_measure: input.uom,
			})

		if (lineError) throw new Error(lineError.message)

		return {
			success: true,
			draftId,
		}
	})
