# Phase 31: Real-Time + Caching

## Goal
Real-time updates push to all connected clients and caching layers reduce database load and latency.

## Dependencies
- Phase 11 (Portal Orders + Delivery -- customer-facing real-time)
- Phase 15 (Internal Platform Shell -- internal real-time)
- Phase 21 (Dispatch Module -- GPS real-time)

## Requirements

- **INTG-06**: Real-time: Supabase Realtime subscriptions (postgres_changes for data, broadcast for GPS, presence for online status)
- **INTG-07**: Caching: Cloudflare KV (JWKS, config, rates), Hyperdrive (DB connection pooling), TanStack Query staleTime per data type

## Success Criteria
1. Supabase Realtime subscriptions deliver postgres_changes for data updates, broadcast for GPS, and presence for online status
2. Cloudflare KV caches JWKS, config, and exchange rates with appropriate TTLs
3. Hyperdrive connection pooling is active for all read queries across 5 Workers
4. TanStack Query staleTime is configured per data type (30s for GPS, 5min for orders, 1h for catalog)

## What to Build
From GSD.md: Supabase Realtime subscriptions (all 11 channels), Cloudflare KV for config/JWKS/rates, Hyperdrive for DB connection pooling, TanStack Query staleTime per data type.

## Spec References

### Supabase Realtime Strategy (from RESEARCH.md)

- `postgres_changes` for persistent data (order status, delivery updates, quote notifications)
- `broadcast` for ephemeral high-frequency data (GPS pings)
- `presence` for online status (dispatch dashboard)

**Key pattern:** Supabase Realtime invalidates TanStack Query cache, never writes directly. Real-time events trigger `queryClient.invalidateQueries()` for the affected data.

### Realtime Channels (from BACKEND.md)

#### Postgres Changes (8 channels)

| Channel | Table | Event | Subscribers |
|---|---|---|---|
| `order-status` | `orders` | UPDATE (status) | Customer portal, Internal ops, Dispatch |
| `rfq-incoming` | `rfqs` | INSERT | Sales team |
| `quote-response` | `quotes` | UPDATE (accepted/rejected) | Assigned sales rep |
| `invoice-payment` | `payments` | INSERT | Finance, Customer portal |
| `shipment-update` | `shipments` | UPDATE (status) | Dispatch, Driver, Customer portal |
| `inventory-change` | `inventory` | UPDATE (quantity) | Warehouse, Procurement |
| `ticket-update` | `support_tickets` | UPDATE (status/assigned) | Support, Customer portal |
| `system-alert` | `system_alerts` | INSERT | Admin, relevant department |

#### Broadcast (2 channels)

| Channel | Purpose | Publishers | Subscribers |
|---|---|---|---|
| `notifications` | Push in-app notifications | Server functions | All authenticated users |
| `config-change` | Cache invalidation | Admin functions | All internal users |

#### Presence (1 channel)

| Channel | Purpose | Tracked State |
|---|---|---|
| `driver-presence` | Real-time driver location | `{ driverId, lat, lng, heading, speed, lastUpdate, status }` |

### 7-Layer Cache Architecture (from BACKEND.md)

| Layer | Technology | TTL | Use Case |
|---|---|---|---|
| **L1** | TanStack Query `queryCache` (in-memory) | Per `staleTime` | Active queries, navigation cache |
| **L2** | TanStack Query `persistQueryClient` + IndexedDB | 24h max | Offline support, app restart hydration |
| **L3** | Workbox (Capacitor/PWA) | Strategy-dependent | Static assets, API responses, fonts |

**Workbox Cache Strategies (L3 detail, from FRONTEND.md Section 2.18):**
- **App shell:** Precache (critical CSS, fonts, icons, shell HTML)
- **API responses:** Stale-while-revalidate, 5min max-age
- **Product images:** Cache-first, 7-day max-age
- **Offline fallback:** Cached pages served. Mutations disabled.
- **Note:** `vite-plugin-pwa` is incompatible with TanStack Start. Use manual Workbox configuration.
| **L4** | Cloudflare CDN / Cache API | 5min - 24h | Catalog, product images, PDFs |
| **L5** | Cloudflare KV | 15min - 30d | Exchange rates, prayer times, weather, config |
| **L6** | PostgreSQL materialized views | pg_cron schedule | CEO dashboards, aging reports |
| **L7** | PostgreSQL query plan cache (Supavisor) | Auto | Repeated complex queries |

### TanStack Query staleTime Configuration (from BACKEND.md)

| Data Type | staleTime | gcTime | Rationale |
|---|---|---|---|
| Public catalog | 5 min | 30 min | Products change infrequently |
| RFQ list | 30 sec | 5 min | Sales need near-real-time |
| Quote list | 1 min | 5 min | Expiry timers need freshness |
| Order list | 30 sec | 5 min | Frequent status changes |
| Order detail | 30 sec | 10 min | Real-time critical for ops |
| Invoice list/detail | 2 min | 10 min | Financial, less volatile |
| Customer list | 5 min | 30 min | Infrequent changes |
| Customer profile | 2 min | 15 min | Credit may update |
| Supplier list | 5 min | 30 min | Relatively static |
| Inventory levels | 1 min | 5 min | Current stock view needed |
| Driver location | 5 sec | 30 sec | Near-real-time (+ Realtime) |
| Shipment list | 30 sec | 5 min | Active dispatch freshness |
| CEO dashboard/financials | 5 min | 30 min | Backed by materialized views |
| Exchange rates | 1 hour | 4 hours | Updated daily |
| Prayer times | 24 hours | 7 days | Updated monthly |
| Weather forecast | 1 hour | 4 hours | Updated daily |
| System config | 10 min | 1 hour | Rarely changes |
| Employee directory | 10 min | 30 min | Low-change frequency |

### NEVER-CACHE List (from BACKEND.md)

- **Authentication state** -- session validity, token refresh, role changes
- **Payment recording** -- financial mutations
- **Credit hold status** -- must always be checked live
- **OTP / verification codes** -- security-critical, single-use
- **File upload presigned URLs** -- expire quickly
- **ETA e-Invoice submission status** -- tax authority responses
- **Bank reconciliation data** -- financial integrity
- **Audit log writes** -- write-path
- **AI chat responses** -- streaming, unique per request

### Dual Hyperdrive Pattern (from BACKEND.md)

| Config | Setting | Use Case |
|--------|---------|----------|
| Cached | max_age=60, swr=15 | Product catalog, reference data, supplier profiles |
| Uncached | caching-disabled=true | Orders, payments, financial queries, mutations |

### Cloudflare KV Usage

| Key Pattern | TTL | Contents |
|---|---|---|
| `jwks:{issuer}` | 15 min | JWKS public keys for JWT verification |
| `config:{tenant_id}:{category}` | 10 min | System configuration |
| `exchange-rate:{currency}` | 1 hour | Currency exchange rates |
| `prayer-times:{city}:{date}` | 24 hours | Daily prayer times |
| `weather:{city}` | 1 hour | Weather forecast / Khamsin alerts |
| `brand:{tenant_id}` | 30 days | White-label branding config |
| `sessions:{session_id}` | Session TTL | Session data (referenced in BACKEND.md Section 1: KV stores "JWKS, sessions, config, exchange rates, prayer times") |

### R2 Storage Paths (from BACKEND.md)

| Bucket Path | Contents | Access |
|---|---|---|
| `/{tenant_id}/invoices/{year}/{month}/` | Invoice PDFs, credit notes | Presigned URL |
| `/{tenant_id}/quotes/{year}/{month}/` | Quote PDFs, proforma invoices | Presigned URL |
| `/{tenant_id}/delivery-notes/` | Branded delivery notes, BOLs | Presigned URL |
| `/{tenant_id}/pod/{delivery_id}/` | Delivery photos, signature PNGs | Upload from driver app |
| `/{tenant_id}/catalogs/` | Supplier catalog uploads | Upload + AI processing |
| `/{tenant_id}/attachments/` | Customer drawings, specs, cheque photos, LC docs | Upload from portal |
| `/{tenant_id}/reports/` | Board reports, recurring reports | Generated by Workers |
| `/{tenant_id}/hr-documents/` | Employee documents, compliance certs | Internal only |
| `/{tenant_id}/receipts/` | Payment receipts, withholding certificates | Presigned URL |

### Cache Invalidation Strategy (from RESEARCH.md)

**Hybrid event-driven + TTL-based:**
- Event-driven: DB trigger -> webhook -> purge cache (for critical data like order status)
- TTL-based: eventually consistent for non-critical data (catalog, config)

**Never cached:** GPS positions, WebSocket data, order mutations, payment data, chat messages.

## Business Rules

**Realtime + TanStack Query Integration Pattern:**
1. Client subscribes to Supabase Realtime channel
2. Realtime event arrives (e.g., order status change)
3. Handler calls `queryClient.invalidateQueries({ queryKey: ['orders', orderId] })`
4. TanStack Query refetches the stale data from server
5. UI updates automatically

**GPS Transport Clarification:**

> GPS data flows through the **Presence** channel (`driver-presence`), NOT a separate Broadcast channel. The Presence payload includes `{ driverId, lat, lng, heading, speed, lastUpdate, status }`. This is confirmed in BACKEND.md Section 11 -- there is only ONE Presence channel (`driver-presence`) and it carries both online status AND GPS coordinates in the same payload. The two Broadcast channels (`notifications` and `config-change`) are for other purposes.

**GPS + Presence Pattern (combined on `driver-presence` channel):**
1. Driver app sends location update to `driver-presence` Presence channel via Supabase Realtime
2. Presence payload: `{ driverId, lat, lng, heading, speed, lastUpdate, status }`
3. Dispatch dashboard subscribes and renders driver pins on map
4. No database write for every GPS ping (too expensive) -- only periodic snapshots to `driver_locations` table
5. `driver_current_location` table for real-time tracking (upsert pattern)
6. Same channel tracks which drivers are online (Presence join/leave events)
7. Used for driver availability in job matching

## Non-Negotiable Rules

1. **TanStack Query** for all server state. Never write directly from Realtime events.
2. **Supabase Realtime** only invalidates TanStack Query cache. No direct state mutations.
3. **Cloudflare Hyperdrive** for all database connections across 5 Workers.
4. **Cloudflare KV** for JWKS, config, rates. Not for mutable business data.
5. **`(SELECT auth.uid())` pattern** in RLS policies, not `auth.uid()` directly (99.99% performance improvement).
6. **Bun, NOT npm/yarn/pnpm.**
7. **Colors in `:root {}`, NEVER in `@theme`.** Tailwind v4 critical rule.

## Discrepancies

**NOTE: `ceo_attention_items` refresh frequency discrepancy.** BACKEND.md Section 7 says 'Every 5 Min' in the view header comment, but BACKEND.md Section 9 cron job `ceo_materialized_view_refresh` says 'Every 30 min'. Recommend using 5-minute refresh as the view is small (typically <100 rows) and the CEO app depends on timely attention items. Update the cron schedule from `'*/30 * * * *'` to `'*/5 * * * *'` in Phase 14.

## Known Risks & Gotchas

1. **Supabase Realtime connection limits.** Free plan: 200 concurrent connections. Pro plan: 500. Monitor usage as users scale.
2. **RLS on Realtime.** Realtime postgres_changes respect RLS policies. Ensure RLS is correct for cross-tenant isolation.
3. **Broadcast vs postgres_changes.** Broadcast is fire-and-forget (no persistence). Use for GPS pings. postgres_changes is reliable (backed by DB). Use for business events.
4. **Hyperdrive cold starts.** First query after a period of inactivity may be slower. Pre-warm with health checks.
5. **KV eventual consistency.** KV writes are eventually consistent (may take up to 60s to propagate globally). Don't use for data requiring immediate consistency.
6. **TanStack Query staleTime tuning.** Too short = excessive refetches and DB load. Too long = stale data. Start with the values in the table above and tune based on actual usage patterns.
7. **GPS data volume.** At 5s intervals with 50 active drivers, that's 600 updates/minute via broadcast. Ensure Realtime handles the throughput.
8. **IndexedDB for offline.** `persistQueryClient` with IndexedDB can have size limits in some browsers. Monitor storage usage.
9. **Zustand SSR hydration mismatch.** Use `skipHydration: true` + `rehydrate()` in `useEffect` for all Zustand stores used in SSR apps.

## Tips

- Build a shared `useRealtimeSubscription` hook that wraps Supabase Realtime + TanStack Query invalidation. Use across all apps.
- For GPS tracking: use broadcast for real-time display, but batch-insert location snapshots to the database every 30s-60s (not every 5s).
- KV is perfect for prayer times, exchange rates, and weather data. Fetch from external APIs via Cron Triggers, store in KV, serve from KV.
- Test Realtime with multiple browser tabs to verify cross-client updates work correctly.
- For the dispatch live GPS map: subscribe to `driver-presence` and update MapLibre GL markers on each update. Smooth animation between positions.
- Use `config-change` broadcast channel to invalidate KV-cached config across all Workers when admin changes settings.
- Hyperdrive should be configured in each Worker's wrangler.jsonc. Share the Hyperdrive config ID across Workers.
