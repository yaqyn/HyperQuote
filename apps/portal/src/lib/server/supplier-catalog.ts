/**
 * Supplier catalog upload server functions.
 * Catalog upload (async AI parsing) and upload history.
 * Dev mode fallback when Supabase not configured.
 */
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type { CatalogUpload } from '../../types/supplier'
import { isSupabaseConfigured } from './_supabase'

// ============================================================================
// Mock data
// ============================================================================

function getMockUploads(): CatalogUpload[] {
	const now = new Date()
	return [
		{
			id: 'cu-001',
			filename: 'cement-catalog-2026.pdf',
			uploadedAt: new Date(
				now.getTime() - 5 * 24 * 60 * 60 * 1000,
			).toISOString(),
			itemsParsed: 24,
			status: 'completed',
			parsedItems: [
				{
					id: 'cpi-001',
					productName: 'Portland Cement 50kg',
					productNameAr: 'أسمنت بورتلاندي ٥٠ كجم',
					sku: 'CEM-50K-001',
					price: 85,
					quantity: 12000,
					confidence: 96,
					originalText: 'Portland Cement OPC 42.5N 50kg bag - EGP 85/bag',
				},
				{
					id: 'cpi-002',
					productName: 'White Cement 50kg',
					productNameAr: 'أسمنت أبيض ٥٠ كجم',
					sku: 'CEM-WHT-001',
					price: 150,
					quantity: 500,
					confidence: 92,
					originalText: 'White Cement 50kg - 150 LE',
				},
			],
		},
		{
			id: 'cu-002',
			filename: 'steel-prices-march.xlsx',
			uploadedAt: new Date(
				now.getTime() - 15 * 24 * 60 * 60 * 1000,
			).toISOString(),
			itemsParsed: 8,
			status: 'review_required',
			parsedItems: [
				{
					id: 'cpi-003',
					productName: 'Rebar 12mm',
					productNameAr: 'حديد تسليح ١٢ مم',
					sku: 'REB-12M-001',
					price: 32500,
					quantity: 450,
					confidence: 88,
					originalText: 'TMT Rebar 12mm - 32,500 EGP/ton',
				},
				{
					id: 'cpi-004',
					productName: 'Steel Mesh',
					productNameAr: 'شبك حديد',
					sku: '',
					price: 4500,
					quantity: 80,
					confidence: 62,
					originalText: 'Welded mesh 6mm 2.4x6m sheet',
				},
			],
		},
		{
			id: 'cu-003',
			filename: 'aggregates-q1-2026.csv',
			uploadedAt: new Date(
				now.getTime() - 30 * 24 * 60 * 60 * 1000,
			).toISOString(),
			itemsParsed: 12,
			status: 'completed',
		},
	]
}

// ============================================================================
// uploadCatalog
// ============================================================================

export const uploadCatalog = createServerFn()
	.inputValidator(
		z.object({
			fileUrl: z.string(),
			fileType: z.string(),
		}),
	)
	.handler(async (): Promise<{ uploadId: string; status: 'processing' }> => {
		if (!isSupabaseConfigured()) {
			return { uploadId: crypto.randomUUID(), status: 'processing' }
		}

		// Mock-backed until R2 upload and catalog parsing queues are configured.
		return { uploadId: crypto.randomUUID(), status: 'processing' }
	})

// ============================================================================
// getSupplierUploadHistory
// ============================================================================

export const getSupplierUploadHistory = createServerFn()
	.inputValidator(
		z.object({
			page: z.number(),
			limit: z.number(),
		}),
	)
	.handler(async (): Promise<{ uploads: CatalogUpload[]; total: number }> => {
		if (!isSupabaseConfigured()) {
			const uploads = getMockUploads()
			return { uploads, total: uploads.length }
		}

		// Mock-backed until supplier upload history reads are wired to Supabase.
		const uploads = getMockUploads()
		return { uploads, total: uploads.length }
	})
