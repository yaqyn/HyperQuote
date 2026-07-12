import {
	appendSetCookieHeaders,
	createActorServiceRoleClient,
	createSupabaseServerClient,
	createSupabaseServiceRoleClient,
	getSupabaseServerUser,
	resolveSupabaseRuntimeConfig,
} from '@hyperquote/auth/server'
import type { EmployeePanel } from '@hyperquote/types'
import { createClient } from '@supabase/supabase-js'
import { getRequest, getResponse } from '@tanstack/react-start/server'

export type InternalAccessRequirement =
	| { activeEmployeeOnly: true }
	| { panel: EmployeePanel; writeRequired: boolean }

export async function getInternalSupabaseClient(
	access: InternalAccessRequirement,
) {
	const config = await resolveSupabaseRuntimeConfig(process.env)
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
	} = await getSupabaseServerUser({
		client,
		cookieDomain: config.cookieDomain,
		cookieName: config.cookieName,
		request,
		responseHeaders: getResponse().headers,
	})

	if (error || !user || user.app_metadata?.pool !== 'internal') {
		throw new Error('Internal Supabase session is required')
	}

	const actor = await getInternalEmployeeActor(user.id, access)
	if (!actor) {
		throw new Error('Active internal employee is required')
	}

	appendSetCookieHeaders(
		getResponse().headers,
		responseCookies.values(),
		responseHeaders.entries(),
	)

	return {
		...actor,
		user,
	}
}

export async function getInternalEmployeeActor(
	userId: string,
	access: InternalAccessRequirement,
) {
	const service = await createSupabaseServiceRoleClient(process.env)
	if (!service) {
		throw new Error('Supabase service role is required for internal app')
	}

	const client = createActorServiceRoleClient({
		actorPool: 'internal',
		actorUserId: userId,
		client: service,
	})
	const { data: employeeId, error } =
		'panel' in access
			? await client.rpc('require_panel', {
					required_panel: access.panel,
					write_required: access.writeRequired,
				})
			: await client.rpc('current_employee_id')
	if (error) throw new Error(error.message)
	if (typeof employeeId !== 'string') return null
	return { client, employeeId }
}

export async function getInternalSupabasePasswordClient() {
	const config = await resolveSupabaseRuntimeConfig(process.env)
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
