# Phase 16: Sales Module

## Goal
Sales reps can process the full quote lifecycle: claim RFQ, build quote with margin guardrails, get approval, send to customer, and negotiate.

## Dependencies
- Phase 15 (Internal Platform Shell) must be complete — glass windows, hotkeys, auth
- Phase 13-14 (Database) must be complete — all business tables, triggers, state machines
- Phase 3 (Shared Packages) must be complete — @hyperquote/tables, @hyperquote/forms, @hyperquote/ui

## Requirements

- **SALE-01**: RFQ inbox — priority-scored (tier 40% + value 30% + age 20% + urgency 10%), aging timer, SLA countdown, claim action
- **SALE-02**: RFQ detail — materials table, customer snapshot (credit, history, AI insights), clarification workflow, decline with reason
- **SALE-03**: Quote builder — 10-step workflow, live pricing from supplier data (fresh/aging/stale indicators), margin guardrails (green/yellow/red/blocked)
- **SALE-04**: Quote approval — margin-based + value-based thresholds, push notification to approver, escalation at 2h
- **SALE-05**: Quote send — portal + email + both, schedule send, soft reservation created, follow-up auto-scheduled
- **SALE-06**: Negotiation — version timeline, side-by-side comparison, what-if calculator, accept counter/revise/mark won/lost
- **SALE-07**: Customer 360 — 9 tabs (Overview, Contacts, Quotes, Orders, Financials, Projects, Communications, Documents, Notes), health score
- **SALE-08**: "Add Customer" button — create unclaimed customer from phone call (3 required fields), no auth credentials
- **SALE-09**: Pipeline/Kanban — 9 stages, click-to-advance (primary) + drag (power users), filter by rep/customer/value/age
- **SALE-10**: Activity feed, calendar, contacts, reports (revenue, margin, pipeline, forecast)

## Success Criteria
1. RFQ inbox sorts by priority score (tier 40% + value 30% + age 20% + urgency 10%) with SLA countdown timers
2. Quote builder completes 10-step workflow with live supplier pricing (fresh/aging/stale) and margin guardrails (green/yellow/red/blocked)
3. Approval flow pushes notification to approver when margin or value thresholds are exceeded, with 2h escalation
4. Customer 360 shows 9 tabs of customer history with health score
5. Pipeline kanban shows 9 stages with click-to-advance and drag-and-drop

## What to Build
- RFQ Inbox: table with priority scoring, aging, SLA countdown, claim action
- RFQ Detail: materials table, customer credit sidebar, AI insights
- Quote Builder: 10-step workflow
- Customer 360: fixed header + tabbed content (9 tabs)
- Pipeline/Kanban: drag between stages with click-to-advance
- Negotiation view: version timeline, side-by-side comparison, what-if calculator
- "Add Customer" button: create unclaimed customer
- All server functions from BACKEND.md Section 6 (Sales group)

## Spec References

### FRONTEND.md MODULE 1: SALES — Complete (10 Sub-sections)

**Hotkey:** `S`
**Primary users:** Account Managers, Inside Sales Reps, Quoting Specialists, Sales Manager

#### 1.1 Sales Home View

Top strip tabs: `[Home] [RFQ Inbox] [Quote Builder] [Pipeline] [Customer 360] [Contacts] [Calendar] [Reports]`

**Urgent Section:** Cards for RFQs awaiting response, Quotes expiring this week, Overdue follow-ups. Red border if critical.

**Pipeline Snapshot:** Horizontal bar with pipeline value, weighted forecast, target progress. Mini funnel with deal count per stage.

**Activity Feed (bottom):**
- Chronological stream: new RFQs, quote views by customer, payment received, delivery confirmed, quote won/lost.
- Each item: icon + description + timestamp + action button (e.g., "Open Quote", "Call Customer").
- **Filter by type: `[All] [RFQs] [Quotes] [Orders] [Payments] [Comms]`**
- **Real-time updates via Supabase Realtime.**

#### 1.2 RFQ Inbox

Email-inbox style. Left: list. Right: preview pane (desktop). Mobile: list only.

**Toolbar:** Tab filters (All, My RFQs, Unassigned, Needs Clarification, Urgent). Sort options. Filter dropdowns. J/K navigation.

**Each RFQ row:**
- Priority indicator: !!! (>75), !! (50-75), ! (25-50), blank (<25)
- Age timer (Geist Mono): green->yellow at 2h, ->orange at 4h, ->red at 8h, pulsing red at 24h
- Customer name + tier badge, estimated value (Geist Mono), line item count, status pill, assigned rep avatar

**Priority Score Formula:**
```
Score = (Tier Weight x 40%) + (Value Weight x 30%) + (Age Weight x 20%) + (Delivery Urgency x 10%)
Tier: A=100, B=60, C=30, New=20
Value: >EGP 5M=100, 1-5M=80, 500K-1M=50, <500K=20
Age: <1h=20, 1-4h=40, 4-8h=60, 8-24h=80, >24h=100
Delivery: <7d=100, 7-14d=70, 14-30d=40, >30d=20
```

**SLA timers:** Tier A: 2h response, 4h escalation. Tier B: 4h/8h. Tier C: 8h/24h. New: 4h/8h.

**Auto-assignment rules (6 steps, must complete within 30 seconds):**
1. Account owner first
2. Territory fallback if owner unavailable
3. Round-robin for unassigned (weighted by workload)
4. Specialization override for specialty materials
5. Value-based escalation: >EGP 25M routes to senior sales + primary rep
6. Capacity throttle: if rep has >X active quotes, next available rep gets assignment

Assignment happens within 30 seconds. Push notification to assigned rep. Implemented as a server function, not a cron.

#### 1.3 RFQ Detail View

**Left column (60%):** Material Request table (name, spec, qty, unit, notes). Delivery requirements (map pin, date, type, instructions). Attached files.

**Right column (40%):** Customer Context — snapshot card, history (order count, lifetime value, avg margin, payment history), credit info, similar past quotes (AI), AI insights (behavioral prediction, recommended margin, win probability).

**Actions bar (bottom):**
- `[Start Quote]` (primary, blue) -- converts RFQ to draft quote
- `[Request Clarification]` -- **structured form with common questions** (material spec ambiguous, quantity unclear, delivery access, no date, mixed units, missing attachment) + free text. **Multi-channel: sends via portal notification + email + WhatsApp.** RFQ moves to "Awaiting Clarification" status. **Auto-follow-up at 48h. Archive at 7d with "No Response."**
- `[Decline RFQ]` -- requires reason selection (outside service area, cannot source, customer blacklisted) + optional note
- `[Assign to...]` -- reassign to another rep
- `[Add Note]` -- internal note (not visible to customer)
- `[Call Customer]` -- opens phone dialer / logs call activity
- `[View Full Customer Profile]` -- opens Customer 360

#### 1.4 Quote Builder (10-Step Workflow)

Single-page editing surface — all visible simultaneously. Auto-save every 30 seconds.

**Step 1: Initialize** — auto-populate from RFQ, credit status check runs in background.

**Step 2: Review and Refine Line Items** — editable table with #, Material, Specification, Quantity, Unit, Supplier Cost, Margin %, Sell Price, Line Total. Add/remove/split/substitute/import from catalog/copy from past quote.

**Step 3: Procurement Cost Lookup (Per Line Item):**
- Fresh price (<24h, green dot): live quote capability
- Aging price (1-3 days, yellow dot + "Verify"): estimate or request refresh
- Stale/missing (>3 days, red dot): "Awaiting Procurement Input"
- Multiple supplier options with recommended highlight

**Step 4: Set Pricing Per Line Item — 4 methods:**
1. Set margin % -> auto-calculate price
2. Set price directly -> auto-calculate margin
3. Blanket margin ("Set all to 18%")
4. Price from history

**Margin Guardrails:**
| Level | Visual | Behavior |
|---|---|---|
| At/above target (18%+) | Green | Auto-approved |
| Between target and floor (12-18%) | Yellow | Warning, can proceed |
| Below floor (<12%) | Red | Manager approval required |
| Below absolute min (<8%) | Red + "CEO Approval Required" | Escalated chain |
| Negative margin | Red + blocks save | System prevents |

**Margin benchmarks by category:**
| Category | Target | Floor | Absolute Min |
|---|---|---|---|
| Cement/Concrete | 18-22% | 14% | 8% |
| Steel/Rebar | 12-18% | 10% | 6% |
| Lumber/Timber | 15-20% | 12% | 8% |
| Roofing | 22-28% | 18% | 12% |
| Specialty/Custom | 30-45% | 25% | 15% |

**Margin Control Panel (right sidebar):** Overall blended margin, target, floor, approval needed, quick adjust buttons, what-if calculator.

**Step 5: Delivery Terms** — calendar, warehouse stock + lead time cross-reference, delivery method (Jobsite Delivery / Customer Pickup / Third-Party Carrier), special instructions, delivery cost (zone-based: Zone 1 0-25km, Zone 2 25-50km, Zone 3 50-100km + weight surcharges + equipment surcharges as separate lines). Free delivery threshold check.

**Cairo Truck Ban enforcement:** If delivery address is in Greater Cairo and order weight >5 tons, system auto-sets delivery window to 12AM-6AM and shows alert: "Heavy materials in Cairo require night delivery (12AM-6AM) per truck ban regulations." **Dispatcher cannot override this for heavy vehicles.**

**Step 6: Payment Terms** — dropdown of customer's approved payment terms (Net 30, Net 45, Net 60, Net 90, Progress payments, Letter of Credit). Credit status displayed alongside (limit, outstanding, available — all Geist Mono). Warning + "Request Credit Limit Increase" button if quote exceeds available credit.
- **New customer default:** "50% advance + 50% COD by certified bank check" — system auto-applies, rep can request override via finance approval.
- **Early payment discount option:** e.g., 2/10 Net 30 (2% discount if paid within 10 days).

**Step 7: Quote Validity Period** — 14 days (stable) or 5-7 days (volatile: steel, cement).

**Step 8: Approval Workflow:**
```
Margin: >= Target: no approval. >= Floor < Target: Sales Manager. < Floor: VP Sales. < Absolute Min: CEO.
Value: < EGP 2.5M: Rep. 2.5-10M: Sales Manager. 10-50M: + Director. > 50M: + CEO.
```
Escalation at 2 hours if not approved.

**Step 9: Preview Before Sending** — PDF preview in elevated glass modal. No cost/margin columns (customer-facing). Toggle: "Show spec details" vs "Summary view". Personalized cover note field.

**Document content includes:**
- **Seller:** company name (Arabic), CR number, TRN, address, logo, **digital company stamp (ختم الشركة)**
- **Buyer:** company name, **TRN**, contact person
- Quote metadata: reference number, date, validity period
- Line items: product name (bilingual), SKU, UOM, quantity, unit price (ex-VAT), line total
- Delivery: separate line, area/governorate, terms (DAP or Franco site)
- Subtotal, VAT 14%, Grand total (VAT-inclusive)
- Payment terms explicit
- **Cover note** field (personalized per customer)
- Price disclaimer: "Prices valid for [X] days. Subject to supplier cost changes for volatile materials."

**Step 10: Send to Customer** — Send via: `[Portal]` (preferred) `[Email (PDF)]` `[Both]`. Recipient selection (primary contact pre-selected, CC additional). Schedule send: "Send at 8 AM tomorrow" option. Upon sending: status -> "Sent", soft reservation created, activity logged, follow-up auto-scheduled (3 days), WhatsApp + email notification.

**Partial quotes:** Customers prefer **80% of the quote immediately** over waiting. Items without pricing show **"Price on Application -- we'll update within [X hours]"**. When remaining prices arrive, quote auto-updates, customer notified via portal + WhatsApp.

#### 1.5 Quote Negotiation View

Version Timeline (horizontal), Side-by-Side Comparison, Negotiation Conversation thread, What-If Calculator (right sidebar). Actions: Revise Quote, Accept Customer Counter, Mark as Won, Mark as Lost (with reason + competitor intelligence).

**Quote-to-Order Conversion:** Creates Sales Order + auto-generates POs to suppliers + delivery schedule + proforma invoice. Customer PO number field (required if customer provided one).

**Phone-confirmed order flow:** For orders confirmed verbally over the phone, **sales rep clicks `[Confirm Order]` directly** (no customer portal accept needed). The phone call IS the acceptance.

#### 1.6 Customer 360 View

**Header:** Company name, tier badge, address, founded date, employee count estimate, account manager name.

**9 Tabs:** `[Overview] [Contacts] [Quotes] [Orders] [Financials] [Projects] [Communications] [Documents] [Notes]`

- **Overview:** Account Health Score (composite 0-100, bar visualization, green >70 / yellow 40-70 / red <40). Key Metrics card (lifetime value, orders 12mo, revenue 12mo, avg margin, avg order size, win rate, open quotes). Credit & AR card. Key Contacts (top 3-5). Recent Activity Timeline.
- **Contacts:** Table (name, role, email, phone, last contact date, comm preference). Expand row for relationship strength, role in deals, org chart visualization.
- **Quotes:** Table with win/loss analysis, filter by status/date.
- **Orders:** Table with order/delivery/payment status, drill-in.
- **Financials:** Credit limit history, AR aging (current/1-30/31-60/61-90/90+), payment history, avg days to pay trend.
- **Projects:** Active construction projects, project stage (planning/foundation/structure/finishing), material requirements per phase, AI cross-sell opportunities.
- **Communications:** All calls, emails, meetings, WhatsApp messages logged. Searchable. Calendar integration.
- **Documents:** All quotes, invoices, delivery notes, BOLs, certificates, contracts. Upload capability.
- **Notes:** Free-form with timestamps and author. Taggable (quote-related, order-related, general).

**Health Score factors:** payment history, order frequency, revenue trend, relationship depth, quote win rate, recent activity.

#### 1.7 "Add Customer" Button

Minimum fields: Phone (required, Egyptian format, duplicate check), Company name (required, fuzzy duplicate check), Contact name (required). Optional: delivery address, project name, notes.

Creates `customers` record with `status: unclaimed`, `auth_user_id: NULL`. No auth credentials. Immediately available for quoting. When customer later claims: system links via phone match. Sales rep auto-assigned as account owner.

**New customer credit awareness:** Yellow indicator on all views: **"New Customer -- No credit established."** Awareness only, does NOT block quoting. Reminds rep that credit application needed before fulfillment if quote converts.

#### 1.8 Pipeline / Kanban View

**View toggles:** `[Kanban Board]` `[List View]` `[Funnel Chart]`
**Scope toggle:** `[My Pipeline]` `[Team Pipeline]` (manager only)

**9 Kanban columns:** RFQ Received -> Reviewing -> Sourcing -> Quoting -> Sent to Customer -> Negotiating -> Closing -> Won -> Lost/Expired.

Each card: customer + tier badge, deal value (Geist Mono), stage-specific status text ("Waiting supplier cost", "Counter received", "Final revision"), days in stage, win probability %, assigned rep avatar, color (green on track / yellow aging / red at risk).

**Click-to-advance is primary** (safer for B2B -- accidental drags costly). Drag-and-drop available for power users. Confirmation modal on critical transitions (Won/Lost).

Filters: rep (avatar row at top), customer (search), value range (<100K, 100-500K, 500K-1M, >1M), age in stage. Active filters as removable pills. Group by: rep, customer, product category. Save filter sets as named views.

**Pipeline summary bar (top):** total pipeline (unweighted), weighted forecast (value x probability per stage), target, gap. All Geist Mono. Collapsible analytics panel: conversion rate per stage, avg time in each stage.

**Pipeline aging alerts (bottom):**
- Quotes sent >7 days with no response
- RFQs >24h without quote started
- Days counter on cards: green (<5d), yellow (5-15d), red (>15d)

#### 1.9 Activity Feed, Calendar, Contacts, Reports

Activity feed (chronological, filterable, real-time). Calendar (week/day/month, color-coded events). Contacts (searchable table, expandable rows). Reports (revenue, margin, pipeline, conversion, forecast with CSV/PDF/email export).

#### 1.10 Sales Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `N` | New RFQ / New Quote |
| `G` then `I` | Go to RFQ Inbox |
| `G` then `P` | Go to Pipeline |
| `G` then `C` | Go to Customer 360 (prompts search) |
| `/` | Focus search within Sales |
| `?` | Show shortcuts help |

### Server Functions (from BACKEND.md)

| Function | Method | Input | Output | Auth |
|---|---|---|---|---|
| `getRFQQueue` | GET | `{ status?, assignedTo?, page, limit }` | `{ rfqs[], total, avgResponseTime }` | sales |
| `getRFQDetail` | GET | `{ rfqId }` | `{ rfq, customer, history, aiSuggestion? }` | sales |
| `createQuote` | POST | `{ rfqId, lines[], validUntil, terms? }` | `{ quoteId }` | sales |
| `getCustomerList` | GET | `{ search?, segment?, page, limit }` | `{ customers[], total }` | sales |
| `getCustomerCreditInfo` | GET | `{ customerId }` | `{ creditLimit, currentExposure, paymentHistory, riskScore }` | sales |
| `addCustomer` | POST | `{ phone, companyName, contactName }` | `{ customerId }` | sales |
| `requestClarification` | POST | `{ rfqId, questions[] }` | `{ success }` | sales |
| `declineRFQ` | POST | `{ rfqId, reason }` | `{ success }` | sales |
| `requestApproval` | POST | `{ quoteId, approverRole }` | `{ approvalId }` | sales |
| `approveQuote` | POST | `{ approvalId, notes? }` | `{ success }` | sales_manager+ |
| `markAsWon` | POST | `{ quoteId }` | `{ orderId }` | sales |
| `markAsLost` | POST | `{ quoteId, lossReason, competitorName? }` | `{ success }` | sales |
| `getSalesPipeline` | GET | `{ filters? }` | `{ stages[] }` | sales |
| `getCustomer360` | GET | `{ customerId }` | `{ customer, contacts, quotes, orders, financials, activity }` | sales |
| `getQuoteBuilderData` | GET | `{ rfqId }` | `{ rfq, customerCredit, suggestedProducts, recentPrices }` | sales |
| `saveQuoteDraft` | PATCH | `{ quoteId, lineItems[], terms }` | `{ success }` | sales |
| `previewQuotePDF` | GET | `{ quoteId }` | `{ pdfUrl }` | sales |
| `reassignRFQ` | POST | `{ rfqId, toUserId }` | `{ success }` | sales_manager |
| `convertQuoteToOrder` | POST | `{ quoteId, poNumber? }` | `{ orderId }` | sales | Full downstream creation |
| `addInternalNote` | POST | `{ entityType, entityId, note }` | `{ noteId }` | internal | Creates note record |
| `getActivityFeed` | GET | `{ filters?, page, limit }` | `{ activities[] }` | internal | none |
| `getSalesAnalytics` | GET | `{ period, groupBy }` | `{ revenue, orderCount, avgOrderValue, topProducts, topCustomers }` | sales_manager | none |

### TanStack Query staleTime

| Data Type | staleTime | Rationale |
|---|---|---|
| RFQ list | 30 sec | Sales need near-real-time |
| Quote list | 1 min | Expiry timers need freshness |
| Customer list | 5 min | Infrequent changes |
| Customer profile | 2 min | Credit may update |

## Non-Negotiable Rules

1. **React Aria Components, NOT shadcn.** Tables, ComboBox, Select, Dialog, Tabs, Menu.
2. **Geist Mono for ALL numbers.** Prices, margins, values, dates, SLA timers, reference numbers.
3. **Three colors only.** Margin guardrails (green/yellow/red) are data-semantic only, not design colors.
4. **Spatial glass, not dashboards.** Sales module lives inside a glass window. No sidebar within the module.
5. **`useWatch()`, NEVER `watch()`.** For React Hook Form in the quote builder.
6. **Motion v12, NOT framer-motion.** Import from `motion/react`.
7. **Arabic-Indic numerals** in Arabic context.
8. **State machine enforcement.** Every status change goes through `validate_state_transition()`.
9. **`isKeyboardDismissDisabled` on Dialogs.** Confirmation modals and the PDF preview modal.

## Known Risks & Gotchas

- **Quote builder is the most complex screen.** Single-page editing surface with 10 steps visible simultaneously — NOT a wizard.
- **Click-to-advance is primary for pipeline** — accidental drag-and-drop in B2B is costly. Drag is secondary for power users.
- **Margin guardrails are configurable in Admin** (pricing_rules table). Don't hardcode thresholds.
- **Auto-assignment** runs within 30 seconds — implemented as a server function, not a cron.
- **Partial quotes:** Customers prefer 80% immediately over waiting for all prices. Items without pricing show "Price on Application."
- **Cairo truck ban enforcement** in delivery terms: >5 tons in Greater Cairo = 12AM-6AM only. Cannot be overridden.
- **SLA timers** must account for Egyptian business hours (Sun-Thu), not 24/7.

## Tips

- Quote builder auto-save every 30 seconds — "Auto-saved Xs ago" indicator in header.
- Pipeline kanban: use TanStack Table for the list view, custom kanban board component for board view.
- Customer 360: lazy-load tab content, don't fetch all 9 tabs on mount.
- RFQ inbox: J/K keyboard navigation when panel is focused.
- Priority score is calculated server-side and stored on quote_requests.priority_score.
- Full quote lifecycle: RFQ claim -> build quote -> approve -> send -> customer accepts.
