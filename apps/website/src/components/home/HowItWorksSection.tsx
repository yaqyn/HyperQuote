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
		<section className="py-24 max-md:py-16 px-6 max-w-7xl mx-auto">
			<h2 className="text-2xl font-semibold text-[var(--color-text)] text-center mb-16">
				{t('howItWorks.heading')}
			</h2>

			<div className="relative flex gap-8 items-start max-md:flex-col">
				{/* Connecting line (desktop only) */}
				<div className="hidden md:block absolute top-12 inset-x-0 mx-16 border-t border-dashed border-[var(--color-border)]" />

				{steps.map((step, i) => (
					<SectionReveal
						key={step.number}
						delay={i * 0.1}
						className="flex-1 text-center relative"
					>
						<span className="font-mono text-[48px] font-semibold text-[var(--color-primary)] mb-2 block">
							{step.number}
						</span>
						<step.icon
							size={32}
							className="text-[var(--color-text-muted)] mx-auto"
							aria-hidden="true"
						/>
						<h3 className="text-[20px] font-semibold text-[var(--color-text)] mt-3">
							{t(step.titleKey)}
						</h3>
						<p className="text-base text-[var(--color-text-muted)] mt-2">
							{t(step.descKey)}
						</p>
					</SectionReveal>
				))}
			</div>
		</section>
	)
}
