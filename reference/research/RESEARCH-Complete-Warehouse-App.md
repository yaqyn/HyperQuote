> ⚠️ **REFERENCE DOCUMENT — NOT THE SOURCE OF TRUTH**
> This file was written during the research phase and may contain outdated decisions, US-centric references, or superseded technical choices.
> **Always defer to `essential/RESEARCH.md` for current decisions.**
> Key changes since this file was written: TanStack Start (not Next.js), Capacitor (not Expo), React Aria (not shadcn), Egyptian law (not US FMCSA), EGP (not USD), dual auth pools, no online payments, no mobile wallets, spatial glass UI (not traditional dashboards).

# RESEARCH: Complete Warehouse App for B2B Building Materials Distributor
## HyperQuote -- From Drop-Ship to Multi-Base Stocking Operations

**Date:** 2026-03-28
**Context:** HyperQuote starts as a drop-ship building materials distributor (no inventory) and transitions to holding stock at multiple bases/warehouses. Materials handled: cement, steel, lumber, aggregates, pipes, roofing, insulation. Order values $100K to $100M+.

---

## TABLE OF CONTENTS

1. [Warehouse App Screens -- Every Single One](#1-warehouse-app-screens)
2. [Inventory Management System](#2-inventory-management-system)
3. [Stock Pricing for Internal Cost Tracking](#3-stock-pricing-for-internal-cost-tracking)
4. [Multi-Location Inventory Management](#4-multi-location-inventory-management)
5. [Barcode and QR System](#5-barcode-and-qr-system)
6. [Receiving Workflow](#6-receiving-workflow)
7. [Picking and Staging](#7-picking-and-staging)
8. [Cycle Counting](#8-cycle-counting)
9. [Yard Management](#9-yard-management)
10. [Returns Processing](#10-returns-processing)
11. [Alerts and Automation](#11-alerts-and-automation)
12. [Integration with Other Modules](#12-integration-with-other-modules)
13. [Building Materials Specific Challenges](#13-building-materials-specific-challenges)

---

## 1. WAREHOUSE APP SCREENS

The warehouse app is **mobile-first**, designed for rugged Android devices (Zebra TC52/TC72, Honeywell CT60) or ruggedized tablets with built-in barcode scanners. Building materials environments are dusty, wet, and workers wear heavy gloves. The app must work outdoors in bright sunlight and in yard areas with poor WiFi connectivity.

### Design Principles (All Screens)

```
UNIVERSAL UX REQUIREMENTS:
  - Large touch targets (minimum 48dp, ideally 64dp -- workers wear gloves)
  - High contrast display (WCAG AAA -- outdoor/bright environments)
  - Minimal text entry (scan everything possible)
  - Offline capability with sync queue (yard areas have poor connectivity)
  - Audio/vibration feedback for scans (noisy environments with forklifts)
  - Four distinct audio cues: beep (scan captured), ok (processed), error (failure), success (task done)
  - One-hand operation (other hand may be guiding forklift or holding material)
  - Quick task switching (workers are interrupted frequently)
  - Battery-efficient (12-hour shifts)
  - Hide OS navigation bar to prevent accidental app closure
  - Numeric menu labels so workers can use scanner keypad shortcuts
  - Soft alerts (non-blocking notifications that auto-dismiss on next scan)
  - Scanner toggle: programmatically disable scanner during dialogs, server comms, and non-scan inputs
  - Custom keyboards for date, dimension, and weight entry instead of native keyboard
  - Process-specific icons instead of generic barcode symbols
```

### Screen 1: LOGIN

```
┌─────────────────────────────────┐
│         HYPERQUOTE WMS          │
│         [Company Logo]          │
│                                 │
│  ┌───────────────────────────┐  │
│  │  Worker ID: [__________]  │  │
│  │  (Scan badge or type)     │  │
│  └───────────────────────────┘  │
│                                 │
│  ┌───────────────────────────┐  │
│  │  PIN: [● ● ● ●]          │  │
│  └───────────────────────────┘  │
│                                 │
│  Base: [Houston Warehouse ▼]    │
│                                 │
│  ┌───────────────────────────┐  │
│  │        SIGN IN             │  │
│  └───────────────────────────┘  │
│                                 │
│  Last sync: 2 min ago  ●Online  │
│  App v3.2.1 | Device: ZBR-042  │
└─────────────────────────────────┘
```

**Details:**
- Worker authenticates via badge scan (barcode on ID badge) + 4-digit PIN
- No username/password typing -- workers cannot use keyboards with gloves
- Base/warehouse auto-selected based on device assignment but can be overridden
- Shared devices supported: multiple workers sign in/out on same device throughout shift
- Role-based access loaded after login: Worker sees pick/receive/count screens; Supervisor sees all plus adjustments/approvals; Manager sees full admin plus reports
- Offline login supported with cached credentials (device was previously authenticated)
- Connection indicator shows online/offline status and last sync timestamp
- Device ID displayed for IT support troubleshooting

**Role Hierarchy:**
| Role | Access Level | Key Capabilities |
|------|-------------|------------------|
| **Warehouse Worker** | Basic operations | Receive, putaway, pick, load, count (blind), inventory lookup, transfers |
| **Forklift Operator** | Basic operations + heavy equipment tasks | Same as worker plus yard picks, heavy item handling flags |
| **Lead / Checker** | Operations + verification | All worker functions plus load verification sign-off, pick auditing |
| **Cycle Count Supervisor** | Operations + count authority | All worker functions plus count approval (counts immediately approved), variance investigation |
| **Warehouse Supervisor** | Full operations + management | All functions plus inventory adjustments, hold/release, damage disposition, schedule management |
| **Warehouse Manager** | Full access | Everything plus reporting, configuration, user management, reorder triggers, transfer approvals |

---

### Screen 2: MAIN DASHBOARD (Home)

```
┌─────────────────────────────────┐
│ ☰  HOUSTON BASE    Ahmed K.  ⚙ │
│─────────────────────────────────│
│                                 │
│  MY TASKS TODAY          14     │
│  ┌──────┐ ┌──────┐ ┌──────┐   │
│  │  📥  │ │  📦  │ │  🔢  │   │
│  │ RCV  │ │ PICK │ │ COUNT│   │
│  │  3   │ │  8   │ │  3   │   │
│  └──────┘ └──────┘ └──────┘   │
│                                 │
│  ┌──────┐ ┌──────┐ ┌──────┐   │
│  │  📍  │ │  🚛  │ │  🔁  │   │
│  │PUTAWY│ │ LOAD │ │XFER  │   │
│  │  2   │ │  1   │ │  0   │   │
│  └──────┘ └──────┘ └──────┘   │
│                                 │
│  ┌──────┐ ┌──────┐ ┌──────┐   │
│  │  🔍  │ │  ↩️  │ │  ⚠️  │   │
│  │LOOKUP│ │RETURN│ │ALERTS│   │
│  │      │ │  1   │ │  5   │   │
│  └──────┘ └──────┘ └──────┘   │
│                                 │
│  ── ALERTS ──────────────────  │
│  ⚠ Cement Lot #2847 expires    │
│    in 12 days                   │
│  🔴 #4 Rebar 20ft: BELOW MIN  │
│    (15 bundles, min=20)         │
│  📥 Supplier delivery ETA 2pm  │
│    PO-8834 (ABC Steel)          │
│                                 │
│  ── QUICK STATS ─────────────  │
│  Orders shipping today: 6       │
│  Receiving expected: 3          │
│  Cycle counts due: 3            │
│  Open holds: 2 items            │
└─────────────────────────────────┘
```

**Details:**
- Large tile-based navigation with numeric shortcuts (worker types "1" for Receive, "2" for Pick, etc.)
- Each tile shows pending task count as a badge
- Color coding: Red badge = urgent/overdue, Yellow = due today, Green = ahead of schedule
- Alert banner at bottom shows top 3 critical alerts with priority icons
- Quick stats give at-a-glance operational status
- Supervisor/Manager dashboard adds: KPI tiles (pick accuracy %, on-time shipment %, inventory accuracy), staffing overview, pending approvals count

**Manager-Specific Dashboard Additions:**

```
┌─────────────────────────────────┐
│  ── TODAY'S KPIs ────────────  │
│                                 │
│  Pick Accuracy    99.2%  ✓     │
│  On-Time Shipment 94.5%  ⚠    │
│  Receiving Cycle  42 min  ✓    │
│  Inventory Accuracy 97.8% ✓   │
│                                 │
│  ── LABOR ───────────────────  │
│  Workers clocked in: 6/8       │
│  Forklift ops available: 2/3   │
│  Tasks completed: 34/52        │
│                                 │
│  ── PENDING APPROVALS ───────  │
│  Count variances: 2             │
│  Damage dispositions: 1         │
│  Transfer requests: 1           │
│                                 │
│  ── INVENTORY VALUE ─────────  │
│  Total on-hand: $847,322       │
│  Reserved: $312,450             │
│  Available: $534,872            │
│  On-hold/damaged: $12,340      │
└─────────────────────────────────┘
```

---

### Screen 3: RECEIVING -- Expected Deliveries List

```
┌─────────────────────────────────┐
│ ← RECEIVING        Filter ▼ 🔍 │
│─────────────────────────────────│
│                                 │
│  ── TODAY (Mar 28) ──────────  │
│                                 │
│  ┌───────────────────────────┐ │
│  │ PO-8834  ABC Steel Corp   │ │
│  │ ETA: 2:00 PM | Flatbed    │ │
│  │ #4 Rebar 20ft x 40 bndl  │ │
│  │ #5 Rebar 40ft x 20 bndl  │ │
│  │ Status: ● In Transit      │ │
│  │ Dock: YARD-STEEL-A        │ │
│  └───────────────────────────┘ │
│                                 │
│  ┌───────────────────────────┐ │
│  │ PO-8841  Gulf Cement Co   │ │
│  │ ETA: 3:30 PM | Enclosed   │ │
│  │ Portland Type I x 60 plt  │ │
│  │ Masonry Cement x 20 plt   │ │
│  │ Status: ● Confirmed       │ │
│  │ Dock: DOCK-2 (Covered)    │ │
│  └───────────────────────────┘ │
│                                 │
│  ┌───────────────────────────┐ │
│  │ PO-8850  TX Lumber Co     │ │
│  │ ETA: 4:00 PM | Flatbed    │ │
│  │ 2x4x8 SPF x 800 pcs      │ │
│  │ 3/4" Plywood x 200 sht   │ │
│  │ Status: ● Scheduled       │ │
│  │ Dock: YARD-LUMBER-B       │ │
│  └───────────────────────────┘ │
│                                 │
│  ── TOMORROW (Mar 29) ──────  │
│  PO-8855  Aggregate Supply...  │
│                                 │
│  [+ Unscheduled Delivery]      │
└─────────────────────────────────┘
```

**Details:**
- Lists all POs expected today, sorted by ETA
- Each card shows: PO number, supplier name, ETA, truck type (flatbed, enclosed, dump, pneumatic), line items summary, receiving status, assigned dock/yard area
- Status indicators: Scheduled (gray), Confirmed (blue), In Transit (green), Arrived (orange pulse), Receiving In Progress (yellow), Complete (green check)
- Filter by: status, supplier, product type, date range
- "Unscheduled Delivery" button for walk-in/unexpected deliveries
- Tapping a PO card opens the Receiving Detail screen

---

### Screen 4: RECEIVING -- Active Receipt (Per PO)

```
┌─────────────────────────────────┐
│ ← PO-8834  ABC Steel Corp      │
│─────────────────────────────────│
│                                 │
│  Truck: Flatbed | Plate: TX-44 │
│  BOL#: [Scan or Enter_______]  │
│  Driver: ___________________   │
│                                 │
│  ── LINE ITEMS ──────────────  │
│                                 │
│  1. #4 Rebar 20ft  Grade 60    │
│     Expected: 40 bundles       │
│     Received: [38] bundles     │
│     ⚠ SHORT BY 2              │
│     Condition: [Good ▼]        │
│     Lot/Heat#: [Scan________]  │
│     Location: YARD-STL-REBAR-2 │
│     [📷 Photo] [📝 Note]      │
│                                 │
│  2. #5 Rebar 40ft  Grade 60    │
│     Expected: 20 bundles       │
│     Received: [20] bundles     │
│     ✓ MATCHES                  │
│     Condition: [Good ▼]        │
│     Lot/Heat#: [Scan________]  │
│     Location: YARD-STL-REBAR-3 │
│     [📷 Photo] [📝 Note]      │
│                                 │
│  ── DISCREPANCIES ───────────  │
│  Line 1: Short 2 bundles       │
│  Reason: [Supplier Short ▼]    │
│  Photos: 0  [Add Photo]        │
│                                 │
│  ── QUALITY CHECK ───────────  │
│  ☑ Visual rust inspection      │
│  ☑ Size/length verified        │
│  ☑ Grade stamps visible        │
│  ☑ Mill Test Cert received     │
│  ☐ Bundle tags intact          │
│                                 │
│  ┌───────────────────────────┐ │
│  │    COMPLETE RECEIVING      │ │
│  └───────────────────────────┘ │
│  ┌───────────────────────────┐ │
│  │    REJECT DELIVERY         │ │
│  └───────────────────────────┘ │
│                                 │
│  Digital Signature: [Sign ✍]   │
└─────────────────────────────────┘
```

**Details:**
- BOL (Bill of Lading) number scanned or entered for cross-reference
- Each line item shows expected vs received with automatic variance calculation
- Color coding: Green = matches, Yellow = within tolerance (e.g., +/- 2%), Red = exceeds tolerance
- Condition dropdown: Good, Minor Damage, Major Damage, Rejected
- Lot/Heat number scanned from bundle tags or delivery paperwork -- critical for steel traceability
- Auto-suggested putaway location based on product type and zone rules; worker can override
- Photo capture inline for damage documentation (critical for supplier claims)
- Product-specific quality checklist (different for cement, steel, lumber, etc.)
- Discrepancy section auto-populates when received quantity differs from expected
- Reason codes: Supplier Short, Damaged in Transit, Wrong Product, Wrong Specification, Overshipment
- Digital signature confirms receipt with noted exceptions
- "Reject Delivery" option for entire loads that fail inspection

**Material-Specific Quality Checklists:**

| Material | Checklist Items |
|----------|----------------|
| **Cement** | Bags intact (no hardness/lumps), manufacture date checked, pallet condition, shrink wrap intact, type matches PO |
| **Steel/Rebar** | Rust level acceptable, sizes/lengths match, grade stamps visible, bundle tags intact, Mill Test Certificate received, no excessive bending |
| **Lumber** | Grade stamps present, no excessive warping/splitting/knots beyond grade, moisture content acceptable, tally count by dimension, species matches |
| **Aggregates** | Weigh ticket matches (truck scale in/out), visual quality (no contamination), material type matches PO |
| **Pipe** | No cracks (PVC) or dents (steel), diameter/schedule matches, lengths correct, ends undamaged |
| **Roofing** | No heat/sun damage, packaging intact, lot numbers match, stored flat requirement noted |
| **Insulation** | No water damage, packaging intact, R-value/thickness matches PO, not compressed beyond recovery |

---

### Screen 5: RECEIVING -- Bulk Material (Aggregates/Weight-Based)

```
┌─────────────────────────────────┐
│ ← PO-8855  Aggregate Supply     │
│─────────────────────────────────│
│                                 │
│  Material: #57 Crushed Stone    │
│  PO Qty: 80 tons               │
│                                 │
│  ── WEIGH TICKET ────────────  │
│  Truck Gross (loaded): [52,400] lbs │
│  Truck Tare (empty):  [18,200] lbs │
│  ─────────────────────────────  │
│  Net Weight:      34,200 lbs   │
│  Converted:       17.1 tons    │
│                                 │
│  PO Expected (total): 80 tons  │
│  Previously received: 45 tons  │
│  This load:           17.1 tons│
│  Remaining on PO:     17.9 tons│
│                                 │
│  Quality: [Acceptable ▼]       │
│  Contamination: [None ▼]       │
│  Dump Location: [AGG-BIN-3 ▼]  │
│                                 │
│  Weigh Ticket #: [Scan_______] │
│  [📷 Photo of load]            │
│                                 │
│  ┌───────────────────────────┐ │
│  │    CONFIRM RECEIPT         │ │
│  └───────────────────────────┘ │
└─────────────────────────────────┘
```

**Details:**
- Weight-based receiving uses truck scale (gross - tare = net material weight)
- Automatic unit conversion (lbs to tons, or kg to tonnes)
- Running total against PO (aggregates often delivered in multiple truckloads)
- Dump location selected from yard zone map
- Simpler quality check: visual inspection for contamination, correct material type
- Weigh ticket scanned or photo captured for records

---

### Screen 6: PUTAWAY

```
┌─────────────────────────────────┐
│ ← PUTAWAY           Queue: 4   │
│─────────────────────────────────│
│                                 │
│  TASK 1 of 4                   │
│                                 │
│  Product: Portland Cement TI    │
│  Qty: 20 pallets               │
│  Lot: GC-2026-0315             │
│  Mfg Date: 2026-03-15          │
│  Expires: 2026-09-15           │
│                                 │
│  FROM: DOCK-2 (Staging)        │
│  TO:   WH-A / CEMENT / ROW-2  │
│        Bay 04 / Floor Level    │
│                                 │
│  [Scan Source Location]        │
│  ┌───────────────────────────┐ │
│  │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │ │
│  │       SCAN SOURCE          │ │
│  └───────────────────────────┘ │
│                                 │
│  [Then Scan Destination]       │
│  ┌───────────────────────────┐ │
│  │ ░░░░░░░░░░░░░░░░░░░░░░░ │ │
│  │    SCAN DESTINATION        │ │
│  └───────────────────────────┘ │
│                                 │
│  Qty Placed: [20] pallets      │
│                                 │
│  ┌───────────────────────────┐ │
│  │    CONFIRM PUTAWAY         │ │
│  └───────────────────────────┘ │
│                                 │
│  [Override Location]           │
│  Reason: [Location Full ▼]     │
│  New Location: [Scan_______]   │
│                                 │
│  Next: 15 bndl Rebar → YARD   │
└─────────────────────────────────┘
```

**Details:**
- System suggests optimal location based on: product type zone rules, available capacity, FEFO positioning (oldest lots accessible first), weight limits (cement pallets need reinforced floor areas)
- Two-scan confirmation: scan source location barcode, then scan destination location barcode
- Quantity confirmation for partial putaway (e.g., only putting away 15 of 20 pallets due to space)
- Override available with mandatory reason code (location full, blocked, equipment issue)
- Shows next task in queue for continuous workflow
- For yard putaway: directs to zone/bunk/position with yard map reference
- Expiration date prominently displayed for shelf-life items (cement, adhesives)

---

### Screen 7: PICK LIST (Order Queue)

```
┌─────────────────────────────────┐
│ ← PICKING          Filter ▼ 🔍 │
│─────────────────────────────────│
│                                 │
│  ── PRIORITY PICKS ──────────  │
│                                 │
│  ┌───────────────────────────┐ │
│  │ 🔴 SO-4420  ABC Builders  │ │
│  │ Ship: TODAY 11:00 AM      │ │
│  │ Truck: F-150 (Route 3)    │ │
│  │ Items: 5 | Weight: 12.4t  │ │
│  │ Status: ● Ready to Pick   │ │
│  └───────────────────────────┘ │
│                                 │
│  ┌───────────────────────────┐ │
│  │ 🟡 SO-4418  Metro GC      │ │
│  │ Ship: TODAY 2:00 PM       │ │
│  │ Truck: Flatbed (Route 1)  │ │
│  │ Items: 8 | Weight: 24.6t  │ │
│  │ Status: ● Ready to Pick   │ │
│  └───────────────────────────┘ │
│                                 │
│  ┌───────────────────────────┐ │
│  │ 🟢 SO-4425  Delta Dev     │ │
│  │ Ship: TOMORROW 8:00 AM   │ │
│  │ Truck: TBD                │ │
│  │ Items: 3 | Weight: 8.1t   │ │
│  │ Status: ● Ready to Pick   │ │
│  └───────────────────────────┘ │
│                                 │
│  ── COMPLETED TODAY ─────────  │
│  ✓ SO-4415 (shipped 9:30 AM)  │
│  ✓ SO-4412 (shipped 8:15 AM)  │
│                                 │
│  Total: 6 orders | 3 remaining │
└─────────────────────────────────┘
```

**Details:**
- Orders sorted by shipping deadline priority (most urgent first)
- Color coding: Red = ship within 2 hours, Yellow = ship today, Green = ship tomorrow+
- Each card shows: SO number, customer, shipping time, assigned truck/route, item count, total weight
- Weight displayed prominently (critical for truck capacity planning)
- Filter by: route, truck, priority, product type
- Tapping a card opens the directed picking flow

---

### Screen 8: DIRECTED PICKING (Step-by-Step)

```
┌─────────────────────────────────┐
│ ← SO-4420  ABC Builders         │
│   Step 2 of 5                   │
│─────────────────────────────────│
│                                 │
│  GO TO:                         │
│  ┌───────────────────────────┐ │
│  │  WH-A / CEMENT / ROW-2   │ │
│  │  Bay 04 / Floor Level     │ │
│  │  [Aisle map: →→↓→]       │ │
│  └───────────────────────────┘ │
│                                 │
│  PICK:                          │
│  Product: Portland Cement TI    │
│  SKU: CEM-PORT-TI-94            │
│  Lot: GC-2026-0115  ← FEFO     │
│  Expires: 2026-07-15            │
│  Qty: 10 pallets               │
│                                 │
│  [Scan Location Barcode]       │
│  ┌───────────────────────────┐ │
│  │ ▓▓▓▓▓▓▓▓▓▓ SCAN LOC      │ │
│  └───────────────────────────┘ │
│                                 │
│  [Scan Product Barcode]        │
│  ┌───────────────────────────┐ │
│  │ ░░░░░░░░░░ SCAN PRODUCT   │ │
│  └───────────────────────────┘ │
│                                 │
│  Qty Picked: [10] pallets      │
│                                 │
│  ┌───────────────────────────┐ │
│  │    CONFIRM PICK            │ │
│  └───────────────────────────┘ │
│                                 │
│  [Short Pick] Only 8 available │
│  [Skip Item] Cannot access     │
│  [Substitute] Suggest alt SKU  │
│                                 │
│  Running total weight: 37,500lb│
│  Truck capacity: 48,000 lbs   │
│  ████████████████░░░░  78%     │
└─────────────────────────────────┘
```

**Details:**
- Step-by-step directed picking: system tells worker exactly where to go and what to pick
- Two-scan verification: scan location barcode (confirms worker is at correct spot), then scan product barcode (confirms correct product)
- FEFO/FIFO enforcement: system directs to oldest lot first (critical for cement -- system will not allow picking newer lot when older lot has sufficient quantity)
- Short pick workflow: if location has less than needed, pick what is available and system redirects to next location with same product
- Substitute suggestion: if product is fully out of stock, system suggests configured substitutes
- Running weight tracker shows cumulative load weight vs truck capacity with visual progress bar
- Visual aisle map/direction arrows for navigation (optional, useful in larger warehouses)
- Quantity entry for partial pallet picks (e.g., need 15 bags off a 42-bag pallet)

---

### Screen 9: STAGING AND LOAD VERIFICATION

```
┌─────────────────────────────────┐
│ ← LOADING    Truck: FL-203      │
│   Route 3 | Driver: Mike T.     │
│─────────────────────────────────│
│                                 │
│  ── LOAD PLAN ───────────────  │
│  Load Sequence (LIFO by stop):  │
│                                 │
│  STOP 3 (load first):          │
│  ☑ 20 plt Cement Type I        │
│    → Scanned ✓                  │
│  ☑ 5 bndl #4 Rebar 20ft       │
│    → Scanned ✓                  │
│                                 │
│  STOP 2 (load second):         │
│  ☐ 10 plt Cement Type I        │
│    → Awaiting scan              │
│  ☐ 200 pcs 2x4x8 SPF          │
│    → Awaiting scan              │
│                                 │
│  STOP 1 (load last - on top):  │
│  ☐ 50 sht 3/4" Plywood        │
│    → Awaiting scan              │
│                                 │
│  ── WEIGHT CHECK ────────────  │
│  Loaded: 32,400 lbs            │
│  Truck Max: 48,000 lbs         │
│  Remaining Capacity: 15,600 lbs│
│  ████████████████░░░░  67.5%   │
│                                 │
│  ⚠ Axle Distribution:          │
│  Front: 12,100 / 12,000 ← OVER│
│  Rear:  20,300 / 34,000  OK    │
│                                 │
│  ── SEQUENCE ALERT ──────────  │
│  ⚠ Heavy items (cement) should │
│    be loaded before plywood     │
│                                 │
│  ┌───────────────────────────┐ │
│  │   SCAN NEXT ITEM TO LOAD  │ │
│  └───────────────────────────┘ │
│                                 │
│  [Complete Load]  [Add Item]    │
│                                 │
│  Load Complete Actions:         │
│  ┌───────────────────────────┐ │
│  │  GENERATE BOL              │ │
│  │  DRIVER SIGN-OFF  ✍       │ │
│  │  DEPART CONFIRMATION       │ │
│  └───────────────────────────┘ │
└─────────────────────────────────┘
```

**Details:**
- Load plan shows all items organized by delivery stop in reverse sequence (LIFO -- last delivery stop loaded first so it is at the back/bottom, first delivery stop loaded last so it is on top/front)
- Each item scanned as loaded onto truck (barcode on pallet tag or bundle tag)
- Running weight tracker with truck capacity limit
- Axle weight distribution calculation (critical for DOT compliance with heavy materials)
- Sequence alerts warn if loading order violates weight distribution rules (heavy items must be distributed evenly)
- Load completion generates Bill of Lading automatically
- Driver digital sign-off acknowledging load acceptance
- Departure confirmation triggers: outbound inventory state change, delivery tracking activation, customer notification

---

### Screen 10: CYCLE COUNT

```
┌─────────────────────────────────┐
│ ← CYCLE COUNT     Assigned: 3  │
│─────────────────────────────────│
│                                 │
│  COUNT 1 of 3                  │
│                                 │
│  Location: WH-A / CEMENT /     │
│            ROW-2 / Bay 04      │
│                                 │
│  [Scan Location to Start]      │
│  ┌───────────────────────────┐ │
│  │ ▓▓▓▓▓▓▓▓ SCAN LOCATION   │ │
│  └───────────────────────────┘ │
│                                 │
│  ── BLIND COUNT ─────────────  │
│  (System qty hidden)            │
│                                 │
│  Product: Portland Cement TI    │
│  Your Count: [___] pallets     │
│                                 │
│  Product: Masonry Cement        │
│  Your Count: [___] pallets     │
│                                 │
│  [+ Add Unexpected Product]     │
│  (Found something not expected  │
│   at this location)             │
│                                 │
│  ┌───────────────────────────┐ │
│  │    SUBMIT COUNT            │ │
│  └───────────────────────────┘ │
│                                 │
│  ── AFTER SUBMISSION ────────  │
│  System Qty: 48 pallets        │
│  Your Count: 45 pallets        │
│  Variance:   -3 (-6.3%)        │
│  Status: ⚠ EXCEEDS THRESHOLD  │
│  (A-item threshold: 2%)        │
│                                 │
│  Action Required:               │
│  ● Recount requested            │
│  ○ Supervisor override          │
│                                 │
│  Recount by: [Different Worker] │
│  ┌───────────────────────────┐ │
│  │    REQUEST RECOUNT         │ │
│  └───────────────────────────┘ │
└─────────────────────────────────┘
```

**Details:**
- Blind counting: worker does not see system quantity until after submitting their count (prevents biased counting)
- Scan location barcode to start count (prevents counting wrong location)
- Worker enters physical count for each product at that location
- "Add Unexpected Product" for items found at a location where the system does not show them
- After submission: system compares count vs system quantity and calculates variance
- Variance thresholds by ABC class: A items > 2% variance triggers recount, B items > 5%, C items > 10%
- Recount requested from a different worker for objectivity
- If recount confirms variance, supervisor approval required for adjustment
- Adjustment requires reason code: Receiving error, Pick error, Damage (unrecorded), Theft, Miscount, Location error

**Supervisor Count Approval Screen:**

```
┌─────────────────────────────────┐
│ ← COUNT VARIANCES    Pending: 2│
│─────────────────────────────────│
│                                 │
│  Location: WH-A/CEMENT/R2/B04  │
│  Product: Portland Cement TI    │
│                                 │
│  System Qty:    48 pallets     │
│  Initial Count: 45 pallets     │
│  Recount:       45 pallets     │
│  Variance:      -3 (-6.3%)     │
│                                 │
│  Last Movements:                │
│  Mar 27: Picked 10 (SO-4415)   │
│  Mar 26: Received 20 (PO-8830) │
│  Mar 25: Picked 5 (SO-4410)    │
│                                 │
│  Reason: [Pick error ▼]        │
│  Note: [Likely miscounted at   │
│         pick for SO-4415___]   │
│                                 │
│  Financial Impact:              │
│  Value Adjustment: -$742.50    │
│                                 │
│  ┌──────────┐ ┌──────────────┐ │
│  │ APPROVE  │ │  INVESTIGATE │ │
│  └──────────┘ └──────────────┘ │
└─────────────────────────────────┘
```

---

### Screen 11: INVENTORY LOOKUP

```
┌─────────────────────────────────┐
│ ← INVENTORY LOOKUP       🔍    │
│─────────────────────────────────│
│                                 │
│  Search: [Scan or type_______] │
│  (SKU, name, barcode, lot#)     │
│                                 │
│  ── Portland Cement Type I ──  │
│  SKU: CEM-PORT-TI-94            │
│  UOM: Pallet (42 bags x 94 lb) │
│                                 │
│  ── ALL LOCATIONS ───────────  │
│                                 │
│  HOUSTON BASE                   │
│  ┌───────────────────────────┐ │
│  │ WH-A/CEMENT/R2/B04       │ │
│  │ Lot GC-2026-0115          │ │
│  │ Exp: Jul 15  (109 days)   │ │
│  │ On-Hand: 45 plt           │ │
│  │ Reserved: 20 plt          │ │
│  │ Available: 25 plt         │ │
│  │ Condition: Good           │ │
│  └───────────────────────────┘ │
│  ┌───────────────────────────┐ │
│  │ WH-A/CEMENT/R2/B06       │ │
│  │ Lot GC-2026-0315          │ │
│  │ Exp: Sep 15  (171 days)   │ │
│  │ On-Hand: 30 plt           │ │
│  │ Reserved: 0               │ │
│  │ Available: 30 plt         │ │
│  │ Condition: Good           │ │
│  └───────────────────────────┘ │
│                                 │
│  DALLAS BASE                    │
│  ┌───────────────────────────┐ │
│  │ On-Hand: 60 plt           │ │
│  │ Available: 40 plt         │ │
│  └───────────────────────────┘ │
│                                 │
│  ── SUMMARY ─────────────────  │
│  Total On-Hand (all bases):135 │
│  Total Available:           95 │
│  Total Reserved:            20 │
│  In-Transit Inbound:        60 │
│  On-Order (not shipped):    80 │
│  On-Hold/Damaged:            0 │
│                                 │
│  ── MOVEMENT HISTORY ────────  │
│  Mar 27: Picked 10 (SO-4415)  │
│  Mar 26: Received 20 (PO-8830)│
│  Mar 25: Picked 5 (SO-4410)   │
│  Mar 20: Received 30 (PO-8810)│
│                                 │
│  Reorder Point: 85 plt         │
│  Current Status: ✓ ABOVE ROP   │
│  Avg Daily Demand: 10 plt      │
│  Days of Supply: 9.5 days      │
│                                 │
│  [📷 Product Photo]            │
└─────────────────────────────────┘
```

**Details:**
- Search by scanning any barcode (product, lot, location) or typing SKU/name
- Shows inventory across ALL locations/bases with drill-down
- Each location record shows: lot number, expiration date with days remaining, on-hand/reserved/available breakdown, condition status
- Multi-base summary at bottom
- In-transit and on-order quantities for full supply picture
- Movement history shows recent transactions for investigation
- Reorder point status with days-of-supply calculation
- Product photo for visual identification (important when workers are unfamiliar with specific products)

---

### Screen 12: INTER-BASE TRANSFER

```
┌─────────────────────────────────┐
│ ← TRANSFER                     │
│─────────────────────────────────│
│                                 │
│  Transfer Type:                 │
│  ○ Internal (within base)       │
│  ● Inter-Base (base to base)    │
│                                 │
│  FROM: [Houston Base ▼]        │
│  TO:   [Dallas Base ▼]         │
│                                 │
│  ── ITEMS TO TRANSFER ───────  │
│                                 │
│  Product: [Scan or Search___]  │
│  Portland Cement Type I         │
│  Available at Houston: 55 plt  │
│  Current at Dallas: 40 plt     │
│  Transfer Qty: [20] pallets    │
│  Lot: [GC-2026-0115 ▼]        │
│                                 │
│  [+ Add Another Item]          │
│                                 │
│  ── TRANSFER DETAILS ────────  │
│  Reason: [Rebalance Stock ▼]   │
│  Priority: [Standard ▼]        │
│  Requested Delivery: [Apr 01]  │
│  Notes: [Dallas running low,   │
│          Houston overstocked_]  │
│                                 │
│  ── APPROVAL ────────────────  │
│  Requires: Manager Approval     │
│  Estimated Freight: $850       │
│  Transfer Value: $4,950        │
│                                 │
│  ┌───────────────────────────┐ │
│  │  SUBMIT TRANSFER REQUEST   │ │
│  └───────────────────────────┘ │
└─────────────────────────────────┘
```

**Transfer Workflow States:**
```
TRANSFER REQUEST
  → Submitted (by warehouse worker or system auto-suggestion)
  → Approved (by warehouse manager at source)
  → Pick at Source (items pulled from source location)
  → In-Transit (loaded on transfer truck, inventory state = In-Transit Between Bases)
  → Received at Destination (destination warehouse receives and confirms)
  → Complete (inventory fully transferred, records updated)
```

**Details:**
- Internal transfers (within same base): zone-to-zone or bin-to-bin, no approval needed, immediate execution
- Inter-base transfers: require manager approval, generate freight cost estimate, create transfer order tracked like a mini shipment
- System auto-suggests transfers when: one base is below reorder point while another is overstocked, customer order cannot be fulfilled from nearest base
- Lot selection ensures FEFO compliance (transfer oldest lots first)
- Transfer in-transit creates a virtual inventory state at both bases (source decremented, destination shows "in-transit inbound")

---

### Screen 13: RETURNS PROCESSING

```
┌─────────────────────────────────┐
│ ← RETURNS                      │
│─────────────────────────────────│
│                                 │
│  ── PENDING RETURNS ─────────  │
│                                 │
│  ┌───────────────────────────┐ │
│  │ RMA-1042  ABC Builders    │ │
│  │ SO-4380 | Created Mar 25  │ │
│  │ 3 plt Portland Cement TI  │ │
│  │ Reason: Wrong type ordered │ │
│  │ Status: ● Awaiting Receipt│ │
│  └───────────────────────────┘ │
│                                 │
│  ── RECEIVE RETURN ──────────  │
│  RMA#: [Scan or Enter_______]  │
│                                 │
│  Product: Portland Cement TI    │
│  Expected Return: 3 pallets    │
│  Received: [3] pallets         │
│                                 │
│  ── INSPECTION ──────────────  │
│  Overall Condition:             │
│  ○ Like New (resellable)        │
│  ● Minor Issue (discount/clean) │
│  ○ Damaged (cannot sell)        │
│  ○ Wrong Product Returned       │
│                                 │
│  Specific Checks:               │
│  ☑ Original packaging intact    │
│  ☐ Product undamaged            │
│  ☑ Quantity matches RMA         │
│  ☑ Within shelf life            │
│                                 │
│  Inspection Notes:              │
│  [1 pallet has torn shrink     │
│   wrap, bags exposed but dry_] │
│  [📷 3 Photos Attached]        │
│                                 │
│  ── DISPOSITION ─────────────  │
│  ┌───────────────────────────┐ │
│  │ 2 plt → Restock (Grade A) │ │
│  │ Location: WH-A/CEMENT/R2  │ │
│  │                           │ │
│  │ 1 plt → Restock (Discount)│ │
│  │ Location: WH-A/CLEARANCE  │ │
│  │ Mark down: 15%            │ │
│  └───────────────────────────┘ │
│                                 │
│  Other Disposition Options:     │
│  ○ Return to Supplier (RTV)     │
│  ○ Scrap / Dispose              │
│  ○ Hold for Investigation       │
│                                 │
│  ── FINANCIAL ───────────────  │
│  Credit Note: Auto-generate?    │
│  ● Yes, full credit ($742.50)  │
│  ○ Yes, partial credit          │
│  ○ No credit (customer error)   │
│  ○ Replacement order instead    │
│                                 │
│  ┌───────────────────────────┐ │
│  │  COMPLETE RETURN           │ │
│  └───────────────────────────┘ │
└─────────────────────────────────┘
```

**Details:**
- Returns initiated by sales/customer service team via RMA (Return Merchandise Authorization)
- Warehouse receives and inspects against RMA
- Inspection checklist specific to product type
- Disposition decision per item (different pallets from same return may have different dispositions):
  - **Restock Grade A**: Returns to available inventory at original location
  - **Restock Discounted**: Returns to clearance area with markdown
  - **Return to Vendor (RTV)**: Creates outbound shipment back to supplier
  - **Scrap/Dispose**: Write-off, removed from inventory, triggers expense recording
  - **Hold**: Placed on quarantine hold pending investigation
- Credit note trigger: completing return disposition automatically generates credit note in finance module (or flags for finance review if above a threshold)
- Photo documentation mandatory for damaged returns
- For building materials: condition assessment considers weather exposure, shelf life consumed, structural integrity

---

### Screen 14: DAMAGED GOODS / QUARANTINE

```
┌─────────────────────────────────┐
│ ← DAMAGED / ON-HOLD            │
│─────────────────────────────────│
│                                 │
│  ── QUARANTINE ITEMS ────────  │
│                                 │
│  ┌───────────────────────────┐ │
│  │ Portland Cement TI         │ │
│  │ Lot: GC-2025-0901         │ │
│  │ Qty: 5 pallets            │ │
│  │ Reason: Approaching Expiry │ │
│  │ Expires: Apr 01 (4 days)  │ │
│  │ Hold Since: Mar 21        │ │
│  │ Location: WH-A/HOLD/01   │ │
│  └───────────────────────────┘ │
│                                 │
│  ┌───────────────────────────┐ │
│  │ 2x4x8 SPF Lumber          │ │
│  │ Qty: 40 pieces            │ │
│  │ Reason: Water Damage       │ │
│  │ Discovered: Cycle Count    │ │
│  │ Hold Since: Mar 26        │ │
│  │ Location: WH-A/HOLD/02   │ │
│  │ [📷 4 Photos]             │ │
│  └───────────────────────────┘ │
│                                 │
│  ── DISPOSITION (Supervisor) ─ │
│                                 │
│  Selected: Cement (5 plt)      │
│                                 │
│  Decision:                      │
│  ○ Release to Available         │
│  ○ Sell As-Is (discount)        │
│  ○ Return to Supplier           │
│  ● Scrap / Write Off            │
│  ○ Rework (cut/clean/repack)    │
│                                 │
│  Scrap Reason: [Expired ▼]     │
│  Disposal Method: [Recycle ▼]  │
│  Write-Off Value: $1,237.50    │
│  Approver: [Manager Required]  │
│                                 │
│  ┌───────────────────────────┐ │
│  │  SUBMIT DISPOSITION        │ │
│  └───────────────────────────┘ │
└─────────────────────────────────┘
```

**Details:**
- Central view of all quarantined/on-hold inventory
- Items enter quarantine from: receiving inspection failure, cycle count discovery, approaching expiration (auto-triggered), forklift damage report, customer return inspection
- Each item shows: reason for hold, date placed on hold, location in quarantine area, photos
- Disposition options: Release (was precautionary hold, item is fine), Sell As-Is (minor cosmetic damage, mark down), Return to Supplier (supplier-caused defect), Scrap (unsalvageable), Rework (for building materials: cut damaged end off lumber, restack/rewrap pallets)
- Write-off value calculated automatically for financial impact visibility
- Manager approval required for dispositions above a configurable value threshold

---

### Screen 15: YARD MANAGEMENT

```
┌─────────────────────────────────┐
│ ← YARD MAP     Houston Base     │
│─────────────────────────────────│
│                                 │
│  ┌───────────────────────────┐ │
│  │     [Interactive Map]      │ │
│  │                           │ │
│  │  ┌─────┐   STAGING       │ │
│  │  │ WH  │   ████████      │ │
│  │  │     │                  │ │
│  │  └─────┘   ┌─────────┐  │ │
│  │            │ STEEL    │  │ │
│  │  ┌─────┐  │ 78% ████ │  │ │
│  │  │SHED │  └─────────┘  │ │
│  │  │     │               │ │
│  │  └─────┘  ┌─────────┐  │ │
│  │           │ LUMBER   │  │ │
│  │  ┌─────┐ │ 45% ██░░ │  │ │
│  │  │ AGG │ └─────────┘  │ │
│  │  │BINS │               │ │
│  │  │ B1  │  ┌─────────┐  │ │
│  │  │ B2  │  │ PIPE     │  │ │
│  │  │ B3  │  │ 30% █░░░ │  │ │
│  │  └─────┘  └─────────┘  │ │
│  │                         │ │
│  │  [TRUCK PARKING]       │ │
│  └───────────────────────────┘ │
│                                 │
│  ── ZONE DETAILS ────────────  │
│  Tap a zone for details:       │
│                                 │
│  STEEL ZONE (78% capacity)     │
│  ├ Rebar: 95 bundles           │
│  ├ W-Beams: 12 pcs             │
│  ├ Angles: 24 pcs              │
│  └ Last activity: 45 min ago   │
│                                 │
│  AGGREGATE BINS                 │
│  ├ Bin 1: Concrete Sand ~40 tn │
│  ├ Bin 2: Pea Gravel ~25 tn   │
│  ├ Bin 3: #57 Stone ~60 tn    │
│  └ Last measured: Mar 25       │
│                                 │
│  ⚠ Weather Alert:              │
│  Rain forecast tonight.         │
│  Cover lumber zone?  [Yes] [No]│
│                                 │
│  [Yard Tasks] [Zone Edit]      │
└─────────────────────────────────┘
```

**Details:**
- Interactive visual map of yard layout with zones color-coded by capacity utilization
- Tap any zone to see inventory summary, last activity timestamp, and capacity
- Aggregate bins show estimated quantities (from last measurement + inflows - outflows since measurement)
- Weather alert integration: warns about upcoming rain/wind/temperature extremes with actionable recommendations (cover lumber, tarp aggregate bins, move moisture-sensitive items indoors)
- Zone editing capability for supervisor/manager to reconfigure yard layout as needs change
- Forklift operator can see optimal route through yard for multi-item picks

---

### Screen 16: REPORTS AND ANALYTICS (Manager/Supervisor Only)

```
┌─────────────────────────────────┐
│ ← REPORTS                       │
│─────────────────────────────────│
│                                 │
│  ── OPERATIONAL KPIs ────────  │
│                                 │
│  Inventory Accuracy    97.8%   │
│  Target: 97%    ✓ On Target    │
│                                 │
│  Order Fill Rate       96.2%   │
│  Target: 95%    ✓ On Target    │
│                                 │
│  Pick Accuracy         99.1%   │
│  Target: 99%    ✓ On Target    │
│                                 │
│  Receiving Cycle Time  48 min  │
│  Target: 60 min ✓ On Target    │
│                                 │
│  On-Time Shipment      94.5%   │
│  Target: 95%    ⚠ Below Target │
│                                 │
│  Inventory Turnover    8.2x    │
│  Industry avg: 6-10x  ✓ Good  │
│                                 │
│  ── AVAILABLE REPORTS ───────  │
│                                 │
│  [Inventory Valuation Report]   │
│  [Aging Report (by lot)]        │
│  [Slow Moving Inventory]        │
│  [Damage/Write-Off Summary]     │
│  [Receiving Performance]        │
│  [Cycle Count Accuracy Trend]   │
│  [Warehouse Utilization]        │
│  [Transfer History]             │
│  [Returns Analysis]             │
│  [Worker Productivity]          │
│                                 │
│  Date Range: [This Month ▼]    │
│  Base: [All Bases ▼]           │
│  [Export CSV] [Email Report]    │
└─────────────────────────────────┘
```

---

### Complete Screen Inventory Summary

| # | Screen | Primary User | Mobile/Desktop |
|---|--------|-------------|----------------|
| 1 | Login | All | Mobile |
| 2 | Dashboard (Worker) | Worker, Forklift Op | Mobile |
| 3 | Dashboard (Manager) | Supervisor, Manager | Mobile + Desktop |
| 4 | Expected Deliveries List | Receiver | Mobile |
| 5 | Active Receiving (Standard) | Receiver | Mobile |
| 6 | Active Receiving (Bulk/Weight) | Receiver | Mobile |
| 7 | Putaway Task | Worker, Forklift Op | Mobile |
| 8 | Pick List (Order Queue) | Picker | Mobile |
| 9 | Directed Picking | Picker | Mobile |
| 10 | Staging / Load Verification | Loader, Checker | Mobile |
| 11 | Cycle Count (Blind) | Counter | Mobile |
| 12 | Cycle Count Approval | Supervisor | Mobile + Desktop |
| 13 | Inventory Lookup | All | Mobile + Desktop |
| 14 | Transfer (Internal) | Worker | Mobile |
| 15 | Transfer (Inter-Base) | Supervisor | Mobile + Desktop |
| 16 | Returns Receipt & Inspection | Receiver | Mobile |
| 17 | Returns Disposition | Supervisor | Mobile + Desktop |
| 18 | Damaged/Quarantine Management | Supervisor | Mobile + Desktop |
| 19 | Yard Map & Zone Management | All yard workers | Mobile + Desktop |
| 20 | Reports & KPIs | Manager | Desktop (mobile summary) |
| 21 | User & Device Management | Manager, IT | Desktop |
| 22 | System Configuration | Admin | Desktop |
| 23 | Alerts & Notifications | All | Mobile push + Desktop |

---

## 2. INVENTORY MANAGEMENT SYSTEM

### Quantity Buckets

The inventory module must track multiple quantity states for each SKU at each location:

| Quantity Type | Definition | Calculation |
|--------------|------------|-------------|
| **On-Hand** | Physically present in the warehouse/yard | Direct count: receiving adds, shipping subtracts |
| **Available** | Can be promised to new orders | On-Hand - Reserved - Allocated - On-Hold - Damaged |
| **Reserved** | Committed to a confirmed sales order but not yet picked | Increases when order confirmed, decreases when picked |
| **Allocated** | Assigned to a pick list, being actively picked | Increases when pick list created, decreases when shipped |
| **On-Hold** | Physically present but not available (quality issue, pending inspection, dispute) | Manual hold or system-triggered |
| **Damaged** | Physically present but not sellable in current condition | Discovered at receiving, during storage, at pick, or via customer report |
| **In-Transit Inbound (from Supplier)** | On the way from supplier, not yet received | PO shipped but not yet received at warehouse |
| **In-Transit Inbound (Inter-Base)** | Being transferred from another base | Transfer order shipped but not yet received at destination |
| **In-Transit Outbound** | Left the warehouse, not yet delivered to customer | Shipped but not yet delivery-confirmed |
| **On-Order** | Ordered from supplier but not yet shipped | PO placed but supplier has not shipped yet |
| **Quarantined** | Isolated for investigation (quality, expiration, regulatory) | Moved to quarantine zone pending disposition |
| **Returned** | Received back from customer, pending inspection | Between receipt and disposition decision |

### Available-to-Promise (ATP) Formulas

**Basic ATP (what can I sell right now):**
```
ATP = On-Hand - Reserved - Allocated - On-Hold - Damaged - Quarantined
```

**Extended ATP (what can I sell including future supply):**
```
Extended ATP = ATP
            + In-Transit Inbound (from supplier, arriving within planning horizon)
            + In-Transit Inbound (inter-base transfers)
            + On-Order (confirmed POs within planning horizon)
            - Future Reservations (confirmed orders not yet picked, within planning horizon)
```

**Time-Phased ATP (what can I sell on a specific future date):**
```
For each date in the planning horizon:
  ATP(date) = ATP(today)
            + Sum of expected receipts between today and date
            - Sum of expected shipments between today and date
```

**Building Materials ATP Example:**
```
Portland Cement Type I at Houston Base:

On-Hand:                    75 pallets
Reserved (SO-4420):        -10 pallets
Reserved (SO-4425):        -15 pallets
Allocated (SO-4418, picking): -8 pallets
On-Hold:                     0
Damaged:                     0
─────────────────────────────────────
Basic ATP:                  42 pallets

In-Transit (PO-8841, ETA tomorrow):  +60 pallets
On-Order (PO-8860, ships in 5 days): +40 pallets
Future Reservations (next 7 days):   -30 pallets
─────────────────────────────────────
Extended ATP (7-day):      112 pallets
```

### Inventory Data Model

```
INVENTORY RECORD (one per SKU + Location + Lot):

  inventory_id:          UUID
  sku_id:                FK → Product
  location_id:           FK → Location (warehouse/zone/bin)
  lot_number:            String (manufacturer lot/batch)
  internal_lot:          String (internal receipt lot)

  quantities:
    on_hand:             Decimal
    reserved:            Decimal
    allocated:           Decimal
    on_hold:             Decimal
    damaged:             Decimal

  dates:
    received_date:       Date
    manufacture_date:    Date (from manufacturer)
    expiration_date:     Date (manufacture_date + shelf_life)
    last_counted:        Date
    last_moved:          DateTime

  traceability:
    supplier_id:         FK → Supplier
    po_number:           String
    mill_test_cert:      Document reference (for steel)
    treatment_cert:      Document reference (for treated lumber)

  condition:
    status:              Enum(Available, On-Hold, Damaged, Quarantine, Expired)
    hold_reason:         String (if on hold)
    damage_description:  String (if damaged)
    photos:              [Document references]

  cost:
    unit_cost:           Decimal (cost per UOM)
    landed_cost:         Decimal (including freight, handling)
    total_value:         Decimal (quantity x landed_cost)
```

### Inventory State Machine

```
                                SUPPLIER SIDE
                                     |
                +-------------------+-------------------+
                |                   |                   |
           [ON ORDER]        [IN-TRANSIT          [RECEIVED /
           PO placed,        INBOUND]             ON-HAND]
           supplier          Shipped by           Physically
           confirmed         supplier             in warehouse
                |                   |                   |
                v                   v             +-----+------+
           Supplier            Arrives at      [AVAILABLE]  [ON-HOLD]
           ships               warehouse       Can be       Quality,
                |                   |          promised     dispute
                v                   v              |            |
          [IN-TRANSIT          [RECEIVING]         |       [DAMAGED]
           INBOUND]           Counting,            |       Not sellable
                              inspecting           |
                                   |               |
                                   v               |
                              [PUT AWAY]           |
                              In storage           |
                              location             |
                                   |               |
                                   v               v
                              [AVAILABLE] <--------+
                                   |
                CUSTOMER ORDER FLOW|
                                   v
                              [RESERVED]
                              Committed to SO
                                   |
                                   v
                              [ALLOCATED]
                              On pick list
                                   |
                                   v
                              [PICKED/STAGED]
                              Ready for loading
                                   |
                                   v
                              [LOADED]
                              On truck
                                   |
                                   v
                              [IN-TRANSIT OUTBOUND]
                              En route to customer
                                   |
                                   v
                              [DELIVERED]
                              At customer, signed
                                   |
                                   v
                              [CONSUMED]
                              Record closed,
                              revenue recognized
```

---

## 3. STOCK PRICING FOR INTERNAL COST TRACKING

### Costing Methods Comparison

| Method | How It Works | Pros | Cons | Best For |
|--------|-------------|------|------|----------|
| **FIFO** | Oldest inventory cost assigned to COGS first | Accurate balance sheet, matches physical flow, GAAP and IFRS compliant | Higher tax liability during inflation, more complex tracking | Perishable/expiring items (cement), items with lot tracking requirements |
| **LIFO** | Newest inventory cost assigned to COGS first | Tax deferral during inflation (lower reported profit = lower tax), matches replacement cost | Only US GAAP (not IFRS), understates balance sheet inventory value, complex | High-volume commodities with frequent price changes (steel, lumber during volatile markets) |
| **Weighted Average Cost (WAC)** | Average cost recalculated after each receipt | Simplest to implement, smooths price fluctuations, perpetual accuracy | Obscures individual cost variations, may not reflect true margins on specific transactions | Bulk materials (aggregates), items bought from multiple suppliers at varying prices |
| **Specific Identification** | Actual cost tracked per individual lot/unit | Most precise margins, full traceability | Impractical at scale, requires detailed per-lot tracking | High-value custom items (specialty structural steel, custom-cut materials) |

### Recommended Approach for HyperQuote

**Primary Method: Weighted Average Cost (WAC) with Landed Cost**

This is the industry standard for wholesale building materials distributors because:

1. **Multiple suppliers for same product**: You may buy Portland Cement Type I from 3 different suppliers at 3 different prices. WAC automatically blends these into a single per-unit cost.
2. **Freight variability**: Building materials have high freight cost variability (a load of cement from a local supplier costs $2/bag to deliver; from a distant supplier costs $4/bag). Landed cost captures this.
3. **Simplicity at scale**: As SKU count grows from 30 to 300+, WAC requires less administrative overhead than FIFO or LIFO.
4. **GAAP and IFRS compliant**: WAC is accepted under both accounting standards (LIFO is not IFRS compliant).

**Exception: Use FIFO tracking for shelf-life items** (cement, adhesives, sealants) to enforce FEFO picking even if cost accounting uses WAC.

### Weighted Average Cost Calculation

```
PERPETUAL WEIGHTED AVERAGE (recalculated after every receipt):

After each purchase receipt:
  New WAC = (Existing Inventory Value + New Purchase Value) / (Existing Qty + New Qty)

Example -- Portland Cement Type I:

  Existing inventory: 50 pallets @ $247.50 WAC = $12,375.00
  New receipt: 60 pallets @ $255.00 per pallet  = $15,300.00
  ─────────────────────────────────────────────────────────────
  New total: 110 pallets, total value = $27,675.00
  New WAC = $27,675.00 / 110 = $251.59 per pallet

  This $251.59 is now the cost used for ALL 110 pallets (existing + new).
  When sold, COGS = quantity sold x $251.59
```

### Landed Cost Calculation

Landed cost = Purchase price + all costs to get the product into the warehouse:

```
LANDED COST COMPONENTS:

  Product Purchase Price (per unit)
  + Freight / Transportation
  + Loading / Unloading fees
  + Insurance during transit
  + Import duties (if applicable)
  + Handling / Receiving labor allocation
  + Any broker/agent fees
  ─────────────────────────────────────
  = Landed Cost Per Unit
```

**Freight Allocation Methods:**

| Method | How It Works | Best For |
|--------|-------------|----------|
| **By Weight** | Freight cost divided by total weight, allocated per item by its weight | Heavy mixed loads (cement + hardware on same truck). Heavy items bear proportionally more freight cost. |
| **By Value** | Freight cost divided proportionally by item value | When all items weigh similarly but have different values |
| **By Quantity** | Freight cost divided equally per unit | Uniform items (all the same product on one truck) |
| **By Volume** | Freight cost divided by cubic footage per item | Bulky but light items (insulation, drywall) |
| **Equal Distribution** | Freight divided equally across all line items | Simple but least accurate |

**Recommended for Building Materials: Allocate by Weight**, because freight cost for building materials is predominantly driven by weight. A truck carries a fixed weight capacity, and the cost of the truck is roughly the same regardless of what mix of products is on it.

**Landed Cost Example:**

```
PO-8841 from Gulf Cement Co:
  60 pallets Portland Cement Type I @ $240.00 each = $14,400.00
  20 pallets Masonry Cement @ $260.00 each         =  $5,200.00

  Freight (one truck): $1,800.00
  Unloading labor (2 hours x $25/hr): $50.00

  Total weight: 60 x 2,500 lbs + 20 x 2,200 lbs = 194,000 lbs
  Freight per lb: $1,800 / 194,000 = $0.00928/lb

  Portland Cement: $0.00928 x 150,000 lbs = $1,391.75 freight allocation
  Masonry Cement:  $0.00928 x 44,000 lbs  = $408.25 freight allocation

  Landed cost per pallet:
  Portland: ($14,400 + $1,391.75 + $38.66 labor) / 60 = $263.84
  Masonry:  ($5,200 + $408.25 + $11.34 labor) / 20    = $280.98
```

### Handling Different Costs from Different Suppliers

The WAC method naturally handles this:

```
Scenario: Portland Cement Type I from 3 suppliers

  Supplier A: 40 plt @ $240/plt (local, low freight)  → Landed: $252/plt
  Supplier B: 30 plt @ $235/plt (distant, high freight) → Landed: $260/plt
  Supplier C: 20 plt @ $250/plt (premium, includes delivery) → Landed: $255/plt

  WAC = (40 x $252 + 30 x $260 + 20 x $255) / (40 + 30 + 20)
      = ($10,080 + $7,800 + $5,100) / 90
      = $22,980 / 90
      = $255.33 per pallet (blended landed cost)

All 90 pallets now valued at $255.33 regardless of which supplier they came from.
When a pallet is sold, COGS = $255.33.
```

### Cost Adjustments

| Scenario | How to Handle |
|----------|---------------|
| **Supplier invoice differs from PO price** | Adjust inventory value by the variance. Recalculate WAC. If material was already sold, post adjustment to COGS variance account. |
| **Freight invoice arrives after receipt** | Record estimated freight at receipt (based on standard rates). When actual freight invoice arrives, post the variance. |
| **Damage write-down** | Reduce inventory value for damaged portion. If selling at discount, reduce cost to net realizable value (NRV = estimated selling price - costs to sell). |
| **Volume rebate from supplier** | Apply as negative cost adjustment across the affected receipts. Reduces WAC retroactively. |
| **Currency fluctuation (imports)** | Lock cost at PO confirmation exchange rate. Any variance at payment time goes to FX gain/loss account, not inventory. |

---

## 4. MULTI-LOCATION INVENTORY MANAGEMENT

### Location Hierarchy

```
Company: HyperQuote
  |
  +-- Region: Texas
  |     |
  |     +-- Base A: Houston Warehouse
  |     |     +-- Zone: Indoor Warehouse (WH-A)
  |     |     |     +-- Aisle: CEMENT → Row 1, Row 2 → Bay 01-12 → Level: Floor, Rack-1, Rack-2
  |     |     |     +-- Aisle: HARDWARE → Row 1 → Bay 01-20 → Bin: A through Z
  |     |     |     +-- Aisle: ADHESIVE → Row 1 → Bay 01-08 → Level: Shelf-1 through Shelf-4
  |     |     |
  |     |     +-- Zone: Covered Shed (SHED-A)
  |     |     |     +-- Area: LUMBER-FINISHED
  |     |     |     +-- Area: SHEET-GOODS
  |     |     |
  |     |     +-- Zone: Outdoor Yard (YARD-A)
  |     |     |     +-- Sub-Zone: STEEL (Bunks 1-10)
  |     |     |     +-- Sub-Zone: LUMBER-FRAMING (Stacks 1-20)
  |     |     |     +-- Sub-Zone: PIPE (Racks 1-6)
  |     |     |     +-- Sub-Zone: AGGREGATES (Bins 1-6)
  |     |     |     +-- Sub-Zone: BLOCKS (Rows 1-4)
  |     |     |
  |     |     +-- Zone: Staging (STAGE-A)
  |     |     |     +-- Area: INBOUND (Dock 1, Dock 2, Yard Receiving)
  |     |     |     +-- Area: OUTBOUND (By Route: R1, R2, R3, R4)
  |     |     |
  |     |     +-- Zone: Quarantine (HOLD-A)
  |     |           +-- Area: DAMAGED
  |     |           +-- Area: RETURNS
  |     |           +-- Area: EXPIRED
  |     |
  |     +-- Base B: Dallas Warehouse
  |           +-- (Similar zone structure)
  |
  +-- Region: Southeast
        |
        +-- Base C: Atlanta Warehouse
              +-- (Similar zone structure)
```

### Inter-Warehouse Transfer Process

**One-Step Transfer (bases in same metro area, same-day delivery):**
```
1. Transfer request created (manual or system-suggested)
2. Approved by source base manager
3. Source base picks items → status: In-Transit Between Bases
4. Items loaded on company truck or courier
5. Destination base receives → status: Available at destination
6. No freight cost if company truck; external freight logged if third-party carrier
```

**Two-Step Transfer (bases in different cities):**
```
1. Transfer request created with justification
2. Approved by regional manager (freight cost review)
3. Transfer Order created (functions like a mini PO)
4. Source base picks and ships items
5. Items in transit (visible at both bases as "In-Transit")
6. Destination base receives against Transfer Order
7. Receipt confirmed, inventory updated at both bases
8. Freight cost allocated to receiving base or corporate
```

### How to Decide Where to Store What

**Allocation Rules (in priority order):**

| Priority | Rule | Logic |
|----------|------|-------|
| 1 | Customer proximity | Stock items at the base closest to the customer cluster that orders them most |
| 2 | Demand velocity | Each base stocks its own top 20% SKUs (A items) based on local demand patterns |
| 3 | Supplier proximity | Stock items near the supplier to minimize inbound freight (especially heavy items) |
| 4 | Minimum coverage | Every base carries a minimum set of "must-have" SKUs for emergency/same-day orders |
| 5 | Capacity utilization | Balance stock across bases to avoid one being overloaded while another is empty |
| 6 | Seasonal pre-positioning | Pre-season, build up stock at bases in regions with highest seasonal demand |

**System Auto-Suggestion for Transfers:**
The system should automatically suggest transfers when:
- Base A has excess stock (above max level) and Base B is below reorder point for the same SKU
- A customer order at Base B cannot be fulfilled but Base A has availability
- Seasonal demand shift is approaching (pre-position stock)

### Zone/Bin Management: Indoor Warehouse vs Outdoor Yard

**Indoor Warehouse -- Bin-Level Tracking:**
```
Addressing: ZONE / AISLE / ROW / BAY / LEVEL
Example:    WH-A / CEMENT / R2 / B04 / FLOOR

Characteristics:
- Fixed locations with barcode labels on rack uprights
- Each bin has defined dimensions and weight capacity
- Products assigned to specific zones by type (all cement in cement aisle)
- High-value items in secured zones with restricted access
- Pick face locations (forward pick) replenished from bulk storage (reserve)
- Bin capacity tracked in system to prevent over-storage
```

**Outdoor Yard -- Zone-Level Tracking:**
```
Addressing: YARD / ZONE / SUB-ZONE / POSITION
Example:    YARD-A / STEEL / REBAR / BUNK-3

Characteristics:
- Zones marked with posts and weather-resistant barcode signs
- Positions approximate (a bunk of rebar, a stack of lumber, a pile of stone)
- Layout changes more frequently than indoor (yard reconfigured seasonally)
- GPS on forklifts provides supplementary location data
- Position accuracy: zone level (not bin level) is sufficient for most items
- Exception: high-value structural steel may warrant bunk-level tracking
```

---

## 5. BARCODE AND QR SYSTEM

### Barcode Standards for Building Materials

| Standard | Format | Data Capacity | Best Use |
|----------|--------|---------------|----------|
| **Code 128** | Linear 1D | ~20 characters | Internal location labels, simple product IDs |
| **GS1-128** | Linear 1D with Application Identifiers | ~48 characters | Industry standard for pallet/case labels with GTIN + lot + expiry + SSCC |
| **QR Code** | 2D matrix | ~4,296 characters | Product lookup URLs, detailed lot info, works with phone cameras |
| **GS1 DataMatrix** | 2D matrix | ~2,335 characters | Small items where space is limited, high density encoding |
| **SSCC (via GS1-128)** | 18-digit serial number | Unique pallet ID | Pallet-level tracking, links to full data record in system |

### Recommended Barcode Strategy for HyperQuote

**Tier 1: Use Manufacturer Barcodes (when they exist)**
- Cement bags: Most major brands have UPC/EAN on bags. Scan at receiving.
- Hardware, fittings, fasteners: Generally have manufacturer UPCs.
- Pipe fittings: Usually have UPC/EAN.
- Roofing materials: Manufacturer barcodes on bundles.

**Tier 2: Print Internal Barcode Labels (when manufacturer barcodes do not exist or are insufficient)**
- Steel bundles: Print GS1-128 label at receiving with SKU + lot/heat# + quantity + date. Attach with weather-resistant tie-on tag.
- Lumber bundles: Print label at receiving with SKU + tally count + grade + date. Attach with staple gun to end of bundle.
- Pipe bundles: Print and attach tag with SKU + quantity + size.
- Palletized goods: SSCC label on pallet shrink wrap encoding full pallet contents.

**Tier 3: Location-Based Tracking Only (items that cannot be barcoded)**
- Aggregates (sand, gravel, stone): No barcode possible. Track by bin location + weight.
- Loose bulk materials: Track by zone and estimated quantity.
- Scan the BIN barcode when adding/removing material; enter weight or estimated quantity manually.

**Tier 4: Location Barcodes (infrastructure)**
- Every rack position, bin, zone marker, and yard post gets a weather-resistant barcode label.
- Indoor: Adhesive labels on rack uprights (Code 128 or QR).
- Outdoor: Metal or heavy-duty plastic signs with UV-resistant barcodes on posts.
- Staging areas: Floor-mounted or post-mounted barcodes for inbound/outbound lanes.

### What to Barcode

| Entity | Barcode? | Format | Contains |
|--------|----------|--------|----------|
| Individual cement bag | No (too many, scan pallet instead) | N/A | N/A |
| Cement pallet | Yes (SSCC at receiving) | GS1-128 / QR | SKU, lot, pallet qty, mfg date, expiry |
| Steel bundle | Yes (tag at receiving) | GS1-128 / QR | SKU, heat/lot#, bundle qty, grade |
| Lumber bundle/stack | Yes (tag at receiving) | GS1-128 / QR | SKU, tally count, grade, species |
| Aggregate bin | Yes (bin marker) | Code 128 | Bin ID, material type |
| Pipe bundle | Yes (tag at receiving) | GS1-128 / QR | SKU, qty, diameter, schedule |
| Indoor rack location | Yes (fixed label) | Code 128 | Location address (WH-A/CEM/R2/B04) |
| Yard zone marker | Yes (weather-resistant post) | QR code | Zone/sub-zone address |
| Pallet tag (generic) | Yes (reusable or printed per use) | QR code | Links to pallet contents record |
| Worker badge | Yes | Code 128 | Worker ID |
| Truck/trailer | Yes (placard on truck) | Code 128 | Vehicle ID |

### Hardware Recommendations

| Device | Use Case | Cost Range | Notes |
|--------|----------|------------|-------|
| **Zebra TC52/TC72** | Rugged Android handheld scanner | $1,200-$2,000 | Industry standard for warehouse. Built-in laser scanner, works in bright sunlight, drop-tested. |
| **Zebra MC9300** | Heavy-duty scanner for yard/outdoor | $2,500-$3,500 | Extended range scanning, extreme temperature rated, highest durability |
| **Phone camera (employee phone)** | Backup/casual scanning | $0 (BYOD) | Unreliable in sunlight, slower than dedicated scanner, acceptable for office staff doing occasional lookups |
| **Zebra ZD420/ZD621** | Label printer (thermal) | $400-$800 | Prints barcode labels at receiving for bundles, pallets, tags |
| **Zebra ZT411** | Industrial label printer | $1,500-$2,500 | High-volume label printing, wider label support, for warehouse back office |
| **Bluetooth ring scanner** | Hands-free scanning | $200-$400 | Worn on finger, pairs with phone/tablet. Good for workers who need both hands free. |

### Handling Items That Cannot Be Barcoded

**Bulk Aggregates:**
- Scan the BIN barcode (on the aggregate bin wall/post)
- Enter weight added (from truck scale ticket) or weight removed (from loader scale or truck scale)
- System tracks running balance: Estimated Quantity = Last Physical Measurement + Sum(Receipts) - Sum(Shipments) - Shrinkage Factor
- Periodic physical measurement (drone survey or manual measurement) recalibrates the estimate

**Loose Lumber (individual boards from a broken bundle):**
- Track at the location level, not individual piece level
- Scan location barcode, enter tally count
- Accept higher inventory variance for loose stock (10% tolerance vs 2% for palletized items)

**Cut-to-Order Pieces:**
- When a bundle is broken to cut custom lengths, system creates a "remnant" record
- Remnant tracked by location with approximate quantity
- Remnants flagged for priority sale (avoid accumulating scrap)

---

## 6. RECEIVING WORKFLOW

### Complete Step-by-Step Process

```
STEP 1: PRE-ARRIVAL
═══════════════════
  System shows expected deliveries from PO data + ASN (Advance Ship Notice)
  Warehouse assigns dock/yard receiving area based on:
    - Truck type (flatbed → yard, enclosed → dock, dump truck → aggregate bin)
    - Product type (cement → covered dock, steel → yard)
    - Available dock capacity
  Equipment readiness: forklift staged, scale calibrated (if aggregate), labels ready

STEP 2: TRUCK CHECK-IN
═══════════════════════
  Guard/receiver checks truck against expected delivery schedule
  Verify: Carrier name, truck plate, driver ID, PO number
  For aggregates: record truck gross weight (loaded) on scale
  Direct truck to assigned dock/yard position
  App status: PO marked "Arrived"

STEP 3: DOCUMENT VERIFICATION (BOL CHECK)
══════════════════════════════════════════
  Receiver scans or enters BOL (Bill of Lading) number
  System cross-references BOL against PO:
    - Supplier matches?
    - Quantities align?
    - Product descriptions match?
  Flag any discrepancies BEFORE unloading begins
  OS&D (Overages, Shortages, Damages) pre-check: visual inspection of load
  Photograph load condition before unloading

STEP 4: UNLOADING
══════════════════
  Forklift operator unloads pallets/bundles to staging area
  For aggregates: truck dumps at designated bin, then record tare weight
  Materials placed in marked staging lanes (not final storage yet)
  Cross-dock items identified and routed directly to outbound staging

STEP 5: COUNT AND VERIFY
═════════════════════════
  Per PO line item:
    - Scan product barcode (or scan PO barcode to pull up expected items)
    - Count physical units
    - Enter received quantity in app
    - System shows: Expected vs Received with automatic variance calculation

  For each line item, receiver confirms:
    - Quantity matches (within tolerance)
    - Product specification matches PO (size, grade, type)
    - Unit of measure correct (pallets, bundles, pieces, tons)

STEP 6: QUALITY INSPECTION
══════════════════════════
  Product-specific checklist displayed on device:

  CEMENT:
    ☐ Bags intact (no hardness, lumps, or moisture)
    ☐ Manufacture date checked (shelf life calc)
    ☐ Pallet shrink wrap intact
    ☐ Type/grade matches PO
    ☐ Reject if manufacture date > 3 months ago

  STEEL:
    ☐ Acceptable rust level
    ☐ Sizes and lengths match PO specs
    ☐ Grade stamps visible on bundle tags
    ☐ Mill Test Certificate (MTC) received
    ☐ No excessive bending or damage
    ☐ Bundle tags with heat/lot numbers intact

  LUMBER:
    ☐ Grade stamps present and legible
    ☐ No excessive warping, splitting, or knots beyond grade
    ☐ Moisture content acceptable (if measured)
    ☐ Tally count by dimension matches PO
    ☐ Species matches PO

  PIPE:
    ☐ No cracks (PVC) or dents (steel)
    ☐ Diameter and schedule/wall thickness match
    ☐ Lengths correct
    ☐ Ends undamaged

  AGGREGATES:
    ☐ Visual quality check (no contamination)
    ☐ Material type matches PO (correct stone size, sand type)
    ☐ Weigh ticket obtained

STEP 7: RECORD DISCREPANCIES
═════════════════════════════
  If any variance detected:
    - Short Shipment: Record short quantity + reason code (Supplier Short, Lost in Transit)
    - Over Shipment: Record over quantity (accept or reject excess)
    - Damage: Record damaged quantity, condition detail, photograph damage
    - Wrong Product: Document what was received vs expected, photograph labels
    - Wrong Specification: Document spec mismatch (e.g., received Grade 40 rebar, PO says Grade 60)

  ALL discrepancies must be documented BEFORE driver leaves
  Driver signs delivery receipt with exceptions noted
  System auto-creates discrepancy record and routes to procurement for supplier follow-up

STEP 8: LOT/BATCH RECORDING
════════════════════════════
  For each received lot:
    - Scan or enter manufacturer lot/batch number
    - Record manufacture date (especially cement: triggers expiration calculation)
    - For steel: scan or enter heat number and link to MTC document
    - For treated lumber: record treatment lot/certification
    - System assigns internal receipt lot number
    - System calculates expiration date for shelf-life items

STEP 9: ACCEPT AND SIGN
════════════════════════
  Receiver digitally signs confirming:
    - Quantities received (with noted exceptions)
    - Quality inspection completed
    - Discrepancies recorded
  System updates PO status: Received (Full) or Partially Received
  Triggers:
    - Inventory On-Hand increases
    - Accounts Payable accrual (3-way match: PO, receipt, invoice)
    - Putaway tasks generated

STEP 10: PUTAWAY
════════════════
  System generates putaway tasks:
    - Cement → Indoor warehouse, cement aisle, available bay
    - Steel → Outdoor yard, steel zone, designated bunk
    - Lumber → Covered shed or outdoor lumber zone
    - Aggregates → Already dumped at bin (putaway is the dump itself)

  Worker executes putaway (see Putaway screen above)
  Inventory status: Receiving → Available (after putaway confirmation)
```

### Discrepancy Handling Summary

| Discrepancy | Immediate Action | System Action | Follow-Up |
|------------|-----------------|---------------|-----------|
| **Short by 1-5%** | Note on delivery receipt, accept partial | Adjust received qty, PO shows partial receipt | Procurement contacts supplier for balance shipment |
| **Short by >5%** | Note on receipt, photograph, may hold truck | Create discrepancy record, alert procurement urgently | Procurement escalates; may source from alternate supplier for shortage |
| **Over shipment** | Note on receipt, decide accept or refuse excess | If accepted: add to inventory, create debit memo. If refused: driver takes back. | Procurement notifies supplier of overage |
| **Damaged (partial)** | Separate damaged from good, photograph | Good portion received to Available, damaged to Quarantine/Hold | Supplier claim initiated, disposition decision by supervisor |
| **Damaged (entire load)** | Photograph extensively, refuse delivery | PO remains open (not received), driver takes load back | Procurement demands replacement/credit from supplier |
| **Wrong product** | Refuse the wrong items, accept correct items | Correct items received normally, wrong items stay on truck | Procurement arranges correct product delivery |
| **Wrong specification** | Assess if usable; may accept with concession | If accepted: receive at discount (cost adjustment). If rejected: refuse. | Procurement negotiates credit/replacement |

---

## 7. PICKING AND STAGING

### Pick Methods for Building Materials

| Method | How It Works | Best For | Building Materials Application |
|--------|-------------|----------|-------------------------------|
| **Individual Order Picking** | One picker fills one complete order at a time | Small warehouses, complex orders | Default for building materials. One forklift operator picks all items for one customer order. |
| **Batch Picking** | One picker collects the same SKU for multiple orders in one trip | High SKU repetition across orders | Useful when 5 orders all need cement: pick 50 pallets total in one forklift trip instead of 5 separate trips of 10 each. |
| **Zone Picking** | Warehouse divided into zones; each picker works only their zone | Large warehouses with distinct product zones | Natural fit: one operator works the steel yard, another works cement warehouse, another handles lumber. Each picks their zone's items for all orders. |
| **Wave Picking** | Orders grouped into waves released at scheduled times, aligned with truck departures | Multiple daily shipping waves | Morning wave for Route 1 trucks, afternoon wave for Route 2 trucks. Aligns picking with loading schedules. |
| **Zone + Wave (Hybrid)** | Orders released in waves, picked by zone, consolidated at staging | Large multi-zone operations | Best approach for mature HyperQuote operations: waves timed to truck departures, zone pickers handle their areas, items consolidated at staging by order. |

**Building Materials Reality:** For most building materials warehouses, **individual order picking by forklift** is the primary method because:
- Picks are almost always full pallets or full bundles (not individual items)
- A forklift can only carry 1-2 pallets per trip regardless
- The physical constraint is equipment capacity, not walking distance
- Batch picking makes sense only when the same product goes to many orders (batch the forklift trips)

### Pick Sequencing for Heavy Materials

The pick sequence must consider loading order:

```
PICK SEQUENCE LOGIC:

1. Sort by delivery route/truck assignment
2. Within each truck, sort by delivery stop (reverse order -- last stop picked first)
3. Within each stop, sort by weight (heaviest first -- goes to bottom of truck)
4. Within similar weight items, sort by location efficiency (minimize forklift travel)

Example: Truck FL-203, Route 3, 3 stops:

  Pick Order:
  ┌─── STOP 3 items (loaded first, bottom of truck) ───┐
  │ 1. 20 plt Cement Type I (50,000 lbs)  → Fork 1-4  │
  │ 2. 5 bndl #4 Rebar 20ft (10,000 lbs) → Fork 5    │
  └────────────────────────────────────────────────────┘
  ┌─── STOP 2 items (loaded second, middle) ───────────┐
  │ 3. 10 plt Cement Type I (25,000 lbs)  → Fork 6-8  │
  │ 4. 200 pcs 2x4x8 SPF (2,800 lbs)     → Fork 9    │
  └────────────────────────────────────────────────────┘
  ┌─── STOP 1 items (loaded last, top/front) ──────────┐
  │ 5. 50 sht 3/4" Plywood (3,750 lbs)   → Fork 10   │
  └────────────────────────────────────────────────────┘
```

### Equipment Required for Picking

| Material Type | Equipment | Capacity Notes |
|--------------|-----------|---------------|
| Cement pallets | Standard forklift (5,000-10,000 lb) | 1 pallet per trip (~2,500 lbs each). 10,000 lb forklift can carry 2 pallets. |
| Steel bundles | Heavy forklift (10,000-15,000 lb) or overhead crane | Bundles can weigh 2,000-5,000 lbs. Long items (40 ft rebar) need extended forks or side-loader. |
| Lumber stacks | Standard forklift or side-loader | Long items need side-loader or careful handling with extended forks. |
| Sheet goods | Standard forklift with clamp attachment | Plywood/drywall picked with sheet clamp. Drywall extremely fragile. |
| Pipe | Forklift with pipe cradle or manual loading | Long pipe may need two-person handling or specialized equipment. |
| Aggregates | Front-end loader or skid steer | Loaded by bucket into dump truck or customer truck. Sold by weight (load, weigh, repeat). |
| Small items | Manual with pallet jack or hand carry | Hardware, fittings, fasteners. Only items picked by hand. |

### Staging Area Management

```
STAGING AREA LAYOUT:

  ┌────────────────────────────────────────────────┐
  │              OUTBOUND STAGING                    │
  │                                                  │
  │  ROUTE 1      ROUTE 2      ROUTE 3    ROUTE 4  │
  │  ┌──────┐    ┌──────┐    ┌──────┐    ┌──────┐ │
  │  │SO-4412│    │SO-4418│    │SO-4420│    │SO-4425│ │
  │  │SO-4414│    │SO-4419│    │SO-4421│    │      │ │
  │  │      │    │      │    │      │    │      │ │
  │  └──────┘    └──────┘    └──────┘    └──────┘ │
  │                                                  │
  │  DOCK 1      DOCK 2      YARD LOAD   YARD LOAD │
  │  (Truck FL)  (Truck FL)  (AREA A)    (AREA B)  │
  │                                                  │
  │  ┌──────────────────────────────────────────┐   │
  │  │          VERIFICATION CHECKPOINT          │   │
  │  │  (Checker verifies pick vs order)         │   │
  │  └──────────────────────────────────────────┘   │
  │                                                  │
  │              INBOUND STAGING                     │
  │  (Receiving → Putaway queue)                    │
  └────────────────────────────────────────────────┘
```

- Staging lanes designated by route/truck
- Each lane has a floor-mounted barcode for scanning
- Picked materials staged in lane, organized by delivery stop order
- Checker verifies staged materials against pick list before loading begins
- Physical separation between inbound staging (receiving) and outbound staging (shipping)
- Staging area capacity tracked: system warns if too many orders staged without trucks (bottleneck)

---

## 8. CYCLE COUNTING

### ABC Classification for Building Materials

| Class | % of SKUs | % of Revenue | Count Frequency | Variance Threshold | Examples |
|-------|-----------|-------------|-----------------|--------------------|----|
| **A** | 10-20% | 70-80% | Weekly or bi-weekly | 2% | Portland cement (all types), #4 rebar 20ft, 2x4x8 SPF, 3/4" plywood, concrete blocks 8x8x16 |
| **B** | 20-30% | 15-20% | Monthly | 5% | #3 and #5 rebar, 2x6 and 2x8 lumber, masonry cement, wire mesh, common PVC pipe sizes, drywall |
| **C** | 50-70% | 5-10% | Quarterly | 10% | Specialty steel sections, uncommon pipe fittings, specialty adhesives, imported materials |

### Counting Methods

**1. ABC Cycle Counting (Primary Method)**
- System assigns counts based on ABC classification and last-count date
- A items: every location counted every 2 weeks
- B items: every location counted monthly
- C items: every location counted quarterly
- Daily count queue generated automatically: "Count these 5-10 locations today"

**2. Opportunity Counting**
- Count whenever a location is touched: after pick, after putaway, after transfer
- "While you are at this location, confirm the quantity"
- Low additional effort, high accuracy improvement
- Best for building materials because workers visit locations with forklifts anyway

**3. Random Counting**
- System randomly selects locations for count regardless of ABC class
- Provides statistical validation of overall inventory accuracy
- Useful for auditor compliance (demonstrates random sampling)

**4. Control Group Counting**
- Small fixed set of locations counted repeatedly (daily or every other day)
- Used to identify systemic issues: if the control group develops errors, it indicates a process problem (e.g., workers not scanning picks correctly)

**5. Location-Triggered Counting**
- Count triggered when system shows zero but product is observed at location
- Count triggered when pick fails (worker reports "location empty" but system shows stock)
- Count triggered after any inventory adjustment

### Inventory Accuracy Targets

| Metric | Target | Industry Average | World-Class |
|--------|--------|-----------------|-------------|
| **Overall Inventory Accuracy** | 97%+ | 85-93% | 99%+ |
| **A-Item Accuracy** | 99%+ | 95% | 99.5%+ |
| **B-Item Accuracy** | 97%+ | 90% | 98%+ |
| **C-Item Accuracy** | 95%+ | 80% | 97%+ |
| **Location Accuracy** | 98%+ | 90% | 99%+ |
| **Aggregate/Bulk Accuracy** | 90-95% | 80-85% | 95%+ |

**Building Materials Reality:** Achieving 97% overall accuracy for building materials is harder than for small consumer goods because:
- Heavy items are harder to count precisely (is that 38 or 40 bundles of rebar?)
- Yard inventory is estimated, not exact (aggregate piles, partial lumber stacks)
- Weather damage can destroy inventory between counts
- Items shift/settle/collapse in outdoor storage
- Target 97% for indoor (palletized, racked) and 90-95% for outdoor (yard, bulk) with a combined target of 95-97%

### Discrepancy Resolution Workflow

```
Count Submitted (Blind)
    |
    v
System Calculates Variance
    |
    +-- Within threshold → Auto-accepted, no adjustment
    |
    +-- Exceeds threshold
            |
            v
        Recount Requested (by different worker)
            |
            +-- Recount matches original count
            |       → Variance confirmed
            |       → Supervisor approval required
            |       → Reason code required
            |       → Inventory adjusted (up or down)
            |       → Financial impact recorded
            |
            +-- Recount matches system quantity
            |       → Original count was wrong
            |       → No adjustment needed
            |       → Flag original counter for training
            |
            +-- Recount differs from both
                    → Investigate: check recent transactions,
                      movement history, adjacent locations
                    → May require manager investigation
                    → Hold affected inventory until resolved
```

### Reason Codes for Adjustments

| Code | Description | Typical Cause | Prevention |
|------|------------|---------------|------------|
| RCV-ERR | Receiving error | Miscounted at receiving | Enforce scan verification at receiving |
| PCK-ERR | Pick error | Picked wrong quantity or wrong location | Enforce scan-and-confirm at picking |
| DMG-UNR | Unrecorded damage | Forklift damage, weather damage not reported | Mandatory damage reporting, better training |
| LOC-ERR | Location error | Product in wrong location (mispick, misputaway) | Scan-and-confirm putaway |
| THEFT | Theft/pilferage | Unauthorized removal | Security cameras, access controls |
| SYS-ERR | System error | Software bug, integration error | IT investigation, data audit |
| SHRINK | Natural shrinkage | Aggregate spillage, moisture weight change, breakage | Apply standard shrinkage factors |
| UOM-ERR | Unit of measure error | Counted in pieces instead of bundles | UOM training, system prompts |

---

## 9. YARD MANAGEMENT

### Why Yard Management Is Critical for Building Materials

In a building materials distribution operation, the outdoor yard typically holds **60-70% of total inventory value** (steel, lumber, aggregates, pipe, blocks) while the indoor warehouse holds 30-40% (cement, adhesives, hardware, drywall). Yard management is not secondary to warehouse management -- it IS the majority of inventory management.

### Yard Layout Design Principles

```
TYPICAL BUILDING MATERIALS YARD LAYOUT:

    ┌────────────────────────────────────────────────────┐
    │                 ENTRANCE / GATE                     │
    │              (Truck Scale / Guard)                  │
    ├────────────────────────────────────────────────────┤
    │                                                    │
    │   ┌──────────────┐    STAGING AREA                │
    │   │  WAREHOUSE   │    (Loading/Unloading)         │
    │   │  (Covered)   │                                │
    │   │  Cement      │    ┌────────────────────┐      │
    │   │  Hardware    │    │   STEEL ZONE       │      │
    │   │  Adhesives   │    │   Rebar bunks      │      │
    │   │  Drywall     │    │   Structural bays  │      │
    │   └──────────────┘    └────────────────────┘      │
    │                                                    │
    │   ┌──────────────┐    ┌────────────────────┐      │
    │   │  COVERED     │    │   LUMBER ZONE      │      │
    │   │  SHED        │    │   Bunks by dim     │      │
    │   │  (Finished   │    │   Sheet goods      │      │
    │   │   lumber,    │    └────────────────────┘      │
    │   │   sheets)    │                                │
    │   └──────────────┘    ┌────────────────────┐      │
    │                       │   PIPE ZONE        │      │
    │   ┌──────────────┐    │   Racks by size    │      │
    │   │  AGGREGATE   │    └────────────────────┘      │
    │   │  BINS        │                                │
    │   │  Sand|Gravel │    ┌────────────────────┐      │
    │   │  Stone|Fill  │    │   BLOCK/PAVER ZONE │      │
    │   └──────────────┘    │   Pallets on ground│      │
    │                       └────────────────────┘      │
    │                                                    │
    │   ┌────────────────────────────────────────┐      │
    │   │       TRUCK PARKING / STAGING           │      │
    │   └────────────────────────────────────────┘      │
    │                                                    │
    └────────────────────────────────────────────────────┘

DESIGN PRINCIPLES:
  - One-way traffic flow (reduces forklift accidents)
  - Heaviest/most-frequent items nearest to staging area
  - Steel zone requires overhead crane access path
  - Aggregate bins angled for front-loader access
  - Lumber stacks oriented for forklift approach from main aisle
  - Adequate turning radius for loaded forklifts (14-16 ft minimum)
  - Drainage: grade yard away from steel (rust) and lumber (rot)
  - Lighting: yard must be lit for early morning / late evening operations
```

### Zone Addressing System

```
YARD ZONE HIERARCHY:

  YARD-A (Houston)
    +-- ZONE: STEEL
    |     +-- SUB-ZONE: REBAR
    |     |     +-- BUNK-1 (stores #3 rebar, 20 ft lengths)
    |     |     +-- BUNK-2 (stores #4 rebar, 20 ft lengths)
    |     |     +-- BUNK-3 (stores #5 rebar, 40 ft lengths)
    |     |     +-- BUNK-4 (stores mesh/wire)
    |     +-- SUB-ZONE: STRUCTURAL
    |           +-- BAY-A (W-beams, H-columns)
    |           +-- BAY-B (Angles, channels)
    |           +-- BAY-C (Flat bar, round bar)
    |
    +-- ZONE: LUMBER
    |     +-- SUB-ZONE: FRAMING
    |     |     +-- STACK-1 (2x4x8 SPF)
    |     |     +-- STACK-2 (2x4x12 SPF)
    |     |     +-- STACK-3 (2x6x8 SPF)
    |     |     +-- STACK-4 (2x6x12 SPF)
    |     +-- SUB-ZONE: DIMENSIONAL
    |     |     +-- STACK-5 (2x8), STACK-6 (2x10), STACK-7 (2x12)
    |     +-- SUB-ZONE: SHEET-GOODS (in covered shed)
    |           +-- RACK-A (3/4" plywood)
    |           +-- RACK-B (1/2" plywood)
    |           +-- RACK-C (7/16" OSB)
    |
    +-- ZONE: PIPE
    |     +-- RACK-1 (PVC Schedule 40, by diameter)
    |     +-- RACK-2 (PVC Schedule 80, by diameter)
    |     +-- RACK-3 (Steel pipe, by diameter)
    |     +-- RACK-4 (Copper, by diameter)
    |
    +-- ZONE: AGGREGATES
    |     +-- BIN-1 (Concrete sand)
    |     +-- BIN-2 (Pea gravel)
    |     +-- BIN-3 (#57 crushed stone)
    |     +-- BIN-4 (Road base / fill)
    |     +-- BIN-5 (Decorative stone)
    |     +-- BIN-6 (Topsoil / dirt)
    |
    +-- ZONE: BLOCKS
    |     +-- ROW-1 (Standard CMU 8x8x16)
    |     +-- ROW-2 (Half blocks, cap blocks)
    |     +-- ROW-3 (Pavers, retaining wall blocks)
    |
    +-- ZONE: STAGING
          +-- INBOUND (unloading area)
          +-- OUTBOUND-R1 (Route 1 loading)
          +-- OUTBOUND-R2 (Route 2 loading)
          +-- OUTBOUND-R3 (Route 3 loading)
```

### GPS/Zone-Based Tracking vs Bin-Level

| Approach | Accuracy | Cost | Best For |
|----------|----------|------|----------|
| **Zone barcode scanning** | Zone-level (~50 ft) | Low ($500-$2,000 for signs) | Starting point for all yards. Workers scan zone sign when performing put/pick. |
| **GPS on forklifts** | 3-5 meter | Medium ($500-$1,000/forklift) | Supplementary data. Auto-logs forklift position during operations. |
| **RFID on bundles/tags** | Sub-zone (5-10 ft) | Medium ($2-$5/tag + $5,000-$15,000 readers) | High-value steel tracking. Passive RFID on bundle tags, readers at zone entry/exit. |
| **BLE beacons** | Zone/sub-zone (3-10 ft) | Medium ($20-$50/beacon + $100-$200/reader) | Good for defining virtual boundaries within zones. |
| **UWB (Ultra-Wideband)** | Sub-meter (30 cm) | High ($50-$100/tag + $30,000+ infrastructure) | Overkill for most building materials yards. |
| **Drone surveys** | Excellent for volume estimation | Medium ($2,000-$10,000 per survey or own drone) | Periodic aggregate pile measurement, yard overview. |
| **Camera + AI vision** | Good for pile estimation | High ($10,000-$50,000 setup) | Continuous aggregate level monitoring, unusual activity detection. |

**Recommended Progression:**
1. **Start (Phase 1):** Zone barcode signs + manual scan. Cost: ~$2,000 total.
2. **Growth (Phase 2):** Add GPS on forklifts for passive location tracking. Cost: ~$3,000 added.
3. **Scale (Phase 3):** Add RFID for high-value items (structural steel). Cost: ~$15,000 added.
4. **Optimize (Phase 4):** Drone surveys for aggregate measurement, camera AI for level monitoring.

### Bulk Material Management (Weight/Volume Tracking)

**Aggregates (sand, gravel, stone):**
```
INVENTORY TRACKING METHOD:

  Receipt: Truck scale (gross - tare = net tons delivered)
  Storage: Dumped in designated bin
  Shipment: Front-loader fills customer truck/trailer, then scale

  Running Balance:
    Estimated On-Hand = Last Physical Measurement
                      + Sum(Receipts since measurement)
                      - Sum(Shipments since measurement)
                      - Shrinkage Factor (2-5% applied monthly)

  Physical Measurement Methods:
    1. Drone photogrammetry: Fly drone, create 3D model of pile, calculate volume,
       multiply by density factor. Accuracy: +/- 3-5%.
    2. Manual survey: Measure pile dimensions (length x width x avg height),
       apply cone/trapezoid formula. Accuracy: +/- 10-15%.
    3. Loader bucket count: Count buckets loaded, multiply by bucket capacity.
       Accuracy: +/- 5-10%.

  Density Factors (tons per cubic yard):
    Concrete sand:    1.3-1.4
    Pea gravel:       1.4-1.5
    #57 Crushed stone: 1.3-1.4
    Road base:        1.6-1.8
    Topsoil:          1.0-1.1
    River rock:       1.3-1.4

  SHRINKAGE FACTORS:
    Sand: 3-5% (wind, rain washing, spillage)
    Gravel: 2-3% (spillage, contamination)
    Crushed stone: 2-3%
    NOTE: Rain adds water weight. Wet sand can weigh 20-30% more than dry.
    System should have wet/dry toggle or moisture factor for weight conversion.
```

### Weather Considerations

| Material | Weather Risk | Protection Required | System Action |
|----------|-------------|--------------------|----|
| **Cement** | Moisture destroys it (bags harden and become useless) | Must be stored in covered, dry area. Off ground on pallets. | Alert if humidity > 70%, trigger move to covered area if staged outdoors too long |
| **Steel** | Surface rust (cosmetic, usually acceptable short-term) | Store on timber dunnage off ground. Cover with tarp for extended storage. | Low priority alert for rain; high priority only for galvanized or coated steel |
| **Lumber** | Warping, mold, rot from prolonged moisture | Sticker-stacked for airflow. Cover top. Finished/treated lumber needs roof. | Alert before rain: "Cover lumber zone?" Weather integration for forecasts. |
| **Aggregates** | Weight gain from rain (affects sell-by-weight accuracy) | None needed for material quality. Weight accuracy affected. | Toggle wet/dry in system for weight adjustment. Note: customer may dispute wet weight. |
| **Drywall/Insulation** | Total destruction from moisture | Must be indoor or fully covered. Never outdoor. | Hard rule: system prevents putaway to outdoor location for these products. |
| **Pipe (PVC)** | UV degradation over months of sun exposure | Store under cover or use UV-protective wrap for extended storage. | Alert if PVC in outdoor zone > 30 days. |

---

## 10. RETURNS PROCESSING

### Complete Returns Workflow

```
STEP 1: RETURN AUTHORIZATION (RMA)
═══════════════════════════════════
  Customer contacts sales/customer service
  Sales creates RMA with:
    - Original SO reference
    - Items being returned (product, quantity, original lot if known)
    - Return reason (wrong product, damaged, over-ordered, spec mismatch, defective)
    - Expected return date/method (customer delivery, customer pickup at our base, our truck picks up)
  RMA sent to warehouse as "Expected Return"

STEP 2: RECEIVE RETURN AT WAREHOUSE
════════════════════════════════════
  Warehouse sees RMA in Pending Returns queue
  When product arrives:
    - Scan RMA barcode or enter RMA number
    - Verify returned product matches RMA (SKU, quantity)
    - Stage in Returns area (separate from main inventory)
    - Status: Returned → Pending Inspection

STEP 3: INSPECTION
══════════════════
  Inspector examines returned materials:

  CONDITION ASSESSMENT:
    Grade A - Like New: Original packaging, undamaged, within shelf life, resellable at full price
    Grade B - Good: Minor packaging damage, product intact, resellable (may need repackaging)
    Grade C - Fair: Product has minor damage, can sell at discount or rework (cut off damaged end)
    Grade D - Damaged: Significant damage, cannot sell. Scrap/dispose or return to supplier.
    Grade X - Wrong Product: Customer returned something different than what they bought

  SPECIFIC CHECKS FOR BUILDING MATERIALS:
    Cement: Has it been opened? Any signs of moisture/hardening? Still within shelf life?
    Steel: Any bending, cutting, welding marks? Was it modified by customer?
    Lumber: Any cutting, nailing, painting? Still at original dimensions?
    Pipe: Any cuts, glue marks, modifications?

  KEY QUESTION: Was the product modified or used by the customer?
    If yes → Usually not returnable (or only at significant discount)
    If no → Standard inspection for condition

STEP 4: DISPOSITION DECISION
════════════════════════════
  Based on inspection, supervisor decides:

  ┌──────────────────────────────────────────────────────────┐
  │ Disposition     │ Inventory Action   │ Financial Action  │
  ├──────────────────────────────────────────────────────────┤
  │ Restock (A)     │ Return to Available│ Full credit note  │
  │ Restock (B/C)   │ Available at       │ Full or partial   │
  │                 │ discount/clearance │ credit note       │
  │ Return to       │ Create outbound    │ Credit note +     │
  │ Supplier (RTV)  │ transfer to        │ debit to supplier │
  │                 │ supplier           │                   │
  │ Scrap           │ Write off, remove  │ Credit note +     │
  │                 │ from inventory     │ write-off expense │
  │ Hold            │ Quarantine zone    │ No action yet     │
  │ Reject Return   │ No inventory       │ No credit note,   │
  │ (not eligible)  │ change. Customer   │ customer keeps    │
  │                 │ takes back.        │ product.          │
  └──────────────────────────────────────────────────────────┘

STEP 5: EXECUTE DISPOSITION
═══════════════════════════
  Restock: Putaway task created (same as receiving putaway)
  RTV: Outbound shipment to supplier. Inventory state: In-Transit Outbound (RTV).
  Scrap: Inventory removed. Disposal arranged. Write-off recorded.
  Hold: Stays in quarantine zone until further decision.

STEP 6: FINANCIAL TRIGGER
═════════════════════════
  Credit note auto-generated based on disposition:
    Full credit: Original unit price x returned quantity
    Partial credit: Assessed value (discount applied for condition)
    No credit: Return rejected, customer retains product

  Credit note routed to finance for approval if above threshold (e.g., > $5,000)
  Below threshold: auto-approved and applied to customer account
```

### Return Reasons and Their Typical Dispositions

| Return Reason | Typical % | Likely Disposition | Credit? |
|--------------|-----------|-------------------|---------|
| Wrong product ordered by customer | 25-30% | Restock if unopened/unused | Yes, minus restocking fee (10-15%) |
| Over-ordered (excess materials) | 20-25% | Restock if in good condition | Yes, minus restocking fee |
| Damaged at delivery (our fault) | 15-20% | Scrap or discount sell | Yes, full credit |
| Wrong product shipped (our error) | 10-15% | Restock + send correct product | Yes, full credit + replacement |
| Defective/quality issue | 5-10% | Return to supplier (RTV) | Yes, full credit; recover from supplier |
| Spec mismatch | 5-10% | Restock or RTV depending on product | Yes, full credit |
| Customer changed mind / project cancelled | 5-10% | Restock if in original condition | Depends on terms (may charge restocking fee) |

### Building Materials Return Complications

| Issue | Challenge | Solution |
|-------|-----------|---------|
| **Cement returned after sitting outdoors** | May have absorbed moisture, bags hard/lumpy | Inspect every bag on pallet. Discard hardened bags. Credit only for good bags. |
| **Lumber returned with nail holes or cuts** | Customer used some, returning remainder as "unused" | Inspect each piece. Reject modified pieces. Credit only for truly unused. Sell modified as scrap/discount. |
| **Steel returned with torch cuts** | Customer cut pieces and returns offcuts | Reject cut pieces from return. These are scrap, not returns. |
| **Partial pallet returns** | Customer used 20 bags of cement, returns remaining 22 | Break pallet, count individual items, assess condition of each. More labor-intensive than full pallet returns. |
| **No original packaging** | Insulation, drywall removed from shrink wrap | Assess if product is still sellable without original packaging. Often must markdown. |
| **Mixed lot returns** | Customer returns materials from multiple original orders | Must trace each item back to original SO for accurate credit pricing (prices may differ). |

---

## 11. ALERTS AND AUTOMATION

### Alert Categories and Actions

| Alert Type | Trigger | Severity | Action: Auto or Human? | Notification |
|-----------|---------|----------|----------------------|-------------|
| **Low Stock (Below Reorder Point)** | Available qty falls below ROP for A or B item | High | **Auto**: Generate purchase suggestion, notify procurement. **Human**: Approve PO, select supplier. | Push to procurement + warehouse manager |
| **Critical Stock (Below Safety Stock)** | Available qty falls below safety stock | Critical | **Auto**: Generate URGENT purchase request, flag all pending orders for this item. **Human**: Emergency sourcing decision. | Push + SMS to procurement manager |
| **Out of Stock** | Available qty = 0 | Critical | **Auto**: Hold any new order acceptance for this item, notify sales team. **Human**: Customer communication, alternative sourcing. | Push to sales, procurement, warehouse manager |
| **Shelf Life Expiration (30 days)** | Item within 30 days of expiration | Medium | **Auto**: Flag for priority sale/discount, prevent allocation to new orders after expiry. **Human**: Decide to discount, use, or dispose. | Push to warehouse supervisor |
| **Shelf Life Expiration (7 days)** | Item within 7 days of expiration | High | **Auto**: Move to quarantine/hold. Block from picking. **Human**: Dispose/scrap decision. | Push to warehouse manager |
| **Shelf Life Expired** | Item past expiration date | Critical | **Auto**: Set status = Expired, move to quarantine, block all operations. **Human**: Scrap disposition and write-off approval. | Push + email to warehouse manager + finance |
| **Damage Reported** | Worker reports damage in app | Medium | **Auto**: Create hold record, move to quarantine zone in system. **Human**: Inspect and disposition. | Push to warehouse supervisor |
| **Cycle Count Variance** | Count variance exceeds threshold | Medium-High | **Auto**: Request recount, block location for new picks until resolved. **Human**: Investigate, approve adjustment. | Push to count supervisor |
| **Receiving Discrepancy** | Received qty differs from PO by > tolerance | Medium | **Auto**: Create discrepancy record, route to procurement. **Human**: Contact supplier, decide accept/reject. | Push to receiver + procurement |
| **Transfer Suggestion** | Base A overstocked + Base B below ROP | Medium | **Auto**: Generate transfer suggestion with freight cost estimate. **Human**: Approve/reject transfer. | Push to regional manager |
| **Weather Alert** | Rain/storm forecast + outdoor inventory present | Medium | **Auto**: Generate cover/protect recommendation for exposed materials. **Human**: Execute covering (physical action). | Push to all yard workers |
| **Weight Limit Warning** | Load calculation approaching truck capacity | Medium | **Auto**: Display warning during loading. Block load complete if over limit. **Human**: Remove items or arrange second truck. | Display on loading screen |
| **Dock Congestion** | Multiple trucks waiting, limited dock space | Medium | **Auto**: Suggest resequencing of receiving schedule. **Human**: Redirect trucks or extend hours. | Push to warehouse manager |
| **Worker Idle** | Worker has not scanned anything in > 30 min | Low | **Auto**: Log for productivity tracking. **Human**: Supervisor checks on worker. | Push to supervisor (configurable) |
| **Reorder Point Recalculation** | Monthly automatic recalculation based on last 90 days | Low | **Auto**: Recalculate ROP and safety stock for all items, flag significant changes. **Human**: Review and confirm new levels. | Email to inventory planner |

### Reorder Point Automation

```
REORDER POINT FORMULA:

  ROP = (Average Daily Demand x Lead Time in Days) + Safety Stock

  Safety Stock = Z x SQRT(LT x SD_demand^2 + D_avg^2 x SD_leadtime^2)

  Where:
    Z = Service level factor (1.65 for 95% service level target for A items)
    LT = Average supplier lead time (days)
    SD_demand = Standard deviation of daily demand
    D_avg = Average daily demand
    SD_leadtime = Standard deviation of supplier lead time

AUTOMATION LEVELS:

  Level 1 (Starter): Manual reorder points set by manager. System alerts when below.

  Level 2 (Assisted): System calculates suggested ROP based on historical data.
    Manager reviews and approves. Alert on breach.

  Level 3 (Semi-Auto): System calculates ROP, auto-generates purchase suggestions
    when breached. Procurement reviews and converts to PO with one click.

  Level 4 (Auto): System calculates ROP, auto-generates PO when breached,
    routes to preferred supplier, procurement approves. Handles routine
    replenishment automatically. Humans handle exceptions only.
```

### What Should Be Automatic vs Human Decision

| Process | Automatic | Human Decision |
|---------|-----------|---------------|
| Reorder point breach alert | Always auto | Never -- alert must always fire |
| Purchase suggestion generation | Auto (Level 2+) | Procurement reviews and adjusts |
| PO creation from suggestion | Auto at Level 4 for A items, human for B/C | Supplier selection if multiple options |
| Shelf life quarantine at expiration | Always auto -- non-negotiable | Disposition decision after quarantine |
| Putaway location suggestion | Always auto | Worker can override with reason |
| Pick lot selection (FEFO) | Always auto | Worker cannot override (safety/liability) |
| Cycle count scheduling | Always auto based on ABC class | Supervisor can add ad-hoc counts |
| Discrepancy recount request | Auto when variance > threshold | Investigation is always human |
| Inventory adjustment posting | Never auto (requires approval) | Always human approval with reason code |
| Transfer suggestion | Auto when imbalance detected | Manager approval for inter-base |
| Credit note generation (returns) | Auto below threshold, routed above | Finance reviews above threshold |
| Damage write-off | Never auto | Always supervisor/manager decision |

---

## 12. INTEGRATION WITH OTHER MODULES

### Module Integration Map

```
                    ┌──────────────┐
                    │   CUSTOMER   │
                    │   PORTAL     │
                    └──────┬───────┘
                           │ Stock availability
                           │ queries
                    ┌──────▼───────┐
                    │   SALES /    │──── Quotes
                    │   ORDERS     │──── Order confirmation
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
     ┌────────▼──────┐    │     ┌──────▼───────┐
     │  PROCUREMENT   │    │     │  DISPATCH /   │
     │  (POs to       │    │     │  DELIVERY     │
     │   suppliers)   │    │     │  (Trucks,     │
     └────────┬──────┘    │     │   routes)     │
              │            │     └──────┬───────┘
              │     ┌──────▼───────┐    │
              └────►│  WAREHOUSE   │◄───┘
                    │  APP         │
                    │              │
                    │ - Receiving  │
                    │ - Putaway    │
                    │ - Picking    │
                    │ - Loading    │
                    │ - Counting   │
                    │ - Returns    │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
     ┌────────▼──────┐    │     ┌──────▼───────┐
     │   FINANCE /    │    │     │   SUPPLIER   │
     │   ACCOUNTING   │    │     │   PORTAL     │
     └───────────────┘    │     └──────────────┘
                           │
                    ┌──────▼───────┐
                    │   INVENTORY  │
                    │   MASTER     │
                    │   (Central   │
                    │    source    │
                    │    of truth) │
                    └──────────────┘
```

### Integration Point Details

**1. Orders --> Warehouse (Outbound Flow)**

| Trigger Event | Data Sent to Warehouse | Warehouse Action | Timing |
|--------------|----------------------|------------------|--------|
| Order confirmed (stocked item) | SO number, line items, quantities, required delivery date, customer address, site contact | Reserve inventory (Available → Reserved) | Real-time (immediate) |
| Pick list approved | Pick list with items, quantities, storage locations, lot assignments, delivery sequence priority | Begin directed picking | Real-time |
| Delivery scheduled | Truck assignment, route number, delivery time windows, stop sequence | Stage picked materials by route/truck | Real-time |
| Order quantity changed | Change notification with revised quantities | Adjust reservation (up or down) | Real-time |
| Order cancelled | Cancellation notice with SO reference | Release reservation (Reserved → Available), return any picked items | Real-time |
| New line added to order | Additional items and quantities | Reserve additional inventory or trigger procurement | Real-time |

**2. Warehouse --> Orders (Outbound Feedback)**

| Warehouse Event | Data Sent to Orders/Sales | Impact |
|----------------|--------------------------|--------|
| Pick complete | Confirmed picked quantities (may differ from ordered if short) | Update order with actual quantities; notify sales of any shorts |
| Short pick | Short quantity and reason (out of stock, damaged, location empty) | Sales notifies customer; triggers backorder or re-procurement |
| Load complete | Bill of lading, truck ID, driver, departure time | Trigger delivery tracking, notify customer of shipment |
| Delivery confirmed (from driver app) | POD signature, photos, delivery timestamp | Triggers invoicing in finance |
| Delivery exception | Refusal reason, damage notes, partial receipt | Triggers return/credit process |

**3. Procurement --> Warehouse (Inbound Flow)**

| Trigger Event | Data Sent to Warehouse | Warehouse Action |
|--------------|----------------------|------------------|
| PO placed (ship-to-warehouse) | PO details: supplier, products, quantities, expected delivery date, truck type | Add to expected deliveries; schedule dock/yard space |
| Supplier ships (ASN received) | Advance Ship Notice: actual quantities, carrier, tracking, ETA | Prepare receiving: crew, equipment, labels |
| PO changed by procurement | Revised quantities or dates | Adjust receiving schedule |
| PO cancelled | Cancellation notice | Remove from expected deliveries |

**4. Warehouse --> Procurement (Inbound Feedback)**

| Warehouse Event | Data Sent to Procurement | Impact |
|----------------|--------------------------|--------|
| Receipt complete (matches PO) | Received quantities, lot numbers, condition report | PO lines marked received; triggers AP accrual (3-way match) |
| Receipt with discrepancy | Short/over quantities, damage details, photos | Procurement contacts supplier; credit/debit memo |
| Quality hold | Items on hold with reason and photos | Procurement escalates quality issue with supplier |
| Delivery rejected | Rejection reason, full load refused | Procurement arranges return/replacement |
| Reorder point breach | SKU below ROP, current quantity, suggested reorder quantity | Procurement initiates new PO |

**5. Warehouse --> Finance / Accounting**

| Warehouse Event | Financial Impact | Journal Entry |
|----------------|-----------------|---------------|
| Goods received | Inventory asset increases | Debit: Inventory; Credit: AP Accrual |
| Goods shipped (delivered) | Inventory asset decreases, COGS recorded | Debit: COGS; Credit: Inventory |
| Inventory adjustment (cycle count +) | Write-up | Debit: Inventory; Credit: Inventory Adjustment (gain) |
| Inventory adjustment (cycle count -) | Write-down | Debit: Inventory Adjustment (shrinkage); Credit: Inventory |
| Damage/scrap write-off | Expense | Debit: Damage/Scrap Expense; Credit: Inventory |
| Inter-base transfer | No P&L impact | Debit: Inventory (Dest); Credit: Inventory (Source) |
| Landed cost allocation | Adjusts inventory value | Debit: Inventory; Credit: AP/Accrued Freight |
| Return restocked | Inventory increases | Debit: Inventory; Credit: Customer Credit (or COGS reversal) |

**6. Warehouse --> Dispatch / Driver App**

| Warehouse Event | Data Sent to Dispatch | Impact |
|----------------|----------------------|--------|
| Pick complete and staged | "Ready to load" status per route | Dispatch confirms truck availability |
| Load complete | Bill of lading, load weight, item manifest | Driver app receives delivery list |
| Load photo documentation | Photos of load condition on truck | Reference for delivery disputes |

**7. Warehouse --> Supplier Portal**

| Data Exchange | Direction | Purpose |
|--------------|-----------|---------|
| Expected delivery schedule | Supplier → Warehouse | Receiving planning |
| ASN (Advance Ship Notice) | Supplier → Warehouse | Pre-receiving data |
| Receipt confirmation | Warehouse → Supplier | Proof of delivery |
| Discrepancy report | Warehouse → Supplier | Claims and credits |
| Supplier stock levels (if shared) | Supplier → System | ATP calculation enhancement (know what supplier has before ordering) |
| Supplier lead time actuals | System calculation | Refined safety stock and ROP calculations |

### Real-Time vs Batch Processing

| Integration | Recommended Timing | Rationale |
|-------------|-------------------|-----------|
| Order → Reserve inventory | **Real-time** | Prevent double-selling |
| Pick list → Warehouse | **Real-time** | Workers need current tasks |
| Receiving → Available inventory | **Real-time** | Enable immediate fulfillment against new stock |
| Delivery confirmed → Invoice | **Real-time** | Accelerate cash collection |
| Cycle count adjustments → Finance | **Batch (end of day)** | Adjustments reviewed before posting |
| Inventory valuation → Finance | **Batch (end of day/week)** | Financial reporting cycles |
| Reorder point alerts → Procurement | **Near-real-time (within 15 min)** | Procurement needs timely signals but not instant |
| Weather alerts → Warehouse | **Real-time** | Physical action required promptly |
| Transfer suggestions | **Batch (daily)** | Strategic decision, not operational urgency |
| Supplier stock sync | **Batch (daily or twice daily)** | Data latency acceptable; reduces API load |

---

## 13. BUILDING MATERIALS SPECIFIC CHALLENGES

### Mixed Units of Measure

Building materials are bought, stored, and sold in different units. The system must handle seamless conversion:

| Material | Buy UOM | Store UOM | Sell UOM | Conversion |
|----------|---------|-----------|----------|------------|
| Cement | Pallet (42 bags) | Pallet | Bag, Pallet, or Ton | 1 pallet = 42 bags = 1.976 tons (94 lb bags) |
| Lumber | Board Foot (BF) or Piece | Bundle or Piece | Board Foot, Piece, or Linear Foot | 1 board foot = 12" x 12" x 1". A 2x4x8 = 5.33 BF |
| Aggregates | Ton | Ton (estimated in bin) | Ton or Cubic Yard | 1 CY concrete sand ~1.35 tons (varies by material and moisture) |
| Steel Rebar | Ton or Bundle | Bundle | Ton, Bundle, or Linear Foot | 1 bundle #4 rebar 20ft = 50 pieces = ~1,068 lbs = 0.534 tons |
| Pipe | Linear Foot or Piece | Piece or Bundle | Linear Foot or Piece | 1 piece PVC 4" Sch 40 = 20 ft |
| Sheet Goods | Sheet or Unit | Sheet (stacked) | Sheet or Square Foot | 1 sheet 4x8 plywood = 32 sq ft |
| Concrete Blocks | Pallet | Pallet | Each or Pallet | 1 pallet CMU 8x8x16 = 90 blocks |
| Insulation | Roll or Batt Bundle | Bundle | Roll, Batt, or Square Foot | 1 roll R-19 = varies by brand (typically 48-75 sq ft) |
| Roofing Shingles | Square (= 100 sq ft coverage) | Bundle or Square | Square or Bundle | 1 square = 3 bundles (typically) |

**System Requirements:**
- Every product has a "base UOM" for internal tracking (usually the smallest practical unit)
- Conversion factors defined per product (buy conversion, sell conversion, count conversion)
- User can enter quantity in any valid UOM; system converts automatically
- Pricing can be set in any UOM (price per ton, price per board foot, etc.)
- Weight conversion embedded for truck loading calculations
- Decimal precision: tons to 3 decimal places, board feet to 2 decimal places

### Weight-Based Inventory

```
CHALLENGE: Aggregates sold by ton, but you cannot count tons visually.

SOLUTION ARCHITECTURE:

  1. RECEIPT: Truck scale measures net tons delivered.
     System records exact weight received.

  2. STORAGE: Pile in designated bin. Running balance tracked.
     Estimated On-Hand = Receipts - Shipments - Shrinkage

  3. SHIPMENT: Customer truck loaded by front-end loader.
     Option A: Truck scale on-site → weigh loaded truck → exact tons.
     Option B: No truck scale → estimate by loader bucket count
       (1 bucket ≈ 1.2 cubic yards ≈ 1.6 tons for crushed stone)
     Option C: Customer provides weight ticket from nearby public scale

  4. RECONCILIATION: Monthly physical measurement.
     Adjust estimated balance to actual measurement.
     Variance = estimated vs measured. Target: within 5%.

  5. PRICING: Sell by the ton.
     Invoice quantity = scale ticket weight OR loader estimate.
     If estimate, build in 3-5% margin to cover under-loading.
```

### Length-Based Inventory

```
CHALLENGE: Lumber sold by board foot but stored and counted by piece.

SOLUTION:

  Board Foot = (Thickness" x Width" x Length') / 12

  Example: 2x4x8 piece = (2 x 4 x 8) / 12 = 5.33 board feet

  System tracks:
    - PIECES on hand (what worker counts at the rack)
    - BOARD FEET calculated (for pricing and selling)

  When receiving: Enter pieces received. System calculates BF.
  When selling: Customer orders 1,000 BF of 2x4x8.
    System calculates: 1,000 / 5.33 = 188 pieces needed.
    Pick list shows: 188 pieces.
  When counting: Worker counts pieces. System reconciles BF.
```

### Shelf Life Management

| Material | Shelf Life | FEFO Required | System Rules |
|----------|-----------|---------------|-------------|
| **Portland Cement** | 3-6 months (typically 3 months for guaranteed performance, up to 6 for many applications) | Yes, mandatory | Alert at 30 days remaining. Quarantine at 7 days. Block allocation after expiry. Hardened cement is a liability if sold (compressive strength degrades). |
| **Masonry Cement** | 3-6 months | Yes | Same as Portland |
| **Adhesives/Sealants** | 12-24 months | Yes | Alert at 60 days. Can often sell past "best by" for non-structural use with disclosure. |
| **Treated Lumber** | Chemical treatment warranty: 10-40 years; storage life effectively unlimited | No | No expiration concern, but track treatment lot for warranty. |
| **Paint/Coatings** | 12-36 months | Yes | Alert at 90 days. Separate from cement (different expiration windows). |
| **Drywall Joint Compound** | 12 months | Yes | Alert at 60 days. Freezing destroys it -- temperature alert in winter. |
| **Concrete Blocks** | Unlimited (requires 28-day cure; blocks should be 28+ days old when sold) | No, but minimum age required | Block sale if manufacture date < 28 days ago. |
| **Aggregates** | Unlimited | No | No expiration. |
| **Steel** | Unlimited (surface rust is cosmetic) | No | Track storage duration for rust assessment. Alert if outdoor > 90 days. |
| **Lumber (untreated)** | Effectively unlimited if stored properly | No, but FIFO preferred | FIFO to rotate stock. Alert if outdoor uncovered > 60 days (mold/rot risk). |

### Heavy Equipment Dependencies

| Operation | Equipment Needed | If Equipment Unavailable |
|-----------|-----------------|------------------------|
| Receive cement pallets | Forklift (5,000 lb min) | Cannot unload. Truck waits (demurrage fees). |
| Receive steel bundles | Forklift (10,000+ lb) or overhead crane | Cannot unload heavy bundles. |
| Receive aggregates | Front-end loader, truck scale | Can dump without loader, but cannot weigh without scale. |
| Receive lumber | Forklift or side-loader | Cannot unload long lumber with standard forklift. |
| Pick cement pallets | Forklift | Cannot pick by hand (2,500 lb pallets). |
| Pick steel | Heavy forklift or crane | No manual alternative. |
| Pick aggregates | Front-end loader | Cannot load by hand. |
| Load truck | Forklift | Cannot load heavy materials manually. |

**System Implication:** The warehouse app should show equipment availability/status. If a required forklift is down for maintenance, affected tasks should be flagged and rescheduled. The system should not schedule receiving or picking for steel if the heavy forklift is out of service.

### Handling Volatile Pricing (Lumber, Steel)

Building materials (especially lumber and steel) have volatile commodity pricing. The system must handle:

```
SCENARIO: Lumber price drops 20% between when you bought it and now.

  Original purchase: 500 pcs 2x4x8 @ $8.50/pc = $4,250 inventory value
  Current market: Same lumber selling at $6.80/pc

  Lower of Cost or Market (LCM) rule:
    Carrying value: $8.50/pc
    Market value: $6.80/pc
    Write down required: ($8.50 - $6.80) x 500 = $850

  System should:
    1. Track current market/replacement cost alongside WAC
    2. Monthly LCM review: flag items where market < cost
    3. Alert finance to approve write-downs
    4. Adjust inventory valuation

  This is NOT a warehouse app function directly, but the data flows:
    Warehouse → quantity on hand
    Procurement → current purchase price
    Finance → LCM calculation and write-down
```

---

## SUMMARY: KEY DESIGN DECISIONS FOR HYPERQUOTE WAREHOUSE APP

### Phase 1: First Warehouse (1 base, 30-100 SKUs)
```
Screens needed: Login, Dashboard, Receiving, Putaway, Picking, Loading, Cycle Count,
                Inventory Lookup, Alerts
Barcode: Zone signs + pallet labels printed at receiving
Hardware: 2-3 Zebra TC52 scanners, 1 label printer
Costing: Weighted Average Cost with landed cost
Counting: Monthly full count, transitioning to ABC cycle counting
Yard: Zone-level tracking with barcode signs
```

### Phase 2: Growing Operations (2 bases, 100-200 SKUs)
```
Additional screens: Inter-Base Transfer, Returns, Damaged/Quarantine, Yard Map
Barcode: RFID for high-value steel, improved label durability
Hardware: 5-8 scanners, 2 label printers, forklift-mounted tablets
Costing: WAC with automated freight allocation
Counting: Full ABC cycle counting, automated scheduling
Yard: Zone + GPS on forklifts
Integration: Full real-time integration with orders, procurement, finance
```

### Phase 3: Full Distribution (3+ bases, 200+ SKUs)
```
Additional: Advanced yard management, automated reorder, demand planning,
            drone surveys for aggregates, RFID at scale
Costing: WAC with seasonal price adjustments, LCM reviews
Counting: Continuous cycle counting with opportunity counts
Yard: RFID + GPS + weather integration
Automation: Auto-PO generation for A items, auto-transfer suggestions
```

---

## Sources

- [Monday.com - 10 Best Warehouse Management Software Systems 2026](https://monday.com/blog/project-management/warehouse-software/)
- [Hopstack - Warehouse Receiving Process Guide](https://www.hopstack.io/blog/improve-the-warehouse-receiving-process)
- [Hopstack - Warehouse Putaway Guide](https://www.hopstack.io/blog/everything-you-need-to-know-about-optimizing-the-warehouse-putaway-process)
- [Hopstack - Warehouse Processes 101](https://www.hopstack.io/blog/warehouse-processes)
- [Stefan Karabin - 7 UX Design Best Practices for Warehouse Mobile Apps](https://medium.com/@stefan.karabin/7-ux-design-best-practices-for-warehouse-mobile-apps-b6e2a0a6940f)
- [UITOP - How to Design a Warehouse Management System](https://uitop.design/blog/product/wms-design/)
- [Rossul - Warehouse Management System UX/UI Case Study](https://www.rossul.com/portfolio/warehouse-management-system/)
- [Oracle - WMS Cloud Mobile App Guide](https://docs.oracle.com/en/cloud/saas/warehouse-management/21c/owmma/overview--oracle-wms-cloud-mobile-application.html)
- [Oracle - Redwood Mobile WMS](https://docs.oracle.com/en/cloud/saas/readiness/logistics/24d/wms24d/24D-wms-wn-f35221.htm)
- [Microsoft - Dynamics 365 WMS User Authentication](https://learn.microsoft.com/en-us/dynamics365/supply-chain/warehousing/warehouse-app-authenticate-user-based)
- [Oracle NetSuite - WMS Roles and Permissions](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_156520467974.html)
- [Finale Inventory - Inventory Costing Methods Guide](https://www.finaleinventory.com/guides/inventory-costing-methods/)
- [Finale Inventory - Weighted Average Inventory Method](https://www.finaleinventory.com/blog/accounting-and-inventory-software/weighted-average-inventory-method/)
- [Finale Inventory - Average Cost Method](https://www.finaleinventory.com/accounting-and-inventory-software/average-cost-method)
- [Corporate Finance Institute - Weighted Average Cost](https://corporatefinanceinstitute.com/resources/accounting/weighted-average-cost-method/)
- [GS1 US - Serialized Shipping Container Codes](https://www.gs1us.org/upcs-barcodes-prefixes/serialized-shipping-container-codes)
- [GS1 - Logistic Label Guideline](https://www.gs1.org/standards/gs1-logistic-label-guideline/1-3)
- [GS1 - SSCC Standard](https://www.gs1.org/standards/id-keys/sscc)
- [Digital Link QR Code - SSCC Evolution](https://digital-link-qr-code.com/sscc)
- [Fluix - QR Codes and Barcodes in Construction](https://fluix.io/blog/qr-barcodes-in-construction-cases-benefits)
- [GoCodes - Barcode Tracking for Construction Assets](https://gocodes.com/barcode-tracking/)
- [NetSuite - Cycle Counting](https://www.netsuite.com/portal/resource/articles/inventory-management/using-inventory-control-software-for-cycle-counting.shtml)
- [SphereWMS - Cycle Counting Guide](https://spherewms.com/blog/cycle-counting-guide)
- [SAP Community - Cycle Counting](https://community.sap.com/t5/enterprise-resource-planning-blog-posts-by-members/inventory-management-inventory-counting-process-cycle-counting-im-mm/ba-p/14019726)
- [RFGen - Yard Management System Guide](https://www.rfgen.com/blog/what-to-look-for-in-a-yard-management-system/)
- [WISER Systems - Complete Guide to Yard Management](https://wisersystems.com/blog/complete-guide-to-yard-management-track-everything-in-your-yard-2024/)
- [Blue Yonder - Yard Management System](https://blueyonder.com/solutions/warehouse-management/yard-management)
- [Element Logic - Streamline Warehouse Returns](https://www.elementlogic.net/us/blogs/how-to-streamline-the-warehouse-returns-process/)
- [Logiwa - Returns Management](https://www.logiwa.com/blog/returns-management)
- [Microsoft Dynamics 365 - Quarantine Orders](https://learn.microsoft.com/en-us/dynamics365/supply-chain/inventory/quarantine-orders)
- [Infor - Quarantine Inventory](https://docs.infor.com/ln/2024.x/en-us/lnolh/whquarantineug/whom000300.html)
- [SKUNexus - Automated Stock Management](https://www.skunexus.com/best-automated-stock-management-system)
- [Forthcast - Low Stock Alerts Automation](https://www.forthcast.io/blog/low-stock-alerts-automation-prevents-stockouts/)
- [Knack - AI for Inventory Management](https://www.knack.com/blog/ai-for-inventory-management/)
- [Cadre Technologies - Warehouse KPI Dashboard Examples](https://www.cadretech.com/warehouse-kpi-dashboard-examples/)
- [NetSuite - 33 Inventory KPIs and Metrics](https://www.netsuite.com/portal/resource/articles/inventory-management/inventory-management-kpis-metrics.shtml)
- [Zoho - 21 Essential Warehouse KPIs](https://www.zoho.com/inventory/academy/warehouse-management/everything-you-need-to-know-about-warehouse-kpis.html)
- [Bizbloqs - Wave vs Batch vs Zone Picking](https://www.bizbloqs.com/wave-picking-vs-batch-picking-vs-zone-picking/)
- [NetSuite - Wave Picking](https://www.netsuite.com/portal/resource/articles/inventory-management/wave-picking.shtml)
- [Extensiv - FEFO in Warehouse Management](https://www.extensiv.com/blog/what-is-fefo-first-expired-first-out)
- [MRPeasy - FEFO First Expired First Out](https://www.mrpeasy.com/blog/fefo-first-expired-first-out/)
- [Microsoft - Transfer Items Between Warehouse Locations](https://learn.microsoft.com/en-us/dynamics365/business-central/inventory-how-transfer-between-locations)
- [Storefeeder - Stock Transfer Guide](https://storefeeder.com/blogs/what-is-a-stock-transfer-how-to-do-it-efficiently-storefeeder)
- [Dagbo Corp - Building Materials Conversions and Equivalencies](https://www.dagbocorp.com/post/understanding-conversions-and-equivalencies-for-common-building-materials)
- [LoadProof - Best Practices in Warehouse App UI/UX](https://loadproof.com/best-practices-designing-ui-ux-warehouse-app/)
