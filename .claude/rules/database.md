---
paths:
  - "supabase/**"
  - "packages/api/**"
  - "packages/types/**"
---

# Database & API Rules

## Supabase PostgreSQL 15+
- Currency default: EGP (NOT USD). Timezone: Africa/Cairo (NOT UTC).
- `tenant_id` on ALL business tables (multi-tenant isolation).
- RLS enabled on ALL tables. No exceptions.
- State machine transitions enforced by `validate_state_transition()` trigger.
- `supa_audit` extension on all business tables for audit trail.

## RLS Performance (CRITICAL — these cause 99% of slow queries)
- `(SELECT auth.uid())` in policies, NOT `auth.uid()` — wrapping in SELECT allows initPlan caching (94-99% faster)
- INDEX every column referenced in RLS policies — without indexes, RLS does full table scan per row
- Always add explicit `.eq()` filters in queries — don't rely solely on RLS for filtering
- Reverse join direction: `team_id IN (SELECT team_id FROM team_users WHERE user_id = ...)` NOT the reverse
- Use SECURITY DEFINER functions for cross-table RLS lookups (avoids RLS on the join table)
- No OR in permissive policies — use separate policies instead (OR creates security holes)
- Views MUST use `WITH (security_invoker = true)` on Postgres 15+ (otherwise view bypasses RLS)

## Auth (Dual Pool)
- External pool: customers, suppliers, external drivers (self-signup + OTP)
- Internal pool: employees, internal drivers (admin-created only)
- Cross-pool access IMPOSSIBLE (JWT claim + RLS + cookie isolation)
- Cookies: `hq-external-session` vs `hq-internal-session`
- MFA (AAL2) required for financial tables (invoices, payments, credit)
- Refresh tokens are SINGLE-USE — two tabs refreshing simultaneously = one fails
- NEVER cache authenticated routes (CDN/ISR) — session cookie leaks to wrong user
- Use `getUser()` to validate sessions, NOT `getClaims()` (claims only do local JWT check)

## Server Functions (TanStack Start)
- `createServerFn` from `@tanstack/react-start`
- `.inputValidator()` with Zod (NOT `.validator()`)
- Server function errors are NOT thrown through middleware — handle as return values
- Large file uploads: stream from `request.body` in custom server entry, don't use default formData parsing
- Every mutation logs to audit_log
- Every form includes UUID idempotency key

## Cloudflare Workers
- No Node.js APIs at module level — `fs`, `path`, `crypto` must be imported inside handlers
- `/tmp` is request-scoped and non-persistent — use R2/KV/Durable Objects for persistence
- Bundle size target: <1 MB. Lazy-import heavy packages.
- CPU time limit: 30s (paid). Global scope init must complete in <1s.
- `cloudflare:workers` import ONLY in server functions, never in components

## Hyperdrive (Connection Pooling)
- SET statements reset after each transaction — run SET inside the transaction, not at startup
- Keep transactions SHORT (<1s) — move API calls OUTSIDE the transaction
- Sequence queries instead of Promise.all() — parallel queries exhaust connection pool
- Cached config (max_age=60) for reads, uncached for writes/financial
- Do NOT keep persistent connections in Durable Objects (starves pool)

## R2 (File Storage)
- Presigned URLs: use generous TTL (24-48h for downloads, 1h for uploads)
- TempAccessCredentials CANNOT generate presigned URLs — use permanent API tokens
- Tenant-scoped paths: `/{tenant_id}/invoices/{year}/{month}/`

## KV (Key-Value Cache)
- Eventually consistent (up to 60 seconds) — NEVER use for critical data
- No guaranteed read-after-write — write to DB first, then KV for cache
- Good for: JWKS, sessions (with DB fallback), config, exchange rates, prayer times

## pg_cron
- Max 8 concurrent jobs, 32 total. Keep jobs under 5 minutes.
- Stagger job start times by 1+ minutes to avoid connection spikes
- Monitor `cron.job_run_details` for failures
- If worker dies: Supabase Fast Reboot in General Settings

## Realtime
- ALWAYS unsubscribe in useEffect cleanup — uncleaned subscriptions hit channel limit
- Separate names for public vs private channels
- Monitor concurrent peak connections (Supabase billing)

## pgvector
- HNSW index must fit in shared memory (<50% of shared_buffers)
- Match vector dimensions to embedding model EXACTLY (1536 for OpenAI small)
- IVFFlat: set `lists = rows / 200` for production
