> ⚠️ **REFERENCE DOCUMENT — NOT THE SOURCE OF TRUTH**
> This file was written during the research phase and may contain outdated decisions, US-centric references, or superseded technical choices.
> **Always defer to `essential/RESEARCH.md` for current decisions.**
> Key changes since this file was written: TanStack Start (not Next.js), Capacitor (not Expo), React Aria (not shadcn), Egyptian law (not US FMCSA), EGP (not USD), dual auth pools, no online payments, no mobile wallets, spatial glass UI (not traditional dashboards).

# RESEARCH: Complete Order/Quote State Machine for B2B Building Materials Distribution

**Research Date:** 2026-03-28
**Scope:** Full quote-to-cash lifecycle state machines for a quote-based B2B building materials distributor (HyperQuote)
**Context:** No published prices. Orders $100K-$100M+. Payments offline. Multi-supplier sourcing. Construction company customers.

---

## Table of Contents

1. [Entity Relationship Map](#1-entity-relationship-map)
2. [Quote Request States](#2-quote-request-states)
3. [Quote States](#3-quote-states)
4. [Order States](#4-order-states)
5. [Supplier PO States](#5-supplier-po-states)
6. [Delivery/Shipment States](#6-deliveryshipment-states)
7. [Invoice States](#7-invoice-states)
8. [Payment States](#8-payment-states)
9. [Return/RMA States](#9-returnrma-states)
10. [Credit Note States](#10-credit-note-states)
11. [State Transitions That Trigger Actions](#11-state-transitions-that-trigger-actions)
12. [Edge Cases and Exception Handling](#12-edge-cases-and-exception-handling)
13. [ERP Reference: How SAP, NetSuite, Odoo, and commercetools Handle This](#13-erp-reference)
14. [Complete Cross-Entity State Dependency Map](#14-complete-cross-entity-state-dependency-map)

---

## 1. Entity Relationship Map

### Cardinality

```
CUSTOMER
  └── 1:N ── QUOTE REQUESTS
                └── 1:N ── QUOTES (revisions/versions)
                             └── 1:1 ── ORDER (from accepted quote)
                                          ├── 1:N ── SUPPLIER POs (one per supplier)
                                          │            └── 1:N ── DELIVERIES (partial shipments)
                                          │                         └── 1:1 ── INVOICE (per delivery)
                                          │                                      └── 1:N ── PAYMENTS (partial payments)
                                          └── 1:N ── RETURN/RMA (post-delivery)
                                                       └── 1:1 ── CREDIT NOTE
```

### Key Relationships

| Parent Entity | Child Entity | Cardinality | Notes |
|---|---|---|---|
| Customer | Quote Request | 1:N | Customer submits many requests over time |
| Quote Request | Quote | 1:N | Each negotiation round creates a new quote version |
| Quote (accepted) | Order | 1:1 | One accepted quote = one order |
| Order | Supplier PO | 1:N | One order may source from multiple suppliers |
| Supplier PO | Delivery | 1:N | Partial shipments, split deliveries |
| Delivery | Invoice | 1:1 | One invoice per delivery event |
| Invoice | Payment | 1:N | Partial payments, multiple payment methods |
| Order | Return/RMA | 1:N | Multiple return requests possible |
| Return/RMA | Credit Note | 1:1 | One credit note per approved return |
| Invoice | Credit Note | N:1 | Credit note may reference multiple invoices |

### Cross-Entity References (Foreign Keys)

```
Quote Request:  customer_id, project_id
Quote:          quote_request_id, version_number, previous_quote_id
Order:          quote_id, customer_id
Supplier PO:    order_id, supplier_id
Delivery:       supplier_po_id, order_id
Invoice:        delivery_id, order_id, customer_id
Payment:        invoice_id (or multiple invoice_ids for batch payment)
Return/RMA:     order_id, delivery_id, invoice_id
Credit Note:    return_id, invoice_id, customer_id
```

---

## 2. Quote Request States

A quote request represents a customer's material list submission before any pricing has been provided.

### State Machine

```
                                  ┌──────────────────────────────────┐
                                  │                                  │
    ┌───────┐    ┌───────────┐    │   ┌──────────────┐    ┌──────────▼──┐
    │ DRAFT │───>│ SUBMITTED │────┼──>│ UNDER REVIEW │───>│   SOURCING  │
    └───────┘    └───────────┘    │   └──────────────┘    └─────────────┘
        │              │          │          │                    │
        │              │          │          │                    │
        ▼              ▼          │          ▼                    ▼
   ┌──────────┐  ┌───────────┐   │   ┌─────────────┐    ┌──────────────┐
   │ CANCELLED│  │ WITHDRAWN │   │   │  REJECTED   │    │ QUOTE READY  │
   └──────────┘  └───────────┘   │   └─────────────┘    └──────────────┘
                                 │                              │
                                 │          ┌───────────┐       │
                                 └─────────>│  ON HOLD  │───────┘
                                            └───────────┘
```

### State Definitions

| State | Description | Entry Trigger | Who Triggers | Exit Transitions |
|---|---|---|---|---|
| **DRAFT** | Customer is assembling their material list. Incomplete. Can be saved/edited. | Customer starts new request | Customer (portal) | -> SUBMITTED (customer submits) / -> CANCELLED (customer abandons) |
| **SUBMITTED** | Customer has finalized and submitted the material list for pricing. | Customer clicks "Submit" | Customer (portal) | -> UNDER_REVIEW (sales team picks up) / -> WITHDRAWN (customer pulls back) |
| **UNDER_REVIEW** | Sales/estimating team is reviewing the material list for completeness, feasibility, and clarification needs. | Sales rep opens and claims the request | Sales Rep / Auto-assign | -> SOURCING (list is valid, proceed to get prices) / -> REJECTED (infeasible or non-serviceable) / -> ON_HOLD (awaiting customer clarification) |
| **SOURCING** | Internal procurement team is requesting prices from suppliers. RFQs sent to supplier network. | Sales/procurement initiates supplier outreach | Procurement Team | -> QUOTE_READY (all prices received, quote can be assembled) / -> ON_HOLD (supplier delays) |
| **QUOTE_READY** | All supplier prices received. Quote is ready to be assembled and sent to customer. | Last supplier price received or timeout | System / Procurement | -> Transitions to QUOTE entity (new quote created from this request) |
| **ON_HOLD** | Paused -- awaiting customer clarification, supplier response, or internal decision. | Various hold reasons | Sales Rep / System | -> UNDER_REVIEW (info received) / -> SOURCING (resumed) / -> CANCELLED (timeout or explicit cancel) |
| **REJECTED** | Request cannot be fulfilled. Reasons: outside service area, materials unavailable, customer not creditworthy. | Sales/credit team determines infeasibility | Sales Rep / Credit Team | Terminal state. Customer notified with reason. |
| **WITHDRAWN** | Customer voluntarily pulled back the request before quoting began. | Customer requests withdrawal | Customer (portal) | Terminal state. |
| **CANCELLED** | System or admin cancelled. Timeout, duplicate, or policy reason. | System timeout or admin action | System / Admin | Terminal state. |

### Quote Request Fields

- `request_id` (unique, e.g., QR-2026-00142)
- `customer_id`
- `project_name` / `project_id`
- `delivery_address` / `site_location`
- `line_items[]` (material, spec, quantity, unit, notes)
- `requested_delivery_date`
- `urgency` (standard / rush)
- `attachments[]` (drawings, specs, BOMs)
- `assigned_to` (sales rep)
- `state`
- `state_history[]` (timestamped audit trail)
- `hold_reason` (if ON_HOLD)
- `rejection_reason` (if REJECTED)
- `created_at`, `updated_at`

---

## 3. Quote States

A quote is a priced proposal sent to the customer. Multiple quote versions may exist for a single quote request (negotiation rounds).

### State Machine

```
                    ┌───────────────────────────────────────────┐
                    │            NEGOTIATION LOOP                │
                    │                                           │
    ┌───────┐    ┌──▼───────────┐    ┌────────────┐    ┌───────┴──────┐
    │ DRAFT │───>│ SENT/PENDING │───>│ NEGOTIATING│───>│ REVISED      │──┐
    └───────┘    └──────────────┘    └────────────┘    └──────────────┘  │
        │              │                   │                  │           │
        │              │                   │                  └───────────┘
        │              ▼                   ▼                       (new version)
        │        ┌───────────┐       ┌──────────┐
        │        │  ACCEPTED │       │ DECLINED │
        │        └─────┬─────┘       └──────────┘
        │              │
        │              ▼
        │        ┌──────────┐
        │        │  ORDER   │  (transitions to ORDER entity)
        │        └──────────┘
        │
        ▼
   ┌──────────┐    ┌─────────┐    ┌──────────────┐
   │ CANCELLED│    │ EXPIRED │    │ REQUIRES     │
   └──────────┘    └─────────┘    │ RE-QUOTE     │
                                  └──────────────┘
```

### State Definitions

| State | Description | Entry Trigger | Who Triggers | Exit Transitions |
|---|---|---|---|---|
| **DRAFT** | Quote is being assembled internally. Pricing, margins, terms being set. Not yet sent to customer. | Created from QUOTE_READY request, or manually | Sales Rep / System | -> SENT (send to customer) / -> CANCELLED (abandoned) |
| **SENT** | Quote has been delivered to customer. Clock starts on expiry. | Sales rep sends quote | Sales Rep | -> ACCEPTED / -> DECLINED / -> NEGOTIATING / -> EXPIRED (auto after validity period) |
| **NEGOTIATING** | Customer has responded with questions, counter-offers, or change requests. Active back-and-forth. | Customer requests changes or counters | Customer / Sales Rep | -> REVISED (new version created) / -> DECLINED (negotiation fails) |
| **REVISED** | A new version of the quote has been created in response to negotiation. Old version archived. | Sales creates new version | Sales Rep | -> SENT (new version sent) |
| **ACCEPTED** | Customer has formally accepted the quote. May require signature or PO number. | Customer accepts (portal, email, signature) | Customer | -> ORDER (auto-create order) |
| **DECLINED** | Customer explicitly rejected the quote. | Customer declines | Customer | Terminal state. May trigger follow-up task. |
| **EXPIRED** | Quote validity period elapsed without customer response. | System clock (e.g., 30 days after SENT) | System (cron job) | -> REQUIRES_RE_QUOTE (if customer later wants to proceed) / Terminal |
| **CANCELLED** | Quote cancelled by internal team. Duplicate, error, or customer relationship issue. | Admin/sales cancels | Sales Rep / Admin | Terminal state. |
| **REQUIRES_RE_QUOTE** | Supplier prices changed, market conditions shifted, or quote expired. Must be re-priced. | Supplier price update / expiry / manual flag | System / Procurement | -> DRAFT (new quote version created with fresh pricing) |

### Quote Versioning Model

```
Quote Request QR-2026-00142
  ├── Quote Q-2026-00142-v1  (EXPIRED)     -- initial quote, customer didn't respond
  ├── Quote Q-2026-00142-v2  (DECLINED)    -- re-quoted, customer countered
  ├── Quote Q-2026-00142-v3  (DECLINED)    -- revised pricing, customer still unhappy
  └── Quote Q-2026-00142-v4  (ACCEPTED)    -- final negotiated terms accepted
```

Each version is a separate record with:
- `quote_id` (unique per version)
- `quote_request_id` (links all versions)
- `version_number` (1, 2, 3...)
- `previous_version_id` (chain)
- `line_items[]` (material, qty, unit_price, margin, supplier_cost, total)
- `subtotal`, `tax`, `delivery_fee`, `total`
- `payment_terms` (Net 30, Net 60, progress billing, LC required)
- `delivery_terms` (FOB site, FOB warehouse, etc.)
- `validity_period` (days until expiry)
- `valid_until` (date)
- `notes` / `negotiation_notes`
- `customer_po_reference` (once accepted)
- `state`
- `state_history[]`
- `created_by`, `approved_by`
- `sent_at`, `accepted_at`, `expired_at`

### Partial Acceptance

For large quotes with many line items, a customer may accept some items and decline others. This is handled by:

1. **Line-item level acceptance**: Each line item gets its own accept/decline flag
2. **Quote splits**: Accepted items form one order; declined items either die or become a new quote request
3. **SAP S/4HANA 2025 approach**: Allows partial acceptance if at least one item is in Released status, with a pop-up showing all items and available quantities

---

## 4. Order States

An order is created when a customer accepts a quote. It represents the confirmed commitment to purchase.

### State Machine

```
    ┌───────────┐    ┌────────────┐    ┌───────────────┐
    │ CONFIRMED │───>│ PROCESSING │───>│ PARTIALLY     │
    └───────────┘    └────────────┘    │ FULFILLED     │
         │                │            └───────┬───────┘
         │                │                    │
         │                │                    ▼
         │                │            ┌───────────────┐
         │                └───────────>│    FULFILLED   │
         │                             └───────┬───────┘
         │                                     │
         │                                     ▼
         │                             ┌───────────────┐
         │                             │    COMPLETED   │
         │                             └───────────────┘
         │
         │     ┌────────────────┐
         ├────>│   ON HOLD      │ (credit issue, customer request, internal)
         │     └────────────────┘
         │
         │     ┌────────────────┐    ┌────────────────────────┐
         ├────>│ CANCELLATION   │───>│ CANCELLED              │
         │     │ REQUESTED      │    │ (full or partial)      │
         │     └────────────────┘    └────────────────────────┘
         │
         │     ┌────────────────┐
         └────>│ BACK ORDERED   │ (supplier stockout, production delay)
               └────────────────┘
```

### State Definitions

| State | Description | Entry Trigger | Who Triggers | Exit Transitions |
|---|---|---|---|---|
| **CONFIRMED** | Order created from accepted quote. Credit check passed. Supplier POs being generated. | Quote accepted + credit approval | System (auto from quote acceptance) | -> PROCESSING / -> ON_HOLD / -> CANCELLATION_REQUESTED |
| **PROCESSING** | Supplier POs have been placed. Materials being sourced. Internal operations in motion. | All supplier POs generated and sent | System | -> PARTIALLY_FULFILLED / -> FULFILLED / -> ON_HOLD / -> BACK_ORDERED |
| **PARTIALLY_FULFILLED** | Some deliveries completed, others pending. At least one delivery has reached customer. | First delivery confirmed | System (from delivery state) | -> FULFILLED (all deliveries done) / -> ON_HOLD / -> CANCELLATION_REQUESTED (for remaining) |
| **FULFILLED** | All line items delivered to customer. Awaiting final invoicing/payment. | Last delivery confirmed | System | -> COMPLETED |
| **COMPLETED** | All deliveries done, all invoices sent, all payments received. Order is fully closed. | Last payment received and matched | System | Terminal state. |
| **ON_HOLD** | Order paused. Reasons: credit limit exceeded, customer request, supplier issue, internal review. | Manual or system trigger | Sales / Credit / Admin | -> PROCESSING (resumed) / -> CANCELLATION_REQUESTED |
| **CANCELLATION_REQUESTED** | Cancellation initiated. May need review if supplier POs are already in progress. | Customer requests cancel or internal decision | Customer / Sales | -> CANCELLED / -> PROCESSING (cancellation denied, e.g., goods already shipped) |
| **CANCELLED** | Order fully or partially cancelled. Financial reconciliation required for any advance payments. | Cancellation approved after review | Operations Manager | Terminal state (or partial cancel keeps order in PARTIALLY_FULFILLED) |
| **BACK_ORDERED** | One or more items unavailable. Supplier stockout or production delay. Customer informed. | Supplier cannot fulfill on time | System / Procurement | -> PROCESSING (stock becomes available) / -> PARTIALLY_FULFILLED (partial ship, rest backordered) |

### Handling Complex Fulfillment Scenarios

**Multi-Supplier Orders:**
```
Order ORD-2026-00089
  ├── Supplier PO: SPO-001 (Steel from Supplier A)     -- DELIVERED
  ├── Supplier PO: SPO-002 (Concrete from Supplier B)  -- IN TRANSIT
  └── Supplier PO: SPO-003 (Lumber from Supplier C)    -- CONFIRMED, not yet shipped

Order Status: PARTIALLY_FULFILLED
  (because SPO-001 delivered, SPO-002 and SPO-003 still pending)
```

**Split Deliveries:**
```
Supplier PO: SPO-002 (100 tons concrete)
  ├── Delivery DEL-001: 40 tons  -- DELIVERED
  ├── Delivery DEL-002: 35 tons  -- IN TRANSIT
  └── Delivery DEL-003: 25 tons  -- SCHEDULED (next week)

Supplier PO Status: PARTIALLY_DELIVERED
```

**Backorder Handling:**
```
Order line: 500 steel beams
  ├── 300 available now → Ship immediately
  └── 200 backordered → New delivery date estimated

System creates:
  ├── Delivery DEL-001: 300 beams (immediate)
  └── Delivery DEL-002: 200 beams (backordered, ETA 2 weeks)
```

### Order Fields

- `order_id` (e.g., ORD-2026-00089)
- `quote_id` (source quote)
- `customer_id`
- `customer_po_number` (customer's internal PO reference)
- `line_items[]` (material, qty, unit_price, total, fulfilled_qty, backordered_qty)
- `order_total`, `tax`, `shipping_estimate`
- `payment_terms`
- `delivery_address`
- `requested_delivery_date`
- `state`
- `state_history[]`
- `hold_reason` (if ON_HOLD)
- `cancellation_reason` (if CANCELLED)
- `cancellation_fee` (if applicable, 5-25% of order value per industry standard)
- `assigned_sales_rep`
- `assigned_ops_coordinator`
- `created_at`, `confirmed_at`, `completed_at`

---

## 5. Supplier PO States

A Supplier PO is created when the internal procurement team orders materials from a supplier to fulfill a customer order.

### State Machine

```
    ┌───────┐    ┌──────┐    ┌───────────┐    ┌──────────────┐
    │ DRAFT │───>│ SENT │───>│ CONFIRMED │───>│ IN PRODUCTION│
    └───────┘    └──────┘    └───────────┘    └──────┬───────┘
                    │              │                   │
                    │              │                   ▼
                    │              │           ┌───────────────┐
                    │              │           │    SHIPPED     │
                    │              │           └───────┬───────┘
                    │              │                   │
                    │              │                   ▼
                    │              │           ┌───────────────┐    ┌───────────┐
                    │              │           │   RECEIVED    │───>│ INSPECTED │
                    │              │           └───────────────┘    └─────┬─────┘
                    │              │                                      │
                    │              │                                      ▼
                    │              │                               ┌──────────────┐
                    │              │                               │   CLOSED     │
                    │              │                               └──────────────┘
                    │              │
                    ▼              ▼
              ┌──────────┐  ┌──────────────┐
              │ REJECTED │  │ CANCELLED    │
              │(by suppl)│  │(by us)       │
              └──────────┘  └──────────────┘

              ┌────────────────────┐
              │ PARTIALLY RECEIVED │ (split deliveries from supplier)
              └────────────────────┘
```

### State Definitions

| State | Description | Entry Trigger | Who Triggers | Exit Transitions |
|---|---|---|---|---|
| **DRAFT** | PO being prepared internally. Quantities, prices, terms being finalized. | Auto-generated from confirmed order, or manual creation | System / Procurement | -> SENT (transmit to supplier) / -> CANCELLED |
| **SENT** | PO transmitted to supplier (email, EDI, portal). Awaiting supplier acknowledgment. | Procurement sends PO | Procurement Team | -> CONFIRMED (supplier accepts) / -> REJECTED (supplier declines) / -> CANCELLED |
| **CONFIRMED** | Supplier acknowledged the PO and committed to fulfilling it. Delivery date confirmed. | Supplier sends confirmation | Supplier (via email/portal) | -> IN_PRODUCTION / -> SHIPPED (if from stock) / -> CANCELLED |
| **IN_PRODUCTION** | Supplier is manufacturing/fabricating the materials. Relevant for custom or made-to-order items. | Supplier notifies production start | Supplier | -> SHIPPED |
| **SHIPPED** | Supplier has dispatched the goods. Tracking info provided. | Supplier provides shipping confirmation | Supplier | -> RECEIVED / -> PARTIALLY_RECEIVED |
| **PARTIALLY_RECEIVED** | Some items received at warehouse. Remaining items still en route or backordered by supplier. | Warehouse confirms partial receipt | Warehouse Team | -> RECEIVED (rest arrives) |
| **RECEIVED** | All goods received at warehouse/staging area. Pending quality inspection. | Warehouse confirms full receipt | Warehouse Team | -> INSPECTED |
| **INSPECTED** | Quality check completed. Materials accepted into inventory or flagged for issues. | QC team completes inspection | Quality Control | -> CLOSED (if passed) / triggers RETURN to supplier (if failed) |
| **CLOSED** | PO fully fulfilled and reconciled. Invoice from supplier matched. | Inspection passed + supplier invoice matched | System | Terminal state. |
| **REJECTED** | Supplier declined the PO. Cannot fulfill at quoted price/quantity/timeline. | Supplier response | Supplier | Terminal. Triggers re-sourcing from alternative supplier. |
| **CANCELLED** | PO cancelled by internal team. Customer order changed, or better supplier found. | Internal decision | Procurement / Ops Manager | Terminal. May incur cancellation fees from supplier. |

### Supplier PO to Customer Order Status Mapping

```
Supplier PO State         →  Customer Order State Impact
─────────────────────────────────────────────────────────
All POs DRAFT/SENT        →  Order: CONFIRMED
All POs CONFIRMED         →  Order: PROCESSING
Any PO REJECTED           →  Order: ON_HOLD (need re-sourcing)
Any PO SHIPPED            →  Order: PROCESSING (in transit)
Any PO RECEIVED           →  Order: PARTIALLY_FULFILLED (if multi-PO)
All POs CLOSED            →  Order: FULFILLED
```

### Supplier PO Fields

- `supplier_po_id` (e.g., SPO-2026-00201)
- `order_id` (parent customer order)
- `supplier_id`
- `line_items[]` (material, qty, unit_cost, total)
- `po_total`
- `payment_terms` (to supplier)
- `expected_ship_date`
- `expected_delivery_date`
- `actual_ship_date`
- `actual_delivery_date`
- `tracking_numbers[]`
- `shipping_method` (LTL, FTL, flatbed, etc.)
- `state`
- `state_history[]`
- `supplier_reference_number`
- `inspection_result` (PASS / FAIL / CONDITIONAL)
- `inspection_notes`
- `created_at`, `sent_at`, `confirmed_at`, `received_at`, `closed_at`

---

## 6. Delivery/Shipment States

A delivery represents a physical shipment of materials from warehouse/supplier to the customer's construction site.

### State Machine

```
    ┌───────────┐    ┌───────────┐    ┌────────────┐    ┌───────────┐
    │ SCHEDULED │───>│ PICKING/  │───>│ DISPATCHED │───>│ IN TRANSIT│
    └───────────┘    │ LOADING   │    └────────────┘    └─────┬─────┘
         │           └───────────┘          │                  │
         │                                  │                  ▼
         │                                  │          ┌──────────────┐
         │                                  │          │  AT SITE     │
         │                                  │          │ (arrived)    │
         │                                  │          └──────┬───────┘
         │                                  │                 │
         │                                  │                 ▼
         │                                  │          ┌──────────────┐
         │                                  │          │  DELIVERED   │
         │                                  │          │ (POD signed) │
         │                                  │          └──────────────┘
         │                                  │
         ▼                                  ▼
    ┌───────────┐                    ┌──────────────┐
    │ CANCELLED │                    │    FAILED    │
    └───────────┘                    └──────┬───────┘
                                           │
                                           ▼
                                    ┌──────────────┐
                                    │ RESCHEDULED  │──> (back to SCHEDULED)
                                    └──────────────┘

    ┌────────────────┐
    │ PARTIALLY      │  (some items delivered, rest on next trip)
    │ DELIVERED      │
    └────────────────┘

    ┌────────────────┐
    │ RETURNED       │  (delivery rejected by customer at site)
    └────────────────┘
```

### State Definitions

| State | Description | Entry Trigger | Who Triggers | Exit Transitions |
|---|---|---|---|---|
| **SCHEDULED** | Delivery date and time window confirmed. Assigned to route/driver. | Supplier PO received or inventory confirmed | Dispatch / System | -> PICKING_LOADING / -> CANCELLED / -> RESCHEDULED |
| **PICKING_LOADING** | Warehouse team picking items and loading onto vehicle. | Day-of-delivery, pickup window begins | Warehouse Team | -> DISPATCHED |
| **DISPATCHED** | Vehicle has left warehouse/supplier. Driver has manifest. | Driver confirms departure (driver app) | Driver (app) | -> IN_TRANSIT |
| **IN_TRANSIT** | En route to delivery site. GPS tracking active. | Vehicle on the road | System (GPS) | -> AT_SITE / -> FAILED (accident, breakdown, route blocked) |
| **AT_SITE** | Vehicle arrived at construction site. Awaiting unloading. | GPS geofence trigger or driver check-in | Driver (app) / GPS | -> DELIVERED / -> PARTIALLY_DELIVERED / -> RETURNED |
| **DELIVERED** | All items unloaded, POD signed by customer rep on site. Photos taken. | Customer signs POD in driver app | Driver + Customer (app) | Terminal. Triggers invoice generation. |
| **PARTIALLY_DELIVERED** | Some items delivered, others refused or couldn't be unloaded (site not ready, wrong items, damage). | Driver records partial delivery in app | Driver (app) | Remaining items -> new SCHEDULED delivery or RETURNED |
| **FAILED** | Delivery could not be completed. Site inaccessible, customer not present, vehicle breakdown. | Driver reports failure in app | Driver (app) | -> RESCHEDULED |
| **RESCHEDULED** | Failed or postponed delivery reassigned to new date. | Dispatch reschedules | Dispatch Team | -> SCHEDULED (new date) |
| **RETURNED** | Customer rejected delivery at site. Quality issue, wrong materials, site not ready. | Customer refuses, driver records | Driver (app) | Triggers return inspection and potential credit note |
| **CANCELLED** | Delivery cancelled before dispatch. Order changed or cancelled. | Internal cancellation | Dispatch / Sales | Terminal state. |

### Driver App Interactions

The driver app is the primary interface for delivery state transitions in the field:

| Driver App Action | State Transition | Data Captured |
|---|---|---|
| "Start Route" | PICKING_LOADING -> DISPATCHED | Departure time, vehicle ID, manifest confirmation |
| GPS tracking | DISPATCHED -> IN_TRANSIT | Continuous location, ETA updates |
| "Arrived at Site" | IN_TRANSIT -> AT_SITE | Arrival time, GPS coordinates, site photos |
| "Complete Delivery" | AT_SITE -> DELIVERED | POD signature, delivery photos, item count confirmation |
| "Partial Delivery" | AT_SITE -> PARTIALLY_DELIVERED | Items delivered, items refused, reason, photos |
| "Delivery Failed" | IN_TRANSIT/AT_SITE -> FAILED | Failure reason, photos, notes |
| "Customer Refused" | AT_SITE -> RETURNED | Refusal reason, condition photos, customer name |

### Delivery Fields

- `delivery_id` (e.g., DEL-2026-00567)
- `order_id`
- `supplier_po_id`
- `line_items[]` (material, expected_qty, delivered_qty, refused_qty)
- `delivery_address`
- `scheduled_date`, `scheduled_time_window`
- `driver_id`, `vehicle_id`
- `route_id`
- `state`
- `state_history[]`
- `pod_signature` (base64 or file reference)
- `pod_photos[]`
- `pod_signed_by` (name of customer rep)
- `gps_coordinates_delivered`
- `delivery_notes`
- `failure_reason` (if FAILED)
- `return_reason` (if RETURNED)
- `created_at`, `dispatched_at`, `delivered_at`

---

## 7. Invoice States

An invoice is generated when materials are delivered to the customer. One invoice per delivery event.

### State Machine

```
    ┌───────┐    ┌──────┐    ┌─────────┐    ┌────────────────┐
    │ DRAFT │───>│ SENT │───>│ VIEWED  │───>│ PARTIALLY PAID │
    └───────┘    └──────┘    └─────────┘    └────────┬───────┘
                    │              │                   │
                    │              │                   ▼
                    │              │            ┌──────────┐
                    │              └───────────>│   PAID   │
                    │                          └──────────┘
                    │
                    ▼
              ┌──────────┐    ┌──────────────┐
              │ OVERDUE  │───>│ COLLECTIONS  │
              └──────────┘    └──────────────┘

    ┌──────────┐    ┌───────────┐    ┌──────────────┐
    │ DISPUTED │───>│ RESOLVED  │───>│ ADJUSTED     │
    └──────────┘    └───────────┘    │(credit note) │
                                     └──────────────┘

    ┌───────────┐    ┌──────────────┐
    │ CANCELLED │    │ WRITTEN OFF  │
    └───────────┘    └──────────────┘
```

### State Definitions

| State | Description | Entry Trigger | Who Triggers | Exit Transitions |
|---|---|---|---|---|
| **DRAFT** | Invoice generated from delivery confirmation. Being reviewed before sending. | Delivery marked DELIVERED | System (auto) | -> SENT (after review) / -> CANCELLED (error) |
| **SENT** | Invoice transmitted to customer (email, portal, mail). Payment clock starts. | Finance team approves and sends | Finance / System | -> VIEWED / -> PARTIALLY_PAID / -> PAID / -> OVERDUE / -> DISPUTED |
| **VIEWED** | Customer has opened/viewed the invoice (email tracking or portal login). | Customer opens invoice | System (tracking) | -> PARTIALLY_PAID / -> PAID / -> OVERDUE / -> DISPUTED |
| **PARTIALLY_PAID** | Some payment received but balance remains. | Payment received < invoice total | System (payment matching) | -> PAID (remaining received) / -> OVERDUE (past due date) |
| **PAID** | Full payment received and matched. | Payment(s) = invoice total | System (payment matching) | Terminal state. |
| **OVERDUE** | Payment not received by due date. | System clock (due date + grace period) | System (cron) | -> PAID / -> PARTIALLY_PAID / -> COLLECTIONS / -> DISPUTED |
| **COLLECTIONS** | Escalated to collections process. Multiple reminders sent, now formal collection action. | Overdue > threshold (e.g., 60+ days) | AR Team / System | -> PAID / -> WRITTEN_OFF |
| **DISPUTED** | Customer contests the invoice. Quantity discrepancy, quality issue, pricing disagreement. | Customer raises dispute | Customer / AR Team | -> RESOLVED |
| **RESOLVED** | Dispute investigated and resolved. May result in adjustment. | Dispute resolution completed | AR Team / Manager | -> ADJUSTED (credit note issued) / -> SENT (dispute invalid, original stands) |
| **ADJUSTED** | Invoice amount changed via credit note. New balance calculated. | Credit note applied | Finance | -> PAID / -> PARTIALLY_PAID / -> OVERDUE |
| **CANCELLED** | Invoice voided. Incorrect invoice, order cancelled, or duplicate. | Manual cancellation | Finance Manager | Terminal state. Requires new invoice if needed. |
| **WRITTEN_OFF** | Deemed uncollectible. Bad debt. | Management approval after extended collections | Finance Director | Terminal state. |

### Invoice Generation Triggers

| Trigger Event | Invoice Type | When Used |
|---|---|---|
| Delivery confirmed (POD signed) | **Standard invoice** | Most common. Invoice on delivery. |
| Goods shipped (before delivery) | **Ship-and-bill invoice** | When contract terms allow billing on shipment |
| Milestone reached | **Progress invoice** | Large projects with progress billing terms |
| Periodic (monthly) | **Consolidated invoice** | High-volume customers with multiple deliveries per period |

### Invoice Fields

- `invoice_id` (e.g., INV-2026-00834)
- `order_id`
- `delivery_id`
- `customer_id`
- `line_items[]` (material, qty_delivered, unit_price, line_total)
- `subtotal`, `tax`, `delivery_charges`, `total`
- `amount_paid`, `balance_due`
- `payment_terms` (Net 30, Net 60, etc.)
- `due_date`
- `state`
- `state_history[]`
- `dispute_reason` (if DISPUTED)
- `dispute_resolution` (if RESOLVED)
- `credit_note_ids[]` (if ADJUSTED)
- `reminder_count` (number of payment reminders sent)
- `last_reminder_date`
- `created_at`, `sent_at`, `due_at`, `paid_at`

---

## 8. Payment States

Payments are received offline (wire transfer, check, letter of credit) and must be manually or semi-automatically matched to invoices.

### State Machine

```
    ┌──────────┐    ┌───────────┐    ┌─────────┐    ┌────────────────┐
    │ EXPECTED │───>│ RECEIVED  │───>│ MATCHED │───>│ FULLY APPLIED  │
    └──────────┘    └───────────┘    └─────────┘    └────────────────┘
                         │                │
                         │                ▼
                         │         ┌────────────────┐
                         │         │PARTIALLY APPLIED│
                         │         └────────────────┘
                         │
                         ▼
                   ┌───────────┐
                   │UNMATCHED  │ (payment received, can't identify invoice)
                   └───────────┘

    ┌──────────┐    ┌──────────┐    ┌──────────┐
    │ BOUNCED  │    │ REVERSED │    │ REFUNDED │
    └──────────┘    └──────────┘    └──────────┘

    ┌──────────────┐
    │ OVERPAYMENT  │  (excess applied as credit or refunded)
    └──────────────┘
```

### State Definitions

| State | Description | Entry Trigger | Who Triggers | Exit Transitions |
|---|---|---|---|---|
| **EXPECTED** | Payment anticipated based on invoice terms. Not yet received. | Invoice SENT | System | -> RECEIVED / -> (remains EXPECTED until overdue) |
| **RECEIVED** | Bank confirms funds received. Not yet matched to specific invoice(s). | Bank statement import or manual entry | Finance / System | -> MATCHED / -> UNMATCHED |
| **MATCHED** | Payment identified and linked to specific invoice(s). | Auto-match (reference number) or manual match | System / AR Team | -> FULLY_APPLIED / -> PARTIALLY_APPLIED / -> OVERPAYMENT |
| **FULLY_APPLIED** | Payment fully consumed against one or more invoices. All invoices balanced. | Payment amount = invoice balance(s) | System | Terminal state. |
| **PARTIALLY_APPLIED** | Payment applied but doesn't cover full invoice balance. More payment expected. | Payment < invoice balance | System / AR Team | -> FULLY_APPLIED (additional payment received) |
| **OVERPAYMENT** | Payment exceeds invoice total. Excess needs to be credited or refunded. | Payment > invoice balance | System | -> FULLY_APPLIED (excess applied to another invoice) / -> REFUNDED |
| **UNMATCHED** | Payment received but cannot be identified. Missing reference, wrong amount, unknown payer. | No matching reference found | System | -> MATCHED (manual investigation resolves) |
| **BOUNCED** | Check bounced or wire transfer reversed by bank. | Bank notification | Bank / System | Invoice reverts to SENT/OVERDUE. Customer notified. |
| **REVERSED** | Payment reversed due to error or fraud. | Bank or internal reversal | Finance | Invoice reverts to previous state. |
| **REFUNDED** | Overpayment or cancelled order -- funds returned to customer. | Refund approved | Finance Manager | Terminal state. |

### Payment Method-Specific States

**Wire Transfer:**
```
INITIATED → PROCESSING (1-3 business days) → SETTLED → MATCHED → APPLIED
                                                  ↓
                                             FAILED (wrong account, sanctions check)
```

**Check:**
```
RECEIVED → DEPOSITED → CLEARING (3-7 business days) → CLEARED → MATCHED → APPLIED
                                                           ↓
                                                       BOUNCED (NSF)
```

**Letter of Credit:**
```
LC ISSUED → LC ADVISED → LC CONFIRMED → DOCUMENTS PRESENTED →
DOCUMENTS ACCEPTED → PAYMENT RELEASED → SETTLED → MATCHED → APPLIED
     ↓                                       ↓
LC AMENDED                              DISCREPANCY (documents don't match LC terms)
     ↓                                       ↓
LC EXPIRED                              DOCUMENTS REJECTED → CORRECTED → RE-PRESENTED
```

### Payment Fields

- `payment_id` (e.g., PAY-2026-01203)
- `invoice_ids[]` (can pay multiple invoices at once)
- `customer_id`
- `amount`
- `currency`
- `payment_method` (WIRE, CHECK, LC, ACH)
- `reference_number` (wire ref, check number, LC number)
- `bank_reference`
- `received_date`
- `cleared_date`
- `state`
- `state_history[]`
- `applied_amounts[]` (how much applied to each invoice)
- `unapplied_amount` (remaining to allocate)
- `notes`
- `reconciled_by`
- `created_at`

---

## 9. Return/RMA States

Returns handle post-delivery quality issues, wrong materials, or customer-initiated returns.

### State Machine

```
    ┌───────────┐    ┌──────────┐    ┌───────────┐    ┌───────────────┐
    │ REQUESTED │───>│ APPROVED │───>│ PICKUP    │───>│ RECEIVED      │
    └───────────┘    └──────────┘    │ SCHEDULED │    │ (at warehouse)│
         │                           └───────────┘    └───────┬───────┘
         │                                                    │
         ▼                                                    ▼
    ┌───────────┐                                     ┌───────────────┐
    │ DENIED    │                                     │ INSPECTED     │
    └───────────┘                                     └───────┬───────┘
                                                              │
                                                   ┌──────────┼──────────┐
                                                   ▼          ▼          ▼
                                            ┌──────────┐ ┌─────────┐ ┌──────────┐
                                            │ CREDIT   │ │REPLACE- │ │ REJECTED │
                                            │ APPROVED │ │ MENT    │ │ (not our │
                                            └──────────┘ │ ORDERED │ │  fault)  │
                                                         └─────────┘ └──────────┘
```

### State Definitions

| State | Description | Entry Trigger | Who Triggers |
|---|---|---|---|
| **REQUESTED** | Customer reports issue and requests return. Must provide photos, description. | Customer submits return request | Customer (portal) / Sales |
| **APPROVED** | Return request reviewed and approved. RMA number issued. | Operations reviews and approves | Operations / Quality Team |
| **DENIED** | Return request denied. Outside return window, customer caused damage, etc. | Operations reviews and denies | Operations Manager |
| **PICKUP_SCHEDULED** | Return pickup arranged. Driver/carrier assigned. | Dispatch schedules pickup | Dispatch |
| **RECEIVED** | Returned materials received at warehouse. | Warehouse confirms receipt | Warehouse Team |
| **INSPECTED** | Quality team inspects returned materials. | QC inspection completed | Quality Control |
| **CREDIT_APPROVED** | Inspection confirms issue. Credit note to be issued. | QC confirms defect/issue | Quality / Finance |
| **REPLACEMENT_ORDERED** | Customer prefers replacement over credit. New materials being sourced. | Customer request + approval | Sales / Operations |
| **REJECTED** | Inspection finds no defect, or customer caused the damage. Return not honored. | QC inspection finds no fault | Quality Control |

---

## 10. Credit Note States

Credit notes reduce a customer's outstanding balance due to returns, disputes, or pricing adjustments.

### State Machine

```
    ┌───────┐    ┌──────────────┐    ┌────────────┐    ┌─────────┐
    │ DRAFT │───>│ APPROVED     │───>│ ISSUED     │───>│ APPLIED │
    └───────┘    └──────────────┘    └────────────┘    └─────────┘
        │                                  │
        ▼                                  ▼
    ┌───────────┐                   ┌──────────────┐
    │ CANCELLED │                   │ PARTIALLY    │
    └───────────┘                   │ APPLIED      │
                                    └──────────────┘
```

| State | Description | Entry Trigger |
|---|---|---|
| **DRAFT** | Credit note being prepared. Linked to return/dispute. | Return approved or dispute resolved |
| **APPROVED** | Reviewed and authorized by finance manager. | Finance manager approval |
| **ISSUED** | Sent to customer. Reduces their AR balance. | Finance issues credit note |
| **APPLIED** | Fully offset against outstanding invoice(s). | Applied to invoice(s) |
| **PARTIALLY_APPLIED** | Part of credit used. Remainder available. | Partial application |
| **CANCELLED** | Voided. Issued in error. | Finance manager cancels |

---

## 11. State Transitions That Trigger Actions

### Automated Actions Matrix

| Entity | From State | To State | Automated Action(s) |
|---|---|---|---|
| **Quote** | ACCEPTED | - | Create ORDER. Run credit check. Notify operations. |
| **Order** | CONFIRMED | PROCESSING | Auto-generate SUPPLIER POs for each supplier. Notify procurement. |
| **Order** | - | ON_HOLD | Pause all related supplier POs. Notify customer. |
| **Order** | ON_HOLD | PROCESSING | Resume all supplier POs. Notify suppliers. |
| **Order** | - | CANCELLED | Cancel all unfulfilled supplier POs. Calculate cancellation fees. Refund any advance payments. |
| **Supplier PO** | DRAFT | SENT | Transmit PO to supplier (email/EDI). Start acknowledgment timer. |
| **Supplier PO** | SENT | - (no response in 48h) | Auto-escalation alert to procurement. |
| **Supplier PO** | CONFIRMED | - | Update order ETA. Notify customer of expected delivery date. |
| **Supplier PO** | REJECTED | - | Alert procurement. Flag order as AT_RISK. Initiate re-sourcing. |
| **Supplier PO** | SHIPPED | - | Update order tracking. Create DELIVERY record in SCHEDULED state. Notify customer. |
| **Supplier PO** | RECEIVED | - | Trigger quality inspection workflow. Update inventory. |
| **Delivery** | SCHEDULED | - | Assign driver/vehicle. Add to route. Notify customer of delivery window. |
| **Delivery** | DISPATCHED | - | Send customer real-time tracking link. Update order status. |
| **Delivery** | DELIVERED | - | **Auto-generate INVOICE.** Update order fulfilled quantities. Update supplier PO received quantities. |
| **Delivery** | FAILED | - | Alert dispatch. Create rescheduling task. Notify customer. |
| **Delivery** | RETURNED | - | Create RETURN/RMA record. Alert quality team. Notify sales rep. |
| **Invoice** | DRAFT | SENT | Email invoice to customer. Start payment terms clock. Create EXPECTED payment record. |
| **Invoice** | SENT | OVERDUE | Send payment reminder (automated). Alert AR team. |
| **Invoice** | OVERDUE | - (30 days) | Send second reminder. Escalate to AR manager. |
| **Invoice** | OVERDUE | - (60 days) | Send formal demand letter. Consider credit hold on customer account. |
| **Invoice** | OVERDUE | COLLECTIONS | Engage collections process. Freeze customer credit. |
| **Payment** | RECEIVED | MATCHED | Auto-match by reference number. Update invoice balance. |
| **Payment** | MATCHED | FULLY_APPLIED | Mark invoice as PAID. Update customer AR balance. Update order completion status. |
| **Payment** | - | BOUNCED | Revert invoice to OVERDUE. Notify customer. Add bounced check fee. |
| **Return** | CREDIT_APPROVED | - | Auto-generate CREDIT NOTE in DRAFT state. |
| **Credit Note** | ISSUED | - | Apply to oldest outstanding invoice(s). Update customer AR balance. |

### Notification Matrix

| Event | Customer Notified | Sales Rep Notified | Operations Notified | Finance Notified |
|---|---|---|---|---|
| Quote sent | Yes (email + portal) | Yes | No | No |
| Quote accepted | Yes (confirmation) | Yes | Yes (start fulfillment) | Yes (credit check) |
| Order confirmed | Yes | Yes | Yes | No |
| Supplier PO rejected | No (internal) | Yes (risk alert) | Yes | No |
| Delivery scheduled | Yes (date + window) | Yes | Yes | No |
| Delivery dispatched | Yes (tracking link) | No | Yes | No |
| Delivery completed | Yes (POD receipt) | Yes | Yes | Yes (trigger invoice) |
| Invoice sent | Yes (invoice) | Yes | No | Yes |
| Payment received | Yes (receipt) | Yes | No | Yes |
| Invoice overdue | Yes (reminder) | Yes (alert) | No | Yes (escalation) |
| Return approved | Yes (RMA number) | Yes | Yes (pickup) | Yes (credit pending) |

---

## 12. Edge Cases and Exception Handling

### Edge Case 1: Customer Cancels After Supplier PO Placed

```
SCENARIO: Customer accepted quote, order confirmed, supplier POs sent and confirmed.
          Customer now wants to cancel.

HANDLING:
1. Order → CANCELLATION_REQUESTED
2. Check each Supplier PO state:
   a. If PO is DRAFT/SENT (not confirmed) → Cancel PO at no cost
   b. If PO is CONFIRMED → Contact supplier. Cancellation fee applies (5-25%)
   c. If PO is IN_PRODUCTION → Higher cancellation fee. May not be cancellable.
   d. If PO is SHIPPED → Cannot cancel. Accept delivery, handle as return.
   e. If PO is RECEIVED → Handle as return to supplier.
3. Calculate total cancellation fees across all POs
4. Present cancellation fee to customer for approval
5. If customer approves fees → Order → CANCELLED. Generate cancellation invoice.
6. If customer rejects fees → Order remains CONFIRMED. Discuss alternatives.

FINANCIAL:
- Cancellation fee invoice generated for supplier costs that cannot be recovered
- Any advance payments credited minus cancellation fees
- Record cancellation reason for analytics
```

### Edge Case 2: Supplier Cannot Fulfill

```
SCENARIO: Supplier PO confirmed, but supplier reports they cannot deliver
          (stockout, production issue, force majeure).

HANDLING:
1. Supplier PO → REJECTED (post-confirmation failure) or remains CONFIRMED with exception flag
2. Procurement identifies alternative suppliers
3. New Supplier PO created with alternative supplier (may have different pricing)
4. If new supplier costs more:
   a. Option A: Absorb cost difference (margin hit)
   b. Option B: Requote customer (only if significant difference)
   c. Option C: Partial fulfillment with available quantities
5. Customer notified of delay with new ETA
6. Order delivery date updated
7. If no alternative supplier available:
   a. Order line item cancelled
   b. Partial order fulfillment
   c. Credit note for unfulfillable items
```

### Edge Case 3: Partial Delivery Accepted by Customer

```
SCENARIO: 100 tons ordered. Truck arrives with 70 tons (30 tons damaged in transit).

HANDLING:
1. Driver records PARTIALLY_DELIVERED in app
2. POD signed for 70 tons (with photos of damage)
3. System creates:
   a. Invoice for 70 tons (delivered and accepted)
   b. Delivery exception record for 30 tons
4. 30 tons damaged:
   a. If our truck/responsibility → Insurance claim + replacement delivery scheduled
   b. If supplier's truck → Claim against supplier + replacement from supplier
5. New delivery scheduled for replacement 30 tons
6. Order remains PARTIALLY_FULFILLED until replacement delivered
```

### Edge Case 4: Customer Disputes Quality After Delivery

```
SCENARIO: Customer accepted delivery (POD signed) but later discovers quality issues
          (wrong grade of steel, concrete doesn't meet spec, etc.)

HANDLING:
1. Customer submits dispute (portal or sales rep)
2. Invoice → DISPUTED
3. Quality team dispatched to site for inspection
4. Inspection outcome:
   a. VALID CLAIM:
      - Return/RMA initiated
      - Credit note issued for defective materials
      - Replacement order created if needed
      - Supplier back-charged if their fault
   b. INVALID CLAIM:
      - Documentation provided to customer
      - Invoice remains, DISPUTED → RESOLVED → reverts to SENT
   c. PARTIAL CLAIM:
      - Credit note for portion
      - Remainder of invoice stands
5. Dispute resolution recorded for future reference
```

### Edge Case 5: Customer Wants to Return Materials

```
SCENARIO: Materials delivered and accepted, but customer's project cancelled
          or plans changed. Wants to return unused materials.

HANDLING:
1. Check return policy:
   - Standard materials (stock items): Returnable within 30 days, 15-25% restocking fee
   - Custom/fabricated materials: Non-returnable
   - Opened/used materials: Non-returnable
2. If returnable:
   a. RMA issued with restocking fee
   b. Pickup scheduled
   c. Materials inspected on receipt
   d. Credit note issued (minus restocking fee)
   e. Materials returned to inventory or sent back to supplier
3. Financial:
   - Original invoice adjusted or credit note issued
   - Restocking fee retained as revenue
```

### Edge Case 6: Quote Expires During Negotiation

```
SCENARIO: Quote sent with 30-day validity. Customer is negotiating but hasn't
          accepted by day 31.

HANDLING:
1. System auto-transitions quote to EXPIRED on day 31
2. Customer notified: "Quote expired. Prices subject to change."
3. If customer wants to proceed:
   a. Sales checks if supplier prices still valid
   b. If prices unchanged → New quote version with fresh validity period
   c. If prices changed → REQUIRES_RE_QUOTE → Full re-sourcing cycle
4. New quote version created referencing original request
5. Version chain maintained for audit trail
```

### Edge Case 7: Supplier Raises Price After Quote Sent to Customer

```
SCENARIO: Quote sent to customer at $500K based on supplier cost of $400K.
          Supplier now says materials cost $450K (price increase notification).

HANDLING:
Options depend on quote state and contractual terms:

1. If quote NOT YET ACCEPTED:
   a. Option A: Honor original quote, absorb margin reduction ($500K - $450K = $50K margin vs original $100K)
   b. Option B: Send updated quote with new pricing. Customer may decline.
   c. Option C: Requote with alternative supplier at original price point

2. If quote ALREADY ACCEPTED (order exists):
   a. If order terms have price escalation clause → Notify customer of adjustment
   b. If no escalation clause → Absorb cost increase (contractual obligation)
   c. If increase is extreme (force majeure) → Negotiate with customer

3. Prevention:
   - Quote validity tied to supplier price validity
   - Lock supplier prices when sending customer quote
   - Include price escalation clauses in customer terms for volatile materials
```

### Edge Case 8: Multi-Currency Supplier Payment

```
SCENARIO: Customer pays in USD. Supplier charges in EUR.
          Exchange rate fluctuates between quote and payment.

HANDLING:
1. Quote to customer in customer currency (USD)
2. Supplier PO in supplier currency (EUR)
3. At time of quoting: Lock exchange rate or add FX buffer (2-5%)
4. At time of payment: Actual FX rate may differ
5. FX gain/loss recorded as financial adjustment
6. For large orders: Consider FX hedging (forward contracts)
```

---

## 13. ERP Reference

### SAP S/4HANA Sales & Distribution

**Document Flow (complete chain):**
```
Inquiry → Quotation → Sales Order → Delivery → Goods Issue → Billing → Payment → (Returns → Credit Memo)
```

**Sales Order Status Fields:**
- Overall Status: Open / In Process / Completed
- Delivery Status: Not Delivered / Partially Delivered (B) / Fully Delivered (C)
- Billing Status: Not Billed / Partially Billed / Fully Billed
- Overall Block Status: Not Blocked / Blocked (credit, delivery, billing blocks)
- Rejection Status: Not Rejected / Partially Rejected / Fully Rejected

**Purchase Order Status (SAP MM):**
- In Preparation → In Approval → Sent → Not Yet Acknowledged → Acknowledged → Follow-Up Document Created → Finished
- Delivery Status: Not Delivered / Partially Delivered / Fully Delivered
- Invoice Status: Not Invoiced / Partially Invoiced / Fully Invoiced

**SAP 2025 Notable Feature:** Partial quote acceptance -- accept some line items while leaving others open.

### NetSuite

**Sales Order Statuses (with Advanced Shipping):**

| Code | Status | Description |
|---|---|---|
| SalesOrd:A | Pending Approval | Not yet approved |
| SalesOrd:B | Pending Fulfillment | Approved, awaiting shipment |
| SalesOrd:C | Cancelled | Terminal, cannot be undone |
| SalesOrd:D | Partially Fulfilled | Some items shipped |
| SalesOrd:E | Pending Billing/Partially Fulfilled | Partially shipped, billing pending |
| SalesOrd:F | Pending Billing | Fully shipped, awaiting invoice |
| SalesOrd:G | Billed | Complete |
| SalesOrd:H | Closed | Manually closed |

**Purchase Order Statuses:**

| Code | Status |
|---|---|
| PurchOrd:A | Pending Supervisor Approval |
| PurchOrd:B | Pending Receipt |
| PurchOrd:C | Rejected by Supervisor |
| PurchOrd:D | Partially Received |
| PurchOrd:E | Pending Billing/Partially Received |
| PurchOrd:F | Pending Bill |
| PurchOrd:G | Fully Billed |
| PurchOrd:H | Closed |

**Estimate/Quote Statuses:**

| Code | Status |
|---|---|
| Estimate:A | Open |
| Estimate:B | Processed (converted to order) |
| Estimate:C | Closed |
| Estimate:V | Voided |
| Estimate:X | Expired |

**Invoice Statuses:**

| Code | Status |
|---|---|
| CustInvc:A | Open |
| CustInvc:B | Paid In Full |
| CustInvc:D | Pending Approval |

**Key NetSuite Insight:** Statuses are system-controlled and cannot be changed manually. The available statuses depend on whether the Advanced Shipping feature is enabled.

### Odoo 18/19

**Sales Order States:**

| State | Label | Description |
|---|---|---|
| draft | Quotation | Initial state, being prepared |
| sent | Quotation Sent | Sent to customer |
| sale | Sales Order | Confirmed by customer |
| done | Locked | Completed and locked |
| cancel | Cancelled | Cancelled |

**Purchase Order States:**

| State | Label | Description |
|---|---|---|
| draft | RFQ | Request for quotation, draft |
| sent | RFQ Sent | Sent to vendor |
| to approve | To Approve | Awaiting internal approval |
| purchase | Purchase Order | Confirmed order |
| done | Locked | Completed |
| cancel | Cancelled | Cancelled |

**Odoo Key Insight:** Odoo keeps state machines intentionally simple (5-6 states). Complexity is handled through sub-statuses and customizable workflows, not more states.

### commercetools (B2B Quotes API)

**Quote Request States:** Submitted → Accepted / Rejected / Cancelled / Closed

**Staged Quote States:** InProgress (seller preparing offer)

**Quote States:** Pending → Accepted / Declined / Withdrawn / Failed

**commercetools Negotiation Flow:**
```
Buyer creates Cart → Buyer creates Quote Request (Submitted)
  → Seller accepts request → Creates Staged Quote (InProgress)
    → Seller modifies pricing/quantities/discounts
    → Seller creates Quote (Pending)
      → Buyer accepts → Creates Order
      → Buyer declines → End
      → Buyer requests renegotiation → Back to Staged Quote
```

**commercetools Key Insight:** Three separate entities (Quote Request, Staged Quote, Quote) cleanly separate the negotiation phases. Renegotiation loops are built into the model. This is the most modern API-first approach to B2B quote management.

### Lessons Learned from ERPs

| Principle | Source | Takeaway for HyperQuote |
|---|---|---|
| Separate delivery status from billing status | SAP | Track fulfillment and billing independently on the order |
| System-controlled statuses | NetSuite | Don't let users manually set statuses; derive from actions |
| Simple state + sub-status | Odoo | Keep the main state machine simple; use flags/sub-statuses for nuance |
| Three-entity negotiation | commercetools | Separate Request, Staged Quote, and Quote for clean negotiation loops |
| Document flow chain | SAP | Every document links to its predecessor for full traceability |
| Block status overlay | SAP | Delivery blocks, billing blocks, and credit blocks as separate concerns overlaid on the main state |

---

## 14. Complete Cross-Entity State Dependency Map

### Happy Path Flow

```
CUSTOMER submits material list
  │
  ▼
QUOTE REQUEST: DRAFT → SUBMITTED → UNDER_REVIEW → SOURCING → QUOTE_READY
  │
  ▼
QUOTE: DRAFT → SENT → [NEGOTIATING → REVISED → SENT]* → ACCEPTED
  │
  ▼
ORDER: CONFIRMED → PROCESSING
  │
  ├──────────────────────────────────────────────────────┐
  ▼                                                      ▼
SUPPLIER PO (Supplier A):                    SUPPLIER PO (Supplier B):
DRAFT → SENT → CONFIRMED → SHIPPED →        DRAFT → SENT → CONFIRMED →
RECEIVED → INSPECTED → CLOSED               IN_PRODUCTION → SHIPPED →
  │                                          RECEIVED → INSPECTED → CLOSED
  ▼                                            │
DELIVERY (from Supplier A):                    ▼
SCHEDULED → PICKING → DISPATCHED →           DELIVERY (from Supplier B):
IN_TRANSIT → AT_SITE → DELIVERED             SCHEDULED → DISPATCHED →
  │                                          IN_TRANSIT → AT_SITE → DELIVERED
  ▼                                            │
INVOICE (for Delivery A):                      ▼
DRAFT → SENT → (VIEWED) →                   INVOICE (for Delivery B):
PARTIALLY_PAID → PAID                        DRAFT → SENT → PAID
  │                                            │
  ▼                                            ▼
PAYMENT (wire transfer):                     PAYMENT (check):
EXPECTED → RECEIVED → MATCHED →             EXPECTED → RECEIVED → MATCHED →
FULLY_APPLIED                                FULLY_APPLIED
  │                                            │
  └──────────────┬─────────────────────────────┘
                 ▼
ORDER: PARTIALLY_FULFILLED → FULFILLED → COMPLETED
```

### State-to-State Dependencies (What Blocks What)

```
Quote cannot be SENT         unless  Quote Request is QUOTE_READY or manual override
Order cannot be CONFIRMED    unless  Quote is ACCEPTED + credit check passed
Supplier PO cannot be SENT   unless  Order is CONFIRMED
Delivery cannot be SCHEDULED unless  Supplier PO is SHIPPED or RECEIVED
Invoice cannot be DRAFTED    unless  Delivery is DELIVERED or PARTIALLY_DELIVERED
Payment cannot be APPLIED    unless  Invoice is SENT
Order cannot be COMPLETED    unless  All invoices are PAID
Order cannot be FULFILLED    unless  All deliveries are DELIVERED
```

### Aggregate Status Computation

The ORDER status should be computed from child entity states, not set independently:

```python
def compute_order_status(order):
    supplier_pos = get_supplier_pos(order.id)
    deliveries = get_deliveries(order.id)
    invoices = get_invoices(order.id)
    payments = get_payments_for_invoices(invoices)

    # Check for cancellation
    if order.cancellation_requested:
        return "CANCELLATION_REQUESTED"
    if all(po.state == "CANCELLED" for po in supplier_pos):
        return "CANCELLED"

    # Check for hold
    if order.hold_flag:
        return "ON_HOLD"

    # Check fulfillment
    all_delivered = all(d.state == "DELIVERED" for d in deliveries)
    any_delivered = any(d.state == "DELIVERED" for d in deliveries)
    all_paid = all(inv.state == "PAID" for inv in invoices)

    if all_delivered and all_paid:
        return "COMPLETED"
    elif all_delivered:
        return "FULFILLED"
    elif any_delivered:
        return "PARTIALLY_FULFILLED"
    elif any(po.state == "CONFIRMED" for po in supplier_pos):
        return "PROCESSING"
    elif any(po.state in ["REJECTED"] for po in supplier_pos):
        return "ON_HOLD"  # needs re-sourcing
    else:
        return "CONFIRMED"
```

### Complete Entity Count Summary

| Entity | Number of States | Terminal States |
|---|---|---|
| Quote Request | 9 | REJECTED, WITHDRAWN, CANCELLED, QUOTE_READY (transitions out) |
| Quote | 9 | DECLINED, EXPIRED, CANCELLED, ACCEPTED (transitions out) |
| Order | 8 | COMPLETED, CANCELLED |
| Supplier PO | 10 | CLOSED, REJECTED, CANCELLED |
| Delivery | 9 | DELIVERED, CANCELLED, RETURNED |
| Invoice | 10 | PAID, CANCELLED, WRITTEN_OFF |
| Payment | 9 | FULLY_APPLIED, REFUNDED |
| Return/RMA | 8 | DENIED, CREDIT_APPROVED, REPLACEMENT_ORDERED, REJECTED |
| Credit Note | 5 | APPLIED, CANCELLED |
| **TOTAL** | **77 states across 9 entities** | |

---

## Sources

- [BetterCommerce: From Quote to Cash in B2B 2025](https://www.bettercommerce.io/blog/quote-to-cash-is-central-to-b2b-success)
- [SAP S/4HANA Sales Key Functionality](https://blog.sap-press.com/key-functionality-of-sap-s4hana-sales)
- [SAP Sales Order Guide](https://www.saplogisticsexpert.com/an-ultimate-guide-to-sales-order-in-sap-s4-hana-sd/)
- [SAP MM Procurement Lifecycle](https://www.nextnow.ca/sap-mm-procurement-lifecycle-from-purchase-requisition-to-invoice-verification/)
- [SAP PO Status in Business ByDesign](https://community.sap.com/t5/enterprise-resource-planning-blog-posts-by-members/purchase-order-status-in-sap-business-bydesign-monitoring-purchase-order/ba-p/13517983)
- [SAP SD Document Flow and Process](https://mindmajix.com/sap-sd-flow)
- [SAP Sales Order Delivery Status](https://michael.romaniello.co/sap-sales-order-delivery-status-vs-overall-delivery-status/)
- [NetSuite Sales Order Statuses](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_N1220604.html)
- [NetSuite Transaction Status Codes (complete list)](https://gist.github.com/W3BGUY/af08ddd92b87641e28df9c26d545d387)
- [NetSuite Order Fulfillment Overview](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_4737787881.html)
- [NetSuite Quote Approval Workflow](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/article_163878389082.html)
- [Odoo 19.0 Sales Quotations](https://www.odoo.com/documentation/19.0/applications/sales/sales/sales_quotations.html)
- [Odoo Purchase Order States](https://www.odoo.com/documentation/13.0/applications/inventory_and_mrp/purchase/purchases/rfq.html)
- [Odoo Sales Order Workflow Customization](https://www.odoo.com/forum/help-1/workflow-adding-a-custom-state-and-transition-to-sales-order-quotation-73410)
- [commercetools B2B Quote Management](https://commercetools.com/blog/b2b-product-spotlight-automated-quote-management)
- [commercetools Quotes API Overview](https://docs.commercetools.com/api/quotes-overview)
- [commercetools Quote Requests API](https://docs.commercetools.com/api/projects/quote-requests)
- [Salesforce: Negotiate Enterprise Quotes and Place Orders](https://trailhead.salesforce.com/content/learn/modules/quotes-and-orders-with-enterprise-sales-management/negotiate-enterprise-quotes-and-place-orders)
- [Epicor Prophet 21 for Distributors](https://www.epicor.com/en-us/products/enterprise-resource-planning-erp/prophet-21/)
- [Sievo: RFQ Process in 6 Steps](https://sievo.com/blog/the-simple-request-for-quotation-rfq-process-for-procurement)
- [Procore: RFQ in Construction](https://www.procore.com/en-gb/library/request-for-quotation-rfq)
- [BetterCommerce: Handling Backorders and Partial Orders](https://www.bettercommerce.io/blog/how-to-handle-partial-orders-and-backorders-at-scale)
- [PackageX: Partial Shipments in Logistics](https://packagex.io/blog/what-is-partial-shipment)
- [Billtrust: Complete Guide to B2B Invoicing](https://www.billtrust.com/resources/blog/b2b-invoicing)
- [Stripe: How to Accept B2B Payments](https://stripe.com/resources/more/how-to-accept-b2b-payments-what-businesses-need-to-know)
- [StruxHub: Construction Material Delivery Tracking](https://struxhub.com/blog/best-software-to-track-construction-material-deliveries-inventory-and-jobsite-usage/)
- [Vista Industrial: RMA in Manufacturing](https://www.vista-industrial.com/blog/what-is-an-rma-in-manufacturing/)
- [Deltek: Return Material Authorization](https://www.deltek.com/en/manufacturing/qms/return-material-authorization)
- [FactWise: Managing Purchase Order Cancellations](https://factwise.io/blog/post/managing-purchase-order-cancellations)
- [Vantazo: How to Cancel a PO Sent to Supplier](https://www.vantazo.com/blog/how-to-cancel-a-purchase-order-sent-to-a-supplier/)
- [Invoice Fly: Milestone Billing](https://invoicefly.com/glossary/milestone-billing/)
- [Letter of Credit Basics - American Bar Association](https://www.americanbar.org/groups/business_law/resources/business-law-today/2025-september/letter-of-credit-basics/)
- [Dripcapital: Letter of Credit Process](https://www.dripcapital.com/resources/blog/letter-of-credit-lc)
- [Resolve Pay: B2B Payment Solutions for Building Materials Distributors](https://resolvepay.com/blog/best-b2b-payment-solutions-building-materials-distributors-california)
- [LBM Journal: How to Handle the Quoting Process](https://lbmjournal.com/real-issues-real-answers-how-to-handle-the-quoting-process/)
