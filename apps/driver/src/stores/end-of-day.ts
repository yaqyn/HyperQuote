import { create } from 'zustand'
import { db } from '../lib/powersync'
import { processUploadQueue } from '../lib/upload-queue'

export type EODStep =
	| 'returns'
	| 'fuel'
	| 'post-trip-dvir'
	| 'odometer'
	| 'summary'
	| 'sign-off'

const ALL_STEPS: EODStep[] = [
	'returns',
	'fuel',
	'post-trip-dvir',
	'odometer',
	'summary',
	'sign-off',
]

const EXTERNAL_STEPS: EODStep[] = ['fuel', 'odometer', 'summary', 'sign-off']

export function getStepsForDriverType(driverType: string): EODStep[] {
	if (driverType === 'contracted' || driverType === 'on_demand') {
		return [...EXTERNAL_STEPS]
	}
	return [...ALL_STEPS]
}

export interface ReturnItem {
	deliveryId: string
	itemId: string
	productName: string
	quantity: number
	unit: string
	reason: 'damaged' | 'customer_refused' | 'not_needed' | 'other'
	notes: string
}

export interface ShiftSummary {
	stopsCompleted: number
	stopsFailed: number
	totalKm: number
	totalDriveTime: number
	onTimePercent: number
	exceptionsLogged: number
	returnsCount: number
}

interface EODState {
	currentStep: EODStep
	steps: EODStep[]
	returns: ReturnItem[]
	fuelLevel: '1/4' | '1/2' | '3/4' | 'full' | null
	fuelReceiptPhotoUri: string | null
	endOdometer: number | null
	odometerPhotoUri: string | null
	postTripInspectionId: string | null
	signatureDataUrl: string | null
	shiftSummary: ShiftSummary | null

	// Computed
	isFuelLow: boolean
	canEndShift: boolean

	// Actions
	init: (driverType: string) => void
	nextStep: () => void
	prevStep: () => void
	addReturn: (item: ReturnItem) => void
	removeReturn: (index: number) => void
	setFuelLevel: (level: '1/4' | '1/2' | '3/4' | 'full') => void
	setFuelReceiptPhoto: (uri: string) => void
	setEndOdometer: (reading: number | null) => void
	setOdometerPhoto: (uri: string) => void
	setPostTripInspectionId: (id: string) => void
	setSignature: (dataUrl: string) => void
	loadSummary: (shiftId: string) => Promise<void>
	endShift: (shiftId: string) => Promise<void>
	reset: () => void
}

const initialState = {
	currentStep: 'returns' as EODStep,
	steps: [...ALL_STEPS] as EODStep[],
	returns: [] as ReturnItem[],
	fuelLevel: null as '1/4' | '1/2' | '3/4' | 'full' | null,
	fuelReceiptPhotoUri: null as string | null,
	endOdometer: null as number | null,
	odometerPhotoUri: null as string | null,
	postTripInspectionId: null as string | null,
	signatureDataUrl: null as string | null,
	shiftSummary: null as ShiftSummary | null,
	isFuelLow: false,
	canEndShift: false,
}

function computeDerived(state: typeof initialState) {
	return {
		isFuelLow: state.fuelLevel === '1/4',
		canEndShift:
			state.fuelLevel !== null &&
			state.endOdometer !== null &&
			state.signatureDataUrl !== null,
	}
}

export const useEODStore = create<EODState>((set, get) => ({
	...initialState,

	init: (driverType) => {
		const steps = getStepsForDriverType(driverType)
		set({
			...initialState,
			steps,
			currentStep: steps[0],
		})
	},

	nextStep: () => {
		const { steps, currentStep } = get()
		const idx = steps.indexOf(currentStep)
		if (idx < steps.length - 1) {
			set({ currentStep: steps[idx + 1] })
		}
	},

	prevStep: () => {
		const { steps, currentStep } = get()
		const idx = steps.indexOf(currentStep)
		if (idx > 0) {
			set({ currentStep: steps[idx - 1] })
		}
	},

	addReturn: (item) => set((state) => ({ returns: [...state.returns, item] })),

	removeReturn: (index) =>
		set((state) => ({
			returns: state.returns.filter((_, i) => i !== index),
		})),

	setFuelLevel: (level) => {
		set((state) => {
			const next = { ...state, fuelLevel: level }
			return { fuelLevel: level, ...computeDerived(next) }
		})
	},

	setFuelReceiptPhoto: (uri) => set({ fuelReceiptPhotoUri: uri }),

	setEndOdometer: (reading) => {
		set((state) => {
			const next = { ...state, endOdometer: reading }
			return { endOdometer: reading, ...computeDerived(next) }
		})
	},

	setOdometerPhoto: (uri) => set({ odometerPhotoUri: uri }),

	setPostTripInspectionId: (id) => set({ postTripInspectionId: id }),

	setSignature: (dataUrl) => {
		set((state) => {
			const next = { ...state, signatureDataUrl: dataUrl }
			return { signatureDataUrl: dataUrl, ...computeDerived(next) }
		})
	},

	loadSummary: async (shiftId) => {
		// Load shift summary from PowerSync
		const shifts = await db.getAll<{
			id: string
			start_odometer: number
			end_odometer: number
		}>('SELECT * FROM driver_shifts WHERE id = ?', [shiftId])
		const shift = shifts[0]

		const routes = await db.getAll<{
			id: string
			total_distance_km: number
		}>(
			'SELECT * FROM routes WHERE driver_id = (SELECT driver_id FROM driver_shifts WHERE id = ?)',
			[shiftId],
		)

		const stops = await db.getAll<{ status: string }>(
			'SELECT rs.status FROM route_stops rs JOIN routes r ON rs.route_id = r.id WHERE r.driver_id = (SELECT driver_id FROM driver_shifts WHERE id = ?)',
			[shiftId],
		)

		const exceptions = await db.getAll<{ id: string }>(
			'SELECT id FROM delivery_exceptions WHERE created_at >= (SELECT started_at FROM driver_shifts WHERE id = ?)',
			[shiftId],
		)

		const returns = get().returns

		const totalKm = shift
			? (shift.end_odometer ?? 0) - (shift.start_odometer ?? 0)
			: routes.reduce((sum, r) => sum + (r.total_distance_km ?? 0), 0)

		const stopsCompleted = stops.filter((s) => s.status === 'completed').length
		const stopsFailed = stops.filter((s) => s.status === 'failed').length
		const totalStops = stops.length

		set({
			shiftSummary: {
				stopsCompleted,
				stopsFailed,
				totalKm,
				totalDriveTime: 0, // Calculated from shift start/end
				onTimePercent:
					totalStops > 0 ? Math.round((stopsCompleted / totalStops) * 100) : 0,
				exceptionsLogged: exceptions.length,
				returnsCount: returns.length,
			},
		})
	},

	endShift: async (shiftId) => {
		const state = get()
		const now = new Date().toISOString()

		// Update driver_shifts with end data
		await db.execute(
			'UPDATE driver_shifts SET ended_at = ?, end_odometer = ?, status = ? WHERE id = ?',
			[now, state.endOdometer ?? 0, 'completed', shiftId],
		)

		// Update routes to completed
		await db.execute(
			'UPDATE routes SET status = ?, actual_finish = ? WHERE driver_id = (SELECT driver_id FROM driver_shifts WHERE id = ?)',
			['completed', now, shiftId],
		)

		// Insert shift returns
		for (const ret of state.returns) {
			await db.execute(
				`INSERT INTO shift_returns (id, shift_id, delivery_id, delivery_item_id, product_name, quantity, unit, reason, linked_exception_id, notes, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
				[
					crypto.randomUUID(),
					shiftId,
					ret.deliveryId,
					ret.itemId,
					ret.productName,
					ret.quantity,
					ret.unit,
					ret.reason,
					'',
					ret.notes,
					now,
				],
			)
		}

		// Attempt to push queued uploads
		try {
			await processUploadQueue()
		} catch {
			// Upload will retry on next sync
		}
	},

	reset: () => set(initialState),
}))
