export type OrderType = 'saved' | 'submitted' | 'confirmed'

type OrderDraftSource = 'customer' | 'lyon'

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
	| 'rejected'

export interface OrderItem {
	productId: string
	productName: string
	productNameAr: string
	quantity: number
	unitOfMeasure: string
	unitOfMeasureAr: string
	imageUrl: string
	category: string
}

export type OrderDeliveryStatus =
	| 'assigned'
	| 'accepted'
	| 'in_transit'
	| 'arrived'
	| 'completed'
	| 'rejected'

type OrderDeliveryStage =
	| 'confirmed'
	| 'being_prepared'
	| 'out_for_delivery'
	| 'delivered'
	| 'invoice_generated'

interface OrderDeliveryMapPoint {
	lat: number
	lng: number
}

export interface OrderDeliveryTracking {
	id: string
	orderId: string
	orderNumber: string
	deliveryNumber: string
	deliveryStatus: OrderDeliveryStatus
	driverId: string
	driverName: string
	driverPhone: string
	currentStage: OrderDeliveryStage
	estimatedArrival: string
	lastUpdated: string
	route: {
		origin: string
		originLocation: OrderDeliveryMapPoint | null
		destination: string
		destinationLocation: OrderDeliveryMapPoint | null
		driverLocation: OrderDeliveryMapPoint | null
		distanceKm: number
	}
	truckNumber: string
	vehiclePlate: string
}

export interface Order {
	id: string
	linkedOrderId?: string
	type: OrderType
	draftSource?: OrderDraftSource
	status?: OrderStatus
	delivery?: OrderDeliveryTracking
	name?: string
	reference?: string
	items: OrderItem[]
	itemCount: number
	description: string
	date: string
	amount: number | null
	currency: 'EGP'
}
