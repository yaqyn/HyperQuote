> ⚠️ **REFERENCE DOCUMENT — NOT THE SOURCE OF TRUTH**
> This file was written during the research phase and may contain outdated decisions, US-centric references, or superseded technical choices.
> **Always defer to `essential/RESEARCH.md` for current decisions.**
> Key changes since this file was written: TanStack Start (not Next.js), Capacitor (not Expo), React Aria (not shadcn), Egyptian law (not US FMCSA), EGP (not USD), dual auth pools, no online payments, no mobile wallets, spatial glass UI (not traditional dashboards).

# Multi-Warehouse Order Fulfillment and Stock Splitting

## Research Context
Building materials distribution where a single customer order (e.g., 3000 wood units) may be fulfilled from multiple warehouse locations, with each location getting its own driver assignment or a single driver picking up from multiple bases.

---

## 1. Split Fulfillment in Distribution ERPs

### Epicor Prophet 21 (Purpose-Built for Distribution)

Prophet 21 is the most mature ERP for multi-warehouse distribution and handles split fulfillment as a **standard, out-of-the-box feature**:

- **Automated Order Splitting**: When an order cannot be fulfilled from a single location, Prophet 21 automatically splits the order across multiple warehouses, generating accurate documentation and tracking for each leg of the shipment.
- **Intelligent Routing Engine**: Configurable rules route orders based on location, availability, and customer priority. The system dynamically directs orders to the most efficient fulfillment source rather than requiring manual warehouse selection.
- **Unified Visibility**: Integrates data from multiple warehouses in real time, ensuring consistent inventory management across all locations.

Source: [2WTech - How Prophet 21 Streamlines Multi-Warehouse Operations](https://2wtech.com/how-prophet-21-streamlines-multi-warehouse-operations/)

### SAP S/4HANA (Advanced Available-to-Promise / aATP)

SAP approaches multi-warehouse fulfillment through its Available-to-Promise (ATP) engine:

- **Alternative Based Confirmation (ABC)**: A flexible mechanism that fulfills sales order line items from different or multiple plants. The system searches for alternative plants to supply the required quantity.
- **Sourcing Priority**: The 2025 release introduced "Minimum Consumption Priority" to ensure preferred sources are used first, and "Maximum Sequence Number" to limit the number of alternative sources checked.
- **Automated Stock Transfer Orders (STO)**: When a warehouse lacks stock but another has it, SAP can automatically create inter-warehouse transfer orders.
- **Configurable Checking Rules**: Rules can be assigned per item group or specific items, controlling whether to include safety stock, quality inspection stock, blocked stock, and purchase orders in availability calculations.

Source: [SAP Community - aATP in S/4HANA 2025](https://community.sap.com/t5/enterprise-resource-planning-blog-posts-by-members/what-s-new-in-sap-s-4hana-2025-advance-available-to-promise-aatp-business/ba-p/14333428)

### Oracle NetSuite (Multi-Location Fulfillment)

NetSuite supports split fulfillment with specific patterns:

- **Automatic Location Assignment**: The system automatically selects which locations items should ship from based on location proximity and inventory availability.
- **Minimization Logic**: NetSuite attempts to minimize the number of fulfillment locations per sales order, but will use as many locations as required to fill the order.
- **Line-Level Location Assignment**: Individual lines on a sales order can be assigned to different fulfillment locations, including across subsidiaries.
- **Separate Fulfillment Requests**: If a sales order has lines with different fulfillment locations, separate fulfillment requests must be created per location.
- **Cross-Subsidiary Fulfillment**: Allows fulfillment from locations across different business entities/subsidiaries, reducing the need for intercompany transfers.

Source: [Oracle NetSuite Documentation - Multi-Location Inventory](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_N2303574.html)

### Odoo (Routes and Pull/Push Rules)

Odoo handles multi-warehouse fulfillment through its route configuration system:

- **Routes and Rules**: Odoo uses configurable routes with push/pull rules to define how goods move through warehouses. Multi-step processes (pick-pack-ship) are configured per route.
- **Inter-Warehouse Replenishment**: Locations can replenish from a central distribution center, with the system automatically generating inter-warehouse transfer orders.
- **Manual Configuration Required**: Odoo does NOT natively auto-split a single sales order into multiple delivery orders from different warehouses. This requires explicit route and rule configuration. A sales order line is tied to one warehouse; splitting requires creating separate lines or using custom logic.
- **Reorder Rules**: Minimum/maximum stock rules can trigger automatic purchase orders or inter-warehouse transfers.

Source: [Odoo 19.0 Documentation - Routes and Push/Pull Rules](https://www.odoo.com/documentation/19.0/applications/inventory_and_mrp/inventory/shipping_receiving/daily_operations/use_routes.html)

### UX for Warehouse Manager Decision-Making

The typical UX pattern across ERPs:

1. **Order Entry Screen** shows total quantity ordered and available stock per warehouse in a matrix view.
2. **System auto-suggests** an allocation (see Section 2 below).
3. **Manager can override** the suggestion, manually adjusting quantities per warehouse.
4. **Confirmation** locks the allocation and generates separate pick lists per warehouse.
5. **Dashboard** shows all partial fulfillments tied to the parent order.

---

## 2. Optimal Sourcing Logic

### Auto-Suggest vs. Manual Selection

The industry consensus is a **hybrid approach**: the system auto-suggests, and the manager overrides when needed.

**Auto-suggestion factors (in typical priority order):**

| Priority | Factor | Logic |
|----------|--------|-------|
| 1 | Stock Availability | Only suggest warehouses that have the item in stock |
| 2 | Proximity to Customer | Nearest warehouse reduces freight cost and delivery time |
| 3 | Fulfillment Completeness | Prefer single-warehouse fulfillment over splits (minimize split orders) |
| 4 | Warehouse Capacity/Load | Avoid overloading busy warehouses |
| 5 | Cost Optimization | Factor in freight rates, handling costs, fuel costs |
| 6 | Customer Priority | VIP customers may have dedicated warehouse assignments |

### Algorithms Used in Practice

**Rule-Based Sourcing (Most Common in ERPs)**
- Sequential priority rules: Check Warehouse A first, then B, then C.
- Configurable per product group, customer region, or order type.
- Prophet 21 and SAP both use this approach as their primary method.

**Optimization-Based Sourcing (Advanced)**
- Mixed-Integer Linear Programming (MILP) models that minimize total fulfillment cost across transportation, warehousing, and handling.
- NP-hard problem: Finding the optimal split across warehouses is computationally complex.
- Research (2025) shows polynomial-time heuristics work well for 2-warehouse scenarios.

**Proximity-Based Sourcing**
- GIS integration to calculate distance from each warehouse to the delivery address.
- Weighted by truck capacity and fuel cost per kilometer.

**For Building Materials Specifically:**
- Weight and volume are critical: freight costs represent **15-30% of total order value** and sometimes exceed the product cost itself.
- The system should calculate freight in real-time based on weight, dimensions, distance, and accessorial charges.
- Route optimization should combine multiple pending orders to minimize fuel costs.

Source: [SAGE Journals - Multi-Warehouse Assortment Selection: Minimizing Order Splitting](https://journals.sagepub.com/doi/10.1177/10591478251365581)
Source: [Bizowie - ERP for Building Materials Distributors](https://bizowie.com/erp-for-building-materials-distributors-freight-costs-units-of-measure-and-contractor-orders)

### Recommended Approach for the Proposed System

```
1. System calculates availability across all warehouses
2. System auto-suggests allocation using:
   a. Single-warehouse fulfillment if any one warehouse can fill the order
   b. If split required: nearest warehouses with sufficient stock
   c. Factor in pending deliveries to same area (consolidation opportunity)
3. Manager reviews suggestion on allocation screen
4. Manager can drag/adjust quantities between warehouses
5. System recalculates cost impact in real-time as manager adjusts
6. Manager confirms -> stock is reserved -> pick lists generated
```

---

## 3. Multi-Pickup Driver Routes

### Is Multi-Pickup Common?

Yes, particularly in building materials distribution. The pattern is well-established:

- **Multi-Stop Truckload (Multi-Stop TL)**: A single truck makes pickups from multiple warehouse locations along a route, then delivers the consolidated load to a single destination or multiple destinations.
- **Cost Efficiency**: Consolidating shipments into a single truckload reduces the need for multiple trucks, cuts fuel expenses, and streamlines delivery.
- **Route Optimization Tools**: Platforms like OptimoRoute, Route4Me, and Senpex support many-to-many models where a driver collects from multiple warehouses and delivers to multiple customers.

Source: [Next Exit Logistics - Multi-Stop Shipping](https://nextexitlogistics.com/ftl-mult-stop-shipping/)
Source: [OptimoRoute - Pickup and Delivery](https://optimoroute.com/pickup-and-delivery/)

### The Multi-Depot Pickup and Delivery Problem (MDPDP)

This is a formal logistics optimization problem studied extensively:

- **Definition**: Planning routes for vehicles that must pick up goods from multiple depots (warehouses) and deliver to customers, minimizing total cost.
- **Constraints**: Vehicle capacity, pickup/dropoff time windows, driver working hours, depot operating hours.
- **Resource Sharing**: Vehicles can be used multiple times by one or multiple facilities, reducing total fleet requirements.
- **Solution Algorithms**:
  - Clarke-Wright (CW) algorithm for constructing initial route solutions.
  - Non-dominated Sorting Genetic Algorithm (NSGA-II) for Pareto-optimal solutions.
  - Adaptive Large Neighborhood Search (ALNS) for complex real-world scenarios.

Source: [Wiley - Multi-Depot Pickup and Delivery Problem with Resource Sharing](https://onlinelibrary.wiley.com/doi/10.1155/2021/5182989)

### Logistics Challenges of Multi-Pickup Routes

| Challenge | Impact | Mitigation |
|-----------|--------|------------|
| **Increased route time** | Driver spends time traveling between warehouses and loading at each | Optimize pickup sequence; pre-stage loads |
| **Loading complexity** | Items from different warehouses must be loaded in delivery-sequence order | Provide driver with load plan showing pickup and stacking order |
| **Coordination** | All warehouses must have goods ready when driver arrives | Pick list triggers sent to warehouses with target pickup times |
| **Truck capacity** | Must ensure combined pickup doesn't exceed weight/volume limits | System calculates cumulative load across all pickups |
| **Delay propagation** | Delay at Warehouse A pushes back pickup at Warehouse B | Buffer time between stops; real-time communication |
| **Accountability** | Damage/shortage disputes harder to resolve with multiple pickup points | Signed pickup confirmations at each warehouse |

### Recommended Approach for the Proposed System

Two fulfillment models should be supported:

**Model A: Separate Drivers per Warehouse**
- Each warehouse gets its own pick list and driver assignment.
- Simpler operationally. Better when warehouses are far apart.
- Customer receives multiple deliveries.

**Model B: Single Driver Multi-Pickup**
- One driver route with ordered stops at multiple warehouses before delivery.
- More efficient when warehouses are geographically close.
- Customer receives one consolidated delivery.
- Requires: route optimization, coordinated pick-list timing, cumulative load tracking.

The system should support both models and let the dispatcher choose based on warehouse proximity and order urgency.

---

## 4. Split Shipment Tracking

### Internal Tracking Pattern

The standard ERP pattern uses a **parent-child order structure**:

```
Sales Order #1001 (Parent)
  |-- Fulfillment Order #1001-A (Base A, 1000 units)
  |     |-- Pick List #PA-4521
  |     |-- Driver Assignment: Driver X
  |     |-- Delivery Note: DN-1001-A
  |     |-- Status: Picked -> In Transit -> Delivered
  |
  |-- Fulfillment Order #1001-B (Base B, 2000 units)
        |-- Pick List #PB-7832
        |-- Driver Assignment: Driver Y
        |-- Delivery Note: DN-1001-B
        |-- Status: Picked -> In Transit -> Delivered

Sales Order #1001 Status: Partially Fulfilled -> Fulfilled
```

### Customer Communication

Best practices from industry:

- **Proactive Notification**: Notify the customer upfront that their order will arrive in multiple deliveries, with expected dates for each.
- **Unified Tracking Page**: A single branded page where the customer sees all shipments for their order, with clear status for each.
- **Delivery Note per Shipment**: Each partial delivery comes with its own delivery note referencing the parent order number.
- **Consolidated Invoice**: One invoice for the full order, not per-shipment invoices (unless the customer specifically requests otherwise).

Source: [WeSupply Labs - Guide to Unified Tracking for Split/Multi-Shipment Orders](https://wesupplylabs.com/the-best-guide-to-unified-tracking-for-split-or-multi-shipment-orders/)
Source: [Uphance - How to Manage Split Orders and Shipments](https://www.uphance.com/blog/manage-split-orders-shipments/)

### For Building Materials Distribution Specifically

- Contractors on job sites need to know WHEN each partial delivery arrives so they can schedule labor accordingly.
- Delivery notes should specify exactly what is on each truck (quantity, product, warehouse of origin).
- The system should show the dispatcher a consolidated view of all fulfillment orders for a parent order, with real-time status.

---

## 5. Inventory Allocation and Reservation

### The Two-Phase Reservation Pattern

This is the standard ERP pattern used across SAP, NetSuite, Dynamics 365, and custom systems:

**Phase 1: Soft Reservation (Allocation)**
- Triggered when the manager assigns quantities to warehouses.
- Decrements `available_quantity` and increments `reserved_quantity` for the product-warehouse combination.
- Serves as a temporary hold that prevents other transactions from claiming the same inventory.
- Does NOT generate physical movement — it is a planning commitment.

**Phase 2: Hard Reservation (Commitment)**
- Triggered when the pick list is generated or the order is confirmed for dispatch.
- Converts the soft reservation to a firm commitment.
- In SAP, this corresponds to status changes like "Reserve physical," "Reserve ordered," or "Picked."
- Stock is now locked and cannot be reallocated without explicit cancellation.

Source: [Microsoft Dynamics 365 - Inventory Visibility Reservations](https://learn.microsoft.com/en-us/dynamics365/supply-chain/inventory/inventory-visibility-reservations)
Source: [Stoa Logistics - Inventory Reservation Patterns](https://stoalogistics.com/blog/inventory-reservation-patterns)

### Preventing Double-Allocation (Race Conditions)

**Database-Level Protection:**
```
BEGIN TRANSACTION;
SELECT available_qty FROM inventory
  WHERE product_id = 'WOOD-001' AND warehouse_id = 'BASE-A'
  FOR UPDATE;  -- Locks row, prevents concurrent reads

IF available_qty >= requested_qty THEN
  UPDATE inventory SET
    available_qty = available_qty - requested_qty,
    reserved_qty = reserved_qty + requested_qty
  WHERE product_id = 'WOOD-001' AND warehouse_id = 'BASE-A';

  INSERT INTO reservations (order_id, product_id, warehouse_id, qty, status)
  VALUES ('ORD-1001', 'WOOD-001', 'BASE-A', 1000, 'SOFT_RESERVED');
COMMIT;
```

**Key protections:**
- `FOR UPDATE` lock prevents other transactions from reading the row until the current transaction completes.
- Atomic check-and-reserve in a single transaction eliminates race conditions.
- Message brokers (Kafka, RabbitMQ) can serialize concurrent order requests for additional safety.

### The SAGA Pattern for Distributed Systems

For systems where inventory and orders live in separate services:

1. **Order Service** creates order with status PENDING.
2. **Inventory Service** receives reservation request, checks stock, creates RESERVED record.
3. If reservation succeeds -> Order status moves to CONFIRMED.
4. If reservation fails (insufficient stock) -> Compensating transaction cancels the order.
5. On payment success -> Reservation status moves to COMMITTED.
6. On cancellation -> Reservation is RELEASED, available quantity restored.

Source: [DEV.to - Managing Inventory Reservation in SAGA Pattern](https://dev.to/jackynote/managing-inventory-reservation-in-saga-pattern-for-e-commerce-systems-2d14)

### Reservation Lifecycle for Multi-Warehouse Split Orders

```
Order Created (3000 units wood)
  |
  v
Manager Allocates:
  Base A: 1000 units -> SOFT_RESERVED (available_qty decremented)
  Base B: 2000 units -> SOFT_RESERVED (available_qty decremented)
  |
  v
Pick Lists Generated:
  Base A: 1000 units -> HARD_RESERVED (pick list #PA-4521)
  Base B: 2000 units -> HARD_RESERVED (pick list #PB-7832)
  |
  v
Picked & Loaded:
  Base A: 1000 units -> PICKED (on_hand_qty decremented)
  Base B: 2000 units -> PICKED (on_hand_qty decremented)
  |
  v
Delivered:
  Base A: 1000 units -> FULFILLED
  Base B: 2000 units -> FULFILLED
  Parent Order -> COMPLETE
```

### Timeout and Expiry

- Soft reservations should have a configurable TTL (e.g., 24-48 hours for B2B building materials).
- If a soft reservation expires without confirmation, stock is automatically released.
- A background job periodically sweeps for expired reservations.

---

## 6. Cost Implications of Split Fulfillment

### When Split Fulfillment is MORE Expensive

| Cost Factor | Impact |
|-------------|--------|
| **Multiple truck trips** | Each warehouse dispatch incurs a separate trip cost (fuel, driver time, vehicle wear) |
| **Duplicate handling** | Loading/unloading at multiple locations increases labor cost |
| **Customer site disruption** | Multiple deliveries at a construction site require multiple unloading windows |
| **Administrative overhead** | Multiple delivery notes, multiple driver assignments, multiple confirmations |

### When Split Fulfillment is CHEAPER or Necessary

| Scenario | Why Split Wins |
|----------|---------------|
| **No single warehouse has full stock** | The only option is to split |
| **Warehouses are closer to customer than each other** | Shorter individual trips vs. one long consolidation trip |
| **Urgency** | Ship what's available now from nearest warehouse, rest follows |
| **Truck capacity limits** | 3000 units may exceed one truck's capacity anyway |
| **Different product types at different warehouses** | Specialized storage (e.g., lumber vs. cement) |

### Decision Framework

```
SHOULD WE SPLIT OR CONSOLIDATE?

1. Can one warehouse fill the entire order?
   YES -> Fulfill from single warehouse (lowest cost)
   NO  -> Continue to step 2

2. Can we transfer stock to one warehouse and consolidate?
   - Calculate: Transfer cost + single delivery cost
   - Compare with: Multiple direct delivery costs
   - Factor in: Time delay for transfer (is customer willing to wait?)

3. If splitting, can one driver do multi-pickup?
   - Warehouses within reasonable driving distance of each other?
   - Combined load within truck capacity?
   YES -> Single driver multi-pickup route (moderate cost)
   NO  -> Separate drivers per warehouse (highest cost)

4. Cost calculation for each scenario:

   Scenario A (Single warehouse):
   Cost = handling_cost + single_trip_freight

   Scenario B (Consolidate then deliver):
   Cost = transfer_freight + handling_at_hub + single_trip_freight + time_delay_cost

   Scenario C (Multi-pickup single driver):
   Cost = inter_warehouse_travel + handling_per_warehouse + delivery_freight

   Scenario D (Separate deliveries):
   Cost = SUM(handling_cost_per_warehouse + trip_freight_per_warehouse)
```

### Building Materials Specific Considerations

- **Freight is 15-30% of order value** for building materials, making fulfillment strategy a major margin decision.
- **Weight-based shipping**: Heavier items (lumber, concrete, steel) benefit more from proximity-based sourcing since transport cost scales with weight and distance.
- **Truck capacity**: A standard flatbed carries approximately 20-24 tons. An order of 3000 wood units may already require multiple trips regardless of warehouse sourcing.
- **Site accessibility**: Construction sites may have limited unloading windows, making multiple deliveries more disruptive.
- **The system should present the dispatcher with a cost comparison** of all viable fulfillment scenarios before they confirm the allocation.

Source: [Bizowie - ERP for Building Materials Distributors](https://bizowie.com/erp-for-building-materials-distributors-freight-costs-units-of-measure-and-contractor-orders)

---

## Summary: Implementation Recommendations

### Data Model Requirements

```
sales_order
  |-- id, customer_id, total_qty, status, created_at

fulfillment_order (one per warehouse per sales order)
  |-- id, sales_order_id, warehouse_id, qty, status
  |-- driver_id (nullable until assigned)

inventory_reservation
  |-- id, fulfillment_order_id, product_id, warehouse_id
  |-- qty, status (SOFT_RESERVED | HARD_RESERVED | PICKED | FULFILLED | CANCELLED)
  |-- expires_at (for soft reservations)

pick_list
  |-- id, fulfillment_order_id, warehouse_id, items[], status

delivery_note
  |-- id, fulfillment_order_id, driver_id, signed_at, recipient_name
```

### Key System Behaviors

1. **Order allocation screen** shows stock availability across all warehouses with auto-suggestion.
2. **Manager confirms allocation** -> Soft reservations created atomically per warehouse.
3. **Pick lists auto-generated** per warehouse -> Soft reservation upgrades to hard reservation.
4. **Driver assignment** can be per-warehouse (Model A) or multi-pickup route (Model B).
5. **Each fulfillment order tracks independently** but rolls up to parent order status.
6. **Customer sees one order** with sub-delivery tracking per warehouse shipment.
7. **Reservation TTL** ensures abandoned allocations don't permanently lock stock.
8. **Cost comparison tool** helps dispatcher choose between split and consolidation scenarios.

### What Major ERPs Do (Comparison Matrix)

| Feature | Prophet 21 | SAP S/4HANA | NetSuite | Odoo |
|---------|-----------|-------------|----------|------|
| Auto-split orders across warehouses | Native | Via aATP/ABC | Native (minimizes splits) | Manual config required |
| Configurable sourcing rules | Yes | Yes (extensive) | Yes | Via routes/rules |
| Multi-warehouse stock visibility | Real-time | Real-time | Real-time | Real-time |
| Split shipment tracking | Native | Native | Per-location fulfillment requests | Basic |
| Freight cost calculation | Basic | Advanced | Basic | Community modules |
| Building materials specialization | Strong (distribution focus) | Via industry add-ons | General | General |
| Cost of implementation | Medium | Very High | Medium-High | Low-Medium |

---

*Research compiled: March 2026*
*Sources: SAP Community, Oracle NetSuite Documentation, Odoo Documentation, Epicor/2WTech, WeSupply Labs, Bizowie, academic research on MDPDP and multi-warehouse optimization*
