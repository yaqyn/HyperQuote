import { Capacitor } from '@capacitor/core'
import { Geolocation } from '@capacitor/geolocation'
import type { DriverLocation } from './driver-repository'

export interface LocationProvider {
	getCurrentPosition(): Promise<DriverLocation>
	watchPosition(
		onLocation: (location: DriverLocation) => void,
		onError?: (error: Error) => void,
	): Promise<() => void>
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
const LOCATION_WATCH_MIN_INTERVAL_MS = 1_000

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

	async watchPosition(
		onLocation: (location: DriverLocation) => void,
		onError?: (error: Error) => void,
	): Promise<() => void> {
		if (Capacitor.isNativePlatform()) {
			let stopped = false
			const callbackId = await Geolocation.watchPosition(
				{
					enableHighAccuracy: true,
					maximumAge: LOCATION_CACHE_MAX_AGE_MS,
					minimumUpdateInterval: LOCATION_WATCH_MIN_INTERVAL_MS,
					timeout: LOCATION_TIMEOUT_MS,
				},
				(position, error) => {
					if (stopped) return
					if (error) {
						onError?.(toLocationError(error))
						return
					}
					if (!position) return
					onLocation(toDriverLocation(position.coords, 'native'))
				},
			)

			return () => {
				stopped = true
				void Geolocation.clearWatch({ id: callbackId })
			}
		}

		if (typeof navigator !== 'undefined' && navigator.geolocation) {
			const watchId = navigator.geolocation.watchPosition(
				(position) => onLocation(toDriverLocation(position.coords, 'browser')),
				(error) => onError?.(toLocationError(error)),
				{
					enableHighAccuracy: true,
					maximumAge: LOCATION_CACHE_MAX_AGE_MS,
					timeout: LOCATION_TIMEOUT_MS,
				},
			)

			return () => navigator.geolocation.clearWatch(watchId)
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

function toLocationError(error: unknown): Error {
	if (error instanceof Error) return error
	if (
		typeof error === 'object' &&
		error !== null &&
		'message' in error &&
		typeof error.message === 'string'
	) {
		return new Error(error.message)
	}
	return new Error('Driver location permission or GPS is required')
}

export const locationProvider = new DeviceLocationProvider()
