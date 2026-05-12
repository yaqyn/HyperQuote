import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { SectionReveal } from '../shared/SectionReveal'

const categories = [
	{
		slug: 'cement',
		image: 'https://websiteassets.hyperquote.net/Images/cement.webp',
	},
	{
		slug: 'steel',
		image: 'https://websiteassets.hyperquote.net/Images/steel.webp',
	},
	{
		slug: 'aggregates',
		image: 'https://websiteassets.hyperquote.net/Images/Aggregates.webp',
	},
	{
		slug: 'bricks',
		image: 'https://websiteassets.hyperquote.net/Images/bricks.webp',
	},
	{
		slug: 'timber',
		image: 'https://websiteassets.hyperquote.net/Images/wood.webp',
	},
	{
		slug: 'finishing',
		image: 'https://websiteassets.hyperquote.net/Images/finish.webp',
	},
] as const

export function MarketPreviewSection() {
	const { t } = useTranslation('website')

	return (
		<section className="px-5 py-20 sm:px-8 md:px-12 md:py-24 lg:px-24 lg:py-28 xl:px-32">
			<SectionReveal>
				<div className="mb-10 flex flex-col items-center justify-between gap-4 text-center sm:mb-12 lg:mb-14 lg:flex-row lg:items-end lg:text-start">
					<h2 className="text-[28px] lg:text-[36px] font-extrabold text-[var(--color-text)] tracking-normal leading-tight">
						{t('marketPreview.heading')}
					</h2>
					<Link
						to="/market"
						className="inline-flex items-center gap-2 text-[13px] font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
					>
						{t('marketPreview.viewAll')}
						<ArrowRight size={14} className="icon-end" aria-hidden="true" />
					</Link>
				</div>
			</SectionReveal>

			{/* 3-col grid on desktop, 2-col tablet, 1-col mobile */}
			<div className="grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-6 lg:gap-y-10">
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
							<div className="mt-4 flex items-center justify-center gap-3 text-center lg:justify-between lg:text-start">
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
		</section>
	)
}
