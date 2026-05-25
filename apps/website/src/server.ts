import { installRuntimeEnv } from '@hyperquote/auth/server'
import handler from '@tanstack/react-start/server-entry'

type WebsiteWorkerEnv = Record<string, unknown> & {
	ASSETS?: {
		fetch(request: Request): Promise<Response>
	}
}

export default {
	async fetch(request: Request, env: WebsiteWorkerEnv = {}): Promise<Response> {
		const url = new URL(request.url)
		if (url.hostname === 'hyperquote.net') {
			url.hostname = 'www.hyperquote.net'
			return Response.redirect(url.toString(), 308)
		}

		if (env.ASSETS && isStaticAssetPath(url.pathname)) {
			return env.ASSETS.fetch(request)
		}

		installRuntimeEnv(env)
		return handler.fetch(request)
	},
}

function isStaticAssetPath(pathname: string) {
	return /\.(?:avif|css|gif|ico|jpe?g|js|json|map|png|svg|txt|webp|woff2?|xml)$/.test(
		pathname,
	)
}
