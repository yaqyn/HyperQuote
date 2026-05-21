import {
	appendSetCookieHeaders,
	createSupabaseServerClient,
	resolveSupabaseWorkerConfig,
} from '@hyperquote/auth/server'
import { createServerFn } from '@tanstack/react-start'
import { getRequest, getResponse } from '@tanstack/react-start/server'
import { z } from 'zod'
import { logWebsiteServerError } from './server-log'

const UUID_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const quoteRequestItemInput = z.object({
	productId: z.string().optional(),
	customerDescription: z.string().min(1).max(500),
	quantity: z.number().positive(),
	unitOfMeasure: z.string().min(1).max(80),
	unitOfMeasureAr: z.string().min(1).max(80).optional(),
	notes: z.string().max(1000).optional(),
	sortOrder: z.number().int().min(0),
})

const submitWebsiteQuoteInput = z.object({
	draftId: z.string().uuid().optional(),
	items: z.array(quoteRequestItemInput).min(1),
	name: z.string().max(120).optional(),
	notes: z.string().max(2000).optional(),
	idempotencyKey: z.string().uuid(),
})

const saveWebsiteQuoteDraftInput = z.object({
	draftId: z.string().uuid().optional(),
	items: z.array(quoteRequestItemInput).min(1),
	name: z.string().max(120).optional(),
	notes: z.string().max(2000).optional(),
})

const UNAVAILABLE_QUOTE_ITEMS_ERROR = 'unavailable_quote_items:'

function serializeUnavailableItemsError(names: string[]) {
	return `${UNAVAILABLE_QUOTE_ITEMS_ERROR}${JSON.stringify(names)}`
}

function unavailableItemNamesFromError(error: unknown): string[] {
	const message = error instanceof Error ? error.message : ''
	const markerIndex = message.indexOf(UNAVAILABLE_QUOTE_ITEMS_ERROR)
	if (markerIndex < 0) return []

	try {
		const parsed = JSON.parse(
			message.slice(markerIndex + UNAVAILABLE_QUOTE_ITEMS_ERROR.length),
		)
		return Array.isArray(parsed)
			? parsed.filter((item): item is string => typeof item === 'string')
			: []
	} catch {
		return []
	}
}

function normalizeDraftName(value: string | undefined): string | null {
	if (value === undefined) return null
	const name = value.trim()
	return name || null
}

async function getAuthenticatedClient() {
	const config = await resolveSupabaseWorkerConfig(process.env)
	if (!config) return { error: 'not_configured' as const }

	const request = getRequest()
	const { client, responseCookies, responseHeaders } =
		createSupabaseServerClient({
			request,
			...config,
		})

	const {
		data: { user },
	} = await client.auth.getUser()

	if (!user) return { error: 'not_authenticated' as const }

	const { data: customer, error } = await client
		.from('customers')
		.select('id')
		.eq('user_id', user.id)
		.maybeSingle()

	if (error) throw error
	if (!customer) return { error: 'customer_required' as const }

	return {
		client,
		customerId: customer.id,
		responseCookies,
		responseHeaders,
		user,
	}
}

type WebsiteSupabaseClient = Exclude<
	Awaited<ReturnType<typeof getAuthenticatedClient>>,
	{ error: unknown }
>['client']

async function assertQuoteRequestItemsOrderable(
	client: WebsiteSupabaseClient,
	items: z.infer<typeof quoteRequestItemInput>[],
) {
	const productIds = [
		...new Set(
			items.flatMap((item) =>
				item.productId && UUID_RE.test(item.productId) ? [item.productId] : [],
			),
		),
	]
	if (productIds.length === 0) return

	const { data, error } = await client
		.from('products')
		.select('id, is_active, availability_status')
		.in('id', productIds)

	if (error) throw error

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
		item.productId &&
		UUID_RE.test(item.productId) &&
		!orderableIds.has(item.productId)
			? [item.customerDescription]
			: [],
	)

	if (unavailableItems.length > 0) {
		throw new Error(serializeUnavailableItemsError(unavailableItems))
	}
}

export const submitWebsiteQuoteRequest = createServerFn({ method: 'POST' })
	.inputValidator(submitWebsiteQuoteInput)
	.handler(
		async ({
			data: input,
		}): Promise<
			| { success: true; requestId: string; reference: string }
			| {
					success: false
					error:
						| 'not_configured'
						| 'not_authenticated'
						| 'customer_required'
						| 'items_unavailable'
						| 'submit_failed'
					unavailableItems?: string[]
			  }
		> => {
			try {
				const auth = await getAuthenticatedClient()
				if ('error' in auth) {
					return { success: false, error: auth.error ?? 'submit_failed' }
				}
				await assertQuoteRequestItemsOrderable(auth.client, input.items)

				const existing = await auth.client
					.from('quote_requests')
					.select('id, request_number, status')
					.eq('idempotency_key', input.idempotencyKey)
					.maybeSingle()

				if (existing.error) throw existing.error
				if (existing.data) {
					if (existing.data.status === 'draft') {
						const { error: submitError } = await auth.client.rpc(
							'customer_submit_saved_quote_request',
							{
								p_quote_request_id: existing.data.id,
								p_source: 'website',
							},
						)

						if (submitError) throw submitError
					}

					appendSetCookieHeaders(
						getResponse().headers,
						auth.responseCookies.values(),
						auth.responseHeaders.entries(),
					)
					return {
						success: true,
						requestId: existing.data.id,
						reference: existing.data.request_number,
					}
				}

				if (input.draftId) {
					const { data: draft, error: draftError } = await auth.client
						.from('quote_requests')
						.update({
							draft_name: normalizeDraftName(input.name),
							idempotency_key: input.idempotencyKey,
							notes: input.notes ?? null,
						})
						.eq('id', input.draftId)
						.eq('customer_id', auth.customerId)
						.eq('status', 'draft')
						.select('id, request_number')
						.maybeSingle()

					if (draftError || !draft) {
						throw draftError ?? new Error('Quote draft update failed')
					}

					const { error: deleteItemsError } = await auth.client
						.from('quote_request_items')
						.delete()
						.eq('quote_request_id', input.draftId)

					if (deleteItemsError) throw deleteItemsError

					const { error: itemsError } = await auth.client
						.from('quote_request_items')
						.insert(
							input.items.map((item) => ({
								quote_request_id: input.draftId,
								product_id:
									item.productId && UUID_RE.test(item.productId)
										? item.productId
										: null,
								customer_description: item.customerDescription,
								quantity: item.quantity,
								unit_of_measure: item.unitOfMeasure,
								unit_of_measure_ar:
									item.unitOfMeasureAr?.trim() || item.unitOfMeasure,
								notes: item.notes ?? null,
								match_confidence:
									item.productId && UUID_RE.test(item.productId) ? 1 : null,
								sort_order: item.sortOrder,
								is_unmatched: !(item.productId && UUID_RE.test(item.productId)),
							})),
						)

					if (itemsError) throw itemsError

					const { error: submitError } = await auth.client.rpc(
						'customer_submit_saved_quote_request',
						{
							p_quote_request_id: draft.id,
							p_source: 'website',
						},
					)

					if (submitError) throw submitError

					appendSetCookieHeaders(
						getResponse().headers,
						auth.responseCookies.values(),
						auth.responseHeaders.entries(),
					)

					return {
						success: true,
						requestId: draft.id,
						reference: draft.request_number,
					}
				}

				const { data: requestRow, error: requestError } = await auth.client
					.from('quote_requests')
					.insert({
						customer_id: auth.customerId,
						status: 'draft',
						urgency: 'standard',
						draft_name: normalizeDraftName(input.name),
						notes: input.notes ?? null,
						attachment_urls: [],
						idempotency_key: input.idempotencyKey,
						approval_required: false,
					})
					.select('id, request_number')
					.single()

				if (requestError || !requestRow) {
					throw requestError ?? new Error('Quote request insert failed')
				}

				const { error: itemsError } = await auth.client
					.from('quote_request_items')
					.insert(
						input.items.map((item) => ({
							quote_request_id: requestRow.id,
							product_id:
								item.productId && UUID_RE.test(item.productId)
									? item.productId
									: null,
							customer_description: item.customerDescription,
							quantity: item.quantity,
							unit_of_measure: item.unitOfMeasure,
							unit_of_measure_ar:
								item.unitOfMeasureAr?.trim() || item.unitOfMeasure,
							notes: item.notes ?? null,
							match_confidence:
								item.productId && UUID_RE.test(item.productId) ? 1 : null,
							sort_order: item.sortOrder,
							is_unmatched: !(item.productId && UUID_RE.test(item.productId)),
						})),
					)

				if (itemsError) throw itemsError

				const { error: submitError } = await auth.client.rpc(
					'customer_submit_saved_quote_request',
					{
						p_quote_request_id: requestRow.id,
						p_source: 'website',
					},
				)

				if (submitError) throw submitError

				appendSetCookieHeaders(
					getResponse().headers,
					auth.responseCookies.values(),
					auth.responseHeaders.entries(),
				)

				return {
					success: true,
					requestId: requestRow.id,
					reference: requestRow.request_number,
				}
			} catch (error) {
				const unavailableItems = unavailableItemNamesFromError(error)
				if (unavailableItems.length > 0) {
					return {
						success: false,
						error: 'items_unavailable',
						unavailableItems,
					}
				}
				logWebsiteServerError(
					'website.quote_request.submit.unexpected_error',
					error,
				)
				return { success: false, error: 'submit_failed' }
			}
		},
	)

export const saveWebsiteQuoteDraft = createServerFn({ method: 'POST' })
	.inputValidator(saveWebsiteQuoteDraftInput)
	.handler(
		async ({
			data: input,
		}): Promise<
			| { success: true; requestId: string; reference: string }
			| {
					success: false
					error:
						| 'not_configured'
						| 'not_authenticated'
						| 'customer_required'
						| 'save_failed'
			  }
		> => {
			try {
				const auth = await getAuthenticatedClient()
				if ('error' in auth) {
					return { success: false, error: auth.error ?? 'save_failed' }
				}

				if (input.draftId) {
					const { data: updatedDraft, error: updateError } = await auth.client
						.from('quote_requests')
						.update({
							draft_name: normalizeDraftName(input.name),
							notes: input.notes ?? null,
						})
						.eq('id', input.draftId)
						.eq('customer_id', auth.customerId)
						.eq('status', 'draft')
						.select('id, request_number')
						.maybeSingle()

					if (updateError || !updatedDraft) {
						throw updateError ?? new Error('Quote draft update failed')
					}

					const { error: deleteError } = await auth.client
						.from('quote_request_items')
						.delete()
						.eq('quote_request_id', input.draftId)

					if (deleteError) throw deleteError

					const { error: itemsError } = await auth.client
						.from('quote_request_items')
						.insert(
							input.items.map((item) => ({
								quote_request_id: input.draftId,
								product_id:
									item.productId && UUID_RE.test(item.productId)
										? item.productId
										: null,
								customer_description: item.customerDescription,
								quantity: item.quantity,
								unit_of_measure: item.unitOfMeasure,
								unit_of_measure_ar:
									item.unitOfMeasureAr?.trim() || item.unitOfMeasure,
								notes: item.notes ?? null,
								match_confidence:
									item.productId && UUID_RE.test(item.productId) ? 1 : null,
								sort_order: item.sortOrder,
								is_unmatched: !(item.productId && UUID_RE.test(item.productId)),
							})),
						)

					if (itemsError) throw itemsError

					const { error: activityError } = await auth.client.rpc(
						'customer_record_quote_request_draft_saved',
						{
							p_context: {
								item_count: input.items.length,
								operation: 'update',
							},
							p_quote_request_id: updatedDraft.id,
							p_source: 'website',
						},
					)

					if (activityError) throw activityError

					appendSetCookieHeaders(
						getResponse().headers,
						auth.responseCookies.values(),
						auth.responseHeaders.entries(),
					)

					return {
						success: true,
						requestId: updatedDraft.id,
						reference: updatedDraft.request_number,
					}
				}

				const { data: requestRow, error: requestError } = await auth.client
					.from('quote_requests')
					.insert({
						customer_id: auth.customerId,
						status: 'draft',
						urgency: 'standard',
						draft_name: normalizeDraftName(input.name),
						notes: input.notes ?? null,
						attachment_urls: [],
						approval_required: false,
					})
					.select('id, request_number')
					.single()

				if (requestError || !requestRow) {
					throw requestError ?? new Error('Quote draft insert failed')
				}

				const { error: itemsError } = await auth.client
					.from('quote_request_items')
					.insert(
						input.items.map((item) => ({
							quote_request_id: requestRow.id,
							product_id:
								item.productId && UUID_RE.test(item.productId)
									? item.productId
									: null,
							customer_description: item.customerDescription,
							quantity: item.quantity,
							unit_of_measure: item.unitOfMeasure,
							unit_of_measure_ar:
								item.unitOfMeasureAr?.trim() || item.unitOfMeasure,
							notes: item.notes ?? null,
							match_confidence:
								item.productId && UUID_RE.test(item.productId) ? 1 : null,
							sort_order: item.sortOrder,
							is_unmatched: !(item.productId && UUID_RE.test(item.productId)),
						})),
					)

				if (itemsError) throw itemsError

				const { error: activityError } = await auth.client.rpc(
					'customer_record_quote_request_draft_saved',
					{
						p_context: {
							item_count: input.items.length,
							operation: 'create',
						},
						p_quote_request_id: requestRow.id,
						p_source: 'website',
					},
				)

				if (activityError) throw activityError

				appendSetCookieHeaders(
					getResponse().headers,
					auth.responseCookies.values(),
					auth.responseHeaders.entries(),
				)

				return {
					success: true,
					requestId: requestRow.id,
					reference: requestRow.request_number,
				}
			} catch (error) {
				logWebsiteServerError(
					'website.quote_request.save.unexpected_error',
					error,
				)
				return { success: false, error: 'save_failed' }
			}
		},
	)
