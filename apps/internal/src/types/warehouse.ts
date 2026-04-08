// Warehouse domain types — contracts for the entire warehouse module
// Receiving, putaway, picking, staging, cycle count, inventory, and yard management

// ─── Status Unions ────────────────────────────────────────

export type WarehouseTab =
  | 'inbound'
  | 'outbound'
  | 'inventory'
  | 'yard'

export type InboundView = 'list' | 'receiving' | 'putaway'
export type OutboundView = 'queue' | 'picking' | 'staging' | 'verification'

export type DeliveryStatus =
  | 'scheduled'
  | 'confirmed'
  | 'in_transit'
  | 'arrived'
  | 'receiving'
  | 'complete'

export type ItemCondition = 'good' | 'minor_damage' | 'major_damage' | 'rejected'

export type DiscrepancyReason =
  | 'supplier_short'
  | 'damaged_in_transit'
  | 'wrong_product'
  | 'wrong_specification'
  | 'overshipment'

export type PutawayOverrideReason = 'location_full' | 'blocked' | 'equipment_issue'

export type PickException = 'short_pick' | 'skip' | 'substitute'

export type ABCClass = 'A' | 'B' | 'C'

export type LoadVerificationStep =
  | 'scan_truck'
  | 'scan_items'
  | 'verify_weight'
  | 'photos'
  | 'sign_off'

export type CycleCountStatus =
  | 'assigned'
  | 'counting'
  | 'submitted'
  | 'recount_requested'
  | 'approved'
  | 'investigating'

export type CountVarianceReason =
  | 'receiving_error'
  | 'pick_error'
  | 'damage_unrecorded'
  | 'theft'
  | 'miscount'
  | 'location_error'

export type YardZoneStatus = 'low' | 'medium' | 'high'

export type MaterialCategory =
  | 'cement'
  | 'steel_rebar'
  | 'lumber'
  | 'aggregates'
  | 'pipe'
  | 'roofing'
  | 'insulation'

// ─── Receiving ────────────────────────────────────────────

export interface ExpectedDelivery {
  id: string
  /** Geist Mono */ poNumber: string
  supplierName: string
  /** Geist Mono */ eta: string
  truckType: string
  /** Geist Mono */ lineItemCount: number
  status: DeliveryStatus
  assignedDock: string
  /** Geist Mono */ receivingProgress: number
}

export interface ReceivingLine {
  id: string
  materialName: string
  specification: string
  /** Geist Mono */ expectedQty: number
  /** Geist Mono */ receivedQty: number
  condition: ItemCondition
  lotNumber: string
  heatNumber: string
  suggestedLocation: string
  photoUrls: string[]
  note: string
  /** Geist Mono */ variancePercent: number
}

export interface BulkReceivingState {
  /** Geist Mono */ grossWeight: number
  /** Geist Mono */ tareWeight: number
  /** Geist Mono — computed: grossWeight - tareWeight */ netWeight: number
  /** Geist Mono */ previouslyReceived: number
  /** Geist Mono */ poTotal: number
  /** Geist Mono */ remaining: number
  unit: 'tons' | 'tonnes' | 'kg'
}

export interface QualityChecklistItem {
  id: string
  label: string
  checked: boolean
  required: boolean
}

// ─── Putaway ──────────────────────────────────────────────

export interface PutawayTask {
  id: string
  /** Geist Mono */ taskNumber: number
  /** Geist Mono */ totalTasks: number
  productName: string
  /** Geist Mono */ quantity: number
  lotNumber: string
  manufactureDate: string
  expiryDate: string
  fromLocation: string
  toLocation: string
  overrideReason?: PutawayOverrideReason
}

// ─── Picking ──────────────────────────────────────────────

export interface PickOrder {
  id: string
  /** Geist Mono */ soNumber: string
  customerName: string
  /** Geist Mono */ shippingDeadline: string
  assignedTruck: string
  assignedRoute: string
  /** Geist Mono */ itemCount: number
  /** Geist Mono */ totalWeightKg: number
  priority: 'urgent' | 'today' | 'upcoming'
}

export interface PickStep {
  id: string
  /** Geist Mono */ stepNumber: number
  /** Geist Mono */ totalSteps: number
  locationPath: string
  productName: string
  sku: string
  lotNumber: string
  expiryDate: string
  /** Geist Mono */ quantityToPick: number
  fefoEnforced: boolean
}

export interface WeightTracker {
  /** Geist Mono */ currentWeightKg: number
  /** Geist Mono */ maxCapacityKg: number
  /** Geist Mono */ percentLoaded: number
}

// ─── Staging ──────────────────────────────────────────────

export interface StagingStop {
  /** Geist Mono */ stopNumber: number
  customerName: string
  items: StagingItem[]
}

export interface StagingItem {
  id: string
  name: string
  barcode: string
  scanned: boolean
}

export interface LoadVerificationState {
  currentStep: LoadVerificationStep
  truckScanned: boolean
  /** Geist Mono */ itemsScanned: number
  /** Geist Mono */ totalItems: number
  /** Geist Mono */ expectedWeightKg: number
  /** Geist Mono */ actualWeightKg: number
  /** Geist Mono */ weightVariancePercent: number
  photos: { rear: boolean; side: boolean; seal: boolean }
  driverSigned: boolean
  loaderSigned: boolean
  blocked: boolean
  blockReasons: string[]
}

// ─── Cycle Count ──────────────────────────────────────────

export interface CycleCountAssignment {
  id: string
  locationCode: string
  /** Geist Mono */ countNumber: number
  /** Geist Mono */ totalCounts: number
  items: CycleCountItem[]
}

/** Deliberately excludes system quantity — blind count prevents bias */
export interface CycleCountItem {
  productId: string
  productName: string
  sku: string
  lotNumber: string
}

export interface CycleCountResult {
  productId: string
  /** Geist Mono */ physicalCount: number
  /** Geist Mono */ systemQty: number
  /** Geist Mono */ variance: number
  /** Geist Mono */ variancePercent: number
  abcClass: ABCClass
  /** Geist Mono */ threshold: number
  needsRecount: boolean
}

export interface SupervisorApproval {
  countId: string
  location: string
  productName: string
  /** Geist Mono */ systemQty: number
  /** Geist Mono */ initialCount: number
  /** Geist Mono */ recountQty: number
  /** Geist Mono */ variance: number
  /** Geist Mono */ variancePercent: number
  recentMovements: StockMovement[]
  /** Geist Mono */ financialImpact: number
}

// ─── Inventory ────────────────────────────────────────────

export interface InventoryItem {
  id: string
  productName: string
  sku: string
  locationCode: string
  warehouseName: string
  lotNumber: string
  expiryDate: string
  /** Geist Mono */ daysRemaining: number
  /** Geist Mono */ quantityOnHand: number
  /** Geist Mono */ quantityReserved: number
  /** Geist Mono */ quantityAvailable: number
  condition: ItemCondition
  /** Geist Mono */ reorderPoint: number
  /** Geist Mono */ daysOfSupply: number
  photoUrl: string
}

export interface StockMovement {
  id: string
  type: 'receive' | 'pick' | 'putaway' | 'adjustment' | 'transfer'
  /** Geist Mono */ quantity: number
  timestamp: string
  reference: string
}

// ─── Yard ─────────────────────────────────────────────────

export interface YardZone {
  id: string
  name: string
  /** Geist Mono */ capacityPercent: number
  status: YardZoneStatus
  inventorySummary: string
  lastActivity: string
  /** Geist Mono */ maxCapacity: number
  /** Geist Mono */ currentUsage: number
}

export interface WeatherAlert {
  id: string
  type: 'khamsin' | 'rain' | 'wind' | 'heat'
  severity: 'warning' | 'critical'
  /** Geist Mono */ windSpeedKmh: number
  sheetDeliveryBlocked: boolean
  outdoorOpsPaused: boolean
  message: string
  recommendation: string
}

// ─── Vehicle Tracking ────────────────────────────────────

export type VehicleType = 'truck' | 'moffett' | 'crane' | 'other'

export interface VehicleEntry {
  id: string
  /** Geist Mono */ plateNumber: string
  vehicleType: VehicleType
  zoneId: string
  zoneName: string
  /** Geist Mono */ arrivedAt: string
  notes?: string
}

// ─── Dashboard ────────────────────────────────────────────

export interface WarehouseDashboard {
  /** Geist Mono */ pendingReceiving: number
  /** Geist Mono */ pendingPutaway: number
  /** Geist Mono */ pendingPicking: number
  /** Geist Mono */ pendingLoading: number
  /** Geist Mono */ pendingCounts: number
  /** Geist Mono */ pendingTransfers: number
  /** Geist Mono */ criticalAlerts: number
  /** Geist Mono */ pendingReturns: number
  /** Geist Mono */ pickAccuracy: number
  /** Geist Mono */ onTimeShipment: number
  /** Geist Mono */ receivingCycleTime: number
  /** Geist Mono */ inventoryAccuracy: number
  /** Geist Mono */ workersActive: number
  /** Geist Mono */ totalWorkers: number
  /** Geist Mono */ forkliftOpsAvailable: number
  /** Geist Mono */ tasksCompleted: number
  /** Geist Mono */ tasksTotal: number
  inventoryValue: {
    /** Geist Mono */ onHand: number
    /** Geist Mono */ reserved: number
    /** Geist Mono */ available: number
    /** Geist Mono */ onHold: number
  }
}

export interface WarehouseTile {
  key: string
  labelKey: string
  badgeField: keyof WarehouseDashboard
  urgent: boolean
}
