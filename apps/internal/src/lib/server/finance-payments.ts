import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

const recordPaymentInput = z.object({
  invoiceId: z.string(),
  amount: z.number(),
  method: z.enum(['wire', 'cheque', 'lc', 'cash']),
  reference: z.string(),
  date: z.string(),
  bankAccount: z.string().optional(),
})

export const recordPayment = createServerFn({ method: 'POST' })
  .inputValidator(recordPaymentInput)
  .handler(async ({ data: input }) => {
    return {
      paymentId: `pay-${Date.now()}`,
      remainingBalance: 0,
      matchedInvoices: [input.invoiceId],
    }
  })

const batchRecordPaymentsInput = z.object({
  payments: z.array(z.object({
    invoiceId: z.string(),
    amount: z.number(),
    method: z.enum(['wire', 'cheque', 'lc', 'cash']),
    reference: z.string(),
    date: z.string(),
  })),
  sourceType: z.string().optional(),
})

export const batchRecordPayments = createServerFn({ method: 'POST' })
  .inputValidator(batchRecordPaymentsInput)
  .handler(async ({ data: input }) => {
    const payments = input.payments.map((p, i) => ({
      paymentId: `pay-batch-${Date.now()}-${i}`,
      invoiceId: p.invoiceId,
      amount: p.amount,
      remainingBalance: 0,
    }))
    return {
      batchId: `batch-${Date.now()}`,
      payments,
      invoicesFullyPaid: input.payments.map((p) => p.invoiceId),
    }
  })
