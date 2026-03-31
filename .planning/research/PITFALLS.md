# Pitfalls Research

**Domain:** B2B building materials logistics platform (Egypt) -- 5 apps, 94 tables, 32 phases
**Researched:** 2026-03-31
**Confidence:** HIGH (stack-specific), MEDIUM (Egyptian compliance), MEDIUM (scale projections)

## Critical Pitfalls

### Pitfall 1: Supabase @supabase/ssr Stream Polyfill Crash on Cloudflare Workers

**What goes wrong:**
`@supabase/ssr` internally requires Node.js `stream` module. Cloudflare Workers is a V8 isolate, not Node.js. Importing `@supabase/ssr` causes `"dynamic require of 'stream' is not supported"` at runtime. Auth breaks entirely -- every SSR page that touches auth fails with a 500 error. Documented in supabase/supabase#37592.

**Why it happens:**
The Supabase SSR package was designed for Node.js SSR frameworks (Next.js, SvelteKit). Workers compatibility is secondary. The `nodejs_compat` compatibility flag may or may not resolve it depending on SDK version and Workers runtime version.

**How to avoid:**
- Test in Phase 1, Day 1. Deploy a minimal TanStack Start app to Cloudflare Workers that creates a Supabase client with `@supabase/ssr` and calls `getSession()`.
- Enable `nodejs_compat` compatibility flag in `wrangler.jsonc`.
- If it still fails: create a thin wrapper using `@supabase/supabase-js` directly with manual cookie parsing (set/get from `Request`/`Response` headers). The SSR package is convenience, not necessity.
- Pin `@supabase/ssr` version. Do not auto-update until retested on Workers.

**Warning signs:**
- Build succeeds but runtime throws 500 on any authenticated page
- Error logs mentioning `stream`, `buffer`, or `dynamic require`
- Auth works in `bun run dev` (Node environment) but fails on deployed Workers

**Phase to address:**
Phase 1 (Monorepo Scaffold). Go/no-go blocker. If auth cannot run on Workers, every subsequent phase is built on broken ground.

---

### Pitfall 2: Supabase RLS Policy Performance Death at 94 Tables

**What goes wrong:**
Every query on every RLS-enabled table executes policy checks per row. With 94 tables, 25+ roles, and complex policies involving joins (user belongs to tenant, tenant has role, role has permission), queries that scan many rows become catastrophically slow. A simple `SELECT * FROM orders WHERE status = 'active' LIMIT 50` takes 2-5 seconds instead of 50ms because the RLS policy runs a subquery per row.

**Why it happens:**
Developers write RLS policies using `auth.uid()` directly instead of `(SELECT auth.uid())`. The direct call evaluates per row. The SELECT wrapper lets Postgres cache it as an initPlan (one evaluation per statement). With 94 tables, this mistake compounds across every table. Additionally, policies with joins to `user_roles` and `role_permissions` without indexes turn every query into a multi-table join.

**How to avoid:**
- ALWAYS use `(SELECT auth.uid())` in RLS policies, never `auth.uid()` directly. Already noted in CLAUDE.md but must be enforced in every migration.
- Index every column referenced in RLS policies: `user_id`, `tenant_id`, `created_by`, `assigned_to`.
- Create `SECURITY DEFINER` helper functions for role checks that use cached auth context internally.
- Run `EXPLAIN ANALYZE` on critical queries with RLS enabled during Phase 2. Establish performance baselines.
- Avoid permissive policy stacking (multiple `USING` policies OR together = full table scan). Prefer one well-crafted policy per operation.

**Warning signs:**
- Queries fast in Supabase SQL Editor (bypasses RLS) but slow from the app
- `pg_stat_statements` showing high execution times on simple SELECTs
- Supabase Dashboard showing elevated database CPU
- Any query >200ms that returns <100 rows

**Phase to address:**
Phase 2 (Initial Migrations) for auth tables. Phases 13-14 for all business tables. Must be verified at each migration phase.

---

### Pitfall 3: TanStack Start + Cloudflare Workers Import Boundary Violations

**What goes wrong:**
Server-only imports (`cloudflare:workers`, Supabase admin client, Node.js modules) leak into the client bundle. Vite/Rollup fails with "unresolved import" during production build. Or worse: build succeeds but client bundle ships server secrets. Recurring issue per TanStack/router#6185 and #5208.

**Why it happens:**
TanStack Start uses file-based routing where server functions and client components coexist. A single import at module scope in a file used in both contexts breaks the boundary. Middleware importing `cloudflare:workers` for environment variables gets bundled into the client. Vite plugin cannot always tree-shake correctly at module scope.

**How to avoid:**
- NEVER import `cloudflare:workers` or server-only modules at the top of route files. Only import inside server function bodies or `.server.ts` files.
- Create a `packages/server-utils` package that isolates all server-only code. Route files import types only.
- Use `createServerFn()` with `.handler()` for all server logic. Do not mix server imports into component files.
- Test production builds (`vite build`) frequently. Dev mode uses different bundling that hides import issues.
- Pin `@tanstack/react-start` carefully. Version 1.142.x had a regression. Current 1.167.12+ should be fixed, but test after every update.

**Warning signs:**
- `vite build` fails with "Could not resolve cloudflare:workers"
- Client bundle size suddenly jumps (server code leaked in)
- Environment variables appearing in browser network tab
- Build works in dev but fails in production

**Phase to address:**
Phase 1 (scaffold) -- establish the pattern. Phase 3 (shared packages) -- enforce with package boundaries. Continuous verification.

---

### Pitfall 4: ETA E-Invoicing HSM Certificate and Signing Infrastructure

**What goes wrong:**
Egyptian Tax Authority requires every invoice to be digitally signed with an Advanced Electronic Signature (AES) using either a physical HSM device or USB token from an ITIDA-approved provider. Software certificates and self-signed keys are rejected. Without this hardware, e-invoicing is physically impossible regardless of API code quality. Invoices are rejected at submission.

**Why it happens:**
Developers build API integration (JSON formatting, REST calls) and assume signing is a software problem. It is a procurement and infrastructure problem. Approved HSM providers in Egypt are limited (Egypt Trust, Digital Egypt, E-Finance, Fixed Egypt, Delta Electronic Systems). Lead times for certificate issuance are 2-6 weeks. The signing must happen server-side, and the HSM must be network-accessible from the Cloudflare Worker.

**How to avoid:**
- Start HSM certificate procurement immediately, parallel to Phase 1. Do not wait for Phase 29.
- Choose a cloud-accessible HSM option (not USB token) since the app runs on Workers. Need an HSM exposing a signing API over HTTPS.
- Register on the ETA portal early. Get sandbox API credentials. Registration requires admin setup and invitation.
- Plan a signing proxy: a lightweight service that receives unsigned invoice JSON, signs it, returns the signed document.
- Map product catalog to GS1 GPC classification codes early -- ETA requires these on every invoice line item.
- Store invoices for 7 years minimum (Egyptian law requirement).

**Warning signs:**
- Phase 29 starts and no HSM certificate exists
- ETA sandbox credentials not yet obtained
- Product catalog has no GPC code mapping
- No team member has ever called the ETA API

**Phase to address:**
Procurement starts at project kickoff (parallel to Phase 1). Technical integration at Phase 29. GPC mapping at Phase 5 (catalog) or Phase 13 (product tables).

---

### Pitfall 5: Arabic RTL Layout Breaks Discovered Too Late

**What goes wrong:**
Every screen is built in English (LTR) first, with RTL treated as a "flip it later" afterthought. When Arabic testing finally happens, dozens of layout bugs surface: overlapping text, wrong padding directions, broken number alignment, reversed icon meanings, date/time segments in wrong order, misaligned glass windows. Fixing requires touching every component.

**Why it happens:**
Developers naturally build in their primary language. RTL is not a CSS mirror -- it involves bidirectional text, number formatting (Arabic-Indic numerals), unit translations, calendar differences, and cultural context. React Aria had a documented bug where time segments rendered MM:HH instead of HH:MM in RTL (fixed March 2025, see react-spectrum blog). These issues are invisible until you render in Arabic.

**How to avoid:**
- Test EVERY component in Arabic during development, not at the end. Per-phase checklist already says "Test RTL layout" -- enforce it strictly.
- Use Tailwind v4 logical properties exclusively: `ps-*`/`pe-*`/`ms-*`/`me-*` instead of `pl-*`/`pr-*`/`ml-*`/`mr-*`. Never physical `left`/`right`.
- Update React Aria to at least March 2025 release for RTL date/time fix.
- Configure `I18nProvider` with explicit locale to avoid SSR hydration blank page bug (#7474).
- Create Storybook stories for each component in both AR and EN. Visual regression catches RTL breaks.
- Arabic-Indic numerals (`Intl.NumberFormat('ar-EG')`) in ALL number displays -- not a font swap, a formatter requirement.

**Warning signs:**
- No one tests Arabic during the current phase
- Physical CSS properties (`left`, `right`, `pl-`, `pr-`) in the codebase
- Numbers showing 1,234 instead of ١٬٢٣٤ in Arabic mode
- Date/time inputs rendering segments in wrong order

**Phase to address:**
Phase 3 (Shared Packages) -- set up I18nProvider, formatters, AR/EN Storybook. Every subsequent phase must test both locales.

---

### Pitfall 6: Cloudflare Workers 128MB Memory Limit with SSR

**What goes wrong:**
Each Cloudflare Worker isolate has a hard 128MB memory limit. TanStack Start SSR means React rendering happens server-side. With shared component libraries, Motion, React Aria, i18next locale data, Zustand stores, and TanStack Query cache, the SSR memory footprint can exceed 128MB on complex pages. Worker returns Error 1102 ("Worker exceeded resource limits") with no graceful degradation.

**Why it happens:**
Developers optimize for bundle size (transfer) but not runtime memory (execution). SSR creates a React tree in memory, serializes it, streams it. Complex pages with large data sets (sales pipeline with 500 quotes, finance AR aging report) can spike memory. The 128MB includes JavaScript heap AND compiled script.

**How to avoid:**
- 5 apps as 5 separate Workers (per GSD.md) -- correct. Never merge them.
- Aggressive code splitting with TanStack Router lazy imports. Each route loads only what it needs.
- Paginate ALL data. Never load full lists server-side. Cursor-based pagination.
- Set TanStack Query `maxPages` for infinite scroll.
- Monitor Worker memory in Cloudflare dashboard. Alert at 80MB.
- For internal platform (heaviest app): use SPA mode instead of SSR. Behind auth, no SEO need. SPA eliminates SSR memory overhead.
- Script size limit: 10MB compressed. Monitor total bundle size with `vite build --mode analyze`.

**Warning signs:**
- Error 1102 in Cloudflare logs
- Intermittent 500s under load (memory spikes)
- Pages work in dev but fail deployed (dev has no memory limit)
- Bundle analysis showing >5MB compressed per Worker

**Phase to address:**
Phase 1 (code splitting config). Phase 15 (verify SPA mode for internal). Phase 31 (optimize).

---

### Pitfall 7: Offline-First Driver App Conflict Resolution

**What goes wrong:**
Driver app works offline via PowerSync + SQLite. Drivers complete deliveries, capture PODs, record exceptions while offline. On reconnect, mutations sync to Supabase. But: dispatcher reassigned the delivery while driver was offline, warehouse marked item as out-of-stock, or two drivers both claimed the same delivery. Sync produces conflicting states -- delivered order that was cancelled, double-delivery, phantom POD records.

**Why it happens:**
Offline-first is easy to demo, hard to get right. PowerSync handles sync mechanics, but business-level conflict resolution is application logic. Most teams build the happy path (offline delivery, sync, done) and ignore conflict cases.

**How to avoid:**
- Define explicit conflict resolution rules per mutation:
  - Delivery confirmation: server wins (cancelled order discards driver's confirmation, notifies driver)
  - POD capture: driver wins (photos/signatures always valid evidence, even for cancelled orders)
  - GPS location: append-only (no conflicts possible)
  - Exception report: driver wins (observations always valid)
  - Route changes: server wins (dispatch authority overrides)
- Implement sync status screen showing pending mutations, conflicts, resolution outcomes.
- PowerSync WAL replication: specify only driver-relevant tables, NOT `FOR ALL TABLES`. 94-table replication causes WAL bloat and memory spikes.
- Queue mutations with timestamps and sequence numbers. Process idempotently server-side.
- Test end-to-end: airplane mode, complete full delivery, reconnect, verify data integrity.

**Warning signs:**
- No conflict resolution logic in codebase
- PowerSync configured with `FOR ALL TABLES`
- Driver app has no "pending sync" indicator
- Orders in impossible states (delivered + cancelled)

**Phase to address:**
Phase 24 (Driver Scaffold) -- PowerSync with explicit table subset. Phase 25 (Delivery + POD) -- conflict resolution per mutation. Phase 32 (Testing) -- offline E2E suite.

---

### Pitfall 8: Foundation Patterns Wrong, Discovered at Phase 15+

**What goes wrong:**
With 32 phases, each building on previous work, a mistake in Phases 1-3 (wrong auth pattern, wrong component API, wrong database schema) propagates through every subsequent phase. By Phase 20, you discover the auth cookie pattern from Phase 2 does not support SSO needed for Phase 15, or the GlassWindow API from Phase 3 does not handle state preservation for module swapping. Fixing means touching 15+ phases of work.

**Why it happens:**
The spec is comprehensive (15,923 lines) but implementation always reveals gaps. Phases 1-3 define patterns that 29 subsequent phases depend on. Foundation phases are highest-leverage but built with the least implementation experience. Claude Code sessions have context limits -- decisions made in Phase 1 may be misinterpreted in Phase 20.

**How to avoid:**
- Phases 1-3 are "get it right" phases, not "get it done fast."
- After Phase 3, build ONE complete vertical slice (one screen, backend to frontend) before Phase 4. Validates: auth on Workers, RLS policies, server functions, React Aria components, Glass window rendering, i18n in Arabic, dark mode.
- Document architectural decisions in code comments at point of use. Future sessions read code, not always specs.
- TypeScript `strict: true`, no `any`, no `@ts-ignore`. Type system catches cross-phase inconsistencies.
- Keep a running DECISIONS.md log: "we chose X because Y" for every non-obvious decision.

**Warning signs:**
- Phase N requires "refactoring" Phase M (where M < N - 2)
- Multiple components duplicating logic instead of using shared packages
- TypeScript errors suppressed with `any` or `@ts-ignore`
- Session starts without reading CLAUDE.md

**Phase to address:**
Phases 1-3 (Foundation). Quality over speed. Every hour here saves days in Phases 15-32.

---

## Stack-Specific Pitfalls (Moderate Severity)

### Pitfall 9: Vite 8 Upgrade Breaks TanStack Start

**What goes wrong:** Upgrading Vite 7 to 8 (Rolldown-based) causes TanStack Start to stop responding. Build succeeds but app serves blank pages.
**Why it happens:** Vite 8 uses Rolldown with different module resolution. TanStack Start has unresolved incompatibilities.
**How to avoid:** Pin `"vite": "^7.3.1"` (caret won't cross major). Comment the constraint in vite.config.ts. Monitor TanStack changelog.
**Warning signs:** Blank page after build, no terminal error.
**Phase to address:** All phases. Never upgrade Vite without testing.

---

### Pitfall 10: Tailwind v4 @theme Color Collision

**What goes wrong:** Defining `--color-base` or `--color-*` in `@theme {}` causes `text-base` to set color instead of font-size.
**Why it happens:** Tailwind v4 uses `@theme` for utility generation. `--color-base` creates a `base` color utility colliding with `text-base`.
**How to avoid:** ALL custom colors in `:root {}`, NEVER in `@theme {}`. `@theme` only for fonts, spacing, radius, shadows.
**Warning signs:** `text-base` producing unexpected visual results.
**Phase to address:** Phase 1. Verify immediately.

---

### Pitfall 11: Tailwind v4 Dark Mode Configuration

**What goes wrong:** v4 defaults to `@media (prefers-color-scheme: dark)`. Projects using class/attribute-based toggle get broken dark mode. The upgrade tool generates invalid syntax.
**Why it happens:** v4 removed `darkMode: 'class'` config. Must use `@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *))` in CSS.
**How to avoid:** Use the exact custom variant from STACK-DECISION.md. Do not rely on Tailwind's upgrade tool output. Test dark mode toggle works before proceeding.
**Warning signs:** Dark mode applying based on OS preference instead of data-theme attribute. Styles flickering in dev mode.
**Phase to address:** Phase 1 (Tailwind setup), Phase 3 (component library dark mode).

---

### Pitfall 12: React Hook Form watch() Silent Failure with React 19

**What goes wrong:** `watch()` does not trigger re-renders with React 19 compiler optimizations. Form fields appear broken.
**Why it happens:** React 19 Compiler memoizes aggressively. `watch()` relies on re-render patterns the compiler optimizes away.
**How to avoid:** Use `useWatch()` everywhere. Never `watch()`. Enforce via code review.
**Warning signs:** Dependent form fields don't update. `getValues()` shows correct data but UI is stale.
**Phase to address:** Phase 3 (forms package), Phase 9 (material list builder).

---

### Pitfall 13: React Aria I18nProvider SSR Hydration Flash

**What goes wrong:** `useDefaultLocale()` causes blank page flash when server locale doesn't match client detection.
**How to avoid:** Pass locale explicitly: `<I18nProvider locale={detectedLocale}>`. Never auto-detect for SSR.
**Phase to address:** Phase 3 (i18n setup), Phase 4 (website layout).

---

### Pitfall 14: Motion Popover Race Condition

**What goes wrong:** Animating React Aria Popover/Menu with Motion causes intermittent open/close race (Motion#9158, still open).
**How to avoid:** CSS transitions for Popover/Menu. Motion only for Modal, GlassWindow, page transitions.
**Phase to address:** Phase 3 (UI package).

---

### Pitfall 15: Escape Key and Arrow Key Conflicts

**What goes wrong:** React Aria Dialog and TanStack Hotkeys both fire on Escape. Arrow key hotkeys fire inside ListBox/Menu.
**How to avoid:** `isKeyboardDismissDisabled` on Dialog, handle Escape via hotkeys only. `{ enabled: !isMenuOpen }` on arrow key bindings.
**Phase to address:** Phase 15 (Internal Shell with hotkey system).

---

### Pitfall 16: @tanstack/start vs @tanstack/react-start Package Confusion

**What goes wrong:** Installing `@tanstack/start` (frozen at 1.120.20, has vinxi dependency) instead of `@tanstack/react-start` (active, 1.167.12+).
**How to avoid:** Always `@tanstack/react-start`. Block `@tanstack/start` via package.json overrides.
**Phase to address:** Phase 1.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Skipping RLS on dev/staging | Faster development | Production data leaks, policies untested | Never |
| Hardcoding Arabic strings | Faster for AR-primary screens | Cannot maintain, English breaks | Never. Always i18n keys. |
| `any` type for Supabase responses | Avoids generated type wrangling | Runtime crashes on schema changes | Only during prototyping, must type within same phase |
| Inline styles for glass effects | Easier exact look | Inconsistent, not responsive, not RTL-aware | Only one-off brand elements (lion watermark) |
| Skipping pagination for "small" tables | Simpler queries | Tables grow, Worker memory spikes | Only truly bounded data (enums, system_config) |
| `localStorage` instead of Zustand | No setup needed | Not reactive, not SSR-safe | Only non-reactive persistence (draft auto-save) |
| Single Supabase migration for everything | Faster initial setup | Cannot rollback individual changes | Never. One concern per migration. |
| Skipping GPC code mapping on products | Ship catalog faster | ETA e-invoicing blocked later | Only if ETA is Phase 29 and launch doesn't require compliance |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| ETA E-Invoicing | Building API code before having HSM certificate | Procure HSM first. Build signing proxy. Then API integration. |
| ETA E-Invoicing | Using test certificates in production | Sandbox and production are separate environments. Never mix. |
| ETA E-Invoicing | Missing GPC product codes on invoice lines | Map every product to GS1 GPC code. ETA rejects invoices without them. |
| WhatsApp Cloud API | Sending OTP without approved template | Pre-register templates with Meta. Must be approved before use. |
| WhatsApp Cloud API | Ignoring 24-hour messaging window | After 24h without customer response, can only send approved templates, not freeform. |
| Supabase Realtime | Subscribing to all 94 tables | Subscribe only to tables the current user needs. Unsubscribe on unmount. |
| Supabase Realtime | Writing state directly from subscription | Invalidate TanStack Query cache instead. Ensures consistency with SSR data. |
| Cloudflare AI Gateway | Assuming identical response formats | GLM, Groq, Mistral, Claude have different streaming formats. Normalize in adapter. |
| Cloudflare R2 | Missing CORS for direct browser uploads | R2 requires explicit CORS config. Uploads fail silently without it. |
| MapLibre GL | Module-scope import in SSR route | Must be `ClientOnly`. Dynamic import. MapLibre touches `window`/`document`. |
| PowerSync | `FOR ALL TABLES` replication | Specify only driver-relevant tables. 94 tables causes WAL bloat. |
| Supabase Auth | Cookie size exceeding header limits | Google OAuth can set 4 cookies totaling >10KB. Exceeds Cloudflare header limit (128KB total but individual cookie issues). Monitor cookie sizes. |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| `auth.uid()` without SELECT wrapper in RLS | Queries slow linearly with table size | Always `(SELECT auth.uid())` | >1,000 rows in RLS-protected table |
| Unindexed RLS policy columns | Full table scans | Index `tenant_id`, `user_id`, `created_by` | >10,000 rows per table |
| Full order history on portal load | 3s+ page load, Worker memory spike | Cursor pagination, last 20 only | >500 orders per customer |
| Realtime subscriptions without cleanup | Memory leak, connection exhaustion | Cleanup in `useEffect` return | >50 concurrent users |
| SSR rendering full data tables | Worker exceeds 128MB | Paginate server-side, skeleton + hydrate | >200 rows per table view |
| Unbounded infinite scroll cache | Browser memory grows until crash | `maxPages` on `useInfiniteQuery` | >20 pages scrolled |
| CEO metrics computed per query | Database CPU spikes | Materialized views + pg_cron (5min refresh) | >100 concurrent internal users |
| No code splitting on internal routes | 2MB+ initial load, slow TTFB | Lazy imports for every module | >50 routes in single app |
| Turborepo without proper cache config | CI rebuilds unchanged code | Define `outputs` in `turbo.json` for every task | All phases. 40-60% CI waste without it. |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| RLS missing on one table | Full data exposure for that entity | Audit script checking all tables have RLS. Run in CI. |
| Supplier pricing visible to customers | Margin data leaked, business model broken | RLS on `supplier_pos`, `purchase_order_items` restricts to internal roles. AI never surfaces supplier costs. |
| Cross-tenant data access | Customer A sees Customer B's data | Every RLS policy includes `tenant_id` check. Test with two tenant accounts. |
| JWT claims not validated server-side | Role escalation (customer claims admin) | `custom_access_token_hook` validates against `user_roles` table. Never trust client roles. |
| Driver credentials in SQLite | Device theft = credential theft | Capacitor Secure Storage (Keychain/Keystore), never SQLite. |
| ETA invoice data unencrypted at rest | Legal liability, 7-year exposure window | Encrypt sensitive fields. Supabase Vault for API keys. |
| Dual auth pool crossover | Internal accessing external or vice versa | Separate cookie names (`hq-internal-session`, `hq-external-session`). Pool isolation in token hook. |
| Post-dated cheque data exposure | Criminal liability (bounced cheque = criminal offense in Egypt) | Finance role only via RLS. Audit log every access. |
| Server secrets in client bundle | API keys, DB credentials exposed | Never import server-only modules at route file scope. Verify with bundle analysis. |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Dashboard layout instead of spatial glass | Looks like every B2B tool. No differentiation. Violates mandate. | Glass windows floating over empty space. No sidebars. No breadcrumbs. |
| Arabic as afterthought with machine translation | Egyptian users feel disrespected. Professional credibility lost. | Arabic primary. Write AR strings first, EN second. Domain-specific terms. |
| Exact prices on website catalog | Violates business model. Customers bypass quotes. | Price ranges only. Exact prices only in quotes. |
| Complex signup for returning customers | Friction kills repeat orders (70% of B2B revenue). | Quick reorder from past orders. AI understands "same as last time." |
| Desktop-first driver app | Unusable on construction sites with phones. | Mobile-only. 48px touch targets. One-hand operation. Glove-compatible. |
| Ignoring Cairo truck ban in scheduling | Deliveries during 6AM-midnight ban. Drivers fined. | Enforce in route planning. Friday Jumu'ah blackout 11:30-1:30. Prayer buffers. |
| No sync status in driver app | Driver assumes offline work synced. Dispatch blind. | Always-visible indicator. Pending count. Last sync timestamp. Alert on failure. |
| English-only error messages | Arabic-speaking construction workers confused | All errors, toasts, validation messages in active locale. |

## "Looks Done But Isn't" Checklist

- [ ] **Auth:** SSO cookie on `.hyperquote.net` -- verify cross-subdomain auth actually works between website and portal
- [ ] **i18n:** Arabic-Indic numerals in ALL number displays -- tables, badges, charts, PDFs, WhatsApp messages
- [ ] **i18n:** Unit translations (kg/كجم, ton/طن, m2/م٢) in ALL contexts including PDFs and WhatsApp
- [ ] **RLS:** Every table has RLS enabled -- run `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND NOT rowsecurity`
- [ ] **RLS:** Cross-tenant isolation tested with TWO separate tenant accounts
- [ ] **State machines:** Every status transition validated -- can you jump `draft` to `delivered` via DB? Must be blocked.
- [ ] **Dark mode:** Glass effects correct in dark mode -- blur, transparency, borders need dark variants
- [ ] **Offline driver:** Full delivery flow with no network -- airplane mode from arrival to POD to completion
- [ ] **PDF generation:** Arabic text renders RTL in PDFs -- pdf-lib needs explicit RTL handling, no auto-detect
- [ ] **ETA:** Credit notes reference original invoice UUID -- missing reference = ETA rejection
- [ ] **WhatsApp:** Fallback chain works -- WhatsApp fails, SMS after 30s, voice after 60s
- [ ] **Hotkeys:** Do not fire when typing in inputs -- scope state machine for keyboard context
- [ ] **Maps:** `ClientOnly` on every MapLibre instance -- SSR crashes without it
- [ ] **Pagination:** Every list/table endpoint is paginated -- no unbounded queries
- [ ] **Bundle:** Each Worker <10MB compressed -- check with `vite build` analysis
- [ ] **Memory:** Each Worker <80MB runtime -- check Cloudflare dashboard under load

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| @supabase/ssr stream crash | LOW | Manual cookie wrapper (2-4 hours). Drop SSR dependency. |
| RLS performance degradation | MEDIUM | Add `(SELECT ...)` to all policies + indexes. Migration per table. 1-2 days for 94 tables. |
| Import boundary violation | LOW | Move imports to server function bodies. Create `.server.ts` files. 1-2 hours per occurrence. |
| HSM certificate not procured | HIGH | 2-6 week lead time. Ship without ETA, add later. Risk: non-compliance penalties. |
| RTL layout broken everywhere | HIGH | Systematic audit. Replace physical with logical properties. 1-2 weeks. |
| Worker memory overflow | MEDIUM | SPA mode for internal/CEO. Pagination. Lazy routes. 2-3 days. |
| Offline sync conflicts | HIGH | Implement conflict resolution post-hoc. Audit corrupted records. 1-2 weeks. Data loss risk. |
| Foundation patterns wrong at Phase 15+ | CRITICAL | Refactor shared packages. Ripple through all apps. 1-3 weeks. |
| Tailwind dark mode broken | LOW | Fix custom variant syntax. 1-2 hours. But cascade through all components if caught late. |
| Vite 8 accidentally upgraded | LOW | Revert to Vite 7. Pin version. 30 minutes if caught immediately. |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| @supabase/ssr on Workers | Phase 1 | Deploy auth test to Workers. `getSession()` returns valid session. |
| RLS performance | Phase 2, 13, 14 | `EXPLAIN ANALYZE` on critical queries. All under 100ms. |
| Import boundary violations | Phase 1, 3 | `vite build` succeeds for all 5 apps. No server imports in client chunks. |
| ETA HSM procurement | Pre-Phase 1 (parallel) | Certificate received and signing proxy tested before Phase 29. |
| Arabic RTL layout | Phase 3 + every phase | Storybook visual regression in AR locale. Every phase includes Arabic test. |
| Worker memory limits | Phase 1, 15 | Cloudflare dashboard <80MB per Worker under test load. |
| Offline conflict resolution | Phase 24, 25 | E2E: offline delivery + server cancellation = correct resolution. |
| Foundation patterns | Phase 3 (vertical slice) | One feature works end-to-end: auth, RLS, server fn, component, i18n, dark mode. |
| Tailwind color collision | Phase 1 | Colors in `:root {}`. `text-base` sets font-size. Verified in browser. |
| Dark mode variant | Phase 1, 3 | `@custom-variant dark` renders correctly. No dev mode CSS conflicts. |
| I18nProvider SSR bug | Phase 3 | Explicit locale to I18nProvider. No blank flash on hydration. |
| Motion Popover race | Phase 3 | CSS for Popover/Menu. Motion for Modal/GlassWindow. No flickering. |
| 100+ routes slow dev | Phase 15 | All internal routes lazy. Dev server starts <5s. |
| Realtime connection leak | Phase 11, 31 | All subscriptions cleanup in useEffect. No orphaned channels. |
| WhatsApp template approval | Pre-Phase 27 | Templates submitted and approved by Meta before Phase 27 starts. |
| GPC product codes | Phase 5 or 13 | Every product has GS1 GPC code. ETA accepts invoice submissions. |
| Vite 8 upgrade | All phases | `"vite": "^7.3.1"` pinned. Comment in config. Never upgrade without TanStack blessing. |
| Package confusion | Phase 1 | `@tanstack/react-start` in package.json. `@tanstack/start` blocked. |
| Turborepo cache config | Phase 1 | `outputs` defined in `turbo.json`. Rebuild only what changed. |

## Sources

- [Supabase SSR + Workers Issue #37592](https://github.com/supabase/supabase/issues/37592)
- [TanStack Start + Workers build issue #6185](https://github.com/TanStack/router/issues/6185)
- [cloudflare:workers import issue #5208](https://github.com/TanStack/router/issues/5208)
- [Supabase RLS Performance Best Practices](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv)
- [Supabase RLS Discussion #14576](https://github.com/orgs/supabase/discussions/14576)
- [Cloudflare Workers Limits](https://developers.cloudflare.com/workers/platform/limits/)
- [ETA E-Invoicing SDK](https://sdk.invoicing.eta.gov.eg/)
- [Egyptian E-Invoicing Guide (Wafeq)](https://www.wafeq.com/en-eg/tax-and-reporting/electronic-invoice-system)
- [Egyptian E-Invoicing Guide (Fonoa)](https://www.fonoa.com/resources/country-tax-guides/egypt/e-invoicing-and-digital-reporting)
- [React Aria RTL Date/Time Fix](https://react-spectrum.adobe.com/blog/rtl-date-time.html)
- [React Aria Internationalization](https://react-spectrum.adobe.com/react-aria/internationalization.html)
- [React Aria I18nProvider SSR Bug #7474](https://github.com/adobe/react-spectrum/issues/7474)
- [Tailwind v4 Dark Mode Discussion #16517](https://github.com/tailwindlabs/tailwindcss/discussions/16517)
- [Tailwind v4 Dark Mode CSS Bug #18539](https://github.com/tailwindlabs/tailwindcss/issues/18539)
- [Motion Popover Race Condition #9158](https://github.com/motiondivision/motion/issues/9158)
- [RHF watch() + React 19 Issue #11910](https://github.com/react-hook-form/react-hook-form/issues/11910)
- [PowerSync + Supabase Integration](https://docs.powersync.com/integration-guides/supabase-+-powersync)
- [B2B Marketplace Lessons (Point Nine)](https://medium.com/point-nine-news/4-lessons-learned-from-building-and-scaling-b2b-marketplaces-2cddaf1f2e56)
- [Cloudflare TanStack Start Docs](https://developers.cloudflare.com/workers/framework-guides/web-apps/tanstack-start/)

---
*Pitfalls research for: HyperQuote B2B building materials platform (Egypt)*
*Researched: 2026-03-31*
