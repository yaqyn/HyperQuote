import { useTranslation } from 'react-i18next'
import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { SectionReveal } from '../shared/SectionReveal'

export function CTASection() {
	const { t } = useTranslation('website')

	return (
		<section className="relative py-28 max-md:py-20 px-6 lg:px-12 overflow-hidden bg-[var(--color-text)]">
			{/* Subtle grid */}
			<div
				className="absolute inset-0 opacity-[0.04]"
				style={{
					backgroundImage:
						'linear-gradient(var(--color-base) 1px, transparent 1px), linear-gradient(90deg, var(--color-base) 1px, transparent 1px)',
					backgroundSize: '60px 60px',
				}}
			/>

			<SectionReveal>
				<div className="relative z-10 max-w-3xl mx-auto text-center">
					<h2 className="text-[40px] lg:text-[56px] font-bold text-[var(--color-base)] leading-[1.1]">
						{t('cta.readyToBuild')}
					</h2>

					<p className="text-[16px] text-[var(--color-base)]/60 mt-4 max-w-[400px] mx-auto">
						{t('cta.noCreditCard')}
					</p>

					<div className="mt-8 flex justify-center gap-4 max-sm:flex-col max-sm:items-center">
						<Link
							to="/portal"
							className="inline-flex items-center justify-center gap-2 bg-[var(--color-primary)] text-white font-semibold text-[16px] h-13 px-7 rounded-xl hover:bg-[var(--color-primary-hover)] transition-colors"
						>
							{t('cta.getStartedFree')}
							<ArrowRight size={18} className="icon-end" />
						</Link>
					</div>
				</div>
			</SectionReveal>
		</section>
	)
}
