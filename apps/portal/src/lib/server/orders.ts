/**
 * Orders server functions.
 * Customer orders, quotes, history, reorder, saved lists.
 * Dev mode fallback when Supabase not configured.
 */
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type { Order, SavedList } from '../../types/order'

// ============================================================================
// Helper: check if Supabase is configured
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
// Mock data for dev mode
// ============================================================================

function getMockOrders(): Order[] {
  const now = new Date()
  return [
    {
      id: 'ord-001',
      reference: 'QR-2026-00042',
      status: 'order_confirmed',
      description: 'Portland Cement 50kg, Rebar 12mm',
      itemCount: 4,
      date: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      amount: 245000,
      currency: 'EGP',
    },
    {
      id: 'ord-002',
      reference: 'QR-2026-00038',
      status: 'being_prepared',
      description: 'Washed Sand, Gravel 20mm',
      itemCount: 2,
      date: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      amount: 37700,
      currency: 'EGP',
    },
    {
      id: 'ord-003',
      reference: 'QR-2026-00035',
      status: 'out_for_delivery',
      description: 'Red Bricks, Welded Steel Mesh 6mm',
      itemCount: 3,
      date: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      amount: 89000,
      currency: 'EGP',
    },
    {
      id: 'ord-004',
      reference: 'QR-2026-00030',
      status: 'submitted',
      description: 'Plywood 18mm, Paint White 20L',
      itemCount: 5,
      date: new Date(now.getTime() - 0.5 * 24 * 60 * 60 * 1000).toISOString(),
      amount: null,
      currency: 'EGP',
    },
    {
      id: 'ord-005',
      reference: 'QR-2026-00028',
      status: 'accepted',
      description: 'Ceramic Tiles 60x60, Adhesive',
      itemCount: 2,
      date: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      amount: 156000,
      currency: 'EGP',
    },
    {
      id: 'ord-006',
      reference: 'QR-2026-00025',
      status: 'quote_ready',
      description: 'PVC Pipes 4", Fittings',
      itemCount: 8,
      date: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      amount: 42500,
      currency: 'EGP',
    },
  ]
}

function getMockQuotes(): Order[] {
  const now = new Date()
  return [
    {
      id: 'qt-001',
      reference: 'QT-2026-00142',
      status: 'quote_ready',
      description: 'Portland Cement 50kg, Rebar 12mm, Sand',
      itemCount: 6,
      date: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      amount: 444200,
      currency: 'EGP',
    },
    {
      id: 'qt-002',
      reference: 'QT-2026-00138',
      status: 'negotiating',
      description: 'Gravel 20mm, Red Bricks',
      itemCount: 3,
      date: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      amount: 67800,
      currency: 'EGP',
    },
    {
      id: 'qt-003',
      reference: 'QT-2026-00130',
      status: 'expired',
      description: 'Welded Steel Mesh 6mm',
      itemCount: 1,
      date: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString(),
      amount: 25000,
      currency: 'EGP',
    },
  ]
}

function getMockHistory(): Order[] {
  const now = new Date()
  return [
    {
      id: 'hist-001',
      reference: 'QR-2026-00020',
      status: 'delivered',
      description: 'Portland Cement 50kg, Rebar 12mm',
      itemCount: 4,
      date: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      amount: 198000,
      currency: 'EGP',
    },
    {
      id: 'hist-002',
      reference: 'QR-2026-00015',
      status: 'delivered',
      description: 'Washed Sand, Gravel 20mm, Red Bricks',
      itemCount: 5,
      date: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000).toISOString(),
      amount: 112500,
      currency: 'EGP',
    },
    {
      id: 'hist-003',
      reference: 'QR-2026-00010',
      status: 'cancelled',
      description: 'PVC Pipes, Fittings, Adhesive',
      itemCount: 6,
      date: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString(),
      amount: 55000,
      currency: 'EGP',
    },
    {
      id: 'hist-004',
      reference: 'QR-2025-00998',
      status: 'delivered',
      description: 'Ceramic Tiles 60x60, Grout',
      itemCount: 3,
      date: new Date(now.getTime() - 75 * 24 * 60 * 60 * 1000).toISOString(),
      amount: 87000,
      currency: 'EGP',
    },
  ]
}

function getMockSavedLists(): SavedList[] {
  const now = new Date()
  return [
    {
      id: 'sl-001',
      name: 'Monthly Cement Order',
      items: [
        { productId: 'p-001', productName: 'Portland Cement 50kg', quantity: 500, uom: 'bag' },
        { productId: 'p-002', productName: 'Rebar 12mm', quantity: 10, uom: 'ton' },
        { productId: 'p-003', productName: 'Washed Sand', quantity: 50, uom: 'cubic_meter' },
      ],
      lastUsedAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'sl-002',
      name: 'Site B Supplies',
      items: [
        { productId: 'p-004', productName: 'Red Bricks', quantity: 5, uom: 'thousand' },
        { productId: 'p-005', productName: 'Welded Steel Mesh 6mm', quantity: 20, uom: 'sheet' },
        { productId: 'p-006', productName: 'Gravel 20mm', quantity: 40, uom: 'cubic_meter' },
        { productId: 'p-007', productName: 'Plywood 18mm', quantity: 30, uom: 'sheet' },
        { productId: 'p-008', productName: 'PVC Pipes 4"', quantity: 100, uom: 'piece' },
      ],
      lastUsedAt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ]
}

// ============================================================================
// Input Schemas
// ============================================================================

const getCustomerOrdersInput = z.object({
  status: z.string().optional(),
  page: z.number().default(1),
  limit: z.number().default(20),
  dateRange: z
    .object({
      from: z.string(),
      to: z.string(),
    })
    .optional(),
})

const getCustomerQuotesInput = z.object({
  status: z.string().optional(),
  page: z.number().default(1),
  limit: z.number().default(20),
})

const getCustomerOrderHistoryInput = z.object({
  page: z.number().default(1),
  limit: z.number().default(20),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
})

const submitReorderInput = z.object({
  previousOrderId: z.string(),
  adjustments: z.any().optional(),
})

const getSavedListsInput = z.object({})

const createSavedListInput = z.object({
  name: z.string(),
  items: z.array(
    z.object({
      productId: z.string(),
      productName: z.string(),
      quantity: z.number(),
      uom: z.string(),
    }),
  ),
})

const deleteSavedListInput = z.object({
  listId: z.string(),
})

// ============================================================================
// getCustomerOrders
// ============================================================================

export const getCustomerOrders = createServerFn()
  .inputValidator(getCustomerOrdersInput)
  .handler(
    async ({
      data: input,
    }): Promise<{ orders: Order[]; total: number }> => {
      if (!isSupabaseConfigured()) {
        const orders = getMockOrders()
        return { orders, total: orders.length }
      }

      // TODO: Real Supabase query
      const orders = getMockOrders()
      return { orders, total: orders.length }
    },
  )

// ============================================================================
// getCustomerQuotes
// ============================================================================

export const getCustomerQuotes = createServerFn()
  .inputValidator(getCustomerQuotesInput)
  .handler(
    async ({
      data: input,
    }): Promise<{ quotes: Order[]; total: number }> => {
      if (!isSupabaseConfigured()) {
        let quotes = getMockQuotes()
        if (input.status && input.status !== 'all') {
          quotes = quotes.filter((q) => q.status === input.status)
        }
        return { quotes, total: quotes.length }
      }

      // TODO: Real Supabase query
      const quotes = getMockQuotes()
      return { quotes, total: quotes.length }
    },
  )

// ============================================================================
// getCustomerOrderHistory
// ============================================================================

export const getCustomerOrderHistory = createServerFn()
  .inputValidator(getCustomerOrderHistoryInput)
  .handler(
    async ({
      data: input,
    }): Promise<{ orders: Order[]; total: number }> => {
      if (!isSupabaseConfigured()) {
        let orders = getMockHistory()
        if (input.dateFrom) {
          const from = new Date(input.dateFrom)
          orders = orders.filter((o) => new Date(o.date) >= from)
        }
        if (input.dateTo) {
          const to = new Date(input.dateTo)
          orders = orders.filter((o) => new Date(o.date) <= to)
        }
        return { orders, total: orders.length }
      }

      // TODO: Real Supabase query
      const orders = getMockHistory()
      return { orders, total: orders.length }
    },
  )

// ============================================================================
// submitReorder
// ============================================================================

export const submitReorder = createServerFn()
  .inputValidator(submitReorderInput)
  .handler(
    async ({ data: input }): Promise<{ rfqId: string }> => {
      if (!isSupabaseConfigured()) {
        return { rfqId: 'QR-REORDER-001' }
      }

      // TODO: Real Supabase query
      return { rfqId: 'QR-REORDER-001' }
    },
  )

// ============================================================================
// getSavedLists
// ============================================================================

export const getSavedLists = createServerFn()
  .inputValidator(getSavedListsInput)
  .handler(
    async (): Promise<{ lists: SavedList[] }> => {
      if (!isSupabaseConfigured()) {
        return { lists: getMockSavedLists() }
      }

      // TODO: Real Supabase query
      return { lists: getMockSavedLists() }
    },
  )

// ============================================================================
// createSavedList
// ============================================================================

export const createSavedList = createServerFn()
  .inputValidator(createSavedListInput)
  .handler(
    async ({ data: input }): Promise<{ list: SavedList }> => {
      if (!isSupabaseConfigured()) {
        const now = new Date().toISOString()
        return {
          list: {
            id: crypto.randomUUID(),
            name: input.name,
            items: input.items,
            lastUsedAt: now,
            createdAt: now,
          },
        }
      }

      // TODO: Real Supabase query
      const now = new Date().toISOString()
      return {
        list: {
          id: crypto.randomUUID(),
          name: input.name,
          items: input.items,
          lastUsedAt: now,
          createdAt: now,
        },
      }
    },
  )

// ============================================================================
// deleteSavedList
// ============================================================================

export const deleteSavedList = createServerFn()
  .inputValidator(deleteSavedListInput)
  .handler(
    async ({ data: input }): Promise<{ success: boolean }> => {
      if (!isSupabaseConfigured()) {
        return { success: true }
      }

      // TODO: Real Supabase query
      return { success: true }
    },
  )

// ============================================================================
// getReorderSuggestion
// ============================================================================

export interface ReorderSuggestion {
  productId: string
  productName: string
  daysSinceOrder: number
}

export const getReorderSuggestion = createServerFn().handler(
  async (): Promise<{ suggestion: ReorderSuggestion | null }> => {
    if (!isSupabaseConfigured()) {
      // Dev mode mock: "You ordered cement 30 days ago"
      return {
        suggestion: {
          productId: 'cement-portland-50kg',
          productName: 'Portland Cement 50kg',
          daysSinceOrder: 30,
        },
      }
    }

    // TODO: Real Supabase query — find most recent order item eligible for reorder
    return {
      suggestion: {
        productId: 'cement-portland-50kg',
        productName: 'Portland Cement 50kg',
        daysSinceOrder: 30,
      },
    }
  },
)
