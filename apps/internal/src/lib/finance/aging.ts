/**
 * AR/AP aging bucket classification and metrics.
 * Classifies invoices by days past due, calculates DSO and CEI.
 */

import type { ARAgingBucket } from '../../types/finance'

/**
 * Classify a due date into an aging bucket.
 * @param dueDate - ISO date string of invoice due date
 * @param asOfDate - Reference date (defaults to today)
 */
export function getAgingBucket(dueDate: string, asOfDate?: string): ARAgingBucket {
  const due = new Date(dueDate)
  const asOf = asOfDate ? new Date(asOfDate) : new Date()

  // Zero out time for day-level comparison
  due.setHours(0, 0, 0, 0)
  asOf.setHours(0, 0, 0, 0)

  const diffMs = asOf.getTime() - due.getTime()
  const daysPastDue = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (daysPastDue <= 0) return 'current'
  if (daysPastDue <= 30) return '1-30'
  if (daysPastDue <= 60) return '31-60'
  if (daysPastDue <= 90) return '61-90'
  return '90+'
}

/**
 * Map aging bucket to severity color.
 * Used by AgingBadge component for color coding.
 */
export function getAgingSeverity(
  bucket: ARAgingBucket,
): 'green' | 'yellow' | 'orange' | 'red' | 'dark_red' {
  switch (bucket) {
    case 'current':
      return 'green'
    case '1-30':
      return 'yellow'
    case '31-60':
      return 'orange'
    case '61-90':
      return 'red'
    case '90+':
      return 'dark_red'
  }
}

/**
 * Calculate Days Sales Outstanding (DSO).
 * DSO = (Total Receivables / Annual Revenue) * periodDays
 * @param totalReceivables - Current total AR
 * @param annualRevenue - Revenue for the period (annualized)
 * @param periodDays - Number of days in period (default 365)
 */
export function calculateDSO(
  totalReceivables: number,
  annualRevenue: number,
  periodDays = 365,
): number {
  if (annualRevenue === 0) return 0
  return Math.round((totalReceivables / annualRevenue) * periodDays)
}

/**
 * Calculate Collection Effectiveness Index (CEI).
 * CEI = ((Beginning Receivables + Credit Sales - Ending Total Receivables) /
 *        (Beginning Receivables + Credit Sales - Ending Current Receivables)) * 100
 * @returns CEI percentage (0-100)
 */
export function calculateCEI(
  beginningReceivables: number,
  creditSales: number,
  endingReceivables: number,
  endingCurrentReceivables: number,
): number {
  const numerator = beginningReceivables + creditSales - endingReceivables
  const denominator = beginningReceivables + creditSales - endingCurrentReceivables

  if (denominator === 0) return 0
  return Math.round((numerator / denominator) * 100)
}
