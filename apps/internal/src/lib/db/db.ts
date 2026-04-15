/**
 * Mock in-memory database for the internal app during the dev phase.
 *
 * Seeded from the Markdown files under ./seed/*.md at module init. Every
 * server function in the internal app MUST read/write through this module
 * — never from local static maps. When Supabase lands, the body of this
 * file is the only thing that changes; every caller's contract stays the
 * same.
 *
 * Cross-app plan: in a later session this module moves to `packages/db/`
 * (or `@hyperquote/db`) so website / portal / admin dev modes can share
 * the same mock state. The loader already uses `import.meta.glob` which
 * works in any Vite consumer, so the move is a file-move + import rewrite.
 *
 * Design rules that keep the swap clean:
 *   1. All accessors are pure functions that take a table argument + filter.
 *   2. All mutators stamp updated_at and return the updated row.
 *   3. Derived state (freshness, primary cost lookups) is computed at read
 *      time, not stored, so a write doesn't need to update two places.
 *   4. Time fields in the seed are "daysAgo / hoursAgo" numbers which get
 *      rendered to ISO at load — seeds stay readable without daily rewrites.
 */

import {
  CATALOG_PRODUCTS,
  getBroadCategory,
  type CatalogProduct,
} from '@hyperquote/types'
import { loadSeed } from './md-loader'

// ─── Time helpers ─────────────────────────────────────────

const BOOT_AT = Date.now()
const hoursAgoIso = (h: number) => new Date(BOOT_AT - h * 3_600_000).toISOString()
const daysAgoIso = (d: number) => hoursAgoIso(d * 24)
const hoursFromNowIso = (h: number) => new Date(BOOT_AT + h * 3_600_000).toISOString()
const daysFromNowIso = (d: number) => hoursFromNowIso(d * 24)

export function hoursSince(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / 3_600_000
}

// ─── Table row types (DB-shaped) ──────────────────────────

export type SupplierTier = 'preferred' | 'approved' | 'conditional' | 'new'

export interface SupplierRow {
  name: string
  tier: SupplierTier
  paymentTerms: string
  phone: string | null
  rating: number
  customBadges: string[]
  joinedAt: string
}

export interface SupplierPriceRow {
  id: string // synthetic: `${productSlug}::${supplierName}`
  productSlug: string
  supplierName: string
  rawCost: number
  leadTimeDays: number
  minOrderQty: number
  lastQuotedAt: string
  isPrimary: boolean
  notes: string | null
}

export interface RfqItemRow {
  productSlug: string
  quantity: number
}

export interface RfqRow {
  id: string
  customerName: string
  customerTier: 'A' | 'B' | 'C' | 'new'
  contactName: string
  deliveryAddress: string
  deliveryCity: string
  estimatedValue: number
  lineItemCount: number
  status:
    | 'submitted'
    | 'assigned'
    | 'reviewing'
    | 'awaiting_clarification'
    | 'quoting'
    | 'quoted'
    | 'negotiating'
    | 'declined'
    | 'expired'
  assignedRep: string | null
  createdAt: string
  slaDeadline: string
  deliveryUrgency: number
  items: RfqItemRow[]
}

export interface CustomerRow {
  id: string
  companyName: string
  tier: 'A' | 'B' | 'C' | 'new'
  status: 'unclaimed' | 'claimed' | 'active' | 'inactive'
  contactName: string
  phone: string
  email: string | null
  address: string
  city: string
  creditLimit: number
  currentExposure: number
  orderCount: number
  lifetimeValue: number
  avgMargin: number
  paymentHistory: 'excellent' | 'good' | 'fair' | 'poor'
  assignedSalesRep: string | null
  joinedAt: string
}

export interface QuoteItemRow {
  productSlug: string
  quantity: number
  marginPercent: number
  sellPrice: number
}

export interface QuoteRow {
  id: string
  quoteNumber: string
  rfqId: string
  customerId: string
  version: number
  status:
    | 'draft'
    | 'internal_review'
    | 'pending_approval'
    | 'approved'
    | 'sent'
    | 'viewed'
    | 'negotiating'
    | 'revised'
    | 'accepted'
    | 'declined'
    | 'expired'
  marginPercent: number
  sentAt: string | null
  validUntil: string
  sentVia: 'portal' | 'email' | 'both' | null
  customerPoNumber: string | null
  previousVersionId: string | null
  items: QuoteItemRow[]
}

export interface PriceUpdateRequestRow {
  id: string
  productSlug: string
  customerContext: string
  requestedAt: string
  status: 'pending' | 'resolved'
}

export interface SalesRepRow {
  id: string
  name: string
  role: 'junior' | 'mid' | 'senior'
  activeRfqs: number
  specialization: string[]
  territories: string[]
}

export type OrderReportStage =
  | 'submitted'
  | 'evaluated'
  | 'finance_partial'
  | 'inventory_orders'
  | 'finance_full'
  | 'warehouse'
  | 'dispatch'
  | 'delivered'
  | 'canceled'

/**
 * A living report that accrues a new section each time the order is
 * evaluated into the next stage. Sections are a sparse map from stage →
 * data blob; unfilled stages render as placeholders in the viewer.
 */
export interface OrderReportRow {
  id: string
  rfqId: string
  currentStage: OrderReportStage
  canceledReason: string | null
  canceledAt: string | null
  sections: Partial<Record<OrderReportStage, Record<string, unknown>>>
}

// ─── Raw seed types (pre-expansion) ───────────────────────

interface RawSupplier {
  name: string
  tier: SupplierTier
  paymentTerms: string
  phone: string | null
  rating: number
  customBadges: string[]
}

interface RawSupplierPrice {
  productSlug: string
  supplierName: string
  rawCost: number
  leadTimeDays: number
  minOrderQty: number
  lastQuotedAtDaysAgo: number
  isPrimary: boolean
  notes: string | null
}

interface RawRfq {
  id: string
  customerName: string
  customerTier: 'A' | 'B' | 'C' | 'new'
  contactName: string
  deliveryAddress: string
  deliveryCity: string
  estimatedValue: number
  lineItemCount: number
  status: RfqRow['status']
  assignedRep: string | null
  createdAtHoursAgo: number
  slaHoursFromNow: number
  deliveryUrgencyDays: number
  items: RfqItemRow[]
}

interface RawCustomer {
  id: string
  companyName: string
  tier: 'A' | 'B' | 'C' | 'new'
  status: CustomerRow['status']
  contactName: string
  phone: string
  email: string | null
  address: string
  city: string
  creditLimit: number
  currentExposure: number
  orderCount: number
  lifetimeValue: number
  avgMargin: number
  paymentHistory: CustomerRow['paymentHistory']
  assignedSalesRep: string | null
  joinedAtDaysAgo: number
}

interface RawQuote {
  id: string
  quoteNumber: string
  rfqId: string
  customerId: string
  version: number
  status: QuoteRow['status']
  marginPercent: number
  sentAtHoursAgo: number | null
  validUntilDaysFromNow: number
  sentVia: QuoteRow['sentVia']
  customerPoNumber: string | null
  previousVersionId: string | null
  items: QuoteItemRow[]
}

interface RawPriceUpdateRequest {
  id: string
  productSlug: string
  customerContext: string
  requestedAtHoursAgo: number
  status: PriceUpdateRequestRow['status']
}

interface RawSalesRep {
  id: string
  name: string
  role: SalesRepRow['role']
  activeRfqs: number
  specialization: string[]
  territories: string[]
}

interface RawOrderReport {
  id: string
  rfqId: string
  currentStage: OrderReportStage
  canceledReason: string | null
  canceledAtHoursAgo: number | null
  sections: Partial<Record<OrderReportStage, Record<string, unknown>>>
}

// ─── In-memory tables ─────────────────────────────────────

const rawSuppliers = loadSeed<RawSupplier[]>('suppliers')
const rawPrices = loadSeed<RawSupplierPrice[]>('supplier_prices')
const rawRfqs = loadSeed<RawRfq[]>('rfqs')
const rawCustomers = loadSeed<RawCustomer[]>('customers')
const rawQuotes = loadSeed<RawQuote[]>('quotes')
const rawRequests = loadSeed<RawPriceUpdateRequest[]>('price_update_requests')
const rawSalesReps = loadSeed<RawSalesRep[]>('sales_reps')
const rawOrderReports = loadSeed<RawOrderReport[]>('order_reports')

const suppliers = new Map<string, SupplierRow>(
  rawSuppliers.map((s) => [
    s.name,
    { ...s, joinedAt: daysAgoIso(120) },
  ]),
)

const supplierPrices: SupplierPriceRow[] = rawPrices.map((r) => ({
  id: `${r.productSlug}::${r.supplierName}`,
  productSlug: r.productSlug,
  supplierName: r.supplierName,
  rawCost: r.rawCost,
  leadTimeDays: r.leadTimeDays,
  minOrderQty: r.minOrderQty,
  lastQuotedAt: daysAgoIso(r.lastQuotedAtDaysAgo),
  isPrimary: r.isPrimary,
  notes: r.notes,
}))

const rfqs: RfqRow[] = rawRfqs.map((r) => ({
  id: r.id,
  customerName: r.customerName,
  customerTier: r.customerTier,
  contactName: r.contactName,
  deliveryAddress: r.deliveryAddress,
  deliveryCity: r.deliveryCity,
  estimatedValue: r.estimatedValue,
  lineItemCount: r.lineItemCount,
  status: r.status,
  assignedRep: r.assignedRep,
  createdAt: hoursAgoIso(r.createdAtHoursAgo),
  slaDeadline: hoursFromNowIso(r.slaHoursFromNow),
  deliveryUrgency: r.deliveryUrgencyDays,
  items: r.items,
}))

const customers = new Map<string, CustomerRow>(
  rawCustomers.map((c) => [
    c.id,
    { ...c, joinedAt: daysAgoIso(c.joinedAtDaysAgo) },
  ]),
)

const quotes: QuoteRow[] = rawQuotes.map((q) => ({
  id: q.id,
  quoteNumber: q.quoteNumber,
  rfqId: q.rfqId,
  customerId: q.customerId,
  version: q.version,
  status: q.status,
  marginPercent: q.marginPercent,
  sentAt: q.sentAtHoursAgo == null ? null : hoursAgoIso(q.sentAtHoursAgo),
  validUntil: daysFromNowIso(q.validUntilDaysFromNow),
  sentVia: q.sentVia,
  customerPoNumber: q.customerPoNumber,
  previousVersionId: q.previousVersionId,
  items: q.items,
}))

const priceUpdateRequests: PriceUpdateRequestRow[] = rawRequests.map((r) => ({
  id: r.id,
  productSlug: r.productSlug,
  customerContext: r.customerContext,
  requestedAt: hoursAgoIso(r.requestedAtHoursAgo),
  status: r.status,
}))

const salesReps: SalesRepRow[] = rawSalesReps.map((r) => ({ ...r }))

const orderReports: OrderReportRow[] = rawOrderReports.map((r) => ({
  id: r.id,
  rfqId: r.rfqId,
  currentStage: r.currentStage,
  canceledReason: r.canceledReason,
  canceledAt: r.canceledAtHoursAgo == null ? null : hoursAgoIso(r.canceledAtHoursAgo),
  sections: r.sections,
}))

// ─── Accessors ────────────────────────────────────────────

export const db = {
  // ── Products ──
  products: {
    list(): CatalogProduct[] {
      return CATALOG_PRODUCTS
    },
    findBySlug(slug: string): CatalogProduct | undefined {
      return CATALOG_PRODUCTS.find((p) => p.slug === slug)
    },
    findByName(name: string): CatalogProduct | undefined {
      return CATALOG_PRODUCTS.find((p) => p.name === name)
    },
    broadCategoryFor(product: CatalogProduct) {
      return getBroadCategory(product.category)
    },
  },

  // ── Suppliers ──
  suppliers: {
    list(): SupplierRow[] {
      return Array.from(suppliers.values())
    },
    get(name: string): SupplierRow | undefined {
      return suppliers.get(name)
    },
    upsert(name: string, patch: Partial<Omit<SupplierRow, 'name'>>): SupplierRow {
      const existing =
        suppliers.get(name) ??
        ({
          name,
          tier: 'new',
          paymentTerms: '—',
          phone: null,
          rating: 3,
          customBadges: [],
          joinedAt: new Date().toISOString(),
        } satisfies SupplierRow)
      const next: SupplierRow = { ...existing, ...patch }
      suppliers.set(name, next)
      return next
    },
    addBadge(name: string, badge: string) {
      const s = suppliers.get(name)
      if (!s) return
      if (!s.customBadges.includes(badge)) {
        s.customBadges = [...s.customBadges, badge]
      }
    },
    removeBadge(name: string, badge: string) {
      const s = suppliers.get(name)
      if (!s) return
      s.customBadges = s.customBadges.filter((b) => b !== badge)
    },
  },

  // ── Supplier prices ──
  supplierPrices: {
    all(): SupplierPriceRow[] {
      return supplierPrices
    },
    forProduct(productSlug: string): SupplierPriceRow[] {
      return supplierPrices.filter((p) => p.productSlug === productSlug)
    },
    primaryForProduct(productSlug: string): SupplierPriceRow | undefined {
      return supplierPrices.find((p) => p.productSlug === productSlug && p.isPrimary)
    },
    forSupplier(supplierName: string): SupplierPriceRow[] {
      return supplierPrices.filter((p) => p.supplierName === supplierName)
    },
    getById(id: string): SupplierPriceRow | undefined {
      return supplierPrices.find((p) => p.id === id)
    },
    updateCost(id: string, rawCost: number): SupplierPriceRow | undefined {
      const row = supplierPrices.find((p) => p.id === id)
      if (!row) return undefined
      row.rawCost = rawCost
      row.lastQuotedAt = new Date().toISOString()
      return row
    },
  },

  // ── RFQs ──
  rfqs: {
    list(): RfqRow[] {
      return rfqs
    },
    get(id: string): RfqRow | undefined {
      return rfqs.find((r) => r.id === id)
    },
    assign(id: string, rep: string) {
      const r = rfqs.find((x) => x.id === id)
      if (!r) return
      r.assignedRep = rep
      if (r.status === 'submitted') r.status = 'assigned'
    },
    updateStatus(id: string, status: RfqRow['status']): RfqRow | undefined {
      const r = rfqs.find((x) => x.id === id)
      if (!r) return undefined
      r.status = status
      return r
    },
  },

  // ── Customers ──
  customers: {
    list(): CustomerRow[] {
      return Array.from(customers.values())
    },
    get(id: string): CustomerRow | undefined {
      return customers.get(id)
    },
    findByName(name: string): CustomerRow | undefined {
      return Array.from(customers.values()).find((c) => c.companyName === name)
    },
    insert(row: Omit<CustomerRow, 'id' | 'joinedAt'>): CustomerRow {
      const id = `cust-${String(customers.size + 1).padStart(3, '0')}-${Date.now().toString(36).slice(-4)}`
      const full: CustomerRow = {
        ...row,
        id,
        joinedAt: new Date().toISOString(),
      }
      customers.set(id, full)
      return full
    },
    update(id: string, patch: Partial<Omit<CustomerRow, 'id' | 'joinedAt'>>): CustomerRow | undefined {
      const existing = customers.get(id)
      if (!existing) return undefined
      const next = { ...existing, ...patch }
      customers.set(id, next)
      return next
    },
  },

  // ── Quotes ──
  quotes: {
    list(): QuoteRow[] {
      return quotes
    },
    get(id: string): QuoteRow | undefined {
      return quotes.find((q) => q.id === id)
    },
    forRfq(rfqId: string): QuoteRow[] {
      return quotes.filter((q) => q.rfqId === rfqId)
    },
    forCustomer(customerId: string): QuoteRow[] {
      return quotes.filter((q) => q.customerId === customerId)
    },
    insert(row: Omit<QuoteRow, 'id'>): QuoteRow {
      const id = `qt-${Date.now()}`
      const full: QuoteRow = { ...row, id }
      quotes.push(full)
      return full
    },
    updateStatus(id: string, status: QuoteRow['status']): QuoteRow | undefined {
      const q = quotes.find((x) => x.id === id)
      if (!q) return undefined
      q.status = status
      return q
    },
    update(id: string, patch: Partial<Omit<QuoteRow, 'id'>>): QuoteRow | undefined {
      const idx = quotes.findIndex((x) => x.id === id)
      if (idx === -1) return undefined
      quotes[idx] = { ...quotes[idx], ...patch }
      return quotes[idx]
    },
  },

  // ── Price update requests ──
  priceUpdateRequests: {
    pending(): PriceUpdateRequestRow[] {
      return priceUpdateRequests.filter((r) => r.status === 'pending')
    },
    forProduct(productSlug: string): PriceUpdateRequestRow[] {
      return priceUpdateRequests.filter(
        (r) => r.productSlug === productSlug && r.status === 'pending',
      )
    },
    insert(productSlug: string, customerContext: string, rfqId?: string): PriceUpdateRequestRow {
      const row: PriceUpdateRequestRow = {
        id: `pur-${Date.now()}-${priceUpdateRequests.length}`,
        productSlug,
        customerContext: rfqId ? `${customerContext} (${rfqId})` : customerContext,
        requestedAt: new Date().toISOString(),
        status: 'pending',
      }
      priceUpdateRequests.push(row)
      return row
    },
    resolveFor(productSlug: string) {
      for (const r of priceUpdateRequests) {
        if (r.productSlug === productSlug && r.status === 'pending') {
          r.status = 'resolved'
        }
      }
    },
  },

  // ── Sales reps ──
  salesReps: {
    list(): SalesRepRow[] {
      return salesReps
    },
    get(id: string): SalesRepRow | undefined {
      return salesReps.find((r) => r.id === id)
    },
    findByName(name: string): SalesRepRow | undefined {
      return salesReps.find((r) => r.name === name)
    },
  },

  // ── Order reports (the living document) ──
  orderReports: {
    list(): OrderReportRow[] {
      return orderReports
    },
    get(id: string): OrderReportRow | undefined {
      return orderReports.find((r) => r.id === id)
    },
    forRfq(rfqId: string): OrderReportRow | undefined {
      return orderReports.find((r) => r.rfqId === rfqId)
    },
    /**
     * Ensures a report exists for an RFQ — creates one with a submitted
     * section derived from the RFQ if none exists. Used by any mutation
     * that needs to stamp a new section (decline, quote, payment, etc.).
     */
    ensureForRfq(rfqId: string): OrderReportRow | undefined {
      let row = orderReports.find((r) => r.rfqId === rfqId)
      if (row) return row
      const rfq = rfqs.find((r) => r.id === rfqId)
      if (!rfq) return undefined
      row = {
        id: `rep-${orderReports.length + 1}-${Date.now().toString(36).slice(-4)}`,
        rfqId,
        currentStage: 'submitted',
        canceledReason: null,
        canceledAt: null,
        sections: {
          submitted: {
            customerName: rfq.customerName,
            customerTier: rfq.customerTier,
            contactName: rfq.contactName,
            phone: '',
            deliveryAddress: rfq.deliveryAddress,
            deliveryCity: rfq.deliveryCity,
            deliveryUrgencyDays: rfq.deliveryUrgency,
            items: rfq.items,
          },
        },
      }
      orderReports.push(row)
      return row
    },
    appendSection(
      rfqId: string,
      stage: OrderReportStage,
      data: Record<string, unknown>,
    ): OrderReportRow | undefined {
      const row = orderReports.find((r) => r.rfqId === rfqId)
      if (!row) return undefined
      row.sections[stage] = data
      row.currentStage = stage
      return row
    },
    markCanceled(rfqId: string, reason: string): OrderReportRow | undefined {
      const row = orderReports.find((r) => r.rfqId === rfqId)
      if (!row) return undefined
      row.currentStage = 'canceled'
      row.canceledReason = reason
      row.canceledAt = new Date().toISOString()
      return row
    },
  },
} as const
