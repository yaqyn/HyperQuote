export interface RoadRoutePoint {
	lat: number
	lng: number
}

export type RoadRouteCoordinate = [lng: number, lat: number]

export interface RoadRouteResult {
	coordinates: RoadRouteCoordinate[]
	distanceMeters: number | null
	durationSeconds: number | null
	source: 'fallback' | 'road'
}

export interface ResolveRoadRouteOptions {
	endpoint?: string
	fetcher?: typeof fetch
	points: Array<RoadRoutePoint | null | undefined>
	signal?: AbortSignal
}

const DEFAULT_ROAD_ROUTE_ENDPOINT =
	'https://router.project-osrm.org/route/v1/driving'
const ROUTE_CACHE_MAX_ENTRIES = 80
const routeCache = new Map<string, RoadRouteResult>()

export function buildFallbackRoadRoute(
	points: Array<RoadRoutePoint | null | undefined>,
): RoadRouteResult {
	return {
		coordinates: normalizeRoadRoutePoints(points).map(toRouteCoordinate),
		distanceMeters: null,
		durationSeconds: null,
		source: 'fallback',
	}
}

export function buildRoadRouteKey(
	points: Array<RoadRoutePoint | null | undefined>,
	precision = 5,
): string | null {
	const normalized = normalizeRoadRoutePoints(points)
	if (normalized.length < 2) return null
	return normalized
		.map(
			(point) =>
				`${point.lng.toFixed(precision)},${point.lat.toFixed(precision)}`,
		)
		.join(';')
}

export function buildOsrmRouteUrl(
	points: Array<RoadRoutePoint | null | undefined>,
	endpoint = DEFAULT_ROAD_ROUTE_ENDPOINT,
): string | null {
	const routeKey = buildRoadRouteKey(points, 6)
	if (!routeKey) return null
	const url = new URL(`${normalizeEndpoint(endpoint)}/${routeKey}`)
	url.searchParams.set('overview', 'full')
	url.searchParams.set('geometries', 'geojson')
	url.searchParams.set('alternatives', 'false')
	url.searchParams.set('steps', 'false')
	return url.toString()
}

export async function resolveRoadRoute({
	endpoint = DEFAULT_ROAD_ROUTE_ENDPOINT,
	fetcher = globalThis.fetch,
	points,
	signal,
}: ResolveRoadRouteOptions): Promise<RoadRouteResult> {
	const fallback = buildFallbackRoadRoute(points)
	if (fallback.coordinates.length < 2 || typeof fetcher !== 'function') {
		return fallback
	}

	try {
		const url = buildOsrmRouteUrl(points, endpoint)
		if (!url) return fallback

		const cacheKey = `${normalizeEndpoint(endpoint)}|${buildRoadRouteKey(points, 5)}`
		const cached = routeCache.get(cacheKey)
		if (cached) return cloneRoadRoute(cached)

		const response = await fetcher(url, { signal })
		if (!response.ok) return fallback

		const route = parseOsrmRoute(await response.json())
		if (!route || route.coordinates.length < 2) return fallback

		setCachedRoadRoute(cacheKey, route)
		return cloneRoadRoute(route)
	} catch {
		return fallback
	}
}

export function normalizeBearing(value: number): number {
	return ((value % 360) + 360) % 360
}

export function bearingBetweenPoints(
	from: RoadRoutePoint | null | undefined,
	to: RoadRoutePoint | null | undefined,
): number | null {
	if (!isRoadRoutePoint(from) || !isRoadRoutePoint(to)) return null
	if (
		Math.abs(from.lat - to.lat) < 0.000001 &&
		Math.abs(from.lng - to.lng) < 0.000001
	) {
		return null
	}

	const fromLat = degreesToRadians(from.lat)
	const toLat = degreesToRadians(to.lat)
	const deltaLng = degreesToRadians(to.lng - from.lng)
	const y = Math.sin(deltaLng) * Math.cos(toLat)
	const x =
		Math.cos(fromLat) * Math.sin(toLat) -
		Math.sin(fromLat) * Math.cos(toLat) * Math.cos(deltaLng)

	return normalizeBearing(radiansToDegrees(Math.atan2(y, x)))
}

export function isRoadRoutePoint(point: unknown): point is RoadRoutePoint {
	if (!isRecord(point)) return false
	return (
		typeof point.lat === 'number' &&
		typeof point.lng === 'number' &&
		Number.isFinite(point.lat) &&
		Number.isFinite(point.lng)
	)
}

function normalizeRoadRoutePoints(
	points: Array<RoadRoutePoint | null | undefined>,
): RoadRoutePoint[] {
	const normalized: RoadRoutePoint[] = []
	for (const point of points) {
		if (!isRoadRoutePoint(point)) continue
		const previous = normalized.at(-1)
		if (previous && isSameRoutePoint(previous, point)) continue
		normalized.push({ lat: point.lat, lng: point.lng })
	}
	return normalized
}

function toRouteCoordinate(point: RoadRoutePoint): RoadRouteCoordinate {
	return [point.lng, point.lat]
}

function normalizeEndpoint(endpoint: string): string {
	return endpoint.trim().replace(/\/+$/, '') || DEFAULT_ROAD_ROUTE_ENDPOINT
}

function isSameRoutePoint(a: RoadRoutePoint, b: RoadRoutePoint): boolean {
	return (
		Math.abs(a.lat - b.lat) < 0.000001 && Math.abs(a.lng - b.lng) < 0.000001
	)
}

function parseOsrmRoute(value: unknown): RoadRouteResult | null {
	if (!isRecord(value)) return null
	const routes = value.routes
	if (!Array.isArray(routes) || routes.length === 0) return null
	const [firstRoute] = routes
	if (!isRecord(firstRoute)) return null
	const geometry = firstRoute.geometry
	if (!isRecord(geometry)) return null
	const coordinates = parseCoordinates(geometry.coordinates)
	if (coordinates.length < 2) return null

	return {
		coordinates,
		distanceMeters:
			typeof firstRoute.distance === 'number' &&
			Number.isFinite(firstRoute.distance)
				? firstRoute.distance
				: null,
		durationSeconds:
			typeof firstRoute.duration === 'number' &&
			Number.isFinite(firstRoute.duration)
				? firstRoute.duration
				: null,
		source: 'road',
	}
}

function parseCoordinates(value: unknown): RoadRouteCoordinate[] {
	if (!Array.isArray(value)) return []
	return value.flatMap((entry) => {
		if (!Array.isArray(entry) || entry.length < 2) return []
		const [lng, lat] = entry
		if (
			typeof lat !== 'number' ||
			typeof lng !== 'number' ||
			!Number.isFinite(lat) ||
			!Number.isFinite(lng)
		) {
			return []
		}
		return [[lng, lat] satisfies RoadRouteCoordinate]
	})
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null
}

function setCachedRoadRoute(key: string, route: RoadRouteResult) {
	if (routeCache.size >= ROUTE_CACHE_MAX_ENTRIES) {
		const firstKey = routeCache.keys().next().value
		if (firstKey) routeCache.delete(firstKey)
	}
	routeCache.set(key, cloneRoadRoute(route))
}

function cloneRoadRoute(route: RoadRouteResult): RoadRouteResult {
	return {
		...route,
		coordinates: route.coordinates.map(cloneCoordinate),
	}
}

function cloneCoordinate([lng, lat]: RoadRouteCoordinate): RoadRouteCoordinate {
	return [lng, lat]
}

function degreesToRadians(value: number): number {
	return (value * Math.PI) / 180
}

function radiansToDegrees(value: number): number {
	return (value * 180) / Math.PI
}
