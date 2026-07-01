export interface FencedCodeBlock {
	nextIndex: number
	text: string
}

export function readFencedCodeBlock(
	lines: readonly string[],
	startIndex: number,
): FencedCodeBlock | null {
	if (!/^\s*```/.test(lines[startIndex] ?? '')) return null

	const codeLines: string[] = []
	let index = startIndex + 1
	while (index < lines.length && !/^\s*```/.test(lines[index] ?? '')) {
		codeLines.push(lines[index] ?? '')
		index += 1
	}

	return {
		nextIndex: index < lines.length ? index + 1 : index,
		text: codeLines.join('\n'),
	}
}
