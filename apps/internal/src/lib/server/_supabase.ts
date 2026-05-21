import {
	appendSetCookieHeaders,
	createSupabaseServerClient,
	resolveSupabaseWorkerConfig,
} from '@hyperquote/auth/server'
import { createClient } from '@supabase/supabase-js'
import { getRequest, getResponse } from '@tanstack/react-start/server'

async function workerEnvValue(key: string): Promise<string | undefined> {
	try {
		const workersModule = 'cloudflare:workers'
		const { env } = await import(/* @vite-ignore */ workersModule)
		if (!env || typeof env !== 'object') return undefined
		const value = (env as Record<string, unknown>)[key]
		return typeof value === 'string' ? value : undefined
	} catch {
		return undefined
	}
}

async function resolveServiceRoleKey(): Promise<string | undefined> {
	return (
		process.env.SUPABASE_SERVICE_ROLE_KEY ??
		(await workerEnvValue('SUPABASE_SERVICE_ROLE_KEY'))
	)
}

export async function getInternalSupabaseClient() {
	const config = await resolveSupabaseWorkerConfig(process.env)
	if (!config) throw new Error('Supabase is required for internal app')

	const request = getRequest()
	const { client, responseCookies, responseHeaders } =
		createSupabaseServerClient({
			request,
			...config,
		})

	const {
		data: { user },
		error,
	} = await client.auth.getUser()

	if (error || !user || user.app_metadata?.pool !== 'internal') {
		throw new Error('Internal Supabase session is required')
	}

	appendSetCookieHeaders(
		getResponse().headers,
		responseCookies.values(),
		responseHeaders.entries(),
	)
	return { client, user }
}

export async function getInternalSupabasePasswordClient() {
	const config = await resolveSupabaseWorkerConfig(process.env)
	if (!config) throw new Error('Supabase is required for internal app')
	return createClient(config.supabaseUrl, config.supabaseAnonKey, {
		auth: {
			autoRefreshToken: false,
			persistSession: false,
		},
	})
}

export async function getInternalSupabaseAdminClient() {
	const config = await resolveSupabaseWorkerConfig(process.env)
	const serviceRoleKey = await resolveServiceRoleKey()
	if (!config || !serviceRoleKey) {
		throw new Error('Supabase service role is required for internal admin')
	}
	return createClient(config.supabaseUrl, serviceRoleKey, {
		auth: {
			autoRefreshToken: false,
			persistSession: false,
		},
	})
}
