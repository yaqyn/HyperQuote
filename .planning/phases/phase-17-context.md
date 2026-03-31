# Phase 17: Procurement Module

## Goal
Procurement can source from multiple suppliers, compare prices, and manage POs with three-way matching.

## Dependencies
- Phase 15 (Internal Platform Shell) must be complete — canvas, glass windows, hotkeys, command palette
- Phase 13-14 (Database tables) must be complete — supplier_pos, purchase_order_items, suppliers, source_inventory tables
- Phase 3 (Shared Packages) must be complete — @hyperquote/ui, @hyperquote/tables, @hyperquote/i18n

## Requirements

- **PROC-01**: Supplier inquiry builder: multi-supplier, per-item suggested suppliers (score-ranked), email/portal/WhatsApp send
- **PROC-02**: Response tracking: status indicators, auto-reminder at 24h, bulk remind non-responders
- **PROC-03**: Price comparison matrix: per-line supplier comparison, ranking algorithm (price 40% + availability 25% + lead time 20% + reliability 15%), split sourcing
- **PROC-04**: PO management: auto-generated from quote acceptance, 10-status flow, three-way match status, coded delivery reference (not customer name)
- **PROC-05**: Supplier scorecard: on-time delivery %, fill rate, quality rejection %, response time, tiering (Preferred -> Approved -> Conditional -> New)

## Success Criteria
1. Supplier inquiry builder sends to multiple suppliers via email/portal/WhatsApp with auto-reminder at 24h
2. Price comparison matrix ranks suppliers per-line (price 40% + availability 25% + lead time 20% + reliability 15%) and supports split sourcing
3. POs auto-generate from quote acceptance with 10-status flow and three-way match status
4. Supplier scorecard shows on-time delivery %, fill rate, quality rejection %, and tiering (Preferred/Approved/Conditional/New)

## What to Build
Supplier inquiry builder, response tracking, price comparison matrix, PO management, supplier scorecards.

**Build order:**
1. Database migration (if any procurement-specific tables not yet created)
2. Server functions for procurement
3. TanStack Query hooks
4. React components for each sub-screen
5. i18n keys (AR + EN)

## Spec References

### FRONTEND.md — MODULE 2: PROCUREMENT (Full Spec)

**Primary users:** Buyers, Category Managers, Vendor Relations
**Hotkey:** `P`
**Role visibility:** Procurement roles only. Sales can view (read-only) supplier pricing status for their quotes.

#### 2.1 Procurement Home View

**Tabs:** `[Home] [Supplier Inquiries] [Price Comparison] [PO Management] [Supplier Directory] [Supplier Scorecard]`

**Home content:**
- Pending inquiries to send out (count, deadline urgency)
- Price responses received needing review (count, linked quotes)
- Active POs by status: confirmed, in production, shipped, partially received
- Supplier performance highlights: best/worst performers this month

#### 2.2 Supplier Inquiry Builder

**Triggered when:** Sales requests pricing, or procurement proactively sources.

**Form (elevated glass):**
- Linked quote reference
- Response deadline (date picker)
- Items to inquire (auto-populated from quote, editable)
- Per item: suggested suppliers (system suggests based on category match, past history, performance score, geographic proximity)
  - Each supplier shows: name, on-time delivery %, last price for this item, recommendation status
  - Checkbox to include/exclude
  - `[+ Add Supplier]` to add unlisted supplier
- Inquiry message template (editable): material specs, quantities, delivery location, required-by date, response deadline
- Send via: `[Email]` `[Supplier Portal]` `[WhatsApp]`
- `[Send to All Selected Suppliers]` button

**Templates:** Standard Price Inquiry, Urgent Inquiry, Repeat Order, Project-Based, Negotiation Follow-Up. Variable fields auto-populated.

#### 2.3 Response Tracking

**Table:** supplier name, sent date, status (Sent/Opened/Responded/Overdue), response date, action
- Status indicators: gray=sent, blue=opened, green=responded, red=overdue
- `[Remind]` button for non-responders
- `[Send Reminder to All Non-Responders]` bulk action
- Auto-reminder at 24h before deadline (configurable)
- `[Close Inquiry & Proceed with Available]` to move forward without stragglers

#### 2.4 Price Comparison Matrix

**Per line item:**
- Table: supplier, unit price, lead time, availability (full/partial with quantity), total, certification status, ranking
- Color tags: green=best price, blue=fastest, yellow=partial availability
- Historical context: last 5 purchases of this item (supplier, price, delivery performance)
- Ranking algorithm: price (40%) + full availability (25%) + lead time vs deadline (20%) + reliability score (15%)
- One-click selection: choose supplier per item
- Split option: source one item from multiple suppliers
- After selection: auto-calculates margin based on internal cost + buffer

#### 2.5 PO Management

**PO List:** table with PO number, supplier, value, status, items count, expected delivery, actual delivery
**Status flow:** Draft -> Sent -> Confirmed -> In Production -> Shipped -> Partially Received -> Received -> Inspected -> Closed

**PO Detail:**
- Line items with quantities, prices, specs
- Delivery tracking: expected date, shipping notifications, tracking reference
- Receipt status: received vs expected per item
- Three-way match status: PO vs Receipt vs Supplier Invoice (green checkmark when matched)
- Documents: PO PDF, supplier confirmation, BOL, supplier invoice, inspection reports
- Activity log: all status changes with timestamps

**Auto-generated PO includes:**
- PO number, supplier details, line items, delivery address (coded reference for drop-ship, not customer company name), required delivery date, payment terms, quality requirements, reference to internal SO

#### 2.6 Supplier Scorecard

**Per supplier:**
- On-time delivery rate
- Order fill rate (quantity accuracy)
- Quality rejection rate
- Price competitiveness (vs market)
- Response time to inquiries
- Overall score: 1-5 stars
- Trend arrows (improving/declining)
- Tiering: Preferred (skip-lot inspection) -> Approved (AQL sampling) -> Conditional (tightened inspection) -> New (100% inspection)

#### 2.7 Procurement Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `N` | New Supplier Inquiry |
| `G` then `I` | Go to Inquiries |
| `G` then `P` | Go to PO List |
| `G` then `S` | Go to Supplier Directory |

### BACKEND.md — Server Functions (Procurement)

| Function | Method | Input | Output | Auth | Side Effects |
|---|---|---|---|---|---|
| `getProcurementQueue` | GET | `{ status?, page, limit }` | `{ items[], total }` | procurement | none |
| `createPurchaseOrder` | POST | `{ supplierId, lines[], deliveryDate, terms? }` | `{ poId }` | procurement | Creates PO, notifies supplier |
| `getSupplierDirectory` | GET | `{ search?, category?, page, limit }` | `{ suppliers[], total }` | procurement | none |
| `comparePricing` | GET | `{ productId, qty }` | `{ comparisons[] }` | procurement | none |
| `sendSupplierInquiry` | POST | `{ supplierIds[], productIds[], deadline }` | `{ inquiryId }` | procurement | Notifies suppliers via portal/WhatsApp |
| `trackInquiryResponses` | GET | `{ inquiryId }` | `{ responses[] }` | procurement | none |
| `getSupplierScorecard` | GET | `{ supplierId }` | `{ scorecard }` | procurement | none |
| `getPODetail` | GET | `{ poId }` | `{ po, items, timeline }` | procurement | none |
| `getPOList` | GET | `{ filters?, page, limit }` | `{ pos[], total }` | procurement | none |

## Business Rules

**Supplier Sourcing:**
- 2-5 suppliers per category, parallel outreach
- Pre-negotiated supplier pricing tiers for instant quotes on covered items
- Cached recent prices with confidence decay
- Auto-RFQ NOT recommended — match to cached prices first, queue only gaps for procurement
- PO anonymization: supplier never sees end customer name — delivery addresses use coded references (HQ-2026-XXXX)

**Supplier Tiering:**
- Preferred: skip-lot inspection, priority dispatch
- Approved: AQL sampling
- Conditional: tightened inspection
- New: 100% inspection

**Supplier Stock Freshness:**
- Fresh (<24h, green): sales can quote directly
- Aging (1-3 days, yellow): verify flag
- Stale (>3 days, red): requires procurement to get fresh pricing
- Suppressed (>7 days): auto-suppress products

**Three-Way Matching (PO vs Receipt vs Supplier Invoice):**
- Price tolerance: 0-5%
- Quantity tolerance: 0-2%
- Tax: 0% (exact match)
- Variance exceeds tolerance -> auto-routes to responsible function

**Withholding Tax on Supplier Payments:**
- 1% withheld on payments for goods (building materials)
- Remitted quarterly to ETA via Form 41
- Withholding tax certificate generated and sent to supplier

**Supplier Agreement Requirements:**
- Non-circumvention clause
- No supplier pricing visible to end customer
- Supplier must use HyperQuote's branded delivery note for all drop-ship deliveries
- Supplier must report delivery status to portal

## Non-Negotiable Rules

1. **Three colors only.** White, Black, Blue. Semantic status colors for DATA only.
2. **Spatial glass, not dashboards.** Procurement module opens inside a glass window. No sidebar.
3. **Geist Mono for ALL numbers.** Prices, quantities, IDs, dates, percentages.
4. **TanStack Start, NOT Next.js.**
5. **React Aria Components, NOT shadcn.**
6. **Motion v12, NOT framer-motion.** Import from `motion/react`.
7. **Bun, NOT npm/yarn/pnpm.**
8. **`useWatch()`, NEVER `watch()`.**
9. **`.inputValidator()`, NOT `.validator()`.**
10. **Colors in `:root {}`, NEVER in `@theme`.**
11. **ALL numbers -> Arabic-Indic numerals in Arabic context.**
12. **ALL units -> Arabic translations.**

## Known Risks & Gotchas

- **MapLibre v5 breaking changes** deferred to Phase 17+: new `canvasContextAttributes`, `on()` returns Subscription
- **Capacitor BG Geolocation v9** deferred: requires Capacitor 8, license key regeneration may be needed
- React Aria Dialog + hotkeys both fire on Escape: use `isKeyboardDismissDisabled` on Dialog
- Zustand SSR hydration: `skipHydration: true` + `rehydrate()` in useEffect
- 100+ routes may slow Vite dev: use TanStack Router lazy imports

## Tips

- **Read FRONTEND.md MODULE 2** for complete screen specs
- **Read BACKEND.md Section 6** for procurement server functions
- Per-phase checklist: create migration BEFORE UI, server function BEFORE component
- Add i18n keys for ALL user-facing strings (AR + EN)
- Test RTL layout, dark mode, mobile responsive
- The procurement module is permission-filtered: only procurement roles see it, sales can view read-only supplier pricing status
