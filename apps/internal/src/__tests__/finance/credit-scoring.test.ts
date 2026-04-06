import { describe, expect, it } from 'vitest'
import { calculatePaymentBehaviorScore, getCustomerTier, shouldAutoHold } from '../../lib/finance/credit-scoring'
import type { CreditProfile } from '../../types/finance'

describe('Credit Scoring', () => {
  describe('calculatePaymentBehaviorScore', () => {
    it('returns 50 for no payment history', () => {
      expect(calculatePaymentBehaviorScore([])).toBe(50)
    })

    it('returns 100 for all on-time payments', () => {
      const payments = [
        { amount: 100_000, daysToPay: 0, date: new Date().toISOString() },
        { amount: 200_000, daysToPay: 0, date: new Date().toISOString() },
      ]
      expect(calculatePaymentBehaviorScore(payments)).toBe(100)
    })

    it('penalizes late payments proportionally', () => {
      const payments = [
        { amount: 100_000, daysToPay: 50, date: new Date().toISOString() },
      ]
      const score = calculatePaymentBehaviorScore(payments)
      expect(score).toBe(50) // 100 - 50 = 50
    })

    it('caps minimum score at 0', () => {
      const payments = [
        { amount: 100_000, daysToPay: 150, date: new Date().toISOString() },
      ]
      const score = calculatePaymentBehaviorScore(payments)
      expect(score).toBe(0) // max(0, 100-150) = 0
    })

    it('weights larger payments more heavily', () => {
      const payments = [
        { amount: 10_000, daysToPay: 60, date: new Date().toISOString() },   // score 40
        { amount: 100_000, daysToPay: 10, date: new Date().toISOString() },  // score 90
      ]
      const score = calculatePaymentBehaviorScore(payments)
      // Weighted: (40*20000 + 90*200000) / 220000 = (800000 + 18000000) / 220000 = 85.45 -> 85
      expect(score).toBeGreaterThan(80)
    })
  })

  describe('getCustomerTier', () => {
    it('returns tier 1 for score >= 80', () => {
      expect(getCustomerTier(80)).toBe(1)
      expect(getCustomerTier(100)).toBe(1)
    })

    it('returns tier 2 for score 65-79', () => {
      expect(getCustomerTier(65)).toBe(2)
      expect(getCustomerTier(79)).toBe(2)
    })

    it('returns tier 3 for score 50-64', () => {
      expect(getCustomerTier(50)).toBe(3)
      expect(getCustomerTier(64)).toBe(3)
    })

    it('returns tier 4 for score 30-49', () => {
      expect(getCustomerTier(30)).toBe(4)
      expect(getCustomerTier(49)).toBe(4)
    })

    it('returns tier 5 for score < 30', () => {
      expect(getCustomerTier(29)).toBe(5)
      expect(getCustomerTier(0)).toBe(5)
    })
  })

  describe('shouldAutoHold', () => {
    const baseProfile: CreditProfile = {
      customerId: 'cust-001',
      customerName: 'Test Co.',
      tier: 3,
      creditLimit: 1_000_000,
      currentExposure: 500_000,
      utilizationPct: 50,
      availableCredit: 500_000,
      overdueAmount: 0,
      paymentScore: 75,
      avgDaysToPay: 25,
      bouncedCheques12mo: 0,
      lastPaymentDate: '2026-03-01',
      isOnHold: false,
      holdReasons: [],
    }

    it('does not hold a healthy profile', () => {
      const result = shouldAutoHold(baseProfile)
      expect(result.hold).toBe(false)
    })

    it('triggers limit_exceeded when exposure > limit', () => {
      const profile = { ...baseProfile, currentExposure: 1_200_000 }
      const result = shouldAutoHold(profile)
      expect(result.hold).toBe(true)
      expect(result.triggers.find((t) => t.type === 'limit_exceeded')?.triggered).toBe(true)
    })

    it('triggers overdue_30 when avg days > 30 with overdue amount', () => {
      const profile = { ...baseProfile, avgDaysToPay: 45, overdueAmount: 100_000 }
      const result = shouldAutoHold(profile)
      expect(result.hold).toBe(true)
      expect(result.triggers.find((t) => t.type === 'overdue_30')?.triggered).toBe(true)
    })

    it('triggers overdue_pct when overdue > 50% of limit', () => {
      const profile = { ...baseProfile, overdueAmount: 600_000 }
      const result = shouldAutoHold(profile)
      expect(result.hold).toBe(true)
      expect(result.triggers.find((t) => t.type === 'overdue_pct')?.triggered).toBe(true)
    })

    it('triggers bounced_cheque when any bounced cheques exist', () => {
      const profile = { ...baseProfile, bouncedCheques12mo: 1 }
      const result = shouldAutoHold(profile)
      expect(result.hold).toBe(true)
      expect(result.triggers.find((t) => t.type === 'bounced_cheque')?.triggered).toBe(true)
    })

    it('triggers limit_expired when in holdReasons', () => {
      const profile = { ...baseProfile, holdReasons: ['limit_expired' as const] }
      const result = shouldAutoHold(profile)
      expect(result.hold).toBe(true)
      expect(result.triggers.find((t) => t.type === 'limit_expired')?.triggered).toBe(true)
    })

    it('returns all 5 trigger objects regardless of state', () => {
      const result = shouldAutoHold(baseProfile)
      expect(result.triggers).toHaveLength(5)
    })
  })
})
