-- Migration 019: All indexes for Phase 13 tables
-- RLS-critical single-column, composite, partial, full-text, and pgvector indexes
-- Uses CREATE INDEX IF NOT EXISTS for idempotency (some may already exist from earlier migrations)

-- ============================================================================
-- 1. RLS-Critical Single-Column Indexes (btree)
-- ============================================================================

-- tenant_id indexes (some already exist from earlier migrations -- IF NOT EXISTS handles)
CREATE INDEX IF NOT EXISTS idx_customers_tenant_id ON customers (tenant_id);
CREATE INDEX IF NOT EXISTS idx_customer_contacts_tenant_id ON customer_contacts (tenant_id);
CREATE INDEX IF NOT EXISTS idx_addresses_tenant_id ON addresses (tenant_id);
CREATE INDEX IF NOT EXISTS idx_projects_tenant_id ON projects (tenant_id);
CREATE INDEX IF NOT EXISTS idx_credit_applications_tenant_id ON credit_applications (tenant_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_tenant_id ON suppliers (tenant_id);
CREATE INDEX IF NOT EXISTS idx_supplier_contacts_tenant_id ON supplier_contacts (tenant_id);
CREATE INDEX IF NOT EXISTS idx_supplier_price_lists_tenant_id ON supplier_price_lists (tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_tenant_id ON products (tenant_id);
CREATE INDEX IF NOT EXISTS idx_product_suppliers_tenant_id ON product_suppliers (tenant_id);
CREATE INDEX IF NOT EXISTS idx_pricing_rules_tenant_id ON pricing_rules (tenant_id);
CREATE INDEX IF NOT EXISTS idx_contract_prices_tenant_id ON contract_prices (tenant_id);
CREATE INDEX IF NOT EXISTS idx_quote_requests_tenant_id ON quote_requests (tenant_id);
CREATE INDEX IF NOT EXISTS idx_quotes_tenant_id ON quotes (tenant_id);
CREATE INDEX IF NOT EXISTS idx_orders_tenant_id ON orders (tenant_id);
CREATE INDEX IF NOT EXISTS idx_supplier_pos_tenant_id ON supplier_pos (tenant_id);
CREATE INDEX IF NOT EXISTS idx_supplier_inquiries_tenant_id ON supplier_inquiries (tenant_id);
CREATE INDEX IF NOT EXISTS idx_warehouses_tenant_id ON warehouses (tenant_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_locations_tenant_id ON warehouse_locations (tenant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_tenant_id ON inventory (tenant_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_tenant_id ON stock_movements (tenant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transfers_tenant_id ON inventory_transfers (tenant_id);
CREATE INDEX IF NOT EXISTS idx_cycle_counts_tenant_id ON cycle_counts (tenant_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_tenant_id ON vehicles (tenant_id);
CREATE INDEX IF NOT EXISTS idx_drivers_tenant_id ON drivers (tenant_id);
CREATE INDEX IF NOT EXISTS idx_delivery_routes_tenant_id ON delivery_routes (tenant_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_tenant_id ON deliveries (tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_id ON invoices (tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_tenant_id ON payments (tenant_id);
CREATE INDEX IF NOT EXISTS idx_credit_notes_tenant_id ON credit_notes (tenant_id);
CREATE INDEX IF NOT EXISTS idx_ar_aging_snapshots_tenant_id ON ar_aging_snapshots (tenant_id);
CREATE INDEX IF NOT EXISTS idx_supplier_invoices_tenant_id ON supplier_invoices (tenant_id);
CREATE INDEX IF NOT EXISTS idx_returns_tenant_id ON returns (tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_tenant_id ON user_profiles (tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_tenant_id ON user_roles (tenant_id);
CREATE INDEX IF NOT EXISTS idx_employees_tenant_id ON employees (tenant_id);
-- system_settings, state_history: Phase 14 tables -- indexes deferred

-- Entity-specific FK indexes for RLS WHERE clauses
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders (customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_by ON orders (created_by);
CREATE INDEX IF NOT EXISTS idx_quotes_customer_id ON quotes (customer_id);
CREATE INDEX IF NOT EXISTS idx_quote_requests_customer_id ON quote_requests (customer_id);
CREATE INDEX IF NOT EXISTS idx_supplier_pos_supplier_id ON supplier_pos (supplier_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_driver_id ON deliveries (driver_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_order_id ON deliveries (order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices (customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments (customer_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles (user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles (user_id);
CREATE INDEX IF NOT EXISTS idx_returns_customer_id ON returns (customer_id);
CREATE INDEX IF NOT EXISTS idx_credit_notes_customer_id ON credit_notes (customer_id);
CREATE INDEX IF NOT EXISTS idx_ar_aging_snapshots_customer_id ON ar_aging_snapshots (customer_id);
CREATE INDEX IF NOT EXISTS idx_projects_customer_id ON projects (customer_id);
CREATE INDEX IF NOT EXISTS idx_credit_applications_customer_id ON credit_applications (customer_id);

-- Audit and operations table indexes
CREATE INDEX IF NOT EXISTS idx_vehicle_inspections_tenant ON vehicle_inspections (tenant_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_inspections_driver ON vehicle_inspections (driver_id, inspection_date DESC);
CREATE INDEX IF NOT EXISTS idx_vehicle_inspections_vehicle ON vehicle_inspections (vehicle_id, inspection_date DESC);
CREATE INDEX IF NOT EXISTS idx_driver_shifts_tenant ON driver_shifts (tenant_id);
CREATE INDEX IF NOT EXISTS idx_driver_shifts_driver_date ON driver_shifts (driver_id, shift_date DESC);
CREATE INDEX IF NOT EXISTS idx_driver_shifts_status ON driver_shifts (tenant_id, status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_driver_jobs_tenant ON driver_jobs (tenant_id);
CREATE INDEX IF NOT EXISTS idx_driver_jobs_status ON driver_jobs (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_driver_jobs_driver ON driver_jobs (offered_to_driver_id) WHERE offered_to_driver_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_driver_jobs_available ON driver_jobs (tenant_id, expires_at) WHERE status = 'available';
CREATE INDEX IF NOT EXISTS idx_driver_earnings_tenant ON driver_earnings (tenant_id);
CREATE INDEX IF NOT EXISTS idx_driver_earnings_driver ON driver_earnings (driver_id, period_start DESC);
CREATE INDEX IF NOT EXISTS idx_driver_earnings_status ON driver_earnings (tenant_id, status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_load_verifications_tenant ON load_verifications (tenant_id);
CREATE INDEX IF NOT EXISTS idx_load_verifications_route ON load_verifications (delivery_route_id);
CREATE INDEX IF NOT EXISTS idx_company_bank_accounts_tenant ON company_bank_accounts (tenant_id);
CREATE INDEX IF NOT EXISTS idx_delivery_zones_tenant ON delivery_zones (tenant_id);
CREATE INDEX IF NOT EXISTS idx_delivery_zones_active ON delivery_zones (tenant_id) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_supplier_invoice_items_tenant ON supplier_invoice_items (tenant_id);
CREATE INDEX IF NOT EXISTS idx_supplier_invoice_items_invoice ON supplier_invoice_items (supplier_invoice_id);
CREATE INDEX IF NOT EXISTS idx_supplier_invoice_items_match ON supplier_invoice_items (tenant_id, match_status) WHERE match_status IN ('variance_exceeds', 'unmatched');
CREATE INDEX IF NOT EXISTS idx_source_inventory_tenant ON source_inventory (tenant_id);
CREATE INDEX IF NOT EXISTS idx_source_inventory_product ON source_inventory (product_id, is_suppressed) WHERE is_suppressed = FALSE;
CREATE INDEX IF NOT EXISTS idx_source_inventory_supplier ON source_inventory (supplier_id);
CREATE INDEX IF NOT EXISTS idx_inventory_reservations_tenant ON inventory_reservations (tenant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_reservations_source ON inventory_reservations (source_inventory_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_inventory_reservations_inventory ON inventory_reservations (inventory_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_inventory_reservations_quote ON inventory_reservations (quote_id) WHERE quote_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_reservations_expiry ON inventory_reservations (expires_at) WHERE status = 'active' AND reservation_type = 'soft';
CREATE INDEX IF NOT EXISTS idx_customer_feedback_tenant ON customer_feedback (tenant_id);
CREATE INDEX IF NOT EXISTS idx_customer_feedback_customer ON customer_feedback (customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_feedback_delivery ON customer_feedback (delivery_id) WHERE delivery_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_supplier_agreements_tenant ON supplier_agreements (tenant_id);
CREATE INDEX IF NOT EXISTS idx_supplier_agreements_supplier ON supplier_agreements (supplier_id, status);
CREATE INDEX IF NOT EXISTS idx_supplier_agreements_active ON supplier_agreements (tenant_id, end_date) WHERE status = 'active';
-- ceo_digests: Phase 14 table -- indexes deferred

-- ============================================================================
-- 2. Composite Indexes (btree, multi-column)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_orders_customer_status ON orders (tenant_id, customer_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders (tenant_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quotes_customer_status ON quotes (tenant_id, customer_id, status);
CREATE INDEX IF NOT EXISTS idx_quotes_assigned_status ON quotes (tenant_id, assigned_to, status);
CREATE INDEX IF NOT EXISTS idx_qr_status_urgency ON quote_requests (tenant_id, status, urgency);
CREATE INDEX IF NOT EXISTS idx_deliveries_driver_date ON deliveries (tenant_id, driver_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_deliveries_status_date ON deliveries (tenant_id, status, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_deliveries_route ON deliveries (route_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status_due ON invoices (tenant_id, status, due_date);
CREATE INDEX IF NOT EXISTS idx_inventory_product_warehouse ON inventory (tenant_id, product_id, warehouse_id);
CREATE INDEX IF NOT EXISTS idx_spo_supplier_status ON supplier_pos (tenant_id, supplier_id, status);
CREATE INDEX IF NOT EXISTS idx_spo_order ON supplier_pos (order_id);
-- state_history: Phase 14 table -- index deferred
CREATE INDEX IF NOT EXISTS idx_ar_aging_date ON ar_aging_snapshots (tenant_id, snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_addresses_entity ON addresses (addressable_type, addressable_id);
CREATE INDEX IF NOT EXISTS idx_customer_contacts_customer ON customer_contacts (customer_id);
CREATE INDEX IF NOT EXISTS idx_product_suppliers_product ON product_suppliers (product_id);
CREATE INDEX IF NOT EXISTS idx_product_suppliers_supplier ON product_suppliers (supplier_id);
CREATE INDEX IF NOT EXISTS idx_payment_apps_invoice ON payment_applications (invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_apps_payment ON payment_applications (payment_id);
CREATE INDEX IF NOT EXISTS idx_driver_locations_driver ON driver_locations (driver_id, recorded_at DESC);

-- Invoice-related composite
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items (invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_disputes_invoice ON invoice_disputes (invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_disputes_tenant ON invoice_disputes (tenant_id);

-- Payment-related composite
CREATE INDEX IF NOT EXISTS idx_cheque_tracking_tenant ON cheque_tracking (tenant_id);
CREATE INDEX IF NOT EXISTS idx_cheque_tracking_payment ON cheque_tracking (payment_id);
CREATE INDEX IF NOT EXISTS idx_letters_of_credit_tenant ON letters_of_credit (tenant_id);
CREATE INDEX IF NOT EXISTS idx_letters_of_credit_customer ON letters_of_credit (applicant_customer_id);

-- Credit note composite
CREATE INDEX IF NOT EXISTS idx_credit_note_apps_credit_note ON credit_note_applications (credit_note_id);
CREATE INDEX IF NOT EXISTS idx_credit_note_apps_invoice ON credit_note_applications (invoice_id);

-- Withholding tax
CREATE INDEX IF NOT EXISTS idx_withholding_tax_tenant ON withholding_tax_certificates (tenant_id);
CREATE INDEX IF NOT EXISTS idx_withholding_tax_supplier ON withholding_tax_certificates (supplier_id);

-- Supplier invoice composite
CREATE INDEX IF NOT EXISTS idx_supplier_invoices_supplier ON supplier_invoices (supplier_id);

-- Revenue recognition
CREATE INDEX IF NOT EXISTS idx_rre_tenant_fiscal ON revenue_recognition_events (tenant_id, fiscal_year, fiscal_month);
CREATE INDEX IF NOT EXISTS idx_rre_customer ON revenue_recognition_events (tenant_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_rre_recognition_date ON revenue_recognition_events (tenant_id, recognition_date);

-- Drop-ship POD composite
CREATE INDEX IF NOT EXISTS idx_drop_ship_pod_tenant ON drop_ship_pod (tenant_id);
CREATE INDEX IF NOT EXISTS idx_drop_ship_pod_supplier ON drop_ship_pod (supplier_id);
CREATE INDEX IF NOT EXISTS idx_drop_ship_pod_customer ON drop_ship_pod (customer_id);
CREATE INDEX IF NOT EXISTS idx_drop_ship_pod_status ON drop_ship_pod (tenant_id, status);

-- ============================================================================
-- 3. Partial Indexes (btree with WHERE clause)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_quotes_valid_until ON quotes (tenant_id, valid_until) WHERE status IN ('sent', 'viewed');
CREATE INDEX IF NOT EXISTS idx_invoices_overdue ON invoices (tenant_id, due_date) WHERE status IN ('sent', 'viewed', 'partially_paid', 'overdue');
CREATE INDEX IF NOT EXISTS idx_payments_unmatched ON payments (tenant_id, status, received_date) WHERE status IN ('received', 'unmatched');
CREATE INDEX IF NOT EXISTS idx_inventory_low_stock ON inventory (tenant_id, warehouse_id) WHERE quantity_available <= reorder_point;
CREATE INDEX IF NOT EXISTS idx_products_category ON products (tenant_id, category) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_invoices_type ON invoices (tenant_id, invoice_type) WHERE invoice_type = 'proforma';
CREATE INDEX IF NOT EXISTS idx_invoices_quote ON invoices (quote_id) WHERE quote_id IS NOT NULL;

-- Drop-ship POD auto-confirm deadline
CREATE INDEX IF NOT EXISTS idx_drop_ship_pod_auto_deadline ON drop_ship_pod (auto_confirm_deadline) WHERE status = 'awaiting_customer_confirmation' AND auto_confirmed = FALSE;

-- ============================================================================
-- 4. Full-Text Search Indexes (GIN)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_products_search ON products USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS idx_customers_search ON customers USING GIN (to_tsvector('english', company_name || ' ' || COALESCE(legal_name, '') || ' ' || COALESCE(trade_name, '')));
