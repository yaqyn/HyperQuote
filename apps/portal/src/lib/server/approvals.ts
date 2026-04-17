/**
 * Approval workflow server functions.
 * Submit for approval, get pending approvals, approve/request changes.
 * Dev mode fallback when Supabase not configured.
 */

import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { getAuthenticatedSupabase, isSupabaseConfigured } from './_supabase'

// ============================================================================
// Input Schemas
// ============================================================================

const quoteItemSchema = z.object({
	productId: z.string().uuid().optional(),
	customerDescription: z.string().min(1),
	quantity: z.number().positive(),
	unitOfMeasure: z.string(),
	notes: z.string().optional(),
	sortOrder: z.number(),
	matchConfidence: z.number().optional(),
	isUnmatched: z.boolean().optional(),
})

const submitForApprovalInput = z.object({
	items: z.array(quoteItemSchema).min(1),
	deliveryAddressId: z.string().uuid().optional(),
	deliveryDate: z.string().optional(),
	notes: z.string().optional(),
	projectId: z.string().uuid().optional(),
	attachmentUrls: z.array(z.string()).optional(),
	idempotencyKey: z.string().uuid(),
})

const approvalActionInput = z.object({
	approvalId: z.string().uuid(),
})

const requestChangesInput = z.object({
	approvalId: z.string().uuid(),
	notes: z.string().optional(),
})

// ============================================================================
// Types
// ============================================================================

export interface PendingApproval {
	approvalId: string
	quoteRequest: {
		id: string
		reference: string
		itemCount: number
		requestedBy: { name: string }
		createdAt: string
	}
}

// ============================================================================
// submitForApproval
// ============================================================================

export const submitForApproval = createServerFn()
	.inputValidator(submitForApprovalInput)
	.handler(
		async ({
			data: input,
		}): Promise<{
			requestId: string
			reference: string
			approvalId: string
		}> => {
			// Dev mode fallback
			if (!isSupabaseConfigured()) {
				const mockId = crypto.randomUUID()
				const year = new Date().getFullYear()
				const seq = String(Math.floor(Math.random() * 99999)).padStart(5, '0')
				return {
					requestId: mockId,
					reference: `QR-${year}-${seq}`,
					approvalId: crypto.randomUUID(),
				}
			}

			const { supabase, session } = await getAuthenticatedSupabase()
			const customerId = session.user.app_metadata?.customer_id

			// Check idempotency
			const { data: existing } = await supabase
				.from('quote_requests')
				.select('id, request_number')
				.eq('idempotency_key', input.idempotencyKey)
				.maybeSingle()

			if (existing) {
				// Find existing approval
				const { data: approval } = await supabase
					.from('approvals')
					.select('id')
					.eq('entity_id', existing.id)
					.eq('entity_type', 'quote_request')
					.maybeSingle()

				return {
					requestId: existing.id,
					reference: existing.request_number,
					approvalId: approval?.id ?? '',
				}
			}

			// Find team approver
			let approverId: string | null = null
			const { data: approvers } = await supabase
				.from('user_profiles')
				.select('user_id, user_roles!inner(role)')
				.eq('customer_id', customerId)
				.eq('user_roles.role', 'approver')
				.neq('user_id', session.user.id)
				.limit(1)

			if (approvers && approvers.length > 0) {
				approverId = (approvers[0] as { user_id: string }).user_id
			}

			// If no approver found, submit directly (bypass approval)
			if (!approverId) {
				const { data: qr, error: qrError } = await supabase
					.from('quote_requests')
					.insert({
						customer_id: customerId,
						status: 'submitted',
						urgency: 'standard',
						project_id: input.projectId ?? null,
						delivery_address_id: input.deliveryAddressId ?? null,
						delivery_date: input.deliveryDate ?? null,
						notes: input.notes ?? null,
						attachment_urls: input.attachmentUrls ?? [],
						submitted_at: new Date().toISOString(),
						submitted_by: session.user.id,
						idempotency_key: input.idempotencyKey,
						approval_required: false,
					})
					.select('id, request_number')
					.single()

				if (qrError || !qr) {
					throw new Error(qrError?.message ?? 'Failed to create quote request')
				}

				await insertItems(supabase, qr.id, input.items)

				return {
					requestId: qr.id,
					reference: qr.request_number,
					approvalId: '',
				}
			}

			// Create quote request as draft with approval_required
			const { data: qr, error: qrError } = await supabase
				.from('quote_requests')
				.insert({
					customer_id: customerId,
					status: 'draft',
					urgency: 'standard',
					project_id: input.projectId ?? null,
					delivery_address_id: input.deliveryAddressId ?? null,
					delivery_date: input.deliveryDate ?? null,
					notes: input.notes ?? null,
					attachment_urls: input.attachmentUrls ?? [],
					submitted_by: session.user.id,
					idempotency_key: input.idempotencyKey,
					approval_required: true,
				})
				.select('id, request_number')
				.single()

			if (qrError || !qr) {
				throw new Error(qrError?.message ?? 'Failed to create quote request')
			}

			await insertItems(supabase, qr.id, input.items)

			// Create approval record
			const { data: approval, error: approvalError } = await supabase
				.from('approvals')
				.insert({
					approval_type: 'quote_discount',
					entity_type: 'quote_request',
					entity_id: qr.id,
					requested_by: session.user.id,
					assigned_to: approverId,
					status: 'pending',
					context: { items_count: input.items.length },
				})
				.select('id')
				.single()

			if (approvalError || !approval) {
				throw new Error(approvalError?.message ?? 'Failed to create approval')
			}

			return {
				requestId: qr.id,
				reference: qr.request_number,
				approvalId: approval.id,
			}
		},
	)

// Helper to insert items
// Typed via `Awaited<ReturnType<typeof getAuthenticatedSupabase>>['supabase']`
// so we don't poke into the `@supabase/supabase-js` module type directly.
type AuthedSupabase = Awaited<
	ReturnType<typeof getAuthenticatedSupabase>
>['supabase']

async function insertItems(
	supabase: AuthedSupabase,
	quoteRequestId: string,
	items: Array<{
		productId?: string
		customerDescription: string
		quantity: number
		unitOfMeasure: string
		notes?: string
		sortOrder: number
		matchConfidence?: number
		isUnmatched?: boolean
	}>,
) {
	const itemRows = items.map((item) => ({
		quote_request_id: quoteRequestId,
		product_id: item.productId ?? null,
		customer_description: item.customerDescription,
		quantity: item.quantity,
		unit_of_measure: item.unitOfMeasure,
		notes: item.notes ?? null,
		match_confidence: item.matchConfidence ?? null,
		sort_order: item.sortOrder,
		is_unmatched: item.isUnmatched ?? false,
	}))

	const { error } = await supabase.from('quote_request_items').insert(itemRows)

	if (error) {
		throw new Error(error.message)
	}
}

// ============================================================================
// getPendingApprovals
// ============================================================================

export const getPendingApprovals = createServerFn().handler(
	async (): Promise<PendingApproval[]> => {
		// Dev mode fallback
		if (!isSupabaseConfigured()) {
			return []
		}

		const { supabase, session } = await getAuthenticatedSupabase()

		const { data, error } = await supabase
			.from('approvals')
			.select(`
        id,
        entity_id,
        requested_by,
        created_at,
        quote_requests!inner (
          id,
          request_number,
          quote_request_items(count)
        )
      `)
			.eq('assigned_to', session.user.id)
			.eq('status', 'pending')
			.eq('entity_type', 'quote_request')
			.order('created_at', { ascending: false })

		if (error) throw new Error(error.message)

		// Fetch requester names
		const requesterIds = [...new Set((data ?? []).map((d) => d.requested_by))]
		const { data: profiles } = await supabase
			.from('user_profiles')
			.select('user_id, display_name')
			.in('user_id', requesterIds)

		const nameMap = new Map(
			(profiles ?? []).map((p) => [p.user_id, p.display_name ?? 'Unknown']),
		)

		return (data ?? []).map((d) => {
			const qr = d.quote_requests as unknown as {
				id: string
				request_number: string
				quote_request_items: Array<{ count: number }>
			}

			return {
				approvalId: d.id,
				quoteRequest: {
					id: qr.id,
					reference: qr.request_number,
					itemCount: qr.quote_request_items?.[0]?.count ?? 0,
					requestedBy: { name: nameMap.get(d.requested_by) ?? 'Unknown' },
					createdAt: d.created_at,
				},
			}
		})
	},
)

// ============================================================================
// approveQuoteRequest
// ============================================================================

export const approveQuoteRequest = createServerFn()
	.inputValidator(approvalActionInput)
	.handler(async ({ data: input }): Promise<{ success: true }> => {
		if (!isSupabaseConfigured()) {
			return { success: true }
		}

		const { supabase, session } = await getAuthenticatedSupabase()

		// Get approval to find entity_id
		const { data: approval, error: fetchError } = await supabase
			.from('approvals')
			.select('entity_id, assigned_to')
			.eq('id', input.approvalId)
			.eq('status', 'pending')
			.single()

		if (fetchError || !approval) {
			throw new Error('Approval not found or already decided')
		}

		if (approval.assigned_to !== session.user.id) {
			throw new Error('Not authorized to approve this request')
		}

		// Update approval status
		const { error: approvalError } = await supabase
			.from('approvals')
			.update({
				status: 'approved',
				decided_at: new Date().toISOString(),
			})
			.eq('id', input.approvalId)

		if (approvalError) throw new Error(approvalError.message)

		// Update quote request: submit it
		const { error: qrError } = await supabase
			.from('quote_requests')
			.update({
				status: 'submitted',
				submitted_at: new Date().toISOString(),
				approved_by: session.user.id,
			})
			.eq('id', approval.entity_id)

		if (qrError) throw new Error(qrError.message)

		return { success: true }
	})

// ============================================================================
// requestChanges
// ============================================================================

export const requestChanges = createServerFn()
	.inputValidator(requestChangesInput)
	.handler(async ({ data: input }): Promise<{ success: true }> => {
		if (!isSupabaseConfigured()) {
			return { success: true }
		}

		const { supabase, session } = await getAuthenticatedSupabase()

		// Get approval
		const { data: approval, error: fetchError } = await supabase
			.from('approvals')
			.select('entity_id, assigned_to')
			.eq('id', input.approvalId)
			.eq('status', 'pending')
			.single()

		if (fetchError || !approval) {
			throw new Error('Approval not found or already decided')
		}

		if (approval.assigned_to !== session.user.id) {
			throw new Error('Not authorized to review this request')
		}

		// Update approval status
		const { error: approvalError } = await supabase
			.from('approvals')
			.update({
				status: 'changes_requested',
				decided_at: new Date().toISOString(),
				notes: input.notes ?? null,
			})
			.eq('id', input.approvalId)

		if (approvalError) throw new Error(approvalError.message)

		// Update quote request with notes
		if (input.notes) {
			const { error: qrError } = await supabase
				.from('quote_requests')
				.update({
					approval_notes: input.notes,
				})
				.eq('id', approval.entity_id)

			if (qrError) throw new Error(qrError.message)
		}

		return { success: true }
	})

// ============================================================================
// checkTeamHasApprover -- used by useNeedsApproval hook
// ============================================================================

export const checkTeamHasApprover = createServerFn().handler(
	async (): Promise<{ hasApprover: boolean }> => {
		if (!isSupabaseConfigured()) {
			return { hasApprover: false }
		}

		const { supabase, session } = await getAuthenticatedSupabase()
		const customerId = session.user.app_metadata?.customer_id

		if (!customerId) {
			return { hasApprover: false }
		}

		const { data } = await supabase
			.from('user_profiles')
			.select('user_id, user_roles!inner(role)')
			.eq('customer_id', customerId)
			.eq('user_roles.role', 'approver')
			.neq('user_id', session.user.id)
			.limit(1)

		return { hasApprover: (data?.length ?? 0) > 0 }
	},
)
