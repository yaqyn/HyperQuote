import { useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Checkbox } from 'react-aria-components'
import { useNavigate } from '@tanstack/react-router'
import { useLoadingStore } from '@/stores/loading'
import { useShiftStore } from '@/stores/shift'
import { DriverCard } from '@/components/shared/DriverCard'
import { DriverButton } from '@/components/shared/DriverButton'

export function LoadSignOff() {
  const { t } = useTranslation('driver')
  const navigate = useNavigate()

  const confirmed = useLoadingStore((s) => s.confirmed)
  const setConfirmed = useLoadingStore((s) => s.setConfirmed)
  const signatureUrl = useLoadingStore((s) => s.signatureUrl)
  const setSignature = useLoadingStore((s) => s.setSignature)
  const canDepart = useLoadingStore((s) => s.canDepart)
  const isOverweight = useLoadingStore((s) => s.isOverweight)
  const submitLoadVerification = useLoadingStore((s) => s.submitLoadVerification)

  const selectedVehicle = useShiftStore((s) => s.selectedVehicle)
  const gvwr = selectedVehicle ? Number(selectedVehicle.capacity_kg) : 0
  const overweight = gvwr > 0 && isOverweight(gvwr)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawingRef = useRef(false)

  // --- Signature canvas drawing ---
  const startDraw = useCallback((x: number, y: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    isDrawingRef.current = true
    ctx.beginPath()
    ctx.moveTo(x, y)
  }, [])

  const draw = useCallback((x: number, y: number) => {
    if (!isDrawingRef.current) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#000'
    ctx.lineTo(x, y)
    ctx.stroke()
  }, [])

  const endDraw = useCallback(() => {
    if (!isDrawingRef.current) return
    isDrawingRef.current = false
    const canvas = canvasRef.current
    if (!canvas) return
    const dataUrl = canvas.toDataURL('image/png')
    setSignature(dataUrl)
  }, [setSignature])

  function getCanvasCoords(e: React.TouchEvent | React.MouseEvent) {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    if ('touches' in e) {
      const touch = e.touches[0] ?? e.changedTouches[0]
      return { x: touch.clientX - rect.left, y: touch.clientY - rect.top }
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top }
  }

  function clearSignature() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setSignature(null as unknown as string)
  }

  async function handleDepart() {
    await submitLoadVerification()
    navigate({ to: '/route-overview' })
  }

  const departBlocked = !canDepart || overweight

  return (
    <DriverCard header={
      <span className="font-medium">{t('loading.signOff', 'Sign Off')}</span>
    }>
      <div className="space-y-4">
        {/* Confirmation checkbox */}
        <Checkbox
          isSelected={confirmed}
          onChange={setConfirmed}
          className="flex items-start gap-3 rounded-xl border border-[var(--border-color)] p-4 data-[selected]:border-[var(--color-blue)] data-[selected]:bg-[var(--color-blue)]/5"
        >
          <div className="flex h-[56px] min-w-[56px] items-center justify-center">
            <div className="h-6 w-6 rounded border-2 border-current flex items-center justify-center data-[selected]:bg-[var(--color-blue)] data-[selected]:border-[var(--color-blue)]">
              {confirmed && (
                <svg className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </div>
          </div>
          <span className="text-sm leading-relaxed pt-4">
            {t('loading.confirmLoad', 'I confirm this load is correct and secured')}
          </span>
        </Checkbox>

        {/* Signature canvas */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">
              {t('loading.signature', 'Signature')}
            </label>
            <button
              type="button"
              onClick={clearSignature}
              className="text-sm text-[var(--color-blue)] font-medium"
            >
              {t('shift.clearSignature', 'Clear')}
            </button>
          </div>
          <div className="rounded-xl border-2 border-[var(--border-color)] bg-white overflow-hidden">
            <canvas
              ref={canvasRef}
              width={600}
              height={200}
              className="w-full touch-none"
              style={{ height: '200px' }}
              onMouseDown={(e) => {
                const { x, y } = getCanvasCoords(e)
                startDraw(x, y)
              }}
              onMouseMove={(e) => {
                const { x, y } = getCanvasCoords(e)
                draw(x, y)
              }}
              onMouseUp={endDraw}
              onMouseLeave={endDraw}
              onTouchStart={(e) => {
                e.preventDefault()
                const { x, y } = getCanvasCoords(e)
                startDraw(x, y)
              }}
              onTouchMove={(e) => {
                e.preventDefault()
                const { x, y } = getCanvasCoords(e)
                draw(x, y)
              }}
              onTouchEnd={endDraw}
            />
          </div>
          {!signatureUrl && (
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              {t('loading.signatureRequired', 'Signature required before departure')}
            </p>
          )}
        </div>

        {/* Ready to Depart button */}
        <DriverButton
          variant={departBlocked ? 'secondary' : 'primary'}
          isDisabled={departBlocked}
          onPress={handleDepart}
          className="!min-h-[64px] text-lg font-bold"
        >
          {t('loading.readyToDepart', 'Ready to Depart')}
        </DriverButton>

        {overweight && (
          <p className="text-center text-sm text-[var(--color-danger)] font-medium">
            {t('loading.overweightBlocked', 'Departure blocked — vehicle overweight')}
          </p>
        )}

        {!canDepart && !overweight && (
          <p className="text-center text-xs text-[var(--text-secondary)]">
            {t('loading.allItemsRequired', 'All items must be checked, photos taken, weight entered, and signature provided')}
          </p>
        )}
      </div>
    </DriverCard>
  )
}
