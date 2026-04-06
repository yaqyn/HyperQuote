import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { getDriverCompliance } from '../../../lib/server/hr'
import type { ComplianceStatus, DriverComplianceRecord } from '../../../types/hr'

// ─── Glass panel wrapper ────────────────────────────────

function GlassPanel({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={`rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 backdrop-blur-sm p-4 ${className}`}
    >
      {children}
    </div>
  )
}

const STATUS_BADGE: Record<ComplianceStatus, { className: string; dot: string }> = {
  green: { className: 'bg-green-500/20 text-green-700 dark:text-green-300', dot: 'bg-green-500' },
  yellow: { className: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300', dot: 'bg-yellow-500' },
  red: { className: 'bg-red-500/20 text-red-700 dark:text-red-300', dot: 'bg-red-500' },
}

/**
 * Driver compliance view.
 * Table per driver: license class, expiry dates, drug test, certifications, status, dispatch blocked.
 * Red = dispatch block. System automatically prevents assigning this driver to any route until resolved.
 * Blocking logic is in dispatch module (Phase 21). HR module only DISPLAYS the status.
 *
 * Alerts section at top: cards showing items expiring in 30 days (yellow) and expired (red).
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
      <div className="p-6 text-center text-black/40 dark:text-white/40">
        Loading...
      </div>
    )
  }

  const expiring = records.filter((r) => r.complianceStatus === 'yellow')
  const expired = records.filter((r) => r.complianceStatus === 'red')

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-lg font-semibold">{t('compliance.title', 'Driver Compliance')}</h2>

      {/* ─── Alerts Section ──────────────────────────────── */}
      {(expiring.length > 0 || expired.length > 0) && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-black/70 dark:text-white/70">
            {t('compliance.alerts', 'Compliance Alerts')}
          </h3>

          {expired.length > 0 && (
            <GlassPanel className="border-red-500/30">
              <h4 className="text-xs font-medium text-red-700 dark:text-red-300 mb-2">
                {t('compliance.expiredItems', 'Expired Items')}
              </h4>
              <div className="space-y-2">
                {expired.map((r) => (
                  <AlertCard key={r.driverId} record={r} severity="red" t={t} />
                ))}
              </div>
            </GlassPanel>
          )}

          {expiring.length > 0 && (
            <GlassPanel className="border-yellow-500/30">
              <h4 className="text-xs font-medium text-yellow-700 dark:text-yellow-300 mb-2">
                {t('compliance.expiringItems', 'Items Expiring Within 30 Days')}
              </h4>
              <div className="space-y-2">
                {expiring.map((r) => (
                  <AlertCard key={r.driverId} record={r} severity="yellow" t={t} />
                ))}
              </div>
            </GlassPanel>
          )}
        </div>
      )}

      {/* ─── Compliance Table ────────────────────────────── */}
      <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 backdrop-blur-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02]">
              <th className="px-4 py-3 text-start text-xs text-black/50 dark:text-white/50 font-medium">{t('compliance.driverName', 'Driver Name')}</th>
              <th className="px-4 py-3 text-start text-xs text-black/50 dark:text-white/50 font-medium">{t('compliance.licenseClass', 'License Class')}</th>
              <th className="px-4 py-3 text-start text-xs text-black/50 dark:text-white/50 font-medium">{t('compliance.licenseExpiry', 'License Expiry')}</th>
              <th className="px-4 py-3 text-start text-xs text-black/50 dark:text-white/50 font-medium">{t('compliance.medicalExpiry', 'Medical Expiry')}</th>
              <th className="px-4 py-3 text-start text-xs text-black/50 dark:text-white/50 font-medium">{t('compliance.drugTest', 'Drug Test')}</th>
              <th className="px-4 py-3 text-start text-xs text-black/50 dark:text-white/50 font-medium">{t('compliance.certifications', 'Certifications')}</th>
              <th className="px-4 py-3 text-start text-xs text-black/50 dark:text-white/50 font-medium">{t('compliance.status', 'Status')}</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => {
              const badge = STATUS_BADGE[record.complianceStatus]
              const isRed = record.complianceStatus === 'red'

              return (
                <tr
                  key={record.driverId}
                  className={`border-b border-black/5 dark:border-white/5 ${
                    isRed ? 'bg-red-500/5' : ''
                  }`}
                >
                  <td className="px-4 py-3 font-medium">
                    {record.driverName}
                    {record.dispatchBlocked && (
                      <span className="ms-2 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold bg-red-500/20 text-red-700 dark:text-red-300 uppercase tracking-wider">
                        {t('compliance.dispatchBlocked', 'DISPATCH BLOCKED')}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-black/60 dark:text-white/60">
                    {t(`compliance.${record.licenseClass}`, record.licenseClass)}
                  </td>
                  <td className="px-4 py-3 font-[family-name:var(--font-geist-mono)] tabular-nums text-black/60 dark:text-white/60">
                    {record.licenseExpiry}
                  </td>
                  <td className="px-4 py-3 font-[family-name:var(--font-geist-mono)] tabular-nums text-black/60 dark:text-white/60">
                    {record.medicalExpiry}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-xs">
                      <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-black/60 dark:text-white/60">
                        {record.drugTestDate}
                      </span>
                      <span className={`ms-1.5 ${record.drugTestResult === 'pass' ? 'text-green-600 dark:text-green-400' : record.drugTestResult === 'fail' ? 'text-red-600 dark:text-red-400' : 'text-black/40 dark:text-white/40'}`}>
                        {t(`compliance.${record.drugTestResult}`, record.drugTestResult)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {record.certifications.map((cert) => (
                        <span key={cert.type} className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] bg-black/5 dark:bg-white/5 text-black/60 dark:text-white/60">
                          {cert.type}
                          <span className="ms-1 font-[family-name:var(--font-geist-mono)] tabular-nums">
                            {cert.expiry}
                          </span>
                        </span>
                      ))}
                      {record.certifications.length === 0 && (
                        <span className="text-xs text-black/30 dark:text-white/30">-</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                      {t(`compliance.${record.complianceStatus}`, record.complianceStatus)}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Sub-components ─────────────────────────────────────

function AlertCard({
  record,
  severity,
  t,
}: {
  record: DriverComplianceRecord
  severity: 'red' | 'yellow'
  t: (key: string, fallback: string) => string
}) {
  const now = new Date()

  // Collect expiring/expired items
  const items: Array<{ type: string; date: string }> = []
  const licenseDate = new Date(record.licenseExpiry)
  const medicalDate = new Date(record.medicalExpiry)
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000

  if (severity === 'red') {
    if (licenseDate.getTime() < now.getTime()) items.push({ type: 'License', date: record.licenseExpiry })
    if (medicalDate.getTime() < now.getTime()) items.push({ type: 'Medical', date: record.medicalExpiry })
    for (const cert of record.certifications) {
      if (new Date(cert.expiry).getTime() < now.getTime()) items.push({ type: cert.type, date: cert.expiry })
    }
    if (record.drugTestResult === 'fail') items.push({ type: 'Drug Test', date: record.drugTestDate })
  } else {
    if (licenseDate.getTime() - now.getTime() < thirtyDaysMs && licenseDate.getTime() >= now.getTime())
      items.push({ type: 'License', date: record.licenseExpiry })
    if (medicalDate.getTime() - now.getTime() < thirtyDaysMs && medicalDate.getTime() >= now.getTime())
      items.push({ type: 'Medical', date: record.medicalExpiry })
    for (const cert of record.certifications) {
      const certDate = new Date(cert.expiry)
      if (certDate.getTime() - now.getTime() < thirtyDaysMs && certDate.getTime() >= now.getTime())
        items.push({ type: cert.type, date: cert.expiry })
    }
  }

  if (items.length === 0) return null

  return (
    <div className="flex items-start gap-3 text-sm">
      <span className="font-medium min-w-24">{record.driverName}</span>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <span key={`${item.type}-${item.date}`} className="text-xs">
            {item.type}{' '}
            <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">{item.date}</span>
          </span>
        ))}
      </div>
    </div>
  )
}
