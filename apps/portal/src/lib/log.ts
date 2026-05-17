import { logRedactedError } from '@hyperquote/ui/logging/redacted-error'

type PortalLogEvent =
	| 'portal.auth.send_otp.supabase_error'
	| 'portal.auth.send_otp.unexpected_error'
	| 'portal.auth.verify_otp.supabase_error'
	| 'portal.auth.verify_otp.unexpected_error'
	| 'portal.auth.create_account.supabase_error'
	| 'portal.auth.create_account.unexpected_error'
	| 'portal.auth.claim_account.supabase_error'
	| 'portal.auth.claim_account.unexpected_error'
	| 'portal.chat.stream_error'
	| 'portal.chat.error'

export function logPortalError(event: PortalLogEvent, error: unknown) {
	logRedactedError({ source: 'portal', event, error })
}
