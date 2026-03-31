# Roadmap: HyperQuote

## Overview

HyperQuote ships as 5 apps (website, portal, internal platform, CEO app, driver app) on a shared Supabase backend deployed to Cloudflare Workers. The build progresses foundation-first (monorepo, auth, database, shared packages), then vertical: public website validates SSR/SSG patterns, portal delivers core business value (quote-to-cash), internal platform powers operations (11 modules), and specialized apps (CEO, driver) follow. Database phases run parallel to website to unblock the internal platform early. Integrations (WhatsApp, email, PDF, ETA e-invoicing, AI) layer on last once all apps have stable surfaces to integrate with.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Monorepo Scaffold** - Create monorepo with 5 apps + 7 packages, validate Supabase SSR on Workers (go/no-go)
- [x] **Phase 2: Supabase + Initial Migrations** - Extensions, 50 enums, auth/tenant tables, RLS helpers, seed data (completed 2026-03-31)
- [ ] **Phase 3: Shared Packages** - Build 7 shared packages (ui, types, i18n, auth, forms, tables) + vertical slice validation
- [ ] **Phase 4: Website Layout + Home + About** - Global shell, hero home page, about page (SSG)
- [ ] **Phase 5: Website Market + Product Detail** - SSR product catalog with filters, product detail pages
- [ ] **Phase 6: Website Remaining Pages** - Support, docs, careers, legal, login modal, AI chat widget
- [ ] **Phase 7: Portal Auth + Shell** - Auth gate, spatial canvas, AI chat input, glass window buttons
- [ ] **Phase 8: Portal AI Chat** - Streaming AI chat with rich messages, slash commands, history
- [ ] **Phase 9: Portal Material List Builder + Quote Submission** - 4 input methods, 3-step flow, buyer approval workflows
- [ ] **Phase 10: Portal Quote Detail + Acceptance** - Quote view, accept/counter-offer/partial/decline, version history
- [ ] **Phase 11: Portal Orders + Delivery + Remaining Windows** - Orders, GPS tracking, notifications, documents, support, settings, PWA
- [ ] **Phase 12: Supplier Portal** - Stock management, catalog upload, PO inbox, invoice submission, analytics
- [ ] **Phase 13: Database -- Order + Delivery + Finance Tables** - Core business tables, RLS, state machine triggers, indexes
- [ ] **Phase 14: Database -- Support + HR + AI + System Tables** - Remaining tables, business triggers, materialized views, cron jobs, seed data
- [ ] **Phase 15: Internal Platform Shell** - Canvas, icon strip, glass windows, hotkeys, command palette, mobile layout
- [ ] **Phase 16: Sales Module** - RFQ inbox, quote builder, customer 360, pipeline kanban, negotiation
- [ ] **Phase 17: Procurement Module** - Supplier inquiry, response tracking, price comparison, PO management, scorecards
- [ ] **Phase 18: Orders/Operations Module** - Fulfillment kanban, order detail, operations dashboard, SLA tracker
- [ ] **Phase 19: Warehouse Module** - Receiving, putaway, picking, staging, cycle count, inventory lookup, yard management
- [ ] **Phase 20: Finance Module** - Invoicing, AR aging, payment recording, PDC, AP matching, credit management, bank recon, reports
- [ ] **Phase 21: Dispatch Module** - Route planning, live GPS map, POD validation, driver management
- [ ] **Phase 22: Remaining Internal Modules** - Customer service, HR, admin, reports, AI assistant
- [ ] **Phase 23: CEO Command Center** - Search bar + lion, cross-entity search, dual AI, attention items, approvals, PWA
- [ ] **Phase 24: Driver App Scaffold + Auth + Shift** - Capacitor setup, phone OTP + PIN + biometric, pre-trip DVIR
- [ ] **Phase 25: Driver Route + Delivery + POD** - Route overview, navigation, loading verification, delivery execution, POD capture
- [ ] **Phase 26: Driver Remaining** - Exception reporting, end of day, external driver features, offline sync
- [ ] **Phase 27: WhatsApp Integration** - Cloud API, OTP, notifications, AR reminders, CEO digest, drop-ship POD
- [ ] **Phase 28: Email + PDF Generation** - Resend transactional email, pdf-lib for 8 document types (Arabic-primary)
- [ ] **Phase 29: ETA E-Invoicing** - Egyptian Tax Authority API, HSM digital signature, real-time submission, credit notes
- [ ] **Phase 30: AI Pipeline** - Cloudflare AI Gateway routing, Mistral OCR, pgvector embeddings, prompt templates
- [ ] **Phase 31: Real-Time + Caching** - Supabase Realtime subscriptions, Cloudflare KV, Hyperdrive, TanStack Query staleTime
- [ ] **Phase 32: Testing + Deployment** - Vitest browser mode, Playwright E2E, 5 Workers deployment, domain routing

## Phase Details

### Phase 1: Monorepo Scaffold
**Goal**: Every app and package builds and runs from a single monorepo, with Supabase SSR on Workers validated as feasible
**Depends on**: Nothing (first phase)
**Requirements**: FOUND-01, FOUND-03, FOUND-04
**Success Criteria** (what must be TRUE):
  1. `bun install` succeeds at monorepo root and all workspaces resolve
  2. `bun run dev --filter=website` starts TanStack Start and renders a page with server function data
  3. Supabase SSR auth creates and reads a session cookie on Cloudflare Workers (with `nodejs_compat`)
  4. Each of the 5 apps has a working dev server (4 TanStack Start + 1 plain Vite for driver)
**Plans:** 2 plans
Plans:
- [x] 01-01-PLAN.md -- Monorepo root config, 5 app shells, 7 package stubs, website server function validation
- [x] 01-02-PLAN.md -- @hyperquote/auth package, Supabase SSR on Workers go/no-go validation

### Phase 2: Supabase + Initial Migrations
**Goal**: Database foundation exists with all enums, auth tables, RLS helpers, and seed data so that auth and tenancy work end-to-end
**Depends on**: Phase 1
**Requirements**: FOUND-02, DB-02, DB-04
**Success Criteria** (what must be TRUE):
  1. All 50 enums are queryable in the database
  2. Auth tables (tenants, user_profiles, user_roles, role_permissions, employees) exist with correct constraints
  3. All 12 auth helper functions execute correctly (pool extractors, role checkers, tenant trigger, updated_at trigger, access token hook)
  4. Role_permissions seed data is loaded and `(SELECT auth.uid())` pattern is enforced in all RLS policies
**Plans:** 2/2 plans complete
Plans:
- [x] 02-01-PLAN.md -- Supabase init, extensions, enums (expanded), 7 auth tables with RLS
- [x] 02-02-PLAN.md -- 12 auth functions, custom access token hook, role_permissions seed data

### Phase 3: Shared Packages
**Goal**: All 7 shared packages build and export correct APIs, with a vertical slice proving the full stack end-to-end (auth -> RLS -> server fn -> component -> i18n -> dark mode)
**Depends on**: Phase 1, Phase 2
**Requirements**: FOUND-05, FOUND-06, FOUND-07, FOUND-08
**Success Criteria** (what must be TRUE):
  1. GlassWindow component renders with spring-enter/tween-exit animation in both light and dark mode
  2. Arabic-Indic numerals display correctly via CurrencyDisplay, DateDisplay, and UnitDisplay when locale is AR
  3. i18next (^25.10.10) loads AR+EN namespaces with type-safe keys and switches locale without page reload
  4. A vertical slice page fetches data through a server function, enforces RLS, renders with React Aria in RTL Arabic, and toggles dark mode
  5. Tailwind v4 tokens.css with colors in `:root {}` renders correctly, RTL logical properties (ps-/pe-/ms-/me-) work
**Plans:** 4 plans
Plans:
- [ ] 03-01-PLAN.md -- @hyperquote/types + @hyperquote/i18n (enums, entities, locale config, formatters)
- [ ] 03-02-PLAN.md -- @hyperquote/ui (GlassWindow, display, feedback, brand components) + Tailwind v4 CSS
- [ ] 03-03-PLAN.md -- @hyperquote/auth guard + @hyperquote/forms + @hyperquote/tables
- [ ] 03-04-PLAN.md -- Vertical slice page proving full stack integration
**UI hint:** yes

### Phase 4: Website Layout + Home + About
**Goal**: The website has a polished global shell and two cinematic SSG pages that establish brand presence
**Depends on**: Phase 3
**Requirements**: WEB-01, WEB-02, WEB-03
**Success Criteria** (what must be TRUE):
  1. Header (64px, blur on scroll) with logo, nav, language toggle, theme toggle, and CTA renders on every page
  2. Home page hero fills 100vh with photography, gradient overlay, and animated value props
  3. Language toggle switches the entire site to RTL Arabic with correct layout mirroring
  4. Both pages render as SSG (static HTML, no server function calls at request time)
**Plans**: TBD
**UI hint**: yes

### Phase 5: Website Market + Product Detail
**Goal**: Visitors can browse the product catalog, filter by category, and view individual product details with price ranges (never exact prices)
**Depends on**: Phase 4
**Requirements**: WEB-04, WEB-05
**Success Criteria** (what must be TRUE):
  1. Market page loads via SSR with products from Supabase, showing price ranges in Geist Mono (never exact prices)
  2. Filter sidebar narrows results by category, and search (fuse.js) finds products by name
  3. Product detail page shows specs table, availability indicator, price range badge, and "Add to Quote" button
  4. "Add to Quote" on product detail opens login modal for unauthenticated users
**Plans**: TBD
**UI hint**: yes

### Phase 6: Website Remaining Pages
**Goal**: Website is complete with all content pages, authentication flow, and AI chat widget
**Depends on**: Phase 5
**Requirements**: WEB-06, WEB-07, WEB-08, WEB-09, WEB-10, WEB-11, WEB-12
**Success Criteria** (what must be TRUE):
  1. Login modal completes full flow: phone input -> WhatsApp OTP -> verify -> account creation (4 fields) or account claiming (masked hint)
  2. SSO cookie is set on `.hyperquote.net` domain after successful login
  3. AI chat widget opens from floating button, streams responses via SSE, and shows inline product cards
  4. Support page accepts anonymous contact form submissions, FAQ accordion expands/collapses
  5. All pages are responsive on mobile, work in RTL Arabic, and support dark mode
**Plans**: TBD
**UI hint**: yes

### Phase 7: Portal Auth + Shell
**Goal**: Authenticated customers land on a spatial canvas with centered AI chat and glass window navigation -- the portal feels like a calm environment, not a dashboard
**Depends on**: Phase 6
**Requirements**: PORT-01, PORT-02, PORT-17
**Success Criteria** (what must be TRUE):
  1. Unauthenticated users are redirected to website login via `beforeLoad` route guard
  2. Spatial canvas renders wide empty space with centered AI chat input (max-width 640px) and greeting with urgent items
  3. Two glass buttons (Orders + Market) open glass windows with spring animation; Escape closes them
  4. Glass windows deep-link via URL routes (e.g., `/orders` opens Orders window directly)
**Plans**: TBD
**UI hint**: yes

### Phase 8: Portal AI Chat
**Goal**: Customers can have a natural conversation with AI that understands their context and surfaces actionable product/order information inline
**Depends on**: Phase 7
**Requirements**: PORT-03
**Success Criteria** (what must be TRUE):
  1. Chat streams responses token-by-token via SSE using `useChat()`
  2. Rich messages render inline: product cards (with "Add to Quote"), status cards, and action buttons
  3. Slash commands (`/quote`, `/track`, `/price`, `/help`) trigger specialized flows
  4. Conversation history overlay opens from History icon, showing past conversations
**Plans**: TBD
**UI hint**: yes

### Phase 9: Portal Material List Builder + Quote Submission
**Goal**: Customers can build a material list using any of 4 input methods and submit it for quoting, with buyer-side approval workflows for team accounts
**Depends on**: Phase 7
**Requirements**: PORT-04, PORT-13
**Success Criteria** (what must be TRUE):
  1. All 4 input methods work: Search & Add, CSV/Excel upload (handles messy files), Quick Pad, AI Assist
  2. 3-step flow (Build -> Details -> Review) completes and creates a quote_request in the database
  3. Auto-save preserves draft every 30 seconds; returning user sees their in-progress list
  4. Buyer with "approver" role receives notification when team member submits; pending approvals tab shows actionable items
  5. Delivery address ComboBox loads saved addresses and auto-expands new address form for first-time users
**Plans**: TBD
**UI hint**: yes

### Phase 10: Portal Quote Detail + Acceptance
**Goal**: Customers can review received quotes and respond with accept, counter-offer, partial accept, or decline -- triggering downstream order creation
**Depends on**: Phase 9
**Requirements**: PORT-05
**Success Criteria** (what must be TRUE):
  1. Quote detail shows timeline, line items with prices in Geist Mono, VAT breakdown, and validity countdown
  2. "Accept" creates an order + supplier POs + proforma invoice in one transaction
  3. Counter-offer allows total discount OR per-line price editing with amber highlights and floating changes bar
  4. Version history shows collapsible diffs and side-by-side comparison between quote versions
**Plans**: TBD
**UI hint**: yes

### Phase 11: Portal Orders + Delivery + Remaining Windows
**Goal**: Customers have a complete portal experience: order tracking with GPS, real-time notifications, document access, support, settings, and PWA installation
**Depends on**: Phase 10
**Requirements**: PORT-06, PORT-07, PORT-08, PORT-09, PORT-10, PORT-11, PORT-12, PORT-14, PORT-15, PORT-16
**Success Criteria** (what must be TRUE):
  1. Orders window shows 4 tabs (Active, Quotes, History, Drafts) with status badges and one-tap reorder from history
  2. Order tracking displays 5-stage progress bar and GPS delivery map (MapLibre GL in ClientOnly) with driver location and ETA
  3. Notifications arrive in real-time via Supabase Realtime, grouped by time, with click-through navigation
  4. Guest order claiming matches phone number to existing customer record via masked hint flow
  5. PWA installs after 3rd visit with push notification permission requested on first notification-worthy action
**Plans**: TBD
**UI hint**: yes

### Phase 12: Supplier Portal
**Goal**: Suppliers can manage their catalog, respond to POs, submit invoices, and track their performance -- all within the same portal app via role toggle
**Depends on**: Phase 7
**Requirements**: SUPP-01, SUPP-02, SUPP-03, SUPP-04, SUPP-05, SUPP-06
**Success Criteria** (what must be TRUE):
  1. Role toggle switches canvas, navigation buttons, and AI context between customer and supplier views
  2. Stock & Pricing table supports inline edit (price + qty) with freshness color coding, plus bulk CSV update with diff preview
  3. Catalog upload accepts drag-and-drop (PDF/Excel/CSV), AI parses with confidence scores, and side-by-side review works
  4. PO inbox shows pending/confirmed/history tabs with per-PO confirm/reject and per-line actions
  5. Analytics dashboard shows KPIs (revenue, fill rate, on-time rate) and monthly revenue chart
**Plans**: TBD
**UI hint**: yes

### Phase 13: Database -- Order + Delivery + Finance Tables
**Goal**: All core business tables exist with RLS policies, state machine enforcement, and indexes -- enabling the internal platform to read and write real business data
**Depends on**: Phase 2
**Requirements**: DB-01, DB-03, DB-05
**Success Criteria** (what must be TRUE):
  1. All order, procurement, delivery, and finance tables exist with correct types, constraints, and indexes
  2. RLS policies block cross-tenant and cross-customer access for every table
  3. State machine transition function enforces valid-only transitions for quote_request, quote, order, PO, delivery, invoice, and payment
  4. `EXPLAIN ANALYZE` on key queries shows index usage (no sequential scans on RLS-filtered columns)
**Plans**: TBD

### Phase 14: Database -- Support + HR + AI + System Tables
**Goal**: The complete 94-table + 2 materialized view database is operational with all triggers, computed functions, cron jobs, and seed data
**Depends on**: Phase 13
**Requirements**: DB-06, DB-07, DB-08, DB-09, DB-10
**Success Criteria** (what must be TRUE):
  1. Business logic triggers fire correctly: quote_accepted creates order + POs, delivery_confirmed generates invoice, payment_bounced triggers credit hold
  2. Materialized views (ceo_attention_items, ap_aging_snapshot) refresh on schedule and return correct data
  3. Computed functions (payment_behavior_score, customer_tier_score, available_quantity, ar_aging) return expected values for test data
  4. All pg_cron jobs are scheduled (quote expiry, AR aging snapshots, metrics pre-computation, SLA breach detection)
  5. Seed data loaded: governorates (27), system_settings defaults, delivery_zones
**Plans**: TBD

### Phase 15: Internal Platform Shell
**Goal**: Internal users land on a spatial canvas with glass windows, hotkeys for 11 modules, and a command palette -- the operational hub that replaces traditional dashboards
**Depends on**: Phase 3, Phase 14
**Requirements**: INT-01, INT-02, INT-03, INT-04, INT-05, INT-06, INT-07, INT-08
**Success Criteria** (what must be TRUE):
  1. Auth gate checks internal pool (`hq-internal-session` cookie) and rejects external users
  2. Canvas shows time-aware greeting, urgent item count (aggregated from 6 sources), and lion watermark
  3. Pressing S/P/O/W/F/D/C/H/A/R/I opens the corresponding module in a glass window (permission-filtered)
  4. Ctrl+K opens command palette with fuse.js cross-entity search and keyboard navigation
  5. Swapping between windows preserves each window's state (Zustand keyed by module)
  6. Shared activity feed component renders on any entity with @mentions, internal/external comments, and system events
**Plans**: TBD
**UI hint**: yes

### Phase 16: Sales Module
**Goal**: Sales reps can process the full quote lifecycle: claim RFQ, build quote with margin guardrails, get approval, send to customer, and negotiate
**Depends on**: Phase 15
**Requirements**: SALE-01, SALE-02, SALE-03, SALE-04, SALE-05, SALE-06, SALE-07, SALE-08, SALE-09, SALE-10
**Success Criteria** (what must be TRUE):
  1. RFQ inbox sorts by priority score (tier 40% + value 30% + age 20% + urgency 10%) with SLA countdown timers
  2. Quote builder completes 10-step workflow with live supplier pricing (fresh/aging/stale indicators) and margin guardrails (green/yellow/red/blocked)
  3. Approval flow pushes notification to approver when margin or value thresholds are exceeded, with 2h escalation
  4. Customer 360 shows 9 tabs of customer history with health score
  5. Pipeline kanban shows 9 stages with click-to-advance and drag-and-drop
**Plans**: TBD
**UI hint**: yes

### Phase 17: Procurement Module
**Goal**: Procurement can source from multiple suppliers, compare prices, and manage POs with three-way matching
**Depends on**: Phase 15
**Requirements**: PROC-01, PROC-02, PROC-03, PROC-04, PROC-05
**Success Criteria** (what must be TRUE):
  1. Supplier inquiry builder sends to multiple suppliers via email/portal/WhatsApp with auto-reminder at 24h
  2. Price comparison matrix ranks suppliers per-line (price 40% + availability 25% + lead time 20% + reliability 15%) and supports split sourcing
  3. POs auto-generate from quote acceptance with 10-status flow and three-way match status
  4. Supplier scorecard shows on-time delivery %, fill rate, quality rejection %, and tiering (Preferred/Approved/Conditional/New)
**Plans**: TBD
**UI hint**: yes

### Phase 18: Orders/Operations Module
**Goal**: Operations team has visibility into fulfillment status across all orders with bottleneck detection and SLA tracking
**Depends on**: Phase 15
**Requirements**: OPS-01, OPS-02, OPS-03
**Success Criteria** (what must be TRUE):
  1. Fulfillment kanban shows 6 columns (PO Placed through Delivered) with drag-and-drop
  2. Order detail shows per-line-item status, overall progress bar, and activity log
  3. Operations dashboard shows 4 metric cards, bottleneck pipeline, 5 SLA types, and cross-module "Nudge" button
**Plans**: TBD
**UI hint**: yes

### Phase 19: Warehouse Module
**Goal**: Warehouse staff can receive, putaway, pick, stage, and count inventory with directed workflows and quality checks
**Depends on**: Phase 15
**Requirements**: WH-01, WH-02, WH-03, WH-04, WH-05, WH-06, WH-07
**Success Criteria** (what must be TRUE):
  1. Receiving workflow handles standard and bulk/weight-based items with material-specific quality checklists and discrepancy handling
  2. Directed picking enforces FEFO with two-scan verification and supports short pick/skip/substitute
  3. Staging + load verification completes 5-step gated flow (scan truck -> scan items -> verify weight -> photos -> dual sign-off)
  4. Blind cycle count hides system quantities, triggers threshold recount by ABC class, and requires supervisor approval for variances
  5. Yard management shows interactive zone map with capacity utilization color coding and Khamsin weather alerts
**Plans**: TBD
**UI hint**: yes

### Phase 20: Finance Module
**Goal**: Finance team can generate ETA-compliant invoices, track AR/AP aging, record payments across 4 instruments, manage credit, and reconcile bank statements
**Depends on**: Phase 15
**Requirements**: FIN-01, FIN-02, FIN-03, FIN-04, FIN-05, FIN-06, FIN-07, FIN-08, FIN-09
**Success Criteria** (what must be TRUE):
  1. Invoices auto-generate from delivery confirmation with Arabic-primary PDF and ETA e-invoicing JSON/XML submission
  2. AR aging shows KPI strip + drill-down table (customer -> bucket -> invoice) with severity color coding
  3. Payment recording handles all 4 instruments: wire (auto-match), cheque (PDC tracking with status machine), LC (draw-down tracking), cash
  4. Credit management shows profile card with utilization bar, auto-hold triggers (5 types), and new customer defaults (50% advance + 50% COD)
  5. Bank reconciliation imports CSV, auto-matches by amount+reference, and surfaces unmatched items
**Plans**: TBD
**UI hint**: yes

### Phase 21: Dispatch Module
**Goal**: Dispatch team can plan routes with constraint enforcement, track drivers in real-time on a map, and validate proof of delivery
**Depends on**: Phase 15
**Requirements**: DISP-01, DISP-02, DISP-03, DISP-04
**Success Criteria** (what must be TRUE):
  1. Route planning supports drag-and-drop stops with auto-optimize (VRP) and enforces Cairo truck ban, prayer times, and Khamsin constraints
  2. Live GPS map shows color-coded vehicle pins (yellow=loading, green=transit, blue=at site, red=problem) with route lines
  3. POD validation split-view shows photo + delivery note with item-by-item confirmation and damage flagging
  4. Driver management tracks license expiry, certifications, and performance metrics
**Plans**: TBD
**UI hint**: yes

### Phase 22: Remaining Internal Modules
**Goal**: Customer service, HR, admin, reports, and AI assistant modules complete the internal platform
**Depends on**: Phase 15
**Requirements**: CS-01, HR-01, ADM-01, RPT-01, AI-01
**Success Criteria** (what must be TRUE):
  1. Customer service shows WhatsApp inbox, ticket management (10-status flow), SLA tracking, and returns & claims workflow
  2. HR tracks driver compliance (CDL/medical/drug test) and blocks dispatch if certifications are expired
  3. Admin manages users/roles/permissions, margin rules, approval thresholds, holiday calendar, and audit log
  4. AI assistant operates within glass window with role-aware capabilities and safety guardrails (read-only DB, draft-review-confirm)
**Plans**: TBD
**UI hint**: yes

### Phase 23: CEO Command Center
**Goal**: CEO has a search-bar-only interface with dual AI (analytics + RAG), attention items, and approval flows -- the most minimal app in the suite
**Depends on**: Phase 3, Phase 14
**Requirements**: CEO-01, CEO-02, CEO-03, CEO-04, CEO-05, CEO-06, CEO-07, CEO-08
**Success Criteria** (what must be TRUE):
  1. Home screen shows only a search bar and lion watermark at 3-5% opacity -- zero accent colors, nothing else
  2. Search returns cross-entity results grouped by type (employees, customers, orders, products, invoices, suppliers, deliveries)
  3. AI chat routes between Analytics AI (pre-computed metrics + text-to-SQL) and RAG AI (pgvector embeddings) based on query type
  4. Attention items surface bounced cheques, overdue 60+ days, delivery failures, and PO rejections from materialized view
  5. PWA installs and works offline in read-only mode
**Plans**: TBD
**UI hint**: yes

### Phase 24: Driver App Scaffold + Auth + Shift
**Goal**: Driver app builds natively for iOS and Android, authenticates via phone OTP + PIN + biometric, and captures pre-trip vehicle inspection
**Depends on**: Phase 3, Phase 14
**Requirements**: DRV-01, DRV-02, DRV-12
**Success Criteria** (what must be TRUE):
  1. Vite + Capacitor app builds and runs on both iOS and Android (NOT TanStack Start)
  2. Login completes phone OTP -> 6-digit PIN -> biometric enrollment flow
  3. Shift start captures vehicle selection, 10-point DVIR checklist with photos, odometer, GPS consent
  4. PowerSync + SQLite is initialized and syncs driver-relevant tables from Supabase
**Plans**: TBD
**UI hint**: yes

### Phase 25: Driver Route + Delivery + POD
**Goal**: Drivers can follow their route, verify loading, execute deliveries, and capture proof of delivery -- all working offline
**Depends on**: Phase 24
**Requirements**: DRV-03, DRV-04, DRV-05, DRV-06, DRV-07, DRV-08
**Success Criteria** (what must be TRUE):
  1. Route overview shows map with numbered pins and list view, color-coded by delivery status
  2. Navigation deep-links to Sygic/HERE for truck-safe routing (NOT Google Maps)
  3. Loading verification scans barcodes per item, checks weight, and captures photo of loaded truck
  4. Delivery execution auto-detects arrival via geofence, confirms per-line items, and runs unloading timer
  5. POD captures photos + digital signature + GPS location + quantity confirmation per item
**Plans**: TBD
**UI hint**: yes

### Phase 26: Driver Remaining
**Goal**: Drivers can report exceptions, complete end-of-day routines, and external drivers can manage job offers and earnings -- all offline-capable
**Depends on**: Phase 25
**Requirements**: DRV-09, DRV-10, DRV-11
**Success Criteria** (what must be TRUE):
  1. Exception reporting captures 7 failure types with photo evidence and reason categorization
  2. End of day completes shift summary, returns processing, post-trip DVIR, odometer, and sign-off
  3. External drivers see job offers (accept/decline with payout visibility) and earnings dashboard
  4. Full delivery flow completes without internet; mutations queue in PowerSync and sync on reconnect
**Plans**: TBD
**UI hint**: yes

### Phase 27: WhatsApp Integration
**Goal**: WhatsApp is the primary communication channel for OTP delivery, order notifications, delivery confirmations, AR reminders, and CEO digest
**Depends on**: Phase 6, Phase 11, Phase 20, Phase 23
**Requirements**: INTG-01
**Success Criteria** (what must be TRUE):
  1. OTP delivery via WhatsApp Cloud API succeeds with SMS fallback after 30s and voice after 60s
  2. Order status notifications (confirmed, shipped, delivered) arrive on customer's WhatsApp
  3. AR reminders send automatically based on aging thresholds
  4. CEO daily digest (7AM) and weekly insight (Sunday) deliver via WhatsApp
**Plans**: TBD

### Phase 28: Email + PDF Generation
**Goal**: All transactional emails send via Resend and all business documents generate as Arabic-primary PDFs
**Depends on**: Phase 11, Phase 20
**Requirements**: INTG-02, INTG-03
**Success Criteria** (what must be TRUE):
  1. Transactional emails (quote ready, order confirmed, invoice attached) send via Resend with React Email templates
  2. Invoice PDF generates Arabic-primary with ETA-required fields, digital stamp, and Geist Mono for all numbers
  3. All 8 document types generate correctly: invoice, quote, proforma, delivery note, BOL, credit note, receipt, board report
**Plans**: TBD

### Phase 29: ETA E-Invoicing
**Goal**: Invoices submit to the Egyptian Tax Authority in real-time with valid digital signatures, satisfying legal compliance
**Depends on**: Phase 20, Phase 28
**Requirements**: INTG-04
**Success Criteria** (what must be TRUE):
  1. Invoice JSON/XML submits to ETA API in real-time upon invoice generation
  2. Digital signature via HSM/ITIDA signs each submission correctly
  3. Credit note submissions reference the original invoice per ETA requirements
  4. Submission status (accepted/rejected/pending) tracks per invoice with retry on failure
**Plans**: TBD

### Phase 30: AI Pipeline
**Goal**: AI routing is operational across all surfaces: portal chat, CEO RAG, supplier catalog OCR, and internal assistant
**Depends on**: Phase 8, Phase 12, Phase 22, Phase 23
**Requirements**: INTG-05
**Success Criteria** (what must be TRUE):
  1. Cloudflare AI Gateway routes requests through the 4-tier pipeline (GLM classifier -> Groq fast chat -> Mistral OCR -> Claude reasoning)
  2. Supplier catalog PDFs parse via Mistral OCR with confidence scores per extracted field
  3. CEO RAG queries return relevant results from pgvector embeddings with hybrid search
  4. Prompt templates load per-surface (portal, CEO, internal, supplier) with appropriate context and safety guardrails
**Plans**: TBD

### Phase 31: Real-Time + Caching
**Goal**: Real-time updates push to all connected clients and caching layers reduce database load and latency
**Depends on**: Phase 11, Phase 15, Phase 21
**Requirements**: INTG-06, INTG-07
**Success Criteria** (what must be TRUE):
  1. Supabase Realtime subscriptions deliver postgres_changes for data updates, broadcast for GPS, and presence for online status
  2. Cloudflare KV caches JWKS, config, and exchange rates with appropriate TTLs
  3. Hyperdrive connection pooling is active for all read queries across 5 Workers
  4. TanStack Query staleTime is configured per data type (30s for GPS, 5min for orders, 1h for catalog)
**Plans**: TBD

### Phase 32: Testing + Deployment
**Goal**: Critical paths are covered by automated tests and all 5 apps deploy to production Cloudflare Workers
**Depends on**: Phase 27, Phase 28, Phase 29, Phase 30, Phase 31
**Requirements**: TEST-01, TEST-02, TEST-03, TEST-04
**Success Criteria** (what must be TRUE):
  1. Vitest browser mode tests pass for React Aria components (accessibility verified in real browser)
  2. Playwright E2E completes: auth -> quote request -> accept quote -> track order
  3. Arabic locale tests verify RTL layout, Arabic-Indic numbers, unit translations, and currency formatting
  4. All 5 Workers deploy via wrangler with correct domain routing (website, portal, internal, ceo, driver API)
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> ...
Phases 13-14 should complete before Phase 15 starts. They can run parallel with Phases 4-6.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Monorepo Scaffold | 2/2 | Complete | - |
| 2. Supabase + Initial Migrations | 2/2 | Complete   | 2026-03-31 |
| 3. Shared Packages | 0/4 | Not started | - |
| 4. Website Layout + Home + About | 0/? | Not started | - |
| 5. Website Market + Product Detail | 0/? | Not started | - |
| 6. Website Remaining Pages | 0/? | Not started | - |
| 7. Portal Auth + Shell | 0/? | Not started | - |
| 8. Portal AI Chat | 0/? | Not started | - |
| 9. Material List Builder + Quote Submission | 0/? | Not started | - |
| 10. Quote Detail + Acceptance | 0/? | Not started | - |
| 11. Portal Orders + Delivery + Remaining | 0/? | Not started | - |
| 12. Supplier Portal | 0/? | Not started | - |
| 13. DB -- Order + Delivery + Finance | 0/? | Not started | - |
| 14. DB -- Support + HR + AI + System | 0/? | Not started | - |
| 15. Internal Platform Shell | 0/? | Not started | - |
| 16. Sales Module | 0/? | Not started | - |
| 17. Procurement Module | 0/? | Not started | - |
| 18. Orders/Operations Module | 0/? | Not started | - |
| 19. Warehouse Module | 0/? | Not started | - |
| 20. Finance Module | 0/? | Not started | - |
| 21. Dispatch Module | 0/? | Not started | - |
| 22. Remaining Internal Modules | 0/? | Not started | - |
| 23. CEO Command Center | 0/? | Not started | - |
| 24. Driver App Scaffold + Auth + Shift | 0/? | Not started | - |
| 25. Driver Route + Delivery + POD | 0/? | Not started | - |
| 26. Driver Remaining | 0/? | Not started | - |
| 27. WhatsApp Integration | 0/? | Not started | - |
| 28. Email + PDF Generation | 0/? | Not started | - |
| 29. ETA E-Invoicing | 0/? | Not started | - |
| 30. AI Pipeline | 0/? | Not started | - |
| 31. Real-Time + Caching | 0/? | Not started | - |
| 32. Testing + Deployment | 0/? | Not started | - |
