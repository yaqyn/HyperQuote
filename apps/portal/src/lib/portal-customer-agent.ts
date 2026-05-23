import {
	classifyWebsitePublicChatIntent,
	retrieveWebsiteDocs,
} from '@hyperquote/docs/retrieval'

const ARABIC_BLOCK = /[\u0600-\u06ff]/

const AGENT_TOOL_ACTIONS = [
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

export type PortalCustomerAgentAction = (typeof AGENT_TOOL_ACTIONS)[number]

export interface PortalCustomerToolRequest {
	action: PortalCustomerAgentAction
	cleanupMode?: 'delete_all' | 'merge' | 'remove_empty'
	draftName?: string
	draftNotes?: string
	finalResponse?: string
	reason?: string
	searchQuery: string
	targetReference?: string
}

export interface PortalCustomerCatalogSnapshotItem {
	category: string
	name: string
	nameAr: string | null
	priceRange: string
	productId: string
	status: 'Available' | 'Unavailable'
	unit: string
}

export interface PortalCustomerCatalogSnapshot {
	catalogComplete: boolean
	products: PortalCustomerCatalogSnapshotItem[]
	totalVisibleProducts: number
}

export function buildPortalCustomerAgentPrompt(
	catalog: PortalCustomerCatalogSnapshot,
): string {
	return `You are Lyon, a natural customer-support and materials-planning agent inside the signed-in HyperQuote customer portal.

The server has already authenticated the customer. You may request exactly one safe internal tool, or ask for no tool when friendly chat is enough. Return JSON only; never answer outside JSON.

Response schema:
{"tool":"chat"|"public_docs"|"customer_profile"|"customer_orders"|"order_detail"|"delivery_tracking"|"product_search"|"create_draft_from_plan"|"duplicate_order_to_draft"|"update_draft_metadata"|"cleanup_drafts"|"delete_draft"|"refuse","search_query":"string","target_reference":"string","draft_name":"string","draft_notes":"string","cleanup_mode":"delete_all"|"merge"|"remove_empty","reason":"string","final_response":"string"}

Tool rules:
- chat: greetings, small talk, unclear requests, or when you should ask a short clarifying question. Put the natural response in final_response.
- public_docs: public HyperQuote documentation questions.
- customer_profile: the signed-in customer's company profile, addresses, or projects.
- customer_orders: customer-owned draft/saved/submitted/confirmed/delivered/cancelled/rejected summaries.
- order_detail: one specific quote request/order or latest order detail.
- delivery_tracking: customer-visible driver, truck, ETA, route, or location for the customer's own delivery.
- product_search: catalog/material search and project planning. Use the supplied catalog snapshot; ask before writing a project plan to a draft.
- create_draft_from_plan: only explicit draft-create/catalog-selection requests. The server will add only real currently Available catalog product IDs.
- duplicate_order_to_draft, update_draft_metadata, cleanup_drafts, delete_draft: draft-only, customer-scoped edits.
- refuse: submit/place/confirm order requests, cross-customer data, internal finance, supplier costs/margins, employee data, secrets, or driver-only operational data outside the customer's own delivery tracking.

Never request submit, confirm, accept, payment, cancellation, internal, supplier-cost, employee, or cross-customer writes. Do not invent products. If matching is uncertain, use chat and ask what material, size, grade, or quantity is missing.

Visible catalog snapshot (${catalog.products.length}/${catalog.totalVisibleProducts}; complete: ${catalog.catalogComplete ? 'yes' : 'no'}):
${JSON.stringify(catalog.products, null, 2)}`
}

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

export function fallbackPortalCustomerToolRequest(
	userMessage: string,
): PortalCustomerToolRequest {
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
	if (isProjectPlanningRequest(lower, userMessage)) {
		return {
			action: 'product_search',
			searchQuery: userMessage,
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

export function parsePortalCustomerToolRequest(
	rawResponse: string,
	userMessage: string,
): PortalCustomerToolRequest {
	const jsonText = extractJsonObject(rawResponse)
	if (!jsonText) return fallbackPortalCustomerToolRequest(userMessage)

	try {
		const parsed: unknown = JSON.parse(jsonText)
		if (!isRecord(parsed)) {
			return fallbackPortalCustomerToolRequest(userMessage)
		}
		const action = readAgentAction(parsed)
		if (!action) {
			return fallbackPortalCustomerToolRequest(userMessage)
		}

		const request: PortalCustomerToolRequest = {
			action,
			searchQuery:
				typeof parsed.search_query === 'string' && parsed.search_query.trim()
					? parsed.search_query.trim()
					: userMessage.trim(),
		}
		if (
			typeof parsed.target_reference === 'string' &&
			parsed.target_reference.trim()
		) {
			request.targetReference = parsed.target_reference.trim()
		}
		if (typeof parsed.draft_name === 'string' && parsed.draft_name.trim()) {
			request.draftName = parsed.draft_name.trim().slice(0, 120)
		}
		if (typeof parsed.draft_notes === 'string' && parsed.draft_notes.trim()) {
			request.draftNotes = parsed.draft_notes.trim().slice(0, 600)
		}
		if (isCleanupMode(parsed.cleanup_mode)) {
			request.cleanupMode = parsed.cleanup_mode
		}
		if (typeof parsed.reason === 'string' && parsed.reason.trim()) {
			request.reason = parsed.reason.trim()
		}
		if (
			typeof parsed.final_response === 'string' &&
			parsed.final_response.trim()
		) {
			request.finalResponse = parsed.final_response.trim().slice(0, 1200)
		}

		return enforcePortalCustomerToolRequest(request, userMessage)
	} catch {
		return fallbackPortalCustomerToolRequest(userMessage)
	}
}

export function enforcePortalCustomerToolRequest(
	request: PortalCustomerToolRequest,
	userMessage: string,
): PortalCustomerToolRequest {
	const refusal = portalCustomerPolicyRefusal(userMessage)
	if (refusal) {
		return { action: 'refuse', reason: refusal, searchQuery: '' }
	}
	if (request.action === 'refuse') {
		return {
			action: 'refuse',
			reason:
				request.reason ||
				portalCustomerPolicyRefusal(userMessage) ||
				defaultRefusal(userMessage),
			searchQuery: '',
		}
	}
	if (request.action === 'public_docs') return request

	const fallback = fallbackPortalCustomerToolRequest(userMessage)
	if (fallback.action === 'public_docs') return fallback
	if (
		isDraftWriteAction(request.action) &&
		!isDraftWriteAction(fallback.action)
	) {
		return fallback
	}

	return request
}

export function isDraftWriteAction(action: PortalCustomerAgentAction): boolean {
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
		/(?:(?:نضف|نظف|ادمج).{0,40}المسودات|(?:امسح|احذف).{0,20}كل.{0,20}المسودات)/.test(
			raw,
		)
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
	const arabicDraftAction = /اعمل|جهز|حضّر|حضر|انشئ|اختار|رشح/.test(raw)
	const arabicDraftTarget = /مسودة|عرض\s+سعر|طلب\s+عرض|اوردر|طلب/.test(raw)
	const arabicCatalogTarget =
		/مواد|منتجات|كتالوج|اسمنت|أسمنت|حديد|معدن|معادن|خرسانة|رمل|طوب|بويات|سيراميك/.test(
			raw,
		)
	const explicitEnglishDraftWrite =
		/\b(create|make|start|build|prepare|generate|draft|add)\b/.test(lower) &&
		/\b(draft|quote|rfq|request|order|cart)\b/.test(lower)
	const explicitEnglishCatalogDraft =
		/\bdraft\b/.test(lower) &&
		/\b(materials?|products?|catalog|catalogue|cement|rebar|steel|metals?|concrete|sand|aggregate|bricks?|paints?|tiles?)\b/.test(
			lower,
		)
	return (
		explicitEnglishDraftWrite ||
		explicitEnglishCatalogDraft ||
		(arabicDraftAction && arabicDraftTarget && arabicCatalogTarget)
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
		/\b(product|products|catalog|catalogue|market|material|materials|cement|rebar|steel|metals?|concrete|sand|aggregate|brick|paint|tiles?)\b/.test(
			lower,
		) ||
		(/\b(price|prices)\b/.test(lower) &&
			/\b(cement|rebar|steel|metals?|concrete|sand|aggregate|brick|paint|tiles?)\b/.test(
				lower,
			)) ||
		/منتج|منتجات|كتالوج|السوق|مواد|اسمنت|أسمنت|حديد|معدن|معادن|خرسانة|رمل|طوب/.test(
			raw,
		)
	)
}

function isProjectPlanningRequest(lower: string, raw: string): boolean {
	const planningAction =
		/\b(need|want|build|make|plan|planning|project|materials?|what do i need|how much)\b/.test(
			lower,
		) || /احتاج|عايز|ابني|أبني|اعمل|مشروع|مواد/.test(raw)
	const projectTarget =
		/\b(tree\s*house|treehouse|house|room|roof|wall|floor|deck|platform|shed|stairs?|ladder|foundation|fence|gate|kitchen|bathroom|villa|warehouse)\b/.test(
			lower,
		) ||
		/بيت|غرفة|اوضة|سقف|حائط|حيطة|جدار|ارضية|أرضية|سلم|منصة|فيلا|مخزن/.test(raw)
	const projectAnswer =
		/\b(it'?s|its|this is|for a|for an)\b/.test(lower) ||
		/ده|دي|دا|هذا|هذه/.test(raw)
	return projectTarget && (planningAction || projectAnswer)
}

function detectCleanupMode(
	lower: string,
	raw: string,
): PortalCustomerToolRequest['cleanupMode'] {
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

function isRouteAction(value: string): value is PortalCustomerAgentAction {
	return AGENT_TOOL_ACTIONS.includes(value as PortalCustomerAgentAction)
}

function readAgentAction(
	parsed: Record<string, unknown>,
): PortalCustomerAgentAction | null {
	const value =
		typeof parsed.tool === 'string'
			? parsed.tool
			: typeof parsed.action === 'string'
				? parsed.action
				: ''
	return isRouteAction(value) ? value : null
}

function isCleanupMode(
	value: unknown,
): value is PortalCustomerToolRequest['cleanupMode'] {
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
