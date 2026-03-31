import { useTranslation } from 'react-i18next'
import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { SectionReveal } from '../shared/SectionReveal'

const categories = [
	{ slug: 'cement', image: 'https://websiteassets.hyperquote.net/Images/cairo.webp' },
	{ slug: 'steel', image: 'https://websiteassets.hyperquote.net/Images/cairo.webp' },
	{ slug: 'aggregates', image: 'https://websiteassets.hyperquote.net/Images/cairo.webp' },
	{ slug: 'bricks', image: 'https://websiteassets.hyperquote.net/Images/cairo.webp' },
	{ slug: 'timber', image: 'https://websiteassets.hyperquote.net/Images/cairo.webp' },
	{ slug: 'finishing', image: 'https://websiteassets.hyperquote.net/Images/cairo.webp' },
] as const

export function MarketPreviewSection() {
	const { t } = useTranslation('website')

	return (
		<section className="py-28 max-md:py-20 px-6 lg:px-12 max-w-7xl mx-auto">
			<SectionReveal>
				<div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-16">
					<div>
						<p className="text-[13px] font-semibold uppercase tracking-[0.2em] text-[var(--color-primary)] mb-3">
							{t('marketPreview.label')}
						</p>
						<h2 className="text-[36px] lg:text-[44px] font-bold text-[var(--color-text)] leading-tight">
							{t('marketPreview.heading')}
						</h2>
					</div>
					<Link
						to="/market"
						className="inline-flex items-center gap-2 text-[15px] font-semibold text-[var(--color-primary)] hover:underline"
					>
						{t('marketPreview.viewAll')}
						<ArrowRight size={16} className="icon-end" aria-hidden="true" />
					</Link>
				</div>
			</SectionReveal>

			<div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
				{categories.map((cat, i) => (
					<SectionReveal key={cat.slug} delay={i * 0.06}>
						<Link
							to="/market"
							search={{ category: cat.slug }}
							className="relative aspect-[4/3] rounded-xl overflow-hidden group block"
						>
							<img
								src={cat.image}
								alt=""
								className="absolute inset-0 h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
							/>
							{/* Dark gradient */}
							<div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
							{/* Content */}
							<div className="absolute bottom-0 inset-x-0 p-5">
								<span className="text-white font-semibold text-[17px] block">
									{t(`marketPreview.categories.${cat.slug}`)}
								</span>
							</div>
							{/* Hover arrow */}
							<div className="absolute top-4 end-4 w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
								<ArrowRight size={14} className="text-white icon-end" />
							</div>
						</Link>
					</SectionReveal>
				))}
			</div>
		</section>
	)
}
