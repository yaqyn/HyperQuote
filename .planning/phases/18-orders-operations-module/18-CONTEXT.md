# Phase 18: Orders/Operations Module

## Goal
Operations team has visibility into fulfillment status across all orders with bottleneck detection and SLA tracking.

## Dependencies
- Phase 15 (Internal Platform Shell) must be complete
- Phase 13-14 (Database tables) must be complete — orders, order_items, deliveries, supplier_pos tables
- Phase 3 (Shared Packages) must be complete

## Requirements

- **OPS-01**: Fulfillment kanban: 6 columns (PO Placed -> In Transit -> At Warehouse -> Preparing -> Out for Delivery -> Delivered)
- **OPS-02**: Order detail: per-line-item status, overall progress bar, documents, activity log
- **OPS-03**: Operations dashboard: 4 metric cards, bottleneck pipeline visualization, SLA tracker (5 SLA types), cross-module handoff status with "Nudge" button

## Success Criteria
1. Fulfillment kanban shows 6 columns (PO Placed through Delivered) with drag-and-drop
2. Order detail shows per-line-item status, overall progress bar, and activity log
3. Operations dashboard shows 4 metric cards, bottleneck pipeline, 5 SLA types, and cross-module "Nudge" button

## What to Build
Fulfillment kanban, order detail, delivery schedule, operations dashboard, bottleneck view, SLA tracker, cross-module handoff status.

## Spec References

### FRONTEND.md — MODULE 3: ORDERS / OPERATIONS (Full Spec)

**Primary users:** Operations Manager, Logistics Coordinator, Warehouse Manager
**Hotkey:** `O`

#### 3.1 Fulfillment Kanban Board

**Main view:** Kanban columns representing order fulfillment stages:

| Column | Meaning |
|--------|---------|
| PO Placed | Supplier POs sent, awaiting confirmation |
| In Transit from Supplier | Goods shipped by supplier |
| At Warehouse | Received, inspected, ready for consolidation |
| Preparing / Loading | Being picked, staged, loaded |
| Out for Delivery | On truck, in transit to customer |
| Delivered | POD confirmed |

**Each card:**
- Order number, customer name, total value (Geist Mono)
- Item count + ready count ("3 of 5 items ready")
- ETA / delivery date
- Color: green=on track, yellow=at risk (behind schedule), red=problem (delay, damage)
- Drag between columns for manual status update (with confirmation)

**Filters:** customer, date range, delivery method, status
**Calendar view toggle:** see deliveries on a timeline

#### 3.2 Order Detail

- Full order information: SO number, customer, quote reference, value, status
- Per-line-item status: item, supplier, PO number, status (Pending PO / PO Sent / Confirmed / Manufacturing / Shipped / Received / Ready / Delivered), ETA
- Overall progress bar: X% complete
- Timeline: visual Gantt-style with milestones
- Documents: all generated documents (invoice, proforma, delivery note, POs)
- Activity log: every status change with timestamps

**Actions:**
- `[Schedule Delivery]` -- opens dispatch scheduling
- `[Split Delivery]` -- send ready items now, remaining later
- `[Hold Order]` -- with reason (credit hold, customer request, stock issue)
- `[Cancel Order]` -- confirmation with reason, triggers PO cancellation, reservation release

#### 3.3 Delivery Schedule

- Calendar/timeline view of upcoming deliveries
- Per delivery: order number, customer, items, method (own fleet/3PL/drop-ship), scheduled date, status
- Drag to reschedule
- Options per delivery: full delivery (wait for all items), partial delivery (ship ready items), direct ship (from supplier), consolidated (multiple orders to same customer)

#### 3.4 Operations Dashboard (Home View)

Operations Manager's command center. Displayed INSIDE the glass window, not a separate dashboard.

**Top strip (4 metric cards in a horizontal row, gap 16px):**
Each card: `var(--color-card)` bg, rounded-xl, p-16px, border 1px `var(--color-border)`. Height 80px. Flex column.
- **Orders in progress:** count (Geist Mono 600 24px) + trend arrow (Lucide `TrendingUp` or `TrendingDown` 14px, green/red) + "vs last week" (Inter 400 11px muted).
- **Deliveries today:** "X / Y" completed vs total (Geist Mono 500 20px). Progress bar below (4px height, `var(--color-primary)` fill).
- **SLA breaches active:** count (Geist Mono 600 24px, `var(--color-error)` if > 0). "0" in `var(--color-success)`.
- **Bottleneck alert:** stage name (Inter 500 14px) + stuck count (Geist Mono 400 12px). E.g., "Warehouse: 7 stuck". If no bottleneck: "All clear" in `var(--color-success)`.

**Bottleneck View (below metrics, mt-24px):**
- Horizontal pipeline visualization: Procurement -> Warehouse -> Dispatch -> Delivery. Each stage is a rounded-lg container (flex-1, min-width 180px) connected by arrows (Lucide `ChevronRight` 16px muted).
- Per stage: item count (Geist Mono 500 16px), avg time in stage (Geist Mono 400 12px muted), stuck items count (items > 24h in stage, shown in `var(--color-error)` if > 0).
- Click any stage -> filtered list below updates to show only orders stuck in that stage. Each row: order number (Geist Mono), customer name (Inter 500), time in stage (Geist Mono, red if > SLA), reason (Inter 400 muted), assigned person (Inter 400). Row click -> navigates to Order Detail (3.2).

**SLA Tracker (below bottleneck, mt-24px):**
- Table (React Aria `Table`):
  - Columns: Entity (order/quote ref), SLA Type (Inter 400), Deadline (Geist Mono), Time Remaining (Geist Mono), Status badge.
  - SLA types tracked: Quote response (4h), PO confirmation (24h), Delivery scheduling (48h before promise date), Invoice generation (24h post-delivery), Dispute resolution (72h).
  - Status badges: "On Track" (green), "At Risk" (yellow, 25-50% time remaining), "Breached" (red, 0% or past deadline).
  - Time remaining color: green (> 50% time left), yellow (25-50%), red (< 25% or breached).
  - Sorted by urgency: breached first, then at-risk, then on-track.
  - Filter: SLA type dropdown, status dropdown, date range.

#### 3.5 Cross-Module Handoff Status

Per-order visual pipeline showing which internal module currently owns the order.

- Layout: horizontal step indicator. Stages: Sales (quote) -> Procurement (POs) -> Warehouse (receiving) -> Dispatch (scheduling) -> Driver (delivering) -> Finance (invoicing).
- Current stage: blue filled circle + bold label. Completed stages: green checkmark. Future stages: gray outline.
- Below the pipeline: current owner name + time in current stage (Geist Mono).
- Stuck handoffs highlighted: amber/red warning banner. E.g., "Waiting on Warehouse for 3 hours (SLA: 2 hours)".
- "Nudge" button (Lucide `Bell` 16px + "Nudge" text, outline, 32px) sends an in-app notification to the responsible person in the blocking module.
- Accessible from Order Detail (3.2) as an expandable section at the top.

### BACKEND.md — Server Functions (Orders)

| Function | Method | Input | Output | Auth | Side Effects |
|---|---|---|---|---|---|
| `getOrderBoard` | GET | `{ status?[], assignedTo?, page, limit }` | `{ orders[], statusCounts }` | operations | none |
| `getOrderDetail` | GET | `{ orderId }` | `{ order, timeline, linkedPOs, linkedInvoices }` | operations | none |
| `updateOrderStatus` | POST | `{ orderId, status, notes? }` | `{ success }` | operations | Update, timeline, notify, broadcast |
| `splitOrder` | POST | `{ orderId, splits[] }` | `{ newOrderIds[] }` | operations | Create child orders |
| `holdOrder` | POST | `{ orderId, reason }` | `{ success }` | operations | Pauses processing |
| `cancelOrder` | POST | `{ orderId, reason }` | `{ cancellationFee, creditNoteId? }` | operations | May create credit note |
| `scheduleDelivery` | POST | `{ orderId, date, timeWindow, driverId?, vehicleId? }` | `{ deliveryId }` | operations | Creates delivery, assigns resources |
| `getDeliverySchedule` | GET | `{ dateRange, warehouseId? }` | `{ schedule[] }` | operations | none |

## Business Rules

**Order State Machine (8 states):**
CONFIRMED -> PROCESSING -> PARTIALLY_FULFILLED -> FULFILLED -> COMPLETED / ON_HOLD / CANCELLATION_REQUESTED / CANCELLED / BACK_ORDERED

**Order Cancellation Policy:**
- Tiered by fulfillment stage: 0% (pre-PO) -> 5% (PO sent) -> 15% (supplier confirmed) -> 25% (materials in preparation) -> 50%+ (materials ready/shipped)
- Non-cancellable items flagged at quote stage

**Change Orders:**
- Quantity increases: priced at CURRENT market price (not original quote price)
- Quantity decreases: cancellation fee on reduced portion
- All changes create a Change Order record linked to original order

**SLA Types:**
- Quote response: 4 hours
- PO confirmation: 24 hours
- Delivery scheduling: 48h before promise date
- Invoice generation: 24h post-delivery
- Dispute resolution: 72 hours

**Handoff Protocols:**
- Every state has exactly ONE owner (department/role)
- Transitions require explicit action (button click, not dropdown)
- Maximum dwell time per state with auto-escalation
- "Hot Potato" rule: unacknowledged within 30 min -> escalates to department manager

**Four Fulfillment Modes (same order can mix):**
1. Own stock + own truck
2. Own stock + 3PL carrier
3. Supplier drop-ship
4. Supplier cross-dock + own truck

**Egyptian Deposit vs Advance Payment (RESEARCH.md Section 8):**
عربون (deposit) = non-refundable by default. دفعة مقدمة (advance payment) = refundable minus actual damages. Recommended: 10-15% non-refundable deposit + remaining as refundable advance. Post-dated cheques must be physically returned if order cancelled.

## Non-Negotiable Rules

1. **Three colors only.** White, Black, Blue. Semantic status colors for DATA only.
2. **Spatial glass, not dashboards.** Module opens inside a glass window.
3. **Geist Mono for ALL numbers.**
4. **React Aria Components, NOT shadcn.**
5. **Motion v12.** Import from `motion/react`.
6. **`useWatch()`, NEVER `watch()`.**
7. **Colors in `:root {}`, NEVER in `@theme`.**
8. **ALL numbers -> Arabic-Indic numerals in Arabic context.**

## Known Risks & Gotchas

- State machine transitions MUST go through `validate_state_transition()`. No jumping states.
- Drag-and-drop kanban: use React Aria DragAndDrop (not react-beautiful-dnd or dnd-kit)
- React Aria Dialog + hotkeys conflict: use `isKeyboardDismissDisabled`
- Kanban performance: virtualize columns if > 50 cards per column

## Tips

- Operations dashboard metric cards should use the exact CSS spec from FRONTEND.md 3.4
- SLA tracker is a React Aria Table with proper sorting and filtering
- Cross-module handoff is an expandable section inside Order Detail, not a separate screen
- The "Nudge" button creates an in-app notification — integrate with Supabase Realtime
- Calendar view toggle is a secondary view of the kanban data, not a separate data source
