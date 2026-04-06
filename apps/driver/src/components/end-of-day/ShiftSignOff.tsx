import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useEODStore } from '@/stores/end-of-day'
import { useShiftStore } from '@/stores/shift'
import { useAuthStore } from '@/stores/auth'
import { DriverButton } from '@/components/shared/DriverButton'

export function ShiftSignOff() {
  const { t } = useTranslation('driver')
  const signatureDataUrl = useEODStore((s) => s.signatureDataUrl)
  const setSignature = useEODStore((s) => s.setSignature)
  const endShift = useEODStore((s) => s.endShift)
  const canEndShift = useEODStore((s) => s.canEndShift)
  const activeShiftId = useShiftStore((s) => s.activeShiftId)
  const isExternalDriver = useAuthStore((s) => s.isExternalDriver)

  const [showConfirmation, setShowConfirmation] = useState(false)
  const [isEnding, setIsEnding] = useState(false)
  const [isComplete, setIsComplete] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawingRef = useRef(false)
  const lastPointRef = useRef<{ x: number; y: number } | null>(null)

  // Signature canvas setup
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * 2
    canvas.height = rect.height * 2
    ctx.scale(2, 2)
    ctx.strokeStyle = '#000'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
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
    lastPointRef.current = getPoint(e)
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
    if (canvasRef.current) {
      setSignature(canvasRef.current.toDataURL('image/png'))
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
    setSignature(null as unknown as string)
  }

  const handleEndShift = async () => {
    if (!activeShiftId) return
    setIsEnding(true)
    try {
      await endShift(activeShiftId)
      setIsComplete(true)
    } catch {
      setIsEnding(false)
    }
  }

  if (isComplete) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 p-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-success)]/10">
          <span className="text-3xl text-[var(--color-success)]">&#10003;</span>
        </div>
        <h2 className="text-xl font-semibold">
          {t('eod.shiftComplete', 'Shift Complete')}
        </h2>
        <p className="text-center text-sm text-[var(--text-secondary)]">
          {t('eod.shiftCompleteDescription', 'Your shift has been ended. Drive safe!')}
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <h2 className="text-xl font-semibold">
        {t('eod.signOff', 'Sign Off')}
      </h2>

      {/* External driver earnings display */}
      {isExternalDriver && (
        <div className="rounded-xl bg-[var(--bg-secondary)] p-4 text-center">
          <div className="text-sm text-[var(--text-secondary)]">
            {t('eod.jobComplete', 'Job Complete. Earnings:')}
          </div>
          <div className="mt-1 font-[var(--font-mono)] text-2xl font-medium">
            EGP {t('eod.earningsPlaceholder', '---')}
          </div>
        </div>
      )}

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

      {/* Confirmation text */}
      <p className="text-center text-sm text-[var(--text-secondary)]">
        {t('eod.confirmReport', 'I confirm this end-of-shift report is accurate')}
      </p>

      {/* End Shift button — danger, 56dp, full-width */}
      <DriverButton
        variant="danger"
        onPress={() => setShowConfirmation(true)}
        isDisabled={!canEndShift}
        className="min-h-[56px]"
      >
        {t('eod.endShift', 'End Shift')}
      </DriverButton>

      {/* Confirmation overlay */}
      {showConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[var(--bg-primary)] p-6 shadow-xl">
            <h3 className="text-lg font-semibold">
              {t('eod.confirmEndShift', 'End Shift?')}
            </h3>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              {t('eod.confirmEndShiftDescription', 'Are you sure? This will end your shift and stop GPS tracking.')}
            </p>
            <div className="mt-6 flex gap-3">
              <DriverButton
                variant="secondary"
                onPress={() => setShowConfirmation(false)}
                className="flex-1"
              >
                {t('common.cancel', 'Cancel')}
              </DriverButton>
              <DriverButton
                variant="danger"
                onPress={handleEndShift}
                isLoading={isEnding}
                className="flex-1 min-h-[56px]"
              >
                {t('eod.endShift', 'End Shift')}
              </DriverButton>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
