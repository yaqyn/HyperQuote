import { useTranslation } from 'react-i18next'
import { SectionReveal } from '../shared/SectionReveal'

const team = [
	{ name: 'Ahmed Hassan', title: 'CEO & Founder', initials: 'AH' },
	{ name: 'Sarah El-Masry', title: 'CTO', initials: 'SM' },
	{ name: 'Omar Khalil', title: 'Head of Operations', initials: 'OK' },
	{ name: 'Nour Abdel-Rahman', title: 'Head of Product', initials: 'NA' },
]

export function TeamGrid() {
	const { t } = useTranslation('website')

	return (
		<section className="py-24 max-md:py-16 px-6 max-w-7xl mx-auto">
			<h2 className="text-2xl font-semibold text-[var(--color-text)] text-center mb-16">
				{t('about.team.heading')}
			</h2>
			<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
				{team.map((member, i) => (
					<SectionReveal key={member.name} delay={i * 0.1}>
						<div className="flex flex-col items-center">
							<div
								className="w-20 h-20 rounded-full bg-[var(--color-primary)] flex items-center justify-center mx-auto mb-4"
								aria-hidden="true"
							>
								<span className="text-2xl font-semibold text-white">
									{member.initials}
								</span>
							</div>
							<p className="font-semibold text-base text-[var(--color-text)] text-center">
								{member.name}
							</p>
							<p className="text-sm text-[var(--color-text-muted)] text-center mt-1">
								{member.title}
							</p>
						</div>
					</SectionReveal>
				))}
			</div>
		</section>
	)
}
