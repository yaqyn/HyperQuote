/**
 * Dispatch map — washed terrain under the horizon panel. Near-black ink
 * on muted ochre cartography: warehouse as a hairline ring, destinations
 * as serif monograms pinned to off-white paper, trucks as brand-blue dots
 * (or brand-amber if overdue). Selected pin fills brand blue. The terrain
 * is desaturated via the .dispatch-map-wash filter so the panel reads as
 * a composed object over quiet ground.
 *
 * MUST be wrapped in ClientOnly at call site.
 */
import { useCallback, useRef, useState } from 'react'
import type { MapRef } from 'react-map-gl/maplibre'
import MapGL, { Layer, Marker, Source } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import { MAP_STYLE } from '../../lib/map-style'
import {
	type DispatchRouteView,
	WAREHOUSE_COORDS,
} from '../../lib/server/dispatch'

interface DispatchMapProps {
	routes: DispatchRouteView[]
	selectedQuoteId: string | null
	onSelectRoute: (quoteId: string) => void
}

export function DispatchMap({
	routes,
	selectedQuoteId,
	onSelectRoute,
}: DispatchMapProps) {
	const mapRef = useRef<MapRef>(null)
	const [mapLoaded, setMapLoaded] = useState(false)

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

	// GeoJSON — ink-dashed lines from warehouse to each delivery
	const routeLinesGeoJSON: GeoJSON.FeatureCollection = {
		type: 'FeatureCollection',
		features: routes.map((r) => ({
			type: 'Feature' as const,
			properties: { quoteId: r.quoteId, isOverdue: r.isOverdue },
			geometry: {
				type: 'LineString' as const,
				coordinates: [
					[WAREHOUSE_COORDS.lng, WAREHOUSE_COORDS.lat],
					[r.deliveryLng, r.deliveryLat],
				],
			},
		})),
	}

	return (
		<div className="dispatch-theme relative h-full w-full">
			{!mapLoaded && (
				<div
					className="dispatch-paper absolute inset-0 z-10 flex items-center justify-center"
					style={{ color: 'var(--ink)' }}
				>
					<div
						className="h-px w-[80px] animate-horizon-draw"
						style={{ backgroundColor: 'var(--ink-ghost)' }}
					/>
				</div>
			)}
			<div className="dispatch-map-wash h-full w-full">
				<MapGL
					ref={mapRef}
					mapStyle={MAP_STYLE as unknown as string}
					initialViewState={{
						latitude: 30.02,
						longitude: 31.0,
						zoom: 10,
					}}
					style={{ width: '100%', height: '100%' }}
					onLoad={() => setMapLoaded(true)}
					attributionControl={false}
					minZoom={6}
					maxZoom={18}
				>
					{/* Route lines — graphite dashes */}
					{mapLoaded && (
						<Source
							id="dispatch-routes"
							type="geojson"
							data={routeLinesGeoJSON}
						>
							<Layer
								id="dispatch-route-lines"
								type="line"
								paint={{
									'line-color': '#111111',
									'line-width': 1.2,
									'line-opacity': 0.32,
									'line-dasharray': [3, 4],
								}}
							/>
						</Source>
					)}

					{/* Warehouse — hairline ink ring with faint halo */}
					<Marker
						latitude={WAREHOUSE_COORDS.lat}
						longitude={WAREHOUSE_COORDS.lng}
						anchor="center"
					>
						<div className="relative flex items-center justify-center">
							<div
								className="absolute h-10 w-10 animate-ping rounded-full"
								style={{ backgroundColor: 'rgba(17, 17, 17, 0.08)' }}
							/>
							<div
								className="relative h-5 w-5 rounded-full"
								style={{
									backgroundColor: '#FAFAFA',
									border: '2px solid #1A1D1F',
								}}
							/>
							<div
								className="absolute h-[5px] w-[5px] rounded-full"
								style={{ backgroundColor: '#111111' }}
							/>
						</div>
					</Marker>

					{/* Delivery pins — paper fill, ink ring, serif monogram */}
					{routes.map((r) => {
						const isSelected = selectedQuoteId === r.quoteId
						const initial = (r.customerName.trim()[0] ?? '•').toUpperCase()
						const ringColor = isSelected
							? '#2563EB'
							: r.isOverdue
								? '#D97706'
								: '#111111'
						return (
							<Marker
								key={`dest-${r.quoteId}`}
								latitude={r.deliveryLat}
								longitude={r.deliveryLng}
								anchor="bottom"
								onClick={(e) => {
									e.originalEvent.stopPropagation()
									handleDriverClick(r.quoteId, r.deliveryLat, r.deliveryLng)
								}}
							>
								<div className="cursor-pointer">
									<div className="flex flex-col items-center">
										<div
											className="flex h-9 w-9 items-center justify-center rounded-full shadow-[0_6px_14px_-4px_rgba(20,15,10,0.35)]"
											style={{
												backgroundColor: isSelected ? '#2563EB' : '#FAFAFA',
												border: `1.5px solid ${ringColor}`,
												color: isSelected ? '#FFFFFF' : ringColor,
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
								</div>
							</Marker>
						)
					})}

					{/* Driver dots — brand blue when moving, brand amber when overdue */}
					{routes.map((r) => {
						const isSelected = selectedQuoteId === r.quoteId
						const fill = r.isOverdue ? '#D97706' : '#2563EB'
						return (
							<Marker
								key={`driver-${r.quoteId}`}
								latitude={r.driverLat}
								longitude={r.driverLng}
								anchor="center"
								onClick={(e) => {
									e.originalEvent.stopPropagation()
									handleDriverClick(r.quoteId, r.driverLat, r.driverLng)
								}}
							>
								<div className="cursor-pointer">
									<div className="relative flex items-center justify-center">
										<div
											className="absolute h-7 w-7 animate-ping rounded-full"
											style={{ backgroundColor: fill, opacity: 0.22 }}
										/>
										<div
											className="relative h-[14px] w-[14px] rounded-full shadow-[0_4px_10px_-3px_rgba(20,15,10,0.4)]"
											style={{
												backgroundColor: fill,
												border: '1.5px solid #F3EEE4',
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
										{r.trucks[0]?.plateNumber ?? '—'}
									</div>
								</div>
							</Marker>
						)
					})}
				</MapGL>
			</div>
		</div>
	)
}
