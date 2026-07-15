import { describe, expect, it } from 'vitest'
import { createOpenStreetMapRasterStyle } from './maplibre-style'

describe('createOpenStreetMapRasterStyle', () => {
	it('renders a neutral background before delayed raster tiles', () => {
		const style = createOpenStreetMapRasterStyle()

		expect(style.layers[0]).toEqual({
			id: 'map-background',
			paint: { 'background-color': '#e8ecef' },
			type: 'background',
		})
		expect(style.layers[1]).toMatchObject({
			source: 'osm',
			type: 'raster',
		})
	})
})
