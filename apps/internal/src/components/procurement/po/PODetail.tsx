import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button, Dialog, DialogTrigger, Heading, Modal, ModalOverlay } from 'react-aria-components'
import { getPODetail, updatePOStatus } from '../../../lib/server/procurement-po'
import type { PurchaseOrder, POItem } from '../../../types/procurement'
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

// ─── Status Badge ─────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-black/5 text-black/60 dark:bg-white/10 dark:text-white/60',
  sent: 'bg-[#2563EB]/10 text-[#2563EB]',
  confirmed: 'bg-[#2563EB]/10 text-[#2563EB]',
  in_production: 'bg-[#2563EB]/10 text-[#2563EB]',
  shipped: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-300',
  partially_received: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-300',
  received: 'bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-300',
  inspected: 'bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-300',
  closed: 'bg-black/5 text-black/40 dark:bg-white/5 dark:text-white/40',
  rejected: 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300',
  cancelled: 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300',
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
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
        isDismissable
      >
        <Modal
          className="mx-4 w-full max-w-sm rounded-xl border border-black/10 bg-white/90 p-6 shadow-xl backdrop-blur-2xl
            dark:border-white/10 dark:bg-black/90"
          isKeyboardDismissDisabled
        >
          <Dialog className="outline-none">
            {({ close }) => (
              <>
                <Heading slot="title" className="text-base font-semibold">
                  {title}
                </Heading>
                <p className="mt-2 text-sm text-black/60 dark:text-white/60">
                  {description}
                </p>
                <div className="mt-4 flex justify-end gap-2">
                  <Button
                    className="rounded-md border border-black/10 px-3 py-1.5 text-sm font-medium outline-none
                      data-[hovered]:bg-black/5 data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50
                      dark:border-white/10 dark:data-[hovered]:bg-white/10"
                    onPress={close}
                  >
                    Cancel
                  </Button>
                  <Button
                    className={`rounded-md px-3 py-1.5 text-sm font-medium text-white outline-none
                      data-[focus-visible]:ring-2 data-[focus-visible]:ring-offset-2
                      ${isDestructive
                        ? 'bg-red-600 data-[hovered]:bg-red-700 data-[focus-visible]:ring-red-500'
                        : 'bg-[#2563EB] data-[hovered]:bg-[#2563EB]/90 data-[focus-visible]:ring-[#2563EB]/50'
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
        <p className="text-sm text-black/40 dark:text-white/40">Loading PO details...</p>
      </div>
    )
  }

  const { po, timeline } = data

  return (
    <div className="flex flex-col gap-6 p-4 overflow-auto">
      {/* Back button */}
      <Button
        className="self-start flex items-center gap-1 text-sm text-black/50 outline-none
          data-[hovered]:text-black/80 data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50
          dark:text-white/50 dark:data-[hovered]:text-white/80"
        onPress={onBack}
      >
        <svg className="h-4 w-4 rtl:rotate-180" viewBox="0 0 16 16" fill="none">
          <path d="M10 4L6 8L10 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Back to list
      </Button>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="font-[family-name:var(--font-geist-mono)] text-lg font-semibold tabular-nums">
              {po.poNumber}
            </h2>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[po.status] ?? ''}`}>
              {po.status.replace(/_/g, ' ')}
            </span>
          </div>
          <p className="text-sm text-black/60 dark:text-white/60 mt-1">
            {po.supplierName}
          </p>
          <p className="font-[family-name:var(--font-geist-mono)] text-xs text-black/40 dark:text-white/40 mt-0.5 tabular-nums">
            {po.codedDeliveryReference}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {po.status === 'draft' && (
            <ConfirmDialog
              title="Send to Supplier"
              description="This will send the purchase order to the supplier for confirmation."
              confirmLabel="Send PO"
              onConfirm={() => statusMutation.mutate({ status: 'sent' })}
            >
              <Button
                className="rounded-md bg-[#2563EB] px-3 py-1.5 text-sm font-medium text-white outline-none
                  data-[hovered]:bg-[#2563EB]/90 data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50 data-[focus-visible]:ring-offset-2"
              >
                Send to Supplier
              </Button>
            </ConfirmDialog>
          )}

          {!['closed', 'rejected', 'cancelled'].includes(po.status) && (
            <ConfirmDialog
              title="Cancel Purchase Order"
              description="This action cannot be undone. The supplier will be notified of the cancellation."
              confirmLabel="Cancel PO"
              onConfirm={() => statusMutation.mutate({ status: 'cancelled', reason: 'Cancelled by procurement' })}
              isDestructive
            >
              <Button
                className="rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 outline-none
                  data-[hovered]:bg-red-50 data-[focus-visible]:ring-2 data-[focus-visible]:ring-red-500/50
                  dark:border-red-800 dark:text-red-400 dark:data-[hovered]:bg-red-950/30"
              >
                Cancel PO
              </Button>
            </ConfirmDialog>
          )}
        </div>
      </div>

      {/* Status Flow Pipeline */}
      <POStatusFlow currentStatus={po.status} />

      {/* Line Items Table */}
      <div className="rounded-lg border border-black/10 dark:border-white/10">
        <div className="px-4 py-3 border-b border-black/10 dark:border-white/10">
          <h4 className="text-sm font-semibold">Line Items</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-start">
            <thead className="border-b border-black/10 dark:border-white/10">
              <tr>
                <th className="px-3 py-2 text-start text-xs font-medium text-black/50 dark:text-white/50">Product</th>
                <th className="px-3 py-2 text-start text-xs font-medium text-black/50 dark:text-white/50">Qty</th>
                <th className="px-3 py-2 text-start text-xs font-medium text-black/50 dark:text-white/50">Unit Cost</th>
                <th className="px-3 py-2 text-start text-xs font-medium text-black/50 dark:text-white/50">Received</th>
                <th className="px-3 py-2 text-start text-xs font-medium text-black/50 dark:text-white/50">Rejected</th>
                <th className="px-3 py-2 text-start text-xs font-medium text-black/50 dark:text-white/50">Line Total</th>
              </tr>
            </thead>
            <tbody>
              {po.items.map((item: POItem) => (
                <tr key={item.id} className="border-b border-black/5 dark:border-white/5">
                  <td className="px-3 py-2 text-sm">{item.productName}</td>
                  <td className="px-3 py-2 font-[family-name:var(--font-geist-mono)] text-sm tabular-nums">
                    {item.quantity.toLocaleString(locale)}
                  </td>
                  <td className="px-3 py-2 font-[family-name:var(--font-geist-mono)] text-sm tabular-nums">
                    {formatEGP(item.unitCost, locale)}
                  </td>
                  <td className="px-3 py-2 font-[family-name:var(--font-geist-mono)] text-sm tabular-nums">
                    {item.receivedQuantity.toLocaleString(locale)}
                  </td>
                  <td className="px-3 py-2 font-[family-name:var(--font-geist-mono)] text-sm tabular-nums">
                    {item.rejectedQuantity > 0 ? (
                      <span className="text-red-600 dark:text-red-400">{item.rejectedQuantity.toLocaleString(locale)}</span>
                    ) : (
                      <span className="text-black/30 dark:text-white/30">0</span>
                    )}
                  </td>
                  <td className="px-3 py-2 font-[family-name:var(--font-geist-mono)] text-sm font-medium tabular-nums">
                    {formatEGP(item.lineTotal, locale)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="border-t border-black/10 dark:border-white/10 px-4 py-3">
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-6">
              <span className="text-xs text-black/50 dark:text-white/50">Subtotal</span>
              <span className="font-[family-name:var(--font-geist-mono)] text-sm tabular-nums">
                {formatEGP(po.subtotal, locale)}
              </span>
            </div>
            <div className="flex items-center gap-6">
              <span className="text-xs text-black/50 dark:text-white/50">VAT (14%)</span>
              <span className="font-[family-name:var(--font-geist-mono)] text-sm tabular-nums">
                {formatEGP(po.vatAmount, locale)}
              </span>
            </div>
            <div className="flex items-center gap-6 border-t border-black/10 dark:border-white/10 pt-1 mt-1">
              <span className="text-xs font-semibold">Total</span>
              <span className="font-[family-name:var(--font-geist-mono)] text-sm font-semibold tabular-nums">
                {formatEGP(po.total, locale)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Delivery Tracking */}
      <div className="rounded-lg border border-black/10 dark:border-white/10 p-4">
        <h4 className="text-sm font-semibold mb-3">Delivery Tracking</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <span className="text-xs text-black/50 dark:text-white/50">Expected Delivery</span>
            <p className="font-[family-name:var(--font-geist-mono)] text-sm tabular-nums mt-0.5">
              {formatDate(po.expectedDeliveryDate, locale)}
            </p>
          </div>
          <div>
            <span className="text-xs text-black/50 dark:text-white/50">Coded Reference</span>
            <p className="font-[family-name:var(--font-geist-mono)] text-sm tabular-nums mt-0.5">
              {po.codedDeliveryReference}
            </p>
          </div>
          <div>
            <span className="text-xs text-black/50 dark:text-white/50">Tracking</span>
            <p className="text-sm text-black/40 dark:text-white/40 mt-0.5">
              {['shipped', 'partially_received', 'received'].includes(po.status)
                ? 'In transit'
                : 'Awaiting shipment'}
            </p>
          </div>
        </div>
      </div>

      {/* Three-Way Match */}
      <ThreeWayMatch match={po.threeWayMatch} />

      {/* Documents */}
      <PODocuments />

      {/* Activity Log */}
      <div className="rounded-lg border border-black/10 dark:border-white/10 p-4">
        <h4 className="text-sm font-semibold mb-3">Activity</h4>
        <div className="space-y-3">
          {timeline.map((entry: { timestamp: string; event: string; user: string }, i: number) => (
            <div key={i} className="flex items-start gap-3">
              <div className="mt-1 h-1.5 w-1.5 rounded-full bg-black/20 dark:bg-white/20 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm">{entry.event}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-[family-name:var(--font-geist-mono)] text-xs text-black/40 dark:text-white/40 tabular-nums">
                    {formatDateTime(entry.timestamp, locale)}
                  </span>
                  <span className="text-xs text-black/30 dark:text-white/30">{entry.user}</span>
                </div>
              </div>
            </div>
          ))}
          {timeline.length === 0 && (
            <p className="text-xs text-black/40 dark:text-white/40">No activity yet</p>
          )}
        </div>
      </div>
    </div>
  )
}
