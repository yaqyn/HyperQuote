import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Checkbox } from 'react-aria-components'
import { useShiftStore } from '@/stores/shift'
import { DriverCard } from '@/components/shared/DriverCard'
import { DriverButton } from '@/components/shared/DriverButton'

export function SignOff() {
  const { t } = useTranslation('driver')
  const inspectionItems = useShiftStore((s) => s.inspectionItems)
  const signatureDataUrl = useShiftStore((s) => s.signatureDataUrl)
  const setSignature = useShiftStore((s) => s.setSignature)
  const setGpsLocation = useShiftStore((s) => s.setGpsLocation)
  const submitInspection = useShiftStore((s) => s.submitInspection)
  const startShift = useShiftStore((s) => s.startShift)
  const [confirmed, setConfirmed] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawingRef = useRef(false)
  const lastPointRef = useRef<{ x: number; y: number } | null>(null)

  const passCount = inspectionItems.filter((i) => i.status === 'pass').length
  const failCount = inspectionItems.filter((i) => i.status === 'fail').length
  const naCount = inspectionItems.filter((i) => i.status === 'na').length
  const now = new Date()
  const timestamp = now.toLocaleString()

  // Auto-capture GPS on mount
  useEffect(() => {
    let cancelled = false

    async function captureLocation() {
      try {
        const { Geolocation } = await import('@capacitor/geolocation')
        const pos = await Geolocation.getCurrentPosition()
        if (!cancelled) {
          setGpsLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          })
        }
      } catch {
        // GPS not available
      }
    }

    captureLocation()
    return () => { cancelled = true }
  }, [setGpsLocation])

  // Signature canvas setup
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas dimensions
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * 2
    canvas.height = rect.height * 2
    ctx.scale(2, 2)
    ctx.strokeStyle = '#000'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    // Fill white background
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, rect.width, rect.height)
  }, [])

  const getPoint = (e: React.TouchEvent | React.MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()

    if ('touches' in e) {
      const touch = e.touches[0]
      return { x: touch.clientX - rect.left, y: touch.clientY - rect.top }
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top }
  }

  const handleStart = (e: React.TouchEvent | React.MouseEvent) => {
    isDrawingRef.current = true
    const point = getPoint(e)
    lastPointRef.current = point
  }

  const handleMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDrawingRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx || !canvas) return

    const point = getPoint(e)
    if (!point || !lastPointRef.current) return

    ctx.beginPath()
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y)
    ctx.lineTo(point.x, point.y)
    ctx.stroke()
    lastPointRef.current = point
  }

  const handleEnd = () => {
    isDrawingRef.current = false
    lastPointRef.current = null
    // Save signature
    const canvas = canvasRef.current
    if (canvas) {
      setSignature(canvas.toDataURL('image/png'))
    }
  }

  const handleClear = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const rect = canvas.getBoundingClientRect()
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, rect.width, rect.height)
    setSignature(null)
  }

  const handleComplete = async () => {
    setIsSubmitting(true)
    try {
      const inspectionId = await submitInspection()
      await startShift(inspectionId)
    } catch {
      // Handle error — data is queued offline
      setIsSubmitting(false)
    }
  }

  const canSubmit = confirmed && signatureDataUrl !== null && !isSubmitting

  return (
    <div className="flex flex-col gap-4 p-4">
      <h2 className="text-xl font-semibold">
        {t('shift.signOff', 'Sign Off')}
      </h2>

      {/* Inspection summary */}
      <DriverCard>
        <div className="flex items-center justify-around">
          <div className="text-center">
            <div className="text-2xl font-bold text-[var(--color-success)]" style={{ fontFamily: 'var(--font-mono)' }}>
              {passCount}
            </div>
            <div className="text-xs text-[var(--text-secondary)]">
              {t('shift.inspection.pass', 'Pass')}
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-[var(--color-danger)]" style={{ fontFamily: 'var(--font-mono)' }}>
              {failCount}
            </div>
            <div className="text-xs text-[var(--text-secondary)]">
              {t('shift.inspection.fail', 'Fail')}
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-[var(--text-secondary)]" style={{ fontFamily: 'var(--font-mono)' }}>
              {naCount}
            </div>
            <div className="text-xs text-[var(--text-secondary)]">
              {t('shift.inspection.na', 'N/A')}
            </div>
          </div>
        </div>
      </DriverCard>

      {/* Confirmation checkbox */}
      <Checkbox
        isSelected={confirmed}
        onChange={setConfirmed}
        className="group flex min-h-[var(--touch-min)] items-center gap-3 outline-none"
      >
        <div
          className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md border-2 transition-colors
            ${confirmed
              ? 'border-[var(--color-blue)] bg-[var(--color-blue)]'
              : 'border-[var(--border-color)] bg-[var(--bg-primary)]'
            }
            group-focus-visible:ring-2 group-focus-visible:ring-[var(--color-blue)] group-focus-visible:ring-offset-2`}
        >
          {confirmed && (
            <span className="text-sm text-white">&#10003;</span>
          )}
        </div>
        <span className="text-sm font-medium">
          {t('shift.confirmAccurate', 'I confirm this inspection is accurate')}
        </span>
      </Checkbox>

      {/* Signature canvas */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-[var(--text-secondary)]">
          {t('shift.signature', 'Signature')}
        </label>
        <div className="overflow-hidden rounded-xl border border-[var(--border-color)]">
          <canvas
            ref={canvasRef}
            className="h-[200px] w-full cursor-crosshair touch-none"
            onMouseDown={handleStart}
            onMouseMove={handleMove}
            onMouseUp={handleEnd}
            onMouseLeave={handleEnd}
            onTouchStart={handleStart}
            onTouchMove={handleMove}
            onTouchEnd={handleEnd}
          />
        </div>
        <button
          type="button"
          onClick={handleClear}
          className="self-end text-sm text-[var(--color-blue)] outline-none focus-visible:underline"
        >
          {t('shift.clearSignature', 'Clear')}
        </button>
      </div>

      {/* Timestamp */}
      <div className="text-center text-sm text-[var(--text-secondary)]">
        <span style={{ fontFamily: 'var(--font-mono)' }}>{timestamp}</span>
      </div>

      {/* Complete button */}
      <DriverButton
        onPress={handleComplete}
        isDisabled={!canSubmit}
        isLoading={isSubmitting}
      >
        {t('shift.completeInspection', 'Complete Inspection')}
      </DriverButton>
    </div>
  )
}
