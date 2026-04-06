import { useTranslation } from 'react-i18next'
import { threeWayMatch, isWithinTolerance } from '../../../lib/finance/matching'
import { CurrencyCell } from '../shared/CurrencyCell'
import type { APInvoice, ThreeWayMatchResult } from '../../../types/finance'

interface ThreeWayMatchReviewProps {
  invoice: APInvoice
  onBack: () => void
}

/** Variance routing map: exceeds tolerance -> responsible function */
const VARIANCE_ROUTING: Record<string, string> = {
  price: 'Procurement',
  qty: 'Warehouse',
  tax: 'Finance',
  delivery: 'Logistics',
}

/**
 * Side-by-side three-way match review (Section 5.5).
 * Three columns: PO | Goods Receipt | Supplier Invoice.
 * Per line: Item, Qty, Unit Price, Line Total with color-coded cells.
 * Green = match, Yellow = within tolerance, Red = exceeds, Grey = N/A.
 */
export function ThreeWayMatchReview({ invoice, onBack }: ThreeWayMatchReviewProps) {
  const { t } = useTranslation('finance')

  const match = invoice.threeWayMatch
  // Recompute for demonstration — in production would come from server
  const result: ThreeWayMatchResult = threeWayMatch(
    match.poLine,
    match.receiptLine,
    match.invoiceLine,
  )

  const priceWithin = isWithinTolerance(Math.abs(result.priceVariance), { type: 'price', limit: 5 })
  const qtyWithin = isWithinTolerance(Math.abs(result.qtyVariance), { type: 'qty', limit: 2 })

  const priceExact = result.priceVariance === 0
  const qtyExact = result.qtyVariance === 0

  const linesMatched = (priceExact && qtyExact) ? 1 : 0
  const totalLines = 1 // Single line item per mock invoice
  const varianceAmount = Math.abs(
    (result.invoiceLine.price * result.invoiceLine.qty) -
    (result.poLine.price * result.poLine.qty)
  )

  return (
    <div className="flex flex-col gap-4">
      {/* Header with back navigation */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-black/10 dark:border-white/10">
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-[#2563EB] hover:underline"
        >
          {t('ap.backToList', 'Back to AP Invoices')}
        </button>
        <span className="text-black/30 dark:text-white/30">/</span>
        <span className="text-sm font-medium">
          {t('ap.threeWayMatch', 'Three-Way Match Review')}
        </span>
      </div>

      {/* Column headers */}
      <div className="px-6">
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 backdrop-blur-sm p-4">
            <div className="text-xs text-black/50 dark:text-white/50 mb-1">
              {t('ap.column.po', 'Purchase Order')}
            </div>
            <div className="font-[family-name:var(--font-geist-mono)] tabular-nums font-medium">
              #{invoice.poNumber}
            </div>
          </div>
          <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 backdrop-blur-sm p-4">
            <div className="text-xs text-black/50 dark:text-white/50 mb-1">
              {t('ap.column.receipt', 'Goods Receipt')}
            </div>
            <div className="font-[family-name:var(--font-geist-mono)] tabular-nums font-medium">
              #GR-{invoice.poId.replace('po-', '')}
            </div>
          </div>
          <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 backdrop-blur-sm p-4">
            <div className="text-xs text-black/50 dark:text-white/50 mb-1">
              {t('ap.column.invoice', 'Supplier Invoice')}
            </div>
            <div className="font-[family-name:var(--font-geist-mono)] tabular-nums font-medium">
              #INV-{invoice.id.replace('ap-', '')}
            </div>
          </div>
        </div>
      </div>

      {/* Line item comparison table */}
      <div className="px-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black/10 dark:border-white/10 text-xs text-black/50 dark:text-white/50">
              <th className="py-2 pe-2 text-start font-medium">{t('ap.field', 'Field')}</th>
              <th className="py-2 pe-2 text-end font-medium">{t('ap.column.po', 'PO')}</th>
              <th className="py-2 pe-2 text-end font-medium">{t('ap.column.receipt', 'Receipt')}</th>
              <th className="py-2 pe-2 text-end font-medium">{t('ap.column.invoice', 'Invoice')}</th>
              <th className="py-2 pe-2 text-end font-medium">{t('ap.variance', 'Variance')}</th>
              <th className="py-2 text-start font-medium">{t('ap.status', 'Status')}</th>
            </tr>
          </thead>
          <tbody>
            {/* Quantity row */}
            <tr className="border-b border-black/5 dark:border-white/5">
              <td className="py-3 pe-2 font-medium">{t('ap.quantity', 'Quantity')}</td>
              <td className="py-3 pe-2 text-end font-[family-name:var(--font-geist-mono)] tabular-nums">
                {result.poLine.qty}
              </td>
              <td className="py-3 pe-2 text-end font-[family-name:var(--font-geist-mono)] tabular-nums">
                {result.receiptLine.qty}
              </td>
              <td className={`py-3 pe-2 text-end font-[family-name:var(--font-geist-mono)] tabular-nums ${getCellBg(qtyExact, qtyWithin)}`}>
                {result.invoiceLine.qty}
              </td>
              <td className={`py-3 pe-2 text-end font-[family-name:var(--font-geist-mono)] tabular-nums ${getCellBg(qtyExact, qtyWithin)}`}>
                {result.qtyVariance === 0 ? (
                  <span className="text-green-700 dark:text-green-400">0%</span>
                ) : (
                  <VarianceDisplay variance={result.qtyVariance} within={qtyWithin} />
                )}
              </td>
              <td className="py-3">
                <CellStatusIcon exact={qtyExact} within={qtyWithin} />
              </td>
            </tr>

            {/* Unit Price row */}
            <tr className="border-b border-black/5 dark:border-white/5">
              <td className="py-3 pe-2 font-medium">{t('ap.unitPrice', 'Unit Price')}</td>
              <td className="py-3 pe-2 text-end">
                <CurrencyCell amount={result.poLine.price} />
              </td>
              <td className="py-3 pe-2 text-end text-black/30 dark:text-white/30">
                {/* Receipt has no price - grey dash */}
                <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">--</span>
              </td>
              <td className={`py-3 pe-2 text-end ${getCellBg(priceExact, priceWithin)}`}>
                <CurrencyCell amount={result.invoiceLine.price} />
              </td>
              <td className={`py-3 pe-2 text-end font-[family-name:var(--font-geist-mono)] tabular-nums ${getCellBg(priceExact, priceWithin)}`}>
                {result.priceVariance === 0 ? (
                  <span className="text-green-700 dark:text-green-400">0%</span>
                ) : (
                  <VarianceDisplay
                    variance={result.priceVariance}
                    within={priceWithin}
                    amountDiff={Math.abs(result.invoiceLine.price - result.poLine.price) * result.invoiceLine.qty}
                  />
                )}
              </td>
              <td className="py-3">
                <CellStatusIcon exact={priceExact} within={priceWithin} />
              </td>
            </tr>

            {/* Line Total row */}
            <tr className="border-b border-black/10 dark:border-white/10 font-medium">
              <td className="py-3 pe-2">{t('ap.lineTotal', 'Line Total')}</td>
              <td className="py-3 pe-2 text-end">
                <CurrencyCell amount={result.poLine.qty * result.poLine.price} />
              </td>
              <td className="py-3 pe-2 text-end text-black/30 dark:text-white/30">
                <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">--</span>
              </td>
              <td className="py-3 pe-2 text-end">
                <CurrencyCell amount={result.invoiceLine.qty * result.invoiceLine.price} />
              </td>
              <td className="py-3 pe-2 text-end">
                {varianceAmount > 0 && <CurrencyCell amount={varianceAmount} />}
              </td>
              <td className="py-3" />
            </tr>
          </tbody>
        </table>
      </div>

      {/* Tolerance rules */}
      <div className="px-6">
        <div className="rounded-lg border border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02] px-4 py-3 text-xs text-black/50 dark:text-white/50">
          <span className="font-medium">{t('ap.toleranceRules', 'Tolerance Rules:')}</span>{' '}
          {t('ap.toleranceDetail', 'Price: 0-5% | Quantity: 0-2% | Tax: 0% (exact match)')}
        </div>
      </div>

      {/* Variance routing */}
      {!result.withinTolerance && (
        <div className="px-6">
          <div className="rounded-lg border border-red-200 dark:border-red-800/30 bg-red-50 dark:bg-red-900/10 px-4 py-3 text-sm">
            <span className="text-red-700 dark:text-red-400 font-medium">
              {!priceWithin && (
                <span>
                  {t('ap.routePrice', 'Exceeds price tolerance')} → {t('ap.routesTo', 'Routes to:')}{' '}
                  {VARIANCE_ROUTING.price}
                </span>
              )}
              {!qtyWithin && !priceWithin && ' | '}
              {!qtyWithin && (
                <span>
                  {t('ap.routeQty', 'Exceeds quantity tolerance')} → {t('ap.routesTo', 'Routes to:')}{' '}
                  {VARIANCE_ROUTING.qty}
                </span>
              )}
            </span>
          </div>
        </div>
      )}

      {/* Action bar */}
      <div className="flex items-center justify-between px-6 py-4 border-t border-black/10 dark:border-white/10">
        <div className="text-sm text-black/60 dark:text-white/60">
          {t('ap.matchStatusSummary', 'Match Status: {{matched}} of {{total}} lines matched', {
            matched: linesMatched,
            total: totalLines,
          })}
          {varianceAmount > 0 && (
            <>
              <span className="mx-3">|</span>
              {t('ap.varianceLabel', 'Variance:')}{' '}
              <CurrencyCell amount={varianceAmount} className="text-sm" />
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors"
          >
            {t('ap.approveAll', 'Approve All')}
          </button>
          <button
            type="button"
            className="rounded-lg border border-green-600 px-4 py-2 text-sm font-medium text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/10 transition-colors"
          >
            {t('ap.approveMatched', 'Approve Matched Lines')}
          </button>
          <button
            type="button"
            className="rounded-lg border border-yellow-500 px-4 py-2 text-sm font-medium text-yellow-700 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/10 transition-colors"
          >
            {t('ap.dispute', 'Dispute')}
          </button>
          <button
            type="button"
            className="rounded-lg border border-black/10 dark:border-white/10 px-4 py-2 text-sm font-medium text-black/60 dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            {t('ap.hold', 'Hold')}
          </button>
          <button
            type="button"
            className="rounded-lg border border-red-300 dark:border-red-800 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
          >
            {t('ap.reject', 'Reject')}
          </button>
        </div>
      </div>
    </div>
  )
}

/** Cell background color based on match status */
function getCellBg(exact: boolean, within: boolean): string {
  if (exact) return 'bg-green-50 dark:bg-green-900/10'
  if (within) return 'bg-yellow-50 dark:bg-yellow-900/10'
  return 'bg-red-50 dark:bg-red-900/10'
}

/** Status icon in cell */
function CellStatusIcon({ exact, within }: { exact: boolean; within: boolean }) {
  if (exact) {
    return <span className="text-green-600 dark:text-green-400 text-xs">Match</span>
  }
  if (within) {
    return <span className="text-yellow-600 dark:text-yellow-400 text-xs">Within Tolerance</span>
  }
  return <span className="text-red-600 dark:text-red-400 text-xs">Exceeds</span>
}

/** Variance display with percentage and optional amount */
function VarianceDisplay({
  variance,
  within,
  amountDiff,
}: {
  variance: number
  within: boolean
  amountDiff?: number
}) {
  const color = within
    ? 'text-yellow-700 dark:text-yellow-400'
    : 'text-red-700 dark:text-red-400'

  return (
    <span className={color}>
      {within && '\u26A0 '}
      {variance > 0 ? '+' : ''}
      {variance}%
      {amountDiff != null && amountDiff > 0 && (
        <span className="ms-1">
          (<CurrencyCell amount={amountDiff} className="text-xs" />)
        </span>
      )}
    </span>
  )
}
