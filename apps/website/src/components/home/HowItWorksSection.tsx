import { useTranslation } from 'react-i18next'
import {
	ClipboardList,
	MessageSquare,
	Truck,
	CheckCircle,
} from 'lucide-react'
import { SectionReveal } from '../shared/SectionReveal'
import type { LucideIcon } from 'lucide-react'

interface Step {
	number: string
	icon: LucideIcon
	titleKey: string
	descKey: string
}

const steps: Step[] = [
	{
		number: '01',
		icon: ClipboardList,
		titleKey: 'howItWorks.step1.title',
		descKey: 'howItWorks.step1.description',
	},
	{
		number: '02',
		icon: MessageSquare,
		titleKey: 'howItWorks.step2.title',
		descKey: 'howItWorks.step2.description',
	},
	{
		number: '03',
		icon: Truck,
		titleKey: 'howItWorks.step3.title',
		descKey: 'howItWorks.step3.description',
	},
	{
		number: '04',
		icon: CheckCircle,
		titleKey: 'howItWorks.step4.title',
		descKey: 'howItWorks.step4.description',
	},
]

export function HowItWorksSection() {
	const { t } = useTranslation('website')

	return (
		<section className="py-28 max-md:py-20 px-6 lg:px-12 max-w-7xl mx-auto">
			<SectionReveal>
				<p className="text-[13px] font-semibold uppercase tracking-[0.2em] text-[var(--color-primary)] mb-3">
					{t('howItWorks.label')}
				</p>
				<h2 className="text-[36px] lg:text-[44px] font-bold text-[var(--color-text)] leading-tight max-w-[500px]">
					{t('howItWorks.heading')}
				</h2>
			</SectionReveal>

			<div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-0">
				{steps.map((step, i) => (
					<SectionReveal key={step.number} delay={i * 0.08}>
						<div className="relative p-8 group">
							{/* Top accent line */}
							<div className="absolute top-0 inset-x-8 h-px bg-[var(--color-border)]" />
							<div className="absolute top-0 start-8 w-12 h-px bg-[var(--color-primary)] group-hover:w-full group-hover:inset-x-8 transition-all duration-500" />

							<span className="font-mono text-[13px] font-semibold text-[var(--color-text-muted)] block mb-6">
								{step.number}
							</span>
							<step.icon
								size={24}
								className="text-[var(--color-primary)] mb-4"
								aria-hidden="true"
							/>
							<h3 className="text-[18px] font-semibold text-[var(--color-text)]">
								{t(step.titleKey)}
							</h3>
							<p className="text-[15px] text-[var(--color-text-muted)] mt-2 leading-relaxed">
								{t(step.descKey)}
							</p>
						</div>
					</SectionReveal>
				))}
			</div>
		</section>
	)
}
