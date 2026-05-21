export function hoursSince(iso: string): number {
	return (Date.now() - new Date(iso).getTime()) / 3_600_000
}

export type JsonValue =
	| string
	| number
	| boolean
	| null
	| JsonValue[]
	| { [key: string]: JsonValue }

export type JsonObject = { [key: string]: JsonValue }

export type SupplierTier = 'preferred' | 'approved' | 'conditional' | 'new'
type SupplierStatus = 'active' | 'inactive' | 'blocked'

export interface SupplierRow {
	id: string
	name: string
	email: string | null
	status: SupplierStatus
	tier: SupplierTier
	paymentTerms: string
	phone: string | null
	rating: number
	customBadges: string[]
	notes: string | null
	joinedAt: string
}

export interface SupplierPriceRow {
	id: string
	productSlug: string
	supplierId: string
	supplierName: string
	rawCost: number
	leadTimeDays: number
	minOrderQty: number
	lastQuotedAt: string
	isPrimary: boolean
	notes: string | null
}

export interface CustomerRow {
	id: string
	userId: string | null
	companyName: string
	tier: 'A' | 'B' | 'C' | 'new'
	status: 'unclaimed' | 'claimed' | 'active' | 'inactive'
	tradeLicenseStatus: 'not_uploaded' | 'under_review' | 'approved' | 'rejected'
	profilePhotoUrl: string | null
	createdByEmployeeId: string | null
	contactName: string
	phone: string
	email: string | null
	addressId: string | null
	addressLabel: string
	address: string
	street: string
	area: string
	city: string
	governorate: string
	landmark: string
	addressPhone: string
	postalCode: string
	latitude: number | null
	longitude: number | null
	isDefault: boolean
	creditLimit: number
	currentExposure: number
	orderCount: number
	lifetimeValue: number
	avgMargin: number
	paymentHistory: 'excellent' | 'good' | 'fair' | 'poor'
	assignedSalesRep: string | null
	joinedAt: string
}

export type PaymentStatus = 'unpaid' | 'partial' | 'paid'

export type OrderReportStage =
	| 'submitted'
	| 'evaluated'
	| 'finance_partial'
	| 'inventory_orders'
	| 'finance_full'
	| 'warehouse'
	| 'dispatch'
	| 'delivered'
	| 'canceled'
	| 'returned'

type TruckStatus = 'available' | 'loading' | 'dispatched' | 'maintenance'
type TruckBodyType = 'flatbed' | 'curtain-side' | 'box' | 'tipper'

type DriverStatus =
	| 'invited'
	| 'available'
	| 'on_delivery'
	| 'offline'
	| 'disabled'

export interface DriverRow {
	id: string
	userId: string | null
	fullName: string
	email: string | null
	phone: string
	status: DriverStatus
	vehicleLabel: string | null
	createdAt: string
}

export interface TruckRow {
	id: string
	plateNumber: string
	driverId: string | null
	driverName: string | null
	capacityTons: number
	bodyType: TruckBodyType
	status: TruckStatus
	createdAt: string
}
