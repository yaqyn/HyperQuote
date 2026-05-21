import { Capacitor } from '@capacitor/core'
import { Geolocation } from '@capacitor/geolocation'
import type { DriverLocation } from './driver-repository'

export interface LocationProvider {
	getCurrentPosition(): Promise<DriverLocation>
}

interface LocationCoordinates {
	accuracy: number
	heading?: number | null
	latitude: number
	longitude: number
	speed?: number | null
}

const LOCATION_CACHE_MAX_AGE_MS = 5_000
const LOCATION_TIMEOUT_MS = 10_000

export class DeviceLocationProvider implements LocationProvider {
	async getCurrentPosition(): Promise<DriverLocation> {
		if (Capacitor.isNativePlatform()) {
			try {
				const position = await Geolocation.getCurrentPosition({
					enableHighAccuracy: true,
					timeout: LOCATION_TIMEOUT_MS,
					maximumAge: LOCATION_CACHE_MAX_AGE_MS,
				})
				return toDriverLocation(position.coords, 'native')
			} catch {
				throw new Error('Driver location permission or GPS is required')
			}
		}

		if (typeof navigator !== 'undefined' && navigator.geolocation) {
			try {
				const position = await getBrowserPosition()
				return toDriverLocation(position.coords, 'browser')
			} catch {
				throw new Error('Driver location permission or GPS is required')
			}
		}

		throw new Error('Driver location is unavailable in this browser')
	}
}

function getBrowserPosition(): Promise<GeolocationPosition> {
	return new Promise((resolve, reject) => {
		navigator.geolocation.getCurrentPosition(resolve, reject, {
			enableHighAccuracy: true,
			maximumAge: LOCATION_CACHE_MAX_AGE_MS,
			timeout: LOCATION_TIMEOUT_MS,
		})
	})
}

function toDriverLocation(
	coords: LocationCoordinates,
	source: DriverLocation['source'],
): DriverLocation {
	const location: DriverLocation = {
		accuracyMeters: coords.accuracy,
		latitude: coords.latitude,
		longitude: coords.longitude,
		recordedAt: new Date().toISOString(),
		source,
	}

	if (coords.heading !== null && coords.heading !== undefined)
		location.heading = coords.heading
	if (coords.speed !== null && coords.speed !== undefined)
		location.speedKmh = coords.speed * 3.6

	return location
}

export const locationProvider = new DeviceLocationProvider()
