# HyperQuote — GSD Implementation Guide

**Project:** B2B building materials platform for Egypt. 5 apps, 94 database tables, 15,923 lines of spec.
**Goal:** Ship a working MVP using GSD plugin phases, building end-to-end features (backend + frontend together).

---

## How to Use This File

Run `/gsd:new-project` and point GSD at this file + `CLAUDE.md`. GSD will use this as the roadmap. Each phase below is designed to be one GSD phase — completable in one session, testable, and has clear dependencies.

**Before every phase, Claude should read:**
1. `CLAUDE.md` (always — guardrails)
2. The relevant FRONTEND.md section (screen spec for the feature)
3. The relevant BACKEND.md section (tables + server functions for the feature)
4. `STACK-DECISION.md` (if touching config, imports, or new packages)

---

## Architecture Quick Reference

```
Monorepo (Bun workspaces + Turborepo)
├── apps/website        TanStack Start, SSG+SSR, Cloudflare Workers
├── apps/portal         TanStack Start, SSR, Cloudflare Workers
├── apps/internal       TanStack Start, SPA, Cloudflare Workers
├── apps/ceo            TanStack Start, SPA/PWA, Cloudflare Workers
├── apps/driver         Vite + React SPA + Capacitor (NOT TanStack Start)
├── packages/ui         GlassWindow, StatusBadge, Toast, Skeleton, etc.
├── packages/types      TypeScript types from database enums
├── packages/auth       Supabase SSR + SSO cookie
├── packages/i18n       react-i18next config + AR/EN translations
├── packages/forms      React Hook Form + Zod + React Aria
├── packages/tables     TanStack Table + React Aria
└── supabase/           Migrations from BACKEND.md
```

---

## Phase Map (32 Phases)

### FOUNDATION (Phases 1-3) — No dependencies, must be first

#### Phase 1: Monorepo Scaffold
**What:** Create the monorepo structure with all 5 apps + 7 shared packages.
**Read:** CLAUDE.md (monorepo structure + vite config), STACK-DECISION.md (all package versions + dependency JSON)
**Build:**
- Root `package.json` with Bun workspaces
- `turbo.json` for parallel builds
- Each app: `package.json` + `vite.config.ts` + `tsconfig.json`
- TanStack Start entry files for website/portal/internal/ceo (`router.tsx`, `client.tsx`, `routes/__root.tsx`)
- Driver app: plain Vite config (no tanstackStart, no cloudflare)
- Each shared package: `package.json` + `tsconfig.json` + `src/index.ts` barrel export
- `.biome.json` + `.eslintrc` (hooks only) + `lefthook.yml`
**Verify:** `bun install` succeeds, `bun run dev --filter=website` starts without errors
**Tips:**
- Use `@tanstack/react-start` NOT `@tanstack/start` (frozen)
- Plugin order matters: cloudflare → tailwindcss → tanstackStart → react
- Do NOT install vinxi
- Driver app has its own vite config without tanstackStart() or cloudflare()

#### Phase 2: Supabase + Initial Migrations
**What:** Set up Supabase project, create extensions + all 50 enums + auth/tenant tables.
**Read:** BACKEND.md Section 2 (Enums) + Section 3 (Tables — auth domain only) + Section 4 (Auth functions)
**Build:**
- `supabase init` in project root
- Migration 001: extensions (`pgcrypto`, `pg_trgm`, `pgvector`, `pg_cron`, `supa_audit`)
- Migration 002: all 50 enums from BACKEND.md Section 2
- Migration 003: `tenants`, `user_profiles`, `user_roles`, `role_permissions`, `employees` tables
- Migration 004: auth helper functions (12 functions from Section 4)
- Migration 005: custom_access_token_hook
- Migration 006: role_permissions seed data from Section 12.1
- `supabase db push` or `supabase migration up`
**Verify:** `supabase status` shows running, tables exist, enums queryable
**Tips:**
- All enums use CREATE TYPE IF NOT EXISTS pattern
- Currency default is EGP, timezone default is Africa/Cairo
- customer_tier uses: tier_1_new, tier_2_verified, tier_3_established, tier_4_preferred, tier_5_suspended

#### Phase 3: Shared Packages
**What:** Build the 7 shared packages that all apps import from.
**Read:** FRONTEND.md PART 1 (Shared Design System DS.1-DS.21), BACKEND.md Section 13 (TypeScript Types), brand/tokens.css, brand/fonts/font-face.css
**Build:**
- `@hyperquote/types`: All TypeScript types from BACKEND.md Section 13 (enums as union types + entity interfaces)
- `@hyperquote/ui`: GlassWindow, GlassElevated, StatusBadge, Skeleton, EmptyState, Toast, CurrencyDisplay, DateDisplay, UnitDisplay, OfflineBanner, LionMark, CommandPalette (from DS.17)
- `@hyperquote/i18n`: react-i18next config, AR+EN namespace files, number formatting utils, unit translations
- `@hyperquote/auth`: Supabase SSR client factory, `beforeLoad` auth guard, session helpers, SSO cookie config
- `@hyperquote/forms`: React Hook Form + Zod integration, React Aria form field wrappers, standardSchemaResolver
- `@hyperquote/tables`: TanStack Table + React Aria table component, sort/filter/select patterns
- Copy brand assets: tokens.css, font-face.css, WOFF2 files, logos into the appropriate package or public dirs
**Verify:** Each package builds, types compile, GlassWindow renders in a test app
**Tips:**
- GlassWindow: spring enter (stiffness 200, damping 20), tween exit (200ms easeIn). See CLAUDE.md code pattern.
- StatusBadge: takes `status` prop, maps to color via DS.11 rules. Inter 500 11px.
- UnitDisplay: takes `value` + `unit` enum, renders with locale-aware number + translated unit.
- CurrencyDisplay: Intl.NumberFormat('ar-EG') for Arabic, Geist Mono font.
- All components use React Aria for accessibility. Never shadcn.

---

### WEBSITE (Phases 4-6) — Depends on Phase 1-3

#### Phase 4: Website Layout + Home + About
**What:** Global shell (header, footer, theme toggle, language toggle) + Home page + About page.
**Read:** FRONTEND.md APP 1 sections 1.1 (Global Layout), 1.2 (Home), 1.3 (About)
**Build:**
- Root layout with header (64px, blur on scroll, logo, nav, language/theme toggles, CTA)
- Footer (4-column grid, brand, links, legal)
- Offline banner component
- Home page: hero (100vh, real photography, gradient overlay), value props, how-it-works, CTA sections
- About page: company story, mission, team
- SSG rendering for both pages
- Tailwind CSS setup with tokens.css imported
- i18n: AR/EN for all strings, RTL flip on language change
**Verify:** Pages render SSG, theme toggle works, language toggle flips to RTL Arabic, responsive mobile layout
**Tips:**
- Website uses 16px base font (exception to 14px default)
- Home/About are cinematic. Market/Support/Docs are functional. Don't force cinematic on functional pages.
- Mobile hamburger → full-screen overlay (React Aria Modal)

#### Phase 5: Website Market + Product Detail
**What:** Product catalog with filters + individual product pages.
**Read:** FRONTEND.md APP 1 sections 1.4 (Market), 1.5 (Product Detail)
**Build:**
- Market page: SSR with search params for filters
- Category grid, filter sidebar (sticky), product cards with price ranges
- Infinite scroll via TanStack Query `useInfiniteQuery`
- Product detail: specs, price range badge, availability indicator, "Add to Quote" button
- Server function: `getProductCatalog()` with filtering
- Supabase migration: `products`, `product_categories` tables
**Verify:** Products load via SSR, filters work, infinite scroll loads more, product detail renders
**Tips:**
- No exact prices shown — only ranges ("EGP 400-600 per bag")
- "Add to Quote" requires login → opens login modal
- Search uses fuse.js client-side + server fallback

#### Phase 6: Website Remaining Pages
**What:** Support, Docs, Careers, Legal pages + Login Modal + AI Chat Widget.
**Read:** FRONTEND.md APP 1 sections 1.6-1.11
**Build:**
- Support page: contact form (anonymous) + FAQ accordion
- Docs page: skeleton layout with sidebar TOC
- Careers: job listings
- Legal: privacy policy + terms (from brand/legal/)
- Login Modal: phone input → WhatsApp OTP → verify → PIN setup → account creation. Elevated glass overlay.
- AI Chat Widget: floating button → mini chat panel
- Server functions: `sendOTP()`, `verifyOTP()`, `createAccount()`, `submitContactForm()`
**Verify:** Login flow completes end-to-end, SSO cookie set on .hyperquote.net, contact form submits
**Tips:**
- Login is a Modal overlay, NOT a page redirect
- OTP primary: WhatsApp. Fallback: SMS after 30s. Voice after 60s.
- Carrier detection: +20 10x = Vodafone, +20 11x = Etisalat, +20 12x = Orange

---

### PORTAL — CUSTOMER (Phases 7-11) — Depends on Phases 1-6

#### Phase 7: Portal Auth + Shell
**What:** Portal authentication gate + spatial canvas with centered AI chat.
**Read:** FRONTEND.md APP 2 sections 2.1 (Auth), 2.2 (Shell)
**Build:**
- Portal auth: `beforeLoad` route guard → redirect to website login if no session
- Spatial canvas: wide empty space, AI chat centered (max-width 720px)
- Two glass window buttons below chat: "Orders" and "Market"
- Customer/Supplier role toggle (pill in header)
- Floating AI button (Ctrl+J) for when windows are open
- Notification bell with unread count (Supabase Realtime subscription)
- Theme/language toggles
**Verify:** Auth redirects work, canvas renders, AI chat input accepts text, role toggle switches views
**Tips:**
- AI chat is the PRIMARY interface. Buttons are for users who prefer direct navigation.
- Portal uses external auth pool + `hq-external-session` cookie
- Spatial philosophy: no sidebar, no breadcrumbs, glass windows float over empty space

#### Phase 8: Portal AI Chat
**What:** Full AI chat with streaming, rich messages, slash commands, conversation history.
**Read:** FRONTEND.md APP 2 section 2.3 (AI Chat Capabilities)
**Build:**
- `useChat()` from @tanstack/ai-react for SSE streaming
- Rich message types: text, product cards, status cards, action buttons, inline forms
- Quick action chips below input (contextual)
- Slash commands: `/quote`, `/track`, `/price`, `/help`
- Conversation history overlay (Elevated glass, accessed via History icon)
- Server function: `aiChat()` SSE proxy to Claude via Cloudflare AI Gateway
- AI fallback chain: Claude → Groq → GLM → graceful degradation
**Verify:** Chat streams responses, product cards render inline, slash commands work, history persists
**Tips:**
- AI never reveals supplier costs, margin data, or internal pricing
- AI never auto-submits anything — every action needs user confirmation
- Rate limit: 30 messages/minute
- Conversation stored in Zustand (sessionStorage persist)

#### Phase 9: Portal Material List Builder + Quote Submission
**What:** The core product action — customer builds a material list and submits for quoting.
**Read:** FRONTEND.md APP 2 section 2.6 (Material List Builder)
**Build:**
- 3-step flow: Build List → Details → Review & Submit
- 4 input methods: Search & Add, Upload (CSV/Excel), Quick Pad, AI Assist
- Product list table with drag reorder, quantity editing, notes
- Delivery address (ComboBox with saved addresses, auto-expand for first-time)
- Date picker (business days only — no Friday/Saturday)
- File attachments (drawings/specs)
- Server functions: `submitQuoteRequest()`, `parseUploadedFile()`, `parseWithAI()`, `saveDraft()`
- Supabase migration: `quote_requests`, `quote_request_items`, `customer_addresses`, `projects` tables
**Verify:** All 4 input methods work, CSV upload parses correctly, submission creates quote request in DB
**Tips:**
- CSV upload: support messy files (UTF-8 BOM, auto-detect delimiters, .xlsx renamed to .csv)
- All errors shown at once, never fail on first error
- Auto-save draft every 30 seconds to localStorage
- First address: auto-expand new address form if customer has zero saved addresses

#### Phase 10: Portal Quote Detail + Acceptance
**What:** Customer views received quote, accepts/declines/counter-offers.
**Read:** FRONTEND.md APP 2 section 2.7 (Quote Detail)
**Build:**
- Quote header: reference, status badge, validity countdown, assigned rep
- Quote timeline (vertical, 7 steps)
- Line items table with prices (Geist Mono), VAT, total
- Accept → confirmation modal → order created (+ proforma invoice auto-generated)
- Counter-offer: total discount OR per-line price editing (amber highlight, floating changes bar)
- Partial accept: per-line Accept/Reject/Negotiate
- Decline with reason
- Version history (collapsible diffs)
- Version comparison modal (side-by-side)
- Supabase migration: `quotes`, `quote_items` tables
- Server functions: `acceptQuote()`, `submitCounterOffer()`, `submitPartialResponse()`
- Trigger: quote accepted → auto-create order + supplier POs + proforma invoice
**Verify:** Full accept flow creates order in DB, counter-offer creates new version, proforma PDF generated
**Tips:**
- Proforma invoice sent immediately on acceptance (before payment instrument)
- Tier 4 customers skip payment instrument screen (auto-bypass)
- Status badge colors per SM.8 cross-app mapping

#### Phase 11: Portal Orders + Delivery Tracking + Remaining
**What:** Order tracking, GPS delivery map, notifications, documents, support, settings.
**Read:** FRONTEND.md APP 2 sections 2.4, 2.5, 2.8, 2.9, 2.15-2.18
**Build:**
- Orders window with 4 tabs (Active, Quotes, History, Drafts)
- Order tracking: 5-stage progress bar + detail per stage
- GPS map (MapLibre GL in ClientOnly) with driver location + route line
- Market window (catalog browse inside portal)
- Notifications window (Supabase Realtime subscription)
- Documents window (invoices, delivery notes, quote PDFs)
- Support window (ticket submission + thread)
- Settings window (profile, addresses, team, notifications, security, data/privacy)
- PWA manifest + service worker
**Verify:** Orders list loads, GPS map renders, notifications arrive in real-time, PWA installs

---

### PORTAL — SUPPLIER (Phase 12) — Depends on Phase 7

#### Phase 12: Supplier Portal
**What:** Supplier view with stock management, PO inbox, invoice submission, analytics.
**Read:** FRONTEND.md APP 2 sections 2.10-2.14
**Build:**
- Supplier role toggle switches view
- Stock & Pricing: product grid with inline edit, bulk CSV upload, AI catalog parsing
- PO Inbox: list with status filters, confirm/reject per PO, per-line actions
- Invoice Submission: auto-populate from confirmed PO, file upload
- Analytics: KPIs (orders, revenue, response time), top products chart
- Server functions: `updateSupplierStock()`, `confirmPO()`, `rejectPO()`, `submitSupplierInvoice()`, `uploadCatalog()`
- Supabase migration: `suppliers`, `supplier_contacts`, `source_inventory` tables
**Verify:** Stock edit saves, PO confirmation updates status, invoice submits

---

### BACKEND — CORE TABLES (Phases 13-14) — Can parallel with Portal phases

#### Phase 13: Database — Order + Delivery + Finance Tables
**What:** All remaining core business tables.
**Read:** BACKEND.md Section 3 (Tables — order, procurement, delivery, finance domains)
**Build:**
- Migrations for: `orders`, `order_items`, `change_orders`, `supplier_pos`, `purchase_order_items`
- Migrations for: `warehouses`, `inventory`, `stock_movements`, `deliveries`, `delivery_items`, `proof_of_delivery`, `driver_locations`, `vehicles`, `drivers`
- Migrations for: `invoices`, `invoice_items`, `payments`, `payment_allocations`, `cheque_tracking`, `letters_of_credit`, `credit_notes`, `withholding_tax_certificates`
- All RLS policies for these tables (from Section 4)
- State machine transition function + enforcement triggers (from Section 5)
- All indexes (from Section 8)
**Verify:** All tables exist, RLS blocks cross-tenant access, state transitions enforce valid paths only

#### Phase 14: Database — Support + HR + AI + System Tables
**What:** Remaining tables + all triggers + cron jobs.
**Read:** BACKEND.md Section 3 (remaining domains) + Section 5 (Triggers) + Section 9 (Cron)
**Build:**
- Migrations for: `tickets`, `ticket_messages`, `returns`, `customer_feedback`
- Migrations for: `attendance_records`, `leave_requests`, `driver_compliance`, `vehicle_inspections`, `driver_shifts`
- Migrations for: `ai_conversations`, `ai_messages`, `search_index`, `document_embeddings`
- Migrations for: `notifications`, `notification_groups`, `documents`, `system_config`, `holiday_calendar`, `ceo_digests`
- All business logic triggers (quote_accepted, delivery_confirmed, payment_bounced, etc.)
- Materialized views (ceo_attention_items, ap_aging_snapshot)
- Computed functions (payment_behavior_score, customer_tier_score, available_quantity, ar_aging)
- All cron jobs via pg_cron
- Seed data: system_config, governorates, unit_translations
**Verify:** Triggers fire correctly, cron jobs scheduled, materialized views refresh

---

### INTERNAL PLATFORM (Phases 15-22) — Depends on Phases 1-3, 13-14

#### Phase 15: Internal Shell
**What:** Canvas, icon strip, glass windows, hotkeys, command palette.
**Read:** FRONTEND.md APP 3 SHELL section
**Build:**
- Auth: `beforeLoad` with internal pool check
- Canvas: greeting ("Good morning, Ahmed"), urgent item count, lion watermark
- Icon strip (11 icons, permission-filtered)
- Glass window open/close with spring/tween animations
- Hotkey system (S/P/O/W/F/D/C/H/A/R/I) with keyboard scope state machine
- Window state preservation on swap (Zustand keyed by module)
- Window header: module icon + name + close button
- Ctrl+K command palette (Elevated glass, cross-entity search)
- Mobile: canvas shows tappable glass cards
**Verify:** Hotkeys open/close windows, Escape closes, swap preserves state, command palette searches

#### Phase 16: Sales Module
**What:** RFQ inbox, quote builder, customer 360, pipeline kanban, negotiation.
**Read:** FRONTEND.md MODULE 1 SALES (sections 1.1-1.10)
**Build:**
- RFQ Inbox: table with priority scoring, aging, SLA countdown, claim action
- RFQ Detail: materials table, customer credit sidebar, AI insights
- Quote Builder: 10-step workflow (customer → items → pricing → margins → delivery → terms → notes → approval → preview → send)
- Customer 360: fixed header + tabbed content (Overview, Contacts, Quotes, Orders, Financials, Documents, Activity)
- Pipeline/Kanban: drag between stages with click-to-advance (safer for B2B)
- Negotiation view: version timeline, side-by-side comparison, what-if calculator
- All server functions from BACKEND.md Section 6 (Sales group)
**Verify:** Full quote lifecycle: RFQ claim → build quote → approve → send → customer accepts

#### Phase 17: Procurement Module
**Read:** FRONTEND.md MODULE 2 (sections 2.1-2.7)
**Build:** Supplier inquiry builder, response tracking, price comparison matrix, PO management, supplier scorecards

#### Phase 18: Orders/Operations Module
**Read:** FRONTEND.md MODULE 3 (sections 3.1-3.5)
**Build:** Fulfillment kanban, order detail, delivery schedule, operations dashboard, bottleneck view, SLA tracker, cross-module handoff status

#### Phase 19: Warehouse Module
**Read:** FRONTEND.md MODULE 4 (sections 4.1-4.13)
**Build:** Receiving (standard + bulk), putaway, pick list, directed picking, staging + load verification (5-step gated), cycle count (blind), inventory lookup, yard management

#### Phase 20: Finance Module
**Read:** FRONTEND.md MODULE 5 (sections 5.1-5.9)
**Build:** Invoicing + ETA submission, AR aging (KPI strip + drill-down), payment recording (wire/cheque/LC), PDC grid + calendar, 3-way AP match, credit management (profile card + utilization bar), bank reconciliation, reports

#### Phase 21: Dispatch Module
**Read:** FRONTEND.md MODULE 6 (sections 6.1-6.7)
**Build:** Route planning (drag-and-drop stops, auto-optimize), live GPS map (vehicle pins, clusters, route lines), POD validation (split-view), driver management

#### Phase 22: Remaining Internal Modules
**Read:** FRONTEND.md MODULES 7-11
**Build:**
- Customer Service: WhatsApp inbox, ticket management, returns & claims
- HR: employee directory, driver compliance, leave management, attendance
- Admin: users/roles, system settings, margin rules, approval thresholds, holiday calendar, audit log
- Reports: role-specific pre-built reports (Report Builder deferred to Phase 2)
- AI Assistant: chat interface, role-aware capabilities, safety guardrails

---

### CEO APP (Phase 23) — Depends on Phases 1-3, 13-14

#### Phase 23: CEO Command Center
**What:** The most minimal app. Search bar + lion. Zero accent colors.
**Read:** FRONTEND.md APP 4 (all 15 screens)
**Build:**
- Login (biometric → PIN → OTP chain)
- Home: search bar + lion watermark at 3-5% opacity. Nothing else.
- Search: cross-entity results grouped by type (top 3 per group, exact match shortcut)
- Detail views: 7 entity types (employee, customer, order, invoice, supplier, delivery, product)
- AI Chat: dual route (analytics from materialized views + RAG from pgvector)
- Attention items: from `ceo_attention_items` materialized view
- Daily digest (7AM) + weekly insight (Sunday)
- Approval flow (margin overrides, credit limits, write-offs)
- Compose/route messages to employees
- Board report PDF export
- Offline mode with defined cache scope
- PWA manifest
**Verify:** Search returns results across all entity types, AI answers business questions, digest loads

---

### DRIVER APP (Phases 24-26) — Depends on Phases 1-3, 13-14

#### Phase 24: Driver App Scaffold + Auth + Shift
**What:** Vite + Capacitor setup, driver auth, shift start with DVIR.
**Read:** FRONTEND.md APP 5 (Screens 1-3), STACK-DECISION.md (Capacitor section)
**Build:**
- Vite + React SPA (NOT TanStack Start)
- Capacitor 8 native setup (iOS + Android)
- Login: phone OTP → 4-digit PIN → biometric enrollment
- Shift start: vehicle selection, pre-trip inspection (10-point checklist with photos), odometer, signature
- Home dashboard: today's stats, first stop preview, vehicle info
- GPS consent capture (Data Protection Law 151/2020)
**Verify:** App builds for both platforms, auth works, inspection captures photos, GPS consent recorded
**Tips:**
- Driver app uses Vite, NOT TanStack Start (Capacitor WebView incompatible)
- Background GPS via @transistorsoft/capacitor-background-geolocation
- Everything must work offline — queue mutations in PowerSync/SQLite

#### Phase 25: Driver Route + Delivery + POD
**Read:** FRONTEND.md APP 5 (Screens 4-10)
**Build:** Route overview, stop detail, navigation (deep-link to Sygic/HERE), loading verification, arrival (geofence), delivery execution (per-line items), POD capture (photos + signature + GPS), skip-stop flow

#### Phase 26: Driver Remaining
**Read:** FRONTEND.md APP 5 (Screens 11-15)
**Build:** Exception reporting (7 types), communication, end of day (returns, fuel, post-trip DVIR, summary), external driver job offers, external driver earnings + withdrawal

---

### INTEGRATIONS + POLISH (Phases 27-32)

#### Phase 27: WhatsApp Integration
**Build:** WhatsApp Cloud API webhook handler, OTP delivery, order notifications, delivery confirmations, AR reminders, CEO daily digest, drop-ship POD flow (supplier photo → customer confirm)

#### Phase 28: Email + PDF Generation
**Build:** Resend integration for transactional email, pdf-lib for invoice/quote/delivery note/BOL/credit note/proforma/receipt/board report PDFs (all Arabic-primary)

#### Phase 29: ETA E-Invoicing
**Build:** Egyptian Tax Authority API integration, digital signature (HSM/ITIDA), real-time submission, status tracking, credit note submission

#### Phase 30: AI Pipeline
**Build:** Cloudflare AI Gateway routing (GLM → Groq → Claude), Mistral OCR for supplier catalogs, pgvector embeddings for CEO RAG, prompt templates per surface

#### Phase 31: Real-Time + Caching
**Build:** Supabase Realtime subscriptions (all 11 channels), Cloudflare KV for config/JWKS/rates, Hyperdrive for DB connection pooling, TanStack Query staleTime per data type

#### Phase 32: Testing + Deployment
**Build:** Vitest browser mode tests for critical paths, Playwright E2E for auth + quote + order flows, Cloudflare Workers deployment (5 workers), wrangler.jsonc configs, domain routing

---

## Best Practices

### Per-Phase Checklist
Every phase should:
- [ ] Read CLAUDE.md non-negotiable rules before writing code
- [ ] Read the specific FRONTEND.md section for the feature
- [ ] Read the specific BACKEND.md tables/functions for the feature
- [ ] Create database migration BEFORE building UI
- [ ] Create server function BEFORE building component
- [ ] Add i18n keys for ALL user-facing strings (AR + EN)
- [ ] Use Arabic-Indic numerals for all numbers in AR locale
- [ ] Translate all units to Arabic in AR locale
- [ ] Test RTL layout (switch to Arabic and verify)
- [ ] Test dark mode
- [ ] Test mobile responsive
- [ ] Commit with atomic, descriptive messages

### Common Pitfalls to Avoid
1. **Don't use Next.js patterns.** No `getServerSideProps`, no `app/` directory, no `next/image`. TanStack Start has its own patterns.
2. **Don't reach for shadcn.** Even if Claude's training suggests it. Use `react-aria-components` directly.
3. **Don't import `framer-motion`.** Package is called `motion`. Import from `motion/react`.
4. **Don't use `watch()` from React Hook Form.** Use `useWatch()`. Always.
5. **Don't put colors in `@theme`.** Colors go in `:root {}`. The `@theme` block is only for fonts, spacing, radius, shadows.
6. **Don't build dashboards.** Glass windows floating over empty space. No sidebar navigation. No breadcrumbs.
7. **Don't show prices on website catalog.** Only price ranges. Actual prices come in the quote.
8. **Don't add mobile wallets or credit cards.** Payment methods: wire, cheque, cash, LC only.
9. **Don't render maps server-side.** MapLibre GL must be in `ClientOnly` wrapper.
10. **Don't skip the state machine.** Every status change must go through `validate_state_transition()`. No jumping from `confirmed` to `delivered`.

### Performance Tips
- Use `bun run` not `npx` — 10x faster
- Use Turborepo `--filter` to build only what changed
- Use TanStack Router lazy imports for code splitting (100+ routes will be slow otherwise)
- Use Hyperdrive cached config for read queries, uncached for writes
- Pre-compute CEO metrics in materialized views, don't query raw tables
- Use `(SELECT auth.uid())` in RLS policies, not `auth.uid()` directly (99.99% performance improvement)

### Testing Strategy
- **Unit:** Vitest browser mode for React Aria components (accessibility testing needs real browser)
- **Integration:** Server function tests with MSW mocking Supabase responses
- **E2E:** Playwright for critical flows: login → create quote request → accept quote → track order
- **Visual:** Storybook for shared UI components (GlassWindow, StatusBadge, etc.)
- **Arabic:** Test every screen in Arabic locale — verify RTL layout, Arabic-Indic numbers, unit translations

---

## Phase Dependencies Graph

```
Phase 1 (scaffold)
├── Phase 2 (supabase)
│   ├── Phase 13 (core tables)
│   └── Phase 14 (remaining tables)
└── Phase 3 (shared packages)
    ├── Phase 4-6 (website)
    │   └── Phase 7-11 (portal customer)
    │       └── Phase 12 (portal supplier)
    ├── Phase 15-22 (internal platform) ← depends on 13-14
    ├── Phase 23 (CEO app) ← depends on 13-14
    └── Phase 24-26 (driver app) ← depends on 13-14

Phases 27-32 (integrations) ← depends on all app phases
```

**Parallelizable:**
- Phases 13-14 (backend tables) can run IN PARALLEL with Phases 4-6 (website)
- Phase 12 (supplier portal) can run IN PARALLEL with Phases 15+ (internal)
- Phase 23 (CEO) can run IN PARALLEL with Phases 24-26 (driver)
- Phases 27-32 (integrations) are independent of each other

---

## Success Criteria

The project is DONE when:
1. All 5 apps deploy to Cloudflare Workers (driver to app stores)
2. A customer can: browse market → login → submit quote → receive quote → accept → track order → see invoice
3. A sales rep can: see RFQ → build quote → get approval → send → convert to order
4. A dispatcher can: plan routes → assign drivers → track GPS → validate POD
5. CEO can: search anything → ask AI → approve actions → view digest
6. Driver can: start shift → inspect vehicle → follow route → deliver → capture POD → end shift
7. All data displays Arabic-Indic numerals + Arabic units when locale is Arabic
8. All invoices submit to ETA e-invoicing in real-time
9. WhatsApp OTP works for auth, notifications arrive for order updates
10. Offline mode works for driver app (full delivery flow without internet)
