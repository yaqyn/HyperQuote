/**
 * Domain types for the driver app.
 *
 * Mirror the warehouse + dispatch sections of
 * `apps/internal/src/lib/db/seed/order_reports.md`. The driver app reads
 * the same shapes via fetch (Capacitor cannot use TanStack server functions),
 * so keep field names aligned with the server response.
 */

export type CargoClass = 'aggregate' | 'metal' | 'finishes' | 'mixed'

export type OrderStage =
	| 'queued'
	| 'loading'
	| 'sealed'
	| 'in_transit'
	| 'arrived'
	| 'delivered'

export interface LineItem {
	productSlug: string
	productName: string
	productNameAr: string
	quantity: number
	unit: 'pcs' | 'bag' | 'm2' | 'm3' | 'kg' | 'ton'
	weightKg: number
}

export interface ContactCard {
	name: string
	role: string
	phone: string
}

export interface Coords {
	lat: number
	lng: number
}

export interface OrderSummary {
	id: string
	displayId: string
	customerName: string
	customerNameAr: string
	cargoClass: CargoClass
	weightTons: number
	itemCount: number
	stage: OrderStage
	dockBay: string
	loadingProgress: number
	deliveryCity: string
}

export interface ActiveOrder extends OrderSummary {
	contact: ContactCard
	dispatchContact: ContactCard
	deliveryAddress: string
	deliveryAddressAr: string
	deliveryCoords: Coords
	originCoords: Coords
	items: LineItem[]
	notes: string | null
	notesAr: string | null
	totalAmountEgp: number
	estimatedDepartureMinutesFromNow: number
}

export interface DriverSession {
	driverId: string
	driverName: string
	driverNameAr: string
	truckPlate: string
	truckCapacityTons: number
	depot: string
}

export type ThreadId = 'warehouse' | 'fleet' | 'dispatch'

export interface Message {
	id: string
	threadId: ThreadId
	authorId: string
	authorName: string
	body: string
	bodyAr?: string
	minutesAgo: number
	self?: boolean
	system?: boolean
}

export interface MessageThread {
	id: ThreadId
	name: string
	nameAr: string
	subtitle: string
	subtitleAr: string
	online: boolean
	unread: number
}

export interface Telemetry {
	signalStrength: 1 | 2 | 3 | 4
	gpsLocked: boolean
	batteryPct: number
	odometerKm: number
}
