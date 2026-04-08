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
  .handler(async ({ data: input }) => {
    const disputeId = `disp-${Date.now()}`
    const createdAt = new Date().toISOString()
    // SLA: 7 days from creation
    const slaDeadline = new Date(Date.now() + 7 * 86_400_000).toISOString()

    return {
      success: true,
      disputeId,
      invoiceId: input.invoiceId,
      status: 'open' as const,
      customerFacingStatus: 'under_review',
      createdAt,
      slaDeadline,
      slaHours: 168, // 7 days
    }
  })

const assignDisputeInput = z.object({
  disputeId: z.string(),
  assignedTo: z.string(),
})

export const assignDispute = createServerFn({ method: 'POST' })
  .inputValidator(assignDisputeInput)
  .handler(async ({ data: input }) => {
    return {
      success: true,
      disputeId: input.disputeId,
      assignedTo: input.assignedTo,
      status: 'investigating' as const,
      assignedAt: new Date().toISOString(),
    }
  })

const resolveDisputeInput = z.object({
  disputeId: z.string(),
  resolutionType: z.enum(['credit_note', 'price_adjustment', 'write_off', 'no_action']),
  resolutionNotes: z.string(),
})

export const resolveDispute = createServerFn({ method: 'POST' })
  .inputValidator(resolveDisputeInput)
  .handler(async ({ data: input }) => {
    const customerFacingStatusMap: Record<string, string> = {
      credit_note: 'credit_issued',
      price_adjustment: 'adjusted',
      write_off: 'resolved',
      no_action: 'no_change',
    }
    const customerFacingStatus = customerFacingStatusMap[input.resolutionType] ?? 'resolved'

    return {
      success: true,
      disputeId: input.disputeId,
      status: 'resolved' as const,
      resolutionType: input.resolutionType,
      resolutionNotes: input.resolutionNotes,
      customerFacingStatus,
      resolvedAt: new Date().toISOString(),
      resolvedBy: 'Current User',
    }
  })

const escalateDisputeInput = z.object({
  disputeId: z.string(),
  escalatedTo: z.string(),
  notes: z.string(),
})

export const escalateDispute = createServerFn({ method: 'POST' })
  .inputValidator(escalateDisputeInput)
  .handler(async ({ data: input }) => {
    // Escalation chain: Assigned Agent -> Finance Manager -> Finance Director -> CFO
    const escalationChain = ['Finance Manager', 'Finance Director', 'CFO']
    const currentLevel = escalationChain.indexOf(input.escalatedTo)
    const nextEscalation = currentLevel < escalationChain.length - 1
      ? escalationChain[currentLevel + 1]
      : null

    return {
      success: true,
      disputeId: input.disputeId,
      status: 'escalated' as const,
      escalatedTo: input.escalatedTo,
      escalatedAt: new Date().toISOString(),
      escalationLevel: currentLevel + 1,
      nextEscalation,
      notes: input.notes,
    }
  })
