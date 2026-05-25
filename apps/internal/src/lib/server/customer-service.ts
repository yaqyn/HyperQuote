import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type {
	ChannelType,
	Conversation,
	Customer,
	InboxMetrics,
} from '../../types/customer-service'
import type { JsonObject, JsonValue } from '../db/types'
import { getInternalSupabaseClient } from './_supabase'
import {
	buildSupportEmailEnvelope,
	deliverSupportEmail,
	normalizeSupportEmailSubjectForThread,
	parseEmailList,
	type SupportEmailDeliveryResult,
	type SupportEmailEnvelope,
	type SupportEmailThreadHeaders,
	type SupportEmailTicket,
	supportEmailFailedDelivery,
	supportEmailMetadata,
} from './support-email'

type SupportEntityRef =
	| { kind: 'ticket'; id: string }
	| { kind: 'conversation'; id: string }
	| { kind: 'local'; id: string }

interface SupabaseSupportCustomerRow {
	id: string
	company_name: string
	contact_name: string
	phone: string
	email: string | null
	created_at: string
}

interface SupabaseAssignedEmployeeRow {
	id: string
	full_name: string
	user_id: string | null
}

interface SupabaseSupportTicketRow {
	id: string
	reference: string
	customer_id: string | null
	requester_name: string | null
	requester_email: string
	requester_phone: string | null
	subject: string
	status: 'open' | 'pending' | 'closed'
	source: string
	assigned_employee_id: string | null
	created_at: string
	updated_at: string
	customers: SupabaseSupportCustomerRow | SupabaseSupportCustomerRow[] | null
	employees: SupabaseAssignedEmployeeRow | SupabaseAssignedEmployeeRow[] | null
}

interface SupabaseSupportConversationRow {
	id: string
	customer_id: string | null
	channel: 'email' | 'whatsapp'
	external_thread_id: string | null
	phone: string | null
	email: string | null
	status: 'open' | 'closed'
	assigned_employee_id: string | null
	created_at: string
	updated_at: string
	customers: SupabaseSupportCustomerRow | SupabaseSupportCustomerRow[] | null
	employees: SupabaseAssignedEmployeeRow | SupabaseAssignedEmployeeRow[] | null
}

interface SupabaseSupportMessageRow {
	id: string
	ticket_id: string | null
	conversation_id: string | null
	sender_type: 'customer' | 'employee' | 'system' | 'external'
	sender_user_id: string | null
	channel: 'email' | 'whatsapp' | 'portal' | 'website'
	body: string
	external_message_id: string | null
	provider_status?: string
	provider_error?: string | null
	metadata?: Record<string, unknown>
	created_at: string
}

interface SupportReplyRow {
	id: string
	metadata: JsonObject
}

const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
	z.union([
		z.string(),
		z.number(),
		z.boolean(),
		z.null(),
		z.array(jsonValueSchema),
		z.record(z.string(), jsonValueSchema),
	]),
)

const jsonObjectSchema: z.ZodType<JsonObject> = z.record(
	z.string(),
	jsonValueSchema,
)

const conversationIdSchema = z.string().trim().min(1).max(120)

const sendReplyInputSchema = z.object({
	channel: z.enum(['email', 'live', 'whatsapp']),
	content: z.string().trim().min(1).max(4000),
	conversationId: conversationIdSchema,
	metadata: jsonObjectSchema.optional(),
	senderName: z.string().trim().max(120).optional(),
})

const statusInputSchema = z.object({
	conversationId: conversationIdSchema,
	status: z.enum(['closed', 'open', 'pending', 'resolved']),
})

const conversationOnlyInputSchema = z.object({
	conversationId: conversationIdSchema,
})

const supportReplyRowSchema = z.object({
	id: z.string().uuid(),
	metadata: jsonObjectSchema.nullish(),
})

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
	if (Array.isArray(value)) return value[0] ?? null
	return value ?? null
}

function supportRef(id: string): SupportEntityRef {
	if (id.startsWith('ticket:')) return { kind: 'ticket', id: id.slice(7) }
	if (id.startsWith('conversation:')) {
		return { kind: 'conversation', id: id.slice(13) }
	}
	return { kind: 'local', id }
}

function supportChannel(channel: string): ChannelType {
	if (channel === 'whatsapp') return 'whatsapp'
	if (channel === 'email' || channel === 'website' || channel === 'portal') {
		return 'email'
	}
	return 'live'
}

function ticketStatus(status: SupabaseSupportTicketRow['status']) {
	return status
}

function conversationStatus(status: SupabaseSupportConversationRow['status']) {
	return status
}

function priorityForSupport(subject: string) {
	const text = subject.toLowerCase()
	if (text.includes('delivery') || text.includes('damaged'))
		return 'high' as const
	if (text.includes('billing') || text.includes('urgent'))
		return 'urgent' as const
	return 'medium' as const
}

function fallbackCustomer(input: {
	id: string
	name: string | null
	email: string | null
	phone: string | null
	createdAt: string
}): Customer {
	const displayName =
		input.name || input.phone || input.email || 'Unlinked contact'
	return {
		id: input.id,
		recordType: 'external',
		name: displayName,
		nameAr: displayName,
		email: input.email,
		phone: input.phone,
		company: 'Unlinked support contact',
		companyAr: 'Unlinked support contact',
		totalConversations: 0,
		firstContactAt: input.createdAt,
		satisfactionAvg: null,
	}
}

function supabaseCustomerFromRow(
	row: SupabaseSupportCustomerRow | null,
	fallback: Parameters<typeof fallbackCustomer>[0],
): Customer {
	if (!row) return fallbackCustomer(fallback)
	return {
		id: row.id,
		recordType: 'customer',
		name: row.contact_name,
		nameAr: row.contact_name,
		email: row.email,
		phone: row.phone,
		company: row.company_name,
		companyAr: row.company_name,
		totalConversations: 0,
		firstContactAt: row.created_at,
		satisfactionAvg: null,
	}
}

function supabaseMessageFromRow(
	row: SupabaseSupportMessageRow,
	customer: Customer,
	employeeNameByUserId: Map<string, string>,
): Conversation['messages'][number] {
	const inbound =
		row.sender_type === 'customer' || row.sender_type === 'external'
	const providerStatus = row.provider_status ?? 'recorded'
	const employeeName = row.sender_user_id
		? employeeNameByUserId.get(row.sender_user_id)
		: null
	return {
		id: row.id,
		conversationId: row.ticket_id
			? `ticket:${row.ticket_id}`
			: `conversation:${row.conversation_id}`,
		channel: supportChannel(row.channel),
		direction: inbound ? 'inbound' : 'outbound',
		content: row.body,
		senderName: inbound ? customer.name : (employeeName ?? 'Employee'),
		timestamp: row.created_at,
		attachments: [],
		read: !inbound,
		metadata: {
			...(row.metadata ?? {}),
			externalMessageId: row.external_message_id,
			providerStatus,
			providerError: row.provider_error ?? null,
		},
	}
}

type InternalSupportClient = Awaited<
	ReturnType<typeof getInternalSupabaseClient>
>['client']

async function getSupportEmailTicket(
	client: InternalSupportClient,
	ticketId: string,
): Promise<SupportEmailTicket> {
	const { data, error } = await client
		.from('support_tickets')
		.select('id, reference, requester_email, requester_name, subject')
		.eq('id', ticketId)
		.single()
	if (error) throw new Error(error.message)
	return data as unknown as SupportEmailTicket
}

function supportReplyRow(value: unknown): SupportReplyRow {
	const row = supportReplyRowSchema.parse(value)
	return { id: row.id, metadata: row.metadata ?? {} }
}

async function updateSupportReplyDelivery(
	client: InternalSupportClient,
	messageId: string,
	envelope: SupportEmailEnvelope,
	delivery: SupportEmailDeliveryResult,
	baseMetadata: JsonObject,
): Promise<void> {
	const metadata = {
		...baseMetadata,
		...supportEmailMetadata(envelope, delivery),
	} satisfies JsonObject
	const { error } = await client
		.from('support_messages')
		.update({
			external_message_id: delivery.externalMessageId,
			metadata,
			provider_error: delivery.providerError,
			provider_status: delivery.providerStatus,
		})
		.eq('id', messageId)
	if (error && delivery.providerStatus !== 'sent') {
		throw new Error(error.message)
	}
}

async function getLatestInboundEmailThread(
	client: InternalSupportClient,
	ticketId: string,
): Promise<SupportEmailThreadHeaders | null> {
	const { data, error } = await client
		.from('support_email_threads')
		.select('internet_message_id, reference_message_ids')
		.eq('ticket_id', ticketId)
		.eq('direction', 'inbound')
		.not('internet_message_id', 'is', null)
		.order('created_at', { ascending: false })
		.limit(1)
		.maybeSingle()
	if (error) throw new Error(error.message)
	if (!data?.internet_message_id) return null
	return {
		inReplyTo: data.internet_message_id,
		references: data.reference_message_ids ?? [],
	}
}

async function recordOutboundSupportEmailThread(
	client: InternalSupportClient,
	messageId: string,
	envelope: SupportEmailEnvelope,
	delivery: SupportEmailDeliveryResult,
): Promise<void> {
	if (!delivery.externalMessageId) return
	const sender = parseEmailList(envelope.from)[0] ?? envelope.from.toLowerCase()
	const recipients = [...envelope.to, ...envelope.cc, ...envelope.bcc]
	const { error } = await client.from('support_email_threads').insert({
		cc_emails: envelope.cc,
		direction: 'outbound',
		headers: envelope.headers,
		in_reply_to: envelope.headers['In-Reply-To'] ?? null,
		internet_message_id: null,
		normalized_subject: normalizeSupportEmailSubjectForThread(envelope.subject),
		provider: 'resend',
		provider_email_id: delivery.externalMessageId,
		recipient_emails: recipients,
		reference_message_ids: envelope.headers.References
			? envelope.headers.References.split(/\s+/).filter(Boolean)
			: [],
		sender_email: sender,
		support_message_id: messageId,
		ticket_id: envelope.ticket.id,
	})
	if (error) {
		// The email is already sent at this point; do not make the UI retry and
		// send a duplicate message because thread metadata storage failed.
		return
	}
}

// ─── Computed Metrics ─────────────────────────────────────────────────────────

function computeMetrics(conversations: Conversation[]): InboxMetrics {
	const open = conversations.filter((c) => c.status === 'open')
	const pending = conversations.filter((c) => c.status === 'pending')
	const urgent = conversations.filter(
		(c) =>
			c.priority === 'urgent' &&
			c.status !== 'resolved' &&
			c.status !== 'closed',
	)
	const withSla = conversations.filter((c) => c.slaDeadline !== null)
	const compliant = withSla.filter((c) => !c.slaBreached)
	const responseMinutes = conversations.flatMap((conversation) => {
		const sorted = [...conversation.messages].sort(
			(a, b) =>
				new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
		)
		const values: number[] = []
		let lastInboundAt: string | null = null
		for (const message of sorted) {
			if (message.direction === 'inbound') {
				lastInboundAt = message.timestamp
				continue
			}
			if (!lastInboundAt) continue
			const delta =
				new Date(message.timestamp).getTime() -
				new Date(lastInboundAt).getTime()
			if (Number.isFinite(delta) && delta >= 0) {
				values.push(Math.round(delta / 60_000))
				lastInboundAt = null
			}
		}
		return values
	})
	const avgResponseMinutes =
		responseMinutes.length > 0
			? Math.round(
					responseMinutes.reduce((sum, value) => sum + value, 0) /
						responseMinutes.length,
				)
			: 0

	return {
		openCount: open.length,
		pendingCount: pending.length,
		urgentCount: urgent.length,
		avgResponseMinutes,
		slaCompliancePercent:
			withSla.length > 0
				? Math.round((compliant.length / withSla.length) * 100)
				: 0,
	}
}

async function getSupabaseConversations() {
	const auth = await getInternalSupabaseClient()

	const [
		{ data: ticketRows, error: ticketError },
		{ data: conversationRows, error: conversationError },
	] = await Promise.all([
		auth.client
			.from('support_tickets')
			.select(`
					id,
					reference,
					customer_id,
					requester_name,
					requester_email,
					requester_phone,
					subject,
					status,
					source,
					assigned_employee_id,
					created_at,
					updated_at,
					customers (
						id,
						company_name,
						contact_name,
						phone,
						email,
						created_at
					),
					employees (
						id,
						full_name,
						user_id
					)
				`)
			.order('created_at', { ascending: false }),
		auth.client
			.from('support_conversations')
			.select(`
					id,
					customer_id,
					channel,
					external_thread_id,
					phone,
					email,
					status,
					assigned_employee_id,
					created_at,
					updated_at,
					customers (
						id,
						company_name,
						contact_name,
						phone,
						email,
						created_at
					),
					employees (
						id,
						full_name,
						user_id
					)
				`)
			.order('created_at', { ascending: false }),
	])
	if (ticketError) throw new Error(ticketError.message)
	if (conversationError) throw new Error(conversationError.message)

	const tickets = (ticketRows ?? []) as unknown as SupabaseSupportTicketRow[]
	const supportConversations = (conversationRows ??
		[]) as unknown as SupabaseSupportConversationRow[]
	const ticketIds = tickets.map((ticket) => ticket.id)
	const conversationIds = supportConversations.map(
		(conversation) => conversation.id,
	)

	const ticketMessagesById = new Map<string, SupabaseSupportMessageRow[]>()
	if (ticketIds.length > 0) {
		const { data: rows, error } = await auth.client
			.from('support_messages')
			.select(
				'id, ticket_id, conversation_id, sender_type, sender_user_id, channel, body, external_message_id, provider_status, provider_error, metadata, created_at',
			)
			.in('ticket_id', ticketIds)
			.order('created_at', { ascending: true })
		if (error) throw new Error(error.message)
		for (const message of (rows ??
			[]) as unknown as SupabaseSupportMessageRow[]) {
			if (!message.ticket_id) continue
			const list = ticketMessagesById.get(message.ticket_id) ?? []
			list.push(message)
			ticketMessagesById.set(message.ticket_id, list)
		}
	}

	const conversationMessagesById = new Map<
		string,
		SupabaseSupportMessageRow[]
	>()
	if (conversationIds.length > 0) {
		const { data: rows, error } = await auth.client
			.from('support_messages')
			.select(
				'id, ticket_id, conversation_id, sender_type, sender_user_id, channel, body, external_message_id, provider_status, provider_error, metadata, created_at',
			)
			.in('conversation_id', conversationIds)
			.order('created_at', { ascending: true })
		if (error) throw new Error(error.message)
		for (const message of (rows ??
			[]) as unknown as SupabaseSupportMessageRow[]) {
			if (!message.conversation_id) continue
			const list = conversationMessagesById.get(message.conversation_id) ?? []
			list.push(message)
			conversationMessagesById.set(message.conversation_id, list)
		}
	}

	const senderUserIds = Array.from(
		new Set(
			[
				...Array.from(ticketMessagesById.values()).flat(),
				...Array.from(conversationMessagesById.values()).flat(),
			]
				.map((message) => message.sender_user_id)
				.filter((id): id is string => Boolean(id)),
		),
	)
	const employeeNameByUserId = new Map<string, string>()
	if (senderUserIds.length > 0) {
		const { data: rows, error } = await auth.client
			.from('employees')
			.select('user_id, full_name')
			.in('user_id', senderUserIds)
		if (error) throw new Error(error.message)
		for (const row of (rows ?? []) as Array<{
			user_id: string | null
			full_name: string
		}>) {
			if (row.user_id) employeeNameByUserId.set(row.user_id, row.full_name)
		}
	}

	const ticketConversations: Conversation[] = tickets.map((ticket) => {
		const customer = supabaseCustomerFromRow(firstRelation(ticket.customers), {
			id: `ticket:${ticket.id}:external`,
			name: ticket.requester_name,
			email: ticket.requester_email,
			phone: ticket.requester_phone,
			createdAt: ticket.created_at,
		})
		const messages = (ticketMessagesById.get(ticket.id) ?? []).map((message) =>
			supabaseMessageFromRow(message, customer, employeeNameByUserId),
		)
		const lastMessage = messages[messages.length - 1]
		const assignedEmployee = firstRelation(ticket.employees)
		return {
			id: `ticket:${ticket.id}`,
			customer,
			channel: 'email',
			status: ticketStatus(ticket.status),
			priority: priorityForSupport(ticket.subject),
			subject: ticket.subject,
			lastMessagePreview: lastMessage?.content.split('\n')[0] ?? ticket.subject,
			lastMessageAt: lastMessage?.timestamp ?? ticket.updated_at,
			unreadCount: messages.filter((message) => !message.read).length,
			assignedTo: ticket.assigned_employee_id,
			assignedToName: assignedEmployee?.full_name ?? null,
			tags: [ticket.source],
			messages,
			linkedOrders: [],
			linkedQuotes: [],
			createdAt: ticket.created_at,
			ticketId: ticket.reference,
			slaDeadline: new Date(
				new Date(ticket.created_at).getTime() + 24 * 60 * 60_000,
			).toISOString(),
			slaBreached:
				ticket.status !== 'closed' &&
				Date.now() - new Date(ticket.created_at).getTime() > 24 * 60 * 60_000,
		}
	})

	const whatsappConversations: Conversation[] = supportConversations.map(
		(conversation) => {
			const customer = supabaseCustomerFromRow(
				firstRelation(conversation.customers),
				{
					id: `conversation:${conversation.id}:external`,
					name: conversation.phone,
					email: conversation.email,
					phone: conversation.phone,
					createdAt: conversation.created_at,
				},
			)
			const messages = (
				conversationMessagesById.get(conversation.id) ?? []
			).map((message) =>
				supabaseMessageFromRow(message, customer, employeeNameByUserId),
			)
			const lastMessage = messages[messages.length - 1]
			const assignedEmployee = firstRelation(conversation.employees)
			return {
				id: `conversation:${conversation.id}`,
				customer,
				channel:
					conversation.channel === 'whatsapp'
						? ('whatsapp' as const)
						: ('live' as const),
				status: conversationStatus(conversation.status),
				priority: 'medium',
				subject: `${conversation.channel === 'whatsapp' ? 'WhatsApp' : 'Support'} conversation${conversation.phone ? ` · ${conversation.phone}` : ''}`,
				lastMessagePreview:
					lastMessage?.content.split('\n')[0] ?? 'No messages yet',
				lastMessageAt: lastMessage?.timestamp ?? conversation.updated_at,
				unreadCount: messages.filter((message) => !message.read).length,
				assignedTo: conversation.assigned_employee_id,
				assignedToName: assignedEmployee?.full_name ?? null,
				tags: [conversation.channel],
				messages,
				linkedOrders: [],
				linkedQuotes: [],
				createdAt: conversation.created_at,
				ticketId: null,
				slaDeadline: new Date(
					new Date(conversation.created_at).getTime() + 2 * 60 * 60_000,
				).toISOString(),
				slaBreached:
					conversation.status !== 'closed' &&
					Date.now() - new Date(conversation.created_at).getTime() >
						2 * 60 * 60_000,
			}
		},
	)

	const conversations = [...whatsappConversations, ...ticketConversations]
	return { conversations, metrics: computeMetrics(conversations) }
}

// ─── Server Functions ─────────────────────────────────────────────────────────

export const getConversations = createServerFn({ method: 'GET' }).handler(
	async (): Promise<{
		conversations: Conversation[]
		metrics: InboxMetrics
	}> => {
		const supabaseConversations = await getSupabaseConversations()
		return supabaseConversations
	},
)

export const sendReply = createServerFn({ method: 'POST' })
	.inputValidator((d) => sendReplyInputSchema.parse(d))
	.handler(
		async ({ data }): Promise<{ success: boolean; messageId: string }> => {
			const auth = await getInternalSupabaseClient()
			const ref = supportRef(data.conversationId)
			if (ref.kind === 'local')
				throw new Error('Supabase support record required')
			if (ref.kind === 'ticket') {
				const ticket = await getSupportEmailTicket(auth.client, ref.id)
				const thread = await getLatestInboundEmailThread(auth.client, ref.id)
				const envelope = await buildSupportEmailEnvelope({
					body: data.content,
					metadata: data.metadata,
					thread,
					ticket,
				})
				const metadata = {
					...(data.metadata ?? {}),
					...supportEmailMetadata(envelope, {
						externalMessageId: null,
						providerError: null,
						providerStatus: 'sending',
					}),
				} satisfies JsonObject
				const { data: message, error } = await auth.client.rpc(
					'send_support_reply',
					{
						p_body: data.content,
						p_channel: data.channel === 'whatsapp' ? 'whatsapp' : 'email',
						p_metadata: metadata,
						p_ticket_id: ref.id,
					},
				)
				if (error) throw new Error(error.message)
				const reply = supportReplyRow(message)
				try {
					const delivery = await deliverSupportEmail(envelope, reply.id)
					await updateSupportReplyDelivery(
						auth.client,
						reply.id,
						envelope,
						delivery,
						reply.metadata,
					)
					await recordOutboundSupportEmailThread(
						auth.client,
						reply.id,
						envelope,
						delivery,
					)
				} catch (deliveryError) {
					try {
						await updateSupportReplyDelivery(
							auth.client,
							reply.id,
							envelope,
							supportEmailFailedDelivery(deliveryError),
							reply.metadata,
						)
					} catch {
						// Preserve the provider failure for the UI; the recorded reply can
						// still be inspected by support instead of being retried blindly.
					}
					throw deliveryError
				}
				return { success: true, messageId: reply.id }
			}
			const { data: message, error } = await auth.client.rpc(
				'send_support_conversation_reply',
				{
					p_body: data.content,
					p_channel: data.channel === 'email' ? 'email' : 'whatsapp',
					p_conversation_id: ref.id,
				},
			)
			if (error) throw new Error(error.message)
			return { success: true, messageId: message.id }
		},
	)

export const updateConversationStatus = createServerFn({ method: 'POST' })
	.inputValidator((d) => statusInputSchema.parse(d))
	.handler(async ({ data }): Promise<{ success: boolean }> => {
		const auth = await getInternalSupabaseClient()
		const ref = supportRef(data.conversationId)
		if (ref.kind === 'local')
			throw new Error('Supabase support record required')
		if (ref.kind === 'ticket') {
			const status =
				data.status === 'closed' || data.status === 'resolved'
					? 'closed'
					: data.status === 'pending'
						? 'pending'
						: 'open'
			const { error } = await auth.client.rpc('set_support_ticket_status', {
				p_status: status,
				p_ticket_id: ref.id,
			})
			if (error) throw new Error(error.message)
			return { success: true }
		}
		const status =
			data.status === 'closed' || data.status === 'resolved' ? 'closed' : 'open'
		const { error } = await auth.client.rpc('set_support_conversation_status', {
			p_conversation_id: ref.id,
			p_status: status,
		})
		if (error) throw new Error(error.message)
		return { success: true }
	})

export const assignConversation = createServerFn({ method: 'POST' })
	.inputValidator((d) => conversationOnlyInputSchema.parse(d))
	.handler(async ({ data }): Promise<{ success: boolean }> => {
		const auth = await getInternalSupabaseClient()
		const ref = supportRef(data.conversationId)
		if (ref.kind === 'local')
			throw new Error('Supabase support record required')
		const { error } =
			ref.kind === 'ticket'
				? await auth.client.rpc('assign_support_ticket', {
						p_ticket_id: ref.id,
					})
				: await auth.client.rpc('assign_support_conversation', {
						p_conversation_id: ref.id,
					})
		if (error) throw new Error(error.message)
		return { success: true }
	})

export const linkConversationToCustomer = createServerFn({ method: 'POST' })
	.inputValidator((d) => conversationOnlyInputSchema.parse(d))
	.handler(async ({ data }): Promise<{ success: boolean }> => {
		const auth = await getInternalSupabaseClient()
		const ref = supportRef(data.conversationId)
		if (ref.kind !== 'conversation') {
			throw new Error('WhatsApp support conversation required')
		}
		const { error } = await auth.client.rpc(
			'link_support_conversation_to_customer',
			{
				p_conversation_id: ref.id,
			},
		)
		if (error) throw new Error(error.message)
		return { success: true }
	})
