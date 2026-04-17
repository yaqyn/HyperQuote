/**
 * Quote detail server functions.
 * Get quote detail, accept, reject, counter-offer, partial response.
 * Dev mode fallback when Supabase not configured.
 */

import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type {
	Quote,
	QuoteItem,
	QuoteTimelineStep,
	QuoteVersion,
} from '../../types/quote'
import { getAuthenticatedSupabase, isSupabaseConfigured } from './_supabase'

// ============================================================================
// Mock data for dev mode
// ============================================================================

function getMockQuote(quoteId: string): Quote {
	const now = new Date()
	const validUntil = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000)
	const daysRemaining = 15

	const items: QuoteItem[] = [
		{
			id: crypto.randomUUID(),
			productId: crypto.randomUUID(),
			productName: 'Portland Cement 50kg',
			productNameAr: 'أسمنت بورتلاندي ٥٠ كجم',
			quantity: 500,
			unitOfMeasure: 'bag',
			unitPrice: 85.0,
			lineTotal: 42500.0,
			sortOrder: 1,
			lineStatus: 'quoted',
		},
		{
			id: crypto.randomUUID(),
			productId: crypto.randomUUID(),
			productName: 'Rebar 12mm',
			productNameAr: 'حديد تسليح ١٢ مم',
			quantity: 10,
			unitOfMeasure: 'ton',
			unitPrice: 32500.0,
			lineTotal: 325000.0,
			sortOrder: 2,
			lineStatus: 'quoted',
		},
		{
			id: crypto.randomUUID(),
			productId: crypto.randomUUID(),
			productName: 'Washed Sand',
			productNameAr: 'رمل مغسول',
			quantity: 50,
			unitOfMeasure: 'cubic_meter',
			unitPrice: 450.0,
			lineTotal: 22500.0,
			sortOrder: 3,
			lineStatus: 'quoted',
		},
		{
			id: crypto.randomUUID(),
			productId: crypto.randomUUID(),
			productName: 'Gravel 20mm',
			productNameAr: 'زلط ٢٠ مم',
			quantity: 40,
			unitOfMeasure: 'cubic_meter',
			unitPrice: 380.0,
			lineTotal: 15200.0,
			sortOrder: 4,
			lineStatus: 'quoted',
		},
		{
			id: crypto.randomUUID(),
			productId: crypto.randomUUID(),
			productName: 'Red Bricks',
			productNameAr: 'طوب أحمر',
			quantity: 5,
			unitOfMeasure: 'thousand',
			unitPrice: 2800.0,
			lineTotal: 14000.0,
			sortOrder: 5,
			lineStatus: 'quoted',
		},
		{
			id: crypto.randomUUID(),
			productId: crypto.randomUUID(),
			productName: 'Welded Steel Mesh 6mm',
			productNameAr: 'شبك حديد ملحوم ٦ مم',
			quantity: 20,
			unitOfMeasure: 'sheet',
			unitPrice: 1250.0,
			lineTotal: 25000.0,
			sortOrder: 6,
			lineStatus: 'quoted',
		},
	]

	const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0)
	const deliveryFee = 2500.0
	const taxAmount = Math.round((subtotal + deliveryFee) * 0.14 * 100) / 100
	const total = subtotal + deliveryFee + taxAmount

	const createdAt = new Date(
		now.getTime() - 3 * 24 * 60 * 60 * 1000,
	).toISOString()

	const timeline: QuoteTimelineStep[] = [
		{
			key: 'submitted',
			label: 'Submitted',
			status: 'completed',
			timestamp: createdAt,
		},
		{
			key: 'under_review',
			label: 'Under Review',
			status: 'completed',
			timestamp: new Date(
				now.getTime() - 2.5 * 24 * 60 * 60 * 1000,
			).toISOString(),
		},
		{
			key: 'sourcing',
			label: 'Sourcing',
			status: 'completed',
			timestamp: new Date(
				now.getTime() - 2 * 24 * 60 * 60 * 1000,
			).toISOString(),
		},
		{
			key: 'quote_ready',
			label: 'Quote Ready',
			status: 'completed',
			timestamp: new Date(
				now.getTime() - 1 * 24 * 60 * 60 * 1000,
			).toISOString(),
		},
		{
			key: 'sent',
			label: 'Sent to You',
			status: 'current',
			timestamp: new Date(
				now.getTime() - 0.5 * 24 * 60 * 60 * 1000,
			).toISOString(),
		},
		{
			key: 'accepted_negotiating',
			label: 'Accepted / Negotiating',
			status: 'future',
		},
		{
			key: 'order_confirmed',
			label: 'Order Confirmed',
			status: 'future',
		},
	]

	const v1Items = items.map((item) => ({
		...item,
		id: crypto.randomUUID(),
		unitPrice: item.unitPrice * 1.05,
		lineTotal: Math.round(item.quantity * item.unitPrice * 1.05 * 100) / 100,
	}))
	const v1Subtotal = v1Items.reduce((sum, item) => sum + item.lineTotal, 0)
	const v1Total =
		v1Subtotal +
		deliveryFee +
		Math.round((v1Subtotal + deliveryFee) * 0.14 * 100) / 100

	const versions: QuoteVersion[] = [
		{
			id: crypto.randomUUID(),
			versionNumber: 1,
			createdAt: new Date(
				now.getTime() - 2 * 24 * 60 * 60 * 1000,
			).toISOString(),
			status: 'revised',
			subtotal: v1Subtotal,
			total: v1Total,
			items: v1Items,
			notes: 'Initial quote with preliminary pricing.',
		},
		{
			id: crypto.randomUUID(),
			versionNumber: 2,
			createdAt: new Date(
				now.getTime() - 0.5 * 24 * 60 * 60 * 1000,
			).toISOString(),
			status: 'sent',
			subtotal,
			total,
			items,
			notes: 'Updated pricing from confirmed suppliers.',
		},
	]

	return {
		id: quoteId,
		tenantId: 'tenant-001',
		quoteNumber: 'QT-2026-00142',
		quoteRequestId: crypto.randomUUID(),
		customerId: crypto.randomUUID(),
		versionNumber: 2,
		previousVersionId: versions[0].id,
		status: 'sent',
		subtotal,
		taxAmount,
		deliveryFee,
		discountAmount: 0,
		total,
		currency: 'EGP',
		paymentTerms: 'Net 30 days',
		validityDays: 15,
		validUntil: validUntil.toISOString(),
		daysRemaining,
		assignedRepName: 'Ahmed Hassan',
		assignedRepPhone: '+201012345678',
		items,
		versions,
		timeline,
		createdAt,
		updatedAt: new Date(
			now.getTime() - 0.5 * 24 * 60 * 60 * 1000,
		).toISOString(),
	}
}

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
		if (!isSupabaseConfigured()) {
			return getMockQuote(input.quoteId)
		}

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

export const acceptQuote = createServerFn()
	.inputValidator(acceptQuoteInput)
	.handler(
		async ({ data: input }): Promise<{ orderId: string; status: string }> => {
			if (!isSupabaseConfigured()) {
				return { orderId: crypto.randomUUID(), status: 'confirmed' }
			}

			const { supabase } = await getAuthenticatedSupabase()

			// Update quote status to accepted (only if currently 'sent')
			const { error: updateError } = await supabase
				.from('quotes')
				.update({ status: 'accepted', accepted_at: new Date().toISOString() })
				.eq('id', input.quoteId)
				.eq('status', 'sent')

			if (updateError) {
				throw new Error(updateError.message)
			}

			// The on_quote_accepted() DB trigger creates the order + proforma invoice.
			// Fetch the created order ID.
			const { data: order, error: orderError } = await supabase
				.from('orders')
				.select('id')
				.eq('quote_id', input.quoteId)
				.single()

			if (orderError || !order) {
				// Trigger may not have run yet or may not exist in dev.
				// Return a placeholder -- the order will appear eventually.
				return { orderId: '', status: 'accepted' }
			}

			return { orderId: order.id, status: 'confirmed' }
		},
	)

// ============================================================================
// rejectQuote
// ============================================================================

export const rejectQuote = createServerFn()
	.inputValidator(rejectQuoteInput)
	.handler(async ({ data: input }): Promise<{ success: boolean }> => {
		if (!isSupabaseConfigured()) {
			return { success: true }
		}

		const { supabase } = await getAuthenticatedSupabase()

		const { error } = await supabase
			.from('quotes')
			.update({
				status: 'declined',
				decline_reason: input.reason ?? null,
				decline_notes: input.notes ?? null,
				declined_at: new Date().toISOString(),
			})
			.eq('id', input.quoteId)
			.eq('status', 'sent')

		if (error) {
			throw new Error(error.message)
		}

		return { success: true }
	})

// ============================================================================
// submitCounterOffer
// ============================================================================

export const submitCounterOffer = createServerFn()
	.inputValidator(counterOfferInput)
	.handler(async ({ data: input }): Promise<{ quoteVersionId: string }> => {
		if (!isSupabaseConfigured()) {
			return { quoteVersionId: crypto.randomUUID() }
		}

		const { supabase } = await getAuthenticatedSupabase()

		// Update quote status to negotiating
		const { error: statusError } = await supabase
			.from('quotes')
			.update({ status: 'negotiating' })
			.eq('id', input.quoteId)
			.eq('status', 'sent')

		if (statusError) {
			throw new Error(statusError.message)
		}

		// Insert counter-offer record
		const { data: counter, error: counterError } = await supabase
			.from('quote_counter_offers')
			.insert({
				quote_id: input.quoteId,
				counter_type: input.counterType,
				total_discount: input.totalDiscount ?? null,
				self_pickup: input.selfPickup ?? false,
				notes: input.notes ?? null,
				line_items: input.lineItems ?? null,
			})
			.select('id')
			.single()

		if (counterError || !counter) {
			throw new Error(counterError?.message ?? 'Failed to create counter-offer')
		}

		return { quoteVersionId: counter.id }
	})

// ============================================================================
// submitPartialResponse
// ============================================================================

export const submitPartialResponse = createServerFn()
	.inputValidator(partialResponseInput)
	.handler(async ({ data: input }): Promise<{ success: boolean }> => {
		if (!isSupabaseConfigured()) {
			return { success: true }
		}

		const { supabase } = await getAuthenticatedSupabase()

		// Update quote status to negotiating
		const { error: statusError } = await supabase
			.from('quotes')
			.update({ status: 'negotiating' })
			.eq('id', input.quoteId)
			.eq('status', 'sent')

		if (statusError) {
			throw new Error(statusError.message)
		}

		// Update each line item with the customer's decision
		for (const line of input.lineResponses) {
			const updateData: Record<string, unknown> = {
				line_status: line.decision,
				is_accepted: line.decision === 'accepted',
			}

			if (line.decision === 'rejected' && line.rejectReason) {
				updateData.reject_reason = line.rejectReason
			}

			if (line.decision === 'negotiate' && line.negotiatedPrice) {
				updateData.customer_counter_price = line.negotiatedPrice
			}

			const { error } = await supabase
				.from('quote_items')
				.update(updateData)
				.eq('id', line.itemId)
				.eq('quote_id', input.quoteId)

			if (error) {
				throw new Error(error.message)
			}
		}

		return { success: true }
	})
