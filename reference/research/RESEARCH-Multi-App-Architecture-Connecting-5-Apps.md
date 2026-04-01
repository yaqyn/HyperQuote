> ⚠️ **REFERENCE DOCUMENT — NOT THE SOURCE OF TRUTH**
> This file was written during the research phase and may contain outdated decisions, US-centric references, or superseded technical choices.
> **Always defer to `essential/RESEARCH.md` for current decisions.**
> Key changes since this file was written: TanStack Start (not Next.js), Capacitor (not Expo), React Aria (not shadcn), Egyptian law (not US FMCSA), EGP (not USD), dual auth pools, no online payments, no mobile wallets, spatial glass UI (not traditional dashboards).

# HyperQuote Multi-App Architecture: Connecting 5 Apps on a Shared Domain

## Platform Overview

| App | Subdomain | Audience | Purpose |
|-----|-----------|----------|---------|
| Website | hyperquote.net | Public + Market | Marketing site, public catalog, chatbot |
| Internal | app.hyperquote.net | Employees | Full operations platform |
| Portal | portal.hyperquote.net | Customers + Suppliers | Self-service, quotes, orders, invoices |
| CEO | ceo.hyperquote.net | Executives | Executive dashboard, dual AI |
| Driver | driver.hyperquote.net | Drivers | Delivery management, POD capture |

All deployed as separate Cloudflare Workers. All share a single Supabase project.

---

## 1. Subdomain SSO with Supabase Auth

### How Cross-Subdomain Sessions Work

Supabase Auth stores session tokens (access_token and refresh_token) in cookies. By default, cookies are scoped to the exact hostname that set them. To share sessions across `*.hyperquote.net`, the cookie `domain` attribute must be set to `.hyperquote.net` (with leading dot).

**Key principle**: When `Domain` is specified on a cookie, subdomains are always included. A cookie set with `Domain=.hyperquote.net` is readable by `app.hyperquote.net`, `portal.hyperquote.net`, `ceo.hyperquote.net`, `driver.hyperquote.net`, and `hyperquote.net` itself.

### Implementation with @supabase/ssr

The `createServerClient` and `createBrowserClient` from `@supabase/ssr` both accept `cookieOptions`:

```typescript
// packages/web-auth/src/supabase-client.ts
// Shared across all 5 apps via @hyperquote/web-auth

import { createServerClient } from '@supabase/ssr'

const COOKIE_DOMAIN = process.env.NODE_ENV === 'production'
  ? '.hyperquote.net'
  : undefined // undefined = same-host for localhost dev

export function createHyperQuoteServerClient(request: Request) {
  return createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        domain: COOKIE_DOMAIN,
        path: '/',
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        // HttpOnly is NOT recommended by Supabase - tokens need
        // to be passed between client/server components
        maxAge: 60 * 60 * 24 * 365, // 1 year
      },
      cookies: {
        getAll: () => {
          // Parse cookies from request
          return parseCookies(request.headers.get('cookie') ?? '')
        },
        setAll: (cookies) => {
          // Set cookies on response with domain attribute
          cookies.forEach(({ name, value, options }) => {
            // The domain is already merged from cookieOptions above
            setCookie(name, value, { ...options, domain: COOKIE_DOMAIN })
          })
        },
      },
    }
  )
}
```

Browser client (used in all 5 apps):

```typescript
// packages/web-auth/src/browser-client.ts
import { createBrowserClient } from '@supabase/ssr'

export function createHyperQuoteBrowserClient() {
  return createBrowserClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY,
    {
      cookieOptions: {
        domain: import.meta.env.PROD ? '.hyperquote.net' : undefined,
        path: '/',
        sameSite: 'lax',
        secure: import.meta.env.PROD,
      },
    }
  )
}
```

### SSO Flow

1. User logs in on ANY app (e.g., `portal.hyperquote.net/login`)
2. Supabase issues tokens, stored as cookies with `Domain=.hyperquote.net`
3. User navigates to another app (e.g., `app.hyperquote.net`)
4. Browser automatically sends the same cookies
5. The server client on the new app calls `getUser()` to validate the session
6. If valid, user is authenticated. If their role doesn't match the app, redirect.

### Logout Across All Apps

When a user signs out from any app, delete cookies with `Domain=.hyperquote.net`:

```typescript
export async function signOut(supabase: SupabaseClient) {
  await supabase.auth.signOut()
  // Cookies are automatically cleared with the same domain attribute
  // by @supabase/ssr's setAll handler
}
```

### Security Implications

- **SameSite=Lax**: Prevents CSRF from cross-origin POST requests. Cookies only sent on top-level navigations and GET requests from external sites.
- **Secure=true**: Cookies only transmitted over HTTPS (mandatory in production).
- **No HttpOnly**: Supabase intentionally does NOT use HttpOnly because the tokens need to be accessible by both client and server code. This is safe because Supabase tokens are JWTs with short expiry and are verified server-side.
- **Token refresh**: The refresh token rotates on use. If two apps try to refresh simultaneously, one will get an invalid refresh token. Supabase handles this with token rotation and automatic retry.
- **PKCE flow**: The default in `@supabase/ssr` for SSR. This prevents authorization code interception.

### Local Development Gotcha

`Domain=.localhost` does not work in all browsers. For local development:
- Use `undefined` as the domain (cookies scoped to each port)
- OR use a tool like `dnsmasq` to map `*.hyperquote.local` to 127.0.0.1
- OR run only one app at a time during development and test cross-app SSO in staging

---

## 2. Multi-App Cloudflare Workers Deployment

### Architecture: 5 Separate Workers, 5 Subdomains

Each app is a separate Cloudflare Worker with its own `wrangler.jsonc`. They are NOT environments of a single Worker -- they are independent Workers that share bindings to the same underlying resources.

```
hyperquote/
  apps/
    website/          -> Worker: hyperquote-website
      wrangler.jsonc
      vite.config.ts
      src/
    internal/         -> Worker: hyperquote-internal
      wrangler.jsonc
      vite.config.ts
      src/
    portal/           -> Worker: hyperquote-portal
      wrangler.jsonc
      vite.config.ts
      src/
    ceo/              -> Worker: hyperquote-ceo
      wrangler.jsonc
      vite.config.ts
      src/
    driver/           -> Worker: hyperquote-driver
      wrangler.jsonc
      vite.config.ts
      src/
  packages/
    ui/               -> @hyperquote/ui
    api/              -> @hyperquote/api
    web-auth/         -> @hyperquote/web-auth
    i18n/             -> @hyperquote/i18n
    forms/            -> @hyperquote/forms
    tables/           -> @hyperquote/tables
```

### Wrangler Configuration Per App

Each app has its own `wrangler.jsonc`:

```jsonc
// apps/internal/wrangler.jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "hyperquote-internal",
  "compatibility_date": "2026-03-27",
  "compatibility_flags": ["nodejs_compat"],
  "main": "@tanstack/react-start/server-entry",
  "observability": { "enabled": true },

  // Custom domain routing
  "routes": [
    { "pattern": "app.hyperquote.net", "custom_domain": true }
  ],

  // Environment variables
  "vars": {
    "APP_NAME": "internal",
    "SUPABASE_URL": "https://xxxx.supabase.co",
    "SUPABASE_ANON_KEY": "eyJ..."
  },

  // Shared R2 bucket (same bucket, different binding names are fine)
  "r2_buckets": [
    { "binding": "PUBLIC_ASSETS", "bucket_name": "hyperquote-public-assets" },
    { "binding": "PRIVATE_FILES", "bucket_name": "hyperquote-private-files" }
  ],

  // Shared KV namespace for caching
  "kv_namespaces": [
    { "binding": "CACHE", "id": "abc123..." },
    { "binding": "SESSIONS", "id": "def456..." }
  ],

  // Shared D1 database (if used alongside Supabase)
  "d1_databases": [
    { "binding": "DB", "database_name": "hyperquote-d1", "database_id": "ghi789..." }
  ],

  // Queues for async processing
  "queues": {
    "producers": [
      { "binding": "NOTIFICATION_QUEUE", "queue": "hyperquote-notifications" },
      { "binding": "AI_QUEUE", "queue": "hyperquote-ai-tasks" }
    ]
  },

  // Service bindings to other Workers (for direct RPC)
  "services": [
    { "binding": "PORTAL_WORKER", "service": "hyperquote-portal" },
    { "binding": "DRIVER_WORKER", "service": "hyperquote-driver" }
  ]
}
```

### Custom Domain Setup Per App

Each Worker gets its own subdomain via Cloudflare custom domains:

| Worker Name | Custom Domain | Notes |
|-------------|---------------|-------|
| hyperquote-website | hyperquote.net | Also www.hyperquote.net |
| hyperquote-internal | app.hyperquote.net | Employee-only |
| hyperquote-portal | portal.hyperquote.net | Customer/supplier facing |
| hyperquote-ceo | ceo.hyperquote.net | Executive dashboard |
| hyperquote-driver | driver.hyperquote.net | Mobile-first driver app |

DNS records are automatically created by Cloudflare when you configure custom domains.

### Vite Configuration (Same for All Apps)

```typescript
// apps/internal/vite.config.ts
import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { cloudflare } from '@cloudflare/vite-plugin'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    cloudflare({ viteEnvironment: { name: 'ssr' } }),
    tanstackStart(),
    react(),
  ],
})
```

### Deployment Strategy

Deploy each app independently:

```bash
# Deploy all apps (from monorepo root)
bun run --filter='./apps/*' deploy

# Deploy a single app
cd apps/internal && bun run deploy

# Or with turbo for dependency-aware builds
turbo run deploy --filter=@hyperquote/internal
```

Each app's `package.json`:

```json
{
  "scripts": {
    "dev": "vite dev",
    "build": "vite build",
    "preview": "vite preview",
    "deploy": "bun run build && wrangler deploy",
    "cf-typegen": "wrangler types"
  }
}
```

### Shared Bindings Summary

All 5 Workers can bind to the same underlying resources by referencing the same IDs:

| Resource | Type | Shared By |
|----------|------|-----------|
| hyperquote-public-assets | R2 Bucket | All 5 apps |
| hyperquote-private-files | R2 Bucket | Internal, Portal, Driver |
| hyperquote-cache | KV Namespace | All 5 apps |
| hyperquote-sessions | KV Namespace | All 5 apps |
| hyperquote-notifications | Queue | All 5 (producers), 1 consumer |
| hyperquote-ai-tasks | Queue | All 5 (producers), 1 consumer |

---

## 3. Shared Supabase Backend Across Apps

### Single Supabase Project, Role-Based RLS

All 5 apps connect to the same Supabase project using the same `SUPABASE_URL` and `SUPABASE_ANON_KEY`. Security is enforced at the database level via RLS, not at the app level.

### Custom Claims Architecture

Use a Custom Access Token Hook to inject app-relevant roles into the JWT:

```sql
-- User roles table
CREATE TYPE public.app_role AS ENUM (
  'customer',
  'supplier',
  'employee',
  'driver',
  'manager',
  'admin',
  'ceo'
);

CREATE TABLE public.user_roles (
  id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  organization_id uuid REFERENCES public.organizations(id),
  UNIQUE(user_id, role, organization_id)
);

-- A user can have MULTIPLE roles
-- e.g., an employee who is also a driver
-- e.g., a customer of one org who is a supplier to another

-- App permissions
CREATE TYPE public.app_permission AS ENUM (
  -- Portal permissions
  'quotes.create',
  'quotes.view_own',
  'orders.view_own',
  'invoices.view_own',
  'catalog.view',

  -- Internal permissions
  'quotes.view_all',
  'quotes.approve',
  'orders.manage',
  'inventory.manage',
  'dispatch.manage',
  'accounting.manage',
  'users.manage',

  -- Driver permissions
  'deliveries.view_assigned',
  'deliveries.update_status',
  'pod.capture',

  -- CEO permissions
  'analytics.view_all',
  'reports.generate',
  'ai.executive_queries'
);

CREATE TABLE public.role_permissions (
  id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  role app_role NOT NULL,
  permission app_permission NOT NULL,
  UNIQUE(role, permission)
);
```

### Custom Access Token Hook

Injects roles and allowed apps into the JWT so RLS can use them:

```sql
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claims jsonb;
  user_roles jsonb;
  allowed_apps jsonb;
BEGIN
  claims := event->'claims';

  -- Get all roles for this user
  SELECT jsonb_agg(DISTINCT role) INTO user_roles
  FROM public.user_roles
  WHERE user_id = (event->>'user_id')::uuid;

  -- Determine which apps the user can access based on roles
  SELECT jsonb_agg(DISTINCT app) INTO allowed_apps
  FROM (
    SELECT CASE r.role
      WHEN 'customer' THEN 'portal'
      WHEN 'supplier' THEN 'portal'
      WHEN 'employee' THEN 'internal'
      WHEN 'driver' THEN 'driver'
      WHEN 'manager' THEN 'internal'
      WHEN 'admin' THEN 'internal'
      WHEN 'ceo' THEN 'ceo'
    END AS app
    FROM public.user_roles r
    WHERE r.user_id = (event->>'user_id')::uuid
  ) apps;

  -- Inject into app_metadata (cannot be modified by user)
  IF claims->'app_metadata' IS NULL THEN
    claims := jsonb_set(claims, '{app_metadata}', '{}');
  END IF;

  claims := jsonb_set(claims, '{app_metadata, roles}', COALESCE(user_roles, '[]'));
  claims := jsonb_set(claims, '{app_metadata, allowed_apps}', COALESCE(allowed_apps, '[]'));

  event := jsonb_set(event, '{claims}', claims);
  RETURN event;
END;
$$;
```

### RLS Policies by App Scope

```sql
-- Helper function: check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(required_role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = required_role
  );
$$;

-- Helper: check role from JWT (faster, no DB hit)
CREATE OR REPLACE FUNCTION public.jwt_has_role(required_role text)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    auth.jwt()->'app_metadata'->'roles' ? required_role,
    false
  );
$$;

-- QUOTES TABLE: Different access per role
-- Customers see only their own quotes
CREATE POLICY "customers_view_own_quotes" ON public.quotes
  FOR SELECT TO authenticated
  USING (
    jwt_has_role('customer')
    AND customer_id IN (
      SELECT id FROM public.customers
      WHERE user_id = auth.uid()
    )
  );

-- Employees see all quotes
CREATE POLICY "employees_view_all_quotes" ON public.quotes
  FOR SELECT TO authenticated
  USING (jwt_has_role('employee') OR jwt_has_role('manager') OR jwt_has_role('admin'));

-- Customers can create quotes (submit requests)
CREATE POLICY "customers_create_quotes" ON public.quotes
  FOR INSERT TO authenticated
  WITH CHECK (
    jwt_has_role('customer')
    AND customer_id IN (
      SELECT id FROM public.customers
      WHERE user_id = auth.uid()
    )
  );

-- Only employees can approve/reject quotes
CREATE POLICY "employees_update_quotes" ON public.quotes
  FOR UPDATE TO authenticated
  USING (jwt_has_role('employee') OR jwt_has_role('manager') OR jwt_has_role('admin'));

-- DELIVERIES TABLE: Different views per role
-- Drivers see only their assigned deliveries
CREATE POLICY "drivers_view_assigned" ON public.deliveries
  FOR SELECT TO authenticated
  USING (
    jwt_has_role('driver')
    AND driver_id IN (
      SELECT id FROM public.drivers
      WHERE user_id = auth.uid()
    )
  );

-- Internal staff sees all deliveries
CREATE POLICY "internal_view_all_deliveries" ON public.deliveries
  FOR SELECT TO authenticated
  USING (jwt_has_role('employee') OR jwt_has_role('manager') OR jwt_has_role('admin'));

-- INTERNAL-ONLY TABLES: Completely hidden from customers
CREATE POLICY "internal_only_accounting" ON public.accounting_entries
  FOR ALL TO authenticated
  USING (jwt_has_role('employee') OR jwt_has_role('manager') OR jwt_has_role('admin') OR jwt_has_role('ceo'));
```

### Preventing Cross-App Data Leakage

Even though all apps use the same `anon` key, the RLS policies ensure:

1. **Portal users** can NEVER see internal tables (accounting, HR, internal notes)
2. **Drivers** can ONLY see their assigned deliveries
3. **CEO** can see everything (read-only aggregate data)
4. **Internal employees** have scoped access based on department/role

The `anon` key is public-safe. All security comes from the JWT (which contains the user's roles) and RLS policies.

### Rate Limiting Per App

Use Cloudflare's built-in rate limiting at the Worker level:

```typescript
// In each Worker's server entry or middleware
// apps/portal/src/middleware.ts

export async function rateLimitMiddleware(request: Request, env: Env) {
  const { success } = await env.RATE_LIMITER.limit({
    key: `portal:${request.headers.get('cf-connecting-ip')}`,
  })
  if (!success) {
    return new Response('Rate limited', { status: 429 })
  }
}
```

Or use Supabase's built-in rate limiting on auth endpoints (configurable in dashboard).

---

## 4. API Architecture: Server Functions vs Shared API

### Recommended Architecture: Hybrid Approach

```
                    +------------------+
                    | @hyperquote/api  |  <-- Shared business logic package
                    | (pure functions) |
                    +--------+---------+
                             |
              +--------------+--------------+
              |              |              |
     +--------v--+   +------v----+   +-----v------+
     |  Portal   |   | Internal  |   |   Driver   |
     |  Server   |   |  Server   |   |   Server   |
     | Functions |   | Functions |   |  Functions  |
     +-----------+   +-----------+   +------------+
```

### Layer 1: Shared Business Logic Package (@hyperquote/api)

Pure TypeScript functions with NO framework dependencies. These contain the business rules:

```typescript
// packages/api/src/quotes/create-quote.ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@hyperquote/api/database.types'

export interface CreateQuoteInput {
  customer_id: string
  items: Array<{ product_id: string; quantity: number }>
  delivery_address: string
  requested_date: string
}

export async function createQuote(
  supabase: SupabaseClient<Database>,
  input: CreateQuoteInput
) {
  // Business validation
  const customer = await supabase
    .from('customers')
    .select('id, credit_status, price_list_id')
    .eq('id', input.customer_id)
    .single()

  if (customer.error) throw new Error('Customer not found')
  if (customer.data.credit_status === 'blocked') {
    throw new Error('Customer credit is blocked')
  }

  // Calculate pricing from customer's price list
  const prices = await calculatePrices(supabase, input.items, customer.data.price_list_id)

  // Create quote
  const { data: quote, error } = await supabase
    .from('quotes')
    .insert({
      customer_id: input.customer_id,
      status: 'draft',
      total: prices.total,
      delivery_address: input.delivery_address,
      requested_date: input.requested_date,
    })
    .select()
    .single()

  if (error) throw error

  // Create line items
  await supabase.from('quote_items').insert(
    input.items.map((item, i) => ({
      quote_id: quote.id,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: prices.items[i].unit_price,
      total: prices.items[i].total,
    }))
  )

  return quote
}
```

### Layer 2: App-Specific Server Functions

Each app imports from `@hyperquote/api` and wraps business logic in server functions:

```typescript
// apps/portal/src/server/quotes.ts
import { createServerFn } from '@tanstack/react-start'
import { createQuote } from '@hyperquote/api/quotes'
import { getAuthenticatedClient } from '@hyperquote/web-auth'

export const submitQuoteRequest = createServerFn({ method: 'POST' })
  .validator(quoteRequestSchema)  // Zod schema from @hyperquote/forms
  .handler(async ({ data }) => {
    const supabase = await getAuthenticatedClient()

    // Portal-specific: customer can only create for themselves
    const { data: { user } } = await supabase.auth.getUser()
    const customer = await supabase
      .from('customers')
      .select('id')
      .eq('user_id', user.id)
      .single()

    return createQuote(supabase, {
      ...data,
      customer_id: customer.data.id,
    })
  })
```

```typescript
// apps/internal/src/server/quotes.ts
import { createServerFn } from '@tanstack/react-start'
import { createQuote } from '@hyperquote/api/quotes'
import { getAuthenticatedClient } from '@hyperquote/web-auth'

export const createQuoteForCustomer = createServerFn({ method: 'POST' })
  .validator(internalQuoteSchema)
  .handler(async ({ data }) => {
    const supabase = await getAuthenticatedClient()

    // Internal: employee can create for ANY customer
    // Additional internal-only fields like internal_notes
    const quote = await createQuote(supabase, data)

    // Internal-only: assign to sales rep
    await supabase
      .from('quotes')
      .update({ assigned_to: data.sales_rep_id })
      .eq('id', quote.id)

    return quote
  })
```

### Why NOT a Separate Hono API Layer

For HyperQuote, a separate Hono API Worker is NOT recommended because:

1. **Extra latency**: Server functions run in the same Worker process. A separate API Worker adds a network hop (even with service bindings, it is an extra invocation).
2. **Duplicate auth**: Each request would need to pass and re-verify auth tokens to the API layer.
3. **@hyperquote/api already exists**: The shared package provides the same code reuse benefits without the deployment overhead.
4. **TanStack Start server functions already run on Workers**: They ARE the API. No need for another layer.

### When a Shared API Worker WOULD Make Sense

- If you had non-TanStack consumers (mobile app, third-party integrations)
- If you needed a public API for external developers
- If you needed webhook receivers that don't belong to any app

For webhooks (WhatsApp, payment providers), a small dedicated Worker is appropriate:

```jsonc
// workers/webhooks/wrangler.jsonc
{
  "name": "hyperquote-webhooks",
  "routes": [
    { "pattern": "webhooks.hyperquote.net", "custom_domain": true }
  ],
  "queues": {
    "producers": [
      { "binding": "WHATSAPP_QUEUE", "queue": "hyperquote-whatsapp" },
      { "binding": "PAYMENT_QUEUE", "queue": "hyperquote-payments" }
    ]
  }
}
```

---

## 5. Real-Time Data Across Apps

### Supabase Realtime Architecture

Supabase Realtime supports three modes:
1. **Postgres Changes**: Listen to database INSERT/UPDATE/DELETE events
2. **Broadcast**: Pub/sub messaging between clients
3. **Presence**: Track online users

### Cross-App Real-Time Pattern

When data changes in one app, other apps need to see it. The recommended pattern:

```
Portal (customer submits quote)
  -> INSERT into quotes table
  -> Supabase Realtime detects change
  -> Internal app subscription fires
  -> Sales inbox updates in real-time
```

### Implementation

```typescript
// packages/api/src/realtime/channels.ts
// Shared channel naming conventions

export const CHANNELS = {
  // Quote lifecycle - subscribed by Portal + Internal
  quoteUpdates: (quoteId: string) => `quote:${quoteId}`,

  // Order lifecycle - subscribed by Portal + Internal + Driver
  orderUpdates: (orderId: string) => `order:${orderId}`,

  // Delivery tracking - subscribed by Portal + Internal + Driver
  deliveryTracking: (deliveryId: string) => `delivery:${deliveryId}`,

  // Sales inbox - subscribed by Internal only
  salesInbox: () => `sales:inbox`,

  // Driver location - subscribed by Internal dispatch
  driverLocation: (driverId: string) => `driver:location:${driverId}`,

  // Notifications per user (cross-app)
  userNotifications: (userId: string) => `user:notifications:${userId}`,
}
```

### Postgres Changes (For Data Mutations)

```typescript
// apps/internal/src/hooks/use-sales-inbox.ts
import { useEffect } from 'react'
import { useSupabase } from '@hyperquote/web-auth'
import { CHANNELS } from '@hyperquote/api/realtime'

export function useSalesInbox(onNewQuote: (quote: Quote) => void) {
  const supabase = useSupabase()

  useEffect(() => {
    const channel = supabase
      .channel(CHANNELS.salesInbox())
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'quotes',
          filter: 'status=eq.submitted',
        },
        (payload) => {
          onNewQuote(payload.new as Quote)
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])
}
```

### Broadcast (For Ephemeral Events Like Location)

```typescript
// apps/driver/src/hooks/use-location-broadcast.ts
// Driver broadcasts their location - no DB write needed

export function useLocationBroadcast(driverId: string) {
  const supabase = useSupabase()

  useEffect(() => {
    const channel = supabase.channel(CHANNELS.driverLocation(driverId))
    channel.subscribe()

    const watchId = navigator.geolocation.watchPosition((position) => {
      channel.send({
        type: 'broadcast',
        event: 'location',
        payload: {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          timestamp: Date.now(),
        },
      })
    })

    return () => {
      navigator.geolocation.clearWatch(watchId)
      supabase.removeChannel(channel)
    }
  }, [driverId])
}
```

```typescript
// apps/internal/src/hooks/use-driver-tracking.ts
// Dispatch tracks driver location in real-time

export function useDriverTracking(driverId: string) {
  const supabase = useSupabase()
  const [location, setLocation] = useState<DriverLocation | null>(null)

  useEffect(() => {
    const channel = supabase
      .channel(CHANNELS.driverLocation(driverId))
      .on('broadcast', { event: 'location' }, ({ payload }) => {
        setLocation(payload)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [driverId])

  return location
}
```

### Performance at Scale

Based on Supabase benchmarks (2025):

| Feature | Concurrent Users | Messages/sec | Median Latency |
|---------|-----------------|-------------|----------------|
| Broadcast (WebSocket) | 32,000 | 224,000 | 6ms |
| Broadcast (from DB) | 80,000 | 10,000 | 46ms |
| Large-scale broadcast | 250,000 | 800,000+ | 58ms |
| Auth-protected channels | 50,000 | 150,000+ | 19ms |

**Critical scaling consideration for Postgres Changes**: Each change triggers authorization checks for every subscribed user. With 100 subscribers and 1 INSERT, that is 100 "reads" against the DB. At HyperQuote's expected scale (hundreds, not thousands of concurrent users), this is fine.

**Recommendation for HyperQuote**: Use Postgres Changes for data events (quotes, orders, deliveries). Use Broadcast for ephemeral events (driver location, typing indicators). This hybrid approach avoids the Postgres Changes bottleneck for high-frequency events.

---

## 6. Shared Packages Architecture

### Bun Workspace Monorepo Structure

```json
// Root package.json
{
  "name": "hyperquote",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ]
}
```

### Package Definitions

```
packages/
  ui/          -> @hyperquote/ui        (React components, Tailwind)
  api/         -> @hyperquote/api       (Business logic, types, DB schemas)
  web-auth/    -> @hyperquote/web-auth  (Supabase client, auth hooks, SSO)
  i18n/        -> @hyperquote/i18n      (Translations, locale utils)
  forms/       -> @hyperquote/forms     (Zod schemas, TanStack Form utils)
  tables/      -> @hyperquote/tables    (TanStack Table configs, column defs)
```

### Package Configuration Pattern

Each package uses `workspace:*` protocol:

```json
// packages/ui/package.json
{
  "name": "@hyperquote/ui",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts",
    "./button": "./src/components/button.tsx",
    "./dialog": "./src/components/dialog.tsx",
    "./data-table": "./src/components/data-table.tsx"
  },
  "dependencies": {
    "@hyperquote/i18n": "workspace:*",
    "react": "^19.0.0",
    "tailwind-merge": "^2.0.0"
  },
  "devDependencies": {
    "typescript": "^5.7.0"
  }
}
```

```json
// packages/api/package.json
{
  "name": "@hyperquote/api",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts",
    "./quotes": "./src/quotes/index.ts",
    "./orders": "./src/orders/index.ts",
    "./deliveries": "./src/deliveries/index.ts",
    "./realtime": "./src/realtime/index.ts",
    "./database.types": "./src/database.types.ts"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.49.0",
    "zod": "^3.24.0"
  }
}
```

### Import Resolution

With Bun workspaces, imports resolve through symlinks:

```typescript
// apps/portal/src/routes/quotes/new.tsx
import { Button } from '@hyperquote/ui/button'           // -> packages/ui/src/components/button.tsx
import { quoteRequestSchema } from '@hyperquote/forms'    // -> packages/forms/src/index.ts
import { useTranslation } from '@hyperquote/i18n'         // -> packages/i18n/src/index.ts
import type { Database } from '@hyperquote/api/database.types'
```

**No build step needed for packages during development**: Bun and Vite resolve the TypeScript source directly via the `exports` field. The packages are bundled into each app during `vite build`.

### TypeScript Configuration

```jsonc
// packages/api/tsconfig.json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "declaration": true,
    "declarationMap": true,
    "composite": true,
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "types": ["@cloudflare/workers-types"]
  },
  "include": ["src"]
}
```

```jsonc
// apps/internal/tsconfig.json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "jsx": "react-jsx",
    "types": ["@cloudflare/workers-types", "vite/client"]
  },
  "references": [
    { "path": "../../packages/ui" },
    { "path": "../../packages/api" },
    { "path": "../../packages/web-auth" },
    { "path": "../../packages/i18n" },
    { "path": "../../packages/forms" },
    { "path": "../../packages/tables" }
  ]
}
```

### Build Order (with Turborepo)

```jsonc
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".output/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "deploy": {
      "dependsOn": ["build"],
      "cache": false
    },
    "cf-typegen": {
      "cache": false
    },
    "typecheck": {
      "dependsOn": ["^typecheck"]
    }
  }
}
```

Build order is automatically resolved:
1. `@hyperquote/i18n` (no internal deps)
2. `@hyperquote/api` (no internal deps)
3. `@hyperquote/web-auth` (depends on api)
4. `@hyperquote/forms` (depends on api)
5. `@hyperquote/ui` (depends on i18n)
6. `@hyperquote/tables` (depends on ui, api)
7. All apps (depend on packages)

---

## 7. Role-Based App Access

### Role-to-App Mapping

| Role | Primary App | Secondary Access |
|------|------------|------------------|
| customer | portal.hyperquote.net | hyperquote.net (public) |
| supplier | portal.hyperquote.net | hyperquote.net (public) |
| employee | app.hyperquote.net | hyperquote.net (public) |
| driver | driver.hyperquote.net | hyperquote.net (public) |
| manager | app.hyperquote.net | ceo.hyperquote.net (if granted) |
| admin | app.hyperquote.net | All apps |
| ceo | ceo.hyperquote.net | app.hyperquote.net |

### Enforcement at the Routing Level

Each app checks the user's roles on every authenticated request via middleware:

```typescript
// packages/web-auth/src/app-guard.ts
import { jwtDecode } from 'jwt-decode'

type AppName = 'website' | 'internal' | 'portal' | 'ceo' | 'driver'

const APP_ROLE_MAP: Record<AppName, string[]> = {
  website: [],  // Public - no role required
  portal: ['customer', 'supplier', 'admin'],
  internal: ['employee', 'manager', 'admin', 'ceo'],
  ceo: ['ceo', 'admin'],
  driver: ['driver', 'admin'],
}

export function canAccessApp(appName: AppName, session: Session | null): boolean {
  if (appName === 'website') return true  // Public
  if (!session) return false

  const jwt = jwtDecode(session.access_token)
  const userRoles: string[] = jwt.app_metadata?.roles ?? []
  const allowedRoles = APP_ROLE_MAP[appName]

  return userRoles.some(role => allowedRoles.includes(role))
}

export function getDefaultAppForUser(session: Session): string {
  const jwt = jwtDecode(session.access_token)
  const roles: string[] = jwt.app_metadata?.roles ?? []

  // Priority order for redirect after login
  if (roles.includes('ceo')) return 'https://ceo.hyperquote.net'
  if (roles.includes('admin')) return 'https://app.hyperquote.net'
  if (roles.includes('manager')) return 'https://app.hyperquote.net'
  if (roles.includes('employee')) return 'https://app.hyperquote.net'
  if (roles.includes('driver')) return 'https://driver.hyperquote.net'
  if (roles.includes('customer')) return 'https://portal.hyperquote.net'
  if (roles.includes('supplier')) return 'https://portal.hyperquote.net'

  return 'https://hyperquote.net'  // Fallback to public site
}
```

### App-Level Middleware (TanStack Start)

```typescript
// apps/internal/src/middleware.ts
import { createMiddleware } from '@tanstack/react-start'
import { canAccessApp } from '@hyperquote/web-auth'

export const authMiddleware = createMiddleware().server(async ({ next }) => {
  const supabase = createHyperQuoteServerClient(/* request */)
  const { data: { session } } = await supabase.auth.getSession()

  if (!canAccessApp('internal', session)) {
    // Not authorized for this app
    if (!session) {
      throw redirect({ to: '/login' })
    }
    // Has session but wrong role - send to correct app
    const correctApp = getDefaultAppForUser(session)
    throw redirect({ href: correctApp })
  }

  return next({ context: { session, supabase } })
})
```

### Multi-Role Users

A user with both `employee` and `driver` roles can access both `app.hyperquote.net` and `driver.hyperquote.net` with the same session cookie. The app switcher appears in the UI:

```typescript
// packages/web-auth/src/app-switcher.ts
export function getAccessibleApps(session: Session): AppLink[] {
  const jwt = jwtDecode(session.access_token)
  const roles: string[] = jwt.app_metadata?.roles ?? []
  const apps: AppLink[] = []

  if (roles.some(r => ['employee', 'manager', 'admin'].includes(r))) {
    apps.push({ name: 'Internal', url: 'https://app.hyperquote.net', icon: 'building' })
  }
  if (roles.some(r => ['customer', 'supplier'].includes(r))) {
    apps.push({ name: 'Portal', url: 'https://portal.hyperquote.net', icon: 'globe' })
  }
  if (roles.includes('driver')) {
    apps.push({ name: 'Driver', url: 'https://driver.hyperquote.net', icon: 'truck' })
  }
  if (roles.some(r => ['ceo', 'admin'].includes(r))) {
    apps.push({ name: 'CEO Dashboard', url: 'https://ceo.hyperquote.net', icon: 'chart' })
  }

  return apps
}
```

The app switcher is a shared UI component from `@hyperquote/ui` that renders in the top bar of every authenticated app.

---

## 8. Data Flow Between Apps

### Complete Cross-App Data Flow Map

```
CUSTOMER JOURNEY (Portal -> Internal -> Driver -> Portal)
=========================================================

1. QUOTE REQUEST
   Portal: Customer creates quote request
     -> INSERT quotes (status: 'submitted')
     -> Realtime: Internal sales inbox updates
   Internal: Sales rep sees new quote in inbox
     -> UPDATE quotes (status: 'quoted', prices filled)
     -> Realtime: Portal updates for customer
   Portal: Customer sees quoted price
     -> UPDATE quotes (status: 'accepted')
     -> Realtime: Internal sales inbox updates

2. ORDER CREATION
   Internal: Sales converts quote to order
     -> INSERT orders (status: 'confirmed')
     -> INSERT order_items
     -> Realtime: Portal shows new order
     -> Queue: Notification to customer (email/WhatsApp)
   Portal: Customer sees order confirmation

3. WAREHOUSE PICKING
   Internal: Warehouse gets pick list
     -> UPDATE orders (status: 'picking')
     -> UPDATE order_items (picked quantities)
     -> Realtime: Portal shows "being prepared"

4. DISPATCH
   Internal: Dispatch assigns driver + vehicle
     -> INSERT deliveries (status: 'assigned')
     -> UPDATE orders (status: 'dispatched')
     -> Realtime: Driver app shows new delivery
     -> Realtime: Portal shows "out for delivery"
     -> Queue: WhatsApp to customer with ETA

5. DELIVERY
   Driver: Driver starts delivery
     -> UPDATE deliveries (status: 'in_transit')
     -> Broadcast: GPS location (no DB write)
     -> Realtime: Internal dispatch tracks on map
     -> Realtime: Portal shows live tracking (if enabled)

   Driver: Driver arrives, captures POD
     -> UPDATE deliveries (status: 'delivered')
     -> Upload POD photo to Supabase Storage
     -> Realtime: Internal sees delivery confirmed
     -> Realtime: Portal shows "delivered" + POD
     -> Queue: WhatsApp to customer with POD

6. INVOICING
   Internal: Accounting generates invoice
     -> INSERT invoices
     -> INSERT invoice_items
     -> Upload PDF to Supabase Storage
     -> Realtime: Portal shows new invoice
     -> Queue: Email invoice to customer

7. PAYMENT
   Portal: Customer views invoice, records payment
     -> INSERT payments (status: 'pending_verification')
     -> Upload payment proof to Supabase Storage
     -> Realtime: Internal accounting inbox
   Internal: Accounting verifies payment
     -> UPDATE payments (status: 'verified')
     -> UPDATE invoices (status: 'paid')
     -> Realtime: Portal shows paid status
```

### CEO Dashboard Data Flow

```
CEO Dashboard (Read-Only Aggregates)
====================================

CEO App subscribes to aggregate views:
  - Real-time revenue (from invoices + payments)
  - Active orders count (from orders)
  - Delivery status summary (from deliveries)
  - Quote conversion rate (from quotes)
  - Customer satisfaction (from feedback)

Implementation:
  - Materialized views in Supabase for heavy aggregations
  - Supabase Realtime on the aggregate tables
  - Periodic refresh via Cloudflare Cron Trigger

-- Example materialized view
CREATE MATERIALIZED VIEW public.daily_metrics AS
SELECT
  date_trunc('day', created_at) AS day,
  COUNT(*) FILTER (WHERE status = 'submitted') AS quotes_submitted,
  COUNT(*) FILTER (WHERE status = 'accepted') AS quotes_accepted,
  SUM(total) FILTER (WHERE status = 'accepted') AS revenue_quoted,
  -- ... more metrics
FROM public.quotes
GROUP BY 1;

-- Refresh via cron (in the CEO Worker)
// Custom server entry with scheduled handler
export default {
  fetch: handler.fetch,
  async scheduled(event, env, ctx) {
    // Refresh materialized views every 15 minutes
    const supabase = createServiceRoleClient(env)
    await supabase.rpc('refresh_daily_metrics')
  },
}
```

### Website Data Flow

```
Website (Public + Authenticated Zones)
=======================================

Public:
  - Product catalog (read from public.products, no auth)
  - Company info (static/CMS)
  - Chatbot (calls AI service via server function)

Authenticated (customer logged in):
  - "My Account" quick view (reads from portal data)
  - Quick reorder (creates quote, redirects to portal)
  - Market pricing (public product search/compare)
```

---

## 9. Shared File Storage

### Two-Tier Storage Architecture

| Storage | Technology | Purpose | Access Pattern |
|---------|-----------|---------|----------------|
| Public assets | Cloudflare R2 | Logos, product images, static files | Direct URL, CDN-cached |
| Private files | Supabase Storage | POD photos, invoices, catalogs, payment proofs | Signed URLs, RLS-protected |

### R2: Public Assets (Shared Across All Workers)

All 5 Workers bind to the same R2 bucket:

```toml
# In EVERY app's wrangler.jsonc
[[r2_buckets]]
binding = "PUBLIC_ASSETS"
bucket_name = "hyperquote-public-assets"
```

Accessing R2 from any Worker:

```typescript
// packages/api/src/storage/public-assets.ts
export async function getProductImage(env: Env, productId: string): Promise<Response> {
  const object = await env.PUBLIC_ASSETS.get(`products/${productId}/main.webp`)
  if (!object) return new Response('Not found', { status: 404 })

  return new Response(object.body, {
    headers: {
      'Content-Type': object.httpMetadata?.contentType ?? 'image/webp',
      'Cache-Control': 'public, max-age=86400',
      'ETag': object.etag,
    },
  })
}
```

For public-facing URLs, set up a custom domain on R2:
- `assets.hyperquote.net` -> R2 bucket (public access)
- Cloudflare CDN caches at the edge automatically

### R2 CORS Configuration

```json
[
  {
    "AllowedOrigins": [
      "https://hyperquote.net",
      "https://app.hyperquote.net",
      "https://portal.hyperquote.net",
      "https://ceo.hyperquote.net",
      "https://driver.hyperquote.net"
    ],
    "AllowedMethods": ["GET", "PUT"],
    "AllowedHeaders": ["Content-Type", "Authorization"],
    "MaxAgeSeconds": 3600
  }
]
```

### Supabase Storage: Private Files

Supabase Storage with RLS for authenticated file access:

```sql
-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES
  ('pod-photos', 'pod-photos', false),
  ('invoices', 'invoices', false),
  ('catalogs', 'catalogs', false),
  ('payment-proofs', 'payment-proofs', false);

-- POD photos: drivers can upload, internal + customer can view
CREATE POLICY "drivers_upload_pod" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'pod-photos'
    AND jwt_has_role('driver')
  );

CREATE POLICY "view_pod_internal" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'pod-photos'
    AND (jwt_has_role('employee') OR jwt_has_role('manager') OR jwt_has_role('admin'))
  );

CREATE POLICY "view_own_pod_customer" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'pod-photos'
    AND jwt_has_role('customer')
    AND (storage.foldername(name))[1] IN (
      SELECT d.id::text FROM deliveries d
      JOIN orders o ON d.order_id = o.id
      JOIN customers c ON o.customer_id = c.id
      WHERE c.user_id = auth.uid()
    )
  );

-- Invoices: accounting uploads, customer views own
CREATE POLICY "accounting_upload_invoices" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'invoices'
    AND (jwt_has_role('employee') OR jwt_has_role('admin'))
  );

CREATE POLICY "customers_view_own_invoices" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'invoices'
    AND jwt_has_role('customer')
    AND (storage.foldername(name))[1] IN (
      SELECT c.id::text FROM customers c WHERE c.user_id = auth.uid()
    )
  );
```

### Signed URLs Across Apps

All apps generate signed URLs through the same Supabase client:

```typescript
// packages/api/src/storage/signed-urls.ts
export async function getPODSignedUrl(
  supabase: SupabaseClient,
  deliveryId: string
): Promise<string> {
  const { data, error } = await supabase.storage
    .from('pod-photos')
    .createSignedUrl(`${deliveryId}/photo.jpg`, 3600) // 1 hour

  if (error) throw error
  return data.signedUrl
}
```

The signed URL works from any subdomain because it points to the Supabase Storage URL (not the app subdomain). RLS ensures the user making the request has access.

---

## 10. WhatsApp Integration Across Apps

### Architecture: Dedicated Webhook Worker + Queue Fan-Out

```
WhatsApp Cloud API
       |
       v
+------------------+
| webhooks.hyperquote.net |  <- Dedicated Cloudflare Worker
| (Webhook receiver)      |
+--------+---------+
         |
         v
  +------+------+
  | Cloudflare  |
  | Queue       |
  | (whatsapp)  |
  +------+------+
         |
    +----+----+
    |         |
    v         v
Internal   Driver
(support)  (comms)
```

### Webhook Worker

```typescript
// workers/webhooks/src/whatsapp.ts
import { env } from 'cloudflare:workers'

interface WhatsAppMessage {
  from: string      // Phone number
  type: 'text' | 'image' | 'document' | 'location'
  text?: { body: string }
  timestamp: string
  id: string
}

export async function handleWhatsAppWebhook(request: Request): Promise<Response> {
  // Verify webhook signature
  const signature = request.headers.get('X-Hub-Signature-256')
  if (!verifySignature(signature, await request.clone().text(), env.WHATSAPP_SECRET)) {
    return new Response('Unauthorized', { status: 401 })
  }

  const body = await request.json()

  // Parse incoming messages
  for (const entry of body.entry) {
    for (const change of entry.changes) {
      if (change.field === 'messages') {
        for (const message of change.value.messages ?? []) {
          await routeMessage(message, change.value.metadata)
        }
      }
    }
  }

  return new Response('OK', { status: 200 }) // Respond within 30 seconds
}

async function routeMessage(message: WhatsAppMessage, metadata: any) {
  // Classify message by looking up the phone number
  const supabase = createServiceRoleClient(env)

  // Check if sender is a known customer
  const { data: customer } = await supabase
    .from('customers')
    .select('id, name')
    .eq('phone', message.from)
    .single()

  // Check if sender is a known driver
  const { data: driver } = await supabase
    .from('drivers')
    .select('id, name')
    .eq('phone', message.from)
    .single()

  // Store the raw message
  const { data: stored } = await supabase
    .from('whatsapp_messages')
    .insert({
      whatsapp_message_id: message.id,
      from_phone: message.from,
      message_type: message.type,
      content: message.text?.body ?? null,
      customer_id: customer?.id ?? null,
      driver_id: driver?.id ?? null,
      direction: 'inbound',
      timestamp: new Date(parseInt(message.timestamp) * 1000).toISOString(),
    })
    .select()
    .single()

  // Route to appropriate queue
  if (customer) {
    // Customer message -> Internal support inbox
    await env.WHATSAPP_QUEUE.send({
      type: 'customer_message',
      message_id: stored.data.id,
      customer_id: customer.id,
      content: message.text?.body,
    })
  } else if (driver) {
    // Driver message -> Internal dispatch + Driver app
    await env.WHATSAPP_QUEUE.send({
      type: 'driver_message',
      message_id: stored.data.id,
      driver_id: driver.id,
      content: message.text?.body,
    })
  } else {
    // Unknown sender -> route to general support
    await env.WHATSAPP_QUEUE.send({
      type: 'unknown_message',
      message_id: stored.data.id,
      phone: message.from,
      content: message.text?.body,
    })
  }
}
```

### Queue Consumer (Internal App)

```typescript
// apps/internal/src/server.ts (custom entrypoint)
import handler from '@tanstack/react-start/server-entry'

export default {
  fetch: handler.fetch,

  async queue(batch: MessageBatch, env: Env, ctx: ExecutionContext) {
    for (const message of batch.messages) {
      const data = message.body as WhatsAppQueueMessage

      switch (data.type) {
        case 'customer_message':
          // Insert into support_tickets or append to existing conversation
          await handleCustomerWhatsApp(env, data)
          break
        case 'driver_message':
          // Log in driver communication + notify dispatch
          await handleDriverWhatsApp(env, data)
          break
        case 'unknown_message':
          // Create unassigned support ticket
          await handleUnknownWhatsApp(env, data)
          break
      }

      message.ack()
    }
  },
}
```

### Sending WhatsApp Messages (From Any App)

```typescript
// packages/api/src/whatsapp/send.ts
export async function sendWhatsAppMessage(
  env: Env,
  to: string,
  template: string,
  params: Record<string, string>
) {
  // All outbound WhatsApp goes through a single function
  const response = await fetch(
    `https://graph.facebook.com/v21.0/${env.WHATSAPP_PHONE_ID}/messages`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
          name: template,
          language: { code: 'en' },
          components: [
            {
              type: 'body',
              parameters: Object.entries(params).map(([_, value]) => ({
                type: 'text',
                text: value,
              })),
            },
          ],
        },
      }),
    }
  )

  return response.json()
}
```

Use cases per app:
- **Internal**: Send order confirmations, delivery ETAs, invoice notifications
- **Driver**: Automated "on my way" messages to customers
- **Portal**: Customer initiates WhatsApp conversation (redirects to WhatsApp Web)

---

## 11. AI Integration Across Apps

### Architecture: Shared AI Service Package + Per-App Context

```
+------------------+
| @hyperquote/api  |
| /ai/             |  <- Shared AI service layer
|  claude-client.ts|
|  prompts/        |
|  context/        |
+--------+---------+
         |
    +----+----+----+----+
    |    |    |    |    |
  Website Portal Internal CEO Driver
  (chatbot)(chat)(assist)(dual)(none*)

* Driver app uses AI indirectly via dispatch
```

### Shared AI Client

```typescript
// packages/api/src/ai/claude-client.ts
import Anthropic from '@anthropic-ai/sdk'

export type AIContext = {
  app: 'website' | 'portal' | 'internal' | 'ceo'
  user_id?: string
  customer_id?: string
  organization_id?: string
  conversation_history?: Message[]
}

export async function queryAI(
  env: Env,
  context: AIContext,
  userMessage: string
): Promise<string> {
  const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })

  // Build system prompt based on app context
  const systemPrompt = buildSystemPrompt(context)

  // Fetch relevant context from database
  const dbContext = await fetchRelevantContext(env, context, userMessage)

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: systemPrompt,
    messages: [
      // Inject database context as assistant knowledge
      ...(dbContext ? [{ role: 'user' as const, content: `Context:\n${dbContext}` }] : []),
      ...(context.conversation_history ?? []),
      { role: 'user', content: userMessage },
    ],
  })

  return response.content[0].type === 'text' ? response.content[0].text : ''
}
```

### Per-App System Prompts

```typescript
// packages/api/src/ai/prompts/index.ts

function buildSystemPrompt(context: AIContext): string {
  const base = `You are the HyperQuote AI assistant for a B2B food/beverage distribution platform.`

  switch (context.app) {
    case 'website':
      return `${base}
        You are a public-facing chatbot on the marketing website.
        - Help visitors understand HyperQuote's services
        - Answer questions about product categories, delivery areas, pricing tiers
        - Guide potential customers to sign up or contact sales
        - Do NOT reveal internal operations, pricing formulas, or competitor analysis
        - Keep responses concise and professional`

    case 'portal':
      return `${base}
        You are helping a customer/supplier on the self-service portal.
        - Help with quote requests, order tracking, invoice queries
        - You have access to this customer's data (orders, quotes, invoices)
        - Guide them through portal features
        - Escalate complex issues to support (suggest contacting their sales rep)
        - Do NOT reveal other customers' data or internal margins`

    case 'internal':
      return `${base}
        You are an internal operations assistant for HyperQuote employees.
        - Help with sales analysis, customer management, inventory queries
        - You can access all internal data for this employee's department
        - Suggest optimizations, flag anomalies, draft communications
        - You can help compose quotes, analyze customer history, check stock levels`

    case 'ceo':
      return `${base}
        You are a strategic executive assistant for HyperQuote's leadership.
        - Provide high-level business analysis, KPI interpretation
        - Compare periods, identify trends, forecast based on data
        - Help with strategic decisions using all available company data
        - Present data clearly with summaries and key takeaways
        - You have access to all company data including financials`
  }
}
```

### Shared Conversation Context

When a customer asks a question on the portal and an employee follows up internally:

```sql
-- AI conversation storage
CREATE TABLE public.ai_conversations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  app_source text NOT NULL,  -- 'portal', 'internal', 'ceo', 'website'
  user_id uuid REFERENCES auth.users,
  customer_id uuid REFERENCES public.customers,
  subject text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.ai_messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid REFERENCES public.ai_conversations ON DELETE CASCADE,
  role text NOT NULL,  -- 'user', 'assistant'
  content text NOT NULL,
  app_source text NOT NULL,  -- which app sent this message
  created_at timestamptz DEFAULT now()
);

-- RLS: Employees can see customer AI conversations for support
CREATE POLICY "employees_view_customer_ai" ON public.ai_conversations
  FOR SELECT TO authenticated
  USING (
    (jwt_has_role('employee') OR jwt_has_role('admin'))
    AND customer_id IS NOT NULL
  );

-- Customers only see their own conversations
CREATE POLICY "customers_view_own_ai" ON public.ai_conversations
  FOR SELECT TO authenticated
  USING (
    jwt_has_role('customer')
    AND user_id = auth.uid()
  );
```

### Cross-App AI Context Flow

```
Customer on Portal: "What's the status of my order #1234?"
  -> AI fetches order data via Supabase
  -> AI responds with status + ETA
  -> Conversation stored with customer_id + app_source='portal'

Employee on Internal: Opens customer profile, sees AI conversation
  -> Employee clicks "Continue conversation"
  -> AI loads full conversation history (portal + internal messages)
  -> Employee asks AI: "Why was this order delayed?"
  -> AI checks delivery logs, warehouse picking times
  -> Response stored with app_source='internal'

Customer returns to Portal: Sees notification "Your inquiry was reviewed"
  -> Can see employee's resolution (if marked as shared)
```

### Rate Limiting and Cost Control

```typescript
// packages/api/src/ai/rate-limit.ts
const AI_LIMITS: Record<string, { requests_per_hour: number; max_tokens_per_day: number }> = {
  website: { requests_per_hour: 20, max_tokens_per_day: 50_000 },    // Anonymous chatbot
  portal: { requests_per_hour: 50, max_tokens_per_day: 200_000 },    // Per customer
  internal: { requests_per_hour: 100, max_tokens_per_day: 500_000 },  // Per employee
  ceo: { requests_per_hour: 200, max_tokens_per_day: 1_000_000 },     // Unlimited-ish
}
```

### Why One Shared AI Service Layer (Not Per-App)

1. **Shared context**: Customer conversations on portal are visible to internal support
2. **Consistent behavior**: All apps use the same Claude configuration, reducing drift
3. **Cost tracking**: Single point to monitor and limit API usage
4. **Prompt management**: Update prompts in one package, deployed to all apps
5. **Tool reuse**: Database query tools, chart generation, etc. defined once

---

## 12. Complete Architecture Diagram

```
                         Cloudflare Edge Network
    ================================================================

    hyperquote.net        app.hyperquote.net      portal.hyperquote.net
    +-------------+       +-----------------+     +------------------+
    | Website     |       | Internal App    |     | Customer Portal  |
    | Worker      |       | Worker          |     | Worker           |
    | (TanStack)  |       | (TanStack)      |     | (TanStack)       |
    +------+------+       +--------+--------+     +---------+--------+
           |                       |                        |
    ceo.hyperquote.net    driver.hyperquote.net    webhooks.hyperquote.net
    +-------------+       +-----------------+     +------------------+
    | CEO App     |       | Driver App      |     | Webhook Worker   |
    | Worker      |       | Worker          |     | (Hono)           |
    | (TanStack)  |       | (TanStack)      |     +--------+---------+
    +------+------+       +--------+--------+              |
           |                       |                       |
    ================================================================
           |                       |                       |
           +----------+------------+-----------+-----------+
                      |                        |
              +-------v--------+      +--------v---------+
              | Cloudflare     |      | Cloudflare       |
              | Resources      |      | Queues           |
              | - R2 Bucket    |      | - notifications  |
              | - KV Namespace |      | - ai-tasks       |
              | - D1 (cache)   |      | - whatsapp       |
              +----------------+      +------------------+
                      |
           +----------+------------+
           |                       |
    +------v-------+       +-------v--------+
    | Supabase     |       | Supabase       |
    | Auth + DB    |       | Storage        |
    | (Postgres)   |       | (S3-compatible)|
    | + Realtime   |       +----------------+
    +------+-------+
           |
    +------v-------+
    | External     |
    | Services     |
    | - Claude API |
    | - WhatsApp   |
    | - Email      |
    | - Payments   |
    +--------------+

    Shared Packages (Build-time, not runtime):
    ==========================================
    @hyperquote/ui        -> React components
    @hyperquote/api       -> Business logic + types
    @hyperquote/web-auth  -> Supabase client + SSO
    @hyperquote/i18n      -> Translations
    @hyperquote/forms     -> Zod schemas + form utils
    @hyperquote/tables    -> Table configs
```

### Communication Patterns Summary

| Pattern | Technology | Use Case |
|---------|-----------|----------|
| Synchronous RPC | Service Bindings | Worker-to-Worker direct calls |
| Async messaging | Cloudflare Queues | Notifications, WhatsApp routing, AI tasks |
| Database events | Supabase Realtime (Postgres Changes) | Order status, quote updates, invoice creation |
| Ephemeral events | Supabase Realtime (Broadcast) | Driver GPS, typing indicators |
| Shared state | Supabase Postgres + RLS | All persistent data |
| Shared cache | Cloudflare KV | Session cache, rate limit counters |
| Shared files | R2 (public) + Supabase Storage (private) | Assets and documents |
| Cross-app auth | Cookies on .hyperquote.net | Single Sign-On |
| Shared logic | @hyperquote/api package | Business rules, types, utilities |
| Scheduled work | Cloudflare Cron Triggers | Materialized view refresh, cleanup |

---

## Key Decision Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Auth sharing | Cookie domain on `.hyperquote.net` | Native browser cookie sharing, no custom SSO server needed |
| Deployment | Separate Workers per app | Independent deploy cycles, isolated failures, clear ownership |
| API architecture | Server functions + shared package | No extra hop, same security model, code reuse via @hyperquote/api |
| Real-time | Supabase Realtime (Postgres Changes + Broadcast) | Built-in, RLS-integrated, sufficient scale for B2B |
| File storage | R2 (public) + Supabase Storage (private) | R2 for CDN performance, Supabase for RLS-protected files |
| AI | Shared @hyperquote/api/ai package | Cross-app context, single cost center, consistent behavior |
| WhatsApp | Dedicated webhook Worker + Queue | Decouple ingress from processing, reliable delivery |
| Inter-worker comms | Service Bindings (sync) + Queues (async) | Zero-latency RPC + reliable async processing |
| Monorepo tooling | Bun workspaces + Turborepo | Fast installs, dependency-aware builds, parallel execution |

---

## Sources

- [Supabase Cross-Subdomain Auth Discussion #5742](https://github.com/orgs/supabase/discussions/5742)
- [Share Sessions Across Subdomains with Supabase - Michele Ong](https://micheleong.com/blog/share-sessions-subdomains-supabase)
- [Supabase SSR Advanced Guide](https://supabase.com/docs/guides/auth/server-side/advanced-guide)
- [Supabase Cookie Domain Issue #30279](https://github.com/supabase/supabase/issues/30279)
- [Cloudflare Workers Custom Domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)
- [Cloudflare Wrangler Configuration](https://developers.cloudflare.com/workers/wrangler/configuration/)
- [Cloudflare Workers Environments](https://developers.cloudflare.com/workers/wrangler/environments/)
- [Cloudflare R2 Workers API Usage](https://developers.cloudflare.com/r2/api/workers/workers-api-usage/)
- [Cloudflare R2 CORS Configuration](https://developers.cloudflare.com/r2/buckets/cors/)
- [Cloudflare R2 Presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/)
- [Cloudflare Workers Service Bindings RPC](https://developers.cloudflare.com/workers/runtime-apis/bindings/service-bindings/rpc/)
- [Cloudflare Queues Overview](https://developers.cloudflare.com/queues/)
- [Cloudflare Workers Best Practices](https://developers.cloudflare.com/workers/best-practices/workers-best-practices/)
- [Supabase Custom Claims and RBAC](https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac)
- [Supabase Custom Access Token Hook](https://supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase RLS Best Practices](https://makerkit.dev/blog/tutorials/supabase-rls-best-practices)
- [Supabase Realtime Benchmarks](https://supabase.com/docs/guides/realtime/benchmarks)
- [Supabase Realtime Pricing](https://supabase.com/docs/guides/realtime/pricing)
- [TanStack Start on Cloudflare Workers](https://developers.cloudflare.com/workers/framework-guides/web-apps/tanstack-start/)
- [TanStack Start Server Functions](https://tanstack.com/start/latest/docs/framework/react/guide/server-functions)
- [TanStack Start Vinxi to Vite Migration Issue #9622](https://github.com/cloudflare/workers-sdk/issues/9622)
- [Bun Workspaces Documentation](https://bun.com/docs/pm/workspaces)
- [WhatsApp Business API Webhook Architecture](https://www.chatarchitect.com/news/building-a-scalable-webhook-architecture-for-custom-whatsapp-solutions)
- [WhatsApp Cloud API Getting Started](https://developers.facebook.com/documentation/business-messaging/whatsapp/get-started)
- [Cloudflare Workers KV Namespaces](https://developers.cloudflare.com/kv/concepts/kv-namespaces/)
- [Claude API Platform](https://platform.claude.com/docs/en/release-notes/overview)
