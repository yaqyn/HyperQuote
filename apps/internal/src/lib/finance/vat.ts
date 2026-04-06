/**
 * Egyptian VAT calculation utilities.
 * VAT rate: 14% on ALL building materials (no exemptions).
 * Per Phase 12 decision: Math.round(amount * 14) / 100
 */

import type { InvoiceItem } from '../../types/finance'

/** Egyptian VAT rate */
const VAT_RATE = 14

/**
 * Calculate VAT for a given amount.
 * Uses Math.round for piaster-level rounding per RESEARCH.md Pitfall 4.
 */
export function calculateVAT(amount: number): number {
  return Math.round(amount * VAT_RATE) / 100
}

/**
 * Calculate line total (before VAT).
 */
export function calculateLineTotal(qty: number, unitPrice: number): number {
  return qty * unitPrice
}

/**
 * Calculate invoice totals from line items.
 */
export function calculateInvoiceTotals(
  items: Pick<InvoiceItem, 'quantity' | 'unitPrice'>[],
): { subtotal: number; vatAmount: number; grandTotal: number } {
  const subtotal = items.reduce(
    (sum, item) => sum + calculateLineTotal(item.quantity, item.unitPrice),
    0,
  )
  const vatAmount = calculateVAT(subtotal)
  return {
    subtotal,
    vatAmount,
    grandTotal: subtotal + vatAmount,
  }
}
