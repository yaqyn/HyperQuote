import type { ChatToolCompletion, ChatToolDefinition } from '@hyperquote/ai'
import { isBroadCatalogReadRequest } from './portal-catalog-intent'
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

type PortalCustomerAgentAction = (typeof AGENT_TOOL_ACTIONS)[number]

export interface PortalCustomerToolRequest {
	action: PortalCustomerAgentAction
	addressQuery?: string
	clarificationScope?: 'draft_edit'
	cleanupMode?: 'delete_all' | 'merge' | 'remove_empty'
	commandName?: PortalChatCommandName
	confirmedAction?: boolean
	draftLines?: PortalDraftMaterialRequestLine[]
	deliveryDate?: string
	draftItemAction?:
		| 'decrease_quantity'
		| 'increase_quantity'
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
	unavailableQueries?: string[]
}

export interface PortalDraftMaterialRequestLine {
	pendingChoiceIndex?: number
	pendingChoiceId?: string
	productId?: string
	query: string
	quantity: number
	rawText: string
	unitHint?: string
}

interface PortalCustomerCatalogSnapshotItem {
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

export interface PortalCustomerActiveDraftSnapshot {
	dirty?: boolean
	id: string | null
	items: {
		lineId?: string
		orderable?: boolean
		productId?: string
		productName: string
		productNameAr?: string
		quantity: number
		unitOfMeasure: string
		unitOfMeasureAr?: string
	}[]
	name: string | null
	notes: string
	reference: string | null
	sessionKey?: string
}

export function portalCustomerToolDefinitions(): ChatToolDefinition[] {
	return [
		toolDefinition(
			'search_catalog',
			'Search visible customer catalog products.',
			{
				properties: {
					query: { type: 'string' },
				},
				required: ['query'],
				type: 'object',
			},
		),
		toolDefinition(
			'resolve_product_choice',
			'Resolve customer requested product lines into real catalog choices.',
			{
				properties: {
					draft_lines: draftLinesSchema(),
					draft_name: { type: 'string' },
					draft_notes: { type: 'string' },
					target_reference: { type: 'string' },
				},
				required: ['draft_lines'],
				type: 'object',
			},
		),
		toolDefinition('read_draft', 'Read one editable customer draft.', {
			properties: {
				search_query: { type: 'string' },
				target_reference: { type: 'string' },
			},
			type: 'object',
		}),
		toolDefinition(
			'preview_draft_changes',
			'Preview or request a confirmation for draft-only changes.',
			{
				properties: draftChangeProperties(),
				required: ['operation'],
				type: 'object',
			},
		),
		toolDefinition(
			'save_confirmed_draft_changes',
			'Save a draft change only after the app supplied confirmed action payload.',
			{
				properties: draftChangeProperties(),
				required: ['operation'],
				type: 'object',
			},
		),
		toolDefinition('validate_draft', 'Validate editable draft lines.', {
			properties: {
				search_query: { type: 'string' },
				target_reference: { type: 'string' },
			},
			type: 'object',
		}),
		toolDefinition(
			'read_customer_orders',
			'Read customer-owned orders or quotes.',
			{
				properties: {
					order_scope: {
						enum: ['all', 'drafts', 'submitted', 'active', 'completed'],
						type: 'string',
					},
					search_query: { type: 'string' },
					target_reference: { type: 'string' },
				},
				type: 'object',
			},
		),
		toolDefinition(
			'read_delivery_tracking',
			'Read customer delivery tracking.',
			{
				properties: {
					search_query: { type: 'string' },
					target_reference: { type: 'string' },
				},
				type: 'object',
			},
		),
		toolDefinition(
			'customer_profile',
			'Read customer profile, addresses, or projects.',
			{
				properties: {
					scope: {
						enum: ['profile', 'addresses', 'projects', 'account_health'],
						type: 'string',
					},
				},
				type: 'object',
			},
		),
		toolDefinition('public_docs', 'Search public HyperQuote documentation.', {
			properties: { query: { type: 'string' } },
			required: ['query'],
			type: 'object',
		}),
		toolDefinition(
			'support_request',
			'Create support ticket after confirmation.',
			{
				properties: {
					message: { type: 'string' },
					subject: { type: 'string' },
				},
				required: ['message'],
				type: 'object',
			},
		),
		toolDefinition(
			'clarify_draft_edit',
			'Open structured clarification for an intended cart or draft-line edit whose operation, item, or quantity is not fully known.',
			{
				properties: {
					search_query: { type: 'string' },
					target_reference: { type: 'string' },
				},
				required: ['search_query'],
				type: 'object',
			},
		),
		toolDefinition(
			'show_command_desk',
			'Open Lyon’s interactive command desk when the customer asks what is possible, wants a menu, seems stuck, or would benefit from seeing several valid next actions. This presents choices only and never executes another command.',
			{
				properties: {},
				type: 'object',
			},
		),
		toolDefinition('chat', 'Answer directly or ask one clarification.', {
			properties: {
				intent: {
					enum: ['conversation', 'draft_edit'],
					type: 'string',
				},
				final_response: { type: 'string' },
				search_query: { type: 'string' },
			},
			required: ['intent', 'final_response'],
			type: 'object',
		}),
	]
}

function toolDefinition(
	name: string,
	description: string,
	parameters: Record<string, unknown>,
): ChatToolDefinition {
	return {
		function: { description, name, parameters },
		type: 'function',
	}
}

function draftLinesSchema(): Record<string, unknown> {
	return {
		items: {
			properties: {
				pending_choice_id: { type: 'string' },
				product_id: { type: 'string' },
				query: { type: 'string' },
				quantity: { type: 'number' },
				raw_text: { type: 'string' },
				unit_hint: { type: 'string' },
			},
			required: ['query'],
			type: 'object',
		},
		type: 'array',
	}
}

function draftChangeProperties(): Record<string, unknown> {
	return {
		draft_item_action: {
			enum: [
				'clear_items',
				'decrease_quantity',
				'increase_quantity',
				'remove_item',
				'set_item_notes',
				'set_quantity',
			],
			type: 'string',
		},
		draft_name: { type: 'string' },
		draft_notes: { type: 'string' },
		item_notes: { type: 'string' },
		item_query: { type: 'string' },
		operation: {
			enum: [
				'add_items',
				'replace_item',
				'set_delivery',
				'update_items',
				'update_metadata',
				'delete_draft',
				'cleanup_drafts',
			],
			type: 'string',
		},
		previous_quantity: { type: 'number' },
		quantity: { type: 'number' },
		replacement_query: { type: 'string' },
		search_query: { type: 'string' },
		target_reference: { type: 'string' },
	}
}

export function buildPortalCustomerAgentPrompt(
	catalog: PortalCustomerCatalogSnapshot,
	activeDraft?: PortalCustomerActiveDraftSnapshot | null,
): string {
	return `You are Lyon inside the signed-in HyperQuote customer portal.

	Every response must call a tool. Choose tools whenever live Portal data is needed. You may use several read tools before answering. Use chat only for normal conversation or a clarification unrelated to products, quotes, drafts, orders, deliveries, profile data, documentation, or support.
When writing final_response, sound like a capable teammate: short, direct, and inviting. Prefer one strong sentence or two tight bullets. Ask only the missing question.

Tools:
- chat: friendly talk, clarification, or final_response. Always set intent to conversation or draft_edit. Use draft_edit whenever the customer intends to edit the current cart/draft but any required operation, item, or quantity is unknown; the app will ask those missing fields.
- clarify_draft_edit: use when the customer clearly wants to edit an existing cart/draft line but one or more of operation, item, or quantity is unknown. Never ask those edit fields only as free text; this tool opens the app's structured clarification UI.
- show_command_desk: proactively present the interactive command desk when the customer asks what Lyon can do, asks for commands or a menu, is stuck, or has a broad goal with several sensible starting points. It only presents customer-controlled choices. Never use it instead of a clear requested action, never execute a slash command on the customer's behalf, and do not show it in every response.
- public_docs: public HyperQuote docs.
- customer_profile: the signed-in customer's company/account info, contact details, addresses, or projects.
- customer_orders: customer-owned records. Set order_scope: all, drafts, submitted, active, or completed.
- order_detail: one specific or latest quote/order.
- delivery_tracking, delivery_list: the customer's own delivery tracking. For "where is the driver", "where is he", "what place is that", ETA, or delivery-location follow-ups, use tracking/list from the conversation. If no exact order is named, prefer delivery_list.
- product_search, compare_products, recommend_materials: catalog search, comparison, or material planning. Ask before writing plans to drafts.
- address_list, project_list, account_health: customer-owned account context.
- draft_detail, draft_validate, order_activity: inspect customer-owned records.
	- resolve_product_choice: always use this for customer buy intent or draft-create/catalog-selection, including short requests such as "I want plywood" or "عايز خشب". Include one draft_lines entry for every requested product, even when one quantity applies to several products (for example, "rebar and steel both 400" means two lines with quantity 400). Preserve every quantity the customer supplied. If quantity is missing, omit it; never invent a default and never ask for product details through chat. The app will ask only for missing facts using live catalog facets. Keep the original wording, unit hint, and pending choice id when applicable. Server writes only real Available product IDs. When the customer wants to add to the open cart or draft, include its id or sessionKey as target_reference.
- read_draft, validate_draft: inspect the active or named editable draft.
- preview_draft_changes: use for draft edits that may need confirmation or clarification.
- save_confirmed_draft_changes: use only when the app sends a confirmed action payload.
- read_customer_orders, read_delivery_tracking: customer-owned reads only.
- support_request: when the user asks to create, send, submit, or file a support ticket/feedback, or says they need to contact support about a concrete issue or complaint. Do not ask them for a separate subject/title/description; infer the subject and use their natural message as the description. If they only ask for support contact details, docs, FAQ, or help finding something, use public_docs or chat instead.
- refuse: submit/confirm/place/cancel orders, payments, cross-customer data, internal finance, supplier costs/margins, employee data, secrets, or unrelated driver-only data.

Use the conversation like a capable assistant. Decide from intent and context, not isolated keywords. Put natural draft targets in search_query when no exact reference exists. Slash commands are customer-controlled shortcuts: you may open the command desk when useful, but you must never manufacture or execute slash-command text yourself.
For factual questions about what products, materials, inventory, stock, or catalog items are available, use search_catalog. Never answer catalog contents from memory or general industry knowledge.
If you previously asked the customer to choose between multiple catalog products and they ask which one is better, cheaper, stronger, bigger, or otherwise ask for advice, use compare_products or chat. Do not choose for them or create/update a draft until they actually select an option.
When the customer answers a previous catalog choice, keep the earlier requested quantities attached to their original product lines; only replace the ambiguous line with the selected real product.
Destructive or external actions are gated by the app. Do not claim a draft was deleted, cleared, renamed, or a ticket was submitted unless the tool result confirms it.
Never answer delivery location from memory or coordinates. Use delivery_tracking/delivery_list and let the server format customer-safe place names.

Current cart / draft desk:
${activeDraft ? JSON.stringify(activeDraft, null, 2) : 'No cart or saved draft is currently open in the chat desk.'}
If the current desk has "sessionKey": "cart" and no id, treat it as the customer's live Cart. If the customer asks what is in it, what they already selected, or wants planning advice based on it, answer directly from this Current cart / draft desk JSON. Never say you cannot view the selected Cart when this context is present. For customer requests to add products, remove products, change quantities, or clear items, use resolve_product_choice or preview_draft_changes so the app can update the live Cart. Do not call it a saved draft.
For an edit to an existing cart or draft line, preserve exactly which facts the customer supplied. Use increase_quantity when their number is an amount to add, decrease_quantity when it is an amount to deduct, set_quantity when it is the desired final quantity, and remove_item only when they want the whole line removed. Omit any unknown operation, item_query, or quantity instead of guessing; the app will ask only for the missing fields.
If a saved current draft is shown and the user says this draft, it, them, the open draft, or asks for an edit without naming a different draft, use that draft id as target_reference. If the user names another draft or describes one by title/material/old quantity, keep that description in search_query so the server can resolve the right editable draft.
If a saved current draft is shown and the user asks in any language to inspect it or plan around it, answer directly from this Current cart / draft desk JSON. If they ask to clear, remove from, change quantities, rename, or update notes for that draft, use the matching draft tool. Never claim a draft changed from chat; server tools must do writes.

	Do not invent products. English and Arabic names describe the same product identity; treat them as aliases and keep the customer's mixed-language wording in draft_lines.query. Never ask for SKU or product code. Ask only for a missing quantity or for catalog facets that genuinely distinguish the live matches, such as type, manufacturer, or specification. Do not ask again for a fact already present. For a buy request, extract each requested product phrase exactly as the customer meant it; do not replace it with a broader synonym or category. Let search_catalog and the server match spelling variants against the live catalog.

For draft_name, write a short natural title, never a "Draft:" prefix. For draft_notes, write one simple description of what the order is about or what the current materials are. No review/submit instructions, edit links, "Lyon selected", or catalog/process boilerplate.

	Catalog retrieval is live and tool-backed. The supplied snapshot metadata is ${catalog.products.length}/${catalog.totalVisibleProducts} products (complete: ${catalog.catalogComplete ? 'yes' : 'no'}). Never treat this metadata as catalog contents; use search_catalog for every catalog fact.`
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
			: 'I can prepare the draft, but I will not submit or confirm an order for you. Use the order form when ready.'
	}

	if (asksForPrivateOrCrossScope(lower, userMessage)) {
		return isArabic
			? 'أقدر أستخدم وثائق هايبركوت العامة وبيانات حسابك أنت فقط. مش هعرض بيانات عملاء آخرين أو بيانات داخلية أو تكلفة الموردين أو بيانات الموظفين.'
			: 'I can use public docs and your own account only. I cannot reveal other customers, internal data, supplier costs, employees, secrets, or driver-only data.'
	}

	return null
}

export function fallbackPortalCustomerToolRequest(
	userMessage: string,
): PortalCustomerToolRequest {
	const commandRoute = routePortalChatCommand(userMessage)
	if (commandRoute) {
		if (
			commandRoute.commandName === '/plan-quote' &&
			!commandRoute.draftLines?.length
		) {
			return {
				action: 'chat',
				commandName: '/commands',
				finalResponse:
					detectPortalAiLocale(userMessage) === 'ar'
						? 'تخطيط مشروع مفتوح يحتاج ليون متصل. أدوات البوابة المباشرة ما زالت متاحة من مكتب الأوامر.'
						: 'Open-ended project planning needs Lyon online. The direct Portal tools are still available from the command desk.',
				searchQuery: '',
			}
		}
		return commandRoute
	}

	const refusal = portalCustomerPolicyRefusal(userMessage)
	if (refusal) {
		return { action: 'refuse', reason: refusal, searchQuery: '' }
	}

	const supportRequest = inferNaturalSupportTicketRequest(userMessage)
	if (supportRequest) return supportRequest

	if (isBroadCatalogReadRequest(userMessage)) {
		return { action: 'product_search', searchQuery: '' }
	}

	return { action: 'chat', searchQuery: '' }
}

export function routePortalChatCommand(
	userMessage: string,
): PortalCustomerToolRequest | null {
	const command = parsePortalChatCommand(userMessage)
	if (!command) return null

	const confirmation = splitCommandConfirmation(command.args)
	const commandArgs = confirmation.args
	const confirmedAction = confirmation.confirmed ? true : undefined
	const searchQuery = commandArgs
	switch (command.name) {
		case '/commands':
		case '/help':
			return {
				action: 'chat',
				commandName: command.name,
				searchQuery: '',
			}
		case '/plan-quote': {
			const draftLines = parsePortalDraftMaterialRequestLines(commandArgs)
			return {
				action: 'create_draft_from_plan',
				commandName: command.name,
				draftLines: draftLines.length > 0 ? draftLines : undefined,
				searchQuery,
			}
		}
		case '/search-products':
			return {
				action: 'product_search',
				commandName: command.name,
				searchQuery,
			}
		case '/add-to-cart': {
			const draftLines = parsePortalDraftMaterialRequestLines(commandArgs)
			return {
				action: 'draft_add_items',
				commandName: command.name,
				draftLines: draftLines.length > 0 ? draftLines : undefined,
				itemQuery: commandArgs || undefined,
				searchQuery,
				targetReference: 'active',
			}
		}
		case '/edit-cart':
			return {
				action: 'update_draft_items',
				clarificationScope: 'draft_edit',
				commandName: command.name,
				searchQuery,
				targetReference: 'active',
			}
		case '/ticket':
			if (commandArgs) {
				const supportMessage = cleanCommandText(commandArgs) ?? commandArgs
				return {
					action: 'support_request',
					commandName: command.name,
					confirmedAction,
					searchQuery,
					supportMessage,
					supportSubject: supportSubjectFromText(supportMessage),
				}
			}
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
				orderScope: orderScopeFromCommandArgs(commandArgs) ?? 'all',
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
				targetReference: extractTargetReference(commandArgs),
			}
		case '/edit-draft':
			return {
				action: 'draft_detail',
				commandName: command.name,
				searchQuery,
				targetReference: extractTargetReference(commandArgs),
			}
		case '/delete-draft':
			return {
				action: 'delete_draft',
				commandName: command.name,
				confirmedAction,
				searchQuery,
				targetReference: extractTargetReference(commandArgs),
			}
		case '/clear-draft':
			return {
				action: 'update_draft_items',
				commandName: command.name,
				confirmedAction,
				draftItemAction: 'clear_items',
				searchQuery,
				targetReference: extractTargetReference(commandArgs),
			}
		case '/remove-from-draft': {
			const { rest, targetReference } = splitCommandTarget(commandArgs)
			return {
				action: 'update_draft_items',
				commandName: command.name,
				confirmedAction,
				draftItemAction: 'remove_item',
				itemQuery: cleanCommandText(rest),
				searchQuery,
				targetReference,
			}
		}
		case '/rename-draft': {
			const { rest, targetReference } = splitCommandTarget(commandArgs)
			return {
				action: 'update_draft_metadata',
				commandName: command.name,
				confirmedAction,
				draftName: cleanCommandText(rest),
				searchQuery,
				targetReference,
			}
		}
		case '/note-draft': {
			const { rest, targetReference } = splitCommandTarget(commandArgs)
			return {
				action: 'update_draft_metadata',
				commandName: command.name,
				confirmedAction,
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
				targetReference: extractTargetReference(commandArgs),
			}
		case '/add-to-draft': {
			const { rest, targetReference } = splitCommandTarget(commandArgs)
			return {
				action: 'draft_add_items',
				commandName: command.name,
				itemQuery: rest || undefined,
				searchQuery,
				targetReference,
			}
		}
		case '/replace-draft-item': {
			const { rest, targetReference } = splitCommandTarget(commandArgs)
			const replacement = splitReplacementCommand(rest)
			return {
				action: 'draft_replace_item',
				commandName: command.name,
				confirmedAction,
				itemQuery: replacement.itemQuery,
				replacementQuery: replacement.replacementQuery,
				searchQuery,
				targetReference,
			}
		}
		case '/set-draft-delivery': {
			const { rest, targetReference } = splitCommandTarget(commandArgs)
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
				targetReference: extractTargetReference(commandArgs),
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
				targetReference: extractTargetReference(commandArgs),
			}
		case '/activity':
			return {
				action: 'order_activity',
				commandName: command.name,
				searchQuery,
				targetReference: extractTargetReference(commandArgs),
			}
		case '/track':
			return {
				action: 'delivery_tracking',
				commandName: command.name,
				searchQuery,
				targetReference: commandArgs || undefined,
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
				confirmedAction,
				searchQuery,
			}
		case '/clean-drafts':
			return {
				action: 'cleanup_drafts',
				cleanupMode: 'remove_empty',
				commandName: command.name,
				confirmedAction,
				searchQuery,
			}
		case '/merge-drafts':
			return {
				action: 'cleanup_drafts',
				cleanupMode: 'merge',
				commandName: command.name,
				confirmedAction,
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
			if (commandArgs) {
				const supportMessage = cleanCommandText(commandArgs) ?? commandArgs
				return {
					action: 'support_request',
					commandName: command.name,
					confirmedAction,
					searchQuery,
					supportMessage,
					supportSubject: supportSubjectFromText(supportMessage),
				}
			}
			return {
				action: 'chat',
				commandName: command.name,
				searchQuery: '',
			}
		case '/docs':
			return commandArgs
				? {
						action: 'public_docs',
						commandName: command.name,
						searchQuery: commandArgs,
					}
				: {
						action: 'chat',
						commandName: command.name,
						searchQuery: '',
					}
		case '/docs-search':
			return commandArgs
				? {
						action: 'public_docs',
						commandName: command.name,
						searchQuery: commandArgs,
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

function splitCommandConfirmation(args: string): {
	args: string
	confirmed: boolean
} {
	const confirmed = /(?:^|\s)--confirm(?:\s|$)/i.test(args)
	return {
		args: args.replace(/(?:^|\s)--confirm(?:\s|$)/gi, ' ').trim(),
		confirmed,
	}
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
		const draftLines = readDraftLines(parsed.draft_lines)
		if (draftLines.length > 0) request.draftLines = draftLines
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
		if (parsed.clarification_scope === 'draft_edit') {
			request.clarificationScope = 'draft_edit'
		}

		return enforcePortalCustomerToolRequest(request, userMessage)
	} catch {
		return fallbackPortalCustomerToolRequest(userMessage)
	}
}

export function parsePortalCustomerToolCall(
	completion: ChatToolCompletion,
	userMessage: string,
): PortalCustomerToolRequest | null {
	const call = completion.toolCalls[0]
	if (!call) return null
	let args: unknown
	try {
		args = JSON.parse(call.function.arguments || '{}')
	} catch {
		return fallbackPortalCustomerToolRequest(userMessage)
	}
	if (!isRecord(args)) return fallbackPortalCustomerToolRequest(userMessage)
	const searchQuery =
		readString(args.search_query) ??
		readString(args.query) ??
		userMessage.trim()

	switch (call.function.name) {
		case 'search_catalog':
			return { action: 'product_search', searchQuery }
		case 'resolve_product_choice': {
			const targetReference = readString(args.target_reference)
			return enforcePortalCustomerToolRequest(
				{
					action: targetReference
						? 'draft_add_items'
						: 'create_draft_from_plan',
					draftLines: readDraftLines(args.draft_lines),
					draftName: readString(args.draft_name),
					draftNotes: readString(args.draft_notes),
					searchQuery,
					targetReference,
				},
				userMessage,
			)
		}
		case 'read_draft':
			return {
				action: 'draft_detail',
				searchQuery,
				targetReference: readString(args.target_reference),
			}
		case 'preview_draft_changes':
			return draftChangeToolCallToRequest(args, userMessage, false)
		case 'save_confirmed_draft_changes':
			return draftChangeToolCallToRequest(args, userMessage, true)
		case 'validate_draft':
			return {
				action: 'draft_validate',
				searchQuery,
				targetReference: readString(args.target_reference),
			}
		case 'read_customer_orders': {
			const orderScope = readString(args.order_scope)
			return {
				action: readString(args.target_reference)
					? 'order_detail'
					: 'customer_orders',
				orderScope: isPortalCustomerOrderScope(orderScope)
					? orderScope
					: undefined,
				searchQuery,
				targetReference: readString(args.target_reference),
			}
		}
		case 'read_delivery_tracking':
			return {
				action: 'delivery_tracking',
				searchQuery,
				targetReference: readString(args.target_reference),
			}
		case 'customer_profile': {
			const scope = readString(args.scope)
			if (scope === 'addresses') return { action: 'address_list', searchQuery }
			if (scope === 'projects') return { action: 'project_list', searchQuery }
			if (scope === 'account_health') {
				return { action: 'account_health', searchQuery }
			}
			return { action: 'customer_profile', searchQuery }
		}
		case 'public_docs':
			return { action: 'public_docs', searchQuery }
		case 'support_request': {
			const message = readString(args.message) ?? searchQuery
			return enforcePortalCustomerToolRequest(
				{
					action: 'support_request',
					searchQuery,
					supportMessage: message,
					supportSubject:
						readString(args.subject) ?? supportSubjectFromText(message),
				},
				userMessage,
			)
		}
		case 'clarify_draft_edit':
			return {
				action: 'update_draft_items',
				searchQuery,
				targetReference: readString(args.target_reference),
			}
		case 'show_command_desk':
			return {
				action: 'chat',
				commandName: '/commands',
				finalResponse:
					detectPortalAiLocale(userMessage) === 'ar'
						? 'أكيد. اختار اللي محتاجه من مكتب أوامر ليون، وأنا هكمل معاك خطوة بخطوة.'
						: 'Absolutely. Choose where you want to start from Lyon’s command desk, and I’ll guide the next step.',
				searchQuery: '',
			}
		case 'chat':
			return enforcePortalCustomerToolRequest(
				{
					action: 'chat',
					clarificationScope:
						args.intent === 'draft_edit' ||
						args.clarification_scope === 'draft_edit'
							? 'draft_edit'
							: undefined,
					finalResponse: readString(args.final_response),
					searchQuery,
				},
				userMessage,
			)
		default:
			return fallbackPortalCustomerToolRequest(userMessage)
	}
}

function draftChangeToolCallToRequest(
	args: Record<string, unknown>,
	userMessage: string,
	confirmedAction: boolean,
): PortalCustomerToolRequest {
	const operation = readString(args.operation)
	const searchQuery = readString(args.search_query) ?? userMessage.trim()
	const base = {
		confirmedAction,
		searchQuery,
		targetReference: readString(args.target_reference),
	}
	switch (operation) {
		case 'add_items':
			return {
				...base,
				action: 'draft_add_items',
				itemQuery: readString(args.item_query) ?? searchQuery,
			}
		case 'replace_item':
			return {
				...base,
				action: 'draft_replace_item',
				itemQuery: readString(args.item_query),
				replacementQuery: readString(args.replacement_query),
			}
		case 'set_delivery':
			return {
				...base,
				action: 'draft_set_delivery',
				addressQuery: readString(args.address_query),
				deliveryDate: readString(args.delivery_date),
			}
		case 'update_metadata':
			return {
				...base,
				action: 'update_draft_metadata',
				draftName: readString(args.draft_name),
				draftNotes: readString(args.draft_notes),
			}
		case 'delete_draft':
			return { ...base, action: 'delete_draft' }
		case 'cleanup_drafts': {
			const cleanupMode = readString(args.cleanup_mode)
			return {
				...base,
				action: 'cleanup_drafts',
				cleanupMode: isCleanupMode(cleanupMode) ? cleanupMode : undefined,
			}
		}
		default: {
			const draftItemAction = readString(args.draft_item_action)
			return {
				...base,
				action: 'update_draft_items',
				draftItemAction: isDraftItemAction(draftItemAction)
					? draftItemAction
					: undefined,
				itemNotes: readString(args.item_notes),
				itemQuery: readString(args.item_query),
				previousQuantity:
					readPositiveNumber(args.previous_quantity) ?? undefined,
				quantity: readPositiveNumber(args.quantity) ?? undefined,
			}
		}
	}
}

export function enforcePortalCustomerToolRequest(
	request: PortalCustomerToolRequest,
	userMessage: string,
): PortalCustomerToolRequest {
	const normalizedRequest = propagateSharedDraftQuantity(request, userMessage)
	const refusal = portalCustomerPolicyRefusal(userMessage)
	if (refusal) {
		return { action: 'refuse', reason: refusal, searchQuery: '' }
	}
	if (normalizedRequest.action === 'refuse') {
		return {
			action: 'refuse',
			reason:
				normalizedRequest.reason ||
				portalCustomerPolicyRefusal(userMessage) ||
				defaultRefusal(userMessage),
			searchQuery: '',
		}
	}
	const naturalSupportRequest = inferNaturalSupportTicketRequest(userMessage)
	if (
		normalizedRequest.action === 'support_request' &&
		!isExplicitSupportTicketRequest(userMessage, normalizedRequest)
	) {
		if (naturalSupportRequest) {
			return {
				...normalizedRequest,
				searchQuery:
					normalizedRequest.searchQuery || naturalSupportRequest.searchQuery,
				supportMessage:
					normalizedRequest.supportMessage ??
					naturalSupportRequest.supportMessage,
				supportSubject:
					normalizedRequest.supportSubject ??
					naturalSupportRequest.supportSubject,
			}
		}
		return {
			action: 'public_docs',
			searchQuery: userMessage.trim() || 'support docs contact faq',
		}
	}
	if (
		naturalSupportRequest &&
		(normalizedRequest.action === 'chat' ||
			normalizedRequest.action === 'public_docs')
	) {
		return naturalSupportRequest
	}
	if (
		(normalizedRequest.action === 'chat' ||
			normalizedRequest.action === 'public_docs') &&
		isExplicitSupportTicketRequest(userMessage, normalizedRequest)
	) {
		const message = userMessage.trim()
		return {
			action: 'support_request',
			searchQuery: message,
			supportMessage: message,
			supportSubject: supportSubjectFromText(message),
		}
	}
	if (
		normalizedRequest.action === 'chat' &&
		normalizedRequest.draftLines?.length
	) {
		return {
			...normalizedRequest,
			action: 'create_draft_from_plan',
		}
	}
	if (
		(normalizedRequest.action === 'chat' ||
			normalizedRequest.action === 'public_docs') &&
		isBroadCatalogReadRequest(userMessage)
	) {
		return {
			action: 'product_search',
			searchQuery: '',
		}
	}

	return normalizedRequest
}

export function propagateSharedDraftQuantity(
	request: PortalCustomerToolRequest,
	userMessage: string,
): PortalCustomerToolRequest {
	if (!request.draftLines || request.draftLines.length < 2) return request
	const quantities = numericValuesInText(userMessage)
	if (quantities.length !== 1) return request
	const sharedQuantity = quantities[0]
	if (!sharedQuantity) return request
	if (request.draftLines.every(draftLineQuantityIsGrounded)) return request
	return {
		...request,
		draftLines: request.draftLines.map((line) =>
			draftLineQuantityIsGrounded(line)
				? line
				: {
						...line,
						quantity: sharedQuantity,
						rawText: `${sharedQuantity} ${line.rawText || line.query}`,
					},
		),
	}
}

function draftLineQuantityIsGrounded(
	line: PortalDraftMaterialRequestLine,
): boolean {
	if (!Number.isFinite(line.quantity) || line.quantity <= 0) return false
	return numericValuesInText(line.rawText).some(
		(value) => Math.abs(value - line.quantity) < 0.0001,
	)
}

function numericValuesInText(value: string): number[] {
	const normalized = value
		.replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
		.replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
	return [...normalized.matchAll(/\d+(?:[.,]\d+)?/g)]
		.map((match) => Number.parseFloat((match[0] ?? '').replace(',', '.')))
		.filter((number) => Number.isFinite(number) && number > 0)
}

export function parsePortalDraftMaterialRequestLines(
	userMessage: string,
): PortalDraftMaterialRequestLine[] {
	const segments = draftRequestSegments(userMessage)
	const numericValues = numericValuesInText(userMessage)
	const sharedQuantity =
		segments.length > 1 && numericValues.length === 1
			? (numericValues[0] ?? null)
			: null
	const lines = segments.flatMap(
		(segment): PortalDraftMaterialRequestLine[] => {
			const materialFirst = segment.match(
				/^(.+?)\s+(\d+(?:[.,]\d+)?)\s*(bags?|tons?|tonnes?|pieces?|pcs?|units?|bars?|sheets?|kg|m2|m3)?$/iu,
			)
			const quantityFirst = materialFirst
				? null
				: segment.match(
						/(?:^|\bfor\s+)(?:.*?\s)?(?:some\s+)?(\d+(?:[.,]\d+)?)\s*(?:(bags?|tons?|tonnes?|pieces?|pcs?|units?|bars?|sheets?|kg|m2|m3)\s+)?(.+)$/iu,
					)
			const parsedQuantity = readPositiveNumber(
				(quantityFirst?.[1] ?? materialFirst?.[2] ?? '').replace(',', '.'),
			)
			const quantity = parsedQuantity ?? sharedQuantity
			if (quantity === null) return []
			const rawQuery = cleanMaterialLineQuery(
				quantityFirst?.[3] ?? materialFirst?.[1] ?? segment,
			)
			if (!rawQuery || !looksLikeMaterialRequest(rawQuery)) return []
			return [
				{
					query: rawQuery,
					quantity,
					rawText: parsedQuantity ? segment : `${quantity} ${segment}`,
					unitHint: normalizeUnitHint(quantityFirst?.[2] ?? materialFirst?.[3]),
				},
			]
		},
	)

	return mergeAdjacentDuplicateMaterialLines(lines)
}

function draftRequestSegments(userMessage: string): string[] {
	return userMessage
		.replace(
			/\s*(?:\.{2,}|[.!?])?\s+\b(?:maybe\s+)?(?:also|plus|then)\b\s+(?=(?:some\s+)?\d)/giu,
			', ',
		)
		.split(/\s*(?:[,;]+|\+|&|\band\b)\s*/iu)
		.map((segment) => segment.trim())
		.filter(Boolean)
}

function cleanMaterialLineQuery(value: string): string {
	return value
		.split(/[.?!]+/u)[0]
		.replace(
			/^(?:(?:i|we)\s+)?(?:want|need|wanna|would\s+like|get|give\s+me|add|include|put)\s+(?:some\s+)?/i,
			'',
		)
		.replace(/^(?:عايز|عاوزه|عاوز|محتاج|هات|ضيف)\s+/u, '')
		.replace(/\s+both$/i, '')
		.replace(/\s+(?:الاتنين|الاثنين|كلاهما)$/u, '')
		.replace(
			/\b(?:for|to|into)\s+(?:a|an|the|my|our)?\s*(?:draft|quote|rfq|order|project|site)\b.*$/i,
			'',
		)
		.replace(/\s+(?:just\s+)?for\b.*$/i, '')
		.replace(
			/\b(?:for|to|into)\s+(?:that|this|the|same|current|active|open|opened|it|them)\s+(?:same\s+)?(?:thing|one|draft|quote|rfq|order|list)\b.*$/i,
			'',
		)
		.replace(
			/\b(?:in|on)\s+(?:there|here|it|that|this|the|same|current|active|open|opened)\b.*$/i,
			'',
		)
		.replace(/\b(?:dont|don't|do not)\s+wipe\b.*$/i, '')
		.replace(/\b(?:please|pls|thanks|thank you)\b/gi, ' ')
		.replace(/\s+(?:also|too|as well)$/i, '')
		.replace(/\b(?:draft|quote|rfq|order|request)\b/gi, ' ')
		.replace(/[.?!]+$/g, '')
		.replace(/\s+/g, ' ')
		.trim()
		.slice(0, 120)
}

function looksLikeMaterialRequest(query: string): boolean {
	const normalized = normalizeForAgentMatch(query)
	if (!normalized) return false
	if (/^\d+(?:\.\d+)?$/.test(normalized)) return false
	const blocked = new Set([
		'account',
		'address',
		'addresses',
		'draft',
		'drafts',
		'help',
		'invoice',
		'invoices',
		'order',
		'orders',
		'quote',
		'quotes',
		'support',
		'ticket',
		'tickets',
	])
	const tokens = normalized.split(' ').filter(Boolean)
	return tokens.some((token) => token.length > 1 && !blocked.has(token))
}

function normalizeUnitHint(value: string | undefined): string | undefined {
	if (!value) return undefined
	const normalized = normalizeForAgentMatch(value)
	if (!normalized) return undefined
	if (
		/^(bag|bags|ton|tons|tonne|tonnes|piece|pieces|pcs|unit|units|bar|bars|sheet|sheets|kg|m2|m3)$/.test(
			normalized,
		)
	) {
		return normalized
	}
	return undefined
}

function mergeAdjacentDuplicateMaterialLines(
	lines: PortalDraftMaterialRequestLine[],
): PortalDraftMaterialRequestLine[] {
	const merged: PortalDraftMaterialRequestLine[] = []
	for (const line of lines) {
		const previous = merged.at(-1)
		if (
			previous &&
			normalizeForAgentMatch(previous.query) ===
				normalizeForAgentMatch(line.query)
		) {
			previous.quantity += line.quantity
			previous.rawText = `${previous.rawText}, ${line.rawText}`
			continue
		}
		merged.push({ ...line })
	}
	return merged
}

export function portalCustomerActionNeedsConfirmation(
	request: PortalCustomerToolRequest,
	userMessage: string,
): boolean {
	if (request.confirmedAction) return false
	switch (request.action) {
		case 'support_request': {
			const message = (
				request.supportMessage ||
				request.searchQuery ||
				userMessage
			).trim()
			return Boolean(message && message !== '/feedback')
		}
		case 'delete_draft':
		case 'cleanup_drafts':
		case 'update_draft_metadata':
		case 'draft_replace_item':
			return true
		case 'update_draft_items': {
			const inferred = inferDraftItemEdit(request.searchQuery || userMessage)
			const action = request.draftItemAction ?? inferred?.draftItemAction
			return action === 'clear_items' || action === 'remove_item'
		}
		default:
			return false
	}
}

function extractTargetReference(userMessage: string): string | undefined {
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
		/\b(submit|place|confirm|approve|accept|checkout)\s+(it|this|that|draft)\b/.test(
			lower,
		) ||
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

function isExplicitSupportTicketRequest(
	userMessage: string,
	request: PortalCustomerToolRequest,
): boolean {
	if (request.commandName === '/feedback') return true
	const normalized = normalizeForAgentMatch(userMessage)
	return (
		/\b(send|create|open|submit|file|raise|log)\s+support\b/.test(normalized) ||
		/\bsupport\s+(this|that|it)\b/.test(normalized) ||
		/\b(create|open|submit|send|file|raise|log)\b.*\b(support\s+request|support\s+ticket|ticket|feedback)\b/.test(
			normalized,
		) ||
		/\b(support\s+request|support\s+ticket|ticket|feedback)\b.*\b(create|open|submit|send|file|raise|log)\b/.test(
			normalized,
		) ||
		/\b(support\s+request|support\s+ticket|ticket|feedback)\s*[:-]/.test(
			normalized,
		) ||
		/\breport\s+(an?\s+)?(issue|bug|problem)\b/.test(normalized) ||
		(/تذكرة|تذكره|بلاغ|فيدباك/.test(userMessage) &&
			/افتح|ابعت|ارسل|اعمل|سجل|قدّم|قدم/.test(userMessage))
	)
}

function inferNaturalSupportTicketRequest(
	userMessage: string,
): PortalCustomerToolRequest | null {
	const message = userMessage.trim()
	if (!message || !isNaturalSupportTicketRequest(message)) return null
	return {
		action: 'support_request',
		searchQuery: message,
		supportMessage: message,
		supportSubject: supportSubjectFromText(message),
	}
}

function isNaturalSupportTicketRequest(userMessage: string): boolean {
	const normalized = normalizeForAgentMatch(userMessage)
	const asksSupport =
		/\b(need|want|wanna|would like|please|can you|help me|contact|reach|talk|speak|connect|complain|complaint)\b.*\bsupport\b/.test(
			normalized,
		) ||
		/\bsupport\b.*\b(contact|team|help|please|complaint|complain)\b/.test(
			normalized,
		) ||
		/الدعم|خدمة العملاء|اشتكي|شكوى|مشكلة/.test(userMessage)
	if (!asksSupport) return false

	const neutralContactLookup =
		/^\s*(how|where|what|which)\b.*\b(contact|reach|call|email|phone)\b.*\bsupport\b/.test(
			normalized,
		) || /^\s*support\s+(email|phone|number|contact)\b/.test(normalized)
	if (neutralContactLookup) return false

	const hasIssueDetail =
		/\b(product|products|material|materials|order|quote|delivery|driver|invoice|payment|checkout|price|quality|weak|bad|wrong|broken|damaged|slow|late|missing|failed|error|bug|issue|problem|complaint|not working)\b/.test(
			normalized,
		) ||
		/منتج|مواد|طلب|عرض|توصيل|سعر|جودة|ضعيف|وحش|غلط|مكسور|متأخر|مشكلة|شكوى/.test(
			userMessage,
		)
	return hasIssueDetail || normalized.split(/\s+/).length >= 5
}

function supportSubjectFromText(message: string): string {
	const cleaned =
		cleanCommandText(message.replace(/^\/feedback\s*/i, '')) ??
		'Portal feedback'
	const normalized = normalizeForAgentMatch(cleaned)
	if (
		/\b(product|products|material|materials|quality|weak|bad|damaged|broken|wrong)\b/.test(
			normalized,
		)
	) {
		return 'Product quality issue'
	}
	if (/\b(delivery|driver|late|delayed|missing)\b/.test(normalized)) {
		return 'Delivery issue'
	}
	if (/\b(order|quote|rfq|request|checkout)\b/.test(normalized)) {
		return 'Order support request'
	}
	const subject = cleaned
		.replace(/[.!?].*$/, '')
		.replace(/\s+/g, ' ')
		.trim()
		.slice(0, 80)
	return subject
		? `${subject.charAt(0).toUpperCase()}${subject.slice(1)}`
		: 'Portal feedback'
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

function readDraftLines(value: unknown): PortalDraftMaterialRequestLine[] {
	if (!Array.isArray(value)) return []
	return value.flatMap((line): PortalDraftMaterialRequestLine[] => {
		if (!isRecord(line)) return []
		const query = readDraftLineQuery(line.query)
		const quantity = readPositiveNumber(line.quantity) ?? 0
		if (!query) return []
		const unitHint =
			typeof line.unit_hint === 'string'
				? normalizeUnitHint(line.unit_hint)
				: undefined
		const pendingChoiceId =
			typeof line.pending_choice_id === 'string'
				? line.pending_choice_id.trim().slice(0, 120)
				: undefined
		const productId =
			typeof line.product_id === 'string'
				? line.product_id.trim().slice(0, 80)
				: undefined
		return [
			{
				pendingChoiceId: pendingChoiceId || undefined,
				productId: productId || undefined,
				query,
				quantity,
				rawText: readString(line.raw_text) ?? query,
				unitHint,
			},
		]
	})
}

function readDraftLineQuery(value: unknown): string | null {
	if (typeof value !== 'string') return null
	const cleaned = cleanMaterialLineQuery(value)
	return cleaned && looksLikeMaterialRequest(cleaned) ? cleaned : null
}

function isDraftItemAction(
	value: unknown,
): value is NonNullable<PortalCustomerToolRequest['draftItemAction']> {
	return (
		value === 'set_quantity' ||
		value === 'increase_quantity' ||
		value === 'decrease_quantity' ||
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
	const insteadOf = normalized.match(
		/\b(?:make|set|change|update|edit)\b.{0,120}?\b(\d+(?:\.\d+)?)\b.{0,120}?\binstead\s+of\s+(\d+(?:\.\d+)?)\b/,
	)
	if (insteadOf) {
		const quantity = normalizeQuantity(Number.parseFloat(insteadOf[1] ?? ''))
		const previousQuantity = normalizeQuantity(
			Number.parseFloat(insteadOf[2] ?? ''),
		)
		return quantity ? { previousQuantity, quantity } : null
	}
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

function readString(value: unknown): string | undefined {
	return typeof value === 'string' && value.trim()
		? value.trim().slice(0, 1200)
		: undefined
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
