import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useShiftStore, type Vehicle } from '@/stores/shift'
import { useAuthStore } from '@/stores/auth'
import { db } from '@/lib/powersync'
import { DriverCard } from '@/components/shared/DriverCard'
import { DriverButton } from '@/components/shared/DriverButton'
import { Select, SelectValue, Label, Button, Popover, ListBox, ListBoxItem } from 'react-aria-components'

export function VehicleSelect() {
  const { t } = useTranslation('driver')
  const setSelectedVehicle = useShiftStore((s) => s.setSelectedVehicle)
  const setShiftStep = useShiftStore((s) => s.setShiftStep)
  const selectedVehicle = useShiftStore((s) => s.selectedVehicle)
  const driverProfile = useAuthStore((s) => s.driverProfile)
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [showChange, setShowChange] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadVehicles() {
      try {
        const rows = await db.getAll<Vehicle>(
          "SELECT * FROM vehicles WHERE status = 'active'"
        )
        if (cancelled) return
        setVehicles(rows)

        // Find pre-assigned vehicle
        if (driverProfile?.id) {
          const assigned = rows.find(
            (v) => v.assigned_driver_id === driverProfile.id
          )
          if (assigned) {
            setSelectedVehicle(assigned)
          }
        }
      } catch {
        // Offline fallback — no vehicles available yet
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    loadVehicles()
    return () => { cancelled = true }
  }, [driverProfile?.id, setSelectedVehicle])

  const handleConfirm = () => {
    if (selectedVehicle) {
      setShiftStep('inspection')
    }
  }

  const handleChangeVehicle = (vehicleId: string) => {
    const vehicle = vehicles.find((v) => v.id === vehicleId)
    if (vehicle) {
      setSelectedVehicle(vehicle)
      setShowChange(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[var(--color-blue)] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <h2 className="text-xl font-semibold">
        {t('shift.selectVehicle')}
      </h2>

      {selectedVehicle ? (
        <DriverCard>
          <div className="flex flex-col gap-2">
            <div className="font-mono text-2xl font-bold tracking-wider" style={{ fontFamily: 'var(--font-mono)' }}>
              {selectedVehicle.plate_number}
            </div>
            <div className="text-[var(--text-secondary)]">
              {selectedVehicle.make} {selectedVehicle.model} ({selectedVehicle.year})
            </div>
            <div className="text-sm text-[var(--text-secondary)]">
              {selectedVehicle.type}
            </div>
          </div>
        </DriverCard>
      ) : (
        <DriverCard>
          <p className="text-center text-[var(--text-secondary)]">
            {t('shift.noAssignedVehicle', 'No vehicle assigned')}
          </p>
        </DriverCard>
      )}

      {!showChange && selectedVehicle && (
        <div className="flex flex-col gap-3">
          <DriverButton onPress={handleConfirm}>
            {t('common.confirm')}
          </DriverButton>
          <DriverButton variant="secondary" onPress={() => setShowChange(true)}>
            {t('shift.changeVehicle', 'Change Vehicle')}
          </DriverButton>
        </div>
      )}

      {showChange && (
        <div className="flex flex-col gap-3">
          <Select
            onSelectionChange={(key) => handleChangeVehicle(String(key))}
            selectedKey={selectedVehicle?.id}
          >
            <Label className="text-sm font-medium">
              {t('shift.selectOtherVehicle', 'Select Vehicle')}
            </Label>
            <Button className="flex min-h-[var(--touch-min)] w-full items-center justify-between rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 text-start">
              <SelectValue />
              <span aria-hidden="true">&#9662;</span>
            </Button>
            <Popover className="w-[--trigger-width] rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] shadow-lg">
              <ListBox className="max-h-60 overflow-auto p-1">
                {vehicles.map((v) => (
                  <ListBoxItem
                    key={v.id}
                    id={v.id}
                    textValue={v.plate_number}
                    className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-3 outline-none hover:bg-[var(--bg-secondary)] focus-visible:ring-2 focus-visible:ring-[var(--color-blue)]"
                  >
                    <span className="font-mono" style={{ fontFamily: 'var(--font-mono)' }}>
                      {v.plate_number}
                    </span>
                    <span className="text-sm text-[var(--text-secondary)]">
                      {v.make} {v.model}
                    </span>
                  </ListBoxItem>
                ))}
              </ListBox>
            </Popover>
          </Select>

          <DriverButton onPress={handleConfirm} isDisabled={!selectedVehicle}>
            {t('common.confirm')}
          </DriverButton>
        </div>
      )}

      {!selectedVehicle && vehicles.length === 0 && (
        <DriverCard>
          <p className="text-center text-[var(--text-secondary)]">
            {t('shift.usingPersonalVehicle', 'Using personal vehicle')}
          </p>
          <div className="mt-3">
            <DriverButton onPress={() => setShiftStep('inspection')}>
              {t('common.next')}
            </DriverButton>
          </div>
        </DriverCard>
      )}
    </div>
  )
}
