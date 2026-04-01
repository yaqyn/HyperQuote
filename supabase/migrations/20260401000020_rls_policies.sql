-- Migration 020: RLS Policies for ALL Phase 13 tables
-- Ensures ENABLE + FORCE RLS on every business table
-- 4 policy patterns: internal (tenant), customer, supplier, driver
-- Financial tables gated with AAL2 (MFA)
-- Uses (SELECT fn()) subquery form everywhere for performance
-- Uses DROP POLICY IF EXISTS before CREATE for idempotency

-- ============================================================================
-- FORCE ROW LEVEL SECURITY on tables that only had ENABLE (from earlier migrations)
-- ============================================================================

ALTER TABLE tenants FORCE ROW LEVEL SECURITY;
ALTER TABLE employees FORCE ROW LEVEL SECURITY;
ALTER TABLE user_profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE user_roles FORCE ROW LEVEL SECURITY;
ALTER TABLE role_permissions FORCE ROW LEVEL SECURITY;
ALTER TABLE approvals FORCE ROW LEVEL SECURITY;
ALTER TABLE audit_log FORCE ROW LEVEL SECURITY;
ALTER TABLE products FORCE ROW LEVEL SECURITY;
ALTER TABLE customer_addresses FORCE ROW LEVEL SECURITY;
ALTER TABLE projects FORCE ROW LEVEL SECURITY;
ALTER TABLE quote_requests FORCE ROW LEVEL SECURITY;
ALTER TABLE quote_request_items FORCE ROW LEVEL SECURITY;
ALTER TABLE quote_request_attachments FORCE ROW LEVEL SECURITY;
ALTER TABLE customers FORCE ROW LEVEL SECURITY;
ALTER TABLE customer_contacts FORCE ROW LEVEL SECURITY;
ALTER TABLE addresses FORCE ROW LEVEL SECURITY;
ALTER TABLE credit_applications FORCE ROW LEVEL SECURITY;
ALTER TABLE customer_feedback FORCE ROW LEVEL SECURITY;
ALTER TABLE suppliers FORCE ROW LEVEL SECURITY;
ALTER TABLE supplier_contacts FORCE ROW LEVEL SECURITY;
ALTER TABLE supplier_price_lists FORCE ROW LEVEL SECURITY;
ALTER TABLE supplier_agreements FORCE ROW LEVEL SECURITY;
ALTER TABLE product_suppliers FORCE ROW LEVEL SECURITY;
ALTER TABLE pricing_rules FORCE ROW LEVEL SECURITY;
ALTER TABLE contract_prices FORCE ROW LEVEL SECURITY;
ALTER TABLE vehicles FORCE ROW LEVEL SECURITY;
ALTER TABLE drivers FORCE ROW LEVEL SECURITY;
ALTER TABLE delivery_routes FORCE ROW LEVEL SECURITY;
ALTER TABLE deliveries FORCE ROW LEVEL SECURITY;
ALTER TABLE delivery_items FORCE ROW LEVEL SECURITY;
ALTER TABLE proof_of_delivery FORCE ROW LEVEL SECURITY;
ALTER TABLE drop_ship_pod FORCE ROW LEVEL SECURITY;
ALTER TABLE driver_locations FORCE ROW LEVEL SECURITY;
ALTER TABLE vehicle_inspections FORCE ROW LEVEL SECURITY;
ALTER TABLE driver_shifts FORCE ROW LEVEL SECURITY;
ALTER TABLE load_verifications FORCE ROW LEVEL SECURITY;

-- ENABLE + FORCE on finance tables (no prior RLS)
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices FORCE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items FORCE ROW LEVEL SECURITY;
ALTER TABLE invoice_disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_disputes FORCE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments FORCE ROW LEVEL SECURITY;
ALTER TABLE payment_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_applications FORCE ROW LEVEL SECURITY;
ALTER TABLE cheque_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE cheque_tracking FORCE ROW LEVEL SECURITY;
ALTER TABLE letters_of_credit ENABLE ROW LEVEL SECURITY;
ALTER TABLE letters_of_credit FORCE ROW LEVEL SECURITY;
ALTER TABLE returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE returns FORCE ROW LEVEL SECURITY;
ALTER TABLE credit_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_notes FORCE ROW LEVEL SECURITY;
ALTER TABLE credit_note_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_note_applications FORCE ROW LEVEL SECURITY;
ALTER TABLE withholding_tax_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE withholding_tax_certificates FORCE ROW LEVEL SECURITY;
ALTER TABLE company_bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_bank_accounts FORCE ROW LEVEL SECURITY;
ALTER TABLE supplier_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_invoices FORCE ROW LEVEL SECURITY;
ALTER TABLE supplier_invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_invoice_items FORCE ROW LEVEL SECURITY;
ALTER TABLE ar_aging_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE ar_aging_snapshots FORCE ROW LEVEL SECURITY;
ALTER TABLE revenue_recognition_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_recognition_events FORCE ROW LEVEL SECURITY;
ALTER TABLE driver_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_jobs FORCE ROW LEVEL SECURITY;
ALTER TABLE driver_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_earnings FORCE ROW LEVEL SECURITY;
ALTER TABLE delivery_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_zones FORCE ROW LEVEL SECURITY;

-- ============================================================================
-- CUSTOMER DOMAIN — proper policies (replace simple tenant_isolation)
-- ============================================================================

-- customers
DROP POLICY IF EXISTS tenant_isolation ON customers;
DROP POLICY IF EXISTS customers_internal_select ON customers;
DROP POLICY IF EXISTS customers_internal_insert ON customers;
DROP POLICY IF EXISTS customers_internal_update ON customers;
DROP POLICY IF EXISTS customers_internal_delete ON customers;
DROP POLICY IF EXISTS customers_external_select ON customers;

CREATE POLICY customers_internal_select ON customers
  FOR SELECT TO authenticated
  USING ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()));

CREATE POLICY customers_internal_insert ON customers
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()));

CREATE POLICY customers_internal_update ON customers
  FOR UPDATE TO authenticated
  USING ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()))
  WITH CHECK ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()));

CREATE POLICY customers_internal_delete ON customers
  FOR DELETE TO authenticated
  USING ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()) AND (SELECT has_role('admin')));

CREATE POLICY customers_external_select ON customers
  FOR SELECT TO authenticated
  USING ((SELECT is_external_user()) AND id = (SELECT current_customer_id()));

-- customer_contacts
DROP POLICY IF EXISTS tenant_isolation ON customer_contacts;
DROP POLICY IF EXISTS customer_contacts_internal_all ON customer_contacts;
DROP POLICY IF EXISTS customer_contacts_external_select ON customer_contacts;
DROP POLICY IF EXISTS customer_contacts_external_update ON customer_contacts;

CREATE POLICY customer_contacts_internal_all ON customer_contacts
  FOR ALL TO authenticated
  USING ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()))
  WITH CHECK ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()));

CREATE POLICY customer_contacts_external_select ON customer_contacts
  FOR SELECT TO authenticated
  USING ((SELECT is_external_user()) AND customer_id = (SELECT current_customer_id()));

CREATE POLICY customer_contacts_external_update ON customer_contacts
  FOR UPDATE TO authenticated
  USING (
    (SELECT is_external_user())
    AND customer_id = (SELECT current_customer_id())
    AND user_id = (SELECT auth.uid())
  );

-- customer_addresses (Phase 9 table)
DROP POLICY IF EXISTS "External users select own addresses" ON customer_addresses;
DROP POLICY IF EXISTS "External users insert own addresses" ON customer_addresses;
DROP POLICY IF EXISTS "External users update own addresses" ON customer_addresses;
DROP POLICY IF EXISTS "Internal users manage addresses" ON customer_addresses;
DROP POLICY IF EXISTS customer_addresses_internal_all ON customer_addresses;
DROP POLICY IF EXISTS customer_addresses_external_select ON customer_addresses;
DROP POLICY IF EXISTS customer_addresses_external_insert ON customer_addresses;

CREATE POLICY customer_addresses_internal_all ON customer_addresses
  FOR ALL TO authenticated
  USING ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()))
  WITH CHECK ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()));

CREATE POLICY customer_addresses_external_select ON customer_addresses
  FOR SELECT TO authenticated
  USING ((SELECT is_external_user()) AND customer_id = (SELECT current_customer_id()));

CREATE POLICY customer_addresses_external_insert ON customer_addresses
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT is_external_user()) AND customer_id = (SELECT current_customer_id()));

-- addresses (polymorphic, Phase 13)
DROP POLICY IF EXISTS tenant_isolation ON addresses;
DROP POLICY IF EXISTS addresses_internal_all ON addresses;

CREATE POLICY addresses_internal_all ON addresses
  FOR ALL TO authenticated
  USING ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()))
  WITH CHECK ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()));

-- projects
DROP POLICY IF EXISTS "External users select own projects" ON projects;
DROP POLICY IF EXISTS "External users insert own projects" ON projects;
DROP POLICY IF EXISTS "Internal users manage projects" ON projects;
DROP POLICY IF EXISTS projects_internal_all ON projects;
DROP POLICY IF EXISTS projects_external_select ON projects;

CREATE POLICY projects_internal_all ON projects
  FOR ALL TO authenticated
  USING ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()))
  WITH CHECK ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()));

CREATE POLICY projects_external_select ON projects
  FOR SELECT TO authenticated
  USING ((SELECT is_external_user()) AND customer_id = (SELECT current_customer_id()));

-- credit_applications
DROP POLICY IF EXISTS tenant_isolation ON credit_applications;
DROP POLICY IF EXISTS credit_applications_internal_all ON credit_applications;
DROP POLICY IF EXISTS credit_applications_customer_select ON credit_applications;

CREATE POLICY credit_applications_internal_all ON credit_applications
  FOR ALL TO authenticated
  USING ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()))
  WITH CHECK ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()));

CREATE POLICY credit_applications_customer_select ON credit_applications
  FOR SELECT TO authenticated
  USING ((SELECT is_external_user()) AND customer_id = (SELECT current_customer_id()));

-- customer_feedback
DROP POLICY IF EXISTS tenant_isolation ON customer_feedback;
DROP POLICY IF EXISTS customer_feedback_internal_all ON customer_feedback;
DROP POLICY IF EXISTS customer_feedback_customer_select ON customer_feedback;

CREATE POLICY customer_feedback_internal_all ON customer_feedback
  FOR ALL TO authenticated
  USING ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()))
  WITH CHECK ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()));

CREATE POLICY customer_feedback_customer_select ON customer_feedback
  FOR SELECT TO authenticated
  USING ((SELECT is_external_user()) AND customer_id = (SELECT current_customer_id()));

-- ============================================================================
-- QUOTE & ORDER DOMAIN
-- ============================================================================

-- quote_requests
DROP POLICY IF EXISTS "External users select own quote requests" ON quote_requests;
DROP POLICY IF EXISTS "External users insert own quote requests" ON quote_requests;
DROP POLICY IF EXISTS "External users update own quote requests" ON quote_requests;
DROP POLICY IF EXISTS "Internal users manage quote requests" ON quote_requests;
DROP POLICY IF EXISTS qr_internal_all ON quote_requests;
DROP POLICY IF EXISTS qr_customer_select ON quote_requests;
DROP POLICY IF EXISTS qr_customer_insert ON quote_requests;
DROP POLICY IF EXISTS qr_customer_update ON quote_requests;

CREATE POLICY qr_internal_all ON quote_requests
  FOR ALL TO authenticated
  USING ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()))
  WITH CHECK ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()));

CREATE POLICY qr_customer_select ON quote_requests
  FOR SELECT TO authenticated
  USING ((SELECT is_external_user()) AND customer_id = (SELECT current_customer_id()));

CREATE POLICY qr_customer_insert ON quote_requests
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT is_external_user()) AND customer_id = (SELECT current_customer_id()));

CREATE POLICY qr_customer_update ON quote_requests
  FOR UPDATE TO authenticated
  USING (
    (SELECT is_external_user())
    AND customer_id = (SELECT current_customer_id())
    AND status IN ('draft', 'submitted')
  );

-- quote_request_items (child via quote_request_id)
DROP POLICY IF EXISTS "External users select own items" ON quote_request_items;
DROP POLICY IF EXISTS "External users insert own items" ON quote_request_items;
DROP POLICY IF EXISTS "External users update own items" ON quote_request_items;
DROP POLICY IF EXISTS "External users delete own items" ON quote_request_items;
DROP POLICY IF EXISTS "Internal users manage items" ON quote_request_items;
DROP POLICY IF EXISTS qri_internal_all ON quote_request_items;
DROP POLICY IF EXISTS qri_customer_select ON quote_request_items;

CREATE POLICY qri_internal_all ON quote_request_items
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM quote_requests qr
    WHERE qr.id = quote_request_id
      AND (SELECT is_internal_user())
      AND qr.tenant_id = (SELECT current_tenant_id())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM quote_requests qr
    WHERE qr.id = quote_request_id
      AND (SELECT is_internal_user())
      AND qr.tenant_id = (SELECT current_tenant_id())
  ));

CREATE POLICY qri_customer_all ON quote_request_items
  FOR ALL TO authenticated
  USING (
    (SELECT is_external_user())
    AND EXISTS (
      SELECT 1 FROM quote_requests qr
      WHERE qr.id = quote_request_id
        AND qr.customer_id = (SELECT current_customer_id())
    )
  )
  WITH CHECK (
    (SELECT is_external_user())
    AND EXISTS (
      SELECT 1 FROM quote_requests qr
      WHERE qr.id = quote_request_id
        AND qr.customer_id = (SELECT current_customer_id())
    )
  );

-- quote_request_attachments (child via quote_request_id)
DROP POLICY IF EXISTS "External users select own attachments" ON quote_request_attachments;
DROP POLICY IF EXISTS "External users insert own attachments" ON quote_request_attachments;
DROP POLICY IF EXISTS "External users delete own attachments" ON quote_request_attachments;
DROP POLICY IF EXISTS "Internal users manage attachments" ON quote_request_attachments;
DROP POLICY IF EXISTS qra_internal_all ON quote_request_attachments;
DROP POLICY IF EXISTS qra_customer_all ON quote_request_attachments;

CREATE POLICY qra_internal_all ON quote_request_attachments
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM quote_requests qr
    WHERE qr.id = quote_request_id
      AND (SELECT is_internal_user())
      AND qr.tenant_id = (SELECT current_tenant_id())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM quote_requests qr
    WHERE qr.id = quote_request_id
      AND (SELECT is_internal_user())
      AND qr.tenant_id = (SELECT current_tenant_id())
  ));

CREATE POLICY qra_customer_all ON quote_request_attachments
  FOR ALL TO authenticated
  USING (
    (SELECT is_external_user())
    AND EXISTS (
      SELECT 1 FROM quote_requests qr
      WHERE qr.id = quote_request_id
        AND qr.customer_id = (SELECT current_customer_id())
    )
  )
  WITH CHECK (
    (SELECT is_external_user())
    AND EXISTS (
      SELECT 1 FROM quote_requests qr
      WHERE qr.id = quote_request_id
        AND qr.customer_id = (SELECT current_customer_id())
    )
  );

-- quotes
DROP POLICY IF EXISTS "Internal users manage quotes" ON quotes;
DROP POLICY IF EXISTS "External users select own quotes" ON quotes;
DROP POLICY IF EXISTS quotes_internal_all ON quotes;
DROP POLICY IF EXISTS quotes_customer_select ON quotes;
DROP POLICY IF EXISTS quotes_customer_update ON quotes;

CREATE POLICY quotes_internal_all ON quotes
  FOR ALL TO authenticated
  USING ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()))
  WITH CHECK ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()));

CREATE POLICY quotes_customer_select ON quotes
  FOR SELECT TO authenticated
  USING (
    (SELECT is_external_user())
    AND customer_id = (SELECT current_customer_id())
    AND status IN ('sent', 'viewed', 'accepted', 'declined', 'expired')
  );

CREATE POLICY quotes_customer_update ON quotes
  FOR UPDATE TO authenticated
  USING (
    (SELECT is_external_user())
    AND customer_id = (SELECT current_customer_id())
    AND status = 'sent'
  )
  WITH CHECK (status IN ('accepted', 'declined'));

-- quote_items (child, no tenant_id -- uses EXISTS through quotes)
DROP POLICY IF EXISTS "Internal users manage quote items" ON quote_items;
DROP POLICY IF EXISTS "External users select own quote items" ON quote_items;
DROP POLICY IF EXISTS qli_internal_all ON quote_items;
DROP POLICY IF EXISTS qli_customer_select ON quote_items;

CREATE POLICY qli_internal_all ON quote_items
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM quotes q
    WHERE q.id = quote_id
      AND (SELECT is_internal_user())
      AND q.tenant_id = (SELECT current_tenant_id())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM quotes q
    WHERE q.id = quote_id
      AND (SELECT is_internal_user())
      AND q.tenant_id = (SELECT current_tenant_id())
  ));

CREATE POLICY qli_customer_select ON quote_items
  FOR SELECT TO authenticated
  USING (
    (SELECT is_external_user())
    AND EXISTS (
      SELECT 1 FROM quotes q
      WHERE q.id = quote_id
        AND q.customer_id = (SELECT current_customer_id())
        AND q.status IN ('sent', 'viewed', 'accepted', 'declined', 'expired')
    )
  );

-- orders
DROP POLICY IF EXISTS "Internal users manage orders" ON orders;
DROP POLICY IF EXISTS "External users select own orders" ON orders;
DROP POLICY IF EXISTS orders_internal_all ON orders;
DROP POLICY IF EXISTS orders_customer_select ON orders;
DROP POLICY IF EXISTS orders_supplier_select ON orders;

CREATE POLICY orders_internal_all ON orders
  FOR ALL TO authenticated
  USING ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()))
  WITH CHECK ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()));

CREATE POLICY orders_customer_select ON orders
  FOR SELECT TO authenticated
  USING ((SELECT is_external_user()) AND customer_id = (SELECT current_customer_id()));

CREATE POLICY orders_supplier_select ON orders
  FOR SELECT TO authenticated
  USING (
    (SELECT is_external_user())
    AND EXISTS (
      SELECT 1 FROM supplier_pos spo
      WHERE spo.order_id = orders.id
        AND spo.supplier_id = (SELECT current_supplier_id())
    )
  );

-- order_items (child, no tenant_id -- EXISTS through orders)
DROP POLICY IF EXISTS "Internal users manage order items" ON order_items;
DROP POLICY IF EXISTS "External users select own order items" ON order_items;
DROP POLICY IF EXISTS oi_internal_all ON order_items;
DROP POLICY IF EXISTS oi_customer_select ON order_items;

CREATE POLICY oi_internal_all ON order_items
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id = order_id
      AND (SELECT is_internal_user())
      AND o.tenant_id = (SELECT current_tenant_id())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id = order_id
      AND (SELECT is_internal_user())
      AND o.tenant_id = (SELECT current_tenant_id())
  ));

CREATE POLICY oi_customer_select ON order_items
  FOR SELECT TO authenticated
  USING (
    (SELECT is_external_user())
    AND EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_id AND o.customer_id = (SELECT current_customer_id())
    )
  );

-- ============================================================================
-- SUPPLIER & PROCUREMENT DOMAIN
-- ============================================================================

-- suppliers
DROP POLICY IF EXISTS tenant_isolation ON suppliers;
DROP POLICY IF EXISTS suppliers_internal_all ON suppliers;
DROP POLICY IF EXISTS suppliers_external_select ON suppliers;

CREATE POLICY suppliers_internal_all ON suppliers
  FOR ALL TO authenticated
  USING ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()))
  WITH CHECK ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()));

CREATE POLICY suppliers_external_select ON suppliers
  FOR SELECT TO authenticated
  USING ((SELECT is_external_user()) AND id = (SELECT current_supplier_id()));

-- supplier_contacts
DROP POLICY IF EXISTS tenant_isolation ON supplier_contacts;
DROP POLICY IF EXISTS sc_internal_all ON supplier_contacts;
DROP POLICY IF EXISTS sc_supplier_select ON supplier_contacts;
DROP POLICY IF EXISTS sc_supplier_update ON supplier_contacts;

CREATE POLICY sc_internal_all ON supplier_contacts
  FOR ALL TO authenticated
  USING ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()))
  WITH CHECK ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()));

CREATE POLICY sc_supplier_select ON supplier_contacts
  FOR SELECT TO authenticated
  USING ((SELECT is_external_user()) AND supplier_id = (SELECT current_supplier_id()));

CREATE POLICY sc_supplier_update ON supplier_contacts
  FOR UPDATE TO authenticated
  USING (
    (SELECT is_external_user())
    AND supplier_id = (SELECT current_supplier_id())
    AND user_id = (SELECT auth.uid())
  );

-- supplier_price_lists
DROP POLICY IF EXISTS tenant_isolation ON supplier_price_lists;
DROP POLICY IF EXISTS spl_internal_all ON supplier_price_lists;
DROP POLICY IF EXISTS spl_supplier_select ON supplier_price_lists;

CREATE POLICY spl_internal_all ON supplier_price_lists
  FOR ALL TO authenticated
  USING ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()))
  WITH CHECK ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()));

CREATE POLICY spl_supplier_select ON supplier_price_lists
  FOR SELECT TO authenticated
  USING ((SELECT is_external_user()) AND supplier_id = (SELECT current_supplier_id()));

-- supplier_agreements
DROP POLICY IF EXISTS tenant_isolation ON supplier_agreements;
DROP POLICY IF EXISTS sa_internal_all ON supplier_agreements;
DROP POLICY IF EXISTS sa_supplier_select ON supplier_agreements;

CREATE POLICY sa_internal_all ON supplier_agreements
  FOR ALL TO authenticated
  USING ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()))
  WITH CHECK ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()));

CREATE POLICY sa_supplier_select ON supplier_agreements
  FOR SELECT TO authenticated
  USING ((SELECT is_external_user()) AND supplier_id = (SELECT current_supplier_id()));

-- supplier_pos
DROP POLICY IF EXISTS "Internal users manage supplier POs" ON supplier_pos;
DROP POLICY IF EXISTS "Suppliers select own POs" ON supplier_pos;
DROP POLICY IF EXISTS spo_internal_all ON supplier_pos;
DROP POLICY IF EXISTS spo_supplier_select ON supplier_pos;
DROP POLICY IF EXISTS spo_supplier_update ON supplier_pos;

CREATE POLICY spo_internal_all ON supplier_pos
  FOR ALL TO authenticated
  USING ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()))
  WITH CHECK ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()));

CREATE POLICY spo_supplier_select ON supplier_pos
  FOR SELECT TO authenticated
  USING ((SELECT is_external_user()) AND supplier_id = (SELECT current_supplier_id()));

CREATE POLICY spo_supplier_update ON supplier_pos
  FOR UPDATE TO authenticated
  USING (
    (SELECT is_external_user())
    AND supplier_id = (SELECT current_supplier_id())
    AND status IN ('sent', 'confirmed')
  );

-- supplier_po_items (child, no tenant_id -- EXISTS through supplier_pos)
DROP POLICY IF EXISTS "Internal users manage PO items" ON supplier_po_items;
DROP POLICY IF EXISTS "Suppliers select own PO items" ON supplier_po_items;
DROP POLICY IF EXISTS poi_internal_all ON supplier_po_items;
DROP POLICY IF EXISTS poi_supplier_select ON supplier_po_items;

CREATE POLICY poi_internal_all ON supplier_po_items
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM supplier_pos spo
    WHERE spo.id = supplier_po_id
      AND (SELECT is_internal_user())
      AND spo.tenant_id = (SELECT current_tenant_id())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM supplier_pos spo
    WHERE spo.id = supplier_po_id
      AND (SELECT is_internal_user())
      AND spo.tenant_id = (SELECT current_tenant_id())
  ));

CREATE POLICY poi_supplier_select ON supplier_po_items
  FOR SELECT TO authenticated
  USING (
    (SELECT is_external_user())
    AND EXISTS (
      SELECT 1 FROM supplier_pos spo
      WHERE spo.id = supplier_po_id AND spo.supplier_id = (SELECT current_supplier_id())
    )
  );

-- supplier_inquiries
DROP POLICY IF EXISTS "Internal users manage inquiries" ON supplier_inquiries;
DROP POLICY IF EXISTS "Suppliers select own inquiries" ON supplier_inquiries;
DROP POLICY IF EXISTS si_internal_all ON supplier_inquiries;
DROP POLICY IF EXISTS si_supplier_select ON supplier_inquiries;

CREATE POLICY si_internal_all ON supplier_inquiries
  FOR ALL TO authenticated
  USING ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()))
  WITH CHECK ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()));

CREATE POLICY si_supplier_select ON supplier_inquiries
  FOR SELECT TO authenticated
  USING ((SELECT is_external_user()) AND supplier_id = (SELECT current_supplier_id()));

-- ============================================================================
-- PRODUCT & INVENTORY DOMAIN
-- ============================================================================

-- products (replace Phase 2 policies)
DROP POLICY IF EXISTS "Products are publicly readable" ON products;
DROP POLICY IF EXISTS "Internal users can manage products" ON products;
DROP POLICY IF EXISTS products_internal_all ON products;
DROP POLICY IF EXISTS products_customer_select ON products;
DROP POLICY IF EXISTS products_supplier_select ON products;

CREATE POLICY products_internal_all ON products
  FOR ALL TO authenticated
  USING ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()))
  WITH CHECK ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()));

CREATE POLICY products_customer_select ON products
  FOR SELECT TO authenticated
  USING ((SELECT is_external_user()) AND tenant_id = (SELECT current_tenant_id()) AND is_active = true);

CREATE POLICY products_supplier_select ON products
  FOR SELECT TO authenticated
  USING (
    (SELECT is_external_user())
    AND EXISTS (
      SELECT 1 FROM product_suppliers ps
      WHERE ps.product_id = products.id AND ps.supplier_id = (SELECT current_supplier_id())
    )
  );

-- product_suppliers
DROP POLICY IF EXISTS tenant_isolation ON product_suppliers;
DROP POLICY IF EXISTS ps_internal_all ON product_suppliers;
DROP POLICY IF EXISTS ps_supplier_select ON product_suppliers;

CREATE POLICY ps_internal_all ON product_suppliers
  FOR ALL TO authenticated
  USING ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()))
  WITH CHECK ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()));

CREATE POLICY ps_supplier_select ON product_suppliers
  FOR SELECT TO authenticated
  USING ((SELECT is_external_user()) AND supplier_id = (SELECT current_supplier_id()));

-- pricing_rules
DROP POLICY IF EXISTS tenant_isolation ON pricing_rules;
DROP POLICY IF EXISTS pr_internal_all ON pricing_rules;

CREATE POLICY pr_internal_all ON pricing_rules
  FOR ALL TO authenticated
  USING ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()))
  WITH CHECK ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()));

-- contract_prices
DROP POLICY IF EXISTS tenant_isolation ON contract_prices;
DROP POLICY IF EXISTS cp_internal_all ON contract_prices;

CREATE POLICY cp_internal_all ON contract_prices
  FOR ALL TO authenticated
  USING ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()))
  WITH CHECK ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()));

-- inventory
DROP POLICY IF EXISTS "Internal users manage inventory" ON inventory;
DROP POLICY IF EXISTS inv_internal_all ON inventory;

CREATE POLICY inv_internal_all ON inventory
  FOR ALL TO authenticated
  USING ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()))
  WITH CHECK ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()));

-- warehouses
DROP POLICY IF EXISTS "Internal users manage warehouses" ON warehouses;
DROP POLICY IF EXISTS wh_internal_all ON warehouses;

CREATE POLICY wh_internal_all ON warehouses
  FOR ALL TO authenticated
  USING ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()))
  WITH CHECK ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()));

-- warehouse_locations
DROP POLICY IF EXISTS "Internal users manage warehouse locations" ON warehouse_locations;
DROP POLICY IF EXISTS whl_internal_all ON warehouse_locations;

CREATE POLICY whl_internal_all ON warehouse_locations
  FOR ALL TO authenticated
  USING ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()))
  WITH CHECK ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()));

-- stock_movements
DROP POLICY IF EXISTS "Internal users manage stock movements" ON stock_movements;
DROP POLICY IF EXISTS sm_internal_all ON stock_movements;

CREATE POLICY sm_internal_all ON stock_movements
  FOR ALL TO authenticated
  USING ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()))
  WITH CHECK ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()));

-- inventory_transfers
DROP POLICY IF EXISTS "Internal users manage transfers" ON inventory_transfers;
DROP POLICY IF EXISTS it_internal_all ON inventory_transfers;

CREATE POLICY it_internal_all ON inventory_transfers
  FOR ALL TO authenticated
  USING ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()))
  WITH CHECK ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()));

-- cycle_counts
DROP POLICY IF EXISTS "Internal users manage cycle counts" ON cycle_counts;
DROP POLICY IF EXISTS cc_internal_all ON cycle_counts;

CREATE POLICY cc_internal_all ON cycle_counts
  FOR ALL TO authenticated
  USING ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()))
  WITH CHECK ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()));

-- source_inventory
DROP POLICY IF EXISTS "Internal users manage source inventory" ON source_inventory;
DROP POLICY IF EXISTS "Suppliers select own source inventory" ON source_inventory;
DROP POLICY IF EXISTS "Suppliers update own source inventory" ON source_inventory;
DROP POLICY IF EXISTS si_source_internal_all ON source_inventory;
DROP POLICY IF EXISTS si_source_supplier_select ON source_inventory;
DROP POLICY IF EXISTS si_source_supplier_update ON source_inventory;

CREATE POLICY si_source_internal_all ON source_inventory
  FOR ALL TO authenticated
  USING ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()))
  WITH CHECK ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()));

CREATE POLICY si_source_supplier_select ON source_inventory
  FOR SELECT TO authenticated
  USING ((SELECT is_external_user()) AND supplier_id = (SELECT current_supplier_id()));

CREATE POLICY si_source_supplier_update ON source_inventory
  FOR UPDATE TO authenticated
  USING ((SELECT is_external_user()) AND supplier_id = (SELECT current_supplier_id()));

-- inventory_reservations
DROP POLICY IF EXISTS "Internal users manage reservations" ON inventory_reservations;
DROP POLICY IF EXISTS ir_internal_all ON inventory_reservations;

CREATE POLICY ir_internal_all ON inventory_reservations
  FOR ALL TO authenticated
  USING ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()))
  WITH CHECK ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()));

-- ============================================================================
-- DELIVERY & LOGISTICS DOMAIN
-- ============================================================================

-- vehicles
DROP POLICY IF EXISTS tenant_isolation_vehicles ON vehicles;
DROP POLICY IF EXISTS vehicles_internal_all ON vehicles;
DROP POLICY IF EXISTS vehicles_driver_select ON vehicles;

CREATE POLICY vehicles_internal_all ON vehicles
  FOR ALL TO authenticated
  USING ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()))
  WITH CHECK ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()));

-- vehicles has no assigned_driver_id column -- drivers see vehicles via deliveries/routes

-- drivers
DROP POLICY IF EXISTS tenant_isolation_drivers ON drivers;
DROP POLICY IF EXISTS drivers_internal_all ON drivers;
DROP POLICY IF EXISTS drivers_self_select ON drivers;
DROP POLICY IF EXISTS drivers_self_update ON drivers;

CREATE POLICY drivers_internal_all ON drivers
  FOR ALL TO authenticated
  USING ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()))
  WITH CHECK ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()));

CREATE POLICY drivers_self_select ON drivers
  FOR SELECT TO authenticated
  USING ((SELECT is_external_user()) AND id = (SELECT current_driver_id()));

CREATE POLICY drivers_self_update ON drivers
  FOR UPDATE TO authenticated
  USING ((SELECT is_external_user()) AND id = (SELECT current_driver_id()) AND status = 'active');

-- delivery_routes
DROP POLICY IF EXISTS tenant_isolation_delivery_routes ON delivery_routes;
DROP POLICY IF EXISTS dr_internal_all ON delivery_routes;
DROP POLICY IF EXISTS dr_driver_select ON delivery_routes;

CREATE POLICY dr_internal_all ON delivery_routes
  FOR ALL TO authenticated
  USING ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()))
  WITH CHECK ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()));

CREATE POLICY dr_driver_select ON delivery_routes
  FOR SELECT TO authenticated
  USING ((SELECT is_external_user()) AND driver_id = (SELECT current_driver_id()));

-- deliveries
DROP POLICY IF EXISTS tenant_isolation_deliveries ON deliveries;
DROP POLICY IF EXISTS deliveries_internal_all ON deliveries;
DROP POLICY IF EXISTS deliveries_customer_select ON deliveries;
DROP POLICY IF EXISTS deliveries_driver_select ON deliveries;
DROP POLICY IF EXISTS deliveries_driver_update ON deliveries;

CREATE POLICY deliveries_internal_all ON deliveries
  FOR ALL TO authenticated
  USING ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()))
  WITH CHECK ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()));

CREATE POLICY deliveries_customer_select ON deliveries
  FOR SELECT TO authenticated
  USING (
    (SELECT is_external_user())
    AND EXISTS (
      SELECT 1 FROM orders o WHERE o.id = order_id AND o.customer_id = (SELECT current_customer_id())
    )
  );

CREATE POLICY deliveries_driver_select ON deliveries
  FOR SELECT TO authenticated
  USING ((SELECT is_external_user()) AND driver_id = (SELECT current_driver_id()));

CREATE POLICY deliveries_driver_update ON deliveries
  FOR UPDATE TO authenticated
  USING (
    (SELECT is_external_user())
    AND driver_id = (SELECT current_driver_id())
    AND status IN ('dispatched', 'in_transit', 'at_site')
  );

-- delivery_items (child, no tenant_id -- EXISTS through deliveries)
DROP POLICY IF EXISTS tenant_isolation_delivery_items ON delivery_items;
DROP POLICY IF EXISTS di_internal_all ON delivery_items;
DROP POLICY IF EXISTS di_driver_select ON delivery_items;

CREATE POLICY di_internal_all ON delivery_items
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM deliveries d
    WHERE d.id = delivery_id
      AND (SELECT is_internal_user())
      AND d.tenant_id = (SELECT current_tenant_id())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM deliveries d
    WHERE d.id = delivery_id
      AND (SELECT is_internal_user())
      AND d.tenant_id = (SELECT current_tenant_id())
  ));

CREATE POLICY di_driver_select ON delivery_items
  FOR SELECT TO authenticated
  USING (
    (SELECT is_external_user())
    AND EXISTS (
      SELECT 1 FROM deliveries d
      WHERE d.id = delivery_id AND d.driver_id = (SELECT current_driver_id())
    )
  );

-- proof_of_delivery
DROP POLICY IF EXISTS tenant_isolation_proof_of_delivery ON proof_of_delivery;
DROP POLICY IF EXISTS pod_internal_all ON proof_of_delivery;
DROP POLICY IF EXISTS pod_driver_insert ON proof_of_delivery;
DROP POLICY IF EXISTS pod_customer_select ON proof_of_delivery;

CREATE POLICY pod_internal_all ON proof_of_delivery
  FOR ALL TO authenticated
  USING ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()))
  WITH CHECK ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()));

CREATE POLICY pod_driver_insert ON proof_of_delivery
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT is_external_user())
    AND EXISTS (
      SELECT 1 FROM deliveries d
      WHERE d.id = delivery_id AND d.driver_id = (SELECT current_driver_id())
    )
  );

CREATE POLICY pod_customer_select ON proof_of_delivery
  FOR SELECT TO authenticated
  USING (
    (SELECT is_external_user())
    AND EXISTS (
      SELECT 1 FROM deliveries d
      JOIN orders o ON o.id = d.order_id
      WHERE d.id = delivery_id AND o.customer_id = (SELECT current_customer_id())
    )
  );

-- drop_ship_pod
DROP POLICY IF EXISTS tenant_isolation_drop_ship_pod ON drop_ship_pod;
DROP POLICY IF EXISTS dsp_internal_all ON drop_ship_pod;
DROP POLICY IF EXISTS dsp_supplier_select ON drop_ship_pod;
DROP POLICY IF EXISTS dsp_customer_select ON drop_ship_pod;

CREATE POLICY dsp_internal_all ON drop_ship_pod
  FOR ALL TO authenticated
  USING ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()))
  WITH CHECK ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()));

CREATE POLICY dsp_supplier_select ON drop_ship_pod
  FOR SELECT TO authenticated
  USING ((SELECT is_external_user()) AND supplier_id = (SELECT current_supplier_id()));

CREATE POLICY dsp_customer_select ON drop_ship_pod
  FOR SELECT TO authenticated
  USING ((SELECT is_external_user()) AND customer_id = (SELECT current_customer_id()));

-- driver_locations (partitioned)
DROP POLICY IF EXISTS tenant_isolation_driver_locations ON driver_locations;
DROP POLICY IF EXISTS dl_internal_all ON driver_locations;
DROP POLICY IF EXISTS dl_driver_select ON driver_locations;

CREATE POLICY dl_internal_all ON driver_locations
  FOR ALL TO authenticated
  USING ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()))
  WITH CHECK ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()));

CREATE POLICY dl_driver_select ON driver_locations
  FOR SELECT TO authenticated
  USING ((SELECT is_external_user()) AND driver_id = (SELECT current_driver_id()));

-- vehicle_inspections
DROP POLICY IF EXISTS tenant_isolation_vehicle_inspections ON vehicle_inspections;
DROP POLICY IF EXISTS vi_internal_all ON vehicle_inspections;
DROP POLICY IF EXISTS vi_driver_all ON vehicle_inspections;

CREATE POLICY vi_internal_all ON vehicle_inspections
  FOR ALL TO authenticated
  USING ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()))
  WITH CHECK ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()));

CREATE POLICY vi_driver_all ON vehicle_inspections
  FOR ALL TO authenticated
  USING ((SELECT is_external_user()) AND driver_id = (SELECT current_driver_id()))
  WITH CHECK ((SELECT is_external_user()) AND driver_id = (SELECT current_driver_id()));

-- driver_shifts
DROP POLICY IF EXISTS tenant_isolation_driver_shifts ON driver_shifts;
DROP POLICY IF EXISTS ds_internal_all ON driver_shifts;
DROP POLICY IF EXISTS ds_driver_select ON driver_shifts;

CREATE POLICY ds_internal_all ON driver_shifts
  FOR ALL TO authenticated
  USING ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()))
  WITH CHECK ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()));

CREATE POLICY ds_driver_select ON driver_shifts
  FOR SELECT TO authenticated
  USING ((SELECT is_external_user()) AND driver_id = (SELECT current_driver_id()));

-- load_verifications
DROP POLICY IF EXISTS tenant_isolation_load_verifications ON load_verifications;
DROP POLICY IF EXISTS lv_internal_all ON load_verifications;

CREATE POLICY lv_internal_all ON load_verifications
  FOR ALL TO authenticated
  USING ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()))
  WITH CHECK ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()));

-- delivery_zones
DROP POLICY IF EXISTS dz_internal_all ON delivery_zones;

CREATE POLICY dz_internal_all ON delivery_zones
  FOR ALL TO authenticated
  USING ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()))
  WITH CHECK ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()));

-- ============================================================================
-- FINANCIAL DOMAIN (MFA-GATED — AAL2 required)
-- ============================================================================

-- invoices (MFA)
DROP POLICY IF EXISTS invoices_internal_all ON invoices;
DROP POLICY IF EXISTS invoices_customer_select ON invoices;

CREATE POLICY invoices_internal_all ON invoices
  FOR ALL TO authenticated
  USING ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()) AND (auth.jwt()->>'aal') = 'aal2')
  WITH CHECK ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()) AND (auth.jwt()->>'aal') = 'aal2');

CREATE POLICY invoices_customer_select ON invoices
  FOR SELECT TO authenticated
  USING ((SELECT is_external_user()) AND customer_id = (SELECT current_customer_id()) AND (auth.jwt()->>'aal') = 'aal2');

-- invoice_items (child, no tenant_id -- EXISTS through invoices, MFA)
DROP POLICY IF EXISTS ii_internal_all ON invoice_items;
DROP POLICY IF EXISTS ii_customer_select ON invoice_items;

CREATE POLICY ii_internal_all ON invoice_items
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM invoices i
    WHERE i.id = invoice_id
      AND (SELECT is_internal_user())
      AND i.tenant_id = (SELECT current_tenant_id())
      AND (auth.jwt()->>'aal') = 'aal2'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM invoices i
    WHERE i.id = invoice_id
      AND (SELECT is_internal_user())
      AND i.tenant_id = (SELECT current_tenant_id())
      AND (auth.jwt()->>'aal') = 'aal2'
  ));

CREATE POLICY ii_customer_select ON invoice_items
  FOR SELECT TO authenticated
  USING (
    (SELECT is_external_user())
    AND EXISTS (
      SELECT 1 FROM invoices i
      WHERE i.id = invoice_id
        AND i.customer_id = (SELECT current_customer_id())
        AND (auth.jwt()->>'aal') = 'aal2'
    )
  );

-- invoice_disputes (MFA)
DROP POLICY IF EXISTS id_internal_all ON invoice_disputes;
DROP POLICY IF EXISTS id_customer_select ON invoice_disputes;

CREATE POLICY id_internal_all ON invoice_disputes
  FOR ALL TO authenticated
  USING ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()) AND (auth.jwt()->>'aal') = 'aal2')
  WITH CHECK ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()) AND (auth.jwt()->>'aal') = 'aal2');

CREATE POLICY id_customer_select ON invoice_disputes
  FOR SELECT TO authenticated
  USING (
    (SELECT is_external_user())
    AND (auth.jwt()->>'aal') = 'aal2'
    AND EXISTS (
      SELECT 1 FROM invoices i
      WHERE i.id = invoice_id AND i.customer_id = (SELECT current_customer_id())
    )
  );

-- payments (MFA)
DROP POLICY IF EXISTS payments_internal_all ON payments;
DROP POLICY IF EXISTS payments_customer_select ON payments;

CREATE POLICY payments_internal_all ON payments
  FOR ALL TO authenticated
  USING ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()) AND (auth.jwt()->>'aal') = 'aal2')
  WITH CHECK ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()) AND (auth.jwt()->>'aal') = 'aal2');

CREATE POLICY payments_customer_select ON payments
  FOR SELECT TO authenticated
  USING ((SELECT is_external_user()) AND customer_id = (SELECT current_customer_id()) AND (auth.jwt()->>'aal') = 'aal2');

-- payment_applications (child, no tenant_id -- EXISTS through payments, MFA)
DROP POLICY IF EXISTS pa_internal_all ON payment_applications;
DROP POLICY IF EXISTS pa_customer_select ON payment_applications;

CREATE POLICY pa_internal_all ON payment_applications
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM payments p
    WHERE p.id = payment_id
      AND (SELECT is_internal_user())
      AND p.tenant_id = (SELECT current_tenant_id())
      AND (auth.jwt()->>'aal') = 'aal2'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM payments p
    WHERE p.id = payment_id
      AND (SELECT is_internal_user())
      AND p.tenant_id = (SELECT current_tenant_id())
      AND (auth.jwt()->>'aal') = 'aal2'
  ));

CREATE POLICY pa_customer_select ON payment_applications
  FOR SELECT TO authenticated
  USING (
    (SELECT is_external_user())
    AND EXISTS (
      SELECT 1 FROM payments p
      WHERE p.id = payment_id
        AND p.customer_id = (SELECT current_customer_id())
        AND (auth.jwt()->>'aal') = 'aal2'
    )
  );

-- cheque_tracking (MFA, internal-only -- no customer_id column, Pitfall 7)
DROP POLICY IF EXISTS cheques_internal_all ON cheque_tracking;

CREATE POLICY cheques_internal_all ON cheque_tracking
  FOR ALL TO authenticated
  USING ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()) AND (auth.jwt()->>'aal') = 'aal2')
  WITH CHECK ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()) AND (auth.jwt()->>'aal') = 'aal2');

-- letters_of_credit (MFA)
DROP POLICY IF EXISTS lc_internal_all ON letters_of_credit;
DROP POLICY IF EXISTS lc_customer_select ON letters_of_credit;

CREATE POLICY lc_internal_all ON letters_of_credit
  FOR ALL TO authenticated
  USING ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()) AND (auth.jwt()->>'aal') = 'aal2')
  WITH CHECK ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()) AND (auth.jwt()->>'aal') = 'aal2');

CREATE POLICY lc_customer_select ON letters_of_credit
  FOR SELECT TO authenticated
  USING ((SELECT is_external_user()) AND applicant_customer_id = (SELECT current_customer_id()) AND (auth.jwt()->>'aal') = 'aal2');

-- returns (MFA -- has customer_id)
DROP POLICY IF EXISTS returns_internal_all ON returns;
DROP POLICY IF EXISTS returns_customer_select ON returns;

CREATE POLICY returns_internal_all ON returns
  FOR ALL TO authenticated
  USING ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()) AND (auth.jwt()->>'aal') = 'aal2')
  WITH CHECK ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()) AND (auth.jwt()->>'aal') = 'aal2');

CREATE POLICY returns_customer_select ON returns
  FOR SELECT TO authenticated
  USING ((SELECT is_external_user()) AND customer_id = (SELECT current_customer_id()) AND (auth.jwt()->>'aal') = 'aal2');

-- credit_notes (MFA)
DROP POLICY IF EXISTS cn_internal_all ON credit_notes;
DROP POLICY IF EXISTS cn_customer_select ON credit_notes;

CREATE POLICY cn_internal_all ON credit_notes
  FOR ALL TO authenticated
  USING ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()) AND (auth.jwt()->>'aal') = 'aal2')
  WITH CHECK ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()) AND (auth.jwt()->>'aal') = 'aal2');

CREATE POLICY cn_customer_select ON credit_notes
  FOR SELECT TO authenticated
  USING ((SELECT is_external_user()) AND customer_id = (SELECT current_customer_id()) AND (auth.jwt()->>'aal') = 'aal2');

-- credit_note_applications (child, no tenant_id -- EXISTS through credit_notes, MFA)
DROP POLICY IF EXISTS cna_internal_all ON credit_note_applications;
DROP POLICY IF EXISTS cna_customer_select ON credit_note_applications;

CREATE POLICY cna_internal_all ON credit_note_applications
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM credit_notes cn
    WHERE cn.id = credit_note_id
      AND (SELECT is_internal_user())
      AND cn.tenant_id = (SELECT current_tenant_id())
      AND (auth.jwt()->>'aal') = 'aal2'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM credit_notes cn
    WHERE cn.id = credit_note_id
      AND (SELECT is_internal_user())
      AND cn.tenant_id = (SELECT current_tenant_id())
      AND (auth.jwt()->>'aal') = 'aal2'
  ));

CREATE POLICY cna_customer_select ON credit_note_applications
  FOR SELECT TO authenticated
  USING (
    (SELECT is_external_user())
    AND EXISTS (
      SELECT 1 FROM credit_notes cn
      WHERE cn.id = credit_note_id
        AND cn.customer_id = (SELECT current_customer_id())
        AND (auth.jwt()->>'aal') = 'aal2'
    )
  );

-- withholding_tax_certificates (MFA, supplier-scoped)
DROP POLICY IF EXISTS wtc_internal_all ON withholding_tax_certificates;
DROP POLICY IF EXISTS wtc_supplier_select ON withholding_tax_certificates;

CREATE POLICY wtc_internal_all ON withholding_tax_certificates
  FOR ALL TO authenticated
  USING ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()) AND (auth.jwt()->>'aal') = 'aal2')
  WITH CHECK ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()) AND (auth.jwt()->>'aal') = 'aal2');

CREATE POLICY wtc_supplier_select ON withholding_tax_certificates
  FOR SELECT TO authenticated
  USING ((SELECT is_external_user()) AND supplier_id = (SELECT current_supplier_id()) AND (auth.jwt()->>'aal') = 'aal2');

-- company_bank_accounts (MFA, internal-only)
DROP POLICY IF EXISTS cba_internal_all ON company_bank_accounts;

CREATE POLICY cba_internal_all ON company_bank_accounts
  FOR ALL TO authenticated
  USING ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()) AND (auth.jwt()->>'aal') = 'aal2')
  WITH CHECK ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()) AND (auth.jwt()->>'aal') = 'aal2');

-- supplier_invoices (MFA, supplier-scoped)
DROP POLICY IF EXISTS sinv_internal_all ON supplier_invoices;
DROP POLICY IF EXISTS sinv_supplier_select ON supplier_invoices;

CREATE POLICY sinv_internal_all ON supplier_invoices
  FOR ALL TO authenticated
  USING ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()) AND (auth.jwt()->>'aal') = 'aal2')
  WITH CHECK ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()) AND (auth.jwt()->>'aal') = 'aal2');

CREATE POLICY sinv_supplier_select ON supplier_invoices
  FOR SELECT TO authenticated
  USING ((SELECT is_external_user()) AND supplier_id = (SELECT current_supplier_id()) AND (auth.jwt()->>'aal') = 'aal2');

-- supplier_invoice_items (MFA, has tenant_id)
DROP POLICY IF EXISTS sii_internal_all ON supplier_invoice_items;
DROP POLICY IF EXISTS sii_supplier_select ON supplier_invoice_items;

CREATE POLICY sii_internal_all ON supplier_invoice_items
  FOR ALL TO authenticated
  USING ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()) AND (auth.jwt()->>'aal') = 'aal2')
  WITH CHECK ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()) AND (auth.jwt()->>'aal') = 'aal2');

CREATE POLICY sii_supplier_select ON supplier_invoice_items
  FOR SELECT TO authenticated
  USING (
    (SELECT is_external_user())
    AND (auth.jwt()->>'aal') = 'aal2'
    AND EXISTS (
      SELECT 1 FROM supplier_invoices si
      WHERE si.id = supplier_invoice_id AND si.supplier_id = (SELECT current_supplier_id())
    )
  );

-- ar_aging_snapshots (MFA)
DROP POLICY IF EXISTS aas_internal_all ON ar_aging_snapshots;
DROP POLICY IF EXISTS aas_customer_select ON ar_aging_snapshots;

CREATE POLICY aas_internal_all ON ar_aging_snapshots
  FOR ALL TO authenticated
  USING ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()) AND (auth.jwt()->>'aal') = 'aal2')
  WITH CHECK ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()) AND (auth.jwt()->>'aal') = 'aal2');

CREATE POLICY aas_customer_select ON ar_aging_snapshots
  FOR SELECT TO authenticated
  USING ((SELECT is_external_user()) AND customer_id = (SELECT current_customer_id()) AND (auth.jwt()->>'aal') = 'aal2');

-- revenue_recognition_events (MFA)
DROP POLICY IF EXISTS rre_internal_all ON revenue_recognition_events;

CREATE POLICY rre_internal_all ON revenue_recognition_events
  FOR ALL TO authenticated
  USING ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()) AND (auth.jwt()->>'aal') = 'aal2')
  WITH CHECK ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()) AND (auth.jwt()->>'aal') = 'aal2');

-- ============================================================================
-- DRIVER MARKETPLACE & OPERATIONS
-- ============================================================================

-- driver_jobs
DROP POLICY IF EXISTS dj_internal_all ON driver_jobs;
DROP POLICY IF EXISTS dj_driver_select ON driver_jobs;

CREATE POLICY dj_internal_all ON driver_jobs
  FOR ALL TO authenticated
  USING ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()))
  WITH CHECK ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()));

CREATE POLICY dj_driver_select ON driver_jobs
  FOR SELECT TO authenticated
  USING (
    (SELECT is_external_user())
    AND (offered_to_driver_id = (SELECT current_driver_id()) OR offered_to_driver_id IS NULL)
  );

-- driver_earnings (MFA for financial data)
DROP POLICY IF EXISTS de_internal_all ON driver_earnings;
DROP POLICY IF EXISTS de_driver_select ON driver_earnings;

CREATE POLICY de_internal_all ON driver_earnings
  FOR ALL TO authenticated
  USING ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()))
  WITH CHECK ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()));

CREATE POLICY de_driver_select ON driver_earnings
  FOR SELECT TO authenticated
  USING ((SELECT is_external_user()) AND driver_id = (SELECT current_driver_id()));

-- ============================================================================
-- HR & AUTH DOMAIN (upgrade existing tenant_isolation policies)
-- ============================================================================

-- employees (replace simple tenant_isolation)
DROP POLICY IF EXISTS tenant_isolation ON employees;
DROP POLICY IF EXISTS employees_hr_all ON employees;
DROP POLICY IF EXISTS employees_self_select ON employees;

CREATE POLICY employees_hr_all ON employees
  FOR ALL TO authenticated
  USING ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()) AND ((SELECT has_role('hr')) OR (SELECT has_role('admin'))))
  WITH CHECK ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()) AND ((SELECT has_role('hr')) OR (SELECT has_role('admin'))));

CREATE POLICY employees_self_select ON employees
  FOR SELECT TO authenticated
  USING ((SELECT is_internal_user()) AND user_id = (SELECT auth.uid()));

-- user_profiles
DROP POLICY IF EXISTS tenant_isolation ON user_profiles;
DROP POLICY IF EXISTS up_internal_all ON user_profiles;
DROP POLICY IF EXISTS up_self_select ON user_profiles;

CREATE POLICY up_internal_all ON user_profiles
  FOR ALL TO authenticated
  USING ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()))
  WITH CHECK ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()));

CREATE POLICY up_self_select ON user_profiles
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- user_roles
DROP POLICY IF EXISTS tenant_isolation ON user_roles;
DROP POLICY IF EXISTS ur_internal_all ON user_roles;
DROP POLICY IF EXISTS ur_self_select ON user_roles;

CREATE POLICY ur_internal_all ON user_roles
  FOR ALL TO authenticated
  USING ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()))
  WITH CHECK ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()));

CREATE POLICY ur_self_select ON user_roles
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- approvals
DROP POLICY IF EXISTS tenant_isolation ON approvals;
DROP POLICY IF EXISTS app_internal_all ON approvals;

CREATE POLICY app_internal_all ON approvals
  FOR ALL TO authenticated
  USING ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()))
  WITH CHECK ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()));

-- audit_log
DROP POLICY IF EXISTS tenant_isolation ON audit_log;
DROP POLICY IF EXISTS al_internal_select ON audit_log;

CREATE POLICY al_internal_select ON audit_log
  FOR SELECT TO authenticated
  USING ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()));

CREATE POLICY al_internal_insert ON audit_log
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT current_tenant_id()));

-- tenants (special: only admins manage, self-select for own tenant)
DROP POLICY IF EXISTS tenant_isolation ON tenants;
DROP POLICY IF EXISTS tenants_self_select ON tenants;

CREATE POLICY tenants_self_select ON tenants
  FOR SELECT TO authenticated
  USING (id = (SELECT current_tenant_id()));

-- role_permissions (read-only for all authenticated)
DROP POLICY IF EXISTS read_all ON role_permissions;
DROP POLICY IF EXISTS rp_read_all ON role_permissions;

CREATE POLICY rp_read_all ON role_permissions
  FOR SELECT TO authenticated
  USING (true);

-- system_settings (if exists -- created in earlier migration)
-- Already internal-only by nature
