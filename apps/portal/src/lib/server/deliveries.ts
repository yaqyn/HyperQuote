/**
 * Delivery tracking server functions backed by Supabase.
 */
import { createServerFn } from '@tanstack/react-start'
import QRCode from 'qrcode'
import { z } from 'zod'
import type { OrderDeliveryStatus, OrderStatus } from '../../types/order'
import { getAuthenticatedPortalCustomer } from './_supabase'

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
	orderId: string
	orderNumber: string
	deliveryNumber: string
	deliveryStatus: OrderDeliveryStatus
	driverId: string
	driverName: string
	driverPhone: string
	truckNumber: string
	vehiclePlate: string
	orderStatus: string
	currentStage: DeliveryStage
	estimatedArrival: string
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
}

export interface PODDetails {
	photos: string[]
	deadline: string
	status: 'pending' | 'confirmed' | 'disputed' | 'auto_confirmed'
	autoConfirmDeadline: string
}

const getOrderDetailInput = z.object({ orderId: z.string().uuid() })
const confirmDropShipInput = z.object({ deliveryId: z.string().uuid() })
const disputeDropShipInput = z.object({
	deliveryId: z.string().uuid(),
	reason: z.string().min(1),
	notes: z.string().optional(),
})
const getPODDetailsInput = z.object({ deliveryId: z.string().uuid() })
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
	estimatedArrival: z.string(),
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
	created_at: string
	submitted_at: string | null
	notes: string | null
	quote_request_items: QuoteRequestItemRow[] | null
	orders: OrderRow | OrderRow[] | null
}

interface DocumentRow {
	id: string
	type: DeliveryDocument['type']
	title: string
	download_url: string | null
	created_at: string
}

interface DeliveryProofRow {
	id: string
	proof_type: string
	proof_path: string | null
	created_at: string
}

function firstRelation<T>(value: T | T[] | null): T | null {
	if (Array.isArray(value)) return value[0] ?? null
	return value
}

function firstImageUrl(imageUrls: string[] | null | undefined): string {
	return imageUrls?.find((url) => typeof url === 'string' && url.trim()) ?? ''
}

function imageUrlForProduct(
	product: ProductRow | null,
	categoryImages: Map<string, string>,
): string {
	const productImage = firstImageUrl(product?.image_urls)
	if (productImage) return productImage
	return product?.category ? (categoryImages.get(product.category) ?? '') : ''
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

async function loadCategoryImages(
	supabase: Awaited<
		ReturnType<typeof getAuthenticatedPortalCustomer>
	>['supabase'],
	slugs: string[],
): Promise<Map<string, string>> {
	const uniqueSlugs = [...new Set(slugs.filter(Boolean))]
	if (uniqueSlugs.length === 0) return new Map()

	const { data, error } = await supabase
		.from('categories')
		.select('slug, image_url')
		.in('slug', uniqueSlugs)
		.eq('is_active', true)

	if (error) throw new Error(error.message)

	return new Map(
		(data ?? []).flatMap((category) =>
			category.image_url ? [[category.slug, category.image_url]] : [],
		),
	)
}

function mapOrderStatus(status: string): OrderStatus {
	switch (status) {
		case 'draft':
		case 'submitted':
		case 'quote_ready':
		case 'negotiating':
		case 'accepted':
		case 'order_confirmed':
		case 'being_prepared':
		case 'out_for_delivery':
		case 'delivered':
		case 'expired':
		case 'cancelled':
		case 'rejected':
			return status
		case 'confirmed_for_inventory':
			return 'order_confirmed'
		case 'inventory_reserved':
		case 'warehouse_loading':
		case 'dispatch_ready':
			return 'being_prepared'
		case 'dispatch_assigned':
			return 'out_for_delivery'
		default:
			return 'submitted'
	}
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

	return deliveryInfoSchema.parse(data)
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

	return {
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
}

function buildOrderDetail(
	order: OrderRow,
	items: OrderDetailResult['order']['items'],
	documents: DeliveryDocument[],
	delivery?: DeliveryInfo,
): OrderDetailResult {
	const orderStatus = getEffectiveOrderStatus(
		mapOrderStatus(order.status),
		delivery,
	)
	return {
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
}

export const getOrderDetail = createServerFn({ method: 'GET' })
	.inputValidator(getOrderDetailInput)
	.handler(async ({ data: input }): Promise<OrderDetailResult | null> => {
		const { customerId, supabase } = await getAuthenticatedPortalCustomer()

		const { data: quoteRequest, error: quoteRequestError } = await supabase
			.from('quote_requests')
			.select(
				`
				id,
				request_number,
				status,
				created_at,
				submitted_at,
				notes,
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
					delivered_at,
					quote_request_id
				)
			`,
			)
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
			const categoryImages = await loadCategoryImages(
				supabase,
				categorySlugsFromQuoteRequestItems(row.quote_request_items),
			)
			const delivery = await getCustomerDeliveryTracking(
				supabase,
				linkedOrder?.id,
			)
			return buildQuoteRequestDetail(row, documents, categoryImages, delivery)
		}

		const { data: order, error: orderError } = await supabase
			.from('orders')
			.select(
				'id, order_number, status, total_amount, created_at, delivered_at, quote_request_id',
			)
			.eq('id', input.orderId)
			.eq('customer_id', customerId)
			.maybeSingle()

		if (orderError) throw new Error(orderError.message)
		if (!order) return null

		const [{ data: itemRows, error: itemsError }, documents] =
			await Promise.all([
				order.quote_request_id
					? supabase
							.from('quote_request_items')
							.select(
								'id, product_id, customer_description, product_name_ar, quantity, unit_of_measure, unit_of_measure_ar, sort_order, products(id, name, name_ar, category, image_urls)',
							)
							.eq('quote_request_id', order.quote_request_id)
							.order('sort_order', { ascending: true })
					: Promise.resolve({ data: [], error: null }),
				getOrderDocuments(supabase, customerId, order.order_number),
			])

		if (itemsError) throw new Error(itemsError.message)

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

		const categoryImages = await loadCategoryImages(
			supabase,
			categorySlugsFromQuoteRequestItems(
				itemRows as unknown as QuoteRequestItemRow[],
			),
		)

		const delivery = await getCustomerDeliveryTracking(supabase, order.id)

		return buildOrderDetail(
			order as OrderRow,
			mapQuoteRequestItems(
				itemRows as unknown as QuoteRequestItemRow[],
				categoryImages,
			),
			documents,
			delivery,
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

export const confirmDropShipDelivery = createServerFn({ method: 'POST' })
	.inputValidator(confirmDropShipInput)
	.handler(async (): Promise<{ success: boolean }> => {
		await getAuthenticatedPortalCustomer()
		throw new Error('Customer delivery confirmation is not configured')
	})

export const disputeDropShipDelivery = createServerFn({ method: 'POST' })
	.inputValidator(disputeDropShipInput)
	.handler(async (): Promise<{ success: boolean }> => {
		await getAuthenticatedPortalCustomer()
		throw new Error('Customer delivery dispute is not configured')
	})

export const getPODDetails = createServerFn({ method: 'GET' })
	.inputValidator(getPODDetailsInput)
	.handler(async ({ data: input }): Promise<PODDetails> => {
		const { customerId, supabase } = await getAuthenticatedPortalCustomer()
		const { data: delivery, error: deliveryError } = await supabase
			.from('deliveries')
			.select('id, status, completed_at, updated_at, orders!inner(customer_id)')
			.eq('id', input.deliveryId)
			.eq('orders.customer_id', customerId)
			.order('created_at', { ascending: false })
			.limit(1)
			.maybeSingle()

		if (deliveryError) throw new Error(deliveryError.message)
		if (!delivery) throw new Error('Delivery proof is not available')

		const { data: proofs, error: proofsError } = await supabase
			.from('delivery_proofs')
			.select('id, proof_type, proof_path, created_at')
			.eq('delivery_id', delivery.id)
			.order('created_at', { ascending: false })

		if (proofsError) throw new Error(proofsError.message)

		const photos = ((proofs ?? []) as DeliveryProofRow[])
			.filter((proof) => proof.proof_type === 'photo' && proof.proof_path)
			.map((proof) => proof.proof_path as string)
		const confirmed =
			delivery.status === 'completed' || delivery.status === 'delivered'
		const deadline = delivery.completed_at ?? ''

		return {
			photos,
			deadline,
			status: confirmed ? 'confirmed' : 'pending',
			autoConfirmDeadline: deadline,
		}
	})
