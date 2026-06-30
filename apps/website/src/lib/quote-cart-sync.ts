import {
	createCustomerQuoteCartStore,
	loadSyncedCustomerQuoteCart,
	quoteCartSnapshotInput,
	type RemoteQuoteCartSnapshot,
	saveSyncedCustomerQuoteCart,
} from '@hyperquote/quote-cart/server'
import { createServerFn } from '@tanstack/react-start'
import {
	appendWebsiteAuthCookies,
	getAuthenticatedWebsiteCustomer,
} from './customer-auth-context'
import { logWebsiteServerError } from './server-log'

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
			const auth = await getAuthenticatedWebsiteCustomer()
			if ('error' in auth) {
				return { success: false, error: auth.error ?? 'load_failed' }
			}
			const cart = await loadSyncedCustomerQuoteCart({
				customerId: auth.customerId,
				source: 'website',
				store: createCustomerQuoteCartStore(auth.client),
			})
			await appendWebsiteAuthCookies(auth)
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
				const auth = await getAuthenticatedWebsiteCustomer()
				if ('error' in auth) {
					return { success: false, error: auth.error ?? 'save_failed' }
				}
				const cart = await saveSyncedCustomerQuoteCart({
					customerId: auth.customerId,
					input,
					store: createCustomerQuoteCartStore(auth.client),
				})
				await appendWebsiteAuthCookies(auth)
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
