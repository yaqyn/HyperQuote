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
 * "The Audit" — Count review.
 * Side-by-side: system qty vs counted qty in large mono.
 * Variance highlighted: green if match, yellow/red if mismatch.
 * Accept/Recount buttons.
 */
export function CountReview({ results, onBack }: CountReviewProps) {
  const anyNeedsRecount = results.some((r) => r.needsRecount)

  return (
    <div className="flex flex-col gap-6">
      {/* ─── Header ──────────────────────────────────────── */}
      <div>
        <h2 className="text-xl font-bold text-[var(--color-text-primary)]">Count Review</h2>
        <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">Variance analysis</p>
      </div>

      {/* ─── Summary banner ──────────────────────────────── */}
      {anyNeedsRecount ? (
        <div className="rounded-xl border border-red-200 p-4" style={{ background: 'rgba(239, 68, 68, 0.04)' }}>
          <p className="text-sm font-bold text-red-700">Recount Requested</p>
          <p className="text-xs text-red-600 mt-1">
            Items exceed ABC variance threshold. A different worker will recount.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-green-200 p-4" style={{ background: 'rgba(22, 163, 74, 0.04)' }}>
          <p className="text-sm font-bold text-green-700">Auto-Approved</p>
          <p className="text-xs text-green-600 mt-1">
            All items within ABC variance thresholds.
          </p>
        </div>
      )}

      {/* ─── Results — side-by-side comparison ───────────── */}
      <div className="flex flex-col gap-3">
        {results.map((result) => {
          const absVariancePercent = Math.abs(result.variancePercent) * 100
          const varianceColor = result.needsRecount
            ? 'text-red-600'
            : result.variance === 0
              ? 'text-[var(--color-text-secondary)]'
              : 'text-green-600'

          return (
            <div
              key={result.productId}
              className="rounded-xl border border-[var(--color-border)] p-4"
            >
              {/* Product + ABC badge */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-sm font-bold text-[var(--color-text-primary)]">
                    {result.productId}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md border border-[var(--color-border)]">
                      {result.abcClass}
                    </span>
                    <span className="text-[10px] text-[var(--color-text-secondary)]">
                      Threshold {ABC_THRESHOLD_LABELS[result.abcClass]}
                    </span>
                  </div>
                </div>
                <VarianceBadge variancePercent={result.variancePercent} needsRecount={result.needsRecount} />
              </div>

              {/* Side-by-side quantities — LARGE MONO */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-secondary)]">
                    System
                  </span>
                  <p className="font-[family-name:var(--font-geist-mono)] tabular-nums text-2xl font-bold text-[var(--color-text-primary)] mt-0.5">
                    {result.systemQty}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-secondary)]">
                    Counted
                  </span>
                  <p className="font-[family-name:var(--font-geist-mono)] tabular-nums text-2xl font-bold text-[var(--color-text-primary)] mt-0.5">
                    {result.physicalCount}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-secondary)]">
                    Variance
                  </span>
                  <p className={`font-[family-name:var(--font-geist-mono)] tabular-nums text-2xl font-bold mt-0.5 ${varianceColor}`}>
                    {result.variance > 0 ? '+' : ''}{result.variance}
                  </p>
                </div>
              </div>

              {/* Threshold result */}
              <div
                className={`mt-3 rounded-lg px-3 py-2 text-xs font-bold ${
                  result.needsRecount ? 'text-red-700' : 'text-green-700'
                }`}
                style={{
                  background: result.needsRecount
                    ? 'rgba(239, 68, 68, 0.04)'
                    : 'rgba(22, 163, 74, 0.04)',
                }}
              >
                {result.needsRecount
                  ? `${absVariancePercent.toFixed(1)}% > ${ABC_THRESHOLD_LABELS[result.abcClass]} -- recount`
                  : `${absVariancePercent.toFixed(1)}% <= ${ABC_THRESHOLD_LABELS[result.abcClass]} -- approved`
                }
              </div>
            </div>
          )
        })}
      </div>

      {/* ─── Back ────────────────────────────────────────── */}
      <button
        type="button"
        onClick={onBack}
        className="min-h-[48px] rounded-xl border border-[var(--color-border)] text-base font-bold text-[var(--color-text-primary)] hover:bg-black/[0.02] transition-colors"
      >
        Back to Count List
      </button>
    </div>
  )
}

// ─── Variance Badge ─────────────────────────────────────────

function VarianceBadge({ variancePercent, needsRecount }: { variancePercent: number; needsRecount: boolean }) {
  const absPercent = Math.abs(variancePercent) * 100
  const displayText = `${variancePercent >= 0 ? '+' : '-'}${absPercent.toFixed(1)}%`

  const style = needsRecount
    ? { color: '#b91c1c', background: 'rgba(239, 68, 68, 0.06)' }
    : absPercent === 0
      ? { color: '#6b7280', background: 'rgba(107, 114, 128, 0.06)' }
      : { color: '#15803d', background: 'rgba(22, 163, 74, 0.06)' }

  return (
    <span
      className="font-[family-name:var(--font-geist-mono)] tabular-nums text-xs font-bold px-2.5 py-1 rounded-md"
      style={style}
    >
      {displayText}
    </span>
  )
}
