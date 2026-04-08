import { useState, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from 'react-aria-components'
import type { ARAgingBucket, ARAgingRow, InvoiceDispute } from '../../../types/finance'
import { ARKPIStrip } from './ARKPIStrip'
import { ARAgingTable } from './ARAgingTable'
import { ARDrillDown } from './ARDrillDown'
import { ARFilters } from './ARFilters'
import { CurrencyCell } from '../shared/CurrencyCell'
import { AgingBadge } from '../shared/AgingBadge'
import { DisputeList } from '../disputes/DisputeList'
import { useFinanceStore } from '../../../stores/finance'

interface DrillDownState {
  customerId: string
  bucket: ARAgingBucket
  customerName: string
}

type ActiveBucketFilter = ARAgingBucket | null

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

const AGING_SEGMENTS: { bucket: ARAgingBucket; field: keyof Pick<ARAgingRow, 'current' | 'days30' | 'days60' | 'days90' | 'days90plus'>; color: string }[] = [
  { bucket: 'current', field: 'current', color: 'bg-green-500' },
  { bucket: '1-30', field: 'days30', color: 'bg-yellow-500' },
  { bucket: '31-60', field: 'days60', color: 'bg-orange-500' },
  { bucket: '61-90', field: 'days90', color: 'bg-red-400' },
  { bucket: '90+', field: 'days90plus', color: 'bg-red-600' },
]

/**
 * AR Dashboard — "The Collections Desk"
 * Hero number + aging waterfall bar + KPI strip + filters + grouped list.
 */
export function ARDashboard() {
  const { t } = useTranslation('finance')
  const [drillDown, setDrillDown] = useState<DrillDownState | null>(null)
  const [activeBucketFilter, setActiveBucketFilter] = useState<ActiveBucketFilter>(null)
  const [showDisputes, setShowDisputes] = useState(false)
  const setSelectedDisputeId = useFinanceStore((s) => s.setSelectedDisputeId)

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
  }, [])

  // Compute aging totals for waterfall bar
  const agingTotals = useMemo(() => {
    const totals = { current: 0, days30: 0, days60: 0, days90: 0, days90plus: 0, total: 0 }
    for (const row of MOCK_ROWS) {
      totals.current += row.current
      totals.days30 += row.days30
      totals.days60 += row.days60
      totals.days90 += row.days90
      totals.days90plus += row.days90plus
      totals.total += row.total
    }
    return totals
  }, [])

  // Total overdue = everything past current
  const totalOverdue = agingTotals.days30 + agingTotals.days60 + agingTotals.days90 + agingTotals.days90plus

  // Filter rows by active bucket
  const filteredRows = useMemo(() => {
    if (!activeBucketFilter) return MOCK_ROWS
    const fieldMap: Record<ARAgingBucket, keyof ARAgingRow> = {
      'current': 'current',
      '1-30': 'days30',
      '31-60': 'days60',
      '61-90': 'days90',
      '90+': 'days90plus',
    }
    const field = fieldMap[activeBucketFilter]
    return MOCK_ROWS.filter((row) => (row[field] as number) > 0)
  }, [activeBucketFilter])

  // Handle waterfall bucket click — toggle filter
  const handleBucketClick = useCallback((bucket: ARAgingBucket) => {
    setActiveBucketFilter((prev) => prev === bucket ? null : bucket)
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
    <div className="flex flex-col gap-5 p-6">
      {/* Breadcrumb */}
      <nav className="text-xs text-black/40 dark:text-white/40 flex items-center gap-1.5">
        <button
          type="button"
          onClick={handleBack}
          className={drillDown ? 'hover:text-[#2563EB] cursor-pointer transition-colors' : 'text-black dark:text-white font-medium'}
        >
          {t('ar.breadcrumb.dashboard', 'Collections Desk')}
        </button>
        {drillDown && (
          <>
            <span className="text-black/15 dark:text-white/15">/</span>
            <span className="text-black dark:text-white font-medium">
              {bucketLabel(drillDown.bucket)} / {drillDown.customerName}
            </span>
          </>
        )}
      </nav>

      {/* Hero: Overdue amount as primary + Total outstanding secondary */}
      <div>
        {/* Overdue hero number — what the clerk cares about most */}
        {totalOverdue > 0 && (
          <div className="mb-4">
            <div className="text-[11px] uppercase tracking-wider text-red-500/60 mb-1">
              {t('ar.hero.totalOverdue', 'Total Overdue')}
            </div>
            <CurrencyCell amount={totalOverdue} className="text-5xl font-light text-red-600 dark:text-red-400" />
          </div>
        )}

        {/* Total outstanding — secondary */}
        <div className="mb-3">
          <div className="text-[11px] uppercase tracking-wider text-black/40 dark:text-white/40 mb-1">
            {t('ar.hero.totalOutstanding', 'Total Outstanding')}
          </div>
          <CurrencyCell amount={agingTotals.total} className={`${totalOverdue > 0 ? 'text-2xl' : 'text-5xl'} font-light`} />
        </div>

        {/* Aging waterfall bar — click a bucket to filter table below */}
        <div className="flex h-2 rounded-full overflow-hidden gap-px">
          {AGING_SEGMENTS.map((seg) => {
            const value = agingTotals[seg.field]
            const pct = agingTotals.total > 0 ? (value / agingTotals.total) * 100 : 0
            if (pct === 0) return null
            const isActive = activeBucketFilter === seg.bucket
            return (
              <button
                key={seg.bucket}
                type="button"
                onClick={() => handleBucketClick(seg.bucket)}
                className={`${seg.color} transition-all duration-300 cursor-pointer ${isActive ? 'ring-2 ring-offset-1 ring-black/20 dark:ring-white/20' : 'hover:opacity-80'}`}
                style={{ width: `${pct}%` }}
                title={`${seg.bucket}: ${pct.toFixed(1)}%`}
              />
            )
          })}
        </div>

        {/* Aging legend — clickable to filter */}
        <div className="flex items-center gap-4 mt-2">
          {AGING_SEGMENTS.map((seg) => {
            const value = agingTotals[seg.field]
            if (value === 0) return null
            const isActive = activeBucketFilter === seg.bucket
            return (
              <button
                key={seg.bucket}
                type="button"
                onClick={() => handleBucketClick(seg.bucket)}
                className={`flex items-center gap-1.5 cursor-pointer rounded-md px-1.5 py-0.5 transition-colors ${isActive ? 'bg-black/[0.06] dark:bg-white/[0.06]' : 'hover:bg-black/[0.03] dark:hover:bg-white/[0.03]'}`}
              >
                <span className={`size-2 rounded-full ${seg.color}`} />
                <AgingBadge bucket={seg.bucket} />
                <CurrencyCell amount={value} className="text-xs text-black/50 dark:text-white/50" />
              </button>
            )
          })}
          {activeBucketFilter && (
            <button
              type="button"
              onClick={() => setActiveBucketFilter(null)}
              className="text-[10px] text-[#2563EB] hover:underline underline-offset-2 ms-2"
            >
              {t('ar.clearFilter', 'Clear filter')}
            </button>
          )}
        </div>
      </div>

      {/* KPI Strip */}
      <ARKPIStrip {...MOCK_KPI} onCardClick={handleKPIClick} />

      {/* Filters (shown when not in drill-down) */}
      {!drillDown && <ARFilters />}

      {/* Main content: table or drill-down */}
      {drillDown ? (
        <ARDrillDown
          customerId={drillDown.customerId}
          bucket={drillDown.bucket}
          onBack={handleBack}
        />
      ) : (
        <div className="rounded-lg border border-black/10 dark:border-white/10 overflow-hidden">
          <ARAgingTable rows={filteredRows} onCellClick={handleCellClick} activeBucketFilter={activeBucketFilter} />
        </div>
      )}

      {/* Disputes section */}
      <div>
        <Button
          onPress={() => setShowDisputes((prev) => !prev)}
          className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-black/40 dark:text-white/40 cursor-pointer hover:text-black/60 dark:hover:text-white/60 transition-colors outline-none data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/40 rounded-md px-1 py-0.5"
        >
          <svg
            className={`size-3 transition-transform ${showDisputes ? 'rotate-90' : ''}`}
            viewBox="0 0 12 12"
            fill="none"
            aria-hidden="true"
          >
            <path d="M4 2L8 6L4 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {t('ar.disputes', 'Disputed Invoices')}
        </Button>
        {showDisputes && (
          <div className="mt-3">
            <DisputeList
              onSelectDispute={setSelectedDisputeId}
              onCreateDispute={() => {}}
            />
          </div>
        )}
      </div>
    </div>
  )
}
