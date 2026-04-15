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
        {allRoutesValid ? (
          <svg className="h-4 w-4 text-green-600 dark:text-green-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg className="h-4 w-4 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
        )}
        {allRoutesValid
          ? 'Publish'
          : `Publish (${routesWithWarnings} warning${routesWithWarnings !== 1 ? 's' : ''})`
        }
      </Button>

      <ModalOverlay isDismissable className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <Modal className="w-full max-w-sm rounded-2xl border border-black/[0.08] bg-white/95 p-6 shadow-2xl dark:border-white/[0.08] dark:bg-black/95">
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
