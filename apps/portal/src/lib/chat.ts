/**
 * Portal AI chat server function.
 *
 * Customer mode is a scoped agent loop:
 *   1. route the user message to an allowlisted tool intent,
 *   2. execute only customer-owned reads or draft-only writes,
 *   3. write a friendly final answer from the supplied tool context.
 *
 */

import {
	completeChat,
	completeChatWithTools,
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
	ChatTempDraftData,
	CommandPaletteData,
	PortalConfirmedActionPayload,
	PortalConfirmedDraftLinePayload,
	ProductChoiceListData,
	SupportOptionsData,
} from './chat-types'
import {
	customerDeliveryDestinationPlace,
	describeDriverLocationForCustomer,
	formatDeliveryTimestamp,
} from './delivery-location-copy'
import {
	draftProductIntentTerms,
	isBroadCatalogReadRequest,
	isOpenEndedCatalogSelectionRequest,
	productIntentTerms,
	productSearchTerm,
} from './portal-catalog-intent'
import { portalChatCommandPaletteGroups } from './portal-chat-commands'
import { portalChatShouldUseModel } from './portal-chat-routing'
import {
	buildPortalCustomerAgentPrompt,
	detectPortalAiLocale,
	enforcePortalCustomerToolRequest,
	fallbackPortalCustomerToolRequest,
	inferDraftItemEdit,
	isDraftWriteAction,
	type PortalCustomerCatalogSnapshot,
	type PortalCustomerToolRequest,
	parsePortalCustomerToolCall,
	parsePortalCustomerToolRequest,
	parsePortalDraftMaterialRequestLines,
	portalCustomerActionNeedsConfirmation,
	portalCustomerPolicyRefusal,
	portalCustomerToolDefinitions,
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
const PRODUCT_CATALOG_ROUTE_MATCH_LIMIT = 2500
const PORTAL_AI_PRODUCT_SELECT =
	'id, sku, slug, name, name_ar, category, category_name, category_name_ar, product_family_slug, product_family_name, product_family_name_ar, product_type_slug, product_type_name, product_type_name_ar, subcategory, subcategory_ar, unit_of_measure, unit_of_measure_ar, price_range_min, price_range_max, availability_status, image_urls, specifications, specifications_ar, description, description_ar'
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
		dirty: z.boolean().default(false),
		id: z.string().uuid().nullable(),
		items: z
			.array(
				z.object({
					lineId: z.string().max(180).default(''),
					orderable: z.boolean().default(false),
					productId: z.string().uuid().optional(),
					productName: z.string().max(240),
					productNameAr: z.string().max(240).optional(),
					quantity: z.number().min(0).max(1_000_000),
					unitOfMeasure: z.string().max(80),
					unitOfMeasureAr: z.string().max(80).optional(),
				}),
			)
			.max(40),
		name: z.string().max(160).nullable(),
		notes: z.string().max(600),
		reference: z.string().max(80).nullable(),
		sessionKey: z.string().max(180).optional(),
	})
	.nullable()
	.optional()

const confirmedActionInput = z
	.object({
		action: z.enum([
			'cleanup_drafts',
			'create_draft_from_plan',
			'delete_draft',
			'draft_add_items',
			'draft_replace_item',
			'support_request',
			'update_draft_items',
			'update_draft_metadata',
		]),
		cleanupMode: z.enum(['delete_all', 'merge', 'remove_empty']).optional(),
		draftItemAction: z
			.enum(['clear_items', 'remove_item', 'set_item_notes', 'set_quantity'])
			.optional(),
		draftLines: z
			.array(
				z.object({
					pendingChoiceId: z.string().max(120).optional(),
					productId: z.string().max(80).optional(),
					query: z.string().max(240),
					quantity: z.number().min(0).max(1_000_000),
					rawText: z.string().max(400).optional(),
					unitHint: z.string().max(80).optional(),
				}),
			)
			.max(20)
			.optional(),
		draftName: z.string().max(120).optional(),
		draftNotes: z.string().max(600).optional(),
		itemQuery: z.string().max(160).optional(),
		previousQuantity: z.number().min(0).max(1_000_000).optional(),
		quantity: z.number().min(0).max(1_000_000).optional(),
		replacementQuery: z.string().max(160).optional(),
		searchQuery: z.string().max(1200),
		supportMessage: z.string().max(1200).optional(),
		supportSubject: z.string().max(160).optional(),
		targetReference: z.string().max(180).optional(),
	})
	.nullable()
	.optional()

const portalChatInput = z.object({
	activeDraft: activeDraftInput,
	confirmedAction: confirmedActionInput,
	messages: z
		.array(
			z.object({
				role: z.enum(['user', 'assistant']),
				content: z.string().max(MAX_CHAT_MESSAGE_CHARACTERS),
			}),
		)
		.min(1)
		.max(MAX_CHAT_MESSAGES),
	conversationId: z.string().nullable(),
})

type ChatMessageInput = { role: 'user' | 'assistant'; content: string }
type AuthedSupabase = Awaited<
	ReturnType<typeof getAuthenticatedPortalCustomer>
>['supabase']
type QuoteRequestItemInput = Parameters<
	typeof insertQuoteRequestItems
>[2][number]

export interface PortalAiProduct {
	availability_status: string
	category: string
	category_name?: string | null
	category_name_ar?: string | null
	description: string | null
	description_ar: string | null
	id: string
	image_urls: string[] | null
	name: string
	name_ar: string | null
	price_range_max: number | null
	price_range_min: number | null
	product_family_slug?: string | null
	product_family_name?: string | null
	product_family_name_ar?: string | null
	product_type_slug?: string | null
	product_type_name?: string | null
	product_type_name_ar?: string | null
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
	category?: string
	imageUrl?: string
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

interface PortalSupportIdentity {
	verifiedEmail: string | null
}

interface PendingActionContext {
	actions: ActionButtonData[]
	message: string
	title: string
}

interface DraftProductChoiceOption {
	node?: DraftHierarchyChoiceNode
	product?: PortalAiProduct
}

interface DraftHierarchyChoiceNode {
	category: string
	id: string
	name: string
	nameAr: string
	priceRange: string
	productCount: number
	query: string
	subcategory?: string
	unit: string
	unitAr: string
}

interface DraftProductChoiceGroup {
	choiceKind?: 'hierarchy' | 'product'
	options: DraftProductChoiceOption[]
	pendingChoiceId: string
	query: string
	quantity: number
	rawText: string
	unitHint?: string
}

interface DraftProductChoiceContext {
	action: 'create_draft_from_plan' | 'draft_add_items'
	baseLines: PortalConfirmedDraftLinePayload[]
	groups: DraftProductChoiceGroup[]
	locale: 'ar' | 'en'
	targetReference?: string
	unavailableQueries?: string[]
}

interface DraftWriteContext {
	clearThreadSessionKeys?: string[]
	draftId?: string
	editRoute?: string
	items?: DraftMaterialItem[]
	kept?: string[]
	merged?: string[]
	reference?: string
	renamed?: Array<{ from: string; to: string }>
	deleted?: string[]
	message: string
	productChoice?: DraftProductChoiceContext
	tempDraft?: ChatTempDraftData
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

export const portalChatFn = createServerFn({ method: 'POST' })
	.inputValidator(portalChatInput)
	.handler(async ({ data: input }) => {
		const lastMessage = input.messages[input.messages.length - 1]
		const userText = lastMessage?.content ?? ''
		const modelMessages = modelChatMessages(input.messages)
		const { customerId, session, supabase } =
			await getAuthenticatedPortalCustomer()
		const supportIdentity = supportIdentityFromSession(session.user)

		const activeDraft = input.activeDraft ?? null
		const confirmedRoute = confirmedActionToToolRequest(
			input.confirmedAction ?? null,
		)
		const agentCatalog = await loadVisibleProductCatalog(
			supabase,
			PRODUCT_CATALOG_CONTEXT_LIMIT,
		)
		const initialRoute =
			confirmedRoute ??
			routePortalChatCommand(userText) ??
			explicitSupportTicketRoute(userText) ??
			(await requestPortalCustomerTool(
				modelMessages,
				userText,
				agentCatalog,
				activeDraft,
			))
		const routeRepairCatalog = shouldLoadCatalogForRouteRepair(
			initialRoute,
			userText,
			activeDraft,
		)
			? await loadVisibleProductCatalog(
					supabase,
					PRODUCT_CATALOG_ROUTE_MATCH_LIMIT,
				)
			: agentCatalog
		const route = confirmedRoute
			? initialRoute
			: forceActiveDraftItemEditRoute(
					applyActiveDraftContextToRoute(
						restorePendingChoiceQuantity(
							preserveUserDraftLineWording(
								correctPendingChoiceSelectionRoute(
									correctProductLineDraftRoute(
										correctActiveDraftItemEditRoute(
											await repairActiveDraftChatRoute(
												initialRoute,
												modelMessages,
												userText,
												activeDraft,
											),
											userText,
											activeDraft,
										),
										userText,
										activeDraft,
										routeRepairCatalog,
									),
									modelMessages,
									userText,
								),
								userText,
							),
							modelMessages,
							userText,
						),
						userText,
						activeDraft,
					),
					userText,
					activeDraft,
				)
		const result = await executePortalCustomerToolRequest(
			supabase,
			customerId,
			route,
			userText,
			supportIdentity,
			activeDraft,
		)
		const chunks = await renderPortalCustomerResponse(
			modelMessages,
			result,
			activeDraft,
		)

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

function explicitSupportTicketRoute(
	userText: string,
): PortalCustomerToolRequest | null {
	const normalized = normalizeForMatch(userText)
	if (
		!/\b(?:send|create|open|submit|file|raise|log)\s+support\b/.test(
			normalized,
		) &&
		!/\b(?:support request|support ticket|ticket|feedback)\s*[:-]/.test(
			normalized,
		)
	) {
		return null
	}
	const message = userText.trim()
	if (!message) return null
	return {
		action: 'support_request',
		searchQuery: message,
		supportMessage: message,
		supportSubject: supportSubjectFromMessage(message),
	}
}

function confirmedActionToToolRequest(
	action: PortalConfirmedActionPayload | null,
): PortalCustomerToolRequest | null {
	if (!action) return null
	return {
		action: action.action,
		cleanupMode: action.cleanupMode,
		confirmedAction: true,
		draftItemAction: action.draftItemAction,
		draftLines: confirmedDraftLinesToToolLines(action.draftLines),
		draftName: action.draftName,
		draftNotes: action.draftNotes,
		itemQuery: action.itemQuery,
		previousQuantity: action.previousQuantity,
		quantity: action.quantity,
		replacementQuery: action.replacementQuery,
		searchQuery: action.searchQuery,
		supportMessage: action.supportMessage,
		supportSubject: action.supportSubject,
		targetReference: action.targetReference,
		unavailableQueries: action.unavailableQueries,
	}
}

function confirmedDraftLinesToToolLines(
	lines: PortalConfirmedActionPayload['draftLines'],
): PortalCustomerToolRequest['draftLines'] {
	if (!lines) return undefined
	return lines.flatMap(
		(line): NonNullable<PortalCustomerToolRequest['draftLines']> => {
			const quantity =
				typeof line.quantity === 'number' && Number.isFinite(line.quantity)
					? line.quantity
					: 0
			const query = line.query.trim()
			if (!query || quantity <= 0) return []
			return [
				{
					pendingChoiceId: line.pendingChoiceId,
					productId: line.productId,
					query,
					quantity,
					rawText: line.rawText?.trim() || query,
					unitHint: line.unitHint,
				},
			]
		},
	)
}

function correctBroadCatalogReadRoute(
	route: PortalCustomerToolRequest,
	userText: string,
): PortalCustomerToolRequest {
	if (
		(route.action === 'chat' || route.action === 'public_docs') &&
		isBroadCatalogReadRequest(userText)
	) {
		return {
			action: 'product_search',
			searchQuery: '',
		}
	}
	return route
}

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
		const rawRoute = await completeChatWithTools(
			recentRouteMessages(messages),
			buildPortalCustomerAgentPrompt(
				toAgentCatalogSnapshot(catalog),
				activeDraft,
			),
			portalCustomerToolDefinitions(),
			{ temperature: 0 },
		)
		return correctBroadCatalogReadRoute(
			enforcePortalCustomerToolRequest(
				parsePortalCustomerToolCall(rawRoute, userText) ??
					parsePortalCustomerToolRequest(rawRoute.content, userText),
				userText,
			),
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
			category: catalogHierarchyPath(product, 'en'),
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

function correctProductLineDraftRoute(
	route: PortalCustomerToolRequest,
	userText: string,
	activeDraft: ActiveChatDraftContext | null,
	catalog: ProductCatalogResult,
): PortalCustomerToolRequest {
	const activeDraftShouldReceiveProducts =
		Boolean(activeDraft) && !asksForSeparateNewDraft(userText)
	if (
		route.action === 'create_draft_from_plan' &&
		activeDraftShouldReceiveProducts &&
		(isActiveDraftAddLineFollowup(userText) ||
			asksForProductHelp(userText) ||
			Boolean(route.draftLines?.length))
	) {
		const draftLines = route.draftLines?.length
			? route.draftLines
			: parsePortalDraftMaterialRequestLines(userText)
		const pendingMaterial =
			draftLines.length === 0
				? missingQuantityDraftMaterial(userText, catalog)
				: null
		return {
			...route,
			action: 'draft_add_items',
			draftLines:
				draftLines.length > 0
					? draftLines
					: pendingMaterial
						? [
								{
									query: pendingMaterial,
									quantity: 1,
									rawText: userText.trim(),
								},
							]
						: draftLines,
			searchQuery: route.searchQuery || userText,
		}
	}
	if (route.action === 'chat' || route.action === 'product_search') {
		const draftLines = parsePortalDraftMaterialRequestLines(userText)
		if (draftLines.length === 0) {
			if (activeDraft && isActiveDraftAddLineFollowup(userText)) {
				const pendingMaterial = missingQuantityDraftMaterial(userText, catalog)
				if (pendingMaterial) {
					return {
						...route,
						action: 'draft_add_items',
						draftLines: [
							{
								query: pendingMaterial,
								quantity: 1,
								rawText: userText.trim(),
							},
						],
						searchQuery: route.searchQuery || userText,
					}
				}
			}
			const pendingMaterial = missingQuantityDraftMaterial(userText, catalog)
			if (
				activeDraftShouldReceiveProducts &&
				pendingMaterial &&
				asksForProductHelp(userText)
			) {
				return {
					...route,
					action: 'draft_add_items',
					draftLines: [
						{
							query: pendingMaterial,
							quantity: 1,
							rawText: userText.trim(),
						},
					],
					searchQuery: route.searchQuery || userText,
				}
			}
			if (pendingMaterial && asksForProductHelp(userText)) {
				return {
					...route,
					action: 'create_draft_from_plan',
					draftLines: [
						{
							query: pendingMaterial,
							quantity: 1,
							rawText: userText.trim(),
						},
					],
					searchQuery: route.searchQuery || userText,
				}
			}
			return route
		}
		if (
			activeDraftShouldReceiveProducts &&
			(isActiveDraftAddLineFollowup(userText) || asksForProductHelp(userText))
		) {
			return {
				...route,
				action: 'draft_add_items',
				draftLines,
				searchQuery: route.searchQuery || userText,
			}
		}
		return {
			...route,
			action: 'create_draft_from_plan',
			draftLines,
			searchQuery: route.searchQuery || userText,
		}
	}
	if (route.action !== 'update_draft_items') return route
	if (
		route.draftItemAction ||
		route.itemQuery ||
		route.quantity ||
		route.previousQuantity
	) {
		return route
	}
	const draftLines = route.draftLines?.length
		? route.draftLines
		: parsePortalDraftMaterialRequestLines(userText)
	if (draftLines.length === 0) return route
	return {
		...route,
		action: 'create_draft_from_plan',
		draftItemAction: undefined,
		draftLines,
		itemQuery: undefined,
		previousQuantity: undefined,
		quantity: undefined,
		targetReference: undefined,
	}
}

function asksToAddDraftLine(userText: string): boolean {
	return /\b(?:add|append|include|put)\b/i.test(userText)
}

function asksForSeparateNewDraft(userText: string): boolean {
	const normalized = normalizeForMatch(userText)
	return (
		/\b(?:new|separate|another|fresh)\s+(?:draft|quote|rfq|request|order)\b/.test(
			normalized,
		) ||
		/\b(?:start over|new page)\b/.test(normalized) ||
		/مسوده جديده|طلب جديد|عرض جديد/.test(normalized)
	)
}

function asksForProductHelp(userText: string): boolean {
	const normalized = normalizeForMatch(userText)
	return (
		/\b(?:want|need|looking for|after|some|quote|draft|get|give me|order|take|grab|hook me up|send me|prepare)\b/i.test(
			normalized,
		) || /عايز|عاوزه|محتاج|هات|ضيف|اطلب|جهز/.test(userText)
	)
}

function isActiveDraftAddLineFollowup(userText: string): boolean {
	return (
		asksToAddDraftLine(userText) ||
		/\b(?:also|too|as well|same draft|same order|with that|how about)\b/i.test(
			userText,
		)
	)
}

function shouldLoadCatalogForRouteRepair(
	route: PortalCustomerToolRequest,
	userText: string,
	activeDraft: ActiveChatDraftContext | null,
): boolean {
	if (route.confirmedAction) return false
	if (
		route.action !== 'chat' &&
		route.action !== 'product_search' &&
		route.action !== 'create_draft_from_plan' &&
		route.action !== 'draft_add_items'
	) {
		return false
	}
	if (parsePortalDraftMaterialRequestLines(userText).length > 0) return false
	return asksForProductHelp(userText) || Boolean(activeDraft)
}

function missingQuantityDraftMaterial(
	userText: string,
	catalog: ProductCatalogResult,
): string | null {
	return catalogProductTermFromRequest(userText, catalog.products)
}

function catalogProductTermFromRequest(
	userText: string,
	products: PortalAiProduct[],
): string | null {
	const normalizedText = normalizeForMatch(userText)
	if (!normalizedText) return null
	const candidates = new Map<string, string>()
	for (const product of products) {
		for (const value of [
			product.name,
			product.name_ar ?? '',
			product.category,
			product.subcategory ?? '',
			product.subcategory_ar ?? '',
		]) {
			const normalized = normalizeForMatch(value)
			if (!normalized || normalized.length < 2) continue
			candidates.set(normalized, value.trim())
		}
	}
	const matches = Array.from(candidates.entries())
		.filter(([normalized]) => normalizedTextHasTerm(normalizedText, normalized))
		.sort((left, right) => {
			const lengthDelta = right[0].length - left[0].length
			if (lengthDelta !== 0) return lengthDelta
			return left[1].localeCompare(right[1])
		})
	return matches[0]?.[1] ?? null
}

function normalizedTextHasTerm(text: string, term: string): boolean {
	const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
	return new RegExp(`(?:^|\\s)${escaped}(?:\\s|$)`, 'i').test(text)
}

function correctActiveDraftItemEditRoute(
	route: PortalCustomerToolRequest,
	userText: string,
	activeDraft: ActiveChatDraftContext | null,
): PortalCustomerToolRequest {
	if (!activeDraft) return route
	if (
		route.action !== 'chat' &&
		route.action !== 'product_search' &&
		route.action !== 'public_docs' &&
		route.action !== 'create_draft_from_plan' &&
		route.action !== 'draft_add_items'
	) {
		return route
	}
	const replacement = inferActiveDraftReplacement(userText)
	if (replacement) {
		return {
			...route,
			action: 'draft_replace_item',
			itemQuery: replacement.itemQuery,
			replacementQuery: replacement.replacementQuery,
			searchQuery: route.searchQuery || userText,
		}
	}
	const singleItemDelta = inferSingleActiveDraftItemQuantityDelta(
		userText,
		activeDraft,
	)
	if (singleItemDelta) {
		return {
			...route,
			action: 'update_draft_items',
			draftItemAction: 'set_quantity',
			itemQuery: singleItemDelta.itemQuery,
			previousQuantity: singleItemDelta.previousQuantity,
			quantity: singleItemDelta.quantity,
			searchQuery: route.searchQuery || userText,
		}
	}
	const inferred =
		inferActiveDraftItemEdit(userText) ?? inferDraftItemEdit(userText)
	if (!inferred) return route
	return {
		...route,
		action: 'update_draft_items',
		draftItemAction: inferred.draftItemAction,
		itemQuery: inferred.itemQuery,
		previousQuantity: inferred.previousQuantity,
		quantity: inferred.quantity,
		searchQuery: route.searchQuery || userText,
	}
}

function forceActiveDraftItemEditRoute(
	route: PortalCustomerToolRequest,
	userText: string,
	activeDraft: ActiveChatDraftContext | null,
): PortalCustomerToolRequest {
	if (!activeDraft || route.confirmedAction) return route
	const singleItemDelta = inferSingleActiveDraftItemQuantityDelta(
		userText,
		activeDraft,
	)
	if (singleItemDelta) {
		return {
			...route,
			action: 'update_draft_items',
			draftItemAction: 'set_quantity',
			draftLines: undefined,
			itemQuery: singleItemDelta.itemQuery,
			previousQuantity: singleItemDelta.previousQuantity,
			quantity: singleItemDelta.quantity,
			replacementQuery: undefined,
			searchQuery: route.searchQuery || userText,
			targetReference: activeDraft.id ?? activeDraft.sessionKey ?? 'active',
		}
	}
	const inferred =
		inferActiveDraftItemEdit(userText) ?? inferDraftItemEdit(userText)
	if (!inferred) return route
	if (
		inferred.draftItemAction !== 'clear_items' &&
		inferred.itemQuery &&
		!activeDraftHasItemQuery(activeDraft, inferred.itemQuery)
	) {
		return route
	}
	return {
		...route,
		action: 'update_draft_items',
		draftItemAction: inferred.draftItemAction,
		draftLines: undefined,
		itemQuery: inferred.itemQuery,
		previousQuantity: inferred.previousQuantity,
		quantity: inferred.quantity,
		replacementQuery: undefined,
		searchQuery: route.searchQuery || userText,
		targetReference: activeDraft.id ?? activeDraft.sessionKey ?? 'active',
	}
}

function inferActiveDraftReplacement(
	userText: string,
): Pick<PortalCustomerToolRequest, 'itemQuery' | 'replacementQuery'> | null {
	const match = userText.match(
		/\b(?:replace|swap|change)\s+(.+?)\s+(?:with|to|for)\s+(.+)$/i,
	)
	const itemQuery = match?.[1]?.replace(/[.?!]+$/g, '').trim()
	const replacementQuery = match?.[2]?.replace(/[.?!]+$/g, '').trim()
	if (!itemQuery || !replacementQuery) return null
	return { itemQuery, replacementQuery }
}

function inferSingleActiveDraftItemQuantityDelta(
	userText: string,
	activeDraft: ActiveChatDraftContext,
): Pick<
	PortalCustomerToolRequest,
	'itemQuery' | 'previousQuantity' | 'quantity'
> | null {
	if (activeDraft.items.length !== 1) return null
	const normalized = normalizeForMatch(userText)
	const numberMatch = normalized.match(/\b(\d+(?:[.,]\d+)?)\b/)
	const delta = numberMatch
		? Number.parseFloat(numberMatch[1]?.replace(',', '.') ?? '')
		: Number.NaN
	if (!Number.isFinite(delta) || delta <= 0) return null
	const withoutNumber = normalized
		.replace(/\b\d+(?:[.,]\d+)?\b/, ' ')
		.replace(/\b(?:qty|quantity|pieces?|pcs?|units?|more|please|pls)\b/g, ' ')
		.replace(/\s+/g, ' ')
		.trim()
	const isIncrement =
		/\b(?:add|increase|plus)\b/.test(normalized) ||
		/\b(?:more)\b/.test(normalized)
	const isDecrement =
		/\b(?:deduct|subtract|minus|decrease|reduce|take off|remove)\b/.test(
			normalized,
		) || /\breduce\s+by\b/.test(normalized)
	const allowedRemainder = new Set([
		'',
		'add',
		'increase',
		'plus',
		'deduct',
		'subtract',
		'minus',
		'decrease',
		'reduce',
		'remove',
		'take off',
	])
	if (!isIncrement && !isDecrement) return null
	if (!allowedRemainder.has(withoutNumber)) return null
	const [item] = activeDraft.items
	if (!item) return null
	const nextQuantity = isDecrement
		? item.quantity - delta
		: item.quantity + delta
	if (!Number.isFinite(nextQuantity) || nextQuantity <= 0) return null
	return {
		itemQuery: item.productName,
		previousQuantity: item.quantity,
		quantity: nextQuantity,
	}
}

function inferActiveDraftItemEdit(
	userText: string,
): ReturnType<typeof inferDraftItemEdit> {
	const normalized = normalizeForMatch(userText)
	const setMatch = userText.match(
		/\b(?:make|set|change|update)\s+(.+?)\s+(?:to\s+)?(\d+(?:[.,]\d+)?)\b/i,
	)
	if (setMatch) {
		const quantity = Number(setMatch[2]?.replace(',', '.'))
		const itemQuery = setMatch[1]
			?.replace(/\b(?:quantity|qty|to)\b/gi, ' ')
			.replace(/\s+/g, ' ')
			.trim()
		if (itemQuery && Number.isFinite(quantity) && quantity > 0) {
			return {
				draftItemAction: 'set_quantity',
				itemQuery,
				quantity,
			}
		}
	}
	if (/\b(?:clear|empty|remove all|delete all)\b/.test(normalized)) {
		return { draftItemAction: 'clear_items' }
	}
	if (!/\b(?:remove|delete|drop|deduct)\b/.test(normalized)) return null
	const directRemove = userText.match(
		/\b(?:remove|delete|drop|deduct)\s+(.+?)(?:\s+(?:from|too|actually|please|pls)\b|[.,;?!]|$)/i,
	)?.[1]
	const itemQuery = (directRemove ?? userText)
		.replace(/\b(?:remove|delete|drop|deduct)\b/gi, ' ')
		.replace(/\b(?:from|in|the|this|that|draft|quote|item|line)\b/gi, ' ')
		.replace(/\b(?:actually|please|pls|too|also)\b/gi, ' ')
		.replace(/\s+/g, ' ')
		.trim()
	return {
		draftItemAction: 'remove_item',
		itemQuery: itemQuery || undefined,
	}
}

function preserveUserDraftLineWording(
	route: PortalCustomerToolRequest,
	userText: string,
): PortalCustomerToolRequest {
	if (
		route.action !== 'create_draft_from_plan' &&
		route.action !== 'draft_add_items'
	) {
		return route
	}
	const userLines = parsePortalDraftMaterialRequestLines(userText)
	if (userLines.length === 0) return route
	if (route.draftLines && route.draftLines.length !== userLines.length) {
		return route
	}
	return {
		...route,
		draftLines: userLines,
	}
}

function correctPendingChoiceSelectionRoute(
	route: PortalCustomerToolRequest,
	messages: ChatMessageInput[],
	userText: string,
): PortalCustomerToolRequest {
	if (!pendingChoiceSelectionCanOverride(route.action)) return route
	const pendingChoice = pendingBroadChoiceContext(messages)
	if (
		!pendingChoice &&
		parsePortalDraftMaterialRequestLines(userText).length > 0
	) {
		return route
	}
	const chosenQuery = pendingChoiceSelectedQuery(userText, pendingChoice)
	const wordCount = chosenQuery?.split(/\s+/).filter(Boolean).length ?? 0
	if (
		!chosenQuery ||
		chosenQuery.length > 120 ||
		wordCount > 4 ||
		/\b(?:wrong|incorrect|mistake|cancel|nope|nah)\b/i.test(chosenQuery)
	) {
		return route
	}
	const pendingLine = pendingChoice?.line ?? pendingBroadChoiceLine(messages)
	if (!pendingLine) return route
	return {
		...route,
		action: 'create_draft_from_plan',
		draftLines: [
			{
				pendingChoiceId: pendingLine.query,
				query: chosenQuery,
				quantity: pendingLine.quantity,
				rawText: chosenQuery,
				unitHint: pendingLine.unitHint,
			},
		],
		searchQuery: route.searchQuery || chosenQuery,
	}
}

function pendingChoiceSelectionCanOverride(
	action: PortalCustomerToolRequest['action'],
): boolean {
	return (
		action === 'chat' ||
		action === 'product_search' ||
		action === 'compare_products' ||
		action === 'recommend_materials' ||
		action === 'public_docs' ||
		action === 'create_draft_from_plan'
	)
}

function restorePendingChoiceQuantity(
	route: PortalCustomerToolRequest,
	messages: ChatMessageInput[],
	userText: string,
): PortalCustomerToolRequest {
	if (route.action !== 'create_draft_from_plan') return route
	if (!route.draftLines?.length) return route
	if (parsePortalDraftMaterialRequestLines(userText).length > 0) return route

	const chosenQuery = userText.trim()
	if (!chosenQuery || chosenQuery.length > 120) return route

	const pendingLine = pendingBroadChoiceLine(messages)
	if (!pendingLine) return route

	return {
		...route,
		draftLines: route.draftLines.map((line) => ({
			...line,
			pendingChoiceId: line.pendingChoiceId ?? pendingLine.query,
			quantity: line.quantity > 1 ? line.quantity : pendingLine.quantity,
			unitHint: line.unitHint ?? pendingLine.unitHint,
		})),
		searchQuery: route.searchQuery || chosenQuery,
	}
}

function pendingBroadChoiceLine(
	messages: ChatMessageInput[],
): ReturnType<typeof parsePortalDraftMaterialRequestLines>[number] | null {
	return (
		[...messages]
			.slice(0, -1)
			.reverse()
			.flatMap((message) =>
				message.role === 'user'
					? parsePortalDraftMaterialRequestLines(message.content)
					: [],
			)
			.find((line) => isBroadDraftChoiceQuery(line.query)) ?? null
	)
}

function pendingBroadChoiceContext(messages: ChatMessageInput[]): {
	choices: Array<{ index: number; name: string }>
	line: ReturnType<typeof parsePortalDraftMaterialRequestLines>[number]
} | null {
	const previousMessages = messages.slice(0, -1)
	for (let index = previousMessages.length - 1; index >= 0; index -= 1) {
		const message = previousMessages[index]
		if (message?.role !== 'assistant') continue
		const query = message.content.match(/multiple\s+(.+?)\s+options/i)?.[1]
		if (!query || !isBroadDraftChoiceQuery(query)) continue
		const line = [...previousMessages]
			.slice(0, index)
			.reverse()
			.flatMap((candidate) =>
				candidate.role === 'user'
					? parsePortalDraftMaterialRequestLines(candidate.content)
					: [],
			)
			.find(
				(candidate) =>
					normalizeForMatch(candidate.query) === normalizeForMatch(query),
			)
		if (!line) continue
		return {
			choices: numberedChoiceNames(message.content),
			line,
		}
	}
	return null
}

function numberedChoiceNames(
	content: string,
): Array<{ index: number; name: string }> {
	const numbered = content
		.split(/\n+/)
		.flatMap((line): Array<{ index: number; name: string }> => {
			const match = line.match(/^\s*(\d+)\.\s+(.+?)(?:\s+-\s+|$)/)
			const index = Number(match?.[1])
			const name = match?.[2]?.trim()
			if (!Number.isInteger(index) || !name) return []
			return [{ index, name }]
		})
	if (numbered.length > 0) return numbered
	return content
		.split(/\n+/)
		.flatMap((line): string[] => {
			const match = line.match(/^\s*([^-:\n]+?)\s+-\s+/)
			const name = match?.[1]?.trim()
			if (!name || /^i found multiple/i.test(name)) return []
			return [name]
		})
		.map((name, index) => ({ index: index + 1, name }))
}

function pendingChoiceSelectedQuery(
	userText: string,
	pendingChoice: ReturnType<typeof pendingBroadChoiceContext>,
): string | null {
	const cleaned = userText
		.replace(/\b(?:yeah|yes|yep|ok|okay|sure|please|pls)\b/gi, ' ')
		.replace(/\b(?:i\s+mean|i\s+meant|mean)\b/gi, ' ')
		.replace(/[.?!]+/g, ' ')
		.replace(/\s+/g, ' ')
		.trim()
	const numeric = cleaned.match(/(?:^|\D)(\d+)(?:\D|$)/)?.[1]
	if (numeric && pendingChoice) {
		const selected = pendingChoice.choices.find(
			(choice) => choice.index === Number(numeric),
		)
		if (selected) return selected.name
	}
	return cleaned || null
}

async function repairActiveDraftChatRoute(
	route: PortalCustomerToolRequest,
	messages: ChatMessageInput[],
	userText: string,
	activeDraft: ActiveChatDraftContext | null,
): Promise<PortalCustomerToolRequest> {
	if (!activeDraft?.id || route.commandName || route.action !== 'chat') {
		return route
	}
	if (!(await isAIEnabled())) return route
	const prompt = `${LYON_PORTAL}

The customer has an active draft open.
Decide whether the latest user message is asking to inspect or modify that active draft.
Use any human language naturally. Return JSON only.

Allowed JSON:
{"tool":"chat","search_query":"string","final_response":"string"}
{"tool":"draft_detail","search_query":"string","target_reference":"active"}
{"tool":"draft_validate","search_query":"string","target_reference":"active"}
{"tool":"update_draft_items","draft_item_action":"clear_items"|"remove_item"|"set_quantity"|"set_item_notes","item_query":"string","quantity":123,"previous_quantity":123,"item_notes":"string","search_query":"string","target_reference":"active"}
{"tool":"update_draft_metadata","draft_name":"string","draft_notes":"string","search_query":"string","target_reference":"active"}

Rules:
- If the user asks to change the active draft, choose a draft tool. Do not claim the change happened from chat.
- If a destructive edit is requested, choose the tool; the app will handle confirmation.
- If the message is normal conversation, choose chat.

Active draft:
${safeJson(activeDraft)}

Latest user message:
${userText}`
	try {
		const rawRoute = await completeChat(recentRouteMessages(messages), prompt, {
			temperature: 0,
		})
		const repaired = enforcePortalCustomerToolRequest(
			parsePortalCustomerToolRequest(rawRoute, userText),
			userText,
		)
		if (repaired.action === 'chat') return route
		if (!draftRouteCanUseActiveContext(repaired.action)) return route
		return {
			...repaired,
			targetReference: repaired.targetReference ?? activeDraft.id,
		}
	} catch {
		return route
	}
}

function applyActiveDraftContextToRoute(
	route: PortalCustomerToolRequest,
	userText: string,
	activeDraft: ActiveChatDraftContext | null,
): PortalCustomerToolRequest {
	if (!activeDraft || !draftRouteCanUseActiveContext(route.action)) {
		return route
	}
	const activeReference = activeDraft.id ?? activeDraft.sessionKey ?? 'active'
	if (route.targetReference) {
		if (!activeDraft.id && tempDraftItemMutationCanUseActive(route.action)) {
			return { ...route, targetReference: activeReference }
		}
		return isCurrentDraftReference(route.targetReference)
			? { ...route, targetReference: activeReference }
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
		route.action === 'draft_add_items' ||
		(route.action === 'draft_set_delivery' &&
			(!descriptor.specific || activeMatchesDescriptor))
	if (
		activeMatchesDescriptor ||
		canUseActiveForLineTarget ||
		canUseActiveForDraftMutation
	) {
		return { ...route, targetReference: activeReference }
	}
	return route
}

function tempDraftItemMutationCanUseActive(
	action: PortalCustomerToolRequest['action'],
): boolean {
	return (
		action === 'draft_add_items' ||
		action === 'draft_replace_item' ||
		action === 'update_draft_items'
	)
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
	return simplePortalTextAnswer(userText)
}

function simplePortalTextAnswer(userText: string): string | null {
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
	supportIdentity: PortalSupportIdentity,
	activeDraft: ActiveChatDraftContext | null,
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
		supportIdentity,
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
			const catalog = isBroadCatalogReadRequest(userText)
				? await loadVisibleProductCatalog(
						supabase,
						PRODUCT_CATALOG_CONTEXT_LIMIT,
					)
				: await findPublishedProducts(
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
			const result = await createDraftFromPlan(supabase, route, userText)
			return draftWriteToolResult(route, 'create_draft_from_plan', result)
		}
		case 'draft_add_items': {
			const result = await addItemsToDraft(
				supabase,
				customerId,
				route,
				userText,
				activeDraft,
			)
			return draftWriteToolResult(route, 'draft_add_items', result)
		}
		case 'draft_replace_item': {
			const result = await replaceDraftItem(
				supabase,
				customerId,
				route,
				userText,
				activeDraft,
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
				activeDraft,
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
				supportIdentity,
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
			result.clearThreadSessionKeys?.length ||
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
	supportIdentity: PortalSupportIdentity,
): Promise<PendingActionContext | null> {
	if (!portalCustomerActionNeedsConfirmation(route, userText)) return null

	switch (route.action) {
		case 'support_request':
			return pendingSupportTicketConfirmation(route, userText, supportIdentity)
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
	supportIdentity: PortalSupportIdentity,
): PendingActionContext | null {
	const message = (route.supportMessage || route.searchQuery || userText).trim()
	if (!message || message === '/feedback') return null
	const hasVerifiedEmail = Boolean(supportIdentity.verifiedEmail)
	const actions: ActionButtonData[] = [
		hasVerifiedEmail
			? confirmationButton({
					action: {
						action: 'support_request',
						searchQuery: message,
						supportMessage: message,
						supportSubject:
							route.supportSubject ?? supportSubjectFromMessage(message),
					},
					icon: 'support',
					label: 'Submit ticket',
					labelAr: 'إرسال التذكرة',
				})
			: {
					action: {
						action: 'support_request',
						searchQuery: message,
						supportMessage: message,
						supportSubject:
							route.supportSubject ?? supportSubjectFromMessage(message),
					},
					icon: 'support',
					label: 'Submit ticket',
					labelAr: 'إرسال التذكرة',
					unavailableMessage: supportVerifiedEmailRequiredMessage(),
					unavailableMessageAr:
						'تحتاج إلى إضافة بريد إلكتروني مؤكد في ملفك قبل إرسال تذكرة من ليون. إذا كان الأمر عاجلاً، اتصل بنا بالهاتف.',
					unavailableActions: [
						SUPPORT_PHONE_E164
							? {
									href: `tel:${SUPPORT_PHONE_E164}`,
									icon: 'phone',
									label: 'Call',
									labelAr: 'اتصال',
								}
							: {
									icon: 'phone',
									label: 'Call',
									labelAr: 'اتصال',
									route: '/support',
								},
						{
							href: `${WEBSITE_URL}/support#contact`,
							icon: 'mail',
							label: 'Contact',
							labelAr: 'تواصل',
						},
						{
							icon: 'profile',
							label: 'Edit Profile',
							labelAr: 'تعديل الملف',
							route: '/profile',
						},
					],
					unavailableTitle: 'Verified email required',
					unavailableTitleAr: 'مطلوب بريد مؤكد',
				},
		{
			icon: 'profile',
			label: hasVerifiedEmail ? 'Open profile' : 'Add verified email',
			labelAr: hasVerifiedEmail ? 'افتح الملف الشخصي' : 'أضف بريداً مؤكداً',
			route: '/profile',
		},
		{
			icon: hasVerifiedEmail ? 'support' : 'phone',
			label: hasVerifiedEmail ? 'Support panel' : 'Call options',
			labelAr: hasVerifiedEmail ? 'لوحة الدعم' : 'خيارات الاتصال',
			route: '/support',
		},
		{
			href: `${WEBSITE_URL}/docs`,
			icon: 'book',
			label: 'Open docs',
			labelAr: 'افتح الوثائق',
		},
	]
	if (!hasVerifiedEmail && SUPPORT_PHONE_E164) {
		actions.push({
			href: `tel:${SUPPORT_PHONE_E164}`,
			icon: 'phone',
			label: 'Call support',
			labelAr: 'اتصل بالدعم',
		})
	}

	return {
		actions,
		message: hasVerifiedEmail
			? 'I can send this as a support ticket, but only if you press the button.'
			: 'Support tickets from Lyon require a verified email on your account. Add and confirm email in Profile, or call us by phone.',
		title: hasVerifiedEmail ? 'Confirm ticket' : 'Ticket needs email',
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
				action: {
					action: 'delete_draft',
					searchQuery: draft.request_number,
					targetReference: draft.id,
				},
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
					action: {
						action: 'cleanup_drafts',
						cleanupMode: 'merge',
						searchQuery: 'merge editable drafts',
					},
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
				action: {
					action: 'cleanup_drafts',
					cleanupMode: mode,
					searchQuery:
						mode === 'delete_all'
							? 'delete all editable drafts'
							: 'remove empty editable drafts',
				},
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

	return {
		actions: [
			confirmationButton({
				action: {
					action: 'update_draft_metadata',
					draftName: nextName,
					draftNotes: nextName ? undefined : (nextNotes ?? ''),
					searchQuery: draft.request_number,
					targetReference: draft.id,
				},
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
					action: {
						action: 'update_draft_items',
						draftItemAction: 'clear_items',
						searchQuery: draft.request_number,
						targetReference: draft.id,
					},
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
				action: {
					action: 'update_draft_items',
					draftItemAction: 'remove_item',
					itemQuery: itemName,
					searchQuery: draft.request_number,
					targetReference: draft.id,
				},
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
				action: {
					action: 'draft_replace_item',
					itemQuery,
					replacementQuery: route.replacementQuery,
					searchQuery: draft.request_number,
					targetReference: draft.id,
				},
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

async function renderPortalCustomerResponse(
	modelMessages: ChatMessageInput[],
	result: PortalToolResult,
	activeDraft: ActiveChatDraftContext | null,
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
		if (
			portalChatShouldUseModel({
				aiEnabled: await isAIEnabled(),
				commandName: result.route.commandName,
				contextMessage: result.context.message,
			})
		) {
			return streamWithCustomEvents(
				modelMessages,
				buildPortalChatAnswerPrompt(activeDraft),
				customEvents,
			)
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
	if (result.context.type === 'draft_write') {
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
			buildPortalToolAnswerPrompt(result.context, activeDraft),
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

function buildPortalChatAnswerPrompt(
	activeDraft: ActiveChatDraftContext | null,
): string {
	return `${LYON_PORTAL}

${activeDraftAnswerContext(activeDraft)}

Answer in the user's language. Use the selected cart or draft as real context for project planning, quantity reasoning, and follow-up suggestions.
If the user asks what is in the selected cart or draft, answer directly from the provided context. Never say you cannot view it when this context is present.
Do not expose raw IDs. Ask one short question only when the selected context is missing the detail needed to continue.`
}

function buildPortalToolAnswerPrompt(
	context: Exclude<
		PortalToolContext,
		{ type: 'chat' | 'pending_action' | 'public_docs' | 'refusal' }
	>,
	activeDraft: ActiveChatDraftContext | null,
): string {
	return `${LYON_PORTAL}

Use only this portal tool result. Answer in the user's language.
Be concise: lead with the useful answer, then give at most one practical next step.
Do not expose raw IDs or internal fields. If something is missing, ask one short question.
Use markdown tables only when they make records or line items easier to scan.
${toolAnswerStyleInstructions(context)}

${activeDraftAnswerContext(activeDraft)}

Portal tool result:
${safeJson(context)}`
}

function activeDraftAnswerContext(
	activeDraft: ActiveChatDraftContext | null,
): string {
	if (!activeDraft) {
		return 'Current selected cart / draft desk: none selected.'
	}
	const workspaceLabel =
		activeDraft.sessionKey === 'cart' && !activeDraft.id
			? 'live Cart'
			: activeDraft.id
				? 'saved draft'
				: 'temporary draft'
	return `Current selected cart / draft desk (${workspaceLabel}):
${safeJson({
	dirty: activeDraft.dirty,
	items: activeDraft.items.map((item) => ({
		name: item.productName,
		nameAr: item.productNameAr,
		orderable: item.orderable,
		quantity: item.quantity,
		unit: item.unitOfMeasure,
		unitAr: item.unitOfMeasureAr,
	})),
	name: activeDraft.name,
	notes: activeDraft.notes,
	reference: activeDraft.reference,
	sessionKey: activeDraft.sessionKey,
})}`
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
			return 'Products: use the supplied products and only Available/Unavailable status. Ask before drafting unless explicitly requested.'
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
				'Start a fresh draft or open the draft panel.',
			].join('\n')
		case '/cart':
		case '/open-cart':
			return [
				'## Cart',
				commandName === '/open-cart'
					? 'Opened your cart.'
					: 'Your cart is saved in this browser. Use the cart button below to open it.',
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
			? 'No items are saved.'
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
			: 'I could not find a matching product. Tell me the material, size, or product name and I will check again.'
	}
	const rows = context.products.map((product) => {
		const name =
			isArabic && product.name_ar
				? `${product.name_ar} / ${product.name}`
				: `${product.name}${product.name_ar ? ` / ${product.name_ar}` : ''}`
		return `| ${markdownTableCell(name)} | ${availabilityLabel(product, context.locale)} | ${markdownTableCell(unitLabel(product, context.locale))} | ${markdownTableCell(formatPriceRange(product, context.locale))} |`
	})
	const unavailableCount = context.products.filter(
		(product) => !isCustomerVisibleAvailable(product),
	).length
	const visibleCountText =
		context.products.length === context.totalVisibleProducts
			? isArabic
				? `${context.products.length} منتج`
				: `${context.products.length} product${context.products.length === 1 ? '' : 's'}`
			: isArabic
				? `${context.products.length} من ${context.totalVisibleProducts}`
				: `${context.products.length} of ${context.totalVisibleProducts}`
	const availabilityNote =
		unavailableCount > 0
			? isArabic
				? 'المنتجات غير المتاحة للعلم فقط ولن أضيفها لمسودة. تحب أضيف المنتجات المتاحة لمسودة تراجعها؟'
				: 'Some products are currently unavailable, so I will not add those to a draft. I can prepare a draft with the available products when you are ready.'
			: isArabic
				? 'كل هذه المنتجات متاحة للطلب. تحب أضيف أي منها لمسودة تراجعها؟'
				: 'All of these are available to order. I can add any of them to a draft when you are ready.'
	if (isArabic) {
		return [
			`هذه المنتجات المتاحة الآن (${visibleCountText}):`,
			'',
			'| المنتج | الحالة | الوحدة | السعر |',
			'| --- | --- | --- | --- |',
			...rows,
			'',
			availabilityNote,
		].join('\n')
	}
	return [
		`Here is what is available right now (${visibleCountText}):`,
		'',
		'| Product | Status | Unit | Price |',
		'| --- | --- | --- | --- |',
		...rows,
		'',
		availabilityNote,
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
			if (result.context.result.productChoice) {
				events.push(productChoiceListEvent(result.context.result.productChoice))
			}
			if (result.context.result.clearThreadSessionKeys?.length) {
				events.push(
					portalClearDraftThreadsEvent(
						result.context.result.clearThreadSessionKeys,
					),
				)
			}
			if (result.context.result.tempDraft) {
				events.push(portalOpenDraftPanelEvent(result.context.result.tempDraft))
			}
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
		issues.push('At least one editable draft includes unavailable items.')
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
		.from('catalog_product_hierarchy')
		.select(PORTAL_AI_PRODUCT_SELECT, { count: 'exact' })
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
		let builder = supabase
			.from('catalog_product_hierarchy')
			.select(PORTAL_AI_PRODUCT_SELECT)
			.eq('is_active', true)
			.neq('availability_status', 'hidden')
			.neq('availability_status', 'out_of_stock')
			.order('name', { ascending: true })
			.limit(OPEN_ENDED_DRAFT_PRODUCT_POOL_SIZE)
		const query = openEndedSelection ? null : productSearchTerm(userText)
		const filter = query ? publicProductSearchFilter(query) : ''
		if (filter) builder = builder.or(filter)
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
		.from('catalog_product_hierarchy')
		.select(PORTAL_AI_PRODUCT_SELECT)
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
	if (!openEndedSelection && query && products.length === 0) {
		return loadOrderableDraftProductPool(supabase)
	}
	return openEndedSelection
		? deterministicProductSample(
				products,
				userText,
				OPEN_ENDED_DRAFT_ITEM_COUNT,
			)
		: products
}

async function loadOrderableDraftProductPool(
	supabase: AuthedSupabase,
): Promise<PortalAiProduct[]> {
	const { data, error } = await supabase
		.from('catalog_product_hierarchy')
		.select(PORTAL_AI_PRODUCT_SELECT)
		.eq('is_active', true)
		.neq('availability_status', 'hidden')
		.neq('availability_status', 'out_of_stock')
		.order('name', { ascending: true })
		.limit(OPEN_ENDED_DRAFT_PRODUCT_POOL_SIZE)
	if (error) throw new Error(error.message)
	return (data ?? []) as PortalAiProduct[]
}

async function createDraftFromPlan(
	supabase: AuthedSupabase,
	route: PortalCustomerToolRequest,
	userText: string,
): Promise<DraftWriteContext> {
	const locale = detectPortalAiLocale(userText)
	const routeQuery = route.searchQuery.trim()
	const draftPlanText =
		routeQuery && routeQuery !== userText.trim()
			? `${userText} ${route.searchQuery}`
			: userText
	const requestedLines =
		route.draftLines && route.draftLines.length > 0
			? route.draftLines
			: parsePortalDraftMaterialRequestLines(draftPlanText)
	const items =
		requestedLines.length > 0
			? await buildDraftItemsFromRequestedLines(
					supabase,
					requestedLines,
					locale,
					{
						action: 'create_draft_from_plan',
					},
				)
			: buildDraftItemsFromPlan(
					draftPlanText,
					await findOrderableProductsForDraft(
						supabase,
						draftPlanText,
						route.searchQuery,
					),
				)
	if ('message' in items) {
		return { message: items.message, productChoice: items.productChoice }
	}
	const {
		items: resolvedDraftItems,
		unavailableQueries: resolvedUnavailableQueries,
	} = resolvedDraftItemsWithUnavailable(items)
	const unavailableQueries = mergeUnavailableDraftQueries(
		route.unavailableQueries,
		resolvedUnavailableQueries,
	)
	if (resolvedDraftItems.length === 0) {
		const visibleMatches = await findPublishedProducts(
			supabase,
			draftPlanText,
			5,
		)
		return {
			message:
				visibleMatches.products.length > 0
					? `I found catalog matches, but none are available to add right now: ${visibleMatches.products.map((product) => `${product.name} (${availabilityLabel(product, detectPortalAiLocale(userText))})`).join(', ')}. I did not create a draft.`
					: 'I could not find a product I can add to a draft. I left the draft unchanged.',
		}
	}
	if (resolvedDraftItems.some((item) => !item.productId)) {
		throw new Error('Portal AI draft creation requires real catalog products')
	}
	const draftName = normalizePortalDraftTitle(
		route.draftName,
		resolvedDraftItems,
		locale,
	)
	const draftNotes = normalizePortalDraftNotes(
		route.draftNotes,
		resolvedDraftItems,
		locale,
	)
	const tempDraft = tempDraftDataFromDraftItems(
		draftName,
		draftNotes,
		resolvedDraftItems,
	)
	const unavailableNote = unavailableDraftLineNote(unavailableQueries, locale)

	return {
		items: resolvedDraftItems,
		message: `I prepared a draft with ${resolvedDraftItems.length} item${resolvedDraftItems.length === 1 ? '' : 's'}. You can review and save it when you are ready.${unavailableNote}`,
		tempDraft,
	}
}

function tempDraftDataFromDraftItems(
	name: string,
	notes: string,
	items: DraftMaterialItem[],
	sessionKey = `draft:temp:${crypto.randomUUID()}`,
): ChatTempDraftData {
	return {
		items: items.map((item) => ({
			availabilityStatus: 'available',
			category: item.category ?? 'catalog',
			imageUrl: item.imageUrl ?? '',
			productId: item.productId ?? '',
			productName: item.name,
			productNameAr: item.nameAr,
			quantity: item.qty,
			unitOfMeasure: item.unit,
			unitOfMeasureAr: item.unitAr,
		})),
		name,
		notes,
		sessionKey,
	}
}

function draftSessionKey(draftId: string): string {
	return `draft:${draftId}`
}

function isActiveTempDraftTarget(
	activeDraft: ActiveChatDraftContext | null,
	targetReference: string | undefined,
): activeDraft is ActiveChatDraftContext {
	if (!activeDraft || activeDraft.id) return false
	return (
		!targetReference ||
		isCurrentDraftReference(targetReference) ||
		targetReference === activeDraft.sessionKey
	)
}

function activeTempDraftItems(
	activeDraft: ActiveChatDraftContext,
): DraftMaterialItem[] {
	return activeDraft.items.map((item) => ({
		category: 'catalog',
		imageUrl: '',
		name: item.productName,
		nameAr: item.productNameAr ?? item.productName,
		orderable: item.orderable,
		productId: item.productId,
		qty: item.quantity,
		unit: item.unitOfMeasure,
		unitAr: item.unitOfMeasureAr ?? item.unitOfMeasure,
	}))
}

function activeTempDraftPayload(
	activeDraft: ActiveChatDraftContext,
	items: DraftMaterialItem[],
): ChatTempDraftData {
	return tempDraftDataFromDraftItems(
		activeDraft.name ?? 'Portal AI draft',
		activeDraft.notes,
		items,
		activeDraft.sessionKey,
	)
}

function activeTempDraftLabel(activeDraft: ActiveChatDraftContext): string {
	return activeDraft.sessionKey === 'cart' ? 'cart' : 'draft'
}

async function addItemsToTempDraft(
	supabase: AuthedSupabase,
	route: PortalCustomerToolRequest,
	userText: string,
	activeDraft: ActiveChatDraftContext,
): Promise<DraftWriteContext> {
	const locale = detectPortalAiLocale(userText)
	const workspaceLabel = activeTempDraftLabel(activeDraft)
	const searchText = route.itemQuery || route.searchQuery || userText
	let requestedLines =
		route.draftLines && route.draftLines.length > 0
			? route.draftLines
			: parsePortalDraftMaterialRequestLines(searchText)
	const currentItems = activeTempDraftItems(activeDraft)
	if (requestedLines.length === 0 && isActiveDraftAddLineFollowup(userText)) {
		const pendingMaterial = missingQuantityDraftMaterial(
			searchText,
			await loadVisibleProductCatalog(
				supabase,
				PRODUCT_CATALOG_ROUTE_MATCH_LIMIT,
			),
		)
		if (pendingMaterial) {
			requestedLines = [
				{
					query: pendingMaterial,
					quantity: 1,
					rawText: userText.trim(),
				},
			]
		}
	}
	const resolvedItems =
		requestedLines.length > 0
			? await buildDraftItemsFromRequestedLines(
					supabase,
					requestedLines,
					locale,
					{ action: 'draft_add_items' },
				)
			: buildDraftItemsFromPlan(
					searchText,
					await findOrderableProductsForDraft(supabase, searchText, searchText),
				)
	if ('message' in resolvedItems) {
		return {
			items: currentItems,
			message: resolvedItems.message,
			productChoice: resolvedItems.productChoice,
			tempDraft: activeTempDraftPayload(activeDraft, currentItems),
		}
	}
	const { items, unavailableQueries: resolvedUnavailableQueries } =
		resolvedDraftItemsWithUnavailable(resolvedItems)
	const unavailableQueries = mergeUnavailableDraftQueries(
		route.unavailableQueries,
		resolvedUnavailableQueries,
	)
	if (items.length === 0 || items.some((item) => !item.productId)) {
		return {
			items: currentItems,
			message: 'I could not find an available product to add.',
			tempDraft: activeTempDraftPayload(activeDraft, currentItems),
		}
	}
	const nextItems = mergeDraftMaterialItems(currentItems, items)
	return {
		items: nextItems,
		message: `I added ${items.length} item${items.length === 1 ? '' : 's'} to the ${workspaceLabel}.${unavailableDraftLineNote(unavailableQueries, locale)}`,
		tempDraft: activeTempDraftPayload(activeDraft, nextItems),
	}
}

function mergeDraftMaterialItems(
	currentItems: DraftMaterialItem[],
	addedItems: DraftMaterialItem[],
): DraftMaterialItem[] {
	const merged = currentItems.map((item) => ({ ...item }))
	const indexByProductId = new Map<string, number>()
	for (const [index, item] of merged.entries()) {
		if (item.productId) indexByProductId.set(item.productId, index)
	}
	for (const item of addedItems) {
		const existingIndex = item.productId
			? indexByProductId.get(item.productId)
			: undefined
		if (existingIndex !== undefined) {
			const existing = merged[existingIndex]
			if (!existing) continue
			merged[existingIndex] = {
				...existing,
				notes: existing.notes || item.notes,
				orderable: existing.orderable ?? item.orderable,
				qty: existing.qty + item.qty,
			}
			continue
		}
		const nextIndex = merged.length
		merged.push({ ...item })
		if (item.productId) indexByProductId.set(item.productId, nextIndex)
	}
	return merged
}

async function updateTempDraftItems(
	supabase: AuthedSupabase,
	route: PortalCustomerToolRequest,
	userText: string,
	activeDraft: ActiveChatDraftContext,
): Promise<DraftWriteContext> {
	const workspaceLabel = activeTempDraftLabel(activeDraft)
	const inferred =
		inferActiveDraftItemEdit(userText) ??
		inferDraftItemEdit(userText) ??
		inferActiveDraftItemEdit(route.searchQuery || '') ??
		inferDraftItemEdit(route.searchQuery || '')
	const action = route.draftItemAction ?? inferred?.draftItemAction
	const currentItems = activeTempDraftItems(activeDraft)
	if (!action) {
		return {
			items: currentItems,
			message: `Tell me exactly what to change in the ${workspaceLabel}, for example "set Wood to 340 pieces", "remove Wood", or "clear the ${workspaceLabel}".`,
			tempDraft: activeTempDraftPayload(activeDraft, currentItems),
		}
	}
	if (action === 'clear_items') {
		return {
			items: [],
			message: `I cleared the ${workspaceLabel}.`,
			tempDraft: activeTempDraftPayload(activeDraft, []),
		}
	}
	const target = findActiveTempDraftItemTarget(
		currentItems,
		inferred?.itemQuery ?? route.itemQuery,
		inferred?.previousQuantity ?? route.previousQuantity,
	)
	if (typeof target === 'string') {
		return {
			items: currentItems,
			message: target,
			tempDraft: activeTempDraftPayload(activeDraft, currentItems),
		}
	}
	if (action === 'remove_item') {
		const nextItems = currentItems.filter((_, index) => index !== target)
		return {
			items: nextItems,
			message: `I removed ${currentItems[target]?.name ?? 'that item'} from the ${workspaceLabel}.`,
			tempDraft: activeTempDraftPayload(activeDraft, nextItems),
		}
	}
	if (action === 'set_item_notes') {
		return {
			items: currentItems,
			message:
				workspaceLabel === 'cart'
					? 'Use the cart note field for cart-level notes for now.'
					: 'Draft desk line notes are saved with the draft form. Use the draft note field for now.',
			tempDraft: activeTempDraftPayload(activeDraft, currentItems),
		}
	}
	const quantity = normalizeDraftQuantity(
		inferred?.quantity ?? route.quantity ?? 0,
	)
	if (!quantity) {
		return {
			items: currentItems,
			message: 'Tell me the new quantity for that item.',
			tempDraft: activeTempDraftPayload(activeDraft, currentItems),
		}
	}
	const nextItems = currentItems.map((item, index) =>
		index === target ? { ...item, qty: quantity } : item,
	)
	await assertQuoteRequestItemsHaveOrderableProductLinks(
		supabase,
		nextItems
			.filter((item) => item.productId)
			.map((item, index) => ({
				customerDescription: item.name,
				isUnmatched: false,
				productId: item.productId,
				quantity: item.qty,
				sortOrder: index,
				unitOfMeasure: item.unit,
				unitOfMeasureAr: item.unitAr,
			})),
	)
	return {
		items: nextItems,
		message: `I set ${currentItems[target]?.name ?? 'that line'} to ${quantity} in the ${workspaceLabel}.`,
		tempDraft: activeTempDraftPayload(activeDraft, nextItems),
	}
}

function findActiveTempDraftItemTarget(
	items: DraftMaterialItem[],
	itemQuery: string | undefined,
	previousQuantity: number | undefined,
): number | string {
	if (items.length === 0) return 'That draft has no items to edit.'
	const normalizedQuery = normalizeForMatch(itemQuery ?? '')
	const queryTokens = normalizedQuery
		.split(' ')
		.filter((token) => token.length > 2)
	const queryMatches =
		queryTokens.length > 0
			? items
					.map((item, index) => ({ index, item }))
					.filter(({ item }) => {
						const itemText = normalizeForMatch(
							[item.name, item.nameAr, item.unit].join(' '),
						)
						return queryTokens.every((token) => itemText.includes(token))
					})
			: []
	if (queryMatches.length === 1) return queryMatches[0]?.index ?? 0
	const quantityMatches = items
		.map((item, index) => ({ index, item }))
		.filter(({ item }) =>
			previousQuantity === undefined
				? false
				: quantitiesEqual(item.qty, previousQuantity),
		)
	if (quantityMatches.length === 1) return quantityMatches[0]?.index ?? 0
	if (items.length === 1) return 0
	return `Which item should I edit? This draft has ${items.map((item) => `${item.qty} ${item.unit} ${item.name}`).join(', ')}.`
}

function normalizeDraftQuantity(value: number): number | null {
	if (!Number.isFinite(value) || value <= 0) return null
	return Math.min(value, 1_000_000)
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
				'I found the source record, but it has no items to copy into a draft.',
		}
	}
	const items = sourceItems.map(toDraftMaterialItem)
	if (items.some((item) => !item.productId)) {
		return {
			message:
				'I found the source record, but some items are not linked to orderable products. I left the draft unchanged.',
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
	activeDraft: ActiveChatDraftContext | null,
): Promise<DraftWriteContext> {
	const locale = detectPortalAiLocale(userText)
	if (isActiveTempDraftTarget(activeDraft, route.targetReference)) {
		return addItemsToTempDraft(supabase, route, userText, activeDraft)
	}
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
	let requestedLines =
		route.draftLines && route.draftLines.length > 0
			? route.draftLines
			: parsePortalDraftMaterialRequestLines(searchText)
	if (requestedLines.length === 0 && isActiveDraftAddLineFollowup(userText)) {
		const pendingMaterial = missingQuantityDraftMaterial(
			searchText,
			await loadVisibleProductCatalog(
				supabase,
				PRODUCT_CATALOG_ROUTE_MATCH_LIMIT,
			),
		)
		if (pendingMaterial) {
			requestedLines = [
				{
					query: pendingMaterial,
					quantity: 1,
					rawText: userText.trim(),
				},
			]
		}
	}
	const resolvedItems =
		requestedLines.length > 0
			? await buildDraftItemsFromRequestedLines(
					supabase,
					requestedLines,
					locale,
					{
						action: 'draft_add_items',
						targetReference: draft.request_number,
					},
				)
			: buildDraftItemsFromPlan(
					searchText,
					await findOrderableProductsForDraft(supabase, searchText, searchText),
				)
	if ('message' in resolvedItems) {
		return {
			draftId: draft.id,
			editRoute: `/orders/edit/${draft.id}`,
			items: sortedQuoteRequestItems(draft).map(toDraftMaterialItem),
			reference: draft.request_number,
			message: resolvedItems.message,
			productChoice: resolvedItems.productChoice,
		}
	}
	const { items, unavailableQueries: resolvedUnavailableQueries } =
		resolvedDraftItemsWithUnavailable(resolvedItems)
	const unavailableQueries = mergeUnavailableDraftQueries(
		route.unavailableQueries,
		resolvedUnavailableQueries,
	)
	if (items.length === 0 || items.some((item) => !item.productId)) {
		return {
			draftId: draft.id,
			editRoute: `/orders/edit/${draft.id}`,
			items: sortedQuoteRequestItems(draft).map(toDraftMaterialItem),
			reference: draft.request_number,
			message: 'I could not find an available product to add.',
		}
	}

	const currentItems = sortedQuoteRequestItems(draft)
	const currentMaterialItems = currentItems.map(toDraftMaterialItem)
	const existingRowsByProductId = new Map(
		currentItems.flatMap((item) =>
			item.product_id ? [[item.product_id, item] as const] : [],
		),
	)
	const existingQuantityUpdates = new Map<string, number>()
	const insertItems: DraftMaterialItem[] = []
	for (const item of items) {
		const existingRow = item.productId
			? existingRowsByProductId.get(item.productId)
			: undefined
		if (existingRow) {
			existingQuantityUpdates.set(
				existingRow.id,
				(existingQuantityUpdates.get(existingRow.id) ?? existingRow.quantity) +
					item.qty,
			)
			continue
		}
		insertItems.push(item)
	}
	const draftItemInputs = insertItems.map((item, index) => ({
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
	if (draftItemInputs.length > 0) {
		await insertQuoteRequestItems(supabase, draft.id, draftItemInputs, {
			requireOrderableProductLinks: true,
		})
	}
	for (const [itemId, quantity] of existingQuantityUpdates) {
		const { error } = await supabase
			.from('quote_request_items')
			.update({ quantity })
			.eq('id', itemId)
		if (error) throw new Error(error.message)
	}

	const materialItems = mergeDraftMaterialItems(currentMaterialItems, items)
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
		message: `I added ${items.length} item${items.length === 1 ? '' : 's'} to ${draft.request_number}.${unavailableDraftLineNote(unavailableQueries, locale)}`,
	}
}

async function replaceDraftItem(
	supabase: AuthedSupabase,
	customerId: string,
	route: PortalCustomerToolRequest,
	userText: string,
	activeDraft: ActiveChatDraftContext | null,
): Promise<DraftWriteContext> {
	const locale = detectPortalAiLocale(userText)
	if (isActiveTempDraftTarget(activeDraft, route.targetReference)) {
		return replaceTempDraftItem(supabase, route, userText, activeDraft)
	}
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
			message: 'That draft has no items to replace.',
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
			message: target.message ?? 'I could not identify which item to replace.',
		}
	}
	const replacementText = route.replacementQuery || route.itemQuery || ''
	if (!replacementText.trim()) {
		return {
			draftId: draft.id,
			editRoute: `/orders/edit/${draft.id}`,
			items: currentItems.map(toDraftMaterialItem),
			reference: draft.request_number,
			message: 'Tell me which available product should replace that item.',
		}
	}
	const products = await findOrderableProductsForDraft(
		supabase,
		replacementText,
		replacementText,
	)
	const exactReplacement = exactProductMatchForDraftLine(
		products,
		replacementText,
	)
	const [plannedReplacement] = buildDraftItemsFromPlan(
		replacementText,
		products,
	)
	const replacement = exactReplacement
		? draftMaterialItemFromProduct(
				exactReplacement,
				plannedReplacement?.qty ?? 1,
			)
		: plannedReplacement
	if (!replacement?.productId) {
		return {
			draftId: draft.id,
			editRoute: `/orders/edit/${draft.id}`,
			items: currentItems.map(toDraftMaterialItem),
			reference: draft.request_number,
			message: 'I could not find an available replacement product.',
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

async function replaceTempDraftItem(
	supabase: AuthedSupabase,
	route: PortalCustomerToolRequest,
	userText: string,
	activeDraft: ActiveChatDraftContext,
): Promise<DraftWriteContext> {
	const workspaceLabel = activeTempDraftLabel(activeDraft)
	const currentItems = activeTempDraftItems(activeDraft)
	if (currentItems.length === 0) {
		return {
			items: [],
			message: `That ${workspaceLabel} has no items to replace.`,
			tempDraft: activeTempDraftPayload(activeDraft, []),
		}
	}
	const target = findActiveTempDraftItemTarget(
		currentItems,
		route.itemQuery,
		route.previousQuantity,
	)
	if (typeof target === 'string') {
		return {
			items: currentItems,
			message: target,
			tempDraft: activeTempDraftPayload(activeDraft, currentItems),
		}
	}
	const replacementText = tempDraftReplacementText(route, userText)
	if (!replacementText) {
		return {
			items: currentItems,
			message: `Tell me which available product should replace that ${workspaceLabel} item.`,
			tempDraft: activeTempDraftPayload(activeDraft, currentItems),
		}
	}
	const products = await findOrderableProductsForDraft(
		supabase,
		replacementText,
		replacementText,
	)
	const exactReplacement = exactProductMatchForDraftLine(
		products,
		replacementText,
	)
	const [plannedReplacement] = buildDraftItemsFromPlan(
		replacementText,
		products,
	)
	const replacement = exactReplacement
		? draftMaterialItemFromProduct(
				exactReplacement,
				plannedReplacement?.qty ?? 1,
			)
		: plannedReplacement
	if (!replacement?.productId) {
		return {
			items: currentItems,
			message: 'I could not find an available replacement product.',
			tempDraft: activeTempDraftPayload(activeDraft, currentItems),
		}
	}
	const previous = currentItems[target]
	const nextItem = {
		...replacement,
		qty: previous?.qty ?? replacement.qty,
	}
	const nextItems = currentItems.map((item, index) =>
		index === target ? nextItem : item,
	)
	return {
		items: nextItems,
		message: `I replaced ${previous?.name ?? 'that item'} with ${nextItem.name} in the ${workspaceLabel}.`,
		tempDraft: activeTempDraftPayload(activeDraft, nextItems),
	}
}

function tempDraftReplacementText(
	route: PortalCustomerToolRequest,
	userText: string,
): string {
	const explicit = route.replacementQuery?.trim()
	if (explicit) return explicit
	const withMatch = userText.match(/\bwith\s+(.+)$/i)?.[1]
	if (withMatch) return withMatch.replace(/[.?!]+$/g, '').trim()
	return ''
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
	if (materialItems.length === 0) issues.push('No items are saved.')
	if (unavailableItems.length > 0) {
		issues.push(
			unavailableItems.length === 1
				? '1 item is unavailable.'
				: `${unavailableItems.length} items are unavailable.`,
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
	supportIdentity: PortalSupportIdentity,
): Promise<SupportRequestContext> {
	const profileContext = await loadCustomerProfileContext(supabase, customerId)
	const message = (route.supportMessage || route.searchQuery || userText).trim()
	if (!message || message === '/feedback') {
		return {
			message: 'Tell me the feedback or support message to send.',
			ticket: null,
		}
	}
	if (!supportIdentity.verifiedEmail) {
		return {
			message: supportVerifiedEmailRequiredMessage(),
			ticket: null,
		}
	}
	const subject =
		route.supportSubject?.trim() || supportSubjectFromMessage(message)
	const { data, error } = await supabase.rpc('create_support_ticket', {
		p_message: message,
		p_requester_email: supportIdentity.verifiedEmail,
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

function supportIdentityFromSession(user: {
	email?: string | null
	email_confirmed_at?: string | null
}): PortalSupportIdentity {
	const email = user.email?.trim() ?? ''
	return {
		verifiedEmail: user.email_confirmed_at && email ? email : null,
	}
}

function supportVerifiedEmailRequiredMessage() {
	return 'You need a verified email on your account before Lyon can submit a support ticket. Add and confirm an email in Profile. If this is urgent, call us by phone.'
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
	activeDraft: ActiveChatDraftContext | null,
): Promise<DraftWriteContext> {
	const locale = detectPortalAiLocale(userText)
	if (isActiveTempDraftTarget(activeDraft, route.targetReference)) {
		return updateTempDraftItems(supabase, route, userText, activeDraft)
	}
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
			clearThreadSessionKeys: [draftSessionKey(draft.id)],
			draftId: draft.id,
			editRoute: `/orders/edit/${draft.id}`,
			items: [],
			reference: draft.request_number,
			message: `I cleared all items from ${draft.request_number}.`,
		}
	}

	if (currentItems.length === 0) {
		return {
			draftId: draft.id,
			editRoute: `/orders/edit/${draft.id}`,
			items: [],
			reference: draft.request_number,
			message:
				'That draft has no items to edit. Tell me what product to add and I can help build it again.',
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
			message: 'I could not identify which item to edit.',
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
					'Tell me the new quantity for that item, for example "set Wood to 340 pieces".',
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
				'Tell me the note to save on that item, for example `add exterior grade to Wood`.',
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
					'I did not merge the drafts because at least one item is not linked to an orderable product. I left the drafts unchanged.',
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
			clearThreadSessionKeys: sourceDrafts.map((draft) =>
				draftSessionKey(draft.id),
			),
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
		clearThreadSessionKeys: draftsToDelete.map((draft) =>
			draftSessionKey(draft.id),
		),
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
		clearThreadSessionKeys: [draftSessionKey(draft.id)],
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
		message: `Which item should I edit? This draft has ${draftItemChoices(items)}.`,
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
			return `I cannot edit ${draftItemDisplayName(item)} because it is not available to order right now. I can remove it or clear the draft instead.`
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

type DraftRequestedLineResolution =
	| DraftMaterialItem[]
	| { items: DraftMaterialItem[]; unavailableQueries: string[] }
	| { message: string; productChoice?: DraftProductChoiceContext }

function resolvedDraftItemsWithUnavailable(
	resolution: Exclude<
		DraftRequestedLineResolution,
		{ message: string; productChoice?: DraftProductChoiceContext }
	>,
): { items: DraftMaterialItem[]; unavailableQueries: string[] } {
	return Array.isArray(resolution)
		? { items: resolution, unavailableQueries: [] }
		: resolution
}

interface DraftLineResolutionOptions {
	action: 'create_draft_from_plan' | 'draft_add_items'
	targetReference?: string
}

async function buildDraftItemsFromRequestedLines(
	supabase: AuthedSupabase,
	requestedLines: ReturnType<typeof parsePortalDraftMaterialRequestLines>,
	locale: 'ar' | 'en',
	options: DraftLineResolutionOptions,
): Promise<DraftRequestedLineResolution> {
	const items: DraftMaterialItem[] = []
	const resolvedLines: PortalConfirmedDraftLinePayload[] = []
	const choiceGroups: DraftProductChoiceGroup[] = []
	const unavailableQueries: string[] = []
	for (const line of requestedLines) {
		if (line.productId) {
			const product = await findOrderableDraftProductById(
				supabase,
				line.productId,
			)
			if (!product) {
				return {
					message:
						locale === 'ar'
							? `المنتج المختار مش متاح للطلب حالياً. ماعملتش مسودة.`
							: `That product is not available to order right now. I did not create a draft.`,
				}
			}
			items.push(draftMaterialItemFromProduct(product, line.quantity))
			resolvedLines.push(confirmedDraftLineFromResolvedProduct(line, product))
			continue
		}
		const broadChoiceQuery = isBroadDraftChoiceQuery(line.query)
		const products = broadChoiceQuery
			? await loadOrderableDraftProductPool(supabase)
			: await findOrderableProductsForDraft(supabase, line.query, line.query)
		const candidateProducts = broadChoiceQuery
			? productsMatchingDraftHierarchyQuery(products, line.query)
			: products
		const requiresQuantity = draftLineRequiresQuantity(line)
		const exactMatch = broadChoiceQuery
			? null
			: exactProductMatchForDraftLine(candidateProducts, line.query)
		if (exactMatch && !requiresQuantity) {
			items.push(draftMaterialItemFromProduct(exactMatch, line.quantity))
			resolvedLines.push(
				confirmedDraftLineFromResolvedProduct(line, exactMatch),
			)
			continue
		}
		const fuzzyMatch = broadChoiceQuery
			? null
			: fuzzyCatalogMatchForDraftLine(candidateProducts, line.query)
		if (fuzzyMatch && !requiresQuantity) {
			items.push(draftMaterialItemFromProduct(fuzzyMatch, line.quantity))
			resolvedLines.push(
				confirmedDraftLineFromResolvedProduct(line, fuzzyMatch),
			)
			continue
		}
		const hierarchyGroup = draftHierarchyChoiceGroupFromLine(
			line,
			candidateProducts,
		)
		if (hierarchyGroup && broadChoiceQuery) {
			choiceGroups.push(hierarchyGroup)
			continue
		}
		const matches = rankProductsForDraftLine(candidateProducts, line.query, 4)
		if (matches.length === 0) {
			unavailableQueries.push(line.query)
			continue
		}
		const uniqueCatalogMeaningMatch = uniqueCatalogMeaningMatchForDraftLine(
			matches,
			line.query,
		)
		if (uniqueCatalogMeaningMatch && !broadChoiceQuery && !requiresQuantity) {
			items.push(
				draftMaterialItemFromProduct(uniqueCatalogMeaningMatch, line.quantity),
			)
			resolvedLines.push(
				confirmedDraftLineFromResolvedProduct(line, uniqueCatalogMeaningMatch),
			)
			continue
		}
		if (broadChoiceQuery || requiresQuantity) {
			choiceGroups.push(draftProductChoiceGroupFromLine(line, matches))
			continue
		}
		if (matches.length > 1) {
			choiceGroups.push(draftProductChoiceGroupFromLine(line, matches))
			continue
		}
		const product = matches[0]
		if (!product) continue
		items.push(draftMaterialItemFromProduct(product, line.quantity))
		resolvedLines.push(confirmedDraftLineFromResolvedProduct(line, product))
	}
	if (choiceGroups.length > 0) {
		return draftProductChoiceResolution(
			resolvedLines,
			choiceGroups,
			locale,
			options,
			unavailableQueries,
		)
	}
	if (items.length > 0 && unavailableQueries.length > 0) {
		return { items, unavailableQueries }
	}
	if (items.length === 0 && unavailableQueries.length > 0) {
		const unavailable = unavailableQueries.join(', ')
		return {
			message:
				locale === 'ar'
					? `مش لاقي منتج متاح باسم ${unavailable}. ماعملتش مسودة.`
					: `I could not find an available product for ${unavailable}. I did not create a draft.`,
		}
	}
	return items
}

async function findOrderableDraftProductById(
	supabase: AuthedSupabase,
	productId: string,
): Promise<PortalAiProduct | null> {
	const { data, error } = await supabase
		.from('catalog_product_hierarchy')
		.select(PORTAL_AI_PRODUCT_SELECT)
		.eq('id', productId)
		.eq('is_active', true)
		.neq('availability_status', 'hidden')
		.neq('availability_status', 'out_of_stock')
		.maybeSingle()
	if (error) throw new Error(error.message)
	return data as PortalAiProduct | null
}

function confirmedDraftLineFromResolvedProduct(
	line: ReturnType<typeof parsePortalDraftMaterialRequestLines>[number],
	product: PortalAiProduct,
): PortalConfirmedDraftLinePayload {
	return {
		pendingChoiceId: line.pendingChoiceId,
		productId: product.id,
		query: product.name,
		quantity: line.quantity,
		rawText: line.rawText,
		unitHint: line.unitHint,
	}
}

function draftLineRequiresQuantity(
	line: ReturnType<typeof parsePortalDraftMaterialRequestLines>[number],
): boolean {
	const numericParts = line.rawText.match(/\d+(?:[,.]\d+)?/g) ?? []
	if (numericParts.length === 0) return true
	return !numericParts.some((part) => {
		const value = Number.parseFloat(part.replace(/,/g, ''))
		return Number.isFinite(value) && Math.abs(value - line.quantity) < 0.0001
	})
}

function draftProductChoiceGroupFromLine(
	line: ReturnType<typeof parsePortalDraftMaterialRequestLines>[number],
	products: PortalAiProduct[],
): DraftProductChoiceGroup {
	return {
		choiceKind: 'product',
		options: products.map((product) => ({ product })),
		pendingChoiceId:
			line.pendingChoiceId ??
			`choice:${normalizeForMatch(line.query)}:${line.quantity}`,
		query: line.query,
		quantity: line.quantity,
		rawText: line.rawText,
		unitHint: line.unitHint,
	}
}

function draftHierarchyChoiceGroupFromLine(
	line: ReturnType<typeof parsePortalDraftMaterialRequestLines>[number],
	products: PortalAiProduct[],
): DraftProductChoiceGroup | null {
	const nodes = hierarchyChoiceNodesForDraftProducts(products)
	if (nodes.length <= 1) return null
	return {
		choiceKind: 'hierarchy',
		options: nodes.map((node) => ({ node })),
		pendingChoiceId:
			line.pendingChoiceId ??
			`choice:${normalizeForMatch(line.query)}:${line.quantity}`,
		query: line.query,
		quantity: line.quantity,
		rawText: line.rawText,
		unitHint: line.unitHint,
	}
}

function productsMatchingDraftHierarchyQuery(
	products: PortalAiProduct[],
	query: string,
): PortalAiProduct[] {
	const terms = new Set(
		[query, productSearchTerm(query), ...draftProductIntentTerms(query)]
			.map(normalizeForMatch)
			.filter((term) => term.length > 1),
	)
	if (terms.size === 0) return products
	const hierarchyMatches = products.filter((product) => {
		const hierarchyText = catalogHierarchySearchText(product)
		return Array.from(terms).some((term) =>
			normalizedTextHasTerm(hierarchyText, term),
		)
	})
	if (hierarchyMatches.length > 0) return hierarchyMatches
	return rankProductsForDraftLine(products, query, products.length)
}

function catalogHierarchySearchText(product: PortalAiProduct): string {
	return normalizeForMatch(
		[
			product.category,
			product.category_name ?? '',
			product.category_name_ar ?? '',
			product.product_family_name ?? '',
			product.product_family_name_ar ?? '',
			product.product_type_name ?? '',
			product.product_type_name_ar ?? '',
			product.subcategory ?? '',
			product.subcategory_ar ?? '',
		].join(' '),
	)
}

export function hierarchyChoiceNodesForDraftProducts(
	products: PortalAiProduct[],
): DraftHierarchyChoiceNode[] {
	const groups = new Map<
		string,
		{ firstProduct: PortalAiProduct; products: PortalAiProduct[] }
	>()
	for (const product of products) {
		const key =
			product.product_family_slug ??
			normalizeForMatch(
				product.product_family_name ?? product.subcategory ?? '',
			)
		if (!key) continue
		const existing = groups.get(key)
		if (existing) {
			existing.products.push(product)
			continue
		}
		groups.set(key, { firstProduct: product, products: [product] })
	}

	return Array.from(groups.entries())
		.map(([id, group]) => {
			const product = group.firstProduct
			const name =
				product.product_family_name ??
				product.subcategory ??
				product.category_name ??
				product.category
			const nameAr =
				product.product_family_name_ar ??
				product.product_family_name ??
				product.subcategory_ar ??
				product.subcategory ??
				name
			return {
				category: catalogHierarchyPath(product, 'en'),
				id: `family:${id}`,
				name,
				nameAr,
				priceRange: formatHierarchyChoicePriceRange(group.products),
				productCount: group.products.length,
				query: name,
				subcategory: `${group.products.length} product${group.products.length === 1 ? '' : 's'}`,
				unit: group.products[0]?.unit_of_measure ?? 'unit',
				unitAr: group.products[0]?.unit_of_measure_ar ?? 'وحدة',
			}
		})
		.sort((left, right) => {
			const countDelta = right.productCount - left.productCount
			if (countDelta !== 0) return countDelta
			return left.name.localeCompare(right.name)
		})
}

export function hierarchyChoiceNodesForDraftQuery(
	products: PortalAiProduct[],
	query: string,
): DraftHierarchyChoiceNode[] {
	return hierarchyChoiceNodesForDraftProducts(
		productsMatchingDraftHierarchyQuery(products, query),
	)
}

function formatHierarchyChoicePriceRange(products: PortalAiProduct[]): string {
	const min = products
		.map((product) => product.price_range_min)
		.filter((value): value is number => typeof value === 'number')
	const max = products
		.map((product) => product.price_range_max)
		.filter((value): value is number => typeof value === 'number')
	if (min.length === 0 && max.length === 0) return ''
	const low = min.length > 0 ? Math.min(...min) : Math.min(...max)
	const high = max.length > 0 ? Math.max(...max) : Math.max(...min)
	return `${Math.round(low).toLocaleString('en-EG')} - ${Math.round(high).toLocaleString('en-EG')} EGP`
}

function draftProductChoiceResolution(
	baseLines: PortalConfirmedDraftLinePayload[],
	groups: DraftProductChoiceGroup[],
	locale: 'ar' | 'en',
	options: DraftLineResolutionOptions,
	unavailableQueries: string[] = [],
): { message: string; productChoice: DraftProductChoiceContext } {
	return {
		message: draftProductChoiceFallbackMessage(
			groups,
			locale,
			unavailableQueries,
		),
		productChoice: {
			action: options.action,
			baseLines,
			groups,
			locale,
			targetReference: options.targetReference,
			unavailableQueries,
		},
	}
}

function buildDraftItemsFromPlan(
	userText: string,
	products: PortalAiProduct[],
): DraftMaterialItem[] {
	const requestedLines = parsePortalDraftMaterialRequestLines(userText)
	if (requestedLines.length > 0) {
		const items: DraftMaterialItem[] = []
		for (const line of requestedLines) {
			const broadChoiceQuery =
				!line.pendingChoiceId && isBroadDraftChoiceQuery(line.query)
			const exactMatch = broadChoiceQuery
				? null
				: exactProductMatchForDraftLine(products, line.query)
			if (exactMatch) {
				items.push(draftMaterialItemFromProduct(exactMatch, line.quantity))
				continue
			}
			const fuzzyMatch = broadChoiceQuery
				? null
				: fuzzyCatalogMatchForDraftLine(products, line.query)
			if (fuzzyMatch) {
				items.push(draftMaterialItemFromProduct(fuzzyMatch, line.quantity))
				continue
			}
			const rankedProducts = rankProductsForPlanning(
				products,
				draftProductIntentTerms(line.query),
				4,
			)
			const [product] = rankedProducts.filter((candidate) =>
				productMatchesDraftLine(candidate, line.query),
			)
			if (!product) continue
			items.push(draftMaterialItemFromProduct(product, line.quantity))
		}
		return items
	}
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

function exactProductMatchForDraftLine(
	products: PortalAiProduct[],
	query: string,
): PortalAiProduct | null {
	const normalizedQuery = normalizeForMatch(query)
	const matches = products.filter((product) => {
		return [product.name, product.name_ar ?? '', product.sku]
			.map(normalizeForMatch)
			.some((value) => value === normalizedQuery)
	})
	if (matches.length !== 1) return null
	return matches[0] ?? null
}

function isBroadDraftChoiceQuery(query: string): boolean {
	return /^(cement|concrete|wood|steel|metal|metals|أسمنت|اسمنت|خرسانة|خشب|حديد|معدن|معادن)$/i.test(
		normalizeForMatch(query),
	)
}

function fuzzyCatalogMatchForDraftLine(
	products: PortalAiProduct[],
	query: string,
): PortalAiProduct | null {
	const queryTokens = normalizeForMatch(query)
		.split(' ')
		.filter((token) => token.length > 2)
	if (queryTokens.length === 0) return null

	const ranked = products
		.map((product) => ({
			product,
			score: fuzzyCatalogScore(product, queryTokens),
		}))
		.filter((candidate) => candidate.score >= queryTokens.length * 0.76)
		.sort((left, right) => {
			if (right.score !== left.score) return right.score - left.score
			return left.product.name.localeCompare(right.product.name)
		})

	const best = ranked[0]
	const next = ranked[1]
	if (!best) return null
	if (next && best.score - next.score < 0.25) return null
	return best.product
}

function fuzzyCatalogScore(
	product: PortalAiProduct,
	queryTokens: string[],
): number {
	const productTokens = catalogNameTokens(product)
	if (productTokens.length === 0) return 0
	return queryTokens.reduce((score, queryToken) => {
		const best = productTokens.reduce(
			(max, productToken) =>
				Math.max(max, tokenSimilarity(queryToken, productToken)),
			0,
		)
		return score + best
	}, 0)
}

function catalogNameTokens(product: PortalAiProduct): string[] {
	return [
		product.name,
		product.name_ar ?? '',
		product.category,
		product.category_name ?? '',
		product.category_name_ar ?? '',
		product.product_family_name ?? '',
		product.product_family_name_ar ?? '',
		product.product_type_name ?? '',
		product.product_type_name_ar ?? '',
		product.subcategory ?? '',
		product.subcategory_ar ?? '',
	]
		.flatMap((value) => normalizeForMatch(value).split(' '))
		.filter((token) => token.length > 2)
}

function tokenSimilarity(left: string, right: string): number {
	if (left === right) return 1
	const maxLength = Math.max(left.length, right.length)
	if (maxLength === 0) return 1
	const distance = levenshteinDistance(left, right)
	return Math.max(0, 1 - distance / maxLength)
}

function levenshteinDistance(left: string, right: string): number {
	const previous = Array.from({ length: right.length + 1 }, (_, index) => index)
	const current = Array.from({ length: right.length + 1 }, () => 0)
	for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
		current[0] = leftIndex
		for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
			const cost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1
			current[rightIndex] = Math.min(
				current[rightIndex - 1] + 1,
				previous[rightIndex] + 1,
				previous[rightIndex - 1] + cost,
			)
		}
		previous.splice(0, previous.length, ...current)
	}
	return previous[right.length] ?? 0
}

function uniqueCatalogMeaningMatchForDraftLine(
	products: PortalAiProduct[],
	query: string,
): PortalAiProduct | null {
	const normalizedQuery = normalizeForMatch(query)
	const queryTerms = normalizedQuery
		.split(' ')
		.filter((term) => term.length > 2)
	if (queryTerms.length === 0) return null

	const phraseMatches = products.filter((product) =>
		catalogMeaningText(product).includes(normalizedQuery),
	)
	if (phraseMatches.length === 1) return phraseMatches[0] ?? null

	const termMatches = products.filter((product) => {
		const productTerms = new Set(catalogMeaningText(product).split(' '))
		return queryTerms.every((term) => productTerms.has(term))
	})
	if (termMatches.length !== 1) return null
	return termMatches[0] ?? null
}

function catalogMeaningText(product: PortalAiProduct): string {
	return normalizeForMatch(
		[
			product.name,
			product.name_ar ?? '',
			product.category,
			product.category_name ?? '',
			product.category_name_ar ?? '',
			product.product_family_name ?? '',
			product.product_family_name_ar ?? '',
			product.product_type_name ?? '',
			product.product_type_name_ar ?? '',
			product.subcategory ?? '',
			product.subcategory_ar ?? '',
			product.description ?? '',
			product.description_ar ?? '',
		].join(' '),
	)
}

function catalogHierarchyPath(product: PortalAiProduct, locale: 'ar' | 'en') {
	return hierarchyPathLabel(
		locale === 'ar'
			? [
					product.category_name_ar ?? product.category_name ?? product.category,
					product.product_family_name_ar ?? product.product_family_name,
					product.product_type_name_ar ?? product.product_type_name,
				]
			: [
					product.category_name ?? product.category,
					product.product_family_name,
					product.product_type_name,
				],
	)
}

function hierarchyPathLabel(parts: Array<string | null | undefined>) {
	const labels: string[] = []
	const seen = new Set<string>()
	for (const part of parts) {
		const label = part?.trim()
		if (!label) continue
		const normalized = label.toLowerCase()
		if (seen.has(normalized)) continue
		seen.add(normalized)
		labels.push(label)
	}
	return labels.join(' / ')
}

function draftMaterialItemFromProduct(
	product: PortalAiProduct,
	quantity: number,
): DraftMaterialItem {
	return {
		category: catalogHierarchyPath(product, 'en'),
		imageUrl: product.image_urls?.[0] ?? '',
		name: product.name,
		nameAr: product.name_ar ?? product.name,
		productId: product.id,
		qty: quantity,
		unit: product.unit_of_measure,
		unitAr: product.unit_of_measure_ar,
	}
}

export function rankProductsForDraftLine(
	products: PortalAiProduct[],
	query: string,
	limit: number,
): PortalAiProduct[] {
	const normalizedQuery = productSearchTerm(query) || query
	const hasSpecificIdentity = hasSpecificCatalogIdentityPhrase(products, query)
	const useNormalizedIdentityQuery =
		!isBroadDraftChoiceQuery(normalizedQuery) || !hasSpecificIdentity
	const broadChoiceQuery =
		isBroadDraftChoiceQuery(query) ||
		(isBroadDraftChoiceQuery(normalizedQuery) && !hasSpecificIdentity)
	const phraseMatches = broadChoiceQuery
		? []
		: products.filter(
				(product) =>
					productIdentityPhraseMatchesDraftLine(product, query) ||
					(useNormalizedIdentityQuery &&
						productIdentityPhraseMatchesDraftLine(product, normalizedQuery)),
			)
	const directMatches = broadChoiceQuery
		? []
		: products.filter(
				(product) =>
					productIdentityMatchesDraftLine(product, query) ||
					(useNormalizedIdentityQuery &&
						productIdentityMatchesDraftLine(product, normalizedQuery)),
			)
	const candidates =
		phraseMatches.length > 0
			? phraseMatches
			: directMatches.length > 0
				? directMatches
				: products.filter(
						(product) =>
							productMatchesDraftLine(product, query, broadChoiceQuery) ||
							productMatchesDraftLine(
								product,
								normalizedQuery,
								broadChoiceQuery,
							),
					)
	const rankingTerms = expandDraftProductIntentTermsWithCatalogAliases(
		products,
		[
			...draftProductIntentTerms(query),
			...draftProductIntentTerms(normalizedQuery),
		],
		[query, normalizedQuery],
	)
	return rankProductsForPlanning(candidates, rankingTerms, limit)
}

function productIdentityPhraseMatchesDraftLine(
	product: PortalAiProduct,
	query: string,
): boolean {
	const normalizedQuery = normalizeForMatch(query)
	if (!normalizedQuery) return false
	return catalogProductIdentityPhrases(product).some((phrase) =>
		normalizedTextHasTerm(normalizedQuery, phrase),
	)
}

function hasSpecificCatalogIdentityPhrase(
	products: PortalAiProduct[],
	query: string,
): boolean {
	const normalizedQuery = normalizeForMatch(query)
	return products.some((product) =>
		catalogProductIdentityPhrases(product).some(
			(phrase) =>
				!isBroadDraftChoiceQuery(phrase) &&
				(normalizedTextHasTerm(normalizedQuery, phrase) ||
					normalizedQuery.includes(phrase)),
		),
	)
}

function expandDraftProductIntentTermsWithCatalogAliases(
	products: PortalAiProduct[],
	terms: string[],
	queries: string[],
): string[] {
	const normalizedTerms = new Set(
		terms.map(normalizeForMatch).filter((term) => term.length > 1),
	)
	const normalizedQueries = new Set(
		queries.map(normalizeForMatch).filter((query) => query.length > 1),
	)
	const expanded = new Set(normalizedTerms)
	for (const product of products) {
		const identityPhrases = catalogProductIdentityPhrases(product)
		if (identityPhrases.some((phrase) => normalizedQueries.has(phrase))) {
			for (const term of identityPhrases.flatMap((phrase) =>
				phrase.split(' '),
			)) {
				if (term.length > 1) expanded.add(term)
			}
		}
	}
	return Array.from(expanded)
}

function catalogProductIdentityPhrases(product: PortalAiProduct): string[] {
	return [
		product.name,
		product.name_ar ?? '',
		product.sku,
		product.product_type_name ?? '',
		product.product_type_name_ar ?? '',
	]
		.map(normalizeForMatch)
		.filter((term) => term.length > 1)
}

function productIdentityMatchesDraftLine(
	product: PortalAiProduct,
	query: string,
): boolean {
	const terms = normalizeForMatch(query)
		.split(' ')
		.filter((term) => term.length > 2)
	if (terms.length === 0) return false
	const searchable = normalizeForMatch(
		[
			product.name,
			product.name_ar ?? '',
			product.sku,
			product.category,
			product.category_name ?? '',
			product.category_name_ar ?? '',
			product.product_family_name ?? '',
			product.product_family_name_ar ?? '',
			product.product_type_name ?? '',
			product.product_type_name_ar ?? '',
			product.subcategory ?? '',
			product.subcategory_ar ?? '',
		].join(' '),
	)
	return terms.some((term) => searchable.includes(term))
}

function draftLineChoiceFallbackMessage(
	group: DraftProductChoiceGroup,
	locale: 'ar' | 'en',
	unavailableQueries: string[] = [],
): string {
	const choices = group.options
		.map((option, index) => {
			const detail = draftProductChoiceFallbackDetail(option, locale)
			return `${index + 1}. ${detail}`
		})
		.join('\n')
	const unavailableNote = unavailableDraftLineNote(unavailableQueries, locale)
	if (group.choiceKind === 'hierarchy') {
		return locale === 'ar'
			? `لقيت أكتر من مجموعة لـ ${group.query}. اختار المجموعة المناسبة:\n${choices}${unavailableNote}`
			: `I found a few ${group.query} groups. Pick the group you want, then I will show the final products:\n${choices}${unavailableNote}`
	}
	return locale === 'ar'
		? `لقيت أكتر من اختيار لـ ${group.query}. اختار المنتج المناسب:\n${choices}${unavailableNote}`
		: `I found a few ${group.query} options. Pick the one you want and set the quantity before adding it:\n${choices}${unavailableNote}`
}

function draftProductChoiceFallbackDetail(
	option: DraftProductChoiceOption,
	locale: 'ar' | 'en',
): string {
	if (option.node) {
		return [
			locale === 'ar' ? option.node.nameAr : option.node.name,
			option.node.subcategory,
			option.node.priceRange,
		]
			.filter(Boolean)
			.join(' - ')
	}
	const product = option.product
	if (!product) return ''
	const price = formatPriceRange(product, locale)
	return [
		locale === 'ar' ? (product.name_ar ?? product.name) : product.name,
		locale === 'ar'
			? (product.product_type_name_ar ?? product.subcategory_ar)
			: (product.product_type_name ?? product.subcategory),
		locale === 'ar' ? product.unit_of_measure_ar : product.unit_of_measure,
		price,
	]
		.filter(Boolean)
		.join(' - ')
}

function draftProductChoiceFallbackMessage(
	groups: DraftProductChoiceGroup[],
	locale: 'ar' | 'en',
	unavailableQueries: string[] = [],
): string {
	if (groups.length === 1) {
		const group = groups[0]
		if (!group) return locale === 'ar' ? 'اختار المنتج.' : 'Pick a product.'
		return draftLineChoiceFallbackMessage(group, locale, unavailableQueries)
	}
	const unavailableNote = unavailableDraftLineNote(unavailableQueries, locale)
	return locale === 'ar'
		? `لقيت اختيارات متعددة لـ ${groups.length} بنود. اختار المنتج المناسب لكل بند.${unavailableNote}`
		: `I found options for ${groups.length} items. Pick the right product and quantity for each one.${unavailableNote}`
}

function unavailableDraftLineNote(
	queries: string[],
	locale: 'ar' | 'en',
): string {
	const uniqueQueries = Array.from(
		new Set(queries.map((query) => query.trim()).filter(Boolean)),
	)
	if (uniqueQueries.length === 0) return ''
	const list = uniqueQueries.join(', ')
	return locale === 'ar'
		? ` لم أضف: ${list} لأنه غير موجود كمنتج متاح.`
		: ` I did not add: ${list} because I could not find an available product.`
}

function mergeUnavailableDraftQueries(
	...queryGroups: Array<string[] | undefined>
): string[] {
	return Array.from(
		new Set(
			queryGroups
				.flatMap((queries) => queries ?? [])
				.map((query) => query.trim())
				.filter(Boolean),
		),
	)
}

function productMatchesDraftLine(
	product: PortalAiProduct,
	query: string,
	directOnly = false,
): boolean {
	const directTerms = normalizeForMatch(query)
		.split(' ')
		.filter((term) => term.length > 2)
	const terms = directOnly ? directTerms : draftProductIntentTerms(query)
	if (terms.length === 0) return false
	const searchable = normalizeForMatch(
		(directOnly
			? [
					product.name,
					product.name_ar ?? '',
					product.sku,
					product.category,
					product.subcategory ?? '',
					product.subcategory_ar ?? '',
				]
			: [
					product.name,
					product.name_ar ?? '',
					product.sku,
					product.category,
					product.subcategory ?? '',
					product.subcategory_ar ?? '',
					product.description ?? '',
					product.description_ar ?? '',
				]
		).join(' '),
	)
	return terms.some((term) => term.length > 1 && searchable.includes(term))
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
				tempDraft: result.tempDraft,
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
					label: 'Open drafts',
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
			if (!context.ticket) {
				return [
					actionButtonEvent({
						icon: 'profile',
						label: 'Add verified email',
						labelAr: 'أضف بريداً مؤكداً',
						route: '/profile',
					}),
					actionButtonEvent({
						icon: 'support',
						label: 'Support panel',
						labelAr: 'لوحة الدعم',
						route: '/support',
					}),
					...(SUPPORT_PHONE_E164
						? [
								actionButtonEvent({
									href: `tel:${SUPPORT_PHONE_E164}`,
									icon: 'phone',
									label: 'Call support',
									labelAr: 'اتصل بالدعم',
								}),
							]
						: []),
				]
			}
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

function productChoiceListEvent(
	context: DraftProductChoiceContext,
): StreamChunk {
	return {
		type: 'CUSTOM' as const,
		timestamp: Date.now(),
		name: 'rich_message',
		value: {
			type: 'product_choice_list',
			data: productChoiceListData(context),
		},
	}
}

function productChoiceListData(
	context: DraftProductChoiceContext,
): ProductChoiceListData {
	const total = context.groups.length
	const visibleGroups = context.groups.slice(0, 1)
	const unavailableNote = unavailableDraftLineNote(
		context.unavailableQueries ?? [],
		context.locale,
	)
	return {
		description:
			context.locale === 'ar'
				? `اختر المنتج المناسب. إذا لم تذكر الكمية، سأطلبها قبل الإضافة.${unavailableNote}`
				: `Choose the matching product. If you did not give a quantity, I will ask before adding it.${unavailableNote}`,
		groups: visibleGroups.map((group, groupIndex) => ({
			choiceKind: group.choiceKind,
			options: group.options.map((option) =>
				productChoiceListOption(context, group, option),
			),
			pendingChoiceId: group.pendingChoiceId,
			query: group.query,
			quantity: group.quantity,
			quantityRequired: productChoiceQuantityRequired(group),
			title:
				context.locale === 'ar'
					? `اختيار ${groupIndex + 1} من ${total}`
					: `Choice ${groupIndex + 1} of ${total}`,
		})),
		title:
			context.locale === 'ar'
				? 'اختر المنتج الذي يناسب طلبك'
				: 'Pick the product that matches your request',
	}
}

function productChoiceListOption(
	context: DraftProductChoiceContext,
	group: DraftProductChoiceGroup,
	option: DraftProductChoiceOption,
): ProductChoiceListData['groups'][number]['options'][number] {
	if (option.node) {
		return {
			action: productChoiceAction(context, group, option),
			category: option.node.category,
			name: option.node.name,
			nameAr: option.node.nameAr,
			priceRange: option.node.priceRange,
			productId: option.node.id,
			subcategory: option.node.subcategory,
			unit: option.node.unit,
			unitAr: option.node.unitAr,
		}
	}
	const product = option.product
	if (!product) {
		throw new Error('Product choice option is missing a product')
	}
	return {
		action: productChoiceAction(context, group, option),
		category: catalogHierarchyPath(product, context.locale),
		name: product.name,
		nameAr: product.name_ar ?? product.name,
		priceRange: formatPriceRange(product, context.locale),
		productId: product.id,
		subcategory:
			(context.locale === 'ar'
				? product.product_type_name_ar
				: product.product_type_name) ??
			product.subcategory ??
			undefined,
		unit: product.unit_of_measure,
		unitAr: product.unit_of_measure_ar,
	}
}

function productChoiceQuantityRequired(
	group: DraftProductChoiceGroup,
): boolean {
	if (group.choiceKind === 'hierarchy') return false
	const numericParts = group.rawText.match(/\d+(?:[,.]\d+)?/g) ?? []
	if (numericParts.length === 0) return true
	return !numericParts.some((part) => {
		const value = Number.parseFloat(part.replace(/,/g, ''))
		return Number.isFinite(value) && Math.abs(value - group.quantity) < 0.0001
	})
}

function productChoiceAction(
	context: DraftProductChoiceContext,
	group: DraftProductChoiceGroup,
	option: DraftProductChoiceOption,
): ActionButtonData {
	const product = option.product
	const node = option.node
	const label = product?.name ?? node?.name ?? group.query
	const labelAr = product?.name_ar ?? node?.nameAr ?? label
	return {
		action: {
			action: context.action,
			draftLines: productChoiceActionDraftLines(context, group, option),
			searchQuery: product?.name ?? node?.query ?? label,
			targetReference: context.targetReference,
			unavailableQueries: context.unavailableQueries,
		},
		icon: 'market',
		label,
		labelAr,
		runCommand: true,
	}
}

function productChoiceActionDraftLines(
	context: DraftProductChoiceContext,
	selectedGroup: DraftProductChoiceGroup,
	selectedOption: DraftProductChoiceOption,
): PortalConfirmedDraftLinePayload[] {
	const selectedProduct = selectedOption.product
	const selectedNode = selectedOption.node
	const selectedQuery =
		selectedProduct?.name ?? selectedNode?.query ?? selectedGroup.query
	return [
		...context.baseLines,
		{
			pendingChoiceId: selectedGroup.pendingChoiceId,
			productId: selectedProduct?.id,
			query: selectedQuery,
			quantity: selectedGroup.quantity,
			rawText: selectedGroup.rawText,
			unitHint: selectedGroup.unitHint,
		},
		...context.groups
			.filter(
				(group) => group.pendingChoiceId !== selectedGroup.pendingChoiceId,
			)
			.map((group) => ({
				pendingChoiceId: group.pendingChoiceId,
				query: group.query,
				quantity: group.quantity,
				rawText: group.rawText,
				unitHint: group.unitHint,
			})),
	]
}

function customerOrdersInvalidationEvent(): StreamChunk {
	return {
		type: 'CUSTOM' as const,
		timestamp: Date.now(),
		name: 'portal_cache_invalidation',
		value: { queryKeys: [['customer-orders-all']] },
	}
}

function portalOpenDraftPanelEvent(
	draft: string | ChatTempDraftData,
): StreamChunk {
	return {
		type: 'CUSTOM' as const,
		timestamp: Date.now(),
		name: 'portal_open_draft_panel',
		value:
			typeof draft === 'string' ? { draftId: draft } : { tempDraft: draft },
	}
}

function portalClearDraftThreadsEvent(sessionKeys: string[]): StreamChunk {
	return {
		type: 'CUSTOM' as const,
		timestamp: Date.now(),
		name: 'portal_clear_draft_threads',
		value: { sessionKeys },
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
		`category_name.ilike.${pattern}`,
		`category_name_ar.ilike.${pattern}`,
		`product_family_name.ilike.${pattern}`,
		`product_family_name_ar.ilike.${pattern}`,
		`product_type_name.ilike.${pattern}`,
		`product_type_name_ar.ilike.${pattern}`,
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
	const exactNames = [product.name, product.name_ar ?? '', product.sku]
		.map(normalizeForMatch)
		.filter(Boolean)
	for (const term of terms) {
		if (term.length > 1 && searchable.includes(term)) {
			score += term.length + 8
		}
		if (exactNames.includes(term)) score += 20
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
