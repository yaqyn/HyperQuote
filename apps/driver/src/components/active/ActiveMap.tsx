/**
 * Live route map. Origin (warehouse) and destination pins, animated truck
 * marker that crawls along an interpolated line. Real geolocation will
 * replace `truckPos` once @capacitor/geolocation is wired.
 *
 * MUST be wrapped in <ClientOnly /> at call site (MapLibre touches window).
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import type { MapRef } from 'react-map-gl/maplibre'
import MapGL, { Layer, Marker, Source } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import { interpolate } from '../../lib/geo'
import { MAP_STYLE } from '../../lib/map-style'
import type { Coords } from '../../lib/types'

interface ActiveMapProps {
	origin: Coords
	destination: Coords
}

export function ActiveMap({ origin, destination }: ActiveMapProps) {
	const mapRef = useRef<MapRef>(null)
	const [t, setT] = useState(0.18)

	useEffect(() => {
		const id = setInterval(() => {
			setT((prev) => Math.min(0.95, prev + 0.02))
		}, 6_000)
		return () => clearInterval(id)
	}, [])

	const truckPos = useMemo(
		() => interpolate(origin, destination, t),
		[origin, destination, t],
	)

	const routeGeoJSON = useMemo<GeoJSON.FeatureCollection>(
		() => ({
			type: 'FeatureCollection',
			features: [
				{
					type: 'Feature',
					properties: {},
					geometry: {
						type: 'LineString',
						coordinates: [
							[origin.lng, origin.lat],
							[destination.lng, destination.lat],
						],
					},
				},
			],
		}),
		[origin, destination],
	)

	useEffect(() => {
		const map = mapRef.current
		if (!map) return
		map.fitBounds(
			[
				[
					Math.min(origin.lng, destination.lng),
					Math.min(origin.lat, destination.lat),
				],
				[
					Math.max(origin.lng, destination.lng),
					Math.max(origin.lat, destination.lat),
				],
			],
			{ padding: 56, duration: 800, maxZoom: 12 },
		)
	}, [origin, destination])

	return (
		<MapGL
			ref={mapRef}
			mapStyle={MAP_STYLE as unknown as string}
			initialViewState={{
				latitude: (origin.lat + destination.lat) / 2,
				longitude: (origin.lng + destination.lng) / 2,
				zoom: 11,
			}}
			attributionControl={{ compact: true }}
			dragRotate={false}
			touchZoomRotate
			style={{ width: '100%', height: '100%' }}
		>
			<Source id="route" type="geojson" data={routeGeoJSON}>
				<Layer
					id="route-glow"
					type="line"
					paint={{
						'line-color': 'var(--accent)',
						'line-width': 6,
						'line-blur': 5,
						'line-opacity': 0.25,
					}}
				/>
				<Layer
					id="route-line"
					type="line"
					paint={{
						'line-color': 'var(--accent)',
						'line-width': 3,
					}}
				/>
			</Source>

			<Marker latitude={origin.lat} longitude={origin.lng} anchor="center">
				<OriginPin />
			</Marker>
			<Marker
				latitude={destination.lat}
				longitude={destination.lng}
				anchor="center"
			>
				<DestinationPin />
			</Marker>
			<Marker latitude={truckPos.lat} longitude={truckPos.lng} anchor="center">
				<TruckPin />
			</Marker>
		</MapGL>
	)
}

function OriginPin() {
	return (
		<div
			role="img"
			aria-label="warehouse"
			style={{
				width: 14,
				height: 14,
				borderRadius: 999,
				background: 'var(--surface)',
				border: '2px solid var(--ink)',
			}}
		/>
	)
}

function DestinationPin() {
	return (
		<div
			role="img"
			aria-label="destination"
			style={{
				width: 18,
				height: 18,
				borderRadius: 999,
				background: 'var(--accent)',
				border: '3px solid var(--surface)',
				boxShadow: '0 2px 8px rgba(15, 17, 22, 0.25)',
			}}
		/>
	)
}

function TruckPin() {
	return (
		<div
			role="img"
			aria-label="truck position"
			style={{
				position: 'relative',
				width: 14,
				height: 14,
			}}
		>
			<span
				style={{
					position: 'absolute',
					inset: -8,
					borderRadius: 999,
					background: 'var(--accent)',
					opacity: 0.18,
				}}
			/>
			<span
				style={{
					position: 'absolute',
					inset: 0,
					borderRadius: 999,
					background: 'var(--accent)',
					border: '3px solid var(--surface)',
					boxShadow: '0 2px 8px rgba(15, 17, 22, 0.25)',
				}}
			/>
		</div>
	)
}
