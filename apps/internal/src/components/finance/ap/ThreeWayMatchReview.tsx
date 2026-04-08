import { useTranslation } from 'react-i18next'
import { Button } from 'react-aria-components'
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
 * Three-column comparison: PO | Receipt | Invoice.
 * Matched values in muted text, mismatches highlighted with subtle
 * yellow tint + delta shown. Bloomberg-style dense data layout.
 */
export function ThreeWayMatchReview({ invoice, onBack }: ThreeWayMatchReviewProps) {
  const { t } = useTranslation('finance')

  const match = invoice.threeWayMatch
  const result: ThreeWayMatchResult = threeWayMatch(
    match.poLine,
    match.receiptLine,
    match.invoiceLine,
  )

  const priceWithin = isWithinTolerance(Math.abs(result.priceVariance), { type: 'price', limit: 5 })
  const qtyWithin = isWithinTolerance(Math.abs(result.qtyVariance), { type: 'qty', limit: 2 })

  const priceExact = result.priceVariance === 0
  const qtyExact = result.qtyVariance === 0

  const linesMatched = priceExact && qtyExact ? 1 : 0
  const totalLines = 1
  const varianceAmount = Math.abs(
    (result.invoiceLine.price * result.invoiceLine.qty) -
    (result.poLine.price * result.poLine.qty),
  )

  return (
    <div className="flex flex-col">
      {/* Breadcrumb nav */}
      <div className="flex items-center gap-2 px-6 py-3 border-b border-black/10 dark:border-white/10">
        <button
          type="button"
          onClick={onBack}
          className="text-xs text-[#2563EB] hover:underline underline-offset-2"
        >
          {t('ap.backToList', 'AP Invoices')}
        </button>
        <span className="text-black/20 dark:text-white/20 text-xs">/</span>
        <span className="text-xs font-medium text-black dark:text-white">
          {t('ap.threeWayMatch', 'Three-Way Match')}
        </span>
      </div>

      {/* Three document columns */}
      <div className="grid grid-cols-3 gap-0 border-b border-black/10 dark:border-white/10">
        <DocColumn
          label={t('ap.column.po', 'Purchase Order')}
          reference={`#${invoice.poNumber}`}
          isBase
        />
        <DocColumn
          label={t('ap.column.receipt', 'Goods Receipt')}
          reference={`#GR-${invoice.poId.replace('po-', '')}`}
          hasBorder
        />
        <DocColumn
          label={t('ap.column.invoice', 'Supplier Invoice')}
          reference={`#INV-${invoice.id.replace('ap-', '')}`}
          hasBorder
        />
      </div>

      {/* Comparison table — the core */}
      <div className="px-6 py-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[11px] text-black/40 dark:text-white/40">
              <th className="pb-2 pe-4 text-start font-medium w-28">{t('ap.field', 'Field')}</th>
              <th className="pb-2 pe-4 text-end font-medium">{t('ap.column.po', 'PO')}</th>
              <th className="pb-2 pe-4 text-end font-medium">{t('ap.column.receipt', 'Receipt')}</th>
              <th className="pb-2 pe-4 text-end font-medium">{t('ap.column.invoice', 'Invoice')}</th>
              <th className="pb-2 pe-4 text-end font-medium">{t('ap.variance', 'Delta')}</th>
              <th className="pb-2 text-end font-medium w-20" />
            </tr>
          </thead>
          <tbody>
            {/* Quantity — highlighted only if mismatch */}
            <tr className={`border-t ${qtyExact ? 'border-black/[0.04] dark:border-white/[0.04] opacity-40' : 'border-black/[0.04] dark:border-white/[0.04] bg-yellow-500/[0.04]'}`}>
              <td className="py-2.5 pe-4 text-xs font-medium text-black/60 dark:text-white/60">
                {t('ap.quantity', 'Quantity')}
              </td>
              <td className="py-2.5 pe-4 text-end font-[family-name:var(--font-geist-mono)] tabular-nums text-black/40 dark:text-white/40">
                {result.poLine.qty}
              </td>
              <td className="py-2.5 pe-4 text-end font-[family-name:var(--font-geist-mono)] tabular-nums text-black/40 dark:text-white/40">
                {result.receiptLine.qty}
              </td>
              <td className={`py-2.5 pe-4 text-end font-[family-name:var(--font-geist-mono)] tabular-nums ${getValueStyle(qtyExact, qtyWithin)}`}>
                {result.invoiceLine.qty}
              </td>
              <td className="py-2.5 pe-4 text-end">
                <VarianceChip variance={result.qtyVariance} exact={qtyExact} within={qtyWithin} />
              </td>
              <td className="py-2.5 text-end">
                <MatchIndicator exact={qtyExact} within={qtyWithin} />
              </td>
            </tr>

            {/* Unit Price — highlighted only if mismatch */}
            <tr className={`border-t ${priceExact ? 'border-black/[0.04] dark:border-white/[0.04] opacity-40' : 'border-black/[0.04] dark:border-white/[0.04] bg-yellow-500/[0.04]'}`}>
              <td className="py-2.5 pe-4 text-xs font-medium text-black/60 dark:text-white/60">
                {t('ap.unitPrice', 'Unit Price')}
              </td>
              <td className="py-2.5 pe-4 text-end text-black/40 dark:text-white/40">
                <CurrencyCell amount={result.poLine.price} className="text-xs" />
              </td>
              <td className="py-2.5 pe-4 text-end font-[family-name:var(--font-geist-mono)] tabular-nums text-black/15 dark:text-white/15">
                --
              </td>
              <td className={`py-2.5 pe-4 text-end ${getValueStyle(priceExact, priceWithin)}`}>
                <CurrencyCell amount={result.invoiceLine.price} className="text-xs" />
              </td>
              <td className="py-2.5 pe-4 text-end">
                <VarianceChip
                  variance={result.priceVariance}
                  exact={priceExact}
                  within={priceWithin}
                  amountDiff={Math.abs(result.invoiceLine.price - result.poLine.price) * result.invoiceLine.qty}
                />
              </td>
              <td className="py-2.5 text-end">
                <MatchIndicator exact={priceExact} within={priceWithin} />
              </td>
            </tr>

            {/* Line Total */}
            <tr className={`border-t border-black/10 dark:border-white/10 font-medium ${varianceAmount === 0 ? 'opacity-40' : ''}`}>
              <td className="py-2.5 pe-4 text-xs text-black dark:text-white">
                {t('ap.lineTotal', 'Line Total')}
              </td>
              <td className="py-2.5 pe-4 text-end text-black/60 dark:text-white/60">
                <CurrencyCell amount={result.poLine.qty * result.poLine.price} className="text-xs" />
              </td>
              <td className="py-2.5 pe-4 text-end font-[family-name:var(--font-geist-mono)] tabular-nums text-black/15 dark:text-white/15">
                --
              </td>
              <td className="py-2.5 pe-4 text-end text-black dark:text-white">
                <CurrencyCell amount={result.invoiceLine.qty * result.invoiceLine.price} className="text-xs font-semibold" />
              </td>
              <td className="py-2.5 pe-4 text-end">
                {varianceAmount > 0 && (
                  <CurrencyCell amount={varianceAmount} className="text-xs text-red-600 dark:text-red-400" />
                )}
              </td>
              <td className="py-2.5" />
            </tr>
          </tbody>
        </table>
      </div>

      {/* Tolerance rules — understated */}
      <div className="px-6 pb-3">
        <div className="text-[10px] text-black/30 dark:text-white/30 font-[family-name:var(--font-geist-mono)]">
          {t('ap.toleranceDetail', 'Tolerance: Price 0-5% | Qty 0-2% | Tax 0% (exact)')}
        </div>
      </div>

      {/* Variance routing alert */}
      {!result.withinTolerance && (
        <div className="mx-6 mb-4 rounded-lg bg-red-500/5 border border-red-500/10 px-4 py-3">
          <div className="flex flex-wrap gap-3 text-xs">
            {!priceWithin && (
              <span className="text-red-600 dark:text-red-400">
                {t('ap.routePrice', 'Price exceeds tolerance')} → <span className="font-medium">{VARIANCE_ROUTING.price}</span>
              </span>
            )}
            {!qtyWithin && (
              <span className="text-red-600 dark:text-red-400">
                {t('ap.routeQty', 'Qty exceeds tolerance')} → <span className="font-medium">{VARIANCE_ROUTING.qty}</span>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Action bar */}
      <div className="flex items-center justify-between px-6 py-4 border-t border-black/10 dark:border-white/10 mt-auto">
        <div className="flex items-center gap-4 text-xs text-black/40 dark:text-white/40">
          <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">
            {linesMatched}/{totalLines} {t('ap.matched', 'matched')}
          </span>
          {varianceAmount > 0 && (
            <>
              <span className="text-black/10 dark:text-white/10">|</span>
              <span className="text-red-500">
                {t('ap.varianceLabel', 'Variance')}{' '}
                <CurrencyCell amount={varianceAmount} className="text-xs" />
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            className="rounded-md px-4 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-500/5 outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 transition-colors"
          >
            {t('ap.reject', 'Reject')}
          </Button>
          <Button
            className="rounded-md px-4 py-2 text-xs font-medium text-black/50 dark:text-white/50 hover:bg-black/5 dark:hover:bg-white/5 outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 transition-colors"
          >
            {t('ap.hold', 'Hold')}
          </Button>
          <Button
            className="rounded-md px-4 py-2 text-xs font-medium text-[#2563EB] hover:bg-[#2563EB]/5 outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 transition-colors"
          >
            {t('ap.dispute', 'Dispute')}
          </Button>
          <Button
            className="rounded-md bg-[#2563EB] px-5 py-2 text-xs font-medium text-white hover:bg-[#2563EB]/90 pressed:bg-[#2563EB]/80 outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 transition-colors"
          >
            {t('ap.approveAll', 'Approve')}
          </Button>
        </div>
      </div>
    </div>
  )
}

/** Document column header in the three-panel layout */
function DocColumn({ label, reference, isBase, hasBorder }: {
  label: string
  reference: string
  isBase?: boolean
  hasBorder?: boolean
}) {
  return (
    <div className={`px-6 py-3 ${hasBorder ? 'border-s border-black/5 dark:border-white/5' : ''}`}>
      <div className="text-[10px] uppercase tracking-wider text-black/30 dark:text-white/30 mb-0.5">
        {label}
      </div>
      <div className={`font-[family-name:var(--font-geist-mono)] tabular-nums text-sm ${isBase ? 'text-black dark:text-white font-medium' : 'text-black/60 dark:text-white/60'}`}>
        {reference}
      </div>
    </div>
  )
}

/** Value style based on match status — muted when matched, tinted when mismatched */
function getValueStyle(exact: boolean, within: boolean): string {
  if (exact) return 'text-black/40 dark:text-white/40'
  if (within) return 'text-black dark:text-white bg-yellow-500/8'
  return 'text-black dark:text-white bg-red-500/8'
}

/** Inline match/mismatch indicator */
function MatchIndicator({ exact, within }: { exact: boolean; within: boolean }) {
  if (exact) {
    return <span className="text-[10px] text-green-600 dark:text-green-400 font-medium">OK</span>
  }
  if (within) {
    return <span className="text-[10px] text-yellow-600 dark:text-yellow-400 font-medium">TOL</span>
  }
  return <span className="text-[10px] text-red-600 dark:text-red-400 font-semibold">EXC</span>
}

/** Compact variance display */
function VarianceChip({
  variance,
  exact,
  within,
  amountDiff,
}: {
  variance: number
  exact: boolean
  within: boolean
  amountDiff?: number
}) {
  if (exact) {
    return (
      <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-xs text-green-600 dark:text-green-400">
        0%
      </span>
    )
  }

  const color = within
    ? 'text-yellow-600 dark:text-yellow-400'
    : 'text-red-600 dark:text-red-400'

  return (
    <span className={`font-[family-name:var(--font-geist-mono)] tabular-nums text-xs ${color}`}>
      {variance > 0 ? '+' : ''}{variance}%
      {amountDiff != null && amountDiff > 0 && (
        <span className="ms-1 text-[10px] opacity-70">
          (<CurrencyCell amount={amountDiff} className="text-[10px]" />)
        </span>
      )}
    </span>
  )
}
