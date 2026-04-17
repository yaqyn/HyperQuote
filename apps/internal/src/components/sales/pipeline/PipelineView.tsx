import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { ToggleButton } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { getSalesPipeline } from '../../../lib/server/sales-pipeline'
import { useSalesStore } from '../../../stores/sales'
import { SalesCalendar } from '../calendar/SalesCalendar'
import { KanbanBoard } from './KanbanBoard'
import { PipelineFunnel } from './PipelineFunnel'
// Lazy imports for list and funnel (loaded when needed)
import { PipelineListView } from './PipelineListView'
import { PipelineSummaryBar } from './PipelineSummaryBar'

type ValueRange = '<100K' | '100-500K' | '500K-1M' | '>1M'

const VALUE_RANGES: Record<ValueRange, { min: number; max: number }> = {
	'<100K': { min: 0, max: 100_000 },
	'100-500K': { min: 100_000, max: 500_000 },
	'500K-1M': { min: 500_000, max: 1_000_000 },
	'>1M': { min: 1_000_000, max: Number.MAX_SAFE_INTEGER },
}

const AGE_RANGES = [
	{ label: '<5 days', min: 0, max: 5 },
	{ label: '5-15 days', min: 5, max: 15 },
	{ label: '>15 days', min: 15, max: 999 },
]

function PillToggle({
	isActive,
	onToggle,
	children,
}: {
	isActive: boolean
	onToggle: () => void
	children: React.ReactNode
}) {
	return (
		<ToggleButton
			isSelected={isActive}
			onChange={onToggle}
			className={`rounded-full px-3 py-1 text-[11px] font-medium tracking-wider transition-colors ${
				isActive
					? 'bg-black text-white dark:bg-white dark:text-black'
					: 'text-black/30 hover:bg-black/[0.04] hover:text-black/60 dark:text-white/30 dark:hover:bg-white/[0.04] dark:hover:text-white/60'
			}`}
		>
			{children}
		</ToggleButton>
	)
}

export function PipelineView() {
	const { t } = useTranslation('internal')
	const pipelineView = useSalesStore((s) => s.pipelineView)
	const pipelineScope = useSalesStore((s) => s.pipelineScope)
	const pipelineFilters = useSalesStore((s) => s.pipelineFilters)
	const setPipelineView = useSalesStore((s) => s.setPipelineView)
	const setPipelineScope = useSalesStore((s) => s.setPipelineScope)
	const setPipelineFilters = useSalesStore((s) => s.setPipelineFilters)

	const [customerSearch, setCustomerSearch] = useState('')

	// Pipeline data for summary bar
	const { data: pipelineData } = useQuery({
		queryKey: ['sales-pipeline', pipelineFilters],
		queryFn: () => getSalesPipeline({ data: { filters: pipelineFilters } }),
		staleTime: 30_000,
	})

	// Active filter pills
	const activeFilterKeys = Object.entries(pipelineFilters).filter(
		([_, v]) => v !== undefined && v !== '',
	)

	const removeFilter = (key: string) => {
		const updated = { ...pipelineFilters } as Record<string, unknown>
		delete updated[key]
		setPipelineFilters(updated as typeof pipelineFilters)
	}

	return (
		<div className="flex h-full flex-col">
			{/* Summary metrics strip */}
			{pipelineData && (
				<PipelineSummaryBar
					stages={pipelineData.stages}
					deals={pipelineData.deals}
				/>
			)}

			{/* Toolbar */}
			<div className="flex flex-wrap items-center gap-3 px-6 py-3">
				{/* View toggles — pill group with 1px gap */}
				<div className="flex items-center gap-px rounded-full bg-black/[0.03] p-0.5 dark:bg-white/[0.03]">
					{(['kanban', 'list', 'funnel', 'timeline'] as const).map((view) => (
						<PillToggle
							key={view}
							isActive={pipelineView === view}
							onToggle={() => setPipelineView(view)}
						>
							{view === 'kanban'
								? t('sales.pipeline.kanbanBoard', 'Board')
								: view === 'list'
									? t('sales.pipeline.listView', 'List')
									: view === 'funnel'
										? t('sales.pipeline.funnelChart', 'Funnel')
										: t('sales.pipeline.timeline', 'Timeline')}
						</PillToggle>
					))}
				</div>

				{/* Scope toggle */}
				<div className="flex items-center gap-px rounded-full bg-black/[0.03] p-0.5 dark:bg-white/[0.03]">
					<PillToggle
						isActive={pipelineScope === 'my'}
						onToggle={() => setPipelineScope('my')}
					>
						{t('sales.pipeline.myPipeline', 'Mine')}
					</PillToggle>
					<PillToggle
						isActive={pipelineScope === 'team'}
						onToggle={() => setPipelineScope('team')}
					>
						{t('sales.pipeline.teamPipeline', 'Team')}
					</PillToggle>
				</div>

				{/* Filters — right-aligned, minimal chrome */}
				<div className="flex items-center gap-3 ms-auto">
					<input
						type="text"
						value={customerSearch}
						onChange={(e) => {
							setCustomerSearch(e.target.value)
							if (e.target.value) {
								setPipelineFilters({
									...pipelineFilters,
									customer: e.target.value,
								})
							} else {
								const { customer, ...rest } = pipelineFilters
								setPipelineFilters(rest)
							}
						}}
						placeholder={t(
							'sales.pipeline.searchCustomer',
							'Search customer...',
						)}
						className="w-44 border-b border-transparent bg-transparent text-[13px] text-black outline-none transition-colors placeholder:text-black/20 focus:border-black/10 dark:text-white dark:placeholder:text-white/20 dark:focus:border-white/10"
					/>

					<select
						onChange={(e) => {
							const range = VALUE_RANGES[e.target.value as ValueRange]
							if (range) {
								setPipelineFilters({ ...pipelineFilters, valueRange: range })
							} else {
								const { valueRange, ...rest } = pipelineFilters
								setPipelineFilters(rest)
							}
						}}
						className="bg-transparent text-[11px] tracking-wider uppercase text-black/40 outline-none dark:text-white/40"
					>
						<option value="">
							{t('sales.pipeline.allValues', 'All Values')}
						</option>
						<option value="<100K">&lt; 100K</option>
						<option value="100-500K">100K - 500K</option>
						<option value="500K-1M">500K - 1M</option>
						<option value=">1M">&gt; 1M</option>
					</select>

					<select
						onChange={(e) => {
							const idx = Number(e.target.value)
							if (!Number.isNaN(idx) && AGE_RANGES[idx]) {
								const range = AGE_RANGES[idx]
								setPipelineFilters({
									...pipelineFilters,
									ageRange: { min: range.min, max: range.max },
								})
							} else {
								const { ageRange, ...rest } = pipelineFilters
								setPipelineFilters(rest)
							}
						}}
						className="bg-transparent text-[11px] tracking-wider uppercase text-black/40 outline-none dark:text-white/40"
					>
						<option value="">{t('sales.pipeline.allAges', 'All Ages')}</option>
						{AGE_RANGES.map((range, i) => (
							<option key={range.label} value={i}>
								{range.label}
							</option>
						))}
					</select>

					<button
						type="button"
						onClick={() => {
							const name = prompt(
								t('sales.pipeline.filterSetName', 'Filter set name:'),
							)
							if (name) {
								useSalesStore.getState().saveFilterSet(name, pipelineFilters)
							}
						}}
						className="text-[11px] font-medium text-[#2563EB] hover:text-[#2563EB]/70"
					>
						{t('sales.pipeline.saveFilters', 'Save')}
					</button>
				</div>
			</div>

			{/* Active filter pills */}
			{activeFilterKeys.length > 0 && (
				<div className="flex flex-wrap items-center gap-1.5 px-6 pb-2">
					{activeFilterKeys.map(([key, value]) => (
						<span
							key={key}
							className="inline-flex items-center gap-1 rounded-full bg-[#2563EB]/8 px-2.5 py-0.5 text-[10px] font-medium tracking-wider uppercase text-[#2563EB]"
						>
							{key}:{' '}
							{typeof value === 'object'
								? JSON.stringify(value)
								: String(value)}
							<button
								type="button"
								onClick={() => removeFilter(key)}
								className="ms-0.5 opacity-40 hover:opacity-100"
							>
								&times;
							</button>
						</span>
					))}
				</div>
			)}

			{/* View content */}
			<div className="flex-1 overflow-hidden">
				{pipelineView === 'kanban' && <KanbanBoard />}
				{pipelineView === 'list' && <PipelineListView />}
				{pipelineView === 'funnel' && pipelineData && (
					<PipelineFunnel stages={pipelineData.stages} />
				)}
				{pipelineView === 'timeline' && <SalesCalendar />}
			</div>
		</div>
	)
}
