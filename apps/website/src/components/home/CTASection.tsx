import { useTranslation } from 'react-i18next'
import { Link } from '@tanstack/react-router'
import { SectionReveal } from '../shared/SectionReveal'

export function CTASection() {
	const { t } = useTranslation('website')

	return (
		<section className="bg-[#101010] py-28 max-md:py-20 px-8 sm:px-12 md:px-16 lg:px-24 xl:px-32">
			<SectionReveal>
				<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
					<div>
						<h2 className="text-[28px] lg:text-[36px] font-extrabold text-white tracking-[-0.02em] leading-tight">
							{t('cta.readyToBuild')}
						</h2>
						<p className="mt-2 text-[15px] text-[#808080]">
							{t('cta.noCreditCard')}
						</p>
					</div>
					<Link
						to="/market"
						className="inline-flex items-center justify-center text-[14px] font-semibold text-[#3B82F6] hover:text-white transition-colors shrink-0"
					>
						{t('cta.browseMarket')} →
					</Link>
				</div>
			</SectionReveal>
		</section>
	)
}
