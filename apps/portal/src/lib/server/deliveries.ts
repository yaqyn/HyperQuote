/**
 * Delivery tracking server functions.
 * Order detail, GPS tracking, POD confirm/dispute.
 * Dev mode fallback when Supabase not configured.
 */
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { isSupabaseConfigured } from './_supabase'

// ============================================================================
// Types
// ============================================================================

export type DeliveryStage =
	| 'confirmed'
	| 'being_prepared'
	| 'out_for_delivery'
	| 'delivered'
	| 'invoice_generated'

export interface TimelineStep {
	key: string
	label: string
	status: 'completed' | 'current' | 'future'
	timestamp?: string
}

export interface DeliveryDocument {
	id: string
	type: 'invoice' | 'delivery_note' | 'quote_pdf' | 'certificate'
	name: string
	url: string
	createdAt: string
}

export interface DeliveryInfo {
	id: string
	driverName: string
	driverPhone: string
	vehiclePlate: string
	currentStage: DeliveryStage
	estimatedArrival: string
	lastUpdated: string
	hasActivePOD: boolean
}

export interface OrderDetailResult {
	order: {
		id: string
		reference: string
		status: string
		description: string
		itemCount: number
		date: string
		amount: number | null
		currency: 'EGP'
		items: Array<{
			id: string
			productName: string
			productNameAr: string
			quantity: number
			unitOfMeasure: string
			unitPrice: number
			lineTotal: number
			imageUrl: string
		}>
	}
	timeline: TimelineStep[]
	documents: DeliveryDocument[]
	delivery?: DeliveryInfo
}

export interface DeliveryTrackingResult {
	driverLocation: { lat: number; lng: number }
	routePolyline: [number, number][]
	destination: { lat: number; lng: number }
	eta: string
	lastUpdated: string
}

export interface PODDetails {
	photos: string[]
	deadline: string
	status: 'pending' | 'confirmed' | 'disputed' | 'auto_confirmed'
	autoConfirmDeadline: string
}

// ============================================================================
// Mock data for dev mode
// ============================================================================

function getMockOrderDetail(orderId: string): OrderDetailResult {
	const now = new Date()

	const timeline: TimelineStep[] = [
		{
			key: 'confirmed',
			label: 'Confirmed',
			status: 'completed',
			timestamp: new Date(
				now.getTime() - 5 * 24 * 60 * 60 * 1000,
			).toISOString(),
		},
		{
			key: 'being_prepared',
			label: 'Being Prepared',
			status: 'completed',
			timestamp: new Date(
				now.getTime() - 3 * 24 * 60 * 60 * 1000,
			).toISOString(),
		},
		{
			key: 'out_for_delivery',
			label: 'Out for Delivery',
			status: 'current',
			timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
		},
		{
			key: 'delivered',
			label: 'Delivered',
			status: 'future',
		},
		{
			key: 'invoice_generated',
			label: 'Invoice Generated',
			status: 'future',
		},
	]

	return {
		order: {
			id: orderId,
			reference: 'ORD-2026-00042',
			status: 'out_for_delivery',
			description: 'Portland Cement 50kg, Rebar 12mm, Washed Sand',
			itemCount: 3,
			date: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
			amount: 245000,
			currency: 'EGP',
			items: [
				{
					id: 'item-001',
					productName: 'Portland Cement 50kg',
					productNameAr: 'اسمنت بورتلاندي ٥٠ كجم',
					quantity: 500,
					unitOfMeasure: 'bag',
					unitPrice: 85.0,
					lineTotal: 42500.0,
					imageUrl: 'https://websiteassets.hyperquote.net/Images/cement.webp',
				},
				{
					id: 'item-002',
					productName: 'Rebar 12mm',
					productNameAr: 'حديد تسليح ١٢ مم',
					quantity: 10,
					unitOfMeasure: 'ton',
					unitPrice: 32500.0,
					lineTotal: 325000.0,
					imageUrl: 'https://websiteassets.hyperquote.net/Images/steel.webp',
				},
				{
					id: 'item-003',
					productName: 'Washed Sand',
					productNameAr: 'رمل مغسول',
					quantity: 50,
					unitOfMeasure: 'cubic_meter',
					unitPrice: 450.0,
					lineTotal: 22500.0,
					imageUrl:
						'https://websiteassets.hyperquote.net/Images/Aggregates.webp',
				},
			],
		},
		timeline,
		documents: [
			{
				id: 'doc-001',
				type: 'quote_pdf',
				name: 'Quote QT-2026-00142.pdf',
				url: '/documents/qt-2026-00142.pdf',
				createdAt: new Date(
					now.getTime() - 7 * 24 * 60 * 60 * 1000,
				).toISOString(),
			},
		],
		delivery: {
			id: 'del-001',
			driverName: 'Mohamed Ali',
			driverPhone: '+201098765432',
			vehiclePlate: '\u0623 \u0628 \u062c 1234',
			currentStage: 'out_for_delivery',
			estimatedArrival: new Date(now.getTime() + 25 * 60 * 1000).toISOString(),
			lastUpdated: new Date(now.getTime() - 2 * 60 * 1000).toISOString(),
			hasActivePOD: false,
		},
	}
}

function getMockDeliveryTracking(): DeliveryTrackingResult {
	const now = new Date()
	// Cairo area coordinates
	const driverLat = 30.0444
	const driverLng = 31.2357
	const destLat = 30.0131
	const destLng = 31.2089

	return {
		driverLocation: { lat: driverLat, lng: driverLng },
		routePolyline: [
			[driverLng, driverLat],
			[31.23, 30.038],
			[31.22, 30.028],
			[31.215, 30.02],
			[destLng, destLat],
		],
		destination: { lat: destLat, lng: destLng },
		eta: '25 min',
		lastUpdated: new Date(now.getTime() - 2 * 60 * 1000).toISOString(),
	}
}

function getMockPODDetails(): PODDetails {
	const now = new Date()
	const deadline = new Date(now.getTime() + 48 * 60 * 60 * 1000)

	return {
		photos: [
			'https://cdn.hyperquote.net/pod/sample-1.jpg',
			'https://cdn.hyperquote.net/pod/sample-2.jpg',
			'https://cdn.hyperquote.net/pod/sample-3.jpg',
		],
		deadline: deadline.toISOString(),
		status: 'pending',
		autoConfirmDeadline: deadline.toISOString(),
	}
}

// ============================================================================
// Input Schemas
// ============================================================================

const getOrderDetailInput = z.object({
	orderId: z.string(),
})

const getDeliveryTrackingInput = z.object({
	deliveryId: z.string(),
})

const confirmDropShipDeliveryInput = z.object({
	deliveryId: z.string(),
})

const disputeDropShipDeliveryInput = z.object({
	deliveryId: z.string(),
	reason: z.string(),
	photoUrls: z.array(z.string()).optional(),
})

const getPODDetailsInput = z.object({
	deliveryId: z.string(),
})

// ============================================================================
// getOrderDetail
// ============================================================================

export const getOrderDetail = createServerFn({ method: 'GET' })
	.inputValidator(getOrderDetailInput)
	.handler(async ({ data: input }): Promise<OrderDetailResult> => {
		if (!isSupabaseConfigured()) {
			return getMockOrderDetail(input.orderId)
		}

		// TODO: Real Supabase query
		return getMockOrderDetail(input.orderId)
	})

// ============================================================================
// getDeliveryTracking
// ============================================================================

export const getDeliveryTracking = createServerFn({ method: 'GET' })
	.inputValidator(getDeliveryTrackingInput)
	.handler(async (): Promise<DeliveryTrackingResult> => {
		if (!isSupabaseConfigured()) {
			return getMockDeliveryTracking()
		}

		// TODO: Real Supabase query
		return getMockDeliveryTracking()
	})

// ============================================================================
// confirmDropShipDelivery
// ============================================================================

export const confirmDropShipDelivery = createServerFn({ method: 'POST' })
	.inputValidator(confirmDropShipDeliveryInput)
	.handler(async (): Promise<{ success: boolean; invoiceId?: string }> => {
		if (!isSupabaseConfigured()) {
			return { success: true, invoiceId: 'INV-2026-00042' }
		}

		// TODO: Real Supabase query -- update drop_ship_pod, transition delivery, trigger invoice
		return { success: true, invoiceId: 'INV-2026-00042' }
	})

// ============================================================================
// disputeDropShipDelivery
// ============================================================================

export const disputeDropShipDelivery = createServerFn({ method: 'POST' })
	.inputValidator(disputeDropShipDeliveryInput)
	.handler(async (): Promise<{ success: boolean; ticketId: string }> => {
		if (!isSupabaseConfigured()) {
			return { success: true, ticketId: 'TKT-2026-00015' }
		}

		// TODO: Real Supabase query -- update drop_ship_pod, create support ticket, notify ops
		return { success: true, ticketId: 'TKT-2026-00015' }
	})

// ============================================================================
// getPODDetails
// ============================================================================

export const getPODDetails = createServerFn({ method: 'GET' })
	.inputValidator(getPODDetailsInput)
	.handler(async (): Promise<PODDetails> => {
		if (!isSupabaseConfigured()) {
			return getMockPODDetails()
		}

		// TODO: Real Supabase query
		return getMockPODDetails()
	})
