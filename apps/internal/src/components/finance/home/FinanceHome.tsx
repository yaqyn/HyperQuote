import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { getFinanceDashboard } from '../../../lib/server/finance-dashboard'
import { useFinanceStore } from '../../../stores/finance'
import { CurrencyCell } from '../shared/CurrencyCell'
import { AgingBadge } from '../shared/AgingBadge'
import { UtilizationBar } from '../shared/UtilizationBar'
import { StatusBadge } from '../shared/StatusBadge'
import type { ARAgingBucket, PaymentMethod } from '../../../types/finance'

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

// ─── Aging bucket config ────────────────────────────────
const AGING_BUCKETS: { key: string; bucket: ARAgingBucket; field: 'current' | 'days30' | 'days60' | 'days90' | 'days90plus' }[] = [
  { key: 'current', bucket: 'current', field: 'current' },
  { key: '1-30', bucket: '1-30', field: 'days30' },
  { key: '31-60', bucket: '31-60', field: 'days60' },
  { key: '61-90', bucket: '61-90', field: 'days90' },
  { key: '90+', bucket: '90+', field: 'days90plus' },
]

// ─── Mock 7-day cash flow forecast ──────────────────────
const CASH_FLOW_FORECAST = [
  { day: 'Mon', inflow: 1_200_000, outflow: 800_000 },
  { day: 'Tue', inflow: 950_000, outflow: 1_100_000 },
  { day: 'Wed', inflow: 1_400_000, outflow: 600_000 },
  { day: 'Thu', inflow: 800_000, outflow: 900_000 },
  { day: 'Sun', inflow: 1_600_000, outflow: 750_000 },
  { day: 'Mon', inflow: 1_100_000, outflow: 1_300_000 },
  { day: 'Tue', inflow: 900_000, outflow: 700_000 },
]

/**
 * "The Morning Brief" — single-page financial summary.
 * NOT a dashboard with cards. Reads like a financial brief.
 *
 * Top: Cash position as ONE hero number. Below: AR | AP | Net — three numbers.
 * Middle: Today's action items as a compact list.
 * Bottom: Cash flow forecast as CSS-only area chart.
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

  // Cash flow chart calculations
  const chartData = useMemo(() => {
    const netValues = CASH_FLOW_FORECAST.map((d) => d.inflow - d.outflow)
    const cumulative: number[] = []
    let running = dashboard?.cashPosition ?? 0
    for (const net of netValues) {
      running += net
      cumulative.push(running)
    }
    const min = Math.min(...cumulative)
    const max = Math.max(...cumulative)
    const range = max - min || 1
    return { cumulative, min, max, range }
  }, [dashboard?.cashPosition])

  if (!dashboard) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-black/30 dark:text-white/30">
        Loading...
      </div>
    )
  }

  const navigateToAR = () => setActiveTab('receivables')
  const navigateToAP = () => setActiveTab('payables')
  const navigateToInvoice = (invoiceId: string) => {
    setSelectedInvoiceId(invoiceId)
    setActiveTab('receivables')
  }

  const netPosition = dashboard.outstandingAR - (dashboard.apDueThisWeek + dashboard.overdueAP)

  // Action items — payments due, invoices to send, cheques maturing
  const draftInvoices = AUTO_GENERATED_INVOICES.filter((inv) => inv.status === 'draft')
  const overduePayments = EXPECTED_PAYMENTS.filter((p) => p.dueDate <= '2026-04-07')

  return (
    <div className="p-6 max-w-5xl">
      {/* ─── Hero: Cash Position ─────────────────────────── */}
      <section className="mb-8">
        <div className="text-[11px] uppercase tracking-wider text-black/40 dark:text-white/40 mb-1">
          {t('dashboard.cashPosition', 'Cash Position')}
        </div>
        <CurrencyCell amount={dashboard.cashPosition} className="text-5xl font-light" />

        {/* AR | AP | Net — three numbers in a row */}
        <div className="flex items-center gap-6 mt-4">
          <button type="button" onClick={navigateToAR} className="group cursor-pointer text-start">
            <div className="text-[11px] uppercase tracking-wider text-black/35 dark:text-white/35 mb-0.5">
              {t('dashboard.outstandingAR', 'AR')}
            </div>
            <CurrencyCell
              amount={dashboard.outstandingAR}
              className="text-lg group-hover:text-[#2563EB] transition-colors"
              subtle
            />
          </button>

          <span className="text-black/10 dark:text-white/10 text-lg select-none">/</span>

          <button type="button" onClick={navigateToAP} className="group cursor-pointer text-start">
            <div className="text-[11px] uppercase tracking-wider text-black/35 dark:text-white/35 mb-0.5">
              {t('dashboard.apSummary', 'AP')}
            </div>
            <CurrencyCell
              amount={dashboard.apDueThisWeek + dashboard.overdueAP}
              className="text-lg group-hover:text-[#2563EB] transition-colors"
              subtle
            />
          </button>

          <span className="text-black/10 dark:text-white/10 text-lg select-none">/</span>

          <div>
            <div className="text-[11px] uppercase tracking-wider text-black/35 dark:text-white/35 mb-0.5">
              {t('dashboard.netPosition', 'Net')}
            </div>
            <CurrencyCell
              amount={netPosition}
              className={`text-lg ${netPosition >= 0 ? 'text-green-600' : 'text-red-600'}`}
              subtle
            />
          </div>
        </div>
      </section>

      {/* ─── Action Items ────────────────────────────────── */}
      <section className="mb-8">
        <h2 className="text-[11px] uppercase tracking-wider text-black/40 dark:text-white/40 mb-3">
          {t('dashboard.actionItems', 'Today')}
        </h2>
        <div className="divide-y divide-black/[0.04] dark:divide-white/[0.04] rounded-lg border border-black/10 dark:border-white/10 overflow-hidden">
          {/* Overdue payments due */}
          {overduePayments.map((payment) => (
            <div key={payment.customer} className="flex items-center gap-3 px-4 py-2.5">
              <span className="size-1.5 rounded-full bg-red-500 shrink-0" />
              <span className="text-sm flex-1 min-w-0 truncate">
                {t('dashboard.paymentDue', 'Payment due')}: {payment.customer}
              </span>
              <span className="text-[11px] text-black/35 dark:text-white/35 font-[family-name:var(--font-geist-mono)] tabular-nums">
                {PAYMENT_METHOD_LABELS[payment.method]}
              </span>
              <CurrencyCell amount={payment.amount} className="text-sm" />
              <span className="text-[11px] text-black/30 dark:text-white/30 font-[family-name:var(--font-geist-mono)] tabular-nums">
                {payment.dueDate}
              </span>
            </div>
          ))}

          {/* Draft invoices needing review */}
          {draftInvoices.map((inv) => (
            <button
              key={inv.id}
              type="button"
              onClick={() => navigateToInvoice(inv.id)}
              className="w-full flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-[#2563EB]/[0.02] transition-colors text-start"
            >
              <span className="size-1.5 rounded-full bg-yellow-500 shrink-0" />
              <span className="text-sm flex-1 min-w-0 truncate">
                {t('dashboard.reviewInvoice', 'Review invoice')}: {inv.number}
              </span>
              <span className="text-[11px] text-black/35 dark:text-white/35">{inv.customer}</span>
              <CurrencyCell amount={inv.amount} className="text-sm" />
            </button>
          ))}

          {/* Overdue AR alert */}
          {dashboard.overdueAR > 0 && (
            <button
              type="button"
              onClick={navigateToAR}
              className="w-full flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-[#2563EB]/[0.02] transition-colors text-start"
            >
              <span className="size-1.5 rounded-full bg-orange-500 shrink-0" />
              <span className="text-sm flex-1">
                {t('dashboard.overdueARAlert', 'Overdue receivables need attention')}
              </span>
              <CurrencyCell amount={dashboard.overdueAR} className="text-sm text-red-600" />
            </button>
          )}
        </div>
      </section>

      {/* ─── AR Aging + Expected Payments — side by side ── */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* AR Aging compact */}
        <div>
          <h2 className="text-[11px] uppercase tracking-wider text-black/40 dark:text-white/40 mb-3">
            {t('dashboard.arAgingSummary', 'Aging')}
          </h2>
          <div className="space-y-1.5">
            {AGING_BUCKETS.map((row) => {
              const amount = dashboard.arAging[row.field]
              const pct = dashboard.outstandingAR > 0 ? (amount / dashboard.outstandingAR) * 100 : 0
              return (
                <div key={row.key} className="flex items-center gap-3">
                  <div className="w-12">
                    <AgingBadge bucket={row.bucket} />
                  </div>
                  <div className="flex-1 h-1 rounded-full bg-black/5 dark:bg-white/5 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-black/20 dark:bg-white/20 transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <CurrencyCell amount={amount} className="text-sm w-28 text-end" />
                </div>
              )
            })}
          </div>
        </div>

        {/* Expected Payments */}
        <div>
          <h2 className="text-[11px] uppercase tracking-wider text-black/40 dark:text-white/40 mb-3">
            {t('dashboard.expectedPayments', 'Expected This Week')}
          </h2>
          <div className="space-y-1.5">
            {EXPECTED_PAYMENTS.map((payment) => (
              <div key={payment.customer} className="flex items-center gap-3">
                <span className="text-sm flex-1 min-w-0 truncate">{payment.customer}</span>
                <span className="text-[10px] text-black/30 dark:text-white/30 font-[family-name:var(--font-geist-mono)] tabular-nums">
                  {payment.dueDate}
                </span>
                <span className="text-[10px] text-black/30 dark:text-white/30 w-12 text-end">
                  {PAYMENT_METHOD_LABELS[payment.method]}
                </span>
                <CurrencyCell amount={payment.amount} className="text-sm w-28 text-end" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Cash Flow Forecast — CSS area chart ─────────── */}
      <section className="mb-8">
        <h2 className="text-[11px] uppercase tracking-wider text-black/40 dark:text-white/40 mb-3">
          {t('dashboard.cashFlowForecast', '7-Day Cash Flow Forecast')}
        </h2>
        <div className="h-24 flex items-end gap-px">
          {CASH_FLOW_FORECAST.map((day, i) => {
            const cumValue = chartData.cumulative[i]
            const normalizedHeight = ((cumValue - chartData.min) / chartData.range) * 100
            const net = day.inflow - day.outflow
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex items-end h-20">
                  <div
                    className={`w-full rounded-t transition-all duration-300 ${net >= 0 ? 'bg-[#2563EB]/20' : 'bg-red-500/20'}`}
                    style={{ height: `${Math.max(normalizedHeight, 4)}%` }}
                  />
                </div>
                <span className="text-[10px] text-black/30 dark:text-white/30">{day.day}</span>
              </div>
            )
          })}
        </div>
      </section>

      {/* ─── Credit Utilization ──────────────────────────── */}
      {dashboard.topCreditUtilization.length > 0 && (
        <section>
          <h2 className="text-[11px] uppercase tracking-wider text-black/40 dark:text-white/40 mb-3">
            {t('dashboard.creditUtilization', 'Credit Utilization')}
          </h2>
          <div className="space-y-2">
            {dashboard.topCreditUtilization.map((customer) => (
              <div key={customer.customerId} className="flex items-center gap-3">
                <span className="text-sm w-48 truncate">{customer.customerName}</span>
                <div className="flex-1">
                  <UtilizationBar percentage={customer.utilizationPct} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
