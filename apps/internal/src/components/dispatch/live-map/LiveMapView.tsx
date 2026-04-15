/**
 * The Radar — full-screen live map with floating controls.
 * Map fills entire content area. Driver sidebar slides from right.
 * Glass pill controls float on top of the map.
 */
import { useState, useCallback, useEffect } from 'react'
import { ClientOnly } from '../../../lib/client-only'
import { Button } from 'react-aria-components'
import { Dialog, Heading, Modal, ModalOverlay } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { useDispatchStore } from '../../../stores/dispatch'
import { useGPSBroadcast } from '../../../hooks/useGPSBroadcast'
import { getDriverLocations, getDispatchBoard, sendDriverMessage } from '../../../lib/server/dispatch'
import { MapSkeleton } from '../shared/MapSkeleton'
import { DriverSidebar } from './DriverSidebar'
import { VehicleMap } from './VehicleMap'
import { UnderlineInput } from '../../ui'
import { Button as UIButton } from '../../ui'
import type { GPSPosition, DeliveryRoute, Driver } from '../../../types/dispatch'

export function LiveMapView() {
  const { t } = useTranslation('dispatch')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const selectedDriverId = useDispatchStore((s) => s.selectedDriverId)
  const setSelectedDriverId = useDispatchStore((s) => s.setSelectedDriverId)
  const setMapViewport = useDispatchStore((s) => s.setMapViewport)

  const [initialPositions, setInitialPositions] = useState<GPSPosition[]>([])
  const [routes, setRoutes] = useState<DeliveryRoute[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const [posData, boardData] = await Promise.all([
          getDriverLocations(),
          getDispatchBoard(),
        ])
        if (cancelled) return
        setInitialPositions(posData)
        setRoutes(boardData.routes)
        setDrivers(
          boardData.routes
            .filter((r) => r.driverId)
            .map((r) => ({
              id: r.driverId,
              name: r.driverId,
              type: 'INTERNAL' as const,
              phone: '',
              vehicleId: r.vehicleId,
              licenseExpiry: '',
              medicalExpiry: '',
              certifications: [],
              complianceStatus: 'valid' as const,
              activeRouteId: r.id,
              available: false,
            })),
        )
      } catch {
        // Dev mode may not have server
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    async function loadDrivers() {
      try {
        const { getDriverList } = await import('../../../lib/server/dispatch')
        const driverList = await getDriverList()
        if (!cancelled) setDrivers(driverList)
      } catch {
        // Fall back to route-derived drivers
      }
    }

    void load()
    void loadDrivers()
    return () => { cancelled = true }
  }, [])

  const positions = useGPSBroadcast(null, initialPositions)

  // ─── Driver Message Dialog ─────────────────────────────
  const [messageTarget, setMessageTarget] = useState<{ driverId: string; driverName: string } | null>(null)
  const [messageText, setMessageText] = useState('')
  const [messageSending, setMessageSending] = useState(false)

  useEffect(() => {
    function handleDispatchMessage(e: Event) {
      const detail = (e as CustomEvent<{ driverId: string; driverName: string }>).detail
      setMessageTarget(detail)
      setMessageText('')
    }
    window.addEventListener('dispatch-message', handleDispatchMessage)
    return () => window.removeEventListener('dispatch-message', handleDispatchMessage)
  }, [])

  const handleSendMessage = useCallback(async () => {
    if (!messageTarget || !messageText.trim()) return
    setMessageSending(true)
    try {
      await sendDriverMessage({ data: { driverId: messageTarget.driverId, message: messageText.trim() } })
      setMessageTarget(null)
      setMessageText('')
    } catch {
      // Toast would go here in production
    } finally {
      setMessageSending(false)
    }
  }, [messageTarget, messageText])

  const [selectedVehicle, setSelectedVehicle] = useState<GPSPosition | null>(null)
  const [highlightedRouteId, setHighlightedRouteId] = useState<string | null>(null)

  const handleSelectDriver = useCallback(
    (driverId: string) => {
      setSelectedDriverId(driverId)
      const pos = positions.get(driverId)
      if (pos) {
        setMapViewport({ latitude: pos.lat, longitude: pos.lng, zoom: 14 })
        setSelectedVehicle(pos)
        const driverRoute = routes.find((r: DeliveryRoute) => r.driverId === driverId)
        setHighlightedRouteId(driverRoute?.id ?? null)
      }
    },
    [positions, routes, setSelectedDriverId, setMapViewport],
  )

  useEffect(() => {
    if (selectedDriverId) {
      const driverRoute = routes.find((r: DeliveryRoute) => r.driverId === selectedDriverId)
      setHighlightedRouteId(driverRoute?.id ?? null)
    } else {
      setHighlightedRouteId(null)
    }
  }, [selectedDriverId, routes])

  const handleSelectVehicle = useCallback(
    (pos: GPSPosition | null) => {
      setSelectedVehicle(pos)
      if (pos) {
        setSelectedDriverId(pos.driverId)
        const driverRoute = routes.find((r: DeliveryRoute) => r.driverId === pos.driverId)
        setHighlightedRouteId(driverRoute?.id ?? null)
      } else {
        setSelectedDriverId(null)
        setHighlightedRouteId(null)
      }
    },
    [routes, setSelectedDriverId],
  )

  return (
    <div className="relative flex h-full">
      {/* Full-bleed map */}
      <div className="flex-1 relative">
        {/* Floating sidebar toggle — glass pill */}
        <div className="absolute top-3 end-3 z-10 flex gap-2">
          <Button
            aria-label={sidebarOpen ? t('closeSidebar', 'Close sidebar') : t('openSidebar', 'Open sidebar')}
            onPress={() => setSidebarOpen((c: boolean) => !c)}
            className="flex h-8 items-center gap-1.5 rounded-full border border-black/[0.08] bg-white/90 px-3 text-xs font-medium text-black/60 shadow-sm transition-colors hover:text-black dark:border-white/[0.08] dark:bg-black/90 dark:text-white/60 dark:hover:text-white"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
            </svg>
            <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">
              {drivers.length}
            </span>
          </Button>
        </div>

        <ClientOnly fallback={<MapSkeleton className="h-full" />}>
          {loading ? (
            <MapSkeleton className="h-full" />
          ) : (
            <VehicleMap
              positions={positions}
              routes={routes}
              drivers={drivers}
              selectedVehicle={selectedVehicle}
              onSelectVehicle={handleSelectVehicle}
              highlightedRouteId={highlightedRouteId}
            />
          )}
        </ClientOnly>
      </div>

      {/* Right-side driver sidebar — slides in */}
      <DriverSidebar
        open={sidebarOpen}
        drivers={drivers}
        routes={routes}
        positions={positions}
        selectedDriverId={selectedDriverId}
        onSelectDriver={handleSelectDriver}
      />

      {/* Driver message dialog */}
      {messageTarget && (
        <ModalOverlay
          isOpen
          onOpenChange={(open) => { if (!open) setMessageTarget(null) }}
          isDismissable
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/20"
        >
          <Modal className="w-full max-w-sm rounded-2xl border border-black/[0.08] bg-white/95 p-5 shadow-2xl dark:border-white/[0.08] dark:bg-black/95">
            <Dialog className="outline-none">
              {({ close }) => (
                <>
                  <Heading slot="title" className="mb-1 text-sm font-semibold text-black dark:text-white">
                    {t('messageDriver', 'Message Driver')}
                  </Heading>
                  <p className="mb-4 text-xs text-black/50 dark:text-white/50">
                    {messageTarget.driverName}
                  </p>
                  <UnderlineInput
                    label={t('message', 'Message')}
                    value={messageText}
                    onChange={(v: string) => setMessageText(v)}
                    placeholder={t('typeMessage', 'Type your message...')}
                  />
                  <div className="mt-4 flex items-center justify-end gap-2">
                    <UIButton
                      variant="ghost"
                      onPress={() => { setMessageTarget(null); close() }}
                    >
                      {t('cancel', 'Cancel')}
                    </UIButton>
                    <UIButton
                      variant="primary"
                      isDisabled={!messageText.trim() || messageSending}
                      onPress={handleSendMessage}
                    >
                      {messageSending ? t('sending', 'Sending...') : t('send', 'Send')}
                    </UIButton>
                  </div>
                </>
              )}
            </Dialog>
          </Modal>
        </ModalOverlay>
      )}
    </div>
  )
}
