import { describe, it, expect } from 'vitest'
import {
  isCairoTruckBanViolation,
  isPrayerTimeConflict,
  isFridayJumuahBlocked,
  isKhamsinBlocked,
  isEquipmentRestricted,
  validateAllConstraints,
  isDriverComplianceValid,
} from '../lib/constraints'
import type { PrayerTime, Driver, Vehicle, RouteStop } from '../types/dispatch'

// ─── Cairo Truck Ban ─────────────────────────────────────

describe('isCairoTruckBanViolation', () => {
  it('blocks 5+ ton trucks during ban hours (6AM-midnight) in Greater Cairo', () => {
    // 7000kg = 7 tons, 8AM Cairo time, Greater Cairo
    expect(isCairoTruckBanViolation(7000, new Date('2026-04-06T06:00:00Z'), true)).toBe(true)
  })

  it('allows under-5-ton trucks during ban hours', () => {
    expect(isCairoTruckBanViolation(4000, new Date('2026-04-06T06:00:00Z'), true)).toBe(false)
  })

  it('allows heavy trucks during midnight-6AM window', () => {
    // 1AM Cairo time (UTC-2 offset, so 23:00 UTC previous day = 1AM Cairo)
    expect(isCairoTruckBanViolation(7000, new Date('2026-04-06T01:00:00Z'), true)).toBe(false)
  })

  it('allows heavy trucks outside Greater Cairo', () => {
    expect(isCairoTruckBanViolation(7000, new Date('2026-04-06T08:00:00Z'), false)).toBe(false)
  })

  it('blocks exactly 5000kg (5 tons threshold)', () => {
    expect(isCairoTruckBanViolation(5000, new Date('2026-04-06T08:00:00Z'), true)).toBe(true)
  })
})

// ─── Friday Jumu'ah ──────────────────────────────────────

describe('isFridayJumuahBlocked', () => {
  it('blocks Friday noon (12:00)', () => {
    // Friday April 10, 2026 at noon Cairo time
    expect(isFridayJumuahBlocked(new Date('2026-04-10T10:00:00Z'))).toBe(true)
  })

  it('allows Friday 2PM (after blackout)', () => {
    expect(isFridayJumuahBlocked(new Date('2026-04-10T12:00:00Z'))).toBe(false)
  })

  it('allows Thursday noon', () => {
    expect(isFridayJumuahBlocked(new Date('2026-04-09T10:00:00Z'))).toBe(false)
  })

  it('blocks Friday 11:30 AM (start of blackout)', () => {
    expect(isFridayJumuahBlocked(new Date('2026-04-10T09:30:00Z'))).toBe(true)
  })

  it('allows Friday 1:31 PM (just after blackout)', () => {
    expect(isFridayJumuahBlocked(new Date('2026-04-10T11:31:00Z'))).toBe(false)
  })
})

// ─── Khamsin ─────────────────────────────────────────────

describe('isKhamsinBlocked', () => {
  it('blocks when wind > 30 km/h with sheet materials', () => {
    expect(isKhamsinBlocked(35, true)).toBe(true)
  })

  it('allows when wind <= 30 km/h even with sheet materials', () => {
    expect(isKhamsinBlocked(25, true)).toBe(false)
  })

  it('allows high wind without sheet materials', () => {
    expect(isKhamsinBlocked(35, false)).toBe(false)
  })

  it('allows exactly 30 km/h (threshold not exceeded)', () => {
    expect(isKhamsinBlocked(30, true)).toBe(false)
  })
})

// ─── Equipment Restrictions ──────────────────────────────

describe('isEquipmentRestricted', () => {
  it('blocks moffett jobs for ON_DEMAND drivers', () => {
    expect(isEquipmentRestricted('moffett', 'ON_DEMAND')).toBe(true)
  })

  it('allows moffett jobs for INTERNAL drivers', () => {
    expect(isEquipmentRestricted('moffett', 'INTERNAL')).toBe(false)
  })

  it('allows moffett jobs for CONTRACTED drivers', () => {
    expect(isEquipmentRestricted('moffett', 'CONTRACTED')).toBe(false)
  })

  it('allows no-equipment jobs for ON_DEMAND drivers', () => {
    expect(isEquipmentRestricted('none', 'ON_DEMAND')).toBe(false)
  })

  it('blocks boom jobs for ON_DEMAND drivers', () => {
    expect(isEquipmentRestricted('boom', 'ON_DEMAND')).toBe(true)
  })

  it('blocks crane jobs for ON_DEMAND drivers', () => {
    expect(isEquipmentRestricted('crane', 'ON_DEMAND')).toBe(true)
  })
})

// ─── Prayer Time Conflict ────────────────────────────────

describe('isPrayerTimeConflict', () => {
  it('returns conflicting prayer when within buffer', () => {
    const prayerTimes: PrayerTime[] = [
      { name: 'Dhuhr', time: new Date('2026-04-06T10:15:00Z') },
    ]
    const scheduled = new Date('2026-04-06T10:10:00Z') // 5 min before
    const result = isPrayerTimeConflict(scheduled, prayerTimes, 15)
    expect(result).not.toBeNull()
    expect(result!.name).toBe('Dhuhr')
  })

  it('returns null when outside buffer', () => {
    const prayerTimes: PrayerTime[] = [
      { name: 'Dhuhr', time: new Date('2026-04-06T10:15:00Z') },
    ]
    const scheduled = new Date('2026-04-06T09:50:00Z') // 25 min before
    expect(isPrayerTimeConflict(scheduled, prayerTimes, 15)).toBeNull()
  })

  it('checks within 15min after prayer as well', () => {
    const prayerTimes: PrayerTime[] = [
      { name: 'Asr', time: new Date('2026-04-06T13:00:00Z') },
    ]
    const scheduled = new Date('2026-04-06T13:10:00Z') // 10 min after
    const result = isPrayerTimeConflict(scheduled, prayerTimes, 15)
    expect(result).not.toBeNull()
    expect(result!.name).toBe('Asr')
  })
})

// ─── validateAllConstraints ──────────────────────────────

describe('validateAllConstraints', () => {
  const baseStop: RouteStop = {
    id: 's1',
    deliveryId: 'd1',
    orderId: 'o1',
    customerName: 'Test',
    address: 'Cairo',
    lat: 30.0444,
    lng: 31.2357,
    weight: 7000,
    equipmentNeeded: 'moffett',
    timeWindow: { start: '08:00', end: '12:00' },
    sequence: 1,
    status: 'pending',
  }

  const baseDriver: Driver = {
    id: 'dr1',
    name: 'Ahmed',
    type: 'ON_DEMAND',
    phone: '+201234567890',
    vehicleId: 'v1',
    licenseExpiry: '2027-01-01',
    medicalExpiry: '2027-01-01',
    certifications: [],
    complianceStatus: 'valid',
    activeRouteId: null,
    available: true,
  }

  const baseVehicle: Vehicle = {
    id: 'v1',
    plateNumber: 'ABC-123',
    type: 'truck',
    capacityKg: 10000,
    hasEquipment: { moffett: true, boom: false, crane: false },
    currentDriverId: 'dr1',
    status: 'loading',
  }

  it('aggregates multiple constraint violations', () => {
    // ON_DEMAND + moffett + heavy + ban hours => at least 2 violations
    const violations = validateAllConstraints(
      baseStop,
      baseDriver,
      baseVehicle,
      new Date('2026-04-06T08:00:00Z'),
    )
    expect(violations.length).toBeGreaterThanOrEqual(2)
    const types = violations.map((v) => v.type)
    expect(types).toContain('equipment')
    expect(types).toContain('cairo_ban')
  })

  it('returns empty array when no violations', () => {
    const violations = validateAllConstraints(
      { ...baseStop, weight: 3000, equipmentNeeded: 'none', lat: 25.0, lng: 33.0 },
      { ...baseDriver, type: 'INTERNAL' },
      baseVehicle,
      new Date('2026-04-06T02:00:00Z'),
    )
    expect(violations).toHaveLength(0)
  })
})
