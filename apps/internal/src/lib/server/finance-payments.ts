import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

const recordPaymentInput = z.object({
  invoiceId: z.string(),
  amount: z.number(),
  method: z.enum(['wire', 'cheque', 'lc', 'cash']),
  reference: z.string(),
  date: z.string(),
  bankAccount: z.string().optional(),
  allocations: z.array(z.object({
    invoiceId: z.string(),
    amount: z.number(),
  })).optional(),
  // Cheque-specific fields
  chequeNumber: z.string().optional(),
  maturityDate: z.string().optional(),
  bankName: z.string().optional(),
})

export const recordPayment = createServerFn({ method: 'POST' })
  .inputValidator(recordPaymentInput)
  .handler(async ({ data: input }) => {
    const paymentId = `pay-${Date.now()}`

    // Determine matched invoices from allocations or fallback to primary invoice
    const matchedInvoices = input.allocations?.length
      ? input.allocations.map((a) => a.invoiceId)
      : [input.invoiceId]

    // Calculate remaining balance (mock: assume invoice total is amount * 1.1 for partial scenario)
    const totalAllocated = input.allocations?.reduce((sum, a) => sum + a.amount, 0) ?? input.amount
    const remainingBalance = Math.max(0, input.amount - totalAllocated)

    const result: {
      success: true
      paymentId: string
      matchedInvoices: string[]
      remainingBalance: number
      chequeId?: string
    } = {
      success: true,
      paymentId,
      matchedInvoices,
      remainingBalance,
    }

    // If method is cheque, create a PDC record entry
    if (input.method === 'cheque' && input.chequeNumber) {
      result.chequeId = `chq-${Date.now()}`
    }

    return result
  })

const batchRecordPaymentsInput = z.object({
  payments: z.array(z.object({
    invoiceId: z.string(),
    amount: z.number(),
    method: z.enum(['wire', 'cheque', 'lc', 'cash']),
    reference: z.string(),
    date: z.string(),
    allocations: z.array(z.object({
      invoiceId: z.string(),
      amount: z.number(),
    })).optional(),
    chequeNumber: z.string().optional(),
    maturityDate: z.string().optional(),
    bankName: z.string().optional(),
  })),
  sourceType: z.string().optional(),
})

export const batchRecordPayments = createServerFn({ method: 'POST' })
  .inputValidator(batchRecordPaymentsInput)
  .handler(async ({ data: input }) => {
    const payments = input.payments.map((p, i) => {
      const paymentId = `pay-batch-${Date.now()}-${i}`
      const matchedInvoices = p.allocations?.length
        ? p.allocations.map((a) => a.invoiceId)
        : [p.invoiceId]
      const totalAllocated = p.allocations?.reduce((sum, a) => sum + a.amount, 0) ?? p.amount

      return {
        success: true as const,
        paymentId,
        invoiceId: p.invoiceId,
        amount: p.amount,
        matchedInvoices,
        remainingBalance: Math.max(0, p.amount - totalAllocated),
        chequeId: p.method === 'cheque' && p.chequeNumber ? `chq-batch-${Date.now()}-${i}` : undefined,
      }
    })

    return {
      success: true,
      batchId: `batch-${Date.now()}`,
      payments,
      invoicesFullyPaid: payments.filter((p) => p.remainingBalance === 0).map((p) => p.invoiceId),
      totalRecorded: payments.length,
    }
  })
