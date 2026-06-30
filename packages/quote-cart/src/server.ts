import { z } from 'zod'
import {
	getQuoteCartFingerprint,
	type QuoteCartItem,
	type QuoteCartSnapshot,
	type RemoteQuoteCartSnapshot,
	sanitizeQuoteCartSnapshot,
} from './index'

export type { RemoteQuoteCartSnapshot } from './index'

export type QuoteCartSource = 'portal' | 'website'

export const quoteCartItemInput = z.object({
	category: z.string().max(120).optional(),
	categoryName: z.string().max(160).optional(),
	categoryNameAr: z.string().max(160).optional(),
	imageUrl: z.string().max(1000).optional(),
	name: z.string().min(1).max(240),
	nameAr: z.string().max(240).optional(),
	note: z.string().max(1000).optional(),
	productId: z.string().uuid(),
	quantity: z.number().int().min(0).max(1_000_000),
	slug: z.string().max(240).optional(),
	unitOfMeasure: z.string().min(1).max(80),
	unitOfMeasureAr: z.string().max(80).optional(),
})

export const quoteCartSnapshotInput = z.object({
	globalNote: z.string().max(2000).optional(),
	items: z.array(quoteCartItemInput).max(100),
	source: z.enum(['portal', 'website']),
})

export interface CustomerQuoteCartSnapshotInput {
	globalNote?: string
	items: unknown
	source: QuoteCartSource
}

export interface CustomerQuoteCartRow {
	global_note: string | null
	items: unknown
	updated_at: string
	version: number | null
}

export interface CustomerQuoteCartProductRow {
	availability_status: string
	category: string
	id: string
	image_urls: string[] | null
	is_active: boolean
	name: string
	name_ar: string | null
	slug: string | null
	unit_of_measure: string
	unit_of_measure_ar: string | null
}

export interface CustomerQuoteCartStore {
	listOrderableProducts: (
		productIds: string[],
	) => Promise<CustomerQuoteCartProductRow[]>
	loadCart: (customerId: string) => Promise<CustomerQuoteCartRow | null>
	updateCart: (
		customerId: string,
		snapshot: QuoteCartSnapshot,
		source: QuoteCartSource,
		version: number,
	) => Promise<CustomerQuoteCartRow>
	upsertCart: (
		customerId: string,
		snapshot: QuoteCartSnapshot,
		source: QuoteCartSource,
		version: number,
	) => Promise<CustomerQuoteCartRow>
}

interface QueryResult<T>
	extends PromiseLike<{ data: T | null; error: unknown }> {}

interface CustomerQuoteCartProductsQuery
	extends QueryResult<CustomerQuoteCartProductRow[]> {
	eq: (column: string, value: unknown) => CustomerQuoteCartProductsQuery
	in: (column: string, values: string[]) => CustomerQuoteCartProductsQuery
	neq: (column: string, value: unknown) => CustomerQuoteCartProductsQuery
}

interface CustomerQuoteCartMaybeSingleQuery
	extends QueryResult<CustomerQuoteCartRow | null> {
	maybeSingle: () => QueryResult<CustomerQuoteCartRow | null>
}

interface CustomerQuoteCartSingleQuery
	extends QueryResult<CustomerQuoteCartRow> {
	single: () => QueryResult<CustomerQuoteCartRow>
}

interface CustomerQuoteCartSelectQuery {
	eq: (column: string, value: unknown) => CustomerQuoteCartMaybeSingleQuery
}

interface CustomerQuoteCartUpdateQuery {
	eq: (column: string, value: unknown) => CustomerQuoteCartUpdateQuery
	select: (columns: string) => CustomerQuoteCartSingleQuery
}

interface CustomerQuoteCartUpsertQuery {
	select: (columns: string) => CustomerQuoteCartSingleQuery
}

interface CustomerQuoteCartProductsTable {
	select: (columns: string) => CustomerQuoteCartProductsQuery
}

interface CustomerQuoteCartsTable {
	select: (columns: string) => CustomerQuoteCartSelectQuery
	update: (values: {
		global_note: string
		items: QuoteCartItem[]
		source: QuoteCartSource
		version: number
	}) => CustomerQuoteCartUpdateQuery
	upsert: (
		values: {
			customer_id: string
			global_note: string
			items: QuoteCartItem[]
			source: QuoteCartSource
			version: number
		},
		options: { onConflict: string },
	) => CustomerQuoteCartUpsertQuery
}

export interface CustomerQuoteCartDatabaseClient {
	from: {
		(table: 'products'): CustomerQuoteCartProductsTable
		(table: 'customer_quote_carts'): CustomerQuoteCartsTable
	}
}

export function createCustomerQuoteCartStore(
	client: unknown,
): CustomerQuoteCartStore {
	// App Supabase clients carry app-specific generated table types; this adapter
	// owns the narrower selected row projection used by the shared cart contract.
	const db = client as CustomerQuoteCartDatabaseClient

	return {
		async listOrderableProducts(productIds) {
			const { data, error } = await db
				.from('products')
				.select(
					'id, slug, name, name_ar, category, unit_of_measure, unit_of_measure_ar, image_urls, is_active, availability_status',
				)
				.in('id', productIds)
				.eq('is_active', true)
				.neq('availability_status', 'hidden')
				.neq('availability_status', 'out_of_stock')
			if (error) throw error
			return data ?? []
		},
		async loadCart(customerId) {
			const { data, error } = await db
				.from('customer_quote_carts')
				.select('items, global_note, updated_at, version')
				.eq('customer_id', customerId)
				.maybeSingle()
			if (error) throw error
			return data
		},
		async updateCart(customerId, snapshot, source, version) {
			const { data, error } = await db
				.from('customer_quote_carts')
				.update({
					global_note: snapshot.globalNote,
					items: snapshot.items,
					source,
					version,
				})
				.eq('customer_id', customerId)
				.select('items, global_note, updated_at, version')
				.single()
			if (error || !data) throw error ?? new Error('Cart purge failed')
			return data
		},
		async upsertCart(customerId, snapshot, source, version) {
			const { data, error } = await db
				.from('customer_quote_carts')
				.upsert(
					{
						customer_id: customerId,
						global_note: snapshot.globalNote,
						items: snapshot.items,
						source,
						version,
					},
					{ onConflict: 'customer_id' },
				)
				.select('items, global_note, updated_at, version')
				.single()
			if (error || !data) throw error ?? new Error('Cart sync failed')
			return data
		},
	}
}

export async function loadSyncedCustomerQuoteCart(options: {
	customerId: string
	source: QuoteCartSource
	store: CustomerQuoteCartStore
}): Promise<RemoteQuoteCartSnapshot | null> {
	const row = await options.store.loadCart(options.customerId)
	if (!row) return null

	const snapshot = cartRowToSnapshot(row)
	const orderableSnapshot = await sanitizeOrderableCartSnapshot(options.store, {
		...snapshot,
		source: options.source,
	})
	const sanitizedSnapshot = { ...snapshot, ...orderableSnapshot }

	if (cartSnapshotChanged(snapshot, sanitizedSnapshot)) {
		const purgedRow = await options.store.updateCart(
			options.customerId,
			sanitizedSnapshot,
			options.source,
			snapshot.version + 1,
		)
		return cartRowToSnapshot(purgedRow)
	}

	return sanitizedSnapshot
}

export async function saveSyncedCustomerQuoteCart(options: {
	customerId: string
	input: CustomerQuoteCartSnapshotInput
	store: CustomerQuoteCartStore
}): Promise<RemoteQuoteCartSnapshot> {
	const snapshot = await sanitizeOrderableCartSnapshot(
		options.store,
		options.input,
	)
	const current = await loadSyncedCustomerQuoteCart({
		customerId: options.customerId,
		source: options.input.source,
		store: options.store,
	})
	const row = await options.store.upsertCart(
		options.customerId,
		snapshot,
		options.input.source,
		(current?.version ?? 0) + 1,
	)
	return cartRowToSnapshot(row)
}

async function sanitizeOrderableCartSnapshot(
	store: CustomerQuoteCartStore,
	input: CustomerQuoteCartSnapshotInput,
): Promise<QuoteCartSnapshot> {
	const snapshot = sanitizeQuoteCartSnapshot(input)
	const productIds = Array.from(
		new Set(snapshot.items.map((item) => item.productId)),
	)
	if (productIds.length === 0) {
		return { globalNote: snapshot.globalNote, items: [] }
	}

	const products = new Map(
		(await store.listOrderableProducts(productIds)).map((product) => [
			product.id,
			product,
		]),
	)

	return {
		globalNote: snapshot.globalNote,
		items: snapshot.items.flatMap((item) => {
			const product = products.get(item.productId)
			if (!product) return []
			return [toCartItem(product, item)]
		}),
	}
}

function toCartItem(
	product: CustomerQuoteCartProductRow,
	item: QuoteCartItem,
): QuoteCartItem {
	return {
		category: product.category,
		categoryName: item.categoryName || product.category,
		categoryNameAr:
			item.categoryNameAr || item.categoryName || product.category,
		imageUrl: product.image_urls?.[0] ?? item.imageUrl,
		name: product.name,
		nameAr: product.name_ar || item.nameAr || product.name,
		note: item.note,
		productId: product.id,
		quantity: item.quantity,
		slug: product.slug || item.slug || product.id,
		unitOfMeasure: product.unit_of_measure,
		unitOfMeasureAr: product.unit_of_measure_ar || item.unitOfMeasureAr,
	}
}

function cartRowToSnapshot(row: CustomerQuoteCartRow): RemoteQuoteCartSnapshot {
	const snapshot = sanitizeQuoteCartSnapshot({
		globalNote: row.global_note ?? '',
		items: row.items,
	})
	return {
		globalNote: snapshot.globalNote,
		items: snapshot.items,
		updatedAt: row.updated_at,
		version: row.version ?? 1,
	}
}

function cartSnapshotChanged(
	before: Pick<RemoteQuoteCartSnapshot, 'globalNote' | 'items'>,
	after: Pick<RemoteQuoteCartSnapshot, 'globalNote' | 'items'>,
): boolean {
	return (
		getQuoteCartFingerprint(before.items, before.globalNote) !==
		getQuoteCartFingerprint(after.items, after.globalNote)
	)
}
