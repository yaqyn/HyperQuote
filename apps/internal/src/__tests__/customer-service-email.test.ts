import type { GetReceivingEmailResponseSuccess } from 'resend'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
	buildSupportEmailEnvelope,
	deliverSupportEmail,
	parseEmailList,
	renderSupportEmailHtml,
	renderSupportEmailText,
	supportEmailMetadata,
	supportReplySubject,
} from '../lib/server/support-email'
import {
	isAddressedToSupport,
	normalizeCloudflareInboundEmail,
	normalizeResendReceivedEmail,
} from '../lib/server/support-email-inbound'

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

	it('adds the ticket reference to reply subjects exactly once', () => {
		const ticket = {
			id: '00000000-0000-4000-8000-000000000099',
			reference: 'TK-2026-ABC123',
			requester_email: 'customer@hyperquote.net',
			requester_name: 'Ahmed',
			subject: 'Delivery update',
		}

		expect(supportReplySubject(ticket, 'Re: Delivery update')).toBe(
			'Re: [TK-2026-ABC123] Delivery update',
		)
		expect(
			supportReplySubject(ticket, 'Re: [TK-2026-ABC123] Delivery update'),
		).toBe('Re: [TK-2026-ABC123] Delivery update')
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
			thread: {
				inReplyTo: '<inbound-message@customer.test>',
				references: ['<root-message@customer.test>'],
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
			headers: {
				'In-Reply-To': '<inbound-message@customer.test>',
				References:
					'<root-message@customer.test> <inbound-message@customer.test>',
			},
			reply_to: 'support@hyperquote.net',
			subject: 'Re: [TK-LOCAL-AI-003] Delivery update',
			to: ['customer@hyperquote.net'],
		})
		expect(body.html).toContain('HyperQuote')
		expect(body.html).toContain('Your order update is ready.')
		expect(body.text).toContain('Customer portal:')
	})

	it('normalizes Resend received email content for support ingestion', () => {
		const receivedEmail: GetReceivingEmailResponseSuccess = {
			attachments: [],
			bcc: null,
			cc: ['Ops <ops@example.com>'],
			created_at: '2026-05-25T08:00:00.000Z',
			from: 'Koko <KOKO@gmail.com>',
			headers: {
				'In-Reply-To': '<reply-target@hyperquote.net>',
				References: '<root@customer.test> <reply-target@hyperquote.net>',
			},
			html: null,
			id: 'email_received_123',
			message_id: '<customer-reply@gmail.com>',
			object: 'email',
			raw: null,
			reply_to: null,
			subject: 'Re: [TK-2026-ABC123] Delivery issue',
			text: 'The delivery issue still needs help.',
			to: ['HyperQuote Support <support@hyperquote.net>'],
		}

		const normalized = normalizeResendReceivedEmail(receivedEmail)

		expect(normalized).toMatchObject({
			body: 'The delivery issue still needs help.',
			fromEmail: 'koko@gmail.com',
			fromName: 'Koko',
			inReplyTo: '<reply-target@hyperquote.net>',
			messageId: '<customer-reply@gmail.com>',
			providerEmailId: 'email_received_123',
			subject: 'Re: [TK-2026-ABC123] Delivery issue',
			toEmails: ['support@hyperquote.net'],
		})
		expect(normalized.references).toEqual([
			'<root@customer.test>',
			'<reply-target@hyperquote.net>',
		])
		expect(isAddressedToSupport(normalized, 'support@hyperquote.net')).toBe(
			true,
		)
		expect(isAddressedToSupport(normalized, 'other@hyperquote.net')).toBe(false)
	})

	it('normalizes Cloudflare Email Routing messages for support ingestion', async () => {
		const rawEmail = [
			'From: Koko <KOKO@gmail.com>',
			'To: HyperQuote Support <support@hyperquote.net>',
			'Cc: Ops <ops@example.com>',
			'Subject: Re: [TK-2026-ABC123] Delivery issue',
			'Message-ID: <cloudflare-message@customer.test>',
			'In-Reply-To: <reply-target@hyperquote.net>',
			'References: <root@customer.test> <reply-target@hyperquote.net>',
			'Date: Mon, 25 May 2026 08:00:00 +0000',
			'Content-Type: text/plain; charset=utf-8',
			'',
			'The delivery issue still needs help.',
		].join('\r\n')

		const normalized = await normalizeCloudflareInboundEmail({
			from: 'koko@gmail.com',
			headers: new Headers({
				'Message-ID': '<cloudflare-message@customer.test>',
			}),
			raw: new Response(rawEmail).body ?? new ReadableStream(),
			rawSize: rawEmail.length,
			setReject: vi.fn(),
			to: 'support@hyperquote.net',
		})

		expect(normalized).toMatchObject({
			body: 'The delivery issue still needs help.',
			ccEmails: ['ops@example.com'],
			fromEmail: 'koko@gmail.com',
			fromName: 'Koko',
			inReplyTo: '<reply-target@hyperquote.net>',
			messageId: '<cloudflare-message@customer.test>',
			providerEmailId: 'cloudflare:<cloudflare-message@customer.test>',
			receivedAt: '2026-05-25T08:00:00.000Z',
			subject: 'Re: [TK-2026-ABC123] Delivery issue',
			toEmails: ['support@hyperquote.net'],
		})
		expect(normalized.references).toEqual([
			'<root@customer.test>',
			'<reply-target@hyperquote.net>',
		])
		expect(isAddressedToSupport(normalized, 'support@hyperquote.net')).toBe(
			true,
		)
	})
})
