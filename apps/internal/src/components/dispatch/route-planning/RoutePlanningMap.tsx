/**
 * Map showing route lines, stop markers, unassigned markers.
 * Color-coded per route. Selected route is emphasized.
 * MUST be wrapped in ClientOnly at call site.
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

const ROUTE_COLORS = ['#2563EB', '#16A34A', '#EA580C', '#9333EA', '#0D9488', '#EC4899']

const MAP_STYLE = import.meta.env.VITE_MAPTILER_KEY
  ? `https://api.maptiler.com/maps/streets/style.json?key=${import.meta.env.VITE_MAPTILER_KEY}`
  : 'https://demotiles.maplibre.org/style.json'

export function RoutePlanningMap({
  routes,
  unassigned,
  selectedRouteId,
  onStopClick,
}: RoutePlanningMapProps) {
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
          geometry: { type: 'LineString' as const, coordinates },
        },
      }
    })
  }, [routes])

  return (
    <div className="h-full w-full" aria-label="Route planning map">
      <Map
        initialViewState={{ latitude: 30.0444, longitude: 31.2357, zoom: 11 }}
        mapStyle={MAP_STYLE}
        style={{ width: '100%', height: '100%' }}
        attributionControl={false}
      >
        {/* Route lines */}
        {routeFeatures.map(({ route, color, geojson }: (typeof routeFeatures)[number]) => (
          <Source key={`line-${route.id}`} id={`route-line-${route.id}`} type="geojson" data={geojson}>
            <Layer
              id={`route-layer-${route.id}`}
              type="line"
              paint={{
                'line-color': color,
                'line-width': route.id === selectedRouteId ? 3.5 : 2,
                'line-opacity': route.id === selectedRouteId ? 1 : 0.5,
              }}
            />
          </Source>
        ))}

        {/* Stop markers */}
        {routeFeatures.map(({ route, color }: (typeof routeFeatures)[number]) =>
          route.stops.map((stop: RouteStop) => {
            const isSelected = route.id === selectedRouteId
            const size = isSelected ? 24 : 18

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
                  className="flex items-center justify-center rounded-full border-2 border-white shadow-sm"
                  style={{
                    width: size,
                    height: size,
                    backgroundColor: color,
                    cursor: 'pointer',
                  }}
                >
                  <span className="font-[family-name:var(--font-geist-mono)] text-[9px] font-bold tabular-nums text-white">
                    {stop.sequence}
                  </span>
                </div>
              </Marker>
            )
          }),
        )}

        {/* Unassigned — muted dots */}
        {unassigned.map((stop) => (
          <Marker key={`u-${stop.id}`} latitude={stop.lat} longitude={stop.lng} anchor="center">
            <div className="h-2.5 w-2.5 rounded-full border border-white bg-black/25 shadow-sm dark:bg-white/25" />
          </Marker>
        ))}
      </Map>
    </div>
  )
}
