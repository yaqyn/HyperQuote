import { getProcessRuntimeEnv } from '@hyperquote/runtime/env'
import { createSupabaseServiceRoleClient } from './server'

interface RateLimitStore {
	consume(options: RateLimitOptions): Promise<RateLimitResult>
	clear(key: string): Promise<void>
}

interface RateLimitOptions {
	key: string
	limit: number
	windowSeconds: number
	lockoutSeconds?: number
}

interface RateLimitResult {
	allowed: boolean
	remaining: number
	retryAfter?: number
}

export async function checkRateLimit(
	options: RateLimitOptions,
	store?: RateLimitStore,
): Promise<RateLimitResult> {
	return (store ?? (await createDatabaseRateLimitStore())).consume(options)
}

/**
 * Allow five OTP verification attempts per minute, then lock for 15 minutes.
 */
export async function checkOTPVerifyLimit(
	phone: string,
	store?: RateLimitStore,
): Promise<RateLimitResult> {
	return checkRateLimit(
		{
			key: `verify:${phone}`,
			limit: 5,
			lockoutSeconds: 900,
			windowSeconds: 60,
		},
		store,
	)
}

export async function clearRateLimit(
	key: string,
	store?: RateLimitStore,
): Promise<void> {
	await (store ?? (await createDatabaseRateLimitStore())).clear(key)
}

async function createDatabaseRateLimitStore(): Promise<RateLimitStore> {
	// Workers install their bindings on the shared runtime env. Nitro development
	// receives the same server-only values through the spawned process instead.
	const client = await createSupabaseServiceRoleClient(
		getProcessRuntimeEnv() ?? {},
	)
	if (!client) throw new Error('Rate limit backend is not configured')

	return {
		async consume(options) {
			const { data, error } = await client.rpc(
				'service_consume_request_rate_limit',
				{
					p_key: options.key,
					p_limit: options.limit,
					p_lockout_seconds: options.lockoutSeconds ?? 0,
					p_window_seconds: options.windowSeconds,
				},
			)
			if (error) throw new Error('Rate limit backend request failed')

			const result = parseRateLimitResult(data)
			if (!result) throw new Error('Rate limit backend returned invalid data')
			return result
		},
		async clear(key) {
			const { error } = await client.rpc('service_clear_request_rate_limit', {
				p_key: key,
			})
			if (error) throw new Error('Rate limit backend request failed')
		},
	}
}

function parseRateLimitResult(value: unknown): RateLimitResult | null {
	if (!Array.isArray(value) || value.length !== 1) return null
	const row = value[0]
	if (!row || typeof row !== 'object') return null
	if (
		!('allowed' in row) ||
		typeof row.allowed !== 'boolean' ||
		!('remaining' in row) ||
		typeof row.remaining !== 'number'
	) {
		return null
	}

	const result: RateLimitResult = {
		allowed: row.allowed,
		remaining: row.remaining,
	}
	if ('retry_after' in row && typeof row.retry_after === 'number') {
		result.retryAfter = row.retry_after
	}
	return result
}

export type { RateLimitOptions, RateLimitResult, RateLimitStore }
