import {
	appendSetCookieHeaders,
	createSupabaseServerClient,
	resolveSupabaseRuntimeConfig,
} from '@hyperquote/auth/server'
import { createServerFn } from '@tanstack/react-start'
import { getRequest, getResponse } from '@tanstack/react-start/server'
import { z } from 'zod'
import {
	getInternalEmployeeActor,
	getInternalSupabaseClient,
	getInternalSupabasePasswordClient,
} from './_supabase'
import {
	authenticateInternalPassword,
	type InternalLoginResult,
} from './internal-auth-core'

const internalLoginInput = z.object({
	email: z.string().trim().email(),
	password: z.string().min(1),
	redirect: z.string().optional(),
})

export const getInternalLoginStatus = createServerFn({ method: 'GET' }).handler(
	async () => ({
		configured: Boolean(await resolveSupabaseRuntimeConfig(process.env)),
	}),
)

export const submitInternalLogin = createServerFn({ method: 'POST' })
	.inputValidator(internalLoginInput)
	.handler(async ({ data: input }): Promise<InternalLoginResult> => {
		try {
			const config = await resolveSupabaseRuntimeConfig(process.env)
			if (!config) return { ok: false, error: 'not_configured' }

			const request = getRequest()
			const { client, responseCookies, responseHeaders } =
				createSupabaseServerClient({
					request,
					...config,
				})
			const result = await authenticateInternalPassword({
				client,
				input,
				requestUrl: request.url,
				validateUser: async (user) =>
					Boolean(await getInternalEmployeeActor(user.id)),
			})

			appendSetCookieHeaders(
				getResponse().headers,
				responseCookies.values(),
				responseHeaders.entries(),
			)
			return result
		} catch {
			return { ok: false, error: 'unexpected' }
		}
	})

export const validateCurrentInternalPassword = createServerFn({
	method: 'POST',
})
	.inputValidator(z.object({ password: z.string().min(1) }))
	.handler(async ({ data }): Promise<{ ok: boolean }> => {
		const auth = await getInternalSupabaseClient()
		const email = auth.user.email
		if (!email) return { ok: false }

		const passwordClient = await getInternalSupabasePasswordClient()
		const { data: signInData, error } =
			await passwordClient.auth.signInWithPassword({
				email,
				password: data.password,
			})
		await passwordClient.auth.signOut({ scope: 'local' })

		if (error || !signInData.user) return { ok: false }
		return {
			ok:
				signInData.user.id === auth.user.id &&
				signInData.user.app_metadata?.pool === 'internal',
		}
	})
