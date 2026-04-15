import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'motion/react'
import { Dialog, DialogTrigger, Heading, Modal, ModalOverlay } from 'react-aria-components'
import { getYardZones, getWeatherAlerts, logVehicle } from '../../../lib/server/warehouse-yard'
import { useWarehouseStore } from '../../../stores/warehouse'
import { WeatherAlerts } from './WeatherAlerts'
import { YardZoneMap } from './YardZoneMap'
import { ZoneDetail } from './ZoneDetail'
import { Button } from '../../ui/Button'
import { PillGroup, Pill } from '../../ui/Pill'
import { UnderlineInput, UnderlineTextArea } from '../../ui/UnderlineInput'
import { Badge } from '../../ui/Badge'
import type { YardZone, VehicleType } from '../../../types/warehouse'

/**
 * "The Gate" — Yard management container.
 * Zone map as clean grid. Each zone: zone name + capacity bar + vehicle count.
 * Zones colored by status. Weather alerts as compact inline banner.
 */
export function YardManagement() {
  const [selectedZone, setSelectedZone] = useState<YardZone | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const vehiclesOnSite = useWarehouseStore((s) => s.vehiclesOnSite)
  const outdoorOpsPaused = useWarehouseStore((s) => s.outdoorOpsPaused)

  const { data: zonesData, isLoading: zonesLoading } = useQuery({
    queryKey: ['yard-zones'],
    queryFn: () => getYardZones({ data: {} }),
    staleTime: 30_000,
  })

  const { data: alertsData } = useQuery({
    queryKey: ['weather-alerts'],
    queryFn: () => getWeatherAlerts({ data: {} }),
    staleTime: 60_000,
  })

  const zones = zonesData?.zones ?? []
  const alerts = alertsData?.alerts ?? []

  // Summary stats
  const totalCapacity = zones.reduce((sum, z) => sum + z.maxCapacity, 0)
  const totalUsage = zones.reduce((sum, z) => sum + z.currentUsage, 0)
  const overallPercent = totalCapacity > 0 ? Math.round((totalUsage / totalCapacity) * 100) : 0

  if (zonesLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[#2563EB]" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 px-6 py-4">
      {/* ─── Outdoor ops paused persistent bar ──────────── */}
      {outdoorOpsPaused && (
        <div className="rounded-xl px-6 py-4 text-[14px] font-bold text-red-700" style={{ background: 'rgba(239, 68, 68, 0.06)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
          Outdoor operations paused — weather conditions active
        </div>
      )}

      {/* ─── Weather alerts — ABOVE everything, affects ALL zones ─── */}
      {alerts.length > 0 && <WeatherAlerts alerts={alerts} zones={zones} />}

      {/* ─── Header + total vehicles prominent ───────────── */}
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-xl font-bold text-[var(--color-text-primary)]">Yard</h2>
          <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">Zone management</p>
        </div>
        <div className="flex items-center gap-6">
          {/* Total vehicles on site — PROMINENT for tablet */}
          <div className="text-center">
            <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[40px] font-bold text-[var(--color-text-primary)] leading-none">
              {vehiclesOnSite.length}
            </span>
            <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-[var(--color-text-secondary)] mt-1.5">
              Vehicles
            </p>
          </div>
          {/* Utilization */}
          <div className="text-center">
            <span className={`font-[family-name:var(--font-geist-mono)] tabular-nums text-[40px] font-bold leading-none ${overallPercent >= 90 ? 'text-red-600' : overallPercent >= 75 ? 'text-amber-600' : 'text-[var(--color-text-primary)]'}`}>
              {overallPercent}%
            </span>
            <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-[var(--color-text-secondary)] mt-1.5">
              Capacity
            </p>
          </div>
        </div>
      </div>

      {/* Zones at capacity warning — highlighted for tablet */}
      {zones.some((z) => z.currentUsage >= z.maxCapacity) && (
        <div
          className="rounded-xl px-6 py-5 text-[16px] font-bold text-red-700 flex items-center gap-3 min-h-[64px]"
          style={{ background: 'rgba(239, 68, 68, 0.06)', border: '1px solid rgba(239, 68, 68, 0.15)' }}
        >
          <span className="text-[20px]">{'\u26A0'}</span>
          {zones.filter((z) => z.currentUsage >= z.maxCapacity).map((z) => z.name).join(', ')} at full capacity
        </div>
      )}

      {/* Log Vehicle button */}
      <DialogTrigger isOpen={dialogOpen} onOpenChange={setDialogOpen}>
        <Button variant="primary">Log Vehicle</Button>
        <ModalOverlay
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/20"
          isDismissable
        >
          <Modal className="w-full max-w-md">
            <LogVehicleDialog zones={zones} onClose={() => setDialogOpen(false)} />
          </Modal>
        </ModalOverlay>
      </DialogTrigger>

      {/* ─── Main content — tablet: stack vertically ──────── */}
      <div className="flex flex-col gap-4">
        {/* Zone map */}
        <YardZoneMap
          zones={zones}
          selectedZoneId={selectedZone?.id ?? null}
          onZoneSelect={setSelectedZone}
        />

        {/* Zone detail panel (slides down on tablet) */}
        <AnimatePresence>
          {selectedZone && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              className="overflow-hidden"
            >
              <ZoneDetail zone={selectedZone} onClose={() => setSelectedZone(null)} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ─── Log Vehicle Dialog ─────────────────────────────────────

interface LogVehicleDialogProps {
  zones: YardZone[]
  onClose: () => void
}

function LogVehicleDialog({ zones, onClose }: LogVehicleDialogProps) {
  const [vehicleType, setVehicleType] = useState<VehicleType>('truck')
  const [plateNumber, setPlateNumber] = useState('')
  const [action, setAction] = useState<'arriving' | 'departing'>('arriving')
  const [zoneId, setZoneId] = useState(zones[0]?.id ?? '')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const addVehicle = useWarehouseStore((s) => s.addVehicle)
  const removeVehicle = useWarehouseStore((s) => s.removeVehicle)
  const vehiclesOnSite = useWarehouseStore((s) => s.vehiclesOnSite)

  const selectedZone = zones.find((z) => z.id === zoneId)

  const handleSubmit = useCallback(async () => {
    if (!plateNumber.trim()) return
    setSubmitting(true)
    try {
      const result = await logVehicle({
        data: {
          plateNumber: plateNumber.trim(),
          vehicleType,
          action,
          zoneId: action === 'arriving' ? zoneId : undefined,
          notes: notes.trim() || undefined,
        },
      })

      if (result.success) {
        if (action === 'arriving') {
          addVehicle({
            id: result.logId,
            plateNumber: plateNumber.trim(),
            vehicleType,
            zoneId,
            zoneName: selectedZone?.name ?? zoneId,
            arrivedAt: new Date().toISOString(),
            notes: notes.trim() || undefined,
          })
        } else {
          // Find and remove by plate number
          const existing = vehiclesOnSite.find((v) => v.plateNumber === plateNumber.trim())
          if (existing) removeVehicle(existing.id)
        }
        onClose()
      }
    } finally {
      setSubmitting(false)
    }
  }, [plateNumber, vehicleType, action, zoneId, notes, selectedZone, addVehicle, removeVehicle, vehiclesOnSite, onClose])

  return (
    <Dialog className="rounded-2xl border border-[var(--color-border)] bg-white/90 p-6 outline-none" aria-label="Log vehicle">
      <Heading slot="title" className="text-lg font-bold text-[var(--color-text-primary)] mb-6">
        Log Vehicle
      </Heading>

      <div className="flex flex-col gap-5">
        {/* Action toggle */}
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-secondary)] mb-2 block">
            Action
          </span>
          <PillGroup value={action} onChange={(v) => setAction(v as 'arriving' | 'departing')}>
            <Pill value="arriving">Arriving</Pill>
            <Pill value="departing">Departing</Pill>
          </PillGroup>
        </div>

        {/* Vehicle type */}
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-secondary)] mb-2 block">
            Vehicle Type
          </span>
          <PillGroup value={vehicleType} onChange={(v) => setVehicleType(v as VehicleType)}>
            <Pill value="truck">Truck</Pill>
            <Pill value="moffett">Moffett</Pill>
            <Pill value="crane">Crane</Pill>
            <Pill value="other">Other</Pill>
          </PillGroup>
        </div>

        {/* Plate number */}
        <UnderlineInput
          label="Plate number"
          value={plateNumber}
          onChange={setPlateNumber}
          placeholder="e.g. ق ه ط 1234"
          className="font-[family-name:var(--font-geist-mono)] tabular-nums"
        />

        {/* Zone assignment (arrivals only) */}
        {action === 'arriving' && (
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-secondary)] mb-2 block">
              Zone Assignment
            </span>
            <select
              value={zoneId}
              onChange={(e) => setZoneId(e.target.value)}
              className="w-full h-12 rounded-xl border border-black/[0.06] bg-transparent px-4 py-3 text-[14px] text-[var(--color-text-primary)] outline-none focus:border-[#2563EB]"
            >
              {zones.map((z) => (
                <option key={z.id} value={z.id}>{z.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Notes */}
        <UnderlineTextArea
          label="Notes"
          value={notes}
          onChange={setNotes}
          placeholder="Optional notes..."
          rows={2}
        />

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="ghost" onPress={onClose}>Cancel</Button>
          <Button
            variant="primary"
            onPress={handleSubmit}
            isDisabled={!plateNumber.trim() || submitting}
          >
            {submitting ? 'Logging...' : action === 'arriving' ? 'Log Arrival' : 'Log Departure'}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
