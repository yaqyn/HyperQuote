import { createServerFn } from '@tanstack/react-start'
import type { FinanceDashboard } from '../../types/finance'

function getMockDashboard(): FinanceDashboard {
  return {
    revenueMTD: 12_450_000,
    outstandingAR: 8_750_000,
    overdueAR: 2_340_000,
    cashPosition: 15_680_000,
    dso: 42,
    cei: 87,
    arAging: {
      current: 3_200_000,
      days30: 2_800_000,
      days60: 1_500_000,
      days90: 750_000,
      days90plus: 500_000,
    },
    expectedPaymentsThisWeek: 3_250_000,
    paymentMethodBreakdown: { wire: 45, cheque: 35, lc: 15, cash: 5 },
    topCreditUtilization: [
      { customerId: 'cust-001', customerName: 'Cairo Construction Co.', utilizationPct: 92 },
      { customerId: 'cust-002', customerName: 'Delta Building Materials', utilizationPct: 85 },
      { customerId: 'cust-003', customerName: 'Nile Development Group', utilizationPct: 78 },
    ],
    apDueThisWeek: 4_120_000,
    overdueAP: 680_000,
    avgMarginMTD: 18.5,
  }
}

export const getFinanceDashboard = createServerFn({ method: 'GET' })
  .handler(async () => {
    return getMockDashboard()
  })
