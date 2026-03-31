# Project Research Summary

**Project:** HyperQuote -- B2B Building Materials Platform (Egypt)
**Domain:** B2B construction materials marketplace, 5 apps, Arabic-first, spatial glass UI
**Researched:** 2026-03-31
**Confidence:** HIGH

## Executive Summary

HyperQuote is a multi-app B2B platform for the Egyptian building materials market, comprising a public website, customer/supplier portal, internal operations platform (11 modules), CEO command center, and offline-capable driver app. The expert approach for this domain is a monorepo deploying 5 independent Cloudflare Workers (zero cold start, global edge), backed by Supabase (PostgreSQL + Auth + Realtime + Storage), with a spatial "glass window" UI paradigm instead of conventional dashboard layouts. The stack is validated and production-ready -- TanStack Start v1 on Vite 7 with React 19, React Aria Components for Arabic-first accessibility, and Tailwind v4 with logical properties for RTL. Only one version bump is required (i18next 25 to 26).

The recommended approach is a strict foundation-first build: Phases 1-3 establish the monorepo scaffold, auth on Workers, database migrations, and shared UI/i18n packages. A vertical slice validation after Phase 3 proves the entire stack end-to-end before building features. The 32-phase roadmap then progresses from public website through authenticated portal, internal operations, AI integration, driver app, and compliance (ETA e-invoicing). This order follows dependency chains: auth gates every feature, shared packages gate every app, and the internal platform (heaviest app) should use SPA mode to avoid Worker memory limits.

The three highest risks are: (1) Supabase SSR auth on Cloudflare Workers -- the `@supabase/ssr` package may crash due to Node.js `stream` dependency, requiring a `nodejs_compat` flag or manual cookie wrapper; (2) RLS policy performance death across 94 tables if `(SELECT auth.uid())` pattern is not enforced from the first migration; and (3) ETA e-invoicing HSM certificate procurement, which has a 2-6 week lead time and must start parallel to Phase 1, not at Phase 29. Arabic RTL is a cross-cutting risk that compounds if not tested per-phase.

## Key Findings

### Recommended Stack

The stack is mature and well-integrated. TanStack Start is the only React framework with first-class Cloudflare Workers deployment. React Aria Components provides unmatched Arabic/RTL support (38 locales, Arabic-Indic numerals, Islamic calendar). All core dependencies are stable (HIGH confidence) except AI packages (0.x, must be wrapped behind abstractions).

**Core technologies:**
- **TanStack Start v1.167.12+**: Full-stack SSR/SSG/SPA framework -- only React framework with native Workers deployment via `@cloudflare/vite-plugin`
- **React 19.2.4 + TypeScript 6.0.2**: Current stable with React Compiler, Activity API, strict mode default
- **React Aria Components 1.16.0**: Accessible UI primitives -- best-in-class RTL/Arabic support, 38 locales
- **Tailwind CSS 4.2.2**: CSS-first config, logical properties (`ps-*/pe-*/ms-*/me-*`) for RTL
- **Supabase**: PostgreSQL + Auth + Realtime + Storage + RLS for multi-tenancy (94 tables, 25+ roles)
- **Cloudflare Workers**: Zero cold-start SSR, global edge, R2/KV/Hyperdrive/AI Gateway
- **Zustand 5 + TanStack Query 5**: Client UI state and server state respectively -- never mix their concerns
- **Motion v12**: Animation (spring enter, tween exit) -- do NOT use for Popover/Menu (race condition)

**Critical version constraint:** Stay on Vite 7.3.x. TanStack Start breaks on Vite 8 (Rolldown-based).

### Expected Features

**Must have (table stakes):**
- SSR + SSG in one framework (SEO for website, fast TTFB for portal)
- Arabic-first RTL with Arabic-Indic numerals in all number displays
- Type-safe server functions with Zod validation
- Real-time updates (order status, notifications, GPS tracking)
- RLS-based multi-tenancy with 25+ roles
- Keyboard-first navigation (11 module hotkeys, command palette)
- PDF generation (invoices, quotes, delivery notes) in Arabic

**Should have (differentiators):**
- Zero cold-start SSR via Workers (faster than Lambda/Vercel competitors)
- 4-tier AI routing (GLM -> Groq -> Mistral -> Claude) at $61/mo
- Spatial glass UI (floating windows over empty canvas, not dashboards)
- Embedded vector search for CEO natural-language queries
- Offline-capable driver app with conflict resolution

**Defer (v2+):**
- React Server Components (TanStack Start does not support RSC)
- Native mobile apps for portal (PWA first, native after 6-12 months)
- Payment gateway integration (Egyptian B2B uses wire, cheque, cash, LC only)

### Architecture Approach

Five independent Cloudflare Workers (one per app) communicate with a single Supabase instance via HTTP. Data flows through TanStack Start server functions (auth-guarded, Zod-validated) to Supabase via Hyperdrive (connection pooling for reads). TanStack Query handles SSR hydration automatically. Supabase Realtime pushes updates that invalidate Query cache. Zustand manages client-only UI state (glass window positions, theme). The driver app runs on Capacitor with PowerSync + SQLite for offline-first operation, syncing to Supabase on reconnect.

**Major components:**
1. **Website Worker** -- SSG marketing, SSR product catalog, login modal
2. **Portal Worker** -- Customer/supplier authenticated experience, AI chat
3. **Internal Worker** -- 11-module employee platform, glass window UI (use SPA mode, not SSR)
4. **CEO Worker** -- Search-only command center, approval flows, materialized views
5. **Driver App** -- Capacitor native, offline-first with PowerSync, GPS tracking
6. **Supabase** -- PostgreSQL (94 tables), Auth, Realtime, Storage, Edge Functions
7. **Cloudflare Services** -- R2 (storage), KV (config cache), Hyperdrive (DB pooling), AI Gateway

### Critical Pitfalls

1. **Supabase SSR on Workers crashes** -- `@supabase/ssr` requires Node.js `stream`. Enable `nodejs_compat` flag. If it still fails, write a manual cookie wrapper (2-4 hour recovery). Test Day 1 of Phase 1.
2. **RLS performance death at scale** -- Always use `(SELECT auth.uid())` not `auth.uid()`. Index every RLS column (`tenant_id`, `user_id`, `created_by`). Run `EXPLAIN ANALYZE` at every migration phase. Recovery: 1-2 days for 94 tables.
3. **ETA HSM certificate not procured** -- 2-6 week lead time for hardware security module. Start procurement at project kickoff, parallel to Phase 1. Without it, e-invoicing is physically impossible.
4. **Arabic RTL breaks discovered late** -- Use Tailwind logical properties exclusively. Test every component in Arabic during development. Create AR + EN Storybook stories. Recovery if late: 1-2 weeks of systematic audit.
5. **Foundation patterns wrong, discovered at Phase 15+** -- Phases 1-3 are "get it right" phases. Build one complete vertical slice after Phase 3 before proceeding. Recovery if late: 1-3 weeks of refactoring across all apps.
6. **Worker 128MB memory limit** -- Use SPA mode for internal/CEO apps (no SEO need). Paginate all data. Lazy-load all routes. Monitor at 80MB threshold.
7. **Import boundary violations** -- Server-only imports leak into client bundle. Never import `cloudflare:workers` at module scope. Use `.server.ts` files. Test `vite build` frequently.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Monorepo Scaffold and Stack Validation
**Rationale:** Every subsequent phase depends on the build system, deployment pipeline, and auth working on Workers. This is the go/no-go gate.
**Delivers:** Turborepo monorepo, 5 Worker apps scaffolded, Vite 7 + Cloudflare plugin verified, Supabase SSR auth on Workers proven, Tailwind v4 with `:root` colors and dark mode custom variant.
**Addresses:** SSR + SSG framework (table stakes), zero cold-start deployment (differentiator)
**Avoids:** Supabase SSR stream crash (Pitfall 1), Vite 8 upgrade (Pitfall 9), Tailwind color collision (Pitfall 10), package confusion (Pitfall 16)

### Phase 2: Database Foundation
**Rationale:** Auth tables and core enums must exist before any feature. RLS patterns must be validated early.
**Delivers:** Auth migrations, core enums (94 tables start here), RLS policies with `(SELECT auth.uid())` pattern, performance baselines via `EXPLAIN ANALYZE`.
**Addresses:** RLS-based multi-tenancy (table stakes)
**Avoids:** RLS performance death (Pitfall 2), foundation patterns wrong (Pitfall 8)

### Phase 3: Shared Packages + Vertical Slice
**Rationale:** UI components, i18n, formatters, and form patterns are used by all 5 apps. Must be correct before feature work.
**Delivers:** React Aria component library, i18n setup (AR primary, EN secondary), Arabic-Indic number formatters, GlassWindow component, Zustand stores, form patterns with `useWatch()`. One end-to-end vertical slice proving auth -> RLS -> server fn -> component -> i18n -> dark mode.
**Addresses:** Arabic-first RTL (table stakes), spatial glass UI (differentiator), keyboard navigation (table stakes)
**Avoids:** RTL breaks (Pitfall 5), foundation patterns wrong (Pitfall 8), I18nProvider SSR flash (Pitfall 13), Motion Popover race (Pitfall 14), RHF watch() failure (Pitfall 12)

### Phases 4-7: Public Website + Auth Flows
**Rationale:** Website is the entry point. Auth flows gate portal access. Lowest-risk SSR validation before portal complexity.
**Delivers:** SSG marketing pages, SSR product catalog (price ranges only), login/signup, SSO cookie on `.hyperquote.net`.
**Addresses:** SSR + SSG (table stakes)

### Phases 8-14: Portal Features (Quotes, Orders, Catalog)
**Rationale:** Core business value. Quotes and orders are the revenue engine.
**Delivers:** Quote builder, order management, material list builder, customer/supplier dashboards.
**Addresses:** Type-safe server functions (table stakes), real-time updates (table stakes)
**Avoids:** Unbounded queries (performance trap), Realtime subscription leaks

### Phase 15: Internal Platform Shell
**Rationale:** Heaviest app. Must use SPA mode to avoid 128MB Worker memory limit. Glass window paradigm is the most complex UI challenge.
**Delivers:** Internal app shell with floating glass windows, icon strip, command palette, 11-module hotkey system.
**Addresses:** Spatial glass UI (differentiator), keyboard-first navigation (table stakes)
**Avoids:** Dashboard anti-pattern (UX pitfall), Worker memory overflow (Pitfall 6), Escape key conflicts (Pitfall 15)

### Phases 16-23: Internal Modules (Sales, Finance, Inventory, HR)
**Rationale:** Each module is a glass window. Build in dependency order (sales before finance, inventory before logistics).
**Delivers:** 11 internal modules with full CRUD, state machines, approval workflows.

### Phases 24-26: Driver App (Offline-First)
**Rationale:** Requires Capacitor + PowerSync + SQLite. Most complex offline logic. Defer until core platform stable.
**Delivers:** Native mobile driver app, offline delivery flow, POD capture, GPS tracking, conflict resolution.
**Addresses:** Offline-capable driver app (table stakes)
**Avoids:** Offline conflict resolution failures (Pitfall 7), PowerSync `FOR ALL TABLES` bloat

### Phases 27-28: Notifications + WhatsApp
**Rationale:** Requires approved WhatsApp templates (submit to Meta early). 24-hour messaging window constraint.
**Delivers:** WhatsApp OTP, order notifications, delivery updates, fallback chain (WhatsApp -> SMS -> voice).

### Phase 29: ETA E-Invoicing
**Rationale:** HSM certificate must be procured months earlier (parallel to Phase 1). GPC codes mapped by Phase 13. Technical integration is the final step.
**Delivers:** ETA-compliant e-invoicing with digital signatures, credit note references, 7-year storage.
**Avoids:** HSM not procured (Pitfall 4)

### Phase 30: AI Integration
**Rationale:** AI packages are 0.x. Defer until core platform is stable. Wrap behind abstractions.
**Delivers:** 4-tier AI routing, CEO RAG search, AI chat in portal.
**Addresses:** 4-tier AI (differentiator), vector search (differentiator)

### Phases 31-32: Optimization + Testing
**Rationale:** Performance tuning, memory profiling, E2E test suites, Arabic visual regression.
**Delivers:** Production-ready performance, comprehensive test coverage.

### Phase Ordering Rationale

- **Foundation first (1-3):** Auth, database, and shared packages are dependencies for everything. Getting these wrong costs weeks in later phases.
- **Public before private (4-7 before 8-14):** Website validates SSG/SSR patterns with lower complexity before tackling authenticated features.
- **Portal before internal (8-14 before 15-23):** Portal has simpler UI (standard pages) while internal has complex glass window paradigm. Build confidence with simpler app first.
- **Driver app late (24-26):** Offline-first is the highest-complexity feature. Requires stable backend APIs to sync against.
- **Compliance last (29):** ETA e-invoicing is mandatory but has the longest procurement lead time. Start procurement early, build integration late.
- **AI last (30):** All AI packages are 0.x. Deferring reduces risk of API churn disrupting core features.

### Research Flags

**Phases needing deeper research during planning:**
- **Phase 1:** Supabase SSR on Workers -- must validate with actual deployment, not just docs
- **Phase 15:** Internal platform SPA mode -- verify TanStack Start SPA routing with glass window state preservation
- **Phase 24:** PowerSync + Capacitor offline architecture -- selective table sync, conflict resolution patterns
- **Phase 29:** ETA e-invoicing -- HSM signing proxy architecture, GPC code mapping, sandbox testing
- **Phase 30:** AI integration -- 0.x packages may have changed significantly by this phase

**Phases with standard patterns (skip research-phase):**
- **Phases 4-7:** Website SSG/SSR -- well-documented TanStack Start patterns
- **Phases 8-14:** CRUD features -- standard server function + Query + React Aria patterns
- **Phases 16-23:** Internal modules -- repeat the glass window pattern established in Phase 15
- **Phase 27:** Notifications -- standard Supabase Edge Functions + WhatsApp Cloud API

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All core packages verified with official sources and npm registry. Versions current as of 2026-03-31. Only i18next needs bump. |
| Features | HIGH | Feature set derived from comprehensive specs (FRONTEND.md, BACKEND.md). Stack supports all requirements. Table stakes vs differentiators clearly delineated. |
| Architecture | HIGH | 5-Worker pattern proven by Cloudflare docs. Supabase integration well-documented. Data flow is standard TanStack Start pattern. |
| Pitfalls | HIGH (stack), MEDIUM (compliance) | Stack pitfalls verified with GitHub issues and official docs. ETA e-invoicing pitfalls based on third-party guides, not first-hand experience. |

**Overall confidence:** HIGH

### Gaps to Address

- **Supabase SSR on Workers:** Documented fix exists (`nodejs_compat`) but must be validated with actual deployment in Phase 1. Fallback (manual cookie wrapper) is straightforward but untested.
- **ETA e-invoicing HSM providers:** Which Egyptian HSM providers offer cloud-accessible signing APIs (not USB tokens)? Workers cannot access USB hardware. Research Egypt Trust, Digital Egypt, E-Finance cloud HSM offerings before Phase 29.
- **PowerSync selective sync performance:** Documentation confirms selective table sync is possible, but no benchmarks exist for 94-table Supabase instance with driver-relevant subset. Test in Phase 24.
- **TanStack AI 0.x stability:** All three AI packages are pre-1.0. API surface may change before Phase 30. Wrapping behind abstractions mitigates but does not eliminate risk.
- **Worker memory under real SSR load:** The 128MB limit is documented, but real-world memory consumption of TanStack Start SSR with React Aria + Motion is not benchmarked. SPA mode for internal/CEO apps is the safety valve.
- **WhatsApp template approval timeline:** Meta template review takes 1-24 hours but can be rejected. Submit templates well before Phase 27.

## Sources

### Primary (HIGH confidence)
- [TanStack Start v1 Release](https://tanstack.com/blog/announcing-tanstack-start-v1) -- framework stability, Workers support
- [TanStack Start Cloudflare Workers Guide](https://developers.cloudflare.com/workers/framework-guides/web-apps/tanstack-start/) -- deployment config
- [React Aria Components 1.16.0](https://react-spectrum.adobe.com/releases/index.html) -- RTL/i18n support
- [Supabase RLS Performance Best Practices](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv) -- `(SELECT auth.uid())` pattern
- [Cloudflare Workers Limits](https://developers.cloudflare.com/workers/platform/limits/) -- 128MB memory, 10MB script
- [Tailwind CSS v4.0](https://tailwindcss.com/blog/tailwindcss-v4) -- CSS-first config, logical properties
- [TypeScript 6.0](https://devblogs.microsoft.com/typescript/announcing-typescript-6-0/) -- strict default
- [Vitest 4.0](https://vitest.dev/blog/vitest-4) -- browser mode stable

### Secondary (MEDIUM confidence)
- [Supabase SSR + Workers Issue #37592](https://github.com/supabase/supabase/issues/37592) -- `nodejs_compat` mitigation
- [TanStack Start + Workers build issues #6185, #5208](https://github.com/TanStack/router/issues/6185) -- import boundary guidance
- [React Aria I18nProvider SSR Bug #7474](https://github.com/adobe/react-spectrum/issues/7474) -- explicit locale workaround
- [Motion Popover Race #9158](https://github.com/motiondivision/motion/issues/9158) -- CSS transition workaround
- [RHF watch() + React 19 #11910](https://github.com/react-hook-form/react-hook-form/issues/11910) -- useWatch() required
- [Supabase + Cloudflare Integration](https://supabase.com/partners/integrations/cloudflare-workers) -- Hyperdrive connection pooling
- [Zustand v5 React 19 Discussion](https://github.com/pmndrs/zustand/discussions/2686) -- compatibility confirmed

### Tertiary (LOW confidence)
- [ETA E-Invoicing SDK](https://sdk.invoicing.eta.gov.eg/) -- HSM requirements (needs first-hand validation)
- [Egyptian E-Invoicing Guides (Wafeq, Fonoa)](https://www.wafeq.com/en-eg/tax-and-reporting/electronic-invoice-system) -- compliance overview
- [PowerSync + Supabase Integration](https://docs.powersync.com/integration-guides/supabase-+-powersync) -- selective sync (needs benchmarking)

---
*Research completed: 2026-03-31*
*Ready for roadmap: yes*
