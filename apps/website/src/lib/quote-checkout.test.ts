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
				locationName: '12 90 Street, New Cairo, Cairo, Cairo Governorate',
				longitude: 31.2357,
				street: '12 90 Street',
			},
		)
	})

	it('keeps every useful locality level in a detailed map name', () => {
		assert.equal(
			toWebsiteQuoteLocationResult({
				address: {
					city: 'Cairo',
					city_district: 'New Cairo',
					road: 'The Ring Road',
					state: 'Cairo Governorate',
					suburb: 'Mirage City',
				},
				display_name:
					'The Ring Road, Mirage City, New Cairo, Cairo, Cairo Governorate, Egypt',
				lat: '30.027411',
				lon: '31.474922',
				place_id: 44,
			})?.locationName,
			'The Ring Road, Mirage City, New Cairo, Cairo, Cairo Governorate',
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
