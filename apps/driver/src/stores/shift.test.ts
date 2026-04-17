import { beforeEach, describe, expect, it } from 'vitest'
import { DVIR_ITEMS, useShiftStore } from './shift'

describe('shift store', () => {
	beforeEach(() => {
		useShiftStore.getState().resetShift()
	})

	it('initializes with shiftStep health-check and empty inspectionItems populated', () => {
		const state = useShiftStore.getState()
		expect(state.shiftStep).toBe('health-check')
		expect(state.inspectionItems).toHaveLength(10)
	})

	it('has all 10 DVIR items defined with correct names and order', () => {
		expect(DVIR_ITEMS).toHaveLength(10)
		expect(DVIR_ITEMS.map((i) => i.name)).toEqual([
			'Tires',
			'Lights',
			'Mirrors',
			'Brakes',
			'Fluid Levels',
			'Horn & Wipers',
			'Fire Extinguisher',
			'Load Securement Equipment',
			'Cab Condition',
			'Moffett/Specialized Equipment',
		])
		// Verify order is sequential 1-10
		DVIR_ITEMS.forEach((item, idx) => {
			expect(item.itemOrder).toBe(idx + 1)
		})
	})

	it('setInspectionItemStatus updates correct item by name', () => {
		useShiftStore.getState().setInspectionItemStatus('Tires', 'pass')
		const item = useShiftStore
			.getState()
			.inspectionItems.find((i) => i.name === 'Tires')
		expect(item?.status).toBe('pass')

		// Other items remain null
		const brakes = useShiftStore
			.getState()
			.inspectionItems.find((i) => i.name === 'Brakes')
		expect(brakes?.status).toBeNull()
	})

	it('hasMajorDefect returns true when any item has severity major and status fail', () => {
		const store = useShiftStore.getState()
		store.setInspectionItemStatus('Brakes', 'fail')
		store.setInspectionItemSeverity('Brakes', 'major')
		expect(useShiftStore.getState().hasMajorDefect).toBe(true)
	})

	it('hasMajorDefect returns false when fail item has minor severity', () => {
		const store = useShiftStore.getState()
		store.setInspectionItemStatus('Brakes', 'fail')
		store.setInspectionItemSeverity('Brakes', 'minor')
		expect(useShiftStore.getState().hasMajorDefect).toBe(false)
	})

	it('canComplete returns false when any item has status null (unchecked)', () => {
		// All items start as null
		expect(useShiftStore.getState().canComplete).toBe(false)

		// Complete 9 items
		const store = useShiftStore.getState()
		const items = store.inspectionItems
		items.slice(0, 9).forEach((item) => {
			store.setInspectionItemStatus(item.name, 'pass')
		})
		expect(useShiftStore.getState().canComplete).toBe(false)
	})

	it('canComplete returns true when all items have non-null status', () => {
		const store = useShiftStore.getState()
		store.inspectionItems.forEach((item) => {
			store.setInspectionItemStatus(item.name, 'pass')
		})
		expect(useShiftStore.getState().canComplete).toBe(true)
	})

	it('completedCount and progress track correctly', () => {
		expect(useShiftStore.getState().completedCount).toBe(0)
		expect(useShiftStore.getState().progress).toBe(0)

		const store = useShiftStore.getState()
		store.setInspectionItemStatus('Tires', 'pass')
		store.setInspectionItemStatus('Lights', 'fail')
		store.setInspectionItemStatus('Mirrors', 'na')

		expect(useShiftStore.getState().completedCount).toBe(3)
		expect(useShiftStore.getState().progress).toBeCloseTo(0.3)
	})

	it('resetShift clears all state', () => {
		const store = useShiftStore.getState()
		store.setShiftStep('inspection')
		store.setOdometerReading(12345)
		store.setGpsConsented(true)
		store.setInspectionItemStatus('Tires', 'pass')

		store.resetShift()
		const reset = useShiftStore.getState()
		expect(reset.shiftStep).toBe('health-check')
		expect(reset.odometerReading).toBeNull()
		expect(reset.gpsConsented).toBe(false)
		expect(reset.inspectionItems.every((i) => i.status === null)).toBe(true)
	})
})
