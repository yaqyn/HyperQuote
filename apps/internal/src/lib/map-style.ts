/**
 * MapLibre GL style configuration.
 * Uses MapTiler if key is available, falls back to OpenStreetMap raster tiles.
 * Cairo default center: 30.0444°N, 31.2357°E
 */

export const MAP_STYLE: string = import.meta.env.VITE_MAPTILER_KEY
  ? `https://api.maptiler.com/maps/streets/style.json?key=${import.meta.env.VITE_MAPTILER_KEY}`
  : ({
      version: 8,
      sources: {
        osm: {
          type: 'raster',
          tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
          tileSize: 256,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxzoom: 19,
        },
      },
      layers: [
        {
          id: 'osm-tiles',
          type: 'raster',
          source: 'osm',
          minzoom: 0,
          maxzoom: 19,
        },
      ],
    } as unknown as string)

export const CAIRO_CENTER = { latitude: 30.0444, longitude: 31.2357 }
export const DEFAULT_ZOOM = 11
