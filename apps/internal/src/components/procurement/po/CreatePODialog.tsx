import { useState, useMemo } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Dialog,
  Modal,
  ModalOverlay,
  Heading,
} from 'react-aria-components'
import { motion } from 'motion/react'
import { createPurchaseOrder } from '../../../lib/server/procurement-po'
import { useProcurementStore } from '../../../stores/procurement'
import { Button, UnderlineInput } from '../../ui'

// ─── Types ───────────────────────────────────────────────

interface CreatePODialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

interface LineItem {
  productName: string
  quantity: number
  unitCost: number
}

// ─── Mock Suppliers ──────────────────────────────────────

const MOCK_SUPPLIERS = [
  { id: 'sup-001', name: 'Cairo Steel Co.' },
  { id: 'sup-002', name: 'Delta Cement Group' },
  { id: 'sup-003', name: 'Nile Building Supplies' },
  { id: 'sup-004', name: 'Alexandria Rebar Factory' },
  { id: 'sup-007', name: 'Port Said Iron Works' },
]

// ─── Helpers ─────────────────────────────────────────────

function defaultDeliveryDate(): string {
  const d = new Date()
  d.setDate(d.getDate() + 14)
  return d.toISOString().slice(0, 10)
}

function formatEGP(value: number): string {
  return new Intl.NumberFormat('en-EG', {
    style: 'currency',
    currency: 'EGP',
    maximumFractionDigits: 2,
  }).format(value)
}

const EMPTY_LINE: LineItem = { productName: '', quantity: 0, unitCost: 0 }

// ─── Component ───────────────────────────────────────────

export function CreatePODialog({ isOpen, onOpenChange }: CreatePODialogProps) {
  const queryClient = useQueryClient()

  // Supplier
  const [supplierSearch, setSupplierSearch] = useState('')
  const [selectedSupplier, setSelectedSupplier] = useState<{ id: string; name: string } | null>(null)

  // Line items
  const [lines, setLines] = useState<LineItem[]>([{ ...EMPTY_LINE }])

  // Delivery
  const [deliveryDate, setDeliveryDate] = useState(defaultDeliveryDate)

  // Filtered suppliers
  const filteredSuppliers = useMemo(() => {
    if (!supplierSearch) return MOCK_SUPPLIERS
    const q = supplierSearch.toLowerCase()
    return MOCK_SUPPLIERS.filter((s) => s.name.toLowerCase().includes(q))
  }, [supplierSearch])

  // Totals
  const subtotal = useMemo(
    () => lines.reduce((sum: number, l: LineItem) => sum + l.quantity * l.unitCost, 0),
    [lines],
  )
  const vatAmount = Math.round(subtotal * 14) / 100
  const total = subtotal + vatAmount

  // Line item updates
  const updateLine = (index: number, field: keyof LineItem, value: string | number) => {
    setLines((prev: LineItem[]) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  const removeLine = (index: number) => {
    setLines((prev: LineItem[]) => (prev.length <= 1 ? prev : prev.filter((_: LineItem, i: number) => i !== index)))
  }

  // Reset
  const resetForm = () => {
    setSupplierSearch('')
    setSelectedSupplier(null)
    setLines([{ ...EMPTY_LINE }])
    setDeliveryDate(defaultDeliveryDate())
  }

  // Mutation
  const mutation = useMutation({
    mutationFn: () =>
      createPurchaseOrder({
        data: {
          supplierId: selectedSupplier!.id,
          lines: lines
            .filter((l: LineItem) => l.productName && l.quantity > 0 && l.unitCost > 0)
            .map((l: LineItem) => ({
              productId: l.productName.toLowerCase().replace(/\s+/g, '-'),
              quantity: l.quantity,
              unitCost: l.unitCost,
            })),
          deliveryDate,
        },
      }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['po-list'] })
      useProcurementStore.getState().setSelectedPOId(result.poId)
      resetForm()
      onOpenChange(false)
    },
  })

  const canSubmit =
    selectedSupplier &&
    lines.some((l: LineItem) => l.productName && l.quantity > 0 && l.unitCost > 0) &&
    !mutation.isPending

  return (
    <ModalOverlay
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
    >
      <Modal className="w-full max-w-lg mx-4" isKeyboardDismissDisabled>
        <Dialog
          className="rounded-2xl border border-black/[0.06] bg-white/90 p-6 shadow-2xl dark:border-white/[0.06] dark:bg-black/90 outline-none"
        >
          {({ close }) => (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            >
              <Heading slot="title" className="text-[16px] font-semibold text-black dark:text-white mb-5">
                New Purchase Order
              </Heading>

              {/* ─── Supplier Selection ─── */}
              <div className="mb-5">
                <p className="text-[12px] font-medium text-black/40 dark:text-white/40 mb-2">Supplier</p>
                {selectedSupplier ? (
                  <div className="flex items-center justify-between rounded-lg border border-black/[0.06] dark:border-white/[0.06] px-3 py-2">
                    <span className="text-[13px] font-medium text-black dark:text-white">
                      {selectedSupplier.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedSupplier(null)}
                      className="text-[12px] text-black/40 hover:text-black/60 dark:text-white/40 dark:hover:text-white/60"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <>
                    <UnderlineInput
                      value={supplierSearch}
                      onChange={setSupplierSearch}
                      placeholder="Search suppliers..."
                      label="Supplier search"
                    />
                    <div className="mt-1.5 max-h-32 overflow-auto">
                      {filteredSuppliers.map((s: { id: string; name: string }) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            setSelectedSupplier(s)
                            setSupplierSearch('')
                          }}
                          className="w-full text-start px-2 py-1.5 text-[13px] text-black/70 dark:text-white/70 rounded hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-colors"
                        >
                          {s.name}
                        </button>
                      ))}
                      {filteredSuppliers.length === 0 && (
                        <p className="px-2 py-1.5 text-[12px] text-black/30 dark:text-white/30">
                          No suppliers found
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* ─── Line Items ─── */}
              <div className="mb-5">
                <p className="text-[12px] font-medium text-black/40 dark:text-white/40 mb-2">Line Items</p>

                {/* Header */}
                <div className="grid grid-cols-[1fr_80px_100px_80px_28px] gap-2 mb-1">
                  <span className="text-[11px] text-black/30 dark:text-white/30">Product</span>
                  <span className="text-[11px] text-black/30 dark:text-white/30">Qty</span>
                  <span className="text-[11px] text-black/30 dark:text-white/30">Unit Cost</span>
                  <span className="text-[11px] text-black/30 dark:text-white/30 text-end">Total</span>
                  <span />
                </div>

                {lines.map((line: LineItem, i: number) => {
                  const lineTotal = line.quantity * line.unitCost
                  return (
                    <div key={i} className="grid grid-cols-[1fr_80px_100px_80px_28px] gap-2 items-center mb-1.5">
                      <UnderlineInput
                        value={line.productName}
                        onChange={(v) => updateLine(i, 'productName', v)}
                        placeholder="Product name"
                        label={`Product ${i + 1}`}
                      />
                      <input
                        type="number"
                        min={0}
                        value={line.quantity || ''}
                        onChange={(e) => updateLine(i, 'quantity', Number(e.target.value) || 0)}
                        placeholder="0"
                        className="w-full border-b border-black/[0.04] bg-transparent py-1.5 text-[13px] font-[family-name:var(--font-geist-mono)] tabular-nums outline-none transition-colors placeholder:text-black/30 focus:border-black/[0.12] dark:border-white/[0.04] dark:placeholder:text-white/30 dark:focus:border-white/[0.12] text-black dark:text-white"
                        aria-label={`Quantity ${i + 1}`}
                      />
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={line.unitCost || ''}
                        onChange={(e) => updateLine(i, 'unitCost', Number(e.target.value) || 0)}
                        placeholder="0.00"
                        className="w-full border-b border-black/[0.04] bg-transparent py-1.5 text-[13px] font-[family-name:var(--font-geist-mono)] tabular-nums outline-none transition-colors placeholder:text-black/30 focus:border-black/[0.12] dark:border-white/[0.04] dark:placeholder:text-white/30 dark:focus:border-white/[0.12] text-black dark:text-white"
                        aria-label={`Unit cost ${i + 1}`}
                      />
                      <span className="text-[13px] font-[family-name:var(--font-geist-mono)] tabular-nums text-end text-black/60 dark:text-white/60">
                        {lineTotal > 0 ? formatEGP(lineTotal) : '—'}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeLine(i)}
                        className={`text-[14px] text-black/20 hover:text-black/50 dark:text-white/20 dark:hover:text-white/50 transition-colors ${lines.length <= 1 ? 'invisible' : ''}`}
                        aria-label={`Remove line ${i + 1}`}
                      >
                        ×
                      </button>
                    </div>
                  )
                })}

                <button
                  type="button"
                  onClick={() => setLines((prev: LineItem[]) => [...prev, { ...EMPTY_LINE }])}
                  className="mt-2 text-[12px] text-[#2563EB] hover:text-[#2563EB]/80 transition-colors"
                >
                  + Add item
                </button>
              </div>

              {/* ─── Totals ─── */}
              <div className="border-t border-black/[0.04] dark:border-white/[0.04] pt-3 mb-5 space-y-1">
                <div className="flex justify-between">
                  <span className="text-[12px] text-black/40 dark:text-white/40">Subtotal</span>
                  <span className="text-[13px] font-[family-name:var(--font-geist-mono)] tabular-nums text-black/60 dark:text-white/60">
                    {formatEGP(subtotal)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[12px] text-black/40 dark:text-white/40">VAT (14%)</span>
                  <span className="text-[13px] font-[family-name:var(--font-geist-mono)] tabular-nums text-black/60 dark:text-white/60">
                    {formatEGP(vatAmount)}
                  </span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="text-[13px] font-medium text-black dark:text-white">Total</span>
                  <span className="text-[15px] font-semibold font-[family-name:var(--font-geist-mono)] tabular-nums text-black dark:text-white">
                    {formatEGP(total)}
                  </span>
                </div>
              </div>

              {/* ─── Delivery Date ─── */}
              <div className="mb-6">
                <p className="text-[12px] font-medium text-black/40 dark:text-white/40 mb-2">Expected Delivery</p>
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="border-b border-black/[0.04] bg-transparent py-1.5 text-[13px] font-[family-name:var(--font-geist-mono)] tabular-nums outline-none transition-colors focus:border-black/[0.12] dark:border-white/[0.04] dark:focus:border-white/[0.12] text-black dark:text-white"
                  aria-label="Expected delivery date"
                />
              </div>

              {/* ─── Error ─── */}
              {mutation.isError && (
                <p className="text-[12px] text-red-600 mb-4">
                  Failed to create PO. Please try again.
                </p>
              )}

              {/* ─── Actions ─── */}
              <div className="flex items-center justify-end gap-3">
                <Button
                  variant="ghost"
                  onPress={() => {
                    resetForm()
                    close()
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  isDisabled={!canSubmit}
                  onPress={() => mutation.mutate()}
                >
                  {mutation.isPending ? 'Creating...' : 'Create Draft'}
                </Button>
              </div>
            </motion.div>
          )}
        </Dialog>
      </Modal>
    </ModalOverlay>
  )
}
