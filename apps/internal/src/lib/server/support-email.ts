import {
	getInstalledRuntimeEnv,
	runtimeStringEnvValue,
} from '@hyperquote/auth/server'
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
	officeAddress?: string
	officeMapUrl?: string
	portalUrl?: string
	reference: string
	subject: string
	supportPhoneUrl?: string
	supportUrl?: string
	supportWhatsappUrl?: string
	websiteUrl?: string
}

export interface SupportEmailDeliveryResult {
	externalMessageId: string | null
	providerError: string | null
	providerStatus: 'failed' | 'local_delivery_skipped' | 'sending' | 'sent'
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
const DEFAULT_SUPPORT_FROM = 'HyperQuote <support@info.moderngroupco.com>'
const DEFAULT_SUPPORT_REPLY_TO = 'support@info.moderngroupco.com'
const DEFAULT_WEBSITE_URL = 'https://hyperquote.net'
const DEFAULT_PORTAL_URL = 'https://portal.hyperquote.net'
const DEFAULT_SUPPORT_URL = 'https://hyperquote.net/support#contact'
const DEFAULT_OFFICE_ADDRESS = 'Arkan Plaza, Sheikh Zayed, Egypt'
const DEFAULT_OFFICE_MAP_URL =
	'https://maps.google.com/?q=Arkan+Plaza+Sheikh+Zayed+Egypt'
const DEFAULT_LOGO_URL = 'https://hyperquote.net/LyonWhite.svg'
const BRAND_BLUE = '#2563EB'
const BRAND_BLACK = '#090909'
const BRAND_WHITE = '#FFFFFF'
const EMAIL_PATTERN = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/
const MAX_PROVIDER_ERROR_LENGTH = 500
const MAX_SUPPORT_EMAIL_BODY_LENGTH = 4000
const MAX_SUPPORT_EMAIL_SUBJECT_LENGTH = 180
const MATERIAL_EMAIL_ICON_PATH =
	'M20 4H4q-.825 0-1.412.588T2 6v12q0 .825.588 1.413T4 20h8v-2H4V8l8 5 8-5v4h2V6q0-.825-.587-1.412T20 4Zm-8 7L4 6h16l-8 5Zm6.2 9.5 3.55-3.55-1.4-1.4-2.15 2.15-.9-.9-1.4 1.4 2.3 2.3ZM19 23q-2.075 0-3.537-1.463T14 18q0-2.075 1.463-3.537T19 13q2.075 0 3.538 1.463T24 18q0 2.075-1.462 3.537T19 23Z'
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
	const rawTo = metadataString(metadata, 'to')
	const to = parseEmailField(rawTo, 'to')
	if (to.length === 0) {
		to.push(validEmailOrThrow(input.ticket.requester_email, 'to'))
	}

	const subject =
		metadataString(metadata, 'subject') || normalizedReplySubject(input.ticket)
	if (!subject.trim()) throw new Error('support_email_subject_required')
	if (subject.length > MAX_SUPPORT_EMAIL_SUBJECT_LENGTH) {
		throw new Error('support_email_subject_too_long')
	}
	const body = input.body.trim()
	if (!body) throw new Error('support_email_body_required')
	if (body.length > MAX_SUPPORT_EMAIL_BODY_LENGTH) {
		throw new Error('support_email_body_too_long')
	}
	const from =
		(await readRuntimeEnv('SUPPORT_EMAIL_FROM')) ?? DEFAULT_SUPPORT_FROM
	const replyTo =
		(await readRuntimeEnv('SUPPORT_REPLY_TO')) ?? DEFAULT_SUPPORT_REPLY_TO

	const envelope: SupportEmailEnvelope = {
		bcc: parseEmailField(metadataString(metadata, 'bcc'), 'bcc'),
		body,
		cc: parseEmailField(metadataString(metadata, 'cc'), 'cc'),
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
	idempotencyKey: string,
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

	const apiKey = await readRuntimeEnv('RESEND_API_KEY')
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
			'Idempotency-Key': `support-reply/${idempotencyKey}`,
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

export function supportEmailFailedDelivery(
	error: unknown,
): SupportEmailDeliveryResult {
	return {
		externalMessageId: null,
		providerError: providerErrorMessage(error),
		providerStatus: 'failed',
	}
}

export function renderSupportEmailHtml(input: SupportEmailRenderInput): string {
	const customerName = escapeHtml(input.customerName || 'there')
	const reference = escapeHtml(input.reference)
	const subject = escapeHtml(input.subject)
	const portalUrl = escapeHtml(input.portalUrl ?? DEFAULT_PORTAL_URL)
	const supportUrl = escapeHtml(input.supportUrl ?? DEFAULT_SUPPORT_URL)
	const supportPhoneUrl = escapeHtml(input.supportPhoneUrl ?? supportUrl)
	const supportWhatsappUrl = escapeHtml(input.supportWhatsappUrl ?? supportUrl)
	const websiteUrl = escapeHtml(input.websiteUrl ?? DEFAULT_WEBSITE_URL)
	const officeMapUrl = escapeHtml(input.officeMapUrl ?? DEFAULT_OFFICE_MAP_URL)
	const officeAddress = escapeHtml(
		input.officeAddress ?? DEFAULT_OFFICE_ADDRESS,
	)
	const messageHtml = renderMessageBodyHtml(input.body)

	return `<!doctype html>
<html lang="en">
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<meta name="color-scheme" content="light">
	<meta name="supported-color-schemes" content="light">
	<title>${subject}</title>
	<style>
		@media only screen and (max-width: 720px) {
			.email-shell { width: 100% !important; max-width: 100% !important; }
			.email-pad { padding-left: 22px !important; padding-right: 22px !important; }
			.email-title { font-size: 32px !important; }
			.email-icon-cell { width: 64px !important; }
			.email-icon { width: 56px !important; height: 56px !important; }
			.email-footer-brand, .email-footer-links { display: block !important; width: 100% !important; text-align: left !important; }
			.email-footer-links { padding-top: 22px !important; }
			.email-footer-link { display: inline-block !important; margin: 0 14px 12px 0 !important; }
		}
	</style>
</head>
<body style="margin:0;padding:0;background:${BRAND_WHITE};color:${BRAND_BLACK};font-family:Arial,Helvetica,sans-serif;">
	<div style="display:none;max-height:0;overflow:hidden;opacity:0;">HyperQuote replied to ${reference}.</div>
	<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;background:${BRAND_WHITE};margin:0;padding:0;">
		<tr>
			<td align="center" style="padding:44px 18px 0;">
				<table role="presentation" class="email-shell" width="100%" cellspacing="0" cellpadding="0" style="width:100%;max-width:860px;margin:0 auto;background:${BRAND_WHITE};">
					<tr>
						<td class="email-pad" style="padding:0 34px 30px;">
							<table role="presentation" width="100%" cellspacing="0" cellpadding="0">
								<tr>
									<td style="vertical-align:top;padding:0 24px 0 0;">
										<p style="margin:0 0 14px;font-size:13px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:${BRAND_BLUE};">Customer service</p>
										<h1 class="email-title" style="margin:0;font-size:44px;line-height:1.04;font-weight:800;letter-spacing:0;color:${BRAND_BLACK};">Hi ${customerName}, your HyperQuote update is ready.</h1>
									</td>
									<td class="email-icon-cell" align="right" style="width:92px;vertical-align:top;">
										${renderEmailIcon(MATERIAL_EMAIL_ICON_PATH)}
									</td>
								</tr>
							</table>
						</td>
					</tr>
					<tr>
						<td class="email-pad" style="padding:0 34px 46px;">
							<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid #E5E7EB;border-bottom:1px solid #E5E7EB;">
								<tr>
									<td align="center" style="padding:46px 0;">
										<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;max-width:680px;margin:0 auto;">
											<tr>
												<td style="font-size:18px;line-height:1.76;color:#2A2A2A;text-align:left;">
													<p style="margin:0 0 20px;font-size:18px;line-height:1.76;color:#2A2A2A;">Our team reviewed your request and replied below. Keep this email for the reference number, or open the portal for the latest quote and order status.</p>
													<div style="margin:0 0 28px;border-left:4px solid ${BRAND_BLUE};padding:0 0 0 18px;">
														<p style="margin:0 0 8px;font-size:13px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;color:${BRAND_BLUE};">${reference}</p>
														<p style="margin:0;font-size:22px;line-height:1.35;font-weight:800;color:${BRAND_BLACK};">${subject}</p>
													</div>
													<div style="font-size:18px;line-height:1.76;color:#2A2A2A;">${messageHtml}</div>
													<div style="margin:34px 0 12px;text-align:center;">
														<a href="${portalUrl}" style="display:inline-block;margin:0 6px 12px;padding:15px 22px;border:1px solid ${BRAND_BLUE};border-radius:999px;background:${BRAND_BLUE};color:${BRAND_WHITE};font-size:15px;font-weight:800;line-height:1;text-decoration:none;">Open portal</a>
														<a href="${supportUrl}" style="display:inline-block;margin:0 6px 12px;padding:15px 22px;border:1px solid #D9DDE5;border-radius:999px;background:${BRAND_WHITE};color:${BRAND_BLACK};font-size:15px;font-weight:800;line-height:1;text-decoration:none;">Contact support</a>
													</div>
													<p style="margin:24px 0 0;font-size:13px;line-height:1.7;color:#666666;">Reply to this email to keep the same support thread. HyperQuote will never ask for your password or one-time verification code by email.</p>
												</td>
											</tr>
										</table>
									</td>
								</tr>
							</table>
						</td>
					</tr>
					${renderEmailFooter({
						officeAddress,
						officeMapUrl,
						portalUrl,
						supportPhoneUrl,
						supportUrl,
						supportWhatsappUrl,
						websiteUrl,
					})}
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
		`Call: ${input.supportPhoneUrl ?? input.supportUrl ?? DEFAULT_SUPPORT_URL}`,
		`WhatsApp: ${input.supportWhatsappUrl ?? input.supportUrl ?? DEFAULT_SUPPORT_URL}`,
		`Office: ${input.officeMapUrl ?? DEFAULT_OFFICE_MAP_URL}`,
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
	const supportPhone =
		(await readRuntimeEnv('SUPPORT_PHONE_E164')) ??
		(await readRuntimeEnv('VITE_SUPPORT_PHONE_E164'))
	const supportWhatsapp =
		(await readRuntimeEnv('SUPPORT_WHATSAPP_E164')) ??
		(await readRuntimeEnv('VITE_SUPPORT_WHATSAPP_E164'))
	return {
		body: envelope.body,
		customerName:
			envelope.ticket.requester_name || envelope.ticket.requester_email,
		officeAddress: await readRuntimeEnv('OFFICE_ADDRESS'),
		officeMapUrl: await readRuntimeEnv('OFFICE_MAP_URL'),
		portalUrl: await readRuntimeEnv('PORTAL_URL'),
		reference: envelope.ticket.reference,
		subject: envelope.subject,
		supportPhoneUrl: supportContactHref('phone', supportPhone),
		supportUrl: await readRuntimeEnv('SUPPORT_URL'),
		supportWhatsappUrl: supportContactHref('whatsapp', supportWhatsapp),
		websiteUrl: await readRuntimeEnv('WEBSITE_URL'),
	}
}

function parseEmailField(value: string, field: 'bcc' | 'cc' | 'to'): string[] {
	if (!value) return []
	const tokens = emailFieldTokens(value)
	const invalid = tokens.filter(
		(token) => !EMAIL_PATTERN.test(emailAddressFromToken(token)),
	)
	if (invalid.length > 0) {
		throw new Error(`support_email_invalid_${field}`)
	}
	return parseEmailList(value)
}

function emailFieldTokens(value: string): string[] {
	return value
		.split(/[;,]/)
		.map((token) => token.trim())
		.filter(Boolean)
}

function validEmailOrThrow(value: string, field: 'bcc' | 'cc' | 'to'): string {
	const email = emailAddressFromToken(value).toLowerCase()
	if (!EMAIL_PATTERN.test(email)) {
		throw new Error(`support_email_invalid_${field}`)
	}
	return email
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

function renderEmailIcon(path: string): string {
	return `<svg class="email-icon" xmlns="http://www.w3.org/2000/svg" width="76" height="76" viewBox="0 0 24 24" aria-hidden="true" style="display:block;">
	<circle cx="12" cy="12" r="12" fill="#EFF6FF"/>
	<path fill="${BRAND_BLUE}" d="${path}"/>
</svg>`
}

function renderEmailFooter(input: {
	officeAddress: string
	officeMapUrl: string
	portalUrl: string
	supportPhoneUrl: string
	supportUrl: string
	supportWhatsappUrl: string
	websiteUrl: string
}): string {
	return `<tr>
	<td style="background:${BRAND_BLACK};padding:0;">
		<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${BRAND_BLACK};">
			<tr>
				<td class="email-pad" style="padding:30px 34px;">
					<table role="presentation" width="100%" cellspacing="0" cellpadding="0">
						<tr>
							<td class="email-footer-brand" style="vertical-align:middle;">
								<a href="${input.websiteUrl}" style="display:inline-block;color:${BRAND_WHITE};text-decoration:none;">
									<img src="${DEFAULT_LOGO_URL}" width="34" height="34" alt="HyperQuote logo" style="display:inline-block;width:34px;height:34px;border:0;vertical-align:middle;">
									<span style="display:inline-block;margin-left:12px;font-size:21px;line-height:1;font-weight:800;color:${BRAND_WHITE};vertical-align:middle;">HyperQuote</span>
								</a>
							</td>
							<td class="email-footer-links" align="right" style="vertical-align:middle;text-align:right;">
								${footerLink('Support', input.supportUrl)}
								${footerLink('Call', input.supportPhoneUrl)}
								${footerLink('WhatsApp', input.supportWhatsappUrl)}
								${footerLink('Our Office', input.officeMapUrl)}
								${footerLink('Portal App', input.portalUrl)}
							</td>
						</tr>
						<tr>
							<td colspan="2" style="padding-top:18px;font-size:12px;line-height:1.7;color:#BDBDBD;">
								${input.officeAddress}
							</td>
						</tr>
					</table>
				</td>
			</tr>
		</table>
	</td>
</tr>`
}

function footerLink(label: string, href: string): string {
	return `<a class="email-footer-link" href="${href}" style="margin-left:18px;color:${BRAND_WHITE};font-size:13px;font-weight:700;text-decoration:none;white-space:nowrap;">${label}</a>`
}

function supportContactHref(
	kind: 'phone' | 'whatsapp',
	e164: string | undefined,
): string | undefined {
	if (!e164) return undefined
	const trimmed = e164.trim()
	if (!trimmed) return undefined
	if (kind === 'phone') return `tel:${trimmed}`
	const digits = trimmed.replace(/\D/g, '')
	return digits ? `https://wa.me/${digits}` : undefined
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
	const installedValue = await runtimeStringEnvValue(
		getInstalledRuntimeEnv(),
		name,
	)
	if (installedValue?.trim()) return installedValue.trim()
	return undefined
}

function safeTagValue(value: string): string {
	return value.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 256)
}

function stringFromUnknown(value: unknown): string {
	return typeof value === 'string' ? value : ''
}

function providerErrorMessage(error: unknown): string {
	const message = error instanceof Error ? error.message : String(error)
	return message.slice(0, MAX_PROVIDER_ERROR_LENGTH)
}
