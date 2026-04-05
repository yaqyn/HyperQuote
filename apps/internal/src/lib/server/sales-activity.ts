import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type { ActivityEvent, SalesAnalytics } from '../../types/sales'

function isSupabaseConfigured(): boolean {
  return !!import.meta.env.VITE_SUPABASE_URL
}

// ─── Mock Data ─────────────────────────────────────────────

const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString()

function getMockActivityFeed(): ActivityEvent[] {
  return [
    { id: 'evt-001', type: 'rfq_new', description: 'New RFQ received from Al-Nour Construction', timestamp: hoursAgo(0.5), entityType: 'rfq', entityId: 'rfq-001', actionLabel: 'Open RFQ', actionUrl: '/internal/sales/rfq/rfq-001' },
    { id: 'evt-002', type: 'quote_viewed', description: 'Heliopolis Contractors viewed QT-2026-00510 (3rd view)', timestamp: hoursAgo(1), entityType: 'quote', entityId: 'qt-105', actionLabel: 'Open Quote', actionUrl: '/internal/sales/quote-builder/qt-105' },
    { id: 'evt-003', type: 'payment_received', description: 'Payment EGP 2,500,000 received from Pyramid Builders', timestamp: hoursAgo(2), entityType: 'payment', entityId: 'pay-301', actionLabel: null, actionUrl: null },
    { id: 'evt-004', type: 'delivery_confirmed', description: 'Delivery DN-2026-00042 confirmed at Cairo Steel Works site', timestamp: hoursAgo(4), entityType: 'delivery', entityId: 'del-401', actionLabel: null, actionUrl: null },
    { id: 'evt-005', type: 'quote_won', description: 'Quote QT-2026-00498 won -- Suez Industrial Group (EGP 650,000)', timestamp: hoursAgo(6), entityType: 'quote', entityId: 'qt-106', actionLabel: 'View Order', actionUrl: '/internal/sales/pipeline' },
    { id: 'evt-006', type: 'quote_lost', description: 'Quote QT-2026-00485 lost -- October Development (competitor: ABC Materials)', timestamp: hoursAgo(8), entityType: 'quote', entityId: 'qt-107', actionLabel: null, actionUrl: null },
    { id: 'evt-007', type: 'rfq_new', description: 'New RFQ received from Maadi Engineering (new customer)', timestamp: hoursAgo(10), entityType: 'rfq', entityId: 'rfq-010', actionLabel: 'Open RFQ', actionUrl: '/internal/sales/rfq/rfq-010' },
    { id: 'evt-008', type: 'quote_sent', description: 'Quote QT-2026-00520 sent to Giza Construction LLC via portal + email', timestamp: hoursAgo(12), entityType: 'quote', entityId: 'qt-108', actionLabel: 'Open Quote', actionUrl: '/internal/sales/quote-builder/qt-108' },
    { id: 'evt-009', type: 'customer_claimed', description: 'New Valley Development claimed their account', timestamp: hoursAgo(18), entityType: 'customer', entityId: 'cust-006', actionLabel: 'View Customer', actionUrl: '/internal/sales/customer/cust-006' },
    { id: 'evt-010', type: 'approval_requested', description: 'Approval requested for QT-2026-00519 (margin 11.2%, below floor)', timestamp: hoursAgo(3), entityType: 'approval', entityId: 'appr-501', actionLabel: 'Review', actionUrl: '/internal/sales/quote-builder/qt-109' },
  ]
}

function getMockSalesAnalytics(): SalesAnalytics {
  return {
    revenue: 42_800_000,
    orderCount: 38,
    avgOrderValue: 1_126_316,
    topProducts: [
      { name: 'Portland Cement CEM I', revenue: 12_400_000, quantity: 125_000 },
      { name: 'Steel Rebar 16mm', revenue: 9_800_000, quantity: 3_200 },
      { name: 'Concrete Blocks 20cm', revenue: 6_500_000, quantity: 520_000 },
      { name: 'Plywood Shuttering', revenue: 4_200_000, quantity: 42_000 },
      { name: 'PVC Pipes 110mm', revenue: 3_100_000, quantity: 18_500 },
    ],
    topCustomers: [
      { name: 'Heliopolis Contractors', revenue: 14_500_000, orderCount: 8 },
      { name: 'Al-Nour Construction', revenue: 11_000_000, orderCount: 12 },
      { name: 'Pyramid Builders', revenue: 8_200_000, orderCount: 6 },
      { name: 'Cairo Steel Works', revenue: 4_800_000, orderCount: 5 },
      { name: 'Delta Cement Co.', revenue: 2_300_000, orderCount: 4 },
    ],
    pipelineByStage: [
      { stage: 'RFQ Received', count: 2, value: 7_780_000 },
      { stage: 'Reviewing', count: 1, value: 3_200_000 },
      { stage: 'Sourcing', count: 1, value: 1_800_000 },
      { stage: 'Quoting', count: 1, value: 950_000 },
      { stage: 'Sent', count: 2, value: 12_680_000 },
      { stage: 'Negotiating', count: 2, value: 7_900_000 },
      { stage: 'Closing', count: 1, value: 420_000 },
    ],
    conversionRates: [
      { fromStage: 'RFQ Received', toStage: 'Reviewing', rate: 92 },
      { fromStage: 'Reviewing', toStage: 'Sourcing', rate: 85 },
      { fromStage: 'Sourcing', toStage: 'Quoting', rate: 88 },
      { fromStage: 'Quoting', toStage: 'Sent', rate: 95 },
      { fromStage: 'Sent', toStage: 'Negotiating', rate: 68 },
      { fromStage: 'Negotiating', toStage: 'Closing', rate: 52 },
      { fromStage: 'Closing', toStage: 'Won', rate: 78 },
    ],
  }
}

// ─── Server Functions ──────────────────────────────────────

const getActivityFeedInput = z.object({
  filters: z
    .object({
      type: z.string().optional(),
    })
    .optional(),
  page: z.number().default(1),
  limit: z.number().default(20),
})

export const getActivityFeed = createServerFn({ method: 'GET' })
  .inputValidator(getActivityFeedInput)
  .handler(async ({ data: input }) => {
    if (!isSupabaseConfigured()) {
      let events = getMockActivityFeed()
      if (input.filters?.type) {
        events = events.filter((e) => e.type === input.filters!.type)
      }
      const start = (input.page - 1) * input.limit
      return { activities: events.slice(start, start + input.limit), total: events.length }
    }

    // TODO: Real Supabase query on activity_logs
    // Filter by type, paginate, order by timestamp DESC
    return { activities: [] as ActivityEvent[], total: 0 }
  })

const addInternalNoteInput = z.object({
  entityType: z.string(),
  entityId: z.string(),
  note: z.string().min(1),
})

export const addInternalNote = createServerFn({ method: 'POST' })
  .inputValidator(addInternalNoteInput)
  .handler(async ({ data: _input }) => {
    if (!isSupabaseConfigured()) {
      return { noteId: `note-${Date.now()}` }
    }

    // TODO: INSERT into notes with author = current_user
    // TODO: Log in activity_logs
    return { noteId: `note-${Date.now()}` }
  })

const getSalesAnalyticsInput = z.object({
  period: z.enum(['week', 'month', 'quarter', 'year']),
  groupBy: z.enum(['rep', 'customer', 'product', 'category']).optional(),
})

export const getSalesAnalytics = createServerFn({ method: 'GET' })
  .inputValidator(getSalesAnalyticsInput)
  .handler(async ({ data: _input }) => {
    if (!isSupabaseConfigured()) {
      return getMockSalesAnalytics()
    }

    // TODO: Aggregate query across orders, order_items, quotes
    // Group by period and optional groupBy dimension
    return getMockSalesAnalytics()
  })
