import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useEODStore } from '@/stores/end-of-day'
import { useShiftStore, DVIR_ITEMS, type InspectionItem as InspectionItemType } from '@/stores/shift'
import { db } from '@/lib/powersync'
import { capturePhoto } from '@/lib/camera'
import { DriverCard } from '@/components/shared/DriverCard'
import { DriverButton } from '@/components/shared/DriverButton'
import { InspectionItem } from '@/components/inspection/InspectionItem'

interface PreTripDefect {
  item_name: string
  status: string
  severity: string
  notes: string
  photo_url: string
}

interface PostTripItem {
  name: string
  itemOrder: number
  status: 'pass' | 'fail' | 'na' | null
  severity: 'minor' | 'major' | null
  notes: string
  photoUri: string | null
}

export function PostTripDVIR() {
  const { t } = useTranslation('driver')
  const setPostTripInspectionId = useEODStore((s) => s.setPostTripInspectionId)
  const nextStep = useEODStore((s) => s.nextStep)
  const selectedVehicle = useShiftStore((s) => s.selectedVehicle)
  const activeShiftId = useShiftStore((s) => s.activeShiftId)

  const [preTripDefects, setPreTripDefects] = useState<PreTripDefect[]>([])
  const [postTripItems, setPostTripItems] = useState<PostTripItem[]>(() =>
    DVIR_ITEMS.map((item) => ({
      name: item.name,
      itemOrder: item.itemOrder,
      status: null,
      severity: null,
      notes: '',
      photoUri: null,
    }))
  )
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Load pre-trip defects
  useEffect(() => {
    if (!activeShiftId) return
    let cancelled = false

    async function loadPreTripDefects() {
      try {
        // Get the inspection_id from the current shift
        const shifts = await db.getAll<{ inspection_id: string }>(
          'SELECT inspection_id FROM driver_shifts WHERE id = ?',
          [activeShiftId!]
        )
        if (cancelled || !shifts[0]?.inspection_id) return

        const defects = await db.getAll<PreTripDefect>(
          `SELECT item_name, status, severity, notes, photo_url
           FROM vehicle_inspection_items
           WHERE inspection_id = ? AND status = 'fail'`,
          [shifts[0].inspection_id]
        )
        if (!cancelled) setPreTripDefects(defects)
      } catch {
        // Offline — no previous data
      }
    }

    loadPreTripDefects()
    return () => { cancelled = true }
  }, [activeShiftId])

  const updateItem = (name: string, update: Partial<PostTripItem>) => {
    setPostTripItems((items) =>
      items.map((item) => (item.name === name ? { ...item, ...update } : item))
    )
  }

  const handleStatusChange = (name: string, status: 'pass' | 'fail' | 'na') => {
    updateItem(name, {
      status,
      severity: status === 'fail' ? null : null,
    })
  }

  const handleCaptureDefectPhoto = async (name: string) => {
    try {
      const uri = await capturePhoto()
      if (uri) {
        updateItem(name, { photoUri: uri })
      }
    } catch {
      // Photo capture failed
    }
  }

  const allChecked = postTripItems.every((item) => item.status !== null)
  const failedItems = postTripItems.filter((item) => item.status === 'fail')
  const allFailsHavePhotos = failedItems.every((item) => item.photoUri !== null)
  const canContinue = allChecked && (failedItems.length === 0 || allFailsHavePhotos)

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      const inspectionId = crypto.randomUUID()
      const now = new Date().toISOString()

      // Insert post-trip inspection
      await db.execute(
        `INSERT INTO vehicle_inspections (id, vehicle_id, driver_id, inspection_type, status, odometer_reading, signature_url, gps_lat, gps_lng, notes, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          inspectionId,
          selectedVehicle?.id ?? '',
          '',
          'post_trip',
          failedItems.length > 0 ? 'failed' : 'passed',
          0,
          signatureDataUrl ?? '',
          0,
          0,
          '',
          now,
        ]
      )

      // Insert each item
      for (const item of postTripItems) {
        await db.execute(
          `INSERT INTO vehicle_inspection_items (id, inspection_id, item_name, item_order, status, severity, notes, photo_url)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            crypto.randomUUID(),
            inspectionId,
            item.name,
            item.itemOrder,
            item.status ?? '',
            item.severity ?? '',
            item.notes,
            item.photoUri ?? '',
          ]
        )
      }

      setPostTripInspectionId(inspectionId)
      nextStep()
    } catch {
      // Queued offline
      setIsSubmitting(false)
    }
  }

  // Signature canvas refs
  const canvasRef = { current: null as HTMLCanvasElement | null }
  const isDrawingRef = { current: false }
  const lastPointRef = { current: null as { x: number; y: number } | null }

  const setupCanvas = (canvas: HTMLCanvasElement | null) => {
    if (!canvas) return
    canvasRef.current = canvas
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
  }

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

  const handleDrawStart = (e: React.TouchEvent | React.MouseEvent) => {
    isDrawingRef.current = true
    lastPointRef.current = getPoint(e)
  }

  const handleDrawMove = (e: React.TouchEvent | React.MouseEvent) => {
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

  const handleDrawEnd = () => {
    isDrawingRef.current = false
    lastPointRef.current = null
    if (canvasRef.current) {
      setSignatureDataUrl(canvasRef.current.toDataURL('image/png'))
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <h2 className="text-xl font-semibold">
        {t('eod.postTripDVIR', 'Post-Trip Inspection')}
      </h2>

      {/* Pre-trip defects at top */}
      {preTripDefects.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium text-[var(--color-danger)]">
            {t('eod.preTripDefects', 'Pre-Trip Defects')}
          </h3>
          {preTripDefects.map((defect, i) => (
            <DriverCard key={`pretip-${defect.item_name}-${i}`}>
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium">{defect.item_name}</span>
                  {defect.severity && (
                    <span className="ms-2 text-xs text-[var(--text-secondary)]">
                      ({defect.severity})
                    </span>
                  )}
                </div>
                <span className="rounded-full bg-[var(--color-warning)]/10 px-2 py-1 text-xs font-medium text-[var(--color-warning)]">
                  {t('eod.preTripDefectLabel', 'Pre-trip defect')}
                </span>
              </div>
              {defect.notes && (
                <p className="mt-1 text-xs text-[var(--text-secondary)]">{defect.notes}</p>
              )}
            </DriverCard>
          ))}
        </div>
      )}

      {/* Post-trip 10-item checklist */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="text-sm text-[var(--text-secondary)]">
            <span style={{ fontFamily: 'var(--font-mono)' }}>
              {postTripItems.filter((i) => i.status !== null).length}
            </span>
            {' '}{t('shift.inspection.of', 'of')}{' '}
            <span style={{ fontFamily: 'var(--font-mono)' }}>10</span>
            {' '}{t('shift.inspection.checked', 'checked')}
          </span>
        </div>

        {postTripItems.map((item) => (
          <div key={item.name} className="border-b border-[var(--border-color)] py-3">
            <div className="flex items-center gap-3">
              <span className="flex-1 font-medium">{item.name}</span>
              <div className="flex gap-2">
                {(['pass', 'fail', 'na'] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => handleStatusChange(item.name, status)}
                    className={`flex min-h-[var(--touch-min)] min-w-[var(--touch-min)] items-center justify-center rounded-xl text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--color-blue)]
                      ${item.status === status
                        ? status === 'pass'
                          ? 'bg-[var(--color-success)] text-white'
                          : status === 'fail'
                            ? 'bg-[var(--color-danger)] text-white'
                            : 'bg-[var(--text-secondary)] text-white'
                        : 'border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-secondary)]'
                      }`}
                  >
                    {t(`shift.inspection.${status}`, status === 'na' ? 'N/A' : status.charAt(0).toUpperCase() + status.slice(1))}
                  </button>
                ))}
              </div>
            </div>

            {/* Fail details — photo required for new defects */}
            {item.status === 'fail' && (
              <div className="mt-3 flex flex-col gap-3 ps-2 border-s-2 border-[var(--color-danger)]">
                <div className="flex gap-2">
                  {(['minor', 'major'] as const).map((sev) => (
                    <button
                      key={sev}
                      type="button"
                      onClick={() => updateItem(item.name, { severity: sev })}
                      className={`flex min-h-[40px] flex-1 items-center justify-center rounded-lg text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--color-blue)]
                        ${item.severity === sev
                          ? sev === 'minor'
                            ? 'bg-[var(--color-warning)] text-white'
                            : 'bg-[var(--color-danger)] text-white'
                          : 'border border-[var(--border-color)] bg-[var(--bg-primary)]'
                        }`}
                    >
                      {t(`shift.inspection.${sev}`, sev.charAt(0).toUpperCase() + sev.slice(1))}
                    </button>
                  ))}
                </div>

                {/* Photo — required */}
                <button
                  type="button"
                  onClick={() => handleCaptureDefectPhoto(item.name)}
                  className={`flex min-h-[var(--touch-min)] items-center justify-center gap-2 rounded-xl border border-dashed text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-blue)]
                    ${!item.photoUri
                      ? 'border-[var(--color-danger)] bg-[var(--color-danger)]/5 text-[var(--color-danger)]'
                      : 'border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
                    }`}
                >
                  <span>&#128247;</span>
                  {item.photoUri
                    ? t('shift.inspection.retakePhoto', 'Retake Photo')
                    : t('eod.photoRequired', 'Take Photo (Required)')}
                </button>

                {item.photoUri && (
                  <img
                    src={item.photoUri}
                    alt={`${item.name} defect photo`}
                    className="h-24 w-24 rounded-lg object-cover"
                  />
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Signature */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-[var(--text-secondary)]">
          {t('shift.signature', 'Signature')}
        </label>
        <div className="overflow-hidden rounded-xl border border-[var(--border-color)]">
          <canvas
            ref={setupCanvas}
            className="h-[160px] w-full cursor-crosshair touch-none"
            onMouseDown={handleDrawStart}
            onMouseMove={handleDrawMove}
            onMouseUp={handleDrawEnd}
            onMouseLeave={handleDrawEnd}
            onTouchStart={handleDrawStart}
            onTouchMove={handleDrawMove}
            onTouchEnd={handleDrawEnd}
          />
        </div>
      </div>

      {/* Submit */}
      <DriverButton
        onPress={handleSubmit}
        isDisabled={!canContinue || isSubmitting}
        isLoading={isSubmitting}
      >
        {t('common.next', 'Continue')}
      </DriverButton>
    </div>
  )
}
