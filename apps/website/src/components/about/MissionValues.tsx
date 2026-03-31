import { useTranslation } from 'react-i18next'
import { SectionReveal } from '../shared/SectionReveal'

export function MissionValues() {
	const { t } = useTranslation('website')

	const values = [
		{ title: t('about.mission.value1.title'), description: t('about.mission.value1.description') },
		{ title: t('about.mission.value2.title'), description: t('about.mission.value2.description') },
		{ title: t('about.mission.value3.title'), description: t('about.mission.value3.description') },
	]

	return (
		<section className="py-24 max-md:py-16 px-6 max-w-7xl mx-auto bg-[var(--color-base-alt)]">
			<h2 className="text-2xl font-semibold text-[var(--color-text)] text-center mb-16">
				{t('about.mission.heading')}
			</h2>
			<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
				{values.map((value, i) => (
					<SectionReveal key={value.title} delay={i * 0.1}>
						<div className="bg-[var(--color-card)] rounded-xl p-8 shadow-sm text-center">
							<h3 className="font-semibold text-[20px] text-[var(--color-text)]">
								{value.title}
							</h3>
							<p className="text-base text-[var(--color-text-muted)] mt-2 leading-relaxed">
								{value.description}
							</p>
						</div>
					</SectionReveal>
				))}
			</div>
		</section>
	)
}
