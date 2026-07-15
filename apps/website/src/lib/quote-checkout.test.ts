import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { toWebsiteQuoteLocationResult } from './quote-checkout'

describe('website quote location results', () => {
	it('turns a Nominatim address into the quote address contract', () => {
		assert.deepEqual(
			toWebsiteQuoteLocationResult({
				address: {
					city: 'Cairo',
					house_number: '12',
					road: '90 Street',
					state: 'Cairo Governorate',
					suburb: 'New Cairo',
				},
				display_name: '12, 90 Street, New Cairo, Cairo, Egypt',
				lat: '30.0444',
				lon: '31.2357',
				place_id: 42,
			}),
			{
				area: 'New Cairo',
				city: 'Cairo',
				displayName: '12, 90 Street, New Cairo, Cairo, Egypt',
				governorate: 'Cairo Governorate',
				id: '42',
				latitude: 30.0444,
				longitude: 31.2357,
				street: '12 90 Street',
			},
		)
	})

	it('rejects unusable coordinates', () => {
		assert.equal(
			toWebsiteQuoteLocationResult({
				address: {},
				display_name: 'Cairo, Egypt',
				lat: 'not-a-coordinate',
				lon: '31.2357',
				place_id: 43,
			}),
			null,
		)
	})
})
