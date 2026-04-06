import { createRoute, useNavigate } from '@tanstack/react-router'
import { Route as rootRoute } from './__root'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouteStore, type RouteStop } from '@/stores/route'
import { useDeliveryStore, type DeliveryItem } from '@/stores/delivery'
import { useShiftStore } from '@/stores/shift'
import { isCairoTruckBanActive } from '@/lib/truck-ban'
import { launchNavigation } from '@/lib/navigation'
import { onGeofenceEvent } from '@/lib/geofence'
import { DriverButton } from '@/components/shared/DriverButton'
import { DriverCard } from '@/components/shared/DriverCard'

function StopDetailPage() {
  const { t, i18n } = useTranslation('driver')
  const navigate = useNavigate()
  const { stopId } = Route.useParams()

  const stops = useRouteStore((s) => s.stops)
  const currentStopId = useRouteStore((s) => s.currentStopId)
  const recordArrival = useRouteStore((s) => s.recordArrival)
  const loadDelivery = useDeliveryStore((s) => s.loadDelivery)
  const items = useDeliveryStore((s) => s.items)
  const selectedVehicle = useShiftStore((s) => s.selectedVehicle)

  const [ppeChecked, setPpeChecked] = useState(false)
  const [showNoNavDialog, setShowNoNavDialog] = useState(false)
  const [previousNotesExpanded, setPreviousNotesExpanded] = useState(false)
  const [isArriving, setIsArriving] = useState(false)

  const stop = stops.find((s) => s.id === stopId) as RouteStop | undefined

  // Load delivery items
  useEffect(() => {
    if (stop?.delivery_id) {
      loadDelivery(stop.delivery_id)
    }
  }, [stop?.delivery_id, loadDelivery])

  // Geofence auto-expand: listen for ENTER on this stop
  useEffect(() => {
    if (!stopId) return

    const subscription = onGeofenceEvent((event) => {
      if (event.identifier === stopId && event.action === 'ENTER') {
        // Auto-navigated here -- no further action needed
      }
    })

    return () => {
      subscription.remove()
    }
  }, [stopId])

  if (!stop) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <span className="text-[var(--text-secondary)]">{t('common.loading')}</span>
      </div>
    )
  }

  // Truck ban check
  const vehicleWeightKg = selectedVehicle?.capacity_kg
    ? Number.parseInt(selectedVehicle.capacity_kg, 10)
    : 0
  const truckBan = isCairoTruckBanActive(stop.lat, stop.lng, vehicleWeightKg)

  // Delivery window status
  const getDeliveryWindowStatus = () => {
    if (!stop.delivery_window_end) return null
    const now = Date.now()
    const end = new Date(stop.delivery_window_end).getTime()
    const diff = end - now
    const thirtyMin = 30 * 60 * 1000

    if (diff < 0) return 'late'
    if (diff < thirtyMin) return 'soon'
    return 'onTime'
  }

  const windowStatus = getDeliveryWindowStatus()

  const windowStatusColor =
    windowStatus === 'late'
      ? '#EF4444'
      : windowStatus === 'soon'
        ? '#F59E0B'
        : '#22C55E'

  // Number formatter
  const formatNumber = (num: number) =>
    new Intl.NumberFormat(i18n.language === 'ar' ? 'ar-EG' : 'en', {
      useGrouping: true,
    }).format(num)

  // Mask phone: show first 4 and last 2 digits
  const maskPhone = (phone: string) => {
    if (!phone || phone.length < 6) return phone
    return `${phone.slice(0, 4)}${'*'.repeat(phone.length - 6)}${phone.slice(-2)}`
  }

  const handleNavigate = async () => {
    const launched = await launchNavigation(stop.lat, stop.lng, stop.customer_name)
    if (!launched) {
      setShowNoNavDialog(true)
    }
  }

  const handleArrival = async () => {
    if (!ppeChecked) return
    setIsArriving(true)
    try {
      // Get current GPS
      let lat = stop.lat
      let lng = stop.lng
      try {
        const { getCurrentPosition } = await import('@/lib/geofence')
        const pos = await getCurrentPosition()
        lat = pos.lat
        lng = pos.lng
      } catch {
        // Use stop coordinates as fallback
      }

      await recordArrival(stop.id, lat, lng)

      // Navigate to delivery screen
      if (stop.delivery_id) {
        navigate({ to: '/home' }) // delivery screen is Phase 25-03
      }
    } finally {
      setIsArriving(false)
    }
  }

  const unloadingIcons: Record<string, string> = {
    moffett: '\u{1F6A7}',
    boom: '\u{1F3D7}',
    manual: '\u{1F91A}',
    site_equipment: '\u{2699}',
  }

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--bg-primary)] pb-[var(--safe-bottom)]">
      {/* Truck ban banner */}
      {truckBan.banned && (
        <div className="bg-[#EF4444] px-4 py-2 text-center text-sm font-medium text-white">
          {t('truckBan.active')}
        </div>
      )}
      {truckBan.nightWindow && !truckBan.banned && (
        <div className="bg-[var(--text-tertiary)] px-4 py-2 text-center text-sm font-medium text-white">
          {t('truckBan.nightWindow')}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-[var(--safe-top)] pb-2">
        <button
          type="button"
          onClick={() => navigate({ to: '/route-overview' })}
          className="text-sm font-medium text-[var(--color-blue)]"
        >
          {t('common.back')}
        </button>
        <span className="text-sm font-medium" style={{ fontFamily: 'var(--font-mono)' }}>
          #{stop.stop_order}
        </span>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4">
        <div className="flex flex-col gap-4">
          {/* Customer info */}
          <DriverCard>
            <div className="flex flex-col gap-2">
              <h2 className="text-lg font-semibold">{stop.customer_name}</h2>
              <p className="text-sm text-[var(--text-secondary)]">{stop.address}</p>

              {/* Site contact */}
              {stop.contact_phone && (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-[var(--text-secondary)]">
                    <span className="font-medium">{t('stopDetail.contactPhone')}: </span>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>
                      {maskPhone(stop.contact_phone)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => window.open(`tel:${stop.contact_phone}`)}
                    className="rounded-lg bg-[var(--color-blue)]/10 px-3 py-1 text-xs font-medium text-[var(--color-blue)]"
                  >
                    {t('stopDetail.call')}
                  </button>
                </div>
              )}

              {/* Delivery window */}
              {stop.delivery_window_start && stop.delivery_window_end && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-[var(--text-secondary)]">{t('stopDetail.deliveryWindow')}:</span>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>
                    {stop.delivery_window_start} - {stop.delivery_window_end}
                  </span>
                  {windowStatus && (
                    <span
                      className="rounded-full px-2 py-0.5 text-xs font-medium text-white"
                      style={{ backgroundColor: windowStatusColor }}
                    >
                      {t(`stopDetail.${windowStatus}`)}
                    </span>
                  )}
                </div>
              )}
            </div>
          </DriverCard>

          {/* Access instructions */}
          {stop.access_instructions && (
            <DriverCard
              header={
                <span className="text-sm font-medium text-[var(--text-secondary)]">
                  {t('stopDetail.accessInstructions')}
                </span>
              }
            >
              <p className="text-sm">{stop.access_instructions}</p>
            </DriverCard>
          )}

          {/* PPE acknowledgment */}
          {stop.ppe_required && (
            <DriverCard>
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium text-[#EF4444]">
                  {t('stopDetail.ppeRequired')}: {stop.ppe_required}
                </span>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ppeChecked}
                    onChange={(e) => setPpeChecked(e.target.checked)}
                    className="mt-0.5 h-5 w-5 rounded border-2 border-[var(--color-blue)] accent-[var(--color-blue)]"
                  />
                  <span className="text-sm">{t('stopDetail.ppeAcknowledge')}</span>
                </label>
              </div>
            </DriverCard>
          )}

          {/* Unloading method */}
          {stop.unloading_method && (
            <DriverCard
              header={
                <span className="text-sm font-medium text-[var(--text-secondary)]">
                  {t('stopDetail.unloadingMethod')}
                </span>
              }
            >
              <div className="flex items-center gap-2 text-base">
                <span className="text-xl">
                  {unloadingIcons[stop.unloading_method] ?? ''}
                </span>
                <span className="font-medium">
                  {t(`stopDetail.${stop.unloading_method}`, stop.unloading_method)}
                </span>
              </div>
              {stop.notes && (
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  <span className="font-medium">{t('stopDetail.placementInstructions')}: </span>
                  {stop.notes}
                </p>
              )}
            </DriverCard>
          )}

          {/* Previous delivery notes */}
          {stop.previous_delivery_notes && (
            <DriverCard>
              <button
                type="button"
                onClick={() => setPreviousNotesExpanded((p) => !p)}
                className="flex w-full items-center justify-between text-sm font-medium text-[var(--text-secondary)]"
              >
                <span>{t('stopDetail.previousNotes')}</span>
                <span className="text-xs">{previousNotesExpanded ? '▲' : '▼'}</span>
              </button>
              {previousNotesExpanded && (
                <p className="mt-2 text-sm italic">"{stop.previous_delivery_notes}"</p>
              )}
            </DriverCard>
          )}

          {/* Items manifest */}
          {items.length > 0 && (
            <DriverCard
              header={
                <span className="text-sm font-medium text-[var(--text-secondary)]">
                  {t('stopDetail.items')}
                </span>
              }
            >
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border-color)] text-start text-xs text-[var(--text-tertiary)]">
                      <th className="pb-2 ps-0 text-start font-medium">{t('stopDetail.product')}</th>
                      <th className="pb-2 text-end font-medium">{t('stopDetail.quantity')}</th>
                      <th className="pb-2 text-end font-medium">{t('stopDetail.weight')}</th>
                      <th className="pb-2 pe-0 text-end font-medium">{t('stopDetail.unit')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id} className="border-b border-[var(--border-color)]/50">
                        <td className="py-2 ps-0">{item.product_name}</td>
                        <td className="py-2 text-end" style={{ fontFamily: 'var(--font-mono)' }}>
                          {formatNumber(item.quantity_expected)}
                        </td>
                        <td className="py-2 text-end" style={{ fontFamily: 'var(--font-mono)' }}>
                          {/* Weight approximation from quantity */}
                          -
                        </td>
                        <td className="py-2 pe-0 text-end">{item.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </DriverCard>
          )}
        </div>
      </div>

      {/* Action buttons - bottom sticky */}
      <div className="flex flex-col gap-2 border-t border-[var(--border-color)] px-4 pt-3 pb-2">
        <div className="flex gap-2">
          <DriverButton
            variant="secondary"
            className="flex-1"
            onPress={handleNavigate}
          >
            {t('stopDetail.navigate')}
          </DriverButton>

          {stop.contact_phone && (
            <DriverButton
              variant="secondary"
              className="flex-1"
              onPress={() => window.open(`tel:${stop.contact_phone}`)}
            >
              {t('stopDetail.call')}
            </DriverButton>
          )}
        </div>

        <DriverButton
          isDisabled={!ppeChecked && !!stop.ppe_required}
          isLoading={isArriving}
          onPress={handleArrival}
        >
          {t('stopDetail.arrived')}
        </DriverButton>

        <DriverButton
          variant="secondary"
          onPress={() => {
            // Phase 26 stub -- exception report
          }}
        >
          {t('stopDetail.reportIssue')}
        </DriverButton>
      </div>

      {/* No nav app dialog */}
      {showNoNavDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setShowNoNavDialog(false)}
          onKeyDown={(e) => e.key === 'Escape' && setShowNoNavDialog(false)}
        >
          <div
            className="mx-4 rounded-2xl bg-[var(--bg-primary)] p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={() => {}}
          >
            <h3 className="mb-2 text-lg font-semibold">{t('navigation.noNavApp')}</h3>
            <p className="mb-4 text-sm text-[var(--text-secondary)]">
              {t('navigation.downloadSygic')}
            </p>
            <DriverButton onPress={() => setShowNoNavDialog(false)}>
              {t('common.done')}
            </DriverButton>
          </div>
        </div>
      )}
    </div>
  )
}

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/stop-detail/$stopId',
  component: StopDetailPage,
})
