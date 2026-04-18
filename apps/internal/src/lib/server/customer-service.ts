import { createServerFn } from '@tanstack/react-start'
import type {
	ChannelType,
	Conversation,
	Customer,
	InboxMetrics,
} from '../../types/customer-service'
import {
	type ConversationRow,
	type CustomerRow,
	db,
	type JsonObject,
	type MessageRow,
} from '../db/db'

// ─── Customer from DB row ─────────────────────────────────────────────────────

/** Arabic company names — keyed by DB id */
const ARABIC_NAMES: Record<string, { name: string; company: string }> = {
	'cust-001': { name: 'حسام الدين', company: 'النور للإنشاءات' },
	'cust-003': { name: 'مصطفى السيد', company: 'بناة الأهرام' },
	'cust-006': { name: 'ريم عبد العزيز', company: 'المعادي للهندسة' },
}

function customerFromRow(row: CustomerRow): Customer {
	const ar = ARABIC_NAMES[row.id]
	return {
		id: row.id,
		name: row.contactName,
		nameAr: ar?.name ?? row.contactName,
		email: row.email,
		phone: row.phone,
		company: row.companyName,
		companyAr: ar?.company ?? row.companyName,
		totalConversations: row.orderCount,
		firstContactAt: row.joinedAt,
		satisfactionAvg:
			row.paymentHistory === 'excellent'
				? 4.6
				: row.paymentHistory === 'good'
					? 4.0
					: 3.2,
	}
}

function getCustomer(id: string): Customer {
	const row = db.customers.get(id)
	if (!row) throw new Error(`Customer ${id} not found in DB`)
	return customerFromRow(row)
}

// ─── Conversation row → API shape ──────────────────────────────────────────────

function rowToConversation(row: ConversationRow): Conversation {
	const customer = getCustomer(row.customerId)
	const lastMessage = row.messages[row.messages.length - 1]
	const unreadCount = row.messages.filter((m) => !m.read).length

	return {
		id: row.id,
		customer,
		channel: row.channel,
		status: row.status,
		priority: row.priority,
		subject: row.subject,
		lastMessagePreview: lastMessage?.content.split('\n')[0] ?? '',
		lastMessageAt: lastMessage?.timestamp ?? row.createdAt,
		unreadCount,
		assignedTo: row.assignedTo,
		assignedToName: row.assignedToName,
		tags: row.tags,
		messages: row.messages,
		linkedOrders: row.linkedOrders,
		linkedQuotes: row.linkedQuotes,
		createdAt: row.createdAt,
		ticketId: row.ticketId,
		slaDeadline: row.slaDeadline,
		slaBreached: row.slaBreached,
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

	return {
		openCount: open.length,
		pendingCount: pending.length,
		urgentCount: urgent.length,
		avgResponseMinutes: 4,
		slaCompliancePercent:
			withSla.length > 0
				? Math.round((compliant.length / withSla.length) * 100)
				: 100,
	}
}

// ─── Server Functions ─────────────────────────────────────────────────────────

export const getConversations = createServerFn({ method: 'GET' }).handler(
	async (): Promise<{
		conversations: Conversation[]
		metrics: InboxMetrics
	}> => {
		const rows = db.conversations.list()
		const conversations = rows.map(rowToConversation)
		return {
			conversations,
			metrics: computeMetrics(conversations),
		}
	},
)

const getConversation = createServerFn({ method: 'GET' })
	.inputValidator((d: { conversationId: string }) => d)
	.handler(async ({ data }): Promise<Conversation | null> => {
		const row = db.conversations.get(data.conversationId)
		if (!row) return null
		return rowToConversation(row)
	})

export const sendReply = createServerFn({ method: 'POST' })
	.inputValidator(
		(d: {
			conversationId: string
			channel: ChannelType
			content: string
			senderName?: string
			metadata?: JsonObject
		}) => d,
	)
	.handler(
		async ({ data }): Promise<{ success: boolean; messageId: string }> => {
			const messageId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
			const message: MessageRow = {
				id: messageId,
				conversationId: data.conversationId,
				channel: data.channel,
				direction: 'outbound',
				content: data.content,
				senderName: data.senderName ?? 'Support Agent',
				timestamp: new Date().toISOString(),
				attachments: [],
				read: true,
				metadata: data.metadata ?? {},
			}
			db.conversations.addMessage(data.conversationId, message)
			return { success: true, messageId }
		},
	)

export const updateConversationStatus = createServerFn({ method: 'POST' })
	.inputValidator((d: { conversationId: string; status: string }) => d)
	.handler(async ({ data }): Promise<{ success: boolean }> => {
		// Emails are permanent threads — never resolve/close them
		const conv = db.conversations.get(data.conversationId)
		if (conv?.channel === 'email') return { success: false }
		const row = db.conversations.updateStatus(
			data.conversationId,
			data.status as Conversation['status'],
		)
		return { success: !!row }
	})

const assignConversation = createServerFn({ method: 'POST' })
	.inputValidator(
		(d: { conversationId: string; agentId: string; agentName?: string }) => d,
	)
	.handler(
		async ({ data }): Promise<{ success: boolean; assignedTo: string }> => {
			db.conversations.assign(
				data.conversationId,
				data.agentId,
				data.agentName ?? data.agentId,
			)
			return { success: true, assignedTo: data.agentId }
		},
	)
