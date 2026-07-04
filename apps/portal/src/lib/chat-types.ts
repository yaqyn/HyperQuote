/**
 * Chat type system for portal AI chat.
 * Rich message types, slash commands, quick action chips.
 * Rich content is generated from real AI output or Supabase-scoped context.
 */

// ============================================================================
// Rich Content Types — transmitted via AG-UI CUSTOM events
// ============================================================================

export interface StatusCardData {
	amount: number | null
	entityType: 'order' | 'quote'
	entityId: string
	displayNumber: string
	items: {
		name: string
		nameAr?: string
		notes?: string
		orderable?: boolean
		productId?: string
		qty: number
		unit: string
		unitAr?: string
	}[]
	linkedOrderId?: string | null
	quoteRequestId: string
	requestReference: string
	status: string
	statusColor: 'green' | 'yellow' | 'red'
	timeline: { label: string; date: string; done: boolean }[]
	type: 'draft' | 'submitted' | 'confirmed'
}

type ActionButtonIcon =
	| 'book'
	| 'cart'
	| 'command'
	| 'draft'
	| 'external'
	| 'help'
	| 'mail'
	| 'market'
	| 'orders'
	| 'phone'
	| 'profile'
	| 'support'
	| 'track'

export interface ActionButtonUnavailableAction {
	href?: string
	icon?: ActionButtonIcon
	label: string
	labelAr: string
	params?: Record<string, string>
	route?: string
}

export interface ActionButtonData {
	action?: PortalConfirmedActionPayload
	command?: string
	confirmMessage?: string
	confirmMessageAr?: string
	event?: 'open_cart' | 'open_draft_panel'
	href?: string
	icon?: ActionButtonIcon
	label: string
	labelAr: string
	route?: string
	params?: Record<string, string>
	runCommand?: boolean
	unavailableMessage?: string
	unavailableMessageAr?: string
	unavailableActions?: ActionButtonUnavailableAction[]
	unavailableTitle?: string
	unavailableTitleAr?: string
}

export interface PortalConfirmedDraftLinePayload {
	pendingChoiceId?: string
	productId?: string
	query: string
	quantity: number
	rawText?: string
	unitHint?: string
}

export interface PortalConfirmedActionPayload {
	action:
		| 'cleanup_drafts'
		| 'create_draft_from_plan'
		| 'delete_draft'
		| 'draft_add_items'
		| 'draft_replace_item'
		| 'support_request'
		| 'update_draft_items'
		| 'update_draft_metadata'
	cleanupMode?: 'delete_all' | 'merge' | 'remove_empty'
	draftItemAction?:
		| 'clear_items'
		| 'remove_item'
		| 'set_item_notes'
		| 'set_quantity'
	draftLines?: PortalConfirmedDraftLinePayload[]
	draftName?: string
	draftNotes?: string
	itemQuery?: string
	previousQuantity?: number
	quantity?: number
	replacementQuery?: string
	searchQuery: string
	supportMessage?: string
	supportSubject?: string
	targetReference?: string
	unavailableQueries?: string[]
}

export interface ActiveChatDraftContext {
	dirty: boolean
	id: string | null
	items: {
		lineId: string
		orderable: boolean
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

export interface ChatTempDraftData {
	items: {
		availabilityStatus?: string
		category: string
		imageUrl: string
		productId: string
		productName: string
		productNameAr: string
		quantity: number
		unitOfMeasure: string
		unitOfMeasureAr: string
	}[]
	name: string
	notes: string
	sessionKey: string
}

export interface CommandPaletteData {
	description: string
	groups: {
		commands: {
			command: string
			description: string
			inputMode: 'prefill' | 'run'
			scope: 'local' | 'server'
			title: string
		}[]
		title: string
	}[]
	title: string
}

export interface SupportOptionsData {
	description: string
	options: {
		action: ActionButtonData
		description: string
		title: string
	}[]
	title: string
}

export interface MaterialListData {
	draftId?: string
	editRoute?: string
	reference?: string
	tempDraft?: ChatTempDraftData
	items: {
		name: string
		nameAr?: string
		orderable?: boolean
		productId?: string
		qty: number
		unit: string
		unitAr?: string
	}[]
}

export interface ProductChoiceListData {
	description: string
	groups: {
		options: {
			action: ActionButtonData
			category: string
			name: string
			nameAr?: string
			priceRange: string
			productId: string
			subcategory?: string
			unit: string
			unitAr?: string
		}[]
		pendingChoiceId: string
		query: string
		quantity: number
		title: string
	}[]
	title: string
}

export interface DeliveryTrackingData {
	deliveryNumber: string
	destinationPlace: string | null
	driverName: string
	driverPhone: string
	driverPlace: string
	estimatedArrival: string | null
	lastUpdated: string
	orderNumber: string
	route: {
		destination: string | null
		distanceKm: number
	}
	stage: string
	truckNumber: string
	vehiclePlate: string
}

export interface DraftCleanupResultData {
	deleted: string[]
	kept: string[]
	merged: string[]
	reference?: string
	renamed: Array<{ from: string; to: string }>
}

interface DisclaimerData {
	textEn: string
	textAr: string
}

export type RichContent =
	| { type: 'status_card'; data: StatusCardData }
	| { type: 'action_button'; data: ActionButtonData }
	| { type: 'command_palette'; data: CommandPaletteData }
	| { type: 'support_options'; data: SupportOptionsData }
	| { type: 'material_list'; data: MaterialListData }
	| { type: 'product_choice_list'; data: ProductChoiceListData }
	| { type: 'delivery_tracking'; data: DeliveryTrackingData }
	| { type: 'draft_cleanup_result'; data: DraftCleanupResultData }
	| { type: 'disclaimer'; data: DisclaimerData }

export const PORTAL_CHAT_OPEN_DRAFT_EVENT = 'portal:chat-open-draft'
export const PORTAL_CHAT_RUN_COMMAND_EVENT = 'portal:chat-run-command'
export const PORTAL_CHAT_CLEAR_DRAFT_THREADS_EVENT =
	'portal:chat-clear-draft-threads'

export interface PortalChatOpenDraftEventDetail {
	draftId?: string
	tempDraft?: ChatTempDraftData
}

export interface PortalChatClearDraftThreadsEventDetail {
	sessionKeys: string[]
}

// ============================================================================
// Chat Message Types
// ============================================================================

export interface ChatMessage {
	id: string
	role: 'user' | 'assistant'
	content: string
	richContent?: RichContent[]
	timestamp: number
}
