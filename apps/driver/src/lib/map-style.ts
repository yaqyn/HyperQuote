/**
 * MapLibre style — uses MapTiler streets if a key is configured at build
 * time, otherwise falls back to OpenStreetMap raster. The cockpit then
 * inverts/desaturates the canvas via CSS so day-mode and night-mode share
 * one source. Cairo center for sensible defaults.
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
					attribution:
						'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
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
