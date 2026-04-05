import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { ToggleButton } from 'react-aria-components'
import { useSalesStore } from '../../../stores/sales'
import { getSalesPipeline } from '../../../lib/server/sales-pipeline'
import { PipelineSummaryBar } from './PipelineSummaryBar'
import { KanbanBoard } from './KanbanBoard'

// Lazy imports for list and funnel (loaded when needed)
import { PipelineListView } from './PipelineListView'
import { PipelineFunnel } from './PipelineFunnel'

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
    const updated = { ...pipelineFilters }
    delete (updated as any)[key]
    setPipelineFilters(updated)
  }

  return (
    <div className="flex h-full flex-col">
      {/* Summary bar */}
      {pipelineData && (
        <PipelineSummaryBar
          stages={pipelineData.stages}
          deals={pipelineData.deals}
        />
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 border-b border-black/10 px-4 py-2 dark:border-white/10">
        {/* View toggles */}
        <div className="flex rounded-lg border border-black/10 dark:border-white/10">
          {(['kanban', 'list', 'funnel'] as const).map((view) => (
            <ToggleButton
              key={view}
              isSelected={pipelineView === view}
              onChange={() => setPipelineView(view)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                pipelineView === view
                  ? 'bg-[#2563EB] text-white'
                  : 'text-black/60 hover:bg-black/5 dark:text-white/60 dark:hover:bg-white/5'
              } first:rounded-s-lg last:rounded-e-lg`}
            >
              {view === 'kanban'
                ? t('sales.pipeline.kanbanBoard', 'Kanban Board')
                : view === 'list'
                  ? t('sales.pipeline.listView', 'List View')
                  : t('sales.pipeline.funnelChart', 'Funnel Chart')}
            </ToggleButton>
          ))}
        </div>

        {/* Scope toggle */}
        <div className="flex rounded-lg border border-black/10 dark:border-white/10">
          <ToggleButton
            isSelected={pipelineScope === 'my'}
            onChange={() => setPipelineScope('my')}
            className={`px-3 py-1.5 text-xs font-medium rounded-s-lg ${
              pipelineScope === 'my'
                ? 'bg-[#2563EB] text-white'
                : 'text-black/60 hover:bg-black/5 dark:text-white/60 dark:hover:bg-white/5'
            }`}
          >
            {t('sales.pipeline.myPipeline', 'My Pipeline')}
          </ToggleButton>
          <ToggleButton
            isSelected={pipelineScope === 'team'}
            onChange={() => setPipelineScope('team')}
            className={`px-3 py-1.5 text-xs font-medium rounded-e-lg ${
              pipelineScope === 'team'
                ? 'bg-[#2563EB] text-white'
                : 'text-black/60 hover:bg-black/5 dark:text-white/60 dark:hover:bg-white/5'
            }`}
          >
            {t('sales.pipeline.teamPipeline', 'Team Pipeline')}
          </ToggleButton>
        </div>

        <div className="h-6 w-px bg-black/10 dark:bg-white/10" />

        {/* Filters */}
        <div className="flex items-center gap-2">
          {/* Customer search */}
          <input
            type="text"
            value={customerSearch}
            onChange={(e) => {
              setCustomerSearch(e.target.value)
              if (e.target.value) {
                setPipelineFilters({ ...pipelineFilters, customer: e.target.value })
              } else {
                const { customer, ...rest } = pipelineFilters
                setPipelineFilters(rest)
              }
            }}
            placeholder={t('sales.pipeline.searchCustomer', 'Search customer...')}
            className="rounded-lg border border-black/10 bg-transparent px-3 py-1.5 text-xs outline-none focus:border-[#2563EB] dark:border-white/10"
          />

          {/* Value range select */}
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
            className="rounded-lg border border-black/10 bg-transparent px-3 py-1.5 text-xs outline-none focus:border-[#2563EB] dark:border-white/10"
          >
            <option value="">{t('sales.pipeline.allValues', 'All Values')}</option>
            <option value="<100K">&lt; 100K</option>
            <option value="100-500K">100K - 500K</option>
            <option value="500K-1M">500K - 1M</option>
            <option value=">1M">&gt; 1M</option>
          </select>

          {/* Age range select */}
          <select
            onChange={(e) => {
              const idx = Number(e.target.value)
              if (!Number.isNaN(idx) && AGE_RANGES[idx]) {
                const range = AGE_RANGES[idx]
                setPipelineFilters({ ...pipelineFilters, ageRange: { min: range.min, max: range.max } })
              } else {
                const { ageRange, ...rest } = pipelineFilters
                setPipelineFilters(rest)
              }
            }}
            className="rounded-lg border border-black/10 bg-transparent px-3 py-1.5 text-xs outline-none focus:border-[#2563EB] dark:border-white/10"
          >
            <option value="">{t('sales.pipeline.allAges', 'All Ages')}</option>
            {AGE_RANGES.map((range, i) => (
              <option key={range.label} value={i}>
                {range.label}
              </option>
            ))}
          </select>
        </div>

        {/* Save filter set */}
        <button
          type="button"
          onClick={() => {
            const name = prompt(t('sales.pipeline.filterSetName', 'Filter set name:'))
            if (name) {
              useSalesStore.getState().saveFilterSet(name, pipelineFilters)
            }
          }}
          className="text-xs text-[#2563EB] hover:underline"
        >
          {t('sales.pipeline.saveFilters', 'Save filter set')}
        </button>
      </div>

      {/* Active filter pills */}
      {activeFilterKeys.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 px-4 py-2">
          {activeFilterKeys.map(([key, value]) => (
            <span
              key={key}
              className="inline-flex items-center gap-1 rounded-full bg-[#2563EB]/10 px-2.5 py-0.5 text-xs text-[#2563EB]"
            >
              {key}: {typeof value === 'object' ? JSON.stringify(value) : String(value)}
              <button
                type="button"
                onClick={() => removeFilter(key)}
                className="ms-0.5 hover:text-[#2563EB]/70"
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
          <PipelineFunnel stages={pipelineData.stages} deals={pipelineData.deals} />
        )}
      </div>
    </div>
  )
}
