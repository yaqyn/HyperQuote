/**
 * Document checklist — each doc: name + status dot + expiry date (mono).
 * Expiring items float to top. Expired shows blocked banner.
 */
import { useTranslation } from 'react-i18next'
import type { ComplianceItem } from '../../../types/dispatch'

interface ComplianceStatusProps {
  items: ComplianceItem[]
}

function daysUntilExpiry(expiryDate: string): number {
  const now = new Date()
  const expiry = new Date(expiryDate)
  return Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

function getStatusConfig(days: number): { dot: string; text: string } {
  if (days <= 0) return { dot: 'bg-red-500', text: 'text-red-600 dark:text-red-400' }
  if (days <= 7) return { dot: 'bg-red-500', text: 'text-red-600 dark:text-red-400' }
  if (days <= 30) return { dot: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400' }
  return { dot: 'bg-green-500', text: 'text-green-600 dark:text-green-400' }
}

export function ComplianceStatus({ items }: ComplianceStatusProps) {
  const { t } = useTranslation('dispatch')

  // Sort: expired/expiring first
  const sorted = [...items].sort((a, b) => {
    const aDays = daysUntilExpiry(a.expiryDate)
    const bDays = daysUntilExpiry(b.expiryDate)
    return aDays - bDays
  })

  const hasExpired = sorted.some((item) => daysUntilExpiry(item.expiryDate) <= 0)

  return (
    <div className="flex flex-col gap-3">
      <h4 className="text-xs font-medium uppercase tracking-wider text-black/40 dark:text-white/40">
        {t('driver.compliance.title', 'Compliance Status')}
      </h4>

      {hasExpired && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50/80 px-3 py-2.5 dark:bg-red-900/20">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
          <span className="min-w-0 flex-1 text-xs font-semibold text-red-700 dark:text-red-300">
            {t('driver.compliance.BLOCKED', 'BLOCKED FROM DISPATCH')}
          </span>
          <button
            type="button"
            className="shrink-0 rounded-md bg-red-600 px-2.5 py-1 text-[11px] font-semibold text-white transition-opacity hover:opacity-90 dark:bg-red-500"
          >
            {t('driver.compliance.blockAction', 'Block from Dispatch')}
          </button>
        </div>
      )}

      {!hasExpired && sorted.some((item) => daysUntilExpiry(item.expiryDate) <= 7) && (
        <div className="flex items-center gap-2 rounded-lg bg-amber-50/80 px-3 py-2.5 dark:bg-amber-900/15">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
          <span className="min-w-0 flex-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
            {t('driver.compliance.expiringWarning', 'Documents expiring soon')}
          </span>
          <button
            type="button"
            className="shrink-0 rounded-md border border-amber-300 bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-800 transition-opacity hover:opacity-90 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
          >
            {t('driver.compliance.blockAction', 'Block from Dispatch')}
          </button>
        </div>
      )}

      <div className="flex flex-col gap-1">
        {sorted.map((item) => {
          const days = daysUntilExpiry(item.expiryDate)
          const config = getStatusConfig(days)
          const expired = days <= 0

          return (
            <div
              key={item.type}
              className="flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
            >
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${config.dot}`} />
              <span className="min-w-0 flex-1 text-sm text-black/70 dark:text-white/70">
                {item.label}
              </span>
              <span className={`font-[family-name:var(--font-geist-mono)] text-xs tabular-nums font-medium ${config.text}`}>
                {expired
                  ? t('driver.compliance.expired', 'Expired')
                  : days <= 7
                    ? `${days} ${t('driver.compliance.days', 'days')}`
                    : `${days}${t('driver.compliance.daysShort', 'd')}`}
              </span>
              <span className="font-[family-name:var(--font-geist-mono)] text-[11px] tabular-nums text-black/30 dark:text-white/30">
                {new Date(item.expiryDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
