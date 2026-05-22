import {
	createActorServiceRoleClient,
	createSupabaseServiceRoleClient,
} from '@hyperquote/auth/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

interface DriverWorkerEnv {
	ASSETS: { fetch(request: Request): Promise<Response> }
	COOKIE_DOMAIN?: string
	SUPABASE_ANON_KEY?: string
	SUPABASE_COOKIE_NAME?: string
	SUPABASE_SERVICE_ROLE_KEY?: string
	SUPABASE_URL?: string
}

interface DriverContext {
	driverId: string
	service: NonNullable<
		Awaited<ReturnType<typeof createSupabaseServiceRoleClient>>
	>
	user: {
		email?: string | null
		id: string
	}
}

const locationInput = z.object({
	accuracyMeters: z.number().optional(),
	heading: z.number().optional(),
	latitude: z.number(),
	longitude: z.number(),
	recordedAt: z.string().optional(),
	source: z.enum(['browser', 'native']).optional(),
	speedKmh: z.number().optional(),
})

const completeInput = z.object({
	proof: z.object({
		capturedAt: z.string(),
		location: locationInput,
	}),
})

const arrivalSecretInput = z.object({
	secretCode: z.string().min(1),
})

const rejectInput = z.object({
	proof: z.unknown().nullable().optional(),
	reason: z.string().min(1),
})

const messageInput = z.object({
	body: z.string().min(1),
})

const onlineInput = z.object({
	online: z.boolean(),
})

const locationUpdateInput = z.object({
	deliveryId: z.string().uuid().nullable().optional(),
	location: locationInput,
})

function workerEnvRecord(
	env: DriverWorkerEnv,
): Record<string, string | undefined> {
	return {
		COOKIE_DOMAIN: env.COOKIE_DOMAIN,
		SUPABASE_ANON_KEY: env.SUPABASE_ANON_KEY,
		SUPABASE_COOKIE_NAME: env.SUPABASE_COOKIE_NAME,
		SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY,
		SUPABASE_URL: env.SUPABASE_URL,
	}
}

function json(data: unknown, init: ResponseInit = {}) {
	const headers = new Headers(init.headers)
	headers.set('content-type', 'application/json; charset=utf-8')
	return new Response(JSON.stringify(data), { ...init, headers })
}

function errorJson(status: number, error: string) {
	return json({ error }, { status })
}

async function requestBody<T>(request: Request, schema: z.ZodType<T>) {
	const payload = await request.json().catch(() => null)
	const parsed = schema.safeParse(payload)
	if (!parsed.success) {
		throw new Response(JSON.stringify({ error: 'invalid_request' }), {
			headers: { 'content-type': 'application/json; charset=utf-8' },
			status: 400,
		})
	}
	return parsed.data
}

async function requireDriverContext(
	request: Request,
	env: DriverWorkerEnv,
): Promise<DriverContext | Response> {
	const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
	if (!token) return errorJson(401, 'driver_session_required')
	if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
		return errorJson(500, 'supabase_env_required')
	}

	const authClient = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
		auth: { autoRefreshToken: false, persistSession: false },
	})
	const {
		data: { user },
		error,
	} = await authClient.auth.getUser(token)
	if (error || !user || user.app_metadata?.pool !== 'driver') {
		return errorJson(401, 'driver_session_required')
	}

	const serviceBase = await createSupabaseServiceRoleClient(
		workerEnvRecord(env),
	)
	if (!serviceBase) return errorJson(500, 'service_role_required')

	const service = createActorServiceRoleClient({
		actorPool: 'driver',
		actorUserId: user.id,
		client: serviceBase,
	})

	const metadataDriverId = user.app_metadata?.driver_id
	const query =
		typeof metadataDriverId === 'string' && metadataDriverId.length > 0
			? service
					.from('drivers')
					.select('id, email, status')
					.eq('id', metadataDriverId)
			: service
					.from('drivers')
					.select('id, email, status')
					.eq('user_id', user.id)
	const { data: driver, error: driverError } = await query.single()

	if (
		driverError ||
		!driver ||
		driver.status === 'disabled' ||
		driver.status === 'invited'
	) {
		return errorJson(403, 'driver_profile_required')
	}

	return {
		driverId: driver.id,
		service,
		user: { email: user.email, id: user.id },
	}
}

async function dashboard(ctx: DriverContext) {
	const { data, error } = await ctx.service.rpc('driver_app_dashboard')
	if (error) throw error
	return data
}

async function deliveryAfterMutation(ctx: DriverContext, deliveryId: string) {
	const data = await dashboard(ctx)
	if (!data || typeof data !== 'object' || !('deliveries' in data)) {
		throw new Error('driver_dashboard_unavailable')
	}
	const deliveries = data.deliveries
	if (!Array.isArray(deliveries))
		throw new Error('driver_dashboard_unavailable')
	const delivery = deliveries.find(
		(row) =>
			row && typeof row === 'object' && 'id' in row && row.id === deliveryId,
	)
	if (!delivery) throw new Error('delivery_not_found')
	return delivery
}

async function handleDriverApi(request: Request, env: DriverWorkerEnv) {
	const url = new URL(request.url)
	const ctx = await requireDriverContext(request, env)
	if (ctx instanceof Response) return ctx

	try {
		if (request.method === 'GET' && url.pathname === '/api/driver/session') {
			return json({
				driverId: ctx.driverId,
				email: ctx.user.email ?? '',
				source: 'supabase',
				startedAt: new Date().toISOString(),
			})
		}

		if (request.method === 'GET' && url.pathname === '/api/driver/dashboard') {
			return json(await dashboard(ctx))
		}

		if (
			request.method === 'GET' &&
			url.pathname === '/api/driver/drivers/active'
		) {
			const { data, error } = await ctx.service.rpc(
				'driver_list_active_drivers',
			)
			if (error) throw error
			return json(data ?? [])
		}

		if (
			request.method === 'GET' &&
			url.pathname === '/api/driver/team/messages'
		) {
			const { data, error } = await ctx.service.rpc('driver_list_team_messages')
			if (error) throw error
			return json(data ?? [])
		}

		if (
			request.method === 'POST' &&
			url.pathname === '/api/driver/team/messages'
		) {
			const input = await requestBody(request, messageInput)
			const { data, error } = await ctx.service.rpc(
				'driver_send_team_message',
				{
					p_body: input.body,
				},
			)
			if (error) throw error
			return json(data)
		}

		if (request.method === 'POST' && url.pathname === '/api/driver/online') {
			const input = await requestBody(request, onlineInput)
			const { error } = await ctx.service.rpc('driver_set_online', {
				p_online: input.online,
			})
			if (error) throw error
			const data = await dashboard(ctx)
			return json(data.currentDriver)
		}

		if (request.method === 'POST' && url.pathname === '/api/driver/location') {
			const input = await requestBody(request, locationUpdateInput)
			const { error } = await ctx.service.rpc('driver_update_location', {
				p_accuracy_meters: input.location.accuracyMeters ?? null,
				p_delivery_id: input.deliveryId ?? null,
				p_heading: input.location.heading ?? null,
				p_latitude: input.location.latitude,
				p_longitude: input.location.longitude,
				p_speed_kmh: input.location.speedKmh ?? null,
			})
			if (error) throw error
			const data = await dashboard(ctx)
			return json(data.currentDriver)
		}

		const deliveryMatch = url.pathname.match(
			/^\/api\/driver\/deliveries\/([0-9a-f-]+)\/([a-z-]+)$/i,
		)
		if (request.method === 'POST' && deliveryMatch) {
			const [, deliveryId, action] = deliveryMatch
			if (!deliveryId || !action) return errorJson(404, 'not_found')
			if (action === 'accept') {
				const { error } = await ctx.service.rpc('driver_accept_delivery', {
					p_delivery_id: deliveryId,
				})
				if (error) throw error
			} else if (action === 'start') {
				const { error } = await ctx.service.rpc('driver_start_delivery', {
					p_delivery_id: deliveryId,
				})
				if (error) throw error
			} else if (action === 'arrival-secret') {
				const input = await requestBody(request, arrivalSecretInput)
				const { data, error } = await ctx.service.rpc(
					'driver_confirm_arrival_secret_result',
					{
						p_code: input.secretCode,
						p_delivery_id: deliveryId,
					},
				)
				if (error) throw error
				if (
					data &&
					typeof data === 'object' &&
					'ok' in data &&
					data.ok === false
				) {
					return errorJson(
						400,
						'error' in data ? String(data.error) : 'invalid_delivery_secret',
					)
				}
			} else if (action === 'complete') {
				const input = await requestBody(request, completeInput)
				const { error } = await ctx.service.rpc('driver_confirm_delivery', {
					p_delivery_id: deliveryId,
					p_latitude: input.proof.location.latitude,
					p_longitude: input.proof.location.longitude,
					p_signature_path: null,
					p_signer_name: null,
				})
				if (error) throw error
			} else if (action === 'reject') {
				const input = await requestBody(request, rejectInput)
				const { error } = await ctx.service.rpc('driver_reject_delivery', {
					p_delivery_id: deliveryId,
					p_proof: input.proof ?? {},
					p_reason: input.reason,
				})
				if (error) throw error
			} else if (action === 'reopen') {
				const { error } = await ctx.service.rpc(
					'driver_reopen_delivery_route',
					{
						p_delivery_id: deliveryId,
					},
				)
				if (error) throw error
			} else {
				return errorJson(404, 'not_found')
			}
			return json(await deliveryAfterMutation(ctx, deliveryId))
		}

		return errorJson(404, 'not_found')
	} catch (error) {
		if (error instanceof Response) return error
		const message = error instanceof Error ? error.message : 'driver_api_failed'
		return errorJson(message.includes('permission') ? 403 : 400, message)
	}
}

export default {
	fetch(request: Request, env: DriverWorkerEnv): Promise<Response> {
		const url = new URL(request.url)
		if (url.pathname.startsWith('/api/driver/')) {
			return handleDriverApi(request, env)
		}
		return env.ASSETS.fetch(request)
	},
}
