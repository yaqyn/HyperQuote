/**
 * Dispatch map — the shared street map under the horizon panel. Warehouse
 * as a hairline ring, destinations as high-contrast orange monograms, roads
 * as thick solid blue highlights, trucks as blue dots, and overdue work as
 * dark red.
 *
 * MUST be wrapped in ClientOnly at call site.
 */

import { loadMapLibre } from '@hyperquote/ui/maps/maplibre-runtime'
import {
	buildOpenStreetMapTileView,
	type GeoPoint,
} from '@hyperquote/ui/maps/osm'
import {
	type RoadRouteCoordinate,
	resolveRoadRoute,
} from '@hyperquote/ui/maps/road-route'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { MapRef } from 'react-map-gl/maplibre'
import MapGL, { Layer, Marker, Source } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import { MAP_STYLE } from '../../lib/map-style'
import type { DispatchRouteView } from '../../lib/server/dispatch'

interface DispatchMapProps {
	routes: DispatchRouteView[]
	selectedQuoteId: string | null
	onSelectRoute: (quoteId: string) => void
}

interface ResolvedDispatchRoute {
	destination: GeoPoint | null
	route: DispatchRouteView
	trucks: Array<{
		position: GeoPoint | null
		truck: DispatchRouteView['trucks'][number]
	}>
}

interface DispatchMapFallbackProps extends DispatchMapProps {
	resolvedRoutes: ResolvedDispatchRoute[]
}

interface DispatchRoadRoutePair {
	isOverdue: boolean
	points: [GeoPoint, GeoPoint]
	quoteId: string
}

interface DispatchRouteFeatureCollection {
	type: 'FeatureCollection'
	features: Array<{
		type: 'Feature'
		properties: { isOverdue: boolean; quoteId: string }
		geometry: {
			type: 'LineString'
			coordinates: RoadRouteCoordinate[]
		}
	}>
}

const DISPATCH_STATIC_MAP_WIDTH = 1200
const DISPATCH_STATIC_MAP_HEIGHT = 720
const DISPATCH_ROUTE_BLUE = '#1D4ED8'
const DISPATCH_DELIVERY_ORANGE = '#EA580C'
const DISPATCH_OVERDUE_RED = '#7F1D1D'
const DISPATCH_MAP_PAPER = '#FAFAFA'
const DISPATCH_ROUTE_LINE_WIDTH = 5

function canUseInteractiveMap(): boolean {
	const canvas = document.createElement('canvas')
	return Boolean(
		canvas.getContext('webgl') ?? canvas.getContext('experimental-webgl'),
	)
}

function pointFrom(lat: number | null, lng: number | null) {
	if (
		typeof lat === 'number' &&
		typeof lng === 'number' &&
		Number.isFinite(lat) &&
		Number.isFinite(lng)
	) {
		return { lat, lng }
	}
	return null
}

function emptyDispatchRouteFeatureCollection(): DispatchRouteFeatureCollection {
	return { features: [], type: 'FeatureCollection' }
}

export function DispatchMap({
	routes,
	selectedQuoteId,
	onSelectRoute,
}: DispatchMapProps) {
	const mapRef = useRef<MapRef>(null)
	const [mapLoaded, setMapLoaded] = useState(false)
	const [mapFailed, setMapFailed] = useState(false)
	const [interactiveMapReady, setInteractiveMapReady] = useState<
		boolean | null
	>(null)

	useEffect(() => {
		setInteractiveMapReady(canUseInteractiveMap())
	}, [])

	const handleDriverClick = useCallback(
		(quoteId: string, lat: number, lng: number) => {
			onSelectRoute(quoteId)
			mapRef.current?.flyTo({
				center: [lng, lat],
				zoom: 13,
				duration: 800,
			})
		},
		[onSelectRoute],
	)

	const resolvedRoutes: ResolvedDispatchRoute[] = useMemo(
		() =>
			routes.map((route) => ({
				destination: pointFrom(route.deliveryLat, route.deliveryLng),
				route,
				trucks: route.trucks.map((truck) => ({
					position: pointFrom(truck.driverLat, truck.driverLng),
					truck,
				})),
			})),
		[routes],
	)
	const roadRoutePairs = useMemo<DispatchRoadRoutePair[]>(
		() =>
			resolvedRoutes.flatMap(({ destination, route, trucks }) => {
				if (!destination) return []
				return trucks.flatMap(({ position }) =>
					position
						? [
								{
									isOverdue: route.isOverdue,
									points: [position, destination],
									quoteId: route.quoteId,
								},
							]
						: [],
				)
			}),
		[resolvedRoutes],
	)
	const [roadRouteLinesGeoJSON, setRoadRouteLinesGeoJSON] =
		useState<DispatchRouteFeatureCollection>(() =>
			emptyDispatchRouteFeatureCollection(),
		)

	useEffect(() => {
		if (roadRoutePairs.length === 0) {
			setRoadRouteLinesGeoJSON(emptyDispatchRouteFeatureCollection())
			return
		}

		const controller = new AbortController()
		void Promise.all(
			roadRoutePairs.map(async (routePair) => {
				const route = await resolveRoadRoute({
					endpoint: import.meta.env.VITE_ROAD_ROUTE_ENDPOINT,
					points: routePair.points,
					signal: controller.signal,
				})
				return {
					geometry: {
						coordinates: route.coordinates,
						type: 'LineString' as const,
					},
					properties: {
						isOverdue: routePair.isOverdue,
						quoteId: routePair.quoteId,
					},
					type: 'Feature' as const,
				}
			}),
		).then((features) => {
			if (controller.signal.aborted) return
			setRoadRouteLinesGeoJSON({
				features,
				type: 'FeatureCollection',
			})
		})

		return () => controller.abort()
	}, [roadRoutePairs])

	if (interactiveMapReady === false || mapFailed) {
		return (
			<DispatchMapFallback
				routes={routes}
				resolvedRoutes={resolvedRoutes}
				selectedQuoteId={selectedQuoteId}
				onSelectRoute={onSelectRoute}
			/>
		)
	}

	if (interactiveMapReady === null) {
		return (
			<div className="dispatch-theme dispatch-paper flex h-full w-full items-center justify-center">
				<div
					className="h-px w-[80px] animate-horizon-draw"
					style={{ backgroundColor: 'var(--ink-ghost)' }}
				/>
			</div>
		)
	}

	const routeMarkers = resolvedRoutes.flatMap(({ destination, route }) =>
		destination ? [{ route, destination }] : [],
	)
	const truckMarkers = resolvedRoutes.flatMap(({ route, trucks }) =>
		trucks
			.map((truck) => ({
				position: truck.position,
				route,
				truck: truck.truck,
			}))
			.filter(
				(
					entry,
				): entry is {
					position: { lat: number; lng: number }
					route: DispatchRouteView
					truck: DispatchRouteView['trucks'][number]
				} => entry.position !== null,
			),
	)
	const mapCenter =
		truckMarkers[0]?.position ?? routeMarkers[0]?.destination ?? null

	if (!mapCenter) {
		return (
			<DispatchMapFallback
				routes={routes}
				resolvedRoutes={resolvedRoutes}
				selectedQuoteId={selectedQuoteId}
				onSelectRoute={onSelectRoute}
			/>
		)
	}

	return (
		<div className="dispatch-theme relative z-0 isolate h-full w-full">
			{!mapLoaded && (
				<div className="absolute inset-0 z-10">
					<DispatchMapFallback
						routes={routes}
						resolvedRoutes={resolvedRoutes}
						selectedQuoteId={selectedQuoteId}
						onSelectRoute={onSelectRoute}
					/>
					<div
						className="absolute left-1/2 top-1/2 h-px w-[80px] -translate-x-1/2 -translate-y-1/2 animate-horizon-draw"
						style={{ backgroundColor: 'var(--ink-ghost)' }}
					/>
				</div>
			)}
			<div className="h-full w-full">
				<MapGL
					mapLib={loadMapLibre()}
					ref={mapRef}
					mapStyle={MAP_STYLE}
					initialViewState={{
						latitude: mapCenter.lat,
						longitude: mapCenter.lng,
						zoom: 10,
					}}
					style={{ width: '100%', height: '100%' }}
					onLoad={() => setMapLoaded(true)}
					onError={() => setMapFailed(true)}
					attributionControl={false}
					minZoom={6}
					maxZoom={18}
				>
					{/* Route lines — solid brand-blue road highlights */}
					{mapLoaded && (
						<Source
							id="dispatch-routes"
							type="geojson"
							data={roadRouteLinesGeoJSON}
						>
							<Layer
								id="dispatch-route-lines"
								type="line"
								paint={{
									'line-color': DISPATCH_ROUTE_BLUE,
									'line-width': DISPATCH_ROUTE_LINE_WIDTH,
									'line-opacity': 0.86,
								}}
							/>
						</Source>
					)}

					{/* Delivery pins — high-contrast orange/dark-red monograms */}
					{routeMarkers.map(({ route: r, destination }) => {
						const isSelected = selectedQuoteId === r.quoteId
						const initial = (r.customerName.trim()[0] ?? '•').toUpperCase()
						const pinFill = isSelected
							? DISPATCH_ROUTE_BLUE
							: r.isOverdue
								? DISPATCH_OVERDUE_RED
								: DISPATCH_DELIVERY_ORANGE
						return (
							<Marker
								key={`dest-${r.quoteId}`}
								latitude={destination.lat}
								longitude={destination.lng}
								anchor="bottom"
								onClick={(e) => {
									e.originalEvent.stopPropagation()
									handleDriverClick(r.quoteId, destination.lat, destination.lng)
								}}
							>
								<button
									type="button"
									aria-label={`Open dispatch order ${r.quoteNumber} for ${r.customerName}`}
									className="cursor-pointer border-0 bg-transparent p-0"
									onClick={() =>
										handleDriverClick(
											r.quoteId,
											destination.lat,
											destination.lng,
										)
									}
								>
									<div className="flex flex-col items-center">
										<div
											className="flex h-9 w-9 items-center justify-center rounded-full shadow-[0_6px_14px_-4px_rgba(20,15,10,0.35)]"
											style={{
												backgroundColor: pinFill,
												border: `2px solid ${DISPATCH_MAP_PAPER}`,
												color: '#FFFFFF',
												fontFamily: 'Literata, serif',
												fontSize: '15px',
												fontWeight: 500,
												letterSpacing: '-0.02em',
												transition: 'transform 160ms ease',
												transform: isSelected ? 'scale(1.08)' : 'scale(1)',
											}}
										>
											{initial}
										</div>
										<div
											className="mt-1 hidden max-w-[120px] truncate px-2 py-0.5 sm:block"
											style={{
												backgroundColor: 'rgba(250, 250, 250, 0.92)',
												backdropFilter: 'blur(2px)',
												fontFamily: 'Archivo, sans-serif',
												fontStyle: 'italic',
												fontSize: '10px',
												color: '#111111',
												letterSpacing: '-0.005em',
											}}
										>
											{r.customerName.split(' ')[0]?.toLowerCase() ??
												'customer'}
										</div>
									</div>
								</button>
							</Marker>
						)
					})}

					{/* Driver dots — blue when moving, dark red when overdue */}
					{truckMarkers.map(({ route: r, truck, position }) => {
						const isSelected = selectedQuoteId === r.quoteId
						const fill = r.isOverdue
							? DISPATCH_OVERDUE_RED
							: DISPATCH_ROUTE_BLUE
						return (
							<Marker
								key={`driver-${r.quoteId}-${truck.truckId}`}
								latitude={position.lat}
								longitude={position.lng}
								anchor="center"
								onClick={(e) => {
									e.originalEvent.stopPropagation()
									handleDriverClick(r.quoteId, position.lat, position.lng)
								}}
							>
								<button
									type="button"
									aria-label={`Open live truck ${truck.plateNumber} for ${r.customerName}`}
									className="cursor-pointer border-0 bg-transparent p-0"
									onClick={() =>
										handleDriverClick(r.quoteId, position.lat, position.lng)
									}
								>
									<div className="relative flex items-center justify-center">
										<div
											className="absolute h-7 w-7 animate-ping rounded-full"
											style={{ backgroundColor: fill, opacity: 0.22 }}
										/>
										<div
											className="relative h-[14px] w-[14px] rounded-full shadow-[0_4px_10px_-3px_rgba(20,15,10,0.4)]"
											style={{
												backgroundColor: fill,
												border: `2px solid ${DISPATCH_MAP_PAPER}`,
												transform: isSelected ? 'scale(1.25)' : 'scale(1)',
												transition: 'transform 160ms ease',
											}}
										/>
									</div>
									<div
										className="mt-1 hidden max-w-[100px] truncate px-1.5 py-0.5 sm:block"
										style={{
											backgroundColor: 'rgba(17, 17, 17, 0.82)',
											fontFamily: 'IBM Plex Mono, monospace',
											fontSize: '8.5px',
											color: '#FAFAFA',
											letterSpacing: '0.06em',
											textAlign: 'center',
										}}
									>
										{truck.plateNumber}
									</div>
								</button>
							</Marker>
						)
					})}
				</MapGL>
			</div>
		</div>
	)
}

function DispatchMapFallback({
	routes,
	resolvedRoutes,
	selectedQuoteId,
	onSelectRoute,
}: DispatchMapFallbackProps) {
	const geoEntries = buildDispatchGeoEntries(resolvedRoutes)
	const mapView = buildOpenStreetMapTileView(
		geoEntries.map((entry) => entry.point),
		{
			height: DISPATCH_STATIC_MAP_HEIGHT,
			maxZoom: 13,
			minZoom: 9,
			padding: 96,
			width: DISPATCH_STATIC_MAP_WIDTH,
		},
	)
	const mapPositionByKey = new Map(
		mapView
			? geoEntries.map((entry, index) => {
					const projected = mapView.points[index]
					return [
						entry.key,
						projected
							? {
									left: (projected.x / mapView.width) * 100,
									top: (projected.y / mapView.height) * 100,
								}
							: null,
					] as const
				})
			: [],
	)
	const projection = mapView ? null : buildFallbackProjection(resolvedRoutes)
	const orderMarkers = resolvedRoutes.map(
		({ destination, route }, routeIndex) => {
			const geoPosition = mapPositionByKey.get(`dest-${route.quoteId}`) ?? null
			return {
				destination,
				position:
					geoPosition ??
					(destination && projection?.(destination)) ??
					fallbackIndexedPosition(routeIndex, 0, 'destination'),
				route,
				routeIndex,
			}
		},
	)
	const truckMarkers = resolvedRoutes.flatMap(
		({ destination, route, trucks }, routeIndex) =>
			trucks.map(({ position: driverPosition, truck }, truckIndex) => {
				const geoPosition =
					mapPositionByKey.get(`truck-${route.quoteId}-${truck.truckId}`) ??
					null
				return {
					destination,
					position:
						geoPosition ??
						(driverPosition && projection?.(driverPosition)) ??
						fallbackIndexedPosition(routeIndex, truckIndex, 'truck'),
					route,
					routeIndex,
					truck,
					truckIndex,
				}
			}),
	)
	const destinationPositionByRoute = new Map(
		orderMarkers.map((marker) => [marker.route.quoteId, marker.position]),
	)
	const routeLines = truckMarkers.flatMap((marker) => {
		const destination = destinationPositionByRoute.get(marker.route.quoteId)
		if (!destination) return []
		return [
			{
				destination,
				origin: marker.position,
				route: marker.route,
				truckId: marker.truck.truckId,
			},
		]
	})

	return (
		<div className="dispatch-theme dispatch-paper relative z-0 isolate h-full w-full overflow-hidden">
			{mapView ? <DispatchOsmBackdrop mapView={mapView} /> : null}
			{!mapView && (
				<div
					aria-hidden="true"
					className="absolute inset-0"
					style={{
						background:
							'linear-gradient(90deg, rgba(17,17,17,0.045) 1px, transparent 1px), linear-gradient(0deg, rgba(17,17,17,0.045) 1px, transparent 1px)',
						backgroundSize: '54px 54px',
					}}
				/>
			)}
			<svg
				aria-hidden="true"
				className="absolute inset-0 h-full w-full"
				preserveAspectRatio="none"
				viewBox="0 0 100 100"
			>
				{routeLines.map(({ destination, origin, route, truckId }) => (
					<line
						key={`fallback-line-${route.quoteId}-${truckId}`}
						x1={origin.left}
						y1={origin.top}
						x2={destination.left}
						y2={destination.top}
						stroke={DISPATCH_ROUTE_BLUE}
						strokeLinecap="round"
						strokeOpacity="0.86"
						strokeWidth={DISPATCH_ROUTE_LINE_WIDTH}
						vectorEffect="non-scaling-stroke"
					/>
				))}
			</svg>
			{orderMarkers.map(({ position, route, routeIndex }) => {
				const isSelected = selectedQuoteId === route.quoteId
				const left = `${position.left}%`
				const top = `${position.top}%`
				return (
					<button
						key={`fallback-order-${route.quoteId}`}
						type="button"
						aria-label={`Open dispatch order ${route.quoteNumber} for ${route.customerName}`}
						onClick={() => onSelectRoute(route.quoteId)}
						className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 outline-none focus-visible:ring-2 focus-visible:ring-[var(--motion)]/35"
						style={{ left, top, zIndex: 10 + routeIndex }}
					>
						<span
							className="flex h-9 w-9 items-center justify-center rounded-full font-[family-name:var(--font-literata)] shadow-[0_6px_14px_-4px_rgba(20,15,10,0.28)]"
							style={{
								backgroundColor: isSelected
									? DISPATCH_ROUTE_BLUE
									: route.isOverdue
										? DISPATCH_OVERDUE_RED
										: DISPATCH_DELIVERY_ORANGE,
								border: `2px solid ${DISPATCH_MAP_PAPER}`,
								color: '#FFFFFF',
								fontSize: '14px',
								fontWeight: 500,
								letterSpacing: 0,
							}}
						>
							{(route.customerName.trim()[0] ?? '•').toUpperCase()}
						</span>
						<span
							className="max-w-[130px] truncate px-2 py-0.5 font-[family-name:var(--font-archivo)]"
							style={{
								backgroundColor: 'rgba(250,250,250,0.88)',
								color: '#111111',
								fontSize: '9px',
							}}
						>
							{route.customerName.split(' ')[0]?.toLowerCase() ?? 'customer'}
						</span>
					</button>
				)
			})}
			{truckMarkers.map(
				({ position, route, routeIndex, truck, truckIndex }) => {
					const left = `${position.left}%`
					const top = `${position.top}%`
					return (
						<button
							key={`${route.quoteId}-${truck.truckId}`}
							type="button"
							aria-label={`Open live truck ${truck.plateNumber} for ${route.customerName}`}
							onClick={() => onSelectRoute(route.quoteId)}
							className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 outline-none focus-visible:ring-2 focus-visible:ring-[var(--motion)]/35"
							style={{
								left,
								top,
								zIndex: 20 + routeIndex * 4 + truckIndex,
							}}
						>
							<span
								className="flex h-10 w-10 items-center justify-center rounded-full font-[family-name:var(--font-literata)] shadow-[0_6px_14px_-4px_rgba(20,15,10,0.35)]"
								style={{
									backgroundColor: route.isOverdue
										? DISPATCH_OVERDUE_RED
										: DISPATCH_ROUTE_BLUE,
									border: `2px solid ${DISPATCH_MAP_PAPER}`,
									color: '#FFFFFF',
									fontSize: '15px',
									fontWeight: 500,
									letterSpacing: 0,
								}}
							>
								{(route.customerName.trim()[0] ?? '•').toUpperCase()}
							</span>
							<span
								className="max-w-[130px] truncate px-2 py-0.5 font-[family-name:var(--font-plex-mono)] tabular-nums"
								style={{
									backgroundColor: 'rgba(17,17,17,0.82)',
									color: '#FAFAFA',
									fontSize: '8.5px',
									letterSpacing: '0.06em',
								}}
							>
								{truck.plateNumber}
							</span>
						</button>
					)
				},
			)}
			{routes.length === 0 && (
				<div className="absolute inset-x-6 top-1/2 z-10 -translate-y-1/2 text-center">
					<p
						className="font-[family-name:var(--font-archivo)] italic"
						style={{
							color: 'var(--ink-mid)',
							fontSize: '12px',
							letterSpacing: 0,
						}}
					>
						No dispatch routes to map
					</p>
				</div>
			)}
		</div>
	)
}

function fallbackIndexedPosition(
	routeIndex: number,
	truckIndex: number,
	type: 'destination' | 'truck',
) {
	const baseLeft = 18 + (routeIndex % 4) * 18
	const baseTop = Math.floor(routeIndex / 4) * 12
	return type === 'destination'
		? { left: baseLeft, top: 68 + baseTop }
		: {
				left: baseLeft + truckIndex * 8,
				top: 30 + Math.floor(routeIndex / 4) * 18 + truckIndex * 13,
			}
}

function DispatchOsmBackdrop({
	mapView,
}: {
	mapView: NonNullable<ReturnType<typeof buildOpenStreetMapTileView>>
}) {
	return (
		<svg
			aria-hidden="true"
			className="absolute inset-0 h-full w-full opacity-90"
			preserveAspectRatio="none"
			viewBox={`0 0 ${mapView.width} ${mapView.height}`}
		>
			{mapView.tiles.map((tile) => (
				<image
					height="256"
					href={tile.href}
					key={tile.key}
					opacity="0.82"
					width="256"
					x={tile.x}
					y={tile.y}
				/>
			))}
			<rect
				fill="rgba(250,250,250,0.28)"
				height={mapView.height}
				width={mapView.width}
				x="0"
				y="0"
			/>
		</svg>
	)
}

function buildDispatchGeoEntries(resolvedRoutes: ResolvedDispatchRoute[]) {
	return resolvedRoutes.flatMap((resolved) => {
		const entries: Array<{ key: string; point: GeoPoint }> = []
		if (resolved.destination) {
			entries.push({
				key: `dest-${resolved.route.quoteId}`,
				point: resolved.destination,
			})
		}
		for (const { position, truck } of resolved.trucks) {
			if (position) {
				entries.push({
					key: `truck-${resolved.route.quoteId}-${truck.truckId}`,
					point: position,
				})
			}
		}
		return entries
	})
}

function buildFallbackProjection(routes: ResolvedDispatchRoute[]) {
	const points = routes.flatMap((route) => [
		route.destination,
		...route.trucks.map((truck) => truck.position),
	])
	const validPoints = points.filter(
		(point): point is { lat: number; lng: number } => point !== null,
	)
	if (validPoints.length === 0) return null

	const lats = validPoints.map((point) => point.lat)
	const lngs = validPoints.map((point) => point.lng)
	const minLat = Math.min(...lats)
	const maxLat = Math.max(...lats)
	const minLng = Math.min(...lngs)
	const maxLng = Math.max(...lngs)
	const latSpan = Math.max(maxLat - minLat, 0.015)
	const lngSpan = Math.max(maxLng - minLng, 0.015)

	return (point: { lat: number; lng: number } | null) => {
		if (!point) return { left: 50, top: 50 }
		return {
			left: clamp(12 + ((point.lng - minLng) / lngSpan) * 76, 8, 92),
			top: clamp(88 - ((point.lat - minLat) / latSpan) * 76, 8, 92),
		}
	}
}

function clamp(value: number, min: number, max: number) {
	return Math.max(min, Math.min(max, value))
}
