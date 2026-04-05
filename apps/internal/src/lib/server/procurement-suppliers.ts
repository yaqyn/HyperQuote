import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type {
  SupplierScorecard,
  ProcurementHomeData,
} from '../../types/procurement'
import { computeTier } from '../../types/procurement'

// Re-export for consumer convenience
export { computeTier }

function isSupabaseConfigured(): boolean {
  return !!import.meta.env.VITE_SUPABASE_URL
}

// ─── Mock Data ─────────────────────────────────────────────

function getMockSupplierDirectory(): SupplierScorecard[] {
  return [
    {
      supplierId: 'sup-001',
      supplierName: 'Cairo Steel Co.',
      onTimeDeliveryRate: 96,
      fillRate: 98,
      qualityRejectionRate: 1.2,
      priceCompetitiveness: 82,
      avgResponseTimeDays: 1.5,
      overallScore: 92,
      trend: 'stable',
      tier: computeTier(96, 98, true),
    },
    {
      supplierId: 'sup-002',
      supplierName: 'Delta Cement Group',
      onTimeDeliveryRate: 94,
      fillRate: 96,
      qualityRejectionRate: 0.8,
      priceCompetitiveness: 88,
      avgResponseTimeDays: 1.2,
      overallScore: 90,
      trend: 'improving',
      tier: computeTier(94, 96, false),
    },
    {
      supplierId: 'sup-003',
      supplierName: 'Nile Building Supplies',
      onTimeDeliveryRate: 78,
      fillRate: 85,
      qualityRejectionRate: 3.5,
      priceCompetitiveness: 90,
      avgResponseTimeDays: 2.8,
      overallScore: 72,
      trend: 'declining',
      tier: computeTier(78, 85, false),
    },
    {
      supplierId: 'sup-004',
      supplierName: 'Alexandria Rebar Factory',
      onTimeDeliveryRate: 88,
      fillRate: 92,
      qualityRejectionRate: 2.0,
      priceCompetitiveness: 85,
      avgResponseTimeDays: 2.0,
      overallScore: 85,
      trend: 'stable',
      tier: computeTier(88, 92, false),
    },
    {
      supplierId: 'sup-005',
      supplierName: 'Upper Egypt Steel',
      onTimeDeliveryRate: 72,
      fillRate: 80,
      qualityRejectionRate: 4.5,
      priceCompetitiveness: 95,
      avgResponseTimeDays: 3.5,
      overallScore: 68,
      trend: 'declining',
      tier: computeTier(72, 80, false),
    },
    {
      supplierId: 'sup-006',
      supplierName: 'Suez Cement Industries',
      onTimeDeliveryRate: 91,
      fillRate: 94,
      qualityRejectionRate: 1.5,
      priceCompetitiveness: 87,
      avgResponseTimeDays: 1.8,
      overallScore: 88,
      trend: 'improving',
      tier: computeTier(91, 94, false),
    },
    {
      supplierId: 'sup-007',
      supplierName: 'Port Said Iron Works',
      onTimeDeliveryRate: 97,
      fillRate: 99,
      qualityRejectionRate: 0.5,
      priceCompetitiveness: 75,
      avgResponseTimeDays: 1.0,
      overallScore: 95,
      trend: 'stable',
      tier: computeTier(97, 99, true),
    },
    {
      supplierId: 'sup-008',
      supplierName: 'Sinai White Cement',
      onTimeDeliveryRate: 85,
      fillRate: 88,
      qualityRejectionRate: 2.5,
      priceCompetitiveness: 78,
      avgResponseTimeDays: 2.2,
      overallScore: 80,
      trend: 'stable',
      tier: computeTier(85, 88, false),
    },
    {
      supplierId: 'sup-009',
      supplierName: 'Aswan Quarry Materials',
      onTimeDeliveryRate: 65,
      fillRate: 70,
      qualityRejectionRate: 6.0,
      priceCompetitiveness: 98,
      avgResponseTimeDays: 4.5,
      overallScore: 58,
      trend: 'declining',
      tier: computeTier(65, 70, false),
    },
  ]
}

function getMockProcurementQueue(): ProcurementHomeData {
  return {
    pendingInquiries: 4,
    responsesNeedingReview: 2,
    activePOs: {
      draft: 1,
      sent: 0,
      confirmed: 1,
      in_production: 0,
      shipped: 1,
      partially_received: 0,
      received: 1,
    },
    performanceHighlights: {
      best: { supplierId: 'sup-007', supplierName: 'Port Said Iron Works', score: 95 },
      worst: { supplierId: 'sup-009', supplierName: 'Aswan Quarry Materials', score: 58 },
    },
  }
}

// ─── Server Functions ──────────────────────────────────────

const getSupplierDirectoryInput = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  page: z.number().default(1),
  limit: z.number().default(20),
})

export const getSupplierDirectory = createServerFn({ method: 'GET' })
  .inputValidator(getSupplierDirectoryInput)
  .handler(async ({ data: input }) => {
    if (!isSupabaseConfigured()) {
      let suppliers = getMockSupplierDirectory()

      if (input.search) {
        const q = input.search.toLowerCase()
        suppliers = suppliers.filter((s) => s.supplierName.toLowerCase().includes(q))
      }

      const start = (input.page - 1) * input.limit
      return { suppliers: suppliers.slice(start, start + input.limit), total: suppliers.length }
    }

    // TODO: Query suppliers with RLS, join scorecard metrics
    // TODO: Filter by search/category
    return { suppliers: [] as SupplierScorecard[], total: 0 }
  })

const getSupplierScorecardInput = z.object({
  supplierId: z.string(),
})

export const getSupplierScorecard = createServerFn({ method: 'GET' })
  .inputValidator(getSupplierScorecardInput)
  .handler(async ({ data: input }) => {
    if (!isSupabaseConfigured()) {
      const directory = getMockSupplierDirectory()
      const scorecard = directory.find((s) => s.supplierId === input.supplierId) ?? directory[0]
      return { scorecard }
    }

    // TODO: Query supplier_scorecards with computed metrics
    // TODO: Tier computed from: onTimeDeliveryRate >= 95 && is_preferred -> Preferred,
    //   >= 85 && qualityScore >= 80 -> Approved, >= 70 -> Conditional, else New
    return { scorecard: getMockSupplierDirectory()[0] }
  })

const getProcurementQueueInput = z.object({
  status: z.string().optional(),
  page: z.number().default(1),
  limit: z.number().default(20),
})

export const getProcurementQueue = createServerFn({ method: 'GET' })
  .inputValidator(getProcurementQueueInput)
  .handler(async ({ data: _input }) => {
    if (!isSupabaseConfigured()) {
      const items = getMockProcurementQueue()
      return { items, total: 1 }
    }

    // TODO: Aggregate counts from supplier_inquiries and purchase_orders
    // TODO: Compute performance highlights from supplier_scorecards
    return {
      items: getMockProcurementQueue(),
      total: 1,
    }
  })
