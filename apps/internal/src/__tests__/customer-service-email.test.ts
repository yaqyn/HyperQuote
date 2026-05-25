import { afterEach, describe, expect, it, vi } from 'vitest'
import {
	buildSupportEmailEnvelope,
	deliverSupportEmail,
	parseEmailList,
	renderSupportEmailHtml,
	renderSupportEmailText,
	supportEmailMetadata,
} from '../lib/server/support-email'

const originalFetch = globalThis.fetch
const originalResendApiKey = process.env.RESEND_API_KEY

afterEach(() => {
	vi.stubGlobal('fetch', originalFetch)
	if (originalResendApiKey) {
		process.env.RESEND_API_KEY = originalResendApiKey
	} else {
		delete process.env.RESEND_API_KEY
	}
})

describe('customer service email rendering', () => {
	it('parses comma and semicolon separated recipient fields safely', () => {
		expect(
			parseEmailList(
				'Customer <Customer@Example.COM>, bad-value; second@hyperquote.net',
			),
		).toEqual(['customer@example.com', 'second@hyperquote.net'])
	})

	it('renders employee text inside the branded HyperQuote email shell', () => {
		const html = renderSupportEmailHtml({
			body: 'Hello Ahmed,\n\n- Your order is confirmed\n- Finance receipt attached\n\n<script>alert(1)</script>',
			customerName: 'Ahmed',
			reference: 'TK-LOCAL-AI-001',
			subject: 'Re: Cement delivery',
		})

		expect(html).toContain('HyperQuote')
		expect(html).toContain('Portal App')
		expect(html).toContain('Arkan Plaza, Sheikh Zayed, Egypt')
		expect(html).toContain('<li')
		expect(html).toContain('Your order is confirmed')
		expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
		expect(html).toContain('<img')
		expect(html).toContain(
			'https://pub-cbfbae308dae4797b95916396d2ff713.r2.dev',
		)
		expect(html).not.toContain('data:image/png;base64,')
		expect(html).not.toContain('LyonBlack.svg')
		expect(html).not.toContain('<svg')
		expect(html).not.toContain('<script>alert(1)</script>')
	})

	it('keeps a useful plain-text fallback', () => {
		expect(
			renderSupportEmailText({
				body: 'We received your request.',
				customerName: 'Ahmed',
				reference: 'TK-LOCAL-AI-001',
				subject: 'Re: Cement delivery',
			}),
		).toContain('Customer portal: https://portal.hyperquote.net')
	})

	it('skips local-only recipients without calling Resend', async () => {
		const fetchMock = vi.fn()
		vi.stubGlobal('fetch', fetchMock)
		const envelope = await buildSupportEmailEnvelope({
			body: 'Local flow reply',
			metadata: {
				subject: 'Re: Local flow',
				to: 'flow-support@hyperquote.local',
			},
			ticket: {
				id: '00000000-0000-4000-8000-000000000001',
				reference: 'TK-LOCAL-AI-001',
				requester_email: 'flow-support@hyperquote.local',
				requester_name: 'Flow Support',
				subject: 'Local flow',
			},
		})

		const delivery = await deliverSupportEmail(envelope, 'local-message-id')

		expect(fetchMock).not.toHaveBeenCalled()
		expect(delivery.providerStatus).toBe('local_delivery_skipped')
		expect(supportEmailMetadata(envelope, delivery)).toMatchObject({
			provider_status: 'local_delivery_skipped',
			to: 'flow-support@hyperquote.local',
		})
	})

	it('rejects malformed explicit recipients instead of falling back silently', async () => {
		await expect(
			buildSupportEmailEnvelope({
				body: 'Please confirm this ticket.',
				metadata: {
					to: 'bad-value',
				},
				ticket: {
					id: '00000000-0000-4000-8000-000000000002',
					reference: 'TK-LOCAL-AI-002',
					requester_email: 'customer@hyperquote.net',
					requester_name: 'Flow Support',
					subject: 'Recipient validation',
				},
			}),
		).rejects.toThrow('support_email_invalid_to')
	})

	it('sends Resend email with message scoped idempotency and branded payload', async () => {
		process.env.RESEND_API_KEY = 'test-resend-key'
		const fetchMock = vi.fn().mockResolvedValue({
			json: async () => ({ id: 'email_123' }),
			ok: true,
		})
		vi.stubGlobal('fetch', fetchMock)

		const envelope = await buildSupportEmailEnvelope({
			body: 'Hello Ahmed,\n\nYour order update is ready.',
			metadata: {
				cc: 'ops@hyperquote.net',
				subject: 'Re: Delivery update',
				to: 'customer@hyperquote.net',
			},
			ticket: {
				id: '00000000-0000-4000-8000-000000000003',
				reference: 'TK-LOCAL-AI-003',
				requester_email: 'customer@hyperquote.net',
				requester_name: 'Ahmed',
				subject: 'Delivery update',
			},
		})

		const delivery = await deliverSupportEmail(envelope, 'message-123')

		expect(delivery).toEqual({
			externalMessageId: 'email_123',
			providerError: null,
			providerStatus: 'sent',
		})
		expect(fetchMock).toHaveBeenCalledTimes(1)
		const request = fetchMock.mock.calls[0]?.[1]
		expect(request).toMatchObject({
			headers: expect.objectContaining({
				Authorization: 'Bearer test-resend-key',
				'Idempotency-Key': 'support-reply/message-123',
			}),
			method: 'POST',
		})
		const body =
			request && typeof request.body === 'string'
				? JSON.parse(request.body)
				: null
		expect(body).toMatchObject({
			cc: ['ops@hyperquote.net'],
			from: 'HyperQuote <support@info.moderngroupco.com>',
			reply_to: 'support@info.moderngroupco.com',
			subject: 'Re: Delivery update',
			to: ['customer@hyperquote.net'],
		})
		expect(body.html).toContain('HyperQuote')
		expect(body.html).toContain('Your order update is ready.')
		expect(body.text).toContain('Customer portal:')
	})
})
