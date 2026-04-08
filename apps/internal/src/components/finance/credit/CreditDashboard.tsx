import { useState, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from 'react-aria-components'
import type { CreditProfile } from '../../../types/finance'
import { CurrencyCell } from '../shared/CurrencyCell'
import { CreditProfileCard } from './CreditProfileCard'
import { CreditHoldPanel } from './CreditHoldPanel'
import { toggleCreditHold } from '../../../lib/server/finance-credit'

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

// ─── Risk matrix helpers ────────────────────────────────

/** Map utilization % to a 0-100 x position */
function toX(utilizationPct: number): number {
  return Math.min(Math.max(utilizationPct, 0), 120) / 1.2
}

/** Map inverse payment score to a 0-100 y position (higher = riskier = top) */
function toY(paymentScore: number): number {
  return 100 - paymentScore
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-600 dark:text-green-400'
  if (score >= 50) return 'text-black/50 dark:text-white/50'
  return 'text-red-600 dark:text-red-400'
}

function getRiskDot(profile: CreditProfile): string {
  if (profile.isOnHold) return 'bg-red-500'
  if (profile.utilizationPct > 90 || profile.paymentScore < 50) return 'bg-red-500/70'
  if (profile.utilizationPct > 70 || profile.paymentScore < 70) return 'bg-yellow-500'
  return 'bg-green-500'
}

type SortField = 'customerName' | 'utilizationPct' | 'paymentScore' | 'creditLimit'

/**
 * "The Risk Desk" — Credit management dashboard.
 * Risk matrix at top (CSS grid scatter, NOT chart library), customer list below.
 * Click to drill into CreditProfileCard.
 */
export function CreditDashboard() {
  const { t } = useTranslation('finance')

  const [profiles, setProfiles] = useState(MOCK_PROFILES)
  const [selectedProfile, setSelectedProfile] = useState<CreditProfile | null>(null)
  const [showHoldPanel, setShowHoldPanel] = useState(false)
  const [sortField, setSortField] = useState<SortField>('utilizationPct')
  const [showOnHoldOnly, setShowOnHoldOnly] = useState(false)
  const [holdLoading, setHoldLoading] = useState<string | null>(null)

  const handleToggleHold = useCallback(async (profile: CreditProfile, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setHoldLoading(profile.customerId)
    const action = profile.isOnHold ? 'release' : 'hold'
    const reason = action === 'hold' ? 'Manual hold by finance team' : 'Released by finance team'
    try {
      const result = await toggleCreditHold({ data: { customerId: profile.customerId, action, reason } })
      if (result.success) {
        setProfiles((prev) =>
          prev.map((p) =>
            p.customerId === profile.customerId
              ? { ...p, isOnHold: result.isOnHold, holdReasons: result.isOnHold ? [...p.holdReasons, 'manual_hold'] : [] }
              : p,
          ),
        )
        if (selectedProfile?.customerId === profile.customerId) {
          setSelectedProfile((prev) => prev ? { ...prev, isOnHold: result.isOnHold, holdReasons: result.isOnHold ? [...prev.holdReasons, 'manual_hold'] : [] } : prev)
        }
      }
    } finally {
      setHoldLoading(null)
    }
  }, [selectedProfile])

  // Summary stats
  const totalExposure = profiles.reduce((sum, p) => sum + p.currentExposure, 0)
  const totalLimit = profiles.reduce((sum, p) => sum + p.creditLimit, 0)
  const utilization = totalLimit > 0 ? (totalExposure / totalLimit) * 100 : 0
  const onHoldCount = profiles.filter((p) => p.isOnHold).length
  const avgScore = profiles.length > 0
    ? Math.round(profiles.reduce((sum, p) => sum + p.paymentScore, 0) / profiles.length)
    : 0

  // Filter & sort — on-hold customers ALWAYS float to top
  const filtered = useMemo(() => {
    let list = showOnHoldOnly ? profiles.filter((p) => p.isOnHold) : profiles
    return [...list].sort((a, b) => {
      // On-hold always first
      if (a.isOnHold !== b.isOnHold) return a.isOnHold ? -1 : 1
      switch (sortField) {
        case 'customerName': return a.customerName.localeCompare(b.customerName)
        case 'utilizationPct': return b.utilizationPct - a.utilizationPct
        case 'paymentScore': return a.paymentScore - b.paymentScore
        case 'creditLimit': return b.creditLimit - a.creditLimit
        default: return 0
      }
    })
  }, [profiles, sortField, showOnHoldOnly])

  // Detail view
  if (selectedProfile) {
    return (
      <div className="space-y-0">
        <div className="flex items-center px-5 py-3 border-b border-black/[0.06] dark:border-white/[0.06]">
          <Button
            onPress={() => { setSelectedProfile(null); setShowHoldPanel(false) }}
            className="text-xs text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors"
          >
            {t('credit.backToList', 'Back')}
          </Button>
        </div>
        <div className="p-5 space-y-4">
          <CreditProfileCard
            profile={selectedProfile}
            onHoldOrders={() => setShowHoldPanel(true)}
            onAdjustLimit={() => {}}
            onReview={() => {}}
          />
          {showHoldPanel && (
            <CreditHoldPanel
              profile={selectedProfile}
              onRelease={() => handleToggleHold(selectedProfile)}
              onReleaseOneTime={() => handleToggleHold(selectedProfile)}
              onEscalate={() => {}}
            />
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-0">
      {/* ─── On-hold alert banner ──────────────────────── */}
      {onHoldCount > 0 && (
        <div className="flex items-center gap-3 px-5 py-2.5 border-b border-red-500/10 bg-red-500/[0.03]">
          <span className="size-2 rounded-full bg-red-500" />
          <span className="text-xs font-medium text-red-600 dark:text-red-400 flex-1">
            {t('credit.onHoldAlert', '{{count}} customers on credit hold', { count: onHoldCount })}
          </span>
          <button
            type="button"
            onClick={() => setShowOnHoldOnly(!showOnHoldOnly)}
            className="text-[10px] text-red-600 dark:text-red-400 hover:underline underline-offset-2"
          >
            {showOnHoldOnly ? t('credit.showAll', 'Show all') : t('credit.viewHeld', 'View held')}
          </button>
        </div>
      )}

      {/* ─── Summary strip ─────────────────────────────── */}
      <div className="flex items-center gap-8 px-5 py-3 border-b border-black/[0.06] dark:border-white/[0.06]">
        <div>
          <div className="text-[10px] tracking-widest uppercase text-black/25 dark:text-white/25">
            {t('credit.totalCreditExtended', 'Exposure')}
          </div>
          <CurrencyCell amount={totalExposure} className="text-sm" />
        </div>
        <div>
          <div className="text-[10px] tracking-widest uppercase text-black/25 dark:text-white/25">
            {t('credit.totalUtilization', 'Utilization')}
          </div>
          <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-sm">
            {Math.round(utilization)}%
          </span>
        </div>
        <div>
          <div className="text-[10px] tracking-widest uppercase text-black/25 dark:text-white/25">
            {t('credit.customersOnHold', 'On Hold')}
          </div>
          <span className={`font-[family-name:var(--font-geist-mono)] tabular-nums text-sm ${onHoldCount > 0 ? 'text-red-600 dark:text-red-400' : ''}`}>
            {onHoldCount}
          </span>
        </div>
        <div>
          <div className="text-[10px] tracking-widest uppercase text-black/25 dark:text-white/25">
            {t('credit.avgPaymentScore', 'Avg Score')}
          </div>
          <span className={`font-[family-name:var(--font-geist-mono)] tabular-nums text-sm ${getScoreColor(avgScore)}`}>
            {avgScore}
          </span>
        </div>
      </div>

      {/* ─── Risk matrix (CSS grid scatter) ─────────────── */}
      <div className="px-5 py-4 border-b border-black/[0.06] dark:border-white/[0.06]">
        <div className="text-[10px] tracking-widest uppercase text-black/20 dark:text-white/20 mb-2">
          Risk Matrix
        </div>
        <div className="relative w-full h-40 border border-black/[0.04] dark:border-white/[0.04] rounded-lg bg-black/[0.01] dark:bg-white/[0.01]">
          {/* Axis labels */}
          <div className="absolute -bottom-4 inset-x-0 flex justify-between px-1">
            <span className="text-[8px] text-black/15 dark:text-white/15">0%</span>
            <span className="text-[8px] text-black/15 dark:text-white/15">Limit Usage</span>
            <span className="text-[8px] text-black/15 dark:text-white/15">120%</span>
          </div>
          <div className="absolute -start-0.5 inset-y-0 flex flex-col justify-between py-1">
            <span className="text-[8px] text-black/15 dark:text-white/15 -rotate-90 origin-center">High Risk</span>
          </div>
          {/* Quadrant lines */}
          <div className="absolute inset-x-0 top-1/2 h-px bg-black/[0.04] dark:bg-white/[0.04]" />
          <div className="absolute inset-y-0 start-1/2 w-px bg-black/[0.04] dark:bg-white/[0.04]" />

          {/* Customer dots */}
          {profiles.map((p) => (
            <button
              key={p.customerId}
              type="button"
              onClick={() => setSelectedProfile(p)}
              className="absolute group"
              style={{
                left: `${toX(p.utilizationPct)}%`,
                top: `${toY(p.paymentScore)}%`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <div className={`size-3 rounded-full ${getRiskDot(p)} transition-transform group-hover:scale-150`} />
              <div className="absolute top-4 start-1/2 -translate-x-1/2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity text-[9px] text-black/50 dark:text-white/50 bg-white/90 dark:bg-black/90 px-1.5 py-0.5 rounded shadow-sm pointer-events-none">
                {p.customerName}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ─── Controls ──────────────────────────────────── */}
      <div className="flex items-center gap-3 px-5 py-2 border-b border-black/[0.06] dark:border-white/[0.06]">
        <button
          type="button"
          onClick={() => setShowOnHoldOnly(!showOnHoldOnly)}
          className={`rounded-full px-2.5 py-1 text-[11px] transition-colors ${
            showOnHoldOnly
              ? 'bg-red-500/10 text-red-600 dark:text-red-400'
              : 'text-black/30 dark:text-white/30 hover:text-black/60 dark:hover:text-white/60'
          }`}
        >
          On Hold Only
        </button>

        <div className="flex-1" />

        <div className="flex items-center gap-1">
          {(['utilizationPct', 'paymentScore', 'creditLimit', 'customerName'] as SortField[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setSortField(f)}
              className={`px-2 py-1 rounded text-[10px] transition-colors ${
                sortField === f
                  ? 'bg-black/[0.06] dark:bg-white/[0.06] text-black/70 dark:text-white/70'
                  : 'text-black/25 dark:text-white/25 hover:text-black/50 dark:hover:text-white/50'
              }`}
            >
              {f === 'utilizationPct' ? 'Util' : f === 'paymentScore' ? 'Score' : f === 'creditLimit' ? 'Limit' : 'Name'}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Customer list ─────────────────────────────── */}
      <div>
        {/* Header */}
        <div className="grid grid-cols-[1.5fr_0.6fr_1fr_1fr_0.8fr_60px_60px_120px] items-center gap-0 px-5 py-2 text-[10px] tracking-wider uppercase text-black/25 dark:text-white/25 border-b border-black/[0.06] dark:border-white/[0.06]">
          <div>{t('credit.customerName', 'Customer')}</div>
          <div className="text-center">{t('credit.tier', 'Tier')}</div>
          <div className="text-end">{t('credit.creditLimit', 'Limit')}</div>
          <div className="text-end">{t('credit.available', 'Available')}</div>
          <div>{t('credit.utilization', 'Utilization')}</div>
          <div className="text-end">{t('credit.score', 'Score')}</div>
          <div className="text-center">{t('credit.status', 'Status')}</div>
          <div className="text-center">{t('credit.action', 'Action')}</div>
        </div>

        {/* Rows */}
        {filtered.map((profile) => (
          <div
            key={profile.customerId}
            role="button"
            tabIndex={0}
            onClick={() => setSelectedProfile(profile)}
            onKeyDown={(e) => { if (e.key === 'Enter') setSelectedProfile(profile) }}
            className={`grid grid-cols-[1.5fr_0.6fr_1fr_1fr_0.8fr_60px_60px_120px] items-center gap-0 px-5 py-2.5 border-b border-black/[0.04] dark:border-white/[0.04] cursor-pointer transition-colors ${
              profile.isOnHold
                ? 'bg-red-500/[0.03] hover:bg-red-500/[0.06]'
                : 'hover:bg-black/[0.02] dark:hover:bg-white/[0.02]'
            }`}
          >
            <span className="text-xs font-medium text-black/70 dark:text-white/70 truncate">
              {profile.customerName}
            </span>
            <span className="text-center font-[family-name:var(--font-geist-mono)] tabular-nums text-[11px] text-black/30 dark:text-white/30">
              {profile.tier}
            </span>
            <span className="text-end">
              <CurrencyCell amount={profile.creditLimit} className="text-xs" />
            </span>
            <span className="text-end">
              <CurrencyCell
                amount={profile.availableCredit}
                className={`text-xs ${profile.availableCredit < 0 ? 'text-red-600 dark:text-red-400' : ''}`}
              />
            </span>
            {/* Inline utilization bar */}
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1 rounded-full bg-black/[0.06] dark:bg-white/[0.06] overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    profile.utilizationPct > 100
                      ? 'bg-red-500 animate-pulse'
                      : profile.utilizationPct > 80
                        ? 'bg-red-500/70'
                        : profile.utilizationPct > 60
                          ? 'bg-yellow-500'
                          : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(profile.utilizationPct, 100)}%` }}
                />
              </div>
              <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[10px] text-black/25 dark:text-white/25 min-w-[28px] text-end">
                {Math.round(profile.utilizationPct)}%
              </span>
            </div>
            <span className={`text-end font-[family-name:var(--font-geist-mono)] tabular-nums text-xs ${getScoreColor(profile.paymentScore)}`}>
              {profile.paymentScore}
            </span>
            <div className="flex justify-center">
              {profile.isOnHold ? (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-500/10 text-[9px] font-medium text-red-600 dark:text-red-400 uppercase tracking-wider">
                  <span className="size-1.5 rounded-full bg-red-500" />
                  {t('credit.held', 'Held')}
                </span>
              ) : (
                <span className={`size-1.5 rounded-full bg-green-500`} />
              )}
            </div>
            <div className="flex justify-center gap-1" onClick={(e) => e.stopPropagation()}>
              {/* Review button for high-risk customers */}
              {(profile.paymentScore < 50 || profile.utilizationPct > 90 || profile.isOnHold) && (
                <Button
                  onPress={() => setSelectedProfile(profile)}
                  className="rounded-md px-2 py-0.5 text-[10px] font-medium text-[#2563EB] hover:bg-[#2563EB]/[0.06] outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] transition-colors"
                >
                  {t('credit.review', 'Review')}
                </Button>
              )}
              <Button
                onPress={() => handleToggleHold(profile)}
                isDisabled={holdLoading === profile.customerId}
                className={`rounded-md px-2 py-0.5 text-[10px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] transition-colors ${
                  profile.isOnHold
                    ? 'text-green-600 dark:text-green-400 hover:bg-green-500/[0.06]'
                    : 'text-red-600 dark:text-red-400 hover:bg-red-500/[0.06]'
                } disabled:opacity-40`}
              >
                {holdLoading === profile.customerId
                  ? '...'
                  : profile.isOnHold
                    ? t('credit.release', 'Release')
                    : t('credit.placeHold', 'Hold')}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
