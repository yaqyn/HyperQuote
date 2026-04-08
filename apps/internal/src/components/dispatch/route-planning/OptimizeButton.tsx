/**
 * Single button: "Optimize" -> spinner -> "Optimized" with check.
 * Shows before/after comparison dialog.
 */
import { useState, useCallback } from 'react'
import {
  Dialog,
  DialogTrigger,
  Heading,
  Modal,
  ModalOverlay,
} from 'react-aria-components'
import { Button } from '../../ui/Button'
import { optimizeRoute } from '../../../lib/server/dispatch'
import type { DeliveryRoute, RouteStop } from '../../../types/dispatch'

interface OptimizeButtonProps {
  selectedRoute: DeliveryRoute | null
  onOptimized: (routeId: string, optimizedStops: RouteStop[]) => void
}

interface OptimizeResult {
  before: { distance: number; duration: number }
  after: { distance: number; duration: number }
  optimizedStops: RouteStop[]
  savings: { distanceKm: number; durationMin: number }
}

export function OptimizeButton({ selectedRoute, onOptimized }: OptimizeButtonProps) {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [result, setResult] = useState<OptimizeResult | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const handleOptimize = useCallback(async () => {
    if (!selectedRoute) return
    setLoading(true)
    setDone(false)
    try {
      const response = await optimizeRoute()
      setResult({
        before: { distance: selectedRoute.totalDistance, duration: selectedRoute.estimatedDuration },
        after: { distance: response.estimatedDistance, duration: response.estimatedDuration },
        optimizedStops: response.optimizedStops,
        savings: response.savings,
      })
      setDialogOpen(true)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [selectedRoute])

  const [lastSavings, setLastSavings] = useState<{ distanceKm: number; durationMin: number } | null>(null)

  const handleApply = useCallback(() => {
    if (!selectedRoute || !result) return
    onOptimized(selectedRoute.id, result.optimizedStops)
    setLastSavings(result.savings)
    setDialogOpen(false)
    setResult(null)
    setDone(true)
    setTimeout(() => { setDone(false); setLastSavings(null) }, 4000)
  }, [selectedRoute, result, onOptimized])

  return (
    <>
      <Button
        variant="primary"
        onPress={handleOptimize}
        isDisabled={!selectedRoute || loading}
        className="flex items-center gap-1.5"
      >
        {loading ? (
          <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : done ? (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
        ) : (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z" />
          </svg>
        )}
        {done && lastSavings
          ? `Saved ${lastSavings.distanceKm} km, ${lastSavings.durationMin} min`
          : done
            ? 'Optimized'
            : 'Optimize'}
      </Button>

      {result && (
        <DialogTrigger isOpen={dialogOpen} onOpenChange={setDialogOpen}>
          <Button className="hidden" />
          <ModalOverlay isDismissable className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <Modal className="w-full max-w-sm rounded-2xl border border-black/[0.08] bg-white/95 p-6 shadow-2xl backdrop-blur-xl dark:border-white/[0.08] dark:bg-black/95">
              <Dialog className="outline-none">
                {({ close }) => (
                  <>
                    <Heading slot="title" className="mb-4 text-lg font-semibold">
                      Optimization Results
                    </Heading>

                    <div className="space-y-3">
                      <ComparisonRow
                        label="Distance"
                        before={`${result.before.distance} km`}
                        after={`${result.after.distance} km`}
                        saving={`-${result.savings.distanceKm} km`}
                      />
                      <ComparisonRow
                        label="Duration"
                        before={`${result.before.duration} min`}
                        after={`${result.after.duration} min`}
                        saving={`-${result.savings.durationMin} min`}
                      />
                    </div>

                    <div className="mt-6 flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        onPress={() => { setResult(null); close() }}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="primary"
                        onPress={() => { handleApply(); close() }}
                      >
                        Apply
                      </Button>
                    </div>
                  </>
                )}
              </Dialog>
            </Modal>
          </ModalOverlay>
        </DialogTrigger>
      )}
    </>
  )
}

function ComparisonRow({
  label,
  before,
  after,
  saving,
}: {
  label: string
  before: string
  after: string
  saving: string
}) {
  return (
    <div className="rounded-lg border border-black/[0.06] p-3 dark:border-white/[0.06]">
      <div className="mb-1.5 text-[11px] font-medium text-black/40 dark:text-white/40">{label}</div>
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="text-[10px] text-black/30 dark:text-white/30">Before</div>
          <div className="font-[family-name:var(--font-geist-mono)] text-sm tabular-nums">{before}</div>
        </div>
        <svg className="h-3 w-3 text-black/20 dark:text-white/20" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
        </svg>
        <div className="flex-1">
          <div className="text-[10px] text-black/30 dark:text-white/30">After</div>
          <div className="font-[family-name:var(--font-geist-mono)] text-sm tabular-nums text-green-600 dark:text-green-400">{after}</div>
        </div>
        <div className="shrink-0 font-[family-name:var(--font-geist-mono)] text-xs tabular-nums text-green-600 dark:text-green-400">
          {saving}
        </div>
      </div>
    </div>
  )
}
