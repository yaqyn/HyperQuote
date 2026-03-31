# Architecture Patterns

**Domain:** B2B Building Materials Platform (Egypt)
**Researched:** 2026-03-31

---

## Recommended Architecture

```
                    Cloudflare Network (Global Edge)
                    ================================

    [Website Worker]  [Portal Worker]  [Internal Worker]  [CEO Worker]
         |                 |                 |                |
         +--------+--------+--------+--------+               |
                  |                                           |
            [Supabase]                                   [Supabase]
         PostgreSQL + Auth + Realtime + Storage          (same instance)
                  |
            [Cloudflare Services]
         R2 (storage) | KV (config) | Hyperdrive (DB pool) | AI Gateway

    [Driver App - Capacitor]
         |
    [PowerSync + SQLite] --sync--> [Supabase]
```

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| Website Worker | SSG marketing pages, SSR product catalog, login modal | Supabase (auth, products) |
| Portal Worker | Customer/supplier authenticated experience, AI chat | Supabase (all domains), AI Gateway |
| Internal Worker | 11-module employee platform, glass window UI | Supabase (all domains), AI Gateway |
| CEO Worker | Search-only command center, approval flows | Supabase (materialized views), AI Gateway |
| Driver App | Native mobile, offline-first delivery execution | PowerSync (offline), Supabase (sync) |
| Supabase | PostgreSQL, Auth, Realtime, Storage, Edge Functions | All Workers via HTTP |
| Cloudflare R2 | Public static assets, product images | Website/Portal Workers |
| Cloudflare KV | Config cache, JWKS cache, exchange rates | All Workers |
| Cloudflare Hyperdrive | DB connection pooling | All Workers (read queries) |
| AI Gateway | Route AI requests to GLM/Groq/Mistral/Claude | Portal, Internal, CEO Workers |

### Data Flow

1. **Request arrives** at Cloudflare Worker (global edge, ~0ms cold start)
2. **TanStack Start** handles routing (SSR/SSG/SPA based on route config)
3. **Server functions** validate input (Zod), check auth (Supabase SSR cookie), query DB (Supabase client via Hyperdrive)
4. **TanStack Query** hydrates data from server to client (automatic via `@tanstack/react-router-ssr-query`)
5. **Supabase Realtime** pushes updates -> invalidates TanStack Query cache -> React re-renders
6. **Zustand** manages client-only UI state (glass window positions, theme, sidebar)

---

## Patterns to Follow

### Pattern 1: Server Function with Auth Guard

**What:** Every server function validates auth before touching data.
**When:** All authenticated routes and data fetches.
```typescript
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

const getOrders = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ status: z.enum(['active', 'completed']) }))
  .handler(async ({ input, context }) => {
    const supabase = createServerClient(context)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    return supabase
      .from('orders')
      .select('*')
      .eq('status', input.status)
  })
```

### Pattern 2: TanStack Query SSR Hydration

**What:** Data fetched on server is automatically available on client without refetch.
**When:** Every page with server-rendered data.
```typescript
// In route loader
export const Route = createFileRoute('/orders')({
  loader: ({ context }) => context.queryClient.ensureQueryData(ordersQueryOptions()),
})
```

### Pattern 3: Zustand Store with SSR Safety

**What:** Client state that survives glass window swaps but doesn't cause hydration mismatch.
**When:** UI state (active module, theme, sidebar, window positions).
```typescript
const useModuleStore = create<ModuleState>()(
  persist(
    (set) => ({ activeModule: null, setActive: (m) => set({ activeModule: m }) }),
    { name: 'module-state', skipHydration: true }
  )
)
// In component useEffect: useModuleStore.persist.rehydrate()
```

### Pattern 4: React Aria + Tailwind v4 Component

**What:** Accessible, RTL-ready component with Tailwind styling.
**When:** Every interactive UI element.
```typescript
import { Button } from 'react-aria-components'

function GlassButton({ children, ...props }) {
  return (
    <Button
      className="rounded-lg bg-white/80 backdrop-blur-sm px-4 py-2
                 pressed:scale-[0.98] focus-visible:ring-2 focus-visible:ring-blue-600
                 text-sm font-medium text-slate-900"
      {...props}
    >
      {children}
    </Button>
  )
}
```

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Direct Supabase Client on Server Without Hyperdrive

**What:** Creating a new Supabase client per request without connection pooling.
**Why bad:** Each Worker invocation opens a new TCP connection. At scale, this exhausts Supabase connection limits.
**Instead:** Use Cloudflare Hyperdrive for read queries (cached connections). Direct client only for writes and auth.

### Anti-Pattern 2: Zustand for Server-Fetched Data

**What:** Putting API response data in Zustand stores.
**Why bad:** Duplicates TanStack Query's job. Loses caching, deduplication, background refetch, optimistic updates.
**Instead:** TanStack Query for all server data. Zustand only for client-only UI state.

### Anti-Pattern 3: Global CSS Imports for Component Styles

**What:** Creating `.css` files per component with custom classes.
**Why bad:** Defeats Tailwind's utility-first model. Causes specificity conflicts. Harder to maintain RTL.
**Instead:** Tailwind utilities directly on elements. `clsx` + `tailwind-merge` for conditional classes. `class-variance-authority` for variant patterns.

### Anti-Pattern 4: Dashboard Layout in Internal Platform

**What:** Traditional sidebar + header + breadcrumb + content area layout.
**Why bad:** Violates spatial glass philosophy. The internal platform is a canvas with floating glass windows, not a dashboard.
**Instead:** Empty canvas. Icon strip (not sidebar). Glass windows float. Keyboard shortcuts for navigation. Command palette for search.

---

## Scalability Considerations

| Concern | At 100 users | At 10K users | At 1M users |
|---------|--------------|--------------|-------------|
| SSR latency | Cloudflare Workers, ~0ms cold start | Same, auto-scales | Same, edge caching for static |
| DB connections | Direct Supabase client | Hyperdrive pooling required | Hyperdrive + read replicas |
| Realtime | Supabase Realtime, all channels | Channel-per-entity, not broadcast | Topic-based + Durable Objects |
| AI requests | Direct API calls | AI Gateway with rate limiting | AI Gateway + queue + fallback chain |
| Static assets | R2 direct | R2 + Cloudflare CDN | R2 + CDN + image optimization |
| Offline (driver) | PowerSync basic | PowerSync with selective sync | PowerSync + regional sync servers |

---

## Sources

- [TanStack Start Cloudflare Workers Guide](https://developers.cloudflare.com/workers/framework-guides/web-apps/tanstack-start/)
- [Supabase + Cloudflare Integration](https://supabase.com/partners/integrations/cloudflare-workers)
- [Cloudflare Hyperdrive + Supabase](https://developers.cloudflare.com/hyperdrive/examples/connect-to-postgres/postgres-database-providers/supabase/)
- Architecture derived from PROJECT.md, GSD.md, and STACK-DECISION.md
