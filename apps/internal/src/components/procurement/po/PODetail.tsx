import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button, Dialog, DialogTrigger, Heading, Modal, ModalOverlay } from 'react-aria-components'
import { motion } from 'motion/react'
import { getPODetail, updatePOStatus } from '../../../lib/server/procurement-po'
import type { POItem } from '../../../types/procurement'
import { POStatusFlow } from './POStatusFlow'
import { ThreeWayMatch } from './ThreeWayMatch'
import { PODocuments } from './PODocuments'

// ─── Formatting ───────────────────────────────────────────

function formatEGP(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'EGP',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDate(isoDate: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(isoDate))
}

function formatDateTime(isoDate: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(isoDate))
}

// ─── Confirmation Dialog ──────────────────────────────────

function ConfirmDialog({
  title,
  description,
  confirmLabel,
  onConfirm,
  isDestructive,
  children,
}: {
  title: string
  description: string
  confirmLabel: string
  onConfirm: () => void
  isDestructive?: boolean
  children: React.ReactNode
}) {
  return (
    <DialogTrigger>
      {children}
      <ModalOverlay
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm"
        isDismissable
      >
        <Modal
          className="mx-4 w-full max-w-sm rounded-xl border border-black/[0.06] bg-white/95 p-6 shadow-xl backdrop-blur-2xl
            dark:border-white/[0.06] dark:bg-black/95"
          isKeyboardDismissDisabled
        >
          <Dialog className="outline-none">
            {({ close }) => (
              <>
                <Heading slot="title" className="text-base font-semibold text-black dark:text-white">
                  {title}
                </Heading>
                <p className="mt-2 text-sm text-black/50 dark:text-white/50">
                  {description}
                </p>
                <div className="mt-5 flex justify-end gap-2">
                  <Button
                    className="rounded-lg px-4 py-2 text-sm font-medium text-black/50 outline-none
                      data-[hovered]:text-black/80 data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50
                      dark:text-white/50 dark:data-[hovered]:text-white/80"
                    onPress={close}
                  >
                    Cancel
                  </Button>
                  <Button
                    className={`rounded-lg px-4 py-2 text-sm font-medium text-white outline-none
                      data-[focus-visible]:ring-2 data-[focus-visible]:ring-offset-2
                      ${isDestructive
                        ? 'bg-red-600 data-[hovered]:bg-red-700 data-[focus-visible]:ring-red-500'
                        : 'bg-[#2563EB] data-[hovered]:opacity-90 data-[focus-visible]:ring-[#2563EB]/50'
                      }`}
                    onPress={() => {
                      onConfirm()
                      close()
                    }}
                  >
                    {confirmLabel}
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

// ─── Component ────────────────────────────────────────────

interface PODetailProps {
  poId: string
  onBack: () => void
}

export function PODetail({ poId, onBack }: PODetailProps) {
  const { t, i18n } = useTranslation('internal')
  const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-EG'
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['po-detail', poId],
    queryFn: () => getPODetail({ data: { poId } }),
    staleTime: 30_000,
  })

  const statusMutation = useMutation({
    mutationFn: ({ status, reason }: { status: string; reason?: string }) =>
      updatePOStatus({ data: { poId, status, reason } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['po-detail', poId] })
      queryClient.invalidateQueries({ queryKey: ['po-list'] })
    },
  })

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-black/25 dark:text-white/25">Loading...</p>
      </div>
    )
  }

  const { po, timeline } = data

  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      className="flex flex-col gap-8 p-5 overflow-auto"
    >
      {/* Back */}
      <Button
        className="self-start text-[11px] text-black/35 outline-none
          data-[hovered]:text-black/60 data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50
          dark:text-white/35 dark:data-[hovered]:text-white/60"
        onPress={onBack}
      >
        <span className="inline-flex items-center gap-1">
          <svg className="h-3 w-3 rtl:rotate-180" viewBox="0 0 16 16" fill="none">
            <path d="M10 4L6 8L10 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back
        </span>
      </Button>

      {/* Document header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-[family-name:var(--font-geist-mono)] text-xl font-semibold tabular-nums text-black dark:text-white">
            {po.poNumber}
          </h2>
          <p className="mt-1 text-sm text-black/50 dark:text-white/50">
            {po.supplierName}
          </p>
          <p className="mt-0.5 font-[family-name:var(--font-geist-mono)] text-[10px] tabular-nums text-black/25 dark:text-white/25">
            {po.codedDeliveryReference}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {po.status === 'draft' && (
            <ConfirmDialog
              title="Send to Supplier"
              description="This will send the purchase order to the supplier for confirmation."
              confirmLabel="Send PO"
              onConfirm={() => statusMutation.mutate({ status: 'sent' })}
            >
              <Button
                className="rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-medium text-white outline-none
                  data-[hovered]:opacity-90 data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50 data-[focus-visible]:ring-offset-2"
              >
                Send to Supplier
              </Button>
            </ConfirmDialog>
          )}

          {!['closed', 'rejected', 'cancelled'].includes(po.status) && (
            <ConfirmDialog
              title="Cancel Purchase Order"
              description="This action cannot be undone. The supplier will be notified."
              confirmLabel="Cancel PO"
              onConfirm={() => statusMutation.mutate({ status: 'cancelled', reason: 'Cancelled by procurement' })}
              isDestructive
            >
              <Button
                className="rounded-lg px-4 py-2 text-sm font-medium text-red-500/70 outline-none
                  data-[hovered]:text-red-600 data-[hovered]:bg-red-50/50 data-[focus-visible]:ring-2 data-[focus-visible]:ring-red-500/50
                  dark:data-[hovered]:bg-red-950/20"
              >
                Cancel PO
              </Button>
            </ConfirmDialog>
          )}
        </div>
      </div>

      {/* Status pipeline */}
      <POStatusFlow currentStatus={po.status} />

      {/* Line items */}
      <section>
        <h4 className="text-[11px] font-medium uppercase tracking-wider text-black/30 dark:text-white/30 mb-3">
          Line Items
        </h4>
        <div className="space-y-px">
          {po.items.map((item: POItem) => (
            <div
              key={item.id}
              className="flex items-center gap-4 rounded-lg py-2.5 px-3 hover:bg-black/[0.015] dark:hover:bg-white/[0.015] transition-colors"
            >
              {/* Product */}
              <div className="flex-1 min-w-0">
                <span className="text-sm text-black/80 dark:text-white/80">{item.productName}</span>
              </div>

              {/* Qty */}
              <div className="text-end w-16">
                <span className="font-[family-name:var(--font-geist-mono)] text-sm tabular-nums text-black/60 dark:text-white/60">
                  {item.quantity.toLocaleString(locale)}
                </span>
              </div>

              {/* Unit cost */}
              <div className="text-end w-24">
                <span className="font-[family-name:var(--font-geist-mono)] text-sm tabular-nums text-black/50 dark:text-white/50">
                  {formatEGP(item.unitCost, locale)}
                </span>
              </div>

              {/* Received / Rejected */}
              <div className="text-end w-20">
                <span className="font-[family-name:var(--font-geist-mono)] text-[11px] tabular-nums text-black/35 dark:text-white/35">
                  {item.receivedQuantity.toLocaleString(locale)}
                  {item.rejectedQuantity > 0 && (
                    <span className="text-red-500/60"> -{item.rejectedQuantity.toLocaleString(locale)}</span>
                  )}
                </span>
              </div>

              {/* Line total */}
              <div className="text-end w-28">
                <span className="font-[family-name:var(--font-geist-mono)] text-sm font-medium tabular-nums text-black dark:text-white">
                  {formatEGP(item.lineTotal, locale)}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="mt-3 flex flex-col items-end gap-0.5 pe-3">
          <div className="flex items-center gap-8">
            <span className="text-[10px] text-black/30 dark:text-white/30">Subtotal</span>
            <span className="font-[family-name:var(--font-geist-mono)] text-sm tabular-nums text-black/60 dark:text-white/60">
              {formatEGP(po.subtotal, locale)}
            </span>
          </div>
          <div className="flex items-center gap-8">
            <span className="text-[10px] text-black/30 dark:text-white/30">VAT 14%</span>
            <span className="font-[family-name:var(--font-geist-mono)] text-sm tabular-nums text-black/60 dark:text-white/60">
              {formatEGP(po.vatAmount, locale)}
            </span>
          </div>
          <div className="flex items-center gap-8 mt-1 pt-1 border-t border-black/[0.06] dark:border-white/[0.06]">
            <span className="text-[10px] font-semibold text-black/50 dark:text-white/50">Total</span>
            <span className="font-[family-name:var(--font-geist-mono)] text-base font-semibold tabular-nums text-black dark:text-white">
              {formatEGP(po.total, locale)}
            </span>
          </div>
        </div>
      </section>

      {/* Delivery info */}
      <section>
        <h4 className="text-[11px] font-medium uppercase tracking-wider text-black/30 dark:text-white/30 mb-3">
          Delivery
        </h4>
        <div className="flex gap-8">
          <div>
            <span className="text-[10px] text-black/30 dark:text-white/30">Expected</span>
            <p className="font-[family-name:var(--font-geist-mono)] text-sm tabular-nums text-black/70 dark:text-white/70 mt-0.5">
              {formatDate(po.expectedDeliveryDate, locale)}
            </p>
          </div>
          <div>
            <span className="text-[10px] text-black/30 dark:text-white/30">Reference</span>
            <p className="font-[family-name:var(--font-geist-mono)] text-sm tabular-nums text-black/70 dark:text-white/70 mt-0.5">
              {po.codedDeliveryReference}
            </p>
          </div>
          <div>
            <span className="text-[10px] text-black/30 dark:text-white/30">Status</span>
            <p className="text-sm text-black/50 dark:text-white/50 mt-0.5">
              {['shipped', 'partially_received', 'received'].includes(po.status)
                ? 'In transit'
                : 'Awaiting shipment'}
            </p>
          </div>
        </div>
      </section>

      {/* Three-Way Match */}
      <ThreeWayMatch match={po.threeWayMatch} />

      {/* Documents */}
      <PODocuments />

      {/* Activity timeline */}
      <section>
        <h4 className="text-[11px] font-medium uppercase tracking-wider text-black/30 dark:text-white/30 mb-3">
          Activity
        </h4>
        {timeline.length === 0 ? (
          <p className="text-[11px] text-black/25 dark:text-white/25">No activity yet</p>
        ) : (
          <div className="space-y-0">
            {timeline.map((entry: { timestamp: string; event: string; user: string }, i: number) => (
              <div key={i} className="flex items-start gap-3 py-1.5">
                {/* Timeline dot + line */}
                <div className="flex flex-col items-center pt-1.5">
                  <div className={`size-1.5 rounded-full ${i === 0 ? 'bg-[#2563EB]' : 'bg-black/15 dark:bg-white/15'}`} />
                  {i < timeline.length - 1 && (
                    <div className="w-px flex-1 mt-0.5 bg-black/[0.06] dark:bg-white/[0.06]" />
                  )}
                </div>
                <div className="flex-1 min-w-0 pb-2">
                  <p className="text-sm text-black/70 dark:text-white/70">{entry.event}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-[family-name:var(--font-geist-mono)] text-[10px] tabular-nums text-black/25 dark:text-white/25">
                      {formatDateTime(entry.timestamp, locale)}
                    </span>
                    <span className="text-[10px] text-black/20 dark:text-white/20">{entry.user}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </motion.div>
  )
}
