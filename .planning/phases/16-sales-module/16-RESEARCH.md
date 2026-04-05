# Phase 16: Sales Module - Research

**Researched:** 2026-04-05
**Domain:** Internal platform sales module -- RFQ inbox, quote builder, pipeline kanban, customer 360, negotiation, approval workflows
**Confidence:** HIGH

## Summary

Phase 16 builds the sales module inside the internal platform shell (Phase 15). The module comprises 8 major views (Sales Home, RFQ Inbox, RFQ Detail, Quote Builder, Negotiation, Customer 360, Pipeline/Kanban, Activity/Calendar/Reports) plus an "Add Customer" quick-create flow and ~22 server functions. All views render inside the existing `ModuleWindow` glass window with `moduleId: 'sales'`.

The database schema is already complete -- `quote_requests`, `quotes`, `quote_items`, `orders`, `order_items`, `customers`, `customer_contacts`, `approvals`, `pricing_rules`, and `notifications` tables all exist with RLS, triggers, and state machine enforcement. The `on_quote_accepted()` trigger handles quote-to-order conversion. One notable gap: there is no `quote_versions` or `quote_counter_offers` table in the schema -- the portal code references them in mock data but they don't exist in migrations. This needs a migration or the versioning logic must use the existing `previous_version_id` self-reference on `quotes`.

**Primary recommendation:** Structure as route-based views within the sales module, using React Aria Tabs for sub-navigation, TanStack Table for data-heavy views (RFQ Inbox, Customer 360 tabs, Pipeline list view), React Aria `useDragAndDrop` for kanban drag, and React Hook Form with `useWatch()` for the quote builder. Dev-mode mock data pattern is well-established from the portal app.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
All decisions from CONTEXT.md are locked as specified in that document. Key constraints:
- React Aria Components for all UI primitives (Tables, Tabs, Dialog, ComboBox, Select, Menu)
- Geist Mono for ALL numbers (prices, margins, values, dates, SLA timers, reference numbers)
- Three colors only (white/black/blue). Margin guardrails green/yellow/red are data-semantic only.
- Spatial glass windows. No sidebar within the module.
- `useWatch()` NEVER `watch()` for React Hook Form
- Motion v12 from `motion/react`
- Arabic-Indic numerals in Arabic context
- State machine enforcement via `validate_state_transition()`
- `isKeyboardDismissDisabled` on confirmation modals and PDF preview modal
- Click-to-advance is PRIMARY for pipeline kanban. Drag-and-drop is secondary for power users.
- Margin guardrails are configurable from `pricing_rules` table. Do NOT hardcode thresholds.
- Auto-assignment runs within 30 seconds as a server function, not a cron.
- Partial quotes: show 80% immediately, "Price on Application" for missing items.
- Cairo truck ban enforcement: >5 tons in Greater Cairo = 12AM-6AM only. Cannot be overridden.
- SLA timers account for Egyptian business hours (Sun-Thu).
- Single-touchpoint customer communication model (max 2 contacts).

### Claude's Discretion
- Internal routing strategy within the sales module (tabs vs routes vs both)
- Component decomposition and file organization
- Mock data structure for dev mode
- TanStack Query key naming conventions
- Zustand store shape for sales-specific state

### Deferred Ideas (OUT OF SCOPE)
- WhatsApp/email notification sending (Phase 27)
- PDF generation for quotes (Phase 28)
- AI insights and behavioral predictions (Phase 30)
- Real-time Supabase Realtime subscriptions (Phase 31)
- Actual Supabase database queries (server functions return mock data until connected)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SALE-01 | RFQ inbox with priority scoring, aging timer, SLA countdown, claim action | DataTable from @hyperquote/tables with getSortedRowModel + getFilteredRowModel. Priority score formula computed server-side, stored on `quote_requests.priority_score`. Timer components use Geist Mono. |
| SALE-02 | RFQ detail: materials table, customer snapshot, clarification workflow, decline with reason | Split layout (60/40). React Aria Table for materials. Customer context card reads from `getCustomer360`. Clarification form uses @hyperquote/forms. |
| SALE-03 | Quote builder: 10-step workflow, live pricing, margin guardrails | Single-page surface (NOT wizard). React Hook Form with `useWatch()` for reactive margin calculations. Auto-save via debounced `saveQuoteDraft` mutation. Margin thresholds from `pricing_rules` table. |
| SALE-04 | Quote approval: margin + value thresholds, push notification, 2h escalation | Uses existing `approvals` table with `entity_type: 'quote'`. `requestApproval` server function. Escalation tracked via `escalated_at` + `escalated_to` columns. |
| SALE-05 | Quote send: portal + email + both, schedule send, soft reservation, follow-up | `scheduled_send_at` column on `quotes`. Send method stored in metadata. Reservation uses `reservation_type: 'soft'` in inventory. Follow-up creates notification + activity. |
| SALE-06 | Negotiation: version timeline, side-by-side comparison, what-if calculator | Uses `quotes.previous_version_id` chain for version history. Side-by-side renders two quote item lists. What-if calculator is client-side margin recalculation. |
| SALE-07 | Customer 360: 9 tabs, health score | React Aria Tabs with lazy-loaded content. `getCustomer360` aggregates data. Health score composite from payment history, order frequency, revenue trend, relationship depth, win rate, activity. |
| SALE-08 | Add Customer button: 3 required fields, no auth credentials | Creates `customers` record with `status: 'unclaimed'`, `auth_user_id: NULL`. Phone duplicate check. Fuzzy company name check. |
| SALE-09 | Pipeline/Kanban: 9 stages, click-to-advance + drag, filters | React Aria GridList with `useDragAndDrop` for kanban cards. Click-to-advance via side panel with validation. List view uses DataTable. |
| SALE-10 | Activity feed, calendar, contacts, reports | Reuses existing ActivityFeed component from Phase 15. Calendar with color-coded events. Reports with date range filters and CSV export. |
</phase_requirements>

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-aria-components | ^1.16.0 | Tabs, Table, Dialog, GridList, ComboBox, Select, Menu, DnD | Mandated by CLAUDE.md. Built-in accessible DnD. |
| @tanstack/react-table | ^8.21.3 | RFQ Inbox, pipeline list view, Customer 360 tables | Already in @hyperquote/tables package. Headless -- renders through React Aria Table. |
| @tanstack/react-query | ^5.95.2 | Server state for all sales data | Already installed. SSR hydration via @tanstack/react-router-ssr-query. |
| react-hook-form | ^7.72.0 | Quote builder form, clarification form, add customer form | Already in @hyperquote/forms. Use `useWatch()` for margin reactivity. |
| zustand | ^5.0.12 | Sales module UI state (active tab, pipeline filters, saved views) | Already installed. Extend `useInternalStore` or create sales-specific store. |
| motion | ^12.38.0 | Glass modal animations only | Already installed. Spring enter, tween exit. |
| lucide-react | ^1.7.0 | Icons for priority indicators, status, actions | Already installed. |
| fuse.js | ^7.1.0 | Customer search in Add Customer, command palette | Already installed. |

### No Additional Packages Needed
The entire sales module can be built with existing dependencies. React Aria's built-in `useDragAndDrop` replaces any need for `@dnd-kit`. TanStack Table handles all tabular data. No new packages required.

## Architecture Patterns

### Recommended Project Structure
```
apps/internal/src/
├── routes/
│   └── _internal/
│       └── sales/
│           ├── index.tsx              # Sales Home (SALE-10 home view)
│           ├── rfq-inbox.tsx          # RFQ Inbox (SALE-01)
│           ├── rfq.$rfqId.tsx         # RFQ Detail (SALE-02)
│           ├── quote-builder.$quoteId.tsx  # Quote Builder (SALE-03/04/05)
│           ├── negotiation.$quoteId.tsx    # Negotiation (SALE-06)
│           ├── customer.$customerId.tsx    # Customer 360 (SALE-07)
│           ├── pipeline.tsx           # Pipeline/Kanban (SALE-09)
│           ├── calendar.tsx           # Calendar (SALE-10)
│           ├── contacts.tsx           # Contacts (SALE-10)
│           └── reports.tsx            # Reports (SALE-10)
├── components/
│   └── sales/
│       ├── SalesTabStrip.tsx          # Top-level tab navigation
│       ├── rfq/
│       │   ├── RFQInboxTable.tsx      # Inbox table with priority scoring
│       │   ├── RFQPreviewPane.tsx     # Right-side preview (desktop)
│       │   ├── RFQPriorityBadge.tsx   # !!!/!!/! indicators
│       │   ├── RFQAgeTimer.tsx        # Aging timer (green->yellow->orange->red)
│       │   └── SLACountdown.tsx       # SLA timer component
│       ├── quote-builder/
│       │   ├── QuoteBuilderHeader.tsx # Quote number, version, status, actions
│       │   ├── LineItemsTable.tsx     # Step 2: Editable line items
│       │   ├── CostLookup.tsx         # Step 3: Fresh/aging/stale indicators
│       │   ├── MarginGuardrails.tsx   # Step 4: Green/yellow/red/blocked
│       │   ├── MarginControlPanel.tsx # Right sidebar margin controls
│       │   ├── DeliveryTerms.tsx      # Step 5: Calendar, zones, truck ban
│       │   ├── PaymentTerms.tsx       # Step 6: Credit status display
│       │   ├── ValidityPeriod.tsx     # Step 7: Days selector
│       │   ├── ApprovalWorkflow.tsx   # Step 8: Threshold-based routing
│       │   ├── QuotePreviewModal.tsx  # Step 9: PDF preview (GlassElevated)
│       │   └── SendQuote.tsx          # Step 10: Portal/email/both
│       ├── negotiation/
│       │   ├── VersionTimeline.tsx    # Horizontal version strip
│       │   ├── SideBySideComparison.tsx
│       │   ├── WhatIfCalculator.tsx   # Right sidebar calculator
│       │   └── NegotiationThread.tsx  # Event timeline
│       ├── customer360/
│       │   ├── CustomerHeader.tsx     # Fixed header with tier badge
│       │   ├── HealthScore.tsx        # Composite 0-100 visualization
│       │   ├── OverviewTab.tsx
│       │   ├── ContactsTab.tsx
│       │   ├── QuotesTab.tsx
│       │   ├── OrdersTab.tsx
│       │   ├── FinancialsTab.tsx
│       │   ├── ProjectsTab.tsx
│       │   ├── CommunicationsTab.tsx
│       │   ├── DocumentsTab.tsx
│       │   └── NotesTab.tsx
│       ├── pipeline/
│       │   ├── KanbanBoard.tsx        # 9-column board
│       │   ├── KanbanCard.tsx         # Deal card
│       │   ├── KanbanColumn.tsx       # Droppable column
│       │   ├── PipelineListView.tsx   # TanStack Table list view
│       │   ├── PipelineFunnel.tsx     # Funnel chart view
│       │   └── PipelineSummaryBar.tsx # Top metrics bar
│       ├── AddCustomerDialog.tsx      # Quick add (SALE-08)
│       └── shared/
│           ├── CreditStatusBanner.tsx
│           └── TierBadge.tsx
├── lib/
│   └── server/
│       ├── sales-rfq.ts              # getRFQQueue, getRFQDetail, requestClarification, declineRFQ, reassignRFQ
│       ├── sales-quotes.ts           # createQuote, saveQuoteDraft, previewQuotePDF, requestApproval, approveQuote
│       ├── sales-pipeline.ts         # getSalesPipeline, markAsWon, markAsLost, convertQuoteToOrder
│       ├── sales-customers.ts        # getCustomerList, getCustomerCreditInfo, addCustomer, getCustomer360
│       ├── sales-activity.ts         # getActivityFeed, addInternalNote, getQuoteBuilderData, getSalesAnalytics
│       └── sales-send.ts             # sendQuote (portal + email), scheduleQuoteSend
└── stores/
    └── sales.ts                      # Pipeline filters, active tab, kanban view state
```

### Pattern 1: Module Routes Inside Glass Window
**What:** Sales module routes render inside the existing `ModuleWindow` component. The ModuleWindow placeholder content is replaced with a router outlet.
**When to use:** Every internal module (Phase 16-22).
**Implementation approach:**

The `ModuleWindow` currently shows a "Coming Soon" placeholder. Phase 16 replaces this with actual routed content. The sales module uses TanStack Router's file-based routing under `_internal/sales/`. The `SalesTabStrip` component provides tab navigation (Home, RFQ Inbox, Quote Builder, Pipeline, Customer 360, Contacts, Calendar, Reports) and renders at the top of the module content area.

The internal layout route (`_internal.tsx`) should be updated to render child routes when `activeModule === 'sales'`, or `ModuleWindow` should detect route matches and render the outlet.

### Pattern 2: Server Functions with Dev Fallback
**What:** Every server function checks `isSupabaseConfigured()` and returns mock data if not.
**When to use:** All 22 server functions in this phase.
**Example (from existing codebase):**
```typescript
// Source: apps/portal/src/lib/server/quotes.ts (established pattern)
export const getQuoteDetail = createServerFn()
  .inputValidator(getQuoteDetailInput)
  .handler(async ({ data: input }) => {
    if (!isSupabaseConfigured()) {
      return getMockQuote(input.quoteId)
    }
    const { supabase } = await getAuthenticatedClient()
    // ... real query
  })
```

### Pattern 3: Tabbed Content with Lazy Loading
**What:** Customer 360 has 9 tabs. Only fetch tab data when that tab is active.
**When to use:** Customer 360, RFQ Inbox (preview pane), Reports.
**Implementation:** React Aria `<Tabs>` with `selectedKey` controlled by state. Each tab panel contains a component that fires its own `useQuery` with `enabled: activeTab === 'thisTab'`.

### Pattern 4: Real-time Countdown Timers
**What:** SLA timers and aging timers that tick down in real-time.
**When to use:** RFQ Inbox age timers, SLA countdowns, quote validity countdowns.
**Implementation:** `useEffect` with `setInterval(1000)` updating a local state. Timer value computed from `created_at` or `sla_deadline`. Color transitions at thresholds. All numbers in Geist Mono.

### Pattern 5: Kanban with React Aria DnD
**What:** React Aria `useDragAndDrop` on GridList items for kanban cards.
**When to use:** Pipeline kanban board.
**Implementation:** Each column is a `<GridList>` with `useDragAndDrop`. Cards are draggable items. Drop targets are the columns. Click-to-advance is the PRIMARY interaction via a side panel with `[Advance to Next Stage]` button. Drag is secondary and requires confirmation modal on critical transitions (Won/Lost).

### Anti-Patterns to Avoid
- **Wizard/stepper for quote builder:** The spec explicitly says "Single-page editing surface -- all visible simultaneously." NOT a multi-step wizard with next/back buttons.
- **Hardcoded margin thresholds:** Margin guardrails come from `pricing_rules` table, queried at quote build time. Never hardcode 18%/12%/8%.
- **Direct Supabase client in components:** All data access through `createServerFn`. Components use TanStack Query hooks.
- **`watch()` instead of `useWatch()`:** Broken with React 19 compiler. Always `useWatch()`.
- **Dashboard-style layout:** No KPI cards on canvas. Module content is inside the glass window.
- **Fetching all Customer 360 tabs at once:** Lazy-load. Only fetch active tab's data.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Accessible drag and drop | Custom DnD with mouse/touch events | React Aria `useDragAndDrop` | Keyboard + screen reader parity built-in. Accessible by default. |
| Data tables with sort/filter | Custom table with manual sort | TanStack Table + React Aria Table | Headless logic + accessible markup. Already in @hyperquote/tables. |
| Form state management | Manual state for quote builder | React Hook Form + `useWatch()` | 10-step form with reactive margin calculations needs robust form state. |
| Countdown timers | Raw Date math | Shared timer utility with `Intl.RelativeTimeFormat` | Edge cases: timezone (Africa/Cairo), business hours (Sun-Thu), Arabic-Indic numerals. |
| Priority score calculation | Client-side scoring | Server function computing `priority_score` | Formula involves customer tier, value, age, urgency -- all server-side data. Store result on `quote_requests.priority_score`. |
| State machine transitions | Manual status checks | DB trigger `validate_state_transition()` | Already enforced at database level. Server functions just update status; trigger validates. |

## Common Pitfalls

### Pitfall 1: Quote Builder is NOT a Wizard
**What goes wrong:** Building a multi-step wizard with next/back navigation.
**Why it happens:** "10-step workflow" sounds like a wizard.
**How to avoid:** The spec says "Single-page editing surface -- all visible simultaneously." All 10 sections render on one scrollable page. Auto-save every 30 seconds. Progress is implicit (filled vs empty sections).
**Warning signs:** Any `Step` or `Wizard` component, any next/back buttons, any step indicator showing "Step 3 of 10."

### Pitfall 2: Missing `quote_versions` Table
**What goes wrong:** Trying to query a `quote_versions` or `quote_counter_offers` table that doesn't exist.
**Why it happens:** The portal mock data references `QuoteVersion[]` types, but no such table exists in the database migrations.
**How to avoid:** Use the `quotes.previous_version_id` self-reference chain. Each revision creates a new `quotes` row pointing to the previous one. Version history is a linked list traversal. Counter-offers are tracked as status changes (`negotiating`) with `negotiation_notes` and `customer_counter_price` on `quote_items`.
**Warning signs:** Any `supabase.from('quote_versions')` or `supabase.from('quote_counter_offers')` call.

### Pitfall 3: Hardcoded Margin Thresholds
**What goes wrong:** Hardcoding `18%` target, `12%` floor, `8%` absolute min.
**Why it happens:** The CONTEXT.md lists specific numbers per category.
**How to avoid:** Fetch thresholds from `pricing_rules` table filtered by `product_category`. The CONTEXT.md numbers are defaults/examples -- admin configures actual values in Phase 22 (Admin module). Use a `getMarginThresholds(category)` server function.
**Warning signs:** Any literal `0.18`, `0.12`, `0.08` in component code.

### Pitfall 4: SLA Timers Ignoring Business Hours
**What goes wrong:** SLA countdown counts 24/7 instead of Sun-Thu business hours only.
**Why it happens:** Simple `Date.now() - created_at` calculation.
**How to avoid:** SLA calculation must exclude Fri-Sat and non-business hours. Create a `calculateBusinessHoursElapsed(start, now)` utility that accounts for Egyptian work week (Sun-Thu) and configurable business hours. Holiday calendar from `system_settings`.
**Warning signs:** Raw millisecond subtraction for SLA remaining time.

### Pitfall 5: Exposing Supplier Cost to Sales Rep
**What goes wrong:** Showing actual supplier invoice cost in the quote builder.
**Why it happens:** The `quote_items.supplier_cost` column exists.
**How to avoid:** The spec says "Internal Cost = actual supplier cost + 2-3% procurement buffer." Sales rep sees the buffered cost, not the raw cost. The `getQuoteBuilderData` server function must apply the buffer before returning. This protects procurement's negotiated rates.
**Warning signs:** Directly rendering `supplier_cost` without buffer.

### Pitfall 6: Priority Score Computed Client-Side
**What goes wrong:** Computing priority score in the browser, causing different results across sessions.
**Why it happens:** Formula is documented, tempting to implement in JS.
**How to avoid:** Priority score is computed server-side and stored on `quote_requests.priority_score`. The `getRFQQueue` server function returns pre-scored results sorted by priority. Score can be recomputed periodically or on demand.
**Warning signs:** Priority formula logic in a React component.

### Pitfall 7: Kanban Drag Without Confirmation
**What goes wrong:** Accidentally dragging a deal to "Won" or "Lost" stage.
**Why it happens:** Standard DnD libraries don't add confirmation steps.
**How to avoid:** Click-to-advance is PRIMARY. For drag: allow free movement between non-terminal stages, but require confirmation modal (GlassElevated, `isKeyboardDismissDisabled`) for critical transitions (Won, Lost). Validate required fields before advancing (e.g., "Quote Sent" stage must confirm send method).
**Warning signs:** No confirmation on Won/Lost stage transitions.

### Pitfall 8: VAT Calculation Precision
**What goes wrong:** Floating-point rounding errors on 14% VAT.
**Why it happens:** JavaScript floating-point arithmetic.
**How to avoid:** Use `Math.round(subtotal * 14) / 100` as established in Phase 12 (InvoiceForm pattern). All monetary values as `DECIMAL(15,2)` in DB.
**Warning signs:** `subtotal * 0.14` without rounding.

## Code Examples

### RFQ Inbox Priority Scoring (Server Function Pattern)
```typescript
// Source: CONTEXT.md Section 1.2 + existing server function pattern
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

const getRFQQueueInput = z.object({
  status: z.string().optional(),
  assignedTo: z.string().optional(),
  page: z.number().default(1),
  limit: z.number().default(50),
})

export const getRFQQueue = createServerFn()
  .inputValidator(getRFQQueueInput)
  .handler(async ({ data: input }) => {
    if (!isSupabaseConfigured()) {
      return getMockRFQQueue(input)
    }
    // Real implementation queries quote_requests with priority_score ORDER BY DESC
  })
```

### Margin Guardrail Component Pattern
```typescript
// Source: CONTEXT.md Section 1.4 Step 4
type MarginLevel = 'green' | 'yellow' | 'red' | 'blocked'

function getMarginLevel(marginPercent: number, thresholds: MarginThresholds): MarginLevel {
  if (marginPercent < 0) return 'blocked'        // Negative margin
  if (marginPercent < thresholds.absoluteMin) return 'blocked'  // CEO approval
  if (marginPercent < thresholds.floor) return 'red'            // Manager approval
  if (marginPercent < thresholds.target) return 'yellow'        // Warning
  return 'green'                                                 // Auto-approved
}
```

### Timer Component Pattern (Geist Mono)
```typescript
// Source: CONTEXT.md Section 1.2 + frontend.md glass-windows.md
function AgeTimer({ createdAt }: { createdAt: string }) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Date.now() - new Date(createdAt).getTime())
    }, 1000)
    return () => clearInterval(interval)
  }, [createdAt])

  const hours = Math.floor(elapsed / 3600000)
  const color = hours < 2 ? 'text-green-600' : hours < 4 ? 'text-yellow-600' : hours < 8 ? 'text-orange-600' : 'text-red-600'

  return <span className={`font-[family-name:var(--font-geist-mono)] ${color}`}>{formatDuration(elapsed)}</span>
}
```

### React Aria Tabs for Customer 360
```typescript
// Source: react-aria-components Tabs API
import { Tabs, TabList, Tab, TabPanel } from 'react-aria-components'

function Customer360Tabs({ customerId }: { customerId: string }) {
  const [selectedTab, setSelectedTab] = useState('overview')

  return (
    <Tabs selectedKey={selectedTab} onSelectionChange={(key) => setSelectedTab(key as string)}>
      <TabList className="flex gap-1 border-b border-[var(--color-border)]">
        <Tab id="overview">{t('customer360.tabs.overview')}</Tab>
        <Tab id="contacts">{t('customer360.tabs.contacts')}</Tab>
        {/* ... 7 more tabs */}
      </TabList>
      <TabPanel id="overview">
        <OverviewTab customerId={customerId} isActive={selectedTab === 'overview'} />
      </TabPanel>
      {/* Lazy: each tab only fetches when isActive */}
    </Tabs>
  )
}
```

### Kanban Card with React Aria DnD
```typescript
// Source: react-aria-components DnD API
import { GridList, GridListItem, useDragAndDrop } from 'react-aria-components'

function KanbanColumn({ stage, items, onDrop, onAdvance }) {
  const { dragAndDropHooks } = useDragAndDrop({
    acceptedDragTypes: ['deal'],
    getItems(keys) {
      return [...keys].map((key) => ({ 'deal': key.toString() }))
    },
    onReorder(e) { /* reorder within column */ },
    onInsert(e) { onDrop(stage, e.items) },
    onRootDrop(e) { onDrop(stage, e.items) },
  })

  return (
    <GridList
      aria-label={stage}
      items={items}
      dragAndDropHooks={dragAndDropHooks}
    >
      {(item) => (
        <GridListItem key={item.id} textValue={item.customerName}>
          <KanbanCard deal={item} onAdvance={() => onAdvance(item)} />
        </GridListItem>
      )}
    </GridList>
  )
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@dnd-kit/core` for DnD | React Aria `useDragAndDrop` | React Aria stable DnD in 1.x | No extra dependency. Keyboard + screen reader accessible by default. |
| `framer-motion` | `motion/react` v12 | Rename in v12 | Import path changed. Same API. |
| `zodResolver` | `standardSchemaResolver` | hookform/resolvers 5.x | Works with any Standard Schema-compatible validator. |
| `watch()` in RHF | `useWatch()` | React 19 compiler | `watch()` broken with React 19. Use `useWatch()` exclusively. |

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
| SALE-01 | Priority score sorting, SLA timer logic | unit | `bun run vitest run src/__tests__/rfq-inbox.test.ts -t "priority"` | Wave 0 |
| SALE-02 | RFQ detail data mapping, clarification form validation | unit | `bun run vitest run src/__tests__/rfq-detail.test.ts` | Wave 0 |
| SALE-03 | Margin guardrail levels, auto-save, line item calculations | unit | `bun run vitest run src/__tests__/quote-builder.test.ts` | Wave 0 |
| SALE-04 | Approval threshold routing (margin + value) | unit | `bun run vitest run src/__tests__/approval-workflow.test.ts` | Wave 0 |
| SALE-05 | Quote send method selection, scheduled send | unit | `bun run vitest run src/__tests__/quote-send.test.ts` | Wave 0 |
| SALE-06 | Version comparison, what-if margin recalculation | unit | `bun run vitest run src/__tests__/negotiation.test.ts` | Wave 0 |
| SALE-07 | Health score calculation, tab lazy-loading triggers | unit | `bun run vitest run src/__tests__/customer-360.test.ts` | Wave 0 |
| SALE-08 | Phone duplicate check, unclaimed customer creation | unit | `bun run vitest run src/__tests__/add-customer.test.ts` | Wave 0 |
| SALE-09 | Kanban stage validation, click-to-advance, drag confirmation | unit | `bun run vitest run src/__tests__/pipeline.test.ts` | Wave 0 |
| SALE-10 | Activity feed filtering, report date ranges | unit | `bun run vitest run src/__tests__/sales-activity.test.ts` | Wave 0 |

### Sampling Rate
- **Per task commit:** `cd apps/internal && bun run vitest run --reporter=verbose`
- **Per wave merge:** Full suite across all test files
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/__tests__/rfq-inbox.test.ts` -- covers SALE-01 priority scoring and SLA timer logic
- [ ] `src/__tests__/quote-builder.test.ts` -- covers SALE-03 margin guardrails and line item math
- [ ] `src/__tests__/approval-workflow.test.ts` -- covers SALE-04 threshold routing
- [ ] `src/__tests__/pipeline.test.ts` -- covers SALE-09 stage validation
- [ ] `src/__tests__/customer-360.test.ts` -- covers SALE-07 health score computation

## Database Schema Notes

### Tables Used by This Phase (all exist in migrations)
| Table | Migration | Key Columns for Sales |
|-------|-----------|----------------------|
| `quote_requests` | 009 + 012 | `priority_score`, `sla_deadline`, `assigned_to`, `status`, `estimated_value` |
| `quote_request_items` | 009 | `product_id`, `quantity`, `unit_of_measure`, `customer_description` |
| `quotes` | 013 | `status`, `margin_percent`, `total`, `valid_until`, `sent_at`, `win_probability` |
| `quote_items` | 013 | `supplier_cost`, `margin_percent`, `freshness_indicator`, `customer_counter_price` |
| `orders` | 013 | `quote_id`, `customer_po_number`, `status` |
| `customers` | 010 | `tier`, `status`, `credit_status`, `credit_limit`, `assigned_sales_rep` |
| `customer_contacts` | 010 | `relationship_strength`, `deal_role`, `reports_to` |
| `approvals` | 003 | `entity_type`, `entity_id`, `status`, `escalated_to`, `escalated_at` |
| `pricing_rules` | 011 | `product_category`, `margin_percent`, `min_quantity`, `is_active` |
| `notifications` | 021 | `user_id`, `entity_type`, `entity_id`, `priority` |

### Schema Gap: No `quote_versions` Table
The `quotes` table has `previous_version_id UUID REFERENCES quotes(id)` for version chaining. Each revision creates a new row. There is NO separate `quote_versions` table. The portal mock code creates fake version data but the DB tracks versions as linked quote records. Negotiation view traverses the `previous_version_id` chain.

### Schema Gap: No `quote_counter_offers` Table
Counter-offers from customers are tracked via:
- `quotes.status` changing to `'negotiating'`
- `quote_items.customer_counter_price` storing proposed prices
- `quotes.negotiation_notes` for free-text notes
The portal code references a `quote_counter_offers` table in mock mode but it doesn't exist. If a dedicated table is needed later, it would be a Phase 16 migration. For now, use existing columns.

### State Machine: Quote Lifecycle
```
draft -> internal_review -> pending_approval -> approved -> sent -> viewed -> negotiating -> revised -> (loop back to internal_review or sent)
                                                                       -> accepted (triggers on_quote_accepted -> creates order)
                                                                       -> declined -> requires_re_quote -> draft
                                                                       -> expired -> requires_re_quote -> draft
```

## Project Constraints (from CLAUDE.md)

- **Architecture:** TanStack Start, React Aria, Motion v12, Bun, Cloudflare Workers. NO Next.js, shadcn, framer-motion, npm, Vercel.
- **Code:** `useWatch()` never `watch()`. `.inputValidator()` not `.validator()`. Colors in `:root {}` never `@theme`. `ClientOnly` for maps. `isKeyboardDismissDisabled` on Dialogs.
- **Design:** Three colors only (white/black/blue #2563EB). Spatial glass. Geist Mono for ALL numbers.
- **Egyptian law:** 14% VAT. Sun-Thu work week. Wire/cheque/cash/LC only. Cairo truck ban 6AM-midnight. Arabic-Indic numerals.
- **Quality:** "Fix all" means fix ALL. Verify ALL tiers. Fix from the root, never patch over symptoms.
- **Tailwind v4:** `@tailwindcss/vite` required. Colors in `:root {}`. `@plugin` for React Aria. Logical properties (`ps-4` not `pl-4`).
- **Testing:** `bun run vitest` (not `bun test` -- MSW incompatible). Vitest browser mode for React Aria accessibility.

## Open Questions

1. **Quote Version Storage Strategy**
   - What we know: `quotes.previous_version_id` creates a linked list. Portal mock data uses `QuoteVersion[]` array.
   - What's unclear: Should the negotiation side-by-side comparison query the chain of `previous_version_id`, or should we add a `quote_versions` table?
   - Recommendation: Use the existing linked list for now. If performance is poor (deep version chains), add a denormalized version summary table in a later migration.

2. **Auto-Assignment Server Function Trigger**
   - What we know: Spec says "implemented as a server function, not a cron" and "within 30 seconds."
   - What's unclear: What triggers the auto-assignment? Is it called on RFQ creation? Or polled?
   - Recommendation: Trigger on RFQ creation -- when `quote_requests` status changes to `submitted`, the `on_quote_request_submitted` flow calls the auto-assignment function. For dev mode, mock it. Real implementation deferred to when Supabase is connected.

3. **Internal Cost Buffer Percentage**
   - What we know: "Internal Cost = actual supplier cost + 2-3% procurement buffer"
   - What's unclear: Is the buffer configurable per category? Per supplier? Fixed at 2%?
   - Recommendation: Default 2.5% buffer, configurable via `system_settings` table. Apply in the `getQuoteBuilderData` server function before returning to client.

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `supabase/migrations/` (013, 009, 010, 011, 003, 018, 021, 023) -- all DB tables verified
- Codebase analysis: `apps/internal/src/` -- existing ModuleWindow, stores, shell patterns
- Codebase analysis: `apps/portal/src/lib/server/quotes.ts` -- server function pattern with dev fallback
- Codebase analysis: `packages/tables/src/DataTable.tsx` -- TanStack Table + React Aria Table integration
- CONTEXT.md (16-CONTEXT.md) -- all spec references from FRONTEND.md MODULE 1

### Secondary (MEDIUM confidence)
- [React Aria DnD docs](https://react-aria.adobe.com/dnd) -- `useDragAndDrop` API for kanban
- [React Aria Components](https://react-spectrum.adobe.com/react-aria/index.html) -- Tabs, GridList, Dialog APIs

### Tertiary (LOW confidence)
- None. All findings verified against codebase or official docs.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all packages already installed and used in prior phases
- Architecture: HIGH -- patterns established in Phase 7-15, direct extension
- Pitfalls: HIGH -- identified from spec analysis and codebase gaps (quote_versions, margin thresholds)
- Database schema: HIGH -- all migrations read and verified

**Research date:** 2026-04-05
**Valid until:** 2026-05-05 (stable -- no external dependency changes expected)
