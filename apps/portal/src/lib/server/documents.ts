/**
 * Document server functions.
 * Get documents, download invoice PDF (signed R2 URL).
 * Dev mode fallback when Supabase not configured.
 */
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type { Document, DocumentType } from '../../types/document'
import { getAuthenticatedSupabase, isSupabaseConfigured } from './_supabase'

// ============================================================================
// Mock data for dev mode
// ============================================================================

function getMockDocuments(type?: DocumentType): Document[] {
	const allDocs: Document[] = [
		{
			id: 'doc-001',
			type: 'invoice',
			reference: 'INV-2026-00142',
			title: 'Invoice for Order ORD-2026-00042',
			date: '2026-03-28T10:00:00Z',
			fileSize: '1.2 MB',
			downloadUrl: '#',
			relatedOrderRef: 'ORD-2026-00042',
		},
		{
			id: 'doc-002',
			type: 'invoice',
			reference: 'INV-2026-00138',
			title: 'Invoice for Order ORD-2026-00038',
			date: '2026-03-20T14:30:00Z',
			fileSize: '980 KB',
			downloadUrl: '#',
			relatedOrderRef: 'ORD-2026-00038',
		},
		{
			id: 'doc-003',
			type: 'delivery_note',
			reference: 'DN-2026-00089',
			title: 'Delivery Note - Portland Cement 500 bags',
			date: '2026-03-29T08:15:00Z',
			fileSize: '540 KB',
			downloadUrl: '#',
			relatedOrderRef: 'ORD-2026-00042',
		},
		{
			id: 'doc-004',
			type: 'delivery_note',
			reference: 'DN-2026-00085',
			title: 'Delivery Note - Rebar 12mm 10 tons',
			date: '2026-03-22T11:45:00Z',
			fileSize: '620 KB',
			downloadUrl: '#',
			relatedOrderRef: 'ORD-2026-00038',
		},
		{
			id: 'doc-005',
			type: 'quote_pdf',
			reference: 'QT-2026-00142',
			title: 'Quote - Mixed Building Materials',
			date: '2026-03-25T09:00:00Z',
			fileSize: '2.4 MB',
			downloadUrl: '#',
			relatedOrderRef: null,
		},
		{
			id: 'doc-006',
			type: 'quote_pdf',
			reference: 'QT-2026-00138',
			title: 'Quote - Structural Steel',
			date: '2026-03-18T16:00:00Z',
			fileSize: '1.8 MB',
			downloadUrl: '#',
			relatedOrderRef: null,
		},
		{
			id: 'doc-007',
			type: 'certificate',
			reference: 'CERT-2026-00015',
			title: 'Quality Certificate - OPC Cement Batch 2026-03',
			date: '2026-03-27T13:00:00Z',
			fileSize: '3.1 MB',
			downloadUrl: '#',
			relatedOrderRef: 'ORD-2026-00042',
		},
		{
			id: 'doc-008',
			type: 'invoice',
			reference: 'INV-2026-00130',
			title: 'Invoice for Order ORD-2026-00030',
			date: '2026-03-10T09:30:00Z',
			fileSize: '1.1 MB',
			downloadUrl: '#',
			relatedOrderRef: 'ORD-2026-00030',
		},
		{
			id: 'doc-009',
			type: 'certificate',
			reference: 'CERT-2026-00012',
			title: 'Test Certificate - Rebar Tensile Strength',
			date: '2026-03-15T10:00:00Z',
			fileSize: '2.8 MB',
			downloadUrl: '#',
			relatedOrderRef: 'ORD-2026-00038',
		},
		{
			id: 'doc-010',
			type: 'delivery_note',
			reference: 'DN-2026-00078',
			title: 'Delivery Note - Sand & Gravel Mix',
			date: '2026-03-12T07:30:00Z',
			fileSize: '450 KB',
			downloadUrl: '#',
			relatedOrderRef: 'ORD-2026-00030',
		},
	]

	if (!type) return allDocs
	return allDocs.filter((d) => d.type === type)
}

// ============================================================================
// Input Schemas
// ============================================================================

const documentTypeSchema = z.enum([
	'invoice',
	'delivery_note',
	'quote_pdf',
	'certificate',
])

const getDocumentsInput = z.object({
	type: documentTypeSchema.optional(),
	search: z.string().optional(),
	page: z.number().default(1),
	limit: z.number().default(20),
	sortBy: z.enum(['date', 'reference']).optional(),
	sortDir: z.enum(['asc', 'desc']).optional(),
})

const downloadInvoicePDFInput = z.object({
	invoiceId: z.string(),
})

// ============================================================================
// getDocuments
// ============================================================================

export const getDocuments = createServerFn()
	.inputValidator(getDocumentsInput)
	.handler(
		async ({
			data: input,
		}): Promise<{ documents: Document[]; total: number }> => {
			if (!isSupabaseConfigured()) {
				let docs = getMockDocuments(input.type)

				// Apply search filter
				if (input.search) {
					const q = input.search.toLowerCase()
					docs = docs.filter(
						(d) =>
							d.reference.toLowerCase().includes(q) ||
							d.title.toLowerCase().includes(q),
					)
				}

				// Apply sorting
				const sortBy = input.sortBy ?? 'date'
				const sortDir = input.sortDir ?? 'desc'
				docs.sort((a, b) => {
					const aVal = sortBy === 'date' ? a.date : a.reference
					const bVal = sortBy === 'date' ? b.date : b.reference
					const cmp = aVal.localeCompare(bVal)
					return sortDir === 'asc' ? cmp : -cmp
				})

				// Apply pagination
				const start = (input.page - 1) * input.limit
				const paginated = docs.slice(start, start + input.limit)

				return { documents: paginated, total: docs.length }
			}

			// Production: query Supabase
			const { supabase, session } = await getAuthenticatedSupabase()

			let query = supabase
				.from('documents')
				.select('*', { count: 'exact' })
				.eq('customer_id', session.user.id)

			if (input.type) {
				query = query.eq('type', input.type)
			}

			if (input.search) {
				query = query.or(
					`reference.ilike.%${input.search}%,title.ilike.%${input.search}%`,
				)
			}

			const sortBy = input.sortBy === 'reference' ? 'reference' : 'created_at'
			query = query.order(sortBy, {
				ascending: input.sortDir === 'asc',
			})

			const start = (input.page - 1) * input.limit
			query = query.range(start, start + input.limit - 1)

			const { data, count, error } = await query

			if (error) {
				throw new Error(error.message)
			}

			const documents: Document[] = (data ?? []).map(
				(row: Record<string, unknown>) => ({
					id: row.id as string,
					type: row.type as DocumentType,
					reference: row.reference as string,
					title: row.title as string,
					date: row.created_at as string,
					fileSize: row.file_size as string,
					downloadUrl: row.download_url as string | null,
					relatedOrderRef: row.related_order_ref as string | null,
				}),
			)

			return { documents, total: count ?? 0 }
		},
	)

// ============================================================================
// downloadInvoicePDF
// Canonical name per BACKEND.md -- generates signed R2 URL
// ============================================================================

export const downloadInvoicePDF = createServerFn()
	.inputValidator(downloadInvoicePDFInput)
	.handler(async ({ data: input }): Promise<{ url: string }> => {
		if (!isSupabaseConfigured()) {
			// Mock: return a placeholder PDF URL
			return {
				url: `https://cdn.hyperquote.com/invoices/${input.invoiceId}.pdf`,
			}
		}

		// Production: generate signed R2 URL
		// TODO: Wire R2 signed URL generation when R2 bucket is configured
		const { supabase, session } = await getAuthenticatedSupabase()

		// Log download for audit trail
		await supabase.from('document_downloads').insert({
			document_id: input.invoiceId,
			user_id: session.user.id,
			downloaded_at: new Date().toISOString(),
		})

		// Return placeholder URL -- R2 signing will be added in infrastructure phase
		return {
			url: `https://cdn.hyperquote.com/invoices/${input.invoiceId}.pdf`,
		}
	})
