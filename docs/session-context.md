# Session context — pick up where we left off

Last updated: 2026-04-15 (session 2)

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
status field. Canceled = `status = 'declined'`. Won = `quote.status =
'accepted'`. Filters match on status. Pipeline stages map to/from status.
No parallel state machines.

**The living report**: `db.orderReports` is a sparse per-order document that
grows a section each time the order walks the pipeline. The viewer (`components/shared/ReportViewer.tsx`)
renders all filled sections and greys out future ones.

**Zero hardcoded**: every name, price, address, contact, badge, date, tier,
ID that renders in the UI comes from the DB. No fallback strings pretending
to be data. See CLAUDE.md "Zero hardcoded" section.

---

## DB tables (seed files)

All under `apps/internal/src/lib/db/seed/`:

| File | Rows | Key fields |
|---|---|---|
| `suppliers.md` | ~27 | name (PK), tier, paymentTerms, phone, rating, customBadges |
| `supplier_prices.md` | ~50 | productSlug + supplierName, rawCost, leadTime, MOQ, lastQuotedAtDaysAgo, isPrimary |
| `rfqs.md` | 8 | id, customerName, tier, status, items[], createdAtHoursAgo, slaHoursFromNow |
| `customers.md` | **3** | id, companyName, tier, contact, phone, email, address, creditLimit, LTV |
| `quotes.md` | 1 | id, quoteNumber, rfqId, customerId, status, items[], marginPercent |
| `price_update_requests.md` | 4 | productSlug, customerContext, requestedAtHoursAgo, status |
| `sales_reps.md` | 5 | id, name, role, activeRfqs, specialization[], territories[] |
| `order_reports.md` | 3 | id, rfqId, currentStage, sections{stage: data} |

Products live in `packages/types/src/catalog.ts` — the shared canonical
list used by internal + website. 24 products.

---

## DB accessor API (`apps/internal/src/lib/db/db.ts`)

```ts
db.products.list() / findBySlug / findByName / broadCategoryFor
db.suppliers.list / get / upsert / addBadge / removeBadge
db.supplierPrices.all / forProduct / primaryForProduct / forSupplier / getById / updateCost
db.rfqs.list / get / assign / updateStatus
db.customers.list / get / findByName / insert / update
db.quotes.list / get / forRfq / forCustomer / insert / updateStatus / update
db.priceUpdateRequests.pending / forProduct / insert / resolveFor
db.salesReps.list / get / findByName
db.orderReports.list / get / forRfq / ensureForRfq / appendSection / markCanceled
```

Every mutation stamps timestamps and returns the updated row. When Supabase
lands, **only the accessor bodies change**; no callers break.

---

## Server function inventory (what talks to db)

### Inventory (`apps/internal/src/lib/server/inventory.ts`)
`getInventoryOverview`, `getInventoryProductDetail`, `updateInventoryPrice`,
`updateSupplierQuote`, `updateSupplierQuoteByRow`,
`requestInventoryPriceUpdate`, `getOutdatedPricesSummary`,
`getSupplierProfile`, `updateSupplierProfile`, `getTopSuppliers`

### Sales — quotes (`sales-quotes.ts`)
`createQuote`, `saveQuoteDraft`, `getQuoteBuilderData`, `requestApproval`,
`approveQuote`, `previewQuotePDF`, `getProductCatalog`
Re-exports: `requestInventoryPriceUpdate`, `getOutdatedPricesSummary`

### Sales — RFQs (`sales-rfq.ts`)
`getRFQQueue`, `getRFQDetail`, `requestClarification`, `declineRFQ`,
`reassignRFQ`, `autoAssignRFQ`

### Sales — customers (`sales-customers.ts`)
`getCustomerList`, `getCustomerCreditInfo`, `addCustomer`, `getCustomer360`

### Sales — pipeline (`sales-pipeline.ts`)
`getSalesPipeline`, `moveDealStage`, `markAsWon`, `markAsLost`,
`convertQuoteToOrder`, `getNegotiationHistory`

### Sales — activity (`sales-activity.ts`)
`getActivityFeed`, `addInternalNote`, `getSalesAnalytics`

### Sales — send (`sales-send.ts`)
`sendQuote`

### Order reports (`order-reports.ts`)
`getOrderReport`

**Every mutation above writes through `db.*`. No stubs remain.**

---

## Panels status

### Sales panel ✅ (this session)
- RFQ inbox: 3 tabs (Submitted · Evaluated · Canceled), Submitted has section
  headers (New / Awaiting clarification)
- Outdated prices card in the header (auto-polls every 60s, manual refresh,
  dialog with bulk notify)
- Quote builder with 3 steps (Customer → Build → Review)
- Customer search modal loads from `getCustomerList`, new-customer flow
  commits to DB before advancing to Step 2
- Canceled rows click → `ReportViewerModal`

### Inventory panel ✅ (prior session, still current)
- Nav label: "Inventory" (was "Procurement"); 3 tabs archived
- Category rail (6 broad cats from website images), top suppliers strip,
  product grid with click-to-edit price
- Product detail modal: left = product info + current cost band, right =
  supplier list with tier/freshness pills + inline price editor
- Supplier profile mode: swap-in-place from product detail AND standalone
  modal from inventory home; tier picker, add/remove badges, all-quotes
  inline editor

### Not started (future sessions)
- **Orders panel** (or inventory-orders tab) — stage: `inventory_orders`
- **Finance partial-payment view** — stage: `finance_partial`
- **Finance full-payment view** — stage: `finance_full`
- **Warehouse prep view** — stage: `warehouse`
- **Dispatch delivery view** — stage: `dispatch`
- **Delivered / closed view** — stage: `delivered`

Each new panel adds one `Section` render block to `ReportViewer.tsx` and
one status-flip handler. No new tables unless the stage has data that
doesn't fit elsewhere.

---

## Where to look for what

- **Rules of engagement**: `CLAUDE.md` (zero hardcoded, dev advisor, fix all,
  tasks, fixing list, cleanup, etc.)
- **Product catalog**: `packages/types/src/catalog.ts` (shared internal + website)
- **Mock DB**: `apps/internal/src/lib/db/`
- **Reusable shared components**: `apps/internal/src/components/shared/`
  - `ReportViewer.tsx` — the living-document viewer
  - `PhoneInput.tsx` — smart EG phone masking
- **Inventory UI**: `apps/internal/src/components/procurement/inventory/`
- **Sales UI**: `apps/internal/src/components/sales/`
- **Quote builder types**: `components/sales/quote-builder/types.ts`
- **Session notes** (this file): `docs/session-context.md`

---

## Conventions that took work to establish

1. **No `useState('Some Default')`** fallbacks in components — state starts
   empty and hydrates from a query.
2. **Every mutation fn returns the updated row** from `db.*` — callers can
   optimistic-update or just re-query.
3. **Customer trim: 3 customers** (Al-Nour, Pyramid, Maadi). All 8 RFQs are
   rewired across those 3. Don't re-expand without rewiring.
4. **Reports are a growing doc, not a new state machine**. Section per stage.
   Status flips on the rfq/quote row drive the timeline rendering.
5. **Dev persistence is in-memory only**. Restart = reseed from MD. When
   Supabase lands, mutations write real SQL; callers unchanged.
6. **Builds happen periodically, not after every edit.** Run `bun run build`
   from `apps/internal` when wrapping a feature.

---

## Open observations for next session

None critical — session ended clean, build green, all mutations writing real
data, no lingering stubs in sales/inventory paths.

A few modules outside sales/inventory (warehouse, finance, HR, admin,
operations, dispatch, customer-service) still have hardcoded mocks — they
weren't in scope this session. When we touch them, they get the same
`db.*` migration treatment.

---

## How to continue in a new session

1. Read this file.
2. Read CLAUDE.md (especially Tasks, Zero hardcoded, Fix all, Fixing list).
3. Ask the user which panel/feature they want to work on.
4. If it's a new panel: the pattern is `ReportViewer` section + status-flip
   server fn + DB mutation. Follow the inventory/sales precedent.
5. Keep `bun run build` green as you go.
