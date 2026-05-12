import type { Token, Tokens } from 'marked'
import { Lexer } from 'marked'
import { type ReactNode, useMemo } from 'react'

interface ChatMarkdownProps {
	content: string
	messageRole?: 'user' | 'assistant'
	className?: string
}

function tokenKey(token: Token, position: number): string {
	const raw =
		'raw' in token && typeof token.raw === 'string'
			? token.raw
			: JSON.stringify(token)
	return `${position}:${token.type}:${raw}`
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

export function ChatMarkdown({
	content,
	messageRole = 'assistant',
	className,
}: ChatMarkdownProps) {
	const elements = useMemo(() => {
		const tokens = Lexer.lex(content, { gfm: true, breaks: true })
		return tokens.map((token, index) => renderBlock(token, index, messageRole))
	}, [content, messageRole])

	return (
		<div
			className={`space-y-3 break-words ${
				messageRole === 'user' ? 'text-end' : 'text-start'
			} ${className ?? ''}`}
		>
			{elements}
		</div>
	)
}

function renderBlock(token: Token, index: number, role: 'user' | 'assistant') {
	const key = tokenKey(token, index)

	switch (token.type) {
		case 'space':
			return null

		case 'heading': {
			const heading = token as Tokens.Heading
			const HeadingTag = heading.depth <= 2 ? 'h3' : 'h4'
			return (
				<HeadingTag
					key={key}
					className="text-[15px] font-semibold leading-snug text-[var(--color-text)]"
				>
					{renderInline(heading.tokens)}
				</HeadingTag>
			)
		}

		case 'paragraph': {
			const paragraph = token as Tokens.Paragraph
			return (
				<p key={key} className="leading-[inherit]">
					{renderInline(paragraph.tokens)}
				</p>
			)
		}

		case 'text': {
			const text = token as Tokens.Text
			return (
				<p key={key} className="leading-[inherit]">
					{text.tokens ? renderInline(text.tokens) : text.text}
				</p>
			)
		}

		case 'list': {
			const list = token as Tokens.List
			const ListTag = list.ordered ? 'ol' : 'ul'
			return (
				<ListTag
					key={key}
					className={`space-y-1.5 ${
						role === 'user' ? 'list-inside' : 'list-outside ps-5'
					} ${list.ordered ? 'list-decimal' : 'list-disc'}`}
				>
					{list.items.map((item, itemIndex) => (
						<li key={tokenKey(item, itemIndex)}>
							{item.tokens.map((child, childIndex) =>
								renderListChild(child, childIndex, role),
							)}
						</li>
					))}
				</ListTag>
			)
		}

		case 'blockquote': {
			const blockquote = token as Tokens.Blockquote
			return (
				<blockquote
					key={key}
					className="border-s-2 border-[var(--color-primary)]/35 ps-3 text-[0.95em]"
				>
					{blockquote.tokens.map((child, childIndex) =>
						renderBlock(child, childIndex, role),
					)}
				</blockquote>
			)
		}

		case 'code': {
			const code = token as Tokens.Code
			return (
				<pre
					key={key}
					className="overflow-x-auto rounded-lg border border-[var(--color-text)]/[0.08] bg-[var(--color-surface)] p-3 text-start"
				>
					<code className="font-[family-name:var(--font-mono)] text-[12px] leading-relaxed">
						{code.text}
					</code>
				</pre>
			)
		}

		case 'table': {
			const table = token as Tokens.Table
			return (
				<div key={key} className="overflow-x-auto">
					<table className="w-full min-w-[280px] border-collapse text-start text-[13px]">
						<thead>
							<tr>
								{table.header.map((cell) => (
									<th
										key={`head:${tableCellKey(cell)}`}
										className="border-b border-[var(--color-text)]/[0.12] px-2 py-2 font-semibold text-[var(--color-text)]"
										style={{ textAlign: cell.align ?? undefined }}
									>
										{renderInline(cell.tokens)}
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							{table.rows.map((row) => (
								<tr key={`row:${row.map(tableCellKey).join('|')}`}>
									{row.map((cell) => (
										<td
											key={`cell:${tableCellKey(cell)}`}
											className="border-b border-[var(--color-text)]/[0.06] px-2 py-2"
											style={{ textAlign: cell.align ?? undefined }}
										>
											{renderInline(cell.tokens)}
										</td>
									))}
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)
		}

		case 'hr':
			return (
				<hr
					key={key}
					className="border-0 border-t border-[var(--color-text)]/[0.08]"
				/>
			)

		case 'html': {
			const html = token as Tokens.HTML
			return (
				<p key={key} className="leading-[inherit]">
					{html.text}
				</p>
			)
		}

		default:
			if ('raw' in token) {
				return (
					<p key={key} className="leading-[inherit]">
						{token.raw}
					</p>
				)
			}
			return null
	}
}

function tableCellKey(cell: Tokens.TableCell): string {
	return `${cell.header ? 'header' : 'cell'}:${cell.align ?? 'none'}:${cell.text}`
}

function renderListChild(
	token: Token,
	index: number,
	role: 'user' | 'assistant',
): ReactNode {
	if (token.type === 'paragraph') {
		return (
			<span key={tokenKey(token, index)}>
				{renderInline((token as Tokens.Paragraph).tokens)}
			</span>
		)
	}
	if (
		token.type === 'text' &&
		'tokens' in token &&
		Array.isArray((token as Tokens.Text).tokens)
	) {
		return (
			<span key={tokenKey(token, index)}>
				{renderInline((token as Tokens.Text).tokens)}
			</span>
		)
	}
	return renderBlock(token, index, role)
}

function renderInline(tokens: Token[] | undefined): ReactNode {
	if (!tokens) return null

	return tokens.map((token, index) => {
		const key = tokenKey(token, index)

		switch (token.type) {
			case 'text': {
				const text = token as Tokens.Text
				return text.tokens ? (
					<span key={key}>{renderInline(text.tokens)}</span>
				) : (
					<span key={key}>{text.text}</span>
				)
			}

			case 'escape':
				return <span key={key}>{(token as Tokens.Escape).text}</span>

			case 'strong':
				return (
					<strong key={key} className="font-semibold text-[var(--color-text)]">
						{renderInline((token as Tokens.Strong).tokens)}
					</strong>
				)

			case 'em':
				return <em key={key}>{renderInline((token as Tokens.Em).tokens)}</em>

			case 'del':
				return <del key={key}>{renderInline((token as Tokens.Del).tokens)}</del>

			case 'codespan':
				return (
					<code
						key={key}
						className="rounded bg-[var(--color-surface)] px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-[0.9em] text-[var(--color-text)]"
					>
						{(token as Tokens.Codespan).text}
					</code>
				)

			case 'br':
				return <br key={key} />

			case 'link': {
				const link = token as Tokens.Link
				const href = safeHref(link.href)
				if (!href) return <span key={key}>{renderInline(link.tokens)}</span>
				const isExternal = /^https?:\/\//i.test(href)
				return (
					<a
						key={key}
						href={href}
						target={isExternal ? '_blank' : undefined}
						rel={isExternal ? 'noopener noreferrer' : undefined}
						className="font-medium text-[var(--color-primary)] underline underline-offset-2 transition-opacity hover:opacity-75"
					>
						{renderInline(link.tokens)}
					</a>
				)
			}

			case 'image': {
				const image = token as Tokens.Image
				return <span key={key}>{image.text || image.href}</span>
			}

			case 'html':
				return <span key={key}>{(token as Tokens.HTML).text}</span>

			default:
				if ('raw' in token) return <span key={key}>{token.raw}</span>
				return null
		}
	})
}
