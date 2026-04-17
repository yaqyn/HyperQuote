import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { db, hoursSince } from '../db/db'
import type { WarehouseSection } from './warehouse'

const MOCK_ADVISOR_TOKEN = '1234' as const
const OVERDUE_HOURS = 4

// ─── Coordinates ────────────────────────────────────────

/** HyperQuote warehouse — 6th of October City, Giza */
export const WAREHOUSE_COORDS = { lat: 29.9753, lng: 30.9247 } as const

/** Mock delivery coordinates from city name. In production, geocoded at order creation. */
function deliveryCoords(city: string): { lat: number; lng: number } {
	const c = city.toLowerCase()
	if (c.includes('dokki')) return { lat: 30.0392, lng: 31.2117 }
	if (c.includes('maadi')) return { lat: 29.9602, lng: 31.2569 }
	if (c.includes('6th oct') || c.includes('october'))
		return { lat: 29.9853, lng: 30.9377 }
	if (c.includes('nasr')) return { lat: 30.0511, lng: 31.3656 }
	if (c.includes('heliopolis')) return { lat: 30.0866, lng: 31.3454 }
	if (c.includes('new cairo')) return { lat: 30.0131, lng: 31.4966 }
	return { lat: 30.0444, lng: 31.2357 } // Cairo center fallback
}

/** Mock driver position — lerp between warehouse and delivery based on elapsed time. */
function driverPosition(
	warehouseLat: number,
	warehouseLng: number,
	deliveryLat: number,
	deliveryLng: number,
	hoursAgo: number,
): { lat: number; lng: number } {
	// Mock: driver completes ~80% of the journey in OVERDUE_HOURS
	const t = Math.min(hoursAgo / OVERDUE_HOURS, 0.85)
	return {
		lat: warehouseLat + (deliveryLat - warehouseLat) * t,
		lng: warehouseLng + (deliveryLng - warehouseLng) * t,
	}
}

// ─── View types ──────────────────────────────────────────

export interface DispatchTruckView {
	truckId: string
	plateNumber: string
	driverName: string
	driverPhone: string
	capacityTons: number
}

export interface DispatchRouteItemView {
	productSlug: string
	productName: string
	sku: string
	qty: number
	unit: string
}

export interface DispatchRouteView {
	quoteId: string
	quoteNumber: string
	customerName: string
	customerPhone: string
	customerContactName: string
	deliveryAddress: string
	deliveryCity: string
	deliveryUrgencyDays: number
	items: DispatchRouteItemView[]
	trucks: DispatchTruckView[]
	passedAt: string
	passedAtHoursAgo: number
	isOverdue: boolean
	/** Delivery destination coordinates */
	deliveryLat: number
	deliveryLng: number
	/** Mock driver position along route */
	driverLat: number
	driverLng: number
}

export interface DispatchBoardTotals {
	inTransit: number
	overdue: number
	deliveredToday: number
	returnedToday: number
}

export interface DispatchBoardView {
	routes: DispatchRouteView[]
	totals: DispatchBoardTotals
}

export interface DispatchDriverView {
	truckId: string
	plateNumber: string
	driverName: string
	driverPhone: string
	capacityTons: number
	bodyType: string
	status: string
	/** If dispatched, the order they're carrying */
	assignedQuoteId: string | null
	assignedQuoteNumber: string | null
	assignedCustomerName: string | null
}

// ─── Helpers ─────────────────────────────────────────────

function isToday(iso: string): boolean {
	const d = new Date(iso)
	const now = new Date()
	return (
		d.getFullYear() === now.getFullYear() &&
		d.getMonth() === now.getMonth() &&
		d.getDate() === now.getDate()
	)
}

function buildRoute(quoteId: string): DispatchRouteView | null {
	const quote = db.quotes.get(quoteId)
	if (!quote || quote.status !== 'accepted') return null

	const report = db.orderReports.forRfq(quote.rfqId)
	if (!report) return null

	const whSection = report.sections.warehouse as WarehouseSection | undefined
	if (!whSection?.passedAt) return null
	if (report.sections.delivered) return null
	if (report.sections.returned) return null

	const rfq = db.rfqs.get(quote.rfqId)
	const customer = db.customers.get(quote.customerId)

	const items: DispatchRouteItemView[] = quote.items
		.map((i) => {
			const p = db.products.findBySlug(i.productSlug)
			if (!p) return null
			return {
				productSlug: i.productSlug,
				productName: p.name,
				sku: p.sku,
				qty: i.quantity,
				unit: p.unit_of_measure,
			}
		})
		.filter((x): x is DispatchRouteItemView => x !== null)

	const trucks: DispatchTruckView[] = (whSection.truckAssignments ?? [])
		.map((a) => {
			const t = db.trucks.get(a.truckId)
			if (!t) return null
			return {
				truckId: t.id,
				plateNumber: t.plateNumber,
				driverName: t.driverName,
				driverPhone: t.driverPhone,
				capacityTons: t.capacityTons,
			}
		})
		.filter((x): x is DispatchTruckView => x !== null)

	const passedAtHoursAgo = Math.round(hoursSince(whSection.passedAt) * 10) / 10
	const city = quote.deliveryCity ?? rfq?.deliveryCity ?? ''
	const dest = deliveryCoords(city)
	const driver = driverPosition(
		WAREHOUSE_COORDS.lat,
		WAREHOUSE_COORDS.lng,
		dest.lat,
		dest.lng,
		passedAtHoursAgo,
	)

	return {
		quoteId: quote.id,
		quoteNumber: quote.quoteNumber,
		customerName: rfq?.customerName ?? customer?.companyName ?? '',
		customerPhone: customer?.phone ?? '',
		customerContactName: rfq?.contactName ?? customer?.contactName ?? '',
		deliveryAddress: quote.deliveryAddress ?? rfq?.deliveryAddress ?? '',
		deliveryCity: city,
		deliveryUrgencyDays: rfq?.deliveryUrgency ?? 0,
		items,
		trucks,
		passedAt: whSection.passedAt,
		passedAtHoursAgo,
		isOverdue: passedAtHoursAgo >= OVERDUE_HOURS,
		deliveryLat: dest.lat,
		deliveryLng: dest.lng,
		driverLat: driver.lat,
		driverLng: driver.lng,
	}
}

// ─── Server functions ────────────────────────────────────

export const getDispatchBoard = createServerFn({ method: 'GET' })
	.inputValidator(z.object({}))
	.handler(async (): Promise<DispatchBoardView> => {
		const allQuotes = db.quotes.list()
		const routes: DispatchRouteView[] = []

		for (const q of allQuotes) {
			const route = buildRoute(q.id)
			if (route) routes.push(route)
		}

		routes.sort((a, b) => {
			if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1
			return b.passedAtHoursAgo - a.passedAtHoursAgo
		})

		let deliveredToday = 0
		let returnedToday = 0
		for (const report of db.orderReports.list()) {
			const delivered = report.sections.delivered as
				| { deliveredAt?: string }
				| undefined
			if (delivered?.deliveredAt && isToday(delivered.deliveredAt))
				deliveredToday++
			const returned = report.sections.returned as
				| { returnedAt?: string }
				| undefined
			if (returned?.returnedAt && isToday(returned.returnedAt)) returnedToday++
		}

		return {
			routes,
			totals: {
				inTransit: routes.length,
				overdue: routes.filter((r) => r.isOverdue).length,
				deliveredToday,
				returnedToday,
			},
		}
	})

export const getDispatchRouteDetail = createServerFn({ method: 'GET' })
	.inputValidator(z.object({ quoteId: z.string() }))
	.handler(async ({ data }): Promise<DispatchRouteView | null> => {
		return buildRoute(data.quoteId)
	})

export const getDispatchDrivers = createServerFn({ method: 'GET' })
	.inputValidator(z.object({}))
	.handler(async (): Promise<{ drivers: DispatchDriverView[] }> => {
		const allTrucks = db.trucks.list()
		const allQuotes = db.quotes.list()

		const drivers: DispatchDriverView[] = allTrucks.map((t) => {
			let assignedQuoteId: string | null = null
			let assignedQuoteNumber: string | null = null
			let assignedCustomerName: string | null = null

			if (t.status === 'dispatched') {
				for (const q of allQuotes) {
					if (q.status !== 'accepted') continue
					const report = db.orderReports.forRfq(q.rfqId)
					if (!report) continue
					const wh = report.sections.warehouse as WarehouseSection | undefined
					if (
						!wh?.passedAt ||
						report.sections.delivered ||
						report.sections.returned
					)
						continue
					const assigned = wh.truckAssignments?.some((a) => a.truckId === t.id)
					if (assigned) {
						assignedQuoteId = q.id
						assignedQuoteNumber = q.quoteNumber
						const rfq = db.rfqs.get(q.rfqId)
						assignedCustomerName = rfq?.customerName ?? null
						break
					}
				}
			}

			return {
				truckId: t.id,
				plateNumber: t.plateNumber,
				driverName: t.driverName,
				driverPhone: t.driverPhone,
				capacityTons: t.capacityTons,
				bodyType: t.bodyType,
				status: t.status,
				assignedQuoteId,
				assignedQuoteNumber,
				assignedCustomerName,
			}
		})

		return { drivers }
	})

export const markOrderDelivered = createServerFn({ method: 'POST' })
	.inputValidator(
		z.object({
			quoteId: z.string(),
			advisorId: z.string(),
			proofUrl: z.string().min(1),
			securityMethod: z.enum(['password', 'qr']),
			securityToken: z.string(),
		}),
	)
	.handler(async ({ data }): Promise<{ success: boolean; error?: string }> => {
		if (data.securityToken !== MOCK_ADVISOR_TOKEN) {
			return { success: false, error: 'Invalid credential' }
		}

		const advisor = db.employees.get(data.advisorId)
		if (!advisor) return { success: false, error: 'Advisor not found' }

		const quote = db.quotes.get(data.quoteId)
		if (!quote) return { success: false, error: 'Order not found' }

		const report = db.orderReports.forRfq(quote.rfqId)
		if (!report) return { success: false, error: 'No report' }

		const whSection = report.sections.warehouse as WarehouseSection | undefined
		if (!whSection?.passedAt) {
			return { success: false, error: 'Order not dispatched yet' }
		}
		if (report.sections.delivered) {
			return { success: false, error: 'Already delivered' }
		}

		db.orderReports.appendSection(quote.rfqId, 'delivered', {
			deliveredAt: new Date().toISOString(),
			advisorName: advisor.name,
			advisorId: data.advisorId,
			proofUrl: data.proofUrl,
			securityMethod: data.securityMethod,
		})

		for (const item of quote.items) {
			db.stock.consume(item.productSlug, item.quantity)
		}

		for (const a of whSection.truckAssignments ?? []) {
			db.trucks.setStatus(a.truckId, 'available')
		}

		return { success: true }
	})

export const markOrderReturned = createServerFn({ method: 'POST' })
	.inputValidator(
		z.object({
			quoteId: z.string(),
			advisorId: z.string(),
			reason: z.string().min(3),
			proofUrl: z.string().min(1),
			securityMethod: z.enum(['password', 'qr']),
			securityToken: z.string(),
		}),
	)
	.handler(async ({ data }): Promise<{ success: boolean; error?: string }> => {
		if (data.securityToken !== MOCK_ADVISOR_TOKEN) {
			return { success: false, error: 'Invalid credential' }
		}

		const advisor = db.employees.get(data.advisorId)
		if (!advisor) return { success: false, error: 'Advisor not found' }

		const quote = db.quotes.get(data.quoteId)
		if (!quote) return { success: false, error: 'Order not found' }

		const report = db.orderReports.forRfq(quote.rfqId)
		if (!report) return { success: false, error: 'No report' }

		const whSection = report.sections.warehouse as WarehouseSection | undefined
		if (!whSection?.passedAt) {
			return { success: false, error: 'Order not dispatched yet' }
		}

		db.orderReports.appendSection(quote.rfqId, 'returned', {
			returnedAt: new Date().toISOString(),
			reason: data.reason,
			advisorName: advisor.name,
			advisorId: data.advisorId,
			proofUrl: data.proofUrl,
			securityMethod: data.securityMethod,
		})

		const resetSection: WarehouseSection = {
			truckAssignments: [],
			advisorMarkedReady: false,
			failedInspections: whSection.failedInspections ?? [],
			signoff: null,
			passedAt: null,
		}
		report.sections.warehouse = resetSection as unknown as Record<
			string,
			unknown
		>
		report.currentStage = 'warehouse'

		for (const a of whSection.truckAssignments ?? []) {
			db.trucks.setStatus(a.truckId, 'available')
		}

		return { success: true }
	})

export const getWarehouseEmployeesForDispatch = createServerFn({
	method: 'GET',
})
	.inputValidator(z.object({}))
	.handler(async () => {
		return {
			employees: db.employees.list().map((e) => ({ id: e.id, name: e.name })),
		}
	})
