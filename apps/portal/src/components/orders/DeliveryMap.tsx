/**
 * GPS delivery map using MapLibre GL via react-map-gl.
 * MUST be wrapped in ClientOnly at the call site (not inside this component).
 * Shows driver location (blue dot), route polyline, destination (red pin), ETA overlay.
 */
import { useState, useCallback, useEffect, useRef } from 'react'
import Map, { Marker, Source, Layer } from 'react-map-gl/maplibre'
import type { MapRef } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'

interface DeliveryMapProps {
  driverLocation: { lat: number; lng: number }
  routePolyline: [number, number][]
  destination: { lat: number; lng: number }
  eta: string
}

// MapTiler with Arabic labels, fallback to OSM
const MAP_STYLE = import.meta.env.VITE_MAPTILER_KEY
  ? `https://api.maptiler.com/maps/streets/style.json?key=${import.meta.env.VITE_MAPTILER_KEY}`
  : 'https://demotiles.maplibre.org/style.json'

export function DeliveryMap({
  driverLocation,
  routePolyline,
  destination,
  eta,
}: DeliveryMapProps) {
  const mapRef = useRef<MapRef>(null)

  // Smooth position interpolation for driver marker
  const [animatedPos, setAnimatedPos] = useState(driverLocation)
  const animationRef = useRef<number | null>(null)
  const prevPosRef = useRef(driverLocation)

  useEffect(() => {
    const startPos = prevPosRef.current
    const endPos = driverLocation
    const duration = 1000
    const startTime = performance.now()

    function animate(currentTime: number) {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)

      setAnimatedPos({
        lat: startPos.lat + (endPos.lat - startPos.lat) * progress,
        lng: startPos.lng + (endPos.lng - startPos.lng) * progress,
      })

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate)
      } else {
        prevPosRef.current = endPos
      }
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [driverLocation])

  // Route GeoJSON
  const routeGeoJSON: GeoJSON.Feature<GeoJSON.LineString> = {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'LineString',
      coordinates: routePolyline,
    },
  }

  // Calculate initial viewport to fit both driver and destination
  const centerLat = (driverLocation.lat + destination.lat) / 2
  const centerLng = (driverLocation.lng + destination.lng) / 2

  const onMapLoad = useCallback(() => {
    if (mapRef.current) {
      mapRef.current.fitBounds(
        [
          [
            Math.min(driverLocation.lng, destination.lng) - 0.01,
            Math.min(driverLocation.lat, destination.lat) - 0.01,
          ],
          [
            Math.max(driverLocation.lng, destination.lng) + 0.01,
            Math.max(driverLocation.lat, destination.lat) + 0.01,
          ],
        ],
        { padding: 60, duration: 0 },
      )
    }
  }, [driverLocation, destination])

  return (
    <div
      className="relative h-[300px] max-md:h-[240px] rounded-xl overflow-hidden"
      aria-label="Delivery tracking map"
    >
      <Map
        ref={mapRef}
        initialViewState={{
          latitude: centerLat,
          longitude: centerLng,
          zoom: 12,
        }}
        mapStyle={MAP_STYLE}
        onLoad={onMapLoad}
        style={{ width: '100%', height: '100%' }}
        attributionControl={false}
      >
        {/* Route polyline */}
        <Source id="route" type="geojson" data={routeGeoJSON}>
          <Layer
            id="route-line"
            type="line"
            paint={{
              'line-color': 'var(--color-primary, #2563EB)',
              'line-width': 3,
            }}
          />
        </Source>

        {/* Driver marker -- blue dot with pulse ring */}
        <Marker latitude={animatedPos.lat} longitude={animatedPos.lng} anchor="center">
          <div className="relative">
            <div className="w-3 h-3 rounded-full bg-[var(--color-primary)] border-2 border-white shadow-md" />
            <div className="absolute inset-0 w-3 h-3 rounded-full bg-[var(--color-primary)] opacity-40 animate-ping" />
          </div>
        </Marker>

        {/* Destination marker -- red pin */}
        <Marker latitude={destination.lat} longitude={destination.lng} anchor="bottom">
          <div className="flex flex-col items-center">
            <div className="w-4 h-4 rounded-full bg-[var(--color-error)] border-2 border-white shadow-md" />
            <div className="w-0.5 h-2 bg-[var(--color-error)]" />
          </div>
        </Marker>
      </Map>

      {/* ETA overlay -- bottom-left card */}
      <div className="absolute bottom-3 start-3 bg-white/90 dark:bg-black/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg">
        <span className="font-mono text-sm font-medium text-[var(--color-text)]">
          ETA: {eta}
        </span>
      </div>
    </div>
  )
}
