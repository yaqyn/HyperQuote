import { create } from 'zustand'
import { db } from '../lib/powersync'

export type ShiftStep =
	| 'health-check'
	| 'vehicle-select'
	| 'inspection'
	| 'odometer'
	| 'gps-consent'
	| 'sign-off'
	| 'complete'

export interface InspectionItem {
	name: string
	itemOrder: number
	status: 'pass' | 'fail' | 'na' | null
	severity: 'minor' | 'major' | null
	notes: string
	photoUri: string | null
}

export interface HealthCheckResult {
	battery: { level: number; ok: boolean; warning: boolean }
	gps: { permitted: boolean; blocked: boolean }
	camera: { permitted: boolean; warning: boolean }
	appVersion: { current: string; ok: boolean; blocked: boolean }
}

export interface Vehicle {
	id: string
	plate_number: string
	type: string
	make: string
	model: string
	year: string
	status: string
	capacity_kg: string
	capacity_m3: string
	moffett_equipped: string
	assigned_driver_id?: string
}

export const DVIR_ITEMS: readonly { name: string; itemOrder: number }[] = [
	{ name: 'Tires', itemOrder: 1 },
	{ name: 'Lights', itemOrder: 2 },
	{ name: 'Mirrors', itemOrder: 3 },
	{ name: 'Brakes', itemOrder: 4 },
	{ name: 'Fluid Levels', itemOrder: 5 },
	{ name: 'Horn & Wipers', itemOrder: 6 },
	{ name: 'Fire Extinguisher', itemOrder: 7 },
	{ name: 'Load Securement Equipment', itemOrder: 8 },
	{ name: 'Cab Condition', itemOrder: 9 },
	{ name: 'Moffett/Specialized Equipment', itemOrder: 10 },
] as const

function createInitialInspectionItems(): InspectionItem[] {
	return DVIR_ITEMS.map((item) => ({
		name: item.name,
		itemOrder: item.itemOrder,
		status: null,
		severity: null,
		notes: '',
		photoUri: null,
	}))
}

interface ShiftState {
	shiftStep: ShiftStep
	selectedVehicle: Vehicle | null
	inspectionItems: InspectionItem[]
	odometerReading: number | null
	odometerPhotoUri: string | null
	gpsConsented: boolean
	signatureDataUrl: string | null
	gpsLocation: { lat: number; lng: number } | null
	healthCheck: HealthCheckResult | null
	activeShiftId: string | null

	// Computed (derived as getters)
	hasMajorDefect: boolean
	canComplete: boolean
	completedCount: number
	progress: number

	// Actions
	setShiftStep: (step: ShiftStep) => void
	setSelectedVehicle: (vehicle: Vehicle | null) => void
	setInspectionItemStatus: (
		name: string,
		status: 'pass' | 'fail' | 'na',
	) => void
	setInspectionItemSeverity: (name: string, severity: 'minor' | 'major') => void
	setInspectionItemPhoto: (name: string, uri: string | null) => void
	setInspectionItemNotes: (name: string, notes: string) => void
	setOdometerReading: (reading: number | null) => void
	setOdometerPhoto: (uri: string | null) => void
	setGpsConsented: (consented: boolean) => void
	setSignature: (dataUrl: string | null) => void
	setGpsLocation: (location: { lat: number; lng: number } | null) => void
	setHealthCheck: (result: HealthCheckResult | null) => void
	resetShift: () => void
	submitInspection: () => Promise<string>
	startShift: (inspectionId: string) => Promise<void>
}

function computeDerived(items: InspectionItem[]) {
	const hasMajorDefect = items.some(
		(item) => item.status === 'fail' && item.severity === 'major',
	)
	const canComplete = items.every((item) => item.status !== null)
	const completedCount = items.filter((item) => item.status !== null).length
	const progress = completedCount / 10
	return { hasMajorDefect, canComplete, completedCount, progress }
}

function updateItem(
	items: InspectionItem[],
	name: string,
	updater: (item: InspectionItem) => InspectionItem,
): InspectionItem[] {
	return items.map((item) => (item.name === name ? updater(item) : item))
}

const initialState = {
	shiftStep: 'health-check' as ShiftStep,
	selectedVehicle: null as Vehicle | null,
	inspectionItems: createInitialInspectionItems(),
	odometerReading: null as number | null,
	odometerPhotoUri: null as string | null,
	gpsConsented: false,
	signatureDataUrl: null as string | null,
	gpsLocation: null as { lat: number; lng: number } | null,
	healthCheck: null as HealthCheckResult | null,
	activeShiftId: null as string | null,
}

export const useShiftStore = create<ShiftState>((set, get) => ({
	...initialState,
	...computeDerived(initialState.inspectionItems),

	setShiftStep: (step) => set({ shiftStep: step }),

	setSelectedVehicle: (vehicle) => set({ selectedVehicle: vehicle }),

	setInspectionItemStatus: (name, status) => {
		const items = updateItem(get().inspectionItems, name, (item) => ({
			...item,
			status,
			// Clear severity if not fail
			severity: status === 'fail' ? item.severity : null,
		}))
		set({ inspectionItems: items, ...computeDerived(items) })
	},

	setInspectionItemSeverity: (name, severity) => {
		const items = updateItem(get().inspectionItems, name, (item) => ({
			...item,
			severity,
		}))
		set({ inspectionItems: items, ...computeDerived(items) })
	},

	setInspectionItemPhoto: (name, uri) => {
		const items = updateItem(get().inspectionItems, name, (item) => ({
			...item,
			photoUri: uri,
		}))
		set({ inspectionItems: items })
	},

	setInspectionItemNotes: (name, notes) => {
		const items = updateItem(get().inspectionItems, name, (item) => ({
			...item,
			notes,
		}))
		set({ inspectionItems: items })
	},

	setOdometerReading: (reading) => set({ odometerReading: reading }),
	setOdometerPhoto: (uri) => set({ odometerPhotoUri: uri }),
	setGpsConsented: (consented) => set({ gpsConsented: consented }),
	setSignature: (dataUrl) => set({ signatureDataUrl: dataUrl }),
	setGpsLocation: (location) => set({ gpsLocation: location }),
	setHealthCheck: (result) => set({ healthCheck: result }),

	resetShift: () => {
		const items = createInitialInspectionItems()
		set({
			...initialState,
			inspectionItems: items,
			...computeDerived(items),
		})
	},

	submitInspection: async () => {
		const state = get()
		const inspectionId = crypto.randomUUID()
		const now = new Date().toISOString()

		await db.execute(
			`INSERT INTO vehicle_inspections (id, vehicle_id, driver_id, inspection_type, status, odometer_reading, signature_url, gps_lat, gps_lng, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			[
				inspectionId,
				state.selectedVehicle?.id ?? '',
				'', // driver_id from auth
				'pre-trip',
				state.hasMajorDefect ? 'failed' : 'passed',
				state.odometerReading ?? 0,
				state.signatureDataUrl ?? '',
				state.gpsLocation?.lat ?? 0,
				state.gpsLocation?.lng ?? 0,
				'',
				now,
			],
		)

		// Insert each inspection item
		for (const item of state.inspectionItems) {
			await db.execute(
				`INSERT INTO vehicle_inspection_items (id, inspection_id, item_name, item_order, status, severity, notes, photo_url)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
				[
					crypto.randomUUID(),
					inspectionId,
					item.name,
					item.itemOrder,
					item.status ?? '',
					item.severity ?? '',
					item.notes,
					item.photoUri ?? '',
				],
			)
		}

		return inspectionId
	},

	startShift: async (inspectionId) => {
		const state = get()
		const shiftId = crypto.randomUUID()
		const now = new Date().toISOString()

		await db.execute(
			`INSERT INTO driver_shifts (id, driver_id, vehicle_id, inspection_id, started_at, status, start_odometer, start_location)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
			[
				shiftId,
				'', // driver_id from auth
				state.selectedVehicle?.id ?? '',
				inspectionId,
				now,
				'active',
				state.odometerReading ?? 0,
				state.gpsLocation ? JSON.stringify(state.gpsLocation) : '',
			],
		)

		set({ activeShiftId: shiftId, shiftStep: 'complete' })
	},
}))
