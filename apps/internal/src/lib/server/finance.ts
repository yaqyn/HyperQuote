import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type { PaymentStatus } from '../db/types'
import { getInternalSupabaseClient } from './_supabase'

/**
 * Finance inbox — the dual-pipeline view.
 *
 * Customer side: every accepted quote is a row. paymentStatus flows
 * `unpaid → partial → paid`. `partial` is a state, not a step — it
 * sticks on the order while the rest of the pipeline advances. Delivered
 * + partial rows are the urgent chase-the-customer list.
 *
 * Supplier side: every deal (refill call) is a row. Same state machine.
 * Deals can advance to warehouse after the first supplier payment, but
 * stay finance-visible until the remaining balance is recorded.
 *
 * Transitions are enforced on the server — the UI can't force a
 * backwards transition and every mutation requires a non-empty proofUrl
 * (anti-scam + anti-fat-finger).
 */

const PARTIAL_FRACTION = 0.5 as const
const UUID_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const FINANCE_FOLLOWUP_CHANNELS = [
	'phone',
	'whatsapp',
	'email',
	'bank',
	'other',
] as const
const FINANCE_FOLLOWUP_STATES = ['open', 'waiting', 'closed'] as const
const FINANCE_LOOKUP_CHUNK_SIZE = 50

function isUuid(value: string | undefined): value is string {
	return Boolean(value && UUID_RE.test(value))
}

function roundMoney(value: number): number {
	return Math.round(value * 100) / 100
}

function chunkArray<T>(values: T[], size: number): T[][] {
	const chunks: T[][] = []
	for (let index = 0; index < values.length; index += size) {
		chunks.push(values.slice(index, index + size))
	}
	return chunks
}

function roundedHoursSince(iso: string): number {
	return Math.round((Date.now() - new Date(iso).getTime()) / 3_600_000)
}

export interface FinanceOrderView {
	quoteId: string
	quoteNumber: string
	rfqId: string
	customerId: string
	customerName: string
	customerTier: string
	customerPoNumber: string | null
	acceptedAt: string
	acceptedHoursAgo: number
	deliveryAddress: string
	deliveryCity: string
	totalDue: number
	amountPaid: number
	remainingDue: number
	paymentStatus: PaymentStatus
	partialPaidAt: string | null
	fullPaidAt: string | null
	partialProofUrl: string | null
	fullProofUrl: string | null
	partialRecordedByName: string | null
	fullRecordedByName: string | null
	itemCount: number
	currentStage: string
	isDelivered: boolean
	latestFollowUp: FinanceFollowUpView | null
}

interface FinanceDealItemView {
	productSlug: string
	productName: string
	sku: string
	unit: string
	agreedQty: number
	agreedRawCost: number
	lineTotal: number
}

export interface FinanceDealView {
	dealId: string
	supplierName: string
	items: FinanceDealItemView[]
	itemCount: number
	/** Headline product for the row view — first item in the list. */
	headlineProductName: string
	totalDue: number
	amountPaid: number
	remainingDue: number
	paymentStatus: PaymentStatus
	partialPaidAt: string | null
	fullPaidAt: string | null
	partialProofUrl: string | null
	fullProofUrl: string | null
	partialRecordedByName: string | null
	fullRecordedByName: string | null
	createdAt: string
	createdHoursAgo: number
	latestFollowUp: FinanceFollowUpView | null
}

export interface FinanceFollowUpView {
	id: string
	contactChannel: string
	outcome: string
	notes: string
	followUpState: string
	followUpDueAt: string
	createdAt: string
}

interface FinanceInboxTotals {
	customerUnpaid: number
	customerPartial: number
	customerPaid: number
	supplierUnpaid: number
	supplierPartial: number
	supplierPaid: number
	totalOutstanding: number
	deliveredPartialCount: number
}

interface SupabaseFinanceCustomerRow {
	id: string
	company_name: string
	status: string
	tier: string | null
}

interface SupabaseFinanceProductRow {
	slug: string
	sku: string
	name: string
	unit_of_measure: string
}

interface SupabaseFinanceEmployeeRow {
	id: string
	full_name: string
	email: string
}

interface SupabaseFinanceRequestItemRow {
	id: string
	customer_description: string
	quantity: number
	unit_of_measure: string
	products: SupabaseFinanceProductRow | SupabaseFinanceProductRow[] | null
}

interface SupabaseFinanceRequestRow {
	id: string
	request_number: string
	quote_request_items: SupabaseFinanceRequestItemRow[] | null
}

interface SupabaseFinanceOrderRow {
	id: string
	order_number: string
	quote_request_id: string | null
	customer_id: string | null
	status: string
	total_amount: number
	delivered_at: string | null
	created_at: string
	customers: SupabaseFinanceCustomerRow | SupabaseFinanceCustomerRow[] | null
	quote_requests: SupabaseFinanceRequestRow | SupabaseFinanceRequestRow[] | null
}

interface SupabaseFinanceCustomerPaymentRow {
	order_id: string
	amount: number
	payment_fraction: number
	proof_path: string
	recorded_by_employee_id: string | null
	created_at: string
	employees: SupabaseFinanceEmployeeRow | SupabaseFinanceEmployeeRow[] | null
}

interface SupabaseFinanceSupplierRow {
	id: string
	name: string
	status: string
}

interface SupabaseFinanceRefillRow {
	id: string
	product_id: string
	supplier_id: string
	quantity: number
	unit_cost: number
	status: string
	created_at: string
	products: SupabaseFinanceProductRow | SupabaseFinanceProductRow[] | null
	suppliers: SupabaseFinanceSupplierRow | SupabaseFinanceSupplierRow[] | null
}

interface SupabaseFinanceSupplierPaymentRow {
	refill_request_id: string
	amount: number
	payment_fraction: number
	proof_path: string
	recorded_by_employee_id: string | null
	created_at: string
	employees: SupabaseFinanceEmployeeRow | SupabaseFinanceEmployeeRow[] | null
}

interface SupabaseFinanceFollowUpRow {
	id: string
	target_type: 'customer_order' | 'supplier_refill'
	order_id: string | null
	refill_request_id: string | null
	contact_channel: string
	outcome: string
	notes: string
	follow_up_state: string
	follow_up_due_at: string
	created_at: string
}

interface PaymentSummary {
	status: PaymentStatus
	amountPaid: number
	remainingDue: number
	partialPaidAt: string | null
	fullPaidAt: string | null
	partialProofUrl: string | null
	fullProofUrl: string | null
	partialRecordedByName: string | null
	fullRecordedByName: string | null
}

function firstRelation<T>(value: T | T[] | null): T | null {
	if (Array.isArray(value)) return value[0] ?? null
	return value
}

function paymentRecorderName(payment: {
	employees: SupabaseFinanceEmployeeRow | SupabaseFinanceEmployeeRow[] | null
	recorded_by_employee_id: string | null
}): string | null {
	const employee = firstRelation(payment.employees)
	return (
		employee?.full_name ??
		employee?.email ??
		payment.recorded_by_employee_id ??
		null
	)
}

function paymentSummary(
	totalDue: number,
	records: Array<{
		amount: number
		payment_fraction: number
		proof_path: string
		recorded_by_employee_id: string | null
		created_at: string
		employees: SupabaseFinanceEmployeeRow | SupabaseFinanceEmployeeRow[] | null
	}>,
): PaymentSummary {
	const sorted = [...records].sort(
		(a, b) =>
			new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
	)
	const amountPaid = roundMoney(
		Math.min(
			totalDue,
			sorted.reduce((sum, payment) => sum + Number(payment.amount), 0),
		),
	)
	const remainingDue = roundMoney(Math.max(0, totalDue - amountPaid))
	const hasFullRecord = sorted.some(
		(payment) => Number(payment.payment_fraction) >= 1,
	)
	const status: PaymentStatus =
		hasFullRecord || remainingDue <= 0
			? 'paid'
			: amountPaid > 0
				? 'partial'
				: 'unpaid'
	const firstPayment = sorted[0] ?? null
	const lastPayment = sorted.at(-1) ?? null

	return {
		status,
		amountPaid,
		remainingDue,
		partialPaidAt: firstPayment?.created_at ?? null,
		fullPaidAt: status === 'paid' ? (lastPayment?.created_at ?? null) : null,
		partialProofUrl: firstPayment?.proof_path ?? null,
		fullProofUrl: status === 'paid' ? (lastPayment?.proof_path ?? null) : null,
		partialRecordedByName: firstPayment
			? paymentRecorderName(firstPayment)
			: null,
		fullRecordedByName:
			status === 'paid' && lastPayment
				? paymentRecorderName(lastPayment)
				: null,
	}
}

function buildFollowUpView(
	followUp: SupabaseFinanceFollowUpRow | null | undefined,
): FinanceFollowUpView | null {
	if (!followUp) return null
	return {
		id: followUp.id,
		contactChannel: followUp.contact_channel,
		outcome: followUp.outcome,
		notes: followUp.notes,
		followUpState: followUp.follow_up_state,
		followUpDueAt: followUp.follow_up_due_at,
		createdAt: followUp.created_at,
	}
}

function collectLatestFollowUps(
	rows: SupabaseFinanceFollowUpRow[],
	keyForRow: (row: SupabaseFinanceFollowUpRow) => string | null,
): Map<string, FinanceFollowUpView> {
	const latest = new Map<string, SupabaseFinanceFollowUpRow>()
	for (const row of rows) {
		const key = keyForRow(row)
		if (!key) continue
		const previous = latest.get(key)
		if (
			!previous ||
			new Date(row.created_at).getTime() >
				new Date(previous.created_at).getTime()
		) {
			latest.set(key, row)
		}
	}

	const mapped = new Map<string, FinanceFollowUpView>()
	for (const [key, followUp] of latest) {
		const view = buildFollowUpView(followUp)
		if (view) mapped.set(key, view)
	}
	return mapped
}

// ─── Builders ─────────────────────────────────────────────

function buildSupabaseFinanceOrder(
	order: SupabaseFinanceOrderRow,
	payments: SupabaseFinanceCustomerPaymentRow[],
	latestFollowUp: FinanceFollowUpView | null,
): FinanceOrderView | null {
	const customer = firstRelation(order.customers)
	const request = firstRelation(order.quote_requests)
	if (!customer || !request) return null
	const totalDue = roundMoney(Number(order.total_amount))
	const summary = paymentSummary(totalDue, payments)

	return {
		quoteId: order.id,
		quoteNumber: `${order.order_number} · ${request.request_number}`,
		rfqId: request.id,
		customerId: customer.id,
		customerName: customer.company_name,
		customerTier: customer.tier ?? customer.status,
		customerPoNumber: null,
		acceptedAt: order.created_at,
		acceptedHoursAgo: roundedHoursSince(order.created_at),
		deliveryAddress: '',
		deliveryCity: '',
		totalDue,
		amountPaid: summary.amountPaid,
		remainingDue: summary.remainingDue,
		paymentStatus: summary.status,
		partialPaidAt: summary.partialPaidAt,
		partialProofUrl: summary.partialProofUrl,
		partialRecordedByName: summary.partialRecordedByName,
		fullPaidAt: summary.fullPaidAt,
		fullProofUrl: summary.fullProofUrl,
		fullRecordedByName: summary.fullRecordedByName,
		itemCount: request.quote_request_items?.length ?? 0,
		currentStage: order.status,
		isDelivered: order.status === 'delivered' || Boolean(order.delivered_at),
		latestFollowUp,
	}
}

function buildSupabaseFinanceDeal(
	refill: SupabaseFinanceRefillRow,
	payments: SupabaseFinanceSupplierPaymentRow[],
	latestFollowUp: FinanceFollowUpView | null,
): FinanceDealView | null {
	const product = firstRelation(refill.products)
	const supplier = firstRelation(refill.suppliers)
	if (!product || !supplier) return null
	const agreedQty = Number(refill.quantity)
	const agreedRawCost = Number(refill.unit_cost)
	const lineTotal = roundMoney(agreedQty * agreedRawCost)
	const summary = paymentSummary(lineTotal, payments)
	const item: FinanceDealItemView = {
		productSlug: product.slug,
		productName: product.name,
		sku: product.sku,
		unit: product.unit_of_measure,
		agreedQty,
		agreedRawCost,
		lineTotal,
	}

	return {
		dealId: refill.id,
		supplierName: supplier.name,
		items: [item],
		itemCount: 1,
		headlineProductName: item.productName,
		totalDue: lineTotal,
		amountPaid: summary.amountPaid,
		remainingDue: summary.remainingDue,
		paymentStatus: summary.status,
		partialPaidAt: summary.partialPaidAt,
		fullPaidAt: summary.fullPaidAt,
		partialProofUrl: summary.partialProofUrl,
		fullProofUrl: summary.fullProofUrl,
		partialRecordedByName: summary.partialRecordedByName,
		fullRecordedByName: summary.fullRecordedByName,
		createdAt: refill.created_at,
		createdHoursAgo: roundedHoursSince(refill.created_at),
		latestFollowUp,
	}
}

async function getSupabaseFinanceInbox() {
	const auth = await getInternalSupabaseClient()

	const { data: orderRows, error: orderError } = await auth.client
		.from('orders')
		.select(`
			id,
			order_number,
			quote_request_id,
			customer_id,
			status,
			total_amount,
			delivered_at,
			created_at,
			customers (
				id,
				company_name,
				status,
				tier
			),
			quote_requests (
				id,
				request_number,
				quote_request_items (
					id,
					customer_description,
					quantity,
					unit_of_measure,
					products (
						slug,
						sku,
						name,
						unit_of_measure
					)
				)
			)
		`)
		.not('status', 'in', '("rejected","canceled")')
	if (orderError) throw new Error(orderError.message)

	const orders = (orderRows ?? []) as unknown as SupabaseFinanceOrderRow[]
	const orderIds = orders.map((order) => order.id)
	const orderIdChunks = chunkArray(orderIds, FINANCE_LOOKUP_CHUNK_SIZE)
	const paymentsByOrder = new Map<string, SupabaseFinanceCustomerPaymentRow[]>()
	for (const ids of orderIdChunks) {
		const { data, error } = await auth.client
			.from('customer_payments')
			.select(`
				order_id,
				amount,
				payment_fraction,
				proof_path,
				recorded_by_employee_id,
				created_at,
				employees (
					id,
					full_name,
					email
				)
			`)
			.in('order_id', ids)
			.eq('status', 'recorded')
		if (error) throw new Error(error.message)
		for (const payment of (data ?? []) as SupabaseFinanceCustomerPaymentRow[]) {
			const list = paymentsByOrder.get(payment.order_id) ?? []
			list.push(payment)
			paymentsByOrder.set(payment.order_id, list)
		}
	}

	const followUpsByOrder = new Map<string, FinanceFollowUpView>()
	for (const ids of orderIdChunks) {
		const { data, error } = await auth.client
			.from('finance_payment_followups')
			.select(
				'id, target_type, order_id, refill_request_id, contact_channel, outcome, notes, follow_up_state, follow_up_due_at, created_at',
			)
			.in('order_id', ids)
			.order('created_at', { ascending: false })
		if (error) throw new Error(error.message)
		for (const [orderId, followUp] of collectLatestFollowUps(
			(data ?? []) as SupabaseFinanceFollowUpRow[],
			(row) => row.order_id,
		)) {
			followUpsByOrder.set(orderId, followUp)
		}
	}

	const { data: refillRows, error: refillError } = await auth.client
		.from('refill_requests')
		.select(`
			id,
			product_id,
			supplier_id,
			quantity,
			unit_cost,
			status,
			created_at,
			products (
				slug,
				sku,
				name,
				unit_of_measure
			),
			suppliers (
				id,
				name,
				status
			)
		`)
		.in('status', ['finance_pending', 'warehouse_receiving', 'received'])
	if (refillError) throw new Error(refillError.message)

	const refills = (refillRows ?? []) as unknown as SupabaseFinanceRefillRow[]
	const refillIds = refills.map((refill) => refill.id)
	const refillIdChunks = chunkArray(refillIds, FINANCE_LOOKUP_CHUNK_SIZE)
	const paymentsByRefill = new Map<
		string,
		SupabaseFinanceSupplierPaymentRow[]
	>()
	for (const ids of refillIdChunks) {
		const { data, error } = await auth.client
			.from('supplier_payments')
			.select(
				`
				refill_request_id,
				amount,
				payment_fraction,
				proof_path,
				recorded_by_employee_id,
				created_at,
				employees (
					id,
					full_name,
					email
				)
			`,
			)
			.in('refill_request_id', ids)
			.eq('status', 'recorded')
		if (error) throw new Error(error.message)
		for (const payment of (data ?? []) as SupabaseFinanceSupplierPaymentRow[]) {
			const list = paymentsByRefill.get(payment.refill_request_id) ?? []
			list.push(payment)
			paymentsByRefill.set(payment.refill_request_id, list)
		}
	}

	const followUpsByRefill = new Map<string, FinanceFollowUpView>()
	for (const ids of refillIdChunks) {
		const { data, error } = await auth.client
			.from('finance_payment_followups')
			.select(
				'id, target_type, order_id, refill_request_id, contact_channel, outcome, notes, follow_up_state, follow_up_due_at, created_at',
			)
			.in('refill_request_id', ids)
			.order('created_at', { ascending: false })
		if (error) throw new Error(error.message)
		for (const [refillId, followUp] of collectLatestFollowUps(
			(data ?? []) as SupabaseFinanceFollowUpRow[],
			(row) => row.refill_request_id,
		)) {
			followUpsByRefill.set(refillId, followUp)
		}
	}

	const customerOrders = orders
		.map((order) =>
			buildSupabaseFinanceOrder(
				order,
				paymentsByOrder.get(order.id) ?? [],
				followUpsByOrder.get(order.id) ?? null,
			),
		)
		.filter((order): order is FinanceOrderView => order !== null)

	const supplierDeals = refills
		.map((refill) =>
			buildSupabaseFinanceDeal(
				refill,
				paymentsByRefill.get(refill.id) ?? [],
				followUpsByRefill.get(refill.id) ?? null,
			),
		)
		.filter((deal): deal is FinanceDealView => deal !== null)

	const totals = buildFinanceTotals(customerOrders, supplierDeals)
	return { customerOrders, supplierDeals, totals }
}

function buildFinanceTotals(
	customerOrders: FinanceOrderView[],
	supplierDeals: FinanceDealView[],
): FinanceInboxTotals {
	return {
		customerUnpaid: customerOrders.filter((o) => o.paymentStatus === 'unpaid')
			.length,
		customerPartial: customerOrders.filter((o) => o.paymentStatus === 'partial')
			.length,
		customerPaid: customerOrders.filter((o) => o.paymentStatus === 'paid')
			.length,
		supplierUnpaid: supplierDeals.filter((d) => d.paymentStatus === 'unpaid')
			.length,
		supplierPartial: supplierDeals.filter((d) => d.paymentStatus === 'partial')
			.length,
		supplierPaid: supplierDeals.filter((d) => d.paymentStatus === 'paid')
			.length,
		totalOutstanding: roundMoney(
			customerOrders.reduce((s, o) => s + o.remainingDue, 0) +
				supplierDeals.reduce((s, d) => s + d.remainingDue, 0),
		),
		deliveredPartialCount: customerOrders.filter(
			(o) => o.paymentStatus === 'partial' && o.isDelivered,
		).length,
	}
}

// ─── Queries ──────────────────────────────────────────────

export const getFinanceInbox = createServerFn({ method: 'POST' })
	.inputValidator(z.object({}))
	.handler(async () => {
		return getSupabaseFinanceInbox()
	})

// ─── Mutations ────────────────────────────────────────────

const mutationInput = z.object({
	quoteId: z.string().optional(),
	dealId: z.string().optional(),
	proofUrl: z.string().min(1),
})

const followUpInput = z.object({
	quoteId: z.string().optional(),
	dealId: z.string().optional(),
	contactChannel: z.enum(FINANCE_FOLLOWUP_CHANNELS),
	outcome: z.string().trim().min(2).max(80),
	notes: z.string().trim().min(5).max(2000),
	followUpState: z.enum(FINANCE_FOLLOWUP_STATES),
	followUpDueAt: z.string().min(1),
})

function parseFollowUpDueAt(value: string): string {
	const parsed = new Date(value)
	if (Number.isNaN(parsed.getTime())) {
		throw new Error('Follow-up due date is invalid')
	}
	return parsed.toISOString()
}

function canAdvance(from: PaymentStatus, to: PaymentStatus): boolean {
	if (from === 'paid') return false
	if (from === 'partial' && to !== 'paid') return false
	// Unpaid can walk either to partial (50%) or jump straight to paid
	// (100%) — finance may collect the full amount in one shot.
	if (from === 'unpaid' && to !== 'partial' && to !== 'paid') return false
	return true
}

async function getSupabaseOrderPaymentTarget(orderId: string) {
	if (!isUuid(orderId)) return null
	const auth = await getInternalSupabaseClient()

	const { data: order, error: orderError } = await auth.client
		.from('orders')
		.select('id, total_amount')
		.eq('id', orderId)
		.maybeSingle()
	if (orderError) throw new Error(orderError.message)
	if (!order) return { auth, target: null }

	const { data: payments, error: paymentError } = await auth.client
		.from('customer_payments')
		.select(`
			amount,
			payment_fraction,
			proof_path,
			recorded_by_employee_id,
			created_at,
			employees (
				id,
				full_name,
				email
			)
		`)
		.eq('order_id', orderId)
		.eq('status', 'recorded')
	if (paymentError) throw new Error(paymentError.message)

	const totalDue = roundMoney(Number(order.total_amount))
	const summary = paymentSummary(
		totalDue,
		(payments ?? []) as SupabaseFinanceCustomerPaymentRow[],
	)
	return { auth, target: { totalDue, summary } }
}

async function getSupabaseDealPaymentTarget(dealId: string) {
	if (!isUuid(dealId)) return null
	const auth = await getInternalSupabaseClient()

	const { data: refill, error: refillError } = await auth.client
		.from('refill_requests')
		.select('id, quantity, unit_cost')
		.eq('id', dealId)
		.maybeSingle()
	if (refillError) throw new Error(refillError.message)
	if (!refill) return { auth, target: null }

	const { data: payments, error: paymentError } = await auth.client
		.from('supplier_payments')
		.select(`
			amount,
			payment_fraction,
			proof_path,
			recorded_by_employee_id,
			created_at,
			employees (
				id,
				full_name,
				email
			)
		`)
		.eq('refill_request_id', dealId)
		.eq('status', 'recorded')
	if (paymentError) throw new Error(paymentError.message)

	const totalDue = roundMoney(
		Number(refill.quantity) * Number(refill.unit_cost),
	)
	const summary = paymentSummary(
		totalDue,
		(payments ?? []) as SupabaseFinanceSupplierPaymentRow[],
	)
	return { auth, target: { totalDue, summary } }
}

function paymentAmountForTransition({
	totalDue,
	summary,
	transition,
}: {
	totalDue: number
	summary: PaymentSummary
	transition: 'partial' | 'paid'
}) {
	if (!canAdvance(summary.status, transition)) {
		return {
			ok: false as const,
			error: `Cannot move ${summary.status} → ${transition}`,
		}
	}

	const amount =
		transition === 'partial'
			? roundMoney(totalDue * PARTIAL_FRACTION)
			: summary.status === 'unpaid'
				? totalDue
				: summary.remainingDue

	return {
		ok: true as const,
		amount,
		fraction: transition === 'paid' ? 1 : PARTIAL_FRACTION,
	}
}

export const recordOrderPartialPayment = createServerFn({ method: 'POST' })
	.inputValidator(mutationInput)
	.handler(async ({ data }) => {
		if (!data.quoteId)
			return { success: false as const, error: 'quoteId required' }
		if (!data.proofUrl.trim()) {
			return { success: false as const, error: 'Proof of payment required' }
		}
		const supabaseTarget = await getSupabaseOrderPaymentTarget(data.quoteId)
		if (!supabaseTarget?.target) {
			return { success: false as const, error: 'Order not found' }
		}
		const payment = paymentAmountForTransition({
			totalDue: supabaseTarget.target.totalDue,
			summary: supabaseTarget.target.summary,
			transition: 'partial',
		})
		if (!payment.ok) return { success: false as const, error: payment.error }

		const { error } = await supabaseTarget.auth.client.rpc(
			'record_customer_payment',
			{
				p_order_id: data.quoteId,
				p_amount: payment.amount,
				p_payment_fraction: payment.fraction,
				p_proof_path: data.proofUrl.trim(),
			},
		)
		if (error) throw new Error(error.message)
		return {
			success: true as const,
			quoteId: data.quoteId,
			amountPaid: payment.amount,
		}
	})

export const recordOrderFullPayment = createServerFn({ method: 'POST' })
	.inputValidator(mutationInput)
	.handler(async ({ data }) => {
		if (!data.quoteId)
			return { success: false as const, error: 'quoteId required' }
		if (!data.proofUrl.trim()) {
			return { success: false as const, error: 'Proof of payment required' }
		}
		const supabaseTarget = await getSupabaseOrderPaymentTarget(data.quoteId)
		if (!supabaseTarget?.target) {
			return { success: false as const, error: 'Order not found' }
		}
		const payment = paymentAmountForTransition({
			totalDue: supabaseTarget.target.totalDue,
			summary: supabaseTarget.target.summary,
			transition: 'paid',
		})
		if (!payment.ok) return { success: false as const, error: payment.error }

		const { error } = await supabaseTarget.auth.client.rpc(
			'record_customer_payment',
			{
				p_order_id: data.quoteId,
				p_amount: payment.amount,
				p_payment_fraction: payment.fraction,
				p_proof_path: data.proofUrl.trim(),
			},
		)
		if (error) throw new Error(error.message)
		return { success: true as const, quoteId: data.quoteId }
	})

export const recordOrderFollowUp = createServerFn({ method: 'POST' })
	.inputValidator(followUpInput)
	.handler(async ({ data }) => {
		if (!data.quoteId)
			return { success: false as const, error: 'quoteId required' }
		const auth = await getInternalSupabaseClient()
		if (!isUuid(data.quoteId)) {
			return {
				success: false as const,
				error: 'Supabase finance follow-ups are unavailable',
			}
		}

		const { error } = await auth.client.rpc(
			'record_customer_payment_followup',
			{
				p_order_id: data.quoteId,
				p_contact_channel: data.contactChannel,
				p_outcome: data.outcome.trim(),
				p_notes: data.notes.trim(),
				p_follow_up_state: data.followUpState,
				p_follow_up_due_at: parseFollowUpDueAt(data.followUpDueAt),
			},
		)
		if (error) throw new Error(error.message)
		return {
			success: true as const,
			quoteId: data.quoteId,
		}
	})

// ─── Finance-side cancellation ───────────────────────────

const cancelInput = z.object({
	quoteId: z.string().optional(),
	dealId: z.string().optional(),
	reason: z.string().min(3),
	note: z.string().optional(),
})

/**
 * Cancel a customer order from the Finance panel. Walks rfq.status →
 * 'declined', flips quote.status → 'declined', stamps the living
 * document via markCanceled, and releases any reserved inventory back
 * to available. Blocks if the order is already fully paid — finance
 * refunds have to go through an explicit refund flow, not a cancel.
 */
export const cancelOrderFromFinance = createServerFn({ method: 'POST' })
	.inputValidator(cancelInput)
	.handler(async ({ data }) => {
		if (!data.quoteId)
			return { success: false as const, error: 'quoteId required' }
		if (!isUuid(data.quoteId)) {
			return { success: false as const, error: 'Order not found' }
		}
		const auth = await getInternalSupabaseClient()
		const { data: order, error } = await auth.client.rpc(
			'finance_cancel_customer_order',
			{
				p_order_id: data.quoteId,
				p_reason: data.reason,
				p_proof: {
					note: data.note ?? null,
					source: 'internal_finance',
				},
			},
		)
		if (error) throw new Error(error.message)
		return {
			success: true as const,
			quoteId:
				typeof order === 'object' &&
				order !== null &&
				'id' in order &&
				typeof order.id === 'string'
					? order.id
					: data.quoteId,
		}
	})

/**
 * Cancel a supplier deal from the Finance panel. Walks the deal into
 * a terminal state and releases any reserved obligations. Deals are
 * the supplier-side pipeline, so cancellation simply marks the deal
 * as closed and records why.
 */
export const cancelDealFromFinance = createServerFn({ method: 'POST' })
	.inputValidator(cancelInput)
	.handler(async ({ data }) => {
		if (!data.dealId)
			return { success: false as const, error: 'dealId required' }
		if (!isUuid(data.dealId)) {
			return { success: false as const, error: 'Deal not found' }
		}
		const auth = await getInternalSupabaseClient()
		const { data: refill, error } = await auth.client.rpc(
			'finance_cancel_supplier_refill',
			{
				p_refill_request_id: data.dealId,
				p_reason: data.reason,
				p_proof: {
					note: data.note ?? null,
					source: 'internal_finance',
				},
			},
		)
		if (error) throw new Error(error.message)
		return {
			success: true as const,
			dealId:
				typeof refill === 'object' &&
				refill !== null &&
				'id' in refill &&
				typeof refill.id === 'string'
					? refill.id
					: data.dealId,
		}
	})

export const recordDealPartialPayment = createServerFn({ method: 'POST' })
	.inputValidator(mutationInput)
	.handler(async ({ data }) => {
		if (!data.dealId)
			return { success: false as const, error: 'dealId required' }
		if (!data.proofUrl.trim()) {
			return { success: false as const, error: 'Proof of payment required' }
		}
		const supabaseTarget = await getSupabaseDealPaymentTarget(data.dealId)
		if (!supabaseTarget?.target) {
			return { success: false as const, error: 'Deal not found' }
		}
		const payment = paymentAmountForTransition({
			totalDue: supabaseTarget.target.totalDue,
			summary: supabaseTarget.target.summary,
			transition: 'partial',
		})
		if (!payment.ok) return { success: false as const, error: payment.error }

		const { error } = await supabaseTarget.auth.client.rpc(
			'record_supplier_payment',
			{
				p_refill_request_id: data.dealId,
				p_amount: payment.amount,
				p_payment_fraction: payment.fraction,
				p_proof_path: data.proofUrl.trim(),
			},
		)
		if (error) throw new Error(error.message)
		return {
			success: true as const,
			dealId: data.dealId,
			amountPaid: payment.amount,
		}
	})

export const recordDealFullPayment = createServerFn({ method: 'POST' })
	.inputValidator(mutationInput)
	.handler(async ({ data }) => {
		if (!data.dealId)
			return { success: false as const, error: 'dealId required' }
		if (!data.proofUrl.trim()) {
			return { success: false as const, error: 'Proof of payment required' }
		}
		const supabaseTarget = await getSupabaseDealPaymentTarget(data.dealId)
		if (!supabaseTarget?.target) {
			return { success: false as const, error: 'Deal not found' }
		}
		const payment = paymentAmountForTransition({
			totalDue: supabaseTarget.target.totalDue,
			summary: supabaseTarget.target.summary,
			transition: 'paid',
		})
		if (!payment.ok) return { success: false as const, error: payment.error }

		const { error } = await supabaseTarget.auth.client.rpc(
			'record_supplier_payment',
			{
				p_refill_request_id: data.dealId,
				p_amount: payment.amount,
				p_payment_fraction: payment.fraction,
				p_proof_path: data.proofUrl.trim(),
			},
		)
		if (error) throw new Error(error.message)
		return { success: true as const, dealId: data.dealId }
	})

export const recordDealFollowUp = createServerFn({ method: 'POST' })
	.inputValidator(followUpInput)
	.handler(async ({ data }) => {
		if (!data.dealId)
			return { success: false as const, error: 'dealId required' }
		const auth = await getInternalSupabaseClient()
		if (!isUuid(data.dealId)) {
			return {
				success: false as const,
				error: 'Supabase finance follow-ups are unavailable',
			}
		}

		const { error } = await auth.client.rpc(
			'record_supplier_payment_followup',
			{
				p_refill_request_id: data.dealId,
				p_contact_channel: data.contactChannel,
				p_outcome: data.outcome.trim(),
				p_notes: data.notes.trim(),
				p_follow_up_state: data.followUpState,
				p_follow_up_due_at: parseFollowUpDueAt(data.followUpDueAt),
			},
		)
		if (error) throw new Error(error.message)
		return { success: true as const, dealId: data.dealId }
	})
