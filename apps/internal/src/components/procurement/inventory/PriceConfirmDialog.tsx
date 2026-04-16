import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { ArrowRight, Check, ShieldAlert } from 'lucide-react'
import {
  proofNeededFor,
  isValidProof,
  MIN_PROOF_LENGTH,
  type ProofReason,
} from '../../../lib/inputs'

interface PriceConfirmDialogProps {
  isOpen: boolean
  productName: string
  supplierName?: string
  unit: string
  oldCost: number
  newCost: number
  /** Called with the user-supplied proof text when the guard required one. */
  onConfirm: (proof?: string) => void
  onCancel: () => void
}

const PROOF_COPY: Record<NonNullable<ProofReason>, { title: string; hint: string }> = {
  decrease: {
    title: 'Lower price needs proof',
    hint: 'Dropping a cost without a paper trail is the #1 way the ledger drifts. Paste the supplier message, reference a call, or explain the negotiation.',
  },
  'large-change': {
    title: 'Big jump needs proof',
    hint: 'This change is more than 25% in one go. That is usually a real negotiation worth recording — or a typo worth catching.',
  },
}

/**
 * Small confirmation prompt shown whenever a price mutation is about to
 * commit. Centered, transparent backdrop, focus-trapped on the confirm
 * button, dismissible with Escape or click-outside. Kept intentionally
 * restrained so it reads as a quick "are you sure?" instead of a full
 * dialog ceremony.
 */
export function PriceConfirmDialog({
  isOpen,
  productName,
  supplierName,
  unit,
  oldCost,
  newCost,
  onConfirm,
  onCancel,
}: PriceConfirmDialogProps) {
  const proofReason = proofNeededFor(oldCost, newCost)
  const [proof, setProof] = useState('')

  // Reset the proof draft every time the dialog opens on a new edit.
  useEffect(() => {
    if (isOpen) setProof('')
  }, [isOpen, productName, oldCost, newCost])

  const proofOk = proofReason === null || isValidProof(proof)

  const handleConfirm = () => {
    if (!proofOk) return
    onConfirm(proofReason ? proof.trim() : undefined)
  }

  // Grace window — ignore Enter for a beat after the dialog opens so the
  // same Enter that triggered the edit commit (and opened this dialog)
  // can't cascade into an immediate confirmation on keyup or autorepeat.
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    if (!isOpen) {
      setArmed(false)
      return
    }
    const timer = setTimeout(() => setArmed(true), 250)
    return () => clearTimeout(timer)
  }, [isOpen])

  // Dismiss with Escape; Enter confirms only when armed AND form is valid.
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onCancel()
      }
      if (!armed) return
      // Enter-to-confirm is disabled while a proof textarea is being edited
      // so Enter can insert newlines. The big Confirm button is the only way
      // to commit a guarded change.
      if (e.key === 'Enter' && !proofReason && (e.metaKey || e.ctrlKey || !(e.target as HTMLElement)?.matches('textarea'))) {
        e.preventDefault()
        handleConfirm()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, armed, onCancel, proofReason, proofOk, proof])

  const delta = newCost - oldCost
  const deltaPct = oldCost > 0 ? (delta / oldCost) * 100 : 0
  const isIncrease = delta > 0

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.button
            key="price-backdrop"
            type="button"
            aria-label="Cancel price change"
            onClick={onCancel}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="fixed inset-0 z-[70] cursor-default bg-black/25 backdrop-blur-[1px]"
          />

          <motion.div
            key="price-dialog"
            role="dialog"
            aria-label="Confirm price change"
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="fixed left-1/2 top-1/2 z-[80] w-full max-w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-black/[0.08] bg-[var(--color-surface)] p-6 shadow-2xl dark:border-white/[0.1] dark:bg-[#0A0A0A]"
          >
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--color-text-subtle)]">
              Confirm price change
            </div>
            <h3 className="mt-1.5 text-[15px] font-semibold text-[var(--color-text)]">
              {productName}
            </h3>
            {supplierName && (
              <p className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">
                via {supplierName}
              </p>
            )}

            {/* Old → new price */}
            <div className="mt-5 flex items-center justify-between rounded-xl bg-black/[0.02] px-4 py-3 dark:bg-white/[0.03]">
              <div>
                <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-subtle)]">
                  Was
                </div>
                <div className="mt-1 font-[family-name:var(--font-geist-mono)] text-[16px] font-semibold tabular-nums text-[var(--color-text-muted)]">
                  {oldCost > 0
                    ? oldCost.toLocaleString('en-EG', { minimumFractionDigits: 2 })
                    : '—'}
                </div>
              </div>
              <ArrowRight size={16} strokeWidth={2} className="text-[var(--color-text-subtle)]" />
              <div className="text-end">
                <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-subtle)]">
                  Will be
                </div>
                <div className="mt-1 font-[family-name:var(--font-geist-mono)] text-[16px] font-semibold tabular-nums text-[var(--color-text)]">
                  {newCost.toLocaleString('en-EG', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div className="ms-4 border-s border-black/[0.08] ps-4 text-end dark:border-white/[0.1]">
                <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-subtle)]">
                  Delta
                </div>
                <div
                  className={`mt-1 font-[family-name:var(--font-geist-mono)] text-[13px] font-semibold tabular-nums ${
                    oldCost === 0
                      ? 'text-[var(--color-text-muted)]'
                      : isIncrease
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {oldCost === 0
                    ? 'new'
                    : `${isIncrease ? '+' : ''}${deltaPct.toFixed(1)}%`}
                </div>
              </div>
            </div>

            <p className="mt-3 text-[11px] text-[var(--color-text-subtle)]">
              Sales will see the updated cost on any quote drafted after this moment.
              EGP / {unit}.
            </p>

            {/* Proof required — only when the guard fires */}
            {proofReason && (
              <div className="mt-4 rounded-xl border border-amber-500/25 bg-amber-500/[0.04] p-3">
                <div className="flex items-start gap-2">
                  <ShieldAlert
                    size={13}
                    strokeWidth={2.5}
                    className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                      {PROOF_COPY[proofReason].title}
                    </p>
                    <p className="mt-0.5 text-[10px] leading-relaxed text-amber-700/80 dark:text-amber-300/80">
                      {PROOF_COPY[proofReason].hint}
                    </p>
                  </div>
                </div>
                <textarea
                  value={proof}
                  onChange={(e) => setProof(e.target.value)}
                  placeholder="e.g. Ahmed @ Suez Cement confirmed by phone 11:45 — bulk discount applied on the next 3 months…"
                  rows={3}
                  className="mt-2.5 w-full rounded-lg border border-black/[0.08] bg-[var(--color-surface)] px-3 py-2 text-[12px] leading-snug text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-subtle)] focus:border-amber-500/50 dark:border-white/[0.1] dark:bg-[#0A0A0A]"
                />
                <div className="mt-1 flex items-center justify-between text-[9px] font-medium uppercase tracking-[0.14em] text-[var(--color-text-subtle)]">
                  <span>Minimum {MIN_PROOF_LENGTH} characters</span>
                  <span className={`font-[family-name:var(--font-geist-mono)] tabular-nums ${
                    proof.trim().length >= MIN_PROOF_LENGTH
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-[var(--color-text-subtle)]'
                  }`}>
                    {proof.trim().length} / {MIN_PROOF_LENGTH}
                  </span>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="mt-5 flex items-center gap-2">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 rounded-lg border border-black/[0.08] py-2 text-[11px] font-medium text-[var(--color-text-muted)] transition-colors hover:bg-black/[0.03] dark:border-white/[0.1] dark:hover:bg-white/[0.04]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!proofOk || !armed}
                onClick={handleConfirm}
                className="flex flex-[2] items-center justify-center gap-1.5 rounded-lg bg-[var(--color-primary)] py-2 text-[11px] font-semibold text-white transition-colors hover:bg-[var(--color-primary)]/90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Check size={12} strokeWidth={2.5} />
                Confirm update
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
