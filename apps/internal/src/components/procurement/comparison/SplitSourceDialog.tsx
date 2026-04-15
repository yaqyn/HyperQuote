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
import { motion } from 'motion/react'
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
  const fillPercent = Math.min((totalAllocated / requestedQty) * 100, 100)

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
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/20"
      >
        <Modal className="w-full max-w-md">
          <Dialog
            isKeyboardDismissDisabled
            className="rounded-2xl border border-black/[0.06] bg-white/95 p-6 shadow-2xl outline-none dark:border-white/[0.06] dark:bg-black/95"
          >
            {({ close }) => (
              <>
                <Heading slot="title" className="text-base font-semibold text-black dark:text-white">
                  Split Sourcing
                </Heading>
                <p className="mt-1 text-[11px] text-black/40 dark:text-white/40">
                  Allocate{' '}
                  <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">{fmtQty(requestedQty)}</span>
                  {' '}{uom} across suppliers
                </p>

                {/* Fill bar */}
                <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-black/[0.04] dark:bg-white/[0.04]">
                  <motion.div
                    className={`h-full rounded-full ${isValid ? 'bg-[#2563EB]' : remaining < 0 ? 'bg-red-500' : 'bg-black/20 dark:bg-white/20'}`}
                    animate={{ width: `${fillPercent}%` }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                </div>

                {/* Allocation rows */}
                <div className="mt-4 space-y-2">
                  {suppliers.map((s) => {
                    const qty = allocations[s.supplierId] ?? 0
                    const sliderPercent = requestedQty > 0 ? (qty / requestedQty) * 100 : 0

                    return (
                      <div
                        key={s.supplierId}
                        className="flex items-center gap-3 rounded-lg py-2"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-black dark:text-white">{s.supplierName}</div>
                          <div className="text-[10px] text-black/35 dark:text-white/35">
                            {fmtPrice(s.unitPrice)}/{uom}
                            <span className="mx-1.5 text-black/15 dark:text-white/15">|</span>
                            <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">
                              {fmtQty(s.availableQty)}
                            </span> avail
                          </div>
                        </div>

                        {/* Allocation bar visual */}
                        <div className="w-16 h-1 rounded-full bg-black/[0.04] dark:bg-white/[0.04]">
                          <div
                            className="h-full rounded-full bg-[#2563EB]/40 transition-all"
                            style={{ width: `${Math.min(sliderPercent, 100)}%` }}
                          />
                        </div>

                        <NumberField
                          value={qty}
                          onChange={(val) =>
                            setAllocations((prev) => ({ ...prev, [s.supplierId]: val }))
                          }
                          minValue={0}
                          maxValue={s.availableQty}
                          className="w-24"
                        >
                          <Label className="sr-only">Quantity for {s.supplierName}</Label>
                          <Input className="w-full rounded-lg border border-black/[0.06] bg-transparent px-2.5 py-1.5 text-end font-[family-name:var(--font-geist-mono)] text-sm tabular-nums outline-none transition-colors focus:border-[#2563EB]/40 dark:border-white/[0.06]" />
                        </NumberField>
                      </div>
                    )
                  })}
                </div>

                {/* Status line */}
                <div className="mt-3 flex items-center justify-between text-[11px]">
                  <span className="text-black/40 dark:text-white/40">
                    <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">{fmtQty(totalAllocated)}</span>
                    {' / '}
                    <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">{fmtQty(requestedQty)}</span>
                    {' '}{uom}
                  </span>
                  {remaining !== 0 && (
                    <span className={remaining > 0 ? 'text-yellow-600' : 'text-red-600'}>
                      {remaining > 0 ? `${fmtQty(remaining)} remaining` : `${fmtQty(Math.abs(remaining))} over`}
                    </span>
                  )}
                  {isValid && (
                    <span className="font-medium text-green-600">Balanced</span>
                  )}
                </div>

                {/* Actions */}
                <div className="mt-5 flex justify-end gap-2">
                  <Button
                    onPress={close}
                    className="rounded-lg px-4 py-2 text-sm font-medium text-black/50 outline-none transition-colors data-[hovered]:text-black/80 data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50 dark:text-white/50 dark:data-[hovered]:text-white/80"
                  >
                    Cancel
                  </Button>
                  <Button
                    onPress={() => handleConfirm(close)}
                    isDisabled={!isValid}
                    className="rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-medium text-white outline-none transition-opacity data-[disabled]:opacity-30 data-[hovered]:opacity-90 data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50 data-[focus-visible]:ring-offset-2"
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
