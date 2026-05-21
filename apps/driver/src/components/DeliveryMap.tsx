import {
	buildOpenStreetMapTileView,
	type GeoPoint,
	isGeoPoint,
	type ProjectedMapPoint,
} from '@hyperquote/ui/maps/osm'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { MapRef } from 'react-map-gl/maplibre'
import MapGL, { Layer, Marker, Source } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { DriverDelivery, DriverLocation } from '../lib/driver-repository'
import { localize } from '../lib/format'
import { MAP_STYLE } from '../lib/map-style'
import { usePreferencesStore } from '../stores/preferences'

interface DeliveryMapProps {
	currentLocation: DriverLocation | null
	delivery: DriverDelivery | null
}

interface DeliveryMapRenderProps extends DeliveryMapProps {
	destinationPoint: GeoPoint | null
	originPoint: GeoPoint | null
}

interface RouteFeatureCollection {
	type: 'FeatureCollection'
	features: Array<{
		type: 'Feature'
		properties: Record<string, never>
		geometry: {
			type: 'LineString'
			coordinates: number[][]
		}
	}>
}

function canUseInteractiveMap(): boolean {
	const canvas = document.createElement('canvas')
	const gl = canvas.getContext('webgl', {
		failIfMajorPerformanceCaveat: true,
	}) as WebGLRenderingContext | null
	if (!gl) return false

	const debugInfo = gl.getExtension('WEBGL_debug_renderer_info')
	const renderer = debugInfo
		? String(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL))
		: ''
	return !/swiftshader|llvmpipe|software/i.test(renderer)
}

function hasCoordinates(point: {
	latitude: number | null
	longitude: number | null
}): point is { latitude: number; longitude: number } {
	return (
		typeof point.latitude === 'number' &&
		typeof point.longitude === 'number' &&
		Number.isFinite(point.latitude) &&
		Number.isFinite(point.longitude)
	)
}

export function DeliveryMap({ currentLocation, delivery }: DeliveryMapProps) {
	const mapRef = useRef<MapRef | null>(null)
	const [mapLoaded, setMapLoaded] = useState(false)
	const [mapFailed, setMapFailed] = useState(false)
	const [interactiveMapReady, setInteractiveMapReady] = useState<
		boolean | null
	>(null)
	const language = usePreferencesStore((state) => state.language)
	const theme = usePreferencesStore((state) => state.theme)
	const currentPoint = useMemo(
		() =>
			currentLocation
				? { lat: currentLocation.latitude, lng: currentLocation.longitude }
				: null,
		[currentLocation],
	)
	const originPoint = useMemo(
		() =>
			delivery && hasCoordinates(delivery.origin)
				? {
						lat: delivery.origin.latitude,
						lng: delivery.origin.longitude,
					}
				: null,
		[delivery],
	)
	const explicitDestinationPoint = useMemo(
		() =>
			delivery && hasCoordinates(delivery.address)
				? {
						lat: delivery.address.latitude,
						lng: delivery.address.longitude,
					}
				: null,
		[delivery],
	)
	const destinationPoint = explicitDestinationPoint

	const routeGeoJson = useMemo<RouteFeatureCollection | null>(() => {
		if (!delivery) return null
		const routePoints = [originPoint, currentPoint, destinationPoint].filter(
			isGeoPoint,
		)
		if (routePoints.length < 2) return null
		return {
			type: 'FeatureCollection',
			features: [
				{
					type: 'Feature',
					properties: {},
					geometry: {
						type: 'LineString',
						coordinates: routePoints.map((point) => [point.lng, point.lat]),
					},
				},
			],
		}
	}, [currentPoint, delivery, destinationPoint, originPoint])

	const mapCenter = useMemo(() => {
		if (currentPoint) return currentPoint
		if (destinationPoint) return destinationPoint
		if (originPoint) return originPoint
		return null
	}, [currentPoint, destinationPoint, originPoint])

	useEffect(() => {
		setInteractiveMapReady(canUseInteractiveMap())
	}, [])

	useEffect(() => {
		const routePoints = [originPoint, currentPoint, destinationPoint].filter(
			isGeoPoint,
		)
		if (!mapLoaded || routePoints.length < 2) return
		const lngs = routePoints.map((point) => point.lng)
		const lats = routePoints.map((point) => point.lat)
		mapRef.current?.fitBounds(
			[
				[Math.min(...lngs), Math.min(...lats)],
				[Math.max(...lngs), Math.max(...lats)],
			],
			{ duration: 900, padding: 72 },
		)
	}, [currentPoint, destinationPoint, mapLoaded, originPoint])

	if (interactiveMapReady === false || mapFailed) {
		return (
			<DeliveryMapFallback
				currentLocation={currentLocation}
				destinationPoint={destinationPoint}
				delivery={delivery}
				originPoint={originPoint}
			/>
		)
	}

	if (interactiveMapReady === null) {
		return (
			<div className="absolute inset-0 bg-[var(--color-map)]">
				<div className="driver-map-loading" aria-hidden="true" />
			</div>
		)
	}

	if (!mapCenter) {
		return (
			<DeliveryMapFallback
				currentLocation={currentLocation}
				destinationPoint={destinationPoint}
				delivery={delivery}
				originPoint={originPoint}
			/>
		)
	}

	return (
		<div className="absolute inset-0 bg-[var(--color-map)]">
			{!mapLoaded && (
				<DeliveryMapFallback
					currentLocation={currentLocation}
					destinationPoint={destinationPoint}
					delivery={delivery}
					originPoint={originPoint}
				/>
			)}
			<MapGL
				ref={mapRef}
				mapStyle={MAP_STYLE}
				initialViewState={{
					latitude: mapCenter.lat,
					longitude: mapCenter.lng,
					zoom: 11,
				}}
				style={{ width: '100%', height: '100%' }}
				attributionControl={false}
				onError={() => setMapFailed(true)}
				onLoad={() => setMapLoaded(true)}
				minZoom={3}
				maxZoom={18}
			>
				{routeGeoJson && (
					<Source id="driver-route" type="geojson" data={routeGeoJson}>
						<Layer
							id="driver-route-line"
							type="line"
							paint={{
								'line-color': theme === 'dark' ? '#d4d4d4' : '#111111',
								'line-width': 3,
								'line-opacity': 0.68,
							}}
						/>
					</Source>
				)}

				{delivery && (
					<>
						{originPoint && (
							<MapPin
								latitude={originPoint.lat}
								longitude={originPoint.lng}
								label={localize(delivery.origin.label, language)}
								tone="warehouse"
							/>
						)}
						{destinationPoint && (
							<MapPin
								latitude={destinationPoint.lat}
								longitude={destinationPoint.lng}
								label={localize(delivery.address.label, language)}
								tone="customer"
							/>
						)}
					</>
				)}
				{currentLocation && (
					<MapPin
						latitude={currentLocation.latitude}
						longitude={currentLocation.longitude}
						label=""
						tone="driver"
					/>
				)}
			</MapGL>
		</div>
	)
}

function DeliveryMapFallback({
	currentLocation,
	delivery,
	destinationPoint,
	originPoint,
}: DeliveryMapRenderProps) {
	const language = usePreferencesStore((state) => state.language)
	const currentPoint = currentLocation
		? { lat: currentLocation.latitude, lng: currentLocation.longitude }
		: null
	const pointEntries = [
		originPoint && delivery
			? {
					key: 'origin',
					label: localize(delivery.origin.label, language),
					point: originPoint,
					tone: 'warehouse' as const,
				}
			: null,
		currentPoint
			? {
					key: 'driver',
					label: `${currentLocation?.latitude.toFixed(4)}, ${currentLocation?.longitude.toFixed(4)}`,
					point: currentPoint,
					tone: 'driver' as const,
				}
			: null,
		destinationPoint && delivery
			? {
					key: 'destination',
					label: localize(delivery.address.label, language),
					point: destinationPoint,
					tone: 'customer' as const,
				}
			: null,
	].filter(
		(
			entry,
		): entry is {
			key: string
			label: string
			point: GeoPoint
			tone: 'customer' | 'driver' | 'warehouse'
		} => entry !== null,
	)
	const mapView = buildOpenStreetMapTileView(
		pointEntries.map((entry) => entry.point),
		{ height: 760, maxZoom: 14, minZoom: 9, padding: 96, width: 430 },
	)

	return (
		<div className="absolute inset-0 overflow-hidden bg-[var(--color-map)]">
			{mapView ? (
				<StaticOsmDeliveryMap mapView={mapView} points={pointEntries} />
			) : (
				<div
					aria-hidden="true"
					className="absolute inset-0 opacity-70"
					style={{
						background:
							'linear-gradient(90deg, rgba(17,17,17,0.055) 1px, transparent 1px), linear-gradient(0deg, rgba(17,17,17,0.055) 1px, transparent 1px)',
						backgroundSize: '48px 48px',
					}}
				/>
			)}
		</div>
	)
}

function StaticOsmDeliveryMap({
	mapView,
	points,
}: {
	mapView: NonNullable<ReturnType<typeof buildOpenStreetMapTileView>>
	points: Array<{
		key: string
		label: string
		point: GeoPoint
		tone: 'customer' | 'driver' | 'warehouse'
	}>
}) {
	const positioned = points.map((point, index) => ({
		...point,
		position:
			mapView.points[index] ?? ({ x: 0, y: 0 } satisfies ProjectedMapPoint),
	}))
	const linePoints = positioned
		.map((point) => `${point.position.x},${point.position.y}`)
		.join(' ')

	return (
		<svg
			aria-hidden="true"
			className="absolute inset-0 h-full w-full"
			preserveAspectRatio="xMidYMid slice"
			viewBox={`0 0 ${mapView.width} ${mapView.height}`}
		>
			{mapView.tiles.map((tile) => (
				<image
					height="256"
					href={tile.href}
					key={tile.key}
					opacity="0.88"
					width="256"
					x={tile.x}
					y={tile.y}
				/>
			))}
			<rect
				fill="rgba(250,250,250,0.14)"
				height={mapView.height}
				width={mapView.width}
				x="0"
				y="0"
			/>
			{positioned.length >= 2 && (
				<polyline
					fill="none"
					points={linePoints}
					stroke="var(--color-map-label-text)"
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeOpacity="0.58"
					strokeWidth="3"
				/>
			)}
			{positioned.map((point) => (
				<g key={point.key}>
					<circle
						cx={point.position.x}
						cy={point.position.y}
						fill={staticPinFill(point.tone)}
						r={point.tone === 'driver' ? 8 : 9}
						stroke={staticPinStroke(point.tone)}
						strokeWidth="3"
					/>
					<circle
						cx={point.position.x}
						cy={point.position.y}
						fill={staticPinDot(point.tone)}
						r="3"
					/>
					{point.label && (
						<text
							fill="var(--color-map-label-text)"
							fontFamily="Archivo, sans-serif"
							fontSize="11"
							fontWeight="700"
							stroke="var(--color-map-label-bg)"
							strokeLinejoin="round"
							strokeWidth="4"
							textAnchor="middle"
							x={point.position.x}
							y={point.position.y + 27}
						>
							{point.label.slice(0, 28)}
						</text>
					)}
					{point.label && (
						<text
							fill="var(--color-map-label-text)"
							fontFamily="Archivo, sans-serif"
							fontSize="11"
							fontWeight="700"
							textAnchor="middle"
							x={point.position.x}
							y={point.position.y + 27}
						>
							{point.label.slice(0, 28)}
						</text>
					)}
				</g>
			))}
		</svg>
	)
}

function staticPinFill(tone: 'customer' | 'driver' | 'warehouse') {
	if (tone === 'driver') return 'var(--color-map-pin-driver-bg)'
	if (tone === 'customer') return 'var(--color-map-pin-customer-bg)'
	return '#D97706'
}

function staticPinStroke(tone: 'customer' | 'driver' | 'warehouse') {
	if (tone === 'driver') return 'var(--color-map-pin-driver-border)'
	if (tone === 'customer') return 'var(--color-map-pin-customer-border)'
	return 'var(--color-map-pin-warehouse-border)'
}

function staticPinDot(tone: 'customer' | 'driver' | 'warehouse') {
	if (tone === 'driver') return 'var(--color-map-pin-driver-dot)'
	if (tone === 'customer') return 'var(--color-map-pin-customer-dot)'
	return 'var(--color-map-pin-dot-on-fill)'
}

function MapPin({
	label,
	latitude,
	longitude,
	tone,
}: {
	label: string
	latitude: number
	longitude: number
	tone: 'customer' | 'driver' | 'warehouse'
}) {
	return (
		<Marker latitude={latitude} longitude={longitude} anchor="center">
			<div className="flex flex-col items-center">
				<div
					className={`grid h-5 w-5 place-items-center border-2 shadow-[0_6px_20px_rgba(17,17,17,0.18)] ${
						tone === 'driver'
							? 'rounded-full border-[var(--color-map-pin-driver-border)] bg-[var(--color-map-pin-driver-bg)]'
							: tone === 'customer'
								? 'border-[var(--color-map-pin-customer-border)] bg-[var(--color-map-pin-customer-bg)]'
								: 'border-[var(--color-map-pin-warehouse-border)] bg-[#D97706]'
					}`}
				>
					<div
						className={`h-1.5 w-1.5 rounded-full ${
							tone === 'driver'
								? 'bg-[var(--color-map-pin-driver-dot)]'
								: tone === 'customer'
									? 'bg-[var(--color-map-pin-customer-dot)]'
									: 'bg-[var(--color-map-pin-dot-on-fill)]'
						}`}
					/>
				</div>
				{label && (
					<span className="mt-1 max-w-[160px] border border-[var(--color-map-label-border)] bg-[var(--color-map-label-bg)] px-1.5 py-0.5 text-center font-[family-name:var(--font-archivo)] text-[10px] font-semibold leading-tight text-[var(--color-map-label-text)] shadow-sm">
						{label}
					</span>
				)}
			</div>
		</Marker>
	)
}
