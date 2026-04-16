/**
 * Full-bleed dispatch map — same light tiles as the quote builder.
 * Shows warehouse beacon, delivery pins, driver dots along routes.
 * MUST be wrapped in ClientOnly at call site.
 */
import { useCallback, useRef, useState } from 'react'
import Map, { Marker, Source, Layer } from 'react-map-gl/maplibre'
import type { MapRef } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import { MAP_STYLE } from '../../lib/map-style'
import {
  WAREHOUSE_COORDS,
  type DispatchRouteView,
} from '../../lib/server/dispatch'

interface DispatchMapProps {
  routes: DispatchRouteView[]
  selectedQuoteId: string | null
  onSelectRoute: (quoteId: string) => void
}

export function DispatchMap({ routes, selectedQuoteId, onSelectRoute }: DispatchMapProps) {
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

  // GeoJSON for route lines — dashed lines from warehouse to each delivery
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
    <div className="relative h-full w-full">
      {!mapLoaded && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--color-surface)]">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#2563EB] border-t-transparent" />
        </div>
      )}
      <Map
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

        {/* Route lines */}
        {mapLoaded && (
          <Source id="dispatch-routes" type="geojson" data={routeLinesGeoJSON}>
            <Layer
              id="dispatch-route-lines"
              type="line"
              paint={{
                'line-color': '#2563EB',
                'line-width': 2,
                'line-opacity': 0.35,
                'line-dasharray': [4, 3],
              }}
            />
          </Source>
        )}

        {/* Warehouse marker — blue ring beacon */}
        <Marker
          latitude={WAREHOUSE_COORDS.lat}
          longitude={WAREHOUSE_COORDS.lng}
          anchor="center"
        >
          <div className="relative flex items-center justify-center">
            <div className="absolute h-8 w-8 animate-ping rounded-full bg-[#2563EB]/20" />
            <div className="relative h-4 w-4 rounded-full border-[3px] border-[#2563EB] bg-white shadow-md" />
          </div>
        </Marker>

        {/* Delivery destination markers */}
        {routes.map((r) => (
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
            <div className="group cursor-pointer">
              {/* Pin shape */}
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full border-2 shadow-lg transition-transform group-hover:scale-110 ${
                    selectedQuoteId === r.quoteId
                      ? 'border-[#2563EB] bg-[#2563EB] text-white'
                      : r.isOverdue
                        ? 'border-[#F59E0B] bg-white text-[#F59E0B]'
                        : 'border-[#2563EB] bg-white text-[#2563EB]'
                  }`}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </div>
                {/* Label */}
                <div className="mt-1 max-w-[120px] truncate rounded bg-white/90 px-1.5 py-0.5 text-center text-[9px] font-semibold text-black/70 shadow-sm backdrop-blur-sm">
                  {r.customerName.split(' ')[0]}
                </div>
              </div>
            </div>
          </Marker>
        ))}

        {/* Driver/truck markers — dots along the route */}
        {routes.map((r) => (
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
            <div className="group cursor-pointer">
              <div className="relative flex items-center justify-center">
                {/* Pulse ring */}
                <div
                  className="absolute h-6 w-6 animate-ping rounded-full opacity-30"
                  style={{ backgroundColor: r.isOverdue ? '#F59E0B' : '#2563EB' }}
                />
                {/* Truck dot */}
                <div
                  className={`relative flex h-5 w-5 items-center justify-center rounded-full border-2 border-white shadow-lg transition-transform group-hover:scale-125 ${
                    selectedQuoteId === r.quoteId ? 'scale-125' : ''
                  }`}
                  style={{ backgroundColor: r.isOverdue ? '#F59E0B' : '#2563EB' }}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="white" stroke="none">
                    <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
                  </svg>
                </div>
              </div>
              {/* Driver name tooltip */}
              <div className="mt-1 max-w-[100px] truncate rounded bg-black/75 px-1.5 py-0.5 text-center text-[8px] font-medium text-white shadow-sm">
                {r.trucks[0]?.driverName.split(' ')[0] ?? 'Driver'}
              </div>
            </div>
          </Marker>
        ))}
      </Map>
    </div>
  )
}
