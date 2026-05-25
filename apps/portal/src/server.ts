import { installRuntimeEnv } from '@hyperquote/auth/server'
import handler from '@tanstack/react-start/server-entry'

export default {
	async fetch(
		request: Request,
		env: Record<string, unknown>,
	): Promise<Response> {
		installRuntimeEnv(env)
		return handler.fetch(request)
	},
}
