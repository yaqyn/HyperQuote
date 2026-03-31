import { useTranslation } from 'react-i18next'
import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { SectionReveal } from '../shared/SectionReveal'

const categories = [
	{ slug: 'cement', color: '#6B7280' },
	{ slug: 'steel', color: '#4B5563' },
	{ slug: 'aggregates', color: '#78716C' },
	{ slug: 'bricks', color: '#92400E' },
	{ slug: 'timber', color: '#854D0E' },
	{ slug: 'finishing', color: '#475569' },
] as const

export function MarketPreviewSection() {
	const { t } = useTranslation('website')

	return (
		<section className="py-24 max-md:py-16 px-6 max-w-7xl mx-auto">
			<h2 className="text-2xl font-semibold text-[var(--color-text)] text-center mb-16">
				{t('marketPreview.heading')}
			</h2>

			<div className="grid grid-cols-2 md:grid-cols-3 gap-4">
				{categories.map((cat, i) => (
					<SectionReveal key={cat.slug} delay={i * 0.1}>
						<Link
							to="/market"
							search={{ category: cat.slug }}
							className="relative aspect-[4/3] rounded-xl overflow-hidden group cursor-pointer block"
						>
							{/* Background placeholder */}
							<div
								className="absolute inset-0 group-hover:scale-[1.03] transition-transform duration-300"
								style={{ backgroundColor: cat.color }}
							/>

							{/* Dark gradient overlay */}
							<div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

							{/* Content */}
							<div className="absolute bottom-0 inset-x-0 p-4">
								<span className="text-white font-semibold text-base block">
									{t(`marketPreview.categories.${cat.slug}`)}
								</span>
								<span className="font-mono text-xs text-white/70 [direction:ltr] [unicode-bidi:embed]">
									{t(`marketPreview.categories.${cat.slug}`)}
								</span>
							</div>
						</Link>
					</SectionReveal>
				))}
			</div>

			<div className="mt-8 text-center">
				<Link
					to="/market"
					className="inline-flex items-center gap-1 text-sm font-medium text-[var(--color-primary)] hover:underline"
				>
					{t('marketPreview.viewAll')}
					<ArrowRight size={16} className="icon-end" aria-hidden="true" />
				</Link>
			</div>
		</section>
	)
}
