import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import type { Token, Tokens } from 'marked'
import { Lexer } from 'marked'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { displayName } from '../../content/registry'
import { AskLyonPill } from './AskLyonPill'

interface ArticleRendererProps {
	markdown: string
	articleTitle: string
	categorySlug: string
	prev: { slug: string; categorySlug: string; titleKey: string } | null
	next: { slug: string; categorySlug: string; titleKey: string } | null
}

/** Stable per-token key. Tokens carry their raw source — that's unique by
 * content + position in the rendered tree. Falls back to JSON of the token
 * shape for the rare Generic tokens without `raw`. */
function tokenKey(token: Token, position: number): string {
	const raw =
		'raw' in token && typeof token.raw === 'string'
			? token.raw
			: JSON.stringify(token)
	return `${position}:${token.type}:${raw}`
}

export interface ExtractedHeading {
	id: string
	level: 2 | 3
	text: string
}

/** Parse markdown and extract headings for TOC */
export function extractHeadings(markdown: string): ExtractedHeading[] {
	const tokens = Lexer.lex(markdown)
	const headings: ExtractedHeading[] = []
	for (const token of tokens) {
		if (token.type === 'heading' && (token.depth === 2 || token.depth === 3)) {
			headings.push({
				id: slugify(token.text),
				level: token.depth as 2 | 3,
				text: token.text,
			})
		}
	}
	return headings
}

function slugify(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^\w\s-]/g, '')
		.replace(/\s+/g, '-')
		.trim()
}

export function ArticleRenderer({
	markdown,
	articleTitle,
	categorySlug,
	prev,
	next,
}: ArticleRendererProps) {
	const { t } = useTranslation('website')

	const elements = useMemo(() => {
		const tokens = Lexer.lex(markdown)

		return tokens.map((token, idx) => renderToken(token, idx))

		function renderToken(token: Token, idx: number): React.ReactNode {
			const key = tokenKey(token, idx)
			switch (token.type) {
				case 'heading': {
					const heading = token as Tokens.Heading
					const id = slugify(heading.text)
					const Tag = `h${heading.depth}` as 'h2' | 'h3' | 'h4'

					if (heading.depth === 2) {
						return (
							<div
								key={key}
								id={id}
								className="mb-4 mt-11 scroll-mt-24 border-t border-[var(--site-rule)] pt-7 first:mt-0 sm:mt-14"
							>
								<div className="flex items-start justify-between gap-4 text-start">
									<Tag className="min-w-0 text-[20px] font-semibold tracking-normal sm:text-[22px]">
										{heading.text}
									</Tag>
									<AskLyonPill
										className="hidden shrink-0 sm:inline-flex"
										contextKey="docs.askLyonContext.tellMeAbout"
										contextVars={{
											heading: heading.text,
											article: articleTitle,
										}}
									/>
								</div>
							</div>
						)
					}

					return (
						<Tag
							key={key}
							id={id}
							className="mb-3 mt-8 scroll-mt-24 text-start text-[16px] font-semibold"
						>
							{heading.text}
						</Tag>
					)
				}

				case 'paragraph': {
					const para = token as Tokens.Paragraph
					return (
						<p
							key={key}
							className="mb-5 text-start text-[15px] leading-[1.85] text-[var(--color-text-muted)]"
						>
							{renderInline(para.tokens)}
						</p>
					)
				}

				case 'list': {
					const list = token as Tokens.List
					const Tag = list.ordered ? 'ol' : 'ul'
					return (
						<Tag
							key={key}
							className={`mb-5 list-outside space-y-2 ps-6 text-start ${
								list.ordered ? 'list-decimal' : 'list-disc'
							} text-[15px] leading-[1.85] text-[var(--color-text-muted)]`}
						>
							{list.items.map((item: Tokens.ListItem) => (
								<li key={item.raw}>
									{item.tokens.map((tkn, j) => {
										const innerKey = tokenKey(tkn, j)
										if (
											tkn.type === 'text' &&
											'tokens' in tkn &&
											(tkn as Tokens.Text).tokens
										) {
											return (
												<span key={innerKey}>
													{renderInline((tkn as Tokens.Text).tokens)}
												</span>
											)
										}
										if (tkn.type === 'paragraph') {
											return (
												<span key={innerKey}>
													{renderInline((tkn as Tokens.Paragraph).tokens)}
												</span>
											)
										}
										return <span key={innerKey}>{renderInline([tkn])}</span>
									})}
								</li>
							))}
						</Tag>
					)
				}

				case 'blockquote': {
					const bq = token as Tokens.Blockquote
					return (
						<blockquote
							key={key}
							className="mx-auto mb-5 max-w-[620px] border-t border-[var(--color-primary)]/30 pt-4 text-start text-[14px] leading-relaxed text-[var(--color-text-muted)] lg:mx-0 lg:max-w-none lg:border-t-0 lg:border-s-2 lg:py-2 lg:ps-4"
						>
							{bq.tokens.map((tkn, i) => renderToken(tkn, i))}
						</blockquote>
					)
				}

				case 'code': {
					const code = token as Tokens.Code
					return (
						<pre
							key={key}
							className="bg-[var(--color-surface)] border border-[var(--color-text)]/[0.06] rounded-lg p-4 mb-5 overflow-x-auto"
						>
							<code className="font-[family-name:var(--font-mono)] text-[13px] leading-relaxed">
								{code.text}
							</code>
						</pre>
					)
				}

				case 'hr':
					return (
						<hr
							key={key}
							className="my-10 border-0 h-px bg-[var(--color-text)] opacity-[0.07]"
						/>
					)

				case 'space':
					return null

				default:
					return null
			}
		}

		function renderInline(tokens: Token[] | undefined): React.ReactNode {
			if (!tokens) return null
			return tokens.map((token, i) => {
				const key = tokenKey(token, i)
				switch (token.type) {
					case 'text':
						return <span key={key}>{(token as Tokens.Text).text}</span>
					case 'strong':
						return (
							<strong
								key={key}
								className="font-semibold text-[var(--color-text)]"
							>
								{renderInline((token as Tokens.Strong).tokens)}
							</strong>
						)
					case 'em':
						return (
							<em key={key}>{renderInline((token as Tokens.Em).tokens)}</em>
						)
					case 'codespan':
						return (
							<code
								key={key}
								className="font-[family-name:var(--font-mono)] text-[13px] bg-[var(--color-surface)] px-1.5 py-0.5 rounded"
							>
								{(token as Tokens.Codespan).text}
							</code>
						)
					case 'link': {
						const link = token as Tokens.Link
						return (
							<a
								key={key}
								href={link.href}
								className="text-[var(--color-primary)] hover:opacity-70 transition-opacity underline underline-offset-2"
							>
								{renderInline(link.tokens)}
							</a>
						)
					}
					default:
						if ('raw' in token)
							return (
								<span key={key}>
									{(token as Tokens.Generic & { raw: string }).raw}
								</span>
							)
						return null
				}
			})
		}
	}, [markdown, articleTitle])

	return (
		<article className="min-w-0 max-w-[760px] flex-1">
			{/* Breadcrumb */}
			<div className="mb-6 flex items-center gap-2 text-[12px] text-[var(--color-text-subtle)]">
				<Link
					to="/docs"
					className="hover:text-[var(--color-text)] transition-colors"
				>
					{t('nav.docs')}
				</Link>
				<span className="opacity-40">/</span>
				<Link
					to="/docs/$categorySlug"
					params={{ categorySlug }}
					className="hover:text-[var(--color-text)] transition-colors"
				>
					{t(`docs.category.${categorySlug}.title`, {
						defaultValue: displayName(`docs.category.${categorySlug}.title`),
					})}
				</Link>
			</div>

			{/* Title */}
			<h1 className="hq-display hq-title-record mb-6 text-start font-bold text-[var(--color-text)]">
				{articleTitle}
			</h1>

			{/* Divider */}
			<div className="mb-8 h-px bg-[var(--color-text)] opacity-[0.07] sm:mb-10" />

			{/* Content */}
			{elements}

			{/* Bottom navigation */}
			<div className="mt-16 border-t border-[var(--color-text)]/[0.07] pt-8">
				<div className="flex flex-col gap-5 sm:flex-row sm:items-stretch sm:justify-between">
					{prev ? (
						<Link
							to="/docs/$categorySlug/$articleSlug"
							params={{
								categorySlug: prev.categorySlug,
								articleSlug: prev.slug,
							}}
							className="group flex min-w-0 flex-col items-center text-center sm:items-start sm:text-start"
						>
							<span className="text-[11px] text-[var(--color-text-subtle)] mb-1">
								{t('docs.nav.previous', { defaultValue: 'Previous' })}
							</span>
							<span className="break-words text-[14px] font-medium text-[var(--color-text-muted)] transition-colors group-hover:text-[var(--color-text)]">
								{t(prev.titleKey, { defaultValue: displayName(prev.titleKey) })}
							</span>
						</Link>
					) : (
						<div />
					)}

					{next && (
						<Link
							to="/docs/$categorySlug/$articleSlug"
							params={{
								categorySlug: next.categorySlug,
								articleSlug: next.slug,
							}}
							className="group flex min-w-0 flex-col items-center text-center sm:items-end sm:text-end"
						>
							<span className="text-[11px] text-[var(--color-text-subtle)] mb-1">
								{t('docs.nav.next', { defaultValue: 'Next' })}
							</span>
							<span className="flex items-center gap-1.5 text-[14px] font-medium text-[var(--color-text-muted)] transition-colors group-hover:text-[var(--color-text)]">
								<span className="break-words">
									{t(next.titleKey, {
										defaultValue: displayName(next.titleKey),
									})}
								</span>
								<ArrowRight size={14} className="icon-end" />
							</span>
						</Link>
					)}
				</div>
			</div>
		</article>
	)
}
