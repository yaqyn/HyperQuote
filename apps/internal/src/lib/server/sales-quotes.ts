import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type { Quote, QuoteItem, MarginThresholds, FreshnessIndicator } from '../../types/sales'

function isSupabaseConfigured(): boolean {
  return !!import.meta.env.VITE_SUPABASE_URL
}

// ─── Mock Data ─────────────────────────────────────────────

const PROCUREMENT_BUFFER = 0.025 // 2.5% buffer on supplier cost

/** Apply procurement buffer — sales rep NEVER sees raw supplier cost */
function bufferCost(rawCost: number): number {
  return Math.round(rawCost * (1 + PROCUREMENT_BUFFER) * 100) / 100
}

function getMockQuoteBuilderData(rfqId: string) {
  const rawCosts = [45.85, 3_170, 12.50, 78.30, 165.00]
  const bufferedCosts = rawCosts.map(bufferCost) // [47.00, 3249.25, 12.81, 80.26, 169.13]

  const suggestedProducts: {
    id: string
    productName: string
    specification: string
    supplierName: string
    supplierCost: number
    freshness: FreshnessIndicator
    lastQuotedAt: string
  }[] = [
    { id: 'sp-1', productName: 'Portland Cement CEM I 42.5N', specification: '50kg bags', supplierName: 'Suez Cement', supplierCost: bufferedCosts[0], freshness: 'fresh', lastQuotedAt: new Date(Date.now() - 6 * 3_600_000).toISOString() },
    { id: 'sp-2', productName: 'Steel Rebar 16mm', specification: 'Grade 60, 12m', supplierName: 'Ezz Steel', supplierCost: bufferedCosts[1], freshness: 'fresh', lastQuotedAt: new Date(Date.now() - 12 * 3_600_000).toISOString() },
    { id: 'sp-3', productName: 'Concrete Blocks 20cm', specification: 'Hollow, load-bearing', supplierName: 'Arabian Cement', supplierCost: bufferedCosts[2], freshness: 'aging', lastQuotedAt: new Date(Date.now() - 2 * 86_400_000).toISOString() },
    { id: 'sp-4', productName: 'Plywood Shuttering 18mm', specification: 'Birch, film-faced', supplierName: 'Misr Wood', supplierCost: bufferedCosts[3], freshness: 'stale', lastQuotedAt: new Date(Date.now() - 5 * 86_400_000).toISOString() },
    { id: 'sp-5', productName: 'PVC Pipes 110mm', specification: 'Class D, 6m length', supplierName: 'Elswedy Plastics', supplierCost: bufferedCosts[4], freshness: 'fresh', lastQuotedAt: new Date(Date.now() - 4 * 3_600_000).toISOString() },
  ]

  // Margin thresholds from pricing_rules (mock — configurable, NOT hardcoded in components)
  const marginThresholds: MarginThresholds[] = [
    { productCategory: 'cement_concrete', target: 20, floor: 14, absoluteMin: 8 },
    { productCategory: 'steel_rebar', target: 15, floor: 10, absoluteMin: 6 },
    { productCategory: 'lumber_timber', target: 18, floor: 12, absoluteMin: 8 },
    { productCategory: 'roofing', target: 25, floor: 18, absoluteMin: 12 },
    { productCategory: 'specialty_custom', target: 38, floor: 25, absoluteMin: 15 },
  ]

  return {
    rfqId,
    customerCredit: {
      creditLimit: 5_000_000,
      currentExposure: 2_100_000,
      availableCredit: 2_900_000,
      paymentHistory: 'excellent' as const,
    },
    suggestedProducts,
    recentPrices: suggestedProducts.map((p) => ({
      productName: p.productName,
      supplierCost: p.supplierCost, // Already buffered
      freshness: p.freshness,
      lastQuotedAt: p.lastQuotedAt,
    })),
    marginThresholds,
  }
}

function getMockQuote(quoteId: string): Quote {
  const items: QuoteItem[] = [
    {
      id: 'qi-1',
      productName: 'Portland Cement CEM I 42.5N',
      specification: '50kg bags',
      quantity: 500,
      unit: 'bag',
      supplierCost: bufferCost(45.85),
      marginPercent: 20,
      sellPrice: 56.40,
      lineTotal: 28_200,
      freshnessIndicator: 'fresh',
      supplierName: 'Suez Cement',
      customerCounterPrice: null,
    },
    {
      id: 'qi-2',
      productName: 'Steel Rebar 16mm',
      specification: 'Grade 60, 12m length',
      quantity: 200,
      unit: 'bundle',
      supplierCost: bufferCost(3_170),
      marginPercent: 15,
      sellPrice: 3_738,
      lineTotal: 747_600,
      freshnessIndicator: 'fresh',
      supplierName: 'Ezz Steel',
      customerCounterPrice: null,
    },
    {
      id: 'qi-3',
      productName: 'Concrete Blocks 20cm',
      specification: 'Hollow, load-bearing',
      quantity: 5000,
      unit: 'piece',
      supplierCost: bufferCost(12.50),
      marginPercent: 22,
      sellPrice: 15.63,
      lineTotal: 78_150,
      freshnessIndicator: 'aging',
      supplierName: 'Arabian Cement',
      customerCounterPrice: null,
    },
    {
      id: 'qi-4',
      productName: 'Plywood Shuttering 18mm',
      specification: 'Birch, film-faced',
      quantity: 100,
      unit: 'sheet',
      supplierCost: bufferCost(78.30),
      marginPercent: 18,
      sellPrice: 94.72,
      lineTotal: 9_472,
      freshnessIndicator: 'stale',
      supplierName: 'Misr Wood',
      customerCounterPrice: null,
    },
  ]

  const subtotal = items.reduce((sum, i) => sum + i.lineTotal, 0)
  const vatAmount = Math.round(subtotal * 14) / 100

  return {
    id: quoteId,
    rfqId: 'rfq-001',
    quoteNumber: 'QT-2026-00523',
    version: 1,
    status: 'draft',
    items,
    subtotal,
    vatAmount,
    total: subtotal + vatAmount,
    validUntil: new Date(Date.now() + 14 * 86_400_000).toISOString(),
    marginPercent: 18.2,
    sentAt: null,
    sentVia: null,
    scheduledSendAt: null,
    previousVersionId: null,
    customerPoNumber: null,
  }
}

// ─── Server Functions ──────────────────────────────────────

const createQuoteInput = z.object({
  rfqId: z.string(),
  lines: z.array(
    z.object({
      productName: z.string(),
      specification: z.string(),
      quantity: z.number().positive(),
      unit: z.string(),
      supplierCost: z.number().nonnegative(),
      marginPercent: z.number(),
      sellPrice: z.number().nonnegative(),
    }),
  ),
  validUntil: z.string(),
  terms: z.string().optional(),
})

export const createQuote = createServerFn({ method: 'POST' })
  .inputValidator(createQuoteInput)
  .handler(async ({ data: _input }) => {
    if (!isSupabaseConfigured()) {
      return { quoteId: `qt-${Date.now()}` }
    }

    // TODO: INSERT into quotes + quote_items
    // TODO: Set status to 'draft' via validate_state_transition
    return { quoteId: `qt-${Date.now()}` }
  })

const saveQuoteDraftInput = z.object({
  quoteId: z.string(),
  lineItems: z.array(
    z.object({
      id: z.string().optional(),
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
})

export const saveQuoteDraft = createServerFn({ method: 'POST' })
  .inputValidator(saveQuoteDraftInput)
  .handler(async ({ data: _input }) => {
    if (!isSupabaseConfigured()) {
      return { success: true }
    }

    // TODO: UPSERT quote_items, update quotes.updated_at
    return { success: true }
  })

const getQuoteBuilderDataInput = z.object({
  rfqId: z.string(),
})

export const getQuoteBuilderData = createServerFn({ method: 'GET' })
  .inputValidator(getQuoteBuilderDataInput)
  .handler(async ({ data: input }) => {
    if (!isSupabaseConfigured()) {
      return getMockQuoteBuilderData(input.rfqId)
    }

    // TODO: Real Supabase query:
    // 1. Fetch RFQ + items from quote_requests / quote_request_items
    // 2. Fetch customer credit from customers table
    // 3. Fetch suggested products from products + supplier_products
    // 4. Fetch recent prices with freshness from quote_items (last 3 days fresh, 3-7 aging, >7 stale)
    // 5. Fetch margin thresholds from pricing_rules per product_category
    // CRITICAL: Apply PROCUREMENT_BUFFER to all supplier costs before returning
    return getMockQuoteBuilderData(input.rfqId)
  })

const requestApprovalInput = z.object({
  quoteId: z.string(),
  approverRole: z.enum(['sales_manager', 'vp_sales', 'ceo']),
  justification: z.string().optional(),
  urgencyNote: z.string().optional(),
})

export const requestApproval = createServerFn({ method: 'POST' })
  .inputValidator(requestApprovalInput)
  .handler(async ({ data: _input }) => {
    if (!isSupabaseConfigured()) {
      return { approvalId: `appr-${Date.now()}` }
    }

    // TODO: INSERT into approvals with entity_type = 'quote'
    // TODO: Update quotes.status to 'pending_approval'
    // TODO: Send push notification to approver with quote summary
    // TODO: Schedule 2h escalation check
    return { approvalId: `appr-${Date.now()}` }
  })

const approveQuoteInput = z.object({
  approvalId: z.string(),
  notes: z.string().optional(),
})

export const approveQuote = createServerFn({ method: 'POST' })
  .inputValidator(approveQuoteInput)
  .handler(async ({ data: _input }) => {
    if (!isSupabaseConfigured()) {
      return { success: true }
    }

    // TODO: Update approvals.status to 'approved'
    // TODO: Update quotes.status to 'approved' via validate_state_transition
    // TODO: Log approval with timestamp for audit
    return { success: true }
  })

const previewQuotePDFInput = z.object({
  quoteId: z.string(),
})

export const previewQuotePDF = createServerFn({ method: 'GET' })
  .inputValidator(previewQuotePDFInput)
  .handler(async ({ data: input }) => {
    if (!isSupabaseConfigured()) {
      // Mock: return the quote data for client-side preview rendering
      return {
        quote: getMockQuote(input.quoteId),
        pdfUrl: null as string | null, // PDF generation deferred to Phase 28
      }
    }

    // TODO: Generate PDF or return pre-generated URL from R2
    return { quote: getMockQuote(input.quoteId), pdfUrl: null }
  })
