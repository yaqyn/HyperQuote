import type { StyleSpecification } from 'maplibre-gl'

export const MAP_STYLE: string | StyleSpecification = import.meta.env
	.VITE_MAPTILER_KEY
	? `https://api.maptiler.com/maps/streets/style.json?key=${import.meta.env.VITE_MAPTILER_KEY}`
	: {
			version: 8,
			sources: {
				osm: {
					attribution:
						'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
					maxzoom: 19,
					tileSize: 256,
					tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
					type: 'raster',
				},
			},
			layers: [
				{
					id: 'osm-tiles',
					maxzoom: 19,
					minzoom: 0,
					source: 'osm',
					type: 'raster',
				},
			],
		}
