/**
 * Supplier analytics server function.
 * Supplier portal auth is out of v1 scope, so this surface is Supabase-only
 * and empty until supplier-scoped backend tables/RLS are introduced.
 */
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type { SupplierAnalytics } from '../../types/supplier'
import { getAuthenticatedSupabase } from './_supabase'

const emptySupplierAnalytics = (): SupplierAnalytics => ({
	revenue: { value: 0, trend: 0 },
	fillRate: { value: 0, trend: 0 },
	onTimeRate: { value: 0, trend: 0 },
	quoteInclusion: { value: 0, trend: 0 },
	monthlyRevenue: [],
	topProducts: [],
})

export const getSupplierAnalytics = createServerFn({ method: 'POST' })
	.inputValidator(
		z.object({
			period: z.string(),
		}),
	)
	.handler(async (): Promise<SupplierAnalytics> => {
		await getAuthenticatedSupabase()
		return emptySupplierAnalytics()
	})
