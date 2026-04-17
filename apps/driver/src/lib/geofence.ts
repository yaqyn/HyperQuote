import BackgroundGeolocation, {
	type DesiredAccuracy,
	type Geofence,
	type Subscription,
} from '@transistorsoft/capacitor-background-geolocation'

// DesiredAccuracy.High = -1 (canonical runtime value). Typed via the enum union.
const DESIRED_ACCURACY_HIGH = -1 satisfies DesiredAccuracy

/**
 * Configure background geolocation with high accuracy,
 * distanceFilter 10m, stopOnTerminate false.
 */
export async function initBackgroundGeolocation() {
	await BackgroundGeolocation.ready({
		geolocation: {
			desiredAccuracy: DESIRED_ACCURACY_HIGH,
			distanceFilter: 10,
		},
		app: {
			stopOnTerminate: false,
			startOnBoot: false,
			enableHeadless: true,
			heartbeatInterval: 60,
		},
	})
}

/**
 * Create geofences at each stop location.
 * Uses DWELL event (loiteringDelay 120s = 2 min) for auto-arrival
 * to avoid GPS jitter re-triggers.
 */
export async function addStopGeofences(
	stops: Array<{ id: string; lat: number; lng: number; radius?: number }>,
) {
	const geofences: Geofence[] = stops.map((stop) => ({
		identifier: stop.id,
		radius: stop.radius ?? 200,
		latitude: stop.lat,
		longitude: stop.lng,
		notifyOnEntry: true,
		notifyOnExit: true,
		notifyOnDwell: true,
		loiteringDelay: 120000,
	}))

	await BackgroundGeolocation.addGeofences(geofences)
}

export interface GeofenceEvent {
	identifier: string
	action: string // ENTER, EXIT, DWELL
}

/**
 * Subscribe to geofence ENTER/EXIT/DWELL events.
 * Returns a subscription that can be unsubscribed.
 */
export function onGeofenceEvent(
	callback: (event: GeofenceEvent) => void,
): Subscription {
	return BackgroundGeolocation.onGeofence((event) => {
		callback({
			identifier: event.identifier,
			action: event.action,
		})
	})
}

/** Start background GPS tracking. */
export async function startTracking() {
	await BackgroundGeolocation.start()
}

/** Stop background GPS tracking. */
export async function stopTracking() {
	await BackgroundGeolocation.stop()
}

/** Get current lat/lng. */
export async function getCurrentPosition(): Promise<{
	lat: number
	lng: number
	accuracy: number
}> {
	const location = await BackgroundGeolocation.getCurrentPosition({})
	return {
		lat: location.coords.latitude,
		lng: location.coords.longitude,
		accuracy: location.coords.accuracy,
	}
}
