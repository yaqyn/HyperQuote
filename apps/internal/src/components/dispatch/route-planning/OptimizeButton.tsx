/**
 * Auto-Optimize button with before/after comparison dialog.
 * Calls optimizeRoute server function for the selected route.
 */
import { useState, useCallback } from 'react'
import {
  Button,
  Dialog,
  DialogTrigger,
  Heading,
  Modal,
  ModalOverlay,
} from 'react-aria-components'
import { Sparkles, Loader2 } from 'lucide-react'
import { optimizeRoute } from '../../../lib/server/dispatch'
import type { DeliveryRoute, RouteStop } from '../../../types/dispatch'

interface OptimizeButtonProps {
  selectedRoute: DeliveryRoute | null
  onOptimized: (routeId: string, optimizedStops: RouteStop[]) => void
}

interface OptimizeResult {
  before: { distance: number; duration: number; violations: number }
  after: { distance: number; duration: number; violations: number }
  optimizedStops: RouteStop[]
  savings: { distanceKm: number; durationMin: number }
}

export function OptimizeButton({ selectedRoute, onOptimized }: OptimizeButtonProps) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<OptimizeResult | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const handleOptimize = useCallback(async () => {
    if (!selectedRoute) return

    setLoading(true)
    try {
      const response = await optimizeRoute()

      setResult({
        before: {
          distance: selectedRoute.totalDistance,
          duration: selectedRoute.estimatedDuration,
          violations: 0,
        },
        after: {
          distance: response.estimatedDistance,
          duration: response.estimatedDuration,
          violations: 0,
        },
        optimizedStops: response.optimizedStops,
        savings: response.savings,
      })
      setDialogOpen(true)
    } catch {
      // Server error -- ignore
    } finally {
      setLoading(false)
    }
  }, [selectedRoute])

  const handleApply = useCallback(() => {
    if (!selectedRoute || !result) return
    onOptimized(selectedRoute.id, result.optimizedStops)
    setDialogOpen(false)
    setResult(null)
  }, [selectedRoute, result, onOptimized])

  const handleCancel = useCallback(() => {
    setDialogOpen(false)
    setResult(null)
  }, [])

  return (
    <>
      <Button
        onPress={handleOptimize}
        isDisabled={!selectedRoute || loading}
        className="flex items-center gap-1.5 rounded-lg bg-[#2563EB] px-3 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        Auto-Optimize
      </Button>

      {/* Comparison dialog */}
      {result && (
        <DialogTrigger isOpen={dialogOpen} onOpenChange={setDialogOpen}>
          <Button className="hidden" />
          <ModalOverlay
            isDismissable
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          >
            <Modal className="w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-white/95 p-6 shadow-2xl backdrop-blur-xl dark:bg-black/95">
              <Dialog className="outline-none">
                {({ close }) => (
                  <>
                    <Heading
                      slot="title"
                      className="mb-4 text-lg font-semibold"
                    >
                      Optimization Results
                    </Heading>

                    <div className="space-y-3">
                      {/* Distance comparison */}
                      <ComparisonRow
                        label="Distance"
                        before={`${result.before.distance} km`}
                        after={`${result.after.distance} km`}
                        savings={`-${result.savings.distanceKm} km`}
                        improvement={
                          result.before.distance > 0
                            ? Math.round(
                                (result.savings.distanceKm / result.before.distance) * 100,
                              )
                            : 0
                        }
                      />

                      {/* Duration comparison */}
                      <ComparisonRow
                        label="Duration"
                        before={`${result.before.duration} min`}
                        after={`${result.after.duration} min`}
                        savings={`-${result.savings.durationMin} min`}
                        improvement={
                          result.before.duration > 0
                            ? Math.round(
                                (result.savings.durationMin / result.before.duration) * 100,
                              )
                            : 0
                        }
                      />
                    </div>

                    {/* Actions */}
                    <div className="mt-6 flex items-center justify-end gap-2">
                      <Button
                        onPress={() => {
                          handleCancel()
                          close()
                        }}
                        className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                      >
                        Cancel
                      </Button>
                      <Button
                        onPress={() => {
                          handleApply()
                          close()
                        }}
                        className="rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
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
  savings,
  improvement,
}: {
  label: string
  before: string
  after: string
  savings: string
  improvement: number
}) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] p-3">
      <div className="mb-1.5 text-xs font-medium text-black/50 dark:text-white/50">
        {label}
      </div>
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <div className="text-xs text-black/40 dark:text-white/40">Before</div>
          <div className="font-[family-name:var(--font-geist-mono)] text-sm tabular-nums">
            {before}
          </div>
        </div>
        <div className="text-black/20 dark:text-white/20">&rarr;</div>
        <div className="flex-1">
          <div className="text-xs text-black/40 dark:text-white/40">After</div>
          <div className="font-[family-name:var(--font-geist-mono)] text-sm tabular-nums text-green-600 dark:text-green-400">
            {after}
          </div>
        </div>
        <div className="shrink-0 text-end">
          <div className="font-[family-name:var(--font-geist-mono)] text-xs tabular-nums text-green-600 dark:text-green-400">
            {savings}
          </div>
          <div className="font-[family-name:var(--font-geist-mono)] text-lg font-bold tabular-nums text-green-600 dark:text-green-400">
            {improvement}%
          </div>
        </div>
      </div>
    </div>
  )
}
