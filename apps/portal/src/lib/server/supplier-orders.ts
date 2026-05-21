/**
 * Supplier purchase order server functions.
 * Supplier-authenticated order handling is not in the v1 backend contract, so
 * these functions never fabricate purchase orders or confirmations.
 */
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type { SupplierPO } from '../../types/supplier'
import { getAuthenticatedSupabase } from './_supabase'

export const getSupplierPOs = createServerFn()
	.inputValidator(
		z.object({
			page: z.number(),
			limit: z.number(),
			status: z.string().optional(),
		}),
	)
	.handler(
		async (): Promise<{ purchaseOrders: SupplierPO[]; total: number }> => {
			await getAuthenticatedSupabase()
			return { purchaseOrders: [], total: 0 }
		},
	)

export const confirmPO = createServerFn({ method: 'POST' })
	.inputValidator(
		z.object({
			poId: z.string(),
			lineConfirmations: z
				.array(
					z.object({
						lineId: z.string(),
						confirmed: z.boolean(),
						partialQuantity: z.number().optional(),
						newPrice: z.number().optional(),
						reason: z.string().optional(),
					}),
				)
				.optional(),
			lines: z
				.array(
					z.object({
						lineId: z.string(),
						confirmed: z.boolean(),
						partialQuantity: z.number().optional(),
						newPrice: z.number().optional(),
						reason: z.string().optional(),
					}),
				)
				.optional(),
			deliverySchedule: z
				.object({
					estimatedShipDate: z.string(),
					deliveryMethod: z.enum(['supplier_delivers', 'hyperquote_pickup']),
					trackingNumber: z.string().optional(),
					notes: z.string().optional(),
				})
				.optional(),
		}),
	)
	.handler(async (): Promise<{ success: boolean }> => {
		await getAuthenticatedSupabase()
		throw new Error('Supplier purchase order confirmation is not configured')
	})

export const rejectPO = createServerFn({ method: 'POST' })
	.inputValidator(
		z.object({
			poId: z.string(),
			reason: z.string(),
			notes: z.string().optional(),
		}),
	)
	.handler(async (): Promise<{ success: boolean }> => {
		await getAuthenticatedSupabase()
		throw new Error('Supplier purchase order rejection is not configured')
	})

export const uploadDeliveryNote = createServerFn({ method: 'POST' })
	.inputValidator(
		z.object({
			poId: z.string(),
			fileUrl: z.string(),
			deliveryDate: z.string().optional(),
			quantity: z.number().optional(),
		}),
	)
	.handler(async (): Promise<{ success: boolean }> => {
		await getAuthenticatedSupabase()
		throw new Error('Supplier delivery note upload is not configured')
	})
