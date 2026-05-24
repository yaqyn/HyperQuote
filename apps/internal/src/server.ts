import { installCloudflareRuntimeEnv } from '@hyperquote/auth/server'
import type { Register } from '@tanstack/react-router'
import {
	createStartHandler,
	defaultStreamHandler,
	type RequestHandler,
} from '@tanstack/react-start/server'

const fetch = createStartHandler(defaultStreamHandler)

export type ServerEntry = { fetch: RequestHandler<Register> }

export function createServerEntry(entry: ServerEntry): ServerEntry {
	return {
		async fetch(...args) {
			installCloudflareRuntimeEnv(args[1])
			return await entry.fetch(...args)
		},
	}
}

export default createServerEntry({ fetch })
