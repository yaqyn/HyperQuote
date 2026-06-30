import {
	createCustomerQuoteCartStore,
	loadSyncedCustomerQuoteCart,
	quoteCartSnapshotInput,
	type RemoteQuoteCartSnapshot,
	saveSyncedCustomerQuoteCart,
} from '@hyperquote/quote-cart/server'
import { createServerFn } from '@tanstack/react-start'
import { getAuthenticatedPortalCustomer } from './_supabase'

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
				store: createCustomerQuoteCartStore(supabase),
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
					store: createCustomerQuoteCartStore(supabase),
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
