# UX Patterns: Dispatch/Fleet Management & Warehouse Management Interfaces

**Research Date:** 2026-03-29
**Focus:** Functional UX patterns from best-in-class logistics platforms (2025-2026)
**Sources:** Samsara, Onfleet, DispatchTrack, Track-POD, OptimoRoute, Route4Me, Circuit, Dynamics 365, Scanbot, Linear, and industry best practices

---

## 1. Fleet Tracking Map UX

### Screen Layout (Samsara / Onfleet / Motive Pattern)

```
+------------------------------------------------------------------+
| [Search vehicles] [Filter: Status v] [Filter: Team v] [Alerts 3] |
+------------------+-----------------------------------------------+
|                  |                                               |
| SIDEBAR          |              LIVE MAP                         |
| (collapsible)    |                                               |
|                  |     [Vehicle Pin]  [Vehicle Pin]              |
| TEAMS            |         |                                     |
|  > Team Alpha    |    [Route Line]                               |
|    Driver A (3)  |         |                                     |
|    Driver B (2)  |     [Vehicle Pin]                             |
|                  |                                               |
|  > Team Beta     |            [Cluster: 12]                      |
|    Driver C (5)  |                                               |
|                  |                                               |
| UNASSIGNED       |                                               |
|  Task #1042      |                                               |
|  Task #1043      |                                               |
|                  |     [+ / - Zoom]   [Recenter]                 |
+------------------+-----------------------------------------------+
```

### Vehicle Pin Design
- **Moving** = Green circle with directional arrow showing heading
- **Idle** = Orange/Yellow circle (engine on, not moving)
- **Stopped** = Red circle (engine off)
- **No GPS/Offline** = Grey circle with "?" or slash
- **Flashing subtle animation** on active/on-duty drivers (Onfleet pattern)
- At high zoom: pin shows vehicle icon (truck/van silhouette)
- At low zoom: pins cluster into numbered circles ("12 vehicles")

### Vehicle Info Popup (Click on Pin)
```
+----------------------------------+
| [Truck Icon] Vehicle #TRK-042   |
| Driver: Ahmed Hassan             |
| Speed: 65 km/h  |  Heading: NE  |
|----------------------------------|
| Status: In Transit               |
| Current Stop: 3 of 7            |
| Next Stop: Cairo Industrial Zone |
| ETA: 14:35 (22 min)             |
|----------------------------------|
| Fuel: ████████░░ 78%            |
|----------------------------------|
| [View Route] [Contact] [Details]|
+----------------------------------+
```

Key data in popup (Samsara pattern): asset name, live location + speed, driver assignment, fuel level, recent camera still (if dashcam equipped). Actions: Zoom to location, Open in new tab for full details.

### Task/Delivery Pin Colors (Onfleet Pattern)
- **Grey** = Unassigned
- **Purple** = Assigned (not started)
- **Blue** = In Transit
- **Green** = Succeeded/Completed
- **Red** = Failed
- Custom triangle color flags: teal, magenta, orange for priority marking

### Route Lines
- Each driver gets a **unique color** for their route line
- Turn-by-turn paths visible on map
- Completed portion shown as **solid line**, remaining as **dashed line**
- ETA badges at each stop along the route

### Filtering & Sidebar
- Sidebar shows hierarchical: Teams > Drivers > Assigned Tasks
- Unassigned tasks pooled at top or in separate section
- Drag tasks from unassigned to a driver to assign
- Task count shown in parentheses next to each driver
- Filter by: status, team, vehicle type, region/tag
- Samsara uses Tags for custom grouping (by region, vehicle type, etc.)

### Map Customization (Samsara)
- Color-code markers by asset type, status, or custom tags
- Toggle layers: traffic, geofences, landmarks
- Configurable columns in sidebar list view

---

## 2. Route Planning UX

### Screen Layout (OptimoRoute / Route4Me Pattern)

```
+------------------------------------------------------------------+
| [Date Picker] [Auto-Optimize] [Undo] [Redo]   [Save] [Dispatch]  |
+-------------------+----------------------------------------------+
|                   |                                              |
| ROUTE LIST        |              MAP                             |
| (left panel)      |                                              |
|                   |    A -----> B -----> C                       |
| Driver: Ahmed     |    |                 |                       |
| Capacity: 85%     |    D <-------------- E                       |
| ████████░░        |                                              |
|                   |                                              |
| 1. Stop A  09:00  |    [Numbered pins match stop list]           |
|    [drag handle]  |                                              |
| 2. Stop B  09:35  |                                              |
|    [drag handle]  |                                              |
| 3. Stop C  10:10  |                                              |
|    [drag handle]  |                                              |
| [+ Add Stop]      |                                              |
|                   |                                              |
| Driver: Mostafa   |                                              |
| Capacity: 62%     |                                              |
| ██████░░░░        |                                              |
|                   |                                              |
| 1. Stop D  09:00  |                                              |
|    [drag handle]  |                                              |
+-------------------+----------------------------------------------+
|               TIMELINE BAR (Gantt-like)                          |
| Ahmed:  [===Stop A===][drive][===Stop B===][drive][===Stop C===] |
| Mostafa:[===Stop D===][drive][===Stop E===]                      |
+------------------------------------------------------------------+
```

### Drag-and-Drop Stop Reordering
- Each stop has a **drag handle** (6-dot grip icon) on the left
- Drag stops **within a route** to reorder
- Drag stops **between drivers** to reassign
- Route line on map updates in real-time as stops are reordered
- OptimoRoute: drag-and-drop works in both **timeline view** and **map view**
- Route4Me: drag-and-drop addresses on the map itself, connect in custom order

### Time Window Display
- Each stop shows: arrival window (e.g., "09:00-10:00"), estimated arrival, estimated duration
- **Red highlight** if estimated arrival falls outside the time window
- **Yellow warning** if arrival is tight (within 10 min of window edge)
- Time windows shown as colored bars in the timeline view

### Capacity Indicators
- Per-driver progress bar showing capacity utilization (weight, volume, or item count)
- Color coded: green (under 70%), yellow (70-90%), red (over 90%)
- Shown next to driver name in route list
- Updates live as stops are added/removed

### Auto-Optimize Button
- Single prominent button: "Optimize Routes"
- Options: optimize all routes, optimize selected route only
- Considers: time windows, capacity, driver hours, vehicle type
- Shows before/after comparison: total distance, total time, violations
- Dispatcher can accept or reject optimization result

### Manual Override
- After optimization, dispatcher can still drag-and-drop to override
- Warning icon appears if manual change creates a time window violation
- Lock individual stops to prevent optimization from moving them
- "Fix" a stop's position in sequence, then re-optimize around it

---

## 3. Delivery Confirmation / POD (Dispatcher Side)

### Dispatcher POD Review Layout

```
+------------------------------------------------------------------+
| DELIVERIES TODAY                          [Filter: Needs Review v] |
+------------------------------------------------------------------+
|                                                                    |
| ORDER #2847  |  Ahmed Hassan  |  Cairo Industrial  |  14:22      |
| [Green: Delivered] [POD Available]              [Review >>]       |
|                                                                    |
| ORDER #2848  |  Ahmed Hassan  |  6th October City  |  15:05      |
| [Red: Issue Flagged] [Partial Delivery]         [Review >>]       |
|                                                                    |
+------------------------------------------------------------------+

--- Clicking "Review" opens detail panel or split view ---

+----------------------------+-------------------------------------+
|                            |                                     |
|   MAP VIEW                 |   POD DETAILS                       |
|   (delivery location pin)  |                                     |
|                            |   Order #2848                       |
|   [GPS dot vs address]     |   Driver: Ahmed Hassan              |
|   Shows actual delivery    |   Time: 15:05                       |
|   location vs expected     |   GPS: 30.0444, 31.2357            |
|                            |                                     |
|                            |   PHOTOS (3)                        |
|                            |   [thumb1] [thumb2] [thumb3]        |
|                            |                                     |
|                            |   SIGNATURE                         |
|                            |   [signature image]                 |
|                            |   Signed by: Mohamed Ali            |
|                            |                                     |
|                            |   ITEMS                             |
|                            |   Cement 50kg x 100  [OK]          |
|                            |   Rebar 12mm x 50    [SHORT: 45]   |
|                            |                                     |
|                            |   NOTES                             |
|                            |   "5 bundles damaged in transit"    |
|                            |                                     |
|                            |   [Approve] [Reject] [Flag Issue]  |
+----------------------------+-------------------------------------+
```

### POD Data Components
Real-time sync from driver app to dispatcher dashboard:
- **Photos**: delivery location, goods condition, placement. Thumbnails with click-to-expand.
- **Signature**: recipient's digital signature with name capture
- **GPS stamp**: exact coordinates of delivery, shown on mini-map against expected address
- **Timestamp**: precise delivery time
- **Item verification**: expected quantities vs. delivered quantities, any discrepancies highlighted
- **Driver notes**: free-text for exceptions

### Approval/Rejection Flow
1. POD arrives instantly on dispatcher dashboard when driver submits
2. Delivery appears in "Needs Review" filter if any discrepancies flagged
3. Dispatcher opens POD detail view (split screen or slide-out panel)
4. Reviews photos, signature, quantities, GPS accuracy
5. Actions: **Approve** (closes delivery), **Reject** (sends back to driver), **Flag Issue** (escalates with reason code)
6. If quantity discrepancy: dispatcher can create a partial delivery record and schedule redelivery for the remainder

### Track-POD Dashboard Pattern
- **Routes view**: orders in progress with route ID, driver, ETA, actual status
- **Sites view**: all stops with addresses and critical details in one overview
- **Orders view**: command panel with delivery instructions, load status, customer notes
- Columns are fully customizable: add/remove/drag-reorder data points
- ePOD status column shows real-time proof-of-delivery availability

---

## 4. Warehouse Receiving UX (Mobile)

### Step-by-Step Receiving Flow

```
STEP 1: SELECT PO
+----------------------------------+
|        RECEIVING                  |
|                                   |
|  [Scan PO Barcode]               |
|  ===========================     |
|  |                         |     |
|  |    CAMERA VIEWFINDER    |     |
|  |                         |     |
|  ===========================     |
|                                   |
|  -- OR --                        |
|                                   |
|  [Enter PO# Manually]           |
|  [________________________]      |
|                                   |
|  RECENT POs:                     |
|  PO-2847  Supplier: ABC Corp    |
|  PO-2846  Supplier: XYZ Ltd     |
+----------------------------------+

STEP 2: ITEM SCAN & COUNT
+----------------------------------+
|  PO-2847  |  ABC Corp            |
|  Item 3 of 12                    |
|----------------------------------|
|                                   |
|  [Scan Item Barcode]             |
|  ===========================     |
|  |    CAMERA / SCANNER     |     |
|  ===========================     |
|                                   |
|  Item: Portland Cement 50kg      |
|  SKU: CEM-PORT-50               |
|                                   |
|  Expected:  100                  |
|  Received:  [___95___]  [-] [+]  |
|                                   |
|  [Damaged?]  [Wrong Item?]       |
|                                   |
|  [< Prev Item]    [Next Item >]  |
+----------------------------------+

STEP 3: DISCREPANCY FLAG
+----------------------------------+
|  !! QUANTITY MISMATCH            |
|                                   |
|  Portland Cement 50kg            |
|  Expected: 100                   |
|  Received:  95                   |
|  Short:     5                    |
|                                   |
|  Reason:                         |
|  ( ) Supplier short-shipped      |
|  ( ) Damaged - rejected          |
|  ( ) Wrong item received         |
|  ( ) Other: [___________]        |
|                                   |
|  [Take Photo of Issue]           |
|  [photo1]  [+ Add Photo]        |
|                                   |
|  [Accept with Discrepancy]       |
+----------------------------------+

STEP 4: RECEIVING SUMMARY
+----------------------------------+
|  PO-2847 RECEIVING SUMMARY       |
|                                   |
|  Total Lines: 12                 |
|  Complete:    10  [green]        |
|  Short:        1  [yellow]       |
|  Rejected:     1  [red]         |
|                                   |
|  DISCREPANCIES:                  |
|  - Cement 50kg: short 5 units   |
|  - Rebar 12mm: rejected (rust)  |
|                                   |
|  [Complete Receiving]            |
|  [Hold for Manager Review]      |
+----------------------------------+

STEP 5: PUT-AWAY INSTRUCTIONS
+----------------------------------+
|  PUT-AWAY: Portland Cement 50kg  |
|  Quantity: 95 bags               |
|                                   |
|  GO TO:                          |
|  Zone: A  |  Aisle: 3           |
|  Bay: 7   |  Level: Ground      |
|                                   |
|  [Large directional arrow]       |
|  >>>>> AISLE 3, BAY 7 >>>>>     |
|                                   |
|  [Scan Location to Confirm]     |
|  ===========================     |
|  |    CAMERA / SCANNER     |     |
|  ===========================     |
|                                   |
|  [Confirm Put-Away]             |
+----------------------------------+
```

### Key Receiving Principles
- Scanner remains active throughout (scan PO, scan items, scan locations)
- Expected quantity shown DURING receiving (not blind) -- blind mode reserved for cycle counts
- Scan same barcode multiple times to increment count, or manually enter quantity
- Discrepancy triggers mandatory reason code + optional photo
- Android scanner support: Honeywell, Zebra, Datalogic (1D and 2D barcodes)
- First-Pass Receiving Accuracy target: 96-98%
- Soft alerts (non-blocking) for minor issues; hard blocks for critical mismatches

---

## 5. Picking List UX (Mobile)

### Item-by-Item Guided Picking Flow

```
PICK TASK OVERVIEW
+----------------------------------+
|  PICK ORDER #5023                |
|  Customer: Delta Construction    |
|  Items: 8  |  Priority: HIGH    |
|  ================================|
|                                   |
|  Progress: ████████░░░░ 5/8     |
|                                   |
|  NEXT PICK:                      |
|  ================================|
|  Zone: B  |  Aisle: 4           |
|  Bay: 12  |  Level: 2           |
|                                   |
|  [Arrow pointing to location]    |
|  >>>>> AISLE 4, BAY 12 >>>>>    |
|                                   |
|  Item: Steel Angle 40x40x4mm    |
|  SKU: STL-ANG-4044              |
|  Qty to Pick: 25 pcs            |
|                                   |
|  [Scan Location]                 |
+----------------------------------+

AFTER SCANNING LOCATION:
+----------------------------------+
|  LOCATION CONFIRMED: B-4-12-2   |
|  [green checkmark]               |
|                                   |
|  Item: Steel Angle 40x40x4mm    |
|  Pick: 25 pcs                   |
|                                   |
|  [Scan Item Barcode]             |
|  ===========================     |
|  |    CAMERA / SCANNER     |     |
|  ===========================     |
|                                   |
|  Picked: [___25___]  [-] [+]    |
|                                   |
|  [Short Pick?]                   |
|  [Confirm Pick]                  |
+----------------------------------+

SHORT PICK FLOW:
+----------------------------------+
|  SHORT PICK                      |
|                                   |
|  Required: 25                    |
|  Available: 18                   |
|  Short:     7                    |
|                                   |
|  Action:                         |
|  ( ) Pick 18, backorder 7       |
|  ( ) Skip - pick from alt loc   |
|  ( ) Cancel this line            |
|                                   |
|  [Confirm]                       |
+----------------------------------+
```

### Picking Flow Variations

**Item-by-Item (Guided)**: System directs worker to one item at a time. Best for: new workers, high-accuracy requirements. Worker sees only the current pick.

**Full List View**: Worker sees entire pick list and chooses their own path. Best for: experienced workers, small warehouses. Allows route optimization by the worker.

**Batch Picking**: Multiple orders combined. Worker picks into divided cart with separate bins per order. Screen shows which bin to place each item in.

### Scan Confirmation Pattern
1. Scan **location barcode** (confirms worker is at correct spot)
2. Scan **item barcode** (confirms correct item)
3. Enter/confirm **quantity** (can scan item multiple times to count, or enter manually)
4. System provides audio feedback: beep (scan detected), OK sound (correct), error sound (wrong item/location)

### Weight-Based Picking (Aggregates)
For bulk materials (sand, gravel, cement):
- Show target weight instead of piece count
- Interface connects to floor scale or forklift scale
- Real-time weight display: `Target: 2,500 kg | Current: 2,340 kg | Remaining: 160 kg`
- Tolerance threshold (e.g., +/- 2%)
- Green zone indicator when within tolerance

### Batch Scanning (Scanbot Pattern)
- "Batch Scanning" mode: scan series of barcodes without closing scanner screen
- "Scan & Count" feature: count multiple items in one go
- "Find & Pick" feature: visually highlights correct items when barcode values are pre-set

---

## 6. Inventory Lookup UX

### Multi-Warehouse Inventory Screen (Dynamics 365 / Enterprise Pattern)

```
+------------------------------------------------------------------+
| INVENTORY LOOKUP                                                   |
|                                                                    |
| [Search: product name, SKU, or barcode___________] [Search]      |
| [Category: All v] [Warehouse: All v] [In Stock Only]             |
+------------------------------------------------------------------+
|                                                                    |
| Product: Portland Cement OPC 42.5N                                |
| SKU: CEM-OPC-425    |    UOM: Bag (50kg)                        |
|                                                                    |
| CURRENT STORE QTY: 450 bags                                      |
|                                                                    |
| +------+------------+--------+----------+---------+--------+     |
| | Loc  | Warehouse  | OnHand | Reserved | Ordered | Avail  |     |
| +------+------------+--------+----------+---------+--------+     |
| | WH1  | Cairo Main |   450  |    120   |   200   |  330   |     |
| | WH2  | Alex Port  |   280  |     50   |     0   |  230   |     |
| | WH3  | 6th Oct    |   150  |    150   |   100   |    0   |     |
| | WH4  | Suez       |     0  |      0   |   500   |    0   |     |
| +------+------------+--------+----------+---------+--------+     |
| | TOTAL             | 880    |    320   |   800   |  560   |     |
| +------+------------+--------+----------+---------+--------+     |
|                                                                    |
| Sort by: [Location v] [Inventory v] [Reserved v] [Ordered v]    |
|                                                                    |
| Actions: [Show Availability] [Transfer] [View History]           |
+------------------------------------------------------------------+
```

### Quantity Types (Critical Distinction)
- **On Hand**: physical quantity present in warehouse
- **Reserved / Committed**: allocated to confirmed orders, awaiting shipment
- **Ordered / Incoming**: on purchase orders, expected to arrive
- **Available**: On Hand minus Reserved = what can be promised to new orders
- Each warehouse location has columns for ALL quantity types

### Matrix View (for products with variants)
```
+------------------------------------------------------------------+
| Portland Cement - Variant Matrix          [Warehouse: Cairo Main] |
|                                                                    |
|           | 25kg Bag | 50kg Bag | 1-Ton Bulk |                   |
| +---------+----------+----------+------------+                   |
| | OPC 32.5|  120/20  |  450/120 |    15/5    |                   |
| | OPC 42.5|   80/10  |  330/50  |    22/8    |                   |
| | SRC     |    0/0   |   45/45  |     0/0    |                   |
| +---------+----------+----------+------------+                   |
|                                                                    |
| Cell format: Available / Reserved                                 |
| Grey cell = not stocked at this location                         |
| Click cell for: [Sell Now] [Reserve] [Transfer] [View Details]   |
+------------------------------------------------------------------+
```

### Search Behavior
- Instant search as you type (product name, SKU, barcode)
- Results filterable by: category, warehouse, in-stock only
- Sortable columns by clicking headers
- Geo-location sort: nearest warehouse first (for fulfillment decisions)
- Last movement date shown in detail view
- Direct actions from results: reserve stock, initiate transfer, view movement history

---

## 7. Cycle Count UX

### Mobile Cycle Count Flows (Dynamics 365 Pattern)

**Three Modes:**

**A. Guided Cycle Count** (System-directed)
```
+----------------------------------+
|  CYCLE COUNT - GUIDED            |
|  Work ID: CC-4821               |
|                                   |
|  Location: B-4-12-2             |
|  Item: CEM-OPC-425              |
|  License Plate: LP-BULK-06-01   |
|                                   |
|  [Item number displayed]         |
|  [License plate displayed]       |
|                                   |
|  Count Qty: [________]          |
|                                   |
|  [OK]                            |
+----------------------------------+

--- If count differs from expected ---

+----------------------------------+
|  !! COUNT DIFFERS                |
|  Please recount this item.       |
|                                   |
|  Location: B-4-12-2             |
|  Item: CEM-OPC-425              |
|                                   |
|  Count Qty: [________]          |
|                                   |
|  [OK]                            |
+----------------------------------+
```

**B. Blind Cycle Count** (Worker does NOT see expected quantity)
```
+----------------------------------+
|  CYCLE COUNT - BLIND             |
|                                   |
|  Scan Zone: [____________]       |
|                                   |
|  [OK]                            |
+----------------------------------+

--- After scanning zone ---

+----------------------------------+
|  Zone: BULK06                    |
|                                   |
|  Scan Item: [____________]       |
|                                   |
|  [OK]                            |
+----------------------------------+

--- After scanning item ---

+----------------------------------+
|  Zone: BULK06                    |
|  Item: [scanned value]          |
|                                   |
|  Scan License Plate:             |
|  [____________]                  |
|                                   |
|  [OK]                            |
+----------------------------------+

--- After scanning LP ---

+----------------------------------+
|  Zone: BULK06                    |
|  Item: CEM-OPC-425              |
|  LP: LP-BULK-06-01              |
|                                   |
|  Count Qty: [________]          |
|  (no expected qty shown)         |
|                                   |
|  [OK]                            |
+----------------------------------+
```

Key blind count behaviors:
- Item number NOT displayed (worker must scan it)
- License plate NOT displayed (worker must scan it)
- Expected quantity NEVER shown (prevents anchoring bias)
- No recount prompt (number of attempts = 0)
- Worker enters what they physically count, uninfluenced

**C. Spot Count** (Worker-initiated at any location)
```
+----------------------------------+
|  SPOT COUNTING                   |
|                                   |
|  Scan Location: [____________]   |
|                                   |
|  [OK]                            |
+----------------------------------+

--- If location is empty in system ---

+----------------------------------+
|  Location: 01A02R2S1B           |
|  System shows: EMPTY             |
|                                   |
|  [Add LP or Item]               |
|                                   |
|  Scan Item: [____________]       |
|  Scan LP:   [____________]       |
|  Qty:       [____________]       |
|                                   |
|  [OK]                            |
+----------------------------------+
```

### Variance Handling & Approval (Manager Desktop)
```
+------------------------------------------------------------------+
| CYCLE COUNT PENDING REVIEW                    [Filter: Variance v] |
+------------------------------------------------------------------+
|                                                                    |
| +--------+-----------+----------+--------+----------+-----------+ |
| | Work # | Location  | Item     | System | Counted  | Variance  | |
| +--------+-----------+----------+--------+----------+-----------+ |
| | CC4821 | B-4-12-2  | CEM-425  |   100  |    95    |  -5 (5%)  | |
| | CC4822 | A-2-03-1  | STL-ANG  |    50  |    52    |  +2 (4%)  | |
| | CC4823 | C-1-08-3  | GRV-20   |   200  |   180    | -20 (10%) | |
| +--------+-----------+----------+--------+----------+-----------+ |
|                                                                    |
| Selected: CC4823 - High Variance (10%)                            |
|                                                                    |
| Actions: [Accept Count] [Reject - Request Recount] [View Detail] |
|                                                                    |
| Approval Rules:                                                   |
| - Under 2% variance: auto-approved                               |
| - 2-5% variance: supervisor approval                             |
| - Over 5% variance: recount by different person, then manager    |
+------------------------------------------------------------------+
```

### Approval Tiers
- **Auto-adjust**: minor variances within tolerance, with reason code
- **Supervisor review**: moderate variances, Accept Count or Reject (recount)
- **Manager + Finance**: material discrepancies trigger CAPA investigation
- Recount by a DIFFERENT person to eliminate bias
- Recount is also blind (expected qty still hidden)
- Accepted counts post adjustment journal automatically to ERP

---

## 8. Kanban Board for Order Fulfillment

### Board Layout (Linear / ClickUp / Custom Pattern)

```
+------------------------------------------------------------------+
| ORDER FULFILLMENT BOARD        [Filter v] [Group By v] [Search]  |
| [+ New Order]                  [Compact] [Comfortable] [Timeline]|
+------------------------------------------------------------------+
|                                                                    |
| CONFIRMED(4)  PICKING(3)   PACKING(2)  LOADING(1)  DISPATCHED(3) |
| WIP Limit: 8  WIP Limit: 5 WIP Lim: 4 WIP Lim: 3  No Limit    |
|                                                                    |
| +---------+ +---------+  +---------+ +---------+  +---------+   |
| |#2847    | |#2842    |  |#2839    | |#2838    |  |#2835    |   |
| |Delta Co.| |Nile Eng.|  |ABC Corp | |XYZ Ltd  |  |Mega Ind.|   |
| |12 items | |3 items  |  |8 items  | |22 items |  |5 items  |   |
| |5.2 tons | |0.8 tons |  |2.1 tons | |12 tons  |  |1.5 tons |   |
| |[!] RUSH | |         |  |         | |Loading..|  |In Transit|   |
| |Due: 2hr | |Due: 4hr |  |Due: 6hr | |Bay #3   |  |ETA: 3pm |   |
| |Ahmed H. | |Sara M.  |  |Omar K.  | |Driver:  |  |Driver:  |   |
| |         | |         |  |         | |Mostafa  |  |Ahmed    |   |
| +---------+ +---------+  +---------+ +---------+  +---------+   |
| +---------+ +---------+  +---------+              +---------+   |
| |#2848    | |#2843    |  |#2840    |              |#2836    |   |
| |...      | |...      |  |...      |              |...      |   |
| +---------+ +---------+  +---------+              +---------+   |
|                                                                    |
+------------------------------------------------------------------+
```

### Card Design
Each card shows (information hierarchy, most important first):
1. **Order number** (bold, top)
2. **Customer name**
3. **Item count** and **total weight/volume**
4. **Priority flag** (RUSH = red badge, NORMAL = no badge)
5. **Time remaining** until due (red if overdue, yellow if < 2hrs)
6. **Assigned worker** (avatar + name)
7. **Current sub-status** (e.g., "Loading at Bay #3", "In Transit - ETA 3pm")

### Column Behavior
- **Column header** shows: stage name + count of items in parentheses
- **WIP limits** displayed below header; column header turns red when exceeded
- Cards are **draggable** between columns (drag full card or use keyboard S shortcut)
- Keyboard move: Option+Shift+Up/Down to move within column; drag between columns
- **Hidden columns** appear collapsed at far right; items can be dragged into them
- Columns always ordered left-to-right following the workflow sequence

### Swimlanes (Sub-grouping)
- Group rows by: warehouse, team, priority, customer
- Each swimlane collapsible/expandable
- Shows progress per swimlane at a glance

### Filtering
- Filter by: customer, priority, assigned worker, date range, warehouse
- Display options: show/hide specific metadata on cards
- **Density modes**: Comfortable (full card detail) vs. Compact (title + status only)

### Bulk Actions
- Multi-select with checkbox or Shift+Click
- Bulk toolbar appears: [Assign To...] [Move To Stage...] [Set Priority...] [Print Labels]
- Bulk "Move to Picking" for batch release

### Card States (Linear Pattern)
- **Default**: white/light background
- **Hover**: subtle elevation/shadow
- **Focused**: blue outline
- **Dragging**: semi-transparent with drop target highlight
- **Completed**: strikethrough title or muted colors
- **Overdue**: red left border accent

---

## 9. Loading Verification UX

### Step-by-Step Loading Flow (Tablet)

```
STEP 1: START LOAD
+------------------------------------------+
|  LOADING VERIFICATION                     |
|  Truck: TRK-042  |  Driver: Ahmed Hassan |
|  Route: R-2847   |  Stops: 7            |
|                                           |
|  Progress: Step 1 of 5                   |
|  [1]--[2]--[3]--[4]--[5]                |
|  [*]  [ ]  [ ]  [ ]  [ ]                |
|                                           |
|  SCAN TRUCK ID                           |
|  ===========================             |
|  |    CAMERA / SCANNER     |             |
|  ===========================             |
|                                           |
|  [Start Loading]                         |
+------------------------------------------+

STEP 2: SCAN ITEMS ONTO TRUCK
+------------------------------------------+
|  LOADING: TRK-042                        |
|  Progress: Step 2 of 5                   |
|  [*]--[*]--[ ]--[ ]--[ ]                |
|                                           |
|  ITEMS TO LOAD: 22 total                 |
|  Scanned: 18  |  Remaining: 4           |
|  ████████████████░░░░ 82%               |
|                                           |
|  SCAN NEXT ITEM:                         |
|  ===========================             |
|  |    SCANNER ACTIVE       |             |
|  ===========================             |
|                                           |
|  Last Scanned:                           |
|  [check] Cement OPC 50kg x10 pallets    |
|  [check] Rebar 12mm x5 bundles          |
|  [check] Steel Angle x3 bundles         |
|                                           |
|  REMAINING:                              |
|  [ ] Gravel 20mm x2 tons               |
|  [ ] Sand Fine x2 tons                  |
|                                           |
|  [Item Not Found?] [Skip with Reason]   |
+------------------------------------------+

STEP 3: WEIGHT VERIFICATION
+------------------------------------------+
|  WEIGHT CHECK: TRK-042                   |
|  Progress: Step 3 of 5                   |
|  [*]--[*]--[*]--[ ]--[ ]                |
|                                           |
|  Expected Total:  18,500 kg              |
|  Scale Reading:   18,340 kg              |
|  Variance:           160 kg (0.9%)       |
|  Tolerance:        +/- 2%                |
|                                           |
|  Status: [GREEN - WITHIN TOLERANCE]      |
|                                           |
|  [Enter Weight Manually: ________]       |
|  [Connect to Scale]                      |
|                                           |
|  [Confirm Weight]                        |
+------------------------------------------+

STEP 4: PHOTO DOCUMENTATION
+------------------------------------------+
|  LOAD PHOTOS: TRK-042                    |
|  Progress: Step 4 of 5                   |
|  [*]--[*]--[*]--[*]--[ ]                |
|                                           |
|  Required Photos:                        |
|  [check] Rear view of loaded truck       |
|          [thumbnail]                      |
|  [check] Side view                       |
|          [thumbnail]                      |
|  [ ] Seal/lock number                    |
|      [Take Photo]                        |
|                                           |
|  Optional:                               |
|  [+ Add Additional Photo]               |
|                                           |
|  [Continue]                              |
+------------------------------------------+

STEP 5: SIGN-OFF & DEPARTURE
+------------------------------------------+
|  DEPARTURE SIGN-OFF: TRK-042            |
|  Progress: Step 5 of 5                   |
|  [*]--[*]--[*]--[*]--[*]                |
|                                           |
|  CHECKLIST:                              |
|  [check] All 22 items scanned           |
|  [check] Weight within tolerance         |
|  [check] 3/3 required photos taken       |
|  [check] Seal number recorded            |
|                                           |
|  GATE CLEARANCE: [GREEN - APPROVED]      |
|                                           |
|  Driver Signature:                       |
|  +---------------------------+           |
|  |  [signature pad area]     |           |
|  +---------------------------+           |
|                                           |
|  Loader Signature:                       |
|  +---------------------------+           |
|  |  [signature pad area]     |           |
|  +---------------------------+           |
|                                           |
|  [Complete & Release Truck]              |
+------------------------------------------+
```

### Departure Blocking (Hard Gating)

If items are missing or checks fail:
```
+------------------------------------------+
|  !! DEPARTURE BLOCKED                    |
|                                           |
|  ISSUES:                                 |
|  [X] 4 items not scanned                |
|  [X] Weight exceeds tolerance (+3.5%)    |
|  [!] Seal photo missing                 |
|                                           |
|  GATE CLEARANCE: [RED - BLOCKED]         |
|                                           |
|  This truck CANNOT depart until all      |
|  issues are resolved.                    |
|                                           |
|  [Resolve Issues]                        |
|  [Override - Manager Auth Required]      |
+------------------------------------------+
```

### Hard Gating Controls (SGS Systems Pattern)
The system blocks truck closure/departure when:
- Missing or incorrect scan-to-load events
- Wrong ship-to destination on manifest
- Unreleased lots (QA hold not cleared)
- SSCC (pallet ID) mismatch at dock
- Weight outside tolerance
- Required photos not captured
- Label verification spot-checks failed

Override requires manager authentication + reason code logged.

### Progress Indicator
- **Stepped progress bar** at top of every screen (5 dots connected by lines)
- Current step highlighted, completed steps filled
- Cannot skip steps (sequential enforcement)
- Back button available to review previous steps but cannot change completed scans

---

## 10. Mobile Warehouse UX Design Specifications

### Touch Target Sizes
- **Minimum touch target**: 48 x 48 dp (Material Design) / 44 x 44 pt (WCAG/Apple HIG)
- **Recommended for warehouse/gloves**: 56 x 56 dp minimum, ideally 64 dp for primary actions
- **Minimum spacing between targets**: 8 dp gap (prevents accidental taps with gloves)
- Icons can be 24px visually but expand tappable area to 48px+ with padding

### Font Sizes
- **Primary text** (item names, quantities): 18-20sp minimum
- **Secondary text** (SKUs, descriptions): 16sp minimum
- **Body/instructions**: 16sp (1rem) base -- never below 14sp
- **Large data** (count fields, weight displays): 24-32sp
- **Dynamics 365 WMS app**: "most important information is set in a large font"
- Use **bold weight** for scanned/confirmed data

### Color & Contrast
- **Minimum contrast ratio**: 4.5:1 for text (WCAG AA)
- **Recommended for warehouse**: 7:1 (WCAG AAA) due to dirty screens, sunlight
- **Red** = error/blocked, **Green** = success/confirmed, **Yellow/Orange** = warning
- High-contrast mode should be DEFAULT (not an option) for warehouse apps
- Dynamics 365: "high-contrast design that provides clear text on dirty screens"

### Scan-Centric Design Principles

1. **Toggle Device Scanner** (Karabin Pattern)
   - Disable scanner when overlays/dialogs are open
   - Disable during server communication delays
   - Prevent "dirty scans" (unintended reads)

2. **Soft Alerts Instead of Blocking Dialogs**
   - Wrong location scanned? Show non-intrusive notification bar
   - Auto-dismiss after next valid scan
   - Worker continues without touching screen
   - Example: scan position A10 instead of A11 = soft alert, scanner stays active

3. **Audio Feedback (4 Sounds)**
   - **Beep**: scan detected
   - **OK tone**: successful processing
   - **Error tone**: processing failure
   - **Success melody**: task completed
   - Workers react by sound without looking at screen

4. **Button-by-Barcode**
   - Enable triggering button actions through barcode scanning
   - Example: scanning the cart barcode initiates the next picking task
   - Eliminates unnecessary screen touches

### Layout for One-Handed Operation
```
+----------------------------------+
|  STATUS BAR (read-only info)     |  <-- Top: non-interactive
|  Task: Pick #5023  |  5 of 8    |
|----------------------------------|
|                                   |
|  MAIN CONTENT                    |  <-- Middle: information
|  Item: Steel Angle 40x40        |
|  Location: B-4-12               |
|  Qty: 25 pcs                    |
|                                   |
|  [SCANNER AREA / Last Scan]     |
|                                   |
|----------------------------------|
|                                   |
|  [    CONFIRM    ]               |  <-- Bottom: primary action
|  (full-width, thumb-reachable)   |  <-- Minimum 56dp height
|                                   |
|  [Short Pick?]  [Skip]          |  <-- Secondary actions
+----------------------------------+
```

- **Primary actions at BOTTOM** of screen (thumb zone)
- **Information in the MIDDLE** (reading zone)
- **Status/context at TOP** (non-interactive)
- Navigation buttons at bottom, NOT top (Dynamics 365 allows "custom button locations to match each worker's grip, device, and handedness")

### Numeric Input
- **Custom numeric keypad** instead of native OS keyboard
- Large buttons on keypad (64dp minimum per key)
- Built-in calculator for quantities over 20 (Dynamics 365 pattern)
- Dedicated +/- buttons for quick quantity adjustment
- No decimal keyboard for integer counts

### Navigation
- **Numeric menu labels** (press "1" for Receiving, "2" for Picking, etc.)
- Hide OS navigation bar to maximize screen space and prevent accidental exits
- Avoid generic barcode icons; use process-specific icons instead
- Cancel button HIDDEN during cycle counting to prevent accidental cancellation

### Sunlight & Environment
- Use maximum contrast (dark text on white, or white text on dark)
- Avoid thin fonts -- use medium or bold weight minimum
- Keep line lengths short (40-50 characters)
- Large, filled icons (not outlined/thin strokes)
- Auto-brightness support essential but default to HIGH brightness

### Offline / Connectivity
- All scans cached locally if connection drops
- Sync when connection restored
- Clear indicator: [Online] vs [Offline - Data will sync]
- Never block the worker from scanning due to connectivity

---

## Summary: Cross-Cutting UX Principles for Logistics Platforms

1. **Split-screen is king for desktop dispatch**: Map on one side, list/details on the other. The map is always the primary focal point.

2. **Color coding must be consistent and learnable**: Green=good/moving, Red=error/stopped, Yellow=warning/idle, Blue=in-transit, Grey=unassigned/offline. Same colors across ALL interfaces.

3. **Progressive disclosure**: Overview first (board/map), click for detail panel (slide-out or split), click again for full page. Never dump all data at once.

4. **Scan-first, touch-second on mobile**: Every warehouse interaction should start with a scan. Touch is fallback. Audio feedback confirms scan success without screen reading.

5. **Sequential enforcement for critical flows**: Loading verification, receiving, and cycle counts use stepped wizards. Cannot skip steps. Back-navigation is read-only.

6. **Soft alerts, not hard blocks**: For non-critical issues (wrong location scanned), use dismissible notifications. Reserve hard blocks (modal dialogs) for critical safety/compliance issues (departure without all items).

7. **Role-based views**: Dispatcher sees map + route + POD review. Warehouse manager sees kanban board + cycle count approvals. Worker sees one-task-at-a-time guided flow.

8. **Real-time sync is non-negotiable**: POD data, scan events, inventory counts -- all sync instantly. Offline mode caches and syncs on reconnection, never blocks the worker.

---

## Sources

- [Samsara Fleet Overview Map](https://kb.samsara.com/hc/en-us/articles/41266933936269)
- [Samsara Map Customization](https://kb.samsara.com/hc/en-us/articles/360043280691-Map-Customization)
- [Onfleet Map & Sidebar](https://support.onfleet.com/hc/en-us/articles/360023669612-Map-Sidebar)
- [Onfleet Task Status Colors](https://support.onfleet.com/hc/en-us/articles/20509786766228-Task-Status)
- [Onfleet Task Assignment (Drag-Drop)](https://support.onfleet.com/hc/en-us/articles/360023910111-Task-Assignment)
- [Onfleet Command Center Q4 2025](https://onfleet.com/blog/onfleet-product-update-q4-2025/)
- [OptimoRoute Drag-and-Drop Route Planning](https://help.optimoroute.com/hc/en-us/articles/27746852898068)
- [Route4Me Manual Reorder](https://support.route4me.com/disable-optimization/)
- [Route4Me Time Windows](https://support.route4me.com/faq/single-depot-route-planning-with-time-windows/)
- [Track-POD Dashboard Customization](https://www.track-pod.com/blog/customizable-dashboard/)
- [Track-POD Proof of Delivery](https://www.track-pod.com/)
- [Elite EXTRA POD Capture](https://eliteextra.com/proof-of-delivery-capture/)
- [Dynamics 365 POS Inventory Lookup](https://learn.microsoft.com/en-us/dynamics365/commerce/pos-inventory-lookup-operation)
- [Dynamics 365 Cycle Counting Scenarios](https://learn.microsoft.com/en-us/dynamics365/supply-chain/warehousing/cycle-counting-scenarios)
- [Dynamics 365 WMS Mobile App Features](https://learn.microsoft.com/en-us/dynamics365/supply-chain/warehousing/warehouse-app-whats-new)
- [Scanbot Pick-by-Scan System](https://scanbot.io/blog/mobile-pick-by-scan-system/)
- [Linear Board Layout Docs](https://linear.app/docs/board-layout)
- [Linear Display Options](https://linear.app/docs/display-options)
- [SaaS UI Workflow Patterns](https://gist.github.com/mpaiva-cc/d4ef3a652872cb5a91aa529db98d62dd)
- [SGS Systems Shipping Manifest](https://sgsystemsglobal.com/glossary/shipping-manifest-carrier-handover-summary/)
- [LoadProof Loading Verification](https://loadproof.com/)
- [7 UX Best Practices for Warehouse Mobile Apps (Karabin)](https://medium.com/@stefan.karabin/7-ux-design-best-practices-for-warehouse-mobile-apps-b6e2a0a6940f)
- [Fleet Dashboard Design Guide (Hicron)](https://hicronsoftware.com/blog/fleet-management-dashboard-design/)
- [WCAG Touch Target Sizes](https://wcag.dock.codes/documentation/wcag258/)
- [Accessible Tap Target Sizes Cheatsheet](https://smart-interface-design-patterns.com/articles/accessible-tap-target-sizes/)
- [Touch Target Best Practices (DesignMonks)](https://www.designmonks.co/blog/perfect-mobile-button-size)
