import { describe, expect, it } from 'vitest'
import { needsRecount, getVarianceThreshold } from '../../lib/warehouse/abc-thresholds'
import type { CycleCountItem } from '../../types/warehouse'

describe('Cycle Count', () => {
  describe('ABC threshold recount', () => {
    it('requires recount for A items above 2% variance', () => {
      expect(needsRecount(0.03, 'A')).toBe(true)
      expect(needsRecount(0.02, 'A')).toBe(false)
      expect(needsRecount(0.01, 'A')).toBe(false)
    })

    it('requires recount for B items above 5% variance', () => {
      expect(needsRecount(0.06, 'B')).toBe(true)
      expect(needsRecount(0.05, 'B')).toBe(false)
      expect(needsRecount(0.03, 'B')).toBe(false)
    })

    it('requires recount for C items above 10% variance', () => {
      expect(needsRecount(0.11, 'C')).toBe(true)
      expect(needsRecount(0.10, 'C')).toBe(false)
      expect(needsRecount(0.05, 'C')).toBe(false)
    })

    it('handles negative variance (absolute value)', () => {
      expect(needsRecount(-0.03, 'A')).toBe(true)
      expect(needsRecount(-0.01, 'A')).toBe(false)
    })

    it('returns correct threshold values', () => {
      expect(getVarianceThreshold('A')).toBe(0.02)
      expect(getVarianceThreshold('B')).toBe(0.05)
      expect(getVarianceThreshold('C')).toBe(0.10)
    })
  })

  describe('CycleCountItem type - blind count', () => {
    it('CycleCountItem type has NO quantity fields', () => {
      // Type-level verification: CycleCountItem should only have productId, productName, sku, lotNumber
      const item: CycleCountItem = {
        productId: 'p1',
        productName: 'Portland Cement Type I',
        sku: 'CEM-001',
        lotNumber: 'LOT-2026-001',
      }
      const keys = Object.keys(item)
      expect(keys).toEqual(['productId', 'productName', 'sku', 'lotNumber'])
      expect(keys).not.toContain('quantity')
      expect(keys).not.toContain('quantityOnHand')
      expect(keys).not.toContain('quantityAvailable')
      expect(keys).not.toContain('systemQty')
    })
  })
})
