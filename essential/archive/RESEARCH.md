# HyperQuote - B2B Building Materials Logistics Platform
# Complete Research Document
**Date:** 2026-03-29 | **Sources:** 87 parallel research agents + Context7 docs + customer/internal flow validation + stack validation

---

## Table of Contents
1. [Platform Vision](#1-platform-vision)
2. [Technology Stack](#2-technology-stack)
3. [Product Surfaces](#3-product-surfaces)
4. [Customer Flow — Research-Validated](#4-customer-flow--research-validated)
5. [Internal System — Research-Validated](#5-internal-system--research-validated)
6. [AI Integration](#6-ai-integration)
7. [Infrastructure & Operations](#7-infrastructure--operations)
8. [Business Operations](#8-business-operations)
9. [Stack Decisions Summary](#9-stack-decisions-summary)
10. [Detailed Research Files Index](#10-detailed-research-files-index)

---

## 1. Platform Vision

### What We're Building
A white-label B2B logistics platform for building materials distribution, operating on a quote-based RFQ model with no published prices and no online payments. The platform consists of:

- **Website** — Public-facing, SEO-optimized, AI chatbot for lead capture; guests browse catalog with price ranges (no exact prices)
- **Internal Platform** — ONE unified app with role-based modules (Sales, Procurement, Orders/Operations, Warehouse, Finance, Logistics/Dispatch, Customer Service/Support, HR, Admin, Reports/Analytics, AI) — NOT separate apps per department
- **Customer Portal (PWA)** — Material list builder + quote management + order tracking (no cart, no checkout, no prices)
- **Supplier Portal (PWA)** — Two-way marketplace: suppliers publish stock + receive POs; AI catalog parsing
- **Driver App (Capacitor native)** — GPS tracking, proof of delivery, offline-first — the only native app at launch
- **CEO App (PWA)** — Search-bar-only interface with dual AI (Analytics + RAG), KPIs accessible via search/AI (not dashboard cards)

### White-Label Architecture
Single codebase, configurable branding via a `brand.config.json` file:
- Name, logo (light/dark), favicon, colors, fonts, border radius
- CSS custom properties cascade to all web apps
- Capacitor theme module generated for the Driver App
- Tailwind CSS v4 custom properties cascade to all apps
- Tenant resolved at edge via subdomain/custom domain
- Assets stored in R2 with tenant-prefixed paths

### Order Flow (Quote-to-Cash)
1. Product Discovery (catalog with price ranges, search, AI chat)
2. Material List Building (customer assembles needed items by project)
3. Quote Request / RFQ (customer submits material list with quantities and delivery needs)
4. Supplier Sourcing (2-5 suppliers per category, parallel outreach)
5. Quote Building (margin engine applies rules, internal approval)
6. Quote Delivery (sent to customer with validity period)
7. Negotiation (version-tracked counter-offers)
8. Acceptance (quote converts to order, supplier POs auto-generated)
9. Fulfillment (drop-ship from supplier or pick/pack/ship from warehouse)
10. Delivery (route optimization, GPS tracking, POD)
11. Invoicing (auto-generated from delivery confirmation)
12. Payment Tracking (wire/check/LC recorded manually, matched to invoices)

### Quote-Based Pricing Model

Prices are NEVER published to customers. The entire platform operates on a Request-for-Quote model.

**Margin Benchmarks (Building Materials Industry):**
- Lumber/Timber: 15-20% (floor 12%)
- Concrete/Cement: 18-22% (floor 14%)
- Steel/Metal: 12-18% (floor 10%)
- Roofing: 22-28% (floor 18%)
- Specialty/Custom: 30-45% (floor 25%)

**Speed Optimization:**
- Pre-negotiated supplier pricing tiers for instant quotes on covered items
- Cached recent prices with confidence decay for estimated quotes in <1 hour
- AI price prediction from historical data for draft quotes while waiting for suppliers
- Parallel supplier outreach with 24-48h response windows

**Quote Status Machine:** DRAFT → SENT → ACCEPTED / DECLINED / NEGOTIATING / EXPIRED / CANCELLED

### Egyptian Market Requirements

**VAT:** 14% on ALL building materials (no exemptions). Quotes show prices ex-VAT with separate VAT line + VAT-inclusive total. B2B buyers reclaim input VAT, so net cost = pre-VAT price.

**ETA E-Invoicing (Mandatory):**
- All B2B invoices must be submitted electronically to the Egyptian Tax Authority (ETA) in JSON/XML format
- Each invoice requires digital signature (HSM or software-based via ITIDA)
- Products must have EGS/GPC item codes
- Both seller and buyer Tax Registration Numbers (9-digit TRN) required
- Real-time submission to ETA platform
- Integration with ETA API is a Phase 1 requirement, not optional

**Withholding Tax:** 1% withheld on payments to suppliers for goods (building materials). HyperQuote must withhold, remit quarterly to ETA via Form 41, and issue certificates to suppliers. AP module must track gross, withholding, and net amounts.

**Quote Validity:** 7-15 days is Egyptian industry standard for building materials (NOT 14 days for volatile items like steel/cement — use 5-7 days). Tiered: stable products get 14 days, volatile commodities get 5-7 days.

**Payment Terms for New Customers:** 50% advance + 50% COD by certified bank check (شيك مصرفي معتمد). NOT Net 30. Post-dated personal checks are high-risk (bounced check epidemic in Egyptian construction). Net terms only after 2-3 successful cash transactions + credit application.

**Language:** Bilingual mandatory — Arabic primary (right-to-left), English secondary. Tax invoices must be in Arabic per ETA. Legal/T&C text in Arabic for court enforceability. Product names bilingual.

**Document Format:** PDF mandatory (A4, printable in B&W). Procurement teams print, stamp, sign, file. WhatsApp-friendly file size. Both Quote AND Proforma Invoice supported (proforma needed for LCs and purchase approvals).

### Commercial Relationship Model (Drop-Ship Brand Presence — Research-Validated)

**Principle: Don't hide the supplier. Own the commercial relationship.**

Egyptian construction companies understand the trading/distribution model. Trying to pretend HyperQuote manufactures cement would damage credibility. The customer knows materials come from suppliers — they chose HyperQuote for pricing, credit, technology, and convenience.

**Two Non-Negotiables:**
1. **HyperQuote-branded delivery note on EVERY delivery** — system generates PDF (logo, order number, items, quantities, NO prices), sent to supplier to print and attach. Customer signs HyperQuote's document, not the supplier's.
2. **Supplier pricing NEVER reaches the customer** — no supplier invoices, packing slips, or price lists with deliveries. The margin is the real secret, not the supplier's identity.

**What We Don't Do:**
- Don't rebrand supplier trucks (impractical, unnecessary)
- Don't use third-party carriers for routine deliveries (kills margins)
- Don't pretend to manufacture products (damages Egyptian business credibility)

**What We Do:**
- All invoices, delivery notes, payment instructions, support → HyperQuote branded
- Non-circumvention clauses in supplier agreements (baseline legal protection)
- Build value that prevents disintermediation: credit terms, multi-supplier aggregation, technology platform, delivery coordination, single point of contact

**Disintermediation Protection (why customers stay):**
1. Credit terms (suppliers want cash, HyperQuote offers Net 30-60)
2. Multi-supplier sourcing (one order covers 4+ suppliers)
3. Technology portal (tracking, AI, documentation)
4. Problem resolution (one call, HyperQuote handles the supplier)
5. Volume-aggregated pricing
6. Relationship and trust

**Supplier Agreement Requirements:**
- Non-circumvention clause: supplier shall not sell directly to HyperQuote-introduced customers
- No supplier pricing visible to end customer on any document
- Supplier must use HyperQuote's branded delivery note for all drop-ship deliveries
- Supplier must report delivery status to HyperQuote's portal

### Inventory Strategy
- **Phase 1 (Launch):** No inventory — pure drop-ship/sourced per deal. 80%+ of deliveries go directly from supplier to customer site
- **Phase 2 ($5-10M):** Stock top 20% fast-movers (commodity cement, standard rebar, common lumber). Minimum viable warehouse: shared yard + small covered storage ($6-12K/month)
- **Phase 3 ($10-50M):** Full warehouse operation ($14-90K/month). Receiving, putaway, picking, loading, cycle counts, yard management. Inventory carrying cost: 15-30% annually

### Egyptian Operational Context (Research-Validated)

**Prayer Times:**
- 5 daily prayers (Fajr, Dhuhr, Asr, Maghrib, Isha) — each takes 5-10 minutes
- **Friday Jumu'ah: hard blackout 11:30 AM - 1:30 PM** (no deliveries, no customer calls, no warehouse operations)
- System integrates prayer-time API; ETAs include 10-15 minute buffer around prayer times
- Delivery windows avoid prayer times automatically

**Work Week:**
- Weekend: Friday + Saturday (NOT Saturday + Sunday)
- Work week: Sunday - Thursday
- System calendar enforces this for: delivery scheduling, SLA calculations, escalation timers, report generation

**Ramadan 2026: February 18 - March 19:**
- Working hours legally reduced to 6h/day (Labor Law 14/2025)
- Business hours typically shift: 9AM-3PM or 10AM-4PM
- System switches to Ramadan mode: adjusted SLAs, shorter delivery windows, modified working hours in dispatch scheduling
- No eating/drinking during daylight — affects site workers, drivers

**Public Holidays (14-15 per year):**
- Eid al-Fitr (3-4 days), Eid al-Adha (4 days), Islamic New Year, Prophet's Birthday, Revolution Day (Jan 25), Sinai Liberation (Apr 25), Labour Day (May 1), June 30 Revolution, July 23 Revolution, Armed Forces Day (Oct 6), Coptic Christmas (Jan 7), Sham El-Nessim
- Islamic holidays shift by 1-2 days based on moon sighting — system must handle variable dates
- Holiday calendar configurable in admin panel

**Khamsin Dust Storms (March-May):**
- Winds 40-80 km/h, visibility below 1 km, temperature spikes 10-15°C
- **Block deliveries of sheet materials (plywood, drywall) above 30 km/h wind** — they act as sails
- Weather API integration; dispatch module shows weather alerts
- Cement: cover with tarp during Khamsin (5% moisture = total loss)
- Auto-pause outdoor warehouse operations during severe Khamsin

**Summer Heat (June-September):**
- 40-50°C in Upper Egypt
- Cement shelf life shortened to 2-3 months in extreme heat
- Driver safety: mandatory breaks, water supply, no loading during peak heat (12-3 PM)
- Adhesives/sealants: reduced shelf life tracking in warehouse module

**OTP Delivery:**
- Egyptian SMS reliability below 85%. WhatsApp delivery: 99.5%
- **Primary: WhatsApp OTP** (not SMS). Fallback: SMS after 30s, voice call after 60s
- Carrier prefix detection: +20 10x = Vodafone, +20 11x = Etisalat, +20 12x = Orange

**Accident Procedures:**
- Mahdar (محضر) police report created at scene
- Driver can be detained for fatal accidents
- Vehicle impounded for investigation (potentially weeks)
- Insurance notification within 48-72 hours
- Dispatch must: reroute remaining deliveries immediately, notify affected customers, arrange replacement vehicle
- Paper accident report form in every truck

**Hijri Calendar:** Gregorian only for all business documents. Optional Hijri display via `Intl.DateTimeFormat` for users who prefer it. Not the system default.

**Currency Formatting:** "EGP" prefix in English mode, "ج.م" suffix in Arabic mode. Thousand separator: comma in English (50,000), no separator or Arabic comma in Arabic. Use `Intl.NumberFormat` with locale.

---

## 2. Technology Stack

### Core Stack Decision

| Layer | Package | Version | Status |
|-------|---------|---------|--------|
| **Language** | TypeScript | 6.0.2 | Stable |
| **UI Library** | React | 19.2.4 | Stable |
| **Build Tool** | Vite | 7.3.1 | Stable (NOT Vite 8 — TanStack Start incompatible) |
| **Framework** | TanStack Start | 1.167.12 | Stable v1. Cloudflare Workers native support |
| **Routing** | TanStack Router | 1.168.0 | Type-safe routing with Zod-validated search params |
| **Server State** | TanStack Query | 5.95.2 | SSR via @tanstack/react-router-ssr-query |
| **Styling** | Tailwind CSS | 4.2.2 | CSS-first config, @tailwindcss/vite required |
| **UI Primitives** | React Aria Components | 1.16.0 | Accessibility-first, best-in-class RTL/Arabic |
| **Animation** | Motion | 12.38.0 | Spring enter, tween exit, CSS for overlays |
| **State** | Zustand 5 + XState Store 3 | — | UI state + state machines |
| **Forms** | React Hook Form 7 + Zod 3 | — | Use useWatch() not watch() (React 19 issue) |
| **i18n** | react-i18next 17 + React Aria I18nProvider | — | Arabic-Indic numerals, Islamic calendar, 38 locales |
| **AI** | TanStack AI 0.9 + @cloudflare/tanstack-ai 0.1 | — | 0.x — wrapped behind abstractions |
| **Icons** | lucide-react | 1.7.0 | Tree-shaken, ~200-300 bytes/icon |
| **Database** | Supabase (PostgreSQL) | — | 53 tables, 27 enums, RLS for 25+ roles |
| **Auth** | Supabase Auth via @supabase/ssr 0.9 | — | SSO across *.hyperquote.net via cookie domain |
| **Realtime** | Supabase Realtime | — | Postgres Changes + Broadcast (GPS) + Presence |
| **Edge/CDN** | Cloudflare Workers + R2 + KV + Queues | — | 5 Workers (one per app) + shared bindings |
| **AI Gateway** | Cloudflare AI Gateway | — | Claude proxy with caching, rate limiting, analytics |
| **Connection Pool** | Cloudflare Hyperdrive | — | Eliminates cold connection latency to Supabase |
| **Maps** | MapLibre GL 5.21 + react-map-gl 8.1 | — | PMTiles for offline, MapTiler for Arabic labels |
| **Driver GPS** | @transistorsoft/capacitor-background-geolocation 9.0.2 | — | $399 license, background GPS + geofencing |
| **Offline Sync** | PowerSync (Capacitor SDK) | — | WAL-based Supabase → SQLite sync |
| **Monorepo** | Bun workspaces + Turborepo 2.8.21 | — | workspace:* protocol, task caching |
| **Testing** | Vitest 4 (browser) + Playwright 1.58 + Storybook 10 | — | Real browser ARIA testing |
| **Deploy** | Cloudflare Workers (5 Workers, one per app) | — | wrangler 4.77, nodejs_compat required |

### 2.1 Architecture Pattern

**API Pattern:** Apps → Cloudflare Workers (server functions) → Supabase. Client NEVER calls Supabase directly (except Realtime WebSocket subscriptions which are RLS-protected).

**App Deployments:**
- hyperquote.net — Website (TanStack Start, SSG+SSR)
- app.hyperquote.net — Internal Platform (TanStack Start, SPA)
- portal.hyperquote.net — Customer + Supplier Portal (TanStack Start, SSR)
- ceo.hyperquote.net — CEO Command Center (TanStack Start, SPA/PWA)
- driver.hyperquote.net — Driver App (Vite + React SPA + Capacitor native, NOT TanStack Start)

**SSO:** Dual-pool cookie model on `.hyperquote.net` domain. External pool: login on website = logged into portal. Internal pool: login on internal platform = logged into CEO app. Cross-pool access is impossible (separate cookie names, JWT claims, RLS policies).

**Shared Packages (6):** @hyperquote/ui, @hyperquote/api, @hyperquote/web-auth, @hyperquote/i18n, @hyperquote/forms, @hyperquote/tables

**Driver App Exception:** Built as separate Vite + React SPA (not TanStack Start) because server functions don't work in Capacitor WebViews. Shares component libraries and types with other apps.

### 2.2 Known Risks and Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| @supabase/ssr on Workers (stream polyfill) | High | Enable nodejs_compat flag. Test in Phase 1 |
| React Hook Form watch() + React 19 Compiler | High | Use useWatch() everywhere, never watch() |
| TanStack AI / Hotkeys / CF AI are 0.x | High | Wrap behind thin abstractions. Swap if APIs break |
| React Aria + Motion Popover race (#9158) | Medium | CSS transitions for overlays, Motion for modals only |
| React Aria I18nProvider SSR bug (#7474) | Medium | Pass locale explicitly, don't rely on auto-detection |
| vite-plugin-pwa incompatible with TanStack Start | Medium | Manual Workbox for PWA apps. Capacitor for driver |
| cloudflare:workers import in client builds (#6185) | Medium | Only use in server functions, never middleware |
| Tailwind v4 group-selected: variant issues | Medium | Use group-data-[selected]: as fallback |
| Vite 8 incompatible with TanStack Start | Low | Stay on Vite 7. Don't upgrade independently |
| 100+ routes slow Vite dev server | Low | autoCodeSplitting: true, lazy route imports |

### 2.3 Database Overview

**53 tables across 15 domains:** Auth (5), Customers (5), Suppliers (3), Products (4), Quotes (4), Orders (2), Procurement (3), Warehouse (6), Deliveries (6), Finance (8), Returns (1), Support (2), AI (5), System (9)

**27 enums** covering all status types, roles, permissions, payment methods, categories, units of measure

**36 Edge Functions** for AI, notifications, PDF generation, credit checks, scheduled jobs

**12 cron jobs** for quote expiry, AR aging, metrics pre-computation, SLA breach detection

**~200 migrations** organized by domain with numbered prefixes

### 2.4 Caching Strategy

**7 cache layers:** CDN (static assets) → Workers Cache API (API responses, 5-60min TTL) → KV (JWKS, sessions, brand config, margin rules) → Hyperdrive (DB query cache, 60s) → TanStack Query (client-side, per-data-type stale times) → PowerSync (driver offline SQLite) → R2 (files, zero egress)

**Never cached:** GPS positions, WebSocket data, order mutations, payment data, chat messages

**Invalidation:** Hybrid event-driven (DB trigger → webhook → purge cache) + TTL-based (eventually consistent for non-critical data)

### 2.5 Integration Map

**Launch services (~$145-290/month):**
- Supabase Pro: $25/mo (upgrade compute only when needed)
- Cloudflare Workers: $0-5/mo
- AI (4-tier): ~$61/mo at 50 users
- Resend: $20/mo
- Transistor Software: $399 one-time

**Add as you grow:**
- WhatsApp Cloud API (Meta direct, NOT Twilio): ~$50-100/mo
- Twilio (SMS only): ~$80-150/mo
- PowerSync: $49/mo (when driver app launches)
- MapTiler: $25/mo
- Avalara: ~$50-100/mo (if US operations)

**Deferred:**
- D&B/Experian, Plaid, QBO, Samsara/Geotab — add at later growth stages

### Supabase - Key Patterns

**Row Level Security (Multi-Role):**
- Helper functions: `auth.user_org_id()`, `auth.user_role()`
- CEO/Admin: full access within org
- Employees: read/update within org by permission
- Customers: see only their own quotes/orders
- Suppliers: see POs containing their products + their own catalog
- Drivers: see only assigned deliveries
- Performance tip: wrap `auth.uid()` in SELECT subquery (99.99% improvement per Supabase benchmarks)

**Realtime Strategy:**
- `postgres_changes` for persistent data (order status, delivery updates, quote notifications)
- `broadcast` for ephemeral high-frequency data (GPS pings)
- `presence` for online status (dispatch dashboard)

**pgvector for AI/RAG:**
- HNSW index for fast similarity search
- RLS-aware: even AI queries respect data isolation
- 1536-dimension embeddings (OpenAI) or 384 (Cloudflare AI)

**Schema Highlights:**
- `organizations` table with JSONB `branding` column (white-label config)
- `profiles` with role enum (ceo, admin, employee, supplier, customer, driver)
- `quotes` with version tracking and state machine
- `orders` with enum state machine + transition function enforced in DB
- `inventory_movements` ledger pattern (append-only, trigger updates `inventory`)
- `payment_records` for manual recording of wire/check/LC (no payment gateway)
- `audit_log` via triggers on all key tables
- `documents` table pointing to R2 object keys

### Cloudflare - Key Patterns

**Hyperdrive** connects Workers to Supabase PostgreSQL with connection pooling (eliminates cold-connection latency).

**R2** for file storage (zero egress fees):
- Delivery photos, invoices, BOLs, signatures, supplier catalogs
- Presigned URLs for direct upload/download from mobile
- Tenant-prefixed path structure: `/{tenant_id}/invoices/{year}/{month}/`

**Workers:**
- 5-minute CPU time limit (paid plan) — sufficient for complex workflows
- 128 MB memory limit — stream data, don't load large datasets
- Durable Objects + WebSockets for real-time (32K connections per DO)
- Queues for async processing + Workflows for multi-step durable execution
- Cron Triggers (up to 250) for scheduled tasks

**AI Gateway** proxies Claude API calls with caching, rate limiting, analytics, and fallback routing.

---

## 3. Product Surfaces

### 3.1 Website

**Architecture:** TanStack Start with SSG+SSR on Cloudflare Workers

**Website Design (per UI-VISION.md — non-negotiable):**
- Godly-level, award-winning modern B2B, cinematic, scroll-driven, real photography (NOT AI slop — real Cairo construction sites, real equipment, real workers)
- Home and About: cinematic full-viewport sections. Market, Support, Docs: functional content-driven layouts
- Fixed minimal header — logo left, nav center, CTA + language/theme toggles right. Sticky with blur on scroll. Mobile: hamburger, full-screen overlay

**Pages:** Homepage, Products/Catalog (with price ranges, no exact prices), Product Detail (specs, certs, datasheets), Service Areas/Locations, Request Quote, About, Resources/Blog, Contact, Pro/Contractor Program, Login/Dashboard

**Conversion Features:**
- AI chatbot as floating button (2.4x conversion vs static forms; 55% more high-quality leads)
- Request-for-Quote on every product page
- Material list builder (CSV upload, search-and-add)
- Price ranges displayed ("Starting from AED 12/bag for 100+ bags") — never exact prices
- Availability indicators (in stock, lead time estimates)

**SEO:** Server-rendered HTML, Schema.org Product markup, XML sitemaps, local SEO per service area, three-tier content strategy (guides, comparisons, case studies)

**Website-to-Portal:** Separate TanStack Start apps per subdomain. SSO via cookie on `.hyperquote.net` domain. Login on any app = logged in on all apps.

### 3.2 Customer Portal (PWA)

The portal has NO cart, NO checkout, NO published prices. It is a material list builder + quote management + order tracking tool.

**Format:** PWA at launch (17-76% higher conversion than native apps). Native app considered only after 6-12 months if data shows need. The companies that succeeded with native apps (Ferguson, Grainger) built them after years of web presence, not before.

**Portal Design (per UI-VISION.md — non-negotiable):**
- Same spatial philosophy — wide space, glass windows
- AI chat centered — this is the primary interaction point for the portal
- Two buttons beneath chat: Orders and Market
- Each opens a glass window with the full experience
- Customers who don't want chat: Orders and Market buttons always there
- Supplier role toggle: adjusts available windows (stock submission, PO management)
- Mobile: same pattern, touch-adapted

**Portal Sections (inside glass windows):**
1. **Orders** — Active quotes, pending orders, recent activity, material list builder, order tracking
2. **Browse Market** — Product catalog without prices (specs, images, datasheets, availability, price ranges), "Add to Quote" buttons
3. **Material List Builder** — Build lists by project, save drafts, upload specs/drawings. Multiple input methods:
   - Search-and-Add with autocomplete (primary — 50 items in <10 min)
   - CSV/Excel upload with template (for large BOMs)
   - Quick Order Pad (SKU + quantity grid)
   - Browse catalog + "Add to Quote"
   - AI chat: "I need 400 units of wood" → structured draft
   - AI Estimator: "Building 3-floor apartment, 200sqm/floor" → material list with disclaimers
4. **My Quotes** — All quotes with statuses (pending, sent, negotiating, accepted, expired)
5. **My Orders** — Confirmed orders with delivery tracking + GPS map (5 stages: Confirmed → Being Prepared → Out for Delivery → Delivered → Invoice Generated)
6. **Documents** — Invoices, delivery notes, BOLs, certificates
7. **Support** — WhatsApp (primary), in-app chat, ticket submission
8. **AI Chat** — Floating button, always available: natural language requests, project estimation, reorder from history

**AI Chat Capabilities:**
- Simple: "I need 400 units of wood" → drafts quote request
- Estimation: "Building 3-floor apartment, 200sqm/floor, how much cement?" → AI researches, drafts material list with disclaimer
- Reorder: "Reorder what I got last month" → pulls previous order, creates draft
- All drafts are editable before submitting

**Multi-User Accounts:** B2B buying involves 6-10 people. Support roles from day one: buyer, approver, site manager. Procurement manager browses, shares with PM, foreman sets quantities.

**Project-Based Organization:** GCs managing 5+ sites need per-project grouping. Quotes, orders, and deliveries organized by project.

**Repeat-Purchase Features:** One-tap reorder, saved material lists, favorite products, AI reorder suggestions ("You ordered cement 30 days ago. Time to reorder?"), quick text order.

**Real-Time:** Live order status, GPS delivery tracking on map, instant messaging with sales rep

**Notifications:** Email (54% open rate for order confirmations), SMS for delivery day-of, push for status changes, WhatsApp for quote-ready and support

### 3.3 Supplier Portal (PWA) — Two-Way Marketplace

The supplier portal is NOT just for receiving POs. Suppliers actively publish their stock to the marketplace.

**Format:** PWA. Suppliers don't need a native app.

**Supplier Publishes Catalog:**
1. Uploads catalog (PDF, Excel, CSV — any format)
2. AI parses and extracts structured product data (Mistral OCR + Groq structuring: ~$0.20-0.60/200-page catalog, 85-95% accuracy)
3. Supplier reviews AI extraction in side-by-side UI (original doc + extracted data with confidence scores)
4. Submits for HyperQuote review
5. Auto-approve for trusted suppliers; manual review for new suppliers/categories
6. Approved products appear in marketplace

**Supplier Manages Pricing:**
- Update prices individually or bulk
- AI drafts price changes from uploaded new price lists
- Price changes can be instant (trusted suppliers) or approval-required
- Price change history with full audit trail
- System flags quotes affected by price changes

**Supplier Manages Stock:**
- Manual portal updates, CSV upload, or API real-time sync
- Low stock alerts
- Out-of-stock products show "Lead time: X weeks" (not hidden)

**Supplier Sees Analytics:**
- Product views/impressions on marketplace
- Quote inclusion rate (how often their products are in customer quotes)
- Win rate, revenue, and performance scorecard (5-10 KPIs)

**PO Management:** Receive, confirm, reject POs. Delivery scheduling, ASN submission, invoice submission (3-way matching).

**Integration Tiers:**
1. Portal-only (small suppliers, manual)
2. API + Webhooks (modern suppliers, real-time inventory sync)
3. EDI (large/traditional suppliers via managed service)

**Onboarding:** Digital self-registration, document submission, compliance verification (automated), catalog setup via AI parsing, integration setup, testing

**Supplier Operations — Additional Details (Research-Validated):**

**Supplier contracts:** `supplier_agreements` table for framework agreements, exclusivity, volume commitments, price escalation clauses. Contract PDFs are RAG-searchable via pgvector.

**Stock API:** REST at `api.hyperquote.net/supplier/v1`, API key auth, 100 req/min, bulk endpoint (500 items max).

**Regional pricing:** Region-tagged price lists, delivery address mapped to region code.

**Product matching:** Master catalog with AI-suggested matches (pg_trgm + pgvector). Human confirmation required — never fully automatic.

**Non-technical supplier onboarding:** 3 tiers — WhatsApp-only (AI parses free text), simplified portal (magic link, reduced UI), full portal + API.

**Bulk operations:** CSV upload with preview/diff, bulk percentage price adjustment, API bulk endpoint.

**Channel conflict (supplier):** PO anonymization (supplier never sees end customer name), multi-source all products, differentiate on service not information brokering.

### 3.4 Internal Employee Platform

**ONE unified platform** with role-based modules. NOT separate apps per department. This is what NetSuite and Odoo do — 22% better TCO and eliminates data sync issues.

**11 Core Modules:**

| Module | Primary Users | Core Function |
|--------|--------------|---------------|
| **Sales** (includes CRM/customer 360) | Account Managers, Inside Sales, Quoting Specialists | RFQ inbox, quote builder, pipeline, customer relationships, history, account health |
| **Procurement** | Buyers, Category Managers | Supplier RFQ outbound, price comparison, PO management |
| **Orders/Operations** | Ops Manager, Logistics Coordinator | Order fulfillment kanban, delivery scheduling, tracking |
| **Warehouse** | Warehouse Manager, Workers | Receiving, putaway, picking, cycle counts, yard management |
| **Finance** | Controller, AR/AP Clerks, Credit Manager | Invoicing, payment recording, AR aging, credit management |
| **Logistics/Dispatch** | Dispatcher | Route planning, fleet tracking, driver assignment, delivery |
| **Customer Service/Support** | CS Reps, Claims Specialist | Ticket queue, WhatsApp inbox, returns/claims |
| **HR** | HR Manager, Payroll | Employee records, attendance, payroll, compliance |
| **Admin** | IT, Department Managers | Users, roles, permissions, system settings, margin rules |
| **Reports/Analytics** | All + Management | Role-specific dashboards, KPIs, analytics |
| **AI** | All | Company-wide AI assistant — NL queries, anomaly detection, suggestions per role |

**Internal Platform Design (per UI-VISION.md — non-negotiable):**
- Wide open space after login — NOT a traditional dashboard
- Soft vertical strip of minimal icons (one per module) — always present but unobtrusive
- Each icon opens a glass window with the complete experience for that module
- Keyboard hotkeys: single-key fires when no input focused (O for Orders, F for Finance, etc.)
- Pressing another hotkey while window is open: crossfade swap
- Escape: close current window, return to space
- Ctrl+K: command palette (elevated glass, search everything)
- Canvas (home state): clean greeting "Good morning, Ahmed" — if urgent items: "3 items need attention"
- **No KPI cards or metrics on the canvas.** Data lives inside windows.
- Notifications: simple badge/dot indicator, opens notification window (glass)
- Mobile: domain icons as tappable glass cards, full-screen on tap, back gesture returns to canvas

**Role-Based Data (inside module windows, NOT on canvas):**
- **Sales:** Pipeline value, open quotes, incoming RFQs, win rate, customer activity feed
- **Procurement:** Pending supplier inquiries, price responses, PO status, supplier performance
- **Operations:** Kanban fulfillment board (PO Placed → In Transit → At Warehouse → Out for Delivery → Delivered), delivery calendar
- **Finance:** AR aging breakdown, expected payments this week, credit utilization, margin tracking, AP schedule
- **Management:** Revenue pipeline funnel, margin trend, team performance, alerts/exceptions, top customers and suppliers

**AI per Role:**
- Sales: customer purchase patterns, cross-sell suggestions, NL order entry
- Warehouse: voice-driven picking, anomaly detection
- Dispatch: route optimization, dynamic re-routing
- CS: instant order lookup, suggested responses, sentiment detection
- Finance: anomaly detection, collection scoring, NL report generation
- Manager: NL business intelligence, exception summarization

**Tech:** React + React Aria Components + Tailwind CSS v4, TanStack Table/Query, Supabase RLS for RBAC

### 3.5 Driver App (Capacitor Native — Only Native App)

**Architecture:** Vite + React SPA + Capacitor (NOT TanStack Start) + PowerSync (offline-first) + MapLibre GL

**Driver App Design (per UI-VISION.md — non-negotiable):**
- Ultra-simple, Uber driver simplicity, zero cognitive load
- Big cards, one delivery at a time, giant buttons, swipe to complete
- PWA + Capacitor native

**Features:**
- GPS tracking (adaptive: 5s active delivery, 15s en route, 30s idle)
- Turn-by-turn navigation (Sygic/HERE truck-safe routing)
- Route optimization (OR-Tools or GraphHopper for VRP)
- Proof of delivery (photo + digital signature + barcode scan)
- Geofencing (auto-detect arrival/departure, 150-300m radius for construction sites)
- Offline-first (PowerSync Capacitor SDK + Supabase for bi-directional sync)
- Load verification, damage reporting, partial delivery tracking
- Per-delivery unloading method, PPE checklist, site access instructions

**UX:** One-handed operation, bottom 40% touch targets (56-64dp minimum), voice input, auto dark mode, large buttons, minimal typing

**Offline Strategy:**
- PowerSync reads Supabase WAL, syncs to local SQLite
- Upload queue for delivery confirmations, GPS breadcrumbs, photos
- Photo compression (1920px max, JPEG 0.7) before queuing
- Background sync via Capacitor background task
- Conflict resolution: driver is authority for delivery status, dispatcher for routes

**GPS Storage:** PostGIS on Supabase, partitioned by month, separate `driver_current_location` table for real-time tracking

### 3.6 CEO App (PWA)

**Architecture:** TanStack Start SPA/PWA at ceo.hyperquote.net — could be part of internal platform with CEO role

**KPIs (accessed via search or AI, NOT on home screen):** Revenue, margin, cash position, AR aging, on-time delivery %, fill rate, inventory turns, top 20 customers by revenue+margin, delivery cost as % of revenue, backorder rate, quote-to-order conversion

**Design (per UI-VISION.md — non-negotiable):**
- Wide empty space + centered search bar + lion watermark at barely-perceptible opacity
- **Nothing else.** No cards, no metrics, no sidebar, no navigation
- Zero accent colors — emphasis through typography weight and contrast only
- Search: type any character → search bar slides up → results stream below grouped by category
- AI: press Enter/Send → search results fade → AI chat rises from bottom
- Detail: click any result → crossfade to detail page with breadcrumb nav
- Hotkeys (desktop): `/` focus search, `Esc` clear/go back, `Enter` for AI
- KPIs are NOT on the home screen — they are accessed via search ("revenue") or AI ("how are we doing this month?")
- Mobile-first: phone is primary device, desktop/tablet supported

**Dual AI:**

1. **Analytics AI** (Text-to-Data):
   - Pre-computed metrics library (50-100 parameterized queries) — RECOMMENDED
   - LLM classifies intent, extracts parameters, runs pre-built query
   - Falls back to text-to-SQL against read replica for unusual questions
   - Never expose raw SQL generation to CEO

2. **RAG AI** (Document Intelligence):
   - Supabase pgvector for embeddings
   - Documents: supplier contracts, pricing agreements, policies, SOPs
   - Hybrid search (vector + BM25 keyword)
   - Citations mandatory ("Based on ABC Supplier contract dated Jan 2025")

**Routing:** LLM classifier auto-routes questions to Analytics AI or RAG AI

**Alerts:** 3 tiers — Immediate (push: large orders, delivery failures, cash threshold), Daily digest (morning summary), Weekly insight (performance vs budget, trends)

**Data Freshness:** Revenue hourly, cash daily, AR daily, inventory 4h, deliveries near-real-time, margin nightly

**CEO App — Operational Details (Research-Validated):**

**First-time onboarding:** No tutorial. Search bar placeholder text rotates with example queries to teach by example.

**Approvals:** Surface through attention items count + AI chat. No separate approval screen. CEO asks AI "What needs my approval?" → AI lists items with one-tap approve/reject.

**Data freshness indicators:** "Updated X min ago" in Geist Mono per section. Yellow at 15min stale, red at 30min. Offline banner when no connection.

**Board reporting:** PDF export of any view or AI conversation. Recurring scheduled reports (weekly/monthly) via pg_cron → PDF → email to board. Bilingual (Arabic required for Egyptian financial statements, English for international boards).

**Offline:** IndexedDB for structured data, Service Worker for app shell. Dashboard shows cached data with "Last synced" timestamp. Search works on local cache. AI conversations cached. Mutations disabled. Queued messages sent on reconnect.

**Multi-device:** Concurrent sessions allowed (Supabase issues independent JWTs). Global logout available.

**Daily Digest Content Format:** Delivered every morning at 7AM via WhatsApp + email. Contains: yesterday's revenue vs target, new quotes received, orders confirmed, deliveries completed/failed, overdue payments, urgent items needing CEO attention. Generated by AI from pre-computed metrics. Concise — fits in one WhatsApp message with a "View full report" link to the CEO app.

**Weekly Insight Format:** Delivered every Friday at 6PM via WhatsApp + email with PDF attachment for archiving. Contains: week's performance vs targets, margin trends, top/bottom customers by revenue and margin, supplier performance changes, cash flow forecast for next 2 weeks, AI-generated observations and recommendations. The AI narrative highlights anomalies and suggests actions ("Supplier X's rejection rate increased 15% — consider reviewing relationship").

**Settings:** Notification preferences, language, theme, alert thresholds, report schedule, MFA management.

---

## 4. Customer Flow — Research-Validated (29 Agents)

### 4.1 Key Data Points That Shaped the Flow

| Stat | Source |
|------|--------|
| 67% of B2B buyers prefer rep-free experience | Gartner 2026 |
| 29% cite missing prices as a purchasing barrier | Baymard Institute |
| 35-50% abandon when registration is required before quoting | Baymard Institute |
| First to respond wins 35-50% of deals | B2B quoting studies |
| 50% higher retention with proper onboarding | Mindstamp |
| PWAs get 17-76% higher conversion than native apps | Binmile |
| 73% of B2B buyers expect consumer-grade digital experience | BigCommerce |
| Mobile captures 58% of traffic but only 35% of conversions | BigCommerce |
| Only 15-25% of digital B2B construction orders placed on mobile | Industry estimates |
| 43% of US construction firms use some form of AI (2025) | NED Estimating |
| AI achieves up to 97% accuracy in cost estimation | NED Estimating |
| But only 1% of firms have scaled AI across projects | RICS/ProjectFlux |
| 83% of B2B customers prefer self-service options | Shopify |
| Responding within 1 hour = 7x more likely to win | B2B quoting studies |
| WhatsApp is primary business comms in Middle East, LatAm, India | Multiple sources |
| B2B form completion drops 19.6% when fields go from 3 to 7 | Forrester |
| 67.8% abandonment when more than 7 fields are required | Formstory |

### 4.2 Critical Design Decisions (Validated by Research)

| Decision | Rationale |
|----------|-----------|
| **PWA at launch, NOT website + native app** | Eliminates dual-codebase risk, 17-76% higher conversion, works offline, one-tap install to home screen. Build native app only after 6-12 months if data shows need |
| **Progressive signup (2-stage)** | Stage 1: Phone OTP + company name + full name (4 fields, to browse/quote). Stage 2: Trade license + company email (when deal becomes real). Phone-only is insufficient for B2B trust |
| **Guest browsing allowed** | No signup needed to browse catalog. Registration only required to submit a quote. 35-50% of quote requests lost when registration is forced upfront |
| **Show price ranges, not blank prices** | "Starting from AED 12/bag for 100+ bags" — not exact prices, but directional signals. 29% of buyers bounce from completely priceless catalogs |
| **AI chat centered as primary interaction (per UI-VISION.md)** | AI chat is centered as the primary interaction point in the Portal. Two buttons beneath chat: Orders and Market. Customers who prefer traditional browsing use those buttons directly. Website retains AI as floating button for lead capture. |
| **AI simple ordering = star feature** | "I need 400 units of wood" → parsed into structured draft. This is a genuine differentiator no competitor offers |
| **AI estimation = guarded tool** | Frame as "Estimator Tool" with disclaimers. Ask structured questions. Output editable material list. Label: "Verify with your engineer." High risk if wrong |
| **WhatsApp as PRIMARY support** | Construction lives on WhatsApp (especially Middle East/LatAm). Response: <15 min. AI auto-lookup for "where's my delivery?" Tickets only for non-urgent |
| **7-day onboarding sequence** | Minute 0: WhatsApp + email confirmation. Hour 1: Video walkthrough. Day 1: Account manager intro. Day 3: Popular products. Day 7: Phone call if inactive. 50% higher retention |
| **Multi-user accounts from day one** | B2B buying involves 6-10 people. Support roles: buyer, approver, site manager. Procurement manager browses, shares with PM, foreman sets quantities |
| **Project-based organization** | GCs managing 5+ sites need "Site A orders" vs "Site B orders." Group quotes, orders, deliveries by project |
| **Repeat-purchase features from day one** | One-tap reorder, saved material lists, favorite products, AI reorder suggestions ("You ordered cement 30 days ago. Time to reorder?"), quick text order |
| **Quote response target: 4 hours** | First to respond wins 35-50% of deals. Every workflow and UX decision optimized for speed. Show specific timeline on confirmation |
| **RTL/Arabic support from day one** | CSS logical properties, bilingual product names, Hijri calendar option, Arabic-Indic numeral support. Retrofitting RTL is 3-5x more expensive than building in |

### 4.2b Additional Customer Flow Rules

**Language:** Website auto-detects browser language (Arabic/English). All product names bilingual. Language toggle always available. RTL layout for Arabic from day one.

**Large Quantity Flag:** System flags internally when requested quantities exceed historical norms for that product category: "⚠️ Unusually large request — verify with customer." Does not block submission, just alerts the sales rep.

**Notification Cascade:** WhatsApp first → SMS fallback (if WhatsApp delivery fails) → email fallback. Never assume customer has WhatsApp.

**"Become a Supplier" Placement:** Located in Account Settings within the portal, NOT on the homepage or main navigation. Customers don't see supplier-related CTAs unless they look for them.

**Auto-Assignment Rules for RFQs:**
- Existing customer with account owner → routes to account owner
- New customer → territory-based assignment (if territories defined) → round-robin if no territory match
- Specialist override: if request contains specialty items, route to category specialist

**Vacation Delegation:** Any employee can set "Out of Office" with a delegate. Their queue automatically routes to the delegate. Delegation is logged in the activity feed.

**New Customer Credit Awareness:** For new customers with no credit history, the system shows a yellow indicator on the quote request: "⚠️ New Customer — No credit established." This is awareness only — does NOT block quoting. Reminds the sales rep that credit application will be needed before fulfillment if the quote converts to an order.

### 4.3 The Validated Customer Journey

**Phase 1: Discovery**
- Customer hears about HyperQuote (referral, Google, trade show, WhatsApp word-of-mouth)
- Pre-visit: checks peer reviews, asks colleagues, looks at case studies

**Phase 2: First Visit (PWA)**
- Visits hyperquote.com
- Guest browsing — no signup required
- Sees product catalog: specs, images, datasheets, availability indicators, price RANGES
- AI chat floating button: "Need help finding materials?"
- Trust signals: delivery rate, fleet photos, certifications, partner logos

**Phase 3: Signup (Progressive, 2-Stage)**
- **To browse:** No signup needed
- **To request a quote (Stage 1):** Phone OTP + Company name + Full name = 4 fields
- **Later (Stage 2):** Trade license + company email (on first quote follow-up or credit application)

**Supplier Registration:** Same signup flow as customers (phone OTP + company + name). Default role = customer. To become a supplier: "Become a Supplier" button → application form (trade license, product categories, business registration) → manual review by procurement team → approved → supplier role added. Same account can be customer AND supplier (role toggle in portal).

### Guest Orders — Phone Customer Without Account

**Scenario:** Customer calls HyperQuote, never visited the website. Sales rep takes their order by phone.

**Sales Rep "Add Customer" Button (Internal Platform):**
- Minimum fields: phone number + company name + contact name
- Optional: delivery address, project name, notes
- System creates a `customers` record with `status: unclaimed`, `auth_user_id: NULL`
- NO auth credentials created — no password, no login
- The order proceeds normally: quote → confirmation → delivery → payment

**Customer Claims Their Account Later:**
1. Customer visits portal → taps "Sign Up"
2. Enters their phone number
3. System finds an unclaimed customer record → shows masked hint: "A**** C****" ("Is this your company?")
4. Customer confirms → OTP sent to their phone
5. OTP verified → Supabase Auth creates the auth user
6. System links: `customers.auth_user_id = auth.uid()`, `status = 'claimed'`
7. Customer now has full portal access — sees ALL previous order history (phone orders + future portal orders)

**Why This Works:**
- `customers` table is decoupled from `auth.users` — orders always reference `customers.id`, never `auth.users.id`
- History is seamless because the `customer_id` never changes — only `auth_user_id` gets populated
- RLS policies grant access based on `customer_id` linked to the authenticated user

**Security:**
- OTP to the actual phone number is the primary verification — you can only claim an account if you control that phone
- Masked company name hint prevents information leakage ("A**** C****" not "Al-Nour Construction")
- Sales rep gets notified when one of their phone customers claims an account
- If phone number changed: customer contacts support, sales rep updates the record manually
- Shared company phone: `customer_contacts` table separates company from individual contacts

**Technical Pattern (Supabase):**
- NOT anonymous sign-ins (session-bound, wrong device)
- NOT admin.createUser (pollutes auth.users with unclaimed records)
- Use: sales rep inserts into `customers` table only → customer later signs up normally via `signInWithOtp` → server links the auth user to the existing customer record

**Phase 4: Build & Submit Quote Request**
- Material list builder with multiple input methods (search-and-add, CSV/Excel, quick order pad, browse catalog, AI chat, AI estimator)
- Quote form: 3 fields max (products pre-filled, quantity, delivery location)
- Optional: upload drawings/specs (PDF, Excel, images — drag-and-drop)
- All drafts editable before submitting
- **[Submit Quote]**
- Confirmation: reference number, "within 4 hours", named team member, tracking link
- WhatsApp + email confirmation instantly

**Phase 5: Onboarding (7-day sequence, first-time customers)**
- Minute 0: WhatsApp + email confirmation
- Hour 1: 60-second video walkthrough (if no activity)
- Day 1: Account manager introduction
- Day 3: "Popular products in your area" (if no quote submitted)
- Day 7: Phone call if still inactive
- First quote incentive: priority processing or free delivery

**Phase 6: Receive & Respond to Quote**
- Push + WhatsApp: "Your quote is ready"
- Opens in PWA — line items, prices, totals, validity period (14 days), delivery timeline
- Actions: **Accept**, **Decline**, **Counter-offer** (with version tracking)
- Negotiation tracked with full history (v1, v2, v3...)
- Accept → converts to order → supplier POs auto-generated

**Complete Quote Document Must Include:**
- Seller: company name (Arabic), CR number, TRN, address, logo
- Buyer: company name, TRN, contact person
- Quote metadata: reference number, date, validity period
- Line items: product name (bilingual), SKU, UOM, quantity, unit price (ex-VAT), line total
- Delivery: separate line item (zone-based pricing), area/governorate, terms (DAP or Franco site)
- Subtotal, VAT 14%, Grand total (VAT-inclusive)
- Payment terms: explicit ("50% advance, 50% COD by certified bank check" for new customers)
- Delivery surcharges if applicable (equipment, fuel, remote area)
- Price disclaimer: "Prices valid for [X] days. Subject to supplier cost changes for volatile materials."
- Free delivery note if applicable ("Free delivery on orders over EGP X")

**Delivery Pricing (separate line, NOT bundled):**
- Zone-based as primary model (Zone 1: 0-25km, Zone 2: 25-50km, Zone 3: 50-100km)
- Weight surcharges for heavy materials (per-ton above threshold)
- Equipment surcharges: Moffett, crane, boom — shown as separate line items
- Drop-ship freight: labeled simply "Delivery" (never "supplier freight"), includes 15-25% markup
- Free delivery threshold: configurable per customer tier and material category
- Fuel surcharge: embedded in delivery fee, adjusted quarterly

**Supplier Price Lock Strategy:**
- 14 days is too long for volatile materials (steel, cement). Use tiered validity:
  - Stable products (hardware, fixtures): 14 days
  - Semi-volatile (plywood, pipes): 7-10 days
  - Volatile (steel, cement, lumber): 5-7 days
- Include disclaimer: "Prices subject to supplier cost changes"
- On customer acceptance: immediately place supplier PO to lock cost
- If supplier raises price during validity: absorb small increases (built into margin buffer), split large increases with supplier, or renegotiate with customer
- Margin buffer of 2-5% built into volatile item pricing as contingency

**Counter-Offer Support:**
- Per-line-item accept/reject/counter (how Egyptian B2B actually works)
- Counter on unit price per item
- Counter on total with blanket discount percentage
- Volume-based counter ("if I order 80 tons instead of 50, what price?")
- Delivery term negotiation ("include delivery" or "I'll arrange pickup, reduce price")
- Free-text notes in Arabic
- Partial acceptance → generates order for accepted items only

**Phase 7: Order Tracking (5 stages)**
1. **Order Confirmed** — with expected preparation time
2. **Being Prepared** — supplier fulfillment updates
3. **Out for Delivery** — ETA window, driver contact
4. **Delivered** — photo proof + digital signature
5. **Invoice Generated** — PDF in Documents tab + email

**Phase 8: Repeat Customer (The Real Product)**
- **One-tap reorder** from any past order
- **Saved material lists** by project ("Villa Phase 1", "Monthly Restock")
- **Project organization** — group everything by site/project
- **Favorite products** on home screen
- **AI suggestions:** "You ordered cement 30 days ago. Time to reorder?"
- **Quick text order:** Paste "500 OPC 50kg, 200 TMT 12mm" → AI parses → draft
- **Share lists** between team members (multi-user accounts)

**Phase 9: Support**
- **WhatsApp** (primary) — AI auto-lookup + human in <15 min
- **In-app chat** — order modifications, general questions (<30 min)
- **Phone** — complex issues, disputes (immediate)
- **Email** — documentation, formal requests (<4 hours)
- **Tickets** — non-urgent only (<24 hours)

### 4.4 Mobile App Strategy

**Launch:** PWA only for customer and supplier portals. One codebase, works on all devices, one-tap install to home screen, offline capable, push notifications.

**6-12 months after launch (if data supports it):** Native app for power users who need barcode scanning, heavy camera use, advanced offline capability, deeper device integration.

**The only native app at launch is the Driver App (Vite + React SPA + Capacitor).**

**Driver App Launch Timing:** The driver app is built as part of the platform but is NOT needed at launch if the company operates pure drop-ship. It becomes active when HyperQuote hires its first internal driver or contracts its first recurring driver. External/on-demand drivers (who self-signup) may use it earlier for overflow deliveries. The app is built early because it requires Capacitor native development (separate from the web apps) and benefits from early testing.

### 4.5 What HyperQuote Does That Competitors Don't

| Differentiator | Ferguson | Grainger | ABC Supply | Builders FirstSource | HyperQuote |
|---|---|---|---|---|---|
| AI conversational ordering | No | No | No | No | **Yes** |
| AI project estimation | No | No | No | Partial (design tools) | **Yes (with guardrails)** |
| WhatsApp-native ordering | No | No | No | No | **Yes** |
| Quote response <4 hours | Varies | Varies | Varies | Varies | **Committed** |
| Project-based organization | Limited | No | No | Yes (myBLDR) | **Yes** |
| Multi-user accounts with roles | Yes | Yes | Limited | Yes | **Yes** |
| Price ranges for transparency | Yes (after login) | Yes (after login) | Limited | Limited | **Yes (pre-login ranges)** |

---

## 5. Internal System — Research-Validated

### 5.1 Order State Machine (77 States Across 9 Entities)

**Entity Relationship Map:**
```
Customer → Quote Request (1:many)
Quote Request → Quote (1:many versions)
Quote → Order (1:1 on acceptance)
Order → Supplier PO (1:many, one per supplier)
Supplier PO → Delivery (1:many, partials possible)
Delivery → Invoice (1:1 per delivery)
Invoice → Payment (many:many via payment_allocations)
Order → Return/RMA (1:many)
Return → Credit Note (1:1)
```

**Quote Request States (9):** DRAFT → SUBMITTED → UNDER_REVIEW → SOURCING → QUOTE_READY → ON_HOLD / REJECTED / WITHDRAWN / CANCELLED

**Quote States (9):** DRAFT → SENT → NEGOTIATING → REVISED → ACCEPTED / DECLINED / EXPIRED / CANCELLED / REQUIRES_RE_QUOTE

**Order States (8):** CONFIRMED → PROCESSING → PARTIALLY_FULFILLED → FULFILLED → COMPLETED / ON_HOLD / CANCELLATION_REQUESTED / CANCELLED / BACK_ORDERED

**Supplier PO States (10):** DRAFT → SENT → CONFIRMED → IN_PRODUCTION → SHIPPED → PARTIALLY_RECEIVED → RECEIVED → INSPECTED → CLOSED / REJECTED / CANCELLED

**Delivery States (9):** SCHEDULED → PICKING_LOADING → DISPATCHED → IN_TRANSIT → AT_SITE → DELIVERED / PARTIALLY_DELIVERED / FAILED / RESCHEDULED / RETURNED / CANCELLED

**Invoice States (10):** DRAFT → SENT → VIEWED → PARTIALLY_PAID → PAID / OVERDUE → COLLECTIONS / DISPUTED → RESOLVED / ADJUSTED / CANCELLED / WRITTEN_OFF

**Payment States (9):** EXPECTED → RECEIVED → MATCHED → FULLY_APPLIED / PARTIALLY_APPLIED / OVERPAYMENT / UNMATCHED / BOUNCED / REVERSED / REFUNDED

**Return/RMA States (8):** REQUESTED → APPROVED / DENIED → PICKUP_SCHEDULED → RECEIVED → INSPECTED → CREDIT_APPROVED / REPLACEMENT_ORDERED / REJECTED

**Credit Note States (5):** DRAFT → APPROVED → ISSUED → APPLIED / PARTIALLY_APPLIED / CANCELLED

**Key Automations (30+ triggers):**
- Quote accepted → auto-create Order + Supplier POs
- Supplier PO confirmed → update Order status
- Delivery marked "Delivered" → auto-generate Invoice
- Payment received → auto-match to Invoice → update AR
- Invoice overdue 30 days → auto-send reminder
- Invoice overdue 60 days → auto-escalate to Credit Manager
- Credit limit exceeded → auto-hold new orders

### 5.2 Order Lifecycle (Full Quote-to-Cash)

| Phase | Duration | Who | What |
|-------|----------|-----|------|
| 1. Customer Inquiry | Day 0 | Customer → Sales | Material request submitted |
| 2. RFQ Review | Day 0-1 | Sales | Review specs, check credit, qualify opportunity |
| 3. Supplier Sourcing | Days 1-5 | Procurement | Send RFQs to 2-5 suppliers, collect responses |
| 4. Price Evaluation | Days 3-5 | Procurement | Compare quotes, negotiate, select suppliers |
| 5. Quote Building | Days 3-7 | Sales + Procurement | Apply margins, build formal quote |
| 6. Internal Approval | Days 5-7 | Sales Manager/GM | Approve margins and terms |
| 7. Credit Approval | Days 5-7 | Finance | Credit check, set terms, require LC if needed |
| 8. Quote Sent | Day 7 | Sales | Send to customer via portal + email |
| 9. Negotiation | Days 7-14+ | Sales ↔ Customer | Counter-offers, revisions, version tracking |
| 10. Acceptance | Day 14+ | Customer | Accepts quote → converts to order |
| 11. Supplier POs | Day 14+ | Procurement | Auto-generate POs to selected suppliers |
| 12. Fulfillment | Days 14-60+ | Operations | Track supplier delivery, receive goods, prepare shipment |
| 13. Delivery | Varies | Dispatch + Driver | Route, deliver, POD capture |
| 14. Invoicing | Post-delivery | Finance | Auto-generate invoice, send to customer |
| 15. Payment | Net 30-90 | Finance | Track wire/check/LC, match to invoice |
| 16. Close-Out | Post-payment | Finance | Reconcile, release retainage if applicable |

### 5.3 Roles & Team Structure

**Minimum Viable Team by Stage:**

| Stage | Revenue | Headcount | Key Roles |
|-------|---------|-----------|-----------|
| Pre-launch | $0 | 4-6 | CEO, CTO/Lead Dev, 1-2 devs, Sales lead, Ops lead |
| Launch | $0-$1M | 7-10 | + 1-2 sales reps, procurement officer, accountant |
| Growth | $1-$10M | 12-22 | + inside sales, warehouse staff, CS rep, credit clerk |
| Scale | $10-$50M | 25-50 | + VP Sales, procurement team, dispatch, AR/AP team, CS team |
| Enterprise | $50M+ | 60-120+ | + Regional managers, category managers, fleet, legal, HR, IT team |

**Industry benchmark:** ~1.2 employees per $1M revenue

**25+ roles defined** with daily tasks, app usage, KPIs, reporting lines, and communication flows.

**Role-to-App Mapping:**

| App | Who Uses It |
|-----|-------------|
| Internal Platform (Sales module) | Account Managers, Inside Sales, Quoting Specialists, Sales Manager |
| Internal Platform (Procurement module) | Buyers, Category Managers, Vendor Relations |
| Internal Platform (Operations module) | Ops Manager, Logistics Coordinator, Warehouse Manager |
| Internal Platform (Finance module) | Controller, AR/AP Clerks, Credit Manager |
| Internal Platform (CS module) | CS Reps, Claims Specialist |
| Internal Platform (Admin) | IT, CEO, Department Managers |
| Customer Portal (PWA) | Customers (external) + Sales/CS for support visibility |
| Supplier Portal (PWA) | Suppliers (external) + Procurement for catalog management |
| Driver App (Capacitor native) | Drivers + Dispatcher for tracking |
| CEO App (PWA) | CEO, GM, Department Heads |

### 5.3b Market Availability System (Launch — No Own Inventory)

At launch, HyperQuote holds ZERO inventory. The system tracks **supplier-published stock** (their inventory, not ours) aggregated across all suppliers in the marketplace.

**Industry term:** "Asset-light trading" / "Virtual inventory" — the model used by sogo shosha (ITOCHU, Mitsui), commodity traders (Glencore), and B2B marketplaces (Moglix).

**Two Levels of Availability:**

| Level | What It Is | Reliability | Used For |
|-------|-----------|-------------|----------|
| **Indicative** | Supplier's last-reported stock via portal/CSV/API | 60-83% accurate (industry avg). Stale by hours/days. | Internal reference for sales reps, marketplace browsing |
| **Confirmed** | Supplier's response to a specific RFQ for THIS order | High (time-limited commitment) | Actual quote building, customer promises |

**What Customers See (abstracted tiers, NEVER exact numbers):**
- "Available" — supplier reports adequate stock, data is fresh
- "Low Stock" — supplier stock below threshold or data aging
- "Available on Request" — stock data stale, requires confirmation
- "Lead Time: X days" — made-to-order or long-lead items
- "Out of Stock" — confirmed unavailable

**What Sales Reps See (full detail):**
- Supplier name, reported quantity, last updated timestamp
- Freshness indicator: Fresh (<24h, green), Aging (1-3 days, yellow), Stale (>3 days, red), Suppressed (>7 days)
- Confidence level per supplier based on historical accuracy
- Active soft reservations against this stock from other quotes

**Soft Reservations (Critical Anti-Overselling):**

**Reservation Timing (Corrected):**
- Customer submits quote request → **NO reservation** (unverified input, could be a typo or abandoned)
- Sales reviews and validates → **NO reservation** (still qualifying the opportunity)
- Sales sends validated quote TO customer → **SOFT reservation created** (real offer with verified quantities, held for quote validity period)
- Customer accepts → order confirmed → **Soft converts to HARD reservation** (committed, supplier PO placed)
- Warehouse allocates base → **ALLOCATED** (assigned to specific location)
- Pick/Load/Deliver → reservation chain continues as documented

**Why no reservation on quote request:** A customer can type any quantity (e.g., 1,000,000 by mistake). Reserving unverified input would lock supplier stock. The sales rep validates quantities before the quote is sent — that's when the reservation starts.

- Available-to-Quote = Supplier Reported Stock - Active Soft Reservations - Safety Buffer
- Prevents two reps quoting the same stock to two customers

**Supplier Stock Freshness Management:**
- Freshness timestamp on every stock record (`last_updated_at`)
- Auto-suppress products with stock data >7 days old
- Suppliers who update frequently get "Verified Stock" badge and priority placement
- Track order rejection rate per supplier (confirmed stock that turned out unavailable)
- Supplier performance score affects dispatch priority and search ranking

**Data Model:**
```
inventory_sources (suppliers + own warehouses later)
  id, source_type ('supplier' | 'own_warehouse'), name, supplier_id, freshness_score

source_inventory (stock per source per product)
  id, source_id, product_id, reported_quantity, available_quantity,
  reserved_quantity, last_updated_at, confidence_level ('fresh'|'aging'|'stale')

inventory_reservations (soft holds from quotes)
  id, source_inventory_id, quote_id, quantity,
  reservation_type ('soft'|'hard'), expires_at, status ('active'|'expired'|'converted')
```

**Transition to Own Stock (Phase 2+):**
- Own warehouse added as another "source" in the same multi-source system
- Own stock gets higher confidence and priority in aggregation
- Combined view: "Own stock: 5,000 + Supplier stock: 7,000 = Total: 12,000"
- Customer-facing experience doesn't change — system just has more reliable data

**Full Reservation Chain (Quote → Delivery):**

| Stage | Type | Created By | Effect | Auto-Expires? |
|-------|------|-----------|--------|---------------|
| Quote request submitted | **None** | — | No reservation on unverified customer input | N/A |
| Sales sends validated quote | **Soft** | System (when quote is sent to customer) | Decrements "available to quote" across all apps. Expires with quote validity period | Yes — on quote expiry |
| Quote accepted → Order | **Hard** | System (auto-converts) | Stock committed to this customer. Cannot be quoted to others | No |
| Warehouse allocates base | **Allocated** | Warehouse manager | Hard reservation assigned to specific base/location. Other managers see reduced availability at that base | No |
| Pick list generated | **Picked** | Warehouse worker (barcode scan) | Physically pulled from shelf. On-hand decremented | No |
| Loaded on truck | **In Transit** | Driver + warehouse sign-off | Stock is on the truck. Base inventory reduced | No |
| Delivered + confirmed | **Consumed** | Dispatcher confirms POD | Reservation chain closed. Stock is gone | N/A |

**Concurrency Protection:**
- Database enforces with `SELECT ... FOR UPDATE` (row-level lock during allocation)
- Two managers cannot allocate the same stock simultaneously — second request sees updated availability
- Soft reservations checked in real-time: when sales rep builds a quote, system shows Available-to-Quote = Reported Stock - All Active Soft Reservations - All Hard Reservations - Safety Buffer

**Failure Recovery:**
- Quote expires → soft reservation auto-releases → stock returns to available
- Order cancelled → hard reservation released → stock available again
- Allocation reversed (wrong base) → allocated stock returns to hard reservation pool
- Delivery fails → stock returns to warehouse → reservation chain reversed
- Every release is logged in the audit trail with reason

### 5.4 Warehouse & Inventory

**Phase 1 (Launch): No inventory — pure drop-ship/sourced per deal**
- 80%+ of deliveries go directly from supplier to customer site
- Operations = coordination, not warehousing
- "Drop-Ship Coordinator" role manages supplier→customer delivery tracking

**Phase 2 ($5-10M): Start stocking fast-movers**
- Stock top 20% of products (by volume) that are ordered repeatedly
- Minimum viable warehouse: shared yard + small covered storage ($6-12K/month)
- Products to stock first: commodity cement, standard rebar, common lumber sizes

**Phase 3 ($10-50M): Full warehouse operation**
- Small warehouse + yard ($14-25K/month) or full operation ($43-90K/month)
- Receiving, putaway, picking, loading, cycle counts
- Yard management for outdoor materials (lumber, steel, aggregates)
- Inventory carrying cost: 15-30% annually

**Inventory States:** Available → Reserved (allocated to order) → Picked → Loaded → In Transit → Delivered. Also: On Order (from supplier), In Transit (from supplier), On Hold (quality), Damaged, Returned.

**Warehouse app:** Mobile-first with barcode scanning. Modules: receiving (scan + count), putaway (directed), picking (optimized path), loading verification, cycle counts, inventory lookup.

### 5.4b Hybrid Inventory Model (Own Stock + Supplier Stock)

**Sourcing Priority:** Own stock first, always (higher margin 5-10pp uplift, immediate availability, 100% reliability). Supplier stock as supplement.

**Unified Availability View (what sales rep sees):**
```
Cement OPC 50kg — Customer needs 500 bags
  Own stock (Base A): 300 bags @ WAC EGP 44 (instant, reliable) 🟢
  Own stock (Base B): 200 bags @ WAC EGP 44 (instant, reliable) 🟢
  Supplier A: 2,000 bags @ EGP 47 (fresh, 2h ago) 🟡
  → Recommendation: 300 from Base A + 200 from Base B (own stock covers 100%)
```

**Two Purchase Order Types:**
- Stock PO (speculative): buying to hold in warehouse. No linked customer order. Requires procurement manager approval. Triggers: reorder point hit, price opportunity, seasonal build.
- Customer-Linked PO: buying for a specific order. Links to sales order. Auto-generated on order confirmation for items not in own stock.

**Four Fulfillment Modes:**
1. Own stock + own truck (full control, best margin, full branding)
2. Own stock + 3PL carrier (own inventory, contracted delivery)
3. Supplier drop-ship (supplier delivers directly to customer)
4. Supplier cross-dock + own truck (supplier delivers to HyperQuote base, HyperQuote delivers to customer)

**Same order can MIX modes:** Line 1 from own Base A (mode 1), Line 2 drop-shipped from Supplier C (mode 3).

**Cost Tracking:** Own stock = WAC (weighted average cost). Supplier stock = actual PO cost. Margin calculated per source. LIFO is prohibited in Egypt (EAS/IFRS).

**Inventory Replenishment (Egyptian market):**
- Reorder point = (Avg daily demand × Lead time days) × 1.5 reliability factor
- The 1.5x factor accounts for Egyptian supplier delays and transport disruptions
- ABC classification: A items (cement, rebar) = tight control, frequent counts. C items (hardware, misc) = looser control.

### 5.5 Dispatch & Delivery

**Own fleet vs third-party:**
- Start with third-party (drop-ship from supplier, or hire carriers)
- Own fleet at $10M+ revenue when delivery volume justifies it
- Own fleet costs: $1.67-2.22/mile vs third-party $2.53-3.07/mile
- Most mid-size distributors: hybrid (70-85% own, 15-30% overflow)
- Delivery cost as % of revenue: 3-8% transportation, 6-12% total supply chain

**Dispatcher workflow:** Day-before planning (route optimization, driver assignment) → morning execution (pre-load verification, dispatch) → real-time monitoring (GPS, exceptions) → end-of-day (reconciliation, next-day prep)

**Driver daily flow:** Pre-trip inspection → loading/verification → route execution (4-8 stops) → POD at each stop (photos, signature, tally) → post-trip report

**Building materials specific:** Moffett forklift enables 6-10 stops/day vs boom truck at 3-6. Equipment type is primary route planning driver. Failed delivery costs $150-400+.

### 5.6 Support System

**Build custom on Supabase** (not Zendesk/Freshdesk). Data co-located with orders/quotes/payments.

**WhatsApp-first** with AI triage:
- 55-75% of messages auto-resolved by AI (order status, invoice lookup, stock checks)
- Tier 0: AI autonomous
- Tier 1: AI-assisted, human confirms
- Tier 2: Human required (disputes, complex issues)

**Ticket taxonomy:** 50+ reason tags across 7 categories (Order, Quote, Delivery, Payment, Account, Product, Platform)

**SLAs by priority:**
- Critical: 15-min first response, 4-hr resolution
- High: 1-hr first response, 8-hr resolution
- Normal: 4-hr first response, 24-hr resolution
- Low: 8-hr first response, 48-hr resolution

**Cross-department workflows:** Customer reports damaged goods → CS creates ticket → Operations investigates → Procurement contacts supplier → Finance issues credit note → CS updates customer. Sub-ticket system tracks each department's piece.

**Returns/Claims:** Photo evidence required → inspection → credit note or replacement. Target 7 days, max 14 days. Special handling for installed materials and batch defects.

**Support — Additional Details (Research-Validated):**

**Invoice dispute workflow:** Customer rejects on ETA portal → credit/debit note required (cannot delete e-invoices) → 5-year record retention.

**NPS/feedback:** WhatsApp survey 2 hours post-delivery, 3 questions max, feeds into composite health score (15% weight), detractor rescue within 24 hours.

**PWA Deep Links:** Cross-subdomain links open in browser (outside PWA shell). Auth remains seamless via shared pool cookie.

### 5.6b Damaged Delivery Handling (Egyptian Law — Research-Validated)

**Legal Framework:**
- Egyptian Commercial Code Article 101: Customer has **15 days** from receipt to notify seller of damage/shortage
- 60 days to file legal action, 6 months overall claim expiry
- Article 94: In drop-ship, risk transfers when goods are handed to the transporter
- **HyperQuote is ALWAYS liable to the customer** as seller of record — regardless of whether delivery was own-fleet or drop-ship. HyperQuote recovers upstream from supplier/carrier.

**Damage Reporting (What the Customer Does):**
1. Customer discovers damage at delivery or within 15 days
2. Reports via WhatsApp (primary) with photos — minimum: damaged items, packaging, overall delivery, BOL annotations
3. System creates a Damage Claim record linked to the delivery and order
4. Customer should NEVER refuse the entire shipment — accept good items with annotations, reject only damaged items

**Three-Tier Inspection:**

| Damage Level | Value | Inspection | Response |
|---|---|---|---|
| Minor (<5% of delivery value) | <EGP 50K | Customer self-service: photos + description | Auto-approve credit note |
| Moderate (5-20%) | EGP 50-200K | HyperQuote sends representative to inspect | Inspect within 48 hours |
| Major (>20% or safety-critical) | >EGP 200K | Third-party inspector | Inspect within 24 hours |

**Six Resolution Options (ranked by frequency in Egyptian market):**
1. **Partial replacement** — replace only damaged items on next delivery (most common)
2. **Credit note** — reduce the invoice by the value of damaged goods
3. **Price reduction** — customer keeps damaged goods at a discount (if usable)
4. **Full replacement** — redeliver entire shipment (rare, only for total loss)
5. **Full refund** — cancel and refund (last resort)
6. **Return and reorder** — customer returns damaged goods, new order placed

**Partial Damage (Most Common Scenario):**
- Example: 50 of 500 cement bags torn/wet → 450 accepted, 50 damaged
- Invoice adjusted: credit note for 50 bags × unit price + VAT
- Replacement 50 bags scheduled on next available delivery
- Customer signs partial acceptance with annotations

**Material-Specific Damage:**
- Cement: moisture = total loss (cannot salvage wet cement). Shelf life 3-6 months.
- Rebar: bending can sometimes be straightened on site. Rust = surface only, usually acceptable. Structural deformation = reject.
- Plywood: delamination from moisture = total loss. Edge damage = sometimes usable with trimming.
- Pipes: cracks = reject (safety). Scratches = cosmetic, usually accepted.

**Supplier Claims (HyperQuote recovers upstream):**
- HyperQuote files claim with supplier within 7 days of customer report
- Required: photos, BOL copy, damage description, customer claim reference
- Supplier response SLA: 7-14 days for acknowledgment, 30 days for resolution
- If supplier denies: escalate to procurement manager → negotiate → legal if needed

**Carrier/Freight Claims (for drop-ship transit damage):**
- File within 14 days of delivery
- Carrier has 30 days to acknowledge, 120 days to decide
- BOL annotations at time of delivery are critical evidence

**Insurance:**
- Cargo insurance recommended from Day 1: ~0.3-0.8% of shipment value
- Covers transit damage, theft, natural disasters
- Deductible typically 1-5% of claim value

**SLA Targets:**
- First response to customer: 4 hours
- Customer resolution (credit note or replacement scheduled): 7 days
- Total claim closure (including supplier recovery): 45 days

**System Workflow:**
```
Customer reports damage (WhatsApp + photos)
  → Claim created (auto-linked to delivery + order)
  → Tier classification (minor/moderate/major)
  → Inspection if needed (48h for moderate, 24h for major)
  → Resolution proposed to customer
  → Customer accepts resolution
  → Financial settlement:
      → Credit note issued to customer AND/OR replacement scheduled
      → Invoice adjusted
      → Supplier claim filed (parallel)
      → Carrier claim filed if transit damage (parallel)
      → Insurance claim filed if applicable (parallel)
  → Customer resolution closed (target: 7 days)
  → Upstream recovery closed (target: 45 days)
```

**First-Order Damage (Saving the Relationship):**
- If a new customer's FIRST delivery arrives damaged → treat as highest priority
- Resolution within 24 hours, not 7 days
- Personal call from Mariam (sales) + operations manager
- Offer: immediate replacement + free delivery on next order as goodwill
- The speed of resolution determines whether Ahmed orders again or never comes back

### 5.7 Internal Communication

**Object-centric communication** — conversations attached to orders/quotes, not in Slack channels:
- Activity feed on every entity (like GitHub issue comments)
- @mentions with role-aware routing
- Internal vs external comments (color-coded)
- System events interleaved (status changes, auto-actions)

**Handoff protocols:**
- Every state has exactly ONE owner (department/role)
- Transitions require explicit action (button click, not dropdown)
- Maximum dwell time per state with auto-escalation
- "Hot Potato" rule: unacknowledged within 30 min → escalates to department manager

**Escalation rules (automated):**
- Quote unassigned >30 min → Sales Manager
- Pricing pending >24h → Procurement Manager
- Delivery not scheduled <24h before promised → Ops Manager
- Invoice overdue >30 days → auto-reminder; >60 days → Credit Manager + hold orders
- Supplier non-responsive >48h → Procurement Manager

**Daily operations meeting (15 min, 7 AM):**
- System auto-generates the agenda from: today's deliveries, stuck items, credit holds, pipeline highlights
- No slides, no prep — dashboard IS the meeting

### 5.8 Internal AI Assistant

One AI for all internal users, role-aware (same permission system as UI):

**What it does:**
- Natural language queries: "Show me all open quotes for Henderson Construction"
- Draft emails: "Write a follow-up to the customer about their pending quote"
- Analysis: "Which supplier has the best pricing on rebar this month?"
- Status lookups: "What's the status of PO-1234?"
- Summarize: "Give me a summary of today's stuck items"

**Different from customer AI:** Deeper data access, can query across all entities, can draft internal documents, sees cost/margin data.

### 5.10 Employee Workflow — Research-Validated

**Sales App Flow (Revised — Single-Touchpoint Customer Communication):**

**Two touchpoints maximum with the customer:**
1. **Instant acknowledgment** (automated, WhatsApp + email): "Got your request, working on it, expect a call by [time]." Sent within minutes of submission. NOT a phone call — low-friction notification.
2. **One comprehensive call** with EVERYTHING: stock availability, issues + alternatives, pricing timeline, delivery expectations. Customer can make decisions from this single conversation.

**Internal workflow (parallel, not sequential):**
```
Quote request arrives
  → System sends instant acknowledgment to customer (automated)
  → Sales rep reviews stock availability (self-service view)
  → IF stock issues exist:
      → Simple (partial stock, substitute available): Sales rep handles directly
      → Complex (new supplier needed): Escalates to Procurement Manager
        → Procurement Manager SLA: 2 hours to respond with options
  → WHILE waiting for escalation resolution (if any):
      → Procurement is simultaneously flagged on pricing needs
      → Credit flag noted (if new customer) — awareness only
  → ALL inputs converge to sales rep
  → Sales rep has full picture
  → ONE call to customer covering everything
  → THEN sends to procurement for final pricing (if not already done in parallel)
```

**The rule:** Sales rep does NOT call the customer until they have the complete picture. No partial calls. No "we'll get back to you on that item." If an escalation takes time, the automated acknowledgment keeps the customer informed.

**Internal Escalation SLAs (to support single-touchpoint):**

| Internal Function | SLA | Escalation If Exceeded |
|---|---|---|
| Stock availability check | Self-service (instant) | — |
| Stock issue — partial/substitute | Sales rep handles directly | — |
| Stock issue — new supplier needed | Procurement Manager: 2 hours | VP Procurement |
| Stock issue — completely unavailable | Procurement Manager: 1 hour to confirm | Sales proceeds with partial |
| Non-standard pricing | Pricing desk: 30 min - 2 hours | Sales Manager |
| Credit flag (new customer) | Not blocking — awareness only | — |
| Technical/spec question | 1-4 hours | Sales Manager |

**Target: 1.0-1.5 contacts to resolution.** Best-in-class B2B distributors (Ferguson, Builders FirstSource, ABC Supply) all operate on this model.

### 5.10b Live Quoting Model (Research-Validated)

**78% of B2B customers buy from the first vendor to respond.** Responding first increases win rates by up to 50%. Companies using CPQ generate quotes 10x faster with 28% shorter sales cycles.

**Three Pricing Tiers:**

| Tier | Source | Speed | % of Items |
|------|--------|-------|-----------|
| **Instant** | Supplier portal price fresh (<24h) OR framework agreement | Available NOW — quote live on phone | 60-80% |
| **Fast** | Price aging (1-3 days) — system sends confirmation to supplier | 15 min - 2 hours | 10-20% |
| **Standard** | No cached price, or new supplier needed — full RFQ cycle | 2-4 hours | 10-20% |

**How It Works:**

Suppliers publish prices through the Supplier Portal (manually, CSV, or API). These prices are cached in the system with freshness timestamps. When a sales rep opens a quote request:

- **Fresh prices** (green, <24h old): Rep sees supplier cost + auto-calculated margin + sell price per line item. Can quote the customer LIVE on the phone.
- **Aging prices** (yellow, 1-3 days): System shows last known price with "⚠️ Verify" flag. Rep can use as estimate or wait for supplier confirmation.
- **Stale/missing prices** (red, >3 days or no data): Requires procurement to get fresh pricing. These items are marked "Price on Application" in the partial quote.

**Live Quote Builder (what sales rep sees during the call):**

```
LIVE QUOTE — QR-2026-00001
┌───────────────┬──────────┬─────────┬────────┬─────────┐
│ Item          │ Supplier │ Cost    │ Margin │ Price   │
├───────────────┼──────────┼─────────┼────────┼─────────┤
│ Cement 500bag │ Supp A   │ EGP 47  │ 20%    │ 56.40   │ 🟢
│ Rebar 200bndl│ Supp A   │ EGP 3250│ 15%    │ 3,738   │ 🟢
│ Plywood 100  │ Supp D   │ —       │ —      │ —       │ 🔴 Awaiting
│ PVC 50 pcs   │ Supp A   │ EGP 82  │ 18%    │ 96.76   │ 🟢
├───────────────┴──────────┴─────────┴────────┴─────────┤
│ Subtotal (3 of 4): EGP 780,380                        │
│ [Send Partial Quote] [Wait for All Items]              │
└───────────────────────────────────────────────────────┘
```

**Margin Guardrails (built into the quote builder):**
- Floor price: red highlight, cannot send without manager approval
- Below target: yellow highlight, warning but can proceed
- At/above target: green, auto-approved
- Rep can adjust margin per line item within their authority level
- Below-floor adjustments trigger instant approval workflow (manager gets push notification)

**Partial Quotes Are Standard Practice:**
- Industry-validated: customers prefer 80% of the quote immediately over waiting days for 100%
- Items without pricing show "Price on Application — we'll update within [X hours]"
- When remaining prices arrive → quote auto-updates → customer notified via portal + WhatsApp

**Procurement's Revised Role:**
- NOT the bottleneck for every quote
- Handles: items with stale/missing prices, new supplier sourcing, negotiations, complex/non-standard orders
- Standard items with fresh supplier prices: sales quotes directly using cached prices
- Procurement focuses on keeping supplier prices FRESH (managing supplier portal data quality) rather than sourcing every individual quote

**Auto-RFQ: NOT recommended.** Auto-sending inquiries to suppliers on every customer request risks spamming suppliers and eroding relationships. Instead: match to cached prices first, queue only the gaps for procurement.

**Call Decision Rules:**

| Customer Type | Order Type | Action |
|---|---|---|
| New customer, first request | Any | Call — build quote live, verify specs, catch typos |
| New customer, AI-drafted | Any | Call — verify AI's interpretation |
| Existing customer, standard repeat | All items have fresh prices | Send quote directly (no call needed) |
| Existing customer, unusual request | Flagged by system | Call to verify |
| Any customer, high value ($500K+) | Any | Call — too much at stake for typos |
| Any customer, quantity anomaly | Flagged by system | Call to verify ("Did you mean 100 or 1,000?") |

**Quote-to-Order Confirmation (Revised):**
- For new customers / complex orders: Mariam calls Ahmed, walks through everything, agrees on prices and terms verbally
- Mariam clicks [Confirm Order] in her Sales module — this creates the order directly
- The customer's portal shows "Order Confirmed" immediately — NO accept/decline buttons needed
- The quote exists as an internal record attached to the order (PDF for audit trail)
- Payment instructions appear in the customer's portal with bank details
- For existing customers / standard repeats with no call: quote sent to portal, customer accepts there (Accept/Counter/Decline buttons exist for this flow only)

**The phone call IS the acceptance.** If sales confirmed verbally with the customer, they have authority to create the order. No redundant portal clicks.

**Finance/AR Flow (Corrected — NOT warehouse):**
- Finance/AR team handles ALL payment collection (segregation of duties)
- For standard customers: Net 30/60/90 terms, payment comes AFTER delivery
- For high-risk/new customers: Finance can require prepayment/deposit, releases order to warehouse only after payment confirmed
- Partial payments tracked at invoice level by finance (not order level by warehouse)
- Unresolved partial payments flagged in finance dashboard for follow-up
- Finance sends "release" signal to warehouse when credit/payment is approved

**Warehouse/Operations Flow (Validated):**
- Warehouse sees all confirmed + credit-approved orders on fulfillment kanban
- Manager selects which base each portion comes from (system auto-suggests, manager overrides)
- Example: 3000 wood units → 1000 from Base A, 2000 from Base B
- Two-phase inventory reservation: soft hold (planning) → hard commit (pick list generated)
- Assigns driver per base (or same driver for multi-pickup)
- Loading workflow: pick (barcode scan) → stage (tally check) → load (weight check) → photo documentation → driver sign-off
- Status: "Preparing" when loading begins

**Driver Model (Validated with expansion):**
- Three driver categories (not two):
  - INTERNAL (W2 employee, company vehicle, full equipment access, dispatched directly)
  - CONTRACTED (recurring external, verified CDL/insurance/equipment, offered priority overflow)
  - ON_DEMAND (one-off external, own vehicle, light loads only, claimed from available pool)
- Same app, different permissions via driver_type flag
- Equipment-tagged dispatch: Moffett/boom/CDL jobs → INTERNAL or CONTRACTED only, never ON_DEMAND
- External driver onboarding: license verification, CDL check, insurance verification, background check, vehicle inspection, drug test (if CDL), signed contractor agreement — 3-10 business days
- Internal drivers signed up by admin only (no self-signup)

**Fleet/Dispatch Flow (Validated):**
- When driver assigned and loading begins → "Preparing"
- When driver departs → "In Transit" (triggered by GPS movement detection)
- Fleet app shows all drivers on color-coded map:
  - Yellow: Loading/Preparing
  - Green: In Transit
  - Blue: At Delivery Site
  - Checkmark Green: Delivered (confirmed)
  - Red: Problem (delay, damage, customer unavailable)
- Click any vehicle → order details, customer info, driver info, ETA, contact buttons
- Delivery confirmation: Driver captures POD (photos + signature) → syncs to fleet app → Dispatcher validates POD → Dispatcher marks "Delivered" → triggers invoice generation
- Weight tracking: onboard scales (Air-Weigh/TruckWeight) + platform scale at warehouse exit
- Product integrity: barcode scan at pick, tally at stage, weight at load, photos before departure

**Supplier Stock Receiving (Validated + enhanced):**
- Incoming stock inspection: documents check (BOL vs PO) → physical inspection → accept/reject/quarantine
- AQL sampling for large shipments (ANSI/ASQ Z1.4 standard)
- Supplier tiering: Preferred (skip-lot) → Approved (AQL sampling) → Conditional (tightened) → New (100% inspection)
- Rejection triggers NCMR (Nonconforming Material Report) + notifies procurement
- Recurring issues trigger SCAR (Supplier Corrective Action Request)

**Damaged Goods to Customer (Validated + expanded):**
- Options: full replacement, partial credit note (keep at discount), full credit/refund, reorder at no charge, return and reprocess
- Determine fault: warehouse damage, transit damage, carrier damage, customer-caused
- Photo evidence from loading vs delivery determines responsibility
- If carrier fault → freight claim (file within 7-14 days)
- Target resolution: 7 days, max 14 days

**Accounting (Corrected — build operational, integrate financial):**
- BUILD in HyperQuote: invoicing, AR sub-ledger, AP sub-ledger, three-way matching (PO + receipt + invoice), payment recording (wire/check/LC), credit management, AR aging, tax calculation (Avalara API)
- INTEGRATE with QuickBooks Online: general ledger, financial statements, bank reconciliation, payroll
- Key reports: daily cash position, AR aging, AP aging, 13-week cash forecast, P&L by customer/product/project, margin analysis
- Bank feeds: start with CSV import, add Plaid API in Phase 2

### 5.10c Operational Gap Fixes (Discovered During Walkthrough)

**Proforma Invoice:** System generates both Quote PDF and Proforma Invoice PDF from the same data. Proforma includes bank details and is formatted like an invoice — needed for Egyptian companies to process internal purchase approvals and open Letters of Credit.

**EGS/GPC Product Codes:** Every product in the catalog requires an EGS (Egyptian General Standard) or GPC (Global Product Classification) code for ETA e-invoicing compliance. Suppliers must provide these when publishing products via the portal. System validates code presence before a product can be included in an invoice.

**Digital Company Stamp (ختم الشركة):** All PDF documents (quotes, proformas, invoices, delivery notes, credit notes) include HyperQuote's digital company stamp — standard expectation in Egyptian business documents.

**Post-Dated Cheque Tracking:** Core payment instrument in Egyptian B2B. System tracks per cheque: cheque number, bank name, amount, date, payer, status (Received → Deposited → Cleared / Bounced). Bounced cheque triggers: immediate credit hold + legal notification + Tier 5 customer status.

**Payment Receipt Generation:** When any payment is received and verified (wire, cheque cleared, LC drawn), system auto-generates a payment receipt PDF (إيصال استلام) sent to customer via portal + WhatsApp.

**Drop-Ship PO Contains Customer Delivery Details:** Supplier PO includes: exact delivery address, site foreman name + phone, delivery window, access instructions, unloading requirements. All auto-populated from the order.

**Supplier PO Rejection After Order Confirmation:** If a supplier rejects a PO after the order was confirmed with the customer:
- System immediately flags to procurement: "⚠️ Supplier rejected PO — order at risk"
- Procurement has 4-hour SLA to find alternative supplier
- If alternative found → new PO generated, customer notified of any delivery date change
- If no alternative → sales contacts customer with options (wait, substitute, partial cancel)
- The customer already has a confirmed order — this is a crisis, treated with highest priority

**Branded Delivery Notes for Drop-Ship:** System auto-generates HyperQuote-branded delivery note (PDF) for every delivery — including drop-ships. Sent to supplier via portal/WhatsApp. Supplier prints and attaches to shipment. Contains: HyperQuote logo, order number, customer name, delivery address, line items, quantities. NO prices. Customer's foreman signs this document.

**Drop-Ship POD System (Dual Confirmation):**
- Supplier driver photographs signed HyperQuote delivery note → sends via WhatsApp within 4 hours
- Customer confirms receipt via WhatsApp/portal ("Reply RECEIVED")
- Invoice triggers on FIRST confirmation (don't wait for both)
- Auto-confirm at 72 hours if dispatched but no confirmation or dispute
- Dispute window: 72 hours from dispatch
- Payment holdback: supplier not paid until POD uploaded (strongest enforcement lever)
- Supplier POD compliance tracked in scorecard (below 80% = warning, below 70% = contract review)

**Replacement Logistics in Drop-Ship:** When replacement items are needed (e.g., 50 damaged cement bags) and the replacement comes from a different supplier than the next scheduled delivery:
- Option A: Supplier A sends replacement as a separate small delivery (3rd delivery)
- Option B: If HyperQuote has a base/pickup point, consolidate there first
- Option C: Add to next order from the same supplier (if customer can wait)
- At launch (no own fleet/base): Option A is default. Honest with customer: "Replacement arriving separately."

**COD Collection in Drop-Ship:** HyperQuote is not physically at the delivery site. Balance collection options:
- Post-dated cheques already provided before shipment (Tier 1/2 requirement — this covers it)
- Wire transfer within 3-5 business days of delivery
- HyperQuote sends a representative to collect certified check from customer's office (not job site)
- System auto-generates payment reminder WhatsApp on delivery date: "Your delivery was completed. Balance of EGP X due. Wire details: [link]"

**Supplier Flow — Resolved Gaps:**
- Delivery addresses use coded references (HQ-2026-XXXX), not customer company names. Site foreman first name + phone only.
- ETA e-invoicing registration is a HARD requirement for supplier onboarding. Paper invoices = no VAT deduction for HyperQuote.
- Supplier accounts support 3 roles: Owner (full access), Operations (stock/POs), Finance (invoices/payments)
- Rejected supplier applications use 3-status model: Approved / Pending (fixable) / Declined (6-month wait). Always provide specific reason. Phone call for declined (Egyptian business culture).
- Supplier stock discrepancy (confirmed PO but less stock): split-source large orders across 2+ suppliers by default. Track confirmed-vs-delivered ratio per supplier.
- Supplier analytics show RELATIVE metrics only (win rate vs market average), never absolute customer data.
- Branded delivery note enforcement: pre-filled PDF generated by system, sent to supplier. Payment holdback for non-compliance. Customer-side checkbox "Delivery note was HyperQuote branded."

**Credit Notes Submitted to ETA:** Every credit note (for damage, returns, price adjustments) must be submitted to the Egyptian Tax Authority e-invoicing system as a debit/credit document — digitally signed, same format as invoices.

**Supplier Payment with Withholding Tax:** When HyperQuote pays suppliers:
- Gross invoice amount - 1% withholding = net payment
- Withholding amount remitted quarterly to ETA
- Withholding tax certificate generated and sent to supplier
- AP module tracks: gross, withholding, net, and certificate status per payment

### 5.11 Driver Operations — Complete Blueprint

**Three Driver Types:**

| Type | Classification | Vehicle | Equipment Access | Dispatch | Pay | Onboarding |
|------|---------------|---------|-----------------|----------|-----|------------|
| INTERNAL | Employee | Company vehicle | Full (Moffett, boom, crane) | Dispatched directly | Per Egyptian labor law + benefits (adjust to local market rates in EGP) | Company hires, full compliance file, 3-10 days |
| CONTRACTED | Recurring contractor | Own commercial vehicle | Own verified equipment | Priority overflow | Per-trip or per-delivery (negotiated in EGP) | Carrier onboarding, insurance verification, 5-7 days |
| ON_DEMAND | One-off contractor | Own vehicle (light loads only) | None (customer must have equipment) | Claimed from available pool | Per-delivery via platform (EGP, market rate) | App signup + verification, 3-10 days |

**Vehicle Types for Building Materials:**
- Flatbed: lumber, steel, palletized goods. Second Degree professional license minimum for heavy trucks
- Moffett-equipped: self-unloading, 6-10 stops/day. Second Degree license + Moffett cert
- Boom truck: rooftop loading, 3-6 stops/day. Second Degree license + crane cert
- Box truck: bagged goods, smaller items. Third Degree license sufficient for lighter vehicles
- Semi-trailer: bulk/wholesale, long-haul. First Degree professional license
- Pickup + trailer: small orders, samples. Standard license sufficient

*(Vehicle acquisition costs vary by Egyptian market conditions — budget in EGP. USD reference prices from international benchmarks available in detailed research files.)*

**Driver App — 15 Screens:**
1. Login (phone OTP → biometric on subsequent opens)
2. Shift Start (vehicle selection → pre-trip DVIR inspection → odometer)
3. Home Dashboard (today's stops count, first stop preview, total weight, "Start Route")
4. Route Overview (map with numbered pins + list view, color-coded by status)
5. Stop Detail (customer info, contact, order items, unloading method, site history/photos)
6. Navigation (launch external truck-safe routing: Sygic/HERE, not Google Maps)
7. Loading Verification (barcode scan each item, weight check, photo of loaded truck)
8. Arrival (geofence auto-detect or manual check-in, contact customer)
9. Delivery (unloading method confirm, unloading timer, line-item confirmation)
10. POD Capture (photos of delivered materials, digital signature, quantity per line item, damage checkbox)
11. Exception Reporting (customer not available, site blocked, damage, partial delivery, safety concern, vehicle issue)
12. Communication (chat with dispatch, masked calling to customer, emergency button)
13. End of Day (shift summary, returns processing, post-trip DVIR, odometer, sign-off)
14. External Driver: Job Offer (accept/decline with payout shown, countdown timer)
15. External Driver: Earnings (weekly pay, per-delivery breakdown, payout schedule)

**Key Design Principles:**
- Glove-friendly: minimum 56-64dp touch targets
- One-handed operation: primary actions in bottom 40% of screen
- Offline-first: all stop data cached, POD captured offline, background sync
- Truck-safe navigation: integrated with Sygic/HERE (not Google/Waze — they lack truck profiles)
- Photo evidence at every stage: loading, delivery, exceptions
- Masked phone numbers: customer never sees driver's personal number

**Compliance (Egyptian Law — Replaces US FMCSA):**
- Egypt has NO equivalent of FMCSA Hours of Service or ELD mandates
- No legally mandated daily pre-trip inspection (implement as internal policy)
- No formal cargo securement standards (adopt international standards as internal policy)
- Driver licenses: Third/Second/First Degree professional license system (Second Degree minimum for heavy trucks)
- Working hours: Labor Law 14/2025 — 8h/day, 48h/week, 12h max daily presence. Overtime: 135% day, 170% night
- Drug testing: Mandatory for license issuance/renewal (Decision 1741/2025). Zero BAC for commercial drivers. Random roadside testing by Ministry of Interior
- GPS tracking: Legal with explicit employee consent (Data Protection Law 151/2020). Penalties up to EGP 5M for violations
- Electronic POD: Legally valid (E-Signature Law 15/2004). App-based signature + GPS-tagged photos = strong evidence
- Insurance: Compulsory third-party liability (Unified Insurance Law 155/2024). Cargo insurance recommended but optional
- **CRITICAL: Heavy trucks (5+ tons) BANNED from Cairo Ring Road 6AM-midnight.** Building materials deliveries in Greater Cairo must be scheduled midnight-6AM. This is a major operational constraint the platform must handle in dispatch scheduling.

**CRITICAL OPERATIONAL CONSTRAINT — Cairo Truck Ban:**
Heavy trucks (5+ tons) are BANNED from Cairo's Ring Road from 6:00 AM to midnight. Building materials deliveries within Greater Cairo must be scheduled in the midnight-6:00 AM window. The dispatch module MUST enforce this constraint:
- Auto-block scheduling of heavy deliveries in Cairo during banned hours
- Alert dispatcher if a route plan violates the ban
- Customer-facing: delivery windows for Cairo show "Night delivery: 12AM-6AM" for heavy materials
- Light deliveries (under 5 tons, box trucks) are exempt and can deliver during daytime

**Dispatch Logic:**
- Three-tier assignment: hard constraints (vehicle type, CDL, equipment) → optimization (proximity, route efficiency, load balance) → business rules (internal first, customer preference)
- Equipment-tagged dispatch: Moffett/boom/CDL jobs → INTERNAL or CONTRACTED only, never ON_DEMAND
- Auto-suggest with manual override by dispatcher

**Loading → Delivery Flow:**
1. Warehouse picks order (barcode scan verification)
2. Items staged at dock (tally check)
3. Loaded onto truck (weight verification via onboard + platform scale)
4. Photo documentation of secured load
5. Driver + warehouse sign-off → status: PREPARING
6. Driver departs → GPS detects movement → status: IN_TRANSIT
7. Fleet app tracks on color-coded map (Yellow=loading, Green=transit, Blue=at site, Red=problem)
8. Geofence detects arrival → driver checks in → status: AT_SITE
9. Unloading (Moffett/crane/manual, timer running)
10. POD captured (photos + signature + quantity confirmation)
11. Driver submits POD → syncs to fleet app
12. Dispatcher validates POD → marks DELIVERED → triggers invoice generation

**Failed Delivery Handling:**
- 7 failure types: customer not available, site blocked, wrong address, damaged goods, partial refused, weather, vehicle issue
- Each requires: photo evidence, categorized reason, dispatch notification
- Cost per failure: $150-400+
- Target: 93-97% first-attempt success rate
- Options: return to warehouse, attempt redelivery, leave with alternate contact (with POD)

**Driver Operations — Additional Details (Research-Validated):**
- Paper backup delivery notes in every truck (for device failure)
- WhatsApp POD channel as fallback when app fails
- Device failure escalation: 5min → 15min → 30min for "dark" drivers
- Pre-shift device health check: battery > 50%, GPS working, app version current
- Biometric auth fallback chain: Face ID → Fingerprint → PIN → Phone OTP

**DVIR Checklist (Egyptian Version — Internal Policy):** No legal requirement for daily vehicle inspection in Egypt. HyperQuote implements as INTERNAL POLICY: driver completes 10-item vehicle check in the app before shift (tires, lights, brakes, fluid levels, load securement equipment, mirrors, horn, windshield wipers, fire extinguisher, Moffett if applicable). Failures block departure until resolved or vehicle swapped.

**Night Delivery Safety (Cairo Truck Ban Window):** Drivers delivering between midnight-6AM in Cairo must: use high-visibility vests, ensure vehicle lighting is functional, carry emergency kit, notify dispatch of departure/arrival. Site must have adequate lighting for unloading. Driver app activates dark mode automatically during night shifts.

**Contracted Driver Workflow:** Contracted drivers receive jobs via the same driver app as internal drivers, but with "offered" (not "assigned") dispatch. They accept/reject within 30 minutes. Performance tracked via scorecard (on-time rate, POD compliance, damage rate). Insurance verified monthly (not just at onboarding). Invoicing: contracted drivers submit invoices via the portal; HyperQuote pays weekly with 5% withholding tax (services rate).

**Fleet Maintenance:**
- PM schedule: A (every 5K miles), B (every 25K miles), C (annual)
- Specialized equipment: Moffett, boom, conveyor have separate maintenance schedules
- Breakdown protocol: driver reports → dispatch re-routes remaining stops → roadside assistance
- Fleet health dashboard: vehicle status, upcoming maintenance, tire wear, fuel consumption

### 5.12 Warehouse App — Complete Blueprint

**Warehouse App — 23 Screens:**
- Login (badge scan + PIN), Worker Dashboard, Manager Dashboard
- Receiving: Expected Deliveries, Active Receiving (standard + bulk/weight), Quality Inspection
- Storage: Putaway (system-directed), Inventory Lookup (cross-base), Inter-Base Transfer
- Fulfillment: Pick List Queue, Directed Picking, Staging & Load Verification (with axle weight)
- Counts: Cycle Count (blind), Supervisor Approval, Variance Resolution
- Other: Returns Receipt & Inspection, Damaged Goods Disposition, Yard Map (interactive zones), Reports/KPIs

**Inventory Quantities Tracked:**
- On-Hand, Available (= on-hand - reserved - allocated - on-hold - damaged), Reserved (soft hold for planning), Allocated (hard commit for confirmed pick), On-Hold (quality issue), Damaged, In-Transit Inbound (from supplier), In-Transit Outbound (to customer), On-Order (PO placed, not yet shipped), Quarantined, Returned

**Stock Costing:** Weighted Average Cost (primary), FIFO tracking for shelf-life items (cement). Landed cost includes freight allocated by weight.

**Multi-Location:** Company > Region > Base > Zone > Aisle > Bay > Level. Indoor = bin-level tracking. Outdoor yard = zone-based GPS tracking.

**Barcode Strategy:** GS1-128 for pallets/cases, manufacturer barcodes for individual items, location barcodes for bins/zones. Non-barcodeable items (aggregates, loose lumber): weight-based and tally-based tracking.

**Building Materials Specific:**
- Weight-based: aggregates (sold by ton), concrete (by cubic yard)
- Length-based: lumber (by board foot)
- Shelf life: cement 3-6 months, adhesives 12 months, sealants 18 months
- UOM conversions: buy in tons, store in pallets, sell in bags

### 5.13 Sales App — Complete Blueprint

**Sales App — 21 Screens:**
- Dashboard (pipeline value, open quotes, win rate, response time)
- RFQ Inbox (priority-scored, auto-assigned, SLA timers)
- RFQ Detail (customer request with line items, clarification workflow)
- Quote Builder (10-step: init → add items → see costs → set margins → terms → preview → approval → send)
- Quote Negotiation (side-by-side versions, what-if margin calculator)
- Customer 360 (8 tabs: Overview, Contacts, Quotes, Orders, Financials, Projects, Communications, Documents)
- Pipeline/Kanban (9 stages: RFQ Received → Reviewing → Sourcing → Quoting → Sent → Negotiating → Won → Lost → Expired)
- Activity Feed, Calendar, Contacts, Reports, Product Catalog (no prices), Notifications, Settings, Team/Manager views

**Supplier Cost Visibility:** Show margin percentage to sales reps, NOT actual supplier cost. Procurement adds a 2-3% buffer to protect real margins while giving reps enough info to negotiate.

**Sales AI Assistant:** Morning briefing, pre-meeting customer summary, email drafting, quote win/loss prediction, reorder alerts ("Customer X hasn't ordered in 45 days"), pricing suggestions from history.

**Commission:** Base salary + margin-based commission (not revenue-based). Tiered rates increasing with margin %. KPIs: quote-to-order conversion, average margin, response time, pipeline value, customer retention.

### 5.14 Business Logic — Gap Analysis

**Critical Gaps Identified and Now Resolved:**

| Gap | Status | Resolution |
|-----|--------|-----------|
| Pricing engine rule priority | RESOLVED | Customer-specific > Tier > Category > Volume > Default. Multi-line discounts supported. Multi-supplier cost resolved via WAC |
| Tax calculation (Avalara + ZATCA) | RESOLVED | Avalara API for US destination-based tax (**US-specific, not needed for Egyptian launch**). Saudi ZATCA Phase 2 e-invoicing mandatory for SAR 7M+ (**Saudi-specific, applies only if HyperQuote expands to Saudi Arabia**). Egyptian launch uses ETA e-invoicing (Section 1). |
| Credit management workflow | RESOLVED | Application → D&B/Experian scoring → Limit set → Auto-check on every order → Hold if exceeded → Finance releases |
| Missing data entities | RESOLVED | Added: Projects, Contacts, Addresses, Price Lists (versioned), Contracts, Purchase Requisitions |
| Multi-currency | RESOLVED | Exchange rate management, FX gain/loss tracking, revaluation logic, dual-currency display |
| Permission matrix (RBAC) | RESOLVED | 25+ roles × permissions mapped. Temporary delegation for vacation |
| Notification matrix | RESOLVED | 60+ events mapped to recipients × channels (in-app, email, SMS, WhatsApp, push) |
| Audit trail detail | RESOLVED | Every price/status/approval/payment change logged. SOX 7-year retention. WORM for immutability |
| Mechanic's lien rights | RESOLVED | **US-specific, not applicable to Egyptian operations.** Relevant only if HyperQuote expands to US market. Egyptian law uses different creditor protection mechanisms. |
| Disaster recovery | RESOLVED | RTO/RPO targets defined. Supabase PITR backups. Cloudflare failover. Manual continuity procedures |
| Saudi ZATCA e-invoicing | RESOLVED | **Saudi-specific — applies only if HyperQuote expands to Saudi Arabia.** Not applicable to Egyptian launch. Phase 2 integration required for Saudi invoice generation pipeline. |

### 5.15 HR Module

**Build in-house (integrated with operations):** Employee directory/profiles, org chart, driver compliance tracking (CDL, drug tests, Moffett cert — blocks dispatch if expired), attendance/time tracking (GPS-based for drivers), leave management, commission calculations (from order margins), onboarding checklists, document storage, HR dashboards.

**Integrate externally:** Payroll (local Egyptian provider or Gusto for US), benefits administration, recruitment/ATS. Never build payroll — tax rules change annually.

**Egyptian Labor Law (Law No. 14 of 2025):**
- Working hours: 8h/day, 48h/week. Overtime: 135% day, 170% night, 200% holidays
- Social insurance: Employee 11% + Employer 18.75% (capped at EGP 16,700/month in 2026)
- Income tax: Progressive 0%-27.5% with EGP 20,000 personal exemption
- 8 leave types: annual (15-30 days by tenure), maternity (120 days up to 3x), paternity (1 day), sick (180 days at 75-85%), plus childcare, study, nursing, pilgrimage
- Contracts must be in Arabic, 4 copies. 3-month max probation. Mandatory 3% annual raise
- Records retained 5 years post-termination

**Driver Compliance Integration:** CDL expiry, medical card, drug test dates, Moffett certification — all integrated with dispatch. Expired compliance = blocked from dispatch assignment.

**Phases:** Phase 1 (launch): profiles, attendance, driver compliance, leave, documents. Phase 2 (30-50 employees): self-service, commissions, org chart, payroll integration. Phase 3 (100+): performance reviews, training tracker, recruitment.

### 5.16 CEO App — Universal Search + AI

**Search Architecture:**
- Dedicated `search_index` table synced via triggers from all 53 source tables
- `pg_trgm` + `tsvector` + GIN indexes for instant fuzzy search (<100ms)
- Grouped results by entity type (employees, customers, orders, etc.) with ROW_NUMBER() PARTITION BY
- 8-12 pre-joined AI views (business overview, employee details, customer health, order pipeline, financial summary, delivery tracking, supplier performance, product inventory)

**Search-to-AI Transition:**
- CEO types → instant search results grouped by category
- CEO presses Enter/Send → search bar becomes AI chat with query + search context passed to LLM
- Back button returns to search mode
- cmdk-style command palette pattern

**Deep Linking:** Results link to internal app (app.hyperquote.net/hr/employees/{id}, /orders/{id}, etc.) via SSO — CEO is already authenticated.

**Materialized Views:** Refreshed via pg_cron (15min for orders, hourly for customers, daily for KPIs). CONCURRENTLY refresh so reads aren't blocked.

---

## 6. AI Integration

### 4-Tier AI Architecture

```
User query → GLM-4.7-Flash classifies intent (free, <50ms on CF Workers AI)
  ├── Simple lookup → GLM handles directly (free)
  ├── Chat / Arabic → Groq Qwen3 32B ($0.001/query, 662 tok/sec)
  ├── Complex reasoning → Claude Sonnet ($0.008/query)
  ├── Vision / PDF parsing → Mistral OCR + Groq structuring ($0.001-0.003/page)
  └── Groq rate-limited → fallback to Claude
All routed through Cloudflare AI Gateway (caching, rate limiting, analytics, fallback)
```

| Tier | Provider | Cost/Query | Use For |
|------|----------|-----------|---------|
| **Free** | GLM-4.7-Flash (Cloudflare Workers AI) | ~$0.0003 | Intent classification, simple lookups, driver briefings |
| **Fast** | Groq (Qwen3 32B) | ~$0.001 | Customer chatbot, employee assistant, Arabic chat, data structuring |
| **OCR** | Mistral OCR | ~$0.001-0.003/page | Supplier catalog text/table extraction (30-90x cheaper than Claude vision) |
| **Premium** | Claude (Haiku/Sonnet) | ~$0.003-0.008 | Complex reasoning, CEO analytics, vision fallback, project estimation |

**Estimated AI cost: ~$61/month** (50 users, 20 queries/day) vs $100-240 all-Claude

### AI Features by Surface

| Surface | AI Feature | Pattern | Status |
|---------|-----------|---------|--------|
| Website | Chatbot (guided discovery + FAQ RAG) | Free tier (GLM) + Fast tier (Groq) | Proven |
| Internal | Database assistant (order lookup, inventory) | Fast tier (Groq) + Premium tier (Claude) for complex | Proven |
| Customer Portal | NL material list building + quote request drafting | Fast tier (Groq) + tool use (draft-review-confirm) | Proven |
| Supplier Portal | Catalog parsing, 3-way matching, reorder suggestions | OCR tier (Mistral) + Fast tier (Groq structuring) | Proven |
| Driver App | AI site briefings, voice commands | Free tier (GLM context injection) | Emerging |
| CEO App | Analytics AI + RAG AI | Premium tier (Claude) + pre-computed metrics + pgvector | Proven |

### AI in Quoting (Internal)
- Auto-parse customer RFQs (including PDF/email) → extract line items
- Recommend which suppliers to contact per line item
- Predict expected prices from historical data
- Auto-calculate optimal margins per deal
- Help customers build material lists from project descriptions

### Safety Patterns
- AI never constructs raw SQL (parameterized queries only)
- Read-only database connection for AI queries
- Draft-review-confirm for all mutations
- Capability tiers per user role
- Full audit log of every AI query and action
- Prompt caching (90% cost reduction for repeated schemas)

---

## 7. Infrastructure & Operations

### Monorepo Structure

```
apps/
  website/                # TanStack Start (SSG+SSR) — hyperquote.net
  platform/               # TanStack Start (SPA) — app.hyperquote.net
  portal/                 # TanStack Start (SSR) — portal.hyperquote.net
  ceo/                    # TanStack Start (SPA/PWA) — ceo.hyperquote.net
  driver/                 # Vite + React SPA + Capacitor — driver.hyperquote.net
packages/
  ui/                     # @hyperquote/ui — React Aria Components + Tailwind
  api/                    # @hyperquote/api — Supabase client, typed queries
  web-auth/               # @hyperquote/web-auth — SSO cookie auth
  i18n/                   # @hyperquote/i18n — react-i18next + 38 locales
  forms/                  # @hyperquote/forms — React Hook Form + Zod schemas
  tables/                 # @hyperquote/tables — TanStack Table configs
supabase/
  migrations/             # ~200 migrations organized by domain
  functions/              # 36 Edge Functions
turbo.json
bun.lock
```

### CI/CD Pipeline (GitHub Actions + Turborepo)

**PR Validation:** Lint + typecheck + test (affected only via `--filter`), Supabase migration check, Vitest browser tests

**Deploy Order (enforced via `needs`):**
1. Database migrations (`supabase db push`)
2. All 5 Workers (`wrangler deploy` per app)

**Environment Management:**
- Staging: Supabase persistent branch + Cloudflare `--env staging`
- Production: Main Supabase project + Cloudflare `--env production`
- PR Preview: Supabase ephemeral branch + Cloudflare preview URL

### Notifications

| Channel | Tool | Cost |
|---------|------|------|
| Email | Resend + React Email | $20/mo (50K) |
| SMS | Twilio | ~$80-150/mo |
| Push | Web Push + Capacitor Push (FCM/APNs) | $0 |
| In-app | Supabase Realtime | $0 (included) |
| WhatsApp | WhatsApp Cloud API (Meta direct) | ~$50-150/mo |
| Webhooks | Custom (Edge Functions + pg_cron) | $0 |

**Orchestration:** Custom routing logic (severity -> channels, user preferences, quiet hours). Upgrade to Novu if complexity grows.

### PDF Generation

- **Library:** pdf-lib in Supabase Edge Functions (pure JS, works everywhere)
- **Storage:** Cloudflare R2 with signed URLs
- **Documents:** Invoice, BOL, Quote, Packing Slip
- **Shared data layer:** Same `prepareInvoiceData()` feeds both PDF and email templates
- **Driver signatures:** Canvas capture in app -> PNG -> composited onto BOL PDF

### GPS & Mapping

| Component | Tool | Cost |
|-----------|------|------|
| Maps | MapLibre GL 5.21 + react-map-gl 8.1 | Free (open source) |
| Map Tiles | MapTiler (Arabic labels) | ~$25/mo |
| Offline Maps | PMTiles | Free (self-hosted on R2) |
| Routing | Sygic/HERE (truck-safe) | Varies |
| Route optimization | OR-Tools (self-hosted) or GraphHopper | Free / ~$89/mo |
| Live tracking | Supabase Realtime (Broadcast) | Included |
| Background GPS | @transistorsoft/capacitor-background-geolocation | $399 one-time |
| GPS storage | PostGIS on Supabase (partitioned) | Included |

### Offline Sync (Driver App)

**Solution:** PowerSync (Capacitor SDK) + Supabase
- Reads Postgres WAL, syncs to local SQLite on device
- Built-in upload queue with retry
- Official Supabase partner, background sync via Capacitor background task
- Cost: ~$49/mo for 50 drivers
- WatermelonDB rejected: requires custom sync engine, memory issues at scale

---

## 8. Business Operations

### Payment Management (No Online Payments)

Orders can be $100M+. All payments are offline: wire transfers, certified checks, letters of credit, bank guarantees. There is no payment gateway (no Stripe, no ACH processing).

**Payment Methods (ALL transactions, everywhere):**
- Bank wire transfer
- Certified bank cheque / post-dated cheques
- Cash
- Letters of credit (large orders)
- **NO mobile wallets, NO Vodafone Cash, NO InstaPay, NO digital payment apps**
- External driver payments: bank transfer (weekly) or cash at office
- Withholding on external driver payments: 5% (services rate, not 1% goods rate)

**Payment Methods by Order Size:**

| Order Size | Primary Methods |
|---|---|
| EGP 500K-5M (~$10K-100K) | Company cheque, wire transfer |
| EGP 5-50M (~$100K-1M) | Wire transfer, certified bank cheque |
| EGP 50-500M (~$1-10M) | Wire transfer, letter of credit |
| EGP 500M-5B+ (~$10-100M+) | Letter of credit, wire transfer series, bank guarantee |

**Payment Terms:**
- Net 30 (standard), Net 60 (large projects), Net 90 (major developers)
- 2/10 Net 30 (2% discount for early payment — 36% annualized return)
- Progress payments for multi-month deliveries (time-based, milestone-based, % of completion)
- COD/CIA for new customers or custom materials
- Retainage: 5-10% held until project completion (common in large Egyptian construction projects; terms negotiated per contract)

**What the System Tracks (No Payment Gateway Needed):**
- Invoice generation from delivery confirmations
- Manual payment recording (wire received, check deposited, LC drawn)
- Payment-to-invoice matching (many-to-many: one payment can cover multiple invoices)
- AR aging (Current, 1-30, 31-60, 61-90, 90+ days)
- Credit limits and utilization per customer
- Letters of credit lifecycle (issuance → amendments → draws → documents)
- Retainage accumulation and release tracking
- Progress billing (AIA G702/G703 is a US format — Egyptian progress billing follows different conventions; adapt format for local market)
- Bank reconciliation (manual or semi-automated via Plaid API)
- Early payment discount eligibility and expiration
- Collection escalation workflows (email → phone → credit hold → legal)
- Lien rights tracking and preliminary notice deadlines (**US-specific, not applicable to Egyptian operations** — retain only if expanding to US market)

**Credit Management Tiers:**

| Credit Limit | Requirements |
|---|---|
| EGP 0-5M (~$0-100K) | Basic application, 3 trade references, bank reference |
| EGP 5-50M (~$100K-1M) | + Credit report, financial statements review |
| EGP 50-500M (~$1-10M) | + Audited financials, trade credit insurance or LC |
| EGP 500M+ (~$10M+) | + Personal/corporate guarantee, surety bond, full financial audit |

**Credit checks:** Automated on every order (PostgreSQL triggers). Credit holds/releases tied to payment events. AR aging as materialized PostgreSQL view. Dunning: custom Edge Function reminders on schedule.

### Payment-Fulfillment Model (Egyptian Market — Research-Validated)

**Critical finding: Egypt's B2B commerce runs on post-dated cheques (PDCs).** A bounced cheque is a criminal offense under Egyptian law, giving the supplier enormous leverage. Distributors ship against payment INSTRUMENTS (cheques, LC, wire reference), not against cash in hand. Payment collection happens in parallel with fulfillment.

**The rule: No shipment without a payment INSTRUMENT. But cash collection is parallel.**

A "payment instrument" can be:
- Post-dated cheques (most common in Egyptian B2B — criminal liability if bounced)
- Wire transfer confirmation/reference
- Irrevocable Letter of Credit
- Bank guarantee

**Customer Tier Model:**

| Tier | Who | Payment Requirement | Fulfillment |
|------|-----|-------------------|-------------|
| **Tier 1 — New** | First 1-3 orders, no history | Cash Before Delivery (CBD) OR post-dated cheques required | BLOCKED until instrument received |
| **Tier 2 — Developing** | <12 months, <5 orders | Net 30 with post-dated cheques | Proceeds with valid instrument |
| **Tier 3 — Established** | 12+ months, good history | Net 30-60, cheques or wire | Proceeds in parallel. Payment tracked separately |
| **Tier 4 — Strategic/VIP** | Long history, large volume | Net 60-90, maximum flexibility | Fully parallel. Manual review only for exceptions |
| **Tier 5 — Flagged** | Previous non-payment or bounced cheque | CBD only, no exceptions | HARD BLOCKED until cash received |

**Tier Progression Triggers (Composite Score):**
- Order count: minimum 5 completed orders
- Cumulative spend: minimum EGP 500K
- Time as customer: minimum 3 months
- Payment score: weighted 30% (most important factor)
- All four must be met for upgrade

**Payment Behavior Score (0-100, modeled on D&B PAYDEX):**
- Dollar-weighted and recency-biased (large recent invoices count more)
- 80+ = eligible for tier upgrade
- 50-79 = maintain current tier
- Below 50 = automatic downgrade

**Late Payment Response (Graduated):**
- 1-7 days: Grace period (no action)
- 8-15 days: Warning notification
- 16-30 days: Order holds on new orders
- 31-60 days: Automatic tier downgrade
- 60+ days: Account freeze + legal action

**Chronically Late-But-Reliable Payers:** Common in Egypt. Don't penalize — adjust their terms instead (move from Net 30 to Net 45 to match their actual behavior).

**Tier 5 Rehabilitation (Bounced Cheque):** 12-18 months: full debt settlement → 6 months CBD probation → limited credit at 50% prior limit → gradual restoration. Repeat offenders (2+ bounced cheques) = permanent blacklist.

**Credit Insurance:** Skip initially. Coface has Cairo office, Atradius covers from Dubai. Cost 0.3-0.8% of insured turnover. Consider selectively when individual credit limits exceed EGP 5M.

**Universal Rules (ALL tiers):**
1. No shipment without a payment instrument on file (cheques, LC, wire reference)
2. Orders exceeding credit limit → hard hold, credit manager override required
3. Orders exceeding 3x customer's average order size → soft hold for review
4. All orders >$5M equivalent → require LC or bank guarantee regardless of tier
5. Customer with any invoice 60+ days overdue → auto-hold new orders

**Payment Tracking (Parallel to Fulfillment for Tier 2-4):**
- Finance dashboard shows: order total, amount secured (instruments on file), amount received (cash), balance
- Partial payment is normal — order proceeds, marked as "Partial" with follow-up task
- Finance employee follows up on collection via calls/WhatsApp
- Payment status does NOT appear on the operations/dispatch board (they only see confirmed orders)

**Non-Payment Escalation:**

| Time Past Due | Action |
|---|---|
| 7 days | Auto WhatsApp reminder |
| 15 days | Mariam (sales) calls customer |
| 30 days | Finance formal notice |
| 45 days | Credit limit frozen, new orders held |
| 60 days | Formal legal notice (Inzar) from law firm — 50%+ settle here |
| 90 days | Payment Order (Amr Ada') — fast-track judicial order |
| 90+ days | Bounced cheque prosecution (if applicable) OR full court litigation |

**Bad debt benchmark:** ~5% in Middle East steel & metals sector. 55% of invoices paid late. Prevention (requiring instruments upfront) is vastly superior to cure (court enforcement).

### Order Cancellation Policy

- Tiered by fulfillment stage: 0% (pre-PO) → 5% (PO sent, not confirmed) → 15% (supplier confirmed) → 25% (materials in preparation) → 50%+ (materials ready/shipped)
- Non-cancellable items (flagged at quote stage): cut-to-spec rebar, ready-mix concrete, custom windows/doors, pre-cast elements, custom fabrication
- Customer must acknowledge non-cancellable items at order confirmation
- Egyptian law: "deposit" (عربون) is non-refundable by default; "advance payment" (دفعة مقدمة) is refundable minus actual damages
- Recommended structure: 10-15% non-refundable deposit + remaining as refundable advance
- Post-dated cheques: must be physically returned if order cancelled (stopping payment is criminal)
- Refund timeline: 30-45 days via wire transfer

### Change Order Process

- Quantity increases: priced at CURRENT market price (not original quote price)
- Quantity decreases: cancellation fee on reduced portion
- All changes create a Change Order record linked to original order (not a new order)
- Change orders require re-approval if they affect margin below floor

### EDI Integration — Dropped from Launch

EDI (X12) is a US/European big-box retail requirement (Home Depot, Lowe's). HyperQuote's suppliers are regional Egyptian/Middle Eastern manufacturers and wholesalers who work via portal, WhatsApp, email, and phone. The Supplier Portal replaces EDI entirely.

**Add EDI only if** HyperQuote ever needs to trade with US/European retailers who mandate it. Saves $6-15K/year.

### Marketing

**Priority channels:**
1. Google Business Profile (non-negotiable)
2. SEO-optimized website (local SEO, product pages with price ranges)
3. LinkedIn (company + executive profiles)
4. Industry directories (ThomasNet, BuildingConnected)
5. Google Ads (high-intent keywords, $2-5K/month)

**Brand building:** Reliability of delivery is #1 concern for contractors. Showcase: on-time delivery rate, fleet/warehouse photos, case studies, certifications, manufacturer partnerships.

**Referral program:** Account credit ($250-1,000) for referring new accounts. Referred customers have 15-25% higher LTV.

### Authentication — Dual Pool Model (Research-Validated)

**Two separate auth pools, one Supabase project:**

| Pool | Self-Signup? | Who | Apps They Access |
|------|-------------|-----|-----------------|
| **EXTERNAL** | Yes | Customers, Suppliers (upgraded customers), External/On-Demand drivers | Website, Portal, Driver App (external only) |
| **INTERNAL** | No (HyperQuote creates manually) | Employees (all roles), Internal drivers, CEO/executives | Internal Platform, CEO App, Driver App (internal only) |

**Cross-pool access is impossible.** A customer account CANNOT access the internal platform even if roles are manipulated. Enforced at 3 layers:
1. **JWT claim:** `pool: "external"` or `pool: "internal"` injected via Supabase Custom Access Token Hook (reads from `app_metadata.pool` which users cannot modify)
2. **Cookie isolation:** Different cookie names (`hq-external-session` vs `hq-internal-session`) with different `storageKey` in Supabase client
3. **RLS policies:** Same tables, different policies per pool. Internal users get broad access; external users get row-scoped access filtered by their customer_id/supplier_id

**SSO within pools only:**
- External: login on website = logged into portal (shared `.hyperquote.net` cookie for external pool)
- Internal: login on internal platform = logged into CEO app (shared cookie for internal pool)
- Cross-pool: NEVER. Customer cookie does not work on internal platform.

**MFA:** Internal users require TOTP (enforced via AAL2 in middleware + RLS). External users: MFA optional.

**Employee who wants to be a customer:** Creates a SEPARATE account in the external pool with personal phone number. Two accounts, two pools, completely isolated. Industry standard pattern.

**External driver activation:** Self-signup sets `pool: external, driver_status: pending, verified: false`. Driver sees nothing until operations team manually activates them. RLS checks both pool AND driver_status = active.

**Multi-tenant:** Shared database with `tenant_id` column, RLS enforces isolation, automatic `tenant_id` injection via triggers.

**JWT verification in Workers:** `jose` library against Supabase JWKS endpoint, optional KV-based JWKS caching.

**Compliance:** `supa_audit` extension for change tracking, `pg_cron` for data retention (2yr detailed, 7yr summary), GDPR erasure function.

### Invoice and Payment Closing (Egyptian Compliance — Research-Validated)

**Invoice Generation:** One invoice per delivery (not per order). ETA e-invoicing requires same-day reporting — invoice must be issued on delivery date. Each invoice gets its own ETA UUID. Multiple invoices reference the same sales order number.

**Zero-Value Line Items:** NEVER submit EGP 0 items to ETA. For free replacements (damaged goods): issue credit note against original invoice + new invoice for replacement at original price. Net = zero to customer, but both are ETA-compliant documents.

**Credit Notes:** Separate ETA document with own UUID. Must reference original invoice UUID. Cannot exceed original invoice amounts. Reduces output VAT in the period issued (not the period of original invoice). Penalties for non-compliance: EGP 20,000 - 100,000.

**Post-Dated Cheques (Paper-Based):**
- Egypt has NOT implemented electronic cheque clearing as of 2026
- No mobile deposit — physical paper to bank branch
- System tracks per cheque: number, bank, amount, maturity date, status (Received → Deposited → Cleared / Bounced)
- Bounced cheque = criminal offense (Articles 534-536 Penal Code)
- Banks offer cheque discounting: advance ~85-90% of face value immediately (common working capital tool)

**Withholding Tax:**
- Rate: **1% on payments to suppliers for goods (building materials)**
- 3% for services, 5% for professional services
- Auto-calculated on every supplier payment
- Filed quarterly via Form 41 (electronic, mandatory) with payment to ETA
- Withholding certificate generated through ETA portal → sent to supplier
- Penalties: EGP 3,000 - 50,000 for late filing; up to 12.5% of unpaid amount for late payment

**Three-Way Match (AP):**
- PO vs Goods Receipt vs Supplier Invoice
- Tolerances: 1-3% price variance auto-approved, >3% → procurement review
- Quantity: exact match expected; 5-10% tolerance for bulk materials only
- Implementing proper three-way matching is a differentiator vs Egyptian competition (most still do informal two-way)

**Cash Flow Management:**
- Cash Conversion Cycle: 45-90 days (pay suppliers Net 30, collect from customers 60-120 days via PDCs)
- Working capital requirement: 10-18% of annual revenue
- Primary tool: bank credit lines secured by post-dated cheques (cheque discounting)
- Cash flow forecast dashboard: projected cash position over 90 days based on PDC maturity dates + supplier payment obligations

**Revenue Recognition:**
- EAS 48 (Egyptian equivalent of IFRS 15) — revenue recognized at point of delivery (when customer receives and accepts goods)
- Not at invoice date, not at payment date
- Drop-ship: HyperQuote is the principal (controls goods, sets price, bears risk) — recognizes full selling price as revenue, not just margin
- Invoice should be same day as delivery (ETA compliance + accounting alignment)

**Order Auto-Completion:**
- System auto-checks: all delivered + all invoiced + all payments cleared + all claims resolved
- When all conditions met → status: COMPLETED
- Manual close-out available for authorized users (write-offs, force-close)
- Re-opening allowed if late claim surfaces

**Customer Feedback:**
- Triggered after order reaches COMPLETED status
- 3 questions max via WhatsApp: NPS + CSAT + open text
- Results stored on customer account record
- Negative scores alert account manager for outreach
- Aggregate data feeds operational dashboards

---

## 9. Stack Decisions Summary

### Confirmed Choices

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Database + Auth | Supabase (PostgreSQL) + @supabase/ssr | RLS, Realtime, pgvector, Edge Functions, Auth — all-in-one. SSO via cookie domain |
| Edge/CDN | Cloudflare Workers + R2 + KV + Queues + Hyperdrive | 5 Workers (one per app), zero egress, connection pooling, AI Gateway |
| Framework | TanStack Start v1 | Type-safe, Cloudflare Workers native, SSG+SSR+SPA modes |
| UI | React Aria Components + Tailwind CSS v4 | Accessibility-first, best-in-class RTL/Arabic support |
| Driver App | Vite + React SPA + Capacitor | Server functions don't work in WebViews; shares packages with other apps |
| Monorepo | Bun workspaces + Turborepo | workspace:* protocol, task caching, 6 shared packages |
| Offline sync | PowerSync (Capacitor SDK) | WAL-based, built-in queue, Supabase partner |
| Maps | MapLibre GL + react-map-gl + MapTiler | Open source, PMTiles for offline, Arabic labels |
| Background GPS | @transistorsoft/capacitor-background-geolocation | $399 license, geofencing, background tracking |
| Route optimization | OR-Tools or GraphHopper | Multi-constraint VRP for heavy materials |
| AI | 4-tier: GLM (free/CF Workers AI) + Groq (fast) + Mistral OCR (catalogs) + Claude (complex) via AI Gateway | Best-in-class at every layer. $61/mo vs $100-240 all-Claude |
| State | Zustand 5 + XState Store 3 | UI state + state machines |
| Forms | React Hook Form 7 + Zod 3 | useWatch() not watch() (React 19 issue) |
| i18n | react-i18next 17 + React Aria I18nProvider | Arabic-Indic numerals, Islamic calendar, 38 locales |
| Email | Resend + React Email | React templates, simple API |
| SMS + WhatsApp | Twilio (SMS only) + WhatsApp Cloud API (Meta direct) | Meta direct for WhatsApp (no Twilio markup), Twilio for SMS only |
| Payments | None (offline only) | Wire/check/LC tracked internally — no payment gateway |
| EDI | Deferred (Supplier Portal replaces for regional suppliers) | Add only if US/European big-box retail trading required |
| HR | Built in-house + external payroll | Driver compliance integrated with dispatch. Egyptian labor law compliant |
| PDF | pdf-lib | Pure JS, works in Edge Functions, zero deps |
| CI/CD | GitHub Actions + Turborepo | Task caching, wrangler deploy per app |
| Testing | Vitest 4 (browser) + Playwright 1.58 + Storybook 10 | Real browser ARIA testing |

### Risk Register

See Section 2.2 for the comprehensive risk table with 10 identified risks and mitigations. Key highlights:

| Risk | Severity | Mitigation |
|------|----------|------------|
| @supabase/ssr on Workers (stream polyfill) | High | Enable nodejs_compat flag. Test in Phase 1 |
| React Hook Form watch() + React 19 Compiler | High | Use useWatch() everywhere, never watch() |
| TanStack AI / Hotkeys / CF AI are 0.x | High | Wrap behind thin abstractions. Swap if APIs break |
| Cloudflare 128MB memory limit | Low | Stream data, paginate, use R2 for files |
| EDI compliance complexity | N/A | Dropped from launch — Supplier Portal replaces for regional suppliers |

---

## 10. Detailed Research Files Index

All detailed research documents in the project:

| File | Topics |
|------|--------|
| `RESEARCH-Order-Quote-State-Machine.md` | 77 states across 9 entities, transitions, automations, edge cases, ERP comparison |
| `RESEARCH-Roles-Departments-Responsibilities.md` | 25+ roles, daily workflows, app mapping, team sizing, communication flows |
| `RESEARCH-Warehouse-Inventory-Management.md` | Zero-to-warehouse progression, inventory states, yard management, reorder points |
| `RESEARCH-Internal-App-Communication-Architecture.md` | Unified platform, notifications, activity feeds, approval chains, admin panel |
| `RESEARCH-Optimal-Internal-Workflow.md` | Step-by-step RFQ to payment, bottlenecks, 15 automations, KPI benchmarks |
| `RESEARCH-Dispatch-Delivery-Workflow.md` | Fleet costs, driver workflow, loading/unloading, delivery scheduling, exceptions |
| `RESEARCH-Customer-Supplier-Support-System.md` | Ticket taxonomy, WhatsApp architecture, AI triage, returns/claims, build vs buy |
| `RESEARCH-Offline-Payment-Management-B2B.md` | Wire/check/LC, retainage, progress billing, lien rights, bank reconciliation |
| `RESEARCH-Internal-Operations-Org-Structure.md` | Org charts, order lifecycle, minimum viable team, scaling triggers |
| `RESEARCH-Internal-Application-Design.md` | Dashboard layouts per role, quote builder UX, supplier sourcing UI, CRM |
| `RESEARCH-auth-security-patterns.md` | Multi-role auth, RLS, JWT, API security, multi-tenant, compliance |
| `RESEARCH-Driver-Delivery-Apps.md` | GPS, offline-first, POD, route optimization, building materials challenges |
| `RESEARCH-Sales-Order-Validation-Confirmation.md` | Sales app flow, quote validation, UCC 2-305 compliance, order locking, change order process |
| `RESEARCH-Multi-Warehouse-Order-Fulfillment.md` | Multi-base fulfillment, inventory reservation (soft hold/hard commit), split orders, driver assignment |
| `RESEARCH-Full-Accounting-System.md` | AR/AP sub-ledgers, three-way matching, QuickBooks Online integration, Avalara tax, bank feeds |
| `RESEARCH-Complete-Driver-Operations-Model.md` | 4,500-line blueprint: recruitment, vehicles, daily workflow, dispatch, loading, delivery, pay, compliance, maintenance |
| `RESEARCH-Driver-Onboarding-Compliance-Legal.md` | Driver licensing by vehicle type, Egyptian compliance (replaces US FMCSA), drug testing, cargo securement (internal policy), Moffett cert, regional regs |
| `RESEARCH-Complete-Warehouse-App.md` | 23 screens, inventory states, stock costing, barcode system, yard management, building materials specific |
| `RESEARCH-Complete-Sales-App.md` | 21 screens, quote builder, negotiation, customer 360, pipeline, CRM, commission, competitive analysis |
| `RESEARCH-Business-Logic-Gaps.md` | Pricing engine, tax, credit, RBAC, notifications, audit, multi-currency, lien rights, disaster recovery, scaling |
| `RESEARCH-Market-Availability-Inventory-Model.md` | Virtual inventory, supplier stock aggregation, soft reservations, freshness management, stale data mitigation, transition to own stock |
| `RESEARCH-Egyptian-VAT-Tax-Requirements.md` | VAT 14%, ETA e-invoicing, withholding tax, registration |
| `RESEARCH-Delivery-Cost-Pricing-Models.md` | Zone-based pricing, free thresholds, drop-ship freight, surcharges |
| `RESEARCH-Supplier-Price-Lock-Validity.md` | Tiered validity, escalation clauses, hedging, who absorbs loss |
| `RESEARCH-Egyptian-Quote-Document-Requirements.md` | Required fields, proforma vs quote, payment terms, Arabic, PDF format |
| `RESEARCH-Egyptian-Payment-Fulfillment-Model.md` | Post-dated cheques, criminal liability, 5-tier customer model, payment-fulfillment parallel tracking, bad debt rates, legal recourse in Egypt |
| `RESEARCH-Invoice-Payment-Closing-Egypt.md` | One invoice per delivery, zero-value ETA rules, credit note compliance, cheque clearing, withholding tax, three-way match, cash flow CCC, revenue recognition EAS 48, order auto-completion |

Plus 26 additional research agent outputs covering: Supabase, Cloudflare, Bun, Hono, AI integration, mobile frameworks, white-label, customer portals, supplier portals, CEO dashboards, marketing, notifications, PDF generation, offline sync, CI/CD, EDI, GPS/mapping, quote-based pricing, B2B payments, customer journey validation, mobile app adoption, quote request UX, supplier stock publishing, and AI document parsing. 8 agents added (74→82): Egyptian driver compliance/legal, hybrid inventory model, customer tier progression/credit management, order cancellation/change policies, driver perspective walkthrough, CEO perspective walkthrough, repeat/support/new-supplier walkthrough, and payment/fulfillment model validation. 3 new agents added (82→85): dual auth pool model, Egyptian operational realities, and final gap closure. 1 new agent added (85→86): UI Vision alignment pass, US-centric residue cleanup, and final partial item completion. 1 new agent added (86→87): guest orders without account, phone customer account claiming flow, two-table decoupled pattern.

**Stack Validation + Architecture Round:**

| File | Topics |
|------|--------|
| `RESEARCH-Capacitor-Driver-App.md` | Capacitor native, background GPS, PowerSync Capacitor SDK, offline-first |
| `RESEARCH-Multi-App-Architecture-Connecting-5-Apps.md` | 5-app monorepo architecture, SSO, shared packages, deployment strategy |
| `RESEARCH-External-Integration-Map.md` | External services, cost analysis, integration tiers, launch vs growth services |
| `RESEARCH-Complete-Supabase-Database-Design.md` | 53 tables, 27 enums, 15 domains, RLS for 25+ roles, Edge Functions |
| `RESEARCH-Complete-Caching-Architecture.md` | 7 cache layers, invalidation patterns, TTL strategy, per-data-type stale times |
| `RESEARCH-AI-Inference-Providers-GLM-vs-Groq.md` | 4-tier AI architecture, GLM-4.7-Flash routing, Groq Qwen3 32B, cost comparison |
| `RESEARCH-Mistral-OCR-Catalog-Parsing.md` | Mistral OCR for supplier catalogs, table extraction, 30-90x cheaper than Claude vision |
| `RESEARCH-HR-Module-Design.md` | HR module design, Egyptian Labor Law (No. 14 of 2025), driver compliance integration, leave types, social insurance |
| `RESEARCH-Customer-Communication-Single-Touchpoint.md` | Two-touchpoint maximum model, internal parallel processing, escalation SLAs, construction buyer preferences, validated by Gartner/Forrester/HBR research |
| `RESEARCH-Live-Quoting-Instant-Pricing.md` | CPQ patterns, three pricing tiers, win rate data (78% buy from first responder), margin guardrails, partial quotes, supplier price feed management |
| `RESEARCH-Damaged-Delivery-Handling-Process.md` | Egyptian Commercial Code articles, 3-tier inspection, 6 resolution options, supplier/carrier/insurance claims, material-specific damage guides, SLA targets, data model |
| `RESEARCH-Drop-Ship-Brand-Presence.md` | Blind shipping, branded delivery notes, disintermediation protection, Egyptian trading company norms, non-circumvention clauses, value proposition |
| `RESEARCH-Egyptian-Driver-Compliance-Legal.md` | Egyptian driver licensing (Third/Second/First Degree), Labor Law 14/2025 working hours, drug testing Decision 1741/2025, GPS tracking Data Protection Law 151/2020, E-Signature Law 15/2004, Cairo truck ban |
| `RESEARCH-Hybrid-Inventory-Model.md` | Own stock + supplier stock, four fulfillment modes, two PO types, WAC costing, LIFO prohibition, ABC classification, reorder points with 1.5x Egyptian reliability factor |
| `RESEARCH-Customer-Tier-Progression-Credit-Management.md` | Composite score triggers, PAYDEX-modeled payment behavior score, graduated late payment response, Tier 5 rehabilitation, credit insurance (Coface/Atradius) |
| `RESEARCH-Order-Cancellation-Change-Policies.md` | Tiered cancellation fees by fulfillment stage, non-cancellable items, Egyptian deposit vs advance payment law, change order process, post-dated cheque return obligations |
| `WALKTHROUGH-Driver-Perspective.md` | End-to-end driver daily flow walkthrough, Egyptian compliance, Cairo truck ban scheduling, POD capture, shift lifecycle |
| `WALKTHROUGH-CEO-Perspective.md` | CEO daily workflow walkthrough, KPI review, AI analytics queries, alert handling, decision-making flow |
| `WALKTHROUGH-Repeat-Support-NewSupplier.md` | Repeat customer reorder flow, support escalation walkthrough, new supplier onboarding validation |
| `RESEARCH-Egyptian-Operational-Realities.md` | Prayer times, work week, Ramadan mode, public holidays, Khamsin dust storms, summer heat, OTP delivery, accident procedures, Hijri calendar, currency formatting |
| `RESEARCH-Final-30-Gaps.md` | CEO app operational details, supplier operations, driver operations, support details, PWA deep links, channel conflict |
| `RESEARCH-Dual-Auth-Pool-Model.md` | External vs internal auth pools, JWT claims, cookie isolation, RLS per pool, MFA enforcement, external driver activation, cross-pool impossibility |
| `RESEARCH-Guest-Orders-Account-Claiming.md` | Two-table pattern, account claiming flow, security, Supabase implementation |

---

*This research document synthesizes findings from 87 parallel research agents + Context7 documentation + customer and internal flow validation + stack validation. Total research covers: business model, customer journey, supplier journey, internal operations, 77-state order lifecycle, 25+ employee roles, warehouse app (23 screens), sales app (21 screens), HR module (Egyptian Labor Law No. 14 of 2025, driver compliance integration), CEO app universal search architecture (search_index + materialized views + search-to-AI transition), CEO app operational details (onboarding, approvals via AI, data freshness indicators, board reporting, offline/IndexedDB, multi-device, settings), 4-tier AI architecture (GLM free tier + Groq fast tier + Mistral OCR + Claude premium — $61/mo vs $100-240 all-Claude), market availability system (virtual inventory, supplier stock aggregation, soft reservations, freshness management), hybrid inventory model (own stock + supplier stock, four fulfillment modes, two PO types, WAC costing, LIFO prohibition in Egypt, ABC classification, reorder points with 1.5x Egyptian reliability factor), single-touchpoint customer communication model (two-contact maximum, internal parallel processing, escalation SLAs), live quoting model (three pricing tiers, CPQ patterns, margin guardrails, partial quotes, supplier price feed management), dual auth pool model (external vs internal pools, JWT pool claim, cookie isolation, RLS per pool, MFA enforcement AAL2, external driver activation, cross-pool impossibility), Egyptian operational realities (prayer times with Jumu'ah blackout, Sunday-Thursday work week, Ramadan mode with 6h/day, 14-15 public holidays with moon-sighting variability, Khamsin dust storms blocking sheet material deliveries, summer heat driver safety, WhatsApp OTP as primary with SMS/voice fallback, accident procedures with Mahdar, Hijri calendar optional, currency formatting per locale), supplier operations (supplier_agreements table, stock API, regional pricing, product matching via pg_trgm+pgvector, non-technical onboarding 3 tiers, bulk operations, channel conflict via PO anonymization), driver operations (paper backup delivery notes, WhatsApp POD fallback, device failure escalation, pre-shift device health check, biometric auth fallback chain), support details (invoice dispute workflow, NPS/feedback via WhatsApp, PWA deep links), Egyptian market requirements (VAT 14%, ETA e-invoicing, withholding tax 1% for goods / 5% for services, bilingual Arabic/English, quote document format, payment terms), Egyptian driver compliance (replaces US FMCSA — professional license system, Labor Law 14/2025 working hours, drug testing Decision 1741/2025, GPS tracking Data Protection Law 151/2020, E-Signature Law 15/2004, Cairo Ring Road heavy truck ban 6AM-midnight), Egyptian payment culture and post-dated cheque model (5-tier customer model with composite score progression, PAYDEX-modeled payment behavior score, payment-fulfillment parallel tracking, criminal liability for bounced cheques, Tier 5 rehabilitation path, non-payment escalation, bad debt benchmarks, credit insurance via Coface/Atradius), payment methods (bank wire/cheque/cash/LC ONLY — no mobile wallets, no Vodafone Cash, no InstaPay), delivery cost pricing models (zone-based, free thresholds, drop-ship freight, surcharges), supplier price lock strategy (tiered validity, margin buffers, escalation handling), Egyptian quote document requirements (required fields, proforma vs quote, counter-offer support, PDF format), order cancellation policy (tiered by fulfillment stage, non-cancellable items, Egyptian deposit vs advance payment law, post-dated cheque return), change order process (current market pricing, re-approval triggers), damaged delivery handling (Egyptian Commercial Code Articles 94/101, 3-tier inspection, 6 resolution options, supplier/carrier/insurance claims, material-specific damage guides, SLA targets), drop-ship brand presence model (branded delivery notes, dual-confirmation POD system, disintermediation protection, non-circumvention clauses, Egyptian trading company norms), supplier flow resolved gaps (coded delivery addresses, ETA e-invoicing as hard onboarding requirement, 3 supplier roles, 3-status application model, stock discrepancy handling, relative-only analytics, branded delivery note enforcement), operational gap fixes (proforma invoices, EGS/GPC codes, digital company stamp, post-dated cheque tracking, payment receipts, supplier PO rejection handling, COD collection in drop-ship, credit notes to ETA, withholding tax certificates), invoice and payment closing (one invoice per delivery, zero-value ETA rules, credit note compliance, paper-based cheque clearing, withholding tax Form 41, three-way AP matching, cash conversion cycle 45-90 days, revenue recognition EAS 48, order auto-completion, customer feedback), Cairo truck ban (heavy vehicles 5+ tons banned from Ring Road 6AM-midnight, dispatch module enforcement), business logic gap analysis, dispatch/delivery, support system, payments, accounting, multi-warehouse fulfillment, and full technology stack validated against TanStack Start + Cloudflare Workers + React Aria Components + Capacitor architecture. UI Vision alignment applied across all 5 product surfaces (spatial glass design, three colors only, keyboard-first, AI-centered portal, no traditional dashboards — per UI-VISION.md, non-negotiable). Dual auth pool model (external vs internal, JWT claims, cookie isolation, RLS per pool). Egyptian operational context fully integrated (prayer times with Jumu'ah blackout, Ramadan mode, Khamsin dust storms, Cairo truck ban, Sunday-Thursday work week). US-centric residue flagged (mechanic's liens, AIA G702/G703, ZATCA — noted as US/Saudi-specific, not applicable to Egyptian launch). All 87 agents. EDI dropped from launch (Supplier Portal replaces for regional Egyptian/Middle Eastern suppliers). Gross margin benchmark: 13.27%. Last updated: 2026-03-29.*
