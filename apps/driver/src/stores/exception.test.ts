import { beforeEach, describe, expect, it, vi } from 'vitest'
import { EXCEPTION_TYPES, useExceptionStore } from './exception'

// Mock PowerSync db
const mockExecute = vi.fn().mockResolvedValue(undefined)
vi.mock('../lib/powersync', () => ({
	db: { execute: (...args: unknown[]) => mockExecute(...args) },
}))

// Mock upload queue
const mockQueuePhotoUpload = vi.fn().mockResolvedValue('upload-id')
vi.mock('../lib/upload-queue', () => ({
	queuePhotoUpload: (...args: unknown[]) => mockQueuePhotoUpload(...args),
}))

beforeEach(() => {
	useExceptionStore.getState().reset()
	mockExecute.mockClear()
	mockQueuePhotoUpload.mockClear()
})

describe('useExceptionStore', () => {
	it('setType sets step to 1 and stores the type', () => {
		useExceptionStore.getState().setType('site_blocked')
		const state = useExceptionStore.getState()
		expect(state.type).toBe('site_blocked')
		expect(state.step).toBe(1)
	})

	it('addPhoto appends to photos array', () => {
		useExceptionStore.getState().addPhoto('file://photo1.jpg')
		useExceptionStore.getState().addPhoto('file://photo2.jpg')
		expect(useExceptionStore.getState().photos).toEqual([
			'file://photo1.jpg',
			'file://photo2.jpg',
		])
	})

	it('removePhoto removes by index', () => {
		useExceptionStore.getState().addPhoto('file://a.jpg')
		useExceptionStore.getState().addPhoto('file://b.jpg')
		useExceptionStore.getState().addPhoto('file://c.jpg')
		useExceptionStore.getState().removePhoto(1)
		expect(useExceptionStore.getState().photos).toEqual([
			'file://a.jpg',
			'file://c.jpg',
		])
	})

	it('setDetails merges into existing details', () => {
		useExceptionStore.getState().setDetails('blockType', 'gate_locked')
		useExceptionStore.getState().setDetails('calledContact', true)
		const details = useExceptionStore.getState().details
		expect(details).toEqual({ blockType: 'gate_locked', calledContact: true })
	})

	it('submit inserts into delivery_exceptions', async () => {
		useExceptionStore.getState().setDelivery('del-1', 'stop-1')
		useExceptionStore.getState().setType('site_blocked')
		useExceptionStore.getState().setGps(30.0444, 31.2357)

		await useExceptionStore.getState().submit()

		expect(mockExecute).toHaveBeenCalledWith(
			expect.stringContaining('INSERT INTO delivery_exceptions'),
			expect.arrayContaining(['del-1', 'stop-1', 'site_blocked']),
		)
	})

	it('submit maps all 7 exception types to correct failure_reason', async () => {
		const expectedMappings: Record<string, string> = {
			customer_unavailable: 'customer_absent',
			site_blocked: 'access_blocked',
			wrong_address: 'wrong_address',
			damaged_goods: 'damaged_in_transit',
			partial_delivery: 'customer_refused',
			weather_delay: 'weather',
			vehicle_issue: 'vehicle_breakdown',
		}

		for (const [exType, reason] of Object.entries(expectedMappings)) {
			mockExecute.mockClear()
			useExceptionStore.getState().reset()
			useExceptionStore.getState().setDelivery('del-1', 'stop-1')
			useExceptionStore
				.getState()
				.setType(
					exType as Parameters<
						ReturnType<typeof useExceptionStore.getState>['setType']
					>[0],
				)

			await useExceptionStore.getState().submit()

			// Second call is the UPDATE deliveries SET failure_reason
			expect(mockExecute).toHaveBeenCalledWith(
				expect.stringContaining('UPDATE deliveries SET failure_reason'),
				[reason, 'del-1'],
			)
		}
	})

	it('submit queues photos into upload_queue with type exception', async () => {
		useExceptionStore.getState().setDelivery('del-1', 'stop-1')
		useExceptionStore.getState().setType('damaged_goods')
		useExceptionStore.getState().addPhoto('file://dmg1.jpg')
		useExceptionStore.getState().addPhoto('file://dmg2.jpg')

		await useExceptionStore.getState().submit()

		expect(mockQueuePhotoUpload).toHaveBeenCalledTimes(2)
		expect(mockQueuePhotoUpload).toHaveBeenCalledWith('file://dmg1.jpg', {
			type: 'exception',
			entityId: expect.any(String),
		})
		expect(mockQueuePhotoUpload).toHaveBeenCalledWith('file://dmg2.jpg', {
			type: 'exception',
			entityId: expect.any(String),
		})
	})

	it('reset clears all state back to initial values', () => {
		useExceptionStore.getState().setType('vehicle_issue')
		useExceptionStore.getState().setDelivery('del-1', 'stop-1')
		useExceptionStore.getState().addPhoto('file://p.jpg')
		useExceptionStore.getState().setGps(30, 31)
		useExceptionStore.getState().setDetails('key', 'val')

		useExceptionStore.getState().reset()
		const state = useExceptionStore.getState()

		expect(state.type).toBeNull()
		expect(state.deliveryId).toBeNull()
		expect(state.stopId).toBeNull()
		expect(state.photos).toEqual([])
		expect(state.gpsLat).toBeNull()
		expect(state.gpsLng).toBeNull()
		expect(state.details).toEqual({})
		expect(state.step).toBe(0)
	})

	it('EXCEPTION_TYPES has 7 items', () => {
		expect(EXCEPTION_TYPES).toHaveLength(7)
	})
})
