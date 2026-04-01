import { useTranslation } from 'react-i18next'
import { SectionReveal } from '../shared/SectionReveal'

export function CompanyStory() {
	const { t } = useTranslation('website')

	return (
		<section className="py-28 max-md:py-20 px-6 lg:px-12 max-w-7xl mx-auto">
			<div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-12 lg:gap-20">
				{/* Left — label + heading */}
				<div>
					<SectionReveal>
						<p className="text-[13px] font-semibold uppercase tracking-[0.2em] text-[var(--color-primary)] mb-3">
							{t('about.story.label')}
						</p>
						<h2 className="text-[36px] lg:text-[44px] font-bold text-[var(--color-text)] leading-tight">
							{t('about.story.heading')}
						</h2>
					</SectionReveal>
				</div>

				{/* Right — paragraphs */}
				<div className="space-y-6">
					<SectionReveal>
						<p className="text-[17px] text-[var(--color-text-muted)] leading-[1.8]">
							{t('about.story.p1')}
						</p>
					</SectionReveal>
					<SectionReveal delay={0.08}>
						<p className="text-[17px] text-[var(--color-text-muted)] leading-[1.8]">
							{t('about.story.p2')}
						</p>
					</SectionReveal>
					<SectionReveal delay={0.16}>
						<p className="text-[17px] text-[var(--color-text-muted)] leading-[1.8]">
							{t('about.story.p3')}
						</p>
					</SectionReveal>
				</div>
			</div>
		</section>
	)
}
