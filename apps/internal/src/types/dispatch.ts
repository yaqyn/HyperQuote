// Dispatch domain types — fleet, routing, drivers, GPS, and constraint validators

// ─── Driver ──────────────────────────────────────────────

export type DriverType = 'INTERNAL' | 'CONTRACTED' | 'ON_DEMAND'

export type DriverComplianceStatus = 'valid' | 'warning' | 'expired'

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

export type VehicleType = 'truck' | 'van' | 'flatbed' | 'tanker'

export type VehicleStatus =
	| 'idle'
	| 'loading'
	| 'in_transit'
	| 'unloading'
	| 'maintenance'

export interface VehicleEquipment {
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

export type EquipmentNeeded = 'none' | 'moffett' | 'boom' | 'crane' | 'forklift'

export type RouteStopStatus =
	| 'pending'
	| 'en_route'
	| 'arrived'
	| 'delivered'
	| 'failed'
	| 'canceled'

export interface TimeWindow {
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

// ─── GPS ─────────────────────────────────────────────────

type GPSStatus = 'active' | 'idle' | 'stopped' | 'offline'

interface GPSPosition {
	driverId: string
	lat: number
	lng: number
	speed: number
	heading: number
	timestamp: string
	status: GPSStatus | string
}

// ─── Prayer Times ────────────────────────────────────────

export interface PrayerTime {
	name: string
	time: Date
}

// ─── Constraint Validation ───────────────────────────────

export type ConstraintViolationType =
	| 'cairo_ban'
	| 'equipment'
	| 'jumuah'
	| 'khamsin'
	| 'prayer_time'
	| 'cdl'
	| 'capacity'

export type ConstraintSeverity = 'error' | 'warning'

export interface ConstraintViolation {
	type: ConstraintViolationType
	message: string
	severity: ConstraintSeverity
}
