/**
 * Dense driver list — each row: name + status dot + vehicle plate (mono) + compliance indicator.
 * Search at top. Filters as pills.
 */
import { useState, useMemo } from 'react'
import { SearchField, Input, Label } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import type { Driver, ComplianceStatus as ComplianceStatusType } from '../../../types/dispatch'

interface DriverListProps {
  drivers: Driver[]
  selectedDriverId: string | null
  onSelectDriver: (driverId: string) => void
}

type FilterKey = 'all' | 'INTERNAL' | 'CONTRACTED' | 'ON_DEMAND' | 'blocked'

const COMPLIANCE_DOTS: Record<ComplianceStatusType, string> = {
  valid: 'bg-green-500',
  expiring: 'bg-amber-500',
  expired: 'bg-red-500',
  blocked: 'bg-red-500',
}

export function DriverList({ drivers, selectedDriverId, onSelectDriver }: DriverListProps) {
  const { t } = useTranslation('dispatch')
  const [filter, setFilter] = useState<FilterKey>('all')
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    let result = drivers

    if (filter === 'blocked') {
      result = result.filter((d) => d.complianceStatus === 'expired' || d.complianceStatus === 'blocked')
    } else if (filter !== 'all') {
      result = result.filter((d) => d.type === filter)
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter((d) => d.name.toLowerCase().includes(q))
    }

    // Expired/blocked float to top, then by name
    return [...result].sort((a, b) => {
      const aBlocked = a.complianceStatus === 'expired' || a.complianceStatus === 'blocked' ? 0 : 1
      const bBlocked = b.complianceStatus === 'expired' || b.complianceStatus === 'blocked' ? 0 : 1
      if (aBlocked !== bBlocked) return aBlocked - bBlocked
      return a.name.localeCompare(b.name)
    })
  }, [drivers, filter, search])

  const FILTERS: Array<{ key: FilterKey; label: string }> = [
    { key: 'all', label: t('driver.filter.all', 'All') },
    { key: 'INTERNAL', label: t('driver.filter.internal', 'Internal') },
    { key: 'CONTRACTED', label: t('driver.filter.contracted', 'Contract') },
    { key: 'ON_DEMAND', label: t('driver.filter.onDemand', 'On-Demand') },
    { key: 'blocked', label: t('driver.filter.blocked', 'Blocked') },
  ]

  return (
    <div className="flex flex-col">
      {/* Search */}
      <div className="p-3">
        <SearchField
          value={search}
          onChange={setSearch}
          className="w-full"
          aria-label={t('driver.search', 'Search drivers')}
        >
          <Label className="sr-only">{t('driver.search', 'Search drivers')}</Label>
          <Input
            placeholder={t('driver.searchPlaceholder', 'Search by name...')}
            className="w-full rounded-lg border border-black/[0.08] bg-black/[0.03] px-3 py-1.5 text-sm outline-none placeholder:text-black/30 focus:ring-1 focus:ring-[#2563EB] dark:border-white/[0.08] dark:bg-white/[0.03] dark:placeholder:text-white/30"
          />
        </SearchField>
      </div>

      {/* Filter pills */}
      <div className="flex gap-1 px-3 pb-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
              filter === f.key
                ? 'bg-black text-white dark:bg-white dark:text-black'
                : 'text-black/40 hover:text-black/60 dark:text-white/40 dark:hover:text-white/60'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Driver rows */}
      <div className="flex-1 overflow-y-auto">
        {filtered.map((driver: Driver) => {
          const isBlocked = driver.complianceStatus === 'expired' || driver.complianceStatus === 'blocked'
          const isSelected = driver.id === selectedDriverId

          return (
            <button
              key={driver.id}
              type="button"
              onClick={() => onSelectDriver(driver.id)}
              className={`flex w-full items-center gap-3 border-b border-black/[0.04] px-4 py-3 text-start transition-colors dark:border-white/[0.04] ${
                isSelected
                  ? 'bg-[#2563EB]/[0.06]'
                  : 'hover:bg-black/[0.02] dark:hover:bg-white/[0.02]'
              } ${isBlocked ? 'opacity-50' : ''}`}
            >
              {/* Initials circle */}
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/[0.06] text-xs font-semibold text-black/60 dark:bg-white/[0.06] dark:text-white/60">
                {driver.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
              </div>

              {/* Name + plate */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-black dark:text-white">
                  {driver.name}
                </p>
                <p className="font-[family-name:var(--font-geist-mono)] text-[11px] tabular-nums text-black/40 dark:text-white/40">
                  {driver.vehicleId ?? t('driver.noVehicle', 'Unassigned')}
                </p>
              </div>

              {/* Compliance dot */}
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${COMPLIANCE_DOTS[driver.complianceStatus] ?? 'bg-black/20'}`}
              />
            </button>
          )
        })}
        {filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-black/30 dark:text-white/30">
            {t('driver.noDrivers', 'No drivers found')}
          </p>
        )}
      </div>
    </div>
  )
}
