// Re-export rate limiting utilities from shared auth package.
// Previously defined inline — now centralized for portal reuse.
export {
  checkRateLimit,
  checkOTPVerifyLimit,
  clearRateLimit,
  getKVNamespace,
} from '@hyperquote/auth'
export type { RateLimitOptions, RateLimitResult } from '@hyperquote/auth'
