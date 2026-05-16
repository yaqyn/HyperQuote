// Dispatch domain types — fleet, routing, drivers, GPS, and constraint validators

// ─── Driver ──────────────────────────────────────────────

export type DriverType = 'INTERNAL' | 'CONTRACTED' | 'ON_DEMAND'

type DriverComplianceStatus = 'valid' | 'warning' | 'expired'

export interface Driver {
	id: string
	name: string
	type: DriverType
	phone: string
	vehicleId: string | null
	licenseExpiry: string
	medicalExpiry: string
	certifications: string[]
	complianceStatus: DriverComplianceStatus
	activeRouteId: string | null
	available: boolean
}

// ─── Vehicle ─────────────────────────────────────────────

type VehicleType = 'truck' | 'van' | 'flatbed' | 'tanker'

type VehicleStatus =
	| 'idle'
	| 'loading'
	| 'in_transit'
	| 'unloading'
	| 'maintenance'

interface VehicleEquipment {
	moffett: boolean
	boom: boolean
	crane: boolean
}

export interface Vehicle {
	id: string
	plateNumber: string
	type: VehicleType
	capacityKg: number
	hasEquipment: VehicleEquipment
	currentDriverId: string | null
	status: VehicleStatus
}

// ─── Route ───────────────────────────────────────────────

type EquipmentNeeded = 'none' | 'moffett' | 'boom' | 'crane' | 'forklift'

type RouteStopStatus =
	| 'pending'
	| 'en_route'
	| 'arrived'
	| 'delivered'
	| 'failed'
	| 'canceled'

interface TimeWindow {
	start: string
	end: string
}

export interface RouteStop {
	id: string
	deliveryId: string
	orderId: string
	customerName: string
	address: string
	lat: number
	lng: number
	weight: number
	equipmentNeeded: EquipmentNeeded | string
	timeWindow: TimeWindow
	sequence: number
	status: RouteStopStatus
}

// ─── Prayer Times ────────────────────────────────────────

export interface PrayerTime {
	name: string
	time: Date
}

// ─── Constraint Validation ───────────────────────────────

type ConstraintViolationType =
	| 'cairo_ban'
	| 'equipment'
	| 'jumuah'
	| 'khamsin'
	| 'prayer_time'
	| 'cdl'
	| 'capacity'

type ConstraintSeverity = 'error' | 'warning'

export interface ConstraintViolation {
	type: ConstraintViolationType
	message: string
	severity: ConstraintSeverity
}
