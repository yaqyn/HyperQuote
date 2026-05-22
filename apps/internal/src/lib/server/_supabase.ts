import {
	appendSetCookieHeaders,
	createActorServiceRoleClient,
	createSupabaseServerClient,
	createSupabaseServiceRoleClient,
	resolveSupabaseWorkerConfig,
} from '@hyperquote/auth/server'
import { createClient } from '@supabase/supabase-js'
import { getRequest, getResponse } from '@tanstack/react-start/server'

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

	const service = await createSupabaseServiceRoleClient(process.env)
	if (!service) {
		throw new Error('Supabase service role is required for internal app')
	}

	return {
		client: createActorServiceRoleClient({
			actorPool: 'internal',
			actorUserId: user.id,
			client: service,
		}),
		user,
	}
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
	const service = await createSupabaseServiceRoleClient(process.env)
	if (!service) {
		throw new Error('Supabase service role is required for internal admin')
	}
	return service
}
