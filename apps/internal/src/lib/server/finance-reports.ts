import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type { CashFlowForecast, FinanceReport } from '../../types/finance'

function getMockCashFlowForecast(): CashFlowForecast[] {
  const weeks: CashFlowForecast[] = []
  let cumulative = 15_680_000 // Starting cash position
  for (let i = 1; i <= 13; i++) {
    const inflows = 2_800_000 + Math.floor(Math.random() * 800_000)
    const outflows = 2_200_000 + Math.floor(Math.random() * 600_000)
    const net = inflows - outflows
    cumulative += net
    weeks.push({
      week: `W${i}`,
      expectedInflows: inflows,
      expectedOutflows: outflows,
      netCash: net,
      cumulativeCash: cumulative,
    })
  }
  return weeks
}

function getMockReports(): FinanceReport[] {
  return [
    { id: 'rpt-001', name: 'Daily Cash Position', type: 'cash', dateRange: '2026-04-05', filters: {}, generatedAt: new Date().toISOString(), downloadUrl: '/reports/daily-cash.pdf' },
    { id: 'rpt-002', name: 'AR Aging Report', type: 'ar_aging', dateRange: '2026-04-01 - 2026-04-05', filters: {}, generatedAt: new Date().toISOString(), downloadUrl: '/reports/ar-aging.pdf' },
    { id: 'rpt-003', name: 'AP Aging Report', type: 'ap_aging', dateRange: '2026-04-01 - 2026-04-05', filters: {}, generatedAt: new Date().toISOString(), downloadUrl: '/reports/ap-aging.pdf' },
  ]
}

const getCashFlowInput = z.object({ months: z.number().optional().default(3) })

export const getCashFlowForecast = createServerFn({ method: 'GET' })
  .inputValidator(getCashFlowInput)
  .handler(async ({ data: _input }) => {
    return { forecast: getMockCashFlowForecast() }
  })

export const getFinanceReports = createServerFn({ method: 'GET' })
  .handler(async () => {
    return { reports: getMockReports() }
  })
