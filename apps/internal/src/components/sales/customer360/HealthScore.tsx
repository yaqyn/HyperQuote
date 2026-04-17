import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'

interface HealthScoreProps {
	score: number
	factors?: {
		paymentHistory: number
		orderFrequency: number
		revenueTrend: number
		relationshipDepth: number
		quoteWinRate: number
		recentActivity: number
	}
}

function getScoreColor(score: number): string {
	if (score > 70) return '#22c55e'
	if (score >= 40) return '#eab308'
	return '#ef4444'
}

function getScoreLabel(score: number, t: TFunction<'internal'>): string {
	if (score > 70) return t('sales.customer360.health.good')
	if (score >= 40) return t('sales.customer360.health.fair')
	return t('sales.customer360.health.poor')
}

const DEFAULT_FACTORS = {
	paymentHistory: 85,
	orderFrequency: 70,
	revenueTrend: 78,
	relationshipDepth: 90,
	quoteWinRate: 65,
	recentActivity: 80,
}

const FACTOR_KEYS = [
	'paymentHistory',
	'orderFrequency',
	'revenueTrend',
	'relationshipDepth',
	'quoteWinRate',
	'recentActivity',
] as const

export function HealthScore({
	score,
	factors = DEFAULT_FACTORS,
}: HealthScoreProps) {
	const { t } = useTranslation('internal')
	const color = getScoreColor(score)
	const label = getScoreLabel(score, t)

	return (
		<div className="space-y-4">
			{/* Main score */}
			<div className="flex items-center gap-4">
				<span
					className="text-3xl font-bold font-[family-name:var(--font-geist-mono)]"
					style={{ color }}
				>
					{score}
				</span>
				<div className="flex-1">
					<div className="flex items-center justify-between mb-1">
						<span className="text-sm font-medium text-black/70 dark:text-white/70">
							{t('sales.customer360.health.title')}
						</span>
						<span className="text-xs font-medium" style={{ color }}>
							{label}
						</span>
					</div>
					<div className="h-2.5 w-full rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
						<div
							className="h-full rounded-full transition-all duration-500"
							style={{ width: `${score}%`, backgroundColor: color }}
						/>
					</div>
				</div>
			</div>

			{/* Factor breakdown */}
			<div className="grid grid-cols-2 gap-x-6 gap-y-2">
				{FACTOR_KEYS.map((key) => {
					const value = factors[key]
					const factorColor = getScoreColor(value)
					return (
						<div key={key} className="space-y-1">
							<div className="flex items-center justify-between">
								<span className="text-xs text-black/50 dark:text-white/50">
									{t(`sales.customer360.health.factors.${key}`)}
								</span>
								<span
									className="text-xs font-[family-name:var(--font-geist-mono)]"
									style={{ color: factorColor }}
								>
									{value}
								</span>
							</div>
							<div className="h-1 w-full rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
								<div
									className="h-full rounded-full transition-all duration-300"
									style={{ width: `${value}%`, backgroundColor: factorColor }}
								/>
							</div>
						</div>
					)
				})}
			</div>
		</div>
	)
}
