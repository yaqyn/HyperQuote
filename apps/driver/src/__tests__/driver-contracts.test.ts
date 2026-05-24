import { readFileSync } from 'node:fs'
import {
	bearingBetweenPoints,
	buildOsrmRouteUrl,
	resolveRoadRoute,
} from '@hyperquote/ui/maps/road-route'
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

	it('enforces a single active driver app session at the Worker API boundary', () => {
		const workerSource = readFileSync(
			new URL('../worker.ts', import.meta.url),
			'utf8',
		)

		expect(workerSource).toContain('driver_app_sessions')
		expect(workerSource).toContain(
			"url.pathname === '/api/driver/session/claim'",
		)
		expect(workerSource).toContain("'driver_session_replaced'")
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

		expect(source).toContain('onSecretScanned={setSecretCode}')
		expect(source).toContain('onSecretScanned={setCompletionCode}')
		expect(source).not.toContain('onArrival(deliveryId, value)')
	})

	it('decodes QR camera frames without relying only on BarcodeDetector', () => {
		const source = readFileSync(
			new URL('../components/ActiveDeliveryFlow.tsx', import.meta.url),
			'utf8',
		)

		expect(source).toContain('jsQR(')
		expect(source).toContain('decodeQrFromVideo(video, canvas)')
		expect(source).not.toContain('getBarcodeDetector() !== null')
	})

	it('resolves delivery map lines from road route geometry', async () => {
		const url = buildOsrmRouteUrl([
			{ lat: 30.1, lng: 31.1 },
			{ lat: 30.3, lng: 31.3 },
		])

		expect(url).toContain('/31.100000,30.100000;31.300000,30.300000')
		expect(url).toContain('geometries=geojson')

		const fetcher: typeof fetch = async () =>
			new Response(
				JSON.stringify({
					routes: [
						{
							distance: 1234,
							duration: 345,
							geometry: {
								coordinates: [
									[31.1, 30.1],
									[31.2, 30.2],
									[31.3, 30.3],
								],
							},
						},
					],
				}),
			)

		const route = await resolveRoadRoute({
			endpoint: 'https://route.test/route/v1/driving',
			fetcher,
			points: [
				{ lat: 30.1, lng: 31.1 },
				{ lat: 30.3, lng: 31.3 },
			],
		})

		expect(route.source).toBe('road')
		expect(route.coordinates).toEqual([
			[31.1, 30.1],
			[31.2, 30.2],
			[31.3, 30.3],
		])
		expect(route.distanceMeters).toBe(1234)
		expect(route.durationSeconds).toBe(345)
	})

	it('marks straight route lines as fallback only when routing fails', async () => {
		const fetcher: typeof fetch = async () =>
			new Response('{}', { status: 503 })
		const route = await resolveRoadRoute({
			fetcher,
			points: [
				{ lat: 30.1, lng: 31.1 },
				{ lat: 30.3, lng: 31.3 },
			],
		})

		expect(route.source).toBe('fallback')
		expect(route.coordinates).toEqual([
			[31.1, 30.1],
			[31.3, 30.3],
		])
	})

	it('keeps driver map movement fed by live local GPS and bearing', () => {
		const shellSource = readFileSync(
			new URL('../components/DriverShell.tsx', import.meta.url),
			'utf8',
		)
		const mapSource = readFileSync(
			new URL('../components/DeliveryMap.tsx', import.meta.url),
			'utf8',
		)

		expect(shellSource).toContain('.watchPosition(rememberLiveLocation)')
		expect(mapSource).toContain('resolveRoadRoute')
		expect(mapSource).toContain('map.easeTo')
		expect(
			Math.round(
				bearingBetweenPoints({ lat: 30, lng: 31 }, { lat: 31, lng: 31 }) ?? -1,
			),
		).toBe(0)
		expect(
			Math.round(
				bearingBetweenPoints({ lat: 30, lng: 31 }, { lat: 30, lng: 32 }) ?? -1,
			),
		).toBe(90)
	})
})
