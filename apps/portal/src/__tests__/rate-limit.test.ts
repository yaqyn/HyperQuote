import {
	checkOTPVerifyLimit,
	checkRateLimit,
	clearRateLimit,
	type RateLimitOptions,
	type RateLimitStore,
} from '@hyperquote/auth/rate-limit'
import { describe, expect, it } from 'vitest'

describe('rate limit client', () => {
	it('uses one atomic consume operation and preserves OTP lockout settings', async () => {
		const consumed: RateLimitOptions[] = []
		const cleared: string[] = []
		const store: RateLimitStore = {
			async consume(options) {
				consumed.push(options)
				return { allowed: true, remaining: options.limit - 1 }
			},
			async clear(key) {
				cleared.push(key)
			},
		}

		await checkRateLimit(
			{ key: 'contact:127.0.0.1', limit: 5, windowSeconds: 60 },
			store,
		)
		await checkOTPVerifyLimit('+201000000000', store)
		await clearRateLimit('verify:+201000000000', store)

		expect(consumed).toEqual([
			{ key: 'contact:127.0.0.1', limit: 5, windowSeconds: 60 },
			{
				key: 'verify:+201000000000',
				limit: 5,
				lockoutSeconds: 900,
				windowSeconds: 60,
			},
		])
		expect(cleared).toEqual(['verify:+201000000000'])
	})
})
