import { useTranslation } from 'react-i18next'
import {
	Bot,
	Clock,
	MapPin,
	FolderOpen,
	BadgePercent,
	MessageCircle,
} from 'lucide-react'
import { SectionReveal } from '../shared/SectionReveal'
import type { LucideIcon } from 'lucide-react'

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
		<section className="bg-[var(--color-base-alt)]">
			<div className="py-24 max-md:py-16 px-6 max-w-7xl mx-auto">
				<h2 className="text-2xl font-semibold text-[var(--color-text)] text-center mb-16">
					{t('valueProps.heading')}
				</h2>

				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
					{valueProps.map((prop, i) => (
						<SectionReveal key={prop.slug} delay={i * 0.1}>
							<div className="bg-[var(--color-card)] rounded-xl p-8 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
								<prop.icon
									size={32}
									className="text-[var(--color-primary)]"
									aria-hidden="true"
								/>
								<h3 className="text-[20px] font-semibold text-[var(--color-text)] mt-4">
									{t(`valueProps.${prop.slug}.title`)}
								</h3>
								<p className="text-base text-[var(--color-text-muted)] mt-2 leading-relaxed">
									{t(`valueProps.${prop.slug}.description`)}
								</p>
							</div>
						</SectionReveal>
					))}
				</div>
			</div>
		</section>
	)
}
