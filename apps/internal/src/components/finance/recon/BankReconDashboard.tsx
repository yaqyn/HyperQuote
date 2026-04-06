import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CurrencyCell } from '../shared/CurrencyCell'
import { CSVImporter } from './CSVImporter'
import { MatchReview } from './MatchReview'

type ReconView = 'import' | 'review'

/**
 * Bank reconciliation dashboard (Section 5.7).
 * Summary bar: bank balance, book balance, difference, reconciled count.
 * Shows CSVImporter when no active reconciliation, MatchReview when in progress.
 */
export function BankReconDashboard() {
  const { t } = useTranslation('finance')
  const [view, setView] = useState<ReconView>('import')
  const [reconSummary, setReconSummary] = useState({
    bankBalance: 15_680_000,
    bookBalance: 15_432_500,
    reconciledCount: 0,
  })

  const difference = reconSummary.bankBalance - reconSummary.bookBalance

  const handleImportComplete = (result: { transactionCount: number; autoMatchedCount: number }) => {
    setReconSummary((prev) => ({
      ...prev,
      reconciledCount: result.autoMatchedCount,
    }))
    setView('review')
  }

  const handleApplyAll = () => {
    // In production: calls server to apply all confirmed matches
    setView('import')
  }

  return (
    <div className="p-6 space-y-6">
      {/* Summary Bar */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 backdrop-blur-sm p-4">
          <div className="text-xs text-black/50 dark:text-white/50 mb-1">
            {t('recon.bankBalance', 'Bank Balance')}
          </div>
          <div className="text-lg">
            <CurrencyCell amount={reconSummary.bankBalance} />
          </div>
        </div>
        <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 backdrop-blur-sm p-4">
          <div className="text-xs text-black/50 dark:text-white/50 mb-1">
            {t('recon.bookBalance', 'Book Balance')}
          </div>
          <div className="text-lg">
            <CurrencyCell amount={reconSummary.bookBalance} />
          </div>
        </div>
        <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 backdrop-blur-sm p-4">
          <div className="text-xs text-black/50 dark:text-white/50 mb-1">
            {t('recon.difference', 'Difference')}
          </div>
          <div className={`text-lg ${difference !== 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
            <CurrencyCell amount={difference} />
          </div>
        </div>
        <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 backdrop-blur-sm p-4">
          <div className="text-xs text-black/50 dark:text-white/50 mb-1">
            {t('recon.reconciledItems', 'Reconciled Items')}
          </div>
          <div className="text-lg font-[family-name:var(--font-geist-mono)] tabular-nums">
            {reconSummary.reconciledCount}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 backdrop-blur-sm p-6">
        <h3 className="text-sm font-semibold mb-4 text-black/80 dark:text-white/80">
          {view === 'import'
            ? t('recon.importStatement', 'Import Statement')
            : t('recon.reviewMatches', 'Review Matches')}
        </h3>

        {view === 'import' ? (
          <CSVImporter onImportComplete={handleImportComplete} />
        ) : (
          <MatchReview onApplyAll={handleApplyAll} onBack={() => setView('import')} />
        )}
      </div>
    </div>
  )
}
