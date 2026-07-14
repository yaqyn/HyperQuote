import { Link } from '@tanstack/react-router'
import { ArrowUpRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { SectionReveal } from '../shared/SectionReveal'

export function CTASection() {
	const { t } = useTranslation('website')

	return (
		<section className="bg-[var(--color-primary)] text-white">
			<div className="hq-page-shell py-14 sm:py-16 lg:py-20">
				<SectionReveal>
					<div className="grid items-end gap-9 lg:grid-cols-[1fr_auto] lg:gap-20">
						<div className="max-w-[920px]">
							<p className="hq-kicker mb-5 text-white/65">{t('cta.status')}</p>
							<h2 className="hq-display text-[clamp(2.7rem,7vw,6.6rem)] font-bold leading-[0.94] text-white">
								{t('cta.readyToBuild')}
							</h2>
							<p className="mt-5 text-[14px] text-white/70 sm:text-[15px]">
								{t('cta.noCreditCard')}
							</p>
						</div>
						<Link
							to="/market"
							className="group inline-flex h-14 w-full items-center justify-between rounded-xl bg-white px-5 text-[14px] font-semibold text-[#101010] transition-transform hover:-translate-y-0.5 sm:w-[240px]"
						>
							{t('cta.browseMarket')}
							<ArrowUpRight
								size={18}
								className="icon-end transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
							/>
						</Link>
					</div>
				</SectionReveal>
			</div>
		</section>
	)
}
