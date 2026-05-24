import {
	type CustomerQuoteCartProductRow,
	type CustomerQuoteCartRow,
	type CustomerQuoteCartStore,
	loadSyncedCustomerQuoteCart,
	quoteCartSnapshotInput,
	type RemoteQuoteCartSnapshot,
	saveSyncedCustomerQuoteCart,
} from '@hyperquote/quote-cart/server'
import { createServerFn } from '@tanstack/react-start'
import { getAuthenticatedPortalCustomer } from './_supabase'

type AuthedSupabase = Awaited<
	ReturnType<typeof getAuthenticatedPortalCustomer>
>['supabase']

export const getPortalQuoteCart = createServerFn({ method: 'GET' }).handler(
	async (): Promise<
		| { success: true; cart: RemoteQuoteCartSnapshot | null }
		| { success: false; error: 'load_failed' | 'not_authenticated' }
	> => {
		try {
			const { customerId, supabase } = await getAuthenticatedPortalCustomer()
			const cart = await loadSyncedCustomerQuoteCart({
				customerId,
				source: 'portal',
				store: createQuoteCartStore(supabase),
			})
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
				const cart = await saveSyncedCustomerQuoteCart({
					customerId,
					input,
					store: createQuoteCartStore(supabase),
				})
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

function createQuoteCartStore(
	supabase: AuthedSupabase,
): CustomerQuoteCartStore {
	// Supabase keeps the app-specific generated table type here; the shared
	// cart helper owns this narrower projected row contract.
	return {
		async listOrderableProducts(productIds) {
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
			return (data ?? []) as CustomerQuoteCartProductRow[]
		},
		async loadCart(customerId) {
			const { data, error } = await supabase
				.from('customer_quote_carts')
				.select('items, global_note, updated_at, version')
				.eq('customer_id', customerId)
				.maybeSingle()
			if (error) throw error
			return data as CustomerQuoteCartRow | null
		},
		async updateCart(customerId, snapshot, source, version) {
			const { data, error } = await supabase
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
			const { data, error } = await supabase
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
