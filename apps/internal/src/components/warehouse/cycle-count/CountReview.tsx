import type { CycleCountResult, ABCClass } from '../../../types/warehouse'

interface CountReviewProps {
  results: CycleCountResult[]
  onBack: () => void
}

const ABC_THRESHOLD_LABELS: Record<ABCClass, string> = {
  A: '2%',
  B: '5%',
  C: '10%',
}

/**
 * Post-submission variance review.
 * After blind count submission, system reveals the comparison:
 * - System qty (NOW revealed)
 * - Worker count
 * - Variance and variance %
 * - ABC class and threshold check
 * - needsRecount flag per product
 */
export function CountReview({ results, onBack }: CountReviewProps) {
  const anyNeedsRecount = results.some((r) => r.needsRecount)
  const allWithinThreshold = results.every((r) => !r.needsRecount)

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Count Review</h2>
      </div>

      {/* Summary banner */}
      {anyNeedsRecount ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-800">
            Recount requested — will be assigned to a different worker
          </p>
          <p className="text-xs text-red-600 mt-1">
            One or more items exceed the ABC class variance threshold. A different worker will
            perform the recount for objectivity.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4">
          <p className="text-sm font-medium text-green-800">
            Count approved automatically
          </p>
          <p className="text-xs text-green-600 mt-1">
            All items are within their ABC class variance thresholds.
          </p>
        </div>
      )}

      {/* Results table */}
      <div className="flex flex-col gap-3">
        {results.map((result) => (
          <div
            key={result.productId}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 flex flex-col gap-3"
          >
            {/* Product header */}
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--color-text-primary)]">
                  {result.productId}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs px-2 py-0.5 rounded bg-[var(--color-surface)] border border-[var(--color-border)] font-medium">
                    ABC: {result.abcClass}
                  </span>
                  <span className="text-xs text-[var(--color-text-secondary)]">
                    Threshold: {ABC_THRESHOLD_LABELS[result.abcClass]}
                  </span>
                </div>
              </div>
              <VarianceBadge variancePercent={result.variancePercent} needsRecount={result.needsRecount} />
            </div>

            {/* Quantities */}
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col">
                <span className="text-xs text-[var(--color-text-secondary)]">System Qty</span>
                <span className="font-mono tabular-nums text-base font-medium text-[var(--color-text-primary)]">
                  {result.systemQty}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-[var(--color-text-secondary)]">Your Count</span>
                <span className="font-mono tabular-nums text-base font-medium text-[var(--color-text-primary)]">
                  {result.physicalCount}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-[var(--color-text-secondary)]">Variance</span>
                <span className={`font-mono tabular-nums text-base font-medium ${
                  result.variance > 0
                    ? 'text-green-700'
                    : result.variance < 0
                      ? 'text-red-700'
                      : 'text-[var(--color-text-primary)]'
                }`}>
                  {result.variance > 0 ? '+' : ''}{result.variance}
                </span>
              </div>
            </div>

            {/* Threshold check */}
            <div className={`text-xs font-medium px-3 py-2 rounded-lg ${
              result.needsRecount
                ? 'bg-red-50 text-red-700'
                : 'bg-green-50 text-green-700'
            }`}>
              {result.needsRecount
                ? `Exceeds threshold — recount requested (${(Math.abs(result.variancePercent) * 100).toFixed(1)}% > ${ABC_THRESHOLD_LABELS[result.abcClass]})`
                : `Within threshold — auto-approved (${(Math.abs(result.variancePercent) * 100).toFixed(1)}% <= ${ABC_THRESHOLD_LABELS[result.abcClass]})`
              }
            </div>
          </div>
        ))}
      </div>

      {/* Back button */}
      <button
        type="button"
        onClick={onBack}
        className="min-h-[48px] rounded-xl border border-[var(--color-border)] text-base font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] transition-colors"
      >
        Back to Count List
      </button>
    </div>
  )
}

// ─── VarianceBadge ──────────────────────────────────────────

interface VarianceBadgeProps {
  variancePercent: number
  needsRecount: boolean
}

function VarianceBadge({ variancePercent, needsRecount }: VarianceBadgeProps) {
  const absPercent = Math.abs(variancePercent) * 100
  const displayText = `${variancePercent >= 0 ? '+' : '-'}${absPercent.toFixed(1)}%`

  return (
    <span
      className={`font-mono tabular-nums text-xs font-medium px-2 py-1 rounded-full ${
        needsRecount
          ? 'bg-red-100 text-red-800'
          : absPercent === 0
            ? 'bg-gray-100 text-gray-700'
            : 'bg-green-100 text-green-800'
      }`}
    >
      {displayText}
    </span>
  )
}
