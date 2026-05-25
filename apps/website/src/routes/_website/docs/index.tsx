import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { DocsMobileBrowseControls } from '../../../components/docs/DocsPageShell'
import { DocsSearch } from '../../../components/docs/DocsSearch'
import {
	revealUp,
	staggerUp,
	viewportOnce,
} from '../../../components/shared/motionVariants'
import { SectionNumber } from '../../../components/shared/SectionNumber'
import { DOC_CATEGORIES, displayName, WIZARDS } from '../../../content/registry'
import { websiteHead } from '../../../lib/seo'

export const Route = createFileRoute('/_website/docs/')({
	head: () =>
		websiteHead({
			title: 'Docs — HyperQuote',
			description:
				'HyperQuote documentation for sourcing building materials, managing quotes and orders, tracking deliveries, payments, supplier workflows, and Lyon AI.',
			path: '/docs',
		}),
	component: DocsIndexPage,
})

function DocsIndexPage() {
	const { t } = useTranslation('website')

	return (
		<div className="min-h-screen">
			{/* Hero */}
			<motion.section
				initial="hidden"
				animate="visible"
				variants={revealUp}
				className="px-4 pb-12 pt-24 sm:px-6 sm:pb-14 md:px-8 lg:px-12 lg:pb-20 lg:pt-36"
			>
				<div className="mx-auto max-w-[1200px] text-center lg:text-start">
					<h1 className="text-[2.55rem] font-bold leading-[0.98] tracking-normal sm:text-[3.25rem] lg:text-[4.5rem]">
						{t('docs.heroHeading')}
					</h1>

					<div className="mx-auto mt-6 h-px w-16 bg-[var(--color-text)] opacity-10 lg:mx-0" />

					<p className="mx-auto mt-6 max-w-[440px] text-[15px] leading-relaxed opacity-35 lg:mx-0">
						{t('docs.heroSubheading')}
					</p>
					<p className="mt-3 font-[family-name:var(--font-mono)] text-[12px] tracking-normal text-[var(--color-text-subtle)]">
						{DOC_CATEGORIES.reduce((n, c) => n + c.articles.length, 0)}{' '}
						{t('docs.articles')} &middot; {WIZARDS.length} {t('docs.guides')}
					</p>

					{/* Search */}
					<div className="mx-auto mt-8 max-w-[520px] sm:mt-10 lg:mx-0">
						<DocsSearch />
					</div>
				</div>
			</motion.section>

			{/* Divider */}
			<div className="mx-auto max-w-[1200px] px-4 sm:px-6 md:px-8 lg:px-12">
				<div className="h-px bg-[var(--color-text)] opacity-[0.07]" />
			</div>

			{/* Mobile sidebar trigger */}
			<div className="px-4 pt-6 sm:px-6 md:px-8 lg:hidden">
				<DocsMobileBrowseControls />
			</div>

			{/* Wizard Guides */}
			<section className="px-4 py-14 sm:px-6 sm:py-16 md:px-8 lg:px-12 lg:py-24">
				<div className="mx-auto max-w-[1200px]">
					<motion.div
						initial="hidden"
						whileInView="visible"
						viewport={viewportOnce}
						variants={revealUp}
						className="mb-8 text-center sm:mb-10 lg:mb-14 lg:text-start"
					>
						<SectionNumber n={1} />
						<h2 className="mt-3 text-[1.5rem] font-bold tracking-normal sm:text-[1.75rem] lg:text-[2rem]">
							{t('docs.guidesHeading')}
						</h2>
					</motion.div>

					<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
						{WIZARDS.map((w, i) => (
							<motion.div
								key={w.slug}
								initial="hidden"
								whileInView="visible"
								viewport={viewportOnce}
								variants={staggerUp(i * 0.08)}
							>
								<Link
									to="/docs/guide/$guideSlug"
									params={{ guideSlug: w.slug }}
									className="group block h-full rounded-lg border border-[var(--color-text)]/[0.06] p-5 text-center transition-colors hover:border-[var(--color-text)]/[0.12] sm:p-6 lg:text-start"
								>
									<span className="font-[family-name:var(--font-mono)] text-[11px] text-[var(--color-text-subtle)]">
										{t('docs.wizard.guide')}
									</span>
									<h3 className="mt-2 text-[16px] font-semibold tracking-normal">
										{t(w.titleKey, { defaultValue: displayName(w.titleKey) })}
									</h3>
									<p className="mt-2 text-[13px] text-[var(--color-text-muted)] leading-relaxed line-clamp-2">
										{t(w.descriptionKey, {
											defaultValue: displayName(w.descriptionKey),
										})}
									</p>
									<div className="mt-4 flex items-center justify-center gap-1.5 text-[13px] font-medium text-[var(--color-primary)] transition-opacity lg:justify-start lg:opacity-0 lg:group-hover:opacity-100">
										{t('docs.startGuide')}
										<ArrowRight size={13} className="icon-end" />
									</div>
								</Link>
							</motion.div>
						))}
					</div>
				</div>
			</section>

			{/* Divider */}
			<div className="mx-auto max-w-[1200px] px-4 sm:px-6 md:px-8 lg:px-12">
				<div className="h-px bg-[var(--color-text)] opacity-[0.07]" />
			</div>

			{/* Documentation Categories */}
			<section className="px-4 py-14 sm:px-6 sm:py-16 md:px-8 lg:px-12 lg:py-24">
				<div className="mx-auto max-w-[1200px]">
					<motion.div
						initial="hidden"
						whileInView="visible"
						viewport={viewportOnce}
						variants={revealUp}
						className="mb-8 text-center sm:mb-10 lg:mb-14 lg:text-start"
					>
						<SectionNumber n={2} />
						<h2 className="mt-3 text-[1.5rem] font-bold tracking-normal sm:text-[1.75rem] lg:text-[2rem]">
							{t('docs.docsHeading')}
						</h2>
					</motion.div>

					<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
						{DOC_CATEGORIES.map((cat, catIdx) => (
							<motion.div
								key={cat.slug}
								initial="hidden"
								whileInView="visible"
								viewport={viewportOnce}
								variants={staggerUp(catIdx * 0.05)}
								className="border-t border-[var(--color-text)]/[0.07] py-6 md:px-5 md:py-7 xl:px-7"
							>
								<div className="mb-5 flex flex-col items-center justify-center gap-1 lg:flex-row lg:items-baseline lg:justify-start lg:gap-2.5">
									<span className="font-[family-name:var(--font-mono)] text-[12px] text-[var(--color-text-subtle)]">
										{String(catIdx + 1).padStart(2, '0')}
									</span>
									<Link
										to="/docs/$categorySlug"
										params={{ categorySlug: cat.slug }}
										className="text-[16px] font-semibold tracking-normal transition-colors hover:text-[var(--color-primary)]"
									>
										{t(cat.titleKey, {
											defaultValue: displayName(cat.titleKey),
										})}
									</Link>
								</div>

								<ul className="space-y-1">
									{cat.articles.map((article) => (
										<li key={article.slug}>
											<Link
												to="/docs/$categorySlug/$articleSlug"
												params={{
													categorySlug: cat.slug,
													articleSlug: article.slug,
												}}
												className="group flex items-center justify-center gap-3 rounded-md py-2 text-center text-[14px] text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)] lg:justify-between lg:text-start"
											>
												<span className="min-w-0 break-words">
													{t(article.titleKey, {
														defaultValue: displayName(article.titleKey),
													})}
												</span>
												<ArrowRight
													size={13}
													className="icon-end hidden shrink-0 opacity-30 transition-opacity lg:block lg:opacity-0 lg:group-hover:opacity-40"
												/>
											</Link>
										</li>
									))}
								</ul>
							</motion.div>
						))}
					</div>
				</div>
			</section>
		</div>
	)
}
