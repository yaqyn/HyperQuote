/**
 * MapLibre GL map for route planning.
 * Shows color-coded route lines and numbered stop pins.
 * MUST be wrapped in ClientOnly at the call site.
 */
import { useMemo } from 'react'
import Map, { Source, Layer, Marker } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { DeliveryRoute, RouteStop } from '../../../types/dispatch'

interface RoutePlanningMapProps {
  routes: DeliveryRoute[]
  unassigned: RouteStop[]
  selectedRouteId: string | null
  onStopClick: (stopId: string) => void
}

// 6-color palette for route lines
const ROUTE_COLORS = [
  '#2563EB', // blue
  '#16A34A', // green
  '#EA580C', // orange
  '#9333EA', // purple
  '#0D9488', // teal
  '#EC4899', // pink
]

// MapTiler with Arabic labels, fallback to OSM demo
const MAP_STYLE = import.meta.env.VITE_MAPTILER_KEY
  ? `https://api.maptiler.com/maps/streets/style.json?key=${import.meta.env.VITE_MAPTILER_KEY}`
  : 'https://demotiles.maplibre.org/style.json'

export function RoutePlanningMap({
  routes,
  unassigned,
  selectedRouteId,
  onStopClick,
}: RoutePlanningMapProps) {
  // Build GeoJSON line features for each route
  const routeFeatures = useMemo(() => {
    return routes.map((route, idx) => {
      const coordinates = route.stops
        .sort((a, b) => a.sequence - b.sequence)
        .map((s) => [s.lng, s.lat] as [number, number])

      return {
        route,
        color: ROUTE_COLORS[idx % ROUTE_COLORS.length]!,
        geojson: {
          type: 'Feature' as const,
          properties: { routeId: route.id },
          geometry: {
            type: 'LineString' as const,
            coordinates,
          },
        },
      }
    })
  }, [routes])

  return (
    <div className="h-full w-full" aria-label="Route planning map">
      <Map
        initialViewState={{
          latitude: 30.0444,
          longitude: 31.2357,
          zoom: 11,
        }}
        mapStyle={MAP_STYLE}
        style={{ width: '100%', height: '100%' }}
        attributionControl={false}
      >
        {/* Route lines */}
        {routeFeatures.map(({ route, color, geojson }) => (
          <Source
            key={`line-${route.id}`}
            id={`route-line-${route.id}`}
            type="geojson"
            data={geojson}
          >
            <Layer
              id={`route-layer-${route.id}`}
              type="line"
              paint={{
                'line-color': color,
                'line-width': route.id === selectedRouteId ? 4 : 3,
                'line-opacity': route.id === selectedRouteId ? 1 : 0.6,
              }}
            />
          </Source>
        ))}

        {/* Stop markers for each route */}
        {routeFeatures.map(({ route, color }) =>
          route.stops.map((stop) => {
            const isSelected = route.id === selectedRouteId
            const size = isSelected ? 28 : 22

            return (
              <Marker
                key={stop.id}
                latitude={stop.lat}
                longitude={stop.lng}
                anchor="center"
                onClick={(e) => {
                  e.originalEvent.stopPropagation()
                  onStopClick(stop.id)
                }}
              >
                <div
                  className="flex items-center justify-center rounded-full border-2 border-white shadow-md transition-transform"
                  style={{
                    width: size,
                    height: size,
                    backgroundColor: color,
                    transform: isSelected ? 'scale(1.1)' : 'scale(1)',
                    cursor: 'pointer',
                  }}
                >
                  <span className="font-[family-name:var(--font-geist-mono)] text-[10px] font-bold tabular-nums text-white">
                    {stop.sequence}
                  </span>
                </div>
              </Marker>
            )
          }),
        )}

        {/* Unassigned deliveries as grey dots */}
        {unassigned.map((stop) => (
          <Marker
            key={`unassigned-${stop.id}`}
            latitude={stop.lat}
            longitude={stop.lng}
            anchor="center"
          >
            <div className="h-3 w-3 rounded-full border border-white bg-black/30 shadow-sm dark:bg-white/30" />
          </Marker>
        ))}
      </Map>
    </div>
  )
}
