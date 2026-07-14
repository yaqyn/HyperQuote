import { ArrowDownRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { SectionReveal } from '../shared/SectionReveal'

const STEP_KEYS = ['step1', 'step2', 'step3', 'step4'] as const

export function HowItWorksSection() {
	const { t } = useTranslation('website')

	return (
		<section id="process" className="scroll-mt-[68px] bg-[#101010] text-white">
			<div className="hq-page-shell py-16 sm:py-20 lg:py-28">
				<SectionReveal>
					<div className="grid items-end gap-8 lg:grid-cols-[1fr_0.7fr] lg:gap-24">
						<div>
							<p className="hq-kicker mb-5 text-[#75a2ff]">
								{t('howItWorks.label')}
							</p>
							<h2 className="hq-display whitespace-pre-line text-[clamp(2.8rem,7vw,7rem)] font-bold leading-[0.94]">
								{t('howItWorks.heading')}
							</h2>
						</div>
						<p className="max-w-[500px] text-[15px] leading-7 text-white/50 sm:text-[16px] lg:justify-self-end">
							{t('hero.subheadline')}
						</p>
					</div>
				</SectionReveal>

				<SectionReveal className="mt-12 sm:mt-16 lg:mt-20">
					<figure className="overflow-hidden rounded-[24px] border border-white/10 bg-[#181818]">
						<div className="relative aspect-[4/3] overflow-hidden sm:aspect-[16/8] lg:aspect-[16/7]">
							<img
								src="/images/cairo-site-delivery.webp"
								alt={t('hero.imageAlt')}
								width={1672}
								height={941}
								loading="lazy"
								className="h-full w-full object-cover object-center saturate-[0.9]"
							/>
							<div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
							<figcaption className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-5 p-5 sm:p-7">
								<p className="max-w-[420px] text-[13px] leading-6 text-white/75">
									{t('howItWorks.step4.description')}
								</p>
								<span className="hidden items-center gap-2 font-mono text-[10px] text-white/55 sm:flex">
									{t('howItWorks.imageCaption')}
									<ArrowDownRight size={14} />
								</span>
							</figcaption>
						</div>
					</figure>
				</SectionReveal>

				<div className="mt-10 grid border-t border-white/12 sm:grid-cols-2 lg:mt-14 lg:grid-cols-4">
					{STEP_KEYS.map((key, index) => (
						<SectionReveal key={key} delay={index * 0.05}>
							<article className="min-h-full border-b border-white/12 py-7 sm:border-e sm:px-6 lg:border-b-0 lg:px-7 first:ps-0 last:border-e-0 last:pe-0">
								<span className="font-mono text-[11px] text-[#75a2ff]">
									{String(index + 1).padStart(2, '0')}
								</span>
								<h3 className="mt-6 text-[18px] font-semibold text-white">
									{t(`howItWorks.${key}.title`)}
								</h3>
								<p className="mt-3 text-[13px] leading-6 text-white/45">
									{t(`howItWorks.${key}.description`)}
								</p>
							</article>
						</SectionReveal>
					))}
				</div>
			</div>
		</section>
	)
}
