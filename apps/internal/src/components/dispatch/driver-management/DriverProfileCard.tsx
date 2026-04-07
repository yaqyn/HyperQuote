/**
 * Driver profile — header with initials circle + vehicle info.
 * Below: horizontal metrics strip, compliance checklist, type-specific sections.
 */
import { useTranslation } from 'react-i18next'
import { ComplianceStatus } from './ComplianceStatus'
import { PerformanceMetrics } from './PerformanceMetrics'
import type { Driver, ComplianceItem, DriverPerformance } from '../../../types/dispatch'

interface DriverProfileCardProps {
  driver: Driver
  performance: DriverPerformance | null
}

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
      label: 'Insurance (Monthly)',
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

const MOCK_RECENT_DELIVERIES = [
  { id: 'del-001', orderId: 'ORD-4521', customer: 'Cairo Construction Co.', date: '2026-04-05', status: 'delivered' },
  { id: 'del-006', orderId: 'ORD-4530', customer: 'Heliopolis Marble & Granite', date: '2026-04-05', status: 'delivered' },
  { id: 'del-010', orderId: 'ORD-4538', customer: 'Shoubra El-Kheima Hardware', date: '2026-04-04', status: 'delivered' },
  { id: 'del-015', orderId: 'ORD-4545', customer: 'Giza Contractors Ltd.', date: '2026-04-04', status: 'delivered' },
  { id: 'del-018', orderId: 'ORD-4550', customer: 'New Cairo Villas Project', date: '2026-04-03', status: 'delivered' },
]

const TYPE_LABELS: Record<string, string> = {
  INTERNAL: 'Internal',
  CONTRACTED: 'Contracted',
  ON_DEMAND: 'On-Demand',
}

export function DriverProfileCard({ driver, performance }: DriverProfileCardProps) {
  const { t } = useTranslation('dispatch')
  const complianceItems = buildComplianceItems(driver)
  const initials = driver.name.split(' ').map((n) => n[0]).join('').slice(0, 2)

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Profile header */}
      <div className="flex items-start gap-4">
        {/* Initials circle */}
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-black/[0.06] text-lg font-semibold text-black/50 dark:bg-white/[0.06] dark:text-white/50">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-semibold text-black dark:text-white">{driver.name}</h3>
          <div className="mt-1 flex items-center gap-3 text-sm text-black/50 dark:text-white/50">
            <span>{t(`driver.type.${driver.type}`, TYPE_LABELS[driver.type] ?? driver.type)}</span>
            <span>&middot;</span>
            <span>{driver.phone}</span>
          </div>
        </div>
        <div className="text-end">
          <span className="text-[11px] text-black/40 dark:text-white/40">
            {t('driver.vehicle', 'Vehicle')}
          </span>
          <p className="font-[family-name:var(--font-geist-mono)] text-sm tabular-nums">
            {driver.vehicleId ?? t('driver.noVehicle', 'Unassigned')}
          </p>
        </div>
      </div>

      {/* Performance metrics — horizontal strip */}
      <PerformanceMetrics performance={performance} />

      {/* Compliance */}
      <div className="rounded-xl border border-black/[0.06] bg-white/60 p-4 backdrop-blur-sm dark:border-white/[0.06] dark:bg-black/60">
        <ComplianceStatus items={complianceItems} />
      </div>

      {/* Type-specific sections */}
      {driver.type === 'CONTRACTED' && (
        <div className="rounded-xl border border-black/[0.06] bg-white/60 p-4 backdrop-blur-sm dark:border-white/[0.06] dark:bg-black/60">
          <h4 className="mb-3 text-xs font-medium uppercase tracking-wider text-black/40 dark:text-white/40">
            {t('driver.contracted.title', 'Contractor Details')}
          </h4>
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-black/60 dark:text-white/60">{t('driver.contracted.invoicing', 'Weekly Invoicing')}</span>
              <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-green-600 dark:text-green-400">
                {t('driver.contracted.upToDate', 'Up to date')}
              </span>
            </div>
            <div className="rounded-lg bg-amber-50/60 px-3 py-2 dark:bg-amber-900/10">
              <p className="text-xs text-amber-700 dark:text-amber-400">
                {t('driver.contracted.withholdingNote', '5% withholding tax applies to all contractor payments per Egyptian tax regulations.')}
              </p>
            </div>
          </div>
        </div>
      )}

      {driver.type === 'ON_DEMAND' && (
        <div className="rounded-xl border border-black/[0.06] bg-white/60 p-4 backdrop-blur-sm dark:border-white/[0.06] dark:bg-black/60">
          <h4 className="mb-3 text-xs font-medium uppercase tracking-wider text-black/40 dark:text-white/40">
            {t('driver.onDemand.title', 'On-Demand Details')}
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-[11px] text-black/40 dark:text-white/40">{t('driver.onDemand.claims', 'Total Claims')}</span>
              <p className="font-[family-name:var(--font-geist-mono)] text-2xl tabular-nums">12</p>
            </div>
            <div>
              <span className="text-[11px] text-black/40 dark:text-white/40">{t('driver.onDemand.payouts', 'Total Payouts')}</span>
              <p className="font-[family-name:var(--font-geist-mono)] text-2xl tabular-nums">EGP 18,500</p>
            </div>
          </div>
        </div>
      )}

      {/* Recent deliveries */}
      <div className="rounded-xl border border-black/[0.06] bg-white/60 p-4 backdrop-blur-sm dark:border-white/[0.06] dark:bg-black/60">
        <h4 className="mb-3 text-xs font-medium uppercase tracking-wider text-black/40 dark:text-white/40">
          {t('driver.recentDeliveries', 'Recent Deliveries')}
        </h4>
        <div className="flex flex-col">
          {MOCK_RECENT_DELIVERIES.map((del) => (
            <div
              key={del.id}
              className="flex items-center gap-3 border-b border-black/[0.04] py-2.5 last:border-0 dark:border-white/[0.04]"
            >
              <span className="font-[family-name:var(--font-geist-mono)] text-xs tabular-nums text-[#2563EB]">
                {del.orderId}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm text-black/60 dark:text-white/60">
                {del.customer}
              </span>
              <span className="font-[family-name:var(--font-geist-mono)] text-[11px] tabular-nums text-black/40 dark:text-white/40">
                {del.date}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
