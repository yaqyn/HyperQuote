# Phase 19: Warehouse Module

## Goal
Warehouse staff can receive, putaway, pick, stage, and count inventory with directed workflows and quality checks.

## Dependencies
- Phase 15 (Internal Platform Shell) must be complete
- Phase 13-14 (Database tables) must be complete — warehouses, inventory, stock_movements, etc.
- Phase 3 (Shared Packages) must be complete

## Requirements

- **WH-01**: Receiving: expected deliveries list, per-PO step-by-step receiving (standard + bulk/weight-based), material-specific quality checklists, discrepancy handling
- **WH-02**: Putaway: system-directed task-by-task, two-scan confirmation, override with reason
- **WH-03**: Picking: order queue sorted by shipping deadline, directed picking (FEFO enforced), two-scan verification, short pick/skip/substitute
- **WH-04**: Staging + load verification: 5-step gated flow (scan truck -> scan items -> verify weight -> photos -> dual sign-off), hard gating for missing items
- **WH-05**: Cycle count: blind count (system qty hidden), threshold recount by ABC class, supervisor approval for variances
- **WH-06**: Inventory lookup: cross-location search, lot/expiry tracking, movement history, reorder point status
- **WH-07**: Yard management: interactive zone map, capacity utilization color coding, weather/Khamsin alerts

## Success Criteria
1. Receiving workflow handles standard and bulk/weight-based items with material-specific quality checklists and discrepancy handling
2. Directed picking enforces FEFO with two-scan verification and supports short pick/skip/substitute
3. Staging + load verification completes 5-step gated flow (scan truck -> scan items -> verify weight -> photos -> dual sign-off)
4. Blind cycle count hides system quantities, triggers threshold recount by ABC class, and requires supervisor approval for variances
5. Yard management shows interactive zone map with capacity utilization color coding and Khamsin weather alerts

## What to Build
Receiving (standard + bulk), putaway, pick list, directed picking, staging + load verification (5-step gated), cycle count (blind), inventory lookup, yard management.

## Spec References

### FRONTEND.md — MODULE 4: WAREHOUSE (Full Spec)

**Primary users:** Warehouse Manager, Workers, Forklift Operators, Lead/Checker, Cycle Count Supervisor
**Hotkey:** `W`
**Phase dependency:** Module becomes active at Phase 2 ($5-10M) when HyperQuote starts holding inventory. Before that, only the "Receiving" section is used for cross-dock operations.
**Device targets:** Desktop (manager), ruggedized Android (Zebra TC52/TC72, Honeywell CT60) for workers. Large touch targets (minimum 48dp, ideally 64dp -- gloves). High contrast. Minimal text entry. Audio/vibration feedback for scans.

#### 4.1 Warehouse Home View

**Worker view:** Large tile grid (3x3) with task counts as badges:

| Tile | Label | Badge = pending tasks |
|------|-------|-----------------------|
| 1 | Receive (RCV) | POs arriving today |
| 2 | Putaway (PUTWY) | Items awaiting putaway |
| 3 | Pick (PICK) | Orders to pick |
| 4 | Load (LOAD) | Trucks to load |
| 5 | Count (COUNT) | Cycle counts assigned |
| 6 | Transfer (XFER) | Transfer requests |
| 7 | Lookup | -- |
| 8 | Returns | Returns awaiting receipt |
| 9 | Alerts | Critical alerts count |

- Numeric shortcuts: worker types "1" for Receive, "2" for Pick, etc. (scanner keypad)
- Badge colors: red=urgent/overdue, yellow=due today, green=ahead
- Bottom: top 3 critical alerts (expiring lots, below-minimum stock, incoming deliveries)

**Manager additions (below worker tiles):**
- KPIs: pick accuracy %, on-time shipment %, receiving cycle time, inventory accuracy %
- Labor: workers clocked in / total, forklift ops available
- Tasks completed / total today
- Pending approvals count (count variances, damage dispositions, transfer requests)
- Inventory value: total on-hand, reserved, available, on-hold/damaged (all Geist Mono)

#### 4.2 Receiving -- Expected Deliveries List

**List of POs expected today**, sorted by ETA:
- Each card: PO number, supplier name, ETA (Geist Mono), truck type (flatbed/enclosed/dump/pneumatic), line items summary, receiving status, assigned dock/yard area
- Status dots: gray=scheduled, blue=confirmed, green=in transit, orange-pulse=arrived, yellow=receiving in progress, green-check=complete
- Filter: status, supplier, product type, date
- `[+ Unscheduled Delivery]` button for walk-ins

#### 4.3 Active Receiving (Standard Materials)

**Per PO, step-by-step:**

1. **Truck info:** truck type, license plate, BOL number (scan or manual entry), driver name
2. **Per line item:**
   - Material name, specification, expected quantity (Geist Mono)
   - Received quantity input (large number input, Geist Mono)
   - Automatic variance: green=matches, yellow=within tolerance (+-2%), red=exceeds tolerance
   - Condition dropdown: Good, Minor Damage, Major Damage, Rejected
   - Lot/Heat number: scan from bundle tags (critical for steel traceability)
   - Auto-suggested putaway location (based on product type zone rules, capacity, FEFO positioning, weight limits). Worker can override.
   - `[Photo]` button for damage documentation
   - `[Note]` button for discrepancies

3. **Discrepancy section (auto-populates when received != expected):**
   - Variance quantity
   - Reason code: Supplier Short, Damaged in Transit, Wrong Product, Wrong Specification, Overshipment
   - Photo requirement for discrepancies

4. **Material-specific quality checklist:**

| Material | Checklist |
|----------|-----------|
| Cement | Bags intact (no hardness/lumps), manufacture date, pallet condition, shrink wrap, type matches PO |
| Steel/Rebar | Rust level acceptable, sizes/lengths match, grade stamps visible, bundle tags intact, Mill Test Certificate received, no excessive bending |
| Lumber | Grade stamps, no excessive warping/splitting, moisture content, tally count by dimension, species matches |
| Aggregates | Weigh ticket matches, visual quality (no contamination), material type matches |
| Pipe | No cracks/dents, diameter/schedule matches, lengths correct, ends undamaged |
| Roofing | No heat/sun damage, packaging intact, lot numbers match |
| Insulation | No water damage, packaging intact, R-value/thickness matches, not compressed beyond recovery |

5. **Completion:**
   - Digital signature (drawn on screen)
   - `[Complete Receiving]` -- all items accepted with noted exceptions
   - `[Reject Delivery]` -- entire load fails inspection. Requires supervisor override + reason + photos.

#### 4.4 Active Receiving (Bulk/Weight-Based Materials)

For aggregates, sand, gravel sold by weight:

- Material name, PO quantity (tons)
- Truck gross (loaded) weight input (Geist Mono)
- Truck tare (empty) weight input
- Auto-calculated net weight + unit conversion (lbs to tons or kg to tonnes)
- Running total against PO (aggregates often delivered in multiple loads): previously received + this load + remaining
- Quality: contamination check, material type verification
- Dump location selection from yard zone map
- Weigh ticket scan or photo
- `[Confirm Receipt]`

#### 4.5 Putaway

**System-directed, task-by-task:**

- Task X of Y indicator
- Product name, quantity, lot number, manufacture date, expiry date (prominent for shelf-life items)
- FROM: staging dock/location
- TO: system-suggested optimal location (based on zone rules, capacity, FEFO positioning, weight limits)
- **Two-scan confirmation:** 1) Scan source location barcode, 2) Scan destination location barcode
- Quantity placed (for partial putaway)
- Override option: `[Override Location]` with mandatory reason (Location Full, Blocked, Equipment Issue) and alternate location scan
- Next task preview at bottom for continuous workflow

#### 4.6 Pick List (Order Queue)

**Orders sorted by shipping deadline:**
- Priority color: red=ship within 2h, yellow=ship today, green=tomorrow+
- Each card: SO number, customer, shipping time (Geist Mono), assigned truck/route, item count, total weight (Geist Mono)
- Weight displayed prominently (critical for truck capacity)
- Filter: route, truck, priority, product type
- Tap to start directed picking flow

#### 4.7 Directed Picking (Step-by-Step)

**Per item in the order:**

1. **Navigate:** "GO TO: WH-A / CEMENT / ROW-2 / Bay 04 / Floor Level" with optional aisle direction arrows
2. **Product info:** name, SKU, lot (FEFO enforced -- system directs to oldest lot first, will NOT allow picking newer lot when older has sufficient quantity), expiry date, quantity to pick
3. **Two-scan verification:**
   - Scan location barcode (confirms worker is at correct spot)
   - Scan product barcode (confirms correct product)
4. **Quantity entry:** for partial pallet picks (e.g., 15 bags off 42-bag pallet)
5. **Exceptions:**
   - `[Short Pick]` -- location has less than needed. Pick available, system redirects to next location with same product.
   - `[Skip Item]` -- cannot access (blocked, equipment issue)
   - `[Substitute]` -- system suggests configured substitutes
6. **Running weight tracker:** cumulative load weight vs truck capacity with visual progress bar (e.g., "37,500 lbs / 48,000 lbs -- 78%")
7. `[Confirm Pick]` -- advances to next step

#### 4.8 Staging and Load Verification

**Load plan organized by delivery stop (LIFO -- last stop loaded first):**

Per stop section:
- Stop number, items list
- Each item: checkbox + "Scanned" / "Awaiting scan" status
- Scan each item barcode as loaded onto truck

**Weight check section:**
- Loaded weight (running total, Geist Mono)
- Truck max capacity
- Remaining capacity
- Visual bar (like pick weight tracker)

**Loading sequence alerts:** warn if loading order violates weight distribution

**Load completion (5-step gated flow on tablet):**
1. Scan truck ID barcode
2. Scan items onto truck (progress bar: "18 of 22 scanned"). Remaining items list with checkmarks.
3. Verify weight on scale: "Expected: 18,500 kg | Actual: 18,340 kg | Variance: 0.9% [GREEN - WITHIN TOLERANCE]"
4. Capture photos: `[Rear Photo]` `[Side Photo]` `[Seal Photo]` (minimum required configurable)
5. Sign-off: driver + loader signatures (dual signature pad) + `[Gate Clearance]`

**Hard gating:** Missing items, weight variance >tolerance, required photos missing = BLOCKED departure with manager override option. `[BLOCKED - Resolve Issues]` shown in red.

**On clearance:** `[Generate BOL]` auto-generates Bill of Lading. Triggers: outbound inventory state change, delivery tracking activation, customer notification.

#### 4.9 Cycle Count (Blind Count Process)

**Step-by-step:**

1. Worker sees assigned count: location, count X of Y
2. `[Scan Location to Start]` -- confirms worker is at correct location
3. **Blind count: system quantity is HIDDEN.** Worker does not see expected count to prevent bias.
4. Per product at this location: worker enters physical count (large number input, Geist Mono)
5. `[+ Add Unexpected Product]` -- for items found at location but not expected by system
6. `[Submit Count]`

**After submission:**
- System reveals: system qty, worker count, variance, variance %
- Threshold check by ABC class: A items >2% = recount, B items >5% = recount, C items >10% = recount
- If within threshold: auto-approved, count recorded
- If exceeds threshold: "Recount Requested" -- must be done by a DIFFERENT worker for objectivity
- If recount confirms variance: escalates to supervisor for approval

**Supervisor Count Approval:**
- Location, product, system qty, initial count, recount, variance, variance %
- Last movements list (recent picks, receives) for investigation
- Reason code: Receiving error, Pick error, Damage (unrecorded), Theft, Miscount, Location error
- Financial impact: value of adjustment (Geist Mono)
- `[Approve]` `[Investigate Further]`

#### 4.10 Inventory Lookup

- Search by scan (any barcode: product, lot, location) or type (SKU, name, lot number)
- Shows inventory across ALL locations/bases with drill-down
- Per location: lot number, expiration date with days remaining (Geist Mono), on-hand/reserved/available breakdown, condition status
- Multi-base summary at bottom
- In-transit and on-order quantities
- Movement history (recent transactions)
- Reorder point status with days-of-supply calculation
- Product photo for visual identification

#### 4.11 Yard Management

- Interactive visual map of yard layout
- Zones color-coded by capacity utilization (green <60%, yellow 60-80%, red >80%)
- Tap zone for detail: inventory summary, last activity, capacity
- Aggregate bins: estimated quantities (last measurement + inflows - outflows)
- Weather alert integration: rain/wind/temperature warnings with actionable recommendations
- Khamsin dust storm alert: auto-pause outdoor operations above 30 km/h wind, block sheet material deliveries
- Zone editing (supervisor/manager): reconfigure layout

#### 4.12 Other Warehouse Screens

**Returns Receipt & Inspection:** Receive returns against RMA. Inspect per material-type checklist. Disposition per item: Restock Grade A, Restock Discounted, Return to Vendor, Scrap/Dispose, Hold for Investigation. Photo documentation mandatory. Credit note auto-generated or flagged.

**Damaged Goods / Quarantine:** Central view of all quarantined items. Sources: receiving failure, cycle count discovery, approaching expiration (auto-triggered), forklift damage, customer return. Disposition: release, sell as-is (markdown), return to supplier, scrap (write-off), rework. Write-off value calculated. Manager approval for dispositions above threshold.

**Inter-Base Transfer:** From base, to base, items, lots (FEFO), quantities, reason, priority. Manager approval required for inter-base. Freight cost estimate. Transfer tracked like mini-shipment with states: Submitted -> Approved -> Pick at Source -> In Transit -> Received at Destination -> Complete.

**Reports & KPIs (manager):** Inventory accuracy, order fill rate, pick accuracy, receiving cycle time, on-time shipment, inventory turnover. Report library: inventory valuation, aging by lot, slow-moving, damage/write-off, receiving performance, count accuracy trend, utilization, transfer history, returns analysis, worker productivity. Date range + base filters. Export CSV, email report.

#### 4.13 Warehouse Keyboard Shortcuts (desktop)

| Shortcut | Action |
|----------|--------|
| `1`-`9` | Navigate to tile (scanner keypad) |
| `G` then `R` | Go to Receiving |
| `G` then `P` | Go to Picking |
| `G` then `C` | Go to Cycle Count |
| `G` then `Y` | Go to Yard Map |

### BACKEND.md — Server Functions (Warehouse)

| Function | Method | Input | Output | Auth | Side Effects |
|---|---|---|---|---|---|
| `getWarehouseDashboard` | GET | `{ warehouseId? }` | `{ pendingReceiving, pendingPicking, pendingDispatch, capacityUtilization }` | warehouse | none |
| `receiveGoods` | POST | `{ poId, lines[], photos? }` | `{ grnId }` | warehouse | Update inventory, PO status |
| `createPickList` | POST | `{ orderId, lines[] }` | `{ pickListId }` | warehouse | Insert pick list |
| `confirmPick` | POST | `{ pickListId, lines[], notes? }` | `{ success, shortages[] }` | warehouse | Update inventory, notify dispatch |
| `performStockCount` | POST | `{ warehouseId, counts[] }` | `{ adjustments[] }` | warehouse_manager | Insert count + adjustments |
| `getInventoryLevels` | GET | `{ warehouseId?, search?, belowReorder?, page, limit }` | `{ items[], total }` | warehouse | none |
| `putawayConfirm` | POST | `{ locationBarcode, itemBarcode, quantity }` | `{ success }` | warehouse | Updates location records |
| `loadVerification` | POST | `{ routeId, scanResults[], weight, photos[], driverSignature, loaderSignature }` | `{ verificationId, clearance }` | warehouse | Creates load verification |
| `generateBOL` | POST | `{ routeId }` | `{ bolPdfUrl }` | warehouse | Generates BOL PDF |
| `submitCycleCountApproval` | POST | `{ countId, decision, reason? }` | `{ success }` | warehouse_manager | Approves/requests recount |
| `processReturn` | POST | `{ returnId, inspectionResult, notes, photos? }` | `{ success }` | warehouse | Updates return, adjusts inventory |
| `disposeDamagedGoods` | POST | `{ inventoryId, quantity, reason, approvedBy }` | `{ adjustmentId }` | warehouse_manager | Writes off stock |
| `createTransfer` | POST | `{ productId, fromWarehouseId, toWarehouseId, quantity, reason }` | `{ transferId }` | warehouse | Creates inter-warehouse transfer |
| `batchReceiveGoods` | POST | `{ warehouseId, receivals[] }` | `{ batchId, grnIds[], totalItemsReceived }` | warehouse | Batch receive multiple POs |

## Business Rules

**Inventory States:**
Available -> Reserved (allocated to order) -> Picked -> Loaded -> In Transit -> Delivered. Also: On Order, In Transit (from supplier), On Hold (quality), Damaged, Returned.

**Stock Costing:**
- Weighted Average Cost (WAC) is primary
- FIFO tracking for shelf-life items (cement 3-6 months)
- LIFO is prohibited in Egypt (EAS/IFRS)
- Landed cost includes freight allocated by weight

**Inventory Quantities Tracked:**
On-Hand, Available (= on-hand - reserved - allocated - on-hold - damaged), Reserved (soft hold), Allocated (hard commit), On-Hold, Damaged, In-Transit Inbound/Outbound, On-Order, Quarantined, Returned

**Multi-Location:**
Company > Region > Base > Zone > Aisle > Bay > Level. Indoor = bin-level. Outdoor yard = zone-based GPS.

**Barcode Strategy:**
GS1-128 for pallets/cases, manufacturer barcodes for items, location barcodes for bins/zones. Non-barcodeable items: weight-based and tally-based tracking.

**Building Materials Specific:**
- Weight-based: aggregates (by ton), concrete (by cubic yard)
- Length-based: lumber (by board foot)
- Shelf life: cement 3-6 months, adhesives 12 months, sealants 18 months
- UOM conversions: buy in tons, store in pallets, sell in bags

**ABC Classification:**
- A items (cement, rebar): tight control, frequent counts, >2% variance = recount
- B items: moderate control, >5% variance = recount
- C items (hardware, misc): looser control, >10% variance = recount

**Quality Inspection Standards (AQL Sampling):**
AQL (Acceptable Quality Level) sampling per ANSI/ASQ Z1.4 for large shipments. Supplier tiering determines inspection level:
- **Preferred suppliers:** Skip-lot inspection (reduced frequency, sample only every Nth delivery)
- **Approved suppliers:** AQL sampling (standard statistical sampling tables)
- **Conditional suppliers:** Tightened inspection (larger sample sizes, stricter acceptance criteria)
- **New suppliers:** 100% inspection (every item checked until track record established)
Inspection level auto-determined from `suppliers.tier` field. Override available for warehouse manager.

**Reorder Point (Egyptian market):**
(Avg daily demand x Lead time days) x 1.5 reliability factor

**Khamsin Dust Storms (March-May):**
- Block deliveries of sheet materials above 30 km/h wind
- Cement: cover with tarp (5% moisture = total loss)
- Auto-pause outdoor warehouse operations during severe Khamsin

**Summer Heat (June-September):**
- Cement shelf life shortened to 2-3 months in extreme heat
- Driver safety: mandatory breaks, no loading during peak heat (12-3 PM)

## Non-Negotiable Rules

1. **Three colors only.** White, Black, Blue. Semantic status colors for DATA only.
2. **Spatial glass, not dashboards.**
3. **Geist Mono for ALL numbers.** Prices, quantities, weights, lot numbers, dates.
4. **React Aria Components, NOT shadcn.**
5. **Motion v12.** Import from `motion/react`.
6. **`useWatch()`, NEVER `watch()`.**
7. **Colors in `:root {}`, NEVER in `@theme`.**
8. **ALL numbers -> Arabic-Indic numerals in Arabic context.**
9. **ALL units -> Arabic translations.** kg -> كجم, ton -> طن, m² -> م².

## Known Risks & Gotchas

- Warehouse module targets ruggedized Android devices — large touch targets (48-64dp) are critical
- Scanner keypad navigation (numeric shortcuts 1-9) must work alongside hotkey system
- FEFO enforcement is strict: system will NOT allow picking newer lot when older has sufficient quantity
- Blind cycle count must genuinely hide system quantities — don't accidentally leak via network requests
- Weight verification tolerance is configurable in Admin — don't hardcode
- Dual signature pad requires two separate signature capture components

## Tips

- This is the LARGEST module spec (800+ lines in FRONTEND.md). Build incrementally: Receiving first, then Pick, then Stage, then Count, then Lookup, then Yard.
- Worker view and Manager view are two different layouts of the same home screen — conditional rendering based on role
- Audio/vibration feedback for scans is critical for warehouse UX
- The yard management zone map can be a simple SVG/Canvas layout initially — it doesn't need MapLibre
- Photo capture in warehouse uses the device camera, not a file upload
