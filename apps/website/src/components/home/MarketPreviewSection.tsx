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
					<div className="mb-10 grid items-end gap-6 sm:mb-12 lg:grid-cols-[1fr_auto]">
						<div>
							<p className="hq-kicker mb-4 text-[var(--color-primary)]">
								{t('marketPreview.label')}
							</p>
							<h2 className="hq-display text-[clamp(2.8rem,7vw,6.5rem)] font-bold leading-[0.94] text-[var(--color-text)]">
								{t('marketPreview.heading')}
							</h2>
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
									className="group grid gap-5 border-b border-[var(--site-rule)] py-6 transition-colors hover:bg-[var(--site-blue-wash)] sm:grid-cols-[minmax(0,1fr)_minmax(220px,0.65fr)_112px] sm:items-center sm:px-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)_152px] lg:py-7"
								>
									<h3 className="hq-display text-[clamp(2rem,4.5vw,4.8rem)] font-bold leading-none text-[var(--color-text)] transition-colors group-hover:text-[var(--color-primary)]">
										{copy.name}
									</h3>
									<p className="max-w-[480px] text-[13px] leading-6 text-[var(--color-text-muted)]">
										{copy.description}
									</p>
									<div className="flex items-center justify-between gap-4 sm:justify-end">
										<CategorySample
											imageUrl={category.imageUrl}
											index={index}
										/>
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

function CategorySample({
	imageUrl,
	index,
}: {
	imageUrl: string | null
	index: number
}) {
	if (imageUrl) {
		return (
			<div className="h-16 w-24 overflow-hidden rounded-lg bg-[var(--site-concrete)] lg:h-20 lg:w-32">
				<img
					src={imageUrl}
					alt=""
					width={256}
					height={160}
					loading="lazy"
					className="h-full w-full object-cover grayscale transition duration-500 group-hover:grayscale-0"
				/>
			</div>
		)
	}

	return (
		<div className="relative h-16 w-24 overflow-hidden rounded-lg border border-[var(--site-rule)] bg-[var(--site-concrete)] lg:h-20 lg:w-32">
			<div
				className="absolute inset-x-3 top-3 h-2 rounded-full bg-[var(--color-primary)]/70"
				style={{ transform: `translateX(${(index % 3) * 4}px)` }}
			/>
			<div className="absolute inset-x-3 top-7 h-px bg-[var(--site-steel)]/35" />
			<div className="absolute inset-x-3 top-10 h-px bg-[var(--site-steel)]/35" />
			<div className="absolute inset-x-3 top-13 h-px bg-[var(--site-steel)]/35" />
		</div>
	)
}
