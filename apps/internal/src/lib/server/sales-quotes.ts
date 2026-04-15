import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { getBroadCategory, type CatalogProduct, type BroadCategory } from '@hyperquote/types'
import { db, hoursSince } from '../db/db'
import type { Quote, QuoteItem, MarginThresholds, FreshnessIndicator } from '../../types/sales'

// Re-exported so every sales UI that already imports from here keeps working
// while the canonical definitions live in inventory.ts.
export {
  requestInventoryPriceUpdate,
  getOutdatedPricesSummary,
} from './inventory'

// ─── Config ───────────────────────────────────────────────

const PROCUREMENT_BUFFER = 0.025

function bufferCost(rawCost: number): number {
  return Math.round(rawCost * (1 + PROCUREMENT_BUFFER) * 100) / 100
}

/** Maps broad catalog categories to the sales pricing_rules buckets. */
function marginCategoryFor(product: CatalogProduct): string {
  if (product.category === 'waterproofing' || product.category === 'roofing') return 'roofing'
  const broad: BroadCategory = getBroadCategory(product.category)
  const map: Record<BroadCategory, string> = {
    cement: 'cement_concrete',
    aggregates: 'cement_concrete',
    bricks: 'cement_concrete',
    steel: 'steel_rebar',
    timber: 'lumber_timber',
    finishing: 'specialty_custom',
  }
  return map[broad]
}

const MARGIN_THRESHOLDS: MarginThresholds[] = [
  { productCategory: 'cement_concrete', target: 20, floor: 14, absoluteMin: 8 },
  { productCategory: 'steel_rebar', target: 15, floor: 10, absoluteMin: 6 },
  { productCategory: 'lumber_timber', target: 18, floor: 12, absoluteMin: 8 },
  { productCategory: 'roofing', target: 25, floor: 18, absoluteMin: 12 },
  { productCategory: 'specialty_custom', target: 38, floor: 25, absoluteMin: 15 },
]

// ─── Derived freshness helpers ────────────────────────────

function freshnessFor(lastUpdatedAt: string): FreshnessIndicator {
  const hours = hoursSince(lastUpdatedAt)
  if (hours < 24) return 'fresh'
  if (hours < 72) return 'aging'
  return 'stale'
}

function isRecentlyOrderedSlug(slug: string): boolean {
  return db.rfqs
    .list()
    .filter((r) => r.status !== 'declined' && r.status !== 'expired')
    .some((r) => r.items.some((i) => i.productSlug === slug))
}

// ─── Quote builder data ───────────────────────────────────

function buildSuggestedProduct(slug: string, quantity: number, rfqId: string, index: number) {
  const product = db.products.findBySlug(slug)
  if (!product) return null
  const primary = db.supplierPrices.primaryForProduct(slug)
  const lastUpdatedAt = primary?.lastQuotedAt ?? new Date(0).toISOString()
  const freshness = primary ? freshnessFor(lastUpdatedAt) : ('missing' as FreshnessIndicator)
  const priceStatus = freshness === 'fresh' ? 'updated' : 'outdated'
  return {
    id: `sp-${rfqId}-${index + 1}`,
    productName: product.name,
    specification: product.subcategory.replace(/_/g, ' '),
    supplierName: primary?.supplierName ?? '',
    supplierCost: bufferCost(primary?.rawCost ?? 0),
    quantity,
    unit: product.unit_of_measure,
    freshness,
    priceStatus,
    recentlyOrdered: isRecentlyOrderedSlug(slug),
    lastQuotedAt: lastUpdatedAt,
    category: marginCategoryFor(product),
  }
}

function getMockQuoteBuilderData(rfqId: string) {
  const rfq = db.rfqs.get(rfqId)
  const customer = rfq ? db.customers.findByName(rfq.customerName) : undefined

  const suggestedProducts = rfq
    ? rfq.items
        .map((item, i) => buildSuggestedProduct(item.productSlug, item.quantity, rfqId, i))
        .filter((p): p is NonNullable<typeof p> => p !== null)
    : []

  return {
    rfqId,
    customer: {
      name: rfq?.customerName ?? 'Unknown Customer',
      tier: rfq?.customerTier ?? ('new' as const),
      contactName: rfq?.contactName ?? customer?.contactName ?? '',
      phone: customer?.phone ?? '',
      email: customer?.email ?? '',
      company: customer?.companyName ?? rfq?.customerName ?? '',
    },
    deliveryAddress: rfq?.deliveryAddress ?? customer?.address ?? '',
    customerCredit: {
      creditLimit: customer?.creditLimit ?? 0,
      currentExposure: customer?.currentExposure ?? 0,
      availableCredit: (customer?.creditLimit ?? 0) - (customer?.currentExposure ?? 0),
      paymentHistory: customer?.paymentHistory ?? ('good' as const),
    },
    suggestedProducts,
    recentPrices: suggestedProducts.map((p) => ({
      productName: p.productName,
      supplierCost: p.supplierCost,
      freshness: p.freshness,
      lastQuotedAt: p.lastQuotedAt,
    })),
    marginThresholds: MARGIN_THRESHOLDS,
  }
}

// ─── Persisted quote read (for PDF preview etc.) ──────────

function getMockQuote(quoteId: string): Quote {
  const row = db.quotes.get(quoteId) ?? db.quotes.list()[0]
  const customer = db.customers.get(row.customerId)
  const items: QuoteItem[] = row.items
    .map((i) => {
      const product = db.products.findBySlug(i.productSlug)
      const primary = db.supplierPrices.primaryForProduct(i.productSlug)
      if (!product) return null
      const supplierCost = bufferCost(primary?.rawCost ?? 0)
      const lineTotal = Math.round(i.sellPrice * i.quantity * 100) / 100
      const freshness = primary ? freshnessFor(primary.lastQuotedAt) : ('missing' as FreshnessIndicator)
      return {
        id: `qi-${i.productSlug}`,
        productName: product.name,
        specification: product.subcategory.replace(/_/g, ' '),
        quantity: i.quantity,
        unit: product.unit_of_measure,
        supplierCost,
        marginPercent: i.marginPercent,
        sellPrice: i.sellPrice,
        lineTotal,
        freshnessIndicator: freshness,
        priceStatus: freshness === 'fresh' ? ('updated' as const) : ('outdated' as const),
        recentlyOrdered: isRecentlyOrderedSlug(i.productSlug),
        supplierName: primary?.supplierName ?? '',
        customerCounterPrice: null,
      } satisfies QuoteItem
    })
    .filter((x): x is QuoteItem => x !== null)

  const subtotal = items.reduce((sum, i) => sum + i.lineTotal, 0)
  const vatAmount = Math.round(subtotal * 14) / 100

  return {
    id: row.id,
    rfqId: row.rfqId,
    quoteNumber: row.quoteNumber,
    version: row.version,
    status: row.status,
    items,
    subtotal,
    vatAmount,
    total: subtotal + vatAmount,
    validUntil: row.validUntil,
    marginPercent: row.marginPercent,
    sentAt: row.sentAt,
    sentVia: row.sentVia,
    scheduledSendAt: null,
    previousVersionId: row.previousVersionId,
    customerPoNumber: row.customerPoNumber,
  }
}

// ─── Server Functions ─────────────────────────────────────

export const createQuote = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      rfqId: z.string(),
      customerId: z.string().optional(),
      lines: z.array(
        z.object({
          productSlug: z.string(),
          quantity: z.number().positive(),
          marginPercent: z.number(),
          sellPrice: z.number().nonnegative(),
        }),
      ),
      validUntil: z.string(),
      terms: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const rfq = db.rfqs.get(data.rfqId)
    const customer = data.customerId
      ? db.customers.get(data.customerId)
      : rfq
      ? db.customers.findByName(rfq.customerName)
      : undefined
    const avgMargin =
      data.lines.reduce((sum, l) => sum + l.marginPercent, 0) / Math.max(1, data.lines.length)

    const row = db.quotes.insert({
      quoteNumber: `QT-2026-${String(Math.floor(Math.random() * 99999)).padStart(5, '0')}`,
      rfqId: data.rfqId,
      customerId: customer?.id ?? 'cust-unknown',
      version: 1,
      status: 'draft',
      marginPercent: Math.round(avgMargin * 10) / 10,
      sentAt: null,
      validUntil: data.validUntil,
      sentVia: null,
      customerPoNumber: null,
      previousVersionId: null,
      items: data.lines.map((l) => ({
        productSlug: l.productSlug,
        quantity: l.quantity,
        marginPercent: l.marginPercent,
        sellPrice: l.sellPrice,
      })),
    })
    return { quoteId: row.id }
  })

export const saveQuoteDraft = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      quoteId: z.string(),
      lineItems: z.array(
        z.object({
          id: z.string().optional(),
          productSlug: z.string().optional(),
          productName: z.string(),
          specification: z.string(),
          quantity: z.number().positive(),
          unit: z.string(),
          supplierCost: z.number().nonnegative(),
          marginPercent: z.number(),
          sellPrice: z.number().nonnegative(),
        }),
      ),
      terms: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    // Resolve items → slugs so the draft references catalog rows, then
    // patch the existing quote row. If the quoteId isn't a real row
    // (e.g. new draft), no-op — createQuote handles fresh creation.
    const items = data.lineItems
      .map((li) => {
        const slug = li.productSlug ?? db.products.findByName(li.productName)?.slug
        if (!slug) return null
        return {
          productSlug: slug,
          quantity: li.quantity,
          marginPercent: li.marginPercent,
          sellPrice: li.sellPrice,
        }
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
    db.quotes.update(data.quoteId, { items })
    return { success: true }
  })

export const getQuoteBuilderData = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ rfqId: z.string() }))
  .handler(async ({ data }) => {
    return getMockQuoteBuilderData(data.rfqId)
  })

export const requestApproval = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      quoteId: z.string(),
      approverRole: z.enum(['sales_manager', 'vp_sales', 'ceo']),
      justification: z.string().optional(),
      urgencyNote: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    // Flip quote into pending_approval; approver info tracked separately later.
    db.quotes.updateStatus(data.quoteId, 'pending_approval')
    return { approvalId: `appr-${Date.now()}` }
  })

export const approveQuote = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      approvalId: z.string(),
      quoteId: z.string().optional(),
      notes: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    // If a quoteId is provided, flip it into approved status so sending
    // downstream is unblocked.
    if (data.quoteId) {
      db.quotes.updateStatus(data.quoteId, 'approved')
    }
    return { success: true }
  })

export const previewQuotePDF = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ quoteId: z.string() }))
  .handler(async ({ data }) => {
    return { quote: getMockQuote(data.quoteId), pdfUrl: null as string | null }
  })

// ─── Product Catalog (consumed by the quote builder search menu) ──

export const getProductCatalog = createServerFn({ method: 'GET' })
  .inputValidator(z.object({}))
  .handler(async () => {
    return {
      products: db.products.list().map((product) => {
        const primary = db.supplierPrices.primaryForProduct(product.slug)
        const lastUpdatedAt = primary?.lastQuotedAt ?? new Date(0).toISOString()
        const freshness = primary ? freshnessFor(lastUpdatedAt) : ('missing' as FreshnessIndicator)
        return {
          id: product.id,
          name: product.name,
          specification: product.subcategory.replace(/_/g, ' '),
          unit: product.unit_of_measure,
          category: product.category,
          supplierCost: bufferCost(primary?.rawCost ?? 0),
          freshness,
          priceStatus: freshness === 'fresh' ? ('updated' as const) : ('outdated' as const),
          recentlyOrdered: isRecentlyOrderedSlug(product.slug),
          supplierName: primary?.supplierName ?? '',
        }
      }),
    }
  })
