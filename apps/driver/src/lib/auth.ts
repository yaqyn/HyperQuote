import {
	createSupabaseBrowserClient,
	resolveSupabaseBrowserConfig,
} from '@hyperquote/auth'
import { z } from 'zod'
import { MOCK_CURRENT_DRIVER_ID } from './mock-data'

export const loginSchema = z.object({
	email: z.string().trim().email(),
	password: z.string().min(8),
})

export type LoginFormValues = z.infer<typeof loginSchema>

export interface DriverAuthSession {
	driverId: string
	email: string
	startedAt: string
	source: 'mock' | 'supabase'
}

export type DriverLoginError =
	| 'invalid_credentials'
	| 'profile_missing'
	| 'unexpected'
	| 'wrong_pool'

export type DriverLoginResult =
	| { ok: true; session: DriverAuthSession }
	| { ok: false; error: DriverLoginError }

export function createMockDriverSession(
	values: LoginFormValues,
): DriverAuthSession {
	return {
		driverId: MOCK_CURRENT_DRIVER_ID,
		email: values.email,
		startedAt: new Date().toISOString(),
		source: 'mock',
	}
}

export function isMockLoginAccepted(values: LoginFormValues): boolean {
	return loginSchema.safeParse(values).success
}

export async function authenticateDriver(
	values: LoginFormValues,
): Promise<DriverLoginResult> {
	const parsed = loginSchema.safeParse(values)
	if (!parsed.success) return { ok: false, error: 'invalid_credentials' }

	const config = resolveSupabaseBrowserConfig(import.meta.env)
	if (!config) {
		return { ok: true, session: createMockDriverSession(parsed.data) }
	}

	try {
		const client = createSupabaseBrowserClient(
			config.supabaseUrl,
			config.supabaseAnonKey,
		)
		const { data, error } = await client.auth.signInWithPassword({
			email: parsed.data.email.trim(),
			password: parsed.data.password,
		})

		if (error || !data.user) {
			return { ok: false, error: 'invalid_credentials' }
		}

		if (data.user.app_metadata?.pool !== 'driver') {
			await client.auth.signOut()
			return { ok: false, error: 'wrong_pool' }
		}

		const session = await createDriverSessionFromSupabaseUser(
			client,
			data.user,
			parsed.data.email,
		)
		if (!session) {
			await client.auth.signOut()
			return { ok: false, error: 'profile_missing' }
		}

		return { ok: true, session }
	} catch {
		return { ok: false, error: 'unexpected' }
	}
}

export async function getCurrentDriverSession(): Promise<DriverAuthSession | null> {
	const config = resolveSupabaseBrowserConfig(import.meta.env)
	if (!config) return null

	const client = createSupabaseBrowserClient(
		config.supabaseUrl,
		config.supabaseAnonKey,
	)
	const {
		data: { user },
	} = await client.auth.getUser()

	if (!user || user.app_metadata?.pool !== 'driver') return null
	return createDriverSessionFromSupabaseUser(client, user, user.email ?? '')
}

export async function signOutDriver(): Promise<void> {
	const config = resolveSupabaseBrowserConfig(import.meta.env)
	if (!config) return

	const client = createSupabaseBrowserClient(
		config.supabaseUrl,
		config.supabaseAnonKey,
	)
	await client.auth.signOut()
}

type SupabaseBrowserClient = ReturnType<typeof createSupabaseBrowserClient>

async function createDriverSessionFromSupabaseUser(
	client: SupabaseBrowserClient,
	user: { app_metadata?: { driver_id?: unknown }; email?: string; id: string },
	fallbackEmail: string,
): Promise<DriverAuthSession | null> {
	const metadataDriverId = user.app_metadata?.driver_id
	if (typeof metadataDriverId === 'string' && metadataDriverId.length > 0) {
		return {
			driverId: metadataDriverId,
			email: user.email ?? fallbackEmail,
			startedAt: new Date().toISOString(),
			source: 'supabase',
		}
	}

	const { data: driver, error } = await client
		.from('drivers')
		.select('id, email')
		.eq('user_id', user.id)
		.single()

	if (error || !driver) return null

	return {
		driverId: driver.id,
		email: driver.email ?? user.email ?? fallbackEmail,
		startedAt: new Date().toISOString(),
		source: 'supabase',
	}
}
