/**
 * Document server functions backed by Supabase.
 */
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type { Document, DocumentType } from '../../types/document'
import { getAuthenticatedPortalCustomer } from './_supabase'

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

export const getDocuments = createServerFn({ method: 'POST' })
	.inputValidator(getDocumentsInput)
	.handler(
		async ({
			data: input,
		}): Promise<{ documents: Document[]; total: number }> => {
			const { customerId, supabase } = await getAuthenticatedPortalCustomer()
			let query = supabase
				.from('documents')
				.select('*', { count: 'exact' })
				.eq('customer_id', customerId)

			if (input.type) query = query.eq('type', input.type)
			if (input.search) {
				query = query.or(
					`reference.ilike.%${input.search}%,title.ilike.%${input.search}%`,
				)
			}

			const sortBy = input.sortBy === 'reference' ? 'reference' : 'created_at'
			query = query.order(sortBy, { ascending: input.sortDir === 'asc' })

			const start = (input.page - 1) * input.limit
			const { data, count, error } = await query.range(
				start,
				start + input.limit - 1,
			)

			if (error) throw new Error(error.message)

			const documents: Document[] = (data ?? []).map((row) => ({
				id: row.id,
				type: row.type as DocumentType,
				reference: row.reference,
				title: row.title,
				date: row.created_at,
				fileSize: row.file_size ?? '',
				downloadUrl: row.download_url,
				relatedOrderRef: row.related_order_ref,
			}))

			return { documents, total: count ?? 0 }
		},
	)

export const downloadInvoicePDF = createServerFn({ method: 'POST' })
	.inputValidator(downloadInvoicePDFInput)
	.handler(async ({ data: input }): Promise<{ url: string }> => {
		const { session, supabase } = await getAuthenticatedPortalCustomer()
		const { data: document, error: documentError } = await supabase
			.from('documents')
			.select('id, download_url')
			.eq('id', input.invoiceId)
			.single()

		if (documentError || !document) {
			throw new Error(documentError?.message ?? 'Document not found')
		}
		if (!document.download_url) {
			throw new Error('Document download URL is not available')
		}

		const { error } = await supabase.from('document_downloads').insert({
			document_id: document.id,
			user_id: session.user.id,
			downloaded_at: new Date().toISOString(),
		})

		if (error) throw new Error(error.message)
		return { url: document.download_url }
	})
