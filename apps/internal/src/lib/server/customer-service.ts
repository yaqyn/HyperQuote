import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type {
	Attachment,
	ChannelType,
	Conversation,
	Customer,
	InboxMetrics,
	LinkedOrder,
} from '../../types/customer-service'
import type { JsonObject, JsonValue } from '../db/types'
import {
	getInternalSupabaseAdminClient,
	getInternalSupabaseClient,
	getInternalSupabasePasswordClient,
} from './_supabase'
import {
	buildSupportEmailEnvelope,
	deliverSupportEmail,
	normalizeSupportEmailSubjectForThread,
	parseEmailList,
	readRuntimeEnv,
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

interface SupabaseSupportAttachmentRow {
	content_type: string | null
	created_at: string
	id: string
	message_id: string
	storage_path: string
}

interface SupportReplyRow {
	id: string
	metadata: JsonObject
}

interface CustomerOrderRequestRow {
	id: string
	customer_id: string | null
	request_number: string
	status: string
	created_at: string
	submitted_at: string | null
	quote_request_items: { id: string }[] | null
}

interface CustomerOrderRow {
	id: string
	order_number: string
	quote_request_id: string | null
	status: string
	total_amount: number
	created_at: string
	delivered_at: string | null
	updated_at: string | null
}

interface CustomerPaymentRow {
	amount: number
	created_at: string
	order_id: string | null
	payment_fraction: number | null
}

interface CustomerReservationRow {
	order_id: string | null
	status: string
	updated_at: string
}

interface CustomerLoadingTaskRow {
	order_id: string | null
	status: string
	updated_at: string
}

interface CustomerDeliveryRow {
	completed_at: string | null
	created_at: string
	order_id: string | null
	status: string
	updated_at: string
}

interface PasswordResetCustomerRow {
	contact_name: string
	email: string | null
	id: string
	phone: string | null
}

interface SupabaseGenerateRecoveryLinkClient {
	auth: {
		admin: {
			generateLink(input: {
				email: string
				options?: { redirectTo?: string }
				type: 'recovery'
			}): Promise<{
				data: { properties?: { action_link?: string } } | null
				error: { message: string } | null
			}>
		}
	}
}

interface TwilioMessageResponse {
	error_code?: unknown
	message?: unknown
	sid?: unknown
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

const passwordResetInputSchema = z.object({
	channel: z.enum(['email', 'sms']),
	customerId: z.string().uuid(),
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
	attachmentsByMessageId: Map<string, Attachment[]>,
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
		attachments: attachmentsByMessageId.get(row.id) ?? [],
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

async function getSupportAttachmentsByMessageId(
	client: InternalSupportClient,
	messageIds: string[],
): Promise<Map<string, Attachment[]>> {
	const attachmentsByMessageId = new Map<string, Attachment[]>()
	if (messageIds.length === 0) return attachmentsByMessageId

	const { data, error } = await client
		.from('support_attachments')
		.select('id, message_id, storage_path, content_type, created_at')
		.in('message_id', messageIds)
		.order('created_at', { ascending: true })
	if (error) throw new Error(error.message)

	for (const row of (data ?? []) as unknown as SupabaseSupportAttachmentRow[]) {
		const { data: signedUrl } = await client.storage
			.from('support-attachments')
			.createSignedUrl(row.storage_path, 60 * 60)
		const list = attachmentsByMessageId.get(row.message_id) ?? []
		list.push({
			id: row.id,
			name: supportAttachmentName(row.storage_path),
			sizeBytes: 0,
			type: row.content_type ?? 'application/octet-stream',
			url: signedUrl?.signedUrl ?? '',
		})
		attachmentsByMessageId.set(row.message_id, list)
	}
	return attachmentsByMessageId
}

function supportAttachmentName(storagePath: string): string {
	const fileName = storagePath.split('/').pop()?.trim()
	return fileName?.replace(/^[0-9]{2}-/, '') || 'attachment'
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

function groupByOrderId<T extends { order_id: string | null }>(
	rows: T[],
): Map<string, T[]> {
	const grouped = new Map<string, T[]>()
	for (const row of rows) {
		if (!row.order_id) continue
		const list = grouped.get(row.order_id) ?? []
		list.push(row)
		grouped.set(row.order_id, list)
	}
	return grouped
}

function latestIso(values: Array<string | null | undefined>): string {
	const latest = values
		.filter((value): value is string => Boolean(value))
		.map((value) => new Date(value).getTime())
		.filter((value) => Number.isFinite(value))
		.sort((a, b) => b - a)[0]
	return latest ? new Date(latest).toISOString() : new Date(0).toISOString()
}

function customerOrderLevel(input: {
	deliveries: CustomerDeliveryRow[]
	order: CustomerOrderRow | null
	paymentTotal: number
	requestStatus: string
	reservations: CustomerReservationRow[]
}): Pick<LinkedOrder, 'level' | 'levelId' | 'levelLabel' | 'summary'> {
	if (
		['rejected', 'declined', 'canceled', 'cancelled', 'expired'].includes(
			input.requestStatus,
		) ||
		input.order?.status === 'rejected' ||
		input.order?.status === 'canceled'
	) {
		return {
			level: 0,
			levelId: 'stopped',
			levelLabel: 'Stopped',
			summary: 'Rejected, canceled, or expired before completion.',
		}
	}
	if (
		input.order?.status === 'delivered' ||
		input.deliveries.some((delivery) => delivery.status === 'completed')
	) {
		return {
			level: 6,
			levelId: 'delivery',
			levelLabel: 'Delivery',
			summary: 'Delivery is complete or currently customer-facing.',
		}
	}
	if (
		input.order?.status === 'dispatch_ready' ||
		input.order?.status === 'dispatch_assigned' ||
		input.order?.status === 'out_for_delivery'
	) {
		return {
			level: 5,
			levelId: 'dispatch',
			levelLabel: 'Dispatch',
			summary: 'Dispatch is assigning, tracking, or completing delivery.',
		}
	}
	if (
		input.order?.status === 'warehouse_loading' ||
		input.order?.status === 'inventory_reserved'
	) {
		return {
			level: 4,
			levelId: 'warehouse',
			levelLabel: 'Warehouse',
			summary: 'Warehouse is preparing loading, drivers, and trucks.',
		}
	}
	if (!input.order) {
		return {
			level: 1,
			levelId: 'sales',
			levelLabel: 'Sales',
			summary: 'Sales is evaluating, quoting, or confirming the order.',
		}
	}
	if (input.paymentTotal <= 0) {
		return {
			level: 2,
			levelId: 'finance',
			levelLabel: 'Finance payment collection',
			summary: 'Finance is waiting for customer payment collection.',
		}
	}
	if (input.reservations.length === 0) {
		return {
			level: 3,
			levelId: 'inventory',
			levelLabel: 'Inventory',
			summary: 'Inventory is reserving confirmed supply for the order.',
		}
	}
	return {
		level: 2,
		levelId: 'finance',
		levelLabel: 'Finance payment collection',
		summary: 'Finance has payment activity recorded for this order.',
	}
}

async function getCustomerOrdersByCustomerId(
	client: InternalSupportClient,
	customerIds: string[],
): Promise<Map<string, LinkedOrder[]>> {
	const ordersByCustomerId = new Map<string, LinkedOrder[]>()
	if (customerIds.length === 0) return ordersByCustomerId

	const { data: requestData, error: requestError } = await client
		.from('quote_requests')
		.select(`
			id,
			customer_id,
			request_number,
			status,
			created_at,
			submitted_at,
			quote_request_items (
				id
			)
		`)
		.in('customer_id', customerIds)
		.order('created_at', { ascending: false })
	if (requestError) throw new Error(requestError.message)

	const requests =
		(requestData as unknown as CustomerOrderRequestRow[] | null) ?? []
	const rfqIds = requests.map((request) => request.id)
	if (rfqIds.length === 0) return ordersByCustomerId

	const { data: orderData, error: orderError } = await client
		.from('orders')
		.select(
			'id, order_number, quote_request_id, status, total_amount, created_at, delivered_at, updated_at',
		)
		.in('quote_request_id', rfqIds)
	if (orderError) throw new Error(orderError.message)

	const orders = (orderData as unknown as CustomerOrderRow[] | null) ?? []
	const orderIds = orders.map((order) => order.id)
	const [paymentsResult, reservationsResult, loadingResult, deliveriesResult] =
		orderIds.length > 0
			? await Promise.all([
					client
						.from('customer_payments')
						.select('order_id, amount, payment_fraction, created_at')
						.in('order_id', orderIds),
					client
						.from('inventory_reservations')
						.select('order_id, status, updated_at')
						.in('order_id', orderIds),
					client
						.from('loading_tasks')
						.select('order_id, status, updated_at')
						.in('order_id', orderIds),
					client
						.from('deliveries')
						.select('order_id, status, created_at, updated_at, completed_at')
						.in('order_id', orderIds),
				])
			: [
					{ data: [], error: null },
					{ data: [], error: null },
					{ data: [], error: null },
					{ data: [], error: null },
				]
	if (paymentsResult.error) throw new Error(paymentsResult.error.message)
	if (reservationsResult.error)
		throw new Error(reservationsResult.error.message)
	if (loadingResult.error) throw new Error(loadingResult.error.message)
	if (deliveriesResult.error) throw new Error(deliveriesResult.error.message)

	const ordersByRfqId = new Map(
		orders
			.filter((order) => order.quote_request_id)
			.map((order) => [order.quote_request_id as string, order]),
	)
	const paymentsByOrderId = groupByOrderId(
		(paymentsResult.data as unknown as CustomerPaymentRow[] | null) ?? [],
	)
	const reservationsByOrderId = groupByOrderId(
		(reservationsResult.data as unknown as CustomerReservationRow[] | null) ??
			[],
	)
	const loadingByOrderId = groupByOrderId(
		(loadingResult.data as unknown as CustomerLoadingTaskRow[] | null) ?? [],
	)
	const deliveriesByOrderId = groupByOrderId(
		(deliveriesResult.data as unknown as CustomerDeliveryRow[] | null) ?? [],
	)

	for (const request of requests) {
		if (!request.customer_id) continue
		const order = ordersByRfqId.get(request.id) ?? null
		const payments = order ? (paymentsByOrderId.get(order.id) ?? []) : []
		const reservations = order
			? (reservationsByOrderId.get(order.id) ?? [])
			: []
		const loadingTasks = order ? (loadingByOrderId.get(order.id) ?? []) : []
		const deliveries = order ? (deliveriesByOrderId.get(order.id) ?? []) : []
		const paymentTotal = payments.reduce(
			(total, payment) => total + Number(payment.amount),
			0,
		)
		const level = customerOrderLevel({
			deliveries,
			order,
			paymentTotal,
			requestStatus: request.status,
			reservations,
		})
		const linkedOrder: LinkedOrder = {
			id: request.id,
			displayId: order?.order_number ?? request.request_number,
			rfqId: request.id,
			orderId: order?.id ?? null,
			orderNumber: order?.order_number ?? null,
			status: request.status,
			orderStatus: order?.status ?? null,
			...level,
			itemCount: request.quote_request_items?.length ?? 0,
			paymentCount: payments.length,
			totalAmount: order?.total_amount ?? 0,
			currency: 'EGP',
			createdAt: request.created_at,
			lastActivityAt: latestIso([
				request.submitted_at,
				request.created_at,
				order?.updated_at,
				order?.created_at,
				...payments.map((payment) => payment.created_at),
				...reservations.map((reservation) => reservation.updated_at),
				...loadingTasks.map((task) => task.updated_at),
				...deliveries.map((delivery) => delivery.created_at),
				...deliveries.map((delivery) => delivery.updated_at),
				...deliveries.map((delivery) => delivery.completed_at),
			]),
		}
		const list = ordersByCustomerId.get(request.customer_id) ?? []
		list.push(linkedOrder)
		ordersByCustomerId.set(request.customer_id, list)
	}

	for (const list of ordersByCustomerId.values()) {
		list.sort(
			(a, b) =>
				new Date(b.lastActivityAt).getTime() -
				new Date(a.lastActivityAt).getTime(),
		)
	}
	return ordersByCustomerId
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

function trimTrailingSlash(value: string): string {
	return value.replace(/\/+$/, '')
}

async function portalPasswordResetRedirectUrl(): Promise<string> {
	const portalUrl =
		(await readRuntimeEnv('PORTAL_URL')) ??
		(await readRuntimeEnv('VITE_PORTAL_URL')) ??
		'https://portal.hyperquote.net'
	return `${trimTrailingSlash(portalUrl)}/login`
}

async function getPasswordResetCustomer(
	client: InternalSupportClient,
	customerId: string,
): Promise<PasswordResetCustomerRow> {
	const { data, error } = await client
		.from('customers')
		.select('id, contact_name, email, phone')
		.eq('id', customerId)
		.maybeSingle()
	if (error) throw new Error(error.message)
	if (!data) throw new Error('customer_not_found')
	return data as unknown as PasswordResetCustomerRow
}

async function generatePasswordRecoveryLink(
	email: string,
	redirectTo: string,
): Promise<string> {
	const admin = await getInternalSupabaseAdminClient()
	const client = admin as unknown as SupabaseGenerateRecoveryLinkClient
	const { data, error } = await client.auth.admin.generateLink({
		email,
		options: { redirectTo },
		type: 'recovery',
	})
	if (error) throw new Error(error.message)
	const actionLink = data?.properties?.action_link?.trim()
	if (!actionLink) throw new Error('password_reset_link_unavailable')
	return actionLink
}

function basicAuthHeader(username: string, password: string): string {
	return `Basic ${btoa(`${username}:${password}`)}`
}

async function sendTwilioMessage(input: {
	body: string
	to: string
}): Promise<void> {
	const accountSid =
		(await readRuntimeEnv('TWILIO_ACCOUNT_SID')) ??
		(await readRuntimeEnv('SUPABASE_AUTH_SMS_TWILIO_ACCOUNT_SID'))
	const authToken =
		(await readRuntimeEnv('TWILIO_AUTH_TOKEN')) ??
		(await readRuntimeEnv('SUPABASE_AUTH_SMS_TWILIO_AUTH_TOKEN'))
	const messagingServiceSid =
		(await readRuntimeEnv('TWILIO_MESSAGING_SERVICE_SID')) ??
		(await readRuntimeEnv('SUPABASE_AUTH_SMS_TWILIO_MESSAGE_SERVICE_SID'))
	const from =
		(await readRuntimeEnv('TWILIO_FROM_PHONE_E164')) ??
		(await readRuntimeEnv('TWILIO_PHONE_NUMBER')) ??
		(await readRuntimeEnv('SMS_FROM_PHONE_E164'))
	if (!accountSid || !authToken) throw new Error('twilio_sms_not_configured')
	if (!messagingServiceSid && !from) {
		throw new Error('twilio_sms_sender_not_configured')
	}

	const body = new URLSearchParams({
		Body: input.body,
		To: input.to,
	})
	if (messagingServiceSid) {
		body.set('MessagingServiceSid', messagingServiceSid)
	} else if (from) {
		body.set('From', from)
	}

	const response = await fetch(
		`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
		{
			body,
			headers: {
				Authorization: basicAuthHeader(accountSid, authToken),
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			method: 'POST',
		},
	)
	const result = (await response
		.json()
		.catch(() => ({}))) as TwilioMessageResponse
	if (!response.ok || result.error_code) {
		const message =
			typeof result.message === 'string' && result.message.trim()
				? result.message
				: 'twilio_sms_send_failed'
		throw new Error(message)
	}
}

async function getSupabaseConversations() {
	const auth = await getInternalSupabaseClient({
		panel: 'customer_service',
		writeRequired: false,
	})

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
	const customerIds = Array.from(
		new Set(
			[
				...tickets.map((ticket) => firstRelation(ticket.customers)?.id),
				...supportConversations.map(
					(conversation) => firstRelation(conversation.customers)?.id,
				),
			].filter((id): id is string => Boolean(id)),
		),
	)
	const linkedOrdersByCustomerId = await getCustomerOrdersByCustomerId(
		auth.client,
		customerIds,
	)
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
	const allMessageRows = [
		...Array.from(ticketMessagesById.values()).flat(),
		...Array.from(conversationMessagesById.values()).flat(),
	]
	const attachmentsByMessageId = await getSupportAttachmentsByMessageId(
		auth.client,
		allMessageRows.map((message) => message.id),
	)

	const ticketConversations: Conversation[] = tickets.map((ticket) => {
		const customer = supabaseCustomerFromRow(firstRelation(ticket.customers), {
			id: `ticket:${ticket.id}:external`,
			name: ticket.requester_name,
			email: ticket.requester_email,
			phone: ticket.requester_phone,
			createdAt: ticket.created_at,
		})
		const messages = (ticketMessagesById.get(ticket.id) ?? []).map((message) =>
			supabaseMessageFromRow(
				message,
				customer,
				employeeNameByUserId,
				attachmentsByMessageId,
			),
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
			linkedOrders: linkedOrdersByCustomerId.get(customer.id) ?? [],
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
				supabaseMessageFromRow(
					message,
					customer,
					employeeNameByUserId,
					attachmentsByMessageId,
				),
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
				linkedOrders: linkedOrdersByCustomerId.get(customer.id) ?? [],
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

export const sendCustomerPasswordReset = createServerFn({ method: 'POST' })
	.inputValidator((d) => passwordResetInputSchema.parse(d))
	.handler(
		async ({
			data,
		}): Promise<{
			channel: 'email' | 'sms'
			destination: string
			success: boolean
		}> => {
			const auth = await getInternalSupabaseClient({
				panel: 'customer_service',
				writeRequired: true,
			})
			const customer = await getPasswordResetCustomer(
				auth.client,
				data.customerId,
			)
			if (!customer.email) {
				throw new Error('customer_email_required_for_password_reset')
			}
			const redirectTo = await portalPasswordResetRedirectUrl()
			if (data.channel === 'email') {
				const passwordClient = await getInternalSupabasePasswordClient()
				const { error } = await passwordClient.auth.resetPasswordForEmail(
					customer.email,
					{ redirectTo },
				)
				if (error) throw new Error(error.message)
				return {
					channel: 'email',
					destination: customer.email,
					success: true,
				}
			}
			if (!customer.phone)
				throw new Error('customer_phone_required_for_sms_reset')
			const recoveryLink = await generatePasswordRecoveryLink(
				customer.email,
				redirectTo,
			)
			await sendTwilioMessage({
				body: `HyperQuote password reset link: ${recoveryLink}`,
				to: customer.phone,
			})
			return {
				channel: 'sms',
				destination: customer.phone,
				success: true,
			}
		},
	)

export const sendReply = createServerFn({ method: 'POST' })
	.inputValidator((d) => sendReplyInputSchema.parse(d))
	.handler(
		async ({ data }): Promise<{ success: boolean; messageId: string }> => {
			const auth = await getInternalSupabaseClient({
				panel: 'customer_service',
				writeRequired: true,
			})
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
		const auth = await getInternalSupabaseClient({
			panel: 'customer_service',
			writeRequired: true,
		})
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
		const auth = await getInternalSupabaseClient({
			panel: 'customer_service',
			writeRequired: true,
		})
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
		const auth = await getInternalSupabaseClient({
			panel: 'customer_service',
			writeRequired: true,
		})
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
