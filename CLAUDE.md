# HyperQuote — Claude Code Instructions

**Project:** B2B building materials platform for Egypt. 5 apps, spatial glass UI, Arabic-first.

## Essential Files (Read Before Building ANYTHING)

| File | Purpose | When to Read |
|------|---------|--------------|
| `essential/brand/UI-VISION.md` | Design philosophy — the WHY | Every session. This is the creative north star. |
| `essential/brand/STACK-DECISION.md` | Packages, versions, integration gotchas — the HOW | Before writing any import, config, or setup code. |
| `essential/FRONTEND.md` | Screen-by-screen spec — the WHAT | When building a specific screen. PART 1 = reference (design system + state machines + routes), PART 2 = app specs, PART 3 = cross-cutting flows + business rules. |
| `essential/BACKEND.md` | Database, APIs, auth, cron, integrations — the INFRASTRUCTURE | When implementing server functions, database queries, or integrations. Enums are the source of truth for TypeScript types. |
| `essential/RESEARCH.md` | Business domain knowledge — the CONTEXT | When you need to understand WHY a business rule exists. |

## Ownership Mindset

This is the founder's life work. Treat every file, every line, every decision as if the success of this company depends on it — because it does.

**Act like a co-founder, not a contractor.** A contractor does what's asked. A co-founder does what's needed. Anticipate problems. Flag risks before they bite. Suggest improvements without being asked. Care about the details because the details ARE the product.

**Craftsmanship over speed.** A feature built right once is worth more than a feature built fast twice. When choosing between "good enough" and "excellent," choose excellent. Egyptian contractors will judge HyperQuote in the first 10 seconds — every pixel, every animation, every Arabic numeral matters.

**Protect the vision.** The spatial glass UI, the three-color rule, the 4-hour quote response — these aren't arbitrary constraints. They're what makes HyperQuote different from every B2B platform that looks like a boring dashboard. Defend these choices in implementation. Don't dilute them for convenience.

**Think downstream.** Every shortcut in Phase 1 becomes a bug in Phase 16. Every missing index becomes a slow query at scale. Every skipped RTL test becomes a broken layout for Arabic users. Build for the company HyperQuote will be, not just the MVP it starts as.

## Quality Standard

**"Fix all" means fix ALL.** When told to fix, audit, verify, or resolve issues — address every single item regardless of severity. No silent triage. No downgrading. No rationalizing gaps as "acceptable" or "the implementer will figure it out."

- **Never silently skip low-severity items.** If you find it, fix it.
- **Never soften verdicts.** If an auditor says "NEEDS WORK", report "NEEDS WORK" — not "micro-detail gaps."
- **Never rationalize omissions.** "The subagent reads the spec anyway" is not a reason to leave gaps in context files.
- **Never require the user to escalate.** "Fix all" already means low, medium, high, critical, and nice-to-have. The user should never have to say it twice.

If a task is too large to complete in one pass, say so upfront and propose batching — don't silently deprioritize.

## Non-Negotiable Rules

### Design — Three Laws

1. **Three colors only.** White (#FFFFFF), Black (#0F172A / #09090B), Blue (#2563EB). Semantic status colors (green/yellow/red) for DATA only, not design. No slate-200, no zinc-500, no navy variants.
2. **Spatial glass, not dashboards.** Apps are calm environments where you summon what you need via glass windows. No sidebars, no breadcrumbs, no traditional navigation. Glass windows float over empty space. See UI-VISION.md Section 3.
3. **Geist Mono for ALL numbers.** Prices, quantities, IDs, dates, timestamps, percentages, phone numbers. If it's a number, it's monospace. No exceptions.

### Architecture — Five Laws

1. **TanStack Start, NOT Next.js.** Use `@tanstack/react-start` (v1.167.12+). NOT `@tanstack/start` (frozen). NOT Next.js. NOT Remix. Never.
2. **React Aria Components, NOT shadcn.** Use `react-aria-components` for all interactive elements. Never install shadcn, Radix, Headless UI, or any other UI primitive library.
3. **Motion v12, NOT framer-motion.** The package is called `motion` (v12+). `framer-motion` is the old name. Import from `motion/react`.
4. **Bun, NOT npm/yarn/pnpm.** Use `bun add`, `bun run`, `bun install`. Never `npm install` or `yarn add`.
5. **Cloudflare Workers, NOT Vercel/Netlify.** Deploy target is always Cloudflare Workers. Use `@cloudflare/vite-plugin`.

### Code — Five Laws

1. **`useWatch()`, NEVER `watch()`.** React Hook Form's `watch()` is broken with React 19 / React Compiler. Always use `useWatch()`.
2. **`.inputValidator()`, NOT `.validator()`.** For TanStack Start server functions, use `.inputValidator()` with Zod.
3. **Colors in `:root {}`, NEVER in `@theme`.** Tailwind v4 critical: `--color-*` in `@theme` collides with built-in utilities. Keep colors in `:root {}`.
4. **`ClientOnly` for maps.** MapLibre GL must be wrapped in `ClientOnly` for SSR compatibility. Never render maps server-side.
5. **`isKeyboardDismissDisabled` on Dialogs.** React Aria Dialog and global hotkeys both fire on Escape. Set `isKeyboardDismissDisabled` on Dialog, handle Escape via hotkeys only.

## Egyptian Business Context (Quick Reference)

- **VAT:** 14% on all invoices
- **E-Invoicing:** Real-time submission to Egyptian Tax Authority (ETA). Arabic required.
- **Work week:** Sunday-Thursday. Weekend: Friday + Saturday.
- **Payment methods:** Bank wire, cheque, cash, Letter of Credit ONLY. No mobile wallets.
- **Post-dated cheques:** Criminal offense if bounced (Egyptian law).
- **Currency:** EGP (Egyptian Pound). Geist Mono. `Intl.NumberFormat`.
- **ALL numbers → Arabic-Indic numerals in Arabic context.** No exceptions.
- **ALL units → Arabic translations.** kg → كجم, ton → طن, m² → م². See FRONTEND.md DS.9.

<!-- GSD:project-start source:PROJECT.md -->
## Project

**HyperQuote**

A B2B building materials logistics platform for the Egyptian market, operating on a quote-based RFQ model with no published prices and no online payments. Five apps — a marketing website, an internal employee platform (11 modules), a customer+supplier portal, a CEO command center, and a native driver app — sharing one Supabase backend on Cloudflare Workers. White-label architecture with configurable branding per tenant.

**Core Value:** Egyptian contractors can request quotes for building materials and receive responses within 4 hours — faster than any competitor — through an AI-powered platform that coordinates suppliers, deliveries, and payments behind a single branded experience.

### Constraints

- **Stack:** TanStack Start (NOT Next.js), React Aria (NOT shadcn), Motion v12 (NOT framer-motion), Bun (NOT npm), Cloudflare Workers (NOT Vercel). Non-negotiable.
- **Design:** Three colors only (white/black/blue #2563EB). Geist Mono for ALL numbers. Spatial glass, not dashboards. See UI-VISION.md.
- **Egyptian law:** ETA e-invoicing mandatory, 14% VAT, bounced cheque is criminal offense, Cairo heavy truck ban 6AM-midnight, Friday Jumu'ah blackout 11:30-1:30 PM.
- **Known risks:** @supabase/ssr stream polyfill on Workers (test Phase 1), React Hook Form watch() broken with React 19 (use useWatch()), TanStack AI/Hotkeys are 0.x (wrap behind abstractions), Vite 8 incompatible (stay on 7).
- **Offline:** Driver app must work fully offline (PowerSync + SQLite). Other apps: read-only offline with mutations disabled.
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

## Executive Assessment
## Recommended Stack
### Core Framework
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| TanStack Start (`@tanstack/react-start`) | ^1.167.12 (latest: 1.167.13) | Full-stack SSR/SSG/SPA framework | Native Cloudflare Workers support, type-safe server functions, pure Vite 7 (no vinxi), SSR streaming. The only React framework with first-class Workers deployment via `@cloudflare/vite-plugin`. | HIGH |
| React | ^19.2.4 | UI library | Current stable. Activity API and useEffectEvent available. React Compiler shipping. | HIGH |
| TypeScript | ^6.0.2 | Type system | Released 2026-03-23. Last JS-based compiler (TS 7 will be Go-native). `strict: true` now default. Target defaults to ES2025. | HIGH |
| Vite | ^7.3.1 | Build tool | **Stay on Vite 7. Do NOT upgrade to Vite 8.** TanStack Start reports "not responding" on Vite 8 (Rolldown-based). The Cloudflare Vite plugin and TanStack Start plugin both work on Vite 7. Monitor for official Vite 8 support. | HIGH |
### Styling & UI
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Tailwind CSS | ^4.2.2 | Utility-first CSS | Current latest (published 2026-03-18). CSS-first config via `@theme`. Logical properties (`ps-*/pe-*/ms-*/me-*`) for RTL. `@tailwindcss/vite` plugin required. | HIGH |
| React Aria Components | ^1.16.0 | Accessible UI primitives | Current latest. Best-in-class RTL/Arabic support via I18nProvider (38 locales, Arabic-Indic numerals, Islamic calendar). React 19 ref cleanup supported. **Stay on 1.x -- v3 nightly exists but is unstable.** | HIGH |
| tailwindcss-react-aria-components | ^2.0.1 | Tailwind + React Aria integration | Use `@plugin` directive in CSS, NOT `@import`. `group-selected:` may break with TW v4 -- fallback to `group-data-[selected]:`. | MEDIUM |
| Motion | ^12.38.0 | Animation | Current latest (published 2026-03-16). Import from `motion/react`, NOT `framer-motion`. Hardware-accelerated scroll animations, oklch color support. | HIGH |
| lucide-react | ^1.7.0 | Icons | Tree-shaken, ~200-300 bytes per icon. | HIGH |
### State Management
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Zustand | ^5.0.12 | Client UI state | Current latest. React 19 compatible via native `useSyncExternalStore`. SSR: use `skipHydration: true` + `rehydrate()` in useEffect. Use `useShallow` to prevent infinite loops from new reference returns. | HIGH |
| TanStack Query | ^5.95.2 | Server state / cache | SSR hydration via `@tanstack/react-router-ssr-query` (automatic dehydrate/hydrate/streaming). `maxPages` for infinite scroll. | HIGH |
| TanStack Router (search params) | ^1.168.0 | URL state | Built-in Zod `validateSearch` for type-safe URL params. | HIGH |
| @xstate/store | ^3.17.1 | Keyboard scope FSM | <1KB gzipped. Canvas/Panel/Input state machine transitions. | HIGH |
| React Hook Form | ^7.72.0 | Form state | **Critical: use `useWatch()` everywhere, NEVER `watch()`.** `watch()` is broken with React 19 / React Compiler. Use `@hookform/resolvers` 5.2.2 with `standardSchemaResolver`, NOT `zodResolver`. | HIGH |
### Internationalization
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| react-i18next | ^17.0.1 | React i18n bindings | Current latest (published 2026-03-29). Type-safe keys via `resources.d.ts`. 6 Arabic plural forms. | HIGH |
| i18next | **^26.0.1** | i18n core | **UPDATE NEEDED: STACK-DECISION.md says 25.10.10, but i18next 26 shipped 2026-03-29.** react-i18next 17.0.1 requires >= 25.10.9 as peer dep -- 25.10.10 technically works, but 26.0.1 is the intended target. Breaking change: `interpolation.format` removed (use `i18n.services.formatter.add()`). No functional breaking changes. | HIGH |
### AI
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| @tanstack/ai | ^0.9.1 | AI SDK | **0.x -- wrap behind abstraction.** Native TanStack Start integration. SSE streaming, tool calling. | MEDIUM |
| @tanstack/ai-react | ^0.7.5 | React AI hooks | **0.x -- wrap behind abstraction.** `useChat()` for streaming. AbortController cancellation. | MEDIUM |
| @cloudflare/tanstack-ai | ^0.1.6 | Workers AI adapter | **0.x -- wrap behind abstraction.** First-party Cloudflare AI Gateway support. | LOW |
### Interaction
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| @tanstack/react-hotkeys | ^0.8.3 | Keyboard shortcuts | **0.x pre-alpha -- wrap behind thin `useShortcut()` abstraction.** If unstable, swap to `react-hotkeys-hook`. Conflict with React Aria Dialog Escape -- use `isKeyboardDismissDisabled`. | LOW |
| fuse.js | ^7.1.0 | Client-side fuzzy search | Plugs into React Aria Autocomplete custom filter. Lightweight. | HIGH |
### Infrastructure
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Cloudflare Workers | Runtime | Deployment target | Native TanStack Start support via `@cloudflare/vite-plugin`. Auto-detect on `wrangler deploy`. KV, R2, Durable Objects, AI Gateway, Hyperdrive all available. | HIGH |
| @cloudflare/vite-plugin | ^1.30.2 | Vite plugin for Workers | `viteEnvironment: { name: 'ssr' }` config. Must be first plugin in Vite config. | HIGH |
| Supabase (PostgreSQL) | Latest | Database + Auth + Realtime + Storage | 94 tables, 50 enums, RLS for 25+ roles. pgvector for embeddings. Edge Functions for webhooks. | HIGH |
| @supabase/ssr | ^0.9.0 | SSR auth cookie handling | **RISK: `dynamic require of "stream"` on Workers.** Mitigation: add `nodejs_compat` compatibility flag in wrangler.jsonc. Test in Phase 1. `beforeLoad` pattern for zero-flash SSR auth. | MEDIUM |
| @supabase/supabase-js | ^2.100.1 | Supabase client | Works with `nodejs_compat` flag on Workers. | HIGH |
| Cloudflare R2 | Service | Public asset storage | For static files, product images, documents. | HIGH |
| Cloudflare Hyperdrive | Service | DB connection pooling | Cached config for reads, uncached for writes. | HIGH |
| Bun | Latest | Package manager + scripts | `bun add`, `bun run`, `bun install`. 10x faster than npm. Bun workspaces for monorepo. | HIGH |
| Turborepo | ^2.8.21 | Monorepo task runner | Parallel builds, task caching, composable config (2.7+). `turbo devtools` for visual package/task graph. | HIGH |
### Domain-Specific (Phase 17+)
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| maplibre-gl | ^5.21.0 | Map rendering | Arabic labels via MapTiler. **Must wrap in `ClientOnly` for SSR.** Breaking changes in v5: new `canvasContextAttributes`, `on()` returns Subscription. | MEDIUM |
| react-map-gl | ^8.1.0 | React map wrapper | Import via `react-map-gl/maplibre`. | MEDIUM |
| pmtiles | ^4.4.0 | Offline map tiles | Cairo vector tiles ~200-400MB for driver app. | MEDIUM |
| @transistorsoft/capacitor-background-geolocation | ^9.0.2 | Driver GPS tracking | Requires Capacitor 8. $399 Starter license. Background GPS, geofencing, offline buffering. | MEDIUM |
### Developer Experience
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Vitest | ^4.1.2 | Unit/component tests | Browser Mode now stable (promoted from experimental in 4.0). Playwright Trace Viewer integration in 4.1. **Use `bun run vitest`, NOT `bun test`** (MSW incompatible with Bun's test runner). | HIGH |
| Playwright | ^1.58.2 | E2E tests | Current latest. Keyboard testing, visual regression, Arabic RTL layout testing. | HIGH |
| Storybook | ^10.3.3 | Component dev | Needs `@tailwindcss/vite` in `viteFinal` config for Tailwind v4. | HIGH |
| MSW | ^2.12.14 | API mocking | Works in Vitest browser mode. Does NOT work with `bun test`. | HIGH |
| Biome | ^2.4.8 | Format + lint | 15-25x faster than Prettier + ESLint combined. | HIGH |
| ESLint | ^10.1.0 | React hooks lint only | Only for `eslint-plugin-react-hooks` (React Compiler rules). Biome handles everything else. | HIGH |
| Lefthook | ^2.1.4 | Git hooks | Go binary, parallel execution, native staged-file filtering. | HIGH |
| wrangler | ^4.77.0 | Cloudflare CLI | Deploy, dev, secrets management. | HIGH |
## Version Updates Required (vs STACK-DECISION.md)
| Package | STACK-DECISION.md | Current Latest | Action | Risk |
|---------|-------------------|----------------|--------|------|
| i18next | 25.10.10 | **26.0.1** | **Update required.** react-i18next 17.0.1 targets i18next 26. Only breaking change: `interpolation.format` removed. | Low |
| @tanstack/react-start | 1.167.12 | 1.167.13 | Minor patch. Update when convenient. | None |
| react-i18next | 17.0.0 | 17.0.1 | Patch. Update when convenient. | None |
| All others | As specified | Same | No changes needed. | None |
## Alternatives Considered
| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Framework | TanStack Start | Next.js 15 | No native Cloudflare Workers support. Vercel-centric. RSC adds complexity without clear benefit for this use case. |
| Framework | TanStack Start | Remix / React Router 7 | Less type-safe server functions. No built-in SSG mode. Weaker TanStack ecosystem integration. |
| UI Primitives | React Aria Components | shadcn/ui (Radix) | Inferior RTL/Arabic support. No I18nProvider with 38 locales. No Arabic-Indic numeral formatting. Accessibility is afterthought vs first-class. |
| UI Primitives | React Aria Components | Headless UI | Smaller component set. No form components. No i18n. |
| Animation | Motion v12 | GSAP | License issues for SaaS. Motion is free, open-source, React-native API. |
| Animation | Motion v12 | CSS only | Insufficient for spring physics, layout animations, gesture-based interactions. |
| State | Zustand | Redux Toolkit | Zustand is simpler, smaller, no boilerplate. RTK overkill for UI state when TanStack Query handles server state. |
| State | Zustand | Jotai | Atomic model adds indirection. Zustand's slice pattern maps better to glass window modules. |
| Forms | React Hook Form | TanStack Form | TanStack Form is newer, less ecosystem. RHF has proven React 19 path (`useWatch`). `@hookform/resolvers` integrates Zod. |
| Build | Vite 7 | Vite 8 (Rolldown) | TanStack Start breaks on Vite 8. Stay on 7 until official support. |
| i18n | react-i18next | next-intl | next-intl is Next.js-specific. react-i18next works everywhere. |
| Monorepo | Turborepo | Nx | Nx is heavier, more opinionated. Turborepo is simpler, faster for JS-only monorepos. Composable config in 2.7+. |
| Deploy | Cloudflare Workers | Vercel | Workers has lower cold start (~0ms vs ~250ms), global edge by default, cheaper at scale. First-class TanStack Start support. |
| Database | Supabase | PlanetScale | No built-in auth, realtime, storage, vector search. Supabase is a complete backend. |
## What NOT to Use
| Package/Pattern | Why Not |
|-----------------|---------|
| `@tanstack/start` | Frozen at 1.120.20. Use `@tanstack/react-start` only. |
| `vinxi` | Removed since TanStack Start v1.121.0. Do NOT install. |
| `framer-motion` | Old package name. The package is `motion`. Import from `motion/react`. |
| shadcn/ui, Radix, Headless UI | React Aria Components is the only UI primitive library. Non-negotiable. |
| Next.js, Remix | TanStack Start is the framework. Non-negotiable. |
| npm, yarn, pnpm | Bun only. Non-negotiable. |
| `watch()` from RHF | Broken with React 19 / React Compiler. Always `useWatch()`. |
| `.validator()` for server fns | Use `.inputValidator()` with Zod. |
| `zodResolver` | Use `standardSchemaResolver` from `@hookform/resolvers`. |
| Colors in `@theme {}` | `--color-*` in `@theme` collides with Tailwind built-in utilities. Colors go in `:root {}`. |
| Vite 8 | TanStack Start incompatible. Stay on Vite 7. |
| `ssr.tsx` entry file | Obsolete in TanStack Start v1.121.0+. Delete if present. |
| `srcDirectory: 'app'` | Never override. `src/` is the default. |
## Critical Integration Points to Test in Phase 1
### 1. Supabase SSR on Cloudflare Workers (HIGHEST RISK)
### 2. React Aria I18nProvider SSR Hydration (HIGH RISK)
### 3. Vite Plugin Order (MEDIUM RISK)
### 4. Motion Popover Race Condition (MEDIUM RISK)
## Installation
# Core framework + React
# Styling + UI
# State management
# i18n
# AI (0.x -- all wrapped behind abstractions)
# Interaction
# Infrastructure
# Dev dependencies
## Sources
- [TanStack Start v1 Release](https://tanstack.com/blog/announcing-tanstack-start-v1) -- framework stability confirmation
- [TanStack Start Cloudflare Workers Guide](https://developers.cloudflare.com/workers/framework-guides/web-apps/tanstack-start/) -- deployment configuration
- [Vite 8 + TanStack Start incompatibility](https://github.com/vitejs/vite/issues/21496) -- stay on Vite 7
- [React Aria Components Releases](https://react-spectrum.adobe.com/releases/index.html) -- version 1.16.0 current
- [Tailwind CSS v4.0 Release](https://tailwindcss.com/blog/tailwindcss-v4) -- CSS-first configuration
- [Supabase SSR + Workers stream issue #37592](https://github.com/supabase/supabase/issues/37592) -- nodejs_compat mitigation
- [TypeScript 6.0 Announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-6-0/) -- last JS-based release
- [React 19.2 Release](https://react.dev/blog/2025/10/01/react-19-2) -- Activity API, useEffectEvent
- [Zustand v5 React 19 Discussion](https://github.com/pmndrs/zustand/discussions/2686) -- compatibility confirmed
- [React Hook Form watch() + React 19 Issue #11910](https://github.com/react-hook-form/react-hook-form/issues/11910) -- useWatch() required
- [i18next Migration Guide](https://www.i18next.com/misc/migration-guide) -- v25 to v26 changes
- [Vitest 4.0 Release](https://vitest.dev/blog/vitest-4) -- browser mode stable
- [Vite 8 Announcement](https://vite.dev/blog/announcing-vite8) -- Rolldown migration path
- [Motion npm](https://www.npmjs.com/package/motion) -- v12.38.0 current
- [Turborepo 2.8](https://github.com/vercel/turborepo/releases) -- composable config, devtools
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
