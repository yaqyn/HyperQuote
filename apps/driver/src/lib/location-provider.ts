import { Capacitor } from '@capacitor/core'
import { Geolocation } from '@capacitor/geolocation'
import type { DriverLocation } from './driver-repository'
import { DEFAULT_DRIVER_LOCATION } from './mock-data'

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

export class DeviceLocationProvider implements LocationProvider {
	async getCurrentPosition(): Promise<DriverLocation> {
		if (Capacitor.isNativePlatform()) {
			try {
				const position = await Geolocation.getCurrentPosition({
					enableHighAccuracy: true,
					timeout: 10_000,
					maximumAge: 30_000,
				})
				return toDriverLocation(position.coords, 'native')
			} catch {
				return currentMockLocation()
			}
		}

		if (typeof navigator !== 'undefined' && navigator.geolocation) {
			try {
				const position = await getBrowserPosition()
				return toDriverLocation(position.coords, 'browser')
			} catch {
				return currentMockLocation()
			}
		}

		return currentMockLocation()
	}
}

function getBrowserPosition(): Promise<GeolocationPosition> {
	return new Promise((resolve, reject) => {
		navigator.geolocation.getCurrentPosition(resolve, reject, {
			enableHighAccuracy: true,
			maximumAge: 30_000,
			timeout: 10_000,
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

function currentMockLocation(): DriverLocation {
	return {
		...DEFAULT_DRIVER_LOCATION,
		recordedAt: new Date().toISOString(),
	}
}

export const locationProvider = new DeviceLocationProvider()
