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
import { EmployeeActionButton } from '../../shared/EmployeeControls'

// ─── Nominatim Geocoding (OpenStreetMap, free) ───────────

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org'
const DEFAULT_MAP_CENTER = { lat: 30.0444, lng: 31.2357 }

interface NominatimSearchResult {
	lat: string
	lon: string
}

interface NominatimReverseResult {
	display_name?: string
}

function isSearchResult(value: unknown): value is NominatimSearchResult {
	return (
		typeof value === 'object' &&
		value !== null &&
		typeof (value as Partial<NominatimSearchResult>).lat === 'string' &&
		typeof (value as Partial<NominatimSearchResult>).lon === 'string'
	)
}

function isReverseResult(value: unknown): value is NominatimReverseResult {
	return typeof value === 'object' && value !== null
}

function canUseInteractiveMap(): boolean {
	const canvas = document.createElement('canvas')
	return Boolean(
		canvas.getContext('webgl') ?? canvas.getContext('experimental-webgl'),
	)
}

async function forwardGeocode(
	address: string,
): Promise<{ lat: number; lng: number } | null> {
	try {
		const res = await fetch(
			`${NOMINATIM_BASE}/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
			{ headers: { 'Accept-Language': 'en,ar' } },
		)
		const data = await res.json()
		if (Array.isArray(data) && isSearchResult(data[0])) {
			return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
		}
	} catch {
		// Nominatim unavailable
	}
	return null
}

async function reverseGeocode(
	lat: number,
	lng: number,
): Promise<string | null> {
	try {
		const res = await fetch(
			`${NOMINATIM_BASE}/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
			{ headers: { 'Accept-Language': 'en,ar' } },
		)
		const data = await res.json()
		if (isReverseResult(data) && typeof data.display_name === 'string') {
			return data.display_name
		}
	} catch {
		// Nominatim unavailable
	}
	return null
}

// ─── Component ───────────────────────────────────────────

interface DeliveryMapProps {
	address: string
	coordinates: { latitude: number; longitude: number } | null
	onAddressChange: (
		address: string,
		coordinates?: { latitude: number; longitude: number } | null,
	) => void
	onDeliveryConfirmed?: () => void
}

export function DeliveryMap({
	address,
	coordinates,
	onAddressChange,
	onDeliveryConfirmed,
}: DeliveryMapProps) {
	const mapRef = useRef<MapRef>(null)
	const searchInputRef = useRef<HTMLInputElement | null>(null)
	const [markerPos, setMarkerPos] = useState<{
		lat: number
		lng: number
	} | null>(() =>
		coordinates
			? { lat: coordinates.latitude, lng: coordinates.longitude }
			: null,
	)
	const [clickedPoint, setClickedPoint] = useState<{
		lat: number
		lng: number
	} | null>(null)
	const [reverseResult, setReverseResult] = useState<string | null>(null)
	const [isReversing, setIsReversing] = useState(false)
	const [searchInput, setSearchInput] = useState(() => address)
	const [searchError, setSearchError] = useState<string | null>(null)
	const [mapLoaded, setMapLoaded] = useState(false)
	const [interactiveMapReady, setInteractiveMapReady] = useState<
		boolean | null
	>(null)
	const reverseRequestRef = useRef(0)

	useEffect(() => {
		setInteractiveMapReady(canUseInteractiveMap())
	}, [])

	useEffect(() => {
		const timer = setTimeout(() => {
			searchInputRef.current?.focus()
			searchInputRef.current?.select()
		}, 180)
		return () => clearTimeout(timer)
	}, [])

	useEffect(() => {
		setMarkerPos(
			coordinates
				? { lat: coordinates.latitude, lng: coordinates.longitude }
				: null,
		)
	}, [coordinates])

	useEffect(() => {
		const target = clickedPoint ?? markerPos
		if (!target || !mapLoaded) return
		mapRef.current?.flyTo({
			center: [target.lng, target.lat],
			zoom: clickedPoint ? 15 : 14,
			duration: 900,
		})
	}, [clickedPoint, markerPos, mapLoaded])

	// Map click → show pin + reverse geocode
	const handleMapClick = useCallback(async (e: MapLayerMouseEvent) => {
		const requestId = ++reverseRequestRef.current
		const point = { lat: e.lngLat.lat, lng: e.lngLat.lng }
		setSearchError(null)
		setClickedPoint(point)
		setReverseResult(null)
		setIsReversing(true)
		const result = await reverseGeocode(point.lat, point.lng)
		if (requestId !== reverseRequestRef.current) return
		setReverseResult(result)
		if (!result) {
			setSearchError(
				'We could not name this point. Choose it again when the map service is available.',
			)
		}
		setIsReversing(false)
	}, [])

	// "Change delivery here" → commit clicked coord as the new marker + address
	const handleChangeDelivery = useCallback(() => {
		if (!clickedPoint || !reverseResult) return
		setMarkerPos(clickedPoint)
		setSearchInput(reverseResult)
		setSearchError(null)
		onAddressChange(reverseResult, {
			latitude: clickedPoint.lat,
			longitude: clickedPoint.lng,
		})
		setClickedPoint(null)
		setReverseResult(null)
		onDeliveryConfirmed?.()
	}, [clickedPoint, reverseResult, onAddressChange, onDeliveryConfirmed])

	const findSearchAddress = useCallback(async () => {
		const q = searchInput.trim()
		if (!q) return
		setSearchError(null)
		setIsReversing(true)
		const coords = await forwardGeocode(q)
		if (!coords) {
			setSearchError('No map result found. Try a more specific address.')
			setIsReversing(false)
			return
		}
		mapRef.current?.flyTo({
			center: [coords.lng, coords.lat],
			zoom: 15,
			duration: 1200,
		})
		setClickedPoint(null)
		setReverseResult(null)
		setIsReversing(false)
	}, [searchInput])

	// Search form: fire a forward geocode immediately on Enter.
	const handleSearchSubmit = useCallback(
		(e: React.FormEvent) => {
			e.preventDefault()
			void findSearchAddress()
		},
		[findSearchAddress],
	)

	const routeGeoJSON: GeoJSON.FeatureCollection = useMemo(
		() => ({ type: 'FeatureCollection', features: [] }),
		[],
	)
	const initialCenter = markerPos ?? DEFAULT_MAP_CENTER

	if (interactiveMapReady === false) {
		return (
			<div
				id="delivery-map-panel"
				className="flex h-full w-full flex-col"
				style={{ backgroundColor: 'var(--color-surface)' }}
			>
				<div
					className="flex items-center gap-3 px-5 py-3"
					style={{ borderBottom: '1px solid var(--color-border)' }}
				>
					<Search
						size={13}
						strokeWidth={1.5}
						className="shrink-0 text-[var(--color-text-subtle)]"
						aria-hidden="true"
					/>
					<span
						className="font-[family-name:var(--font-archivo)] italic text-[var(--color-text-subtle)]"
						style={{ fontSize: '12px', letterSpacing: '0' }}
					>
						map view unavailable on this renderer
					</span>
				</div>
				<div className="flex min-h-0 flex-1 items-center justify-center px-5 text-center font-[family-name:var(--font-archivo)] text-[12px] text-[var(--color-text-subtle)]">
					The interactive map is required to change the delivery point.
				</div>
			</div>
		)
	}

	if (interactiveMapReady === null) {
		return (
			<div
				id="delivery-map-panel"
				className="flex h-full w-full items-center justify-center"
				style={{ backgroundColor: 'var(--color-surface)' }}
			>
				<div
					className="h-px w-[80px] origin-left scale-x-0 animate-[horizon-draw_720ms_cubic-bezier(0.16,1,0.3,1)_forwards]"
					style={{ backgroundColor: 'var(--color-text-subtle)' }}
				/>
			</div>
		)
	}

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
						ref={searchInputRef}
						id="delivery-map-search"
						type="text"
						value={searchInput}
						onChange={(e) => setSearchInput(e.target.value)}
						placeholder="search an address, or click anywhere on the map…"
						className="flex-1 bg-transparent font-[family-name:var(--font-archivo)] text-[var(--color-text)] outline-none placeholder:italic placeholder:text-[var(--color-text-subtle)]/60"
						style={{
							fontSize: '13px',
							letterSpacing: '0',
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
						latitude: initialCenter.lat,
						longitude: initialCenter.lng,
						zoom: markerPos ? 13 : 10,
					}}
					style={{ width: '100%', height: '100%' }}
					onClick={handleMapClick}
					cursor="crosshair"
					onLoad={() => setMapLoaded(true)}
					attributionControl={false}
					minZoom={3}
					maxZoom={18}
				>
					{mapLoaded && routeGeoJSON && (
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

					{/* Delivery address marker */}
					{markerPos && (
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
					)}

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
										letterSpacing: '0',
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
									letterSpacing: '0',
								}}
							>
								{address
									? address.split(',').slice(0, 2).join(',')
									: searchInput.trim() || 'no address yet'}
							</p>
							<p
								className="mt-0.5 truncate font-[family-name:var(--font-archivo)] italic"
								style={{
									fontSize: '11px',
									color: 'var(--color-text-subtle)',
								}}
							>
								{searchError ??
									(searchInput.trim()
										? 'press Enter to find it, or click the map'
										: 'search or click anywhere on the map to pick a location')}
							</p>
						</>
					)}
				</div>
				{!clickedPoint && searchInput.trim() && (
					<EmployeeActionButton
						type="button"
						onClick={() => void findSearchAddress()}
						tone="success"
						size="sm"
						disabled={isReversing}
						aria-disabled={isReversing}
						trailing={<span aria-hidden="true">→</span>}
					>
						{isReversing ? 'Finding' : 'Find on map'}
					</EmployeeActionButton>
				)}
				{clickedPoint && reverseResult && !isReversing && (
					<div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
						<EmployeeActionButton
							type="button"
							onClick={() => {
								setClickedPoint(null)
								setReverseResult(null)
							}}
							tone="neutral"
							size="sm"
						>
							Cancel
						</EmployeeActionButton>
						<EmployeeActionButton
							type="button"
							onClick={handleChangeDelivery}
							tone="success"
							size="sm"
							trailing={<span aria-hidden="true">→</span>}
						>
							Deliver here
						</EmployeeActionButton>
					</div>
				)}
			</div>
		</div>
	)
}
