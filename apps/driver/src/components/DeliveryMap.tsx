import { useEffect, useMemo, useRef, useState } from 'react'
import type { MapRef } from 'react-map-gl/maplibre'
import MapGL, { Layer, Marker, Source } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { DriverDelivery, DriverLocation } from '../lib/driver-repository'
import { localize } from '../lib/format'
import { MAP_STYLE } from '../lib/map-style'
import { usePreferencesStore } from '../stores/preferences'

interface DeliveryMapProps {
	currentLocation: DriverLocation
	delivery: DriverDelivery | null
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

export function DeliveryMap({ currentLocation, delivery }: DeliveryMapProps) {
	const mapRef = useRef<MapRef | null>(null)
	const [mapLoaded, setMapLoaded] = useState(false)
	const language = usePreferencesStore((state) => state.language)
	const theme = usePreferencesStore((state) => state.theme)

	const routeGeoJson = useMemo<RouteFeatureCollection | null>(() => {
		if (!delivery) return null
		return {
			type: 'FeatureCollection',
			features: [
				{
					type: 'Feature',
					properties: {},
					geometry: {
						type: 'LineString',
						coordinates: [
							[delivery.origin.longitude, delivery.origin.latitude],
							[currentLocation.longitude, currentLocation.latitude],
							[delivery.address.longitude, delivery.address.latitude],
						],
					},
				},
			],
		}
	}, [currentLocation, delivery])

	useEffect(() => {
		if (!mapLoaded || !delivery) return
		mapRef.current?.fitBounds(
			[
				[
					Math.min(
						delivery.origin.longitude,
						delivery.address.longitude,
						currentLocation.longitude,
					),
					Math.min(
						delivery.origin.latitude,
						delivery.address.latitude,
						currentLocation.latitude,
					),
				],
				[
					Math.max(
						delivery.origin.longitude,
						delivery.address.longitude,
						currentLocation.longitude,
					),
					Math.max(
						delivery.origin.latitude,
						delivery.address.latitude,
						currentLocation.latitude,
					),
				],
			],
			{ duration: 900, padding: 72 },
		)
	}, [currentLocation, delivery, mapLoaded])

	return (
		<div className="absolute inset-0 bg-[var(--color-map)]">
			{!mapLoaded && <div className="driver-map-loading" aria-hidden="true" />}
			<MapGL
				ref={mapRef}
				mapStyle={MAP_STYLE}
				initialViewState={{
					latitude: currentLocation.latitude,
					longitude: currentLocation.longitude,
					zoom: 11,
				}}
				style={{ width: '100%', height: '100%' }}
				attributionControl={false}
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
						<MapPin
							latitude={delivery.origin.latitude}
							longitude={delivery.origin.longitude}
							label={localize(delivery.origin.label, language)}
							tone="warehouse"
						/>
						<MapPin
							latitude={delivery.address.latitude}
							longitude={delivery.address.longitude}
							label={localize(delivery.address.label, language)}
							tone="customer"
						/>
					</>
				)}
				<MapPin
					latitude={currentLocation.latitude}
					longitude={currentLocation.longitude}
					label=""
					tone="driver"
				/>
			</MapGL>
		</div>
	)
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
