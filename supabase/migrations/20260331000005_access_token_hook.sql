-- Migration 005: Custom Access Token Hook
-- Injects pool, user_type, tenant_id, roles, customer_id, supplier_id, driver_id into JWT claims
-- Called by Supabase Auth on every token issue/refresh

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claims jsonb;
  user_profile record;
  user_roles jsonb;
  user_id uuid;
BEGIN
  user_id := (event->>'user_id')::UUID;

  SELECT
    p.pool,
    p.user_type,
    p.tenant_id,
    p.customer_id,
    p.supplier_id,
    p.driver_id
  INTO user_profile
  FROM public.user_profiles p
  WHERE p.user_id = custom_access_token_hook.user_id;

  -- If no user_profile found, return event unmodified (new user without profile yet)
  IF NOT FOUND THEN
    RETURN event;
  END IF;

  SELECT COALESCE(
    jsonb_agg(ur.role),
    '[]'::jsonb
  )
  INTO user_roles
  FROM public.user_roles ur
  WHERE ur.user_id = custom_access_token_hook.user_id;

  claims := event->'claims';

  claims := jsonb_set(
    claims,
    '{app_metadata}',
    COALESCE(claims->'app_metadata', '{}'::jsonb) ||
    jsonb_build_object(
      'pool',        COALESCE(user_profile.pool, 'external'),
      'user_type',   COALESCE(user_profile.user_type, 'unknown'),
      'tenant_id',   user_profile.tenant_id,
      'roles',       user_roles,
      'customer_id', user_profile.customer_id,
      'supplier_id', user_profile.supplier_id,
      'driver_id',   user_profile.driver_id
    )
  );

  event := jsonb_set(event, '{claims}', claims);

  RETURN event;
END;
$$;

-- Grant execute to supabase_auth_admin (required for auth hooks to call this function)
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;

-- Revoke from all other roles (security: only auth system should call this)
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM anon;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated;

-- Grant SELECT on tables the hook reads (supabase_auth_admin needs to query these)
GRANT SELECT ON public.user_profiles TO supabase_auth_admin;
GRANT SELECT ON public.user_roles TO supabase_auth_admin;
