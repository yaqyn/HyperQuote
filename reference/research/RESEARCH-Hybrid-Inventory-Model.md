> ⚠️ **REFERENCE DOCUMENT — NOT THE SOURCE OF TRUTH**
> This file was written during the research phase and may contain outdated decisions, US-centric references, or superseded technical choices.
> **Always defer to `essential/RESEARCH.md` for current decisions.**
> Key changes since this file was written: TanStack Start (not Next.js), Capacitor (not Expo), React Aria (not shadcn), Egyptian law (not US FMCSA), EGP (not USD), dual auth pools, no online payments, no mobile wallets, spatial glass UI (not traditional dashboards).

# RESEARCH: Hybrid Inventory Model -- Own Stock + Supplier Marketplace in One System

**Research Date:** 2026-03-29
**Context:** HyperQuote is a B2B building materials distributor in Egypt transitioning from pure marketplace/drop-ship to selectively holding fast-moving inventory (cement, rebar, common lumber) while continuing to source from external suppliers. This research covers the data model, sourcing logic, cost tracking, warehouse operations, and transition mechanics for this hybrid model.

---

## TABLE OF CONTENTS

1. [Hybrid Inventory: Own Stock + Supplier Stock in One System](#1-hybrid-inventory-own-stock--supplier-stock-in-one-system)
2. [Sourcing Priority: Own Stock First or Cheapest First?](#2-sourcing-priority-own-stock-first-or-cheapest-first)
3. [Purchasing Stock to Hold vs Purchasing Per Order](#3-purchasing-stock-to-hold-vs-purchasing-per-order)
4. [Inventory Replenishment for Building Materials in Egypt](#4-inventory-replenishment-for-building-materials-in-egypt)
5. [Cost Tracking: Own Stock vs Sourced Per Deal](#5-cost-tracking-own-stock-vs-sourced-per-deal)
6. [Warehouse Operations for Building Materials in Egypt](#6-warehouse-operations-for-building-materials-in-egypt)
7. [Multi-Base Allocation: Own Stock + Supplier in One Order](#7-multi-base-allocation-own-stock--supplier-in-one-order)
8. [Inventory Valuation for Egyptian Accounting](#8-inventory-valuation-for-egyptian-accounting)
9. [Own Fleet + Own Stock: The Full Delivery Model](#9-own-fleet--own-stock-the-full-delivery-model)
10. [Transition Mechanics: Adding the First Inventory Item](#10-transition-mechanics-adding-the-first-inventory-item)

---

## 1. HYBRID INVENTORY: OWN STOCK + SUPPLIER STOCK IN ONE SYSTEM

### The Core Problem

HyperQuote currently shows customers and sales reps a "Market Availability" view of supplier-published stock. When HyperQuote starts holding its own cement at Base A, the sales rep needs to see a **unified view** that combines:

- Own stock at Base A: 500 bags
- Own stock at Base B: 300 bags
- Supplier X published availability: 2,000 bags
- Supplier Y published availability: 1,500 bags
- **Total available to promise: 4,300 bags**

This is not a trivial display problem. It fundamentally changes the data model.

### How Distribution ERPs Handle This

**Epicor Prophet 21** -- the most mature distribution ERP -- treats this as a multi-source Available-to-Promise (ATP) problem. For any given SKU, the system can show:

- Stock at each owned warehouse (real-time, authoritative)
- Vendor direct-ship availability (pulled from supplier catalogs or entered manually)
- Special-order capability (any item can be sourced per-order from any vendor)

Prophet 21 allows the order entry operator to choose the fulfillment source per line item: own warehouse stock, vendor direct (drop-ship), or special order (buy from supplier, receive at warehouse, then ship to customer). All three options can coexist on the same sales order, even for the same SKU.

**Oracle NetSuite** has a significant limitation here. Once an item record is flagged for "Drop Ship" or "Special Order," it loses the ability to be fulfilled from on-hand inventory. This means NetSuite requires either duplicate item records (one for stocked, one for drop-ship) or custom workarounds using SuiteScript. This is a known pain point documented by implementation partners. HyperQuote's custom system should avoid this architectural mistake.

**SAP S/4HANA** handles this through its Advanced Available-to-Promise (aATP) engine with "Alternative Based Confirmation" (ABC). The system searches multiple sourcing options -- own plants, external vendors, intercompany transfers -- and confirms the best fulfillment path. The 2025 release added "Minimum Consumption Priority" to enforce preferred source preferences.

### The Correct Data Model for HyperQuote

The key insight is that HyperQuote needs TWO distinct inventory visibility layers that merge into one ATP view:

```
LAYER 1: OWN INVENTORY (Authoritative, Real-Time)
  - Source: HyperQuote's warehouse management system
  - Data: on_hand, reserved, allocated, available, damaged, on_hold
  - Accuracy: Exact (HyperQuote controls receiving, counting, shipping)
  - Cost: Known (HyperQuote paid for this stock; WAC is calculated)
  - Lead time: Zero (already in warehouse) or hours (inter-base transfer)

LAYER 2: SUPPLIER MARKETPLACE (Published, Indicative)
  - Source: Supplier portal uploads, WhatsApp catalog updates, manual entry
  - Data: published_available_qty, price, location, last_updated
  - Accuracy: Approximate (supplier controls their own stock; may be stale)
  - Cost: Current supplier price (may change between quote and order)
  - Lead time: 1-7 days (supplier processing + delivery to Base or customer)

MERGED VIEW: TOTAL AVAILABLE TO PROMISE
  - own_available + sum(supplier_published_available)
  - Shown to sales rep with source breakdown
  - Each source tagged with: cost, lead time, confidence level
```

### Database Schema Addition

The existing `inventory` table tracks own stock. The existing `supplier_catalog` or `market_availability` table tracks supplier stock. The merge happens at the **application layer**, not in a single table.

```sql
-- New: Sourcing options view (materialized or computed at query time)
CREATE VIEW v_item_sourcing_options AS
SELECT
  p.product_id,
  p.product_name,
  -- Own stock sources
  'OWN_STOCK' as source_type,
  w.warehouse_id,
  w.warehouse_name,
  inv.available_qty,
  inv.unit_cost_wac as cost_per_unit,
  0 as lead_time_days,
  1.0 as confidence,  -- 100% confidence in own stock
  NULL as supplier_id
FROM products p
JOIN inventory inv ON inv.product_id = p.product_id
JOIN warehouses w ON w.warehouse_id = inv.warehouse_id
WHERE inv.available_qty > 0

UNION ALL

SELECT
  p.product_id,
  p.product_name,
  -- Supplier sources
  'SUPPLIER_STOCK' as source_type,
  NULL as warehouse_id,
  s.supplier_name as warehouse_name,
  sa.published_qty as available_qty,
  sa.unit_price as cost_per_unit,
  s.avg_lead_time_days as lead_time_days,
  CASE
    WHEN sa.last_updated > NOW() - INTERVAL '4 hours' THEN 0.95
    WHEN sa.last_updated > NOW() - INTERVAL '24 hours' THEN 0.80
    WHEN sa.last_updated > NOW() - INTERVAL '72 hours' THEN 0.50
    ELSE 0.30  -- stale data, low confidence
  END as confidence,
  s.supplier_id
FROM products p
JOIN supplier_availability sa ON sa.product_id = p.product_id
JOIN suppliers s ON s.supplier_id = sa.supplier_id
WHERE sa.published_qty > 0;
```

### What the Sales Rep Sees

The sales rep's quoting screen should show a unified product availability panel:

```
┌─────────────────────────────────────────────────────────────┐
│  Portland Cement Type I  (50 kg bag)                        │
│                                                             │
│  YOUR STOCK                                                 │
│  ├── Base A (10th of Ramadan):  500 bags  @ EGP 82/bag     │
│  │   ✓ Available now  │  Cost: known  │  Margin: 22%       │
│  ├── Base B (6th of October):   300 bags  @ EGP 82/bag     │
│  │   ✓ Available now  │  Cost: known  │  Margin: 22%       │
│  │                                                          │
│  SUPPLIER STOCK                                             │
│  ├── Al-Arish Cement (supplier): 2,000 bags @ EGP 78/bag   │
│  │   ⏱ 2-3 days lead  │  Updated: 2h ago  │  Margin: 18%  │
│  ├── Sinai Cement (supplier):    1,500 bags @ EGP 80/bag   │
│  │   ⏱ 3-5 days lead  │  Updated: 6h ago  │  Margin: 16%  │
│  │                                                          │
│  TOTAL AVAILABLE:  4,300 bags                               │
│  ──────────────────────────────────────────────────────────  │
│  System recommendation: Fulfill from own stock first (800)  │
│  Then source remaining 200 from Al-Arish Cement             │
│  Blended margin: 21.2%                                      │
└─────────────────────────────────────────────────────────────┘
```

**Key UX principles:**
- Own stock shown FIRST and visually distinguished (green indicator, "YOUR STOCK" header)
- Supplier stock shown with staleness indicator and confidence signal
- Margin calculated and shown in real-time per source
- System auto-recommends a fulfillment plan (see Section 2 for logic)
- Sales rep can override by clicking to change source allocation

---

## 2. SOURCING PRIORITY: OWN STOCK FIRST OR CHEAPEST FIRST?

### Industry Practice

The overwhelming industry standard for distributors who hold inventory is: **own stock first, always**, unless there is a compelling exception. This is not just about margin -- it is about operational control, cash flow, and business model integrity.

### Why Own Stock First

| Factor | Own Stock Advantage | Explanation |
|--------|-------------------|-------------|
| **Margin** | Higher | You bought at bulk/volume price; your cost basis is lower than per-order sourcing. Typical margin uplift: 5-10 percentage points over drop-ship. |
| **Speed** | Immediate | Stock is at your warehouse. No supplier processing time, no supplier logistics. Customer gets it today or tomorrow. |
| **Reliability** | 100% | You physically have it. No risk of supplier stock-out, supplier delay, supplier quality variance. |
| **Capital recovery** | Critical | You already spent money buying this inventory. Every day it sits unsold costs you 15-30% annually in carrying cost. Selling own stock recovers capital. |
| **Customer experience** | Consistent | Your quality control, your delivery note, your truck, your timeline. No supplier variability. |
| **Inventory aging** | Risk reduction | Cement has 3-6 month shelf life. Every unit of cement sold from own stock before expiry avoids a write-off. |

### The Exception Cases

| Exception | When to Source from Supplier Instead | Example |
|-----------|--------------------------------------|---------|
| **Customer location** | Customer site is much closer to supplier than to your warehouse; freight savings exceed margin difference | Customer in Aswan, your stock in 10th of Ramadan, supplier has stock in Aswan |
| **Quantity exceeds own stock** | Order for 5,000 bags, you have 500. Source 500 from own stock, 4,500 from supplier. | Standard split-sourcing scenario |
| **Spec mismatch** | Customer needs Type V cement, you stock Type I only | Different product, not really "same item" |
| **Strategic reserve** | You want to keep safety stock for a VIP customer's upcoming order | Rare; requires manual override with manager approval |
| **Price inversion** | Supplier is offering a promotional price below your WAC (rare but happens during oversupply) | Supplier dumping stock; you buy from them and keep your stock for later |

### The Sourcing Priority Algorithm for HyperQuote

```
FUNCTION determine_sourcing(product_id, quantity_needed, customer_id, delivery_location):

  sources = []

  -- Step 1: Check own stock at all bases, sorted by proximity to delivery
  own_stock = get_own_stock(product_id, sorted_by=proximity(delivery_location))
  FOR EACH base IN own_stock:
    IF base.available_qty > 0:
      allocate = MIN(base.available_qty, quantity_remaining)
      sources.add({
        type: 'OWN_STOCK',
        warehouse: base,
        qty: allocate,
        cost: base.wac_cost,
        lead_time: calculate_delivery_time(base, delivery_location),
        priority: 1
      })
      quantity_remaining -= allocate
      IF quantity_remaining <= 0: BREAK

  -- Step 2: If still need more, check supplier stock
  IF quantity_remaining > 0:
    supplier_stock = get_supplier_stock(product_id,
      sorted_by=[ lead_time ASC, confidence DESC, cost ASC ])
    FOR EACH supplier IN supplier_stock:
      IF supplier.available_qty > 0:
        allocate = MIN(supplier.available_qty, quantity_remaining)
        sources.add({
          type: 'SUPPLIER_STOCK',
          supplier: supplier,
          qty: allocate,
          cost: supplier.current_price,
          lead_time: supplier.avg_lead_time,
          priority: 2,
          fulfillment: determine_fulfillment(supplier, delivery_location)
            -- 'DROP_SHIP' if supplier delivers direct
            -- 'VIA_WAREHOUSE' if supplier ships to Base, then Base delivers
        })
        quantity_remaining -= allocate
        IF quantity_remaining <= 0: BREAK

  -- Step 3: If still cannot fill, flag as partially sourceable
  IF quantity_remaining > 0:
    sources.add({
      type: 'UNFULFILLABLE',
      qty: quantity_remaining,
      suggestion: 'Contact procurement for special sourcing'
    })

  RETURN sources
```

### Configuration: Making Priority Rules Adjustable

The sourcing priority should be configurable at the system level, not hard-coded:

```
sourcing_rules:
  default_priority: "OWN_STOCK_FIRST"

  rules:
    - name: "Own stock first"
      condition: "always"
      priority: 1
      source: "OWN_STOCK"
      sort_by: ["proximity_to_delivery", "oldest_lot_first"]  # FEFO for cement

    - name: "Supplier drop-ship"
      condition: "own_stock_insufficient OR lead_time_advantage > 2_days"
      priority: 2
      source: "SUPPLIER_STOCK"
      fulfillment: "DROP_SHIP"
      sort_by: ["lead_time", "confidence", "cost"]

    - name: "Supplier via warehouse"
      condition: "customer_requires_consolidated_delivery"
      priority: 3
      source: "SUPPLIER_STOCK"
      fulfillment: "VIA_WAREHOUSE"
      sort_by: ["cost", "lead_time"]

  overrides:
    - role: "sales_manager"
      can_override: true
      requires_reason: true
    - role: "sales_rep"
      can_override: false
```

---

## 3. PURCHASING STOCK TO HOLD VS PURCHASING PER ORDER

### Two Fundamentally Different Purchase Orders

When HyperQuote starts holding inventory, there will be TWO types of purchase orders in the system. They look similar on paper but have completely different triggers, tracking, and accounting treatment.

### Type 1: Stock Purchase Order (Speculative / Replenishment)

```
STOCK PO CHARACTERISTICS:
  Trigger:        Reorder point hit, or manual decision to stock up
  Linked to:      No specific customer or sales order
  Ship to:        HyperQuote's warehouse (Base A, B, or C)
  Purpose:        Replenish inventory for general availability
  Cost tracking:  Becomes part of WAC when received
  Risk:           HyperQuote bears the risk (unsold = carrying cost)
  Approval:       Procurement Manager or CEO (spending company capital)
  Frequency:      Recurring, based on demand patterns

  Example:
    PO-2026-0451
    To: Suez Cement Company
    Ship to: Base A, 10th of Ramadan
    Item: Portland Cement Type I, 50 kg bag
    Qty: 1,000 bags (about 2 weeks of expected demand)
    Price: EGP 78/bag (volume price for 1,000+)
    Reason: Reorder point reached (stock at 85 bags, ROP = 85)
    Linked SO: NONE
```

### Type 2: Customer-Linked Purchase Order (Back-to-Back)

```
CUSTOMER-LINKED PO CHARACTERISTICS:
  Trigger:        Customer order confirmed, item not in stock (or stock insufficient)
  Linked to:      Specific sales order and line item
  Ship to:        Customer site (drop-ship) OR HyperQuote warehouse (cross-dock)
  Purpose:        Fulfill a specific customer commitment
  Cost tracking:  Cost assigned directly to the sales order line
  Risk:           Lower risk -- customer is committed (but cancellation risk exists)
  Approval:       Operations Manager (standard) or auto-approved if within margin rules
  Frequency:      Per-order, as needed

  Example:
    PO-2026-0452
    To: Al-Arish Cement
    Ship to: Customer site (Henderson Construction, New Cairo)
    Item: Portland Cement Type I, 50 kg bag
    Qty: 3,000 bags
    Price: EGP 80/bag (standard price for this quantity)
    Reason: Customer order SO-2026-1234
    Linked SO: SO-2026-1234, Line 1
    Delivery: Drop-ship direct to customer
```

### Database Tracking Differences

```sql
-- Purchase order table needs these fields:
CREATE TABLE purchase_orders (
  po_id UUID PRIMARY KEY,
  po_number TEXT NOT NULL,
  supplier_id UUID REFERENCES suppliers(supplier_id),

  -- THE KEY DISTINCTION:
  po_type TEXT NOT NULL CHECK (po_type IN ('STOCK', 'CUSTOMER_LINKED')),

  -- For CUSTOMER_LINKED POs only:
  linked_sales_order_id UUID REFERENCES sales_orders(order_id),
  linked_sales_order_line_id UUID REFERENCES sales_order_lines(line_id),

  -- For STOCK POs only:
  reorder_trigger TEXT,  -- 'REORDER_POINT', 'MANUAL', 'SEASONAL_BUILDUP', 'PRICE_OPPORTUNITY'
  target_warehouse_id UUID REFERENCES warehouses(warehouse_id),

  -- Common fields:
  ship_to_type TEXT CHECK (ship_to_type IN ('WAREHOUSE', 'CUSTOMER_SITE')),
  ship_to_address JSONB,
  total_amount DECIMAL(15,2),
  status TEXT,
  created_at TIMESTAMPTZ,
  approved_by UUID,
  approved_at TIMESTAMPTZ
);
```

### What Triggers a Stock Purchase (Speculative Purchase)?

| Trigger | Description | System Action |
|---------|-------------|---------------|
| **Reorder point** | Available qty drops below calculated ROP | Auto-generate suggested PO; route to procurement for approval |
| **Min/max breach** | Available qty drops below minimum level | Same as above |
| **Seasonal pre-buy** | Approaching high-demand season (Egyptian construction peak: March-October) | Procurement reviews seasonal forecast, manually increases stock levels |
| **Price opportunity** | Supplier offers temporary discount or market price dips | Procurement decides to buy ahead of demand to lock in lower cost |
| **New item stocking decision** | Management decides to start stocking a new SKU | First-ever stock PO for this item (see Section 10) |
| **Customer pipeline** | Large project in quoting stage signals upcoming demand | Procurement pre-positions stock (risky -- only for high-probability deals) |

### Hybrid Orders: Part Own Stock, Part Customer-Linked PO

A single customer order can trigger BOTH types of sourcing:

```
Sales Order SO-2026-1234:
  Line 1: Cement Type I, 5,000 bags
    - Source 1: Own stock at Base A, 500 bags (from existing inventory)
    - Source 2: Customer-linked PO to Al-Arish Cement, 4,500 bags (drop-ship)

  Line 2: #4 Rebar 12m, 200 bundles
    - Source 1: Own stock at Base B, 200 bundles (fully from own stock)

  Line 3: Specialty adhesive, 50 drums
    - Source 1: Customer-linked PO to Chemical Corp, 50 drums (drop-ship)
    - (This item is not stocked; always sourced per-order)
```

The system must track each sales order line's fulfillment sources independently, because:
- Cost per unit differs between sources (affects margin calculation)
- Lead times differ (affects delivery scheduling)
- Fulfillment responsibility differs (warehouse pick vs supplier coordination)
- Inventory impact differs (own stock decreases on-hand; supplier stock has no on-hand impact)

---

## 4. INVENTORY REPLENISHMENT FOR BUILDING MATERIALS IN EGYPT

### Egyptian Market Specifics

Egypt's building materials market has unique characteristics that affect inventory planning:

**Price Volatility (2024-2025):**
- Cement prices jumped from approximately EGP 800/ton to over EGP 5,000/ton at the crisis peak (April-May 2024), then stabilized around EGP 3,820-4,000/ton by August 2025
- Steel/rebar prices show persistent pressure with ongoing fluctuations
- The Egyptian pound depreciation (complete exchange rate liberalization in 2024) makes imported items particularly volatile
- Energy cost reforms (fuel subsidy removal, rising natural gas tariffs) directly hit cement producers, causing periodic price hikes

**Construction Seasonality in Egypt:**
Unlike northern climates, Egypt's construction season is less weather-dependent. However, there are patterns:

```
EGYPT CONSTRUCTION SEASONALITY:

Peak Demand (September-June):
  Construction runs nearly year-round due to mild climate.
  Peak months: March-May and September-November
  (Post-Ramadan surge if Ramadan falls in quiet period)

Reduced Demand (July-August):
  Extreme heat (40-45C) slows outdoor construction.
  Worker productivity drops. Many laborers return to villages.
  Demand drops approximately 15-25% from peak.

Ramadan Effect (floating):
  Construction slows during Ramadan (workers fasting in heat).
  Demand drops 10-20% during Ramadan, then surges immediately after Eid.

Government Project Cycles:
  Fiscal year ends June 30. Government project spending often spikes
  in Q3/Q4 of fiscal year (Jan-June) as budgets must be spent.
  New Administrative Capital projects drive bulk demand.
```

**Seasonal Adjustment Factors for Egypt:**

| Month | Factor | Notes |
|-------|--------|-------|
| January | 0.95x | Mild winter; construction active |
| February | 1.00x | Normal |
| March | 1.10x | Pre-summer push |
| April | 1.10x | Active season |
| May | 1.05x | Heat beginning |
| June | 0.95x | Government fiscal year-end spending boost offsets heat |
| July | 0.80x | Peak heat, slowdown |
| August | 0.80x | Peak heat, many workers on leave |
| September | 1.05x | Recovery begins |
| October | 1.10x | Active season resumes |
| November | 1.10x | Peak fall season |
| December | 1.00x | Normal |

### ABC Classification for Egyptian Building Materials Market

| Class | Products in Egyptian Market | Revenue Share | Stocking Strategy |
|-------|---------------------------|---------------|-------------------|
| **A** | Portland cement (Ordinary, Resistant), #4 rebar (12mm) 12m, #5 rebar (16mm) 12m, concrete blocks (standard sizes), sand (building grade), aggregate (crushed stone) | 70-80% | Always in stock. Weekly review. Safety stock = 2 weeks demand. Reorder point formula. |
| **B** | #3 rebar (10mm), #6 rebar (20mm), wire mesh, PVC pipe (common sizes: 4", 6"), plywood (standard sheets), white cement, waterproofing membranes, common tiles | 15-20% | Stock selectively. Bi-weekly review. Safety stock = 1 week demand. Min/max approach. |
| **C** | Specialty steel sections (I-beams, channels), imported fixtures, specialty adhesives, uncommon pipe sizes, finishing materials, marble, granite | 5-10% | Do NOT stock. Source per order. Monthly review of classification. |

### Reorder Parameters for Egyptian Market

The standard reorder point formula applies, but with Egyptian-specific adjustments:

```
ROP_egypt = (Avg_Daily_Demand x Lead_Time) + Safety_Stock + Currency_Buffer

Where:
  Lead_Time includes:
    - Supplier processing (1-2 days for domestic cement/rebar)
    - Transport to warehouse (1-3 days depending on distance)
    - Receiving and putaway (0.5 day)
    - TOTAL: typically 2-5 days for domestic suppliers

  Safety_Stock is HIGHER than international norms because:
    - Supplier reliability in Egypt is lower (frequent delays)
    - Transport disruptions (fuel shortages have occurred)
    - Ramadan slowdowns at supplier end
    - Recommended: 50-100% safety factor for Egyptian suppliers
      (vs 20-30% in stable markets)

  Currency_Buffer (new concept for Egypt):
    - If item has imported components, add 5-10% buffer qty
    - Rationale: EGP depreciation can cause sudden price spikes
    - Better to have slightly more stock at today's price than
      to buy at tomorrow's higher price
```

**Concrete Example -- Portland Cement Type I at Base A (10th of Ramadan):**

```
Given:
  Average daily demand: 80 bags/day (based on last 90 days)
  Supplier lead time: 3 days (Suez Cement to 10th of Ramadan)
  Lead time variability: +/- 1 day
  Demand variability: +/- 25 bags/day
  Service level target: 95% (Z = 1.65)
  Egyptian reliability factor: 1.5x (applied to safety stock)

Safety Stock = 1.65 x SQRT(3 x 25^2 + 80^2 x 1^2)
             = 1.65 x SQRT(1,875 + 6,400)
             = 1.65 x SQRT(8,275)
             = 1.65 x 91
             = 150 bags

Apply Egyptian reliability factor: 150 x 1.5 = 225 bags

ROP = (80 x 3) + 225 = 465 bags

Minimum Level: 465 bags
Maximum Level: 465 + (80 x 14) = 1,585 bags (2 weeks demand above min)
Order Quantity: 1,120 bags (max - min)

Meaning: When cement drops to 465 bags, place an order for ~1,120 bags.
At 80 bags/day consumption, this gives about 14 more days of stock.
```

### Price Volatility Buffer Strategy

For the Egyptian market specifically, HyperQuote should implement a **price-triggered buy** in addition to demand-triggered reorders:

```
RULE: If current supplier price is 10%+ below 30-day moving average price,
      AND own stock is below Maximum Level,
      THEN generate opportunity-buy alert to Procurement Manager.

RULE: If EGP depreciates more than 5% in a week against USD,
      AND any stocked items have imported components,
      THEN generate pre-emptive restock alert for all affected items.

RULE: If supplier announces price increase effective in X days,
      AND own stock is below Maximum Level,
      THEN generate pre-increase buy alert with cost-benefit calculation:
        Buy-ahead savings = (new_price - current_price) x estimated_demand_before_next_ROP
        vs
        Additional carrying cost = current_price x carrying_rate x days_of_extra_stock / 365
```

---

## 5. COST TRACKING: OWN STOCK VS SOURCED PER DEAL

### The Fundamental Challenge

The same item -- Portland Cement Type I -- can have TWO completely different costs depending on how it is sourced:

```
Source 1: OWN STOCK
  Original purchase price: EGP 78/bag (bought in bulk 3 weeks ago)
  Freight-in allocated: EGP 2/bag
  Landed cost: EGP 80/bag
  Current WAC: EGP 81/bag (blended with earlier purchases)

Source 2: SUPPLIER SOURCED (per this order)
  Supplier quoted price: EGP 85/bag (current market, smaller qty)
  Supplier freight to customer: EGP 3/bag (drop-ship)
  Landed cost: EGP 88/bag
```

The customer is ordering 1,000 bags. How do you quote them?

### The Correct Approach: Source-Aware Quoting

The system must calculate margin PER SOURCE and show a blended margin to the sales rep:

```
Customer order: 1,000 bags cement
Sourcing plan:
  - 500 bags from own stock (Base A):  cost = EGP 81/bag WAC
  - 500 bags from Supplier X:          cost = EGP 88/bag

If quoting at EGP 100/bag to customer:
  Own stock portion:  500 x (100 - 81) = EGP 9,500 margin (23.5%)
  Supplier portion:   500 x (100 - 88) = EGP 6,000 margin (13.6%)
  BLENDED MARGIN:     EGP 15,500 / EGP 100,000 = 15.5%

If quoting at EGP 105/bag to customer:
  Own stock portion:  500 x (105 - 81) = EGP 12,000 margin (22.9%)
  Supplier portion:   500 x (105 - 88) = EGP 8,500 margin (16.2%)
  BLENDED MARGIN:     EGP 20,500 / EGP 105,000 = 19.5%
```

### Cost Basis Rules

| Scenario | Cost Used for Margin Calculation | Cost Used for COGS (Accounting) |
|----------|--------------------------------|--------------------------------|
| Fulfilled from own stock | WAC at time of sale | WAC at time of sale |
| Fulfilled from supplier (drop-ship) | Supplier quoted price + freight | Supplier invoice price + freight |
| Fulfilled from supplier via warehouse (cross-dock) | Supplier quoted price + freight-in + handling | Supplier invoice price + freight-in |
| Mixed fulfillment (own + supplier) | Blended: weighted by quantity from each source | Each source tracked separately in COGS journal |

### Weighted Average Cost (WAC) Mechanics

WAC recalculates every time new stock is received:

```
BEFORE RECEIPT:
  On-hand: 400 bags at WAC EGP 80/bag
  Total value: EGP 32,000

NEW RECEIPT:
  Received: 600 bags at EGP 85/bag (price went up)
  Freight-in: EGP 1,200 (EGP 2/bag)
  Landed cost: EGP 87/bag
  Total receipt value: EGP 52,200

NEW WAC:
  Total inventory value: 32,000 + 52,200 = EGP 84,200
  Total units: 400 + 600 = 1,000
  New WAC: EGP 84,200 / 1,000 = EGP 84.20/bag

IMPORTANT: WAC only applies to OWN STOCK.
Supplier-sourced items for a specific order use ACTUAL COST from that supplier PO.
```

### The Quote-to-Margin Flow

```
QUOTING FLOW:

1. Sales rep creates quote for 1,000 bags cement
2. System runs sourcing algorithm (Section 2):
   - Own stock: 500 available at Base A (cost = WAC EGP 84.20)
   - Supplier X: 500 available at EGP 88 (+ EGP 3 freight = EGP 91)
3. System calculates:
   - Blended cost: (500 x 84.20 + 500 x 91) / 1000 = EGP 87.60/bag
   - Minimum price at 15% floor margin: EGP 87.60 / (1 - 0.15) = EGP 103.06/bag
   - Target price at 20% margin: EGP 87.60 / (1 - 0.20) = EGP 109.50/bag
4. Sales rep sees:
   - Blended cost: EGP 87.60
   - Floor price (15%): EGP 103.06
   - Target price (20%): EGP 109.50
   - Customer's last price: EGP 105/bag
5. Sales rep quotes EGP 107/bag
6. System records: blended margin = 18.1%
   - Own stock margin = 27.1%
   - Supplier margin = 17.6%
```

### What Happens if Supplier Price Changes Between Quote and Order?

This is a real risk in the Egyptian market with EGP volatility:

```
PRICE LOCK RULES:

1. Own stock cost: LOCKED at current WAC when quote is created.
   (You already own it; cost won't change)

2. Supplier cost: NOT LOCKED unless supplier provides a firm quote.
   Options:
   a. Quote includes expiry: "This quote valid for 48 hours"
   b. Quote includes price adjustment clause: "Final price per supplier
      confirmation at time of order"
   c. Lock supplier price via a supplier reservation (if supported)

3. If supplier price increases before customer confirms:
   - System flags the affected quote lines
   - Recalculates margin with new supplier cost
   - If margin drops below floor: alert sales manager
   - Sales rep may need to requote the customer
```

---

## 6. WAREHOUSE OPERATIONS FOR BUILDING MATERIALS IN EGYPT

### Egyptian-Specific Warehouse Considerations

**Location Selection:**

| Industrial Zone | Rent (EGP/sqm/month) | Advantages | Disadvantages |
|----------------|----------------------|------------|---------------|
| 10th of Ramadan City | 60-100 EGP | Near cement factories (Suez, Sinai), good road to Cairo, large plots available, tax incentives | Far from west Cairo customers |
| 6th of October City | 80-120 EGP | Near west Cairo development, Ring Road access, growing industrial base | Higher rent, limited very large plots |
| Badr City | 50-80 EGP | Lowest cost, near new administrative capital, developing infrastructure | Less developed, fewer services nearby |
| Obour City | 70-100 EGP | Close to Cairo, good transport links | Smaller plots, more congested |
| Sadat City | 40-70 EGP | Cheapest, large plots | Far from Cairo, limited labor pool |

**Recommended first warehouse location:** 10th of Ramadan City, because:
- Closest to cement manufacturers (Suez Cement, Sinai Cement, Arabian Cement)
- On the Cairo-Ismailia highway corridor
- Large industrial plots available (can start with small plot and expand)
- Lower rents than 6th of October
- Good access to eastern Cairo and New Cairo construction projects
- Near new administrative capital (Wedian area)

**Typical first facility for Egyptian building materials:**

```
COST ESTIMATE (EGP, monthly, 2025-2026 prices):

  Covered warehouse (500 sqm):           EGP 40,000 - 50,000
  Open yard (1,000 sqm):                 EGP 15,000 - 25,000
  Covered shed for lumber/sheets (200 sqm): EGP 12,000 - 18,000
  Utilities (electricity, water):        EGP 3,000 - 5,000
  Security guard (24/7, 2 shifts):       EGP 8,000 - 12,000
  Forklift (3-ton diesel, rented):       EGP 15,000 - 20,000
  2 warehouse workers:                   EGP 14,000 - 20,000
  Warehouse supervisor:                  EGP 10,000 - 15,000
  Insurance:                             EGP 5,000 - 8,000
  Miscellaneous (pallets, labels, etc.): EGP 3,000 - 5,000
  ──────────────────────────────────────────────────────────
  TOTAL MONTHLY:                         EGP 125,000 - 178,000
                                         (approx. $2,500 - $3,500 at 50 EGP/$)
```

### Material-Specific Storage in Egyptian Climate

**Cement (the first item to stock):**
- MUST be stored indoors or under waterproof cover -- Egypt's humidity near the coast and occasional rain will ruin cement
- Store on raised pallets (minimum 15 cm off ground) to prevent moisture wicking
- Stack pallets maximum 10 high (42 bags per pallet = 420 bags per stack of 10)
- FIFO/FEFO is critical: shelf life 3 months in Egyptian heat (shorter than 6 months in temperate climates due to heat accelerating hydration)
- Manufacture date must be checked at receiving -- reject if older than 1 month at receipt
- Temperature in covered warehouse can reach 45C+ in summer; this accelerates cement degradation
- Ventilation in cement storage area is essential

**Rebar/Steel:**
- Can be stored outdoors in Egypt's dry climate (less rust risk than humid climates)
- Still use timber dunnage (wooden supports) to keep bundles off the ground
- Egypt's standard rebar lengths: 12m (most common), also 6m and 9m
- Bundles weigh 2-3 tons each; require 5-ton minimum forklift or overhead crane
- Tag each bundle with heat number and supplier lot for traceability
- Sort by diameter: 10mm, 12mm, 16mm, 20mm, 25mm are common sizes
- Rebar does not expire but surface rust increases over months; first-in-first-out still preferred

**Plywood/Sheet Goods:**
- Must be covered (rain, dew, and direct sun all cause warping)
- Store flat on level surface; if stored at angle, sheets will bow permanently
- Egyptian market uses primarily 18mm plywood (construction formwork) and 12mm (general use)
- Standard sheet size: 1.22m x 2.44m (4x8 feet)
- Covered shed with roof and open sides provides adequate protection in Egyptian climate

**Aggregates (Sand, Gravel):**
- Stored in open bins/bays in the yard
- Requires retaining walls between different aggregate types to prevent mixing
- Egyptian building sand grades: fine (plaster), medium (general), coarse (concrete)
- Sold by ton; truck scale needed for receiving and dispatching
- Dust and wind are issues in Egyptian desert environment; consider windbreak barriers

### Equipment Needed

| Equipment | Specification for Egyptian Market | Purchase Cost (EGP) | Monthly Rental (EGP) |
|-----------|----------------------------------|--------------------|--------------------|
| Diesel forklift (3 ton) | Minimum for cement pallets. Brands: Toyota, Hyster, TCM (all available in Egypt) | 400,000 - 700,000 | 15,000 - 20,000 |
| Diesel forklift (5 ton) | Required for rebar bundles. Longer forks for pallets. | 600,000 - 1,000,000 | 20,000 - 30,000 |
| Truck scale (weighbridge) | 60-ton capacity, 12m platform. Required for aggregates. | 800,000 - 1,500,000 (installed) | N/A (must buy) |
| Pallet jack (manual) | 2.5 ton. For indoor use on smooth floor. | 15,000 - 25,000 | N/A |
| Label printer | Zebra or equivalent. For internal barcode labels at receiving. | 15,000 - 30,000 | N/A |
| Rugged tablets | For warehouse workers. Samsung Active Tab or similar. | 8,000 - 15,000 each | N/A |
| Strapping machine (manual) | For securing loads. Steel strapping for rebar, plastic for cement. | 5,000 - 15,000 | N/A |

### Staffing Model

| Role | Count | Monthly Salary (EGP, 2025-2026) | Responsibilities |
|------|-------|-------------------------------|-----------------|
| Warehouse Supervisor | 1 | 10,000 - 15,000 | Overall operations, receiving sign-off, inventory accuracy, worker supervision |
| Forklift Operator | 1-2 | 7,000 - 10,000 | All forklift operations: receiving, putaway, picking, loading |
| General Worker | 1-2 | 5,000 - 7,000 | Counting, labeling, housekeeping, assist with loading |
| Security Guard | 2 (shifts) | 4,000 - 6,000 each | Gate control, 24/7 coverage, truck check-in |

**Note on Egyptian labor law:**
- Social insurance contribution required (employer pays ~18.75% of salary)
- Workers get 21 days annual leave (30 days after 10 years)
- Overtime: 135% for day overtime, 170% for night overtime
- Minimum wage: EGP 6,000/month (as of 2025)
- Ramadan: Workers may have reduced productivity; some companies offer shorter hours

---

## 7. MULTI-BASE ALLOCATION: OWN STOCK + SUPPLIER IN ONE ORDER

### The Mixed Fulfillment Scenario

When Tarek (operations manager) looks at an order for 3,000 bags of cement, he might see:

```
Order SO-2026-1234: Henderson Construction
  Item: Portland Cement Type I, 50 kg bags
  Qty: 3,000 bags
  Delivery to: New Cairo project site

SOURCING OPTIONS (system-suggested):
  ┌──────────────────────────────────────────────────────┐
  │ Source              │ Qty   │ Cost    │ Lead  │ Type │
  ├──────────────────────────────────────────────────────┤
  │ Base A (own stock)  │ 500   │ EGP 81  │ Today │ PICK │
  │ Base B (own stock)  │ 300   │ EGP 81  │ Today │ PICK │
  │ Al-Arish (supplier) │ 2,200 │ EGP 85  │ 2 day │ DROP │
  ├──────────────────────────────────────────────────────┤
  │ TOTAL               │ 3,000 │         │       │      │
  │ Blended cost/bag    │       │ EGP 83.93│      │      │
  │ At EGP 100/bag      │       │ Margin: 16.1%  │      │
  └──────────────────────────────────────────────────────┘
```

### How This Works in the Order Flow

```
STEP 1: ORDER CONFIRMATION
  Sales confirms order SO-2026-1234
  System auto-suggests sourcing plan (above)
  Tarek reviews and approves (or adjusts)

STEP 2: SYSTEM CREATES FULFILLMENT RECORDS
  The single sales order spawns THREE fulfillment records:

  Fulfillment #1 (Own Stock - Base A):
    Type: WAREHOUSE_PICK
    Warehouse: Base A
    Qty: 500 bags
    Status: RESERVED → PICK_LIST_GENERATED
    Cost basis: WAC from Base A inventory
    Delivery: HyperQuote truck from Base A

  Fulfillment #2 (Own Stock - Base B):
    Type: WAREHOUSE_PICK
    Warehouse: Base B
    Qty: 300 bags
    Status: RESERVED → PICK_LIST_GENERATED
    Cost basis: WAC from Base B inventory
    Delivery: HyperQuote truck from Base B

  Fulfillment #3 (Supplier Drop-Ship):
    Type: DROP_SHIP
    Supplier: Al-Arish Cement
    Qty: 2,200 bags
    Status: PO_CREATED → PO_SENT_TO_SUPPLIER
    Cost basis: Supplier quoted price
    Delivery: Supplier truck direct to customer site
    Customer-linked PO: PO-2026-0452

STEP 3: PARALLEL EXECUTION
  - Base A: Pick 500 bags, stage for loading, assign driver
  - Base B: Pick 300 bags, stage for loading, assign driver
  - Supplier: PO sent, supplier confirms ship date

  All three can happen simultaneously.

STEP 4: DELIVERY COORDINATION
  Tarek coordinates delivery timing:
  - Base A truck arrives at customer site: 10:00 AM Tuesday
  - Base B truck arrives at customer site: 11:30 AM Tuesday
  - Supplier truck arrives at customer site: 2:00 PM Wednesday

  Customer is informed of the schedule:
  "3,000 bags total. 800 arriving Tuesday, 2,200 arriving Wednesday."

STEP 5: COMPLETION TRACKING
  Order status: PARTIALLY_FULFILLED (800/3000 after Tuesday)
  Order status: FULFILLED (3000/3000 after Wednesday)
  Each fulfillment record tracks independently.
```

### Data Model for Mixed Fulfillment

```sql
-- Fulfillment records: one per source per order line
CREATE TABLE order_fulfillments (
  fulfillment_id UUID PRIMARY KEY,
  sales_order_id UUID REFERENCES sales_orders(order_id),
  sales_order_line_id UUID REFERENCES sales_order_lines(line_id),

  -- Source type determines which fields are relevant
  source_type TEXT NOT NULL CHECK (source_type IN (
    'OWN_STOCK',      -- Picked from HyperQuote warehouse
    'SUPPLIER_DROP',   -- Supplier ships direct to customer
    'SUPPLIER_CROSS',  -- Supplier ships to HQ warehouse, then HQ delivers
    'INTER_TRANSFER'   -- Transfer from another HQ warehouse
  )),

  -- For OWN_STOCK:
  warehouse_id UUID REFERENCES warehouses(warehouse_id),
  pick_list_id UUID,
  lot_id UUID,

  -- For SUPPLIER_DROP or SUPPLIER_CROSS:
  supplier_id UUID REFERENCES suppliers(supplier_id),
  purchase_order_id UUID REFERENCES purchase_orders(po_id),

  -- Common:
  quantity DECIMAL(15,3) NOT NULL,
  unit_cost DECIMAL(15,4) NOT NULL,  -- WAC for own stock, PO price for supplier
  status TEXT NOT NULL,
  scheduled_delivery_date DATE,
  actual_delivery_date DATE,
  delivery_note_number TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick lookup: all fulfillments for an order
CREATE INDEX idx_fulfillments_order ON order_fulfillments(sales_order_id);
```

### Customer Communication for Mixed Fulfillment

The customer sees ONE order with a delivery schedule. They should NOT see the internal sourcing details:

```
CUSTOMER VIEW (delivery note / email):
  ───────────────────────────────────────────────
  Order #HQ-2026-1234
  Henderson Construction

  Delivery Schedule:
    Delivery 1: Tuesday March 30, 10:00-12:00
      800 bags Portland Cement Type I
      HyperQuote truck

    Delivery 2: Wednesday March 31, 14:00-16:00
      2,200 bags Portland Cement Type I
      Supplier delivery (on behalf of HyperQuote)

  Total: 3,000 bags
  ───────────────────────────────────────────────

INTERNAL VIEW (operations):
  Shows full source breakdown, costs, margins,
  fulfillment type, PO numbers, driver assignments.
```

### Branded Delivery Note Issue

When the supplier drop-ships to the customer:
- The delivery note should show HyperQuote's name, not the supplier's
- This requires coordination with the supplier: "Ship using our delivery note template"
- In the Egyptian market, this is typically handled via WhatsApp: HyperQuote sends a PDF delivery note to the supplier, supplier includes it with the shipment
- When HyperQuote delivers from own stock, the delivery note automatically shows HyperQuote branding (see Section 9)

---

## 8. INVENTORY VALUATION FOR EGYPTIAN ACCOUNTING

### Egyptian Accounting Standards (EAS)

Egypt uses Egyptian Accounting Standards (EAS), which are aligned with but not identical to IFRS. Key points for inventory:

- **EAS is aligned with IAS 2 (Inventories)**: Permits FIFO or Weighted Average Cost. LIFO is NOT permitted (same as IFRS).
- **Weighted Average Cost (WAC) is the most common method** used by Egyptian distributors because it smooths out price volatility -- critical in a market where cement prices can swing 20% in a month.
- **EAS was updated in 2023** to align with certain IFRS updates (IFRS 9, IFRS 15, IFRS 16).
- **Tax implications**: Egyptian corporate tax is 22.5%. Inventory valuation method directly affects taxable income. WAC is accepted by the Egyptian Tax Authority (ETA).

### WAC Calculation with Egyptian Specifics

**How WAC updates on each receipt:**

```
EXAMPLE: Cement inventory at Base A

Transaction 1 (Opening):
  200 bags on hand at EGP 78/bag
  Total value: EGP 15,600
  WAC: EGP 78.00

Transaction 2 (Receipt - PO from Suez Cement):
  500 bags at EGP 82/bag = EGP 41,000
  Freight-in: EGP 1,000 (EGP 2/bag)
  Landing charges: EGP 250 (EGP 0.50/bag)
  Total landed cost: EGP 42,250
  Landed unit cost: EGP 84.50/bag

  New total value: 15,600 + 42,250 = EGP 57,850
  New total qty: 200 + 500 = 700
  New WAC: EGP 57,850 / 700 = EGP 82.64/bag

Transaction 3 (Sale - 300 bags shipped to customer):
  COGS: 300 x EGP 82.64 = EGP 24,793
  Remaining value: 57,850 - 24,793 = EGP 33,057
  Remaining qty: 700 - 300 = 400
  WAC remains: EGP 82.64/bag (does not change on sale)

Transaction 4 (Receipt - PO from Sinai Cement, price increased):
  400 bags at EGP 90/bag = EGP 36,000
  Freight-in: EGP 1,200 (EGP 3/bag -- different supplier, farther)
  Landed unit cost: EGP 93.00/bag

  New total value: 33,057 + 37,200 = EGP 70,257
  New total qty: 400 + 400 = 800
  New WAC: EGP 70,257 / 800 = EGP 87.82/bag
```

### Landed Cost Components for Egyptian Building Materials

| Cost Component | Applies To | How to Calculate | Allocation Method |
|---------------|-----------|-----------------|-------------------|
| **Purchase price** | All items | Supplier invoice price | Direct to item |
| **Freight-in (domestic)** | All items | Transport cost from supplier to warehouse | By weight or by unit count |
| **Customs duties** | Imported items only | Percentage of CIF value (varies by HS code) | Direct to item |
| **Port/clearance charges** | Imported items | Fixed + variable per container | Allocated across container items by value |
| **Internal transport** | Imported items | Port to warehouse delivery cost | By weight or by container proportion |
| **Insurance (transit)** | All items | Usually 0.1-0.3% of value | Proportional to value |
| **Inspection/testing fees** | Steel (mill test certs), cement (lab tests) | Per batch/shipment | Direct to batch |
| **Unloading at warehouse** | All items | Labor + equipment cost per receipt | By unit count or weight |

**For domestic purchases (majority of Egyptian building materials):**
Landed cost = Purchase price + Freight-in + Unloading
(Customs and port charges do not apply)

**For imported items (specialty steel, imported tiles, etc.):**
Landed cost = Purchase price + Freight + Insurance + Customs duty + Port charges + Internal transport + Inspection

### Handling Price Adjustments

| Scenario | Accounting Treatment |
|----------|---------------------|
| **Supplier invoice differs from PO price** | Adjust inventory value at WAC. If material difference, create variance journal entry. |
| **Supplier rebate received** (e.g., volume rebate at year-end) | Reduce COGS or reduce inventory value, depending on timing. If inventory still on hand: reduce inventory value and recalculate WAC. If already sold: reduce COGS. |
| **Early payment discount taken** (e.g., 2/10 net 30) | Under EAS/IFRS, the discount reduces the purchase cost. Recalculate WAC downward. |
| **Damaged stock write-down** | Write down to net realizable value (NRV). Difference between WAC and NRV recorded as expense (inventory write-down). Do NOT adjust WAC for remaining good stock. |
| **Expired cement (shelf life exceeded)** | Write down to zero (or scrap value if any). Record as inventory write-off expense. Physically segregate and dispose. |

### Journal Entries for Key Transactions

**Purchase and receipt of stock:**
```
DR  Inventory (Asset)                    EGP 42,250
  CR  Accounts Payable - Suez Cement     EGP 41,000
  CR  Accrued Freight                    EGP 1,250
```

**Sale from own stock:**
```
DR  Cost of Goods Sold                   EGP 24,793
  CR  Inventory (Asset)                  EGP 24,793

DR  Accounts Receivable                  EGP 30,000
  CR  Revenue                            EGP 30,000
```

**Sale via supplier drop-ship (no inventory impact):**
```
DR  Cost of Goods Sold                   EGP 85,000
  CR  Accounts Payable - Supplier        EGP 85,000

DR  Accounts Receivable                  EGP 100,000
  CR  Revenue                            EGP 100,000
```

**Damaged cement write-down (50 bags at WAC EGP 82.64):**
```
DR  Inventory Write-Down Expense         EGP 4,132
  CR  Inventory (Asset)                  EGP 4,132
```

---

## 9. OWN FLEET + OWN STOCK: THE FULL DELIVERY MODEL

### How the Flow Changes from Drop-Ship

When HyperQuote has own stock at Base A, own trucks, and own drivers, the delivery flow for stocked items becomes fully controlled:

```
DROP-SHIP MODEL (current):
  Customer Order → HQ sends PO to Supplier → Supplier ships to Customer
  HQ role: Coordinator
  Branding: Supplier's truck, supplier's paperwork (or white-label)
  Control: Low (dependent on supplier timing, quality, behavior)

OWN STOCK MODEL (new):
  Customer Order → HQ picks from warehouse → HQ truck delivers to Customer
  HQ role: Operator
  Branding: HyperQuote truck, HyperQuote delivery note, HyperQuote driver
  Control: Full (HQ controls timing, quality, presentation)
```

### The Full Own-Stock Delivery Flow

```
DAY -1 or DAY 0: ORDER PROCESSING
  1. Sales confirms order
  2. System reserves inventory at Base A
  3. Operations schedules delivery (route planning)
  4. Pick list generated and sent to warehouse app

SAME DAY or NEXT DAY: WAREHOUSE OPERATIONS
  5. Warehouse supervisor reviews pick list
  6. Forklift operator picks pallets from storage
     (system directs to oldest lot first -- FEFO for cement)
  7. Picked materials staged in loading zone
  8. Quality check: verify product, quantity, condition
  9. Loading verification: warehouse worker scans each pallet onto truck
  10. Weight check: ensure truck is not overloaded
      (Egyptian road weight limits: typically 30-40 tons gross vehicle weight)

SAME DAY: LOADING AND DISPATCH
  11. Driver assigned to route
  12. Driver receives: delivery note, route plan, customer contact info
  13. Load secured: cement pallets strapped/wrapped, rebar bundles strapped
  14. Truck weighed at gate (if weighbridge available)
  15. Driver confirms load acceptance (digital sign-off in driver app)
  16. Dispatch: truck leaves Base A

TRANSIT:
  17. Driver app tracks location (GPS)
  18. Customer notified: "Your delivery is on the way, ETA 2:30 PM"
  19. If delay: system auto-updates ETA, notifies customer

DELIVERY:
  20. Driver arrives at customer site
  21. Customer (or site foreman) inspects delivery
  22. Driver captures: delivery photos, signature, any exceptions
  23. Unloading: customer's equipment or driver assists
      (For cement: customer typically unloads with their own forklift)
      (For rebar: may need crane or forklift on customer side)
  24. Delivery note signed (digital or paper)
  25. Driver marks delivery complete in app

POST-DELIVERY:
  26. System receives delivery confirmation
  27. Inventory record updated: IN_TRANSIT → DELIVERED
  28. Invoice generated automatically
  29. Driver proceeds to next stop or returns to base
```

### The Branded Delivery Advantage

With own stock + own fleet, branding is **automatic and complete**:

| Touch Point | Drop-Ship (current) | Own Stock + Own Fleet (new) |
|-------------|---------------------|---------------------------|
| **Truck** | Supplier's truck (no HQ branding) | HyperQuote truck (logo, livery) |
| **Driver** | Supplier's driver (no HQ uniform) | HyperQuote driver (uniform, ID badge) |
| **Delivery note** | Must coordinate with supplier for HQ-branded paperwork | HyperQuote delivery note (auto-generated) |
| **Product packaging** | Supplier/manufacturer packaging | Same packaging, but HQ sticker/tag possible |
| **Customer interaction** | Supplier driver has no HQ context | HQ driver can answer questions, build relationship |
| **Delivery experience** | Variable (depends on supplier's standards) | Consistent (HQ trains and controls) |
| **Exception handling** | Driver calls supplier, not HQ | Driver calls HQ dispatch directly |
| **Proof of delivery** | May or may not get photos/signatures | Standardized: photos, signatures, GPS, timestamps |

### Mixed Fleet Scenario

In practice, HyperQuote will run a mixed model for the foreseeable future:

```
ORDER FULFILLMENT OPTIONS:

1. OWN STOCK + OWN TRUCK
   - Stocked item at Base A → HyperQuote truck delivers
   - Full branding, full control
   - Highest margin (no supplier markup, no 3PL cost)

2. OWN STOCK + 3PL TRUCK
   - Stocked item at Base A → Hired truck delivers
   - Partial branding (can add HyperQuote magnetic signs on 3PL truck)
   - Used when own fleet is fully utilized or customer is far

3. SUPPLIER DROP-SHIP
   - Non-stocked item → Supplier delivers directly
   - No branding on truck (or white-label delivery note sent to supplier)
   - Used for non-stocked items, very large orders, distant customers

4. SUPPLIER → WAREHOUSE → OWN TRUCK (Cross-Dock)
   - Non-stocked item → Supplier ships to Base → HQ delivers from Base
   - Full branding at delivery (HQ truck)
   - Used when customer needs consolidation of multiple items into one delivery
```

### Delivery Note Content for Own-Stock Shipments

```
┌─────────────────────────────────────────────────────────┐
│                    [HyperQuote Logo]                     │
│              DELIVERY NOTE / ايصال تسليم                  │
│                                                         │
│  DN Number: DN-2026-03421                               │
│  Date: March 30, 2026                                   │
│  Order Reference: HQ-2026-1234                          │
│                                                         │
│  Ship From: HyperQuote Base A                           │
│            10th of Ramadan Industrial Zone               │
│                                                         │
│  Deliver To: Henderson Construction                     │
│             New Cairo, Block 15, Plot 7                  │
│             Contact: Eng. Ahmed (0100-xxx-xxxx)          │
│                                                         │
│  ─────────────────────────────────────────────────────── │
│  Item               │ Qty    │ UOM   │ Notes            │
│  ─────────────────────────────────────────────────────── │
│  Portland Cement     │ 500    │ bags  │ Lot: SC-2026-44  │
│  Type I, 50 kg       │        │       │ Mfg: March 2026  │
│  ─────────────────────────────────────────────────────── │
│                                                         │
│  Truck: ق ط و 1234                                      │
│  Driver: Mohamed Ibrahim                                │
│                                                         │
│  Received by: ________________  Date: ___________       │
│  Signature: _________________   Stamp: __________       │
│                                                         │
│  Notes/Exceptions: ________________________________     │
│  ______________________________________________________ │
│                                                         │
│  * Prices not shown on delivery note (per company policy)│
└─────────────────────────────────────────────────────────┘
```

**Important Egyptian business practice:** Delivery notes in Egypt typically do NOT show prices. The invoice is a separate document. This is standard practice to prevent the driver (or customer's site workers) from seeing commercial terms that should only be between the company and the customer's purchasing department.

---

## 10. TRANSITION MECHANICS: ADDING THE FIRST INVENTORY ITEM

### The Decision Trigger

The decision to stock the first item (almost certainly cement) happens when:

1. **Volume threshold:** HyperQuote has sold 50+ tons of cement per month for 3+ consecutive months through the drop-ship model
2. **Margin opportunity:** Bulk purchase price (buying a full truckload of 30 tons) is 10-15% cheaper per unit than per-order purchasing. On 50 tons/month, that is EGP 50,000-100,000 in monthly margin improvement.
3. **Customer demand:** 3+ customers have asked for same-day or next-day cement delivery (not possible with drop-ship)
4. **Supplier reliability issues:** Supplier has missed delivery dates 3+ times in the last quarter, causing customer complaints

### The First Stock Purchase Order

This PO is different from every PO HyperQuote has ever created, because it has NO linked customer order:

```
FIRST EVER STOCK PURCHASE ORDER:

PO-2026-0500
  Type: STOCK (first use of this PO type)
  To: Suez Cement Company
  Ship to: Base A, 10th of Ramadan (HyperQuote warehouse)

  Line 1:
    Item: Portland Cement Type I, 50 kg bag
    Qty: 1,000 bags (approximately 2 weeks of expected demand)
    Unit Price: EGP 78/bag (volume price for truckload)
    Total: EGP 78,000

  Linked Sales Order: NONE
  Reorder Trigger: INITIAL_STOCKING
  Approved by: CEO (first stock PO requires CEO approval)

  Notes: First speculative inventory purchase. Capital outlay: EGP 78,000
         plus freight (~EGP 2,000). Total investment: ~EGP 80,000.
         Expected to sell within 14 days based on current demand run rate.
```

### System Changes Required for the First Stocked Item

Before the first stock arrives, these system changes must be in place:

**1. Inventory Module Activation:**
```
CHANGE: Enable physical inventory tracking for the product.

Before: Product "Portland Cement Type I" exists only in the catalog
        with supplier prices. No on_hand, no WAC, no lot tracking.

After:  Product has inventory records:
        - inventory_tracking_enabled = TRUE
        - stocking_type = 'STOCKED' (was 'NON_STOCKED' or 'DROP_SHIP_ONLY')
        - warehouses: [Base A] (can expand later)
        - wac_cost = NULL (will be set after first receipt)
        - reorder_point = 465 (calculated per Section 4)
        - max_level = 1,585
        - abc_class = 'A'
        - lot_tracking_required = TRUE (cement has shelf life)
        - fefo_enabled = TRUE (first expired, first out)
```

**2. Warehouse Setup:**
```
CHANGE: Define storage location for cement at Base A.

New location record:
  warehouse: Base A
  zone: Indoor Warehouse
  sub_zone: Cement Storage
  positions: CS-01 through CS-10 (10 pallet positions)
  capacity: 10 pallets per position x 42 bags/pallet = 4,200 bags max
  rules:
    - keep_dry: TRUE
    - max_stack_height: 10 pallets
    - temperature_sensitive: TRUE (alert if > 45C)
    - fifo_enforced: TRUE
```

**3. Receiving Workflow:**
```
CHANGE: Base A warehouse workers now have a receiving queue.

First receipt flow:
  a. PO-2026-0500 appears in warehouse app "Expected Deliveries"
  b. Suez Cement truck arrives at Base A gate
  c. Guard checks truck against expected delivery list
  d. Warehouse supervisor directs truck to covered unloading area
  e. Forklift operator unloads cement pallets
  f. Worker counts bags: verify 1,000 bags (approximately 24 pallets)
  g. Worker checks: manufacture date on bags (must be < 1 month old)
  h. Worker checks: bag condition (no hardness, no moisture damage)
  i. Worker scans/enters: lot number from bags (e.g., SC-2026-044)
  j. Worker enters: manufacture date (March 2026)
  k. System calculates: expiration date (June 2026, 3 months)
  l. Supervisor confirms receipt: 1,000 bags, good condition
  m. System creates inventory record:
     - Product: Portland Cement Type I
     - Warehouse: Base A
     - Location: CS-01 through CS-06
     - Lot: SC-2026-044
     - Qty: 1,000 bags
     - Status: AVAILABLE
     - Cost: EGP 80.00/bag (purchase EGP 78 + freight EGP 2)
     - WAC: EGP 80.00 (first receipt; WAC = landed cost)
     - Manufacture date: March 1, 2026
     - Expiry date: June 1, 2026
```

**4. Sourcing Logic Update:**
```
CHANGE: The quoting/ordering system now checks own stock first.

Before: Every quote sourced from supplier marketplace.
After:  System runs sourcing algorithm (Section 2):
        1. Check own stock at Base A → 1,000 bags available
        2. If insufficient, check supplier marketplace
        3. Show sales rep the unified view (Section 1)
```

**5. Financial Setup:**
```
CHANGE: New GL accounts and tracking.

New accounts needed:
  - Inventory - Cement (Asset account, under Current Assets)
  - COGS - Cement (Expense account, under Cost of Goods Sold)
  - Inventory Write-Down - Cement (Expense account)
  - Freight-In - Cement (may be sub-account of Inventory or separate expense)

New reports needed:
  - Inventory Valuation Report (by product, by warehouse, by lot)
  - Inventory Aging Report (critical for cement shelf life monitoring)
  - Stock vs Non-Stock Margin Comparison
  - Carrying Cost Report
```

**6. The First Sale from Own Stock:**
```
FIRST SALE FROM OWN INVENTORY:

Order SO-2026-1250:
  Customer: ABC Contractors
  Item: Portland Cement Type I
  Qty: 200 bags
  Price: EGP 100/bag

System flow:
  1. Sales rep creates quote → system shows: "Own stock: 1,000 bags at Base A"
  2. Sales rep quotes EGP 100/bag
  3. Customer confirms
  4. System RESERVES 200 bags at Base A
     - Available: 1,000 → 800
     - Reserved: 0 → 200
  5. Operations assigns delivery date: tomorrow
  6. Pick list generated:
     - Pick 200 bags from location CS-01/CS-02, Lot SC-2026-044
  7. Warehouse picks and stages
  8. HyperQuote truck loads and delivers
  9. Customer confirms receipt
  10. System updates:
      - On-hand: 1,000 → 800
      - Reserved: 200 → 0
      - COGS recorded: 200 x EGP 80 (WAC) = EGP 16,000
      - Revenue recorded: 200 x EGP 100 = EGP 20,000
      - Margin: EGP 4,000 (20%)

  Compare to drop-ship margin:
      Supplier price would be: EGP 85/bag
      At EGP 100 sale price: margin = EGP 15/bag = 15%
      From own stock at EGP 80 WAC: margin = EGP 20/bag = 20%

      MARGIN IMPROVEMENT FROM STOCKING: +5 percentage points
      On 200 bags: EGP 1,000 additional profit
```

### Checklist: Before First Stock Arrives

| # | Task | Owner | Status |
|---|------|-------|--------|
| 1 | Warehouse space secured and set up (indoor cement storage area) | Operations | Must be done |
| 2 | Forklift available (rented or purchased) | Operations | Must be done |
| 3 | At least 1 warehouse worker hired and trained | HR/Operations | Must be done |
| 4 | Inventory module enabled for this product in system | IT/Product | Must be done |
| 5 | Receiving workflow configured in warehouse app | IT/Product | Must be done |
| 6 | Storage locations defined in system | IT/Operations | Must be done |
| 7 | Lot tracking and FEFO logic tested | IT/Product | Must be done |
| 8 | WAC calculation logic verified | IT/Finance | Must be done |
| 9 | GL accounts created for inventory | Finance | Must be done |
| 10 | Sourcing algorithm updated to check own stock first | IT/Product | Must be done |
| 11 | Sales team trained: "We now have cement in stock at Base A" | Sales Manager | Must be done |
| 12 | Label printer available at receiving dock | Operations | Should be done |
| 13 | Insurance updated to cover inventory at warehouse | Finance | Must be done |
| 14 | Fire extinguishers in cement storage area | Operations/Safety | Must be done |
| 15 | Barcode labels printed for storage locations | IT/Operations | Should be done |

### What to Stock Second

After cement is successfully stocked for 2-3 months:

| Next Item | Rationale | Special Requirements |
|-----------|-----------|---------------------|
| #4 Rebar (12mm) 12m | Second highest volume item in Egyptian construction | Outdoor yard storage, heavy forklift (5-ton), no shelf life concern |
| #5 Rebar (16mm) 12m | Third highest volume | Same as above; can share storage zone |
| Standard concrete blocks | High frequency, low value per unit, heavy | Outdoor yard, pallet storage, no special handling |
| Building sand | High volume, local sourcing | Requires bins, truck scale, approximate tracking |

---

## KEY TAKEAWAYS FOR HYPERQUOTE SYSTEM DESIGN

### 1. The Unified Availability View is the Core Feature
The sales rep must see own stock + supplier stock in ONE view. This is the differentiating feature that makes the hybrid model work. Design this screen first.

### 2. Own Stock First is a Business Rule, Not a UI Preference
The sourcing algorithm defaults to own stock first. This must be enforced at the system level with configurable rules, not left to individual sales rep judgment.

### 3. Two Types of POs Must Be Tracked Separately
Stock POs (speculative) and customer-linked POs (back-to-back) have different triggers, approvals, risk profiles, and accounting treatment. The system must distinguish them.

### 4. WAC Applies to Own Stock Only
Supplier-sourced items for specific orders use actual cost from the PO. WAC is only for inventory that HyperQuote owns. Never mix these cost bases.

### 5. Mixed Fulfillment per Order Line is Mandatory
A single order line (5,000 bags cement) can be fulfilled from own stock (500 bags) + supplier (4,500 bags). The system must support per-line multi-source fulfillment tracking.

### 6. Egyptian Market Demands Higher Safety Stock
Supplier reliability, transport disruptions, EGP volatility, and Ramadan slowdowns all contribute to higher variability. Safety stock calculations should use a 1.5x Egyptian reliability factor.

### 7. Cement is the Gateway Drug
Start with cement at one base. Prove the model. Then expand to rebar, then blocks, then sand. Do not try to stock 20 items at once.

### 8. The Financial Transition is Significant
Going from zero inventory to holding EGP 80,000+ in cement stock changes the balance sheet, creates carrying costs, adds write-off risk (expired cement), and requires new accounting processes. This is not just a warehouse operations change -- it is a fundamental business model shift.

---

## Sources

- [Epicor Prophet 21 Supply Chain Management](https://www.epicor.com/en-us/products/enterprise-resource-planning-erp/prophet-21/supply-chain-management-scm/)
- [Epicor Prophet 21 ERP for Distributors](https://www.b2sell.com/blog/epicor-prophet-21-erp-for-distributors)
- [NetSuite Drop Shipment and Special Order Purchases](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_N2409296.html)
- [Drop Shipments and Special Orders in NetSuite - Concentrus](https://blog.concentrus.com/drop-shipment-and-special-orders-in-netsuite)
- [NetSuite Dropship vs Traditional Shipping - Flxpoint](https://flxpoint.com/blog/netsuite-dropship-vs-traditional-shipping)
- [SAP S/4HANA aATP 2025 Release](https://community.sap.com/t5/enterprise-resource-planning-blog-posts-by-members/what-s-new-in-sap-s-4hana-2025-advance-available-to-promise-aatp-business/ba-p/14333428)
- [Egypt Cement Industry Report 2025 - GlobeNewsWire](https://www.globenewswire.com/news-release/2026/02/16/3238759/28124/en/Egypt-Cement-Industry-Industry-Report-2025-A-5-25-Billion-Market-by-2029-from-3-63-Billion-in-2024-Infrastructure-and-State-Housing-Projects-are-Sustaining-Demand.html)
- [Egypt Cement Market Size - IMARC Group](https://www.imarcgroup.com/egypt-cement-market)
- [Egypt Cement Prices - Misr Connect](https://misrconnect.com/en/news/egypt-news/cement-holds-firm-after-hike-ton-reaches-egp-4-000-on-saturday-august-2-2025)
- [Egypt Accounting Standards - IAS Plus](https://www.iasplus.com/en/jurisdictions/africa/egypt)
- [IFRS Egypt Jurisdictional Profile](https://www.ifrs.org/content/dam/ifrs/publications/jurisdictions/pdf-profiles/egypt-ifrs-profile.pdf)
- [IAS 2 Inventories](https://www.ifrs.org/issued-standards/list-of-standards/ias-2-inventories/)
- [Weighted Average Cost Method - Corporate Finance Institute](https://corporatefinanceinstitute.com/resources/accounting/weighted-average-cost-method/)
- [Cost Formulas for Inventories - IFRS Community](https://ifrscommunity.com/knowledge-base/fifo-lifo-weighted-average-cost/)
- [Available-to-Promise (ATP) Guide - Shopify](https://www.shopify.com/blog/available-to-promise)
- [Available-to-Promise (ATP) Inventory - Red Stag Fulfillment](https://redstagfulfillment.com/available-to-promise/)
- [Inventory Control Using ABC Classification and Min-Max Stock](https://www.e3s-conferences.org/articles/e3sconf/pdf/2023/102/e3sconf_icimece2023_02009.pdf)
- [Distribution Industry Trends 2026 - Priority Software](https://www.priority-software.com/resources/distribution-industry-trends/)
- [Egypt Warehouse Listings - Bayut](https://www.bayut.eg/en/egypt/warehouses-for-rent/)
- [Egypt Warehouse Listings - Property Finder](https://www.propertyfinder.eg/en/commercial-rent/warehouses-for-rent.html)
- [Construction Material Storage: Laydown Yard Tips - Procore](https://www.procore.com/library/material-storage-construction)
- [Material Handling Equipment in Warehouse - Al Marwan](https://almarwan.com/news/4618/material-handling-equipment-in-warehouse)
- [Building Materials Distribution Software - Accolent ERP](https://www.adssolutions.com/industries/building-materials-distribution-software/)
- [Q&A: The New Hybrid Approach to Inventory Management - LeanDNA](https://www.leandna.com/resource/qa-the-new-hybrid-approach-to-inventory-management/)
