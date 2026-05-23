import { readFileSync } from 'node:fs'
import { describe, expect, expectTypeOf, it } from 'vitest'
import type {
	DeliveryContact,
	DeliveryItem,
	DeliveryPoint,
	DriverStatus,
} from '../lib/driver-repository'
import type {
	DeviceLocationProvider,
	LocationProvider,
} from '../lib/location-provider'

describe('driver app contracts', () => {
	it('keeps exported delivery field contracts available for the future adapter', () => {
		expectTypeOf<DeliveryContact>()
			.toHaveProperty('phone')
			.toEqualTypeOf<string>()
		expectTypeOf<DeliveryItem>().toHaveProperty('quantity')
		expectTypeOf<DeliveryPoint>()
			.toHaveProperty('latitude')
			.toEqualTypeOf<number | null>()
		expectTypeOf<DriverStatus>().toEqualTypeOf<
			'available' | 'offline' | 'on_delivery'
		>()
	})

	it('keeps device location behind the provider interface', () => {
		expectTypeOf<
			InstanceType<typeof DeviceLocationProvider>
		>().toMatchTypeOf<LocationProvider>()
	})

	it('keeps route transitions behind explicit driver actions', () => {
		const source = readFileSync(
			new URL('../components/DriverShell.tsx', import.meta.url),
			'utf8',
		)

		expect(source).not.toContain('autoRouteStarted')
		expect(source).not.toContain('mutateAsync(routeCandidate.id)')
	})
})
