-- Migration 003: Auth & Tenant Tables
-- 7 tables in dependency order: tenants, employees, user_profiles,
-- user_roles, role_permissions, approvals, audit_log (partitioned)

-- ============================================================================
-- 1. tenants
-- ============================================================================
CREATE TABLE tenants (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                      TEXT NOT NULL,
  slug                      TEXT UNIQUE NOT NULL,
  domain                    TEXT,
  logo_url                  TEXT,
  settings                  JSONB DEFAULT '{}',
  timezone                  TEXT DEFAULT 'Africa/Cairo',
  currency                  TEXT DEFAULT 'EGP',
  tax_id                    TEXT,
  commercial_register       TEXT,                          -- Egyptian commercial register
  tax_registration_number   TEXT,                          -- Egyptian 9-digit TRN
  inventory_costing_method  inventory_costing_method NOT NULL DEFAULT 'wac', -- WAC or FIFO only; LIFO prohibited (EAS)
  is_active                 BOOLEAN DEFAULT TRUE,
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 2. employees (before user_profiles -- user_profiles references employees)
-- ============================================================================
CREATE TABLE employees (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                UUID NOT NULL REFERENCES tenants(id),
  user_id                  UUID UNIQUE REFERENCES auth.users(id),
  employee_number          TEXT NOT NULL,
  first_name_ar            TEXT,                         -- Arabic first name
  last_name_ar             TEXT,                         -- Arabic last name
  department               TEXT NOT NULL,
  title                    TEXT,
  reports_to               UUID REFERENCES employees(id), -- self-reference for org hierarchy
  hire_date                DATE,
  base_salary              DECIMAL(15,2),                -- monthly base salary in EGP
  social_insurance_salary  DECIMAL(15,2),                -- salary basis for social insurance calc
  is_driver                BOOLEAN DEFAULT FALSE,        -- whether this employee is a delivery driver
  cdl_class                egyptian_license_class,       -- Egyptian driving license class
  medical_card_expiry      DATE,                         -- driver medical card expiration
  drug_test_status         TEXT,                         -- latest drug test result
  moffett_certified        BOOLEAN DEFAULT FALSE,        -- forklift / moffett certification
  is_active                BOOLEAN DEFAULT TRUE,
  phone_extension          TEXT,
  created_at               TIMESTAMPTZ DEFAULT NOW(),
  updated_at               TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, employee_number)
);

-- ============================================================================
-- 3. user_profiles
-- ============================================================================
CREATE TABLE user_profiles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id     UUID NOT NULL REFERENCES tenants(id),
  user_type     user_type NOT NULL,               -- 'internal','customer','supplier','driver'
  -- pool column: required by custom_access_token_hook (not in original spec)
  pool          TEXT NOT NULL DEFAULT 'external' CHECK (pool IN ('internal', 'external')),
  customer_id   UUID,                             -- FK deferred to Phase 13 (customers table)
  supplier_id   UUID,                             -- FK deferred to Phase 13 (suppliers table)
  driver_id     UUID,                             -- FK deferred to Phase 13 (drivers table)
  employee_id   UUID REFERENCES employees(id),    -- employees exists in this migration
  first_name    TEXT NOT NULL,
  last_name     TEXT NOT NULL,
  display_name  TEXT GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
  email         TEXT NOT NULL,
  phone         TEXT,
  avatar_url    TEXT,
  locale        TEXT DEFAULT 'en',                -- 'en' or 'ar'
  is_active     BOOLEAN DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  mfa_enabled   BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Deferred FK documentation
COMMENT ON COLUMN user_profiles.customer_id IS 'FK to customers(id) added in Phase 13 migration';
COMMENT ON COLUMN user_profiles.supplier_id IS 'FK to suppliers(id) added in Phase 13 migration';
COMMENT ON COLUMN user_profiles.driver_id IS 'FK to drivers(id) added in Phase 13 migration';

-- ============================================================================
-- 4. user_roles
-- ============================================================================
CREATE TABLE user_roles (
  id         BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       app_role NOT NULL,
  tenant_id  UUID NOT NULL REFERENCES tenants(id),
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  UNIQUE (user_id, role, tenant_id)
);

-- ============================================================================
-- 5. role_permissions
-- ============================================================================
CREATE TABLE role_permissions (
  id         BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  role       app_role NOT NULL,
  permission app_permission NOT NULL,
  UNIQUE (role, permission)
);

-- ============================================================================
-- 6. approvals
-- ============================================================================
CREATE TABLE approvals (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id),
  approval_type     approval_type NOT NULL,
  entity_type       TEXT NOT NULL,
  entity_id         UUID NOT NULL,
  requested_by      UUID NOT NULL REFERENCES auth.users(id),
  requested_at      TIMESTAMPTZ DEFAULT NOW(),
  assigned_to       UUID NOT NULL REFERENCES auth.users(id),
  status            approval_status DEFAULT 'pending',
  decision_notes    TEXT,
  decided_at        TIMESTAMPTZ,
  escalated_to      UUID REFERENCES auth.users(id),
  escalated_at      TIMESTAMPTZ,
  escalation_reason TEXT,
  expires_at        TIMESTAMPTZ,
  context           JSONB DEFAULT '{}',
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 7. audit_log (partitioned by month on created_at)
-- ============================================================================
CREATE TABLE audit_log (
  id             BIGINT GENERATED ALWAYS AS IDENTITY,
  tenant_id      UUID NOT NULL,
  user_id        UUID,
  user_email     TEXT,
  user_role      TEXT,
  ip_address     INET,
  user_agent     TEXT,
  action         audit_action NOT NULL,
  entity_type    TEXT NOT NULL,
  entity_id      UUID,
  old_values     JSONB,
  new_values     JSONB,
  changed_fields TEXT[],
  description    TEXT,
  metadata       JSONB DEFAULT '{}',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (created_at, id)
) PARTITION BY RANGE (created_at);

-- Create 4 partitions: April through July 2026
CREATE TABLE audit_log_2026_04 PARTITION OF audit_log
  FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
CREATE TABLE audit_log_2026_05 PARTITION OF audit_log
  FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
CREATE TABLE audit_log_2026_06 PARTITION OF audit_log
  FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
CREATE TABLE audit_log_2026_07 PARTITION OF audit_log
  FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');

-- ============================================================================
-- Indexes (for RLS performance -- every column used in policies MUST have an index)
-- ============================================================================

-- user_profiles indexes
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_user_profiles_tenant_id ON user_profiles(tenant_id);
CREATE INDEX idx_user_profiles_customer_id ON user_profiles(customer_id);
CREATE INDEX idx_user_profiles_supplier_id ON user_profiles(supplier_id);
CREATE INDEX idx_user_profiles_driver_id ON user_profiles(driver_id);

-- user_roles indexes
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_tenant_id ON user_roles(tenant_id);

-- employees indexes
CREATE INDEX idx_employees_tenant_id ON employees(tenant_id);
CREATE INDEX idx_employees_user_id ON employees(user_id);

-- approvals indexes
CREATE INDEX idx_approvals_tenant_id ON approvals(tenant_id);
CREATE INDEX idx_approvals_assigned_to ON approvals(assigned_to);
CREATE INDEX idx_approvals_entity ON approvals(entity_type, entity_id);

-- audit_log indexes (on partitioned table -- automatically applied to partitions)
CREATE INDEX idx_audit_log_tenant_id ON audit_log(tenant_id);
CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

-- Enable RLS on all 7 tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Stub current_tenant_id() so RLS policies can reference it.
-- The full implementation (reading from JWT claims) is in migration 004 (Plan 02).
-- CREATE OR REPLACE ensures migration 004 can safely overwrite this stub.
CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (auth.jwt()->'app_metadata'->>'tenant_id')::UUID,
    NULL
  );
$$;

-- Tenant isolation policies

CREATE POLICY tenant_isolation ON tenants
  FOR ALL TO authenticated
  USING (id = (SELECT public.current_tenant_id()));

CREATE POLICY tenant_isolation ON user_profiles
  FOR ALL TO authenticated
  USING (tenant_id = (SELECT public.current_tenant_id()));

CREATE POLICY tenant_isolation ON user_roles
  FOR ALL TO authenticated
  USING (tenant_id = (SELECT public.current_tenant_id()));

-- role_permissions: readable by all authenticated users (no tenant scoping)
CREATE POLICY read_all ON role_permissions
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY tenant_isolation ON employees
  FOR ALL TO authenticated
  USING (tenant_id = (SELECT public.current_tenant_id()));

CREATE POLICY tenant_isolation ON approvals
  FOR ALL TO authenticated
  USING (tenant_id = (SELECT public.current_tenant_id()));

CREATE POLICY tenant_isolation ON audit_log
  FOR ALL TO authenticated
  USING (tenant_id = (SELECT public.current_tenant_id()));

-- ============================================================================
-- updated_at triggers attached in migration 004 after function creation
-- Tables that need update_updated_at(): tenants, user_profiles, employees, approvals
-- ============================================================================
