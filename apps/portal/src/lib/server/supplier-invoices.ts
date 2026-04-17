/**
 * Supplier invoice server functions.
 * Invoice submission and listing.
 * Dev mode fallback when Supabase not configured.
 */
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type { SupplierInvoice } from '../../types/supplier'
import { isSupabaseConfigured } from './_supabase'

// ============================================================================
// Mock data
// ============================================================================

function getMockInvoices(): SupplierInvoice[] {
	const now = new Date()
	return [
		{
			id: 'inv-001',
			invoiceNumber: 'INV-2026-0088',
			poReference: 'HQ-2026-0020',
			status: 'paid',
			subtotal: 760000,
			taxAmount: 106400,
			total: 866400,
			currency: 'EGP',
			invoiceDate: new Date(
				now.getTime() - 12 * 24 * 60 * 60 * 1000,
			).toISOString(),
			submittedAt: new Date(
				now.getTime() - 11 * 24 * 60 * 60 * 1000,
			).toISOString(),
			fileUrl: '/invoices/inv-2026-0088.pdf',
		},
		{
			id: 'inv-002',
			invoiceNumber: 'INV-2026-0092',
			poReference: 'HQ-2026-0028',
			status: 'under_review',
			subtotal: 225000,
			taxAmount: 31500,
			total: 256500,
			currency: 'EGP',
			invoiceDate: new Date(
				now.getTime() - 2 * 24 * 60 * 60 * 1000,
			).toISOString(),
			submittedAt: new Date(
				now.getTime() - 1 * 24 * 60 * 60 * 1000,
			).toISOString(),
			fileUrl: '/invoices/inv-2026-0092.pdf',
		},
		{
			id: 'inv-003',
			invoiceNumber: 'INV-2026-0095',
			poReference: 'HQ-2026-0035',
			status: 'submitted',
			subtotal: 6000000,
			taxAmount: 840000,
			total: 6840000,
			currency: 'EGP',
			invoiceDate: new Date(
				now.getTime() - 1 * 24 * 60 * 60 * 1000,
			).toISOString(),
			submittedAt: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(),
			fileUrl: '/invoices/inv-2026-0095.pdf',
		},
		{
			id: 'inv-004',
			invoiceNumber: 'INV-2026-0078',
			poReference: 'HQ-2026-0015',
			status: 'disputed',
			subtotal: 112500,
			taxAmount: 15750,
			total: 128250,
			currency: 'EGP',
			invoiceDate: new Date(
				now.getTime() - 30 * 24 * 60 * 60 * 1000,
			).toISOString(),
			submittedAt: new Date(
				now.getTime() - 28 * 24 * 60 * 60 * 1000,
			).toISOString(),
			fileUrl: '/invoices/inv-2026-0078.pdf',
		},
	]
}

// ============================================================================
// submitSupplierInvoice
// ============================================================================

export const submitSupplierInvoice = createServerFn()
	.inputValidator(
		z.object({
			poId: z.string(),
			invoiceNumber: z.string(),
			invoiceDate: z.string(),
			subtotal: z.number(),
			taxAmount: z.number(),
			total: z.number(),
			fileUrl: z.string(),
			notes: z.string().optional(),
		}),
	)
	.handler(async (): Promise<{ invoiceId: string }> => {
		if (!isSupabaseConfigured()) {
			return { invoiceId: crypto.randomUUID() }
		}

		// TODO: Real Supabase query
		return { invoiceId: crypto.randomUUID() }
	})

// ============================================================================
// getSupplierInvoices
// ============================================================================

export const getSupplierInvoices = createServerFn()
	.inputValidator(
		z.object({
			page: z.number(),
			limit: z.number(),
		}),
	)
	.handler(
		async (): Promise<{ invoices: SupplierInvoice[]; total: number }> => {
			if (!isSupabaseConfigured()) {
				const invoices = getMockInvoices()
				return { invoices, total: invoices.length }
			}

			// TODO: Real Supabase query
			const invoices = getMockInvoices()
			return { invoices, total: invoices.length }
		},
	)
