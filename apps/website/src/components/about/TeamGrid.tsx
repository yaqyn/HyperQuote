import { useTranslation } from 'react-i18next'
import { SectionReveal } from '../shared/SectionReveal'

const MEMBER_KEYS = ['member1', 'member2', 'member3', 'member4'] as const

export function TeamGrid() {
	const { t } = useTranslation('website')

	return (
		<section className="py-28 max-md:py-20 px-6 lg:px-12 max-w-7xl mx-auto">
			<SectionReveal>
				<p className="text-[13px] font-semibold uppercase tracking-[0.2em] text-[var(--color-primary)] mb-3">
					{t('about.team.label')}
				</p>
				<h2 className="text-[36px] lg:text-[44px] font-bold text-[var(--color-text)] leading-tight mb-16">
					{t('about.team.heading')}
				</h2>
			</SectionReveal>

			<div className="grid grid-cols-2 md:grid-cols-4 gap-8">
				{MEMBER_KEYS.map((key, i) => {
					const name = t(`about.team.${key}.name`)
					const initials = name.split(' ').map((w: string) => w[0]).join('')
					return (
						<SectionReveal key={key} delay={i * 0.08}>
							<div className="group">
								<div className="w-full aspect-square rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center mb-5 group-hover:border-[var(--color-primary)] transition-colors">
									<span className="text-[32px] font-bold text-[var(--color-text-muted)] group-hover:text-[var(--color-primary)] transition-colors">
										{initials}
									</span>
								</div>
								<p className="font-semibold text-[16px] text-[var(--color-text)]">
									{name}
								</p>
								<p className="text-[14px] text-[var(--color-text-muted)] mt-1">
									{t(`about.team.${key}.role`)}
								</p>
							</div>
						</SectionReveal>
					)
				})}
			</div>
		</section>
	)
}
