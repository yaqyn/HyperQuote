import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { db } from '../db/db'

// ─── Server Function ───────────────────────────────────────

const sendQuoteInput = z.object({
  quoteId: z.string(),
  method: z.enum(['portal', 'email', 'both']),
  recipientIds: z.array(z.string()).min(1),
  ccRecipientIds: z.array(z.string()).optional(),
  coverNote: z.string().optional(),
  scheduledAt: z.string().optional(),
})

/**
 * Sending a quote is a status flip + metadata stamp. Anything downstream
 * (activity feed, pipeline, reports) derives from the quote row.
 */
export const sendQuote = createServerFn({ method: 'POST' })
  .inputValidator(sendQuoteInput)
  .handler(async ({ data }) => {
    const isScheduled = !!data.scheduledAt
    const sentAt = isScheduled ? null : new Date().toISOString()

    db.quotes.updateStatus(data.quoteId, 'sent')
    db.quotes.update(data.quoteId, {
      sentAt,
      sentVia: data.method,
    })

    return {
      success: true,
      sentAt,
      scheduledAt: data.scheduledAt ?? null,
      method: data.method,
    }
  })
