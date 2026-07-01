import { isCustomerAuthUser } from '@hyperquote/auth/customer'
import {
	claimCustomerAccountInput,
	createCustomerAccountInput,
	customerEmailPasswordInput,
	customerPasswordResetCompleteInput,
	customerPasswordResetRequestInput,
	sendCustomerOtpInput,
	verifyCustomerOtpInput,
} from '@hyperquote/auth/customer-schemas'
import {
	appendContextAuthCookies,
	createCustomerAuthServerHandlers,
	createCustomerDataClient,
	getCustomerAuthRequestContext,
	getCustomerServerUser,
} from '@hyperquote/auth/customer-server'
import { createServerFn } from '@tanstack/react-start'
import { logWebsiteServerError } from './server-log'

function websiteAuthHandlers() {
	return createCustomerAuthServerHandlers({
		source: 'website',
		logError: logWebsiteServerError,
	})
}

export const checkWebsiteAccount = createServerFn({ method: 'GET' }).handler(
	async () => {
		try {
			const context = await getCustomerAuthRequestContext()
			if (!context) return { authenticated: false, configured: false }

			const {
				data: { user },
			} = await getCustomerServerUser(context)
			appendContextAuthCookies(context)
			if (!user) return { authenticated: false, configured: true }

			if (!isCustomerAuthUser(user)) {
				await context.client.auth.signOut()
				appendContextAuthCookies(context)
				return { authenticated: false, configured: true }
			}

			const dbClient = await createCustomerDataClient(user.id)
			if (!dbClient) return { authenticated: false, configured: true }

			const { data: customer } = await dbClient
				.from('customers')
				.select('company_name')
				.eq('user_id', user.id)
				.maybeSingle()

			return {
				authenticated: Boolean(customer),
				configured: true,
				companyName: customer?.company_name ?? null,
			}
		} catch (error) {
			logWebsiteServerError(
				'website.auth.check_account.unexpected_error',
				error,
			)
			return { authenticated: false, configured: true }
		}
	},
)

export const signOutWebsiteAccount = createServerFn({
	method: 'POST',
}).handler(() => websiteAuthHandlers().signOutAccount())

export const sendOTP = createServerFn({ method: 'POST' })
	.inputValidator(sendCustomerOtpInput)
	.handler(({ data }) => websiteAuthHandlers().sendOTP(data))

export const signInWithEmailPassword = createServerFn({ method: 'POST' })
	.inputValidator(customerEmailPasswordInput)
	.handler(({ data }) => websiteAuthHandlers().signInWithEmailPassword(data))

export const verifyOTP = createServerFn({ method: 'POST' })
	.inputValidator(verifyCustomerOtpInput)
	.handler(({ data }) => websiteAuthHandlers().verifyOTP(data))

export const requestPasswordReset = createServerFn({ method: 'POST' })
	.inputValidator(customerPasswordResetRequestInput)
	.handler(({ data }) => websiteAuthHandlers().requestPasswordReset(data))

export const createAccount = createServerFn({ method: 'POST' })
	.inputValidator(createCustomerAccountInput)
	.handler(({ data }) => websiteAuthHandlers().createAccount(data))

export const completePasswordReset = createServerFn({ method: 'POST' })
	.inputValidator(customerPasswordResetCompleteInput)
	.handler(({ data }) => websiteAuthHandlers().completePasswordReset(data))

export const claimAccount = createServerFn({ method: 'POST' })
	.inputValidator(claimCustomerAccountInput)
	.handler(({ data }) => websiteAuthHandlers().claimAccount(data))
