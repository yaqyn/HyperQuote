import { runtimeStringEnvValue } from '@hyperquote/auth/server'
import type { JsonObject } from '../db/types'

export interface SupportEmailTicket {
	id: string
	reference: string
	requester_email: string
	requester_name: string | null
	subject: string
}

export interface SupportEmailEnvelope {
	bcc: string[]
	body: string
	cc: string[]
	from: string
	replyTo: string
	subject: string
	ticket: SupportEmailTicket
	to: string[]
}

export interface SupportEmailRenderInput {
	body: string
	customerName: string
	portalUrl?: string
	reference: string
	subject: string
	supportUrl?: string
	websiteUrl?: string
}

export interface SupportEmailDeliveryResult {
	externalMessageId: string | null
	providerError: string | null
	providerStatus: 'sent' | 'local_delivery_skipped'
}

interface ResendResponse {
	id?: unknown
	message?: unknown
	name?: unknown
	error?: {
		code?: unknown
		message?: unknown
		name?: unknown
	}
}

const RESEND_EMAIL_ENDPOINT = 'https://api.resend.com/emails'
const DEFAULT_SUPPORT_FROM = 'HyperQuote <support@hyperquote.net>'
const DEFAULT_SUPPORT_REPLY_TO = 'support@hyperquote.net'
const DEFAULT_WEBSITE_URL = 'https://hyperquote.net'
const DEFAULT_PORTAL_URL = 'https://portal.hyperquote.net'
const DEFAULT_SUPPORT_URL = 'https://hyperquote.net/support'
const EMAIL_PATTERN = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/
const LOCAL_ONLY_DOMAINS = new Set([
	'example.com',
	'example.net',
	'example.org',
	'hyperquote.local',
])

export async function buildSupportEmailEnvelope(input: {
	body: string
	metadata?: JsonObject
	ticket: SupportEmailTicket
}): Promise<SupportEmailEnvelope> {
	const metadata = input.metadata ?? {}
	const to = parseEmailList(metadataString(metadata, 'to'))
	if (to.length === 0) to.push(input.ticket.requester_email)

	const subject =
		metadataString(metadata, 'subject') || normalizedReplySubject(input.ticket)
	const from =
		(await readRuntimeEnv('HQ_SUPPORT_EMAIL_FROM')) ?? DEFAULT_SUPPORT_FROM
	const replyTo =
		(await readRuntimeEnv('HQ_SUPPORT_REPLY_TO')) ?? DEFAULT_SUPPORT_REPLY_TO

	const envelope: SupportEmailEnvelope = {
		bcc: parseEmailList(metadataString(metadata, 'bcc')),
		body: input.body.trim(),
		cc: parseEmailList(metadataString(metadata, 'cc')),
		from,
		replyTo,
		subject,
		ticket: input.ticket,
		to,
	}

	if (envelope.to.length === 0) {
		throw new Error('support_email_recipient_required')
	}
	return envelope
}

export async function deliverSupportEmail(
	envelope: SupportEmailEnvelope,
): Promise<SupportEmailDeliveryResult> {
	const allRecipients = [...envelope.to, ...envelope.cc, ...envelope.bcc]
	const realRecipients = allRecipients.filter(
		(address) => !isLocalOnlyEmail(address),
	)
	if (realRecipients.length === 0) {
		return {
			externalMessageId: null,
			providerError: null,
			providerStatus: 'local_delivery_skipped',
		}
	}
	if (realRecipients.length !== allRecipients.length) {
		throw new Error('support_email_mixed_test_recipients')
	}

	const apiKey =
		(await readRuntimeEnv('HQ_RESEND_API_KEY')) ??
		(await readRuntimeEnv('RESEND_API_KEY'))
	if (!apiKey) throw new Error('support_email_provider_not_configured')

	const renderInput = await renderInputForEnvelope(envelope)
	const response = await fetch(RESEND_EMAIL_ENDPOINT, {
		body: JSON.stringify({
			bcc: envelope.bcc.length > 0 ? envelope.bcc : undefined,
			cc: envelope.cc.length > 0 ? envelope.cc : undefined,
			from: envelope.from,
			html: renderSupportEmailHtml(renderInput),
			reply_to: envelope.replyTo,
			subject: envelope.subject,
			tags: [
				{ name: 'category', value: 'support_reply' },
				{ name: 'ticket_id', value: safeTagValue(envelope.ticket.id) },
			],
			text: renderSupportEmailText(renderInput),
			to: envelope.to,
		}),
		headers: {
			Authorization: `Bearer ${apiKey}`,
			'Content-Type': 'application/json',
			'Idempotency-Key': await supportEmailIdempotencyKey(envelope),
		},
		method: 'POST',
	})

	const payload = (await response.json().catch(() => ({}))) as ResendResponse
	if (!response.ok) {
		const message =
			stringFromUnknown(payload.error?.message) ||
			stringFromUnknown(payload.message) ||
			`Resend rejected the email with HTTP ${response.status}`
		throw new Error(`support_email_send_failed:${message}`)
	}

	const id = stringFromUnknown(payload.id)
	if (!id) throw new Error('support_email_send_failed:missing_resend_id')
	return {
		externalMessageId: id,
		providerError: null,
		providerStatus: 'sent',
	}
}

export function parseEmailList(value: string | null | undefined): string[] {
	if (!value) return []
	const seen = new Set<string>()
	const emails: string[] = []
	for (const token of value.split(/[;,]/)) {
		const candidate = emailAddressFromToken(token)
		if (!candidate || !EMAIL_PATTERN.test(candidate)) continue
		const normalized = candidate.toLowerCase()
		if (seen.has(normalized)) continue
		seen.add(normalized)
		emails.push(normalized)
	}
	return emails
}

export function renderSupportEmailHtml(input: SupportEmailRenderInput): string {
	const customerName = escapeHtml(input.customerName || 'there')
	const reference = escapeHtml(input.reference)
	const subject = escapeHtml(input.subject)
	const portalUrl = escapeHtml(input.portalUrl ?? DEFAULT_PORTAL_URL)
	const supportUrl = escapeHtml(input.supportUrl ?? DEFAULT_SUPPORT_URL)
	const websiteUrl = escapeHtml(input.websiteUrl ?? DEFAULT_WEBSITE_URL)
	const messageHtml = renderMessageBodyHtml(input.body)

	return `<!doctype html>
<html lang="en">
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f4f1eb;color:#171717;font-family:Arial,Helvetica,sans-serif;">
	<div style="display:none;max-height:0;overflow:hidden;opacity:0;">A reply from HyperQuote customer service about ${reference}.</div>
	<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f1eb;margin:0;padding:32px 12px;">
		<tr>
			<td align="center">
				<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border:1px solid #e7e0d4;border-radius:18px;overflow:hidden;box-shadow:0 24px 80px rgba(23,23,23,0.08);">
					<tr>
						<td style="padding:30px 32px 20px;">
							<table role="presentation" width="100%" cellspacing="0" cellpadding="0">
								<tr>
									<td align="left" style="vertical-align:middle;">
										<table role="presentation" cellspacing="0" cellpadding="0">
											<tr>
												<td style="width:34px;height:34px;border-radius:10px;background:#171717;color:#ffffff;text-align:center;font-size:13px;font-weight:700;letter-spacing:0.08em;">HQ</td>
												<td style="padding-left:12px;font-size:18px;line-height:1;font-weight:700;letter-spacing:-0.01em;color:#171717;">HyperQuote</td>
											</tr>
										</table>
									</td>
									<td align="right" style="font-size:12px;line-height:1.4;color:#817869;">${reference}</td>
								</tr>
							</table>
						</td>
					</tr>
					<tr>
						<td style="padding:8px 32px 0;">
							<p style="margin:0 0 10px;font-size:13px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#9b8d75;">Customer service</p>
							<h1 style="margin:0;font-size:30px;line-height:1.12;font-weight:700;letter-spacing:-0.03em;color:#171717;">Hi ${customerName}, we are on it.</h1>
							<p style="margin:16px 0 0;font-size:16px;line-height:1.7;color:#5f574a;">Thank you for reaching out to HyperQuote. Our team reviewed your request and sent the reply below so you can keep moving without waiting on another call.</p>
						</td>
					</tr>
					<tr>
						<td style="padding:28px 32px 8px;">
							<div style="border:1px solid #ece6dc;border-radius:16px;background:#fffdf9;padding:24px 24px 22px;">
								<p style="margin:0 0 14px;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#9b8d75;">${subject}</p>
								<div style="font-size:16px;line-height:1.78;color:#2b2b2b;">${messageHtml}</div>
							</div>
						</td>
					</tr>
					<tr>
						<td style="padding:22px 32px 30px;">
							<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid #ece6dc;padding-top:20px;">
								<tr>
									<td style="font-size:13px;line-height:1.7;color:#817869;">Important links</td>
								</tr>
								<tr>
									<td style="padding-top:12px;">
										<a href="${portalUrl}" style="display:inline-block;margin:0 8px 8px 0;padding:10px 13px;border-radius:10px;background:#171717;color:#ffffff;text-decoration:none;font-size:13px;font-weight:700;">Customer portal</a>
										<a href="${supportUrl}" style="display:inline-block;margin:0 8px 8px 0;padding:10px 13px;border-radius:10px;background:#f2eee7;color:#171717;text-decoration:none;font-size:13px;font-weight:700;">Support center</a>
										<a href="${websiteUrl}" style="display:inline-block;margin:0 0 8px 0;padding:10px 13px;border-radius:10px;background:#f2eee7;color:#171717;text-decoration:none;font-size:13px;font-weight:700;">HyperQuote</a>
									</td>
								</tr>
							</table>
							<p style="margin:14px 0 0;font-size:12px;line-height:1.6;color:#9b8d75;">This email was sent by HyperQuote customer service. Reply to this message and it will return to the same support thread.</p>
						</td>
					</tr>
				</table>
			</td>
		</tr>
	</table>
</body>
</html>`
}

export function renderSupportEmailText(input: SupportEmailRenderInput): string {
	const links = [
		`Customer portal: ${input.portalUrl ?? DEFAULT_PORTAL_URL}`,
		`Support center: ${input.supportUrl ?? DEFAULT_SUPPORT_URL}`,
		`HyperQuote: ${input.websiteUrl ?? DEFAULT_WEBSITE_URL}`,
	]
	return [
		`Hi ${input.customerName || 'there'},`,
		'',
		'Thank you for reaching out to HyperQuote. Our team reviewed your request and sent the reply below.',
		'',
		`Reference: ${input.reference}`,
		`Subject: ${input.subject}`,
		'',
		input.body.trim(),
		'',
		'Important links:',
		...links,
	].join('\n')
}

export function supportEmailMetadata(
	envelope: SupportEmailEnvelope,
	delivery: SupportEmailDeliveryResult,
): JsonObject {
	return {
		bcc: envelope.bcc.join(', ') || null,
		cc: envelope.cc.join(', ') || null,
		external_message_id: delivery.externalMessageId,
		from: envelope.from,
		provider_error: delivery.providerError,
		provider_status: delivery.providerStatus,
		reply_to: envelope.replyTo,
		subject: envelope.subject,
		to: envelope.to.join(', '),
	}
}

async function renderInputForEnvelope(
	envelope: SupportEmailEnvelope,
): Promise<SupportEmailRenderInput> {
	return {
		body: envelope.body,
		customerName:
			envelope.ticket.requester_name || envelope.ticket.requester_email,
		portalUrl: await readRuntimeEnv('HQ_PORTAL_URL'),
		reference: envelope.ticket.reference,
		subject: envelope.subject,
		supportUrl: await readRuntimeEnv('HQ_SUPPORT_URL'),
		websiteUrl: await readRuntimeEnv('HQ_WEBSITE_URL'),
	}
}

function metadataString(metadata: JsonObject, key: string): string {
	const value = metadata[key]
	return typeof value === 'string' ? value.trim() : ''
}

function normalizedReplySubject(ticket: SupportEmailTicket): string {
	return ticket.subject.startsWith('Re:')
		? ticket.subject
		: `Re: ${ticket.subject}`
}

function emailAddressFromToken(token: string): string {
	const trimmed = token.trim()
	const bracketMatch = /<([^>]+)>/.exec(trimmed)
	return (bracketMatch?.[1] ?? trimmed).trim()
}

function isLocalOnlyEmail(email: string): boolean {
	const domain = email.split('@')[1]?.toLowerCase() ?? ''
	return (
		LOCAL_ONLY_DOMAINS.has(domain) ||
		domain.endsWith('.local') ||
		domain.endsWith('.test')
	)
}

function renderMessageBodyHtml(body: string): string {
	const blocks = body
		.trim()
		.split(/\n{2,}/)
		.map((block) => block.trim())
		.filter(Boolean)

	return blocks
		.map((block) => {
			const lines = block.split('\n').map((line) => line.trim())
			const bulletLines = lines
				.map((line) => /^[-*]\s+(.+)$/.exec(line)?.[1] ?? null)
				.filter((line): line is string => Boolean(line))
			if (bulletLines.length === lines.length) {
				return `<ul style="margin:0 0 16px 20px;padding:0;">${bulletLines
					.map(
						(line) =>
							`<li style="margin:0 0 8px;padding-left:4px;">${escapeHtml(line)}</li>`,
					)
					.join('')}</ul>`
			}
			return `<p style="margin:0 0 16px;">${lines.map(escapeHtml).join('<br>')}</p>`
		})
		.join('')
}

function escapeHtml(value: string): string {
	const entityByCharacter: Record<string, string> = {
		'"': '&quot;',
		'&': '&amp;',
		'<': '&lt;',
		'>': '&gt;',
	}
	return value.replace(
		/[&<>"]/g,
		(character) => entityByCharacter[character] ?? character,
	)
}

async function readRuntimeEnv(name: string): Promise<string | undefined> {
	const processValue = process.env[name]?.trim()
	if (processValue) return processValue
	try {
		const workersModule = 'cloudflare:workers'
		const { env } = await import(/* @vite-ignore */ workersModule)
		const value = await runtimeStringEnvValue(env, name)
		return value?.trim() || undefined
	} catch {
		return undefined
	}
}

async function supportEmailIdempotencyKey(
	envelope: SupportEmailEnvelope,
): Promise<string> {
	const material = [
		envelope.ticket.id,
		envelope.to.join(','),
		envelope.cc.join(','),
		envelope.bcc.join(','),
		envelope.subject,
		envelope.body,
	].join('|')
	const digest = await crypto.subtle.digest(
		'SHA-256',
		new TextEncoder().encode(material),
	)
	return `support-reply/${envelope.ticket.id}/${hexDigest(digest).slice(0, 24)}`
}

function hexDigest(buffer: ArrayBuffer): string {
	return [...new Uint8Array(buffer)]
		.map((byte) => byte.toString(16).padStart(2, '0'))
		.join('')
}

function safeTagValue(value: string): string {
	return value.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 256)
}

function stringFromUnknown(value: unknown): string {
	return typeof value === 'string' ? value : ''
}
