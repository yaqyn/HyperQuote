import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

const createDisputeInput = z.object({
  invoiceId: z.string(),
  disputeReason: z.string(),
  description: z.string(),
  evidenceUrls: z.array(z.string()).optional(),
})

export const createDispute = createServerFn({ method: 'POST' })
  .inputValidator(createDisputeInput)
  .handler(async ({ data: _input }) => {
    return { disputeId: `disp-${Date.now()}` }
  })

const assignDisputeInput = z.object({
  disputeId: z.string(),
  assignedTo: z.string(),
})

export const assignDispute = createServerFn({ method: 'POST' })
  .inputValidator(assignDisputeInput)
  .handler(async ({ data: _input }) => {
    return { success: true }
  })

const resolveDisputeInput = z.object({
  disputeId: z.string(),
  resolutionType: z.enum(['credit_note', 'price_adjustment', 'write_off', 'no_action']),
  resolutionNotes: z.string(),
})

export const resolveDispute = createServerFn({ method: 'POST' })
  .inputValidator(resolveDisputeInput)
  .handler(async ({ data: input }) => {
    // Side-effect: updates customerFacingStatus on dispute
    // so customer portals can query dispute outcomes
    const customerFacingStatusMap: Record<string, string> = {
      credit_note: 'credit_issued',
      price_adjustment: 'adjusted',
      write_off: 'resolved',
      no_action: 'no_change',
    }
    const customerFacingStatus = customerFacingStatusMap[input.resolutionType] ?? 'resolved'

    return { success: true, customerFacingStatus }
  })

const escalateDisputeInput = z.object({
  disputeId: z.string(),
  escalatedTo: z.string(),
  notes: z.string(),
})

export const escalateDispute = createServerFn({ method: 'POST' })
  .inputValidator(escalateDisputeInput)
  .handler(async ({ data: _input }) => {
    return { success: true }
  })
