# Phase 19: Warehouse Module - Research

**Researched:** 2026-04-05
**Domain:** Internal platform warehouse module -- receiving, putaway, picking, staging/load verification, cycle count, inventory lookup, yard management
**Confidence:** HIGH

## Summary

Phase 19 builds the warehouse module inside the internal platform shell (Phase 15). This is the LARGEST module spec (~800 lines in FRONTEND.md) comprising 7 major workflow areas: Receiving (standard + bulk/weight-based), Putaway, Picking (directed FEFO), Staging + Load Verification (5-step gated), Cycle Count (blind), Inventory Lookup, and Yard Management. The module targets two device classes: desktop (manager) and ruggedized Android scanners (Zebra TC52/TC72, Honeywell CT60) requiring large touch targets (48-64dp), high contrast, and minimal text entry.

The database schema is complete -- `warehouses`, `warehouse_locations`, `inventory`, `stock_movements`, `inventory_transfers`, `inventory_reservations`, `cycle_counts` tables all exist with RLS, triggers, and computed functions (`calculate_available_quantity`, `recalculate_wac`, `on_inventory_movement`). The `weather_alerts` table with `sheet_delivery_blocked` and `outdoor_ops_paused` flags supports Khamsin alerts. Key schema gap: there are no dedicated `pick_lists`, `putaway_tasks`, `receiving_records`, or `load_verifications` tables -- these workflow-tracking entities will need to be represented via mock data structures now and potentially new migrations later.

**Primary recommendation:** Structure as a tab-based module within ModuleWindow (matching sales/procurement/operations pattern). Use Zustand store for warehouse-specific UI state (active tab, active workflow step, scan state). Warehouse-specific components (SignaturePad, BarcodeScanner, WeightInput, PhotoCapture) should be built as warehouse-internal components, not shared UI. The yard management zone map should be a simple SVG with interactive zones -- no MapLibre needed.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
All decisions from CONTEXT.md are locked:
- React Aria Components for all UI primitives (Tables, Tabs, Dialog, ComboBox, Select, Menu)
- Geist Mono for ALL numbers (quantities, weights, lot numbers, dates, variance percentages, financial values)
- Three colors only (white/black/blue). Semantic status colors for DATA only (green=match, yellow=tolerance, red=exceeds, orange-pulse=arrived)
- Spatial glass windows, no sidebar within the module
- `useWatch()` NEVER `watch()` for React Hook Form
- Motion v12 from `motion/react`
- Arabic-Indic numerals in Arabic context
- `isKeyboardDismissDisabled` on confirmation modals
- FEFO enforcement is strict: system will NOT allow picking newer lot when older has sufficient quantity
- Blind cycle count must genuinely hide system quantities -- don't leak via network requests
- Weight verification tolerance is configurable -- don't hardcode
- Dual signature pad requires two separate signature capture components
- Large touch targets (48dp minimum, 64dp ideal) for warehouse scanner devices
- Audio/vibration feedback for scans
- Numeric shortcuts (1-9) for scanner keypad navigation
- Material-specific quality checklists per CONTEXT.md spec

### Claude's Discretion
- Tab strip organization and naming within the warehouse module
- Component decomposition and file organization
- Mock data structure for dev mode
- TanStack Query key naming conventions
- Zustand store shape for warehouse-specific state
- SVG yard map rendering approach
- Signature pad implementation (Canvas API vs library)
- Photo capture approach (device camera vs file input)

### Deferred Ideas (OUT OF SCOPE)
- WhatsApp/email notification sending (Phase 27)
- PDF generation for BOL (Phase 28)
- AI insights (Phase 30)
- Real-time Supabase Realtime subscriptions (Phase 31)
- Actual Supabase database queries (server functions return mock data until connected)
- Returns Receipt & Inspection (section 4.12 -- secondary to core WH-01 through WH-07)
- Damaged Goods / Quarantine management (section 4.12)
- Inter-Base Transfer UI (section 4.12)
- Reports & KPIs detailed report library (section 4.12)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| WH-01 | Receiving: expected deliveries list, per-PO step-by-step receiving (standard + bulk/weight-based), material-specific quality checklists, discrepancy handling | `supplier_pos` table has `receiving_warehouse_id`, `expected_delivery_date`, `status`. `supplier_po_items` has `received_quantity`, `rejected_quantity`. Quality checklists are config-driven per `product_category` enum. Two sub-flows: standard (per-item scan/count) and bulk/weight-based (gross/tare/net weight). |
| WH-02 | Putaway: system-directed task-by-task, two-scan confirmation, override with reason | `warehouse_locations` has `zone`, `max_weight_kg`, `max_volume_cbm`. System suggests optimal location based on zone rules + capacity + FEFO positioning. Two-scan: source location barcode then destination location barcode. Override captures reason enum. |
| WH-03 | Picking: order queue sorted by shipping deadline, directed picking (FEFO enforced), two-scan verification, short pick/skip/substitute | `inventory` table has `lot_number`, `expiry_date` for FEFO enforcement. Pick queue sorted by order shipping deadline. Two-scan: location barcode + product barcode. Short pick redirects to next location with same product. Running weight tracker vs truck capacity. |
| WH-04 | Staging + load verification: 5-step gated flow, hard gating for missing items | Five sequential steps: scan truck -> scan items -> verify weight -> photos -> dual sign-off. Hard gating blocks departure for missing items/weight variance/missing photos. Manager override option. BOL generation trigger on clearance (deferred to Phase 28). |
| WH-05 | Cycle count: blind count, threshold recount by ABC class, supervisor approval for variances | `cycle_counts` table has `items` JSONB, `assigned_to`, `approved_by`. Blind count: server function returns location + product info WITHOUT system quantity. ABC thresholds: A >2%, B >5%, C >10%. Recount assigned to different worker. |
| WH-06 | Inventory lookup: cross-location search, lot/expiry tracking, movement history, reorder point status | `inventory` table has `quantity_on_hand`, `quantity_available` (computed), `reorder_point`, `lot_number`, `expiry_date`. `stock_movements` for history. `calculate_available_quantity()` function exists. Cross-warehouse aggregation. |
| WH-07 | Yard management: interactive zone map, capacity utilization color coding, weather/Khamsin alerts | `warehouse_locations` with `zone` field. `weather_alerts` table with `wind_speed_kmh`, `sheet_delivery_blocked`, `outdoor_ops_paused`. SVG-based interactive map. Color coding: green <60%, yellow 60-80%, red >80% capacity. |
</phase_requirements>

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-aria-components | ^1.16.0 | Tabs, Table, Dialog, GridList, NumberField, TextField, Select | Mandated by CLAUDE.md. Accessible form controls for warehouse workflows. |
| @tanstack/react-table | ^8.21.3 | Expected deliveries list, pick queue, inventory lookup, cycle count tables | Already in @hyperquote/tables. Headless, renders through React Aria Table. |
| @tanstack/react-query | ^5.95.2 | Server state for all warehouse data | Already installed. SSR hydration via router. |
| react-hook-form | ^7.72.0 | Receiving form, putaway override, cycle count entry, weight verification | Already in @hyperquote/forms. Use `useWatch()` for reactive calculations. |
| zustand | ^5.0.12 | Warehouse module UI state (active tab, workflow step, scan mode) | Already installed. Create warehouse-specific store. |
| motion | ^12.38.0 | Glass modal animations, step transitions | Already installed. Spring enter, tween exit. |
| lucide-react | ^1.7.0 | Icons for status, actions, navigation | Already installed. |

### No Additional Packages Needed

The entire warehouse module can be built with existing dependencies:

- **Signature capture:** Canvas API directly -- no library needed. Two separate canvas elements for dual sign-off.
- **Barcode scanning:** `navigator.mediaDevices.getUserMedia()` + manual entry fallback. On ruggedized scanners (Zebra/Honeywell), the scanner acts as a keyboard input device -- no camera API needed, just listen for rapid sequential keystrokes in a hidden input. For desktop dev/testing, manual text input.
- **Photo capture:** `<input type="file" accept="image/*" capture="environment">` on mobile. File input on desktop.
- **Weight input:** React Aria NumberField with Geist Mono styling, large touch target.
- **Yard map:** SVG with React event handlers. No mapping library needed.

## Architecture Patterns

### Recommended Project Structure
```
apps/internal/src/
  components/
    warehouse/
      WarehouseModule.tsx           # Root module component (tab router)
      WarehouseTabStrip.tsx         # Tab navigation strip
      WarehouseShortcuts.tsx        # Keyboard shortcuts (1-9, G+R, G+P, etc.)
      home/
        WarehouseHome.tsx           # Worker tile grid + manager KPIs
        WorkerTileGrid.tsx          # 3x3 tile grid with badge counts
        ManagerKPIs.tsx             # KPI strip below tiles
      receiving/
        ExpectedDeliveriesList.tsx  # PO list sorted by ETA (WH-01)
        ActiveReceivingStandard.tsx # Per-PO step-by-step receiving
        ActiveReceivingBulk.tsx     # Weight-based receiving flow
        QualityChecklist.tsx        # Material-specific checklist component
        DiscrepancySection.tsx      # Variance handling
      putaway/
        PutawayWorkflow.tsx         # Directed putaway task flow (WH-02)
        PutawayTask.tsx             # Single task: from/to/two-scan
      picking/
        PickQueue.tsx               # Order queue sorted by deadline (WH-03)
        DirectedPicking.tsx         # Step-by-step pick flow
        PickExceptions.tsx          # Short pick/skip/substitute
        WeightTracker.tsx           # Running weight vs truck capacity
      staging/
        StagingLoadView.tsx         # Load plan by delivery stop (WH-04)
        LoadVerification.tsx        # 5-step gated flow
        GatedStep.tsx               # Reusable gated step component
      cycle-count/
        CycleCountList.tsx          # Assigned counts list (WH-05)
        BlindCountEntry.tsx         # Blind count data entry
        CountReview.tsx             # Post-submission variance review
        SupervisorApproval.tsx      # Approval with reason codes
      inventory/
        InventoryLookup.tsx         # Cross-location search (WH-06)
        InventoryDetail.tsx         # Per-location breakdown
        MovementHistory.tsx         # Recent transactions
      yard/
        YardManagement.tsx          # Interactive zone map (WH-07)
        YardZoneMap.tsx             # SVG zone visualization
        ZoneDetail.tsx              # Zone drill-down panel
        WeatherAlerts.tsx           # Khamsin/weather alert bar
      shared/
        ScanInput.tsx               # Barcode scan + manual entry component
        SignaturePad.tsx            # Canvas-based signature capture
        PhotoCapture.tsx            # Camera/file input for photos
        LargeNumberInput.tsx        # Big touch-target number input
        StepIndicator.tsx           # "Task X of Y" / "Step X of Y"
        StatusDot.tsx               # Color-coded status indicator
        VarianceBadge.tsx           # Green/yellow/red variance display
  stores/
    warehouse.ts                    # Warehouse Zustand store
  types/
    warehouse.ts                    # Warehouse TypeScript types
  lib/
    warehouse/
      quality-checklists.ts         # Material-specific checklist configs
      fefo.ts                       # FEFO sorting/enforcement logic
      abc-thresholds.ts             # ABC class variance thresholds
      weight-conversions.ts         # Unit conversions (lbs/tons/kg/tonnes)
```

### Pattern 1: Tab-Based Module (matches Sales/Procurement/Operations)
**What:** Warehouse module uses Zustand store for active tab, renders tab content conditionally
**When to use:** All internal platform modules follow this pattern
```typescript
// WarehouseModule.tsx follows SalesModule.tsx pattern exactly
export function WarehouseModule() {
  const activeTab = useWarehouseStore((s) => s.activeTab)
  return (
    <div className="flex flex-col h-full">
      <WarehouseTabStrip />
      <div className="flex-1 overflow-hidden">
        {activeTab === 'home' && <WarehouseHome />}
        {activeTab === 'receiving' && <ExpectedDeliveriesList />}
        {activeTab === 'putaway' && <PutawayWorkflow />}
        {activeTab === 'picking' && <PickQueue />}
        {activeTab === 'staging' && <StagingLoadView />}
        {activeTab === 'count' && <CycleCountList />}
        {activeTab === 'lookup' && <InventoryLookup />}
        {activeTab === 'yard' && <YardManagement />}
      </div>
    </div>
  )
}
```

### Pattern 2: Step-by-Step Gated Workflow
**What:** Multi-step process where each step must complete before next. Used by Receiving, Load Verification, Putaway, Directed Picking.
**When to use:** Any sequential workflow with validation gates
```typescript
interface GatedWorkflowProps {
  steps: WorkflowStep[]
  currentStep: number
  onStepComplete: (stepIndex: number, data: unknown) => void
  onComplete: () => void
}

// Each step has a `canAdvance` predicate that must return true
// Steps render their own content and call onStepComplete when done
// Visual: StepIndicator shows progress, current step is prominent
```

### Pattern 3: Two-Scan Verification
**What:** Confirm location + confirm product via sequential barcode scans
**When to use:** Putaway, Picking, Staging -- any physical inventory movement
```typescript
// ScanInput component handles both hardware scanner (keyboard wedge)
// and manual text entry. Hardware scanners emit rapid keystrokes
// followed by Enter -- detect this pattern vs normal typing.
function ScanInput({ 
  label, expectedValue, onScan, onMismatch 
}: ScanInputProps) {
  // 1. Hidden input captures scanner keystroke bursts
  // 2. On Enter, compare scanned value to expectedValue
  // 3. Match: green flash + haptic/audio feedback + onScan()
  // 4. Mismatch: red flash + error vibration + onMismatch()
}
```

### Pattern 4: Blind Data Fetch
**What:** Server function deliberately omits system quantities for cycle count
**When to use:** WH-05 cycle count -- prevent bias
```typescript
// Server function returns { locationCode, products: [{ id, name, sku }] }
// DOES NOT include quantity_on_hand, quantity_available, etc.
// After worker submits count, a separate function returns comparison data
// IMPORTANT: Don't include quantity in the TanStack Query cache key
// or in any prefetched data that could leak to the client
```

### Anti-Patterns to Avoid
- **Hardcoded tolerance values:** Weight variance tolerance, ABC thresholds, etc. must come from config (admin settings), not hardcoded constants
- **Leaking system quantities in blind count:** Never include quantity data in the cycle count assignment response -- even in unused fields
- **Single signature component for dual sign-off:** Must be TWO separate canvas instances, each capturing independently
- **Small touch targets on scanner views:** All interactive elements 48dp minimum. Number inputs and buttons 64dp for glove use.
- **Blocking UI on scan mismatch:** Show error feedback but don't lock the UI -- allow retry immediately
- **Camera-based barcode scanning as primary:** Ruggedized scanners are keyboard wedge devices. Camera scanning is a fallback, not the primary input method.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Form state | Custom state management | React Hook Form + `useWatch()` | Complex multi-step forms with validation, already used throughout the app |
| Table sorting/filtering | Custom sort logic | TanStack Table via @hyperquote/tables | Headless table with sort, filter, pagination, already in shared package |
| Number formatting | Manual `.toLocaleString()` | @hyperquote/i18n display components | CurrencyDisplay, UnitDisplay, DateDisplay handle Arabic-Indic numerals |
| State machine transitions | Client-side status checks | `validate_state_transition()` DB trigger | Server enforces valid transitions, client just renders current state |
| WAC recalculation | Client-side cost averaging | `recalculate_wac()` DB function | Server-side for data integrity, client displays result |
| Inventory availability | Manual subtraction | `calculate_available_quantity()` DB function | Handles on-hand minus reserved/allocated/expired correctly |

**Key insight:** The database already has the critical business logic (WAC, availability, LIFO prohibition, weather blocking flags). The warehouse module UI orchestrates workflows and captures data -- it does NOT compute inventory state.

## Common Pitfalls

### Pitfall 1: Blind Count Data Leak
**What goes wrong:** System quantities visible in network tab, prefetched query cache, or console logs during cycle count
**Why it happens:** TanStack Query caches full response objects. If the inventory lookup query runs before/during cycle count, quantities are in the cache.
**How to avoid:** Cycle count uses a SEPARATE server function that explicitly excludes quantities. Use a distinct query key (`['cycleCount', 'assignment', countId]`) that never shares data with inventory queries. Never prefetch inventory data on the count screen.
**Warning signs:** Opening DevTools network tab during count shows quantity fields in any response

### Pitfall 2: FEFO Enforcement Gap
**What goes wrong:** Worker picks newer lot despite older lot having sufficient quantity
**Why it happens:** Pick direction logic sorts by expiry but doesn't BLOCK selection of non-oldest lot
**How to avoid:** Server function validates pick against FEFO rules. If worker scans a product from a newer lot and the older lot at another location has sufficient quantity, the server rejects the pick with a redirect to the correct location. Client shows "Older lot available at [location]" error.
**Warning signs:** Pick confirmation succeeds without checking lot expiry order

### Pitfall 3: Hardcoded ABC Thresholds
**What goes wrong:** Variance threshold check uses magic numbers (2%, 5%, 10%)
**Why it happens:** Developer hardcodes thresholds instead of reading from config
**How to avoid:** Store thresholds in `system_settings` or a warehouse config table. Server function reads thresholds at runtime. For mock data, use a config object in the mock data file -- not inline constants.
**Warning signs:** Threshold values appear as literal numbers in component code

### Pitfall 4: Weight Unit Confusion
**What goes wrong:** Mixing lbs/tons vs kg/tonnes, especially for bulk materials
**Why it happens:** Products have `weight_kg` but bulk receiving uses tons. Egyptian market uses metric but some supplier data is imperial.
**How to avoid:** All internal calculations in metric (kg). Display converts based on user preference. `weight-conversions.ts` utility handles all conversions. Input fields show unit label prominently. Auto-convert on input with Geist Mono display.
**Warning signs:** Weight comparisons without unit normalization

### Pitfall 5: Scanner Keyboard Wedge Detection
**What goes wrong:** Manual keyboard input triggers scan processing, or scanner input is treated as manual typing
**Why it happens:** Hardware barcode scanners emit keystrokes rapidly (all characters within ~50ms) then Enter. Normal typing is much slower.
**How to avoid:** Detect input speed: if all characters arrive within 100ms window followed by Enter, treat as scan. Otherwise, treat as manual typing. Set a reasonable threshold. The ScanInput component should handle this internally.
**Warning signs:** Typing a barcode number manually triggers the scan-confirmed flow

### Pitfall 6: Gated Flow State Loss
**What goes wrong:** Navigating away from load verification mid-flow loses all progress
**Why it happens:** Component state lost on unmount
**How to avoid:** Persist active workflow state in Zustand store (not just component state). Save completed steps. On return, resume from last completed step. For critical flows (load verification), show confirmation dialog before navigation.
**Warning signs:** Refreshing page during step 3 of 5 returns to step 1

## Code Examples

### Worker Tile Grid with Badge Counts
```typescript
// Large tiles for scanner devices, numeric shortcuts
const TILES = [
  { key: '1', label: 'warehouse.tiles.receive', badge: 'pendingReceiving', icon: PackageCheck },
  { key: '2', label: 'warehouse.tiles.putaway', badge: 'pendingPutaway', icon: ArrowDownToLine },
  { key: '3', label: 'warehouse.tiles.pick', badge: 'pendingPicking', icon: PackageSearch },
  { key: '4', label: 'warehouse.tiles.load', badge: 'pendingLoading', icon: Truck },
  { key: '5', label: 'warehouse.tiles.count', badge: 'pendingCounts', icon: ClipboardCheck },
  { key: '6', label: 'warehouse.tiles.transfer', badge: 'pendingTransfers', icon: ArrowLeftRight },
  { key: '7', label: 'warehouse.tiles.lookup', badge: null, icon: Search },
  { key: '8', label: 'warehouse.tiles.returns', badge: 'pendingReturns', icon: RotateCcw },
  { key: '9', label: 'warehouse.tiles.alerts', badge: 'criticalAlerts', icon: AlertTriangle },
] as const

// Each tile: min 64dp height, prominent badge with urgency color
// Badge colors: red=urgent/overdue, yellow=due today, green=ahead
```

### Blind Cycle Count Server Function
```typescript
// getCycleCountAssignment -- returns location info WITHOUT quantities
export const getCycleCountAssignment = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ countId: z.string().uuid() }))
  .handler(async ({ data: { countId } }) => {
    // Returns: { location, items: [{ productId, name, sku, lotNumber }] }
    // DELIBERATELY omits: quantity_on_hand, quantity_available, etc.
    // The comparison data is only returned AFTER the worker submits their count
  })

// submitCycleCount -- returns comparison after worker submits
export const submitCycleCount = createServerFn({ method: 'POST' })
  .inputValidator(z.object({
    countId: z.string().uuid(),
    counts: z.array(z.object({
      productId: z.string().uuid(),
      physicalCount: z.number().nonnegative(),
    })),
  }))
  .handler(async ({ data }) => {
    // Returns: { items: [{ productId, physicalCount, systemQty, variance, variancePercent }] }
    // Plus: needsRecount (boolean), abcClass, threshold
  })
```

### ScanInput Component Pattern
```typescript
// Handles both hardware scanner (keyboard wedge) and manual entry
interface ScanInputProps {
  label: string
  expectedValue?: string  // If set, validates against this
  onScan: (value: string) => void
  onMismatch?: (scanned: string, expected: string) => void
  autoFocus?: boolean
  size?: 'default' | 'large'  // large = 64dp for glove use
}

// Implementation:
// - Hidden text input captures keystroke bursts from scanner
// - Timer: if all chars arrive within 100ms + Enter, treat as scan
// - Visual: green flash on match, red flash + vibration on mismatch
// - Audio: navigator.vibrate(200) on success, navigator.vibrate([100,50,100]) on error
// - Manual entry: user types value and presses Enter manually
```

### Weight-Based Receiving
```typescript
// Bulk receiving auto-calculates net weight with running PO total
interface BulkReceivingState {
  grossWeight: number    // Truck loaded weight
  tareWeight: number     // Truck empty weight
  netWeight: number      // Auto-calculated: gross - tare
  previouslyReceived: number  // Sum of prior loads for this PO
  poTotal: number        // Total PO quantity
  remaining: number      // poTotal - previouslyReceived - netWeight
  unitDisplay: 'tons' | 'tonnes' | 'kg'
}
// All internal math in kg. Display converts per user preference.
// Use Geist Mono for all weight numbers.
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Camera-based barcode scanning | Hardware scanner keyboard wedge input | Industry standard | Warehouse scanners (Zebra, Honeywell) are keyboard wedge -- no camera API needed |
| Full page refresh workflows | SPA step-by-step with local state | Current stack | Zustand persists workflow progress, no page refreshes mid-flow |
| Paper-based BOL | Digital BOL generation | Current | `generateBOL` server function creates PDF (Phase 28) |
| Manual FEFO tracking | System-enforced FEFO with scan verification | Current | Database FEFO queries + server-side validation = no manual lot selection |

## Open Questions

1. **ABC classification source**
   - What we know: Products have a `product_category` enum. The spec defines ABC classes by category (cement/rebar = A).
   - What's unclear: There is no `abc_class` column on `products` or `inventory` tables. The classification is implicit from category.
   - Recommendation: Create a lookup map from `product_category` to ABC class in `abc-thresholds.ts`. If a dedicated column is needed later, add via migration.

2. **Pick list / putaway task tracking tables**
   - What we know: `cycle_counts` exists with items JSONB. No dedicated `pick_lists` or `putaway_tasks` tables.
   - What's unclear: Whether to use JSONB on existing tables or create new workflow-tracking tables.
   - Recommendation: For this phase, model pick lists and putaway tasks as mock data structures in TypeScript types. The server functions (`createPickList`, `confirmPick`, `putawayConfirm`) already exist in the BACKEND.md spec -- they can write to a lightweight JSONB-based approach on existing tables or new tables can be added in a future migration.

3. **Supplier tier for inspection level**
   - What we know: Spec mentions AQL sampling based on supplier tier (Preferred/Approved/Conditional/New). `suppliers` table has a `tier` field.
   - What's unclear: Whether receiving workflow should implement full AQL sampling logic now.
   - Recommendation: For Phase 19, implement the quality checklist per material type. AQL sampling logic (determining sample size based on tier) is a refinement that can be deferred. Show inspection level indicator but use simplified "inspect all" for now.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest ^4.1.2 |
| Config file | `apps/internal/vitest.config.ts` |
| Quick run command | `cd apps/internal && bun test --run` |
| Full suite command | `cd apps/internal && bun test --run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| WH-01 | Receiving form calculates variance correctly | unit | `bun test --run src/__tests__/warehouse/receiving.test.ts -t "variance"` | Wave 0 |
| WH-01 | Quality checklist renders correct fields per material | unit | `bun test --run src/__tests__/warehouse/quality-checklist.test.ts` | Wave 0 |
| WH-02 | Putaway two-scan validates location match | unit | `bun test --run src/__tests__/warehouse/putaway.test.ts -t "two-scan"` | Wave 0 |
| WH-03 | FEFO enforcement rejects newer lot when older available | unit | `bun test --run src/__tests__/warehouse/fefo.test.ts` | Wave 0 |
| WH-03 | Pick weight tracker accumulates correctly | unit | `bun test --run src/__tests__/warehouse/picking.test.ts -t "weight"` | Wave 0 |
| WH-04 | Gated flow blocks advance when requirements not met | unit | `bun test --run src/__tests__/warehouse/load-verification.test.ts -t "gate"` | Wave 0 |
| WH-05 | Blind count response excludes system quantities | unit | `bun test --run src/__tests__/warehouse/cycle-count.test.ts -t "blind"` | Wave 0 |
| WH-05 | ABC threshold triggers recount correctly | unit | `bun test --run src/__tests__/warehouse/cycle-count.test.ts -t "threshold"` | Wave 0 |
| WH-06 | Inventory search returns cross-location results | unit | `bun test --run src/__tests__/warehouse/inventory-lookup.test.ts` | Wave 0 |
| WH-07 | Yard zone color coding by capacity percentage | unit | `bun test --run src/__tests__/warehouse/yard.test.ts -t "color"` | Wave 0 |

### Sampling Rate
- **Per task commit:** `cd apps/internal && bun test --run`
- **Per wave merge:** `cd apps/internal && bun test --run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/__tests__/warehouse/receiving.test.ts` -- covers WH-01
- [ ] `src/__tests__/warehouse/quality-checklist.test.ts` -- covers WH-01
- [ ] `src/__tests__/warehouse/putaway.test.ts` -- covers WH-02
- [ ] `src/__tests__/warehouse/fefo.test.ts` -- covers WH-03
- [ ] `src/__tests__/warehouse/picking.test.ts` -- covers WH-03
- [ ] `src/__tests__/warehouse/load-verification.test.ts` -- covers WH-04
- [ ] `src/__tests__/warehouse/cycle-count.test.ts` -- covers WH-05
- [ ] `src/__tests__/warehouse/inventory-lookup.test.ts` -- covers WH-06
- [ ] `src/__tests__/warehouse/yard.test.ts` -- covers WH-07

## Project Constraints (from CLAUDE.md)

- **Architecture:** TanStack Start (NOT Next.js). React Aria (NOT shadcn). Motion v12 (NOT framer-motion). Bun (NOT npm). Cloudflare Workers (NOT Vercel).
- **Design:** Three colors only (white/black/blue #2563EB). Spatial glass, not dashboards. Geist Mono for ALL numbers.
- **Code:** `useWatch()` never `watch()`. `.inputValidator()` not `.validator()`. Colors in `:root {}` never `@theme`. `ClientOnly` for maps. `isKeyboardDismissDisabled` on Dialogs.
- **Egyptian law:** 14% VAT. LIFO prohibited. Sun-Thu work week. Arabic-Indic numerals + Arabic unit translations.
- **Quality:** "Fix all" means fix ALL. Verify ALL tiers. Never silently skip items.

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `supabase/migrations/20260401000014_procurement_inventory.sql` -- all warehouse/inventory tables
- Codebase analysis: `supabase/migrations/20260401000023_business_logic_triggers.sql` -- inventory movement, weather, WAC triggers
- Codebase analysis: `supabase/migrations/20260401000022_computed_functions.sql` -- calculate_available_quantity, recalculate_wac
- Codebase analysis: `supabase/migrations/20260401000021_support_hr_ai_system_tables.sql` -- weather_alerts table
- Codebase analysis: `apps/internal/src/components/sales/SalesModule.tsx` -- module architecture pattern
- Codebase analysis: `apps/internal/src/components/shell/ModuleWindow.tsx` -- lazy loading pattern
- Codebase analysis: `apps/internal/src/stores/sales.ts` -- Zustand store pattern
- Phase 19 CONTEXT.md -- full FRONTEND.md spec sections 4.1-4.13

### Secondary (MEDIUM confidence)
- Barcode scanner keyboard wedge behavior is industry standard for Zebra TC52/Honeywell CT60 devices
- Canvas API for signature capture is well-documented and requires no external library

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all packages already installed, no new dependencies
- Architecture: HIGH - follows established module pattern (sales/procurement/operations)
- Database schema: HIGH - all tables verified in migrations
- Pitfalls: HIGH - derived from spec analysis and codebase patterns
- Scanner/device handling: MEDIUM - keyboard wedge pattern is standard but untested in this codebase

**Research date:** 2026-04-05
**Valid until:** 2026-05-05 (stable -- no fast-moving dependencies)
