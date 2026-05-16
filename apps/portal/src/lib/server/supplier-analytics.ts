/**
 * Supplier analytics server function.
 * KPIs, product performance, monthly revenue.
 * Dev mode fallback when Supabase not configured.
 */
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type { SupplierAnalytics } from '../../types/supplier'
import { isSupabaseConfigured } from './_supabase'

// ============================================================================
// Mock data
// ============================================================================

function getMockAnalytics(): SupplierAnalytics {
	return {
		revenue: { value: 8_750_000, trend: 12.5 },
		fillRate: { value: 94.2, trend: 2.1 },
		onTimeRate: { value: 88.7, trend: -1.3 },
		quoteInclusion: { value: 67.4, trend: 5.8 },
		monthlyRevenue: [
			{ month: '2025-05', revenue: 520000 },
			{ month: '2025-06', revenue: 610000 },
			{ month: '2025-07', revenue: 580000 },
			{ month: '2025-08', revenue: 720000 },
			{ month: '2025-09', revenue: 690000 },
			{ month: '2025-10', revenue: 750000 },
			{ month: '2025-11', revenue: 810000 },
			{ month: '2025-12', revenue: 640000 },
			{ month: '2026-01', revenue: 780000 },
			{ month: '2026-02', revenue: 850000 },
			{ month: '2026-03', revenue: 920000 },
			{ month: '2026-04', revenue: 380000 },
		],
		topProducts: [
			{
				id: 'tp-001',
				productName: 'Portland Cement 50kg',
				productNameAr: 'أسمنت بورتلاندي ٥٠ كجم',
				views: 1240,
				quoteInclusions: 420,
				purchaseOrders: 38,
				revenue: 3_230_000,
				winRate: 72.5,
			},
			{
				id: 'tp-002',
				productName: 'Rebar 12mm',
				productNameAr: 'حديد تسليح ١٢ مم',
				views: 980,
				quoteInclusions: 310,
				purchaseOrders: 28,
				revenue: 2_600_000,
				winRate: 68.3,
			},
			{
				id: 'tp-003',
				productName: 'Rebar 16mm',
				productNameAr: 'حديد تسليح ١٦ مم',
				views: 850,
				quoteInclusions: 275,
				purchaseOrders: 22,
				revenue: 1_496_000,
				winRate: 64.1,
			},
			{
				id: 'tp-004',
				productName: 'Washed Sand',
				productNameAr: 'رمل مغسول',
				views: 720,
				quoteInclusions: 380,
				purchaseOrders: 45,
				revenue: 562_500,
				winRate: 78.9,
			},
			{
				id: 'tp-005',
				productName: 'Gravel 20mm',
				productNameAr: 'زلط ٢٠ مم',
				views: 680,
				quoteInclusions: 350,
				purchaseOrders: 42,
				revenue: 470_400,
				winRate: 76.2,
			},
			{
				id: 'tp-006',
				productName: 'Red Bricks',
				productNameAr: 'طوب أحمر',
				views: 520,
				quoteInclusions: 180,
				purchaseOrders: 15,
				revenue: 360_000,
				winRate: 55.4,
			},
			{
				id: 'tp-007',
				productName: 'Welded Steel Mesh 6mm',
				productNameAr: 'شبك حديد ملحوم ٦ مم',
				views: 410,
				quoteInclusions: 145,
				purchaseOrders: 12,
				revenue: 270_000,
				winRate: 52.8,
			},
			{
				id: 'tp-008',
				productName: 'White Cement 50kg',
				productNameAr: 'أسمنت أبيض ٥٠ كجم',
				views: 380,
				quoteInclusions: 120,
				purchaseOrders: 10,
				revenue: 150_000,
				winRate: 48.3,
			},
			{
				id: 'tp-009',
				productName: 'Plywood 18mm',
				productNameAr: 'خشب أبلكاش ١٨ مم',
				views: 340,
				quoteInclusions: 95,
				purchaseOrders: 8,
				revenue: 128_000,
				winRate: 44.7,
			},
			{
				id: 'tp-010',
				productName: 'PVC Pipes 4"',
				productNameAr: 'مواسير بي في سي ٤ بوصة',
				views: 290,
				quoteInclusions: 85,
				purchaseOrders: 6,
				revenue: 96_000,
				winRate: 41.2,
			},
		],
	}
}

// ============================================================================
// getSupplierAnalytics
// ============================================================================

export const getSupplierAnalytics = createServerFn()
	.inputValidator(
		z.object({
			period: z.string(),
		}),
	)
	.handler(async (): Promise<SupplierAnalytics> => {
		if (!isSupabaseConfigured()) {
			return getMockAnalytics()
		}

		// Mock-backed until supplier analytics reads are wired to Supabase.
		return getMockAnalytics()
	})
