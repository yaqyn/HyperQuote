-- Migration 012: Deferred FK Constraints + Schema Upgrades
-- Part A: Add deferred FK constraints to existing tables (user_profiles, customer_addresses, projects, quote_requests)
-- Part B: Upgrade projects table to full BACKEND.md spec
-- Part C: Upgrade quote_requests table with missing BACKEND.md columns

-- ============================================================================
-- Part A: Deferred FK Constraints
-- ============================================================================

-- user_profiles.customer_id -> customers(id)
DO $$ BEGIN
  ALTER TABLE user_profiles ADD CONSTRAINT fk_user_profiles_customer
    FOREIGN KEY (customer_id) REFERENCES customers(id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- user_profiles.supplier_id -> suppliers(id)
DO $$ BEGIN
  ALTER TABLE user_profiles ADD CONSTRAINT fk_user_profiles_supplier
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- driver FK deferred to Plan 03 (drivers table created there)

-- customer_addresses.customer_id -> customers(id)
DO $$ BEGIN
  ALTER TABLE customer_addresses ADD CONSTRAINT fk_customer_addresses_customer
    FOREIGN KEY (customer_id) REFERENCES customers(id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- projects.customer_id -> customers(id)
DO $$ BEGIN
  ALTER TABLE projects ADD CONSTRAINT fk_projects_customer
    FOREIGN KEY (customer_id) REFERENCES customers(id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- quote_requests.customer_id -> customers(id)
DO $$ BEGIN
  ALTER TABLE quote_requests ADD CONSTRAINT fk_quote_requests_customer
    FOREIGN KEY (customer_id) REFERENCES customers(id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- Part B: Upgrade projects table to full BACKEND.md spec
-- Phase 9 has: id, tenant_id, customer_id, name, description, is_active, created_at, updated_at
-- BACKEND.md adds: project_number, address_id, start_date, estimated_end_date, actual_end_date,
--   project_budget, total_quoted/ordered/delivered/invoiced/paid, status, assigned_sales_rep,
--   notes, tags, stage
-- ============================================================================

ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_number TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS address_id UUID REFERENCES addresses(id);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS estimated_end_date DATE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS actual_end_date DATE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_budget DECIMAL(15,2);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS total_quoted DECIMAL(15,2) DEFAULT 0;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS total_ordered DECIMAL(15,2) DEFAULT 0;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS total_delivered DECIMAL(15,2) DEFAULT 0;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS total_invoiced DECIMAL(15,2) DEFAULT 0;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS total_paid DECIMAL(15,2) DEFAULT 0;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS assigned_sales_rep UUID REFERENCES employees(id);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS tags TEXT[];
ALTER TABLE projects ADD COLUMN IF NOT EXISTS stage TEXT;

-- Add UNIQUE constraint on (tenant_id, project_number)
-- Use DO block to handle case where constraint already exists
DO $$ BEGIN
  ALTER TABLE projects ADD CONSTRAINT uq_projects_tenant_project_number
    UNIQUE (tenant_id, project_number);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- Part C: Upgrade quote_requests table with missing BACKEND.md columns
-- Phase 9 has: delivery_date, but BACKEND has requested_delivery_date
-- Missing: sla_deadline, hold_reason, rejection_reason, source, reviewed_at,
--   priority_score, estimated_value
-- ============================================================================

ALTER TABLE quote_requests ADD COLUMN IF NOT EXISTS requested_delivery_date DATE;
ALTER TABLE quote_requests ADD COLUMN IF NOT EXISTS sla_deadline TIMESTAMPTZ;
ALTER TABLE quote_requests ADD COLUMN IF NOT EXISTS hold_reason TEXT;
ALTER TABLE quote_requests ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE quote_requests ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'portal';
ALTER TABLE quote_requests ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE quote_requests ADD COLUMN IF NOT EXISTS priority_score DECIMAL(5,2);
ALTER TABLE quote_requests ADD COLUMN IF NOT EXISTS estimated_value DECIMAL(15,2);
