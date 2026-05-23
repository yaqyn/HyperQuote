import { readFileSync } from 'node:fs'
import type { SupabaseClient } from '@supabase/supabase-js'

export type FlowActorPool = 'driver' | 'external' | 'internal'

let actorRpcNamesCache: Set<string> | null = null

function actorRpcNames() {
	if (actorRpcNamesCache) return actorRpcNamesCache
	const source = readFileSync('packages/auth/src/server.ts', 'utf8')
	const start = source.indexOf('const ACTOR_RPC_NAMES')
	const end = source.indexOf('export function createActorServiceRoleClient')
	if (start < 0 || end < 0 || end <= start) {
		throw new Error('Could not locate ACTOR_RPC_NAMES in auth server helper')
	}
	actorRpcNamesCache = new Set(
		[...source.slice(start, end).matchAll(/'([a-zA-Z0-9_]+)'/g)].map(
			(match) => match[1],
		),
	)
	return actorRpcNamesCache
}

export function createActorFlowClient<TClient extends SupabaseClient>(
	client: TClient,
	service: SupabaseClient,
	{ actorPool, actorUserId }: { actorPool: FlowActorPool; actorUserId: string },
): TClient {
	const rpc = ((functionName, args, options) => {
		if (typeof functionName === 'string' && actorRpcNames().has(functionName)) {
			return service.rpc(
				`service_${functionName}`,
				{
					...((args ?? {}) as Record<string, unknown>),
					p_actor_pool: actorPool,
					p_actor_user_id: actorUserId,
				},
				options,
			)
		}
		return client.rpc(functionName, args, options)
	}) as SupabaseClient['rpc']

	return new Proxy(client, {
		get(target, property, receiver) {
			if (property === 'rpc') return rpc
			return Reflect.get(target, property, receiver)
		},
	}) as TClient
}
