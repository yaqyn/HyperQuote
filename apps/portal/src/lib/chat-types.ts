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
	entityType: 'order' | 'quote'
	entityId: string
	displayNumber: string
	status: string
	statusColor: 'green' | 'yellow' | 'red'
	timeline: { label: string; date: string; done: boolean }[]
}

export interface ActionButtonData {
	label: string
	labelAr: string
	route: string
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

interface DisclaimerData {
	textEn: string
	textAr: string
}

export type RichContent =
	| { type: 'product_card'; data: ProductCardData }
	| { type: 'status_card'; data: StatusCardData }
	| { type: 'action_button'; data: ActionButtonData }
	| { type: 'material_list'; data: MaterialListData }
	| { type: 'disclaimer'; data: DisclaimerData }

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
