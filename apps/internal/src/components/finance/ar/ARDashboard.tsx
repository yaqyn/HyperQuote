import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import type { ARAgingBucket, ARAgingRow } from '../../../types/finance'
import { ARKPIStrip } from './ARKPIStrip'
import { ARAgingTable } from './ARAgingTable'

interface DrillDownState {
  customerId: string
  bucket: ARAgingBucket
  customerName: string
}

// Mock KPI data (will be replaced by server function in future)
const MOCK_KPI = {
  totalOutstanding: 5_460_000,
  dso: 42,
  dsoPrior: 45,
  cei: 87,
  overdueAmount: 695_000,
  overdueThreshold: 500_000,
  currentCollections: 3_200_000,
  collectionsTarget: 4_000_000,
}

// Mock aging data from server function
const MOCK_ROWS: ARAgingRow[] = [
  {
    customerId: 'cust-001', customerName: 'Cairo Construction Co.', tierBadge: 'Tier 3',
    current: 850_000, days30: 420_000, days60: 180_000, days90: 0, days90plus: 0,
    total: 1_450_000, sparklineData: [1_200_000, 1_350_000, 1_100_000, 1_450_000, 1_300_000, 1_450_000],
    salesRep: 'Ahmed Mostafa',
  },
  {
    customerId: 'cust-002', customerName: 'Delta Building Materials', tierBadge: 'Tier 2',
    current: 320_000, days30: 150_000, days60: 95_000, days90: 45_000, days90plus: 120_000,
    total: 730_000, sparklineData: [500_000, 550_000, 600_000, 680_000, 710_000, 730_000],
    salesRep: 'Mohamed Ibrahim',
  },
  {
    customerId: 'cust-003', customerName: 'Nile Development Group', tierBadge: 'Tier 4',
    current: 1_200_000, days30: 800_000, days60: 0, days90: 0, days90plus: 0,
    total: 2_000_000, sparklineData: [1_800_000, 1_900_000, 2_100_000, 1_950_000, 2_000_000, 2_000_000],
    salesRep: 'Youssef Hassan',
  },
  {
    customerId: 'cust-004', customerName: 'Upper Egypt Contractors', tierBadge: 'Tier 1',
    current: 0, days30: 0, days60: 0, days90: 180_000, days90plus: 350_000,
    total: 530_000, sparklineData: [400_000, 420_000, 480_000, 500_000, 520_000, 530_000],
    salesRep: 'Ahmed Mostafa',
  },
  {
    customerId: 'cust-005', customerName: 'Alexandria Real Estate', tierBadge: 'Tier 3',
    current: 450_000, days30: 200_000, days60: 100_000, days90: 0, days90plus: 0,
    total: 750_000, sparklineData: [600_000, 650_000, 700_000, 720_000, 740_000, 750_000],
    salesRep: 'Sara Ahmed',
  },
]

/**
 * AR Dashboard combining KPI strip, filters, and aging table.
 * When drillDown state is set (from cell click), renders ARDrillDown instead of table.
 * Breadcrumb navigation: "AR Dashboard > 61-90 Days > [Customer Name]"
 */
export function ARDashboard() {
  const { t } = useTranslation('finance')
  const [drillDown, setDrillDown] = useState<DrillDownState | null>(null)

  const handleCellClick = useCallback(
    (customerId: string, bucket: ARAgingBucket) => {
      const customer = MOCK_ROWS.find((r) => r.customerId === customerId)
      if (customer) {
        setDrillDown({ customerId, bucket, customerName: customer.customerName })
      }
    },
    [],
  )

  const handleBack = useCallback(() => {
    setDrillDown(null)
  }, [])

  const handleKPIClick = useCallback((_metric: string) => {
    // KPI card click could pre-filter the table
    // For now, just scroll to table
  }, [])

  // Bucket label for breadcrumb
  const bucketLabel = (bucket: ARAgingBucket): string => {
    const labels: Record<ARAgingBucket, string> = {
      current: t('ar.bucket.current', 'Current'),
      '1-30': t('ar.bucket.1-30', '1-30 Days'),
      '31-60': t('ar.bucket.31-60', '31-60 Days'),
      '61-90': t('ar.bucket.61-90', '61-90 Days'),
      '90+': t('ar.bucket.90+', '90+ Days'),
    }
    return labels[bucket]
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      {/* Breadcrumb */}
      <nav className="text-xs text-black/50 dark:text-white/50 flex items-center gap-1">
        <button
          type="button"
          onClick={handleBack}
          className={drillDown ? 'hover:text-[#2563EB] cursor-pointer' : 'font-medium text-black dark:text-white'}
        >
          {t('ar.breadcrumb.dashboard', 'AR Dashboard')}
        </button>
        {drillDown && (
          <>
            <span>&gt;</span>
            <span className="font-medium text-black dark:text-white">
              {bucketLabel(drillDown.bucket)} &gt; {drillDown.customerName}
            </span>
          </>
        )}
      </nav>

      {/* KPI Strip */}
      <ARKPIStrip {...MOCK_KPI} onCardClick={handleKPIClick} />

      {/* Main content: table or drill-down */}
      {drillDown ? (
        <DrillDownPlaceholder
          customerId={drillDown.customerId}
          customerName={drillDown.customerName}
          bucket={drillDown.bucket}
          onBack={handleBack}
        />
      ) : (
        <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 backdrop-blur-sm overflow-hidden">
          <ARAgingTable rows={MOCK_ROWS} onCellClick={handleCellClick} />
        </div>
      )}
    </div>
  )
}

/**
 * Temporary placeholder for drill-down view.
 * Will be replaced by ARDrillDown component in Task 2.
 */
function DrillDownPlaceholder({
  customerName,
  bucket,
  onBack,
}: {
  customerId: string
  customerName: string
  bucket: ARAgingBucket
  onBack: () => void
}) {
  const { t } = useTranslation('finance')

  return (
    <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 backdrop-blur-sm p-6 text-center">
      <p className="text-black/60 dark:text-white/60">
        {t('ar.drillDown.placeholder', 'Drill-down view for {{customer}} - {{bucket}}', {
          customer: customerName,
          bucket,
        })}
      </p>
      <button
        type="button"
        onClick={onBack}
        className="mt-3 px-3 py-1 text-sm rounded border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5"
      >
        {t('ar.drillDown.back', 'Back to AR Dashboard')}
      </button>
    </div>
  )
}
