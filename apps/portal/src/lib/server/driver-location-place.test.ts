import { describe, expect, it } from 'vitest'
import { placeNameFromNominatimResult } from './driver-location-place'

describe('driver location place names', () => {
	it('formats a real reverse-geocoded driver coordinate as a readable place', () => {
		const place = placeNameFromNominatimResult({
			address: {
				city: 'Giza',
				country: 'Egypt',
				neighbourhood: 'Egypt Bank Towers',
				postcode: '12551',
				road: 'Al Farik Kamal Amer Axis',
				state: 'Giza',
				suburb: 'Been Al-Sarayat',
			},
			display_name:
				'Al Farik Kamal Amer Axis, Egypt Bank Towers, Been Al-Sarayat, Giza, 12551, Egypt',
			name: 'Al Farik Kamal Amer Axis',
		})

		expect(place).toBe(
			'Al Farik Kamal Amer Axis, Egypt Bank Towers, Been Al-Sarayat, Giza',
		)
		expect(place).not.toMatch(/30\.0046|31\.2044|12551|Egypt$/)
	})

	it('falls back to display names without leaking IDs or country-only noise', () => {
		expect(
			placeNameFromNominatimResult({
				display_name: 'ORD-2026-00001, 12345, Cairo, Egypt',
			}),
		).toBe('Cairo')
	})
})
