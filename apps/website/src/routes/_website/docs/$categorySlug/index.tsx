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

export const Route = createFileRoute('/_website/docs/$categorySlug/')({
	head: ({ params }) => ({
		meta: [
			{
				title: `${params.categorySlug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())} \u2014 Docs \u2014 HyperQuote`,
			},
		],
	}),
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
				<div className="mb-6 flex items-center justify-center gap-2 text-[12px] text-[var(--color-text-subtle)] lg:justify-start">
					<Link
						to="/docs"
						className="hover:text-[var(--color-text)] transition-colors"
					>
						{t('nav.docs')}
					</Link>
				</div>

				<h1 className="mb-4 text-center text-[1.85rem] font-bold leading-[1.1] tracking-normal sm:text-[2.1rem] lg:text-start lg:text-[2.25rem]">
					{t(category.titleKey, {
						defaultValue: displayName(category.titleKey),
					})}
				</h1>

				<div className="mb-8 h-px bg-[var(--color-text)] opacity-[0.07] sm:mb-10" />

				{/* Article list */}
				<ul className="space-y-2 sm:space-y-4">
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
								className="group flex items-center justify-center gap-4 border-b border-[var(--color-text)]/[0.05] py-4 text-center transition-colors hover:border-[var(--color-text)]/[0.12] lg:justify-between lg:text-start"
							>
								<div className="min-w-0">
									<div className="flex flex-col items-center justify-center gap-1 lg:flex-row lg:items-baseline lg:justify-start lg:gap-2.5">
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
										<p className="mt-1 text-[13px] leading-relaxed text-[var(--color-text-muted)] lg:ps-8">
											{t(article.descriptionKey, {
												defaultValue: displayName(article.descriptionKey),
											})}
										</p>
									)}
								</div>
								<ArrowRight
									size={14}
									className="icon-end hidden shrink-0 opacity-30 transition-opacity lg:block lg:opacity-0 lg:group-hover:opacity-40"
								/>
							</Link>
						</motion.li>
					))}
				</ul>
			</div>
		</DocsPageShell>
	)
}
