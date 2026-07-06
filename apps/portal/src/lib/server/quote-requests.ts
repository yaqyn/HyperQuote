/**
 * Quote request server functions.
 * Submit, save draft, get drafts, and AI-assisted parsing.
 */

import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import {
	serializeUnavailableItemsError,
	unavailableItemNamesFromError,
} from '../unavailable-quote-items'
import { getAuthenticatedPortalCustomer } from './_supabase'
import { quoteRequestItemInputSchema } from './quote-request-items'
import {
	normalizeQuoteRequestLocations,
	type QuoteRequestLocationInput,
	quoteRequestAssociateInputSchema,
	quoteRequestItemsFromLocations,
	quoteRequestLocationInputSchema,
	quoteRequestLocationSummary,
	replaceQuoteRequestLocationsAndItems,
} from './quote-request-locations'

// ============================================================================
// Input Schemas
// ============================================================================

const quoteRequestDraftBaseInput = z.object({
	draftId: z.string().uuid().optional(),
	items: z.array(quoteRequestItemInputSchema).optional(),
	locations: z.array(quoteRequestLocationInputSchema).optional(),
	associates: z.array(quoteRequestAssociateInputSchema).optional(),
	deliveryAddressId: z.string().uuid().optional(),
	deliveryDate: z.string().optional(),
	name: z.string().max(120).optional(),
	notes: z.string().optional(),
	projectId: z.string().uuid().optional(),
	attachmentUrls: z.array(z.string()).optional(),
})

function hasQuoteRequestItems(input: {
	items?: unknown[]
	locations?: { items: unknown[] }[]
}) {
	return (
		(input.items?.length ?? 0) > 0 ||
		(input.locations ?? []).some((location) => location.items.length > 0)
	)
}

const quoteRequestDraftInput = quoteRequestDraftBaseInput.refine(
	(input) => hasQuoteRequestItems(input),
	{ message: 'At least one quote request item is required' },
)

const submitQuoteRequestInput = quoteRequestDraftBaseInput
	.extend({
		approvalRequired: z.boolean().optional(),
		idempotencyKey: z.string().uuid(),
	})
	.refine((input) => hasQuoteRequestItems(input), {
		message: 'At least one quote request item is required',
	})

const saveDraftInput = quoteRequestDraftInput
const validateQuoteRequestItemsInput = z.object({
	items: z.array(quoteRequestItemInputSchema),
})

type PortalCustomerSupabase = Awaited<
	ReturnType<typeof getAuthenticatedPortalCustomer>
>['supabase']
type QuoteRequestItemInput = z.infer<typeof quoteRequestItemInputSchema>

interface QuoteRequestUpdate {
	approval_required?: boolean
	attachment_urls?: string[]
	delivery_address_id?: string | null
	delivery_date?: string | null
	delivery_hour?: number | null
	delivery_period?: 'AM' | 'PM' | null
	draft_name?: string | null
	idempotency_key?: string
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
	deliveryHour?: number
	deliveryPeriod?: 'AM' | 'PM'
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
	if (input.deliveryHour !== undefined) {
		update.delivery_hour = input.deliveryHour || null
	}
	if (input.deliveryPeriod !== undefined) {
		update.delivery_period = input.deliveryPeriod || null
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

function metadataUpdateFromLocations(
	input: Parameters<typeof buildDraftMetadataUpdate>[0] & {
		locations: QuoteRequestLocationInput[]
	},
) {
	const summary = quoteRequestLocationSummary(input.locations)
	return buildDraftMetadataUpdate({
		...input,
		...summary,
	})
}

async function assertQuoteRequestItemsOrderable(
	supabase: PortalCustomerSupabase,
	items: QuoteRequestItemInput[],
) {
	const textOnlyItems = items.flatMap((item) =>
		item.productId ? [] : [item.customerDescription],
	)
	const productIds = [
		...new Set(
			items.flatMap((item) =>
				item.productId === undefined ? [] : [item.productId],
			),
		),
	]

	let orderableIds = new Set<string>()
	if (productIds.length > 0) {
		const { data, error } = await supabase
			.from('products')
			.select('id, is_active, availability_status')
			.in('id', productIds)

		if (error) throw new Error(error.message)

		orderableIds = new Set(
			(data ?? [])
				.filter(
					(product) =>
						product.is_active &&
						product.availability_status !== 'hidden' &&
						product.availability_status !== 'out_of_stock',
				)
				.map((product) => product.id),
		)
	}
	const unavailableItems = [
		...textOnlyItems,
		...items.flatMap((item) =>
			item.productId && !orderableIds.has(item.productId)
				? [item.customerDescription]
				: [],
		),
	]

	if (unavailableItems.length > 0) {
		throw new Error(serializeUnavailableItemsError(unavailableItems))
	}
}

async function loadEditableDraft(
	supabase: PortalCustomerSupabase,
	input: { customerId: string; draftId: string },
): Promise<{ id: string; request_number: string }> {
	const { data: draft, error } = await supabase
		.from('quote_requests')
		.select('id, request_number')
		.eq('id', input.draftId)
		.eq('customer_id', input.customerId)
		.eq('status', 'draft')
		.maybeSingle()

	if (error) throw new Error(error.message)
	if (!draft) throw new Error('Draft was not found or is no longer editable')
	return draft
}

async function updateDraftWithLocations(
	supabase: PortalCustomerSupabase,
	input: {
		customerId: string
		draftId: string
		locations: QuoteRequestLocationInput[]
		associates?: z.infer<typeof quoteRequestAssociateInputSchema>[]
		update: QuoteRequestUpdate
	},
) {
	const { error: updateError } = await supabase
		.from('quote_requests')
		.update(input.update)
		.eq('id', input.draftId)
		.eq('customer_id', input.customerId)
		.eq('status', 'draft')

	if (updateError) throw new Error(updateError.message)

	await replaceQuoteRequestLocationsAndItems(
		supabase,
		input.draftId,
		input.locations,
		input.associates,
	)
}

async function submitCustomerDraft(
	supabase: PortalCustomerSupabase,
	draftId: string,
) {
	const { error } = await supabase.rpc('customer_submit_saved_quote_request', {
		p_quote_request_id: draftId,
		p_source: 'portal',
	})

	if (error) throw new Error(error.message)
}

export const validateQuoteRequestItems = createServerFn({ method: 'POST' })
	.inputValidator(validateQuoteRequestItemsInput)
	.handler(async ({ data: input }): Promise<{ unavailableItems: string[] }> => {
		const { supabase } = await getAuthenticatedPortalCustomer()
		try {
			await assertQuoteRequestItemsOrderable(supabase, input.items)
			return { unavailableItems: [] }
		} catch (error) {
			const unavailableItems = unavailableItemNamesFromError(error)
			if (unavailableItems.length === 0) throw error
			return { unavailableItems }
		}
	})

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
			const locations = normalizeQuoteRequestLocations(input)
			const items = quoteRequestItemsFromLocations(locations)
			const summary = quoteRequestLocationSummary(locations)
			await assertQuoteRequestItemsOrderable(supabase, items)

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
				const draft = await loadEditableDraft(supabase, {
					customerId,
					draftId: input.draftId,
				})
				await updateDraftWithLocations(supabase, {
					customerId,
					draftId: input.draftId,
					locations,
					associates: input.associates,
					update: {
						...metadataUpdateFromLocations({ ...input, locations }),
						approval_required: false,
						idempotency_key: input.idempotencyKey,
					},
				})
				await submitCustomerDraft(supabase, input.draftId)

				return {
					requestId: draft.id,
					reference: draft.request_number,
				}
			}

			if (input.draftId) {
				const draft = await loadEditableDraft(supabase, {
					customerId,
					draftId: input.draftId,
				})
				await updateDraftWithLocations(supabase, {
					customerId,
					draftId: input.draftId,
					locations,
					associates: input.associates,
					update: {
						...metadataUpdateFromLocations({ ...input, locations }),
						approval_required: true,
					},
				})

				await supabase.from('approvals').insert({
					approval_type: 'quote_discount',
					entity_type: 'quote_request',
					entity_id: input.draftId,
					requested_by: session.user.id,
					assigned_to: null,
					status: 'pending',
					context: { items_count: items.length },
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
					delivery_address_id: summary.deliveryAddressId ?? null,
					delivery_date: summary.deliveryDate ?? null,
					delivery_hour: summary.deliveryHour ?? null,
					delivery_period: summary.deliveryPeriod ?? null,
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

			await replaceQuoteRequestLocationsAndItems(
				supabase,
				qr.id,
				locations,
				input.associates,
			)

			if (input.approvalRequired) {
				await supabase.from('approvals').insert({
					approval_type: 'quote_discount',
					entity_type: 'quote_request',
					entity_id: qr.id,
					requested_by: session.user.id,
					assigned_to: null,
					status: 'pending',
					context: { items_count: items.length },
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
			const locations = normalizeQuoteRequestLocations(input)
			const items = quoteRequestItemsFromLocations(locations)
			const summary = quoteRequestLocationSummary(locations)
			await assertQuoteRequestItemsOrderable(supabase, items)

			if (input.draftId) {
				const draftUpdate = metadataUpdateFromLocations({ ...input, locations })
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

				await replaceQuoteRequestLocationsAndItems(
					supabase,
					input.draftId,
					locations,
					input.associates,
				)

				const { error: activityError } = await supabase.rpc(
					'customer_record_quote_request_draft_saved',
					{
						p_context: {
							item_count: items.length,
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
					delivery_address_id: summary.deliveryAddressId ?? null,
					delivery_date: summary.deliveryDate ?? null,
					delivery_hour: summary.deliveryHour ?? null,
					delivery_period: summary.deliveryPeriod ?? null,
					notes: normalizeNotes(input.notes),
					attachment_urls: input.attachmentUrls ?? [],
				})
				.select('id, request_number')
				.single()

			if (qrError || !qr) {
				throw new Error(qrError?.message ?? 'Failed to create draft')
			}

			await replaceQuoteRequestLocationsAndItems(
				supabase,
				qr.id,
				locations,
				input.associates,
			)

			const { error: activityError } = await supabase.rpc(
				'customer_record_quote_request_draft_saved',
				{
					p_context: {
						item_count: items.length,
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
