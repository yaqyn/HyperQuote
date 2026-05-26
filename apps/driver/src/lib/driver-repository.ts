import { isDeliverySecretCodeReady } from './delivery-secret'

export type DriverLanguage = 'en' | 'ar'

export type LocalizedText = Record<DriverLanguage, string>

export type DeliveryStatus =
	| 'assigned'
	| 'available'
	| 'accepted'
	| 'in_transit'
	| 'arrived'
	| 'completed'
	| 'rejected'

export type DriverStatus = 'available' | 'on_delivery' | 'offline'

export interface DriverLocation {
	accuracyMeters?: number
	heading?: number
	latitude: number
	longitude: number
	recordedAt: string
	source: 'browser' | 'native'
	speedKmh?: number
}

export interface DriverProfile {
	id: string
	email: string
	name: LocalizedText
	onlineStatus?: 'online' | 'offline'
	phone: string
	status: DriverStatus
	vehicle: LocalizedText
	location: DriverLocation | null
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
	latitude: number | null
	longitude: number | null
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
	etaMinutes: number | null
	status: DeliveryStatus
	driverId: string | null
	acceptedAt?: string
	departedAt?: string
	arrivedAt?: string
	completedAt?: string
	proof?: CompletionProof
	rejectionProof?: DeliveryRejectionProof
	rejectionReason?: string
	truckId?: string
	truckPlate?: string
}

export interface TeamMessage {
	id: string
	authorDriverId: string
	authorName: LocalizedText
	body: LocalizedText
	createdAt: string
}

export interface DriverFuelReceipt {
	id: string
	amount?: number
	createdAt: string
	expenseDate: string
	fuelLiters?: number
	odometerKm?: number
	status: 'submitted' | 'posted' | 'rejected' | 'reversed'
	truckId: string
	truckPlate?: string
}

export interface DriverDashboard {
	activeDelivery: DriverDelivery | null
	completedToday: number
	currentDriver: DriverProfile
	nextDelivery: DriverDelivery | null
	openDeliveries: number
}

interface CompletionProof {
	capturedAt: string
	location: DriverLocation
}

export interface CompletionSubmissionProof extends CompletionProof {
	secretCode: string
}

export interface DeliveryRejectionProof {
	capturedAt: string
	evidenceText: string
	location: DriverLocation
	photoDataUrl?: string
	reason: string
}

export interface FuelReceiptSubmission {
	amount?: number
	deliveryId?: string | null
	expenseDate?: string
	fuelLiters?: number
	note?: string
	odometerKm?: number
	receiptFileName: string
	receiptImageDataUrl: string
	receiptMimeType: string
	receiptSizeBytes: number
	truckId?: string | null
}

export interface DriverRepository {
	acceptDelivery(deliveryId: string, driverId: string): Promise<DriverDelivery>
	confirmArrival(
		deliveryId: string,
		driverId: string,
		secretCode: string,
	): Promise<DriverDelivery>
	completeDelivery(
		deliveryId: string,
		driverId: string,
		proof: CompletionSubmissionProof,
	): Promise<DriverDelivery>
	getDashboard(driverId: string): Promise<DriverDashboard>
	listActiveDrivers(): Promise<DriverProfile[]>
	listDeliveries(): Promise<DriverDelivery[]>
	listTeamMessages(): Promise<TeamMessage[]>
	reopenRoute(deliveryId: string, driverId: string): Promise<DriverDelivery>
	sendTeamMessage(driverId: string, body: string): Promise<TeamMessage>
	setOnline(driverId: string, online: boolean): Promise<DriverProfile>
	startDelivery(deliveryId: string, driverId: string): Promise<DriverDelivery>
	submitFuelReceipt(
		driverId: string,
		submission: FuelReceiptSubmission,
	): Promise<DriverFuelReceipt>
	updateLocation(
		driverId: string,
		location: DriverLocation,
		deliveryId?: string | null,
	): Promise<DriverProfile>
}

export class DriverRepositoryError extends Error {
	constructor(
		readonly code:
			| 'delivery_not_found'
			| 'driver_not_found'
			| 'driver_session_replaced'
			| 'delivery_unavailable'
			| 'invalid_transition'
			| 'invalid_proof'
			| 'invalid_secret',
		message: string,
	) {
		super(message)
		this.name = 'DriverRepositoryError'
	}
}

export function isCompletionProofReady(
	proof: CompletionSubmissionProof,
): boolean {
	return (
		proof.location.latitude !== 0 &&
		proof.location.longitude !== 0 &&
		Number.isFinite(proof.location.latitude) &&
		Number.isFinite(proof.location.longitude) &&
		isDeliverySecretCodeReady(proof.secretCode) &&
		Date.parse(proof.capturedAt) > 0
	)
}
