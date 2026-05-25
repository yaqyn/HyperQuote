import { createFileRoute, useNavigate, useParams } from '@tanstack/react-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
	ArticleRenderer,
	type ExtractedHeading,
	extractHeadings,
} from '../../../../components/docs/ArticleRenderer'
import { DocsPageShell } from '../../../../components/docs/DocsPageShell'
import { ArticleJsonLd } from '../../../../components/shared/JsonLd'
import { getContent } from '../../../../content/docs'
import {
	displayName,
	findArticle,
	getAdjacentArticles,
} from '../../../../content/registry'
import {
	absoluteWebsiteUrl,
	titleCaseSlug,
	websiteHead,
} from '../../../../lib/seo'

export const Route = createFileRoute(
	'/_website/docs/$categorySlug/$articleSlug',
)({
	head: ({ params }) => {
		const match = findArticle(params.categorySlug, params.articleSlug)
		const title = match
			? displayName(match.article.titleKey)
			: titleCaseSlug(params.articleSlug)
		const description = match
			? displayName(match.article.descriptionKey)
			: 'HyperQuote documentation article.'
		return websiteHead({
			title: `${title} — Docs — HyperQuote`,
			description,
			path: `/docs/${params.categorySlug}/${params.articleSlug}`,
			robots: match ? 'index,follow' : 'noindex,nofollow',
			type: 'article',
		})
	},
	component: ArticlePage,
})

function ArticlePage() {
	const { t, i18n } = useTranslation('website')
	const { categorySlug, articleSlug } = useParams({
		from: '/_website/docs/$categorySlug/$articleSlug',
	})
	const navigate = useNavigate()

	const locale = (i18n.language === 'ar' ? 'ar' : 'en') as 'en' | 'ar'
	const markdown = getContent(categorySlug, articleSlug, locale)
	const headings = useMemo(() => extractHeadings(markdown), [markdown])

	const match = findArticle(categorySlug, articleSlug)
	if (!match) {
		navigate({ to: '/docs' })
		return null
	}

	const { article } = match
	const adjacent = getAdjacentArticles(categorySlug, articleSlug)
	const articleTitle = t(article.titleKey, {
		defaultValue: displayName(article.titleKey),
	})
	const articleDescription = t(article.descriptionKey, {
		defaultValue: displayName(article.descriptionKey),
	})

	return (
		<DocsPageShell
			maxWidth="article"
			activeCategorySlug={categorySlug}
			activeArticleSlug={articleSlug}
		>
			<ArticleJsonLd
				headline={articleTitle}
				description={articleDescription}
				url={absoluteWebsiteUrl(`/docs/${categorySlug}/${articleSlug}`)}
			/>
			<ArticleRenderer
				key={locale}
				markdown={markdown}
				articleTitle={articleTitle}
				categorySlug={categorySlug}
				prev={adjacent.prev}
				next={adjacent.next}
			/>

			<TableOfContentsRaw key={`toc-${locale}`} headings={headings} />
		</DocsPageShell>
	)
}

function TableOfContentsRaw({ headings }: { headings: ExtractedHeading[] }) {
	const { t } = useTranslation('website')
	const [activeId, setActiveId] = useState('')
	const observerRef = useRef<IntersectionObserver | null>(null)

	useEffect(() => {
		if (headings.length === 0) return
		observerRef.current?.disconnect()
		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) setActiveId(entry.target.id)
				}
			},
			{ rootMargin: '-80px 0px -60% 0px', threshold: 0.1 },
		)
		observerRef.current = observer
		for (const h of headings) {
			const el = document.getElementById(h.id)
			if (el) observer.observe(el)
		}
		return () => observer.disconnect()
	}, [headings])

	if (headings.length === 0) return null

	return (
		<aside className="hidden xl:block w-44 shrink-0 sticky top-24 self-start max-h-[calc(100vh-8rem)] overflow-y-auto">
			<p className="text-[11px] font-semibold uppercase tracking-normal text-[var(--color-text-subtle)] mb-3">
				{t('docs.toc.label', { defaultValue: 'On this page' })}
			</p>
			<ul className="space-y-0.5">
				{headings.map((h) => (
					<li key={h.id}>
						<a
							href={`#${h.id}`}
							className={`relative block text-[13px] leading-snug py-1 transition-colors duration-150 ${
								h.level === 3 ? 'ps-4' : 'ps-0'
							} ${
								activeId === h.id
									? 'text-[var(--color-text)] font-medium'
									: 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
							}`}
						>
							{h.text}
						</a>
					</li>
				))}
			</ul>
		</aside>
	)
}
