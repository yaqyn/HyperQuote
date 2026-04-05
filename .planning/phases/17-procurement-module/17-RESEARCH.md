# Phase 17: Procurement Module - Research

**Researched:** 2026-04-05
**Domain:** Internal platform procurement module -- supplier inquiry builder, response tracking, price comparison matrix, PO management, supplier scorecard
**Confidence:** HIGH

## Summary

Phase 17 builds the procurement module inside the internal platform shell (Phase 15), following the identical pattern established by the sales module (Phase 16). The module comprises 6 views (Home, Supplier Inquiries, Price Comparison, PO Management, Supplier Directory, Supplier Scorecard) plus keyboard shortcuts. All views render inside the existing `ModuleWindow` glass window with `moduleId: 'procurement'`, lazy-loaded via `React.lazy()`.

The database schema is fully complete. Three procurement-specific tables exist: `supplier_pos` (with 11-status enum and state machine enforcement), `supplier_po_items`, and `supplier_inquiries`. Supporting tables include `suppliers`, `supplier_contacts`, `supplier_price_lists`, `supplier_agreements`, `source_inventory`, and `supplier_invoices` (for three-way matching). Business logic triggers already handle: coded delivery reference generation (`HQ-YYYY-NNNN`), exchange rate variance checks, PO confirmation notifications, and search index sync. The `on_quote_accepted()` trigger creates orders but does NOT auto-generate POs -- PO creation is a procurement action triggered from the UI after price comparison and supplier selection.

**Primary recommendation:** Mirror the Phase 16 SalesModule pattern exactly: lazy-loaded `ProcurementModule` component in `ModuleWindow`, `ProcurementTabStrip` for sub-navigation, Zustand store for UI state, server functions with dev-mode mock data fallback. The ranking algorithm (price 40% + availability 25% + lead time 20% + reliability 15%) is computed server-side in `comparePricing`. Three-way matching is a read-only status display comparing `supplier_pos` vs `supplier_po_items.received_quantity` vs `supplier_invoices` -- tolerance rules (price 0-5%, qty 0-2%, tax 0%) are evaluated server-side.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- React Aria Components for all UI primitives (Tables, Tabs, Dialog, ComboBox, Select, Menu)
- Geist Mono for ALL numbers (prices, quantities, IDs, percentages, dates, lead times)
- Three colors only (white/black/blue). Semantic status colors (green/blue/yellow/red/gray) for inquiry status indicators only.
- Spatial glass windows. No sidebar within the module.
- `useWatch()` NEVER `watch()` for React Hook Form
- Motion v12 from `motion/react`
- Arabic-Indic numerals in Arabic context
- State machine enforcement via `validate_state_transition()` for PO status changes
- `isKeyboardDismissDisabled` on confirmation dialogs (PO rejection, close inquiry)
- PO anonymization: coded delivery reference (`HQ-YYYY-NNNN`), never customer name on supplier-facing documents
- Ranking algorithm: price 40% + availability 25% + lead time 20% + reliability 15% -- NOT configurable per user
- Three-way match tolerances: price 0-5%, quantity 0-2%, tax 0% -- from `system_settings` table
- Supplier tiering: Preferred > Approved > Conditional > New -- determines inspection level
- Stock freshness: Fresh (<24h, green), Aging (1-3d, yellow), Stale (>3d, red), Suppressed (>7d)
- Split sourcing: one item from multiple suppliers is supported
- Auto-reminder at 24h before inquiry deadline (configurable)
- 1% withholding tax on goods payments (not UI in this phase, but data awareness needed)

### Claude's Discretion
- Internal routing strategy within the procurement module (tabs vs routes vs both)
- Component decomposition and file organization
- Mock data structure for dev mode
- TanStack Query key naming conventions
- Zustand store shape for procurement-specific state
- Price comparison matrix visual layout (table vs cards vs hybrid)

### Deferred Ideas (OUT OF SCOPE)
- WhatsApp/email/portal notification sending (Phase 27) -- send buttons present but mock the action
- PDF generation for POs (Phase 28)
- AI insights and supplier recommendations (Phase 30)
- Real-time Supabase Realtime subscriptions (Phase 31)
- Actual Supabase database queries (server functions return mock data until connected)
- Withholding tax certificate generation (Phase 20 Finance)
- Supplier portal integration for inquiry responses (supplier responds via Phase 12 portal, this phase shows response status)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PROC-01 | Supplier inquiry builder: multi-supplier, per-item suggested suppliers (score-ranked), email/portal/WhatsApp send | `supplier_inquiries` table exists with `items` JSONB, `response_items` JSONB. `suppliers` table has `on_time_delivery_rate`, `quality_score`, `product_categories[]` for scoring. `source_inventory` has per-supplier-product pricing for "last price" display. Server function `sendSupplierInquiry` creates inquiry records per supplier. 5 inquiry templates defined in spec. |
| PROC-02 | Response tracking: status indicators, auto-reminder at 24h, bulk remind non-responders | `supplier_inquiries.status` (sent/opened/responded/overdue), `response_due_date`, `responded_at`. Status color: gray=sent, blue=opened, green=responded, red=overdue. Auto-reminder is a notification creation (actual sending deferred to Phase 27). `trackInquiryResponses` server function. |
| PROC-03 | Price comparison matrix: per-line supplier comparison, ranking algorithm, split sourcing | Ranking computed server-side in `comparePricing`. `source_inventory` provides `unit_cost`, `lead_time_days`, available qty. `suppliers.on_time_delivery_rate` for reliability. Historical context from `supplier_po_items` (last 5 purchases). Split sourcing tracked as multiple `supplier_po_items` referencing different `supplier_pos` for same `order_item_id`. |
| PROC-04 | PO management: auto-generated from quote acceptance, 10-status flow, three-way match, coded delivery reference | `supplier_pos` table with `supplier_po_status` enum (draft/sent/confirmed/in_production/shipped/partially_received/received/inspected/closed/rejected/cancelled -- 11 statuses, 10-flow excludes cancelled). State machine trigger enforces transitions. `coded_delivery_reference` auto-generated by `generate_coded_delivery_reference()` trigger. Three-way match: compare `supplier_po_items` vs `received_quantity` vs `supplier_invoices` (po_matched, receipt_matched columns). `createPurchaseOrder` server function. |
| PROC-05 | Supplier scorecard: on-time delivery %, fill rate, quality rejection %, response time, tiering | `suppliers` table has `on_time_delivery_rate`, `quality_score`. Fill rate calculated from `supplier_po_items.received_quantity / quantity`. Response time from `supplier_inquiries.responded_at - sent_at`. Tiering (Preferred/Approved/Conditional/New) mapped to `suppliers.is_preferred` + custom logic. `getSupplierScorecard` server function. |
</phase_requirements>

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-aria-components | ^1.16.0 | Tabs, Table, Dialog, ComboBox, Select, Menu, GridList | Mandated by CLAUDE.md. Used in Phase 16. |
| @tanstack/react-table | ^8.21.3 | PO list table, inquiry response table, price comparison matrix, supplier directory | Already in @hyperquote/tables. Headless + React Aria Table. |
| @tanstack/react-query | ^5.95.2 | Server state for all procurement data | Already installed. SSR hydration. |
| react-hook-form | ^7.72.0 | Inquiry builder form, PO edit form | Already in @hyperquote/forms. `useWatch()` for reactive fields. |
| zustand | ^5.0.12 | Procurement module UI state (active tab, filters, selected items) | Already installed. Mirror sales store pattern. |
| motion | ^12.38.0 | Glass modal animations only | Already installed. Spring enter, tween exit. |
| lucide-react | ^1.7.0 | Icons for status, actions, module navigation | Already installed. |
| fuse.js | ^7.1.0 | Supplier search in inquiry builder, command palette | Already installed. |

### No Additional Packages Needed
The entire procurement module can be built with existing dependencies. TanStack Table handles all tabular data (PO list, price comparison matrix, response tracking, supplier directory). React Aria ComboBox for supplier selection. No new packages required.

## Architecture Patterns

### Recommended Project Structure
```
apps/internal/src/
  components/
    procurement/
      ProcurementModule.tsx          # Top-level module (mirrors SalesModule.tsx)
      ProcurementTabStrip.tsx        # Tab navigation (Home, Inquiries, Comparison, POs, Directory, Scorecard)
      ProcurementShortcuts.tsx       # N/G+I/G+P/G+S shortcuts
      home/
        ProcurementHomeView.tsx      # Dashboard: pending inquiries, responses needing review, active POs, performance highlights
        PendingInquiries.tsx         # Inquiry send queue
        ActivePOSummary.tsx          # PO status breakdown
      inquiry/
        InquiryBuilder.tsx           # PROC-01: Multi-supplier inquiry form
        SupplierSelector.tsx         # Per-item supplier selection with score display
        InquiryTemplateSelector.tsx  # 5 template types
        ResponseTracker.tsx          # PROC-02: Status table with indicators
        ResponseStatusBadge.tsx      # Gray/blue/green/red status indicator
      comparison/
        PriceComparisonMatrix.tsx    # PROC-03: Per-line-item supplier comparison
        ComparisonRow.tsx            # Single item comparison across suppliers
        RankingBadge.tsx             # Best price/fastest/partial availability tags
        SplitSourceDialog.tsx        # Split sourcing configuration
        HistoricalPriceContext.tsx   # Last 5 purchases mini-table
      po/
        POList.tsx                   # PROC-04: PO table with filters
        PODetail.tsx                 # Full PO view: items, delivery, three-way match, documents, activity
        POStatusFlow.tsx             # Visual 10-status pipeline
        ThreeWayMatch.tsx            # PO vs Receipt vs Invoice comparison
        PODocuments.tsx              # PO PDF, confirmation, BOL, invoice, inspection reports
      supplier/
        SupplierDirectory.tsx        # Supplier list with search/filter
        SupplierScorecard.tsx        # PROC-05: Per-supplier metrics
        SupplierTierBadge.tsx        # Preferred/Approved/Conditional/New badge
        PerformanceTrend.tsx         # Trend arrows (improving/declining)
      shared/
        FreshnessIndicator.tsx       # Green/yellow/red stock freshness
        DeadlineCountdown.tsx        # Response deadline timer (reuse AgeTimer pattern)
  lib/
    server/
      procurement-inquiries.ts      # sendSupplierInquiry, trackInquiryResponses, remindSuppliers
      procurement-comparison.ts     # comparePricing, getHistoricalPrices
      procurement-po.ts             # createPurchaseOrder, getPOList, getPODetail, updatePOStatus
      procurement-suppliers.ts      # getSupplierDirectory, getSupplierScorecard, getProcurementQueue
  stores/
    procurement.ts                  # Active tab, selected inquiry, PO filters, comparison state
  types/
    procurement.ts                  # TypeScript types for all procurement entities
```

### Pattern 1: Module Registration in ModuleWindow (Lazy Load)
**What:** `ProcurementModule` is lazy-loaded in `ModuleWindow.tsx`, identical to `SalesModule`.
**When to use:** Every internal module.
**Implementation:**
```typescript
// ModuleWindow.tsx addition
const ProcurementModule = lazy(() =>
  import('../procurement/ProcurementModule').then((m) => ({ default: m.ProcurementModule })),
)

// In render:
{moduleId === 'procurement' ? (
  <Suspense fallback={<Spinner />}>
    <ProcurementModule />
  </Suspense>
) : /* ... */}
```

### Pattern 2: Tab-Based Module with Zustand Store
**What:** `ProcurementModule` uses a Zustand store for active tab, mirrors `SalesModule` exactly.
**When to use:** All internal modules with tabbed content.
**Implementation:**
```typescript
// stores/procurement.ts
type ProcurementTab = 'home' | 'inquiries' | 'comparison' | 'po-management' | 'directory' | 'scorecard'

interface ProcurementStore {
  activeTab: ProcurementTab
  setActiveTab: (tab: ProcurementTab) => void
  selectedInquiryId: string | null
  setSelectedInquiryId: (id: string | null) => void
  selectedPOId: string | null
  setSelectedPOId: (id: string | null) => void
  // ... filters
}
```

### Pattern 3: Server Functions with Dev Fallback
**What:** Every server function returns mock data when Supabase is not configured.
**When to use:** All 9 server functions in this phase.
**Example (established in Phase 16):**
```typescript
export const getProcurementQueue = createServerFn()
  .inputValidator(z.object({ status: z.string().optional(), page: z.number().default(1), limit: z.number().default(50) }))
  .handler(async ({ data: input }) => {
    if (!isSupabaseConfigured()) {
      return getMockProcurementQueue(input)
    }
    // Real implementation
  })
```

### Pattern 4: Ranking Algorithm (Server-Side)
**What:** Supplier ranking for price comparison uses weighted scoring computed server-side.
**When to use:** `comparePricing` server function.
**Implementation:**
```typescript
function calculateSupplierRank(
  priceNormalized: number,      // 0-1, lower is better (inverted)
  availabilityScore: number,    // 0-1, 1 = full availability
  leadTimeScore: number,        // 0-1, closer to deadline = higher
  reliabilityScore: number,     // 0-1, from supplier.on_time_delivery_rate
): number {
  return (
    (1 - priceNormalized) * 0.40 +
    availabilityScore * 0.25 +
    leadTimeScore * 0.20 +
    reliabilityScore * 0.15
  )
}
```

### Pattern 5: Three-Way Match Display
**What:** Read-only status comparing PO line items vs received quantities vs supplier invoice line items.
**When to use:** PO detail view.
**Implementation:**
```typescript
type MatchStatus = 'matched' | 'partial' | 'mismatch' | 'pending'

// Per line item:
// PO: supplier_po_items.quantity, unit_cost
// Receipt: supplier_po_items.received_quantity (updated on receiving)
// Invoice: supplier_invoice_items (joined via supplier_po_id)
// Tolerance from system_settings: price 0-5%, qty 0-2%, tax 0%
```

### Anti-Patterns to Avoid
- **Client-side ranking algorithm:** The ranking formula MUST run server-side where supplier data, pricing, and availability are queried together. Never compute in a React component.
- **Hardcoded tolerance thresholds:** Three-way match tolerances come from `system_settings` table. Never hardcode 5%/2%/0%.
- **Exposing customer name to suppliers:** PO delivery references use `coded_delivery_reference` (auto-generated by trigger). Never show customer company name in supplier-facing data.
- **Manual PO number generation:** PO numbers are auto-generated. The `po_number` is set by the server function using `generate_sequence_number()`.
- **Dashboard-style layout:** No KPI cards on canvas. All content inside the glass window.
- **`watch()` instead of `useWatch()`:** Use `useWatch()` exclusively.
- **Fetching all tab data at once:** Lazy-load each tab's data on activation.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Data tables with sort/filter | Custom table sorting | TanStack Table + React Aria Table | Already in @hyperquote/tables. Proven in Phase 16. |
| Supplier search/selection | Custom dropdown with search | React Aria ComboBox | Built-in accessibility, keyboard nav, async loading. |
| PO status transitions | Manual status validation | DB trigger `validate_state_transition()` | Already enforced at DB level. Server function just updates status. |
| Coded delivery reference | Manual HQ-YYYY-NNNN generation | DB trigger `generate_coded_delivery_reference()` | Already exists. Auto-fires on INSERT into supplier_pos. |
| Exchange rate variance check | Manual variance calculation | DB trigger `check_exchange_rate_variance()` | Already exists. Auto-holds POs with >threshold% drift. |
| Three-way match calculation | Client-side comparison | Server function comparing 3 data sources | Requires joins across `supplier_pos`, `supplier_po_items`, `supplier_invoices`. Edge cases: partial receipts, partial invoices, tolerance rules. |
| Countdown timers | Raw Date math | Reuse `DeadlineCountdown` (same pattern as SalesModule `AgeTimer`) | Consistent with Phase 16. Business hours awareness. |
| State machine transitions | Manual status checks | DB trigger `enforce_state_transition()` | Already wired on `supplier_pos`. |

## Common Pitfalls

### Pitfall 1: supplier_inquiries.items is JSONB, Not Relational
**What goes wrong:** Trying to query `supplier_inquiry_items` table that doesn't exist.
**Why it happens:** Expected normalized table structure for inquiry line items.
**How to avoid:** The `supplier_inquiries` table stores items as `JSONB` (both `items` for sent items and `response_items` for supplier responses). This is intentional -- inquiries are lightweight and don't need full relational integrity. Structure the JSONB as:
```json
{ "items": [{ "productId": "...", "productName": "...", "quantity": 10, "uom": "ton", "specs": "..." }] }
{ "response_items": [{ "productId": "...", "unitPrice": 5000, "leadTimeDays": 7, "availableQty": 10, "notes": "" }] }
```
**Warning signs:** Any `supabase.from('supplier_inquiry_items')` call.

### Pitfall 2: PO Status Enum Has 11 Values, Not 10
**What goes wrong:** Building a 10-step flow that misses `cancelled` or `rejected`.
**Why it happens:** The spec says "10-status flow" but the enum has: draft, sent, confirmed, in_production, shipped, partially_received, received, inspected, closed, rejected, cancelled (11 total).
**How to avoid:** The "10-status flow" is the happy path: `Draft -> Sent -> Confirmed -> In Production -> Shipped -> Partially Received -> Received -> Inspected -> Closed`. `Rejected` and `Cancelled` are exception statuses reachable from specific states. Render the 9-step happy-path pipeline visually; show rejected/cancelled as terminal indicators.
**Warning signs:** Missing rejected/cancelled handling in PO status display.

### Pitfall 3: on_quote_accepted Does NOT Create POs
**What goes wrong:** Assuming POs are auto-generated when a quote is accepted.
**Why it happens:** The trigger `on_quote_accepted()` creates an ORDER (not a PO). The spec says "POs auto-generate from quote acceptance" but in practice, procurement reviews the order, runs price comparison, selects suppliers, THEN creates POs.
**How to avoid:** The flow is: Quote Accepted -> Order Created (trigger) -> Order appears in Procurement Queue -> Buyer reviews -> Creates Inquiry -> Gets Responses -> Compares Prices -> Selects Suppliers -> Creates PO(s). The `createPurchaseOrder` server function is called manually after supplier selection. "Auto-generate" means the PO form is pre-populated from the order/comparison data, not that it's created without human action.
**Warning signs:** Auto-creating `supplier_pos` records in the `on_quote_accepted` trigger.

### Pitfall 4: Split Sourcing Creates Multiple POs
**What goes wrong:** Trying to split one PO across multiple suppliers.
**Why it happens:** Misunderstanding "split sourcing."
**How to avoid:** Split sourcing means creating SEPARATE POs for different suppliers. Each PO is one supplier. If Item A is sourced 60% from Supplier X and 40% from Supplier Y, two POs are created. The `order_item_id` appears on `supplier_po_items` in both POs with different quantities.
**Warning signs:** A single PO with multiple `supplier_id` values.

### Pitfall 5: Three-Way Match is Read-Only in This Phase
**What goes wrong:** Building full receiving and invoice matching workflows.
**Why it happens:** Three-way match status is shown in PO detail, but receiving is Phase 19 (Warehouse) and AP invoice matching is Phase 20 (Finance).
**How to avoid:** In Phase 17, three-way match is a STATUS DISPLAY only. Show green/yellow/red indicators based on existing data. The `supplier_po_items.received_quantity` and `supplier_invoices.po_matched` / `receipt_matched` columns are updated by future phases. For now, mock the match status in dev mode.
**Warning signs:** Building receiving workflows or invoice upload in this phase.

### Pitfall 6: Inquiry Status Is TEXT, Not Enum
**What goes wrong:** Trying to use a `supplier_inquiry_status` enum that doesn't exist.
**Why it happens:** The `supplier_inquiries.status` column is `TEXT DEFAULT 'sent'`, not a typed enum.
**How to avoid:** Use string constants in TypeScript: `'sent' | 'opened' | 'responded' | 'overdue' | 'closed'`. Validate in the application layer, not the DB constraint.
**Warning signs:** Looking for `CREATE TYPE supplier_inquiry_status` in migrations.

### Pitfall 7: VAT Calculation Precision
**What goes wrong:** Floating-point rounding errors on 14% VAT in PO totals.
**Why it happens:** JavaScript floating-point arithmetic.
**How to avoid:** Use `Math.round(subtotal * 14) / 100` as established in Phase 12.
**Warning signs:** `subtotal * 0.14` without rounding.

### Pitfall 8: Supplier Scorecard Metrics Are Partially Pre-Computed
**What goes wrong:** Computing all scorecard metrics client-side from raw data.
**Why it happens:** Wanting real-time accuracy.
**How to avoid:** `suppliers.on_time_delivery_rate` and `suppliers.quality_score` are pre-computed columns (updated by future triggers/crons). For fill rate and response time, compute server-side in `getSupplierScorecard` by aggregating `supplier_po_items` and `supplier_inquiries`. Return pre-formatted metrics to the client.
**Warning signs:** Complex aggregation queries in React components.

## Database Schema Notes

### Tables Used by This Phase (all exist in migrations)
| Table | Migration | Key Columns for Procurement |
|-------|-----------|----------------------------|
| `supplier_pos` | 014 | `po_number`, `supplier_id`, `order_id`, `status`, `subtotal`, `total`, `coded_delivery_reference`, `expected_delivery_date`, `inspection_result` |
| `supplier_po_items` | 014 | `supplier_po_id`, `product_id`, `quantity`, `received_quantity`, `rejected_quantity`, `unit_cost`, `line_total` |
| `supplier_inquiries` | 014 | `inquiry_number`, `quote_request_id`, `supplier_id`, `status` (TEXT), `response_due_date`, `items` (JSONB), `response_items` (JSONB) |
| `suppliers` | 010 | `company_name`, `product_categories[]`, `on_time_delivery_rate`, `quality_score`, `average_lead_time_days`, `is_preferred`, `has_portal_access` |
| `supplier_contacts` | 010 | `supplier_id`, `first_name`, `last_name`, `email`, `phone`, `is_primary` |
| `supplier_price_lists` | 010 | `supplier_id`, `effective_date`, `expiry_date`, `status` |
| `source_inventory` | 014 | `supplier_id`, `product_id`, `unit_cost`, `lead_time_days`, `available_quantity`, `confidence` (fresh/aging/stale), `is_suppressed` |
| `supplier_invoices` | 016 | `supplier_po_id`, `po_matched`, `receipt_matched`, `match_discrepancy_notes` |
| `orders` | 013 | `quote_id`, `customer_id`, `status` -- links quote acceptance to procurement queue |
| `order_items` | 013 | `supplier_po_id` -- links order items to POs |

### State Machine: Supplier PO Lifecycle
```
draft -> sent -> confirmed -> in_production -> shipped -> partially_received -> received -> inspected -> closed
                  \-> rejected                                                                         
draft/sent/confirmed/in_production -> cancelled
```
Enforced by `trg_supplier_pos_state` trigger calling `enforce_state_transition()`.

### Business Logic Triggers (Already Exist)
| Trigger | On | Effect |
|---------|------|--------|
| `generate_coded_delivery_reference()` | BEFORE INSERT on `supplier_pos` | Auto-generates `HQ-YYYY-NNNN` reference |
| `check_exchange_rate_variance()` | BEFORE INSERT on `supplier_pos` | Holds PO in draft if exchange rate drifts >threshold% |
| `on_po_confirmed_send_delivery_note()` | AFTER UPDATE on `supplier_pos` | Creates notification when PO status -> confirmed |
| `enforce_state_transition()` | BEFORE UPDATE OF status on `supplier_pos` | Validates state transitions |
| `sync_search_index()` | AFTER INSERT/UPDATE on `supplier_pos` | Updates search_index for command palette |

### Schema Gap: No Dedicated Scorecard Table
Supplier scorecard metrics are partially on `suppliers` (`on_time_delivery_rate`, `quality_score`) but fill rate, response time, and trend data must be computed by aggregating `supplier_po_items` and `supplier_inquiries`. No migration needed -- compute in `getSupplierScorecard` server function. If performance becomes an issue, a materialized view can be added later.

### Schema Gap: No inquiry_group Table
The spec describes sending one inquiry to multiple suppliers simultaneously. The current schema creates one `supplier_inquiries` row per supplier. To track them as a group, use the `quote_request_id` as the grouping key (all inquiries for the same quote request form one logical group). Alternatively, generate a shared `inquiry_batch_id` UUID client-side and store it in the JSONB or as a new column. For now, grouping by `quote_request_id` is sufficient.

## Code Examples

### Procurement Module Shell (Mirror SalesModule)
```typescript
// Source: SalesModule.tsx pattern (Phase 16)
export function ProcurementModule() {
  const { t } = useTranslation('internal')
  const activeTab = useProcurementStore((s) => s.activeTab)

  const tabContent: Record<string, React.ReactNode> = {
    home: <ProcurementHomeView />,
    inquiries: <InquiryBuilder />,
    comparison: <PriceComparisonMatrix />,
    'po-management': <POList />,
    directory: <SupplierDirectory />,
    scorecard: <SupplierScorecard />,
  }

  return (
    <div className="flex flex-col h-full">
      <ProcurementShortcuts />
      <ProcurementTabStrip />
      <div className="flex-1 overflow-auto">
        {tabContent[activeTab] ?? null}
      </div>
    </div>
  )
}
```

### Supplier Ranking Server Function
```typescript
// Source: CONTEXT.md ranking algorithm specification
function rankSupplier(data: {
  unitPrice: number
  minPrice: number
  maxPrice: number
  availableQty: number
  requestedQty: number
  leadTimeDays: number
  deadlineDays: number
  onTimeRate: number // 0-100 from suppliers table
}): number {
  // Price: lower is better (normalize inversely)
  const priceRange = data.maxPrice - data.minPrice || 1
  const priceScore = 1 - (data.unitPrice - data.minPrice) / priceRange

  // Availability: full = 1, partial = ratio, none = 0
  const availabilityScore = Math.min(data.availableQty / data.requestedQty, 1)

  // Lead time: meets deadline = 1, exceeds = proportional penalty
  const leadTimeScore = data.leadTimeDays <= data.deadlineDays
    ? 1
    : Math.max(0, 1 - (data.leadTimeDays - data.deadlineDays) / data.deadlineDays)

  // Reliability: 0-1 from on_time_delivery_rate
  const reliabilityScore = (data.onTimeRate || 50) / 100

  return (
    priceScore * 0.40 +
    availabilityScore * 0.25 +
    leadTimeScore * 0.20 +
    reliabilityScore * 0.15
  )
}
```

### Three-Way Match Status
```typescript
// Source: CONTEXT.md three-way matching spec
type MatchStatus = 'matched' | 'partial_match' | 'mismatch' | 'pending'

interface ThreeWayMatchResult {
  poVsReceipt: MatchStatus   // quantity comparison
  poVsInvoice: MatchStatus   // price comparison
  receiptVsInvoice: MatchStatus  // cross-check
  overall: MatchStatus
  variances: {
    quantityVariance: number  // percentage
    priceVariance: number     // percentage
    taxVariance: number       // percentage
  }
}

function computeMatchStatus(
  poQty: number, receivedQty: number, invoiceQty: number,
  poPrice: number, invoicePrice: number,
  tolerances: { price: number; qty: number; tax: number }
): ThreeWayMatchResult {
  const qtyVariance = Math.abs(receivedQty - poQty) / poQty * 100
  const priceVariance = Math.abs(invoicePrice - poPrice) / poPrice * 100

  return {
    poVsReceipt: qtyVariance <= tolerances.qty ? 'matched' : 'mismatch',
    poVsInvoice: priceVariance <= tolerances.price ? 'matched' : 'mismatch',
    receiptVsInvoice: receivedQty === 0 ? 'pending' : 'matched',
    overall: /* compute from above */,
    variances: { quantityVariance: qtyVariance, priceVariance: priceVariance, taxVariance: 0 }
  }
}
```

### Response Status Badge
```typescript
// Source: CONTEXT.md Section 2.3 status indicators
const STATUS_COLORS: Record<string, string> = {
  sent: 'bg-black/10 text-black/60 dark:bg-white/10 dark:text-white/60',      // gray
  opened: 'bg-[#2563EB]/10 text-[#2563EB]',                                    // blue
  responded: 'bg-green-500/10 text-green-600 dark:text-green-400',              // green
  overdue: 'bg-red-500/10 text-red-600 dark:text-red-400',                      // red
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `framer-motion` | `motion/react` v12 | Rename in v12 | Import path change only |
| `zodResolver` | `standardSchemaResolver` | hookform/resolvers 5.x | Works with Standard Schema |
| `watch()` in RHF | `useWatch()` | React 19 compiler | `watch()` broken with React 19 |
| Separate DnD library | React Aria `useDragAndDrop` | React Aria 1.x stable | No extra dependency needed |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 (jsdom environment) |
| Config file | `apps/internal/vitest.config.ts` |
| Quick run command | `cd apps/internal && bun run vitest run --reporter=verbose` |
| Full suite command | `cd apps/internal && bun run vitest run` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PROC-01 | Supplier suggestion scoring, inquiry form validation, multi-supplier selection | unit | `bun run vitest run src/__tests__/inquiry-builder.test.ts` | Wave 0 |
| PROC-02 | Status indicator mapping, overdue detection, bulk remind logic | unit | `bun run vitest run src/__tests__/response-tracking.test.ts` | Wave 0 |
| PROC-03 | Ranking algorithm (40/25/20/15 weights), split sourcing quantity validation, price normalization | unit | `bun run vitest run src/__tests__/price-comparison.test.ts` | Wave 0 |
| PROC-04 | PO status flow validation, three-way match tolerance calculation, coded reference format | unit | `bun run vitest run src/__tests__/po-management.test.ts` | Wave 0 |
| PROC-05 | Scorecard metric computation (fill rate, response time), tier mapping | unit | `bun run vitest run src/__tests__/supplier-scorecard.test.ts` | Wave 0 |

### Sampling Rate
- **Per task commit:** `cd apps/internal && bun run vitest run --reporter=verbose`
- **Per wave merge:** Full suite across all test files
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/__tests__/inquiry-builder.test.ts` -- covers PROC-01 supplier scoring and form validation
- [ ] `src/__tests__/price-comparison.test.ts` -- covers PROC-03 ranking algorithm math
- [ ] `src/__tests__/po-management.test.ts` -- covers PROC-04 status flow and three-way match
- [ ] `src/__tests__/supplier-scorecard.test.ts` -- covers PROC-05 metric computation

## Project Constraints (from CLAUDE.md)

- **Architecture:** TanStack Start, React Aria, Motion v12, Bun, Cloudflare Workers. NO Next.js, shadcn, framer-motion, npm, Vercel.
- **Code:** `useWatch()` never `watch()`. `.inputValidator()` not `.validator()`. Colors in `:root {}` never `@theme`. `ClientOnly` for maps. `isKeyboardDismissDisabled` on Dialogs.
- **Design:** Three colors only (white/black/blue #2563EB). Spatial glass. Geist Mono for ALL numbers.
- **Egyptian law:** 14% VAT. Sun-Thu work week. Wire/cheque/cash/LC only. Cairo truck ban 6AM-midnight. Arabic-Indic numerals.
- **Quality:** "Fix all" means fix ALL. Verify ALL tiers. Fix from the root, never patch over symptoms.
- **Tailwind v4:** `@tailwindcss/vite` required. Colors in `:root {}`. `@plugin` for React Aria. Logical properties (`ps-4` not `pl-4`).
- **Testing:** `bun run vitest` (not `bun test`). Vitest browser mode for React Aria accessibility.

## Open Questions

1. **Inquiry Grouping Strategy**
   - What we know: One `supplier_inquiries` row per supplier. They share `quote_request_id` when triggered from a quote.
   - What's unclear: For proactive sourcing (not linked to a quote), how to group inquiries sent together?
   - Recommendation: Generate a `batch_id` UUID client-side and pass it to all inquiries in one send action. Store as a field in the JSONB metadata or add a nullable `batch_id` column in a migration if needed. For now, the UI can generate and track this client-side.

2. **Supplier Tier Persistence**
   - What we know: `suppliers.is_preferred` is a boolean. The spec defines 4 tiers.
   - What's unclear: Should we add a `supplier_tier` enum column or compute tier from metrics?
   - Recommendation: Compute tier from scorecard metrics in the server function. `is_preferred` = true maps to "Preferred" tier. Compute Approved/Conditional/New from `quality_score` and `on_time_delivery_rate` thresholds. No migration needed for now.

3. **Historical Price Context Source**
   - What we know: Spec says "last 5 purchases of this item (supplier, price, delivery performance)."
   - What's unclear: Source is `supplier_po_items` joined to `supplier_pos` -- but all data is mock in dev mode.
   - Recommendation: Mock 5 historical entries per product in `getHistoricalPrices` server function. Structure is straightforward once Supabase is connected.

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `supabase/migrations/014` -- supplier_pos, supplier_po_items, supplier_inquiries tables verified
- Codebase analysis: `supabase/migrations/010` -- suppliers, supplier_contacts, supplier_price_lists, supplier_agreements tables verified
- Codebase analysis: `supabase/migrations/016` -- supplier_invoices table verified (three-way match columns)
- Codebase analysis: `supabase/migrations/018` -- state machine transitions for supplier_po verified
- Codebase analysis: `supabase/migrations/023` -- business logic triggers (coded ref, exchange rate, confirmation notification) verified
- Codebase analysis: `apps/internal/src/components/sales/SalesModule.tsx` -- module pattern verified
- Codebase analysis: `apps/internal/src/components/shell/ModuleWindow.tsx` -- lazy loading pattern verified
- Codebase analysis: `apps/internal/src/stores/sales.ts` -- Zustand store pattern verified
- Codebase analysis: `apps/internal/src/lib/server/sales-rfq.ts` -- server function + mock data pattern verified
- CONTEXT.md (17-CONTEXT.md) -- all spec references from FRONTEND.md MODULE 2

### Secondary (MEDIUM confidence)
- None needed. All findings from codebase analysis.

### Tertiary (LOW confidence)
- None. All findings verified against codebase.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all packages already installed and used in Phase 16
- Architecture: HIGH -- patterns directly mirror Phase 16 SalesModule, proven and working
- Database schema: HIGH -- all migrations read and verified, triggers confirmed
- Pitfalls: HIGH -- identified from schema analysis (JSONB items, TEXT status, 11 vs 10 statuses, no auto-PO creation)
- Business logic: HIGH -- three-way match, ranking algorithm, and PO lifecycle verified against spec + triggers

**Research date:** 2026-04-05
**Valid until:** 2026-05-05 (stable -- no external dependency changes expected)
