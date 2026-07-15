import { describe, expect, it } from 'vitest'
import { toPortalQuoteLocationResult } from './quote-location'

describe('portal quote location results', () => {
	it('turns a Nominatim address into the shared quote address contract', () => {
		expect(
			toPortalQuoteLocationResult({
				address: {
					city: 'Giza',
					house_number: '8',
					road: 'Tahrir Street',
					state: 'Giza Governorate',
					suburb: 'Dokki',
				},
				display_name: '8, Tahrir Street, Dokki, Giza, Egypt',
				lat: '30.0384',
				lon: '31.2122',
				place_id: 84,
			}),
		).toEqual({
			area: 'Dokki',
			city: 'Giza',
			displayName: '8, Tahrir Street, Dokki, Giza, Egypt',
			governorate: 'Giza Governorate',
			id: '84',
			latitude: 30.0384,
			longitude: 31.2122,
			street: '8 Tahrir Street',
		})
	})

	it('rejects unusable coordinates', () => {
		expect(
			toPortalQuoteLocationResult({
				address: {},
				display_name: 'Giza, Egypt',
				lat: '30.0384',
				lon: 'not-a-coordinate',
				place_id: 85,
			}),
		).toBeNull()
	})
})
