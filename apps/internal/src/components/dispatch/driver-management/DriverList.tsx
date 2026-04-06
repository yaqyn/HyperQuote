/**
 * Driver list table with filters, search, sort, and compliance badges.
 * Filter by type: All/Internal/Contracted/On-Demand/Blocked.
 * React Aria SearchField for name search.
 * Blocked drivers have muted row style.
 */
import { useState, useMemo } from 'react'
import { SearchField, Input, Label } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import type { Driver, ComplianceStatus as ComplianceStatusType } from '../../../types/dispatch'

interface DriverListProps {
  drivers: Driver[]
  onSelectDriver: (driverId: string) => void
}

type FilterKey = 'all' | 'INTERNAL' | 'CONTRACTED' | 'ON_DEMAND' | 'blocked'
type SortKey = 'name' | 'compliance' | 'type'

const TYPE_BADGES: Record<string, { label: string; className: string }> = {
  INTERNAL: { label: 'Internal', className: 'bg-[#2563EB]/10 text-[#2563EB]' },
  CONTRACTED: { label: 'Contracted', className: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' },
  ON_DEMAND: { label: 'On-Demand', className: 'bg-black/5 dark:bg-white/5 text-black/60 dark:text-white/60' },
}

const COMPLIANCE_BADGES: Record<ComplianceStatusType, { label: string; className: string; dot: string }> = {
  valid: { label: 'Valid', className: 'text-green-700 dark:text-green-300', dot: 'bg-green-500' },
  expiring: { label: 'Expiring', className: 'text-amber-700 dark:text-amber-300', dot: 'bg-amber-500' },
  expired: { label: 'Expired', className: 'text-red-700 dark:text-red-300', dot: 'bg-red-500' },
  blocked: { label: 'Blocked', className: 'text-red-700 dark:text-red-300', dot: '' },
}

const COMPLIANCE_ORDER: Record<ComplianceStatusType, number> = {
  blocked: 0,
  expired: 1,
  expiring: 2,
  valid: 3,
}

export function DriverList({ drivers, onSelectDriver }: DriverListProps) {
  const { t } = useTranslation('dispatch')
  const [filter, setFilter] = useState<FilterKey>('all')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortKey>('name')

  const filtered = useMemo(() => {
    let result = drivers

    // Filter by type/blocked
    if (filter === 'blocked') {
      result = result.filter((d) => d.complianceStatus === 'expired' || d.complianceStatus === 'blocked')
    } else if (filter !== 'all') {
      result = result.filter((d) => d.type === filter)
    }

    // Search by name
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter((d) => d.name.toLowerCase().includes(q))
    }

    // Sort
    result = [...result].sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name)
      if (sortBy === 'type') return a.type.localeCompare(b.type)
      if (sortBy === 'compliance') {
        return (COMPLIANCE_ORDER[a.complianceStatus] ?? 3) - (COMPLIANCE_ORDER[b.complianceStatus] ?? 3)
      }
      return 0
    })

    return result
  }, [drivers, filter, search, sortBy])

  const FILTER_BUTTONS: Array<{ key: FilterKey; label: string }> = [
    { key: 'all', label: t('driver.filter.all', 'All') },
    { key: 'INTERNAL', label: t('driver.filter.internal', 'Internal') },
    { key: 'CONTRACTED', label: t('driver.filter.contracted', 'Contracted') },
    { key: 'ON_DEMAND', label: t('driver.filter.onDemand', 'On-Demand') },
    { key: 'blocked', label: t('driver.filter.blocked', 'Blocked') },
  ]

  return (
    <div className="flex flex-col gap-4">
      {/* Filters + Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2 flex-wrap">
          {FILTER_BUTTONS.map((btn) => (
            <button
              key={btn.key}
              type="button"
              onClick={() => setFilter(btn.key)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                filter === btn.key
                  ? 'bg-[#2563EB] text-white'
                  : 'bg-black/5 dark:bg-white/5 text-black/60 dark:text-white/60 hover:bg-black/10 dark:hover:bg-white/10'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        <SearchField
          value={search}
          onChange={setSearch}
          className="flex items-center gap-2"
          aria-label={t('driver.search', 'Search drivers')}
        >
          <Label className="sr-only">{t('driver.search', 'Search drivers')}</Label>
          <Input
            placeholder={t('driver.searchPlaceholder', 'Search by name...')}
            className="rounded-lg border border-black/20 dark:border-white/20 bg-transparent px-3 py-1.5 text-sm outline-none focus:border-[#2563EB] w-48"
          />
        </SearchField>
      </div>

      {/* Sort controls */}
      <div className="flex gap-2 text-xs text-black/50 dark:text-white/50">
        <span>{t('driver.sortBy', 'Sort by')}:</span>
        {(['name', 'compliance', 'type'] as SortKey[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setSortBy(key)}
            className={`transition-colors ${sortBy === key ? 'text-[#2563EB] font-medium' : 'hover:text-black dark:hover:text-white'}`}
          >
            {t(`driver.sort.${key}`, key)}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 backdrop-blur-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02]">
              <th className="px-4 py-3 text-start text-xs text-black/50 dark:text-white/50 font-medium">{t('driver.col.name', 'Name')}</th>
              <th className="px-4 py-3 text-start text-xs text-black/50 dark:text-white/50 font-medium">{t('driver.col.type', 'Type')}</th>
              <th className="px-4 py-3 text-start text-xs text-black/50 dark:text-white/50 font-medium">{t('driver.col.vehicle', 'Vehicle')}</th>
              <th className="px-4 py-3 text-start text-xs text-black/50 dark:text-white/50 font-medium">{t('driver.col.compliance', 'Compliance')}</th>
              <th className="px-4 py-3 text-start text-xs text-black/50 dark:text-white/50 font-medium">{t('driver.col.activeRoute', 'Active Route')}</th>
              <th className="px-4 py-3 text-start text-xs text-black/50 dark:text-white/50 font-medium">{t('driver.col.availability', 'Availability')}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((driver) => {
              const isBlocked = driver.complianceStatus === 'expired' || driver.complianceStatus === 'blocked'
              const badge = TYPE_BADGES[driver.type] ?? TYPE_BADGES.INTERNAL!
              const compliance = COMPLIANCE_BADGES[driver.complianceStatus] ?? COMPLIANCE_BADGES.valid

              return (
                <tr
                  key={driver.id}
                  onClick={() => onSelectDriver(driver.id)}
                  className={`border-b border-black/5 dark:border-white/5 cursor-pointer transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.02] ${
                    isBlocked ? 'opacity-50' : ''
                  }`}
                >
                  <td className="px-4 py-3 font-medium">{driver.name}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}>
                      {t(`driver.type.${driver.type}`, badge.label)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-black/60 dark:text-white/60">
                    {driver.vehicleId ?? '-'}
                  </td>
                  <td className="px-4 py-3">
                    {isBlocked ? (
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
                        {t('driver.compliance.blocked', 'Blocked')}
                      </span>
                    ) : (
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${compliance.className}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${compliance.dot}`} />
                        {t(`driver.compliance.${driver.complianceStatus}`, compliance.label)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {driver.activeRouteId ? (
                      <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-xs text-[#2563EB]">
                        {driver.activeRouteId}
                      </span>
                    ) : (
                      <span className="text-xs text-green-600 dark:text-green-400">
                        {t('driver.available', 'Available')}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full w-2 h-2 ${
                        driver.available ? 'bg-green-500' : 'bg-black/20 dark:bg-white/20'
                      }`}
                    />
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-black/40 dark:text-white/40">
                  {t('driver.noDrivers', 'No drivers found')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
