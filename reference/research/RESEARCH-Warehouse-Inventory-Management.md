> ⚠️ **REFERENCE DOCUMENT — NOT THE SOURCE OF TRUTH**
> This file was written during the research phase and may contain outdated decisions, US-centric references, or superseded technical choices.
> **Always defer to `essential/RESEARCH.md` for current decisions.**
> Key changes since this file was written: TanStack Start (not Next.js), Capacitor (not Expo), React Aria (not shadcn), Egyptian law (not US FMCSA), EGP (not USD), dual auth pools, no online payments, no mobile wallets, spatial glass UI (not traditional dashboards).

# RESEARCH: Warehouse & Inventory Management
## B2B Building Materials Distributor -- From No-Inventory to Full Warehouse Operations

**Date:** 2026-03-28
**Context:** A company that outsources materials from external suppliers and sells to customers (construction companies, GCs, developers). Starts as made-to-order (no inventory, drop-ship from suppliers to jobsite). Grows into selectively stocking inventory and eventually operating warehouse/yard facilities. Order values $100K to $100M+.

---

## TABLE OF CONTENTS

1. [Made-to-Order vs Stocking Distributor -- The Transition Journey](#1-made-to-order-vs-stocking-distributor)
2. [Drop-Ship Model Operations](#2-drop-ship-model-operations)
3. [When to Start a Warehouse](#3-when-to-start-a-warehouse)
4. [Warehouse Operations for Building Materials](#4-warehouse-operations-for-building-materials)
5. [Inventory Management System Design](#5-inventory-management-system-design)
6. [Inventory States and Their Connection to Order States](#6-inventory-states-and-their-connection-to-order-states)
7. [Warehouse App Features](#7-warehouse-app-features)
8. [Yard Management for Building Materials](#8-yard-management-for-building-materials)
9. [Integration Between Warehouse, Orders, and Procurement](#9-integration-between-warehouse-orders-and-procurement)
10. [Inventory Planning and Reorder Points](#10-inventory-planning-and-reorder-points)

---

## 1. MADE-TO-ORDER VS STOCKING DISTRIBUTOR

### The Spectrum of Distribution Models

Building materials distributors operate along a spectrum, not a binary:

```
ASSET-LIGHT                                                    ASSET-HEAVY
    |                                                              |
Pure Broker  -->  Drop-Ship  -->  Cross-Dock  -->  Selective  -->  Full
(no product       (supplier        (touch but       Stocking      Stocking
 touch)           to jobsite)      don't store)                   Distributor
```

**Phase 1: Pure Broker / Made-to-Order (No Inventory)**
- Every order is sourced fresh from suppliers
- Product ships directly from supplier/manufacturer to customer jobsite
- Company acts as sourcing agent, relationship manager, and credit intermediary
- Zero warehouse cost, zero inventory risk, zero carrying cost
- Margin comes from markup, volume negotiation leverage, and credit facilitation
- Typical gross margins: 8-15% on materials

**Phase 2: Drop-Ship with Selective Cross-Docking**
- Most orders still drop-ship (80%+ of volume)
- Some orders are consolidated at a staging point (rented yard or small facility)
- Cross-docking: materials arrive from multiple suppliers, get combined into a single delivery
- No long-term storage -- materials pass through in 24-72 hours
- Useful when a customer order requires materials from 3-5 different suppliers

**Phase 3: Selective Stocking**
- Stock 20-50 high-velocity SKUs that are ordered repeatedly
- Maintain safety stock of items with long or unreliable supplier lead times
- Keep a buffer of items customers frequently need urgently (emergency/same-day demand)
- Continue drop-shipping 60-80% of total order volume
- Typical first items to stock: common cement types, standard rebar sizes, commodity lumber dimensions, basic fasteners, common pipe sizes

**Phase 4: Full Stocking Distributor**
- Hundreds to thousands of SKUs on hand
- Full warehouse + yard operations
- Drop-ship only for specialty/custom items or oversized orders
- Requires significant capital investment in inventory, real estate, equipment, staff

### What Products to Stock First

The decision of which products to stock first follows a clear hierarchy:

| Priority | Category | Rationale | Examples |
|----------|----------|-----------|----------|
| 1 | High-frequency, high-margin items | Ordered by many customers repeatedly; margin improvement from bulk buying is significant | Standard Portland cement (Type I/II), common rebar sizes (#3, #4, #5), 2x4 and 2x6 lumber |
| 2 | Long lead-time items customers need fast | Supplier lead time is 2-4 weeks but customers need in 2-3 days; stocking creates competitive advantage | Specialty steel sections, imported tiles, specific pipe fittings |
| 3 | Items with unreliable supplier delivery | Suppliers frequently miss delivery dates; stocking protects your reliability reputation | Items from distant or overseas suppliers, single-source products |
| 4 | High-volume commodity items with bulk discount | Buying truckloads vs. partial loads yields 10-20% cost savings | Sand, gravel, basic concrete blocks |
| 5 | Emergency/urgent demand items | Contractors need same-day for projects that cannot stop | Safety equipment, common adhesives, basic hardware, patching compounds |

### Cost of Holding Inventory

Inventory carrying costs for building materials distributors typically range from **15-30% of inventory value annually**. This breaks down as:

| Cost Component | Percentage of Inventory Value | Notes |
|----------------|-------------------------------|-------|
| Capital cost (cost of money tied up) | 6-10% | Opportunity cost or interest on borrowed capital |
| Warehouse space (rent, utilities, insurance) | 3-6% | Building materials need more space per dollar of inventory than most goods |
| Labor (receiving, storing, counting, picking) | 2-4% | Heavy materials require equipment and trained operators |
| Shrinkage, damage, obsolescence | 2-5% | Cement expires (3-6 months), lumber warps, steel rusts if stored improperly |
| Insurance and taxes | 1-3% | Property tax on inventory in many jurisdictions |
| **Total** | **15-30%** | Lower end for well-managed operations; higher for outdoor/weather-exposed materials |

### Revenue/Volume Trigger for Transition

There is no single universal revenue number, but industry patterns show:

- **$1M-$5M revenue:** Stay fully asset-light. Drop-ship everything. Use the margin to build relationships and volume.
- **$5M-$15M revenue:** Begin selective stocking of 10-30 SKUs. A small rented yard or shared warehouse space (2,000-5,000 sq ft + outdoor area) may make sense. Monthly cost: $3,000-$8,000.
- **$15M-$50M revenue:** Dedicated warehouse (5,000-15,000 sq ft) plus yard (0.5-2 acres). Stock 50-200 SKUs. 2-5 warehouse staff. Monthly facility cost: $10,000-$30,000.
- **$50M+ revenue:** Full warehouse/yard operations. Multiple locations may be needed. 10,000-50,000+ sq ft warehouse, 2-10+ acre yard. 10+ warehouse staff.

**The real trigger is not revenue alone, but a combination:**
- The same 20 items are being ordered by 10+ customers every month
- Supplier lead time failures are causing you to lose customers or pay expediting fees
- Customers explicitly request same-day or next-day availability
- The margin improvement from bulk purchasing exceeds the carrying cost
- You are paying for expedited freight repeatedly because you cannot pre-position stock

**Rule of thumb:** When consistent, predictable demand on specific SKUs has been sustained for 3-4 months and the margin improvement from stocking (bulk purchase price + eliminated expediting fees) exceeds 15-20% over the drop-ship margin, the financial case for stocking those items is strong.

---

## 2. DROP-SHIP MODEL OPERATIONS

### What "Operations" Looks Like When You Never Touch the Product

In a drop-ship model where 80%+ of deliveries go directly from supplier to customer jobsite, the operations function is entirely about coordination, tracking, and exception management.

### The Coordination Role

```
CUSTOMER                    YOUR COMPANY                    SUPPLIER
   |                            |                              |
   |--- Places Order ---------> |                              |
   |                            |--- Creates PO --------------> |
   |                            |                              |
   |                            |<-- Confirms Ship Date ------- |
   |<-- Confirms Delivery Date- |                              |
   |                            |                              |
   |                            |--- Tracks Shipment --------> |
   |                            |<-- Shipment Updates --------- |
   |<-- Delivery Notification - |                              |
   |                            |                              |
   |    [Product ships directly from Supplier to Customer]     |
   |                            |                              |
   |--- Confirms Receipt -----> |                              |
   |                            |--- Triggers Payment -------> |
   |<-- Sends Invoice --------- |                              |
```

### Key Operations Functions in Drop-Ship Model

**1. Order Orchestration (The Core Function)**
- Receive customer order (from sales/quoting process)
- Break order into supplier POs (one customer order may trigger POs to 3-10 suppliers)
- Match delivery dates across multiple suppliers for coordinated jobsite delivery
- Communicate confirmed delivery schedule to customer
- Handle changes (customer changes quantities, delivery dates, specifications)

**2. Supplier Coordination**
- Send POs to suppliers (electronically or via email/phone)
- Get order acknowledgments with confirmed quantities, prices, delivery dates
- Track open POs against promised dates
- Escalate when suppliers miss commitments
- Coordinate delivery windows (many jobsites have specific delivery time slots)

**3. Shipment Tracking**
- Track all in-transit shipments from suppliers to customer sites
- Monitor for delays and proactively notify customers
- Coordinate multi-supplier deliveries (e.g., steel arrives first, then cement, then lumber -- in that sequence because of how the contractor builds)
- Verify delivery occurred (proof of delivery from carrier or supplier)

**4. Exception Management (Where Most Operational Time Goes)**

| Exception | Frequency | Response |
|-----------|-----------|----------|
| Supplier delivery delay | 10-20% of shipments | Notify customer, find alternative supplier or expedite |
| Wrong quantity delivered | 3-5% of deliveries | Coordinate return/replacement, credit memo |
| Wrong product/specification | 1-3% of deliveries | Urgent replacement sourcing, return logistics |
| Damaged in transit | 2-5% of deliveries | Document damage, file carrier claim, arrange replacement |
| Customer rejects delivery | 1-2% of deliveries | Understand reason, coordinate return to supplier |
| Partial delivery | 5-10% of shipments | Track remaining quantity, update customer on balance ETA |
| Customer site not ready to receive | 3-5% of deliveries | Reschedule delivery, manage storage fees if truck held |

**5. Quality Issues When You Never Touch the Product**

This is a significant challenge. Mitigation strategies:

- **Supplier qualification:** Maintain approved supplier list. Audit suppliers periodically. Track quality metrics per supplier (defect rate, damage rate, return rate).
- **Delivery documentation:** Require photo documentation of loaded truck (from supplier) and delivery (from carrier). Customer signs delivery receipt noting any visible damage.
- **Customer inspection window:** Include terms that require customer to inspect within 24-48 hours and report issues. After that window, claims become harder.
- **Supplier accountability:** Track quality issues per supplier. Negotiate quality clauses in supplier agreements (e.g., supplier bears cost of replacement + expediting for defective product).
- **Third-party inspection:** For high-value orders (structural steel, specialty materials), hire third-party inspection at the supplier's facility before shipment. Cost: $500-$2,000 per inspection but worthwhile on $100K+ orders.

### Tracking Requirements for Drop-Ship Operations

The system must track:

| Data Point | Why It Matters |
|------------|---------------|
| PO status per supplier (sent, acknowledged, in production, shipped, delivered) | Core operational visibility |
| Expected vs actual ship date per PO line | Proactive delay management |
| Carrier/tracking number per shipment | Real-time delivery tracking |
| Proof of delivery (signed receipt, photos) | Invoicing trigger, dispute resolution |
| Customer delivery schedule (what arrives when) | Coordinate multi-supplier delivery sequence |
| Quality incidents per supplier | Supplier performance management |
| Delivery exceptions (delays, shorts, damage) | Exception dashboard and supplier scorecards |
| Cost reconciliation (PO cost vs supplier invoice) | Margin protection |

### Staffing for Drop-Ship Operations

| Volume (Monthly Orders) | Operations Staff Needed | Roles |
|--------------------------|------------------------|-------|
| 10-30 orders | 1-2 people | Operations coordinator (also does some procurement) |
| 30-100 orders | 2-4 people | Operations manager + 1-3 coordinators (split by supplier region or product category) |
| 100-300 orders | 4-8 people | Operations manager, senior coordinators, logistics coordinators, quality/claims specialist |
| 300+ orders | 8+ people | Dedicated team with specialization by function (procurement, logistics, quality, claims) |

---

## 3. WHEN TO START A WAREHOUSE

### Decision Framework

Starting a warehouse is a capital-intensive, hard-to-reverse decision. Use this framework:

**Quantitative Triggers (Must Meet at Least 2-3):**

1. **Margin gap exceeds carrying cost:** Bulk-purchase pricing on stocked items saves 15-25% over per-order purchasing, and this saving exceeds the 15-30% annual carrying cost of inventory.
2. **Expediting costs exceed $3,000-$5,000/month:** You are paying premium freight to rush materials because you cannot pre-position stock.
3. **Lost orders due to lead time exceed $50,000/quarter:** Customers go to competitors who can deliver from stock.
4. **Cross-docking demand exceeds 10-15 orders/month:** Multiple-supplier consolidation orders justify a physical facility.
5. **Revenue exceeds $5M-$10M annually** with clear trajectory upward.

**Qualitative Triggers:**

- Key customers explicitly ask for stock availability / same-day pickup
- Your competitive differentiation requires faster delivery than drop-ship allows
- You want to offer value-added services (cutting, kitting, pre-assembly) which require a facility
- Supplier reliability is poor and you need buffer stock to protect service levels

### Minimum Viable Warehouse Setup for Building Materials

**Option A: Shared/Rented Yard Space (Lowest Cost Entry)**

```
Cost Breakdown (Monthly):
  Yard rent (0.5-1 acre, industrial area):     $2,000 - $5,000
  Basic fencing/security:                       $300 - $500
  Portable office container:                    $200 - $400
  Forklift rental (used, weekly):               $600 - $1,200
  1 warehouse worker (part-time to start):      $2,500 - $4,000
  Insurance:                                    $500 - $1,000
  ─────────────────────────────────────────────────────────────
  TOTAL MONTHLY:                                $6,100 - $12,100
```

Suitable for: Staging area for cross-docking, storing 10-30 high-velocity SKUs outdoors (steel, lumber, aggregates). No covered storage.

**Option B: Small Warehouse + Yard (Typical First Facility)**

```
Cost Breakdown (Monthly):
  Warehouse rent (3,000-5,000 sq ft):           $3,000 - $7,000
  Yard/outdoor area (0.5-1 acre):               $1,500 - $3,000
  Utilities (electric, water):                  $500 - $1,000
  Forklift (purchased used or leased):          $500 - $1,000
  Pallet racking (amortized):                   $200 - $500
  2 warehouse workers:                          $7,000 - $10,000
  Insurance:                                    $800 - $1,500
  WMS/inventory software:                       $200 - $500
  Supplies (pallets, wrap, labels):             $200 - $400
  ─────────────────────────────────────────────────────────────
  TOTAL MONTHLY:                                $13,900 - $24,900
```

Suitable for: Stocking 30-100 SKUs. Covered storage for cement, adhesives, weather-sensitive items. Outdoor yard for lumber, steel, pipe. Basic receiving and shipping dock.

**Option C: Full Warehouse + Yard Operation**

```
Cost Breakdown (Monthly):
  Warehouse rent (10,000-20,000 sq ft):         $8,000 - $20,000
  Yard/outdoor area (1-3 acres):                $3,000 - $8,000
  Utilities:                                    $1,500 - $3,000
  Forklifts (2-3 units):                        $1,500 - $3,000
  Racking and storage systems:                  $500 - $1,500
  5-8 warehouse workers:                        $20,000 - $40,000
  Warehouse manager:                            $5,000 - $7,000
  Insurance:                                    $1,500 - $3,000
  WMS software:                                 $500 - $2,000
  Equipment maintenance:                        $500 - $1,000
  Security:                                     $500 - $1,000
  ─────────────────────────────────────────────────────────────
  TOTAL MONTHLY:                                $42,500 - $89,500
```

Suitable for: 200+ SKUs. Multiple loading docks. Covered and outdoor storage. Value-added services (cutting, kitting). Multiple daily shipments.

### Warehouse Cost Benchmarks (2025-2026)

| Metric | Range | Notes |
|--------|-------|-------|
| Warehouse rent (national avg) | $8-$12/sq ft/year | Varies dramatically: $5 in rural areas, $15+ in metro |
| Yard/outdoor space rent | $0.50-$2.00/sq ft/year | Much cheaper than covered space |
| Forklift (5,000 lb capacity, new) | $25,000-$40,000 | Used: $10,000-$20,000 |
| Forklift (10,000 lb capacity, new) | $40,000-$70,000 | Needed for heavy building materials (cement pallets, steel) |
| Pallet racking (per pallet position) | $50-$150 | Heavy-duty for building materials |
| Warehouse worker (hourly) | $16-$25/hour | Higher for forklift-certified operators |
| Warehouse manager (salary) | $50,000-$80,000/year | Depending on market and facility size |

---

## 4. WAREHOUSE OPERATIONS FOR BUILDING MATERIALS

### What Makes Building Materials Unique

Building materials warehousing differs significantly from general consumer goods warehousing:

| Factor | General Warehouse | Building Materials |
|--------|-------------------|-------------------|
| Weight per unit | 1-50 lbs typical | 50-5,000+ lbs per unit (cement pallets ~2,500 lbs, steel bundles ~5,000 lbs) |
| Size/dimensions | Standard carton sizes | Highly irregular: 20 ft lumber, 40 ft rebar, 4x8 ft sheet goods |
| Storage type | Indoor, racked | Mixed: indoor racked, outdoor yard, covered outdoor |
| Material handling | Pallet jacks, pick carts | Heavy forklifts, overhead cranes, flatbed trucks |
| Floor loading | 250-500 lbs/sq ft | 1,000-2,000+ lbs/sq ft (needs reinforced floors for cement storage) |
| Weather sensitivity | Everything indoors | Most items outdoor-tolerant; some (cement, drywall, insulation) require cover |
| Shelf life | Rarely an issue | Cement: 3-6 months. Adhesives/sealants: 12-24 months. Treated lumber varies. |
| Unit of measure | Each, case, pallet | Ton, cubic yard, linear foot, bundle, bag, pallet, truckload |
| Picking method | Individual items from shelves | Entire pallets, bundles, or partial pallets (rarely individual pieces) |
| Loading equipment | Dock-level pallet jack | Forklifts, boom trucks, crane trucks, flatbeds with strapping |

### Receiving Operations

**Receiving Heavy Materials -- Standard Process:**

```
1. SCHEDULE ARRIVAL
   - Supplier provides advance ship notice (ASN) with quantities, truck type, ETA
   - Warehouse confirms dock/yard availability
   - Assign receiving bay (dock for palletized goods, yard for bulk/oversize)

2. CHECK IN TRUCK
   - Verify truck against expected deliveries (PO number, supplier, carrier)
   - Check truck condition (no visible damage to load)
   - Weigh truck if receiving bulk materials (aggregates, sand -- requires scale)

3. UNLOAD AND COUNT
   - Forklift operator unloads pallets/bundles
   - Receiving clerk counts units against PO and delivery ticket
   - For cement: count bags per pallet, check pallet condition, note manufacture date
   - For steel: count bundles, verify lengths and sizes against PO specs
   - For lumber: tally count by dimension, check grade stamps, note moisture content if relevant
   - For aggregates: weigh (truck weigh-in vs weigh-out) and visual quality check

4. INSPECT QUALITY
   - Visual inspection for damage (crushed cement bags, bent rebar, split lumber)
   - Check specifications match PO (steel grade, cement type, lumber grade/species)
   - Note any discrepancies on delivery receipt BEFORE driver leaves
   - Photograph any damage -- this is critical for claims

5. DOCUMENT AND ACCEPT
   - Sign delivery receipt with noted exceptions
   - Enter received quantities into system (scan barcodes if available)
   - Record lot/batch numbers (especially cement -- needed for FIFO tracking)
   - Record storage location assignment

6. PUTAWAY
   - Move materials to assigned storage location
   - Indoor: cement to dry covered area, adhesives/sealants to shelving
   - Outdoor yard: steel to designated steel area, lumber to lumber racks/bunks
   - Update system with storage location
```

**Material-Specific Receiving Notes:**

| Material | Receiving Considerations |
|----------|------------------------|
| Cement (bags/pallets) | Check manufacture date (shelf life 3-6 months). Reject if bags are hard/lumpy (moisture damage). Store on raised pallets in dry covered area. FIFO is critical. 94 lb bags, ~42 bags per pallet. Pallet weight ~2,500 lbs. |
| Cement (bulk) | Requires cement silo. Weigh delivery (pneumatic truck). Check type/grade certification. |
| Rebar/Steel | Count bundles and verify sizes (diameter, length, grade). Check for excessive rust or bending. Store on timber dunnage off the ground to prevent contact corrosion. Tag bundles with lot/heat numbers. Weight: up to 5,000 lbs per bundle. |
| Structural Steel | Verify mill test certificates (MTCs) match order specs. Check for shipping damage (bent flanges, twisted members). Often custom-cut -- verify dimensions. Requires overhead crane for heavy sections. |
| Lumber | Tally count by dimension (e.g., 500 pcs 2x4x8). Check grade stamps. Inspect for warping, splitting, excessive knots beyond grade tolerance. Stack on stickers (spacers) for airflow. Store covered or under roof if possible. |
| Sheet Goods (plywood, drywall, OSB) | Count sheets per unit. Check for water damage (swelling, delamination). Store flat on level surface. Drywall is extremely moisture-sensitive -- must be covered. |
| Pipe (PVC, steel, copper) | Count lengths and verify diameter/schedule. Check for cracks (PVC) or dents (steel). Bundle and store on racks or in designated pipe area. |
| Aggregates (sand, gravel, crushed stone) | Weigh by truck scale. Visual quality check for contamination. Dump in designated bin/pile. Volume estimation (cubic yards) also used. |
| Roofing materials (shingles, membranes) | Check for heat/sun damage in transit. Store covered, flat, and off the ground. Do not stack shingle pallets more than 3 high. |

### Storage Requirements

**Covered Warehouse (Indoor) -- Required For:**
- Cement (bags and specialty products) -- must be dry, away from walls
- Adhesives, sealants, caulks -- temperature-sensitive
- Drywall, insulation -- moisture-destroys product
- Electrical and plumbing fittings -- small items, theft-prone
- Paint, coatings -- temperature-sensitive
- Fasteners, hardware -- organized bin storage

**Covered Outdoor (Roof, Open Sides) -- Suitable For:**
- Lumber (especially finished/treated) -- protection from rain but needs airflow
- Sheet goods (plywood, OSB) -- rain protection
- Bagged products on pallets -- temporary staging

**Open Outdoor Yard -- Suitable For:**
- Structural steel and rebar -- rust-tolerant with proper dunnage
- Pipe (steel, PVC) -- racks or bunks
- Concrete blocks and pavers -- ground-level pallets
- Aggregates (sand, gravel, stone) -- bins or piles with retaining walls
- Lumber (rough, framing grade) -- stickered stacks with top cover
- Large precast concrete products

### Inventory Tracking in the Warehouse

| Tracking Element | What to Track | Why |
|-----------------|---------------|-----|
| **Location** | Warehouse zone + row + bay + level (e.g., A-03-02-1) | Find product quickly, direct putaway and picking |
| **Lot/Batch Number** | Manufacturer batch, production date, receipt date | FIFO enforcement for cement, traceability for quality issues, recall management |
| **Quantity** | On-hand units by UOM (bags, bundles, pieces, tons, cubic yards) | Inventory accuracy, order fulfillment |
| **Condition** | Good, Damaged, On-Hold, Quarantine | Prevent shipping damaged goods, manage claims |
| **Shelf Life / Expiration** | Manufacture date + shelf life = expiration | FEFO (First Expired, First Out) for cement, adhesives |
| **Reserved/Allocated** | Linked to specific sales order | Prevent double-selling same stock |
| **Supplier** | Which supplier provided this lot | Traceability for quality issues |
| **Mill Test Certificates** | Linked document for steel products | Required for structural applications, building code compliance |

### Picking and Staging for Delivery

Building materials picking differs from e-commerce/retail picking:

```
PICKING FLOW FOR BUILDING MATERIALS:

1. PICK LIST GENERATED
   - System generates pick list from confirmed sales order
   - Grouped by delivery route/truck/customer
   - Sequence: heavy items first (bottom of truck), light on top

2. PICK BY FORKLIFT
   - Forklift operator picks full pallets or bundles from storage
   - For partial pallets: break pallet in designated area, count out required quantity
   - Scan/verify product matches pick list (lot number, quantity)

3. STAGE IN LOADING AREA
   - Materials staged in designated loading bay area
   - Organized by delivery stop (if multi-stop route)
   - Load sequence marked: first delivery stop loaded last (LIFO loading)

4. LOAD VERIFICATION
   - Verify staged materials against order/pick list
   - Check quantities, product codes, condition
   - Sign-off by warehouse lead or checker

5. LOAD ONTO TRUCK
   - Load in correct sequence for delivery route
   - Secure load (strapping, blocking, bracing) per DOT requirements
   - Weight check against truck capacity and legal weight limits
   - Driver signs loaded bill of lading
```

**Key Differences from Standard Warehouse Picking:**
- Picks are almost always full pallets or bundles, not individual items
- Forklift is required for nearly every pick (not hand-pick)
- Load sequence matters (heavy on bottom, delivery sequence matters)
- Legal weight limits per axle must be considered during loading
- Materials often require special securing (steel strapped, lumber stacked and wrapped, cement pallets shrink-wrapped)

---

## 5. INVENTORY MANAGEMENT SYSTEM DESIGN

### Core Data Model

The inventory module must track multiple dimensions simultaneously:

```
PRODUCT (SKU)
  |
  +-- LOCATION 1 (Warehouse A)
  |     +-- Lot 001 (received Jan 15, expires Jul 15)
  |     |     +-- Quantity: 50 pallets
  |     |     +-- Status: Available
  |     |
  |     +-- Lot 002 (received Feb 20, expires Aug 20)
  |           +-- Quantity: 30 pallets
  |           +-- Status: 20 Available, 10 Reserved (SO-1234)
  |
  +-- LOCATION 2 (Yard B)
  |     +-- Lot 003 (received Mar 01)
  |           +-- Quantity: 15 bundles
  |           +-- Status: 10 Available, 5 On-Hold (quality check)
  |
  +-- IN-TRANSIT (from Supplier X, PO-5678)
        +-- Quantity: 100 pallets
        +-- ETA: Mar 15
        +-- Status: In-Transit Inbound
```

### Quantity Buckets the System Must Maintain

For each SKU at each location, the system must track these quantities:

| Quantity Type | Definition | Calculation |
|--------------|------------|-------------|
| **On-Hand** | Physically present in the warehouse/yard | Direct count (receiving adds, shipping subtracts) |
| **Available** | Can be promised to new orders | On-Hand - Reserved - Allocated - On-Hold - Damaged |
| **Reserved** | Committed to a confirmed sales order but not yet picked | Increases when order is confirmed, decreases when picked |
| **Allocated** | Assigned to a pick list, being actively picked | Increases when pick list created, decreases when loaded/shipped |
| **On-Hold** | Physically present but not available (quality issue, pending inspection, customer dispute) | Manual hold or system-triggered hold |
| **Damaged** | Physically present but not sellable in current condition | Receiving inspection or cycle count discovery |
| **In-Transit Inbound** | On the way from supplier, not yet received | PO shipped but not yet received |
| **In-Transit Outbound** | Left the warehouse, not yet delivered to customer | Shipped but not yet delivery-confirmed |
| **On-Order** | Ordered from supplier but not yet shipped | PO placed but not yet shipped by supplier |

**Key Formula:**
```
Available to Promise (ATP) = On-Hand - Reserved - Allocated - On-Hold - Damaged

Available to Promise (Extended) = ATP + In-Transit Inbound + On-Order - Future Reservations

Total Inventory Position = On-Hand + In-Transit Inbound + On-Order
```

### Multi-Location Handling

The system must support:

- **Multiple warehouses/yards** as distinct inventory locations
- **Zones within a location** (indoor warehouse, covered outdoor, open yard, staging area)
- **Bin/bay-level tracking** within zones for high-value or high-volume items
- **Transfer orders** between locations (with in-transit state during transfer)
- **Location-specific availability** -- a customer in Region A sees stock from Warehouse A, not Warehouse B (unless willing to pay transfer freight)

```
Location Hierarchy:
  Company
    +-- Region (e.g., Northeast, Southeast)
         +-- Facility (e.g., Houston Warehouse)
              +-- Zone (e.g., Indoor Warehouse, Outdoor Yard, Staging)
                   +-- Aisle/Row (e.g., A, B, C)
                        +-- Bay (e.g., 01, 02, 03)
                             +-- Level (e.g., Floor, Rack-1, Rack-2)
```

### Lot Tracking and Shelf Life

**Why Lot Tracking Matters for Building Materials:**

- **Cement:** Shelf life 3-6 months. System must enforce FEFO (First Expired, First Out). Alert when lots approach expiration (30 days warning, 7 days critical). Expired cement must be quarantined -- it loses compressive strength and becomes a liability if sold.
- **Steel:** Heat/lot numbers link to Mill Test Certificates (MTCs). If a structural failure investigation occurs, the lot number traces back to the mill, the heat, and the specific production run. This is not optional for structural steel -- it is a legal/code requirement.
- **Treated lumber:** Treatment lot numbers trace to the chemical treatment batch. Needed for warranty claims and regulatory compliance.
- **Adhesives/sealants:** Shelf life 12-24 months. FEFO required. Temperature exposure tracking may be needed for high-performance products.

**Lot Record Should Include:**
- Lot/batch number (from manufacturer)
- Internal receipt lot number
- Manufacturing date
- Expiration date (or shelf life in months)
- Supplier
- PO number
- Receiving date
- Mill Test Certificate reference (for steel)
- Quality inspection status
- Linked sales orders (where this lot was shipped)

### Damaged and Hold Stock

The system must handle:

**Damage Discovery Points:**
1. At receiving (damaged in transit from supplier) -- create supplier claim
2. During storage (forklift damage, weather damage, pest damage) -- internal write-off
3. During picking (discovered damage when pulling from storage) -- reclassify
4. Customer-reported (delivered damaged) -- return/credit process

**Hold Reasons:**
- Quality inspection pending
- Customer dispute (product returned, condition being evaluated)
- Regulatory hold (product recall, specification issue)
- Pending damage assessment
- Count discrepancy (cycle count found variance, hold until resolved)

**Disposition Workflow:**
```
Damaged/Hold Stock Discovered
    |
    +-- Assess (inspect, photograph, document)
    |
    +-- Decision
         +-- Return to Supplier (if supplier-caused damage)
         +-- Sell as-is (discount, if minor cosmetic damage)
         +-- Scrap/Dispose (if unsalvageable)
         +-- Rework (if repairable -- e.g., cut damaged end off lumber)
         +-- Return to Available (if hold was precautionary and item is fine)
```

---

## 6. INVENTORY STATES AND THEIR CONNECTION TO ORDER STATES

### Complete Inventory State Machine

```
                                    SUPPLIER SIDE
                                         |
                    +--------------------+--------------------+
                    |                    |                    |
               [ON ORDER]         [IN-TRANSIT           [RECEIVED /
               PO placed,         INBOUND]              ON-HAND]
               supplier           Shipped by            Physically
               confirmed          supplier,             in warehouse
                    |             in transit                  |
                    |                    |              +-----+------+
                    v                    v              |            |
               Supplier            Arrives at      [AVAILABLE]  [ON-HOLD]
               ships               warehouse       Can be       Quality check,
                    |                    |          promised     dispute, etc.
                    v                    v              |            |
              [IN-TRANSIT          [RECEIVING]         |       [DAMAGED]
               INBOUND]           Being counted,      |       Not sellable
                                  inspected           |
                                       |              |
                                       v              |
                                  [PUT AWAY]          |
                                  In storage          |
                                  location            |
                                       |              |
                                       v              v
                                  [AVAILABLE] <-------+
                                       |
                    CUSTOMER ORDER FLOW |
                                       v
                                  [RESERVED]
                                  Committed to
                                  sales order
                                       |
                                       v
                                  [ALLOCATED]
                                  On pick list,
                                  being picked
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
                                  [IN-TRANSIT
                                   OUTBOUND]
                                  En route to
                                  customer
                                       |
                                       v
                                  [DELIVERED]
                                  At customer site,
                                  signed for
                                       |
                                       v
                                  [CONSUMED]
                                  Inventory record
                                  closed. Revenue
                                  recognized.
```

### How Inventory States Connect to Order States

| Sales Order State | Inventory Impact | Inventory State Change |
|-------------------|------------------|----------------------|
| **Quote Created** | None | No inventory impact (quote is not a commitment) |
| **Order Confirmed** | Reserve inventory | Available --> Reserved (for stocked items) |
| **Order Confirmed (not in stock)** | Trigger procurement | Creates "On-Order" quantity via new PO to supplier |
| **Pick List Created** | Allocate from reserved | Reserved --> Allocated |
| **Picking In Progress** | Being physically pulled | Remains Allocated until pick confirmed |
| **Pick Complete / Staged** | Picked and staged | Allocated --> Staged (sub-state of Allocated) |
| **Loaded on Truck** | Left storage area | Staged --> In-Transit Outbound; On-Hand decreases |
| **In Delivery** | On the way to customer | In-Transit Outbound |
| **Delivered** | At customer site | In-Transit Outbound --> Delivered; inventory record closed |
| **Delivery Confirmed** | Customer signed | Triggers invoicing |
| **Order Cancelled (before pick)** | Release reservation | Reserved --> Available |
| **Order Cancelled (after pick)** | Return to stock | Allocated --> Available (with re-putaway) |
| **Partial Delivery** | Split states | Some units Delivered, remaining stay Reserved |
| **Return Initiated** | Pending inbound | Creates expected return; no immediate inventory impact |
| **Return Received** | Inspect and disposition | Received --> On-Hold --> (Available or Damaged or Return to Supplier) |

### How Inventory States Connect to Purchase Order States

| Purchase Order State | Inventory Impact | Inventory State Change |
|---------------------|------------------|----------------------|
| **PO Created** | No inventory impact yet | Informational only |
| **PO Confirmed by Supplier** | Creates expected inventory | On-Order quantity increases |
| **PO Shipped by Supplier** | In transit | On-Order --> In-Transit Inbound |
| **PO Partially Received** | Split states | Received portion --> On-Hand; remainder stays In-Transit or On-Order |
| **PO Fully Received** | Available | In-Transit Inbound --> On-Hand (Available after putaway) |
| **PO Received with Discrepancy** | Partial + exception | Good portion --> Available; discrepant portion --> On-Hold |
| **PO Cancelled** | Remove expected stock | On-Order decreases; may trigger re-sourcing |

### Drop-Ship Order States (No Warehouse Involvement)

For orders that ship directly from supplier to customer, the inventory states are virtual:

| Order State | Virtual Inventory State |
|-------------|----------------------|
| Order Confirmed, PO sent to supplier | Virtual On-Order |
| Supplier ships to customer | Virtual In-Transit (to customer) |
| Customer receives delivery | Virtual Delivered |

The system should track these virtual states even though the product never enters the warehouse, because:
- ATP calculations for future orders need to know what is committed
- Financial reporting needs to track committed costs
- Operations dashboards need to show all order activity regardless of fulfillment method

---

## 7. WAREHOUSE APP FEATURES

### What a Warehouse Worker Needs on Their Device

The warehouse app should be **mobile-first**, designed for rugged Android devices (Zebra, Honeywell) or ruggedized tablets with built-in barcode scanners. Building materials environments are dusty, wet, and involve heavy gloves -- the UI must accommodate this.

### Core App Modules

**1. Receiving**

| Feature | Details |
|---------|---------|
| Expected deliveries | List of POs expected today with supplier, quantities, dock assignment |
| Scan to receive | Scan barcode on delivery ticket or product label to pull up PO |
| Count and confirm | Enter received quantity per line item; system shows expected vs actual |
| Exception recording | Flag short shipments, over-shipments, damaged items, wrong product |
| Photo capture | Take photos of damage, truck condition, product labels (inline in app) |
| Lot/batch entry | Scan or enter manufacturer lot number, production date |
| Weight entry | Enter scale weight for bulk materials (aggregates, bulk cement) |
| Quality check | Checklist by product type (cement: check bags for hardness; steel: check rust; lumber: check grade stamp) |
| Sign-off | Digital signature confirming receipt |

**2. Putaway**

| Feature | Details |
|---------|---------|
| Putaway assignment | System suggests location based on product type, zone rules, available space |
| Scan location | Scan destination location barcode to confirm putaway |
| Override location | Worker can choose different location if suggested location is full/blocked |
| Confirm putaway | Scan product + scan location = putaway confirmed |

**3. Picking**

| Feature | Details |
|---------|---------|
| Pick list view | Today's picks grouped by order, route, or priority |
| Directed picking | Step-by-step: go to location X, pick product Y, quantity Z |
| Scan to confirm | Scan location barcode, then scan product barcode to confirm correct pick |
| Lot selection | System directs to oldest lot (FEFO for expiring items, FIFO otherwise) |
| Partial pick handling | If insufficient quantity at location, pick what is available and system directs to next location |
| Substitution | Flag if product is out of stock, suggest substitute if configured |
| Quantity entry | Enter picked quantity (especially for partial pallet picks) |

**4. Loading Verification**

| Feature | Details |
|---------|---------|
| Load list | What should go on which truck, in what sequence |
| Scan to load | Scan each pallet/bundle as it goes on the truck |
| Weight tracking | Running total of loaded weight vs truck capacity |
| Sequence check | Alert if loading out of delivery-route sequence |
| Load complete | Confirm all items loaded, generate bill of lading |
| Driver sign-off | Driver digitally signs acceptance of load |

**5. Cycle Counting**

| Feature | Details |
|---------|---------|
| Count assignments | System assigns locations/products to count (daily cycle) |
| Blind count | Worker counts without seeing expected quantity (more accurate) |
| Scan location | Scan location barcode to start count for that location |
| Enter count | Enter physical count by product/lot |
| Variance flag | System highlights variances exceeding threshold (e.g., >2% for A items, >5% for C items) |
| Recount | If variance flagged, prompt supervisor recount |
| Adjustment approval | Supervisor approves inventory adjustment with reason code |

**6. Inventory Lookup**

| Feature | Details |
|---------|---------|
| Product search | Search by SKU, name, barcode, or description |
| Location search | See what is in a specific location |
| Stock status | Available, reserved, on-hold quantities per location |
| Lot details | Lot number, manufacture date, expiration, supplier |
| Movement history | Last received, last picked, last counted |
| Photo reference | Product photo for identification (useful for workers unfamiliar with products) |

**7. Transfer (Between Zones or Locations)**

| Feature | Details |
|---------|---------|
| Transfer request | Move product from Zone A to Zone B |
| Scan source | Scan product and source location |
| Scan destination | Scan destination location |
| Quantity | Enter transfer quantity |
| Reason | Transfer reason (rebalance, consolidation, damaged move-to-hold area) |

### UI/UX Requirements for Building Materials Warehouse App

```
DESIGN PRINCIPLES:
  +-- Large touch targets (workers wear gloves)
  +-- High contrast display (outdoor/bright environments)
  +-- Minimal text entry (scan everything possible)
  +-- Offline capability (yard areas may have poor connectivity)
  +-- Sync when connection available
  +-- Audio/vibration feedback for scans (noisy environments)
  +-- One-hand operation (other hand may be guiding forklift)
  +-- Quick task switching (interrupted frequently)
  +-- Battery-efficient (12-hour shifts)
```

### Barcode Strategy for Building Materials

| Item Type | Barcode Approach |
|-----------|-----------------|
| Manufactured products (cement bags, fittings, hardware) | Scan manufacturer UPC/EAN barcode |
| Bundles (steel, rebar, pipe) | Print and attach internal barcode label at receiving |
| Lumber | Print internal barcode on tag attached to bundle at receiving |
| Aggregates | No barcode (tracked by location/bin and weight) |
| Locations | Barcode labels on rack positions, zone markers, yard posts |
| Internal pallets | Internal barcode on pallet tag linking to contents |

**Recommended:** Use GS1-128 or QR codes that encode SKU + lot + quantity in a single scan where possible. For items without manufacturer barcodes, print labels at receiving using a rugged label printer (Zebra ZD420 or similar).

---

## 8. YARD MANAGEMENT FOR BUILDING MATERIALS

### Why Yard Management is Different from Indoor Warehouse Management

Building materials distributors often have more inventory value in the outdoor yard than in the indoor warehouse. The yard is where the heavy, bulky, high-volume items live:

| Indoor Warehouse | Outdoor Yard |
|-----------------|--------------|
| Cement, adhesives, hardware | Steel, rebar, structural sections |
| Fittings, fasteners | Lumber (stacked on bunks) |
| Drywall, insulation | Pipe (on racks or ground) |
| Paint, coatings | Concrete blocks, pavers |
| Small/high-value items | Aggregates (sand, gravel, stone) |
| Racked/shelved storage | Ground-level, bunk, or pile storage |
| Fixed bin locations | Flexible zones, shifting layout |
| Barcode on shelf works well | Barcodes deteriorate outdoors |

### Yard Layout and Zone Design

```
TYPICAL BUILDING MATERIALS YARD LAYOUT:

    ┌──────────────────────────────────────────────────────┐
    │                    ENTRANCE / GATE                    │
    │                     (Scale)                           │
    ├──────────────────────────────────────────────────────┤
    │                                                      │
    │   ┌──────────────┐    STAGING AREA                  │
    │   │  WAREHOUSE   │    (Loading/Unloading)           │
    │   │  (covered)   │                                  │
    │   │              │    ┌────────────────────┐        │
    │   │  Cement      │    │   STEEL ZONE       │        │
    │   │  Hardware    │    │   (Rebar, beams,   │        │
    │   │  Adhesives   │    │    structural)     │        │
    │   │  Drywall     │    └────────────────────┘        │
    │   └──────────────┘                                  │
    │                       ┌────────────────────┐        │
    │   ┌──────────────┐    │   LUMBER ZONE      │        │
    │   │  COVERED     │    │   (Bunks/racks,    │        │
    │   │  SHED        │    │    sorted by dim)  │        │
    │   │  (lumber,    │    └────────────────────┘        │
    │   │   sheets)    │                                  │
    │   └──────────────┘    ┌────────────────────┐        │
    │                       │   PIPE ZONE        │        │
    │                       │   (Racks by size)  │        │
    │   ┌──────────────┐    └────────────────────┘        │
    │   │  AGGREGATE   │                                  │
    │   │  BINS        │    ┌────────────────────┐        │
    │   │  Sand|Gravel │    │   BLOCK/PAVER ZONE │        │
    │   │  Stone|Fill  │    │   (Pallets on      │        │
    │   └──────────────┘    │    ground)         │        │
    │                       └────────────────────┘        │
    │                                                      │
    │   ┌──────────────────────────────────────────┐      │
    │   │         TRUCK PARKING / STAGING           │      │
    │   └──────────────────────────────────────────┘      │
    │                                                      │
    └──────────────────────────────────────────────────────┘
```

### Zone-Based Tracking (Instead of Bin-Level for Yards)

Traditional warehouse management uses aisle-rack-bin addressing. Outdoor yards use zone-based tracking:

```
ZONE-BASED ADDRESSING:

  YARD
    +-- ZONE: Steel
    |     +-- SUB-ZONE: Rebar
    |     |     +-- POSITION: Bunk 1 (stores #3 rebar, 20 ft)
    |     |     +-- POSITION: Bunk 2 (stores #4 rebar, 20 ft)
    |     |     +-- POSITION: Bunk 3 (stores #5 rebar, 40 ft)
    |     +-- SUB-ZONE: Structural
    |           +-- POSITION: Bay A (W-beams)
    |           +-- POSITION: Bay B (Angles/channels)
    |
    +-- ZONE: Lumber
    |     +-- SUB-ZONE: Framing
    |     |     +-- POSITION: Stack 1 (2x4x8)
    |     |     +-- POSITION: Stack 2 (2x4x12)
    |     |     +-- POSITION: Stack 3 (2x6x8)
    |     +-- SUB-ZONE: Sheet Goods
    |           +-- POSITION: Rack A (3/4" plywood)
    |           +-- POSITION: Rack B (7/16" OSB)
    |
    +-- ZONE: Aggregates
    |     +-- BIN: Bin 1 (Concrete sand)
    |     +-- BIN: Bin 2 (Pea gravel)
    |     +-- BIN: Bin 3 (#57 crushed stone)
    |
    +-- ZONE: Staging
          +-- AREA: Inbound staging
          +-- AREA: Outbound staging (by route/truck)
```

### Aggregate and Bulk Material Tracking

Aggregates (sand, gravel, crushed stone) present a unique tracking challenge because they are not counted in units but measured by weight or volume:

**Tracking Method:**
- Receive by weight (truck scale: loaded weight minus empty weight = material weight)
- Convert to volume using material density factor (e.g., crushed stone = ~1.4 tons per cubic yard)
- Track inventory by estimated tons or cubic yards remaining in each bin
- Periodic physical measurement (survey or laser measurement of pile dimensions) to calibrate
- Each outbound load weighed on truck scale

**Challenges:**
- Inventory is approximate (cannot count individual units)
- Weather affects weight (rain saturates material, adding water weight)
- Contamination between adjacent bins (sand mixes with gravel if walls are too low)
- Shrinkage from wind, rain washing, and spillage: typically 2-5% loss factor

### Technology Options for Yard Tracking

| Technology | Use Case | Cost | Accuracy |
|------------|----------|------|----------|
| **Zone barcode signs** | Workers scan zone marker when performing putaway/pick | Low ($) | Zone-level |
| **RFID tags on bundles** | Passive RFID tags on steel bundles, lumber stacks | Medium ($$) | Sub-zone level |
| **GPS on forklifts** | Track forklift movements to infer material movement | Medium ($$) | Zone-level (3-5m accuracy) |
| **Bluetooth beacons (BLE)** | Beacons in yard zones, workers/equipment with receivers | Medium ($$) | Sub-zone level |
| **UWB (Ultra-Wideband)** | High-precision indoor/outdoor location | High ($$$) | Meter-level |
| **Camera/AI vision** | Cameras mounted on yard poles, AI estimates pile sizes and locations | High ($$$) | Good for aggregates |
| **Drone surveys** | Periodic flyover to measure aggregate piles and survey yard layout | Medium ($$) | Excellent for aggregates |
| **Manual zone tracking** | Workers manually enter zone when moving materials | Lowest | Zone-level, depends on discipline |

**Recommended Starting Point:** Zone barcode signs + manual scan at putaway/pick. This gives zone-level accuracy at minimal cost. Upgrade to RFID for high-value items (structural steel) as volume grows.

---

## 9. INTEGRATION BETWEEN WAREHOUSE, ORDERS, AND PROCUREMENT

### End-to-End Flow: Order to Delivery

```
CUSTOMER PLACES ORDER
        |
        v
ORDER CONFIRMED (Sales/Operations)
        |
        +-- Is product in stock?
        |       |
        |    YES: Reserve inventory
        |       |       |
        |       |       v
        |       |   PICK LIST GENERATED
        |       |       |
        |       |       v
        |       |   WAREHOUSE PICKS & STAGES
        |       |       |
        |       |       v
        |       |   DELIVERY SCHEDULED
        |       |       |
        |       |       v
        |       |   LOADED & SHIPPED
        |       |       |
        |       |       v
        |       |   DELIVERED & CONFIRMED
        |       |
        |    NO: Trigger procurement
        |       |
        |       v
        |   PO CREATED TO SUPPLIER
        |       |
        |       +-- Drop-ship? ──YES──> Supplier ships to customer
        |       |                       (see Section 2)
        |       |
        |       NO (ship from warehouse)
        |       |
        |       v
        |   SUPPLIER SHIPS TO WAREHOUSE
        |       |
        |       v
        |   WAREHOUSE RECEIVES
        |       |
        |       v
        |   INVENTORY UPDATED (Available)
        |       |
        |       v
        |   RESERVE FOR ORDER
        |       |
        |       v
        |   (Continues to PICK LIST above)
        |
        v
    INVOICE GENERATED (after delivery confirmation)
```

### Integration Points Between Systems

**1. Order Management --> Warehouse (Outbound)**

| Trigger | Data Sent to Warehouse | Warehouse Action |
|---------|----------------------|------------------|
| Order confirmed (stocked items) | Sales order with line items, quantities, required delivery date, customer address, site contact | Reserve inventory; queue for pick list generation |
| Pick list approved | Pick list with items, quantities, locations, lot assignments, delivery sequence | Begin picking |
| Delivery scheduled | Truck assignment, route, delivery time windows | Stage picked materials by truck/route |
| Order changed (quantity, date) | Change notification with revised quantities/dates | Adjust reservation, repick if needed |
| Order cancelled | Cancellation notice | Release reservation, return picked items to stock |

**2. Warehouse --> Order Management (Outbound Feedback)**

| Warehouse Event | Data Sent to Orders | Impact |
|----------------|--------------------|----|
| Pick complete | Confirmed picked quantities (may differ from ordered if short) | Update order with actual quantities, notify sales of any shorts |
| Load complete | Bill of lading, truck details, departure time | Trigger delivery tracking, notify customer of shipment |
| Short pick (insufficient stock) | Short quantity and reason | Sales notifies customer; triggers backorder or re-procurement |
| Delivery confirmed | Proof of delivery (signature, photos, timestamp) | Triggers invoicing |
| Delivery exception | Refusal reason, damage notes, partial receipt | Triggers return/credit process |

**3. Procurement --> Warehouse (Inbound)**

| Trigger | Data Sent to Warehouse | Warehouse Action |
|---------|----------------------|------------------|
| PO placed with ship-to-warehouse | PO details: supplier, products, quantities, expected delivery date, truck type | Schedule receiving dock/yard space |
| Supplier ships (ASN received) | Advance Ship Notice: actual quantities, carrier, tracking, ETA | Prepare receiving crew and equipment |
| PO changed | Revised quantities, dates | Adjust receiving schedule |
| PO cancelled | Cancellation | Remove from expected deliveries |

**4. Warehouse --> Procurement (Inbound Feedback)**

| Warehouse Event | Data Sent to Procurement | Impact |
|----------------|------------------------|----|
| Receipt complete (matches PO) | Received quantities, lot numbers, condition | PO line items marked received; triggers supplier payment process |
| Receipt with discrepancy | Short/over quantities, damage details, photos | Procurement contacts supplier for resolution; credit/debit memo |
| Quality hold | Items placed on hold with reason | Procurement escalates quality issue with supplier |
| Receipt rejected | Rejection reason, full load refused | Procurement arranges return/replacement with supplier |

**5. Warehouse --> Finance**

| Warehouse Event | Financial Impact |
|----------------|-----------------|
| Goods received | Inventory asset increases; accounts payable created |
| Goods shipped | Inventory asset decreases; cost of goods sold recorded |
| Inventory adjustment (cycle count) | Write-up or write-down of inventory value |
| Damage/scrap | Inventory write-off expense |
| Inter-location transfer | No P&L impact; just asset reclass between locations |

### Real-Time vs Batch Integration

| Integration | Recommended Timing | Why |
|-------------|-------------------|-----|
| Order --> Reserve inventory | Real-time (immediate) | Prevent overselling |
| Pick list --> Warehouse | Real-time | Workers need current tasks |
| Receiving --> Available inventory | Real-time | Enable immediate order fulfillment against new stock |
| Delivery confirmed --> Invoice | Real-time or near-real-time | Accelerate cash collection |
| Cycle count adjustments --> Finance | Batch (end of day) | Adjustments should be reviewed before posting |
| Inventory valuation reporting | Batch (end of day/week) | Financial reporting cycle |
| Reorder point alerts | Near-real-time (within 15 min) | Procurement needs timely signals but not instant |

---

## 10. INVENTORY PLANNING AND REORDER POINTS

### Starting Point: ABC Analysis for Building Materials

ABC analysis classifies inventory by value and velocity. For a building materials distributor beginning to stock items:

**Classification:**

| Class | Criteria | Typical % of SKUs | Typical % of Revenue | Management Approach |
|-------|----------|-------------------|---------------------|---------------------|
| **A** | High revenue, high velocity | 10-20% | 70-80% | Tight control, frequent review, higher safety stock, weekly reorder review |
| **B** | Moderate revenue, moderate velocity | 20-30% | 15-20% | Standard control, bi-weekly review, moderate safety stock |
| **C** | Low revenue, low velocity or long-tail | 50-70% | 5-10% | Minimal stock or order-on-demand, monthly review, low/no safety stock |

**Building Materials ABC Examples:**

| Class | Products | Notes |
|-------|----------|-------|
| **A** | Portland cement Type I/II, #4 rebar 20 ft, 2x4x8 SPF, 3/4" plywood, concrete blocks 8x8x16 | Ordered by almost every customer, high volume, high turnover |
| **B** | #3 and #5 rebar, 2x6 and 2x8 lumber, masonry cement, wire mesh, PVC pipe (common sizes), drywall 4x8 | Regularly ordered but lower frequency than A items |
| **C** | Specialty steel sections, imported tiles, specific adhesive types, uncommon pipe fittings, specialty fasteners | Rarely ordered from stock; better to source per-order |

### Reorder Point Formula

```
Reorder Point (ROP) = (Average Daily Demand x Lead Time in Days) + Safety Stock

Where:
  Average Daily Demand = Total units sold in last 90 days / 90
  Lead Time = Days from PO placement to goods available in warehouse
  Safety Stock = Buffer for demand variability and lead time variability
```

**Safety Stock Calculation (King's Formula -- practical for building materials):**

```
Safety Stock = Z x SQRT(LT x SD_demand^2 + D_avg^2 x SD_leadtime^2)

Where:
  Z = Service level factor (1.28 for 90%, 1.65 for 95%, 2.33 for 99%)
  LT = Average lead time in days
  SD_demand = Standard deviation of daily demand
  D_avg = Average daily demand
  SD_leadtime = Standard deviation of lead time in days
```

**Practical Example -- Portland Cement Type I:**

```
  Average daily demand: 10 pallets/day
  Lead time from supplier: 5 days average
  Lead time standard deviation: 2 days
  Daily demand standard deviation: 3 pallets
  Service level target: 95% (Z = 1.65)

  Safety Stock = 1.65 x SQRT(5 x 3^2 + 10^2 x 2^2)
               = 1.65 x SQRT(45 + 400)
               = 1.65 x SQRT(445)
               = 1.65 x 21.1
               = 34.8 --> 35 pallets

  Reorder Point = (10 x 5) + 35 = 85 pallets

  Meaning: When cement inventory drops to 85 pallets, place a new order.
```

### Min/Max Levels

An alternative to reorder-point formulas, especially useful for early-stage distributors without extensive historical data:

```
Minimum Level = Average weekly demand x Lead time in weeks x (1 + Safety Factor)
Maximum Level = Minimum Level + Economic Order Quantity

Safety Factor:
  Reliable supplier (consistent lead time): 0.2-0.3 (20-30% buffer)
  Moderate reliability: 0.3-0.5 (30-50% buffer)
  Unreliable supplier (frequent delays): 0.5-1.0 (50-100% buffer)
```

**When stock hits Minimum, order enough to reach Maximum.**

| Product | Weekly Demand | Lead Time (weeks) | Safety Factor | Min | Max (Min + 2 weeks demand) | Order Qty |
|---------|--------------|-------------------|---------------|-----|---------------------------|-----------|
| Cement Type I | 50 pallets | 1 week | 0.3 | 65 pallets | 165 pallets | 100 pallets |
| #4 Rebar 20 ft | 20 bundles | 2 weeks | 0.5 | 60 bundles | 100 bundles | 40 bundles |
| 2x4x8 SPF | 200 units | 1 week | 0.3 | 260 units | 660 units | 400 units |
| 3/4" Plywood | 100 sheets | 1 week | 0.2 | 120 sheets | 320 sheets | 200 sheets |

### Seasonal Demand Patterns in Building Materials

Building materials have pronounced seasonal patterns that must be factored into inventory planning:

```
CONSTRUCTION SEASONALITY (Northern US):

HIGH DEMAND (Mar-Oct):
  ████████████████████████████████████████  Peak: May-August

LOW DEMAND (Nov-Feb):
  ████████████                              Trough: Dec-January

SEASONAL ADJUSTMENT FACTORS:
  Jan: 0.6x    Feb: 0.7x    Mar: 0.9x
  Apr: 1.1x    May: 1.3x    Jun: 1.3x
  Jul: 1.2x    Aug: 1.2x    Sep: 1.1x
  Oct: 1.0x    Nov: 0.8x    Dec: 0.6x
```

**Seasonal Inventory Strategy:**
- **Pre-season buildup (Feb-Mar):** Increase stock levels 30-50% above normal for A items. Many suppliers offer pre-season booking discounts (5-10%) for early commitment.
- **Peak season (Apr-Sep):** Maintain maximum stock levels. Reorder aggressively. Supplier lead times stretch during peak season -- increase safety stock.
- **Post-season drawdown (Oct-Nov):** Reduce ordering. Let stock levels decrease toward minimums. Do not restock C items.
- **Off-season (Dec-Jan):** Minimum stock levels. Focus on slow-moving inventory clearance. Good time for physical inventory counts and warehouse reorganization.

**Regional Variations:**
- Sun Belt (TX, FL, AZ): Less seasonal variation. Construction runs nearly year-round. Reduce seasonality factors by 50%.
- Coastal: Hurricane season (Jun-Nov) creates surge demand for roofing, plywood, concrete. Pre-position storm-prep materials.
- Northern states: Freeze-thaw cycles affect concrete work. Cement demand drops sharply Nov-Mar.

### Product-Specific Demand Patterns

| Product | Demand Pattern | Planning Implication |
|---------|---------------|---------------------|
| Cement | Follows construction season strongly. Drops 40-60% in winter (northern). | Pre-season buy; mind shelf life (3-6 months) -- do not over-stock before winter |
| Lumber | Seasonal + volatile pricing. Lumber futures fluctuate 20-50% within a year. | May want to stock up when prices dip, even outside peak demand |
| Steel/Rebar | Follows commercial construction starts. Less seasonal than residential. | More stable demand; longer lead times make safety stock important |
| Roofing | Peak after storm events (unpredictable). Steady seasonal pattern otherwise. | Hard to plan for surge; maintain modest safety stock |
| Aggregates | Very seasonal (follows concrete pours). Nearly zero demand when ground is frozen. | Do not over-stock in fall. Aggregates do not expire but tie up yard space. |
| Insulation | Peaks in fall (winterization) and spring (new construction). | Dual-peak pattern; different from most building materials |

### Getting Started with Inventory Planning (Phased Approach)

**Phase 1: Manual Tracking (First 3-6 Months of Stocking)**
- Track demand in a spreadsheet by week for each stocked SKU
- Set min/max levels based on gut feel + the simple formulas above
- Review weekly and adjust
- Goal: Build demand data for better calculations later

**Phase 2: System-Assisted (6-18 Months)**
- Implement reorder point alerts in inventory system
- Calculate safety stock using historical data (now you have 6+ months)
- Run ABC analysis quarterly
- Set service level targets by class (A: 95%, B: 90%, C: 85%)
- Generate weekly replenishment suggestions

**Phase 3: Demand-Driven (18+ Months)**
- Incorporate seasonal adjustment factors into forecasts
- Use project pipeline (known upcoming large orders) to adjust forward demand
- Supplier performance data (actual lead times) feeds into safety stock calculations
- Automated PO generation when reorder points are hit
- Exception-based management (system handles routine reorders; humans handle exceptions)

---

## SUMMARY: THE FULL JOURNEY

```
STAGE 1: PURE BROKER ($0-$5M)
  Inventory: None
  Warehouse: None
  System needs: Order tracking, PO management, drop-ship coordination
  Staff: 0 warehouse, operations coordinator handles logistics

STAGE 2: SELECTIVE STOCKING ($5M-$15M)
  Inventory: 10-30 SKUs, $50K-$200K inventory value
  Warehouse: Rented yard + small covered area
  System needs: Basic inventory tracking (on-hand, reserved), receiving, shipping
  Staff: 1-2 warehouse workers (part-time or shared with delivery)

STAGE 3: WAREHOUSE OPERATIONS ($15M-$50M)
  Inventory: 50-200 SKUs, $200K-$1M inventory value
  Warehouse: 5,000-15,000 sq ft + 1-2 acre yard
  System needs: Full WMS (receiving, putaway, picking, shipping, cycle count),
                lot tracking, multi-zone, mobile app
  Staff: 3-5 warehouse workers + supervisor

STAGE 4: FULL DISTRIBUTION ($50M+)
  Inventory: 200+ SKUs, $1M-$5M+ inventory value
  Warehouse: 15,000-50,000+ sq ft + 3-10 acre yard, possibly multi-location
  System needs: Advanced WMS, demand planning, automated reorder,
                yard management, route optimization
  Staff: 10+ warehouse, warehouse manager, inventory planner
```

### Key Takeaways for System Design

1. **Design for the journey, not just today.** The system should handle drop-ship (virtual inventory) from day one and grow to handle physical warehouse operations without a rewrite.

2. **Inventory states must exist even without a warehouse.** Track "virtual" inventory (on-order, in-transit) for drop-ship orders so ATP calculations and dashboards work consistently.

3. **Building materials require non-standard UOM handling.** The system must handle tons, cubic yards, linear feet, bundles, bags, sheets, and pallets -- often for the same product in different contexts (buy by the ton, sell by the bag).

4. **Lot tracking is not optional.** Cement shelf life and steel traceability make lot tracking a regulatory and liability requirement, not a nice-to-have.

5. **Yard management is as important as warehouse management.** More inventory value may sit in the yard than in the building. The system must handle zone-based outdoor tracking.

6. **The hybrid model persists.** Even at $100M+ revenue, building materials distributors still drop-ship 30-50% of orders (specialty items, large direct-from-mill shipments). The system must always support both fulfillment paths.

7. **Integration is the hard part.** The real complexity is in the handoffs: order confirmed to inventory reserved to pick list to staged to loaded to delivered to invoiced. Each transition must be tracked and any exception must trigger the right alert.

---

## Sources

- [The Rise of Building Material Distributors - Ironspring Ventures](https://ironspring.com/4-the-rise-of-the-building-material-distributors/)
- [Building Material Distributors: The Backbone of Construction Supply Chains - Oreate AI](https://www.oreateai.com/blog/building-material-distributors-the-backbone-of-construction-supply-chains/af2b4d4b7f8ecd3e427ae92030901086)
- [Winning in 2025: How Building Material Suppliers Can Navigate a Changing Market - Simon-Kucher](https://www.simon-kucher.com/en/insights/winning-2025-how-building-material-suppliers-can-navigate-changing-market)
- [Next Normal in Construction Material Distribution - McKinsey](https://www.mckinsey.com/capabilities/operations/our-insights/the-next-normal-in-construction-material-distribution)
- [Benefits of Two-Step Distribution for LBM Dealers - BPI](https://marketing.bpi.build/benefits-of-using-two-step-distribution-for-lumber-and-building-material-dealers/)
- [Building Material Suppliers: Conquer Inventory Chaos - ECI Solutions](https://www.ecisolutions.com/blog/building-supply/10-inventory-management-tips-for-building-material-suppliers/)
- [Building Material Distribution: 2026 Market Update - 555 Capital Advisors](https://www.555capitaladvisors.com/news-blog/2022/feb-healthy-living-market-update-p4ts6-3c3gh-l3543-nfr76-7kmmn)
- [Construction Materials Management in Real Time - StruxHub](https://struxhub.com/blog/construction-materials-management-how-to-track-construction-materials-from-warehouse-to-jobsite-in-real-time/)
- [Construction Material Storage: Tips for an Efficient Laydown Yard - Procore](https://www.procore.com/library/material-storage-construction)
- [How to Optimize Construction Material Storage - NetSuite](https://www.netsuite.com/portal/resource/articles/inventory-management/construction-material-storage.shtml)
- [OSHA 1926.250 - General Requirements for Storage](https://www.osha.gov/laws-regs/regulations/standardnumber/1926/1926.250)
- [Warehousing Building Materials Amid an Economic Boom - WSI](https://www.wsinc.com/blog/warehousing-building-materials/)
- [Inventory Classifications and Statuses: A Complete Guide - Arete Inc](https://www.areteinc.com/blog/inventory-classifications-and-statuses-a-complete-guide/)
- [Inventory Statuses - Microsoft Dynamics 365](https://learn.microsoft.com/en-us/dynamics365/supply-chain/inventory/inventory-statuses)
- [Understanding Allocation Logic - Extensiv](https://help.extensiv.com/3pl-warehouse-manager-inventory-management/understanding-allocation-logic)
- [Mobile Warehouse Management: Features That Actually Matter - Bizowie](https://bizowie.com/mobile-warehouse-management-features-that-actually-matter)
- [Barcode Scanning for Warehouses: Complete Implementation Guide - Bizowie](https://bizowie.com/barcode-scanning-for-warehouses-complete-implementation-guide)
- [NetSuite WMS](https://www.netsuite.com/portal/products/erp/warehouse-fulfillment/wms.shtml)
- [Lumber Yard Management Software Best Practices - Vector](https://www.withvector.com/blog/best-practices-for-implementing-yard-management-systems-in-lumber-storage-facilities/)
- [Epicor LumberTrack](https://www.epicor.com/en-us/products/enterprise-resource-planning-erp/lumbertrack/)
- [Complete Guide to Yard Management Systems - WISER Systems](https://wisersystems.com/blog/complete-guide-to-yard-management-track-everything-in-your-yard-2024/)
- [Yard Management Software: Build vs Buy Guide - CoaxSoft](https://coaxsoft.com/blog/yard-management-software-build-vs-buy-guide)
- [WMS ERP Integration Guide - Finale Inventory](https://www.finaleinventory.com/warehouse-management-system-software/wms-erp-integration)
- [What is a WMS in ERP - Priority Software](https://www.priority-software.com/resources/what-is-wms-in-erp/)
- [Inventory Holding Costs Guide - ShipBob](https://www.shipbob.com/inventory-kpis/holding-costs/)
- [Inventory Carrying Cost Calculator - Fit Small Business](https://fitsmallbusiness.com/inventory-carrying-cost/)
- [Average Warehouse Cost Per Square Foot: U.S. Businesses 2025 - LatestCost](https://latestcost.com/average-warehouse-cost-per-square-foot-u-s-businesses/)
- [Portland Cement Shelf Life and Storage - HPD Consult](https://www.hpdconsult.com/cement-life/)
- [Does Concrete Have a Shelf Life? - GizmoPlans](https://www.gizmoplans.com/does-concrete-have-a-shelf-life/)
- [How to Transition from Dropshipping to Holding Inventory - Supliful](https://supliful.com/blog/transition-from-dropshipping-to-holding-inventory)
- [When Should You Stop Dropshipping and Start Holding Inventory - Inventory Planner](https://www.inventory-planner.com/when-should-you-stop-dropshipping-and-start-fulfilling-in-house/)
- [ABC Analysis in Inventory Management - MRPeasy](https://www.mrpeasy.com/blog/abc-analysis/)
- [Safety Stock Formula Calculation - AbcSupplyChain](https://abcsupplychain.com/safety-stock-formula-calculation/)
- [Reorder Point Formula and Safety Stock - inFlow](https://www.inflowinventory.com/blog/reorder-point-formula-safety-stock/)
- [Inventory Control Using ABC Classification and Min-Max Stock](https://www.e3s-conferences.org/articles/e3sconf/pdf/2023/102/e3sconf_icimece2023_02009.pdf)
- [Forklift Prices: New and Used Cost Guide 2026](https://www.metal-buildings.org/forklift-prices/)
- [U.S. Warehouse Costs Jumped 8.3% from 2022 to 2024 - MDM](https://www.mdm.com/news/research/economic-trends/study-u-s-warehouse-costs-jumped-8-3-from-2022-to-2024/)
- [RFID Outdoor Tracking System - AssetPulse](https://www.assetpulse.com/solutions/outdoor-asset-tracking-system.php)
- [Tracking Solutions for Yard Management - RFiD Discovery](https://www.rfiddiscovery.com/en-us/solutions/yard-outdoor-storage-management)
