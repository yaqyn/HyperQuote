// Re-export rate limiting utilities from shared auth package.
// Previously defined inline — now centralized for portal reuse.

export {
	checkOTPVerifyLimit,
	checkRateLimit,
	clearRateLimit,
	getKVNamespace,
} from '@hyperquote/auth/rate-limit'
