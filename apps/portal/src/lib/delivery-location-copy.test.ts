import { describe, expect, it } from 'vitest'
import {
	customerDeliveryDestinationPlace,
	describeDriverLocationForCustomer,
	formatDeliveryTimestamp,
} from './delivery-location-copy'

describe('delivery location copy', () => {
	it('describes live driver pings with the saved destination instead of coordinates', () => {
		const copy = describeDriverLocationForCustomer({
			route: {
				destination: 'Street, Cairo, Cairo',
				destinationLocation: { lat: 30.0444, lng: 31.2357 },
				distanceKm: 5.2,
				driverLocation: { lat: 30.0046, lng: 31.2044 },
			},
		})

		expect(copy).toContain('Street, Cairo, Cairo')
		expect(copy).toContain('5.2 km')
		expect(copy).not.toMatch(/30\.0046|31\.2044/)
	})

	it('uses near-copy when the driver is already at the delivery place', () => {
		expect(
			describeDriverLocationForCustomer({
				route: {
					destination: 'Home, New Cairo',
					destinationLocation: { lat: 30.0046, lng: 31.2044 },
					distanceKm: 0,
					driverLocation: { lat: 30.0047, lng: 31.2045 },
				},
			}),
		).toBe('near Home, New Cairo')
	})

	it('does not treat order numbers or driver placeholders as place names', () => {
		const copy = describeDriverLocationForCustomer({
			route: {
				destination: 'ORD-2026-00001',
				distanceKm: 0,
				driverLocation: { lat: 30.0046, lng: 31.2044 },
			},
		})

		expect(copy).toBe('active, but no named place is saved for the latest ping')
		expect(
			customerDeliveryDestinationPlace({ route: { destination: 'Driver' } }),
		).toBeNull()
		expect(copy).not.toMatch(/30\.0046|31\.2044|ORD-2026-00001/i)
	})

	it('formats timestamps for concise customer-visible tracking rows', () => {
		expect(formatDeliveryTimestamp('2026-05-23T20:23:55.916365+00:00')).toBe(
			'2026-05-23 20:23 UTC',
		)
		expect(formatDeliveryTimestamp('pending')).toBe('pending')
	})
})
