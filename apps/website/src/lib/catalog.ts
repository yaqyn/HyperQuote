import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { createSupabaseServerClient } from '@hyperquote/auth/server'
import { getRequest } from '@tanstack/react-start/server'
import {
  CATALOG_PRODUCTS,
  getBroadCategory,
  getCategoryImage,
  type BroadCategory,
} from '@hyperquote/types'

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
// Mock catalog — backed by the shared canonical product list
// (see packages/types/src/catalog.ts). When Supabase is wired up, this
// dev fallback is bypassed entirely.
// ============================================================================

const BROAD_EXPANSION: Record<BroadCategory, string[]> = {
  cement: ['cement', 'ready_mix_concrete'],
  steel: ['reinforcing_steel', 'structural_steel', 'aluminum_profiles', 'hardware_fasteners', 'pipes_pvc', 'pipes_metal', 'electrical_cable', 'electrical_conduit'],
  aggregates: ['aggregates', 'sand', 'marble', 'granite'],
  bricks: ['bricks', 'blocks'],
  timber: ['lumber', 'plywood', 'insulation', 'waterproofing', 'roofing'],
  finishing: ['tiles_porcelain', 'tiles_ceramic', 'paint', 'glass', 'gypsum_board', 'adhesives'],
}

function decorate(product: typeof CATALOG_PRODUCTS[number]): Record<string, unknown> {
  return { ...product, image_urls: [getCategoryImage(product.category)] }
}


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
    // Dev fallback: use the shared catalog when no Supabase is configured.
    if (!process.env.SUPABASE_URL || process.env.SUPABASE_URL === 'https://placeholder.supabase.co') {
      let filtered = CATALOG_PRODUCTS.map(decorate)

      if (input.category?.length) {
        const expandedCats = input.category.flatMap(
          (c) => BROAD_EXPANSION[c as BroadCategory] ?? [c],
        )
        filtered = filtered.filter((p) => expandedCats.includes(p.category as string))
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

      if (input.sort === 'name') {
        filtered.sort((a, b) => (a.name as string).localeCompare(b.name as string))
      } else if (input.sort === 'category') {
        filtered.sort(
          (a, b) =>
            (getBroadCategory(a.category as string)).localeCompare(
              getBroadCategory(b.category as string),
            ),
        )
      } else if (input.sort === 'availability') {
        filtered.sort((a, b) =>
          (a.availability_status as string).localeCompare(b.availability_status as string),
        )
      }
      return { items: filtered, total: filtered.length, hasMore: false }
    }

    // Production: use Supabase
    const request = getRequest()
    const { client } = createSupabaseServerClient({
      request,
      supabaseUrl: process.env.SUPABASE_URL!,
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY!,
    })

    let query = client
      .from('products')
      .select(PUBLIC_COLUMNS, { count: 'exact' })
      .eq('is_active', true)

    if (input.category?.length) query = query.in('category', input.category)
    if (input.availability && input.availability !== 'all') query = query.eq('availability_status', input.availability)
    if (input.priceTier?.length) query = query.in('price_tier', input.priceTier)
    if (input.search) query = query.textSearch('search_vector', input.search, { type: 'websearch' })

    switch (input.sort) {
      case 'name': query = query.order('name'); break
      case 'category': query = query.order('category'); break
      case 'availability': query = query.order('availability_status'); break
    }

    const offset = (input.page - 1) * input.limit
    query = query.range(offset, offset + input.limit - 1)

    const { data, error, count } = await query

    if (error) {
      console.error('[getPublicCatalog] Supabase error:', error)
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
      if (!process.env.SUPABASE_URL || process.env.SUPABASE_URL === 'https://placeholder.supabase.co') {
        const found = CATALOG_PRODUCTS.find((p) => p.slug === input.slug)
        return found ? decorate(found) : null
      }
      if (error) console.error('[getProductBySlug] Supabase error:', error)
      return null
    }

    return data
  })
