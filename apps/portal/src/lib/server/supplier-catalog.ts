/**
 * Supplier catalog upload server functions.
 * Catalog ingestion requires a configured Supabase Storage pipeline.
 */
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type { CatalogUpload } from '../../types/supplier'
import { getAuthenticatedSupabase } from './_supabase'

export const uploadCatalog = createServerFn({ method: 'POST' })
	.inputValidator(
		z.object({
			fileUrl: z.string(),
			fileType: z.string(),
		}),
	)
	.handler(async (): Promise<{ uploadId: string; status: 'processing' }> => {
		await getAuthenticatedSupabase()
		throw new Error('Supplier catalog ingestion is not configured')
	})

export const getSupplierUploadHistory = createServerFn({ method: 'POST' })
	.inputValidator(
		z.object({
			page: z.number(),
			limit: z.number(),
		}),
	)
	.handler(async (): Promise<{ uploads: CatalogUpload[]; total: number }> => {
		await getAuthenticatedSupabase()
		return { uploads: [], total: 0 }
	})
