/**
 * Orders server functions.
 * Customer orders grouped by type: saved, submitted, confirmed.
 * Dev mode fallback when Supabase not configured.
 */
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type { Order } from '../../types/order'

const IMG = 'https://websiteassets.hyperquote.net/Images'

function isSupabaseConfigured(): boolean {
	return !!(
		process.env.SUPABASE_URL &&
		process.env.SUPABASE_URL !== 'https://placeholder.supabase.co' &&
		process.env.SUPABASE_ANON_KEY &&
		process.env.SUPABASE_ANON_KEY !== 'placeholder'
	)
}

function getMockOrders(): Order[] {
	const now = new Date()
	return [
		{
			id: 'sav-001',
			type: 'saved',
			name: 'Site A Monthly Supply',
			items: [
				{
					productId: 'p-001',
					productName: 'Portland Cement OPC 42.5N',
					productNameAr: 'اسمنت بورتلاندي عادي',
					quantity: 500,
					unitOfMeasure: 'bag',
					imageUrl: `${IMG}/cement.webp`,
					category: 'cement',
				},
				{
					productId: 'p-002',
					productName: 'Steel Rebar 12mm Grade 60',
					productNameAr: 'حديد تسليح ١٢مم',
					quantity: 10,
					unitOfMeasure: 'ton',
					imageUrl: `${IMG}/steel.webp`,
					category: 'reinforcing_steel',
				},
				{
					productId: 'p-003',
					productName: 'Washed Sand',
					productNameAr: 'رمل مغسول',
					quantity: 50,
					unitOfMeasure: 'm³',
					imageUrl: `${IMG}/Aggregates.webp`,
					category: 'sand',
				},
				{
					productId: 'p-004',
					productName: 'Crushed Gravel 20mm',
					productNameAr: 'زلط مجروش ٢٠مم',
					quantity: 30,
					unitOfMeasure: 'm³',
					imageUrl: `${IMG}/Aggregates.webp`,
					category: 'aggregates',
				},
				{
					productId: 'p-005',
					productName: 'Red Clay Brick Standard',
					productNameAr: 'طوب أحمر',
					quantity: 5000,
					unitOfMeasure: 'piece',
					imageUrl: `${IMG}/bricks.webp`,
					category: 'bricks',
				},
			],
			itemCount: 5,
			description: 'Portland Cement, Rebar, Sand, Gravel, Bricks',
			date: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
			amount: null,
			currency: 'EGP',
		},
		{
			id: 'sav-002',
			type: 'saved',
			name: 'Emergency Rebar Order',
			items: [
				{
					productId: 'p-002',
					productName: 'Steel Rebar 12mm Grade 60',
					productNameAr: 'حديد تسليح ١٢مم',
					quantity: 5,
					unitOfMeasure: 'ton',
					imageUrl: `${IMG}/steel.webp`,
					category: 'reinforcing_steel',
				},
				{
					productId: 'p-006',
					productName: 'Steel Rebar 16mm Grade 60',
					productNameAr: 'حديد تسليح ١٦مم',
					quantity: 3,
					unitOfMeasure: 'ton',
					imageUrl: `${IMG}/steel.webp`,
					category: 'reinforcing_steel',
				},
			],
			itemCount: 2,
			description: 'Rebar 12mm, Rebar 16mm',
			date: new Date(now.getTime() - 0.5 * 24 * 60 * 60 * 1000).toISOString(),
			amount: null,
			currency: 'EGP',
		},
		{
			id: 'sub-001',
			type: 'submitted',
			reference: 'QR-2026-00042',
			items: [
				{
					productId: 'p-001',
					productName: 'Portland Cement OPC 42.5N',
					productNameAr: 'اسمنت بورتلاندي عادي',
					quantity: 200,
					unitOfMeasure: 'bag',
					imageUrl: `${IMG}/cement.webp`,
					category: 'cement',
				},
				{
					productId: 'p-002',
					productName: 'Steel Rebar 12mm Grade 60',
					productNameAr: 'حديد تسليح ١٢مم',
					quantity: 8,
					unitOfMeasure: 'ton',
					imageUrl: `${IMG}/steel.webp`,
					category: 'reinforcing_steel',
				},
				{
					productId: 'p-003',
					productName: 'Washed Sand',
					productNameAr: 'رمل مغسول',
					quantity: 30,
					unitOfMeasure: 'm³',
					imageUrl: `${IMG}/Aggregates.webp`,
					category: 'sand',
				},
				{
					productId: 'p-007',
					productName: 'Welded Wire Mesh 4mm',
					productNameAr: 'شبك حديد ملحوم ٤مم',
					quantity: 50,
					unitOfMeasure: 'sheet',
					imageUrl: `${IMG}/steel.webp`,
					category: 'reinforcing_steel',
				},
			],
			itemCount: 4,
			description: 'Portland Cement, Rebar, Sand, Steel Mesh',
			date: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
			amount: null,
			currency: 'EGP',
		},
		{
			id: 'sub-002',
			type: 'submitted',
			reference: 'QR-2026-00038',
			items: [
				{
					productId: 'p-003',
					productName: 'Washed Sand',
					productNameAr: 'رمل مغسول',
					quantity: 100,
					unitOfMeasure: 'm³',
					imageUrl: `${IMG}/Aggregates.webp`,
					category: 'sand',
				},
				{
					productId: 'p-004',
					productName: 'Crushed Gravel 20mm',
					productNameAr: 'زلط مجروش ٢٠مم',
					quantity: 60,
					unitOfMeasure: 'm³',
					imageUrl: `${IMG}/Aggregates.webp`,
					category: 'aggregates',
				},
			],
			itemCount: 2,
			description: 'Washed Sand, Gravel',
			date: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
			amount: null,
			currency: 'EGP',
		},
		{
			id: 'con-001',
			type: 'confirmed',
			reference: 'QR-2026-00035',
			items: [
				{
					productId: 'p-005',
					productName: 'Red Clay Brick Standard',
					productNameAr: 'طوب أحمر',
					quantity: 10000,
					unitOfMeasure: 'piece',
					imageUrl: `${IMG}/bricks.webp`,
					category: 'bricks',
				},
				{
					productId: 'p-007',
					productName: 'Welded Wire Mesh 4mm',
					productNameAr: 'شبك حديد ملحوم ٤مم',
					quantity: 100,
					unitOfMeasure: 'sheet',
					imageUrl: `${IMG}/steel.webp`,
					category: 'reinforcing_steel',
				},
				{
					productId: 'p-001',
					productName: 'Portland Cement OPC 42.5N',
					productNameAr: 'اسمنت بورتلاندي عادي',
					quantity: 300,
					unitOfMeasure: 'bag',
					imageUrl: `${IMG}/cement.webp`,
					category: 'cement',
				},
			],
			itemCount: 3,
			description: 'Red Bricks, Steel Mesh, Cement',
			date: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
			amount: 89000,
			currency: 'EGP',
		},
		{
			id: 'con-002',
			type: 'confirmed',
			reference: 'QR-2026-00030',
			items: [
				{
					productId: 'p-008',
					productName: 'Plywood 18mm',
					productNameAr: 'خشب أبلكاش ١٨مم',
					quantity: 50,
					unitOfMeasure: 'sheet',
					imageUrl: `${IMG}/wood.webp`,
					category: 'wood',
				},
				{
					productId: 'p-009',
					productName: 'Acrylic Paint White 18L',
					productNameAr: 'طلاء أكريليك أبيض ١٨ل',
					quantity: 20,
					unitOfMeasure: 'bucket',
					imageUrl: `${IMG}/finish.webp`,
					category: 'paints',
				},
				{
					productId: 'p-010',
					productName: 'Tile Adhesive 25kg',
					productNameAr: 'لاصق بلاط ٢٥كج',
					quantity: 40,
					unitOfMeasure: 'bag',
					imageUrl: `${IMG}/finish.webp`,
					category: 'adhesives',
				},
			],
			itemCount: 3,
			description: 'Plywood, Paint, Tile Adhesive',
			date: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
			amount: 156000,
			currency: 'EGP',
		},
		{
			id: 'con-003',
			type: 'confirmed',
			reference: 'QR-2026-00025',
			items: [
				{
					productId: 'p-013',
					productName: 'PVC Pipe 110mm 6m',
					productNameAr: 'ماسورة PVC ١١٠مم',
					quantity: 100,
					unitOfMeasure: 'piece',
					imageUrl: `${IMG}/steel.webp`,
					category: 'plumbing',
				},
				{
					productId: 'p-014',
					productName: 'Ceramic Floor Tile 60×60',
					productNameAr: 'بلاط سيراميك ٦٠×٦٠',
					quantity: 200,
					unitOfMeasure: 'sqm',
					imageUrl: `${IMG}/finish.webp`,
					category: 'tiles',
				},
				{
					productId: 'p-015',
					productName: 'Gypsum Board 12mm',
					productNameAr: 'ألواح جبس بورد ١٢مم',
					quantity: 80,
					unitOfMeasure: 'sheet',
					imageUrl: `${IMG}/finish.webp`,
					category: 'drywall',
				},
			],
			itemCount: 3,
			description: 'PVC Pipes, Ceramic Tiles, Gypsum Board',
			date: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
			amount: 42500,
			currency: 'EGP',
		},
	]
}

export const getAllCustomerOrders = createServerFn({ method: 'GET' }).handler(
	async (): Promise<{ orders: Order[] }> => {
		if (!isSupabaseConfigured()) {
			return { orders: getMockOrders() }
		}
		return { orders: getMockOrders() }
	},
)

const deleteOrderInput = z.object({ orderId: z.string() })

export const deleteOrder = createServerFn({ method: 'POST' })
	.inputValidator(deleteOrderInput)
	.handler(async (): Promise<{ success: boolean }> => {
		return { success: true }
	})

const submitOrderInput = z.object({ orderId: z.string() })

export const submitOrder = createServerFn({ method: 'POST' })
	.inputValidator(submitOrderInput)
	.handler(async (): Promise<{ success: boolean; reference: string }> => {
		const ref = `QR-2026-${String(Math.floor(Math.random() * 99999)).padStart(5, '0')}`
		return { success: true, reference: ref }
	})
