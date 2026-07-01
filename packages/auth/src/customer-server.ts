import { getRequest, getResponse } from '@tanstack/react-start/server'
import type { z } from 'zod'
import {
	claimAuthenticatedCustomerProfile,
	completeCustomerPasswordReset,
	createAuthenticatedCustomerProfile,
	formattedEgyptPhone,
	sendCustomerOtp,
	signInCustomerWithEmailPassword,
	verifyCustomerOtp,
} from './customer'
import type {
	claimCustomerAccountInput,
	createCustomerAccountInput,
	customerEmailPasswordInput,
	customerPasswordResetCompleteInput,
	customerPasswordResetRequestInput,
	sendCustomerOtpInput,
	verifyCustomerOtpInput,
} from './customer-schemas'
import {
	checkOTPVerifyLimit,
	checkRateLimit,
	clearRateLimit,
	getRateLimitStore,
} from './rate-limit'
import {
	appendSetCookieHeaders,
	createExternalActorServiceRoleClient,
	createSupabaseServerClient,
	getSupabaseServerUser,
	resolveSupabaseRuntimeConfig,
} from './server'

type CustomerAuthSource = 'portal' | 'website'
const CUSTOMER_AUTH_LOG_EVENTS = {
	portal: {
		activitySupabase: 'portal.auth.activity.supabase_error',
		claimAccountSupabase: 'portal.auth.claim_account.supabase_error',
		claimAccountUnexpected: 'portal.auth.claim_account.unexpected_error',
		createAccountSupabase: 'portal.auth.create_account.supabase_error',
		createAccountUnexpected: 'portal.auth.create_account.unexpected_error',
		emailSigninUnexpected: 'portal.auth.email_signin.unexpected_error',
		passwordResetCompleteUnexpected:
			'portal.auth.password_reset_complete.unexpected_error',
		passwordResetRequestSupabase:
			'portal.auth.password_reset_request.supabase_error',
		passwordResetRequestUnexpected:
			'portal.auth.password_reset_request.unexpected_error',
		passwordResetUpdateSupabase:
			'portal.auth.password_reset_update.supabase_error',
		passwordResetVerifySupabase:
			'portal.auth.password_reset_verify.supabase_error',
		sendOtpSupabase: 'portal.auth.send_otp.supabase_error',
		sendOtpUnexpected: 'portal.auth.send_otp.unexpected_error',
		signOutSupabase: 'portal.auth.sign_out.supabase_error',
		verifyOtpSupabase: 'portal.auth.verify_otp.supabase_error',
		verifyOtpUnexpected: 'portal.auth.verify_otp.unexpected_error',
	},
	website: {
		activitySupabase: 'website.auth.activity.supabase_error',
		claimAccountSupabase: 'website.auth.claim_account.supabase_error',
		claimAccountUnexpected: 'website.auth.claim_account.unexpected_error',
		createAccountSupabase: 'website.auth.create_account.supabase_error',
		createAccountUnexpected: 'website.auth.create_account.unexpected_error',
		emailSigninUnexpected: 'website.auth.email_signin.unexpected_error',
		passwordResetCompleteUnexpected:
			'website.auth.password_reset_complete.unexpected_error',
		passwordResetRequestSupabase:
			'website.auth.password_reset_request.supabase_error',
		passwordResetRequestUnexpected:
			'website.auth.password_reset_request.unexpected_error',
		passwordResetUpdateSupabase:
			'website.auth.password_reset_update.supabase_error',
		passwordResetVerifySupabase:
			'website.auth.password_reset_verify.supabase_error',
		sendOtpSupabase: 'website.auth.send_otp.supabase_error',
		sendOtpUnexpected: 'website.auth.send_otp.unexpected_error',
		signOutSupabase: 'website.auth.sign_out.supabase_error',
		verifyOtpSupabase: 'website.auth.verify_otp.supabase_error',
		verifyOtpUnexpected: 'website.auth.verify_otp.unexpected_error',
	},
} as const
type CustomerAuthLogger = (event: string, error: unknown) => void
type MissingAuthenticatedDbError = 'not_configured'
type ActionMissingAuthenticatedDbError =
	| 'claim_failed'
	| 'create_failed'
	| MissingAuthenticatedDbError
	| 'send_failed'
	| 'verify_failed'

type CustomerAuthRequestContext = Awaited<
	ReturnType<typeof getCustomerAuthRequestContext>
>

type CustomerEmailPasswordInput = z.infer<typeof customerEmailPasswordInput>
type CustomerPasswordResetRequestInput = z.infer<
	typeof customerPasswordResetRequestInput
>
type CustomerPasswordResetCompleteInput = z.infer<
	typeof customerPasswordResetCompleteInput
>
type SendCustomerOtpInput = z.infer<typeof sendCustomerOtpInput>
type VerifyCustomerOtpInput = z.infer<typeof verifyCustomerOtpInput>
type CreateCustomerAccountInput = z.infer<typeof createCustomerAccountInput>
type ClaimCustomerAccountInput = z.infer<typeof claimCustomerAccountInput>

export interface CustomerOtpVerificationResult {
	success: boolean
	error?: 'invalid_code' | 'rate_limited' | 'verify_failed'
	retryAfter?: number
	needsAccount?: boolean
	claimableCompany?: string | null
}

interface CustomerAuthServerHandlersOptions {
	source: CustomerAuthSource
	logError: CustomerAuthLogger
	missingCreateDbError?: ActionMissingAuthenticatedDbError
	missingClaimDbError?: ActionMissingAuthenticatedDbError
}

interface AuthenticatedCustomerContextOptions<
	TError extends
		ActionMissingAuthenticatedDbError = MissingAuthenticatedDbError,
> {
	missingDbError?: TError
}

export function getCustomerSupabaseConfig() {
	return resolveSupabaseRuntimeConfig(process.env)
}

export function appendCurrentResponseAuthCookies(
	cookies: Iterable<string>,
	headers: Iterable<[string, string]> = [],
) {
	appendSetCookieHeaders(getResponse().headers, cookies, headers)
}

export function customerLoginRedirectUrl(request: Request) {
	return new URL('/login', new URL(request.url).origin).toString()
}

export async function createCustomerDataClient(userId: string) {
	return createExternalActorServiceRoleClient(process.env, userId)
}

export async function getCustomerAuthRequestContext() {
	const config = await getCustomerSupabaseConfig()
	if (!config) return null

	const request = getRequest()
	const { client, responseCookies, responseHeaders } =
		createSupabaseServerClient({
			request,
			...config,
		})

	return { client, config, request, responseCookies, responseHeaders }
}

export async function getCustomerServerUser(
	context: Exclude<CustomerAuthRequestContext, null>,
) {
	return getSupabaseServerUser({
		client: context.client,
		cookieDomain: context.config.cookieDomain,
		cookieName: context.config.cookieName,
		request: context.request,
		responseHeaders: getResponse().headers,
	})
}

export async function getAuthenticatedCustomerRequestContext<
	TError extends
		ActionMissingAuthenticatedDbError = MissingAuthenticatedDbError,
>(options: AuthenticatedCustomerContextOptions<TError> = {}) {
	const missingDbError = options.missingDbError ?? 'not_configured'
	const context = await getCustomerAuthRequestContext()
	if (!context) return null

	const {
		data: { user },
	} = await getCustomerServerUser(context)
	if (!user) return { error: 'not_authenticated' as const }

	const dbClient = await createCustomerDataClient(user.id)
	if (!dbClient) return { error: missingDbError }

	return { ...context, dbClient, user }
}

export function appendContextAuthCookies(
	context: Pick<
		Exclude<CustomerAuthRequestContext, null>,
		'responseCookies' | 'responseHeaders'
	>,
) {
	appendCurrentResponseAuthCookies(
		context.responseCookies.values(),
		context.responseHeaders.entries(),
	)
}

export function createCustomerAuthServerHandlers({
	source,
	logError,
	missingCreateDbError = 'not_configured',
	missingClaimDbError = 'not_configured',
}: CustomerAuthServerHandlersOptions) {
	const events = CUSTOMER_AUTH_LOG_EVENTS[source]

	const signOutAccount = async (): Promise<{ success: boolean }> => {
		const context = await getCustomerAuthRequestContext()
		if (!context) return { success: true }

		const { error } = await context.client.auth.signOut()
		appendContextAuthCookies(context)
		if (error) {
			logError(events.signOutSupabase, error)
			return { success: false }
		}

		return { success: true }
	}

	const signInWithEmailPassword = async (input: CustomerEmailPasswordInput) => {
		try {
			const context = await getCustomerAuthRequestContext()
			if (!context) return { success: false, error: 'invalid_credentials' }

			return signInCustomerWithEmailPassword({
				client: context.client,
				email: input.email,
				password: input.password,
				source,
				appendAuthCookies: () => appendContextAuthCookies(context),
				resolveDbClient: createCustomerDataClient,
				onActivityError: (error) => logError(events.activitySupabase, error),
			})
		} catch (error) {
			logError(events.emailSigninUnexpected, error)
			return { success: false, error: 'invalid_credentials' as const }
		}
	}

	const requestPasswordReset = async (
		input: CustomerPasswordResetRequestInput,
	): Promise<{ success: boolean }> => {
		try {
			const context = await getCustomerAuthRequestContext()
			if (!context) return { success: false }

			const { error } = await context.client.auth.resetPasswordForEmail(
				input.email,
				{
					redirectTo: customerLoginRedirectUrl(context.request),
				},
			)
			if (error) {
				logError(events.passwordResetRequestSupabase, error)
			}

			return { success: true }
		} catch (error) {
			logError(events.passwordResetRequestUnexpected, error)
			return { success: false }
		}
	}

	const completePasswordReset = async (
		input: CustomerPasswordResetCompleteInput,
	) => {
		try {
			const context = await getCustomerAuthRequestContext()
			if (!context) return { success: false, error: 'update_failed' as const }

			return completeCustomerPasswordReset({
				client: context.client,
				tokenHash: input.tokenHash,
				password: input.password,
				appendAuthCookies: () => appendContextAuthCookies(context),
				onVerifyError: (error) =>
					logError(events.passwordResetVerifySupabase, error),
				onUpdateError: (error) =>
					logError(events.passwordResetUpdateSupabase, error),
			})
		} catch (error) {
			logError(events.passwordResetCompleteUnexpected, error)
			return { success: false, error: 'update_failed' as const }
		}
	}

	const sendOTP = async (input: SendCustomerOtpInput) => {
		try {
			const rateLimitStore = await getRateLimitStore()
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

			const context = await getCustomerAuthRequestContext()
			if (!context) return { success: false, error: 'send_failed' as const }

			const result = await sendCustomerOtp({
				client: context.client,
				formattedPhone: formattedEgyptPhone(input.phone),
				method: input.method,
			})

			if (!result.success) {
				logError(events.sendOtpSupabase, result.error)
				return { success: false, error: 'send_failed' as const }
			}

			return { success: true, expiresIn: result.expiresIn ?? 300 }
		} catch (error) {
			logError(events.sendOtpUnexpected, error)
			return { success: false, error: 'send_failed' as const }
		}
	}

	const verifyOTP = async (
		input: VerifyCustomerOtpInput,
	): Promise<CustomerOtpVerificationResult> => {
		try {
			const rateLimitStore = await getRateLimitStore()
			const rateResult = await checkOTPVerifyLimit(rateLimitStore, input.phone)

			if (!rateResult.allowed) {
				return {
					success: false,
					error: 'rate_limited' as const,
					retryAfter: rateResult.retryAfter,
				}
			}

			const context = await getCustomerAuthRequestContext()
			if (!context) return { success: false, error: 'verify_failed' as const }

			return verifyCustomerOtp({
				client: context.client,
				formattedPhone: formattedEgyptPhone(input.phone),
				code: input.code,
				source,
				appendAuthCookies: () => appendContextAuthCookies(context),
				clearVerifyLimit: () =>
					clearRateLimit(rateLimitStore, `verify:${input.phone}`),
				resolveDbClient: createCustomerDataClient,
				onVerifyError: (error) => logError(events.verifyOtpSupabase, error),
				onActivityError: (error) => logError(events.activitySupabase, error),
			})
		} catch (error) {
			logError(events.verifyOtpUnexpected, error)
			return { success: false, error: 'verify_failed' as const }
		}
	}

	const createAccount = async (input: CreateCustomerAccountInput) => {
		try {
			const context = await getAuthenticatedCustomerRequestContext({
				missingDbError: missingCreateDbError,
			})
			if (!context)
				return { success: false, error: 'not_authenticated' as const }
			if ('error' in context) return { success: false, error: context.error }

			return createAuthenticatedCustomerProfile({
				client: context.client,
				dbClient: context.dbClient,
				user: context.user,
				formattedPhone: formattedEgyptPhone(input.phone),
				companyName: input.companyName,
				fullName: input.fullName,
				method: input.method,
				source,
				emailCredentials:
					input.email || input.password
						? { email: input.email, password: input.password }
						: undefined,
				appendAuthCookies: () => appendContextAuthCookies(context),
				onCreateError: (error) => logError(events.createAccountSupabase, error),
				onActivityError: (error) => logError(events.activitySupabase, error),
			})
		} catch (error) {
			logError(events.createAccountUnexpected, error)
			return { success: false, error: 'create_failed' as const }
		}
	}

	const claimAccount = async (input: ClaimCustomerAccountInput) => {
		try {
			const context = await getAuthenticatedCustomerRequestContext({
				missingDbError: missingClaimDbError,
			})
			if (!context)
				return { success: false, error: 'not_authenticated' as const }
			if ('error' in context) return { success: false, error: context.error }

			return claimAuthenticatedCustomerProfile({
				client: context.client,
				dbClient: context.dbClient,
				user: context.user,
				formattedPhone: formattedEgyptPhone(input.phone),
				appendAuthCookies: () => appendContextAuthCookies(context),
				onClaimError: (error) => logError(events.claimAccountSupabase, error),
			})
		} catch (error) {
			logError(events.claimAccountUnexpected, error)
			return { success: false, error: 'claim_failed' as const }
		}
	}

	return {
		claimAccount,
		completePasswordReset,
		createAccount,
		requestPasswordReset,
		sendOTP,
		signInWithEmailPassword,
		signOutAccount,
		verifyOTP,
	}
}
