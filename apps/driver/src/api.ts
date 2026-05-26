import {
	createActorServiceRoleClient,
	createSupabaseServiceRoleClient,
	type RuntimeEnvValue,
	runtimeEnvValue,
	supabaseHealthResponse,
} from '@hyperquote/auth/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

interface DriverApiEnv {
	ASSETS: { fetch(request: Request): Promise<Response> }
	COOKIE_DOMAIN?: RuntimeEnvValue
	SUPABASE_ANON_KEY?: RuntimeEnvValue
	SUPABASE_COOKIE_NAME?: RuntimeEnvValue
	SUPABASE_SERVICE_ROLE_KEY?: RuntimeEnvValue
	SUPABASE_URL?: RuntimeEnvValue
}

interface DriverContext {
	activeSessionClaimedAt: string
	driverId: string
	service: NonNullable<
		Awaited<ReturnType<typeof createSupabaseServiceRoleClient>>
	>
	sessionId: string
	user: {
		email?: string | null
		id: string
	}
}

interface DriverContextOptions {
	enforceActiveSession?: boolean
}

interface DriverAppSessionRecord {
	claimed_at: string
	session_id: string
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
		secretCode: z.string().min(1),
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

const fuelReceiptInput = z.object({
	amount: z.number().positive().optional(),
	deliveryId: z.string().uuid().nullable().optional(),
	expenseDate: z.string().optional(),
	fuelLiters: z.number().positive().optional(),
	note: z.string().trim().max(500).optional(),
	odometerKm: z.number().min(0).optional(),
	receiptFileName: z.string().trim().min(1).max(180),
	receiptImageDataUrl: z.string().min(24).max(1_500_000),
	receiptMimeType: z.string().trim().min(3).max(120),
	receiptSizeBytes: z.number().int().min(1).max(1_048_576),
	truckId: z.string().uuid().nullable().optional(),
})

const UUID_PATTERN =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

async function driverApiEnvRecord(
	env: DriverApiEnv,
): Promise<Record<string, string | undefined>> {
	return {
		COOKIE_DOMAIN: await runtimeEnvValue(env.COOKIE_DOMAIN),
		SUPABASE_ANON_KEY: await runtimeEnvValue(env.SUPABASE_ANON_KEY),
		SUPABASE_COOKIE_NAME: await runtimeEnvValue(env.SUPABASE_COOKIE_NAME),
		SUPABASE_SERVICE_ROLE_KEY: await runtimeEnvValue(
			env.SUPABASE_SERVICE_ROLE_KEY,
		),
		SUPABASE_URL: await runtimeEnvValue(env.SUPABASE_URL),
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

function isDeliverySecretError(error: unknown): boolean {
	const message = error instanceof Error ? error.message : String(error)
	return (
		message.includes('invalid_delivery_secret') ||
		message.includes('delivery_secret_not_verified')
	)
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
	env: DriverApiEnv,
	options: DriverContextOptions = {},
): Promise<DriverContext | Response> {
	const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
	if (!token) return errorJson(401, 'driver_session_required')
	const runtimeEnv = await driverApiEnvRecord(env)
	if (!runtimeEnv.SUPABASE_URL || !runtimeEnv.SUPABASE_ANON_KEY) {
		return errorJson(500, 'supabase_env_required')
	}
	const sessionId = jwtStringClaim(token, 'session_id')
	if (!sessionId || !UUID_PATTERN.test(sessionId)) {
		return errorJson(401, 'driver_session_required')
	}

	const authClient = createClient(
		runtimeEnv.SUPABASE_URL,
		runtimeEnv.SUPABASE_ANON_KEY,
		{
			auth: { autoRefreshToken: false, persistSession: false },
		},
	)
	const {
		data: { user },
		error,
	} = await authClient.auth.getUser(token)
	if (error || !user || user.app_metadata?.pool !== 'driver') {
		return errorJson(401, 'driver_session_required')
	}

	const serviceBase = await createSupabaseServiceRoleClient(runtimeEnv)
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

	let activeSessionClaimedAt = new Date().toISOString()
	if (options.enforceActiveSession !== false) {
		const activeSession = await loadActiveDriverAppSession(service, driver.id)
		if (!activeSession || activeSession.session_id !== sessionId) {
			return errorJson(409, 'driver_session_replaced')
		}
		activeSessionClaimedAt = activeSession.claimed_at
		await touchActiveDriverAppSession(service, driver.id, sessionId)
	}

	return {
		activeSessionClaimedAt,
		driverId: driver.id,
		service,
		sessionId,
		user: { email: user.email, id: user.id },
	}
}

function jwtStringClaim(token: string, claim: string): string | null {
	const [, payload] = token.split('.')
	if (!payload) return null
	try {
		const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
		const padded = normalized.padEnd(
			normalized.length + ((4 - (normalized.length % 4)) % 4),
			'=',
		)
		const parsed: unknown = JSON.parse(atob(padded))
		if (!parsed || typeof parsed !== 'object') return null
		const value = (parsed as Record<string, unknown>)[claim]
		return typeof value === 'string' ? value : null
	} catch {
		return null
	}
}

function driverAppSessionFromUnknown(
	value: unknown,
): DriverAppSessionRecord | null {
	if (!value || typeof value !== 'object') return null
	const record = value as Record<string, unknown>
	return typeof record.session_id === 'string' &&
		typeof record.claimed_at === 'string'
		? {
				claimed_at: record.claimed_at,
				session_id: record.session_id,
			}
		: null
}

async function loadActiveDriverAppSession(
	service: DriverContext['service'],
	driverId: string,
): Promise<DriverAppSessionRecord | null> {
	const { data, error } = await service
		.from('driver_app_sessions')
		.select('session_id, claimed_at')
		.eq('driver_id', driverId)
		.maybeSingle()
	if (error) throw error
	return driverAppSessionFromUnknown(data)
}

async function claimDriverAppSession(ctx: DriverContext) {
	const now = new Date().toISOString()
	const { error } = await ctx.service.from('driver_app_sessions').upsert(
		{
			claimed_at: now,
			driver_id: ctx.driverId,
			last_seen_at: now,
			session_id: ctx.sessionId,
			source: 'driver_app',
			user_id: ctx.user.id,
		},
		{ onConflict: 'driver_id' },
	)
	if (error) throw error
	return now
}

async function releaseDriverAppSession(ctx: DriverContext) {
	const { error } = await ctx.service
		.from('driver_app_sessions')
		.delete()
		.eq('driver_id', ctx.driverId)
		.eq('session_id', ctx.sessionId)
	if (error) throw error
}

async function touchActiveDriverAppSession(
	service: DriverContext['service'],
	driverId: string,
	sessionId: string,
) {
	const { error } = await service
		.from('driver_app_sessions')
		.update({ last_seen_at: new Date().toISOString() })
		.eq('driver_id', driverId)
		.eq('session_id', sessionId)
	if (error) throw error
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

async function fuelReceiptPayload(
	ctx: DriverContext,
	value: unknown,
): Promise<Record<string, unknown>> {
	if (!value || typeof value !== 'object') {
		throw new Error('fuel_receipt_unavailable')
	}
	const row = value as Record<string, unknown>
	const truckId = typeof row.truck_id === 'string' ? row.truck_id : ''
	let truckPlate: string | undefined
	if (truckId) {
		const { data } = await ctx.service
			.from('trucks')
			.select('plate_number')
			.eq('id', truckId)
			.maybeSingle()
		if (data && typeof data.plate_number === 'string') {
			truckPlate = data.plate_number
		}
	}
	return {
		amount: row.amount ?? undefined,
		createdAt: row.created_at,
		expenseDate: row.expense_date,
		fuelLiters: row.fuel_liters ?? undefined,
		id: row.id,
		odometerKm: row.odometer_km ?? undefined,
		status: row.status,
		truckId,
		truckPlate,
	}
}

async function handleDriverApi(request: Request, env: DriverApiEnv) {
	const url = new URL(request.url)
	const isSessionClaimOrRelease =
		request.method === 'POST' &&
		(url.pathname === '/api/driver/session/claim' ||
			url.pathname === '/api/driver/session/release')
	const ctx = await requireDriverContext(request, env, {
		enforceActiveSession: !isSessionClaimOrRelease,
	})
	if (ctx instanceof Response) return ctx

	try {
		if (
			request.method === 'POST' &&
			url.pathname === '/api/driver/session/claim'
		) {
			const startedAt = await claimDriverAppSession(ctx)
			return json({
				driverId: ctx.driverId,
				email: ctx.user.email ?? '',
				source: 'supabase',
				startedAt,
			})
		}

		if (
			request.method === 'POST' &&
			url.pathname === '/api/driver/session/release'
		) {
			await releaseDriverAppSession(ctx)
			return json({ ok: true })
		}

		if (request.method === 'GET' && url.pathname === '/api/driver/session') {
			return json({
				driverId: ctx.driverId,
				email: ctx.user.email ?? '',
				source: 'supabase',
				startedAt: ctx.activeSessionClaimedAt,
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

		if (request.method === 'POST' && url.pathname === '/api/driver/fuel') {
			const input = await requestBody(request, fuelReceiptInput)
			const { data, error } = await ctx.service.rpc(
				'driver_submit_fuel_receipt',
				{
					p_amount: input.amount ?? null,
					p_delivery_id: input.deliveryId ?? null,
					p_expense_date: input.expenseDate ?? null,
					p_fuel_liters: input.fuelLiters ?? null,
					p_note: input.note ?? null,
					p_odometer_km: input.odometerKm ?? null,
					p_receipt_file_name: input.receiptFileName,
					p_receipt_image_data_url: input.receiptImageDataUrl,
					p_receipt_mime_type: input.receiptMimeType,
					p_receipt_size_bytes: input.receiptSizeBytes,
					p_truck_id: input.truckId ?? null,
				},
			)
			if (error) throw error
			return json(await fuelReceiptPayload(ctx, data))
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
					p_code: input.proof.secretCode,
					p_delivery_id: deliveryId,
					p_latitude: input.proof.location.latitude,
					p_longitude: input.proof.location.longitude,
					p_signature_path: null,
					p_signer_name: null,
				})
				if (error) {
					if (isDeliverySecretError(error)) {
						return errorJson(400, 'invalid_delivery_secret')
					}
					throw error
				}
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
		if (isDeliverySecretError(error)) {
			return errorJson(400, 'invalid_delivery_secret')
		}
		const message = error instanceof Error ? error.message : 'driver_api_failed'
		return errorJson(message.includes('permission') ? 403 : 400, message)
	}
}

export default {
	async fetch(request: Request, env: DriverApiEnv): Promise<Response> {
		const url = new URL(request.url)
		if (url.pathname === '/api/health') {
			return supabaseHealthResponse({
				app: 'driver',
				fallbackEnv: await driverApiEnvRecord(env),
			})
		}
		if (url.pathname.startsWith('/api/driver/')) {
			return handleDriverApi(request, env)
		}
		if (url.pathname.startsWith('/api/')) {
			return errorJson(404, 'not_found')
		}
		return env.ASSETS.fetch(request)
	},
}
