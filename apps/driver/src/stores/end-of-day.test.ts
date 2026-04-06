import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useEODStore, getStepsForDriverType } from './end-of-day'

// Mock PowerSync db
const mockExecute = vi.fn().mockResolvedValue(undefined)
const mockGetAll = vi.fn().mockResolvedValue([])
vi.mock('../lib/powersync', () => ({
  db: {
    execute: (...args: unknown[]) => mockExecute(...args),
    getAll: (...args: unknown[]) => mockGetAll(...args),
  },
}))

// Mock upload queue
vi.mock('../lib/upload-queue', () => ({
  processUploadQueue: vi.fn().mockResolvedValue(undefined),
}))

beforeEach(() => {
  useEODStore.getState().reset()
  mockExecute.mockClear()
  mockGetAll.mockClear()
})

describe('getStepsForDriverType', () => {
  it('returns 6 steps for internal drivers including returns and post-trip-dvir', () => {
    const steps = getStepsForDriverType('internal')
    expect(steps).toHaveLength(6)
    expect(steps).toContain('returns')
    expect(steps).toContain('post-trip-dvir')
  })

  it('returns 4 steps for contracted drivers without returns and post-trip-dvir', () => {
    const steps = getStepsForDriverType('contracted')
    expect(steps).toHaveLength(4)
    expect(steps).not.toContain('returns')
    expect(steps).not.toContain('post-trip-dvir')
  })

  it('returns 4 steps for on_demand drivers (same as contracted)', () => {
    const steps = getStepsForDriverType('on_demand')
    expect(steps).toHaveLength(4)
    expect(steps).not.toContain('returns')
    expect(steps).not.toContain('post-trip-dvir')
  })
})

describe('useEODStore', () => {
  it('init(internal) sets steps and currentStep to returns', () => {
    useEODStore.getState().init('internal')
    const state = useEODStore.getState()
    expect(state.steps).toHaveLength(6)
    expect(state.currentStep).toBe('returns')
  })

  it('init(contracted) sets currentStep to fuel (first step for external)', () => {
    useEODStore.getState().init('contracted')
    const state = useEODStore.getState()
    expect(state.steps).toHaveLength(4)
    expect(state.currentStep).toBe('fuel')
  })

  it('nextStep advances to next step in sequence', () => {
    useEODStore.getState().init('internal')
    expect(useEODStore.getState().currentStep).toBe('returns')

    useEODStore.getState().nextStep()
    expect(useEODStore.getState().currentStep).toBe('fuel')

    useEODStore.getState().nextStep()
    expect(useEODStore.getState().currentStep).toBe('post-trip-dvir')
  })

  it('prevStep goes back but not below index 0', () => {
    useEODStore.getState().init('internal')
    useEODStore.getState().nextStep() // fuel
    useEODStore.getState().nextStep() // post-trip-dvir

    useEODStore.getState().prevStep()
    expect(useEODStore.getState().currentStep).toBe('fuel')

    useEODStore.getState().prevStep()
    expect(useEODStore.getState().currentStep).toBe('returns')

    // Should not go below first step
    useEODStore.getState().prevStep()
    expect(useEODStore.getState().currentStep).toBe('returns')
  })

  it('isFuelLow is true when fuelLevel is 1/4, false otherwise', () => {
    useEODStore.getState().init('internal')

    useEODStore.getState().setFuelLevel('1/4')
    expect(useEODStore.getState().isFuelLow).toBe(true)

    useEODStore.getState().setFuelLevel('1/2')
    expect(useEODStore.getState().isFuelLow).toBe(false)

    useEODStore.getState().setFuelLevel('full')
    expect(useEODStore.getState().isFuelLow).toBe(false)
  })

  it('canEndShift requires fuelLevel, endOdometer, and signatureDataUrl all set', () => {
    useEODStore.getState().init('internal')
    expect(useEODStore.getState().canEndShift).toBe(false)

    useEODStore.getState().setFuelLevel('1/2')
    expect(useEODStore.getState().canEndShift).toBe(false)

    useEODStore.getState().setEndOdometer(50000)
    expect(useEODStore.getState().canEndShift).toBe(false)

    useEODStore.getState().setSignature('data:image/png;base64,...')
    expect(useEODStore.getState().canEndShift).toBe(true)
  })

  it('endShift updates driver_shifts, routes, and inserts shift_returns', async () => {
    useEODStore.getState().init('internal')
    useEODStore.getState().setFuelLevel('1/2')
    useEODStore.getState().setEndOdometer(50000)
    useEODStore.getState().setSignature('data:image/png;base64,...')
    useEODStore.getState().addReturn({
      deliveryId: 'del-1',
      itemId: 'item-1',
      productName: 'Cement 50kg',
      quantity: 10,
      unit: 'bags',
      reason: 'damaged',
      notes: 'Torn bags',
    })

    await useEODStore.getState().endShift('shift-1')

    // Should update driver_shifts
    expect(mockExecute).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE driver_shifts SET ended_at'),
      expect.arrayContaining(['completed', 'shift-1'])
    )

    // Should update routes
    expect(mockExecute).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE routes SET status'),
      expect.arrayContaining(['completed'])
    )

    // Should insert shift_returns
    expect(mockExecute).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO shift_returns'),
      expect.arrayContaining(['shift-1', 'del-1', 'item-1', 'Cement 50kg', 10, 'bags', 'damaged'])
    )
  })

  it('addReturn and removeReturn manage returns array', () => {
    useEODStore.getState().init('internal')

    const item1 = {
      deliveryId: 'del-1',
      itemId: 'item-1',
      productName: 'Rebar 12mm',
      quantity: 5,
      unit: 'tons',
      reason: 'customer_refused' as const,
      notes: '',
    }

    useEODStore.getState().addReturn(item1)
    expect(useEODStore.getState().returns).toHaveLength(1)

    useEODStore.getState().removeReturn(0)
    expect(useEODStore.getState().returns).toHaveLength(0)
  })
})
