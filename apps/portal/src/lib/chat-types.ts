/**
 * Chat type system for portal AI chat.
 * Rich message types, slash commands, quick action chips.
 * Phase 30 swaps mock data with real AI-generated structured content.
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
	specs: Record<string, string>
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

interface MaterialListData {
	items: { name: string; qty: number; unit: string }[]
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
