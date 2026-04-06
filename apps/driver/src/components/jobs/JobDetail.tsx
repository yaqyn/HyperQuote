import { useState } from 'react'
import type { DriverJob } from '@/stores/external-driver'
import { DriverCard } from '@/components/shared/DriverCard'
import { DriverButton } from '@/components/shared/DriverButton'
import { CountdownTimer } from './CountdownTimer'
import { useTranslation } from 'react-i18next'
import { TextField, Input, Label } from 'react-aria-components'

interface JobDetailProps {
  job: DriverJob
  onAccept: () => void
  onDecline: (reason?: string) => void
}

function formatAmount(amount: number, locale: string): string {
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-EG', {
    style: 'currency',
    currency: 'EGP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatNum(num: number, locale: string): string {
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-EG').format(num)
}

export function JobDetail({ job, onAccept, onDecline }: JobDetailProps) {
  const { t, i18n } = useTranslation('driver')
  const locale = i18n.language

  const [showConfirm, setShowConfirm] = useState(false)
  const [showDecline, setShowDecline] = useState(false)
  const [declineReason, setDeclineReason] = useState('')
  const [isAccepting, setIsAccepting] = useState(false)

  const handleAcceptConfirm = async () => {
    setIsAccepting(true)
    try {
      onAccept()
    } finally {
      setIsAccepting(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--bg-primary)] pb-[var(--safe-bottom)]">
      <div className="flex-1 overflow-y-auto px-4 pt-[var(--safe-top)]">
        <div className="flex flex-col gap-4">
          {/* Section 1: Payout + Countdown */}
          <DriverCard>
            <div className="flex items-center justify-between">
              <span className="font-[var(--font-mono)] text-3xl font-bold text-[var(--color-blue)]">
                {formatAmount(job.payoutAmount, locale)}
              </span>
              <CountdownTimer expiresAt={job.expiresAt} />
            </div>
          </DriverCard>

          {/* Section 2: Pickup */}
          <DriverCard
            header={
              <span className="text-sm font-medium text-[var(--text-secondary)]">
                {t('jobs.pickup', 'Pickup Location')}
              </span>
            }
          >
            <p className="text-base">{job.pickupAddress}</p>
            <div className="mt-3 flex h-32 items-center justify-center rounded-xl bg-[var(--bg-secondary)]">
              <span className="text-sm text-[var(--text-tertiary)]">{t('jobs.mapPlaceholder', 'Map')}</span>
            </div>
          </DriverCard>

          {/* Section 3: Delivery + Distance */}
          <DriverCard
            header={
              <span className="text-sm font-medium text-[var(--text-secondary)]">
                {t('jobs.delivery', 'Delivery Location')}
              </span>
            }
          >
            <p className="text-base">{job.deliveryAddress}</p>
            <div className="mt-2 flex items-center gap-4 text-sm text-[var(--text-secondary)]">
              <span>
                <span className="font-[var(--font-mono)]">{formatNum(job.estimatedDistanceKm, locale)}</span>{' '}
                {t('jobs.km', 'km')}
              </span>
              <span>
                <span className="font-[var(--font-mono)]">{formatNum(job.estimatedDurationMinutes, locale)}</span>{' '}
                {t('jobs.min', 'min')}
              </span>
            </div>
          </DriverCard>

          {/* Section 4: Materials */}
          <DriverCard
            header={
              <span className="text-sm font-medium text-[var(--text-secondary)]">
                {t('jobs.materials', 'Materials')}
              </span>
            }
          >
            <p className="text-base">{job.materialsSummary}</p>
            <div className="mt-2 flex items-center gap-4 text-sm text-[var(--text-secondary)]">
              <span>
                {t('jobs.totalWeight', 'Total weight:')}{' '}
                <span className="font-[var(--font-mono)]">{formatNum(job.totalWeightKg, locale)}</span>{' '}
                {t('jobs.kg', 'kg')}
              </span>
            </div>
            {(job.requiresMoffett || job.requiresBoom) && (
              <div className="mt-2 flex gap-2">
                {job.requiresMoffett && (
                  <span className="rounded-full bg-[var(--color-blue)]/10 px-2 py-0.5 text-xs font-medium text-[var(--color-blue)]">
                    {t('jobs.moffett', 'Moffett')}
                  </span>
                )}
                {job.requiresBoom && (
                  <span className="rounded-full bg-[var(--color-blue)]/10 px-2 py-0.5 text-xs font-medium text-[var(--color-blue)]">
                    {t('jobs.boom', 'Boom')}
                  </span>
                )}
              </div>
            )}
          </DriverCard>
        </div>
      </div>

      {/* Fixed bottom actions */}
      <div className="border-t border-[var(--border-color)] px-4 py-4">
        <div className="flex flex-col gap-3">
          {!showConfirm && !showDecline && (
            <>
              <DriverButton
                className="min-h-[56px]"
                onPress={() => setShowConfirm(true)}
              >
                {t('jobs.acceptJob', 'Accept Job')}
              </DriverButton>
              <DriverButton
                variant="secondary"
                onPress={() => setShowDecline(true)}
              >
                {t('jobs.decline', 'Decline')}
              </DriverButton>
            </>
          )}

          {/* Accept confirmation overlay */}
          {showConfirm && (
            <DriverCard>
              <div className="flex flex-col gap-3">
                <p className="text-sm font-medium">{t('jobs.confirmAccept', 'Confirm acceptance?')}</p>
                <div className="text-sm text-[var(--text-secondary)]">
                  <p>
                    {t('jobs.payout', 'Payout:')}{' '}
                    <span className="font-[var(--font-mono)] font-bold text-[var(--color-blue)]">
                      {formatAmount(job.payoutAmount, locale)}
                    </span>
                  </p>
                  <p className="mt-1">{t('jobs.deliveryTo', 'Deliver to:')} {job.deliveryAddress}</p>
                </div>
                <div className="flex gap-3">
                  <DriverButton
                    variant="secondary"
                    className="flex-1"
                    onPress={() => setShowConfirm(false)}
                  >
                    {t('common.cancel', 'Cancel')}
                  </DriverButton>
                  <DriverButton
                    className="flex-1 min-h-[56px]"
                    isLoading={isAccepting}
                    onPress={handleAcceptConfirm}
                  >
                    {t('jobs.confirmAcceptBtn', 'Confirm Accept')}
                  </DriverButton>
                </div>
              </div>
            </DriverCard>
          )}

          {/* Decline with reason */}
          {showDecline && (
            <DriverCard>
              <div className="flex flex-col gap-3">
                <p className="text-sm font-medium">{t('jobs.declineReason', 'Reason (optional)')}</p>
                <TextField
                  value={declineReason}
                  onChange={setDeclineReason}
                >
                  <Label className="sr-only">{t('jobs.declineReason', 'Reason')}</Label>
                  <Input
                    className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 py-3 text-base outline-none focus:ring-2 focus:ring-[var(--color-blue)]"
                    placeholder={t('jobs.declinePlaceholder', 'Too far, schedule conflict...')}
                  />
                </TextField>
                <div className="flex gap-3">
                  <DriverButton
                    variant="secondary"
                    className="flex-1"
                    onPress={() => setShowDecline(false)}
                  >
                    {t('common.cancel', 'Cancel')}
                  </DriverButton>
                  <DriverButton
                    variant="danger"
                    className="flex-1"
                    onPress={() => onDecline(declineReason || undefined)}
                  >
                    {t('jobs.confirmDecline', 'Decline Job')}
                  </DriverButton>
                </div>
              </div>
            </DriverCard>
          )}
        </div>
      </div>
    </div>
  )
}
