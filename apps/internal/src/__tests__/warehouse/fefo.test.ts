import { describe, expect, it } from 'vitest'
import { sortByFEFO, validateFEFOPick } from '../../lib/warehouse/fefo'

describe('FEFO', () => {
  describe('sortByFEFO', () => {
    it('sorts items by expiry date ascending', () => {
      const items = [
        { expiryDate: '2026-06-15', lotNumber: 'B' },
        { expiryDate: '2026-04-01', lotNumber: 'A' },
        { expiryDate: '2026-08-20', lotNumber: 'C' },
      ]
      const sorted = sortByFEFO(items)
      expect(sorted.map((i) => i.lotNumber)).toEqual(['A', 'B', 'C'])
    })

    it('sorts null expiry dates last', () => {
      const items = [
        { expiryDate: null, lotNumber: 'X' },
        { expiryDate: '2026-04-01', lotNumber: 'A' },
        { expiryDate: null, lotNumber: 'Y' },
      ]
      const sorted = sortByFEFO(items)
      expect(sorted[0].lotNumber).toBe('A')
      expect(sorted[1].expiryDate).toBeNull()
      expect(sorted[2].expiryDate).toBeNull()
    })
  })

  describe('validateFEFOPick', () => {
    const lots = [
      { lotNumber: 'OLD', expiryDate: '2026-04-01', quantityAvailable: 100 },
      { lotNumber: 'MID', expiryDate: '2026-06-01', quantityAvailable: 50 },
      { lotNumber: 'NEW', expiryDate: '2026-08-01', quantityAvailable: 200 },
    ]

    it('rejects newer lot when older lot has sufficient quantity', () => {
      const result = validateFEFOPick('NEW', lots, 50)
      expect(result.valid).toBe(false)
      expect(result.redirectTo).toBe('OLD')
    })

    it('allows pick when older lot has insufficient quantity', () => {
      const result = validateFEFOPick('MID', [
        { lotNumber: 'OLD', expiryDate: '2026-04-01', quantityAvailable: 5 },
        { lotNumber: 'MID', expiryDate: '2026-06-01', quantityAvailable: 50 },
      ], 20)
      expect(result.valid).toBe(true)
    })

    it('allows pick of the oldest lot', () => {
      const result = validateFEFOPick('OLD', lots, 50)
      expect(result.valid).toBe(true)
    })
  })
})
