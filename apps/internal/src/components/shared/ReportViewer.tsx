import { useQuery } from '@tanstack/react-query'
import {
  Dialog,
  Modal,
  ModalOverlay,
  Heading,
} from 'react-aria-components'
import {
  X,
  FileText,
  Loader2,
  Check,
  Circle,
  CircleDashed,
  XCircle,
} from 'lucide-react'
import {
  getOrderReport,
  type ResolvedReport,
} from '../../lib/server/order-reports'
import type { OrderReportStage } from '../../lib/db/db'

/**
 * ReportViewer — the living-document viewer.
 *
 * One template used everywhere an order report surfaces (sales canceled
 * row, inventory orders, finance, warehouse, dispatch). Renders every
 * filled section, greys out the stages that haven't happened yet, and
 * shows a terminal state for canceled orders.
 */

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

const STAGE_LABEL: Record<OrderReportStage, string> = {
  submitted: 'Submitted',
  evaluated: 'Evaluated',
  finance_partial: 'Partial payment',
  inventory_orders: 'Inventory sourced',
  finance_full: 'Fully paid',
  warehouse: 'Warehouse prepared',
  dispatch: 'Dispatched',
  delivered: 'Delivered',
  canceled: 'Canceled',
}

interface ReportViewerModalProps {
  rfqId: string | null
  onClose: () => void
}

export function ReportViewerModal({ rfqId, onClose }: ReportViewerModalProps) {
  const isOpen = !!rfqId
  const { data, isLoading } = useQuery({
    queryKey: ['order-report', rfqId],
    queryFn: () => getOrderReport({ data: { rfqId: rfqId! } }),
    enabled: isOpen,
    staleTime: 30_000,
  })

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
          className="relative rounded-2xl bg-[var(--color-surface)] dark:bg-[#0A0A0A] border border-black/[0.08] dark:border-white/[0.08] shadow-2xl outline-none overflow-hidden"
        >
          {() => (
            <div className="flex flex-col max-h-[85vh]">
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="absolute top-3 right-3 z-30 rounded-md p-1.5 bg-white dark:bg-[#161616] border border-black/10 dark:border-white/10 text-black/50 dark:text-white/50 hover:text-[var(--color-text)] transition-colors outline-none cursor-pointer"
              >
                <X size={14} strokeWidth={2} />
              </button>

              {isLoading || !data ? (
                <div className="flex items-center justify-center py-32">
                  <Loader2 size={20} strokeWidth={1.5} className="animate-spin text-[var(--color-text-subtle)]" />
                </div>
              ) : (
                <ReportViewer report={data} />
              )}
            </div>
          )}
        </Dialog>
      </Modal>
    </ModalOverlay>
  )
}

function formatRelative(iso: string | null): string {
  if (!iso) return '—'
  const ms = Date.now() - new Date(iso).getTime()
  const h = Math.abs(ms) / 3_600_000
  if (h < 1) return `${Math.round(h * 60)}m${ms >= 0 ? ' ago' : ' from now'}`
  if (h < 24) return `${Math.round(h)}h${ms >= 0 ? ' ago' : ' from now'}`
  return `${Math.floor(h / 24)}d${ms >= 0 ? ' ago' : ' from now'}`
}

function ReportViewer({ report }: { report: ResolvedReport }) {
  const isCanceled = report.currentStage === 'canceled'
  const currentIdx = STAGE_ORDER.indexOf(report.currentStage as OrderReportStage)

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-black/[0.06] dark:border-white/[0.06]">
        <div className="flex items-center gap-2 mb-1">
          <FileText size={12} strokeWidth={2.5} className="text-black/40 dark:text-white/40" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black/45 dark:text-white/45">
            Order report · {report.rfqId}
          </span>
        </div>
        <Heading slot="title" className="text-[22px] font-semibold leading-tight text-[var(--color-text)]">
          {report.sections.submitted?.customerName ?? 'Report'}
        </Heading>
        {isCanceled && (
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-black/[0.06] dark:bg-white/[0.08] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-black/60 dark:text-white/60">
            <XCircle size={11} strokeWidth={2.5} />
            Canceled · {report.canceledReason?.replace(/_/g, ' ')} · {formatRelative(report.canceledAt)}
          </div>
        )}
      </div>

      {/* Stage timeline */}
      <div className="px-6 py-4 border-b border-black/[0.05] dark:border-white/[0.05]">
        <div className="flex items-center gap-1.5 flex-wrap">
          {STAGE_ORDER.map((stage, i) => {
            const filled = !!report.sections[stage]
            const isCurrent = i === currentIdx
            const isPast = i < currentIdx
            const Icon = filled || isPast ? Check : isCurrent ? Circle : CircleDashed
            const tone = isCanceled
              ? 'text-black/25 dark:text-white/25'
              : filled || isPast
              ? 'text-emerald-600 dark:text-emerald-400'
              : isCurrent
              ? 'text-[var(--color-primary)]'
              : 'text-black/25 dark:text-white/25'
            return (
              <div key={stage} className={`inline-flex items-center gap-1 text-[10px] ${tone}`}>
                <Icon size={11} strokeWidth={2.5} />
                <span className={`uppercase tracking-wider ${isCurrent && !isCanceled ? 'font-semibold' : ''}`}>
                  {STAGE_LABEL[stage]}
                </span>
                {i < STAGE_ORDER.length - 1 && (
                  <span className="mx-1 text-black/15 dark:text-white/15">→</span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Filled sections */}
      <div className="px-6 py-5 space-y-6">
        {report.sections.submitted && (
          <Section label="Submitted" stage="submitted">
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              <Field label="Customer">{report.sections.submitted.customerName}</Field>
              <Field label="Tier">{report.sections.submitted.customerTier}</Field>
              <Field label="Contact">{report.sections.submitted.contactName}</Field>
              <Field label="Phone">{report.sections.submitted.phone}</Field>
              <Field label="Delivery">{report.sections.submitted.deliveryAddress}</Field>
              <Field label="City">{report.sections.submitted.deliveryCity}</Field>
              <Field label="Urgency">{report.sections.submitted.deliveryUrgencyDays} days</Field>
            </div>
            <div className="mt-4">
              <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-black/40 dark:text-white/40 mb-1.5">
                Items requested
              </div>
              <ul className="flex flex-col divide-y divide-black/[0.04] dark:divide-white/[0.04]">
                {report.sections.submitted.items.map((item) => (
                  <li
                    key={item.productSlug}
                    className="flex items-center justify-between py-1.5 text-[12px]"
                  >
                    <span className="text-[var(--color-text)]">{item.productName}</span>
                    <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-black/55 dark:text-white/55">
                      {item.quantity.toLocaleString('en-EG')} {item.unit}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </Section>
        )}

        {report.sections.evaluated && (
          <Section label="Evaluated" stage="evaluated">
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              <Field label="Quote #">{report.sections.evaluated.quoteNumber}</Field>
              <Field label="Margin">{report.sections.evaluated.marginPercent.toFixed(1)}%</Field>
              <Field label="Subtotal">
                {report.sections.evaluated.subtotal.toLocaleString('en-EG')} EGP
              </Field>
              <Field label="VAT">
                {report.sections.evaluated.vatAmount.toLocaleString('en-EG')} EGP
              </Field>
              <Field label="Total">
                <span className="font-semibold">
                  {report.sections.evaluated.total.toLocaleString('en-EG')} EGP
                </span>
              </Field>
              <Field label="Sent">
                {report.sections.evaluated.sentVia ?? '—'} ·{' '}
                {formatRelative(report.sections.evaluated.sentAt)}
              </Field>
            </div>
          </Section>
        )}

        {/* Placeholders for future stages */}
        {STAGE_ORDER.filter((s) => !report.sections[s] && s !== 'submitted' && s !== 'evaluated').map(
          (stage) => (
            <PlaceholderSection key={stage} stage={stage} />
          ),
        )}
      </div>
    </div>
  )
}

function Section({
  label,
  stage,
  children,
}: {
  label: string
  stage: OrderReportStage
  children: React.ReactNode
}) {
  return (
    <section className="rounded-xl border border-black/[0.06] dark:border-white/[0.06] p-4">
      <div className="flex items-center gap-2 mb-3">
        <Check size={11} strokeWidth={2.5} className="text-emerald-500" />
        <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[var(--color-text)]">
          {label}
        </span>
        <span className="h-[1px] flex-1 bg-black/[0.05] dark:bg-white/[0.05]" />
        <span className="text-[9px] text-black/30 dark:text-white/30">{stage}</span>
      </div>
      {children}
    </section>
  )
}

function PlaceholderSection({ stage }: { stage: OrderReportStage }) {
  return (
    <section className="rounded-xl border border-dashed border-black/[0.08] dark:border-white/[0.08] p-4 opacity-60">
      <div className="flex items-center gap-2">
        <CircleDashed size={11} strokeWidth={2} className="text-black/30 dark:text-white/30" />
        <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-black/40 dark:text-white/40">
          {STAGE_LABEL[stage]}
        </span>
        <span className="h-[1px] flex-1 bg-black/[0.04] dark:bg-white/[0.04]" />
        <span className="text-[9px] italic text-black/30 dark:text-white/30">
          not yet filled
        </span>
      </div>
    </section>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-black/40 dark:text-white/40">
        {label}
      </div>
      <div className="mt-0.5 text-[12px] text-[var(--color-text)]">{children}</div>
    </div>
  )
}
