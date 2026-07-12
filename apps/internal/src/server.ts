import { installRuntimeEnv } from '@hyperquote/auth/server'
import { handleWorkerHttpRequest } from '@hyperquote/runtime/http'
import handler from '@tanstack/react-start/server-entry'
import { handleCloudflareInboundEmail } from './lib/server/support-email-inbound'

export interface ForwardableEmailMessage {
	from: string
	headers: Headers
	raw: ReadableStream
	rawSize: number
	setReject(reason: string): void
	to: string
}

export default {
	async fetch(
		request: Request,
		env: Record<string, unknown>,
	): Promise<Response> {
		return handleWorkerHttpRequest(request, (boundedRequest) => {
			installRuntimeEnv(env)
			return handler.fetch(boundedRequest)
		})
	},
	async email(
		message: ForwardableEmailMessage,
		env: Record<string, unknown>,
	): Promise<void> {
		installRuntimeEnv(env)
		await handleCloudflareInboundEmail(message)
	},
}
