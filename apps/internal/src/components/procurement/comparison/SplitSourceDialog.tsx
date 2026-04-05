import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogTrigger,
  Modal,
  ModalOverlay,
  Heading,
  Button,
  NumberField,
  Input,
  Label,
} from 'react-aria-components'
import type { RankedSupplier, SplitSource } from '../../../types/procurement'

interface SplitSourceDialogProps {
  productId: string
  requestedQty: number
  uom: string
  suppliers: RankedSupplier[]
  onConfirm: (split: SplitSource) => void
  children: React.ReactNode
}

export function SplitSourceDialog({
  productId,
  requestedQty,
  uom,
  suppliers,
  onConfirm,
  children,
}: SplitSourceDialogProps) {
  const { i18n } = useTranslation()
  const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-EG'

  const [allocations, setAllocations] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {}
    for (const s of suppliers) {
      init[s.supplierId] = 0
    }
    return init
  })

  const totalAllocated = useMemo(
    () => Object.values(allocations).reduce((sum, q) => sum + q, 0),
    [allocations],
  )

  const isValid = totalAllocated === requestedQty
  const remaining = requestedQty - totalAllocated

  const fmtPrice = (n: number) =>
    new Intl.NumberFormat(locale, { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 }).format(n)

  const fmtQty = (n: number) => new Intl.NumberFormat(locale).format(n)

  function handleConfirm(close: () => void) {
    if (!isValid) return

    const splitAllocations = suppliers
      .filter((s) => (allocations[s.supplierId] ?? 0) > 0)
      .map((s) => ({
        supplierId: s.supplierId,
        quantity: allocations[s.supplierId],
        unitPrice: s.unitPrice,
      }))

    onConfirm({ productId, allocations: splitAllocations })
    close()
  }

  return (
    <DialogTrigger>
      {children}
      <ModalOverlay
        isDismissable
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      >
        <Modal className="w-full max-w-lg">
          <Dialog
            isKeyboardDismissDisabled
            className="rounded-2xl border border-black/10 bg-white/90 p-6 shadow-2xl outline-none backdrop-blur-2xl dark:border-white/10 dark:bg-black/90"
          >
            {({ close }) => (
              <>
                <Heading slot="title" className="text-lg font-semibold text-black dark:text-white">
                  Split Sourcing
                </Heading>
                <p className="mt-1 text-sm text-black/50 dark:text-white/50">
                  Allocate <span className="font-mono">{fmtQty(requestedQty)}</span> {uom} across suppliers
                </p>

                <div className="mt-4 space-y-3">
                  {suppliers.map((s) => (
                    <div
                      key={s.supplierId}
                      className="flex items-center justify-between gap-4 rounded-lg border border-black/5 px-3 py-2 dark:border-white/5"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-black dark:text-white">{s.supplierName}</div>
                        <div className="text-xs text-black/50 dark:text-white/50">
                          {fmtPrice(s.unitPrice)}/{uom} &middot; Available: <span className="font-mono">{fmtQty(s.availableQty)}</span>
                        </div>
                      </div>
                      <NumberField
                        value={allocations[s.supplierId] ?? 0}
                        onChange={(val) =>
                          setAllocations((prev) => ({ ...prev, [s.supplierId]: val }))
                        }
                        minValue={0}
                        maxValue={s.availableQty}
                        className="w-28"
                      >
                        <Label className="sr-only">Quantity for {s.supplierName}</Label>
                        <Input className="w-full rounded-lg border border-black/10 bg-white px-2 py-1.5 text-end font-mono text-sm outline-none focus:border-[#2563EB] dark:border-white/10 dark:bg-black" />
                      </NumberField>
                    </div>
                  ))}
                </div>

                {/* Allocation status */}
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-black/50 dark:text-white/50">
                    Allocated: <span className="font-mono">{fmtQty(totalAllocated)}</span> / <span className="font-mono">{fmtQty(requestedQty)}</span> {uom}
                  </span>
                  {remaining !== 0 && (
                    <span className={`text-xs font-medium ${remaining > 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>
                      {remaining > 0 ? `${fmtQty(remaining)} remaining` : `${fmtQty(Math.abs(remaining))} over`}
                    </span>
                  )}
                  {isValid && (
                    <span className="text-xs font-medium text-green-600 dark:text-green-400">Balanced</span>
                  )}
                </div>

                {/* Actions */}
                <div className="mt-6 flex justify-end gap-3">
                  <Button
                    onPress={close}
                    className="rounded-lg border border-black/10 px-4 py-2 text-sm font-medium text-black/70 hover:bg-black/5 dark:border-white/10 dark:text-white/70 dark:hover:bg-white/5"
                  >
                    Cancel
                  </Button>
                  <Button
                    onPress={() => handleConfirm(close)}
                    isDisabled={!isValid}
                    className="rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
                  >
                    Confirm Split
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
