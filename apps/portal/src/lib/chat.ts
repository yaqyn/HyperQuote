/**
 * Portal AI chat server function.
 *
 * Two answer paths:
 *   1. Groq — when GROQ_API_KEY is configured and USE_AI is not disabled.
 *   2. Deterministic account/catalog summaries built from Supabase context.
 *
 * Rich content (product / status / action cards) is keyword-matched on the
 * last user message and appended after the assistant's text — the LLM does
 * not emit tool calls yet, so the deterministic card rules still apply.
 */

import { isAIEnabled, LYON_PORTAL, streamChat } from '@hyperquote/ai'
import type { StreamChunk } from '@tanstack/ai'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { getAuthenticatedPortalCustomer } from './server/_supabase'
import { insertQuoteRequestItems } from './server/quote-request-items'

// ============================================================================
// Input Schema
// ============================================================================

const portalChatInput = z.object({
	messages: z.array(
		z.object({
			role: z.enum(['user', 'assistant']),
			content: z.string(),
		}),
	),
	role: z.enum(['customer', 'supplier']),
	conversationId: z.string().nullable(),
})

interface PortalAiProduct {
	id: string
	name: string
	name_ar: string | null
	slug: string
	category: string
	unit_of_measure: string
	unit_of_measure_ar: string
	price_range_min: number | null
	price_range_max: number | null
	specifications: Record<string, unknown> | null
	specifications_ar: Record<string, unknown> | null
	image_urls: string[] | null
	availability_status: string
}

interface PortalAiOrder {
	id: string
	order_number: string
	status: string
	created_at: string
	delivered_at: string | null
	total_amount: number | null
}

interface PortalAiDraft {
	id: string
	reference: string
	editRoute: string
	items: Array<{
		name: string
		nameAr: string
		qty: number
		unit: string
		unitAr: string
	}>
}

interface PortalAiContext {
	customerId: string
	draft: PortalAiDraft | null
	latestOrder: PortalAiOrder | null
	product: PortalAiProduct | null
}

// ============================================================================
// Deterministic scoped responses — differentiated by customer vs supplier role
// ============================================================================

const CUSTOMER_RESPONSES: Record<string, string> = {
	default:
		"I'm HyperQuote's assistant. I can help you find building materials, get quotes, and track orders. What are you looking for today?",
	cement:
		'We carry a full range of cement products including Portland CEM I 42.5N, CEM II, and specialty cements. Here are some options:',
	rebar:
		'We have high-quality steel rebar available in various grades. Here is a popular option:',
	quote:
		"I'd be happy to help you start a quote request! You can add items to your material list below:",
	order: 'Let me check the status of your most recent order:',
	track: 'Let me look up your latest delivery status:',
	price:
		"Prices depend on quantity, delivery location, and current market conditions. Request a quote and we'll source pricing from multiple suppliers for you.",
	help: 'Here are some things I can help you with:',
}

const SUPPLIER_RESPONSES: Record<string, string> = {
	default:
		'Welcome to the Supplier Portal. I can help you manage stock, check PO status, and update pricing. What do you need?',
	cement:
		'Here is the current stock status for cement products in your catalog:',
	rebar: 'Here is the current stock status for rebar products:',
	order: 'Let me pull up the latest purchase order status:',
	track: 'Checking the status of your recent purchase orders:',
	price:
		'You can update your pricing through the catalog management window. Would you like me to open it?',
	help: 'Here are the key actions available to you:',
	stock: 'Let me check your current stock levels:',
}

function getResponse(
	userMessage: string,
	role: 'customer' | 'supplier',
	context?: PortalAiContext,
): string {
	const lower = userMessage.toLowerCase()
	const responses =
		role === 'customer' ? CUSTOMER_RESPONSES : SUPPLIER_RESPONSES

	const refusal = portalPolicyRefusal(userMessage)
	if (refusal) return refusal

	if (hasDraftIntent(userMessage)) {
		if (context?.draft) {
			return `I created draft ${context.draft.reference} with the material list below. Review it in Orders before submitting; nothing was submitted.`
		}
		if (context?.product) {
			return 'I found a published product, but I could not create a review draft. Please try again from Market or Orders.'
		}
		return 'I can create a review draft after we pick a published product. Ask for cement, rebar, or another catalog material.'
	}
	if (hasEstimateIntent(userMessage) && context?.product) {
		return `For a first estimate, start with ${context.product.name} as the base material, then adjust quantity in the draft before submitting.`
	}
	if (
		lower.includes('cement') ||
		lower.includes('\u0627\u0633\u0645\u0646\u062a')
	)
		return context?.product
			? `I found ${context.product.name} in the published catalog. Review the product card below, then add it from Market or Orders when you are ready.`
			: 'I could not find a matching published product in the catalog.'
	if (lower.includes('rebar') || lower.includes('\u062d\u062f\u064a\u062f'))
		return context?.product
			? `I found ${context.product.name} in the published catalog. Review the product card below, then add it from Market or Orders when you are ready.`
			: 'I could not find a matching published product in the catalog.'
	if (lower.includes('/quote') || lower.includes('quote'))
		return 'I can draft a material list for review, but I will not submit anything. Use the normal order form to confirm and submit.'
	if (
		lower.includes('order') ||
		lower.includes('\u0637\u0644\u0628') ||
		lower.includes('track') ||
		lower.includes('/track')
	)
		return context?.latestOrder
			? `Your latest visible order is ${context.latestOrder.order_number}, currently ${context.latestOrder.status.replace(/_/g, ' ')}.`
			: 'I do not see a submitted order in your customer account yet.'
	if (lower.includes('/price') || lower.includes('price'))
		return responses.price ?? responses.default
	if (lower.includes('/help') || lower.includes('help'))
		return responses.help ?? responses.default
	if (
		lower.includes('stock') ||
		lower.includes('\u0645\u062e\u0632\u0648\u0646')
	)
		return responses.stock ?? responses.default
	return responses.default
}

// ============================================================================
// Rich message generators — CUSTOM events based on keyword detection
// ============================================================================

function getRichEvents(
	userMessage: string,
	role: 'customer' | 'supplier',
	context?: PortalAiContext,
): StreamChunk[] {
	const lower = userMessage.toLowerCase()
	const events: StreamChunk[] = []

	if (
		lower.includes('cement') ||
		lower.includes('\u0627\u0633\u0645\u0646\u062a')
	) {
		const product = context?.product
		if (product) events.push(productCardEvent(product))
	}

	if (lower.includes('rebar') || lower.includes('\u062d\u062f\u064a\u062f')) {
		const product = context?.product
		if (product) events.push(productCardEvent(product))
	}

	if (context?.draft) {
		events.push({
			type: 'CUSTOM' as const,
			timestamp: Date.now(),
			name: 'rich_message',
			value: {
				type: 'material_list',
				data: {
					draftId: context.draft.id,
					editRoute: context.draft.editRoute,
					items: context.draft.items,
					reference: context.draft.reference,
				},
			},
		})
	}

	if (
		lower.includes('order') ||
		lower.includes('\u0637\u0644\u0628') ||
		lower.includes('track') ||
		lower.includes('/track')
	) {
		const latestOrder = context?.latestOrder
		if (latestOrder) events.push(statusCardEvent(latestOrder))
	}

	if (lower.includes('/quote') && !context?.draft) {
		events.push({
			type: 'CUSTOM' as const,
			timestamp: Date.now(),
			name: 'rich_message',
			value: {
				type: 'material_list',
				data: {
					items: [],
				},
			},
		})
	}

	if (lower.includes('/help')) {
		const customerActions = [
			{
				label: 'Browse Market',
				labelAr: '\u062a\u0635\u0641\u062d \u0627\u0644\u0633\u0648\u0642',
				route: '/portal/market',
			},
			{
				label: 'View Orders',
				labelAr:
					'\u0639\u0631\u0636 \u0627\u0644\u0637\u0644\u0628\u0627\u062a',
				route: '/portal/orders',
			},
			{
				label: 'Get Support',
				labelAr:
					'\u0627\u0644\u062d\u0635\u0648\u0644 \u0639\u0644\u0649 \u0627\u0644\u062f\u0639\u0645',
				route: '/portal/support',
			},
		]
		const supplierActions = [
			{
				label: 'Manage Catalog',
				labelAr:
					'\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0643\u062a\u0627\u0644\u0648\u062c',
				route: '/portal/catalog',
			},
			{
				label: 'View Purchase Orders',
				labelAr:
					'\u0639\u0631\u0636 \u0623\u0648\u0627\u0645\u0631 \u0627\u0644\u0634\u0631\u0627\u0621',
				route: '/portal/purchase-orders',
			},
			{
				label: 'Update Stock',
				labelAr:
					'\u062a\u062d\u062f\u064a\u062b \u0627\u0644\u0645\u062e\u0632\u0648\u0646',
				route: '/portal/stock',
			},
		]
		const actions = role === 'customer' ? customerActions : supplierActions
		for (const action of actions) {
			events.push({
				type: 'CUSTOM' as const,
				timestamp: Date.now(),
				name: 'rich_message',
				value: {
					type: 'action_button',
					data: action,
				},
			})
		}
	}

	return events
}

// ============================================================================
// Supabase-scoped AG-UI stream generator
// ============================================================================

async function* scopedPortalStream(
	userMessage: string,
	role: 'customer' | 'supplier',
	context?: PortalAiContext,
): AsyncGenerator<StreamChunk> {
	const runId = crypto.randomUUID()
	const messageId = crypto.randomUUID()

	// RUN_STARTED
	yield {
		type: 'RUN_STARTED' as const,
		timestamp: Date.now(),
		runId,
	}

	// TEXT_MESSAGE_START
	yield {
		type: 'TEXT_MESSAGE_START' as const,
		timestamp: Date.now(),
		messageId,
		role: 'assistant' as const,
	}

	// TEXT_MESSAGE_CONTENT -- token-by-token streaming
	const response = getResponse(userMessage, role, context)
	const words = response.split(' ')
	for (const word of words) {
		yield {
			type: 'TEXT_MESSAGE_CONTENT' as const,
			timestamp: Date.now(),
			messageId,
			delta: `${word} `,
		}
		await new Promise((r) => setTimeout(r, 50 + Math.random() * 50))
	}

	// TEXT_MESSAGE_END
	yield {
		type: 'TEXT_MESSAGE_END' as const,
		timestamp: Date.now(),
		messageId,
	}

	// CUSTOM events for rich messages (after text completes)
	const richEvents = getRichEvents(userMessage, role, context)
	for (const event of richEvents) {
		yield event
	}

	// RUN_FINISHED
	yield {
		type: 'RUN_FINISHED' as const,
		timestamp: Date.now(),
		runId,
		finishReason: 'stop' as const,
	}
}

// ============================================================================
// portalChatFn — Server function returning AG-UI StreamChunk[].
// The ReadableStream variant drops chunks through TanStack Start's RPC; the
// array pattern serializes cleanly. Once that upstream bug is fixed we can
// switch back for true token-at-a-time streaming.
// ============================================================================

export const portalChatFn = createServerFn({ method: 'POST' })
	.inputValidator(portalChatInput)
	.handler(async ({ data: input }) => {
		const lastMessage = input.messages[input.messages.length - 1]
		const userText = lastMessage?.content ?? ''
		const { customerId, supabase } = await getAuthenticatedPortalCustomer()
		const context = await loadPortalAiContext(supabase, customerId, userText)
		if (!portalPolicyRefusal(userText) && hasDraftIntent(userText)) {
			context.draft = await createPortalAiDraft(
				supabase,
				customerId,
				userText,
				context.product,
			)
		}
		const chunks: StreamChunk[] = []
		const refusal = portalPolicyRefusal(userText)

		if (refusal) {
			for await (const chunk of textOnlyStream(refusal)) {
				chunks.push(chunk)
			}
		} else if (usesScopedPortalContext(userText)) {
			for await (const chunk of scopedPortalStream(
				userText,
				input.role,
				context,
			)) {
				chunks.push(chunk)
			}
		} else if (isAIEnabled()) {
			// Hold RUN_FINISHED until rich events have been appended.
			let finishChunk: StreamChunk | null = null
			for await (const chunk of streamChat(input.messages, LYON_PORTAL)) {
				if (chunk.type === 'RUN_FINISHED') {
					finishChunk = chunk
					continue
				}
				chunks.push(chunk)
			}
			for (const event of getRichEvents(userText, input.role, context)) {
				chunks.push(event)
			}
			if (finishChunk) chunks.push(finishChunk)
		} else {
			for await (const chunk of textOnlyStream(
				'Portal AI is not configured.',
			)) {
				chunks.push(chunk)
			}
		}

		await recordPortalAiAudit(supabase, userText, chunks, context)

		// biome-ignore lint/complexity/noBannedTypes: TanStack server-fn type contract uses `{}` explicitly.
		return chunks as unknown as Array<{ [k: string]: {} }>
	})

async function loadPortalAiContext(
	supabase: Awaited<
		ReturnType<typeof getAuthenticatedPortalCustomer>
	>['supabase'],
	customerId: string,
	userText: string,
): Promise<PortalAiContext> {
	const [product, latestOrder] = await Promise.all([
		findPublishedProduct(supabase, userText),
		findLatestCustomerOrder(supabase),
	])
	return { customerId, draft: null, latestOrder, product }
}

async function findPublishedProduct(
	supabase: Awaited<
		ReturnType<typeof getAuthenticatedPortalCustomer>
	>['supabase'],
	userText: string,
): Promise<PortalAiProduct | null> {
	const term = productSearchTerm(userText)
	if (!term) return null
	const searchFilter = publicProductSearchFilter(term)
	let query = supabase
		.from('products')
		.select(
			'id, name, name_ar, slug, category, unit_of_measure, unit_of_measure_ar, price_range_min, price_range_max, specifications, specifications_ar, image_urls, availability_status',
		)
		.eq('is_active', true)
		.neq('availability_status', 'hidden')
	if (searchFilter) query = query.or(searchFilter)
	const { data, error } = await query.limit(1)
	if (error) throw new Error(error.message)
	const [product] = (data ?? []) as PortalAiProduct[]
	return product ?? null
}

function publicProductSearchFilter(search: string): string | null {
	const term = search
		.replace(/[,%*()]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim()
	if (!term) return null
	const pattern = `*${term}*`
	return [
		`name.ilike.${pattern}`,
		`name_ar.ilike.${pattern}`,
		`sku.ilike.${pattern}`,
		`category.ilike.${pattern}`,
		`subcategory.ilike.${pattern}`,
		`subcategory_ar.ilike.${pattern}`,
		`brand.ilike.${pattern}`,
		`manufacturer.ilike.${pattern}`,
		`description.ilike.${pattern}`,
		`description_ar.ilike.${pattern}`,
	].join(',')
}

async function findLatestCustomerOrder(
	supabase: Awaited<
		ReturnType<typeof getAuthenticatedPortalCustomer>
	>['supabase'],
): Promise<PortalAiOrder | null> {
	const { data, error } = await supabase
		.from('orders')
		.select('id, order_number, status, created_at, delivered_at, total_amount')
		.order('created_at', { ascending: false })
		.limit(1)
	if (error) throw new Error(error.message)
	const [order] = (data ?? []) as PortalAiOrder[]
	return order ?? null
}

function productSearchTerm(userText: string): string | null {
	const lower = userText.toLowerCase()
	if (
		lower.includes('cement') ||
		lower.includes('\u0627\u0633\u0645\u0646\u062a')
	) {
		return 'cement'
	}
	if (
		lower.includes('rebar') ||
		lower.includes('steel') ||
		lower.includes('\u062d\u062f\u064a\u062f')
	) {
		return 'steel'
	}
	return null
}

function hasDraftIntent(userText: string): boolean {
	const lower = userText.toLowerCase()
	return (
		lower.includes('/quote') ||
		lower.includes('draft') ||
		lower.includes('add to cart') ||
		lower.includes('add it to my cart') ||
		lower.includes('save as draft')
	)
}

function hasEstimateIntent(userText: string): boolean {
	const lower = userText.toLowerCase()
	return (
		lower.includes('estimate') ||
		lower.includes('quantity') ||
		lower.includes('mix') ||
		lower.includes('project') ||
		lower.includes('sqm') ||
		lower.includes('m2') ||
		lower.includes('square')
	)
}

async function createPortalAiDraft(
	supabase: Awaited<
		ReturnType<typeof getAuthenticatedPortalCustomer>
	>['supabase'],
	customerId: string,
	userText: string,
	product: PortalAiProduct | null,
): Promise<PortalAiDraft | null> {
	if (!product) return null
	const quantity = parseRequestedQuantity(userText) ?? 1
	const { data: draft, error } = await supabase
		.from('quote_requests')
		.insert({
			attachment_urls: [],
			customer_id: customerId,
			notes: `Portal AI draft from chat: ${userText.slice(0, 180)}`,
			status: 'draft',
			urgency: 'standard',
		})
		.select('id, request_number')
		.single()
	if (error || !draft) {
		throw new Error(error?.message ?? 'Failed to create Portal AI draft')
	}

	await insertQuoteRequestItems(supabase, draft.id, [
		{
			customerDescription: product.name,
			isUnmatched: false,
			matchConfidence: 1,
			notes: 'Added by Portal AI for customer review',
			productId: product.id,
			quantity,
			sortOrder: 0,
			unitOfMeasure: product.unit_of_measure,
			unitOfMeasureAr: product.unit_of_measure_ar,
		},
	])

	const { error: activityError } = await supabase.rpc(
		'customer_record_quote_request_draft_saved',
		{
			p_context: {
				item_count: 1,
				operation: 'portal_ai_create',
				product_id: product.id,
				quantity,
			},
			p_quote_request_id: draft.id,
			p_source: 'portal',
		},
	)
	if (activityError) throw new Error(activityError.message)

	return {
		editRoute: `/orders/edit/${draft.id}`,
		id: draft.id,
		items: [
			{
				name: product.name,
				nameAr: product.name_ar ?? product.name,
				qty: quantity,
				unit: product.unit_of_measure,
				unitAr: product.unit_of_measure_ar,
			},
		],
		reference: draft.request_number,
	}
}

function parseRequestedQuantity(userText: string): number | null {
	const match = userText.match(/\b(\d+(?:\.\d+)?)\b/)
	if (!match) return null
	const value = Number.parseFloat(match[1])
	if (!Number.isFinite(value) || value <= 0) return null
	return Math.min(value, 1_000_000)
}

function portalPolicyRefusal(userText: string): string | null {
	const lower = userText.toLowerCase()
	if (
		lower.includes('other customer') ||
		lower.includes('another customer') ||
		lower.includes('all customers') ||
		lower.includes('private profile') ||
		lower.includes('supplier cost') ||
		lower.includes('finance internal') ||
		lower.includes('employee salary')
	) {
		return 'I can only use your customer account, published catalog, docs, and your active draft context. I cannot access or reveal another customer or internal private data.'
	}
	if (
		lower.includes('submit') &&
		(lower.includes('order') || lower.includes('quote'))
	) {
		return 'I can help draft the request, but I will not submit it. Please review and confirm through the normal order form.'
	}
	return null
}

function usesScopedPortalContext(userText: string): boolean {
	const lower = userText.toLowerCase()
	return (
		productSearchTerm(userText) !== null ||
		lower.includes('/quote') ||
		lower.includes('quote') ||
		lower.includes('draft') ||
		lower.includes('order') ||
		lower.includes('\u0637\u0644\u0628') ||
		lower.includes('track') ||
		lower.includes('/track') ||
		lower.includes('/price') ||
		lower.includes('price') ||
		lower.includes('/help') ||
		lower.includes('help') ||
		lower.includes('stock') ||
		lower.includes('\u0645\u062e\u0632\u0648\u0646')
	)
}

function productCardEvent(product: PortalAiProduct): StreamChunk {
	return {
		type: 'CUSTOM' as const,
		timestamp: Date.now(),
		name: 'rich_message',
		value: {
			type: 'product_card',
			data: {
				id: product.id,
				name: product.name,
				nameAr: product.name_ar ?? product.name,
				image: product.image_urls?.[0],
				priceRange: formatPriceRange(product, 'en'),
				priceRangeAr: formatPriceRange(product, 'ar'),
				specs: specsForCard(product.specifications),
				specsAr: specsForCard(product.specifications_ar),
				available: product.availability_status === 'available',
			},
		},
	}
}

function statusCardEvent(order: PortalAiOrder): StreamChunk {
	const createdDate = order.created_at.slice(0, 10)
	const deliveredDate = order.delivered_at?.slice(0, 10) ?? ''
	const delivered = order.status === 'delivered'
	return {
		type: 'CUSTOM' as const,
		timestamp: Date.now(),
		name: 'rich_message',
		value: {
			type: 'status_card',
			data: {
				entityType: 'order',
				entityId: order.id,
				displayNumber: order.order_number,
				status: order.status.replace(/_/g, ' '),
				statusColor: delivered ? 'green' : 'yellow',
				timeline: [
					{ label: 'Created', date: createdDate, done: true },
					{ label: 'In progress', date: createdDate, done: !delivered },
					{
						label: 'Delivered',
						date: deliveredDate || 'Pending',
						done: delivered,
					},
				],
			},
		},
	}
}

function formatPriceRange(
	product: PortalAiProduct,
	locale: 'ar' | 'en',
): string {
	const min = product.price_range_min
	const max = product.price_range_max
	const unit =
		locale === 'ar' && product.unit_of_measure_ar
			? product.unit_of_measure_ar
			: product.unit_of_measure
	if (min == null && max == null)
		return locale === 'ar' ? 'السعر عند الطلب' : 'Request quote'
	if (min != null && max != null) return `EGP ${min} - ${max}/${unit}`
	return `EGP ${min ?? max}/${unit}`
}

function specsForCard(
	value: Record<string, unknown> | null,
): Record<string, string> {
	if (!value) return {}
	return Object.fromEntries(
		Object.entries(value)
			.slice(0, 4)
			.map(([key, rawValue]) => [key, String(rawValue)]),
	)
}

async function* textOnlyStream(text: string): AsyncGenerator<StreamChunk> {
	const runId = crypto.randomUUID()
	const messageId = crypto.randomUUID()
	yield { type: 'RUN_STARTED' as const, timestamp: Date.now(), runId }
	yield {
		type: 'TEXT_MESSAGE_START' as const,
		timestamp: Date.now(),
		messageId,
		role: 'assistant' as const,
	}
	yield {
		type: 'TEXT_MESSAGE_CONTENT' as const,
		timestamp: Date.now(),
		messageId,
		delta: text,
	}
	yield { type: 'TEXT_MESSAGE_END' as const, timestamp: Date.now(), messageId }
	yield {
		type: 'RUN_FINISHED' as const,
		timestamp: Date.now(),
		runId,
		finishReason: 'stop' as const,
	}
}

async function recordPortalAiAudit(
	supabase: Awaited<
		ReturnType<typeof getAuthenticatedPortalCustomer>
	>['supabase'],
	userText: string,
	chunks: StreamChunk[],
	context: PortalAiContext,
) {
	const text = chunks
		.filter((chunk) => chunk.type === 'TEXT_MESSAGE_CONTENT')
		.map((chunk) => chunk.delta)
		.join('')
	const { error } = await supabase.rpc('record_ai_tool_call', {
		p_agent_scope: 'portal',
		p_approved_by_user: context.draft !== null,
		p_input_summary: {
			prompt: userText.slice(0, 240),
			customer_id: context.customerId,
		},
		p_output_summary: {
			response: text.slice(0, 240),
			product_id: context.product?.id ?? null,
			order_id: context.latestOrder?.id ?? null,
		},
		p_read_entities: [
			'customer_docs',
			'published_products',
			'customer_orders',
			'customer_drafts',
		],
		p_tool_name: 'portal_customer_chat',
		p_write_entity_id: context.draft?.id ?? null,
		p_write_entity_type: context.draft ? 'quote_request' : null,
	})
	if (error) throw new Error(error.message)
}
