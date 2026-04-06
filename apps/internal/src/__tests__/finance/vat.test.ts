import { describe, expect, it } from 'vitest'
import { calculateVAT, calculateLineTotal, calculateInvoiceTotals } from '../../lib/finance/vat'

describe('VAT Calculation', () => {
  describe('calculateVAT', () => {
    it('calculates 14% VAT correctly', () => {
      expect(calculateVAT(1000)).toBe(140)
    })

    it('handles zero amount', () => {
      expect(calculateVAT(0)).toBe(0)
    })

    it('rounds to piaster level (2 decimal places)', () => {
      // Math.round(1234.56 * 14) = Math.round(17283.84) = 17284 / 100 = 172.84
      expect(calculateVAT(1234.56)).toBe(172.84)
    })

    it('handles large amounts (typical Egyptian B2B)', () => {
      // EGP 500,000 order
      expect(calculateVAT(500000)).toBe(70000)
    })

    it('handles small amounts', () => {
      // 50 * 14 = 700 / 100 = 7
      expect(calculateVAT(50)).toBe(7)
    })
  })

  describe('calculateLineTotal', () => {
    it('multiplies quantity by unit price', () => {
      expect(calculateLineTotal(10, 250)).toBe(2500)
    })

    it('handles fractional quantities', () => {
      expect(calculateLineTotal(2.5, 100)).toBe(250)
    })

    it('handles zero quantity', () => {
      expect(calculateLineTotal(0, 100)).toBe(0)
    })
  })

  describe('calculateInvoiceTotals', () => {
    it('calculates totals for single line item', () => {
      const items = [{ quantity: 100, unitPrice: 250 }]
      const result = calculateInvoiceTotals(items)
      expect(result.subtotal).toBe(25000)
      expect(result.vatAmount).toBe(3500)
      expect(result.grandTotal).toBe(28500)
    })

    it('calculates totals for multiple line items', () => {
      const items = [
        { quantity: 200, unitPrice: 150 }, // 30,000
        { quantity: 50, unitPrice: 400 },  // 20,000
        { quantity: 10, unitPrice: 1000 }, // 10,000
      ]
      const result = calculateInvoiceTotals(items)
      expect(result.subtotal).toBe(60000)
      expect(result.vatAmount).toBe(8400) // 60000 * 14 / 100
      expect(result.grandTotal).toBe(68400)
    })

    it('handles empty items array', () => {
      const result = calculateInvoiceTotals([])
      expect(result.subtotal).toBe(0)
      expect(result.vatAmount).toBe(0)
      expect(result.grandTotal).toBe(0)
    })
  })
})
