/**
 * Quote request server functions.
 * Submit, save draft, get drafts, and AI-assisted parsing.
 * Dev mode fallback when Supabase not configured.
 */

import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { getAuthenticatedSupabase, isSupabaseConfigured } from './_supabase'
import {
	insertQuoteRequestItems,
	quoteRequestItemInputSchema,
} from './quote-request-items'

// ============================================================================
// Input Schemas
// ============================================================================

const submitQuoteRequestInput = z.object({
	items: z.array(quoteRequestItemInputSchema).min(1),
	deliveryAddressId: z.string().uuid().optional(),
	deliveryDate: z.string().optional(),
	notes: z.string().optional(),
	projectId: z.string().uuid().optional(),
	attachmentUrls: z.array(z.string()).optional(),
	approvalRequired: z.boolean().optional(),
	idempotencyKey: z.string().uuid(),
})

const saveDraftInput = z.object({
	draftId: z.string().uuid().optional(),
	items: z.array(quoteRequestItemInputSchema),
	deliveryAddressId: z.string().uuid().optional(),
	deliveryDate: z.string().optional(),
	notes: z.string().optional(),
	projectId: z.string().uuid().optional(),
	attachmentUrls: z.array(z.string()).optional(),
})

// ============================================================================
// submitQuoteRequest
// ============================================================================

export const submitQuoteRequest = createServerFn()
	.inputValidator(submitQuoteRequestInput)
	.handler(
		async ({
			data: input,
		}): Promise<{ requestId: string; reference: string }> => {
			if (!isSupabaseConfigured()) {
				const mockId = crypto.randomUUID()
				const year = new Date().getFullYear()
				const seq = String(Math.floor(Math.random() * 99999)).padStart(5, '0')
				return {
					requestId: mockId,
					reference: `QR-${year}-${seq}`,
				}
			}

			const { supabase, session } = await getAuthenticatedSupabase()

			const { data: existing } = await supabase
				.from('quote_requests')
				.select('id, request_number')
				.eq('idempotency_key', input.idempotencyKey)
				.maybeSingle()

			if (existing) {
				return {
					requestId: existing.id,
					reference: existing.request_number,
				}
			}

			const status = input.approvalRequired ? 'draft' : 'submitted'
			const submittedAt = input.approvalRequired
				? null
				: new Date().toISOString()

			const { data: qr, error: qrError } = await supabase
				.from('quote_requests')
				.insert({
					customer_id: session.user.app_metadata?.customer_id,
					status,
					urgency: 'standard',
					project_id: input.projectId ?? null,
					delivery_address_id: input.deliveryAddressId ?? null,
					delivery_date: input.deliveryDate ?? null,
					notes: input.notes ?? null,
					attachment_urls: input.attachmentUrls ?? [],
					submitted_at: submittedAt,
					submitted_by: session.user.id,
					idempotency_key: input.idempotencyKey,
					approval_required: input.approvalRequired ?? false,
				})
				.select('id, request_number')
				.single()

			if (qrError || !qr) {
				throw new Error(qrError?.message ?? 'Failed to create quote request')
			}

			await insertQuoteRequestItems(supabase, qr.id, input.items)

			if (input.approvalRequired) {
				await supabase.from('approvals').insert({
					approval_type: 'quote_discount',
					entity_type: 'quote_request',
					entity_id: qr.id,
					requested_by: session.user.id,
					assigned_to: session.user.id, // Placeholder; real approver assigned by workflow
					status: 'pending',
					context: { items_count: input.items.length },
				})
			}

			return {
				requestId: qr.id,
				reference: qr.request_number,
			}
		},
	)

// ============================================================================
// saveDraft
// ============================================================================

export const saveDraft = createServerFn()
	.inputValidator(saveDraftInput)
	.handler(async ({ data: input }): Promise<{ draftId: string }> => {
		if (!isSupabaseConfigured()) {
			return { draftId: input.draftId ?? crypto.randomUUID() }
		}

		const { supabase, session } = await getAuthenticatedSupabase()

		if (input.draftId) {
			const { error } = await supabase
				.from('quote_requests')
				.update({
					project_id: input.projectId ?? null,
					delivery_address_id: input.deliveryAddressId ?? null,
					delivery_date: input.deliveryDate ?? null,
					notes: input.notes ?? null,
					attachment_urls: input.attachmentUrls ?? [],
				})
				.eq('id', input.draftId)
				.eq('status', 'draft')

			if (error) throw new Error(error.message)

			await supabase
				.from('quote_request_items')
				.delete()
				.eq('quote_request_id', input.draftId)

			if (input.items.length > 0) {
				await insertQuoteRequestItems(supabase, input.draftId, input.items)
			}

			return { draftId: input.draftId }
		}

		const { data: qr, error: qrError } = await supabase
			.from('quote_requests')
			.insert({
				customer_id: session.user.app_metadata?.customer_id,
				status: 'draft',
				project_id: input.projectId ?? null,
				delivery_address_id: input.deliveryAddressId ?? null,
				delivery_date: input.deliveryDate ?? null,
				notes: input.notes ?? null,
				attachment_urls: input.attachmentUrls ?? [],
			})
			.select('id')
			.single()

		if (qrError || !qr) {
			throw new Error(qrError?.message ?? 'Failed to create draft')
		}

		if (input.items.length > 0) {
			await insertQuoteRequestItems(supabase, qr.id, input.items)
		}

		return { draftId: qr.id }
	})
