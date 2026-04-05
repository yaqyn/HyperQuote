import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type {
  PurchaseOrder,
  POItem,
  POStatus,
  ThreeWayMatchResult,
} from '../../types/procurement'
import {
  computeMatchStatus,
  computeOverallMatch,
  isValidTransition,
  HAPPY_PATH_STATUSES,
} from '../../types/procurement'

// Re-export for consumer convenience
export { HAPPY_PATH_STATUSES, isValidTransition }

function isSupabaseConfigured(): boolean {
  return !!import.meta.env.VITE_SUPABASE_URL
}

// ─── Mock Data ─────────────────────────────────────────────

const daysFromNow = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString()
const daysAgo = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString()

function makeMockPOItems(): POItem[] {
  return [
    { id: 'poi-001', productId: 'prod-001', productName: 'Steel Rebar 16mm', quantity: 200, receivedQuantity: 200, rejectedQuantity: 5, unitCost: 28_500, lineTotal: 5_700_000 },
    { id: 'poi-002', productId: 'prod-002', productName: 'Steel Rebar 12mm', quantity: 150, receivedQuantity: 150, rejectedQuantity: 0, unitCost: 25_800, lineTotal: 3_870_000 },
    { id: 'poi-003', productId: 'prod-003', productName: 'Steel Rebar 10mm', quantity: 100, receivedQuantity: 80, rejectedQuantity: 2, unitCost: 22_400, lineTotal: 2_240_000 },
  ]
}

function makeMockThreeWayMatch(): ThreeWayMatchResult {
  // Tolerances would come from system_settings in production
  const qtyTolerance = 0.02 // 2%
  const priceTolerance = 0.01 // 1%
  const taxTolerance = 0.005 // 0.5%

  const quantityVariance = 0.015 // 1.5% — within tolerance
  const priceVariance = 0.008 // 0.8% — within tolerance
  const taxVariance = 0 // exact match

  const poVsReceipt = computeMatchStatus(quantityVariance, qtyTolerance)
  const poVsInvoice = computeMatchStatus(priceVariance, priceTolerance)
  const receiptVsInvoice = computeMatchStatus(taxVariance, taxTolerance)
  const overall = computeOverallMatch(poVsReceipt, poVsInvoice, receiptVsInvoice)

  return {
    poVsReceipt,
    poVsInvoice,
    receiptVsInvoice,
    overall,
    variances: { quantityVariance, priceVariance, taxVariance },
  }
}

function getMockPOList(): PurchaseOrder[] {
  const items = makeMockPOItems()
  const subtotal = items.reduce((sum, i) => sum + i.lineTotal, 0)
  const vatAmount = Math.round(subtotal * 14) / 100
  const total = subtotal + vatAmount

  return [
    {
      id: 'po-001',
      poNumber: 'PO-2026-00018',
      supplierId: 'sup-001',
      supplierName: 'Cairo Steel Co.',
      orderId: 'ord-201',
      status: 'received',
      codedDeliveryReference: 'DEL-HQ-2026-A042',
      subtotal,
      vatAmount,
      total,
      expectedDeliveryDate: daysFromNow(5),
      items,
      threeWayMatch: makeMockThreeWayMatch(),
    },
    {
      id: 'po-002',
      poNumber: 'PO-2026-00019',
      supplierId: 'sup-002',
      supplierName: 'Delta Cement Group',
      orderId: 'ord-202',
      status: 'shipped',
      codedDeliveryReference: 'DEL-HQ-2026-B015',
      subtotal: 9_250_000,
      vatAmount: Math.round(9_250_000 * 14) / 100,
      total: 9_250_000 + Math.round(9_250_000 * 14) / 100,
      expectedDeliveryDate: daysFromNow(2),
      items: [
        { id: 'poi-010', productId: 'prod-010', productName: 'Portland Cement CEM I 42.5N', quantity: 5000, receivedQuantity: 0, rejectedQuantity: 0, unitCost: 1_850, lineTotal: 9_250_000 },
      ],
      threeWayMatch: {
        poVsReceipt: 'pending',
        poVsInvoice: 'pending',
        receiptVsInvoice: 'pending',
        overall: 'pending',
        variances: { quantityVariance: 0, priceVariance: 0, taxVariance: 0 },
      },
    },
    {
      id: 'po-003',
      poNumber: 'PO-2026-00020',
      supplierId: 'sup-003',
      supplierName: 'Nile Building Supplies',
      orderId: null,
      status: 'draft',
      codedDeliveryReference: 'DEL-HQ-2026-C008',
      subtotal: 2_400_000,
      vatAmount: Math.round(2_400_000 * 14) / 100,
      total: 2_400_000 + Math.round(2_400_000 * 14) / 100,
      expectedDeliveryDate: daysFromNow(14),
      items: [
        { id: 'poi-020', productId: 'prod-020', productName: 'Ceramic Floor Tiles 60x60cm', quantity: 2000, receivedQuantity: 0, rejectedQuantity: 0, unitCost: 850, lineTotal: 1_700_000 },
        { id: 'poi-021', productId: 'prod-021', productName: 'Gypsum Board 12.5mm', quantity: 1000, receivedQuantity: 0, rejectedQuantity: 0, unitCost: 700, lineTotal: 700_000 },
      ],
      threeWayMatch: {
        poVsReceipt: 'pending',
        poVsInvoice: 'pending',
        receiptVsInvoice: 'pending',
        overall: 'pending',
        variances: { quantityVariance: 0, priceVariance: 0, taxVariance: 0 },
      },
    },
    {
      id: 'po-004',
      poNumber: 'PO-2026-00017',
      supplierId: 'sup-004',
      supplierName: 'Alexandria Rebar Factory',
      orderId: 'ord-198',
      status: 'closed',
      codedDeliveryReference: 'DEL-HQ-2026-A038',
      subtotal: 4_170_000,
      vatAmount: Math.round(4_170_000 * 14) / 100,
      total: 4_170_000 + Math.round(4_170_000 * 14) / 100,
      expectedDeliveryDate: daysAgo(3),
      items: [
        { id: 'poi-030', productId: 'prod-001', productName: 'Steel Rebar 16mm', quantity: 150, receivedQuantity: 150, rejectedQuantity: 0, unitCost: 27_800, lineTotal: 4_170_000 },
      ],
      threeWayMatch: {
        poVsReceipt: 'matched',
        poVsInvoice: 'matched',
        receiptVsInvoice: 'matched',
        overall: 'matched',
        variances: { quantityVariance: 0, priceVariance: 0, taxVariance: 0 },
      },
    },
    {
      id: 'po-005',
      poNumber: 'PO-2026-00021',
      supplierId: 'sup-007',
      supplierName: 'Port Said Iron Works',
      orderId: 'ord-205',
      status: 'confirmed',
      codedDeliveryReference: 'DEL-HQ-2026-D003',
      subtotal: 7_300_000,
      vatAmount: Math.round(7_300_000 * 14) / 100,
      total: 7_300_000 + Math.round(7_300_000 * 14) / 100,
      expectedDeliveryDate: daysFromNow(10),
      items: [
        { id: 'poi-040', productId: 'prod-001', productName: 'Steel Rebar 16mm', quantity: 250, receivedQuantity: 0, rejectedQuantity: 0, unitCost: 29_200, lineTotal: 7_300_000 },
      ],
      threeWayMatch: {
        poVsReceipt: 'pending',
        poVsInvoice: 'pending',
        receiptVsInvoice: 'pending',
        overall: 'pending',
        variances: { quantityVariance: 0, priceVariance: 0, taxVariance: 0 },
      },
    },
  ]
}

// ─── Server Functions ──────────────────────────────────────

const createPurchaseOrderInput = z.object({
  supplierId: z.string(),
  lines: z.array(z.object({
    productId: z.string(),
    quantity: z.number().positive(),
    unitCost: z.number().positive(),
  })).min(1),
  deliveryDate: z.string(),
  terms: z.string().optional(),
})

export const createPurchaseOrder = createServerFn({ method: 'POST' })
  .inputValidator(createPurchaseOrderInput)
  .handler(async ({ data: input }) => {
    if (!isSupabaseConfigured()) {
      const subtotal = input.lines.reduce((sum: number, l: { quantity: number; unitCost: number }) => sum + l.quantity * l.unitCost, 0)
      // VAT: Math.round(subtotal * 14) / 100 per Pitfall 7
      const vatAmount = Math.round(subtotal * 14) / 100
      return {
        poId: `po-${Date.now()}`,
        poNumber: `PO-2026-${String(Date.now()).slice(-5)}`,
        subtotal,
        vatAmount,
        total: subtotal + vatAmount,
      }
    }

    // TODO: INSERT into purchase_orders with status 'draft'
    // TODO: INSERT purchase_order_items for each line
    // TODO: Generate coded_delivery_reference
    // TODO: Compute VAT: Math.round(subtotal * 14) / 100
    return { poId: '', poNumber: '', subtotal: 0, vatAmount: 0, total: 0 }
  })

const getPOListInput = z.object({
  filters: z.object({
    status: z.string().optional(),
  }).optional(),
  page: z.number().default(1),
  limit: z.number().default(20),
})

export const getPOList = createServerFn({ method: 'GET' })
  .inputValidator(getPOListInput)
  .handler(async ({ data: input }) => {
    if (!isSupabaseConfigured()) {
      let pos = getMockPOList()
      if (input.filters?.status) {
        pos = pos.filter((p) => p.status === input.filters!.status)
      }
      const start = (input.page - 1) * input.limit
      return { pos: pos.slice(start, start + input.limit), total: pos.length }
    }

    // TODO: Query purchase_orders with RLS
    // TODO: JOIN purchase_order_items
    // TODO: Compute three-way match read-only (Pitfall 5)
    return { pos: [] as PurchaseOrder[], total: 0 }
  })

const getPODetailInput = z.object({
  poId: z.string(),
})

export const getPODetail = createServerFn({ method: 'GET' })
  .inputValidator(getPODetailInput)
  .handler(async ({ data: input }) => {
    if (!isSupabaseConfigured()) {
      const pos = getMockPOList()
      const po = pos.find((p) => p.id === input.poId) ?? pos[0]
      const timeline = [
        { timestamp: daysAgo(5), event: 'PO created', user: 'Mariam Farouk' },
        { timestamp: daysAgo(4), event: 'Sent to supplier', user: 'Mariam Farouk' },
        { timestamp: daysAgo(3), event: 'Supplier confirmed', user: 'System' },
        { timestamp: daysAgo(1), event: 'Shipped from supplier warehouse', user: 'System' },
      ]
      return { po, timeline }
    }

    // TODO: Query purchase_order with items, compute three-way match
    // TODO: Query activity_logs for PO timeline
    return { po: getMockPOList()[0], timeline: [] as { timestamp: string; event: string; user: string }[] }
  })

const updatePOStatusInput = z.object({
  poId: z.string(),
  status: z.string(),
  reason: z.string().optional(),
})

export const updatePOStatus = createServerFn({ method: 'POST' })
  .inputValidator(updatePOStatusInput)
  .handler(async ({ data: input }) => {
    if (!isSupabaseConfigured()) {
      // Validate transition in mock mode too
      const pos = getMockPOList()
      const po = pos.find((p) => p.id === input.poId)
      if (po && !isValidTransition(po.status, input.status as POStatus)) {
        return { success: false, error: `Invalid transition from ${po.status} to ${input.status}` }
      }
      return { success: true }
    }

    // TODO: Validate transition via isValidTransition or DB trigger
    // TODO: UPDATE purchase_orders SET status, updated_at
    // TODO: Log status change in activity_logs
    return { success: true }
  })

/**
 * Compute three-way match for a PO (read-only, per Pitfall 5).
 * Tolerance thresholds read from system_settings, not hardcoded.
 */
export { computeMatchStatus }
