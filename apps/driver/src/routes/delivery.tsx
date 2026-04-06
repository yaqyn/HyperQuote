import { createFileRoute, useNavigate, useParams } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useDeliveryStore } from '../stores/delivery'
import { DriverButton } from '../components/shared/DriverButton'
import { LineItemList } from '../components/delivery/LineItemList'
import { UnloadingTimer } from '../components/delivery/UnloadingTimer'

export const Route = createFileRoute('/delivery/$deliveryId')({
  component: DeliveryScreen,
})

function DeliveryScreen() {
  const { t } = useTranslation('driver')
  const navigate = useNavigate()
  const { deliveryId } = useParams({ from: '/delivery/$deliveryId' })

  const loadDelivery = useDeliveryStore((s) => s.loadDelivery)
  const completeDelivery = useDeliveryStore((s) => s.completeDelivery)
  const stopUnloadingTimer = useDeliveryStore((s) => s.stopUnloadingTimer)
  const activeDelivery = useDeliveryStore((s) => s.activeDelivery)
  const allItemsResolved = useDeliveryStore((s) => s.allItemsResolved)
  const items = useDeliveryStore((s) => s.items)

  useEffect(() => {
    loadDelivery(deliveryId)
    return () => {
      stopUnloadingTimer()
    }
  }, [deliveryId, loadDelivery, stopUnloadingTimer])

  async function handleComplete() {
    stopUnloadingTimer()
    await completeDelivery()
    navigate({ to: '/pod/$deliveryId', params: { deliveryId } })
  }

  if (!activeDelivery) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <span className="text-[var(--text-secondary)]">{t('common.loading')}</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-secondary)]">
      {/* Header */}
      <header className="bg-[var(--bg-primary)] px-4 py-4 border-b border-[var(--border-color)]">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-[var(--text-primary)]">
              {t('delivery.title')}
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              {t('stopDetail.customerName')}: {activeDelivery.customer_id}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-[var(--color-blue)]">
              {activeDelivery.status}
            </span>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Unloading Timer */}
        <UnloadingTimer />

        {/* Line Items */}
        <LineItemList />
      </div>

      {/* Footer: Mark complete */}
      <div className="bg-[var(--bg-primary)] px-4 py-4 border-t border-[var(--border-color)] safe-area-bottom">
        {!allItemsResolved && (
          <p className="text-center text-xs text-[var(--text-secondary)] mb-2">
            {t('delivery.allItemsRequired')}
          </p>
        )}
        <DriverButton
          variant="primary"
          onPress={handleComplete}
          isDisabled={!allItemsResolved}
          className="min-h-[56px]"
        >
          {t('delivery.markComplete')}
        </DriverButton>
      </div>
    </div>
  )
}
