import { useState } from 'react'
import { Button as AriaButton, Dialog, Heading, Modal, ModalOverlay } from 'react-aria-components'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button as UiButton } from '../../ui'
import { receivePOGoods } from '../../../lib/server/procurement-po'
import type { POItem } from '../../../types/procurement'

// ─── Types ───────────────────────────────────────────────

interface ReceiveGoodsDialogProps {
  poId: string
  items: POItem[]
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

interface ItemReceiptEntry {
  itemId: string
  receivedQuantity: number
  rejectedQuantity: number
}

// ─── Component ───────────────────────────────────────────

export function ReceiveGoodsDialog({ poId, items, isOpen, onOpenChange }: ReceiveGoodsDialogProps) {
  const queryClient = useQueryClient()

  // Initialize entries with remaining quantities
  const [entries, setEntries] = useState<ItemReceiptEntry[]>(() =>
    items.map((item) => ({
      itemId: item.id,
      receivedQuantity: Math.max(0, item.quantity - item.receivedQuantity),
      rejectedQuantity: 0,
    })),
  )

  // Reset entries when dialog opens with fresh data
  const resetEntries = () => {
    setEntries(
      items.map((item) => ({
        itemId: item.id,
        receivedQuantity: Math.max(0, item.quantity - item.receivedQuantity),
        rejectedQuantity: 0,
      })),
    )
  }

  const mutation = useMutation({
    mutationFn: () =>
      receivePOGoods({
        data: {
          poId,
          receivedItems: entries,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['po-detail', poId] })
      queryClient.invalidateQueries({ queryKey: ['po-list'] })
      onOpenChange(false)
    },
  })

  const updateEntry = (itemId: string, field: 'receivedQuantity' | 'rejectedQuantity', value: number) => {
    setEntries((prev: ItemReceiptEntry[]) =>
      prev.map((e: ItemReceiptEntry) => (e.itemId === itemId ? { ...e, [field]: Math.max(0, value) } : e)),
    )
  }

  return (
    <ModalOverlay
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (open) resetEntries()
        onOpenChange(open)
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20"
      isDismissable
    >
      <Modal
        className="mx-4 w-full max-w-2xl rounded-xl border border-black/[0.06] bg-white/95 p-6 shadow-xl
          dark:border-white/[0.06] dark:bg-black/95"
        isKeyboardDismissDisabled
      >
        <Dialog className="outline-none">
          {({ close }) => (
            <>
              <Heading slot="title" className="text-base font-semibold text-black dark:text-white">
                Receive Goods
              </Heading>
              <p className="mt-1 text-sm text-black/50 dark:text-white/50">
                Enter the quantities received and any rejected items.
              </p>

              {/* Table */}
              <div className="mt-5 overflow-x-auto">
                <table className="w-full text-start">
                  <thead>
                    <tr className="border-b border-black/[0.06] dark:border-white/[0.06]">
                      <th className="pb-2 text-start text-[12px] font-medium uppercase tracking-wider text-black/30 dark:text-white/30">
                        Product
                      </th>
                      <th className="pb-2 text-end text-[12px] font-medium uppercase tracking-wider text-black/30 dark:text-white/30">
                        Ordered
                      </th>
                      <th className="pb-2 text-end text-[12px] font-medium uppercase tracking-wider text-black/30 dark:text-white/30">
                        Prev. Received
                      </th>
                      <th className="pb-2 text-end text-[12px] font-medium uppercase tracking-wider text-black/30 dark:text-white/30">
                        Remaining
                      </th>
                      <th className="pb-2 text-end text-[12px] font-medium uppercase tracking-wider text-black/30 dark:text-white/30">
                        Received Now
                      </th>
                      <th className="pb-2 text-end text-[12px] font-medium uppercase tracking-wider text-black/30 dark:text-white/30">
                        Rejected Now
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => {
                      const entry = entries.find((e) => e.itemId === item.id)
                      const remaining = Math.max(0, item.quantity - item.receivedQuantity)

                      return (
                        <tr
                          key={item.id}
                          className="border-b border-black/[0.03] dark:border-white/[0.03] last:border-0"
                        >
                          <td className="py-2.5 pe-4">
                            <span className="text-sm text-black/80 dark:text-white/80">
                              {item.productName}
                            </span>
                          </td>
                          <td className="py-2.5 text-end">
                            <span className="font-[family-name:var(--font-geist-mono)] text-sm tabular-nums text-black/60 dark:text-white/60">
                              {item.quantity.toLocaleString()}
                            </span>
                          </td>
                          <td className="py-2.5 text-end">
                            <span className="font-[family-name:var(--font-geist-mono)] text-sm tabular-nums text-black/40 dark:text-white/40">
                              {item.receivedQuantity.toLocaleString()}
                            </span>
                          </td>
                          <td className="py-2.5 text-end">
                            <span className="font-[family-name:var(--font-geist-mono)] text-sm tabular-nums text-black/60 dark:text-white/60">
                              {remaining.toLocaleString()}
                            </span>
                          </td>
                          <td className="py-2.5 text-end">
                            <input
                              type="number"
                              min={0}
                              max={remaining}
                              value={entry?.receivedQuantity ?? 0}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                updateEntry(item.id, 'receivedQuantity', Number(e.target.value))
                              }
                              className="w-20 ms-auto rounded-md border border-black/[0.08] bg-transparent px-2 py-1 text-end
                                font-[family-name:var(--font-geist-mono)] text-sm tabular-nums text-black dark:text-white
                                outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]/30
                                dark:border-white/[0.08]"
                            />
                          </td>
                          <td className="py-2.5 text-end">
                            <input
                              type="number"
                              min={0}
                              value={entry?.rejectedQuantity ?? 0}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                updateEntry(item.id, 'rejectedQuantity', Number(e.target.value))
                              }
                              className="w-20 ms-auto rounded-md border border-black/[0.08] bg-transparent px-2 py-1 text-end
                                font-[family-name:var(--font-geist-mono)] text-sm tabular-nums text-black dark:text-white
                                outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]/30
                                dark:border-white/[0.08]"
                            />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Footer */}
              <div className="mt-5 flex justify-end gap-2">
                <AriaButton
                  className="rounded-lg px-4 py-2 text-sm font-medium text-black/50 outline-none cursor-pointer
                    data-[hovered]:text-black/80 data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50
                    dark:text-white/50 dark:data-[hovered]:text-white/80 transition-colors"
                  onPress={close}
                >
                  Cancel
                </AriaButton>
                <UiButton
                  variant="primary"
                  isDisabled={mutation.isPending}
                  onPress={() => mutation.mutate()}
                >
                  {mutation.isPending ? 'Confirming...' : 'Confirm Receipt'}
                </UiButton>
              </div>

              {mutation.isError && (
                <p className="mt-2 text-end text-[12px] text-red-500/70">
                  Failed to record receipt. Please try again.
                </p>
              )}
            </>
          )}
        </Dialog>
      </Modal>
    </ModalOverlay>
  )
}
