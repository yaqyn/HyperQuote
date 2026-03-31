import { useTranslation } from 'react-i18next'
import { SectionReveal } from '../shared/SectionReveal'

export function CompanyStory() {
	const { t } = useTranslation('website')

	return (
		<section className="py-24 max-md:py-16 px-6 max-w-[800px] mx-auto">
			<h2 className="text-2xl font-semibold text-[var(--color-text)] mb-8">
				{t('about.story.heading')}
			</h2>
			<SectionReveal>
				<p className="text-base text-[var(--color-text-muted)] leading-[1.75] mb-6">
					{t('about.story.p1')}
				</p>
			</SectionReveal>
			<SectionReveal delay={0.1}>
				<p className="text-base text-[var(--color-text-muted)] leading-[1.75] mb-6">
					{t('about.story.p2')}
				</p>
			</SectionReveal>
			<SectionReveal delay={0.2}>
				<p className="text-base text-[var(--color-text-muted)] leading-[1.75]">
					{t('about.story.p3')}
				</p>
			</SectionReveal>
		</section>
	)
}
