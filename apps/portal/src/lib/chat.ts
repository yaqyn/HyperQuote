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
import type {
	ActionButtonData,
	ActiveChatDraftContext,
	CommandPaletteData,
	SupportOptionsData,
} from './chat-types'
import {
	customerDeliveryDestinationPlace,
	describeDriverLocationForCustomer,
	formatDeliveryTimestamp,
} from './delivery-location-copy'
import {
	draftProductIntentTerms,
	isOpenEndedCatalogSelectionRequest,
	productIntentTerms,
	productSearchTerm,
} from './portal-catalog-intent'
import { portalChatCommandPaletteGroups } from './portal-chat-commands'
import {
	buildPortalCustomerAgentPrompt,
	detectPortalAiLocale,
	enforcePortalCustomerToolRequest,
	fallbackPortalCustomerToolRequest,
	inferDraftItemEdit,
	isDraftWriteAction,
	type PortalCustomerCatalogSnapshot,
	type PortalCustomerToolRequest,
	parsePortalCustomerToolRequest,
	portalCustomerActionNeedsConfirmation,
	portalCustomerPolicyRefusal,
	routePortalChatCommand,
} from './portal-customer-agent'
import {
	isLegacyGeneratedDraftTitle,
	normalizePortalDraftNotes,
	normalizePortalDraftTitle,
} from './portal-draft-copy'
import {
	type EditableDraftDescriptor,
	editableDraftDescriptorFromText,
	editableDraftDescriptorLabel,
} from './portal-draft-targeting'
import {
	orderMatchesPortalScope,
	type PortalCustomerOrderScope,
	portalOrderScopeTitle,
} from './portal-order-scope'
import { getAuthenticatedPortalCustomer } from './server/_supabase'
import {
	type DeliveryInfo,
	getCustomerDeliveryTracking,
} from './server/deliveries'
import {
	assertQuoteRequestItemsHaveOrderableProductLinks,
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
const WEBSITE_URL = (
	import.meta.env.VITE_WEBSITE_URL ?? 'https://www.hyperquote.net'
).replace(/\/+$/, '')
const SUPPORT_EMAIL =
	import.meta.env.VITE_SUPPORT_EMAIL ?? 'support@hyperquote.net'
const SUPPORT_PHONE_E164 = import.meta.env.VITE_SUPPORT_PHONE_E164 ?? ''
const PRODUCT_CATALOG_RESULT_COUNT = 12
const SALES_QUOTE_ADDRESS_LABEL = 'Sales quote site'

const activeDraftInput = z
	.object({
		id: z.string().uuid().nullable(),
		items: z
			.array(
				z.object({
					productName: z.string().max(240),
					productNameAr: z.string().max(240).optional(),
					quantity: z.number().min(0).max(1_000_000),
					unitOfMeasure: z.string().max(80),
				}),
			)
			.max(40),
		name: z.string().max(160).nullable(),
		notes: z.string().max(600),
		reference: z.string().max(80).nullable(),
	})
	.nullable()
	.optional()

const portalChatInput = z.object({
	activeDraft: activeDraftInput,
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
	products: QuoteRequestItemProduct | QuoteRequestItemProduct[] | null
}

interface QuoteRequestItemProduct {
	availability_status: string
	category: string
	id: string
	image_urls: string[] | null
	is_active: boolean
	name: string
	name_ar: string | null
}

interface QuoteRequestAddressRow {
	area: string | null
	city: string
	governorate: string
	id: string
	label: string | null
	landmark: string | null
	latitude: number | string | null
	longitude: number | string | null
	street: string
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
	customer_addresses: QuoteRequestAddressRow | QuoteRequestAddressRow[] | null
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

interface ActivityEventRow {
	action: string
	created_at: string
	details: Record<string, unknown> | null
	entity_type: string
	id: string
}

interface SupportTicketRow {
	created_at: string
	id: string
	reference: string
	status: string
	subject: string
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
	siteAddress: CustomerOrderSiteAddress | null
}

interface DraftMaterialItem {
	name: string
	nameAr: string
	notes?: string
	orderable?: boolean
	productId?: string
	qty: number
	unit: string
	unitAr: string
}

interface CustomerOrderSiteAddress {
	fullAddress: string
	latitude: number | null
	longitude: number | null
	source: 'sales_quote_site'
}

interface DeliveryTrackingContext {
	delivery: DeliveryInfo
	order: CustomerOrderSummary
}

interface DraftValidationContext {
	draft: CustomerOrderSummary | null
	issues: string[]
	unavailableItems: DraftMaterialItem[]
}

interface AccountHealthContext {
	addresses: CustomerAddressRow[]
	draftCount: number
	issues: string[]
	orders: CustomerOrderSummary[]
	profile: CustomerProfileRow
	projects: CustomerProjectRow[]
	staleDrafts: CustomerOrderSummary[]
}

interface SupportRequestContext {
	message?: string
	ticket: SupportTicketRow | null
}

interface PendingActionContext {
	actions: ActionButtonData[]
	message: string
	title: string
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
	| {
			orderScope: PortalCustomerOrderScope
			orders: CustomerOrderSummary[]
			type: 'orders'
	  }
	| {
			type: 'order_detail'
			documents: DocumentRow[]
			order: CustomerOrderSummary | null
	  }
	| { type: 'delivery_tracking'; tracking: DeliveryTrackingContext | null }
	| { type: 'delivery_list'; deliveries: DeliveryTrackingContext[] }
	| {
			catalogComplete: boolean
			locale: 'ar' | 'en'
			products: PortalAiProduct[]
			query: string
			totalVisibleProducts: number
			type: 'products'
	  }
	| { type: 'addresses'; addresses: CustomerAddressRow[] }
	| { type: 'projects'; projects: CustomerProjectRow[] }
	| { type: 'account_health'; health: AccountHealthContext }
	| { type: 'draft_validation'; validation: DraftValidationContext }
	| {
			type: 'order_activity'
			events: ActivityEventRow[]
			order: CustomerOrderSummary | null
	  }
	| ({ type: 'pending_action' } & PendingActionContext)
	| ({ type: 'support_request' } & SupportRequestContext)
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

		const activeDraft = input.activeDraft ?? null
		const baseRoute =
			routePortalChatCommand(userText) ??
			(await requestPortalCustomerTool(
				modelMessages,
				userText,
				await loadVisibleProductCatalog(
					supabase,
					PRODUCT_CATALOG_CONTEXT_LIMIT,
				),
				activeDraft,
			))
		const route = applyActiveDraftContextToRoute(
			baseRoute,
			userText,
			activeDraft,
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
	activeDraft: ActiveChatDraftContext | null,
): Promise<PortalCustomerToolRequest> {
	const safeFallback = fallbackPortalCustomerToolRequest(userText)
	if (safeFallback.action === 'refuse') return safeFallback

	if (!(await isAIEnabled())) return safeFallback

	try {
		const rawRoute = await completeChat(
			recentRouteMessages(messages),
			buildPortalCustomerAgentPrompt(
				toAgentCatalogSnapshot(catalog),
				activeDraft,
			),
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

function applyActiveDraftContextToRoute(
	route: PortalCustomerToolRequest,
	userText: string,
	activeDraft: ActiveChatDraftContext | null,
): PortalCustomerToolRequest {
	if (!activeDraft?.id || !draftRouteCanUseActiveContext(route.action)) {
		return route
	}
	if (route.targetReference) {
		return isCurrentDraftReference(route.targetReference)
			? { ...route, targetReference: activeDraft.id }
			: route
	}

	const routeText = [route.searchQuery, userText].filter(Boolean).join(' ')
	const descriptor = editableDraftDescriptorFromText(routeText)
	const activeMatchesDescriptor =
		!descriptor.specific ||
		activeDraftMatchesDescriptor(activeDraft, descriptor)
	const canUseActiveForLineTarget =
		route.action === 'draft_replace_item' &&
		Boolean(
			route.itemQuery && activeDraftHasItemQuery(activeDraft, route.itemQuery),
		)
	const canUseActiveForDraftMutation =
		(route.action === 'draft_add_items' ||
			route.action === 'draft_set_delivery') &&
		(!descriptor.specific || activeMatchesDescriptor)
	if (
		activeMatchesDescriptor ||
		canUseActiveForLineTarget ||
		canUseActiveForDraftMutation
	) {
		return { ...route, targetReference: activeDraft.id }
	}
	return route
}

function draftRouteCanUseActiveContext(
	action: PortalCustomerToolRequest['action'],
): boolean {
	return (
		action === 'draft_detail' ||
		action === 'draft_validate' ||
		action === 'draft_add_items' ||
		action === 'draft_replace_item' ||
		action === 'draft_set_delivery' ||
		action === 'update_draft_items' ||
		action === 'update_draft_metadata'
	)
}

function isCurrentDraftReference(value: string): boolean {
	return /^(active|current|open|opened|selected|this|that|it|them|draft)$/i.test(
		value.trim(),
	)
}

function activeDraftMatchesDescriptor(
	activeDraft: ActiveChatDraftContext,
	descriptor: EditableDraftDescriptor,
): boolean {
	const activeText = normalizeForMatch(
		[
			activeDraft.reference ?? '',
			activeDraft.name ?? '',
			activeDraft.notes,
			...activeDraft.items.flatMap((item) => [
				item.productName,
				item.productNameAr ?? '',
				String(item.quantity),
				item.unitOfMeasure,
			]),
		].join(' '),
	)
	if (
		descriptor.quantities.length > 0 &&
		!activeDraft.items.some((item) =>
			descriptor.quantities.some((quantity) =>
				quantitiesEqual(item.quantity, quantity),
			),
		)
	) {
		return false
	}
	if (descriptor.materialTokens.length === 0) return true
	return descriptor.materialTokens.every((token) => activeText.includes(token))
}

function activeDraftHasItemQuery(
	activeDraft: ActiveChatDraftContext,
	itemQuery: string,
): boolean {
	const tokens = normalizeForMatch(itemQuery)
		.split(' ')
		.filter((token) => token.length > 2)
	if (tokens.length === 0) return false
	return activeDraft.items.some((item) => {
		const itemText = normalizeForMatch(
			[
				item.productName,
				item.productNameAr ?? '',
				item.unitOfMeasure,
				String(item.quantity),
			].join(' '),
		)
		return tokens.every((token) => itemText.includes(token))
	})
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
		? 'أهلاً، أنا ليون. نبني، نراجع، ولا نعدّل؟'
		: "Hi, I'm Lyon. What should we build, check, or edit?"
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

	const pendingAction = await pendingActionConfirmation(
		supabase,
		customerId,
		route,
		userText,
	)
	if (pendingAction) {
		return {
			context: { type: 'pending_action', ...pendingAction },
			invalidatesOrders: false,
			readEntities: confirmationReadEntities(route),
			route,
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
		case 'address_list': {
			const context = await loadCustomerProfileContext(supabase, customerId)
			return {
				context: { addresses: context.addresses, type: 'addresses' },
				invalidatesOrders: false,
				readEntities: ['customer_addresses'],
				route,
				writeEntityId: null,
				writeEntityType: null,
			}
		}
		case 'project_list': {
			const context = await loadCustomerProfileContext(supabase, customerId)
			return {
				context: { projects: context.projects, type: 'projects' },
				invalidatesOrders: false,
				readEntities: ['projects'],
				route,
				writeEntityId: null,
				writeEntityType: null,
			}
		}
		case 'account_health': {
			const health = await loadAccountHealthContext(supabase, customerId)
			return {
				context: { health, type: 'account_health' },
				invalidatesOrders: false,
				readEntities: [
					'customer_profile',
					'customer_addresses',
					'projects',
					'customer_quote_requests',
					'customer_orders',
				],
				route,
				writeEntityId: null,
				writeEntityType: null,
			}
		}
		case 'customer_orders': {
			const orderScope = route.orderScope ?? 'all'
			const allOrders = await loadCustomerOrders(supabase, customerId)
			const orders = allOrders.filter((order) =>
				orderMatchesPortalScope(order, orderScope),
			)
			return {
				context: { type: 'orders', orderScope, orders },
				invalidatesOrders: false,
				readEntities: [
					'customer_quote_requests',
					'customer_orders',
					'customer_addresses',
				],
				route,
				writeEntityId: null,
				writeEntityType: null,
			}
		}
		case 'draft_detail': {
			const detail = await loadDraftDetailContext(
				supabase,
				customerId,
				route,
				userText,
			)
			return {
				context: {
					documents: [],
					order: detail.order,
					type: 'order_detail',
				},
				invalidatesOrders: false,
				readEntities: ['customer_quote_requests', 'customer_addresses'],
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
					'customer_addresses',
					'customer_documents',
				],
				route,
				writeEntityId: null,
				writeEntityType: null,
			}
		}
		case 'order_activity': {
			const context = await loadOrderActivityContext(
				supabase,
				customerId,
				route,
			)
			return {
				context: { type: 'order_activity', ...context },
				invalidatesOrders: false,
				readEntities: [
					'customer_quote_requests',
					'customer_orders',
					'customer_addresses',
					'activity_events',
				],
				route,
				writeEntityId: null,
				writeEntityType: null,
			}
		}
		case 'delivery_tracking': {
			if (!route.commandName && !route.targetReference) {
				const deliveries = await loadDeliveryListContext(supabase, customerId)
				return {
					context:
						deliveries.length > 1
							? { deliveries, type: 'delivery_list' }
							: {
									tracking: deliveries[0] ?? null,
									type: 'delivery_tracking',
								},
					invalidatesOrders: false,
					readEntities: [
						'customer_orders',
						'customer_addresses',
						'customer_delivery_tracking',
					],
					route,
					writeEntityId: null,
					writeEntityType: null,
				}
			}
			const tracking = await loadDeliveryTrackingContext(
				supabase,
				customerId,
				route,
			)
			return {
				context: { type: 'delivery_tracking', tracking },
				invalidatesOrders: false,
				readEntities: [
					'customer_orders',
					'customer_addresses',
					'customer_delivery_tracking',
				],
				route,
				writeEntityId: null,
				writeEntityType: null,
			}
		}
		case 'delivery_list': {
			const deliveries = await loadDeliveryListContext(supabase, customerId)
			return {
				context: { deliveries, type: 'delivery_list' },
				invalidatesOrders: false,
				readEntities: [
					'customer_orders',
					'customer_addresses',
					'customer_delivery_tracking',
				],
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
		case 'compare_products':
		case 'recommend_materials': {
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
		case 'draft_add_items': {
			const result = await addItemsToDraft(
				supabase,
				customerId,
				route,
				userText,
			)
			return draftWriteToolResult(route, 'draft_add_items', result)
		}
		case 'draft_replace_item': {
			const result = await replaceDraftItem(
				supabase,
				customerId,
				route,
				userText,
			)
			return draftWriteToolResult(route, 'draft_replace_item', result)
		}
		case 'draft_set_delivery': {
			const result = await setDraftDelivery(
				supabase,
				customerId,
				route,
				userText,
			)
			return draftWriteToolResult(route, 'draft_set_delivery', result)
		}
		case 'draft_validate': {
			const validation = await validateDraftContext(
				supabase,
				customerId,
				route,
				userText,
			)
			return {
				context: { type: 'draft_validation', validation },
				invalidatesOrders: false,
				readEntities: ['customer_quote_requests', 'published_products'],
				route,
				writeEntityId: null,
				writeEntityType: null,
			}
		}
		case 'update_draft_items': {
			const result = await updateDraftItems(
				supabase,
				customerId,
				route,
				userText,
			)
			return draftWriteToolResult(route, 'update_draft_items', result)
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
		case 'support_request': {
			const support = await createSupportRequest(
				supabase,
				customerId,
				route,
				userText,
			)
			return {
				context: { type: 'support_request', ...support },
				invalidatesOrders: false,
				readEntities: ['customer_profile'],
				route,
				writeEntityId: support.ticket?.id ?? null,
				writeEntityType: support.ticket ? 'support_ticket' : null,
			}
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

async function pendingActionConfirmation(
	supabase: AuthedSupabase,
	customerId: string,
	route: PortalCustomerToolRequest,
	userText: string,
): Promise<PendingActionContext | null> {
	if (!portalCustomerActionNeedsConfirmation(route, userText)) return null

	switch (route.action) {
		case 'support_request':
			return pendingSupportTicketConfirmation(route, userText)
		case 'delete_draft':
			return pendingDeleteDraftConfirmation(
				supabase,
				customerId,
				route,
				userText,
			)
		case 'cleanup_drafts':
			return pendingCleanupDraftsConfirmation(supabase, customerId, route)
		case 'update_draft_metadata':
			return pendingDraftMetadataConfirmation(
				supabase,
				customerId,
				route,
				userText,
			)
		case 'update_draft_items':
			return pendingDraftItemConfirmation(supabase, customerId, route, userText)
		case 'draft_replace_item':
			return pendingDraftReplacementConfirmation(
				supabase,
				customerId,
				route,
				userText,
			)
		default:
			return null
	}
}

function confirmationReadEntities(route: PortalCustomerToolRequest): string[] {
	if (route.action === 'support_request') return ['customer_profile']
	if (
		route.action === 'delete_draft' ||
		route.action === 'cleanup_drafts' ||
		route.action === 'update_draft_metadata' ||
		route.action === 'update_draft_items' ||
		route.action === 'draft_replace_item'
	) {
		return ['customer_quote_requests']
	}
	return ['portal_chat']
}

function pendingSupportTicketConfirmation(
	route: PortalCustomerToolRequest,
	userText: string,
): PendingActionContext | null {
	const message = (route.supportMessage || route.searchQuery || userText).trim()
	if (!message || message === '/feedback') return null

	return {
		actions: [
			confirmationButton({
				command: `/feedback ${commandValue(message)} --confirm`,
				icon: 'support',
				label: 'Submit ticket',
				labelAr: 'إرسال التذكرة',
			}),
			{
				href: `${WEBSITE_URL}/docs`,
				icon: 'book',
				label: 'Open docs',
				labelAr: 'افتح الوثائق',
			},
			{
				icon: 'support',
				label: 'Support panel',
				labelAr: 'لوحة الدعم',
				route: '/support',
			},
		],
		message:
			'I can send this as a support ticket, but only if you press the button.',
		title: 'Confirm ticket',
	}
}

async function pendingDeleteDraftConfirmation(
	supabase: AuthedSupabase,
	customerId: string,
	route: PortalCustomerToolRequest,
	userText: string,
): Promise<PendingActionContext | null> {
	const draft = (
		await resolveEditableDraft(
			supabase,
			customerId,
			route.targetReference,
			route.searchQuery || userText,
		)
	).draft
	if (!draft) return null

	return {
		actions: [
			confirmationButton({
				command: `/delete-draft ${draft.request_number} --confirm`,
				icon: 'draft',
				label: 'Delete draft',
				labelAr: 'احذف المسودة',
			}),
		],
		message: `Ready to delete ${draft.request_number}. I will not delete it until you press the button.`,
		title: 'Confirm delete',
	}
}

async function pendingCleanupDraftsConfirmation(
	supabase: AuthedSupabase,
	customerId: string,
	route: PortalCustomerToolRequest,
): Promise<PendingActionContext | null> {
	const drafts = await loadEditableDrafts(supabase, customerId)
	if (drafts.length === 0) return null

	const mode = route.cleanupMode ?? 'remove_empty'
	if (mode === 'merge') {
		const sourceCount = drafts.filter(
			(draft) => (draft.quote_request_items ?? []).length > 0,
		).length
		if (sourceCount <= 1) return null
		return {
			actions: [
				confirmationButton({
					command: '/merge-drafts --confirm',
					icon: 'draft',
					label: 'Merge drafts',
					labelAr: 'ادمج المسودات',
				}),
			],
			message: `Ready to merge ${sourceCount} editable drafts into one new draft, then remove the old draft records.`,
			title: 'Confirm merge',
		}
	}

	const targetCount =
		mode === 'delete_all'
			? drafts.length
			: drafts.filter((draft) => (draft.quote_request_items ?? []).length === 0)
					.length
	if (targetCount === 0) return null

	return {
		actions: [
			confirmationButton({
				command:
					mode === 'delete_all'
						? '/clear-all-drafts --confirm'
						: '/clean-drafts --confirm',
				icon: 'draft',
				label: mode === 'delete_all' ? 'Delete drafts' : 'Clean drafts',
				labelAr: mode === 'delete_all' ? 'احذف المسودات' : 'نظّف المسودات',
			}),
		],
		message:
			mode === 'delete_all'
				? `Ready to delete ${targetCount} editable draft${targetCount === 1 ? '' : 's'}. Submitted orders stay untouched.`
				: `Ready to remove ${targetCount} empty editable draft${targetCount === 1 ? '' : 's'}.`,
		title: mode === 'delete_all' ? 'Confirm delete all' : 'Confirm cleanup',
	}
}

async function pendingDraftMetadataConfirmation(
	supabase: AuthedSupabase,
	customerId: string,
	route: PortalCustomerToolRequest,
	userText: string,
): Promise<PendingActionContext | null> {
	const draftResolution = await resolveEditableDraft(
		supabase,
		customerId,
		route.targetReference,
		route.searchQuery || userText,
	)
	const draft = draftResolution.draft
	if (!draft) return null

	const locale = detectPortalAiLocale(userText)
	const items = sortedQuoteRequestItems(draft).map(toDraftMaterialItem)
	const inferredName = inferredDraftNameFromText(userText)
	const nextName =
		route.draftName !== undefined || inferredName
			? normalizePortalDraftTitle(
					route.draftName ?? inferredName ?? undefined,
					items,
					locale,
				)
			: undefined
	const nextNotes =
		route.draftNotes !== undefined
			? normalizePortalDraftNotes(route.draftNotes, items, locale)
			: undefined
	if (!nextName && nextNotes === undefined) return null

	const command = nextName
		? `/rename-draft ${draft.request_number} ${commandValue(nextName)} --confirm`
		: `/note-draft ${draft.request_number} ${commandValue(nextNotes ?? '')} --confirm`

	return {
		actions: [
			confirmationButton({
				command,
				icon: 'draft',
				label: nextName ? 'Rename draft' : 'Update note',
				labelAr: nextName ? 'غيّر الاسم' : 'حدّث الملاحظة',
			}),
		],
		message: nextName
			? `Ready to rename ${draft.request_number} to "${nextName}".`
			: `Ready to update the note on ${draft.request_number}.`,
		title: nextName ? 'Confirm rename' : 'Confirm note',
	}
}

async function pendingDraftItemConfirmation(
	supabase: AuthedSupabase,
	customerId: string,
	route: PortalCustomerToolRequest,
	userText: string,
): Promise<PendingActionContext | null> {
	const inferred = inferDraftItemEdit(route.searchQuery || userText)
	const action = route.draftItemAction ?? inferred?.draftItemAction
	if (action !== 'clear_items' && action !== 'remove_item') return null

	const draft = (
		await resolveEditableDraft(
			supabase,
			customerId,
			route.targetReference,
			route.searchQuery || userText,
		)
	).draft
	if (!draft) return null

	if (action === 'clear_items') {
		const itemCount = sortedQuoteRequestItems(draft).length
		if (itemCount === 0) return null
		return {
			actions: [
				confirmationButton({
					command: `/clear-draft ${draft.request_number} --confirm`,
					icon: 'draft',
					label: 'Clear draft',
					labelAr: 'افرغ المسودة',
				}),
			],
			message: `Ready to clear ${itemCount} item line${itemCount === 1 ? '' : 's'} from ${draft.request_number}.`,
			title: 'Confirm clear',
		}
	}

	const items = sortedQuoteRequestItems(draft)
	const target = findDraftItemTarget(
		items,
		route.itemQuery ?? inferred?.itemQuery,
		route.previousQuantity ?? inferred?.previousQuantity,
		route.searchQuery || userText,
	)
	if (!target.item || target.message) return null
	const itemName = draftItemDisplayName(target.item)
	return {
		actions: [
			confirmationButton({
				command: `/remove-from-draft ${draft.request_number} ${commandValue(itemName)} --confirm`,
				icon: 'draft',
				label: 'Remove item',
				labelAr: 'احذف البند',
			}),
		],
		message: `Ready to remove ${itemName} from ${draft.request_number}.`,
		title: 'Confirm item removal',
	}
}

async function pendingDraftReplacementConfirmation(
	supabase: AuthedSupabase,
	customerId: string,
	route: PortalCustomerToolRequest,
	userText: string,
): Promise<PendingActionContext | null> {
	if (!route.replacementQuery) return null
	const draft = (
		await resolveEditableDraft(
			supabase,
			customerId,
			route.targetReference,
			route.searchQuery || userText,
		)
	).draft
	if (!draft) return null
	const itemQuery = route.itemQuery ?? 'item'
	return {
		actions: [
			confirmationButton({
				command: `/replace-draft-item ${draft.request_number} ${commandValue(itemQuery)} with ${commandValue(route.replacementQuery)} --confirm`,
				icon: 'draft',
				label: 'Replace item',
				labelAr: 'استبدل البند',
			}),
		],
		message: `Ready to replace ${itemQuery} in ${draft.request_number} with ${route.replacementQuery}.`,
		title: 'Confirm replacement',
	}
}

function confirmationButton(
	data: Omit<ActionButtonData, 'runCommand'>,
): ActionButtonData {
	return {
		confirmMessage: `${data.label} now?`,
		confirmMessageAr: `${data.labelAr} الآن؟`,
		...data,
		runCommand: true,
	}
}

function commandValue(value: string): string {
	const cleaned = value
		.replace(/(?:^|\s)--confirm(?:\s|$)/gi, ' ')
		.replace(/["“”\r\n]+/g, ' ')
		.replace(/\s+/g, ' ')
		.trim()
	return cleaned ? `"${cleaned}"` : '""'
}

async function renderPortalCustomerResponse(
	modelMessages: ChatMessageInput[],
	result: PortalToolResult,
): Promise<StreamChunk[]> {
	const customEvents = richEventsForToolResult(result)

	if (result.context.type === 'chat') {
		const simpleAnswer = simpleCustomerChatAnswer(modelMessages)
		const fallbackText =
			result.context.message ??
			simpleAnswer ??
			"I'm Lyon. What should we build, check, or edit?"
		if (result.route.commandName) {
			return textOnlyChunks(
				commandToolAnswer(result, fallbackText),
				customEvents,
			)
		}
		if (result.context.message) {
			return textOnlyChunks(result.context.message, customEvents)
		}
		if (await isAIEnabled()) {
			return streamWithCustomEvents(modelMessages, LYON_PORTAL, customEvents)
		}
		return textOnlyChunks(fallbackText, customEvents)
	}

	if (result.context.type === 'public_docs') {
		const text = await publicDocsAnswer(modelMessages, result.context.docs)
		return textOnlyChunks(text, customEvents)
	}

	if (result.context.type === 'refusal') {
		return textOnlyChunks(result.context.message, customEvents)
	}

	if (result.context.type === 'pending_action') {
		return textOnlyChunks(
			pendingActionFallbackAnswer(result.context),
			customEvents,
		)
	}

	const fallbackText = fallbackToolAnswer(result.context)
	if (result.route.commandName) {
		return textOnlyChunks(commandToolAnswer(result, fallbackText), customEvents)
	}
	if (result.context.type === 'products') {
		return textOnlyChunks(fallbackText, customEvents)
	}
	if (
		result.context.type === 'delivery_tracking' ||
		result.context.type === 'delivery_list'
	) {
		return textOnlyChunks(fallbackText, customEvents)
	}
	if (!(await isAIEnabled())) return textOnlyChunks(fallbackText, customEvents)

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
	if (!(await isAIEnabled())) {
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
		{ type: 'chat' | 'pending_action' | 'public_docs' | 'refusal' }
	>,
): string {
	return `${LYON_PORTAL}

Use only this portal tool result. Answer in the user's language.
Be concise: lead with the useful answer, then give at most one practical next step.
Do not expose raw IDs or internal fields. If something is missing, ask one short question.
Use markdown tables only when they make records or line items easier to scan.
${toolAnswerStyleInstructions(context)}

Portal tool result:
${safeJson(context)}`
}

function toolAnswerStyleInstructions(
	context: Exclude<
		PortalToolContext,
		{ type: 'chat' | 'pending_action' | 'public_docs' | 'refusal' }
	>,
): string {
	switch (context.type) {
		case 'profile':
			return 'Profile: compact account snapshot with only useful notes.'
		case 'orders':
			return 'Orders: summarize only the supplied records. Use customer references and the supplied sales quote site/dropoff address when relevant; do not substitute profile/default addresses.'
		case 'order_detail':
			return 'Order detail: status, items, dates, sales quote site/dropoff address, and one next step.'
		case 'delivery_tracking':
			return 'Delivery: use the live driver place label from tracking. Never use raw coordinates or the delivery address as the driver location.'
		case 'delivery_list':
			return 'Deliveries: summarize active customer-visible deliveries only, using live driver place labels instead of coordinates.'
		case 'products':
			return 'Products: use real visible products and only Available/Unavailable status. Ask before drafting unless explicitly requested.'
		case 'addresses':
			return 'Addresses: list saved delivery addresses and identify the default.'
		case 'projects':
			return 'Projects: list saved active projects and one useful next step.'
		case 'account_health':
			return 'Account health: missing setup, stale drafts, and one next step.'
		case 'draft_validation':
			return 'Draft validation: ready or blocked from supplied data. Do not submit it.'
		case 'order_activity':
			return 'Activity: summarize visible recent timeline events for this customer-owned record.'
		case 'support_request':
			return 'Support: confirm the ticket reference if one was created, otherwise explain what is missing.'
		case 'draft_write':
			return 'Draft write: say only what changed. No draft/submission disclaimers, review instructions, or edit links.'
	}
}

function fallbackToolAnswer(context: PortalToolContext): string {
	switch (context.type) {
		case 'profile':
			return profileCommandAnswer(context)
		case 'orders':
			return ordersFallbackAnswer(context.orders, context.orderScope)
		case 'order_detail':
			return orderDetailFallbackAnswer(context.order, context.documents)
		case 'delivery_tracking':
			return deliveryTrackingFallbackAnswer(context.tracking)
		case 'delivery_list':
			return deliveryListFallbackAnswer(context.deliveries)
		case 'products':
			return productFallbackAnswer(context)
		case 'addresses':
			return addressesFallbackAnswer(context.addresses)
		case 'projects':
			return projectsFallbackAnswer(context.projects)
		case 'account_health':
			return accountHealthFallbackAnswer(context.health)
		case 'draft_validation':
			return draftValidationFallbackAnswer(context.validation)
		case 'order_activity':
			return orderActivityFallbackAnswer(context.order, context.events)
		case 'pending_action':
			return pendingActionFallbackAnswer(context)
		case 'support_request':
			return supportRequestFallbackAnswer(context)
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

function commandToolAnswer(
	result: PortalToolResult,
	fallbackText: string,
): string {
	const commandName = result.route.commandName
	if (!commandName) return fallbackText
	switch (commandName) {
		case '/help':
			return helpCommandAnswer()
		case '/products':
		case '/compare-products':
		case '/recommend-materials':
			if (result.context.type !== 'products') return fallbackText
			return productCommandAnswer(commandName, result.context)
		case '/market':
			return [
				'## Market',
				'Open the catalog, start a new draft quote, or ask Lyon for a material plan in plain language.',
			].join('\n')
		case '/new-draft':
			return [
				'## New Draft',
				'Start a fresh quote drawer or move into the chat draft desk.',
			].join('\n')
		case '/cart':
		case '/open-cart':
			return [
				'## Cart',
				commandName === '/open-cart'
					? 'Opened the live quote drawer in the portal UI.'
					: 'Your live quote drawer is stored in this browser. Use the cart button below to open it.',
			].join('\n')
		case '/orders':
			if (result.context.type !== 'orders') return fallbackText
			return ordersCommandAnswer('Orders Desk', result.context.orders, 'all')
		case '/drafts':
			if (result.context.type !== 'orders') return fallbackText
			return ordersCommandAnswer('Draft Desk', result.context.orders, 'drafts')
		case '/draft':
		case '/edit-draft':
		case '/status':
		case '/latest-order':
			if (result.context.type !== 'order_detail') return fallbackText
			return result.context.order
				? orderDetailCommandAnswer(
						commandName === '/edit-draft'
							? 'Edit Draft'
							: commandName === '/draft'
								? 'Draft Detail'
								: commandName === '/status'
									? 'Status'
									: 'Latest Record',
						result.context.order,
						result.context.documents,
					)
				: 'No quote request or order found.'
		case '/validate-draft':
			if (result.context.type !== 'draft_validation') return fallbackText
			return draftValidationFallbackAnswer(result.context.validation)
		case '/activity':
			if (result.context.type !== 'order_activity') return fallbackText
			return orderActivityFallbackAnswer(
				result.context.order,
				result.context.events,
			)
		case '/delete-draft':
		case '/clear-draft':
		case '/remove-from-draft':
		case '/rename-draft':
		case '/note-draft':
		case '/add-to-draft':
		case '/replace-draft-item':
		case '/set-draft-delivery':
		case '/reorder':
		case '/clean-drafts':
		case '/merge-drafts':
		case '/clear-all-drafts':
			return fallbackText
		case '/track':
			if (result.context.type !== 'delivery_tracking') return fallbackText
			return deliveryTrackingFallbackAnswer(result.context.tracking)
		case '/deliveries':
			if (result.context.type !== 'delivery_list') return fallbackText
			return deliveryListFallbackAnswer(result.context.deliveries)
		case '/profile':
			return result.context.type === 'profile'
				? profileCommandAnswer(result.context)
				: fallbackText
		case '/addresses':
			return result.context.type === 'addresses'
				? addressesFallbackAnswer(result.context.addresses)
				: fallbackText
		case '/projects':
			return result.context.type === 'projects'
				? projectsFallbackAnswer(result.context.projects)
				: fallbackText
		case '/account-health':
			return result.context.type === 'account_health'
				? accountHealthFallbackAnswer(result.context.health)
				: fallbackText
		case '/support':
		case '/contact':
			return supportCommandAnswer(commandName)
		case '/feedback':
			return result.context.type === 'support_request'
				? supportRequestFallbackAnswer(result.context)
				: [
						'## Feedback',
						'Send a short message after `/feedback`, or use the support button below.',
					].join('\n')
		case '/docs':
		case '/docs-search':
			return [
				'## Docs',
				'',
				'| Resource | Use it for |',
				'| --- | --- |',
				'| Public docs | HyperQuote workflow and portal guidance |',
				'| FAQ | Short answers about common customer questions |',
				'| Support | Account-specific help |',
			].join('\n')
		case '/clear':
		case '/new':
			return 'Started a fresh chat.'
	}
}

function helpCommandAnswer(): string {
	return [
		'## Command Guide',
		'Run safe shortcuts below, or prepare commands that need details.',
	].join('\n')
}

function supportCommandAnswer(commandName: string): string {
	return [
		commandName === '/contact' ? '## Contact' : '## Support Desk',
		'Choose the support option you need below.',
	].join('\n')
}

function productCommandAnswer(
	commandName: string,
	context: Extract<PortalToolContext, { type: 'products' }>,
): string {
	const heading =
		commandName === '/compare-products'
			? 'Product Comparison'
			: commandName === '/recommend-materials'
				? 'Material Recommendations'
				: 'Catalog'
	return [`## ${heading}`, '', productFallbackAnswer(context)].join('\n')
}

function ordersCommandAnswer(
	title: string,
	orders: CustomerOrderSummary[],
	orderScope: PortalCustomerOrderScope,
): string {
	if (orders.length === 0) {
		return `## ${title}\n\nNo ${portalOrderScopeTitle(orderScope)} found.`
	}
	const visibleOrders = orders.slice(0, 20)
	const rows = visibleOrders.map((order) => {
		return `| ${markdownTableCell(order.reference)} | ${markdownTableCell(formatPlainStatus(order.status))} | ${order.date.slice(0, 10)} | ${markdownTableCell(orderSiteAddressText(order))} | ${markdownTableCell(order.name ?? 'Not named')} | ${markdownTableCell(orderItemsSummary(order))} | ${order.amount === null ? 'Not set' : markdownTableCell(formatCurrency(order.amount))} |`
	})
	return [
		`## ${title}`,
		'',
		`Showing ${visibleOrders.length} of ${orders.length} visible ${orderScope === 'drafts' ? 'drafts' : 'records'}.`,
		'',
		'| Reference | Status | Date | Site / Dropoff | Name | Items | Amount |',
		'| --- | --- | --- | --- | --- | --- | --- |',
		...rows,
	].join('\n')
}

function orderDetailCommandAnswer(
	title: string,
	order: CustomerOrderSummary,
	documents: DocumentRow[],
): string {
	const rows = [
		`| Reference | ${markdownTableCell(order.reference)} |`,
		`| Quote request | ${markdownTableCell(order.requestReference)} |`,
		`| Status | ${markdownTableCell(formatPlainStatus(order.status))} |`,
		`| Date | ${order.date.slice(0, 10)} |`,
		`| Site / dropoff | ${markdownTableCell(orderSiteAddressText(order))} |`,
		`| Name | ${markdownTableCell(order.name ?? 'Not named')} |`,
		`| Amount | ${order.amount === null ? 'Not set' : markdownTableCell(formatCurrency(order.amount))} |`,
	]
	const itemRows = order.items.slice(0, 12).map((item) => {
		return `| ${markdownTableCell(item.name)} | ${item.qty} | ${markdownTableCell(item.unit)} | ${item.orderable === false ? 'Unavailable' : 'Available'} |`
	})
	const docRows = documents.slice(0, 6).map((document) => {
		return `| ${markdownTableCell(document.title)} | ${markdownTableCell(formatPlainStatus(document.type))} | ${document.created_at.slice(0, 10)} |`
	})
	return [
		`## ${title}`,
		'',
		'| Field | Value |',
		'| --- | --- |',
		...rows,
		'',
		'### Items',
		order.items.length === 0
			? 'No material lines are saved.'
			: [
					'| Product | Qty | Unit | Status |',
					'| --- | ---: | --- | --- |',
					...itemRows,
				].join('\n'),
		...(documents.length > 0
			? [
					'',
					'### Documents',
					'| Document | Type | Date |',
					'| --- | --- | --- |',
					...docRows,
				]
			: []),
	].join('\n')
}

function profileCommandAnswer(
	context: Extract<PortalToolContext, { type: 'profile' }>,
): string {
	const projects = context.projects.slice(0, 5)
	const profile = context.profile
	const status = `${formatPlainStatus(profile.status)} (${formatPlainStatus(profile.tier)} tier)`
	const creditLimit = formatCurrency(profile.credit_limit)
	const notes = profileAccountNotes(context)
	const addressRows = context.addresses.slice(0, 8).map((address) => {
		return `| ${markdownTableCell(address.label ?? 'Address')} | ${address.is_default ? 'Yes' : 'No'} | ${markdownTableCell(address.street)} | ${markdownTableCell(address.city)} | ${markdownTableCell(address.governorate)} |`
	})
	const projectRows = projects.map((project) => {
		return `| ${markdownTableCell(project.name)} | ${markdownTableCell(project.description ?? 'No description')} |`
	})
	return [
		'## Customer Profile',
		'',
		'| Field | Details |',
		'| --- | --- |',
		`| Company | ${markdownTableCell(profile.company_name)} |`,
		`| Primary contact | ${markdownTableCell(profile.contact_name)} |`,
		`| Phone | ${markdownTableCell(profile.phone)} |`,
		`| Email | ${markdownTableCell(profile.email || 'Not saved')} |`,
		`| Account status | ${markdownTableCell(status)} |`,
		`| Credit limit | ${markdownTableCell(creditLimit)} |`,
		`| Payment history | ${markdownTableCell(formatPlainStatus(profile.payment_history))} |`,
		`| Trade license | ${markdownTableCell(formatPlainStatus(profile.trade_license_status ?? 'not uploaded'))} |`,
		'',
		'### Delivery Addresses',
		context.addresses.length === 0
			? 'No delivery addresses are saved.'
			: [
					'| Label | Default | Street | City | Governorate |',
					'| --- | --- | --- | --- | --- |',
					...addressRows,
				].join('\n'),
		'',
		'### Projects',
		projects.length === 0
			? 'No active projects are saved.'
			: ['| Project | Description |', '| --- | --- |', ...projectRows].join(
					'\n',
				),
		'',
		'### Account Notes',
		...notes.map((note) => `- ${note}`),
	].join('\n')
}

function profileAccountNotes(
	context: Extract<PortalToolContext, { type: 'profile' }>,
): string[] {
	const notes: string[] = []
	if ((context.profile.trade_license_status ?? 'not_uploaded') !== 'verified') {
		notes.push('Trade license is not verified yet.')
	}
	if (context.profile.credit_limit <= 0) {
		notes.push('Credit limit is not set.')
	}
	if (!context.addresses.some((address) => address.is_default)) {
		notes.push('No default delivery address is saved.')
	}
	if (context.projects.length === 0) {
		notes.push('No active projects are saved.')
	}
	return notes.length > 0
		? notes
		: ['Account basics look complete from the customer portal data.']
}

function orderItemsSummary(order: CustomerOrderSummary): string {
	if (order.items.length === 0) return 'No items'
	const visible = order.items.slice(0, 3).map((item) => {
		return `${item.name} (${item.qty} ${item.unit})`
	})
	const hidden = order.items.length - visible.length
	return hidden > 0
		? `${visible.join(', ')} +${hidden} more`
		: visible.join(', ')
}

function orderSiteAddressText(order: CustomerOrderSummary): string {
	return order.siteAddress?.fullAddress || 'No sales quote site set'
}

function markdownTableCell(value: string): string {
	return value.replace(/\|/g, '\\|').replace(/\n/g, ' ')
}

function formatCurrency(value: number): string {
	return `EGP ${new Intl.NumberFormat('en-EG', {
		maximumFractionDigits: 0,
	}).format(value)}`
}

function formatPlainStatus(value: string): string {
	return value
		.replace(/_/g, ' ')
		.replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function ordersFallbackAnswer(
	orders: CustomerOrderSummary[],
	orderScope: PortalCustomerOrderScope = 'all',
): string {
	return ordersCommandAnswer(
		portalOrderScopeTitle(orderScope),
		orders,
		orderScope,
	)
}

function orderDetailFallbackAnswer(
	order: CustomerOrderSummary | null,
	documents: DocumentRow[],
): string {
	if (!order)
		return 'I could not find that order or quote request in your customer account.'
	return orderDetailCommandAnswer('Record Detail', order, documents)
}

function deliveryTrackingFallbackAnswer(
	tracking: DeliveryTrackingContext | null,
): string {
	if (!tracking) {
		return 'I do not see an active customer-visible delivery tracking record for your account.'
	}
	const { delivery } = tracking
	const place = describeDriverLocationForCustomer(delivery)
	const orderLabel = deliveryOrderLabel(tracking)
	return [
		'## Driver Location',
		'',
		driverLocationSentence(orderLabel, place),
		'',
		'| Order | Stage | Driver | Vehicle | ETA |',
		'| --- | --- | --- | --- | --- |',
		`| ${markdownTableCell(orderLabel)} | ${markdownTableCell(formatPlainStatus(delivery.currentStage))} | ${markdownTableCell(formatDeliveryDriver(delivery))} | ${markdownTableCell(formatDeliveryVehicle(delivery))} | ${markdownTableCell(formatDeliveryTimestamp(delivery.estimatedArrival))} |`,
	].join('\n')
}

function deliveryListFallbackAnswer(
	deliveries: DeliveryTrackingContext[],
): string {
	if (deliveries.length === 0) {
		return '## Deliveries\n\nNo active customer-visible deliveries found.'
	}
	if (deliveries.length === 1) {
		return deliveryTrackingFallbackAnswer(deliveries[0] ?? null)
	}
	const rows = deliveries.slice(0, 6).map(({ delivery, order }) => {
		return `| ${markdownTableCell(deliveryOrderLabel({ delivery, order }))} | ${markdownTableCell(formatPlainStatus(delivery.currentStage))} | ${markdownTableCell(formatDeliveryDriver(delivery))} | ${markdownTableCell(describeDriverLocationForCustomer(delivery))} | ${markdownTableCell(formatDeliveryTimestamp(delivery.estimatedArrival))} |`
	})
	return [
		'## Driver Locations',
		'',
		`Showing ${Math.min(deliveries.length, 6)} of ${deliveries.length} active driver record${deliveries.length === 1 ? '' : 's'}.`,
		'',
		'| Order | Stage | Driver | Place | ETA |',
		'| --- | --- | --- | --- | --- |',
		...rows,
	].join('\n')
}

function deliveryOrderLabel(context: DeliveryTrackingContext): string {
	return context.delivery.orderNumber || context.order.reference
}

function driverLocationSentence(orderLabel: string, place: string): string {
	if (/^(?:in|near|at)\b/i.test(place)) {
		return `Driver for ${orderLabel} is ${place}.`
	}
	return `Driver for ${orderLabel}: ${place}.`
}

function formatDeliveryDriver(delivery: DeliveryInfo): string {
	return (
		[delivery.driverName, delivery.driverPhone].filter(Boolean).join(' · ') ||
		'Assigned driver'
	)
}

function formatDeliveryVehicle(delivery: DeliveryInfo): string {
	return (
		[delivery.truckNumber, delivery.vehiclePlate].filter(Boolean).join(' · ') ||
		'Vehicle assigned'
	)
}

function addressesFallbackAnswer(addresses: CustomerAddressRow[]): string {
	if (addresses.length === 0)
		return '## Delivery Addresses\n\nNo saved delivery addresses found.'
	const rows = addresses.map((address) => {
		return `| ${markdownTableCell(address.label ?? 'Address')} | ${address.is_default ? 'Yes' : 'No'} | ${markdownTableCell(address.street)} | ${markdownTableCell(address.city)} | ${markdownTableCell(address.governorate)} |`
	})
	return [
		'## Delivery Addresses',
		'',
		'| Label | Default | Street | City | Governorate |',
		'| --- | --- | --- | --- | --- |',
		...rows,
	].join('\n')
}

function projectsFallbackAnswer(projects: CustomerProjectRow[]): string {
	if (projects.length === 0)
		return '## Projects\n\nNo active projects are saved.'
	return [
		'## Projects',
		'',
		'| Project | Description | Created |',
		'| --- | --- | --- |',
		...projects.slice(0, 12).map((project) => {
			return `| ${markdownTableCell(project.name)} | ${markdownTableCell(project.description ?? 'No description')} | ${project.created_at.slice(0, 10)} |`
		}),
	].join('\n')
}

function accountHealthFallbackAnswer(health: AccountHealthContext): string {
	const issueRows =
		health.issues.length > 0
			? health.issues.map(
					(issue) => `| Attention | ${markdownTableCell(issue)} |`,
				)
			: ['| Clear | Account basics look clear from the portal data. |']
	const lines = [
		'## Account Health',
		'',
		'| Area | Count |',
		'| --- | ---: |',
		`| Editable drafts | ${health.draftCount} |`,
		`| Saved addresses | ${health.addresses.length} |`,
		`| Active projects | ${health.projects.length} |`,
		`| Stale drafts | ${health.staleDrafts.length} |`,
	]
	if (health.staleDrafts.length > 0) {
		const draftRows = health.staleDrafts.slice(0, 8).map((draft) => {
			return `| ${markdownTableCell(draft.requestReference)} | ${draft.date.slice(0, 10)} | ${markdownTableCell(orderItemsSummary(draft))} |`
		})
		lines.push(
			'',
			'### Stale Drafts',
			'| Draft | Date | Items |',
			'| --- | --- | --- |',
			...draftRows,
		)
	}
	lines.push(
		'',
		'### Notes',
		'| Status | Detail |',
		'| --- | --- |',
		...issueRows,
	)
	return lines.join('\n')
}

function draftValidationFallbackAnswer(
	validation: DraftValidationContext,
): string {
	if (!validation.draft) return validation.issues.join(' ')
	if (validation.issues.length === 0) {
		return [
			'## Draft Validation',
			'',
			'| Draft | Items | Catalog result |',
			'| --- | ---: | --- |',
			`| ${markdownTableCell(validation.draft.requestReference)} | ${validation.draft.itemCount} | No validation issues from current catalog data |`,
		].join('\n')
	}
	return [
		'## Draft Validation',
		'',
		`| Draft | Items |`,
		'| --- | ---: |',
		`| ${markdownTableCell(validation.draft.requestReference)} | ${validation.draft.itemCount} |`,
		'',
		'### Issues',
		'| Detail |',
		'| --- |',
		...validation.issues.map((issue) => `| ${markdownTableCell(issue)} |`),
	].join('\n')
}

function orderActivityFallbackAnswer(
	order: CustomerOrderSummary | null,
	events: ActivityEventRow[],
): string {
	if (!order) return 'I could not find that customer-owned record.'
	if (events.length === 0) {
		return `## Activity\n\nNo recent activity events found for ${order.reference}.`
	}
	return [
		'## Activity',
		'',
		`Recent visible activity for ${order.reference}.`,
		'',
		'| Date | Action | Entity |',
		'| --- | --- | --- |',
		...events.slice(0, 8).map((event) => {
			return `| ${event.created_at.slice(0, 10)} | ${markdownTableCell(formatPlainStatus(event.action))} | ${markdownTableCell(formatPlainStatus(event.entity_type))} |`
		}),
	].join('\n')
}

function pendingActionFallbackAnswer(context: PendingActionContext): string {
	return [`## ${context.title}`, context.message].join('\n\n')
}

function supportRequestFallbackAnswer(context: SupportRequestContext): string {
	if (!context.ticket) {
		return `## Support Request\n\n${context.message ?? 'No support ticket was created.'}`
	}
	return [
		'## Support Request',
		'',
		'| Field | Value |',
		'| --- | --- |',
		`| Ticket | ${markdownTableCell(context.ticket.reference)} |`,
		`| Subject | ${markdownTableCell(context.ticket.subject)} |`,
		`| Status | ${markdownTableCell(formatPlainStatus(context.ticket.status))} |`,
		`| Created | ${context.ticket.created_at.slice(0, 10)} |`,
	].join('\n')
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
		return `| ${markdownTableCell(name)} | ${availabilityLabel(product, context.locale)} | ${markdownTableCell(unitLabel(product, context.locale))} | ${markdownTableCell(formatPriceRange(product, context.locale))} |`
	})
	if (isArabic) {
		return [
			`دي اختيارات حقيقية من الكتالوج (${context.products.length} من ${context.totalVisibleProducts}):`,
			'',
			'| المنتج | الحالة | الوحدة | السعر |',
			'| --- | --- | --- | --- |',
			...rows,
			'',
			'المنتجات غير المتاحة للعلم فقط ولن أضيفها لمسودة. تحب أضيف المنتجات المتاحة لمسودة تراجعها؟',
		].join('\n')
	}
	return [
		`Here are ${context.products.length} real catalog-backed product${context.products.length === 1 ? '' : 's'} out of ${context.totalVisibleProducts}:`,
		'',
		'| Product | Status | Unit | Price |',
		'| --- | --- | --- | --- |',
		...rows,
		'',
		'Unavailable products are for visibility only and will not be added to a draft. Want me to add the available items to a draft?',
	].join('\n')
}

function richEventsForToolResult(result: PortalToolResult): StreamChunk[] {
	const events: StreamChunk[] = []
	if (result.route.commandName === '/help') {
		events.push(commandPaletteEvent())
	}
	if (
		result.route.commandName === '/support' ||
		result.route.commandName === '/contact'
	) {
		events.push(supportOptionsEvent())
	}
	switch (result.context.type) {
		case 'orders':
			for (const order of result.context.orders.slice(0, 8)) {
				events.push(statusCardEvent(order))
			}
			break
		case 'order_detail':
			if (result.context.order) {
				events.push(statusCardEvent(result.context.order))
				if (
					result.route.action === 'draft_detail' &&
					result.context.order.type === 'draft'
				) {
					events.push(portalOpenDraftPanelEvent(result.context.order.id))
				}
			}
			break
		case 'delivery_tracking':
			if (result.context.tracking) {
				events.push(statusCardEvent(result.context.tracking.order))
				events.push(deliveryTrackingEvent(result.context.tracking))
			}
			break
		case 'delivery_list':
			for (const tracking of result.context.deliveries.slice(0, 4)) {
				events.push(statusCardEvent(tracking.order))
				events.push(deliveryTrackingEvent(tracking))
			}
			break
		case 'draft_validation':
			if (result.context.validation.draft) {
				events.push(statusCardEvent(result.context.validation.draft))
				events.push(
					portalOpenDraftPanelEvent(result.context.validation.draft.id),
				)
			}
			break
		case 'order_activity':
			if (result.context.order)
				events.push(statusCardEvent(result.context.order))
			break
		case 'pending_action':
			for (const action of result.context.actions) {
				events.push(actionButtonEvent(action))
			}
			break
		case 'draft_write':
			events.push(draftCleanupEvent(result.context.result))
			if (result.context.result.draftId) {
				events.push(portalOpenDraftPanelEvent(result.context.result.draftId))
			}
			if (result.context.result.items) {
				events.push(materialListEvent(result.context.result))
			}
			break
		default:
			break
	}
	if (result.context.type !== 'pending_action') {
		events.push(...toolActionEvents(result))
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
			customer_addresses (
				id,
				label,
				street,
				area,
				city,
				governorate,
				landmark,
				latitude,
				longitude
			),
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
					is_active,
					availability_status,
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

async function loadDeliveryListContext(
	supabase: AuthedSupabase,
	customerId: string,
): Promise<DeliveryTrackingContext[]> {
	const orders = await loadCustomerOrders(supabase, customerId)
	const deliveries: DeliveryTrackingContext[] = []
	for (const order of orders) {
		if (!order.linkedOrderId) continue
		const delivery = await getCustomerDeliveryTracking(
			supabase,
			order.linkedOrderId,
		)
		if (delivery && delivery.currentStage !== 'delivered') {
			deliveries.push({ delivery, order })
		}
		if (deliveries.length >= 8) break
	}
	return deliveries
}

async function loadDraftDetailContext(
	supabase: AuthedSupabase,
	customerId: string,
	route: PortalCustomerToolRequest,
	userText: string,
): Promise<{ order: CustomerOrderSummary | null }> {
	const draftResolution = await resolveEditableDraft(
		supabase,
		customerId,
		route.targetReference,
		route.searchQuery || userText,
	)
	return {
		order: draftResolution.draft
			? toCustomerOrderSummary(draftResolution.draft)
			: null,
	}
}

async function loadOrderActivityContext(
	supabase: AuthedSupabase,
	customerId: string,
	route: PortalCustomerToolRequest,
): Promise<{ events: ActivityEventRow[]; order: CustomerOrderSummary | null }> {
	const { order } = await loadOrderDetailContext(supabase, customerId, route)
	if (!order) return { events: [], order: null }
	const entityIds = [order.id, order.linkedOrderId].filter(
		(value): value is string => Boolean(value),
	)
	if (entityIds.length === 0) return { events: [], order }
	const { data, error } = await supabase
		.from('activity_events')
		.select('id, entity_type, action, details, created_at')
		.in('entity_id', entityIds)
		.order('created_at', { ascending: false })
		.limit(12)
	if (error) throw new Error(error.message)
	return {
		events: (data ?? []) as unknown as ActivityEventRow[],
		order,
	}
}

async function loadAccountHealthContext(
	supabase: AuthedSupabase,
	customerId: string,
): Promise<AccountHealthContext> {
	const [profileContext, orders] = await Promise.all([
		loadCustomerProfileContext(supabase, customerId),
		loadCustomerOrders(supabase, customerId),
	])
	const drafts = orders.filter((order) => order.type === 'draft')
	const staleDrafts = drafts.filter((order) => isOlderThanDays(order.date, 7))
	const issues = accountHealthIssues(profileContext, drafts, staleDrafts)
	return {
		addresses: profileContext.addresses,
		draftCount: drafts.length,
		issues,
		orders,
		profile: profileContext.profile,
		projects: profileContext.projects,
		staleDrafts,
	}
}

function accountHealthIssues(
	context: {
		addresses: CustomerAddressRow[]
		profile: CustomerProfileRow
		projects: CustomerProjectRow[]
	},
	drafts: CustomerOrderSummary[],
	staleDrafts: CustomerOrderSummary[],
): string[] {
	const issues: string[] = []
	if ((context.profile.trade_license_status ?? 'not_uploaded') !== 'verified') {
		issues.push('Trade license is not verified.')
	}
	if (context.profile.credit_limit <= 0) issues.push('Credit limit is not set.')
	if (!context.addresses.some((address) => address.is_default)) {
		issues.push('Default delivery address is missing.')
	}
	if (context.projects.length === 0)
		issues.push('No active projects are saved.')
	if (staleDrafts.length > 0) {
		issues.push(
			`${staleDrafts.length} editable draft${staleDrafts.length === 1 ? '' : 's'} is older than 7 days.`,
		)
	}
	if (drafts.some((draft) => draft.items.some((item) => !item.orderable))) {
		issues.push('At least one editable draft has unavailable material lines.')
	}
	return issues
}

function isOlderThanDays(value: string, days: number): boolean {
	const timestamp = Date.parse(value)
	if (!Number.isFinite(timestamp)) return false
	return Date.now() - timestamp > days * 24 * 60 * 60 * 1000
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
	searchText?: string,
): Promise<PortalAiProduct[]> {
	const openEndedSelection = isOpenEndedCatalogSelectionRequest(userText)
	const intentTerms = draftProductIntentTerms(userText)
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

	const query = openEndedSelection
		? null
		: productSearchTerm(searchText?.trim() || userText)
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
	const locale = detectPortalAiLocale(userText)
	const draftPlanText = route.searchQuery
		? `${userText} ${route.searchQuery}`
		: userText
	const products = await findOrderableProductsForDraft(
		supabase,
		draftPlanText,
		route.searchQuery,
	)
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
	const draftName = normalizePortalDraftTitle(route.draftName, items, locale)
	const draftNotes = normalizePortalDraftNotes(route.draftNotes, items, locale)

	const { data: draft, error } = await supabase
		.from('quote_requests')
		.insert({
			attachment_urls: [],
			customer_id: customerId,
			draft_name: draftName,
			notes: draftNotes,
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
			notes: item.notes,
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
		message: `I created ${draft.request_number} with ${items.length} material line${items.length === 1 ? '' : 's'}.`,
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
	const locale = detectPortalAiLocale(route.searchQuery)
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
			draft_name: normalizePortalDraftTitle(
				route.draftName ??
					source.draft_name ??
					`Copy of ${source.request_number}`,
				items,
				locale,
			),
			notes: normalizePortalDraftNotes(
				route.draftNotes ?? source.notes ?? undefined,
				items,
				locale,
			),
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
		message: `I copied ${source.request_number} into ${draft.request_number}.`,
	}
}

async function addItemsToDraft(
	supabase: AuthedSupabase,
	customerId: string,
	route: PortalCustomerToolRequest,
	userText: string,
): Promise<DraftWriteContext> {
	const locale = detectPortalAiLocale(userText)
	const draftResolution = await resolveEditableDraft(
		supabase,
		customerId,
		route.targetReference,
		route.searchQuery || userText,
	)
	const draft = draftResolution.draft
	if (!draft) {
		return {
			message:
				draftResolution.message ??
				'I could not find an editable draft to add items to.',
		}
	}
	const searchText = route.itemQuery || route.searchQuery || userText
	const products = await findOrderableProductsForDraft(
		supabase,
		searchText,
		searchText,
	)
	const items = buildDraftItemsFromPlan(searchText, products)
	if (items.length === 0 || items.some((item) => !item.productId)) {
		return {
			draftId: draft.id,
			editRoute: `/orders/edit/${draft.id}`,
			items: sortedQuoteRequestItems(draft).map(toDraftMaterialItem),
			reference: draft.request_number,
			message: 'I could not find a currently available catalog product to add.',
		}
	}

	const currentItems = sortedQuoteRequestItems(draft)
	const draftItemInputs = items.map((item, index) => ({
		customerDescription: item.name,
		isUnmatched: false,
		matchConfidence: 0.85,
		notes: item.notes,
		productId: item.productId,
		quantity: item.qty,
		sortOrder: currentItems.length + index,
		unitOfMeasure: item.unit,
		unitOfMeasureAr: item.unitAr,
	}))
	try {
		await assertQuoteRequestItemsHaveOrderableProductLinks(
			supabase,
			draftItemInputs,
		)
	} catch (error) {
		if (
			error instanceof Error &&
			error.message === QUOTE_REQUEST_ITEM_PRODUCT_NOT_ORDERABLE
		) {
			return {
				draftId: draft.id,
				editRoute: `/orders/edit/${draft.id}`,
				items: currentItems.map(toDraftMaterialItem),
				reference: draft.request_number,
				message:
					'The catalog changed before I could add those products. I left the draft unchanged.',
			}
		}
		throw error
	}
	await insertQuoteRequestItems(supabase, draft.id, draftItemInputs, {
		requireOrderableProductLinks: true,
	})

	const materialItems = [...currentItems.map(toDraftMaterialItem), ...items]
	await refreshDraftCopyAfterItemEdit(
		supabase,
		customerId,
		draft,
		materialItems,
		route,
		locale,
	)
	await recordDraftSavedActivity(supabase, draft.id, {
		item_count: materialItems.length,
		operation: 'portal_ai_add_items',
	})
	return {
		draftId: draft.id,
		editRoute: `/orders/edit/${draft.id}`,
		items: materialItems,
		reference: draft.request_number,
		message: `I added ${items.length} material line${items.length === 1 ? '' : 's'} to ${draft.request_number}.`,
	}
}

async function replaceDraftItem(
	supabase: AuthedSupabase,
	customerId: string,
	route: PortalCustomerToolRequest,
	userText: string,
): Promise<DraftWriteContext> {
	const locale = detectPortalAiLocale(userText)
	const draftResolution = await resolveEditableDraft(
		supabase,
		customerId,
		route.targetReference,
		route.searchQuery || userText,
	)
	const draft = draftResolution.draft
	if (!draft) {
		return {
			message:
				draftResolution.message ??
				'I could not find an editable draft to update.',
		}
	}
	const currentItems = sortedQuoteRequestItems(draft)
	if (currentItems.length === 0) {
		return {
			draftId: draft.id,
			editRoute: `/orders/edit/${draft.id}`,
			items: [],
			reference: draft.request_number,
			message: 'That draft has no material lines to replace.',
		}
	}
	const target = findDraftItemTarget(
		currentItems,
		route.itemQuery,
		route.previousQuantity,
		route.searchQuery || userText,
	)
	if (target.message || !target.item) {
		return {
			draftId: draft.id,
			editRoute: `/orders/edit/${draft.id}`,
			items: currentItems.map(toDraftMaterialItem),
			reference: draft.request_number,
			message:
				target.message ?? 'I could not identify which draft line to replace.',
		}
	}
	const replacementText = route.replacementQuery || route.itemQuery || ''
	if (!replacementText.trim()) {
		return {
			draftId: draft.id,
			editRoute: `/orders/edit/${draft.id}`,
			items: currentItems.map(toDraftMaterialItem),
			reference: draft.request_number,
			message:
				'Tell me what available catalog product should replace that line.',
		}
	}
	const products = await findOrderableProductsForDraft(
		supabase,
		replacementText,
		replacementText,
	)
	const [replacement] = buildDraftItemsFromPlan(replacementText, products)
	if (!replacement?.productId) {
		return {
			draftId: draft.id,
			editRoute: `/orders/edit/${draft.id}`,
			items: currentItems.map(toDraftMaterialItem),
			reference: draft.request_number,
			message:
				'I could not find a currently available catalog product for the replacement.',
		}
	}
	const quantity = route.quantity ?? target.item.quantity
	const replacementInput: QuoteRequestItemInput = {
		customerDescription: replacement.name,
		isUnmatched: false,
		matchConfidence: 0.85,
		notes: replacement.notes,
		productId: replacement.productId,
		quantity,
		sortOrder: target.item.sort_order,
		unitOfMeasure: replacement.unit,
		unitOfMeasureAr: replacement.unitAr,
	}
	await assertQuoteRequestItemsHaveOrderableProductLinks(supabase, [
		replacementInput,
	])
	const { error: deleteError } = await supabase
		.from('quote_request_items')
		.delete()
		.eq('id', target.item.id)
		.eq('quote_request_id', draft.id)
	if (deleteError) throw new Error(deleteError.message)
	await insertQuoteRequestItems(supabase, draft.id, [replacementInput], {
		requireOrderableProductLinks: true,
	})

	const replacementMaterial: DraftMaterialItem = {
		...replacement,
		qty: quantity,
	}
	const materialItems = currentItems.map((item) =>
		item.id === target.item?.id
			? replacementMaterial
			: toDraftMaterialItem(item),
	)
	await refreshDraftCopyAfterItemEdit(
		supabase,
		customerId,
		draft,
		materialItems,
		route,
		locale,
	)
	await recordDraftSavedActivity(supabase, draft.id, {
		operation: 'portal_ai_replace_item',
		quote_request_item_id: target.item.id,
	})
	return {
		draftId: draft.id,
		editRoute: `/orders/edit/${draft.id}`,
		items: materialItems,
		reference: draft.request_number,
		message: `I replaced ${draftItemDisplayName(target.item)} with ${replacement.name} in ${draft.request_number}.`,
	}
}

async function setDraftDelivery(
	supabase: AuthedSupabase,
	customerId: string,
	route: PortalCustomerToolRequest,
	userText: string,
): Promise<DraftWriteContext> {
	const draftResolution = await resolveEditableDraft(
		supabase,
		customerId,
		route.targetReference,
		route.searchQuery || userText,
	)
	const draft = draftResolution.draft
	if (!draft) {
		return {
			message:
				draftResolution.message ??
				'I could not find an editable draft to update delivery details.',
		}
	}
	const update: Record<string, string | null> = {}
	if (route.deliveryDate !== undefined) {
		if (!/^\d{4}-\d{2}-\d{2}$/.test(route.deliveryDate)) {
			return {
				draftId: draft.id,
				editRoute: `/orders/edit/${draft.id}`,
				reference: draft.request_number,
				message: 'Use a delivery date in YYYY-MM-DD format.',
			}
		}
		update.delivery_date = route.deliveryDate
	}
	if (route.addressQuery !== undefined) {
		const profileContext = await loadCustomerProfileContext(
			supabase,
			customerId,
		)
		const address = findCustomerAddress(
			profileContext.addresses,
			route.addressQuery,
		)
		if (!address) {
			return {
				draftId: draft.id,
				editRoute: `/orders/edit/${draft.id}`,
				reference: draft.request_number,
				message: 'I could not match that to one saved delivery address.',
			}
		}
		update.delivery_address_id = address.id
	}
	if (Object.keys(update).length === 0) {
		return {
			draftId: draft.id,
			editRoute: `/orders/edit/${draft.id}`,
			reference: draft.request_number,
			message:
				'Tell me the delivery date, saved address, or both for this draft.',
		}
	}
	const { error } = await supabase
		.from('quote_requests')
		.update(update)
		.eq('id', draft.id)
		.eq('customer_id', customerId)
		.eq('status', 'draft')
	if (error) throw new Error(error.message)
	await recordDraftSavedActivity(supabase, draft.id, {
		operation: 'portal_ai_delivery_update',
		...update,
	})
	return {
		draftId: draft.id,
		editRoute: `/orders/edit/${draft.id}`,
		items: sortedQuoteRequestItems(draft).map(toDraftMaterialItem),
		reference: draft.request_number,
		message: `I updated delivery details on ${draft.request_number}.`,
	}
}

async function validateDraftContext(
	supabase: AuthedSupabase,
	customerId: string,
	route: PortalCustomerToolRequest,
	userText: string,
): Promise<DraftValidationContext> {
	const draftResolution = await resolveEditableDraft(
		supabase,
		customerId,
		route.targetReference,
		route.searchQuery || userText,
	)
	const draft = draftResolution.draft
	if (!draft) {
		return {
			draft: null,
			issues: [draftResolution.message ?? 'No editable draft matched.'],
			unavailableItems: [],
		}
	}
	const materialItems = sortedQuoteRequestItems(draft).map(toDraftMaterialItem)
	const unavailableItems = materialItems.filter((item) => !item.orderable)
	const issues: string[] = []
	if (materialItems.length === 0) issues.push('No material lines are saved.')
	if (unavailableItems.length > 0) {
		issues.push(
			`${unavailableItems.length} material line${unavailableItems.length === 1 ? '' : 's'} is unavailable.`,
		)
	}
	if (!draft.delivery_address_id) issues.push('Delivery address is not set.')
	if (!draft.delivery_date) issues.push('Delivery date is not set.')
	return {
		draft: toCustomerOrderSummary(draft),
		issues,
		unavailableItems,
	}
}

function findCustomerAddress(
	addresses: CustomerAddressRow[],
	query: string,
): CustomerAddressRow | null {
	const tokens = normalizeForMatch(query)
		.split(' ')
		.filter((token) => token.length > 1)
	if (tokens.length === 0) {
		return addresses.find((address) => address.is_default) ?? null
	}
	const matches = addresses.filter((address) => {
		const haystack = normalizeForMatch(
			[
				address.label ?? '',
				address.street,
				address.city,
				address.governorate,
				address.is_default ? 'default home primary' : '',
			].join(' '),
		)
		return tokens.every((token) => haystack.includes(token))
	})
	return matches.length === 1 ? (matches[0] ?? null) : null
}

async function createSupportRequest(
	supabase: AuthedSupabase,
	customerId: string,
	route: PortalCustomerToolRequest,
	userText: string,
): Promise<SupportRequestContext> {
	const profileContext = await loadCustomerProfileContext(supabase, customerId)
	const message = (route.supportMessage || route.searchQuery || userText).trim()
	if (!message || message === '/feedback') {
		return {
			message: 'Tell me the feedback or support message to send.',
			ticket: null,
		}
	}
	if (!profileContext.profile.email) {
		return {
			message:
				'Your profile does not have an email address saved, so I did not create a support ticket from chat.',
			ticket: null,
		}
	}
	const subject =
		route.supportSubject?.trim() || supportSubjectFromMessage(message)
	const { data, error } = await supabase.rpc('create_support_ticket', {
		p_message: message,
		p_requester_email: profileContext.profile.email,
		p_requester_name: profileContext.profile.contact_name,
		p_requester_phone: profileContext.profile.phone,
		p_source: 'portal',
		p_subject: subject,
	})
	if (error) throw new Error(error.message)
	return {
		ticket: data as unknown as SupportTicketRow,
	}
}

function supportSubjectFromMessage(message: string): string {
	const cleaned = message
		.replace(/^\/feedback\s*/i, '')
		.replace(/\s+/g, ' ')
		.trim()
	return cleaned.length > 80 ? `${cleaned.slice(0, 77)}...` : cleaned
}

async function updateDraftItems(
	supabase: AuthedSupabase,
	customerId: string,
	route: PortalCustomerToolRequest,
	userText: string,
): Promise<DraftWriteContext> {
	const locale = detectPortalAiLocale(userText)
	const draftResolution = await resolveEditableDraft(
		supabase,
		customerId,
		route.targetReference,
		route.searchQuery || userText,
	)
	const draft = draftResolution.draft
	if (!draft) {
		return {
			message:
				draftResolution.message ??
				'I could not find an editable draft in your customer account.',
		}
	}
	const currentItems = sortedQuoteRequestItems(draft)
	const inferred = inferDraftItemEdit(route.searchQuery || userText)
	const action = route.draftItemAction ?? inferred?.draftItemAction

	if (!action) {
		return {
			draftId: draft.id,
			editRoute: `/orders/edit/${draft.id}`,
			items: currentItems.map(toDraftMaterialItem),
			reference: draft.request_number,
			message:
				'Tell me exactly what to change in the draft, for example "set Wood to 340 pieces", "remove Wood", or "clear the draft".',
		}
	}

	if (action === 'clear_items') {
		if (currentItems.length > 0) {
			const { error } = await supabase
				.from('quote_request_items')
				.delete()
				.eq('quote_request_id', draft.id)
			if (error) throw new Error(error.message)
		}
		await refreshDraftCopyAfterItemEdit(
			supabase,
			customerId,
			draft,
			[],
			route,
			locale,
		)
		await recordDraftSavedActivity(supabase, draft.id, {
			item_count: 0,
			operation: 'portal_ai_clear_items',
		})
		return {
			draftId: draft.id,
			editRoute: `/orders/edit/${draft.id}`,
			items: [],
			reference: draft.request_number,
			message: `I cleared all material lines from ${draft.request_number}.`,
		}
	}

	if (currentItems.length === 0) {
		return {
			draftId: draft.id,
			editRoute: `/orders/edit/${draft.id}`,
			items: [],
			reference: draft.request_number,
			message:
				'That draft has no material lines to edit. Tell me what catalog product to add and I can create a new draft line from available products.',
		}
	}

	const target = findDraftItemTarget(
		currentItems,
		route.itemQuery ?? inferred?.itemQuery,
		route.previousQuantity ?? inferred?.previousQuantity,
		route.searchQuery || userText,
	)
	if (target.message) {
		return {
			draftId: draft.id,
			editRoute: `/orders/edit/${draft.id}`,
			items: currentItems.map(toDraftMaterialItem),
			reference: draft.request_number,
			message: target.message,
		}
	}
	const item = target.item
	if (!item) {
		return {
			draftId: draft.id,
			editRoute: `/orders/edit/${draft.id}`,
			items: currentItems.map(toDraftMaterialItem),
			reference: draft.request_number,
			message: 'I could not identify which draft line to edit.',
		}
	}

	if (action === 'remove_item') {
		const { error } = await supabase
			.from('quote_request_items')
			.delete()
			.eq('id', item.id)
			.eq('quote_request_id', draft.id)
		if (error) throw new Error(error.message)
		const remainingItems = currentItems
			.filter((candidate) => candidate.id !== item.id)
			.map(toDraftMaterialItem)
		await refreshDraftCopyAfterItemEdit(
			supabase,
			customerId,
			draft,
			remainingItems,
			route,
			locale,
		)
		await recordDraftSavedActivity(supabase, draft.id, {
			item_count: remainingItems.length,
			operation: 'portal_ai_remove_item',
			quote_request_item_id: item.id,
		})
		return {
			draftId: draft.id,
			editRoute: `/orders/edit/${draft.id}`,
			items: remainingItems,
			reference: draft.request_number,
			message: `I removed ${draftItemDisplayName(item)} from ${draft.request_number}.`,
		}
	}

	const lineSafetyMessage = await editableDraftLineOrderabilityMessage(
		supabase,
		item,
	)
	if (lineSafetyMessage) {
		return {
			draftId: draft.id,
			editRoute: `/orders/edit/${draft.id}`,
			items: currentItems.map(toDraftMaterialItem),
			reference: draft.request_number,
			message: lineSafetyMessage,
		}
	}

	if (action === 'set_quantity') {
		const quantity = route.quantity ?? inferred?.quantity
		if (!quantity) {
			return {
				draftId: draft.id,
				editRoute: `/orders/edit/${draft.id}`,
				items: currentItems.map(toDraftMaterialItem),
				reference: draft.request_number,
				message:
					'Tell me the new quantity for that draft line, for example "set Wood to 340 pieces".',
			}
		}
		const { error } = await supabase
			.from('quote_request_items')
			.update({ quantity })
			.eq('id', item.id)
			.eq('quote_request_id', draft.id)
		if (error) throw new Error(error.message)
		const updatedItems = currentItems.map((candidate) =>
			candidate.id === item.id ? { ...candidate, quantity } : candidate,
		)
		const materialItems = updatedItems.map(toDraftMaterialItem)
		await refreshDraftCopyAfterItemEdit(
			supabase,
			customerId,
			draft,
			materialItems,
			route,
			locale,
		)
		await recordDraftSavedActivity(supabase, draft.id, {
			from_quantity: item.quantity,
			operation: 'portal_ai_quantity_update',
			quote_request_item_id: item.id,
			to_quantity: quantity,
		})
		return {
			draftId: draft.id,
			editRoute: `/orders/edit/${draft.id}`,
			items: materialItems,
			reference: draft.request_number,
			message: `I changed ${draftItemDisplayName(item)} in ${draft.request_number} from ${item.quantity} to ${quantity} ${item.unit_of_measure}.`,
		}
	}

	const itemNotes = route.itemNotes ?? inferred?.itemNotes
	if (!itemNotes) {
		return {
			draftId: draft.id,
			editRoute: `/orders/edit/${draft.id}`,
			items: currentItems.map(toDraftMaterialItem),
			reference: draft.request_number,
			message:
				'Tell me the note to save on that draft line, for example `set the Wood line note to exterior grade`.',
		}
	}
	const { error } = await supabase
		.from('quote_request_items')
		.update({ notes: itemNotes })
		.eq('id', item.id)
		.eq('quote_request_id', draft.id)
	if (error) throw new Error(error.message)
	const updatedItems = currentItems.map((candidate) =>
		candidate.id === item.id ? { ...candidate, notes: itemNotes } : candidate,
	)
	const materialItems = updatedItems.map(toDraftMaterialItem)
	await refreshDraftCopyAfterItemEdit(
		supabase,
		customerId,
		draft,
		materialItems,
		route,
		locale,
	)
	await recordDraftSavedActivity(supabase, draft.id, {
		operation: 'portal_ai_item_note_update',
		quote_request_item_id: item.id,
	})
	return {
		draftId: draft.id,
		editRoute: `/orders/edit/${draft.id}`,
		items: materialItems,
		reference: draft.request_number,
		message: `I updated the note on ${draftItemDisplayName(item)} in ${draft.request_number}.`,
	}
}

async function refreshDraftCopyAfterItemEdit(
	supabase: AuthedSupabase,
	customerId: string,
	draft: QuoteRequestRow,
	items: DraftMaterialItem[],
	route: PortalCustomerToolRequest,
	locale: 'ar' | 'en',
) {
	const update: Record<string, string> = {
		notes: normalizePortalDraftNotes(route.draftNotes, items, locale),
	}
	if (
		route.draftName !== undefined ||
		isLegacyGeneratedDraftTitle(draft.draft_name)
	) {
		update.draft_name = normalizePortalDraftTitle(
			route.draftName,
			items,
			locale,
		)
	}

	const { error } = await supabase
		.from('quote_requests')
		.update(update)
		.eq('id', draft.id)
		.eq('customer_id', customerId)
		.eq('status', 'draft')
	if (error) throw new Error(error.message)
}

async function updateDraftMetadata(
	supabase: AuthedSupabase,
	customerId: string,
	route: PortalCustomerToolRequest,
	userText: string,
): Promise<DraftWriteContext> {
	const draftResolution = await resolveEditableDraft(
		supabase,
		customerId,
		route.targetReference,
		route.searchQuery || userText,
	)
	const draft = draftResolution.draft
	if (!draft)
		return {
			message:
				draftResolution.message ??
				'I could not find an editable draft in your customer account.',
		}
	const locale = detectPortalAiLocale(userText)
	const currentItems = sortedQuoteRequestItems(draft).map(toDraftMaterialItem)
	const inferredDraftName = inferredDraftNameFromText(userText)
	const draftName =
		route.draftName !== undefined || inferredDraftName
			? normalizePortalDraftTitle(
					route.draftName ?? inferredDraftName ?? undefined,
					currentItems,
					locale,
				)
			: draft.draft_name
	const draftNotes =
		route.draftNotes !== undefined
			? normalizePortalDraftNotes(route.draftNotes, currentItems, locale)
			: undefined
	const update: Record<string, string | null> = {}
	if (draftName !== draft.draft_name) update.draft_name = draftName
	if (draftNotes !== undefined) update.notes = draftNotes

	if (Object.keys(update).length === 0) {
		return {
			draftId: draft.id,
			editRoute: `/orders/edit/${draft.id}`,
			reference: draft.request_number,
			message: `Tell me the new name or note for ${draft.request_number}.`,
		}
	}

	const { error } = await supabase
		.from('quote_requests')
		.update(update)
		.eq('id', draft.id)
		.eq('customer_id', customerId)
		.eq('status', 'draft')
	if (error) throw new Error(error.message)

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
		message: `I updated ${draft.request_number}.`,
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
		const locale = detectPortalAiLocale(route.searchQuery)
		const { data: mergedDraft, error } = await supabase
			.from('quote_requests')
			.insert({
				attachment_urls: [],
				customer_id: customerId,
				draft_name: normalizePortalDraftTitle(route.draftName, items, locale),
				notes: normalizePortalDraftNotes(route.draftNotes, items, locale),
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
	const draftResolution = await resolveEditableDraft(
		supabase,
		customerId,
		route.targetReference,
		route.searchQuery,
	)
	const draft = draftResolution.draft
	if (!draft)
		return {
			message:
				draftResolution.message ??
				'I could not find an editable draft to delete.',
		}
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

async function resolveEditableDraft(
	supabase: AuthedSupabase,
	customerId: string,
	targetReference: string | undefined,
	descriptorText: string | undefined,
): Promise<{ draft: QuoteRequestRow | null; message?: string }> {
	const drafts = await loadEditableDrafts(supabase, customerId)
	if (targetReference) {
		const exact =
			drafts.find((draft) =>
				editableDraftMatchesReference(draft, targetReference),
			) ?? null
		return exact
			? { draft: exact }
			: { draft: null, message: 'I could not find that editable draft.' }
	}
	const descriptor = editableDraftDescriptorFromText(descriptorText ?? '')
	if (descriptor.specific) {
		const matches = drafts.filter((draft) =>
			editableDraftMatchesDescriptor(draft, descriptor),
		)
		if (matches.length === 1) return { draft: matches[0] ?? null }
		const label = editableDraftDescriptorLabel(descriptor)
		if (matches.length > 1) {
			return {
				draft: null,
				message: `I found multiple editable drafts matching ${label}: ${matches.map((draft) => draft.request_number).join(', ')}. Tell me the exact reference to edit.`,
			}
		}
		return {
			draft: null,
			message: `I could not find an editable draft matching ${label}. I did not change any draft.`,
		}
	}
	return { draft: drafts[0] ?? null }
}

function editableDraftMatchesReference(
	draft: QuoteRequestRow,
	targetReference: string,
): boolean {
	return (
		referenceEquals(draft.request_number, targetReference) ||
		referenceEquals(draft.id, targetReference) ||
		(draft.draft_name
			? referenceEquals(draft.draft_name, targetReference)
			: false)
	)
}

function editableDraftMatchesDescriptor(
	draft: QuoteRequestRow,
	descriptor: EditableDraftDescriptor,
): boolean {
	const items = sortedQuoteRequestItems(draft)
	if (
		descriptor.quantities.length > 0 &&
		!items.some((item) =>
			descriptor.quantities.some((quantity) =>
				quantitiesEqual(item.quantity, quantity),
			),
		)
	) {
		return false
	}
	if (descriptor.materialTokens.length === 0) return true
	const draftText = normalizeForMatch(
		[
			draft.request_number,
			draft.draft_name ?? '',
			draft.notes ?? '',
			...items.flatMap((item) => {
				const product = firstRelation(item.products)
				return [
					item.customer_description,
					item.product_name_ar,
					product?.name,
					product?.name_ar,
					product?.category,
				]
			}),
		]
			.filter(Boolean)
			.join(' '),
	)
	return descriptor.materialTokens.every((token) => draftText.includes(token))
}

function sortedQuoteRequestItems(
	draft: QuoteRequestRow,
): QuoteRequestItemRow[] {
	return (draft.quote_request_items ?? [])
		.slice()
		.sort((a, b) => a.sort_order - b.sort_order)
}

function findDraftItemTarget(
	items: QuoteRequestItemRow[],
	itemQuery: string | undefined,
	previousQuantity: number | undefined,
	searchText: string,
): { item?: QuoteRequestItemRow; message?: string } {
	const queryMatches = itemQuery
		? items.filter((item) => draftItemMatchesQuery(item, itemQuery))
		: []
	if (queryMatches.length === 1) return { item: queryMatches[0] }
	if (queryMatches.length > 1) {
		const quantityMatch = uniqueItemWithQuantity(queryMatches, previousQuantity)
		if (quantityMatch) return { item: quantityMatch }
		return {
			message: `I found multiple matching lines: ${draftItemChoices(queryMatches)}. Tell me which one to edit.`,
		}
	}

	const inferredPreviousQuantity =
		previousQuantity ?? inferPreviousDraftQuantity(searchText)
	const quantityMatch = uniqueItemWithQuantity(items, inferredPreviousQuantity)
	if (quantityMatch) return { item: quantityMatch }

	if (items.length === 1) return { item: items[0] }

	return {
		message: `Which draft line should I edit? This draft has ${draftItemChoices(items)}.`,
	}
}

function uniqueItemWithQuantity(
	items: QuoteRequestItemRow[],
	quantity: number | undefined,
): QuoteRequestItemRow | null {
	if (quantity === undefined) return null
	const matches = items.filter((item) =>
		quantitiesEqual(item.quantity, quantity),
	)
	return matches.length === 1 ? (matches[0] ?? null) : null
}

function quantitiesEqual(left: number, right: number): boolean {
	return Math.abs(left - right) < 0.000001
}

function inferPreviousDraftQuantity(text: string): number | undefined {
	const normalized = normalizeForMatch(text)
	const explicit = normalized.match(
		/\b(?:from\s+)?(\d+(?:\.\d+)?)\s*(?:pieces?|pcs?|units?|qty|quantity)?\s*(?:to|make it|set it to|set to|be|become)\s*(\d+(?:\.\d+)?)\b/,
	)
	if (explicit) {
		const value = Number.parseFloat(explicit[1] ?? '')
		return Number.isFinite(value) && value > 0 ? value : undefined
	}
	const numbers = [...normalized.matchAll(/\b(\d+(?:\.\d+)?)\b/g)]
		.map((match) => Number.parseFloat(match[1] ?? ''))
		.filter((value) => Number.isFinite(value) && value > 0)
	return numbers.length >= 2 ? numbers.at(-2) : undefined
}

function draftItemMatchesQuery(
	item: QuoteRequestItemRow,
	itemQuery: string,
): boolean {
	const queryTokens = normalizeForMatch(itemQuery)
		.split(' ')
		.filter((token) => token.length > 2)
	if (queryTokens.length === 0) return false
	const product = firstRelation(item.products)
	const itemText = normalizeForMatch(
		[
			item.customer_description,
			item.product_name_ar,
			item.unit_of_measure,
			item.unit_of_measure_ar,
			product?.name,
			product?.name_ar,
			product?.category,
		]
			.filter(Boolean)
			.join(' '),
	)
	return queryTokens.every((token) => itemText.includes(token))
}

function draftItemChoices(items: QuoteRequestItemRow[]): string {
	return items
		.slice(0, 6)
		.map(
			(item) =>
				`${draftItemDisplayName(item)} (${item.quantity} ${item.unit_of_measure})`,
		)
		.join(', ')
}

function draftItemDisplayName(item: QuoteRequestItemRow): string {
	const product = firstRelation(item.products)
	return item.customer_description || product?.name || item.id
}

async function editableDraftLineOrderabilityMessage(
	supabase: AuthedSupabase,
	item: QuoteRequestItemRow,
): Promise<string | null> {
	try {
		await assertQuoteRequestItemsHaveOrderableProductLinks(supabase, [
			{
				customerDescription: draftItemDisplayName(item),
				isUnmatched: item.is_unmatched,
				matchConfidence: item.match_confidence ?? undefined,
				notes: item.notes ?? undefined,
				productId: item.product_id ?? undefined,
				quantity: item.quantity,
				sortOrder: item.sort_order,
				unitOfMeasure: item.unit_of_measure,
				unitOfMeasureAr: item.unit_of_measure_ar,
			},
		])
		return null
	} catch (error) {
		if (
			error instanceof Error &&
			error.message === QUOTE_REQUEST_ITEM_PRODUCT_NOT_ORDERABLE
		) {
			return `I will not edit ${draftItemDisplayName(item)} because it is not backed by a currently orderable catalog product. I can remove that line or clear the draft instead.`
		}
		throw error
	}
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
			customer_addresses (
				id,
				label,
				street,
				area,
				city,
				governorate,
				landmark,
				latitude,
				longitude
			),
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
					is_active,
					availability_status,
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
		siteAddress: toCustomerOrderSiteAddress(row),
		status,
		type: order
			? 'confirmed'
			: row.status === 'draft' || row.status === 'saved'
				? 'draft'
				: 'submitted',
	}
}

function toCustomerOrderSiteAddress(
	row: QuoteRequestRow,
): CustomerOrderSiteAddress | null {
	const address = firstRelation(row.customer_addresses)
	if (address?.label !== SALES_QUOTE_ADDRESS_LABEL) return null
	const fullAddress = formatAddressParts([
		address.street,
		address.area,
		address.city,
		address.governorate,
		address.landmark,
	])
	if (!fullAddress) return null
	return {
		fullAddress,
		latitude: nullableNumber(address.latitude),
		longitude: nullableNumber(address.longitude),
		source: 'sales_quote_site',
	}
}

function formatAddressParts(parts: Array<string | null | undefined>): string {
	const seen = new Set<string>()
	const formatted: string[] = []
	for (const part of parts) {
		const cleaned = part?.trim().replace(/\s+/g, ' ')
		if (!cleaned) continue
		const key = cleaned.toLowerCase()
		if (seen.has(key)) continue
		seen.add(key)
		formatted.push(cleaned)
	}
	return formatted.join(', ')
}

function nullableNumber(value: number | string | null): number | null {
	if (value === null || value === '') return null
	const numeric = typeof value === 'number' ? value : Number(value)
	return Number.isFinite(numeric) ? numeric : null
}

function toDraftMaterialItem(item: QuoteRequestItemRow): DraftMaterialItem {
	const product = firstRelation(item.products)
	const name = item.customer_description || product?.name || item.id
	return {
		name,
		nameAr: item.product_name_ar || product?.name_ar || name,
		notes: item.notes ?? undefined,
		orderable:
			Boolean(item.product_id) &&
			!item.is_unmatched &&
			isOrderableQuoteRequestProduct(product),
		productId: item.product_id ?? undefined,
		qty: item.quantity,
		unit: item.unit_of_measure,
		unitAr: item.unit_of_measure_ar || item.unit_of_measure,
	}
}

function isOrderableQuoteRequestProduct(
	product: QuoteRequestItemProduct | null,
): boolean {
	return Boolean(
		product?.is_active &&
			product.availability_status !== 'hidden' &&
			product.availability_status !== 'out_of_stock',
	)
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

function statusCardEvent(order: CustomerOrderSummary): StreamChunk {
	const createdDate = order.date.slice(0, 10)
	const delivered = order.status === 'delivered'
	const active = [
		'submitted',
		'assigned',
		'confirmed',
		'order_confirmed',
		'being_prepared',
		'warehouse_loading',
		'out_for_delivery',
	].includes(order.status)
	return {
		type: 'CUSTOM' as const,
		timestamp: Date.now(),
		name: 'rich_message',
		value: {
			type: 'status_card',
			data: {
				amount: order.amount,
				displayNumber: order.reference,
				entityId: order.linkedOrderId ?? order.id,
				entityType: order.linkedOrderId ? 'order' : 'quote',
				items: order.items,
				linkedOrderId: order.linkedOrderId,
				quoteRequestId: order.id,
				requestReference: order.requestReference,
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
				type: order.type,
			},
		},
	}
}

function deliveryTrackingEvent(context: DeliveryTrackingContext): StreamChunk {
	const { delivery } = context
	const destinationPlace = customerDeliveryDestinationPlace(delivery)
	return {
		type: 'CUSTOM' as const,
		timestamp: Date.now(),
		name: 'rich_message',
		value: {
			type: 'delivery_tracking',
			data: {
				deliveryNumber: delivery.deliveryNumber,
				destinationPlace,
				driverName: delivery.driverName,
				driverPhone: delivery.driverPhone,
				driverPlace: describeDriverLocationForCustomer(delivery),
				estimatedArrival: delivery.estimatedArrival,
				lastUpdated: delivery.lastUpdated,
				orderNumber: delivery.orderNumber,
				route: {
					destination: destinationPlace,
					distanceKm: delivery.route.distanceKm,
				},
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

function commandPaletteEvent(): StreamChunk {
	const groups = commandPaletteGroups()
	return {
		type: 'CUSTOM' as const,
		timestamp: Date.now(),
		name: 'rich_message',
		value: {
			type: 'command_palette',
			data: {
				description:
					'Run safe shortcuts directly, or prepare commands that need a target, product, date, or message.',
				groups,
				title: 'Portal Command Desk',
			} satisfies CommandPaletteData,
		},
	}
}

function supportOptionsEvent(): StreamChunk {
	const options: SupportOptionsData['options'] = [
		{
			action: {
				href: `${WEBSITE_URL}/support#contact`,
				icon: 'external',
				label: 'Open contact',
				labelAr: 'افتح التواصل',
			},
			description: 'Website contact form and public support channels.',
			title: 'Contact',
		},
		{
			action: {
				href: `${WEBSITE_URL}/docs`,
				icon: 'book',
				label: 'Open docs',
				labelAr: 'افتح الوثائق',
			},
			description: 'Public HyperQuote guides and workflow documentation.',
			title: 'Docs',
		},
		{
			action: {
				href: `${WEBSITE_URL}/support#faq`,
				icon: 'help',
				label: 'Open FAQ',
				labelAr: 'افتح الأسئلة',
			},
			description: 'Quick answers for common customer questions.',
			title: 'FAQ',
		},
		{
			action: {
				icon: 'support',
				label: 'Open panel',
				labelAr: 'افتح اللوحة',
				route: '/support',
			},
			description: 'Portal support panel for account and order help.',
			title: 'Support panel',
		},
		{
			action: {
				href: `mailto:${SUPPORT_EMAIL}`,
				icon: 'mail',
				label: 'Email',
				labelAr: 'إيميل',
			},
			description: SUPPORT_EMAIL,
			title: 'Email',
		},
	]
	if (SUPPORT_PHONE_E164) {
		options.push({
			action: {
				href: `tel:${SUPPORT_PHONE_E164}`,
				icon: 'phone',
				label: 'Call',
				labelAr: 'اتصال',
			},
			description: SUPPORT_PHONE_E164,
			title: 'Phone',
		})
	}

	return {
		type: 'CUSTOM' as const,
		timestamp: Date.now(),
		name: 'rich_message',
		value: {
			type: 'support_options',
			data: {
				description:
					'Choose the exact support destination. External links open the public website.',
				options,
				title: 'Support Desk',
			} satisfies SupportOptionsData,
		},
	}
}

function commandPaletteGroups(): CommandPaletteData['groups'] {
	return portalChatCommandPaletteGroups()
}

function toolActionEvents(result: PortalToolResult): StreamChunk[] {
	switch (result.route.commandName) {
		case '/help':
			return [
				actionButtonEvent({
					icon: 'support',
					label: 'Support',
					labelAr: 'الدعم',
					route: '/support',
				}),
				actionButtonEvent({
					icon: 'orders',
					label: 'Orders',
					labelAr: 'الطلبات',
					route: '/orders',
				}),
				actionButtonEvent({
					icon: 'market',
					label: 'Market',
					labelAr: 'السوق',
					route: '/market',
				}),
			]
		case '/products':
		case '/compare-products':
		case '/recommend-materials':
		case '/market':
			return [
				actionButtonEvent({
					icon: 'market',
					label: 'Open market',
					labelAr: 'افتح السوق',
					route: '/market',
				}),
				actionButtonEvent({
					icon: 'draft',
					label: 'New draft',
					labelAr: 'مسودة جديدة',
					params: { draft: 'true' },
					route: '/orders',
				}),
			]
		case '/new-draft':
		case '/cart':
		case '/open-cart':
			return [
				actionButtonEvent({
					event: 'open_cart',
					icon: 'cart',
					label: 'Open cart',
					labelAr: 'افتح السلة',
				}),
				actionButtonEvent({
					event: 'open_draft_panel',
					icon: 'draft',
					label: 'Chat draft desk',
					labelAr: 'مكتب المسودات',
				}),
				actionButtonEvent({
					icon: 'market',
					label: 'Browse market',
					labelAr: 'تصفح السوق',
					route: '/market',
				}),
			]
		case '/orders':
		case '/status':
			return [
				actionButtonEvent({
					icon: 'orders',
					label: 'Open orders',
					labelAr: 'افتح الطلبات',
					route: '/orders',
				}),
				actionButtonEvent({
					icon: 'draft',
					label: 'New draft',
					labelAr: 'مسودة جديدة',
					params: { draft: 'true' },
					route: '/orders',
				}),
			]
		case '/drafts':
		case '/draft':
		case '/edit-draft':
		case '/validate-draft':
		case '/delete-draft':
		case '/clear-draft':
		case '/remove-from-draft':
		case '/rename-draft':
		case '/note-draft':
		case '/add-to-draft':
		case '/replace-draft-item':
		case '/set-draft-delivery':
		case '/reorder':
			return [
				actionButtonEvent({
					icon: 'orders',
					label: 'Open drafts',
					labelAr: 'افتح المسودات',
					route: '/orders',
				}),
				actionButtonEvent({
					event: 'open_draft_panel',
					icon: 'draft',
					label: 'Edit in chat',
					labelAr: 'تعديل في الشات',
				}),
				actionButtonEvent({
					icon: 'draft',
					label: 'New draft',
					labelAr: 'مسودة جديدة',
					params: { draft: 'true' },
					route: '/orders',
				}),
			]
		case '/latest-order':
		case '/activity':
		case '/track':
		case '/deliveries':
			return [
				actionButtonEvent({
					icon: 'orders',
					label: 'Open orders',
					labelAr: 'افتح الطلبات',
					route: '/orders',
				}),
				actionButtonEvent({
					icon: 'support',
					label: 'Support',
					labelAr: 'الدعم',
					route: '/support',
				}),
			]
		case '/profile':
		case '/addresses':
		case '/projects':
		case '/account-health':
			return [
				actionButtonEvent({
					icon: 'profile',
					label: 'Open profile panel',
					labelAr: 'افتح الملف الشخصي',
					route: '/profile',
				}),
				actionButtonEvent({
					icon: 'support',
					label: 'Support',
					labelAr: 'الدعم',
					route: '/support',
				}),
			]
		case '/support':
		case '/contact':
			return []
		case '/feedback':
			return [
				actionButtonEvent({
					icon: 'support',
					label: 'Support panel',
					labelAr: 'لوحة الدعم',
					route: '/support',
				}),
				actionButtonEvent({
					href: `mailto:${SUPPORT_EMAIL}`,
					icon: 'mail',
					label: 'Email support',
					labelAr: 'راسل الدعم',
				}),
				actionButtonEvent({
					href: `${WEBSITE_URL}/docs`,
					icon: 'book',
					label: 'Docs',
					labelAr: 'الوثائق',
				}),
				actionButtonEvent({
					href: `${WEBSITE_URL}/support#faq`,
					icon: 'help',
					label: 'FAQ',
					labelAr: 'الأسئلة الشائعة',
				}),
			]
		case '/docs':
		case '/docs-search':
			return [
				actionButtonEvent({
					href: `${WEBSITE_URL}/docs`,
					icon: 'book',
					label: 'Open docs',
					labelAr: 'افتح الوثائق',
				}),
				actionButtonEvent({
					href: `${WEBSITE_URL}/support#faq`,
					icon: 'help',
					label: 'FAQ',
					labelAr: 'الأسئلة الشائعة',
				}),
				actionButtonEvent({
					icon: 'support',
					label: 'Support',
					labelAr: 'الدعم',
					route: '/support',
				}),
			]
		case '/clear-all-drafts':
		case '/clean-drafts':
		case '/merge-drafts':
			return [
				actionButtonEvent({
					icon: 'orders',
					label: 'Open orders',
					labelAr: 'افتح الطلبات',
					route: '/orders',
				}),
				actionButtonEvent({
					icon: 'draft',
					label: 'New draft',
					labelAr: 'مسودة جديدة',
					params: { draft: 'true' },
					route: '/orders',
				}),
			]
		default:
			return contextActionEvents(result.context)
	}
}

function contextActionEvents(context: PortalToolContext): StreamChunk[] {
	switch (context.type) {
		case 'products':
			return [
				actionButtonEvent({
					icon: 'market',
					label: 'Open market',
					labelAr: 'افتح السوق',
					route: '/market',
				}),
				actionButtonEvent({
					icon: 'draft',
					label: 'New draft',
					labelAr: 'مسودة جديدة',
					params: { draft: 'true' },
					route: '/orders',
				}),
			]
		case 'orders':
			return [
				actionButtonEvent({
					icon: 'orders',
					label:
						context.orderScope === 'drafts' ? 'Open drafts' : 'Open orders',
					labelAr:
						context.orderScope === 'drafts' ? 'افتح المسودات' : 'افتح الطلبات',
					route: '/orders',
				}),
				...(context.orderScope === 'drafts'
					? [
							actionButtonEvent({
								event: 'open_draft_panel',
								icon: 'draft',
								label: 'Edit in chat',
								labelAr: 'تعديل في الشات',
							}),
						]
					: []),
				actionButtonEvent({
					icon: 'draft',
					label: 'New draft',
					labelAr: 'مسودة جديدة',
					params: { draft: 'true' },
					route: '/orders',
				}),
			]
		case 'order_detail':
		case 'delivery_tracking':
		case 'delivery_list':
		case 'draft_validation':
		case 'order_activity':
			return [
				actionButtonEvent({
					icon: 'orders',
					label: 'Open orders',
					labelAr: 'افتح الطلبات',
					route: '/orders',
				}),
				actionButtonEvent({
					icon: 'support',
					label: 'Support',
					labelAr: 'الدعم',
					route: '/support',
				}),
			]
		case 'profile':
		case 'addresses':
		case 'projects':
		case 'account_health':
			return [
				actionButtonEvent({
					icon: 'profile',
					label: 'Open profile panel',
					labelAr: 'افتح الملف الشخصي',
					route: '/profile',
				}),
				actionButtonEvent({
					icon: 'support',
					label: 'Support',
					labelAr: 'الدعم',
					route: '/support',
				}),
			]
		case 'support_request':
			return [
				actionButtonEvent({
					icon: 'support',
					label: 'Support',
					labelAr: 'الدعم',
					route: '/support',
				}),
				actionButtonEvent({
					href: `mailto:${SUPPORT_EMAIL}`,
					icon: 'mail',
					label: 'Email support',
					labelAr: 'راسل الدعم',
				}),
			]
		default:
			return []
	}
}

function actionButtonEvent(data: ActionButtonData): StreamChunk {
	return {
		type: 'CUSTOM' as const,
		timestamp: Date.now(),
		name: 'rich_message',
		value: {
			type: 'action_button',
			data,
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

function portalOpenDraftPanelEvent(draftId: string): StreamChunk {
	return {
		type: 'CUSTOM' as const,
		timestamp: Date.now(),
		name: 'portal_open_draft_panel',
		value: { draftId },
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

async function supplierPortalChunks(
	userText: string,
	modelMessages: ChatMessageInput[],
): Promise<StreamChunk[]> {
	if (await isAIEnabled())
		return streamWithCustomEvents(modelMessages, LYON_PORTAL, [])

	const simpleAnswer = simplePortalTextAnswer(userText, 'supplier')
	if (simpleAnswer) return textOnlyChunks(simpleAnswer, [])

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
