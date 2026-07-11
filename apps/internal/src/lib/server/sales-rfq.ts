import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type { RFQ } from '../../types/sales'
import { calculatePriorityScore } from '../../types/sales'
import { mapSupabaseRfqStatusForSales } from '../sales-rfq-status'
import { getInternalSupabaseClient } from './_supabase'

const UUID_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isUuid(value: string): boolean {
	return UUID_RE.test(value)
}

function hoursSince(value: string): number {
	const parsed = new Date(value).getTime()
	if (!Number.isFinite(parsed)) return Number.POSITIVE_INFINITY
	return (Date.now() - parsed) / 3_600_000
}

interface SupabaseCustomerRow {
	company_name: string
	contact_name: string
}

interface SupabaseProductRow {
	name: string
	price_range_max: number | null
	price_range_min: number | null
	updated_at: string
	supplier_product_links: SupabaseSupplierLinkRow[] | null
}

interface SupabaseSupplierLinkRow {
	raw_cost: number | null
	is_primary: boolean
	last_quoted_at: string | null
}

interface SupabaseQuoteRequestItemRow {
	customer_description: string
	quantity: number
	products: SupabaseProductRow | SupabaseProductRow[] | null
}

interface SupabaseQuoteRequestRow {
	id: string
	request_number: string
	status: string
	assigned_employee_id: string | null
	created_at: string
	submitted_at: string | null
	delivery_date: string | null
	eligible_at: string
	urgency: string
	customers: SupabaseCustomerRow | SupabaseCustomerRow[] | null
	quote_request_items: SupabaseQuoteRequestItemRow[] | null
}

const employeeQuoteSessionRowSchema = z.object({
	id: z.string().uuid(),
	quote_request_id: z.string().uuid(),
	employee_id: z.string().uuid(),
	client_session_id: z.string().uuid(),
	status: z.string(),
	opened_at: z.string(),
	last_seen_at: z.string(),
	closed_at: z.string().nullable(),
	close_reason: z.string().nullable(),
	threshold_seconds: z.number(),
	flagged_at: z.string().nullable(),
	flag_reason: z.string().nullable(),
})

type EmployeeQuoteSessionRow = z.infer<typeof employeeQuoteSessionRowSchema>

export interface SalesQuoteSessionSummary {
	closeReason: string | null
	flagReason: string | null
	flaggedAt: string | null
	lastSeenAt: string
	openedAt: string
	quoteRequestId: string
	sessionId: string
	status: string
	thresholdSeconds: number
}

function salesQuoteSessionSummary(
	row: EmployeeQuoteSessionRow,
): SalesQuoteSessionSummary {
	return {
		closeReason: row.close_reason,
		flagReason: row.flag_reason,
		flaggedAt: row.flagged_at,
		lastSeenAt: row.last_seen_at,
		openedAt: row.opened_at,
		quoteRequestId: row.quote_request_id,
		sessionId: row.id,
		status: row.status,
		thresholdSeconds: row.threshold_seconds,
	}
}

function firstRelation<T>(value: T | T[] | null): T | null {
	if (Array.isArray(value)) return value[0] ?? null
	return value
}

function positivePrice(value: number | null | undefined): number | null {
	const numeric = Number(value ?? 0)
	return Number.isFinite(numeric) && numeric > 0 ? numeric : null
}

function primarySupplierLink(
	links: SupabaseSupplierLinkRow[] | null,
): SupabaseSupplierLinkRow | null {
	if (!links || links.length === 0) return null
	return links.find((link) => link.is_primary) ?? links[0] ?? null
}

function productHasOutdatedPrice(product: SupabaseProductRow | null): boolean {
	const primaryLink = primarySupplierLink(
		product?.supplier_product_links ?? null,
	)
	const hasPrice =
		positivePrice(primaryLink?.raw_cost) !== null ||
		positivePrice(product?.price_range_min) !== null ||
		positivePrice(product?.price_range_max) !== null
	if (!hasPrice) return true
	const lastQuotedAt =
		primaryLink?.last_quoted_at ??
		product?.updated_at ??
		new Date(0).toISOString()
	return hoursSince(lastQuotedAt) >= 24
}

function productEstimatedUnitPrice(product: SupabaseProductRow | null): number {
	const primaryLink = primarySupplierLink(
		product?.supplier_product_links ?? null,
	)
	return (
		positivePrice(product?.price_range_max) ??
		positivePrice(product?.price_range_min) ??
		positivePrice(primaryLink?.raw_cost) ??
		1000
	)
}

function deliveryUrgencyDays(deliveryDate: string | null): number {
	if (!deliveryDate) return 14
	const diff = new Date(deliveryDate).getTime() - Date.now()
	return Math.max(0, Math.ceil(diff / 86_400_000))
}

function supabaseQueueEnteredAt(row: SupabaseQuoteRequestRow): string {
	const timestamps = [row.created_at, row.submitted_at]
	if (row.status === 'submitted') timestamps.push(row.eligible_at)
	const latest = timestamps
		.filter((value): value is string => Boolean(value))
		.map((value) => new Date(value).getTime())
		.filter((value) => Number.isFinite(value))
		.sort((a, b) => b - a)[0]
	return latest ? new Date(latest).toISOString() : row.created_at
}

function projectSupabaseRfq(row: SupabaseQuoteRequestRow): RFQ | null {
	const status = mapSupabaseRfqStatusForSales(row)
	if (!status) return null

	const customer = firstRelation(row.customers)
	const items = row.quote_request_items ?? []
	const queueEnteredAt = supabaseQueueEnteredAt(row)
	const ageHours = Math.max(0, hoursSince(queueEnteredAt))
	const urgencyDays = deliveryUrgencyDays(row.delivery_date)
	const estimatedValue = items.reduce(
		(sum, item) =>
			sum +
			Number(item.quantity) *
				productEstimatedUnitPrice(firstRelation(item.products)),
		0,
	)

	return {
		id: row.id,
		requestNumber: row.request_number,
		customerName: customer?.company_name ?? 'Customer',
		customerTier: 'new',
		estimatedValue,
		priorityScore: calculatePriorityScore(
			'new',
			estimatedValue,
			ageHours,
			urgencyDays,
		),
		lineItemCount: items.length,
		status,
		assignedRep: row.assigned_employee_id,
		createdAt: queueEnteredAt,
		slaDeadline: new Date(
			new Date(queueEnteredAt).getTime() + 24 * 60 * 60 * 1000,
		).toISOString(),
		deliveryUrgency: urgencyDays,
		previewItems: items.slice(0, 3).map((item) => {
			const product = firstRelation(item.products)
			return product?.name ?? item.customer_description
		}),
		contactName: customer?.contact_name ?? '',
		hasOutdatedPrices: items.some((item) =>
			productHasOutdatedPrice(firstRelation(item.products)),
		),
		source: 'supabase',
	}
}

async function getSupabaseRFQQueue(input: {
	status?: string
	assignedTo?: string
	page: number
	limit: number
}) {
	const auth = await getInternalSupabaseClient()
	if (!auth) return null
	const { data: currentEmployeeId, error: employeeError } =
		await auth.client.rpc('current_employee_id')
	if (employeeError) throw new Error(employeeError.message)

	let query = auth.client
		.from('quote_requests')
		.select(`
			id,
			request_number,
			status,
			assigned_employee_id,
			created_at,
			submitted_at,
			delivery_date,
			eligible_at,
			urgency,
			customers (
				company_name,
				contact_name
			),
			quote_request_items (
				customer_description,
				quantity,
				products (
					name,
					price_range_min,
					price_range_max,
					updated_at,
					supplier_product_links (
						raw_cost,
						is_primary,
						last_quoted_at
					)
				)
			)
		`)
		.neq('status', 'draft')
		.order('created_at', { ascending: true })

	if (input.status) {
		query = query.eq('status', input.status)
		if (input.status === 'submitted') {
			query = query.lte('eligible_at', new Date().toISOString())
		}
		if (input.status === 'assigned' && currentEmployeeId) {
			query = query.eq('assigned_employee_id', currentEmployeeId)
		}
	} else if (currentEmployeeId) {
		query = query.or(
			`status.neq.assigned,assigned_employee_id.eq.${currentEmployeeId}`,
		)
	} else {
		query = query.neq('status', 'assigned')
	}

	const { data, error } = await query
	if (error) throw new Error(error.message)

	// Supabase nested select inference does not preserve relation cardinality
	// for this projection, so normalize the server boundary explicitly.
	let rfqs = ((data ?? []) as unknown as SupabaseQuoteRequestRow[])
		.map(projectSupabaseRfq)
		.filter((rfq): rfq is RFQ => rfq !== null)
	if (input.assignedTo) {
		rfqs = rfqs.filter((rfq) => rfq.assignedRep === input.assignedTo)
	}
	rfqs.sort(
		(a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
	)
	const start = (input.page - 1) * input.limit

	return {
		rfqs: rfqs.slice(start, start + input.limit),
		total: rfqs.length,
		avgResponseTime: 0,
	}
}

// ─── Server Functions ─────────────────────────────────────

export const getRFQQueue = createServerFn({ method: 'POST' })
	.inputValidator(
		z.object({
			status: z.string().optional(),
			assignedTo: z.string().optional(),
			page: z.number().default(1),
			limit: z.number().default(500),
		}),
	)
	.handler(async ({ data: input }) => {
		return getSupabaseRFQQueue(input)
	})

export const declineRFQ = createServerFn({ method: 'POST' })
	.inputValidator(
		z.object({
			rfqId: z.string(),
			reason: z.enum([
				'outside_service_area',
				'cannot_source',
				'customer_blacklisted',
			]),
			note: z.string().optional(),
			proof: z.object({
				fileName: z.string().trim().min(1),
				proofPath: z.string().trim().min(1),
			}),
		}),
	)
	.handler(async ({ data }) => {
		if (!isUuid(data.rfqId)) {
			throw new Error('Supabase quote request id is required')
		}
		const auth = await getInternalSupabaseClient()
		const { error } = await auth.client.rpc('sales_reject_order', {
			p_order_id: data.rfqId,
			p_reason: data.reason,
			p_proof: {
				file_name: data.proof.fileName,
				note: data.note?.trim() || null,
				proof_path: data.proof.proofPath,
			},
		})
		if (error) throw new Error(error.message)
		return {
			success: true,
			rfqId: data.rfqId,
			status: 'declined' as const,
			reason: data.reason,
			note: data.note ?? null,
			declinedAt: new Date().toISOString(),
		}
	})

export const claimNextSalesOrder = createServerFn({ method: 'POST' }).handler(
	async () => {
		const auth = await getInternalSupabaseClient()
		const { data: claimed, error } = await auth.client.rpc(
			'claim_next_sales_order',
		)
		if (error) throw new Error(error.message)
		return {
			rfqId: claimed?.id ?? null,
			status: claimed?.status ?? null,
			success: true,
		}
	},
)

const quoteSessionStartInput = z.object({
	clientSessionId: z.string().uuid(),
	rfqId: z.string(),
	thresholdSeconds: z.number().int().min(300).max(28_800).default(1800),
})

const quoteSessionInput = z.object({
	clientSessionId: z.string().uuid(),
	sessionId: z.string().uuid(),
	thresholdSeconds: z.number().int().min(300).max(28_800).default(1800),
})

const quoteSessionCloseInput = z.object({
	clientSessionId: z.string().uuid(),
	closeReason: z.string().max(80).default('closed'),
	sessionId: z.string().uuid(),
})

export const startSalesQuoteSession = createServerFn({ method: 'POST' })
	.inputValidator(quoteSessionStartInput)
	.handler(async ({ data }) => {
		if (!isUuid(data.rfqId)) {
			throw new Error('Supabase quote request id is required')
		}
		const auth = await getInternalSupabaseClient()
		const { data: session, error } = await auth.client.rpc(
			'sales_start_quote_session',
			{
				p_client_session_id: data.clientSessionId,
				p_order_id: data.rfqId,
				p_threshold_seconds: data.thresholdSeconds,
			},
		)
		if (error) throw new Error(error.message)
		if (!session) throw new Error('Quote session was not created')
		return salesQuoteSessionSummary(
			employeeQuoteSessionRowSchema.parse(session),
		)
	})

export const heartbeatSalesQuoteSession = createServerFn({ method: 'POST' })
	.inputValidator(quoteSessionInput)
	.handler(async ({ data }) => {
		const auth = await getInternalSupabaseClient()
		const { data: session, error } = await auth.client.rpc(
			'sales_heartbeat_quote_session',
			{
				p_client_session_id: data.clientSessionId,
				p_session_id: data.sessionId,
				p_threshold_seconds: data.thresholdSeconds,
			},
		)
		if (error) throw new Error(error.message)
		if (!session) throw new Error('Quote session was not found')
		return salesQuoteSessionSummary(
			employeeQuoteSessionRowSchema.parse(session),
		)
	})

export const closeSalesQuoteSession = createServerFn({ method: 'POST' })
	.inputValidator(quoteSessionCloseInput)
	.handler(async ({ data }) => {
		const auth = await getInternalSupabaseClient()
		const { data: session, error } = await auth.client.rpc(
			'sales_close_quote_session',
			{
				p_client_session_id: data.clientSessionId,
				p_close_reason: data.closeReason,
				p_session_id: data.sessionId,
			},
		)
		if (error) throw new Error(error.message)
		if (!session) throw new Error('Quote session was not found')
		return salesQuoteSessionSummary(
			employeeQuoteSessionRowSchema.parse(session),
		)
	})

/**
 * Pause an assigned RFQ and return it to the submitted queue after the hold.
 * The RPC clears assignment immediately and uses eligible_at for queue timing.
 */
export const saveRFQForLater = createServerFn({ method: 'POST' })
	.inputValidator(
		z.object({
			rfqId: z.string(),
			returnInMinutes: z.number(),
		}),
	)
	.handler(async ({ data }) => {
		if (!isUuid(data.rfqId)) {
			throw new Error('Supabase quote request id is required')
		}
		const auth = await getInternalSupabaseClient()
		const { data: updated, error } = await auth.client.rpc(
			'sales_save_and_requeue',
			{
				p_order_id: data.rfqId,
				p_note: null,
				p_return_minutes: data.returnInMinutes,
			},
		)
		if (error) throw new Error(error.message)
		return {
			success: true,
			rfqId: data.rfqId,
			status: 'submitted' as const,
			returnsAt: updated?.eligible_at ?? null,
		}
	})
