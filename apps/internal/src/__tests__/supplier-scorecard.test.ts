import { describe, it, expect } from 'vitest'
import { computeTier } from '../types/procurement'
import {
  computeFillRate,
  computeStarRating,
  getTierInspectionLevel,
} from '../components/procurement/supplier/scorecard-utils'

describe('Supplier Scorecard', () => {
  describe('computeTier', () => {
    it('returns preferred when onTimeRate >= 95 and isPreferred', () => {
      expect(computeTier(96, 90, true)).toBe('preferred')
    })

    it('returns approved when onTimeRate >= 85 and qualityScore >= 80', () => {
      expect(computeTier(90, 85, false)).toBe('approved')
    })

    it('returns conditional when onTimeRate >= 70', () => {
      expect(computeTier(75, 60, false)).toBe('conditional')
    })

    it('returns new when below all thresholds', () => {
      expect(computeTier(50, 40, false)).toBe('new')
    })
  })

  describe('computeFillRate', () => {
    it('computes fill rate as received / ordered', () => {
      expect(computeFillRate(90, 100)).toBe(0.9)
    })

    it('returns 0 when ordered is 0', () => {
      expect(computeFillRate(0, 0)).toBe(0)
    })

    it('caps at 1.0 even if received exceeds ordered', () => {
      expect(computeFillRate(110, 100)).toBe(1.0)
    })
  })

  describe('computeStarRating', () => {
    it('maps 4.5+ to 5 stars', () => {
      expect(computeStarRating(4.5)).toBe(5)
      expect(computeStarRating(5.0)).toBe(5)
    })

    it('maps 3.5-4.49 to 4 stars', () => {
      expect(computeStarRating(3.5)).toBe(4)
      expect(computeStarRating(4.49)).toBe(4)
    })

    it('maps 2.5-3.49 to 3 stars', () => {
      expect(computeStarRating(2.5)).toBe(3)
      expect(computeStarRating(3.49)).toBe(3)
    })

    it('maps 1.5-2.49 to 2 stars', () => {
      expect(computeStarRating(1.5)).toBe(2)
    })

    it('maps below 1.5 to 1 star', () => {
      expect(computeStarRating(1.0)).toBe(1)
      expect(computeStarRating(0.5)).toBe(1)
    })
  })

  describe('getTierInspectionLevel', () => {
    it('maps preferred to Skip-lot inspection', () => {
      expect(getTierInspectionLevel('preferred')).toBe('Skip-lot inspection, priority dispatch')
    })

    it('maps approved to AQL sampling', () => {
      expect(getTierInspectionLevel('approved')).toBe('AQL sampling inspection')
    })

    it('maps conditional to Tightened inspection', () => {
      expect(getTierInspectionLevel('conditional')).toBe('Tightened inspection required')
    })

    it('maps new to 100% inspection', () => {
      expect(getTierInspectionLevel('new')).toBe('100% inspection required')
    })
  })
})
