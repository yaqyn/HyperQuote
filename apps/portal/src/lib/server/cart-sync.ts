import {
	type QuoteCartItem,
	type RemoteQuoteCartSnapshot,
	sanitizeQuoteCartSnapshot,
} from '@hyperquote/quote-cart'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { getAuthenticatedPortalCustomer } from './_supabase'

const quoteCartItemInput = z.object({
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

const quoteCartSnapshotInput = z.object({
	globalNote: z.string().max(2000).optional(),
	items: z.array(quoteCartItemInput).max(100),
	source: z.enum(['portal', 'website']),
})

type QuoteCartSnapshotInput = z.infer<typeof quoteCartSnapshotInput>
type AuthedSupabase = Awaited<
	ReturnType<typeof getAuthenticatedPortalCustomer>
>['supabase']

interface ProductRow {
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

interface CartRow {
	global_note: string | null
	items: unknown
	updated_at: string
	version: number | null
}

export const getPortalQuoteCart = createServerFn({ method: 'GET' }).handler(
	async (): Promise<
		| { success: true; cart: RemoteQuoteCartSnapshot | null }
		| { success: false; error: 'load_failed' | 'not_authenticated' }
	> => {
		try {
			const { customerId, supabase } = await getAuthenticatedPortalCustomer()
			const cart = await loadCustomerQuoteCart(supabase, customerId)
			return { success: true, cart }
		} catch (error) {
			return {
				success: false,
				error:
					error instanceof Error && error.message === 'Unauthorized'
						? 'not_authenticated'
						: 'load_failed',
			}
		}
	},
)

export const savePortalQuoteCart = createServerFn({ method: 'POST' })
	.inputValidator(quoteCartSnapshotInput)
	.handler(
		async ({
			data: input,
		}): Promise<
			| { success: true; cart: RemoteQuoteCartSnapshot }
			| { success: false; error: 'not_authenticated' | 'save_failed' }
		> => {
			try {
				const { customerId, supabase } = await getAuthenticatedPortalCustomer()
				const cart = await saveCustomerQuoteCart(supabase, customerId, input)
				return { success: true, cart }
			} catch (error) {
				return {
					success: false,
					error:
						error instanceof Error && error.message === 'Unauthorized'
							? 'not_authenticated'
							: 'save_failed',
				}
			}
		},
	)

async function loadCustomerQuoteCart(
	supabase: AuthedSupabase,
	customerId: string,
): Promise<RemoteQuoteCartSnapshot | null> {
	const { data, error } = await supabase
		.from('customer_quote_carts')
		.select('items, global_note, updated_at, version')
		.eq('customer_id', customerId)
		.maybeSingle()
	if (error) throw error
	if (!data) return null
	const snapshot = cartRowToSnapshot(data as CartRow)
	const orderableSnapshot = await sanitizeOrderableCartSnapshot(supabase, {
		...snapshot,
		source: 'portal',
	})
	return { ...snapshot, ...orderableSnapshot }
}

async function saveCustomerQuoteCart(
	supabase: AuthedSupabase,
	customerId: string,
	input: QuoteCartSnapshotInput,
): Promise<RemoteQuoteCartSnapshot> {
	const snapshot = await sanitizeOrderableCartSnapshot(supabase, input)
	const current = await loadCustomerQuoteCart(supabase, customerId)
	const { data, error } = await supabase
		.from('customer_quote_carts')
		.upsert(
			{
				customer_id: customerId,
				global_note: snapshot.globalNote,
				items: snapshot.items,
				source: input.source,
				version: (current?.version ?? 0) + 1,
			},
			{ onConflict: 'customer_id' },
		)
		.select('items, global_note, updated_at, version')
		.single()
	if (error || !data) throw error ?? new Error('Cart sync failed')
	return cartRowToSnapshot(data as CartRow)
}

async function sanitizeOrderableCartSnapshot(
	supabase: AuthedSupabase,
	input: QuoteCartSnapshotInput,
) {
	const snapshot = sanitizeQuoteCartSnapshot(input)
	const productIds = Array.from(
		new Set(snapshot.items.map((item) => item.productId)),
	)
	if (productIds.length === 0)
		return { globalNote: snapshot.globalNote, items: [] }

	const { data, error } = await supabase
		.from('products')
		.select(
			'id, slug, name, name_ar, category, unit_of_measure, unit_of_measure_ar, image_urls, is_active, availability_status',
		)
		.in('id', productIds)
		.eq('is_active', true)
		.neq('availability_status', 'hidden')
		.neq('availability_status', 'out_of_stock')
	if (error) throw error

	const products = new Map(
		((data ?? []) as ProductRow[]).map((product) => [product.id, product]),
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

function toCartItem(product: ProductRow, item: QuoteCartItem): QuoteCartItem {
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

function cartRowToSnapshot(row: CartRow): RemoteQuoteCartSnapshot {
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
