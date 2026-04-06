import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'
import { animate } from 'motion'
import { scanBarcode, checkScanPermission } from '@/lib/barcode'
import { useLoadingStore } from '@/stores/loading'
import { DriverButton } from '@/components/shared/DriverButton'

interface BarcodeScannerProps {
  itemId: string
  expectedBarcode: string | null
  onScanComplete?: (matched: boolean) => void
}

export function BarcodeScanner({
  itemId,
  expectedBarcode,
  onScanComplete,
}: BarcodeScannerProps) {
  const { t } = useTranslation('driver')
  const recordScan = useLoadingStore((s) => s.recordScan)
  const [isScanning, setIsScanning] = useState(false)
  const [lastResult, setLastResult] = useState<'match' | 'mismatch' | null>(null)
  const [permissionDenied, setPermissionDenied] = useState(false)

  async function handleScan() {
    setIsScanning(true)
    setLastResult(null)

    try {
      const hasPermission = await checkScanPermission()
      if (!hasPermission) {
        setPermissionDenied(true)
        setIsScanning(false)
        return
      }

      const barcode = await scanBarcode()
      if (!barcode) {
        setIsScanning(false)
        return
      }

      const matched = expectedBarcode ? barcode === expectedBarcode : false
      recordScan(barcode, itemId, matched)
      setLastResult(matched ? 'match' : 'mismatch')

      if (matched) {
        try {
          await Haptics.impact({ style: ImpactStyle.Light })
        } catch {
          // Haptics not available in web
        }
        // Spring animation for checkmark
        const el = document.getElementById(`scan-result-${itemId}`)
        if (el) {
          animate(el, { scale: [0, 1.2, 1], opacity: [0, 1] }, {
            type: 'spring',
            stiffness: 200,
            damping: 20,
          })
        }
      } else {
        try {
          await Haptics.notification({ type: NotificationType.Error })
        } catch {
          // Haptics not available in web
        }
      }

      onScanComplete?.(matched)
    } catch {
      // Scanner error
    } finally {
      setIsScanning(false)
    }
  }

  if (permissionDenied) {
    return (
      <div className="rounded-xl bg-[var(--color-danger)]/10 p-3 text-center">
        <p className="text-sm text-[var(--color-danger)]">
          {t('loading.cameraPermissionDenied', 'Camera permission denied')}
        </p>
        <button
          type="button"
          className="mt-2 text-sm font-medium text-[var(--color-blue)] underline"
          onClick={() => {
            // On native, this would open app settings
            setPermissionDenied(false)
          }}
        >
          {t('loading.openSettings', 'Open Settings')}
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <DriverButton
        variant="primary"
        onPress={handleScan}
        isDisabled={isScanning}
        isLoading={isScanning}
        className="!w-auto !min-h-[56px] px-4"
      >
        {t('loading.scan', 'Scan')}
      </DriverButton>

      {/* Scan result feedback */}
      {lastResult === 'match' && (
        <div
          id={`scan-result-${itemId}`}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500"
          aria-label={t('loading.scanMatch', 'Barcode matched')}
        >
          <svg className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      )}

      {lastResult === 'mismatch' && (
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-danger)]">
            <svg className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <span className="text-sm text-[var(--color-danger)]">
            {t('loading.scanMismatch', 'Barcode does not match any item')}
          </span>
        </div>
      )}
    </div>
  )
}
