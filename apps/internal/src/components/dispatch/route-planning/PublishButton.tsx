/**
 * Publish Routes button with confirmation dialog.
 * Sends routes to drivers via publishRoutes server function.
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
import { Send, Loader2 } from 'lucide-react'
import { publishRoutes } from '../../../lib/server/dispatch'
import type { DeliveryRoute } from '../../../types/dispatch'

interface PublishButtonProps {
  routes: DeliveryRoute[]
}

export function PublishButton({ routes }: PublishButtonProps) {
  const [publishing, setPublishing] = useState(false)

  // Only routes with stops can be published
  const publishableRoutes = routes.filter((r) => r.stops.length > 0)
  const uniqueDrivers = new Set(publishableRoutes.map((r) => r.driverId))
  const isDisabled = publishableRoutes.length === 0

  const handlePublish = useCallback(
    async (close: () => void) => {
      setPublishing(true)
      try {
        await publishRoutes()
        close()
        // Notification handled by parent or toast system
      } catch {
        // Server error -- dialog stays open
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
        className="flex items-center gap-1.5 rounded-lg border border-green-600 bg-green-600/10 px-3 py-1.5 text-sm font-medium text-green-700 transition-opacity hover:bg-green-600/20 disabled:opacity-40 dark:border-green-500 dark:text-green-400"
      >
        <Send className="h-4 w-4" />
        Publish Routes
      </Button>

      <ModalOverlay
        isDismissable
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      >
        <Modal
          className="w-full max-w-sm rounded-2xl border border-[var(--color-border)] bg-white/95 p-6 shadow-2xl backdrop-blur-xl dark:bg-black/95"
        >
          <Dialog className="outline-none" role="alertdialog">
            {({ close }) => (
              <>
                <Heading
                  slot="title"
                  className="mb-2 text-lg font-semibold"
                >
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
                  drivers? Drivers will be notified immediately.
                </p>

                <div className="mt-6 flex items-center justify-end gap-2">
                  <Button
                    onPress={close}
                    isDisabled={publishing}
                    className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                  >
                    Cancel
                  </Button>
                  <Button
                    onPress={() => handlePublish(close)}
                    isDisabled={publishing}
                    className="flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                  >
                    {publishing && <Loader2 className="h-4 w-4 animate-spin" />}
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
