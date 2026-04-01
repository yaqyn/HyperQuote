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

const MOCK_PRODUCTS = [
  {
    id: 'mock-1',
    slug: 'portland-cement-cemi-42-5n',
    sku: 'CEM-001',
    name: 'Portland Cement CEM I 42.5N',
    name_ar: 'أسمنت بورتلاندي CEM I 42.5N',
    description: 'High-quality ordinary Portland cement suitable for general construction, foundations, and structural concrete.',
    description_ar: 'أسمنت بورتلاندي عادي عالي الجودة مناسب للبناء العام والأساسات والخرسانة الإنشائية.',
    category: 'cement',
    subcategory: 'ordinary_portland',
    brand: 'Sinai Cement',
    manufacturer: 'Sinai Cement Company',
    specifications: { strength_class: '42.5N', type: 'CEM I', standard: 'EN 197-1' },
    unit_of_measure: 'bag_50kg',
    weight_kg: 50,
    price_range_min: 85,
    price_range_max: 110,
    price_tier: 'budget',
    availability_status: 'available',
    image_urls: ['https://websiteassets.hyperquote.net/Images/cairo.webp'],
    tags: ['cement', 'structural', 'foundations'],
    is_stockable: true,
  },
  {
    id: 'mock-2',
    slug: 'steel-rebar-16mm-grade-60',
    sku: 'STL-002',
    name: 'Steel Rebar 16mm Grade 60',
    name_ar: 'حديد تسليح ١٦مم درجة ٦٠',
    description: 'High-strength deformed steel reinforcement bar, 16mm diameter, Grade 60 (420 MPa yield). 12m standard length.',
    description_ar: 'حديد تسليح مشرشر عالي المتانة، قطر ١٦مم، درجة ٦٠. طول قياسي ١٢ متر.',
    category: 'reinforcing_steel',
    subcategory: 'deformed_bars',
    brand: 'Ezz Steel',
    manufacturer: 'Ezz Steel Industries',
    specifications: { diameter_mm: 16, grade: '60', yield_mpa: 420, length_m: 12 },
    unit_of_measure: 'ton',
    weight_kg: 1000,
    price_range_min: 32000,
    price_range_max: 38000,
    price_tier: 'mid_range',
    availability_status: 'available',
    image_urls: ['https://websiteassets.hyperquote.net/Images/cairo.webp'],
    tags: ['steel', 'rebar', 'reinforcement', 'structural'],
    is_stockable: true,
  },
  {
    id: 'mock-3',
    slug: 'red-clay-bricks-standard',
    sku: 'BRK-003',
    name: 'Red Clay Bricks — Standard',
    name_ar: 'طوب أحمر — قياسي',
    description: 'Standard red clay bricks for walls and partitions. Dimensions: 25 × 12 × 6.5 cm. High compressive strength.',
    description_ar: 'طوب أحمر قياسي للحوائط والقواطع. الأبعاد: ٢٥ × ١٢ × ٦.٥ سم. مقاومة ضغط عالية.',
    category: 'bricks',
    subcategory: 'red_clay',
    brand: 'Helwan Bricks',
    manufacturer: 'Helwan Brick Works',
    specifications: { dimensions_cm: '25×12×6.5', compressive_strength_mpa: 7, water_absorption: '< 15%' },
    unit_of_measure: 'piece',
    weight_kg: 2.8,
    price_range_min: 1.2,
    price_range_max: 1.8,
    price_tier: 'budget',
    availability_status: 'low_stock',
    image_urls: ['https://websiteassets.hyperquote.net/Images/cairo.webp'],
    tags: ['bricks', 'clay', 'masonry', 'walls'],
    is_stockable: true,
  },
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
