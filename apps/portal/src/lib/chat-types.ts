/**
 * Chat type system for portal AI chat.
 * Rich message types, slash commands, quick action chips.
 * Rich content is generated from real AI output or Supabase-scoped context.
 */

// ============================================================================
// Rich Content Types — transmitted via AG-UI CUSTOM events
// ============================================================================

export interface ProductCardData {
	id: string
	name: string
	nameAr: string
	image?: string
	priceRange: string
	priceRangeAr: string
	specs: Record<string, string>
	specsAr: Record<string, string>
	available: boolean
}

export interface StatusCardData {
	amount: number | null
	entityType: 'order' | 'quote'
	entityId: string
	displayNumber: string
	items: {
		name: string
		nameAr?: string
		notes?: string
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
	event?: 'open_draft_panel'
	href?: string
	icon?:
		| 'book'
		| 'draft'
		| 'external'
		| 'help'
		| 'mail'
		| 'market'
		| 'orders'
		| 'profile'
		| 'support'
		| 'track'
	label: string
	labelAr: string
	route?: string
	params?: Record<string, string>
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
	driverName: string
	driverPhone: string
	estimatedArrival: string
	lastUpdated: string
	orderNumber: string
	route: {
		origin: string
		destination: string
		distanceKm: number
		driverLocation: { lat: number; lng: number } | null
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
	| { type: 'product_card'; data: ProductCardData }
	| { type: 'status_card'; data: StatusCardData }
	| { type: 'action_button'; data: ActionButtonData }
	| { type: 'material_list'; data: MaterialListData }
	| { type: 'delivery_tracking'; data: DeliveryTrackingData }
	| { type: 'draft_cleanup_result'; data: DraftCleanupResultData }
	| { type: 'disclaimer'; data: DisclaimerData }

export const PORTAL_CHAT_OPEN_DRAFT_EVENT = 'portal:chat-open-draft'

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
