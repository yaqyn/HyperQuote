# Session context — pick up where we left off

Last updated: 2026-04-16 (session 4)

---

## Session 4 changelog (what just landed)

Session 4 closed every outstanding loop in the outgoing + incoming
pipelines and paused right before the Dispatch panel rebuild. The
next session is a clean greenfield rebuild of Dispatch — see the
"Dispatch panel spec" section at the bottom of this file.

### Sales / Finance cleanup
- **Evaluate workflow** — explicit button on the Review & Submit step
  of the quote builder (not the inbox row, not auto-fire). Clicking
  Evaluate saves the draft, calls `markAsWon` which flips quote to
  `accepted`, freezes `totalDue`, seeds `paymentStatus='unpaid'`,
  walks rfq to `quoted`, closes the builder. Lands in Finance inbox.
- **Finance full-payment option** — Unpaid orders now show a
  Partial/Full toggle. Partial = 50%, Full = 100% in one shot.
  `canAdvance` in `lib/server/finance.ts` permits `unpaid → paid`.
- **Finance cancel path** — `cancelOrderFromFinance` /
  `cancelDealFromFinance` (reason + note, proof, walks rfq to
  declined, stamps `markCanceled`, releases reserved stock).
- **Quote builder field persistence** — `QuoteRow` schema extended
  with delivery/terms/coverNote/specialInstructions fields.
  `saveQuoteDraft` writes them. `getQuoteBuilderData` hydrates them.
- **Quote builder mocks wiped** — `MOCK_INVENTORY`, `ALL_SUPPLIERS`,
  `MOCK_RESPONSES`, `MOCK_SUPPLIERS_FOR_SOURCING` all deleted. The
  builder pulls real stock + supplier directory from
  `getQuoteBuilderData.stockByName` + `getQuoteBuilderData.suppliers`.
- **sendQuote hardcodes removed** — `recipientIds: ['primary-contact']`
  literal deleted. Schema made recipients optional.
- **Request Prices server gate** — `requestInventoryPriceUpdate` now
  re-checks freshness server-side. Refuses to create a request for a
  currently-fresh product even if the client's form snapshot is
  stale. Returns `skippedFresh` / `skippedDuplicate` counts.
- **Procurement price desk sort** — pending-request rows float to the
  top of the inventory view regardless of category filter.
- **PriceConfirmDialog autoconfirm bug** — fixed. 250ms armed grace
  window after open, `autoFocus` removed from Confirm button,
  input's Enter handler preventDefault+stopPropagation so the
  opening Enter can't cascade into a confirm.

### Warehouse · Loading (outgoing) — fully built
- **Tablet-first Control Tower's cousin** — blueprint / industrial
  aesthetic. Chunky Geist Mono, 3px hard borders, hard-shadow
  offsets, hazard yellow `#E6B400`, red `#CC3300`, forest green
  `#0A5C2E`, near-black `#0A0A0A` on `#F4F4EC` warm cream. Steel
  grid backdrop at 48px. Tap targets ≥56px.
- **4-stage resumable wizard** — state derived from
  `order_reports.sections.warehouse`, NOT React state. Advisor can
  drop the tablet mid-load and pick up exactly where they left off.
  - Stage 1: Truck picker (live fleet from `trucks.md`)
  - Stage 2: Load checklist — per-item, per-truck toggles. Empty
    truck gate: Next blocked if any assigned truck has zero items.
    `removeTruckFromOrder` fn + Remove button on empty truck cards.
    Explicit "Next → Signoff" button — no auto-advance.
  - Stage 3: Signoff — advisor picker (employees.md), security pass
    (password or QR mock `1234`), Pass/Fail decision, proof
    filename. Fail path: `logFailedInspection` appends to
    `failedInspections[]` audit trail, resets `advisorMarkedReady`,
    bounces back to loading with a red retry banner showing the
    last reason.
  - Stage 4: Pass to dispatch — advisor + security check,
    `passedAt` stamped, trucks flipped `loading → dispatched`
    (locked until dispatch releases them).
- **Reset button** — red, two-stage confirm dialog. Clears warehouse
  section, releases trucks, keeps inventory reservation intact.
  Refuses after pass-to-dispatch.
- **Motion throughout** — respects `useReducedMotion`. Staggered
  card entry, stage crossfade, animated checkmarks, button state
  transitions, live loaded-count spring bumps.

### Warehouse · Receiving (incoming) — fully built
- **Tab switch in the queue masthead** — `Loading · Outgoing` /
  `Receiving · Incoming`. Black-fill active, white inactive.
  `WarehouseTabSwitch` component shared between both queue headers.
- **Receiving queue** — deals where `paymentStatus ≠ unpaid` and
  `status ≠ delivered/closed` and at least one item still pending.
  Retry deals (deals with prior failed attempts) float first.
- **Receiving flow** — per-item binary accept/reject (you confirmed
  option B: each item independent). Rejection reason required if
  anything rejected. Advisor picker + `1234` security + proof
  filename. `recordReceivingAttempt` appends to
  `deal.receivingAttempts[]`, bumps `db.stock.adjust` per accepted
  item, auto-flips `deal.status → 'delivered'` when every item is
  in. Rejected items stay for next truck, deal returns to queue
  with red Retry badge and attempt counter.
- **Stock correctness fix** — `createDeal` no longer bumps stock
  optimistically. Stock only increments on actual receive via the
  receiving flow. Sales can't promise stock that hasn't arrived.

### Multi-item deals refactor (v9/v10/v11 schema)
- `DealRow` is now `{ supplierName, items: DealItemRow[], ... }`.
  The single-product fields are gone — a deal represents one
  supplier phone call with multiple negotiated lines.
- `DealItemRow = { productSlug, agreedQty, agreedRawCost, received,
  receivedAt }`.
- `createDeal` accepts multi-item input, validates each item
  against `db.supplierPrices.forSupplier`, updates listed price
  per item.
- `getSupplierCatalog({ supplierName })` returns every product the
  supplier carries, low-stock items sorted first.
- **RefillPanel multi-item UI** — once a supplier is picked, the
  inline call form shows the primary product as line 1. `+ Add item`
  button opens a picker of the supplier's other products (filtered
  to exclude already-added), rep adds more lines with qty + cost.
  Per-line MOQ warnings, per-line price-drop indicators, proof
  required in notes if any line dropped. One `createDeal` call
  creates the whole multi-item deal.
- **Finance UI updated** — `FinanceDealView.items[]`, row shows
  `{headline} +N more · N items`, payment panel detail view lists
  every item for verification before paying.

### Employees directory
- `employees.md` seed with 8 rows: `{ id, name, name_ar, phone }`.
  No role column yet — HR panel will add it later.
- `db.employees.list() / get(id)` accessors.
- `getWarehouseEmployees` server fn returns the directory.
- Advisor picker everywhere uses it (warehouse signoff, receiving).
  Server resolves `advisorId → advisorName` from the directory,
  client never trusted with the display name.

### Trucks
- `trucks.md` now has `driverPhone` field on every row (added for
  Dispatch panel click-to-call).
- DB pin at `__hqInternalDb_v11__`.

### CLAUDE.md rule added
- New "Ask when you don't understand" section above the Dev advisor
  section. Canonical list of red-flag patterns: guessing from a
  word in the request, putting a control where the data lives
  instead of where the user stands, implicit side effects, delete-
  then-re-add loops. Default posture: ask, then act.

### Session 4 thrash log (what I got wrong + how we fixed it)
- Evaluate button placement was pattern-matched to the inbox row
  twice before I understood it belongs on the Review & Submit step
  of the quote builder. Cost: three wrong implementations.
- Deal receiving was originally built single-item before the user
  clarified deals are multi-item — rolled back cleanly.
- Motion variants conflicted with `animate={{color}}` override on
  assigned trucks, hiding the cards. Fixed by switching from
  variants-with-override to direct `initial`/`animate`.

---

Last updated: 2026-04-15 (session 3)

This doc is the fastest way to reload a new Claude session's mental model of
where we are on the HyperQuote internal app. Read it top-to-bottom before
touching code.

---

## The mental model

**One data layer, everything derives**: `apps/internal/src/lib/db/` is the
single in-memory mock database, seeded from Markdown files in `./seed/*.md`.
Every server function reads and writes through `db.*` accessors. Nothing
mutates local state, nothing hardcodes sample data, nothing duplicates rows.

**Status is the game variable**: every action in the app flips a row's
status field. Canceling = `status = 'declined'`. Winning = `quote.status =
'accepted'`. Filters match on status. Pipeline stages map to/from status.
No parallel state machines.

**Stock has three numbers**: `stockLevel` (physical on-hand), `reservedLevel`
(locked by approved orders), `availableLevel = stockLevel - reservedLevel`.
Approving a customer order calls `db.stock.reserve(slug, qty)` — physical
stays put, reserved climbs. The Stock tab's gauges read `availableLevel`.
`release()` frees reservation back (on cancel). `consume()` drops both
(when warehouse actually ships).

**The living report**: `db.orderReports` is a sparse per-order document that
grows a section each time the order walks the pipeline. The viewer
(`components/shared/ReportViewer.tsx`) renders all filled sections and
greys out future ones.

**Zero hardcoded**: every name, price, address, contact, badge, date, tier,
ID that renders in the UI comes from the DB. No fallback strings pretending
to be data.

**Real-time by default**: `routes/__root.tsx` sets React Query global
defaults to `staleTime: 0`, `refetchOnMount: 'always'`,
`refetchInterval: 3000`. Cross-panel mutations propagate everywhere within
one 3-second tick even without explicit invalidation. Critical mutations
still invalidate explicitly for instant feedback.

---

## DB tables (seed files)

All under `apps/internal/src/lib/db/seed/`:

| File | Rows | Key fields |
|---|---|---|
| `suppliers.md` | ~27 | name, tier, paymentTerms, phone, rating, customBadges |
| `supplier_prices.md` | ~50 | productSlug + supplierName, rawCost, leadTime, MOQ, isPrimary |
| `rfqs.md` | 8 | id, customerName, tier, status, items[] |
| `customers.md` | 3 | id, companyName, tier, contact, phone, email, address, LTV |
| `quotes.md` | 3 (1 sent, 2 accepted) | id, quoteNumber, rfqId, status, items[] |
| `price_update_requests.md` | 4 | productSlug, customerContext, status |
| `sales_reps.md` | 5 | id, name, role, territories |
| `order_reports.md` | 3 | id, rfqId, currentStage, sections{stage: data} |
| `inventory_stock.md` | 24 | productSlug, stockLevel, reservedLevel, lowStockThreshold |
| `deals.md` | 0 | id, productSlug, supplierName, agreedQty, agreedRawCost, status |

Products live in `packages/types/src/catalog.ts` — the shared canonical
list used by internal + website. 24 products.

**DB is pinned on `globalThis.__hqInternalDb_v3__`** so Vite HMR doesn't
reseed on every file edit. Bumping the key suffix forces a one-time
reseed (schema changes). Current: `v3`.

---

## DB accessor API (`apps/internal/src/lib/db/db.ts`)

```ts
db.products      list / findBySlug / findByName / broadCategoryFor
db.suppliers     list / get / upsert / addBadge / removeBadge
db.supplierPrices all / forProduct / primaryForProduct / forSupplier / getById / updateCost
db.rfqs          list / get / assign / updateStatus
db.customers     list / get / findByName / insert / update
db.quotes        list / get / forRfq / forCustomer / insert / updateStatus / update
db.priceUpdateRequests  pending / forProduct / insert / resolveFor
db.salesReps     list / get / findByName
db.orderReports  list / get / forRfq / ensureForRfq / appendSection / markCanceled
db.stock         list / forProduct / adjust / setLevel / reserve / release / consume
db.deals         list / forProduct / forStatus / insert / updateStatus
```

---

## Shared components

### `components/shared/SlidePanel.tsx` — THE panel system
Every slide-in panel (map, margin, refill, product detail, Lyon chat, order prep)
uses this. One file, one set of rules.

**What it gives you:**
- Spring slide-in from the trailing edge (or leading edge via `side="start"`)
- Transparent click-outside backdrop
- Escape-key dismissal
- Opaque surface background (no bleed-through)
- Portal into the module body via `PanelHostContext` so panels cover the
  whole body including tab strips
- Click any backdrop → closes ALL open panels (registry pattern)
- Optional `scope="sales" | "procurement"` — registers with the module
  store's `overlayCloseHandler`, so the outer panel X dismisses the side
  panel first before closing the whole module

**How to use:**
```tsx
<SlidePanel isOpen={x} onClose={setX} scope="procurement" maxWidth={560}>
  {your content}
</SlidePanel>
```
That's it. Every new panel drops into this and inherits everything.

### `components/shared/AIChatPanel.tsx` — Lyon AI
Global shell-level chat, mounted once in `ModuleWindow`. Persists across
module switches (same store instance). Toggle button is `Ask Lyon` text
on the leading edge of `WindowHeader`. Keyboard: `⌘K` / `Ctrl+K`. Store:
`stores/ai-chat.ts`. `send()` is a placeholder — swap for real Anthropic
streaming later.

### `components/shared/ReportViewer.tsx` — the living document viewer

### `components/procurement/inventory/PriceConfirmDialog.tsx`
Every price mutation pauses here for confirmation. Shows old→new price +
delta %. If the change is a **decrease** or **>25% jump**, requires a
10-char min proof textarea. Used by InventoryView row edit,
ProductDetailModal SupplierRow edit, and SupplierProfileView quote edit.

### `lib/inputs.ts` — input hardening
- `sanitizeCost` — strips commas/spaces, rejects NaN/negative/overflow, 2 decimals
- `sanitizeIntQty` — integer-only, positive
- `clampMargin(raw, floor)` — clamps to `[floor, MAX_MARGIN_PCT=80]`
- `proofNeededFor(old, new)` — guard rule
- `isValidEmail`, `isValidText(min, max)` — text guards
- Every price input, quantity input, and required text field routes
  through this file. Single source of truth.

---

## Server function inventory (what talks to db)

### Inventory (price desk) — `sales-quotes.ts` + `inventory.ts`
`getInventoryOverview`, `getInventoryProductDetail`, `updateInventoryPrice`,
`updateSupplierQuote`, `updateSupplierQuoteByRow`,
`requestInventoryPriceUpdate`, `getOutdatedPricesSummary`,
`getSupplierProfile`, `updateSupplierProfile`, `getTopSuppliers`

### Stock tab — `stock.ts`
`getStockOverview`, `getRefillProductDetail`, `createDeal`

### Customer orders (inventory prep) — `orders.ts`
`getCustomerOrdersList`, `getCustomerOrderDetail`, `approveOrderForWarehouse`

### Sales — quotes / rfqs / customers / pipeline / activity / send
See previous session notes. All wired.

### Order reports — `order-reports.ts`
`getOrderReport`

**Every mutation writes through `db.*`. No stubs remain in implemented paths.**

---

## Panels status

### Sales panel ✅
RFQ inbox with 3 tabs (Submitted · Evaluated · Canceled), quote builder
with 3 steps, line margin side panel (with item toggle), delivery map
side panel, outdated prices polling card, customer flow, decline dialog.

### Procurement panel ✅ (three tabs)
1. **Inventory (default)** — `StockView` — stock-level table, per-product
   rows with status dot + available/reserved/physical numbers, inline
   gauge with threshold tick, refill CTA. Category chips with red-wash
   gradient on attention. Refill slide-in (call supplier → set deal →
   `createDeal` → `db.stock` reflects immediately).
2. **Procurement** — `InventoryView` (price desk) — minimalist table with
   per-row **vertical freshness meter** (unique signature), inline cost
   edit, age column, primary supplier, call-once-fix-many strip at top.
   `ProductDetailModal` and `SupplierProfileView` are both slide-in panels.
3. **Orders** — `OrdersView` — customer orders waiting for inventory prep.
   Lists accepted quotes, computes readiness against `availableLevel`,
   `OrderPrepView` drill-down shows per-item shortages + per-item refill
   (opens same `RefillPanel`) + Approve button. Approving calls
   `approveOrderForWarehouse` which reserves stock and stamps
   `order_reports.sections.inventory_orders`.

### Finance panel ⚠️ (OLD PANEL TO BE DELETED — REBUILD FROM SCRATCH)
Current `components/finance/` is a large legacy scaffold (AR, AP, PDC,
credit, invoicing, disputes, payments, reports) — **all of it should be
deleted**. Same for `types/finance.ts`, `stores/finance.ts`,
`lib/finance/*`, and all `lib/server/finance-*.ts` except any that are
referenced by non-finance code. User said: **"completely remove old
finance panel. start clean."**

The NEW Finance panel has one critical job right now: **Deals & Orders**
— the dual-pipeline inbox described below. A second `History` tab is a
placeholder for now.

### Not started (future sessions)
- **Finance panel rebuild** — see detailed spec below, this is NEXT
- **Warehouse prep view** — stage: `warehouse`
- **Dispatch delivery view** — stage: `dispatch`
- **Delivered / closed view** — stage: `delivered`

---

## FINANCE PANEL SPEC (next session)

### Architecture

Finance sits BETWEEN sales and inventory on the customer side, and
BETWEEN inventory deals and warehouse on the supplier side. Two pipelines
cross the panel:

**Pipeline A — Customer money flowing IN:**
```
Sales quote accepted → FINANCE (partial payment) → Inventory Orders tab → Warehouse
```

**Pipeline B — Supplier money flowing OUT:**
```
Inventory refill creates deal → FINANCE (partial payment) → Warehouse (receive goods)
```

### Payment state machine (same for both customer orders and supplier deals)

```
unpaid  →  partial  →  paid
```

- **unpaid**: just created (accepted quote for customer, pending_finance deal for supplier). Finance needs to collect the first partial.
- **partial**: first payment in. The order/deal flows through the rest of the pipeline, but the `partial` state **sticks** until full payment clears.
- **paid**: fully settled.

### CRITICAL RULES

1. **Partial is a STATE, not a step.** It lives on the order from the
   moment of first partial until full payment, regardless of whether the
   order is still being prepped, delivered, or already sitting at the
   customer's site. Finance needs a view showing all partials — **with
   delivered+partial rows floating to the top** (those are the urgent
   ones to chase because the customer already has the goods).

2. **Partial amount is fixed at 50%** (unless user tells next session it
   should be tier-based). Finance can't type an arbitrary amount — they
   see "50% due now = X EGP" or "remaining 50% due = Y EGP".

3. **Proof upload is REQUIRED** on every transition. Finance opens the
   row, uploads a proof file (PDF/image — mock it as a filename string
   for now), goes through a two-step confirmation (preview amount + proof
   filename + big confirm button), then the mutation commits. Without a
   proof filename attached, the button is disabled. **Anti-scam + human
   error.**

4. **Transitions can't go backwards.** `paid → partial` blocked.
   `partial → unpaid` blocked.

5. **Server-side gates:** `approveOrderForWarehouse` (in `orders.ts`)
   must be updated so the Inventory Orders tab only surfaces quotes where
   `paymentStatus !== 'unpaid'`. Supplier deals should only advance to
   warehouse when `paymentStatus !== 'unpaid'`.

### Data model changes needed

Extend `QuoteRow` in `db.ts`:
```ts
paymentStatus: 'unpaid' | 'partial' | 'paid'
amountPaid: number                // running total
totalDue: number                  // locked at quote acceptance
partialPaidAt: string | null      // ISO when first partial recorded
fullPaidAt: string | null         // ISO when fully paid
partialProofUrl: string | null    // mock filename for now
fullProofUrl: string | null
```

Same fields on `DealRow`. Bump DB pin key to `v4`.

Seed quotes in `quotes.md`: set `paymentStatus: 'unpaid'` on accepted
ones so Finance has something to work on. Add sample `totalDue` computed
from items. Same for deals if any.

### New server file `lib/server/finance.ts`

```ts
getFinanceInbox()   // returns { customerOrders[], supplierDeals[], totals }
recordOrderPartial(quoteId, proofUrl)   // → status='partial', stamps timestamp
recordOrderFullPayment(quoteId, proofUrl)  // → status='paid'
recordDealPartial(dealId, proofUrl)
recordDealFullPayment(dealId, proofUrl)
```

Each mutation validates: current state allows the transition, proofUrl
is non-empty, updates `amountPaid` by 50% of total, stamps timestamp.

### New UI

1. **Delete everything in `components/finance/`**
2. **Delete `stores/finance.ts`, `types/finance.ts`, `lib/finance/`, all
    `lib/server/finance-*.ts` files** (none are consumed by non-finance
    code per grep — see session 3 verification)
3. **New `FinanceModule.tsx`** with tab strip:
   - `deals-orders` (default) — the inbox
   - `history` — placeholder div
   - (Future: `accounting` — will become default once built)
4. **New `FinanceDealsOrdersView.tsx`** — minimalist data table matching
   the Procurement/Orders/Inventory tab language. Two sections:
   - **Customer orders** (Unpaid → Partial → Paid filters, delivered+partial at top of Partial view)
   - **Supplier deals** (same filters)
   - Inline stats header, filter chips with red-wash gradient on attention
5. **Row click → `FinancePaymentPanel` side panel** (uses `SlidePanel`
   with `scope="finance"`). Shows: customer/supplier info, order items,
   totals, 50% due banner, file upload (fake via a text input for the
   filename), two-step confirm → mutation.

### Store + shell wiring

- New `stores/finance.ts` with `activeTab` + `overlayCloseHandler`
- Update `stores/procurement.ts` (already has overlayCloseHandler — just
  reference for pattern)
- Add `finance` scope to `SlidePanel` (extend `SlidePanelScope` type to
  include `'finance'`)
- Update `ModuleWindow.handleClose` to add the finance case:
  ```ts
  if (moduleId === 'finance') {
    const finance = useFinanceStore.getState()
    if (finance.overlayCloseHandler?.()) return
  }
  ```

### Inventory Orders tab update

In `lib/server/orders.ts`, the `getCustomerOrdersList` filter currently
is `q.status === 'accepted'`. Change to
`q.status === 'accepted' && q.paymentStatus !== 'unpaid'`.

---

## Where to look for what

- **Rules of engagement**: `CLAUDE.md`
- **Product catalog**: `packages/types/src/catalog.ts`
- **Mock DB**: `apps/internal/src/lib/db/`
- **Input guards**: `apps/internal/src/lib/inputs.ts`
- **Shared components**: `apps/internal/src/components/shared/`
- **Inventory UI**: `apps/internal/src/components/procurement/inventory/`
- **Stock UI**: `apps/internal/src/components/procurement/stock/`
- **Orders UI**: `apps/internal/src/components/procurement/orders/`
- **Sales UI**: `apps/internal/src/components/sales/`
- **This doc**: `docs/session-context.md`

---

## Conventions that took work to establish

1. **No `useState('Some Default')`** fallbacks in components — state
   starts empty and hydrates from a query.
2. **Every mutation fn returns the updated row** from `db.*` — callers
   can optimistic-update or just re-query.
3. **Real-time by default** — queries poll every 3 seconds, cross-panel
   updates propagate automatically.
4. **Customer trim: 3 customers** (Al-Nour, Pyramid, Maadi). All 8 RFQs
   are rewired across those 3. Don't re-expand without rewiring.
5. **Reports are a growing document, not a new state machine**. Section
   per stage. Status flips on the rfq/quote row drive the timeline.
6. **Dev persistence is in-memory only**. Restart = reseed from MD.
   Schema changes need the pin key bumped (`__hqInternalDb_vN__`).
7. **Builds happen periodically, not after every edit.**
8. **Every SlidePanel is shared** — no custom slide-in motion, no
   per-panel backdrops. Drop into `<SlidePanel>` and inherit everything.
9. **Every price mutation routes through `PriceConfirmDialog`**. Lower
   price or >25% jump requires 10-char proof.
10. **Every numeric input routes through `lib/inputs.ts`** helpers.

---

## How to continue in a new session

1. Read this file top-to-bottom.
2. Read `CLAUDE.md` — especially the "Ask when you don't understand"
   section added in session 4.
3. The next scheduled work is the **Dispatch panel rebuild** (see spec
   below). Everything else in the outgoing + incoming loops is
   functional.
4. Keep `bun run build` green after each major step (not each edit).
5. Shared-component rules: new side panels use `<SlidePanel>`, new
   price edits use `PriceConfirmDialog`, new numeric inputs use
   `sanitizeCost` / `sanitizeIntQty`.
6. DB pin is at `__hqInternalDb_v11__`. Bump if schema changes.

---

## DISPATCH PANEL SPEC (next session — starts empty)

### Status right now
- Old dispatch scaffold fully **deleted** in session 4
  (`components/dispatch/`, `stores/dispatch.ts`, `types/dispatch.ts`,
  `lib/server/dispatch.ts` all gone).
- `components/dispatch/DispatchModule.tsx` is a **placeholder stub**
  that renders a "Under construction · see session-context.md" screen
  so `ModuleWindow` lazy import resolves and the app builds.
- `SlidePanel.scope` does NOT yet include `'dispatch'`.
- `ModuleWindow.handleClose` does NOT yet have a dispatch branch.
- No dispatch store, no dispatch server fn, no dispatch components
  beyond the placeholder.

### What Dispatch is
The ops-center surface for moving the truck between the dock and the
customer. Desktop-first (usually runs on a bigger screen in the office
or dispatch kiosk), but the action panels should still feel tablet-
usable. After warehouse signs off and passes an order, Dispatch is
the last hop before the order is marked delivered or returned.

### Workflow
1. Warehouse passes order → `report.sections.warehouse.passedAt` set,
   assigned trucks flipped `loading → dispatched`, `currentStage`
   advances to `'warehouse'`.
2. Dispatch board fetches all orders where `passedAt` is set AND
   `!sections.delivered` AND `!sections.returned`. These are the
   active routes.
3. Dispatcher clicks a route → detail panel slides in with: customer
   info (name, contact name, phone), delivery address + city, order
   line items, assigned trucks (plate, driver name, driver phone),
   click-to-call affordances, 991 emergency button.
4. Two primary actions, both requiring advisor picker + mock `1234` +
   proof filename (POD — proof of delivery):
   - **Delivered** — stamp `sections.delivered`, advance
     `currentStage = 'delivered'`, call `db.stock.consume(slug, qty)`
     per item (reservation becomes outflow), release trucks
     `dispatched → available`. Invalidate finance-inbox,
     customer-orders, warehouse-queue, dispatch-board.
   - **Returned** (requires reason, min 3 chars) — append
     `sections.returned` audit to the order report with reason +
     advisor + proof, RESET `sections.warehouse` (passedAt null,
     signoff null, advisorMarkedReady false, truckAssignments: []),
     release trucks back to `available`, set `currentStage` back to
     `'warehouse'`. The order re-enters the warehouse Loading queue
     at stage `unstarted`.

### Cross-panel effects after Delivered / Returned
- **Finance** — `FinanceOrderView.isDelivered` already derives from
  `currentStage === 'delivered'`. The "delivered · chase" red flag
  already surfaces in the Partial filter. Nothing to change in
  `lib/server/finance.ts`, nothing to change in the finance panel
  UI. The flag will just auto-light up.
- **Customer portal** (separate app, not touching this session) —
  will query the order report and show `sections.delivered` when
  present. The data is there; the portal wiring is future work.
- **Warehouse Loading queue** — returned orders reappear at stage
  `unstarted` with the previous signoff history wiped. If we want
  to preserve return-history on the order report we already have
  `sections.returned` for that; no schema change needed.

### Aesthetic commitment — CONTROL TOWER
Different personality from the warehouse's chunky blueprint. This is
a coordination surface, not a shop-floor surface.
- **Base**: `#050810` near-black with midnight navy panels
- **Accents**:
  - `#00D9FF` neon cyan — active/in-transit routes, primary chrome
  - `#00E676` matrix green — delivered, success states
  - `#FF3D55` hot red — returned, critical actions, emergency 991
  - `#FFB020` amber — overdue / urgency
- **Typography**: Geist Mono, thin weights mixed with heavy, bigger
  numbers than labels
- **Borders**: **1px hairlines** (not 3px hard like warehouse). Thin
  cyan glows on active elements. Precision over brute force.
- **Masthead**: `DISPATCH · CONTROL` wordmark + live HH:MM:SS clock
  ticking every second + stat strip (In transit / Overdue /
  Delivered today / Returned today)
- **Subtle radar sweep** overlay behind the stats strip — single
  conic-gradient CSS animation at ~8s loop, very low opacity
- **Truck IDs**: color-rotated numeric badges (T1 cyan, T2 amber,
  T3 purple, T4 magenta …) — the color follows the truck across
  the board so the dispatcher's eye tracks it
- **Route visualization**: each active route rendered as a
  horizontal lane: `[BAY 01] ━━━━●━━━━ [CAIRO · Maadi]` with a
  pulsing progress dot. No real GPS — the dot position is purely
  visual (could be a slow left-to-right drift animation)

### File structure to build
```
components/dispatch/
├── DispatchModule.tsx          — root, dark base, radar backdrop
├── DispatchBoard.tsx           — left column, masthead + stats + route list
├── DispatchRouteCard.tsx       — one truck/route row in the list
├── DispatchRouteDetail.tsx     — right column, customer/driver/items + actions
├── DispatchDeliveredDialog.tsx — delivered confirm (advisor + security + proof)
├── DispatchReturnedDialog.tsx  — returned confirm (adds reason field)
└── DispatchLiveClock.tsx       — ticking HH:MM:SS component

stores/dispatch.ts
  - selectedQuoteId: string | null
  - overlayCloseHandler

lib/server/dispatch.ts
  - getDispatchBoard()              → routes[] + totals
  - getDispatchRouteDetail(quoteId) → full route incl. customer, items, trucks
  - markOrderDelivered({ quoteId, advisorId, proofUrl, securityMethod, securityToken })
  - markOrderReturned({ quoteId, advisorId, reason, proofUrl, securityMethod, securityToken })
```

### Server details
- `getDispatchBoard` — iterate quotes where `status='accepted'` and
  the order report's `sections.warehouse.passedAt` is set AND
  `!sections.delivered` AND `!sections.returned`. For each, pull
  customer (`db.customers.get(quote.customerId)`), truck assignments
  from the warehouse section, resolve each truck via `db.trucks.get`
  for live status + driver phone. Return:
  ```ts
  interface DispatchRouteView {
    quoteId, quoteNumber, customerName, customerPhone,
    customerContactName, deliveryAddress, deliveryCity,
    deliveryUrgencyDays,
    items: [{ productSlug, productName, sku, qty, unit }],
    trucks: [{ truckId, plateNumber, driverName, driverPhone, capacityTons }],
    passedAtHoursAgo: number,
    isOverdue: boolean,
  }
  ```
- `markOrderDelivered` — validates mock `1234`, advisor exists,
  order still in dispatch state. Then:
  1. `db.orderReports.appendSection(rfqId, 'delivered', { deliveredAt, advisorName, proofUrl })`
  2. For each item: `db.stock.consume(productSlug, quantity)`
  3. For each assigned truck: `db.trucks.setStatus(truckId, 'available')`
  4. Return `{ success: true, quoteId }`
- `markOrderReturned` — validates mock `1234`, reason min 3 chars,
  advisor exists. Then:
  1. `db.orderReports.appendSection(rfqId, 'returned', { returnedAt, reason, advisorName, proofUrl })`
  2. Overwrite `sections.warehouse` with an empty state:
     `{ truckAssignments: [], advisorMarkedReady: false, signoff: null, passedAt: null, failedInspections: section.failedInspections }`
     (keep prior failedInspections for history)
  3. Set `report.currentStage = 'warehouse'`
  4. For each previously assigned truck: `db.trucks.setStatus(truckId, 'available')`
  5. Return `{ success: true, quoteId }`

### Security pattern (reuse)
Same employees.md picker, same mock token `1234`, same password/QR
method tabs, same proof filename input. Copy the shape from
`WarehouseReceivingFlow`'s body — the advisor picker, the
`SecurityTab` component, the credential helper copy.

### Data already available
- `TruckRow` has `driverName` and `driverPhone` (session 4 added it)
- `db.employees` is seeded and accessor-ready
- Order report has `currentStage`, `sections.warehouse.passedAt`,
  `sections.warehouse.truckAssignments` — everything dispatch needs
- `MOCK_ADVISOR_TOKEN = '1234'` in `lib/server/warehouse.ts` — for
  the new dispatch server fn, re-define the constant locally OR
  extract to a shared `lib/server/_mock.ts` (small file, single
  export). Your call.

### Don't forget
- Extend `SlidePanelScope` to include `'dispatch'`
- Wire `useDispatchStore.overlayCloseHandler` into SlidePanel
- Add `moduleId === 'dispatch'` branch to `ModuleWindow.handleClose`
- Delete the placeholder `DispatchModule` first, then build the real
  one
- Invalidate query keys on every mutation: `dispatch-board`,
  `warehouse-queue` (for returned), `finance-inbox`, `customer-orders`,
  `stock-overview`, `inventory-overview`
