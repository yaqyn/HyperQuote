/**
 * MapLibre GL map with GPS pins, clusters, route lines, geofence circles.
 * MUST be wrapped in ClientOnly at the call site (not inside this component).
 *
 * - Data-driven circle layer for vehicle pins (color by status, size by zoom)
 * - Supercluster-based clustering with numbered circles
 * - Route lines: solid completed, dashed remaining
 * - Geofence circles around delivery sites (200m radius)
 * - Click cluster -> zoom to expand, click pin -> show VehiclePopup
 */
import { useCallback, useMemo, useRef } from 'react'
import Map, { Source, Layer, Popup } from 'react-map-gl/maplibre'
import type { MapRef, MapLayerMouseEvent, ViewStateChangeEvent } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { CircleLayerSpecification, SymbolLayerSpecification } from 'maplibre-gl'
import { useDispatchStore } from '../../../stores/dispatch'
import type { GPSPosition, DeliveryRoute, Driver } from '../../../types/dispatch'
import { VehiclePopup } from './VehiclePopup'

// ─── Map Style ──────────────────────────────────────────

const MAP_STYLE = import.meta.env.VITE_MAPTILER_KEY
  ? `https://api.maptiler.com/maps/streets/style.json?key=${import.meta.env.VITE_MAPTILER_KEY}`
  : 'https://demotiles.maplibre.org/style.json'

// ─── Status Colors ──────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  loading: '#EAB308',
  transit: '#22C55E',
  at_site: '#2563EB',
  delivered: '#16A34A',
  problem: '#EF4444',
  offline: '#9CA3AF',
}

// ─── Route Colors ───────────────────────────────────────

const ROUTE_COLORS = ['#2563EB', '#8B5CF6', '#EC4899', '#F97316', '#14B8A6']

// ─── Layer Specs ────────────────────────────────────────

const vehicleCircleLayer: CircleLayerSpecification = {
  id: 'vehicle-circles',
  type: 'circle',
  source: 'vehicles',
  filter: ['!', ['has', 'point_count']],
  paint: {
    'circle-color': [
      'match',
      ['get', 'status'],
      'loading', STATUS_COLORS.loading,
      'transit', STATUS_COLORS.transit,
      'at_site', STATUS_COLORS.at_site,
      'delivered', STATUS_COLORS.delivered,
      'problem', STATUS_COLORS.problem,
      STATUS_COLORS.offline,
    ],
    'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 6, 14, 12],
    'circle-stroke-color': '#FFFFFF',
    'circle-stroke-width': 2,
  },
}

const clusterCircleLayer: CircleLayerSpecification = {
  id: 'cluster-circles',
  type: 'circle',
  source: 'vehicles',
  filter: ['has', 'point_count'],
  paint: {
    'circle-color': '#2563EB',
    'circle-radius': ['step', ['get', 'point_count'], 18, 5, 24, 10, 30],
    'circle-stroke-color': '#FFFFFF',
    'circle-stroke-width': 2,
    'circle-opacity': 0.85,
  },
}

const clusterCountLayer: SymbolLayerSpecification = {
  id: 'cluster-count',
  type: 'symbol',
  source: 'vehicles',
  filter: ['has', 'point_count'],
  layout: {
    'text-field': '{point_count_abbreviated}',
    'text-font': ['Open Sans Bold'],
    'text-size': 13,
  },
  paint: {
    'text-color': '#FFFFFF',
  },
}

// ─── Types ──────────────────────────────────────────────

interface VehicleMapProps {
  positions: Map<string, GPSPosition>
  routes: DeliveryRoute[]
  drivers: Driver[]
  selectedVehicle: GPSPosition | null
  onSelectVehicle: (pos: GPSPosition | null) => void
  highlightedRouteId?: string | null
}

// ─── Helpers ────────────────────────────────────────────

function buildVehicleGeoJSON(positions: Map<string, GPSPosition>): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: Array.from(positions.values()).map((pos) => ({
      type: 'Feature' as const,
      properties: {
        driverId: pos.driverId,
        status: pos.status,
        speed: pos.speed,
        heading: pos.heading,
      },
      geometry: {
        type: 'Point' as const,
        coordinates: [pos.lng, pos.lat],
      },
    })),
  }
}

/** Split route stops into completed and remaining LineStrings */
function buildRouteGeoJSON(route: DeliveryRoute): {
  completed: GeoJSON.Feature<GeoJSON.LineString>
  remaining: GeoJSON.Feature<GeoJSON.LineString>
} {
  const completedStops = route.stops.filter(
    (s) => s.status === 'delivered' || s.status === 'arrived',
  )
  const remainingStops = route.stops.filter(
    (s) => s.status !== 'delivered' && s.status !== 'arrived',
  )

  // Include the last completed stop as first point of remaining for continuity
  const lastCompleted = completedStops[completedStops.length - 1]
  const remainingWithBridge = lastCompleted
    ? [lastCompleted, ...remainingStops]
    : remainingStops

  return {
    completed: {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: completedStops.map((s) => [s.lng, s.lat]),
      },
    },
    remaining: {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: remainingWithBridge.map((s) => [s.lng, s.lat]),
      },
    },
  }
}

/** Build geofence circles as GeoJSON polygon approximations (200m radius) */
function buildGeofenceGeoJSON(routes: DeliveryRoute[]): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = []
  const RADIUS_DEG = 200 / 111320 // ~200m in degrees

  for (const route of routes) {
    for (const stop of route.stops) {
      const coords: [number, number][] = []
      for (let i = 0; i <= 32; i++) {
        const angle = (i / 32) * 2 * Math.PI
        coords.push([
          stop.lng + RADIUS_DEG * Math.cos(angle),
          stop.lat + RADIUS_DEG * Math.sin(angle),
        ])
      }
      features.push({
        type: 'Feature',
        properties: { stopId: stop.id },
        geometry: { type: 'Polygon', coordinates: [coords] },
      })
    }
  }

  return { type: 'FeatureCollection', features }
}

// ─── Component ──────────────────────────────────────────

export function VehicleMap({
  positions,
  routes,
  drivers,
  selectedVehicle,
  onSelectVehicle,
  highlightedRouteId,
}: VehicleMapProps) {
  const mapRef = useRef<MapRef>(null)
  const mapViewport = useDispatchStore((s) => s.mapViewport)
  const setMapViewport = useDispatchStore((s) => s.setMapViewport)

  // Vehicle GeoJSON source data with clustering
  const vehicleGeoJSON = useMemo(() => buildVehicleGeoJSON(positions), [positions])
  const geofenceGeoJSON = useMemo(() => buildGeofenceGeoJSON(routes), [routes])

  // Route lines data
  const routeLines = useMemo(
    () =>
      routes
        .filter((r) => r.stops.length >= 2)
        .map((r, i) => ({
          id: r.id,
          color: ROUTE_COLORS[i % ROUTE_COLORS.length]!,
          ...buildRouteGeoJSON(r),
        })),
    [routes],
  )

  const onMove = useCallback(
    (evt: ViewStateChangeEvent) => {
      setMapViewport({
        latitude: evt.viewState.latitude,
        longitude: evt.viewState.longitude,
        zoom: evt.viewState.zoom,
      })
    },
    [setMapViewport],
  )

  const onClick = useCallback(
    (evt: MapLayerMouseEvent) => {
      // Check cluster click first
      const clusterFeature = evt.features?.find((f) => f.layer?.id === 'cluster-circles')
      if (clusterFeature && mapRef.current) {
        const clusterId = clusterFeature.properties?.cluster_id
        const source = mapRef.current.getSource('vehicles')
        if (source && 'getClusterExpansionZoom' in source) {
          ;(source as unknown as { getClusterExpansionZoom: (id: number, cb: (err: unknown, zoom: number) => void) => void })
            .getClusterExpansionZoom(clusterId, (_err, zoom) => {
              const [lng, lat] = (clusterFeature.geometry as GeoJSON.Point).coordinates
              mapRef.current?.easeTo({ center: [lng!, lat!], zoom, duration: 500 })
            })
        }
        return
      }

      // Check vehicle pin click
      const vehicleFeature = evt.features?.find((f) => f.layer?.id === 'vehicle-circles')
      if (vehicleFeature) {
        const driverId = vehicleFeature.properties?.driverId
        const pos = positions.get(driverId)
        if (pos) {
          onSelectVehicle(pos)
          return
        }
      }

      // Click on empty area clears selection
      onSelectVehicle(null)
    },
    [positions, onSelectVehicle],
  )

  // Find driver info for selected vehicle popup
  const selectedDriver = selectedVehicle
    ? drivers.find((d) => d.id === selectedVehicle.driverId)
    : null
  const selectedRoute = selectedVehicle
    ? routes.find((r) => r.driverId === selectedVehicle.driverId)
    : null

  return (
    <Map
      ref={mapRef}
      initialViewState={{
        latitude: mapViewport.latitude,
        longitude: mapViewport.longitude,
        zoom: mapViewport.zoom,
      }}
      mapStyle={MAP_STYLE}
      style={{ width: '100%', height: '100%' }}
      attributionControl={false}
      onMove={onMove}
      onClick={onClick}
      interactiveLayerIds={['vehicle-circles', 'cluster-circles']}
      cursor="pointer"
    >
      {/* Geofence circles */}
      <Source id="geofences" type="geojson" data={geofenceGeoJSON}>
        <Layer
          id="geofence-fill"
          type="fill"
          paint={{
            'fill-color': '#2563EB',
            'fill-opacity': 0.08,
          }}
        />
        <Layer
          id="geofence-border"
          type="line"
          paint={{
            'line-color': '#2563EB',
            'line-width': 1,
            'line-opacity': 0.25,
            'line-dasharray': [3, 3],
          }}
        />
      </Source>

      {/* Route lines */}
      {routeLines.map((rl) => {
        const isHighlighted = highlightedRouteId === rl.id
        const opacity = highlightedRouteId && !isHighlighted ? 0.15 : 1

        return (
          <span key={rl.id}>
            {/* Completed portion: solid */}
            <Source id={`route-completed-${rl.id}`} type="geojson" data={rl.completed}>
              <Layer
                id={`route-completed-${rl.id}`}
                type="line"
                paint={{
                  'line-color': rl.color,
                  'line-width': isHighlighted ? 4 : 3,
                  'line-opacity': opacity,
                }}
              />
            </Source>
            {/* Remaining portion: dashed */}
            <Source id={`route-remaining-${rl.id}`} type="geojson" data={rl.remaining}>
              <Layer
                id={`route-remaining-${rl.id}`}
                type="line"
                paint={{
                  'line-color': rl.color,
                  'line-width': isHighlighted ? 4 : 3,
                  'line-opacity': opacity * 0.5,
                  'line-dasharray': [2, 2],
                }}
              />
            </Source>
          </span>
        )
      })}

      {/* Vehicle pins with clustering */}
      <Source
        id="vehicles"
        type="geojson"
        data={vehicleGeoJSON}
        cluster
        clusterMaxZoom={14}
        clusterRadius={60}
      >
        <Layer {...vehicleCircleLayer} />
        <Layer {...clusterCircleLayer} />
        <Layer {...clusterCountLayer} />
      </Source>

      {/* Vehicle popup */}
      {selectedVehicle && selectedDriver && (
        <Popup
          latitude={selectedVehicle.lat}
          longitude={selectedVehicle.lng}
          anchor="bottom"
          onClose={() => onSelectVehicle(null)}
          closeOnClick={false}
          offset={16}
          className="!p-0 [&_.maplibregl-popup-content]:!p-0 [&_.maplibregl-popup-content]:!bg-transparent [&_.maplibregl-popup-content]:!shadow-none"
        >
          <VehiclePopup
            position={selectedVehicle}
            driver={selectedDriver}
            route={selectedRoute ?? null}
            onClose={() => onSelectVehicle(null)}
          />
        </Popup>
      )}
    </Map>
  )
}
