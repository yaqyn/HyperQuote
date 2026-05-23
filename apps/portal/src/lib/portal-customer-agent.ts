import {
	type PortalChatCommandName,
	parsePortalChatCommand,
} from './portal-chat-commands'
import {
	isPortalCustomerOrderScope,
	type PortalCustomerOrderScope,
} from './portal-order-scope'

const ARABIC_BLOCK = /[\u0600-\u06ff]/

const AGENT_TOOL_ACTIONS = [
	'chat',
	'public_docs',
	'customer_profile',
	'customer_orders',
	'order_detail',
	'delivery_tracking',
	'delivery_list',
	'product_search',
	'compare_products',
	'recommend_materials',
	'address_list',
	'project_list',
	'account_health',
	'draft_detail',
	'draft_add_items',
	'draft_replace_item',
	'draft_set_delivery',
	'draft_validate',
	'create_draft_from_plan',
	'update_draft_items',
	'duplicate_order_to_draft',
	'update_draft_metadata',
	'cleanup_drafts',
	'delete_draft',
	'order_activity',
	'support_request',
	'refuse',
] as const

export type PortalCustomerAgentAction = (typeof AGENT_TOOL_ACTIONS)[number]

export interface PortalCustomerToolRequest {
	action: PortalCustomerAgentAction
	addressQuery?: string
	cleanupMode?: 'delete_all' | 'merge' | 'remove_empty'
	commandName?: PortalChatCommandName
	deliveryDate?: string
	draftItemAction?:
		| 'set_quantity'
		| 'remove_item'
		| 'clear_items'
		| 'set_item_notes'
	draftName?: string
	draftNotes?: string
	finalResponse?: string
	itemNotes?: string
	itemQuery?: string
	orderScope?: PortalCustomerOrderScope
	previousQuantity?: number
	quantity?: number
	reason?: string
	replacementQuery?: string
	searchQuery: string
	supportMessage?: string
	supportSubject?: string
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
	return `You are Lyon inside the signed-in HyperQuote customer portal.

Choose one internal tool only when it helps. Use chat for normal conversation or a short clarification. Return JSON only.

Schema:
{"tool":"chat"|"public_docs"|"customer_profile"|"customer_orders"|"order_detail"|"delivery_tracking"|"delivery_list"|"product_search"|"compare_products"|"recommend_materials"|"address_list"|"project_list"|"account_health"|"draft_detail"|"draft_add_items"|"draft_replace_item"|"draft_set_delivery"|"draft_validate"|"create_draft_from_plan"|"update_draft_items"|"duplicate_order_to_draft"|"update_draft_metadata"|"cleanup_drafts"|"delete_draft"|"order_activity"|"support_request"|"refuse","search_query":"string","target_reference":"string","order_scope":"all"|"drafts"|"submitted"|"active"|"completed","draft_name":"string","draft_notes":"string","draft_item_action":"set_quantity"|"remove_item"|"clear_items"|"set_item_notes","item_query":"string","replacement_query":"string","quantity":123,"previous_quantity":123,"item_notes":"string","address_query":"string","delivery_date":"YYYY-MM-DD","cleanup_mode":"delete_all"|"merge"|"remove_empty","support_subject":"string","support_message":"string","reason":"string","final_response":"string"}

Tools:
- chat: friendly talk, clarification, or final_response.
- public_docs: public HyperQuote docs.
- customer_profile: the signed-in customer's company/account info, contact details, addresses, or projects.
- customer_orders: customer-owned records. Set order_scope: all, drafts, submitted, active, or completed.
- order_detail: one specific or latest quote/order.
- delivery_tracking, delivery_list: the customer's own delivery tracking.
- product_search, compare_products, recommend_materials: catalog search, comparison, or material planning. Ask before writing plans to drafts.
- address_list, project_list, account_health: customer-owned account context.
- draft_detail, draft_validate, order_activity: inspect customer-owned records.
- create_draft_from_plan: explicit draft-create/catalog-selection only; server writes real Available product IDs. Include a natural draft_name and draft_notes.
- update_draft_items: edit an editable draft line, quantity, note, or clear lines. Include refreshed draft_notes; include draft_name when the title should change.
- draft_add_items, draft_replace_item, draft_set_delivery, duplicate_order_to_draft, update_draft_metadata, cleanup_drafts, delete_draft: customer-scoped draft-only edits.
- support_request: explicit support/feedback ticket only. Use support_subject and support_message.
- refuse: submit/confirm/place/cancel orders, payments, cross-customer data, internal finance, supplier costs/margins, employee data, secrets, or unrelated driver-only data.

Use the conversation like a capable assistant. Decide from intent and context, not isolated keywords. Put natural draft targets in search_query when no exact reference exists. Slash commands are user shortcuts, not words to repeat back.

Do not invent products. If matching is uncertain, ask briefly.

For draft_name, write a short natural title, never a "Draft:" prefix. For draft_notes, write one simple description of what the order is about or what the current materials are. No review/submit instructions, edit links, "Lyon selected", or catalog/process boilerplate.

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
	const commandRoute = routePortalChatCommand(userMessage)
	if (commandRoute) return commandRoute

	const refusal = portalCustomerPolicyRefusal(userMessage)
	if (refusal) {
		return { action: 'refuse', reason: refusal, searchQuery: '' }
	}

	return { action: 'chat', searchQuery: '' }
}

export function routePortalChatCommand(
	userMessage: string,
): PortalCustomerToolRequest | null {
	const command = parsePortalChatCommand(userMessage)
	if (!command) return null

	const searchQuery = command.args
	switch (command.name) {
		case '/help':
			return {
				action: 'chat',
				commandName: command.name,
				searchQuery: '',
			}
		case '/products':
			return {
				action: 'product_search',
				commandName: command.name,
				searchQuery,
			}
		case '/compare-products':
			return {
				action: 'compare_products',
				commandName: command.name,
				searchQuery,
			}
		case '/recommend-materials':
			return {
				action: 'recommend_materials',
				commandName: command.name,
				searchQuery,
			}
		case '/market':
			return {
				action: 'chat',
				commandName: command.name,
				searchQuery: '',
			}
		case '/new-draft':
			return {
				action: 'chat',
				commandName: command.name,
				searchQuery: '',
			}
		case '/cart':
		case '/open-cart':
			return {
				action: 'chat',
				commandName: command.name,
				searchQuery: '',
			}
		case '/orders':
			return {
				action: 'customer_orders',
				commandName: command.name,
				orderScope: orderScopeFromCommandArgs(command.args) ?? 'all',
				searchQuery,
			}
		case '/drafts':
			return {
				action: 'customer_orders',
				commandName: command.name,
				orderScope: 'drafts',
				searchQuery,
			}
		case '/draft':
			return {
				action: 'draft_detail',
				commandName: command.name,
				searchQuery,
				targetReference: extractTargetReference(command.args),
			}
		case '/edit-draft':
			return {
				action: 'draft_detail',
				commandName: command.name,
				searchQuery,
				targetReference: extractTargetReference(command.args),
			}
		case '/delete-draft':
			return {
				action: 'delete_draft',
				commandName: command.name,
				searchQuery,
				targetReference: extractTargetReference(command.args),
			}
		case '/clear-draft':
			return {
				action: 'update_draft_items',
				commandName: command.name,
				draftItemAction: 'clear_items',
				searchQuery,
				targetReference: extractTargetReference(command.args),
			}
		case '/rename-draft': {
			const { rest, targetReference } = splitCommandTarget(command.args)
			return {
				action: 'update_draft_metadata',
				commandName: command.name,
				draftName: cleanCommandText(rest),
				searchQuery,
				targetReference,
			}
		}
		case '/note-draft': {
			const { rest, targetReference } = splitCommandTarget(command.args)
			return {
				action: 'update_draft_metadata',
				commandName: command.name,
				draftNotes: cleanCommandText(rest),
				searchQuery,
				targetReference,
			}
		}
		case '/validate-draft':
			return {
				action: 'draft_validate',
				commandName: command.name,
				searchQuery,
				targetReference: extractTargetReference(command.args),
			}
		case '/add-to-draft': {
			const { rest, targetReference } = splitCommandTarget(command.args)
			return {
				action: 'draft_add_items',
				commandName: command.name,
				itemQuery: rest || undefined,
				searchQuery,
				targetReference,
			}
		}
		case '/replace-draft-item': {
			const { rest, targetReference } = splitCommandTarget(command.args)
			const replacement = splitReplacementCommand(rest)
			return {
				action: 'draft_replace_item',
				commandName: command.name,
				itemQuery: replacement.itemQuery,
				replacementQuery: replacement.replacementQuery,
				searchQuery,
				targetReference,
			}
		}
		case '/set-draft-delivery': {
			const { rest, targetReference } = splitCommandTarget(command.args)
			const delivery = parseDeliveryCommand(rest)
			return {
				action: 'draft_set_delivery',
				addressQuery: delivery.addressQuery,
				commandName: command.name,
				deliveryDate: delivery.deliveryDate,
				searchQuery,
				targetReference,
			}
		}
		case '/reorder':
			return {
				action: 'duplicate_order_to_draft',
				commandName: command.name,
				searchQuery,
				targetReference: extractTargetReference(command.args),
			}
		case '/latest-order':
			return {
				action: 'order_detail',
				commandName: command.name,
				searchQuery,
			}
		case '/status':
			return {
				action: 'order_detail',
				commandName: command.name,
				searchQuery,
				targetReference: extractTargetReference(command.args),
			}
		case '/activity':
			return {
				action: 'order_activity',
				commandName: command.name,
				searchQuery,
				targetReference: extractTargetReference(command.args),
			}
		case '/track':
			return {
				action: 'delivery_tracking',
				commandName: command.name,
				searchQuery,
				targetReference: command.args || undefined,
			}
		case '/deliveries':
			return {
				action: 'delivery_list',
				commandName: command.name,
				searchQuery,
			}
		case '/profile':
			return {
				action: 'customer_profile',
				commandName: command.name,
				searchQuery,
			}
		case '/addresses':
			return {
				action: 'address_list',
				commandName: command.name,
				searchQuery,
			}
		case '/projects':
			return {
				action: 'project_list',
				commandName: command.name,
				searchQuery,
			}
		case '/account-health':
			return {
				action: 'account_health',
				commandName: command.name,
				searchQuery,
			}
		case '/clear-all-drafts':
			return {
				action: 'cleanup_drafts',
				cleanupMode: 'delete_all',
				commandName: command.name,
				searchQuery,
			}
		case '/support':
			return {
				action: 'chat',
				commandName: command.name,
				searchQuery: '',
			}
		case '/contact':
			return {
				action: 'chat',
				commandName: command.name,
				searchQuery: '',
			}
		case '/feedback':
			return command.args
				? {
						action: 'support_request',
						commandName: command.name,
						searchQuery,
						supportMessage: command.args,
						supportSubject: 'Portal feedback',
					}
				: {
						action: 'chat',
						commandName: command.name,
						searchQuery: '',
					}
		case '/docs':
			return command.args
				? {
						action: 'public_docs',
						commandName: command.name,
						searchQuery: command.args,
					}
				: {
						action: 'chat',
						commandName: command.name,
						searchQuery: '',
					}
		case '/docs-search':
			return command.args
				? {
						action: 'public_docs',
						commandName: command.name,
						searchQuery: command.args,
					}
				: {
						action: 'chat',
						commandName: command.name,
						searchQuery: '',
					}
		case '/clear':
		case '/new':
			return {
				action: 'chat',
				commandName: command.name,
				finalResponse: 'Started a fresh chat.',
				searchQuery: '',
			}
	}
}

function orderScopeFromCommandArgs(
	args: string,
): PortalCustomerOrderScope | null {
	const scope = args.trim().split(/\s+/)[0]?.toLowerCase()
	return isPortalCustomerOrderScope(scope) ? scope : null
}

function splitCommandTarget(args: string): {
	rest: string
	targetReference?: string
} {
	const trimmed = args.trim()
	if (!trimmed) return { rest: '' }
	const match = trimmed.match(
		/^([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|(?:QR|RFQ|REQ|ORD|ORDER|QUOTE)[-_ ]?\d[A-Z0-9]*(?:[-_][A-Z0-9]+)?)\s*(.*)$/i,
	)
	if (!match) return { rest: trimmed }
	return {
		rest: match[2]?.trim() ?? '',
		targetReference: match[1]?.replace(/\s+/g, '-'),
	}
}

function cleanCommandText(value: string): string | undefined {
	const trimmed = value.trim()
	if (!trimmed) return undefined
	return trimmed.replace(/^["“”']|["“”']$/g, '').trim() || undefined
}

function splitReplacementCommand(value: string): {
	itemQuery?: string
	replacementQuery?: string
} {
	const parts = value.split(/\s+(?:with|to|=>|→)\s+/i)
	if (parts.length >= 2) {
		return {
			itemQuery: cleanCommandText(parts[0] ?? ''),
			replacementQuery: cleanCommandText(parts.slice(1).join(' with ')),
		}
	}
	return { replacementQuery: cleanCommandText(value) }
}

function parseDeliveryCommand(value: string): {
	addressQuery?: string
	deliveryDate?: string
} {
	const date = value.match(/\b\d{4}-\d{2}-\d{2}\b/)?.[0]
	const addressQuery = cleanCommandText(value.replace(date ?? '', ' '))
	return {
		addressQuery,
		deliveryDate: date,
	}
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
		if (isDraftItemAction(parsed.draft_item_action)) {
			request.draftItemAction = parsed.draft_item_action
		}
		if (typeof parsed.item_query === 'string' && parsed.item_query.trim()) {
			request.itemQuery = parsed.item_query.trim().slice(0, 160)
		}
		const quantity = readPositiveNumber(parsed.quantity)
		if (quantity !== null) request.quantity = quantity
		const previousQuantity = readPositiveNumber(parsed.previous_quantity)
		if (previousQuantity !== null) request.previousQuantity = previousQuantity
		if (typeof parsed.item_notes === 'string' && parsed.item_notes.trim()) {
			request.itemNotes = parsed.item_notes.trim().slice(0, 600)
		}
		if (
			typeof parsed.replacement_query === 'string' &&
			parsed.replacement_query.trim()
		) {
			request.replacementQuery = parsed.replacement_query.trim().slice(0, 160)
		}
		if (
			typeof parsed.address_query === 'string' &&
			parsed.address_query.trim()
		) {
			request.addressQuery = parsed.address_query.trim().slice(0, 160)
		}
		if (
			typeof parsed.delivery_date === 'string' &&
			parsed.delivery_date.trim()
		) {
			request.deliveryDate = parsed.delivery_date.trim().slice(0, 40)
		}
		if (isPortalCustomerOrderScope(parsed.order_scope)) {
			request.orderScope = parsed.order_scope
		}
		if (isCleanupMode(parsed.cleanup_mode)) {
			request.cleanupMode = parsed.cleanup_mode
		}
		if (typeof parsed.reason === 'string' && parsed.reason.trim()) {
			request.reason = parsed.reason.trim()
		}
		if (
			typeof parsed.support_subject === 'string' &&
			parsed.support_subject.trim()
		) {
			request.supportSubject = parsed.support_subject.trim().slice(0, 160)
		}
		if (
			typeof parsed.support_message === 'string' &&
			parsed.support_message.trim()
		) {
			request.supportMessage = parsed.support_message.trim().slice(0, 1200)
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

	return request
}

export function isDraftWriteAction(action: PortalCustomerAgentAction): boolean {
	return (
		action === 'create_draft_from_plan' ||
		action === 'draft_add_items' ||
		action === 'draft_replace_item' ||
		action === 'draft_set_delivery' ||
		action === 'update_draft_items' ||
		action === 'duplicate_order_to_draft' ||
		action === 'update_draft_metadata' ||
		action === 'cleanup_drafts' ||
		action === 'delete_draft' ||
		action === 'support_request'
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

function normalizeQuantity(value: number): number | null {
	if (!Number.isFinite(value) || value <= 0) return null
	return Math.min(value, 1_000_000)
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

export function inferDraftItemEdit(
	userMessage: string,
): Pick<
	PortalCustomerToolRequest,
	| 'draftItemAction'
	| 'itemNotes'
	| 'itemQuery'
	| 'previousQuantity'
	| 'quantity'
> | null {
	const lower = userMessage.toLowerCase()
	const normalized = normalizeForAgentMatch(userMessage)
	const mentionsDraft =
		/\b(draft|quote|rfq|request|cart|line|item|product|qty|quantity|piece|pieces)\b/.test(
			normalized,
		) || /مسودة|عرض|طلب|منتج|بند|كمية|عدد|قطعة/.test(userMessage)
	const quantityChange = parseDraftQuantityChange(userMessage)
	if (
		quantityChange &&
		(mentionsDraft || /\b(change|make|set|update|edit)\b/.test(normalized))
	) {
		return {
			draftItemAction: 'set_quantity',
			itemQuery: extractDraftItemQuery(userMessage),
			previousQuantity: quantityChange.previousQuantity ?? undefined,
			quantity: quantityChange.quantity,
		}
	}
	if (!mentionsDraft) return null
	if (
		/\b(clear|empty|remove all|delete all)\b/.test(lower) ||
		/فضي|افرغ|امسح\s+كل|احذف\s+كل/.test(userMessage)
	) {
		return { draftItemAction: 'clear_items' }
	}
	if (
		/\b(remove|delete|drop)\b/.test(lower) ||
		/شيل|احذف|امسح/.test(userMessage)
	) {
		return {
			draftItemAction: 'remove_item',
			itemQuery: extractDraftItemQuery(userMessage),
		}
	}
	const itemNotes = extractDraftItemNotes(userMessage)
	if (itemNotes !== undefined && isItemNoteRequest(normalized, userMessage)) {
		return {
			draftItemAction: 'set_item_notes',
			itemNotes,
			itemQuery: extractDraftItemQuery(userMessage),
		}
	}
	return null
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

function isDraftItemAction(
	value: unknown,
): value is NonNullable<PortalCustomerToolRequest['draftItemAction']> {
	return (
		value === 'set_quantity' ||
		value === 'remove_item' ||
		value === 'clear_items' ||
		value === 'set_item_notes'
	)
}

function readPositiveNumber(value: unknown): number | null {
	if (typeof value !== 'number' && typeof value !== 'string') return null
	const parsed =
		typeof value === 'number' ? value : Number.parseFloat(value.trim())
	return normalizeQuantity(parsed)
}

function parseDraftQuantityChange(
	text: string,
): { previousQuantity: number | null; quantity: number } | null {
	const normalized = normalizeForAgentMatch(text)
	const explicit = normalized.match(
		/\b(?:from\s+)?(\d+(?:\.\d+)?)\s*(?:pieces?|pcs?|units?|qty|quantity)?\s*(?:to|->|make it|set it to|set to|be|become)\s*(\d+(?:\.\d+)?)\b/,
	)
	if (explicit) {
		const previousQuantity = normalizeQuantity(
			Number.parseFloat(explicit[1] ?? ''),
		)
		const quantity = normalizeQuantity(Number.parseFloat(explicit[2] ?? ''))
		return quantity ? { previousQuantity, quantity } : null
	}
	const broadTarget = normalized.match(
		/\b(?:make|set|change|update|edit)\b.{0,80}\b(?:to|as|make it|set it to)\s*(\d+(?:\.\d+)?)\b/,
	)
	if (broadTarget) {
		const quantity = normalizeQuantity(Number.parseFloat(broadTarget[1] ?? ''))
		if (quantity) return { previousQuantity: null, quantity }
	}
	const target = normalized.match(
		/\b(?:make|set|change|update|edit)\s+(?:it|this|that|qty|quantity|line|item|draft)?\s*(?:to)?\s*(\d+(?:\.\d+)?)\b/,
	)
	if (target) {
		const quantity = normalizeQuantity(Number.parseFloat(target[1] ?? ''))
		if (quantity) return { previousQuantity: null, quantity }
	}
	const numbers = [...normalized.matchAll(/\b(\d+(?:\.\d+)?)\b/g)]
		.map((match) => normalizeQuantity(Number.parseFloat(match[1] ?? '')))
		.filter((value): value is number => value !== null)
	if (
		numbers.length >= 2 &&
		/\b(change|update|edit|make|set)\b/.test(normalized)
	) {
		return {
			previousQuantity: numbers.at(-2) ?? null,
			quantity: numbers.at(-1) ?? 0,
		}
	}
	return null
}

function extractDraftItemQuery(text: string): string | undefined {
	const normalized = normalizeForAgentMatch(text)
	const explicit = normalized.match(
		/\b(?:wood|wooden|timber|lumber|cement|rebar|steel|metal|metals|concrete|sand|aggregate|brick|bricks|paint|tiles?)\b/,
	)?.[0]
	if (explicit) return explicit
	const quoted = text.match(/["“”']([^"“”']{1,120})["“”']/)?.[1]
	return quoted?.trim()
}

function extractDraftItemNotes(text: string): string | undefined {
	const note = text.match(
		/\b(?:line|item|product)?\s*notes?\s*(?:to|as|:|=)\s*(.{2,600})$/i,
	)?.[1]
	return note?.trim()
}

function isItemNoteRequest(normalized: string, raw: string): boolean {
	return (
		/\b(line|item|product|material|wood|timber|lumber|cement|rebar|steel|metal|concrete|sand|brick|paint|tile)\b/.test(
			normalized,
		) || /بند|منتج|مادة|خشب|اسمنت|أسمنت|حديد/.test(raw)
	)
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

function normalizeForAgentMatch(value: string): string {
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
