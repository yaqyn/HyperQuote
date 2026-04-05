import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type {
  PriceComparison,
  RankedSupplier,
  HistoricalPurchase,
  SupplierTag,
} from '../../types/procurement'
import { computeRankScore } from '../../types/procurement'

function isSupabaseConfigured(): boolean {
  return !!import.meta.env.VITE_SUPABASE_URL
}

// ─── Mock Data ─────────────────────────────────────────────

const daysAgo = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString()

interface MockSupplierData {
  supplierId: string
  supplierName: string
  unitPrice: number
  leadTimeDays: number
  availableQty: number
  certificationStatus: 'certified' | 'pending' | 'none'
  reliabilityScore: number // 0-100, from scorecard
}

function getMockSupplierPrices(productId: string, requestedQty: number): MockSupplierData[] {
  // Realistic Egyptian construction supplier data, prices in EGP
  const suppliersByProduct: Record<string, MockSupplierData[]> = {
    'prod-001': [ // Steel Rebar 16mm
      { supplierId: 'sup-001', supplierName: 'Cairo Steel Co.', unitPrice: 28_500, leadTimeDays: 3, availableQty: 500, certificationStatus: 'certified', reliabilityScore: 92 },
      { supplierId: 'sup-004', supplierName: 'Alexandria Rebar Factory', unitPrice: 27_800, leadTimeDays: 5, availableQty: 300, certificationStatus: 'certified', reliabilityScore: 88 },
      { supplierId: 'sup-005', supplierName: 'Upper Egypt Steel', unitPrice: 26_900, leadTimeDays: 7, availableQty: 150, certificationStatus: 'pending', reliabilityScore: 75 },
      { supplierId: 'sup-007', supplierName: 'Port Said Iron Works', unitPrice: 29_200, leadTimeDays: 2, availableQty: 400, certificationStatus: 'certified', reliabilityScore: 95 },
    ],
    'prod-010': [ // Portland Cement CEM I 42.5N
      { supplierId: 'sup-002', supplierName: 'Delta Cement Group', unitPrice: 1_850, leadTimeDays: 2, availableQty: 10_000, certificationStatus: 'certified', reliabilityScore: 94 },
      { supplierId: 'sup-006', supplierName: 'Suez Cement Industries', unitPrice: 1_780, leadTimeDays: 4, availableQty: 8_000, certificationStatus: 'certified', reliabilityScore: 90 },
      { supplierId: 'sup-008', supplierName: 'Sinai White Cement', unitPrice: 1_920, leadTimeDays: 1, availableQty: 5_000, certificationStatus: 'certified', reliabilityScore: 85 },
    ],
  }

  // Fallback for unknown products — return generic suppliers
  return suppliersByProduct[productId] ?? [
    { supplierId: 'sup-001', supplierName: 'Cairo Steel Co.', unitPrice: 15_000, leadTimeDays: 5, availableQty: 200, certificationStatus: 'certified', reliabilityScore: 92 },
    { supplierId: 'sup-003', supplierName: 'Nile Building Supplies', unitPrice: 14_200, leadTimeDays: 7, availableQty: 350, certificationStatus: 'pending', reliabilityScore: 78 },
    { supplierId: 'sup-009', supplierName: 'Aswan Quarry Materials', unitPrice: 13_800, leadTimeDays: 10, availableQty: 500, certificationStatus: 'none', reliabilityScore: 70 },
  ]
}

/**
 * Rank suppliers using weighted scoring algorithm.
 * Price 40% + Availability 25% + Lead Time 20% + Reliability 15%
 */
function rankSuppliers(
  suppliers: MockSupplierData[],
  requestedQty: number,
): RankedSupplier[] {
  if (suppliers.length === 0) return []

  // Find min/max for normalization
  const prices = suppliers.map((s) => s.unitPrice)
  const leadTimes = suppliers.map((s) => s.leadTimeDays)
  const minPrice = Math.min(...prices)
  const maxPrice = Math.max(...prices)
  const minLead = Math.min(...leadTimes)
  const maxLead = Math.max(...leadTimes)

  const scored = suppliers.map((s) => {
    // Price: lower is better, normalized 0-100
    const priceScore =
      maxPrice === minPrice ? 100 : ((maxPrice - s.unitPrice) / (maxPrice - minPrice)) * 100

    // Availability: ratio of available to requested, capped at 100
    const availabilityScore = Math.min((s.availableQty / requestedQty) * 100, 100)

    // Lead time: shorter is better, normalized 0-100
    const leadTimeScore =
      maxLead === minLead ? 100 : ((maxLead - s.leadTimeDays) / (maxLead - minLead)) * 100

    // Reliability: direct score from scorecard
    const reliabilityScore = s.reliabilityScore

    const totalScore = computeRankScore(priceScore, availabilityScore, leadTimeScore, reliabilityScore)

    // Assign tags
    const tags: SupplierTag[] = []
    if (s.unitPrice === minPrice) tags.push('best-price')
    if (s.leadTimeDays === minLead) tags.push('fastest')
    if (s.availableQty < requestedQty) tags.push('partial')

    return { supplier: s, totalScore, tags }
  })

  // Sort by score descending
  scored.sort((a, b) => b.totalScore - a.totalScore)

  return scored.map((entry, index) => ({
    supplierId: entry.supplier.supplierId,
    supplierName: entry.supplier.supplierName,
    unitPrice: entry.supplier.unitPrice,
    leadTimeDays: entry.supplier.leadTimeDays,
    availableQty: entry.supplier.availableQty,
    certificationStatus: entry.supplier.certificationStatus,
    rank: index + 1,
    tags: entry.tags,
  }))
}

function getMockHistoricalPrices(productId: string): HistoricalPurchase[] {
  return [
    { date: daysAgo(7), supplierId: 'sup-001', supplierName: 'Cairo Steel Co.', unitPrice: 28_200, quantity: 100, deliveryPerformance: 'on_time' },
    { date: daysAgo(21), supplierId: 'sup-004', supplierName: 'Alexandria Rebar Factory', unitPrice: 27_500, quantity: 150, deliveryPerformance: 'late' },
    { date: daysAgo(45), supplierId: 'sup-001', supplierName: 'Cairo Steel Co.', unitPrice: 27_800, quantity: 200, deliveryPerformance: 'on_time' },
    { date: daysAgo(60), supplierId: 'sup-005', supplierName: 'Upper Egypt Steel', unitPrice: 26_500, quantity: 80, deliveryPerformance: 'on_time' },
    { date: daysAgo(90), supplierId: 'sup-007', supplierName: 'Port Said Iron Works', unitPrice: 28_900, quantity: 120, deliveryPerformance: 'early' },
  ]
}

// ─── Server Functions ──────────────────────────────────────

const comparePricingInput = z.object({
  productId: z.string(),
  qty: z.number().positive(),
})

export const comparePricing = createServerFn({ method: 'GET' })
  .inputValidator(comparePricingInput)
  .handler(async ({ data: input }) => {
    if (!isSupabaseConfigured()) {
      const rawSuppliers = getMockSupplierPrices(input.productId, input.qty)
      const ranked = rankSuppliers(rawSuppliers, input.qty)

      const comparison: PriceComparison = {
        productId: input.productId,
        productName: input.productId === 'prod-001' ? 'Steel Rebar 16mm' : 'Portland Cement CEM I 42.5N',
        requestedQty: input.qty,
        uom: input.productId === 'prod-001' ? 'ton' : 'bag',
        suppliers: ranked,
      }

      return { comparisons: [comparison] }
    }

    // TODO: Query supplier_inquiry_responses for this product
    // TODO: Join with supplier_scorecards for reliability
    // TODO: Compute ranking server-side
    return { comparisons: [] as PriceComparison[] }
  })

const getHistoricalPricesInput = z.object({
  productId: z.string(),
  limit: z.number().default(5),
})

export const getHistoricalPrices = createServerFn({ method: 'GET' })
  .inputValidator(getHistoricalPricesInput)
  .handler(async ({ data: input }) => {
    if (!isSupabaseConfigured()) {
      return { history: getMockHistoricalPrices(input.productId).slice(0, input.limit) }
    }

    // TODO: Query purchase_order_items joined with purchase_orders
    // TODO: Order by created_at DESC, limit
    return { history: [] as HistoricalPurchase[] }
  })

/**
 * Exported for direct use by other server functions that need ranking.
 * Uses the same algorithm as comparePricing.
 */
export { rankSuppliers }
