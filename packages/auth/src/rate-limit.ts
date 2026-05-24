import { getInstalledRuntimeEnv } from '@hyperquote/runtime/env'

// Optional key-value backed rate limiting.
// Key pattern: rate:{action}:{identifier}
// Local development normally has no store, so callers are allowed through.

interface RateLimitStore {
	get(key: string): Promise<string | null>
	put(
		key: string,
		value: string,
		options: { expirationTtl: number },
	): Promise<void>
	delete(key: string): Promise<void>
}

interface RateLimitOptions {
	key: string // e.g., "sendOTP:+201012345678" or "contact:192.168.1.1"
	limit: number // max attempts in window
	windowSeconds: number // window duration
}

interface RateLimitResult {
	allowed: boolean
	remaining: number
	retryAfter?: number // seconds until retry allowed
}

async function getRateLimitStore(): Promise<RateLimitStore | null> {
	const installedEnv = getInstalledRuntimeEnv()
	const installedStore = installedEnv?.RATE_LIMIT_STORE
	return isRateLimitStore(installedStore) ? installedStore : null
}

function isRateLimitStore(value: unknown): value is RateLimitStore {
	return (
		!!value &&
		typeof value === 'object' &&
		'get' in value &&
		'put' in value &&
		'delete' in value &&
		typeof value.get === 'function' &&
		typeof value.put === 'function' &&
		typeof value.delete === 'function'
	)
}

export async function checkRateLimit(
	store: RateLimitStore | null,
	options: RateLimitOptions,
): Promise<RateLimitResult> {
	if (!store) {
		return { allowed: true, remaining: options.limit }
	}

	const kvKey = `rate:${options.key}`
	const current = await store.get(kvKey)
	const count = current ? parseInt(current, 10) : 0

	if (count >= options.limit) {
		return { allowed: false, remaining: 0, retryAfter: options.windowSeconds }
	}

	await store.put(kvKey, String(count + 1), {
		expirationTtl: options.windowSeconds,
	})
	return { allowed: true, remaining: options.limit - count - 1 }
}

/**
 * Special handler for OTP verify: 5 attempts per 60s, then 15-minute lockout.
 */
export async function checkOTPVerifyLimit(
	store: RateLimitStore | null,
	phone: string,
): Promise<RateLimitResult> {
	if (!store) {
		return { allowed: true, remaining: 5 }
	}

	const lockKey = `lock:verify:${phone}`
	const locked = await store.get(lockKey)
	if (locked) {
		return { allowed: false, remaining: 0, retryAfter: 900 } // 15 min
	}

	const result = await checkRateLimit(store, {
		key: `verify:${phone}`,
		limit: 5,
		windowSeconds: 60,
	})

	// If limit exceeded, set 15-minute lockout
	if (!result.allowed) {
		await store.put(lockKey, '1', { expirationTtl: 900 })
		return { allowed: false, remaining: 0, retryAfter: 900 }
	}

	return result
}

/**
 * Clear rate limit counter on successful verify.
 */
export async function clearRateLimit(
	store: RateLimitStore | null,
	key: string,
): Promise<void> {
	if (!store) return
	await store.delete(`rate:${key}`)
}

export type { RateLimitOptions, RateLimitResult, RateLimitStore }
export { getRateLimitStore }
