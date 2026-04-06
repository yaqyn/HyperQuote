import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useFinanceStore } from '../../../stores/finance'

interface SavedView {
  name: string
  filters: {
    tier?: string
    salesRep?: string
    dateRange?: { start: string; end: string }
    amountRange?: { min: number; max: number }
    groupBy?: 'customer' | 'region' | 'salesperson'
  }
}

const TIER_OPTIONS = ['1', '2', '3', '4', '5']
const SALES_REP_OPTIONS = ['Ahmed Mostafa', 'Mohamed Ibrahim', 'Youssef Hassan', 'Sara Ahmed']
const GROUP_BY_OPTIONS: { value: 'customer' | 'region' | 'salesperson'; label: string }[] = [
  { value: 'customer', label: 'Customer' },
  { value: 'region', label: 'Region' },
  { value: 'salesperson', label: 'Salesperson' },
]
const SORT_OPTIONS = [
  { value: 'total', label: 'Total Outstanding' },
  { value: 'oldest', label: 'Oldest Invoice' },
  { value: 'risk', label: 'Highest Risk' },
]

/**
 * Comprehensive filter bar for AR aging view.
 * Supports: tier, sales rep, date range, amount range, group by.
 * Active filters shown as removable pills.
 * Reads/writes arFilters from useFinanceStore.
 */
export function ARFilters() {
  const { t } = useTranslation('finance')
  const arFilters = useFinanceStore((s) => s.arFilters)
  const setARFilters = useFinanceStore((s) => s.setARFilters)
  const clearARFilters = useFinanceStore((s) => s.clearARFilters)

  const [savedViews, setSavedViews] = useState<SavedView[]>([])
  const [sortBy, setSortBy] = useState('total')

  const hasActiveFilters =
    arFilters.tier != null ||
    arFilters.salesRep != null ||
    arFilters.dateRange != null ||
    arFilters.amountRange != null ||
    arFilters.groupBy != null

  const handleSaveView = useCallback(() => {
    const name = prompt(t('ar.filters.saveViewName', 'Enter view name:'))
    if (name) {
      setSavedViews((prev) => [...prev, { name, filters: { ...arFilters } }])
    }
  }, [arFilters, t])

  const handleLoadView = useCallback(
    (view: SavedView) => {
      clearARFilters()
      setARFilters(view.filters)
    },
    [clearARFilters, setARFilters],
  )

  const removeFilter = useCallback(
    (key: string) => {
      setARFilters({ [key]: undefined })
    },
    [setARFilters],
  )

  // Active filter pills
  const activePills: { key: string; label: string }[] = []
  if (arFilters.tier) activePills.push({ key: 'tier', label: `Tier ${arFilters.tier}` })
  if (arFilters.salesRep) activePills.push({ key: 'salesRep', label: arFilters.salesRep })
  if (arFilters.dateRange)
    activePills.push({
      key: 'dateRange',
      label: `${arFilters.dateRange.start} - ${arFilters.dateRange.end}`,
    })
  if (arFilters.amountRange)
    activePills.push({
      key: 'amountRange',
      label: `EGP ${arFilters.amountRange.min?.toLocaleString() ?? '0'} - ${arFilters.amountRange.max?.toLocaleString() ?? '...'}`,
    })
  if (arFilters.groupBy) activePills.push({ key: 'groupBy', label: `Group: ${arFilters.groupBy}` })

  return (
    <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 backdrop-blur-sm">
      {/* Filter controls row */}
      <div className="flex flex-wrap items-center gap-3 px-4 py-3">
        {/* Tier dropdown */}
        <div className="flex items-center gap-1">
          <label className="text-xs text-black/50 dark:text-white/50">
            {t('ar.filters.tier', 'Tier')}
          </label>
          <select
            value={arFilters.tier ?? ''}
            onChange={(e) => setARFilters({ tier: e.target.value || undefined })}
            className="text-sm border border-black/10 dark:border-white/10 rounded px-2 py-1 bg-transparent"
          >
            <option value="">{t('ar.filters.all', 'All')}</option>
            {TIER_OPTIONS.map((tier) => (
              <option key={tier} value={tier}>
                {t('ar.filters.tierN', 'Tier {{n}}', { n: tier })}
              </option>
            ))}
          </select>
        </div>

        {/* Sales rep dropdown */}
        <div className="flex items-center gap-1">
          <label className="text-xs text-black/50 dark:text-white/50">
            {t('ar.filters.salesRep', 'Sales Rep')}
          </label>
          <select
            value={arFilters.salesRep ?? ''}
            onChange={(e) => setARFilters({ salesRep: e.target.value || undefined })}
            className="text-sm border border-black/10 dark:border-white/10 rounded px-2 py-1 bg-transparent"
          >
            <option value="">{t('ar.filters.all', 'All')}</option>
            {SALES_REP_OPTIONS.map((rep) => (
              <option key={rep} value={rep}>
                {rep}
              </option>
            ))}
          </select>
        </div>

        {/* Date range */}
        <div className="flex items-center gap-1">
          <label className="text-xs text-black/50 dark:text-white/50">
            {t('ar.filters.dateRange', 'Date Range')}
          </label>
          <input
            type="date"
            value={arFilters.dateRange?.start ?? ''}
            onChange={(e) =>
              setARFilters({
                dateRange: {
                  start: e.target.value,
                  end: arFilters.dateRange?.end ?? '',
                },
              })
            }
            className="text-sm border border-black/10 dark:border-white/10 rounded px-2 py-1 bg-transparent font-[family-name:var(--font-geist-mono)] tabular-nums"
          />
          <span className="text-xs text-black/30 dark:text-white/30">-</span>
          <input
            type="date"
            value={arFilters.dateRange?.end ?? ''}
            onChange={(e) =>
              setARFilters({
                dateRange: {
                  start: arFilters.dateRange?.start ?? '',
                  end: e.target.value,
                },
              })
            }
            className="text-sm border border-black/10 dark:border-white/10 rounded px-2 py-1 bg-transparent font-[family-name:var(--font-geist-mono)] tabular-nums"
          />
        </div>

        {/* Amount range */}
        <div className="flex items-center gap-1">
          <label className="text-xs text-black/50 dark:text-white/50">
            {t('ar.filters.amount', 'Amount')}
          </label>
          <input
            type="number"
            placeholder={t('ar.filters.min', 'Min')}
            value={arFilters.amountRange?.min ?? ''}
            onChange={(e) =>
              setARFilters({
                amountRange: {
                  min: e.target.value ? Number(e.target.value) : 0,
                  max: arFilters.amountRange?.max ?? 0,
                },
              })
            }
            className="w-24 text-sm border border-black/10 dark:border-white/10 rounded px-2 py-1 bg-transparent font-[family-name:var(--font-geist-mono)] tabular-nums"
          />
          <span className="text-xs text-black/30 dark:text-white/30">-</span>
          <input
            type="number"
            placeholder={t('ar.filters.max', 'Max')}
            value={arFilters.amountRange?.max ?? ''}
            onChange={(e) =>
              setARFilters({
                amountRange: {
                  min: arFilters.amountRange?.min ?? 0,
                  max: e.target.value ? Number(e.target.value) : 0,
                },
              })
            }
            className="w-24 text-sm border border-black/10 dark:border-white/10 rounded px-2 py-1 bg-transparent font-[family-name:var(--font-geist-mono)] tabular-nums"
          />
        </div>

        {/* Group by */}
        <div className="flex items-center gap-1">
          <label className="text-xs text-black/50 dark:text-white/50">
            {t('ar.filters.groupBy', 'Group')}
          </label>
          <div className="flex gap-1">
            {GROUP_BY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() =>
                  setARFilters({
                    groupBy: arFilters.groupBy === opt.value ? undefined : opt.value,
                  })
                }
                className={`text-xs px-2 py-1 rounded border transition-colors ${
                  arFilters.groupBy === opt.value
                    ? 'bg-[#2563EB] text-white border-[#2563EB]'
                    : 'border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                {t(`ar.filters.group.${opt.value}`, opt.label)}
              </button>
            ))}
          </div>
        </div>

        {/* Sort by */}
        <div className="flex items-center gap-1">
          <label className="text-xs text-black/50 dark:text-white/50">
            {t('ar.filters.sortBy', 'Sort')}
          </label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="text-sm border border-black/10 dark:border-white/10 rounded px-2 py-1 bg-transparent"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {t(`ar.filters.sort.${opt.value}`, opt.label)}
              </option>
            ))}
          </select>
        </div>

        {/* Saved views */}
        {savedViews.length > 0 && (
          <div className="flex items-center gap-1">
            <label className="text-xs text-black/50 dark:text-white/50">
              {t('ar.filters.savedViews', 'Views')}
            </label>
            <select
              onChange={(e) => {
                const view = savedViews.find((v) => v.name === e.target.value)
                if (view) handleLoadView(view)
              }}
              className="text-sm border border-black/10 dark:border-white/10 rounded px-2 py-1 bg-transparent"
              defaultValue=""
            >
              <option value="" disabled>
                {t('ar.filters.selectView', 'Select...')}
              </option>
              {savedViews.map((view) => (
                <option key={view.name} value={view.name}>
                  {view.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Save current */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleSaveView}
            className="text-xs text-[#2563EB] hover:underline"
          >
            {t('ar.filters.saveView', 'Save view')}
          </button>
        )}
      </div>

      {/* Active filter pills */}
      {activePills.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 px-4 pb-3">
          {activePills.map((pill) => (
            <span
              key={pill.key}
              className="inline-flex items-center gap-1 rounded-full bg-[#2563EB]/10 text-[#2563EB] px-2 py-0.5 text-xs"
            >
              {pill.label}
              <button
                type="button"
                onClick={() => removeFilter(pill.key)}
                className="hover:text-[#2563EB]/70 font-bold"
                aria-label={t('ar.filters.removeFilter', 'Remove filter')}
              >
                x
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={clearARFilters}
            className="text-xs text-black/40 dark:text-white/40 hover:text-[#2563EB]"
          >
            {t('ar.filters.clearAll', 'Clear all filters')}
          </button>
        </div>
      )}
    </div>
  )
}
