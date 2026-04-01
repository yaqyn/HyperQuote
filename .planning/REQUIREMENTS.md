# Requirements: HyperQuote

**Defined:** 2026-03-31
**Core Value:** Egyptian contractors can request quotes for building materials and receive responses within 4 hours through an AI-powered platform.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Foundation

- [x] **FOUND-01**: Monorepo scaffold with 5 apps + 7 shared packages builds and runs (`bun install` + `bun run dev`)
- [x] **FOUND-02**: Supabase project initialized with all 50 enums + auth/tenant tables + RLS helper functions
- [x] **FOUND-03**: Supabase SSR auth works on Cloudflare Workers (go/no-go validation with `nodejs_compat`)
- [x] **FOUND-04**: TanStack Start SSR renders a page with server function data on Cloudflare Workers
- [x] **FOUND-05**: Shared packages build: @hyperquote/ui (GlassWindow, StatusBadge, Skeleton, Toast, EmptyState, CurrencyDisplay, DateDisplay, UnitDisplay, LionMark, CommandPalette), @hyperquote/types, @hyperquote/i18n, @hyperquote/auth, @hyperquote/forms, @hyperquote/tables
- [x] **FOUND-06**: Tailwind v4 with tokens.css renders correctly, colors in `:root {}` not `@theme`, RTL logical properties work
- [x] **FOUND-07**: React Aria Components render with correct RTL support and Arabic-Indic numerals
- [x] **FOUND-08**: i18next (^25.10.10) configured with AR+EN namespaces, type-safe keys, Arabic-Indic number formatting

### Website

- [x] **WEB-01**: Global shell: header (64px, blur on scroll, logo, nav, language/theme toggles, CTA), footer (4-column)
- [x] **WEB-02**: Home page: cinematic hero (100vh, real photography), how-it-works, value props, market preview, CTA section
- [x] **WEB-03**: About page: company story, mission, team grid
- [x] **WEB-04**: Market page: SSR product catalog with search (fuse.js), filter sidebar, grid/list toggle, price ranges (never exact prices), pagination
- [x] **WEB-05**: Product detail: specs table, availability indicator, price range badge, "Add to Quote" (requires login), related products
- [x] **WEB-06**: Support page: contact form (anonymous) + FAQ accordion, two-tier (anonymous vs logged-in)
- [x] **WEB-07**: Docs page: skeleton layout with sidebar TOC, 2-3 example sections
- [x] **WEB-08**: Legal pages: privacy policy + terms of use (Arabic legally binding, English translation notice)
- [x] **WEB-09**: Careers page: job listings or "Send us your CV"
- [x] **WEB-10**: Login modal: phone OTP (WhatsApp primary, SMS fallback) -> verify -> account creation (4 fields) or account claiming (masked hint)
- [x] **WEB-11**: AI chat widget: floating button -> mini chat panel, streaming responses via SSE, inline product cards and action buttons
- [x] **WEB-12**: All pages SSG or SSR as specified, responsive mobile, RTL Arabic, dark mode

### Portal -- Customer

- [x] **PORT-01**: Auth gate: `beforeLoad` route guard, redirect to website login if no session, SSO cookie on `.hyperquote.net`
- [x] **PORT-02**: Spatial canvas: wide empty space, centered AI chat (max-width 640px), two glass buttons (Orders + Market), greeting with urgent items
- [x] **PORT-03**: AI chat: streaming via `useChat()`, rich messages (product cards, status cards, action buttons), slash commands, conversation history overlay, quick action chips
- [ ] **PORT-04**: Material list builder: 3-step flow (Build -> Details -> Review), 4 input methods (Search & Add, CSV/Excel upload, Quick Pad, AI Assist), auto-save drafts
- [ ] **PORT-05**: Quote detail: timeline, line items with prices (Geist Mono), accept/counter-offer/partial accept/decline actions, version history and comparison
- [ ] **PORT-06**: Orders window: 4 tabs (Active, Quotes, History, Drafts), order cards with status badges, one-tap reorder from history
- [ ] **PORT-07**: Order tracking: 5-stage progress bar, GPS delivery map (MapLibre GL in ClientOnly), driver location, ETA, drop-ship POD confirmation/dispute flow (customer confirm/dispute within 72h)
- [ ] **PORT-08**: Market window: catalog browse inside glass window, infinite scroll, quick-add mode, "Add to Quote" without login modal
- [ ] **PORT-09**: Notifications window: real-time via Supabase Realtime, grouped by time, mark read, click-through navigation
- [ ] **PORT-10**: Documents window: invoices, delivery notes, quote PDFs, certificates with view/download
- [ ] **PORT-11**: Support window: WhatsApp (primary), in-app chat, ticket submission with thread
- [ ] **PORT-12**: Settings: profile, addresses, projects, team (multi-user with roles: buyer/approver/site manager), notifications, language/theme, security
- [ ] **PORT-13**: Buyer-side approval workflows: submit for approval action, approver notification, pending approvals tab (research gap identified)
- [ ] **PORT-14**: Repeat purchase: saved lists, one-tap reorder, favorites, AI reorder suggestions
- [ ] **PORT-15**: Guest order claiming: unclaimed customer matches phone -> masked hint -> link auth user to existing customer record
- [ ] **PORT-16**: PWA: service worker, install prompt after 3rd visit, push notifications (permission on first notification-worthy action)
- [x] **PORT-17**: Glass window behavior: spring open/tween close, canvas recedes, escape closes, deep-linking via URL routes

### Portal -- Supplier

- [ ] **SUPP-01**: Supplier role toggle: switches canvas, navigation buttons, AI context
- [ ] **SUPP-02**: Stock & Pricing: product table with inline edit (price + qty), freshness color coding, bulk CSV update with diff preview
- [ ] **SUPP-03**: Catalog upload: drag-and-drop (PDF/Excel/CSV), AI parsing with confidence scores, side-by-side review, submit for approval
- [ ] **SUPP-04**: PO inbox: pending/confirmed/history tabs, per-PO confirm/reject with per-line actions, delivery scheduling
- [ ] **SUPP-05**: Invoice submission: auto-populate from confirmed PO, PDF upload, three-way match validation
- [ ] **SUPP-06**: Analytics: KPIs (revenue, fill rate, on-time rate, quote inclusion), product performance table, monthly revenue chart

### Database

- [ ] **DB-01**: All 94 tables + 2 materialized views created with correct types, constraints, and indexes
- [x] **DB-02**: All 50 enums created
- [ ] **DB-03**: RLS policies for all tables: internal users by tenant, external customers by customer_id, suppliers by supplier_id, drivers by driver_id
- [x] **DB-04**: Auth helper functions (12): pool extractors, role/permission checkers, tenant_id trigger, updated_at trigger, custom access token hook
- [ ] **DB-05**: State machine transition function + enforcement triggers for all state machines (quote request, quote, order, PO, delivery, invoice, payment)
- [ ] **DB-06**: Business logic triggers: quote_accepted -> create order + POs, delivery_confirmed -> generate invoice, payment_bounced -> credit hold, etc.
- [ ] **DB-07**: Materialized views: ceo_attention_items (5-min refresh), ap_aging_snapshot (daily)
- [ ] **DB-08**: Computed functions: payment_behavior_score, customer_tier_score, available_quantity, ar_aging
- [ ] **DB-09**: pg_cron jobs: quote expiry, AR aging snapshots, metrics pre-computation, SLA breach detection
- [ ] **DB-10**: Seed data: role_permissions, governorates (27), system_settings defaults, delivery_zones

### Internal Platform -- Shell

- [ ] **INT-01**: Auth: `beforeLoad` with internal pool check (`hq-internal-session` cookie)
- [ ] **INT-02**: Canvas: time-aware greeting, urgent item count (aggregated from 6 sources), lion watermark, role-based quick actions
- [ ] **INT-03**: Icon strip: 11 module icons (permission-filtered), hotkeys (S/P/O/W/F/D/C/H/A/R/I)
- [ ] **INT-04**: Glass windows: spring open/tween close, ~90% viewport, window state preservation on swap (Zustand keyed by module)
- [ ] **INT-05**: Command palette: Ctrl+K, elevated glass, fuse.js cross-entity search, keyboard navigation, permission-filtered
- [ ] **INT-06**: Notifications: badge on bell icon, glass window, grouped by time, real-time via Supabase Realtime
- [ ] **INT-07**: Mobile: canvas grid of tappable glass cards, full-screen module views, back gesture
- [ ] **INT-08**: Shared activity feed / @mention / handoff infrastructure: object-centric communication on entities, internal vs external comments, Hot Potato escalation, vacation delegation routing

### Internal Platform -- Sales Module

- [ ] **SALE-01**: RFQ inbox: priority-scored (tier 40% + value 30% + age 20% + urgency 10%), aging timer, SLA countdown, claim action
- [ ] **SALE-02**: RFQ detail: materials table, customer snapshot (credit, history, AI insights), clarification workflow, decline with reason
- [ ] **SALE-03**: Quote builder: 10-step workflow, live pricing from supplier data (fresh/aging/stale indicators), margin guardrails (green/yellow/red/blocked)
- [ ] **SALE-04**: Quote approval: margin-based + value-based thresholds, push notification to approver, escalation at 2h
- [ ] **SALE-05**: Quote send: portal + email + both, schedule send, soft reservation created, follow-up auto-scheduled
- [ ] **SALE-06**: Negotiation: version timeline, side-by-side comparison, what-if calculator, accept counter/revise/mark won/lost
- [ ] **SALE-07**: Customer 360: 9 tabs (Overview, Contacts, Quotes, Orders, Financials, Projects, Communications, Documents, Notes), health score
- [ ] **SALE-08**: "Add Customer" button: create unclaimed customer from phone call (3 required fields), no auth credentials
- [ ] **SALE-09**: Pipeline/Kanban: 9 stages, click-to-advance (primary) + drag (power users), filter by rep/customer/value/age
- [ ] **SALE-10**: Activity feed, calendar, contacts, reports (revenue, margin, pipeline, forecast)

### Internal Platform -- Procurement Module

- [ ] **PROC-01**: Supplier inquiry builder: multi-supplier, per-item suggested suppliers (score-ranked), email/portal/WhatsApp send
- [ ] **PROC-02**: Response tracking: status indicators, auto-reminder at 24h, bulk remind non-responders
- [ ] **PROC-03**: Price comparison matrix: per-line supplier comparison, ranking algorithm (price 40% + availability 25% + lead time 20% + reliability 15%), split sourcing
- [ ] **PROC-04**: PO management: auto-generated from quote acceptance, 10-status flow, three-way match status, coded delivery reference (not customer name)
- [ ] **PROC-05**: Supplier scorecard: on-time delivery %, fill rate, quality rejection %, response time, tiering (Preferred -> Approved -> Conditional -> New)

### Internal Platform -- Orders/Operations Module

- [ ] **OPS-01**: Fulfillment kanban: 6 columns (PO Placed -> In Transit -> At Warehouse -> Preparing -> Out for Delivery -> Delivered)
- [ ] **OPS-02**: Order detail: per-line-item status, overall progress bar, documents, activity log
- [ ] **OPS-03**: Operations dashboard: 4 metric cards, bottleneck pipeline visualization, SLA tracker (5 SLA types), cross-module handoff status with "Nudge" button

### Internal Platform -- Warehouse Module

- [ ] **WH-01**: Receiving: expected deliveries list, per-PO step-by-step receiving (standard + bulk/weight-based), material-specific quality checklists, discrepancy handling
- [ ] **WH-02**: Putaway: system-directed task-by-task, two-scan confirmation, override with reason
- [ ] **WH-03**: Picking: order queue sorted by shipping deadline, directed picking (FEFO enforced), two-scan verification, short pick/skip/substitute
- [ ] **WH-04**: Staging + load verification: 5-step gated flow (scan truck -> scan items -> verify weight -> photos -> dual sign-off), hard gating for missing items
- [ ] **WH-05**: Cycle count: blind count (system qty hidden), threshold recount by ABC class, supervisor approval for variances
- [ ] **WH-06**: Inventory lookup: cross-location search, lot/expiry tracking, movement history, reorder point status
- [ ] **WH-07**: Yard management: interactive zone map, capacity utilization color coding, weather/Khamsin alerts

### Internal Platform -- Finance Module

- [ ] **FIN-01**: Invoicing: auto-generated from delivery confirmation, ETA e-invoicing submission (real-time JSON/XML), digital signature, Arabic-primary PDF
- [ ] **FIN-02**: AR aging: KPI strip + drill-down table (customer -> bucket -> invoice), severity color coding, sparkline trends
- [ ] **FIN-03**: Payment recording: wire transfer (auto-match by amount+reference), cheque (PDC tracking with status machine), letter of credit (draw-down tracking)
- [ ] **FIN-04**: PDC grid + calendar: maturity view, 3-day-before notifications, bounce handling (credit hold + legal notification + Tier 5)
- [ ] **FIN-05**: AP: supplier invoice list with three-way match (PO vs receipt vs invoice), variance tolerance rules, withholding tax tracking (1% goods, 5% services)
- [ ] **FIN-06**: Credit management: profile card with utilization bar, auto-hold triggers (5 types), limit change approval chain, new customer defaults (50% advance + 50% COD)
- [ ] **FIN-07**: Bank reconciliation: CSV import, auto-matching, unmatched item handling
- [ ] **FIN-08**: Reports: daily cash, AR/AP aging, 13-week forecast, P&L by customer/product/project, margin analysis, cheque tracking, ETA submission status
- [ ] **FIN-09**: Invoice dispute workflow: create dispute, investigate, resolve (4 resolution types), escalate, 48h SLA, customer-facing dispute status in portal

### Internal Platform -- Dispatch Module

- [ ] **DISP-01**: Route planning: day-before workflow, drag-and-drop stops, auto-optimize (OR-Tools/GraphHopper VRP), constraint enforcement (vehicle type, CDL, equipment, Cairo truck ban, prayer times, Khamsin)
- [ ] **DISP-02**: Live GPS map: color-coded vehicle pins (yellow=loading, green=transit, blue=at site, red=problem), click for details, route lines
- [ ] **DISP-03**: POD validation: split-view (photo + delivery note), item-by-item confirmation, damage flagging
- [ ] **DISP-04**: Driver management: driver profiles, compliance tracking (license expiry, certifications), performance metrics

### Internal Platform -- Remaining Modules

- [ ] **CS-01**: Customer Service: WhatsApp inbox, ticket management (10-status flow), SLA tracking, returns & claims workflow, AI triage
- [ ] **HR-01**: HR: employee directory, driver compliance (CDL/medical/drug test -- blocks dispatch if expired), attendance, leave management
- [ ] **ADM-01**: Admin: users/roles/permissions, system settings, margin rules (by category), approval thresholds, holiday calendar, audit log viewer
- [ ] **RPT-01**: Reports: role-specific pre-built reports with date range/filter/export
- [ ] **AI-01**: AI Assistant: chat interface within glass window, role-aware capabilities, safety guardrails (read-only DB, draft-review-confirm)

### CEO App

- [ ] **CEO-01**: Home: search bar + lion watermark at 3-5% opacity. Zero accent colors. Nothing else.
- [ ] **CEO-02**: Search: cross-entity results grouped by type (employees, customers, orders, products, invoices, suppliers, deliveries)
- [ ] **CEO-03**: AI chat: dual route -- Analytics AI (pre-computed metrics + text-to-SQL fallback) + RAG AI (pgvector embeddings + hybrid search)
- [ ] **CEO-04**: Attention items: from `ceo_attention_items` materialized view (bounced cheques, overdue 60+ days, delivery failures, PO rejections)
- [ ] **CEO-05**: Daily digest (7AM WhatsApp+email) + weekly insight (Sunday WhatsApp+email+PDF)
- [ ] **CEO-06**: Approval flow: margin overrides, credit limits, write-offs -- surfaced through AI ("What needs my approval?")
- [ ] **CEO-07**: Detail views: 7 entity types with deep-link to internal app
- [ ] **CEO-08**: PWA + offline mode (read-only)

### Driver App

- [ ] **DRV-01**: Vite + Capacitor native setup (NOT TanStack Start), login (phone OTP -> PIN -> biometric)
- [ ] **DRV-02**: Shift start: vehicle selection, pre-trip DVIR inspection (10-point checklist with photos), odometer, GPS consent
- [ ] **DRV-03**: Route overview: map with numbered pins + list view, color-coded by status
- [ ] **DRV-04**: Stop detail: customer info, order items, unloading method, site access instructions
- [ ] **DRV-05**: Navigation: deep-link to Sygic/HERE (truck-safe routing, NOT Google Maps)
- [ ] **DRV-06**: Loading verification: barcode scan per item, weight check, photo of loaded truck
- [ ] **DRV-07**: Delivery execution: geofence auto-detect arrival, per-line item confirmation, unloading timer
- [ ] **DRV-08**: POD capture: photos + digital signature + GPS location + quantity confirmation per item
- [ ] **DRV-09**: Exception reporting: 7 failure types with photo evidence + reason categorization
- [ ] **DRV-10**: End of day: shift summary, returns processing, post-trip DVIR, odometer, sign-off
- [ ] **DRV-11**: External driver: job offers (accept/decline with payout), earnings dashboard
- [ ] **DRV-12**: Offline-first: PowerSync + SQLite, full delivery flow without internet, background sync, photo queue

### Integrations

- [ ] **INTG-01**: WhatsApp Cloud API: OTP delivery (with SMS/voice fallback cascade), order notifications, delivery confirmations, AR reminders, CEO digest, drop-ship POD flow, 7-day customer onboarding sequence, NPS survey (2h post-delivery)
- [ ] **INTG-02**: Email: Resend + React Email templates for transactional emails (quote ready, order confirmed, invoice, etc.)
- [ ] **INTG-03**: PDF generation: pdf-lib for invoice, quote, proforma, delivery note, BOL, credit note, receipt, board report (all Arabic-primary, digital stamp)
- [ ] **INTG-04**: ETA e-invoicing: Egyptian Tax Authority API integration, digital signature (HSM/ITIDA), real-time submission, credit note submission
- [ ] **INTG-05**: AI pipeline: Cloudflare AI Gateway routing (GLM -> Groq -> Claude), Mistral OCR for catalogs, pgvector embeddings for RAG, prompt templates per surface
- [ ] **INTG-06**: Real-time: Supabase Realtime subscriptions (postgres_changes for data, broadcast for GPS, presence for online status)
- [ ] **INTG-07**: Caching: Cloudflare KV (JWKS, config, rates), Hyperdrive (DB connection pooling), TanStack Query staleTime per data type

### Testing & Deployment

- [ ] **TEST-01**: Vitest browser mode tests for React Aria components (accessibility needs real browser)
- [ ] **TEST-02**: Playwright E2E for critical paths: auth -> quote request -> accept quote -> track order
- [ ] **TEST-03**: Arabic locale tests: RTL layout, Arabic-Indic numbers, unit translations, currency formatting
- [ ] **TEST-04**: Cloudflare Workers deployment: 5 workers (one per app), wrangler.jsonc configs, domain routing

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Own Inventory

- **INV-01**: Warehouse receiving, putaway, picking with physical stock (Phase 2 at $5-10M revenue)
- **INV-02**: Multi-warehouse with inter-base transfers
- **INV-03**: Reorder point auto-replenishment with 1.5x Egyptian reliability factor

### Native Mobile

- **NAT-01**: Native iOS/Android app for customer portal (after 6-12 months PWA data)
- **NAT-02**: Native supplier portal app

### Advanced Finance

- **AFIN-01**: QuickBooks Online integration (general ledger, bank reconciliation)
- **AFIN-02**: Plaid API for bank feeds (replace CSV import)
- **AFIN-03**: Credit insurance (Coface/Atradius) at individual limits >EGP 5M

### Advanced AI

- **AAI-01**: Report Builder (NL-to-report for custom reports)
- **AAI-02**: AI price prediction from historical data
- **AAI-03**: Cross-sell/upsell recommendations by project context

### Scaling

- **SCALE-01**: EDI/X12 integration (only if US/European big-box retail trading)
- **SCALE-02**: Multi-region deployment
- **SCALE-03**: Formal loyalty/rebate program (at $5M ARR)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Online payment gateway (Stripe, ACH, mobile wallets) | Egyptian B2B runs on offline instruments: wire, cheque, cash, LC |
| Shopping cart / checkout flow | Quote-based RFQ model -- no published prices, no cart, no checkout |
| Social features (reviews, community) | B2B relationship is 1:1, not social. Reviews damage supplier relationships |
| Loyalty program at launch | Complexity not justified at <$5M revenue. Investigate at scale |
| Carbon tracking / sustainability metrics | Western market trend driven by EU/US regulation. Not relevant for Egypt 2026 |
| AR/3D product visualization | Not useful for commodity building materials (cement bags, rebar bundles) |
| BIM integration | Enterprise feature for architectural firms. HyperQuote serves contractors, not architects |
| Dashboard-style UI | Design mandate: spatial glass windows. No sidebars, no breadcrumbs, no KPI cards on canvas |
| FMCSA / US driver compliance | Egyptian market only. Egyptian driving license system (Third/Second/First Degree) instead |
| ZATCA / Saudi e-invoicing | Egyptian market only. ETA e-invoicing instead. Add ZATCA only if expanding to Saudi Arabia |
| Real-time chat between customer and supplier | Intermediary model -- HyperQuote is always between customer and supplier |
| Automatic supplier PO sending on every RFQ | Would spam suppliers and erode relationships. Match to cached prices first |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| FOUND-01 | Phase 1 | Complete |
| FOUND-02 | Phase 2 | Complete |
| FOUND-03 | Phase 1 | Complete |
| FOUND-04 | Phase 1 | Complete |
| FOUND-05 | Phase 3 | Complete |
| FOUND-06 | Phase 3 | Complete |
| FOUND-07 | Phase 3 | Complete |
| FOUND-08 | Phase 3 | Complete |
| WEB-01 | Phase 4 | Complete |
| WEB-02 | Phase 4 | Complete |
| WEB-03 | Phase 4 | Complete |
| WEB-04 | Phase 5 | Complete |
| WEB-05 | Phase 5 | Complete |
| WEB-06 | Phase 6 | Complete |
| WEB-07 | Phase 6 | Complete |
| WEB-08 | Phase 6 | Complete |
| WEB-09 | Phase 6 | Complete |
| WEB-10 | Phase 6 | Complete |
| WEB-11 | Phase 6 | Complete |
| WEB-12 | Phase 6 | Complete |
| PORT-01 | Phase 7 | Complete |
| PORT-02 | Phase 7 | Complete |
| PORT-03 | Phase 8 | Complete |
| PORT-04 | Phase 9 | Pending |
| PORT-05 | Phase 10 | Pending |
| PORT-06 | Phase 11 | Pending |
| PORT-07 | Phase 11 | Pending |
| PORT-08 | Phase 11 | Pending |
| PORT-09 | Phase 11 | Pending |
| PORT-10 | Phase 11 | Pending |
| PORT-11 | Phase 11 | Pending |
| PORT-12 | Phase 11 | Pending |
| PORT-13 | Phase 9 | Pending |
| PORT-14 | Phase 11 | Pending |
| PORT-15 | Phase 11 | Pending |
| PORT-16 | Phase 11 | Pending |
| PORT-17 | Phase 7 | Complete |
| SUPP-01 | Phase 12 | Pending |
| SUPP-02 | Phase 12 | Pending |
| SUPP-03 | Phase 12 | Pending |
| SUPP-04 | Phase 12 | Pending |
| SUPP-05 | Phase 12 | Pending |
| SUPP-06 | Phase 12 | Pending |
| DB-01 | Phase 13 | Pending |
| DB-02 | Phase 2 | Complete |
| DB-03 | Phase 13 | Pending |
| DB-04 | Phase 2 | Complete |
| DB-05 | Phase 13 | Pending |
| DB-06 | Phase 14 | Pending |
| DB-07 | Phase 14 | Pending |
| DB-08 | Phase 14 | Pending |
| DB-09 | Phase 14 | Pending |
| DB-10 | Phase 14 | Pending |
| INT-01 | Phase 15 | Pending |
| INT-02 | Phase 15 | Pending |
| INT-03 | Phase 15 | Pending |
| INT-04 | Phase 15 | Pending |
| INT-05 | Phase 15 | Pending |
| INT-06 | Phase 15 | Pending |
| INT-07 | Phase 15 | Pending |
| INT-08 | Phase 15 | Pending |
| SALE-01 | Phase 16 | Pending |
| SALE-02 | Phase 16 | Pending |
| SALE-03 | Phase 16 | Pending |
| SALE-04 | Phase 16 | Pending |
| SALE-05 | Phase 16 | Pending |
| SALE-06 | Phase 16 | Pending |
| SALE-07 | Phase 16 | Pending |
| SALE-08 | Phase 16 | Pending |
| SALE-09 | Phase 16 | Pending |
| SALE-10 | Phase 16 | Pending |
| PROC-01 | Phase 17 | Pending |
| PROC-02 | Phase 17 | Pending |
| PROC-03 | Phase 17 | Pending |
| PROC-04 | Phase 17 | Pending |
| PROC-05 | Phase 17 | Pending |
| OPS-01 | Phase 18 | Pending |
| OPS-02 | Phase 18 | Pending |
| OPS-03 | Phase 18 | Pending |
| WH-01 | Phase 19 | Pending |
| WH-02 | Phase 19 | Pending |
| WH-03 | Phase 19 | Pending |
| WH-04 | Phase 19 | Pending |
| WH-05 | Phase 19 | Pending |
| WH-06 | Phase 19 | Pending |
| WH-07 | Phase 19 | Pending |
| FIN-01 | Phase 20 | Pending |
| FIN-02 | Phase 20 | Pending |
| FIN-03 | Phase 20 | Pending |
| FIN-04 | Phase 20 | Pending |
| FIN-05 | Phase 20 | Pending |
| FIN-06 | Phase 20 | Pending |
| FIN-07 | Phase 20 | Pending |
| FIN-08 | Phase 20 | Pending |
| FIN-09 | Phase 20 | Pending |
| DISP-01 | Phase 21 | Pending |
| DISP-02 | Phase 21 | Pending |
| DISP-03 | Phase 21 | Pending |
| DISP-04 | Phase 21 | Pending |
| CS-01 | Phase 22 | Pending |
| HR-01 | Phase 22 | Pending |
| ADM-01 | Phase 22 | Pending |
| RPT-01 | Phase 22 | Pending |
| AI-01 | Phase 22 | Pending |
| CEO-01 | Phase 23 | Pending |
| CEO-02 | Phase 23 | Pending |
| CEO-03 | Phase 23 | Pending |
| CEO-04 | Phase 23 | Pending |
| CEO-05 | Phase 23 | Pending |
| CEO-06 | Phase 23 | Pending |
| CEO-07 | Phase 23 | Pending |
| CEO-08 | Phase 23 | Pending |
| DRV-01 | Phase 24 | Pending |
| DRV-02 | Phase 24 | Pending |
| DRV-03 | Phase 25 | Pending |
| DRV-04 | Phase 25 | Pending |
| DRV-05 | Phase 25 | Pending |
| DRV-06 | Phase 25 | Pending |
| DRV-07 | Phase 25 | Pending |
| DRV-08 | Phase 25 | Pending |
| DRV-09 | Phase 26 | Pending |
| DRV-10 | Phase 26 | Pending |
| DRV-11 | Phase 26 | Pending |
| DRV-12 | Phase 24 | Pending |
| INTG-01 | Phase 27 | Pending |
| INTG-02 | Phase 28 | Pending |
| INTG-03 | Phase 28 | Pending |
| INTG-04 | Phase 29 | Pending |
| INTG-05 | Phase 30 | Pending |
| INTG-06 | Phase 31 | Pending |
| INTG-07 | Phase 31 | Pending |
| TEST-01 | Phase 32 | Pending |
| TEST-02 | Phase 32 | Pending |
| TEST-03 | Phase 32 | Pending |
| TEST-04 | Phase 32 | Pending |

**Coverage:**
- v1 requirements: 135 total
- Mapped to phases: 135
- Unmapped: 0

---
*Requirements defined: 2026-03-31*
*Last updated: 2026-03-31 after roadmap creation*
