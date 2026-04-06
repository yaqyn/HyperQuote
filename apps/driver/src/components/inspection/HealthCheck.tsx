import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useShiftStore, type HealthCheckResult } from '@/stores/shift'
import { DriverCard } from '@/components/shared/DriverCard'
import { DriverButton } from '@/components/shared/DriverButton'

type CheckStatus = 'checking' | 'pass' | 'warn' | 'block'

interface CheckResult {
  label: string
  status: CheckStatus
  message: string
}

async function runHealthChecks(): Promise<HealthCheckResult> {
  // Battery check
  let battery = { level: 100, ok: true, warning: false }
  try {
    const { Device } = await import('@capacitor/device')
    const info = await Device.getBatteryInfo()
    const level = Math.round((info.batteryLevel ?? 1) * 100)
    battery = { level, ok: level >= 50, warning: level < 50 }
  } catch {
    // Web fallback — assume OK
  }

  // GPS check
  let gps = { permitted: true, blocked: false }
  try {
    const { Geolocation } = await import('@capacitor/geolocation')
    const perms = await Geolocation.checkPermissions()
    const granted = perms.location === 'granted' || perms.coarseLocation === 'granted'
    gps = { permitted: granted, blocked: !granted && perms.location === 'denied' }
  } catch {
    gps = { permitted: false, blocked: true }
  }

  // Camera check
  let camera = { permitted: true, warning: false }
  try {
    const { Camera } = await import('@capacitor/camera')
    const perms = await Camera.checkPermissions()
    camera = { permitted: perms.camera === 'granted', warning: perms.camera !== 'granted' }
  } catch {
    camera = { permitted: false, warning: true }
  }

  // App version check
  let appVersion = { current: '1.0.0', ok: true, blocked: false }
  try {
    const { App } = await import('@capacitor/app')
    const info = await App.getInfo()
    appVersion = { current: info.version, ok: true, blocked: false }
  } catch {
    // Web fallback
  }

  return { battery, gps, camera, appVersion }
}

export function HealthCheck() {
  const { t } = useTranslation('driver')
  const setHealthCheck = useShiftStore((s) => s.setHealthCheck)
  const setShiftStep = useShiftStore((s) => s.setShiftStep)
  const [checks, setChecks] = useState<CheckResult[]>([])
  const [hasBlock, setHasBlock] = useState(false)
  const [isDone, setIsDone] = useState(false)

  useEffect(() => {
    let cancelled = false

    runHealthChecks().then((result) => {
      if (cancelled) return
      setHealthCheck(result)

      const results: CheckResult[] = [
        {
          label: t('shift.healthCheck.battery', 'Battery'),
          status: result.battery.warning ? 'warn' : 'pass',
          message: result.battery.warning
            ? t('shift.healthCheck.lowBattery', 'Low battery ({{level}}%)', { level: result.battery.level })
            : `${result.battery.level}%`,
        },
        {
          label: t('shift.healthCheck.gps', 'GPS'),
          status: result.gps.blocked ? 'block' : result.gps.permitted ? 'pass' : 'warn',
          message: result.gps.blocked
            ? t('shift.healthCheck.gpsRequired', 'GPS required')
            : t('shift.healthCheck.gpsOk', 'GPS available'),
        },
        {
          label: t('shift.healthCheck.camera', 'Camera'),
          status: result.camera.warning ? 'warn' : 'pass',
          message: result.camera.warning
            ? t('shift.healthCheck.enableCamera', 'Enable camera for photos')
            : t('shift.healthCheck.cameraOk', 'Camera ready'),
        },
        {
          label: t('shift.healthCheck.appVersion', 'App Version'),
          status: result.appVersion.blocked ? 'block' : 'pass',
          message: result.appVersion.blocked
            ? t('shift.healthCheck.updateRequired', 'Update required')
            : `v${result.appVersion.current}`,
        },
      ]

      setChecks(results)
      const blocked = results.some((r) => r.status === 'block')
      setHasBlock(blocked)
      setIsDone(true)

      // Auto-advance after 2s if no blocks
      if (!blocked) {
        setTimeout(() => {
          if (!cancelled) setShiftStep('vehicle-select')
        }, 2000)
      }
    })

    return () => { cancelled = true }
  }, [setHealthCheck, setShiftStep, t])

  const statusIcon = (status: CheckStatus) => {
    switch (status) {
      case 'checking': return <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-[var(--color-blue)] border-t-transparent" />
      case 'pass': return <span className="text-[var(--color-success)] text-xl">&#10003;</span>
      case 'warn': return <span className="text-[var(--color-warning)] text-xl">&#9888;</span>
      case 'block': return <span className="text-[var(--color-danger)] text-xl">&#10005;</span>
    }
  }

  const handleOpenSettings = async () => {
    try {
      const { Geolocation } = await import('@capacitor/geolocation')
      await Geolocation.requestPermissions()
    } catch {
      // Fallback
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <h2 className="text-xl font-semibold">
        {t('shift.healthCheck.title', 'Device Health Check')}
      </h2>

      <DriverCard>
        <div className="flex flex-col gap-3">
          {checks.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[var(--color-blue)] border-t-transparent" />
              <span className="ms-3">{t('common.loading')}</span>
            </div>
          ) : (
            checks.map((check) => (
              <div key={check.label} className="flex items-center gap-3 py-2">
                <div className="w-8 flex-shrink-0 text-center">{statusIcon(check.status)}</div>
                <div className="flex-1">
                  <div className="font-medium">{check.label}</div>
                  <div className="text-sm text-[var(--text-secondary)]">{check.message}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </DriverCard>

      {hasBlock && isDone && (
        <div className="flex flex-col gap-3">
          {checks.find((c) => c.label.includes('GPS') && c.status === 'block') && (
            <DriverButton variant="secondary" onPress={handleOpenSettings}>
              {t('shift.healthCheck.openSettings', 'Open Settings')}
            </DriverButton>
          )}
        </div>
      )}

      {!hasBlock && isDone && (
        <p className="text-center text-sm text-[var(--text-secondary)]">
          {t('shift.healthCheck.autoAdvance', 'Continuing automatically...')}
        </p>
      )}
    </div>
  )
}
