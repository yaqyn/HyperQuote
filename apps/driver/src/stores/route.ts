import { create } from 'zustand'
import { db } from '../lib/powersync'

export interface RouteData {
	id: string
	driver_id: string
	vehicle_id: string
	date: string
	status: string
	total_distance_km: number
	total_weight_kg: number
	estimated_finish: string
	actual_finish: string
	stop_count: number
}

export type StopStatus =
	| 'pending'
	| 'en_route'
	| 'arrived'
	| 'completed'
	| 'failed'
	| 'skipped'

export interface RouteStop {
	id: string
	route_id: string
	delivery_id: string
	stop_order: number
	customer_name: string
	address: string
	lat: number
	lng: number
	status: StopStatus
	eta: string
	notes: string
	unloading_method: string
	contact_phone: string
	delivery_window_start: string
	delivery_window_end: string
	ppe_required: string
	access_instructions: string
	previous_delivery_notes: string
	site_photos: string
}

interface RouteState {
	activeRoute: RouteData | null
	stops: RouteStop[]
	currentStopId: string | null
	mapView: 'map' | 'list'

	// Derived
	currentStop: RouteStop | null
	completedCount: number
	pendingCount: number
	progress: number

	// Actions
	loadRoute: (routeId: string) => Promise<void>
	setCurrentStop: (stopId: string) => void
	updateStopStatus: (stopId: string, status: StopStatus) => Promise<void>
	recordArrival: (stopId: string, lat: number, lng: number) => Promise<void>
	toggleMapView: () => void
	skipStop: (stopId: string, reason?: string) => Promise<void>
	reset: () => void
}

function computeDerived(stops: RouteStop[], currentStopId: string | null) {
	const currentStop = stops.find((s) => s.id === currentStopId) ?? null
	const completedCount = stops.filter((s) => s.status === 'completed').length
	const pendingCount = stops.filter(
		(s) => s.status === 'pending' || s.status === 'en_route',
	).length
	const progress = stops.length > 0 ? completedCount / stops.length : 0
	return { currentStop, completedCount, pendingCount, progress }
}

const initialState = {
	activeRoute: null as RouteData | null,
	stops: [] as RouteStop[],
	currentStopId: null as string | null,
	mapView: 'map' as const,
	currentStop: null as RouteStop | null,
	completedCount: 0,
	pendingCount: 0,
	progress: 0,
}

export const useRouteStore = create<RouteState>((set, get) => ({
	...initialState,

	loadRoute: async (routeId) => {
		const routes = await db.getAll<RouteData>(
			'SELECT * FROM routes WHERE id = ?',
			[routeId],
		)
		const route = routes[0] ?? null

		const stops = await db.getAll<RouteStop>(
			'SELECT * FROM route_stops WHERE route_id = ? ORDER BY stop_order ASC',
			[routeId],
		)

		const currentStopId =
			stops.find((s) => s.status === 'pending' || s.status === 'en_route')
				?.id ?? null

		set({
			activeRoute: route,
			stops,
			currentStopId,
			...computeDerived(stops, currentStopId),
		})
	},

	setCurrentStop: (stopId) => {
		const { stops } = get()
		set({
			currentStopId: stopId,
			...computeDerived(stops, stopId),
		})
	},

	updateStopStatus: async (stopId, status) => {
		await db.execute('UPDATE route_stops SET status = ? WHERE id = ?', [
			status,
			stopId,
		])

		const stops = get().stops.map((s) =>
			s.id === stopId ? { ...s, status } : s,
		)
		const { currentStopId } = get()
		set({ stops, ...computeDerived(stops, currentStopId) })
	},

	recordArrival: async (stopId, _lat, _lng) => {
		const now = new Date().toISOString()
		await db.execute(
			'UPDATE route_stops SET status = ?, eta = ? WHERE id = ?',
			['arrived', now, stopId],
		)

		// Also record in deliveries
		const stop = get().stops.find((s) => s.id === stopId)
		if (stop?.delivery_id) {
			await db.execute(
				'UPDATE deliveries SET actual_arrival = ? WHERE id = ?',
				[now, stop.delivery_id],
			)
		}

		const stops = get().stops.map((s) =>
			s.id === stopId ? { ...s, status: 'arrived' as StopStatus } : s,
		)
		set({ stops, ...computeDerived(stops, stopId) })
	},

	toggleMapView: () => {
		set({ mapView: get().mapView === 'map' ? 'list' : 'map' })
	},

	skipStop: async (stopId, reason) => {
		await db.execute(
			'UPDATE route_stops SET status = ?, notes = ? WHERE id = ?',
			['skipped', reason ?? '', stopId],
		)

		const { stops, currentStopId } = get()
		const skipIndex = stops.findIndex((s) => s.id === stopId)
		if (skipIndex === -1) return

		// Move skipped stop to end, recalculate order
		const skippedStop = { ...stops[skipIndex], status: 'skipped' as StopStatus }
		const remaining = stops.filter((s) => s.id !== stopId)
		const reordered = [...remaining, skippedStop].map((s, i) => ({
			...s,
			stop_order: i + 1,
		}))

		// Find next pending stop
		const nextStopId =
			reordered.find((s) => s.status === 'pending' || s.status === 'en_route')
				?.id ?? currentStopId

		set({
			stops: reordered,
			currentStopId: nextStopId,
			...computeDerived(reordered, nextStopId),
		})
	},

	reset: () => set(initialState),
}))
