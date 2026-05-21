/**
 * Supplier stock & pricing server functions.
 * Supplier-scoped inventory is empty until a real supplier
 * auth/RLS contract exists.
 */
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type { PriceHistoryEntry, SupplierProduct } from '../../types/supplier'
import { getAuthenticatedSupabase } from './_supabase'

export const getSupplierProducts = createServerFn({ method: 'POST' })
	.inputValidator(
		z.object({
			page: z.number(),
			limit: z.number(),
			search: z.string().optional(),
		}),
	)
	.handler(
		async (): Promise<{ products: SupplierProduct[]; total: number }> => {
			await getAuthenticatedSupabase()
			return { products: [], total: 0 }
		},
	)

export const updateSupplierStock = createServerFn({ method: 'POST' })
	.inputValidator(
		z.object({
			productId: z.string(),
			quantity: z.number().optional(),
			price: z.number().optional(),
		}),
	)
	.handler(async (): Promise<{ success: boolean }> => {
		await getAuthenticatedSupabase()
		throw new Error('Supplier stock updates are not configured')
	})

export const bulkUpdatePrices = createServerFn({ method: 'POST' })
	.inputValidator(
		z.object({
			updates: z.array(
				z.object({
					productId: z.string(),
					price: z.number().optional(),
					quantity: z.number().optional(),
				}),
			),
		}),
	)
	.handler(async (): Promise<{ updatedCount: number; errors: string[] }> => {
		await getAuthenticatedSupabase()
		throw new Error('Supplier bulk price updates are not configured')
	})

export const getSupplierPriceHistory = createServerFn({ method: 'POST' })
	.inputValidator(
		z.object({
			page: z.number(),
			limit: z.number(),
		}),
	)
	.handler(
		async (): Promise<{ history: PriceHistoryEntry[]; total: number }> => {
			await getAuthenticatedSupabase()
			return { history: [], total: 0 }
		},
	)
