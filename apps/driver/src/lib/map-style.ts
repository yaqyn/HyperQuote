import type { StyleSpecification } from 'maplibre-gl'

export const MAP_STYLE: string | StyleSpecification = import.meta.env
	.VITE_MAPTILER_KEY
	? `https://api.maptiler.com/maps/streets/style.json?key=${import.meta.env.VITE_MAPTILER_KEY}`
	: {
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
		}
