import { type GetReceivingEmailResponseSuccess, Resend } from 'resend'
import type { JsonObject } from '../db/types'
import { getInternalSupabaseAdminClient } from './_supabase'
import { DEFAULT_SUPPORT_REPLY_TO, readRuntimeEnv } from './support-email'

export interface NormalizedInboundSupportEmail {
	body: string
	ccEmails: string[]
	fromEmail: string
	fromName: string | null
	headers: Record<string, string>
	inReplyTo: string | null
	messageId: string | null
	providerEmailId: string
	receivedAt: string
	references: string[]
	subject: string
	toEmails: string[]
}

interface WebhookHeaders {
	id: string
	signature: string
	timestamp: string
}

const MAX_INBOUND_BODY_LENGTH = 12_000

export async function handleResendInboundEmailWebhook(
	request: Request,
): Promise<Response> {
	const body = await request.text()
	const apiKey = await readRuntimeEnv('RESEND_API_KEY')
	const webhookSecret = await readRuntimeEnv('RESEND_WEBHOOK_SECRET')
	if (!apiKey || !webhookSecret) {
		return jsonResponse({ error: 'support_email_inbound_not_configured' }, 503)
	}

	const svixHeaders = svixHeadersFromRequest(request)
	if (!svixHeaders) {
		return jsonResponse({ error: 'resend_webhook_headers_required' }, 400)
	}

	const resend = new Resend(apiKey)
	let event: ReturnType<typeof resend.webhooks.verify>
	try {
		event = resend.webhooks.verify({
			headers: svixHeaders,
			payload: body,
			webhookSecret,
		})
	} catch {
		return jsonResponse({ error: 'invalid_resend_webhook_signature' }, 401)
	}

	if (event.type !== 'email.received') {
		return jsonResponse({ ignored: true, ok: true })
	}

	const emailResponse = await resend.emails.receiving.get(event.data.email_id)
	if (emailResponse.error || !emailResponse.data) {
		return jsonResponse(
			{
				error: 'resend_received_email_fetch_failed',
				message: emailResponse.error?.message ?? 'missing_email_content',
			},
			502,
		)
	}

	const email = normalizeResendReceivedEmail(emailResponse.data)
	const supportEmail =
		(await readRuntimeEnv('SUPPORT_INBOUND_EMAIL')) ?? DEFAULT_SUPPORT_REPLY_TO
	if (!isAddressedToSupport(email, supportEmail)) {
		return jsonResponse(
			{ ignored: true, ok: true, reason: 'recipient_not_supported' },
			202,
		)
	}

	const client = await getInternalSupabaseAdminClient()
	const { data, error } = await client.rpc(
		'service_ingest_support_email_message',
		{
			p_body: email.body,
			p_cc_emails: email.ccEmails,
			p_from_email: email.fromEmail,
			p_from_name: email.fromName ?? undefined,
			p_headers: email.headers satisfies JsonObject,
			p_in_reply_to: email.inReplyTo ?? undefined,
			p_internet_message_id: email.messageId ?? undefined,
			p_provider: 'resend',
			p_provider_email_id: email.providerEmailId,
			p_received_at: email.receivedAt,
			p_references: email.references,
			p_subject: email.subject,
			p_to_emails: email.toEmails,
		},
	)
	if (error) {
		return jsonResponse(
			{ error: 'support_email_ingest_failed', message: error.message },
			500,
		)
	}

	const row = Array.isArray(data) ? data[0] : null
	return jsonResponse({
		createdTicket: row?.created_ticket ?? false,
		duplicate: row?.duplicate ?? false,
		messageId: row?.message_id ?? null,
		ok: true,
		ticketId: row?.ticket_id ?? null,
		ticketReference: row?.ticket_reference ?? null,
	})
}

export function normalizeResendReceivedEmail(
	email: GetReceivingEmailResponseSuccess,
): NormalizedInboundSupportEmail {
	const headers = normalizeHeaders(email.headers)
	const parsedFrom = parseEmailAddress(email.from)
	const inReplyTo = firstMessageId(headerValue(headers, 'in-reply-to'))
	const references = parseMessageIdList(headerValue(headers, 'references'))
	const messageId =
		normalizeMessageId(email.message_id) ??
		firstMessageId(headerValue(headers, 'message-id'))
	const body = inboundBody(email.text, email.html)

	return {
		body,
		ccEmails: normalizeEmailList(email.cc),
		fromEmail: parsedFrom.email,
		fromName: parsedFrom.name,
		headers,
		inReplyTo,
		messageId,
		providerEmailId: email.id,
		receivedAt: email.created_at,
		references,
		subject: email.subject.trim() || '(no subject)',
		toEmails: normalizeEmailList(email.to),
	}
}

export function isAddressedToSupport(
	email: Pick<NormalizedInboundSupportEmail, 'ccEmails' | 'toEmails'>,
	supportEmail: string,
): boolean {
	const normalizedSupport = normalizeEmail(supportEmail)
	if (!normalizedSupport) return false
	return [...email.toEmails, ...email.ccEmails].some(
		(address) => address === normalizedSupport,
	)
}

function svixHeadersFromRequest(request: Request): WebhookHeaders | null {
	const id = request.headers.get('svix-id')?.trim()
	const timestamp = request.headers.get('svix-timestamp')?.trim()
	const signature = request.headers.get('svix-signature')?.trim()
	if (!id || !timestamp || !signature) return null
	return { id, signature, timestamp }
}

function normalizeHeaders(
	headers: Record<string, string> | null,
): Record<string, string> {
	if (!headers) return {}
	const normalized: Record<string, string> = {}
	for (const [key, value] of Object.entries(headers)) {
		const headerName = key.trim()
		if (!headerName || typeof value !== 'string') continue
		normalized[headerName] = value.trim()
	}
	return normalized
}

function headerValue(
	headers: Record<string, string>,
	name: string,
): string | null {
	const normalizedName = name.toLowerCase()
	for (const [key, value] of Object.entries(headers)) {
		if (key.toLowerCase() === normalizedName) return value
	}
	return null
}

function normalizeEmailList(values: string[] | null | undefined): string[] {
	const seen = new Set<string>()
	const emails: string[] = []
	for (const value of values ?? []) {
		const parsed = parseEmailAddress(value)
		if (!parsed.email || seen.has(parsed.email)) continue
		seen.add(parsed.email)
		emails.push(parsed.email)
	}
	return emails
}

function parseEmailAddress(value: string): {
	email: string
	name: string | null
} {
	const trimmed = value.trim()
	const bracketMatch = /^(?:"?([^"<]*)"?\s*)?<([^>]+)>$/.exec(trimmed)
	const rawName = bracketMatch?.[1]?.trim()
	const email = normalizeEmail(bracketMatch?.[2] ?? trimmed)
	return {
		email: email ?? '',
		name: rawName || null,
	}
}

function normalizeEmail(value: string): string | null {
	const email = value.trim().toLowerCase()
	if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)) return null
	return email
}

function inboundBody(text: string | null, html: string | null): string {
	const source = text?.trim() || htmlToText(html ?? '').trim()
	const body = source || '(empty email)'
	if (body.length <= MAX_INBOUND_BODY_LENGTH) return body
	return `${body.slice(0, MAX_INBOUND_BODY_LENGTH).trim()}\n\n[Message truncated]`
}

function htmlToText(html: string): string {
	return html
		.replace(/<style[\s\S]*?<\/style>/gi, ' ')
		.replace(/<script[\s\S]*?<\/script>/gi, ' ')
		.replace(/<br\s*\/?>/gi, '\n')
		.replace(/<\/p>/gi, '\n\n')
		.replace(/<[^>]+>/g, ' ')
		.replace(/&nbsp;/gi, ' ')
		.replace(/&amp;/gi, '&')
		.replace(/&lt;/gi, '<')
		.replace(/&gt;/gi, '>')
		.replace(/&quot;/gi, '"')
		.replace(/&#39;/g, "'")
		.replace(/[ \t]+/g, ' ')
		.replace(/\n{3,}/g, '\n\n')
}

function parseMessageIdList(value: string | null): string[] {
	if (!value) return []
	const ids: string[] = []
	const seen = new Set<string>()
	for (const match of value.matchAll(/<[^>]+>|[^\s]+/g)) {
		const id = normalizeMessageId(match[0])
		if (!id || seen.has(id)) continue
		seen.add(id)
		ids.push(id)
	}
	return ids
}

function firstMessageId(value: string | null): string | null {
	return parseMessageIdList(value)[0] ?? null
}

function normalizeMessageId(value: string | null | undefined): string | null {
	const trimmed = value?.trim()
	return trimmed ? trimmed : null
}

function jsonResponse(payload: JsonObject, status = 200): Response {
	return new Response(JSON.stringify(payload), {
		headers: { 'Content-Type': 'application/json' },
		status,
	})
}
