import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

const importBankStatementInput = z.object({
  fileUrl: z.string(),
  bankAccountId: z.string(),
})

export const importBankStatement = createServerFn({ method: 'POST' })
  .inputValidator(importBankStatementInput)
  .handler(async ({ data: _input }) => {
    return { transactionCount: 47, autoMatchedCount: 38 }
  })

const reconcileInput = z.object({
  bankAccountId: z.string(),
  entries: z.array(z.object({
    id: z.string(),
    date: z.string(),
    description: z.string(),
    amount: z.number(),
    reference: z.string(),
  })),
})

export const reconcileBankStatement = createServerFn({ method: 'POST' })
  .inputValidator(reconcileInput)
  .handler(async ({ data: input }) => {
    const matchedCount = Math.floor(input.entries.length * 0.8)
    return {
      matched: matchedCount,
      unmatched: input.entries.length - matchedCount,
    }
  })
