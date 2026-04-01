import { describe, it, expect } from 'vitest'

describe('Supplier Invoice Submission', () => {
  describe('VAT Calculation', () => {
    it.todo('calculates VAT at exactly 14% of subtotal')
    it.todo('uses Math.round to avoid floating point precision errors')
    it.todo('computes total as subtotal + taxAmount')
  })

  describe('Total Mismatch', () => {
    it.todo('shows warning when user total differs from calculated by more than 1%')
    it.todo('does not show warning when difference is within 1%')
  })

  describe('InvoiceForm', () => {
    it.todo('auto-populates line items from selected PO')
    it.todo('requires invoice number and PDF upload')
    it.todo('calls submitSupplierInvoice on valid submission')
  })
})
