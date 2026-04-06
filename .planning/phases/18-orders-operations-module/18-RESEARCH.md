# Phase 18: Orders/Operations Module - Research

**Researched:** 2026-04-05
**Domain:** Internal platform orders/operations module -- fulfillment kanban, order detail, operations dashboard, SLA tracking, cross-module handoff
**Confidence:** HIGH

## Summary

Phase 18 builds the orders/operations module inside the internal platform shell. The module comprises 5 major views: Fulfillment Kanban (6 columns), Order Detail (per-line-item tracking + progress + activity log), Delivery Schedule (calendar/timeline), Operations Dashboard (metrics + bottleneck pipeline + SLA tracker), and Cross-Module Handoff Status (inside Order Detail). All views render inside the existing `ModuleWindow` glass window with `moduleId: 'orders'` and hotkey `O`.

The database schema is already complete. The `orders`, `order_items`, `supplier_pos`, `deliveries`, `delivery_items`, and `notifications` tables all exist with RLS, triggers, and state machine enforcement via `validate_state_transition()`. The order state machine has 9 states (confirmed -> processing -> partially_fulfilled -> fulfilled -> completed / on_hold / cancellation_requested / back_ordered / cancelled). The supplier PO state machine has 11 states. The delivery state machine has 11 states. All transitions are enforced by DB triggers.

The existing Sales and Procurement modules (Phases 16-17) establish the exact pattern: Zustand store for tab navigation + module-specific UI state, React Aria Tabs for sub-navigation, `createServerFn` with mock data fallback, React Aria `GridList` + `useDragAndDrop` for kanban, and i18n via `useTranslation('internal')` with inline fallback strings.

**Primary recommendation:** Follow the Sales/Procurement module patterns exactly. Fulfillment Kanban reuses the same `GridList` + `useDragAndDrop` pattern from `KanbanColumn.tsx` (Phase 16). The Operations Dashboard is a scrollable view inside the module, NOT a separate dashboard -- metrics, bottleneck pipeline, and SLA tracker stack vertically. The "Nudge" button creates a notification record in the `notifications` table. Dev-mode mock data for all server functions.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- React Aria DragAndDrop for kanban (not react-beautiful-dnd or dnd-kit)
- State machine transitions MUST go through `validate_state_transition()`. No jumping states.
- React Aria Dialog + hotkeys conflict: use `isKeyboardDismissDisabled`
- Three colors only (white/black/blue). Semantic status colors for DATA only.
- Spatial glass, not dashboards. Module opens inside a glass window.
- Geist Mono for ALL numbers (order values, counts, SLA timers, percentages, dates).
- `useWatch()` NEVER `watch()` for React Hook Form.
- Motion v12 from `motion/react`.
- Arabic-Indic numerals in Arabic context.
- Kanban performance: virtualize columns if > 50 cards per column.
- Operations dashboard metric cards should use the exact CSS spec from FRONTEND.md 3.4.
- SLA tracker is a React Aria Table with proper sorting and filtering.
- Cross-module handoff is an expandable section inside Order Detail, not a separate screen.
- The "Nudge" button creates an in-app notification -- integrate with Supabase Realtime.
- Calendar view toggle is a secondary view of the kanban data, not a separate data source.

### Claude's Discretion
- Internal routing strategy within the operations module (tabs vs routes vs both)
- Component decomposition and file organization
- Mock data structure for dev mode
- TanStack Query key naming conventions
- Zustand store shape for operations-specific state

### Deferred Ideas (OUT OF SCOPE)
- WhatsApp/email notification sending (Phase 27)
- PDF generation for delivery notes (Phase 28)
- AI insights and predictions (Phase 30)
- Real-time Supabase Realtime subscriptions (Phase 31)
- Actual Supabase database queries (server functions return mock data until connected)
- Route planning and optimization (Phase 21 - Dispatch Module)
- GPS tracking integration (Phase 21)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| OPS-01 | Fulfillment kanban: 6 columns (PO Placed -> In Transit -> At Warehouse -> Preparing -> Out for Delivery -> Delivered) with drag-and-drop | Reuse `GridList` + `useDragAndDrop` pattern from Phase 16 `KanbanColumn.tsx`. 6 fulfillment columns map to supplier_po_status + delivery_status composite. Each card shows order number, customer, value (Geist Mono), item count, ETA, color status. Drag between columns triggers `updateOrderStatus` server function with confirmation dialog. |
| OPS-02 | Order detail: per-line-item status, overall progress bar, documents, activity log | Split layout. `order_items` table provides per-line data with `fulfilled_quantity` vs `quantity` for progress. Progress bar = `fulfilled_items / total_items` from `orders` table. Activity log reads from `audit_log` partitioned table. Documents section links to `documents` table entries. Actions: Schedule Delivery, Split Delivery, Hold Order, Cancel Order -- all with confirmation dialogs. |
| OPS-03 | Operations dashboard: 4 metric cards, bottleneck pipeline visualization, SLA tracker (5 SLA types), cross-module handoff status with "Nudge" button | Metric cards use exact FRONTEND.md 3.4 CSS spec. Bottleneck pipeline is a horizontal 4-stage visualization (Procurement -> Warehouse -> Dispatch -> Delivery) with click-to-filter. SLA tracker is React Aria `Table` with sorting by urgency. Cross-module handoff is a horizontal step indicator inside Order Detail (expandable section). Nudge button creates `notifications` record. |
</phase_requirements>

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-aria-components | ^1.16.0 | GridList, useDragAndDrop, Table, Tabs, Dialog | Mandated by CLAUDE.md. Built-in accessible DnD. |
| @tanstack/react-query | ^5.95.2 | Server state for all operations data | Already installed. SSR hydration via @tanstack/react-router-ssr-query. |
| zustand | ^5.0.12 | Operations module UI state (active tab, kanban filters, selected order) | Already installed. Create `useOperationsStore`. |
| motion | ^12.38.0 | Glass modal animations only | Already installed. Spring enter, tween exit. |
| lucide-react | ^1.7.0 | Icons: TrendingUp/Down, ChevronRight, Bell, ClipboardList, etc. | Already installed. |

### No Additional Packages Needed
The entire operations module can be built with existing dependencies. The kanban board reuses the exact same React Aria `GridList` + `useDragAndDrop` pattern from the Sales Pipeline. The SLA tracker uses React Aria `Table`. Bottleneck pipeline is pure CSS + HTML. No new packages required.

## Architecture Patterns

### Recommended Project Structure
```
apps/internal/src/
  components/
    operations/
      OperationsModule.tsx          # Module root (tab switcher)
      OperationsTabStrip.tsx        # React Aria Tabs
      OperationsShortcuts.tsx       # Module-specific hotkeys
      dashboard/
        OperationsDashboard.tsx     # OPS-03 home view (metrics + bottleneck + SLA)
        MetricCards.tsx             # 4 metric cards (exact FRONTEND.md 3.4 spec)
        BottleneckPipeline.tsx      # Horizontal pipeline visualization
        BottleneckStageDetail.tsx   # Filtered list for clicked stage
        SLATracker.tsx              # React Aria Table with SLA rows
      kanban/
        FulfillmentKanban.tsx       # OPS-01 board container
        FulfillmentColumn.tsx       # Per-column with GridList + DnD
        FulfillmentCard.tsx         # Order card in kanban
        KanbanFilters.tsx           # Filter bar (customer, date, method, status)
      order-detail/
        OrderDetailView.tsx         # OPS-02 main view
        OrderLineItems.tsx          # Per-line-item status table
        OrderProgressBar.tsx        # Overall fulfillment progress
        OrderTimeline.tsx           # Visual Gantt-style milestones
        OrderDocuments.tsx          # Linked documents list
        OrderActivityLog.tsx        # Audit trail / activity feed
        OrderActions.tsx            # Schedule, Split, Hold, Cancel buttons
        CrossModuleHandoff.tsx      # Horizontal step indicator + Nudge
      delivery/
        DeliverySchedule.tsx        # Calendar/timeline view
  stores/
    operations.ts                   # Zustand store
  types/
    operations.ts                   # TypeScript types
  lib/
    server/
      operations-orders.ts          # getOrderBoard, getOrderDetail, updateOrderStatus
      operations-delivery.ts        # getDeliverySchedule, scheduleDelivery
      operations-dashboard.ts       # getOperationsDashboard, getSLAItems
      operations-actions.ts         # splitOrder, holdOrder, cancelOrder, nudge
```

### Pattern 1: Module Registration in ModuleWindow
**What:** Add operations module to the `ModuleWindow` lazy import chain.
**When:** Module shell renders.
**Example:**
```typescript
// In ModuleWindow.tsx -- add alongside SalesModule and ProcurementModule
const OperationsModule = lazy(() =>
  import('../operations/OperationsModule').then((m) => ({ default: m.OperationsModule })),
)

// In the render switch:
moduleId === 'orders' ? (
  <Suspense fallback={<Spinner />}>
    <OperationsModule />
  </Suspense>
) : ...
```

### Pattern 2: Fulfillment Kanban Column Mapping
**What:** The CONTEXT.md specifies 6 columns that don't map 1:1 to any single enum. They represent a composite fulfillment view across supplier_po_status + delivery_status.
**Mapping:**

| Kanban Column | DB Status Source |
|---------------|-----------------|
| PO Placed | supplier_pos.status IN ('draft', 'sent') |
| In Transit from Supplier | supplier_pos.status IN ('confirmed', 'in_production', 'shipped') |
| At Warehouse | supplier_pos.status IN ('received', 'inspected') |
| Preparing / Loading | deliveries.status IN ('scheduled', 'picking_loading') |
| Out for Delivery | deliveries.status IN ('dispatched', 'in_transit', 'at_site') |
| Delivered | deliveries.status = 'delivered' |

**Key insight:** The kanban is ORDER-centric but the column placement is derived from the aggregate status of supplier POs and deliveries linked to that order. An order with mixed-status items appears in the earliest incomplete column. The server function `getOrderBoard` must compute this composite status.

### Pattern 3: SLA Time Remaining Calculation
**What:** Reuse the existing `calculateBusinessTimeRemaining()` from `SLACountdown.tsx` (Phase 16).
**SLA types for this module:**

| SLA Type | Duration | Triggered By |
|----------|----------|--------------|
| Quote response | 4h business | RFQ submission |
| PO confirmation | 24h business | PO sent to supplier |
| Delivery scheduling | 48h before promise date | Order confirmed |
| Invoice generation | 24h business | Delivery confirmed |
| Dispute resolution | 72h business | Dispute created |

### Pattern 4: Metric Card CSS (Exact FRONTEND.md 3.4)
**What:** Each metric card follows a precise spec.
```typescript
// Card container
<div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 h-20 flex flex-col justify-between">
  <span className="text-[11px] font-normal text-black/50 dark:text-white/50">
    {label}
  </span>
  <div className="flex items-end gap-2">
    <span className="font-[family-name:var(--font-geist-mono)] text-2xl font-semibold">
      {value}
    </span>
    {/* Trend arrow for "Orders in progress" */}
    <TrendingUp size={14} className="text-green-600" />
    <span className="text-[11px] font-normal text-black/40 dark:text-white/40">
      vs last week
    </span>
  </div>
</div>
```

### Pattern 5: Cross-Module Handoff Step Indicator
**What:** Horizontal step indicator showing order ownership through 6 stages.
**Stages:** Sales (quote) -> Procurement (POs) -> Warehouse (receiving) -> Dispatch (scheduling) -> Driver (delivering) -> Finance (invoicing)
**Visual:** Current = blue filled circle + bold label. Completed = green checkmark. Future = gray outline.
**Stuck detection:** If time in current stage exceeds SLA, show amber/red warning banner.
**Nudge:** `Bell` icon + "Nudge" text, outline button, 32px height. Creates `notifications` record targeting the responsible person.

### Anti-Patterns to Avoid
- **Dashboard layout:** The operations dashboard renders INSIDE the glass window, not as a separate dashboard page. It's a scrollable vertical stack of sections.
- **Direct status jumping:** All status transitions go through `validate_state_transition()`. The UI must only offer valid next states.
- **Hardcoded SLA thresholds:** SLA durations should come from configuration (seed data or system_settings), not hardcoded constants. For now, use constants in mock data but structure the code so they're easily configurable.
- **Mixing order status with fulfillment column:** The kanban columns represent FULFILLMENT stage (supply chain progress), not order status. An order can be `processing` while its items span multiple fulfillment columns.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Drag-and-drop kanban | Custom DnD with pointer events | React Aria `useDragAndDrop` + `GridList` | Accessibility, keyboard DnD, drop indicators built-in |
| SLA business time calculation | Custom time math | Existing `calculateBusinessTimeRemaining()` from Phase 16 | Already handles Egyptian weekends (Fri/Sat), business hours |
| State machine validation | Client-side state checks | `validate_state_transition()` DB trigger | Server-enforced, impossible to bypass |
| Tabular data (SLA tracker) | Custom table with sort | React Aria `Table` with `useAsyncList` or manual sort state | Built-in keyboard nav, sort indicators, accessibility |
| Module tab navigation | Custom tab system | React Aria `Tabs` with Zustand store (existing pattern) | Consistent with Sales/Procurement modules |

**Key insight:** This module has zero novel UI patterns. Every component reuses patterns already built in Phases 15-17. The complexity is in the data model (composite fulfillment status across POs + deliveries) and the operations-specific business rules (SLA types, bottleneck detection, handoff protocols).

## Common Pitfalls

### Pitfall 1: Kanban Column != Order Status
**What goes wrong:** Implementing kanban columns as direct mappings to `order_status` enum values.
**Why it happens:** The 6 fulfillment columns don't match the 9 order statuses. They represent supply chain progress across multiple tables.
**How to avoid:** The `getOrderBoard` server function must compute a `fulfillmentStage` from the aggregate of supplier_po + delivery statuses for each order. One order can have items in multiple stages -- the card appears in the earliest incomplete stage.
**Warning signs:** Kanban showing orders with no items in a column, or orders stuck in "PO Placed" when supplier has already shipped.

### Pitfall 2: Drag-and-Drop Confirmation Required
**What goes wrong:** Drag-and-drop moves orders without confirmation, bypassing state machine validation.
**Why it happens:** The Sales Pipeline kanban has confirmation only for critical stages (won/lost). The fulfillment kanban needs confirmation for ALL moves because each represents a physical operations step.
**How to avoid:** Every kanban drag triggers a confirmation dialog with notes field. The dialog calls `updateOrderStatus` which validates the transition server-side.
**Warning signs:** Orders moving backwards in the pipeline, orders skipping stages.

### Pitfall 3: SLA Tracker Urgency Sorting
**What goes wrong:** SLA items sorted alphabetically or by creation date instead of urgency.
**Why it happens:** Default table sort doesn't account for the three-tier urgency system.
**How to avoid:** Sort order: breached first (red), then at-risk (yellow, sorted by time remaining ascending), then on-track (green). This is the default sort -- user can override.
**Warning signs:** Breached SLAs buried below on-track items.

### Pitfall 4: Bottleneck Detection Logic
**What goes wrong:** Counting all orders in a stage as "stuck" regardless of time.
**Why it happens:** Confusing "items in stage" with "items stuck in stage."
**How to avoid:** "Stuck" = items that have been in a stage > 24 hours (configurable). The bottleneck stage is the one with the most stuck items, not the most total items.
**Warning signs:** Bottleneck always showing the stage with the most orders (which is expected behavior for some stages).

### Pitfall 5: Cross-Module Handoff Owner Resolution
**What goes wrong:** Handoff shows "Waiting on Warehouse" but doesn't identify the specific person.
**Why it happens:** Ownership is at the department level, not person level.
**How to avoid:** Each order should have an `assigned_ops_coordinator` (already in schema). For other departments, look up the department manager or the specific employee assigned to the linked entity (e.g., the warehouse receiver for the linked PO).
**Warning signs:** Nudge button not knowing who to notify.

## Code Examples

### Fulfillment Kanban Card
```typescript
// Source: Pattern from apps/internal/src/components/sales/pipeline/KanbanCard.tsx
interface FulfillmentCardProps {
  order: FulfillmentOrder
  onSelect: (order: FulfillmentOrder) => void
}

function getStatusColor(color: 'green' | 'yellow' | 'red'): string {
  switch (color) {
    case 'green': return 'border-s-green-500'
    case 'yellow': return 'border-s-yellow-500'
    case 'red': return 'border-s-red-500'
  }
}

export function FulfillmentCard({ order, onSelect }: FulfillmentCardProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(order)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect(order)
        }
      }}
      className={`cursor-pointer rounded-lg border border-s-4 border-black/10 bg-white p-3 transition-shadow hover:shadow-md dark:border-white/10 dark:bg-black/40 ${getStatusColor(order.color)}`}
    >
      {/* Order number + customer */}
      <div className="mb-1 flex items-center justify-between">
        <span className="font-[family-name:var(--font-geist-mono)] text-xs font-medium">
          {order.orderNumber}
        </span>
      </div>
      <span className="truncate text-sm font-medium">{order.customerName}</span>

      {/* Value */}
      <div className="mt-1 font-[family-name:var(--font-geist-mono)] text-sm font-semibold">
        {formatEGP(order.totalValue)}
      </div>

      {/* Item readiness */}
      <p className="mt-1 text-xs text-black/50 dark:text-white/50">
        {order.readyItems} of {order.totalItems} items ready
      </p>

      {/* ETA */}
      <div className="mt-2 flex items-center justify-between">
        <span className="font-[family-name:var(--font-geist-mono)] text-xs text-black/40 dark:text-white/40">
          ETA: {order.eta}
        </span>
      </div>
    </div>
  )
}
```

### Operations Dashboard Metric Card
```typescript
// Source: FRONTEND.md Section 3.4 exact spec
import { TrendingUp, TrendingDown } from 'lucide-react'

interface MetricCardProps {
  label: string
  value: string | number
  trend?: { direction: 'up' | 'down'; label: string }
  valueColor?: string
  subtitle?: React.ReactNode
}

export function MetricCard({ label, value, trend, valueColor, subtitle }: MetricCardProps) {
  const TrendIcon = trend?.direction === 'up' ? TrendingUp : TrendingDown
  const trendColor = trend?.direction === 'up' ? 'text-green-600' : 'text-red-600'

  return (
    <div className="flex h-20 flex-col justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
      <div className="flex items-center gap-2">
        <span className={`font-[family-name:var(--font-geist-mono)] text-2xl font-semibold ${valueColor ?? ''}`}>
          {value}
        </span>
        {trend && (
          <>
            <TrendIcon size={14} className={trendColor} />
            <span className="text-[11px] font-normal text-black/40 dark:text-white/40">
              {trend.label}
            </span>
          </>
        )}
      </div>
      {subtitle}
    </div>
  )
}
```

### SLA Tracker Row Color Logic
```typescript
// Source: FRONTEND.md Section 3.4 SLA Tracker spec
function getSLAStatusBadge(status: 'on_track' | 'at_risk' | 'breached') {
  switch (status) {
    case 'on_track': return { label: 'On Track', className: 'bg-green-100 text-green-700' }
    case 'at_risk': return { label: 'At Risk', className: 'bg-yellow-100 text-yellow-700' }
    case 'breached': return { label: 'Breached', className: 'bg-red-100 text-red-700' }
  }
}

function getTimeRemainingColor(remainingMs: number, totalMs: number): string {
  if (remainingMs <= 0) return 'text-red-600'
  const ratio = remainingMs / totalMs
  if (ratio < 0.25) return 'text-red-600'
  if (ratio < 0.5) return 'text-yellow-600'
  return 'text-green-600'
}

function computeSLAStatus(remainingMs: number, totalMs: number): 'on_track' | 'at_risk' | 'breached' {
  if (remainingMs <= 0) return 'breached'
  const ratio = remainingMs / totalMs
  if (ratio < 0.5) return 'at_risk'  // 25-50% spec says at_risk, but check: "25-50% time remaining"
  return 'on_track'
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| react-beautiful-dnd | React Aria useDragAndDrop | 2024 (react-beautiful-dnd deprecated) | Built-in accessibility, no extra dependency |
| Separate dashboard app | Operations dashboard inside glass window | Project decision | No dashboard-style layouts |
| Polling for SLA updates | Supabase Realtime (Phase 31) | Deferred | For now, TanStack Query refetch on window focus |

## Open Questions

1. **Calendar view implementation**
   - What we know: FRONTEND.md 3.1 mentions "Calendar view toggle" for deliveries on a timeline
   - What's unclear: Whether to use a third-party calendar component or build a simple timeline grid
   - Recommendation: Build a simple week/month grid view with delivery cards positioned by date. No external calendar library needed. This is a secondary view toggle, not a full calendar app.

2. **Bottleneck pipeline data source**
   - What we know: The pipeline shows 4 stages (Procurement -> Warehouse -> Dispatch -> Delivery) with item counts and average dwell time
   - What's unclear: Whether dwell time should be pre-computed in a materialized view or calculated on-the-fly
   - Recommendation: Calculate in the `getOperationsDashboard` server function using mock data for now. When Supabase is connected, this can use the `ceo_attention_items` materialized view or a dedicated query.

3. **Delivery Schedule vs. Dispatch Module overlap**
   - What we know: Delivery Schedule (3.3) shows calendar of upcoming deliveries with drag-to-reschedule
   - What's unclear: How much of this overlaps with Phase 21 (Dispatch Module)
   - Recommendation: Build the read-only schedule view + basic reschedule in Phase 18. Phase 21 adds route optimization, GPS, and advanced dispatch features.

## Project Constraints (from CLAUDE.md)

- **Three colors only:** White (#FFFFFF), Black (#0F172A), Blue (#2563EB). Green/yellow/red for data status only.
- **Geist Mono for ALL numbers:** Order values, counts, percentages, SLA timers, dates, reference numbers.
- **React Aria Components, NOT shadcn:** Table, Tabs, Dialog, GridList, useDragAndDrop.
- **Motion v12:** Import from `motion/react`. Spring enter (stiffness 200, damping 20), tween exit (200ms easeIn).
- **`useWatch()` NEVER `watch()`:** For any React Hook Form usage.
- **Colors in `:root {}`, NEVER `@theme`.**
- **Arabic-Indic numerals:** All numbers in Arabic context via `Intl.NumberFormat('ar-EG')`.
- **Logical properties:** `ps-4` not `pl-4`, `me-2` not `mr-2`.
- **isKeyboardDismissDisabled:** On all confirmation dialogs (cancel order, hold order, drag confirmation).
- **State machine transitions:** Via `validate_state_transition()`. UI only offers valid next states.
- **Egyptian business hours:** Sun-Thu, 9:00-18:00. SLA timers account for this.
- **Bun, not npm.** `bun install`, `bun run dev`.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest ^4.1.2 |
| Config file | apps/internal/vitest.config.ts (or Wave 0 if missing) |
| Quick run command | `bun run test --filter=internal` |
| Full suite command | `bun run test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| OPS-01 | Kanban renders 6 columns, cards display correct data, DnD triggers confirmation | unit | `bun vitest apps/internal/src/__tests__/fulfillment-kanban.test.ts --run` | Wave 0 |
| OPS-02 | Order detail shows line items, progress bar, activity log | unit | `bun vitest apps/internal/src/__tests__/order-detail.test.ts --run` | Wave 0 |
| OPS-03 | Dashboard metrics render, SLA tracker sorts by urgency, Nudge creates notification | unit | `bun vitest apps/internal/src/__tests__/operations-dashboard.test.ts --run` | Wave 0 |

### Sampling Rate
- **Per task commit:** `bun vitest --run apps/internal/src/__tests__/fulfillment-kanban.test.ts apps/internal/src/__tests__/order-detail.test.ts apps/internal/src/__tests__/operations-dashboard.test.ts`
- **Per wave merge:** `bun run test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `apps/internal/src/__tests__/fulfillment-kanban.test.ts` -- covers OPS-01
- [ ] `apps/internal/src/__tests__/order-detail.test.ts` -- covers OPS-02
- [ ] `apps/internal/src/__tests__/operations-dashboard.test.ts` -- covers OPS-03
- [ ] Vitest config for internal app if not already present

## Sources

### Primary (HIGH confidence)
- Codebase inspection: `apps/internal/src/components/sales/pipeline/KanbanColumn.tsx` -- existing kanban DnD pattern
- Codebase inspection: `apps/internal/src/components/sales/pipeline/KanbanCard.tsx` -- card rendering pattern
- Codebase inspection: `apps/internal/src/components/sales/SalesModule.tsx` -- module structure pattern
- Codebase inspection: `apps/internal/src/stores/sales.ts` -- Zustand store pattern
- Codebase inspection: `apps/internal/src/components/shell/ModuleWindow.tsx` -- module registration pattern
- Codebase inspection: `supabase/migrations/20260401000013_quotes_orders.sql` -- orders/order_items schema
- Codebase inspection: `supabase/migrations/20260401000014_procurement_inventory.sql` -- supplier_pos schema
- Codebase inspection: `supabase/migrations/20260401000015_delivery.sql` -- deliveries schema
- Codebase inspection: `supabase/migrations/20260401000018_state_machine.sql` -- all state machine transitions
- Codebase inspection: `supabase/migrations/20260331000002_enums.sql` -- order_status, supplier_po_status, delivery_status enums
- CONTEXT.md: Phase 18 user decisions and spec references

### Secondary (MEDIUM confidence)
- FRONTEND.md Section 3.1-3.5 spec (referenced in CONTEXT.md, not directly read but spec details copied there)

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Exact same stack as Phases 16-17, no new packages
- Architecture: HIGH - Follows established module pattern (Sales, Procurement)
- Pitfalls: HIGH - Based on direct schema analysis and spec interpretation

**Research date:** 2026-04-05
**Valid until:** 2026-05-05 (stable -- no external dependencies, all patterns established)
