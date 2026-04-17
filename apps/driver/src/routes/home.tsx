import { createRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DriverButton } from '@/components/shared/DriverButton'
import { DriverCard } from '@/components/shared/DriverCard'
import { db } from '@/lib/powersync'
import { useAuthStore } from '@/stores/auth'
import { useShiftStore } from '@/stores/shift'
import { Route as rootRoute } from './__root'

interface RouteData {
	id: string
	driver_id: string
	date: string
	status: string
	total_distance_km: number
	total_weight_kg: number
	estimated_finish: string
	stop_count: number
}

interface RouteStop {
	id: string
	route_id: string
	stop_order: number
	customer_name: string
	address: string
	status: string
	eta: string
	notes: string
	unloading_method: string
}

function HomePage() {
	const { t } = useTranslation('driver')
	const navigate = useNavigate()
	const activeShiftId = useShiftStore((s) => s.activeShiftId)
	const selectedVehicle = useShiftStore((s) => s.selectedVehicle)
	const driverProfile = useAuthStore((s) => s.driverProfile)
	const isExternalDriver = useAuthStore((s) => s.isExternalDriver)
	const [route, setRoute] = useState<RouteData | null>(null)
	const [stops, setStops] = useState<RouteStop[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [dispatchNotes, setDispatchNotes] = useState<string | null>(null)

	// Redirect to shift-start if no active shift
	useEffect(() => {
		if (!activeShiftId) {
			navigate({ to: '/shift-start' })
		}
	}, [activeShiftId, navigate])

	// Load route data from PowerSync
	useEffect(() => {
		const driverId = driverProfile?.id
		if (!driverId) return
		let cancelled = false

		async function loadRouteData() {
			try {
				const today = new Date().toISOString().split('T')[0]
				const routes = await db.getAll<RouteData>(
					"SELECT * FROM routes WHERE driver_id = ? AND date = ? AND status != 'completed' LIMIT 1",
					[driverId, today],
				)

				if (cancelled) return

				if (routes.length > 0) {
					const routeData = routes[0]
					setRoute(routeData)

					const routeStops = await db.getAll<RouteStop>(
						'SELECT * FROM route_stops WHERE route_id = ? ORDER BY stop_order',
						[routeData.id],
					)

					if (!cancelled) {
						setStops(routeStops)
						// Get dispatch notes from first stop
						const withNotes = routeStops.find((s) => s.notes)
						if (withNotes) setDispatchNotes(withNotes.notes)
					}
				}
			} catch {
				// Offline — data may not be available yet
			} finally {
				if (!cancelled) setIsLoading(false)
			}
		}

		loadRouteData()
		return () => {
			cancelled = true
		}
	}, [driverProfile?.id])

	if (!activeShiftId) return null

	const firstStop = stops.length > 0 ? stops[0] : null

	// Build items summary for first stop
	const formatNumber = (num: number) => {
		return new Intl.NumberFormat(undefined, { useGrouping: true }).format(num)
	}

	if (isLoading) {
		return (
			<div className="flex min-h-dvh items-center justify-center">
				<span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[var(--color-blue)] border-t-transparent" />
			</div>
		)
	}

	return (
		<div className="flex min-h-dvh flex-col bg-[var(--bg-primary)] pb-[var(--safe-bottom)]">
			{/* Status badge */}
			<div className="flex items-center justify-between px-4 pt-[var(--safe-top)] pb-2">
				<h1 className="text-xl font-semibold">{t('home.todayRoute')}</h1>
				<span className="rounded-full bg-[var(--color-success)]/10 px-3 py-1 text-xs font-medium text-[var(--color-success)]">
					{t('home.onDuty', 'On Duty - Not Driving')}
				</span>
			</div>

			<div className="flex-1 overflow-y-auto px-4">
				{route ? (
					<div className="flex flex-col gap-4">
						{/* Route summary */}
						<DriverCard>
							<div className="flex flex-col gap-2">
								<div className="flex items-baseline gap-2 text-sm text-[var(--text-secondary)]">
									<span style={{ fontFamily: 'var(--font-mono)' }}>
										{route.stop_count}
									</span>
									<span>{t('home.stops')}</span>
									<span className="text-[var(--text-tertiary)]">|</span>
									<span>
										~
										<span style={{ fontFamily: 'var(--font-mono)' }}>
											{formatNumber(route.total_distance_km)}
										</span>{' '}
										{t('home.km', 'km')}
									</span>
									<span className="text-[var(--text-tertiary)]">|</span>
									<span>
										{t('home.estFinish', 'Est. finish:')}{' '}
										<span style={{ fontFamily: 'var(--font-mono)' }}>
											{route.estimated_finish}
										</span>
									</span>
								</div>
								<div className="text-sm text-[var(--text-secondary)]">
									{t('home.totalWeight', 'Total weight:')}{' '}
									<span style={{ fontFamily: 'var(--font-mono)' }}>
										{formatNumber(route.total_weight_kg)}
									</span>{' '}
									{t('home.kg', 'kg')}
								</div>
							</div>
						</DriverCard>

						{/* First stop preview */}
						{firstStop && (
							<DriverCard
								header={
									<span className="text-sm font-medium text-[var(--text-secondary)]">
										{t('home.firstStop', 'First stop')}
									</span>
								}
							>
								<div className="flex flex-col gap-2">
									<div className="text-lg font-semibold">
										{firstStop.customer_name}
									</div>
									<div className="text-sm text-[var(--text-secondary)]">
										{firstStop.address}
										<span className="text-[var(--text-tertiary)]"> | </span>
										{t('home.eta', 'ETA')}{' '}
										<span style={{ fontFamily: 'var(--font-mono)' }}>
											{firstStop.eta}
										</span>
									</div>
									{firstStop.unloading_method && (
										<div className="text-sm text-[var(--text-secondary)]">
											{firstStop.unloading_method}
										</div>
									)}
								</div>
							</DriverCard>
						)}

						{/* Dispatch notes */}
						{dispatchNotes && (
							<DriverCard
								header={
									<span className="text-sm font-medium text-[var(--text-secondary)]">
										{t('home.dispatchNotes', 'Special notes from dispatch')}
									</span>
								}
							>
								<p className="italic text-sm">"{dispatchNotes}"</p>
							</DriverCard>
						)}

						{/* Start Route button */}
						<DriverButton
							onPress={() => {
								navigate({ to: '/route-overview' })
							}}
						>
							{t('home.startRoute', 'Start Route')}
						</DriverButton>

						{/* Action buttons row */}
						<div className="flex gap-3">
							<DriverButton
								variant="secondary"
								className="flex-1"
								onPress={() => {
									navigate({ to: '/route-overview' })
								}}
							>
								{t('home.viewFullRoute', 'View Full Route')}
							</DriverButton>
							<DriverButton
								variant="secondary"
								className="flex-1"
								onPress={() => {
									// Messaging stub
								}}
							>
								{t('home.messages', 'Messages')}
							</DriverButton>
							<DriverButton
								variant="secondary"
								className="flex-1"
								onPress={() => {
									// Contact dispatch stub
								}}
							>
								{t('home.contactDispatch', 'Contact Dispatch')}
							</DriverButton>
						</div>

						{/* External driver actions */}
						{isExternalDriver && (
							<div className="flex gap-3">
								<DriverButton
									className="flex-1"
									onPress={() => {
										navigate({ to: '/job-offers' })
									}}
								>
									{t('home.jobOffers', 'Job Offers')}
								</DriverButton>
								<DriverButton
									variant="secondary"
									className="flex-1"
									onPress={() => {
										navigate({ to: '/earnings' })
									}}
								>
									{t('home.earnings', 'Earnings')}
								</DriverButton>
							</div>
						)}

						{/* End Shift button — only when shift is active */}
						{activeShiftId && (
							<DriverButton
								variant="danger"
								className="min-h-[56px]"
								onPress={() => {
									navigate({ to: '/end-of-day' })
								}}
							>
								{t('home.endShift', 'End Shift')}
							</DriverButton>
						)}
					</div>
				) : (
					/* No route for today */
					<div className="flex flex-col items-center gap-4 py-12">
						<p className="text-lg text-[var(--text-secondary)]">
							{t('home.noDeliveries')}
						</p>
						<DriverButton
							variant="secondary"
							onPress={() => {
								// Contact dispatch
							}}
						>
							{t('home.contactDispatch', 'Contact Dispatch')}
						</DriverButton>
					</div>
				)}
			</div>

			{/* Vehicle info strip at bottom */}
			{selectedVehicle && (
				<div className="border-t border-[var(--border-color)] px-4 py-3">
					<div className="flex items-center gap-3">
						<span
							className="text-sm font-bold"
							style={{ fontFamily: 'var(--font-mono)' }}
						>
							{selectedVehicle.plate_number}
						</span>
						<span className="text-xs text-[var(--text-secondary)]">
							{selectedVehicle.type} | {selectedVehicle.make}{' '}
							{selectedVehicle.model}
						</span>
					</div>
				</div>
			)}
		</div>
	)
}

export const Route = createRoute({
	getParentRoute: () => rootRoute,
	path: '/home',
	component: HomePage,
})
