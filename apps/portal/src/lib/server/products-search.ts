/**
 * Product search server function.
 * Full-text search using PostgreSQL tsvector on products table.
 * Returns PUBLIC_COLUMNS only -- never cost fields.
 */
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { getServerSession } from '@hyperquote/auth/session'

// ============================================================================
// Public columns whitelist -- NEVER expose cost fields to clients
// ============================================================================

const PUBLIC_COLUMNS = [
  'id',
  'sku',
  'slug',
  'name',
  'name_ar',
  'category',
  'unit_of_measure',
  'price_range_min',
  'price_range_max',
  'availability_status',
  'image_urls',
] as const

const PUBLIC_COLUMNS_SELECT = PUBLIC_COLUMNS.join(', ')

// ============================================================================
// Types
// ============================================================================

export interface ProductSearchResult {
  id: string
  sku: string
  slug: string
  name: string
  nameAr: string
  category: string
  unitOfMeasure: string
  priceRangeMin: number | null
  priceRangeMax: number | null
  availabilityStatus: string
  imageUrls: string[]
}

// ============================================================================
// Schema
// ============================================================================

const searchProductsInput = z.object({
  query: z.string().min(1),
  limit: z.number().int().min(1).max(100).optional(),
})

const getProductCatalogInput = z.object({
  limit: z.number().int().min(1).max(500).optional(),
  offset: z.number().int().min(0).optional(),
})

// ============================================================================
// Helper
// ============================================================================

function isSupabaseConfigured(): boolean {
  return !!(
    process.env.SUPABASE_URL &&
    process.env.SUPABASE_URL !== 'https://placeholder.supabase.co' &&
    process.env.SUPABASE_ANON_KEY &&
    process.env.SUPABASE_ANON_KEY !== 'placeholder'
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapProduct(p: any): ProductSearchResult {
  return {
    id: p.id as string,
    sku: p.sku as string,
    slug: p.slug as string,
    name: p.name as string,
    nameAr: p.name_ar as string,
    category: p.category as string,
    unitOfMeasure: p.unit_of_measure as string,
    priceRangeMin: (p.price_range_min as number) ?? null,
    priceRangeMax: (p.price_range_max as number) ?? null,
    availabilityStatus: p.availability_status as string,
    imageUrls: (p.image_urls as string[]) ?? [],
  }
}

// Mock product data for dev mode
const MOCK_PRODUCTS: ProductSearchResult[] = [
  {
    id: 'prod-cement-1',
    sku: 'CEM-OPC-425N',
    slug: 'portland-cement-opc-42-5n',
    name: 'Portland Cement OPC 42.5N',
    nameAr: '\u0627\u0633\u0645\u0646\u062a \u0628\u0648\u0631\u062a\u0644\u0627\u0646\u062f\u064a \u0639\u0627\u062f\u064a',
    category: 'cement',
    unitOfMeasure: 'ton',
    priceRangeMin: 1800,
    priceRangeMax: 2200,
    availabilityStatus: 'available',
    imageUrls: [],
  },
  {
    id: 'prod-rebar-1',
    sku: 'STL-RB-16MM',
    slug: 'steel-rebar-16mm-grade-60',
    name: 'Steel Rebar 16mm Grade 60',
    nameAr: '\u062d\u062f\u064a\u062f \u062a\u0633\u0644\u064a\u062d \u0661\u0666\u0645\u0645',
    category: 'reinforcing_steel',
    unitOfMeasure: 'ton',
    priceRangeMin: 38000,
    priceRangeMax: 42000,
    availabilityStatus: 'available',
    imageUrls: [],
  },
  {
    id: 'prod-sand-1',
    sku: 'AGG-SAND-W',
    slug: 'washed-sand',
    name: 'Washed Sand',
    nameAr: '\u0631\u0645\u0644 \u0645\u063a\u0633\u0648\u0644',
    category: 'sand',
    unitOfMeasure: 'cubic_meter',
    priceRangeMin: 180,
    priceRangeMax: 250,
    availabilityStatus: 'available',
    imageUrls: [],
  },
  {
    id: 'prod-gravel-1',
    sku: 'AGG-GRV-20',
    slug: 'crushed-gravel-20mm',
    name: 'Crushed Gravel 20mm',
    nameAr: '\u0632\u0644\u0637 \u0645\u062c\u0631\u0648\u0634 \u0662\u0660\u0645\u0645',
    category: 'aggregates',
    unitOfMeasure: 'cubic_meter',
    priceRangeMin: 200,
    priceRangeMax: 300,
    availabilityStatus: 'available',
    imageUrls: [],
  },
  {
    id: 'prod-brick-1',
    sku: 'BRK-RED-STD',
    slug: 'red-clay-brick-standard',
    name: 'Red Clay Brick Standard',
    nameAr: '\u0637\u0648\u0628 \u0623\u062d\u0645\u0631',
    category: 'bricks',
    unitOfMeasure: 'piece',
    priceRangeMin: 0.8,
    priceRangeMax: 1.2,
    availabilityStatus: 'available',
    imageUrls: [],
  },
]

// ============================================================================
// searchProducts
// ============================================================================

export const searchProducts = createServerFn()
  .inputValidator(searchProductsInput)
  .handler(
    async ({
      data: input,
    }): Promise<ProductSearchResult[]> => {
      const limit = input.limit ?? 20

      if (!isSupabaseConfigured()) {
        const lower = input.query.toLowerCase()
        return MOCK_PRODUCTS.filter(
          (p) =>
            p.name.toLowerCase().includes(lower) ||
            p.nameAr.includes(input.query) ||
            p.sku.toLowerCase().includes(lower) ||
            p.category.includes(lower),
        ).slice(0, limit)
      }

      const session = await getServerSession({
        supabaseUrl: process.env.SUPABASE_URL!,
        supabaseAnonKey: process.env.SUPABASE_ANON_KEY!,
      })

      if (!session) throw new Error('Unauthorized')

      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_ANON_KEY!,
        {
          global: {
            headers: { Authorization: `Bearer ${session.session.access_token}` },
          },
        },
      )

      // Full-text search using tsvector
      const { data, error } = await supabase
        .from('products')
        .select(PUBLIC_COLUMNS_SELECT)
        .textSearch('search_vector', input.query, {
          type: 'websearch',
          config: 'english',
        })
        .eq('is_active', true)
        .limit(limit)

      if (error) throw new Error(error.message)

      return (data ?? []).map(mapProduct)
    },
  )

// ============================================================================
// getProductCatalog -- loads products for client-side fuse.js index
// ============================================================================

export const getProductCatalog = createServerFn()
  .inputValidator(getProductCatalogInput)
  .handler(
    async ({
      data: input,
    }): Promise<ProductSearchResult[]> => {
      const limit = input.limit ?? 500
      const offset = input.offset ?? 0

      if (!isSupabaseConfigured()) {
        return MOCK_PRODUCTS
      }

      const session = await getServerSession({
        supabaseUrl: process.env.SUPABASE_URL!,
        supabaseAnonKey: process.env.SUPABASE_ANON_KEY!,
      })

      if (!session) throw new Error('Unauthorized')

      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_ANON_KEY!,
        {
          global: {
            headers: { Authorization: `Bearer ${session.session.access_token}` },
          },
        },
      )

      const { data, error } = await supabase
        .from('products')
        .select(PUBLIC_COLUMNS_SELECT)
        .eq('is_active', true)
        .order('name')
        .range(offset, offset + limit - 1)

      if (error) throw new Error(error.message)

      return (data ?? []).map(mapProduct)
    },
  )
