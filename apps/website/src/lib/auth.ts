import {
	appendSetCookieHeaders,
	createSupabaseServerClient,
	resolveSupabaseWorkerConfig,
} from '@hyperquote/auth/server'
import { createServerFn } from '@tanstack/react-start'
import { getRequest, getResponse } from '@tanstack/react-start/server'
import { z } from 'zod'
import {
	checkOTPVerifyLimit,
	checkRateLimit,
	clearRateLimit,
	getKVNamespace,
} from './rate-limit'
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

interface CustomerAuthProfile {
	id: string
	company_name: string
	user_id: string | null
}

type CustomerAuthAction = 'customer_signed_in' | 'customer_signed_up'

type EmailAuthError =
	| 'email_not_confirmed'
	| 'invalid_credentials'
	| 'signup_failed'

function getSupabaseConfig() {
	return resolveSupabaseWorkerConfig(process.env)
}

function appendPendingAuthCookies(
	cookies: Iterable<string>,
	headers: Iterable<[string, string]> = [],
) {
	appendSetCookieHeaders(getResponse().headers, cookies, headers)
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
	} = await client.auth.getUser()
	if (!user) {
		return { error: 'not_authenticated' as const }
	}

	return { client, responseCookies, responseHeaders, user }
}

async function recordCustomerAuthActivity(
	client: ReturnType<typeof createSupabaseServerClient>['client'],
	customerId: string,
	action: CustomerAuthAction,
	details: Record<string, unknown>,
) {
	const { error } = await client.rpc('log_activity', {
		action,
		details,
		entity_id: customerId,
		entity_type: 'customer',
	})
	if (error) {
		logWebsiteServerError('website.auth.activity.supabase_error', error)
		return false
	}
	return true
}

function normalizedEmail(value: string): string {
	return value.trim().toLowerCase()
}

function confirmationRedirectUrl(request: Request): string {
	const url = new URL(request.url)
	return `${url.origin}/login`
}

function isEmailNotConfirmedError(error: { message?: string }): boolean {
	return /confirm|verified/i.test(error.message ?? '')
}

function metadataString(
	metadata: Record<string, unknown>,
	key: string,
): string | undefined {
	const value = metadata[key]
	return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function isCustomerAuthUser(user: { app_metadata?: unknown }): boolean {
	const metadata = user.app_metadata
	const pool =
		metadata && typeof metadata === 'object' && 'pool' in metadata
			? metadata.pool
			: undefined
	return pool !== 'internal' && pool !== 'driver'
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
			} = await client.auth.getUser()
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

			const { data: customer } = await client
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

				const formattedPhone = `+20${input.phone}`
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

				const { data, error } = await client.auth.signInWithPassword({
					email: normalizedEmail(input.email),
					password: input.password,
				})

				if (error || !data.user) {
					return {
						success: false,
						error:
							error && isEmailNotConfirmedError(error)
								? 'email_not_confirmed'
								: 'invalid_credentials',
					}
				}

				if (!data.user.email_confirmed_at) {
					await client.auth.signOut()
					appendPendingAuthCookies(
						responseCookies.values(),
						responseHeaders.entries(),
					)
					return { success: false, error: 'email_not_confirmed' }
				}

				if (!isCustomerAuthUser(data.user)) {
					await client.auth.signOut()
					appendPendingAuthCookies(
						responseCookies.values(),
						responseHeaders.entries(),
					)
					return { success: false, error: 'invalid_credentials' }
				}

				appendPendingAuthCookies(
					responseCookies.values(),
					responseHeaders.entries(),
				)

				const { data: customer } = await client
					.from('customers')
					.select('id')
					.eq('user_id', data.user.id)
					.maybeSingle()

				if (customer) {
					await recordCustomerAuthActivity(
						client,
						customer.id,
						'customer_signed_in',
						{
							email: normalizedEmail(input.email),
							method: 'email_password',
							source: 'website',
						},
					)
					return { success: true, needsAccount: false }
				}

				const metadata = data.user.user_metadata ?? {}
				return {
					success: true,
					needsAccount: true,
					prefill: {
						companyName: metadataString(metadata, 'company_name'),
						fullName: metadataString(metadata, 'contact_name'),
						phone: metadataString(metadata, 'phone')?.replace(/^\+20/, ''),
					},
				}
			} catch (err) {
				logWebsiteServerError('website.auth.email_signin.unexpected_error', err)
				return { success: false, error: 'invalid_credentials' }
			}
		},
	)

// ============================================================================
// sendOTP — Request OTP via WhatsApp or SMS
// ============================================================================

export const sendOTP = createServerFn()
	.inputValidator(sendOTPInput)
	.handler(async ({ data: input }) => {
		try {
			const kv = await getKVNamespace()

			// Rate limit: 3 attempts per phone per 60 seconds
			const rateResult = await checkRateLimit(kv, {
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

			const formattedPhone = `+20${input.phone}`
			const config = await getSupabaseConfig()

			if (!config) {
				return { success: false, error: 'send_failed' as const }
			}

			const request = getRequest()
			const { client } = createSupabaseServerClient({
				request,
				...config,
			})

			const { error } = await client.auth.signInWithOtp({
				phone: formattedPhone,
				options: { channel: input.method },
			})

			if (error) {
				if (
					isLocalSupabaseUrl(config.supabaseUrl) &&
					isProviderSendFailure(error)
				) {
					return { success: true, expiresIn: 300 }
				}
				logWebsiteServerError('website.auth.send_otp.supabase_error', error)
				return { success: false, error: 'send_failed' as const }
			}

			return { success: true, expiresIn: 300 }
		} catch (err) {
			logWebsiteServerError('website.auth.send_otp.unexpected_error', err)
			return { success: false, error: 'send_failed' as const }
		}
	})

function isLocalSupabaseUrl(value: string): boolean {
	try {
		const hostname = new URL(value).hostname
		return hostname === '127.0.0.1' || hostname === 'localhost'
	} catch {
		return value.includes('127.0.0.1') || value.includes('localhost')
	}
}

function isProviderSendFailure(error: {
	message?: string
	code?: string
}): boolean {
	return (
		error.code === 'over_sms_send_rate_limit' ||
		error.code === 'sms_send_failed' ||
		/otp to provider|sms_send_failed|over_sms_send_rate_limit|error sending/i.test(
			error.message ?? '',
		)
	)
}

// ============================================================================
// verifyOTP — Verify OTP code and check for existing account
// ============================================================================

export const verifyOTP = createServerFn()
	.inputValidator(verifyOTPInput)
	.handler(async ({ data: input }) => {
		try {
			const kv = await getKVNamespace()

			// Rate limit: 5 attempts per phone per 60s, then 15-minute lockout
			const rateResult = await checkOTPVerifyLimit(kv, input.phone)

			if (!rateResult.allowed) {
				return {
					success: false,
					error: 'rate_limited' as const,
					retryAfter: rateResult.retryAfter,
				}
			}

			const formattedPhone = `+20${input.phone}`
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

			const { data, error } = await client.auth.verifyOtp({
				phone: formattedPhone,
				token: input.code,
				type: 'sms',
			})

			if (error) {
				logWebsiteServerError('website.auth.verify_otp.supabase_error', error)
				return { success: false, error: 'invalid_code' as const }
			}

			if (!data.user || !isCustomerAuthUser(data.user)) {
				await client.auth.signOut()
				appendPendingAuthCookies(
					responseCookies.values(),
					responseHeaders.entries(),
				)
				return { success: false, error: 'invalid_code' as const }
			}

			appendPendingAuthCookies(
				responseCookies.values(),
				responseHeaders.entries(),
			)

			// Clear rate limit counter on success
			await clearRateLimit(kv, `verify:${input.phone}`)

			// Check if this signed-in user already owns a customer profile.
			const { data: ownedCustomerResult } = await client
				.from('customers')
				.select('id, company_name, user_id')
				.eq('user_id', data.user?.id ?? '')
				.maybeSingle()
			const ownedCustomer = ownedCustomerResult as CustomerAuthProfile | null

			const { data: claimableCustomerResult } = ownedCustomer
				? { data: null }
				: await client
						.rpc('find_claimable_customer_profile', {
							p_phone: formattedPhone,
						})
						.maybeSingle()
			const claimableCustomer =
				claimableCustomerResult as CustomerAuthProfile | null
			const customer = ownedCustomer ?? claimableCustomer
			const needsAccount = !customer
			const claimableCompany =
				customer && !customer.user_id ? customer.company_name : null
			if (ownedCustomer) {
				await recordCustomerAuthActivity(
					client,
					ownedCustomer.id,
					'customer_signed_in',
					{ method: 'phone_otp', phone: formattedPhone, source: 'website' },
				)
			}

			return {
				success: true,
				session: data.session,
				user: data.user,
				needsAccount,
				claimableCompany,
			}
		} catch (err) {
			logWebsiteServerError('website.auth.verify_otp.unexpected_error', err)
			return { success: false, error: 'verify_failed' as const }
		}
	})

// ============================================================================
// createAccount — Create new customer account after OTP verification
// ============================================================================

export const createAccount = createServerFn()
	.inputValidator(createAccountInput)
	.handler(async ({ data: input }) => {
		try {
			const formattedPhone = `+20${input.phone}`
			const authContext = await getAuthenticatedClient()

			if (!authContext) {
				return { success: false, error: 'not_authenticated' as const }
			}

			if ('error' in authContext) {
				return { success: false, error: authContext.error }
			}

			const { client, responseCookies, responseHeaders, user } = authContext
			if (!isCustomerAuthUser(user)) {
				await client.auth.signOut()
				appendPendingAuthCookies(
					responseCookies.values(),
					responseHeaders.entries(),
				)
				return { success: false, error: 'not_authenticated' as const }
			}

			// Insert customer record
			const { data: customer, error } = await client
				.from('customers')
				.insert({
					phone: formattedPhone,
					email: user.email ?? null,
					company_name: input.companyName,
					contact_name: input.fullName,
					user_id: user.id,
				})
				.select('id')
				.single()

			if (error) {
				logWebsiteServerError(
					'website.auth.create_account.supabase_error',
					error,
				)
				return { success: false, error: 'create_failed' as const }
			}
			const activityRecorded = await recordCustomerAuthActivity(
				client,
				customer.id,
				'customer_signed_up',
				{
					method: input.method ?? 'phone_otp',
					phone: formattedPhone,
					source: 'website',
				},
			)
			if (!activityRecorded) {
				return { success: false, error: 'create_failed' as const }
			}
			appendPendingAuthCookies(
				responseCookies.values(),
				responseHeaders.entries(),
			)

			return {
				success: true,
				customerId: customer.id,
				userId: user.id,
			}
		} catch (err) {
			logWebsiteServerError('website.auth.create_account.unexpected_error', err)
			return { success: false, error: 'create_failed' as const }
		}
	})

// ============================================================================
// claimAccount — Link auth user to existing unclaimed customer
// ============================================================================

export const claimAccount = createServerFn()
	.inputValidator(claimAccountInput)
	.handler(async ({ data: input }) => {
		try {
			const formattedPhone = `+20${input.phone}`
			const authContext = await getAuthenticatedClient()

			if (!authContext) {
				return { success: false, error: 'not_authenticated' as const }
			}

			if ('error' in authContext) {
				return { success: false, error: authContext.error }
			}

			const { client, responseCookies, responseHeaders } = authContext
			if (!isCustomerAuthUser(authContext.user)) {
				await client.auth.signOut()
				appendPendingAuthCookies(
					responseCookies.values(),
					responseHeaders.entries(),
				)
				return { success: false, error: 'not_authenticated' as const }
			}

			// Find and claim the unclaimed customer through the validated RPC.
			const { data: customerResult, error } = await client
				.rpc('claim_customer_profile', { p_phone: formattedPhone })
				.single()
			const customer = customerResult as { id: string } | null

			if (error || !customer) {
				logWebsiteServerError(
					'website.auth.claim_account.supabase_error',
					error,
				)
				return { success: false, error: 'claim_failed' as const }
			}
			appendPendingAuthCookies(
				responseCookies.values(),
				responseHeaders.entries(),
			)

			return {
				success: true,
				customerId: customer.id,
				claimed: true,
			}
		} catch (err) {
			logWebsiteServerError('website.auth.claim_account.unexpected_error', err)
			return { success: false, error: 'claim_failed' as const }
		}
	})
