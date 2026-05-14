/**
 * Mock in-memory database for the internal app during the dev phase.
 *
 * Seeded from the Markdown files under ./seed/*.md at module init. Every
 * server function in the internal app MUST read/write through this module
 * — never from local static maps. When Supabase lands, the body of this
 * file is the only thing that changes; every caller's contract stays the
 * same.
 *
 * Cross-app plan: in a later session this module moves to `packages/db/`
 * (or `@hyperquote/db`) so website / portal / admin dev modes can share
 * the same mock state. The loader already uses `import.meta.glob` which
 * works in any Vite consumer, so the move is a file-move + import rewrite.
 *
 * Design rules that keep the swap clean:
 *   1. All accessors are pure functions that take a table argument + filter.
 *   2. All mutators stamp updated_at and return the updated row.
 *   3. Derived state (freshness, primary cost lookups) is computed at read
 *      time, not stored, so a write doesn't need to update two places.
 *   4. Time fields in the seed are "daysAgo / hoursAgo" numbers which get
 *      rendered to ISO at load — seeds stay readable without daily rewrites.
 */

import {
	CATALOG_PRODUCTS,
	type CatalogProduct,
	getBroadCategory,
} from '@hyperquote/types'
import { loadSeed } from './md-loader'

// ─── Time helpers ─────────────────────────────────────────

const BOOT_AT = Date.now()
const hoursAgoIso = (h: number) =>
	new Date(BOOT_AT - h * 3_600_000).toISOString()
const daysAgoIso = (d: number) => hoursAgoIso(d * 24)
const hoursFromNowIso = (h: number) =>
	new Date(BOOT_AT + h * 3_600_000).toISOString()
const daysFromNowIso = (d: number) => hoursFromNowIso(d * 24)

export function hoursSince(iso: string): number {
	return (Date.now() - new Date(iso).getTime()) / 3_600_000
}

// ─── JSON value — keeps metadata columns serializable ────

export type JsonValue =
	| string
	| number
	| boolean
	| null
	| JsonValue[]
	| { [key: string]: JsonValue }

export type JsonObject = { [key: string]: JsonValue }

// ─── Table row types (DB-shaped) ──────────────────────────

export type SupplierTier = 'preferred' | 'approved' | 'conditional' | 'new'

export interface SupplierRow {
	name: string
	tier: SupplierTier
	paymentTerms: string
	phone: string | null
	rating: number
	customBadges: string[]
	joinedAt: string
}

export interface SupplierPriceRow {
	id: string // synthetic: `${productSlug}::${supplierName}`
	productSlug: string
	supplierName: string
	rawCost: number
	leadTimeDays: number
	minOrderQty: number
	lastQuotedAt: string
	isPrimary: boolean
	notes: string | null
}

interface RfqItemRow {
	productSlug: string
	quantity: number
}

interface RfqRow {
	id: string
	customerName: string
	customerTier: 'A' | 'B' | 'C' | 'new'
	contactName: string
	deliveryAddress: string
	deliveryCity: string
	estimatedValue: number
	lineItemCount: number
	status:
		| 'submitted'
		| 'assigned'
		| 'reviewing'
		| 'awaiting_clarification'
		| 'quoting'
		| 'quoted'
		| 'negotiating'
		| 'declined'
		| 'expired'
		| 'saved'
	assignedRep: string | null
	createdAt: string
	slaDeadline: string
	deliveryUrgency: number
	/** ISO timestamp — when a saved order should revert to submitted */
	savedUntil: string | null
	items: RfqItemRow[]
}

export interface CustomerRow {
	id: string
	companyName: string
	tier: 'A' | 'B' | 'C' | 'new'
	status: 'unclaimed' | 'claimed' | 'active' | 'inactive'
	contactName: string
	phone: string
	email: string | null
	address: string
	city: string
	creditLimit: number
	currentExposure: number
	orderCount: number
	lifetimeValue: number
	avgMargin: number
	paymentHistory: 'excellent' | 'good' | 'fair' | 'poor'
	assignedSalesRep: string | null
	joinedAt: string
}

interface QuoteItemRow {
	productSlug: string
	quantity: number
	marginPercent: number
	sellPrice: number
}

export type PaymentStatus = 'unpaid' | 'partial' | 'paid'

interface QuoteRow {
	id: string
	quoteNumber: string
	rfqId: string
	customerId: string
	version: number
	status:
		| 'draft'
		| 'internal_review'
		| 'pending_approval'
		| 'approved'
		| 'sent'
		| 'viewed'
		| 'negotiating'
		| 'revised'
		| 'accepted'
		| 'declined'
		| 'expired'
	marginPercent: number
	sentAt: string | null
	validUntil: string
	sentVia: 'portal' | 'email' | 'both' | null
	customerPoNumber: string | null
	previousVersionId: string | null
	items: QuoteItemRow[]
	// ── Delivery + commercial terms ────────────────────────
	// All nullable: when a draft is built from an RFQ these fall back to
	// the RFQ's delivery fields at read time. Once the rep edits them in
	// the quote builder the override persists on the quote row.
	deliveryAddress: string | null
	deliveryCity: string | null
	deliveryDate: string | null
	deliveryWindow: string | null
	specialInstructions: string | null
	paymentTerms: string | null
	earlyPaymentDiscount: string | null
	coverNote: string | null
	// ── Payment state (orthogonal to quote.status, set on acceptance) ──
	paymentStatus: PaymentStatus
	amountPaid: number
	totalDue: number
	partialPaidAt: string | null
	fullPaidAt: string | null
	partialProofUrl: string | null
	fullProofUrl: string | null
}

interface PriceUpdateRequestRow {
	id: string
	productSlug: string
	customerContext: string
	requestedAt: string
	status: 'pending' | 'resolved'
}

interface SalesRepRow {
	id: string
	name: string
	role: 'junior' | 'mid' | 'senior'
	activeRfqs: number
	specialization: string[]
	territories: string[]
}

export type OrderReportStage =
	| 'submitted'
	| 'evaluated'
	| 'finance_partial'
	| 'inventory_orders'
	| 'finance_full'
	| 'warehouse'
	| 'dispatch'
	| 'delivered'
	| 'canceled'
	| 'returned'

/**
 * A living report that accrues a new section each time the order is
 * evaluated into the next stage. Sections are a sparse map from stage →
 * data blob; unfilled stages render as placeholders in the viewer.
 */
export interface OrderReportRow {
	id: string
	rfqId: string
	currentStage: OrderReportStage
	canceledReason: string | null
	canceledNote: string | null
	canceledAt: string | null
	sections: Partial<Record<OrderReportStage, Record<string, unknown>>>
}

// ─── Trucks ──────────────────────────────────────────────

export type TruckStatus = 'available' | 'loading' | 'dispatched' | 'maintenance'
export type TruckBodyType = 'flatbed' | 'curtain-side' | 'box' | 'tipper'

export interface TruckRow {
	id: string
	plateNumber: string
	driverName: string
	driverPhone: string
	capacityTons: number
	bodyType: TruckBodyType
	status: TruckStatus
}

// ─── Employees ───────────────────────────────────────────

/**
 * Every person on the payroll. The HR panel (future phase) will add
 * role assignments, schedules, and attendance. For now the list is
 * role-less — downstream panels that need role filtering (e.g. which
 * employees are warehouse advisors) show the full list until the
 * role column lands.
 */
export interface EmployeeRow {
	id: string
	name: string
	name_ar: string
	phone: string
}

// ─── Conversations (support tickets) ─────────────────────

export type ChannelType = 'email' | 'live'
export type ConversationStatus = 'open' | 'pending' | 'resolved' | 'closed'
export type Priority = 'low' | 'medium' | 'high' | 'urgent'

export interface MessageRow {
	id: string
	conversationId: string
	channel: ChannelType
	direction: 'inbound' | 'outbound'
	content: string
	senderName: string
	timestamp: string
	attachments: Array<{
		id: string
		name: string
		type: string
		sizeBytes: number
		url: string
	}>
	read: boolean
	metadata: JsonObject
}

export interface LinkedOrderRef {
	id: string
	displayId: string
	rfqId: string | null
	status: string
	totalAmount: number
	currency: string
	createdAt: string
}

export interface LinkedQuoteRef {
	id: string
	displayId: string
	status: string
	totalAmount: number
	currency: string
	createdAt: string
}

export interface ConversationRow {
	id: string
	customerId: string
	channel: ChannelType
	status: ConversationStatus
	priority: Priority
	subject: string
	assignedTo: string | null
	assignedToName: string | null
	tags: string[]
	messages: MessageRow[]
	linkedOrders: LinkedOrderRef[]
	linkedQuotes: LinkedQuoteRef[]
	createdAt: string
	ticketId: string | null
	slaDeadline: string | null
	slaBreached: boolean
}

// ─── Stock + Deals ────────────────────────────────────────

interface StockRow {
	productSlug: string
	/** Physical on-hand stock in the warehouse. */
	stockLevel: number
	/**
	 * Stock that is physically present but committed to an approved order
	 * that hasn't been delivered yet. `availableLevel = stockLevel -
	 * reservedLevel`. On approve: `reserve`. On cancel after approve:
	 * `release`. On delivered: `consume` (drops both numbers by the qty).
	 */
	reservedLevel: number
	lowStockThreshold: number
}

type DealStatus =
	| 'pending_finance'
	| 'approved_by_finance'
	| 'approved_for_warehouse'
	| 'delivered'
	| 'closed'

/**
 * One product line inside a supplier deal. The inventory rep negotiates
 * one or more lines in a single call — "I want 10 tons of rebar, and
 * while you're at it, 200 bags of cement" — and the whole thing becomes
 * one DealRow with an `items` array.
 */
interface DealItemRow {
	productSlug: string
	agreedQty: number
	agreedRawCost: number
	/** Warehouse-side receive state — flips true once physically received. */
	received: boolean
	receivedAt: string | null
}

/**
 * Audit record for each warehouse receiving attempt on a deal. Appended
 * on every commit from the Receiving flow — successful or partial.
 * Rejected slugs stay on the deal waiting for the next delivery attempt.
 */
interface ReceivingAttempt {
	attemptedAt: string
	advisorId: string
	advisorName: string
	acceptedSlugs: string[]
	rejectedSlugs: string[]
	rejectionReason: string | null
	proofUrl: string
	securityMethod: 'password' | 'qr'
	securityToken: string
}

interface DealRow {
	id: string
	supplierName: string
	/**
	 * Every product negotiated in this call. Always at least one item.
	 * Finance views the full list on click so they can confirm they're
	 * paying for the right things before releasing money.
	 */
	items: DealItemRow[]
	status: DealStatus
	notes: string | null
	createdAt: string
	// ── Payment state (supplier-side, same shape as QuoteRow) ──
	paymentStatus: PaymentStatus
	amountPaid: number
	totalDue: number
	partialPaidAt: string | null
	fullPaidAt: string | null
	partialProofUrl: string | null
	fullProofUrl: string | null
	// ── Warehouse receiving state ─────────────────────────────
	receivingAttempts: ReceivingAttempt[]
	fullyReceivedAt: string | null
}

// ─── Raw seed types (pre-expansion) ───────────────────────

interface RawSupplier {
	name: string
	tier: SupplierTier
	paymentTerms: string
	phone: string | null
	rating: number
	customBadges: string[]
}

interface RawSupplierPrice {
	productSlug: string
	supplierName: string
	rawCost: number
	leadTimeDays: number
	minOrderQty: number
	lastQuotedAtDaysAgo: number
	isPrimary: boolean
	notes: string | null
}

interface RawRfq {
	id: string
	customerName: string
	customerTier: 'A' | 'B' | 'C' | 'new'
	contactName: string
	deliveryAddress: string
	deliveryCity: string
	estimatedValue: number
	lineItemCount: number
	status: RfqRow['status']
	assignedRep: string | null
	createdAtHoursAgo: number
	slaHoursFromNow: number
	deliveryUrgencyDays: number
	items: RfqItemRow[]
}

interface RawCustomer {
	id: string
	companyName: string
	tier: 'A' | 'B' | 'C' | 'new'
	status: CustomerRow['status']
	contactName: string
	phone: string
	email: string | null
	address: string
	city: string
	creditLimit: number
	currentExposure: number
	orderCount: number
	lifetimeValue: number
	avgMargin: number
	paymentHistory: CustomerRow['paymentHistory']
	assignedSalesRep: string | null
	joinedAtDaysAgo: number
}

interface RawQuote {
	id: string
	quoteNumber: string
	rfqId: string
	customerId: string
	version: number
	status: QuoteRow['status']
	marginPercent: number
	sentAtHoursAgo: number | null
	validUntilDaysFromNow: number
	sentVia: QuoteRow['sentVia']
	customerPoNumber: string | null
	previousVersionId: string | null
	items: QuoteItemRow[]
	paymentStatus?: PaymentStatus
	amountPaid?: number
	totalDue?: number
}

interface RawPriceUpdateRequest {
	id: string
	productSlug: string
	customerContext: string
	requestedAtHoursAgo: number
	status: PriceUpdateRequestRow['status']
}

interface RawSalesRep {
	id: string
	name: string
	role: SalesRepRow['role']
	activeRfqs: number
	specialization: string[]
	territories: string[]
}

interface RawOrderReport {
	id: string
	rfqId: string
	currentStage: OrderReportStage
	canceledReason: string | null
	canceledNote?: string | null
	canceledAtHoursAgo: number | null
	sections: Partial<Record<OrderReportStage, Record<string, unknown>>>
}

interface RawConversationMessage {
	id: string
	channel: ChannelType
	direction: 'inbound' | 'outbound'
	content: string
	senderName: string
	minutesAgo: number
	read: boolean
	metadata: JsonObject
}

interface RawLinkedOrder {
	id: string
	displayId: string
	rfqId: string | null
	status: string
	totalAmount: number
	currency: string
	createdAtMinutesAgo: number
}

interface RawLinkedQuote {
	id: string
	displayId: string
	status: string
	totalAmount: number
	currency: string
	createdAtMinutesAgo: number
}

interface RawConversation {
	id: string
	customerId: string
	channel: ChannelType
	status: ConversationStatus
	priority: Priority
	subject: string
	assignedTo: string | null
	assignedToName: string | null
	tags: string[]
	ticketId: string | null
	slaDeadlineMinutesFromNow: number | null
	slaBreached: boolean
	createdAtMinutesAgo: number
	linkedOrders: RawLinkedOrder[]
	linkedQuotes: RawLinkedQuote[]
	messages: RawConversationMessage[]
}

interface RawStock {
	productSlug: string
	stockLevel: number
	lowStockThreshold: number
	reservedLevel?: number
}

interface RawDeal {
	id: string
	supplierName: string
	items: DealItemRow[]
	status: DealStatus
	notes?: string | null
	createdAtHoursAgo: number
	paymentStatus?: PaymentStatus
	amountPaid?: number
	totalDue?: number
}

// ─── In-memory tables ─────────────────────────────────────
//
// Tables are pinned on globalThis so Vite HMR reloads of this module (which
// happen on any server file edit in dev) don't wipe user mutations. In prod,
// the globalThis key is still used but the module only loads once, so the
// initializer runs exactly once — no behavioral difference.

interface HqDbState {
	suppliers: Map<string, SupplierRow>
	supplierPrices: SupplierPriceRow[]
	rfqs: RfqRow[]
	customers: Map<string, CustomerRow>
	quotes: QuoteRow[]
	priceUpdateRequests: PriceUpdateRequestRow[]
	salesReps: SalesRepRow[]
	orderReports: OrderReportRow[]
	stock: StockRow[]
	deals: DealRow[]
	trucks: TruckRow[]
	employees: EmployeeRow[]
	conversations: ConversationRow[]
	products: CatalogProduct[]
}

// v17 adds the mutable products table seeded from CATALOG_PRODUCTS.
const HQ_DB_KEY = '__hqInternalDb_v17__' as const
type GlobalWithDb = typeof globalThis & { [HQ_DB_KEY]?: HqDbState }
const g = globalThis as GlobalWithDb

/**
 * Deep clone a product record so admin mutations never leak back into the
 * compiled CATALOG_PRODUCTS constant. `specifications` is a nested object,
 * so structuredClone is the safest copy.
 */
function cloneProduct(p: CatalogProduct): CatalogProduct {
	return structuredClone(p)
}

function buildInitialState(): HqDbState {
	const rawSuppliers = loadSeed<RawSupplier[]>('suppliers')
	const rawPrices = loadSeed<RawSupplierPrice[]>('supplier_prices')
	const rawRfqs = loadSeed<RawRfq[]>('rfqs')
	const rawCustomers = loadSeed<RawCustomer[]>('customers')
	const rawQuotes = loadSeed<RawQuote[]>('quotes')
	const rawRequests = loadSeed<RawPriceUpdateRequest[]>('price_update_requests')
	const rawSalesReps = loadSeed<RawSalesRep[]>('sales_reps')
	const rawOrderReports = loadSeed<RawOrderReport[]>('order_reports')
	const rawStock = loadSeed<RawStock[]>('inventory_stock')
	const rawDeals = loadSeed<RawDeal[]>('deals')
	const rawTrucks = loadSeed<TruckRow[]>('trucks')
	const rawEmployees = loadSeed<EmployeeRow[]>('employees')
	const rawConversations = loadSeed<RawConversation[]>('conversations')

	const minutesAgoIso = (m: number) =>
		new Date(BOOT_AT - m * 60_000).toISOString()
	const minutesFromNowIso = (m: number) =>
		new Date(BOOT_AT + m * 60_000).toISOString()

	return {
		suppliers: new Map<string, SupplierRow>(
			rawSuppliers.map((s) => [s.name, { ...s, joinedAt: daysAgoIso(120) }]),
		),
		supplierPrices: rawPrices.map((r) => ({
			id: `${r.productSlug}::${r.supplierName}`,
			productSlug: r.productSlug,
			supplierName: r.supplierName,
			rawCost: r.rawCost,
			leadTimeDays: r.leadTimeDays,
			minOrderQty: r.minOrderQty,
			lastQuotedAt: daysAgoIso(r.lastQuotedAtDaysAgo),
			isPrimary: r.isPrimary,
			notes: r.notes,
		})),
		rfqs: rawRfqs.map((r) => ({
			id: r.id,
			customerName: r.customerName,
			customerTier: r.customerTier,
			contactName: r.contactName,
			deliveryAddress: r.deliveryAddress,
			deliveryCity: r.deliveryCity,
			estimatedValue: r.estimatedValue,
			lineItemCount: r.lineItemCount,
			status: r.status,
			assignedRep: r.assignedRep,
			createdAt: hoursAgoIso(r.createdAtHoursAgo),
			slaDeadline: hoursFromNowIso(r.slaHoursFromNow),
			deliveryUrgency: r.deliveryUrgencyDays,
			savedUntil: null,
			items: r.items,
		})),
		customers: new Map<string, CustomerRow>(
			rawCustomers.map((c) => [
				c.id,
				{ ...c, joinedAt: daysAgoIso(c.joinedAtDaysAgo) },
			]),
		),
		quotes: rawQuotes.map((q) => {
			const derivedTotal = q.items.reduce(
				(s, i) => s + i.sellPrice * i.quantity,
				0,
			)
			const totalDue = Math.round((q.totalDue ?? derivedTotal) * 100) / 100
			// Accepted quotes with no explicit payment state default to unpaid
			// so Finance has something to work on; other statuses default to
			// unpaid too but never surface through the finance inbox.
			const paymentStatus: PaymentStatus = q.paymentStatus ?? 'unpaid'
			return {
				id: q.id,
				quoteNumber: q.quoteNumber,
				rfqId: q.rfqId,
				customerId: q.customerId,
				version: q.version,
				status: q.status,
				marginPercent: q.marginPercent,
				sentAt: q.sentAtHoursAgo == null ? null : hoursAgoIso(q.sentAtHoursAgo),
				validUntil: daysFromNowIso(q.validUntilDaysFromNow),
				sentVia: q.sentVia,
				customerPoNumber: q.customerPoNumber,
				previousVersionId: q.previousVersionId,
				items: q.items,
				deliveryAddress: null,
				deliveryCity: null,
				deliveryDate: null,
				deliveryWindow: null,
				specialInstructions: null,
				paymentTerms: null,
				earlyPaymentDiscount: null,
				coverNote: null,
				paymentStatus,
				amountPaid: q.amountPaid ?? 0,
				totalDue,
				partialPaidAt: null,
				fullPaidAt: null,
				partialProofUrl: null,
				fullProofUrl: null,
			}
		}),
		priceUpdateRequests: rawRequests.map((r) => ({
			id: r.id,
			productSlug: r.productSlug,
			customerContext: r.customerContext,
			requestedAt: hoursAgoIso(r.requestedAtHoursAgo),
			status: r.status,
		})),
		salesReps: rawSalesReps.map((r) => ({ ...r })),
		orderReports: rawOrderReports.map((r) => ({
			id: r.id,
			rfqId: r.rfqId,
			currentStage: r.currentStage,
			canceledReason: r.canceledReason,
			canceledNote: r.canceledNote ?? null,
			canceledAt:
				r.canceledAtHoursAgo == null ? null : hoursAgoIso(r.canceledAtHoursAgo),
			sections: r.sections,
		})),
		stock: rawStock.map((r) => ({
			productSlug: r.productSlug,
			stockLevel: r.stockLevel,
			reservedLevel: r.reservedLevel ?? 0,
			lowStockThreshold: r.lowStockThreshold,
		})),
		deals: rawDeals.map((r) => {
			const derivedTotal = r.items.reduce(
				(s, i) => s + i.agreedQty * i.agreedRawCost,
				0,
			)
			return {
				id: r.id,
				supplierName: r.supplierName,
				items: r.items.map((i) => ({
					productSlug: i.productSlug,
					agreedQty: i.agreedQty,
					agreedRawCost: i.agreedRawCost,
					received: false,
					receivedAt: null,
				})),
				status: r.status,
				notes: r.notes ?? null,
				createdAt: hoursAgoIso(r.createdAtHoursAgo),
				paymentStatus: r.paymentStatus ?? 'unpaid',
				amountPaid: r.amountPaid ?? 0,
				totalDue: Math.round((r.totalDue ?? derivedTotal) * 100) / 100,
				partialPaidAt: null,
				fullPaidAt: null,
				partialProofUrl: null,
				fullProofUrl: null,
				receivingAttempts: [],
				fullyReceivedAt: null,
			}
		}),
		trucks: rawTrucks.map((t) => ({ ...t })),
		employees: rawEmployees.map((e) => ({ ...e })),
		conversations: rawConversations.map(
			(c): ConversationRow => ({
				id: c.id,
				customerId: c.customerId,
				channel: c.channel,
				status: c.status,
				priority: c.priority,
				subject: c.subject,
				assignedTo: c.assignedTo,
				assignedToName: c.assignedToName,
				tags: c.tags,
				ticketId: c.ticketId,
				slaDeadline:
					c.slaDeadlineMinutesFromNow != null
						? minutesFromNowIso(c.slaDeadlineMinutesFromNow)
						: null,
				slaBreached: c.slaBreached,
				createdAt: minutesAgoIso(c.createdAtMinutesAgo),
				linkedOrders: c.linkedOrders.map((o) => ({
					id: o.id,
					displayId: o.displayId,
					rfqId: o.rfqId,
					status: o.status,
					totalAmount: o.totalAmount,
					currency: o.currency,
					createdAt: minutesAgoIso(o.createdAtMinutesAgo),
				})),
				linkedQuotes: c.linkedQuotes.map((q) => ({
					id: q.id,
					displayId: q.displayId,
					status: q.status,
					totalAmount: q.totalAmount,
					currency: q.currency,
					createdAt: minutesAgoIso(q.createdAtMinutesAgo),
				})),
				messages: c.messages.map(
					(m): MessageRow => ({
						id: m.id,
						conversationId: c.id,
						channel: m.channel,
						direction: m.direction,
						content: m.content,
						senderName: m.senderName,
						timestamp: minutesAgoIso(m.minutesAgo),
						attachments: [],
						read: m.read,
						metadata: m.metadata,
					}),
				),
			}),
		),
		products: CATALOG_PRODUCTS.map(cloneProduct),
	}
}

function getOrInitState(): HqDbState {
	const existing = g[HQ_DB_KEY]
	if (existing) return existing
	const fresh = buildInitialState()
	g[HQ_DB_KEY] = fresh
	return fresh
}

const state: HqDbState = getOrInitState()

const suppliers = state.suppliers
const supplierPrices = state.supplierPrices
const rfqs = state.rfqs
const customers = state.customers
const quotes = state.quotes
const priceUpdateRequests = state.priceUpdateRequests
const salesReps = state.salesReps
const orderReports = state.orderReports
const stock = state.stock
const deals = state.deals
const trucks = state.trucks
const employees = state.employees
const conversations = state.conversations
const products = state.products

// ─── Accessors ────────────────────────────────────────────

export const db = {
	// ── Products ──
	products: {
		list(): CatalogProduct[] {
			return products
		},
		get(id: string): CatalogProduct | undefined {
			return products.find((p) => p.id === id)
		},
		findBySlug(slug: string): CatalogProduct | undefined {
			return products.find((p) => p.slug === slug)
		},
		findByName(name: string): CatalogProduct | undefined {
			return products.find((p) => p.name === name)
		},
		broadCategoryFor(product: CatalogProduct) {
			return getBroadCategory(product.category)
		},
		insert(row: Omit<CatalogProduct, 'id'>): CatalogProduct {
			const id = `p-${String(products.length + 1).padStart(3, '0')}-${Date.now().toString(36).slice(-4)}`
			const full: CatalogProduct = { ...row, id }
			products.push(full)
			return full
		},
		update(
			id: string,
			patch: Partial<Omit<CatalogProduct, 'id'>>,
		): CatalogProduct | undefined {
			const idx = products.findIndex((p) => p.id === id)
			if (idx === -1) return undefined
			products[idx] = { ...products[idx], ...patch }
			return products[idx]
		},
		remove(id: string): boolean {
			const idx = products.findIndex((p) => p.id === id)
			if (idx === -1) return false
			products.splice(idx, 1)
			return true
		},
	},

	// ── Suppliers ──
	suppliers: {
		list(): SupplierRow[] {
			return Array.from(suppliers.values())
		},
		get(name: string): SupplierRow | undefined {
			return suppliers.get(name)
		},
		upsert(
			name: string,
			patch: Partial<Omit<SupplierRow, 'name'>>,
		): SupplierRow {
			const existing =
				suppliers.get(name) ??
				({
					name,
					tier: 'new',
					paymentTerms: '—',
					phone: null,
					rating: 3,
					customBadges: [],
					joinedAt: new Date().toISOString(),
				} satisfies SupplierRow)
			const next: SupplierRow = { ...existing, ...patch }
			suppliers.set(name, next)
			return next
		},
		addBadge(name: string, badge: string) {
			const s = suppliers.get(name)
			if (!s) return
			if (!s.customBadges.includes(badge)) {
				s.customBadges = [...s.customBadges, badge]
			}
		},
		removeBadge(name: string, badge: string) {
			const s = suppliers.get(name)
			if (!s) return
			s.customBadges = s.customBadges.filter((b) => b !== badge)
		},
		remove(name: string): boolean {
			return suppliers.delete(name)
		},
	},

	// ── Supplier prices ──
	supplierPrices: {
		all(): SupplierPriceRow[] {
			return supplierPrices
		},
		forProduct(productSlug: string): SupplierPriceRow[] {
			return supplierPrices.filter((p) => p.productSlug === productSlug)
		},
		primaryForProduct(productSlug: string): SupplierPriceRow | undefined {
			return supplierPrices.find(
				(p) => p.productSlug === productSlug && p.isPrimary,
			)
		},
		forSupplier(supplierName: string): SupplierPriceRow[] {
			return supplierPrices.filter((p) => p.supplierName === supplierName)
		},
		getById(id: string): SupplierPriceRow | undefined {
			return supplierPrices.find((p) => p.id === id)
		},
		updateCost(
			id: string,
			rawCost: number,
			notes?: string | null,
		): SupplierPriceRow | undefined {
			const row = supplierPrices.find((p) => p.id === id)
			if (!row) return undefined
			row.rawCost = rawCost
			row.lastQuotedAt = new Date().toISOString()
			if (notes !== undefined) row.notes = notes
			return row
		},
		insert(row: {
			productSlug: string
			supplierName: string
			rawCost: number
			leadTimeDays: number
			minOrderQty: number
			isPrimary: boolean
			notes: string | null
		}): SupplierPriceRow {
			const id = `${row.productSlug}::${row.supplierName}`
			// Prevent duplicate (supplier, product) pairs — caller should pick a
			// product not already in the supplier's list.
			if (supplierPrices.some((p) => p.id === id)) {
				throw new Error(
					`Supplier ${row.supplierName} already lists ${row.productSlug}`,
				)
			}
			const full: SupplierPriceRow = {
				id,
				productSlug: row.productSlug,
				supplierName: row.supplierName,
				rawCost: row.rawCost,
				leadTimeDays: row.leadTimeDays,
				minOrderQty: row.minOrderQty,
				lastQuotedAt: new Date().toISOString(),
				isPrimary: row.isPrimary,
				notes: row.notes,
			}
			supplierPrices.push(full)
			return full
		},
		update(
			id: string,
			patch: Partial<
				Omit<SupplierPriceRow, 'id' | 'productSlug' | 'supplierName'>
			>,
		): SupplierPriceRow | undefined {
			const idx = supplierPrices.findIndex((p) => p.id === id)
			if (idx === -1) return undefined
			const next = { ...supplierPrices[idx], ...patch }
			// Any mutation counts as a fresh quote for the row — keeps the
			// staleness logic consistent across UpdateCost and arbitrary patches.
			next.lastQuotedAt = new Date().toISOString()
			supplierPrices[idx] = next
			return next
		},
		remove(id: string): boolean {
			const idx = supplierPrices.findIndex((p) => p.id === id)
			if (idx === -1) return false
			supplierPrices.splice(idx, 1)
			return true
		},
		/** Drops every price row belonging to a supplier. Returns the count. */
		removeForSupplier(supplierName: string): number {
			let removed = 0
			for (let i = supplierPrices.length - 1; i >= 0; i--) {
				if (supplierPrices[i].supplierName === supplierName) {
					supplierPrices.splice(i, 1)
					removed++
				}
			}
			return removed
		},
		/**
		 * Cascades a supplier rename through supplierPrices: rewrites every
		 * affected row's `supplierName` + synthetic `id`. Called from the
		 * admin supplier rename path so sub-table integrity holds.
		 */
		renameSupplier(oldName: string, newName: string): number {
			let renamed = 0
			for (const row of supplierPrices) {
				if (row.supplierName === oldName) {
					row.supplierName = newName
					row.id = `${row.productSlug}::${newName}`
					renamed++
				}
			}
			return renamed
		},
	},

	// ── RFQs ──
	rfqs: {
		list(): RfqRow[] {
			return rfqs
		},
		get(id: string): RfqRow | undefined {
			return rfqs.find((r) => r.id === id)
		},
		assign(id: string, rep: string) {
			const r = rfqs.find((x) => x.id === id)
			if (!r) return
			r.assignedRep = rep
			if (r.status === 'submitted') r.status = 'assigned'
		},
		updateStatus(id: string, status: RfqRow['status']): RfqRow | undefined {
			const r = rfqs.find((x) => x.id === id)
			if (!r) return undefined
			r.status = status
			return r
		},
	},

	// ── Customers ──
	customers: {
		list(): CustomerRow[] {
			return Array.from(customers.values())
		},
		get(id: string): CustomerRow | undefined {
			return customers.get(id)
		},
		findByName(name: string): CustomerRow | undefined {
			return Array.from(customers.values()).find((c) => c.companyName === name)
		},
		insert(row: Omit<CustomerRow, 'id' | 'joinedAt'>): CustomerRow {
			const id = `cust-${String(customers.size + 1).padStart(3, '0')}-${Date.now().toString(36).slice(-4)}`
			const full: CustomerRow = {
				...row,
				id,
				joinedAt: new Date().toISOString(),
			}
			customers.set(id, full)
			return full
		},
		update(
			id: string,
			patch: Partial<Omit<CustomerRow, 'id' | 'joinedAt'>>,
		): CustomerRow | undefined {
			const existing = customers.get(id)
			if (!existing) return undefined
			const next = { ...existing, ...patch }
			customers.set(id, next)
			return next
		},
		remove(id: string): boolean {
			return customers.delete(id)
		},
	},

	// ── Quotes ──
	quotes: {
		list(): QuoteRow[] {
			return quotes
		},
		get(id: string): QuoteRow | undefined {
			return quotes.find((q) => q.id === id)
		},
		forRfq(rfqId: string): QuoteRow[] {
			return quotes.filter((q) => q.rfqId === rfqId)
		},
		forCustomer(customerId: string): QuoteRow[] {
			return quotes.filter((q) => q.customerId === customerId)
		},
		insert(
			row: Omit<
				QuoteRow,
				| 'id'
				| 'paymentStatus'
				| 'amountPaid'
				| 'totalDue'
				| 'partialPaidAt'
				| 'fullPaidAt'
				| 'partialProofUrl'
				| 'fullProofUrl'
				| 'deliveryAddress'
				| 'deliveryCity'
				| 'deliveryDate'
				| 'deliveryWindow'
				| 'specialInstructions'
				| 'paymentTerms'
				| 'earlyPaymentDiscount'
				| 'coverNote'
			> &
				Partial<
					Pick<
						QuoteRow,
						| 'paymentStatus'
						| 'amountPaid'
						| 'totalDue'
						| 'partialPaidAt'
						| 'fullPaidAt'
						| 'partialProofUrl'
						| 'fullProofUrl'
						| 'deliveryAddress'
						| 'deliveryCity'
						| 'deliveryDate'
						| 'deliveryWindow'
						| 'specialInstructions'
						| 'paymentTerms'
						| 'earlyPaymentDiscount'
						| 'coverNote'
					>
				>,
		): QuoteRow {
			const id = `qt-${Date.now()}`
			const derivedTotal = row.items.reduce(
				(s, i) => s + i.sellPrice * i.quantity,
				0,
			)
			const full: QuoteRow = {
				...row,
				id,
				deliveryAddress: row.deliveryAddress ?? null,
				deliveryCity: row.deliveryCity ?? null,
				deliveryDate: row.deliveryDate ?? null,
				deliveryWindow: row.deliveryWindow ?? null,
				specialInstructions: row.specialInstructions ?? null,
				paymentTerms: row.paymentTerms ?? null,
				earlyPaymentDiscount: row.earlyPaymentDiscount ?? null,
				coverNote: row.coverNote ?? null,
				paymentStatus: row.paymentStatus ?? 'unpaid',
				amountPaid: row.amountPaid ?? 0,
				totalDue: row.totalDue ?? Math.round(derivedTotal * 100) / 100,
				partialPaidAt: row.partialPaidAt ?? null,
				fullPaidAt: row.fullPaidAt ?? null,
				partialProofUrl: row.partialProofUrl ?? null,
				fullProofUrl: row.fullProofUrl ?? null,
			}
			quotes.push(full)
			return full
		},
		updateStatus(id: string, status: QuoteRow['status']): QuoteRow | undefined {
			const q = quotes.find((x) => x.id === id)
			if (!q) return undefined
			q.status = status
			return q
		},
		update(
			id: string,
			patch: Partial<Omit<QuoteRow, 'id'>>,
		): QuoteRow | undefined {
			const idx = quotes.findIndex((x) => x.id === id)
			if (idx === -1) return undefined
			quotes[idx] = { ...quotes[idx], ...patch }
			return quotes[idx]
		},
	},

	// ── Price update requests ──
	priceUpdateRequests: {
		pending(): PriceUpdateRequestRow[] {
			return priceUpdateRequests.filter((r) => r.status === 'pending')
		},
		forProduct(productSlug: string): PriceUpdateRequestRow[] {
			return priceUpdateRequests.filter(
				(r) => r.productSlug === productSlug && r.status === 'pending',
			)
		},
		insert(
			productSlug: string,
			customerContext: string,
			rfqId?: string,
		): PriceUpdateRequestRow {
			const row: PriceUpdateRequestRow = {
				id: `pur-${Date.now()}-${priceUpdateRequests.length}`,
				productSlug,
				customerContext: rfqId
					? `${customerContext} (${rfqId})`
					: customerContext,
				requestedAt: new Date().toISOString(),
				status: 'pending',
			}
			priceUpdateRequests.push(row)
			return row
		},
		resolveFor(productSlug: string) {
			for (const r of priceUpdateRequests) {
				if (r.productSlug === productSlug && r.status === 'pending') {
					r.status = 'resolved'
				}
			}
		},
	},

	// ── Sales reps ──
	salesReps: {
		list(): SalesRepRow[] {
			return salesReps
		},
		get(id: string): SalesRepRow | undefined {
			return salesReps.find((r) => r.id === id)
		},
		findByName(name: string): SalesRepRow | undefined {
			return salesReps.find((r) => r.name === name)
		},
	},

	// ── Order reports (the living document) ──
	orderReports: {
		list(): OrderReportRow[] {
			return orderReports
		},
		get(id: string): OrderReportRow | undefined {
			return orderReports.find((r) => r.id === id)
		},
		forRfq(rfqId: string): OrderReportRow | undefined {
			return orderReports.find((r) => r.rfqId === rfqId)
		},
		/**
		 * Ensures a report exists for an RFQ — creates one with a submitted
		 * section derived from the RFQ if none exists. Used by any mutation
		 * that needs to stamp a new section (decline, quote, payment, etc.).
		 */
		ensureForRfq(rfqId: string): OrderReportRow | undefined {
			let row = orderReports.find((r) => r.rfqId === rfqId)
			if (row) return row
			const rfq = rfqs.find((r) => r.id === rfqId)
			if (!rfq) return undefined
			row = {
				id: `rep-${orderReports.length + 1}-${Date.now().toString(36).slice(-4)}`,
				rfqId,
				currentStage: 'submitted',
				canceledReason: null,
				canceledNote: null,
				canceledAt: null,
				sections: {
					submitted: {
						customerName: rfq.customerName,
						customerTier: rfq.customerTier,
						contactName: rfq.contactName,
						phone: '',
						deliveryAddress: rfq.deliveryAddress,
						deliveryCity: rfq.deliveryCity,
						deliveryUrgencyDays: rfq.deliveryUrgency,
						items: rfq.items,
					},
				},
			}
			orderReports.push(row)
			return row
		},
		appendSection(
			rfqId: string,
			stage: OrderReportStage,
			data: Record<string, unknown>,
		): OrderReportRow | undefined {
			const row = orderReports.find((r) => r.rfqId === rfqId)
			if (!row) return undefined
			row.sections[stage] = data
			row.currentStage = stage
			return row
		},
		markCanceled(
			rfqId: string,
			reason: string,
			note?: string | null,
		): OrderReportRow | undefined {
			const row = orderReports.find((r) => r.rfqId === rfqId)
			if (!row) return undefined
			row.currentStage = 'canceled'
			row.canceledReason = reason
			row.canceledNote = note ?? null
			row.canceledAt = new Date().toISOString()
			return row
		},
	},

	// ── Stock (inventory on-hand + reservations) ──
	stock: {
		list(): StockRow[] {
			return stock
		},
		forProduct(productSlug: string): StockRow | undefined {
			return stock.find((r) => r.productSlug === productSlug)
		},
		/** Unconstrained physical adjustment — use for refills arriving, etc. */
		adjust(productSlug: string, delta: number): StockRow | undefined {
			const row = stock.find((r) => r.productSlug === productSlug)
			if (!row) return undefined
			row.stockLevel = Math.max(0, row.stockLevel + delta)
			return row
		},
		setLevel(productSlug: string, level: number): StockRow | undefined {
			const row = stock.find((r) => r.productSlug === productSlug)
			if (!row) return undefined
			row.stockLevel = Math.max(0, level)
			return row
		},
		/**
		 * Lock `qty` units against new orders without removing them from the
		 * warehouse. Approving an order calls this. `availableLevel` drops;
		 * `stockLevel` stays. Clamps to physical stock so we never reserve
		 * more than we actually have.
		 */
		reserve(productSlug: string, qty: number): StockRow | undefined {
			const row = stock.find((r) => r.productSlug === productSlug)
			if (!row) return undefined
			const maxNew = Math.max(0, row.stockLevel - row.reservedLevel)
			row.reservedLevel += Math.min(qty, maxNew)
			return row
		},
		/**
		 * Give reserved stock back to available — used when an approved order
		 * is canceled before delivery.
		 */
		release(productSlug: string, qty: number): StockRow | undefined {
			const row = stock.find((r) => r.productSlug === productSlug)
			if (!row) return undefined
			row.reservedLevel = Math.max(0, row.reservedLevel - qty)
			return row
		},
		/**
		 * Permanently remove reserved stock from the warehouse — used when the
		 * order is physically delivered. Drops both `stockLevel` and
		 * `reservedLevel` by `qty`.
		 */
		consume(productSlug: string, qty: number): StockRow | undefined {
			const row = stock.find((r) => r.productSlug === productSlug)
			if (!row) return undefined
			const take = Math.min(qty, row.reservedLevel, row.stockLevel)
			row.stockLevel -= take
			row.reservedLevel -= take
			return row
		},
	},

	// ── Deals (supplier phone-call outcomes) ──
	deals: {
		list(): DealRow[] {
			return deals
		},
		forProduct(productSlug: string): DealRow[] {
			return deals.filter((d) =>
				d.items.some((i) => i.productSlug === productSlug),
			)
		},
		forStatus(status: DealStatus): DealRow[] {
			return deals.filter((d) => d.status === status)
		},
		insert(
			row: {
				supplierName: string
				items: Array<{
					productSlug: string
					agreedQty: number
					agreedRawCost: number
				}>
				status: DealStatus
				notes: string | null
			} & Partial<{
				paymentStatus: PaymentStatus
				amountPaid: number
				totalDue: number
			}>,
		): DealRow {
			const derivedTotal = row.items.reduce(
				(s, i) => s + i.agreedQty * i.agreedRawCost,
				0,
			)
			const full: DealRow = {
				id: `deal-${Date.now().toString(36)}-${deals.length + 1}`,
				supplierName: row.supplierName,
				items: row.items.map((i) => ({
					productSlug: i.productSlug,
					agreedQty: i.agreedQty,
					agreedRawCost: i.agreedRawCost,
					received: false,
					receivedAt: null,
				})),
				status: row.status,
				notes: row.notes,
				createdAt: new Date().toISOString(),
				paymentStatus: row.paymentStatus ?? 'unpaid',
				amountPaid: row.amountPaid ?? 0,
				totalDue: row.totalDue ?? Math.round(derivedTotal * 100) / 100,
				partialPaidAt: null,
				fullPaidAt: null,
				partialProofUrl: null,
				fullProofUrl: null,
				receivingAttempts: [],
				fullyReceivedAt: null,
			}
			deals.push(full)
			return full
		},
		updateStatus(id: string, status: DealStatus): DealRow | undefined {
			const row = deals.find((d) => d.id === id)
			if (!row) return undefined
			row.status = status
			return row
		},
	},

	// ── Trucks (warehouse dock fleet) ──
	trucks: {
		list(): TruckRow[] {
			return trucks
		},
		get(id: string): TruckRow | undefined {
			return trucks.find((t) => t.id === id)
		},
		available(): TruckRow[] {
			return trucks.filter((t) => t.status === 'available')
		},
		setStatus(id: string, status: TruckStatus): TruckRow | undefined {
			const row = trucks.find((t) => t.id === id)
			if (!row) return undefined
			row.status = status
			return row
		},
		insert(row: Omit<TruckRow, 'id'>): TruckRow {
			const id = `tr-${String(trucks.length + 1).padStart(3, '0')}-${Date.now().toString(36).slice(-4)}`
			const full: TruckRow = { ...row, id }
			trucks.push(full)
			return full
		},
		update(
			id: string,
			patch: Partial<Omit<TruckRow, 'id'>>,
		): TruckRow | undefined {
			const idx = trucks.findIndex((t) => t.id === id)
			if (idx === -1) return undefined
			trucks[idx] = { ...trucks[idx], ...patch }
			return trucks[idx]
		},
		remove(id: string): boolean {
			const idx = trucks.findIndex((t) => t.id === id)
			if (idx === -1) return false
			trucks.splice(idx, 1)
			return true
		},
	},

	// ── Employees (payroll directory) ──
	employees: {
		list(): EmployeeRow[] {
			return employees
		},
		get(id: string): EmployeeRow | undefined {
			return employees.find((e) => e.id === id)
		},
		insert(row: Omit<EmployeeRow, 'id'>): EmployeeRow {
			const id = `emp-${String(employees.length + 1).padStart(3, '0')}-${Date.now().toString(36).slice(-4)}`
			const full: EmployeeRow = { ...row, id }
			employees.push(full)
			return full
		},
		update(
			id: string,
			patch: Partial<Omit<EmployeeRow, 'id'>>,
		): EmployeeRow | undefined {
			const idx = employees.findIndex((e) => e.id === id)
			if (idx === -1) return undefined
			employees[idx] = { ...employees[idx], ...patch }
			return employees[idx]
		},
		remove(id: string): boolean {
			const idx = employees.findIndex((e) => e.id === id)
			if (idx === -1) return false
			employees.splice(idx, 1)
			return true
		},
	},

	// ── Conversations (support tickets) ──
	conversations: {
		list(): ConversationRow[] {
			return conversations
		},
		get(id: string): ConversationRow | undefined {
			return conversations.find((c) => c.id === id)
		},
		forCustomer(customerId: string): ConversationRow[] {
			return conversations.filter((c) => c.customerId === customerId)
		},
		updateStatus(
			id: string,
			status: ConversationStatus,
		): ConversationRow | undefined {
			const row = conversations.find((c) => c.id === id)
			if (!row) return undefined
			row.status = status
			return row
		},
		assign(
			id: string,
			agentId: string,
			agentName: string,
		): ConversationRow | undefined {
			const row = conversations.find((c) => c.id === id)
			if (!row) return undefined
			row.assignedTo = agentId
			row.assignedToName = agentName
			return row
		},
		addMessage(
			conversationId: string,
			message: MessageRow,
		): ConversationRow | undefined {
			const row = conversations.find((c) => c.id === conversationId)
			if (!row) return undefined
			row.messages.push(message)
			return row
		},
	},
} as const
