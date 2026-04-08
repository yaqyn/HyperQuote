/**
 * The Roster — split layout: driver list on left, profile on right.
 * When no driver selected, right panel shows empty state.
 */
import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { getDriverList, getDeliveryAnalytics } from '../../../lib/server/dispatch'
import { DriverList } from './DriverList'
import { DriverProfileCard } from './DriverProfileCard'

export function DriverManagementView() {
  const { t } = useTranslation('dispatch')
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null)

  const { data: drivers } = useQuery({
    queryKey: ['dispatch', 'drivers'],
    queryFn: () => getDriverList(),
    staleTime: 30_000,
  })

  const { data: analytics } = useQuery({
    queryKey: ['dispatch', 'analytics'],
    queryFn: () => getDeliveryAnalytics(),
    staleTime: 60_000,
  })

  if (!drivers) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-black/30 dark:text-white/30">
        {t('common.loading', 'Loading...')}
      </div>
    )
  }

  const selectedDriver = drivers.find((d) => d.id === selectedDriverId)
  const selectedPerformance =
    analytics?.topDrivers.find((p) => p.driverId === selectedDriverId) ?? null

  const complianceSummary = useMemo(() => {
    const blocked = drivers.filter((d) => d.complianceStatus === 'expired' || d.complianceStatus === 'blocked').length
    const expiring = drivers.filter((d) => d.complianceStatus === 'expiring').length
    return { blocked, expiring }
  }, [drivers])

  return (
    <div className="flex h-full flex-col">
      {/* Compliance alert banner */}
      {(complianceSummary.blocked > 0 || complianceSummary.expiring > 0) && (
        <div className="flex items-center gap-4 border-b border-black/[0.06] px-4 py-2.5 dark:border-white/[0.06]">
          {complianceSummary.blocked > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
              <span className="text-xs font-semibold text-red-600 dark:text-red-400">
                <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">{complianceSummary.blocked}</span>
                {' '}{t('driver.blockedDrivers', 'blocked from dispatch')}
              </span>
            </div>
          )}
          {complianceSummary.expiring > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">{complianceSummary.expiring}</span>
                {' '}{t('driver.expiringDocs', 'documents expiring soon')}
              </span>
            </div>
          )}
        </div>
      )}

      <div className="flex min-h-0 flex-1">
      {/* Left: driver list */}
      <div className="w-[340px] shrink-0 overflow-y-auto border-e border-black/[0.06] dark:border-white/[0.06]">
        <DriverList
          drivers={drivers}
          selectedDriverId={selectedDriverId}
          onSelectDriver={setSelectedDriverId}
        />
      </div>

      {/* Right: profile or empty state */}
      <div className="min-w-0 flex-1 overflow-y-auto">
        {selectedDriver ? (
          <DriverProfileCard
            driver={selectedDriver}
            performance={selectedPerformance}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-black/20 dark:text-white/20">
            <svg className="mb-3 h-10 w-10" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
            </svg>
            <p className="text-sm">{t('driver.selectPrompt', 'Select a driver')}</p>
          </div>
        )}
      </div>
      </div>
    </div>
  )
}
