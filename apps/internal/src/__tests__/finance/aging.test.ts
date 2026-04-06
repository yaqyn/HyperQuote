import { describe, expect, it } from 'vitest'
import { getAgingBucket, getAgingSeverity, calculateDSO, calculateCEI } from '../../lib/finance/aging'

describe('Aging', () => {
  const asOf = '2026-04-05'

  describe('getAgingBucket', () => {
    it('returns current for not yet due', () => {
      expect(getAgingBucket('2026-04-10', asOf)).toBe('current')
    })

    it('returns current for due today', () => {
      expect(getAgingBucket('2026-04-05', asOf)).toBe('current')
    })

    it('returns 1-30 for 1 day past due', () => {
      expect(getAgingBucket('2026-04-04', asOf)).toBe('1-30')
    })

    it('returns 1-30 for exactly 30 days past due', () => {
      expect(getAgingBucket('2026-03-06', asOf)).toBe('1-30')
    })

    it('returns 31-60 for 31 days past due', () => {
      expect(getAgingBucket('2026-03-05', asOf)).toBe('31-60')
    })

    it('returns 31-60 for exactly 60 days past due', () => {
      expect(getAgingBucket('2026-02-04', asOf)).toBe('31-60')
    })

    it('returns 61-90 for 61 days past due', () => {
      expect(getAgingBucket('2026-02-03', asOf)).toBe('61-90')
    })

    it('returns 61-90 for exactly 90 days past due', () => {
      expect(getAgingBucket('2026-01-05', asOf)).toBe('61-90')
    })

    it('returns 90+ for 91 days past due', () => {
      expect(getAgingBucket('2026-01-04', asOf)).toBe('90+')
    })

    it('returns 90+ for very old invoices', () => {
      expect(getAgingBucket('2025-01-01', asOf)).toBe('90+')
    })
  })

  describe('getAgingSeverity', () => {
    it('maps current to green', () => {
      expect(getAgingSeverity('current')).toBe('green')
    })

    it('maps 1-30 to yellow', () => {
      expect(getAgingSeverity('1-30')).toBe('yellow')
    })

    it('maps 31-60 to orange', () => {
      expect(getAgingSeverity('31-60')).toBe('orange')
    })

    it('maps 61-90 to red', () => {
      expect(getAgingSeverity('61-90')).toBe('red')
    })

    it('maps 90+ to dark_red', () => {
      expect(getAgingSeverity('90+')).toBe('dark_red')
    })
  })

  describe('calculateDSO', () => {
    it('calculates DSO correctly', () => {
      // 5,000,000 receivables / 36,500,000 annual revenue * 365 = 50 days
      expect(calculateDSO(5_000_000, 36_500_000)).toBe(50)
    })

    it('returns 0 when revenue is 0', () => {
      expect(calculateDSO(1_000_000, 0)).toBe(0)
    })

    it('supports custom period days', () => {
      expect(calculateDSO(1_000_000, 12_000_000, 360)).toBe(30)
    })
  })

  describe('calculateCEI', () => {
    it('calculates CEI correctly', () => {
      // (100 + 50 - 80) / (100 + 50 - 40) = 70 / 110 = 63.6% -> 64
      expect(calculateCEI(100, 50, 80, 40)).toBe(64)
    })

    it('returns 100 for perfect collection', () => {
      // (100 + 50 - 0) / (100 + 50 - 0) = 150 / 150 = 100
      expect(calculateCEI(100, 50, 0, 0)).toBe(100)
    })

    it('returns 0 when denominator is 0', () => {
      expect(calculateCEI(0, 0, 0, 0)).toBe(0)
    })
  })
})
