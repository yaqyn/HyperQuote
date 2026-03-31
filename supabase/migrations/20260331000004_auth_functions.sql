-- Migration 004: Auth Helper Functions + Triggers
-- 12 functions: pool/identity extractors, role/permission checkers, trigger functions
-- Plus trigger attachments for updated_at and set_tenant_id

-- ============================================================================
-- Pool & Identity Extractors (Functions 1-8)
-- ============================================================================

-- 1. get_user_pool() - Returns pool from JWT app_metadata
CREATE OR REPLACE FUNCTION public.get_user_pool()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (auth.jwt()->'app_metadata'->>'pool'),
    'external'
  );
$$;

-- 2. is_internal_user() - Returns TRUE if pool = 'internal'
CREATE OR REPLACE FUNCTION public.is_internal_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT (SELECT public.get_user_pool()) = 'internal';
$$;

-- 3. is_external_user() - Returns TRUE if pool = 'external'
CREATE OR REPLACE FUNCTION public.is_external_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT (SELECT public.get_user_pool()) = 'external';
$$;

-- 4. current_tenant_id() - Returns tenant_id UUID from JWT
-- Overwrites stub from migration 003 (CREATE OR REPLACE is safe)
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

-- 5. current_user_type() - Returns user_type from JWT
CREATE OR REPLACE FUNCTION public.current_user_type()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (auth.jwt()->'app_metadata'->>'user_type'),
    'unknown'
  );
$$;

-- 6. current_customer_id() - Returns customer_id UUID from JWT
CREATE OR REPLACE FUNCTION public.current_customer_id()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT (auth.jwt()->'app_metadata'->>'customer_id')::UUID;
$$;

-- 7. current_supplier_id() - Returns supplier_id UUID from JWT
CREATE OR REPLACE FUNCTION public.current_supplier_id()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT (auth.jwt()->'app_metadata'->>'supplier_id')::UUID;
$$;

-- 8. current_driver_id() - Returns driver_id UUID from JWT
CREATE OR REPLACE FUNCTION public.current_driver_id()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT (auth.jwt()->'app_metadata'->>'driver_id')::UUID;
$$;

-- ============================================================================
-- Role & Permission Checkers (Functions 9-10)
-- ============================================================================

-- 9. has_role(required_role TEXT) - Checks JWT roles array
CREATE OR REPLACE FUNCTION public.has_role(required_role TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(
      COALESCE(auth.jwt()->'app_metadata'->'roles', '[]'::jsonb)
    ) AS role
    WHERE role = required_role
  );
$$;

-- 10. authorize(requested_permission app_permission) - SECURITY DEFINER
--     Checks role_permissions table against user's roles from JWT
CREATE OR REPLACE FUNCTION public.authorize(requested_permission app_permission)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_roles jsonb;
  has_permission boolean := false;
BEGIN
  user_roles := COALESCE(auth.jwt()->'app_metadata'->'roles', '[]'::jsonb);

  SELECT EXISTS (
    SELECT 1
    FROM public.role_permissions rp
    WHERE rp.permission = requested_permission
      AND rp.role IN (
        SELECT jsonb_array_elements_text(user_roles)
      )
  ) INTO has_permission;

  RETURN has_permission;
END;
$$;

-- ============================================================================
-- Trigger Functions (Functions 11-12)
-- ============================================================================

-- 11. set_tenant_id() - BEFORE INSERT trigger, auto-sets tenant_id from JWT
CREATE OR REPLACE FUNCTION public.set_tenant_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.tenant_id IS NULL OR NEW.tenant_id != (SELECT public.current_tenant_id()) THEN
    NEW.tenant_id := (SELECT public.current_tenant_id());
  END IF;

  IF NEW.tenant_id IS NULL THEN
    RAISE EXCEPTION 'No tenant context found. Ensure user has tenant_id in JWT claims.';
  END IF;

  RETURN NEW;
END;
$$;

-- 12. update_updated_at() - BEFORE UPDATE trigger, sets updated_at = NOW()
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

-- ============================================================================
-- Trigger Attachments
-- ============================================================================

-- updated_at triggers
CREATE TRIGGER set_updated_at BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON employees FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON approvals FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- tenant_id auto-set triggers (for tables where inserts come from authenticated users)
-- Note: NOT attached to tenants table (tenant creation is a special admin operation)
CREATE TRIGGER set_tenant_id BEFORE INSERT ON user_profiles FOR EACH ROW EXECUTE FUNCTION set_tenant_id();
CREATE TRIGGER set_tenant_id BEFORE INSERT ON user_roles FOR EACH ROW EXECUTE FUNCTION set_tenant_id();
CREATE TRIGGER set_tenant_id BEFORE INSERT ON employees FOR EACH ROW EXECUTE FUNCTION set_tenant_id();
CREATE TRIGGER set_tenant_id BEFORE INSERT ON approvals FOR EACH ROW EXECUTE FUNCTION set_tenant_id();
CREATE TRIGGER set_tenant_id BEFORE INSERT ON audit_log FOR EACH ROW EXECUTE FUNCTION set_tenant_id();
