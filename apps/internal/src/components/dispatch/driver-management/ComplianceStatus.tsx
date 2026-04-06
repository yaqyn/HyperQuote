/**
 * Compliance status component — shows license/cert expiry tracking.
 * Color coded: green (>60d), yellow (30-60d), amber (7-30d), red (<7d/expired).
 * Expired items show red "BLOCKED FROM DISPATCH" banner.
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

function getExpiryColor(days: number): { bg: string; text: string; dot: string } {
  if (days <= 0) return { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', dot: 'bg-red-500' }
  if (days <= 7) return { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-600 dark:text-red-400', dot: 'bg-red-500' }
  if (days <= 30) return { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-300', dot: 'bg-amber-500' }
  if (days <= 60) return { bg: 'bg-yellow-50 dark:bg-yellow-900/20', text: 'text-yellow-700 dark:text-yellow-300', dot: 'bg-yellow-500' }
  return { bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-700 dark:text-green-300', dot: 'bg-green-500' }
}

export function ComplianceStatus({ items }: ComplianceStatusProps) {
  const { t } = useTranslation('dispatch')

  const hasExpired = items.some((item) => daysUntilExpiry(item.expiryDate) <= 0)

  return (
    <div className="flex flex-col gap-3">
      <h4 className="text-sm font-semibold text-black/80 dark:text-white/80">
        {t('driver.compliance.title', 'Compliance Status')}
      </h4>

      {/* BLOCKED FROM DISPATCH banner */}
      {hasExpired && (
        <div className="rounded-lg bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700/50 px-3 py-2 flex items-center gap-2">
          <svg className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
          <span className="text-sm font-semibold text-red-700 dark:text-red-300">
            {t('driver.compliance.BLOCKED', 'BLOCKED FROM DISPATCH')}
          </span>
        </div>
      )}

      {/* Compliance items list */}
      <div className="flex flex-col gap-2">
        {items.map((item) => {
          const days = daysUntilExpiry(item.expiryDate)
          const colors = getExpiryColor(days)
          const expired = days <= 0

          return (
            <div
              key={item.type}
              className={`rounded-lg px-3 py-2 ${colors.bg} flex items-center justify-between`}
            >
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full shrink-0 ${colors.dot}`} />
                <span className={`text-sm ${colors.text}`}>{item.label}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className={`font-[family-name:var(--font-geist-mono)] tabular-nums text-xs ${colors.text}`}>
                  {new Date(item.expiryDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
                <span className={`font-[family-name:var(--font-geist-mono)] tabular-nums text-xs font-medium ${colors.text}`}>
                  {expired
                    ? t('driver.compliance.expired', 'Expired')
                    : `${days}${t('driver.compliance.daysShort', 'd')}`}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
