// =============================================================================
// Auth & System Enums
// =============================================================================

import type { Database } from './database.types'

type DbEnum<Name extends keyof Database['public']['Enums']> =
	Database['public']['Enums'][Name]

export type AccountType = DbEnum<'account_type'>
export type ProfileStatus = DbEnum<'profile_status'>
export type CustomerStatus = DbEnum<'customer_status'>
export type TradeLicenseStatus = DbEnum<'trade_license_status'>
export type EmployeeRole = DbEnum<'employee_role'>
export type EmployeePanel = DbEnum<'employee_panel'>
export type DriverStatus = DbEnum<'driver_status'>
export type UserProfileType = DbEnum<'user_profile_type'>
export type BackendUserRole = DbEnum<'user_role'>
export type SupplierStatus = DbEnum<'supplier_status'>
export type CatalogAvailabilityStatus = DbEnum<'catalog_availability_status'>
export type PriceUpdateRequestStatus = DbEnum<'price_update_request_status'>
export type QuoteRequestUrgency = DbEnum<'quote_request_urgency'>
export type SalesQuoteVersionStatus = DbEnum<'sales_quote_version_status'>
export type QuoteItemLineStatus = DbEnum<'quote_item_line_status'>
export type QuoteCounterType = DbEnum<'quote_counter_type'>
export type OrderWorkflowStatus = DbEnum<'order_workflow_status'>
export type InventoryReservationStatus = DbEnum<'inventory_reservation_status'>
export type RefillRequestStatus = DbEnum<'refill_request_status'>
export type PaymentRecordStatus = DbEnum<'payment_record_status'>
export type TruckStatus = DbEnum<'truck_status'>
export type LoadingTaskStatus = DbEnum<'loading_task_status'>
export type ReceivingTaskStatus = DbEnum<'receiving_task_status'>
export type DriverOnlineStatus = DbEnum<'driver_online_status'>
export type DriverLocationSource = DbEnum<'driver_location_source'>
export type DeliveryProofType = DbEnum<'delivery_proof_type'>
export type SupportTicketStatus = DbEnum<'support_ticket_status'>
export type SupportTicketSource = DbEnum<'support_ticket_source'>
export type SupportChannel = DbEnum<'support_channel'>
export type SupportConversationStatus = DbEnum<'support_conversation_status'>
export type SupportSenderType = DbEnum<'support_sender_type'>
export type SupportMessageChannel = DbEnum<'support_message_channel'>
export type BackendDocumentType = DbEnum<'document_type'>
export type AiAgentScope = DbEnum<'ai_agent_scope'>
export type AuditEventType = DbEnum<'audit_event_type'>

export type AppRole =
	| 'super_admin'
	| 'admin'
	| 'operations_manager'
	| 'sales_manager'
	| 'sales_rep'
	| 'procurement_manager'
	| 'procurement_agent'
	| 'warehouse_manager'
	| 'warehouse_staff'
	| 'logistics_manager'
	| 'logistics_coordinator'
	| 'driver'
	| 'finance_manager'
	| 'finance_accountant'
	| 'finance_clerk'
	| 'hr_manager'
	| 'hr_staff'
	| 'support_manager'
	| 'support_agent'
	| 'customer_admin'
	| 'customer_user'
	| 'supplier_contact'
	| 'ceo'
	| 'sales_director'
	| 'bdr'
	| 'quoting_specialist'
	| 'procurement_officer'
	| 'warehouse_worker'
	| 'quality_inspector'
	| 'dispatcher'
	| 'accountant'
	| 'ar_clerk'
	| 'ap_clerk'
	| 'credit_manager'
	| 'cs_agent'
	| 'cs_manager'

export const APP_ROLES = [
	'super_admin',
	'admin',
	'operations_manager',
	'sales_manager',
	'sales_rep',
	'procurement_manager',
	'procurement_agent',
	'warehouse_manager',
	'warehouse_staff',
	'logistics_manager',
	'logistics_coordinator',
	'driver',
	'finance_manager',
	'finance_accountant',
	'finance_clerk',
	'hr_manager',
	'hr_staff',
	'support_manager',
	'support_agent',
	'customer_admin',
	'customer_user',
	'supplier_contact',
	'ceo',
	'sales_director',
	'bdr',
	'quoting_specialist',
	'procurement_officer',
	'warehouse_worker',
	'quality_inspector',
	'dispatcher',
	'accountant',
	'ar_clerk',
	'ap_clerk',
	'credit_manager',
	'cs_agent',
	'cs_manager',
] as const

export type AppPermission =
	| 'quote_requests.read'
	| 'quote_requests.create'
	| 'quote_requests.update'
	| 'quote_requests.delete'
	| 'quote_requests.assign'
	| 'quotes.read'
	| 'quotes.create'
	| 'quotes.update'
	| 'quotes.delete'
	| 'quotes.approve'
	| 'quotes.send'
	| 'orders.read'
	| 'orders.read_own'
	| 'orders.create'
	| 'orders.update'
	| 'orders.delete'
	| 'orders.cancel'
	| 'purchase_orders.read'
	| 'purchase_orders.create'
	| 'purchase_orders.update'
	| 'purchase_orders.delete'
	| 'purchase_orders.approve'
	| 'purchase_orders.send'
	| 'inventory.read'
	| 'inventory.create'
	| 'inventory.update'
	| 'inventory.delete'
	| 'deliveries.read'
	| 'deliveries.read_assigned'
	| 'deliveries.create'
	| 'deliveries.update'
	| 'deliveries.delete'
	| 'deliveries.dispatch'
	| 'invoices.read'
	| 'invoices.create'
	| 'invoices.update'
	| 'invoices.delete'
	| 'invoices.approve'
	| 'invoices.send'
	| 'payments.read'
	| 'payments.create'
	| 'payments.update'
	| 'payments.delete'
	| 'payments.reconcile'
	| 'credit.read'
	| 'credit.update'
	| 'credit.approve'
	| 'returns.read'
	| 'returns.create'
	| 'returns.update'
	| 'returns.approve'
	| 'returns.close'
	| 'customers.read'
	| 'customers.create'
	| 'customers.update'
	| 'customers.delete'
	| 'customers.assign'
	| 'suppliers.read'
	| 'suppliers.create'
	| 'suppliers.update'
	| 'suppliers.delete'
	| 'products.read'
	| 'products.create'
	| 'products.update'
	| 'products.delete'
	| 'drivers.read'
	| 'drivers.create'
	| 'drivers.update'
	| 'vehicles.read'
	| 'vehicles.create'
	| 'vehicles.update'
	| 'tickets.read'
	| 'tickets.create'
	| 'tickets.update'
	| 'tickets.assign'
	| 'tickets.escalate'
	| 'tickets.close'
	| 'reports.read'
	| 'reports.create'
	| 'reports.export'
	| 'users.read'
	| 'users.manage'
	| 'users.settings'
	| 'ai.use'
	| 'ai.admin'

export const APP_PERMISSIONS = [
	'quote_requests.read',
	'quote_requests.create',
	'quote_requests.update',
	'quote_requests.delete',
	'quote_requests.assign',
	'quotes.read',
	'quotes.create',
	'quotes.update',
	'quotes.delete',
	'quotes.approve',
	'quotes.send',
	'orders.read',
	'orders.read_own',
	'orders.create',
	'orders.update',
	'orders.delete',
	'orders.cancel',
	'purchase_orders.read',
	'purchase_orders.create',
	'purchase_orders.update',
	'purchase_orders.delete',
	'purchase_orders.approve',
	'purchase_orders.send',
	'inventory.read',
	'inventory.create',
	'inventory.update',
	'inventory.delete',
	'deliveries.read',
	'deliveries.read_assigned',
	'deliveries.create',
	'deliveries.update',
	'deliveries.delete',
	'deliveries.dispatch',
	'invoices.read',
	'invoices.create',
	'invoices.update',
	'invoices.delete',
	'invoices.approve',
	'invoices.send',
	'payments.read',
	'payments.create',
	'payments.update',
	'payments.delete',
	'payments.reconcile',
	'credit.read',
	'credit.update',
	'credit.approve',
	'returns.read',
	'returns.create',
	'returns.update',
	'returns.approve',
	'returns.close',
	'customers.read',
	'customers.create',
	'customers.update',
	'customers.delete',
	'customers.assign',
	'suppliers.read',
	'suppliers.create',
	'suppliers.update',
	'suppliers.delete',
	'products.read',
	'products.create',
	'products.update',
	'products.delete',
	'drivers.read',
	'drivers.create',
	'drivers.update',
	'vehicles.read',
	'vehicles.create',
	'vehicles.update',
	'tickets.read',
	'tickets.create',
	'tickets.update',
	'tickets.assign',
	'tickets.escalate',
	'tickets.close',
	'reports.read',
	'reports.create',
	'reports.export',
	'users.read',
	'users.manage',
	'users.settings',
	'ai.use',
	'ai.admin',
] as const

export type UserType = 'internal' | 'customer' | 'supplier' | 'driver'

export const USER_TYPES = [
	'internal',
	'customer',
	'supplier',
	'driver',
] as const

export type AuditAction =
	| 'create'
	| 'read'
	| 'update'
	| 'delete'
	| 'login'
	| 'logout'
	| 'approve'
	| 'reject'
	| 'export'
	| 'import'
	| 'escalate'

export const AUDIT_ACTIONS = [
	'create',
	'read',
	'update',
	'delete',
	'login',
	'logout',
	'approve',
	'reject',
	'export',
	'import',
	'escalate',
] as const

export type ApprovalStatus = DbEnum<'approval_status'>

export const APPROVAL_STATUSES = [
	'pending',
	'approved',
	'changes_requested',
	'rejected',
	'canceled',
] as const satisfies readonly ApprovalStatus[]

export type ApprovalType =
	| 'quote_discount'
	| 'quote_override'
	| 'order_cancellation'
	| 'credit_extension'
	| 'credit_note'
	| 'purchase_order'
	| 'price_adjustment'
	| 'write_off'
	| 'refund'

export const APPROVAL_TYPES = [
	'quote_discount',
	'quote_override',
	'order_cancellation',
	'credit_extension',
	'credit_note',
	'purchase_order',
	'price_adjustment',
	'write_off',
	'refund',
] as const

export type NotificationChannel =
	| 'in_app'
	| 'email'
	| 'sms'
	| 'whatsapp'
	| 'push'

export const NOTIFICATION_CHANNELS = [
	'in_app',
	'email',
	'sms',
	'whatsapp',
	'push',
] as const

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent'

export const NOTIFICATION_PRIORITIES = [
	'low',
	'normal',
	'high',
	'urgent',
] as const

export type Urgency = 'standard' | 'rush' | 'emergency'

export const URGENCIES = ['standard', 'rush', 'emergency'] as const

export type InventoryCostingMethod = 'wac' | 'fifo'

export const INVENTORY_COSTING_METHODS = ['wac', 'fifo'] as const

// =============================================================================
// Customer & Contact Enums
// =============================================================================

export type CustomerTier =
	| 'tier_1_new'
	| 'tier_2_verified'
	| 'tier_3_established'
	| 'tier_4_preferred'
	| 'tier_5_suspended'

export const CUSTOMER_TIERS = [
	'tier_1_new',
	'tier_2_verified',
	'tier_3_established',
	'tier_4_preferred',
	'tier_5_suspended',
] as const

export type AddressType =
	| 'billing'
	| 'shipping'
	| 'site'
	| 'warehouse'
	| 'office'
	| 'other'

export const ADDRESS_TYPES = [
	'billing',
	'shipping',
	'site',
	'warehouse',
	'office',
	'other',
] as const

export type ContactType =
	| 'primary'
	| 'billing'
	| 'shipping'
	| 'technical'
	| 'procurement'
	| 'executive'
	| 'site_engineer'

export const CONTACT_TYPES = [
	'primary',
	'billing',
	'shipping',
	'technical',
	'procurement',
	'executive',
	'site_engineer',
] as const

export type CreditStatus =
	| 'not_evaluated'
	| 'pending_review'
	| 'under_review'
	| 'approved'
	| 'conditional'
	| 'suspended'
	| 'revoked'
	| 'expired'

export const CREDIT_STATUSES = [
	'not_evaluated',
	'pending_review',
	'under_review',
	'approved',
	'conditional',
	'suspended',
	'revoked',
	'expired',
] as const

// =============================================================================
// Product & Inventory Enums
// =============================================================================

export type ProductCategory =
	| 'cement'
	| 'reinforcing_steel'
	| 'structural_steel'
	| 'aggregates'
	| 'sand'
	| 'ready_mix_concrete'
	| 'bricks'
	| 'blocks'
	| 'tiles_ceramic'
	| 'tiles_porcelain'
	| 'marble'
	| 'granite'
	| 'lumber'
	| 'plywood'
	| 'insulation'
	| 'waterproofing'
	| 'pipes_pvc'
	| 'pipes_metal'
	| 'electrical_cable'
	| 'electrical_conduit'
	| 'paint'
	| 'adhesives'
	| 'glass'
	| 'aluminum_profiles'
	| 'gypsum_board'
	| 'roofing'
	| 'hardware_fasteners'

export const PRODUCT_CATEGORIES = [
	'cement',
	'reinforcing_steel',
	'structural_steel',
	'aggregates',
	'sand',
	'ready_mix_concrete',
	'bricks',
	'blocks',
	'tiles_ceramic',
	'tiles_porcelain',
	'marble',
	'granite',
	'lumber',
	'plywood',
	'insulation',
	'waterproofing',
	'pipes_pvc',
	'pipes_metal',
	'electrical_cable',
	'electrical_conduit',
	'paint',
	'adhesives',
	'glass',
	'aluminum_profiles',
	'gypsum_board',
	'roofing',
	'hardware_fasteners',
] as const

export type UnitOfMeasure =
	| 'ton'
	| 'kg'
	| 'g'
	| 'cubic_meter'
	| 'liter'
	| 'meter'
	| 'centimeter'
	| 'millimeter'
	| 'square_meter'
	| 'piece'
	| 'unit'
	| 'bag'
	| 'bag_50kg'
	| 'bag_25kg'
	| 'pallet'
	| 'bundle'
	| 'roll'
	| 'sheet'
	| 'panel'
	| 'box'
	| 'carton'
	| 'drum'
	| 'coil'
	| 'bar'
	| 'length'
	| 'trip'
	| 'load'
	| 'set'
	| 'pair'

export const UNITS_OF_MEASURE = [
	'ton',
	'kg',
	'g',
	'cubic_meter',
	'liter',
	'meter',
	'centimeter',
	'millimeter',
	'square_meter',
	'piece',
	'unit',
	'bag',
	'bag_50kg',
	'bag_25kg',
	'pallet',
	'bundle',
	'roll',
	'sheet',
	'panel',
	'box',
	'carton',
	'drum',
	'coil',
	'bar',
	'length',
	'trip',
	'load',
	'set',
	'pair',
] as const

export type InventoryStatus =
	| 'available'
	| 'reserved'
	| 'quarantine'
	| 'damaged'
	| 'in_transit'
	| 'pending_inspection'
	| 'returned'
	| 'committed'
	| 'write_off'

export const INVENTORY_STATUSES = [
	'available',
	'reserved',
	'quarantine',
	'damaged',
	'in_transit',
	'pending_inspection',
	'returned',
	'committed',
	'write_off',
] as const

export type StockMovementType =
	| 'receipt'
	| 'issue'
	| 'transfer_in'
	| 'transfer_out'
	| 'adjustment_up'
	| 'adjustment_down'
	| 'return_in'
	| 'return_out'
	| 'write_off'
	| 'cycle_count'
	| 'reservation'

export const STOCK_MOVEMENT_TYPES = [
	'receipt',
	'issue',
	'transfer_in',
	'transfer_out',
	'adjustment_up',
	'adjustment_down',
	'return_in',
	'return_out',
	'write_off',
	'cycle_count',
	'reservation',
] as const

export type InspectionResult = 'pass' | 'fail' | 'conditional' | 'pending'

export const INSPECTION_RESULTS = [
	'pass',
	'fail',
	'conditional',
	'pending',
] as const

export type StockConfidence = 'fresh' | 'aging' | 'stale'

export const STOCK_CONFIDENCES = ['fresh', 'aging', 'stale'] as const

export type ReservationType = 'soft' | 'hard'

export const RESERVATION_TYPES = ['soft', 'hard'] as const

export type ReservationStatus = 'active' | 'expired' | 'converted'

export const RESERVATION_STATUSES = ['active', 'expired', 'converted'] as const

// =============================================================================
// Quote & Order Enums
// =============================================================================

export type QuoteRequestStatus = DbEnum<'quote_request_status'>

export const QUOTE_REQUEST_STATUSES = [
	'draft',
	'submitted',
	'assigned',
	'saved',
	'reviewing',
	'awaiting_clarification',
	'quoting',
	'quoted',
	'approved',
	'rejected',
	'declined',
	'expired',
	'canceled',
] as const satisfies readonly QuoteRequestStatus[]

export type QuoteStatus = DbEnum<'quote_status'>

export const QUOTE_STATUSES = [
	'draft',
	'internal_review',
	'pending_approval',
	'approved',
	'sent',
	'viewed',
	'negotiating',
	'revised',
	'accepted',
	'declined',
	'expired',
	'canceled',
	'cancelled',
	'requires_re_quote',
] as const satisfies readonly QuoteStatus[]

export type OrderStatus = OrderWorkflowStatus

export const ORDER_STATUSES = [
	'confirmed_for_inventory',
	'inventory_reserved',
	'warehouse_loading',
	'dispatch_ready',
	'dispatch_assigned',
	'out_for_delivery',
	'delivered',
	'rejected',
	'canceled',
] as const satisfies readonly OrderStatus[]

// =============================================================================
// Procurement Enums
// =============================================================================

export type SupplierPoStatus =
	| 'draft'
	| 'sent'
	| 'confirmed'
	| 'in_production'
	| 'shipped'
	| 'partially_received'
	| 'received'
	| 'inspected'
	| 'closed'
	| 'rejected'
	| 'cancelled'

export const SUPPLIER_PO_STATUSES = [
	'draft',
	'sent',
	'confirmed',
	'in_production',
	'shipped',
	'partially_received',
	'received',
	'inspected',
	'closed',
	'rejected',
	'cancelled',
] as const

export type PoType = 'stock' | 'customer_linked'

export const PO_TYPES = ['stock', 'customer_linked'] as const

export type FulfillmentSource =
	| 'own_stock'
	| 'supplier_drop'
	| 'supplier_cross'
	| 'inter_transfer'

export const FULFILLMENT_SOURCES = [
	'own_stock',
	'supplier_drop',
	'supplier_cross',
	'inter_transfer',
] as const

// =============================================================================
// Delivery & Logistics Enums
// =============================================================================

export type DeliveryStatus = DbEnum<'delivery_status'>

export const DELIVERY_STATUSES = [
	'assigned',
	'accepted',
	'in_transit',
	'arrived',
	'completed',
	'rejected',
] as const satisfies readonly DeliveryStatus[]

export type DriverType = 'internal' | 'contracted' | 'on_demand'

export const DRIVER_TYPES = ['internal', 'contracted', 'on_demand'] as const

export type VehicleType =
	| 'pickup'
	| 'flatbed'
	| 'box_truck'
	| 'tanker'
	| 'dump_truck'
	| 'trailer'
	| 'semi_trailer'
	| 'crane_truck'
	| 'concrete_mixer'

export const VEHICLE_TYPES = [
	'pickup',
	'flatbed',
	'box_truck',
	'tanker',
	'dump_truck',
	'trailer',
	'semi_trailer',
	'crane_truck',
	'concrete_mixer',
] as const

export type VehicleStatus =
	| 'available'
	| 'in_use'
	| 'maintenance'
	| 'out_of_service'
	| 'reserved'

export const VEHICLE_STATUSES = [
	'available',
	'in_use',
	'maintenance',
	'out_of_service',
	'reserved',
] as const

export type EgyptianLicenseClass =
	| 'third_degree'
	| 'second_degree'
	| 'first_degree'

export const EGYPTIAN_LICENSE_CLASSES = [
	'third_degree',
	'second_degree',
	'first_degree',
] as const

export type DeliveryFailureReason =
	| 'customer_refused'
	| 'site_not_ready'
	| 'access_blocked'
	| 'wrong_address'
	| 'customer_absent'
	| 'safety_concern'
	| 'vehicle_breakdown'
	| 'weather'
	| 'documentation_issue'
	| 'damaged_in_transit'

export const DELIVERY_FAILURE_REASONS = [
	'customer_refused',
	'site_not_ready',
	'access_blocked',
	'wrong_address',
	'customer_absent',
	'safety_concern',
	'vehicle_breakdown',
	'weather',
	'documentation_issue',
	'damaged_in_transit',
] as const

export type ShippingMethod =
	| 'own_fleet'
	| 'three_pl'
	| 'supplier_direct'
	| 'customer_pickup'

export const SHIPPING_METHODS = [
	'own_fleet',
	'three_pl',
	'supplier_direct',
	'customer_pickup',
] as const

export type DropShipPodStatus =
	| 'awaiting_supplier_pod'
	| 'awaiting_customer_confirmation'
	| 'confirmed'
	| 'disputed'
	| 'auto_confirmed'

export const DROP_SHIP_POD_STATUSES = [
	'awaiting_supplier_pod',
	'awaiting_customer_confirmation',
	'confirmed',
	'disputed',
	'auto_confirmed',
] as const

// =============================================================================
// Finance Enums
// =============================================================================

export type InvoiceStatus =
	| 'draft'
	| 'sent'
	| 'viewed'
	| 'partially_paid'
	| 'paid'
	| 'overdue'
	| 'collections'
	| 'disputed'
	| 'adjusted'
	| 'cancelled'
	| 'written_off'

export const INVOICE_STATUSES = [
	'draft',
	'sent',
	'viewed',
	'partially_paid',
	'paid',
	'overdue',
	'collections',
	'disputed',
	'adjusted',
	'cancelled',
	'written_off',
] as const

export type InvoiceType =
	| 'standard'
	| 'proforma'
	| 'credit_note'
	| 'debit_note'
	| 'advance'
	| 'retention'
	| 'final'

export const INVOICE_TYPES = [
	'standard',
	'proforma',
	'credit_note',
	'debit_note',
	'advance',
	'retention',
	'final',
] as const

export type PaymentStatus =
	| 'expected'
	| 'received'
	| 'matched'
	| 'fully_applied'
	| 'partially_applied'
	| 'overpayment'
	| 'unmatched'
	| 'bounced'
	| 'refunded'

export const PAYMENT_STATUSES = [
	'expected',
	'received',
	'matched',
	'fully_applied',
	'partially_applied',
	'overpayment',
	'unmatched',
	'bounced',
	'refunded',
] as const

export type PaymentMethod =
	| 'wire_transfer'
	| 'post_dated_cheque'
	| 'certified_cheque'
	| 'cash'
	| 'letter_of_credit'
	| 'bank_guarantee'

export const PAYMENT_METHODS = [
	'wire_transfer',
	'post_dated_cheque',
	'certified_cheque',
	'cash',
	'letter_of_credit',
	'bank_guarantee',
] as const

export type PaymentTerms =
	| 'cod'
	| 'cia'
	| 'net_15'
	| 'net_30'
	| 'net_45'
	| 'net_60'
	| 'net_90'
	| 'lc_at_sight'
	| 'lc_30_days'
	| 'lc_60_days'
	| 'custom'

export const PAYMENT_TERMS = [
	'cod',
	'cia',
	'net_15',
	'net_30',
	'net_45',
	'net_60',
	'net_90',
	'lc_at_sight',
	'lc_30_days',
	'lc_60_days',
	'custom',
] as const

export type CreditNoteStatus =
	| 'draft'
	| 'pending_approval'
	| 'approved'
	| 'applied'
	| 'partially_applied'
	| 'void'

export const CREDIT_NOTE_STATUSES = [
	'draft',
	'pending_approval',
	'approved',
	'applied',
	'partially_applied',
	'void',
] as const

export type ChequeStatus =
	| 'received'
	| 'deposited'
	| 'cleared'
	| 'bounced'
	| 'replaced'
	| 'written_off'

export const CHEQUE_STATUSES = [
	'received',
	'deposited',
	'cleared',
	'bounced',
	'replaced',
	'written_off',
] as const

export type LcStatus =
	| 'draft'
	| 'issued'
	| 'advised'
	| 'confirmed'
	| 'partially_drawn'
	| 'fully_drawn'
	| 'expired'
	| 'cancelled'
	| 'amended'

export const LC_STATUSES = [
	'draft',
	'issued',
	'advised',
	'confirmed',
	'partially_drawn',
	'fully_drawn',
	'expired',
	'cancelled',
	'amended',
] as const

export type ReturnStatus =
	| 'requested'
	| 'under_review'
	| 'approved'
	| 'rejected'
	| 'pickup_scheduled'
	| 'picked_up'
	| 'inspecting'
	| 'restocked'
	| 'credit_issued'
	| 'closed'

export const RETURN_STATUSES = [
	'requested',
	'under_review',
	'approved',
	'rejected',
	'pickup_scheduled',
	'picked_up',
	'inspecting',
	'restocked',
	'credit_issued',
	'closed',
] as const

export type DisputeReason =
	| 'incorrect_amount'
	| 'damaged_goods'
	| 'wrong_items'
	| 'missing_items'
	| 'duplicate_invoice'
	| 'pricing_disagreement'
	| 'other'

export const DISPUTE_REASONS = [
	'incorrect_amount',
	'damaged_goods',
	'wrong_items',
	'missing_items',
	'duplicate_invoice',
	'pricing_disagreement',
	'other',
] as const

export type DisputeStatus =
	| 'open'
	| 'investigating'
	| 'awaiting_evidence'
	| 'resolved'
	| 'escalated'

export const DISPUTE_STATUSES = [
	'open',
	'investigating',
	'awaiting_evidence',
	'resolved',
	'escalated',
] as const

export type DisputeResolutionType =
	| 'adjusted'
	| 'credit_note_issued'
	| 'invoice_maintained'
	| 'partially_adjusted'

export const DISPUTE_RESOLUTION_TYPES = [
	'adjusted',
	'credit_note_issued',
	'invoice_maintained',
	'partially_adjusted',
] as const

// =============================================================================
// Support & Documents Enums
// =============================================================================

export type TicketStatus =
	| 'new'
	| 'open'
	| 'in_progress'
	| 'awaiting_customer'
	| 'awaiting_internal'
	| 'awaiting_supplier'
	| 'escalated'
	| 'resolved'
	| 'closed'
	| 'reopened'

export const TICKET_STATUSES = [
	'new',
	'open',
	'in_progress',
	'awaiting_customer',
	'awaiting_internal',
	'awaiting_supplier',
	'escalated',
	'resolved',
	'closed',
	'reopened',
] as const

export type TicketPriority =
	| 'critical'
	| 'high'
	| 'medium'
	| 'low'
	| 'informational'

export const TICKET_PRIORITIES = [
	'critical',
	'high',
	'medium',
	'low',
	'informational',
] as const

export type TicketCategory =
	| 'order_issue'
	| 'delivery_issue'
	| 'quality_complaint'
	| 'billing_dispute'
	| 'product_inquiry'
	| 'return_request'
	| 'account_issue'
	| 'technical_support'
	| 'general'

export const TICKET_CATEGORIES = [
	'order_issue',
	'delivery_issue',
	'quality_complaint',
	'billing_dispute',
	'product_inquiry',
	'return_request',
	'account_issue',
	'technical_support',
	'general',
] as const

export type DocumentType =
	| 'commercial_register'
	| 'tax_card'
	| 'vat_certificate'
	| 'insurance_certificate'
	| 'bank_letter'
	| 'delivery_note'
	| 'weight_ticket'
	| 'inspection_report'
	| 'material_test_certificate'
	| 'photo'
	| 'signed_contract'
	| 'purchase_order'
	| 'invoice'
	| 'packing_list'
	| 'other'

export const DOCUMENT_TYPES = [
	'commercial_register',
	'tax_card',
	'vat_certificate',
	'insurance_certificate',
	'bank_letter',
	'delivery_note',
	'weight_ticket',
	'inspection_report',
	'material_test_certificate',
	'photo',
	'signed_contract',
	'purchase_order',
	'invoice',
	'packing_list',
	'other',
] as const
