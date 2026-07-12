/**
 * Document server functions backed by Supabase.
 */
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type { Document, DocumentType } from '../../types/document'
import { getAuthenticatedPortalCustomer } from './_supabase'
import { resolveCustomerDocumentUrl } from './document-access'

const documentTypeSchema = z.enum([
	'invoice',
	'delivery_note',
	'quote_pdf',
	'certificate',
])

const getDocumentsInput = z.object({
	type: documentTypeSchema.optional(),
	search: z.string().trim().max(120).optional(),
	page: z.number().int().min(1).default(1),
	limit: z.number().int().min(1).max(100).default(20),
	sortBy: z.enum(['date', 'reference']).optional(),
	sortDir: z.enum(['asc', 'desc']).optional(),
})

const downloadDocumentInput = z.object({
	documentId: z.string().uuid(),
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
				.select(
					'id, type, reference, title, file_size, related_order_ref, created_at',
					{ count: 'exact' },
				)
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
				relatedOrderRef: row.related_order_ref,
			}))

			return { documents, total: count ?? 0 }
		},
	)

export const downloadDocument = createServerFn({ method: 'POST' })
	.inputValidator(downloadDocumentInput)
	.handler(async ({ data: input }): Promise<{ url: string }> => {
		const { customerId, session, supabase } =
			await getAuthenticatedPortalCustomer()
		const { data: document, error: documentError } = await supabase
			.from('documents')
			.select('id, download_url, storage_path')
			.eq('id', input.documentId)
			.eq('customer_id', customerId)
			.maybeSingle()

		if (documentError || !document) {
			throw new Error('Document not found')
		}

		const url = await resolveCustomerDocumentUrl(supabase, customerId, document)
		if (!url) {
			throw new Error('Document download URL is not available')
		}

		const { error } = await supabase.from('document_downloads').insert({
			document_id: document.id,
			user_id: session.user.id,
			downloaded_at: new Date().toISOString(),
		})

		if (error) throw new Error(error.message)
		return { url }
	})
