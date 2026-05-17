import { logRedactedError } from '@hyperquote/ui/logging/redacted-error'

type ServerLogEvent =
	| 'website.auth.send_otp.supabase_error'
	| 'website.auth.send_otp.unexpected_error'
	| 'website.auth.verify_otp.supabase_error'
	| 'website.auth.verify_otp.unexpected_error'
	| 'website.auth.create_account.supabase_error'
	| 'website.auth.create_account.unexpected_error'
	| 'website.auth.claim_account.supabase_error'
	| 'website.auth.claim_account.unexpected_error'
	| 'website.catalog.public_catalog.supabase_error'
	| 'website.catalog.product_by_slug.supabase_error'

export function logWebsiteServerError(event: ServerLogEvent, error: unknown) {
	logRedactedError({ source: 'website', event, error })
}
