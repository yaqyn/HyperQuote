import { createRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { RouteList } from '@/components/route/RouteList'
import { RouteMap } from '@/components/route/RouteMap'
import { DriverButton } from '@/components/shared/DriverButton'
import {
	addStopGeofences,
	getCurrentPosition,
	onGeofenceEvent,
} from '@/lib/geofence'
import { db } from '@/lib/powersync'
import { useAuthStore } from '@/stores/auth'
import { useRouteStore } from '@/stores/route'
import { Route as rootRoute } from './__root'

function RouteOverviewPage() {
	const { t } = useTranslation('driver')
	const navigate = useNavigate()
	const activeRoute = useRouteStore((s) => s.activeRoute)
	const stops = useRouteStore((s) => s.stops)
	const currentStopId = useRouteStore((s) => s.currentStopId)
	const mapView = useRouteStore((s) => s.mapView)
	const completedCount = useRouteStore((s) => s.completedCount)
	const toggleMapView = useRouteStore((s) => s.toggleMapView)
	const loadRoute = useRouteStore((s) => s.loadRoute)
	const updateStopStatus = useRouteStore((s) => s.updateStopStatus)
	const driverProfile = useAuthStore((s) => s.driverProfile)
	const [currentPosition, setCurrentPosition] = useState<{
		lat: number
		lng: number
	} | null>(null)
	const [isLoading, setIsLoading] = useState(true)

	// Load route from PowerSync (active route for today)
	useEffect(() => {
		const driverId = driverProfile?.id
		if (!driverId) return
		let cancelled = false

		async function loadActiveRoute() {
			try {
				const today = new Date().toISOString().split('T')[0]
				const routes = await db.getAll<{ id: string }>(
					"SELECT id FROM routes WHERE driver_id = ? AND date = ? AND status != 'completed' LIMIT 1",
					[driverId, today],
				)
				if (cancelled) return
				if (routes.length > 0) {
					await loadRoute(routes[0].id)
				}
			} catch {
				// Offline -- data may not be available yet
			} finally {
				if (!cancelled) setIsLoading(false)
			}
		}

		loadActiveRoute()
		return () => {
			cancelled = true
		}
	}, [driverProfile?.id, loadRoute])

	// Initialize geofences for all stops
	useEffect(() => {
		if (stops.length === 0) return

		const geofenceStops = stops.map((s) => ({
			id: s.id,
			lat: s.lat,
			lng: s.lng,
		}))

		addStopGeofences(geofenceStops).catch(() => {
			// Geofencing may not be available in web
		})

		// Listen for DWELL events -> auto-update to arrived
		const subscription = onGeofenceEvent((event) => {
			if (event.action === 'DWELL') {
				updateStopStatus(event.identifier, 'arrived')
			}
		})

		return () => {
			subscription.remove()
		}
	}, [stops, updateStopStatus])

	// Get current GPS position
	useEffect(() => {
		let cancelled = false

		async function fetchPosition() {
			try {
				const pos = await getCurrentPosition()
				if (!cancelled) {
					setCurrentPosition({ lat: pos.lat, lng: pos.lng })
				}
			} catch {
				// GPS may not be available
			}
		}

		fetchPosition()
		const interval = setInterval(fetchPosition, 10000) // 10s polling

		return () => {
			cancelled = true
			clearInterval(interval)
		}
	}, [])

	if (isLoading) {
		return (
			<div className="flex min-h-dvh items-center justify-center">
				<span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[var(--color-blue)] border-t-transparent" />
			</div>
		)
	}

	const isMapMode = mapView === 'map'

	return (
		<div className="flex min-h-dvh flex-col bg-[var(--bg-primary)]">
			{/* Header */}
			<div className="flex items-center justify-between px-4 pt-[var(--safe-top)] pb-2">
				<button
					type="button"
					onClick={() => navigate({ to: '/home' })}
					className="text-sm text-[var(--color-blue)] font-medium"
				>
					{t('common.back')}
				</button>

				<div className="flex items-center gap-2">
					{activeRoute && (
						<span className="text-sm text-[var(--text-secondary)]">
							{activeRoute.date}
						</span>
					)}
					<span
						style={{ fontFamily: 'var(--font-mono)' }}
						className="text-sm font-medium"
					>
						{completedCount}/{stops.length} {t('route.stopsProgress', 'stops')}
					</span>
				</div>

				{/* Toggle map/list */}
				<button
					type="button"
					onClick={toggleMapView}
					className="rounded-lg bg-[var(--color-blue)]/10 px-3 py-1.5 text-xs font-medium text-[var(--color-blue)]"
				>
					{isMapMode ? t('route.listView') : t('route.mapView')}
				</button>
			</div>

			{/* Report Issue */}
			<div className="px-4 pb-2">
				<DriverButton
					variant="secondary"
					onPress={() => navigate({ to: '/exception', search: {} })}
				>
					{t('stopDetail.reportIssue')}
				</DriverButton>
			</div>

			{/* Content */}
			{isMapMode ? (
				<div className="relative flex-1">
					{/* Map fills upper area */}
					<div className="absolute inset-0">
						<RouteMap stops={stops} currentPosition={currentPosition} />
					</div>
					{/* Bottom sheet list */}
					<RouteList stops={stops} currentStopId={currentStopId} />
				</div>
			) : (
				<RouteList stops={stops} currentStopId={currentStopId} fullScreen />
			)}
		</div>
	)
}

export const Route = createRoute({
	getParentRoute: () => rootRoute,
	path: '/route-overview',
	component: RouteOverviewPage,
})
