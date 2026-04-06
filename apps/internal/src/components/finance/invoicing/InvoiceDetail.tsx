import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { getInvoiceDetail } from '../../../lib/server/finance-invoices'
import { useFinanceStore } from '../../../stores/finance'
import { CurrencyCell } from '../shared/CurrencyCell'
import { StatusBadge } from '../shared/StatusBadge'
import { InvoiceActions } from './InvoiceActions'
import type { ETASubmissionStatus } from '../../../types/finance'

// ─── ETA Status Badge ───────────────────────────────────
const ETA_COLORS: Record<ETASubmissionStatus, string> = {
  pending: 'bg-black/5 text-black/60 dark:bg-white/10 dark:text-white/60',
  submitted: 'bg-[#2563EB]/10 text-[#2563EB]',
  accepted: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  error: 'bg-red-200 text-red-900 font-bold dark:bg-red-900/50 dark:text-red-300',
}

function ETABadge({ status }: { status: ETASubmissionStatus }) {
  const label = status.charAt(0).toUpperCase() + status.slice(1)
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${ETA_COLORS[status]}`}>
      ETA: {label}
    </span>
  )
}

/**
 * Full invoice detail view with seller/buyer info, line items, VAT 14%, grand total, ETA status.
 * Shows back button, header badges, seller/buyer panels, line items table, totals, timeline, and actions.
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
      <div className="p-6 text-center text-black/40 dark:text-white/40">
        Loading invoice...
      </div>
    )
  }

  const invoice = data.invoice

  return (
    <div className="p-6 space-y-6">
      {/* ─── Back Button ────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setSelectedInvoiceId(null)}
        className="flex items-center gap-1 text-sm text-[#2563EB] hover:underline"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
        </svg>
        {t('invoicing.backToList', 'Back to Invoices')}
      </button>

      {/* ─── Header ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-semibold">
          {t('invoicing.invoice', 'Invoice')} #{' '}
          <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">{invoice.number}</span>
        </h2>
        <StatusBadge status={invoice.status} />
        <ETABadge status={invoice.etaStatus} />
      </div>

      {/* ─── Seller & Buyer Info ────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Seller */}
        <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 backdrop-blur-sm p-4">
          <h3 className="text-xs text-black/50 dark:text-white/50 mb-2 font-medium uppercase tracking-wide">
            {t('invoicing.seller', 'Seller')}
          </h3>
          <div className="space-y-1 text-sm">
            <div className="font-semibold" dir="rtl" lang="ar">هايبركوت للتوريدات</div>
            <div className="text-black/60 dark:text-white/60">HyperQuote Trading LLC</div>
            <div className="text-black/40 dark:text-white/40">
              CR: <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">12345678</span>
            </div>
            <div className="text-black/40 dark:text-white/40">
              TRN: <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">{invoice.sellerTRN}</span>
            </div>
            <div className="text-black/40 dark:text-white/40">Cairo, Egypt</div>
            {invoice.digitalSignatureId && (
              <div className="flex items-center gap-1 text-green-600 dark:text-green-400 mt-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
                <span className="text-xs">{t('invoicing.digitallySigned', 'Digitally Signed')}</span>
              </div>
            )}
          </div>
        </div>

        {/* Buyer */}
        <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 backdrop-blur-sm p-4">
          <h3 className="text-xs text-black/50 dark:text-white/50 mb-2 font-medium uppercase tracking-wide">
            {t('invoicing.buyer', 'Buyer')}
          </h3>
          <div className="space-y-1 text-sm">
            <div className="font-semibold">{invoice.customerName}</div>
            <div className="text-black/40 dark:text-white/40">
              TRN: <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">{invoice.buyerTRN}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Line Items Table ───────────────────────────── */}
      <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 backdrop-blur-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/10 dark:border-white/10 text-xs text-black/50 dark:text-white/50">
                <th className="py-3 ps-4 font-medium text-start">{t('invoicing.productName', 'Product Name')}</th>
                <th className="py-3 px-2 font-medium text-start">{t('invoicing.egsCode', 'EGS/GPC Code')}</th>
                <th className="py-3 px-2 font-medium text-center">{t('invoicing.uom', 'UOM')}</th>
                <th className="py-3 px-2 font-medium text-end">{t('invoicing.qty', 'Qty')}</th>
                <th className="py-3 px-2 font-medium text-end">{t('invoicing.unitPrice', 'Unit Price')}</th>
                <th className="py-3 px-2 font-medium text-end">{t('invoicing.lineTotal', 'Line Total')}</th>
                <th className="py-3 px-2 pe-4 font-medium text-end">{t('invoicing.vatAmount', 'VAT')}</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item) => (
                <tr key={item.id} className="border-b border-black/5 dark:border-white/5">
                  <td className="py-3 ps-4">
                    <div>{item.productName}</div>
                    <div className="text-xs text-black/40 dark:text-white/40" dir="rtl" lang="ar">{item.productNameAr}</div>
                  </td>
                  <td className="py-3 px-2 font-[family-name:var(--font-geist-mono)] tabular-nums text-xs">{item.egsCode}</td>
                  <td className="py-3 px-2 text-center text-xs">{item.uom}</td>
                  <td className="py-3 px-2 text-end font-[family-name:var(--font-geist-mono)] tabular-nums">{item.quantity.toLocaleString()}</td>
                  <td className="py-3 px-2 text-end"><CurrencyCell amount={item.unitPrice} /></td>
                  <td className="py-3 px-2 text-end"><CurrencyCell amount={item.lineTotal} /></td>
                  <td className="py-3 px-2 pe-4 text-end"><CurrencyCell amount={item.vatAmount} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ─── Totals ─────────────────────────────────── */}
        <div className="border-t border-black/10 dark:border-white/10 p-4">
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-8">
              <span className="text-sm text-black/50 dark:text-white/50">{t('invoicing.subtotal', 'Subtotal')}</span>
              <CurrencyCell amount={invoice.subtotal} className="text-sm" />
            </div>
            <div className="flex items-center gap-8">
              <span className="text-sm text-black/50 dark:text-white/50">{t('invoicing.vat14', 'VAT 14%')}</span>
              <CurrencyCell amount={invoice.vatAmount} className="text-sm" />
            </div>
            <div className="flex items-center gap-8 pt-2 border-t border-black/10 dark:border-white/10">
              <span className="text-sm font-semibold">{t('invoicing.grandTotal', 'Grand Total')}</span>
              <CurrencyCell amount={invoice.grandTotal} className="text-base font-semibold" />
            </div>
          </div>
        </div>
      </div>

      {/* ─── Payment Terms & Bank Details ───────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 backdrop-blur-sm p-4">
          <h3 className="text-xs text-black/50 dark:text-white/50 mb-2 font-medium uppercase tracking-wide">
            {t('invoicing.paymentTerms', 'Payment Terms')}
          </h3>
          <div className="text-sm">
            <div>Net 30 days from invoice date</div>
            <div className="text-black/40 dark:text-white/40 mt-1">
              {t('invoicing.issued', 'Issued')}: <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">{invoice.issuedDate}</span>
            </div>
            <div className="text-black/40 dark:text-white/40">
              {t('invoicing.due', 'Due')}: <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">{invoice.dueDate}</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 backdrop-blur-sm p-4">
          <h3 className="text-xs text-black/50 dark:text-white/50 mb-2 font-medium uppercase tracking-wide">
            {t('invoicing.bankDetails', 'Bank Details for Wire Transfer')}
          </h3>
          <div className="text-sm space-y-1">
            <div>Bank: <span className="font-medium">Commercial International Bank (CIB)</span></div>
            <div>Account: <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">1234567890123</span></div>
            <div>SWIFT: <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">CIBEEGCX</span></div>
            <div>IBAN: <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">EG380002012345678901234567</span></div>
          </div>
        </div>
      </div>

      {/* ─── Timeline ───────────────────────────────────── */}
      <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 backdrop-blur-sm p-4">
        <h3 className="text-xs text-black/50 dark:text-white/50 mb-3 font-medium uppercase tracking-wide">
          {t('invoicing.timeline', 'Timeline')}
        </h3>
        <div className="space-y-2">
          <TimelineEvent
            label={t('invoicing.created', 'Created')}
            date={invoice.issuedDate}
          />
          {invoice.status !== 'draft' && (
            <TimelineEvent
              label={t('invoicing.sent', 'Sent')}
              date={invoice.issuedDate}
            />
          )}
          {(invoice.status === 'viewed' || invoice.status === 'partially_paid' || invoice.status === 'paid') && (
            <TimelineEvent
              label={t('invoicing.viewed', 'Viewed')}
              date={invoice.issuedDate}
            />
          )}
          {invoice.status === 'paid' && (
            <TimelineEvent
              label={t('invoicing.paid', 'Paid')}
              date={invoice.dueDate}
            />
          )}
        </div>
      </div>

      {/* ─── Action Bar ─────────────────────────────────── */}
      <InvoiceActions invoice={invoice} />
    </div>
  )
}

function TimelineEvent({ label, date }: { label: string; date: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-2 h-2 rounded-full bg-[#2563EB]" />
      <span className="text-sm">{label}</span>
      <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-xs text-black/40 dark:text-white/40">
        {date}
      </span>
    </div>
  )
}
