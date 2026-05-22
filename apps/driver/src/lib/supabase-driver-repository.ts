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
	driverApiBase?: string
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

const driverApiSessionSchema = z.object({
	driverId: z.string(),
	email: z.string(),
	source: z.literal('supabase'),
	startedAt: z.string(),
})

export type DriverApiSession = z.infer<typeof driverApiSessionSchema>

export function createSupabaseDriverRepository(
	config: SupabaseBrowserRuntimeConfig,
): DriverRepository {
	const client = createSupabaseBrowserClient(
		config.supabaseUrl,
		config.supabaseAnonKey,
		config.cookieName,
	)

	async function accessToken() {
		const {
			data: { session },
		} = await client.auth.getSession()
		if (!session?.access_token) {
			throw new DriverRepositoryError(
				'driver_not_found',
				'Driver session is required.',
			)
		}
		return session.access_token
	}

	async function apiRequest<T>(
		path: string,
		schema: z.ZodType<T>,
		init: RequestInit = {},
	): Promise<T> {
		const token = await accessToken()
		const headers = new Headers(init.headers)
		headers.set('authorization', `Bearer ${token}`)
		if (init.body && !headers.has('content-type')) {
			headers.set('content-type', 'application/json')
		}

		const response = await fetch(`${config.driverApiBase ?? ''}${path}`, {
			...init,
			headers,
		})
		const payload = await response.json().catch(() => null)
		if (!response.ok) {
			throw toRepositoryError({
				message:
					payload && typeof payload === 'object' && 'error' in payload
						? String(payload.error)
						: response.statusText,
			})
		}
		return schema.parse(payload)
	}

	async function dashboard() {
		return apiRequest('/api/driver/dashboard', dashboardSchema)
	}

	async function mutateDelivery(
		deliveryId: string,
		action:
			| 'accept'
			| 'start'
			| 'arrival-secret'
			| 'complete'
			| 'reject'
			| 'reopen',
		body?: Record<string, unknown>,
	) {
		return apiRequest(
			`/api/driver/deliveries/${deliveryId}/${action}`,
			deliverySchema,
			{
				body: JSON.stringify(body ?? {}),
				method: 'POST',
			},
		)
	}

	return {
		async acceptDelivery(deliveryId: string): Promise<DriverDelivery> {
			return mutateDelivery(deliveryId, 'accept')
		},

		async confirmArrival(
			deliveryId: string,
			_driverId: string,
			secretCode: string,
		): Promise<DriverDelivery> {
			return mutateDelivery(deliveryId, 'arrival-secret', { secretCode })
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
			return mutateDelivery(deliveryId, 'complete', { proof })
		},

		async getDashboard(): Promise<DriverDashboard> {
			return dashboard()
		},

		async listActiveDrivers(): Promise<DriverProfile[]> {
			return apiRequest(
				'/api/driver/drivers/active',
				z.array(driverProfileSchema),
			)
		},

		async listDeliveries(): Promise<DriverDelivery[]> {
			const data = await dashboard()
			return data.deliveries
		},

		async listTeamMessages(): Promise<TeamMessage[]> {
			return apiRequest('/api/driver/team/messages', z.array(teamMessageSchema))
		},

		async rejectDelivery(
			deliveryId: string,
			_driverId: string,
			reason: string,
			proof: DeliveryRejectionProof | null,
		): Promise<DriverDelivery> {
			return mutateDelivery(deliveryId, 'reject', { proof, reason })
		},

		async reopenRoute(
			deliveryId: string,
			_driverId: string,
		): Promise<DriverDelivery> {
			return mutateDelivery(deliveryId, 'reopen')
		},

		async sendTeamMessage(
			_driverId: string,
			body: string,
		): Promise<TeamMessage> {
			return apiRequest('/api/driver/team/messages', teamMessageSchema, {
				body: JSON.stringify({ body }),
				method: 'POST',
			})
		},

		async setOnline(
			_driverId: string,
			online: boolean,
		): Promise<DriverProfile> {
			return apiRequest('/api/driver/online', driverProfileSchema, {
				body: JSON.stringify({ online }),
				method: 'POST',
			})
		},

		async startDelivery(deliveryId: string): Promise<DriverDelivery> {
			return mutateDelivery(deliveryId, 'start')
		},

		async updateLocation(
			_driverId: string,
			location: DriverLocation,
			deliveryId?: string | null,
		): Promise<DriverProfile> {
			return apiRequest('/api/driver/location', driverProfileSchema, {
				body: JSON.stringify({ deliveryId, location }),
				method: 'POST',
			})
		},
	}
}

export async function fetchDriverApiSession(
	config: SupabaseBrowserRuntimeConfig,
): Promise<DriverApiSession | null> {
	const client = createSupabaseBrowserClient(
		config.supabaseUrl,
		config.supabaseAnonKey,
		config.cookieName,
	)
	const {
		data: { session },
	} = await client.auth.getSession()
	if (!session?.access_token) return null

	const response = await fetch(
		`${config.driverApiBase ?? ''}/api/driver/session`,
		{
			headers: { authorization: `Bearer ${session.access_token}` },
		},
	)
	if (!response.ok) return null
	return driverApiSessionSchema.parse(await response.json())
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
