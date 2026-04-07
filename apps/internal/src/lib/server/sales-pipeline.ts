import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type { PipelineDeal, PipelineStage, PipelineStageId } from '../../types/sales'

function isSupabaseConfigured(): boolean {
  return !!import.meta.env.VITE_SUPABASE_URL
}

// ─── Mock Data ─────────────────────────────────────────────

const STAGE_NAMES: Record<PipelineStageId, string> = {
  rfq_received: 'RFQ Received',
  reviewing: 'Reviewing',
  sourcing: 'Sourcing',
  quoting: 'Quoting',
  sent: 'Sent to Customer',
  negotiating: 'Negotiating',
  closing: 'Closing',
  won: 'Won',
  lost_expired: 'Lost / Expired',
}

function getMockPipeline(): { stages: PipelineStage[]; deals: PipelineDeal[] } {
  const deals: PipelineDeal[] = [
    { id: 'deal-001', customerName: 'Al-Nour Construction', customerTier: 'A', dealValue: 7_500_000, stage: 'rfq_received', daysInStage: 0, winProbability: 30, assignedRep: 'Ahmed Hassan', statusText: 'Just received', color: 'green' },
    { id: 'deal-002', customerName: 'Pyramid Builders', customerTier: 'A', dealValue: 3_200_000, stage: 'reviewing', daysInStage: 1, winProbability: 40, assignedRep: 'Ahmed Hassan', statusText: 'Checking materials', color: 'green' },
    { id: 'deal-003', customerName: 'Cairo Steel Works', customerTier: 'B', dealValue: 1_800_000, stage: 'sourcing', daysInStage: 3, winProbability: 45, assignedRep: 'Fatma Nour', statusText: 'Waiting supplier cost', color: 'green' },
    { id: 'deal-004', customerName: 'Delta Cement Co.', customerTier: 'B', dealValue: 950_000, stage: 'quoting', daysInStage: 2, winProbability: 55, assignedRep: 'Omar Khalil', statusText: 'Building quote', color: 'green' },
    { id: 'deal-005', customerName: 'Heliopolis Contractors', customerTier: 'A', dealValue: 12_500_000, stage: 'sent', daysInStage: 5, winProbability: 60, assignedRep: 'Ahmed Hassan', statusText: 'Awaiting response', color: 'yellow' },
    { id: 'deal-006', customerName: 'Giza Construction LLC', customerTier: 'B', dealValue: 2_100_000, stage: 'negotiating', daysInStage: 8, winProbability: 65, assignedRep: 'Sara Ibrahim', statusText: 'Counter received', color: 'yellow' },
    { id: 'deal-007', customerName: 'Maadi Engineering', customerTier: 'new', dealValue: 180_000, stage: 'sent', daysInStage: 12, winProbability: 35, assignedRep: 'Omar Khalil', statusText: 'No response yet', color: 'red' },
    { id: 'deal-008', customerName: 'Alexandria Building Materials', customerTier: 'C', dealValue: 420_000, stage: 'closing', daysInStage: 2, winProbability: 85, assignedRep: 'Fatma Nour', statusText: 'Final revision', color: 'green' },
    { id: 'deal-009', customerName: 'New Valley Development', customerTier: 'new', dealValue: 280_000, stage: 'rfq_received', daysInStage: 0, winProbability: 20, assignedRep: 'Omar Khalil', statusText: 'New customer', color: 'green' },
    { id: 'deal-010', customerName: 'Suez Industrial Group', customerTier: 'C', dealValue: 650_000, stage: 'won', daysInStage: 0, winProbability: 100, assignedRep: 'Ahmed Hassan', statusText: 'Converted to order', color: 'green' },
    { id: 'deal-011', customerName: 'October Development', customerTier: 'B', dealValue: 1_400_000, stage: 'lost_expired', daysInStage: 0, winProbability: 0, assignedRep: 'Sara Ibrahim', statusText: 'Lost to competitor', color: 'red' },
    { id: 'deal-012', customerName: 'Nasr City Projects', customerTier: 'A', dealValue: 5_800_000, stage: 'negotiating', daysInStage: 4, winProbability: 70, assignedRep: 'Ahmed Hassan', statusText: 'Negotiating terms', color: 'green' },
  ]

  const stageIds: PipelineStageId[] = [
    'rfq_received', 'reviewing', 'sourcing', 'quoting',
    'sent', 'negotiating', 'closing', 'won', 'lost_expired',
  ]

  const stages: PipelineStage[] = stageIds.map((id) => {
    const stageDeals = deals.filter((d) => d.stage === id)
    return {
      id,
      name: STAGE_NAMES[id],
      dealCount: stageDeals.length,
      totalValue: stageDeals.reduce((sum, d) => sum + d.dealValue, 0),
    }
  })

  return { stages, deals }
}

// ─── Server Functions ──────────────────────────────────────

const getSalesPipelineInput = z.object({
  filters: z
    .object({
      rep: z.string().optional(),
      customer: z.string().optional(),
      valueRange: z.object({ min: z.number(), max: z.number() }).optional(),
      ageRange: z.object({ min: z.number(), max: z.number() }).optional(),
    })
    .optional(),
})

export const getSalesPipeline = createServerFn({ method: 'GET' })
  .inputValidator(getSalesPipelineInput)
  .handler(async ({ data: input }) => {
    if (!isSupabaseConfigured()) {
      const mock = getMockPipeline()
      let filtered = mock.deals

      if (input.filters?.rep) {
        filtered = filtered.filter((d) => d.assignedRep === input.filters!.rep)
      }
      if (input.filters?.customer) {
        filtered = filtered.filter((d) =>
          d.customerName.toLowerCase().includes(input.filters!.customer!.toLowerCase()),
        )
      }
      if (input.filters?.valueRange) {
        const { min, max } = input.filters.valueRange
        filtered = filtered.filter((d) => d.dealValue >= min && d.dealValue <= max)
      }

      // Recalculate stages based on filtered deals
      const stageIds: PipelineStageId[] = [
        'rfq_received', 'reviewing', 'sourcing', 'quoting',
        'sent', 'negotiating', 'closing', 'won', 'lost_expired',
      ]
      const stages: PipelineStage[] = stageIds.map((id) => {
        const stageDeals = filtered.filter((d) => d.stage === id)
        return {
          id,
          name: STAGE_NAMES[id],
          dealCount: stageDeals.length,
          totalValue: stageDeals.reduce((sum, d) => sum + d.dealValue, 0),
        }
      })

      return { stages, deals: filtered }
    }

    // TODO: Real Supabase query joining quotes, quote_requests, customers
    // Group by pipeline stage, compute deal counts and values
    return { stages: [] as PipelineStage[], deals: [] as PipelineDeal[] }
  })

const moveDealStageInput = z.object({
  dealId: z.string(),
  toStage: z.string(),
})

export const moveDealStage = createServerFn({ method: 'POST' })
  .inputValidator(moveDealStageInput)
  .handler(async ({ data: input }) => {
    if (!isSupabaseConfigured()) {
      return {
        success: true,
        dealId: input.dealId,
        fromStage: 'unknown',
        toStage: input.toStage,
        movedAt: new Date().toISOString(),
      }
    }

    // TODO: Update quote pipeline stage via validate_state_transition
    // TODO: Log stage transition in activity feed
    return { success: true, dealId: input.dealId, fromStage: 'unknown', toStage: input.toStage, movedAt: new Date().toISOString() }
  })

const markAsWonInput = z.object({
  quoteId: z.string(),
})

export const markAsWon = createServerFn({ method: 'POST' })
  .inputValidator(markAsWonInput)
  .handler(async ({ data: _input }) => {
    if (!isSupabaseConfigured()) {
      return { orderId: `ord-${Date.now()}` }
    }

    // TODO: Update quotes.status to 'accepted' via validate_state_transition
    // This triggers on_quote_accepted() which creates the order automatically
    return { orderId: `ord-${Date.now()}` }
  })

const markAsLostInput = z.object({
  quoteId: z.string(),
  lossReason: z.string(),
  competitorName: z.string().optional(),
})

export const markAsLost = createServerFn({ method: 'POST' })
  .inputValidator(markAsLostInput)
  .handler(async ({ data: _input }) => {
    if (!isSupabaseConfigured()) {
      return { success: true }
    }

    // TODO: Update quotes.status to 'declined' via validate_state_transition
    // TODO: Log loss reason and competitor info for analytics
    return { success: true }
  })

const convertQuoteToOrderInput = z.object({
  quoteId: z.string(),
  poNumber: z.string().optional(),
})

export const convertQuoteToOrder = createServerFn({ method: 'POST' })
  .inputValidator(convertQuoteToOrderInput)
  .handler(async ({ data: input }) => {
    const orderId = `ord-${Date.now()}`
    const orderNumber = `SO-2026-${String(Math.floor(Math.random() * 90000) + 10000).padStart(5, '0')}`
    const now = new Date()

    const deliveryDate = (daysOut: number) =>
      new Date(now.getTime() + daysOut * 86_400_000).toISOString().split('T')[0]

    const result = {
      orderId,
      orderNumber,
      quoteId: input.quoteId,
      customerPoNumber: input.poNumber ?? null,
      status: 'confirmed' as const,
      createdAt: now.toISOString(),

      // Auto-generated Purchase Orders (one per supplier)
      purchaseOrders: [
        {
          poNumber: `PO-2026-${String(Math.floor(Math.random() * 90000) + 10000).padStart(5, '0')}`,
          supplierName: 'Suez Cement Company',
          items: ['Portland Cement CEM I 42.5N'],
          total: 125_000,
          status: 'pending_confirmation',
        },
        {
          poNumber: `PO-2026-${String(Math.floor(Math.random() * 90000) + 10000).padStart(5, '0')}`,
          supplierName: 'Egyptian Steel Industries',
          items: ['Steel Rebar 16mm'],
          total: 340_000,
          status: 'pending_confirmation',
        },
        {
          poNumber: `PO-2026-${String(Math.floor(Math.random() * 90000) + 10000).padStart(5, '0')}`,
          supplierName: 'National Block Factory',
          items: ['Concrete Blocks 20cm', 'Plywood Shuttering 18mm'],
          total: 95_000,
          status: 'pending_confirmation',
        },
      ],

      // Delivery schedule based on lead times
      deliverySchedule: [
        { item: 'Portland Cement CEM I 42.5N', scheduledDate: deliveryDate(3), status: 'scheduled' },
        { item: 'Steel Rebar 16mm', scheduledDate: deliveryDate(5), status: 'scheduled' },
        { item: 'Concrete Blocks 20cm', scheduledDate: deliveryDate(7), status: 'scheduled' },
        { item: 'Plywood Shuttering 18mm', scheduledDate: deliveryDate(7), status: 'scheduled' },
      ],

      // Proforma invoice
      proformaInvoice: {
        invoiceNumber: `PI-2026-${String(Math.floor(Math.random() * 90000) + 10000).padStart(5, '0')}`,
        subtotal: 560_000,
        vatRate: 14,
        vatAmount: 78_400,
        total: 638_400,
        dueDate: deliveryDate(30),
        status: 'generated',
      },

      // Notifications sent
      notifications: [
        { recipient: 'operations_team', channel: 'internal', status: 'sent' },
        { recipient: 'warehouse', channel: 'internal', status: 'sent' },
        { recipient: 'customer', channel: 'portal', status: 'sent' },
        { recipient: 'customer', channel: 'email', status: 'sent' },
      ],
    }

    if (!isSupabaseConfigured()) {
      return result
    }

    // TODO: Full downstream creation cascade via Supabase
    return result
  })
