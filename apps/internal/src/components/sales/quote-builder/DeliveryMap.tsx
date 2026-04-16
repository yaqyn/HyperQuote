/**
 * Interactive delivery location map for the quote builder.
 * Shows marker at delivery address. Click to pick new location.
 * Uses Nominatim (OpenStreetMap) for real geocoding.
 * MUST be wrapped in ClientOnly at call site.
 */
import { useState, useCallback, useRef, useEffect } from 'react'
import Map, { Marker, NavigationControl } from 'react-map-gl/maplibre'
import type { MapRef, MapLayerMouseEvent } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import { MAP_STYLE } from '../../../lib/map-style'

// ─── Nominatim Geocoding (OpenStreetMap, free) ───────────

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org'

async function forwardGeocode(address: string): Promise<{ lat: number; lng: number } | null> {
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
    // Nominatim unavailable — fall back to Cairo center
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
    if (data.display_name) {
      return data.display_name
    }
  } catch {
    // Nominatim unavailable
  }
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`
}

// ─── Component ───────────────────────────────────────────

interface DeliveryMapProps {
  address: string
  onAddressChange: (address: string) => void
}

// Cairo default
const CAIRO = { lat: 30.0444, lng: 31.2357 }

export function DeliveryMap({ address, onAddressChange }: DeliveryMapProps) {
  const mapRef = useRef<MapRef>(null)
  const [markerPos, setMarkerPos] = useState(CAIRO)
  const [clickedPoint, setClickedPoint] = useState<{ lat: number; lng: number } | null>(null)
  const [reverseResult, setReverseResult] = useState<string | null>(null)
  const [isReversing, setIsReversing] = useState(false)
  const geocodeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Addresses we committed from a click — forward geocoding these would drift,
  // so we skip re-geocoding them (the marker is already at the exact clicked coord).
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
          zoom: 15,
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

  const [mapLoaded, setMapLoaded] = useState(false)

  return (
    <div className="relative h-full w-full bg-[#e6e8eb] dark:bg-[#0f1114]">
      {/* Loading placeholder */}
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-[var(--color-surface)] z-10">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--color-primary)] border-t-transparent" />
        </div>
      )}
      <div className={`h-full w-full bg-[#e6e8eb] transition-opacity duration-500 dark:bg-[#0f1114] dark:[&_.maplibregl-canvas]:invert dark:[&_.maplibregl-canvas]:hue-rotate-180 dark:[&_.maplibregl-canvas]:brightness-95 dark:[&_.maplibregl-canvas]:contrast-90 dark:[&_.maplibregl-canvas]:saturate-50 ${mapLoaded ? 'opacity-100' : 'opacity-0'}`}>
      <Map
        ref={mapRef}
        mapStyle={MAP_STYLE as any}
        initialViewState={{
          latitude: markerPos.lat,
          longitude: markerPos.lng,
          zoom: 14,
        }}
        style={{ width: '100%', height: '100%' }}
        onClick={handleMapClick}
        cursor="crosshair"
        onLoad={() => setMapLoaded(true)}
        attributionControl={false}
        minZoom={3}
        maxZoom={18}
      >
        <NavigationControl position="top-right" showCompass={false} />

        {/* Delivery address marker */}
        <Marker latitude={markerPos.lat} longitude={markerPos.lng} anchor="center">
          <div className="h-4 w-4 rounded-full border-[3px] border-[#2563EB] bg-white shadow-md ring-4 ring-[#2563EB]/15" />
        </Marker>

        {/* Clicked point marker + Change button */}
        {clickedPoint && (
          <Marker latitude={clickedPoint.lat} longitude={clickedPoint.lng} anchor="center">
            <div className="relative">
              <div className="h-4 w-4 rounded-full border-2 border-[#2563EB] bg-white shadow-md" />
              <div className="absolute left-1/2 top-full -translate-x-1/2 mt-2 flex flex-col items-center gap-1.5 antialiased subpixel-antialiased">
                {isReversing ? (
                  <div className="rounded-lg bg-white px-3 py-1.5 text-[12px] text-black/50 shadow-lg whitespace-nowrap">
                    Finding address...
                  </div>
                ) : reverseResult ? (
                  <>
                    <div className="max-w-[240px] rounded-lg bg-white px-3 py-2 text-[12px] font-medium leading-snug text-black/80 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.25)] dark:bg-[#0f0f0f] dark:text-white/85">
                      {reverseResult.split(',').slice(0, 3).join(',')}
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleChangeDelivery()
                      }}
                      className="rounded-lg bg-[#2563EB] px-3 py-1.5 text-[12px] font-medium text-white shadow-lg outline-none transition-all hover:bg-[#2563EB]/90 active:scale-95 whitespace-nowrap"
                    >
                      Change delivery here
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          </Marker>
        )}
      </Map>
      </div>

      {/* Address card at bottom — above attribution */}
      <div className="absolute bottom-8 start-4 end-4 rounded-xl border border-black/[0.06] bg-white px-4 py-3 shadow-lg dark:border-white/[0.06] dark:bg-black">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2563EB]/10">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" className="text-[#2563EB]">
              <path d="M7 1.75C4.65 1.75 2.75 3.65 2.75 6c0 3.25 4.25 6.25 4.25 6.25s4.25-3 4.25-6.25c0-2.35-1.9-4.25-4.25-4.25Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="7" cy="6" r="1.25" stroke="currentColor" strokeWidth="1.2" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium text-[var(--color-text)]">
              {address.split(',').slice(0, 2).join(',')}
            </p>
            <p className="mt-0.5 truncate text-[12px] text-black/40 dark:text-white/40">
              {address.split(',').slice(2).join(',').trim() || 'Delivery location'}
            </p>
          </div>
          <span className="shrink-0 font-[family-name:var(--font-geist-mono)] text-[11px] tabular-nums text-black/30 dark:text-white/30">
            {markerPos.lat.toFixed(4)}, {markerPos.lng.toFixed(4)}
          </span>
        </div>
      </div>
    </div>
  )
}
