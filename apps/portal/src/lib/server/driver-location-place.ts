import type { getAuthenticatedPortalCustomer } from './_supabase'

interface DriverPoint {
	lat: number
	lng: number
}

interface CoordinateCacheKey {
	latitude: number
	longitude: number
}

interface NominatimReverseResult {
	address?: Record<string, unknown>
	display_name?: unknown
	name?: unknown
}

type PortalSupabase = Awaited<
	ReturnType<typeof getAuthenticatedPortalCustomer>
>['supabase']

const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000
const COORDINATE_DECIMALS = 4
const REVERSE_GEOCODE_TIMEOUT_MS = 4_000
const NOMINATIM_REVERSE_URL = 'https://nominatim.openstreetmap.org/reverse'

const PRIMARY_PLACE_KEYS = [
	'road',
	'pedestrian',
	'footway',
	'neighbourhood',
	'suburb',
	'quarter',
	'city_district',
	'district',
	'borough',
	'amenity',
	'building',
] as const
const SECONDARY_PLACE_KEYS = [
	'neighbourhood',
	'suburb',
	'quarter',
	'city_district',
	'district',
	'borough',
] as const
const CITY_PLACE_KEYS = ['city', 'town', 'village', 'municipality'] as const
const REGION_PLACE_KEYS = ['state', 'county', 'governorate'] as const

export async function resolveDriverPlaceName(
	supabase: PortalSupabase,
	point: DriverPoint | null,
): Promise<string | null> {
	if (!point || !isFinitePoint(point)) return null

	const key = coordinateCacheKey(point)
	const cached = await readCachedPlaceName(supabase, key)
	if (cached) return cached

	const placeName = await reverseGeocodePlaceName(point)
	if (!placeName) return null

	await writeCachedPlaceName(supabase, key, placeName)
	return placeName
}

export function placeNameFromNominatimResult(value: unknown): string | null {
	if (!isNominatimReverseResult(value)) return null

	const address = value.address ?? {}
	const primary = firstAddressPart(address, PRIMARY_PLACE_KEYS)
	const secondary = addressParts(address, SECONDARY_PLACE_KEYS).slice(0, 2)
	const city = firstAddressPart(address, CITY_PLACE_KEYS)
	const region = firstAddressPart(address, REGION_PLACE_KEYS)
	const structured = uniquePlaceParts([
		primary,
		...secondary,
		city,
		region,
	]).slice(0, 4)
	if (structured.length > 0) return structured.join(', ')

	const name = cleanPlacePart(value.name)
	if (name) return name

	const displayName = cleanDisplayName(value.display_name)
	return displayName.length > 0 ? displayName.join(', ') : null
}

async function readCachedPlaceName(
	supabase: PortalSupabase,
	key: CoordinateCacheKey,
): Promise<string | null> {
	const { data, error } = await supabase
		.from('driver_location_place_cache')
		.select('place_name')
		.eq('latitude_key', key.latitude)
		.eq('longitude_key', key.longitude)
		.gt('expires_at', new Date().toISOString())
		.maybeSingle()

	if (error) return null
	return cleanPlacePart(data?.place_name)
}

async function writeCachedPlaceName(
	supabase: PortalSupabase,
	key: CoordinateCacheKey,
	placeName: string,
): Promise<void> {
	const resolvedAt = new Date()
	const expiresAt = new Date(resolvedAt.getTime() + CACHE_TTL_MS)
	await supabase.from('driver_location_place_cache').upsert(
		{
			expires_at: expiresAt.toISOString(),
			latitude_key: key.latitude,
			longitude_key: key.longitude,
			place_name: placeName,
			provider: 'nominatim',
			resolved_at: resolvedAt.toISOString(),
		},
		{ onConflict: 'latitude_key,longitude_key' },
	)
}

async function reverseGeocodePlaceName(
	point: DriverPoint,
): Promise<string | null> {
	if (typeof fetch !== 'function') return null

	const controller = new AbortController()
	const timeoutId = setTimeout(
		() => controller.abort(),
		REVERSE_GEOCODE_TIMEOUT_MS,
	)

	try {
		const params = new URLSearchParams({
			addressdetails: '1',
			format: 'jsonv2',
			lat: String(point.lat),
			lon: String(point.lng),
			zoom: '18',
		})
		const response = await fetch(`${NOMINATIM_REVERSE_URL}?${params}`, {
			headers: {
				Accept: 'application/json',
				'Accept-Language': 'en',
				'User-Agent': 'HyperQuote/1.0 (driver-location-reverse-geocoding)',
			},
			signal: controller.signal,
		})
		if (!response.ok) return null

		return placeNameFromNominatimResult(await response.json())
	} catch {
		return null
	} finally {
		clearTimeout(timeoutId)
	}
}

function coordinateCacheKey(point: DriverPoint): CoordinateCacheKey {
	return {
		latitude: roundCoordinate(point.lat),
		longitude: roundCoordinate(point.lng),
	}
}

function roundCoordinate(value: number): number {
	return Number(value.toFixed(COORDINATE_DECIMALS))
}

function firstAddressPart(
	address: Record<string, unknown>,
	keys: readonly string[],
): string | null {
	for (const key of keys) {
		const part = cleanPlacePart(address[key])
		if (part) return part
	}
	return null
}

function addressParts(
	address: Record<string, unknown>,
	keys: readonly string[],
): string[] {
	return uniquePlaceParts(keys.map((key) => cleanPlacePart(address[key])))
}

function cleanDisplayName(value: unknown): string[] {
	if (typeof value !== 'string') return []
	return uniquePlaceParts(value.split(',').map(cleanPlacePart)).slice(0, 3)
}

function uniquePlaceParts(parts: Array<string | null>): string[] {
	const seen = new Set<string>()
	const unique: string[] = []
	for (const part of parts) {
		if (!part) continue
		const key = part.toLocaleLowerCase('en')
		if (seen.has(key)) continue
		seen.add(key)
		unique.push(part)
	}
	return unique
}

function cleanPlacePart(value: unknown): string | null {
	if (typeof value !== 'string') return null
	const cleaned = value.replace(/\s+/g, ' ').trim()
	if (!cleaned) return null
	if (/^\d+(?:-\d+)?$/.test(cleaned)) return null
	if (/^(?:egypt|driver|driver[-_ ]?\d+|truck[-_ ]?\d+)$/i.test(cleaned)) {
		return null
	}
	if (
		/^(?:QR|RFQ|REQ|ORD|ORDER|QUOTE|DEL|DLV|DELIVERY)[-_ ]?\d/i.test(cleaned)
	) {
		return null
	}
	return cleaned
}

function isNominatimReverseResult(
	value: unknown,
): value is NominatimReverseResult {
	return typeof value === 'object' && value !== null
}

function isFinitePoint(point: DriverPoint): boolean {
	return Number.isFinite(point.lat) && Number.isFinite(point.lng)
}
