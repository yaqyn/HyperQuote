import { readdirSync, readFileSync } from 'node:fs'
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

function latestMigrationFunctionSource(functionName: string): string {
	const migrationsDir = new URL(
		'../../../../supabase/migrations/',
		import.meta.url,
	)
	const source = readdirSync(migrationsDir)
		.filter((file) => file.endsWith('.sql'))
		.sort()
		.map((file) => readFileSync(new URL(file, migrationsDir), 'utf8'))
		.join('\n')
	const functionStart = source.lastIndexOf(
		`create or replace function ${functionName}`,
	)
	if (functionStart === -1) {
		throw new Error(`Missing migration function ${functionName}`)
	}
	const functionEnd = source.indexOf('\n$$;', functionStart)
	if (functionEnd === -1) {
		throw new Error(`Missing migration function terminator for ${functionName}`)
	}
	return source.slice(functionStart, functionEnd + 4)
}

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

	it('keeps driver exceptions as dispatch calls instead of driver rejection', () => {
		const activeFlowSource = readFileSync(
			new URL('../components/ActiveDeliveryFlow.tsx', import.meta.url),
			'utf8',
		)
		const apiSource = readFileSync(
			new URL('../api.ts', import.meta.url),
			'utf8',
		)
		const shellSource = readFileSync(
			new URL('../components/DriverShell.tsx', import.meta.url),
			'utf8',
		)
		const repositorySource = readFileSync(
			new URL('../lib/supabase-driver-repository.ts', import.meta.url),
			'utf8',
		)
		const authSource = readFileSync(
			new URL('../../../../packages/auth/src/server.ts', import.meta.url),
			'utf8',
		)
		const driverRejectSource = latestMigrationFunctionSource(
			'public.driver_reject_delivery',
		)
		const workflowGuardSource = latestMigrationFunctionSource(
			'app_private.workflow_state_change_is_authorized',
		)

		expect(activeFlowSource).toContain('active.callDispatch')
		expect(activeFlowSource).toMatch(/href=\{`tel:\$\{normalizedPhone\}`\}/)
		expect(activeFlowSource).not.toContain('RejectionForm')
		expect(activeFlowSource).not.toContain('rejection.submit')
		expect(apiSource).not.toContain('driver_reject_delivery')
		expect(apiSource).not.toContain("action === 'reject'")
		expect(shellSource).not.toContain('rejectDelivery')
		expect(repositorySource).not.toContain('rejectDelivery(')
		expect(repositorySource).not.toContain("| 'reject'")
		expect(authSource).not.toContain("'driver_reject_delivery'")
		expect(driverRejectSource).toContain('driver_contact_dispatch_required')
		expect(workflowGuardSource).not.toContain('public.driver_reject_delivery')
	})

	it('releases actual delivery drivers when dispatch returns a loaded order', () => {
		const source = latestMigrationFunctionSource(
			'public.dispatch_return_loaded_order',
		)

		expect(source).toContain('release_driver_ids')
		expect(source).toMatch(
			/select driver_id[\s\S]*from public\.loading_task_drivers[\s\S]*union[\s\S]*select driver_id[\s\S]*from public\.deliveries/,
		)
		expect(source).toContain('where id = any(release_driver_ids)')
		expect(source).toContain("status <> 'disabled'")
		expect(source).toContain('where id = any(release_truck_ids)')
		expect(source).toContain("status <> 'maintenance'")
	})

	it('keeps warehouse sign-off as the route-starting confirmation', () => {
		const warehouseApproveSource = latestMigrationFunctionSource(
			'public.warehouse_approve_loading',
		)
		const ensureDeliverySource = latestMigrationFunctionSource(
			'app_private.ensure_loading_task_active_deliveries',
		)
		const driverStartSource = latestMigrationFunctionSource(
			'public.driver_start_delivery',
		)

		expect(warehouseApproveSource).toContain("set status = 'out_for_delivery'")
		expect(warehouseApproveSource).toContain(
			'perform app_private.ensure_delivery_secret_for_order(updated.order_id)',
		)
		expect(ensureDeliverySource).toMatch(
			/insert into public\.deliveries \([\s\S]*status,[\s\S]*started_at[\s\S]*'in_transit',[\s\S]*now\(\)/,
		)
		expect(driverStartSource).toMatch(
			/and status in \('assigned', 'accepted'\)/,
		)
	})

	it('starts assigned deliveries with one driver action as a legacy fallback', () => {
		const source = readFileSync(
			new URL('../components/ActiveDeliveryFlow.tsx', import.meta.url),
			'utf8',
		)
		const assignedBlockIndex = source.indexOf(
			"delivery.status === 'assigned' || delivery.status === 'accepted'",
		)
		const assignedBlock = source.slice(
			assignedBlockIndex,
			assignedBlockIndex + 350,
		)

		expect(assignedBlockIndex).toBeGreaterThan(-1)
		expect(assignedBlock).toContain('onStart(delivery.id)')
		expect(assignedBlock).not.toContain('onAccept(delivery.id)')
	})

	it('enforces a single active driver app session at the driver API boundary', () => {
		const apiSource = readFileSync(
			new URL('../api.ts', import.meta.url),
			'utf8',
		)

		expect(apiSource).toContain('driver_app_sessions')
		expect(apiSource).toContain("url.pathname === '/api/driver/session/claim'")
		expect(apiSource).toContain("'driver_session_replaced'")
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

	it('submits scanned customer codes as delivery completion proof', () => {
		const source = readFileSync(
			new URL('../components/ActiveDeliveryFlow.tsx', import.meta.url),
			'utf8',
		)

		expect(source).toContain('onSecretScanned={submitSecret}')
		expect(source).toContain("delivery.status === 'in_transit'")
		expect(source).toContain("delivery.status === 'arrived'")
		expect(source).not.toContain('onSecretScanned={setSecretCode}')
		expect(source).not.toContain('onSecretScanned={setCompletionCode}')
		expect(source).not.toContain('onBackToRoute')
	})

	it('validates customer codes before requesting GPS for completion', () => {
		const source = readFileSync(
			new URL('../components/DriverShell.tsx', import.meta.url),
			'utf8',
		)
		const completionStart = source.indexOf(
			'const completeDelivery = useMutation',
		)
		const completionEnd = source.indexOf('const sendMessage = useMutation')
		const completionBlock = source.slice(completionStart, completionEnd)

		expect(completionStart).toBeGreaterThan(-1)
		expect(completionEnd).toBeGreaterThan(completionStart)
		expect(completionBlock).toContain("setCompletionStage('verifying')")
		expect(completionBlock).toContain('driverRepository.confirmArrival(')
		expect(
			completionBlock.indexOf('driverRepository.confirmArrival('),
		).toBeLessThan(
			completionBlock.indexOf('locationProvider.getCurrentPosition()'),
		)
		expect(completionBlock).toContain("setCompletionStage('location')")
		expect(completionBlock).toContain("setCompletionStage('completing')")
	})

	it('keeps invalid delivery secrets mapped to a direct driver error', () => {
		const apiSource = readFileSync(
			new URL('../api.ts', import.meta.url),
			'utf8',
		)
		const repositorySource = readFileSync(
			new URL('../lib/supabase-driver-repository.ts', import.meta.url),
			'utf8',
		)

		expect(apiSource).toContain('isDeliverySecretError(error)')
		expect(apiSource).toContain("errorJson(400, 'invalid_delivery_secret')")
		expect(repositorySource).toContain("'invalid_secret'")
		expect(repositorySource).toContain(
			'Customer verification code is wrong. Try again.',
		)
	})

	it('allows a valid customer code to complete an in-transit delivery directly', () => {
		const source = latestMigrationFunctionSource(
			'public.driver_confirm_delivery',
		)

		expect(source).toContain(
			"target_delivery.status not in ('in_transit', 'arrived')",
		)
		expect(source).toContain("set status = 'completed'")
		expect(source).toContain('arrived_at = coalesce(arrived_at, now())')
		expect(source).toContain('verified_delivery_id = p_delivery_id')
		expect(source).not.toContain("target_delivery.status <> 'arrived'")
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
