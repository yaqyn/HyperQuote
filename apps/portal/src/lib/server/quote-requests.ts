/**
 * Quote request server functions.
 * Submit, save draft, get drafts, and AI-assisted parsing.
 */

import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { serializeUnavailableItemsError } from '../unavailable-quote-items'
import { getAuthenticatedPortalCustomer } from './_supabase'
import {
	insertQuoteRequestItems,
	quoteRequestItemInputSchema,
} from './quote-request-items'

// ============================================================================
// Input Schemas
// ============================================================================

const quoteRequestDraftInput = z.object({
	draftId: z.string().uuid().optional(),
	items: z.array(quoteRequestItemInputSchema).min(1),
	deliveryAddressId: z.string().uuid().optional(),
	deliveryDate: z.string().optional(),
	name: z.string().max(120).optional(),
	notes: z.string().optional(),
	projectId: z.string().uuid().optional(),
	attachmentUrls: z.array(z.string()).optional(),
})

const submitQuoteRequestInput = quoteRequestDraftInput.extend({
	approvalRequired: z.boolean().optional(),
	idempotencyKey: z.string().uuid(),
})

const saveDraftInput = quoteRequestDraftInput

interface QuoteRequestUpdate {
	approval_required?: boolean
	attachment_urls?: string[]
	delivery_address_id?: string | null
	delivery_date?: string | null
	draft_name?: string | null
	notes?: string | null
	project_id?: string | null
}

function normalizeDraftName(value: string | undefined): string | null {
	if (value === undefined) return null
	const name = value.trim()
	return name || null
}

function normalizeNotes(value: string | undefined): string | null {
	if (value === undefined) return null
	const notes = value.trim()
	return notes || null
}

function buildDraftMetadataUpdate(input: {
	attachmentUrls?: string[]
	deliveryAddressId?: string
	deliveryDate?: string
	name?: string
	notes?: string
	projectId?: string
}): QuoteRequestUpdate {
	const update: QuoteRequestUpdate = {}

	if (input.projectId !== undefined) {
		update.project_id = input.projectId || null
	}
	if (input.deliveryAddressId !== undefined) {
		update.delivery_address_id = input.deliveryAddressId || null
	}
	if (input.deliveryDate !== undefined) {
		update.delivery_date = input.deliveryDate || null
	}
	if (input.name !== undefined) {
		update.draft_name = normalizeDraftName(input.name)
	}
	if (input.notes !== undefined) {
		update.notes = normalizeNotes(input.notes)
	}
	if (input.attachmentUrls !== undefined) {
		update.attachment_urls = input.attachmentUrls
	}

	return update
}

async function assertQuoteRequestItemsOrderable(
	supabase: Awaited<
		ReturnType<typeof getAuthenticatedPortalCustomer>
	>['supabase'],
	items: z.infer<typeof quoteRequestItemInputSchema>[],
) {
	const productIds = [
		...new Set(
			items.flatMap((item) =>
				item.productId === undefined ? [] : [item.productId],
			),
		),
	]
	if (productIds.length === 0) return

	const { data, error } = await supabase
		.from('products')
		.select('id, is_active, availability_status')
		.in('id', productIds)

	if (error) throw new Error(error.message)

	const orderableIds = new Set(
		(data ?? [])
			.filter(
				(product) =>
					product.is_active &&
					product.availability_status !== 'hidden' &&
					product.availability_status !== 'out_of_stock',
			)
			.map((product) => product.id),
	)
	const unavailableItems = items.flatMap((item) =>
		item.productId && !orderableIds.has(item.productId)
			? [item.customerDescription]
			: [],
	)

	if (unavailableItems.length > 0) {
		throw new Error(serializeUnavailableItemsError(unavailableItems))
	}
}

// ============================================================================
// submitQuoteRequest
// ============================================================================

export const submitQuoteRequest = createServerFn({ method: 'POST' })
	.inputValidator(submitQuoteRequestInput)
	.handler(
		async ({
			data: input,
		}): Promise<{ requestId: string; reference: string }> => {
			const { customerId, session, supabase } =
				await getAuthenticatedPortalCustomer()
			await assertQuoteRequestItemsOrderable(supabase, input.items)

			const { data: existing } = await supabase
				.from('quote_requests')
				.select('id, request_number, status')
				.eq('idempotency_key', input.idempotencyKey)
				.maybeSingle()

			if (existing) {
				if (existing.status === 'draft' && !input.approvalRequired) {
					const { error: submitError } = await supabase.rpc(
						'customer_submit_saved_quote_request',
						{
							p_quote_request_id: existing.id,
							p_source: 'portal',
						},
					)

					if (submitError) throw new Error(submitError.message)
				}

				return {
					requestId: existing.id,
					reference: existing.request_number,
				}
			}

			if (input.draftId && !input.approvalRequired) {
				const { data: draft, error: draftError } = await supabase
					.from('quote_requests')
					.select('id, request_number')
					.eq('id', input.draftId)
					.eq('customer_id', customerId)
					.eq('status', 'draft')
					.maybeSingle()

				if (draftError) throw new Error(draftError.message)
				if (!draft) {
					throw new Error('Draft was not found or is no longer editable')
				}

				const { data: qr, error: qrError } = await supabase
					.from('quote_requests')
					.insert({
						customer_id: customerId,
						status: 'draft',
						urgency: 'standard',
						project_id: input.projectId ?? null,
						delivery_address_id: input.deliveryAddressId ?? null,
						delivery_date: input.deliveryDate ?? null,
						draft_name: null,
						notes: normalizeNotes(input.notes),
						attachment_urls: input.attachmentUrls ?? [],
						idempotency_key: input.idempotencyKey,
						approval_required: false,
					})
					.select('id, request_number')
					.single()

				if (qrError || !qr) {
					throw new Error(qrError?.message ?? 'Failed to create quote request')
				}

				await insertQuoteRequestItems(supabase, qr.id, input.items)

				const { error: submitError } = await supabase.rpc(
					'customer_submit_saved_quote_request',
					{
						p_quote_request_id: qr.id,
						p_source: 'portal',
					},
				)

				if (submitError) throw new Error(submitError.message)

				return {
					requestId: qr.id,
					reference: qr.request_number,
				}
			}

			if (input.draftId) {
				const { data: draft, error: draftError } = await supabase
					.from('quote_requests')
					.select('id, request_number')
					.eq('id', input.draftId)
					.eq('customer_id', customerId)
					.eq('status', 'draft')
					.maybeSingle()

				if (draftError) throw new Error(draftError.message)
				if (!draft) {
					throw new Error('Draft was not found or is no longer editable')
				}

				const draftUpdate: QuoteRequestUpdate = {
					...buildDraftMetadataUpdate(input),
					approval_required: true,
				}
				const { error: updateError } = await supabase
					.from('quote_requests')
					.update(draftUpdate)
					.eq('id', input.draftId)
					.eq('customer_id', customerId)
					.eq('status', 'draft')

				if (updateError) throw new Error(updateError.message)

				const { error: deleteItemsError } = await supabase
					.from('quote_request_items')
					.delete()
					.eq('quote_request_id', input.draftId)

				if (deleteItemsError) throw new Error(deleteItemsError.message)

				await insertQuoteRequestItems(supabase, input.draftId, input.items)

				await supabase.from('approvals').insert({
					approval_type: 'quote_discount',
					entity_type: 'quote_request',
					entity_id: input.draftId,
					requested_by: session.user.id,
					assigned_to: null,
					status: 'pending',
					context: { items_count: input.items.length },
				})

				return {
					requestId: draft.id,
					reference: draft.request_number,
				}
			}

			const { data: qr, error: qrError } = await supabase
				.from('quote_requests')
				.insert({
					customer_id: customerId,
					status: 'draft',
					urgency: 'standard',
					project_id: input.projectId ?? null,
					delivery_address_id: input.deliveryAddressId ?? null,
					delivery_date: input.deliveryDate ?? null,
					draft_name: input.approvalRequired
						? normalizeDraftName(input.name)
						: null,
					notes: normalizeNotes(input.notes),
					attachment_urls: input.attachmentUrls ?? [],
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
					assigned_to: null,
					status: 'pending',
					context: { items_count: input.items.length },
				})
			} else {
				const { error: submitError } = await supabase.rpc(
					'customer_submit_saved_quote_request',
					{
						p_quote_request_id: qr.id,
						p_source: 'portal',
					},
				)

				if (submitError) throw new Error(submitError.message)
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

export const saveDraft = createServerFn({ method: 'POST' })
	.inputValidator(saveDraftInput)
	.handler(
		async ({
			data: input,
		}): Promise<{ draftId: string; reference: string }> => {
			const { customerId, supabase } = await getAuthenticatedPortalCustomer()

			if (input.draftId) {
				const draftUpdate = buildDraftMetadataUpdate(input)
				const draftQuery =
					Object.keys(draftUpdate).length > 0
						? supabase
								.from('quote_requests')
								.update(draftUpdate)
								.eq('id', input.draftId)
								.eq('customer_id', customerId)
								.eq('status', 'draft')
								.select('id, request_number')
								.maybeSingle()
						: supabase
								.from('quote_requests')
								.select('id, request_number')
								.eq('id', input.draftId)
								.eq('customer_id', customerId)
								.eq('status', 'draft')
								.maybeSingle()

				const { data: updatedDraft, error } = await draftQuery

				if (error) throw new Error(error.message)
				if (!updatedDraft) {
					throw new Error('Draft was not found or is no longer editable')
				}

				const { error: deleteItemsError } = await supabase
					.from('quote_request_items')
					.delete()
					.eq('quote_request_id', input.draftId)

				if (deleteItemsError) throw new Error(deleteItemsError.message)

				if (input.items.length > 0) {
					await insertQuoteRequestItems(supabase, input.draftId, input.items)
				}

				const { error: activityError } = await supabase.rpc(
					'customer_record_quote_request_draft_saved',
					{
						p_context: {
							item_count: input.items.length,
							operation: 'update',
						},
						p_quote_request_id: input.draftId,
						p_source: 'portal',
					},
				)

				if (activityError) throw new Error(activityError.message)

				return {
					draftId: updatedDraft.id,
					reference: updatedDraft.request_number,
				}
			}

			const { data: qr, error: qrError } = await supabase
				.from('quote_requests')
				.insert({
					customer_id: customerId,
					status: 'draft',
					draft_name: normalizeDraftName(input.name),
					project_id: input.projectId ?? null,
					delivery_address_id: input.deliveryAddressId ?? null,
					delivery_date: input.deliveryDate ?? null,
					notes: normalizeNotes(input.notes),
					attachment_urls: input.attachmentUrls ?? [],
				})
				.select('id, request_number')
				.single()

			if (qrError || !qr) {
				throw new Error(qrError?.message ?? 'Failed to create draft')
			}

			if (input.items.length > 0) {
				await insertQuoteRequestItems(supabase, qr.id, input.items)
			}

			const { error: activityError } = await supabase.rpc(
				'customer_record_quote_request_draft_saved',
				{
					p_context: {
						item_count: input.items.length,
						operation: 'create',
					},
					p_quote_request_id: qr.id,
					p_source: 'portal',
				},
			)

			if (activityError) throw new Error(activityError.message)

			return { draftId: qr.id, reference: qr.request_number }
		},
	)
