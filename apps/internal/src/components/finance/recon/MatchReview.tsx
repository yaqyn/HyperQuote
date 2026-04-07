import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from 'react-aria-components'
import { CurrencyCell } from '../shared/CurrencyCell'
import { StatusBadge } from '../shared/StatusBadge'
import type { BankTransaction, ReconStatus } from '../../../types/finance'

interface MatchReviewProps {
  onApplyAll: () => void
  onBack: () => void
}

const MOCK_TRANSACTIONS: BankTransaction[] = [
  { id: 'txn-001', date: '2026-04-01', description: 'Wire transfer - ACME Corp', amount: 247500, reference: 'INV-2026-0342', bankAccountId: 'ba-001', reconStatus: 'matched', matchedPaymentId: 'pay-001' },
  { id: 'txn-002', date: '2026-04-01', description: 'Cheque deposit 445566', amount: 185000, reference: 'CHQ-445566', bankAccountId: 'ba-001', reconStatus: 'matched', matchedPaymentId: 'pay-002' },
  { id: 'txn-003', date: '2026-04-02', description: 'Transfer - Cairo Builders', amount: 520000, reference: 'CB-2026-04', bankAccountId: 'ba-001', reconStatus: 'partially_matched', matchedPaymentId: 'pay-003' },
  { id: 'txn-004', date: '2026-04-02', description: 'Cash deposit branch 12', amount: 75000, reference: '', bankAccountId: 'ba-001', reconStatus: 'unmatched' },
  { id: 'txn-005', date: '2026-04-03', description: 'Wire - unknown sender', amount: 312000, reference: 'MISC-REF', bankAccountId: 'ba-001', reconStatus: 'unmatched' },
  { id: 'txn-006', date: '2026-04-03', description: 'Duplicate entry correction', amount: -15000, reference: 'ADJ-001', bankAccountId: 'ba-001', reconStatus: 'exception' },
  { id: 'txn-007', date: '2026-04-04', description: 'Wire - Nile Construction', amount: 890000, reference: 'INV-2026-0389', bankAccountId: 'ba-001', reconStatus: 'matched', matchedPaymentId: 'pay-004' },
  { id: 'txn-008', date: '2026-04-04', description: 'Cheque deposit 667788', amount: 156000, reference: 'CHQ-667788', bankAccountId: 'ba-001', reconStatus: 'partially_matched', matchedPaymentId: 'pay-005' },
]

function getConfidence(status: ReconStatus): number {
  switch (status) {
    case 'matched': return 97
    case 'partially_matched': return 78
    case 'unmatched': return 0
    case 'exception': return 0
    default: return 0
  }
}

function getConfidenceColor(confidence: number): string {
  if (confidence >= 95) return 'text-green-600 dark:text-green-400'
  if (confidence >= 70) return 'text-yellow-600 dark:text-yellow-400'
  return 'text-black/20 dark:text-white/20'
}

/**
 * "The Matcher" — Side-by-side match review.
 * Auto-matched shown muted, unmatched highlighted. Inline accept/reject.
 * Summary footer with match counts.
 */
export function MatchReview({ onApplyAll, onBack }: MatchReviewProps) {
  const { t } = useTranslation('finance')
  const [transactions, setTransactions] = useState(MOCK_TRANSACTIONS)

  const summary = useMemo(() => {
    const matched = transactions.filter((tx) => tx.reconStatus === 'matched')
    const unmatched = transactions.filter((tx) => tx.reconStatus === 'unmatched')
    const exceptions = transactions.filter((tx) => tx.reconStatus === 'exception')
    return {
      matchedCount: matched.length,
      matchedAmount: matched.reduce((sum, tx) => sum + tx.amount, 0),
      unmatchedCount: unmatched.length,
      unmatchedAmount: unmatched.reduce((sum, tx) => sum + tx.amount, 0),
      exceptionCount: exceptions.length,
    }
  }, [transactions])

  const handleIgnore = (id: string) => {
    setTransactions((prev) => prev.filter((tx) => tx.id !== id))
  }

  const handleFlagException = (id: string) => {
    setTransactions((prev) =>
      prev.map((tx) => (tx.id === id ? { ...tx, reconStatus: 'exception' as ReconStatus } : tx)),
    )
  }

  return (
    <div className="space-y-4">
      {/* ─── Header actions ────────────────────────────── */}
      <div className="flex items-center justify-between">
        <Button
          onPress={onBack}
          className="text-xs text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors"
        >
          {t('recon.backToImport', 'Back')}
        </Button>
        <Button
          onPress={onApplyAll}
          className="rounded-md bg-[#2563EB] px-4 py-1.5 text-xs font-medium text-white hover:bg-[#2563EB]/90 pressed:bg-[#2563EB]/80 transition-colors"
        >
          {t('recon.applyAllMatches', 'Apply All')}
        </Button>
      </div>

      {/* ─── Transaction rows ──────────────────────────── */}
      <div className="border border-black/[0.06] dark:border-white/[0.06] rounded-lg overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[80px_1fr_100px_90px_70px_60px_auto] items-center gap-0 px-3 py-1.5 text-[10px] tracking-wider uppercase text-black/25 dark:text-white/25 border-b border-black/[0.06] dark:border-white/[0.06]">
          <div>{t('recon.date', 'Date')}</div>
          <div>{t('recon.description', 'Description')}</div>
          <div className="text-end">{t('recon.bankAmount', 'Amount')}</div>
          <div>{t('recon.reference', 'Ref')}</div>
          <div className="text-center">{t('recon.status', 'Status')}</div>
          <div className="text-end">{t('recon.confidence', 'Conf')}</div>
          <div className="text-end min-w-[120px]">{t('recon.actions', 'Actions')}</div>
        </div>

        {transactions.map((tx) => {
          const confidence = getConfidence(tx.reconStatus)
          const isMuted = tx.reconStatus === 'matched'
          const isHighlighted = tx.reconStatus === 'unmatched'
          const isException = tx.reconStatus === 'exception'

          return (
            <div
              key={tx.id}
              className={`grid grid-cols-[80px_1fr_100px_90px_70px_60px_auto] items-center gap-0 px-3 py-2 border-b border-black/[0.03] dark:border-white/[0.03] last:border-b-0 transition-colors ${
                isHighlighted
                  ? 'bg-red-500/[0.02]'
                  : isException
                    ? 'bg-yellow-500/[0.02]'
                    : isMuted
                      ? 'opacity-50'
                      : ''
              }`}
            >
              <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-xs text-black/40 dark:text-white/40">
                {tx.date}
              </span>
              <span className="text-xs text-black/60 dark:text-white/60 truncate pe-2">
                {tx.description}
              </span>
              <span className="text-end">
                <CurrencyCell amount={tx.amount} className="text-xs" />
              </span>
              <span className="font-[family-name:var(--font-geist-mono)] text-[10px] text-black/25 dark:text-white/25 truncate">
                {tx.reference || '--'}
              </span>
              <div className="text-center">
                <StatusBadge status={tx.reconStatus} variant="recon" />
              </div>
              <span className="text-end">
                {confidence > 0 ? (
                  <span className={`font-[family-name:var(--font-geist-mono)] tabular-nums text-[10px] font-medium ${getConfidenceColor(confidence)}`}>
                    {confidence}%
                  </span>
                ) : (
                  <span className="text-[10px] text-black/10 dark:text-white/10">--</span>
                )}
              </span>
              <div className="flex items-center justify-end gap-1 min-w-[120px]">
                {tx.reconStatus === 'matched' && (
                  <Button className="rounded px-2 py-0.5 text-[10px] text-green-700 dark:text-green-400 bg-green-500/[0.08] hover:bg-green-500/[0.15] transition-colors">
                    {t('recon.confirm', 'Confirm')}
                  </Button>
                )}
                {tx.reconStatus === 'partially_matched' && (
                  <Button className="rounded px-2 py-0.5 text-[10px] text-[#2563EB] bg-[#2563EB]/[0.06] hover:bg-[#2563EB]/[0.12] transition-colors">
                    {t('recon.override', 'Override')}
                  </Button>
                )}
                {tx.reconStatus === 'unmatched' && (
                  <>
                    <Button className="rounded px-2 py-0.5 text-[10px] text-[#2563EB] bg-[#2563EB]/[0.06] hover:bg-[#2563EB]/[0.12] transition-colors">
                      {t('recon.createPayment', 'Create')}
                    </Button>
                    <Button
                      onPress={() => handleIgnore(tx.id)}
                      className="rounded px-2 py-0.5 text-[10px] text-black/30 dark:text-white/30 hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors"
                    >
                      {t('recon.ignore', 'Ignore')}
                    </Button>
                    <Button
                      onPress={() => handleFlagException(tx.id)}
                      className="rounded px-2 py-0.5 text-[10px] text-yellow-700 dark:text-yellow-400 bg-yellow-500/[0.08] hover:bg-yellow-500/[0.15] transition-colors"
                    >
                      {t('recon.flagException', 'Flag')}
                    </Button>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* ─── Summary footer ────────────────────────────── */}
      <div className="flex items-center gap-6 text-xs text-black/40 dark:text-white/40">
        <span>
          Matched{' '}
          <span className="font-[family-name:var(--font-geist-mono)] tabular-nums font-medium text-green-600 dark:text-green-400">
            {summary.matchedCount}
          </span>
          {' '}(<CurrencyCell amount={summary.matchedAmount} className="text-xs" />)
        </span>
        <span>
          Unmatched{' '}
          <span className="font-[family-name:var(--font-geist-mono)] tabular-nums font-medium text-red-600 dark:text-red-400">
            {summary.unmatchedCount}
          </span>
          {' '}(<CurrencyCell amount={summary.unmatchedAmount} className="text-xs" />)
        </span>
        <span>
          Exceptions{' '}
          <span className="font-[family-name:var(--font-geist-mono)] tabular-nums font-medium text-yellow-600 dark:text-yellow-400">
            {summary.exceptionCount}
          </span>
        </span>
      </div>
    </div>
  )
}
