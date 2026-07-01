import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type {
	FreshnessIndicator,
	MarginThresholds,
	PriceStatus,
} from '../../types/sales'
import {
	computeMarginFromSellPrice,
	computeSellPriceFromMargin,
} from '../pricing-math'
import { getInternalSupabaseClient } from './_supabase'
import {
	formatSupabaseAddress,
	isSalesQuoteAddress,
	normalizeAddressText,
	SALES_QUOTE_ADDRESS_LABEL,
} from './address-format'
import { verifyEmployeeCredential } from './employee-credentials'

type InternalSupabaseClient = Awaited<
	ReturnType<typeof getInternalSupabaseClient>
>['client']

// Re-exported so every sales UI that already imports from here keeps working
// while the canonical definitions live in inventory.ts.
export { requestInventoryPriceUpdate } from './inventory'

// ─── Config ───────────────────────────────────────────────

type QuoteBuilderCurrency = 'EGP' | 'USD' | 'EUR' | 'SAR'
const QUOTE_BUILDER_FOREIGN_CURRENCIES: Array<
	Exclude<QuoteBuilderCurrency, 'EGP'>
> = ['USD', 'EUR', 'SAR']
const EXCHANGE_RATE_SOURCE_URL = 'https://open.er-api.com/v6/latest/EGP'
const EXCHANGE_RATE_SOURCE_NAME = 'open.er-api.com'
const EXCHANGE_RATE_CACHE_TTL_MS = 30 * 60_000
let exchangeRateCache: {
	expiresAt: number
	value: QuoteBuilderExchangeRates
} | null = null

interface QuoteBuilderExchangeRates {
	baseCurrency: 'EGP'
	rates: Record<QuoteBuilderCurrency, number | null>
	updatedAt: string | null
	source: string
}

interface SupabaseEmployeeRoleRow {
	role: string
}

interface SupabaseApproverEmployeeRow {
	id: string
	full_name: string
	is_ceo: boolean
	employee_roles: SupabaseEmployeeRoleRow[] | null
}

const UUID_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const SALES_APPROVER_ROLES = new Set(['admin', 'ceo', 'sales'])
function isUuid(value: string): boolean {
	return UUID_RE.test(value)
}

function isSalesApprover(row: SupabaseApproverEmployeeRow): boolean {
	if (row.is_ceo) return true
	return (row.employee_roles ?? []).some((entry) =>
		SALES_APPROVER_ROLES.has(entry.role),
	)
}

function encodeSupabaseQuoteVersionId(
	quoteRequestId: string,
	quoteVersionId: string,
): string {
	return `sb:${quoteRequestId}:${quoteVersionId}`
}

function decodeSupabaseQuoteVersionId(value: string | undefined) {
	if (!value?.startsWith('sb:')) return null
	const [, quoteRequestId, quoteVersionId] = value.split(':')
	if (!quoteRequestId || !quoteVersionId) return null
	return { quoteRequestId, quoteVersionId }
}

function isUnknownRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null
}

async function getQuoteBuilderExchangeRates(): Promise<QuoteBuilderExchangeRates> {
	const now = Date.now()
	if (exchangeRateCache && exchangeRateCache.expiresAt > now) {
		return exchangeRateCache.value
	}

	const rates: Record<QuoteBuilderCurrency, number | null> = {
		EGP: 1,
		USD: null,
		EUR: null,
		SAR: null,
	}

	try {
		const response = await fetch(EXCHANGE_RATE_SOURCE_URL)
		if (!response.ok) {
			return cacheExchangeRates({
				baseCurrency: 'EGP',
				rates,
				updatedAt: null,
				source: EXCHANGE_RATE_SOURCE_NAME,
			})
		}

		const payload: unknown = await response.json()
		if (!isUnknownRecord(payload) || !isUnknownRecord(payload.rates)) {
			return cacheExchangeRates({
				baseCurrency: 'EGP',
				rates,
				updatedAt: null,
				source: EXCHANGE_RATE_SOURCE_NAME,
			})
		}

		for (const currency of QUOTE_BUILDER_FOREIGN_CURRENCIES) {
			const apiRate = payload.rates[currency]
			if (
				typeof apiRate === 'number' &&
				Number.isFinite(apiRate) &&
				apiRate > 0
			) {
				rates[currency] = Math.round((1 / apiRate) * 10_000) / 10_000
			}
		}

		return cacheExchangeRates({
			baseCurrency: 'EGP',
			rates,
			updatedAt:
				typeof payload.time_last_update_utc === 'string'
					? payload.time_last_update_utc
					: null,
			source: EXCHANGE_RATE_SOURCE_NAME,
		})
	} catch {
		return cacheExchangeRates({
			baseCurrency: 'EGP',
			rates,
			updatedAt: null,
			source: EXCHANGE_RATE_SOURCE_NAME,
		})
	}
}

function cacheExchangeRates(
	value: QuoteBuilderExchangeRates,
): QuoteBuilderExchangeRates {
	exchangeRateCache = {
		expiresAt: Date.now() + EXCHANGE_RATE_CACHE_TTL_MS,
		value,
	}
	return value
}

interface SupabasePricingRuleRow {
	category_slug: string | null
	product_slug: string | null
	product_category: string
	bonus_margin: number
	target_margin: number
	floor_margin: number
	absolute_min_margin: number
}

async function getSupabaseMarginThresholds(
	auth: Awaited<ReturnType<typeof getInternalSupabaseClient>>,
): Promise<MarginThresholds[]> {
	const { data, error } = await auth.client
		.from('pricing_rules')
		.select(
			'category_slug, product_slug, product_category, bonus_margin, target_margin, floor_margin, absolute_min_margin',
		)
		.eq('active', true)
		.order('category_slug', { ascending: true, nullsFirst: true })
		.order('product_slug', { ascending: true, nullsFirst: true })
	if (error) throw new Error(error.message)
	return ((data ?? []) as SupabasePricingRuleRow[]).map((row) => ({
		categorySlug: row.category_slug,
		productSlug: row.product_slug,
		productCategory: row.product_category,
		bonus: Number(row.bonus_margin),
		target: Number(row.target_margin),
		floor: Number(row.floor_margin),
		absoluteMin: Number(row.absolute_min_margin),
	}))
}

interface SupabaseQuoteBuilderProductRow {
	id: string
	slug: string
	name: string
	category: string
	subcategory: string | null
	unit_of_measure: string
	price_range_min: number | null
	price_range_max: number | null
	updated_at: string
	supplier_product_links: SupabaseQuoteBuilderSupplierLinkRow[] | null
}

interface SupabaseQuoteBuilderItemRow {
	id: string
	customer_description: string
	quantity: number
	unit_of_measure: string
	notes: string | null
	sort_order: number
	products:
		| SupabaseQuoteBuilderProductRow
		| SupabaseQuoteBuilderProductRow[]
		| null
}

interface SupabaseQuoteBuilderCustomerRow {
	id: string
	company_name: string
	contact_name: string
	phone: string
	email: string | null
}

interface SupabaseQuoteBuilderAddressRow {
	id?: string
	label?: string | null
	street: string
	area: string | null
	city: string
	governorate: string
	landmark: string | null
	is_default?: boolean | null
	latitude?: number | string | null
	longitude?: number | string | null
}

interface SupabaseQuoteBuilderRequestRow {
	id: string
	customer_id: string | null
	delivery_address_id: string | null
	status: string
	delivery_date: string | null
	notes: string | null
	customers:
		| SupabaseQuoteBuilderCustomerRow
		| SupabaseQuoteBuilderCustomerRow[]
		| null
	customer_addresses:
		| SupabaseQuoteBuilderAddressRow
		| SupabaseQuoteBuilderAddressRow[]
		| null
	quote_request_items: SupabaseQuoteBuilderItemRow[] | null
}

interface SupabaseQuoteBuilderSupplierLinkRow {
	raw_cost: number | null
	is_primary: boolean
	last_quoted_at: string | null
	suppliers: { name: string } | { name: string }[] | null
}

interface SupabaseSavedQuoteLineItem {
	id?: string
	productSlug?: string
	productName: string
	specification: string
	quantity: number
	unit: string
	productCategory?: string
	supplierCost: number
	marginPercent?: number
	sellPrice?: number
}

interface SupabaseSavedQuoteNotes {
	notes?: string
	deliveryAddress?: string | null
	deliveryCity?: string | null
	deliveryLatitude?: number | null
	deliveryLongitude?: number | null
	deliveryDate?: string | null
	deliveryWindow?: string | null
	paymentTerms?: string | null
	earlyPaymentDiscount?: string | null
	coverNote?: string | null
	items?: SupabaseSavedQuoteLineItem[]
}

function firstRelation<T>(value: T | T[] | null): T | null {
	if (Array.isArray(value)) return value[0] ?? null
	return value
}

function hoursSincePriceTimestamp(value: string | null | undefined): number {
	if (!value) return Number.POSITIVE_INFINITY
	const parsed = new Date(value).getTime()
	if (!Number.isFinite(parsed)) return Number.POSITIVE_INFINITY
	return (Date.now() - parsed) / 3_600_000
}

function positivePrice(value: number | null | undefined): number | null {
	const numeric = Number(value ?? 0)
	return Number.isFinite(numeric) && numeric > 0 ? numeric : null
}

function primarySupplierLink(
	links: SupabaseQuoteBuilderSupplierLinkRow[] | null,
): SupabaseQuoteBuilderSupplierLinkRow | null {
	if (!links || links.length === 0) return null
	return links.find((link) => link.is_primary) ?? links[0] ?? null
}

function productPriceFreshness(
	product: SupabaseQuoteBuilderProductRow | null,
): {
	freshness: FreshnessIndicator
	lastQuotedAt: string
	priceStatus: PriceStatus
	sellPrice: number
	supplierCost: number
	supplierName: string
} {
	const primaryLink = primarySupplierLink(
		product?.supplier_product_links ?? null,
	)
	const supplier = firstRelation(primaryLink?.suppliers ?? null)
	const supplierCost =
		positivePrice(primaryLink?.raw_cost) ??
		positivePrice(product?.price_range_min) ??
		positivePrice(product?.price_range_max) ??
		0
	const sellPrice =
		positivePrice(product?.price_range_max) ??
		positivePrice(product?.price_range_min) ??
		positivePrice(primaryLink?.raw_cost) ??
		0
	const lastQuotedAt =
		primaryLink?.last_quoted_at ??
		product?.updated_at ??
		new Date(0).toISOString()

	if (supplierCost <= 0 && sellPrice <= 0) {
		return {
			freshness: 'missing',
			lastQuotedAt,
			priceStatus: 'outdated',
			sellPrice,
			supplierCost,
			supplierName: supplier?.name ?? '',
		}
	}

	const hours = hoursSincePriceTimestamp(lastQuotedAt)
	const freshness: FreshnessIndicator =
		hours < 24 ? 'fresh' : hours < 72 ? 'aging' : 'stale'
	return {
		freshness,
		lastQuotedAt,
		priceStatus: freshness === 'fresh' ? 'updated' : 'outdated',
		sellPrice,
		supplierCost,
		supplierName: supplier?.name ?? '',
	}
}

function parseSavedQuoteNotes(value: string | null): SupabaseSavedQuoteNotes {
	if (!value) return {}
	try {
		const parsed: unknown = JSON.parse(value)
		if (!isUnknownRecord(parsed)) return {}
		const items = Array.isArray(parsed.items)
			? parsed.items.filter((item): item is SupabaseSavedQuoteLineItem => {
					if (!isUnknownRecord(item)) return false
					return (
						typeof item.productName === 'string' &&
						typeof item.specification === 'string' &&
						typeof item.quantity === 'number' &&
						typeof item.unit === 'string' &&
						typeof item.supplierCost === 'number'
					)
				})
			: undefined
		const metadata =
			typeof parsed.notes === 'string'
				? parseSavedQuoteMetadata(parsed.notes)
				: parseSavedQuoteMetadataObject(parsed)
		return {
			notes: metadata.specialInstructions,
			deliveryAddress: cleanDeliveryAddressText(metadata.deliveryAddress),
			deliveryCity: metadata.deliveryCity,
			deliveryLatitude: metadata.deliveryLatitude,
			deliveryLongitude: metadata.deliveryLongitude,
			deliveryDate: metadata.deliveryDate,
			deliveryWindow: metadata.deliveryWindow,
			paymentTerms: metadata.paymentTerms,
			earlyPaymentDiscount: metadata.earlyPaymentDiscount,
			coverNote: metadata.coverNote,
			items,
		}
	} catch {
		return {}
	}
}

function parseSavedQuoteMetadataObject(
	parsed: Record<string, unknown>,
): Omit<SupabaseSavedQuoteNotes, 'items'> & { specialInstructions?: string } {
	const stringOrNull = (key: string) => {
		const next = parsed[key]
		return typeof next === 'string' ? next : null
	}
	const numberOrNull = (key: string) => nullableCoordinate(parsed[key])
	return {
		specialInstructions: stringOrNull('specialInstructions') ?? undefined,
		deliveryAddress: cleanDeliveryAddressText(stringOrNull('deliveryAddress')),
		deliveryCity: stringOrNull('deliveryCity'),
		deliveryLatitude: numberOrNull('deliveryLatitude'),
		deliveryLongitude: numberOrNull('deliveryLongitude'),
		deliveryDate: stringOrNull('deliveryDate'),
		deliveryWindow: stringOrNull('deliveryWindow'),
		paymentTerms: stringOrNull('paymentTerms'),
		earlyPaymentDiscount: stringOrNull('earlyPaymentDiscount'),
		coverNote: stringOrNull('coverNote'),
	}
}

function parseSavedQuoteMetadata(
	value: string,
): Omit<SupabaseSavedQuoteNotes, 'items'> & { specialInstructions?: string } {
	try {
		const parsed: unknown = JSON.parse(value)
		if (!isUnknownRecord(parsed)) return { notes: value }
		const stringOrNull = (key: string) => {
			const next = parsed[key]
			return typeof next === 'string' ? next : null
		}
		const numberOrNull = (key: string) => nullableCoordinate(parsed[key])
		return {
			specialInstructions: stringOrNull('specialInstructions') ?? undefined,
			deliveryAddress: cleanDeliveryAddressText(
				stringOrNull('deliveryAddress'),
			),
			deliveryCity: stringOrNull('deliveryCity'),
			deliveryLatitude: numberOrNull('deliveryLatitude'),
			deliveryLongitude: numberOrNull('deliveryLongitude'),
			deliveryDate: stringOrNull('deliveryDate'),
			deliveryWindow: stringOrNull('deliveryWindow'),
			paymentTerms: stringOrNull('paymentTerms'),
			earlyPaymentDiscount: stringOrNull('earlyPaymentDiscount'),
			coverNote: stringOrNull('coverNote'),
		}
	} catch {
		return { notes: value }
	}
}

function nullableCoordinate(value: unknown): number | null {
	if (value === null || value === undefined || value === '') return null
	const numeric = typeof value === 'number' ? value : Number(value)
	return Number.isFinite(numeric) ? numeric : null
}

function normalizeLatitude(value: unknown): number | null {
	const numeric = nullableCoordinate(value)
	return numeric !== null && numeric >= -90 && numeric <= 90 ? numeric : null
}

function normalizeLongitude(value: unknown): number | null {
	const numeric = nullableCoordinate(value)
	return numeric !== null && numeric >= -180 && numeric <= 180 ? numeric : null
}

function cleanDeliveryAddressText(
	value: string | null | undefined,
): string | null {
	const trimmed = normalizeAddressText(value)
	return trimmed && trimmed.length >= 4 ? trimmed : null
}

function cleanOptionalText(value: string | null | undefined): string | null {
	const trimmed = value?.replace(/\s+/g, ' ').trim()
	return trimmed ? trimmed : null
}

function parseSalesDeliveryAddress(
	value: string,
	cityOverride: string | null | undefined,
): Pick<
	SupabaseQuoteBuilderAddressRow,
	'area' | 'city' | 'governorate' | 'landmark' | 'street'
> {
	const parts = value
		.split(',')
		.map((part) => part.trim())
		.filter(Boolean)
	const locationParts = parts.filter((part) => {
		const normalized = part.toLowerCase()
		return normalized !== 'egypt' && normalized !== 'مصر'
	})
	const streetParts = locationParts.slice(
		0,
		Math.max(1, Math.min(2, locationParts.length - 2)),
	)
	const street = cleanOptionalText(streetParts.join(', ')) ?? value
	const inferredCity =
		locationParts.length >= 3 ? locationParts.at(-2) : locationParts.at(-1)
	const city =
		cleanOptionalText(cityOverride) ??
		cleanOptionalText(inferredCity) ??
		'Unspecified'
	const governorate =
		cleanOptionalText(locationParts.at(-1)) ?? cleanOptionalText(city) ?? city
	const area =
		locationParts.length > 3 ? cleanOptionalText(locationParts.at(-3)) : null
	const landmark =
		locationParts.length > 4
			? cleanOptionalText(locationParts.slice(2, -3).join(', '))
			: null

	return {
		street,
		area,
		city,
		governorate,
		landmark,
	}
}

interface QuoteDeliveryAddressTarget {
	customer_id: string | null
	delivery_address_id: string | null
	id: string
}

interface DeliveryAddressSelection {
	address: string | null | undefined
	city: string | null | undefined
	latitude: number | null | undefined
	longitude: number | null | undefined
}

async function persistQuoteDeliveryAddress(
	client: InternalSupabaseClient,
	quoteRequest: QuoteDeliveryAddressTarget,
	selection: DeliveryAddressSelection,
): Promise<string | null> {
	const addressText = cleanDeliveryAddressText(selection.address)
	if (!quoteRequest.customer_id) {
		return quoteRequest.delivery_address_id
	}
	if (!addressText) return await clearQuoteDeliveryAddress(client, quoteRequest)

	const addressFields = parseSalesDeliveryAddress(addressText, selection.city)
	const latitude = normalizeLatitude(selection.latitude)
	const longitude = normalizeLongitude(selection.longitude)
	const addressPatch = {
		...addressFields,
		latitude,
		longitude,
	}

	const linkedAddressId = quoteRequest.delivery_address_id
	if (linkedAddressId) {
		const { data: linkedAddress, error: linkedAddressError } = await client
			.from('customer_addresses')
			.select('id, label, customer_id')
			.eq('id', linkedAddressId)
			.eq('customer_id', quoteRequest.customer_id)
			.maybeSingle()
		if (linkedAddressError) throw new Error(linkedAddressError.message)

		if (linkedAddress?.label === SALES_QUOTE_ADDRESS_LABEL) {
			const { error: updateAddressError } = await client
				.from('customer_addresses')
				.update(addressPatch)
				.eq('id', linkedAddress.id)
				.eq('customer_id', quoteRequest.customer_id)
			if (updateAddressError) throw new Error(updateAddressError.message)
			return linkedAddress.id
		}
	}

	const { data: insertedAddress, error: insertAddressError } = await client
		.from('customer_addresses')
		.insert({
			...addressPatch,
			customer_id: quoteRequest.customer_id,
			is_default: false,
			label: SALES_QUOTE_ADDRESS_LABEL,
		})
		.select('id')
		.single()
	if (insertAddressError) throw new Error(insertAddressError.message)

	const { error: requestUpdateError } = await client
		.from('quote_requests')
		.update({ delivery_address_id: insertedAddress.id })
		.eq('id', quoteRequest.id)
	if (requestUpdateError) throw new Error(requestUpdateError.message)

	return insertedAddress.id
}

async function clearQuoteDeliveryAddress(
	client: InternalSupabaseClient,
	quoteRequest: QuoteDeliveryAddressTarget,
): Promise<null> {
	if (!quoteRequest.delivery_address_id) return null
	const { error } = await client
		.from('quote_requests')
		.update({ delivery_address_id: null })
		.eq('id', quoteRequest.id)
	if (error) throw new Error(error.message)
	return null
}

function buildSupabaseSuggestedProductFromSavedItem(
	item: SupabaseSavedQuoteLineItem,
	rfqId: string,
	index: number,
	product: SupabaseQuoteBuilderProductRow | null,
) {
	const price = product ? productPriceFreshness(product) : null
	const supplierCost = price?.supplierCost ?? item.supplierCost
	const fallbackSellPrice = item.sellPrice ?? supplierCost
	const marginPercent =
		item.marginPercent ??
		computeMarginFromSellPrice(item.supplierCost, fallbackSellPrice)
	const sellPrice = product
		? computeSellPriceFromMargin(supplierCost, marginPercent)
		: fallbackSellPrice
	return {
		id: item.id ?? `sp-${rfqId}-${index + 1}`,
		productSlug: product?.slug ?? item.productSlug ?? item.productName,
		productName: product?.name ?? item.productName,
		specification:
			product?.subcategory?.replace(/_/g, ' ') ?? item.specification,
		supplierName: price?.supplierName ?? '',
		supplierCost,
		quantity: item.quantity,
		unit: product?.unit_of_measure ?? item.unit,
		freshness: price?.freshness ?? ('fresh' as FreshnessIndicator),
		priceStatus: price?.priceStatus ?? ('updated' as const),
		recentlyOrdered: true,
		lastQuotedAt: price?.lastQuotedAt ?? new Date().toISOString(),
		category: product?.category ?? item.productCategory ?? '',
		productCategory: product?.category ?? item.productCategory ?? '',
		marginPercent,
		sellPrice,
	}
}

async function savedQuoteProductsBySlug(
	auth: Awaited<ReturnType<typeof getInternalSupabaseClient>>,
	items: SupabaseSavedQuoteLineItem[],
): Promise<Map<string, SupabaseQuoteBuilderProductRow>> {
	const slugs = Array.from(
		new Set(
			items
				.map((item) => item.productSlug)
				.filter((slug): slug is string => Boolean(slug?.trim())),
		),
	)
	if (slugs.length === 0) return new Map()
	const { data, error } = await auth.client
		.from('products')
		.select(`
			id,
			slug,
			name,
			category,
			subcategory,
			unit_of_measure,
			price_range_min,
			price_range_max,
			updated_at,
			supplier_product_links (
				raw_cost,
				is_primary,
				last_quoted_at,
				suppliers (
					name
				)
			)
		`)
		.in('slug', slugs)
		.eq('is_active', true)
		.neq('availability_status', 'hidden')
	if (error) throw new Error(error.message)
	return new Map(
		((data ?? []) as SupabaseQuoteBuilderProductRow[]).map((product) => [
			product.slug,
			product,
		]),
	)
}

function buildSupabaseSuggestedProductFromRequestItem(
	item: SupabaseQuoteBuilderItemRow,
	rfqId: string,
	index: number,
) {
	const product = firstRelation(item.products)
	const price = productPriceFreshness(product)
	const marginPercent = computeMarginFromSellPrice(
		price.supplierCost,
		price.sellPrice,
	)
	return {
		id: `sp-${rfqId}-${index + 1}`,
		productSlug: product?.slug ?? `request-item-${item.id}`,
		productName: product?.name ?? item.customer_description,
		specification:
			product?.subcategory?.replace(/_/g, ' ') ??
			item.notes ??
			item.customer_description,
		supplierName: price.supplierName,
		supplierCost: price.supplierCost,
		quantity: Number(item.quantity),
		unit: product?.unit_of_measure ?? item.unit_of_measure,
		freshness: price.freshness,
		priceStatus: price.priceStatus,
		recentlyOrdered: true,
		lastQuotedAt: price.lastQuotedAt,
		category: product?.category ?? '',
		productCategory: product?.category ?? '',
		marginPercent,
		sellPrice: price.sellPrice,
	}
}

async function buildSupabaseQuoteBuilderData(
	rfqId: string,
	exchangeRates: QuoteBuilderExchangeRates,
) {
	if (!isUuid(rfqId)) return null
	const auth = await getInternalSupabaseClient()
	const marginThresholds = await getSupabaseMarginThresholds(auth)

	const { data, error } = await auth.client
		.from('quote_requests')
		.select(`
			id,
			customer_id,
			delivery_address_id,
			status,
			delivery_date,
			notes,
			customers (
				id,
				company_name,
				contact_name,
				phone,
				email
			),
			customer_addresses (
				id,
				label,
				street,
				area,
				city,
				governorate,
				landmark,
				is_default,
				latitude,
				longitude
			),
			quote_request_items (
				id,
				customer_description,
				quantity,
				unit_of_measure,
				notes,
				sort_order,
				products (
					id,
					slug,
					name,
					category,
					subcategory,
					unit_of_measure,
					price_range_min,
					price_range_max,
					updated_at,
					supplier_product_links (
						raw_cost,
						is_primary,
						last_quoted_at,
						suppliers (
							name
						)
					)
				)
			)
		`)
		.eq('id', rfqId)
		.maybeSingle()
	if (error) throw new Error(error.message)
	if (!data) return null

	const request = data as unknown as SupabaseQuoteBuilderRequestRow
	const { data: draftRows, error: draftError } = await auth.client
		.from('sales_quote_versions')
		.select('id, notes')
		.eq('quote_request_id', rfqId)
		.eq('status', 'draft')
		.order('version_number', { ascending: false })
		.limit(1)
	if (draftError) throw new Error(draftError.message)

	const savedDraft = draftRows?.[0]
	const savedNotes = parseSavedQuoteNotes(savedDraft?.notes ?? null)
	const savedProductBySlug = savedNotes.items
		? await savedQuoteProductsBySlug(auth, savedNotes.items)
		: new Map<string, SupabaseQuoteBuilderProductRow>()
	const suggestedProducts =
		savedNotes.items && savedNotes.items.length > 0
			? savedNotes.items.map((item, index) => {
					const product = item.productSlug
						? (savedProductBySlug.get(item.productSlug) ?? null)
						: null
					return buildSupabaseSuggestedProductFromSavedItem(
						item,
						rfqId,
						index,
						product,
					)
				})
			: (request.quote_request_items ?? [])
					.slice()
					.sort((a, b) => a.sort_order - b.sort_order)
					.map((item, index) =>
						buildSupabaseSuggestedProductFromRequestItem(item, rfqId, index),
					)
	const customer = firstRelation(request.customers)
	const address = firstRelation(request.customer_addresses)
	const salesAddress = isSalesQuoteAddress(address) ? address : null
	const deliveryAddress =
		savedNotes.deliveryAddress ?? formatSupabaseAddress(salesAddress)

	return {
		rfqId,
		rfqStatus: request.status,
		quoteStatus: 'draft' as const,
		customer: {
			name: customer?.company_name ?? '',
			tier: 'new' as const,
			contactName: customer?.contact_name ?? '',
			phone: customer?.phone ?? '',
			email: customer?.email ?? '',
			company: customer?.company_name ?? '',
		},
		deliveryAddress,
		deliveryCity: savedNotes.deliveryCity ?? salesAddress?.city ?? '',
		deliveryAddressOverride: Boolean(deliveryAddress),
		deliveryLatitude:
			savedNotes.deliveryLatitude ?? normalizeLatitude(salesAddress?.latitude),
		deliveryLongitude:
			savedNotes.deliveryLongitude ??
			normalizeLongitude(salesAddress?.longitude),
		deliveryDate: savedNotes.deliveryDate ?? request.delivery_date ?? '',
		deliveryWindow: savedNotes.deliveryWindow ?? '',
		specialInstructions: savedNotes.notes ?? request.notes ?? '',
		paymentTerms: savedNotes.paymentTerms ?? '',
		earlyPaymentDiscount: savedNotes.earlyPaymentDiscount ?? '',
		coverNote: savedNotes.coverNote ?? '',
		customerCredit: {
			creditLimit: 0,
			currentExposure: 0,
			availableCredit: 0,
			paymentHistory: 'good' as const,
		},
		suggestedProducts,
		recentPrices: suggestedProducts.map((p) => ({
			productName: p.productName,
			supplierCost: p.supplierCost,
			freshness: p.freshness,
			lastQuotedAt: p.lastQuotedAt,
		})),
		stockBySlug: {},
		stockByName: {},
		suppliers: [],
		marginThresholds,
		exchangeRates,
	}
}

async function buildSupabaseManualCustomerQuoteData(
	rfqId: string,
	exchangeRates: QuoteBuilderExchangeRates,
) {
	if (!rfqId.startsWith('new-')) return null
	const customerId = rfqId.slice(4)
	if (!isUuid(customerId)) return null
	const auth = await getInternalSupabaseClient()
	const marginThresholds = await getSupabaseMarginThresholds(auth)

	const { data, error } = await auth.client
		.from('customers')
		.select(`
			id,
			company_name,
			contact_name,
			phone,
			email
		`)
		.eq('id', customerId)
		.maybeSingle()
	if (error) throw new Error(error.message)
	if (!data) return null

	const customer = data as unknown as SupabaseQuoteBuilderCustomerRow

	return {
		rfqId,
		rfqStatus: 'submitted' as const,
		quoteStatus: 'draft' as const,
		customer: {
			name: customer.company_name,
			tier: 'new' as const,
			contactName: customer.contact_name,
			phone: customer.phone,
			email: customer.email ?? '',
			company: customer.company_name,
		},
		deliveryAddress: '',
		deliveryCity: '',
		deliveryAddressOverride: false,
		deliveryLatitude: null,
		deliveryLongitude: null,
		deliveryDate: '',
		deliveryWindow: '',
		specialInstructions: '',
		paymentTerms: '',
		earlyPaymentDiscount: '',
		coverNote: '',
		customerCredit: {
			creditLimit: 0,
			currentExposure: 0,
			availableCredit: 0,
			paymentHistory: 'good' as const,
		},
		suggestedProducts: [],
		recentPrices: [],
		stockBySlug: {},
		stockByName: {},
		suppliers: [],
		marginThresholds,
		exchangeRates,
	}
}

async function buildEmptyManualQuoteData(
	rfqId: string,
	exchangeRates: QuoteBuilderExchangeRates,
) {
	if (!rfqId.startsWith('new-')) return null
	const customerId = rfqId.slice(4)
	if (isUuid(customerId)) return null

	const auth = await getInternalSupabaseClient()
	const marginThresholds = await getSupabaseMarginThresholds(auth)

	return {
		rfqId,
		rfqStatus: 'submitted' as const,
		quoteStatus: 'draft' as const,
		customer: {
			name: '',
			tier: 'new' as const,
			contactName: '',
			phone: '',
			email: '',
			company: '',
		},
		deliveryAddress: '',
		deliveryCity: '',
		deliveryAddressOverride: false,
		deliveryLatitude: null,
		deliveryLongitude: null,
		deliveryDate: '',
		deliveryWindow: '',
		specialInstructions: '',
		paymentTerms: '',
		earlyPaymentDiscount: '',
		coverNote: '',
		customerCredit: {
			creditLimit: 0,
			currentExposure: 0,
			availableCredit: 0,
			paymentHistory: 'good' as const,
		},
		suggestedProducts: [],
		recentPrices: [],
		stockBySlug: {},
		stockByName: {},
		suppliers: [],
		marginThresholds,
		exchangeRates,
	}
}

async function buildQuoteBuilderData(rfqId: string) {
	const exchangeRates = await getQuoteBuilderExchangeRates()
	const supabaseData = await buildSupabaseQuoteBuilderData(rfqId, exchangeRates)
	if (supabaseData) return supabaseData
	const manualCustomerData = await buildSupabaseManualCustomerQuoteData(
		rfqId,
		exchangeRates,
	)
	if (manualCustomerData) return manualCustomerData
	const emptyManualData = await buildEmptyManualQuoteData(rfqId, exchangeRates)
	if (emptyManualData) return emptyManualData

	throw new Error('Supabase quote request or customer is required')
}

// ─── Server Functions ─────────────────────────────────────

export const saveQuoteDraft = createServerFn({ method: 'POST' })
	.inputValidator(
		z.object({
			quoteId: z.string().optional(),
			rfqId: z.string(),
			customerId: z.string().optional(),
			lineItems: z.array(
				z.object({
					id: z.string().optional(),
					productSlug: z.string().optional(),
					productCategory: z.string().optional(),
					productName: z.string(),
					specification: z.string(),
					quantity: z.number().positive(),
					unit: z.string(),
					supplierCost: z.number().nonnegative(),
					marginPercent: z.number(),
					sellPrice: z.number().nonnegative(),
				}),
			),
			// Every field below is a user-typed override of the defaults inherited
			// from the source RFQ / customer. Null = leave the DB row alone,
			// empty string = explicit clear.
			deliveryAddress: z.string().nullable().optional(),
			deliveryAddressOverride: z.boolean().optional(),
			deliveryCity: z.string().nullable().optional(),
			deliveryLatitude: z.number().min(-90).max(90).nullable().optional(),
			deliveryLongitude: z.number().min(-180).max(180).nullable().optional(),
			deliveryDate: z.string().nullable().optional(),
			deliveryWindow: z.string().nullable().optional(),
			specialInstructions: z.string().nullable().optional(),
			paymentTerms: z.string().nullable().optional(),
			earlyPaymentDiscount: z.string().nullable().optional(),
			coverNote: z.string().nullable().optional(),
		}),
	)
	.handler(async ({ data }) => {
		const auth = await getInternalSupabaseClient()
		const savedQuoteVersion = decodeSupabaseQuoteVersionId(data.quoteId)
		const supabaseQuoteRequestId =
			savedQuoteVersion?.quoteRequestId ?? data.rfqId
		const deliveryAddressOverride = data.deliveryAddressOverride === true
		const draftDeliveryAddress = deliveryAddressOverride
			? cleanDeliveryAddressText(data.deliveryAddress)
			: null
		const draftDeliveryLatitude = deliveryAddressOverride
			? (data.deliveryLatitude ?? null)
			: null
		const draftDeliveryLongitude = deliveryAddressOverride
			? (data.deliveryLongitude ?? null)
			: null
		if (isUuid(supabaseQuoteRequestId)) {
			const { data: quoteRequest, error: requestError } = await auth.client
				.from('quote_requests')
				.select('id, customer_id, delivery_address_id')
				.eq('id', supabaseQuoteRequestId)
				.maybeSingle()
			if (requestError) throw new Error(requestError.message)
			if (quoteRequest) {
				await persistQuoteDeliveryAddress(auth.client, quoteRequest, {
					address: draftDeliveryAddress,
					city: data.deliveryCity,
					latitude: draftDeliveryLatitude,
					longitude: draftDeliveryLongitude,
				})
				const draftNotes = JSON.stringify({
					quoteVersionId: savedQuoteVersion?.quoteVersionId ?? null,
					deliveryAddress: draftDeliveryAddress,
					deliveryCity: data.deliveryCity ?? null,
					deliveryLatitude: draftDeliveryLatitude,
					deliveryLongitude: draftDeliveryLongitude,
					deliveryDate: data.deliveryDate ?? null,
					deliveryWindow: data.deliveryWindow ?? null,
					specialInstructions: data.specialInstructions ?? null,
					paymentTerms: data.paymentTerms ?? null,
					earlyPaymentDiscount: data.earlyPaymentDiscount ?? null,
					coverNote: data.coverNote ?? null,
				})
				const { data: version, error: saveError } = await auth.client.rpc(
					'sales_save_quote_version',
					{
						p_order_id: supabaseQuoteRequestId,
						p_items: data.lineItems,
						p_notes: draftNotes,
					},
				)
				if (saveError) throw new Error(saveError.message)
				if (!version?.id) throw new Error('sales_quote_version_not_returned')
				return {
					quoteId: encodeSupabaseQuoteVersionId(
						supabaseQuoteRequestId,
						version.id,
					),
				}
			}
		}

		const manualCustomerId =
			data.customerId ??
			(data.rfqId.startsWith('new-') ? data.rfqId.slice(4) : null)
		if (manualCustomerId && isUuid(manualCustomerId)) {
			const productSlugs = Array.from(
				new Set(
					data.lineItems
						.map((item) => item.productSlug)
						.filter((slug): slug is string => Boolean(slug)),
				),
			)
			const { data: products, error: productError } = await auth.client
				.from('products')
				.select('id, slug')
				.in('slug', productSlugs)
			if (productError) throw new Error(productError.message)
			const productBySlug = new Map(
				((products ?? []) as { id: string; slug: string }[]).map((product) => [
					product.slug,
					product.id,
				]),
			)
			const { data: createdRequest, error: manualError } =
				await auth.client.rpc('create_manual_order', {
					p_customer_id: manualCustomerId,
					p_items: data.lineItems.map((item, index) => {
						const productId = item.productSlug
							? productBySlug.get(item.productSlug)
							: undefined
						return {
							product_id: productId ?? null,
							customer_description: item.productName,
							quantity: item.quantity,
							unit_of_measure: item.unit,
							notes: item.specification,
							sort_order: index + 1,
							is_unmatched: !productId,
						}
					}),
					p_notes: data.specialInstructions ?? null,
				})
			if (manualError) throw new Error(manualError.message)
			if (!createdRequest?.id) throw new Error('manual_order_not_returned')

			await persistQuoteDeliveryAddress(auth.client, createdRequest, {
				address: draftDeliveryAddress,
				city: data.deliveryCity,
				latitude: draftDeliveryLatitude,
				longitude: draftDeliveryLongitude,
			})

			const draftNotes = JSON.stringify({
				deliveryAddress: draftDeliveryAddress,
				deliveryCity: data.deliveryCity ?? null,
				deliveryLatitude: draftDeliveryLatitude,
				deliveryLongitude: draftDeliveryLongitude,
				deliveryDate: data.deliveryDate ?? null,
				deliveryWindow: data.deliveryWindow ?? null,
				specialInstructions: data.specialInstructions ?? null,
				paymentTerms: data.paymentTerms ?? null,
				earlyPaymentDiscount: data.earlyPaymentDiscount ?? null,
				coverNote: data.coverNote ?? null,
			})
			const { data: version, error: saveError } = await auth.client.rpc(
				'sales_save_quote_version',
				{
					p_order_id: createdRequest.id,
					p_items: data.lineItems,
					p_notes: draftNotes,
				},
			)
			if (saveError) throw new Error(saveError.message)
			if (!version?.id) throw new Error('sales_quote_version_not_returned')
			return {
				quoteId: encodeSupabaseQuoteVersionId(createdRequest.id, version.id),
			}
		}

		throw new Error('Supabase quote request or customer is required')
	})

export const getQuoteBuilderData = createServerFn({ method: 'POST' })
	.inputValidator(z.object({ rfqId: z.string() }))
	.handler(async ({ data }) => {
		return await buildQuoteBuilderData(data.rfqId)
	})

export const recordSalesCallOutcome = createServerFn({ method: 'POST' })
	.inputValidator(
		z.object({
			rfqId: z.string(),
			outcome: z.enum([
				'provider_not_configured',
				'reached_customer',
				'no_answer',
				'requested_changes',
				'customer_canceled',
			]),
			notes: z.string().optional(),
		}),
	)
	.handler(async ({ data }) => {
		if (!isUuid(data.rfqId)) {
			return {
				success: false as const,
				message: 'Call can only be recorded after the quote has a request id.',
			}
		}
		const auth = await getInternalSupabaseClient()
		const notes = data.notes?.trim() || null
		const { error } = await auth.client.rpc('sales_record_call_note', {
			p_order_id: data.rfqId,
			p_outcome: data.outcome,
			p_notes: notes,
		})
		if (error) throw new Error(error.message)
		return {
			success: true as const,
			message:
				data.outcome === 'provider_not_configured'
					? 'Call provider is not configured locally; outcome recorded.'
					: 'Call outcome recorded.',
		}
	})

export const getSalesApprovers = createServerFn({ method: 'POST' })
	.inputValidator(z.object({}))
	.handler(async () => {
		const auth = await getInternalSupabaseClient()
		const { data, error } = await auth.client
			.from('employees')
			.select('id, full_name, is_ceo, employee_roles(role)')
			.eq('status', 'active')
			.order('full_name', { ascending: true })
		if (error) throw new Error(error.message)

		const approvers = ((data ?? []) as unknown as SupabaseApproverEmployeeRow[])
			.filter(isSalesApprover)
			.map((employee) => ({
				id: employee.id,
				name: employee.full_name,
			}))

		return { approvers }
	})

export const validateSalesApproverCredential = createServerFn({
	method: 'POST',
})
	.inputValidator(
		z.object({
			approverId: z.string().min(1),
			securityMethod: z.enum(['password', 'qr']),
			securityToken: z.string().min(1),
		}),
	)
	.handler(async ({ data }) => {
		const auth = await getInternalSupabaseClient()
		return verifyEmployeeCredential({
			allowedRoles: SALES_APPROVER_ROLES,
			client: auth.client,
			employeeId: data.approverId,
			method: data.securityMethod,
			password: data.securityToken,
		})
	})

// ─── Product Catalog (consumed by the quote builder search menu) ──

export const getProductCatalog = createServerFn({ method: 'POST' })
	.inputValidator(z.object({}))
	.handler(async () => {
		const auth = await getInternalSupabaseClient()
		const { data: products, error } = await auth.client
			.from('products')
			.select(`
					id,
					slug,
					name,
					category,
					subcategory,
					unit_of_measure,
					price_range_min,
					price_range_max,
					updated_at,
					supplier_product_links (
						raw_cost,
						is_primary,
						last_quoted_at,
						suppliers (
							name
						)
					)
				`)
			.eq('is_active', true)
			.neq('availability_status', 'hidden')
			.order('name', { ascending: true })
			.limit(500)
		if (error) throw new Error(error.message)
		return {
			products: ((products ?? []) as SupabaseQuoteBuilderProductRow[]).map(
				(product) => {
					const price = productPriceFreshness(product)
					return {
						id: product.id,
						slug: product.slug,
						name: product.name,
						specification: product.subcategory?.replace(/_/g, ' ') ?? '',
						unit: product.unit_of_measure,
						category: product.category,
						supplierCost: price.supplierCost,
						freshness: price.freshness,
						priceStatus: price.priceStatus,
						recentlyOrdered: false,
						supplierName: price.supplierName,
					}
				},
			),
		}
	})
