import process from 'node:process'

export const DEV_PROTOCOL_ENV = 'HYPERQUOTE_DEV_PROTOCOL'
export const DEV_EVENT_PREFIX = '@hyperquote:event '
export const DEV_COMMAND_PREFIX = '@hyperquote:command '

const ANSI_CONTROL_SEQUENCE = new RegExp(
	`${String.fromCharCode(27)}\\[[0-?]*[ -/]*[@-~]`,
	'g',
)

export function devProtocolEnabled(env = process.env) {
	return env[DEV_PROTOCOL_ENV] === '1'
}

export function emitDevEvent(event, stream = process.stdout) {
	stream.write(`${DEV_EVENT_PREFIX}${JSON.stringify(event)}\n`)
}

export function encodeDevCommand(command) {
	return `${DEV_COMMAND_PREFIX}${JSON.stringify(command)}\n`
}

export function parseDevEvent(line) {
	return parseProtocolLine(line, DEV_EVENT_PREFIX)
}

export function parseDevCommand(line) {
	return parseProtocolLine(line, DEV_COMMAND_PREFIX)
}

export function sanitizeDevText(value) {
	let sanitized = ''
	for (const character of String(value).replaceAll(ANSI_CONTROL_SEQUENCE, '')) {
		const codePoint = character.codePointAt(0) ?? 0
		if (
			codePoint === 9 ||
			(codePoint >= 32 &&
				codePoint !== 127 &&
				(codePoint < 128 || codePoint > 159))
		) {
			sanitized += character
		}
	}
	return sanitized
}

function parseProtocolLine(line, prefix) {
	if (!line.startsWith(prefix)) return null
	try {
		const value = JSON.parse(line.slice(prefix.length))
		return value && typeof value === 'object' && !Array.isArray(value)
			? sanitizeProtocolValue(value)
			: null
	} catch {
		return null
	}
}

function sanitizeProtocolValue(value) {
	if (typeof value === 'string') return sanitizeDevText(value)
	if (Array.isArray(value)) return value.map(sanitizeProtocolValue)
	if (!value || typeof value !== 'object') return value
	return Object.fromEntries(
		Object.entries(value).map(([key, entry]) => [
			key,
			sanitizeProtocolValue(entry),
		]),
	)
}
