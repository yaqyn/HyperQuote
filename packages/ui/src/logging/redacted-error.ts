export interface RedactedErrorSummary {
	type: string
	name?: string
	code?: string
	status?: number
}

interface RedactedErrorLog {
	error: unknown
	event: string
	source: string
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

export function summarizeRedactedError(error: unknown): RedactedErrorSummary {
	if (!error || typeof error !== 'object') {
		return { type: typeof error }
	}

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

export function logRedactedError({ error, event, source }: RedactedErrorLog) {
	console.error(
		JSON.stringify({
			level: 'error',
			source,
			event,
			error: summarizeRedactedError(error),
		}),
	)
}
