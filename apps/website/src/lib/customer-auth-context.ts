import {
	appendContextAuthCookies,
	getAuthenticatedCustomerRequestContext,
} from '@hyperquote/auth/customer-server'
import { createServerOnlyFn } from '@tanstack/react-start'

type AuthenticatedCustomerRequestContext = Exclude<
	Awaited<ReturnType<typeof getAuthenticatedCustomerRequestContext>>,
	null | { error: unknown }
>

type WebsiteCustomerAuthError =
	| { error: 'customer_required' }
	| { error: 'not_authenticated' }
	| { error: 'not_configured' }

type WebsiteCustomerAuthSuccess = {
	client: AuthenticatedCustomerRequestContext['dbClient']
	customerId: string
	responseCookies: AuthenticatedCustomerRequestContext['responseCookies']
	responseHeaders: AuthenticatedCustomerRequestContext['responseHeaders']
	user: AuthenticatedCustomerRequestContext['user']
}

type WebsiteCustomerAuthResult =
	| WebsiteCustomerAuthError
	| WebsiteCustomerAuthSuccess

export const getAuthenticatedWebsiteCustomer = createServerOnlyFn(
	async (): Promise<WebsiteCustomerAuthResult> => {
		const auth = await getAuthenticatedCustomerRequestContext()
		if (!auth) return { error: 'not_configured' as const }
		if ('error' in auth) {
			return {
				error:
					auth.error === 'not_authenticated'
						? 'not_authenticated'
						: 'not_configured',
			}
		}

		const { data: customer, error } = await auth.dbClient
			.from('customers')
			.select('id')
			.eq('user_id', auth.user.id)
			.maybeSingle()

		if (error) throw error
		if (!customer) return { error: 'customer_required' as const }

		return {
			client: auth.dbClient,
			customerId: customer.id,
			responseCookies: auth.responseCookies,
			responseHeaders: auth.responseHeaders,
			user: auth.user,
		}
	},
)

export type AuthenticatedWebsiteCustomer = Exclude<
	Awaited<ReturnType<typeof getAuthenticatedWebsiteCustomer>>,
	{ error: unknown }
>

export type WebsiteCustomerSupabaseClient =
	AuthenticatedWebsiteCustomer['client']

export const appendWebsiteAuthCookies = createServerOnlyFn(
	(auth: AuthenticatedWebsiteCustomer) => {
		appendContextAuthCookies(auth)
	},
)
