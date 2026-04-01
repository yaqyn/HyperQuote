> ⚠️ **REFERENCE DOCUMENT — NOT THE SOURCE OF TRUTH**
> This file was written during the research phase and may contain outdated decisions, US-centric references, or superseded technical choices.
> **Always defer to `essential/RESEARCH.md` for current decisions.**
> Key changes since this file was written: TanStack Start (not Next.js), Capacitor (not Expo), React Aria (not shadcn), Egyptian law (not US FMCSA), EGP (not USD), dual auth pools, no online payments, no mobile wallets, spatial glass UI (not traditional dashboards).

# Dual Authentication Pool Model for B2B Logistics Platform
## Supabase Auth Implementation Patterns
### Research compiled March 2026

---

## Table of Contents

1. [Executive Decision: One Project with Pool Claims vs Two Projects](#1-executive-decision)
2. [Pool Architecture: app_metadata + Custom Access Token Hook](#2-pool-architecture)
3. [JWT Pool Claim Injection via Custom Access Token Hook](#3-jwt-pool-claim-injection)
4. [RLS Policies for Dual-Pool Enforcement](#4-rls-policies-for-dual-pool)
5. [Cookie and Session Isolation Strategy](#5-cookie-and-session-isolation)
6. [Self-Signup Security: External Drivers](#6-self-signup-security-external-drivers)
7. [Employee-as-Customer: Dual Account Pattern](#7-employee-as-customer)
8. [MFA Strategy: Internal vs External](#8-mfa-strategy)
9. [Cross-Pool Access Prevention](#9-cross-pool-access-prevention)
10. [Implementation Checklist](#10-implementation-checklist)

---

## 1. Executive Decision

### Recommendation: ONE Supabase Project with Pool Separation via `app_metadata`

Two approaches exist. Here is the comparison:

| Factor | One Project + Pool Claims | Two Separate Projects |
|--------|--------------------------|----------------------|
| **Cost** | Single compute instance (~$10/mo base) | Double compute (~$20/mo base) |
| **Data sharing** | Orders, products, inventory shared naturally | Cross-project queries require API calls or DB links |
| **Auth isolation** | Enforced via `app_metadata.pool` + RLS | Physically separate auth.users tables |
| **Session isolation** | Different cookie names per app | Naturally isolated (different project URLs) |
| **Operational complexity** | One migration pipeline, one backup | Two of everything: migrations, backups, monitoring |
| **RLS complexity** | Every policy must check pool claim | Simpler RLS (no pool check needed) |
| **Cross-pool data access** | Internal users query same tables as external | Internal project needs API/DB link to read external data |
| **Risk if pool check missed** | Privilege escalation across pools | No cross-pool risk (physical separation) |

### Why ONE project wins for HyperQuote:

1. **Shared data is the core use case.** An internal sales rep views the same `orders` table that a customer views -- just with broader access. Two projects would require syncing or cross-project queries for every core operation.

2. **Cost scales linearly.** Two projects means double compute, double storage billing, double edge function deployments.

3. **The Custom Access Token Hook + RLS pattern is battle-tested.** Supabase's official RBAC documentation uses exactly this pattern. The pool claim is just one more custom claim in the JWT.

4. **Defense in depth compensates for the single-project risk.** Pool enforcement happens at three layers: JWT claim (auth hook), RLS policies (database), and middleware (application). Missing one layer does not expose data because the other two catch it.

### When two projects would be appropriate:

- Regulatory requirement for physical data separation (not the case here)
- External users number in the millions while internal users are dozens (different scaling profiles)
- Zero-trust requirement where even a database superuser should not see both pools simultaneously

---

## 2. Pool Architecture

### The Pool Claim in app_metadata

Every user in `auth.users` gets a `pool` value in their `raw_app_meta_data` column:

```sql
-- External pool users (set during signup or by admin)
UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || '{"pool": "external"}'::jsonb
WHERE id = '<user_id>';

-- Internal pool users (set by admin only -- no self-signup)
UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || '{"pool": "internal"}'::jsonb
WHERE id = '<user_id>';
```

### Why app_metadata and NOT user_metadata

- `raw_app_meta_data` -- **cannot be modified by the user**. Only service_role or admin API can write to it. This is critical for security.
- `raw_user_meta_data` -- **can be modified by the user** via `supabase.auth.updateUser()`. If pool were stored here, a customer could change their pool to "internal."

### Pool Values and User Types

| Pool | User Type | How Account is Created | app_metadata |
|------|-----------|----------------------|--------------|
| `external` | Customer | Self-signup on website | `{"pool": "external", "user_type": "customer"}` |
| `external` | Supplier | Upgraded from customer by admin | `{"pool": "external", "user_type": "supplier"}` |
| `external` | External Driver | Self-signup on driver app | `{"pool": "external", "user_type": "driver", "driver_status": "pending"}` |
| `internal` | Employee | Admin creates via dashboard | `{"pool": "internal", "user_type": "employee", "department": "sales"}` |
| `internal` | Internal Driver | Admin creates via dashboard | `{"pool": "internal", "user_type": "driver"}` |
| `internal` | CEO/Executive | Admin creates via dashboard | `{"pool": "internal", "user_type": "executive"}` |

### Database Table for Pool Tracking

```sql
-- Mirrors and extends auth.users with pool enforcement
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  pool TEXT NOT NULL CHECK (pool IN ('internal', 'external')),
  user_type TEXT NOT NULL,
  display_name TEXT,
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast pool-based queries
CREATE INDEX idx_user_profiles_pool ON public.user_profiles(pool);
CREATE INDEX idx_user_profiles_pool_type ON public.user_profiles(pool, user_type);
```

---

## 3. JWT Pool Claim Injection

### Custom Access Token Hook

This PostgreSQL function fires before every JWT is issued. It reads the user's pool and roles, then injects them into the token claims:

```sql
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  claims jsonb;
  user_pool text;
  user_type text;
  user_roles jsonb;
BEGIN
  claims := event->'claims';

  -- Read pool from app_metadata (already in claims if set)
  user_pool := claims->'app_metadata'->>'pool';
  user_type := claims->'app_metadata'->>'user_type';

  -- SAFETY: If pool is somehow missing, deny by setting to 'none'
  -- This user will fail every RLS check
  IF user_pool IS NULL OR user_pool NOT IN ('internal', 'external') THEN
    claims := jsonb_set(claims, '{pool}', '"none"');
    event := jsonb_set(event, '{claims}', claims);
    RETURN event;
  END IF;

  -- Inject pool as a top-level claim for easy RLS access
  claims := jsonb_set(claims, '{pool}', to_jsonb(user_pool));
  claims := jsonb_set(claims, '{user_type}', to_jsonb(user_type));

  -- For internal users, also inject their roles array
  IF user_pool = 'internal' THEN
    SELECT jsonb_agg(r.role) INTO user_roles
    FROM public.user_roles r
    WHERE r.user_id = (event->>'user_id')::uuid;

    IF user_roles IS NOT NULL THEN
      claims := jsonb_set(claims, '{user_roles}', user_roles);
    ELSE
      claims := jsonb_set(claims, '{user_roles}', '[]'::jsonb);
    END IF;
  END IF;

  event := jsonb_set(event, '{claims}', claims);
  RETURN event;
END;
$$;

-- Required grants for the auth hook to work
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
GRANT SELECT ON TABLE public.user_roles TO supabase_auth_admin;
GRANT SELECT ON TABLE public.user_profiles TO supabase_auth_admin;

-- RLS bypass for auth admin reading these tables
CREATE POLICY "auth_admin_read_user_roles"
  ON public.user_roles
  AS PERMISSIVE FOR SELECT
  TO supabase_auth_admin
  USING (true);

CREATE POLICY "auth_admin_read_user_profiles"
  ON public.user_profiles
  AS PERMISSIVE FOR SELECT
  TO supabase_auth_admin
  USING (true);
```

### Enabling the Hook in Supabase Dashboard

Navigate to: **Authentication > Hooks > Custom Access Token** and select the `custom_access_token_hook` function.

### Resulting JWT Structure

After the hook, JWTs will look like:

```json
// EXTERNAL user (customer)
{
  "sub": "uuid-here",
  "role": "authenticated",
  "pool": "external",
  "user_type": "customer",
  "app_metadata": {
    "pool": "external",
    "user_type": "customer",
    "customer_id": "cust_123"
  },
  "exp": 1711700000
}

// INTERNAL user (sales rep)
{
  "sub": "uuid-here",
  "role": "authenticated",
  "pool": "internal",
  "user_type": "employee",
  "user_roles": ["sales_rep", "sales_manager"],
  "app_metadata": {
    "pool": "internal",
    "user_type": "employee",
    "department": "sales"
  },
  "exp": 1711700000
}
```

### Helper Functions for RLS

```sql
-- Get current user's pool from JWT
CREATE OR REPLACE FUNCTION public.get_user_pool()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(auth.jwt()->>'pool', 'none');
$$;

-- Check if current user is in internal pool
CREATE OR REPLACE FUNCTION public.is_internal_user()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(auth.jwt()->>'pool', 'none') = 'internal';
$$;

-- Check if current user is in external pool
CREATE OR REPLACE FUNCTION public.is_external_user()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(auth.jwt()->>'pool', 'none') = 'external';
$$;

-- Check if internal user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(required_role text)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    auth.jwt()->'user_roles' ? required_role,
    false
  );
$$;
```

---

## 4. RLS Policies for Dual-Pool

### Pattern: Same Table, Different Visibility

The core pattern is that internal and external users query the SAME tables but see different rows.

#### Orders Table Example

```sql
-- Internal users: see ALL orders (or filtered by department)
CREATE POLICY "internal_view_all_orders"
  ON public.orders
  FOR SELECT
  TO authenticated
  USING (
    public.is_internal_user()
  );

-- External customers: see only THEIR orders
CREATE POLICY "external_view_own_orders"
  ON public.orders
  FOR SELECT
  TO authenticated
  USING (
    public.is_external_user()
    AND customer_id = (auth.jwt()->'app_metadata'->>'customer_id')::uuid
  );

-- External suppliers: see orders containing their products
CREATE POLICY "supplier_view_relevant_orders"
  ON public.orders
  FOR SELECT
  TO authenticated
  USING (
    public.is_external_user()
    AND (auth.jwt()->'app_metadata'->>'user_type') = 'supplier'
    AND id IN (
      SELECT order_id FROM public.order_items
      WHERE supplier_id = (auth.jwt()->'app_metadata'->>'supplier_id')::uuid
    )
  );
```

#### Internal-Only Tables (e.g., HR data, internal notes)

```sql
-- ONLY internal users can see internal notes
CREATE POLICY "internal_only_notes"
  ON public.internal_notes
  FOR ALL
  TO authenticated
  USING (
    public.is_internal_user()
  );

-- No external policy exists = external users get zero rows
```

#### Preventing External Users from Accessing Internal Resources

```sql
-- This is the DENY-ALL baseline for sensitive tables
-- If no policy matches, Postgres denies access by default with RLS enabled
-- But for explicit documentation and defense-in-depth:

CREATE POLICY "block_external_from_employees"
  ON public.employees
  FOR ALL
  TO authenticated
  USING (
    public.is_internal_user()
  );
-- External users have NO matching policy -> zero rows returned
```

#### Write Policies with Pool Enforcement

```sql
-- Only external customers can create quote requests
CREATE POLICY "customers_create_rfq"
  ON public.quote_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_external_user()
    AND (auth.jwt()->'app_metadata'->>'user_type') = 'customer'
    AND customer_id = (auth.jwt()->'app_metadata'->>'customer_id')::uuid
  );

-- Only internal sales can create quotes (responses)
CREATE POLICY "sales_create_quotes"
  ON public.quotes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_internal_user()
    AND public.has_role('sales_rep')
  );
```

### Critical RLS Principle: Default Deny

With RLS enabled on a table and no matching policy, the result is **zero rows** -- not an error. This means:

- If you forget to add an external policy for a table, external users simply see nothing.
- If you forget to add an internal policy for a table, internal users simply see nothing.
- The pool claim acts as a first-gate filter. Even if someone manipulates a role, the pool claim (set only via app_metadata which requires service_role to modify) blocks cross-pool access.

---

## 5. Cookie and Session Isolation

### Architecture: Separate Domains, Separate Cookie Names

| App | Domain | Cookie Name | Pool |
|-----|--------|-------------|------|
| Customer Portal | `portal.hyperquote.com` | `hq-external-session` | external |
| Supplier Portal | `suppliers.hyperquote.com` | `hq-external-session` | external |
| Driver App | Native (Capacitor) | In-memory token storage | external |
| Internal Platform | `app.hyperquote.com` | `hq-internal-session` | internal |
| Sales App | `sales.hyperquote.com` | `hq-internal-session` | internal |
| CEO Dashboard | `exec.hyperquote.com` | `hq-internal-session` | internal |

### Why Different Cookie Names Matter

Even though all apps hit the same Supabase project, using different cookie names prevents a browser that has both an external and internal session from accidentally sending the wrong token. The server-side middleware reads only the cookie name it expects:

```typescript
// External app middleware (portal, supplier portal)
function getExternalSession(request: Request) {
  const cookieName = 'hq-external-session';
  const token = getCookie(request, cookieName);
  if (!token) return null;

  const decoded = decodeJWT(token);
  // CRITICAL: Verify pool claim matches expected pool
  if (decoded.pool !== 'external') {
    // Someone is trying to use an internal token on the external app
    clearCookie(cookieName);
    return null;
  }
  return decoded;
}

// Internal app middleware (platform, sales, exec)
function getInternalSession(request: Request) {
  const cookieName = 'hq-internal-session';
  const token = getCookie(request, cookieName);
  if (!token) return null;

  const decoded = decodeJWT(token);
  // CRITICAL: Verify pool claim matches expected pool
  if (decoded.pool !== 'internal') {
    clearCookie(cookieName);
    return null;
  }
  return decoded;
}
```

### Supabase Client Configuration Per App

```typescript
// External apps use custom storage key
const externalSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storageKey: 'hq-external-auth',  // Different localStorage key
    flowType: 'pkce',
  }
});

// Internal apps use different storage key
const internalSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storageKey: 'hq-internal-auth',  // Different localStorage key
    flowType: 'pkce',
  }
});
```

### SSO Within a Pool

SSO works naturally within a pool because all external apps share the same Supabase project and the same `storageKey`:

- Customer logs into `portal.hyperquote.com` -> session stored with `hq-external-auth`
- Customer navigates to `suppliers.hyperquote.com` (if same parent domain) -> same session available via shared cookie with `Domain=.hyperquote.com`

For cross-subdomain SSO within the same pool, set the cookie domain:

```typescript
// Cookie set with Domain=.hyperquote.com so all subdomains can read it
// But the cookie NAME differs between pools, preventing cross-pool leakage
```

### SSO Across Pools: Explicitly Blocked

An internal session cookie (`hq-internal-session`) is never read by external apps, and vice versa. Even if both cookies exist in the browser (employee browsing both apps), each app only reads its own cookie name and validates the pool claim.

---

## 6. Self-Signup Security: External Drivers

### The Problem

External/on-demand drivers self-signup via the driver app. They must never access internal data, internal driver routes, or internal operations.

### Implementation: Gated Activation

```sql
-- Trigger on new user signup: auto-set pool and pending status for driver signups
CREATE OR REPLACE FUNCTION public.handle_new_driver_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Only process if the signup came from the driver app
  -- (detected via user_metadata set during signup)
  IF NEW.raw_user_meta_data->>'signup_source' = 'driver_app' THEN
    -- Force pool to external, user_type to driver, status to pending
    NEW.raw_app_meta_data := COALESCE(NEW.raw_app_meta_data, '{}'::jsonb) || jsonb_build_object(
      'pool', 'external',
      'user_type', 'driver',
      'driver_status', 'pending',
      'verified', false
    );

    -- Create profile entry
    INSERT INTO public.user_profiles (id, pool, user_type, display_name, phone, is_active)
    VALUES (NEW.id, 'external', 'driver',
            NEW.raw_user_meta_data->>'full_name',
            NEW.phone,
            false  -- NOT active until verified
    );

    -- Create pending driver record
    INSERT INTO public.drivers (id, user_id, driver_type, status)
    VALUES (gen_random_uuid(), NEW.id, 'external', 'pending_verification');
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_driver
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_driver_signup();
```

### Driver Activation Flow

```
1. Driver downloads app, signs up with phone + OTP
2. Trigger sets: pool=external, driver_status=pending, verified=false
3. Driver submits: license photo, vehicle registration, personal ID
4. Operations team reviews documents in internal platform
5. Admin calls Supabase admin API to update app_metadata:
   - driver_status: "pending" -> "active"
   - verified: false -> true
6. Driver's NEXT token refresh picks up new claims
7. RLS policies now grant the driver access to available deliveries
```

### RLS for Pending vs Active External Drivers

```sql
-- Pending drivers can only see their own profile and submit documents
CREATE POLICY "pending_drivers_limited_access"
  ON public.drivers
  FOR SELECT
  TO authenticated
  USING (
    public.is_external_user()
    AND user_id = auth.uid()
  );

-- Only active, verified drivers can see available deliveries
CREATE POLICY "active_drivers_see_deliveries"
  ON public.deliveries
  FOR SELECT
  TO authenticated
  USING (
    public.is_external_user()
    AND (auth.jwt()->'app_metadata'->>'user_type') = 'driver'
    AND (auth.jwt()->'app_metadata'->>'driver_status') = 'active'
    AND (auth.jwt()->'app_metadata'->>'verified')::boolean = true
    AND status = 'available'
  );
```

### Internal vs External Driver Distinction

```sql
-- Internal drivers see their assigned routes (dispatched by operations)
CREATE POLICY "internal_drivers_assigned_routes"
  ON public.deliveries
  FOR SELECT
  TO authenticated
  USING (
    public.is_internal_user()
    AND (auth.jwt()->'app_metadata'->>'user_type') = 'driver'
    AND assigned_driver_id = auth.uid()
  );

-- External drivers see available pickups (gig-style)
CREATE POLICY "external_drivers_available_pickups"
  ON public.deliveries
  FOR SELECT
  TO authenticated
  USING (
    public.is_external_user()
    AND (auth.jwt()->'app_metadata'->>'user_type') = 'driver'
    AND (auth.jwt()->'app_metadata'->>'driver_status') = 'active'
    AND status = 'available'
    AND delivery_type = 'on_demand'
  );
```

---

## 7. Employee-as-Customer

### The Pattern: Two Separate Accounts, Two Separate Pools

This is the industry-standard approach used by Microsoft Entra (Azure AD B2B vs B2C), AWS (IAM users vs Cognito users), and every major B2B platform.

**Scenario:** Ahmed is a sales rep at HyperQuote. He also runs a small construction company and wants to order materials through HyperQuote as a customer.

| Aspect | Internal Account | External Account |
|--------|-----------------|-----------------|
| **Email** | ahmed@hyperquote.com | ahmed@ahmedconstruction.com (or personal email) |
| **Phone** | Company phone | Personal phone |
| **Pool** | `internal` | `external` |
| **User Type** | `employee` | `customer` |
| **Access** | Internal platform, sales tools | Customer portal only |
| **MFA** | Required (company policy) | Optional |
| **Created by** | HR/Admin | Self-signup |

### Why This Is Correct

1. **Clean separation of liability.** Ahmed's customer orders are tracked under his customer entity, not his employee entity. Billing, credit terms, and delivery addresses are all separate.

2. **No conflict of interest leakage.** Ahmed's internal access (seeing all orders, pricing, supplier margins) is completely firewalled from his customer persona.

3. **Standard pattern.** Microsoft explicitly recommends this: "Azure AD B2B is for workforce identity. Azure AD B2C is for customer identity. They are separate tenants." The same employee can exist in both.

4. **Supabase supports this natively.** Since external and internal accounts use different email addresses (or different phone numbers), there is no uniqueness conflict in `auth.users`. They are simply two different users who happen to be the same physical person.

### Edge Case: Same Email for Both

If Ahmed insists on using the same email for both accounts, this is problematic because Supabase enforces email uniqueness in `auth.users`. Solutions:

- **Preferred:** Use different email addresses. Company email for internal, personal email for external. This is the cleanest and most secure approach.
- **Alternative:** Use phone-based auth for one account and email-based for the other. Internal = email, External = phone OTP.
- **Not recommended:** The internal email hashing trick (from multi-tenant patterns) adds complexity without meaningful benefit here.

---

## 8. MFA Strategy

### Tiered MFA by Pool

| Pool | MFA Requirement | Factors | Enforcement Point |
|------|----------------|---------|-------------------|
| **Internal** | **Required for all** | TOTP (authenticator app) | Login + sensitive operations |
| **Internal (CEO/exec)** | **Required, hardware key encouraged** | TOTP + WebAuthn/FIDO2 | Every login |
| **External (customer)** | Optional, encouraged | TOTP or SMS | Account settings |
| **External (supplier)** | Encouraged after tier upgrade | TOTP | When accessing financial data |
| **External (driver)** | Phone OTP inherent | Phone serves as factor | Signup is phone-based |

### Supabase MFA Implementation

Supabase supports TOTP (time-based one-time password) and Phone MFA natively. The AAL (Authenticator Assurance Level) is included in every JWT:

```json
{
  "aal": "aal1"  // Password only
}
// vs
{
  "aal": "aal2"  // Password + second factor verified
}
```

### Enforcing MFA for Internal Users

```sql
-- Internal-only tables require aal2
CREATE POLICY "internal_mfa_required"
  ON public.financial_reports
  FOR SELECT
  TO authenticated
  USING (
    public.is_internal_user()
    AND (auth.jwt()->>'aal') = 'aal2'
  );
```

### Middleware MFA Check (Application Layer)

```typescript
// Internal app middleware: redirect to MFA setup if not enrolled
async function requireInternalMFA(request: Request) {
  const { data: { user } } = await supabase.auth.getUser();

  if (user?.app_metadata?.pool !== 'internal') {
    return redirect('/unauthorized');
  }

  const { data: factors } = await supabase.auth.mfa.listFactors();
  const hasVerifiedFactor = factors?.totp?.some(f => f.status === 'verified');

  if (!hasVerifiedFactor) {
    return redirect('/setup-mfa'); // Force MFA enrollment
  }

  // Check AAL level
  const { data: { currentLevel } } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (currentLevel !== 'aal2') {
    return redirect('/verify-mfa'); // Force MFA challenge
  }
}
```

---

## 9. Cross-Pool Access Prevention

### Defense in Depth: Three Layers

```
Layer 1: JWT Pool Claim (Custom Access Token Hook)
  -> Pool is set in app_metadata (service_role only)
  -> Hook injects pool into JWT
  -> User cannot modify their own pool

Layer 2: RLS Policies (Database)
  -> Every policy checks pool via auth.jwt()->>'pool'
  -> Missing pool = 'none' = zero access
  -> Internal tables have NO external policies

Layer 3: Application Middleware (Server)
  -> Each app validates pool claim matches expected pool
  -> Wrong pool = session cleared, redirect to login
  -> API routes check pool before processing
```

### Attack Scenarios and Defenses

| Attack | Defense |
|--------|---------|
| Customer modifies `user_metadata` to add `pool: internal` | Pool is in `app_metadata`, not `user_metadata`. Users cannot modify `app_metadata`. |
| Customer obtains an internal user's JWT | JWT is signed by Supabase. Cannot be forged. Internal JWT presented to external app is rejected by middleware (wrong pool claim). |
| Customer calls Supabase API directly, bypassing app | RLS policies check pool claim from JWT. Even direct API calls go through RLS. |
| Customer manipulates roles in `user_roles` table | RLS on `user_roles` table itself prevents external users from reading/writing roles. |
| SQL injection attempts to bypass RLS | `auth.jwt()` is a system function, not derived from user input. Cannot be injected. |
| Compromised external driver escalates to internal | Driver's `app_metadata.pool` is `external`. Even if driver_status is manipulated client-side, `app_metadata` requires `service_role` key to modify. |
| Insider creates external user with pool=internal | Audit trigger logs all `app_metadata` changes. Admin API calls to modify pool are logged. |

### Audit Trigger for Pool Changes

```sql
-- Log any changes to user pool assignment
CREATE TABLE public.pool_audit_log (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL,
  old_pool TEXT,
  new_pool TEXT,
  changed_by UUID,
  changed_at TIMESTAMPTZ DEFAULT now(),
  context JSONB
);

CREATE OR REPLACE FUNCTION public.audit_pool_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF OLD.raw_app_meta_data->>'pool' IS DISTINCT FROM NEW.raw_app_meta_data->>'pool' THEN
    INSERT INTO public.pool_audit_log (user_id, old_pool, new_pool, context)
    VALUES (
      NEW.id,
      OLD.raw_app_meta_data->>'pool',
      NEW.raw_app_meta_data->>'pool',
      jsonb_build_object(
        'old_metadata', OLD.raw_app_meta_data,
        'new_metadata', NEW.raw_app_meta_data
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER audit_auth_user_pool_change
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_pool_changes();
```

---

## 10. Implementation Checklist

### Phase 1: Foundation

- [ ] Add `pool` field to `app_metadata` schema convention
- [ ] Create `user_profiles` table with pool column
- [ ] Create `user_roles` table (internal users only)
- [ ] Implement `custom_access_token_hook` function
- [ ] Enable the hook in Supabase Dashboard
- [ ] Create helper functions: `get_user_pool()`, `is_internal_user()`, `is_external_user()`, `has_role()`
- [ ] Create `pool_audit_log` table and trigger

### Phase 2: RLS Policies

- [ ] Enable RLS on ALL tables
- [ ] Write pool-aware SELECT policies for shared tables (orders, products, quotes)
- [ ] Write internal-only policies for sensitive tables (employees, financials, internal_notes)
- [ ] Write external-specific policies (customer self-service, driver deliveries)
- [ ] Write INSERT/UPDATE/DELETE policies with pool + role checks
- [ ] Test: external user gets zero rows on internal-only tables
- [ ] Test: internal user sees all rows on shared tables
- [ ] Test: customer sees only their own orders

### Phase 3: Application Layer

- [ ] Configure separate `storageKey` for external vs internal Supabase clients
- [ ] Implement pool-checking middleware for each app
- [ ] Set up cookie names: `hq-external-session` and `hq-internal-session`
- [ ] Add pool claim validation on every authenticated API route
- [ ] Redirect wrong-pool users to appropriate login page

### Phase 4: Signup Flows

- [ ] External customer self-signup: auto-set `pool: external, user_type: customer`
- [ ] External driver self-signup: auto-set `pool: external, user_type: driver, driver_status: pending`
- [ ] Internal user creation: admin-only flow via service_role, set `pool: internal`
- [ ] Disable self-signup for internal pool (enforce via trigger that rejects signups without admin flag)

### Phase 5: MFA

- [ ] Enable TOTP MFA in Supabase project settings
- [ ] Force MFA enrollment for all internal users on first login
- [ ] Add AAL2 check to sensitive internal RLS policies
- [ ] Make MFA optional but visible for external users

### Phase 6: Testing and Audit

- [ ] Penetration test: attempt cross-pool access from external account
- [ ] Penetration test: attempt to modify app_metadata from client
- [ ] Verify audit log captures all pool changes
- [ ] Verify JWT contains correct pool claim after hook
- [ ] Verify expired/revoked sessions cannot be reused across pools

---

## Key Supabase Documentation References

- [Custom Access Token Hook](https://supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook) -- The core mechanism for injecting pool claims into JWTs
- [Custom Claims & RBAC](https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac) -- Official pattern for role-based access using auth hooks and RLS
- [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security) -- RLS policy syntax and patterns
- [User Sessions](https://supabase.com/docs/guides/auth/sessions) -- Session management, token refresh, and session termination
- [JWT Claims Reference](https://supabase.com/docs/guides/auth/jwt-fields) -- All available JWT claims including AAL
- [Auth Hooks Overview](https://supabase.com/docs/guides/auth/auth-hooks) -- All available auth hooks
- [Server-Side Auth Advanced Guide](https://supabase.com/docs/guides/auth/server-side/advanced-guide) -- Cookie handling, session leakage prevention
- [MFA with TOTP](https://supabase.com/docs/guides/auth/auth-mfa/totp) -- Time-based MFA implementation
- [MFA with Phone](https://supabase.com/docs/guides/auth/auth-mfa/phone) -- Phone-based MFA

## External References

- [Auth0: B2B SaaS Identity Challenges](https://auth0.com/blog/b2b-saas-identity-challenges-enterprise-integration-and-security/) -- Enterprise patterns for separating internal vs external identity
- [Microsoft Entra External ID](https://learn.microsoft.com/en-us/entra/external-id/external-identities-overview) -- Microsoft's approach to workforce vs customer identity separation (B2B vs B2C tenants)
- [Multi-Tenant Auth with Supabase (2026)](https://medium.com/@kriryk/multi-tenant-authentication-with-supabase-a-production-implementation-0f6064f50d55) -- Production implementation of multi-tenant auth
- [Supabase Multi-Tenancy Discussion](https://github.com/orgs/supabase/discussions/1615) -- Community discussion on multi-tenant patterns
