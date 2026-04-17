import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { db } from '../db/db'

// ─── Server Function ───────────────────────────────────────

const sendQuoteInput = z.object({
	quoteId: z.string(),
	method: z.enum(['portal', 'email', 'both']),
	// Recipient wiring lives on the customer row — the caller tells us
	// which customer contact(s) to treat as primary/cc and the server
	// resolves the actual phone/email against db.customers. Until that
	// contact model is fully fleshed out, recipients is optional and the
	// server falls back to the customer's primary contact.
	recipientIds: z.array(z.string()).optional(),
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

		const quote = db.quotes.updateStatus(data.quoteId, 'sent')
		db.quotes.update(data.quoteId, {
			sentAt,
			sentVia: data.method,
			// Persist the cover note on the quote row so the next reload of
			// the quote builder / preview / negotiation view can read it back.
			...(data.coverNote !== undefined
				? { coverNote: data.coverNote || null }
				: {}),
		})

		// Advance the underlying RFQ into the "quoted" bucket so the RFQ inbox
		// filter and the pipeline view both reflect the real stage. Forward-only
		// — we never walk the RFQ status backwards from a later stage.
		if (quote) {
			const rfq = db.rfqs.get(quote.rfqId)
			const forward = new Set(['quoted', 'negotiating', 'declined', 'expired'])
			if (rfq && !forward.has(rfq.status)) {
				db.rfqs.updateStatus(quote.rfqId, 'quoted')
			}
			// Stamp the living document so the report viewer reflects the send.
			db.orderReports.ensureForRfq(quote.rfqId)
			db.orderReports.appendSection(quote.rfqId, 'evaluated', {
				quoteNumber: quote.quoteNumber,
				sentAt,
				method: data.method,
			})
		}

		return {
			success: true,
			sentAt,
			scheduledAt: data.scheduledAt ?? null,
			method: data.method,
		}
	})
