import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CurrencyCell } from '../shared/CurrencyCell'
import { CSVImporter } from './CSVImporter'
import { MatchReview } from './MatchReview'

type ReconView = 'import' | 'review'

/**
 * "The Matcher" — Bank reconciliation dashboard.
 * Summary strip at top, CSVImporter for import, MatchReview for matching.
 * Split-view feel with clean separation.
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
    setView('import')
  }

  return (
    <div className="space-y-0">
      {/* ─── Summary strip ─────────────────────────────── */}
      <div className="flex items-center gap-8 px-5 py-3 border-b border-black/[0.06] dark:border-white/[0.06]">
        <div>
          <div className="text-[10px] tracking-widest uppercase text-black/25 dark:text-white/25">
            {t('recon.bankBalance', 'Bank')}
          </div>
          <CurrencyCell amount={reconSummary.bankBalance} className="text-sm" />
        </div>
        <div>
          <div className="text-[10px] tracking-widest uppercase text-black/25 dark:text-white/25">
            {t('recon.bookBalance', 'Book')}
          </div>
          <CurrencyCell amount={reconSummary.bookBalance} className="text-sm" />
        </div>
        <div>
          <div className="text-[10px] tracking-widest uppercase text-black/25 dark:text-white/25">
            {t('recon.difference', 'Difference')}
          </div>
          <CurrencyCell
            amount={difference}
            className={`text-sm ${difference !== 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}
          />
        </div>
        <div>
          <div className="text-[10px] tracking-widest uppercase text-black/25 dark:text-white/25">
            {t('recon.reconciledItems', 'Reconciled')}
          </div>
          <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-sm">
            {reconSummary.reconciledCount}
          </span>
        </div>
      </div>

      {/* ─── View label ────────────────────────────────── */}
      <div className="px-5 py-2 border-b border-black/[0.06] dark:border-white/[0.06]">
        <span className="text-[10px] tracking-widest uppercase text-black/20 dark:text-white/20">
          {view === 'import'
            ? t('recon.importStatement', 'Import Statement')
            : t('recon.reviewMatches', 'Review Matches')}
        </span>
      </div>

      {/* ─── Content ───────────────────────────────────── */}
      <div className="px-5 py-5">
        {view === 'import' ? (
          <CSVImporter onImportComplete={handleImportComplete} />
        ) : (
          <MatchReview onApplyAll={handleApplyAll} onBack={() => setView('import')} />
        )}
      </div>
    </div>
  )
}
