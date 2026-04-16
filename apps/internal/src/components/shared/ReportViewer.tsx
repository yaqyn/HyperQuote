import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'motion/react'
import {
  Dialog,
  Modal,
  ModalOverlay,
  Heading,
} from 'react-aria-components'
import { X, XCircle, Clock } from 'lucide-react'
import {
  getOrderReport,
  type ResolvedReport,
} from '../../lib/server/order-reports'
import type { OrderReportStage } from '../../lib/db/db'

const STAGE_ORDER: OrderReportStage[] = [
  'submitted',
  'evaluated',
  'finance_partial',
  'inventory_orders',
  'finance_full',
  'warehouse',
  'dispatch',
  'delivered',
]

const DECLINE_REASON_LABEL: Record<string, string> = {
  outside_service_area: 'Outside service area',
  cannot_source: 'Cannot source',
  customer_blacklisted: 'Blacklisted',
  expired: 'Expired',
}

const STAGE_LABEL: Record<OrderReportStage, string> = {
  submitted: 'Submitted',
  evaluated: 'Evaluated',
  finance_partial: 'Partial payment',
  inventory_orders: 'Sourced',
  finance_full: 'Paid',
  warehouse: 'Warehouse',
  dispatch: 'Dispatched',
  delivered: 'Delivered',
  canceled: 'Canceled',
}

interface ReportViewerModalProps {
  rfqId: string | null
  onClose: () => void
}

export function ReportViewerModal({ rfqId, onClose }: ReportViewerModalProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['order-report', rfqId],
    queryFn: () => getOrderReport({ data: { rfqId: rfqId! } }),
    enabled: !!rfqId,
    staleTime: 30_000,
  })

  // Only open the modal once data is ready — no loading flash
  const showModal = !!rfqId && !!data && !isLoading

  return (
    <AnimatePresence>
      {showModal && (
        <ModalOverlay
          isOpen
          onOpenChange={(open) => !open && onClose()}
          isDismissable
          className="fixed inset-0 z-50 flex items-center justify-center"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-black/50"
          />
          <Modal className="relative z-10 w-full max-w-2xl mx-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 8 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            >
              <Dialog
                isKeyboardDismissDisabled
                className="rounded-2xl bg-[var(--color-surface)] dark:bg-[#0A0A0A] border border-black/[0.06] dark:border-white/[0.06] shadow-2xl outline-none overflow-hidden"
              >
                {() => (
                  <div className="flex flex-col max-h-[85vh]">
                    {data && (
                      <ReportContent report={data} onClose={onClose} />
                    )}
                  </div>
                )}
              </Dialog>
            </motion.div>
          </Modal>
        </ModalOverlay>
      )}
    </AnimatePresence>
  )
}

function formatRelative(iso: string | null): string {
  if (!iso) return '—'
  const ms = Date.now() - new Date(iso).getTime()
  const h = Math.abs(ms) / 3_600_000
  if (h < 1) return `${Math.round(h * 60)}m ago`
  if (h < 24) return `${Math.round(h)}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function formatMoney(n: number): string {
  return n.toLocaleString('en-EG')
}

function ReportContent({ report, onClose }: { report: ResolvedReport; onClose: () => void }) {
  const isCanceled = report.currentStage === 'canceled'
  const currentIdx = STAGE_ORDER.indexOf(report.currentStage as OrderReportStage)
  const sub = report.sections.submitted
  const ev = report.sections.evaluated
  const filledCount = STAGE_ORDER.filter((s) => !!report.sections[s]).length

  return (
    <>
      {/* ── Fixed top bar ────────────────────────────────────── */}
      <div className="sticky top-0 z-10 bg-[var(--color-surface)] dark:bg-[#0A0A0A] border-b border-black/[0.06] dark:border-white/[0.06] px-6 py-4 shrink-0">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            {/* Customer name — hero */}
            <Heading slot="title" className="text-[22px] font-semibold leading-tight text-[var(--color-text)] truncate">
              {sub?.customerName ?? 'Order Report'}
            </Heading>

            {/* Meta line: RFQ · stage · tier */}
            <div className="flex items-center gap-2 mt-1.5">
              <span className="font-[var(--font-geist-mono)] text-[11px] text-[var(--color-text-muted)] tabular-nums">
                {report.rfqId.toUpperCase()}
              </span>
              <span className="text-[var(--color-border)]">·</span>
              {isCanceled ? (
                <span className="font-[var(--font-geist-mono)] text-[11px] font-medium text-[var(--color-error)]">
                  {(report.canceledReason && DECLINE_REASON_LABEL[report.canceledReason]) ?? 'Canceled'}
                </span>
              ) : (
                <span className="font-[var(--font-geist-mono)] text-[11px] font-medium text-[var(--color-text)]">
                  {STAGE_LABEL[report.currentStage]}
                </span>
              )}
              {sub?.customerTier && (
                <>
                  <span className="text-[var(--color-border)]">·</span>
                  <span className="font-[var(--font-geist-mono)] text-[11px] text-[var(--color-text-muted)]">
                    Tier {sub.customerTier}
                  </span>
                </>
              )}
            </div>

            {/* Stage dots */}
            <div className="flex items-center gap-1 mt-3">
              {STAGE_ORDER.map((stage, i) => {
                const filled = !!report.sections[stage]
                const isPast = i < currentIdx || (i === currentIdx && !isCanceled)
                return (
                  <div
                    key={stage}
                    className={`h-1 rounded-full transition-colors ${
                      filled || isPast
                        ? isCanceled ? 'bg-[var(--color-error)]/60' : 'bg-[var(--color-text)]'
                        : 'bg-black/[0.06] dark:bg-white/[0.06]'
                    }`}
                    style={{ width: `${100 / STAGE_ORDER.length}%` }}
                    title={STAGE_LABEL[stage]}
                  />
                )
              })}
            </div>
          </div>

          {/* Close */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex items-center justify-center w-7 h-7 rounded-md text-[var(--color-text-subtle)] hover:text-[var(--color-text)] hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors outline-none cursor-pointer shrink-0 mt-0.5"
          >
            <X size={14} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* ── Scrollable content ───────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="px-6 py-5 space-y-0">
          {/* ── Canceled/Rejected reason ───────────────────────── */}
          {isCanceled && (
            <div className="pb-6 mb-2 border-b border-[var(--color-error)]/10">
              <StageHeader>
                <span className="text-[var(--color-error)]">Rejected</span>
              </StageHeader>
              <div className="mt-3 space-y-2">
                <div>
                  <Label>Reason</Label>
                  <Value size="lg">{(report.canceledReason && DECLINE_REASON_LABEL[report.canceledReason]) ?? report.canceledReason?.replace(/_/g, ' ') ?? 'No reason provided'}</Value>
                </div>
                {report.canceledNote && (
                  <div>
                    <Label>Note</Label>
                    <p className="text-[13px] text-[var(--color-text-muted)] leading-relaxed mt-0.5">{report.canceledNote}</p>
                  </div>
                )}
                {report.canceledAt && (
                  <div>
                    <Label>Rejected at</Label>
                    <Value mono>{formatRelative(report.canceledAt)}</Value>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Submitted ──────────────────────────────────────── */}
          {sub && (
            <div className="pb-6">
              <StageHeader>Submitted</StageHeader>

              {/* Contact + delivery as two side-by-side blocks */}
              <div className="grid grid-cols-2 gap-6 mt-4">
                <div className="space-y-3">
                  <div>
                    <Label>Contact</Label>
                    <Value size="lg">{sub.contactName}</Value>
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Value mono>{sub.phone}</Value>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <Label>Delivery</Label>
                    <Value size="lg">{sub.deliveryAddress}</Value>
                  </div>
                  <div className="flex items-start gap-6">
                    <div>
                      <Label>City</Label>
                      <Value>{sub.deliveryCity}</Value>
                    </div>
                    <div>
                      <Label>Urgency</Label>
                      <Value mono>{sub.deliveryUrgencyDays}d</Value>
                    </div>
                  </div>
                </div>
              </div>

              {/* Items — full width table */}
              {sub.items.length > 0 && (
                <div className="mt-5">
                  <Label>Items requested</Label>
                  <div className="mt-2 rounded-lg bg-black/[0.02] dark:bg-white/[0.02]">
                    {sub.items.map((item, i) => (
                      <div
                        key={item.productSlug}
                        className={`flex items-baseline justify-between px-3 py-2.5 ${
                          i < sub.items.length - 1 ? 'border-b border-black/[0.03] dark:border-white/[0.03]' : ''
                        }`}
                      >
                        <span className="text-[14px] text-[var(--color-text)]">
                          {item.productName}
                        </span>
                        <span className="font-[var(--font-geist-mono)] text-[14px] font-medium text-[var(--color-text)] tabular-nums">
                          {item.quantity.toLocaleString('en-EG')}
                          <span className="text-[11px] font-normal text-[var(--color-text-subtle)] ms-1">{item.unit}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Evaluated ──────────────────────────────────────── */}
          {ev && (
            <div className="py-6 border-t border-black/[0.04] dark:border-white/[0.04]">
              <StageHeader>Evaluated</StageHeader>

              <div className="mt-4 flex items-end justify-between">
                {/* Left: quote details */}
                <div className="space-y-3">
                  <div>
                    <Label>Quote</Label>
                    <Value mono size="lg">{ev.quoteNumber}</Value>
                  </div>
                  <div className="flex items-start gap-6">
                    <div>
                      <Label>Subtotal</Label>
                      <Value mono>{formatMoney(ev.subtotal)}</Value>
                    </div>
                    {ev.vatAmount > 0 && (
                      <div>
                        <Label>VAT</Label>
                        <Value mono>{formatMoney(ev.vatAmount)}</Value>
                      </div>
                    )}
                    <div>
                      <Label>Margin</Label>
                      <Value mono>{ev.marginPercent.toFixed(1)}%</Value>
                    </div>
                  </div>
                  {ev.sentVia && (
                    <div className="font-[var(--font-geist-mono)] text-[10px] text-[var(--color-text-subtle)] tabular-nums">
                      Sent via {ev.sentVia} · {formatRelative(ev.sentAt)}
                    </div>
                  )}
                </div>

                {/* Right: total as hero number */}
                <div className="text-end">
                  <Label>Total</Label>
                  <div className="font-[var(--font-geist-mono)] text-[28px] font-semibold text-[var(--color-text)] tabular-nums leading-none mt-1">
                    {formatMoney(ev.total)}
                  </div>
                  <div className="font-[var(--font-geist-mono)] text-[11px] text-[var(--color-text-subtle)] mt-0.5">
                    EGP
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Unfilled stages — pending ─────────────────────── */}
          {STAGE_ORDER.filter((s) => !report.sections[s] && s !== 'canceled').length > 0 && (
            <div className="py-5 border-t border-black/[0.04] dark:border-white/[0.04]">
              <div className="flex items-start gap-2">
                <Clock size={11} strokeWidth={1.5} className="text-black/[0.2] dark:text-white/[0.2] mt-px shrink-0" />
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                  {STAGE_ORDER.filter((s) => !report.sections[s] && s !== 'canceled').map((stage) => (
                    <span
                      key={stage}
                      className="font-[var(--font-geist-mono)] text-[10px] text-black/[0.18] dark:text-white/[0.18] uppercase tracking-wider"
                    >
                      {STAGE_LABEL[stage]}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function StageHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-[var(--font-geist-mono)] text-[11px] font-semibold text-[var(--color-text)] uppercase tracking-[0.15em]">
      {children}
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-[var(--font-geist-mono)] text-[9px] text-[var(--color-text-subtle)] uppercase tracking-wider">
      {children}
    </div>
  )
}

function Value({ children, mono, size }: { children: React.ReactNode; mono?: boolean; size?: 'lg' }) {
  return (
    <div className={`mt-0.5 text-[var(--color-text)] ${
      size === 'lg' ? 'text-[15px] font-medium' : 'text-[13px]'
    } ${mono ? 'font-[var(--font-geist-mono)] tabular-nums' : ''}`}>
      {children}
    </div>
  )
}
