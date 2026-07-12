import type { AuthSession } from '@hyperquote/auth'
import {
	formattedEgyptPhone,
	isCustomerAuthUser,
} from '@hyperquote/auth/customer'
import {
	claimCustomerAccountInput,
	createCustomerAccountInput,
	customerEmailPasswordInput,
	customerOtpCodeInput,
	customerPasswordResetCompleteInput,
	customerPasswordResetRequestInput,
	customerPhoneInput,
	sendCustomerOtpInput,
	verifyCustomerOtpInput,
} from '@hyperquote/auth/customer-schemas'
import {
	appendContextAuthCookies,
	createCustomerAuthServerHandlers,
	getAuthenticatedCustomerRequestContext,
	getCustomerSupabaseConfig,
} from '@hyperquote/auth/customer-server'
import {
	checkOTPVerifyLimit,
	checkRateLimit,
	clearRateLimit,
} from '@hyperquote/auth/rate-limit'
import { getServerSession } from '@hyperquote/auth/session'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { logPortalError } from './log'

const phoneChangeRequestInput = z.object({
	phone: customerPhoneInput,
})

const phoneChangeVerifyInput = z.object({
	code: customerOtpCodeInput,
	phone: customerPhoneInput,
})

function portalAuthHandlers() {
	return createCustomerAuthServerHandlers({
		source: 'portal',
		logError: logPortalError,
		missingCreateDbError: 'create_failed',
		missingClaimDbError: 'claim_failed',
	})
}

// ============================================================================
// checkPortalAuth — Used in _portal.tsx beforeLoad
// ============================================================================

export const checkPortalAuth = createServerFn().handler(
	async (): Promise<{
		auth: AuthSession | null
		isInternalUser: boolean
	}> => {
		const config = await getCustomerSupabaseConfig()
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
	const config = await getCustomerSupabaseConfig()
	const session = config ? await getServerSession(config) : null
	return { authenticated: session?.pool === 'external' }
})

export const signOutPortalAccount = createServerFn({ method: 'POST' }).handler(
	() => portalAuthHandlers().signOutAccount(),
)

export const signInWithEmailPassword = createServerFn({ method: 'POST' })
	.inputValidator(customerEmailPasswordInput)
	.handler(({ data }) => portalAuthHandlers().signInWithEmailPassword(data))

export const requestPasswordReset = createServerFn({ method: 'POST' })
	.inputValidator(customerPasswordResetRequestInput)
	.handler(({ data }) => portalAuthHandlers().requestPasswordReset(data))

export const completePasswordReset = createServerFn({ method: 'POST' })
	.inputValidator(customerPasswordResetCompleteInput)
	.handler(({ data }) => portalAuthHandlers().completePasswordReset(data))

export const sendOTP = createServerFn({ method: 'POST' })
	.inputValidator(sendCustomerOtpInput)
	.handler(({ data }) => portalAuthHandlers().sendOTP(data))

export const verifyOTP = createServerFn({ method: 'POST' })
	.inputValidator(verifyCustomerOtpInput)
	.handler(({ data }) => portalAuthHandlers().verifyOTP(data))

export const createAccount = createServerFn({ method: 'POST' })
	.inputValidator(createCustomerAccountInput)
	.handler(({ data }) => portalAuthHandlers().createAccount(data))

export const claimAccount = createServerFn({ method: 'POST' })
	.inputValidator(claimCustomerAccountInput)
	.handler(({ data }) => portalAuthHandlers().claimAccount(data))

// ============================================================================
// requestPhoneChange — Start authenticated phone change verification
// ============================================================================

export const requestPhoneChange = createServerFn({ method: 'POST' })
	.inputValidator(phoneChangeRequestInput)
	.handler(async ({ data: input }) => {
		try {
			const rateResult = await checkRateLimit({
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
			const context = await getAuthenticatedCustomerRequestContext({
				missingDbError: 'send_failed',
			})
			if (!context) {
				return { success: false, error: 'send_failed' as const }
			}
			if ('error' in context) {
				return { success: false, error: context.error }
			}
			if (!isCustomerAuthUser(context.user)) {
				return { success: false, error: 'not_authenticated' as const }
			}

			const { data: customer, error: customerError } = await context.dbClient
				.from('customers')
				.select('id, phone')
				.eq('user_id', context.user.id)
				.single()

			if (customerError || !customer) {
				return { success: false, error: 'not_authenticated' as const }
			}

			if (customer.phone === formattedPhone) {
				return { success: false, error: 'same_phone' as const }
			}

			const { error } = await context.client.auth.updateUser({
				phone: formattedPhone,
			})

			appendContextAuthCookies(context)

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
			const rateResult = await checkOTPVerifyLimit(input.phone)

			if (!rateResult.allowed) {
				return {
					success: false,
					error: 'rate_limited' as const,
					retryAfter: rateResult.retryAfter,
				}
			}

			const formattedPhone = formattedEgyptPhone(input.phone)
			const context = await getAuthenticatedCustomerRequestContext({
				missingDbError: 'verify_failed',
			})
			if (!context) {
				return { success: false, error: 'verify_failed' as const }
			}
			if ('error' in context) {
				return { success: false, error: context.error }
			}
			if (!isCustomerAuthUser(context.user)) {
				return { success: false, error: 'not_authenticated' as const }
			}

			const { data: customer, error: customerError } = await context.dbClient
				.from('customers')
				.select('id')
				.eq('user_id', context.user.id)
				.single()

			if (customerError || !customer) {
				return { success: false, error: 'not_authenticated' as const }
			}

			const { data, error } = await context.client.auth.verifyOtp({
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
				data.user.id !== context.user.id ||
				!isCustomerAuthUser(data.user)
			) {
				return { success: false, error: 'auth_mismatch' as const }
			}

			const { error: updateError } = await context.dbClient
				.from('customers')
				.update({ phone: formattedPhone })
				.eq('id', customer.id)
				.eq('user_id', context.user.id)

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

			appendContextAuthCookies(context)
			await clearRateLimit(`verify:${input.phone}`)

			return { success: true, phone: formattedPhone }
		} catch (err) {
			logPortalError('portal.auth.phone_change_verify.unexpected_error', err)
			return { success: false, error: 'verify_failed' as const }
		}
	})
