/**
 * Payment-to-invoice auto-matching and three-way AP match.
 * Auto-match: finds invoices matching payment amount/reference.
 * Three-way match: compares PO vs receipt vs supplier invoice per line.
 */

import type { Invoice, ThreeWayMatchResult } from '../../types/finance'

interface MatchResult {
  matched: Invoice[]
  confidence: number
}

/**
 * Auto-match a payment to invoices.
 * Matching strategy:
 * 1. Exact amount match: highest confidence
 * 2. Reference contains invoice number: high confidence
 * 3. Customer + close amount: medium confidence
 */
export function autoMatchPayment(
  amount: number,
  reference: string,
  invoices: Invoice[],
): MatchResult {
  // Strategy 1: Exact amount match
  const exactMatches = invoices.filter(
    (inv) => inv.grandTotal === amount && (inv.status === 'sent' || inv.status === 'viewed' || inv.status === 'overdue' || inv.status === 'partially_paid'),
  )

  if (exactMatches.length === 1) {
    return { matched: exactMatches, confidence: 95 }
  }

  // Strategy 2: Reference contains invoice number
  const refNormalized = reference.toLowerCase().replace(/[^a-z0-9]/g, '')
  const refMatches = invoices.filter((inv) => {
    const invNumNorm = inv.number.toLowerCase().replace(/[^a-z0-9]/g, '')
    return refNormalized.includes(invNumNorm) && invNumNorm.length > 0
  })

  if (refMatches.length > 0) {
    return { matched: refMatches, confidence: 85 }
  }

  // Strategy 3: Multiple invoices summing to the payment amount (FIFO)
  const unpaid = invoices
    .filter((inv) => inv.status === 'sent' || inv.status === 'viewed' || inv.status === 'overdue' || inv.status === 'partially_paid')
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())

  let remaining = amount
  const fifoMatches: Invoice[] = []
  for (const inv of unpaid) {
    if (remaining <= 0) break
    if (inv.grandTotal <= remaining) {
      fifoMatches.push(inv)
      remaining -= inv.grandTotal
    }
  }

  if (remaining === 0 && fifoMatches.length > 0) {
    return { matched: fifoMatches, confidence: 70 }
  }

  // No confident match
  if (exactMatches.length > 1) {
    return { matched: exactMatches, confidence: 50 }
  }

  return { matched: [], confidence: 0 }
}

interface POLine {
  qty: number
  price: number
}

interface ReceiptLine {
  qty: number
}

interface InvoiceLine {
  qty: number
  price: number
}

/**
 * Three-way match: compares PO line vs receipt line vs supplier invoice line.
 */
export function threeWayMatch(
  po: POLine,
  receipt: ReceiptLine,
  invoice: InvoiceLine,
): ThreeWayMatchResult {
  const qtyVariance = ((invoice.qty - po.qty) / po.qty) * 100
  const priceVariance = ((invoice.price - po.price) / po.price) * 100

  return {
    poLine: { qty: po.qty, price: po.price },
    receiptLine: { qty: receipt.qty },
    invoiceLine: { qty: invoice.qty, price: invoice.price },
    qtyVariance: Math.round(qtyVariance * 100) / 100,
    priceVariance: Math.round(priceVariance * 100) / 100,
    withinTolerance:
      isWithinTolerance(Math.abs(priceVariance), { type: 'price', limit: 5 }) &&
      isWithinTolerance(Math.abs(qtyVariance), { type: 'qty', limit: 2 }),
  }
}

interface ToleranceConfig {
  type: 'price' | 'qty' | 'tax'
  limit: number
}

/**
 * Check if a variance is within tolerance.
 * Tolerance rules per spec: price 5%, qty 2%, tax 0% (exact match).
 */
export function isWithinTolerance(
  variance: number,
  config?: ToleranceConfig,
): boolean {
  if (!config) {
    // Default tolerance: 5% for price
    return Math.abs(variance) <= 5
  }

  switch (config.type) {
    case 'price':
      return Math.abs(variance) <= config.limit
    case 'qty':
      return Math.abs(variance) <= config.limit
    case 'tax':
      return variance === 0
    default:
      return Math.abs(variance) <= config.limit
  }
}
