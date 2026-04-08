import type { CycleCountResult, ABCClass } from '../../../types/warehouse'

interface CountReviewProps {
  results: CycleCountResult[]
  onApprove: () => void
  onRequestSupervisor: () => void
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
export function CountReview({ results, onApprove, onRequestSupervisor, onBack }: CountReviewProps) {
  const anyNeedsRecount = results.some((r) => r.needsRecount)

  return (
    <div className="flex flex-col gap-6 px-6 py-4">
      {/* ─── Header ──────────────────────────────────────── */}
      <div>
        <h2 className="text-xl font-bold text-[var(--color-text-primary)]">Count Review</h2>
        <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">Variance analysis</p>
      </div>

      {/* ─── Summary banner — tablet readable ────────────── */}
      {anyNeedsRecount ? (
        <div className="rounded-xl border border-red-200 px-5 py-5 min-h-[72px] flex flex-col justify-center" style={{ background: 'rgba(239, 68, 68, 0.04)' }}>
          <p className="text-[16px] font-bold text-red-700">Recount Requested</p>
          <p className="text-[14px] text-red-600 mt-1">
            Items exceed ABC variance threshold. A different worker will recount.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-green-200 px-5 py-5 min-h-[72px] flex flex-col justify-center" style={{ background: 'rgba(22, 163, 74, 0.04)' }}>
          <p className="text-[16px] font-bold text-green-700">Auto-Approved</p>
          <p className="text-[14px] text-green-600 mt-1">
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
                  <p className="text-[16px] font-bold text-[var(--color-text-primary)]">
                    {result.productId}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-md border border-[var(--color-border)]">
                      {result.abcClass}
                    </span>
                    <span className="text-[12px] text-[var(--color-text-secondary)]">
                      Threshold {ABC_THRESHOLD_LABELS[result.abcClass]}
                    </span>
                  </div>
                </div>
                <VarianceBadge variancePercent={result.variancePercent} needsRecount={result.needsRecount} />
              </div>

              {/* Side-by-side quantities — LARGE MONO for tablet */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--color-text-secondary)]">
                    System
                  </span>
                  <p className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[28px] font-bold text-[var(--color-text-primary)] mt-1">
                    {result.systemQty}
                  </p>
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--color-text-secondary)]">
                    Counted
                  </span>
                  <p className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[28px] font-bold text-[var(--color-text-primary)] mt-1">
                    {result.physicalCount}
                  </p>
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--color-text-secondary)]">
                    Variance
                  </span>
                  <p className={`font-[family-name:var(--font-geist-mono)] tabular-nums text-[28px] font-bold mt-1 ${varianceColor}`}>
                    {result.variance > 0 ? '+' : ''}{result.variance}
                  </p>
                </div>
              </div>

              {/* Threshold result — clear status: ✓ Within | ⚠ Recount | ✗ Major variance */}
              <div
                className={`mt-4 rounded-xl px-5 py-4 text-[15px] font-bold flex items-center gap-3 min-h-[56px] ${
                  result.needsRecount
                    ? 'text-red-700'
                    : result.variance === 0
                      ? 'text-green-700'
                      : 'text-amber-700'
                }`}
                style={{
                  background: result.needsRecount
                    ? 'rgba(239, 68, 68, 0.04)'
                    : result.variance === 0
                      ? 'rgba(22, 163, 74, 0.04)'
                      : 'rgba(234, 179, 8, 0.04)',
                }}
              >
                <span className="text-[22px]">
                  {result.needsRecount ? '\u2717' : result.variance === 0 ? '\u2713' : '\u26A0'}
                </span>
                {result.needsRecount
                  ? `${absVariancePercent.toFixed(1)}% exceeds ${ABC_THRESHOLD_LABELS[result.abcClass]} — needs recount`
                  : result.variance === 0
                    ? 'Exact match'
                    : `${absVariancePercent.toFixed(1)}% within ${ABC_THRESHOLD_LABELS[result.abcClass]} — approved`
                }
              </div>
            </div>
          )
        })}
      </div>

      {/* ─── Actions — tablet: 64px+ touch targets ─────────── */}
      {anyNeedsRecount ? (
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex-1 min-h-[64px] rounded-xl border border-[var(--color-border)] text-[16px] font-bold text-[var(--color-text-primary)] hover:bg-black/[0.02] transition-colors active:scale-[0.98]"
          >
            Back
          </button>
          <button
            type="button"
            onClick={onRequestSupervisor}
            className="flex-1 min-h-[64px] rounded-xl bg-[#2563EB] text-white text-[16px] font-bold hover:bg-[#1d4ed8] transition-all active:scale-[0.97]"
          >
            Submit for Review
          </button>
        </div>
      ) : (
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex-1 min-h-[64px] rounded-xl border border-[var(--color-border)] text-[16px] font-bold text-[var(--color-text-primary)] hover:bg-black/[0.02] transition-colors active:scale-[0.98]"
          >
            Back
          </button>
          <button
            type="button"
            onClick={onApprove}
            className="flex-1 min-h-[64px] rounded-xl bg-[#2563EB] text-white text-[16px] font-bold hover:bg-[#1d4ed8] transition-all active:scale-[0.97]"
          >
            Approve
          </button>
        </div>
      )}
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
