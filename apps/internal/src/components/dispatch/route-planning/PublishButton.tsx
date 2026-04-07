/**
 * "Publish Routes" with confirmation tooltip.
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
import { publishRoutes } from '../../../lib/server/dispatch'
import type { DeliveryRoute } from '../../../types/dispatch'

interface PublishButtonProps {
  routes: DeliveryRoute[]
}

export function PublishButton({ routes }: PublishButtonProps) {
  const [publishing, setPublishing] = useState(false)

  const publishableRoutes = routes.filter((r) => r.stops.length > 0)
  const uniqueDrivers = new Set(publishableRoutes.map((r) => r.driverId))
  const isDisabled = publishableRoutes.length === 0

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
        isDisabled={isDisabled}
        className="flex items-center gap-1.5 rounded-lg border border-black/[0.08] px-3 py-1.5 text-sm font-medium transition-colors hover:bg-black/[0.04] disabled:opacity-30 dark:border-white/[0.08] dark:hover:bg-white/[0.04]"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
        </svg>
        Publish
      </Button>

      <ModalOverlay isDismissable className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <Modal className="w-full max-w-xs rounded-2xl border border-black/[0.08] bg-white/95 p-6 shadow-2xl backdrop-blur-xl dark:border-white/[0.08] dark:bg-black/95">
          <Dialog className="outline-none" role="alertdialog">
            {({ close }) => (
              <>
                <Heading slot="title" className="mb-2 text-lg font-semibold">
                  Publish Routes
                </Heading>

                <p className="text-sm text-black/60 dark:text-white/60">
                  Publish{' '}
                  <span className="font-[family-name:var(--font-geist-mono)] font-semibold tabular-nums">
                    {publishableRoutes.length}
                  </span>{' '}
                  routes to{' '}
                  <span className="font-[family-name:var(--font-geist-mono)] font-semibold tabular-nums">
                    {uniqueDrivers.size}
                  </span>{' '}
                  drivers? They will be notified immediately.
                </p>

                <div className="mt-6 flex items-center justify-end gap-2">
                  <Button
                    onPress={close}
                    isDisabled={publishing}
                    className="rounded-lg border border-black/[0.08] px-4 py-2 text-sm transition-colors hover:bg-black/[0.04] dark:border-white/[0.08] dark:hover:bg-white/[0.04]"
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
