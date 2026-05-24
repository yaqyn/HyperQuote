import {
	claimAuthenticatedCustomerProfile,
	createAuthenticatedCustomerProfile,
	formattedEgyptPhone,
	isCustomerAuthUser,
	normalizedEmail,
	sendCustomerOtp,
	signInCustomerWithEmailPassword,
	verifyCustomerOtp,
} from '@hyperquote/auth/customer'
import {
	checkOTPVerifyLimit,
	checkRateLimit,
	clearRateLimit,
	getRateLimitStore,
} from '@hyperquote/auth/rate-limit'
import {
	appendSetCookieHeaders,
	createActorServiceRoleClient,
	createSupabaseServerClient,
	createSupabaseServiceRoleClient,
	getSupabaseServerUser,
	resolveSupabaseRuntimeConfig,
} from '@hyperquote/auth/server'
import { createServerFn } from '@tanstack/react-start'
import { getRequest, getResponse } from '@tanstack/react-start/server'
import { z } from 'zod'
import { logWebsiteServerError } from './server-log'

// ============================================================================
// Input Schemas
// ============================================================================

const phoneSchema = z.string().regex(/^(10|11|12|15)\d{8}$/)

const sendOTPInput = z.object({
	phone: phoneSchema,
	method: z.enum(['whatsapp', 'sms']),
})

const verifyOTPInput = z.object({
	phone: phoneSchema,
	code: z
		.string()
		.length(6)
		.regex(/^\d{6}$/),
})

const createAccountInput = z.object({
	phone: phoneSchema,
	companyName: z.string().min(1).max(200),
	fullName: z.string().min(1).max(100),
	method: z.enum(['phone_otp', 'email_password']).optional(),
})

const claimAccountInput = z.object({
	phone: phoneSchema,
})

const emailPasswordInput = z.object({
	email: z.string().trim().email().max(254),
	password: z.string().min(6).max(128),
})

const emailPasswordSignupInput = emailPasswordInput.extend({
	phone: phoneSchema,
	companyName: z.string().min(1).max(200),
	fullName: z.string().min(1).max(100),
})

type EmailAuthError =
	| 'email_not_confirmed'
	| 'invalid_credentials'
	| 'signup_failed'

function getSupabaseConfig() {
	return resolveSupabaseRuntimeConfig(process.env)
}

function appendPendingAuthCookies(
	cookies: Iterable<string>,
	headers: Iterable<[string, string]> = [],
) {
	appendSetCookieHeaders(getResponse().headers, cookies, headers)
}

async function createCustomerDataClient(userId: string) {
	const service = await createSupabaseServiceRoleClient(process.env)
	if (!service) return null
	return createActorServiceRoleClient({
		actorPool: 'external',
		actorUserId: userId,
		client: service,
	})
}

async function getAuthenticatedClient() {
	const config = await getSupabaseConfig()
	if (!config) return null

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
	if (!user) {
		return { error: 'not_authenticated' as const }
	}
	const dbClient = await createCustomerDataClient(user.id)
	if (!dbClient) return { error: 'not_configured' as const }

	return { client, dbClient, responseCookies, responseHeaders, user }
}

function confirmationRedirectUrl(request: Request): string {
	const url = new URL(request.url)
	return `${url.origin}/login`
}

export const checkWebsiteAccount = createServerFn({ method: 'GET' }).handler(
	async () => {
		try {
			const config = await getSupabaseConfig()
			if (!config) return { authenticated: false, configured: false }

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
			appendPendingAuthCookies(
				responseCookies.values(),
				responseHeaders.entries(),
			)
			if (!user) return { authenticated: false, configured: true }
			if (!isCustomerAuthUser(user)) {
				await client.auth.signOut()
				appendPendingAuthCookies(
					responseCookies.values(),
					responseHeaders.entries(),
				)
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
		} catch (err) {
			logWebsiteServerError('website.auth.check_account.unexpected_error', err)
			return { authenticated: false, configured: true }
		}
	},
)

// ============================================================================
// signOutWebsiteAccount — Clear the shared customer Supabase session.
// ============================================================================

export const signOutWebsiteAccount = createServerFn({ method: 'POST' }).handler(
	async (): Promise<{ success: boolean }> => {
		const config = await getSupabaseConfig()
		if (!config) return { success: true }

		const request = getRequest()
		const { client, responseCookies, responseHeaders } =
			createSupabaseServerClient({
				request,
				...config,
			})

		const { error } = await client.auth.signOut()
		appendPendingAuthCookies(
			responseCookies.values(),
			responseHeaders.entries(),
		)
		if (error) {
			logWebsiteServerError('website.auth.sign_out.supabase_error', error)
			return { success: false }
		}

		return { success: true }
	},
)

export const signUpWithEmailPassword = createServerFn({ method: 'POST' })
	.inputValidator(emailPasswordSignupInput)
	.handler(
		async ({
			data: input,
		}): Promise<{
			success: boolean
			error?: EmailAuthError
			needsConfirmation?: boolean
		}> => {
			try {
				const config = await getSupabaseConfig()
				if (!config) return { success: false, error: 'signup_failed' }

				const request = getRequest()
				const { client } = createSupabaseServerClient({
					request,
					...config,
				})

				const formattedPhone = formattedEgyptPhone(input.phone)
				const { data, error } = await client.auth.signUp({
					email: normalizedEmail(input.email),
					password: input.password,
					options: {
						emailRedirectTo: confirmationRedirectUrl(request),
						data: {
							company_name: input.companyName.trim(),
							contact_name: input.fullName.trim(),
							phone: formattedPhone,
							pool: 'external',
						},
					},
				})

				if (error || !data.user) {
					logWebsiteServerError(
						'website.auth.email_signup.supabase_error',
						error,
					)
					return { success: false, error: 'signup_failed' }
				}

				if (data.session) {
					await client.auth.signOut()
				}

				return { success: true, needsConfirmation: true }
			} catch (err) {
				logWebsiteServerError('website.auth.email_signup.unexpected_error', err)
				return { success: false, error: 'signup_failed' }
			}
		},
	)

export const signInWithEmailPassword = createServerFn({ method: 'POST' })
	.inputValidator(emailPasswordInput)
	.handler(
		async ({
			data: input,
		}): Promise<{
			success: boolean
			error?: EmailAuthError
			needsAccount?: boolean
			prefill?: { companyName?: string; fullName?: string; phone?: string }
		}> => {
			try {
				const config = await getSupabaseConfig()
				if (!config) return { success: false, error: 'invalid_credentials' }

				const request = getRequest()
				const { client, responseCookies, responseHeaders } =
					createSupabaseServerClient({
						request,
						...config,
					})

				return signInCustomerWithEmailPassword({
					client,
					email: input.email,
					password: input.password,
					source: 'website',
					appendAuthCookies: () =>
						appendPendingAuthCookies(
							responseCookies.values(),
							responseHeaders.entries(),
						),
					resolveDbClient: createCustomerDataClient,
					onActivityError: (error) =>
						logWebsiteServerError(
							'website.auth.activity.supabase_error',
							error,
						),
				})
			} catch (err) {
				logWebsiteServerError('website.auth.email_signin.unexpected_error', err)
				return { success: false, error: 'invalid_credentials' }
			}
		},
	)

// ============================================================================
// sendOTP — Request OTP via WhatsApp or SMS
// ============================================================================

export const sendOTP = createServerFn({ method: 'POST' })
	.inputValidator(sendOTPInput)
	.handler(async ({ data: input }) => {
		try {
			const rateLimitStore = await getRateLimitStore()

			// Rate limit: 3 attempts per phone per 60 seconds
			const rateResult = await checkRateLimit(rateLimitStore, {
				key: `sendOTP:${input.phone}`,
				limit: 3,
				windowSeconds: 60,
			})

			if (!rateResult.allowed) {
				return {
					success: false,
					error: 'rate_limited' as const,
					retryAfter: rateResult.retryAfter,
				}
			}

			const formattedPhone = formattedEgyptPhone(input.phone)
			const config = await getSupabaseConfig()

			if (!config) {
				return { success: false, error: 'send_failed' as const }
			}

			const request = getRequest()
			const { client } = createSupabaseServerClient({
				request,
				...config,
			})

			const result = await sendCustomerOtp({
				client,
				formattedPhone,
				method: input.method,
				allowProviderFallback: true,
				supabaseUrl: config.supabaseUrl,
			})

			if (!result.success) {
				logWebsiteServerError(
					'website.auth.send_otp.supabase_error',
					result.error,
				)
				return { success: false, error: 'send_failed' as const }
			}

			return { success: true, expiresIn: result.expiresIn ?? 300 }
		} catch (err) {
			logWebsiteServerError('website.auth.send_otp.unexpected_error', err)
			return { success: false, error: 'send_failed' as const }
		}
	})

// ============================================================================
// verifyOTP — Verify OTP code and check for existing account
// ============================================================================

export const verifyOTP = createServerFn({ method: 'POST' })
	.inputValidator(verifyOTPInput)
	.handler(async ({ data: input }) => {
		try {
			const rateLimitStore = await getRateLimitStore()

			// Rate limit: 5 attempts per phone per 60s, then 15-minute lockout
			const rateResult = await checkOTPVerifyLimit(rateLimitStore, input.phone)

			if (!rateResult.allowed) {
				return {
					success: false,
					error: 'rate_limited' as const,
					retryAfter: rateResult.retryAfter,
				}
			}

			const formattedPhone = formattedEgyptPhone(input.phone)
			const config = await getSupabaseConfig()

			if (!config) {
				return { success: false, error: 'verify_failed' as const }
			}

			const request = getRequest()
			const { client, responseCookies, responseHeaders } =
				createSupabaseServerClient({
					request,
					...config,
				})

			return verifyCustomerOtp({
				client,
				formattedPhone,
				code: input.code,
				source: 'website',
				appendAuthCookies: () =>
					appendPendingAuthCookies(
						responseCookies.values(),
						responseHeaders.entries(),
					),
				clearVerifyLimit: () =>
					clearRateLimit(rateLimitStore, `verify:${input.phone}`),
				resolveDbClient: createCustomerDataClient,
				onVerifyError: (error) =>
					logWebsiteServerError(
						'website.auth.verify_otp.supabase_error',
						error,
					),
				onActivityError: (error) =>
					logWebsiteServerError('website.auth.activity.supabase_error', error),
			})
		} catch (err) {
			logWebsiteServerError('website.auth.verify_otp.unexpected_error', err)
			return { success: false, error: 'verify_failed' as const }
		}
	})

// ============================================================================
// createAccount — Create new customer account after OTP verification
// ============================================================================

export const createAccount = createServerFn({ method: 'POST' })
	.inputValidator(createAccountInput)
	.handler(async ({ data: input }) => {
		try {
			const formattedPhone = formattedEgyptPhone(input.phone)
			const authContext = await getAuthenticatedClient()

			if (!authContext) {
				return { success: false, error: 'not_authenticated' as const }
			}

			if ('error' in authContext) {
				return { success: false, error: authContext.error }
			}

			const { client, dbClient, responseCookies, responseHeaders, user } =
				authContext

			return createAuthenticatedCustomerProfile({
				client,
				dbClient,
				user,
				formattedPhone,
				companyName: input.companyName,
				fullName: input.fullName,
				method: input.method,
				source: 'website',
				appendAuthCookies: () =>
					appendPendingAuthCookies(
						responseCookies.values(),
						responseHeaders.entries(),
					),
				onCreateError: (error) =>
					logWebsiteServerError(
						'website.auth.create_account.supabase_error',
						error,
					),
				onActivityError: (error) =>
					logWebsiteServerError('website.auth.activity.supabase_error', error),
			})
		} catch (err) {
			logWebsiteServerError('website.auth.create_account.unexpected_error', err)
			return { success: false, error: 'create_failed' as const }
		}
	})

// ============================================================================
// claimAccount — Link auth user to existing unclaimed customer
// ============================================================================

export const claimAccount = createServerFn({ method: 'POST' })
	.inputValidator(claimAccountInput)
	.handler(async ({ data: input }) => {
		try {
			const formattedPhone = formattedEgyptPhone(input.phone)
			const authContext = await getAuthenticatedClient()

			if (!authContext) {
				return { success: false, error: 'not_authenticated' as const }
			}

			if ('error' in authContext) {
				return { success: false, error: authContext.error }
			}

			const { client, dbClient, responseCookies, responseHeaders } = authContext

			return claimAuthenticatedCustomerProfile({
				client,
				dbClient,
				user: authContext.user,
				formattedPhone,
				appendAuthCookies: () =>
					appendPendingAuthCookies(
						responseCookies.values(),
						responseHeaders.entries(),
					),
				onClaimError: (error) =>
					logWebsiteServerError(
						'website.auth.claim_account.supabase_error',
						error,
					),
			})
		} catch (err) {
			logWebsiteServerError('website.auth.claim_account.unexpected_error', err)
			return { success: false, error: 'claim_failed' as const }
		}
	})
