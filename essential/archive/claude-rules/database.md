---
paths:
  - "supabase/**"
  - "packages/api/**"
  - "packages/types/**"
---

# Database Stack

- Supabase PostgreSQL 15+ with RLS
- `createServerFn` from `@tanstack/react-start`, `.inputValidator()` with Zod
- Cloudflare Workers + Hyperdrive + R2 + KV
- Two Supabase clients: browser client for client code, server client for server code — never mix
- `getUser()` for auth checks, NOT `getSession()`
- All monetary values as integers (smallest unit)
- Timestamps in UTC
