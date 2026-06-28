import {
	signLogisUpdateRequest,
	verifyLogisUpdateRequest,
} from '@hyperquote/runtime/logis-update'
import { describe, expect, it } from 'vitest'

describe('LOGIS update signing', () => {
	const request = {
		actorUserId: 'user-1',
		companySlug: 'hyperquote',
		requestId: 'request-1',
		timestamp: '2026-06-28T10:00:00.000Z',
		version: 'stable' as const,
	}

	it('accepts a fresh signed request', async () => {
		const signed = await signLogisUpdateRequest(request, 'secret')
		await expect(
			verifyLogisUpdateRequest({
				expectedCompanySlug: 'hyperquote',
				now: new Date('2026-06-28T10:01:00.000Z'),
				request: signed,
				secret: 'secret',
			}),
		).resolves.toEqual({ ok: true })
	})

	it('rejects replay, stale, wrong slug, and bad signature cases', async () => {
		const signed = await signLogisUpdateRequest(request, 'secret')
		await expect(
			verifyLogisUpdateRequest({
				expectedCompanySlug: 'hyperquote',
				request: signed,
				secret: 'secret',
				seenRequestIds: new Set(['request-1']),
			}),
		).resolves.toEqual({ ok: false, error: 'replayed' })
		await expect(
			verifyLogisUpdateRequest({
				expectedCompanySlug: 'hyperquote',
				now: new Date('2026-06-28T10:10:01.000Z'),
				request: signed,
				secret: 'secret',
			}),
		).resolves.toEqual({ ok: false, error: 'expired' })
		await expect(
			verifyLogisUpdateRequest({
				expectedCompanySlug: 'other',
				request: signed,
				secret: 'secret',
			}),
		).resolves.toEqual({ ok: false, error: 'wrong_company' })
		await expect(
			verifyLogisUpdateRequest({
				expectedCompanySlug: 'hyperquote',
				now: new Date('2026-06-28T10:01:00.000Z'),
				request: { ...signed, signature: 'bad' },
				secret: 'secret',
			}),
		).resolves.toEqual({ ok: false, error: 'invalid_signature' })
	})
})
