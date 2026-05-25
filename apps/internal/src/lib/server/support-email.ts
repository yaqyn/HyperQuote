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
	headers: Record<string, string>
	replyTo: string
	subject: string
	ticket: SupportEmailTicket
	to: string[]
}

export interface SupportEmailThreadHeaders {
	inReplyTo: string | null
	references: string[]
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
const EMAIL_ASSET_URL = 'https://pub-cbfbae308dae4797b95916396d2ff713.r2.dev'
const DEFAULT_SUPPORT_FROM = 'HyperQuote <support@info.moderngroupco.com>'
export const DEFAULT_SUPPORT_REPLY_TO = 'support@hyperquote.net'
const DEFAULT_WEBSITE_URL = 'https://hyperquote.net'
const DEFAULT_PORTAL_URL = 'https://portal.hyperquote.net'
const DEFAULT_SUPPORT_URL = 'https://hyperquote.net/support#contact'
const DEFAULT_OFFICE_ADDRESS = 'Arkan Plaza, Sheikh Zayed, Egypt'
const DEFAULT_OFFICE_MAP_URL =
	'https://maps.google.com/?q=Arkan+Plaza+Sheikh+Zayed+Egypt'
const BRAND_BLUE = '#2563EB'
const BRAND_BLACK = '#090909'
const BRAND_WHITE = '#FFFFFF'
const BRAND_MUTED = '#5F6B7A'
const BRAND_LINE = '#E7EBF0'
const EMAIL_PATTERN = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/
const MAX_PROVIDER_ERROR_LENGTH = 500
const MAX_SUPPORT_EMAIL_BODY_LENGTH = 4000
const MAX_SUPPORT_EMAIL_SUBJECT_LENGTH = 180
const EMAIL_IMAGE_URLS = {
	logo: emailAssetUrl('logos/lyon-black-v2.png'),
	supportEmailIcon: emailAssetUrl('email/auth-icons/phone.png'),
	footerIcons: {
		call: emailAssetUrl('email/footer-icons/call.png'),
		email: emailAssetUrl('email/footer-icons/email.png'),
		portal: emailAssetUrl('email/footer-icons/portal.png'),
		whatsapp: emailAssetUrl('email/footer-icons/whatsapp.png'),
	},
} as const
const LOCAL_ONLY_DOMAINS = new Set([
	'example.com',
	'example.net',
	'example.org',
	'hyperquote.local',
])

export async function buildSupportEmailEnvelope(input: {
	body: string
	metadata?: JsonObject
	thread?: SupportEmailThreadHeaders | null
	ticket: SupportEmailTicket
}): Promise<SupportEmailEnvelope> {
	const metadata = input.metadata ?? {}
	const rawTo = metadataString(metadata, 'to')
	const to = parseEmailField(rawTo, 'to')
	if (to.length === 0) {
		to.push(validEmailOrThrow(input.ticket.requester_email, 'to'))
	}

	const subject = supportReplySubject(
		input.ticket,
		metadataString(metadata, 'subject'),
	)
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
		(await readRuntimeEnv('SUPPORT_INBOUND_EMAIL')) ??
		(await readRuntimeEnv('SUPPORT_REPLY_TO')) ??
		DEFAULT_SUPPORT_REPLY_TO

	const envelope: SupportEmailEnvelope = {
		bcc: parseEmailField(metadataString(metadata, 'bcc'), 'bcc'),
		body,
		cc: parseEmailField(metadataString(metadata, 'cc'), 'cc'),
		from,
		headers: supportThreadHeaders(input.thread),
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
			headers:
				Object.keys(envelope.headers).length > 0 ? envelope.headers : undefined,
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

export function supportReplySubject(
	ticket: SupportEmailTicket,
	candidateSubject?: string | null,
): string {
	const base = supportSubjectBase(candidateSubject || ticket.subject)
	const availableBaseLength = MAX_SUPPORT_EMAIL_SUBJECT_LENGTH - 'Re: '.length
	const trimmedBase =
		base.length > availableBaseLength
			? base.slice(0, Math.max(1, availableBaseLength)).trim()
			: base
	return `Re: ${trimmedBase || 'your HyperQuote support request'}`
}

export function normalizeSupportEmailSubjectForThread(subject: string): string {
	return (
		supportSubjectBase(subject).toLowerCase().replace(/\s+/g, ' ').trim() ||
		'(no subject)'
	)
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
		* { box-sizing: border-box; }
		body {
			margin: 0;
			background: ${BRAND_WHITE};
			color: ${BRAND_BLACK};
			font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
		}
		a { color: inherit; }
		.email {
			width: min(100%, 960px);
			margin: 0 auto;
			background: ${BRAND_WHITE};
		}
		.preheader {
			display: none;
			max-height: 0;
			overflow: hidden;
			opacity: 0;
		}
		.top {
			display: grid;
			grid-template-columns: minmax(0, 1fr) 92px;
			gap: 28px;
			align-items: center;
			padding: 56px 56px 36px;
			border-bottom: 1px solid ${BRAND_LINE};
		}
		.eyebrow {
			margin: 0 0 12px;
			color: ${BRAND_BLUE};
			font-size: 12px;
			font-weight: 800;
			letter-spacing: 0.14em;
			text-transform: uppercase;
		}
		h1 {
			margin: 0;
			color: ${BRAND_BLACK};
			font-size: 36px;
			line-height: 1.12;
			font-weight: 800;
			letter-spacing: 0;
		}
		.icon-frame {
			display: grid;
			width: 92px;
			height: 92px;
			place-items: center;
		}
		.icon-frame img {
			display: block;
			width: 92px;
			height: 92px;
			border: 0;
			outline: none;
			text-decoration: none;
		}
		.main { padding: 44px 56px 88px; }
		.message {
			max-width: 720px;
			margin: 0 auto;
		}
		.lead {
			margin: 0;
			color: ${BRAND_BLACK};
			font-size: 18px;
			line-height: 1.65;
			font-weight: 650;
		}
		.copy {
			margin: 12px 0 0;
			color: #343a46;
			font-size: 16px;
			line-height: 1.65;
		}
		.reply-body {
			margin: 34px 0 0;
			color: #343a46;
			font-size: 16px;
			line-height: 1.72;
		}
		.safe-note {
			max-width: 680px;
			margin: 0 auto;
			color: ${BRAND_MUTED};
			font-size: 13px;
			line-height: 1.6;
			text-align: center;
		}
		.footer-note { padding: 0 56px 34px; }
		.footer {
			display: grid;
			grid-template-columns: minmax(280px, 1fr) minmax(320px, 360px);
			gap: 36px;
			align-items: center;
			padding: 38px 56px 44px;
			border-top: 1px solid ${BRAND_LINE};
			background: ${BRAND_WHITE};
			color: ${BRAND_BLACK};
		}
		.footer-left {
			display: flex;
			gap: 20px;
			align-items: center;
			min-width: 0;
		}
		.brand-mark {
			flex: 0 0 auto;
			display: inline-flex;
			color: ${BRAND_WHITE};
			text-decoration: none;
		}
		.brand-mark img {
			display: block;
			width: 86px;
			height: 86px;
			border: 0;
			outline: none;
			text-decoration: none;
		}
		.brand-copy { min-width: 0; }
		.brand-name {
			display: block;
			color: ${BRAND_BLACK};
			font-size: 24px;
			font-weight: 850;
			line-height: 1.15;
			text-decoration: none;
		}
		.brand-address {
			display: block;
			margin-top: 7px;
			color: ${BRAND_MUTED};
			font-size: 13px;
			line-height: 1.45;
			text-decoration: none;
		}
		.footer-links {
			display: grid;
			grid-template-columns: repeat(2, minmax(0, 1fr));
			gap: 12px;
		}
		.footer-links a {
			display: inline-flex;
			gap: 9px;
			align-items: center;
			justify-content: flex-start;
			min-height: 44px;
			padding: 10px 12px;
			border: 1px solid ${BRAND_LINE};
			border-radius: 14px;
			color: ${BRAND_BLACK};
			font-size: 13px;
			font-weight: 750;
			text-decoration: none;
		}
		.footer-links img {
			flex: 0 0 auto;
			display: block;
			width: 21px;
			height: 21px;
			border: 0;
			outline: none;
			text-decoration: none;
		}
		.footer-icon-slot {
			display: inline-flex;
			flex: 0 0 21px;
			align-items: center;
			justify-content: center;
			width: 21px;
			height: 21px;
		}
		@media (max-width: 760px) {
			.top {
				grid-template-columns: 1fr;
				justify-items: center;
				padding: 34px 24px 28px;
				text-align: center;
			}
			.icon-frame {
				width: 76px;
				height: 76px;
			}
			.icon-frame img {
				width: 76px;
				height: 76px;
			}
			h1 { font-size: 30px; }
			.copy, .reply-body { font-size: 16px; }
			.main { padding: 34px 24px 72px; }
			.message { text-align: center; }
			.footer-note { padding: 0 24px 30px; }
			.footer {
				grid-template-columns: 1fr;
				gap: 28px;
				padding: 30px 24px;
				justify-items: center;
			}
			.footer-links {
				grid-template-columns: repeat(2, minmax(0, 1fr));
				width: 100%;
				max-width: 360px;
				justify-self: center;
				margin: 0 auto;
			}
			.footer-left {
				justify-content: center;
				text-align: center;
			}
		}
	</style>
</head>
<body>
	<div class="preheader">A note from HyperQuote Support is below.</div>
	<article class="email" aria-label="HyperQuote customer service email">
		<header class="top">
			<div>
				<p class="eyebrow">Customer service</p>
				<h1>We replied to your message.</h1>
			</div>
			<div class="icon-frame" aria-hidden="true">
				${renderEmailIcon(EMAIL_IMAGE_URLS.supportEmailIcon)}
			</div>
		</header>

		<main class="main">
			<section class="message">
				<p class="lead">Hi ${customerName},</p>
				<p class="copy">Thanks for reaching out to HyperQuote. Our support team reviewed your message and replied below.</p>
				<div class="reply-body">${messageHtml}</div>
			</section>
		</main>

		${renderEmailFooter({
			officeAddress,
			officeMapUrl,
			portalUrl,
			supportPhoneUrl,
			supportUrl,
			supportWhatsappUrl,
			websiteUrl,
		})}
		<div class="footer-note">
			<p class="safe-note">Reply to this email to keep the same support thread. HyperQuote will never ask for your password or one-time verification code by email.</p>
		</div>
	</article>
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
		'Thanks for reaching out to HyperQuote. Our support team reviewed your message and replied below.',
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
		headers: envelope.headers,
		in_reply_to: envelope.headers['In-Reply-To'] ?? null,
		provider_error: delivery.providerError,
		provider_status: delivery.providerStatus,
		references: envelope.headers.References ?? null,
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

function emailAddressFromToken(token: string): string {
	const trimmed = token.trim()
	const bracketMatch = /<([^>]+)>/.exec(trimmed)
	return (bracketMatch?.[1] ?? trimmed).trim()
}

function supportThreadHeaders(
	thread: SupportEmailThreadHeaders | null | undefined,
): Record<string, string> {
	if (!thread?.inReplyTo) return {}
	const inReplyTo = thread.inReplyTo.trim()
	if (!inReplyTo) return {}
	const references = uniqueMessageIds([...(thread.references ?? []), inReplyTo])
	return {
		'In-Reply-To': inReplyTo,
		References: references.join(' '),
	}
}

function uniqueMessageIds(values: string[]): string[] {
	const seen = new Set<string>()
	const ids: string[] = []
	for (const value of values) {
		const id = value.trim()
		if (!id || seen.has(id)) continue
		seen.add(id)
		ids.push(id)
	}
	return ids
}

function supportSubjectBase(subject: string): string {
	const withoutReference = subject
		.replace(/\[\s*TK-[0-9]{4}-[a-z0-9]{6}\s*\]/gi, '')
		.replace(/\bTK-[0-9]{4}-[a-z0-9]{6}\b/gi, '')
	const withoutReplyPrefix = withoutReference.replace(
		/^((re|fw|fwd)\s*:\s*)+/i,
		'',
	)
	return withoutReplyPrefix.replace(/\s+/g, ' ').trim() || 'Support request'
}

function isLocalOnlyEmail(email: string): boolean {
	const domain = email.split('@')[1]?.toLowerCase() ?? ''
	return (
		LOCAL_ONLY_DOMAINS.has(domain) ||
		domain.endsWith('.local') ||
		domain.endsWith('.test')
	)
}

function renderEmailIcon(src: string): string {
	return `<img src="${src}" width="92" height="92" alt="">`
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
	return `<footer class="footer">
	<div class="footer-left">
		<a class="brand-mark" href="${input.websiteUrl}" aria-label="Open HyperQuote website">
			<img src="${EMAIL_IMAGE_URLS.logo}" width="86" height="86" alt="">
		</a>
		<div class="brand-copy">
			<a class="brand-name" href="${input.websiteUrl}">HyperQuote</a>
			<a class="brand-address" href="${input.officeMapUrl}">${input.officeAddress}</a>
		</div>
	</div>
	<nav class="footer-links" aria-label="Important links">
		${footerLink('Support', input.supportUrl, 'email')}
		${footerLink('Call', input.supportPhoneUrl, 'call')}
		${footerLink('WhatsApp', input.supportWhatsappUrl, 'whatsapp')}
		${footerLink('Portal', input.portalUrl, 'portal')}
	</nav>
</footer>`
}

function footerLink(
	label: string,
	href: string,
	icon: keyof typeof EMAIL_IMAGE_URLS.footerIcons,
): string {
	return `<a href="${href}">
		<span class="footer-icon-slot">${renderFooterIcon(icon)}</span>
		<span>${label}</span>
	</a>
`
}

function renderFooterIcon(
	icon: keyof typeof EMAIL_IMAGE_URLS.footerIcons,
): string {
	return `<img src="${EMAIL_IMAGE_URLS.footerIcons[icon]}" width="21" height="21" alt="">`
}

function emailAssetUrl(fileName: string): string {
	return `${EMAIL_ASSET_URL}/${fileName}`
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

export async function readRuntimeEnv(
	name: string,
): Promise<string | undefined> {
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
