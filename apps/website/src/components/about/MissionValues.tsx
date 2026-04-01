import { useTranslation } from 'react-i18next'
import { SectionReveal } from '../shared/SectionReveal'
import { Clock, Eye, Shield } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const values: { key: string; icon: LucideIcon }[] = [
	{ key: 'value1', icon: Clock },
	{ key: 'value2', icon: Eye },
	{ key: 'value3', icon: Shield },
]

export function MissionValues() {
	const { t } = useTranslation('website')

	return (
		<section className="py-28 max-md:py-20 bg-[#111113]">
			<div className="px-6 lg:px-12 max-w-7xl mx-auto">
				<SectionReveal>
					<p className="text-[13px] font-semibold uppercase tracking-[0.2em] text-[#3B82F6] mb-3">
						{t('about.mission.label')}
					</p>
					<h2 className="text-[36px] lg:text-[44px] font-bold text-white leading-tight max-w-[500px] mb-16">
						{t('about.mission.heading')}
					</h2>
				</SectionReveal>

				<div className="grid grid-cols-1 md:grid-cols-3 gap-5">
					{values.map((v, i) => (
						<SectionReveal key={v.key} delay={i * 0.08}>
							<div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 hover:bg-white/[0.06] transition-colors group">
								<div className="w-12 h-12 rounded-xl bg-[#2563EB]/10 flex items-center justify-center mb-6 group-hover:bg-[#2563EB]/20 transition-colors">
									<v.icon
										size={22}
										className="text-[#3B82F6]"
										aria-hidden="true"
									/>
								</div>
								<h3 className="text-[20px] font-bold text-white mb-3">
									{t(`about.mission.${v.key}.title`)}
								</h3>
								<p className="text-[15px] text-white/50 leading-relaxed">
									{t(`about.mission.${v.key}.description`)}
								</p>
							</div>
						</SectionReveal>
					))}
				</div>
			</div>
		</section>
	)
}
