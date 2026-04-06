import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useShiftStore } from '@/stores/shift'
import { db } from '@/lib/powersync'
import { DriverCard } from '@/components/shared/DriverCard'
import { DriverButton } from '@/components/shared/DriverButton'
import { InspectionItem } from './InspectionItem'

interface PreviousDefect {
  item_name: string
  status: string
  severity: string
  notes: string
}

export function DVIRChecklist() {
  const { t } = useTranslation('driver')
  const inspectionItems = useShiftStore((s) => s.inspectionItems)
  const completedCount = useShiftStore((s) => s.completedCount)
  const canComplete = useShiftStore((s) => s.canComplete)
  const hasMajorDefect = useShiftStore((s) => s.hasMajorDefect)
  const setShiftStep = useShiftStore((s) => s.setShiftStep)
  const selectedVehicle = useShiftStore((s) => s.selectedVehicle)
  const [previousDefects, setPreviousDefects] = useState<PreviousDefect[]>([])
  const [showPrevious, setShowPrevious] = useState(false)

  // Load previous day's post-trip inspection defects
  useEffect(() => {
    if (!selectedVehicle?.id) return
    let cancelled = false

    async function loadPreviousDefects() {
      try {
        const rows = await db.getAll<PreviousDefect>(
          `SELECT vii.item_name, vii.status, vii.severity, vii.notes
           FROM vehicle_inspection_items vii
           JOIN vehicle_inspections vi ON vi.id = vii.inspection_id
           WHERE vi.vehicle_id = ? AND vii.status = 'fail'
           ORDER BY vi.created_at DESC
           LIMIT 10`,
          [selectedVehicle.id]
        )
        if (!cancelled) setPreviousDefects(rows)
      } catch {
        // No previous data available
      }
    }

    loadPreviousDefects()
    return () => { cancelled = true }
  }, [selectedVehicle?.id])

  const handleContinue = () => {
    setShiftStep('odometer')
  }

  const handleChangeVehicle = () => {
    setShiftStep('vehicle-select')
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <h2 className="text-xl font-semibold">
        {t('shift.inspection')}
      </h2>

      {/* Progress indicator */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-[var(--text-secondary)]">
          <span style={{ fontFamily: 'var(--font-mono)' }}>{completedCount}</span>
          {' '}{t('shift.inspection.of', 'of')}{' '}
          <span style={{ fontFamily: 'var(--font-mono)' }}>10</span>
          {' '}{t('shift.inspection.checked', 'checked')}
        </span>
        <div className="h-2 w-32 overflow-hidden rounded-full bg-[var(--bg-secondary)]">
          <div
            className="h-full rounded-full bg-[var(--color-blue)] transition-all duration-300"
            style={{ width: `${(completedCount / 10) * 100}%` }}
          />
        </div>
      </div>

      {/* Previous day's defects */}
      {previousDefects.length > 0 && (
        <DriverCard>
          <button
            type="button"
            onClick={() => setShowPrevious(!showPrevious)}
            className="flex w-full items-center justify-between text-start outline-none"
          >
            <span className="text-sm font-medium text-[var(--color-danger)]">
              {t('shift.inspection.previousDefects', 'Previous Inspection Defects')}
              {' '}
              <span style={{ fontFamily: 'var(--font-mono)' }}>({previousDefects.length})</span>
            </span>
            <span className="text-xs">{showPrevious ? '&#9650;' : '&#9660;'}</span>
          </button>

          {showPrevious && (
            <div className="mt-2 flex flex-col gap-1">
              {previousDefects.map((defect, i) => (
                <div
                  key={`${defect.item_name}-${i}`}
                  className="rounded-lg bg-[var(--bg-secondary)] px-3 py-2 text-sm"
                >
                  <span className="font-medium text-[var(--color-danger)]">{defect.item_name}</span>
                  {defect.severity && (
                    <span className="ms-2 text-xs text-[var(--text-secondary)]">
                      ({defect.severity})
                    </span>
                  )}
                  {defect.notes && (
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">{defect.notes}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </DriverCard>
      )}

      {/* Major defect warning */}
      {hasMajorDefect && (
        <div className="rounded-xl border-2 border-[var(--color-danger)] bg-[var(--color-danger)]/10 p-4">
          <p className="font-semibold text-[var(--color-danger)]">
            {t('shift.inspection.majorDefectWarning', 'Vehicle has major defect — cannot operate')}
          </p>
          <div className="mt-3">
            <DriverButton variant="danger" onPress={handleChangeVehicle}>
              {t('shift.changeVehicle', 'Select Different Vehicle')}
            </DriverButton>
          </div>
        </div>
      )}

      {/* Inspection items list */}
      <div className="flex flex-col">
        {inspectionItems.map((item) => (
          <InspectionItem key={item.name} item={item} />
        ))}
      </div>

      {/* Continue button */}
      <DriverButton
        onPress={handleContinue}
        isDisabled={!canComplete || hasMajorDefect}
      >
        {t('common.next')}
      </DriverButton>
    </div>
  )
}
