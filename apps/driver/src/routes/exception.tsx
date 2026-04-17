import { createRoute } from '@tanstack/react-router'
import { useEffect } from 'react'
import { ExceptionWizard } from '../components/exception/ExceptionWizard'
import { useExceptionStore } from '../stores/exception'
import { Route as rootRoute } from './__root'

function ExceptionScreen() {
	const { deliveryId, stopId } = Route.useSearch()
	const setDelivery = useExceptionStore((s) => s.setDelivery)
	const setGps = useExceptionStore((s) => s.setGps)
	const reset = useExceptionStore((s) => s.reset)

	// Initialize store with delivery context + capture GPS
	useEffect(() => {
		reset()

		if (deliveryId && stopId) {
			setDelivery(deliveryId, stopId)
		}

		// Best-effort GPS capture
		async function captureGps() {
			try {
				const { Geolocation } = await import('@capacitor/geolocation')
				const pos = await Geolocation.getCurrentPosition()
				setGps(pos.coords.latitude, pos.coords.longitude)
			} catch {
				// GPS not available -- continue without
			}
		}

		captureGps()
	}, [deliveryId, stopId, setDelivery, setGps, reset])

	return (
		<div className="flex min-h-dvh flex-col bg-[var(--bg-primary)] pb-[var(--safe-bottom)] pt-[var(--safe-top)]">
			<ExceptionWizard />
		</div>
	)
}

export const Route = createRoute({
	getParentRoute: () => rootRoute,
	path: '/exception',
	validateSearch: (
		search: Record<string, unknown>,
	): { deliveryId?: string; stopId?: string } => ({
		deliveryId:
			typeof search.deliveryId === 'string' ? search.deliveryId : undefined,
		stopId: typeof search.stopId === 'string' ? search.stopId : undefined,
	}),
	component: ExceptionScreen,
})
