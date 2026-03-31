-- Migration 006: Role-Permission Seed Data
-- Maps all roles to their allowed permissions
-- Every permission string must match an app_permission enum value exactly

-- ============================================================================
-- CEO: ALL 76 permissions (full platform access)
-- ============================================================================
INSERT INTO role_permissions (role, permission) VALUES
  ('ceo', 'quote_requests.read'), ('ceo', 'quote_requests.create'), ('ceo', 'quote_requests.update'),
  ('ceo', 'quote_requests.delete'), ('ceo', 'quote_requests.assign'),
  ('ceo', 'quotes.read'), ('ceo', 'quotes.create'), ('ceo', 'quotes.update'),
  ('ceo', 'quotes.delete'), ('ceo', 'quotes.approve'), ('ceo', 'quotes.send'),
  ('ceo', 'orders.read'), ('ceo', 'orders.read_own'), ('ceo', 'orders.create'),
  ('ceo', 'orders.update'), ('ceo', 'orders.delete'), ('ceo', 'orders.cancel'),
  ('ceo', 'purchase_orders.read'), ('ceo', 'purchase_orders.create'), ('ceo', 'purchase_orders.update'),
  ('ceo', 'purchase_orders.delete'), ('ceo', 'purchase_orders.approve'), ('ceo', 'purchase_orders.send'),
  ('ceo', 'inventory.read'), ('ceo', 'inventory.create'), ('ceo', 'inventory.update'), ('ceo', 'inventory.delete'),
  ('ceo', 'deliveries.read'), ('ceo', 'deliveries.read_assigned'), ('ceo', 'deliveries.create'),
  ('ceo', 'deliveries.update'), ('ceo', 'deliveries.delete'), ('ceo', 'deliveries.dispatch'),
  ('ceo', 'invoices.read'), ('ceo', 'invoices.create'), ('ceo', 'invoices.update'),
  ('ceo', 'invoices.delete'), ('ceo', 'invoices.approve'), ('ceo', 'invoices.send'),
  ('ceo', 'payments.read'), ('ceo', 'payments.create'), ('ceo', 'payments.update'),
  ('ceo', 'payments.delete'), ('ceo', 'payments.reconcile'),
  ('ceo', 'credit.read'), ('ceo', 'credit.update'), ('ceo', 'credit.approve'),
  ('ceo', 'returns.read'), ('ceo', 'returns.create'), ('ceo', 'returns.update'),
  ('ceo', 'returns.approve'), ('ceo', 'returns.close'),
  ('ceo', 'customers.read'), ('ceo', 'customers.create'), ('ceo', 'customers.update'),
  ('ceo', 'customers.delete'), ('ceo', 'customers.assign'),
  ('ceo', 'suppliers.read'), ('ceo', 'suppliers.create'), ('ceo', 'suppliers.update'), ('ceo', 'suppliers.delete'),
  ('ceo', 'products.read'), ('ceo', 'products.create'), ('ceo', 'products.update'), ('ceo', 'products.delete'),
  ('ceo', 'drivers.read'), ('ceo', 'drivers.create'), ('ceo', 'drivers.update'),
  ('ceo', 'vehicles.read'), ('ceo', 'vehicles.create'), ('ceo', 'vehicles.update'),
  ('ceo', 'tickets.read'), ('ceo', 'tickets.create'), ('ceo', 'tickets.update'),
  ('ceo', 'tickets.assign'), ('ceo', 'tickets.escalate'), ('ceo', 'tickets.close'),
  ('ceo', 'reports.read'), ('ceo', 'reports.create'), ('ceo', 'reports.export'),
  ('ceo', 'users.read'), ('ceo', 'users.manage'), ('ceo', 'users.settings'),
  ('ceo', 'ai.use'), ('ceo', 'ai.admin');

-- ============================================================================
-- ADMIN: Same as CEO (all 76 permissions)
-- ============================================================================
INSERT INTO role_permissions (role, permission) VALUES
  ('admin', 'quote_requests.read'), ('admin', 'quote_requests.create'), ('admin', 'quote_requests.update'),
  ('admin', 'quote_requests.delete'), ('admin', 'quote_requests.assign'),
  ('admin', 'quotes.read'), ('admin', 'quotes.create'), ('admin', 'quotes.update'),
  ('admin', 'quotes.delete'), ('admin', 'quotes.approve'), ('admin', 'quotes.send'),
  ('admin', 'orders.read'), ('admin', 'orders.read_own'), ('admin', 'orders.create'),
  ('admin', 'orders.update'), ('admin', 'orders.delete'), ('admin', 'orders.cancel'),
  ('admin', 'purchase_orders.read'), ('admin', 'purchase_orders.create'), ('admin', 'purchase_orders.update'),
  ('admin', 'purchase_orders.delete'), ('admin', 'purchase_orders.approve'), ('admin', 'purchase_orders.send'),
  ('admin', 'inventory.read'), ('admin', 'inventory.create'), ('admin', 'inventory.update'), ('admin', 'inventory.delete'),
  ('admin', 'deliveries.read'), ('admin', 'deliveries.read_assigned'), ('admin', 'deliveries.create'),
  ('admin', 'deliveries.update'), ('admin', 'deliveries.delete'), ('admin', 'deliveries.dispatch'),
  ('admin', 'invoices.read'), ('admin', 'invoices.create'), ('admin', 'invoices.update'),
  ('admin', 'invoices.delete'), ('admin', 'invoices.approve'), ('admin', 'invoices.send'),
  ('admin', 'payments.read'), ('admin', 'payments.create'), ('admin', 'payments.update'),
  ('admin', 'payments.delete'), ('admin', 'payments.reconcile'),
  ('admin', 'credit.read'), ('admin', 'credit.update'), ('admin', 'credit.approve'),
  ('admin', 'returns.read'), ('admin', 'returns.create'), ('admin', 'returns.update'),
  ('admin', 'returns.approve'), ('admin', 'returns.close'),
  ('admin', 'customers.read'), ('admin', 'customers.create'), ('admin', 'customers.update'),
  ('admin', 'customers.delete'), ('admin', 'customers.assign'),
  ('admin', 'suppliers.read'), ('admin', 'suppliers.create'), ('admin', 'suppliers.update'), ('admin', 'suppliers.delete'),
  ('admin', 'products.read'), ('admin', 'products.create'), ('admin', 'products.update'), ('admin', 'products.delete'),
  ('admin', 'drivers.read'), ('admin', 'drivers.create'), ('admin', 'drivers.update'),
  ('admin', 'vehicles.read'), ('admin', 'vehicles.create'), ('admin', 'vehicles.update'),
  ('admin', 'tickets.read'), ('admin', 'tickets.create'), ('admin', 'tickets.update'),
  ('admin', 'tickets.assign'), ('admin', 'tickets.escalate'), ('admin', 'tickets.close'),
  ('admin', 'reports.read'), ('admin', 'reports.create'), ('admin', 'reports.export'),
  ('admin', 'users.read'), ('admin', 'users.manage'), ('admin', 'users.settings'),
  ('admin', 'ai.use'), ('admin', 'ai.admin');

-- ============================================================================
-- SALES DIRECTOR: Sales + read adjacent domains
-- ============================================================================
INSERT INTO role_permissions (role, permission) VALUES
  ('sales_director', 'quote_requests.read'), ('sales_director', 'quote_requests.create'),
  ('sales_director', 'quote_requests.update'), ('sales_director', 'quote_requests.delete'),
  ('sales_director', 'quote_requests.assign'),
  ('sales_director', 'quotes.read'), ('sales_director', 'quotes.create'), ('sales_director', 'quotes.update'),
  ('sales_director', 'quotes.delete'), ('sales_director', 'quotes.approve'), ('sales_director', 'quotes.send'),
  ('sales_director', 'orders.read'), ('sales_director', 'orders.read_own'), ('sales_director', 'orders.create'),
  ('sales_director', 'orders.update'), ('sales_director', 'orders.delete'), ('sales_director', 'orders.cancel'),
  ('sales_director', 'customers.read'), ('sales_director', 'customers.create'), ('sales_director', 'customers.update'),
  ('sales_director', 'customers.delete'), ('sales_director', 'customers.assign'),
  ('sales_director', 'products.read'),
  ('sales_director', 'reports.read'), ('sales_director', 'reports.export'),
  ('sales_director', 'ai.use');

-- ============================================================================
-- SALES MANAGER: Quotes, orders, customers, reports
-- ============================================================================
INSERT INTO role_permissions (role, permission) VALUES
  ('sales_manager', 'quote_requests.read'), ('sales_manager', 'quote_requests.create'),
  ('sales_manager', 'quote_requests.update'), ('sales_manager', 'quote_requests.assign'),
  ('sales_manager', 'quotes.read'), ('sales_manager', 'quotes.create'), ('sales_manager', 'quotes.update'),
  ('sales_manager', 'quotes.approve'), ('sales_manager', 'quotes.send'),
  ('sales_manager', 'orders.read'), ('sales_manager', 'orders.read_own'), ('sales_manager', 'orders.create'),
  ('sales_manager', 'orders.update'),
  ('sales_manager', 'customers.read'), ('sales_manager', 'customers.create'), ('sales_manager', 'customers.update'),
  ('sales_manager', 'customers.delete'), ('sales_manager', 'customers.assign'),
  ('sales_manager', 'products.read'),
  ('sales_manager', 'reports.read'),
  ('sales_manager', 'ai.use');

-- ============================================================================
-- SALES REP: Own quotes/orders, customer management
-- ============================================================================
INSERT INTO role_permissions (role, permission) VALUES
  ('sales_rep', 'quote_requests.read'), ('sales_rep', 'quote_requests.create'),
  ('sales_rep', 'quotes.read'), ('sales_rep', 'quotes.create'), ('sales_rep', 'quotes.update'),
  ('sales_rep', 'orders.read'), ('sales_rep', 'orders.read_own'), ('sales_rep', 'orders.create'),
  ('sales_rep', 'customers.read'), ('sales_rep', 'customers.create'), ('sales_rep', 'customers.update'),
  ('sales_rep', 'products.read'),
  ('sales_rep', 'ai.use');

-- ============================================================================
-- QUOTING SPECIALIST: Quote creation and pricing
-- ============================================================================
INSERT INTO role_permissions (role, permission) VALUES
  ('quoting_specialist', 'quote_requests.read'),
  ('quoting_specialist', 'quotes.read'), ('quoting_specialist', 'quotes.create'), ('quoting_specialist', 'quotes.update'),
  ('quoting_specialist', 'products.read'),
  ('quoting_specialist', 'customers.read'),
  ('quoting_specialist', 'ai.use');

-- ============================================================================
-- BDR (Business Development Rep): Lead gen, customer creation, quote requests
-- ============================================================================
INSERT INTO role_permissions (role, permission) VALUES
  ('bdr', 'quote_requests.read'), ('bdr', 'quote_requests.create'),
  ('bdr', 'customers.read'), ('bdr', 'customers.create'), ('bdr', 'customers.update'),
  ('bdr', 'products.read'),
  ('bdr', 'ai.use');

-- ============================================================================
-- PROCUREMENT MANAGER: POs, suppliers, products, inventory read
-- ============================================================================
INSERT INTO role_permissions (role, permission) VALUES
  ('procurement_manager', 'purchase_orders.read'), ('procurement_manager', 'purchase_orders.create'),
  ('procurement_manager', 'purchase_orders.update'), ('procurement_manager', 'purchase_orders.delete'),
  ('procurement_manager', 'purchase_orders.approve'), ('procurement_manager', 'purchase_orders.send'),
  ('procurement_manager', 'suppliers.read'), ('procurement_manager', 'suppliers.create'),
  ('procurement_manager', 'suppliers.update'), ('procurement_manager', 'suppliers.delete'),
  ('procurement_manager', 'products.read'), ('procurement_manager', 'products.create'),
  ('procurement_manager', 'products.update'),
  ('procurement_manager', 'inventory.read'),
  ('procurement_manager', 'reports.read'),
  ('procurement_manager', 'ai.use');

-- ============================================================================
-- PROCUREMENT OFFICER: POs (no delete/approve), suppliers (read/update)
-- ============================================================================
INSERT INTO role_permissions (role, permission) VALUES
  ('procurement_officer', 'purchase_orders.read'), ('procurement_officer', 'purchase_orders.create'),
  ('procurement_officer', 'purchase_orders.update'), ('procurement_officer', 'purchase_orders.send'),
  ('procurement_officer', 'suppliers.read'), ('procurement_officer', 'suppliers.update'),
  ('procurement_officer', 'products.read'),
  ('procurement_officer', 'inventory.read'),
  ('procurement_officer', 'ai.use');

-- ============================================================================
-- WAREHOUSE MANAGER: Full inventory, deliveries read, returns
-- ============================================================================
INSERT INTO role_permissions (role, permission) VALUES
  ('warehouse_manager', 'inventory.read'), ('warehouse_manager', 'inventory.create'),
  ('warehouse_manager', 'inventory.update'), ('warehouse_manager', 'inventory.delete'),
  ('warehouse_manager', 'deliveries.read'),
  ('warehouse_manager', 'returns.read'), ('warehouse_manager', 'returns.create'),
  ('warehouse_manager', 'returns.update'), ('warehouse_manager', 'returns.approve'),
  ('warehouse_manager', 'products.read'),
  ('warehouse_manager', 'purchase_orders.read'),
  ('warehouse_manager', 'reports.read'),
  ('warehouse_manager', 'ai.use');

-- ============================================================================
-- WAREHOUSE WORKER: Inventory read/update, assigned deliveries
-- ============================================================================
INSERT INTO role_permissions (role, permission) VALUES
  ('warehouse_worker', 'inventory.read'), ('warehouse_worker', 'inventory.update'),
  ('warehouse_worker', 'deliveries.read_assigned'),
  ('warehouse_worker', 'products.read');

-- ============================================================================
-- QUALITY INSPECTOR: Inventory read/update, PO receiving, returns
-- ============================================================================
INSERT INTO role_permissions (role, permission) VALUES
  ('quality_inspector', 'inventory.read'), ('quality_inspector', 'inventory.update'),
  ('quality_inspector', 'purchase_orders.read'),
  ('quality_inspector', 'returns.read'), ('quality_inspector', 'returns.create'),
  ('quality_inspector', 'products.read');

-- ============================================================================
-- DISPATCHER: Full delivery management, driver/vehicle read
-- ============================================================================
INSERT INTO role_permissions (role, permission) VALUES
  ('dispatcher', 'deliveries.read'), ('dispatcher', 'deliveries.read_assigned'),
  ('dispatcher', 'deliveries.create'), ('dispatcher', 'deliveries.update'),
  ('dispatcher', 'deliveries.delete'), ('dispatcher', 'deliveries.dispatch'),
  ('dispatcher', 'drivers.read'),
  ('dispatcher', 'vehicles.read'),
  ('dispatcher', 'orders.read'),
  ('dispatcher', 'ai.use');

-- ============================================================================
-- DRIVER: Assigned deliveries only
-- ============================================================================
INSERT INTO role_permissions (role, permission) VALUES
  ('driver', 'deliveries.read_assigned'), ('driver', 'deliveries.update');

-- ============================================================================
-- ACCOUNTANT: Full finance, reports
-- ============================================================================
INSERT INTO role_permissions (role, permission) VALUES
  ('accountant', 'invoices.read'), ('accountant', 'invoices.create'),
  ('accountant', 'invoices.update'), ('accountant', 'invoices.delete'),
  ('accountant', 'invoices.approve'), ('accountant', 'invoices.send'),
  ('accountant', 'payments.read'), ('accountant', 'payments.create'),
  ('accountant', 'payments.update'), ('accountant', 'payments.delete'),
  ('accountant', 'payments.reconcile'),
  ('accountant', 'credit.read'), ('accountant', 'credit.update'), ('accountant', 'credit.approve'),
  ('accountant', 'returns.read'),
  ('accountant', 'customers.read'),
  ('accountant', 'reports.read'), ('accountant', 'reports.export'),
  ('accountant', 'ai.use');

-- ============================================================================
-- AR CLERK: Invoices read, payment CRUD
-- ============================================================================
INSERT INTO role_permissions (role, permission) VALUES
  ('ar_clerk', 'invoices.read'),
  ('ar_clerk', 'payments.read'), ('ar_clerk', 'payments.create'), ('ar_clerk', 'payments.update'),
  ('ar_clerk', 'customers.read'),
  ('ar_clerk', 'credit.read');

-- ============================================================================
-- AP CLERK: Supplier invoices read, PO read
-- ============================================================================
INSERT INTO role_permissions (role, permission) VALUES
  ('ap_clerk', 'invoices.read'),
  ('ap_clerk', 'purchase_orders.read'),
  ('ap_clerk', 'suppliers.read'),
  ('ap_clerk', 'payments.read');

-- ============================================================================
-- CREDIT MANAGER: Full credit control
-- ============================================================================
INSERT INTO role_permissions (role, permission) VALUES
  ('credit_manager', 'credit.read'), ('credit_manager', 'credit.update'), ('credit_manager', 'credit.approve'),
  ('credit_manager', 'customers.read'),
  ('credit_manager', 'invoices.read'),
  ('credit_manager', 'payments.read'),
  ('credit_manager', 'reports.read'),
  ('credit_manager', 'ai.use');

-- ============================================================================
-- CS AGENT: Tickets, read orders/customers/invoices
-- ============================================================================
INSERT INTO role_permissions (role, permission) VALUES
  ('cs_agent', 'tickets.read'), ('cs_agent', 'tickets.create'), ('cs_agent', 'tickets.update'),
  ('cs_agent', 'orders.read'),
  ('cs_agent', 'customers.read'),
  ('cs_agent', 'invoices.read'),
  ('cs_agent', 'ai.use');

-- ============================================================================
-- CS MANAGER: Same as CS Agent + assign, escalate, close, reports
-- ============================================================================
INSERT INTO role_permissions (role, permission) VALUES
  ('cs_manager', 'tickets.read'), ('cs_manager', 'tickets.create'), ('cs_manager', 'tickets.update'),
  ('cs_manager', 'tickets.assign'), ('cs_manager', 'tickets.escalate'), ('cs_manager', 'tickets.close'),
  ('cs_manager', 'orders.read'),
  ('cs_manager', 'customers.read'),
  ('cs_manager', 'invoices.read'),
  ('cs_manager', 'reports.read'),
  ('cs_manager', 'ai.use');
