import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type {
	ResponseTrackingRow,
	SupplierInquiry,
} from '../../types/procurement'

function isSupabaseConfigured(): boolean {
	return !!import.meta.env.VITE_SUPABASE_URL
}

// ─── Mock Data ─────────────────────────────────────────────

const hoursAgo = (h: number) =>
	new Date(Date.now() - h * 3_600_000).toISOString()
const daysFromNow = (d: number) =>
	new Date(Date.now() + d * 86_400_000).toISOString()

function _getMockInquiry(): SupplierInquiry {
	return {
		id: 'inq-001',
		inquiryNumber: 'INQ-2026-00042',
		quoteRequestId: 'rfq-001',
		supplierId: 'sup-001',
		supplierName: 'Cairo Steel Co.',
		status: 'sent',
		responseDueDate: daysFromNow(3),
		sentAt: hoursAgo(12),
		respondedAt: null,
		items: [
			{
				productId: 'prod-001',
				productName: 'Steel Rebar 16mm',
				quantity: 200,
				uom: 'ton',
				specs: 'Grade 60, 12m length, Egyptian Standard ES 262',
			},
			{
				productId: 'prod-002',
				productName: 'Steel Rebar 12mm',
				quantity: 150,
				uom: 'ton',
				specs: 'Grade 60, 12m length',
			},
			{
				productId: 'prod-003',
				productName: 'Steel Rebar 10mm',
				quantity: 100,
				uom: 'ton',
				specs: 'Grade 40, 6m length',
			},
		],
		responseItems: [],
	}
}

function getMockTrackingRows(): ResponseTrackingRow[] {
	return [
		{
			supplierId: 'sup-001',
			supplierName: 'Cairo Steel Co.',
			sentDate: hoursAgo(48),
			status: 'responded',
			responseDate: hoursAgo(12),
			inquiryId: 'inq-001',
		},
		{
			supplierId: 'sup-002',
			supplierName: 'Delta Cement Group',
			sentDate: hoursAgo(48),
			status: 'opened',
			responseDate: null,
			inquiryId: 'inq-002',
		},
		{
			supplierId: 'sup-003',
			supplierName: 'Nile Building Supplies',
			sentDate: hoursAgo(72),
			status: 'overdue',
			responseDate: null,
			inquiryId: 'inq-003',
		},
		{
			supplierId: 'sup-004',
			supplierName: 'Alexandria Rebar Factory',
			sentDate: hoursAgo(24),
			status: 'sent',
			responseDate: null,
			inquiryId: 'inq-004',
		},
		{
			supplierId: 'sup-005',
			supplierName: 'Upper Egypt Steel',
			sentDate: hoursAgo(96),
			status: 'responded',
			responseDate: hoursAgo(48),
			inquiryId: 'inq-005',
		},
		{
			supplierId: 'sup-006',
			supplierName: 'Suez Cement Industries',
			sentDate: hoursAgo(36),
			status: 'closed',
			responseDate: hoursAgo(6),
			inquiryId: 'inq-006',
		},
	]
}

// ─── Server Functions ──────────────────────────────────────

const sendSupplierInquiryInput = z.object({
	supplierIds: z.array(z.string()).min(1),
	productIds: z.array(z.string()).min(1),
	deadline: z.string(),
	quoteRequestId: z.string().optional(),
	template: z.enum([
		'standard',
		'urgent',
		'repeat',
		'project_based',
		'negotiation_followup',
	]),
})

export const sendSupplierInquiry = createServerFn({ method: 'POST' })
	.inputValidator(sendSupplierInquiryInput)
	.handler(async ({ data: _input }) => {
		if (!isSupabaseConfigured()) {
			return { inquiryId: `inq-${Date.now()}` }
		}

		// TODO: Create supplier_inquiry records for each supplier
		// TODO: Send notification (email/WhatsApp) to each supplier
		// TODO: Set response deadline from input.deadline
		// TODO: Link to quote_request if quoteRequestId provided
		return { inquiryId: `inq-${Date.now()}` }
	})

const trackInquiryResponsesInput = z.object({
	inquiryId: z.string().optional(),
	quoteRequestId: z.string().optional(),
})

export const trackInquiryResponses = createServerFn({ method: 'GET' })
	.inputValidator(trackInquiryResponsesInput)
	.handler(async ({ data: input }) => {
		if (!isSupabaseConfigured()) {
			let rows = getMockTrackingRows()
			if (input.inquiryId) {
				rows = rows.filter((r) => r.inquiryId === input.inquiryId)
			}
			return { responses: rows }
		}

		// TODO: Query supplier_inquiries with status, join supplier names
		// TODO: Filter by inquiryId or quoteRequestId
		return { responses: [] as ResponseTrackingRow[] }
	})

const remindSuppliersInput = z.object({
	inquiryIds: z.array(z.string()).min(1),
})

export const remindSuppliers = createServerFn({ method: 'POST' })
	.inputValidator(remindSuppliersInput)
	.handler(async ({ data: input }) => {
		if (!isSupabaseConfigured()) {
			return { reminded: input.inquiryIds.length }
		}

		// TODO: For each inquiry, send reminder notification to supplier
		// TODO: Update last_reminded_at timestamp
		// TODO: Increment reminder_count
		return { reminded: input.inquiryIds.length }
	})
