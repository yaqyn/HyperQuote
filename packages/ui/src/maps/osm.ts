export interface GeoPoint {
	lat: number
	lng: number
}

export interface ProjectedMapPoint {
	x: number
	y: number
}

export interface OsmTile {
	key: string
	href: string
	x: number
	y: number
}

export interface OsmTileView {
	height: number
	points: ProjectedMapPoint[]
	tiles: OsmTile[]
	width: number
	zoom: number
}

interface OsmTileViewOptions {
	height: number
	maxZoom?: number
	minZoom?: number
	padding?: number
	width: number
}

const OSM_TILE_SIZE = 256
const OSM_DEFAULT_MIN_ZOOM = 3
const OSM_DEFAULT_MAX_ZOOM = 13
const OSM_DEFAULT_PADDING = 72
const OSM_MAX_LATITUDE = 85.05112878

export function isGeoPoint(point: unknown): point is GeoPoint {
	if (typeof point !== 'object' || point === null) return false
	const candidate = point as Partial<GeoPoint>
	return (
		typeof candidate.lat === 'number' &&
		typeof candidate.lng === 'number' &&
		Number.isFinite(candidate.lat) &&
		Number.isFinite(candidate.lng)
	)
}

export function buildOpenStreetMapTileView(
	points: GeoPoint[],
	options: OsmTileViewOptions,
): OsmTileView | null {
	const validPoints = points
		.map(normalizeGeoPoint)
		.filter((point): point is GeoPoint => point !== null)
	if (validPoints.length === 0) return null

	const width = Math.max(1, options.width)
	const height = Math.max(1, options.height)
	const minZoom = options.minZoom ?? OSM_DEFAULT_MIN_ZOOM
	const maxZoom = options.maxZoom ?? OSM_DEFAULT_MAX_ZOOM
	const zoom = chooseOpenStreetMapZoom(validPoints, {
		height,
		maxZoom,
		minZoom,
		padding: options.padding ?? OSM_DEFAULT_PADDING,
		width,
	})
	const projectedPoints = validPoints.map((point) =>
		projectOpenStreetMapPoint(point, zoom),
	)
	const minX = Math.min(...projectedPoints.map((point) => point.x))
	const maxX = Math.max(...projectedPoints.map((point) => point.x))
	const minY = Math.min(...projectedPoints.map((point) => point.y))
	const maxY = Math.max(...projectedPoints.map((point) => point.y))
	const left = (minX + maxX - width) / 2
	const top = (minY + maxY - height) / 2

	return {
		height,
		points: projectedPoints.map((point) => toSvgMapPoint(point, left, top)),
		tiles: buildOpenStreetMapTiles(left, top, zoom, width, height),
		width,
		zoom,
	}
}

function chooseOpenStreetMapZoom(
	points: GeoPoint[],
	options: Required<Omit<OsmTileViewOptions, 'maxZoom' | 'minZoom'>> & {
		maxZoom: number
		minZoom: number
	},
): number {
	for (let zoom = options.maxZoom; zoom >= options.minZoom; zoom--) {
		const projected = points.map((point) =>
			projectOpenStreetMapPoint(point, zoom),
		)
		const spanX =
			Math.max(...projected.map((point) => point.x)) -
			Math.min(...projected.map((point) => point.x))
		const spanY =
			Math.max(...projected.map((point) => point.y)) -
			Math.min(...projected.map((point) => point.y))
		if (
			spanX <= options.width - options.padding &&
			spanY <= options.height - options.padding
		) {
			return zoom
		}
	}
	return options.minZoom
}

function buildOpenStreetMapTiles(
	left: number,
	top: number,
	zoom: number,
	width: number,
	height: number,
): OsmTile[] {
	const tiles: OsmTile[] = []
	const tileCount = 2 ** zoom
	const startX = Math.floor(left / OSM_TILE_SIZE)
	const endX = Math.floor((left + width) / OSM_TILE_SIZE)
	const startY = Math.floor(top / OSM_TILE_SIZE)
	const endY = Math.floor((top + height) / OSM_TILE_SIZE)

	for (let tileX = startX; tileX <= endX; tileX++) {
		for (let tileY = startY; tileY <= endY; tileY++) {
			if (tileY < 0 || tileY >= tileCount) continue
			const wrappedX = ((tileX % tileCount) + tileCount) % tileCount
			tiles.push({
				key: `${zoom}-${wrappedX}-${tileY}`,
				href: `https://tile.openstreetmap.org/${zoom}/${wrappedX}/${tileY}.png`,
				x: tileX * OSM_TILE_SIZE - left,
				y: tileY * OSM_TILE_SIZE - top,
			})
		}
	}

	return tiles
}

function projectOpenStreetMapPoint(
	point: GeoPoint,
	zoom: number,
): ProjectedMapPoint {
	const normalized = normalizeGeoPoint(point)
	const target = normalized ?? { lat: 0, lng: 0 }
	const sinLat = Math.sin((target.lat * Math.PI) / 180)
	const mapSize = OSM_TILE_SIZE * 2 ** zoom

	return {
		x: ((target.lng + 180) / 360) * mapSize,
		y: (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * mapSize,
	}
}

function toSvgMapPoint(
	point: ProjectedMapPoint,
	left: number,
	top: number,
): ProjectedMapPoint {
	return {
		x: point.x - left,
		y: point.y - top,
	}
}

function normalizeGeoPoint(point: GeoPoint): GeoPoint | null {
	if (!isGeoPoint(point)) return null
	return {
		lat: clamp(point.lat, -OSM_MAX_LATITUDE, OSM_MAX_LATITUDE),
		lng: wrapLongitude(point.lng),
	}
}

function wrapLongitude(lng: number): number {
	return ((((lng + 180) % 360) + 360) % 360) - 180
}

function clamp(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, value))
}
