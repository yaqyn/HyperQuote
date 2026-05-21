import { createSupabaseBrowserClient } from '@hyperquote/auth'
import { z } from 'zod'
import type {
	CompletionProof,
	DeliveryRejectionProof,
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

interface SupabaseBrowserRuntimeConfig {
	cookieName?: string
	supabaseAnonKey: string
	supabaseUrl: string
}

const localizedTextSchema = z.object({
	ar: z.string(),
	en: z.string(),
})

const nullableNumber = z
	.union([z.number(), z.string(), z.null()])
	.transform((value) => {
		if (value === null) return undefined
		const next = typeof value === 'string' ? Number(value) : value
		return Number.isFinite(next) ? next : undefined
	})

const nullableCoordinate = z
	.union([z.number(), z.string(), z.null()])
	.transform((value) => {
		if (value === null) return null
		const next = typeof value === 'string' ? Number(value) : value
		return Number.isFinite(next) ? next : null
	})

const nullableString = z
	.union([z.string(), z.null()])
	.transform((value) => value ?? undefined)

const locationSchema = z
	.object({
		accuracyMeters: nullableNumber.optional(),
		heading: nullableNumber.optional(),
		latitude: z.union([z.number(), z.string()]).transform(Number),
		longitude: z.union([z.number(), z.string()]).transform(Number),
		recordedAt: z.string(),
		source: z
			.enum(['browser', 'native', 'driver_app', 'dispatch', 'system'])
			.transform((value) => (value === 'native' ? 'native' : 'browser')),
		speedKmh: nullableNumber.optional(),
	})
	.transform(
		(value): DriverLocation => ({
			accuracyMeters: value.accuracyMeters,
			heading: value.heading,
			latitude: value.latitude,
			longitude: value.longitude,
			recordedAt: value.recordedAt,
			source: value.source,
			speedKmh: value.speedKmh,
		}),
	)

const driverProfileSchema = z
	.object({
		email: z.string().nullable(),
		id: z.string(),
		location: locationSchema.nullable(),
		name: localizedTextSchema,
		onlineStatus: z.enum(['online', 'offline']).optional(),
		phone: z.string(),
		status: z.enum([
			'available',
			'on_delivery',
			'offline',
			'invited',
			'disabled',
		]),
		vehicle: localizedTextSchema,
	})
	.transform(
		(value): DriverProfile => ({
			email: value.email ?? '',
			id: value.id,
			location: value.location,
			name: value.name,
			onlineStatus: value.onlineStatus,
			phone: value.phone,
			status:
				value.status === 'on_delivery'
					? 'on_delivery'
					: value.status === 'offline'
						? 'offline'
						: 'available',
			vehicle: value.vehicle,
		}),
	)

const deliveryProofSchema = z
	.object({
		capturedAt: z.string(),
		location: locationSchema.or(
			z
				.object({
					latitude: z.union([z.number(), z.string()]).transform(Number),
					longitude: z.union([z.number(), z.string()]).transform(Number),
				})
				.transform(
					(value): DriverLocation => ({
						latitude: value.latitude,
						longitude: value.longitude,
						recordedAt: new Date().toISOString(),
						source: 'browser',
					}),
				),
		),
	})
	.nullish()
	.transform((value) => value ?? undefined)

const arrivalSecretResultSchema = z.object({
	error: z.string().optional(),
	ok: z.boolean(),
})

const rejectionProofSchema = z
	.object({
		capturedAt: z.string().optional(),
		evidenceText: z.string().optional(),
		location: locationSchema.optional(),
		photoDataUrl: z.string().optional(),
		reason: z.string().optional(),
	})
	.nullish()
	.transform((value) => {
		if (!value?.evidenceText || !value.location || !value.reason)
			return undefined
		return {
			capturedAt: value.capturedAt ?? new Date().toISOString(),
			evidenceText: value.evidenceText,
			location: value.location,
			photoDataUrl: value.photoDataUrl,
			reason: value.reason,
		}
	})

const deliverySchema = z
	.object({
		acceptedAt: nullableString.optional(),
		address: z.object({
			address: localizedTextSchema,
			label: localizedTextSchema,
			latitude: nullableCoordinate,
			longitude: nullableCoordinate,
		}),
		arrivedAt: nullableString.optional(),
		completedAt: nullableString.optional(),
		customer: z.object({
			name: localizedTextSchema,
			phone: z.string(),
			role: localizedTextSchema,
		}),
		departedAt: nullableString.optional(),
		deliveryNumber: z.string(),
		driverId: nullableString,
		etaMinutes: z
			.union([z.number(), z.string(), z.null()])
			.transform((value) => {
				if (value === null) return null
				const next = typeof value === 'string' ? Number(value) : value
				return Number.isFinite(next) ? next : null
			}),
		id: z.string(),
		items: z.array(
			z.object({
				id: z.string(),
				name: localizedTextSchema,
				notes: localizedTextSchema
					.nullish()
					.transform((value) => value ?? undefined),
				quantity: localizedTextSchema,
			}),
		),
		notes: localizedTextSchema,
		orderName: localizedTextSchema,
		origin: z.object({
			address: localizedTextSchema,
			label: localizedTextSchema,
			latitude: nullableCoordinate,
			longitude: nullableCoordinate,
		}),
		proof: deliveryProofSchema,
		rejectionProof: rejectionProofSchema,
		rejectionReason: nullableString.optional(),
		scheduledWindow: localizedTextSchema,
		status: z.enum([
			'assigned',
			'available',
			'accepted',
			'in_transit',
			'arrived',
			'completed',
			'rejected',
		]),
		truckId: nullableString.optional(),
		truckPlate: nullableString.optional(),
		warehouseContact: z.object({
			name: localizedTextSchema,
			phone: z.string(),
			role: localizedTextSchema,
		}),
	})
	.transform(
		(value): DriverDelivery => ({
			acceptedAt: value.acceptedAt,
			address: value.address,
			arrivedAt: value.arrivedAt,
			completedAt: value.completedAt,
			customer: value.customer,
			departedAt: value.departedAt,
			deliveryNumber: value.deliveryNumber,
			driverId: value.driverId ?? null,
			etaMinutes: value.etaMinutes,
			id: value.id,
			items: value.items,
			notes: value.notes,
			orderName: value.orderName,
			origin: value.origin,
			proof: value.proof,
			rejectionProof: value.rejectionProof,
			rejectionReason: value.rejectionReason,
			scheduledWindow: value.scheduledWindow,
			status: value.status,
			truckId: value.truckId,
			truckPlate: value.truckPlate,
			warehouseContact: value.warehouseContact,
		}),
	)

const dashboardSchema = z
	.object({
		activeDelivery: deliverySchema.nullable(),
		completedToday: z.number(),
		currentDriver: driverProfileSchema,
		deliveries: z.array(deliverySchema),
		nextDelivery: deliverySchema.nullable(),
		openDeliveries: z.number(),
	})
	.transform((value): DriverDashboard & { deliveries: DriverDelivery[] } => ({
		activeDelivery: value.activeDelivery,
		completedToday: value.completedToday,
		currentDriver: value.currentDriver,
		deliveries: value.deliveries,
		nextDelivery: value.nextDelivery,
		openDeliveries: value.openDeliveries,
	}))

const teamMessageSchema = z
	.object({
		authorDriverId: z.string(),
		authorName: localizedTextSchema,
		body: localizedTextSchema,
		createdAt: z.string(),
		id: z.string(),
	})
	.transform(
		(value): TeamMessage => ({
			authorDriverId: value.authorDriverId,
			authorName: value.authorName,
			body: value.body,
			createdAt: value.createdAt,
			id: value.id,
		}),
	)

export function createSupabaseDriverRepository(
	config: SupabaseBrowserRuntimeConfig,
): DriverRepository {
	const client = createSupabaseBrowserClient(
		config.supabaseUrl,
		config.supabaseAnonKey,
		config.cookieName,
	)

	async function dashboard() {
		const { data, error } = await client.rpc('driver_app_dashboard')
		if (error) throw toRepositoryError(error)
		return dashboardSchema.parse(data)
	}

	async function deliveryAfterMutation(deliveryId: string) {
		const next = await dashboard()
		const delivery = next.deliveries.find((row) => row.id === deliveryId)
		if (!delivery) {
			throw new DriverRepositoryError(
				'delivery_not_found',
				'Delivery is no longer visible to this driver.',
			)
		}
		return delivery
	}

	async function callDeliveryRpc(
		name: 'driver_accept_delivery' | 'driver_start_delivery',
		deliveryId: string,
	) {
		const { error } = await client.rpc(name, { p_delivery_id: deliveryId })
		if (error) throw toRepositoryError(error)
		return deliveryAfterMutation(deliveryId)
	}

	return {
		async acceptDelivery(deliveryId: string): Promise<DriverDelivery> {
			return callDeliveryRpc('driver_accept_delivery', deliveryId)
		},

		async confirmArrival(
			deliveryId: string,
			_driverId: string,
			secretCode: string,
		): Promise<DriverDelivery> {
			const { data, error } = await client.rpc(
				'driver_confirm_arrival_secret_result',
				{
					p_code: secretCode,
					p_delivery_id: deliveryId,
				},
			)
			if (error) throw toRepositoryError(error)
			const result = arrivalSecretResultSchema.parse(data)
			if (!result.ok) {
				throw toRepositoryError({
					message: result.error ?? 'invalid_delivery_secret',
				})
			}
			return deliveryAfterMutation(deliveryId)
		},

		async completeDelivery(
			deliveryId: string,
			_driverId: string,
			proof: CompletionProof,
		): Promise<DriverDelivery> {
			if (!isCompletionProofReady(proof)) {
				throw new DriverRepositoryError(
					'invalid_proof',
					'Completion requires verified customer code, GPS, and time.',
				)
			}
			const { error } = await client.rpc('driver_confirm_delivery', {
				p_delivery_id: deliveryId,
				p_latitude: proof.location.latitude,
				p_longitude: proof.location.longitude,
				p_signature_path: null,
				p_signer_name: null,
			})
			if (error) throw toRepositoryError(error)
			return deliveryAfterMutation(deliveryId)
		},

		async getDashboard(): Promise<DriverDashboard> {
			return dashboard()
		},

		async listActiveDrivers(): Promise<DriverProfile[]> {
			const { data, error } = await client.rpc('driver_list_active_drivers')
			if (error) throw toRepositoryError(error)
			return z.array(driverProfileSchema).parse(data)
		},

		async listDeliveries(): Promise<DriverDelivery[]> {
			const data = await dashboard()
			return data.deliveries
		},

		async listTeamMessages(): Promise<TeamMessage[]> {
			const { data, error } = await client.rpc('driver_list_team_messages')
			if (error) throw toRepositoryError(error)
			return z.array(teamMessageSchema).parse(data)
		},

		async rejectDelivery(
			deliveryId: string,
			_driverId: string,
			reason: string,
			proof: DeliveryRejectionProof | null,
		): Promise<DriverDelivery> {
			const { error } = await client.rpc('driver_reject_delivery', {
				p_delivery_id: deliveryId,
				p_proof: proof ?? {},
				p_reason: reason,
			})
			if (error) throw toRepositoryError(error)
			return deliveryAfterMutation(deliveryId)
		},

		async reopenRoute(
			deliveryId: string,
			_driverId: string,
		): Promise<DriverDelivery> {
			const { error } = await client.rpc('driver_reopen_delivery_route', {
				p_delivery_id: deliveryId,
			})
			if (error) throw toRepositoryError(error)
			return deliveryAfterMutation(deliveryId)
		},

		async sendTeamMessage(
			_driverId: string,
			body: string,
		): Promise<TeamMessage> {
			const { data, error } = await client.rpc('driver_send_team_message', {
				p_body: body,
			})
			if (error) throw toRepositoryError(error)
			return teamMessageSchema.parse(data)
		},

		async setOnline(
			_driverId: string,
			online: boolean,
		): Promise<DriverProfile> {
			const { error } = await client.rpc('driver_set_online', {
				p_online: online,
			})
			if (error) throw toRepositoryError(error)
			return (await dashboard()).currentDriver
		},

		async startDelivery(deliveryId: string): Promise<DriverDelivery> {
			return callDeliveryRpc('driver_start_delivery', deliveryId)
		},

		async updateLocation(
			_driverId: string,
			location: DriverLocation,
			deliveryId?: string | null,
		): Promise<DriverProfile> {
			const { error } = await client.rpc('driver_update_location', {
				p_accuracy_meters: location.accuracyMeters ?? null,
				p_delivery_id: deliveryId ?? null,
				p_heading: location.heading ?? null,
				p_latitude: location.latitude,
				p_longitude: location.longitude,
				p_speed_kmh: location.speedKmh ?? null,
			})
			if (error) throw toRepositoryError(error)
			return (await dashboard()).currentDriver
		},
	}
}

function toRepositoryError(error: { message: string }) {
	const message = error.message
	if (
		message.includes('not_found') ||
		message.includes('not_assigned') ||
		message.includes('driver_required')
	) {
		return new DriverRepositoryError('delivery_not_found', message)
	}
	if (message.includes('transition')) {
		return new DriverRepositoryError('invalid_transition', message)
	}
	if (message.includes('secret')) {
		return new DriverRepositoryError('invalid_secret', message)
	}
	if (
		message.includes('proof') ||
		message.includes('signature') ||
		message.includes('signer') ||
		message.includes('reason')
	) {
		return new DriverRepositoryError('invalid_proof', message)
	}
	return new DriverRepositoryError('delivery_unavailable', message)
}
