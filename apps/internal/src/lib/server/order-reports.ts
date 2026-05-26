import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type { JsonObject, OrderReportStage } from '../db/types'
import { computeMarginFromSellPrice } from '../pricing-math'
import {
	formatSupabaseAddress,
	isSalesQuoteAddress,
	normalizeAddressText,
} from './address-format'

/**
 * Reads the living report for an RFQ/order. The response is a fully
 * resolved view: item slugs are joined to product names, so the viewer
 * component stays dumb.
 */

interface ResolvedReportItem {
	productSlug: string
	productName: string
	unit: string
	quantity: number
}

export interface ResolvedReport {
	id: string
	rfqId: string
	currentStage: OrderReportStage
	canceledReason: string | null
	canceledNote: string | null
	canceledAt: string | null
	sections: {
		submitted?: {
			customerName: string
			customerTier: string
			contactName: string
			phone: string
			deliveryAddress: string
			deliveryCity: string
			deliveryUrgencyDays: number
			items: ResolvedReportItem[]
		}
		evaluated?: {
			quoteId: string
			quoteNumber: string
			marginPercent: number
			subtotal: number
			vatAmount: number
			total: number
			sentAt: string | null
			sentVia: string | null
			validUntil: string
		}
		finance_partial?: JsonObject
		inventory_orders?: JsonObject
		finance_full?: JsonObject
		warehouse?: JsonObject
		dispatch?: JsonObject
		delivered?: JsonObject
		canceled?: JsonObject
		returned?: JsonObject
	}
}

const UUID_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

interface SupabaseReportCustomerRow {
	company_name: string
	contact_name: string
	phone: string
	tier: string | null
}

interface SupabaseReportAddressRow {
	street: string
	area: string | null
	city: string
	governorate: string
	landmark: string | null
	label: string | null
}

interface SupabaseReportProductRow {
	slug: string
	name: string
	unit_of_measure: string
}

interface SupabaseReportRequestItemRow {
	customer_description: string
	quantity: number
	unit_of_measure: string
	products: SupabaseReportProductRow | SupabaseReportProductRow[] | null
}

interface SupabaseReportRequestRow {
	id: string
	request_number: string
	status: string
	urgency: string
	delivery_date: string | null
	notes: string | null
	rejected_reason: string | null
	rejected_proof: unknown
	created_at: string
	submitted_at: string | null
	customers: SupabaseReportCustomerRow | SupabaseReportCustomerRow[] | null
	customer_addresses:
		| SupabaseReportAddressRow
		| SupabaseReportAddressRow[]
		| null
	quote_request_items: SupabaseReportRequestItemRow[] | null
}

interface SupabaseReportQuoteVersionRow {
	id: string
	version_number: number
	status: string
	subtotal: number
	tax_amount: number
	total: number
	notes: string | null
	created_at: string
}

interface SupabaseReportOrderRow {
	id: string
	order_number: string
	status: string
	total_amount: number
	created_at: string
	delivered_at: string | null
}

interface SupabaseReportPaymentRow {
	amount: number
	payment_fraction: number
	proof_path: string
	status: string
	created_at: string
}

interface SupabaseReportReservationRow {
	quantity: number
	status: string
	created_at: string
	products: { name: string } | { name: string }[] | null
}

interface SupabaseReportLoadingTaskRow {
	status: string
	proof: JsonObject
	rejection_reason: string | null
	created_at: string
	updated_at: string
}

interface SupabaseReportDeliveryRow {
	delivery_number: string
	status: string
	driver_id: string | null
	truck_id: string | null
	started_at: string | null
	arrived_at: string | null
	completed_at: string | null
	rejection_reason: string | null
	updated_at: string
	drivers:
		| { name: string; phone: string }
		| { name: string; phone: string }[]
		| null
	trucks: { plate_number: string } | { plate_number: string }[] | null
}

interface SupabaseReportSavedLineItem {
	productSlug?: string
	productName: string
	quantity: number
	unit: string
	supplierCost: number
	marginPercent?: number
	sellPrice?: number
}

interface SupabaseReportSavedNotes {
	deliveryAddress?: string | null
	deliveryCity?: string | null
	items?: SupabaseReportSavedLineItem[]
}

function firstRelation<T>(value: T | T[] | null): T | null {
	if (Array.isArray(value)) return value[0] ?? null
	return value
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null
}

function stringOrNull(value: unknown): string | null {
	return typeof value === 'string' ? value : null
}

function numberOrNull(value: unknown): number | null {
	return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function parseJsonObject(value: string | null): Record<string, unknown> | null {
	if (!value) return null
	try {
		const parsed: unknown = JSON.parse(value)
		return isRecord(parsed) ? parsed : null
	} catch {
		return null
	}
}

function parseSavedVersionNotes(
	value: string | null,
): SupabaseReportSavedNotes {
	const outer = parseJsonObject(value)
	if (!outer) return {}

	const metadata = parseJsonObject(stringOrNull(outer.notes)) ?? outer
	const rawItems = Array.isArray(outer.items) ? outer.items : []
	const items = rawItems
		.map((item): SupabaseReportSavedLineItem | null => {
			if (!isRecord(item)) return null
			const productName = stringOrNull(item.productName)
			const quantity = numberOrNull(item.quantity)
			const unit = stringOrNull(item.unit)
			const supplierCost = numberOrNull(item.supplierCost)
			if (!productName || quantity === null || !unit || supplierCost === null) {
				return null
			}
			return {
				productSlug: stringOrNull(item.productSlug) ?? undefined,
				productName,
				quantity,
				unit,
				supplierCost,
				marginPercent: numberOrNull(item.marginPercent) ?? undefined,
				sellPrice: numberOrNull(item.sellPrice) ?? undefined,
			}
		})
		.filter((item): item is SupabaseReportSavedLineItem => item !== null)

	return {
		deliveryAddress:
			normalizeAddressText(stringOrNull(metadata.deliveryAddress)) || undefined,
		deliveryCity: stringOrNull(metadata.deliveryCity) ?? undefined,
		items: items.length > 0 ? items : undefined,
	}
}

function deliveryUrgencyDays(deliveryDate: string | null): number {
	if (!deliveryDate) return 14
	const diff = new Date(deliveryDate).getTime() - Date.now()
	return Math.max(0, Math.ceil(diff / 86_400_000))
}

function reportItemsFromRequest(
	items: SupabaseReportRequestItemRow[] | null,
): ResolvedReportItem[] {
	return (items ?? []).map((item, index) => {
		const product = firstRelation(item.products)
		const snapshotName = item.customer_description.trim()
		return {
			productSlug: product?.slug ?? `request-line-${index + 1}`,
			productName: snapshotName || product?.name || `request-line-${index + 1}`,
			unit: product?.unit_of_measure ?? item.unit_of_measure,
			quantity: Number(item.quantity),
		}
	})
}

function reportItemsFromSavedVersion(
	items: SupabaseReportSavedLineItem[] | undefined,
): ResolvedReportItem[] | null {
	if (!items?.length) return null
	return items.map((item, index) => ({
		productSlug: item.productSlug ?? `quote-line-${index + 1}`,
		productName: item.productName,
		unit: item.unit,
		quantity: item.quantity,
	}))
}

function extractRejectedProofNote(value: unknown): string | null {
	if (!isRecord(value)) return null
	const note = stringOrNull(value.note)
	if (note?.trim()) return note
	const proof = stringOrNull(value.proof)
	return proof?.trim() ? proof : null
}

function compactJsonObject(
	entries: Record<string, JsonObject[keyof JsonObject]>,
): JsonObject {
	const result: JsonObject = {}
	for (const [key, value] of Object.entries(entries)) {
		if (value === null || value === undefined || value === '') continue
		result[key] = value
	}
	return result
}

function mapSupabaseStage(
	request: SupabaseReportRequestRow,
	version: SupabaseReportQuoteVersionRow | null,
	order: SupabaseReportOrderRow | null,
): OrderReportStage {
	if (
		request.status === 'rejected' ||
		request.status === 'declined' ||
		request.status === 'canceled' ||
		request.status === 'expired'
	) {
		return 'canceled'
	}

	switch (order?.status) {
		case 'delivered':
			return 'delivered'
		case 'rejected':
			return 'returned'
		case 'dispatch_assigned':
		case 'out_for_delivery':
		case 'dispatch_ready':
			return 'dispatch'
		case 'warehouse_loading':
			return 'warehouse'
		case 'inventory_reserved':
			return 'inventory_orders'
		default:
			return version ? 'evaluated' : 'submitted'
	}
}

function averageMarginPercent(
	items: SupabaseReportSavedLineItem[] | undefined,
) {
	if (!items?.length) return 0
	const margins = items.map((item) => {
		if (typeof item.marginPercent === 'number') return item.marginPercent
		const sellPrice = item.sellPrice ?? item.supplierCost
		return computeMarginFromSellPrice(item.supplierCost, sellPrice)
	})
	return (
		Math.round(
			(margins.reduce((sum, value) => sum + value, 0) / margins.length) * 10,
		) / 10
	)
}

async function getSupabaseOrderReport(
	rfqId: string,
): Promise<ResolvedReport | null> {
	if (!UUID_RE.test(rfqId)) return null
	const { getInternalSupabaseClient } = await import('./_supabase')
	const auth = await getInternalSupabaseClient()
	if (!auth) throw new Error('flow_report_no_internal_auth')

	const { data: requestData, error: requestError } = await auth.client
		.from('quote_requests')
		.select(`
			id,
			request_number,
			status,
			urgency,
			delivery_date,
			notes,
			rejected_reason,
			rejected_proof,
			created_at,
			submitted_at,
			customers (
				company_name,
				contact_name,
				phone,
				tier
			),
			customer_addresses (
				label,
				street,
				area,
				city,
				governorate,
				landmark
			),
			quote_request_items (
				customer_description,
				quantity,
				unit_of_measure,
				products (
					slug,
					name,
					unit_of_measure
				)
			)
		`)
		.eq('id', rfqId)
		.maybeSingle()
	if (requestError) throw new Error(requestError.message)
	if (!requestData) throw new Error(`flow_report_request_not_found_${rfqId}`)

	const request = requestData as unknown as SupabaseReportRequestRow
	const { data: versions, error: versionError } = await auth.client
		.from('sales_quote_versions')
		.select(
			'id, version_number, status, subtotal, tax_amount, total, notes, created_at',
		)
		.eq('quote_request_id', rfqId)
		.order('version_number', { ascending: false })
		.limit(1)
	if (versionError) throw new Error(versionError.message)

	const { data: orderData, error: orderError } = await auth.client
		.from('orders')
		.select('id, order_number, status, total_amount, created_at, delivered_at')
		.eq('quote_request_id', rfqId)
		.maybeSingle()
	if (orderError) throw new Error(orderError.message)

	const version =
		((versions ?? [])[0] as unknown as
			| SupabaseReportQuoteVersionRow
			| undefined) ?? null
	const order = orderData as unknown as SupabaseReportOrderRow | null
	const [payments, reservations, loadingTask, delivery] = order
		? await Promise.all([
				auth.client
					.from('customer_payments')
					.select('amount, payment_fraction, proof_path, status, created_at')
					.eq('order_id', order.id)
					.order('created_at', { ascending: false }),
				auth.client
					.from('inventory_reservations')
					.select('quantity, status, created_at, products(name)')
					.eq('order_id', order.id)
					.order('created_at', { ascending: true }),
				auth.client
					.from('loading_tasks')
					.select('status, proof, rejection_reason, created_at, updated_at')
					.eq('order_id', order.id)
					.maybeSingle(),
				auth.client
					.from('deliveries')
					.select(
						'delivery_number, status, driver_id, truck_id, started_at, arrived_at, completed_at, rejection_reason, updated_at, drivers(name, phone), trucks(plate_number)',
					)
					.eq('order_id', order.id)
					.order('updated_at', { ascending: false })
					.limit(1),
			])
		: [
				{ data: [], error: null },
				{ data: [], error: null },
				{ data: null, error: null },
				{ data: [], error: null },
			]
	if (payments.error) throw new Error(payments.error.message)
	if (reservations.error) throw new Error(reservations.error.message)
	if (loadingTask.error) throw new Error(loadingTask.error.message)
	if (delivery.error) throw new Error(delivery.error.message)

	const paymentRows =
		(payments.data as unknown as SupabaseReportPaymentRow[] | null) ?? []
	const reservationRows =
		(reservations.data as unknown as SupabaseReportReservationRow[] | null) ??
		[]
	const loadingTaskRow =
		(loadingTask.data as unknown as SupabaseReportLoadingTaskRow | null) ?? null
	const deliveryRow =
		((delivery.data ?? [])[0] as unknown as
			| SupabaseReportDeliveryRow
			| undefined) ?? null
	const customer = firstRelation(request.customers)
	const address = firstRelation(request.customer_addresses)
	const salesAddress = isSalesQuoteAddress(address) ? address : null
	const savedNotes = parseSavedVersionNotes(version?.notes ?? null)
	const currentStage = mapSupabaseStage(request, version, order)
	const canceledNote =
		extractRejectedProofNote(request.rejected_proof) ??
		(request.status === 'expired' ? 'Expired before evaluation' : null)

	const report: ResolvedReport = {
		id: `sb-report-${request.id}`,
		rfqId: request.request_number || request.id,
		currentStage,
		canceledReason:
			currentStage === 'canceled'
				? (request.rejected_reason ?? request.status)
				: null,
		canceledNote: currentStage === 'canceled' ? canceledNote : null,
		canceledAt: currentStage === 'canceled' ? request.created_at : null,
		sections: {
			submitted: {
				customerName: customer?.company_name ?? '',
				customerTier: customer?.tier ?? '',
				contactName: customer?.contact_name ?? '',
				phone: customer?.phone ?? '',
				deliveryAddress:
					savedNotes.deliveryAddress ?? formatSupabaseAddress(salesAddress),
				deliveryCity: savedNotes.deliveryCity ?? salesAddress?.city ?? '',
				deliveryUrgencyDays: deliveryUrgencyDays(request.delivery_date),
				items:
					reportItemsFromSavedVersion(savedNotes.items) ??
					reportItemsFromRequest(request.quote_request_items),
			},
		},
	}

	if (version) {
		report.sections.evaluated = {
			quoteId: version.id,
			quoteNumber: `${request.request_number}-V${version.version_number}`,
			marginPercent: averageMarginPercent(savedNotes.items),
			subtotal: Number(version.subtotal),
			vatAmount: Number(version.tax_amount),
			total: Number(version.total || order?.total_amount || 0),
			sentAt: version.created_at,
			sentVia: 'internal',
			validUntil: new Date(
				new Date(version.created_at).getTime() + 15 * 86_400_000,
			).toISOString(),
		}
	}

	if (order) {
		const paidTotal = paymentRows.reduce((sum, row) => sum + row.amount, 0)
		const partialPayment = paymentRows.find(
			(row) => row.payment_fraction === 0.5,
		)
		const fullPayment = paymentRows.find((row) => row.payment_fraction === 1)
		if (partialPayment || paidTotal > 0) {
			report.sections.finance_partial = compactJsonObject({
				amountPaid: paidTotal,
				lastPaymentAt: paymentRows[0]?.created_at ?? null,
				lastProof: paymentRows[0]?.proof_path ?? null,
				paymentCount: paymentRows.length,
				status: paidTotal >= order.total_amount ? 'paid' : 'partial',
			})
		}
		if (reservationRows.length > 0) {
			report.sections.inventory_orders = compactJsonObject({
				reservedLines: reservationRows.length,
				reservedUnits: reservationRows.reduce(
					(sum, row) => sum + row.quantity,
					0,
				),
				items: reservationRows.map((row) => {
					const product = firstRelation(row.products)
					return `${product?.name ?? 'Product'}: ${row.quantity} ${row.status}`
				}),
			})
		}
		if (fullPayment || paidTotal >= order.total_amount) {
			report.sections.finance_full = compactJsonObject({
				amountPaid: paidTotal,
				orderTotal: order.total_amount,
				paidAt: paymentRows[0]?.created_at ?? null,
				status: 'paid',
			})
		}
		if (loadingTaskRow) {
			report.sections.warehouse = compactJsonObject({
				status: loadingTaskRow.status,
				rejectionReason: loadingTaskRow.rejection_reason,
				updatedAt: loadingTaskRow.updated_at,
			})
		}
		if (deliveryRow) {
			const driver = firstRelation(deliveryRow.drivers)
			const truck = firstRelation(deliveryRow.trucks)
			report.sections.dispatch = compactJsonObject({
				deliveryNumber: deliveryRow.delivery_number,
				driver: driver?.name ?? deliveryRow.driver_id,
				driverPhone: driver?.phone ?? null,
				rejectionReason: deliveryRow.rejection_reason,
				startedAt: deliveryRow.started_at,
				status: deliveryRow.status,
				truck: truck?.plate_number ?? deliveryRow.truck_id,
				updatedAt: deliveryRow.updated_at,
			})
		}
		if (order.delivered_at || deliveryRow?.completed_at) {
			report.sections.delivered = compactJsonObject({
				deliveredAt: order.delivered_at ?? deliveryRow?.completed_at ?? null,
				deliveryNumber: deliveryRow?.delivery_number ?? null,
				status: 'delivered',
			})
		}
	}

	return report
}

export const getOrderReport = createServerFn({ method: 'POST' })
	.inputValidator(z.object({ rfqId: z.string() }))
	.handler(async ({ data }) => {
		return getSupabaseOrderReport(data.rfqId)
	})
