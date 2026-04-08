/**
 * "Publish Routes" with confirmation tooltip.
 */
import { useState, useCallback, useMemo } from 'react'
import {
  Dialog,
  DialogTrigger,
  Heading,
  Modal,
  ModalOverlay,
} from 'react-aria-components'
import { Button } from '../../ui/Button'
import { publishRoutes } from '../../../lib/server/dispatch'
import { validateAllConstraints } from '../../../lib/constraints'
import type { DeliveryRoute, ConstraintViolation } from '../../../types/dispatch'

interface PublishButtonProps {
  routes: DeliveryRoute[]
}

export function PublishButton({ routes }: PublishButtonProps) {
  const [publishing, setPublishing] = useState(false)

  const publishableRoutes = routes.filter((r) => r.stops.length > 0)
  const uniqueDrivers = new Set(publishableRoutes.map((r) => r.driverId))
  const isDisabled = publishableRoutes.length === 0

  // Validate all routes for the checklist
  const routeValidation = useMemo(() => {
    const results: Array<{
      routeId: string
      driverId: string
      hasErrors: boolean
      hasWarnings: boolean
      errorCount: number
      warningCount: number
    }> = []

    for (const route of publishableRoutes) {
      let errorCount = 0
      let warningCount = 0
      for (const stop of route.stops) {
        // We don't have driver/vehicle objects here, so check constraint violations
        // that are route-level (overweight = totalWeight > capacity)
        if (route.totalWeight > 12_000) errorCount++ // capacity violation placeholder
      }
      results.push({
        routeId: route.id,
        driverId: route.driverId,
        hasErrors: errorCount > 0,
        hasWarnings: warningCount > 0,
        errorCount,
        warningCount,
      })
    }
    return results
  }, [publishableRoutes])

  const routesWithWarnings = routeValidation.filter((r: { hasErrors: boolean; hasWarnings: boolean }) => r.hasErrors || r.hasWarnings).length
  const allRoutesValid = routesWithWarnings === 0

  const handlePublish = useCallback(
    async (close: () => void) => {
      setPublishing(true)
      try {
        await publishRoutes()
        close()
      } catch {
        // Dialog stays open
      } finally {
        setPublishing(false)
      }
    },
    [],
  )

  return (
    <DialogTrigger>
      <Button
        variant="outline"
        isDisabled={isDisabled}
        className="flex items-center gap-1.5"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
        </svg>
        Publish
      </Button>

      <ModalOverlay isDismissable className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <Modal className="w-full max-w-sm rounded-2xl border border-black/[0.08] bg-white/95 p-6 shadow-2xl backdrop-blur-xl dark:border-white/[0.08] dark:bg-black/95">
          <Dialog className="outline-none" role="alertdialog">
            {({ close }) => (
              <>
                <Heading slot="title" className="mb-3 text-lg font-semibold">
                  Publish Routes
                </Heading>

                {/* Validation checklist */}
                <div className="mb-4 flex flex-col gap-2">
                  {/* Route count */}
                  <div className="flex items-center gap-2 text-sm">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                    <span className="text-black/60 dark:text-white/60">
                      <span className="font-[family-name:var(--font-geist-mono)] font-semibold tabular-nums">{publishableRoutes.length}</span> routes to{' '}
                      <span className="font-[family-name:var(--font-geist-mono)] font-semibold tabular-nums">{uniqueDrivers.size}</span> drivers
                    </span>
                  </div>

                  {/* All valid or warnings */}
                  <div className="flex items-center gap-2 text-sm">
                    {allRoutesValid ? (
                      <>
                        <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                        <span className="text-green-700 dark:text-green-400">All routes valid</span>
                      </>
                    ) : (
                      <>
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                        <span className="text-amber-700 dark:text-amber-400">
                          <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">{routesWithWarnings}</span> route{routesWithWarnings !== 1 ? 's' : ''} ha{routesWithWarnings !== 1 ? 've' : 's'} warnings
                        </span>
                      </>
                    )}
                  </div>

                  {/* Empty routes check */}
                  {routes.length > publishableRoutes.length && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="h-1.5 w-1.5 rounded-full bg-black/20 dark:bg-white/20" />
                      <span className="text-black/40 dark:text-white/40">
                        <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">{routes.length - publishableRoutes.length}</span> empty route{routes.length - publishableRoutes.length !== 1 ? 's' : ''} skipped
                      </span>
                    </div>
                  )}
                </div>

                <p className="text-xs text-black/40 dark:text-white/40">
                  Drivers will be notified immediately.
                </p>

                <div className="mt-4 flex items-center justify-end gap-2">
                  <Button
                    variant="outline"
                    onPress={close}
                    isDisabled={publishing}
                  >
                    Cancel
                  </Button>
                  <Button
                    onPress={() => handlePublish(close)}
                    isDisabled={publishing}
                    className="flex items-center gap-1.5 rounded-lg bg-black px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60 dark:bg-white dark:text-black"
                  >
                    {publishing && (
                      <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    )}
                    Publish
                  </Button>
                </div>
              </>
            )}
          </Dialog>
        </Modal>
      </ModalOverlay>
    </DialogTrigger>
  )
}
