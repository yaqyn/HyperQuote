/**
 * Delivery tracking server functions backed by Supabase.
 */
import type {
	LifecycleOrderReport,
	OrderReportFact,
	OrderReportStageId,
	OrderReportStep,
} from '@hyperquote/types'
import { createServerFn } from '@tanstack/react-start'
import QRCode from 'qrcode'
import { z } from 'zod'
import type { OrderDeliveryStatus, OrderStatus } from '../../types/order'
import { getAuthenticatedPortalCustomer } from './_supabase'
import { resolveDriverPlaceName } from './driver-location-place'
import {
	firstRelation,
	imageUrlForProduct,
	loadCategoryImageMap,
	mapOrderStatus,
} from './order-utils'

type DeliveryStage =
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

interface DeliveryContact {
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
	orderId: string
	orderNumber: string
	deliveryNumber: string
	deliveryStatus: OrderDeliveryStatus
	driverId: string
	driverName: string
	driverPhone: string
	driverPlace: string | null
	truckNumber: string
	vehiclePlate: string
	orderStatus: string
	currentStage: DeliveryStage
	estimatedArrival: string | null
	lastUpdated: string
	hasActivePOD: boolean
	dispatchContacts: DeliveryContact[]
	route: {
		origin: string
		originLocation: MapPoint | null
		destination: string
		destinationLocation: MapPoint | null
		driverLocation: MapPoint | null
		distanceKm: number
	}
}

export interface DeliverySecret {
	code: string
	payload: string
	qrCodeDataUrl: string
}

interface OrderAcceptanceInfo {
	employeeName: string
	employeeRole: string
	acceptedAt: string
	message: string
}

interface OrderReviewInfo {
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
			unitOfMeasureAr: string
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
	report: LifecycleOrderReport
}

const getOrderDetailInput = z.object({ orderId: z.string().uuid() })
const getDeliverySecretInput = z.object({ orderId: z.string().uuid() })

const mapPointSchema = z.object({
	lat: z.number(),
	lng: z.number(),
})

const deliveryInfoSchema = z.object({
	currentStage: z.enum([
		'confirmed',
		'being_prepared',
		'out_for_delivery',
		'delivered',
		'invoice_generated',
	]),
	deliveryStatus: z.enum([
		'assigned',
		'accepted',
		'in_transit',
		'arrived',
		'completed',
		'rejected',
	]),
	deliveryNumber: z.string(),
	dispatchContacts: z.array(
		z.object({
			href: z.string(),
			id: z.string(),
			label: z.string(),
			value: z.string(),
		}),
	),
	driverId: z.string(),
	driverName: z.string(),
	driverPhone: z.string(),
	driverPlace: z.string().nullable().optional(),
	estimatedArrival: z.string().nullable(),
	hasActivePOD: z.boolean(),
	id: z.string(),
	lastUpdated: z.string(),
	orderStatus: z.string(),
	orderId: z.string(),
	orderNumber: z.string(),
	route: z.object({
		destination: z.string(),
		destinationLocation: mapPointSchema.nullable(),
		distanceKm: z.coerce.number(),
		driverLocation: mapPointSchema.nullable(),
		origin: z.string(),
		originLocation: mapPointSchema.nullable(),
	}),
	truckNumber: z.string(),
	vehiclePlate: z.string(),
})

const deliverySecretSchema = z.object({
	code: z.string().regex(/^[2-9A-HJ-NP-Z]{8}$/),
	payload: z.string().min(1),
})

interface OrderRow {
	id: string
	order_number: string
	status: string
	total_amount: number | null
	created_at: string
	delivered_at: string | null
	quote_request_id: string | null
	updated_at?: string | null
}

interface ProductRow {
	id: string
	name: string
	name_ar: string | null
	category: string
	image_urls: string[] | null
}

interface QuoteRequestItemRow {
	id: string
	product_id: string | null
	customer_description: string
	product_name_ar: string
	quantity: number
	unit_of_measure: string
	unit_of_measure_ar: string
	sort_order: number
	products: ProductRow | ProductRow[] | null
}

interface QuoteRequestDetailRow {
	id: string
	request_number: string
	status: string
	urgency: string
	created_at: string
	submitted_at: string | null
	delivery_date: string | null
	notes: string | null
	attachment_urls: string[] | null
	rejected_reason: string | null
	customer_addresses: PortalAddressRow | PortalAddressRow[] | null
	projects: PortalProjectRow | PortalProjectRow[] | null
	quote_request_items: QuoteRequestItemRow[] | null
	orders: OrderRow | OrderRow[] | null
}

interface PortalProjectRow {
	name: string
}

interface PortalAddressRow {
	label: string | null
	street: string
	area: string | null
	city: string
	governorate: string
	landmark: string | null
}

interface DocumentRow {
	id: string
	type: DeliveryDocument['type']
	title: string
	download_url: string | null
	created_at: string
}

interface SalesQuoteVersionRow {
	id: string
	version_number: number
	status: string
	subtotal: number
	tax_amount: number
	delivery_fee: number
	discount_amount: number
	total: number
	notes: string | null
	created_at: string
}

interface InventoryReservationRow {
	id: string
	quantity: number
	status: string
	created_at: string
	updated_at: string
	products: ProductRow | ProductRow[] | null
}

interface LoadingTaskRow {
	id: string
	status: string
	proof: unknown
	rejection_reason: string | null
	created_at: string
	updated_at: string
}

interface CustomerPaymentRow {
	id: string
	amount: number
	payment_fraction: number
	proof_path: string
	status: string
	created_at: string
}

function categorySlugsFromQuoteRequestItems(
	items: QuoteRequestItemRow[] | null,
): string[] {
	const slugs = new Set<string>()
	for (const item of items ?? []) {
		const product = firstRelation(item.products)
		if (product?.category) slugs.add(product.category)
	}
	return [...slugs]
}

function stageFromStatus(status: string): DeliveryStage {
	if (status === 'delivered') return 'delivered'
	if (status === 'dispatch_assigned' || status === 'out_for_delivery') {
		return 'out_for_delivery'
	}
	if (
		status === 'being_prepared' ||
		status === 'inventory_reserved' ||
		status === 'warehouse_loading' ||
		status === 'dispatch_ready'
	) {
		return 'being_prepared'
	}
	return 'confirmed'
}

export function getEffectiveOrderStatus(
	fallbackStatus: OrderStatus,
	delivery?: Pick<DeliveryInfo, 'currentStage'>,
): OrderStatus {
	if (
		fallbackStatus === 'cancelled' ||
		fallbackStatus === 'rejected' ||
		fallbackStatus === 'expired'
	) {
		return fallbackStatus
	}
	if (!delivery) return fallbackStatus
	if (delivery.currentStage === 'delivered') return 'delivered'
	if (delivery.currentStage === 'out_for_delivery') return 'out_for_delivery'
	if (delivery.currentStage === 'being_prepared') return 'being_prepared'
	return fallbackStatus
}

export async function getCustomerDeliveryTracking(
	supabase: Awaited<
		ReturnType<typeof getAuthenticatedPortalCustomer>
	>['supabase'],
	orderId: string | null | undefined,
): Promise<DeliveryInfo | undefined> {
	if (!orderId) return undefined

	const { data, error } = await supabase.rpc(
		'customer_order_delivery_tracking',
		{ p_order_id: orderId },
	)
	if (error) throw new Error(error.message)
	if (!data) return undefined

	const delivery = deliveryInfoSchema.parse(data)
	return {
		...delivery,
		driverPlace: await resolveDriverPlaceName(
			supabase,
			delivery.route.driverLocation,
		),
	}
}

function timelineFor(
	order: OrderRow,
	statusOverride?: OrderStatus,
): TimelineStep[] {
	const stage = stageFromStatus(statusOverride ?? order.status)
	const orderDate = order.created_at
	const deliveredAt = order.delivered_at ?? undefined
	const steps: Array<{
		key: DeliveryStage
		label: string
		timestamp?: string
	}> = [
		{ key: 'confirmed', label: 'Confirmed', timestamp: orderDate },
		{ key: 'being_prepared', label: 'Being prepared' },
		{ key: 'out_for_delivery', label: 'Out for delivery' },
		{ key: 'delivered', label: 'Delivered', timestamp: deliveredAt },
		{ key: 'invoice_generated', label: 'Invoice generated' },
	]
	const currentIndex = steps.findIndex((step) => step.key === stage)
	return steps.map((step, index) => ({
		key: step.key,
		label: step.label,
		status:
			index < currentIndex
				? 'completed'
				: index === currentIndex
					? 'current'
					: 'future',
		timestamp: step.timestamp,
	}))
}

function mapQuoteRequestItems(
	itemRows: QuoteRequestItemRow[] | null,
	categoryImages: Map<string, string>,
): OrderDetailResult['order']['items'] {
	return ((itemRows ?? []) as unknown as QuoteRequestItemRow[])
		.slice()
		.sort((a, b) => a.sort_order - b.sort_order)
		.map((item) => {
			const product = firstRelation(item.products)
			const name = item.customer_description || product?.name || item.id
			return {
				id: item.id,
				productName: name,
				productNameAr: item.product_name_ar || product?.name_ar || name,
				quantity: item.quantity,
				unitOfMeasure: item.unit_of_measure,
				unitOfMeasureAr: item.unit_of_measure_ar || item.unit_of_measure,
				unitPrice: 0,
				lineTotal: 0,
				imageUrl: imageUrlForProduct(product, categoryImages),
			}
		})
}

function formatPortalAddress(address: PortalAddressRow | null): string | null {
	if (!address) return null
	return [
		address.label,
		address.street,
		address.area,
		address.city,
		address.governorate,
		address.landmark,
	]
		.map((value) => value?.trim())
		.filter(Boolean)
		.join(', ')
}

function reportFact(
	label: string,
	value: string | number | null | undefined,
): OrderReportFact | null {
	if (value === null || value === undefined || value === '') return null
	return { label, value: String(value) }
}

function reportFacts(values: Array<OrderReportFact | null>): OrderReportFact[] {
	return values.filter((fact): fact is OrderReportFact => fact !== null)
}

function reportStep({
	facts,
	lines = [],
	...step
}: Omit<OrderReportStep, 'facts' | 'lines'> & {
	facts: Array<OrderReportFact | null>
	lines?: string[]
}): OrderReportStep {
	return {
		...step,
		facts: reportFacts(facts),
		lines: lines.filter((line) => line.trim().length > 0),
	}
}

function orderReportStopReason(
	quoteRequest: QuoteRequestDetailRow | null,
	order: OrderRow | null | undefined,
): string | null {
	if (
		quoteRequest &&
		['rejected', 'declined', 'canceled', 'cancelled', 'expired'].includes(
			quoteRequest.status,
		)
	) {
		return quoteRequest.rejected_reason ?? quoteRequest.status
	}
	if (order && ['rejected', 'canceled', 'cancelled'].includes(order.status)) {
		return order.status
	}
	return null
}

function stepSortValue(step: OrderReportStep): number {
	if (!step.timestamp) return Number.MAX_SAFE_INTEGER
	return new Date(step.timestamp).getTime()
}

function stageForPortalReport({
	delivery,
	hasDelivered,
	hasProcessing,
	linkedOrder,
	payments,
	stopped,
}: {
	delivery?: DeliveryInfo
	hasDelivered: boolean
	hasProcessing: boolean
	linkedOrder: OrderRow | null | undefined
	payments: CustomerPaymentRow[]
	stopped: boolean
}): OrderReportStageId {
	if (stopped) return 'stopped'
	if (hasDelivered) return 'delivery'
	if (delivery) return 'dispatch'
	if (hasProcessing) return 'warehouse'
	if (payments.length > 0) return 'finance'
	if (linkedOrder) return 'sales'
	return 'submitted'
}

function pendingPortalStages(
	currentStage: OrderReportStageId,
	stopped: boolean,
): OrderReportStageId[] {
	if (stopped || currentStage === 'delivery') return []
	const order: OrderReportStageId[] = [
		'sales',
		'finance',
		'inventory',
		'warehouse',
		'dispatch',
		'delivery',
	]
	const currentIndex = order.indexOf(currentStage)
	return currentIndex === -1 ? order : order.slice(currentIndex + 1)
}

function buildOrderReport({
	delivery,
	documents,
	items,
	loadingTask,
	order,
	payments,
	quoteRequest,
	reservations,
	versions,
}: {
	delivery?: DeliveryInfo
	documents: DeliveryDocument[]
	items: OrderDetailResult['order']['items']
	loadingTask: LoadingTaskRow | null
	order: OrderDetailResult['order']
	payments: CustomerPaymentRow[]
	quoteRequest: QuoteRequestDetailRow | null
	reservations: InventoryReservationRow[]
	versions: SalesQuoteVersionRow[]
}): LifecycleOrderReport {
	const linkedOrder = quoteRequest ? firstRelation(quoteRequest.orders) : null
	const latestVersion = versions[0] ?? null
	const address = quoteRequest
		? formatPortalAddress(firstRelation(quoteRequest.customer_addresses))
		: null
	const project = quoteRequest ? firstRelation(quoteRequest.projects) : null
	const stopReason = orderReportStopReason(quoteRequest, linkedOrder)
	const stopped = stopReason !== null
	const hasProcessing =
		reservations.length > 0 || loadingTask !== null || Boolean(linkedOrder)
	const hasDelivered =
		order.status === 'delivered' ||
		Boolean(linkedOrder?.delivered_at) ||
		delivery?.currentStage === 'delivered'
	const submissionLines = items.map(
		(item) =>
			`${item.productName}: ${item.quantity.toLocaleString('en-EG')} ${
				item.unitOfMeasure
			}`,
	)
	const processingLines = [
		...reservations.map((reservation) => {
			const product = firstRelation(reservation.products)
			return `${product?.name ?? 'Product'}: ${reservation.quantity.toLocaleString(
				'en-EG',
			)} reserved (${reservation.status})`
		}),
		loadingTask
			? `Warehouse loading task is ${loadingTask.status.replaceAll('_', ' ')}`
			: '',
	]
	const steps: OrderReportStep[] = [
		reportStep({
			actor: null,
			advisor: null,
			facts: [
				reportFact(
					'Submitted at',
					quoteRequest?.submitted_at ?? quoteRequest?.created_at ?? order.date,
				),
				reportFact(
					'Reference',
					quoteRequest?.request_number ?? order.reference,
				),
				reportFact('Urgency', quoteRequest?.urgency),
				reportFact('Project', project?.name),
				reportFact('Delivery date', quoteRequest?.delivery_date),
				reportFact('Delivery address', address),
				reportFact('Attachments', quoteRequest?.attachment_urls?.length ?? 0),
				reportFact('Documents', documents.length),
			],
			id: `submitted-${quoteRequest?.id ?? order.id}`,
			lines: [
				quoteRequest?.notes ? `Customer note: ${quoteRequest.notes}` : '',
				...submissionLines,
			],
			specialCase: null,
			stage: 'submitted',
			status: 'completed',
			summary: 'Original customer submission and requested materials.',
			timestamp:
				quoteRequest?.submitted_at ?? quoteRequest?.created_at ?? order.date,
			title: 'Order submitted',
		}),
	]
	if (latestVersion || linkedOrder) {
		steps.push(
			reportStep({
				actor: null,
				advisor: null,
				facts: [
					reportFact(
						'Order number',
						linkedOrder?.order_number ?? order.reference,
					),
					reportFact('Order status', linkedOrder?.status ?? order.status),
					reportFact('Quote version', latestVersion?.version_number),
					reportFact('Quote status', latestVersion?.status),
					reportFact('Subtotal', latestVersion?.subtotal),
					reportFact('VAT', latestVersion?.tax_amount),
					reportFact('Delivery fee', latestVersion?.delivery_fee),
					reportFact('Discount', latestVersion?.discount_amount),
					reportFact('Total', latestVersion?.total ?? order.amount),
				],
				id: `sales-${latestVersion?.id ?? linkedOrder?.id ?? order.id}`,
				lines: [],
				specialCase: null,
				stage: 'sales',
				status: 'completed',
				summary: 'Evaluation and confirmed commercial record.',
				timestamp: latestVersion?.created_at ?? linkedOrder?.created_at ?? null,
				title: 'Order confirmed',
			}),
		)
	}
	for (const payment of payments) {
		const paidThroughThisPayment = payments
			.filter((row) => row.created_at <= payment.created_at)
			.reduce((sum, row) => sum + row.amount, 0)
		const finalPayment =
			payments.length > 1 &&
			order.amount !== null &&
			paidThroughThisPayment >= order.amount
		steps.push(
			reportStep({
				actor: null,
				advisor: null,
				facts: [
					reportFact(
						'Payment fraction',
						payment.payment_fraction === 0.5 ? '50%' : '100%',
					),
					reportFact('Amount', payment.amount),
					reportFact('Status', payment.status),
					reportFact(
						'Remaining',
						order.amount !== null
							? Math.max(0, order.amount - paidThroughThisPayment)
							: null,
					),
				],
				id: `payment-${payment.id}`,
				lines: [],
				specialCase: finalPayment
					? { kind: 'final_payment', label: 'Final payment collection' }
					: null,
				stage: 'finance',
				status: 'completed',
				summary: finalPayment
					? 'The remaining customer payment was recorded.'
					: 'Customer payment was recorded.',
				timestamp: payment.created_at,
				title: finalPayment ? 'Final payment collected' : 'Payment collected',
			}),
		)
	}
	if (hasProcessing) {
		steps.push(
			reportStep({
				actor: null,
				advisor: null,
				facts: [
					reportFact('Reserved lines', reservations.length),
					reportFact(
						'Reserved units',
						reservations.reduce((sum, row) => sum + row.quantity, 0),
					),
					reportFact(
						'Warehouse status',
						loadingTask?.status.replaceAll('_', ' '),
					),
				],
				id: `processing-${linkedOrder?.id ?? order.id}`,
				lines: processingLines,
				specialCase:
					loadingTask?.status === 'rejected'
						? {
								kind: 'warehouse_rejection',
								label: 'Warehouse correction required',
							}
						: null,
				stage: reservations.length > 0 ? 'inventory' : 'warehouse',
				status: loadingTask?.status === 'rejected' ? 'special' : 'completed',
				summary:
					loadingTask?.status === 'rejected'
						? 'The order returned to preparation for correction.'
						: 'Inventory reservation and warehouse preparation state.',
				timestamp:
					loadingTask?.updated_at ?? reservations[0]?.updated_at ?? null,
				title:
					loadingTask?.status === 'rejected'
						? 'Preparation correction'
						: 'Order preparation',
			}),
		)
	}
	if (delivery) {
		const deliverySpecial =
			delivery.deliveryStatus === 'rejected'
				? { kind: 'dispatch_return' as const, label: 'Returned to warehouse' }
				: null
		steps.push(
			reportStep({
				actor: null,
				advisor: null,
				facts: [
					reportFact('Delivery number', delivery.deliveryNumber),
					reportFact('Delivery status', delivery.deliveryStatus),
					reportFact('Driver', delivery.driverName),
					reportFact('Driver phone', delivery.driverPhone),
					reportFact('Truck', delivery.truckNumber),
					reportFact('Vehicle', delivery.vehiclePlate),
					reportFact('Driver place', delivery.driverPlace),
					reportFact('ETA', delivery.estimatedArrival),
					reportFact('Destination', delivery.route.destination),
				],
				id: `dispatch-${delivery.id}`,
				lines: [
					`Route: ${delivery.route.origin} to ${delivery.route.destination}`,
					`Distance: ${delivery.route.distanceKm.toLocaleString('en-EG')} km`,
				],
				specialCase: deliverySpecial,
				stage: delivery.currentStage === 'delivered' ? 'delivery' : 'dispatch',
				status: deliverySpecial
					? 'special'
					: delivery.currentStage === 'delivered'
						? 'completed'
						: 'current',
				summary: deliverySpecial
					? 'Delivery was returned for correction.'
					: 'Live delivery assignment and route information.',
				timestamp: delivery.lastUpdated,
				title:
					delivery.currentStage === 'delivered'
						? 'Delivered'
						: 'Dispatch assigned',
			}),
		)
	}
	if (hasDelivered && !delivery) {
		steps.push(
			reportStep({
				actor: null,
				advisor: null,
				facts: [
					reportFact('Delivered at', linkedOrder?.delivered_at),
					reportFact('Delivery completed', 'Yes'),
				],
				id: `delivered-${linkedOrder?.id ?? order.id}`,
				lines: ['Order reached customer-visible delivery completion.'],
				specialCase: null,
				stage: 'delivery',
				status: 'completed',
				summary: 'The order has been delivered.',
				timestamp: linkedOrder?.delivered_at ?? null,
				title: 'Delivered',
			}),
		)
	}
	if (stopped) {
		steps.push(
			reportStep({
				actor: null,
				advisor: null,
				facts: [
					reportFact('Reason', stopReason),
					reportFact('Quote status', quoteRequest?.status),
					reportFact('Order status', linkedOrder?.status),
				],
				id: `stopped-${quoteRequest?.id ?? linkedOrder?.id ?? order.id}`,
				lines: [
					'The report stops here because the order was not allowed to continue.',
				],
				specialCase: { kind: 'cancellation', label: 'Workflow stopped' },
				stage: 'stopped',
				status: 'stopped',
				summary: 'Canceled or rejected workflow stop.',
				timestamp: linkedOrder?.updated_at ?? quoteRequest?.created_at ?? null,
				title: 'Order stopped',
			}),
		)
	}
	steps.sort((a, b) => stepSortValue(a) - stepSortValue(b))
	const currentStage = stageForPortalReport({
		delivery,
		hasDelivered,
		hasProcessing,
		linkedOrder,
		payments,
		stopped,
	})
	const lastStep = steps[steps.length - 1] ?? null
	const specialCaseCount = steps.filter((step) => step.specialCase).length

	return {
		exportFileName: `${order.reference}-order-report.html`,
		generatedAt: new Date().toISOString(),
		pending: pendingPortalStages(currentStage, stopped),
		steps,
		summary: {
			currentStage,
			headline: lastStep?.title ?? 'Order report',
			lastAction: lastStep?.title ?? null,
			processedBy: null,
			reachedStage: currentStage,
			specialCaseCount,
			status: stopped ? 'stopped' : hasDelivered ? 'completed' : 'active',
		},
	}
}

async function getOrderDocuments(
	supabase: Awaited<
		ReturnType<typeof getAuthenticatedPortalCustomer>
	>['supabase'],
	customerId: string,
	orderNumber: string | null,
) {
	if (!orderNumber) return []

	const { data: documents, error } = await supabase
		.from('documents')
		.select('id, type, title, download_url, created_at')
		.eq('customer_id', customerId)
		.eq('related_order_ref', orderNumber)
		.order('created_at', { ascending: false })

	if (error) throw new Error(error.message)

	return ((documents ?? []) as DocumentRow[]).flatMap((document) =>
		document.download_url
			? [
					{
						id: document.id,
						type: document.type,
						name: document.title,
						url: document.download_url,
						createdAt: document.created_at,
					},
				]
			: [],
	)
}

function buildQuoteRequestDetail(
	row: QuoteRequestDetailRow,
	documents: DeliveryDocument[],
	categoryImages: Map<string, string>,
	delivery?: DeliveryInfo,
	versions: SalesQuoteVersionRow[] = [],
	reservations: InventoryReservationRow[] = [],
	loadingTask: LoadingTaskRow | null = null,
	payments: CustomerPaymentRow[] = [],
): OrderDetailResult {
	const linkedOrder = firstRelation(row.orders)
	const items = mapQuoteRequestItems(row.quote_request_items, categoryImages)
	const rawOrderStatus = linkedOrder
		? mapOrderStatus(linkedOrder.status)
		: mapOrderStatus(row.status)
	const orderStatus = getEffectiveOrderStatus(rawOrderStatus, delivery)
	const date = linkedOrder?.created_at ?? row.submitted_at ?? row.created_at
	const reference = linkedOrder?.order_number ?? row.request_number
	const description =
		items
			.slice(0, 3)
			.map((item) => item.productName)
			.join(', ') ||
		row.notes ||
		reference

	const detail: Omit<OrderDetailResult, 'report'> = {
		order: {
			id: row.id,
			reference,
			status: orderStatus,
			description,
			itemCount: items.length,
			date,
			amount: linkedOrder?.total_amount ?? null,
			currency: 'EGP',
			items,
		},
		timeline: linkedOrder ? timelineFor(linkedOrder, orderStatus) : [],
		documents,
		review:
			orderStatus === 'submitted'
				? {
						submittedAt: row.submitted_at ?? row.created_at,
						message: '',
					}
				: undefined,
		delivery,
		completion: linkedOrder?.delivered_at
			? {
					deliveredAt: linkedOrder.delivered_at,
					receivedBy: '',
					proofOfDelivery: '',
					summaryLines: [],
					message: '',
				}
			: undefined,
	}
	return {
		...detail,
		report: buildOrderReport({
			delivery,
			documents,
			items,
			loadingTask,
			order: detail.order,
			payments,
			quoteRequest: row,
			reservations,
			versions,
		}),
	}
}

function buildOrderDetail(
	order: OrderRow,
	items: OrderDetailResult['order']['items'],
	documents: DeliveryDocument[],
	delivery?: DeliveryInfo,
	quoteRequest: QuoteRequestDetailRow | null = null,
	versions: SalesQuoteVersionRow[] = [],
	reservations: InventoryReservationRow[] = [],
	loadingTask: LoadingTaskRow | null = null,
	payments: CustomerPaymentRow[] = [],
): OrderDetailResult {
	const orderStatus = getEffectiveOrderStatus(
		mapOrderStatus(order.status),
		delivery,
	)
	const detail: Omit<OrderDetailResult, 'report'> = {
		order: {
			id: order.quote_request_id ?? order.id,
			reference: order.order_number,
			status: orderStatus,
			description:
				items
					.slice(0, 3)
					.map((item) => item.productName)
					.join(', ') || order.order_number,
			itemCount: items.length,
			date: order.created_at,
			amount: order.total_amount,
			currency: 'EGP',
			items,
		},
		timeline: timelineFor(order, orderStatus),
		documents,
		delivery,
		completion: order.delivered_at
			? {
					deliveredAt: order.delivered_at,
					receivedBy: '',
					proofOfDelivery: '',
					summaryLines: [],
					message: '',
				}
			: undefined,
	}
	return {
		...detail,
		report: buildOrderReport({
			delivery,
			documents,
			items,
			loadingTask,
			order: detail.order,
			payments,
			quoteRequest,
			reservations,
			versions,
		}),
	}
}

async function getQuoteVersions(
	supabase: Awaited<
		ReturnType<typeof getAuthenticatedPortalCustomer>
	>['supabase'],
	quoteRequestId: string | null | undefined,
): Promise<SalesQuoteVersionRow[]> {
	if (!quoteRequestId) return []
	const { data, error } = await supabase
		.from('sales_quote_versions')
		.select(
			'id, version_number, status, subtotal, tax_amount, delivery_fee, discount_amount, total, notes, created_at',
		)
		.eq('quote_request_id', quoteRequestId)
		.order('version_number', { ascending: false })
	if (error) throw new Error(error.message)
	return (data ?? []) as unknown as SalesQuoteVersionRow[]
}

async function getInventoryReservations(
	supabase: Awaited<
		ReturnType<typeof getAuthenticatedPortalCustomer>
	>['supabase'],
	orderId: string | null | undefined,
): Promise<InventoryReservationRow[]> {
	if (!orderId) return []
	const { data, error } = await supabase
		.from('inventory_reservations')
		.select(
			'id, quantity, status, created_at, updated_at, products(id, name, name_ar, category, image_urls)',
		)
		.eq('order_id', orderId)
		.order('created_at', { ascending: true })
	if (error) throw new Error(error.message)
	return (data ?? []) as unknown as InventoryReservationRow[]
}

async function getLoadingTask(
	supabase: Awaited<
		ReturnType<typeof getAuthenticatedPortalCustomer>
	>['supabase'],
	orderId: string | null | undefined,
): Promise<LoadingTaskRow | null> {
	if (!orderId) return null
	const { data, error } = await supabase
		.from('loading_tasks')
		.select('id, status, proof, rejection_reason, created_at, updated_at')
		.eq('order_id', orderId)
		.maybeSingle()
	if (error) throw new Error(error.message)
	return (data as unknown as LoadingTaskRow | null) ?? null
}

async function getCustomerPayments(
	supabase: Awaited<
		ReturnType<typeof getAuthenticatedPortalCustomer>
	>['supabase'],
	orderId: string | null | undefined,
): Promise<CustomerPaymentRow[]> {
	if (!orderId) return []
	const { data, error } = await supabase
		.from('customer_payments')
		.select('id, amount, payment_fraction, proof_path, status, created_at')
		.eq('order_id', orderId)
		.order('created_at', { ascending: true })
	if (error) throw new Error(error.message)
	return (data ?? []) as unknown as CustomerPaymentRow[]
}

const quoteRequestDetailSelect = `
	id,
	request_number,
	status,
	urgency,
	created_at,
	submitted_at,
	delivery_date,
	notes,
	attachment_urls,
	rejected_reason,
	customer_addresses (
		label,
		street,
		area,
		city,
		governorate,
		landmark
	),
	projects (
		name
	),
	quote_request_items (
		id,
		product_id,
		customer_description,
		product_name_ar,
		quantity,
		unit_of_measure,
		unit_of_measure_ar,
		sort_order,
		products (
			id,
			name,
			name_ar,
			category,
			image_urls
		)
	),
	orders (
		id,
		order_number,
		status,
		total_amount,
		created_at,
		updated_at,
		delivered_at,
		quote_request_id
	)
`

export const getOrderDetail = createServerFn({ method: 'POST' })
	.inputValidator(getOrderDetailInput)
	.handler(async ({ data: input }): Promise<OrderDetailResult | null> => {
		const { customerId, supabase } = await getAuthenticatedPortalCustomer()

		const { data: quoteRequest, error: quoteRequestError } = await supabase
			.from('quote_requests')
			.select(quoteRequestDetailSelect)
			.eq('id', input.orderId)
			.eq('customer_id', customerId)
			.maybeSingle()

		if (quoteRequestError) throw new Error(quoteRequestError.message)
		if (quoteRequest) {
			const row = quoteRequest as unknown as QuoteRequestDetailRow
			const linkedOrder = firstRelation(row.orders)
			const { error: activityError } = await supabase.rpc(
				'customer_record_portal_order_viewed',
				{
					p_order_id: linkedOrder?.id ?? null,
					p_quote_request_id: row.id,
				},
			)

			if (activityError) throw new Error(activityError.message)

			const documents = await getOrderDocuments(
				supabase,
				customerId,
				linkedOrder?.order_number ?? null,
			)
			const categoryImages = await loadCategoryImageMap(
				supabase,
				categorySlugsFromQuoteRequestItems(row.quote_request_items),
			)
			const [delivery, versions, reservations, loadingTask, payments] =
				await Promise.all([
					getCustomerDeliveryTracking(supabase, linkedOrder?.id),
					getQuoteVersions(supabase, row.id),
					getInventoryReservations(supabase, linkedOrder?.id),
					getLoadingTask(supabase, linkedOrder?.id),
					getCustomerPayments(supabase, linkedOrder?.id),
				])
			return buildQuoteRequestDetail(
				row,
				documents,
				categoryImages,
				delivery,
				versions,
				reservations,
				loadingTask,
				payments,
			)
		}

		const { data: order, error: orderError } = await supabase
			.from('orders')
			.select(
				'id, order_number, status, total_amount, created_at, updated_at, delivered_at, quote_request_id',
			)
			.eq('id', input.orderId)
			.eq('customer_id', customerId)
			.maybeSingle()

		if (orderError) throw new Error(orderError.message)
		if (!order) return null

		const [
			quoteRequestData,
			documents,
			versions,
			reservations,
			loadingTask,
			payments,
		] = await Promise.all([
			order.quote_request_id
				? supabase
						.from('quote_requests')
						.select(quoteRequestDetailSelect)
						.eq('id', order.quote_request_id)
						.eq('customer_id', customerId)
						.maybeSingle()
				: Promise.resolve({ data: null, error: null }),
			getOrderDocuments(supabase, customerId, order.order_number),
			getQuoteVersions(supabase, order.quote_request_id),
			getInventoryReservations(supabase, order.id),
			getLoadingTask(supabase, order.id),
			getCustomerPayments(supabase, order.id),
		])

		if (quoteRequestData.error) throw new Error(quoteRequestData.error.message)
		const quoteRequestRow =
			(quoteRequestData.data as unknown as QuoteRequestDetailRow | null) ?? null
		const itemRows = quoteRequestRow?.quote_request_items ?? []

		if (order.quote_request_id) {
			const { error: activityError } = await supabase.rpc(
				'customer_record_portal_order_viewed',
				{
					p_order_id: order.id,
					p_quote_request_id: order.quote_request_id,
				},
			)

			if (activityError) throw new Error(activityError.message)
		}

		const categoryImages = await loadCategoryImageMap(
			supabase,
			categorySlugsFromQuoteRequestItems(itemRows),
		)

		const delivery = await getCustomerDeliveryTracking(supabase, order.id)

		return buildOrderDetail(
			order as OrderRow,
			mapQuoteRequestItems(itemRows, categoryImages),
			documents,
			delivery,
			quoteRequestRow,
			versions,
			reservations,
			loadingTask,
			payments,
		)
	})

export const getDeliverySecret = createServerFn({ method: 'POST' })
	.inputValidator(getDeliverySecretInput)
	.handler(async ({ data: input }): Promise<DeliverySecret> => {
		const { supabase } = await getAuthenticatedPortalCustomer()
		const { data, error } = await supabase.rpc('customer_get_delivery_secret', {
			p_order_id: input.orderId,
		})
		if (error) throw new Error(error.message)

		const secret = deliverySecretSchema.parse(data)
		const qrCodeDataUrl = await QRCode.toDataURL(secret.payload, {
			errorCorrectionLevel: 'M',
			margin: 1,
			width: 192,
		})

		return { ...secret, qrCodeDataUrl }
	})
