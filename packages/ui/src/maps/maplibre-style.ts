interface RasterMapStyle {
	version: 8
	sources: {
		osm: {
			attribution: string
			maxzoom: number
			tileSize: number
			tiles: string[]
			type: 'raster'
		}
	}
	layers: Array<{
		id: string
		maxzoom: number
		minzoom: number
		source: 'osm'
		type: 'raster'
	}>
}

export function createOpenStreetMapRasterStyle(): RasterMapStyle {
	return {
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
}

export function createMapLibreStyle(mapTilerKey?: string) {
	return mapTilerKey
		? `https://api.maptiler.com/maps/streets/style.json?key=${mapTilerKey}`
		: createOpenStreetMapRasterStyle()
}
