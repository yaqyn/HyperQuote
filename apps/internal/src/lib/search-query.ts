const STOP_WORDS = new Set([
	'about',
	'and',
	'for',
	'from',
	'give',
	'show',
	'tell',
	'the',
	'with',
])

export function searchTokens(query: string): string[] {
	const tokens = query
		.normalize('NFKC')
		.toLowerCase()
		.split(/[^\p{L}\p{N}-]+/u)
		.map((token) => token.trim())
		.filter((token) => token.length >= 2 && !STOP_WORDS.has(token))
	return Array.from(new Set(tokens))
}

export function searchPattern(value: string): string {
	return `%${value.replaceAll('\\', '\\\\').replaceAll('%', '\\%').replaceAll('_', '\\_')}%`
}
