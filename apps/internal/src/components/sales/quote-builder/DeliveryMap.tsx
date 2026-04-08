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

  // Forward geocode: address text → map position (debounced)
  useEffect(() => {
    if (geocodeTimerRef.current) clearTimeout(geocodeTimerRef.current)

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
    }, 800) // debounce 800ms — don't geocode on every keystroke

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

  // "Change delivery here" → update address field
  const handleChangeDelivery = useCallback(() => {
    if (!clickedPoint || !reverseResult) return
    setMarkerPos(clickedPoint)
    onAddressChange(reverseResult)
    setClickedPoint(null)
    setReverseResult(null)
  }, [clickedPoint, reverseResult, onAddressChange])

  return (
    <div className="relative h-full w-full">
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
      >
        <NavigationControl position="top-right" showCompass={false} />

        {/* Delivery address marker */}
        <Marker latitude={markerPos.lat} longitude={markerPos.lng}>
          <div className="flex flex-col items-center">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2563EB] shadow-lg">
              <svg width="16" height="16" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M7 1.75C4.65 1.75 2.75 3.65 2.75 6c0 3.25 4.25 6.25 4.25 6.25s4.25-3 4.25-6.25c0-2.35-1.9-4.25-4.25-4.25Z" fill="white" stroke="white" strokeWidth="0.5" />
                <circle cx="7" cy="6" r="1.25" fill="#2563EB" />
              </svg>
            </div>
            <div className="mt-1 rounded-md bg-black/80 px-2 py-0.5 text-[10px] font-medium text-white whitespace-nowrap">
              Delivery
            </div>
          </div>
        </Marker>

        {/* Clicked point marker + Change button */}
        {clickedPoint && (
          <Marker latitude={clickedPoint.lat} longitude={clickedPoint.lng}>
            <div className="flex flex-col items-center">
              <div className="h-4 w-4 rounded-full border-2 border-[#2563EB] bg-white shadow-md" />
              {isReversing ? (
                <div className="mt-2 rounded-lg bg-white/90 px-3 py-1.5 text-[11px] text-black/40 shadow-lg backdrop-blur-xl">
                  Finding address...
                </div>
              ) : reverseResult ? (
                <div className="mt-2 flex flex-col items-center gap-1.5">
                  <div className="max-w-[220px] rounded-lg bg-white/95 px-3 py-1.5 text-[11px] leading-tight text-black/60 shadow-lg backdrop-blur-xl dark:bg-black/90 dark:text-white/60">
                    {reverseResult.split(',').slice(0, 3).join(',')}
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleChangeDelivery()
                    }}
                    className="rounded-lg bg-[#2563EB] px-3 py-1.5 text-[12px] font-medium text-white shadow-lg outline-none transition-all hover:bg-[#2563EB]/90 active:scale-95"
                  >
                    Change delivery here
                  </button>
                </div>
              ) : null}
            </div>
          </Marker>
        )}
      </Map>

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
