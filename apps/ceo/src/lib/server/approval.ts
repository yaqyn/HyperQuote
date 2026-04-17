/**
 * CEO approval server functions.
 * Get detail, approve, reject, request more info.
 */
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type { ApprovalItem } from '../../types/approval'

// ============================================================================
// Helper
// ============================================================================

function isSupabaseConfigured(): boolean {
	return !!(
		process.env.SUPABASE_URL &&
		process.env.SUPABASE_URL !== 'https://placeholder.supabase.co' &&
		process.env.SUPABASE_ANON_KEY &&
		process.env.SUPABASE_ANON_KEY !== 'placeholder'
	)
}

// ============================================================================
// Mock data
// ============================================================================

function getMockApproval(_approvalId: string): ApprovalItem {
	return {
		id: 'appr-001',
		type: 'credit_limit',
		entityName: 'Al-Masriya Construction Co.',
		description:
			'Credit limit increase request from EGP 1,200,000 to EGP 2,000,000',
		requestedBy: 'Ahmed Fawzi',
		requestedAt: '2026-03-28T09:00:00Z',
		amount: 2000000,
		currentValue: 1200000,
		proposedValue: 2000000,
		status: 'pending',
		supportingData: {
			customerSince: '2023-06-15',
			totalRevenue6mo: 8400000,
			avgPaymentDays: 32,
			currentUtilization: 82,
			overdueAmount: 250000,
		},
		warningIndicators: [
			'Customer has bounced cheque (EGP 250,000) from Mar 28',
			'Credit utilization already at 82%',
		],
	}
}

// ============================================================================
// Input schemas
// ============================================================================

const approvalDetailInput = z.object({
	approvalId: z.string().min(1),
})

const approveInput = z.object({
	approvalId: z.string().min(1),
	notes: z.string().optional(),
})

const rejectInput = z.object({
	approvalId: z.string().min(1),
	reason: z.string().min(1),
})

const requestMoreInfoInput = z.object({
	approvalId: z.string().min(1),
	questions: z.string().min(1),
})

// ============================================================================
// getApprovalDetail
// ============================================================================

export const getApprovalDetail = createServerFn({ method: 'GET' })
	.inputValidator(approvalDetailInput)
	.handler(async ({ data: input }): Promise<ApprovalItem> => {
		if (isSupabaseConfigured()) {
			// TODO: Real Supabase query
		}

		return getMockApproval(input.approvalId)
	})

// ============================================================================
// approveAction
// ============================================================================

export const approveAction = createServerFn({ method: 'POST' })
	.inputValidator(approveInput)
	.handler(async ({ data: _input }): Promise<{ success: true }> => {
		if (isSupabaseConfigured()) {
			// TODO: Real Supabase mutation -- update approval status, create audit log
		}

		return { success: true }
	})

// ============================================================================
// rejectAction
// ============================================================================

export const rejectAction = createServerFn({ method: 'POST' })
	.inputValidator(rejectInput)
	.handler(async ({ data: _input }): Promise<{ success: true }> => {
		if (isSupabaseConfigured()) {
			// TODO: Real Supabase mutation -- update approval status with reason
		}

		return { success: true }
	})

// ============================================================================
// requestMoreInfo
// ============================================================================

export const requestMoreInfo = createServerFn({ method: 'POST' })
	.inputValidator(requestMoreInfoInput)
	.handler(async ({ data: _input }): Promise<{ success: true }> => {
		if (isSupabaseConfigured()) {
			// TODO: Real Supabase mutation -- update status, send notification
		}

		return { success: true }
	})
