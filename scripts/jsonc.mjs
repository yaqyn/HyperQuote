import { readFileSync } from 'node:fs'

export function parseJsonLikeFile(path) {
	return JSON.parse(stripJsonComments(readFileSync(path, 'utf8')))
}

function stripJsonComments(source) {
	let output = ''
	let inString = false
	let quote = ''
	let escaped = false

	for (let index = 0; index < source.length; index += 1) {
		const char = source[index]
		const next = source[index + 1]

		if (inString) {
			output += char
			if (escaped) {
				escaped = false
				continue
			}
			if (char === '\\') {
				escaped = true
				continue
			}
			if (char === quote) {
				inString = false
				quote = ''
			}
			continue
		}

		if (char === '"' || char === "'") {
			inString = true
			quote = char
			output += char
			continue
		}

		if (char === '/' && next === '/') {
			while (index < source.length && source[index] !== '\n') {
				index += 1
			}
			output += '\n'
			continue
		}

		if (char === '/' && next === '*') {
			index += 2
			while (
				index < source.length &&
				!(source[index] === '*' && source[index + 1] === '/')
			) {
				index += 1
			}
			index += 1
			continue
		}

		output += char
	}

	return output
}
