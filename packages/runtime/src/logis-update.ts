export interface LogisUpdateRequestInput {
	actorUserId: string
	companySlug: string
	requestId: string
	timestamp: string
	version: 'stable'
}

export interface SignedLogisUpdateRequest extends LogisUpdateRequestInput {
	signature: string
}

export type LogisUpdateVerificationResult =
	| { ok: true }
	| {
			ok: false
			error:
				| 'expired'
				| 'invalid_signature'
				| 'replayed'
				| 'timestamp_invalid'
				| 'wrong_company'
	  }

const encoder = new TextEncoder()

export function canonicalLogisUpdatePayload(input: LogisUpdateRequestInput) {
	return [
		input.companySlug,
		input.version,
		input.requestId,
		input.timestamp,
		input.actorUserId,
	].join('\n')
}

export async function signLogisUpdateRequest(
	input: LogisUpdateRequestInput,
	secret: string,
): Promise<SignedLogisUpdateRequest> {
	return {
		...input,
		signature: await hmacHex(canonicalLogisUpdatePayload(input), secret),
	}
}

export async function verifyLogisUpdateRequest({
	expectedCompanySlug,
	maxAgeMs = 5 * 60 * 1000,
	now = new Date(),
	request,
	secret,
	seenRequestIds = new Set<string>(),
}: {
	expectedCompanySlug: string
	maxAgeMs?: number
	now?: Date
	request: SignedLogisUpdateRequest
	secret: string
	seenRequestIds?: ReadonlySet<string>
}): Promise<LogisUpdateVerificationResult> {
	if (request.companySlug !== expectedCompanySlug) {
		return { ok: false, error: 'wrong_company' }
	}
	if (seenRequestIds.has(request.requestId)) {
		return { ok: false, error: 'replayed' }
	}
	const timestampMs = Date.parse(request.timestamp)
	if (!Number.isFinite(timestampMs)) {
		return { ok: false, error: 'timestamp_invalid' }
	}
	if (Math.abs(now.getTime() - timestampMs) > maxAgeMs) {
		return { ok: false, error: 'expired' }
	}

	const expected = await hmacHex(canonicalLogisUpdatePayload(request), secret)
	if (!constantTimeEqual(expected, request.signature)) {
		return { ok: false, error: 'invalid_signature' }
	}
	return { ok: true }
}

async function hmacHex(payload: string, secret: string): Promise<string> {
	const key = await crypto.subtle.importKey(
		'raw',
		encoder.encode(secret),
		{ hash: 'SHA-256', name: 'HMAC' },
		false,
		['sign'],
	)
	const signature = await crypto.subtle.sign(
		'HMAC',
		key,
		encoder.encode(payload),
	)
	return [...new Uint8Array(signature)]
		.map((byte) => byte.toString(16).padStart(2, '0'))
		.join('')
}

function constantTimeEqual(left: string, right: string) {
	if (left.length !== right.length) return false
	let diff = 0
	for (let index = 0; index < left.length; index += 1) {
		diff |= left.charCodeAt(index) ^ right.charCodeAt(index)
	}
	return diff === 0
}
