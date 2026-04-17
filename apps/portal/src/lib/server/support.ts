/**
 * Support server functions.
 * Get tickets, get ticket detail, submit ticket, reply to ticket.
 * Dev mode fallback when Supabase not configured.
 */
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type { Ticket, TicketCategory, TicketReply } from '../../types/support'
import { getAuthenticatedSupabase, isSupabaseConfigured } from './_supabase'

// ============================================================================
// Mock data for dev mode
// ============================================================================

function getMockTickets(): Ticket[] {
	return [
		{
			id: 'ticket-001',
			subject: 'Cement delivery was short by 20 bags',
			category: 'delivery_problem',
			status: 'open',
			createdAt: '2026-03-29T10:00:00Z',
			updatedAt: '2026-03-30T14:30:00Z',
			relatedOrderRef: 'ORD-2026-00042',
		},
		{
			id: 'ticket-002',
			subject: 'Invoice amount does not match quote',
			category: 'billing',
			status: 'in_progress',
			createdAt: '2026-03-25T08:00:00Z',
			updatedAt: '2026-03-28T11:00:00Z',
			relatedOrderRef: 'ORD-2026-00038',
		},
		{
			id: 'ticket-003',
			subject: 'Cannot access order tracking',
			category: 'account',
			status: 'resolved',
			createdAt: '2026-03-20T16:00:00Z',
			updatedAt: '2026-03-21T09:00:00Z',
		},
	]
}

function getMockTicketDetail(ticketId: string): {
	ticket: Ticket
	replies: TicketReply[]
} {
	const tickets = getMockTickets()
	const ticket = tickets.find((t) => t.id === ticketId) ?? tickets[0]

	const replies: TicketReply[] = [
		{
			id: 'reply-001',
			ticketId: ticket.id,
			message: ticket.subject,
			sender: 'customer',
			createdAt: ticket.createdAt,
		},
		{
			id: 'reply-002',
			ticketId: ticket.id,
			message:
				'Thank you for reaching out. We are looking into this issue and will get back to you shortly.',
			sender: 'support',
			createdAt: new Date(
				new Date(ticket.createdAt).getTime() + 2 * 60 * 60 * 1000,
			).toISOString(),
		},
		{
			id: 'reply-003',
			ticketId: ticket.id,
			message:
				'We have confirmed the discrepancy. A replacement delivery has been scheduled for tomorrow morning.',
			sender: 'support',
			createdAt: new Date(
				new Date(ticket.createdAt).getTime() + 24 * 60 * 60 * 1000,
			).toISOString(),
		},
		{
			id: 'reply-004',
			ticketId: ticket.id,
			message: 'Thank you for the quick resolution!',
			sender: 'customer',
			createdAt: new Date(
				new Date(ticket.createdAt).getTime() + 25 * 60 * 60 * 1000,
			).toISOString(),
		},
	]

	return { ticket, replies }
}

// ============================================================================
// Input Schemas
// ============================================================================

const getTicketsInput = z.object({
	page: z.number().default(1),
	limit: z.number().default(20),
})

const getTicketDetailInput = z.object({
	ticketId: z.string(),
})

const ticketCategorySchema = z.enum([
	'order_issue',
	'delivery_problem',
	'billing',
	'account',
	'other',
])

const submitSupportTicketInput = z.object({
	subject: z.string().min(1),
	category: ticketCategorySchema,
	message: z.string().min(1),
	orderId: z.string().optional(),
	attachments: z.array(z.string()).optional(),
})

const replySupportTicketInput = z.object({
	ticketId: z.string(),
	message: z.string().min(1),
	attachments: z.array(z.string()).optional(),
})

// ============================================================================
// getTickets
// ============================================================================

export const getTickets = createServerFn()
	.inputValidator(getTicketsInput)
	.handler(
		async ({ data: input }): Promise<{ tickets: Ticket[]; total: number }> => {
			if (!isSupabaseConfigured()) {
				const tickets = getMockTickets()
				const start = (input.page - 1) * input.limit
				return {
					tickets: tickets.slice(start, start + input.limit),
					total: tickets.length,
				}
			}

			const { supabase, session } = await getAuthenticatedSupabase()

			const start = (input.page - 1) * input.limit
			const { data, count, error } = await supabase
				.from('support_tickets')
				.select('*', { count: 'exact' })
				.eq('customer_id', session.user.id)
				.order('updated_at', { ascending: false })
				.range(start, start + input.limit - 1)

			if (error) {
				throw new Error(error.message)
			}

			const tickets: Ticket[] = (data ?? []).map(
				(row: Record<string, unknown>) => ({
					id: row.id as string,
					subject: row.subject as string,
					category: row.category as TicketCategory,
					status: row.status as Ticket['status'],
					createdAt: row.created_at as string,
					updatedAt: row.updated_at as string,
					relatedOrderRef: row.related_order_ref as string | undefined,
				}),
			)

			return { tickets, total: count ?? 0 }
		},
	)

// ============================================================================
// getTicketDetail
// ============================================================================

export const getTicketDetail = createServerFn()
	.inputValidator(getTicketDetailInput)
	.handler(
		async ({
			data: input,
		}): Promise<{ ticket: Ticket; replies: TicketReply[] }> => {
			if (!isSupabaseConfigured()) {
				return getMockTicketDetail(input.ticketId)
			}

			const { supabase } = await getAuthenticatedSupabase()

			const { data: ticketData, error: ticketError } = await supabase
				.from('support_tickets')
				.select('*')
				.eq('id', input.ticketId)
				.single()

			if (ticketError || !ticketData) {
				throw new Error(ticketError?.message ?? 'Ticket not found')
			}

			const { data: replyData, error: replyError } = await supabase
				.from('support_ticket_replies')
				.select('*')
				.eq('ticket_id', input.ticketId)
				.order('created_at', { ascending: true })

			if (replyError) {
				throw new Error(replyError.message)
			}

			const ticket: Ticket = {
				id: ticketData.id,
				subject: ticketData.subject,
				category: ticketData.category,
				status: ticketData.status,
				createdAt: ticketData.created_at,
				updatedAt: ticketData.updated_at,
				relatedOrderRef: ticketData.related_order_ref,
			}

			const replies: TicketReply[] = (replyData ?? []).map(
				(row: Record<string, unknown>) => ({
					id: row.id as string,
					ticketId: row.ticket_id as string,
					message: row.message as string,
					sender: row.sender as 'customer' | 'support',
					createdAt: row.created_at as string,
					attachments: row.attachments as string[] | undefined,
				}),
			)

			return { ticket, replies }
		},
	)

// ============================================================================
// submitSupportTicket
// ============================================================================

export const submitSupportTicket = createServerFn()
	.inputValidator(submitSupportTicketInput)
	.handler(async ({ data: input }): Promise<{ ticketId: string }> => {
		if (!isSupabaseConfigured()) {
			return { ticketId: `ticket-${crypto.randomUUID().slice(0, 8)}` }
		}

		const { supabase, session } = await getAuthenticatedSupabase()

		const { data, error } = await supabase
			.from('support_tickets')
			.insert({
				customer_id: session.user.id,
				subject: input.subject,
				category: input.category,
				status: 'open',
				related_order_id: input.orderId ?? null,
			})
			.select('id')
			.single()

		if (error || !data) {
			throw new Error(error?.message ?? 'Failed to create ticket')
		}

		// Insert initial message as first reply
		await supabase.from('support_ticket_replies').insert({
			ticket_id: data.id,
			message: input.message,
			sender: 'customer',
			attachments: input.attachments ?? null,
		})

		return { ticketId: data.id }
	})

// ============================================================================
// replySupportTicket
// ============================================================================

export const replySupportTicket = createServerFn()
	.inputValidator(replySupportTicketInput)
	.handler(async ({ data: input }): Promise<{ replyId: string }> => {
		if (!isSupabaseConfigured()) {
			return { replyId: `reply-${crypto.randomUUID().slice(0, 8)}` }
		}

		const { supabase } = await getAuthenticatedSupabase()

		const { data, error } = await supabase
			.from('support_ticket_replies')
			.insert({
				ticket_id: input.ticketId,
				message: input.message,
				sender: 'customer',
				attachments: input.attachments ?? null,
			})
			.select('id')
			.single()

		if (error || !data) {
			throw new Error(error?.message ?? 'Failed to send reply')
		}

		// Update ticket updated_at
		await supabase
			.from('support_tickets')
			.update({ updated_at: new Date().toISOString() })
			.eq('id', input.ticketId)

		return { replyId: data.id }
	})
