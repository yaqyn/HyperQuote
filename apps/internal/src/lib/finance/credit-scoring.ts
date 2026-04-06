/**
 * Credit scoring and auto-hold logic.
 * Payment behavior scoring: dollar-weighted, recency-biased (0-100).
 * Customer tiers: 1-5 based on score.
 * Auto-hold triggers: 5 types per CONTEXT.md spec.
 */

import type { CreditProfile, AutoHoldTrigger, CreditHoldType } from '../../types/finance'

interface PaymentRecord {
  amount: number
  daysToPay: number
  date: string
}

/**
 * Calculate payment behavior score (0-100).
 * Dollar-weighted: larger payments weigh more.
 * Recency-biased: recent payments weigh more than old ones.
 *
 * Score logic:
 * - Each payment scored: 100 if on-time (<=0 days late), decreasing by 1 per day late, min 0
 * - Dollar-weighted: score * (payment amount / total amount)
 * - Recency bias: payments within 6 months get 2x weight
 */
export function calculatePaymentBehaviorScore(payments: PaymentRecord[]): number {
  if (payments.length === 0) return 50 // Default for new customers

  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

  let weightedScoreSum = 0
  let totalWeight = 0

  for (const payment of payments) {
    // Score: 100 for on-time, -1 per day late, min 0
    const paymentScore = Math.max(0, 100 - Math.max(0, payment.daysToPay))

    // Recency bias: 2x weight for payments within 6 months
    const isRecent = new Date(payment.date) >= sixMonthsAgo
    const recencyMultiplier = isRecent ? 2 : 1

    const weight = payment.amount * recencyMultiplier
    weightedScoreSum += paymentScore * weight
    totalWeight += weight
  }

  if (totalWeight === 0) return 50
  return Math.round(weightedScoreSum / totalWeight)
}

/**
 * Determine customer tier from payment behavior score.
 * - 80+: eligible for tier upgrade (1-4)
 * - 50-79: maintain current tier (2-3)
 * - <50: automatic downgrade (4-5)
 */
export function getCustomerTier(score: number): number {
  if (score >= 80) return 1
  if (score >= 65) return 2
  if (score >= 50) return 3
  if (score >= 30) return 4
  return 5
}

/**
 * Check all 5 auto-hold trigger conditions.
 * Returns whether a hold should be placed and which triggers fired.
 *
 * Trigger types:
 * 1. limit_exceeded: current exposure > credit limit
 * 2. overdue_30: any invoice overdue > 30 days
 * 3. overdue_pct: overdue amount > 50% of credit limit
 * 4. bounced_cheque: any bounced cheques in last 12 months
 * 5. limit_expired: credit limit needs renewal
 */
export function shouldAutoHold(
  profile: CreditProfile,
): { hold: boolean; triggers: AutoHoldTrigger[] } {
  const triggers: AutoHoldTrigger[] = [
    {
      type: 'limit_exceeded' as CreditHoldType,
      threshold: profile.creditLimit,
      currentValue: profile.currentExposure,
      triggered: profile.currentExposure > profile.creditLimit,
    },
    {
      type: 'overdue_30' as CreditHoldType,
      threshold: 30,
      currentValue: profile.avgDaysToPay,
      triggered: profile.overdueAmount > 0 && profile.avgDaysToPay > 30,
    },
    {
      type: 'overdue_pct' as CreditHoldType,
      threshold: 50,
      currentValue: profile.creditLimit > 0 ? (profile.overdueAmount / profile.creditLimit) * 100 : 0,
      triggered: profile.creditLimit > 0 && (profile.overdueAmount / profile.creditLimit) * 100 > 50,
    },
    {
      type: 'bounced_cheque' as CreditHoldType,
      threshold: 0,
      currentValue: profile.bouncedCheques12mo,
      triggered: profile.bouncedCheques12mo > 0,
    },
    {
      type: 'limit_expired' as CreditHoldType,
      threshold: 0,
      currentValue: 0,
      // If already on hold for limit_expired, trigger is active
      triggered: profile.holdReasons.includes('limit_expired'),
    },
  ]

  const hold = triggers.some((t) => t.triggered)
  return { hold, triggers }
}
