import type { createSupabaseServerClient } from './server'

type CustomerAuthClient = ReturnType<
	typeof createSupabaseServerClient
>['client']
type CustomerDataClient = Pick<CustomerAuthClient, 'from' | 'rpc'>

export type CustomerAuthAction = 'customer_signed_in' | 'customer_signed_up'

interface CustomerAuthProfile {
	id: string
	company_name: string
	user_id: string | null
}

export interface EmailProfileDefaults {
	companyName?: string
	fullName?: string
	phone?: string
}

export interface OptionalEmailPasswordCredentials {
	email?: string
	password?: string
}

type AppendAuthCookies = () => void
type CustomerAuthLogger = (error: unknown) => void
type ResolveCustomerDataClient = (
	userId: string,
) => Promise<CustomerDataClient | null>

export function formattedEgyptPhone(phone: string): string {
	return `+20${phone}`
}

export function normalizedEmail(value: string): string {
	return value.trim().toLowerCase()
}

export function isEmailNotConfirmedError(error: { message?: string }): boolean {
	return /confirm|verified/i.test(error.message ?? '')
}

function metadataString(
	metadata: Record<string, unknown>,
	key: string,
): string | undefined {
	const value = metadata[key]
	return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

export function customerPrefillFromMetadata(
	metadata: Record<string, unknown>,
): EmailProfileDefaults {
	return {
		companyName: metadataString(metadata, 'company_name'),
		fullName: metadataString(metadata, 'contact_name'),
		phone: metadataString(metadata, 'phone')?.replace(/^\+20/, ''),
	}
}

export function isCustomerAuthUser(user: { app_metadata?: unknown }): boolean {
	const metadata = user.app_metadata
	const pool =
		metadata && typeof metadata === 'object' && 'pool' in metadata
			? metadata.pool
			: undefined
	return pool !== 'internal' && pool !== 'driver'
}

export async function recordCustomerAuthActivity({
	client,
	customerId,
	action,
	details,
	onError,
}: {
	client: CustomerDataClient
	customerId: string
	action: CustomerAuthAction
	details: Record<string, unknown>
	onError: (error: unknown) => void
}): Promise<boolean> {
	const { error } = await client.rpc('log_activity', {
		action,
		details,
		entity_id: customerId,
		entity_type: 'customer',
	})
	if (error) {
		onError(error)
		return false
	}
	return true
}

export async function signInCustomerWithEmailPassword({
	client,
	dbClient,
	email,
	password,
	source,
	appendAuthCookies,
	onActivityError,
	resolveDbClient,
}: {
	client: CustomerAuthClient
	dbClient?: CustomerDataClient
	email: string
	password: string
	source: 'portal' | 'website'
	appendAuthCookies: AppendAuthCookies
	onActivityError: CustomerAuthLogger
	resolveDbClient?: ResolveCustomerDataClient
}): Promise<{
	success: boolean
	error?:
		| 'email_not_confirmed'
		| 'invalid_credentials'
		| 'phone_verification_required'
	needsAccount?: boolean
	prefill?: EmailProfileDefaults
}> {
	const normalized = normalizedEmail(email)
	const { data, error } = await client.auth.signInWithPassword({
		email: normalized,
		password,
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
		appendAuthCookies()
		return { success: false, error: 'email_not_confirmed' }
	}

	if (!isCustomerAuthUser(data.user)) {
		await client.auth.signOut()
		appendAuthCookies()
		return { success: false, error: 'invalid_credentials' }
	}

	appendAuthCookies()
	const dataClient =
		dbClient ?? (await resolveDbClient?.(data.user.id)) ?? client

	const customer = await findCustomerByUserId(dataClient, data.user.id)
	if (!customer) {
		const metadata = data.user.user_metadata ?? {}
		await client.auth.signOut()
		appendAuthCookies()
		return {
			success: false,
			error: 'phone_verification_required',
			needsAccount: true,
			prefill: customerPrefillFromMetadata(metadata),
		}
	}

	await recordCustomerAuthActivity({
		client: dataClient,
		customerId: customer.id,
		action: 'customer_signed_in',
		details: {
			email: normalized,
			method: 'email_password',
			source,
		},
		onError: onActivityError,
	})
	return { success: true, needsAccount: false }
}

export async function sendCustomerOtp({
	client,
	formattedPhone,
	method,
	allowProviderFallback = false,
	supabaseUrl,
}: {
	client: CustomerAuthClient
	formattedPhone: string
	method: 'whatsapp' | 'sms'
	allowProviderFallback?: boolean
	supabaseUrl?: string
}): Promise<{ success: boolean; expiresIn?: number; error?: unknown }> {
	const { error } = await client.auth.signInWithOtp({
		phone: formattedPhone,
		options: { channel: method },
	})

	if (error) {
		if (
			allowProviderFallback &&
			supabaseUrl &&
			isLocalSupabaseUrl(supabaseUrl) &&
			isProviderSendFailure(error)
		) {
			return { success: true, expiresIn: 300 }
		}
		return { success: false, error }
	}

	return { success: true, expiresIn: 300 }
}

export async function verifyCustomerOtp({
	client,
	dbClient,
	formattedPhone,
	code,
	source,
	appendAuthCookies,
	clearVerifyLimit,
	onVerifyError,
	onActivityError,
	resolveDbClient,
}: {
	client: CustomerAuthClient
	dbClient?: CustomerDataClient
	formattedPhone: string
	code: string
	source: 'portal' | 'website'
	appendAuthCookies: AppendAuthCookies
	clearVerifyLimit: () => Promise<void>
	onVerifyError: CustomerAuthLogger
	onActivityError: CustomerAuthLogger
	resolveDbClient?: ResolveCustomerDataClient
}): Promise<{
	success: boolean
	error?: 'invalid_code'
	needsAccount?: boolean
	claimableCompany?: string | null
}> {
	const { data, error } = await client.auth.verifyOtp({
		phone: formattedPhone,
		token: code,
		type: 'sms',
	})

	if (error) {
		onVerifyError(error)
		return { success: false, error: 'invalid_code' }
	}

	if (!data.user || !isCustomerAuthUser(data.user)) {
		await client.auth.signOut()
		appendAuthCookies()
		return { success: false, error: 'invalid_code' }
	}

	appendAuthCookies()
	await clearVerifyLimit()
	const dataClient =
		dbClient ?? (await resolveDbClient?.(data.user.id)) ?? client

	const { ownedCustomer, needsAccount, claimableCompany } =
		await findCustomerAuthProfileAfterOtp({
			client: dataClient,
			userId: data.user.id,
			formattedPhone,
		})

	if (ownedCustomer) {
		await recordCustomerAuthActivity({
			client: dataClient,
			customerId: ownedCustomer.id,
			action: 'customer_signed_in',
			details: { method: 'phone_otp', phone: formattedPhone, source },
			onError: onActivityError,
		})
	}

	return {
		success: true,
		needsAccount,
		claimableCompany,
	}
}

export async function createAuthenticatedCustomerProfile({
	client,
	dbClient,
	user,
	formattedPhone,
	companyName,
	fullName,
	method,
	source,
	emailCredentials,
	appendAuthCookies,
	onCreateError,
	onActivityError,
}: {
	client: CustomerAuthClient
	dbClient?: CustomerDataClient
	user: {
		id: string
		email?: string | null
		phone?: string | null
		app_metadata?: unknown
	}
	formattedPhone: string
	companyName: string
	fullName: string
	method?: 'phone_otp' | 'email_password'
	source: 'portal' | 'website'
	emailCredentials?: OptionalEmailPasswordCredentials
	appendAuthCookies: AppendAuthCookies
	onCreateError: CustomerAuthLogger
	onActivityError: CustomerAuthLogger
}): Promise<{
	success: boolean
	error?:
		| 'create_failed'
		| 'email_setup_failed'
		| 'not_authenticated'
		| 'phone_mismatch'
	customerId?: string
	userId?: string
}> {
	if (!isCustomerAuthUser(user)) {
		await client.auth.signOut()
		appendAuthCookies()
		return { success: false, error: 'not_authenticated' }
	}
	if (!doesUserPhoneMatch(user.phone, formattedPhone)) {
		await client.auth.signOut()
		appendAuthCookies()
		return { success: false, error: 'phone_mismatch' }
	}
	const dataClient = dbClient ?? client
	const requestedEmail = emailCredentials?.email
		? normalizedEmail(emailCredentials.email)
		: ''
	const requestedPassword = emailCredentials?.password ?? ''
	if (requestedEmail || requestedPassword) {
		if (!requestedEmail || !requestedPassword) {
			return { success: false, error: 'email_setup_failed' }
		}
		const { error: updateError } = await client.auth.updateUser({
			email: requestedEmail,
			password: requestedPassword,
			data: {
				company_name: companyName.trim(),
				contact_name: fullName.trim(),
				phone: formattedPhone,
			},
		})
		if (updateError) {
			onCreateError(updateError)
			return { success: false, error: 'email_setup_failed' }
		}
	}

	const { customerId, error } = await createCustomerProfile({
		client: dataClient,
		phone: formattedPhone,
		email: requestedEmail || user.email || null,
		companyName,
		fullName,
		userId: user.id,
	})

	if (error || !customerId) {
		onCreateError(error)
		return { success: false, error: 'create_failed' }
	}

	const activityRecorded = await recordCustomerAuthActivity({
		client: dataClient,
		customerId,
		action: 'customer_signed_up',
		details: {
			method: method ?? 'phone_otp',
			phone: formattedPhone,
			source,
		},
		onError: onActivityError,
	})
	if (!activityRecorded) {
		return { success: false, error: 'create_failed' }
	}

	appendAuthCookies()

	return {
		success: true,
		customerId,
		userId: user.id,
	}
}

export async function claimAuthenticatedCustomerProfile({
	client,
	dbClient,
	user,
	formattedPhone,
	appendAuthCookies,
	onClaimError,
}: {
	client: CustomerAuthClient
	dbClient?: CustomerDataClient
	user: { app_metadata?: unknown }
	formattedPhone: string
	appendAuthCookies: AppendAuthCookies
	onClaimError: CustomerAuthLogger
}): Promise<{
	success: boolean
	error?: 'claim_failed' | 'not_authenticated'
	customerId?: string
	claimed?: boolean
}> {
	if (!isCustomerAuthUser(user)) {
		await client.auth.signOut()
		appendAuthCookies()
		return { success: false, error: 'not_authenticated' }
	}
	const dataClient = dbClient ?? client

	const { customerId, error } = await claimCustomerProfile(
		dataClient,
		formattedPhone,
	)

	if (error || !customerId) {
		onClaimError(error)
		return { success: false, error: 'claim_failed' }
	}

	appendAuthCookies()

	return {
		success: true,
		customerId,
		claimed: true,
	}
}

export async function findCustomerByUserId(
	client: CustomerDataClient,
	userId: string,
): Promise<{ id: string } | null> {
	const { data } = await client
		.from('customers')
		.select('id')
		.eq('user_id', userId)
		.maybeSingle()
	return customerIdFromUnknown(data)
}

export async function findCustomerAuthProfileAfterOtp({
	client,
	userId,
	formattedPhone,
}: {
	client: CustomerDataClient
	userId: string
	formattedPhone: string
}): Promise<{
	ownedCustomer: CustomerAuthProfile | null
	claimableCustomer: CustomerAuthProfile | null
	customer: CustomerAuthProfile | null
	needsAccount: boolean
	claimableCompany: string | null
}> {
	const { data: ownedCustomerData } = await client
		.from('customers')
		.select('id, company_name, user_id')
		.eq('user_id', userId)
		.maybeSingle()
	const ownedCustomer = customerProfileFromUnknown(ownedCustomerData)

	const claimableCustomer = ownedCustomer
		? null
		: await findClaimableCustomerProfile(client, formattedPhone)
	const customer = ownedCustomer ?? claimableCustomer

	return {
		ownedCustomer,
		claimableCustomer,
		customer,
		needsAccount: !customer,
		claimableCompany:
			customer && !customer.user_id ? customer.company_name : null,
	}
}

export async function createCustomerProfile({
	client,
	phone,
	email,
	companyName,
	fullName,
	userId,
}: {
	client: CustomerDataClient
	phone: string
	email: string | null
	companyName: string
	fullName: string
	userId: string
}): Promise<{ customerId: string | null; error: unknown }> {
	const { data, error } = await client
		.from('customers')
		.insert({
			phone,
			email,
			company_name: companyName,
			contact_name: fullName,
			user_id: userId,
		})
		.select('id')
		.single()

	return {
		customerId: customerIdFromUnknown(data)?.id ?? null,
		error,
	}
}

export async function claimCustomerProfile(
	client: CustomerDataClient,
	formattedPhone: string,
): Promise<{ customerId: string | null; error: unknown }> {
	const { data, error } = await client
		.rpc('claim_customer_profile', { p_phone: formattedPhone })
		.single()
	return {
		customerId: customerIdFromUnknown(data)?.id ?? null,
		error,
	}
}

export function isLocalSupabaseUrl(value: string): boolean {
	try {
		const hostname = new URL(value).hostname
		return hostname === '127.0.0.1' || hostname === 'localhost'
	} catch {
		return value.includes('127.0.0.1') || value.includes('localhost')
	}
}

export function isProviderSendFailure(error: {
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

export function doesUserPhoneMatch(
	userPhone: string | null | undefined,
	formattedPhone: string,
): boolean {
	const userDigits = phoneDigits(userPhone)
	const expectedDigits = phoneDigits(formattedPhone)
	return Boolean(userDigits && expectedDigits && userDigits === expectedDigits)
}

async function findClaimableCustomerProfile(
	client: CustomerDataClient,
	formattedPhone: string,
): Promise<CustomerAuthProfile | null> {
	const { data } = await client
		.rpc('find_claimable_customer_profile', {
			p_phone: formattedPhone,
		})
		.maybeSingle()
	return customerProfileFromUnknown(data)
}

function customerIdFromUnknown(value: unknown): { id: string } | null {
	if (!value || typeof value !== 'object' || !('id' in value)) return null
	const id = value.id
	return typeof id === 'string' ? { id } : null
}

function customerProfileFromUnknown(
	value: unknown,
): CustomerAuthProfile | null {
	if (!value || typeof value !== 'object') return null
	if (!('id' in value) || !('company_name' in value) || !('user_id' in value)) {
		return null
	}
	const { id, company_name: companyName, user_id: userId } = value
	if (
		typeof id !== 'string' ||
		typeof companyName !== 'string' ||
		(typeof userId !== 'string' && userId !== null)
	) {
		return null
	}
	return { id, company_name: companyName, user_id: userId }
}

function phoneDigits(value: string | null | undefined): string {
	return value?.replace(/\D/g, '') ?? ''
}
