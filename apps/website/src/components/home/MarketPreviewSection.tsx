import { Link } from '@tanstack/react-router'
import { ArrowUpRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { PublicMarketPreviewCategory } from '../../lib/catalog'
import { SectionReveal } from '../shared/SectionReveal'

function categoryCopy(
	category: PublicMarketPreviewCategory,
	locale: 'ar' | 'en',
) {
	return {
		description:
			locale === 'ar' && category.description_ar
				? category.description_ar
				: category.description,
		name:
			locale === 'ar' && category.name_ar ? category.name_ar : category.name,
	}
}

export function MarketPreviewSection({
	categories,
}: {
	categories: PublicMarketPreviewCategory[]
}) {
	const { t, i18n } = useTranslation('website')
	const locale = i18n.language === 'ar' ? 'ar' : 'en'

	if (categories.length === 0) return null

	return (
		<section className="bg-[var(--color-base)] py-16 sm:py-20 lg:py-28">
			<div className="hq-page-shell">
				<SectionReveal>
					<div className="mb-10 grid items-end gap-6 sm:mb-12 lg:grid-cols-[minmax(0,1fr)_minmax(240px,280px)_auto] lg:gap-8">
						<div>
							<p className="hq-kicker mb-4 text-[var(--color-primary)]">
								{t('marketPreview.label')}
							</p>
							<h2 className="hq-display hq-title-section font-bold text-[var(--color-text)]">
								{t('marketPreview.heading')}
							</h2>
						</div>
						<div
							aria-hidden="true"
							className="relative hidden h-[148px] lg:block"
						>
							<img
								src="/images/material-specimens.png"
								alt=""
								width={768}
								height={512}
								loading="lazy"
								decoding="async"
								className="absolute inset-x-0 -bottom-3 h-[184px] w-full object-contain object-bottom drop-shadow-[0_18px_24px_rgba(15,23,42,0.14)] dark:brightness-[0.82] dark:saturate-[0.82] dark:drop-shadow-[0_20px_28px_rgba(0,0,0,0.42)]"
							/>
						</div>
						<Link
							to="/market"
							className="group inline-flex items-center gap-2 text-[13px] font-semibold text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-primary)]"
						>
							{t('marketPreview.viewAll')}
							<ArrowUpRight
								size={15}
								className="icon-end transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
							/>
						</Link>
					</div>
				</SectionReveal>

				<div className="border-t border-[var(--site-rule)]">
					{categories.map((category, index) => {
						const copy = categoryCopy(category, locale)
						return (
							<SectionReveal key={category.slug} delay={index * 0.04}>
								<Link
									to="/market"
									search={{ category: category.slug }}
									className="group grid gap-4 border-b border-[var(--site-rule)] py-6 transition-colors hover:bg-[var(--site-blue-wash)] sm:grid-cols-[minmax(0,1fr)_minmax(240px,0.7fr)_auto] sm:items-center sm:px-5 lg:py-7"
								>
									<h3 className="hq-display hq-title-record font-bold text-[var(--color-text)] transition-colors group-hover:text-[var(--color-primary)]">
										{copy.name}
									</h3>
									<p className="max-w-[480px] text-[13px] leading-6 text-[var(--color-text-muted)]">
										{copy.description}
									</p>
									<div className="flex items-center justify-end">
										<ArrowUpRight
											size={18}
											className="icon-end shrink-0 text-[var(--color-text-subtle)] transition-all group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-[var(--color-primary)]"
										/>
									</div>
								</Link>
							</SectionReveal>
						)
					})}
				</div>
			</div>
		</section>
	)
}
