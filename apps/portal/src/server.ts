import { installRuntimeEnv } from '@hyperquote/auth/server'
import {
	handleWorkerHttpRequest,
	LARGE_UPLOAD_MAX_REQUEST_BODY_BYTES,
} from '@hyperquote/runtime/http'
import handler from '@tanstack/react-start/server-entry'

export default {
	async fetch(
		request: Request,
		env: Record<string, unknown>,
	): Promise<Response> {
		return handleWorkerHttpRequest(
			request,
			(boundedRequest) => {
				installRuntimeEnv(env)
				return handler.fetch(boundedRequest)
			},
			{ maxRequestBodyBytes: LARGE_UPLOAD_MAX_REQUEST_BODY_BYTES },
		)
	},
}
