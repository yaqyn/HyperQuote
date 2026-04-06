import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type { APInvoice } from '../../types/finance'

const daysFromNow = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString().slice(0, 10)
const daysAgo = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString().slice(0, 10)

function getMockAPInvoices(): APInvoice[] {
  return [
    {
      id: 'ap-001', supplierId: 'sup-001', supplierName: 'Cairo Steel Co.', poId: 'po-001',
      poNumber: 'PO-2026-0031', amount: 1_250_000, vatAmount: 175_000, withholdingTax: 12_500,
      netPayable: 1_412_500, receivedDate: daysAgo(10), dueDate: daysFromNow(20),
      matchStatus: 'matched',
      threeWayMatch: {
        poLine: { qty: 50, price: 25_000 }, receiptLine: { qty: 50 },
        invoiceLine: { qty: 50, price: 25_000 }, qtyVariance: 0, priceVariance: 0, withinTolerance: true,
      },
    },
    {
      id: 'ap-002', supplierId: 'sup-002', supplierName: 'Delta Cement Group', poId: 'po-002',
      poNumber: 'PO-2026-0032', amount: 240_000, vatAmount: 33_600, withholdingTax: 2_400,
      netPayable: 271_200, receivedDate: daysAgo(5), dueDate: daysFromNow(25),
      matchStatus: 'within_tolerance',
      threeWayMatch: {
        poLine: { qty: 2000, price: 115 }, receiptLine: { qty: 2000 },
        invoiceLine: { qty: 2000, price: 120 }, qtyVariance: 0, priceVariance: 4.35, withinTolerance: true,
      },
    },
    {
      id: 'ap-003', supplierId: 'sup-003', supplierName: 'Nile Aggregates', poId: 'po-003',
      poNumber: 'PO-2026-0033', amount: 225_000, vatAmount: 31_500, withholdingTax: 2_250,
      netPayable: 254_250, receivedDate: daysAgo(3), dueDate: daysFromNow(27),
      matchStatus: 'exceeds_tolerance',
      threeWayMatch: {
        poLine: { qty: 500, price: 400 }, receiptLine: { qty: 480 },
        invoiceLine: { qty: 500, price: 450 }, qtyVariance: 0, priceVariance: 12.5, withinTolerance: false,
      },
    },
  ]
}

export const getAPInvoices = createServerFn({ method: 'GET' })
  .handler(async () => {
    return { invoices: getMockAPInvoices() }
  })

const getAPAgingInput = z.object({ asOfDate: z.string().optional() })

export const getAPAgingReport = createServerFn({ method: 'GET' })
  .inputValidator(getAPAgingInput)
  .handler(async ({ data: _input }) => {
    return {
      current: 1_715_000,
      days30: 450_000,
      days60: 180_000,
      days90: 50_000,
      days90plus: 0,
      details: getMockAPInvoices(),
    }
  })

const createSupplierPaymentInput = z.object({
  supplierId: z.string(),
  poIds: z.array(z.string()),
  amount: z.number(),
  method: z.enum(['wire', 'cheque', 'lc', 'cash']),
  reference: z.string(),
})

export const createSupplierPayment = createServerFn({ method: 'POST' })
  .inputValidator(createSupplierPaymentInput)
  .handler(async ({ data: _input }) => {
    return { paymentId: `ap-pay-${Date.now()}` }
  })

const generateForm41Input = z.object({
  quarter: z.number().min(1).max(4),
  year: z.number(),
})

export const generateForm41 = createServerFn({ method: 'POST' })
  .inputValidator(generateForm41Input)
  .handler(async ({ data: input }) => {
    return { reportId: `f41-${Date.now()}`, downloadUrl: `/reports/form41-Q${input.quarter}-${input.year}.pdf` }
  })
