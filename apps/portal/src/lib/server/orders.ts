/**
 * Customer order and quote-request list backed by Supabase.
 */
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type {
	Order,
	OrderDeliveryTracking,
	OrderItem,
	OrderType,
} from '../../types/order'
import { sortOrdersByDateDesc } from '../order-history'
import { getAuthenticatedPortalCustomer } from './_supabase'
import {
	type DeliveryInfo,
	getCustomerDeliveryTracking,
	getEffectiveOrderStatus,
} from './deliveries'
import {
	firstRelation,
	imageUrlForProduct,
	loadCategoryImageMap,
	mapOrderStatus,
} from './order-utils'
import {
	type QuoteRequestLocationInput,
	replaceQuoteRequestLocationsAndItems,
} from './quote-request-locations'

interface ProductRow {
	availability_status: string
	id: string
	is_active: boolean
	name: string
	name_ar: string | null
	category: string
	image_urls: string[] | null
}

interface QuoteRequestItemRow {
	id: string
	quote_request_location_id: string | null
	product_id: string | null
	customer_description: string
	product_name_ar: string
	quantity: number
	unit_of_measure: string
	unit_of_measure_ar: string
	notes: string | null
	match_confidence: number | null
	sort_order: number
	is_unmatched: boolean
	products: ProductRow | ProductRow[] | null
}

interface QuoteRequestLocationRow {
	id: string
	client_id: string | null
	sort_order: number
	address_id: string | null
	delivery_date: string | null
	delivery_hour: number | null
	delivery_period: 'AM' | 'PM' | null
}

interface QuoteRequestAssociateRow {
	name: string
	country_code: string
	number: string
	sort_order: number
}

interface LinkedOrderRow {
	id: string
	order_number: string
	status: string
	total_amount: number
	created_at: string
}

interface QuoteRequestRow {
	id: string
	request_number: string
	status: string
	created_at: string
	submitted_at: string | null
	draft_name: string | null
	notes: string | null
	urgency: string
	project_id: string | null
	delivery_address_id: string | null
	delivery_date: string | null
	delivery_hour: number | null
	delivery_period: 'AM' | 'PM' | null
	attachment_urls: string[] | null
	quote_request_items: QuoteRequestItemRow[] | null
	quote_request_locations: QuoteRequestLocationRow[] | null
	quote_request_associates: QuoteRequestAssociateRow[] | null
	orders: LinkedOrderRow | LinkedOrderRow[] | null
}

function categorySlugsFromQuoteRequests(rows: QuoteRequestRow[]): string[] {
	const slugs = new Set<string>()
	for (const row of rows) {
		for (const item of row.quote_request_items ?? []) {
			const product = firstRelation(item.products)
			if (product?.category) slugs.add(product.category)
		}
	}
	return [...slugs]
}

function mapOrderType(
	row: QuoteRequestRow,
	linkedOrder: LinkedOrderRow | null,
) {
	if (linkedOrder) return 'confirmed' satisfies OrderType
	if (row.status === 'draft' || row.status === 'saved') {
		return 'saved' satisfies OrderType
	}
	return 'submitted' satisfies OrderType
}

function mapOrderItems(
	items: QuoteRequestItemRow[] | null,
	categoryImages: Map<string, string>,
): OrderItem[] {
	return (items ?? [])
		.slice()
		.sort((a, b) => a.sort_order - b.sort_order)
		.map((item) => {
			const product = firstRelation(item.products)
			const snapshotName = item.customer_description.trim()
			const catalogProductId = item.product_id ?? product?.id ?? undefined
			const isOrderable = Boolean(
				catalogProductId &&
					!item.is_unmatched &&
					product?.is_active &&
					product.availability_status !== 'hidden' &&
					product.availability_status !== 'out_of_stock',
			)
			return {
				productId: catalogProductId ?? item.id,
				catalogProductId,
				productName: snapshotName || product?.name || item.id,
				productNameAr:
					item.product_name_ar || product?.name_ar || snapshotName || item.id,
				quantity: item.quantity,
				unitOfMeasure: item.unit_of_measure,
				unitOfMeasureAr: item.unit_of_measure_ar || item.unit_of_measure,
				notes: item.notes ?? undefined,
				imageUrl: imageUrlForProduct(product, categoryImages),
				category: product?.category ?? 'unmatched',
				availabilityStatus: product?.availability_status,
				isOrderable,
				isUnmatched: item.is_unmatched || !catalogProductId,
			}
		})
}

function toOrderDeliveryTracking(
	delivery: DeliveryInfo,
): OrderDeliveryTracking {
	return {
		id: delivery.id,
		orderId: delivery.orderId,
		orderNumber: delivery.orderNumber,
		deliveryNumber: delivery.deliveryNumber,
		deliveryStatus: delivery.deliveryStatus,
		driverId: delivery.driverId,
		driverName: delivery.driverName,
		driverPhone: delivery.driverPhone,
		driverPlace: delivery.driverPlace,
		currentStage: delivery.currentStage,
		estimatedArrival: delivery.estimatedArrival,
		lastUpdated: delivery.lastUpdated,
		route: delivery.route,
		truckNumber: delivery.truckNumber,
		vehiclePlate: delivery.vehiclePlate,
	}
}

function isIncomingDelivery(delivery: OrderDeliveryTracking): boolean {
	return (
		delivery.currentStage === 'out_for_delivery' &&
		(delivery.deliveryStatus === 'in_transit' ||
			delivery.deliveryStatus === 'arrived')
	)
}

async function loadDeliveryTrackingByOrderId(
	supabase: Awaited<
		ReturnType<typeof getAuthenticatedPortalCustomer>
	>['supabase'],
	rows: QuoteRequestRow[],
): Promise<Map<string, DeliveryInfo>> {
	const linkedOrderIds = [
		...new Set(
			rows
				.map((row) => firstRelation(row.orders)?.id)
				.filter((id): id is string => Boolean(id)),
		),
	]
	if (linkedOrderIds.length === 0) return new Map()

	const deliveries = await Promise.all(
		linkedOrderIds.map(async (orderId) => {
			const delivery = await getCustomerDeliveryTracking(supabase, orderId)
			return delivery ? ([orderId, delivery] as const) : null
		}),
	)

	return new Map(
		deliveries.filter(
			(delivery): delivery is readonly [string, DeliveryInfo] =>
				delivery !== null,
		),
	)
}

function mapQuoteRequestToOrder(
	row: QuoteRequestRow,
	categoryImages: Map<string, string>,
	delivery?: DeliveryInfo,
): Order {
	const linkedOrder = firstRelation(row.orders)
	const items = mapOrderItems(row.quote_request_items, categoryImages)
	const type = mapOrderType(row, linkedOrder)
	const rawStatus = linkedOrder
		? mapOrderStatus(linkedOrder.status)
		: mapOrderStatus(row.status)
	const status = getEffectiveOrderStatus(rawStatus, delivery)
	const description =
		items
			.slice(0, 3)
			.map((item) => item.productName)
			.join(', ') ||
		row.notes ||
		row.request_number

	return {
		id: row.id,
		linkedOrderId: linkedOrder?.id,
		type,
		draftSource: type === 'saved' ? 'customer' : undefined,
		status,
		delivery: delivery ? toOrderDeliveryTracking(delivery) : undefined,
		reference: linkedOrder?.order_number ?? row.request_number,
		name: row.draft_name ?? undefined,
		notes: row.notes ?? undefined,
		items,
		itemCount: items.length,
		description,
		date: linkedOrder?.created_at ?? row.submitted_at ?? row.created_at,
		amount: linkedOrder?.total_amount ?? null,
		currency: 'EGP',
	}
}

export const getAllCustomerOrders = createServerFn({ method: 'GET' }).handler(
	async (): Promise<{
		incomingDeliveries: OrderDeliveryTracking[]
		orders: Order[]
	}> => {
		const { customerId, supabase } = await getAuthenticatedPortalCustomer()
		const { data, error } = await supabase
			.from('quote_requests')
			.select(`
				id,
				request_number,
				status,
				created_at,
				submitted_at,
				draft_name,
				notes,
				quote_request_items (
					id,
					product_id,
					customer_description,
					product_name_ar,
					quantity,
					unit_of_measure,
					unit_of_measure_ar,
					notes,
					sort_order,
					products (
						availability_status,
						id,
						is_active,
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
					created_at
				)
			`)
			.eq('customer_id', customerId)
			.order('created_at', { ascending: false })

		if (error) throw new Error(error.message)

		// Supabase nested select inference does not preserve one-to-one relation
		// cardinality here, so normalize the result at the boundary.
		const rows = (data ?? []) as unknown as QuoteRequestRow[]
		const categoryImages = await loadCategoryImageMap(
			supabase,
			categorySlugsFromQuoteRequests(rows),
		)
		const deliveryByOrderId = await loadDeliveryTrackingByOrderId(
			supabase,
			rows,
		)
		const orders = sortOrdersByDateDesc(
			rows.map((row) => {
				const linkedOrder = firstRelation(row.orders)
				return mapQuoteRequestToOrder(
					row,
					categoryImages,
					linkedOrder ? deliveryByOrderId.get(linkedOrder.id) : undefined,
				)
			}),
		)
		return {
			incomingDeliveries: orders.flatMap((order) =>
				order.delivery && isIncomingDelivery(order.delivery)
					? [order.delivery]
					: [],
			),
			orders,
		}
	},
)

const deleteOrderInput = z.object({ orderId: z.string().uuid() })
const saveOrderAsDraftInput = z.object({ orderId: z.string().uuid() })

const QUOTE_REQUEST_SELECT = `
	id,
	request_number,
	status,
	created_at,
	submitted_at,
	draft_name,
	notes,
	urgency,
	project_id,
	delivery_address_id,
	delivery_date,
	delivery_hour,
	delivery_period,
	attachment_urls,
	quote_request_locations (
		id,
		client_id,
		sort_order,
		address_id,
		delivery_date,
		delivery_hour,
		delivery_period
	),
	quote_request_associates (
		name,
		country_code,
		number,
		sort_order
	),
	quote_request_items (
		id,
		quote_request_location_id,
		product_id,
		customer_description,
		product_name_ar,
		quantity,
		unit_of_measure,
		unit_of_measure_ar,
		notes,
		match_confidence,
		sort_order,
		is_unmatched,
		products (
			id,
			name,
			name_ar,
			category,
			is_active,
			availability_status,
			image_urls
		)
	),
	orders (
		id,
		order_number,
		status,
		total_amount,
		created_at
	)
`

export const deleteOrder = createServerFn({ method: 'POST' })
	.inputValidator(deleteOrderInput)
	.handler(async ({ data }): Promise<{ success: boolean }> => {
		const { customerId, supabase } = await getAuthenticatedPortalCustomer()
		const { data: deletedDraft, error } = await supabase
			.from('quote_requests')
			.delete()
			.eq('id', data.orderId)
			.eq('customer_id', customerId)
			.eq('status', 'draft')
			.select('id')
			.maybeSingle()

		if (error) throw new Error(error.message)
		if (!deletedDraft) throw new Error('Draft not found or cannot be deleted')
		return { success: true }
	})

async function getSourceQuoteRequest(
	supabase: Awaited<
		ReturnType<typeof getAuthenticatedPortalCustomer>
	>['supabase'],
	customerId: string,
	orderId: string,
) {
	const { data: quoteRequest, error: quoteRequestError } = await supabase
		.from('quote_requests')
		.select(QUOTE_REQUEST_SELECT)
		.eq('id', orderId)
		.eq('customer_id', customerId)
		.maybeSingle()

	if (quoteRequestError) throw new Error(quoteRequestError.message)
	if (quoteRequest) return quoteRequest as unknown as QuoteRequestRow

	const { data: order, error: orderError } = await supabase
		.from('orders')
		.select('quote_request_id')
		.eq('id', orderId)
		.eq('customer_id', customerId)
		.maybeSingle()

	if (orderError) throw new Error(orderError.message)
	if (!order?.quote_request_id) {
		throw new Error('Order was not found or cannot be saved as a draft')
	}

	const { data: linkedQuoteRequest, error: linkedError } = await supabase
		.from('quote_requests')
		.select(QUOTE_REQUEST_SELECT)
		.eq('id', order.quote_request_id)
		.eq('customer_id', customerId)
		.single()

	if (linkedError || !linkedQuoteRequest) {
		throw new Error(linkedError?.message ?? 'Source quote request not found')
	}

	return linkedQuoteRequest as unknown as QuoteRequestRow
}

function quoteRequestItemInputFromRow(
	item: QuoteRequestItemRow,
	index: number,
) {
	return {
		productId: item.product_id ?? undefined,
		customerDescription: item.customer_description,
		quantity: item.quantity,
		unitOfMeasure: item.unit_of_measure,
		unitOfMeasureAr: item.unit_of_measure_ar || item.unit_of_measure,
		notes: item.notes ?? undefined,
		matchConfidence: item.match_confidence ?? undefined,
		sortOrder: index,
		isUnmatched: item.is_unmatched,
	}
}

function cloneQuoteRequestLocations(
	source: QuoteRequestRow,
	items: QuoteRequestItemRow[],
): QuoteRequestLocationInput[] {
	const sourceLocations = (source.quote_request_locations ?? [])
		.slice()
		.sort((a, b) => a.sort_order - b.sort_order)
	const assignedSourceItemIds = new Set<string>()
	const locations = sourceLocations
		.map((location, locationIndex) => {
			const locationItems = items.filter(
				(item) => item.quote_request_location_id === location.id,
			)
			for (const item of locationItems) assignedSourceItemIds.add(item.id)
			return {
				clientId: location.client_id ?? `location-${locationIndex + 1}`,
				addressId: location.address_id ?? undefined,
				deliveryDate: location.delivery_date ?? undefined,
				deliveryHour: location.delivery_hour ?? undefined,
				deliveryPeriod: location.delivery_period ?? undefined,
				items: locationItems.map(quoteRequestItemInputFromRow),
			}
		})
		.filter((location) => location.items.length > 0)

	const unassignedItems = items.filter(
		(item) => !assignedSourceItemIds.has(item.id),
	)
	if (locations.length > 0 && unassignedItems.length > 0) {
		locations[0].items.push(
			...unassignedItems.map((item, index) =>
				quoteRequestItemInputFromRow(item, locations[0].items.length + index),
			),
		)
	}
	if (locations.length > 0) return locations

	return [
		{
			clientId: 'legacy-default',
			addressId: source.delivery_address_id ?? undefined,
			deliveryDate: source.delivery_date ?? undefined,
			deliveryHour: source.delivery_hour ?? undefined,
			deliveryPeriod: source.delivery_period ?? undefined,
			items: items.map(quoteRequestItemInputFromRow),
		},
	]
}

export const saveOrderAsDraft = createServerFn({ method: 'POST' })
	.inputValidator(saveOrderAsDraftInput)
	.handler(
		async ({ data }): Promise<{ draftId: string; reference: string }> => {
			const { customerId, supabase } = await getAuthenticatedPortalCustomer()
			const source = await getSourceQuoteRequest(
				supabase,
				customerId,
				data.orderId,
			)
			const items = (source.quote_request_items ?? []).slice().sort((a, b) => {
				return a.sort_order - b.sort_order
			})

			if (items.length === 0) {
				throw new Error('Cannot save an empty order as a draft')
			}
			const unavailableItems = items.filter((item) => {
				const product = firstRelation(item.products)
				return (
					item.is_unmatched ||
					!item.product_id ||
					!product?.is_active ||
					product.availability_status === 'hidden' ||
					product.availability_status === 'out_of_stock'
				)
			})
			if (unavailableItems.length > 0) {
				throw new Error('Cannot save unavailable or unmatched items as a draft')
			}

			const { data: draft, error: draftError } = await supabase
				.from('quote_requests')
				.insert({
					customer_id: customerId,
					status: 'draft',
					urgency: source.urgency,
					project_id: source.project_id,
					delivery_address_id: source.delivery_address_id,
					delivery_date: source.delivery_date,
					delivery_hour: source.delivery_hour,
					delivery_period: source.delivery_period,
					draft_name: source.draft_name,
					notes: source.notes,
					attachment_urls: source.attachment_urls ?? [],
					approval_required: false,
				})
				.select(
					'id, request_number, status, created_at, submitted_at, draft_name, notes',
				)
				.single()

			if (draftError || !draft) {
				throw new Error(draftError?.message ?? 'Failed to save draft')
			}

			await replaceQuoteRequestLocationsAndItems(
				supabase,
				draft.id,
				cloneQuoteRequestLocations(source, items),
				(source.quote_request_associates ?? [])
					.slice()
					.sort((a, b) => a.sort_order - b.sort_order)
					.map((associate) => ({
						name: associate.name,
						countryCode: associate.country_code,
						number: associate.number,
					})),
			)

			const sourceOrderId =
				firstRelation(source.orders)?.id ??
				(data.orderId === source.id ? null : data.orderId)
			const { error: activityError } = await supabase.rpc(
				'customer_record_order_saved_as_draft',
				{
					p_draft_quote_request_id: draft.id,
					p_source: 'portal',
					p_source_order_id: sourceOrderId,
					p_source_quote_request_id: source.id,
				},
			)

			if (activityError) throw new Error(activityError.message)

			return { draftId: draft.id, reference: draft.request_number }
		},
	)
