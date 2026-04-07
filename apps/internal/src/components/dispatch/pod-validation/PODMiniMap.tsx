/**
 * Small map showing delivery location pin + expected address.
 * Dashed line between actual and expected GPS.
 * Distance label floating at bottom.
 * MUST be wrapped in ClientOnly at call site.
 */
import { useRef, useCallback } from 'react'
import Map, { Marker, Source, Layer } from 'react-map-gl/maplibre'
import type { MapRef } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'

interface PODMiniMapProps {
  actualLat: number
  actualLng: number
  expectedLat: number
  expectedLng: number
}

const MAP_STYLE = import.meta.env.VITE_MAPTILER_KEY
  ? `https://api.maptiler.com/maps/streets/style.json?key=${import.meta.env.VITE_MAPTILER_KEY}`
  : 'https://demotiles.maplibre.org/style.json'

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function PODMiniMap({ actualLat, actualLng, expectedLat, expectedLng }: PODMiniMapProps) {
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
          [Math.min(actualLng, expectedLng) - 0.005, Math.min(actualLat, expectedLat) - 0.005],
          [Math.max(actualLng, expectedLng) + 0.005, Math.max(actualLat, expectedLat) + 0.005],
        ],
        { padding: 40, duration: 0 },
      )
    }
  }, [actualLat, actualLng, expectedLat, expectedLng])

  return (
    <div className="relative" style={{ height: 220 }}>
      <Map
        ref={mapRef}
        initialViewState={{ latitude: centerLat, longitude: centerLng, zoom: 14 }}
        mapStyle={MAP_STYLE}
        onLoad={onMapLoad}
        style={{ width: '100%', height: '100%' }}
        attributionControl={false}
      >
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

        {/* Actual GPS — blue dot */}
        <Marker latitude={actualLat} longitude={actualLng} anchor="center">
          <div className="h-3.5 w-3.5 rounded-full border-2 border-white bg-[#2563EB] shadow-md" />
        </Marker>

        {/* Expected — outlined dot */}
        <Marker latitude={expectedLat} longitude={expectedLng} anchor="center">
          <div className="h-3.5 w-3.5 rounded-full border-2 border-black/40 bg-white shadow-md dark:border-white/40 dark:bg-black" />
        </Marker>
      </Map>

      {/* Distance label */}
      <div className="absolute bottom-3 start-3 flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 shadow-sm backdrop-blur-sm dark:bg-black/90">
        <span className="font-[family-name:var(--font-geist-mono)] text-xs font-medium tabular-nums">
          {Math.round(distance)}m
        </span>
        <span
          className={`h-1.5 w-1.5 rounded-full ${withinThreshold ? 'bg-green-500' : 'bg-red-500'}`}
        />
      </div>
    </div>
  )
}
