import { useQuery } from '@tanstack/react-query'
import { Button } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { getProcurementQueue } from '../../../lib/server/procurement-suppliers'
import { useProcurementStore } from '../../../stores/procurement'
import type {
	ProcurementHomeData,
	ProcurementTab,
} from '../../../types/procurement'

// ─── Metric Tile ─────────────────────────────────────────

function MetricTile({
	label,
	value,
	navigateTo,
}: {
	label: string
	value: number
	navigateTo: ProcurementTab
}) {
	const setActiveTab = useProcurementStore((s) => s.setActiveTab)

	return (
		<Button
			onPress={() => setActiveTab(navigateTo)}
			className="group flex flex-col items-start gap-1 rounded-lg px-4 py-3 outline-none transition-colors duration-150
        data-[hovered]:bg-black/[0.03] dark:data-[hovered]:bg-white/[0.03]
        data-[focus-visible]:ring-2 data-[focus-visible]:ring-[var(--color-primary)]/40"
		>
			<span className="font-[family-name:var(--font-geist-mono)] text-[28px] font-semibold tabular-nums leading-none tracking-tight text-[var(--color-text)]">
				{value}
			</span>
			<span className="text-[11px] font-medium text-[var(--color-text-subtle)] uppercase tracking-wider">
				{label}
			</span>
		</Button>
	)
}

// ─── Supplier Performance Row ────────────────────────────

function SupplierRow({
	name,
	score,
	trend,
	rank,
}: {
	name: string
	score: number
	trend: 'improving' | 'declining' | 'stable'
	rank: number
}) {
	const trendArrow =
		trend === 'improving'
			? '\u2191'
			: trend === 'declining'
				? '\u2193'
				: '\u2192'
	const trendColor =
		trend === 'improving'
			? 'text-[var(--color-text)]'
			: trend === 'declining'
				? 'text-[var(--color-text-muted)]'
				: 'text-[var(--color-text-subtle)]'

	return (
		<div className="flex items-center gap-3 py-1.5">
			<span className="w-4 shrink-0 font-[family-name:var(--font-geist-mono)] text-[11px] tabular-nums text-[var(--color-text-subtle)]">
				{rank}
			</span>
			<span className="flex-1 min-w-0 truncate text-[13px] font-medium text-[var(--color-text)]">
				{name}
			</span>
			{/* Score bar */}
			<div className="w-24 shrink-0">
				<div className="h-1.5 w-full rounded-full bg-black/[0.04] dark:bg-white/[0.04]">
					<div
						className="h-full rounded-full bg-[var(--color-primary)] transition-all duration-300"
						style={{
							width: `${Math.min(100, score)}%`,
							opacity: 0.3 + (score / 100) * 0.7,
						}}
					/>
				</div>
			</div>
			<span className="w-8 shrink-0 text-end font-[family-name:var(--font-geist-mono)] text-[12px] tabular-nums text-[var(--color-text-muted)]">
				{score}
			</span>
			<span className={`w-4 shrink-0 text-center text-[12px] ${trendColor}`}>
				{trendArrow}
			</span>
		</div>
	)
}

// ─── PO Pill Counter ─────────────────────────────────────

function POPill({ label, count }: { label: string; count: number }) {
	return (
		<span className="inline-flex items-center gap-1.5 rounded-full bg-black/[0.04] px-2.5 py-1 dark:bg-white/[0.04]">
			<span className="font-[family-name:var(--font-geist-mono)] text-[12px] font-semibold tabular-nums text-[var(--color-text)]">
				{count}
			</span>
			<span className="text-[11px] text-[var(--color-text-subtle)]">
				{label}
			</span>
		</span>
	)
}

// ─── Main View ───────────────────────────────────────────

export function ProcurementHomeView() {
	const { t } = useTranslation('internal')

	const { data } = useQuery({
		queryKey: ['procurement', 'queue'],
		queryFn: () => getProcurementQueue({ data: { page: 1, limit: 20 } }),
		staleTime: 30_000,
	})

	const homeData: ProcurementHomeData | undefined = data?.items

	const activePOCount = homeData
		? Object.values(homeData.activePOs).reduce(
				(sum: number, c: number) => sum + c,
				0,
			)
		: 0

	return (
		<div className="flex flex-col gap-8 px-5 py-4">
			{/* ── Metric Tiles ── */}
			<div className="grid grid-cols-2 gap-0 sm:grid-cols-4">
				<MetricTile
					label={t('procurement.home.pendingInquiries')}
					value={homeData?.pendingInquiries ?? 0}
					navigateTo="sourcing"
				/>
				<MetricTile
					label={t('procurement.home.responsesNeedingReview')}
					value={homeData?.responsesNeedingReview ?? 0}
					navigateTo="sourcing"
				/>
				<MetricTile
					label={t('procurement.home.activePOs')}
					value={activePOCount}
					navigateTo="po-management"
				/>
				<MetricTile
					label={t('procurement.home.performanceHighlights')}
					value={homeData?.performanceHighlights.best.score ?? 0}
					navigateTo="suppliers"
				/>
			</div>

			{/* ── Supplier Performance ── */}
			{homeData?.performanceHighlights && (
				<div className="flex flex-col gap-2">
					<h3 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-subtle)]">
						{t('procurement.home.supplierPerformance')}
					</h3>
					<div className="flex flex-col">
						<SupplierRow
							name={homeData.performanceHighlights.best.supplierName}
							score={homeData.performanceHighlights.best.score}
							trend="improving"
							rank={1}
						/>
						<SupplierRow
							name={homeData.performanceHighlights.worst.supplierName}
							score={homeData.performanceHighlights.worst.score}
							trend="declining"
							rank={2}
						/>
					</div>
				</div>
			)}

			{/* ── PO Breakdown ── */}
			{homeData?.activePOs && (
				<div className="flex flex-col gap-2">
					<h3 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-subtle)]">
						{t('procurement.home.poBreakdown')}
					</h3>
					<div className="flex flex-wrap gap-1.5">
						{Object.entries(homeData.activePOs)
							.filter(([, count]) => count > 0)
							.map(([status, count]) => (
								<POPill
									key={status}
									label={t(`procurement.poStatus.${status}`, {
										defaultValue: status,
									})}
									count={count}
								/>
							))}
					</div>
				</div>
			)}
		</div>
	)
}
