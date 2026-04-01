# Phase 23: CEO Command Center

## Goal
CEO has a search-bar-only interface with dual AI (analytics + RAG), attention items, and approval flows -- the most minimal app in the suite.

## Dependencies
- Phase 3 (Shared Packages) must be complete
- Phase 14 (Database tables) must be complete — ceo_attention_items materialized view, ceo_digests, ai_conversations, search_index
- Phase 2 (Auth) must be complete — CEO role in auth system

## Requirements

- **CEO-01**: Home: search bar + lion watermark at 3-5% opacity. Zero accent colors. Nothing else.
- **CEO-02**: Search: cross-entity results grouped by type (employees, customers, orders, products, invoices, suppliers, deliveries)
- **CEO-03**: AI chat: dual route -- Analytics AI (pre-computed metrics + text-to-SQL fallback) + RAG AI (pgvector embeddings + hybrid search)
- **CEO-04**: Attention items: from `ceo_attention_items` materialized view (bounced cheques, overdue 60+ days, delivery failures, PO rejections)
- **CEO-05**: Daily digest (7AM WhatsApp+email) + weekly insight (Sunday WhatsApp+email+PDF)
- **CEO-06**: Approval flow: margin overrides, credit limits, write-offs -- surfaced through AI ("What needs my approval?")
- **CEO-07**: Detail views: 7 entity types with deep-link to internal app
- **CEO-08**: PWA + offline mode (read-only)

## Success Criteria
1. Home screen shows only a search bar and lion watermark at 3-5% opacity -- zero accent colors, nothing else
2. Search returns cross-entity results grouped by type (employees, customers, orders, products, invoices, suppliers, deliveries)
3. AI chat routes between Analytics AI (pre-computed metrics + text-to-SQL) and RAG AI (pgvector embeddings) based on query type
4. Attention items surface bounced cheques, overdue 60+ days, delivery failures, and PO rejections from materialized view
5. PWA installs and works offline in read-only mode

## What to Build
Login (biometric -> PIN -> OTP), home (search bar + lion), search (cross-entity grouped), detail views (7 types), AI chat (dual route), attention items, daily digest, weekly insight, approval flow, compose/route, board report PDF, offline mode, PWA manifest, settings.

## Spec References

### FRONTEND.md — APP 4: CEO COMMAND CENTER (All 15 Screens)

#### Architecture

- **Framework:** TanStack Start SPA/PWA
- **Deploy:** Cloudflare Workers
- **Auth:** Supabase `@supabase/ssr` with `.hyperquote.net` SSO cookie
- **State:** Zustand (UI) + TanStack Query (server) + TanStack Router search params (URL)
- **AI:** `@tanstack/ai-react` `useChat()` for streaming
- **Offline:** Service Worker for app shell + IndexedDB for structured data cache
- **PWA install prompt:** In settings only. Never auto-prompt.

#### UI Vision (Non-Negotiable)

- Wide empty space + centered search bar + lion watermark at 3-5% opacity
- **Nothing else.** No cards, no metrics, no sidebar, no navigation bar.
- **Zero accent colors.** No blue for interactive elements. Only semantic status colors.
- Emphasis through typography weight and contrast only.
- Three colors: white, black, gray spectrum.
- Glass panels for overlays (settings, compose, approval detail).
- Motion: spring entering, tween exiting. Zero decorative animation.
- Mobile-first.

#### Typography Rules

| Font | Usage |
|------|-------|
| Inter 600 | Section headers, greeting, entity names |
| Inter 500 | Category headers, action buttons, row primary text |
| Inter 400 | Body text, descriptions, AI response text |
| Geist Mono 500 | All monetary values, percentages, counts, KPI numbers |
| Geist Mono 400 | Timestamps, dates, IDs, secondary numeric data |
| IBM Plex Sans Arabic | All Arabic text (100-700 only) |

Base: 14px. Arabic-Indic numerals in Arabic context. Currency via `Intl.NumberFormat`.

#### Screen 1: Login

- Biometric (primary) -> PIN fallback (6-digit) -> OTP fallback (WhatsApp/SMS/voice)
- 12-hour JWT expiry. Biometric re-auth on every app open (configurable).
- On success: panel fades out, "Good morning, Karim" appears 1.5s, home renders.

#### Screen 2: Home (Empty Space + Search Bar + Lion)

- Full viewport. Pure white/black.
- Lion watermark centered, 3-5% opacity.
- Greeting: "Good morning, Karim" / "صباح الخير، كريم" based on time.
- Search bar: centered, 90% width mobile, max-width 600px desktop. 48px height. Rotating placeholder hints.
- Attention items (conditional): "{count} items need attention" with count in Geist Mono, semantic error color. Tappable.
- Digest/insight indicators (conditional): tappable links.
- Attention source: `ceo_attention_items` materialized view (5-min refresh).

#### Screen 3: Search Results

- URL: `?q={query}` (Zod-validated search params)
- Search bar slides up on type. Lion fades. Results stream below.
- Debounce 150ms. Target <100ms via Hyperdrive.
- Backend: `search_index` table with `pg_trgm` + `tsvector` + GIN indexes.
- Results grouped by entity type: Employees, Customers, Orders, Invoices, Suppliers, Deliveries, Products.
- Top 3 per category with "View all" link.
- Groups ordered by relevance score, not fixed order.
- Exact match shortcut: single result with score >0.95 -> navigate directly to detail.
- Keyboard: Arrow keys (Up/Down) move between individual result rows across all groups. Tab jumps between category group headers. Enter on a result row opens the detail view. Enter on a group header expands/collapses that group.
- Enter/Send -> transitions to AI chat with query.
- Escape -> back to home.

#### Screen 4: Individual Result Detail

7 entity types with shared layout pattern:
- Back arrow, entity name (Inter 600), subtitle, data sections, action buttons, deep link to internal app.

**Employee Detail:** Contact, quick stats (active quotes, pipeline value, win rate, avg margin), recent activity, deep link to HR.

**Customer Detail:** Contact, financial snapshot (credit limit, utilization bar, total AR, overdue), order history, recent orders, alerts (bounced cheques), route buttons.

**Order Detail:** Items, financial (value, margin, invoice, payment status), delivery info, timeline, route buttons.

**Invoice Detail:** Amount, VAT, total, payment status, ETA submission, deep link.

**Supplier Detail:** Contact, performance (PO value, on-time, quality issues), terms.

**Delivery Detail:** Status, driver, vehicle, timeline, items delivered, POD info.

**Product Detail:** Pricing (internal), movement (units sold, revenue, top customers), availability.

#### Screen 5: AI Chat

- Dual AI routing (invisible to user):
  1. **Analytics AI:** GLM classifies intent -> pre-computed metrics from materialized views -> Groq for NL response. Falls back to text-to-SQL.
  2. **RAG AI:** GLM classifies as document_search -> pgvector hybrid search -> Claude Sonnet synthesizes with citations.
- Response formatting: plain text (Inter 400), data tables (Geist Mono), bar charts (SVG, black/gray, zero accent colors), citations.
- Source line on every response with [Report issue] link.
- Tappable entities in responses -> navigate to detail.
- Export: [Export as PDF] [Copy to clipboard].
- Conversations stored in `ai_conversations` table.
- Chat messages: user messages right-aligned in LTR (left in RTL), AI messages left-aligned in LTR (right in RTL).
- **RTL/Arabic:** User messages align to end (left in RTL). AI messages align to start (right in RTL). AI responds in the language the user writes in -- Arabic queries get Arabic responses, English queries get English responses.

#### Screen 6: Attention Items List

- Semantic status badge per item. Entity name + description + monetary value.
- Tap -> entity detail.
- Examples: bounced cheque, AR overdue 94 days, margin below floor.

#### Screen 7: Daily Digest

- Date header, sections: Revenue, Pipeline, Cash, AR aging, Delivery performance, Supplier updates, HR.
- Data from `ceo_digests` table, generated 6AM by pg_cron.
- Read-only. Optional email delivery.

#### Screen 8: Weekly Insight

- Generated by Claude using full week's data + trends + business context.
- Performance summary, key observations (1-4), recommended actions with [Route] buttons.
- Generated Sunday 8PM.

#### Screen 9: Push Alert Detail

- 3 tiers: Immediate (push), Daily digest (in-app + email), Weekly insight (in-app + email).
- Push format: entity + description + amount.
- Quiet hours: 11PM-6AM (immediate overrides).

#### Screen 10: Settings

- Access via search ("settings") or AI. No visible settings icon. The search result for "settings" appears in a special "System" category (not one of the 7 entity types).
- Glass panel slides in.
- Sections: Notifications (per-event config, thresholds), Language (AR/EN, Gregorian/Hijri), Appearance (theme, biometric lock), Alert Thresholds, Board Reports (recurring config), Account (MFA, sessions, PWA install).

#### Screen 11: Approval Flow

- Access via push notification, AI, or attention items.
- Supported: credit limit changes, large discounts, write-offs, new supplier onboarding, expense approvals.
- Supporting data displayed with warning indicators for conflicting signals.
- [Approve] [Reject] [Request more info].
- Rejection: AI pre-fills suggested reason. CEO edits.
- Offline: approve/reject buttons HIDDEN (not disabled).

#### Screen 12: Compose / Route Overlay

- Elevated glass panel. Route to department with auto-filled recipient.
- Message, priority (Normal/Urgent). Creates notification in internal app.

#### Screen 13: Board Report Export

- On-demand PDF via pdf-lib. Recurring via pg_cron + Resend.
- Bilingual. Shared via native share sheet.

#### Screen 14: Deep Link Behavior

- Links to `app.hyperquote.net/{module}/{entity}/{id}`. SSO cookie.
- PWA: opens in system browser. Non-PWA: new tab.

#### Screen 15: Offline Mode

- Service Worker + IndexedDB.
- Works: app shell, home, last digest, last AI conversation, cached results/details.
- Offline cache: digest, insight, attention items (30min stale), recent entities (last 20), recent searches (last 5).
- Does not work: new searches, new AI queries, approvals (buttons hidden).
- **"Last synced" indicator:** Geist Mono 400, text-xs, muted gray. Shown on home screen and on each data section when offline. Yellow at 15 min stale, red at 30 min stale.
- **Driver app sync indicator (DS.14):** green (online) / amber (weak) / red (offline). No banner -- offline is normal for drivers.

#### Screen 4: Entity Detail — Full Specs for All 7 Entity Types

**Shared layout pattern:**
- Back arrow (swipe-right gesture on mobile) returns to search results (state preserved)
- Entity name: Inter 600, text-xl (18px)
- Subtitle: Inter 400, text-base, muted gray (entity-specific)
- Data sections: 24px vertical spacing. Section label in Inter 500, text-sm, uppercase, tracking-wide, muted gray. Values in Geist Mono where numeric.
- Action buttons: text-only, Inter 500, no background, 24px minimum spacing
- Deep link: "View full details in [Module] -->" Inter 400, muted gray

**Employee Detail:**
```
Ahmed Fawzi                                          [Back]
Sales Rep -- Sales Department
Joined: Sep 12, 2024

Contact
  Phone: +20 100 XXX XXXX                            [Call]
  Email: ahmed.fawzi@hyperquote.net                   [Email]

Quick stats
  Active quotes: 8
  Pipeline value: EGP 12,400,000
  Win rate (90d): 34%
  Avg margin: 14.8%

Recent activity
  Mar 28 -- Sent quote QT-1210 to Nile Developers (EGP 2.1M)
  Mar 27 -- Closed order ORD-1201 from Arab Contractors (EGP 890K)
  Mar 26 -- Updated quote QT-1204 margin to 7.2%

[View full profile in HR -->]
```
- [Call] triggers native dialer via `tel:`. [Email] triggers `mailto:`.
- All monetary values in Geist Mono 500. Dates in Geist Mono 400.
- Recent activity: last 5 entries from `entity_timeline` audit log, filtered by employee.

**Customer Detail:**
```
Al-Masriya Construction Co.                          [Back]
Customer since Jun 2023

Contact
  Primary: Eng. Omar Hassan                           [Call]
  Phone: +20 112 XXX XXXX
  Email: omar@almasriya.com.eg                        [Email]
  Account manager: Ahmed Fawzi

Financial snapshot
  Credit limit: EGP 1,200,000
  Credit used: EGP 980,000 (82%)                     [Warning]
  Total AR: EGP 1,230,000
  Overdue: EGP 250,000 (14 days)                     [Error]

Order history (last 6 months)
  Orders: 12
  Total revenue: EGP 8,400,000
  Avg order value: EGP 700,000
  Avg margin: 14.2%

Recent orders
  ORD-1198 -- EGP 890,000 -- Delivered
  ORD-1187 -- EGP 1,200,000 -- Delivered
  ORD-1174 -- EGP 650,000 -- Invoiced

Alerts
  Bounced cheque: EGP 250,000 (Mar 28)               [Error]

[Route to Finance]    [Route to Sales]    [Call Account Manager]

[View full profile in CRM -->]
```
- Credit utilization: progress bar (gray, no color unless >80% = warning, >95% = error)
- Bounced cheque alert uses semantic error color for badge and amount

**Order Detail:**
```
Order ORD-1204                                       [Back]
Al-Masriya Construction Co.
Created: Mar 15, 2026 | Status: Delivered

Items
  50x Cement bags (50kg) -- Portland Type I
  20x Rebar bundles (12mm, 12m)
  40x Plywood sheets (18mm)

Financial
  Order value: EGP 3,200,000
  Margin: 14.8%
  Invoice: INV-3892 -- EGP 3,200,000
  Payment status: Partial -- EGP 1,800,000 received   [Warning]
  Outstanding: EGP 1,400,000 (due Apr 14)

Delivery
  Delivered: Mar 22, 2026
  Driver: Mohammed Ali
  POD: Signed by Eng. Hassan (Foreman)
  Delivery note: DN-3892                              [View PDF]

Timeline
  Mar 15 -- Order created by Ahmed Fawzi
  Mar 16 -- Supplier POs generated (3 suppliers)
  Mar 18 -- All materials confirmed by suppliers
  Mar 20 -- Loaded at warehouse
  Mar 22 -- Delivered, POD captured

[Route to Finance]    [Route to Operations]

[View full details in Orders -->]
```
- Status badges: Delivered=green, In Transit=blue-gray, Pending=gray, Failed=red, Partial=yellow
- [View PDF] opens delivery note in browser's native PDF viewer

**Invoice Detail:**
```
Invoice INV-3892                                     [Back]
Al-Masriya Construction Co.
Issued: Mar 22, 2026 | Due: Apr 21, 2026

Amount: EGP 3,200,000
VAT (14%): EGP 448,000
Total: EGP 3,648,000

Payment status
  Received: EGP 1,800,000 (Mar 25, wire transfer)
  Outstanding: EGP 1,848,000
  Days until due: 23

ETA submission: Submitted Mar 22, reference: ETA-892741

[View invoice PDF]    [Route to Finance]

[View full details in Finance -->]
```

**Supplier Detail:**
```
El-Nasr Steel                                        [Back]
Supplier since: Aug 2024

Contact
  Primary: Eng. Tarek Mahmoud                         [Call]
  Category: Steel & Rebar

Performance (last 12 months)
  Total PO value: EGP 22,000,000
  On-time delivery: 91%
  Quality issues: 2 (resolved)
  Active POs: 3

Terms
  Payment: Net 60
  Early payment discount: 2% / 15 days
  Minimum order: EGP 500,000

[Route to Procurement]

[View full details in Procurement -->]
```

**Delivery Detail:**
```
Delivery DEL-4521                                    [Back]
Order: ORD-1204 | Customer: Al-Masriya Construction

Status: Delivered                                    [Success]
Driver: Mohammed Ali
Vehicle: Truck #HQ-017 (Flatbed + Moffett)

Timeline
  Departed warehouse: 6:30 AM
  Arrived at site: 7:38 AM
  Unloading complete: 8:05 AM
  POD captured: 8:10 AM

Items delivered
  48/50 Cement bags (SHORT 2 -- damaged at warehouse)
  20/20 Rebar bundles

POD
  Signed by: Eng. Hassan Mohamed Ali (Foreman)
  Photos: 3                                           [View]
  Condition: Good (2 bags short noted)

[View delivery note PDF]    [Route to Operations]

[View full details in Logistics -->]
```

**Product Detail:**
```
Portland Cement Type I (50kg bag)                    [Back]
Category: Cement & Concrete
SKU: CEM-PORT-50

Pricing (internal -- not shown to customers)
  Last supplier cost: EGP 85/bag
  Avg selling price: EGP 102/bag
  Avg margin: 20%

Movement (last 30 days)
  Units sold: 2,400
  Revenue: EGP 244,800
  Top customers: Al-Masriya (800), Nile Developers (600)

Availability
  Suppliers: El-Nasr (in stock), Alexandria Cement (in stock)
  Lead time: 2-3 days

[View full details in Products -->]
```

**Offline behavior for all detail views:** If entity data is in TanStack Query cache, display with "Last synced" timestamp. If not cached: "Detail unavailable offline. Return to search." No skeleton loaders for uncached views.

### BACKEND.md — Server Functions (CEO)

| Function | Method | Input | Output | Auth | Side Effects |
|---|---|---|---|---|---|
| `getCEODashboard` | GET | `{}` | `{ kpis, alerts, trends }` | ceo | Reads materialized views |
| `getCEOFinancials` | GET | `{ period, comparison? }` | `{ revenue, costs, margin, cashFlow, chartData }` | ceo | Reads materialized views |
| `getCEOOperations` | GET | `{ period }` | `{ orderVolume, fulfillmentRate, avgCycleTime, bottlenecks }` | ceo | Reads materialized views |
| `getCEOPipeline` | GET | `{}` | `{ totalValue, byStage, winRate, avgDealSize, topDeals }` | ceo | Reads materialized views |
| `getCEOTeamPerformance` | GET | `{ period }` | `{ byDepartment, topPerformers, attendance }` | ceo | Reads materialized views |
| `askCEOAI` | POST | `{ question }` | `{ answer, charts?, drillDowns? }` | ceo | Always Claude, full RAG |
| `searchEntities` | GET | `{ query, entityTypes?, limit }` | `{ results[] }` | ceo | none |
| `getEntityDetail` | GET | `{ entityType, entityId }` | `{ entity }` | ceo | none |
| `getCEOAttentionItems` | GET | `{}` | `{ items[], count }` | ceo | none |
| `getCEODigest` | GET | `{ date }` | `{ digest }` | ceo | none |
| `getCEOWeeklyInsight` | GET | `{ weekOf }` | `{ insight }` | ceo | none |
| `approveAction` | POST | `{ approvalId, decision, notes? }` | `{ success }` | ceo | Resolves approval |
| `rejectAction` | POST | `{ approvalId, reason }` | `{ success }` | ceo | Rejects with reason |
| `routeMessage` | POST | `{ recipientId, message, priority? }` | `{ messageId }` | ceo | Sends internal message |
| `exportBoardReportPDF` | POST | `{ reportType, dateRange }` | `{ pdfUrl }` | ceo | Generates PDF in R2 |
| `requestMoreInfo` | POST | `{ approvalId, questions }` | `{ success }` | ceo | Sends info request |

## Business Rules

**Data Freshness:**
- Revenue: hourly
- Cash: daily
- AR: daily
- Inventory: 4h
- Deliveries: near-real-time
- Margin: nightly

**Attention Items (from materialized view):**
- Bounced cheques (any amount, 7 days)
- AR overdue above configurable threshold
  - **NOTE: Threshold discrepancy.** BACKEND.md materialized view SQL uses `> 60 days` for overdue invoices. FRONTEND.md says `> 90 days`. Recommend using the BACKEND.md value (60 days) as it catches issues earlier. The SQL also applies a secondary severity: invoices overdue > 90 days are marked `critical`, 60-90 days are `warning`.
- Credit limit breach requests pending CEO approval
- Margin alerts (deals below floor)
- Delivery failures on orders > EGP 1M
- Supplier payment defaults

**Approval Chain (CEO Level):**
- Credit limit increase >50% or >EGP 50M
- Write-offs above threshold
- Margin overrides below emergency floor

**CEO Daily Digest (7AM):**
Yesterday's revenue vs target, new quotes, orders confirmed, deliveries completed/failed, overdue payments, urgent items.

**CEO Weekly Insight (Sunday 8PM):**
Week's performance vs targets, margin trends, top/bottom customers, supplier changes, cash flow forecast, AI observations and recommendations.

## Non-Negotiable Rules

1. **ZERO accent colors.** No blue for interactive elements. Only semantic status colors (green, yellow, red). This is the ONE app that breaks the "blue for interactive" rule.
2. **Emphasis through typography only.** Inter 600 vs Inter 400. Black vs muted gray.
3. **Search bar IS the entire interface.** Nothing else on the home screen except lion + greeting + attention count.
4. **Geist Mono for ALL numbers.**
5. **TanStack Start SPA/PWA.** NOT Next.js.
6. **React Aria Components, NOT shadcn.**
7. **Motion v12.** Import from `motion/react`.
8. **`useWatch()`, NEVER `watch()`.**
9. **Colors in `:root {}`, NEVER in `@theme`.**
10. **ALL numbers -> Arabic-Indic numerals in Arabic context.**
11. **PWA install prompt in settings only. Never auto-prompt.**
12. **Mobile-first.** Phone is primary device.

## Known Risks & Gotchas

- The CEO app has ZERO accent colors — this overrides the normal "blue for interactive" rule from other apps
- Search performance target is <100ms — requires Hyperdrive-cached Supabase + proper indexes
- `pg_trgm` must be configured for Arabic tokenization
- AI dual routing is complex — GLM classifier must correctly distinguish analytics vs document queries
- Service Worker for offline: vite-plugin-pwa is incompatible with TanStack Start — use manual Workbox
- Materialized views refresh on schedule — data staleness is expected and must be communicated to user
- Board report PDF generation happens in a Cloudflare Worker edge function, not client-side

## Tips

- Start with the home screen + search — this is the core of the CEO app
- The search-to-AI transition is the most critical animation — get it right
- Detail views all share the same layout pattern — build a generic DetailView component
- Settings is accessed via search, not a gear icon — maintain the empty space principle
- Offline mode is read-only — hide ALL mutation buttons when offline (don't disable, HIDE)
- The CEO app should feel like the most minimal, premium app in the suite
- Charts in AI responses are simple SVG bar charts — no charting library needed
