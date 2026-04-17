/**
 * KPICard -- Analytics KPI card with trend indicator.
 * Geist Mono 28px value, trend arrow with green/red color.
 * Formats: currency (EGP), percent, number.
 */
import { TrendingDown, TrendingUp } from 'lucide-react'

interface KPICardProps {
	label: string
	value: number
	trend: number
	locale: 'ar' | 'en'
	format?: 'currency' | 'percent' | 'number'
}

function formatKPIValue(
	value: number,
	locale: 'ar' | 'en',
	format?: 'currency' | 'percent' | 'number',
): string {
	const numLocale = locale === 'ar' ? 'ar-EG' : 'en-EG'
	const formatted = new Intl.NumberFormat(numLocale, {
		maximumFractionDigits: 1,
	}).format(value)

	if (format === 'currency') return `EGP ${formatted}`
	if (format === 'percent') return `${formatted}%`
	return formatted
}

export function KPICard({ label, value, trend, locale, format }: KPICardProps) {
	const TrendIcon = trend >= 0 ? TrendingUp : TrendingDown
	const trendColor = trend >= 0 ? 'text-green-600' : 'text-red-600'
	const numLocale = locale === 'ar' ? 'ar-EG' : 'en-EG'

	return (
		<div className="bg-[var(--color-surface)] rounded-xl p-5 min-w-[200px]">
			<p className="font-medium text-[13px] text-[var(--color-text-muted)] uppercase tracking-widest">
				{label}
			</p>
			<p className="font-mono font-semibold text-[28px] text-[var(--color-text)] mt-1">
				{formatKPIValue(value, locale, format)}
			</p>
			<div className={`flex items-center gap-1 mt-1 ${trendColor}`}>
				<TrendIcon size={14} />
				<span className="font-mono text-[13px]">
					{new Intl.NumberFormat(numLocale, {
						maximumFractionDigits: 1,
					}).format(Math.abs(trend))}
					%
				</span>
			</div>
		</div>
	)
}
