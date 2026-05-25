/**
 * Analytics route -- /supplier/analytics
 * Single view (no tabs) with date range picker, 4 KPI cards,
 * monthly revenue chart, and product performance table.
 */

import { EmptyState } from '@hyperquote/ui/feedback/EmptyState'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { BarChart3 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { KPICard } from '../../components/supplier/KPICard'
import { ProductPerformanceTable } from '../../components/supplier/ProductPerformanceTable'
import { RevenueChart } from '../../components/supplier/RevenueChart'
import { FloatingAIButton } from '../../components/windows/FloatingAIButton'
import { WindowShell } from '../../components/windows/WindowShell'
import { portalHead } from '../../lib/page-meta'
import { getSupplierAnalytics } from '../../lib/server/supplier-analytics'

export const Route = createFileRoute('/_portal/supplier/analytics')({
	head: () =>
		portalHead({
			title: 'Supplier Analytics — HyperQuote Portal',
			description:
				'Private supplier analytics for revenue, order volume, and product performance in HyperQuote.',
			path: '/supplier/analytics',
		}),
	component: AnalyticsPage,
})

const PERIOD_OPTIONS = [
	{ value: '30d', label: 'Last 30 days' },
	{ value: '90d', label: 'Last 90 days' },
	{ value: '12m', label: 'Last 12 months' },
]

function AnalyticsPage() {
	const { t, i18n } = useTranslation('portal')
	const locale = (i18n.language?.startsWith('ar') ? 'ar' : 'en') as 'ar' | 'en'
	const [period, setPeriod] = useState('12m')

	const { data: analytics, isLoading } = useQuery({
		queryKey: ['supplier-analytics', period],
		queryFn: () => getSupplierAnalytics({ data: { period } }),
	})

	return (
		<WindowShell title={t('supplier.analyticsTitle')}>
			<div className="p-6 space-y-6">
				{/* Date range picker */}
				<div className="flex justify-end">
					<select
						value={period}
						onChange={(e) => setPeriod(e.target.value)}
						className="h-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
					>
						{PERIOD_OPTIONS.map((opt) => (
							<option key={opt.value} value={opt.value}>
								{opt.label}
							</option>
						))}
					</select>
				</div>

				{/* Loading state */}
				{isLoading && (
					<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
						{[1, 2, 3, 4].map((i) => (
							<div
								key={i}
								className="bg-[var(--color-surface)] rounded-xl p-5 min-w-[200px] animate-pulse"
							>
								<div className="h-3 w-20 rounded bg-[var(--color-border)] mb-3" />
								<div className="h-8 w-32 rounded bg-[var(--color-border)] mb-2" />
								<div className="h-3 w-16 rounded bg-[var(--color-border)]" />
							</div>
						))}
					</div>
				)}

				{/* Empty state */}
				{!isLoading && !analytics && (
					<EmptyState
						title={t('supplier.emptyAnalytics')}
						description={t('supplier.emptyAnalyticsBody')}
						icon={<BarChart3 size={48} />}
					/>
				)}

				{/* Data loaded */}
				{analytics && (
					<>
						{/* KPI Cards */}
						<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
							<KPICard
								label={t('supplier.revenue')}
								value={analytics.revenue.value}
								trend={analytics.revenue.trend}
								locale={locale}
								format="currency"
							/>
							<KPICard
								label={t('supplier.fillRate')}
								value={analytics.fillRate.value}
								trend={analytics.fillRate.trend}
								locale={locale}
								format="percent"
							/>
							<KPICard
								label={t('supplier.onTimeRate')}
								value={analytics.onTimeRate.value}
								trend={analytics.onTimeRate.trend}
								locale={locale}
								format="percent"
							/>
							<KPICard
								label={t('supplier.quoteInclusion')}
								value={analytics.quoteInclusion.value}
								trend={analytics.quoteInclusion.trend}
								locale={locale}
								format="percent"
							/>
						</div>

						{/* Monthly Revenue Chart */}
						<div>
							<h3 className="text-sm font-semibold text-[var(--color-text)] mb-3">
								{t('supplier.monthlyRevenue')}
							</h3>
							<RevenueChart data={analytics.monthlyRevenue} locale={locale} />
						</div>

						{/* Product Performance Table */}
						<div>
							<h3 className="text-sm font-semibold text-[var(--color-text)] mb-3">
								{t('supplier.topProducts')}
							</h3>
							<ProductPerformanceTable
								products={analytics.topProducts}
								locale={locale}
							/>
						</div>
					</>
				)}
			</div>
			<FloatingAIButton />
		</WindowShell>
	)
}
