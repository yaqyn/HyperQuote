// Minimal MD seed loader: extracts the first ```json code block from each
// seed file and parses it. Using import.meta.glob(..., '?raw') bundles the
// MD file contents at build time so this works on Cloudflare Workers (no
// fs access at runtime).

const seedFiles = import.meta.glob('./seed/*.md', {
	query: '?raw',
	import: 'default',
	eager: true,
}) as Record<string, string>

function extractJsonBlock(content: string, filename: string): unknown {
	const match = content.match(/```json\s*([\s\S]*?)```/)
	if (!match) {
		throw new Error(`[db seed] No JSON code block found in ${filename}`)
	}
	try {
		return JSON.parse(match[1])
	} catch (err) {
		throw new Error(
			`[db seed] Invalid JSON in ${filename}: ${(err as Error).message}`,
		)
	}
}

/** Returns the parsed JSON body of a named seed file (without extension). */
export function loadSeed<T>(name: string): T {
	const key = Object.keys(seedFiles).find((k) => k.endsWith(`/${name}.md`))
	if (!key) {
		throw new Error(`[db seed] Missing seed file: ${name}.md`)
	}
	return extractJsonBlock(seedFiles[key], `${name}.md`) as T
}
