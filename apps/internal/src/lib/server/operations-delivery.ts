import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type { DeliveryScheduleItem } from '../../types/operations'

// ─── Helpers ──────────────────────────────────────────────

const daysFromNow = (d: number) =>
	new Date(Date.now() + d * 86_400_000).toISOString()

// ─── Mock Data ─────────────────────────────────────────────

function getMockDeliverySchedule(): DeliveryScheduleItem[] {
	return [
		{
			id: 'del-001',
			orderId: 'ord-007',
			orderNumber: 'SO-2024-0033',
			customerName: 'Heliopolis Construction',
			items: ['Steel Rebar 16mm', 'Steel Rebar 12mm'],
			method: 'own_fleet',
			scheduledDate: daysFromNow(0),
			status: 'loading',
		},
		{
			id: 'del-002',
			orderId: 'ord-008',
			orderNumber: 'SO-2024-0036',
			customerName: 'Maadi Infrastructure',
			items: ['Gypsum Board 12.5mm'],
			method: 'own_fleet',
			scheduledDate: daysFromNow(0),
			status: 'scheduled',
		},
		{
			id: 'del-003',
			orderId: 'ord-005',
			orderNumber: 'SO-2024-0035',
			customerName: 'Giza Towers Development',
			items: ['Portland Cement CEM I 42.5N', 'Steel Rebar 10mm'],
			method: '3pl',
			scheduledDate: daysFromNow(1),
			status: 'scheduled',
		},
		{
			id: 'del-004',
			orderId: 'ord-006',
			orderNumber: 'SO-2024-0038',
			customerName: 'Suez Canal Contractors',
			items: ['Ceramic Floor Tiles 60x60cm', 'Electrical Cable 2.5mm'],
			method: 'consolidated',
			scheduledDate: daysFromNow(2),
			status: 'scheduled',
		},
		{
			id: 'del-005',
			orderId: 'ord-003',
			orderNumber: 'SO-2024-0039',
			customerName: 'Nile Materials Trading',
			items: ['Steel Rebar 16mm', 'Portland Cement'],
			method: 'own_fleet',
			scheduledDate: daysFromNow(3),
			status: 'pending',
		},
		{
			id: 'del-006',
			orderId: 'ord-004',
			orderNumber: 'SO-2024-0042',
			customerName: 'Alexandria Building Co.',
			items: ['Steel Rebar 12mm', 'Gypsum Board'],
			method: 'drop_ship',
			scheduledDate: daysFromNow(4),
			status: 'pending',
		},
		{
			id: 'del-007',
			orderId: 'ord-001',
			orderNumber: 'SO-2024-0047',
			customerName: 'Cairo Steel Construction',
			items: ['Portland Cement CEM I 42.5N'],
			method: '3pl',
			scheduledDate: daysFromNow(5),
			status: 'pending',
		},
		{
			id: 'del-008',
			orderId: 'ord-002',
			orderNumber: 'SO-2024-0051',
			customerName: 'Delta Cement Projects',
			items: ['Ceramic Floor Tiles 60x60cm'],
			method: 'own_fleet',
			scheduledDate: daysFromNow(6),
			status: 'pending',
		},
	]
}

// ─── Server Functions ──────────────────────────────────────

const getDeliveryScheduleInput = z.object({
	startDate: z.string(),
	endDate: z.string(),
	warehouseId: z.string().optional(),
})

export const getDeliverySchedule = createServerFn({ method: 'GET' })
	.inputValidator(getDeliveryScheduleInput)
	.handler(async ({ data: _input }) => {
		return { schedule: getMockDeliverySchedule() }
	})

const scheduleDeliveryInput = z.object({
	orderId: z.string(),
	deliveryDate: z.string(),
	deliveryWindow: z.string(),
	fulfillmentMode: z.enum(['drop_ship', 'own_delivery', 'cross_dock']),
	items: z.array(
		z.object({
			itemId: z.string(),
			quantity: z.number().positive(),
		}),
	),
	driverNotes: z.string().optional(),
})

export const scheduleDelivery = createServerFn({ method: 'POST' })
	.inputValidator(scheduleDeliveryInput)
	.handler(async ({ data }) => {
		return {
			success: true,
			deliveryId: `DEL-${Date.now()}`,
			scheduledDate: data.deliveryDate,
		}
	})
