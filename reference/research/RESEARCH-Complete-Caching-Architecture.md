> ⚠️ **REFERENCE DOCUMENT — NOT THE SOURCE OF TRUTH**
> This file was written during the research phase and may contain outdated decisions, US-centric references, or superseded technical choices.
> **Always defer to `essential/RESEARCH.md` for current decisions.**
> Key changes since this file was written: TanStack Start (not Next.js), Capacitor (not Expo), React Aria (not shadcn), Egyptian law (not US FMCSA), EGP (not USD), dual auth pools, no online payments, no mobile wallets, spatial glass UI (not traditional dashboards).

# HyperQuote Complete Caching Architecture

## Multi-App B2B Logistics Platform on Cloudflare Workers + Supabase

**Platform:** 5 apps on subdomains (internal ops, customer portal, supplier portal, driver app, admin), all hitting the same Supabase database via Cloudflare Workers API layer.

---

## 1. Cloudflare Caching Layers — Full Inventory

### Layer 1: CDN Cache (Automatic)
- **What it is:** Cloudflare's default edge cache for static assets (HTML, CSS, JS, images, fonts).
- **Cost:** Free — included with any Cloudflare plan.
- **Latency:** Sub-millisecond for cached assets at the nearest PoP.
- **When to use:** All static assets, public pages, product images, PDFs.
- **TTL control:** Via `Cache-Control` headers or Cache Rules in the dashboard.
- **Limitation:** Only caches GET requests by default. Does not cache API responses unless explicitly configured via Workers or Cache Rules.

### Layer 2: Workers Cache API (Per-Worker, Per-PoP)
- **What it is:** Programmatic cache within a Worker. You call `caches.default.put()` and `caches.default.match()` to store/retrieve arbitrary Response objects.
- **Cost:** Free — included with Workers plan. No additional per-operation charges. Requests still count toward your Workers request quota.
- **Latency:** Sub-millisecond reads from the local PoP cache.
- **When to use:** Caching Supabase API responses at the edge (product catalog, reference data, supplier stock snapshots).
- **Limitation:** Cache is per-PoP (not global). A `cache.delete()` only purges locally. Use Cache Tags for zone-wide purging. Does NOT support `stale-while-revalidate` or `stale-if-error` directives.
- **Consistency model:** Eventually consistent across PoPs. Different users at different PoPs may see slightly different cached data until TTL expires or explicit purge propagates.

### Layer 3: Workers KV (Global Key-Value Store)
- **What it is:** Eventually consistent, globally replicated key-value store optimized for read-heavy workloads.
- **Cost (Paid plan included allowances, then overages):**
  - Reads: $0.50 per million operations
  - Writes/Lists/Deletes: $5.00 per million operations
  - Storage: $0.50 per GB-month
  - Free tier: 100K reads/day, 1K writes/day, 1 GB storage
- **Latency:** 500us-10ms for hot keys; up to 60 seconds propagation for writes globally.
- **When to use:** Session data, JWKS caching, feature flags, white-label brand config, tenant margin rules, API keys. Read-heavy, write-light data.
- **Limitation:** Max 1 write/sec per unique key. Not suitable for frequently-changing data. Eventually consistent (up to 60s lag).

### Layer 4: D1 (Edge SQLite)
- **What it is:** Serverless SQLite database at the edge with automatic global read replicas.
- **Cost:**
  - Reads: $0.75 per million rows read
  - Writes: $1.00 per million rows written
  - Storage: $0.75 per GB-month
  - Free tier: 5M rows read/day, 100K rows written/day, 5 GB storage
- **Latency:** Sub-10ms for reads from nearest replica.
- **When to use:** Edge-local structured data that benefits from SQL queries — feature flags, tenant configuration, product catalog snapshots, rate limiting counters, routing rules.
- **Limitation:** 10 GB max per database. Not a replacement for Supabase as primary DB. Best for read-heavy auxiliary data.

### Layer 5: Durable Objects (Stateful Singleton)
- **What it is:** Single-threaded, globally-unique objects with transactional storage. Strong consistency guaranteed.
- **Cost:**
  - Requests: $0.15 per million (WebSocket messages at 20:1 ratio)
  - Duration: $12.50 per million GB-seconds
  - Storage: Pricing TBD (SQLite backend billing started Jan 2026)
- **Latency:** Single-digit milliseconds for co-located requests; higher if routed globally to the DO's location.
- **When to use:** Real-time coordination (chat rooms, live order tracking rooms, collaborative editing), rate limiters, distributed locks, WebSocket hubs.
- **Limitation:** Single-threaded execution. Not a cache layer per se — use for stateful coordination, not general caching.

### Layer 6: Hyperdrive (Database Accelerator)
- **What it is:** Connection pooler + query cache for PostgreSQL/MySQL databases. Sits between Workers and Supabase.
- **Cost:** Free — included with Workers Paid plan. No additional charges.
- **Default caching:** `max_age: 60s`, `stale_while_revalidate: 15s`.
- **What it caches:** Non-mutating SELECT queries automatically. Mutating queries (INSERT, UPDATE, DELETE) and queries using volatile functions are never cached.
- **Configuration:** Per-Hyperdrive config via Wrangler CLI. Can set `--max-age` (max 3600s / 1 hour) and `--caching-disabled true` to disable.
- **When to use:** All Supabase reads from Workers. Reduces round-trip latency and connection overhead.
- **Limitation:** Cannot disable caching per-query at runtime (only per-Hyperdrive config). Must use direct Supabase connection (not the JS client) via `pg` or `postgres.js` driver.

### Layer 7: R2 (Object Storage + CDN)
- **What it is:** S3-compatible object storage with zero egress fees.
- **Cost:**
  - Storage: $0.015 per GB-month
  - Class A ops (writes): $4.50 per million
  - Class B ops (reads): $0.36 per million
  - Egress: FREE
  - Free tier: 10 GB storage, 1M Class A, 10M Class B per month
- **When to use:** Product images, invoice PDFs, BOL documents, brand assets (logos, fonts), driver photos, POD images.
- **CDN integration:** Enable managed public access on R2 bucket, set `Cache-Control` headers per object. Cloudflare CDN automatically caches at the edge.

---

## 2. TanStack Query Client-Side Caching Configuration

### Global Defaults for B2B Logistics

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000,       // 2 minutes — sensible B2B default
      gcTime: 10 * 60 * 1000,          // 10 minutes — keep in memory for back-nav
      refetchOnWindowFocus: false,      // B2B users tab-switch constantly; don't spam
      refetchOnReconnect: true,         // Critical for driver app going in/out of signal
      retry: 2,                         // Retry failed requests twice
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
    },
  },
});
```

### Per-Data-Type Configuration

| Data Type | staleTime | gcTime | refetchOnWindowFocus | refetchInterval | Rationale |
|-----------|-----------|--------|---------------------|-----------------|-----------|
| **Product catalog** | 5 min | 30 min | false | none | Changes infrequently; supplier updates batch-processed |
| **Product pricing** | 2 min | 10 min | false | none | Margins matter; moderate freshness needed |
| **Supplier stock levels** | 30 sec | 5 min | true | 60s | Stock can change with orders; needs near-real-time |
| **Order list / history** | 30 sec | 5 min | true | none | Must reflect new orders quickly |
| **Order detail / status** | 0 (always stale) | 5 min | true | 10s | Critical for ops; supplement with Realtime subscription |
| **Financial data (invoices, credit)** | 0 (always stale) | 5 min | true | none | Accuracy paramount; always fetch fresh |
| **GPS positions** | 0 (always stale) | 0 (no cache) | N/A | N/A | Use WebSocket/Realtime only; never cache |
| **User profile / settings** | 10 min | 30 min | false | none | Rarely changes within a session |
| **Tenant/brand config** | 30 min | 60 min | false | none | Changes via admin; very infrequent |
| **Feature flags** | 5 min | 15 min | false | none | Eventual consistency acceptable |
| **Chat messages** | 0 (always stale) | 0 | N/A | N/A | Real-time via WebSocket only |
| **Warehouse inventory** | 1 min | 5 min | true | 30s | Changes with picks/receipts; needs freshness |
| **Driver route / manifest** | 1 min | 10 min | true | none | Changes on dispatch; supplement with push |
| **Notifications** | 0 (always stale) | 2 min | true | none | Must show new notifications immediately |
| **Reference data (units, categories)** | 60 min | 120 min | false | none | Almost never changes |
| **Address/location lookups** | 24 hr | 24 hr | false | none | Static geographic data |

### Query Key Strategy for Multi-App Consistency

```typescript
// Namespace query keys by entity type for targeted invalidation
const queryKeys = {
  orders: {
    all: ['orders'] as const,
    lists: () => [...queryKeys.orders.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.orders.all, 'detail', id] as const,
  },
  products: {
    all: ['products'] as const,
    catalog: (supplierId: string) => [...queryKeys.products.all, 'catalog', supplierId] as const,
  },
  // ... etc
};

// Invalidate all order queries when Realtime event fires
supabase
  .channel('order-changes')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
  })
  .subscribe();
```

---

## 3. API Response Caching on Workers (Cache API)

### What to Cache at the Edge

```
CACHE (safe, read-heavy, slow-changing):
  - Product catalog listings        → TTL: 5 min, Cache-Tag: products
  - Product detail pages            → TTL: 5 min, Cache-Tag: product:{id}
  - Supplier profiles               → TTL: 10 min, Cache-Tag: supplier:{id}
  - Reference data (units, categories, regions) → TTL: 1 hour, Cache-Tag: reference
  - Static config / feature flags   → TTL: 5 min, Cache-Tag: config
  - Aggregated analytics / reports  → TTL: 15 min, Cache-Tag: analytics
  - Warehouse locations / metadata  → TTL: 30 min, Cache-Tag: warehouses

NEVER CACHE (sensitive, real-time, or user-specific):
  - Order data (creation, status, confirmation)
  - Payment data (invoices, credit limits, balances)
  - GPS / tracking positions
  - Chat messages
  - Authentication tokens / session data
  - User-specific dashboards (unless cache-keyed per user)
  - Credit / financial calculations
  - Real-time stock mutations (POST/PUT/DELETE)
```

### Worker Cache API Implementation Pattern

```typescript
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Only cache GET requests
    if (request.method !== 'GET') {
      return handleRequest(request, env);
    }

    // Check if this route is cacheable
    const cacheConfig = getCacheConfig(url.pathname);
    if (!cacheConfig) {
      return handleRequest(request, env);
    }

    // Try cache first
    const cache = caches.default;
    const cacheKey = new Request(url.toString(), request);
    let response = await cache.match(cacheKey);

    if (response) {
      // Cache HIT — return with header
      response = new Response(response.body, response);
      response.headers.set('X-Cache-Status', 'HIT');
      return response;
    }

    // Cache MISS — fetch from Supabase via Hyperdrive
    response = await handleRequest(request, env);

    if (response.ok) {
      const cachedResponse = new Response(response.body, response);
      cachedResponse.headers.set('Cache-Control', `s-maxage=${cacheConfig.ttl}`);
      cachedResponse.headers.set('Cache-Tag', cacheConfig.tags.join(','));
      cachedResponse.headers.set('X-Cache-Status', 'MISS');

      // Store in cache asynchronously
      ctx.waitUntil(cache.put(cacheKey, cachedResponse.clone()));

      return cachedResponse;
    }

    return response;
  },
};

function getCacheConfig(pathname: string): { ttl: number; tags: string[] } | null {
  if (pathname.startsWith('/api/products'))    return { ttl: 300, tags: ['products'] };
  if (pathname.startsWith('/api/suppliers'))   return { ttl: 600, tags: ['suppliers'] };
  if (pathname.startsWith('/api/reference'))   return { ttl: 3600, tags: ['reference'] };
  if (pathname.startsWith('/api/warehouses'))  return { ttl: 1800, tags: ['warehouses'] };
  if (pathname.startsWith('/api/config'))      return { ttl: 300, tags: ['config'] };
  // Everything else — no caching
  return null;
}
```

---

## 4. Cloudflare KV for Session / Config Data

### What to Store in KV

| Data | Key Pattern | TTL | Write Frequency | Read Frequency | Rationale |
|------|-------------|-----|-----------------|----------------|-----------|
| **JWKS (Supabase JWT verification keys)** | `jwks:supabase` | 1 hour | Rare (key rotation) | Every request | Eliminates round-trip to Supabase for JWT verification |
| **User sessions / tokens** | `session:{sessionId}` | 24 hours | On login/refresh | Every authenticated request | Fast session lookup at edge |
| **Feature flags** | `flags:{tenantId}` | 5 min | On admin change | Every page load | Read-heavy, write-light |
| **White-label brand config** | `brand:{tenantId}` | 1 hour | On admin change | Every page load | Theme colors, logos, fonts per tenant |
| **Tenant margin rules** | `margins:{tenantId}` | 5 min | On pricing admin change | Every price calculation | Critical for quoting accuracy |
| **Rate limit counters** | `ratelimit:{ip}:{endpoint}` | 1 min | Per request | Per request | Note: consider Durable Objects for strict rate limiting |
| **API key → tenant mapping** | `apikey:{hash}` | 1 hour | On key creation | Every API call | Fast API key validation |
| **Supplier → product index** | `supplier_products:{supplierId}` | 10 min | On catalog update | Per catalog browse | Pre-computed product lists |

### KV Cost Estimate

| Scale | Daily Reads | Daily Writes | Monthly Storage | Monthly Cost |
|-------|-------------|--------------|-----------------|--------------|
| 100 users | ~500K | ~5K | 100 MB | ~$0 (free tier) |
| 1,000 users | ~5M | ~50K | 500 MB | ~$2.50 reads + $0.25 storage = ~$3/mo |
| 10,000 users | ~50M | ~500K | 2 GB | ~$25 reads + $1 storage = ~$26/mo |

### KV Consistency Caveat

KV propagation takes up to 60 seconds globally. For the HyperQuote platform:
- **Acceptable for:** Brand config, feature flags, JWKS, reference data.
- **NOT acceptable for:** Session revocation (user logs out but another PoP still sees valid session for up to 60s). Mitigation: use short session TTLs (15 min) and verify JWT expiry server-side as a second check.

---

## 5. Supabase Query Caching

### Does Supabase Have Built-In Query Caching?

**No built-in application-level query cache.** Supabase relies on PostgreSQL's internal caching mechanisms:

- **shared_buffers:** PostgreSQL's buffer cache for frequently-accessed table pages. Supabase manages this automatically based on your plan's allocated RAM. Typically set to 25% of available memory.
- **OS page cache:** Linux filesystem cache acts as a second layer, caching disk reads in memory.
- **pg_stat_statements:** Not a cache, but a query performance monitoring extension. Useful for identifying slow queries that would benefit from caching elsewhere.
- **Prepared statement caching:** PostgreSQL caches query plans for prepared statements, reducing parse/plan overhead.

### Supabase + Hyperdrive (Recommended Stack)

```
Client → Cloudflare Worker → Hyperdrive → Supabase PostgreSQL
                                  ↑
                         Query cache here
                         (60s max_age, 15s SWR)
```

**Configuration for HyperQuote:**

```bash
# Create Hyperdrive config for Supabase
wrangler hyperdrive create hyperquote-db \
  --connection-string="postgresql://user:pass@db.xxx.supabase.co:5432/postgres" \
  --max-age=60 \
  --swr=15

# For real-time-sensitive queries (orders, payments), create a second config
wrangler hyperdrive create hyperquote-db-nocache \
  --connection-string="postgresql://user:pass@db.xxx.supabase.co:5432/postgres" \
  --caching-disabled=true
```

**Dual Hyperdrive pattern:** Use the cached config for product/catalog/reference queries and the no-cache config for order/payment/financial queries where stale data is unacceptable.

### Supabase Connection Pooling (Supavisor)

Supabase includes Supavisor, a cloud-native Elixir-based connection pooler:
- **Transaction mode (port 6543):** Shares connections across clients; releases connection after each transaction.
- **Session mode (port 5432):** Dedicated connection per client session.

When using Hyperdrive, bypass Supavisor and connect directly to PostgreSQL (port 5432), as Hyperdrive provides its own connection pooling. Do NOT double-pool through both Supavisor and Hyperdrive.

### Supabase Pricing Note

Supabase does NOT charge per-query. Costs are based on compute (plan tier), storage, bandwidth, and MAUs. This means caching at the edge reduces latency and Supabase compute load, but does not directly reduce Supabase billing per-read the way Firebase would.

The primary cost benefit of caching is:
1. Reduced Supabase compute utilization (staying within plan limits)
2. Reduced egress bandwidth ($0.09/GB uncached vs $0.03/GB cached)
3. Reduced connection count pressure on PostgreSQL

---

## 6. AI Response Caching (Cloudflare AI Gateway)

### When AI Caching Makes Sense for HyperQuote

| Query Type | Cache? | TTL | Rationale |
|------------|--------|-----|-----------|
| "What's my order status for order #12345?" | NO | N/A | User-specific, time-sensitive data |
| "What are your delivery options to Cape Town?" | YES | 24 hr | Common question, static answer |
| "Explain your return policy" | YES | 7 days | Static business rules |
| "Summarize my last 5 orders" | NO | N/A | User-specific, dynamic data |
| "What products do you carry in category X?" | YES | 1 hr | Catalog-based, changes with catalog |
| "Help me fill out this customs form" | YES | 7 days | Static instructional content |
| Product description generation | YES | 24 hr | Same product = same description |
| Quote explanation / breakdown | NO | N/A | Dynamic per-quote calculations |
| Chat conversation responses | NO | N/A | Contextual, never identical |

### Configuration

```typescript
// AI Gateway request with caching headers
const response = await fetch(`https://gateway.ai.cloudflare.com/v1/${accountId}/${gatewayId}/openai/chat/completions`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
    'Content-Type': 'application/json',
    // Cache for 1 hour for common queries
    'cf-aig-cache-ttl': '3600',
    // Custom cache key for deterministic matching
    'cf-aig-cache-key': `product-desc:${productId}`,
  },
  body: JSON.stringify({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
  }),
});

// Check cache status
const cacheStatus = response.headers.get('cf-aig-cache-status'); // 'HIT' or 'MISS'
```

### Cache Key Strategy for AI

- **Static knowledge queries:** Use a normalized version of the question as cache key (lowercase, trimmed, common synonyms resolved).
- **Entity-specific queries:** Use `entity_type:entity_id:query_type` as cache key.
- **User-specific queries:** Include NO user context in cache key — these should use `cf-aig-skip-cache: true`.

### Limitations

- Only exact-match caching (no semantic similarity matching yet — planned by Cloudflare).
- Minimum TTL: 60 seconds. Maximum: 1 month.
- Cache is not shared across different AI Gateway instances.

---

## 7. Static Asset Caching

### Asset Types and Cache Strategy

| Asset Type | Storage | Cache-Control Header | Cache Busting | CDN TTL |
|------------|---------|---------------------|---------------|---------|
| **App JS/CSS bundles** | Cloudflare Pages / Workers Static Assets | `public, max-age=31536000, immutable` | Content-hash in filename (Vite default) | 1 year |
| **Product images** | R2 | `public, max-age=86400, s-maxage=604800` | URL versioning: `/img/{hash}.webp` | 7 days edge, 1 day browser |
| **Invoice PDFs** | R2 | `private, no-store` (authenticated download) | N/A — always fresh | Not cached (sensitive) |
| **BOL / shipping docs** | R2 | `private, max-age=3600` | N/A — immutable once generated | 1 hour browser only |
| **Brand logos / fonts** | R2 | `public, max-age=2592000, immutable` | Filename hash on upload | 30 days |
| **POD photos (proof of delivery)** | R2 | `private, max-age=86400` | Immutable once uploaded | 1 day browser (auth required) |
| **Driver profile photos** | R2 | `public, max-age=604800` | URL versioning on update | 7 days |
| **Email templates** | R2 / KV | `private, max-age=300` | KV key versioning | 5 min |

### R2 + CDN Configuration

```
R2 Bucket (hyperquote-assets)
  ├── products/          → Public access, CDN cached
  ├── brands/{tenantId}/ → Public access, CDN cached
  ├── documents/         → Private, signed URLs, NOT CDN cached
  ├── pods/              → Private, signed URLs, NOT CDN cached
  └── static/            → Public access, immutable, CDN cached
```

### Cache Busting When Supplier Updates a Product Image

```typescript
// On product image update:
// 1. Upload new image to R2 with content-hash filename
const hash = await crypto.subtle.digest('SHA-256', imageBuffer);
const hashHex = [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 12);
const newKey = `products/${productId}/${hashHex}.webp`;
await env.R2_BUCKET.put(newKey, imageBuffer);

// 2. Update product record in Supabase with new image URL
await supabase.from('products').update({ image_url: newKey }).eq('id', productId);

// 3. Old URL naturally expires from CDN cache (TTL-based)
// 4. New URL is a different path — no cache invalidation needed
// This is the "cache-busting via content-addressable storage" pattern
```

### Purge API for Urgent Updates

```typescript
// If you need to immediately purge a cached asset:
await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${cfApiToken}` },
  body: JSON.stringify({
    files: [`https://assets.hyperquote.co/products/${productId}/old-hash.webp`],
  }),
});
```

---

## 8. Real-Time Data — What Bypasses ALL Caches

### Data That Must Always Be Fresh

| Data | Transport | Why No Cache |
|------|-----------|-------------|
| **GPS positions** | Supabase Realtime (WebSocket) or direct MQTT/WebSocket | Positions are ephemeral; caching a location that's 30 seconds old defeats the purpose |
| **Live order status updates** | Supabase Realtime (postgres_changes) | Operations depend on immediate status visibility |
| **Chat / messaging** | Supabase Realtime (broadcast) or Durable Objects WebSocket | Messages must appear instantly |
| **WebSocket subscriptions** | Direct WebSocket pass-through | Bidirectional; caching is nonsensical |
| **Payment confirmations** | Direct API call, no cache | Financial accuracy; no stale data |
| **Auction / bidding data** | Durable Objects (strong consistency) | Requires serializable consistency |

### How to Ensure Caches Don't Interfere

```typescript
// 1. Worker routing: bypass cache for real-time endpoints
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    // WebSocket upgrade — never cache
    if (request.headers.get('Upgrade') === 'websocket') {
      return handleWebSocket(request, env);
    }

    // Real-time API paths — never cache
    const noCachePaths = [
      '/api/orders/',       // Order mutations and status
      '/api/payments/',     // All payment operations
      '/api/gps/',          // GPS position updates
      '/api/chat/',         // Chat messages
      '/api/notifications/', // Push notifications
      '/api/auth/',         // Authentication flows
    ];

    if (noCachePaths.some(p => url.pathname.startsWith(p))) {
      const response = await handleRequest(request, env);
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
      response.headers.set('CDN-Cache-Control', 'no-store');
      return response;
    }

    // Cacheable paths — apply cache logic
    return handleCacheableRequest(request, env, ctx);
  },
};
```

```typescript
// 2. Supabase Realtime for live updates (client-side)
// GPS tracking channel
const gpsChannel = supabase
  .channel('gps-tracking')
  .on('broadcast', { event: 'position' }, (payload) => {
    updateDriverPosition(payload.driver_id, payload.lat, payload.lng);
  })
  .subscribe();

// Order status changes via postgres_changes
const orderChannel = supabase
  .channel('order-updates')
  .on('postgres_changes',
    { event: 'UPDATE', schema: 'public', table: 'orders', filter: `customer_id=eq.${customerId}` },
    (payload) => {
      // Invalidate TanStack Query cache AND update UI
      queryClient.setQueryData(
        ['orders', 'detail', payload.new.id],
        payload.new
      );
    }
  )
  .subscribe();
```

```typescript
// 3. Hyperdrive: use the no-cache config for real-time queries
// In wrangler.toml:
// [[hyperdrive]]
// binding = "DB_CACHED"
// id = "xxx-cached-config"
//
// [[hyperdrive]]
// binding = "DB_REALTIME"
// id = "xxx-nocache-config"

async function getOrderStatus(orderId: string, env: Env) {
  // Use uncached Hyperdrive binding for order queries
  const client = new Client(env.DB_REALTIME.connectionString);
  await client.connect();
  const result = await client.query('SELECT * FROM orders WHERE id = $1', [orderId]);
  await client.end();
  return result.rows[0];
}
```

---

## 9. Cache Invalidation Strategy

### The Fundamental Approach: Hybrid (Event-Driven + TTL)

For HyperQuote, use a two-pronged strategy:
1. **TTL-based expiry** as the baseline safety net (data is never stale longer than TTL).
2. **Event-driven invalidation** for critical paths where staleness is unacceptable.

### Event-Driven Invalidation via Supabase Realtime

```
Supabase DB Change → PostgreSQL NOTIFY → Supabase Realtime
    → Cloudflare Worker (webhook/listener) → Purge Cache API + Invalidate KV
    → Client (Realtime subscription) → Invalidate TanStack Query cache
```

#### Server-Side: Worker Cache Purge on DB Change

```typescript
// Dedicated "cache-invalidation" Worker that subscribes to Supabase Realtime
// OR receives webhook calls from a Supabase Edge Function triggered by DB changes

export async function handleDatabaseChange(event: {
  table: string;
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  record: any;
  old_record?: any;
}) {
  const cache = caches.default;

  switch (event.table) {
    case 'products':
      // Purge product cache
      await cache.delete(new Request(`https://api.hyperquote.co/api/products/${event.record.id}`));
      await cache.delete(new Request(`https://api.hyperquote.co/api/products`));
      // Also purge supplier's catalog cache
      await cache.delete(new Request(
        `https://api.hyperquote.co/api/products?supplier_id=${event.record.supplier_id}`
      ));
      break;

    case 'suppliers':
      await cache.delete(new Request(`https://api.hyperquote.co/api/suppliers/${event.record.id}`));
      break;

    case 'feature_flags':
      // Update KV directly
      await env.KV.put(
        `flags:${event.record.tenant_id}`,
        JSON.stringify(event.record),
        { expirationTtl: 300 }
      );
      break;

    case 'brand_config':
      await env.KV.put(
        `brand:${event.record.tenant_id}`,
        JSON.stringify(event.record),
        { expirationTtl: 3600 }
      );
      break;
  }
}
```

#### Alternative: Supabase Database Webhook → Worker

```sql
-- In Supabase: create a trigger that calls a webhook on product changes
CREATE OR REPLACE FUNCTION notify_cache_invalidation()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://api.hyperquote.co/internal/cache-invalidate',
    headers := '{"Authorization": "Bearer <internal-secret>"}'::jsonb,
    body := jsonb_build_object(
      'table', TG_TABLE_NAME,
      'type', TG_OP,
      'record', row_to_json(NEW),
      'old_record', CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER product_cache_invalidation
  AFTER INSERT OR UPDATE OR DELETE ON products
  FOR EACH ROW EXECUTE FUNCTION notify_cache_invalidation();
```

### Invalidation Matrix

| Data Change | Cache API Purge | KV Update | TanStack Invalidation | Hyperdrive | Method |
|-------------|----------------|-----------|----------------------|------------|--------|
| Product updated | Purge `/api/products/*` | N/A | `invalidateQueries(['products'])` | Auto-expires (60s) | Event-driven + TTL |
| Price changed | Purge product pages | Update `margins:{tenant}` | `invalidateQueries(['products'])` | Auto-expires | Event-driven |
| Order confirmed | N/A (not cached) | N/A | `setQueryData(['orders', id])` | N/A (not cached) | Realtime push |
| Feature flag toggled | Purge `/api/config` | Update `flags:{tenant}` | `invalidateQueries(['config'])` | N/A | Event-driven |
| Brand config changed | N/A | Update `brand:{tenant}` | `invalidateQueries(['brand'])` | N/A | Event-driven |
| Supplier stock update | Purge supplier catalog | N/A | `invalidateQueries(['products', supplier])` | Auto-expires | TTL (30s staleTime) |
| New warehouse added | Purge `/api/warehouses` | N/A | `invalidateQueries(['warehouses'])` | Auto-expires | Event-driven |
| Reference data change | Purge `/api/reference` | N/A | `invalidateQueries(['reference'])` | Auto-expires | Event-driven (rare) |

---

## 10. Multi-App Cache Consistency

### The Problem

When the internal ops app confirms an order, the customer portal must see the change. If both apps maintain independent caches, they can be out of sync.

### Solution: Shared Cache Layer + Event-Driven Invalidation

```
                    ┌─────────────────────────────────────┐
                    │      Supabase (Single Source of      │
                    │           Truth Database)            │
                    └───────┬────────────┬────────────┬───┘
                            │            │            │
                    Realtime │    Realtime│    Realtime│
                            │            │            │
           ┌────────────────▼──┐  ┌──────▼────────┐  ▼
           │  Internal App     │  │ Customer Portal│  Driver App
           │  (ops.hyperquote) │  │ (app.hyperquote)│ (driver.hyperquote)
           └────────┬──────────┘  └──────┬─────────┘
                    │                     │
                    │   SAME Worker       │
                    │   API Layer         │
                    ▼                     ▼
           ┌──────────────────────────────────────────┐
           │   Cloudflare Workers API (api.hyperquote) │
           │   ┌─────────────────────────────────────┐ │
           │   │  SHARED Cache API (per-PoP)         │ │
           │   │  SHARED Hyperdrive (query cache)    │ │
           │   │  SHARED KV (config/sessions)        │ │
           │   └─────────────────────────────────────┘ │
           └──────────────────────────────────────────┘
```

### Key Architecture Decision: Single API Domain

All 5 apps call the SAME `api.hyperquote.co` Worker. This means:
- **Cache API is shared** — when the internal app writes an order and the Worker purges the cache, the customer portal's next request (to the same Worker domain) gets fresh data.
- **Hyperdrive is shared** — the same query cache serves all apps.
- **KV is shared** — all apps read from the same KV namespace.

### Cross-App Invalidation Flow

```
1. Internal ops user confirms order #123
2. Worker receives POST /api/orders/123/confirm
3. Worker writes to Supabase (via uncached Hyperdrive)
4. Worker purges Cache API for order-related endpoints (if any were cached)
5. Supabase Realtime fires postgres_changes event
6. Customer portal (subscribed via Realtime) receives event
7. Customer portal's TanStack Query invalidates ['orders', '123']
8. Customer portal UI updates immediately
```

### For Cross-PoP Consistency (When Users Are Geographically Distributed)

If the internal ops team is in Johannesburg and the customer is in Cape Town (different Cloudflare PoPs):

- **Cache API purge is local** — purging at the JHB PoP doesn't purge Cape Town.
- **Mitigation:** Keep TTLs short (30-60s) for order-adjacent data so Cape Town gets fresh data within a minute.
- **Better mitigation:** Don't cache order data at all on the Worker Cache API. Let TanStack Query + Supabase Realtime handle order freshness entirely on the client.
- **KV propagation:** Up to 60s lag. Acceptable for config; not for orders (which shouldn't be in KV anyway).

### Rule of Thumb

```
Data that crosses app boundaries (orders, inventory, status):
  → Do NOT cache on Workers Cache API
  → Use Supabase Realtime for cross-app push
  → Use TanStack Query with staleTime: 0 and Realtime-driven invalidation

Data that is app-independent (products, config, reference):
  → Safe to cache on Workers Cache API with reasonable TTLs
  → Event-driven invalidation for changes
```

---

## 11. Offline Caching for Driver App

### PowerSync + SQLite Architecture

```
┌─────────────────────────────────────────────┐
│  Driver Mobile App (PWA or React Native)    │
│  ┌────────────────────────────────────────┐ │
│  │  PowerSync Client SDK                  │ │
│  │  ┌──────────────┐  ┌────────────────┐  │ │
│  │  │ SQLite DB    │  │ Sync Engine    │  │ │
│  │  │ (local)      │←→│ (delta sync)   │  │ │
│  │  └──────────────┘  └────────┬───────┘  │ │
│  └─────────────────────────────┼──────────┘ │
│  ┌─────────────────────────────┼──────────┐ │
│  │  Service Worker (PWA)       │          │ │
│  │  ├ App shell (cached)       │          │ │
│  │  ├ Static assets (cached)   │          │ │
│  │  └ API fallback (offline)   │          │ │
│  └─────────────────────────────┼──────────┘ │
└────────────────────────────────┼────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │  PowerSync Service      │
                    │  (cloud-hosted)         │
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │  Supabase PostgreSQL    │
                    └─────────────────────────┘
```

### What to Pre-Cache for Offline (Driver App)

| Data | Sync Strategy | Estimated Size | Priority |
|------|---------------|----------------|----------|
| **Today's delivery manifest** | Pre-Synced Bucket (always available) | ~50 KB per route | CRITICAL |
| **Customer delivery addresses** | Pre-Synced (for today's route) | ~20 KB per route | CRITICAL |
| **Product catalog (relevant items)** | Pre-Synced (items on manifest) | ~100 KB | HIGH |
| **Customer contact info** | Pre-Synced (today's deliveries) | ~10 KB | HIGH |
| **Delivery instructions / notes** | Pre-Synced (today's route) | ~5 KB | HIGH |
| **Proof-of-delivery form templates** | Service Worker cache | ~50 KB | HIGH |
| **Map tiles (offline area)** | Service Worker / map SDK cache | 10-50 MB | MEDIUM |
| **Vehicle inspection checklists** | Pre-Synced | ~5 KB | MEDIUM |
| **Company policies / procedures** | Service Worker cache | ~200 KB | LOW |
| **Historical delivery data** | On-Demand Bucket (fetch if needed) | Variable | LOW |

### Offline Write Queue (Critical for Drivers)

```typescript
// PowerSync handles offline writes automatically:
// 1. Driver marks delivery as "completed" while offline
// 2. PowerSync writes to local SQLite
// 3. Write is queued in PowerSync's upload queue
// 4. When connectivity returns, PowerSync syncs to Supabase
// 5. Conflict resolution: last-write-wins or custom merge logic

// Sync Rules (PowerSync config) — only sync relevant data:
const syncRules = {
  buckets: [
    {
      name: 'driver_manifest',
      parameters: ['driver_id'],
      data: [
        { table: 'deliveries', filter: 'driver_id = :driver_id AND date = CURRENT_DATE' },
        { table: 'customers', filter: 'id IN (SELECT customer_id FROM deliveries WHERE driver_id = :driver_id AND date = CURRENT_DATE)' },
        { table: 'products', filter: 'id IN (SELECT product_id FROM delivery_items di JOIN deliveries d ON di.delivery_id = d.id WHERE d.driver_id = :driver_id AND d.date = CURRENT_DATE)' },
      ],
    },
  ],
};
```

### Cache Size Limits on Mobile

| Platform | Practical Limit | Notes |
|----------|----------------|-------|
| **iOS Safari (PWA)** | ~50 MB Cache API, ~500 MB IndexedDB/OPFS | iOS aggressively evicts after 7 days of non-use |
| **Android Chrome (PWA)** | ~6% of free disk space (Cache API + Storage) | Typically 200 MB-1 GB; persisted if granted |
| **React Native (SQLite)** | Limited only by device storage | Typically 50-500 MB is reasonable |
| **OPFS (Origin Private File System)** | No hard limit; quota-based | PowerSync uses this for web; significant performance gains |

### Service Worker Cache Strategy for PWA

```typescript
// sw.ts — Service Worker for driver app
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';

// Pre-cache app shell (Vite build output)
precacheAndRoute(self.__WB_MANIFEST);

// Static assets — Cache First (immutable, hashed filenames)
registerRoute(
  ({ request }) => request.destination === 'image' ||
                   request.destination === 'font' ||
                   request.destination === 'style' ||
                   request.destination === 'script',
  new CacheFirst({
    cacheName: 'static-assets',
    plugins: [{ maxEntries: 200, maxAgeSeconds: 30 * 24 * 60 * 60 }],
  })
);

// API calls — Network First (try network, fall back to cache)
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'api-cache',
    networkTimeoutSeconds: 5,
    plugins: [{ maxEntries: 100, maxAgeSeconds: 24 * 60 * 60 }],
  })
);

// Map tiles — Stale While Revalidate
registerRoute(
  ({ url }) => url.hostname.includes('tile') || url.pathname.includes('/tiles/'),
  new StaleWhileRevalidate({
    cacheName: 'map-tiles',
    plugins: [{ maxEntries: 500, maxAgeSeconds: 7 * 24 * 60 * 60 }],
  })
);
```

---

## 12. Cost Optimization — Caching ROI by Scale

### Supabase Cost Model (Reminder)

Supabase does NOT charge per-query. Costs are:
- **Pro plan:** $25/mo (8 GB DB, 100K MAUs, 100 GB storage, 50 GB bandwidth)
- **Team plan:** $599/mo (higher limits, priority support)
- **Egress overage:** $0.09/GB (uncached), $0.03/GB (cached via CDN)
- **Storage overage:** $0.021/GB per month

### Cloudflare Cost Model (Workers Paid: $5/mo base)

| Service | Included | Overage |
|---------|----------|---------|
| Workers requests | 10M/mo | $0.30/million |
| Workers duration | 30M CPU-ms/mo | $0.02/million ms |
| KV reads | 10M/mo | $0.50/million |
| KV writes | 1M/mo | $5.00/million |
| KV storage | 1 GB | $0.50/GB |
| D1 reads | 25B rows/mo | $0.001/million rows |
| D1 writes | 50M rows/mo | $1.00/million rows |
| D1 storage | 5 GB | $0.75/GB |
| R2 storage | 10 GB | $0.015/GB |
| R2 Class A | 1M/mo | $4.50/million |
| R2 Class B | 10M/mo | $0.36/million |
| Hyperdrive | Included | Free |
| Cache API | Included | Free |
| AI Gateway | Included | Free (pay provider) |

### Cost at Scale

#### 100 Users (Startup Phase)

| Component | Without Caching | With Caching | Savings |
|-----------|----------------|-------------|---------|
| Supabase | $25/mo (Pro) | $25/mo (Pro) | $0 (within plan) |
| Cloudflare Workers | $5/mo | $5/mo | $0 (within free tier) |
| KV | $0 (free tier) | $0 (free tier) | $0 |
| R2 | $0 (free tier) | $0 (free tier) | $0 |
| Supabase egress | ~$2/mo | ~$0.70/mo | $1.30/mo |
| **Total** | **~$32/mo** | **~$31/mo** | ~$1/mo |

**At 100 users, caching is about latency and UX, not cost savings.** Implement it for performance.

#### 1,000 Users (Growth Phase)

| Component | Without Caching | With Caching | Savings |
|-----------|----------------|-------------|---------|
| Supabase | $25-599/mo | $25-599/mo | Stays in lower plan longer |
| Workers requests | ~$5 + $3 overage | ~$5 + $3 | $0 (requests still hit Worker) |
| KV | N/A | ~$3/mo | N/A |
| R2 | ~$2/mo | ~$2/mo | $0 |
| Supabase egress | ~$20/mo | ~$7/mo | $13/mo |
| Supabase compute | May need upgrade | Stays on Pro longer | $0-574/mo |
| **Total** | **~$55-650/mo** | **~$42-640/mo** | ~$10-15/mo direct |

**At 1,000 users, caching keeps you on the lower Supabase plan longer** by reducing DB connection pressure and compute utilization. The real savings is delaying the jump from Pro ($25) to Team ($599).

#### 10,000 Users (Scale Phase)

| Component | Without Caching | With Caching | Savings |
|-----------|----------------|-------------|---------|
| Supabase | $599/mo+ (Team) | $599/mo (Team) | Avoids custom plan |
| Workers requests | ~$5 + $30 | ~$5 + $30 | $0 |
| KV | N/A | ~$26/mo | N/A |
| R2 | ~$15/mo | ~$15/mo | $0 |
| Supabase egress | ~$200/mo | ~$70/mo | $130/mo |
| Supabase compute | May need custom | Stays on Team | $0-1000+/mo |
| AI provider costs | ~$500/mo | ~$300/mo (40% cache hit) | $200/mo |
| **Total** | **~$1,350+/mo** | **~$745/mo** | ~$600+/mo |

**At 10,000 users, caching delivers significant savings** primarily through:
1. Reduced AI provider costs (AI Gateway caching)
2. Reduced Supabase egress
3. Delayed need for custom Supabase plan
4. Better P95 latency (competitive advantage)

---

## 13. Complete Caching Architecture — Summary Matrix

### Every Data Type, Where It's Cached, For How Long

| Data Type | Client (TanStack) | Worker Cache API | Workers KV | Hyperdrive | D1 | PowerSync (Offline) | Real-time |
|-----------|-------------------|-----------------|------------|------------|-----|-------------------|-----------|
| **Product catalog** | stale: 5m, gc: 30m | TTL: 5m, tag: products | -- | 60s cache | Optional mirror | Pre-synced (manifest items) | -- |
| **Product pricing** | stale: 2m, gc: 10m | TTL: 5m, tag: prices | Margin rules per tenant | 60s cache | -- | Pre-synced | -- |
| **Supplier stock levels** | stale: 30s, gc: 5m | -- (too volatile) | -- | 60s cache | -- | -- | Realtime sub |
| **Order list** | stale: 30s, gc: 5m | NEVER | -- | NEVER (use no-cache HD) | -- | Today's manifest only | Realtime sub |
| **Order detail / status** | stale: 0, gc: 5m | NEVER | -- | NEVER | -- | Active deliveries | Realtime sub |
| **Financial / payments** | stale: 0, gc: 5m | NEVER | -- | NEVER | -- | -- | -- |
| **GPS positions** | NO CACHE | NEVER | -- | -- | -- | -- | WebSocket only |
| **Chat messages** | NO CACHE | NEVER | -- | -- | -- | Queue offline msgs | WebSocket only |
| **User profile** | stale: 10m, gc: 30m | -- | Session data | 60s cache | -- | -- | -- |
| **Tenant brand config** | stale: 30m, gc: 60m | -- | TTL: 1hr | -- | Optional | -- | -- |
| **Feature flags** | stale: 5m, gc: 15m | TTL: 5m | TTL: 5m | -- | Good fit | -- | -- |
| **JWKS / auth keys** | -- | -- | TTL: 1hr | -- | -- | -- | -- |
| **Reference data** | stale: 60m, gc: 120m | TTL: 1hr | -- | 60s cache | Good fit | Pre-synced | -- |
| **Warehouse metadata** | stale: 5m, gc: 30m | TTL: 30m | -- | 60s cache | -- | -- | -- |
| **Warehouse inventory** | stale: 1m, gc: 5m | -- (too volatile) | -- | 60s cache | -- | -- | Realtime sub |
| **Driver manifest** | stale: 1m, gc: 10m | -- | -- | 60s cache | -- | Pre-synced (critical) | Realtime sub |
| **Notifications** | stale: 0, gc: 2m | NEVER | -- | -- | -- | Queue offline | Realtime sub |
| **Product images** | Browser: 1 day | CDN: 7 days | -- | -- | -- | SW cache (manifest items) | -- |
| **Invoice PDFs** | NO CACHE | NEVER (private) | -- | -- | -- | -- | -- |
| **BOL documents** | Browser: 1hr | NEVER (private) | -- | -- | -- | Pre-synced (today's route) | -- |
| **Brand assets** | Browser: 30 days | CDN: 30 days | -- | -- | -- | SW cache | -- |
| **AI responses (static)** | stale: 1hr, gc: 24hr | AI Gateway: 1hr-7d | -- | -- | -- | -- | -- |
| **AI responses (dynamic)** | NO CACHE | NEVER | -- | -- | -- | -- | -- |

### Cache Invalidation Summary

| Trigger | Invalidation Method | Propagation Time |
|---------|---------------------|-----------------|
| Product update | DB trigger → webhook → Worker purge Cache API + invalidate KV | 1-5 seconds |
| Price change | Same as product + update KV margin rules | 1-5 seconds |
| Order status change | Supabase Realtime → TanStack invalidation (client-side) | <1 second |
| Feature flag toggle | Admin action → KV put (immediate at write PoP, 60s global) | 1-60 seconds |
| Brand config change | Admin action → KV put | 1-60 seconds |
| Stock level change | TTL expiry (no active invalidation — 30s staleTime on client) | 30-90 seconds |
| New supplier onboarded | Webhook → purge supplier/product caches | 1-5 seconds |
| Reference data update | Webhook → purge reference cache (rare event) | 1-5 seconds |
| Product image update | Content-addressable URL (new hash = new URL, no purge needed) | Instant |
| Emergency purge | Cloudflare API zone purge | 30 seconds globally |

---

## 14. Implementation Priority

### Phase 1 (Day 1 — Immediate)
1. **Hyperdrive** — Free, zero-config performance win. Connect Workers to Supabase via Hyperdrive with default 60s cache. Create a second no-cache Hyperdrive for real-time data.
2. **TanStack Query defaults** — Set global staleTime/gcTime per the table above. Add per-query overrides for critical data types.
3. **R2 + Cache-Control headers** — Set proper headers on all static assets. Use content-hash filenames for cache busting.

### Phase 2 (Week 1-2)
4. **Workers KV for JWKS** — Cache Supabase JWT verification keys. Eliminates a round-trip on every authenticated request.
5. **Workers KV for brand/tenant config** — Serve white-label themes from edge.
6. **Supabase Realtime subscriptions** — Set up client-side Realtime channels for orders, inventory, GPS. Wire to TanStack Query invalidation.

### Phase 3 (Week 3-4)
7. **Workers Cache API** — Implement edge caching for product catalog, reference data, supplier profiles.
8. **Cache invalidation webhooks** — Create Supabase DB triggers that call the Worker to purge stale cache entries.
9. **Feature flags in KV** — Move feature flag reads to edge for instant evaluation.

### Phase 4 (Month 2+)
10. **PowerSync for driver app** — Implement offline-first with pre-synced buckets for daily manifests.
11. **AI Gateway caching** — Enable for static knowledge queries, configure per-request TTLs.
12. **D1 for edge reference data** — If reference data queries become a bottleneck, mirror to D1 for sub-10ms SQL queries at edge.

---

## Sources

- [Cloudflare Workers Storage Options](https://developers.cloudflare.com/workers/platform/storage-options/)
- [Cloudflare Workers KV — How KV Works](https://developers.cloudflare.com/kv/concepts/how-kv-works/)
- [Cloudflare KV Pricing](https://developers.cloudflare.com/kv/platform/pricing/)
- [Cloudflare Workers Pricing](https://developers.cloudflare.com/workers/platform/pricing/)
- [Cloudflare Workers Cache API](https://developers.cloudflare.com/workers/runtime-apis/cache/)
- [Using the Cache API](https://developers.cloudflare.com/workers/examples/cache-api/)
- [Cloudflare Hyperdrive — Query Caching](https://developers.cloudflare.com/hyperdrive/concepts/query-caching/)
- [Cloudflare Hyperdrive — Connection Pooling](https://developers.cloudflare.com/hyperdrive/concepts/connection-pooling/)
- [Cloudflare Hyperdrive Pricing](https://developers.cloudflare.com/hyperdrive/platform/pricing/)
- [Cloudflare Hyperdrive + Supabase](https://developers.cloudflare.com/hyperdrive/examples/connect-to-postgres/postgres-database-providers/supabase/)
- [Cloudflare D1 Pricing](https://developers.cloudflare.com/d1/platform/pricing/)
- [Cloudflare D1 — SQLite at the Edge](https://architectingoncloudflare.com/chapter-12/)
- [Cloudflare Durable Objects Pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/)
- [Cloudflare R2 Pricing](https://developers.cloudflare.com/r2/pricing/)
- [Cloudflare R2 + CDN Cache](https://developers.cloudflare.com/cache/interaction-cloudflare-products/r2/)
- [Cloudflare AI Gateway — Caching](https://developers.cloudflare.com/ai-gateway/features/caching/)
- [Cloudflare Cache-Control](https://developers.cloudflare.com/cache/concepts/cache-control/)
- [TanStack Query — staleTime vs gcTime](https://medium.com/@bloodturtle/understanding-staletime-vs-gctime-in-tanstack-query-e9928d3e41d4)
- [TanStack Query — Caching Strategies](https://zread.ai/TanStack/query/11-caching-strategies-cachetime-staletime-and-garbage-collection)
- [TanStack Query — Caching Examples](https://tanstack.com/query/latest/docs/framework/react/guides/caching)
- [Cache Supabase Data at the Edge with Cloudflare Workers and KV](https://egghead.io/courses/cache-supabase-data-at-the-edge-with-cloudflare-workers-and-kv-storage-883c7959)
- [Cache-Busting with Cloudflare KV and Supabase](https://egghead.io/lessons/cloudflare-cache-busting-with-cloudflare-kv-stores-and-supabase)
- [Supabase Pricing](https://supabase.com/pricing)
- [Supabase Connection Management](https://supabase.com/docs/guides/database/connection-management)
- [Supavisor — Scalable Postgres Connection Pooler](https://supabase.com/blog/supavisor-postgres-connection-pooler)
- [PowerSync 2025 Roadmap](https://www.powersync.com/blog/powersync-2025-roadmap-sqlite-web-speed-and-versatility)
- [PowerSync + Supabase Integration](https://docs.powersync.com/integrations/supabase/guide)
- [PWA Caching — MDN](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Caching)
- [Offline-First PWAs: Service Worker Caching Strategies](https://www.magicbell.com/blog/offline-first-pwas-service-worker-caching-strategies)
- [Microservices Caching Strategies](https://dev.to/randazraik/microservices-caching-demystified-strategies-topologies-and-best-practices-43ad)
- [Cache Invalidation in Microservices](https://suddo.io/cache-invalidation-in-microservices-taming-the-beast/)
- [Cloudflare WebSocket Guide 2025](https://www.videosdk.live/developer-hub/websocket/cloudflare-websocket)
