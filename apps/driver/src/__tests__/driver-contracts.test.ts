import { readFileSync } from 'node:fs'
import { describe, expect, expectTypeOf, it } from 'vitest'
import {
	extractDeliverySecretCode,
	isDeliverySecretCodeReady,
} from '../lib/delivery-secret'
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

	it('normalizes delivery secret input before workflow transitions', () => {
		expect(
			extractDeliverySecretCode(
				'hqdelivery:123456781234123412341234567890ab:ab2c3d4e',
			),
		).toBe('AB2C3D4E')
		expect(extractDeliverySecretCode('AB2C-3D4E')).toBe('AB2C3D4E')
		expect(isDeliverySecretCodeReady('00000000')).toBe(false)
	})

	it('keeps scanned customer codes as input until the driver confirms', () => {
		const source = readFileSync(
			new URL('../components/ActiveDeliveryFlow.tsx', import.meta.url),
			'utf8',
		)

		expect(source).toContain('setSecretCode(value.toUpperCase())')
		expect(source).not.toContain('onArrival(deliveryId, value)')
	})
})
