/**
 * CEO search server function.
 * Cross-entity search grouped by type with mock data.
 */
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type {
  EntityType,
  SearchResult,
  SearchResultGroup,
} from '../../types/entity'

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
// Mock data
// ============================================================================

const mockResults: SearchResult[] = [
  // Employees
  { id: 'emp-001', type: 'employee', title: 'Ahmed Fawzi', subtitle: 'Sales Rep -- Sales Department', score: 0.92 },
  { id: 'emp-002', type: 'employee', title: 'Sara El-Sayed', subtitle: 'Account Manager -- Sales Department', score: 0.85 },
  { id: 'emp-003', type: 'employee', title: 'Mohammed Hassan', subtitle: 'Procurement Specialist', score: 0.78 },
  // Customers
  { id: 'cust-001', type: 'customer', title: 'Al-Masriya Construction Co.', subtitle: 'Customer since Jun 2023', score: 0.95 },
  { id: 'cust-002', type: 'customer', title: 'Nile Developers', subtitle: 'Customer since Jan 2024', score: 0.88 },
  { id: 'cust-003', type: 'customer', title: 'Arab Contractors', subtitle: 'Customer since Mar 2023', score: 0.82 },
  // Orders
  { id: 'ord-1204', type: 'order', title: 'ORD-1204', subtitle: 'Al-Masriya Construction -- EGP 3,200,000', score: 0.91 },
  { id: 'ord-1201', type: 'order', title: 'ORD-1201', subtitle: 'Arab Contractors -- EGP 890,000', score: 0.84 },
  { id: 'ord-1198', type: 'order', title: 'ORD-1198', subtitle: 'Nile Developers -- EGP 1,500,000', score: 0.77 },
  // Products
  { id: 'prod-001', type: 'product', title: 'Portland Cement Type I (50kg)', subtitle: 'Category: Cement & Concrete', score: 0.89 },
  { id: 'prod-002', type: 'product', title: 'Rebar 12mm (12m)', subtitle: 'Category: Steel & Rebar', score: 0.83 },
  { id: 'prod-003', type: 'product', title: 'Plywood 18mm', subtitle: 'Category: Wood & Timber', score: 0.76 },
  // Invoices
  { id: 'inv-3892', type: 'invoice', title: 'INV-3892', subtitle: 'Al-Masriya Construction -- EGP 3,648,000', score: 0.90 },
  { id: 'inv-3880', type: 'invoice', title: 'INV-3880', subtitle: 'Nile Developers -- EGP 1,710,000', score: 0.82 },
  { id: 'inv-3875', type: 'invoice', title: 'INV-3875', subtitle: 'Arab Contractors -- EGP 1,015,200', score: 0.75 },
  // Suppliers
  { id: 'sup-001', type: 'supplier', title: 'El-Nasr Steel', subtitle: 'Steel & Rebar -- since Aug 2024', score: 0.88 },
  { id: 'sup-002', type: 'supplier', title: 'Alexandria Cement', subtitle: 'Cement & Concrete -- since Jun 2023', score: 0.81 },
  { id: 'sup-003', type: 'supplier', title: 'Suez Timber', subtitle: 'Wood & Timber -- since Oct 2024', score: 0.74 },
  // Deliveries
  { id: 'del-4521', type: 'delivery', title: 'DEL-4521', subtitle: 'ORD-1204 -- Delivered', score: 0.87 },
  { id: 'del-4518', type: 'delivery', title: 'DEL-4518', subtitle: 'ORD-1201 -- In Transit', score: 0.80 },
  { id: 'del-4515', type: 'delivery', title: 'DEL-4515', subtitle: 'ORD-1198 -- Delivered', score: 0.73 },
]

const entityTypeLabels: Record<EntityType, string> = {
  employee: 'Employees',
  customer: 'Customers',
  order: 'Orders',
  product: 'Products',
  invoice: 'Invoices',
  supplier: 'Suppliers',
  delivery: 'Deliveries',
}

function getMockSearchResults(
  query: string,
  entityTypes?: EntityType[],
  limit = 21,
): SearchResultGroup[] {
  const lowerQuery = query.toLowerCase()

  let filtered = mockResults.filter(
    (r) =>
      r.title.toLowerCase().includes(lowerQuery) ||
      r.subtitle.toLowerCase().includes(lowerQuery),
  )

  if (entityTypes && entityTypes.length > 0) {
    filtered = filtered.filter((r) => entityTypes.includes(r.type))
  }

  // Group by entity type
  const grouped = new Map<EntityType, SearchResult[]>()
  for (const result of filtered) {
    const existing = grouped.get(result.type) ?? []
    existing.push(result)
    grouped.set(result.type, existing)
  }

  // Build groups, top 3 per category, ordered by max score
  const groups: SearchResultGroup[] = []
  for (const [type, results] of grouped) {
    const sorted = results.sort((a, b) => b.score - a.score)
    groups.push({
      type,
      label: entityTypeLabels[type],
      results: sorted.slice(0, 3),
      total: sorted.length,
    })
  }

  // Order groups by relevance (highest score in group)
  groups.sort(
    (a, b) => (b.results[0]?.score ?? 0) - (a.results[0]?.score ?? 0),
  )

  return groups
}

// ============================================================================
// Input schema
// ============================================================================

const searchInput = z.object({
  query: z.string().min(1).max(200),
  entityTypes: z
    .array(
      z.enum([
        'employee',
        'customer',
        'order',
        'product',
        'invoice',
        'supplier',
        'delivery',
      ]),
    )
    .optional(),
  limit: z.number().min(1).max(50).default(21),
})

// ============================================================================
// searchEntities
// ============================================================================

export const searchEntities = createServerFn({ method: 'GET' })
  .inputValidator(searchInput)
  .handler(
    async ({
      data: input,
    }): Promise<SearchResultGroup[]> => {
      if (isSupabaseConfigured()) {
        // TODO: Real Supabase query using search_index + pg_trgm + tsvector
      }

      return getMockSearchResults(
        input.query,
        input.entityTypes as EntityType[] | undefined,
        input.limit,
      )
    },
  )
