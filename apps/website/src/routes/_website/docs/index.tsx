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
			<motion.section
				initial="hidden"
				animate="visible"
				variants={revealUp}
				className="relative isolate overflow-hidden pb-14 pt-28 sm:pb-16 sm:pt-32 lg:pb-20 lg:pt-40"
			>
				<div
					aria-hidden="true"
					className="hq-dither-field hq-dither-field--docs"
				/>
				<div className="hq-page-shell relative grid gap-10 border-t border-[var(--site-rule)] pt-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(420px,0.62fr)] lg:items-end lg:gap-20">
					<div>
						<p className="hq-kicker mb-5 text-[var(--color-primary)]">
							HyperQuote / {t('nav.docs')}
						</p>
						<h1 className="hq-display hq-title-section font-bold text-[var(--color-text)]">
							{t('docs.heroHeading')}
						</h1>
					</div>

					<div className="max-w-[560px] lg:justify-self-end">
						<p className="max-w-[520px] text-[15px] leading-7 text-[var(--color-text-muted)]">
							{t('docs.heroSubheading')}
						</p>
						<p className="mt-3 font-[family-name:var(--font-mono)] text-[11px] text-[var(--color-text-subtle)]">
							{DOC_CATEGORIES.reduce((n, c) => n + c.articles.length, 0)}{' '}
							{t('docs.articles')} &middot; {WIZARDS.length} {t('docs.guides')}
						</p>
						<div className="mt-7 max-w-[520px]">
							<DocsSearch />
						</div>
					</div>
				</div>
			</motion.section>

			<div className="hq-page-shell border-t border-[var(--site-rule)] pt-6 lg:hidden">
				<DocsMobileBrowseControls />
			</div>

			<section className="border-y border-[var(--site-rule)] bg-[var(--site-concrete)]/45 py-14 sm:py-16 lg:py-24">
				<div className="hq-page-shell">
					<motion.div
						initial="hidden"
						whileInView="visible"
						viewport={viewportOnce}
						variants={revealUp}
						className="mb-8 sm:mb-10 lg:mb-14"
					>
						<p className="hq-kicker mb-4 text-[var(--color-primary)]">
							{WIZARDS.length} {t('docs.guides')}
						</p>
						<h2 className="hq-display hq-title-subsection font-bold">
							{t('docs.guidesHeading')}
						</h2>
					</motion.div>

					<div className="grid grid-cols-1 border-t border-[var(--site-rule)] md:grid-cols-3">
						{WIZARDS.map((w, i) => (
							<motion.div
								key={w.slug}
								initial="hidden"
								whileInView="visible"
								viewport={viewportOnce}
								variants={staggerUp(i * 0.08)}
								className="border-b border-[var(--site-rule)] md:border-e md:last:border-e-0"
							>
								<Link
									to="/docs/guide/$guideSlug"
									params={{ guideSlug: w.slug }}
									className="group block h-full p-5 transition-colors hover:bg-[var(--site-blue-wash)] sm:p-6 lg:p-7"
								>
									<span className="font-[family-name:var(--font-mono)] text-[11px] text-[var(--color-text-subtle)]">
										{t('docs.wizard.guide')} / {String(i + 1).padStart(2, '0')}
									</span>
									<h3 className="mt-3 text-[17px] font-semibold tracking-normal">
										{t(w.titleKey, { defaultValue: displayName(w.titleKey) })}
									</h3>
									<p className="mt-3 line-clamp-3 text-[13px] leading-6 text-[var(--color-text-muted)]">
										{t(w.descriptionKey, {
											defaultValue: displayName(w.descriptionKey),
										})}
									</p>
									<div className="mt-5 flex items-center gap-1.5 text-[13px] font-medium text-[var(--color-primary)]">
										{t('docs.startGuide')}
										<ArrowRight size={13} className="icon-end" />
									</div>
								</Link>
							</motion.div>
						))}
					</div>
				</div>
			</section>

			<section className="py-14 sm:py-16 lg:py-24">
				<div className="hq-page-shell">
					<motion.div
						initial="hidden"
						whileInView="visible"
						viewport={viewportOnce}
						variants={revealUp}
						className="mb-8 sm:mb-10 lg:mb-14"
					>
						<p className="hq-kicker mb-4 text-[var(--color-primary)]">
							{t('docs.browseAll')}
						</p>
						<h2 className="hq-display hq-title-subsection font-bold">
							{t('docs.docsHeading')}
						</h2>
					</motion.div>

					<div className="grid grid-cols-1 border-t border-[var(--site-rule)] md:grid-cols-2 xl:grid-cols-3">
						{DOC_CATEGORIES.map((cat, catIdx) => (
							<motion.div
								key={cat.slug}
								initial="hidden"
								whileInView="visible"
								viewport={viewportOnce}
								variants={staggerUp(catIdx * 0.05)}
								className="border-b border-[var(--site-rule)] py-6 md:px-5 md:py-7 xl:px-7"
							>
								<div className="mb-5 flex items-baseline gap-2.5">
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
												className="group flex items-center justify-between gap-3 py-2 text-start text-[14px] text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)]"
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
