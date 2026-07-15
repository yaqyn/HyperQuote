export interface RuntimeSecretBinding {
	get(): Promise<string | null | undefined> | string | null | undefined
}

export type RuntimeEnvValue = RuntimeSecretBinding | string | null | undefined
export type RuntimeEnvRecord = Record<string, unknown>

const RUNTIME_ENV_KEY = '__hyperquoteRuntimeEnv'

interface RuntimeEnvHost {
	[RUNTIME_ENV_KEY]?: RuntimeEnvRecord
}

function runtimeEnvHost(): RuntimeEnvHost {
	return globalThis as typeof globalThis & RuntimeEnvHost
}

export function installRuntimeEnv(env: unknown): void {
	if (!env || typeof env !== 'object') return
	runtimeEnvHost()[RUNTIME_ENV_KEY] = env as RuntimeEnvRecord
}

export function clearInstalledRuntimeEnv(): void {
	delete runtimeEnvHost()[RUNTIME_ENV_KEY]
}

export function getInstalledRuntimeEnv(): RuntimeEnvRecord | undefined {
	return runtimeEnvHost()[RUNTIME_ENV_KEY]
}

export function getProcessRuntimeEnv():
	| Record<string, RuntimeEnvValue>
	| undefined {
	const runtimeProcess: unknown = Reflect.get(globalThis, 'process')
	if (
		!runtimeProcess ||
		typeof runtimeProcess !== 'object' ||
		!('env' in runtimeProcess)
	) {
		return undefined
	}
	return isProcessRuntimeEnv(runtimeProcess.env)
		? runtimeProcess.env
		: undefined
}

function isProcessRuntimeEnv(
	value: unknown,
): value is Record<string, string | undefined> {
	return Boolean(value && typeof value === 'object')
}

export async function runtimeEnvValue(
	value: RuntimeEnvValue,
): Promise<string | undefined> {
	if (typeof value === 'string') return value
	if (value instanceof String) return value.toString()
	if (!value || typeof value !== 'object' || !('get' in value)) return undefined
	try {
		const secret = await value.get()
		return typeof secret === 'string' ? secret : undefined
	} catch {
		return undefined
	}
}

export async function runtimeStringEnvValue(
	env: unknown,
	key: string,
): Promise<string | undefined> {
	if (!env || typeof env !== 'object') return undefined
	const value = (env as Record<string, unknown>)[key]
	return runtimeEnvValue(value as RuntimeEnvValue)
}

export async function runtimeEnvRecord<const TKey extends readonly string[]>(
	env: unknown,
	keys: TKey,
): Promise<Record<TKey[number], string | undefined>> {
	const resolvedEntries = await Promise.all(
		keys.map(
			async (key) => [key, await runtimeStringEnvValue(env, key)] as const,
		),
	)
	const entries = resolvedEntries.filter(
		(entry): entry is readonly [TKey[number], string] => entry[1] !== undefined,
	)
	return Object.fromEntries(entries) as Record<TKey[number], string | undefined>
}
