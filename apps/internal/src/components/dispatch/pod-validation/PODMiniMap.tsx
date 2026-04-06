/**
 * Small MapLibre instance showing GPS delivery location vs expected address.
 * Own map ref per RESEARCH.md anti-pattern (NOT shared with live map).
 * MUST be wrapped in ClientOnly at the call site.
 */
import { useRef, useCallback } from 'react'
import Map, { Marker, Source, Layer } from 'react-map-gl/maplibre'
import type { MapRef } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'

interface PODMiniMapProps {
  /** Actual GPS delivery location */
  actualLat: number
  actualLng: number
  /** Expected delivery address location */
  expectedLat: number
  expectedLng: number
}

const MAP_STYLE = import.meta.env.VITE_MAPTILER_KEY
  ? `https://api.maptiler.com/maps/streets/style.json?key=${import.meta.env.VITE_MAPTILER_KEY}`
  : 'https://demotiles.maplibre.org/style.json'

/** Haversine distance in meters */
function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6_371_000
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function PODMiniMap({
  actualLat,
  actualLng,
  expectedLat,
  expectedLng,
}: PODMiniMapProps) {
  const mapRef = useRef<MapRef>(null)
  const distance = haversineMeters(actualLat, actualLng, expectedLat, expectedLng)
  const withinThreshold = distance <= 500

  const centerLat = (actualLat + expectedLat) / 2
  const centerLng = (actualLng + expectedLng) / 2

  const lineGeoJSON: GeoJSON.Feature<GeoJSON.LineString> = {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'LineString',
      coordinates: [
        [actualLng, actualLat],
        [expectedLng, expectedLat],
      ],
    },
  }

  const onMapLoad = useCallback(() => {
    if (mapRef.current) {
      mapRef.current.fitBounds(
        [
          [
            Math.min(actualLng, expectedLng) - 0.005,
            Math.min(actualLat, expectedLat) - 0.005,
          ],
          [
            Math.max(actualLng, expectedLng) + 0.005,
            Math.max(actualLat, expectedLat) + 0.005,
          ],
        ],
        { padding: 40, duration: 0 },
      )
    }
  }, [actualLat, actualLng, expectedLat, expectedLng])

  return (
    <div className="relative rounded-xl overflow-hidden" style={{ height: 280 }}>
      <Map
        ref={mapRef}
        initialViewState={{
          latitude: centerLat,
          longitude: centerLng,
          zoom: 14,
        }}
        mapStyle={MAP_STYLE}
        onLoad={onMapLoad}
        style={{ width: '100%', height: '100%' }}
        attributionControl={false}
      >
        {/* Dashed line between actual and expected */}
        <Source id="pod-line" type="geojson" data={lineGeoJSON}>
          <Layer
            id="pod-line-layer"
            type="line"
            paint={{
              'line-color': withinThreshold ? '#22c55e' : '#ef4444',
              'line-width': 2,
              'line-dasharray': [4, 4],
            }}
          />
        </Source>

        {/* Actual GPS pin (blue) */}
        <Marker latitude={actualLat} longitude={actualLng} anchor="center">
          <div className="w-4 h-4 rounded-full bg-[#2563EB] border-2 border-white shadow-md" />
        </Marker>

        {/* Expected address pin (red) */}
        <Marker latitude={expectedLat} longitude={expectedLng} anchor="bottom">
          <div className="flex flex-col items-center">
            <div className="w-4 h-4 rounded-full bg-red-500 border-2 border-white shadow-md" />
            <div className="w-0.5 h-2 bg-red-500" />
          </div>
        </Marker>
      </Map>

      {/* Distance label */}
      <div className="absolute bottom-3 start-3 bg-white/90 dark:bg-black/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg flex items-center gap-2">
        <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-sm font-medium">
          {Math.round(distance)}m
        </span>
        {withinThreshold ? (
          <svg className="w-4 h-4 text-green-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg className="w-4 h-4 text-red-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
        )}
      </div>
    </div>
  )
}
