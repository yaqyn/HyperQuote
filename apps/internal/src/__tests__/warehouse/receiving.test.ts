import { describe, expect, it } from 'vitest'
import { getQualityChecklist } from '../../lib/warehouse/quality-checklists'

describe('Receiving', () => {
  describe('variance calculation', () => {
    it('calculates variance percentage correctly', () => {
      const expected = 100
      const received = 95
      const variancePercent = (received - expected) / expected
      expect(variancePercent).toBeCloseTo(-0.05)
    })

    it('returns zero variance when quantities match', () => {
      const expected = 50
      const received = 50
      const variancePercent = (received - expected) / expected
      expect(variancePercent).toBe(0)
    })
  })

  describe('quality checklist', () => {
    it('returns correct checklist items for cement', () => {
      const checklist = getQualityChecklist('cement')
      expect(checklist.length).toBe(5)
      expect(checklist.some((item) => item.label.includes('Bags intact'))).toBe(true)
      expect(checklist.some((item) => item.label.includes('Manufacture date'))).toBe(true)
    })

    it('returns correct checklist items for steel_rebar', () => {
      const checklist = getQualityChecklist('steel_rebar')
      expect(checklist.length).toBe(6)
      expect(checklist.some((item) => item.label.includes('Mill Test Certificate'))).toBe(true)
    })

    it('returns all items unchecked initially', () => {
      const checklist = getQualityChecklist('lumber')
      expect(checklist.every((item) => item.checked === false)).toBe(true)
    })
  })
})
