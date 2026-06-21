import { describe, expect, it } from 'vitest'
import {
	getActiveOrders,
	getOrderHistoryGroupKey,
	getOrderHistoryOrders,
	sortOrdersByDateDesc,
} from '../lib/order-history'
import { getEffectiveOrderStatus } from '../lib/server/deliveries'
import { mapOrderStatus } from '../lib/server/order-utils'

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

	it('normalizes backend stopped statuses before sidebar filtering', () => {
		const orders = [
			{
				date: '2026-05-29T09:00:00.000Z',
				status: mapOrderStatus('canceled'),
				type: 'confirmed',
			},
			{
				date: '2026-05-28T09:00:00.000Z',
				status: mapOrderStatus('declined'),
				type: 'submitted',
			},
			{
				date: '2026-05-27T09:00:00.000Z',
				status: mapOrderStatus('rejected'),
				type: 'confirmed',
			},
			{
				date: '2026-05-26T09:00:00.000Z',
				status: mapOrderStatus('delivered'),
				type: 'confirmed',
			},
			{
				date: '2026-05-25T09:00:00.000Z',
				status: mapOrderStatus('confirmed_for_inventory'),
				type: 'confirmed',
			},
		] as const

		expect(getActiveOrders(orders).map((order) => order.status)).toEqual([
			'order_confirmed',
		])
		expect(getOrderHistoryOrders(orders).map((order) => order.status)).toEqual([
			'cancelled',
			'cancelled',
			'rejected',
			'delivered',
			'order_confirmed',
		])
	})

	it('groups stopped history rows under rejected', () => {
		expect(getOrderHistoryGroupKey({ status: 'cancelled' })).toBe('rejected')
		expect(getOrderHistoryGroupKey({ status: 'rejected' })).toBe('rejected')
		expect(getOrderHistoryGroupKey({ status: 'expired' })).toBe('rejected')
		expect(getOrderHistoryGroupKey({ status: 'delivered' })).toBe('delivered')
		expect(getOrderHistoryGroupKey({ status: 'out_for_delivery' })).toBe(
			'active',
		)
	})

	it('does not let old delivery tracking revive stopped orders', () => {
		expect(
			getEffectiveOrderStatus('cancelled', {
				currentStage: 'out_for_delivery',
			}),
		).toBe('cancelled')
		expect(
			getEffectiveOrderStatus('rejected', {
				currentStage: 'delivered',
			}),
		).toBe('rejected')
		expect(
			getEffectiveOrderStatus('expired', {
				currentStage: 'being_prepared',
			}),
		).toBe('expired')
		expect(
			getEffectiveOrderStatus('order_confirmed', {
				currentStage: 'delivered',
			}),
		).toBe('delivered')
	})
})
