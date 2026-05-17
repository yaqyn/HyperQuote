export type DriverLanguage = 'en' | 'ar'

export type LocalizedText = Record<DriverLanguage, string>

export type DeliveryStatus =
	| 'available'
	| 'accepted'
	| 'in_transit'
	| 'arrived'
	| 'completed'

export type DriverStatus = 'available' | 'on_delivery' | 'offline'

export interface DriverLocation {
	accuracyMeters?: number
	heading?: number
	latitude: number
	longitude: number
	recordedAt: string
	source: 'browser' | 'native' | 'mock'
	speedKmh?: number
}

export interface DriverProfile {
	id: string
	email: string
	name: LocalizedText
	phone: string
	status: DriverStatus
	vehicle: LocalizedText
	location: DriverLocation
	activeDeliveryId?: string
}

export interface DeliveryContact {
	name: LocalizedText
	phone: string
	role: LocalizedText
}

export interface DeliveryItem {
	id: string
	name: LocalizedText
	quantity: LocalizedText
	notes?: LocalizedText
}

export interface DeliveryPoint {
	address: LocalizedText
	label: LocalizedText
	latitude: number
	longitude: number
}

export interface DriverDelivery {
	id: string
	deliveryNumber: string
	orderName: LocalizedText
	customer: DeliveryContact
	warehouseContact: DeliveryContact
	address: DeliveryPoint
	origin: DeliveryPoint
	items: DeliveryItem[]
	notes: LocalizedText
	scheduledWindow: LocalizedText
	etaMinutes: number
	status: DeliveryStatus
	driverId: string | null
	acceptedAt?: string
	departedAt?: string
	arrivedAt?: string
	completedAt?: string
	proof?: CompletionProof
}

export interface TeamMessage {
	id: string
	authorDriverId: string
	authorName: LocalizedText
	body: LocalizedText
	createdAt: string
}

export interface DriverDashboard {
	activeDelivery: DriverDelivery | null
	completedToday: number
	currentDriver: DriverProfile
	nextDelivery: DriverDelivery | null
	openDeliveries: number
}

export interface CompletionProof {
	capturedAt: string
	location: DriverLocation
	signatureDataUrl: string
	signerName: string
}

export interface DriverRepository {
	acceptDelivery(deliveryId: string, driverId: string): Promise<DriverDelivery>
	completeDelivery(
		deliveryId: string,
		driverId: string,
		proof: CompletionProof,
	): Promise<DriverDelivery>
	getDashboard(driverId: string): Promise<DriverDashboard>
	listActiveDrivers(): Promise<DriverProfile[]>
	listDeliveries(): Promise<DriverDelivery[]>
	listTeamMessages(): Promise<TeamMessage[]>
	recordArrival(deliveryId: string, driverId: string): Promise<DriverDelivery>
	sendTeamMessage(driverId: string, body: string): Promise<TeamMessage>
	startDelivery(deliveryId: string, driverId: string): Promise<DriverDelivery>
	updateLocation(
		driverId: string,
		location: DriverLocation,
	): Promise<DriverProfile>
}

export class DriverRepositoryError extends Error {
	constructor(
		readonly code:
			| 'delivery_not_found'
			| 'driver_not_found'
			| 'delivery_unavailable'
			| 'invalid_transition'
			| 'invalid_proof',
		message: string,
	) {
		super(message)
		this.name = 'DriverRepositoryError'
	}
}

export function isCompletionProofReady(proof: CompletionProof): boolean {
	return (
		proof.signerName.trim().length >= 2 &&
		proof.signatureDataUrl.startsWith('data:image/') &&
		proof.location.latitude !== 0 &&
		proof.location.longitude !== 0 &&
		Number.isFinite(proof.location.latitude) &&
		Number.isFinite(proof.location.longitude) &&
		Date.parse(proof.capturedAt) > 0
	)
}
