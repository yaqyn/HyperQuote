import { logRedactedError } from '@hyperquote/ui/logging/redacted-error'

type PortalLogEvent =
	| 'portal.auth.send_otp.supabase_error'
	| 'portal.auth.send_otp.unexpected_error'
	| 'portal.auth.verify_otp.supabase_error'
	| 'portal.auth.verify_otp.unexpected_error'
	| 'portal.auth.email_signin.unexpected_error'
	| 'portal.auth.create_account.supabase_error'
	| 'portal.auth.create_account.unexpected_error'
	| 'portal.auth.claim_account.supabase_error'
	| 'portal.auth.claim_account.unexpected_error'
	| 'portal.auth.activity.supabase_error'
	| 'portal.auth.sign_out.supabase_error'
	| 'portal.auth.phone_change_request.supabase_error'
	| 'portal.auth.phone_change_request.unexpected_error'
	| 'portal.auth.phone_change_verify.supabase_error'
	| 'portal.auth.phone_change_verify.unexpected_error'
	| 'portal.auth.phone_change_customer.supabase_error'
	| 'portal.chat.stream_error'
	| 'portal.chat.error'

export function logPortalError(event: PortalLogEvent, error: unknown) {
	logRedactedError({ source: 'portal', event, error })
}
