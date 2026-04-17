import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { getCustomer360 } from '../../../lib/server/sales-customers'
import { Button } from '../../ui'

interface ProjectsTabProps {
	customerId: string
	enabled: boolean
}

const STAGE_COLORS: Record<string, string> = {
	planning: '#2563EB',
	foundation: '#eab308',
	structure: '#22c55e',
	finishing: 'var(--color-text-muted)',
}

const CROSS_SELL_SUGGESTIONS = [
	{
		product: 'Waterproofing Membrane',
		reason: 'Required for foundation phase',
		confidence: 85,
	},
	{
		product: 'Structural Steel Beams',
		reason: 'Upcoming structure phase',
		confidence: 72,
	},
	{
		product: 'Ready-Mix Concrete C35',
		reason: 'High demand for this project type',
		confidence: 90,
	},
]

export function ProjectsTab({ customerId, enabled }: ProjectsTabProps) {
	const { t } = useTranslation('internal')

	const { data, isLoading } = useQuery({
		queryKey: ['customer-360', 'projects', customerId],
		queryFn: () => getCustomer360({ data: { customerId } }),
		staleTime: 120_000,
		enabled,
		select: (d) => d.projects,
	})

	if (!enabled) return null
	if (isLoading) return <TabSkeleton />
	if (!data || data.length === 0) {
		return (
			<div className="flex items-center justify-center h-48 text-[13px] text-black/30 dark:text-white/30">
				{t('sales.customer360.projects.noProjects')}
			</div>
		)
	}

	return (
		<div className="p-6 space-y-8">
			{/* Timeline-style vertical list */}
			<div className="relative">
				{/* Vertical timeline line */}
				<div className="absolute start-[7px] top-2 bottom-2 w-px bg-black/[0.06] dark:bg-white/[0.06]" />

				<div className="space-y-6">
					{data.map((project) => {
						const stageColor =
							STAGE_COLORS[project.stage] ?? STAGE_COLORS.planning

						return (
							<div
								key={project.id}
								className="relative flex items-start gap-4 ps-6"
							>
								{/* Timeline dot */}
								<div
									className="absolute start-0 top-1 w-[15px] h-[15px] rounded-full border-2 bg-white dark:bg-[var(--color-bg)]"
									style={{ borderColor: stageColor }}
								/>

								<div className="flex-1 min-w-0">
									{/* Name + stage pill */}
									<div className="flex items-center gap-3 mb-2">
										<h4 className="text-[13px] font-semibold text-[var(--color-text)] dark:text-white">
											{project.name}
										</h4>
										<span
											className="text-[10px] px-2 py-0.5 rounded-full font-medium capitalize"
											style={{
												color: stageColor,
												backgroundColor: `color-mix(in srgb, ${stageColor} 10%, transparent)`,
											}}
										>
											{project.stage}
										</span>
									</div>

									{/* Materials as tiny tags */}
									<div className="flex flex-wrap gap-1">
										{project.materialRequirements.map((mat) => (
											<span
												key={mat}
												className="text-[10px] px-1.5 py-0.5 rounded bg-black/[0.03] dark:bg-white/[0.05] text-black/40 dark:text-white/40"
											>
												{mat.replace(/_/g, ' ')}
											</span>
										))}
									</div>
								</div>
							</div>
						)
					})}
				</div>
			</div>

			{/* Cross-sell suggestions */}
			<div>
				<p className="text-[11px] text-black/35 dark:text-white/35 mb-3 uppercase tracking-wider font-medium">
					{t('sales.customer360.projects.crossSellTitle')}
				</p>
				<div className="space-y-2">
					{CROSS_SELL_SUGGESTIONS.map((suggestion) => (
						<div
							key={suggestion.product}
							className="flex items-center gap-4 py-2.5 px-3 rounded-lg hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
						>
							<div className="flex-1 min-w-0">
								<p className="text-[13px] font-medium text-[var(--color-text)] dark:text-white">
									{suggestion.product}
								</p>
								<p className="text-[11px] text-black/40 dark:text-white/40 mt-0.5">
									{suggestion.reason}
								</p>
							</div>
							<span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[12px] text-[#2563EB] font-medium shrink-0">
								{suggestion.confidence}%
							</span>
							<Button
								variant="subtle"
								onPress={() => {
									// TODO: Add product to new quote draft
								}}
							>
								{t('sales.customer360.projects.addToQuote')}
							</Button>
						</div>
					))}
				</div>
			</div>
		</div>
	)
}

function TabSkeleton() {
	return (
		<div className="p-6 space-y-6 animate-pulse">
			{Array.from({ length: 3 }, (_, i) => `skeleton-${i}`).map((key) => (
				<div key={key} className="flex gap-4 ps-6">
					<div className="w-3 h-3 rounded-full bg-black/[0.03] dark:bg-white/[0.03]" />
					<div className="flex-1 space-y-2">
						<div className="h-4 w-40 rounded bg-black/[0.03] dark:bg-white/[0.03]" />
						<div className="h-3 w-60 rounded bg-black/[0.03] dark:bg-white/[0.03]" />
					</div>
				</div>
			))}
		</div>
	)
}
