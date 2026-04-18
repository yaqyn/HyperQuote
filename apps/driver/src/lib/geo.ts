/**
 * Spherical geometry helpers. Bearing returned in degrees from north,
 * 0..360 — useful for the compass needle.
 */

import type { Coords } from './types'

const EARTH_RADIUS_KM = 6371

const toRad = (deg: number) => (deg * Math.PI) / 180
const toDeg = (rad: number) => (rad * 180) / Math.PI

export function distanceKm(a: Coords, b: Coords): number {
	const dLat = toRad(b.lat - a.lat)
	const dLng = toRad(b.lng - a.lng)
	const lat1 = toRad(a.lat)
	const lat2 = toRad(b.lat)

	const h =
		Math.sin(dLat / 2) ** 2 +
		Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
	const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
	return EARTH_RADIUS_KM * c
}

export function bearingDeg(from: Coords, to: Coords): number {
	const lat1 = toRad(from.lat)
	const lat2 = toRad(to.lat)
	const dLng = toRad(to.lng - from.lng)
	const y = Math.sin(dLng) * Math.cos(lat2)
	const x =
		Math.cos(lat1) * Math.sin(lat2) -
		Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng)
	return (toDeg(Math.atan2(y, x)) + 360) % 360
}

export function compassPoint(
	deg: number,
): 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW' {
	const idx = Math.round(deg / 45) % 8
	return (['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const)[idx]
}

/**
 * A blunt linear interpolant between origin and destination — used to
 * synthesize a moving-truck position for the dev mock until we hook up
 * @capacitor/geolocation in production.
 */
export function interpolate(a: Coords, b: Coords, t: number): Coords {
	const u = Math.max(0, Math.min(1, t))
	return {
		lat: a.lat + (b.lat - a.lat) * u,
		lng: a.lng + (b.lng - a.lng) * u,
	}
}
