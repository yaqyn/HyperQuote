import type {
	CompletionProof,
	DriverDashboard,
	DriverDelivery,
	DriverLocation,
	DriverProfile,
	DriverRepository,
	TeamMessage,
} from './driver-repository'
import {
	DriverRepositoryError,
	isCompletionProofReady,
} from './driver-repository'
import { MOCK_DELIVERIES, MOCK_DRIVERS, MOCK_TEAM_MESSAGES } from './mock-data'

interface MockRepositoryState {
	deliveries: DriverDelivery[]
	drivers: DriverProfile[]
	messages: TeamMessage[]
}

export function createMockDriverRepository(
	initialState: MockRepositoryState = {
		deliveries: MOCK_DELIVERIES,
		drivers: MOCK_DRIVERS,
		messages: MOCK_TEAM_MESSAGES,
	},
): DriverRepository {
	const state: MockRepositoryState = structuredClone(initialState)

	function findDriver(driverId: string): DriverProfile {
		const driver = state.drivers.find((item) => item.id === driverId)
		if (!driver) {
			throw new DriverRepositoryError(
				'driver_not_found',
				'Driver record was not found.',
			)
		}
		return driver
	}

	function findDelivery(deliveryId: string): DriverDelivery {
		const delivery = state.deliveries.find((item) => item.id === deliveryId)
		if (!delivery) {
			throw new DriverRepositoryError(
				'delivery_not_found',
				'Delivery record was not found.',
			)
		}
		return delivery
	}

	function cloneDelivery(delivery: DriverDelivery): DriverDelivery {
		return structuredClone(delivery)
	}

	function cloneDriver(driver: DriverProfile): DriverProfile {
		return structuredClone(driver)
	}

	function activeDeliveryFor(driverId: string): DriverDelivery | null {
		return (
			state.deliveries.find(
				(delivery) =>
					delivery.driverId === driverId &&
					['accepted', 'in_transit', 'arrived'].includes(delivery.status),
			) ?? null
		)
	}

	function nextDeliveryFor(driverId: string): DriverDelivery | null {
		return (
			state.deliveries.find(
				(delivery) =>
					delivery.status === 'available' ||
					(delivery.driverId === driverId && delivery.status === 'accepted'),
			) ?? null
		)
	}

	function syncDriverActivity(driverId: string) {
		const driver = findDriver(driverId)
		const activeDelivery = activeDeliveryFor(driverId)
		driver.activeDeliveryId = activeDelivery?.id
		driver.status = activeDelivery ? 'on_delivery' : 'available'
	}

	return {
		async getDashboard(driverId: string): Promise<DriverDashboard> {
			const currentDriver = findDriver(driverId)
			const activeDelivery = activeDeliveryFor(driverId)
			const nextDelivery = activeDelivery ? null : nextDeliveryFor(driverId)

			return {
				activeDelivery: activeDelivery ? cloneDelivery(activeDelivery) : null,
				completedToday: state.deliveries.filter(
					(delivery) =>
						delivery.driverId === driverId && delivery.status === 'completed',
				).length,
				currentDriver: cloneDriver(currentDriver),
				nextDelivery: nextDelivery ? cloneDelivery(nextDelivery) : null,
				openDeliveries: state.deliveries.filter(
					(delivery) => delivery.status === 'available',
				).length,
			}
		},

		async listDeliveries(): Promise<DriverDelivery[]> {
			return state.deliveries.map(cloneDelivery)
		},

		async acceptDelivery(
			deliveryId: string,
			driverId: string,
		): Promise<DriverDelivery> {
			findDriver(driverId)
			const delivery = findDelivery(deliveryId)
			const activeDelivery = activeDeliveryFor(driverId)

			if (activeDelivery && activeDelivery.id !== delivery.id) {
				throw new DriverRepositoryError(
					'delivery_unavailable',
					'Driver already has an active delivery.',
				)
			}

			if (
				delivery.status !== 'available' &&
				!(delivery.driverId === driverId && delivery.status === 'accepted')
			) {
				throw new DriverRepositoryError(
					'delivery_unavailable',
					'Delivery is not available for this driver.',
				)
			}

			delivery.status = 'accepted'
			delivery.driverId = driverId
			delivery.acceptedAt = new Date().toISOString()
			syncDriverActivity(driverId)
			return cloneDelivery(delivery)
		},

		async startDelivery(
			deliveryId: string,
			driverId: string,
		): Promise<DriverDelivery> {
			const delivery = findDelivery(deliveryId)
			if (delivery.driverId !== driverId || delivery.status !== 'accepted') {
				throw new DriverRepositoryError(
					'invalid_transition',
					'Delivery must be accepted before route start.',
				)
			}

			delivery.status = 'in_transit'
			delivery.departedAt = new Date().toISOString()
			syncDriverActivity(driverId)
			return cloneDelivery(delivery)
		},

		async recordArrival(
			deliveryId: string,
			driverId: string,
		): Promise<DriverDelivery> {
			const delivery = findDelivery(deliveryId)
			if (delivery.driverId !== driverId || delivery.status !== 'in_transit') {
				throw new DriverRepositoryError(
					'invalid_transition',
					'Delivery must be in transit before arrival.',
				)
			}

			delivery.status = 'arrived'
			delivery.arrivedAt = new Date().toISOString()
			syncDriverActivity(driverId)
			return cloneDelivery(delivery)
		},

		async completeDelivery(
			deliveryId: string,
			driverId: string,
			proof: CompletionProof,
		): Promise<DriverDelivery> {
			const delivery = findDelivery(deliveryId)
			if (delivery.driverId !== driverId || delivery.status !== 'arrived') {
				throw new DriverRepositoryError(
					'invalid_transition',
					'Delivery must be arrived before proof capture.',
				)
			}

			if (!isCompletionProofReady(proof)) {
				throw new DriverRepositoryError(
					'invalid_proof',
					'Completion proof requires signer name, signature, GPS, and time.',
				)
			}

			delivery.status = 'completed'
			delivery.completedAt = proof.capturedAt
			delivery.proof = structuredClone(proof)
			syncDriverActivity(driverId)
			return cloneDelivery(delivery)
		},

		async listActiveDrivers(): Promise<DriverProfile[]> {
			return state.drivers.map(cloneDriver)
		},

		async listTeamMessages(): Promise<TeamMessage[]> {
			return structuredClone(state.messages)
		},

		async sendTeamMessage(
			driverId: string,
			body: string,
		): Promise<TeamMessage> {
			const driver = findDriver(driverId)
			const trimmed = body.trim()
			const message: TeamMessage = {
				id: `msg-${state.messages.length + 1}`,
				authorDriverId: driver.id,
				authorName: driver.name,
				body: { en: trimmed, ar: trimmed },
				createdAt: new Date().toISOString(),
			}
			state.messages.push(message)
			return structuredClone(message)
		},

		async updateLocation(
			driverId: string,
			location: DriverLocation,
		): Promise<DriverProfile> {
			const driver = findDriver(driverId)
			driver.location = structuredClone(location)
			return cloneDriver(driver)
		},
	}
}

export const driverRepository = createMockDriverRepository()
