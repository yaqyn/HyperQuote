import { describe, it, expect } from 'vitest'
import {
  computeSLAStatus,
  getSLAStatusColor,
  getTimeRemainingColor,
  SLA_DURATIONS,
} from '../types/operations'

describe('Operations Dashboard (OPS-03)', () => {
  describe('computeSLAStatus', () => {
    it('returns breached when remainingMs <= 0', () => {
      expect(computeSLAStatus(-1000, 100_000)).toBe('breached')
      expect(computeSLAStatus(0, 100_000)).toBe('breached')
    })

    it('returns at_risk when ratio < 0.5', () => {
      expect(computeSLAStatus(40_000, 100_000)).toBe('at_risk')
      expect(computeSLAStatus(1, 100_000)).toBe('at_risk')
    })

    it('returns on_track when ratio >= 0.5', () => {
      expect(computeSLAStatus(60_000, 100_000)).toBe('on_track')
      expect(computeSLAStatus(100_000, 100_000)).toBe('on_track')
    })
  })

  describe('getSLAStatusColor', () => {
    it('maps status to color name', () => {
      expect(getSLAStatusColor('breached')).toBe('red')
      expect(getSLAStatusColor('at_risk')).toBe('yellow')
      expect(getSLAStatusColor('on_track')).toBe('green')
    })
  })

  describe('getTimeRemainingColor', () => {
    it('returns red for overdue', () => {
      expect(getTimeRemainingColor(-1000, 100_000)).toBe('text-red-600')
    })

    it('returns yellow for low remaining', () => {
      expect(getTimeRemainingColor(20_000, 100_000)).toBe('text-yellow-600')
    })

    it('returns green for healthy remaining', () => {
      expect(getTimeRemainingColor(60_000, 100_000)).toBe('text-green-600')
    })
  })

  describe('SLA_DURATIONS', () => {
    it('defines 5 SLA types', () => {
      expect(Object.keys(SLA_DURATIONS)).toHaveLength(5)
    })

    it('quote_response is 4 hours', () => {
      expect(SLA_DURATIONS.quote_response.durationMs).toBe(4 * 60 * 60 * 1000)
      expect(SLA_DURATIONS.quote_response.label).toBe('Quote Response')
    })
  })
})
