import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { db, hoursSince } from '../db/db'

/**
 * Customer orders arriving at inventory prep. Each row represents a won
 * quote (status='accepted') that finance has cleared for partial payment
 * and is waiting for the inventory team to verify stock.
 *
 * Readiness is derived live from `db.stock` — for each line item we
 * compare `requiredQty` against the on-hand stock level and compute the
 * shortage (if any). When every item is in stock the order can be
 * approved (appending an `inventory_orders` section to the living
 * order_report and advancing the deal to the warehouse stage).
 */

export type OrderItemStatus = 'ready' | 'shortage'

export interface OrderLineItemView {
  productSlug: string
  productName: string
  productSku: string
  unit: string
  requiredQty: number
  stockLevel: number
  available: number
  shortage: number
  status: OrderItemStatus
  sellPrice: number
  lineTotal: number
}

export interface CustomerOrderView {
  quoteId: string
  quoteNumber: string
  rfqId: string
  customerId: string
  customerName: string
  customerTier: string
  customerPoNumber: string | null
  acceptedAt: string
  acceptedHoursAgo: number
  deliveryAddress: string
  deliveryCity: string
  deliveryUrgencyDays: number
  items: OrderLineItemView[]
  totalValue: number
  itemCount: number
  readyCount: number
  shortageCount: number
  allReady: boolean
}

function buildLineItem(
  productSlug: string,
  requiredQty: number,
  sellPrice: number,
): OrderLineItemView | null {
  const product = db.products.findBySlug(productSlug)
  if (!product) return null
  const stockRow = db.stock.forProduct(productSlug)
  const physical = stockRow?.stockLevel ?? 0
  const reserved = stockRow?.reservedLevel ?? 0
  // Readiness uses AVAILABLE stock (physical minus reserved). Another
  // approved order already has dibs on the reserved portion — this order
  // can only claim what's left.
  const availableLevel = Math.max(0, physical - reserved)
  const available = Math.min(availableLevel, requiredQty)
  const shortage = Math.max(0, requiredQty - availableLevel)
  return {
    productSlug,
    productName: product.name,
    productSku: product.sku,
    unit: product.unit_of_measure,
    requiredQty,
    stockLevel: availableLevel,
    available,
    shortage,
    status: shortage > 0 ? 'shortage' : 'ready',
    sellPrice,
    lineTotal: Math.round(sellPrice * requiredQty * 100) / 100,
  }
}

function buildOrder(quoteId: string): CustomerOrderView | null {
  const quote = db.quotes.get(quoteId)
  if (!quote) return null
  const rfq = db.rfqs.get(quote.rfqId)
  const customer = db.customers.get(quote.customerId)

  // Skip orders inventory has already approved. Their existence on the
  // living-document side means they've moved on to warehouse prep.
  const report = db.orderReports.forRfq(quote.rfqId)
  if (report?.sections.inventory_orders) return null

  const items = quote.items
    .map((i) => buildLineItem(i.productSlug, i.quantity, i.sellPrice))
    .filter((x): x is OrderLineItemView => x !== null)

  const totalValue = items.reduce((s, i) => s + i.lineTotal, 0)
  const readyCount = items.filter((i) => i.status === 'ready').length
  const shortageCount = items.filter((i) => i.status === 'shortage').length
  const acceptedAt = quote.sentAt ?? new Date().toISOString()

  return {
    quoteId: quote.id,
    quoteNumber: quote.quoteNumber,
    rfqId: quote.rfqId,
    customerId: quote.customerId,
    customerName: rfq?.customerName ?? customer?.companyName ?? 'Unknown customer',
    customerTier: rfq?.customerTier ?? customer?.tier ?? 'new',
    customerPoNumber: quote.customerPoNumber,
    acceptedAt,
    acceptedHoursAgo: Math.round(hoursSince(acceptedAt)),
    deliveryAddress: rfq?.deliveryAddress ?? customer?.address ?? '',
    deliveryCity: rfq?.deliveryCity ?? '',
    deliveryUrgencyDays: rfq?.deliveryUrgency ?? 0,
    items,
    totalValue: Math.round(totalValue * 100) / 100,
    itemCount: items.length,
    readyCount,
    shortageCount,
    allReady: shortageCount === 0 && items.length > 0,
  }
}

export const getCustomerOrdersList = createServerFn({ method: 'GET' })
  .inputValidator(z.object({}))
  .handler(async () => {
    const orders = db.quotes
      .list()
      .filter((q) => q.status === 'accepted' && q.paymentStatus !== 'unpaid')
      .map((q) => buildOrder(q.id))
      .filter((o): o is CustomerOrderView => o !== null)
      .sort((a, b) => {
        // Ready orders float to the top (they can be approved in one click).
        // Within each bucket, urgent deliveries first, then newest last.
        if (a.allReady !== b.allReady) return a.allReady ? -1 : 1
        if (a.deliveryUrgencyDays !== b.deliveryUrgencyDays) {
          return a.deliveryUrgencyDays - b.deliveryUrgencyDays
        }
        return a.acceptedHoursAgo - b.acceptedHoursAgo
      })

    const totals = orders.reduce(
      (acc, o) => {
        acc.total += 1
        if (o.allReady) acc.ready += 1
        else acc.blocked += 1
        acc.shortageItems += o.shortageCount
        acc.value += o.totalValue
        return acc
      },
      { total: 0, ready: 0, blocked: 0, shortageItems: 0, value: 0 },
    )

    return { orders, totals }
  })

export const getCustomerOrderDetail = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ quoteId: z.string() }))
  .handler(async ({ data }) => {
    return buildOrder(data.quoteId)
  })

export const approveOrderForWarehouse = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ quoteId: z.string() }))
  .handler(async ({ data }) => {
    const quote = db.quotes.get(data.quoteId)
    if (!quote) return { success: false as const, error: 'Quote not found' }

    // Gate: verify every line item is currently AVAILABLE (physical minus
    // already-reserved). Callers shouldn't see the approve button without
    // all-ready, but the server remains the source of truth.
    const stillShort = quote.items.some((i) => {
      const row = db.stock.forProduct(i.productSlug)
      const available = Math.max(0, (row?.stockLevel ?? 0) - (row?.reservedLevel ?? 0))
      return available < i.quantity
    })
    if (stillShort) {
      return {
        success: false as const,
        error: 'Some items are out of stock',
      }
    }

    // Reserve the order's qty on inventory stock. The physical quantity
    // stays put — it only moves when warehouse marks the order delivered
    // (consume) or when it's canceled (release). Approve → reserve.
    for (const i of quote.items) {
      db.stock.reserve(i.productSlug, i.quantity)
    }

    // Stamp the living document so the order drops off the Orders tab.
    db.orderReports.ensureForRfq(quote.rfqId)
    db.orderReports.appendSection(quote.rfqId, 'inventory_orders', {
      approvedAt: new Date().toISOString(),
      itemsPrepared: quote.items.map((i) => ({
        productSlug: i.productSlug,
        quantity: i.quantity,
      })),
    })

    return { success: true as const, quoteId: quote.id }
  })
