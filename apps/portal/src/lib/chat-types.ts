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

export interface ActionButtonData {
	command?: string
	confirmMessage?: string
	confirmMessageAr?: string
	event?: 'open_cart' | 'open_draft_panel'
	href?: string
	icon?:
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
	label: string
	labelAr: string
	route?: string
	params?: Record<string, string>
	runCommand?: boolean
}

export interface ActiveChatDraftContext {
	id: string | null
	items: {
		productName: string
		productNameAr?: string
		quantity: number
		unitOfMeasure: string
	}[]
	name: string | null
	notes: string
	reference: string | null
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
	items: {
		name: string
		nameAr?: string
		qty: number
		unit: string
		unitAr?: string
	}[]
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
	| { type: 'delivery_tracking'; data: DeliveryTrackingData }
	| { type: 'draft_cleanup_result'; data: DraftCleanupResultData }
	| { type: 'disclaimer'; data: DisclaimerData }

export const PORTAL_CHAT_OPEN_DRAFT_EVENT = 'portal:chat-open-draft'
export const PORTAL_CHAT_RUN_COMMAND_EVENT = 'portal:chat-run-command'

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
