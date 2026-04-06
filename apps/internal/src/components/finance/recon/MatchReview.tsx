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

// Mock reconciliation data
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
    case 'matched':
      return 97
    case 'partially_matched':
      return 78
    case 'unmatched':
      return 0
    case 'exception':
      return 0
    default:
      return 0
  }
}

function getConfidenceColor(confidence: number): string {
  if (confidence >= 95) return 'text-green-600 dark:text-green-400'
  if (confidence >= 70) return 'text-yellow-600 dark:text-yellow-400'
  return 'text-red-600 dark:text-red-400'
}

function getRowBg(status: ReconStatus): string {
  switch (status) {
    case 'unmatched':
      return 'bg-red-50/50 dark:bg-red-900/10'
    case 'exception':
      return 'bg-orange-50/50 dark:bg-orange-900/10'
    default:
      return ''
  }
}

/**
 * Review matched/unmatched bank reconciliation items.
 * Shows confidence scores, allows manual override, bulk apply.
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
      {/* Header actions */}
      <div className="flex items-center justify-between">
        <Button
          onPress={onBack}
          className="rounded-lg border border-black/10 dark:border-white/10 px-3 py-1.5 text-sm text-black/60 dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
        >
          {t('recon.backToImport', 'Back to Import')}
        </Button>
        <Button
          onPress={onApplyAll}
          className="rounded-lg bg-[#2563EB] px-5 py-2 text-sm font-medium text-white hover:bg-[#2563EB]/90 transition-colors"
        >
          {t('recon.applyAllMatches', 'Apply All Matches')}
        </Button>
      </div>

      {/* Transactions table */}
      <div className="overflow-x-auto rounded-xl border border-black/10 dark:border-white/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black/10 dark:border-white/10 bg-black/3 dark:bg-white/3">
              <th className="px-3 py-2.5 text-start font-medium text-black/60 dark:text-white/60">{t('recon.date', 'Date')}</th>
              <th className="px-3 py-2.5 text-start font-medium text-black/60 dark:text-white/60">{t('recon.description', 'Description')}</th>
              <th className="px-3 py-2.5 text-end font-medium text-black/60 dark:text-white/60">{t('recon.bankAmount', 'Bank Amount')}</th>
              <th className="px-3 py-2.5 text-start font-medium text-black/60 dark:text-white/60">{t('recon.reference', 'Reference')}</th>
              <th className="px-3 py-2.5 text-start font-medium text-black/60 dark:text-white/60">{t('recon.status', 'Status')}</th>
              <th className="px-3 py-2.5 text-start font-medium text-black/60 dark:text-white/60">{t('recon.matchedTo', 'Matched To')}</th>
              <th className="px-3 py-2.5 text-end font-medium text-black/60 dark:text-white/60">{t('recon.confidence', 'Confidence')}</th>
              <th className="px-3 py-2.5 text-end font-medium text-black/60 dark:text-white/60">{t('recon.actions', 'Actions')}</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => {
              const confidence = getConfidence(tx.reconStatus)
              return (
                <tr
                  key={tx.id}
                  className={`border-b border-black/5 dark:border-white/5 ${getRowBg(tx.reconStatus)}`}
                >
                  <td className="px-3 py-2.5 font-[family-name:var(--font-geist-mono)] tabular-nums whitespace-nowrap">
                    {tx.date}
                  </td>
                  <td className="px-3 py-2.5 max-w-[200px] truncate">{tx.description}</td>
                  <td className="px-3 py-2.5 text-end">
                    <CurrencyCell amount={tx.amount} />
                  </td>
                  <td className="px-3 py-2.5 font-[family-name:var(--font-geist-mono)] text-xs">{tx.reference}</td>
                  <td className="px-3 py-2.5">
                    <StatusBadge status={tx.reconStatus} variant="recon" />
                  </td>
                  <td className="px-3 py-2.5 font-[family-name:var(--font-geist-mono)] text-xs">
                    {tx.matchedPaymentId ?? '--'}
                  </td>
                  <td className="px-3 py-2.5 text-end">
                    {confidence > 0 ? (
                      <span className={`font-[family-name:var(--font-geist-mono)] tabular-nums font-medium ${getConfidenceColor(confidence)}`}>
                        {confidence}%
                      </span>
                    ) : (
                      <span className="text-black/30 dark:text-white/30">--</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-end">
                    {tx.reconStatus === 'matched' && (
                      <Button className="rounded px-2 py-1 text-xs text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors">
                        {t('recon.confirm', 'Confirm')}
                      </Button>
                    )}
                    {tx.reconStatus === 'partially_matched' && (
                      <Button className="rounded px-2 py-1 text-xs text-[#2563EB] bg-[#2563EB]/10 hover:bg-[#2563EB]/20 transition-colors">
                        {t('recon.override', 'Override')}
                      </Button>
                    )}
                    {tx.reconStatus === 'unmatched' && (
                      <div className="flex items-center justify-end gap-1">
                        <Button className="rounded px-2 py-1 text-xs text-[#2563EB] bg-[#2563EB]/10 hover:bg-[#2563EB]/20 transition-colors">
                          {t('recon.createPayment', 'Create Payment')}
                        </Button>
                        <Button
                          onPress={() => handleIgnore(tx.id)}
                          className="rounded px-2 py-1 text-xs text-black/50 dark:text-white/50 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                        >
                          {t('recon.ignore', 'Ignore')}
                        </Button>
                        <Button
                          onPress={() => handleFlagException(tx.id)}
                          className="rounded px-2 py-1 text-xs text-orange-700 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30 hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors"
                        >
                          {t('recon.flagException', 'Flag')}
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Summary footer */}
      <div className="flex items-center gap-6 rounded-lg border border-black/10 dark:border-white/10 bg-black/3 dark:bg-white/3 px-4 py-3 text-sm">
        <span>
          {t('recon.matchedLabel', 'Matched')}: <span className="font-[family-name:var(--font-geist-mono)] font-medium text-green-600 dark:text-green-400">{summary.matchedCount}</span>{' '}
          (<CurrencyCell amount={summary.matchedAmount} />)
        </span>
        <span>
          {t('recon.unmatchedLabel', 'Unmatched')}: <span className="font-[family-name:var(--font-geist-mono)] font-medium text-red-600 dark:text-red-400">{summary.unmatchedCount}</span>{' '}
          (<CurrencyCell amount={summary.unmatchedAmount} />)
        </span>
        <span>
          {t('recon.exceptionsLabel', 'Exceptions')}: <span className="font-[family-name:var(--font-geist-mono)] font-medium text-orange-600 dark:text-orange-400">{summary.exceptionCount}</span>
        </span>
      </div>
    </div>
  )
}
