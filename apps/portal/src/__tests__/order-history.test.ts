import { describe, expect, it } from 'vitest'
import {
	getActiveOrders,
	getOrderHistoryOrders,
	sortOrdersByDateDesc,
} from '../lib/order-history'

describe('portal order history', () => {
	it('sorts mixed order kinds newest first by date', () => {
		const orders = [
			{ date: '2026-05-20T10:00:00.000Z', type: 'saved' },
			{ date: '2026-05-22T09:00:00.000Z', type: 'confirmed' },
			{ date: '2026-05-21T11:00:00.000Z', type: 'submitted' },
		] as const

		expect(sortOrdersByDateDesc(orders).map((order) => order.type)).toEqual([
			'confirmed',
			'submitted',
			'saved',
		])
	})

	it('keeps saved drafts out of real order history', () => {
		const orders = [
			{
				date: '2026-05-23T09:00:00.000Z',
				status: 'draft',
				type: 'saved',
			},
			{
				date: '2026-05-22T09:00:00.000Z',
				status: 'out_for_delivery',
				type: 'confirmed',
			},
			{
				date: '2026-05-21T11:00:00.000Z',
				status: 'submitted',
				type: 'submitted',
			},
			{
				date: '2026-05-20T11:00:00.000Z',
				status: 'rejected',
				type: 'confirmed',
			},
		] as const

		expect(getOrderHistoryOrders(orders).map((order) => order.status)).toEqual([
			'out_for_delivery',
			'submitted',
			'rejected',
		])
	})

	it('keeps active orders limited to submitted, confirmed, and out for delivery', () => {
		const orders = [
			{
				date: '2026-05-26T09:00:00.000Z',
				status: 'delivered',
				type: 'confirmed',
			},
			{
				date: '2026-05-25T09:00:00.000Z',
				status: 'out_for_delivery',
				type: 'confirmed',
			},
			{
				date: '2026-05-24T09:00:00.000Z',
				status: 'order_confirmed',
				type: 'confirmed',
			},
			{
				date: '2026-05-23T09:00:00.000Z',
				status: 'submitted',
				type: 'submitted',
			},
			{
				date: '2026-05-22T09:00:00.000Z',
				status: 'being_prepared',
				type: 'confirmed',
			},
			{
				date: '2026-05-21T09:00:00.000Z',
				status: 'cancelled',
				type: 'confirmed',
			},
			{
				date: '2026-05-20T09:00:00.000Z',
				status: 'draft',
				type: 'saved',
			},
		] as const

		expect(getActiveOrders(orders).map((order) => order.status)).toEqual([
			'out_for_delivery',
			'order_confirmed',
			'submitted',
		])
	})
})
