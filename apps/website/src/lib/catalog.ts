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

    if (error) {
      console.error('[getProductBySlug] Supabase error:', error)
      return null
    }

    return data
  })
