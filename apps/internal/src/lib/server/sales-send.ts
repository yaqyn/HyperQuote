import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

function isSupabaseConfigured(): boolean {
  return !!import.meta.env.VITE_SUPABASE_URL
}

// ─── Server Function ───────────────────────────────────────

const sendQuoteInput = z.object({
  quoteId: z.string(),
  method: z.enum(['portal', 'email', 'both']),
  recipientIds: z.array(z.string()).min(1),
  ccRecipientIds: z.array(z.string()).optional(),
  coverNote: z.string().optional(),
  scheduledAt: z.string().optional(), // ISO date string for scheduled send
})

export const sendQuote = createServerFn({ method: 'POST' })
  .inputValidator(sendQuoteInput)
  .handler(async ({ data: input }) => {
    if (!isSupabaseConfigured()) {
      const isScheduled = !!input.scheduledAt

      return {
        success: true,
        sentAt: isScheduled ? null : new Date().toISOString(),
        scheduledAt: input.scheduledAt ?? null,
        method: input.method,
        // Upon sending:
        // - status -> "Sent"
        // - soft reservation created
        // - activity logged
        // - follow-up auto-scheduled (3 days)
        // - WhatsApp + email notification to customer
      }
    }

    // TODO: Real implementation:
    // 1. Update quotes.status to 'sent' via validate_state_transition
    // 2. Set quotes.sent_at = NOW() (or quotes.scheduled_send_at if scheduled)
    // 3. Set quotes.sent_via = input.method
    // 4. Create soft reservation in inventory (reservation_type: 'soft')
    // 5. Log activity event
    // 6. Schedule follow-up notification at +3 days
    // 7. Send notification via selected method:
    //    - 'portal': Create notification in notifications table
    //    - 'email': Queue email via email service (Phase 27)
    //    - 'both': Both of the above
    // 8. If scheduledAt: create scheduled job instead of immediate send
    return {
      success: true,
      sentAt: null,
      scheduledAt: input.scheduledAt ?? null,
      method: input.method,
    }
  })
