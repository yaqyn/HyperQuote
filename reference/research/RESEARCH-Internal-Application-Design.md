> ⚠️ **REFERENCE DOCUMENT — NOT THE SOURCE OF TRUTH**
> This file was written during the research phase and may contain outdated decisions, US-centric references, or superseded technical choices.
> **Always defer to `essential/RESEARCH.md` for current decisions.**
> Key changes since this file was written: TanStack Start (not Next.js), Capacitor (not Expo), React Aria (not shadcn), Egyptian law (not US FMCSA), EGP (not USD), dual auth pools, no online payments, no mobile wallets, spatial glass UI (not traditional dashboards).

# Internal Application Design Research
## Quote-Based B2B Building Materials Distributor
### High-Value Orders ($100K-$100M+) | Offline Payments (Wire/Check/LC) | No Published Prices

---

## Table of Contents

1. [Role-Based Dashboard Design](#1-role-based-dashboard-design)
2. [Quote Management UI/UX](#2-quote-management-uiux)
3. [Supplier Price Sourcing Interface](#3-supplier-price-sourcing-interface)
4. [Order Management for Quote-Based Flow](#4-order-management-for-quote-based-flow)
5. [CRM Features for High-Value B2B](#5-crm-features-for-high-value-b2b)
6. [Approval Workflows](#6-approval-workflows)
7. [Internal Communication Features](#7-internal-communication-features)
8. [Mobile Access for Sales Team](#8-mobile-access-for-sales-team)
9. [Reporting and Analytics per Department](#9-reporting-and-analytics-per-department)
10. [Real-World Internal Tool Examples](#10-real-world-internal-tool-examples)

---

## 1. Role-Based Dashboard Design

The cardinal rule from B2B UX research: **map roles clearly first, define what each role needs to see, edit, approve, or monitor, then design role-based dashboards showing only what is relevant to each user.** Avoid clutter by restricting visibility to role-appropriate data.

### 1A. Sales Dashboard

**Primary User:** Sales Representatives and Sales Managers

**Home Screen Layout:**

```
+---------------------------------------------------------------+
|  SALES DASHBOARD                           [+ New Quote] [Search] |
+---------------------------------------------------------------+
|                                                               |
|  KEY METRICS BAR (horizontal)                                 |
|  [Pipeline Value]  [Open Quotes]  [Win Rate]  [Avg Response] |
|  [$4.2M]           [23]           [34%]       [2.3 days]     |
|                                                               |
+----------------------------+----------------------------------+
|  INCOMING RFQs (urgent)    |  MY ACTIVE QUOTES                |
|  +-----------------------+ |  +----------------------------+  |
|  | ABC Construction      | |  | QT-2024-0891 - $2.1M     |  |
|  | 14 line items         | |  | Al-Rashid Group           |  |
|  | Received: 2hr ago     | |  | Status: Awaiting Supplier |  |
|  | [Assign] [View]       | |  | Due: Mar 30               |  |
|  +-----------------------+ |  +----------------------------+  |
|  | Delta Builders        | |  | QT-2024-0887 - $450K     |  |
|  | 8 line items          | |  | Summit Builders           |  |
|  | Received: 5hr ago     | |  | Status: Sent to Customer  |  |
|  | [Assign] [View]       | |  | Expires: Apr 5            |  |
|  +-----------------------+ |  +----------------------------+  |
|                            |                                  |
+----------------------------+----------------------------------+
|  PIPELINE BY STAGE         |  CUSTOMER ACTIVITY FEED          |
|  [Kanban or funnel view]   |  * ABC Corp viewed quote (1h)   |
|  RFQ Received    $1.8M (5) |  * Delta accepted QT-0872 (3h) |
|  Quoting         $4.2M (12)|  * Summit asked follow-up (5h)  |
|  Sent to Customer $3.1M (8)|  * Al-Rashid meeting note (1d)  |
|  Negotiation     $1.5M (4) |                                  |
|  Won This Month  $2.8M (6) |                                  |
+----------------------------+----------------------------------+
```

**Most Frequent Actions:**
- View/respond to incoming RFQs
- Create new quotes from customer requests
- Check quote status and follow up
- View customer history before calls/meetings
- Submit quotes for internal approval
- Track which quotes are expiring soon

**Primary Workflow:**
1. Receive customer RFQ (email, phone, portal)
2. Log RFQ in system with material list
3. Initiate supplier price inquiry
4. Build quote from supplier responses
5. Set margins and submit for approval (if needed)
6. Send quote to customer
7. Track response, handle counter-offers
8. Convert to sales order on acceptance

---

### 1B. Procurement Dashboard

**Primary User:** Procurement Officers and Purchasing Managers

**Home Screen Layout:**

```
+---------------------------------------------------------------+
|  PROCUREMENT DASHBOARD                [+ New Inquiry] [Search]  |
+---------------------------------------------------------------+
|                                                               |
|  KEY METRICS BAR                                              |
|  [Pending Inquiries]  [Awaiting Response]  [POs This Week]   |
|  [18]                 [12]                  [7]               |
|                                                               |
+----------------------------+----------------------------------+
|  PENDING SUPPLIER INQUIRIES|  PRICE RESPONSES RECEIVED        |
|  (need to send out)        |  (need review)                   |
|  +-----------------------+ |  +----------------------------+  |
|  | QT-0891 - Rebar       | |  | INQ-445: Steel Beams      |  |
|  | 3 suppliers identified | |  | 4 of 5 suppliers replied  |  |
|  | Deadline: Tomorrow     | |  | Best: $42/unit (SupplierA)|  |
|  | [Send Batch Inquiry]   | |  | [Compare] [Select]        |  |
|  +-----------------------+ |  +----------------------------+  |
|  | QT-0893 - Cement      | |  | INQ-442: Portland Cement  |  |
|  | 2 suppliers identified | |  | 3 of 3 replied            |  |
|  | Deadline: Mar 31       | |  | Best: $85/ton (SupplierC) |  |
|  | [Send Batch Inquiry]   | |  | [Compare] [Select]        |  |
|  +-----------------------+ |  +----------------------------+  |
|                            |                                  |
+----------------------------+----------------------------------+
|  ACTIVE POs                |  SUPPLIER PERFORMANCE            |
|  PO-2201 SupplierA $120K  |  SupplierA: 95% on-time, 4.5/5  |
|    Status: Shipped         |  SupplierB: 88% on-time, 4.1/5  |
|  PO-2198 SupplierC $85K   |  SupplierC: 92% on-time, 4.3/5  |
|    Status: Manufacturing   |  SupplierD: 78% on-time, 3.6/5  |
|  PO-2195 SupplierB $340K  |                                  |
|    Status: Delivered       |  [View Scorecard]                |
+----------------------------+----------------------------------+
```

**Most Frequent Actions:**
- Send price inquiries to suppliers (batch)
- Review and compare supplier responses
- Select suppliers per line item
- Generate purchase orders
- Track PO status and delivery
- Evaluate supplier performance

**Primary Workflow:**
1. Receive internal price inquiry request (linked to quote)
2. Identify suitable suppliers per item (system suggests based on history)
3. Send batch inquiries with specs and deadlines
4. Track responses, send reminders for late responders
5. Compare prices side-by-side per item
6. Select supplier, negotiate if needed
7. Pass pricing back to sales for quote building
8. Generate PO upon quote acceptance

---

### 1C. Operations Board

**Primary User:** Operations Manager, Warehouse Staff, Logistics Coordinator

**Home Screen Layout:**

```
+---------------------------------------------------------------+
|  OPERATIONS BOARD                        [Filters] [Calendar]   |
+---------------------------------------------------------------+
|                                                               |
|  KEY METRICS BAR                                              |
|  [Orders In Progress]  [Deliveries Today]  [Warehouse Load]  |
|  [15]                  [4]                  [72% capacity]    |
|                                                               |
+---------------------------------------------------------------+
|  KANBAN: ORDER FULFILLMENT PIPELINE                           |
|                                                               |
| PO Placed    | In Transit  | At Warehouse | Out for      | Delivered |
|              | from Suppl  |              | Delivery     |           |
| +----------+ | +--------+ | +----------+ | +----------+ | +------+  |
| |ORD-301   | | |ORD-298 | | |ORD-295   | | |ORD-291   | | |ORD-288| |
| |ABC Corp  | | |Delta   | | |Summit    | | |Al-Rashid | | |Mega  |  |
| |$2.1M     | | |$450K   | | |$1.3M     | | |$780K     | | |$210K |  |
| |ETA: Apr 5| | |ETA:Apr1| | |Ready     | | |In transit| | |Done  |  |
| +----------+ | +--------+ | +----------+ | +----------+ | +------+  |
| |ORD-300   | | |ORD-297 | | |ORD-294   | | |ORD-290   | |          |
| |...       | | |...     | | |Partial   | | |...       | |          |
| +----------+ | +--------+ | +----------+ | +----------+ |          |
+---------------------------------------------------------------+
|  DELIVERY SCHEDULE (CALENDAR/TIMELINE)                        |
|  Mar 28: ORD-291 delivery to Al-Rashid (Jeddah)             |
|  Mar 29: ORD-295 pickup from Warehouse B                     |
|  Mar 30: ORD-298 arriving from SupplierA                     |
|  Apr 01: ORD-301 partial shipment expected                   |
+---------------------------------------------------------------+
```

**Most Frequent Actions:**
- Track order fulfillment progress
- Coordinate deliveries and pickups
- Confirm goods receipt from suppliers
- Schedule outbound deliveries to customers
- Handle exceptions (delays, partial shipments, damage)
- Update order status in real time

**Primary Workflow:**
1. Order confirmed by sales -> appears on operations board
2. Track supplier PO fulfillment
3. Receive goods at warehouse, inspect and log
4. Schedule delivery to customer
5. Coordinate with logistics (own fleet or third-party)
6. Confirm delivery, get customer acknowledgment
7. Pass delivery confirmation to finance for invoicing

---

### 1D. Finance Dashboard

**Primary User:** Finance Manager, Accounts Receivable/Payable Staff, CFO

**Home Screen Layout:**

```
+---------------------------------------------------------------+
|  FINANCE DASHBOARD                   [Period: This Month v]     |
+---------------------------------------------------------------+
|                                                               |
|  KEY METRICS BAR                                              |
|  [Revenue MTD]  [Outstanding AR]  [Overdue]  [Cash Position] |
|  [$3.8M]        [$12.4M]          [$2.1M]    [$5.6M]         |
|                                                               |
+----------------------------+----------------------------------+
|  AR AGING BREAKDOWN        |  EXPECTED PAYMENTS THIS WEEK     |
|  Current:    $6.2M         |  +--------------------------+    |
|  1-30 days:  $3.8M         |  | ABC Corp     | $1.2M    |    |
|  31-60 days: $1.5M         |  | Wire Transfer | Due Mar29|    |
|  61-90 days: $0.6M         |  +--------------------------+    |
|  90+ days:   $0.3M  [!]    |  | Delta Build  | $450K    |    |
|                            |  | Check        | Due Mar30|    |
|  [View All Invoices]       |  +--------------------------+    |
|                            |  | Summit Ltd   | $2.1M    |    |
+----------------------------+  | LC           | Due Apr 2 |    |
|  CUSTOMER CREDIT STATUS    |  +--------------------------+    |
|  ABC Corp:   $5M limit     |                                  |
|    Used: $3.2M (64%)       |  PAYMENT METHODS BREAKDOWN       |
|  Delta:      $2M limit     |  Wire Transfer: 45% ($5.6M)     |
|    Used: $1.8M (90%) [!]   |  Check:         30% ($3.7M)     |
|  Summit:     $10M limit    |  Letter of Credit: 25% ($3.1M)  |
|    Used: $4.1M (41%)       |                                  |
+----------------------------+----------------------------------+
|  ACCOUNTS PAYABLE          |  PROFIT MARGINS                  |
|  Due This Week: $890K      |  Avg Margin MTD: 14.2%          |
|  Overdue AP:    $120K      |  Highest: QT-0872 (22%)         |
|  Supplier payments pending |  Lowest:  QT-0865 (6.5%) [!]    |
|  [View AP Schedule]        |  Target: 12-18%                  |
+----------------------------+----------------------------------+
```

**Most Frequent Actions:**
- Track payment receipts (wire, check, LC)
- Monitor AR aging and follow up on overdue
- Review and approve credit limit requests
- Process supplier payments (AP)
- Generate invoices after delivery confirmation
- Reconcile LC documentation
- Monitor margins on completed orders

**Primary Workflow (AR):**
1. Delivery confirmed -> Generate invoice
2. Send invoice to customer (PDF + portal)
3. Track payment method (wire/check/LC)
4. For LC: track document compliance, bank submissions
5. Receive payment confirmation
6. Reconcile and close invoice
7. Flag overdue accounts, initiate collection

---

### 1E. Management Overview

**Primary User:** CEO, General Manager, Department Heads

**Home Screen Layout:**

```
+---------------------------------------------------------------+
|  MANAGEMENT OVERVIEW               [This Month v] [YTD] [QTD]  |
+---------------------------------------------------------------+
|                                                               |
|  EXECUTIVE KPIs                                               |
|  [Revenue MTD] [Revenue YTD] [Avg Margin] [Quote Win Rate]   |
|  [$3.8M]       [$28.5M]      [14.2%]      [34%]             |
|                                                               |
+----------------------------+----------------------------------+
|  REVENUE PIPELINE          |  MARGIN TREND (line chart)       |
|  (funnel visualization)    |  [Shows 12-month trend]          |
|                            |  Target line at 15%              |
|  Active Quotes: $12.6M    |  Current: 14.2%                  |
|  Probable:      $7.2M     |  Last Month: 15.1%               |
|  Expected:      $4.8M     |  YTD Average: 14.8%              |
|                            |                                  |
+----------------------------+----------------------------------+
|  TEAM PERFORMANCE          |  ALERTS & EXCEPTIONS             |
|  Sales Rep A: $1.2M/mo    |  [!] Delta at 90% credit limit  |
|  Sales Rep B: $980K/mo    |  [!] 3 quotes expiring tomorrow  |
|  Sales Rep C: $750K/mo    |  [!] Supplier D late on PO-2195  |
|  [Conversion] [Pipeline]  |  [!] AR overdue >90d: $300K     |
|                            |  [!] Margin below 8% on QT-0865 |
+----------------------------+----------------------------------+
|  TOP CUSTOMERS (YTD)       |  TOP SUPPLIERS (YTD)             |
|  1. Al-Rashid   $4.2M     |  1. SupplierA  $3.8M  95% OTD  |
|  2. ABC Corp    $3.1M     |  2. SupplierC  $2.9M  92% OTD  |
|  3. Summit      $2.8M     |  3. SupplierB  $2.1M  88% OTD  |
+----------------------------+----------------------------------+
```

**Most Frequent Actions:**
- Review overall business health
- Drill down into problem areas (alerts)
- Compare team performance
- Approve large deals or exceptions
- Review customer and supplier rankings
- Analyze trend data for strategic decisions

---

## 2. Quote Management UI/UX

The quote lifecycle is the **core revenue-generating workflow** of this business. The entire application revolves around it. Here is the detailed UI/UX design for each stage.

### 2A. Customer Request Intake

**Screen: New RFQ Entry**

```
+---------------------------------------------------------------+
|  NEW REQUEST FOR QUOTE                              [Save Draft] |
+---------------------------------------------------------------+
|  Customer: [ABC Construction v]  [+ New Customer]             |
|  Contact:  [John Smith v]        [+ New Contact]              |
|  Project:  [Downtown Tower Phase 2________________]           |
|  Reference: [CUST-REF-2024-123___]                            |
|  Required by: [Apr 15, 2024]     Priority: [High v]          |
|  Source: [Email v] [Phone] [In-Person] [Portal]               |
|                                                               |
|  REQUESTED ITEMS                                              |
|  +---+------------------+--------+---------+--------+------+ |
|  | # | Material         | Spec   | Qty     | Unit   | Notes| |
|  +---+------------------+--------+---------+--------+------+ |
|  | 1 | Steel Rebar      | Grade60| 500     | Ton    | 12mm | |
|  | 2 | Portland Cement  | Type II| 2,000   | Bag    |      | |
|  | 3 | Structural Steel | A992   | 200     | Ton    | H-bm | |
|  | 4 | [+ Add Item____] |        |         |        |      | |
|  +---+------------------+--------+---------+--------+------+ |
|                                                               |
|  Delivery Location: [Jeddah, Site B___________]               |
|  Special Instructions: [________________________________]     |
|                                                               |
|  ATTACHMENTS: [Upload] customer_specs.pdf, drawings.dwg       |
|                                                               |
|  [Save as Draft]  [Submit & Start Sourcing]                   |
+---------------------------------------------------------------+
```

**Key UX Patterns:**
- Auto-suggest materials from product catalog as user types
- Pull customer info from CRM with one click
- Support bulk paste from Excel/spreadsheet (customers often send material lists this way)
- Attach original customer request email/document
- Smart duplicate detection (similar recent RFQ from same customer)

### 2B. Supplier Inquiry & Price Gathering

**Screen: Supplier Inquiry Builder** (see Section 3 for full detail)

After RFQ is logged, the procurement team (or sales, depending on workflow) initiates supplier price inquiries. The system:

1. **Suggests suppliers** per line item based on:
   - Product category match
   - Past purchase history with this material
   - Supplier performance score
   - Geographic proximity / lead time
   - Current contract pricing (if any)

2. **Batch inquiry sending**: Select multiple suppliers per item, compose one inquiry that goes to all

3. **Response tracking**: Deadline set, status per supplier (Sent, Viewed, Responded, Overdue)

### 2C. Supplier Comparison & Selection

**Screen: Price Comparison Matrix**

```
+---------------------------------------------------------------+
|  QUOTE QT-2024-0891: SUPPLIER COMPARISON           [Export]     |
+---------------------------------------------------------------+
|  Item: Steel Rebar Grade 60, 12mm - 500 Tons                 |
|                                                               |
|  +------------+-----------+----------+---------+----------+   |
|  | Supplier   | Unit Price| Lead Time| Avail   | Total    |   |
|  +------------+-----------+----------+---------+----------+   |
|  | SupplierA  | $620/ton  | 14 days  | 500 ton | $310,000 |   |
|  | [Preferred]| [Best]    |          | [Full]  |          |   |
|  +------------+-----------+----------+---------+----------+   |
|  | SupplierB  | $645/ton  | 10 days  | 500 ton | $322,500 |   |
|  |            |           | [Fastest]| [Full]  |          |   |
|  +------------+-----------+----------+---------+----------+   |
|  | SupplierC  | $610/ton  | 21 days  | 300 ton | $305,000 |   |
|  |            | [Cheapest]|          | [Part]  | (partial)|   |
|  +------------+-----------+----------+---------+----------+   |
|  | SupplierD  | No Reply  | --       | --      | --       |   |
|  |            | [Overdue] |          |         |          |   |
|  +------------+-----------+----------+---------+----------+   |
|                                                               |
|  History: Last 5 purchases of this item                       |
|  - Jan 2024: SupplierA, $615/ton, delivered on time           |
|  - Nov 2023: SupplierB, $640/ton, 2 days late                |
|                                                               |
|  SELECTION: [SupplierA v]                                     |
|  Our Cost: $310,000  |  Margin: [15%]  |  Customer Price: $356,500 |
|                                                               |
|  [Select & Continue to Next Item]                             |
+---------------------------------------------------------------+
```

**Key UX Patterns:**
- Color-coded tags: green for best price, blue for fastest, yellow for partial availability
- Historical context shown inline (what we paid last time, who delivered well)
- One-click selection with auto-margin calculation
- Ability to split an item across multiple suppliers if needed
- Flag suppliers who haven't responded with one-click reminder

### 2D. Quote Builder & Pricing

**Screen: Quote Composition**

```
+---------------------------------------------------------------+
|  BUILD QUOTE: QT-2024-0891                    [Preview] [Save]  |
+---------------------------------------------------------------+
|  Customer: ABC Construction  |  Contact: John Smith           |
|  Project: Downtown Tower Phase 2  |  Valid Until: Apr 15      |
|                                                               |
|  LINE ITEMS                                                   |
|  +---+----------------+------+--------+--------+------+------+|
|  | # | Material       | Qty  | Cost   | Margin | Price| Total||
|  +---+----------------+------+--------+--------+------+------+|
|  | 1 | Steel Rebar    | 500T | $620/T | 15%    |$713/T|$356K ||
|  |   | Gr60,12mm      |      |        |        |      |      ||
|  |   | Supplier: A    |      |        |        |      |      ||
|  +---+----------------+------+--------+--------+------+------+|
|  | 2 | Portland Cement| 2000 | $4.20  | 12%    |$4.70 |$9.4K ||
|  |   | Type II        | bags |        |        |      |      ||
|  |   | Supplier: C    |      |        |        |      |      ||
|  +---+----------------+------+--------+--------+------+------+|
|  | 3 | Structural Stl | 200T | $850/T | 14%    |$969/T|$194K ||
|  |   | A992 H-beam    |      |        |        |      |      ||
|  |   | Supplier: A    |      |        |        |      |      ||
|  +---+----------------+------+--------+--------+------+------+|
|                                                               |
|  QUOTE SUMMARY                                                |
|  Subtotal:           $559,400                                 |
|  Delivery Charges:   $12,000                                  |
|  Total Cost to Us:   $474,200                                 |
|  Total Quote:        $571,400                                 |
|  Blended Margin:     14.0%                                    |
|  [!] Item 2 margin (12%) below threshold (13%)               |
|                                                               |
|  Terms: Net 30 | Delivery: FOB Jeddah Site B                 |
|  Payment: [Wire Transfer v] [Check] [LC]                     |
|  Notes to Customer: [________________________________]        |
|                                                               |
|  [Save Draft] [Submit for Approval] [Send to Customer]       |
+---------------------------------------------------------------+
```

**Key UX Patterns:**
- Margins are editable per line item with real-time total recalculation
- Visual alerts when any line item or blended margin falls below threshold
- Supplier info visible but NOT shown to customer in final quote
- Currency formatting appropriate to region
- One-click toggle between cost view (internal) and customer view
- Add notes, terms, delivery conditions per line item

### 2E. Approval Workflow

When margin is below threshold or order value exceeds authority:

```
+---------------------------------------------------------------+
|  APPROVAL REQUIRED: QT-2024-0891                               |
+---------------------------------------------------------------+
|  Submitted by: Sarah (Sales Rep)                              |
|  Reason: Item 2 margin (12%) below minimum (13%)             |
|  Overall margin: 14.0% (within range)                         |
|                                                               |
|  APPROVAL CHAIN                                               |
|  Step 1: Sales Manager (Ahmad)    [Pending]                   |
|  Step 2: Finance (if >$500K)      [Waiting]                   |
|                                                               |
|  APPROVER VIEW:                                               |
|  [Approve] [Reject] [Approve with Changes]                   |
|  Comment: [________________________________]                  |
|                                                               |
|  [View Full Quote]  [View Customer History]                   |
+---------------------------------------------------------------+
```

### 2F. Quote Delivery & Tracking

- **PDF Generation**: Auto-generated professional PDF with company branding, itemized pricing (customer view only - no cost/margin data), terms, validity period
- **Delivery**: Email with PDF attachment, or share via customer portal
- **Tracking**: Log when customer opens email/views quote, set follow-up reminders

### 2G. Counter-Offer & Negotiation

**Screen: Quote Revision**

```
+---------------------------------------------------------------+
|  QUOTE NEGOTIATION: QT-2024-0891                               |
+---------------------------------------------------------------+
|  VERSION HISTORY                                              |
|  v1 (Mar 25): Original quote $571,400 - Sent                 |
|  v2 (Mar 27): Counter-offer from customer: $540,000          |
|  v3 (Mar 28): Our revision $555,000 - [Current]              |
|                                                               |
|  CUSTOMER COUNTER-OFFER DETAILS                               |
|  "Can you do $540K? We have a competing quote at $535K.       |
|   Also need delivery by Apr 10 instead of Apr 15."            |
|                                                               |
|  REVISION TOOLS                                               |
|  [Adjust Margins]  [Change Quantities]  [Swap Supplier]      |
|  [Add/Remove Items]  [Change Terms]                           |
|                                                               |
|  Impact Analysis:                                             |
|  Customer request ($540K) -> our margin drops to 11.2%        |
|  Our counter ($555K) -> margin at 13.1%                       |
|                                                               |
|  [Submit Revision for Approval]  [Send to Customer]          |
+---------------------------------------------------------------+
```

### 2H. Quote-to-Order Conversion

On customer acceptance:

```
+---------------------------------------------------------------+
|  CONVERT QUOTE TO ORDER                                        |
+---------------------------------------------------------------+
|  Quote: QT-2024-0891 v3 ($555,000)                           |
|  Customer: ABC Construction                                   |
|  Accepted: Mar 28, 2024                                       |
|                                                               |
|  [x] Create Sales Order (SO-2024-0301)                       |
|  [x] Generate Purchase Orders to suppliers                    |
|      - PO to SupplierA: Rebar + Steel ($504K)                |
|      - PO to SupplierC: Cement ($8.4K)                       |
|  [x] Create delivery schedule                                 |
|  [x] Notify operations team                                   |
|  [x] Generate proforma invoice                                |
|  [ ] Request advance payment (optional)                       |
|                                                               |
|  Payment Terms: Net 30 via Wire Transfer                      |
|  Customer PO Number: [CUST-PO-4521______]                     |
|                                                               |
|  [Convert Now]                                                |
+---------------------------------------------------------------+
```

**Key UX Pattern:** One-click conversion that triggers a cascade of automated actions. The user confirms, and the system creates all downstream objects (SO, POs, delivery schedule, notifications).

---

## 3. Supplier Price Sourcing Interface

### 3A. Batch Inquiry System

**Screen: Create Supplier Inquiry**

```
+---------------------------------------------------------------+
|  SUPPLIER PRICE INQUIRY                    [Use Template v]     |
+---------------------------------------------------------------+
|  Linked to: QT-2024-0891 (ABC Construction)                  |
|  Response Deadline: Mar 30, 2024 (2 days)                     |
|                                                               |
|  ITEMS TO INQUIRE                                             |
|  [x] Steel Rebar Grade 60, 12mm - 500 Tons                   |
|  [x] Portland Cement Type II - 2,000 Bags                    |
|  [x] Structural Steel A992 H-beam - 200 Tons                 |
|                                                               |
|  SUPPLIER SELECTION                                           |
|  Item 1 (Rebar):                                              |
|    [x] SupplierA (95% OTD, last price: $615/T)              |
|    [x] SupplierB (88% OTD, last price: $640/T)              |
|    [x] SupplierC (92% OTD, new for this product)             |
|    [ ] SupplierD (78% OTD) - [not recommended]               |
|    [+ Add Supplier]                                           |
|                                                               |
|  Item 2 (Cement):                                             |
|    [x] SupplierC (primary cement supplier)                    |
|    [x] SupplierE (backup, competitive pricing)                |
|    [+ Add Supplier]                                           |
|                                                               |
|  INQUIRY MESSAGE (editable template)                          |
|  +----------------------------------------------------------+|
|  | Dear [Supplier],                                          ||
|  |                                                           ||
|  | Please provide your best pricing for the following:       ||
|  | [Auto-populated item table with specs and quantities]     ||
|  |                                                           ||
|  | Delivery to: Jeddah, Saudi Arabia                         ||
|  | Required by: April 10, 2024                               ||
|  | Please respond by: March 30, 2024                         ||
|  |                                                           ||
|  | Please include: unit price, availability, lead time,      ||
|  | and any applicable terms.                                 ||
|  +----------------------------------------------------------+|
|                                                               |
|  Send via: [x] Email  [ ] Supplier Portal  [ ] WhatsApp      |
|                                                               |
|  [Send to All Selected Suppliers]                             |
+---------------------------------------------------------------+
```

### 3B. Inquiry Templates

The system should include **pre-built and customizable templates**:

- **Standard Price Inquiry**: Material specs, quantity, delivery location, deadline
- **Urgent Inquiry**: Flagged as urgent, shorter response window
- **Repeat Order Inquiry**: References previous PO, asks for updated pricing
- **Project-Based Inquiry**: Includes project scope, potential for recurring orders
- **Negotiation Follow-up**: References previous quote, requests better terms

Each template supports:
- Variable fields auto-populated from the quote/RFQ data
- Multi-language support (for international suppliers)
- Company branding and formatting
- Attachment support (drawings, specifications, photos)

### 3C. Response Tracking Dashboard

```
+---------------------------------------------------------------+
|  INQUIRY TRACKING: INQ-2024-0445                               |
+---------------------------------------------------------------+
|  Status: 3 of 5 suppliers responded | Deadline: Mar 30 (2d)  |
|                                                               |
|  RESPONSE STATUS                                              |
|  +-------------+-----------+---------+--------+----------+    |
|  | Supplier    | Sent      | Status  | Resp.  | Action   |    |
|  +-------------+-----------+---------+--------+----------+    |
|  | SupplierA   | Mar 26    | Replied | Mar 27 | [View]   |    |
|  | SupplierB   | Mar 26    | Replied | Mar 28 | [View]   |    |
|  | SupplierC   | Mar 26    | Replied | Mar 27 | [View]   |    |
|  | SupplierD   | Mar 26    | Opened  | --     | [Remind] |    |
|  | SupplierE   | Mar 26    | Sent    | --     | [Remind] |    |
|  +-------------+-----------+---------+--------+----------+    |
|                                                               |
|  [Send Reminder to Non-Responders]                            |
|  [Close Inquiry & Proceed with Available Responses]           |
+---------------------------------------------------------------+
```

**Key Features:**
- **Status tracking per supplier**: Sent, Opened/Viewed, Responded, Overdue
- **Automatic reminders**: Configurable (e.g., remind 24h before deadline)
- **Response entry**: Procurement staff enters supplier response data (price, lead time, availability, terms) or supplier submits via portal
- **Deadline enforcement**: Visual countdown, escalation if critical items have no responses
- **Audit trail**: Full history of what was sent, when, and all responses

### 3D. Price Comparison Matrix (Detailed)

```
+---------------------------------------------------------------+
|  PRICE COMPARISON: INQ-2024-0445                    [Export]    |
+---------------------------------------------------------------+
|                                                               |
| ITEM 1: Steel Rebar Grade 60, 12mm - 500 Tons               |
| +------------+--------+------+-------+-------+------+------+ |
| | Supplier   | $/Ton  | Lead | Avail | Total | Cert | Rank | |
| +------------+--------+------+-------+-------+------+------+ |
| | SupplierA  | $620   | 14d  | 500T  | $310K | Yes  | #1   | |
| | SupplierC  | $610   | 21d  | 300T  | $183K | Yes  | #2   | |
| | SupplierB  | $645   | 10d  | 500T  | $322K | Yes  | #3   | |
| +------------+--------+------+-------+-------+------+------+ |
| Best Price: SupplierC ($610) | Fastest: SupplierB (10d)      |
| Best Overall: SupplierA (full qty, good price, reliable)     |
|                                                               |
| ITEM 2: Portland Cement Type II - 2,000 Bags                |
| +------------+--------+------+-------+-------+------+------+ |
| | Supplier   | $/Bag  | Lead | Avail | Total | Cert | Rank | |
| +------------+--------+------+-------+-------+------+------+ |
| | SupplierC  | $4.20  | 7d   | 2000  | $8.4K | Yes  | #1   | |
| | SupplierE  | $4.50  | 5d   | 2000  | $9.0K | Yes  | #2   | |
| +------------+--------+------+-------+-------+------+------+ |
|                                                               |
| [Select Suppliers]  [Request Re-Quote]  [Negotiate]          |
+---------------------------------------------------------------+
```

**Ranking Algorithm Factors:**
- Unit price (weighted ~40%)
- Full quantity availability (weighted ~25%)
- Lead time vs. customer deadline (weighted ~20%)
- Supplier reliability score (weighted ~15%)
- System suggests a ranking but user makes final decision

---

## 4. Order Management for Quote-Based Flow

### 4A. Quote Acceptance to Order Creation

When a customer accepts a quote, the following cascade occurs:

**Automated Steps:**
1. **Sales Order (SO) created** from accepted quote, inheriting all line items, pricing, and terms
2. **Purchase Orders (POs) generated** to each selected supplier, with the negotiated quantities and agreed prices
3. **Delivery schedule created** based on supplier lead times and customer required-by date
4. **Operations team notified** via dashboard and notifications
5. **Finance notified** to prepare invoice and track payment terms
6. **Customer receives** order confirmation with expected delivery dates

### 4B. Order Board Design

**Screen: Order Management Board**

```
+---------------------------------------------------------------+
|  ORDER BOARD                    [Filter by Customer/Status/Date] |
+---------------------------------------------------------------+
|                                                               |
|  ORDER DETAIL VIEW: SO-2024-0301                              |
|  Customer: ABC Construction | Quote: QT-0891 | Value: $555K  |
|                                                               |
|  OVERALL STATUS: [===========>           ] 65% Complete       |
|                                                               |
|  LINE ITEM STATUS                                             |
|  +---+----------------+----------+---------+--------+------+  |
|  | # | Item           | Supplier | PO#     | Status | ETA  |  |
|  +---+----------------+----------+---------+--------+------+  |
|  | 1 | Steel Rebar    | SuppA    | PO-2201 | Ship'd | Apr1 |  |
|  | 2 | Portland Cement| SuppC    | PO-2202 | Ready  | Mar30|  |
|  | 3 | Structural Stl | SuppA    | PO-2201 | Mfg    | Apr5 |  |
|  +---+----------------+----------+---------+--------+------+  |
|                                                               |
|  TIMELINE                                                     |
|  Mar 28 [Today] -----> Mar 30 (Cement) --> Apr 1 (Rebar)    |
|                         --> Apr 5 (Steel) --> Apr 7 (Deliver)|
|                                                               |
|  DOCUMENTS                                                    |
|  [Invoice] [Proforma] [Delivery Note] [PO-2201] [PO-2202]   |
|                                                               |
|  ACTIVITY LOG                                                 |
|  Mar 28: PO-2201 shipped from SupplierA warehouse            |
|  Mar 27: PO-2202 confirmed ready for pickup                  |
|  Mar 26: POs sent to SupplierA and SupplierC                |
|  Mar 25: Order created from QT-0891 v3                       |
+---------------------------------------------------------------+
```

### 4C. Status Tracking States

**Order-Level States:**
1. **Order Confirmed** - Customer accepted, order created
2. **POs Placed** - All purchase orders sent to suppliers
3. **Supplier Confirmed** - Suppliers acknowledged POs
4. **In Production/Preparation** - Suppliers preparing goods
5. **Shipped from Supplier** - Goods in transit to our warehouse (or direct ship)
6. **Received at Warehouse** - Goods inspected and accepted
7. **Ready for Delivery** - All items consolidated, delivery scheduled
8. **Out for Delivery** - In transit to customer
9. **Delivered** - Customer received goods
10. **Completed** - Payment received, order closed

**Line-Item-Level States** (each item can be at a different stage):
- Pending PO, PO Sent, Supplier Confirmed, Manufacturing, Shipped, In Transit, Received, Quality Checked, Ready, Delivered

### 4D. Supplier PO Generation

**Auto-generated PO includes:**
- PO number (auto-sequential)
- Supplier details
- Line items from quote (our specs, agreed quantity, agreed price)
- Delivery address (our warehouse or direct to customer)
- Required delivery date
- Payment terms with supplier
- Quality requirements and certifications needed
- Reference to our internal SO number

**PO Tracking:**
- Acknowledgment from supplier (expected within 24-48h)
- Manufacturing/preparation status updates
- Shipping notification with tracking
- Receipt confirmation at warehouse
- Quality inspection results
- Three-way match: PO vs. Receipt vs. Supplier Invoice

### 4E. Delivery Scheduling

```
+---------------------------------------------------------------+
|  DELIVERY SCHEDULER                              [Calendar View] |
+---------------------------------------------------------------+
|                                                               |
|  PENDING DELIVERIES                                           |
|  +--+----------+-------------+---------+--------+----------+  |
|  |  | Order    | Customer    | Items   | Method | Schedule |  |
|  +--+----------+-------------+---------+--------+----------+  |
|  |  | SO-0301  | ABC Constr. | 3 items | Truck  | Apr 7    |  |
|  |  |          |             | 1 ready | Own    | [Edit]   |  |
|  +--+----------+-------------+---------+--------+----------+  |
|  |  | SO-0298  | Delta Build | 2 items | Truck  | Apr 1    |  |
|  |  |          |             | 2 ready | 3rd Pty| [Confirm]|  |
|  +--+----------+-------------+---------+--------+----------+  |
|                                                               |
|  Options per delivery:                                        |
|  - Full delivery (wait for all items)                         |
|  - Partial delivery (ship what's ready)                       |
|  - Direct ship (from supplier to customer)                    |
|  - Consolidated (multiple orders to same customer)            |
+---------------------------------------------------------------+
```

---

## 5. CRM Features for High-Value B2B

When individual deals range from $100K to $100M+, the CRM must support deep relationship management, not just contact storage.

### 5A. Account Management

**Account Profile Screen:**

```
+---------------------------------------------------------------+
|  ACCOUNT: ABC Construction Group                               |
+---------------------------------------------------------------+
|  HEADER                                                       |
|  Type: Tier 1 Customer | Since: 2019 | Credit Limit: $5M     |
|  Lifetime Value: $18.2M | YTD Revenue: $3.1M                 |
|  Account Manager: Sarah | Payment: Wire Transfer (Net 30)    |
|                                                               |
+----------------------------+----------------------------------+
|  CONTACTS (12)             |  ORGANIZATION CHART               |
|  +----------------------+  |  [Visual hierarchy map]           |
|  | John Smith           |  |     CEO - Mohammed                |
|  | Procurement Director |  |       |                           |
|  | Decision Maker       |  |   VP Procure - John               |
|  | Last Contact: Mar 20 |  |     |         |                   |
|  | [Call] [Email] [Note] |  |  Buyer-Ali  Buyer-Fatima         |
|  +----------------------+  |                                    |
|  | Ali Hassan            |  |  Our relationships:               |
|  | Buyer                 |  |  Sarah(us) <-> John (strong)      |
|  | Influencer            |  |  Ahmad(us) <-> Mohammed (met 2x)  |
|  | Last Contact: Mar 25  |  |  Sarah(us) <-> Ali (regular)      |
|  +----------------------+  |                                    |
+----------------------------+----------------------------------+
|  QUOTE HISTORY             |  FINANCIAL SUMMARY                |
|  QT-0891: $555K (Active)  |  Credit Used: $3.2M / $5M (64%) |
|  QT-0872: $210K (Won)     |  Outstanding: $1.8M              |
|  QT-0845: $1.2M (Lost)    |  Overdue: $0                     |
|  QT-0801: $780K (Won)     |  Avg Payment Days: 28            |
|  [View All 47 Quotes]     |  Payment Rating: Excellent        |
+----------------------------+----------------------------------+
|  RECENT ACTIVITY                                              |
|  Mar 25: Ali sent RFQ for Downtown Tower Phase 2             |
|  Mar 20: Sarah met John at their office - discussed Q2 needs |
|  Mar 15: Delivered SO-0298 ($210K) - on time                 |
|  Mar 10: QT-0872 accepted, order created                     |
+---------------------------------------------------------------+
```

### 5B. Key CRM Features for High-Value B2B

**1. Relationship Mapping ("Who Knows Who")**
- Visual org chart of customer's decision-making structure
- Map each contact's role: Decision Maker, Budget Holder, Influencer, End User, Gatekeeper
- Track which of our team members knows which contacts
- Relationship strength indicators (strong, developing, new)
- "Ghost contacts" - people we know exist but haven't met yet

**2. Contact Management**
- Multiple contacts per account with roles and influence levels
- Communication preferences (phone, email, WhatsApp, in-person)
- Meeting history and notes
- Personal details for relationship building (birthday, interests)
- Contact activity timeline

**3. Interaction History**
- Every touchpoint logged: calls, emails, meetings, site visits
- Notes searchable and linked to quotes/orders
- Automatic logging from email integration
- Calendar integration for meetings

**4. Quote History Per Customer**
- Full history of every quote sent
- Win/loss analysis (why did we win or lose?)
- Average margin by customer
- Product mix preferences
- Seasonal buying patterns
- Typical order size and frequency

**5. Lifetime Value Tracking**
- Total revenue from account since inception
- Revenue by year, quarter, month
- Margin contribution
- Cost to serve (returns, complaints, credit issues)
- Growth trajectory and forecast

**6. Project Tracking**
- Active construction projects they are working on
- Project stage (planning, foundation, structure, finishing)
- Material requirements per project phase
- Cross-sell opportunities (if we supply rebar, we can offer cement too)

**7. Competitive Intelligence**
- Known competitors for this account
- Competitor pricing intelligence (from lost quotes)
- Customer's alternative suppliers
- Market share estimation

### 5C. Account Health Score

A composite metric displayed prominently:

```
ACCOUNT HEALTH: ABC Construction
Score: 87/100 [=========>  ] Excellent

Factors:
+ Payment history: 95/100 (always on time)
+ Order frequency: 85/100 (monthly orders)
+ Revenue trend: 80/100 (growing YoY)
+ Relationship depth: 88/100 (3 contacts, regular meetings)
+ Quote win rate: 78/100 (won 34 of 47 quotes)
- Recent activity: -5 (no meeting in 30 days)
```

---

## 6. Approval Workflows

### 6A. What Needs Approval

| Trigger | Condition | Approver | SLA |
|---------|-----------|----------|-----|
| **Quote margin below threshold** | Any line item < 10% or blended < 13% | Sales Manager | 4 hours |
| **Quote value exceeds authority** | > $500K (rep), > $2M (manager) | GM/Director | 8 hours |
| **Discount request** | Customer requests > 5% discount | Sales Manager | 4 hours |
| **Credit limit increase** | Customer requests higher limit | Finance Manager -> CFO | 24 hours |
| **New customer credit** | First order from new customer | Finance Manager | 24 hours |
| **Large purchase order** | PO > $200K to single supplier | Procurement Manager | 4 hours |
| **Payment term exception** | Net 60+ or deferred payment | Finance Manager | 8 hours |
| **Return/credit note** | Any return or credit > $10K | Sales Manager + Finance | 8 hours |
| **Price match** | Matching competitor price < our cost+margin | Director + Finance | 8 hours |

### 6B. Approval Chain Design

```
APPROVAL ROUTING LOGIC:

Quote Approval:
  IF margin < 10% on any item:
    -> Sales Manager (can approve up to 8% margin)
    -> Director (can approve up to 5% margin)
    -> CEO (below 5%)

  IF total value > $500K:
    -> Sales Manager
  IF total value > $2M:
    -> Sales Manager + Director
  IF total value > $10M:
    -> Sales Manager + Director + CEO

Credit Limit:
  IF increase < 20% of current limit:
    -> Finance Manager
  IF increase 20-50%:
    -> Finance Manager + CFO
  IF increase > 50% or new limit > $10M:
    -> Finance Manager + CFO + CEO

Purchase Orders:
  IF PO < $50K:
    -> Auto-approved
  IF PO $50K-$200K:
    -> Procurement Manager
  IF PO > $200K:
    -> Procurement Manager + Finance Manager
```

### 6C. Approval UI Pattern

**For Approvers - Mobile-Friendly Approval Queue:**

```
+---------------------------------------------------------------+
|  MY APPROVALS (4 pending)                                      |
+---------------------------------------------------------------+
|  +----------------------------------------------------------+|
|  | URGENT: QT-0891 - Margin Approval                        ||
|  | From: Sarah (Sales) | 2 hours ago                        ||
|  | Quote: $555K to ABC Construction                          ||
|  | Issue: Item 2 margin at 12% (threshold: 13%)             ||
|  | Blended margin: 14.0%                                     ||
|  | [Approve] [Reject] [Modify & Approve] [Comment]          ||
|  +----------------------------------------------------------+|
|  |                                                           ||
|  | Credit Limit: Delta Builders                              ||
|  | From: Finance Team | 5 hours ago                          ||
|  | Request: Increase from $2M to $3M                         ||
|  | Current usage: $1.8M (90%)                                ||
|  | Payment history: 2 late payments in last year             ||
|  | [Approve] [Reject] [Request More Info]                    ||
|  +----------------------------------------------------------+|
+---------------------------------------------------------------+
```

**Key UX Principles:**
- All context needed for decision shown inline (no need to open separate screens)
- One-tap approve/reject for mobile
- Escalation if approver doesn't respond within SLA
- Delegation: approver can assign substitute when out of office
- Audit trail of all approvals with timestamps and comments
- Parallel approvals when possible (Sales Manager and Finance review simultaneously)

---

## 7. Internal Communication Features

### 7A. Contextual Communication (Not Standalone Chat)

Rather than building a general-purpose chat tool, communication should be **contextual** - attached to the objects people are working on.

**@Mentions on Any Object:**

```
QUOTE QT-0891 - INTERNAL NOTES
+---------------------------------------------------------------+
| Sarah (Sales) - Mar 25, 3:14 PM                              |
| Created RFQ from ABC Construction. 3 items, priority high.   |
| @Ahmad can you check if SupplierA has stock on Grade 60 rebar?|
|                                                               |
| Ahmad (Procurement) - Mar 25, 4:02 PM                        |
| @Sarah yes, spoke to SupplierA. They have 500T in stock.     |
| Sending formal inquiry now. Also checking SupplierB.          |
|                                                               |
| Sarah (Sales) - Mar 27, 9:15 AM                              |
| Customer called - they need this by Apr 10, not Apr 15.       |
| @Ahmad can we expedite? @Finance need credit check on this    |
| customer, they haven't ordered in 6 months.                   |
|                                                               |
| Khaled (Finance) - Mar 27, 10:30 AM                          |
| @Sarah credit is fine. They still have $1.8M available.       |
| No overdue balances. Good to proceed.                         |
+---------------------------------------------------------------+
| Type a note... [@mention] [Attach File]           [Post]      |
+---------------------------------------------------------------+
```

### 7B. Communication Features

**1. @Mentions**
- Tag any team member on any quote, order, customer, or supplier record
- Mentioned person gets a notification (in-app + email/mobile push)
- Mention history is searchable

**2. Activity Feed Per Object**
Every quote, order, customer, and supplier has an activity feed showing:
- Status changes (automated)
- Internal notes (manual)
- External communications (emails sent/received)
- Document uploads
- Approval actions
- @Mentions and responses

**3. Notification Center**

```
+---------------------------------------------------------------+
|  NOTIFICATIONS                              [Mark All Read]     |
+---------------------------------------------------------------+
|  [!] @Sarah mentioned you on QT-0891 (2m ago)               |
|  [i] SupplierA responded to INQ-0445 (1h ago)               |
|  [!] QT-0887 expires tomorrow - follow up needed (3h ago)    |
|  [i] PO-2201 shipped from SupplierA (5h ago)                |
|  [$] Payment received from Delta Builders $450K (1d ago)     |
+---------------------------------------------------------------+
```

**4. Internal Notes vs. External Communication**
- Clear visual distinction between internal notes (yellow background, "Internal Only" badge) and external communications
- Internal notes are NEVER visible to customers
- External emails/messages logged automatically in the activity feed

**5. Escalation Alerts**
- Automated alerts when: quotes are expiring, supplier responses are overdue, approvals are stuck, payments are late, orders are delayed
- Escalation chain: first notify assigned person, then manager, then director

### 7C. Integration with External Tools

- **Email**: Automatic logging of relevant emails (matched by customer/quote reference)
- **WhatsApp**: Log key WhatsApp conversations manually or via integration
- **Calendar**: Meeting scheduling with auto-logging
- Do NOT build a full replacement for Slack/Teams; instead integrate with existing tools

---

## 8. Mobile Access for Sales Team

### 8A. Mobile-First Design Principles for Field Sales

Key findings from B2B mobile UX research:
- **Optimize for minimal taps**: Reorder flow should require no more than 3 taps
- **Thumb-friendly navigation**: Primary actions in the lower half of the screen
- **Bottom navigation bar**: Search, Customers, Quotes, Orders, More
- **Offline capability**: Core data available without internet (customer info, product catalog, recent quotes)
- **Speed matters**: A rep who finds customer info in 8 seconds instead of 45 seconds gains 30+ minutes per day

### 8B. Mobile App Screens

**Bottom Navigation:**
```
[Customers] [Quotes] [Orders] [Notifications] [More]
```

**Screen 1: Customer Quick View (optimized for pre-meeting prep)**

```
+---------------------------+
|  < Back    ABC Construction|
+---------------------------+
|  QUICK STATS              |
|  YTD: $3.1M | Open: $555K|
|  Credit: $1.8M free      |
|  Last Order: Mar 15      |
|                           |
|  KEY CONTACTS             |
|  John Smith (Procurement) |
|  [Call] [WhatsApp] [Email]|
|  Ali Hassan (Buyer)       |
|  [Call] [WhatsApp] [Email]|
|                           |
|  RECENT ACTIVITY          |
|  Mar 25: RFQ received     |
|  Mar 20: Meeting w/ John  |
|  Mar 15: SO-0298 delivered|
|                           |
|  [View Full Profile]      |
|  [New Quote] [New Note]   |
+---------------------------+
```

**Screen 2: Quick RFQ Submission (from the field)**

```
+---------------------------+
|  NEW QUICK RFQ            |
+---------------------------+
|  Customer: [ABC Constr v] |
|  Contact:  [John Smith v] |
|  Priority: [High v]       |
|                           |
|  ITEMS                    |
|  [Scan barcode / photo]   |
|  [Search product catalog] |
|  1. Steel Rebar 12mm     |
|     Qty: [500] T          |
|  2. [+ Add Item]          |
|                           |
|  Delivery: [Jeddah v]     |
|  Needed by: [Apr 15]      |
|  Notes: [___________]     |
|                           |
|  [Take Photo of Spec Sheet]|
|  [Attach File]            |
|                           |
|  +-----+  +-------------+|
|  |Draft|  |Submit RFQ   ||
|  +-----+  +-------------+|
+---------------------------+
```

**Screen 3: Quote Status (at a glance)**

```
+---------------------------+
|  MY QUOTES        [Filter]|
+---------------------------+
|  ACTIVE (12)              |
|  +----------------------+ |
|  | QT-0891    $555K     | |
|  | ABC Construction     | |
|  | Awaiting Approval    | |
|  | Expires: Apr 15      | |
|  +----------------------+ |
|  | QT-0887    $450K     | |
|  | Summit Builders      | |
|  | Sent to Customer     | |
|  | Expires: Apr 5       | |
|  +----------------------+ |
|                           |
|  WON THIS MONTH (6)      |
|  LOST (2) | EXPIRED (1)  |
+---------------------------+
```

**Screen 4: Order Tracking**

```
+---------------------------+
|  ORDER SO-0301   $555K    |
+---------------------------+
|  ABC Construction         |
|  Progress: [=====>   ] 65%|
|                           |
|  Items:                   |
|  1. Rebar     [Shipped]   |
|     ETA: Apr 1            |
|  2. Cement    [Ready]     |
|     ETA: Mar 30           |
|  3. Steel     [Making]    |
|     ETA: Apr 5            |
|                           |
|  Expected Delivery: Apr 7 |
|                           |
|  [Call Customer]          |
|  [View Documents]         |
|  [Add Note]               |
+---------------------------+
```

### 8C. Mobile-Specific Features

- **Voice-to-text notes**: Quickly log meeting notes while driving
- **Business card scanner**: Add new contacts by photographing business cards
- **Photo attachment**: Take photos of spec sheets, site conditions, competitor products
- **GPS check-in**: Log customer visits with location
- **Push notifications**: Approval requests, quote expirations, customer responses
- **Offline mode**: Cache customer profiles, recent quotes, product catalog for areas with poor connectivity
- **Quick actions from notification**: Approve a quote directly from push notification

---

## 9. Reporting and Analytics per Department

### 9A. Sales Reports

| Report | Description | Frequency |
|--------|-------------|-----------|
| **Pipeline Report** | Total value by stage (RFQ, Quoting, Sent, Negotiating, Won/Lost) | Daily |
| **Quote Conversion Rate** | % of quotes that convert to orders, by rep/region/customer | Weekly |
| **Win/Loss Analysis** | Reasons for lost quotes (price, delivery, relationship, competitor) | Monthly |
| **Revenue by Customer** | Top customers by revenue, trend over time | Monthly |
| **Revenue by Product** | Which materials drive the most revenue and margin | Monthly |
| **Sales Rep Performance** | Quotes sent, won, lost, revenue, margin per rep | Weekly |
| **Quote Aging** | Quotes that have been open too long without response | Daily |
| **Customer Acquisition** | New customers, first orders, onboarding pipeline | Monthly |
| **Seasonal Trends** | Revenue and demand patterns by month/quarter | Quarterly |
| **Forecast vs. Actual** | Projected revenue vs. realized revenue | Monthly |

### 9B. Procurement Reports

| Report | Description | Frequency |
|--------|-------------|-----------|
| **Supplier Performance Scorecard** | On-time delivery %, quality rejection rate, response time | Monthly |
| **Price Trend Analysis** | How material prices have changed over time, by supplier | Monthly |
| **Supplier Comparison** | Price competitiveness across suppliers for same products | Quarterly |
| **Purchase Volume by Supplier** | Concentration risk, spend distribution | Quarterly |
| **Lead Time Analysis** | Average lead time by supplier and product category | Monthly |
| **Inquiry Response Rate** | Which suppliers respond fastest and most completely | Monthly |
| **Cost Savings** | Savings achieved through supplier negotiation/switching | Quarterly |
| **Contract Compliance** | Are suppliers honoring contracted prices and terms? | Monthly |

### 9C. Operations Reports

| Report | Description | Frequency |
|--------|-------------|-----------|
| **Order Fulfillment Rate** | % of orders delivered complete and on time | Weekly |
| **Delivery Performance** | On-time delivery to customers, delays, reasons | Weekly |
| **Warehouse Utilization** | Space usage, throughput, inventory turns | Monthly |
| **Backorder Report** | Items not yet fulfilled, expected dates | Daily |
| **Damage/Quality Issues** | Items rejected on receipt or by customers | Monthly |
| **Logistics Cost** | Delivery cost per order, per ton, per customer | Monthly |
| **Order Cycle Time** | Average time from order confirmation to delivery | Monthly |

### 9D. Finance Reports

| Report | Description | Frequency |
|--------|-------------|-----------|
| **AR Aging Report** | Outstanding invoices by age bucket (current, 30, 60, 90+) | Weekly |
| **Cash Flow Forecast** | Expected inflows (from orders/payments) vs. outflows (supplier payments) | Weekly |
| **Margin Analysis** | Margin by order, customer, product, sales rep | Monthly |
| **Customer Credit Report** | Credit utilization, payment patterns, risk assessment | Monthly |
| **AP Schedule** | Upcoming supplier payments, cash requirements | Weekly |
| **Revenue Recognition** | Revenue by period, matching with delivery/invoicing | Monthly |
| **Payment Method Analysis** | Distribution across wire/check/LC, processing times | Monthly |
| **LC Tracking** | Letter of credit status, document compliance, bank fees | As needed |
| **Profitability by Customer** | Revenue minus all costs (product, delivery, credit cost, returns) | Quarterly |
| **Bad Debt Report** | Write-offs, provisions, at-risk accounts | Monthly |

### 9E. Management/Executive Reports

| Report | Description | Frequency |
|--------|-------------|-----------|
| **Executive Summary Dashboard** | Revenue, margin, pipeline, AR, key alerts | Daily |
| **Monthly Business Review** | Comprehensive KPIs vs. targets, trends, exceptions | Monthly |
| **Customer Concentration** | Revenue distribution, top 10/20 customer dependency | Quarterly |
| **Market Share Estimation** | Our share of customer's total spending (where known) | Quarterly |
| **Team Productivity** | Output per person (quotes, orders, revenue) | Monthly |
| **Competitive Analysis** | Lost deals by competitor, price gap analysis | Quarterly |
| **Growth Report** | New customers, new products, geographic expansion | Quarterly |

---

## 10. Real-World Internal Tool Examples

### 10A. Epicor Prophet 21

**Target Market:** Wholesale distributors (41% of top 50 largest distributors use it)

**Key Modules:**
- **Order Entry & Quoting**: Create and convert quotes, check stock, review pricing, all without switching systems. Supports real-time order status tracking.
- **Purchasing & Procurement**: Multi-level approval routing based on spend thresholds, cost centers, and item categories. Automated PO generation from approved requisitions or MRP recommendations.
- **Inventory Management**: Real-time tracking across multiple locations. AI-driven demand forecasting with seasonal adjustments.
- **Financial Management**: Real-time general ledger, daily financial reports with drill-down, AR/AP integration, multicurrency support, online cash collections.
- **Pricing & Margin Control**: Flexible pricing management, powerful margin analysis tools, contract and project-based pricing.
- **Warehouse Management (WMS)**: Mobile-first design, guided warehouse tasks, barcode scanning.
- **Supplier Management**: Quantitative scorecards measuring on-time delivery, quality rejection rates, price competitiveness. Supplier portal for PO acknowledgment, ASN submission, invoice uploads.
- **Business Intelligence**: Customizable KPIs, role-based dashboards, AI-driven analytics (Prism, launched 2025).

**UX Lessons:**
- Browser-based, works on tablets and smartphones
- Single interface for quote-to-order-to-invoice flow (no context switching)
- Role-based dashboards show only relevant information
- Three-way matching (PO vs. Receipt vs. Invoice) automated
- Spend analytics with drill-down by vendor, commodity, department, period

**Pricing:** Starting at ~$75/user/month, typical TCO $60K-$300K

### 10B. Oracle NetSuite (Wholesale Distribution Edition)

**Target Market:** Mid-to-large wholesale distributors

**Key Modules:**
- **Quote-to-Cash**: Connected workflow from initial quote through fulfillment and collection
- **Order Management**: Automated order-to-cash cycle (organizations report 50% reduction in processing time)
- **Advanced Pricing Rules**: Automated discounts/surcharges based on customer groups, item classifications, and custom criteria
- **Inventory**: Multi-warehouse management, real-time stock levels, automated purchase order creation
- **Customer Management**: 360-degree customer profiles, contact management, service capabilities
- **Financial Management**: Invoice processing, payment tracking, tax management, credit limits and holds
- **Reporting**: 200+ standard reports plus custom report builder
- **Mobile App**: On-the-go access to reports, order processing, real-time inventory

**Unique Distributor Features:**
- Vendor-managed inventory with automatic replenishment triggers
- Multiple ship-to addresses per customer
- Blanket purchase orders for recurring supply agreements
- EDI integration for automated order receipt
- Grid Order Management for rapid multi-line order entry
- Credit limits and holds to protect profits
- True cost tracking including freight, duties, tariffs, and rebates by item, customer, and channel

**UX Lessons:**
- Grid entry for high-volume order taking (critical for distribution)
- Credit limit enforcement inline during order entry (not after the fact)
- Zone-based sourcing optimization
- Exception dashboards showing problems by customer, product, or supplier
- Real-time cost rollup including hidden costs (freight, duties)

### 10C. Odoo (Open Source ERP)

**Target Market:** Small-to-mid distributors, highly customizable

**Key Modules (100+ available):**
- **Sales**: Quotation generation, pipeline management, lead-to-transaction lifecycle
- **CRM**: Customer interaction tracking, pipeline visualization, integrated with sales
- **Purchase**: Automated PO generation when stock falls below threshold, supplier management
- **Inventory**: Real-time multi-warehouse tracking, barcode/RFID, lot/serial tracking, predictive analytics
- **Accounting**: Full AR/AP, invoicing, financial reporting
- **Manufacturing**: (if applicable) BOM management, work orders

**Unique Strengths:**
- Modular architecture (pay only for what you use)
- Open source core with commercial modules
- Highly customizable without heavy development
- Integrated workflow engine across all modules
- Multi-channel order capture

**UX Lessons:**
- Clean, modern interface with consistent design patterns across all modules
- Kanban views for visual pipeline management
- Drag-and-drop functionality for stage progression
- Smart buttons linking related records (quote -> order -> delivery -> invoice)
- Chatter: built-in messaging on every record (similar to the contextual communication pattern described in Section 7)

### 10D. Common Patterns Across All Three ERPs

**What they all do well:**
1. **Single Source of Truth**: One record flows from quote to order to delivery to invoice
2. **Role-Based Views**: Different dashboards and permissions per user type
3. **Inline Approvals**: Approval workflows triggered by business rules
4. **Document Trail**: Every action logged, every document linked
5. **Real-Time Visibility**: Dashboards updated in real time, not batch
6. **Multi-Location Support**: Handle multiple warehouses, branches, currencies
7. **Mobile Access**: At minimum responsive web; best-in-class have native apps
8. **Three-Way Match**: PO, receipt, and invoice reconciliation automated
9. **Exception-Based Management**: Dashboards highlight problems, not routine items
10. **Smart Defaults**: System suggests suppliers, prices, quantities based on history

**What they all struggle with (and where a custom tool can differentiate):**
1. **Supplier Communication**: Most ERPs are weak at outbound supplier inquiries and tracking responses. They focus on PO management, not the pre-PO price discovery process.
2. **Side-by-Side Comparison**: Native quote comparison across multiple suppliers is often basic or requires add-ons.
3. **Relationship Mapping**: CRM modules in ERPs are generic; they lack the "who knows who" organizational mapping needed for $100M+ deals.
4. **Negotiation Tracking**: Quote versioning and counter-offer management is typically limited.
5. **Offline Payment Tracking**: Wire transfer, check, and LC tracking is often an afterthought; these ERPs are built for credit card and ACH-heavy markets.
6. **Arabic/RTL Support**: Most are weak in right-to-left interface support and Arabic business document generation.
7. **WhatsApp Integration**: Communication often happens on WhatsApp in the building materials industry; most ERPs don't capture this.

---

## Summary: Core Design Principles

1. **Quote-Centric Architecture**: Every workflow connects back to the quote. The quote is the nucleus of the system, not the order.

2. **Role-Based, Not Feature-Based**: Each user sees a dashboard tailored to their role. Sales never sees cost data that procurement sees. Finance sees margins that operations does not.

3. **Exception-Based Dashboards**: Home screens highlight what needs attention, not what's going well. Overdue items, expiring quotes, low margins, late deliveries.

4. **Contextual Communication**: Notes, mentions, and discussions live on the records they relate to (quotes, orders, customers), not in a separate chat tool.

5. **One-Click Cascades**: Converting a quote to an order should trigger automatic creation of POs, delivery schedules, and notifications. Minimize manual data re-entry.

6. **Offline Payment First**: Wire transfer, check, and letter of credit are primary payment methods, not afterthoughts. Track each payment type with its specific workflow (LC document compliance, check clearing, wire reference matching).

7. **Supplier Price Discovery as First-Class Feature**: The pre-PO process (sending inquiries, tracking responses, comparing prices) is as important as PO management itself. Most ERPs are weak here.

8. **Mobile for Field Sales, Desktop for Back Office**: Sales reps need fast, thumb-friendly mobile access. Procurement, operations, and finance work on desktop with rich, data-dense interfaces.

9. **Approval Workflows with Context**: Every approval request includes all information needed to decide, displayed inline. No one should have to open 3 screens to approve a quote.

10. **Complete Audit Trail**: In high-value B2B, every decision matters. Log who did what, when, and why. This protects the company and builds institutional knowledge.

---

## Sources

- [10 B2B Sales Dashboards for RevOps Teams in 2026](https://coefficient.io/sales-operations/sales-dashboards)
- [Sales Dashboard Templates: 11 Proven Examples for 2026 - Monday.com](https://monday.com/blog/crm-and-sales/sales-dashboard-templates/)
- [How Modern B2B Distributors Scale in 2026 - Shopify](https://www.shopify.com/enterprise/blog/b2b-distributors)
- [B2B UX Design: The Definitive Guide for Complex Products (2026)](https://www.parallelhq.com/blog/b2b-ux-design)
- [Best CPQ Software in 2026: 11 Top Tools](https://blog.alguna.com/best-cpq-software/)
- [Quoting vs. Direct Checkout B2B - SwiftOtter](https://swiftotter.com/blogs/ux-quoting-vs-direct-checkout-b2b-ecommerce)
- [B2B Manufacturing Portals: Custom Quote Systems - Storetasker](https://resources.storetasker.com/blog/b2b-ecommerce-portals-for-manufacturers)
- [RFQ in Direct Materials Procurement - LightSource](https://lightsource.ai/blog/rfq-in-procurement)
- [RFQ Process in Manufacturing - AuraVMS](https://www.auravms.com/blogs/rfq-process-in-manufacturing-competitive-supplier-quotes)
- [RFQ Management Software - Part Analytics](https://partanalytics.com/rfq-iq/)
- [Order Management - Oracle](https://www.oracle.com/scm/order-management/what-is-order-management/)
- [Complete Guide to Order Management - Smartsheet](https://www.smartsheet.com/content/order-management)
- [Buying Center: Map Influencers & Decision Makers - Pipeliner CRM](https://www.pipelinersales.com/crm/software/buying-center/)
- [10 Best B2B CRMs for 2026 - Creatio](https://www.creatio.com/glossary/b2b-crm)
- [What Is B2B CRM - Salesforce](https://www.salesforce.com/crm/b2b-crm/)
- [16 B2B eCommerce Workflow Automation Ideas - OroCommerce](https://oroinc.com/b2b-ecommerce/blog/workflow-automation-in-ecommerce/)
- [Approval Workflow Best Practices - DealHub](https://dealhub.io/blog/revenue-operations/approval-workflows-best-practices/)
- [Credit Limit Approval Process - Stoneridge Software](https://stoneridgesoftware.com/implementing-a-credit-limit-approval-process-with-workflows-in-business-central-part-2/)
- [Discount Approval Workflow - Manus](https://manus.im/playbook/discount-approval-process)
- [Mobile Sales Rep App with B2B Ordering - Cloudfy](https://www.cloudfy.com/platform/products/b2b-sales-rep-app/)
- [UX/UI Design for B2B Sales Software - Neuron](https://www.neuronux.com/post/ux-ui-design-for-b2b-sales-software)
- [Field & Sales Rep Mobile Order Taking - Pepperi](https://www.pepperi.com/mobile-order-taking/)
- [28 B2B Sales KPIs Companies Should Track - NetSuite](https://www.netsuite.com/portal/resource/articles/business-strategy/b2b-sales-kpis.shtml)
- [What Is Distributor Analytics Software - Phocas](https://www.phocassoftware.com/resources/blog/what-is-distributor-analytics-software)
- [Sales Reporting Software - ConnectWise CPQ](https://www.connectwise.com/platform/cpq/sales-quote-reporting)
- [Epicor Prophet 21 - Epicor](https://www.epicor.com/en-us/products/enterprise-resource-planning-erp/prophet-21/)
- [Epicor Prophet 21 Procurement - ERP Research](https://www.erpresearch.com/erp/epicor-prophet-21/procurement)
- [Epicor Prophet 21 ERP for Distributors - B2Sell](https://www.b2sell.com/blog/epicor-prophet-21-erp-for-distributors)
- [Epicor Prophet 21 Explained - Conveyance Solutions](https://conveyance365.com/blog/what-is-epicor-prophet-21/)
- [Top 10 Features of NetSuite Wholesale Distribution - CEBA Solutions](https://www.cebasolutions.com/blog-posts/the-top-10-features-of-netsuite-wholesale-distribution-edition)
- [NetSuite Wholesale Distribution - NetSuite](https://www.netsuite.com/portal/industries/wholesale.shtml)
- [How Distributors Use Odoo ERP - Bista Solutions](https://www.bistasolutions.com/resources/blogs/odoo-erp-for-distributors/)
- [Building Material Estimating Software - STACK](https://www.stackct.com/suppliers-distributors/)
- [Best CRM for Building Material Suppliers - Nutshell](https://www.nutshell.com/industries/building-materials-suppliers)
- [STACK for Building Materials Suppliers](https://www.stackct.com/suppliers-distributors/)
- [Slabstack - Building Material Supplier Software](https://slabstack.com/resources/blogs/how-to-choose-supplier-software/)
