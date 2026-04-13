import { useTranslation } from 'react-i18next'
import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { SectionReveal } from '../shared/SectionReveal'

const categories = [
	{ slug: 'cement', image: 'https://websiteassets.hyperquote.net/Images/cement.webp' },
	{ slug: 'steel', image: 'https://websiteassets.hyperquote.net/Images/steel.webp' },
	{ slug: 'aggregates', image: 'https://websiteassets.hyperquote.net/Images/Aggregates.webp' },
	{ slug: 'bricks', image: 'https://websiteassets.hyperquote.net/Images/bricks.webp' },
	{ slug: 'timber', image: 'https://websiteassets.hyperquote.net/Images/wood.webp' },
	{ slug: 'finishing', image: 'https://websiteassets.hyperquote.net/Images/finish.webp' },
] as const

export function MarketPreviewSection() {
	const { t } = useTranslation('website')

	return (
		<section className="py-28 max-md:py-20 px-8 sm:px-12 md:px-16 lg:px-24 xl:px-32">
			<SectionReveal>
				<div className="flex items-end justify-between mb-14">
					<h2 className="text-[28px] lg:text-[36px] font-extrabold text-[var(--color-text)] tracking-[-0.02em] leading-tight">
						{t('marketPreview.heading')}
					</h2>
					<Link
						to="/market"
						className="hidden sm:inline-flex items-center gap-2 text-[13px] font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
					>
						{t('marketPreview.viewAll')}
						<ArrowRight size={14} className="icon-end" aria-hidden="true" />
					</Link>
				</div>
			</SectionReveal>

			{/* 3-col grid on desktop, 2-col tablet, 1-col mobile */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-10">
				{categories.map((cat, i) => (
					<SectionReveal key={cat.slug} delay={i * 0.06}>
						<Link
							to="/market"
							search={{ category: cat.slug }}
							className="group block"
						>
							{/* Image — clean, no overlay */}
							<div className="aspect-[4/3] rounded-xl overflow-hidden bg-[var(--color-surface)]">
								<img
									src={cat.image}
									alt=""
									width={600}
									height={450}
									className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
								/>
							</div>

							{/* Title + arrow beneath */}
							<div className="mt-4 flex items-center justify-between">
								<span className="text-[16px] font-semibold text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition-colors">
									{t(`marketPreview.categories.${cat.slug}`)}
								</span>
								<ArrowRight
									size={16}
									className="text-[var(--color-text-subtle)] group-hover:text-[var(--color-primary)] group-hover:translate-x-1 transition-all duration-200 icon-end"
								/>
							</div>
						</Link>
					</SectionReveal>
				))}
			</div>

			{/* Mobile View All */}
			<div className="mt-10 sm:hidden text-center">
				<Link
					to="/market"
					className="inline-flex items-center gap-2 text-[14px] font-medium text-[var(--color-primary)] hover:opacity-70 transition-opacity"
				>
					{t('marketPreview.viewAll')}
					<ArrowRight size={14} className="icon-end" />
				</Link>
			</div>
		</section>
	)
}
