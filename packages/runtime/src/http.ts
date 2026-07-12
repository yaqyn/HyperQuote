export const DEFAULT_MAX_REQUEST_BODY_BYTES = 2 * 1024 * 1024
export const LARGE_UPLOAD_MAX_REQUEST_BODY_BYTES = 16 * 1024 * 1024

const CONTENT_SECURITY_POLICY = [
	"base-uri 'self'",
	"form-action 'self'",
	"frame-ancestors 'none'",
	"object-src 'none'",
].join('; ')

export interface WorkerHttpBoundaryOptions {
	maxRequestBodyBytes?: number
}

type WorkerHttpHandler = (request: Request) => Promise<Response> | Response

type PreparedRequest =
	| { ok: true; request: Request }
	| { ok: false; response: Response }

export async function handleWorkerHttpRequest(
	request: Request,
	handler: WorkerHttpHandler,
	options: WorkerHttpBoundaryOptions = {},
): Promise<Response> {
	const maxRequestBodyBytes =
		options.maxRequestBodyBytes ?? DEFAULT_MAX_REQUEST_BODY_BYTES
	if (!Number.isSafeInteger(maxRequestBodyBytes) || maxRequestBodyBytes < 1) {
		throw new RangeError('maxRequestBodyBytes must be a positive safe integer')
	}

	const prepared = await prepareBoundedRequest(request, maxRequestBodyBytes)
	const response = prepared.ok
		? await handler(prepared.request)
		: prepared.response
	return applyWorkerSecurityHeaders(request, response)
}

export function applyWorkerSecurityHeaders(
	request: Request,
	response: Response,
): Response {
	const headers = new Headers(response.headers)
	headers.set('content-security-policy', CONTENT_SECURITY_POLICY)
	headers.set('referrer-policy', 'strict-origin-when-cross-origin')
	headers.set('x-content-type-options', 'nosniff')
	headers.set('x-frame-options', 'DENY')
	headers.set('x-permitted-cross-domain-policies', 'none')
	if (new URL(request.url).protocol === 'https:') {
		headers.set(
			'strict-transport-security',
			'max-age=31536000; includeSubDomains',
		)
	}

	return new Response(response.body, {
		headers,
		status: response.status,
		statusText: response.statusText,
	})
}

async function prepareBoundedRequest(
	request: Request,
	maxBytes: number,
): Promise<PreparedRequest> {
	const declaredLength = request.headers.get('content-length')
	if (declaredLength !== null) {
		if (!/^[0-9]+$/.test(declaredLength)) {
			return {
				ok: false,
				response: requestError(400, 'invalid_content_length'),
			}
		}
		if (BigInt(declaredLength) > BigInt(maxBytes)) {
			return {
				ok: false,
				response: requestError(413, 'request_body_too_large'),
			}
		}
	}

	if (!request.body) return { ok: true, request }

	const reader = request.body.getReader()
	const chunks: Uint8Array[] = []
	let totalBytes = 0
	try {
		while (true) {
			const { done, value } = await reader.read()
			if (done) break
			totalBytes += value.byteLength
			if (totalBytes > maxBytes) {
				await reader.cancel().catch(() => undefined)
				return {
					ok: false,
					response: requestError(413, 'request_body_too_large'),
				}
			}
			chunks.push(value)
		}
	} catch {
		return { ok: false, response: requestError(400, 'invalid_request_body') }
	}

	const body = new Uint8Array(totalBytes)
	let offset = 0
	for (const chunk of chunks) {
		body.set(chunk, offset)
		offset += chunk.byteLength
	}
	const headers = new Headers(request.headers)
	headers.delete('content-length')
	return {
		ok: true,
		request: new Request(request.url, {
			body,
			headers,
			method: request.method,
			signal: request.signal,
		}),
	}
}

function requestError(status: number, error: string): Response {
	return new Response(JSON.stringify({ error }), {
		headers: {
			'cache-control': 'no-store',
			'content-type': 'application/json; charset=utf-8',
		},
		status,
	})
}
