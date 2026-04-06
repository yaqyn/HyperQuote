import { describe, expect, it } from 'vitest'
import { autoMatchPayment, threeWayMatch, isWithinTolerance } from '../../lib/finance/matching'
import type { Invoice } from '../../types/finance'

const makeInvoice = (overrides: Partial<Invoice>): Invoice => ({
  id: 'inv-001',
  number: 'INV-2026-0001',
  orderId: 'ord-001',
  customerId: 'cust-001',
  customerName: 'Cairo Construction',
  status: 'sent',
  etaStatus: 'accepted',
  items: [],
  subtotal: 100_000,
  vatAmount: 14_000,
  grandTotal: 114_000,
  dueDate: '2026-04-30',
  issuedDate: '2026-03-30',
  currency: 'EGP',
  sellerTRN: '123456789',
  buyerTRN: '987654321',
  digitalSignatureId: null,
  pdfUrl: null,
  creditNoteIds: [],
  ...overrides,
})

describe('Payment Matching', () => {
  describe('autoMatchPayment', () => {
    it('matches exact amount with high confidence', () => {
      const invoices = [makeInvoice({ grandTotal: 114_000 })]
      const result = autoMatchPayment(114_000, 'Wire TRF', invoices)
      expect(result.matched).toHaveLength(1)
      expect(result.confidence).toBe(95)
    })

    it('matches by reference containing invoice number', () => {
      const invoices = [
        makeInvoice({ number: 'INV-2026-0042', grandTotal: 200_000 }),
        makeInvoice({ id: 'inv-002', number: 'INV-2026-0043', grandTotal: 200_000 }),
      ]
      const result = autoMatchPayment(150_000, 'Payment for INV-2026-0042', invoices)
      expect(result.matched).toHaveLength(1)
      expect(result.matched[0].number).toBe('INV-2026-0042')
      expect(result.confidence).toBe(85)
    })

    it('returns empty match with 0 confidence for no match', () => {
      const invoices = [makeInvoice({ grandTotal: 200_000 })]
      const result = autoMatchPayment(50_000, 'Unknown ref', invoices)
      expect(result.matched).toHaveLength(0)
      expect(result.confidence).toBe(0)
    })

    it('ignores paid invoices', () => {
      const invoices = [makeInvoice({ grandTotal: 114_000, status: 'paid' })]
      const result = autoMatchPayment(114_000, 'Wire TRF', invoices)
      expect(result.matched).toHaveLength(0)
    })

    it('matches multiple invoices via FIFO when sum equals amount', () => {
      const invoices = [
        makeInvoice({ id: 'inv-001', number: 'INV-001', grandTotal: 50_000, dueDate: '2026-04-01' }),
        makeInvoice({ id: 'inv-002', number: 'INV-002', grandTotal: 60_000, dueDate: '2026-04-15' }),
        makeInvoice({ id: 'inv-003', number: 'INV-003', grandTotal: 40_000, dueDate: '2026-04-30' }),
      ]
      const result = autoMatchPayment(110_000, 'Batch payment', invoices)
      expect(result.matched).toHaveLength(2)
      expect(result.confidence).toBe(70)
    })
  })

  describe('threeWayMatch', () => {
    it('returns matching result for identical lines', () => {
      const result = threeWayMatch(
        { qty: 100, price: 250 },
        { qty: 100 },
        { qty: 100, price: 250 },
      )
      expect(result.qtyVariance).toBe(0)
      expect(result.priceVariance).toBe(0)
      expect(result.withinTolerance).toBe(true)
    })

    it('detects price variance within tolerance', () => {
      const result = threeWayMatch(
        { qty: 100, price: 250 },
        { qty: 100 },
        { qty: 100, price: 260 }, // +4% price variance
      )
      expect(result.priceVariance).toBe(4)
      expect(result.withinTolerance).toBe(true)
    })

    it('detects price variance exceeding tolerance', () => {
      const result = threeWayMatch(
        { qty: 100, price: 250 },
        { qty: 100 },
        { qty: 100, price: 275 }, // +10% price variance
      )
      expect(result.priceVariance).toBe(10)
      expect(result.withinTolerance).toBe(false)
    })

    it('detects qty variance exceeding tolerance', () => {
      const result = threeWayMatch(
        { qty: 100, price: 250 },
        { qty: 100 },
        { qty: 105, price: 250 }, // +5% qty variance (exceeds 2%)
      )
      expect(result.qtyVariance).toBe(5)
      expect(result.withinTolerance).toBe(false)
    })
  })

  describe('isWithinTolerance', () => {
    it('allows price variance within 5%', () => {
      expect(isWithinTolerance(4.5, { type: 'price', limit: 5 })).toBe(true)
    })

    it('rejects price variance exceeding 5%', () => {
      expect(isWithinTolerance(5.1, { type: 'price', limit: 5 })).toBe(false)
    })

    it('allows qty variance within 2%', () => {
      expect(isWithinTolerance(1.5, { type: 'qty', limit: 2 })).toBe(true)
    })

    it('rejects qty variance exceeding 2%', () => {
      expect(isWithinTolerance(2.5, { type: 'qty', limit: 2 })).toBe(false)
    })

    it('requires exact match for tax (0% tolerance)', () => {
      expect(isWithinTolerance(0, { type: 'tax', limit: 0 })).toBe(true)
      expect(isWithinTolerance(0.01, { type: 'tax', limit: 0 })).toBe(false)
    })

    it('defaults to 5% tolerance when no config', () => {
      expect(isWithinTolerance(4)).toBe(true)
      expect(isWithinTolerance(6)).toBe(false)
    })
  })
})
