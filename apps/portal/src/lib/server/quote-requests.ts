/**
 * Quote request server functions.
 * Submit, save draft, get drafts, and AI-assisted parsing.
 */

import {
	formatQuoteRequestAddress,
	isValidQuoteDeliveryDate,
	QUOTE_DELIVERY_WINDOW_IDS,
	QUOTE_REQUEST_AGREEMENT_VERSION,
} from '@hyperquote/quote-cart/checkout'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import {
	serializeUnavailableItemsError,
	unavailableItemNamesFromError,
} from '../unavailable-quote-items'
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
	items: z.array(quoteRequestItemInputSchema).min(1).max(100),
	deliveryAddressId: z.string().uuid().optional(),
	deliveryLocation: z
		.object({
			area: z.string().trim().max(160),
			city: z.string().trim().min(1).max(160),
			governorate: z.string().trim().min(1).max(160),
			latitude: z.number().min(21.7).max(31.8),
			longitude: z.number().min(24.6).max(36.9),
			street: z.string().trim().min(1).max(500),
		})
		.optional(),
	deliveryDate: z.iso.date().optional(),
	name: z.string().max(120).optional(),
	notes: z.string().max(2000).optional(),
	projectId: z.string().uuid().optional(),
	attachmentUrls: z
		.array(z.string().startsWith('storage://quote-attachments/').max(1024))
		.max(10)
		.optional(),
})

const submitQuoteRequestInput = quoteRequestDraftInput.extend({
	agreementAccepted: z.literal(true).optional(),
	contactEmail: z.string().trim().toLowerCase().email().max(254).optional(),
	contactPhone: z
		.string()
		.regex(/^\+20(10|11|12|15)\d{8}$/)
		.optional(),
	idempotencyKey: z.string().uuid(),
	preferredDeliveryWindow: z.enum(QUOTE_DELIVERY_WINDOW_IDS).optional(),
})

const saveDraftInput = quoteRequestDraftInput
const validateQuoteRequestItemsInput = z.object({
	items: z.array(quoteRequestItemInputSchema).max(100),
})

type PortalCustomerSupabase = Awaited<
	ReturnType<typeof getAuthenticatedPortalCustomer>
>['supabase']
type QuoteRequestItemInput = z.infer<typeof quoteRequestItemInputSchema>
type PortalQuoteSubmitInput = z.infer<typeof submitQuoteRequestInput>

interface GuidedQuoteDetails {
	contactEmail: string
	contactPhone: string
	deliveryLocation: NonNullable<PortalQuoteSubmitInput['deliveryLocation']>
	deliveryDate: string
	preferredDeliveryWindow: (typeof QUOTE_DELIVERY_WINDOW_IDS)[number]
}

interface QuoteRequestUpdate {
	agreement_accepted_at?: string | null
	agreement_version?: string | null
	approval_required?: boolean
	attachment_urls?: string[]
	delivery_address_id?: string | null
	delivery_address_text?: string | null
	delivery_latitude?: number | null
	delivery_longitude?: number | null
	delivery_date?: string | null
	draft_name?: string | null
	idempotency_key?: string
	notes?: string | null
	preferred_delivery_window?: string | null
	project_id?: string | null
	request_contact_email?: string | null
	request_contact_phone?: string | null
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

function guidedQuoteDetailsFrom(
	input: PortalQuoteSubmitInput,
): GuidedQuoteDetails | null {
	const guidedRequest =
		input.agreementAccepted !== undefined ||
		input.contactEmail !== undefined ||
		input.contactPhone !== undefined ||
		input.preferredDeliveryWindow !== undefined
	if (!guidedRequest) return null
	if (
		input.agreementAccepted !== true ||
		!input.contactEmail ||
		!input.contactPhone ||
		!input.deliveryLocation ||
		!input.deliveryDate ||
		!input.preferredDeliveryWindow
	) {
		throw new Error('Guided quote request details are incomplete')
	}
	return {
		contactEmail: input.contactEmail,
		contactPhone: input.contactPhone,
		deliveryLocation: input.deliveryLocation,
		deliveryDate: input.deliveryDate,
		preferredDeliveryWindow: input.preferredDeliveryWindow,
	}
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

async function updateDraftWithItems(
	supabase: PortalCustomerSupabase,
	input: {
		customerId: string
		draftId: string
		items: QuoteRequestItemInput[]
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

	const { error: deleteItemsError } = await supabase
		.from('quote_request_items')
		.delete()
		.eq('quote_request_id', input.draftId)

	if (deleteItemsError) throw new Error(deleteItemsError.message)

	await insertQuoteRequestItems(supabase, input.draftId, input.items)
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
			const { customerId, supabase } = await getAuthenticatedPortalCustomer()
			const guidedDetails = guidedQuoteDetailsFrom(input)
			if (
				guidedDetails &&
				!isValidQuoteDeliveryDate(guidedDetails.deliveryDate)
			) {
				throw new Error('Invalid quote request delivery details')
			}
			await assertQuoteRequestItemsOrderable(supabase, input.items)
			const agreementAcceptedAt = guidedDetails
				? new Date().toISOString()
				: null
			const deliverySnapshot = guidedDetails
				? {
						delivery_address_id: null,
						delivery_address_text: formatQuoteRequestAddress(
							guidedDetails.deliveryLocation,
						),
						delivery_latitude: guidedDetails.deliveryLocation.latitude,
						delivery_longitude: guidedDetails.deliveryLocation.longitude,
					}
				: {}

			const { data: existing } = await supabase
				.from('quote_requests')
				.select('id, request_number, status')
				.eq('customer_id', customerId)
				.eq('idempotency_key', input.idempotencyKey)
				.maybeSingle()

			if (existing) {
				if (existing.status === 'draft') {
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

			if (input.draftId) {
				const draft = await loadEditableDraft(supabase, {
					customerId,
					draftId: input.draftId,
				})
				await updateDraftWithItems(supabase, {
					customerId,
					draftId: input.draftId,
					items: input.items,
					update: {
						...buildDraftMetadataUpdate(input),
						approval_required: false,
						idempotency_key: input.idempotencyKey,
						...(guidedDetails
							? {
									...deliverySnapshot,
									agreement_accepted_at: agreementAcceptedAt,
									agreement_version: QUOTE_REQUEST_AGREEMENT_VERSION,
									preferred_delivery_window:
										guidedDetails.preferredDeliveryWindow,
									request_contact_email: guidedDetails.contactEmail,
									request_contact_phone: guidedDetails.contactPhone,
								}
							: {}),
					},
				})
				await submitCustomerDraft(supabase, input.draftId)

				return {
					requestId: draft.id,
					reference: draft.request_number,
				}
			}

			const { data: qr, error: qrError } = await supabase
				.from('quote_requests')
				.insert({
					agreement_accepted_at: agreementAcceptedAt,
					agreement_version: guidedDetails
						? QUOTE_REQUEST_AGREEMENT_VERSION
						: null,
					approval_required: false,
					attachment_urls: input.attachmentUrls ?? [],
					customer_id: customerId,
					...(guidedDetails
						? deliverySnapshot
						: { delivery_address_id: input.deliveryAddressId ?? null }),
					delivery_date: input.deliveryDate ?? null,
					draft_name: null,
					idempotency_key: input.idempotencyKey,
					notes: normalizeNotes(input.notes),
					preferred_delivery_window:
						guidedDetails?.preferredDeliveryWindow ?? null,
					project_id: input.projectId ?? null,
					request_contact_email: guidedDetails?.contactEmail ?? null,
					request_contact_phone: guidedDetails?.contactPhone ?? null,
					status: 'draft',
					urgency: 'standard',
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
			await assertQuoteRequestItemsOrderable(supabase, input.items)

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
