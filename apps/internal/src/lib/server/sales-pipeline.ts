import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { getInternalSupabaseClient } from './_supabase'

/**
 * Sales pipeline mutations still back negotiation outcomes. The old pipeline
 * board projection was removed with the dormant sales surfaces.
 */

export const markAsWon = createServerFn({ method: 'POST' })
	.inputValidator(
		z.object({ quoteId: z.string(), customerPONumber: z.string().optional() }),
	)
	.handler(async ({ data }) => {
		const supabaseQuoteVersion = decodeSupabaseQuoteVersionId(data.quoteId)
		if (!supabaseQuoteVersion) {
			return {
				success: false as const,
				error: 'Supabase quote version required',
			}
		}

		const auth = await getInternalSupabaseClient()
		const { data: order, error } = await auth.client.rpc(
			'sales_confirm_order',
			{
				p_order_id: supabaseQuoteVersion.quoteRequestId,
				p_quote_version_id: supabaseQuoteVersion.quoteVersionId,
			},
		)
		if (error) throw new Error(error.message)
		return {
			success: true as const,
			orderId: order?.id ?? supabaseQuoteVersion.quoteRequestId,
			orderNumber:
				order?.order_number ?? order?.id ?? supabaseQuoteVersion.quoteRequestId,
			quoteRequestId: supabaseQuoteVersion.quoteRequestId,
			quoteVersionId: supabaseQuoteVersion.quoteVersionId,
		}
	})

function decodeSupabaseQuoteVersionId(value: string) {
	if (!value.startsWith('sb:')) return null
	const [, quoteRequestId, quoteVersionId] = value.split(':')
	if (!quoteRequestId || !quoteVersionId) return null
	return { quoteRequestId, quoteVersionId }
}

export const markAsLost = createServerFn({ method: 'POST' })
	.inputValidator(
		z.object({
			quoteId: z.string(),
			lossReason: z.string(),
			competitorName: z.string().optional(),
			notes: z.string().optional(),
			proof: z.object({
				fileName: z.string().trim().min(1),
				proofPath: z.string().trim().min(1),
			}),
		}),
	)
	.handler(async ({ data }) => {
		const supabaseQuoteVersion = decodeSupabaseQuoteVersionId(data.quoteId)
		if (!supabaseQuoteVersion) {
			return {
				success: false as const,
				error: 'Supabase quote version required',
			}
		}

		const auth = await getInternalSupabaseClient()
		const { error } = await auth.client.rpc('sales_cancel_order', {
			p_order_id: supabaseQuoteVersion.quoteRequestId,
			p_reason: data.lossReason,
			p_proof: {
				competitor_name: data.competitorName?.trim() || null,
				file_name: data.proof.fileName,
				note: data.notes?.trim() || null,
				proof_path: data.proof.proofPath,
				quoteVersionId: supabaseQuoteVersion.quoteVersionId,
			},
		})
		if (error) throw new Error(error.message)

		return { success: true as const }
	})

export const convertQuoteToOrder = createServerFn({ method: 'POST' })
	.inputValidator(
		z.object({ quoteId: z.string(), poNumber: z.string().optional() }),
	)
	.handler(async ({ data }) => {
		const supabaseQuoteVersion = decodeSupabaseQuoteVersionId(data.quoteId)
		if (!supabaseQuoteVersion) {
			throw new Error('Supabase quote version required')
		}

		const auth = await getInternalSupabaseClient()
		const { data: order, error } = await auth.client.rpc(
			'sales_confirm_order',
			{
				p_order_id: supabaseQuoteVersion.quoteRequestId,
				p_quote_version_id: supabaseQuoteVersion.quoteVersionId,
			},
		)
		if (error) throw new Error(error.message)

		return {
			orderId: order?.id ?? supabaseQuoteVersion.quoteRequestId,
			orderNumber:
				order?.order_number ?? order?.id ?? supabaseQuoteVersion.quoteRequestId,
			quoteId: data.quoteId,
			customerPoNumber: data.poNumber ?? null,
			status: order?.status ?? 'confirmed_for_inventory',
			createdAt: order?.created_at ?? new Date().toISOString(),
			total: order?.total_amount ?? null,
		}
	})

// ─── Negotiation History ──────────────────────────────────

type JsonValue =
	| string
	| number
	| boolean
	| null
	| JsonValue[]
	| { [key: string]: JsonValue }

interface NegotiationEvent {
	id: string
	type: string
	timestamp: string
	actor: string
	description: string
	amount: number | null
	isInternal: boolean
	metadata: { [key: string]: JsonValue } | null
}

interface SupabaseActivityEventRow {
	id: string
	action: string
	actor_employee_id: string | null
	actor_customer_id: string | null
	details: Record<string, JsonValue> | null
	created_at: string
}

function activityDescription(row: SupabaseActivityEventRow): string {
	const details = row.details ?? {}
	const fromStatus =
		typeof details.from_status === 'string' ? details.from_status : null
	const toStatus =
		typeof details.to_status === 'string' ? details.to_status : null
	if (fromStatus && toStatus) {
		return `${row.action.replaceAll('_', ' ')}: ${fromStatus} -> ${toStatus}`
	}
	return row.action.replaceAll('_', ' ')
}

export const getNegotiationHistory = createServerFn({ method: 'POST' })
	.inputValidator(z.object({ quoteId: z.string() }))
	.handler(async ({ data }) => {
		const supabaseQuoteVersion = decodeSupabaseQuoteVersionId(data.quoteId)
		if (!supabaseQuoteVersion) return { events: [] }

		const auth = await getInternalSupabaseClient()
		const { data: rows, error } = await auth.client
			.from('activity_events')
			.select(
				'id, action, actor_employee_id, actor_customer_id, details, created_at',
			)
			.eq('entity_type', 'quote_request')
			.eq('entity_id', supabaseQuoteVersion.quoteRequestId)
			.order('created_at', { ascending: true })
		if (error) throw new Error(error.message)

		const events: NegotiationEvent[] = (
			(rows ?? []) as SupabaseActivityEventRow[]
		).map((row) => ({
			actor: row.actor_employee_id ?? row.actor_customer_id ?? '',
			amount:
				typeof row.details?.total_amount === 'number'
					? row.details.total_amount
					: null,
			description: activityDescription(row),
			id: row.id,
			isInternal: Boolean(row.actor_employee_id),
			metadata: row.details,
			timestamp: row.created_at,
			type: row.action,
		}))
		return { events }
	})
