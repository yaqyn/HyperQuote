import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  Button as AriaButton,
  Dialog,
  Modal,
  ModalOverlay,
  Heading,
} from 'react-aria-components'
import { AlertTriangle, Check, Loader2, RefreshCw, X } from 'lucide-react'
import {
  getOutdatedPricesSummary,
  requestInventoryPriceUpdate,
} from '../../../lib/server/sales-quotes'
import { PriceStatusBadge } from '../quote-builder/PriceStatusBadge'

const POLL_INTERVAL_MS = 60_000 // 1 minute — auto refresh cadence

export function OutdatedPricesCard() {
  const [isOpen, setIsOpen] = useState(false)
  const [requestedProducts, setRequestedProducts] = useState<Set<string>>(new Set())

  const summary = useQuery({
    queryKey: ['sales-outdated-prices'],
    queryFn: () => getOutdatedPricesSummary({ data: {} }),
    refetchInterval: POLL_INTERVAL_MS,
    refetchIntervalInBackground: false,
    staleTime: 0,
  })

  const notifyMutation = useMutation({
    mutationFn: requestInventoryPriceUpdate,
  })

  const items = summary.data?.items ?? []
  const totalUrgent = summary.data?.totalUrgent ?? 0
  const affectedRfqCount = summary.data?.affectedRfqCount ?? 0

  const formatTime = (iso?: string) => {
    if (!iso) return '—'
    const d = new Date(iso)
    return d.toLocaleTimeString('en-EG', { hour: '2-digit', minute: '2-digit' })
  }

  const notifyOne = (productName: string, supplierName: string) => {
    notifyMutation.mutate({
      data: {
        items: [{ productId: productName, productName, supplierName }],
      },
    })
    setRequestedProducts((prev) => new Set(prev).add(productName))
  }

  const notifyAll = () => {
    const pending = items.filter((i) => !requestedProducts.has(i.productName))
    if (pending.length === 0) return
    notifyMutation.mutate({
      data: {
        items: pending.map((i) => ({
          productId: i.productName,
          productName: i.productName,
          supplierName: i.supplierName,
        })),
      },
    })
    setRequestedProducts((prev) => {
      const next = new Set(prev)
      for (const it of pending) next.add(it.productName)
      return next
    })
  }

  const pendingCount = items.filter((i) => !requestedProducts.has(i.productName)).length

  return (
    <>
      <div className="inline-flex items-center gap-1 rounded-lg bg-black/[0.04] dark:bg-white/[0.05] pe-1 ps-3 py-1">
        <AriaButton
          onPress={() => setIsOpen(true)}
          className="flex items-center gap-2 text-[12px] font-medium text-[var(--color-text)] outline-none cursor-pointer"
        >
          <AlertTriangle size={13} strokeWidth={2} className="text-black/50 dark:text-white/50" />
          <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">
            {totalUrgent}
          </span>
          <span className="text-black/55 dark:text-white/55">urgent</span>
          {affectedRfqCount > 0 && (
            <span className="text-[11px] text-black/35 dark:text-white/35">
              · {affectedRfqCount} RFQ{affectedRfqCount === 1 ? '' : 's'}
            </span>
          )}
        </AriaButton>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            summary.refetch()
          }}
          aria-label="Refresh now"
          title={`Auto-refresh every minute · last checked ${formatTime(summary.data?.generatedAt)}`}
          className="shrink-0 rounded-md p-1 text-black/40 dark:text-white/40 hover:bg-black/[0.05] dark:hover:bg-white/[0.08] hover:text-black/70 dark:hover:text-white/70 transition-colors outline-none"
        >
          <RefreshCw
            size={12}
            strokeWidth={2}
            className={summary.isFetching ? 'animate-spin' : ''}
          />
        </button>
      </div>

      <ModalOverlay
        isOpen={isOpen}
        onOpenChange={(open) => !open && setIsOpen(false)}
        isDismissable
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      >
        <Modal className="w-full max-w-2xl mx-4">
          <Dialog
            isKeyboardDismissDisabled
            className="rounded-xl bg-[var(--color-surface)] dark:bg-[#0A0A0A] border border-black/[0.08] dark:border-white/[0.08] shadow-2xl outline-none overflow-hidden"
          >
            {({ close }) => (
              <div className="flex flex-col max-h-[80vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-black/[0.06] dark:border-white/[0.06]">
                  <div>
                    <Heading slot="title" className="text-[15px] font-semibold text-[var(--color-text)]">
                      Urgent price updates
                    </Heading>
                    <p className="mt-0.5 text-[11px] text-[var(--color-text-subtle)]">
                      Customers are ordering {totalUrgent} item{totalUrgent === 1 ? '' : 's'} with outdated prices
                      {affectedRfqCount > 0 && ` · affecting ${affectedRfqCount} RFQ${affectedRfqCount === 1 ? '' : 's'}`}
                      {' · '}last checked {formatTime(summary.data?.generatedAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => summary.refetch()}
                      aria-label="Refresh"
                      className="rounded-md p-1.5 text-black/40 dark:text-white/40 hover:bg-black/[0.05] dark:hover:bg-white/[0.06] hover:text-black/70 dark:hover:text-white/70 transition-colors outline-none"
                    >
                      <RefreshCw
                        size={14}
                        strokeWidth={2}
                        className={summary.isFetching ? 'animate-spin' : ''}
                      />
                    </button>
                    <button
                      type="button"
                      onClick={close}
                      aria-label="Close"
                      className="rounded-md p-1.5 text-black/40 dark:text-white/40 hover:bg-black/[0.05] dark:hover:bg-white/[0.06] hover:text-black/70 dark:hover:text-white/70 transition-colors outline-none"
                    >
                      <X size={14} strokeWidth={2} />
                    </button>
                  </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-3">
                  {items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-2">
                      <Check size={22} strokeWidth={2} className="text-emerald-500" />
                      <p className="text-[13px] text-[var(--color-text-muted)]">No urgent price updates — every actively-ordered item has a fresh price</p>
                    </div>
                  ) : (
                    <ul className="flex flex-col divide-y divide-black/[0.04] dark:divide-white/[0.04]">
                      {items.map((item) => {
                        const alreadyRequested = requestedProducts.has(item.productName)
                        return (
                          <li key={item.productName} className="py-3 flex items-start gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-[13px] font-semibold text-[var(--color-text)] truncate">
                                  {item.productName}
                                </span>
                                <PriceStatusBadge
                                  priceStatus="outdated"
                                  recentlyOrdered={item.recentlyOrdered}
                                  size="xs"
                                />
                              </div>
                              <p className="mt-0.5 text-[11px] text-[var(--color-text-subtle)] truncate">
                                {item.specification} · {item.supplierName}
                              </p>
                              <p className="mt-1 text-[10px] text-[var(--color-text-subtle)]">
                                {item.affectedRfqs.length} RFQ{item.affectedRfqs.length === 1 ? '' : 's'}
                                {' · '}
                                {item.affectedRfqs.map((r) => r.customerName).join(', ')}
                                {' · '}
                                <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">
                                  {item.totalQuantity.toLocaleString('en-EG')} {item.unit}
                                </span>
                              </p>
                            </div>

                            {alreadyRequested ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                                <Check size={12} strokeWidth={2.5} />
                                Notified
                              </span>
                            ) : (
                              <AriaButton
                                onPress={() => notifyOne(item.productName, item.supplierName)}
                                className="shrink-0 rounded-md px-2.5 py-1 text-[11px] font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 outline-none cursor-pointer transition-colors"
                              >
                                Notify
                              </AriaButton>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>

                {/* Footer */}
                {items.length > 0 && (
                  <div className="flex items-center justify-between px-6 py-3 border-t border-black/[0.06] dark:border-white/[0.06]">
                    <p className="text-[11px] text-[var(--color-text-subtle)]">
                      Inventory will receive the latest prices and push them back into this panel.
                    </p>
                    <AriaButton
                      onPress={notifyAll}
                      isDisabled={notifyMutation.isPending || pendingCount === 0}
                      className="inline-flex items-center gap-1.5 rounded-md bg-red-500 px-3 py-1.5 text-[12px] font-medium text-white outline-none transition-colors cursor-pointer hover:bg-red-500/90 disabled:cursor-not-allowed disabled:bg-red-500/40"
                    >
                      {notifyMutation.isPending ? (
                        <>
                          <Loader2 size={12} strokeWidth={2.5} className="animate-spin" />
                          Notifying…
                        </>
                      ) : pendingCount === 0 ? (
                        <>
                          <Check size={12} strokeWidth={2.5} />
                          All notified
                        </>
                      ) : (
                        <>Notify inventory ({pendingCount})</>
                      )}
                    </AriaButton>
                  </div>
                )}
              </div>
            )}
          </Dialog>
        </Modal>
      </ModalOverlay>
    </>
  )
}
