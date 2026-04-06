import { useEffect, useState } from 'react'
import { RadioGroup, Radio, Label } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { useExceptionStore } from '../../stores/exception'
import { DriverCard } from '../shared/DriverCard'
import { DriverButton } from '../shared/DriverButton'

const WAIT_DURATION_MS = 15 * 60 * 1000 // 15 minutes

export function CustomerUnavailable() {
  const { t, i18n } = useTranslation('driver')
  const details = useExceptionStore((s) => s.details)
  const setDetails = useExceptionStore((s) => s.setDetails)
  const nextStep = useExceptionStore((s) => s.nextStep)

  // Timer state: store waitStartedAt as ISO timestamp in details
  const waitStartedAt = details.waitStartedAt as string | undefined
  const [remainingMs, setRemainingMs] = useState<number>(WAIT_DURATION_MS)

  // Start the 15-minute timer (timestamp-based, survives backgrounding)
  const startWait = () => {
    if (!waitStartedAt) {
      setDetails('waitStartedAt', new Date().toISOString())
    }
  }

  // Compute remaining time from stored timestamp
  useEffect(() => {
    if (!waitStartedAt) {
      setRemainingMs(WAIT_DURATION_MS)
      return
    }

    const update = () => {
      const elapsed = Date.now() - new Date(waitStartedAt).getTime()
      const remaining = Math.max(0, WAIT_DURATION_MS - elapsed)
      setRemainingMs(remaining)
    }

    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [waitStartedAt])

  const formatTime = (ms: number) => {
    const totalSeconds = Math.ceil(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    const formatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    return i18n.language === 'ar'
      ? new Intl.NumberFormat('ar-EG').format(minutes).padStart(2, '\u0660') +
        ':' +
        new Intl.NumberFormat('ar-EG').format(seconds).padStart(2, '\u0660')
      : formatted
  }

  const timerExpired = remainingMs === 0
  const calledContact = details.calledContact as string | undefined
  const triedAlternate = details.triedAlternate as string | undefined
  const responseReceived = details.responseReceived as string | undefined

  const handleResolution = (resolution: 'wait' | 'skip' | 'failed') => {
    setDetails('resolution', resolution)
    nextStep()
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Step 1: Called site contact? */}
      <DriverCard>
        <RadioGroup
          value={calledContact ?? ''}
          onChange={(val) => setDetails('calledContact', val)}
        >
          <Label className="block text-sm font-medium mb-2">
            {t('exception.customerUnavailable.calledContact')}
          </Label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 min-h-[56px] cursor-pointer">
              <Radio value="yes" className="h-5 w-5 accent-[var(--color-blue)]" />
              <span className="text-sm">{t('common.yes')}</span>
            </label>
            <label className="flex items-center gap-2 min-h-[56px] cursor-pointer">
              <Radio value="no" className="h-5 w-5 accent-[var(--color-blue)]" />
              <span className="text-sm">{t('common.no')}</span>
            </label>
          </div>
        </RadioGroup>
      </DriverCard>

      {/* Step 2: Tried alternate contact? */}
      <DriverCard>
        <RadioGroup
          value={triedAlternate ?? ''}
          onChange={(val) => setDetails('triedAlternate', val)}
        >
          <Label className="block text-sm font-medium mb-2">
            {t('exception.customerUnavailable.triedAlternate')}
          </Label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 min-h-[56px] cursor-pointer">
              <Radio value="yes" className="h-5 w-5 accent-[var(--color-blue)]" />
              <span className="text-sm">{t('common.yes')}</span>
            </label>
            <label className="flex items-center gap-2 min-h-[56px] cursor-pointer">
              <Radio value="no" className="h-5 w-5 accent-[var(--color-blue)]" />
              <span className="text-sm">{t('common.no')}</span>
            </label>
          </div>
        </RadioGroup>
      </DriverCard>

      {/* Step 3: Response received? */}
      <DriverCard>
        <RadioGroup
          value={responseReceived ?? ''}
          onChange={(val) => setDetails('responseReceived', val)}
        >
          <Label className="block text-sm font-medium mb-2">
            {t('exception.customerUnavailable.responseReceived')}
          </Label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 min-h-[56px] cursor-pointer">
              <Radio value="yes" className="h-5 w-5 accent-[var(--color-blue)]" />
              <span className="text-sm">{t('common.yes')}</span>
            </label>
            <label className="flex items-center gap-2 min-h-[56px] cursor-pointer">
              <Radio value="no" className="h-5 w-5 accent-[var(--color-blue)]" />
              <span className="text-sm">{t('common.no')}</span>
            </label>
          </div>
        </RadioGroup>
      </DriverCard>

      {/* Step 4: 15-minute mandatory wait timer */}
      <DriverCard>
        <div className="flex flex-col items-center gap-3 py-4">
          <span className="text-sm font-medium text-[var(--text-secondary)]">
            {t('exception.customerUnavailable.mandatoryWait')}
          </span>

          <span
            className="text-3xl font-bold"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            {waitStartedAt ? formatTime(remainingMs) : formatTime(WAIT_DURATION_MS)}
          </span>

          {!waitStartedAt && (
            <DriverButton variant="primary" onPress={startWait}>
              {t('exception.customerUnavailable.startTimer')}
            </DriverButton>
          )}

          {waitStartedAt && !timerExpired && (
            <span className="text-xs text-[var(--text-tertiary)]">
              {t('exception.customerUnavailable.impactCalculating')}
            </span>
          )}

          {timerExpired && (
            <span className="text-xs font-medium text-[var(--color-blue)]">
              {t('exception.customerUnavailable.timerComplete')}
            </span>
          )}
        </div>
      </DriverCard>

      {/* Step 5: Actions */}
      <div className="flex flex-col gap-2">
        <DriverButton
          variant="secondary"
          onPress={() => handleResolution('wait')}
          isDisabled={!waitStartedAt}
        >
          {t('exception.customerUnavailable.wait')}
        </DriverButton>
        <DriverButton
          variant="secondary"
          onPress={() => handleResolution('skip')}
        >
          {t('exception.customerUnavailable.skipReturnLater')}
        </DriverButton>
        <DriverButton
          variant="danger"
          onPress={() => handleResolution('failed')}
        >
          {t('exception.customerUnavailable.markFailed')}
        </DriverButton>
      </div>
    </div>
  )
}
