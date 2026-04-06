import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from 'react-aria-components'
import type { CreditProfile } from '../../../types/finance'
import { CurrencyCell } from '../shared/CurrencyCell'
import { UtilizationBar } from '../shared/UtilizationBar'
import { CreditProfileCard } from './CreditProfileCard'
import { CreditHoldPanel } from './CreditHoldPanel'

// ─── Mock Data ──────────────────────────────────────────

const MOCK_PROFILES: CreditProfile[] = [
  {
    customerId: 'cust-001', customerName: 'Cairo Construction Co.', tier: 3,
    creditLimit: 2_000_000, currentExposure: 1_450_000, utilizationPct: 72.5,
    availableCredit: 550_000, overdueAmount: 180_000, paymentScore: 78,
    avgDaysToPay: 28, bouncedCheques12mo: 0, lastPaymentDate: '2026-03-28',
    isOnHold: false, holdReasons: [],
  },
  {
    customerId: 'cust-002', customerName: 'Delta Building Materials', tier: 2,
    creditLimit: 1_000_000, currentExposure: 730_000, utilizationPct: 73,
    availableCredit: 270_000, overdueAmount: 260_000, paymentScore: 62,
    avgDaysToPay: 38, bouncedCheques12mo: 0, lastPaymentDate: '2026-03-15',
    isOnHold: false, holdReasons: [],
  },
  {
    customerId: 'cust-003', customerName: 'Nile Steel Trading', tier: 4,
    creditLimit: 5_000_000, currentExposure: 2_100_000, utilizationPct: 42,
    availableCredit: 2_900_000, overdueAmount: 0, paymentScore: 91,
    avgDaysToPay: 18, bouncedCheques12mo: 0, lastPaymentDate: '2026-04-01',
    isOnHold: false, holdReasons: [],
  },
  {
    customerId: 'cust-004', customerName: 'Upper Egypt Contractors', tier: 5,
    creditLimit: 500_000, currentExposure: 530_000, utilizationPct: 106,
    availableCredit: -30_000, overdueAmount: 530_000, paymentScore: 22,
    avgDaysToPay: 75, bouncedCheques12mo: 2, lastPaymentDate: '2025-12-10',
    isOnHold: true, holdReasons: ['limit_exceeded', 'overdue_30', 'bounced_cheque'],
  },
  {
    customerId: 'cust-005', customerName: 'Alexandria Cement Works', tier: 1,
    creditLimit: 300_000, currentExposure: 0, utilizationPct: 0,
    availableCredit: 300_000, overdueAmount: 0, paymentScore: 50,
    avgDaysToPay: 0, bouncedCheques12mo: 0, lastPaymentDate: '',
    isOnHold: false, holdReasons: [],
  },
  {
    customerId: 'cust-006', customerName: 'Red Sea Builders', tier: 3,
    creditLimit: 1_500_000, currentExposure: 1_410_000, utilizationPct: 94,
    availableCredit: 90_000, overdueAmount: 320_000, paymentScore: 55,
    avgDaysToPay: 42, bouncedCheques12mo: 0, lastPaymentDate: '2026-03-20',
    isOnHold: false, holdReasons: [],
  },
]

const TIER_COLORS: Record<number, string> = {
  1: 'bg-green-500/20 text-green-700 dark:text-green-400',
  2: 'bg-blue-500/20 text-blue-700 dark:text-blue-400',
  3: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400',
  4: 'bg-purple-500/20 text-purple-700 dark:text-purple-400',
  5: 'bg-red-500/20 text-red-700 dark:text-red-400',
}

type FilterTier = 'all' | '1' | '2' | '3' | '4' | '5'
type FilterHold = 'all' | 'on_hold' | 'active'
type SortField = 'customerName' | 'utilizationPct' | 'paymentScore' | 'creditLimit'

/**
 * Credit management dashboard.
 * Summary cards at top, customer table with filters, detail view on row click.
 */
export function CreditDashboard() {
  const { t } = useTranslation('finance')

  const [selectedProfile, setSelectedProfile] = useState<CreditProfile | null>(null)
  const [showHoldPanel, setShowHoldPanel] = useState(false)
  const [filterTier, setFilterTier] = useState<FilterTier>('all')
  const [filterHold, setFilterHold] = useState<FilterHold>('all')
  const [sortField, setSortField] = useState<SortField>('customerName')

  // Compute summary stats
  const totalCreditExtended = MOCK_PROFILES.reduce((sum, p) => sum + p.currentExposure, 0)
  const totalCreditLimit = MOCK_PROFILES.reduce((sum, p) => sum + p.creditLimit, 0)
  const totalUtilization = totalCreditLimit > 0 ? (totalCreditExtended / totalCreditLimit) * 100 : 0
  const customersOnHold = MOCK_PROFILES.filter((p) => p.isOnHold).length
  const avgPaymentScore =
    MOCK_PROFILES.length > 0
      ? Math.round(MOCK_PROFILES.reduce((sum, p) => sum + p.paymentScore, 0) / MOCK_PROFILES.length)
      : 0

  // Filter
  const filtered = MOCK_PROFILES.filter((p) => {
    if (filterTier !== 'all' && p.tier !== Number(filterTier)) return false
    if (filterHold === 'on_hold' && !p.isOnHold) return false
    if (filterHold === 'active' && p.isOnHold) return false
    return true
  })

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    switch (sortField) {
      case 'customerName':
        return a.customerName.localeCompare(b.customerName)
      case 'utilizationPct':
        return b.utilizationPct - a.utilizationPct
      case 'paymentScore':
        return b.paymentScore - a.paymentScore
      case 'creditLimit':
        return b.creditLimit - a.creditLimit
      default:
        return 0
    }
  })

  // Detail view
  if (selectedProfile) {
    return (
      <div className="p-6 space-y-4">
        <Button
          onPress={() => {
            setSelectedProfile(null)
            setShowHoldPanel(false)
          }}
          className="text-xs text-[#2563EB] hover:underline mb-2"
        >
          {t('credit.backToList', '\u2190 Back to Credit Dashboard')}
        </Button>

        <CreditProfileCard
          profile={selectedProfile}
          onHoldOrders={() => setShowHoldPanel(true)}
          onAdjustLimit={() => {
            /* Opens CreditReviewModal - wired in Task 2 */
          }}
          onReview={() => {
            /* Opens CreditReviewModal - wired in Task 2 */
          }}
        />

        {showHoldPanel && (
          <CreditHoldPanel
            profile={selectedProfile}
            onRelease={() => {
              /* Release with approval */
            }}
            onReleaseOneTime={() => {
              /* Release one-time */
            }}
            onEscalate={() => {
              /* Escalate to CFO */
            }}
          />
        )}
      </div>
    )
  }

  return (
    <div className="p-6 space-y-5">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 backdrop-blur-sm p-4">
          <div className="text-xs text-black/50 dark:text-white/50 mb-1">
            {t('credit.totalCreditExtended', 'Total Credit Extended')}
          </div>
          <CurrencyCell amount={totalCreditExtended} className="text-lg" />
        </div>
        <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 backdrop-blur-sm p-4">
          <div className="text-xs text-black/50 dark:text-white/50 mb-1">
            {t('credit.totalUtilization', 'Total Utilization')}
          </div>
          <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-lg">
            {Math.round(totalUtilization)}%
          </span>
        </div>
        <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 backdrop-blur-sm p-4">
          <div className="text-xs text-black/50 dark:text-white/50 mb-1">
            {t('credit.customersOnHold', 'Customers on Hold')}
          </div>
          <span
            className={`font-[family-name:var(--font-geist-mono)] tabular-nums text-lg ${customersOnHold > 0 ? 'text-red-600 dark:text-red-400' : ''}`}
          >
            {customersOnHold}
          </span>
        </div>
        <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 backdrop-blur-sm p-4">
          <div className="text-xs text-black/50 dark:text-white/50 mb-1">
            {t('credit.avgPaymentScore', 'Avg Payment Score')}
          </div>
          <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-lg">
            {avgPaymentScore}
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={filterTier}
          onChange={(e) => setFilterTier(e.target.value as FilterTier)}
          className="text-xs rounded-lg border border-black/10 dark:border-white/10 bg-white/80 dark:bg-black/80 px-2 py-1.5"
        >
          <option value="all">{t('credit.allTiers', 'All Tiers')}</option>
          <option value="1">{t('credit.tier1', 'Tier 1 - New')}</option>
          <option value="2">{t('credit.tier2', 'Tier 2 - Developing')}</option>
          <option value="3">{t('credit.tier3', 'Tier 3 - Established')}</option>
          <option value="4">{t('credit.tier4', 'Tier 4 - Strategic')}</option>
          <option value="5">{t('credit.tier5', 'Tier 5 - Flagged')}</option>
        </select>
        <select
          value={filterHold}
          onChange={(e) => setFilterHold(e.target.value as FilterHold)}
          className="text-xs rounded-lg border border-black/10 dark:border-white/10 bg-white/80 dark:bg-black/80 px-2 py-1.5"
        >
          <option value="all">{t('credit.allStatuses', 'All Statuses')}</option>
          <option value="on_hold">{t('credit.onHold', 'On Hold')}</option>
          <option value="active">{t('credit.active', 'Active')}</option>
        </select>
        <select
          value={sortField}
          onChange={(e) => setSortField(e.target.value as SortField)}
          className="text-xs rounded-lg border border-black/10 dark:border-white/10 bg-white/80 dark:bg-black/80 px-2 py-1.5"
        >
          <option value="customerName">{t('credit.sortName', 'Sort: Name')}</option>
          <option value="utilizationPct">{t('credit.sortUtilization', 'Sort: Utilization')}</option>
          <option value="paymentScore">{t('credit.sortScore', 'Sort: Payment Score')}</option>
          <option value="creditLimit">{t('credit.sortLimit', 'Sort: Credit Limit')}</option>
        </select>
      </div>

      {/* Customer Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black/10 dark:border-white/10 text-xs text-black/50 dark:text-white/50">
              <th className="text-start py-2 pe-3 font-medium">
                {t('credit.customerName', 'Customer Name')}
              </th>
              <th className="text-center py-2 pe-3 font-medium">{t('credit.tier', 'Tier')}</th>
              <th className="text-end py-2 pe-3 font-medium">
                {t('credit.creditLimit', 'Credit Limit')}
              </th>
              <th className="py-2 pe-3 font-medium min-w-[120px]">
                {t('credit.utilization', 'Utilization')}
              </th>
              <th className="text-end py-2 pe-3 font-medium">
                {t('credit.available', 'Available')}
              </th>
              <th className="text-center py-2 pe-3 font-medium">
                {t('credit.score', 'Score')}
              </th>
              <th className="text-center py-2 font-medium">{t('credit.status', 'Status')}</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((profile) => (
              <tr
                key={profile.customerId}
                onClick={() => setSelectedProfile(profile)}
                className={`border-b border-black/5 dark:border-white/5 cursor-pointer hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-colors ${
                  profile.isOnHold ? 'bg-red-500/5' : ''
                }`}
              >
                <td className="py-2.5 pe-3 font-medium">{profile.customerName}</td>
                <td className="py-2.5 pe-3 text-center">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${TIER_COLORS[profile.tier] ?? ''}`}
                  >
                    {profile.tier}
                  </span>
                </td>
                <td className="py-2.5 pe-3 text-end">
                  <CurrencyCell amount={profile.creditLimit} className="text-sm" />
                </td>
                <td className="py-2.5 pe-3">
                  <UtilizationBar percentage={profile.utilizationPct} />
                </td>
                <td className="py-2.5 pe-3 text-end">
                  <CurrencyCell amount={profile.availableCredit} className="text-sm" />
                </td>
                <td className="py-2.5 pe-3 text-center">
                  <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">
                    {profile.paymentScore}
                  </span>
                </td>
                <td className="py-2.5 text-center">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      profile.isOnHold
                        ? 'bg-red-500/20 text-red-700 dark:text-red-400'
                        : 'bg-green-500/20 text-green-700 dark:text-green-400'
                    }`}
                  >
                    {profile.isOnHold ? t('credit.holdLabel', 'On Hold') : t('credit.activeLabel', 'Active')}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
