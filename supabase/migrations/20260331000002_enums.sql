-- Migration 002: All Database Enums
-- 50+ enums across 8 domains for HyperQuote platform

-- ============================================================================
-- Auth & System Enums
-- ============================================================================

-- Expanded app_role: original 22 roles + 14 additional roles from seed data
CREATE TYPE app_role AS ENUM (
  -- Original roles
  'super_admin', 'admin', 'operations_manager', 'sales_manager', 'sales_rep',
  'procurement_manager', 'procurement_agent', 'warehouse_manager', 'warehouse_staff',
  'logistics_manager', 'logistics_coordinator', 'driver', 'finance_manager',
  'finance_accountant', 'finance_clerk', 'hr_manager', 'hr_staff',
  'support_manager', 'support_agent', 'customer_admin', 'customer_user', 'supplier_contact',
  -- Expanded roles from seed data
  'ceo', 'sales_director', 'bdr', 'quoting_specialist', 'procurement_officer',
  'warehouse_worker', 'quality_inspector', 'dispatcher', 'accountant',
  'ar_clerk', 'ap_clerk', 'credit_manager', 'cs_agent', 'cs_manager'
);

-- Seed-data-aligned app_permission: entity.action naming convention (76 unique permissions)
CREATE TYPE app_permission AS ENUM (
  -- Quote Requests
  'quote_requests.read', 'quote_requests.create', 'quote_requests.update',
  'quote_requests.delete', 'quote_requests.assign',
  -- Quotes
  'quotes.read', 'quotes.create', 'quotes.update',
  'quotes.delete', 'quotes.approve', 'quotes.send',
  -- Orders
  'orders.read', 'orders.read_own', 'orders.create',
  'orders.update', 'orders.delete', 'orders.cancel',
  -- Purchase Orders
  'purchase_orders.read', 'purchase_orders.create', 'purchase_orders.update',
  'purchase_orders.delete', 'purchase_orders.approve', 'purchase_orders.send',
  -- Inventory
  'inventory.read', 'inventory.create', 'inventory.update', 'inventory.delete',
  -- Deliveries
  'deliveries.read', 'deliveries.read_assigned', 'deliveries.create',
  'deliveries.update', 'deliveries.delete', 'deliveries.dispatch',
  -- Invoices
  'invoices.read', 'invoices.create', 'invoices.update',
  'invoices.delete', 'invoices.approve', 'invoices.send',
  -- Payments
  'payments.read', 'payments.create', 'payments.update',
  'payments.delete', 'payments.reconcile',
  -- Credit
  'credit.read', 'credit.update', 'credit.approve',
  -- Returns
  'returns.read', 'returns.create', 'returns.update',
  'returns.approve', 'returns.close',
  -- Customers
  'customers.read', 'customers.create', 'customers.update',
  'customers.delete', 'customers.assign',
  -- Suppliers
  'suppliers.read', 'suppliers.create', 'suppliers.update', 'suppliers.delete',
  -- Products
  'products.read', 'products.create', 'products.update', 'products.delete',
  -- Drivers
  'drivers.read', 'drivers.create', 'drivers.update',
  -- Vehicles
  'vehicles.read', 'vehicles.create', 'vehicles.update',
  -- Tickets
  'tickets.read', 'tickets.create', 'tickets.update',
  'tickets.assign', 'tickets.escalate', 'tickets.close',
  -- Reports
  'reports.read', 'reports.create', 'reports.export',
  -- Users
  'users.read', 'users.manage', 'users.settings',
  -- AI
  'ai.use', 'ai.admin'
);

CREATE TYPE user_type AS ENUM ('internal', 'customer', 'supplier', 'driver');

CREATE TYPE audit_action AS ENUM (
  'create', 'read', 'update', 'delete', 'login', 'logout',
  'approve', 'reject', 'export', 'import', 'escalate'
);

CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected', 'escalated', 'expired');

CREATE TYPE approval_type AS ENUM (
  'quote_discount', 'quote_override', 'order_cancellation', 'credit_extension',
  'credit_note', 'purchase_order', 'price_adjustment', 'write_off', 'refund'
);

CREATE TYPE notification_channel AS ENUM ('in_app', 'email', 'sms', 'whatsapp', 'push');

CREATE TYPE notification_priority AS ENUM ('low', 'normal', 'high', 'urgent');

CREATE TYPE urgency AS ENUM ('standard', 'rush', 'emergency');

CREATE TYPE inventory_costing_method AS ENUM ('wac', 'fifo');

-- ============================================================================
-- Customer & Contact Enums
-- ============================================================================

CREATE TYPE customer_tier AS ENUM (
  'tier_1_new', 'tier_2_verified', 'tier_3_established', 'tier_4_preferred', 'tier_5_suspended'
);

CREATE TYPE address_type AS ENUM ('billing', 'shipping', 'site', 'warehouse', 'office', 'other');

CREATE TYPE contact_type AS ENUM (
  'primary', 'billing', 'shipping', 'technical', 'procurement', 'executive', 'site_engineer'
);

-- credit_status: includes 'pending_review' to match customers table default in Phase 13
CREATE TYPE credit_status AS ENUM (
  'not_evaluated', 'pending_review', 'under_review', 'approved', 'conditional',
  'suspended', 'revoked', 'expired'
);

-- ============================================================================
-- Product & Inventory Enums
-- ============================================================================

CREATE TYPE product_category AS ENUM (
  'cement', 'reinforcing_steel', 'structural_steel', 'aggregates', 'sand',
  'ready_mix_concrete', 'bricks', 'blocks', 'tiles_ceramic', 'tiles_porcelain',
  'marble', 'granite', 'lumber', 'plywood', 'insulation', 'waterproofing',
  'pipes_pvc', 'pipes_metal', 'electrical_cable', 'electrical_conduit',
  'paint', 'adhesives', 'glass', 'aluminum_profiles', 'gypsum_board',
  'roofing', 'hardware_fasteners'
);

CREATE TYPE unit_of_measure AS ENUM (
  'ton', 'kg', 'g', 'cubic_meter', 'liter', 'meter', 'centimeter', 'millimeter',
  'square_meter', 'piece', 'unit', 'bag', 'bag_50kg', 'bag_25kg', 'pallet',
  'bundle', 'roll', 'sheet', 'panel', 'box', 'carton', 'drum', 'coil',
  'bar', 'length', 'trip', 'load', 'set', 'pair'
);

CREATE TYPE inventory_status AS ENUM (
  'available', 'reserved', 'quarantine', 'damaged', 'in_transit',
  'pending_inspection', 'returned', 'committed', 'write_off'
);

CREATE TYPE stock_movement_type AS ENUM (
  'receipt', 'issue', 'transfer_in', 'transfer_out', 'adjustment_up',
  'adjustment_down', 'return_in', 'return_out', 'write_off', 'cycle_count', 'reservation'
);

CREATE TYPE inspection_result AS ENUM ('pass', 'fail', 'conditional', 'pending');

CREATE TYPE stock_confidence AS ENUM ('fresh', 'aging', 'stale');

CREATE TYPE reservation_type AS ENUM ('soft', 'hard');

CREATE TYPE reservation_status AS ENUM ('active', 'expired', 'converted');

-- ============================================================================
-- Quote & Order Enums
-- ============================================================================

CREATE TYPE quote_request_status AS ENUM (
  'draft', 'submitted', 'under_review', 'sourcing', 'quote_ready',
  'on_hold', 'rejected', 'withdrawn', 'cancelled'
);

CREATE TYPE quote_status AS ENUM (
  'draft', 'internal_review', 'pending_approval', 'approved', 'sent', 'viewed',
  'negotiating', 'revised', 'accepted', 'declined', 'expired', 'cancelled', 'requires_re_quote'
);

CREATE TYPE order_status AS ENUM (
  'confirmed', 'processing', 'partially_fulfilled', 'fulfilled', 'completed',
  'on_hold', 'cancellation_requested', 'back_ordered', 'cancelled'
);

-- ============================================================================
-- Procurement Enums
-- ============================================================================

CREATE TYPE supplier_po_status AS ENUM (
  'draft', 'sent', 'confirmed', 'in_production', 'shipped',
  'partially_received', 'received', 'inspected', 'closed', 'rejected', 'cancelled'
);

CREATE TYPE po_type AS ENUM ('stock', 'customer_linked');

CREATE TYPE fulfillment_source AS ENUM ('own_stock', 'supplier_drop', 'supplier_cross', 'inter_transfer');

-- ============================================================================
-- Delivery & Logistics Enums
-- ============================================================================

CREATE TYPE delivery_status AS ENUM (
  'scheduled', 'picking_loading', 'dispatched', 'in_transit', 'at_site',
  'delivered', 'partially_delivered', 'failed', 'rescheduled', 'returned', 'cancelled'
);

CREATE TYPE driver_type AS ENUM ('internal', 'contracted', 'on_demand');

CREATE TYPE vehicle_type AS ENUM (
  'pickup', 'flatbed', 'box_truck', 'tanker', 'dump_truck',
  'trailer', 'semi_trailer', 'crane_truck', 'concrete_mixer'
);

CREATE TYPE vehicle_status AS ENUM ('available', 'in_use', 'maintenance', 'out_of_service', 'reserved');

CREATE TYPE egyptian_license_class AS ENUM ('third_degree', 'second_degree', 'first_degree');

CREATE TYPE delivery_failure_reason AS ENUM (
  'customer_refused', 'site_not_ready', 'access_blocked', 'wrong_address',
  'customer_absent', 'safety_concern', 'vehicle_breakdown', 'weather',
  'documentation_issue', 'damaged_in_transit'
);

CREATE TYPE shipping_method AS ENUM ('own_fleet', 'three_pl', 'supplier_direct', 'customer_pickup');

CREATE TYPE drop_ship_pod_status AS ENUM (
  'awaiting_supplier_pod', 'awaiting_customer_confirmation', 'confirmed', 'disputed', 'auto_confirmed'
);

-- ============================================================================
-- Finance Enums
-- ============================================================================

CREATE TYPE invoice_status AS ENUM (
  'draft', 'sent', 'viewed', 'partially_paid', 'paid', 'overdue',
  'collections', 'disputed', 'adjusted', 'cancelled', 'written_off'
);

CREATE TYPE invoice_type AS ENUM (
  'standard', 'proforma', 'credit_note', 'debit_note', 'advance', 'retention', 'final'
);

CREATE TYPE payment_status AS ENUM (
  'expected', 'received', 'matched', 'fully_applied', 'partially_applied',
  'overpayment', 'unmatched', 'bounced', 'refunded'
);

CREATE TYPE payment_method AS ENUM (
  'wire_transfer', 'post_dated_cheque', 'certified_cheque', 'cash',
  'letter_of_credit', 'bank_guarantee'
);

CREATE TYPE payment_terms AS ENUM (
  'cod', 'cia', 'net_15', 'net_30', 'net_45', 'net_60', 'net_90',
  'lc_at_sight', 'lc_30_days', 'lc_60_days', 'custom'
);

CREATE TYPE credit_note_status AS ENUM (
  'draft', 'pending_approval', 'approved', 'applied', 'partially_applied', 'void'
);

CREATE TYPE cheque_status AS ENUM (
  'received', 'deposited', 'cleared', 'bounced', 'replaced', 'written_off'
);

CREATE TYPE lc_status AS ENUM (
  'draft', 'issued', 'advised', 'confirmed', 'partially_drawn',
  'fully_drawn', 'expired', 'cancelled', 'amended'
);

CREATE TYPE return_status AS ENUM (
  'requested', 'under_review', 'approved', 'rejected', 'pickup_scheduled',
  'picked_up', 'inspecting', 'restocked', 'credit_issued', 'closed'
);

CREATE TYPE dispute_reason AS ENUM (
  'incorrect_amount', 'damaged_goods', 'wrong_items', 'missing_items',
  'duplicate_invoice', 'pricing_disagreement', 'other'
);

CREATE TYPE dispute_status AS ENUM (
  'open', 'investigating', 'awaiting_evidence', 'resolved', 'escalated'
);

CREATE TYPE dispute_resolution_type AS ENUM (
  'adjusted', 'credit_note_issued', 'invoice_maintained', 'partially_adjusted'
);

-- ============================================================================
-- Support & Documents Enums
-- ============================================================================

CREATE TYPE ticket_status AS ENUM (
  'new', 'open', 'in_progress', 'awaiting_customer', 'awaiting_internal',
  'awaiting_supplier', 'escalated', 'resolved', 'closed', 'reopened'
);

CREATE TYPE ticket_priority AS ENUM ('critical', 'high', 'medium', 'low', 'informational');

CREATE TYPE ticket_category AS ENUM (
  'order_issue', 'delivery_issue', 'quality_complaint', 'billing_dispute',
  'product_inquiry', 'return_request', 'account_issue', 'technical_support', 'general'
);

CREATE TYPE document_type AS ENUM (
  'commercial_register', 'tax_card', 'vat_certificate', 'insurance_certificate',
  'bank_letter', 'delivery_note', 'weight_ticket', 'inspection_report',
  'material_test_certificate', 'photo', 'signed_contract', 'purchase_order',
  'invoice', 'packing_list', 'other'
);
