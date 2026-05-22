import type { AuthSession } from '@hyperquote/auth'
import {
	claimAuthenticatedCustomerProfile,
	createAuthenticatedCustomerProfile,
	type EmailProfileDefaults,
	formattedEgyptPhone,
	isCustomerAuthUser,
	sendCustomerOtp,
	signInCustomerWithEmailPassword,
	verifyCustomerOtp,
} from '@hyperquote/auth/customer'
import {
	checkOTPVerifyLimit,
	checkRateLimit,
	clearRateLimit,
	getKVNamespace,
} from '@hyperquote/auth/rate-limit'
import {
	appendSetCookieHeaders,
	createSupabaseServerClient,
	resolveSupabaseWorkerConfig,
} from '@hyperquote/auth/server'
import { getServerSession } from '@hyperquote/auth/session'
import { createServerFn } from '@tanstack/react-start'
import { getRequest, getResponse } from '@tanstack/react-start/server'
import { z } from 'zod'
import { logPortalError } from './log'

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

const phoneChangeRequestInput = z.object({
	phone: phoneSchema,
})

const phoneChangeVerifyInput = z.object({
	phone: phoneSchema,
	code: z
		.string()
		.length(6)
		.regex(/^\d{6}$/),
})

const emailPasswordInput = z.object({
	email: z.string().trim().email().max(254),
	password: z.string().min(6).max(128),
})

type EmailAuthError = 'email_not_confirmed' | 'invalid_credentials'

// ============================================================================
// Helpers
// ============================================================================

function getSupabaseConfig() {
	return resolveSupabaseWorkerConfig(process.env)
}

function appendPendingAuthCookies(
	cookies: Iterable<string>,
	headers: Iterable<[string, string]> = [],
) {
	appendSetCookieHeaders(getResponse().headers, cookies, headers)
}

// ============================================================================
// checkPortalAuth — Used in _portal.tsx beforeLoad
// ============================================================================

export const checkPortalAuth = createServerFn().handler(
	async (): Promise<{
		auth: AuthSession | null
		isInternalUser: boolean
	}> => {
		const config = await getSupabaseConfig()
		const session = config ? await getServerSession(config) : null

		if (!session) {
			return { auth: null, isInternalUser: false }
		}

		// Check pool -- portal requires external pool
		if (session.pool !== 'external') {
			return { auth: null, isInternalUser: true }
		}

		return { auth: session, isInternalUser: false }
	},
)

// ============================================================================
// checkSession — Lightweight session check for login page redirect
// ============================================================================

export const checkSession = createServerFn().handler(async () => {
	const config = await getSupabaseConfig()
	const session = config ? await getServerSession(config) : null
	return { authenticated: session?.pool === 'external' }
})

// ============================================================================
// signOutPortalAccount — Clear the shared customer Supabase session.
// ============================================================================

export const signOutPortalAccount = createServerFn({ method: 'POST' }).handler(
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
			logPortalError('portal.auth.sign_out.supabase_error', error)
			return { success: false }
		}

		return { success: true }
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
			prefill?: EmailProfileDefaults
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
					source: 'portal',
					appendAuthCookies: () =>
						appendPendingAuthCookies(
							responseCookies.values(),
							responseHeaders.entries(),
						),
					onActivityError: (error) =>
						logPortalError('portal.auth.activity.supabase_error', error),
				})
			} catch (err) {
				logPortalError('portal.auth.email_signin.unexpected_error', err)
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
			})

			if (!result.success) {
				logPortalError('portal.auth.send_otp.supabase_error', result.error)
				return { success: false, error: 'send_failed' as const }
			}

			return { success: true, expiresIn: result.expiresIn ?? 300 }
		} catch (err) {
			logPortalError('portal.auth.send_otp.unexpected_error', err)
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
				source: 'portal',
				appendAuthCookies: () =>
					appendPendingAuthCookies(
						responseCookies.values(),
						responseHeaders.entries(),
					),
				clearVerifyLimit: () => clearRateLimit(kv, `verify:${input.phone}`),
				onVerifyError: (error) =>
					logPortalError('portal.auth.verify_otp.supabase_error', error),
				onActivityError: (error) =>
					logPortalError('portal.auth.activity.supabase_error', error),
			})
		} catch (err) {
			logPortalError('portal.auth.verify_otp.unexpected_error', err)
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
			const config = await getSupabaseConfig()

			if (!config) {
				return { success: false, error: 'not_authenticated' as const }
			}

			const request = getRequest()
			const { client, responseCookies, responseHeaders } =
				createSupabaseServerClient({
					request,
					...config,
				})

			// Get current auth user
			const {
				data: { user },
			} = await client.auth.getUser()
			if (!user) {
				return { success: false, error: 'not_authenticated' as const }
			}

			return createAuthenticatedCustomerProfile({
				client,
				user,
				formattedPhone,
				companyName: input.companyName,
				fullName: input.fullName,
				method: input.method,
				source: 'portal',
				appendAuthCookies: () =>
					appendPendingAuthCookies(
						responseCookies.values(),
						responseHeaders.entries(),
					),
				onCreateError: (error) =>
					logPortalError('portal.auth.create_account.supabase_error', error),
				onActivityError: (error) =>
					logPortalError('portal.auth.activity.supabase_error', error),
			})
		} catch (err) {
			logPortalError('portal.auth.create_account.unexpected_error', err)
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
			const config = await getSupabaseConfig()

			if (!config) {
				return { success: false, error: 'not_authenticated' as const }
			}

			const request = getRequest()
			const { client, responseCookies, responseHeaders } =
				createSupabaseServerClient({
					request,
					...config,
				})

			// Get current auth user
			const {
				data: { user },
			} = await client.auth.getUser()
			if (!user) {
				return { success: false, error: 'not_authenticated' as const }
			}

			return claimAuthenticatedCustomerProfile({
				client,
				user,
				formattedPhone,
				appendAuthCookies: () =>
					appendPendingAuthCookies(
						responseCookies.values(),
						responseHeaders.entries(),
					),
				onClaimError: (error) =>
					logPortalError('portal.auth.claim_account.supabase_error', error),
			})
		} catch (err) {
			logPortalError('portal.auth.claim_account.unexpected_error', err)
			return { success: false, error: 'claim_failed' as const }
		}
	})

// ============================================================================
// requestPhoneChange — Start authenticated phone change verification
// ============================================================================

export const requestPhoneChange = createServerFn({ method: 'POST' })
	.inputValidator(phoneChangeRequestInput)
	.handler(async ({ data: input }) => {
		try {
			const kv = await getKVNamespace()
			const rateResult = await checkRateLimit(kv, {
				key: `phoneChange:${input.phone}`,
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
			const { client, responseCookies, responseHeaders } =
				createSupabaseServerClient({
					request,
					...config,
				})

			const {
				data: { user },
				error: userError,
			} = await client.auth.getUser()
			if (userError || !user || !isCustomerAuthUser(user)) {
				return { success: false, error: 'not_authenticated' as const }
			}

			const { data: customer, error: customerError } = await client
				.from('customers')
				.select('id, phone')
				.eq('user_id', user.id)
				.single()

			if (customerError || !customer) {
				return { success: false, error: 'not_authenticated' as const }
			}

			if (customer.phone === formattedPhone) {
				return { success: false, error: 'same_phone' as const }
			}

			const { error } = await client.auth.updateUser({
				phone: formattedPhone,
			})

			appendPendingAuthCookies(
				responseCookies.values(),
				responseHeaders.entries(),
			)

			if (error) {
				logPortalError('portal.auth.phone_change_request.supabase_error', error)
				return { success: false, error: 'send_failed' as const }
			}

			return { success: true, expiresIn: 300 }
		} catch (err) {
			logPortalError('portal.auth.phone_change_request.unexpected_error', err)
			return { success: false, error: 'send_failed' as const }
		}
	})

// ============================================================================
// verifyPhoneChange — Confirm phone-change OTP before updating customer record
// ============================================================================

export const verifyPhoneChange = createServerFn({ method: 'POST' })
	.inputValidator(phoneChangeVerifyInput)
	.handler(async ({ data: input }) => {
		try {
			const kv = await getKVNamespace()
			const rateResult = await checkOTPVerifyLimit(kv, input.phone)

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

			const {
				data: { user: currentUser },
				error: currentUserError,
			} = await client.auth.getUser()
			if (
				currentUserError ||
				!currentUser ||
				!isCustomerAuthUser(currentUser)
			) {
				return { success: false, error: 'not_authenticated' as const }
			}

			const { data: customer, error: customerError } = await client
				.from('customers')
				.select('id')
				.eq('user_id', currentUser.id)
				.single()

			if (customerError || !customer) {
				return { success: false, error: 'not_authenticated' as const }
			}

			const { data, error } = await client.auth.verifyOtp({
				phone: formattedPhone,
				token: input.code,
				type: 'phone_change',
			})

			if (error) {
				logPortalError('portal.auth.phone_change_verify.supabase_error', error)
				return { success: false, error: 'invalid_code' as const }
			}

			if (
				!data.user ||
				data.user.id !== currentUser.id ||
				!isCustomerAuthUser(data.user)
			) {
				return { success: false, error: 'auth_mismatch' as const }
			}

			const { error: updateError } = await client
				.from('customers')
				.update({ phone: formattedPhone })
				.eq('id', customer.id)
				.eq('user_id', currentUser.id)

			if (updateError) {
				logPortalError(
					'portal.auth.phone_change_customer.supabase_error',
					updateError,
				)
				return {
					success: false,
					error:
						updateError.code === '23505'
							? ('phone_in_use' as const)
							: ('verify_failed' as const),
				}
			}

			appendPendingAuthCookies(
				responseCookies.values(),
				responseHeaders.entries(),
			)
			await clearRateLimit(kv, `verify:${input.phone}`)

			return { success: true, phone: formattedPhone }
		} catch (err) {
			logPortalError('portal.auth.phone_change_verify.unexpected_error', err)
			return { success: false, error: 'verify_failed' as const }
		}
	})
