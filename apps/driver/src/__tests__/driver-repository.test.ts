import { describe, expect, it } from 'vitest'
import { DriverRepositoryError } from '../lib/driver-repository'
import {
	DEFAULT_DRIVER_LOCATION,
	MOCK_CURRENT_DRIVER_ID,
} from '../lib/mock-data'
import { createMockDriverRepository } from '../lib/mock-driver-repository'

const SIGNATURE_DATA_URL =
	'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB'

describe('mock driver repository', () => {
	it('moves a delivery through accept, start, arrival, and completion', async () => {
		const repository = createMockDriverRepository()

		const accepted = await repository.acceptDelivery(
			'del-zayed-rebar',
			MOCK_CURRENT_DRIVER_ID,
		)
		expect(accepted.status).toBe('accepted')

		const inTransit = await repository.startDelivery(
			accepted.id,
			MOCK_CURRENT_DRIVER_ID,
		)
		expect(inTransit.status).toBe('in_transit')

		const arrived = await repository.recordArrival(
			accepted.id,
			MOCK_CURRENT_DRIVER_ID,
		)
		expect(arrived.status).toBe('arrived')

		const completed = await repository.completeDelivery(
			accepted.id,
			MOCK_CURRENT_DRIVER_ID,
			{
				capturedAt: '2026-05-17T08:30:00.000Z',
				location: DEFAULT_DRIVER_LOCATION,
				signatureDataUrl: SIGNATURE_DATA_URL,
				signerName: 'Omar Fathy',
			},
		)
		expect(completed.status).toBe('completed')
		expect(completed.proof?.signerName).toBe('Omar Fathy')
	})

	it('requires touch signature proof before completion', async () => {
		const repository = createMockDriverRepository()
		await repository.acceptDelivery('del-zayed-rebar', MOCK_CURRENT_DRIVER_ID)
		await repository.startDelivery('del-zayed-rebar', MOCK_CURRENT_DRIVER_ID)
		await repository.recordArrival('del-zayed-rebar', MOCK_CURRENT_DRIVER_ID)

		await expect(
			repository.completeDelivery('del-zayed-rebar', MOCK_CURRENT_DRIVER_ID, {
				capturedAt: '2026-05-17T08:30:00.000Z',
				location: DEFAULT_DRIVER_LOCATION,
				signatureDataUrl: '',
				signerName: 'Omar Fathy',
			}),
		).rejects.toMatchObject(
			new DriverRepositoryError(
				'invalid_proof',
				'Completion proof requires signer name, signature, GPS, and time.',
			),
		)
	})

	it('keeps other-driver deliveries read-only', async () => {
		const repository = createMockDriverRepository()

		await expect(
			repository.acceptDelivery('del-new-cairo-tiles', MOCK_CURRENT_DRIVER_ID),
		).rejects.toMatchObject({
			code: 'delivery_unavailable',
		})
	})
})
