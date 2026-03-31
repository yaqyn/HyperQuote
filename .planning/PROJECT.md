# HyperQuote

## What This Is

A B2B building materials logistics platform for the Egyptian market, operating on a quote-based RFQ model with no published prices and no online payments. Five apps — a marketing website, an internal employee platform (11 modules), a customer+supplier portal, a CEO command center, and a native driver app — sharing one Supabase backend on Cloudflare Workers. White-label architecture with configurable branding per tenant.

## Core Value

Egyptian contractors can request quotes for building materials and receive responses within 4 hours — faster than any competitor — through an AI-powered platform that coordinates suppliers, deliveries, and payments behind a single branded experience.

## Requirements

### Validated

- [x] Dual auth pools (external/internal) with SSO within pools, cross-pool impossible — Validated in Phase 2: Supabase + Initial Migrations
- [x] Monorepo with 6 shared packages, Bun workspaces, Turborepo, 5 Cloudflare Workers — Validated in Phase 1: Monorepo Scaffold
- [x] Spatial glass UI: three colors (white/black/blue), glass windows over empty space, spring enter/tween exit — Validated in Phase 3: Shared Packages (GlassWindow component)
- [x] Full bilingual support: Arabic primary (RTL), English secondary, Geist Mono for all numbers — Validated in Phase 3: Shared Packages (i18n + display components)
- [x] Website with SSG+SSR marketing pages, product catalog with price ranges — Validated in Phase 4+5: Website Layout + Market + Product Detail

### Active

- [ ] Website with SSG+SSR marketing pages, product catalog with price ranges, AI chatbot for lead capture
- [ ] Progressive signup (phone OTP, 4 fields) with account claiming for phone-created customers
- [ ] Customer portal with AI-centered chat, material list builder, quote management, order tracking
- [ ] Quote-to-cash lifecycle: quote request → supplier sourcing → quote building → negotiation → order → PO → delivery → invoice → payment
- [ ] Internal platform with 11 glass-window modules: Sales, Procurement, Orders, Warehouse, Finance, Dispatch, Support, HR, Admin, Reports, AI
- [ ] Live quoting with three pricing tiers (instant/fast/standard) and margin guardrails
- [ ] Supplier portal: catalog publishing (AI-parsed), stock management, PO inbox, invoice submission, analytics
- [ ] Driver app (Capacitor native): offline-first, GPS tracking, proof of delivery, route management
- [ ] CEO app: search-bar-only interface with dual AI (analytics + RAG), zero accent colors
- [ ] Dual auth pools (external/internal) with SSO within pools, cross-pool impossible
- [ ] Egyptian compliance: 14% VAT, ETA e-invoicing (real-time), withholding tax, Arabic-Indic numerals
- [ ] Spatial glass UI: three colors (white/black/blue), glass windows over empty space, spring enter/tween exit
- [ ] Full bilingual support: Arabic primary (RTL), English secondary, Geist Mono for all numbers
- [ ] Offline payments only: wire transfer, post-dated cheques, cash, letters of credit — no payment gateway
- [ ] Credit management with 5-tier customer model, composite scoring, graduated late payment response
- [ ] Soft/hard inventory reservations with supplier stock freshness tracking
- [ ] Dispatch with route optimization, Cairo truck ban enforcement, prayer time buffers, Khamsin weather alerts
- [ ] AI 4-tier architecture: GLM (free classifier) → Groq (fast chat) → Mistral (OCR) → Claude (complex reasoning)
- [ ] Monorepo with 6 shared packages, Bun workspaces, Turborepo, 5 Cloudflare Workers

### Out of Scope

- Online payments (Stripe, ACH, mobile wallets) — Egyptian B2B runs on offline instruments
- EDI/X12 integration — Supplier Portal replaces EDI for regional suppliers
- Native mobile apps for portal — PWA at launch, native only after 6-12 months if data supports
- Own inventory at launch — pure drop-ship model, warehouse operations at Phase 2 ($5-10M revenue)
- US/Saudi-specific compliance (FMCSA, ZATCA, mechanic's lien) — Egyptian market only at launch

## Context

- **Market:** Egypt's building materials distribution runs on phone calls, WhatsApp, and paper. No digital-first competitor exists.
- **Business model:** Trading/distribution (drop-ship). HyperQuote is the seller of record, sources from 2-5 suppliers per category, applies margins, delivers under its own brand. Supplier identity known but prices never reach customer.
- **Database:** 94 tables + 2 materialized views, 50 enums across 16 domains. 179+ migrations. PostgreSQL on Supabase with RLS for 25+ roles.
- **Design mandate:** Spatial glass philosophy per UI-VISION.md. NOT dashboards. Glass windows float over empty space. Keyboard-first with hotkeys per module.
- **Stack:** TanStack Start v1 + React Aria Components + Motion v12 + Tailwind CSS v4 + Zustand + react-i18next. See STACK-DECISION.md for exact versions and known integration issues.
- **Research:** 87 parallel research agents produced 40+ detailed research files covering every domain. All synthesized into essential/RESEARCH.md.
- **Spec depth:** Screen-by-screen frontend spec (6620 lines), complete backend spec (6329 lines), full design system (DS.1-DS.20), all state machines (SM.1-SM.8), all route maps.

## Constraints

- **Stack:** TanStack Start (NOT Next.js), React Aria (NOT shadcn), Motion v12 (NOT framer-motion), Bun (NOT npm), Cloudflare Workers (NOT Vercel). Non-negotiable.
- **Design:** Three colors only (white/black/blue #2563EB). Geist Mono for ALL numbers. Spatial glass, not dashboards. See UI-VISION.md.
- **Egyptian law:** ETA e-invoicing mandatory, 14% VAT, bounced cheque is criminal offense, Cairo heavy truck ban 6AM-midnight, Friday Jumu'ah blackout 11:30-1:30 PM.
- **Known risks:** @supabase/ssr stream polyfill on Workers (test Phase 1), React Hook Form watch() broken with React 19 (use useWatch()), TanStack AI/Hotkeys are 0.x (wrap behind abstractions), Vite 8 incompatible (stay on 7).
- **Offline:** Driver app must work fully offline (PowerSync + SQLite). Other apps: read-only offline with mutations disabled.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| TanStack Start over Next.js | Type-safe, native Cloudflare Workers support, SSG+SSR+SPA modes in one framework | — Pending |
| React Aria over shadcn | Best-in-class RTL/Arabic, accessibility-first, I18nProvider with 38 locales | — Pending |
| Supabase over custom backend | RLS, Realtime, pgvector, Auth, Edge Functions — all integrated. SSO via cookie domain | — Pending |
| 4-tier AI over all-Claude | $61/mo vs $100-240/mo. GLM for routing, Groq for speed, Mistral for OCR, Claude for reasoning | — Pending |
| Drop-ship at launch, no inventory | Asset-light trading model. Warehouse at $5-10M revenue. Reduces upfront capital | — Pending |
| PWA over native for portal | 17-76% higher conversion. One codebase. Native only after 6-12 months if data shows need | — Pending |
| Dual auth pools | External (customers/suppliers/drivers) and internal (employees/CEO) completely isolated. Security non-negotiable | — Pending |
| WhatsApp-first support | Egyptian construction lives on WhatsApp. 99.5% delivery rate vs 85% SMS. Primary channel for all comms | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-03-31 after Phase 5 completion*
