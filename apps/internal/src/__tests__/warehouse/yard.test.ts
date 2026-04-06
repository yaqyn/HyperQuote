import { describe, expect, it } from 'vitest'
import type { YardZoneStatus } from '../../types/warehouse'

/** Get zone color coding by capacity percentage */
function getZoneColor(capacityPercent: number): 'green' | 'yellow' | 'red' {
  if (capacityPercent < 60) return 'green'
  if (capacityPercent <= 80) return 'yellow'
  return 'red'
}

/** Map capacity percentage to YardZoneStatus */
function getZoneStatus(capacityPercent: number): YardZoneStatus {
  if (capacityPercent < 60) return 'low'
  if (capacityPercent <= 80) return 'medium'
  return 'high'
}

describe('Yard Management', () => {
  describe('zone color coding by capacity', () => {
    it('green for capacity under 60%', () => {
      expect(getZoneColor(30)).toBe('green')
      expect(getZoneColor(55)).toBe('green')
      expect(getZoneColor(59)).toBe('green')
    })

    it('yellow for capacity 60-80%', () => {
      expect(getZoneColor(60)).toBe('yellow')
      expect(getZoneColor(72)).toBe('yellow')
      expect(getZoneColor(80)).toBe('yellow')
    })

    it('red for capacity over 80%', () => {
      expect(getZoneColor(81)).toBe('red')
      expect(getZoneColor(95)).toBe('red')
      expect(getZoneColor(100)).toBe('red')
    })
  })

  describe('zone status mapping', () => {
    it('maps capacity to correct YardZoneStatus', () => {
      expect(getZoneStatus(30)).toBe('low')
      expect(getZoneStatus(65)).toBe('medium')
      expect(getZoneStatus(90)).toBe('high')
    })
  })
})
