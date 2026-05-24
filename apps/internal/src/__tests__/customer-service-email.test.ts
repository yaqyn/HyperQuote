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

afterEach(() => {
	vi.stubGlobal('fetch', originalFetch)
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
		expect(html).toContain('Important links')
		expect(html).toContain('<li')
		expect(html).toContain('Your order is confirmed')
		expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
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

		const delivery = await deliverSupportEmail(envelope)

		expect(fetchMock).not.toHaveBeenCalled()
		expect(delivery.providerStatus).toBe('local_delivery_skipped')
		expect(supportEmailMetadata(envelope, delivery)).toMatchObject({
			provider_status: 'local_delivery_skipped',
			to: 'flow-support@hyperquote.local',
		})
	})
})
