interface AddressCoordinateInput {
	area?: string | null
	city: string
	governorate: string
	street: string
}

interface NominatimSearchResult {
	lat?: string
	lon?: string
}

export interface AddressCoordinates {
	latitude: number | null
	longitude: number | null
}

const GEOCODE_TIMEOUT_MS = 6_000
const EMPTY_COORDINATES: AddressCoordinates = {
	latitude: null,
	longitude: null,
}

function finiteNumberFrom(value: string | undefined): number | null {
	if (!value) return null
	const parsed = Number(value)
	return Number.isFinite(parsed) ? parsed : null
}

function isNominatimSearchResult(
	value: unknown,
): value is NominatimSearchResult {
	return (
		typeof value === 'object' &&
		value !== null &&
		('lat' in value || 'lon' in value)
	)
}

function joinAddressParts(parts: Array<string | null | undefined>): string {
	return parts
		.map((part) => part?.trim())
		.filter((part): part is string => Boolean(part))
		.join(', ')
}

function addressQueries(input: AddressCoordinateInput): string[] {
	const queries = [
		joinAddressParts([
			input.street,
			input.area,
			input.city,
			input.governorate,
			'Egypt',
		]),
		joinAddressParts([input.area, input.city, input.governorate, 'Egypt']),
		joinAddressParts([input.city, input.governorate, 'Egypt']),
		joinAddressParts([input.governorate, 'Egypt']),
	]
	return [...new Set(queries.filter(Boolean))]
}

async function searchAddress(
	query: string,
	signal: AbortSignal,
): Promise<AddressCoordinates> {
	const params = new URLSearchParams({
		countrycodes: 'eg',
		format: 'json',
		limit: '1',
		q: query,
	})
	const response = await fetch(
		`https://nominatim.openstreetmap.org/search?${params.toString()}`,
		{
			headers: {
				Accept: 'application/json',
				'Accept-Language': 'en',
				'User-Agent': 'HyperQuote/1.0 (delivery-address-geocoding)',
			},
			signal,
		},
	)
	if (!response.ok) return EMPTY_COORDINATES

	const results: unknown = await response.json()
	if (!Array.isArray(results)) return EMPTY_COORDINATES
	const first = results.find(isNominatimSearchResult)
	if (!first) return EMPTY_COORDINATES

	const latitude = finiteNumberFrom(first.lat)
	const longitude = finiteNumberFrom(first.lon)
	if (latitude === null || longitude === null) return EMPTY_COORDINATES

	return { latitude, longitude }
}

export async function resolveAddressCoordinates(
	input: AddressCoordinateInput,
): Promise<AddressCoordinates> {
	const queries = addressQueries(input)
	if (queries.length === 0 || typeof fetch !== 'function') {
		return EMPTY_COORDINATES
	}

	const controller = new AbortController()
	const timeoutId = setTimeout(() => controller.abort(), GEOCODE_TIMEOUT_MS)

	try {
		for (const query of queries) {
			const coordinates = await searchAddress(query, controller.signal)
			if (coordinates.latitude !== null && coordinates.longitude !== null) {
				return coordinates
			}
		}
		return EMPTY_COORDINATES
	} catch {
		return EMPTY_COORDINATES
	} finally {
		clearTimeout(timeoutId)
	}
}
