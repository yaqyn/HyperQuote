import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type { CreditProfile } from '../../types/finance'

function getMockCreditProfile(customerId: string): CreditProfile {
  const profiles: Record<string, CreditProfile> = {
    'cust-001': {
      customerId: 'cust-001', customerName: 'Cairo Construction Co.', tier: 3,
      creditLimit: 2_000_000, currentExposure: 1_450_000, utilizationPct: 72.5,
      availableCredit: 550_000, overdueAmount: 180_000, paymentScore: 78,
      avgDaysToPay: 28, bouncedCheques12mo: 0, lastPaymentDate: '2026-03-28',
      isOnHold: false, holdReasons: [],
    },
    'cust-002': {
      customerId: 'cust-002', customerName: 'Delta Building Materials', tier: 2,
      creditLimit: 1_000_000, currentExposure: 730_000, utilizationPct: 73,
      availableCredit: 270_000, overdueAmount: 260_000, paymentScore: 62,
      avgDaysToPay: 38, bouncedCheques12mo: 0, lastPaymentDate: '2026-03-15',
      isOnHold: false, holdReasons: [],
    },
    'cust-004': {
      customerId: 'cust-004', customerName: 'Upper Egypt Contractors', tier: 5,
      creditLimit: 500_000, currentExposure: 530_000, utilizationPct: 106,
      availableCredit: -30_000, overdueAmount: 530_000, paymentScore: 22,
      avgDaysToPay: 75, bouncedCheques12mo: 2, lastPaymentDate: '2025-12-10',
      isOnHold: true, holdReasons: ['limit_exceeded', 'overdue_30', 'bounced_cheque'],
    },
  }
  return profiles[customerId] ?? profiles['cust-001']
}

const getCreditProfileInput = z.object({ customerId: z.string() })

export const getCreditProfile = createServerFn({ method: 'GET' })
  .inputValidator(getCreditProfileInput)
  .handler(async ({ data: input }) => {
    return getMockCreditProfile(input.customerId)
  })

const updateCreditLimitInput = z.object({
  customerId: z.string(),
  newLimit: z.number(),
  reason: z.string(),
})

export const updateCreditLimit = createServerFn({ method: 'POST' })
  .inputValidator(updateCreditLimitInput)
  .handler(async ({ data: input }) => {
    const profile = getMockCreditProfile(input.customerId)
    const increasePercent = ((input.newLimit - profile.creditLimit) / profile.creditLimit) * 100

    // Approval chain per spec:
    // <20%: Finance Manager
    // 20-50%: Finance Manager + CFO
    // >50% or >EGP 50M: Finance Manager + CFO + CEO
    let approvalRequired: string | null = null
    if (increasePercent > 50 || input.newLimit > 50_000_000) {
      approvalRequired = 'Finance Manager + CFO + CEO'
    } else if (increasePercent > 20) {
      approvalRequired = 'Finance Manager + CFO'
    } else if (increasePercent > 0) {
      approvalRequired = 'Finance Manager'
    }

    return { success: true, approvalRequired }
  })
