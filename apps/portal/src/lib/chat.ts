/**
 * Portal AI chat server function.
 *
 * Customer mode is a scoped agent loop:
 *   1. route the user message to an allowlisted tool intent,
 *   2. execute only customer-owned reads or draft-only writes,
 *   3. write a friendly final answer from the supplied tool context.
 *
 * Supplier mode is intentionally left read-style and keyword-based for V1.
 */

import {
	completeChat,
	isAIEnabled,
	LYON_PORTAL,
	streamChat,
} from '@hyperquote/ai'
import {
	buildPublicDocsContext,
	buildWebsiteDocsPrompt,
	type DocsRetrievalResult,
	publicDocsExtractiveResponse,
	publicDocsNoAnswerResponse,
	publicDocsSourceLinks,
	retrieveWebsiteDocs,
} from '@hyperquote/docs/retrieval'
import type { StreamChunk } from '@tanstack/ai'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import {
	buildPortalCustomerAgentPrompt,
	detectPortalAiLocale,
	enforcePortalCustomerToolRequest,
	fallbackPortalCustomerToolRequest,
	isDraftWriteAction,
	type PortalCustomerCatalogSnapshot,
	type PortalCustomerToolRequest,
	parsePortalCustomerToolRequest,
	portalCustomerPolicyRefusal,
	routePortalCustomerDraftFollowUp,
} from './portal-customer-agent'
import { getAuthenticatedPortalCustomer } from './server/_supabase'
import {
	type DeliveryInfo,
	getCustomerDeliveryTracking,
} from './server/deliveries'
import {
	insertQuoteRequestItems,
	QUOTE_REQUEST_ITEM_PRODUCT_NOT_ORDERABLE,
} from './server/quote-request-items'

const MAX_CHAT_MESSAGES = 30
const MAX_CHAT_MESSAGE_CHARACTERS = 4000
const MODEL_CHAT_MESSAGES = 10
const MODEL_CHAT_MESSAGE_CHARACTERS = 2000
const OPEN_ENDED_DRAFT_PRODUCT_POOL_SIZE = 24
const OPEN_ENDED_DRAFT_ITEM_COUNT = 3
const PRODUCT_CATALOG_CONTEXT_LIMIT = 160
const PRODUCT_CATALOG_RESULT_COUNT = 12

const portalChatInput = z.object({
	messages: z
		.array(
			z.object({
				role: z.enum(['user', 'assistant']),
				content: z.string().max(MAX_CHAT_MESSAGE_CHARACTERS),
			}),
		)
		.min(1)
		.max(MAX_CHAT_MESSAGES),
	role: z.enum(['customer', 'supplier']),
	conversationId: z.string().nullable(),
})

type ChatMessageInput = { role: 'user' | 'assistant'; content: string }
type AuthedSupabase = Awaited<
	ReturnType<typeof getAuthenticatedPortalCustomer>
>['supabase']
type QuoteRequestItemInput = Parameters<
	typeof insertQuoteRequestItems
>[2][number]

interface PortalAiProduct {
	availability_status: string
	category: string
	description: string | null
	description_ar: string | null
	id: string
	image_urls: string[] | null
	name: string
	name_ar: string | null
	price_range_max: number | null
	price_range_min: number | null
	sku: string
	slug: string
	specifications: Record<string, unknown> | null
	specifications_ar: Record<string, unknown> | null
	subcategory: string | null
	subcategory_ar: string | null
	unit_of_measure: string
	unit_of_measure_ar: string
}

interface ProductCatalogResult {
	catalogComplete: boolean
	products: PortalAiProduct[]
	totalVisibleProducts: number
}

interface CustomerProfileRow {
	company_name: string
	contact_name: string
	credit_limit: number
	email: string | null
	id: string
	payment_history: string
	phone: string
	status: string
	tier: string
	trade_license_status: string | null
}

interface CustomerAddressRow {
	city: string
	governorate: string
	id: string
	is_default: boolean
	label: string | null
	street: string
}

interface CustomerProjectRow {
	created_at: string
	description: string | null
	id: string
	name: string
}

interface QuoteRequestItemRow {
	customer_description: string
	id: string
	is_unmatched: boolean
	match_confidence: number | null
	notes: string | null
	product_id: string | null
	product_name_ar: string
	quantity: number
	sort_order: number
	unit_of_measure: string
	unit_of_measure_ar: string
	products:
		| Pick<
				PortalAiProduct,
				'category' | 'id' | 'image_urls' | 'name' | 'name_ar'
		  >
		| Array<
				Pick<
					PortalAiProduct,
					'category' | 'id' | 'image_urls' | 'name' | 'name_ar'
				>
		  >
		| null
}

interface LinkedOrderRow {
	created_at: string
	delivered_at: string | null
	id: string
	order_number: string
	quote_request_id: string | null
	status: string
	total_amount: number | null
}

interface QuoteRequestRow {
	attachment_urls: string[] | null
	created_at: string
	delivery_address_id: string | null
	delivery_date: string | null
	draft_name: string | null
	id: string
	notes: string | null
	orders: LinkedOrderRow | LinkedOrderRow[] | null
	project_id: string | null
	quote_request_items: QuoteRequestItemRow[] | null
	request_number: string
	status: string
	submitted_at: string | null
	urgency: string
}

interface DocumentRow {
	created_at: string
	download_url: string | null
	id: string
	title: string
	type: string
}

interface CustomerOrderSummary {
	amount: number | null
	date: string
	description: string
	id: string
	itemCount: number
	items: DraftMaterialItem[]
	linkedOrderId: string | null
	name: string | null
	reference: string
	requestReference: string
	status: string
	type: 'draft' | 'submitted' | 'confirmed'
}

interface DraftMaterialItem {
	name: string
	nameAr: string
	notes?: string
	productId?: string
	qty: number
	unit: string
	unitAr: string
}

interface DeliveryTrackingContext {
	delivery: DeliveryInfo
	order: CustomerOrderSummary
}

interface DraftWriteContext {
	draftId?: string
	editRoute?: string
	items?: DraftMaterialItem[]
	kept?: string[]
	merged?: string[]
	reference?: string
	renamed?: Array<{ from: string; to: string }>
	deleted?: string[]
	message: string
}

type PortalToolContext =
	| { message?: string; type: 'chat' }
	| { type: 'refusal'; message: string }
	| { type: 'public_docs'; docs: DocsRetrievalResult }
	| {
			type: 'profile'
			addresses: CustomerAddressRow[]
			profile: CustomerProfileRow
			projects: CustomerProjectRow[]
	  }
	| { type: 'orders'; orders: CustomerOrderSummary[] }
	| {
			type: 'order_detail'
			documents: DocumentRow[]
			order: CustomerOrderSummary | null
	  }
	| { type: 'delivery_tracking'; tracking: DeliveryTrackingContext | null }
	| {
			catalogComplete: boolean
			locale: 'ar' | 'en'
			products: PortalAiProduct[]
			query: string
			totalVisibleProducts: number
			type: 'products'
	  }
	| { type: 'draft_write'; operation: string; result: DraftWriteContext }

interface PortalToolResult {
	context: PortalToolContext
	invalidatesOrders: boolean
	readEntities: string[]
	route: PortalCustomerToolRequest
	writeEntityId: string | null
	writeEntityType: string | null
}

const SUPPLIER_RESPONSES: Record<string, string> = {
	default:
		'Welcome to the Supplier Portal. I can help you manage stock, check PO status, and update pricing. What do you need?',
	cement:
		'Here is the current stock status for cement products in your catalog.',
	rebar: 'Here is the current stock status for rebar products.',
	order: 'Let me pull up the latest purchase order status.',
	track: 'Checking the status of your recent purchase orders.',
	price:
		'You can update your pricing through the catalog management window. Would you like me to open it?',
	help: 'Here are the key actions available to you.',
	stock: 'Let me check your current stock levels.',
}

export const portalChatFn = createServerFn({ method: 'POST' })
	.inputValidator(portalChatInput)
	.handler(async ({ data: input }) => {
		const lastMessage = input.messages[input.messages.length - 1]
		const userText = lastMessage?.content ?? ''
		const modelMessages = modelChatMessages(input.messages)
		const { customerId, supabase } = await getAuthenticatedPortalCustomer()

		if (input.role === 'supplier') {
			const chunks = await supplierPortalChunks(userText, modelMessages)
			// biome-ignore lint/complexity/noBannedTypes: TanStack server-fn serialization accepts this historical chunk boundary type.
			return chunks as unknown as Array<{ [k: string]: {} }>
		}

		const catalog = await loadVisibleProductCatalog(
			supabase,
			PRODUCT_CATALOG_CONTEXT_LIMIT,
		)
		const route = await requestPortalCustomerTool(
			modelMessages,
			userText,
			catalog,
		)
		const result = await executePortalCustomerToolRequest(
			supabase,
			customerId,
			route,
			userText,
		)
		const chunks = await renderPortalCustomerResponse(modelMessages, result)

		await recordPortalAiAudit(
			supabase,
			customerId,
			userText,
			chunks,
			result,
		).catch(() => undefined)

		// biome-ignore lint/complexity/noBannedTypes: TanStack server-fn serialization accepts this historical chunk boundary type.
		return chunks as unknown as Array<{ [k: string]: {} }>
	})

async function requestPortalCustomerTool(
	messages: ChatMessageInput[],
	userText: string,
	catalog: ProductCatalogResult,
): Promise<PortalCustomerToolRequest> {
	const draftFollowUp = routePortalCustomerDraftFollowUp(messages, userText)
	if (draftFollowUp) return draftFollowUp

	const deterministicRoute = fallbackPortalCustomerToolRequest(userText)
	if (
		deterministicRoute.action === 'refuse' ||
		isDraftWriteAction(deterministicRoute.action)
	) {
		return deterministicRoute
	}

	if (!isAIEnabled()) return deterministicRoute

	try {
		const rawRoute = await completeChat(
			recentRouteMessages(messages),
			buildPortalCustomerAgentPrompt(toAgentCatalogSnapshot(catalog)),
			{ temperature: 0 },
		)
		return enforcePortalCustomerToolRequest(
			parsePortalCustomerToolRequest(rawRoute, userText),
			userText,
		)
	} catch {
		return fallbackPortalCustomerToolRequest(userText)
	}
}

function toAgentCatalogSnapshot(
	catalog: ProductCatalogResult,
): PortalCustomerCatalogSnapshot {
	return {
		catalogComplete: catalog.catalogComplete,
		products: catalog.products.map((product) => ({
			category: product.category,
			name: product.name,
			nameAr: product.name_ar,
			priceRange: formatPriceRange(product, 'en'),
			productId: product.id,
			status: isCustomerVisibleAvailable(product) ? 'Available' : 'Unavailable',
			unit: product.unit_of_measure,
		})),
		totalVisibleProducts: catalog.totalVisibleProducts,
	}
}

function simpleCustomerChatAnswer(messages: ChatMessageInput[]): string | null {
	const lastUser = [...messages]
		.reverse()
		.find((message) => message.role === 'user')
	const userText = lastUser?.content.trim() ?? ''
	return simplePortalTextAnswer(userText, 'customer')
}

function simplePortalTextAnswer(
	userText: string,
	role: 'customer' | 'supplier',
): string | null {
	const normalized = normalizeForMatch(userText)
	const isArabic = detectPortalAiLocale(userText) === 'ar'
	const isGreeting =
		/^(hi|hello|hey|yo|salam|good morning|good afternoon|good evening)$/.test(
			normalized,
		) || /^(اهلا|أهلا|هاي|مرحبا|السلام عليكم)$/.test(userText)
	if (isHostileChatMessage(normalized, userText)) {
		return isArabic
			? 'أنا هنا للمساعدة في هايبركوت لما تكون جاهز.'
			: "I'm here to help with HyperQuote when you're ready."
	}
	if (!isGreeting) return null
	if (role === 'supplier') {
		return isArabic
			? 'أهلاً، أقدر أساعدك في المخزون وأوامر الشراء والأسعار داخل بوابة المورد.'
			: 'Hi, I can help with supplier portal stock, purchase orders, and pricing.'
	}
	return isArabic
		? 'أهلاً، أنا ليون. قلّي بتبني إيه أو محتاج أي منتج/طلب/توصيل أراجعه معاك.'
		: "Hi, I'm Lyon. Tell me what you are building or which product, order, delivery, or draft you want to check."
}

function isHostileChatMessage(normalized: string, raw: string): boolean {
	return (
		/\b(fuck|fucker|bitch|idiot|stupid|shut up)\b/.test(normalized) ||
		/غبي|اخرس|كس|زب/.test(raw)
	)
}

async function executePortalCustomerToolRequest(
	supabase: AuthedSupabase,
	customerId: string,
	route: PortalCustomerToolRequest,
	userText: string,
): Promise<PortalToolResult> {
	const refusal =
		route.action === 'refuse'
			? (route.reason ?? portalCustomerPolicyRefusal(userText))
			: portalCustomerPolicyRefusal(userText)
	if (refusal) {
		return {
			context: { type: 'refusal', message: refusal },
			invalidatesOrders: false,
			readEntities: ['portal_policy'],
			route: { action: 'refuse', reason: refusal, searchQuery: '' },
			writeEntityId: null,
			writeEntityType: null,
		}
	}

	switch (route.action) {
		case 'public_docs':
			return publicDocsToolResult(route, userText)
		case 'customer_profile': {
			const context = await loadCustomerProfileContext(supabase, customerId)
			return {
				context: { type: 'profile', ...context },
				invalidatesOrders: false,
				readEntities: ['customer_profile', 'customer_addresses', 'projects'],
				route,
				writeEntityId: null,
				writeEntityType: null,
			}
		}
		case 'customer_orders': {
			const orders = await loadCustomerOrders(supabase, customerId)
			return {
				context: { type: 'orders', orders },
				invalidatesOrders: false,
				readEntities: ['customer_quote_requests', 'customer_orders'],
				route,
				writeEntityId: null,
				writeEntityType: null,
			}
		}
		case 'order_detail': {
			const detail = await loadOrderDetailContext(supabase, customerId, route)
			return {
				context: { type: 'order_detail', ...detail },
				invalidatesOrders: false,
				readEntities: [
					'customer_quote_requests',
					'customer_orders',
					'customer_documents',
				],
				route,
				writeEntityId: null,
				writeEntityType: null,
			}
		}
		case 'delivery_tracking': {
			const tracking = await loadDeliveryTrackingContext(
				supabase,
				customerId,
				route,
			)
			return {
				context: { type: 'delivery_tracking', tracking },
				invalidatesOrders: false,
				readEntities: ['customer_orders', 'customer_delivery_tracking'],
				route,
				writeEntityId: null,
				writeEntityType: null,
			}
		}
		case 'product_search': {
			const catalog = await findPublishedProducts(
				supabase,
				route.searchQuery || userText,
				PRODUCT_CATALOG_RESULT_COUNT,
			)
			return {
				context: {
					catalogComplete: catalog.catalogComplete,
					locale: detectPortalAiLocale(userText),
					products: catalog.products,
					query: route.searchQuery || userText,
					totalVisibleProducts: catalog.totalVisibleProducts,
					type: 'products',
				},
				invalidatesOrders: false,
				readEntities: ['published_products'],
				route,
				writeEntityId: null,
				writeEntityType: null,
			}
		}
		case 'create_draft_from_plan': {
			const result = await createDraftFromPlan(
				supabase,
				customerId,
				route,
				userText,
			)
			return draftWriteToolResult(route, 'create_draft_from_plan', result)
		}
		case 'duplicate_order_to_draft': {
			const result = await duplicateOrderToDraft(supabase, customerId, route)
			return draftWriteToolResult(route, 'duplicate_order_to_draft', result)
		}
		case 'update_draft_metadata': {
			const result = await updateDraftMetadata(
				supabase,
				customerId,
				route,
				userText,
			)
			return draftWriteToolResult(route, 'update_draft_metadata', result)
		}
		case 'cleanup_drafts': {
			const result = await cleanupDrafts(supabase, customerId, route)
			return draftWriteToolResult(route, 'cleanup_drafts', result)
		}
		case 'delete_draft': {
			const result = await deleteDraft(supabase, customerId, route)
			return draftWriteToolResult(route, 'delete_draft', result)
		}
		default:
			return {
				context: { message: route.finalResponse, type: 'chat' },
				invalidatesOrders: false,
				readEntities: ['portal_chat'],
				route,
				writeEntityId: null,
				writeEntityType: null,
			}
	}
}

function publicDocsToolResult(
	route: PortalCustomerToolRequest,
	userText: string,
): PortalToolResult {
	const routeQuery = route.searchQuery.trim()
	const searchQuery = routeQuery ? `${userText} ${routeQuery}` : userText
	let docs = retrieveWebsiteDocs(searchQuery)
	if (!docs.hasHighConfidence && routeQuery) {
		const fallbackDocs = retrieveWebsiteDocs(userText)
		if (fallbackDocs.hasHighConfidence) docs = fallbackDocs
	}
	return {
		context: { type: 'public_docs', docs },
		invalidatesOrders: false,
		readEntities: ['public_docs'],
		route,
		writeEntityId: null,
		writeEntityType: null,
	}
}

function draftWriteToolResult(
	route: PortalCustomerToolRequest,
	operation: string,
	result: DraftWriteContext,
): PortalToolResult {
	return {
		context: { type: 'draft_write', operation, result },
		invalidatesOrders: draftWriteChanged(result),
		readEntities: [
			'customer_quote_requests',
			'customer_orders',
			'published_products',
		],
		route,
		writeEntityId: result.draftId ?? null,
		writeEntityType: result.draftId ? 'quote_request' : null,
	}
}

function draftWriteChanged(result: DraftWriteContext): boolean {
	return Boolean(
		result.draftId ||
			result.deleted?.length ||
			result.merged?.length ||
			result.renamed?.length,
	)
}

async function renderPortalCustomerResponse(
	modelMessages: ChatMessageInput[],
	result: PortalToolResult,
): Promise<StreamChunk[]> {
	const customEvents = richEventsForToolResult(result)

	if (result.context.type === 'chat') {
		const simpleAnswer = simpleCustomerChatAnswer(modelMessages)
		return textOnlyChunks(
			result.context.message ??
				simpleAnswer ??
				"I'm Lyon. Tell me what you are building, or what product, order, delivery, or draft you want help with.",
			customEvents,
		)
	}

	if (result.context.type === 'public_docs') {
		const text = await publicDocsAnswer(modelMessages, result.context.docs)
		return textOnlyChunks(text, customEvents)
	}

	if (result.context.type === 'refusal') {
		return textOnlyChunks(result.context.message, customEvents)
	}

	const fallbackText = fallbackToolAnswer(result.context)
	if (result.context.type === 'products') {
		return textOnlyChunks(fallbackText, customEvents)
	}
	if (!isAIEnabled()) return textOnlyChunks(fallbackText, customEvents)

	try {
		const answer = await completeChat(
			modelMessages,
			buildPortalToolAnswerPrompt(result.context),
			{ temperature: 0.2 },
		)
		return textOnlyChunks(answer.trim() || fallbackText, customEvents)
	} catch {
		return textOnlyChunks(fallbackText, customEvents)
	}
}

async function publicDocsAnswer(
	modelMessages: ChatMessageInput[],
	docs: DocsRetrievalResult,
): Promise<string> {
	if (!docs.hasHighConfidence) return publicDocsNoAnswerResponse(docs.locale)
	if (!isAIEnabled()) {
		return publicDocsExtractiveResponse(docs.chunks, docs.locale)
	}

	const sources = publicDocsSourceLinks(docs.chunks, docs.locale)
	try {
		const answer = await completeChat(
			modelMessages,
			buildWebsiteDocsPrompt(LYON_PORTAL, buildPublicDocsContext(docs.chunks)),
			{ temperature: 0.2 },
		)
		return appendDocsSources(answer, sources, docs.locale)
	} catch {
		return publicDocsExtractiveResponse(docs.chunks, docs.locale)
	}
}

function appendDocsSources(
	answer: string,
	sources: string,
	locale: 'ar' | 'en',
): string {
	if (!sources || /\]\(\/docs\//.test(answer)) return answer
	return `${answer.trim()}\n\n${locale === 'ar' ? 'المصادر' : 'Sources'}: ${sources}`
}

function buildPortalToolAnswerPrompt(
	context: Exclude<
		PortalToolContext,
		{ type: 'chat' | 'public_docs' | 'refusal' }
	>,
): string {
	return `${LYON_PORTAL}

Answer from the supplied Portal tool result only.
Be natural and concise. Match the user's language from the conversation.
Do not expose IDs unless they are customer-facing references.
For draft writes, say the draft is still a draft and the customer must review/submit manually in the normal UI.
For missing data, say what is missing instead of guessing.

Portal tool result:
${safeJson(context)}`
}

function fallbackToolAnswer(context: PortalToolContext): string {
	switch (context.type) {
		case 'profile':
			return profileFallbackAnswer(context)
		case 'orders':
			return ordersFallbackAnswer(context.orders)
		case 'order_detail':
			return orderDetailFallbackAnswer(context.order, context.documents)
		case 'delivery_tracking':
			return deliveryTrackingFallbackAnswer(context.tracking)
		case 'products':
			return productFallbackAnswer(context)
		case 'draft_write':
			return context.result.message
		case 'refusal':
			return context.message
		case 'public_docs':
			return context.docs.hasHighConfidence
				? publicDocsExtractiveResponse(context.docs.chunks, context.docs.locale)
				: publicDocsNoAnswerResponse(context.docs.locale)
		case 'chat':
			return (
				context.message ?? "I'm Lyon. How can I help with HyperQuote today?"
			)
	}
}

function profileFallbackAnswer(
	context: Extract<PortalToolContext, { type: 'profile' }>,
): string {
	const defaultAddress = context.addresses.find((address) => address.is_default)
	const projects = context.projects.slice(0, 3).map((project) => project.name)
	return [
		`Your customer profile is ${context.profile.company_name}.`,
		`Primary contact: ${context.profile.contact_name} (${context.profile.phone}).`,
		defaultAddress
			? `Default address: ${defaultAddress.street}, ${defaultAddress.city}, ${defaultAddress.governorate}.`
			: 'No default address is saved.',
		projects.length > 0
			? `Active projects: ${projects.join(', ')}.`
			: 'No active projects are saved.',
	].join(' ')
}

function ordersFallbackAnswer(orders: CustomerOrderSummary[]): string {
	if (orders.length === 0) {
		return 'I do not see any quote requests or orders in your customer account yet.'
	}
	const counts = orders.reduce<Record<string, number>>((summary, order) => {
		summary[order.status] = (summary[order.status] ?? 0) + 1
		return summary
	}, {})
	const countText = Object.entries(counts)
		.map(([status, count]) => `${count} ${status.replace(/_/g, ' ')}`)
		.join(', ')
	const latest = orders.slice(0, 4).map((order) => {
		return `${order.reference} is ${order.status.replace(/_/g, ' ')}`
	})
	return `I found ${orders.length} visible quote requests/orders: ${countText}. Latest: ${latest.join('; ')}.`
}

function orderDetailFallbackAnswer(
	order: CustomerOrderSummary | null,
	documents: DocumentRow[],
): string {
	if (!order)
		return 'I could not find that order or quote request in your customer account.'
	const docsText =
		documents.length > 0
			? ` Visible documents: ${documents.map((document) => document.title).join(', ')}.`
			: ''
	return `${order.reference} is ${order.status.replace(/_/g, ' ')} with ${order.itemCount} item${order.itemCount === 1 ? '' : 's'}.${order.amount === null ? '' : ` Amount: EGP ${order.amount}.`}${docsText}`
}

function deliveryTrackingFallbackAnswer(
	tracking: DeliveryTrackingContext | null,
): string {
	if (!tracking) {
		return 'I do not see an active customer-visible delivery tracking record for your account.'
	}
	const { delivery, order } = tracking
	return `${order.reference} is ${delivery.currentStage.replace(/_/g, ' ')}. Driver: ${delivery.driverName} (${delivery.driverPhone}). Truck ${delivery.truckNumber}, plate ${delivery.vehiclePlate}. ETA: ${delivery.estimatedArrival}. Last update: ${delivery.lastUpdated}.`
}

function productFallbackAnswer(
	context: Extract<PortalToolContext, { type: 'products' }>,
): string {
	const isArabic = context.locale === 'ar'
	if (context.products.length === 0) {
		return isArabic
			? 'مش لاقي منتج منشور مناسب في الكتالوج حاليًا. قلّي المادة الأساسية أو المقاس المطلوب وأدور تاني.'
			: 'I could not find a matching published product in the catalog. Tell me the main material or size and I will search again.'
	}
	const rows = context.products.slice(0, 6).map((product) => {
		const name =
			isArabic && product.name_ar
				? `${product.name_ar} / ${product.name}`
				: `${product.name}${product.name_ar ? ` / ${product.name_ar}` : ''}`
		return `| ${name} | ${availabilityLabel(product, context.locale)} | ${unitLabel(product, context.locale)} | ${formatPriceRange(product, context.locale)} |`
	})
	if (isArabic) {
		return [
			'دي اختيارات حقيقية من الكتالوج كبداية:',
			'',
			'| المنتج | الحالة | الوحدة | السعر |',
			'| --- | --- | --- | --- |',
			...rows,
			'',
			'المنتجات غير المتاحة للعلم فقط ولن أضيفها لمسودة. تحب أضيف المنتجات المتاحة لمسودة تراجعها؟',
		].join('\n')
	}
	return [
		'Here are real catalog-backed starting points:',
		'',
		'| Product | Status | Unit | Price |',
		'| --- | --- | --- | --- |',
		...rows,
		'',
		'Unavailable products are for visibility only and will not be added to a draft. Want me to add the available items to a draft for review?',
	].join('\n')
}

function richEventsForToolResult(result: PortalToolResult): StreamChunk[] {
	const events: StreamChunk[] = []
	switch (result.context.type) {
		case 'products':
			for (const product of result.context.products.slice(0, 3)) {
				events.push(productCardEvent(product))
			}
			break
		case 'orders':
			for (const order of result.context.orders.slice(0, 3)) {
				events.push(statusCardEvent(order))
			}
			break
		case 'order_detail':
			if (result.context.order)
				events.push(statusCardEvent(result.context.order))
			break
		case 'delivery_tracking':
			if (result.context.tracking) {
				events.push(statusCardEvent(result.context.tracking.order))
				events.push(deliveryTrackingEvent(result.context.tracking))
			}
			break
		case 'draft_write':
			events.push(draftCleanupEvent(result.context.result))
			if (result.context.result.items) {
				events.push(materialListEvent(result.context.result))
			}
			break
		default:
			break
	}
	if (result.invalidatesOrders) events.push(customerOrdersInvalidationEvent())
	return events
}

async function loadCustomerProfileContext(
	supabase: AuthedSupabase,
	customerId: string,
) {
	const [
		{ data: profile, error: profileError },
		{ data: addresses, error: addressError },
		{ data: projects, error: projectError },
	] = await Promise.all([
		supabase
			.from('customers')
			.select(
				'id, company_name, contact_name, phone, email, status, tier, credit_limit, payment_history, trade_license_status',
			)
			.eq('id', customerId)
			.single(),
		supabase
			.from('customer_addresses')
			.select('id, label, street, city, governorate, is_default')
			.eq('customer_id', customerId)
			.order('is_default', { ascending: false })
			.order('created_at', { ascending: false }),
		supabase
			.from('projects')
			.select('id, name, description, created_at')
			.eq('customer_id', customerId)
			.eq('archived', false)
			.order('created_at', { ascending: false }),
	])

	if (profileError || !profile) {
		throw new Error(profileError?.message ?? 'Customer profile not found')
	}
	if (addressError) throw new Error(addressError.message)
	if (projectError) throw new Error(projectError.message)

	return {
		addresses: (addresses ?? []) as CustomerAddressRow[],
		profile: profile as CustomerProfileRow,
		projects: (projects ?? []) as CustomerProjectRow[],
	}
}

async function loadCustomerOrders(
	supabase: AuthedSupabase,
	customerId: string,
): Promise<CustomerOrderSummary[]> {
	const { data, error } = await supabase
		.from('quote_requests')
		.select(
			`
			id,
			request_number,
			status,
			created_at,
			submitted_at,
			draft_name,
			notes,
			urgency,
			project_id,
			delivery_address_id,
			delivery_date,
			attachment_urls,
			quote_request_items (
				id,
				product_id,
				customer_description,
				product_name_ar,
				quantity,
				unit_of_measure,
				unit_of_measure_ar,
				notes,
				match_confidence,
				sort_order,
				is_unmatched,
				products (
					id,
					name,
					name_ar,
					category,
					image_urls
				)
			),
			orders (
				id,
				order_number,
				status,
				total_amount,
				created_at,
				delivered_at,
				quote_request_id
			)
		`,
		)
		.eq('customer_id', customerId)
		.order('created_at', { ascending: false })
		.limit(80)

	if (error) throw new Error(error.message)
	return ((data ?? []) as unknown as QuoteRequestRow[]).map(
		toCustomerOrderSummary,
	)
}

async function loadOrderDetailContext(
	supabase: AuthedSupabase,
	customerId: string,
	route: PortalCustomerToolRequest,
): Promise<{ documents: DocumentRow[]; order: CustomerOrderSummary | null }> {
	const orders = await loadCustomerOrders(supabase, customerId)
	const order =
		findOrderByReference(orders, route.targetReference) ?? orders[0] ?? null
	if (!order) return { documents: [], order: null }
	const { data: documents, error } = await supabase
		.from('documents')
		.select('id, type, title, download_url, created_at')
		.eq('customer_id', customerId)
		.eq('related_order_ref', order.reference)
		.order('created_at', { ascending: false })
	if (error) throw new Error(error.message)
	return {
		documents: ((documents ?? []) as DocumentRow[]).filter(
			(document) => document.download_url,
		),
		order,
	}
}

async function loadDeliveryTrackingContext(
	supabase: AuthedSupabase,
	customerId: string,
	route: PortalCustomerToolRequest,
): Promise<DeliveryTrackingContext | null> {
	const orders = await loadCustomerOrders(supabase, customerId)
	const scopedOrders = route.targetReference
		? orders.filter((order) =>
				orderMatchesReference(order, route.targetReference),
			)
		: orders
	for (const order of scopedOrders) {
		if (!order.linkedOrderId) continue
		const delivery = await getCustomerDeliveryTracking(
			supabase,
			order.linkedOrderId,
		)
		if (delivery) return { delivery, order }
	}
	return null
}

async function findPublishedProducts(
	supabase: AuthedSupabase,
	userText: string,
	limit: number,
): Promise<ProductCatalogResult> {
	const catalog = await loadVisibleProductCatalog(
		supabase,
		PRODUCT_CATALOG_CONTEXT_LIMIT,
	)
	return {
		...catalog,
		products: rankProductsForPlanning(
			catalog.products,
			productIntentTerms(userText),
			limit,
		),
	}
}

async function loadVisibleProductCatalog(
	supabase: AuthedSupabase,
	limit: number,
): Promise<ProductCatalogResult> {
	const { data, error, count } = await supabase
		.from('products')
		.select(
			'id, sku, slug, name, name_ar, category, subcategory, subcategory_ar, unit_of_measure, unit_of_measure_ar, price_range_min, price_range_max, availability_status, image_urls, specifications, specifications_ar, description, description_ar',
			{ count: 'exact' },
		)
		.eq('is_active', true)
		.neq('availability_status', 'hidden')
		.order('name', { ascending: true })
		.limit(limit)

	if (error) throw new Error(error.message)
	const products = (data ?? []) as PortalAiProduct[]
	return {
		catalogComplete: (count ?? products.length) <= products.length,
		products,
		totalVisibleProducts: count ?? products.length,
	}
}

async function findOrderableProductsForDraft(
	supabase: AuthedSupabase,
	userText: string,
): Promise<PortalAiProduct[]> {
	const openEndedSelection = isOpenEndedCatalogSelectionRequest(userText)
	const intentTerms = productIntentTerms(userText)
	if (intentTerms.length > 0 || openEndedSelection) {
		const builder = supabase
			.from('products')
			.select(
				'id, sku, slug, name, name_ar, category, subcategory, subcategory_ar, unit_of_measure, unit_of_measure_ar, price_range_min, price_range_max, availability_status, image_urls, specifications, specifications_ar, description, description_ar',
			)
			.eq('is_active', true)
			.neq('availability_status', 'hidden')
			.neq('availability_status', 'out_of_stock')
			.order('name', { ascending: true })
			.limit(OPEN_ENDED_DRAFT_PRODUCT_POOL_SIZE)
		const { data, error } = await builder
		if (error) throw new Error(error.message)
		const products = (data ?? []) as PortalAiProduct[]
		if (openEndedSelection && intentTerms.length === 0) {
			return deterministicProductSample(
				products,
				userText,
				OPEN_ENDED_DRAFT_ITEM_COUNT,
			)
		}
		return rankProductsForPlanning(
			products,
			intentTerms,
			openEndedSelection ? OPEN_ENDED_DRAFT_ITEM_COUNT : 8,
		)
	}

	const query = openEndedSelection ? null : productSearchTerm(userText)
	const limit = openEndedSelection ? OPEN_ENDED_DRAFT_PRODUCT_POOL_SIZE : 8
	let builder = supabase
		.from('products')
		.select(
			'id, sku, slug, name, name_ar, category, subcategory, subcategory_ar, unit_of_measure, unit_of_measure_ar, price_range_min, price_range_max, availability_status, image_urls, specifications, specifications_ar, description, description_ar',
		)
		.eq('is_active', true)
		.neq('availability_status', 'hidden')
		.neq('availability_status', 'out_of_stock')
		.order('name', { ascending: true })
		.limit(limit)
	if (query) {
		const filter = publicProductSearchFilter(query)
		if (filter) builder = builder.or(filter)
	}

	const { data, error } = await builder
	if (error) throw new Error(error.message)
	const products = (data ?? []) as PortalAiProduct[]
	return openEndedSelection
		? deterministicProductSample(
				products,
				userText,
				OPEN_ENDED_DRAFT_ITEM_COUNT,
			)
		: products
}

async function createDraftFromPlan(
	supabase: AuthedSupabase,
	customerId: string,
	route: PortalCustomerToolRequest,
	userText: string,
): Promise<DraftWriteContext> {
	const draftPlanText = route.searchQuery
		? `${userText} ${route.searchQuery}`
		: userText
	const products = await findOrderableProductsForDraft(supabase, draftPlanText)
	const items = buildDraftItemsFromPlan(draftPlanText, products)
	if (items.length === 0) {
		const visibleMatches = await findPublishedProducts(
			supabase,
			draftPlanText,
			5,
		)
		return {
			message:
				visibleMatches.products.length > 0
					? `I found catalog matches, but none are available to add right now: ${visibleMatches.products.map((product) => `${product.name} (${availabilityLabel(product, detectPortalAiLocale(userText))})`).join(', ')}. I did not create a draft.`
					: 'I could not find an available catalog product to add. I did not create a draft.',
		}
	}
	if (items.some((item) => !item.productId)) {
		throw new Error('Portal AI draft creation requires real catalog products')
	}
	const draftName =
		route.draftName ??
		defaultDraftName(userText, detectPortalAiLocale(userText))

	const { data: draft, error } = await supabase
		.from('quote_requests')
		.insert({
			attachment_urls: [],
			customer_id: customerId,
			draft_name: draftName,
			notes: `Portal AI draft from chat: ${userText.slice(0, 180)}`,
			status: 'draft',
			urgency: 'standard',
		})
		.select('id, request_number')
		.single()
	if (error || !draft)
		throw new Error(error?.message ?? 'Failed to create draft')

	const insertFailure = await insertStrictCatalogDraftItems(
		supabase,
		customerId,
		draft.id,
		items.map((item, index) => ({
			customerDescription: item.name,
			isUnmatched: false,
			matchConfidence: 0.85,
			notes: item.notes ?? 'Added by Portal AI for customer review',
			productId: item.productId,
			quantity: item.qty,
			sortOrder: index,
			unitOfMeasure: item.unit,
			unitOfMeasureAr: item.unitAr,
		})),
		'The catalog changed before I could save those products, so I did not create a draft. Search the catalog again and I can draft from the current available products.',
	)
	if (insertFailure) {
		return { message: insertFailure }
	}

	await recordDraftSavedActivity(supabase, draft.id, {
		item_count: items.length,
		operation: 'portal_ai_create',
	})

	return {
		draftId: draft.id,
		editRoute: `/orders/edit/${draft.id}`,
		items,
		reference: draft.request_number,
		message: `I created draft ${draft.request_number} with ${items.length} material line${items.length === 1 ? '' : 's'}. Review it in Orders before submitting; nothing was submitted.`,
	}
}

async function insertStrictCatalogDraftItems(
	supabase: AuthedSupabase,
	customerId: string,
	draftId: string,
	items: QuoteRequestItemInput[],
	productNotOrderableMessage: string,
): Promise<string | null> {
	try {
		await insertQuoteRequestItems(supabase, draftId, items, {
			requireOrderableProductLinks: true,
		})
		return null
	} catch (error) {
		let cleanedDraft = true
		try {
			await deleteDraftIds(supabase, customerId, [draftId])
		} catch {
			cleanedDraft = false
		}
		if (
			cleanedDraft &&
			error instanceof Error &&
			error.message === QUOTE_REQUEST_ITEM_PRODUCT_NOT_ORDERABLE
		) {
			return productNotOrderableMessage
		}
		throw error
	}
}

async function duplicateOrderToDraft(
	supabase: AuthedSupabase,
	customerId: string,
	route: PortalCustomerToolRequest,
): Promise<DraftWriteContext> {
	const source = await findSourceQuoteRequest(
		supabase,
		customerId,
		route.targetReference,
	)
	if (!source) {
		return {
			message:
				'I could not find a matching past order or quote request in your customer account.',
		}
	}
	const sourceItems = (source.quote_request_items ?? [])
		.slice()
		.sort((a, b) => a.sort_order - b.sort_order)
	if (sourceItems.length === 0) {
		return {
			message:
				'I found the source record, but it has no material lines to copy into a draft.',
		}
	}
	const items = sourceItems.map(toDraftMaterialItem)
	if (items.some((item) => !item.productId)) {
		return {
			message:
				'I found the source record, but it contains text-only or unmatched material lines. I did not create a new draft because Portal AI drafts must use real orderable catalog products.',
		}
	}

	const { data: draft, error } = await supabase
		.from('quote_requests')
		.insert({
			attachment_urls: source.attachment_urls ?? [],
			customer_id: customerId,
			delivery_address_id: source.delivery_address_id,
			delivery_date: source.delivery_date,
			draft_name:
				route.draftName ??
				source.draft_name ??
				`Copy of ${source.request_number}`,
			notes: source.notes,
			project_id: source.project_id,
			status: 'draft',
			urgency: source.urgency,
		})
		.select('id, request_number')
		.single()
	if (error || !draft)
		throw new Error(error?.message ?? 'Failed to duplicate draft')

	const insertFailure = await insertStrictCatalogDraftItems(
		supabase,
		customerId,
		draft.id,
		items.map((item, index) => ({
			customerDescription: item.name,
			isUnmatched: false,
			matchConfidence: sourceItems[index]?.match_confidence ?? undefined,
			notes: item.notes,
			productId: item.productId,
			quantity: item.qty,
			sortOrder: index,
			unitOfMeasure: item.unit,
			unitOfMeasureAr: item.unitAr,
		})),
		'I found the source record, but one or more products is no longer orderable. I did not create a new draft.',
	)
	if (insertFailure) return { message: insertFailure }

	await recordDraftSavedActivity(supabase, draft.id, {
		item_count: items.length,
		operation: 'portal_ai_duplicate',
		source_quote_request_id: source.id,
	})

	return {
		draftId: draft.id,
		editRoute: `/orders/edit/${draft.id}`,
		items,
		reference: draft.request_number,
		message: `I copied ${source.request_number} into new draft ${draft.request_number}. Review it before submitting; the original record was not changed.`,
	}
}

async function updateDraftMetadata(
	supabase: AuthedSupabase,
	customerId: string,
	route: PortalCustomerToolRequest,
	userText: string,
): Promise<DraftWriteContext> {
	const draft = await findEditableDraft(
		supabase,
		customerId,
		route.targetReference,
	)
	if (!draft)
		return {
			message: 'I could not find an editable draft in your customer account.',
		}
	const draftName =
		route.draftName ?? inferredDraftNameFromText(userText) ?? draft.draft_name
	const draftNotes = route.draftNotes
	const update: Record<string, string | null> = {}
	if (draftName !== draft.draft_name) update.draft_name = draftName
	if (draftNotes !== undefined) update.notes = draftNotes

	if (Object.keys(update).length > 0) {
		const { error } = await supabase
			.from('quote_requests')
			.update(update)
			.eq('id', draft.id)
			.eq('customer_id', customerId)
			.eq('status', 'draft')
		if (error) throw new Error(error.message)
	}

	await recordDraftSavedActivity(supabase, draft.id, {
		operation: 'portal_ai_metadata_update',
	})

	return {
		draftId: draft.id,
		editRoute: `/orders/edit/${draft.id}`,
		reference: draft.request_number,
		renamed:
			draftName && draftName !== draft.draft_name
				? [{ from: draft.draft_name ?? draft.request_number, to: draftName }]
				: [],
		message: `I updated draft ${draft.request_number}. It is still only a draft; review it before submitting.`,
	}
}

async function cleanupDrafts(
	supabase: AuthedSupabase,
	customerId: string,
	route: PortalCustomerToolRequest,
): Promise<DraftWriteContext> {
	const drafts = await loadEditableDrafts(supabase, customerId)
	if (drafts.length === 0)
		return { message: 'You do not have any editable drafts to clean up.' }

	const mode = route.cleanupMode ?? 'remove_empty'
	if (mode === 'merge') {
		const sourceDrafts = drafts.filter(
			(draft) => (draft.quote_request_items ?? []).length > 0,
		)
		if (sourceDrafts.length <= 1) {
			return {
				kept: drafts.map((draft) => draft.request_number),
				message:
					'There is only one non-empty editable draft, so I did not merge anything.',
			}
		}
		const items = sourceDrafts.flatMap((draft) =>
			(draft.quote_request_items ?? []).map(toDraftMaterialItem),
		)
		if (items.some((item) => !item.productId)) {
			return {
				kept: drafts.map((draft) => draft.request_number),
				message:
					'I did not merge the drafts because at least one material line is text-only or unmatched. Portal AI merge drafts must keep real orderable catalog product links.',
			}
		}
		const { data: mergedDraft, error } = await supabase
			.from('quote_requests')
			.insert({
				attachment_urls: [],
				customer_id: customerId,
				draft_name: route.draftName ?? 'Merged Portal AI draft',
				notes: 'Merged by Portal AI from editable drafts.',
				status: 'draft',
				urgency: 'standard',
			})
			.select('id, request_number')
			.single()
		if (error || !mergedDraft) {
			throw new Error(error?.message ?? 'Failed to merge drafts')
		}
		const insertFailure = await insertStrictCatalogDraftItems(
			supabase,
			customerId,
			mergedDraft.id,
			items.map((item, index) => ({
				customerDescription: item.name,
				isUnmatched: false,
				notes: item.notes,
				productId: item.productId,
				quantity: item.qty,
				sortOrder: index,
				unitOfMeasure: item.unit,
				unitOfMeasureAr: item.unitAr,
			})),
			'I did not merge the drafts because at least one product is no longer orderable. The original drafts were left unchanged.',
		)
		if (insertFailure) {
			return {
				kept: drafts.map((draft) => draft.request_number),
				message: insertFailure,
			}
		}
		await deleteDraftIds(
			supabase,
			customerId,
			sourceDrafts.map((draft) => draft.id),
		)
		await recordDraftSavedActivity(supabase, mergedDraft.id, {
			item_count: items.length,
			operation: 'portal_ai_merge',
			source_count: sourceDrafts.length,
		})
		return {
			deleted: sourceDrafts.map((draft) => draft.request_number),
			draftId: mergedDraft.id,
			editRoute: `/orders/edit/${mergedDraft.id}`,
			items,
			merged: sourceDrafts.map((draft) => draft.request_number),
			reference: mergedDraft.request_number,
			message: `I merged ${sourceDrafts.length} editable drafts into ${mergedDraft.request_number} and removed only the old draft records.`,
		}
	}

	const draftsToDelete =
		mode === 'delete_all'
			? drafts
			: drafts.filter((draft) => (draft.quote_request_items ?? []).length === 0)
	if (draftsToDelete.length > 0) {
		await deleteDraftIds(
			supabase,
			customerId,
			draftsToDelete.map((draft) => draft.id),
		)
	}
	const kept = drafts
		.filter(
			(draft) => !draftsToDelete.some((deleted) => deleted.id === draft.id),
		)
		.map((draft) => draft.request_number)

	return {
		deleted: draftsToDelete.map((draft) => draft.request_number),
		kept,
		message:
			draftsToDelete.length > 0
				? `I removed ${draftsToDelete.length} editable draft${draftsToDelete.length === 1 ? '' : 's'} and did not touch submitted or confirmed records.`
				: 'I did not find any empty editable drafts to remove.',
	}
}

async function deleteDraft(
	supabase: AuthedSupabase,
	customerId: string,
	route: PortalCustomerToolRequest,
): Promise<DraftWriteContext> {
	const draft = await findEditableDraft(
		supabase,
		customerId,
		route.targetReference,
	)
	if (!draft)
		return { message: 'I could not find an editable draft to delete.' }
	await deleteDraftIds(supabase, customerId, [draft.id])
	return {
		deleted: [draft.request_number],
		message: `I deleted draft ${draft.request_number}. Submitted and confirmed records were not touched.`,
	}
}

async function findSourceQuoteRequest(
	supabase: AuthedSupabase,
	customerId: string,
	targetReference?: string,
): Promise<QuoteRequestRow | null> {
	const draftsAndOrders = await loadQuoteRequestRows(supabase, customerId, 80)
	if (targetReference) {
		const match = draftsAndOrders.find((row) => {
			const order = firstRelation(row.orders)
			return (
				referenceEquals(row.request_number, targetReference) ||
				referenceEquals(row.id, targetReference) ||
				(order
					? referenceEquals(order.order_number, targetReference) ||
						referenceEquals(order.id, targetReference)
					: false)
			)
		})
		if (match) return match
	}
	return (
		draftsAndOrders.find((row) => row.status !== 'draft') ??
		draftsAndOrders[0] ??
		null
	)
}

async function findEditableDraft(
	supabase: AuthedSupabase,
	customerId: string,
	targetReference?: string,
): Promise<QuoteRequestRow | null> {
	const drafts = await loadEditableDrafts(supabase, customerId)
	if (targetReference) {
		return (
			drafts.find((draft) => {
				return (
					referenceEquals(draft.request_number, targetReference) ||
					referenceEquals(draft.id, targetReference) ||
					(draft.draft_name
						? referenceEquals(draft.draft_name, targetReference)
						: false)
				)
			}) ?? null
		)
	}
	return drafts[0] ?? null
}

async function loadEditableDrafts(
	supabase: AuthedSupabase,
	customerId: string,
): Promise<QuoteRequestRow[]> {
	const rows = await loadQuoteRequestRows(supabase, customerId, 80)
	return rows.filter((row) => row.status === 'draft')
}

async function loadQuoteRequestRows(
	supabase: AuthedSupabase,
	customerId: string,
	limit: number,
): Promise<QuoteRequestRow[]> {
	const { data, error } = await supabase
		.from('quote_requests')
		.select(
			`
			id,
			request_number,
			status,
			created_at,
			submitted_at,
			draft_name,
			notes,
			urgency,
			project_id,
			delivery_address_id,
			delivery_date,
			attachment_urls,
			quote_request_items (
				id,
				product_id,
				customer_description,
				product_name_ar,
				quantity,
				unit_of_measure,
				unit_of_measure_ar,
				notes,
				match_confidence,
				sort_order,
				is_unmatched,
				products (
					id,
					name,
					name_ar,
					category,
					image_urls
				)
			),
			orders (
				id,
				order_number,
				status,
				total_amount,
				created_at,
				delivered_at,
				quote_request_id
			)
		`,
		)
		.eq('customer_id', customerId)
		.order('created_at', { ascending: false })
		.limit(limit)
	if (error) throw new Error(error.message)
	return (data ?? []) as unknown as QuoteRequestRow[]
}

async function deleteDraftIds(
	supabase: AuthedSupabase,
	customerId: string,
	draftIds: string[],
) {
	if (draftIds.length === 0) return
	const { error } = await supabase
		.from('quote_requests')
		.delete()
		.eq('customer_id', customerId)
		.eq('status', 'draft')
		.in('id', draftIds)
	if (error) throw new Error(error.message)
}

async function recordDraftSavedActivity(
	supabase: AuthedSupabase,
	quoteRequestId: string,
	context: Record<string, unknown>,
) {
	const { error } = await supabase.rpc(
		'customer_record_quote_request_draft_saved',
		{
			p_context: context,
			p_quote_request_id: quoteRequestId,
			p_source: 'portal',
		},
	)
	if (error) throw new Error(error.message)
}

function toCustomerOrderSummary(row: QuoteRequestRow): CustomerOrderSummary {
	const order = firstRelation(row.orders)
	const items = (row.quote_request_items ?? [])
		.slice()
		.sort((a, b) => a.sort_order - b.sort_order)
		.map(toDraftMaterialItem)
	const status = order?.status ?? row.status
	const reference = order?.order_number ?? row.request_number
	const description =
		items
			.slice(0, 3)
			.map((item) => item.name)
			.join(', ') ||
		row.notes ||
		reference
	return {
		amount: order?.total_amount ?? null,
		date: row.submitted_at ?? order?.created_at ?? row.created_at,
		description,
		id: row.id,
		itemCount: items.length,
		items,
		linkedOrderId: order?.id ?? null,
		name: row.draft_name,
		reference,
		requestReference: row.request_number,
		status,
		type: order
			? 'confirmed'
			: row.status === 'draft' || row.status === 'saved'
				? 'draft'
				: 'submitted',
	}
}

function toDraftMaterialItem(item: QuoteRequestItemRow): DraftMaterialItem {
	const product = firstRelation(item.products)
	const name = item.customer_description || product?.name || item.id
	return {
		name,
		nameAr: item.product_name_ar || product?.name_ar || name,
		notes: item.notes ?? undefined,
		productId: item.product_id ?? undefined,
		qty: item.quantity,
		unit: item.unit_of_measure,
		unitAr: item.unit_of_measure_ar || item.unit_of_measure,
	}
}

function buildDraftItemsFromPlan(
	userText: string,
	products: PortalAiProduct[],
): DraftMaterialItem[] {
	const quantity = parseRequestedQuantity(userText) ?? 1
	if (products.length === 0) return []
	if (isOpenEndedCatalogSelectionRequest(userText)) {
		return products.slice(0, OPEN_ENDED_DRAFT_ITEM_COUNT).map((product) => ({
			name: product.name,
			nameAr: product.name_ar ?? product.name,
			notes: 'Selected from available catalog products by Portal AI',
			productId: product.id,
			qty: quantity,
			unit: product.unit_of_measure,
			unitAr: product.unit_of_measure_ar,
		}))
	}
	const normalizedText = normalizeForMatch(userText)
	const matches = products.filter((product) => {
		const tokens = [
			product.name,
			product.name_ar ?? '',
			product.category,
			product.subcategory ?? '',
			product.sku,
		]
			.flatMap((value) => normalizeForMatch(value).split(' '))
			.filter((token) => token.length > 2)
		return tokens.some((token) => normalizedText.includes(token))
	})
	const selected =
		matches.length > 0 ? matches.slice(0, 4) : products.slice(0, 1)
	return selected.map((product) => ({
		name: product.name,
		nameAr: product.name_ar ?? product.name,
		notes: 'Matched from published catalog by Portal AI for customer review',
		productId: product.id,
		qty: quantity,
		unit: product.unit_of_measure,
		unitAr: product.unit_of_measure_ar,
	}))
}

function findOrderByReference(
	orders: CustomerOrderSummary[],
	targetReference?: string,
): CustomerOrderSummary | null {
	if (!targetReference) return orders[0] ?? null
	return (
		orders.find((order) => orderMatchesReference(order, targetReference)) ??
		null
	)
}

function orderMatchesReference(
	order: CustomerOrderSummary,
	targetReference?: string,
): boolean {
	if (!targetReference) return false
	return (
		referenceEquals(order.id, targetReference) ||
		referenceEquals(order.reference, targetReference) ||
		referenceEquals(order.requestReference, targetReference) ||
		(order.linkedOrderId
			? referenceEquals(order.linkedOrderId, targetReference)
			: false)
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
				available: isCustomerVisibleAvailable(product),
				id: product.id,
				image: product.image_urls?.[0],
				name: product.name,
				nameAr: product.name_ar ?? product.name,
				priceRange: formatPriceRange(product, 'en'),
				priceRangeAr: formatPriceRange(product, 'ar'),
				specs: specsForCard(product.specifications),
				specsAr: specsForCard(product.specifications_ar),
			},
		},
	}
}

function statusCardEvent(order: CustomerOrderSummary): StreamChunk {
	const createdDate = order.date.slice(0, 10)
	const delivered = order.status === 'delivered'
	const active = [
		'submitted',
		'confirmed',
		'order_confirmed',
		'being_prepared',
		'out_for_delivery',
	].includes(order.status)
	return {
		type: 'CUSTOM' as const,
		timestamp: Date.now(),
		name: 'rich_message',
		value: {
			type: 'status_card',
			data: {
				displayNumber: order.reference,
				entityId: order.linkedOrderId ?? order.id,
				entityType: order.linkedOrderId ? 'order' : 'quote',
				status: order.status.replace(/_/g, ' '),
				statusColor: delivered ? 'green' : active ? 'yellow' : 'red',
				timeline: [
					{ date: createdDate, done: true, label: 'Created' },
					{
						date: createdDate,
						done: order.status !== 'draft',
						label: 'Submitted',
					},
					{
						date: delivered ? createdDate : 'Pending',
						done: delivered,
						label: 'Delivered',
					},
				],
			},
		},
	}
}

function deliveryTrackingEvent(context: DeliveryTrackingContext): StreamChunk {
	const { delivery } = context
	return {
		type: 'CUSTOM' as const,
		timestamp: Date.now(),
		name: 'rich_message',
		value: {
			type: 'delivery_tracking',
			data: {
				deliveryNumber: delivery.deliveryNumber,
				driverName: delivery.driverName,
				driverPhone: delivery.driverPhone,
				estimatedArrival: delivery.estimatedArrival,
				lastUpdated: delivery.lastUpdated,
				orderNumber: delivery.orderNumber,
				route: delivery.route,
				stage: delivery.currentStage,
				truckNumber: delivery.truckNumber,
				vehiclePlate: delivery.vehiclePlate,
			},
		},
	}
}

function materialListEvent(result: DraftWriteContext): StreamChunk {
	return {
		type: 'CUSTOM' as const,
		timestamp: Date.now(),
		name: 'rich_message',
		value: {
			type: 'material_list',
			data: {
				draftId: result.draftId,
				editRoute: result.editRoute,
				items: result.items ?? [],
				reference: result.reference,
			},
		},
	}
}

function draftCleanupEvent(result: DraftWriteContext): StreamChunk {
	return {
		type: 'CUSTOM' as const,
		timestamp: Date.now(),
		name: 'rich_message',
		value: {
			type: 'draft_cleanup_result',
			data: {
				deleted: result.deleted ?? [],
				kept: result.kept ?? [],
				merged: result.merged ?? [],
				reference: result.reference,
				renamed: result.renamed ?? [],
			},
		},
	}
}

function customerOrdersInvalidationEvent(): StreamChunk {
	return {
		type: 'CUSTOM' as const,
		timestamp: Date.now(),
		name: 'portal_cache_invalidation',
		value: { queryKeys: [['customer-orders-all']] },
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
	if (min == null && max == null) {
		return locale === 'ar' ? 'السعر عند الطلب' : 'Request quote'
	}
	if (min != null && max != null) return `EGP ${min} - ${max}/${unit}`
	return `EGP ${min ?? max}/${unit}`
}

function availabilityLabel(
	product: PortalAiProduct,
	locale: 'ar' | 'en',
): string {
	const available = isCustomerVisibleAvailable(product)
	if (locale === 'ar') {
		return available ? 'متاح' : 'غير متاح'
	}
	return available ? 'Available' : 'Unavailable'
}

function isCustomerVisibleAvailable(product: PortalAiProduct): boolean {
	return (
		product.availability_status !== 'hidden' &&
		product.availability_status !== 'out_of_stock'
	)
}

function unitLabel(product: PortalAiProduct, locale: 'ar' | 'en'): string {
	return locale === 'ar' && product.unit_of_measure_ar
		? product.unit_of_measure_ar
		: product.unit_of_measure
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

async function supplierPortalChunks(
	userText: string,
	modelMessages: ChatMessageInput[],
): Promise<StreamChunk[]> {
	const simpleAnswer = simplePortalTextAnswer(userText, 'supplier')
	if (simpleAnswer) return textOnlyChunks(simpleAnswer, [])

	if (isAIEnabled())
		return streamWithCustomEvents(modelMessages, LYON_PORTAL, [])
	const lower = userText.toLowerCase()
	const key = lower.includes('cement')
		? 'cement'
		: lower.includes('rebar') || lower.includes('steel')
			? 'rebar'
			: lower.includes('order') || lower.includes('po')
				? 'order'
				: lower.includes('track')
					? 'track'
					: lower.includes('price')
						? 'price'
						: lower.includes('stock')
							? 'stock'
							: lower.includes('help')
								? 'help'
								: 'default'
	return textOnlyChunks(
		SUPPLIER_RESPONSES[key] ?? SUPPLIER_RESPONSES.default,
		[],
	)
}

async function streamWithCustomEvents(
	messages: ChatMessageInput[],
	systemPrompt: string,
	customEvents: StreamChunk[],
): Promise<StreamChunk[]> {
	const chunks: StreamChunk[] = []
	let finishChunk: StreamChunk | null = null
	for await (const chunk of streamChat(messages, systemPrompt)) {
		if (chunk.type === 'RUN_FINISHED') {
			finishChunk = chunk
			continue
		}
		chunks.push(chunk)
	}
	chunks.push(...customEvents)
	if (finishChunk) chunks.push(finishChunk)
	return chunks
}

function textOnlyChunks(
	text: string,
	customEvents: StreamChunk[],
): StreamChunk[] {
	const runId = crypto.randomUUID()
	const messageId = crypto.randomUUID()
	return [
		{ type: 'RUN_STARTED' as const, timestamp: Date.now(), runId },
		{
			type: 'TEXT_MESSAGE_START' as const,
			timestamp: Date.now(),
			messageId,
			role: 'assistant' as const,
		},
		{
			type: 'TEXT_MESSAGE_CONTENT' as const,
			timestamp: Date.now(),
			messageId,
			delta: text,
		},
		{ type: 'TEXT_MESSAGE_END' as const, timestamp: Date.now(), messageId },
		...customEvents,
		{
			type: 'RUN_FINISHED' as const,
			timestamp: Date.now(),
			runId,
			finishReason: 'stop' as const,
		},
	]
}

function recentRouteMessages(messages: ChatMessageInput[]): ChatMessageInput[] {
	return messages.slice(-6).map((message) => ({
		role: message.role,
		content: message.content.slice(0, 1200),
	}))
}

function modelChatMessages(messages: ChatMessageInput[]): ChatMessageInput[] {
	return messages.slice(-MODEL_CHAT_MESSAGES).map((message) => ({
		role: message.role,
		content: message.content.slice(0, MODEL_CHAT_MESSAGE_CHARACTERS),
	}))
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

function productSearchTerm(userText: string): string {
	if (isOpenEndedCatalogSelectionRequest(userText)) return ''
	const normalized = normalizeForMatch(userText)
	const knownTerms = [
		['cement', 'cement'],
		['اسمنت', 'cement'],
		['أسمنت', 'cement'],
		['rebar', 'steel'],
		['steel', 'steel'],
		['metal', 'steel'],
		['metals', 'steel'],
		['حديد', 'steel'],
		['معدن', 'steel'],
		['معادن', 'steel'],
		['concrete', 'concrete'],
		['sand', 'sand'],
		['رمل', 'sand'],
		['brick', 'brick'],
		['طوب', 'brick'],
		['tile', 'tile'],
		['سيراميك', 'tile'],
		['wood', 'wood'],
		['timber', 'wood'],
		['lumber', 'wood'],
		['خشب', 'wood'],
	] as const
	for (const [needle, replacement] of knownTerms) {
		if (normalized.includes(normalizeForMatch(needle))) return replacement
	}
	return userText.slice(0, 120)
}

function productIntentTerms(userText: string): string[] {
	const normalized = normalizeForMatch(userText)
	const terms = new Set(productPlanningTerms(userText))
	const addTerms = (values: string[]) => {
		for (const value of values) {
			const normalizedValue = normalizeForMatch(value)
			if (normalizedValue) terms.add(normalizedValue)
		}
	}
	const synonymGroups = [
		['wood', 'timber', 'lumber', 'plywood', 'board', 'خشب'],
		['steel', 'rebar', 'metal', 'metals', 'حديد', 'معدن', 'معادن'],
		['cement', 'opc', 'src', 'اسمنت', 'أسمنت'],
		['concrete', 'خرسانة'],
		['sand', 'aggregate', 'gravel', 'رمل', 'زلط'],
		['brick', 'block', 'bricks', 'طوب'],
		['tile', 'tiles', 'ceramic', 'سيراميك'],
		['paint', 'coating', 'sealant', 'دهان', 'بويات'],
	]
	for (const group of synonymGroups) {
		if (group.some((term) => normalized.includes(normalizeForMatch(term)))) {
			addTerms(group)
		}
	}
	const query = productSearchTerm(userText)
	if (query) addTerms(query.split(/\s+/))
	addTerms(
		normalized
			.split(' ')
			.filter(
				(token) => token.length > 2 && !PRODUCT_INTENT_STOP_WORDS.has(token),
			)
			.slice(0, 24),
	)
	return Array.from(terms)
}

const PRODUCT_INTENT_STOP_WORDS = new Set([
	'about',
	'add',
	'available',
	'catalog',
	'catalogue',
	'create',
	'draft',
	'for',
	'from',
	'items',
	'make',
	'material',
	'materials',
	'need',
	'order',
	'plan',
	'please',
	'product',
	'products',
	'quote',
	'real',
	'review',
	'search',
	'the',
	'this',
	'want',
	'with',
	'عايز',
	'عايزه',
	'محتاج',
	'مواد',
	'منتج',
	'منتجات',
	'متاح',
	'مسودة',
])

function productPlanningTerms(userText: string): string[] {
	const normalized = normalizeForMatch(userText)
	const terms = new Set<string>()
	const addTerms = (values: string[]) => {
		for (const value of values) terms.add(normalizeForMatch(value))
	}

	if (/\b(tree\s*house|treehouse|wood|timber|lumber)\b/.test(normalized)) {
		addTerms([
			'wood',
			'timber',
			'lumber',
			'plywood',
			'board',
			'roof',
			'paint',
			'sealant',
			'screw',
			'nail',
			'bracket',
			'ladder',
			'خشب',
			'دهان',
			'مسامير',
		])
	}
	if (/\b(roof|shed|house|room|villa|warehouse)\b/.test(normalized)) {
		addTerms([
			'cement',
			'concrete',
			'steel',
			'rebar',
			'brick',
			'block',
			'tile',
			'insulation',
			'roof',
			'paint',
			'اسمنت',
			'خرسانة',
			'حديد',
			'طوب',
		])
	}
	if (
		/\b(floor|wall|foundation|deck|platform|stairs?|ladder)\b/.test(normalized)
	) {
		addTerms([
			'cement',
			'concrete',
			'steel',
			'rebar',
			'aggregate',
			'sand',
			'tile',
			'wood',
			'اسمنت',
			'رمل',
			'حديد',
		])
	}
	if (
		/بيت|غرفة|اوضة|سقف|حائط|حيطة|جدار|ارضية|أرضية|سلم|منصة|فيلا|مخزن|خشب/.test(
			userText,
		)
	) {
		addTerms([
			'خشب',
			'اسمنت',
			'حديد',
			'طوب',
			'خرسانة',
			'رمل',
			'دهان',
			'wood',
			'cement',
			'steel',
			'brick',
		])
	}

	return Array.from(terms).filter(Boolean)
}

function rankProductsForPlanning(
	products: PortalAiProduct[],
	terms: string[],
	limit: number,
): PortalAiProduct[] {
	return products
		.map((product) => ({
			product,
			score: productPlanningScore(product, terms),
		}))
		.sort((left, right) => {
			if (right.score !== left.score) return right.score - left.score
			const availability =
				productAvailabilityRank(left.product) -
				productAvailabilityRank(right.product)
			if (availability !== 0) return availability
			return left.product.name.localeCompare(right.product.name)
		})
		.slice(0, limit)
		.map((ranked) => ranked.product)
}

function productPlanningScore(
	product: PortalAiProduct,
	terms: string[],
): number {
	const searchable = normalizeForMatch(
		[
			product.name,
			product.name_ar ?? '',
			product.sku,
			product.category,
			product.subcategory ?? '',
			product.subcategory_ar ?? '',
			product.description ?? '',
			product.description_ar ?? '',
			JSON.stringify(product.specifications ?? {}),
			JSON.stringify(product.specifications_ar ?? {}),
		].join(' '),
	)
	let score = isCustomerVisibleAvailable(product) ? 2 : 0
	if (product.availability_status === 'out_of_stock') score -= 2
	for (const term of terms) {
		if (term.length > 1 && searchable.includes(term)) {
			score += term.length + 8
		}
	}
	return score
}

function productAvailabilityRank(product: PortalAiProduct): number {
	if (isCustomerVisibleAvailable(product)) return 0
	if (product.availability_status === 'out_of_stock') return 2
	return 3
}

function isOpenEndedCatalogSelectionRequest(userText: string): boolean {
	const normalized = normalizeForMatch(userText)
	const broadChoice =
		/\b(random|any|surprise|sample|something|whatever)\b/.test(normalized) ||
		/عشوائي|اي حاجه|اي حاجة/.test(userText)
	const catalogChoice =
		/\b(pick|choose|select|recommend|suggest|available|catalog|catalogue)\b/.test(
			normalized,
		) || /اختار|رشح|متاح|كتالوج/.test(userText)
	return (
		broadChoice ||
		(catalogChoice && !hasSpecificCatalogMaterialTerm(normalized, userText))
	)
}

function hasSpecificCatalogMaterialTerm(
	normalizedText: string,
	rawText: string,
): boolean {
	return (
		/\b(cement|rebar|steel|metals?|concrete|sand|aggregate|bricks?|paints?|tiles?)\b/.test(
			normalizedText,
		) ||
		/اسمنت|أسمنت|حديد|معدن|معادن|خرسانة|رمل|طوب|بويات|سيراميك/.test(rawText)
	)
}

function deterministicProductSample(
	products: PortalAiProduct[],
	seedText: string,
	count: number,
): PortalAiProduct[] {
	return products
		.slice()
		.sort((left, right) => {
			return (
				hashText(`${seedText}:${left.id}`) - hashText(`${seedText}:${right.id}`)
			)
		})
		.slice(0, count)
}

function hashText(value: string): number {
	let hash = 0
	for (let index = 0; index < value.length; index += 1) {
		hash = (hash * 31 + value.charCodeAt(index)) >>> 0
	}
	return hash
}

function parseRequestedQuantity(userText: string): number | null {
	const match = userText.match(/\b(\d+(?:\.\d+)?)\b/)
	if (!match) return null
	const value = Number.parseFloat(match[1])
	if (!Number.isFinite(value) || value <= 0) return null
	return Math.min(value, 1_000_000)
}

function materialDescriptionFromText(userText: string): string {
	const cleaned = userText
		.replace(
			/\b(create|make|start|build|prepare|draft|quote|request|rfq|for|me|please)\b/gi,
			' ',
		)
		.replace(/\s+/g, ' ')
		.trim()
	return cleaned.slice(0, 120) || 'Estimated material'
}

function defaultDraftName(userText: string, locale: 'ar' | 'en'): string {
	if (isOpenEndedCatalogSelectionRequest(userText)) {
		return locale === 'ar'
			? 'مسودة اختيار من الكتالوج'
			: 'Catalog selection draft'
	}
	if (locale === 'ar') return 'مسودة من ليون'
	const firstMaterial = materialDescriptionFromText(userText)
		.split(/[,.]/)[0]
		?.trim()
	return firstMaterial
		? `Draft: ${firstMaterial.slice(0, 80)}`
		: 'Portal AI draft'
}

function inferredDraftNameFromText(userText: string): string | null {
	const quoted = userText.match(/["“”']([^"“”']{1,120})["“”']/)?.[1]
	if (quoted) return quoted.trim()
	const match = userText.match(/\b(?:to|as)\s+([A-Za-z0-9 _./-]{2,120})$/i)?.[1]
	return match?.trim() ?? null
}

function normalizeForMatch(value: string): string {
	return value
		.toLowerCase()
		.normalize('NFKD')
		.replace(/[إأآٱ]/g, 'ا')
		.replace(/ى/g, 'ي')
		.replace(/ة/g, 'ه')
		.replace(/[^\p{L}\p{N}\s]+/gu, ' ')
		.replace(/\s+/g, ' ')
		.trim()
}

function referenceEquals(left: string, right: string): boolean {
	return normalizeReference(left) === normalizeReference(right)
}

function normalizeReference(value: string): string {
	return value.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
	if (Array.isArray(value)) return value[0] ?? null
	return value ?? null
}

function safeJson(value: unknown): string {
	return JSON.stringify(value, null, 2).slice(0, 14_000)
}

async function recordPortalAiAudit(
	supabase: AuthedSupabase,
	customerId: string,
	userText: string,
	chunks: StreamChunk[],
	result: PortalToolResult,
) {
	const response = chunks
		.filter((chunk) => chunk.type === 'TEXT_MESSAGE_CONTENT')
		.map((chunk) => chunk.delta)
		.join('')
	const { error } = await supabase.rpc('record_ai_tool_call', {
		p_agent_scope: 'portal',
		p_approved_by_user: isDraftWriteAction(result.route.action),
		p_input_summary: {
			customer_id: customerId,
			prompt: userText.slice(0, 240),
			route: result.route.action,
		},
		p_output_summary: {
			response: response.slice(0, 240),
		},
		p_read_entities: result.readEntities,
		p_tool_name: `portal_customer_${result.route.action}`,
		p_write_entity_id: result.writeEntityId,
		p_write_entity_type: result.writeEntityType,
	})
	if (error) throw new Error(error.message)
}
