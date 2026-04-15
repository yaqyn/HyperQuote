import {
  Dialog,
  Modal,
  ModalOverlay,
} from 'react-aria-components'
import { X } from 'lucide-react'
import { SupplierProfileView } from './SupplierProfileView'

interface SupplierProfileModalProps {
  name: string | null
  onClose: () => void
}

/**
 * Standalone modal wrapper around SupplierProfileView. Used from the inventory
 * home to open a supplier profile directly — "call once, fix many". The same
 * view component is also rendered inline inside ProductDetailModal when you
 * drill in from a product.
 */
export function SupplierProfileModal({ name, onClose }: SupplierProfileModalProps) {
  const isOpen = !!name

  return (
    <ModalOverlay
      isOpen={isOpen}
      onOpenChange={(open) => !open && onClose()}
      isDismissable
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
    >
      <Modal className="w-full max-w-3xl mx-4">
        <Dialog
          isKeyboardDismissDisabled
          className="relative rounded-2xl bg-[var(--color-surface)] dark:bg-[#0A0A0A] shadow-2xl outline-none overflow-hidden border border-black/[0.08] dark:border-white/[0.08]"
        >
          {() => (
            <>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="absolute top-3 right-3 z-30 rounded-md p-1.5 bg-white dark:bg-[#161616] border border-black/10 dark:border-white/10 text-black/50 dark:text-white/50 hover:text-[var(--color-text)] transition-colors outline-none cursor-pointer"
              >
                <X size={14} strokeWidth={2} />
              </button>
              {name && <SupplierProfileView name={name} onBack={onClose} />}
            </>
          )}
        </Dialog>
      </Modal>
    </ModalOverlay>
  )
}
