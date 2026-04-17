/// <reference types="@cloudflare/workers-types" />
// Rate limiting via Cloudflare KV counters
// Key pattern: rate:{action}:{identifier}
// Uses KV with TTL for sliding window counters

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

/**
 * Get KV namespace from Cloudflare Workers environment.
 * Encapsulates env access so the binding name can be swapped.
 */
async function getKVNamespace(): Promise<KVNamespace | null> {
	try {
		// Dynamic import to avoid bundling cloudflare:workers in client code
		const { env } = await import('cloudflare:workers')
		return ((env as Record<string, unknown>).RATE_KV as KVNamespace) ?? null
	} catch {
		// KV not available (local dev, non-Workers environment)
		return null
	}
}

export async function checkRateLimit(
	kv: KVNamespace | null,
	options: RateLimitOptions,
): Promise<RateLimitResult> {
	// If no KV available, allow all requests (dev mode)
	if (!kv) {
		return { allowed: true, remaining: options.limit }
	}

	const kvKey = `rate:${options.key}`
	const current = await kv.get(kvKey)
	const count = current ? parseInt(current, 10) : 0

	if (count >= options.limit) {
		return { allowed: false, remaining: 0, retryAfter: options.windowSeconds }
	}

	await kv.put(kvKey, String(count + 1), {
		expirationTtl: options.windowSeconds,
	})
	return { allowed: true, remaining: options.limit - count - 1 }
}

/**
 * Special handler for OTP verify: 5 attempts per 60s, then 15-minute lockout.
 */
export async function checkOTPVerifyLimit(
	kv: KVNamespace | null,
	phone: string,
): Promise<RateLimitResult> {
	// If no KV available, allow all requests (dev mode)
	if (!kv) {
		return { allowed: true, remaining: 5 }
	}

	const lockKey = `lock:verify:${phone}`
	const locked = await kv.get(lockKey)
	if (locked) {
		return { allowed: false, remaining: 0, retryAfter: 900 } // 15 min
	}

	const result = await checkRateLimit(kv, {
		key: `verify:${phone}`,
		limit: 5,
		windowSeconds: 60,
	})

	// If limit exceeded, set 15-minute lockout
	if (!result.allowed) {
		await kv.put(lockKey, '1', { expirationTtl: 900 })
		return { allowed: false, remaining: 0, retryAfter: 900 }
	}

	return result
}

/**
 * Clear rate limit counter on successful verify.
 */
export async function clearRateLimit(
	kv: KVNamespace | null,
	key: string,
): Promise<void> {
	if (!kv) return
	await kv.delete(`rate:${key}`)
}

export type { RateLimitOptions, RateLimitResult }
export { getKVNamespace }
