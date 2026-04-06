/**
 * Driver management view — driver list + profile card.
 * Loads drivers from getDriverList and performance from getDeliveryAnalytics.
 * Click driver row -> show DriverProfileCard.
 */
import { useState } from 'react'
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
      <div className="p-6 text-center text-black/40 dark:text-white/40">
        {t('common.loading', 'Loading...')}
      </div>
    )
  }

  // Find selected driver and their performance
  const selectedDriver = drivers.find((d) => d.id === selectedDriverId)
  const selectedPerformance = analytics?.topDrivers.find((p) => p.driverId === selectedDriverId) ?? null

  if (selectedDriver) {
    return (
      <DriverProfileCard
        driver={selectedDriver}
        performance={selectedPerformance}
        onBack={() => setSelectedDriverId(null)}
      />
    )
  }

  return (
    <div className="p-6">
      <DriverList
        drivers={drivers}
        onSelectDriver={setSelectedDriverId}
      />
    </div>
  )
}
