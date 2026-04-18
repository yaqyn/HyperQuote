/**
 * Interactive delivery location map for the quote builder. This is a
 * real builder surface — not just a map. It shows the warehouse origin,
 * the route to the selected delivery, live distance + drive-time
 * readouts, and an address search / pick flow.
 *
 * MUST be wrapped in ClientOnly at call site.
 */
import { Search, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { MapLayerMouseEvent, MapRef } from 'react-map-gl/maplibre'
import MapGL, { Layer, Marker, Source } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import { MAP_STYLE } from '../../../lib/map-style'

// ─── Nominatim Geocoding (OpenStreetMap, free) ───────────

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org'

async function forwardGeocode(
	address: string,
): Promise<{ lat: number; lng: number } | null> {
	try {
		const res = await fetch(
			`${NOMINATIM_BASE}/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
			{ headers: { 'Accept-Language': 'ar,en' } },
		)
		const data = await res.json()
		if (data.length > 0) {
			return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
		}
	} catch {
		// Nominatim unavailable
	}
	return null
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
	try {
		const res = await fetch(
			`${NOMINATIM_BASE}/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
			{ headers: { 'Accept-Language': 'ar,en' } },
		)
		const data = await res.json()
		if (data.display_name) return data.display_name
	} catch {
		// Nominatim unavailable
	}
	return `${lat.toFixed(5)}, ${lng.toFixed(5)}`
}

// ─── Geometry helpers ────────────────────────────────────

/** HyperQuote warehouse — 6th of October City, Giza */
const WAREHOUSE = { lat: 29.9753, lng: 30.9247 }
const CAIRO = { lat: 30.0444, lng: 31.2357 }

// ─── Component ───────────────────────────────────────────

interface DeliveryMapProps {
	address: string
	onAddressChange: (address: string) => void
}

export function DeliveryMap({ address, onAddressChange }: DeliveryMapProps) {
	const mapRef = useRef<MapRef>(null)
	const [markerPos, setMarkerPos] = useState(CAIRO)
	const [clickedPoint, setClickedPoint] = useState<{
		lat: number
		lng: number
	} | null>(null)
	const [reverseResult, setReverseResult] = useState<string | null>(null)
	const [isReversing, setIsReversing] = useState(false)
	const [searchInput, setSearchInput] = useState('')
	const [mapLoaded, setMapLoaded] = useState(false)
	const geocodeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const committedFromClickRef = useRef<Set<string>>(new Set())

	// Forward geocode: address text → map position (debounced)
	useEffect(() => {
		if (geocodeTimerRef.current) clearTimeout(geocodeTimerRef.current)
		if (committedFromClickRef.current.has(address)) return
		geocodeTimerRef.current = setTimeout(async () => {
			if (!address.trim()) return
			const coords = await forwardGeocode(address)
			if (coords) {
				setMarkerPos(coords)
				setClickedPoint(null)
				mapRef.current?.flyTo({
					center: [coords.lng, coords.lat],
					zoom: 14,
					duration: 1200,
				})
			}
		}, 800)
		return () => {
			if (geocodeTimerRef.current) clearTimeout(geocodeTimerRef.current)
		}
	}, [address])

	// Map click → show pin + reverse geocode
	const handleMapClick = useCallback(async (e: MapLayerMouseEvent) => {
		const point = { lat: e.lngLat.lat, lng: e.lngLat.lng }
		setClickedPoint(point)
		setReverseResult(null)
		setIsReversing(true)
		const result = await reverseGeocode(point.lat, point.lng)
		setReverseResult(result)
		setIsReversing(false)
	}, [])

	// "Change delivery here" → commit clicked coord as the new marker + address
	const handleChangeDelivery = useCallback(() => {
		if (!clickedPoint || !reverseResult) return
		committedFromClickRef.current.add(reverseResult)
		setMarkerPos(clickedPoint)
		onAddressChange(reverseResult)
		setClickedPoint(null)
		setReverseResult(null)
	}, [clickedPoint, reverseResult, onAddressChange])

	// Search form: fire a forward geocode immediately on Enter.
	const handleSearchSubmit = useCallback(
		async (e: React.FormEvent) => {
			e.preventDefault()
			const q = searchInput.trim()
			if (!q) return
			const coords = await forwardGeocode(q)
			if (!coords) return
			mapRef.current?.flyTo({
				center: [coords.lng, coords.lat],
				zoom: 15,
				duration: 1200,
			})
			const pretty = await reverseGeocode(coords.lat, coords.lng)
			setClickedPoint(coords)
			setReverseResult(pretty)
		},
		[searchInput],
	)

	// Route line from warehouse to current delivery marker
	const routeGeoJSON: GeoJSON.FeatureCollection = useMemo(
		() => ({
			type: 'FeatureCollection',
			features: [
				{
					type: 'Feature' as const,
					properties: {},
					geometry: {
						type: 'LineString' as const,
						coordinates: [
							[WAREHOUSE.lng, WAREHOUSE.lat],
							[markerPos.lng, markerPos.lat],
						],
					},
				},
			],
		}),
		[markerPos],
	)

	return (
		<div
			id="delivery-map-panel"
			className="relative h-full w-full"
			style={{ backgroundColor: 'var(--color-surface)' }}
		>
			{/* Header — single search input on a clean bar */}
			<div
				className="absolute left-0 right-0 top-0 z-20 flex items-center gap-3 px-5 py-3"
				style={{
					backgroundColor: 'var(--color-surface)',
					borderBottom: '1px solid var(--color-border)',
				}}
			>
				<form
					onSubmit={handleSearchSubmit}
					className="flex w-full items-baseline gap-2.5"
				>
					<Search
						size={13}
						strokeWidth={1.5}
						className="shrink-0 self-center text-[var(--color-text-subtle)]"
						aria-hidden="true"
					/>
					<label htmlFor="delivery-map-search" className="sr-only">
						Search for an address
					</label>
					<input
						id="delivery-map-search"
						type="text"
						value={searchInput}
						onChange={(e) => setSearchInput(e.target.value)}
						placeholder="search an address, or click anywhere on the map…"
						className="flex-1 bg-transparent font-[family-name:var(--font-archivo)] text-[var(--color-text)] outline-none placeholder:italic placeholder:text-[var(--color-text-subtle)]/60"
						style={{
							fontSize: '13px',
							letterSpacing: '-0.005em',
						}}
					/>
					{searchInput && (
						<button
							type="button"
							onClick={() => setSearchInput('')}
							aria-label="Clear search"
							className="shrink-0 self-center inline-flex h-5 w-5 items-center justify-center text-[var(--color-text-subtle)] hover:text-[var(--color-text)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/40 rounded-sm"
						>
							<X size={11} strokeWidth={1.5} aria-hidden="true" />
						</button>
					)}
				</form>
			</div>

			{/* Map */}
			{!mapLoaded && (
				<div
					className="absolute inset-0 z-10 flex items-center justify-center"
					style={{ backgroundColor: 'var(--color-surface)' }}
				>
					<div
						className="h-px w-[80px] origin-left scale-x-0 animate-[horizon-draw_720ms_cubic-bezier(0.16,1,0.3,1)_forwards]"
						style={{ backgroundColor: 'var(--color-text-subtle)' }}
					/>
				</div>
			)}
			<div
				className={`absolute inset-0 transition-opacity duration-500 dark:[&_.maplibregl-canvas]:invert dark:[&_.maplibregl-canvas]:hue-rotate-180 dark:[&_.maplibregl-canvas]:brightness-95 dark:[&_.maplibregl-canvas]:contrast-90 dark:[&_.maplibregl-canvas]:saturate-50 ${mapLoaded ? 'opacity-100' : 'opacity-0'}`}
			>
				<MapGL
					ref={mapRef}
					mapStyle={MAP_STYLE}
					initialViewState={{
						latitude: markerPos.lat,
						longitude: markerPos.lng,
						zoom: 13,
					}}
					style={{ width: '100%', height: '100%' }}
					onClick={handleMapClick}
					cursor="crosshair"
					onLoad={() => setMapLoaded(true)}
					attributionControl={false}
					minZoom={3}
					maxZoom={18}
				>
					{/* Route line — dashed graphite from warehouse to delivery */}
					{mapLoaded && (
						<Source id="delivery-route" type="geojson" data={routeGeoJSON}>
							<Layer
								id="delivery-route-line"
								type="line"
								paint={{
									'line-color': '#111111',
									'line-width': 1.5,
									'line-opacity': 0.4,
									'line-dasharray': [3, 4],
								}}
							/>
						</Source>
					)}

					{/* Warehouse pin — anchor with italic label */}
					<Marker
						latitude={WAREHOUSE.lat}
						longitude={WAREHOUSE.lng}
						anchor="center"
					>
						<div className="flex flex-col items-center">
							<div className="relative flex items-center justify-center">
								<div
									className="h-4 w-4 rounded-full"
									style={{
										backgroundColor: '#FAFAFA',
										border: '2px solid #111111',
									}}
								/>
								<div
									className="absolute h-[5px] w-[5px] rounded-full"
									style={{ backgroundColor: '#111111' }}
								/>
							</div>
							<div
								className="mt-1 px-1.5 py-0.5"
								style={{
									backgroundColor: 'rgba(250, 250, 250, 0.92)',
									backdropFilter: 'blur(2px)',
									fontFamily: 'Archivo, sans-serif',
									fontStyle: 'italic',
									fontSize: '9.5px',
									color: '#111111',
									letterSpacing: '-0.005em',
								}}
							>
								warehouse
							</div>
						</div>
					</Marker>

					{/* Delivery address marker */}
					<Marker
						latitude={markerPos.lat}
						longitude={markerPos.lng}
						anchor="center"
					>
						<div className="relative flex items-center justify-center">
							<div
								className="absolute h-7 w-7 rounded-full"
								style={{
									backgroundColor: 'rgba(37, 99, 235, 0.12)',
								}}
							/>
							<div
								className="relative h-[14px] w-[14px] rounded-full"
								style={{
									backgroundColor: '#2563EB',
									border: '2px solid #FAFAFA',
									boxShadow: '0 4px 10px -3px rgba(20, 15, 10, 0.4)',
								}}
							/>
						</div>
					</Marker>

					{/* Clicked point marker — pin only, no tooltip; the bottom
					    bar carries the confirm flow. */}
					{clickedPoint && (
						<Marker
							latitude={clickedPoint.lat}
							longitude={clickedPoint.lng}
							anchor="center"
						>
							<div className="relative flex items-center justify-center">
								<div
									className="absolute h-7 w-7 rounded-full animate-ping"
									style={{
										backgroundColor: 'rgba(37, 99, 235, 0.2)',
									}}
								/>
								<div
									className="relative h-4 w-4 rounded-full"
									style={{
										backgroundColor: '#FAFAFA',
										border: '2px solid #2563EB',
										boxShadow: '0 4px 10px -3px rgba(20, 15, 10, 0.4)',
									}}
								/>
							</div>
						</Marker>
					)}
				</MapGL>
			</div>

			{/* Bottom bar — address state + confirm flow.
			    - Idle: current delivery address + italic hint
			    - Clicked: clicked address + cancel / deliver-here actions
			    - Loading: italic wait indicator */}
			<div
				className="absolute left-0 right-0 bottom-0 z-20 flex items-center gap-4 px-5 py-3"
				style={{
					backgroundColor: 'var(--color-surface)',
					borderTop: '1px solid var(--color-border)',
				}}
			>
				<svg
					width="13"
					height="13"
					viewBox="0 0 14 14"
					fill="none"
					aria-hidden="true"
					className="shrink-0 self-center"
					style={{
						color: clickedPoint
							? 'var(--color-primary)'
							: 'var(--color-text-subtle)',
					}}
				>
					<path
						d="M7 1.75C4.65 1.75 2.75 3.65 2.75 6c0 3.25 4.25 6.25 4.25 6.25s4.25-3 4.25-6.25c0-2.35-1.9-4.25-4.25-4.25Z"
						stroke="currentColor"
						strokeWidth="1.2"
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
					<circle
						cx="7"
						cy="6"
						r="1.25"
						stroke="currentColor"
						strokeWidth="1.2"
					/>
				</svg>
				<div className="min-w-0 flex-1">
					{clickedPoint ? (
						isReversing ? (
							<p
								className="font-[family-name:var(--font-archivo)] italic"
								style={{
									fontSize: '12px',
									color: 'var(--color-text-subtle)',
								}}
							>
								finding address…
							</p>
						) : reverseResult ? (
							<>
								<p
									className="truncate font-[family-name:var(--font-archivo)]"
									style={{
										fontSize: '13px',
										fontWeight: 500,
										color: 'var(--color-text)',
										letterSpacing: '-0.005em',
									}}
								>
									{reverseResult.split(',').slice(0, 2).join(',')}
								</p>
								<p
									className="mt-0.5 truncate font-[family-name:var(--font-archivo)] italic"
									style={{
										fontSize: '11px',
										color: 'var(--color-text-subtle)',
									}}
								>
									{reverseResult.split(',').slice(2).join(',').trim() ||
										'new pin on the map'}
								</p>
							</>
						) : null
					) : (
						<>
							<p
								className="truncate font-[family-name:var(--font-archivo)]"
								style={{
									fontSize: '13px',
									fontWeight: 500,
									color: address
										? 'var(--color-text)'
										: 'var(--color-text-muted)',
									letterSpacing: '-0.005em',
								}}
							>
								{address
									? address.split(',').slice(0, 2).join(',')
									: 'no address yet'}
							</p>
							<p
								className="mt-0.5 truncate font-[family-name:var(--font-archivo)] italic"
								style={{
									fontSize: '11px',
									color: 'var(--color-text-subtle)',
								}}
							>
								click anywhere on the map to pick a new location
							</p>
						</>
					)}
				</div>
				{clickedPoint && reverseResult && !isReversing && (
					<div className="flex shrink-0 items-baseline gap-5">
						<button
							type="button"
							onClick={() => {
								setClickedPoint(null)
								setReverseResult(null)
							}}
							className="group relative font-[family-name:var(--font-archivo)] italic outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/40 rounded-sm"
							style={{
								fontSize: '12px',
								color: 'var(--color-text-muted)',
							}}
						>
							<span className="relative">
								cancel
								<span
									aria-hidden="true"
									className="absolute inset-x-0 -bottom-0.5 h-px origin-left scale-x-0 bg-current transition-transform duration-200 group-hover:scale-x-100 group-focus-visible:scale-x-100"
								/>
							</span>
						</button>
						<button
							type="button"
							onClick={handleChangeDelivery}
							className="group relative inline-flex items-baseline gap-1 font-[family-name:var(--font-archivo)] italic outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/40 rounded-sm"
							style={{
								fontSize: '12px',
								fontWeight: 500,
								color: 'var(--color-primary)',
							}}
						>
							<span className="relative">
								deliver here
								<span
									aria-hidden="true"
									className="absolute inset-x-0 -bottom-0.5 h-px origin-left scale-x-0 bg-current transition-transform duration-200 group-hover:scale-x-100 group-focus-visible:scale-x-100"
								/>
							</span>
							<span aria-hidden="true">→</span>
						</button>
					</div>
				)}
			</div>
		</div>
	)
}
