import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type { Invoice } from '../../types/finance'

const hoursFromNow = (h: number) => new Date(Date.now() + h * 3_600_000).toISOString()
const daysFromNow = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString().slice(0, 10)
const daysAgo = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString().slice(0, 10)

/** Egyptian VAT rate */
const VAT_RATE = 0.14

function getMockInvoices(): Invoice[] {
  return [
    {
      id: 'inv-001', number: 'INV-2026-0001', orderId: 'ord-001', customerId: 'cust-001',
      customerName: 'Cairo Construction Co.', status: 'sent', etaStatus: 'accepted',
      items: [
        { id: 'item-001', productName: 'Steel Rebar 16mm', productNameAr: 'حديد تسليح ١٦مم', egsCode: 'EGS-7214', uom: 'ton', quantity: 50, unitPrice: 25_000, lineTotal: 1_250_000, vatAmount: 175_000 },
      ],
      subtotal: 1_250_000, vatAmount: 175_000, grandTotal: 1_425_000,
      dueDate: daysFromNow(30), issuedDate: daysAgo(2), currency: 'EGP',
      sellerTRN: '123456789', buyerTRN: '987654321',
      digitalSignatureId: 'sig-001', pdfUrl: '/invoices/INV-2026-0001.pdf', creditNoteIds: [],
    },
    {
      id: 'inv-002', number: 'INV-2026-0002', orderId: 'ord-002', customerId: 'cust-002',
      customerName: 'Delta Building Materials', status: 'overdue', etaStatus: 'accepted',
      items: [
        { id: 'item-002', productName: 'Portland Cement', productNameAr: 'أسمنت بورتلاندي', egsCode: 'EGS-2523', uom: 'bag', quantity: 2000, unitPrice: 120, lineTotal: 240_000, vatAmount: 33_600 },
      ],
      subtotal: 240_000, vatAmount: 33_600, grandTotal: 273_600,
      dueDate: daysAgo(15), issuedDate: daysAgo(45), currency: 'EGP',
      sellerTRN: '123456789', buyerTRN: '111222333',
      digitalSignatureId: 'sig-002', pdfUrl: '/invoices/INV-2026-0002.pdf', creditNoteIds: [],
    },
    {
      id: 'inv-003', number: 'INV-2026-0003', orderId: 'ord-003', customerId: 'cust-003',
      customerName: 'Nile Development Group', status: 'partially_paid', etaStatus: 'submitted',
      items: [
        { id: 'item-003', productName: 'Aggregate 20mm', productNameAr: 'ركام ٢٠مم', egsCode: 'EGS-2517', uom: 'm3', quantity: 500, unitPrice: 450, lineTotal: 225_000, vatAmount: 31_500 },
        { id: 'item-004', productName: 'Washed Sand', productNameAr: 'رمل مغسول', egsCode: 'EGS-2505', uom: 'm3', quantity: 300, unitPrice: 280, lineTotal: 84_000, vatAmount: 11_760 },
      ],
      subtotal: 309_000, vatAmount: 43_260, grandTotal: 352_260,
      dueDate: daysFromNow(10), issuedDate: daysAgo(20), currency: 'EGP',
      sellerTRN: '123456789', buyerTRN: '444555666',
      digitalSignatureId: null, pdfUrl: '/invoices/INV-2026-0003.pdf', creditNoteIds: [],
    },
  ]
}

export const getInvoices = createServerFn({ method: 'GET' })
  .handler(async () => {
    return { invoices: getMockInvoices() }
  })

const getInvoiceDetailInput = z.object({ invoiceId: z.string() })

export const getInvoiceDetail = createServerFn({ method: 'GET' })
  .inputValidator(getInvoiceDetailInput)
  .handler(async ({ data: input }) => {
    const invoices = getMockInvoices()
    const invoice = invoices.find((i) => i.id === input.invoiceId) ?? invoices[0]

    const payments = [
      { id: 'pay-mock-001', date: daysAgo(5), amount: 100_000, method: 'wire' as const, reference: 'TRF-001' },
    ]

    const timeline = [
      { timestamp: invoice.issuedDate, event: 'Invoice created', user: 'System' },
      { timestamp: daysAgo(1), event: 'Sent to customer via portal', user: 'Ahmed Hassan' },
    ]

    return { invoice, payments, timeline }
  })

const createInvoiceInput = z.object({
  orderId: z.string(),
  lines: z.array(z.object({
    productName: z.string(),
    productNameAr: z.string(),
    egsCode: z.string(),
    uom: z.string(),
    quantity: z.number(),
    unitPrice: z.number(),
  })),
  dueDate: z.string(),
  currency: z.literal('EGP').default('EGP'),
})

export const createInvoice = createServerFn({ method: 'POST' })
  .inputValidator(createInvoiceInput)
  .handler(async ({ data: input }) => {
    const invoiceId = `inv-${Date.now()}`
    const invoiceNumber = `INV-2026-${String(Date.now()).slice(-4)}`

    // Calculate line totals with 14% VAT
    const items = input.lines.map((line, i) => {
      const lineTotal = line.quantity * line.unitPrice
      const vatAmount = Math.round(lineTotal * VAT_RATE * 100) / 100
      return {
        id: `item-${Date.now()}-${i}`,
        productName: line.productName,
        productNameAr: line.productNameAr,
        egsCode: line.egsCode,
        uom: line.uom,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        lineTotal,
        vatAmount,
      }
    })

    const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0)
    const vatAmount = items.reduce((sum, item) => sum + item.vatAmount, 0)
    const grandTotal = subtotal + vatAmount

    return {
      success: true,
      invoiceId,
      invoiceNumber,
      etaInvoiceId: `ETA-${Date.now()}`,
      subtotal,
      vatAmount,
      grandTotal,
      currency: 'EGP',
      items,
      status: 'draft' as const,
      issuedDate: new Date().toISOString().slice(0, 10),
      dueDate: input.dueDate,
    }
  })

const sendInvoiceInput = z.object({
  invoiceId: z.string(),
  channels: z.array(z.enum(['portal', 'email', 'whatsapp', 'print'])),
})

export const sendInvoice = createServerFn({ method: 'POST' })
  .inputValidator(sendInvoiceInput)
  .handler(async ({ data: input }) => {
    return {
      success: true,
      invoiceId: input.invoiceId,
      status: 'sent' as const,
      sentVia: input.channels,
      sentAt: new Date().toISOString(),
    }
  })

const createCreditNoteInput = z.object({
  invoiceId: z.string(),
  reason: z.string(),
  lineItems: z.array(z.object({ itemId: z.string(), amount: z.number() })).optional(),
  amount: z.number().optional(),
})

export const createCreditNote = createServerFn({ method: 'POST' })
  .inputValidator(createCreditNoteInput)
  .handler(async ({ data: input }) => {
    // Reference the original invoice and calculate credit
    const invoices = getMockInvoices()
    const originalInvoice = invoices.find((i) => i.id === input.invoiceId) ?? invoices[0]

    const creditAmount = input.amount
      ?? input.lineItems?.reduce((sum, li) => sum + li.amount, 0)
      ?? originalInvoice.grandTotal

    const vatOnCredit = Math.round(creditAmount * (VAT_RATE / (1 + VAT_RATE)) * 100) / 100
    const netCredit = creditAmount - vatOnCredit

    return {
      success: true,
      creditNoteId: `cn-${Date.now()}`,
      creditNoteNumber: `CN-2026-${String(Date.now()).slice(-4)}`,
      originalInvoiceId: input.invoiceId,
      originalInvoiceNumber: originalInvoice.number,
      creditAmount,
      vatAmount: vatOnCredit,
      netAmount: netCredit,
      reason: input.reason,
      status: 'draft' as const,
      createdAt: new Date().toISOString(),
    }
  })

const batchGenerateInput = z.object({
  deliveryIds: z.array(z.string()),
  invoiceDate: z.string().optional(),
  taxRate: z.number().optional(),
})

export const batchGenerateInvoices = createServerFn({ method: 'POST' })
  .inputValidator(batchGenerateInput)
  .handler(async ({ data: input }) => {
    const invoices = input.deliveryIds.map((id) => ({
      invoiceId: `inv-${id}`,
      number: `INV-2026-${id.slice(-4)}`,
    }))
    return { batchId: `batch-${Date.now()}`, invoices, skipped: [] }
  })

const batchSendInput = z.object({
  invoiceIds: z.array(z.string()),
  channels: z.array(z.enum(['portal', 'email', 'whatsapp', 'print'])),
})

export const batchSendInvoices = createServerFn({ method: 'POST' })
  .inputValidator(batchSendInput)
  .handler(async ({ data: input }) => {
    return {
      success: true,
      batchId: `batch-${Date.now()}`,
      results: input.invoiceIds.map((id) => ({
        invoiceId: id,
        sent: true,
        sentAt: new Date().toISOString(),
        status: 'sent' as const,
      })),
      totalSent: input.invoiceIds.length,
    }
  })

const generateProformaInput = z.object({
  quoteId: z.string().optional(),
  orderId: z.string().optional(),
})

export const generateProformaInvoice = createServerFn({ method: 'POST' })
  .inputValidator(generateProformaInput)
  .handler(async ({ data: _input }) => {
    return { invoiceId: `pro-${Date.now()}`, invoiceNumber: `PRO-2026-0001`, pdfUrl: '/invoices/PRO-2026-0001.pdf' }
  })

const generateProformaPDFInput = z.object({ invoiceId: z.string() })

export const generateProformaPDF = createServerFn({ method: 'GET' })
  .inputValidator(generateProformaPDFInput)
  .handler(async ({ data: _input }) => {
    return { url: '/invoices/proforma-preview.pdf' }
  })
