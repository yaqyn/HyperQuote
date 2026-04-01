> ⚠️ **REFERENCE DOCUMENT — NOT THE SOURCE OF TRUTH**
> This file was written during the research phase and may contain outdated decisions, US-centric references, or superseded technical choices.
> **Always defer to `essential/RESEARCH.md` for current decisions.**
> Key changes since this file was written: TanStack Start (not Next.js), Capacitor (not Expo), React Aria (not shadcn), Egyptian law (not US FMCSA), EGP (not USD), dual auth pools, no online payments, no mobile wallets, spatial glass UI (not traditional dashboards).

# RESEARCH: Sales Order Validation and Confirmation Workflow
## B2B Building Materials Distribution -- Quote-Based Model

**Research Date:** 2026-03-28
**Scope:** Order validation, price reveal timing, stock visibility, backorder handling, rejection workflows, and post-confirmation editing rules for a B2B building materials distributor operating a quote-based (no published prices) model.

---

## Table of Contents

1. [Price Reveal Timing in B2B](#1-price-reveal-timing-in-b2b)
2. [Sales Validation of Orders](#2-sales-validation-of-orders)
3. [Stock Visibility for Sales Reps](#3-stock-visibility-for-sales-reps)
4. ["Not Ready" / Backorder Status](#4-not-ready--backorder-status)
5. [Order Rejection Workflows](#5-order-rejection-workflows)
6. [Confirmed Orders -- Lock vs Edit](#6-confirmed-orders----lock-vs-edit)

---

## 1. PRICE REVEAL TIMING IN B2B

### The Standard: Price is Shown BEFORE Confirmation, Not After

The overwhelming industry standard in B2B distribution is that the customer sees and agrees to the price BEFORE the order is confirmed. This is true across all major ERP systems, CPQ platforms, and B2B commerce models.

**The standard flow is:**

```
Customer submits material request (no price)
    --> Sales/procurement sources pricing
    --> Quote is assembled with prices, terms, delivery
    --> Quote is SENT to customer
    --> Customer reviews price and terms
    --> Customer ACCEPTS or NEGOTIATES
    --> Accepted quote becomes a CONFIRMED ORDER
```

The customer sees the price at the QUOTE stage -- before any order exists. The order is created only after the customer agrees to the price.

### Why "Price After Confirmation" Is Non-Standard

Showing the price only after the order is confirmed is unusual and creates several problems:

| Issue | Detail |
|-------|--------|
| **Legal risk** | Under UCC Section 2-305, parties CAN form a contract without a settled price (price becomes "reasonable at time of delivery"), but Section 2-305(4) states: if the parties "intend not to be bound unless the price be fixed or agreed and it is not fixed or agreed there is no contract." In practice, B2B contracts require mutual assent on material terms including price. |
| **Customer trust** | Customers (especially construction companies managing project budgets) need to know prices to approve purchases internally. Most GCs and developers have their own approval chains that require a known cost. |
| **Dispute risk** | If the customer disputes the price after "confirmation," the order is effectively contested. There is no real confirmation without price agreement. |
| **Budget cycle mismatch** | Construction companies often need to lock in material costs for project bids. They cannot commit to open-ended pricing. |

### What UCC 2-305 Actually Says (Open Price Terms)

Under U.S. commercial law (UCC Article 2, Section 2-305):

- Parties CAN conclude a contract even if the price is not settled -- the price becomes a "reasonable price at time of delivery"
- If price is left to one party, they must set it in "good faith"
- **Critical exception:** If parties intended NOT to be bound without a price agreement, and no agreement occurs, then NO contract exists
- If price-fixing fails due to one party's fault, the other may cancel or impose a reasonable price

**Practical implication for your model:** If the customer submits a material request expecting to see and approve pricing, and instead receives a "confirmed" order with a price they never agreed to, this is legally fragile. The "confirmation" without price agreement is more accurately a "provisional commitment" or "intent to purchase pending quote."

### Recommended Approach for HyperQuote

Instead of "price after confirmation," use a two-phase model:

```
PHASE 1: Material Request + Validation (no price)
    Customer submits materials list
    Sales validates availability, delivery feasibility
    Sales contacts customer to clarify specs, confirm delivery location/date
    Status: REQUEST VALIDATED

PHASE 2: Quote + Acceptance (price revealed)
    Sales builds quote with prices based on sourced costs + margins
    Quote sent to customer
    Customer sees price, accepts or negotiates
    Accepted quote --> CONFIRMED ORDER (now legally binding)
```

This separates "order validation" (can we fulfill this?) from "order confirmation" (do you agree to this price?). The customer sees the price between validation and confirmation -- not after.

### Pros and Cons of Different Price Timing Models

| Model | Pros | Cons | Used By |
|-------|------|------|---------|
| **Price shown during quote (STANDARD)** | Legal clarity, customer trust, budget compliance, fewer disputes | Slower if pricing requires supplier outreach; price may change before acceptance | SAP, NetSuite, Odoo, commercetools, Salesforce CPQ, 95%+ of B2B distributors |
| **Price hidden until after confirmation** | Faster perceived "order" creation; sales controls narrative | Legal risk, customer disputes, trust erosion, non-standard, customer cannot get internal approval | Very rare; seen in some commodity spot markets where price is market-at-close |
| **Indicative price during request, final price at confirmation** | Customer has rough budget visibility; final price adjusts based on actual sourcing | Requires clear communication that initial price is estimate; can still cause disputes if final price differs significantly | Some large industrial distributors for volatile-priced commodities (steel, lumber) |

### What Top B2B Commerce Platforms Recommend (2025-2026)

Creatuity's 2026 B2B research states the optimization target is: "See live pricing based on their customer tier, volume commitment, and terms" -- meaning prices should be visible to the customer as early as possible, ideally at login in self-service portals, with the goal of eliminating "let me check with the warehouse" or "I'll get back to you on pricing tomorrow."

For quote-based models where prices are not published, the standard is still: **price visible at the quote stage, before the customer commits.**

---

## 2. SALES VALIDATION OF ORDERS

### What "Validation" Means in This Context

Sales validation is the step where a sales rep reviews a customer's material request and confirms:

1. **Material availability** -- Is stock on hand or sourced from a supplier?
2. **Delivery feasibility** -- Can we deliver to the specified location by the requested date?
3. **Customer creditworthiness** -- Is this customer approved for this order size?
4. **Spec accuracy** -- Are the materials specified correctly? Right grades, sizes, standards?
5. **Pricing readiness** -- Do we have current costs to build a quote?

### How Validation Is Done: Phone, Digital, or Hybrid

The method depends on order complexity and customer relationship:

| Channel | When Used | Prevalence | Notes |
|---------|-----------|------------|-------|
| **Phone call** | Complex orders, new customers, high-value deals (>$250K), ambiguous specs | Declining but still 30-40% of validations | Preferred for relationship building, reading customer urgency, upselling |
| **WhatsApp / SMS** | Quick confirmations, existing customers, routine orders, MENA/LATAM/SEA regions | Rising fast; 24.4% of B2B buyers now use SMS to place orders (BigCommerce 2025) | 98% open rate on WhatsApp; ideal for "Can you confirm delivery to Site X on March 30?" |
| **Email** | Formal validations requiring documentation, spec confirmations with attachments | Still dominant for formal quote delivery; declining for quick validations | Slower response times; often lost in inbox |
| **In-system portal** | Self-service customers, repeat orders, standard materials | Growing (1/3 of buyers prefer fully digital per McKinsey "rule of thirds") | Best for order tracking, audit trail, no ambiguity |
| **Video call** | Complex specs requiring visual review (drawings, samples) | Rare (<5%) | Used for specialty/custom materials |

### The "Rule of Thirds" (McKinsey B2B Research)

The B2B buying journey is now split into roughly equal thirds:
- **1/3** want in-person (phone/face-to-face) interactions
- **1/3** prefer remote conversations (video, phone, WhatsApp)
- **1/3** expect fully digital self-serve (portal, no human contact)

**Implication:** Your system must support ALL three channels, not force everyone through a phone call.

### What BigCommerce Found for Building Materials (2025)

- 18.6% of buyers explicitly buy online to AVOID talking to a salesperson
- Multi-user accounts with role-based permissions (buyer submits, manager approves) are now expected
- Quick Order Pad tools (enter SKUs in bulk, reorder from past purchases) reduce need for sales validation on repeat orders

### Recommended Validation Workflow for HyperQuote

```
MATERIAL REQUEST ARRIVES
    |
    v
AUTO-TRIAGE (system)
    - Is customer known? Check credit status
    - Are materials standard stock items? Check inventory
    - Is delivery location within service area?
    - Flag: SIMPLE (auto-quotable) vs COMPLEX (needs human review)
    |
    +--> SIMPLE: System pre-validates, generates draft quote, sends to sales for 1-click approval
    |
    +--> COMPLEX: Assigns to sales rep for manual validation
              |
              v
         SALES REP VALIDATES
              - Reviews material list line-by-line
              - Checks stock across warehouses + supplier availability
              - Contacts customer via PREFERRED CHANNEL (WhatsApp, phone, portal message)
              - Confirms: delivery date, location, special requirements
              - Resolves any spec ambiguities
              |
              v
         REQUEST VALIDATED --> proceed to quote building
```

### Standard Validation Steps (Checklist)

1. Material identification -- Are all items identifiable? (correct SKU, grade, standard)
2. Quantity reasonableness -- Does the quantity make sense for the project type?
3. Stock check -- Available in own warehouse? Available from supplier? Lead time?
4. Delivery feasibility -- Can we deliver to the location? Do we serve that area? Is the requested date achievable given lead times?
5. Credit check -- Is the customer within credit limits? Any overdue invoices?
6. Spec confirmation with customer -- If any ambiguity, contact customer to clarify
7. Special requirements -- Certifications needed? Test reports? Specific brands required?

---

## 3. STOCK VISIBILITY FOR SALES REPS

### The Gold Standard: Unified Multi-Location + Supplier View

The best distribution ERPs give sales reps a single screen that shows:

```
MATERIAL: Portland Cement Type I, 50kg bags
SKU: CEM-PORT-I-50

COMPANY STOCK:
  ┌─────────────────────────────────────────────────────┐
  │ Location          │ On Hand │ Available │ Committed │
  ├───────────────────┼─────────┼───────────┼───────────┤
  │ Warehouse A       │  1,200  │    800    │    400    │
  │ Warehouse B       │  2,500  │  2,500    │      0    │
  │ Yard C            │    500  │    300    │    200    │
  │ In Transit (PO#)  │    600  │    600    │      0    │  ETA: Apr 2
  ├───────────────────┼─────────┼───────────┼───────────┤
  │ TOTAL COMPANY     │  4,800  │  4,200    │    600    │
  └─────────────────────────────────────────────────────┘

SUPPLIER STOCK (live or last-synced):
  ┌──────────────────────────────────────────────────────────────┐
  │ Supplier           │ Available │ Unit Cost │ Lead Time │ MOQ │
  ├────────────────────┼───────────┼───────────┼───────────┼─────┤
  │ Supplier X (pref.) │   5,000   │  $4.20    │  3 days   │ 500 │
  │ Supplier Y         │  10,000   │  $4.45    │  5 days   │ 200 │
  │ Supplier Z         │   2,000   │  $4.10    │  10 days  │ 1000│
  └──────────────────────────────────────────────────────────────┘

TOTAL SOURCEABLE: 21,200 bags
```

### Key Inventory Metrics Sales Reps Need

| Metric | Definition | Why It Matters |
|--------|-----------|----------------|
| **On Hand** | Physical count in the warehouse right now | Raw quantity |
| **Available** | On Hand minus Committed (reserved for other orders) minus any holds | What can actually be promised to a new customer |
| **Committed/Reserved** | Allocated to existing confirmed orders not yet shipped | Prevents double-promising |
| **In Transit** | On purchase orders from suppliers, en route to warehouse | Future availability with ETA |
| **Backorder Qty** | Total quantity on orders that cannot be fulfilled from current stock | Indicates demand pressure |
| **Supplier Available** | Quantity available from suppliers (via API, EDI, or last manual check) | Enables promising beyond own stock |

### How Major ERPs Handle Multi-Location Visibility

**SAP S/4HANA:**
- Available-to-Promise (ATP) check runs in real-time across all plants/warehouses
- Material Availability screen shows stock by plant, storage location, and batch
- Supplier stock visible via Ariba Network integration or scheduling agreements
- Sales reps access via the "Stock Overview" (MMBE transaction) or Fiori apps

**NetSuite:**
- Inventory by Location report shows on-hand, available, committed, and backordered per location
- "Check Availability" button on sales order lines shows all location stock
- Supplier stock not natively shown on same screen; requires custom SuiteScript or third-party integration (e.g., SPS Commerce for supplier inventory feeds)

**Odoo:**
- Inventory dashboard with forecasted stock per warehouse
- "Reordering" rules trigger automatic supplier PO creation when stock drops below threshold
- Stock by location visible on product form
- Supplier lead times and MOQs stored on supplier pricelists

**Microsoft Dynamics 365:**
- "On-hand inventory" view with drill-down by site, warehouse, location, and batch
- ATP calculations include purchase orders in transit
- Supplier collaboration portal for visibility into supplier stock (if supplier participates)

### UX Recommendations for Sales Rep Stock View

1. **Single-screen view** -- Never make the rep click through multiple screens to see total availability
2. **Color coding** -- Green (>80% of requested qty available), Yellow (50-80%), Red (<50% or backorder)
3. **"Can we fulfill?" summary** -- At the top of the stock view, a simple YES/NO/PARTIAL with details
4. **Delivery date calculator** -- Based on stock location + delivery address, auto-calculate earliest possible delivery date
5. **Supplier cost visibility** -- Show supplier costs only to authorized roles (sales managers, not junior reps if policy requires)
6. **Last-synced timestamp** -- For supplier stock, show when data was last updated (e.g., "Supplier X stock as of 2 hours ago")

---

## 4. "NOT READY" / BACKORDER STATUS

### Standard ERP Terminology

There is no universal "Not Ready" status in major ERPs. Instead, the concept is expressed through several specific statuses:

| ERP Status Name | System | Meaning | When Used |
|-----------------|--------|---------|-----------|
| **Backordered** | NetSuite, Acctivate, SAP | Order confirmed but insufficient stock to fulfill; waiting for stock replenishment | Stock checked, not enough available; order is valid but cannot ship |
| **Awaiting Availability** | Odoo | Delivery/transfer waiting for products to become available in stock | Picking operation created but stock not available at source location |
| **On Hold** | SAP, NetSuite, Dynamics 365 | Order paused for any reason (credit hold, customer request, stock issue, internal review) | Broader than backorder; includes non-stock reasons |
| **Scheduled** | Acctivate | Order confirmed, stock allocated, but not yet released for picking/shipping | Stock is available but order is waiting for scheduled ship date |
| **Partially Fulfilled** | Most ERPs | Some line items shipped; others still waiting | Split shipments where some materials were available and others were not |
| **Pending Allocation** | SAP, Dynamics 365 | Order awaiting inventory reservation/allocation run | Stock might exist but has not been committed to this order yet |
| **Open** | SAP, Dynamics 365 | Order is active but not yet fully processed | Catch-all for orders in progress |

### The Backorder Lifecycle

```
ORDER CONFIRMED
    |
    v
STOCK CHECK (automatic)
    |
    +--> ALL STOCK AVAILABLE --> allocate --> READY TO SHIP
    |
    +--> PARTIAL STOCK AVAILABLE
    |       |
    |       +--> Ship partial now, backorder remainder --> PARTIALLY FULFILLED + BACKORDERED (for remaining)
    |       |
    |       +--> Wait until all stock available --> BACKORDERED (entire order)
    |
    +--> NO STOCK AVAILABLE --> BACKORDERED
              |
              v
         SUPPLIER PO CREATED (auto or manual)
              |
              v
         STOCK RECEIVED (supplier delivers to warehouse)
              |
              v
         AUTO-ALLOCATE to backordered orders (priority: FIFO by order date, or customer tier)
              |
              v
         READY TO SHIP --> notify customer, schedule delivery
```

### How Customers Are Notified When Stock Becomes Available

| Method | When | Detail |
|--------|------|--------|
| **Automated email** | Stock received and allocated to their order | "Your order ORD-2026-00312 is now ready for delivery. Expected ship date: April 5, 2026." |
| **Portal status update** | Real-time | Customer sees order status change from "Awaiting Stock" to "Ready to Ship" on their portal dashboard |
| **SMS / WhatsApp** | If customer opted in | Quick notification: "Stock for your cement order is now available. Delivery scheduled for Apr 5." |
| **Sales rep outreach** | High-value orders or VIP customers | Sales rep calls or messages to personally confirm readiness and reconfirm delivery details |

### What To Call This in HyperQuote

Recommended status mapping for your system:

| Internal Status | Customer-Facing Label | Meaning |
|----------------|----------------------|---------|
| `BACKORDERED` | "Awaiting Stock" | Stock not available; supplier PO placed; waiting for delivery |
| `PARTIALLY_ALLOCATED` | "Partially Ready" | Some items available, others waiting |
| `ALLOCATED` | "Ready to Ship" | All stock reserved, awaiting dispatch scheduling |
| `ON_HOLD` | "On Hold" | Paused for non-stock reason (credit, customer request, etc.) |

**Avoid** using "Not Ready" as a status name -- it is too vague. "Backordered" or "Awaiting Stock" is precise and universally understood in distribution.

### Automatic Reallocation When Stock Arrives

Modern ERPs (NetSuite, SAP, Odoo) automatically reallocate incoming inventory to backordered orders using priority rules:

1. **FIFO by order date** -- Oldest order gets stock first
2. **Customer tier priority** -- VIP/strategic customers get stock before standard customers
3. **Partial vs full** -- Some systems prioritize orders that can be fully fulfilled over those that would remain partial
4. **Manual override** -- Sales manager can manually reallocate stock to a specific order

---

## 5. ORDER REJECTION WORKFLOWS

### Rejection vs Cancellation: Key Distinction

| Attribute | Rejection | Cancellation |
|-----------|-----------|-------------|
| **Initiated by** | Company (sales, credit team, operations) | Either party (customer or company) |
| **Timing** | Early in process (before fulfillment begins) | Can happen at any stage |
| **Reason** | Company cannot or will not fulfill: credit issue, infeasible request, policy violation, out of service area | Customer changed mind, project cancelled, found another supplier; or company issue (force majeure, supplier failure) |
| **Reversibility** | Generally terminal; customer must submit new request | May be reversible if caught early (before shipping) |
| **Financial impact** | No charges (nothing was processed) | May involve restocking fees, cancellation fees, or partial charges if fulfillment started |
| **Customer perception** | Negative -- company is saying "no" | Neutral to negative -- depends on who initiated and why |

### Who Can Reject and When

| Role | Can Reject? | Conditions | Examples |
|------|-------------|------------|---------|
| **Sales Rep** | Yes, with reason | During validation phase; infeasible spec, wrong product type, customer not in service area | "Customer requested materials we don't carry and cannot source" |
| **Sales Manager** | Yes | Escalated rejections; policy decisions; margin below threshold | "Deal margin below 5% minimum with no strategic justification" |
| **Credit Team** | Yes | Customer fails credit check or exceeds credit limit with no resolution | "Customer has $500K overdue and no payment plan" |
| **Operations/Logistics** | Yes, with escalation | Delivery not feasible (location inaccessible, no carrier available, hazmat restriction) | "Delivery site requires permits we cannot obtain" |
| **System (automated)** | Yes | Policy rules: duplicate detection, blacklisted customer, expired certifications | "Customer certification expired; auto-reject until renewed" |

### Rejection Reasons (Standard Taxonomy)

```
REJECTION_REASONS:
  CREDIT:
    - credit_limit_exceeded
    - overdue_balance
    - credit_application_denied
    - payment_history_poor

  PRODUCT:
    - item_not_carried
    - item_discontinued
    - item_not_available_in_region
    - spec_not_feasible
    - minimum_order_not_met

  LOGISTICS:
    - delivery_area_not_served
    - delivery_date_not_achievable
    - site_access_restricted
    - hazmat_restriction
    - weight_exceeds_transport_limit

  POLICY:
    - customer_blacklisted
    - duplicate_order
    - compliance_violation
    - certification_expired
    - sanctions_check_failed

  COMMERCIAL:
    - margin_below_threshold
    - terms_not_acceptable
    - customer_requested_terms_we_cannot_offer
```

### Customer Notifications for Rejection

| Rejection Type | Notification Content | Channel |
|---------------|---------------------|---------|
| **Credit rejection** | "Your order cannot be processed at this time. Please contact our accounts team at [email/phone] to discuss your account status." (Never expose exact credit details in notification) | Email + portal |
| **Product rejection** | "Unfortunately, we are unable to source [material X]. We recommend [alternative] or suggest contacting [other supplier]. Our team is available to assist with alternatives." | Email + portal + optional sales rep call |
| **Logistics rejection** | "We are unable to deliver to [location] by [date]. We can offer delivery by [alternative date] or to [alternative location]. Please let us know how you'd like to proceed." | Email + portal |
| **Policy rejection** | "Your order cannot be processed due to compliance requirements. Please contact us for details." (Vague by design for legal protection) | Email only |

### Rejection vs Cancellation in ERP Systems

**Microsoft Dynamics 365:** Purchase orders have distinct statuses for "Rejected" (vendor rejects, with reason and suggestions for changes, status remains "In external review") and "Cancelled" (requires workflow approval if change management is active; inventory transactions updated as cancelled).

**SAP:** Uses "Rejected" for approval workflow denials and "Cancelled" for post-confirmation cancellations. Both generate audit trail entries. Rejection reasons are stored as structured codes.

**Odoo:** Uses "Cancelled" as a single terminal state. Rejection is implemented through the quotation stage (quote is declined/cancelled before becoming an order). There is no native "Rejected" status on confirmed orders -- the assumption is that rejection happens at the quote level.

### Recommended Status Flow for HyperQuote

```
REQUEST REJECTED (before quote)
    - Reason stored, customer notified
    - Customer can resubmit with modifications

QUOTE DECLINED (customer declines price)
    - Not a rejection; customer's choice
    - Sales follows up

ORDER CANCELLED BY CUSTOMER
    - Customer-initiated after confirmation
    - Cancellation fee may apply if fulfillment started
    - Status: CANCELLATION_REQUESTED --> CANCELLED

ORDER CANCELLED BY COMPANY
    - Company-initiated (supplier failure, force majeure)
    - No fee to customer
    - Status: CANCELLATION_REQUESTED --> CANCELLED

ORDER REJECTED (company refuses to fulfill after confirmation -- rare)
    - Happens if post-confirmation credit check fails or fraud detected
    - Status: REJECTED
    - Full explanation required; manager approval needed
```

---

## 6. CONFIRMED ORDERS -- LOCK VS EDIT

### The Standard: Lock by Default, Unlock with Authority

The industry standard across all major ERPs is: **confirmed orders are locked from editing by default, with role-based unlock capability for authorized users.**

### How Major ERPs Handle This

**Odoo 18:**
- Setting: "Lock Confirmed Sales" in Settings > Quotations & Orders
- When enabled: confirmed sales orders show a lock icon; all fields become read-only
- Unlock: Only users with Administrator access can click the "Unlock" button to edit
- After editing: Admin re-locks the order
- Default behavior: Odoo has historically auto-locked on confirmation; some versions require enabling the setting

**Microsoft Dynamics 365:**
- Confirmed purchase/sales orders cannot be edited directly
- To modify: use "Request change" action, which changes status back to "Draft"
- Change must go through approval workflow again (if change management is active)
- Fully invoiced orders are permanently locked -- no editing possible
- Accounting distributions created at confirmation are preserved; changes require re-confirmation

**SAP S/4HANA:**
- Sales orders can be changed after confirmation, but changes are logged and may require approval
- "Change documents" track every modification with timestamp, user, old value, new value
- Block indicators can prevent specific changes (delivery block, billing block)
- Some fields (pricing, payment terms) may require authorization objects (role-based permissions)

**Sage:**
- Sales orders can be modified but with audit logging
- Some fields become read-only after certain milestones (e.g., after delivery is created)

### What Should Be Locked vs What Can Be Modified

| Field / Attribute | Should Lock? | Who Can Modify? | Conditions |
|-------------------|-------------|-----------------|------------|
| **Line items (add/remove)** | YES, lock | Sales Manager or above | Requires re-quote if price changes; customer must approve |
| **Quantities** | YES, lock | Sales Manager or above | Customer approval required; may trigger supplier PO changes |
| **Prices** | YES, lock | Sales Manager or above | Customer approval required; margin approval may be needed |
| **Payment terms** | YES, lock | Finance Manager | Requires credit team approval |
| **Delivery address** | Soft lock | Sales Rep (with reason) | Customer may request site change; update delivery logistics |
| **Delivery date** | Soft lock | Sales Rep (with reason) | Common change; customer or logistics may request shift |
| **Internal notes** | No lock | Any team member | Always editable for internal communication |
| **Customer PO reference** | Soft lock | Sales Rep | Customer may provide PO number after confirmation |
| **Priority / urgency** | Soft lock | Sales Rep / Manager | Escalation by customer or operations |
| **Assigned warehouse** | YES, lock | Operations Manager | Affects fulfillment routing; system should auto-assign |

### The "Change Order" Pattern

Instead of unlocking and directly editing a confirmed order, many distribution ERPs use a formal "Change Order" process:

```
CONFIRMED ORDER (locked)
    |
    v
CHANGE REQUEST CREATED
    - Who requested: sales rep, customer, operations
    - What changed: line items, qty, price, delivery
    - Reason for change
    |
    v
CHANGE APPROVAL (if required)
    - Manager reviews and approves
    - Customer confirms (if price/terms affected)
    |
    v
CHANGE APPLIED
    - Order updated with new values
    - Old values archived in change history
    - Downstream documents updated (supplier POs, delivery orders)
    |
    v
ORDER RE-CONFIRMED (with change log)
```

This creates a full audit trail and prevents unauthorized modifications.

### Recommended Approach for HyperQuote

1. **Lock on confirmation** -- All order fields locked when status moves to CONFIRMED
2. **Sales reps can modify:** delivery date, delivery address, internal notes, priority (with reason logged)
3. **Sales reps CANNOT modify:** line items, quantities, prices, payment terms (must request change via Change Order)
4. **Sales Managers can:** approve change orders, unlock orders for modification, adjust prices within authority limits
5. **Finance/Admin can:** modify payment terms, apply credits, unlock fully for exceptional cases
6. **System enforces:** All changes after confirmation create an audit trail entry with timestamp, user, old value, new value, and reason
7. **Customer-visible changes:** Any change that affects the customer (price, qty, delivery) must be communicated and accepted by the customer before being applied

---

## SUMMARY: KEY DECISIONS FOR HYPERQUOTE

| Question | Recommended Answer | Rationale |
|----------|-------------------|-----------|
| When does customer see price? | At the QUOTE stage, BEFORE order confirmation | Industry standard, legal protection, customer trust |
| How does sales validate orders? | Multi-channel: portal (primary), WhatsApp (quick confirmations), phone (complex orders) | "Rule of thirds" -- support all customer preferences |
| Should sales see supplier stock? | YES -- unified view of own warehouses + supplier availability on one screen | Enables accurate promising without switching systems |
| What to call "not ready" status? | BACKORDERED (internal) / "Awaiting Stock" (customer-facing) | Standard ERP terminology; precise and universally understood |
| Rejected vs cancelled? | Rejection = company says no (early stage); Cancellation = either party stops a confirmed order | Different workflows, notifications, and financial implications |
| Lock confirmed orders? | YES, lock by default; role-based unlock for authorized changes via Change Order process | Prevents unauthorized edits; creates audit trail; industry standard |

---

## SOURCES

- [UCC Section 2-305: Open Price Terms](https://www.law.cornell.edu/ucc/2/2-305)
- [B2B Quote-to-Order Workflow Optimization 2026 -- Creatuity](https://www.creatuity.com/insights/b2b-quote-to-order-workflow-optimization-2026/)
- [Building Materials Buyer Expectations -- BigCommerce](https://www.bigcommerce.com/blog/building-materials-ecommerce-buyer-expectations/)
- [B2B Order Management Complete Guide 2025 -- Shopify](https://www.shopify.com/enterprise/blog/b2b-order-management)
- [How Distributors Use ERP for Inventory Visibility -- ERP Cloud Blog](https://erpsoftwareblog.com/cloud/2025/11/how-distributors-use-erp-to-improve-inventory-visibility-and-reduce-stockouts/)
- [Backorder Management -- NetSuite](https://www.netsuite.com/portal/resource/articles/inventory-management/backorder.shtml)
- [Backorder Definition and Management -- Orderful](https://www.orderful.com/blog/what-is-a-backorder)
- [Handling Backorders and Partial Orders at Scale -- BetterCommerce](https://www.bettercommerce.io/blog/how-to-handle-partial-orders-and-backorders-at-scale)
- [Approve and Confirm Purchase Orders -- Dynamics 365](https://learn.microsoft.com/en-us/dynamics365/supply-chain/procurement/purchase-order-approval-confirmation)
- [Review Changes to Confirmed Purchase Orders -- Dynamics 365](https://learn.microsoft.com/en-us/dynamics365/supply-chain/procurement/purchase-order-changes-after-confirmation)
- [How to Restrict Edits on Confirmed Orders -- Odoo 18](https://www.cybrosys.com/blog/how-to-restrict-edits-on-confirmed-orders-in-odoo-18)
- [Lock Confirmed Sales Orders -- Odoo 17](https://www.cybrosys.com/blog/how-to-lock-confirmed-orders-in-odo-17-sales)
- [WhatsApp Business for B2B -- Nutshell](https://www.nutshell.com/blog/whatsapp-business-for-b2b)
- [How Modern B2B Distributors Scale 2026 -- Shopify](https://www.shopify.com/enterprise/blog/b2b-distributors)
- [Acctivate: Scheduled vs Backordered Order Statuses](https://hub.acctivate.com/articles/difference-between-scheduled-and-backordered-statuses)
- [Odoo Backorder Handling Forum](https://www.odoo.com/forum/help-1/order-delivery-awaiting-availability-whereas-product-are-in-stock-128652)
- [SAP Backorder Processing](https://michael.romaniello.co/sap-exploring-backorders-part-1/)
- [Distribution ERP Guide -- Bizowie](https://bizowie.com/distribution-erp-software-the-complete-guide-for-wholesale-and-distribution-companies)
- [Purchase Order vs Quote Guide -- SystemX](https://www.systemx.net/purchase_order_vs_quote/)
- [B2B Pricing Quotes Best Practices -- Miva](https://blog.miva.com/online-b2b-pricing-quotes)
