import { MapPin, Truck } from 'lucide-react'
import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import type { MapRef } from 'react-map-gl/maplibre'
import MapGL, { Layer, Marker, Source } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { RoadRouteCoordinate } from '@hyperquote/ui/maps/road-route'
import { MAP_STYLE } from '../../lib/map-style'

interface MapPoint {
	lat: number
	lng: number
}

export interface IncomingInteractiveMapPoint {
	caption: string
	color: string
	icon: 'destination' | 'driver'
	key: string
	label: string
	point: MapPoint
}

export interface IncomingRouteFeatureCollection {
	type: 'FeatureCollection'
	features: Array<{
		type: 'Feature'
		properties: { color: string; deliveryId: string }
		geometry: {
			type: 'LineString'
			coordinates: RoadRouteCoordinate[]
		}
	}>
}

export function IncomingOrdersInteractiveMap({
	center,
	fallback,
	onMapFailed,
	points,
	routeLines,
}: {
	center: MapPoint
	fallback: ReactNode
	onMapFailed: () => void
	points: IncomingInteractiveMapPoint[]
	routeLines: IncomingRouteFeatureCollection
}) {
	const mapRef = useRef<MapRef | null>(null)
	const [mapLoaded, setMapLoaded] = useState(false)
	const [tilesReady, setTilesReady] = useState(false)

	useEffect(() => {
		if (!mapLoaded || points.length === 0) return
		const lngs = points.map((entry) => entry.point.lng)
		const lats = points.map((entry) => entry.point.lat)
		mapRef.current?.fitBounds(
			[
				[Math.min(...lngs), Math.min(...lats)],
				[Math.max(...lngs), Math.max(...lats)],
			],
			{ duration: 650, padding: 72 },
		)
	}, [mapLoaded, points])

	return (
		<figure
			className="relative h-[340px] overflow-hidden rounded-xl border border-[var(--p-border)] bg-[var(--p-bg)] sm:h-[390px] lg:h-[430px]"
			data-map-ready={tilesReady ? 'true' : 'false'}
		>
			{!tilesReady && fallback}
			<div
				className={`absolute inset-0 transition-opacity duration-300 ${
					tilesReady ? 'opacity-100' : 'opacity-0'
				}`}
			>
				<MapGL
					ref={mapRef}
					mapStyle={MAP_STYLE}
					initialViewState={{
						latitude: center.lat,
						longitude: center.lng,
						zoom: 11,
					}}
					style={{ height: '100%', width: '100%' }}
					attributionControl={false}
					maxZoom={18}
					minZoom={6}
					onError={onMapFailed}
					onIdle={() => setTilesReady(true)}
					onLoad={() => setMapLoaded(true)}
				>
					{routeLines.features.length > 0 && (
						<Source data={routeLines} id="incoming-routes" type="geojson">
							<Layer
								id="incoming-route-lines"
								type="line"
								paint={{
									'line-color': ['get', 'color'],
									'line-dasharray': [1.5, 1.5],
									'line-opacity': 0.76,
									'line-width': 4,
								}}
							/>
						</Source>
					)}
					{points.map((entry) => (
						<Marker
							anchor="center"
							key={entry.key}
							latitude={entry.point.lat}
							longitude={entry.point.lng}
						>
							<IncomingMapMarker
								caption={entry.caption}
								color={entry.color}
								icon={entry.icon}
								label={entry.label}
							/>
						</Marker>
					))}
				</MapGL>
			</div>
		</figure>
	)
}

function IncomingMapMarker({
	caption,
	color,
	icon,
	label,
}: {
	caption: string
	color: string
	icon: 'destination' | 'driver'
	label: string
}) {
	return (
		<div className="relative flex h-9 w-9 items-center justify-center">
			<span
				className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white text-white shadow-lg"
				style={{
					backgroundColor: color,
					boxShadow: '0 10px 30px rgba(17, 24, 39, 0.2)',
				}}
			>
				{icon === 'driver' ? (
					<Truck size={16} strokeWidth={2.1} />
				) : (
					<MapPin size={16} strokeWidth={2.1} />
				)}
			</span>
			<span className="absolute top-full left-1/2 mt-1 max-w-[150px] -translate-x-1/2 rounded-lg bg-[rgba(17,24,39,0.82)] px-2 py-1 text-center text-[10px] font-semibold leading-tight text-white shadow-sm">
				<span className="block truncate">{label}</span>
				<span className="block truncate text-[9px] font-medium text-white/75">
					{caption}
				</span>
			</span>
		</div>
	)
}
