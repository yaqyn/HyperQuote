import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

// ─── Server Functions ──────────────────────────────────────

const splitOrderInput = z.object({
  orderId: z.string(),
  splits: z.array(z.object({
    itemIds: z.array(z.string()),
    deliveryDate: z.string(),
  })).min(1),
})

export const splitOrder = createServerFn({ method: 'POST' })
  .inputValidator(splitOrderInput)
  .handler(async ({ data: input }) => {
    const newOrderIds = input.splits.map((_, i) =>
      `ord-split-${Date.now().toString(36)}-${i}`,
    )
    return { newOrderIds }
  })

const holdOrderInput = z.object({
  orderId: z.string(),
  reason: z.string(),
})

export const holdOrder = createServerFn({ method: 'POST' })
  .inputValidator(holdOrderInput)
  .handler(async ({ data: _input }) => {
    return { success: true }
  })

const cancelOrderInput = z.object({
  orderId: z.string(),
  reason: z.string(),
})

export const cancelOrder = createServerFn({ method: 'POST' })
  .inputValidator(cancelOrderInput)
  .handler(async ({ data: _input }) => {
    return { cancellationFee: 0, creditNoteId: 'CN-2026-0001' }
  })

const nudgeHandoffInput = z.object({
  orderId: z.string(),
  targetStage: z.string(),
})

export const nudgeHandoff = createServerFn({ method: 'POST' })
  .inputValidator(nudgeHandoffInput)
  .handler(async ({ data: _input }) => {
    return { success: true, notifiedUser: 'Fatima El-Said' }
  })
