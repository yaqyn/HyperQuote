> ⚠️ **REFERENCE DOCUMENT — NOT THE SOURCE OF TRUTH**
> This file was written during the research phase and may contain outdated decisions, US-centric references, or superseded technical choices.
> **Always defer to `essential/RESEARCH.md` for current decisions.**
> Key changes since this file was written: TanStack Start (not Next.js), Capacitor (not Expo), React Aria (not shadcn), Egyptian law (not US FMCSA), EGP (not USD), dual auth pools, no online payments, no mobile wallets, spatial glass UI (not traditional dashboards).

# RESEARCH: Internal Operations & Organizational Structure
## B2B Building Materials Distributor (Quote-Based, High-Value Orders)

**Date:** 2026-03-28
**Context:** A company that outsources materials from external suppliers and sells to customers (construction companies, GCs, developers). Quote-based model with no published prices. Order values $100K to $100M+. Payments via wire transfers, checks, letters of credit.

---

## TABLE OF CONTENTS

1. [Organizational Structure by Company Size](#1-organizational-structure-by-company-size)
2. [Complete Order Lifecycle with Human Touchpoints](#2-complete-order-lifecycle-with-human-touchpoints)
3. [Employee Roles and Daily Workflows](#3-employee-roles-and-daily-workflows)
4. [Internal App Modules Needed](#4-internal-app-modules-needed)
5. [Workflow Automation Opportunities](#5-workflow-automation-opportunities)
6. [Minimum Viable Team](#6-minimum-viable-team)
7. [Communication Flows](#7-communication-flows)
8. [Real Company Examples](#8-real-company-examples)
9. [KPIs Per Role](#9-kpis-per-role)
10. [Scaling the Team](#10-scaling-the-team)

---

## 1. ORGANIZATIONAL STRUCTURE BY COMPANY SIZE

### Industry Benchmark
Building materials distributors typically maintain approximately **1.2 employees per $1M in revenue**. This ratio varies based on automation levels, service model (drop-ship vs. warehoused), and product complexity.

---

### A. STARTUP PHASE: 5-12 People ($1M-$10M Revenue)

```
                    Owner / CEO
                        |
          +-------------+-------------+
          |             |             |
    Sales Manager   Operations    Finance
    (1-2 people)    Manager      (1 person)
          |         (1 person)
    Sales Reps        |
    (1-3)        +----+----+
                 |         |
            Warehouse   Logistics
            (1-2)      (1 person)
```

**Total Headcount: 8-12 people**

| Department | Headcount | Roles |
|---|---|---|
| Executive | 1 | Owner/CEO (also does BD, key account sales, supplier relationships) |
| Sales | 2-3 | Sales Manager (also does quoting/pricing), 1-2 Sales Reps |
| Procurement | 1 | Purchasing Officer (also handles supplier relationships) |
| Operations | 2-3 | Operations Manager, 1-2 Warehouse/Logistics staff |
| Finance | 1-2 | Accountant/Bookkeeper (also handles invoicing, AR, credit) |
| Admin | 1 | Office Manager / Customer Service (handles phones, email, doc processing) |

**Key characteristic:** People wear multiple hats. The owner personally approves quotes over certain thresholds. The sales manager also builds quotes and negotiates with suppliers. The accountant handles credit checks, invoicing, and collections.

---

### B. GROWTH PHASE: 20-40 People ($10M-$50M Revenue)

```
                        CEO / GM
                           |
        +--------+---------+---------+--------+
        |        |         |         |        |
    VP Sales  Procurement  Operations  Finance  Admin/HR
    (1)       Manager(1)   Manager(1)  Manager(1)  (1)
      |          |            |          |
   +--+--+    +--+--+     +--+--+    +--+--+
   |     |    |     |     |     |    |     |
 Inside Outside Buyers  Warehouse Logistics AR/AP Credit
 Sales  Sales  (2-3)   Team(4-6) (2-3)   (2-3) (1)
 (2-3)  (3-5)
```

**Total Headcount: 25-40 people**

| Department | Headcount | Roles |
|---|---|---|
| Executive | 2 | CEO/GM, COO or Operations VP |
| Sales | 6-8 | VP Sales, Inside Sales (2-3), Outside Sales/Account Managers (3-5) |
| Procurement | 3-4 | Procurement Manager, Buyers/Purchasing Officers (2-3) |
| Operations | 6-10 | Ops Manager, Warehouse Manager, Warehouse Staff (3-5), Logistics Coordinator (1-2), Dispatch (1) |
| Finance | 4-5 | Finance Manager, AR Clerk (1-2), AP Clerk (1), Credit Analyst (1) |
| Customer Service | 2-3 | CS Reps handling order status, complaints, returns |
| Admin/HR/IT | 2-3 | Office Manager, HR Coordinator, IT Support |

**Key characteristic:** Roles begin to specialize. Sales splits into inside (phone/email quotes) and outside (field relationships). Procurement becomes its own department. Finance separates AR, AP, and credit functions.

---

### C. SCALED PHASE: 80-150+ People ($50M-$500M Revenue)

```
                            CEO
                             |
              +---------+----+----+---------+
              |         |         |         |
           COO       CFO      CRO/VP    VP Supply
              |         |      Sales     Chain
              |         |         |         |
        +-----+---+  +--+--+  +--+--+  +---+---+
        |    |    |  |  |  |  |  |  |  |   |   |
      Ops  WH  Fleet AR AP  Ctrl Sales Sales Buyers Cat.
      Mgr  Mgr  Mgr  Mgr Mgr  (1) Mgrs Reps (4-6) Mgr
      (1)  (1)  (1)  (3)(2)      (3-4)(10+)       (1)
              |
         +----+----+
         |    |    |
       WH   WH   WH
       Staff Staff Staff
       (5+)  (5+)  (5+)
       (per location)
```

**Total Headcount: 80-150+ people**

| Department | Headcount | Roles |
|---|---|---|
| Executive | 3-5 | CEO, COO, CFO, CRO/VP Sales, VP Supply Chain |
| Sales | 15-25 | Regional Sales Managers (3-4), Outside Sales/Account Managers (8-12), Inside Sales/Quoting Specialists (4-6), Sales Support/Coordinators (2-3), Business Development (1-2) |
| Procurement | 6-10 | Director of Procurement, Category Managers (2-3), Buyers (3-5), Vendor Relations (1-2) |
| Operations | 20-40 | Director of Ops, Warehouse Managers (per location), Warehouse Staff (varies), Logistics Manager, Dispatch (2-4), Fleet Manager, Drivers (if owned fleet) |
| Finance | 8-15 | Controller, AR Manager + team (3-5), AP Manager + team (2-3), Credit Manager + Analysts (2-3), Financial Analyst (1-2) |
| Customer Service | 4-8 | CS Manager, CS Reps (3-6), Claims/Returns Specialist (1) |
| IT | 3-5 | IT Manager, Systems Admin, Developer/Integrations, Helpdesk |
| HR | 2-4 | HR Manager, Recruiter, Payroll/Benefits |
| Marketing | 1-3 | Marketing Manager, Content/Digital (optional at this stage) |
| Legal/Compliance | 1-2 | In-house counsel or outsourced |

---

## 2. COMPLETE ORDER LIFECYCLE WITH HUMAN TOUCHPOINTS

### The Full Quote-to-Cash Cycle (12-18 Steps)

Below is the complete lifecycle for a high-value, quote-based building materials order. Each step identifies WHO does the work, what DECISIONS they make, and what INFORMATION they need.

---

### PHASE 1: CUSTOMER INQUIRY & RFQ (Day 0)

**Step 1: Customer Submits Material Request**
- **Who:** Customer (construction company, GC, developer)
- **How:** Email (most common), phone call, in-person meeting, or online portal
- **What they send:** Bill of materials (BOM), architectural drawings, specifications, quantity lists, delivery schedule, project location
- **Receives it:** Sales Rep / Account Manager (assigned to that customer) OR Inside Sales (if new customer / unassigned)
- **Decision:** Is this a real opportunity? Is the customer creditworthy? Is this in our product scope?

**Step 2: RFQ Review & Qualification**
- **Who:** Sales Rep / Account Manager
- **Actions:**
  - Reviews material specifications for completeness
  - Checks customer credit status in the system (or flags for credit check if new)
  - Estimates order value range
  - Determines if products are in current supplier portfolio
  - Identifies any special/custom requirements
- **Decision:** Accept RFQ, request more information, or decline
- **Escalation:** If order value exceeds threshold (e.g., >$500K), notifies Sales Manager or GM
- **Time:** 1-4 hours for review, same day response to customer acknowledging receipt

---

### PHASE 2: SUPPLIER SOURCING & PRICING (Days 1-5)

**Step 3: Procurement Sourcing**
- **Who:** Procurement Officer / Buyer (with input from Sales Rep on specifications)
- **Actions:**
  - Breaks down BOM into procurement categories
  - Sends RFQs to 2-5 preferred suppliers per category
  - Includes specs, quantities, required delivery dates, delivery location
  - Follows up with suppliers for responses
- **What they need:** Approved supplier list, historical pricing data, supplier lead times, supplier performance scores
- **Decision:** Which suppliers to solicit? How many to get competing quotes from? Whether to include new/alternative suppliers?
- **Time:** 1-3 days for supplier responses depending on complexity

**Step 4: Supplier Quotes Received & Evaluated**
- **Who:** Procurement Officer
- **Actions:**
  - Collects and compares supplier quotes
  - Evaluates on: price, lead time, quality history, payment terms, delivery capability
  - Negotiates with preferred suppliers for better pricing/terms
  - Selects recommended supplier(s) per line item
- **Decision:** Which supplier offers best value (not just lowest price)?
- **Output:** Internal cost sheet with landed costs per item (material + freight + handling)
- **Time:** 1-2 days

---

### PHASE 3: QUOTE BUILDING & APPROVAL (Days 3-7)

**Step 5: Margin Calculation & Quote Building**
- **Who:** Sales Rep / Quoting Specialist (with oversight from Sales Manager)
- **Actions:**
  - Takes supplier cost sheet from Procurement
  - Applies margin rules (varies by product category, customer tier, order size, competitive situation)
  - Typical margins: 8-25% depending on commodity vs. specialty products
  - Calculates total quote with line item pricing
  - Adds freight/delivery costs, handling fees, any surcharges
  - Applies customer-specific pricing agreements if they exist
  - Prepares formal quote document with terms & conditions
- **Decisions:**
  - What margin to apply per line item?
  - Whether to offer volume discounts?
  - What payment terms to propose? (Net 30, Net 60, LC, milestone-based)
  - Delivery schedule feasibility
- **What they need:** Customer history, competitive intelligence, margin guidelines, supplier costs, credit terms

**Step 6: Quote Approval (Internal)**
- **Who:** Sales Manager and/or GM/VP (depending on thresholds)
- **Approval thresholds (typical):**
  - < $100K: Sales Rep can approve
  - $100K-$500K: Sales Manager approval
  - $500K-$2M: VP Sales or GM approval
  - > $2M: CEO/Owner approval
  - Below-minimum-margin deals: Always escalated
- **Actions:**
  - Reviews margin analysis
  - Checks customer creditworthiness
  - Validates delivery commitments
  - May negotiate internal adjustments
- **Time:** Same day to 2 days depending on complexity

**Step 7: Credit Approval (for new customers or orders exceeding credit limit)**
- **Who:** Credit Manager / Finance Manager
- **Actions:**
  - Runs credit check on customer (D&B, trade references, financial statements)
  - Sets or adjusts credit limit
  - Determines payment terms (prepay, COD, Net 30/60/90, LC required)
  - For very large orders: may require letter of credit, payment bond, or partial prepayment
- **Decision:** Approve credit, require security instrument, or require prepayment
- **Time:** 1-3 days for new customers; same day for existing customers within limits

---

### PHASE 4: QUOTE DELIVERY & NEGOTIATION (Days 5-14+)

**Step 8: Quote Sent to Customer**
- **Who:** Sales Rep / Account Manager
- **Actions:**
  - Sends formal quote via email or portal
  - Walks customer through pricing and terms (often via phone/meeting for large deals)
  - Highlights value proposition, delivery advantages, quality commitments
- **Time:** Same day as approval

**Step 9: Customer Negotiation**
- **Who:** Sales Rep (primary), Sales Manager (for escalated negotiations)
- **Actions:**
  - Customer pushes back on price, terms, delivery schedule, or specifications
  - Sales Rep negotiates within authorized discount range
  - May go back to Procurement for re-sourcing or to request better supplier pricing
  - Multiple rounds of revision possible for large/complex orders
- **Decisions:** How much to discount? Whether to absorb freight? Whether to adjust payment terms?
- **Escalation:** GM/VP for significant concessions
- **Time:** 1-14+ days; complex orders can take weeks

---

### PHASE 5: ORDER CONVERSION & PROCUREMENT (Day of acceptance)

**Step 10: Quote Accepted -- Convert to Sales Order**
- **Who:** Sales Rep / Inside Sales / Order Entry Clerk
- **Actions:**
  - Receives customer PO or written acceptance
  - Creates Sales Order from accepted quote in system
  - Confirms final specifications, quantities, delivery schedule
  - Sends Order Acknowledgment to customer
  - Triggers credit hold check (if order exceeds remaining credit)
- **What they need:** Customer PO, signed quote, credit approval confirmation

**Step 11: Purchase Orders to Suppliers**
- **Who:** Procurement Officer / Buyer
- **Actions:**
  - Generates Purchase Orders to selected suppliers based on the sales order
  - Confirms pricing, lead times, and delivery schedule with suppliers
  - Coordinates delivery to warehouse or direct-ship to customer site
  - Tracks supplier PO confirmations
- **Decision:** Whether to use the originally-quoted supplier or re-source if conditions changed
- **Time:** Same day to next day

---

### PHASE 6: FULFILLMENT & DELIVERY (Days vary by lead time)

**Step 12: Receiving & Warehousing (if not drop-shipped)**
- **Who:** Warehouse Manager / Receiving Staff
- **Actions:**
  - Receives inbound shipments from suppliers
  - Inspects for damage, quantity accuracy, specification match
  - Updates inventory in system
  - Stages materials for outbound delivery
  - Reports discrepancies to Procurement
- **Decision:** Accept or reject shipment? Report damage claims?

**Step 13: Delivery Scheduling & Dispatch**
- **Who:** Logistics Coordinator / Dispatcher
- **Actions:**
  - Plans delivery schedule based on customer requirements and supplier lead times
  - Assigns trucks/carriers (own fleet or third-party)
  - Coordinates with customer on site delivery requirements (crane access, offloading equipment, site hours)
  - Generates delivery tickets / packing lists
  - Tracks delivery status
- **Decision:** Route optimization, carrier selection, delivery priority
- **Who also involved:** Fleet Manager (if own fleet), Driver

**Step 14: Delivery Confirmation**
- **Who:** Driver / Delivery Team / Customer
- **Actions:**
  - Materials delivered to job site
  - Customer signs proof of delivery (POD)
  - Driver reports delivery completion
  - Any shortages or damages noted on POD
- **Output:** Signed POD uploaded to system

---

### PHASE 7: INVOICING & PAYMENT (Post-delivery)

**Step 15: Invoice Generation**
- **Who:** Finance / Billing Clerk (often automated from delivery confirmation)
- **Actions:**
  - Generates invoice based on delivered quantities and agreed pricing
  - Attaches POD as backup
  - Sends invoice to customer via email/mail/portal
  - For progress-based orders: invoices per delivery milestone
- **Terms:** Typical Net 30 or Net 60 for creditworthy customers; LC draw for international

**Step 16: Payment Collection & Tracking**
- **Who:** AR Clerk / Credit Manager
- **Actions:**
  - Monitors aging report for overdue invoices
  - Sends payment reminders at 15, 30, 45 days
  - Processes incoming payments (wire transfers, checks, LC draws)
  - Applies payments to invoices
  - Reconciles discrepancies (short payments, deductions, disputes)
- **Payment methods:**
  - Wire transfer (most common for large orders)
  - Check (smaller orders, legacy customers)
  - Letter of Credit (international, very large projects, new relationships)
  - Progress payments / milestone billing (for multi-delivery projects)
- **Decision:** When to escalate to collections? When to put customer on credit hold?

**Step 17: Dispute Resolution (if applicable)**
- **Who:** Customer Service / Sales Rep / Credit Manager
- **Actions:**
  - Investigates disputed charges (pricing errors, damaged goods, short shipments)
  - Coordinates with Warehouse (for damage claims) and Procurement (for supplier claims)
  - Issues credit memos or replacement orders as appropriate
  - Documents resolution
- **Decision:** Issue credit, replace materials, or deny claim?

**Step 18: Order Close-Out**
- **Who:** Finance / Operations
- **Actions:**
  - Confirms all deliveries complete
  - Confirms all invoices paid
  - Closes sales order and purchase orders
  - Updates customer history and profitability records
  - Captures margin realization vs. quoted margin
  - Releases any retained credit holds

---

### LIFECYCLE TIMELINE SUMMARY

| Phase | Duration | Key Roles |
|---|---|---|
| Customer Inquiry | Day 0 | Sales Rep |
| Supplier Sourcing | Days 1-5 | Procurement, Sales |
| Quote Building & Approval | Days 3-7 | Sales, Sales Manager, Credit Manager |
| Quote Delivery & Negotiation | Days 5-14+ | Sales Rep, Sales Manager |
| Order Conversion & PO | Day of acceptance | Sales, Procurement |
| Fulfillment & Delivery | Varies (days to months) | Warehouse, Logistics, Drivers |
| Invoicing & Payment | Net 30-90 post-delivery | Finance, AR, Credit Manager |
| **Total Cycle:** | **2 weeks to 6+ months** | **All departments** |

---

## 3. EMPLOYEE ROLES AND DAILY WORKFLOWS

### 3A. SALES REP / ACCOUNT MANAGER

**Core Function:** Own the customer relationship. Translate customer needs into profitable orders.

**Daily Workflow:**

| Time | Activity | Tools Needed |
|---|---|---|
| 7:30-8:00 | Review overnight emails, new RFQs, customer messages | Email, CRM, Mobile |
| 8:00-9:00 | Check order status for key accounts, review delivery schedule | Order Management, Dashboard |
| 9:00-10:30 | Work on active quotes: build pricing, calculate margins, prepare proposals | Quote Builder, Supplier Cost Data, Margin Calculator |
| 10:30-12:00 | Customer calls: follow up on pending quotes, discuss active projects, handle issues | Phone, CRM, Quote System |
| 12:00-1:00 | Lunch (often with customers) | -- |
| 1:00-3:00 | Customer site visits or meetings (outside sales) / Process new RFQs (inside sales) | CRM, Quote System, Mobile |
| 3:00-4:00 | Coordinate with Procurement on supplier pricing, lead times | Internal Chat, Procurement Module |
| 4:00-5:00 | Pipeline review, update CRM, prepare for next day, send end-of-day quotes | CRM, Quote Builder |

**Key Decisions:**
- Which RFQs to prioritize (qualification)
- Margin levels per deal (within guidelines)
- When to escalate for manager approval
- How aggressively to negotiate with customers
- Which customer issues to resolve immediately vs. delegate

**Information Needed:**
- Real-time inventory levels
- Supplier lead times and pricing
- Customer credit status and payment history
- Customer order history and past pricing
- Competitive pricing intelligence
- Delivery schedule and capacity
- Margin guidelines by product category

**Tools:**
- CRM (customer data, pipeline, activity tracking)
- Quote Builder (pricing, margin calculation, document generation)
- Order Management (order status, delivery tracking)
- Mobile app (for on-site access)
- Email + phone
- Dashboard (personal KPIs, pipeline value, win rate)

---

### 3B. PROCUREMENT OFFICER / BUYER

**Core Function:** Source materials at the best combination of price, quality, and lead time. Manage supplier relationships.

**Daily Workflow:**

| Time | Activity | Tools Needed |
|---|---|---|
| 7:30-8:00 | Review new sourcing requests from Sales, check supplier communications | Email, Procurement Module |
| 8:00-9:30 | Send RFQs to suppliers for new customer requests, follow up on pending supplier quotes | Supplier Portal, Email, Phone |
| 9:30-10:30 | Evaluate received supplier quotes, compare pricing, negotiate | Procurement Module, Spreadsheet/Analysis Tools |
| 10:30-11:30 | Generate Purchase Orders for confirmed sales orders | PO System, Supplier Management |
| 11:30-12:00 | Track open POs -- confirm supplier acknowledgments, check delivery dates | PO Tracking, Supplier Portal |
| 12:00-1:00 | Lunch | -- |
| 1:00-2:30 | Supplier calls: negotiate bulk pricing, resolve delivery issues, discuss new products | Phone, Supplier Management |
| 2:30-3:30 | Coordinate with Warehouse on expected inbound deliveries | Internal Chat, WMS |
| 3:30-4:30 | Update cost sheets, analyze price trends, identify cost savings opportunities | Procurement Analytics, Spreadsheets |
| 4:30-5:00 | Update supplier scorecards, prepare next-day priorities | Supplier Management, Dashboard |

**Key Decisions:**
- Which suppliers to source from for each order
- When to negotiate harder vs. accept pricing
- Whether to consolidate orders across customers for volume discounts
- When to qualify new suppliers
- Whether to accept supplier substitutions
- Inventory replenishment quantities and timing

**Information Needed:**
- Historical supplier pricing and performance
- Current material market prices and trends
- Supplier lead times by product category
- Inventory levels and incoming stock
- Open sales orders requiring fulfillment
- Supplier contracts and payment terms
- Quality history and reject rates

**Tools:**
- Procurement module (RFQ management, PO generation, supplier quotes)
- Supplier management/portal (communication, scorecards)
- Inventory system (stock levels, incoming)
- Market price tracking
- Email + phone
- Dashboard (cost savings, supplier performance, PO status)

---

### 3C. OPERATIONS / LOGISTICS COORDINATOR

**Core Function:** Ensure materials move from suppliers through warehouse to customer job sites on time and undamaged.

**Daily Workflow:**

| Time | Activity | Tools Needed |
|---|---|---|
| 6:00-7:00 | Review today's inbound deliveries and outbound shipments | WMS, Delivery Schedule |
| 7:00-8:30 | Coordinate receiving: verify inbound shipments against POs, flag discrepancies | WMS, PO System |
| 8:30-10:00 | Plan outbound deliveries: assign routes, coordinate with drivers/carriers | TMS/Dispatch System, Route Planning |
| 10:00-11:00 | Handle delivery exceptions: delays, customer reschedules, site access issues | Phone, TMS, Customer/Sales Communication |
| 11:00-12:00 | Update delivery statuses, communicate ETAs to Sales and customers | TMS, Internal Chat |
| 12:00-1:00 | Lunch | -- |
| 1:00-2:30 | Coordinate with third-party carriers for long-haul/specialized deliveries | Phone, Email, Freight Management |
| 2:30-3:30 | Process delivery confirmations and PODs from completed deliveries | TMS, Document Management |
| 3:30-4:30 | Plan next-day deliveries, confirm customer readiness | Delivery Schedule, Phone |
| 4:30-5:00 | Report end-of-day metrics, flag outstanding issues | Dashboard, Internal Chat |

**Key Decisions:**
- Route optimization and delivery sequencing
- Carrier selection (own fleet vs. third-party)
- How to handle delivery exceptions (reschedule, partial delivery, etc.)
- Priority when capacity is constrained
- Whether to accept/reject inbound shipments with issues

**Information Needed:**
- Real-time delivery schedule
- Truck/fleet availability
- Customer delivery requirements (crane, forklift, site hours)
- Inbound shipment tracking from suppliers
- Inventory locations within warehouse
- Customer contact info for delivery coordination

**Tools:**
- WMS (Warehouse Management System)
- TMS (Transportation Management System) / Dispatch system
- Route planning / GPS tracking
- Mobile app (driver communication)
- Internal chat / phone
- Dashboard (on-time delivery, capacity utilization)

---

### 3D. WAREHOUSE MANAGER

**Core Function:** Manage inventory storage, receiving, picking, and staging for delivery. Maintain accuracy.

**Daily Workflow:**

| Time | Activity | Tools Needed |
|---|---|---|
| 6:00-6:30 | Review expected inbound and outbound for the day | WMS, Delivery Schedule |
| 6:30-8:00 | Supervise morning receiving: inspect, count, log incoming shipments | WMS, Mobile Scanner |
| 8:00-9:30 | Direct picking and staging for today's outbound deliveries | WMS, Pick Lists |
| 9:30-10:30 | Walk warehouse floor: check organization, safety, storage conditions | Physical inspection |
| 10:30-11:30 | Handle discrepancies: damaged goods, count variances, supplier shortages | WMS, Procurement Communication |
| 11:30-12:00 | Staffing and scheduling for warehouse team | HR/Scheduling Tools |
| 12:00-1:00 | Lunch | -- |
| 1:00-2:30 | Process afternoon receiving, coordinate special order handling | WMS |
| 2:30-3:30 | Cycle counting and inventory reconciliation | WMS, Scanner |
| 3:30-4:30 | Prepare for next day: pre-stage orders, assign tasks | WMS, Task Management |
| 4:30-5:00 | Review metrics, report issues | Dashboard |

**Key Decisions:**
- Accept or reject inbound shipments (quality/quantity issues)
- Warehouse layout and storage optimization
- Staff allocation and scheduling
- Inventory accuracy remediation
- Safety and compliance issues

**Tools:**
- WMS with barcode/RFID scanning
- Mobile devices/scanners for staff
- Forklift/material handling equipment
- Dashboard (inventory accuracy, throughput, safety incidents)

---

### 3E. DISPATCHER / FLEET MANAGER

**Core Function:** Manage the delivery fleet, assign drivers, optimize routes, track deliveries in real-time.

**Daily Workflow:**

| Time | Activity | Tools Needed |
|---|---|---|
| 5:30-6:30 | Plan today's routes, assign drivers to deliveries | Dispatch System, Route Optimizer |
| 6:30-7:30 | Pre-trip briefing with drivers, distribute delivery tickets | Mobile/Dispatch System |
| 7:30-12:00 | Monitor live deliveries: track GPS, handle exceptions, communicate with drivers and customers | GPS Tracking, Mobile, Phone |
| 12:00-1:00 | Lunch (staggered with active monitoring) | -- |
| 1:00-3:00 | Continue monitoring, process completed PODs, coordinate afternoon deliveries | Dispatch System, Document Management |
| 3:00-4:00 | Coordinate next-day staging needs with Warehouse | Internal Chat, WMS |
| 4:00-5:00 | Review fleet utilization, maintenance needs, driver hours compliance | Fleet Management, Dashboard |

**Key Decisions:**
- Route assignments and optimization
- Driver-to-delivery matching (vehicle type, certification, location)
- Real-time rerouting for delays or emergencies
- Vehicle maintenance scheduling
- Third-party carrier engagement when fleet capacity insufficient

**Tools:**
- Dispatch/route planning system
- GPS fleet tracking
- Mobile driver app (POD capture, navigation, communication)
- Fleet maintenance tracking
- Dashboard (fleet utilization, on-time %, cost per delivery)

---

### 3F. FINANCE / ACCOUNTANT

**Core Function:** Manage invoicing, accounts receivable/payable, financial reporting, and cash flow.

**Daily Workflow:**

| Time | Activity | Tools Needed |
|---|---|---|
| 8:00-9:00 | Process previous day's delivery confirmations into invoices | Accounting/ERP, Invoicing Module |
| 9:00-10:00 | Review and post incoming payments (wires, checks, LC draws) | Banking Portal, AR Module |
| 10:00-11:00 | Reconcile supplier invoices against POs and receiving records | AP Module, PO System |
| 11:00-12:00 | Process supplier payments per terms | AP Module, Banking Portal |
| 12:00-1:00 | Lunch | -- |
| 1:00-2:00 | Review AR aging, identify overdue accounts, send reminders | AR Module, Email |
| 2:00-3:00 | Handle billing disputes and credit memo requests | AR Module, Sales Communication |
| 3:00-4:00 | Bank reconciliation, cash flow monitoring | Accounting System, Banking |
| 4:00-5:00 | Financial reporting, margin analysis, month-end tasks | Reporting/BI Tools |

**Key Decisions:**
- Payment prioritization for suppliers
- When to escalate overdue accounts
- Credit memo approvals (within authority)
- Cash flow management

**Tools:**
- Accounting/ERP system
- AR and AP modules
- Banking portals (for wire transfers, check processing)
- Invoicing system
- Financial reporting/BI tools
- Dashboard (DSO, cash flow, AR aging, margin realization)

---

### 3G. CREDIT MANAGER

**Core Function:** Assess and manage customer credit risk. Set credit limits. Ensure the company gets paid.

**Daily Workflow:**

| Time | Activity | Tools Needed |
|---|---|---|
| 8:00-9:00 | Review new credit applications and requests for credit limit increases | Credit Application System, D&B/Credit Reports |
| 9:00-10:30 | Perform credit analysis on pending applications: financial statements, references, payment history | Credit Analysis Tools, Financial Databases |
| 10:30-11:30 | Review orders on credit hold, make release/hold decisions | Order Management, Credit Module |
| 11:30-12:00 | Communicate credit decisions to Sales | Email, Internal Chat |
| 12:00-1:00 | Lunch | -- |
| 1:00-2:30 | Contact overdue customers, negotiate payment plans | Phone, AR Module |
| 2:30-3:30 | Review and process letter of credit documents | LC Management, Banking |
| 3:30-4:30 | Update credit files, review portfolio risk exposure | Credit Module, Reporting |
| 4:30-5:00 | Report on credit metrics, flag high-risk accounts | Dashboard |

**Key Decisions:**
- Approve or deny credit applications
- Set credit limits per customer
- Determine required payment terms or security instruments
- Release or hold orders exceeding credit limits
- When to escalate to collections or legal
- Whether to require LC, payment bond, or prepayment

**Information Needed:**
- Customer financial statements
- D&B / credit bureau reports
- Trade references
- Payment history (internal and external)
- Current credit exposure
- Project/contract details (for project-specific credit)

**Tools:**
- Credit management module
- D&B / credit reporting services
- Financial analysis tools
- AR aging reports
- LC management system
- Dashboard (exposure by customer, delinquency rates, bad debt %)

---

### 3H. CUSTOMER SERVICE REPRESENTATIVE

**Core Function:** Handle inbound customer inquiries on order status, delivery, issues, and returns.

**Daily Workflow:**

| Time | Activity | Tools Needed |
|---|---|---|
| 8:00-12:00 | Handle inbound calls and emails: order status, delivery ETA, pricing questions, complaint intake | Phone, Email, Order Management, CRM |
| 12:00-1:00 | Lunch | -- |
| 1:00-3:00 | Process returns and claims, coordinate with Warehouse and Sales | Returns Module, WMS, CRM |
| 3:00-4:00 | Follow up on open issues, update customers on resolution status | CRM, Email, Phone |
| 4:00-5:00 | Document issues, update FAQ/knowledge base, report trends | CRM, Knowledge Base |

**Key Decisions:**
- Urgency classification of issues
- When to involve Sales Rep vs. handle directly
- When to issue replacement orders
- Routing of complaints to appropriate department

**Tools:**
- CRM with service/ticketing module
- Order management system (view-only or limited)
- Phone system
- Email
- Knowledge base
- Dashboard (ticket volume, resolution time, satisfaction)

---

### 3I. GENERAL MANAGER / COO

**Core Function:** Oversee all operations. Make strategic decisions. Manage department heads. Ensure profitability.

**Daily Workflow:**

| Time | Activity | Tools Needed |
|---|---|---|
| 7:30-8:00 | Review overnight alerts: large orders, credit issues, delivery problems | Mobile Dashboard, Email |
| 8:00-9:00 | Morning standup with department heads (brief status on key issues) | Meeting, Internal Chat |
| 9:00-10:30 | Review and approve high-value quotes (above threshold) | Quote Approval System |
| 10:30-12:00 | Strategic work: supplier relationships, key customer meetings, market analysis | CRM, Market Data |
| 12:00-1:00 | Lunch (often with key customers or suppliers) | -- |
| 1:00-2:30 | Operational reviews: delivery performance, inventory levels, cash flow | Executive Dashboard, BI Tools |
| 2:30-4:00 | People management: 1:1s with direct reports, hiring decisions, performance reviews | HR System, Meeting |
| 4:00-5:00 | Financial review: margin analysis, P&L review, forecasting | Financial Reports, BI Tools |

**Key Decisions:**
- Quote approval for high-value deals
- Credit policy decisions
- Major supplier negotiations and partnerships
- Hiring and organizational changes
- Pricing strategy and margin targets
- Capital allocation (fleet, warehouse, technology)
- Market expansion decisions

**Tools:**
- Executive dashboard (real-time KPIs across all departments)
- Quote approval queue
- Financial reporting / BI
- CRM (key account visibility)
- Email + phone
- Calendar/meeting management

---

## 4. INTERNAL APP MODULES NEEDED

For a quote-based, high-value building materials distributor, the following software modules are essential. This is organized from customer-facing to back-office.

### MODULE MAP

```
CUSTOMER-FACING                CORE OPERATIONS                BACK OFFICE
+------------------+     +---------------------------+    +-------------------+
| Customer Portal  |     | RFQ Management            |    | Finance           |
| - Submit RFQs    |     | - Inbound request intake  |    | - Invoicing       |
| - View quotes    |     | - Qualification           |    | - AR/AP           |
| - Track orders   |     | - Assignment routing      |    | - Payment tracking|
| - View invoices  |     +---------------------------+    | - Credit mgmt     |
| - Download PODs  |     | Supplier Sourcing         |    | - LC management   |
+------------------+     | - Outbound RFQ to vendors |    +-------------------+
                          | - Quote comparison        |    | Reporting / BI    |
                          | - Price negotiation       |    | - Margin analysis |
                          | - Supplier scorecards     |    | - Sales pipeline  |
                          +---------------------------+    | - Delivery perf.  |
                          | Quote Builder             |    | - Financial       |
                          | - Margin calculation      |    | - Customer prof.  |
                          | - Multi-tier pricing      |    +-------------------+
                          | - Approval workflows      |    | HR / Admin        |
                          | - Version management      |    | - Payroll         |
                          | - Document generation     |    | - Scheduling      |
                          +---------------------------+    +-------------------+
                          | Order Management          |
                          | - Quote-to-order convert  |
                          | - Order tracking          |
                          | - Delivery scheduling     |
                          | - Status notifications    |
                          +---------------------------+
                          | Procurement / PO          |
                          | - PO generation           |
                          | - Supplier PO tracking    |
                          | - Receiving confirmation  |
                          | - Supplier invoice match  |
                          +---------------------------+
                          | Warehouse / Inventory     |
                          | - Receiving               |
                          | - Put-away                |
                          | - Picking/staging         |
                          | - Cycle counting          |
                          | - Multi-location          |
                          +---------------------------+
                          | Dispatch / Delivery       |
                          | - Route planning          |
                          | - Driver assignment       |
                          | - GPS tracking            |
                          | - POD capture             |
                          | - Carrier management      |
                          +---------------------------+
                          | CRM                       |
                          | - Customer profiles       |
                          | - Contact management      |
                          | - Interaction history     |
                          | - Pipeline tracking       |
                          | - Activity logging        |
                          +---------------------------+
```

### DETAILED MODULE REQUIREMENTS

#### 4.1 RFQ Management (Inbound)
- **Purpose:** Capture, qualify, and route incoming customer material requests
- **Features:**
  - Multi-channel intake (email parser, web form, manual entry)
  - Auto-extraction of BOMs from attachments (PDFs, spreadsheets)
  - RFQ qualification scoring
  - Auto-assignment to Sales Rep based on customer/territory
  - Due date tracking and SLA alerts
  - Status workflow: New > Qualified > Sourcing > Quoted > Accepted/Declined
  - Linked to CRM customer record
- **Users:** Sales Reps, Inside Sales, Sales Manager

#### 4.2 Supplier Price Sourcing (Outbound)
- **Purpose:** Send RFQs to suppliers and collect/compare responses
- **Features:**
  - Outbound RFQ generation from customer BOM
  - Supplier selection (preferred suppliers per product category)
  - Email/portal-based supplier communication
  - Quote comparison matrix (price, lead time, terms, quality score)
  - Historical price tracking per supplier per product
  - Supplier response time tracking
  - Link to supplier scorecards
- **Users:** Procurement Officers, Buyers

#### 4.3 Quote Builder
- **Purpose:** Calculate margins, build professional quotes, manage approval workflows
- **Features:**
  - Import supplier costs automatically from sourcing module
  - Configurable margin rules (by product, customer tier, order size, region)
  - Line-item level margin visibility
  - Blended margin calculation for full quote
  - Freight/delivery cost calculation
  - Payment terms selection
  - Multi-tier approval workflow (thresholds by value and margin)
  - Quote versioning (V1, V2, V3...)
  - Professional quote document generation (PDF)
  - Quote expiration dates and alerts
  - Win/loss tracking
  - Integration with customer portal for quote delivery
- **Users:** Sales Reps, Sales Manager, GM (approvals)

#### 4.4 Order Management
- **Purpose:** Track orders from acceptance through fulfillment and delivery
- **Features:**
  - One-click quote-to-order conversion
  - Customer PO capture and matching
  - Order status tracking (Confirmed > In Procurement > In Warehouse > Staged > In Transit > Delivered)
  - Partial order / split delivery support
  - Change order management
  - Delivery schedule management
  - Customer notifications (automated)
  - POD collection and storage
  - Link to invoicing trigger
- **Users:** Sales Reps, Operations, Customer Service

#### 4.5 Procurement / PO Module
- **Purpose:** Generate and track Purchase Orders to suppliers
- **Features:**
  - Auto-PO generation from confirmed sales orders
  - PO approval workflow
  - Supplier PO acknowledgment tracking
  - Expected delivery date tracking
  - Three-way match (PO vs. Receipt vs. Supplier Invoice)
  - Supplier payment terms management
  - PO amendment/change management
  - Blanket PO support (for ongoing supply agreements)
  - Direct-ship PO capability
- **Users:** Procurement, Finance (AP)

#### 4.6 Warehouse / Inventory Module
- **Purpose:** Manage physical inventory, receiving, storage, and outbound staging
- **Features:**
  - Real-time inventory visibility across locations
  - Receiving workflow (vs. PO matching)
  - Put-away location management
  - Pick-pack-stage workflow for outbound orders
  - Barcode/RFID scanning support
  - Cycle counting and reconciliation
  - Damage/quality hold management
  - Reserved inventory (allocated to specific orders)
  - Reorder point alerts
  - Multi-warehouse support
- **Users:** Warehouse Manager, Warehouse Staff, Procurement

#### 4.7 Dispatch / Delivery Module
- **Purpose:** Plan, execute, and track all deliveries
- **Features:**
  - Delivery calendar with capacity view
  - Route planning and optimization
  - Driver/vehicle assignment
  - Real-time GPS tracking
  - Mobile driver app (navigation, POD capture, status updates)
  - Customer delivery notification (ETA alerts)
  - Third-party carrier management and rate comparison
  - POD capture (photo + signature)
  - Delivery cost tracking (per order, per mile)
  - Fleet maintenance scheduling (if own fleet)
- **Users:** Dispatcher, Logistics Coordinator, Drivers

#### 4.8 Finance Module
- **Purpose:** Invoicing, AR/AP, payment tracking, credit management
- **Sub-modules:**

  **Invoicing:**
  - Auto-invoice generation from delivery confirmation
  - Progress/milestone billing support
  - Invoice customization per customer requirements
  - Multi-currency support
  - Invoice delivery (email, portal, mail)

  **Accounts Receivable:**
  - Payment application (wire, check, LC)
  - AR aging reports and alerts
  - Automated payment reminders
  - Dispute/deduction management
  - Bad debt tracking

  **Accounts Payable:**
  - Three-way match (PO, receipt, supplier invoice)
  - Payment scheduling by terms
  - Supplier payment processing
  - Early payment discount tracking

  **Credit Management:**
  - Credit application workflow
  - Credit limit management
  - Automatic credit hold on orders exceeding limits
  - Credit exposure dashboard
  - Letter of credit management (issuance, draws, tracking)
  - Payment bond tracking

  **General Ledger/Reporting:**
  - Chart of accounts
  - Margin analysis (quoted vs. realized)
  - P&L by customer, project, product category
  - Cash flow forecasting
  - Tax management

- **Users:** Finance team, Credit Manager, GM

#### 4.9 CRM Module
- **Purpose:** Manage customer relationships, history, and sales pipeline
- **Features:**
  - Customer master data (company, contacts, sites, credit info)
  - Interaction/activity logging
  - Sales pipeline visualization
  - Customer profitability analysis
  - Quote history per customer
  - Order history per customer
  - Customer tier/classification
  - Territory management
  - Task and follow-up management
  - Integration with all other modules for 360-degree view
- **Users:** Sales team, Sales Manager, GM, Customer Service

#### 4.10 Reporting / Dashboards
- **Purpose:** Provide real-time visibility and analytics across all operations
- **Dashboard views by role:**

| Role | Key Dashboard Widgets |
|---|---|
| GM/CEO | Revenue, margin, pipeline value, AR aging, on-time delivery, cash flow |
| Sales Manager | Team pipeline, quote conversion rate, revenue by rep, margin by deal |
| Sales Rep | My pipeline, my quotes pending, my orders in progress, my KPIs |
| Procurement | Open sourcing requests, pending supplier quotes, PO status, cost trends |
| Operations | Today's deliveries, inbound expected, warehouse capacity, exceptions |
| Finance | AR aging, cash position, DSO, margin realization, AP due |
| Credit Manager | Credit exposure, accounts on hold, overdue accounts, new applications |

---

## 5. WORKFLOW AUTOMATION OPPORTUNITIES

### What Can Be Automated vs. Needs Human Judgment

| Process Step | Automation Potential | Details |
|---|---|---|
| **RFQ intake & parsing** | HIGH | AI can extract BOMs from emails/PDFs, auto-classify products, route to correct sales rep |
| **RFQ qualification** | MEDIUM | Auto-score based on customer tier, order value, product fit; humans decide on edge cases |
| **Supplier RFQ distribution** | HIGH | Auto-send sourcing requests to preferred suppliers based on product category |
| **Supplier quote comparison** | HIGH | Auto-populate comparison matrix, flag best price/lead time; human decides final selection |
| **Margin calculation** | HIGH | Apply margin rules automatically; humans review/override for strategic deals |
| **Quote document generation** | HIGH | Auto-generate from template once pricing approved |
| **Quote approval routing** | HIGH | Auto-route based on value/margin thresholds; humans make approval decision |
| **Customer negotiation** | LOW | Requires human relationship skills and judgment |
| **Credit checks** | MEDIUM-HIGH | Auto-pull credit data, apply scoring rules; human decision on exceptions |
| **Order conversion** | HIGH | One-click from accepted quote to sales order |
| **PO generation** | HIGH | Auto-generate POs from confirmed sales orders |
| **Delivery scheduling** | MEDIUM | System suggests optimal routes/dates; humans confirm and handle exceptions |
| **Invoice generation** | HIGH | Auto-generate from delivery confirmation |
| **Payment reminders** | HIGH | Automated email sequences at defined intervals |
| **Payment application** | MEDIUM | Auto-match incoming payments to invoices; human handles discrepancies |
| **Dispute resolution** | LOW | Requires investigation and judgment |

### Where AI Adds the Most Value

1. **RFQ Parsing & Extraction (Immediate ROI)**
   - AI reads incoming emails and attached BOMs (PDFs, Excel, images)
   - Extracts product specifications, quantities, delivery requirements
   - Creates structured RFQ records automatically
   - Saves 30-60 minutes per RFQ for sales reps

2. **Intelligent Pricing & Margin Optimization**
   - AI analyzes historical pricing, win/loss data, market conditions
   - Recommends optimal margin per line item to maximize win probability AND profitability
   - Flags when competitor pricing likely undercuts current quote
   - Suggests volume discount structures

3. **Supplier Selection & Cost Prediction**
   - AI predicts supplier pricing based on historical data and market trends
   - Recommends optimal supplier mix per order
   - Flags unusual supplier pricing (errors or market shifts)
   - Predicts lead time accuracy based on supplier history

4. **Demand Forecasting**
   - AI analyzes customer ordering patterns, seasonal trends, market indicators
   - Predicts upcoming demand to optimize inventory and supplier negotiations
   - Identifies cross-sell/upsell opportunities based on customer projects

5. **Credit Risk Scoring**
   - AI analyzes customer payment patterns, financial data, market conditions
   - Provides dynamic credit risk scores that update in real-time
   - Flags early warning signs of payment problems

6. **Cash Flow Prediction**
   - AI predicts payment timing based on customer behavior patterns
   - Forecasts cash flow based on open orders, invoices, and payment history

### Approval Workflows Required

| Approval Type | Trigger | Approver(s) | Auto-Approve Conditions |
|---|---|---|---|
| Quote approval | Quote created | Based on value threshold (see Section 2, Step 6) | Below $100K AND within margin guidelines |
| Credit approval | New customer OR exceeds credit limit | Credit Manager | Existing customer, within existing credit limit |
| Purchase Order | PO generated | Procurement Manager (above threshold) | Auto-approved if linked to approved sales order under $50K |
| Credit memo | Customer dispute resolved | Sales Manager (small), Finance Manager (large) | Never auto-approved |
| Payment release | Supplier payment due | Finance Manager (above threshold) | Within terms, three-way match complete, under $25K |
| Discount/concession | Customer negotiation | Sales Manager or GM | Within rep's authorized discount range |

---

## 6. MINIMUM VIABLE TEAM

### Launch Team: 5-7 People

For a building materials distributor launching with $0-$5M in first-year revenue targets:

| Role | Person | Covers | Priority |
|---|---|---|---|
| **Founder/CEO** | Person 1 | Strategic sales, key supplier relationships, major quote approvals, overall management | ESSENTIAL |
| **Sales/Account Manager** | Person 2 | Customer intake, RFQ processing, quoting, customer relationships, order follow-up | ESSENTIAL |
| **Procurement/Operations** | Person 3 | Supplier sourcing, PO management, logistics coordination, delivery scheduling | ESSENTIAL |
| **Warehouse/Logistics** | Person 4 | Receiving, inventory management, staging, basic dispatch | ESSENTIAL |
| **Finance/Admin** | Person 5 | Invoicing, AR/AP, credit checks, bookkeeping, office admin | ESSENTIAL |
| **Sales Rep #2** | Person 6 | Second territory or customer segment coverage | ADD AT $1-2M |
| **Driver** | Person 7 | Delivery (or outsource entirely to carriers initially) | ADD WHEN NEEDED |

### Role Consolidation at Launch

| Combined Role | Functions Covered |
|---|---|
| Founder/CEO | GM + Business Development + Key Account Sales + Final Quote Approver + Credit Policy |
| Sales/Account Manager | Inside Sales + Outside Sales + Quoting + Customer Service + CRM |
| Procurement/Operations | Purchasing + Supplier Management + Logistics Coordination + Inventory Planning |
| Warehouse/Logistics | Warehouse Manager + Receiving + Picking + Basic Dispatch + Driver Coordination |
| Finance/Admin | Bookkeeper + AR + AP + Invoicing + Credit Checks + Office Admin + HR |

### What Can Be Deferred

| Role | When to Add | Why Not at Launch |
|---|---|---|
| Dedicated Credit Manager | $10-20M revenue | Owner/Finance person handles credit at small scale |
| Inside Sales Team | $5-10M revenue | Sales reps handle both inside and outside at first |
| Procurement Team (multiple) | $10-20M revenue | One person can manage 10-20 supplier relationships |
| Customer Service Rep | $5M+ revenue | Sales reps handle their own customer issues initially |
| IT Support | $10M+ revenue | Outsource IT initially; cloud-based tools reduce need |
| HR | $20M+ revenue | Outsource payroll; manager handles hiring |
| Marketing | $20M+ revenue | Relationship-driven sales don't need marketing initially |
| Fleet Manager | When own fleet > 5 vehicles | Outsource delivery initially |

---

## 7. COMMUNICATION FLOWS

### Internal Communication Matrix

| From / To | Sales | Procurement | Operations | Finance | GM |
|---|---|---|---|---|---|
| **Sales** | Team chat, pipeline reviews | Sourcing requests, spec clarification | Delivery status requests, schedule changes | Credit checks, billing questions | Quote approvals, deal strategy |
| **Procurement** | Cost updates, lead time alerts | Supplier negotiations | Inbound delivery schedules | Supplier payment requests | Major supplier decisions |
| **Operations** | Delivery confirmations, exceptions | Receiving discrepancies | Shift handoffs, task assignments | POD submission for invoicing | Capacity issues, equipment needs |
| **Finance** | Credit holds, payment status | Supplier invoice queries | Delivery cost reporting | Internal reviews | Cash flow, risk alerts |
| **GM** | Target setting, strategy | Supplier strategy | Performance reviews | Budget, P&L review | -- |

### Communication Tools by Type

| Communication Type | Tool | Example |
|---|---|---|
| **Urgent/real-time** | Internal chat (Slack, Teams) | "Customer X needs delivery moved to tomorrow" |
| **Formal requests** | System notifications / workflows | Quote approval request, credit application |
| **External - customers** | Email, phone, customer portal | Quotes, order confirmations, invoices |
| **External - suppliers** | Email, phone, supplier portal | RFQs, POs, delivery coordination |
| **Reporting** | Dashboards, automated reports | Daily delivery summary, weekly AR aging |
| **Meetings** | Video/in-person | Weekly ops standup, monthly business review |

### Notification Requirements by Role

| Role | Critical Notifications |
|---|---|
| **Sales Rep** | New RFQ assigned, supplier costs ready for quoting, quote approved/rejected, order status change, customer payment received, customer issue raised |
| **Procurement** | New sourcing request from Sales, supplier quote received, PO acknowledged by supplier, delivery date change, price change alert |
| **Operations** | New order ready for fulfillment, inbound shipment arriving, delivery exception, customer reschedule, POD submitted |
| **Finance** | Delivery confirmed (trigger invoice), payment received, invoice past due, credit limit exceeded, credit application submitted |
| **Credit Manager** | New credit application, order on credit hold, payment 30+ days overdue, credit limit breach |
| **GM** | High-value quote pending approval, margin below threshold, major delivery failure, large payment overdue, daily summary |

### Approval Chains

```
Quote Approval:
  Sales Rep creates quote
    -> If < $100K and margin OK: Auto-approved
    -> If $100K-$500K: Sales Manager approves
    -> If > $500K: GM/VP approves
    -> If below margin floor: GM always approves

Credit Approval:
  Sales or system flags credit need
    -> Credit Manager evaluates
    -> If new customer > $500K: GM co-approves
    -> If LC required: Finance Manager coordinates

Purchase Order:
  Procurement creates PO
    -> If linked to approved SO and < $50K: Auto-approved
    -> If > $50K: Procurement Manager approves
    -> If > $250K: GM co-approves

Credit Memo / Refund:
  Customer Service/Sales initiates
    -> If < $5K: Sales Manager approves
    -> If > $5K: Finance Manager approves
    -> If > $25K: GM approves
```

---

## 8. REAL COMPANY EXAMPLES

### Builders FirstSource (BLDR)
- **Size:** ~28,000 employees, ~585 locations, ~$17B revenue
- **Structure:** Publicly traded Fortune 500. Operates through regional branches, each with local sales, operations, and warehouse teams.
- **Technology:** Invested heavily in digital transformation. Acquired WTS Paradigm for $450M to gain ERP and software capabilities for the building products industry. IT team manages enterprise systems (HCM, ServiceNow), data analytics, and software development.
- **Key departments:** Sales, Manufacturing/Value-Add (trusses, panels, millwork), Distribution, Operations, IT, Finance, HR.
- **Model:** Combines manufacturing with distribution. Both stock-and-sell and made-to-order.

### ABC Supply Co.
- **Size:** Largest wholesale roofing distributor in North America. 900+ locations across US and Canada.
- **Structure:** Branch-based model. Each branch operates semi-autonomously with branch manager, counter sales, warehouse, and delivery staff.
- **Model:** Primarily stock-and-sell for roofing and exterior products. Walk-in counter sales plus account-based sales. More catalog-priced than custom-quoted.
- **Technology:** Proprietary branch management systems. Strong focus on delivery speed (same-day/next-day).

### HD Supply
- **Size:** Subsidiary of The Home Depot. 100+ distribution centers. Major B2B wholesale distributor.
- **Structure:** Centralized procurement and inventory management with distributed fulfillment.
- **Model:** Large-scale MRO (maintenance, repair, operations) and construction supply. Mix of catalog pricing and negotiated contracts.
- **Technology:** Leverages Home Depot's technology infrastructure. Strong e-commerce capabilities.

### BMD (Building Material Distributors)
- **Size:** ~200 employees, ~$171M revenue (revenue per employee ~$855K).
- **Structure:** Regional distributor. More representative of mid-size distributor model.
- **Model:** Two-step distribution (buys from manufacturers, sells to retailers/dealers). Quote-based for large orders.

### Industry-Specific ERP Systems Used

| System | Focus | Key Features |
|---|---|---|
| **Spruce (ECI Solutions)** | LBM dealers, building supply | POS, inventory, purchasing, accounting, quoting, ecommerce, contractor pricing |
| **DMSi Agility** | Lumber and building materials | Inventory, order management, long-lead orders, delivery, production shop |
| **Ximple ERP** | Construction distributors | Real-time inventory, predictive replenishment, quote-to-cash, multi-warehouse |
| **CAVU ERP** | Mason and building supply | Margin management, procurement, inventory, CRM |
| **Enterprise 21 (TGI)** | Building products manufacturers/distributors | Online quoting, available-to-promise, order management |
| **Kojo** | Construction material management | Field-to-office procurement, material tracking, vendor management |
| **Trimble StructShare** | Construction procurement | Procurement, inventory, material tracking |
| **TOOLBX** | Modern building suppliers | AI-powered digital experience, customer portal, quoting |
| **NetSuite** | General wholesale distribution | Full ERP: financials, CRM, inventory, procurement, ecommerce |
| **SAP Business One** | Mid-size distributors | Full ERP with industry add-ons |

---

## 9. KPIs PER ROLE

### Sales Department

| KPI | Target Range | Measured By |
|---|---|---|
| Revenue (total and per rep) | Varies by territory | Monthly/Quarterly |
| Quote-to-order conversion rate | 25-40% (by count), 30-50% (by value) | Monthly |
| Average quote turnaround time | < 48 hours (standard), < 24 hours (urgent) | Weekly |
| Gross margin per deal | 12-25% depending on product mix | Per quote/order |
| Pipeline value | 3-4x monthly revenue target | Weekly |
| Number of active quotes | 15-30 per rep | Weekly |
| Customer retention rate | > 85% year-over-year | Annual |
| New customer acquisition | 2-5 new accounts per rep per quarter | Quarterly |
| Average deal size | Trending upward | Monthly |
| Win/loss ratio and reasons | Track competitive losses | Monthly |

### Procurement Department

| KPI | Target Range | Measured By |
|---|---|---|
| Supplier response time | < 24 hours for standard, < 4 hours for urgent | Per RFQ |
| Cost savings vs. benchmark | 3-8% year-over-year improvement | Quarterly |
| Supplier on-time delivery rate | > 90% | Monthly |
| Supplier quality/reject rate | < 2% | Monthly |
| PO cycle time (request to PO sent) | < 4 hours for standard orders | Weekly |
| Number of active suppliers per category | 2-4 preferred per category | Quarterly |
| Inventory turnover | 6-12x per year (varies by product) | Monthly |
| Stockout rate | < 3% | Monthly |

### Operations / Warehouse

| KPI | Target Range | Measured By |
|---|---|---|
| On-time delivery rate (OTIF) | > 95% | Weekly |
| Order fill rate | > 97% | Weekly |
| Warehouse inventory accuracy | > 99% | Monthly (via cycle counts) |
| Receiving turnaround time | Same day for standard items | Daily |
| Picking accuracy | > 99.5% | Weekly |
| Delivery cost per order | Trending downward | Monthly |
| Fleet utilization rate | > 75% | Weekly |
| Damage rate (in warehouse + transit) | < 0.5% | Monthly |
| Orders shipped per labor hour | Trending upward | Weekly |

### Finance Department

| KPI | Target Range | Measured By |
|---|---|---|
| Days Sales Outstanding (DSO) | 35-55 days (industry varies) | Monthly |
| AR aging (% current vs. 30/60/90+) | > 80% current | Weekly |
| Invoice accuracy rate | > 99% | Monthly |
| Invoice turnaround time | < 24 hours after delivery | Weekly |
| Bad debt as % of revenue | < 0.5% | Quarterly |
| Payment application accuracy | > 99% | Monthly |
| Cash conversion cycle | Trending downward | Monthly |
| AP utilization of early pay discounts | > 80% when beneficial | Monthly |

### Credit Manager

| KPI | Target Range | Measured By |
|---|---|---|
| Credit application turnaround | < 48 hours (existing), < 5 days (new) | Weekly |
| Bad debt write-offs as % of AR | < 0.3-0.5% | Quarterly |
| Credit hold release time | < 4 hours during business hours | Weekly |
| Portfolio risk distribution | No single customer > 10% of AR | Monthly |
| Collection effectiveness index | > 85% | Monthly |
| Delinquency rate (60+ days) | < 5% of AR | Monthly |
| Customer credit limit utilization | Monitor outliers > 90% | Weekly |

### General Manager / Executive

| KPI | Target Range | Measured By |
|---|---|---|
| Revenue growth | 10-25% year-over-year | Monthly |
| Gross margin | 15-25% (varies by product mix) | Monthly |
| Net profit margin | 3-8% | Monthly |
| Operating expense ratio | < 15-20% of revenue | Monthly |
| Revenue per employee | > $800K-$1M+ | Quarterly |
| Customer satisfaction / NPS | > 50 NPS | Quarterly |
| Employee retention | > 85% annually | Quarterly |
| Return on working capital | > 20% | Quarterly |
| Market share growth | Year-over-year | Annual |

---

## 10. SCALING THE TEAM

### Revenue Milestone-Based Hiring Guide

#### $0-$2M Revenue (Founding Stage: 5-7 people)

| Hire | Role | Rationale |
|---|---|---|
| Day 1 | Founder/CEO | Everything strategic, sales, supplier relationships |
| Day 1 | Sales/Account Manager | Customer-facing, quoting, order management |
| Day 1 | Procurement/Ops Person | Supplier sourcing, PO management, logistics |
| Day 1 | Warehouse Worker | Physical operations, receiving, staging |
| Day 1 | Finance/Admin | Books, invoicing, office management |
| ~$1M | Sales Rep #2 | Founder can't do all sales alone anymore |
| ~$1.5M | Warehouse Worker #2 | Volume requires more physical labor |

#### $2M-$5M Revenue (Early Growth: 8-12 people)

| Hire | Role | Trigger |
|---|---|---|
| ~$2M | Inside Sales / Order Entry | Sales reps spending too much time on admin |
| ~$3M | Driver or Logistics Coordinator | Delivery volume justifies dedicated resource |
| ~$3M | Sales Rep #3 | Expanding into new territory or customer segment |
| ~$4M | Warehouse Lead | Warehouse needs supervision as team grows to 3+ |
| ~$5M | Customer Service Rep | Customer inquiry volume too high for sales team |

#### $5M-$10M Revenue (Establishing Structure: 12-20 people)

| Hire | Role | Trigger |
|---|---|---|
| ~$5M | **Sales Manager** (promote or hire) | 3+ sales reps need management, coaching, pipeline oversight |
| ~$6M | **Dedicated Procurement Person** | Sourcing complexity requires full-time attention; split from ops |
| ~$7M | AR/AP Clerk | Finance person drowning in transaction volume |
| ~$8M | Operations Manager | Logistics, warehouse, dispatch need coordinated management |
| ~$10M | Additional Sales Reps | Revenue growth demands more customer coverage |

#### $10M-$25M Revenue (Professionalizing: 20-30 people)

| Hire | Role | Trigger |
|---|---|---|
| ~$10M | **Credit Analyst/Manager** | AR exposure too large for Finance person to manage alongside bookkeeping |
| ~$12M | **Procurement team expands** (2nd buyer) | Supplier base grows beyond what one person can manage effectively |
| ~$15M | IT Support | Systems complexity requires dedicated technical resource |
| ~$15M | **VP/Director of Sales** | Sales team of 5+ needs strategic leadership |
| ~$20M | Second Warehouse location or major expansion | Geography or volume demands |
| ~$20M | HR Coordinator | 20+ employees need dedicated people management |

#### $25M-$50M Revenue (Departmentalization: 30-50 people)

| Hire | Role | Trigger |
|---|---|---|
| ~$25M | **COO or VP Operations** | Operations complexity needs senior leadership |
| ~$25M | Split inside sales from outside sales | Specialization improves both functions |
| ~$30M | **Finance Manager/Controller** | Financial complexity requires professional financial leadership |
| ~$30M | Category Manager (Procurement) | Product categories need specialized buyer expertise |
| ~$35M | Fleet Manager (if own fleet) | Fleet of 5+ vehicles needs dedicated management |
| ~$40M | Customer Service team (2-3) | Volume requires dedicated CS department |
| ~$50M | **CFO** (or outsourced fractional) | Financial strategy needs C-level attention |

#### $50M-$100M Revenue (Scaling: 50-100 people)

| Hire | Role | Trigger |
|---|---|---|
| ~$50M | Regional Sales Managers | Geographic expansion needs regional leadership |
| ~$50M | Full credit department (manager + analyst) | AR portfolio risk management becomes critical |
| ~$60M | Full IT team (3+) | System integrations, custom development needs |
| ~$70M | Director of Procurement / VP Supply Chain | Supply chain becomes strategic competitive advantage |
| ~$80M | Business Development Manager | Separates new business hunting from account management |
| ~$100M | Full executive team: CEO, COO, CFO, CRO | All functions need C-level strategic leadership |

### Key Inflection Points

1. **$5M: First management layer.** Founder can no longer manage every function. Need first department managers (Sales Manager, Ops Manager).

2. **$10M: Credit becomes critical.** With $10M+ in revenue, AR exposure can be $3-5M at any time. A dedicated credit function is no longer optional.

3. **$15-20M: Procurement professionalizes.** One buyer managing 30+ supplier relationships across multiple categories becomes a bottleneck. Need specialized buyers.

4. **$25M: Operations needs a VP.** Warehouse, logistics, dispatch, and fleet (if applicable) need unified senior leadership.

5. **$50M: Full departmental structure.** Every function should have a department head with their own team. The GM/CEO should be managing department heads, not functions.

6. **$100M+: Multiple locations, multiple regions.** Matrix organization with both functional and geographic leadership. Need centralized systems and processes across locations.

---

## APPENDIX: GLOSSARY

| Term | Definition |
|---|---|
| RFQ | Request for Quote -- formal request from customer to provide pricing |
| BOM | Bill of Materials -- list of materials needed for a project |
| PO | Purchase Order -- formal order document sent to supplier |
| SO | Sales Order -- internal order document created when customer accepts quote |
| POD | Proof of Delivery -- signed confirmation that goods were received |
| AR | Accounts Receivable -- money owed to the company by customers |
| AP | Accounts Payable -- money owed by the company to suppliers |
| DSO | Days Sales Outstanding -- average days to collect payment |
| LC | Letter of Credit -- bank-guaranteed payment instrument |
| OTIF | On-Time In-Full -- delivery performance metric |
| WMS | Warehouse Management System |
| TMS | Transportation Management System |
| CRM | Customer Relationship Management |
| ERP | Enterprise Resource Planning -- integrated business software |
| LBM | Lumber and Building Materials |
| GC | General Contractor |
| COD | Cash on Delivery |
| Net 30/60/90 | Payment due 30/60/90 days after invoice date |
| Three-way match | Matching PO, receiving report, and supplier invoice before payment |
| Q2C | Quote-to-Cash -- the complete sales cycle from quote to payment |
| O2C | Order-to-Cash -- subset of Q2C starting from order placement |

---

## Sources

- [Shopify: What Is Quote-To-Cash? A Step-by-Step Q2C Guide](https://www.shopify.com/blog/quote-to-cash)
- [Conga: The Quote-to-Cash Process in 10 Steps](https://conga.com/resources/blog/quote-to-cash-process-10-steps)
- [Upflow: Order to Cash Process Explained](https://upflow.io/blog/ar-collections/order-to-cash-process)
- [Microsoft Dynamics 365: Order to Cash Overview](https://learn.microsoft.com/en-us/dynamics365/guidance/business-processes/order-to-cash-areas-overview)
- [Moxo: Wholesale Order Management](https://www.moxo.com/blog/wholesale-order-management)
- [Snapdragon Associates: Job Opportunities in Building Materials Industry](https://snapdragonassociates.com/blog/from-entry-level-to-executive-job-opportunities-in-the-building-materials-industry/)
- [NetSuite: Construction Procurement Guide](https://www.netsuite.com/portal/resource/articles/erp/construction-material-procurement.shtml)
- [BMCareers: Building Materials Careers](https://bmcareers.com/)
- [InsightSoftware: Top 35+ Distribution KPIs](https://insightsoftware.com/blog/distribution-kpis-and-metric-examples/)
- [Spider Strategies: KPI Examples for Wholesale Trade](https://www.spiderstrategies.com/kpi/industry/wholesale-trade/)
- [Citrin Cooperman: Top Nine KPIs for Distribution](https://www.citrincooperman.com/In-Focus-Resource-Center/Top-Nine-KPIs-Your-Distribution-Business-Should-Be-Tracking)
- [Phocas Software: KPIs for Distribution Execs](https://www.phocassoftware.com/resources/blog/kpis-for-distribution-execs)
- [NetSuite: Wholesale Distribution KPIs](https://www.netsuite.com/portal/resource/articles/inventory-management/wholesale-distribution-kpi.shtml)
- [Acumatica: Distribution Metrics That Matter](https://www.acumatica.com/media/2022/04/Distribution_Metrics_That_Matter-EB-DST-20240229.pdf)
- [MDM: Why Did Builders FirstSource Spend $450M on a Software Company?](https://www.mdm.com/article/featured/featured-blog/why-did-builders-firstsource-spend-450-million-on-a-software-company/)
- [ECI Solutions: Spruce LBM Software](https://www.ecisolutions.com/products/building-materials-software/)
- [DMSi: Lumber Yard Software](https://www.dmsi.com/)
- [Ximple: Construction ERP](https://www.ximplesolution.com/industries/construction-erp/)
- [CAVU ERP: Mason and Building Supply](https://cavuerp.com/mason-and-building-supply/)
- [TGI: Building Products Software](https://www.tgiltd.com/industries/building-and-construction-products-software-solutions)
- [TOOLBX: AI for Building Suppliers](https://www.toolbx.com/)
- [Kojo: Construction Material Management](https://www.usekojo.com/)
- [Go Autonomous: Quotation Automation](https://goautonomous.io/sales-solutions/quotation-automation/)
- [Distro: AI Sales Automation for Distributors](https://distro.app/)
- [Motivate AI: B2B Distributors Cost Reduction via Automation](https://www.gomotivate.com/insights/how-b2b-distributors-can-achieve-30-60-cost-savings-by-automating-their-quote-and-order-process-using-ai)
- [PROS: Modernizing B2B Buying and Quoting in Distribution](https://pros.com/learn/blog/modernizing-b2b-buying-quoting-distribution-with-collaborative-digital-environment/)
- [Distribution Strategy Group: AI Agents Reshaping B2B Buying](https://distributionstrategy.com/2025/10/ai-agents-are-reshaping-b2b-buying-forcing-distributors-to-rethink-digital-strategy/)
- [Handle: How to Build a Strong Credit Department for Construction Material Suppliers](https://www.handle.com/how-to-build-strong-credit-department-construction-material-suppliers/)
- [Procore: Trade Credit Benefits & Risks](https://www.procore.com/library/trade-credit-construction)
- [Jimerson Birr: Key Provisions for Customer Credit Agreements](https://www.jimersonfirm.com/blog/2023/01/five-key-provisions-construction-material-suppliers-include-customer-credit-agreements/)
- [Levelset: How a Letter of Credit Can Protect Payments in Construction](https://www.levelset.com/blog/letter-of-credit-construction/)
- [Ironspring Ventures: The Rise of Building Material Distributors](https://ironspring.com/4-the-rise-of-the-building-material-distributors/)
- [Zippia: Building Material Distributors Revenue](https://www.zippia.com/building-material-distributors-careers-387720/revenue/)
- [Builders FirstSource: Who We Are](https://www.bldr.com/who-we-are)
- [BMD: Building Material Distributors](https://www.bmdusa.com/)
- [ProjectManager: Construction Company Organizational Chart](https://www.projectmanager.com/blog/construction-company-organizational-chart-structure)
- [Procore: Construction Company Hierarchy](https://www.procore.com/library/construction-company-organizational-chart)
