import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { SectionReveal } from '../shared/SectionReveal'

export function CTASection() {
	const { t } = useTranslation('website')

	return (
		<section
			dir="ltr"
			className="bg-[#101010] px-5 py-20 sm:px-8 md:px-12 md:py-24 lg:px-24 lg:py-28 xl:px-32"
		>
			<SectionReveal>
				<div className="flex flex-col items-center gap-8 text-center lg:flex-row lg:items-center lg:justify-between lg:text-start">
					<div>
						<h2 className="text-[28px] lg:text-[36px] font-extrabold text-white tracking-normal leading-tight">
							{t('cta.readyToBuild')}
						</h2>
						<p className="mt-2 text-[15px] text-[#808080]">
							{t('cta.noCreditCard')}
						</p>
					</div>
					<Link
						to="/market"
						className="inline-flex items-center justify-center gap-2 text-[14px] font-semibold text-[#3B82F6] hover:text-white transition-colors shrink-0"
					>
						{t('cta.browseMarket')}
						<ArrowRight size={15} className="icon-end" aria-hidden="true" />
					</Link>
				</div>
			</SectionReveal>
		</section>
	)
}
