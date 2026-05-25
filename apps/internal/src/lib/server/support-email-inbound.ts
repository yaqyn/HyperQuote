import { decodeBase64Payload, sanitizeFileName } from '@hyperquote/runtime/file'
import PostalMime, { type Address, type Email } from 'postal-mime'
import {
	type GetReceivingEmailResponseSuccess,
	type InboundAttachment,
	Resend,
} from 'resend'
import type { JsonObject } from '../db/types'
import { getInternalSupabaseAdminClient } from './_supabase'
import { DEFAULT_SUPPORT_REPLY_TO, readRuntimeEnv } from './support-email'

export interface NormalizedInboundSupportAttachment {
	content?: ArrayBuffer | Uint8Array | string
	contentEncoding?: 'arraybuffer' | 'base64' | 'utf8'
	contentType: string
	fileName: string
	providerAttachmentId: string | null
	sizeBytes: number
}

export interface NormalizedInboundSupportEmail {
	attachments: NormalizedInboundSupportAttachment[]
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

type InternalAdminClient = Awaited<
	ReturnType<typeof getInternalSupabaseAdminClient>
>

export interface CloudflareInboundEmailMessage {
	from: string
	headers: Headers
	raw: ReadableStream
	rawSize: number
	setReject(reason: string): void
	to: string
}

const MAX_INBOUND_BODY_LENGTH = 12_000
const SUPPORT_ATTACHMENTS_BUCKET = 'support-attachments'
const PASTED_CONTENT_LINE_PATTERN =
	/^\[Pasted Content [0-9][0-9,]*(?: chars?| characters?)\]$/i

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

	try {
		return jsonResponse(
			await ingestNormalizedSupportEmail(email, 'resend', { resend }),
		)
	} catch (error) {
		return jsonResponse(
			{
				error: 'support_email_ingest_failed',
				message: error instanceof Error ? error.message : String(error),
			},
			500,
		)
	}
}

export async function handleCloudflareInboundEmail(
	message: CloudflareInboundEmailMessage,
): Promise<void> {
	const email = await normalizeCloudflareInboundEmail(message)
	const supportEmail =
		(await readRuntimeEnv('SUPPORT_INBOUND_EMAIL')) ?? DEFAULT_SUPPORT_REPLY_TO
	if (!isAddressedToSupport(email, supportEmail)) {
		message.setReject('recipient_not_supported')
		return
	}
	await ingestNormalizedSupportEmail(email, 'cloudflare_email_routing')
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
		attachments: normalizeResendAttachments(email.attachments),
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

export async function normalizeCloudflareInboundEmail(
	message: CloudflareInboundEmailMessage,
): Promise<NormalizedInboundSupportEmail> {
	const rawEmail = await new Response(message.raw).arrayBuffer()
	const parsed = await PostalMime.parse(rawEmail)
	const headers = normalizePostalHeaders(parsed.headers, message.headers)
	const parsedFrom =
		parsedEmailAddress(parsed.from) ?? parseEmailAddress(message.from)
	const inReplyTo = firstMessageId(
		parsed.inReplyTo ?? headerValue(headers, 'in-reply-to'),
	)
	const references = parseMessageIdList(
		parsed.references ?? headerValue(headers, 'references'),
	)
	const messageId =
		normalizeMessageId(parsed.messageId) ??
		firstMessageId(headerValue(headers, 'message-id'))
	const providerEmailId = `cloudflare:${messageId ?? (await sha256Hex(rawEmail))}`
	const toEmails = normalizePostalEmailList(parsed.to)
	const envelopeTo = normalizeEmail(message.to)
	if (toEmails.length === 0 && envelopeTo) toEmails.push(envelopeTo)

	return {
		attachments: normalizePostalAttachments(parsed.attachments),
		body: inboundBody(parsed.text ?? null, parsed.html ?? null),
		ccEmails: normalizePostalEmailList(parsed.cc),
		fromEmail: parsedFrom.email,
		fromName: parsedFrom.name,
		headers,
		inReplyTo,
		messageId,
		providerEmailId,
		receivedAt: receivedAtFromHeader(parsed.date),
		references,
		subject: parsed.subject?.trim() || '(no subject)',
		toEmails,
	}
}

async function ingestNormalizedSupportEmail(
	email: NormalizedInboundSupportEmail,
	provider: string,
	options: { resend?: Resend } = {},
): Promise<JsonObject> {
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
			p_provider: provider,
			p_provider_email_id: email.providerEmailId,
			p_received_at: email.receivedAt,
			p_references: email.references,
			p_subject: email.subject,
			p_to_emails: email.toEmails,
		},
	)
	if (error) throw new Error(error.message)

	const row = Array.isArray(data) ? data[0] : null
	const result = {
		createdTicket: row?.created_ticket ?? false,
		duplicate: row?.duplicate ?? false,
		messageId: row?.message_id ?? null,
		ok: true,
		ticketId: row?.ticket_id ?? null,
		ticketReference: row?.ticket_reference ?? null,
	}
	if (typeof result.messageId === 'string') {
		await saveSupportEmailAttachments({
			attachments: email.attachments,
			client,
			messageId: result.messageId,
			providerEmailId: email.providerEmailId,
			resend: options.resend,
		})
	}
	return result
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

function normalizePostalHeaders(
	headers: Email['headers'],
	fallbackHeaders: Headers,
): Record<string, string> {
	const normalized: Record<string, string> = {}
	for (const header of headers) {
		const key = header.originalKey.trim() || header.key.trim()
		if (!key) continue
		normalized[key] = header.value.trim()
	}
	if (Object.keys(normalized).length > 0) return normalized

	fallbackHeaders.forEach((value, key) => {
		if (key.trim()) normalized[key] = value.trim()
	})
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

function normalizePostalEmailList(values: Address[] | undefined): string[] {
	const seen = new Set<string>()
	const emails: string[] = []
	for (const value of values ?? []) {
		for (const mailbox of mailboxAddresses(value)) {
			const email = normalizeEmail(mailbox.address)
			if (!email || seen.has(email)) continue
			seen.add(email)
			emails.push(email)
		}
	}
	return emails
}

function normalizeResendAttachments(
	attachments: InboundAttachment[],
): NormalizedInboundSupportAttachment[] {
	return attachments
		.filter(
			(attachment) =>
				Boolean(attachment.filename?.trim()) ||
				attachment.content_disposition === 'attachment',
		)
		.map((attachment, index) => ({
			contentType: attachment.content_type || 'application/octet-stream',
			fileName:
				attachment.filename?.trim() ||
				fallbackAttachmentFileName(index, attachment.content_type),
			providerAttachmentId: attachment.id,
			sizeBytes: attachment.size,
		}))
}

function normalizePostalAttachments(
	attachments: Email['attachments'],
): NormalizedInboundSupportAttachment[] {
	return attachments
		.filter(
			(attachment) =>
				!attachment.related &&
				(Boolean(attachment.filename?.trim()) ||
					attachment.disposition === 'attachment'),
		)
		.map((attachment, index) => ({
			content: attachment.content,
			contentEncoding: attachment.encoding ?? 'arraybuffer',
			contentType: attachment.mimeType || 'application/octet-stream',
			fileName:
				attachment.filename?.trim() ||
				fallbackAttachmentFileName(index, attachment.mimeType),
			providerAttachmentId: attachment.contentId ?? null,
			sizeBytes: attachmentContentSize(
				attachment.content,
				attachment.encoding ?? 'arraybuffer',
			),
		}))
}

async function saveSupportEmailAttachments(input: {
	attachments: NormalizedInboundSupportAttachment[]
	client: InternalAdminClient
	messageId: string
	providerEmailId: string
	resend?: Resend
}): Promise<void> {
	for (const [index, attachment] of input.attachments.entries()) {
		const storagePath = supportAttachmentStoragePath(
			input.messageId,
			index,
			attachment.fileName,
		)
		if (
			await supportAttachmentExists(input.client, input.messageId, storagePath)
		) {
			continue
		}
		const content = await attachmentUploadBody(attachment, {
			providerEmailId: input.providerEmailId,
			resend: input.resend,
		})
		if (!content) continue

		const { error: uploadError } = await input.client.storage
			.from(SUPPORT_ATTACHMENTS_BUCKET)
			.upload(storagePath, content, {
				contentType: attachment.contentType,
				upsert: true,
			})
		if (uploadError) {
			throw new Error(`support_attachment_upload_failed:${uploadError.message}`)
		}

		const { error: insertError } = await input.client
			.from('support_attachments')
			.insert({
				content_type: attachment.contentType,
				message_id: input.messageId,
				storage_path: storagePath,
			})
		if (insertError) {
			throw new Error(`support_attachment_record_failed:${insertError.message}`)
		}
	}
}

async function supportAttachmentExists(
	client: InternalAdminClient,
	messageId: string,
	storagePath: string,
): Promise<boolean> {
	const { data, error } = await client
		.from('support_attachments')
		.select('id')
		.eq('message_id', messageId)
		.eq('storage_path', storagePath)
		.maybeSingle()
	if (error) throw new Error(error.message)
	return Boolean(data)
}

async function attachmentUploadBody(
	attachment: NormalizedInboundSupportAttachment,
	options: { providerEmailId: string; resend?: Resend },
): Promise<ArrayBuffer | Uint8Array | null> {
	if (attachment.content !== undefined) {
		return contentUploadBody(attachment.content, attachment.contentEncoding)
	}
	if (!options.resend || !attachment.providerAttachmentId) return null

	const attachmentResponse =
		await options.resend.emails.receiving.attachments.get({
			emailId: options.providerEmailId,
			id: attachment.providerAttachmentId,
		})
	if (attachmentResponse.error || !attachmentResponse.data) {
		throw new Error(
			`support_attachment_fetch_failed:${attachmentResponse.error?.message ?? 'missing_attachment'}`,
		)
	}

	const downloadUrl = attachmentResponse.data.download_url
	const response = await fetch(downloadUrl)
	if (!response.ok) {
		throw new Error(`support_attachment_download_failed:${response.status}`)
	}
	return await response.arrayBuffer()
}

function contentUploadBody(
	content: ArrayBuffer | Uint8Array | string,
	encoding: NormalizedInboundSupportAttachment['contentEncoding'],
): ArrayBuffer | Uint8Array {
	if (content instanceof ArrayBuffer || content instanceof Uint8Array) {
		return content
	}
	if (encoding === 'base64') return decodeBase64Payload(content)
	return new TextEncoder().encode(content)
}

function supportAttachmentStoragePath(
	messageId: string,
	index: number,
	fileName: string,
): string {
	const safeName = sanitizeFileName(fileName, `attachment-${index + 1}`)
	return `${messageId}/${String(index + 1).padStart(2, '0')}-${safeName}`
}

function attachmentContentSize(
	content: ArrayBuffer | Uint8Array | string,
	encoding: NormalizedInboundSupportAttachment['contentEncoding'],
): number {
	if (content instanceof ArrayBuffer || content instanceof Uint8Array) {
		return content.byteLength
	}
	if (encoding === 'base64') return decodeBase64Payload(content).byteLength
	return new TextEncoder().encode(content).byteLength
}

function fallbackAttachmentFileName(
	index: number,
	contentType: string,
): string {
	const extensionByType: Record<string, string> = {
		'application/pdf': '.pdf',
		'image/jpeg': '.jpg',
		'image/png': '.png',
		'image/webp': '.webp',
	}
	return `attachment-${index + 1}${extensionByType[contentType] ?? ''}`
}

function parsedEmailAddress(
	value: Address | undefined,
): { email: string; name: string | null } | null {
	for (const mailbox of value ? mailboxAddresses(value) : []) {
		const email = normalizeEmail(mailbox.address)
		if (!email) continue
		return {
			email,
			name: mailbox.name.trim() || null,
		}
	}
	return null
}

function mailboxAddresses(
	value: Address,
): Array<{ address: string; name: string }> {
	if ('group' in value && Array.isArray(value.group)) {
		return value.group.map((mailbox) => ({
			address: mailbox.address,
			name: mailbox.name,
		}))
	}
	return value.address ? [{ address: value.address, name: value.name }] : []
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
	const source = text?.trim() || htmlToReplyText(html ?? '').trim()
	const cleanBody = cleanInboundReplyBody(source)
	const body = cleanBody || '(empty email)'
	if (body.length <= MAX_INBOUND_BODY_LENGTH) return body
	return `${body.slice(0, MAX_INBOUND_BODY_LENGTH).trim()}\n\n[Message truncated]`
}

function cleanInboundReplyBody(source: string): string {
	const lines = source
		.replace(/\r\n?/g, '\n')
		.replace(/\u00a0/g, ' ')
		.split('\n')
	const kept: string[] = []
	let hasContent = false

	for (const rawLine of lines) {
		const line = rawLine.trimEnd()
		const compact = line.trim()
		if (PASTED_CONTENT_LINE_PATTERN.test(compact)) continue
		if (isQuotedReplyStart(compact, hasContent)) break
		kept.push(line)
		if (compact) hasContent = true
	}

	return kept
		.join('\n')
		.replace(/[ \t]+\n/g, '\n')
		.replace(/\n{3,}/g, '\n\n')
		.trim()
}

function isQuotedReplyStart(line: string, hasContent: boolean): boolean {
	if (!line) return false
	return (
		line.startsWith('>') ||
		/^On .{1,240} wrote:$/i.test(line) ||
		/^.+\swrote:$/i.test(line) ||
		/^[-_]{2,}\s*Original Message\s*[-_]{2,}$/i.test(line) ||
		/^-{5,}\s*Forwarded message\s*-{5,}$/i.test(line) ||
		/^_{5,}$/.test(line) ||
		(hasContent && /^From:\s.+/i.test(line))
	)
}

function htmlToReplyText(html: string): string {
	return htmlToText(
		html
			.replace(
				/<div[^>]*class=["'][^"']*(?:gmail_quote|yahoo_quoted|protonmail_quote)[^"']*["'][\s\S]*?<\/div>/gi,
				' ',
			)
			.replace(/<blockquote[\s\S]*?<\/blockquote>/gi, ' '),
	)
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

function receivedAtFromHeader(value: string | undefined): string {
	if (value) {
		const parsed = new Date(value)
		if (!Number.isNaN(parsed.getTime())) return parsed.toISOString()
	}
	return new Date().toISOString()
}

async function sha256Hex(value: ArrayBuffer): Promise<string> {
	const digest = await crypto.subtle.digest('SHA-256', value)
	return Array.from(new Uint8Array(digest), (byte) =>
		byte.toString(16).padStart(2, '0'),
	).join('')
}

function jsonResponse(payload: JsonObject, status = 200): Response {
	return new Response(JSON.stringify(payload), {
		headers: { 'Content-Type': 'application/json' },
		status,
	})
}
