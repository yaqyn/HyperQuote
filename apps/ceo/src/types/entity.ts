// ============================================================================
// CEO Entity Types -- 7 entity types for cross-entity search and detail views
// ============================================================================

export type EntityType =
	| 'employee'
	| 'customer'
	| 'order'
	| 'product'
	| 'invoice'
	| 'supplier'
	| 'delivery'

// ============================================================================
// Search
// ============================================================================

export interface SearchResult {
	id: string
	type: EntityType
	title: string
	subtitle: string
	score: number
}

export interface SearchResultGroup {
	type: EntityType
	label: string
	results: SearchResult[]
	total: number
}

// ============================================================================
// Employee
// ============================================================================

export interface EmployeeActivity {
	date: string
	description: string
}

export interface Employee {
	id: string
	name: string
	role: string
	department: string
	joinedDate: string
	phone: string
	email: string
	stats: {
		activeQuotes: number
		pipelineValue: number
		winRate: number
		avgMargin: number
	}
	recentActivity: EmployeeActivity[]
}

// ============================================================================
// Customer
// ============================================================================

export interface CustomerAlert {
	type: string
	description: string
	amount?: number
	date?: string
}

export interface CustomerOrder {
	id: string
	reference: string
	amount: number
	status: string
}

export interface Customer {
	id: string
	name: string
	customerSince: string
	primaryContact: {
		name: string
		phone: string
		email: string
	}
	accountManager: string
	financial: {
		creditLimit: number
		creditUsed: number
		totalAR: number
		overdue: number
	}
	orderHistory: {
		count: number
		totalRevenue: number
		avgOrderValue: number
		avgMargin: number
	}
	recentOrders: CustomerOrder[]
	alerts: CustomerAlert[]
}

// ============================================================================
// Order
// ============================================================================

export interface OrderItem {
	description: string
	quantity: number
	unit: string
}

export interface OrderTimelineEntry {
	date: string
	description: string
}

export interface CEOOrder {
	id: string
	reference: string
	customer: string
	createdDate: string
	status: string
	items: OrderItem[]
	financial: {
		value: number
		margin: number
		invoiceRef: string
		paymentStatus: string
		outstanding: number
		dueDate: string
	}
	delivery: {
		date: string
		driver: string
		pod: string
		deliveryNoteRef: string
	}
	timeline: OrderTimelineEntry[]
}

// ============================================================================
// Invoice
// ============================================================================

export interface InvoicePayment {
	amount: number
	date: string
	method: string
}

export interface Invoice {
	id: string
	reference: string
	customer: string
	issuedDate: string
	dueDate: string
	amount: number
	vat: number
	total: number
	payments: InvoicePayment[]
	outstanding: number
	daysUntilDue: number
	etaSubmission: {
		ref: string
		date: string
	}
}

// ============================================================================
// Supplier
// ============================================================================

export interface Supplier {
	id: string
	name: string
	supplierSince: string
	primaryContact: {
		name: string
		phone: string
	}
	category: string
	performance: {
		totalPOValue: number
		onTimeRate: number
		qualityIssues: number
		activePOs: number
	}
	terms: {
		payment: string
		earlyDiscount: string
		minimumOrder: number
	}
}

// ============================================================================
// Delivery
// ============================================================================

export interface DeliveryTimelineEntry {
	time: string
	description: string
}

export interface DeliveryItem {
	description: string
	delivered: number
	expected: number
	note?: string
}

export interface Delivery {
	id: string
	orderRef: string
	customer: string
	status: string
	driver: string
	vehicle: string
	timeline: DeliveryTimelineEntry[]
	itemsDelivered: DeliveryItem[]
	pod: {
		signedBy: string
		photoCount: number
		condition: string
	}
}

// ============================================================================
// Product
// ============================================================================

export interface ProductTopCustomer {
	name: string
	units: number
}

export interface ProductSupplier {
	name: string
	inStock: boolean
}

export interface Product {
	id: string
	name: string
	category: string
	sku: string
	pricing: {
		lastSupplierCost: number
		avgSellingPrice: number
		avgMargin: number
	}
	movement: {
		unitsSold: number
		revenue: number
		topCustomers: ProductTopCustomer[]
	}
	availability: {
		suppliers: ProductSupplier[]
		leadTime: string
	}
}

// ============================================================================
// Union type for entity detail
// ============================================================================

export type EntityDetail =
	| Employee
	| Customer
	| CEOOrder
	| Invoice
	| Supplier
	| Delivery
	| Product
