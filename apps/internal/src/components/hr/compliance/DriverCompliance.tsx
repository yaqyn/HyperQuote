import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'motion/react'
import { getDriverCompliance } from '../../../lib/server/hr'
import type { ComplianceStatus, DriverComplianceRecord } from '../../../types/hr'

/**
 * Driver Compliance — "The Checklist"
 * Document matrix: employees down, documents across. Each cell: status dot (valid/expiring/expired/missing).
 * Expiring items highlighted with yellow accent. Click to see document details.
 */
export function DriverCompliance() {
  const { t } = useTranslation('hr')

  const { data: records } = useQuery({
    queryKey: ['hr', 'compliance'],
    queryFn: () => getDriverCompliance(),
    staleTime: 30_000,
  })

  if (!records) {
    return (
      <div className="p-5 text-center text-[var(--color-text-subtle)]">
        Loading...
      </div>
    )
  }

  const expiring = records.filter((r) => r.complianceStatus === 'yellow')
  const expired = records.filter((r) => r.complianceStatus === 'red')
  const valid = records.filter((r) => r.complianceStatus === 'green')

  // Sort by urgency: expired -> expiring -> valid
  const sortedRecords = [...expired, ...expiring, ...valid]

  // Document columns for the matrix
  const docColumns = [
    { key: 'license', label: t('compliance.licenseExpiry', 'License') },
    { key: 'medical', label: t('compliance.medicalExpiry', 'Medical') },
    { key: 'drugTest', label: t('compliance.drugTest', 'Drug Test') },
  ]

  return (
    <div className="p-5 space-y-6">
      {/* EXPIRED: Red blocked banner (critical — must see first) */}
      {expired.length > 0 && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-5 py-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
            <span className="text-sm font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider">
              {t('compliance.blockedBanner', 'BLOCKED — Expired Documents')}
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            {expired.map((r) => (
              <div key={r.driverId} className="flex items-center gap-3 text-sm">
                <span className="text-[var(--color-text)] font-medium">{r.driverName}</span>
                <span className="text-red-600 dark:text-red-400 text-xs">
                  {t('compliance.cannotDispatch', 'Cannot dispatch — documents expired')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* EXPIRING: Amber warning (needs attention within 30 days) */}
      {expiring.length > 0 && (
        <div className="rounded-xl bg-amber-500/[0.06] border border-amber-500/20 px-5 py-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
            <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
              {t('compliance.expiringBanner', '{{count}} driver documents expiring within 30 days', { count: expiring.length })}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            {expiring.map((r) => (
              <div key={r.driverId} className="flex items-center gap-3 text-sm">
                <span className="text-[var(--color-text)]">{r.driverName}</span>
                <span className="text-amber-600 dark:text-amber-400 text-xs">{t('compliance.reviewNeeded', 'Review needed')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats strip */}
      <div className="flex items-baseline gap-8 border-b border-[var(--color-border)] pb-5">
        <div>
          <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--color-text-subtle)] mb-1">
            {t('compliance.total', 'Total Drivers')}
          </div>
          <div className="text-3xl font-[family-name:var(--font-geist-mono)] tabular-nums text-[var(--color-text)]">
            {records.length}
          </div>
        </div>
        <div>
          <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--color-text-subtle)] mb-1">
            {t('compliance.expiringItems', 'Expiring')}
          </div>
          <div className={`text-3xl font-[family-name:var(--font-geist-mono)] tabular-nums ${expiring.length > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-[var(--color-text-subtle)]'}`}>
            {expiring.length}
          </div>
        </div>
        <div>
          <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--color-text-subtle)] mb-1">
            {t('compliance.expiredItems', 'Expired')}
          </div>
          <div className={`text-3xl font-[family-name:var(--font-geist-mono)] tabular-nums ${expired.length > 0 ? 'text-red-600 dark:text-red-400' : 'text-[var(--color-text-subtle)]'}`}>
            {expired.length}
          </div>
        </div>
      </div>

      {/* Document matrix */}
      <div>
        <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--color-text-subtle)] mb-3">
          {t('compliance.matrix', 'Compliance Matrix')}
        </div>

        {/* Header row */}
        <div className="flex items-center gap-0 border-b border-[var(--color-border)] pb-2 mb-1">
          <div className="w-40 shrink-0 text-[11px] font-medium text-[var(--color-text-subtle)]">
            {t('compliance.driverName', 'Driver')}
          </div>
          <div className="w-16 shrink-0 text-[11px] font-medium text-[var(--color-text-subtle)] text-center">
            {t('compliance.licenseClass', 'Class')}
          </div>
          {docColumns.map((col) => (
            <div key={col.key} className="w-24 shrink-0 text-[11px] font-medium text-[var(--color-text-subtle)] text-center">
              {col.label}
            </div>
          ))}
          {/* Certifications columns (dynamic) */}
          <div className="flex-1 text-[11px] font-medium text-[var(--color-text-subtle)] ps-3">
            {t('compliance.certifications', 'Certifications')}
          </div>
          <div className="w-20 shrink-0 text-[11px] font-medium text-[var(--color-text-subtle)] text-center">
            {t('compliance.status', 'Status')}
          </div>
        </div>

        {/* Driver rows — sorted: Expired → Expiring → Valid */}
        <div className="flex flex-col">
          {sortedRecords.map((record) => {
            const isRed = record.complianceStatus === 'red'
            const isYellow = record.complianceStatus === 'yellow'

            return (
              <motion.div
                key={record.driverId}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.12, ease: 'easeOut' }}
                className={`flex items-center gap-0 py-2 border-b border-[var(--color-border)]/30 rounded-lg transition-colors
                  hover:bg-black/[0.02] dark:hover:bg-white/[0.02]
                  ${isYellow ? 'border-s-2 border-s-amber-500 ps-2' : isRed ? 'border-s-2 border-s-red-500 ps-2' : ''}`}
              >
                {/* Driver name */}
                <div className="w-40 shrink-0">
                  <span className="text-sm text-[var(--color-text)] truncate block">{record.driverName}</span>
                  {record.dispatchBlocked && (
                    <span className="text-[10px] font-medium text-red-600 dark:text-red-400 uppercase tracking-wider">
                      {t('compliance.dispatchBlocked', 'BLOCKED')}
                    </span>
                  )}
                </div>

                {/* License class */}
                <div className="w-16 shrink-0 text-center">
                  <span className="text-xs text-[var(--color-text-muted)]">
                    {t(`compliance.${record.licenseClass}`, record.licenseClass)}
                  </span>
                </div>

                {/* License expiry dot + date */}
                <div className="w-24 shrink-0 flex flex-col items-center gap-0.5">
                  <span className={`w-2 h-2 rounded-full ${dateStatusDot(record.licenseExpiry)}`} />
                  <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[10px] text-[var(--color-text-subtle)]">
                    {record.licenseExpiry}
                  </span>
                </div>

                {/* Medical expiry dot + date */}
                <div className="w-24 shrink-0 flex flex-col items-center gap-0.5">
                  <span className={`w-2 h-2 rounded-full ${dateStatusDot(record.medicalExpiry)}`} />
                  <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[10px] text-[var(--color-text-subtle)]">
                    {record.medicalExpiry}
                  </span>
                </div>

                {/* Drug test dot + date */}
                <div className="w-24 shrink-0 flex flex-col items-center gap-0.5">
                  <span className={`w-2 h-2 rounded-full ${
                    record.drugTestResult === 'pass' ? 'bg-green-500'
                      : record.drugTestResult === 'fail' ? 'bg-red-500'
                        : 'bg-black/10 dark:bg-white/10'
                  }`} />
                  <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[10px] text-[var(--color-text-subtle)]">
                    {record.drugTestDate}
                  </span>
                </div>

                {/* Certifications */}
                <div className="flex-1 flex flex-wrap gap-1 ps-3">
                  {record.certifications.map((cert) => (
                    <span key={cert.type} className="inline-flex items-center gap-1 text-[10px] text-[var(--color-text-muted)]">
                      <span className={`w-1.5 h-1.5 rounded-full ${dateStatusDot(cert.expiry)}`} />
                      {cert.type}
                    </span>
                  ))}
                  {record.certifications.length === 0 && (
                    <span className="text-[10px] text-[var(--color-text-subtle)]">-</span>
                  )}
                </div>

                {/* Overall status */}
                <div className="w-20 shrink-0 flex justify-center">
                  <span className={`w-2.5 h-2.5 rounded-full ${overallDot(record.complianceStatus)}`} />
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[11px] text-[var(--color-text-subtle)]">
        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Valid</span>
        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Expiring (30d)</span>
        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Expired</span>
        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-black/10 dark:bg-white/10" /> Missing</span>
      </div>
    </div>
  )
}

// ─── Helpers ────────────────────────────────────────────

function dateStatusDot(dateStr: string): string {
  const now = Date.now()
  const date = new Date(dateStr).getTime()
  const thirtyDays = 30 * 24 * 60 * 60 * 1000

  if (date < now) return 'bg-red-500'
  if (date - now < thirtyDays) return 'bg-amber-500'
  return 'bg-green-500'
}

function overallDot(status: ComplianceStatus): string {
  const map: Record<ComplianceStatus, string> = {
    green: 'bg-green-500',
    yellow: 'bg-amber-500',
    red: 'bg-red-500',
  }
  return map[status]
}
