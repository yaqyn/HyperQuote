import {
	createFileRoute,
	Link,
	useNavigate,
	useParams,
} from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { cubicBezier, motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { DocsPageShell } from '../../../../components/docs/DocsPageShell'
import { DOC_CATEGORIES, displayName } from '../../../../content/registry'
import { titleCaseSlug, websiteHead } from '../../../../lib/seo'

export const Route = createFileRoute('/_website/docs/$categorySlug/')({
	head: ({ params }) => {
		const category = DOC_CATEGORIES.find(
			(item) => item.slug === params.categorySlug,
		)
		const title = category
			? displayName(category.titleKey)
			: titleCaseSlug(params.categorySlug)
		return websiteHead({
			title: `${title} — Docs — HyperQuote`,
			description: `${title} documentation for HyperQuote customers, suppliers, drivers, and internal building materials workflows.`,
			path: `/docs/${params.categorySlug}`,
			robots: category ? 'index,follow' : 'noindex,nofollow',
		})
	},
	component: CategoryIndexPage,
})

const EASE = cubicBezier(0.25, 0.1, 0.25, 1)

const viewportOnce = { once: true, margin: '-60px' as const }

function CategoryIndexPage() {
	const { t } = useTranslation('website')
	const { categorySlug } = useParams({ from: '/_website/docs/$categorySlug/' })
	const navigate = useNavigate()

	const category = DOC_CATEGORIES.find((c) => c.slug === categorySlug)

	if (!category) {
		navigate({ to: '/docs' })
		return null
	}

	return (
		<DocsPageShell activeCategorySlug={categorySlug}>
			<div className="min-w-0 flex-1 lg:max-w-[800px]">
				{/* Breadcrumb */}
				<div className="mb-5 flex items-center gap-2 text-[12px] text-[var(--color-text-subtle)]">
					<Link
						to="/docs"
						className="hover:text-[var(--color-text)] transition-colors"
					>
						{t('nav.docs')}
					</Link>
				</div>

				<h1 className="hq-display hq-title-subsection mb-5 font-bold">
					{t(category.titleKey, {
						defaultValue: displayName(category.titleKey),
					})}
				</h1>

				<div className="mb-8 h-px bg-[var(--site-rule)] sm:mb-10" />

				{/* Article list */}
				<ul className="border-t border-[var(--site-rule)]">
					{category.articles.map((article, i) => (
						<motion.li
							key={article.slug}
							initial="hidden"
							whileInView="visible"
							viewport={viewportOnce}
							variants={{
								hidden: { opacity: 0, y: 12 },
								visible: {
									opacity: 1,
									y: 0,
									transition: {
										duration: 0.3,
										ease: EASE,
										delay: i * 0.05,
									},
								},
							}}
						>
							<Link
								to="/docs/$categorySlug/$articleSlug"
								params={{ categorySlug, articleSlug: article.slug }}
								className="group flex items-center justify-between gap-4 border-b border-[var(--site-rule)] px-1 py-5 text-start transition-colors hover:bg-[var(--site-blue-wash)] sm:px-4"
							>
								<div className="min-w-0">
									<div className="flex items-baseline gap-2.5">
										<span className="font-[family-name:var(--font-mono)] text-[12px] text-[var(--color-text-subtle)]">
											{String(i + 1).padStart(2, '0')}
										</span>
										<span className="min-w-0 break-words text-[16px] font-medium">
											{t(article.titleKey, {
												defaultValue: displayName(article.titleKey),
											})}
										</span>
									</div>
									{article.descriptionKey && (
										<p className="mt-1 ps-8 text-[13px] leading-relaxed text-[var(--color-text-muted)]">
											{t(article.descriptionKey, {
												defaultValue: displayName(article.descriptionKey),
											})}
										</p>
									)}
								</div>
								<ArrowRight
									size={14}
									className="icon-end shrink-0 text-[var(--color-text-subtle)] transition-colors group-hover:text-[var(--color-primary)]"
								/>
							</Link>
						</motion.li>
					))}
				</ul>
			</div>
		</DocsPageShell>
	)
}
