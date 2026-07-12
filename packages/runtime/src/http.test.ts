import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import {
	applyWorkerSecurityHeaders,
	DEFAULT_MAX_REQUEST_BODY_BYTES,
	handleWorkerHttpRequest,
	LARGE_UPLOAD_MAX_REQUEST_BODY_BYTES,
} from './http'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../../..')

describe('worker HTTP boundary', () => {
	it('adds compatible security headers while preserving the response', async () => {
		const upstreamHeaders = new Headers({ 'x-upstream': 'preserved' })
		upstreamHeaders.append('set-cookie', 'first=1; Path=/; HttpOnly')
		upstreamHeaders.append('set-cookie', 'second=2; Path=/; HttpOnly')
		const response = applyWorkerSecurityHeaders(
			new Request('https://portal.hyperquote.net/orders'),
			new Response('body', {
				headers: upstreamHeaders,
				status: 202,
				statusText: 'Accepted',
			}),
		)

		assert.equal(response.status, 202)
		assert.equal(response.statusText, 'Accepted')
		assert.equal(await response.text(), 'body')
		assert.equal(response.headers.get('x-upstream'), 'preserved')
		assert.deepEqual(response.headers.getSetCookie(), [
			'first=1; Path=/; HttpOnly',
			'second=2; Path=/; HttpOnly',
		])
		assert.equal(response.headers.get('x-content-type-options'), 'nosniff')
		assert.equal(response.headers.get('x-frame-options'), 'DENY')
		assert.equal(
			response.headers.get('referrer-policy'),
			'strict-origin-when-cross-origin',
		)
		assert.equal(
			response.headers.get('strict-transport-security'),
			'max-age=31536000; includeSubDomains',
		)
		assert.equal(
			response.headers.get('content-security-policy'),
			"base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'",
		)
	})

	it('omits HSTS for local HTTP responses', () => {
		const response = applyWorkerSecurityHeaders(
			new Request('http://localhost:3000/'),
			new Response('local'),
		)
		assert.equal(response.headers.get('strict-transport-security'), null)
	})

	it('rejects declared and streamed bodies above the configured limit', async () => {
		let handlerCalls = 0
		const handler = () => {
			handlerCalls += 1
			return new Response('unexpected')
		}
		const declared = await handleWorkerHttpRequest(
			new Request('https://driver.hyperquote.net/api/driver/fuel', {
				headers: { 'content-length': '6' },
				method: 'POST',
			}),
			handler,
			{ maxRequestBodyBytes: 5 },
		)
		const streamedRequest = new Request(
			'https://driver.hyperquote.net/api/driver/fuel',
			{ body: '123456', method: 'POST' },
		)
		assert.equal(streamedRequest.headers.get('content-length'), null)
		const streamed = await handleWorkerHttpRequest(streamedRequest, handler, {
			maxRequestBodyBytes: 5,
		})

		assert.equal(handlerCalls, 0)
		assert.equal(declared.status, 413)
		assert.equal(streamed.status, 413)
		assert.deepEqual(await declared.json(), {
			error: 'request_body_too_large',
		})
		assert.deepEqual(await streamed.json(), {
			error: 'request_body_too_large',
		})
		assert.equal(streamed.headers.get('x-content-type-options'), 'nosniff')
	})

	it('replays bounded request bodies for the application handler', async () => {
		const response = await handleWorkerHttpRequest(
			new Request('https://internal.hyperquote.net/action', {
				body: '12345',
				headers: { 'content-type': 'text/plain' },
				method: 'POST',
			}),
			async (request) => {
				assert.equal(request.headers.get('content-length'), null)
				assert.equal(await request.text(), '12345')
				return new Response('accepted')
			},
			{ maxRequestBodyBytes: 5 },
		)

		assert.equal(response.status, 200)
		assert.equal(await response.text(), 'accepted')
	})

	it('rejects malformed content lengths', async () => {
		const response = await handleWorkerHttpRequest(
			new Request('https://www.hyperquote.net/action', {
				headers: { 'content-length': 'invalid' },
				method: 'POST',
			}),
			() => new Response('unexpected'),
		)
		assert.equal(response.status, 400)
		assert.deepEqual(await response.json(), { error: 'invalid_content_length' })
	})

	it('keeps every production Worker entrypoint behind the shared boundary', () => {
		const defaultLimitWorkers = [
			'apps/website/src/server.ts',
			'apps/internal/src/server.ts',
			'apps/driver/src/api.ts',
		]
		for (const path of defaultLimitWorkers) {
			const source = readFileSync(join(repoRoot, path), 'utf8')
			assert.match(source, /handleWorkerHttpRequest/)
			assert.doesNotMatch(source, /LARGE_UPLOAD_MAX_REQUEST_BODY_BYTES/)
		}

		const portalSource = readFileSync(
			join(repoRoot, 'apps/portal/src/server.ts'),
			'utf8',
		)
		assert.match(portalSource, /handleWorkerHttpRequest/)
		assert.match(portalSource, /LARGE_UPLOAD_MAX_REQUEST_BODY_BYTES/)
		assert.equal(DEFAULT_MAX_REQUEST_BODY_BYTES, 2 * 1024 * 1024)
		assert.equal(LARGE_UPLOAD_MAX_REQUEST_BODY_BYTES, 16 * 1024 * 1024)
	})
})
