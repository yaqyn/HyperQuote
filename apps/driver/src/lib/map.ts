import maplibregl from 'maplibre-gl'
import { Protocol } from 'pmtiles'

let protocol: Protocol | null = null

/**
 * Register PMTiles protocol with MapLibre. Idempotent.
 */
export function initMapProtocol() {
	if (protocol) return
	protocol = new Protocol()
	maplibregl.addProtocol('pmtiles', protocol.tile)
}

export interface CreateMapOptions {
	center?: [number, number]
	zoom?: number
}

/**
 * Create a MapLibre map with PMTiles source.
 * Default center: Cairo [31.2357, 30.0444], zoom 11, no attribution.
 */
export function createMap(
	container: HTMLDivElement,
	options?: CreateMapOptions,
) {
	initMapProtocol()

	return new maplibregl.Map({
		container,
		style: {
			version: 8,
			sources: {
				'cairo-tiles': {
					type: 'vector',
					url: 'pmtiles:///assets/cairo-metro.pmtiles',
				},
			},
			layers: [],
			glyphs: '/assets/fonts/{fontstack}/{range}.pbf',
		},
		center: options?.center ?? [31.2357, 30.0444],
		zoom: options?.zoom ?? 11,
		attributionControl: false,
	})
}

/**
 * Proper cleanup via map.remove().
 * MapLibre v5: use subscription.unsubscribe() for event cleanup, NOT map.off().
 */
export function cleanupMap(map: maplibregl.Map) {
	map.remove()
}
