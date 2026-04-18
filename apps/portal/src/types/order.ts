export type OrderType = 'saved' | 'submitted' | 'confirmed'

export type OrderStatus =
	| 'draft'
	| 'submitted'
	| 'quote_ready'
	| 'negotiating'
	| 'accepted'
	| 'order_confirmed'
	| 'being_prepared'
	| 'out_for_delivery'
	| 'delivered'
	| 'expired'
	| 'cancelled'

export interface OrderItem {
	productId: string
	productName: string
	productNameAr: string
	quantity: number
	unitOfMeasure: string
	imageUrl: string
	category: string
}

/** Saved list (quote/order draft saved by a user). */
interface SavedList {
	id: string
	name: string
	items: OrderItem[]
	lastUsedAt: string
}

export interface Order {
	id: string
	type: OrderType
	status?: OrderStatus
	name?: string
	reference?: string
	items: OrderItem[]
	itemCount: number
	description: string
	date: string
	amount: number | null
	currency: 'EGP'
}
