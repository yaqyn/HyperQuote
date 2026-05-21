/**
 * RevenueChart -- Monthly revenue bar chart using Recharts.
 * Blue (#2563EB) bars, readable tabular sans axis labels, 300px height.
 * Only imported in analytics route for bundle isolation.
 */
import {
	Bar,
	BarChart,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from 'recharts'

interface RevenueChartProps {
	data: { month: string; revenue: number }[]
	locale: 'ar' | 'en'
}

const GEIST_MONO_TICK = {
	fontFamily: 'Inter, system-ui, sans-serif',
	fontSize: 12,
}

export function RevenueChart({ data, locale }: RevenueChartProps) {
	const numLocale = locale === 'ar' ? 'ar-EG' : 'en-EG'
	const formatter = new Intl.NumberFormat(numLocale, {
		notation: 'compact',
		maximumFractionDigits: 1,
	})

	const tooltipFormatter = new Intl.NumberFormat(numLocale, {
		maximumFractionDigits: 0,
	})

	return (
		<div className="rounded-xl border border-[var(--color-border)] p-4">
			<ResponsiveContainer width="100%" height={300}>
				<BarChart data={data}>
					<CartesianGrid strokeDasharray="3 3" opacity={0.1} />
					<XAxis
						dataKey="month"
						tick={{ ...GEIST_MONO_TICK, fill: 'var(--color-text-muted)' }}
					/>
					<YAxis
						tick={{ ...GEIST_MONO_TICK, fill: 'var(--color-text-muted)' }}
						tickFormatter={(v: number) => formatter.format(v)}
					/>
					<Tooltip
						cursor={{ fill: 'var(--color-surface)' }}
						formatter={(value) => [
							`EGP ${tooltipFormatter.format(Number(value ?? 0))}`,
						]}
						contentStyle={{
							fontFamily: 'Inter, system-ui, sans-serif',
							fontSize: 12,
							borderRadius: 8,
							border: '1px solid var(--color-border)',
							backgroundColor: 'var(--color-base)',
						}}
					/>
					<Bar dataKey="revenue" fill="#2563EB" radius={[4, 4, 0, 0]} />
				</BarChart>
			</ResponsiveContainer>
		</div>
	)
}
