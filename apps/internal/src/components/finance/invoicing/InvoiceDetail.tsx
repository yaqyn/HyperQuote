import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Button } from 'react-aria-components'
import { getInvoiceDetail } from '../../../lib/server/finance-invoices'
import { useFinanceStore } from '../../../stores/finance'
import { CurrencyCell } from '../shared/CurrencyCell'
import { StatusBadge } from '../shared/StatusBadge'
import { InvoiceActions } from './InvoiceActions'
import type { ETASubmissionStatus } from '../../../types/finance'

// ─── ETA badge ────────────────────────────────────────
const ETA_BADGE_STYLES: Record<ETASubmissionStatus, string> = {
  pending: 'bg-black/[0.06] dark:bg-white/[0.06] text-black/40 dark:text-white/40',
  submitted: 'bg-[#2563EB]/10 text-[#2563EB]',
  accepted: 'bg-green-500/10 text-green-600 dark:text-green-400',
  rejected: 'bg-red-500/10 text-red-600 dark:text-red-400',
  error: 'bg-red-500/10 text-red-600 dark:text-red-400',
}

const ETA_LABELS: Record<ETASubmissionStatus, string> = {
  pending: 'ETA Pending',
  submitted: 'ETA Submitted',
  accepted: 'ETA Accepted',
  rejected: 'ETA Rejected',
  error: 'ETA Error',
}

function ETABadge({ status }: { status: ETASubmissionStatus }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium tracking-wide uppercase ${ETA_BADGE_STYLES[status]}`}
    >
      {ETA_LABELS[status]}
    </span>
  )
}

/** Calculate days since sent for overdue display */
function getDaysSinceSent(issuedDate: string): number {
  const now = new Date()
  const issued = new Date(issuedDate)
  return Math.floor((now.getTime() - issued.getTime()) / (1000 * 60 * 60 * 24))
}

/**
 * "The Document Press" — Invoice detail as an actual document.
 * Clean header, seller/buyer, line items table, totals section.
 * Action buttons as icon row at top via InvoiceActions.
 */
export function InvoiceDetail() {
  const { t } = useTranslation('finance')
  const selectedInvoiceId = useFinanceStore((s) => s.selectedInvoiceId)
  const setSelectedInvoiceId = useFinanceStore((s) => s.setSelectedInvoiceId)

  const { data, isLoading } = useQuery({
    queryKey: ['finance', 'invoice', selectedInvoiceId],
    queryFn: () => getInvoiceDetail({ data: { invoiceId: selectedInvoiceId! } }),
    enabled: !!selectedInvoiceId,
    staleTime: 30_000,
  })

  if (isLoading || !data?.invoice) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="text-xs tracking-widest uppercase text-black/30 dark:text-white/30">
          Loading
        </span>
      </div>
    )
  }

  const invoice = data.invoice

  return (
    <div className="max-w-4xl mx-auto">
      {/* ─── Top bar: back + actions ────────────────────── */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-black/[0.06] dark:border-white/[0.06]">
        <Button
          onPress={() => setSelectedInvoiceId(null)}
          className="text-xs text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors"
        >
          {t('invoicing.backToList', 'Back')}
        </Button>
        <InvoiceActions invoice={invoice} />
      </div>

      {/* ─── Document ───────────────────────────────────── */}
      <div className="px-8 py-8 space-y-8">
        {/* Document header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[10px] tracking-widest uppercase text-black/30 dark:text-white/30 mb-1">
              {t('invoicing.taxInvoice', 'Tax Invoice')}
            </div>
            <div className="font-[family-name:var(--font-geist-mono)] tabular-nums text-xl text-[#2563EB] font-medium">
              {invoice.number}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={invoice.status} />
            <ETABadge status={invoice.etaStatus} />
          </div>
        </div>

        {/* Dates row + overdue indicator */}
        <div className="flex items-center gap-8 text-xs">
          <div>
            <span className="text-black/30 dark:text-white/30 me-2">{t('invoicing.issued', 'Issued')}</span>
            <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-black/70 dark:text-white/70">{invoice.issuedDate}</span>
          </div>
          <div>
            <span className="text-black/30 dark:text-white/30 me-2">{t('invoicing.due', 'Due')}</span>
            <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-black/70 dark:text-white/70">{invoice.dueDate}</span>
          </div>
          {/* Days since sent — prominent for overdue invoices */}
          {invoice.status !== 'draft' && invoice.status !== 'paid' && (() => {
            const daysSinceSent = getDaysSinceSent(invoice.issuedDate)
            const dueDate = new Date(invoice.dueDate)
            const isOverdue = new Date() > dueDate
            const daysOverdue = isOverdue ? Math.floor((Date.now() - dueDate.getTime()) / (1000 * 60 * 60 * 24)) : 0
            return isOverdue ? (
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-red-500/[0.06] border border-red-500/10">
                <span className="size-1.5 rounded-full bg-red-500" />
                <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-red-600 dark:text-red-400 font-medium">
                  {t('invoicing.daysOverdue', '{{days}} days overdue', { days: daysOverdue })}
                </span>
              </div>
            ) : (
              <div className="text-black/30 dark:text-white/30">
                <span className="me-1">{t('invoicing.daysSinceSent', 'Sent')}</span>
                <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">{daysSinceSent}d</span>
              </div>
            )
          })()}
        </div>

        {/* ─── Seller / Buyer ───────────────────────────── */}
        <div className="grid grid-cols-2 gap-12 py-6 border-y border-black/[0.06] dark:border-white/[0.06]">
          {/* Seller */}
          <div>
            <div className="text-[10px] tracking-widest uppercase text-black/25 dark:text-white/25 mb-2">
              {t('invoicing.from', 'From')}
            </div>
            <div className="text-sm font-medium text-black/80 dark:text-white/80" dir="rtl" lang="ar">
              هايبركوت للتوريدات
            </div>
            <div className="text-xs text-black/40 dark:text-white/40 mt-0.5">HyperQuote Trading LLC</div>
            <div className="text-xs text-black/30 dark:text-white/30 mt-2 space-y-0.5">
              <div>
                CR <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">12345678</span>
              </div>
              <div>
                TRN <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">{invoice.sellerTRN}</span>
              </div>
              <div>Cairo, Egypt</div>
            </div>
            {invoice.digitalSignatureId && (
              <div className="flex items-center gap-1 text-green-600 dark:text-green-400 mt-3 text-[10px] tracking-wider uppercase">
                <span className="size-1.5 rounded-full bg-green-500" />
                {t('invoicing.digitallySigned', 'Digitally Signed')}
              </div>
            )}
          </div>

          {/* Buyer */}
          <div>
            <div className="text-[10px] tracking-widest uppercase text-black/25 dark:text-white/25 mb-2">
              {t('invoicing.to', 'To')}
            </div>
            <div className="text-sm font-medium text-black/80 dark:text-white/80">
              {invoice.customerName}
            </div>
            <div className="text-xs text-black/30 dark:text-white/30 mt-2">
              TRN <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">{invoice.buyerTRN}</span>
            </div>
          </div>
        </div>

        {/* ─── Line Items ───────────────────────────────── */}
        <div>
          {/* Table header */}
          <div className="grid grid-cols-[1fr_100px_60px_80px_100px_100px_80px] gap-0 py-2 text-[10px] tracking-wider uppercase text-black/25 dark:text-white/25 border-b border-black/[0.08] dark:border-white/[0.08]">
            <div>{t('invoicing.productName', 'Product')}</div>
            <div>{t('invoicing.egsCode', 'EGS Code')}</div>
            <div className="text-center">{t('invoicing.uom', 'UOM')}</div>
            <div className="text-end">{t('invoicing.qty', 'Qty')}</div>
            <div className="text-end">{t('invoicing.unitPrice', 'Unit Price')}</div>
            <div className="text-end">{t('invoicing.lineTotal', 'Total')}</div>
            <div className="text-end">{t('invoicing.vatAmount', 'VAT')}</div>
          </div>

          {/* Rows */}
          {invoice.items.map((item) => (
            <div
              key={item.id}
              className="grid grid-cols-[1fr_100px_60px_80px_100px_100px_80px] gap-0 py-2.5 border-b border-black/[0.03] dark:border-white/[0.03] items-baseline"
            >
              <div>
                <div className="text-xs text-black/70 dark:text-white/70">{item.productName}</div>
                <div className="text-[11px] text-black/30 dark:text-white/30" dir="rtl" lang="ar">
                  {item.productNameAr}
                </div>
              </div>
              <div className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[11px] text-black/30 dark:text-white/30">
                {item.egsCode}
              </div>
              <div className="text-center text-[11px] text-black/40 dark:text-white/40">
                {item.uom}
              </div>
              <div className="text-end font-[family-name:var(--font-geist-mono)] tabular-nums text-xs text-black/60 dark:text-white/60">
                {item.quantity.toLocaleString()}
              </div>
              <div className="text-end">
                <CurrencyCell amount={item.unitPrice} className="text-xs" />
              </div>
              <div className="text-end">
                <CurrencyCell amount={item.lineTotal} className="text-xs" />
              </div>
              <div className="text-end">
                <CurrencyCell amount={item.vatAmount} className="text-xs text-black/40 dark:text-white/40" />
              </div>
            </div>
          ))}
        </div>

        {/* ─── Totals ───────────────────────────────────── */}
        <div className="flex justify-end">
          <div className="w-64 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-black/35 dark:text-white/35">{t('invoicing.subtotal', 'Subtotal')}</span>
              <CurrencyCell amount={invoice.subtotal} className="text-xs" />
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-black/35 dark:text-white/35">{t('invoicing.vat14', 'VAT 14%')}</span>
              <CurrencyCell amount={invoice.vatAmount} className="text-xs" />
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-black/[0.08] dark:border-white/[0.08]">
              <span className="text-xs font-medium text-black/60 dark:text-white/60">
                {t('invoicing.grandTotal', 'Grand Total')}
              </span>
              <CurrencyCell amount={invoice.grandTotal} className="text-sm font-medium" />
            </div>
          </div>
        </div>

        {/* ─── Payment Terms / Bank Details ──────────────── */}
        <div className="grid grid-cols-2 gap-12 pt-6 border-t border-black/[0.06] dark:border-white/[0.06]">
          <div>
            <div className="text-[10px] tracking-widest uppercase text-black/25 dark:text-white/25 mb-2">
              {t('invoicing.paymentTerms', 'Payment Terms')}
            </div>
            <div className="text-xs text-black/60 dark:text-white/60">Net 30 days from invoice date</div>
          </div>
          <div>
            <div className="text-[10px] tracking-widest uppercase text-black/25 dark:text-white/25 mb-2">
              {t('invoicing.bankDetails', 'Bank Details')}
            </div>
            <div className="text-xs text-black/50 dark:text-white/50 space-y-0.5">
              <div>Commercial International Bank (CIB)</div>
              <div>
                <span className="text-black/30 dark:text-white/30 me-1">Acct</span>
                <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">1234567890123</span>
              </div>
              <div>
                <span className="text-black/30 dark:text-white/30 me-1">SWIFT</span>
                <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">CIBEEGCX</span>
              </div>
              <div>
                <span className="text-black/30 dark:text-white/30 me-1">IBAN</span>
                <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">EG380002012345678901234567</span>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Timeline ─────────────────────────────────── */}
        <div className="pt-6 border-t border-black/[0.06] dark:border-white/[0.06]">
          <div className="text-[10px] tracking-widest uppercase text-black/25 dark:text-white/25 mb-3">
            {t('invoicing.timeline', 'Timeline')}
          </div>
          <div className="flex items-center gap-0">
            <TimelineStep
              label={t('invoicing.created', 'Created')}
              date={invoice.issuedDate}
              active
            />
            <TimelineConnector active={invoice.status !== 'draft'} />
            <TimelineStep
              label={t('invoicing.sent', 'Sent')}
              date={invoice.status !== 'draft' ? invoice.issuedDate : undefined}
              active={invoice.status !== 'draft'}
            />
            <TimelineConnector
              active={
                invoice.status === 'viewed' ||
                invoice.status === 'partially_paid' ||
                invoice.status === 'paid'
              }
            />
            <TimelineStep
              label={t('invoicing.viewed', 'Viewed')}
              date={
                invoice.status === 'viewed' || invoice.status === 'partially_paid' || invoice.status === 'paid'
                  ? invoice.issuedDate
                  : undefined
              }
              active={
                invoice.status === 'viewed' ||
                invoice.status === 'partially_paid' ||
                invoice.status === 'paid'
              }
            />
            <TimelineConnector active={invoice.status === 'paid'} />
            <TimelineStep
              label={t('invoicing.paid', 'Paid')}
              date={invoice.status === 'paid' ? invoice.dueDate : undefined}
              active={invoice.status === 'paid'}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function TimelineStep({ label, date, active }: { label: string; date?: string; active: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`size-2 rounded-full ${
          active ? 'bg-[#2563EB]' : 'bg-black/10 dark:bg-white/10'
        }`}
      />
      <span className={`text-[10px] ${active ? 'text-black/60 dark:text-white/60' : 'text-black/20 dark:text-white/20'}`}>
        {label}
      </span>
      {date && (
        <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[9px] text-black/25 dark:text-white/25">
          {date}
        </span>
      )}
    </div>
  )
}

function TimelineConnector({ active }: { active: boolean }) {
  return (
    <div
      className={`flex-1 h-px min-w-[24px] mx-1 ${
        active ? 'bg-[#2563EB]/30' : 'bg-black/[0.06] dark:bg-white/[0.06]'
      }`}
      style={{ marginTop: '-16px' }}
    />
  )
}
