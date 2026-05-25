import {
	getInstalledRuntimeEnv,
	type RuntimeEnvValue,
	runtimeEnvRecord,
} from '@hyperquote/runtime/env'
import {
	type CookieOptions,
	createServerClient,
	parseCookieHeader,
} from '@supabase/ssr'
import type { User } from '@supabase/supabase-js'
import {
	resolveSupabaseServerConfig,
	resolveSupabaseServiceRoleConfig,
	type SupabaseServerRuntimeConfig,
	type SupabaseServiceRoleRuntimeConfig,
} from './config'
import type { AuthPool } from './types'

export {
	clearInstalledRuntimeEnv,
	getInstalledRuntimeEnv,
	installRuntimeEnv,
	type RuntimeEnvValue,
	type RuntimeSecretBinding,
	runtimeEnvValue,
	runtimeStringEnvValue,
} from '@hyperquote/runtime/env'
export {
	resolveSupabaseServerConfig,
	resolveSupabaseServiceRoleConfig,
	type SupabaseServerRuntimeConfig,
	type SupabaseServiceRoleRuntimeConfig,
}

interface ServerClientOptions {
	request: Request
	supabaseUrl: string
	supabaseAnonKey: string
	cookieDomain?: string
	cookieName?: string
}

/**
 * Serialize a Set-Cookie header from name, value, and options.
 * Supabase SSR provides { name, value, options } in setAll callback —
 * we need full headers so the response can set domain/path/etc.
 */
function serializeSetCookie(
	name: string,
	value: string,
	options?: CookieOptions,
): string {
	let header = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`
	if (options?.domain) header += `; Domain=${options.domain}`
	if (options?.path) header += `; Path=${options.path}`
	if (options?.maxAge !== undefined) header += `; Max-Age=${options.maxAge}`
	if (options?.httpOnly) header += '; HttpOnly'
	if (options?.secure) header += '; Secure'
	if (options?.sameSite && typeof options.sameSite === 'string') {
		const ss = options.sameSite
		header += `; SameSite=${ss.charAt(0).toUpperCase()}${ss.slice(1)}`
	}
	return header
}

/**
 * Create a Supabase client for server-side request handling.
 * Always call this inside the request handler so auth cookies stay request-local.
 */
export function createSupabaseServerClient({
	request,
	supabaseUrl,
	supabaseAnonKey,
	cookieDomain,
	cookieName,
}: ServerClientOptions) {
	const responseCookies = new Map<string, string>()
	const requestCookieDomain = resolveCookieDomainForRequest(
		request,
		cookieDomain,
	)
	const secureCookies = shouldUseSecureCookies(request)

	const client = createServerClient(supabaseUrl, supabaseAnonKey, {
		cookieOptions: {
			...(cookieName ? { name: cookieName } : {}),
			...(requestCookieDomain ? { domain: requestCookieDomain } : {}),
			path: '/',
			sameSite: 'lax',
			secure: secureCookies,
		},
		cookies: {
			getAll() {
				const header = request.headers.get('cookie') ?? ''
				return parseCookieHeader(header).map(({ name, value }) => ({
					name,
					value: value ?? '',
				}))
			},
			setAll(cookiesToSet) {
				for (const { name, value, options } of cookiesToSet) {
					const cookieOpts = {
						...options,
						secure: secureCookies,
						// Override domain only when the request host is inside that domain.
						...(requestCookieDomain ? { domain: requestCookieDomain } : {}),
					}
					responseCookies.set(name, serializeSetCookie(name, value, cookieOpts))
				}
			},
		},
	})

	return { client, responseCookies, responseHeaders: new Map<string, string>() }
}

function resolveCookieDomainForRequest(
	request: Request,
	cookieDomain?: string,
): string | undefined {
	const normalized = normalizeCookieDomain(cookieDomain)
	if (!normalized) return undefined

	let hostname: string
	try {
		hostname = new URL(request.url).hostname.toLowerCase()
	} catch {
		return undefined
	}

	const bareDomain = normalized.replace(/^\./, '')
	if (hostname === bareDomain || hostname.endsWith(`.${bareDomain}`)) {
		return normalized
	}
	return undefined
}

function normalizeCookieDomain(value?: string): string | undefined {
	const trimmed = value?.trim().toLowerCase()
	if (!trimmed) return undefined
	return trimmed
}

function shouldUseSecureCookies(request: Request): boolean {
	try {
		if (new URL(request.url).protocol === 'https:') return true
	} catch {
		// Fall through to forwarded protocol check.
	}
	const forwardedProto = request.headers
		.get('x-forwarded-proto')
		?.split(',')[0]
		?.trim()
		.toLowerCase()
	return forwardedProto === 'https'
}

export function appendSetCookieHeaders(
	headers: Headers,
	cookies: Iterable<string>,
	extraHeaders: Iterable<[string, string]> = [],
): number {
	let appended = 0
	for (const [key, value] of extraHeaders) {
		headers.set(key, value)
	}
	for (const cookie of cookies) {
		headers.append('set-cookie', cookie)
		appended += 1
	}
	return appended
}

const STALE_AUTH_ERROR_CODES = new Set([
	'invalid_refresh_token',
	'refresh_token_already_used',
	'refresh_token_not_found',
])

export function isStaleSupabaseAuthError(error: unknown): boolean {
	if (!error || typeof error !== 'object') return false
	const record = error as Record<string, unknown>
	const code = record.code
	if (typeof code === 'string' && STALE_AUTH_ERROR_CODES.has(code)) return true
	const message = record.message
	return (
		typeof message === 'string' &&
		/refresh token/i.test(message) &&
		/(invalid|not found|already used)/i.test(message)
	)
}

export function appendClearSupabaseAuthCookies(
	headers: Headers,
	{
		cookieDomain,
		cookieName,
		request,
	}: {
		cookieDomain?: string
		cookieName?: string
		request: Request
	},
): number {
	if (!cookieName) return 0

	const secureCookies = shouldUseSecureCookies(request)
	const requestCookieDomain = resolveCookieDomainForRequest(
		request,
		cookieDomain,
	)
	const names = authCookieNamesFromRequest(request, cookieName)
	let appended = 0

	for (const name of names) {
		headers.append(
			'set-cookie',
			serializeSetCookie(name, '', {
				maxAge: 0,
				path: '/',
				sameSite: 'lax',
				secure: secureCookies,
			}),
		)
		appended += 1
		if (requestCookieDomain) {
			headers.append(
				'set-cookie',
				serializeSetCookie(name, '', {
					domain: requestCookieDomain,
					maxAge: 0,
					path: '/',
					sameSite: 'lax',
					secure: secureCookies,
				}),
			)
			appended += 1
		}
	}

	return appended
}

function authCookieNamesFromRequest(request: Request, cookieName: string) {
	const names = new Set<string>([
		cookieName,
		...Array.from({ length: 10 }, (_, index) => `${cookieName}.${index}`),
	])
	const header = request.headers.get('cookie') ?? ''
	for (const { name } of parseCookieHeader(header)) {
		if (name === cookieName || name.startsWith(`${cookieName}.`)) {
			names.add(name)
		}
	}
	return names
}

interface SupabaseAuthUserReader {
	auth: {
		getUser(): Promise<{
			data: { user: User | null }
			error: unknown
		}>
	}
}

export async function getSupabaseServerUser({
	client,
	cookieDomain,
	cookieName,
	request,
	responseHeaders,
}: {
	client: SupabaseAuthUserReader
	cookieDomain?: string
	cookieName?: string
	request: Request
	responseHeaders: Headers
}) {
	const result = await client.auth.getUser()
	if (isStaleSupabaseAuthError(result.error)) {
		appendClearSupabaseAuthCookies(responseHeaders, {
			cookieDomain,
			cookieName,
			request,
		})
	}
	return result
}

export async function resolveSupabaseRuntimeConfig(
	fallbackEnv: Record<string, RuntimeEnvValue>,
): Promise<SupabaseServerRuntimeConfig | null> {
	const runtimeKeys = [
		'COOKIE_DOMAIN',
		'SUPABASE_ANON_KEY',
		'SUPABASE_COOKIE_NAME',
		'SUPABASE_URL',
	] as const
	const fallbackConfig = resolveSupabaseServerConfig(
		await runtimeEnvRecord(fallbackEnv, runtimeKeys),
	)
	if (fallbackConfig) return fallbackConfig
	const installedConfig = resolveSupabaseServerConfig(
		await runtimeEnvRecord(getInstalledRuntimeEnv(), runtimeKeys),
	)
	if (installedConfig) return installedConfig
	return null
}

export async function resolveSupabaseServiceRoleRuntimeConfig(
	fallbackEnv: Record<string, RuntimeEnvValue>,
): Promise<SupabaseServiceRoleRuntimeConfig | null> {
	const runtimeKeys = [
		'COOKIE_DOMAIN',
		'SUPABASE_ANON_KEY',
		'SUPABASE_COOKIE_NAME',
		'SUPABASE_SERVICE_ROLE_KEY',
		'SUPABASE_URL',
	] as const
	const fallbackConfig = resolveSupabaseServiceRoleConfig(
		await runtimeEnvRecord(fallbackEnv, runtimeKeys),
	)
	if (fallbackConfig) return fallbackConfig
	const installedConfig = resolveSupabaseServiceRoleConfig(
		await runtimeEnvRecord(getInstalledRuntimeEnv(), runtimeKeys),
	)
	if (installedConfig) return installedConfig
	return null
}

export async function createSupabaseServiceRoleClient(
	fallbackEnv: Record<string, RuntimeEnvValue>,
) {
	const config = await resolveSupabaseServiceRoleRuntimeConfig(fallbackEnv)
	if (!config) return null

	const { createClient } = await import('@supabase/supabase-js')
	return createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
		auth: {
			autoRefreshToken: false,
			persistSession: false,
		},
	})
}

type ServiceRoleClient = NonNullable<
	Awaited<ReturnType<typeof createSupabaseServiceRoleClient>>
>
type ServiceRoleRpc = ServiceRoleClient['rpc']

const ACTOR_RPC_NAMES = new Set([
	'admin_assign_employee_role',
	'admin_disable_driver',
	'admin_export_data',
	'admin_record_audit',
	'admin_remove_employee_role',
	'assign_support_conversation',
	'assign_support_ticket',
	'can_access_panel',
	'can_access_ceo_search',
	'claim_customer_profile',
	'claim_next_sales_order',
	'create_manual_order',
	'create_support_ticket',
	'create_supplier_refill',
	'current_employee_id',
	'customer_accept_quote',
	'customer_decline_quote',
	'customer_get_delivery_secret',
	'customer_order_delivery_tracking',
	'customer_record_order_saved_as_draft',
	'customer_record_portal_order_viewed',
	'customer_record_quote_request_draft_saved',
	'customer_request_quote_negotiation',
	'customer_submit_quote_line_response',
	'customer_submit_saved_quote_request',
	'dispatch_complete_delivery',
	'dispatch_complete_loaded_order',
	'dispatch_return_loaded_order',
	'driver_accept_delivery',
	'driver_app_dashboard',
	'driver_confirm_arrival_secret_result',
	'driver_confirm_delivery',
	'driver_list_active_drivers',
	'driver_list_team_messages',
	'driver_reject_delivery',
	'driver_reopen_delivery_route',
	'driver_send_team_message',
	'driver_set_online',
	'driver_start_delivery',
	'driver_update_location',
	'finance_cancel_customer_order',
	'finance_cancel_supplier_refill',
	'find_claimable_customer_profile',
	'inventory_finance_cleared_order_ids',
	'inventory_evaluate_order',
	'inventory_mark_price_outdated',
	'inventory_update_price',
	'inventory_update_supplier_prices',
	'internal_ai_search_documents',
	'link_support_conversation_to_customer',
	'log_activity',
	'record_ai_tool_call',
	'record_customer_payment',
	'record_customer_payment_followup',
	'record_supplier_payment',
	'record_supplier_payment_followup',
	'register_proof_document',
	'request_price_update',
	'require_panel',
	'refresh_ceo_search_documents_if_dirty',
	'reserve_order_stock',
	'sales_cancel_order',
	'sales_claim_order',
	'sales_confirm_order',
	'sales_record_call_note',
	'sales_reject_order',
	'sales_save_and_requeue',
	'sales_save_quote_version',
	'send_support_conversation_reply',
	'send_support_reply',
	'set_employee_presence',
	'set_support_conversation_status',
	'set_support_ticket_status',
	'transfer_team_ownership',
	'warehouse_approve_loading',
	'warehouse_approve_receiving',
	'warehouse_assign_loading_driver',
	'warehouse_start_loading',
	'warehouse_mark_loading_ready',
	'warehouse_reject_loading',
	'warehouse_reject_receiving',
	'warehouse_remove_loading_driver',
	'warehouse_replace_loading_driver',
	'warehouse_reset_loading',
	'warehouse_toggle_loading_item',
])

export function createActorServiceRoleClient({
	actorPool,
	actorUserId,
	client,
}: {
	actorPool: AuthPool
	actorUserId: string
	client: ServiceRoleClient
}): ServiceRoleClient {
	const rpc: ServiceRoleRpc = ((functionName, args, options) => {
		if (typeof functionName === 'string' && ACTOR_RPC_NAMES.has(functionName)) {
			return client.rpc(
				`service_${functionName}`,
				{
					...((args ?? {}) as Record<string, unknown>),
					p_actor_pool: actorPool,
					p_actor_user_id: actorUserId,
				},
				options,
			)
		}
		return client.rpc(functionName, args, options)
	}) as ServiceRoleRpc

	return new Proxy(client, {
		get(target, property, receiver) {
			if (property === 'rpc') return rpc
			return Reflect.get(target, property, receiver)
		},
	})
}
