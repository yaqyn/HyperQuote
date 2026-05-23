import {
	classifyWebsitePublicChatIntent,
	retrieveWebsiteDocs,
	type WebsitePublicChatRoute,
} from '@hyperquote/docs/retrieval'

const ARABIC_BLOCK = /[\u0600-\u06ff]/

const ROUTE_ACTIONS = [
	'chat',
	'public_docs',
	'customer_profile',
	'customer_orders',
	'order_detail',
	'delivery_tracking',
	'product_search',
	'create_draft_from_plan',
	'duplicate_order_to_draft',
	'update_draft_metadata',
	'cleanup_drafts',
	'delete_draft',
	'refuse',
] as const

export type PortalCustomerRouteAction = (typeof ROUTE_ACTIONS)[number]

export interface PortalCustomerRoute {
	action: PortalCustomerRouteAction
	cleanupMode?: 'delete_all' | 'merge' | 'remove_empty'
	draftName?: string
	draftNotes?: string
	reason?: string
	searchQuery: string
	targetReference?: string
}

export const PORTAL_CUSTOMER_ROUTER_PROMPT = `You are Lyon's routing layer for the signed-in HyperQuote customer portal.
Return JSON only. Do not answer the user. Do not use markdown.

Schema:
{"action":"chat"|"public_docs"|"customer_profile"|"customer_orders"|"order_detail"|"delivery_tracking"|"product_search"|"create_draft_from_plan"|"duplicate_order_to_draft"|"update_draft_metadata"|"cleanup_drafts"|"delete_draft"|"refuse","search_query":"string","target_reference":"string","draft_name":"string","draft_notes":"string","cleanup_mode":"delete_all"|"merge"|"remove_empty","reason":"string"}

Use public_docs for public HyperQuote docs questions.
Use customer_profile for the signed-in customer's company profile, addresses, or projects.
Use customer_orders for lists/status summaries covering drafts, saved, submitted, confirmed, out-for-delivery, delivered, cancelled, or rejected records.
Use order_detail for one specific quote request/order or for "latest order" detail.
Use delivery_tracking for customer-visible driver, truck, ETA, route, or location questions for the customer's own delivery.
Use product_search for published product/catalog/material search or price-range questions.
Use create_draft_from_plan only for creating a draft quote request or material plan. Unmatched materials are allowed for customer review.
Use duplicate_order_to_draft only when the user asks to copy or repeat a past order/quote into a new draft.
Use update_draft_metadata only for draft rename, notes, project, delivery date, or metadata changes.
Use cleanup_drafts for merging drafts, removing empty drafts, or deleting all drafts after an explicit cleanup/delete-drafts request.
Use delete_draft for deleting one draft.
Use refuse for submit/place/confirm order requests, cross-customer requests, internal finance, supplier cost/margins, employee data, secrets, or driver-only operational data outside the customer's own delivery tracking.

Never route to a submit, confirm, accept, payment, cancellation, internal, supplier-cost, employee, or cross-customer write tool. Portal AI can immediately mutate draft quote requests only.`

export function detectPortalAiLocale(userMessage: string): 'ar' | 'en' {
	return ARABIC_BLOCK.test(userMessage) ? 'ar' : 'en'
}

export function portalCustomerPolicyRefusal(
	userMessage: string,
): string | null {
	const lower = userMessage.toLowerCase()
	const isArabic = detectPortalAiLocale(userMessage) === 'ar'

	if (asksToSubmitOrder(lower, userMessage)) {
		return isArabic
			? 'أقدر أجهز المسودة وأرتبها، لكن مش هقدّم أو أؤكد طلب بدلًا منك. راجعها وقدّمها من واجهة الطلب العادية.'
			: 'I can prepare and organize the draft, but I will not submit or confirm an order for you. Please review it and submit through the normal order form.'
	}

	if (asksForPrivateOrCrossScope(lower, userMessage)) {
		return isArabic
			? 'أقدر أستخدم وثائق هايبركوت العامة وبيانات حسابك أنت فقط. مش هعرض بيانات عملاء آخرين أو بيانات داخلية أو تكلفة الموردين أو بيانات الموظفين.'
			: 'I can use public HyperQuote docs and your own customer account only. I cannot reveal other customers, internal finance, supplier costs, employee data, secrets, or driver-only operational data.'
	}

	return null
}

export function fallbackPortalCustomerRoute(
	userMessage: string,
): PortalCustomerRoute {
	const refusal = portalCustomerPolicyRefusal(userMessage)
	if (refusal) {
		return { action: 'refuse', reason: refusal, searchQuery: '' }
	}

	const lower = userMessage.toLowerCase()
	const targetReference = extractTargetReference(userMessage)
	const draftName = extractDraftName(userMessage)

	if (isCleanupDraftRequest(lower, userMessage)) {
		return {
			action: 'cleanup_drafts',
			cleanupMode: detectCleanupMode(lower, userMessage),
			searchQuery: userMessage,
			targetReference,
		}
	}
	if (isDeleteDraftRequest(lower, userMessage)) {
		return {
			action: 'delete_draft',
			searchQuery: userMessage,
			targetReference,
		}
	}
	if (isDuplicateDraftRequest(lower, userMessage)) {
		return {
			action: 'duplicate_order_to_draft',
			draftName,
			searchQuery: userMessage,
			targetReference,
		}
	}
	if (isDraftMetadataRequest(lower, userMessage)) {
		return {
			action: 'update_draft_metadata',
			draftName,
			draftNotes: extractDraftNotes(userMessage),
			searchQuery: userMessage,
			targetReference,
		}
	}
	if (isDraftCreationRequest(lower, userMessage)) {
		return {
			action: 'create_draft_from_plan',
			draftName,
			searchQuery: userMessage,
		}
	}
	if (isDeliveryTrackingRequest(lower, userMessage)) {
		return {
			action: 'delivery_tracking',
			searchQuery: userMessage,
			targetReference,
		}
	}
	if (isProfileRequest(lower, userMessage)) {
		return {
			action: 'customer_profile',
			searchQuery: userMessage,
		}
	}
	if (isCustomerOrdersRequest(lower, userMessage)) {
		return {
			action:
				targetReference || lower.includes('latest')
					? 'order_detail'
					: 'customer_orders',
			searchQuery: userMessage,
			targetReference,
		}
	}
	if (isProductSearchRequest(lower, userMessage)) {
		return {
			action: 'product_search',
			searchQuery: userMessage,
		}
	}

	const docs = retrieveWebsiteDocs(userMessage)
	if (classifyWebsitePublicChatIntent(userMessage, docs) === 'public_docs') {
		return { action: 'public_docs', searchQuery: userMessage }
	}

	return { action: 'chat', searchQuery: '' }
}

export function parsePortalCustomerRoute(
	rawResponse: string,
	userMessage: string,
): PortalCustomerRoute {
	const jsonText = extractJsonObject(rawResponse)
	if (!jsonText) return fallbackPortalCustomerRoute(userMessage)

	try {
		const parsed: unknown = JSON.parse(jsonText)
		if (!isRecord(parsed) || typeof parsed.action !== 'string') {
			return fallbackPortalCustomerRoute(userMessage)
		}
		if (!isRouteAction(parsed.action)) {
			return fallbackPortalCustomerRoute(userMessage)
		}

		const route: PortalCustomerRoute = {
			action: parsed.action,
			searchQuery:
				typeof parsed.search_query === 'string' && parsed.search_query.trim()
					? parsed.search_query.trim()
					: userMessage.trim(),
		}
		if (
			typeof parsed.target_reference === 'string' &&
			parsed.target_reference.trim()
		) {
			route.targetReference = parsed.target_reference.trim()
		}
		if (typeof parsed.draft_name === 'string' && parsed.draft_name.trim()) {
			route.draftName = parsed.draft_name.trim().slice(0, 120)
		}
		if (typeof parsed.draft_notes === 'string' && parsed.draft_notes.trim()) {
			route.draftNotes = parsed.draft_notes.trim().slice(0, 600)
		}
		if (isCleanupMode(parsed.cleanup_mode)) {
			route.cleanupMode = parsed.cleanup_mode
		}
		if (typeof parsed.reason === 'string' && parsed.reason.trim()) {
			route.reason = parsed.reason.trim()
		}

		return enforcePortalCustomerRoute(route, userMessage)
	} catch {
		return fallbackPortalCustomerRoute(userMessage)
	}
}

export function parseWebsiteRouteAsPortalDocsRoute(
	route: WebsitePublicChatRoute,
	userMessage: string,
): PortalCustomerRoute {
	return route.action === 'retrieve_public_docs'
		? { action: 'public_docs', searchQuery: route.searchQuery || userMessage }
		: fallbackPortalCustomerRoute(userMessage)
}

export function enforcePortalCustomerRoute(
	route: PortalCustomerRoute,
	userMessage: string,
): PortalCustomerRoute {
	const refusal = portalCustomerPolicyRefusal(userMessage)
	if (refusal) {
		return { action: 'refuse', reason: refusal, searchQuery: '' }
	}
	if (route.action === 'refuse') {
		return {
			action: 'refuse',
			reason:
				route.reason ||
				portalCustomerPolicyRefusal(userMessage) ||
				defaultRefusal(userMessage),
			searchQuery: '',
		}
	}
	if (route.action === 'public_docs') return route

	const fallback = fallbackPortalCustomerRoute(userMessage)
	if (fallback.action === 'public_docs') return fallback
	if (
		isDraftWriteAction(route.action) &&
		!isDraftWriteAction(fallback.action)
	) {
		return fallback
	}

	return route
}

export function isDraftWriteAction(action: PortalCustomerRouteAction): boolean {
	return (
		action === 'create_draft_from_plan' ||
		action === 'duplicate_order_to_draft' ||
		action === 'update_draft_metadata' ||
		action === 'cleanup_drafts' ||
		action === 'delete_draft'
	)
}

export function extractTargetReference(
	userMessage: string,
): string | undefined {
	const uuid = userMessage.match(
		/\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i,
	)?.[0]
	if (uuid) return uuid

	const reference = userMessage.match(
		/\b(?:QR|RFQ|REQ|ORD|ORDER|QUOTE)[-_ ]?\d[A-Z0-9]*(?:[-_][A-Z0-9]+)?\b/i,
	)?.[0]
	return reference?.replace(/\s+/g, '-')
}

function asksToSubmitOrder(lower: string, raw: string): boolean {
	return (
		(/\b(submit|place|confirm|send|approve|accept|checkout)\b/.test(lower) &&
			/\b(order|quote|rfq|request)\b/.test(lower)) ||
		/قدّم|قدم|اكد|أكد|ابعت|ارسل|اعتمد/.test(raw)
	)
}

function asksForPrivateOrCrossScope(lower: string, raw: string): boolean {
	return (
		/\b(other|another|all)\s+customers?\b/.test(lower) ||
		/\bcross[- ]customer\b/.test(lower) ||
		/\b(private|internal)\s+(finance|financial|report|data|dashboard)\b/.test(
			lower,
		) ||
		/\b(finance internal|supplier cost|supplier margin|cost price|profit margin)\b/.test(
			lower,
		) ||
		/\b(employee|salary|payroll|secret|token|api key|service role)\b/.test(
			lower,
		) ||
		/\bdriver-only\b/.test(lower) ||
		/عميل\s+(تاني|تانى|اخر|آخر)|كل\s+العملاء|بيانات\s+داخلية|تكلفة\s+المورد|هامش|موظف|موظفين|سر|توكن|مفتاح/.test(
			raw,
		)
	)
}

function isCleanupDraftRequest(lower: string, raw: string): boolean {
	return (
		(/\b(clean|cleanup|clean up|merge|dedupe|deduplicate)\b/.test(lower) &&
			/\bdrafts?\b/.test(lower)) ||
		/نضف|نظف|ادمج|امسح\s+كل\s+المسودات|المسودات/.test(raw)
	)
}

function isDeleteDraftRequest(lower: string, raw: string): boolean {
	return (
		(/\b(delete|remove|discard)\b/.test(lower) && /\bdrafts?\b/.test(lower)) ||
		/امسح|احذف|الغى\s+المسودة|الغي\s+المسودة/.test(raw)
	)
}

function isDuplicateDraftRequest(lower: string, raw: string): boolean {
	return (
		(/\b(copy|duplicate|repeat|same as|reorder|again)\b/.test(lower) &&
			/\b(order|quote|draft|request)\b/.test(lower)) ||
		/كرر|انسخ|زي\s+الطلب|نفس\s+الطلب/.test(raw)
	)
}

function isDraftMetadataRequest(lower: string, raw: string): boolean {
	return (
		(/\b(rename|call|name|update|change|edit)\b/.test(lower) &&
			/\bdrafts?\b/.test(lower)) ||
		/سمي|غير\s+اسم|اسم\s+المسودة|عدل\s+المسودة/.test(raw)
	)
}

function isDraftCreationRequest(lower: string, raw: string): boolean {
	return (
		(/\b(create|make|start|build|prepare|draft|quote request|material list|plan)\b/.test(
			lower,
		) &&
			/\b(draft|quote|rfq|request|materials?|cement|rebar|steel|concrete|sand|aggregate|brick|paint|tiles?)\b/.test(
				lower,
			)) ||
		/مسودة|عرض\s+سعر|طلب\s+عرض|مواد|اسمنت|أسمنت|حديد|خرسانة|رمل|طوب|بويات|سيراميك/.test(
			raw,
		)
	)
}

function isDeliveryTrackingRequest(lower: string, raw: string): boolean {
	return (
		(/\b(track|tracking|delivery|driver|truck|plate|eta|route|location|where is)\b/.test(
			lower,
		) &&
			/\b(my|order|delivery|driver|truck|eta|route|location)\b/.test(lower)) ||
		/تتبع|توصيل|السائق|السواق|الشاحنة|العربية|اللوحة|الموقع|مكان|يوصل|فين/.test(
			raw,
		)
	)
}

function isCustomerOrdersRequest(lower: string, raw: string): boolean {
	return (
		(/\b(order|orders|quote|quotes|rfq|request|requests|status|draft|saved|submitted|confirmed|delivered)\b/.test(
			lower,
		) &&
			/\b(my|show|list|latest|status|where|open|view|what)\b/.test(lower)) ||
		/طلبي|طلباتي|طلب|طلبات|عروضي|عرض|حالة|مسودة|مسودات/.test(raw)
	)
}

function isProfileRequest(lower: string, raw: string): boolean {
	return (
		(/\b(profile|account|company|address|addresses|project|projects|site|sites|contact)\b/.test(
			lower,
		) &&
			/\b(my|our|show|list|what|where|update|which)\b/.test(lower)) ||
		/حسابي|بروفايل|الشركة|العنوان|عناويني|مشروعي|مشاريعي/.test(raw)
	)
}

function isProductSearchRequest(lower: string, raw: string): boolean {
	if (
		/\b(no|why|published|policy|explain)\b.*\b(price|prices|pricing)\b/.test(
			lower,
		)
	) {
		return false
	}
	return (
		/\b(product|products|catalog|catalogue|market|material|materials|cement|rebar|steel|concrete|sand|aggregate|brick|paint|tiles?)\b/.test(
			lower,
		) ||
		(/\b(price|prices)\b/.test(lower) &&
			/\b(cement|rebar|steel|concrete|sand|aggregate|brick|paint|tiles?)\b/.test(
				lower,
			)) ||
		/منتج|منتجات|كتالوج|السوق|مواد|اسمنت|أسمنت|حديد|خرسانة|رمل|طوب/.test(raw)
	)
}

function detectCleanupMode(
	lower: string,
	raw: string,
): PortalCustomerRoute['cleanupMode'] {
	if (
		/\b(delete|remove|discard|all|full)\b/.test(lower) ||
		/كل|امسح|احذف/.test(raw)
	) {
		return 'delete_all'
	}
	if (/\b(merge|dedupe|deduplicate)\b/.test(lower) || /ادمج/.test(raw)) {
		return 'merge'
	}
	return 'remove_empty'
}

function extractDraftName(userMessage: string): string | undefined {
	const quoted = userMessage.match(/["“”']([^"“”']{1,120})["“”']/)?.[1]
	if (quoted) return quoted.trim()
	const named = userMessage.match(
		/\b(?:rename|call|name)\s+(?:my\s+)?draft\s+(?:to|as)?\s*([A-Za-z0-9 _./-]{2,120})/i,
	)?.[1]
	return named?.trim()
}

function extractDraftNotes(userMessage: string): string | undefined {
	const note = userMessage.match(/\b(?:note|notes?)\s*[:=]\s*(.{2,600})$/i)?.[1]
	return note?.trim()
}

function defaultRefusal(userMessage: string): string {
	return detectPortalAiLocale(userMessage) === 'ar'
		? 'مش هقدر أعمل الطلب ده من الشات. أقدر أساعدك في المسودات وبيانات حسابك فقط.'
		: 'I cannot do that from chat. I can help with drafts and your own customer account only.'
}

function isRouteAction(value: string): value is PortalCustomerRouteAction {
	return ROUTE_ACTIONS.includes(value as PortalCustomerRouteAction)
}

function isCleanupMode(
	value: unknown,
): value is PortalCustomerRoute['cleanupMode'] {
	return value === 'delete_all' || value === 'merge' || value === 'remove_empty'
}

function extractJsonObject(rawResponse: string): string | null {
	const fenced = rawResponse.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]
	if (fenced) return fenced.trim()
	const start = rawResponse.indexOf('{')
	const end = rawResponse.lastIndexOf('}')
	if (start < 0 || end <= start) return null
	return rawResponse.slice(start, end + 1)
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null
}
