import {
	appendSetCookieHeaders,
	createActorServiceRoleClient,
	createSupabaseServerClient,
	createSupabaseServiceRoleClient,
	getSupabaseServerUser,
	resolveSupabaseWorkerConfig,
} from '@hyperquote/auth/server'
import {
	type QuoteCartItem,
	type RemoteQuoteCartSnapshot,
	sanitizeQuoteCartSnapshot,
} from '@hyperquote/quote-cart'
import { createServerFn, createServerOnlyFn } from '@tanstack/react-start'
import { getRequest, getResponse } from '@tanstack/react-start/server'
import { z } from 'zod'
import { logWebsiteServerError } from './server-log'

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

const getAuthenticatedClient = createServerOnlyFn(async () => {
	const config = await resolveSupabaseWorkerConfig(process.env)
	if (!config) return { error: 'not_configured' as const }

	const request = getRequest()
	const { client, responseCookies, responseHeaders } =
		createSupabaseServerClient({
			request,
			...config,
		})

	const {
		data: { user },
	} = await getSupabaseServerUser({
		client,
		cookieDomain: config.cookieDomain,
		cookieName: config.cookieName,
		request,
		responseHeaders: getResponse().headers,
	})

	if (!user) return { error: 'not_authenticated' as const }

	const service = await createSupabaseServiceRoleClient(process.env)
	if (!service) return { error: 'not_configured' as const }
	const dataClient = createActorServiceRoleClient({
		actorPool: 'external',
		actorUserId: user.id,
		client: service,
	})

	const { data: customer, error } = await dataClient
		.from('customers')
		.select('id')
		.eq('user_id', user.id)
		.maybeSingle()

	if (error) throw error
	if (!customer) return { error: 'customer_required' as const }

	return {
		client: dataClient,
		customerId: customer.id,
		responseCookies,
		responseHeaders,
		user,
	}
})

type AuthenticatedClient = Exclude<
	Awaited<ReturnType<typeof getAuthenticatedClient>>,
	{ error: unknown }
>
type WebsiteSupabaseClient = AuthenticatedClient['client']

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

const appendAuthCookies = createServerOnlyFn((auth: AuthenticatedClient) => {
	appendSetCookieHeaders(
		getResponse().headers,
		auth.responseCookies.values(),
		auth.responseHeaders.entries(),
	)
})

export const getWebsiteQuoteCart = createServerFn({ method: 'GET' }).handler(
	async (): Promise<
		| { success: true; cart: RemoteQuoteCartSnapshot | null }
		| {
				success: false
				error:
					| 'customer_required'
					| 'load_failed'
					| 'not_authenticated'
					| 'not_configured'
		  }
	> => {
		try {
			const auth = await getAuthenticatedClient()
			if ('error' in auth) {
				return { success: false, error: auth.error ?? 'load_failed' }
			}
			const cart = await loadCustomerQuoteCart(auth.client, auth.customerId)
			await appendAuthCookies(auth)
			return { success: true, cart }
		} catch (error) {
			logWebsiteServerError(
				'website.quote_request.save.unexpected_error',
				error,
			)
			return { success: false, error: 'load_failed' }
		}
	},
)

export const saveWebsiteQuoteCart = createServerFn({ method: 'POST' })
	.inputValidator(quoteCartSnapshotInput)
	.handler(
		async ({
			data: input,
		}): Promise<
			| { success: true; cart: RemoteQuoteCartSnapshot }
			| {
					success: false
					error:
						| 'customer_required'
						| 'not_authenticated'
						| 'not_configured'
						| 'save_failed'
			  }
		> => {
			try {
				const auth = await getAuthenticatedClient()
				if ('error' in auth) {
					return { success: false, error: auth.error ?? 'save_failed' }
				}
				const cart = await saveCustomerQuoteCart(
					auth.client,
					auth.customerId,
					input,
				)
				await appendAuthCookies(auth)
				return { success: true, cart }
			} catch (error) {
				logWebsiteServerError(
					'website.quote_request.save.unexpected_error',
					error,
				)
				return { success: false, error: 'save_failed' }
			}
		},
	)

async function loadCustomerQuoteCart(
	client: WebsiteSupabaseClient,
	customerId: string,
): Promise<RemoteQuoteCartSnapshot | null> {
	const { data, error } = await client
		.from('customer_quote_carts')
		.select('items, global_note, updated_at, version')
		.eq('customer_id', customerId)
		.maybeSingle()
	if (error) throw error
	if (!data) return null
	const snapshot = cartRowToSnapshot(data as CartRow)
	const orderableSnapshot = await sanitizeOrderableCartSnapshot(client, {
		...snapshot,
		source: 'website',
	})
	return { ...snapshot, ...orderableSnapshot }
}

async function saveCustomerQuoteCart(
	client: WebsiteSupabaseClient,
	customerId: string,
	input: QuoteCartSnapshotInput,
): Promise<RemoteQuoteCartSnapshot> {
	const snapshot = await sanitizeOrderableCartSnapshot(client, input)
	const current = await loadCustomerQuoteCart(client, customerId)
	const { data, error } = await client
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
	client: WebsiteSupabaseClient,
	input: QuoteCartSnapshotInput,
) {
	const snapshot = sanitizeQuoteCartSnapshot(input)
	const productIds = Array.from(
		new Set(snapshot.items.map((item) => item.productId)),
	)
	if (productIds.length === 0)
		return { globalNote: snapshot.globalNote, items: [] }

	const { data, error } = await client
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
