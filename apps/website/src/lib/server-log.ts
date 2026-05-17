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

interface RedactedErrorSummary {
	type: string
	name?: string
	code?: string
	status?: number
}

function readErrorField(error: object, field: string): unknown {
	return Object.hasOwn(error, field)
		? (error as Record<string, unknown>)[field]
		: undefined
}

function safeString(value: unknown): string | undefined {
	return typeof value === 'string' && value.length <= 80 ? value : undefined
}

function safeNumber(value: unknown): number | undefined {
	return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function summarizeError(error: unknown): RedactedErrorSummary {
	if (!error || typeof error !== 'object') {
		return { type: typeof error }
	}

	// Only copy machine-readable fields; messages/stacks can contain user data.
	return {
		type: error.constructor?.name ?? 'Object',
		name:
			error instanceof Error
				? error.name
				: safeString(readErrorField(error, 'name')),
		code: safeString(readErrorField(error, 'code')),
		status:
			safeNumber(readErrorField(error, 'status')) ??
			safeNumber(readErrorField(error, 'statusCode')),
	}
}

export function logWebsiteServerError(event: ServerLogEvent, error: unknown) {
	console.error(
		JSON.stringify({
			level: 'error',
			source: 'website',
			event,
			error: summarizeError(error),
		}),
	)
}
