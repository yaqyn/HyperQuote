import { MapPin } from 'lucide-react'
import { useEffect, useRef } from 'react'
import type { MapLayerMouseEvent, MapRef } from 'react-map-gl/maplibre'
import MapGL, { Marker, NavigationControl } from 'react-map-gl/maplibre'
import { createMapLibreStyle } from '../maps/maplibre-style'
import 'maplibre-gl/dist/maplibre-gl.css'

const DEFAULT_CENTER = { latitude: 30.0444, longitude: 31.2357 }
const MAP_STYLE = createMapLibreStyle()

export interface QuoteLocationPoint {
	latitude: number
	longitude: number
}

export function QuoteLocationMap({
	focusPoint,
	onPointChange,
	point,
}: {
	focusPoint: QuoteLocationPoint | null
	onPointChange: (point: QuoteLocationPoint) => void
	point: QuoteLocationPoint | null
}) {
	const mapRef = useRef<MapRef>(null)

	useEffect(() => {
		const target = focusPoint ?? point
		if (!target) return
		mapRef.current?.flyTo({
			center: [target.longitude, target.latitude],
			duration: 420,
			zoom: Math.max(mapRef.current.getZoom(), 14),
		})
	}, [focusPoint, point])

	function handleMapClick(event: MapLayerMouseEvent) {
		onPointChange({
			latitude: event.lngLat.lat,
			longitude: event.lngLat.lng,
		})
	}

	const center = point ?? DEFAULT_CENTER

	return (
		<div className="relative h-full min-h-[250px] w-full overflow-hidden bg-[var(--site-concrete,var(--color-surface))]">
			<MapGL
				ref={mapRef}
				mapLib={import('maplibre-gl')}
				mapStyle={MAP_STYLE}
				initialViewState={{
					latitude: center.latitude,
					longitude: center.longitude,
					zoom: point ? 14 : 9.5,
				}}
				minZoom={5}
				maxZoom={19}
				maxBounds={[
					[24.6, 21.7],
					[36.9, 31.8],
				]}
				attributionControl={false}
				cursor="crosshair"
				onClick={handleMapClick}
				onLoad={() => mapRef.current?.resize()}
				style={{ height: '100%', width: '100%' }}
			>
				<NavigationControl position="top-right" showCompass={false} />
				{point && (
					<Marker
						latitude={point.latitude}
						longitude={point.longitude}
						anchor="bottom"
					>
						<div className="relative flex h-10 w-10 items-center justify-center">
							<span className="absolute h-8 w-8 animate-ping rounded-full bg-[#2563eb]/20 motion-reduce:animate-none" />
							<span className="relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-[#2563eb] text-white shadow-[0_8px_22px_rgba(15,23,42,0.28)]">
								<MapPin size={15} strokeWidth={2} aria-hidden="true" />
							</span>
						</div>
					</Marker>
				)}
			</MapGL>
			<a
				href="https://www.openstreetmap.org/copyright"
				target="_blank"
				rel="noreferrer"
				className="absolute bottom-1.5 end-1.5 rounded-sm bg-white/90 px-1.5 py-0.5 text-[9px] font-medium text-[#303030] shadow-sm"
			>
				© OpenStreetMap contributors
			</a>
		</div>
	)
}
