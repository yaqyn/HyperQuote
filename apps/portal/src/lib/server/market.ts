/**
 * Market server functions for portal.
 * Product catalog browsing with pagination and quick-add to draft.
 */
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

// ============================================================================
// Types
// ============================================================================

export interface MarketProduct {
  id: string
  slug: string
  name: string
  nameAr: string
  category: string
  unitOfMeasure: string
  priceRangeMin: number | null
  priceRangeMax: number | null
  availabilityStatus: 'available' | 'limited' | 'out_of_stock'
  imageUrl: string
}

export interface MarketProductsResponse {
  products: MarketProduct[]
  nextPage: number | null
  total: number
}

export interface AddToDraftResponse {
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

// ============================================================================
// Mock data -- realistic Egyptian building materials
// ============================================================================

const CAIRO_SKYLINE_PLACEHOLDER =
  'https://cdn.hyperquote.io/placeholders/cairo-skyline.jpg'

const MOCK_PRODUCTS: MarketProduct[] = [
  {
    id: 'prod-cement-opc',
    slug: 'portland-cement-opc-42-5n',
    name: 'Portland Cement OPC 42.5N',
    nameAr: '\u0627\u0633\u0645\u0646\u062a \u0628\u0648\u0631\u062a\u0644\u0627\u0646\u062f\u064a \u0639\u0627\u062f\u064a',
    category: 'cement',
    unitOfMeasure: 'ton',
    priceRangeMin: 1800,
    priceRangeMax: 2200,
    availabilityStatus: 'available',
    imageUrl: CAIRO_SKYLINE_PLACEHOLDER,
  },
  {
    id: 'prod-cement-src',
    slug: 'sulphate-resistant-cement',
    name: 'Sulphate Resistant Cement',
    nameAr: '\u0627\u0633\u0645\u0646\u062a \u0645\u0642\u0627\u0648\u0645 \u0644\u0644\u0643\u0628\u0631\u064a\u062a\u0627\u062a',
    category: 'cement',
    unitOfMeasure: 'ton',
    priceRangeMin: 2100,
    priceRangeMax: 2500,
    availabilityStatus: 'available',
    imageUrl: CAIRO_SKYLINE_PLACEHOLDER,
  },
  {
    id: 'prod-rebar-12',
    slug: 'steel-rebar-12mm-grade-60',
    name: 'Steel Rebar 12mm Grade 60',
    nameAr: '\u062d\u062f\u064a\u062f \u062a\u0633\u0644\u064a\u062d \u0661\u0662\u0645\u0645',
    category: 'reinforcing_steel',
    unitOfMeasure: 'ton',
    priceRangeMin: 36000,
    priceRangeMax: 40000,
    availabilityStatus: 'available',
    imageUrl: CAIRO_SKYLINE_PLACEHOLDER,
  },
  {
    id: 'prod-rebar-16',
    slug: 'steel-rebar-16mm-grade-60',
    name: 'Steel Rebar 16mm Grade 60',
    nameAr: '\u062d\u062f\u064a\u062f \u062a\u0633\u0644\u064a\u062d \u0661\u0666\u0645\u0645',
    category: 'reinforcing_steel',
    unitOfMeasure: 'ton',
    priceRangeMin: 38000,
    priceRangeMax: 42000,
    availabilityStatus: 'available',
    imageUrl: CAIRO_SKYLINE_PLACEHOLDER,
  },
  {
    id: 'prod-rebar-20',
    slug: 'steel-rebar-20mm-grade-60',
    name: 'Steel Rebar 20mm Grade 60',
    nameAr: '\u062d\u062f\u064a\u062f \u062a\u0633\u0644\u064a\u062d \u0662\u0660\u0645\u0645',
    category: 'reinforcing_steel',
    unitOfMeasure: 'ton',
    priceRangeMin: 39000,
    priceRangeMax: 43000,
    availabilityStatus: 'limited',
    imageUrl: CAIRO_SKYLINE_PLACEHOLDER,
  },
  {
    id: 'prod-sand-washed',
    slug: 'washed-sand',
    name: 'Washed Sand',
    nameAr: '\u0631\u0645\u0644 \u0645\u063a\u0633\u0648\u0644',
    category: 'sand',
    unitOfMeasure: 'cubic_meter',
    priceRangeMin: 180,
    priceRangeMax: 250,
    availabilityStatus: 'available',
    imageUrl: CAIRO_SKYLINE_PLACEHOLDER,
  },
  {
    id: 'prod-gravel-20',
    slug: 'crushed-gravel-20mm',
    name: 'Crushed Gravel 20mm',
    nameAr: '\u0632\u0644\u0637 \u0645\u062c\u0631\u0648\u0634 \u0662\u0660\u0645\u0645',
    category: 'aggregates',
    unitOfMeasure: 'cubic_meter',
    priceRangeMin: 200,
    priceRangeMax: 300,
    availabilityStatus: 'available',
    imageUrl: CAIRO_SKYLINE_PLACEHOLDER,
  },
  {
    id: 'prod-brick-red',
    slug: 'red-clay-brick-standard',
    name: 'Red Clay Brick Standard',
    nameAr: '\u0637\u0648\u0628 \u0623\u062d\u0645\u0631',
    category: 'bricks',
    unitOfMeasure: 'piece',
    priceRangeMin: 0.8,
    priceRangeMax: 1.2,
    availabilityStatus: 'available',
    imageUrl: CAIRO_SKYLINE_PLACEHOLDER,
  },
  {
    id: 'prod-brick-cement',
    slug: 'cement-block-20cm',
    name: 'Cement Block 20cm',
    nameAr: '\u0628\u0644\u0648\u0643 \u0623\u0633\u0645\u0646\u062a\u064a \u0662\u0660\u0633\u0645',
    category: 'bricks',
    unitOfMeasure: 'piece',
    priceRangeMin: 5,
    priceRangeMax: 8,
    availabilityStatus: 'available',
    imageUrl: CAIRO_SKYLINE_PLACEHOLDER,
  },
  {
    id: 'prod-plywood-18',
    slug: 'plywood-18mm',
    name: 'Plywood 18mm',
    nameAr: '\u062e\u0634\u0628 \u0623\u0628\u0644\u0643\u0627\u0634 \u0661\u0668\u0645\u0645',
    category: 'wood',
    unitOfMeasure: 'sheet',
    priceRangeMin: 450,
    priceRangeMax: 600,
    availabilityStatus: 'available',
    imageUrl: CAIRO_SKYLINE_PLACEHOLDER,
  },
  {
    id: 'prod-plywood-12',
    slug: 'plywood-12mm',
    name: 'Plywood 12mm',
    nameAr: '\u062e\u0634\u0628 \u0623\u0628\u0644\u0643\u0627\u0634 \u0661\u0662\u0645\u0645',
    category: 'wood',
    unitOfMeasure: 'sheet',
    priceRangeMin: 350,
    priceRangeMax: 480,
    availabilityStatus: 'limited',
    imageUrl: CAIRO_SKYLINE_PLACEHOLDER,
  },
  {
    id: 'prod-paint-white',
    slug: 'acrylic-paint-white-18l',
    name: 'Acrylic Paint White 18L',
    nameAr: '\u0637\u0644\u0627\u0621 \u0623\u0643\u0631\u064a\u0644\u064a\u0643 \u0623\u0628\u064a\u0636 \u0661\u0668\u0644',
    category: 'paints',
    unitOfMeasure: 'bucket',
    priceRangeMin: 800,
    priceRangeMax: 1200,
    availabilityStatus: 'available',
    imageUrl: CAIRO_SKYLINE_PLACEHOLDER,
  },
  {
    id: 'prod-waterproofing',
    slug: 'bitumen-waterproofing-membrane',
    name: 'Bitumen Waterproofing Membrane',
    nameAr: '\u0639\u0632\u0644 \u0628\u064a\u062a\u0648\u0645\u064a\u0646\u064a',
    category: 'waterproofing',
    unitOfMeasure: 'roll',
    priceRangeMin: 250,
    priceRangeMax: 400,
    availabilityStatus: 'available',
    imageUrl: CAIRO_SKYLINE_PLACEHOLDER,
  },
  {
    id: 'prod-pvc-pipe',
    slug: 'pvc-pipe-110mm-6m',
    name: 'PVC Pipe 110mm 6m',
    nameAr: '\u0645\u0627\u0633\u0648\u0631\u0629 PVC \u0661\u0661\u0660\u0645\u0645',
    category: 'plumbing',
    unitOfMeasure: 'piece',
    priceRangeMin: 120,
    priceRangeMax: 180,
    availabilityStatus: 'available',
    imageUrl: CAIRO_SKYLINE_PLACEHOLDER,
  },
  {
    id: 'prod-wire-2-5',
    slug: 'copper-wire-2-5mm',
    name: 'Copper Wire 2.5mm',
    nameAr: '\u0633\u0644\u0643 \u0646\u062d\u0627\u0633 \u0662.\u0665\u0645\u0645',
    category: 'electrical',
    unitOfMeasure: 'meter',
    priceRangeMin: 15,
    priceRangeMax: 25,
    availabilityStatus: 'available',
    imageUrl: CAIRO_SKYLINE_PLACEHOLDER,
  },
  {
    id: 'prod-tiles-ceramic',
    slug: 'ceramic-floor-tile-60x60',
    name: 'Ceramic Floor Tile 60x60',
    nameAr: '\u0628\u0644\u0627\u0637 \u0633\u064a\u0631\u0627\u0645\u064a\u0643 \u0660\u0666\u0660x\u0660\u0666\u0660',
    category: 'tiles',
    unitOfMeasure: 'sqm',
    priceRangeMin: 80,
    priceRangeMax: 150,
    availabilityStatus: 'available',
    imageUrl: CAIRO_SKYLINE_PLACEHOLDER,
  },
  {
    id: 'prod-insulation-xps',
    slug: 'xps-insulation-board-50mm',
    name: 'XPS Insulation Board 50mm',
    nameAr: '\u0644\u0648\u062d \u0639\u0632\u0644 XPS \u0665\u0660\u0645\u0645',
    category: 'insulation',
    unitOfMeasure: 'sqm',
    priceRangeMin: 60,
    priceRangeMax: 90,
    availabilityStatus: 'limited',
    imageUrl: CAIRO_SKYLINE_PLACEHOLDER,
  },
  {
    id: 'prod-concrete-mix',
    slug: 'ready-mix-concrete-c30',
    name: 'Ready Mix Concrete C30',
    nameAr: '\u062e\u0631\u0633\u0627\u0646\u0629 \u062c\u0627\u0647\u0632\u0629 C30',
    category: 'concrete',
    unitOfMeasure: 'cubic_meter',
    priceRangeMin: 1200,
    priceRangeMax: 1600,
    availabilityStatus: 'available',
    imageUrl: CAIRO_SKYLINE_PLACEHOLDER,
  },
  {
    id: 'prod-gypsum-board',
    slug: 'gypsum-board-12mm',
    name: 'Gypsum Board 12mm',
    nameAr: '\u0623\u0644\u0648\u0627\u062d \u062c\u0628\u0633 \u0628\u0648\u0631\u062f \u0661\u0662\u0645\u0645',
    category: 'drywall',
    unitOfMeasure: 'sheet',
    priceRangeMin: 120,
    priceRangeMax: 180,
    availabilityStatus: 'available',
    imageUrl: CAIRO_SKYLINE_PLACEHOLDER,
  },
  {
    id: 'prod-mesh-wire',
    slug: 'welded-wire-mesh-4mm',
    name: 'Welded Wire Mesh 4mm',
    nameAr: '\u0634\u0628\u0643 \u062d\u062f\u064a\u062f \u0645\u0644\u062d\u0648\u0645 \u0664\u0645\u0645',
    category: 'reinforcing_steel',
    unitOfMeasure: 'sheet',
    priceRangeMin: 250,
    priceRangeMax: 350,
    availabilityStatus: 'available',
    imageUrl: CAIRO_SKYLINE_PLACEHOLDER,
  },
  {
    id: 'prod-adhesive-tile',
    slug: 'tile-adhesive-25kg',
    name: 'Tile Adhesive 25kg',
    nameAr: '\u0644\u0627\u0635\u0642 \u0628\u0644\u0627\u0637 \u0662\u0665\u0643\u062c',
    category: 'adhesives',
    unitOfMeasure: 'bag',
    priceRangeMin: 80,
    priceRangeMax: 130,
    availabilityStatus: 'available',
    imageUrl: CAIRO_SKYLINE_PLACEHOLDER,
  },
  {
    id: 'prod-steel-angle',
    slug: 'steel-angle-50x50x5',
    name: 'Steel Angle 50x50x5mm',
    nameAr: '\u0632\u0627\u0648\u064a\u0629 \u062d\u062f\u064a\u062f \u0665\u0660x\u0665\u0660x\u0665\u0645\u0645',
    category: 'structural_steel',
    unitOfMeasure: 'piece',
    priceRangeMin: 180,
    priceRangeMax: 250,
    availabilityStatus: 'available',
    imageUrl: CAIRO_SKYLINE_PLACEHOLDER,
  },
]

// ============================================================================
// getMarketProducts
// ============================================================================

export const getMarketProducts = createServerFn()
  .inputValidator(getMarketProductsInput)
  .handler(
    async ({
      data: input,
    }): Promise<MarketProductsResponse> => {
      const page = input.page ?? 1
      const limit = input.limit ?? 20

      if (!isSupabaseConfigured()) {
        // Mock: filter + paginate
        let filtered = [...MOCK_PRODUCTS]

        if (input.search) {
          const lower = input.search.toLowerCase()
          filtered = filtered.filter(
            (p) =>
              p.name.toLowerCase().includes(lower) ||
              p.nameAr.includes(input.search!) ||
              p.category.includes(lower),
          )
        }

        if (input.category) {
          filtered = filtered.filter((p) => p.category === input.category)
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
      const { getServerSession } = await import('@hyperquote/auth')
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
            headers: {
              Authorization: `Bearer ${session.session.access_token}`,
            },
          },
        },
      )

      let query = supabase
        .from('products')
        .select('id, slug, name, name_ar, category, unit_of_measure, price_range_min, price_range_max, availability_status, image_urls', { count: 'exact' })
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
        products: (data ?? []).map((p) => ({
          id: p.id as string,
          slug: p.slug as string,
          name: p.name as string,
          nameAr: p.name_ar as string,
          category: p.category as string,
          unitOfMeasure: p.unit_of_measure as string,
          priceRangeMin: (p.price_range_min as number) ?? null,
          priceRangeMax: (p.price_range_max as number) ?? null,
          availabilityStatus: p.availability_status as 'available' | 'limited' | 'out_of_stock',
          imageUrl: (p.image_urls as string[])?.[0] ?? CAIRO_SKYLINE_PLACEHOLDER,
        })),
        nextPage: hasMore ? page + 1 : null,
        total,
      }
    },
  )

// ============================================================================
// addToActiveDraft
// ============================================================================

export const addToActiveDraft = createServerFn()
  .inputValidator(addToActiveDraftInput)
  .handler(
    async ({
      data: input,
    }): Promise<AddToDraftResponse> => {
      if (!isSupabaseConfigured()) {
        // Mock: always succeed
        return {
          success: true,
          draftId: 'DRAFT-001',
        }
      }

      const { getServerSession } = await import('@hyperquote/auth')
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
            headers: {
              Authorization: `Bearer ${session.session.access_token}`,
            },
          },
        },
      )

      // Find or create active draft
      const userId = session.session.user.id
      let { data: draft } = await supabase
        .from('quote_requests')
        .select('id')
        .eq('created_by', userId)
        .eq('status', 'draft')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single()

      if (!draft) {
        const { data: newDraft, error: createError } = await supabase
          .from('quote_requests')
          .insert({ created_by: userId, status: 'draft' })
          .select('id')
          .single()

        if (createError) throw new Error(createError.message)
        draft = newDraft
      }

      // Add line item
      const { error: lineError } = await supabase
        .from('quote_request_items')
        .insert({
          quote_request_id: draft!.id,
          product_id: input.productId,
          quantity: input.quantity,
          unit_of_measure: input.uom,
        })

      if (lineError) throw new Error(lineError.message)

      return {
        success: true,
        draftId: draft!.id,
      }
    },
  )
