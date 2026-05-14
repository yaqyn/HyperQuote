import type { JsonObject, JsonValue } from '../db/db'

function isJsonValue(value: unknown): value is JsonValue {
	if (value === null) return true
	const type = typeof value
	if (type === 'string' || type === 'number' || type === 'boolean') return true
	if (Array.isArray(value)) return value.every(isJsonValue)
	if (type === 'object') {
		return Object.values(value as object).every(isJsonValue)
	}
	return false
}

export function toJsonObject(
	value: Record<string, unknown> | null | undefined,
): JsonObject {
	const out: JsonObject = {}
	if (!value) return out
	for (const [key, entry] of Object.entries(value)) {
		if (isJsonValue(entry)) out[key] = entry
	}
	return out
}
