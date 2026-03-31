# Feature Landscape

**Domain:** B2B Building Materials Platform (Egypt)
**Researched:** 2026-03-31
**Note:** This file covers stack-driven feature considerations, not the full product feature set (see FRONTEND.md and BACKEND.md for complete specs).

---

## Table Stakes (Stack-Enabled)

Features the stack must support. Missing = wrong stack choice.

| Feature | Why Expected | Stack Component | Complexity | Notes |
|---------|--------------|-----------------|------------|-------|
| SSR + SSG in one framework | SEO for website, fast TTFB for portal | TanStack Start | Low | Built-in. SSG for marketing, SSR for dynamic pages |
| Arabic-first RTL | Primary market is Egypt | React Aria I18nProvider + Tailwind logical props | Medium | 38 locales, Arabic-Indic numerals, Islamic calendar |
| Type-safe server functions | Security boundary between client/server | TanStack Start `createServerFn` | Low | `.inputValidator()` with Zod |
| Real-time updates | Order status, notifications, GPS | Supabase Realtime | Medium | Invalidates TanStack Query cache |
| Offline-capable driver app | Construction sites have poor connectivity | Capacitor + PowerSync + SQLite | High | Full mutation queue, conflict resolution |
| RLS-based multi-tenancy | Data isolation per tenant | Supabase RLS + 25+ roles | Medium | `(SELECT auth.uid())` pattern for performance |
| PDF generation | Invoices, quotes, delivery notes | pdf-lib (server-side) | Medium | Arabic primary, Geist Mono for numbers |
| Keyboard-first navigation | Internal platform efficiency | TanStack Hotkeys + React Aria | Medium | 11 module hotkeys, command palette |

## Differentiators (Stack-Enabled)

Features the stack makes uniquely possible or easier than alternatives.

| Feature | Value Proposition | Stack Component | Complexity | Notes |
|---------|-------------------|-----------------|------------|-------|
| Zero cold-start SSR | Faster than competitors on Vercel/AWS Lambda | Cloudflare Workers (~0ms cold start) | Low | Workers V8 isolates vs Lambda containers |
| 4-tier AI with cost control | $61/mo vs $100-240/mo all-Claude | Cloudflare AI Gateway + TanStack AI | High | GLM -> Groq -> Mistral -> Claude routing |
| Spatial glass UI | Not a dashboard -- calm, focused UX | Motion v12 spring/tween + React Aria | Medium | Spring enter (stiffness 200, damping 20), tween exit |
| Global edge deployment | Low latency for Egypt + future markets | Cloudflare Workers global network | Low | No region selection needed |
| Embedded vector search (CEO RAG) | Natural language queries over business data | Supabase pgvector + Workers AI bge-m3 | High | Multilingual Arabic+English embeddings |

## Anti-Features (Stack Constraints)

Features to explicitly NOT build due to stack choices.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| React Server Components | TanStack Start does not support RSC yet. Do not use `"use server"` RSC patterns | Use TanStack Start server functions (`createServerFn`) for server-side logic |
| Edge-side persistent DB connections | Workers cannot maintain persistent DB connections | Use Supabase client library (HTTP-based) or Cloudflare Hyperdrive for connection pooling |
| Server-side map rendering | MapLibre GL requires DOM/canvas | Wrap in `ClientOnly`. Generate static map images server-side only if needed |
| Native mobile apps (portal) | PWA first, native only after 6-12 months data | Use PWA manifest + service worker. Only driver app is native (Capacitor) |
| Payment gateway integration | Egyptian B2B runs on offline instruments | Record payments manually: wire, cheque, cash, LC. No Stripe/PayPal |

## Feature Dependencies (Stack-Driven)

```
Supabase Auth + RLS --> Every authenticated feature
TanStack Query SSR hydration --> Every SSR page with data
React Aria I18nProvider --> Every component with Arabic text
Tailwind v4 + tokens.css --> Every styled component
Zustand stores --> Glass window state, theme, sidebar
Cloudflare Workers deployment --> All 5 apps (except driver which is Capacitor)
```

## MVP Stack Validation

Before building features, validate these stack integrations (Phase 1):

1. **Supabase SSR on Workers** -- Auth cookie read/write with `nodejs_compat`
2. **TanStack Start SSR** -- Server function returns data, page renders with hydration
3. **React Aria + Tailwind v4** -- Component renders with correct styles, RTL flips
4. **Vite 7 + Cloudflare plugin** -- Build succeeds, deploy works, dev server hot-reloads

Defer: AI integration (Phase 30), Maps (Phase 17), Capacitor (Phase 24)

---

## Sources

- Stack validation based on STACK-DECISION.md audit (2026-03-28) and web search verification (2026-03-31)
- Feature set derived from PROJECT.md requirements and GSD.md phase map
