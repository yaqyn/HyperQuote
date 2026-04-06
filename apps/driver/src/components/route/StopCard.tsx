import { useTranslation } from 'react-i18next'
import { useNavigate } from '@tanstack/react-router'
import { Button as AriaButton } from 'react-aria-components'
import { StopStatusBadge } from './StopStatusBadge'
import { launchNavigation } from '@/lib/navigation'
import { useRouteStore, type RouteStop } from '@/stores/route'
import { useState } from 'react'

interface StopCardProps {
  stop: RouteStop
  isCurrent: boolean
}

const unloadingIcons: Record<string, string> = {
  moffett: '\u{1F6A7}',   // forklift
  boom: '\u{1F3D7}',       // crane
  manual: '\u{1F91A}',     // hands
  site_equipment: '\u{2699}', // gear
}

export function StopCard({ stop, isCurrent }: StopCardProps) {
  const { t } = useTranslation('driver')
  const navigate = useNavigate()
  const skipStop = useRouteStore((s) => s.skipStop)
  const [showSkipConfirm, setShowSkipConfirm] = useState(false)

  const handleNavigate = async (e: { stopPropagation: () => void }) => {
    e.stopPropagation()
    const launched = await launchNavigation(stop.lat, stop.lng, stop.customer_name)
    if (!launched) {
      // No nav app available -- handled in stop detail
    }
  }

  const handleSkip = (e: { stopPropagation: () => void }) => {
    e.stopPropagation()
    setShowSkipConfirm(true)
  }

  const confirmSkip = async (e: { stopPropagation: () => void }) => {
    e.stopPropagation()
    await skipStop(stop.id)
    setShowSkipConfirm(false)
  }

  const cancelSkip = (e: { stopPropagation: () => void }) => {
    e.stopPropagation()
    setShowSkipConfirm(false)
  }

  return (
    <AriaButton
      onPress={() => navigate({ to: '/stop-detail/$stopId', params: { stopId: stop.id } })}
      className={`
        flex w-full min-h-[56px] items-start gap-3 rounded-xl p-3
        bg-[var(--bg-primary)] border border-[var(--border-color)]
        text-start outline-none
        focus-visible:ring-2 focus-visible:ring-[var(--color-blue)]
        ${isCurrent ? 'border-s-4 border-s-[#2563EB]' : ''}
      `.trim()}
    >
      {/* Stop number */}
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-blue)]/10 text-sm font-bold text-[var(--color-blue)]"
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        {stop.stop_order}
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="text-base font-semibold">{stop.customer_name}</span>
          <StopStatusBadge status={stop.status} />
        </div>

        <span className="text-sm text-[var(--text-secondary)]">{stop.address}</span>

        <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <span style={{ fontFamily: 'var(--font-mono)' }} className="font-medium">
            {t('home.eta')} {stop.eta}
          </span>
          {stop.unloading_method && (
            <>
              <span className="text-[var(--text-tertiary)]">|</span>
              <span>
                {unloadingIcons[stop.unloading_method] ?? ''}{' '}
                {t(`stopDetail.${stop.unloading_method}`, stop.unloading_method)}
              </span>
            </>
          )}
        </div>

        {/* Action buttons */}
        {stop.status !== 'completed' && stop.status !== 'skipped' && (
          <div className="mt-2 flex gap-2">
            <AriaButton
              onPress={handleNavigate}
              className="rounded-lg bg-[var(--color-blue)] px-3 py-1.5 text-xs font-medium text-white outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-blue)]"
            >
              {t('route.navigate')}
            </AriaButton>

            {!showSkipConfirm ? (
              <AriaButton
                onPress={handleSkip}
                className="rounded-lg border border-[var(--border-color)] px-3 py-1.5 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-blue)]"
              >
                {t('route.skipStop')}
              </AriaButton>
            ) : (
              <div className="flex gap-1">
                <AriaButton
                  onPress={confirmSkip}
                  className="rounded-lg bg-[var(--color-danger,#EF4444)] px-3 py-1.5 text-xs font-medium text-white outline-none"
                >
                  {t('route.skipConfirm')}
                </AriaButton>
                <AriaButton
                  onPress={cancelSkip}
                  className="rounded-lg border border-[var(--border-color)] px-3 py-1.5 text-xs font-medium outline-none"
                >
                  {t('common.cancel')}
                </AriaButton>
              </div>
            )}
          </div>
        )}
      </div>
    </AriaButton>
  )
}
