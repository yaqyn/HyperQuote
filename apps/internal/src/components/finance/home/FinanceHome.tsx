import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { getFinanceDashboard } from '../../../lib/server/finance-dashboard'
import { useFinanceStore } from '../../../stores/finance'
import { CurrencyCell } from '../shared/CurrencyCell'
import { AgingBadge } from '../shared/AgingBadge'
import { UtilizationBar } from '../shared/UtilizationBar'
import type { ARAgingBucket, PaymentMethod } from '../../../types/finance'

// ─── Glass panel wrapper ────────────────────────────────
function GlassPanel({
  children,
  className = '',
  onClick,
}: {
  children: React.ReactNode
  className?: string
  onClick?: () => void
}) {
  return (
    <div
      className={`rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 backdrop-blur-sm p-4 ${onClick ? 'cursor-pointer hover:border-[#2563EB]/30 transition-colors' : ''} ${className}`}
      onClick={onClick}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter') onClick() } : undefined}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {children}
    </div>
  )
}

// ─── Mock auto-generated invoices from delivery ─────────
const AUTO_GENERATED_INVOICES = [
  { id: 'inv-auto-001', number: 'INV-2026-0847', orderId: 'ORD-4521', customer: 'Cairo Construction Co.', deliveryDate: '2026-04-03', amount: 127_500, status: 'draft' as const },
  { id: 'inv-auto-002', number: 'INV-2026-0848', orderId: 'ORD-4523', customer: 'Delta Building Materials', deliveryDate: '2026-04-03', amount: 89_200, status: 'sent' as const },
  { id: 'inv-auto-003', number: 'INV-2026-0849', orderId: 'ORD-4527', customer: 'Nile Development Group', deliveryDate: '2026-04-04', amount: 215_000, status: 'draft' as const },
  { id: 'inv-auto-004', number: 'INV-2026-0850', orderId: 'ORD-4530', customer: 'Giza Contractors Ltd.', deliveryDate: '2026-04-04', amount: 43_750, status: 'sent' as const },
  { id: 'inv-auto-005', number: 'INV-2026-0851', orderId: 'ORD-4532', customer: 'Alexandria Steel Works', deliveryDate: '2026-04-05', amount: 312_000, status: 'draft' as const },
]

// ─── Mock expected payments this week ───────────────────
const EXPECTED_PAYMENTS = [
  { customer: 'Cairo Construction Co.', amount: 1_425_000, method: 'wire' as PaymentMethod, dueDate: '2026-04-06' },
  { customer: 'Delta Building Materials', amount: 273_600, method: 'cheque' as PaymentMethod, dueDate: '2026-04-07' },
  { customer: 'Nile Development Group', amount: 352_260, method: 'lc' as PaymentMethod, dueDate: '2026-04-08' },
  { customer: 'Giza Contractors Ltd.', amount: 680_000, method: 'wire' as PaymentMethod, dueDate: '2026-04-09' },
  { customer: 'Alexandria Steel Works', amount: 519_140, method: 'cheque' as PaymentMethod, dueDate: '2026-04-10' },
]

// ─── Payment method labels ──────────────────────────────
const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  wire: 'Wire',
  cheque: 'Cheque',
  lc: 'LC',
  cash: 'Cash',
}

const PAYMENT_METHOD_COLORS: Record<PaymentMethod, string> = {
  wire: 'bg-[#2563EB]/10 text-[#2563EB]',
  cheque: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  lc: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  cash: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
}

// ─── Aging bucket config ────────────────────────────────
const AGING_BUCKETS: { key: string; bucket: ARAgingBucket; field: 'current' | 'days30' | 'days60' | 'days90' | 'days90plus' }[] = [
  { key: 'current', bucket: 'current', field: 'current' },
  { key: '1-30', bucket: '1-30', field: 'days30' },
  { key: '31-60', bucket: '31-60', field: 'days60' },
  { key: '61-90', bucket: '61-90', field: 'days90' },
  { key: '90+', bucket: '90+', field: 'days90plus' },
]

/**
 * Finance home dashboard view.
 * Key metrics, AR aging summary, expected payments, payment method breakdown,
 * auto-generated invoices from delivery, credit utilization, and AP summary.
 */
export function FinanceHome() {
  const { t } = useTranslation('finance')
  const setActiveTab = useFinanceStore((s) => s.setActiveTab)
  const setSelectedInvoiceId = useFinanceStore((s) => s.setSelectedInvoiceId)

  const { data: dashboard } = useQuery({
    queryKey: ['finance', 'dashboard'],
    queryFn: () => getFinanceDashboard(),
    staleTime: 30_000,
  })

  if (!dashboard) {
    return (
      <div className="p-6 text-center text-black/40 dark:text-white/40">
        Loading...
      </div>
    )
  }

  const navigateToAR = () => setActiveTab('ar')
  const navigateToAP = () => setActiveTab('ap')
  const navigateToInvoice = (invoiceId: string) => {
    setSelectedInvoiceId(invoiceId)
    setActiveTab('invoicing')
  }

  return (
    <div className="p-6 space-y-6">
      {/* ─── Top Row: 4 Key Metrics ───────────────────────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <GlassPanel>
          <div className="text-xs text-black/50 dark:text-white/50 mb-1">
            {t('dashboard.revenueMTD', 'Revenue MTD')}
          </div>
          <div className="text-2xl">
            <CurrencyCell amount={dashboard.revenueMTD} />
          </div>
        </GlassPanel>

        <GlassPanel onClick={navigateToAR}>
          <div className="text-xs text-black/50 dark:text-white/50 mb-1">
            {t('dashboard.outstandingAR', 'Outstanding AR')}
          </div>
          <div className="text-2xl">
            <CurrencyCell amount={dashboard.outstandingAR} />
          </div>
        </GlassPanel>

        <GlassPanel onClick={navigateToAR}>
          <div className="text-xs text-black/50 dark:text-white/50 mb-1">
            {t('dashboard.overdueAR', 'Overdue AR')}
          </div>
          <div className={`text-2xl ${dashboard.overdueAR > 0 ? 'text-red-600 dark:text-red-400' : ''}`}>
            <CurrencyCell amount={dashboard.overdueAR} />
          </div>
        </GlassPanel>

        <GlassPanel>
          <div className="text-xs text-black/50 dark:text-white/50 mb-1">
            {t('dashboard.cashPosition', 'Cash Position')}
          </div>
          <div className="text-2xl">
            <CurrencyCell amount={dashboard.cashPosition} />
          </div>
        </GlassPanel>
      </div>

      {/* ─── Three-Column Grid: Aging, Payments, Breakdown ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Column 1: AR Aging Summary */}
        <GlassPanel>
          <h3 className="text-sm font-semibold mb-3">
            {t('dashboard.arAgingSummary', 'AR Aging Summary')}
          </h3>
          <div className="space-y-2">
            {AGING_BUCKETS.map((row) => (
              <div key={row.key} className="flex items-center justify-between">
                <AgingBadge bucket={row.bucket} />
                <CurrencyCell amount={dashboard.arAging[row.field]} className="text-sm" />
              </div>
            ))}
          </div>
        </GlassPanel>

        {/* Column 2: Expected Payments This Week */}
        <GlassPanel>
          <h3 className="text-sm font-semibold mb-3">
            {t('dashboard.expectedPayments', 'Expected Payments This Week')}
          </h3>
          <div className="space-y-3">
            {EXPECTED_PAYMENTS.map((payment) => (
              <div key={payment.customer} className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate">{payment.customer}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${PAYMENT_METHOD_COLORS[payment.method]}`}>
                      {PAYMENT_METHOD_LABELS[payment.method]}
                    </span>
                    <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-xs text-black/40 dark:text-white/40">
                      {payment.dueDate}
                    </span>
                  </div>
                </div>
                <CurrencyCell amount={payment.amount} className="text-sm" />
              </div>
            ))}
          </div>
        </GlassPanel>

        {/* Column 3: Payment Method Breakdown */}
        <GlassPanel>
          <h3 className="text-sm font-semibold mb-3">
            {t('dashboard.paymentBreakdown', 'Payment Method Breakdown')}
          </h3>
          <div className="space-y-3">
            {(['wire', 'cheque', 'lc'] as const).map((method) => {
              const pct = dashboard.paymentMethodBreakdown[method]
              return (
                <div key={method}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm">{PAYMENT_METHOD_LABELS[method]}</span>
                    <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-sm">
                      {pct}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#2563EB] transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </GlassPanel>
      </div>

      {/* ─── Auto-Generated Invoices from Delivery ────────── */}
      <GlassPanel>
        <div className="flex items-center gap-2 mb-4">
          <svg
            className="w-5 h-5 text-[#2563EB]"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0H21M3.375 14.25h17.25M21 12.75V6.375c0-.621-.504-1.125-1.125-1.125H4.125C3.504 5.25 3 5.754 3 6.375v8.25" />
          </svg>
          <h3 className="text-sm font-semibold">
            {t('dashboard.autoGeneratedInvoices', 'Auto-Generated from Delivery')}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-start text-xs text-black/50 dark:text-white/50 border-b border-black/10 dark:border-white/10">
                <th className="pb-2 ps-2 font-medium text-start">{t('dashboard.invoiceNumber', 'Invoice #')}</th>
                <th className="pb-2 font-medium text-start">{t('dashboard.orderNumber', 'Order #')}</th>
                <th className="pb-2 font-medium text-start">{t('dashboard.customer', 'Customer')}</th>
                <th className="pb-2 font-medium text-start">{t('dashboard.deliveryDate', 'Delivery Date')}</th>
                <th className="pb-2 font-medium text-end">{t('dashboard.amount', 'Amount')}</th>
                <th className="pb-2 pe-2 font-medium text-center">{t('dashboard.status', 'Status')}</th>
              </tr>
            </thead>
            <tbody>
              {AUTO_GENERATED_INVOICES.map((inv) => (
                <tr
                  key={inv.id}
                  className="border-b border-black/5 dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors"
                  onClick={() => navigateToInvoice(inv.id)}
                  onKeyDown={(e) => { if (e.key === 'Enter') navigateToInvoice(inv.id) }}
                  tabIndex={0}
                  role="button"
                >
                  <td className="py-2 ps-2 font-[family-name:var(--font-geist-mono)] tabular-nums">{inv.number}</td>
                  <td className="py-2 font-[family-name:var(--font-geist-mono)] tabular-nums">{inv.orderId}</td>
                  <td className="py-2">{inv.customer}</td>
                  <td className="py-2 font-[family-name:var(--font-geist-mono)] tabular-nums">{inv.deliveryDate}</td>
                  <td className="py-2 text-end"><CurrencyCell amount={inv.amount} /></td>
                  <td className="py-2 pe-2 text-center">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${inv.status === 'draft' ? 'bg-black/5 text-black/60 dark:bg-white/10 dark:text-white/60' : 'bg-[#2563EB]/10 text-[#2563EB]'}`}>
                      {inv.status === 'draft' ? 'Draft' : 'Sent'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassPanel>

      {/* ─── Bottom Row: Credit Utilization + AP Summary ──── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Customer Credit Utilization */}
        <GlassPanel>
          <h3 className="text-sm font-semibold mb-3">
            {t('dashboard.creditUtilization', 'Customer Credit Utilization')}
          </h3>
          <div className="space-y-3">
            {dashboard.topCreditUtilization.map((customer) => (
              <div key={customer.customerId}>
                <div className="text-sm mb-1">{customer.customerName}</div>
                <UtilizationBar percentage={customer.utilizationPct} />
              </div>
            ))}
          </div>
        </GlassPanel>

        {/* AP Summary */}
        <GlassPanel onClick={navigateToAP}>
          <h3 className="text-sm font-semibold mb-3">
            {t('dashboard.apSummary', 'Accounts Payable')}
          </h3>
          <div className="space-y-4">
            <div>
              <div className="text-xs text-black/50 dark:text-white/50 mb-1">
                {t('dashboard.apDueThisWeek', 'AP Due This Week')}
              </div>
              <div className="text-lg">
                <CurrencyCell amount={dashboard.apDueThisWeek} />
              </div>
            </div>
            <div>
              <div className="text-xs text-black/50 dark:text-white/50 mb-1">
                {t('dashboard.overdueAP', 'Overdue AP')}
              </div>
              <div className={`text-lg ${dashboard.overdueAP > 0 ? 'text-red-600 dark:text-red-400' : ''}`}>
                <CurrencyCell amount={dashboard.overdueAP} />
              </div>
            </div>
          </div>
        </GlassPanel>
      </div>
    </div>
  )
}
