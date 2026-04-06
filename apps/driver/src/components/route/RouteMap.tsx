import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import { createMap, cleanupMap } from '@/lib/map'
import type { RouteStop, StopStatus } from '@/stores/route'
import { useNavigate } from '@tanstack/react-router'

const statusColors: Record<StopStatus, string> = {
  pending: '#6B7280',
  en_route: '#2563EB',
  arrived: '#2563EB',
  completed: '#22C55E',
  failed: '#EF4444',
  skipped: '#F59E0B',
}

interface RouteMapProps {
  stops: RouteStop[]
  currentPosition?: { lat: number; lng: number } | null
}

export function RouteMap({ stops, currentPosition }: RouteMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const markersRef = useRef<maplibregl.Marker[]>([])
  const navigate = useNavigate()

  useEffect(() => {
    if (!containerRef.current) return

    const map = createMap(containerRef.current)
    mapRef.current = map

    const sub = map.on('load', () => {
      // Add route polyline connecting stops in order
      if (stops.length > 1) {
        const coordinates = stops.map((s) => [s.lng, s.lat] as [number, number])

        map.addSource('route-line', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates,
            },
          },
        })

        map.addLayer({
          id: 'route-line-layer',
          type: 'line',
          source: 'route-line',
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': '#2563EB',
            'line-width': 3,
            'line-opacity': 0.7,
          },
        })
      }

      // Add numbered markers for each stop
      for (const stop of stops) {
        const color = statusColors[stop.status]

        // Create custom marker element
        const el = document.createElement('div')
        el.className = 'route-marker'
        el.style.cssText = `
          width: 32px; height: 32px; border-radius: 50%;
          background: ${color}; color: white;
          display: flex; align-items: center; justify-content: center;
          font-family: var(--font-mono); font-size: 14px; font-weight: 700;
          cursor: pointer; border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        `
        el.textContent = String(stop.stop_order)

        el.addEventListener('click', () => {
          navigate({ to: '/stop-detail/$stopId', params: { stopId: stop.id } })
        })

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([stop.lng, stop.lat])
          .addTo(map)

        markersRef.current.push(marker)
      }

      // Add current position blue pulsing dot
      if (currentPosition) {
        const pulseEl = document.createElement('div')
        pulseEl.className = 'current-position-dot'
        pulseEl.style.cssText = `
          width: 16px; height: 16px; border-radius: 50%;
          background: #2563EB; border: 3px solid white;
          box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.4);
          animation: pulse-ring 2s ease-out infinite;
        `

        new maplibregl.Marker({ element: pulseEl })
          .setLngLat([currentPosition.lng, currentPosition.lat])
          .addTo(map)
      }

      // Fit bounds to show all stops
      if (stops.length > 0) {
        const bounds = new maplibregl.LngLatBounds()
        for (const stop of stops) {
          bounds.extend([stop.lng, stop.lat])
        }
        if (currentPosition) {
          bounds.extend([currentPosition.lng, currentPosition.lat])
        }
        map.fitBounds(bounds, { padding: 60 })
      }
    })

    return () => {
      // MapLibre v5: use subscription.unsubscribe() for cleanup
      if (sub && typeof sub === 'object' && 'unsubscribe' in sub) {
        (sub as { unsubscribe: () => void }).unsubscribe()
      }
      for (const marker of markersRef.current) {
        marker.remove()
      }
      markersRef.current = []
      if (mapRef.current) {
        cleanupMap(mapRef.current)
        mapRef.current = null
      }
    }
  }, [stops, currentPosition, navigate])

  return (
    <>
      <style>{`
        @keyframes pulse-ring {
          0% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.4); }
          70% { box-shadow: 0 0 0 12px rgba(37, 99, 235, 0); }
          100% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0); }
        }
      `}</style>
      <div ref={containerRef} className="h-full w-full" />
    </>
  )
}
