/**
 * Delivery tracking server functions.
 * Order detail, GPS tracking, POD confirm/dispute.
 * Dev mode fallback when Supabase not configured.
 */
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type { OrderStatus } from '../../types/order'
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

interface TimelineStep {
	key: string
	label: string
	status: 'completed' | 'current' | 'future'
	timestamp?: string
}

interface DeliveryDocument {
	id: string
	type: 'invoice' | 'delivery_note' | 'quote_pdf' | 'certificate'
	name: string
	url: string
	createdAt: string
}

export interface DeliveryContact {
	id: string
	label: string
	value: string
	href: string
}

interface MapPoint {
	lat: number
	lng: number
}

export interface DeliveryInfo {
	id: string
	driverId: string
	driverName: string
	driverPhone: string
	truckNumber: string
	vehiclePlate: string
	currentStage: DeliveryStage
	estimatedArrival: string
	lastUpdated: string
	hasActivePOD: boolean
	dispatchContacts: DeliveryContact[]
	route: {
		origin: string
		originLocation: MapPoint
		destination: string
		destinationLocation: MapPoint
		driverLocation: MapPoint
		distanceKm: number
	}
}

interface OrderAcceptanceInfo {
	employeeName: string
	employeeRole: string
	acceptedAt: string
	message: string
}

export interface OrderReviewInfo {
	submittedAt: string
	message: string
}

interface OrderPaymentInfo {
	method: string
	bankName: string
	reference: string
	paidAt: string
	paidAmount: number
	reviewedBy: string
	reportLines: string[]
}

interface OrderCompletionInfo {
	deliveredAt: string
	receivedBy: string
	proofOfDelivery: string
	summaryLines: string[]
	message: string
}

interface OrderClosureInfo {
	type: 'cancelled' | 'rejected'
	reason: string
	note: string
	handledBy: string
	handledAt: string
	reachedStage: DeliveryStage
}

export interface OrderDetailResult {
	order: {
		id: string
		reference: string
		status: OrderStatus
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
	review?: OrderReviewInfo
	acceptance?: OrderAcceptanceInfo
	payment?: OrderPaymentInfo
	delivery?: DeliveryInfo
	completion?: OrderCompletionInfo
	closure?: OrderClosureInfo
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

const IMG = 'https://websiteassets.hyperquote.net/Images'
const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR
const LIFECYCLE_STAGES: readonly DeliveryStage[] = [
	'confirmed',
	'being_prepared',
	'out_for_delivery',
	'delivered',
] as const

type OrderLine = OrderDetailResult['order']['items'][number]
type StageTimestamps = Partial<Record<DeliveryStage, string>>

interface DetailSeed {
	id: string
	reference: string
	status: OrderStatus
	description: string
	date: string
	amount: number | null
	items: OrderLine[]
	review?: OrderReviewInfo
	acceptance?: OrderAcceptanceInfo
	payment?: OrderPaymentInfo
	delivery?: DeliveryInfo
	completion?: OrderCompletionInfo
	closure?: OrderClosureInfo
	documents: DeliveryDocument[]
}

function timeFrom(now: Date, offsetMs: number): string {
	return new Date(now.getTime() + offsetMs).toISOString()
}

function makeLine(
	id: string,
	productName: string,
	productNameAr: string,
	quantity: number,
	unitOfMeasure: string,
	unitPrice: number,
	imageUrl: string,
): OrderLine {
	return {
		id,
		productName,
		productNameAr,
		quantity,
		unitOfMeasure,
		unitPrice,
		lineTotal: quantity * unitPrice,
		imageUrl,
	}
}

function stageForStatus(status: OrderStatus): DeliveryStage {
	if (status === 'being_prepared') return 'being_prepared'
	if (status === 'out_for_delivery') return 'out_for_delivery'
	if (status === 'delivered') return 'delivered'
	return 'confirmed'
}

function timelineLabel(
	stage: DeliveryStage | 'cancelled' | 'rejected',
): string {
	if (stage === 'confirmed') return 'Confirmed'
	if (stage === 'being_prepared') return 'Being Prepared'
	if (stage === 'out_for_delivery') return 'Out for Delivery'
	if (stage === 'delivered') return 'Delivered'
	if (stage === 'cancelled') return 'Canceled'
	if (stage === 'rejected') return 'Rejected'
	return 'Invoice Generated'
}

function buildTimeline(seed: DetailSeed): TimelineStep[] {
	if (seed.status === 'submitted') {
		return [
			{
				key: 'submitted',
				label: 'Submitted',
				status: 'current',
				timestamp: seed.review?.submittedAt ?? seed.date,
			},
		]
	}

	if (!seed.acceptance) return []

	const reachedStage = seed.closure?.reachedStage ?? stageForStatus(seed.status)
	const currentIndex = LIFECYCLE_STAGES.indexOf(reachedStage)
	const isTerminal = seed.status === 'cancelled' || seed.status === 'rejected'
	const timestamps: StageTimestamps = {
		confirmed: seed.acceptance.acceptedAt,
		being_prepared: seed.payment?.paidAt,
		out_for_delivery: seed.delivery?.lastUpdated,
		delivered: seed.completion?.deliveredAt,
	}

	const steps: TimelineStep[] = LIFECYCLE_STAGES.map((stage, index) => ({
		key: stage,
		label: timelineLabel(stage),
		status: isTerminal
			? index <= currentIndex
				? 'completed'
				: 'future'
			: index < currentIndex
				? 'completed'
				: index === currentIndex
					? 'current'
					: 'future',
		timestamp: timestamps[stage],
	}))

	if (isTerminal && seed.closure) {
		const terminalKey = seed.closure.type
		steps.push({
			key: terminalKey,
			label: timelineLabel(terminalKey),
			status: 'current',
			timestamp: seed.closure.handledAt,
		})
	}

	return steps
}

function dispatchContacts(): DeliveryContact[] {
	return [
		{
			id: 'dispatch-hotline',
			label: 'Dispatch hotline',
			value: '+20 2 2461 0042',
			href: 'tel:+20224610042',
		},
		{
			id: 'dispatch-whatsapp',
			label: 'WhatsApp',
			value: '+20 101 440 0042',
			href: 'https://wa.me/201014400042',
		},
		{
			id: 'dispatch-email',
			label: 'Dispatch desk',
			value: 'dispatch@hyperquote.io',
			href: 'mailto:dispatch@hyperquote.io',
		},
	]
}

function baseDelivery(
	now: Date,
	stage: Extract<DeliveryStage, 'out_for_delivery' | 'delivered'>,
): DeliveryInfo {
	return {
		id: stage === 'delivered' ? 'del-004' : 'del-003',
		driverId: stage === 'delivered' ? 'DRV-104' : 'DRV-317',
		driverName: stage === 'delivered' ? 'Youssef Samir' : 'Mohamed Ali',
		driverPhone: stage === 'delivered' ? '+201020004104' : '+201098765432',
		truckNumber: stage === 'delivered' ? 'TRK-22' : 'TRK-17',
		vehiclePlate: stage === 'delivered' ? 'د هـ و 7349' : 'أ ب ج 1234',
		currentStage: stage,
		estimatedArrival:
			stage === 'delivered'
				? timeFrom(now, -18 * HOUR)
				: timeFrom(now, 25 * 60 * 1000),
		lastUpdated:
			stage === 'delivered'
				? timeFrom(now, -18 * HOUR)
				: timeFrom(now, -2 * HOUR),
		hasActivePOD: false,
		dispatchContacts: dispatchContacts(),
		route: {
			origin: 'HyperQuote West Cairo Yard',
			originLocation: { lat: 30.0129, lng: 31.0243 },
			destination:
				stage === 'delivered' ? 'Palm Hills Phase 3' : 'Nasr City Site Gate 4',
			destinationLocation:
				stage === 'delivered'
					? { lat: 30.0309, lng: 30.9976 }
					: { lat: 30.0131, lng: 31.2089 },
			driverLocation:
				stage === 'delivered'
					? { lat: 30.0309, lng: 30.9976 }
					: { lat: 30.0444, lng: 31.2357 },
			distanceKm: stage === 'delivered' ? 18 : 31,
		},
	}
}

function buildDetail(seed: DetailSeed): OrderDetailResult {
	return {
		order: {
			id: seed.id,
			reference: seed.reference,
			status: seed.status,
			description: seed.description,
			itemCount: seed.items.length,
			date: seed.date,
			amount: seed.amount,
			currency: 'EGP',
			items: seed.items,
		},
		timeline: buildTimeline(seed),
		documents: seed.documents,
		review: seed.review,
		acceptance: seed.acceptance,
		payment: seed.payment,
		delivery: seed.delivery,
		completion: seed.completion,
		closure: seed.closure,
	}
}

function getMockOrderDetail(orderId: string): OrderDetailResult {
	const now = new Date()
	const cement = makeLine(
		'item-cement',
		'Portland Cement OPC 42.5N',
		'اسمنت بورتلاندي عادي',
		300,
		'bag',
		125,
		`${IMG}/cement.webp`,
	)
	const rebar = makeLine(
		'item-rebar',
		'Steel Rebar 12mm Grade 60',
		'حديد تسليح ١٢مم',
		6,
		'ton',
		19500,
		`${IMG}/steel.webp`,
	)
	const sand = makeLine(
		'item-sand',
		'Washed Sand',
		'رمل مغسول',
		40,
		'm3',
		450,
		`${IMG}/Aggregates.webp`,
	)
	const plywood = makeLine(
		'item-plywood',
		'Plywood 18mm',
		'خشب أبلكاش ١٨مم',
		50,
		'sheet',
		1600,
		`${IMG}/wood.webp`,
	)
	const paint = makeLine(
		'item-paint',
		'Acrylic Paint White 18L',
		'طلاء أكريليك أبيض ١٨ل',
		20,
		'bucket',
		2100,
		`${IMG}/finish.webp`,
	)
	const adhesive = makeLine(
		'item-adhesive',
		'Tile Adhesive 25kg',
		'لاصق بلاط ٢٥كج',
		40,
		'bag',
		850,
		`${IMG}/finish.webp`,
	)
	const bricks = makeLine(
		'item-bricks',
		'Red Clay Brick Standard',
		'طوب أحمر',
		10000,
		'piece',
		4.5,
		`${IMG}/bricks.webp`,
	)
	const mesh = makeLine(
		'item-mesh',
		'Welded Wire Mesh 4mm',
		'شبك حديد ملحوم ٤مم',
		100,
		'sheet',
		260,
		`${IMG}/steel.webp`,
	)
	const pipe = makeLine(
		'item-pipe',
		'PVC Pipe 110mm 6m',
		'ماسورة PVC ١١٠مم',
		100,
		'piece',
		75,
		`${IMG}/steel.webp`,
	)
	const tile = makeLine(
		'item-tile',
		'Ceramic Floor Tile 60x60',
		'بلاط سيراميك ٦٠×٦٠',
		200,
		'sqm',
		120,
		`${IMG}/finish.webp`,
	)
	const gypsum = makeLine(
		'item-gypsum',
		'Gypsum Board 12mm',
		'ألواح جبس بورد ١٢مم',
		80,
		'sheet',
		137.5,
		`${IMG}/finish.webp`,
	)

	const acceptedByMariam: OrderAcceptanceInfo = {
		employeeName: 'Mariam Hassan',
		employeeRole: 'Customer success',
		acceptedAt: timeFrom(now, -10 * HOUR),
		message:
			'We accepted your request and started coordinating suppliers. Lyon kept the order clean so our team can move quickly.',
	}
	const acceptedByOmar: OrderAcceptanceInfo = {
		employeeName: 'Omar Nabil',
		employeeRole: 'Quote operations',
		acceptedAt: timeFrom(now, -30 * HOUR),
		message:
			'Your order is approved. We are holding the quoted quantities while finance confirms payment.',
	}
	const acceptedBySara: OrderAcceptanceInfo = {
		employeeName: 'Sara Ahmed',
		employeeRole: 'Dispatch coordinator',
		acceptedAt: timeFrom(now, -58 * HOUR),
		message:
			'Request accepted and matched with suppliers. Dispatch is keeping the site window in view.',
	}

	const paidByTransfer: OrderPaymentInfo = {
		method: 'Bank transfer',
		bankName: 'CIB',
		reference: 'PAY-2026-0142',
		paidAt: timeFrom(now, -24 * HOUR),
		paidAmount: 156000,
		reviewedBy: 'Nadine Adel',
		reportLines: [
			'Payment matched the accepted quote total.',
			'Supplier holds were converted into purchase commitments.',
			'Warehouse preparation opened for the listed materials.',
		],
	}
	const paidByCredit: OrderPaymentInfo = {
		method: 'Account credit',
		bankName: 'HyperQuote credit desk',
		reference: 'CR-2026-0088',
		paidAt: timeFrom(now, -50 * HOUR),
		paidAmount: 108500,
		reviewedBy: 'Nadine Adel',
		reportLines: [
			'Credit limit check passed.',
			'Material loading report created for dispatch.',
			'Driver assignment released after warehouse sign-off.',
		],
	}
	const paidByReceipt: OrderPaymentInfo = {
		method: 'Bank transfer',
		bankName: 'QNB Alahli',
		reference: 'PAY-2026-0137',
		paidAt: timeFrom(now, -6 * DAY),
		paidAmount: 42500,
		reviewedBy: 'Karim Fawzy',
		reportLines: [
			'Payment cleared against invoice terms.',
			'All items moved through warehouse loading.',
			'Delivery note was reconciled with the customer signature.',
		],
	}

	const details: Record<string, DetailSeed> = {
		'sub-001': {
			id: 'sub-001',
			reference: 'QR-2026-00042',
			status: 'submitted',
			description: 'Portland cement, rebar, sand, steel mesh',
			date: timeFrom(now, -1 * DAY),
			amount: null,
			items: [
				makeLine(
					'item-sub-cement',
					'Portland Cement OPC 42.5N',
					'اسمنت بورتلاندي عادي',
					200,
					'bag',
					0,
					`${IMG}/cement.webp`,
				),
				makeLine(
					'item-sub-rebar',
					'Steel Rebar 12mm Grade 60',
					'حديد تسليح ١٢مم',
					8,
					'ton',
					0,
					`${IMG}/steel.webp`,
				),
				makeLine(
					'item-sub-sand',
					'Washed Sand',
					'رمل مغسول',
					30,
					'm3',
					0,
					`${IMG}/Aggregates.webp`,
				),
				makeLine(
					'item-sub-mesh',
					'Welded Wire Mesh 4mm',
					'شبك حديد ملحوم ٤مم',
					50,
					'sheet',
					0,
					`${IMG}/steel.webp`,
				),
			],
			review: {
				submittedAt: timeFrom(now, -1 * DAY),
				message: 'We are reviewing the order and we will be in touch soon.',
			},
			documents: [],
		},
		'sub-002': {
			id: 'sub-002',
			reference: 'QR-2026-00038',
			status: 'submitted',
			description: 'Washed sand, crushed gravel',
			date: timeFrom(now, -3 * DAY),
			amount: null,
			items: [
				makeLine(
					'item-sub-washed-sand',
					'Washed Sand',
					'رمل مغسول',
					100,
					'm3',
					0,
					`${IMG}/Aggregates.webp`,
				),
				makeLine(
					'item-sub-gravel',
					'Crushed Gravel 20mm',
					'زلط مجروش ٢٠مم',
					60,
					'm3',
					0,
					`${IMG}/Aggregates.webp`,
				),
			],
			review: {
				submittedAt: timeFrom(now, -3 * DAY),
				message: 'We are reviewing the order and we will be in touch soon.',
			},
			documents: [],
		},
		'con-001': {
			id: 'con-001',
			reference: 'QR-2026-00051',
			status: 'order_confirmed',
			description: 'Cement, rebar, washed sand',
			date: timeFrom(now, -10 * HOUR),
			amount: 172500,
			items: [cement, rebar, sand],
			acceptance: acceptedByMariam,
			documents: [
				{
					id: 'doc-quote-51',
					type: 'quote_pdf',
					name: 'Quote QR-2026-00051.pdf',
					url: '/documents/qr-2026-00051.pdf',
					createdAt: timeFrom(now, -10 * HOUR),
				},
			],
		},
		'con-002': {
			id: 'con-002',
			reference: 'QR-2026-00050',
			status: 'being_prepared',
			description: 'Plywood, paint, tile adhesive',
			date: timeFrom(now, -30 * HOUR),
			amount: 156000,
			items: [plywood, paint, adhesive],
			acceptance: acceptedByOmar,
			payment: paidByTransfer,
			documents: [
				{
					id: 'doc-quote-50',
					type: 'quote_pdf',
					name: 'Quote QR-2026-00050.pdf',
					url: '/documents/qr-2026-00050.pdf',
					createdAt: timeFrom(now, -30 * HOUR),
				},
				{
					id: 'doc-payment-50',
					type: 'certificate',
					name: 'Payment receipt PAY-2026-0142.pdf',
					url: '/documents/pay-2026-0142.pdf',
					createdAt: timeFrom(now, -24 * HOUR),
				},
			],
		},
		'con-003': {
			id: 'con-003',
			reference: 'QR-2026-00049',
			status: 'out_for_delivery',
			description: 'Red bricks, steel mesh, cement',
			date: timeFrom(now, -58 * HOUR),
			amount: 108500,
			items: [bricks, mesh, cement],
			acceptance: acceptedBySara,
			payment: paidByCredit,
			delivery: baseDelivery(now, 'out_for_delivery'),
			documents: [
				{
					id: 'doc-quote-49',
					type: 'quote_pdf',
					name: 'Quote QR-2026-00049.pdf',
					url: '/documents/qr-2026-00049.pdf',
					createdAt: timeFrom(now, -58 * HOUR),
				},
				{
					id: 'doc-loading-49',
					type: 'delivery_note',
					name: 'Loading report TRK-17.pdf',
					url: '/documents/loading-trk-17.pdf',
					createdAt: timeFrom(now, -3 * HOUR),
				},
			],
		},
		'con-004': {
			id: 'con-004',
			reference: 'QR-2026-00048',
			status: 'delivered',
			description: 'PVC pipes, ceramic tiles, gypsum board',
			date: timeFrom(now, -7 * DAY),
			amount: 42500,
			items: [pipe, tile, gypsum],
			acceptance: {
				employeeName: 'Mariam Hassan',
				employeeRole: 'Customer success',
				acceptedAt: timeFrom(now, -7 * DAY),
				message:
					'Your materials were accepted, prepared, dispatched, and signed off at the site.',
			},
			payment: paidByReceipt,
			delivery: baseDelivery(now, 'delivered'),
			completion: {
				deliveredAt: timeFrom(now, -18 * HOUR),
				receivedBy: 'Hassan Ali',
				proofOfDelivery: 'POD-2026-0048',
				message:
					'Delivery is complete. The signed proof of delivery and final invoice are ready in documents.',
				summaryLines: [
					'Three order lines delivered in full.',
					'No damaged or missing items were reported at handover.',
					'Final documents are attached for accounting.',
				],
			},
			documents: [
				{
					id: 'doc-quote-48',
					type: 'quote_pdf',
					name: 'Quote QR-2026-00048.pdf',
					url: '/documents/qr-2026-00048.pdf',
					createdAt: timeFrom(now, -7 * DAY),
				},
				{
					id: 'doc-pod-48',
					type: 'delivery_note',
					name: 'Proof of delivery POD-2026-0048.pdf',
					url: '/documents/pod-2026-0048.pdf',
					createdAt: timeFrom(now, -18 * HOUR),
				},
				{
					id: 'doc-invoice-48',
					type: 'invoice',
					name: 'Invoice INV-2026-0048.pdf',
					url: '/documents/inv-2026-0048.pdf',
					createdAt: timeFrom(now, -17 * HOUR),
				},
			],
		},
		'rej-001': {
			id: 'rej-001',
			reference: 'QR-2026-00047',
			status: 'rejected',
			description: 'Special-order marble tiles',
			date: timeFrom(now, -3 * DAY),
			amount: 118000,
			items: [
				makeLine(
					'item-marble',
					'Carrara Marble Tile 60x60',
					'بلاط رخام كرارا ٦٠×٦٠',
					80,
					'sqm',
					1475,
					`${IMG}/finish.webp`,
				),
			],
			acceptance: {
				employeeName: 'Omar Nabil',
				employeeRole: 'Quote operations',
				acceptedAt: timeFrom(now, -3 * DAY),
				message:
					'We reviewed the request and checked supplier coverage before making the final call.',
			},
			closure: {
				type: 'rejected',
				reason:
					'Supplier coverage could not meet the requested delivery window.',
				note: 'No payment was collected. The request is closed with the acceptance notes preserved.',
				handledBy: 'Omar Nabil',
				handledAt: timeFrom(now, -2.5 * DAY),
				reachedStage: 'confirmed',
			},
			documents: [],
		},
		'can-001': {
			id: 'can-001',
			reference: 'QR-2026-00046',
			status: 'cancelled',
			description: 'Blocks and cement',
			date: timeFrom(now, -4 * DAY),
			amount: 37500,
			items: [cement],
			acceptance: {
				employeeName: 'Mariam Hassan',
				employeeRole: 'Customer success',
				acceptedAt: timeFrom(now, -4 * DAY),
				message:
					'We accepted the request and held the quoted cement before the cancellation came in.',
			},
			payment: {
				method: 'Bank transfer',
				bankName: 'CIB',
				reference: 'PAY-2026-0131',
				paidAt: timeFrom(now, -3.5 * DAY),
				paidAmount: 37500,
				reviewedBy: 'Karim Fawzy',
				reportLines: [
					'Payment was accepted before warehouse loading.',
					'Supplier holds were released after cancellation.',
				],
			},
			closure: {
				type: 'cancelled',
				reason: 'Customer requested cancellation before loading.',
				note: 'Refund review is pending with finance. No truck was dispatched.',
				handledBy: 'Mariam Hassan',
				handledAt: timeFrom(now, -3 * DAY),
				reachedStage: 'being_prepared',
			},
			documents: [
				{
					id: 'doc-cancel-payment-46',
					type: 'certificate',
					name: 'Payment receipt PAY-2026-0131.pdf',
					url: '/documents/pay-2026-0131.pdf',
					createdAt: timeFrom(now, -3.5 * DAY),
				},
			],
		},
	}

	const fallback = details['con-003']
	if (!fallback) throw new Error('Missing mock order detail')
	return buildDetail(details[orderId] ?? fallback)
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

		// Mock-backed until order detail reads are wired to Supabase.
		return getMockOrderDetail(input.orderId)
	})

export const confirmDropShipDelivery = createServerFn({ method: 'POST' })
	.inputValidator(confirmDropShipDeliveryInput)
	.handler(async (): Promise<{ success: boolean; invoiceId?: string }> => {
		if (!isSupabaseConfigured()) {
			return { success: true, invoiceId: 'INV-2026-00042' }
		}

		// Mock-backed until drop-ship confirmation writes are wired to Supabase.
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

		// Mock-backed until delivery disputes write POD, ticket, and notification records.
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

		// Mock-backed until POD detail reads are wired to Supabase.
		return getMockPODDetails()
	})
