import { type ReactNode, useMemo } from 'react'
import { toArabicIndic } from '../../lib/localized-digits'

type TableAlign = 'center' | 'left' | 'right' | null

type MarkdownBlock =
	| { depth: number; text: string; type: 'heading' }
	| { text: string; type: 'paragraph' }
	| { items: string[]; ordered: boolean; type: 'list' }
	| {
			align: TableAlign[]
			headers: string[]
			rows: string[][]
			type: 'table'
	  }
	| { text: string; type: 'code' }
	| { type: 'hr' }

interface ChatMarkdownProps {
	content: string
	isArabic: boolean
	isStreaming?: boolean
	className?: string
}

export function ChatMarkdown({
	content,
	isArabic,
	isStreaming,
	className,
}: ChatMarkdownProps) {
	const blocks = useMemo(() => parseMarkdown(content), [content])

	return (
		<div
			className={`space-y-3 break-words text-start text-[var(--p-text)] ${className ?? ''}`}
		>
			{blocks.map((block, index) => renderBlock(block, index, isArabic))}
			{isStreaming && <span className="office-pen-nib ms-1" aria-hidden />}
		</div>
	)
}

function parseMarkdown(content: string): MarkdownBlock[] {
	const lines = content.replace(/\r\n/g, '\n').split('\n')
	const blocks: MarkdownBlock[] = []
	let index = 0

	while (index < lines.length) {
		const line = lines[index] ?? ''
		if (!line.trim()) {
			index += 1
			continue
		}

		if (/^\s*```/.test(line)) {
			const codeLines: string[] = []
			index += 1
			while (index < lines.length && !/^\s*```/.test(lines[index] ?? '')) {
				codeLines.push(lines[index] ?? '')
				index += 1
			}
			if (index < lines.length) index += 1
			blocks.push({ text: codeLines.join('\n'), type: 'code' })
			continue
		}

		if (/^\s*---+\s*$/.test(line)) {
			blocks.push({ type: 'hr' })
			index += 1
			continue
		}

		const heading = line.match(/^\s*(#{1,4})\s+(.+)$/)
		if (heading) {
			blocks.push({
				depth: heading[1]?.length ?? 3,
				text: heading[2]?.trim() ?? '',
				type: 'heading',
			})
			index += 1
			continue
		}

		if (isTableAt(lines, index)) {
			const headers = parseTableRow(lines[index] ?? '')
			const align = parseTableAlign(lines[index + 1] ?? '', headers.length)
			const rows: string[][] = []
			index += 2
			while (index < lines.length && isTableRow(lines[index] ?? '')) {
				rows.push(padRow(parseTableRow(lines[index] ?? ''), headers.length))
				index += 1
			}
			blocks.push({ align, headers, rows, type: 'table' })
			continue
		}

		const listMatch = matchListLine(line)
		if (listMatch) {
			const ordered = listMatch.ordered
			const items: string[] = []
			while (index < lines.length) {
				const currentMatch = matchListLine(lines[index] ?? '')
				if (!currentMatch || currentMatch.ordered !== ordered) break
				let item = currentMatch.text
				index += 1
				while (
					index < lines.length &&
					/^\s{2,}\S/.test(lines[index] ?? '') &&
					!matchListLine(lines[index] ?? '')
				) {
					item = `${item} ${(lines[index] ?? '').trim()}`
					index += 1
				}
				items.push(item)
			}
			blocks.push({ items, ordered, type: 'list' })
			continue
		}

		const paragraphLines: string[] = []
		while (index < lines.length && !isSpecialStart(lines, index)) {
			const current = lines[index] ?? ''
			if (!current.trim()) break
			paragraphLines.push(current.trim())
			index += 1
		}
		blocks.push({ text: paragraphLines.join(' '), type: 'paragraph' })
	}

	return blocks
}

function renderBlock(
	block: MarkdownBlock,
	index: number,
	isArabic: boolean,
): ReactNode {
	switch (block.type) {
		case 'heading': {
			const HeadingTag = block.depth <= 2 ? 'h3' : 'h4'
			return (
				<HeadingTag
					key={`heading:${index}`}
					className="font-sans text-[15px] font-semibold leading-snug text-[var(--p-text)] sm:text-[16px]"
				>
					{renderInlineMarkdown(block.text, isArabic, `heading:${index}`)}
				</HeadingTag>
			)
		}
		case 'paragraph':
			return (
				<p key={`paragraph:${index}`} className="leading-[inherit]">
					{renderInlineMarkdown(block.text, isArabic, `paragraph:${index}`)}
				</p>
			)
		case 'list': {
			const ListTag = block.ordered ? 'ol' : 'ul'
			return (
				<ListTag
					key={`list:${index}`}
					className={`space-y-1.5 font-sans text-[14px] leading-[1.55] text-[var(--p-text)] ${
						block.ordered ? 'list-decimal' : 'list-disc'
					} ps-5`}
				>
					{block.items.map((item) => (
						<li key={`list:${stableKey(item)}`}>
							{renderListItem(
								item,
								isArabic,
								`list:${index}:${stableKey(item)}`,
							)}
						</li>
					))}
				</ListTag>
			)
		}
		case 'table':
			return (
				<div
					key={`table:${index}`}
					className="max-w-full overflow-x-auto rounded-lg border border-[var(--p-border)] bg-[var(--p-card)]"
				>
					<table className="w-full min-w-[420px] border-collapse font-sans text-[12px] leading-[1.45] text-[var(--p-text)] sm:text-[13px]">
						<thead className="bg-[var(--p-surface)]">
							<tr>
								{block.headers.map((header, cellIndex) => (
									<th
										key={`table:${index}:head:${stableKey(header)}`}
										className="border-b border-[var(--p-border)] px-3 py-2 text-start font-semibold text-[var(--p-text)]"
										style={{
											textAlign: block.align[cellIndex] ?? undefined,
										}}
									>
										{renderInlineMarkdown(
											header,
											isArabic,
											`table:${index}:head:${cellIndex}`,
										)}
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							{block.rows.map((row) => {
								const rowKey = stableKey(row.join('|'))
								return (
									<tr
										key={`table:${index}:row:${rowKey}`}
										className="border-b border-[var(--p-border)] last:border-b-0"
									>
										{row.map((cell, cellIndex) => {
											const cellKey = stableKey(
												`${block.headers[cellIndex] ?? ''}:${cell}`,
											)
											return (
												<td
													key={`table:${index}:cell:${rowKey}:${cellKey}`}
													className="px-3 py-2 align-top text-[var(--p-text-secondary)]"
													style={{
														textAlign: block.align[cellIndex] ?? undefined,
													}}
												>
													{renderInlineMarkdown(
														cell,
														isArabic,
														`table:${index}:cell:${rowKey}:${cellKey}`,
													)}
												</td>
											)
										})}
									</tr>
								)
							})}
						</tbody>
					</table>
				</div>
			)
		case 'code':
			return (
				<pre
					key={`code:${index}`}
					className="overflow-x-auto rounded-lg border border-[var(--p-border)] bg-[var(--p-surface)] p-3 text-start"
				>
					<code className="font-[family-name:var(--font-mono)] text-[12px] leading-relaxed text-[var(--p-text)]">
						{block.text}
					</code>
				</pre>
			)
		case 'hr':
			return (
				<hr
					key={`hr:${index}`}
					className="border-0 border-t border-[var(--p-border)]"
				/>
			)
	}
}

function renderListItem(
	item: string,
	isArabic: boolean,
	keyPrefix: string,
): ReactNode {
	const checkbox = item.match(/^\[( |x|X)]\s+(.+)$/)
	if (!checkbox) return renderInlineMarkdown(item, isArabic, keyPrefix)
	const checked = checkbox[1]?.toLowerCase() === 'x'
	return (
		<span className="inline-flex items-start gap-2">
			<span
				className={`mt-[0.25em] h-3.5 w-3.5 flex-none rounded border ${
					checked
						? 'border-[var(--p-accent)] bg-[var(--p-accent)]'
						: 'border-[var(--p-border-strong)] bg-[var(--p-card)]'
				}`}
				aria-hidden
			/>
			<span>
				{renderInlineMarkdown(checkbox[2] ?? '', isArabic, `${keyPrefix}:box`)}
			</span>
		</span>
	)
}

function renderInlineMarkdown(
	text: string,
	isArabic: boolean,
	keyPrefix: string,
): ReactNode[] {
	const nodes: ReactNode[] = []
	const pattern = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+]\([^)]+\))/g
	let lastIndex = 0
	let segmentIndex = 0

	for (const match of text.matchAll(pattern)) {
		const matchIndex = match.index ?? 0
		if (matchIndex > lastIndex) {
			nodes.push(
				...renderTextWithNumbers(
					text.slice(lastIndex, matchIndex),
					isArabic,
					`${keyPrefix}:text:${segmentIndex}`,
				),
			)
			segmentIndex += 1
		}
		const raw = match[0]
		const key = `${keyPrefix}:inline:${segmentIndex}`
		nodes.push(renderInlineToken(raw, isArabic, key))
		segmentIndex += 1
		lastIndex = matchIndex + raw.length
	}

	if (lastIndex < text.length) {
		nodes.push(
			...renderTextWithNumbers(
				text.slice(lastIndex),
				isArabic,
				`${keyPrefix}:text:${segmentIndex}`,
			),
		)
	}

	return nodes.length > 0 ? nodes : [text]
}

function renderInlineToken(
	raw: string,
	isArabic: boolean,
	key: string,
): ReactNode {
	if (raw.startsWith('`') && raw.endsWith('`')) {
		return (
			<code
				key={key}
				className="rounded bg-[var(--p-surface)] px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-[0.9em] text-[var(--p-text)]"
			>
				{raw.slice(1, -1)}
			</code>
		)
	}
	if (raw.startsWith('**') && raw.endsWith('**')) {
		return (
			<strong key={key} className="font-semibold text-[var(--p-text)]">
				{renderInlineMarkdown(raw.slice(2, -2), isArabic, `${key}:strong`)}
			</strong>
		)
	}
	if (raw.startsWith('*') && raw.endsWith('*')) {
		return <em key={key}>{raw.slice(1, -1)}</em>
	}
	const link = raw.match(/^\[([^\]]+)]\(([^)]+)\)$/)
	if (link) {
		const href = safeHref(link[2] ?? '')
		if (!href) return <span key={key}>{link[1]}</span>
		const isExternal = /^https?:\/\//i.test(href)
		return (
			<a
				key={key}
				href={href}
				target={isExternal ? '_blank' : undefined}
				rel={isExternal ? 'noopener noreferrer' : undefined}
				className="font-medium text-[var(--p-accent)] underline underline-offset-2 transition-opacity hover:opacity-75"
			>
				{renderInlineMarkdown(link[1] ?? '', isArabic, `${key}:link`)}
			</a>
		)
	}
	return raw
}

function renderTextWithNumbers(
	text: string,
	isArabic: boolean,
	keyPrefix: string,
): ReactNode[] {
	const nodes: ReactNode[] = []
	const regex = /\d[\d,.\s]*/g
	let lastIndex = 0
	let index = 0

	for (const match of text.matchAll(regex)) {
		const matchIndex = match.index ?? 0
		if (matchIndex > lastIndex) {
			nodes.push(text.slice(lastIndex, matchIndex))
		}
		nodes.push(
			<span key={`${keyPrefix}:num:${index}`} className="voice-mono">
				{isArabic ? toArabicIndic(match[0]) : match[0]}
			</span>,
		)
		lastIndex = matchIndex + match[0].length
		index += 1
	}

	if (lastIndex < text.length) nodes.push(text.slice(lastIndex))
	return nodes
}

function isSpecialStart(lines: string[], index: number): boolean {
	const line = lines[index] ?? ''
	return (
		!line.trim() ||
		/^\s*```/.test(line) ||
		/^\s*---+\s*$/.test(line) ||
		/^\s*#{1,4}\s+/.test(line) ||
		isTableAt(lines, index) ||
		Boolean(matchListLine(line))
	)
}

function isTableAt(lines: string[], index: number): boolean {
	const current = lines[index] ?? ''
	const next = lines[index + 1] ?? ''
	return isTableRow(current) && isTableSeparator(next)
}

function isTableRow(line: string): boolean {
	return line.includes('|') && parseTableRow(line).length >= 2
}

function isTableSeparator(line: string): boolean {
	const cells = parseTableRow(line)
	return cells.length >= 2 && cells.every((cell) => /^:?-{3,}:?$/.test(cell))
}

function parseTableRow(line: string): string[] {
	return line
		.trim()
		.replace(/^\|/, '')
		.replace(/\|$/, '')
		.split('|')
		.map((cell) => cell.trim())
}

function parseTableAlign(line: string, width: number): TableAlign[] {
	return padRow(parseTableRow(line), width).map((cell) => {
		if (cell.startsWith(':') && cell.endsWith(':')) return 'center'
		if (cell.endsWith(':')) return 'right'
		if (cell.startsWith(':')) return 'left'
		return null
	})
}

function padRow(row: string[], width: number): string[] {
	return Array.from({ length: width }, (_, index) => row[index] ?? '')
}

function matchListLine(
	line: string,
): { ordered: boolean; text: string } | null {
	const match = line.match(/^\s*(?:(\d+)[.)]|[-*+])\s+(.+)$/)
	if (!match) return null
	return { ordered: Boolean(match[1]), text: match[2]?.trim() ?? '' }
}

function safeHref(href: string): string | null {
	const trimmed = href.trim()
	if (
		trimmed.startsWith('/') ||
		trimmed.startsWith('#') ||
		/^https?:\/\//i.test(trimmed) ||
		/^mailto:/i.test(trimmed) ||
		/^tel:/i.test(trimmed)
	) {
		return trimmed
	}
	return null
}

function stableKey(value: string): string {
	let hash = 0
	for (let index = 0; index < value.length; index += 1) {
		hash = (hash * 31 + value.charCodeAt(index)) >>> 0
	}
	return `${hash.toString(36)}:${value.slice(0, 24)}`
}
