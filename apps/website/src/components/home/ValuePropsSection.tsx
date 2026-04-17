import type { ParseKeys } from 'i18next'
import type { LucideIcon } from 'lucide-react'
import {
	BadgePercent,
	Bot,
	Clock,
	FolderOpen,
	MapPin,
	MessageCircle,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { SectionReveal } from '../shared/SectionReveal'

interface ValueProp {
	slug: string
	icon: LucideIcon
}

const valueProps: ValueProp[] = [
	{ slug: 'aiOrdering', icon: Bot },
	{ slug: 'fastQuotes', icon: Clock },
	{ slug: 'tracking', icon: MapPin },
	{ slug: 'projects', icon: FolderOpen },
	{ slug: 'pricing', icon: BadgePercent },
	{ slug: 'whatsapp', icon: MessageCircle },
]

export function ValuePropsSection() {
	const { t } = useTranslation('website')

	return (
		<section className="py-28 max-md:py-20 bg-[var(--color-surface)]">
			<div className="px-6 lg:px-12 max-w-7xl mx-auto">
				<SectionReveal>
					<div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-16">
						<div>
							<p className="text-[13px] font-semibold uppercase tracking-[0.2em] text-[var(--color-primary)] mb-3">
								{t('valueProps.label')}
							</p>
							<h2 className="text-[36px] lg:text-[44px] font-bold text-[var(--color-text)] leading-tight max-w-[500px]">
								{t('valueProps.heading')}
							</h2>
						</div>
						<p className="text-[16px] text-[var(--color-text-muted)] max-w-[400px] leading-relaxed">
							{t('valueProps.subtitle')}
						</p>
					</div>
				</SectionReveal>

				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{valueProps.map((prop, i) => (
						<SectionReveal key={prop.slug} delay={i * 0.06}>
							<div className="bg-[var(--color-card)] rounded-xl p-7 border border-[var(--color-border)] hover:border-[var(--color-primary)] hover:shadow-md transition-all duration-200 group">
								<div className="w-10 h-10 rounded-lg bg-[var(--color-subtle)] flex items-center justify-center mb-5 group-hover:bg-[var(--color-primary)] group-hover:text-white transition-colors duration-200">
									<prop.icon
										size={20}
										className="text-[var(--color-primary)] group-hover:text-white transition-colors duration-200"
										aria-hidden="true"
									/>
								</div>
								<h3 className="text-[17px] font-semibold text-[var(--color-text)]">
									{t(`valueProps.${prop.slug}.title` as ParseKeys<'website'>)}
								</h3>
								<p className="text-[15px] text-[var(--color-text-muted)] mt-2 leading-relaxed">
									{t(
										`valueProps.${prop.slug}.description` as ParseKeys<'website'>,
									)}
								</p>
							</div>
						</SectionReveal>
					))}
				</div>
			</div>
		</section>
	)
}
