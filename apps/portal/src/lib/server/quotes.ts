/**
 * Quote detail server functions.
 * Get quote detail, accept, reject, counter-offer, partial response.
 */

import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type { Quote, QuoteItem } from '../../types/quote'
import { getAuthenticatedSupabase } from './_supabase'

// ============================================================================
// Input Schemas
// ============================================================================

const getQuoteDetailInput = z.object({
	quoteId: z.string(),
})

const acceptQuoteInput = z.object({
	quoteId: z.string(),
})

const rejectQuoteInput = z.object({
	quoteId: z.string(),
	reason: z
		.enum(['price_too_high', 'found_alternative', 'project_cancelled', 'other'])
		.optional(),
	notes: z.string().optional(),
})

const counterOfferInput = z.object({
	quoteId: z.string(),
	counterType: z.enum(['total', 'per_line']),
	lineItems: z
		.array(
			z.object({
				itemId: z.string(),
				newPrice: z.number().positive(),
				newQuantity: z.number().positive().optional(),
			}),
		)
		.optional(),
	totalDiscount: z.number().min(0).max(100).optional(),
	selfPickup: z.boolean().optional(),
	notes: z.string().optional(),
})

const partialResponseInput = z.object({
	quoteId: z.string(),
	lineResponses: z.array(
		z.object({
			itemId: z.string(),
			decision: z.enum(['accepted', 'rejected', 'negotiate']),
			rejectReason: z
				.enum(['too_expensive', 'not_needed', 'found_alternative', 'other'])
				.optional(),
			negotiatedPrice: z.number().positive().optional(),
		}),
	),
})

// ============================================================================
// getQuoteDetail
// ============================================================================

export const getQuoteDetail = createServerFn()
	.inputValidator(getQuoteDetailInput)
	.handler(async ({ data: input }): Promise<Quote> => {
		const { supabase } = await getAuthenticatedSupabase()

		const { data: quote, error } = await supabase
			.from('quotes')
			.select(
				`
        *,
        quote_items(*),
        quote_versions(*, quote_items(*))
      `,
			)
			.eq('id', input.quoteId)
			.single()

		if (error || !quote) {
			throw new Error(error?.message ?? 'Quote not found')
		}

		const now = new Date()
		const validUntil = new Date(quote.valid_until)
		const daysRemaining = Math.max(
			0,
			Math.ceil((validUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
		)

		const items: QuoteItem[] = (quote.quote_items ?? []).map(
			(item: Record<string, unknown>) => ({
				id: item.id,
				productId: item.product_id,
				productName: item.product_name,
				productNameAr: item.product_name_ar,
				quantity: item.quantity,
				unitOfMeasure: item.unit_of_measure,
				unitOfMeasureAr: item.unit_of_measure_ar ?? item.unit_of_measure,
				unitPrice: item.unit_price,
				lineTotal: item.line_total,
				marginPercent: item.margin_percent,
				customerCounterPrice: item.customer_counter_price,
				lineStatus: item.line_status,
				isAccepted: item.is_accepted,
				sortOrder: item.sort_order,
			}),
		)

		return {
			id: quote.id,
			tenantId: quote.tenant_id,
			quoteNumber: quote.quote_number,
			quoteRequestId: quote.quote_request_id,
			customerId: quote.customer_id,
			projectId: quote.project_id,
			versionNumber: quote.version_number,
			previousVersionId: quote.previous_version_id,
			status: quote.status,
			subtotal: quote.subtotal,
			taxAmount: quote.tax_amount,
			deliveryFee: quote.delivery_fee,
			discountAmount: quote.discount_amount,
			total: quote.total,
			currency: quote.currency ?? 'EGP',
			paymentTerms: quote.payment_terms,
			validityDays: quote.validity_days,
			validUntil: quote.valid_until,
			daysRemaining,
			assignedRepName: quote.assigned_rep_name,
			assignedRepPhone: quote.assigned_rep_phone,
			items,
			versions: [],
			timeline: [],
			createdAt: quote.created_at,
			updatedAt: quote.updated_at,
		}
	})

// ============================================================================
// acceptQuote
// ============================================================================

export const acceptQuote = createServerFn({ method: 'POST' })
	.inputValidator(acceptQuoteInput)
	.handler(
		async ({ data: input }): Promise<{ orderId: string; status: string }> => {
			const { supabase } = await getAuthenticatedSupabase()

			const { data: order, error } = await supabase.rpc(
				'customer_accept_quote',
				{ p_quote_id: input.quoteId },
			)

			if (error || !order) {
				throw new Error(error?.message ?? 'Failed to accept quote')
			}

			return { orderId: order.id, status: order.status }
		},
	)

// ============================================================================
// rejectQuote
// ============================================================================

export const rejectQuote = createServerFn({ method: 'POST' })
	.inputValidator(rejectQuoteInput)
	.handler(async ({ data: input }): Promise<{ success: boolean }> => {
		const { supabase } = await getAuthenticatedSupabase()

		const { error } = await supabase.rpc('customer_decline_quote', {
			p_notes: input.notes ?? null,
			p_quote_id: input.quoteId,
			p_reason: input.reason ?? null,
		})

		if (error) {
			throw new Error(error.message)
		}

		return { success: true }
	})

// ============================================================================
// submitCounterOffer
// ============================================================================

export const submitCounterOffer = createServerFn({ method: 'POST' })
	.inputValidator(counterOfferInput)
	.handler(async ({ data: input }): Promise<{ quoteVersionId: string }> => {
		const { supabase } = await getAuthenticatedSupabase()

		const { data: counter, error } = await supabase.rpc(
			'customer_request_quote_negotiation',
			{
				p_counter_type: input.counterType,
				p_line_items: input.lineItems ?? null,
				p_notes: input.notes ?? null,
				p_quote_id: input.quoteId,
				p_self_pickup: input.selfPickup ?? false,
				p_total_discount: input.totalDiscount ?? null,
			},
		)

		if (error || !counter) {
			throw new Error(error?.message ?? 'Failed to create counter-offer')
		}

		return { quoteVersionId: counter.id }
	})

// ============================================================================
// submitPartialResponse
// ============================================================================

export const submitPartialResponse = createServerFn({ method: 'POST' })
	.inputValidator(partialResponseInput)
	.handler(async ({ data: input }): Promise<{ success: boolean }> => {
		const { supabase } = await getAuthenticatedSupabase()

		const { error } = await supabase.rpc(
			'customer_submit_quote_line_response',
			{
				p_line_responses: input.lineResponses.map((line) => ({
					decision: line.decision,
					item_id: line.itemId,
					negotiated_price: line.negotiatedPrice ?? null,
					reject_reason: line.rejectReason ?? null,
				})),
				p_quote_id: input.quoteId,
			},
		)

		if (error) {
			throw new Error(error.message)
		}

		return { success: true }
	})
