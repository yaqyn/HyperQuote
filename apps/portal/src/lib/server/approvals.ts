/**
 * Approval workflow server functions.
 * Submit for approval, get pending approvals, approve/request changes.
 */

import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { getAuthenticatedPortalCustomer } from './_supabase'
import {
	assertQuoteRequestItemsHaveOrderableProductLinks,
	insertQuoteRequestItems,
	quoteRequestItemInputSchema,
} from './quote-request-items'

// ============================================================================
// Input Schemas
// ============================================================================

const submitForApprovalInput = z.object({
	items: z.array(quoteRequestItemInputSchema).min(1),
	deliveryAddressId: z.string().uuid().optional(),
	deliveryDate: z.string().optional(),
	notes: z.string().optional(),
	projectId: z.string().uuid().optional(),
	attachmentUrls: z.array(z.string()).optional(),
	idempotencyKey: z.string().uuid(),
})

// ============================================================================
// submitForApproval
// ============================================================================

export const submitForApproval = createServerFn({ method: 'POST' })
	.inputValidator(submitForApprovalInput)
	.handler(
		async ({
			data: input,
		}): Promise<{
			requestId: string
			reference: string
			approvalId: string
		}> => {
			const { customerId, session, supabase } =
				await getAuthenticatedPortalCustomer()

			// Check idempotency
			const { data: existing } = await supabase
				.from('quote_requests')
				.select('id, request_number')
				.eq('idempotency_key', input.idempotencyKey)
				.maybeSingle()

			if (existing) {
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

			await assertQuoteRequestItemsHaveOrderableProductLinks(
				supabase,
				input.items,
			)

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

				await insertQuoteRequestItems(supabase, qr.id, input.items)

				return {
					requestId: qr.id,
					reference: qr.request_number,
					approvalId: '',
				}
			}

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

			await insertQuoteRequestItems(supabase, qr.id, input.items)

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

// ============================================================================
// checkTeamHasApprover -- used by useNeedsApproval hook
// ============================================================================

export const checkTeamHasApprover = createServerFn().handler(
	async (): Promise<{ hasApprover: boolean }> => {
		const { customerId, session, supabase } =
			await getAuthenticatedPortalCustomer()

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
