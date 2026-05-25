import { createSupabaseServiceRoleClient } from '@hyperquote/auth/server'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import {
	appendWebsiteAuthCookies,
	getAuthenticatedWebsiteCustomer,
	type WebsiteCustomerSupabaseClient,
} from './customer-auth-context'
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

const validateWebsiteQuoteItemsInput = z.object({
	items: z.array(quoteRequestItemInput),
})

type QuoteRequestItemInput = z.infer<typeof quoteRequestItemInput>

const savedDraftProductRow = z.object({
	availability_status: z.string(),
	category: z.string(),
	id: z.string(),
	image_urls: z.array(z.string()).nullable(),
	is_active: z.boolean(),
	name: z.string(),
	name_ar: z.string().nullable(),
})

const savedDraftItemRow = z.object({
	customer_description: z.string(),
	id: z.string(),
	is_unmatched: z.boolean(),
	notes: z.string().nullable(),
	product_id: z.string().nullable(),
	product_name_ar: z.string(),
	products: z
		.union([savedDraftProductRow, z.array(savedDraftProductRow)])
		.nullable(),
	quantity: z.number(),
	sort_order: z.number(),
	unit_of_measure: z.string(),
	unit_of_measure_ar: z.string(),
})

const savedDraftRow = z.object({
	created_at: z.string(),
	draft_name: z.string().nullable(),
	id: z.string(),
	notes: z.string().nullable(),
	quote_request_items: z.array(savedDraftItemRow).nullable(),
	request_number: z.string(),
	updated_at: z.string(),
})

export interface WebsiteSavedQuoteDraftItem {
	productId?: string
	name: string
	nameAr: string
	category: string
	quantity: number
	unitOfMeasure: string
	unitOfMeasureAr: string
	note?: string
	imageUrl: string | null
	isUnmatched: boolean
	availabilityStatus?: string | null
	isUnavailable: boolean
}

export interface WebsiteSavedQuoteDraft {
	id: string
	reference: string
	name: string | null
	notes: string | null
	date: string
	itemCount: number
	items: WebsiteSavedQuoteDraftItem[]
}

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

function normalizeNotes(value: string | undefined): string | null {
	if (value === undefined) return null
	const notes = value.trim()
	return notes || null
}

function firstRelation<T>(relation: T | T[] | null | undefined): T | null {
	if (Array.isArray(relation)) return relation[0] ?? null
	return relation ?? null
}

function isOrderableCatalogProduct(
	product:
		| {
				availability_status: string
				id: string
				is_active: boolean
		  }
		| null
		| undefined,
) {
	return Boolean(
		product?.id &&
			product.is_active &&
			product.availability_status !== 'hidden' &&
			product.availability_status !== 'out_of_stock',
	)
}

function mapSavedDraftRow(
	row: z.infer<typeof savedDraftRow>,
): WebsiteSavedQuoteDraft {
	const items = (row.quote_request_items ?? [])
		.slice()
		.sort((a, b) => a.sort_order - b.sort_order)
		.map((item): WebsiteSavedQuoteDraftItem => {
			const product = firstRelation(item.products)
			const catalogProductId = item.product_id ?? product?.id ?? undefined
			const isUnavailable =
				item.is_unmatched ||
				!catalogProductId ||
				!isOrderableCatalogProduct(product)
			const imageUrl = product?.image_urls?.[0] ?? null
			return {
				productId: isUnavailable ? undefined : catalogProductId,
				name: item.customer_description || product?.name || item.id,
				nameAr:
					item.product_name_ar ||
					product?.name_ar ||
					item.customer_description ||
					item.id,
				category:
					product?.category ?? (item.is_unmatched ? 'unmatched' : 'material'),
				quantity: item.quantity,
				unitOfMeasure: item.unit_of_measure,
				unitOfMeasureAr: item.unit_of_measure_ar || item.unit_of_measure,
				note: item.notes ?? undefined,
				imageUrl,
				isUnmatched: item.is_unmatched,
				availabilityStatus: product?.availability_status ?? null,
				isUnavailable,
			}
		})

	return {
		id: row.id,
		reference: row.request_number,
		name: row.draft_name,
		notes: row.notes,
		date: row.updated_at || row.created_at,
		itemCount: items.length,
		items,
	}
}

function validProductId(productId: string | undefined): string | null {
	return productId && UUID_RE.test(productId) ? productId : null
}

function quoteRequestItemRows(
	quoteRequestId: string,
	items: QuoteRequestItemInput[],
) {
	return items.map((item) => {
		const productId = validProductId(item.productId)
		return {
			quote_request_id: quoteRequestId,
			product_id: productId,
			customer_description: item.customerDescription,
			quantity: item.quantity,
			unit_of_measure: item.unitOfMeasure,
			unit_of_measure_ar: item.unitOfMeasureAr?.trim() || item.unitOfMeasure,
			notes: item.notes ?? null,
			match_confidence: productId ? 1 : null,
			sort_order: item.sortOrder,
			is_unmatched: !productId,
		}
	})
}

async function replaceQuoteRequestItems(
	client: WebsiteCustomerSupabaseClient,
	quoteRequestId: string,
	items: QuoteRequestItemInput[],
) {
	const { error: deleteError } = await client
		.from('quote_request_items')
		.delete()
		.eq('quote_request_id', quoteRequestId)

	if (deleteError) throw deleteError

	await insertQuoteRequestItems(client, quoteRequestId, items)
}

async function insertQuoteRequestItems(
	client: WebsiteCustomerSupabaseClient,
	quoteRequestId: string,
	items: QuoteRequestItemInput[],
) {
	await assertQuoteRequestItemsOrderable(client, items)
	const { error } = await client
		.from('quote_request_items')
		.insert(quoteRequestItemRows(quoteRequestId, items))

	if (error) throw error
}

export const getWebsiteSavedQuoteDrafts = createServerFn({
	method: 'GET',
}).handler(
	async (): Promise<
		| { success: true; drafts: WebsiteSavedQuoteDraft[] }
		| {
				success: false
				error:
					| 'not_configured'
					| 'not_authenticated'
					| 'customer_required'
					| 'load_failed'
		  }
	> => {
		try {
			const auth = await getAuthenticatedWebsiteCustomer()
			if ('error' in auth) {
				return { success: false, error: auth.error ?? 'load_failed' }
			}

			const { data, error } = await auth.client
				.from('quote_requests')
				.select(`
					id,
					request_number,
					draft_name,
					notes,
					created_at,
					updated_at,
					quote_request_items (
						id,
						product_id,
						customer_description,
						product_name_ar,
						quantity,
						unit_of_measure,
						unit_of_measure_ar,
						notes,
						sort_order,
						is_unmatched,
						products (
							id,
							category,
							name,
							name_ar,
							image_urls,
							is_active,
							availability_status
						)
					)
				`)
				.eq('customer_id', auth.customerId)
				.eq('status', 'draft')
				.order('updated_at', { ascending: false })

			if (error) throw error

			const rows = savedDraftRow.array().parse(data ?? [])
			await appendWebsiteAuthCookies(auth)

			return {
				success: true,
				drafts: rows.map(mapSavedDraftRow),
			}
		} catch (error) {
			logWebsiteServerError(
				'website.quote_request.saved_drafts.unexpected_error',
				error,
			)
			return { success: false, error: 'load_failed' }
		}
	},
)

async function assertQuoteRequestItemsOrderable(
	client: WebsiteCustomerSupabaseClient,
	items: z.infer<typeof quoteRequestItemInput>[],
) {
	const textOnlyItems = items.flatMap((item) =>
		validProductId(item.productId) ? [] : [item.customerDescription],
	)
	const productIds = [
		...new Set(
			items.flatMap((item) => {
				const productId = validProductId(item.productId)
				return productId ? [productId] : []
			}),
		),
	]

	let orderableIds = new Set<string>()
	if (productIds.length > 0) {
		const { data, error } = await client
			.from('products')
			.select('id, is_active, availability_status')
			.in('id', productIds)

		if (error) throw error

		orderableIds = new Set(
			(data ?? [])
				.filter(isOrderableCatalogProduct)
				.map((product) => product.id),
		)
	}
	const unavailableItems = [
		...textOnlyItems,
		...items.flatMap((item) => {
			const productId = validProductId(item.productId)
			return productId && !orderableIds.has(productId)
				? [item.customerDescription]
				: []
		}),
	]

	if (unavailableItems.length > 0) {
		throw new Error(serializeUnavailableItemsError(unavailableItems))
	}
}

export const validateWebsiteQuoteItems = createServerFn({ method: 'POST' })
	.inputValidator(validateWebsiteQuoteItemsInput)
	.handler(async ({ data: input }): Promise<{ unavailableItems: string[] }> => {
		const client = await createSupabaseServiceRoleClient(process.env)
		if (!client) throw new Error('Website quote validation is not configured')

		try {
			await assertQuoteRequestItemsOrderable(client, input.items)
			return { unavailableItems: [] }
		} catch (error) {
			const unavailableItems = unavailableItemNamesFromError(error)
			if (unavailableItems.length === 0) throw error
			return { unavailableItems }
		}
	})

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
				const auth = await getAuthenticatedWebsiteCustomer()
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

					await appendWebsiteAuthCookies(auth)
					return {
						success: true,
						requestId: existing.data.id,
						reference: existing.data.request_number,
					}
				}

				if (input.draftId) {
					const { data: sourceDraft, error: sourceDraftError } =
						await auth.client
							.from('quote_requests')
							.select('id, request_number')
							.eq('id', input.draftId)
							.eq('customer_id', auth.customerId)
							.eq('status', 'draft')
							.maybeSingle()

					if (sourceDraftError || !sourceDraft) {
						throw sourceDraftError ?? new Error('Quote draft was not found')
					}

					const draftSubmitUpdate = {
						approval_required: false,
						idempotency_key: input.idempotencyKey,
						...(input.notes === undefined
							? {}
							: { notes: normalizeNotes(input.notes) }),
					}
					const { error: updateDraftError } = await auth.client
						.from('quote_requests')
						.update(draftSubmitUpdate)
						.eq('id', sourceDraft.id)
						.eq('customer_id', auth.customerId)
						.eq('status', 'draft')

					if (updateDraftError) throw updateDraftError

					const { error: deleteItemsError } = await auth.client
						.from('quote_request_items')
						.delete()
						.eq('quote_request_id', sourceDraft.id)

					if (deleteItemsError) throw deleteItemsError

					await insertQuoteRequestItems(
						auth.client,
						sourceDraft.id,
						input.items,
					)

					const { error: submitError } = await auth.client.rpc(
						'customer_submit_saved_quote_request',
						{
							p_quote_request_id: sourceDraft.id,
							p_source: 'website',
						},
					)

					if (submitError) throw submitError

					await appendWebsiteAuthCookies(auth)

					return {
						success: true,
						requestId: sourceDraft.id,
						reference: sourceDraft.request_number,
					}
				}

				const { data: requestRow, error: requestError } = await auth.client
					.from('quote_requests')
					.insert({
						customer_id: auth.customerId,
						status: 'draft',
						urgency: 'standard',
						draft_name: null,
						notes: normalizeNotes(input.notes),
						attachment_urls: [],
						idempotency_key: input.idempotencyKey,
						approval_required: false,
					})
					.select('id, request_number')
					.single()

				if (requestError || !requestRow) {
					throw requestError ?? new Error('Quote request insert failed')
				}

				await insertQuoteRequestItems(auth.client, requestRow.id, input.items)

				const { error: submitError } = await auth.client.rpc(
					'customer_submit_saved_quote_request',
					{
						p_quote_request_id: requestRow.id,
						p_source: 'website',
					},
				)

				if (submitError) throw submitError

				await appendWebsiteAuthCookies(auth)

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
						| 'items_unavailable'
						| 'save_failed'
					unavailableItems?: string[]
			  }
		> => {
			try {
				const auth = await getAuthenticatedWebsiteCustomer()
				if ('error' in auth) {
					return { success: false, error: auth.error ?? 'save_failed' }
				}
				await assertQuoteRequestItemsOrderable(auth.client, input.items)

				if (input.draftId) {
					const { data: updatedDraft, error: updateError } = await auth.client
						.from('quote_requests')
						.update({
							draft_name: normalizeDraftName(input.name),
							notes: normalizeNotes(input.notes),
						})
						.eq('id', input.draftId)
						.eq('customer_id', auth.customerId)
						.eq('status', 'draft')
						.select('id, request_number')
						.maybeSingle()

					if (updateError || !updatedDraft) {
						throw updateError ?? new Error('Quote draft update failed')
					}

					await replaceQuoteRequestItems(
						auth.client,
						input.draftId,
						input.items,
					)

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

					if (activityError) {
						logWebsiteServerError(
							'website.quote_request.save.unexpected_error',
							activityError,
						)
					}

					await appendWebsiteAuthCookies(auth)

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
						notes: normalizeNotes(input.notes),
						attachment_urls: [],
						approval_required: false,
					})
					.select('id, request_number')
					.single()

				if (requestError || !requestRow) {
					throw requestError ?? new Error('Quote draft insert failed')
				}

				await insertQuoteRequestItems(auth.client, requestRow.id, input.items)

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

				if (activityError) {
					logWebsiteServerError(
						'website.quote_request.save.unexpected_error',
						activityError,
					)
				}

				await appendWebsiteAuthCookies(auth)

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
					'website.quote_request.save.unexpected_error',
					error,
				)
				return { success: false, error: 'save_failed' }
			}
		},
	)
