// Dispatch domain types — contracts for the entire dispatch module
// Routes, vehicles, drivers, deliveries, POD, GPS, and constraints

// ─── Tab Navigation ──────────────────────────────────────

export type DispatchTab =
  | 'home'
  | 'route-planning'
  | 'live-map'
  | 'driver-management'
  | 'delivery-log'

// ─── Status Unions ───────────────────────────────────────

export type VehicleStatus =
  | 'loading'
  | 'transit'
  | 'at_site'
  | 'delivered'
  | 'problem'
  | 'offline'

export type DriverType = 'INTERNAL' | 'CONTRACTED' | 'ON_DEMAND'

export type ComplianceStatus = 'valid' | 'expiring' | 'expired' | 'blocked'

export type RouteStopStatus =
  | 'pending'
  | 'en_route'
  | 'arrived'
  | 'delivered'
  | 'failed'

export type RouteStatus =
  | 'draft'
  | 'assigned'
  | 'in_progress'
  | 'completed'
  | 'cancelled'

// ─── Route Planning ──────────────────────────────────────

export interface RouteStop {
  id: string
  deliveryId: string
  orderId: string
  customerName: string
  address: string
  lat: number
  lng: number
  /** Geist Mono */ weight: number
  equipmentNeeded: 'none' | 'moffett' | 'boom' | 'crane'
  timeWindow: { start: string; end: string }
  /** Geist Mono */ sequence: number
  status: RouteStopStatus
}

export interface DeliveryRoute {
  id: string
  driverId: string
  vehicleId: string
  stops: RouteStop[]
  date: string
  status: RouteStatus
  /** Geist Mono */ totalWeight: number
  /** Geist Mono */ totalDistance: number
  /** Geist Mono */ estimatedDuration: number
}

// ─── Vehicles ────────────────────────────────────────────

export interface Vehicle {
  id: string
  plateNumber: string
  type: string
  /** Geist Mono */ capacityKg: number
  hasEquipment: {
    moffett: boolean
    boom: boolean
    crane: boolean
  }
  currentDriverId: string | null
  status: VehicleStatus
}

// ─── Drivers ─────────────────────────────────────────────

export interface Driver {
  id: string
  name: string
  type: DriverType
  phone: string
  vehicleId: string | null
  licenseExpiry: string
  medicalExpiry: string
  certifications: string[]
  complianceStatus: ComplianceStatus
  activeRouteId: string | null
  available: boolean
}

export interface ComplianceItem {
  type: string
  label: string
  expiryDate: string
  status: 'valid' | 'expiring' | 'expired'
}

// ─── GPS & Live Tracking ─────────────────────────────────

export interface GPSPosition {
  driverId: string
  lat: number
  lng: number
  /** Geist Mono */ speed: number
  /** Geist Mono */ heading: number
  timestamp: string
  status: VehicleStatus
}

// ─── Proof of Delivery ───────────────────────────────────

export interface PODRecord {
  id: string
  deliveryId: string
  driverId: string
  photos: string[]
  signatureUrl: string
  gpsLat: number
  gpsLng: number
  timestamp: string
  deliveredQty: Record<string, number>
  driverNotes: string
  /** Geist Mono */ durationMinutes: number
  autoChecksPassed: boolean
}

export interface PODValidationChecklist {
  photosOk: boolean
  signatureOk: boolean
  quantitiesOk: boolean
  gpsOk: boolean
  noDamage: boolean
}

// ─── Delivery Issues ─────────────────────────────────────

export interface DeliveryIssue {
  id: string
  deliveryId: string
  type:
    | 'partial'
    | 'damage'
    | 'wrong_items'
    | 'signature_issue'
    | 'customer_unavailable'
    | 'access_denied'
    | 'other'
  description: string
  photos: string[]
}

// ─── Performance ─────────────────────────────────────────

export interface DriverPerformance {
  driverId: string
  /** Geist Mono */ onTimeRate: number
  /** Geist Mono */ podComplianceRate: number
  /** Geist Mono */ damageRate: number
  /** Geist Mono */ avgDeliveriesPerDay: number
  /** Geist Mono */ avgDeliveryDuration: number
}

// ─── Constraints ─────────────────────────────────────────

export type ConstraintType =
  | 'cairo_ban'
  | 'prayer_time'
  | 'jumuah'
  | 'khamsin'
  | 'equipment'
  | 'cdl'
  | 'capacity'

export interface ConstraintViolation {
  type: ConstraintType
  message: string
  severity: 'error' | 'warning'
}

export interface PrayerTime {
  name: string
  time: Date
}

// ─── VRP (Vehicle Routing Problem) ───────────────────────

export interface VRPResult {
  optimizedStops: RouteStop[]
  /** Geist Mono */ estimatedDuration: number
  /** Geist Mono */ estimatedDistance: number
  /** Geist Mono */ timeWindowViolations: number
}
