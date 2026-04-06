/**
 * Driver profile card — header + two-column layout (compliance + performance).
 * Bottom: recent deliveries list.
 * CONTRACTED drivers: weekly invoicing status + 5% withholding tax note.
 * ON_DEMAND drivers: claim history + payout totals.
 */
import { useTranslation } from 'react-i18next'
import { ComplianceStatus } from './ComplianceStatus'
import { PerformanceMetrics } from './PerformanceMetrics'
import type { Driver, ComplianceItem, DriverPerformance } from '../../../types/dispatch'

interface DriverProfileCardProps {
  driver: Driver
  performance: DriverPerformance | null
  onBack: () => void
}

// Generate compliance items from driver data
function buildComplianceItems(driver: Driver): ComplianceItem[] {
  const items: ComplianceItem[] = [
    {
      type: 'license',
      label: 'Professional License',
      expiryDate: driver.licenseExpiry,
      status: getItemStatus(driver.licenseExpiry),
    },
    {
      type: 'medical',
      label: 'Medical Card',
      expiryDate: driver.medicalExpiry,
      status: getItemStatus(driver.medicalExpiry),
    },
    {
      type: 'drug_test',
      label: 'Drug Test',
      expiryDate: addMonths(new Date(), 2).toISOString().split('T')[0]!,
      status: 'valid',
    },
  ]

  if (driver.certifications.includes('moffett')) {
    items.push({
      type: 'moffett',
      label: 'Moffett Certification',
      expiryDate: addMonths(new Date(), 8).toISOString().split('T')[0]!,
      status: 'valid',
    })
  }

  if (driver.certifications.includes('crane')) {
    items.push({
      type: 'crane',
      label: 'Crane Certification',
      expiryDate: addMonths(new Date(), 4).toISOString().split('T')[0]!,
      status: 'valid',
    })
  }

  if (driver.type === 'CONTRACTED') {
    items.push({
      type: 'insurance',
      label: 'Insurance Verification (Monthly)',
      expiryDate: addMonths(new Date(), 1).toISOString().split('T')[0]!,
      status: 'valid',
    })
  }

  return items
}

function getItemStatus(expiryDate: string): 'valid' | 'expiring' | 'expired' {
  const days = Math.ceil((new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  if (days <= 0) return 'expired'
  if (days <= 30) return 'expiring'
  return 'valid'
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date)
  d.setMonth(d.getMonth() + months)
  return d
}

// Mock recent deliveries
const MOCK_RECENT_DELIVERIES = [
  { id: 'del-001', orderId: 'ORD-4521', customer: 'Cairo Construction Co.', date: '2026-04-05', status: 'delivered' },
  { id: 'del-006', orderId: 'ORD-4530', customer: 'Heliopolis Marble & Granite', date: '2026-04-05', status: 'delivered' },
  { id: 'del-010', orderId: 'ORD-4538', customer: 'Shoubra El-Kheima Hardware', date: '2026-04-04', status: 'delivered' },
  { id: 'del-015', orderId: 'ORD-4545', customer: 'Giza Contractors Ltd.', date: '2026-04-04', status: 'delivered' },
  { id: 'del-018', orderId: 'ORD-4550', customer: 'New Cairo Villas Project', date: '2026-04-03', status: 'delivered' },
]

const TYPE_BADGES: Record<string, { label: string; className: string }> = {
  INTERNAL: { label: 'Internal', className: 'bg-[#2563EB]/10 text-[#2563EB]' },
  CONTRACTED: { label: 'Contracted', className: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' },
  ON_DEMAND: { label: 'On-Demand', className: 'bg-black/5 dark:bg-white/5 text-black/60 dark:text-white/60' },
}

export function DriverProfileCard({ driver, performance, onBack }: DriverProfileCardProps) {
  const { t } = useTranslation('dispatch')
  const complianceItems = buildComplianceItems(driver)
  const badge = TYPE_BADGES[driver.type] ?? TYPE_BADGES.INTERNAL!

  return (
    <div className="flex flex-col h-full">
      {/* Back button */}
      <div className="px-6 py-3 border-b border-black/10 dark:border-white/10">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition-colors"
        >
          <svg className="w-4 h-4 rtl:rotate-180" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" />
          </svg>
          {t('driver.backToList', 'Back to driver list')}
        </button>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Header */}
        <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 backdrop-blur-sm p-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold">{driver.name}</h3>
              <div className="flex items-center gap-3 mt-1">
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}>
                  {t(`driver.type.${driver.type}`, badge.label)}
                </span>
                <span className="text-sm text-black/50 dark:text-white/50">{driver.phone}</span>
              </div>
            </div>
            <div className="text-end">
              <span className="text-xs text-black/50 dark:text-white/50 block">
                {t('driver.vehicle', 'Vehicle')}
              </span>
              <span className="text-sm">
                {driver.vehicleId ?? t('driver.noVehicle', 'Unassigned')}
              </span>
            </div>
          </div>
        </div>

        {/* Two-column: Compliance + Performance */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 backdrop-blur-sm p-4">
            <ComplianceStatus items={complianceItems} />
          </div>
          <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 backdrop-blur-sm p-4">
            <PerformanceMetrics performance={performance} />
          </div>
        </div>

        {/* Type-specific sections */}
        {driver.type === 'CONTRACTED' && (
          <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 backdrop-blur-sm p-4">
            <h4 className="text-sm font-semibold mb-3">{t('driver.contracted.title', 'Contractor Details')}</h4>
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-black/60 dark:text-white/60">{t('driver.contracted.invoicing', 'Weekly Invoicing')}</span>
                <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-green-600 dark:text-green-400">
                  {t('driver.contracted.upToDate', 'Up to date')}
                </span>
              </div>
              <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/30 px-3 py-2">
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  {t('driver.contracted.withholdingNote', '5% withholding tax applies to all contractor payments per Egyptian tax regulations.')}
                </p>
              </div>
            </div>
          </div>
        )}

        {driver.type === 'ON_DEMAND' && (
          <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 backdrop-blur-sm p-4">
            <h4 className="text-sm font-semibold mb-3">{t('driver.onDemand.title', 'On-Demand Details')}</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-xs text-black/50 dark:text-white/50 block mb-1">{t('driver.onDemand.claims', 'Total Claims')}</span>
                <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-lg">12</span>
              </div>
              <div>
                <span className="text-xs text-black/50 dark:text-white/50 block mb-1">{t('driver.onDemand.payouts', 'Total Payouts')}</span>
                <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-lg">EGP 18,500</span>
              </div>
            </div>
          </div>
        )}

        {/* Recent deliveries */}
        <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 backdrop-blur-sm p-4">
          <h4 className="text-sm font-semibold mb-3">{t('driver.recentDeliveries', 'Recent Deliveries')}</h4>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/10 dark:border-white/10">
                <th className="py-2 text-start text-xs text-black/50 dark:text-white/50 font-medium">{t('driver.table.order', 'Order')}</th>
                <th className="py-2 text-start text-xs text-black/50 dark:text-white/50 font-medium">{t('driver.table.customer', 'Customer')}</th>
                <th className="py-2 text-start text-xs text-black/50 dark:text-white/50 font-medium">{t('driver.table.date', 'Date')}</th>
                <th className="py-2 text-start text-xs text-black/50 dark:text-white/50 font-medium">{t('driver.table.status', 'Status')}</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_RECENT_DELIVERIES.map((del) => (
                <tr key={del.id} className="border-b border-black/5 dark:border-white/5">
                  <td className="py-2 font-[family-name:var(--font-geist-mono)] tabular-nums">{del.orderId}</td>
                  <td className="py-2 text-black/60 dark:text-white/60">{del.customer}</td>
                  <td className="py-2 font-[family-name:var(--font-geist-mono)] tabular-nums">{del.date}</td>
                  <td className="py-2">
                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                      {t('driver.status.delivered', 'Delivered')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
