/**
 * Supplier invoice server functions.
 * No local invoice rows: supplier invoice storage is not part of the v1
 * Supabase contract yet.
 */
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type { SupplierInvoice } from '../../types/supplier'
import { getAuthenticatedSupabase } from './_supabase'

export const submitSupplierInvoice = createServerFn({ method: 'POST' })
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
		await getAuthenticatedSupabase()
		throw new Error('Supplier invoice submission is not configured')
	})

export const getSupplierInvoices = createServerFn()
	.inputValidator(
		z.object({
			page: z.number(),
			limit: z.number(),
		}),
	)
	.handler(
		async (): Promise<{ invoices: SupplierInvoice[]; total: number }> => {
			await getAuthenticatedSupabase()
			return { invoices: [], total: 0 }
		},
	)
