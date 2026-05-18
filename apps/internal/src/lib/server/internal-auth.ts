import {
	createSupabaseServerClient,
	resolveSupabaseServerConfig,
} from '@hyperquote/auth/server'
import { createServerFn } from '@tanstack/react-start'
import { getRequest, getResponse } from '@tanstack/react-start/server'
import { z } from 'zod'
import {
	appendSetCookieHeaders,
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
		configured: Boolean(resolveSupabaseServerConfig(process.env)),
	}),
)

export const submitInternalLogin = createServerFn({ method: 'POST' })
	.inputValidator(internalLoginInput)
	.handler(async ({ data: input }): Promise<InternalLoginResult> => {
		try {
			const config = resolveSupabaseServerConfig(process.env)
			if (!config) return { ok: false, error: 'not_configured' }

			const request = getRequest()
			const { client, responseCookies } = createSupabaseServerClient({
				request,
				...config,
			})
			const result = await authenticateInternalPassword({
				client,
				input,
				requestUrl: request.url,
			})

			appendSetCookieHeaders(getResponse().headers, responseCookies.values())
			return result
		} catch {
			return { ok: false, error: 'unexpected' }
		}
	})
