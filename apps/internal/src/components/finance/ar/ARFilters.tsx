import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useFinanceStore } from '../../../stores/finance'
import type { ARAgingBucket } from '../../../types/finance'

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

const AGING_PILLS: { value: ARAgingBucket; label: string }[] = [
  { value: 'current', label: 'Current' },
  { value: '1-30', label: '1-30' },
  { value: '31-60', label: '31-60' },
  { value: '61-90', label: '61-90' },
  { value: '90+', label: '90+' },
]

/**
 * Compact inline filter row for AR.
 * Date range as pills, customer search as borderless input, aging bucket as pill toggles.
 */
export function ARFilters() {
  const { t } = useTranslation('finance')
  const arFilters = useFinanceStore((s) => s.arFilters)
  const setARFilters = useFinanceStore((s) => s.setARFilters)
  const clearARFilters = useFinanceStore((s) => s.clearARFilters)

  const [savedViews, setSavedViews] = useState<SavedView[]>([])
  const [search, setSearch] = useState('')
  const [activeBucket, setActiveBucket] = useState<ARAgingBucket | null>(null)

  const hasActiveFilters =
    arFilters.tier != null ||
    arFilters.salesRep != null ||
    arFilters.dateRange != null ||
    arFilters.amountRange != null ||
    arFilters.groupBy != null ||
    activeBucket != null ||
    search !== ''

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
      if (key === 'bucket') {
        setActiveBucket(null)
        return
      }
      if (key === 'search') {
        setSearch('')
        return
      }
      setARFilters({ [key]: undefined })
    },
    [setARFilters],
  )

  // Active filter pills
  const activePills: { key: string; label: string }[] = []
  if (activeBucket) activePills.push({ key: 'bucket', label: activeBucket === 'current' ? 'Current' : `${activeBucket} days` })
  if (search) activePills.push({ key: 'search', label: `"${search}"` })
  if (arFilters.tier) activePills.push({ key: 'tier', label: `Tier ${arFilters.tier}` })
  if (arFilters.salesRep) activePills.push({ key: 'salesRep', label: arFilters.salesRep })
  if (arFilters.dateRange)
    activePills.push({
      key: 'dateRange',
      label: `${arFilters.dateRange.start} \u2013 ${arFilters.dateRange.end}`,
    })
  if (arFilters.amountRange)
    activePills.push({
      key: 'amountRange',
      label: `EGP ${arFilters.amountRange.min?.toLocaleString() ?? '0'} \u2013 ${arFilters.amountRange.max?.toLocaleString() ?? '\u2026'}`,
    })

  return (
    <div className="flex flex-col gap-2">
      {/* Main filter row */}
      <div className="flex items-center gap-3">
        {/* Customer search — borderless */}
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('ar.filters.searchCustomer', 'Search customer\u2026')}
          className="w-48 bg-transparent border-b border-black/10 dark:border-white/10 px-0 py-1.5 text-sm outline-none placeholder:text-black/30 dark:placeholder:text-white/30 focus:border-[#2563EB] transition-colors"
        />

        {/* Aging bucket pills */}
        <div className="flex gap-1">
          {AGING_PILLS.map((pill) => (
            <button
              key={pill.value}
              type="button"
              onClick={() => setActiveBucket(activeBucket === pill.value ? null : pill.value)}
              className={`font-[family-name:var(--font-geist-mono)] tabular-nums text-xs px-2.5 py-1 rounded-full transition-colors ${
                activeBucket === pill.value
                  ? 'bg-black text-white dark:bg-white dark:text-black'
                  : 'text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>

        {/* Tier */}
        <select
          value={arFilters.tier ?? ''}
          onChange={(e) => setARFilters({ tier: e.target.value || undefined })}
          className="text-xs bg-transparent border-b border-black/10 dark:border-white/10 py-1 outline-none cursor-pointer"
        >
          <option value="">{t('ar.filters.allTiers', 'All tiers')}</option>
          {TIER_OPTIONS.map((tier) => (
            <option key={tier} value={tier}>
              Tier {tier}
            </option>
          ))}
        </select>

        {/* Sales rep */}
        <select
          value={arFilters.salesRep ?? ''}
          onChange={(e) => setARFilters({ salesRep: e.target.value || undefined })}
          className="text-xs bg-transparent border-b border-black/10 dark:border-white/10 py-1 outline-none cursor-pointer"
        >
          <option value="">{t('ar.filters.allReps', 'All reps')}</option>
          {SALES_REP_OPTIONS.map((rep) => (
            <option key={rep} value={rep}>
              {rep}
            </option>
          ))}
        </select>

        {/* Saved views */}
        {savedViews.length > 0 && (
          <select
            onChange={(e) => {
              const view = savedViews.find((v) => v.name === e.target.value)
              if (view) handleLoadView(view)
            }}
            className="text-xs bg-transparent border-b border-black/10 dark:border-white/10 py-1 outline-none cursor-pointer"
            defaultValue=""
          >
            <option value="" disabled>
              {t('ar.filters.savedViews', 'Views')}
            </option>
            {savedViews.map((view) => (
              <option key={view.name} value={view.name}>
                {view.name}
              </option>
            ))}
          </select>
        )}

        {/* Actions */}
        <div className="ms-auto flex items-center gap-3">
          {hasActiveFilters && (
            <>
              <button
                type="button"
                onClick={handleSaveView}
                className="text-xs text-[#2563EB] hover:underline"
              >
                {t('ar.filters.saveView', 'Save view')}
              </button>
              <button
                type="button"
                onClick={() => {
                  clearARFilters()
                  setActiveBucket(null)
                  setSearch('')
                }}
                className="text-xs text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white"
              >
                {t('ar.filters.clearAll', 'Clear')}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Active filter pills */}
      {activePills.length > 0 && (
        <div className="flex items-center gap-1.5">
          {activePills.map((pill) => (
            <span
              key={pill.key}
              className="inline-flex items-center gap-1 rounded-full border border-black/10 dark:border-white/10 px-2 py-0.5 text-xs text-black/60 dark:text-white/60"
            >
              {pill.label}
              <button
                type="button"
                onClick={() => removeFilter(pill.key)}
                className="hover:text-black dark:hover:text-white"
                aria-label={t('ar.filters.removeFilter', 'Remove filter')}
              >
                \u00d7
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
