import {
	appendSetCookieHeaders,
	createActorServiceRoleClient,
	createSupabaseServerClient,
	createSupabaseServiceRoleClient,
	getSupabaseServerUser,
	resolveSupabaseRuntimeConfig,
} from '@hyperquote/auth/server'
import { createServerOnlyFn } from '@tanstack/react-start'
import { getRequest, getResponse } from '@tanstack/react-start/server'

export const getAuthenticatedWebsiteCustomer = createServerOnlyFn(async () => {
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

export type AuthenticatedWebsiteCustomer = Exclude<
	Awaited<ReturnType<typeof getAuthenticatedWebsiteCustomer>>,
	{ error: unknown }
>

export type WebsiteCustomerSupabaseClient =
	AuthenticatedWebsiteCustomer['client']

export const appendWebsiteAuthCookies = createServerOnlyFn(
	(auth: AuthenticatedWebsiteCustomer) => {
		appendSetCookieHeaders(
			getResponse().headers,
			auth.responseCookies.values(),
			auth.responseHeaders.entries(),
		)
	},
)
