import {
	appendSetCookieHeaders,
	createActorServiceRoleClient,
	createSupabaseServerClient,
	createSupabaseServiceRoleClient,
	getSupabaseServerUser,
	resolveSupabaseRuntimeConfig,
} from '@hyperquote/auth/server'
import {
	type CustomerQuoteCartProductRow,
	type CustomerQuoteCartRow,
	type CustomerQuoteCartStore,
	loadSyncedCustomerQuoteCart,
	quoteCartSnapshotInput,
	type RemoteQuoteCartSnapshot,
	saveSyncedCustomerQuoteCart,
} from '@hyperquote/quote-cart/server'
import { createServerFn, createServerOnlyFn } from '@tanstack/react-start'
import { getRequest, getResponse } from '@tanstack/react-start/server'
import { logWebsiteServerError } from './server-log'

const getAuthenticatedClient = createServerOnlyFn(async () => {
	const config = await resolveSupabaseRuntimeConfig(process.env)
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
			const cart = await loadSyncedCustomerQuoteCart({
				customerId: auth.customerId,
				source: 'website',
				store: createQuoteCartStore(auth.client),
			})
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
				const cart = await saveSyncedCustomerQuoteCart({
					customerId: auth.customerId,
					input,
					store: createQuoteCartStore(auth.client),
				})
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

function createQuoteCartStore(
	client: WebsiteSupabaseClient,
): CustomerQuoteCartStore {
	// Supabase keeps the app-specific generated table type here; the shared
	// cart helper owns this narrower projected row contract.
	return {
		async listOrderableProducts(productIds) {
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
			return (data ?? []) as CustomerQuoteCartProductRow[]
		},
		async loadCart(customerId) {
			const { data, error } = await client
				.from('customer_quote_carts')
				.select('items, global_note, updated_at, version')
				.eq('customer_id', customerId)
				.maybeSingle()
			if (error) throw error
			return data as CustomerQuoteCartRow | null
		},
		async updateCart(customerId, snapshot, source, version) {
			const { data, error } = await client
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
			return data as CustomerQuoteCartRow
		},
		async upsertCart(customerId, snapshot, source, version) {
			const { data, error } = await client
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
			return data as CustomerQuoteCartRow
		},
	}
}
