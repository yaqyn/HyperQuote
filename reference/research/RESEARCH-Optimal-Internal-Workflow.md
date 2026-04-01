> ⚠️ **REFERENCE DOCUMENT — NOT THE SOURCE OF TRUTH**
> This file was written during the research phase and may contain outdated decisions, US-centric references, or superseded technical choices.
> **Always defer to `essential/RESEARCH.md` for current decisions.**
> Key changes since this file was written: TanStack Start (not Next.js), Capacitor (not Expo), React Aria (not shadcn), Egyptian law (not US FMCSA), EGP (not USD), dual auth pools, no online payments, no mobile wallets, spatial glass UI (not traditional dashboards).

# OPTIMAL INTERNAL WORKFLOW: Quote-Based B2B Building Materials Distribution

## Company Profile: HyperQuote
- Outsources materials from external suppliers, sells to construction companies
- No published prices -- every deal is quote-based
- Order sizes: $100K - $100M+
- Payments: wire transfer, check, letter of credit (no payment gateway)

---

## TABLE OF CONTENTS

1. [Sales Team Workflow](#1-sales-team-workflow-rfq-receipt-to-quote-delivery)
2. [Procurement Workflow](#2-procurement-workflow-supplier-sourcing)
3. [Quote Building & Approval](#3-quote-building-and-approval-workflow)
4. [Order Fulfillment](#4-order-fulfillment-workflow)
5. [Dispatch & Delivery](#5-dispatch-and-delivery-workflow)
6. [Finance & AR Workflow](#6-finance-workflow-for-offline-payments)
7. [Internal Communication](#7-internal-communication-patterns)
8. [Automation Opportunities](#8-automation-opportunities)
9. [Common Bottlenecks & Failures](#9-common-bottlenecks-and-failures)
10. [Real Tools & ERP Systems](#10-real-examples-of-internal-tools)

---

## 1. SALES TEAM WORKFLOW: RFQ Receipt to Quote Delivery

### Roles

| Role | Focus | Typical Ratio |
|------|-------|---------------|
| **Outside Sales Rep** | Relationship building, site visits, large/strategic accounts, reading body language, executive meetings. Generates leads through face-to-face interaction. | 1 per territory/region |
| **Inside Sales Rep** | Handles incoming RFQs, phone/email/video, processes quotes, manages smaller accounts, nurtures leads. Reduces cost-of-sales by 40-90% vs. field sales (HBR). | 2-4 per outside rep |
| **Sales Manager** | Approves non-standard pricing, manages pipeline, reviews win/loss, sets margin targets. | 1 per 6-10 reps |

### Minute-by-Minute: When an RFQ Arrives

**T+0 min -- RFQ LANDS (email, portal submission, phone call, or fax)**
- System auto-ingests into ticketing/CRM queue
- RFQ is parsed: NLP tools extract line items, quantities, specs from PDFs/emails
- Auto-assigned to sales rep based on: customer account ownership, territory, product specialty, current workload, round-robin rules

**T+2 min -- INITIAL TRIAGE (Inside Sales Rep)**
- Rep opens RFQ in CRM/ERP dashboard
- Quick scan: Is this a known customer or new prospect?
- Check customer credit status and history
- Assess complexity: simple (stock items) vs. complex (custom/specialty)
- Assess urgency: standard (3-5 day turnaround) vs. rush (same day/24hr)
- Tag/categorize the RFQ (product family, project type, estimated value)

**T+5 min -- ACKNOWLEDGMENT**
- Send auto or manual acknowledgment to customer: "We received your RFQ, expect quote by [date]"
- Best practice: acknowledge within 15 minutes of receipt
- Sets customer expectations and prevents them from going to competitors

**T+10 min -- BOM VALIDATION**
- Review Bill of Materials line by line
- Check: Are part numbers/specs complete? Are quantities realistic? Any ambiguities?
- Cross-reference against product catalog/ERP for item identification
- Flag missing information -- contact customer for clarification if needed
- This step consumes ~50% of the total RFQ cycle when done manually

**T+15-30 min -- PRICING RESEARCH (simple RFQ)**
- Check ERP for last-sold prices to this customer
- Check current supplier costs in system
- If costs are current and margins are within authority: build quote immediately
- If costs are stale or items are non-stock: hand off to procurement

**T+30 min -- PROCUREMENT HANDOFF (complex RFQ)**
- Create internal sourcing request with:
  - Full BOM with specs
  - Required delivery date
  - Customer context (how hot is this deal?)
  - Target margin guidance from sales manager
  - Any special requirements (certifications, testing, specific brands)
- Pass to procurement via: internal ticket system, @mention in Slack/Teams, or shared queue in ERP

**WHILE WAITING FOR SUPPLIER QUOTES (Hours to Days):**
- Rep works other RFQs in pipeline
- Follows up on sent quotes (checking if customer opened, has questions)
- Updates CRM with notes on every interaction
- End-of-day: reviews dashboard for overdue tasks, cold quotes, upcoming follow-ups

### Inside vs. Outside Sales Handoff

```
LEAD ROUTING LOGIC:
- Deal < $250K, existing customer, standard products --> Inside Sales owns
- Deal > $250K, new customer, or strategic account --> Outside Sales owns
- Outside Sales cultivates relationship, Inside Sales processes paperwork
- Inside Sales can escalate to Outside Sales when customer needs site visit
- Outside Sales hands back to Inside Sales for quote mechanics and follow-up
```

### Tools Used by Top Distributors

| Tool Category | Examples | Purpose |
|---------------|----------|---------|
| CRM | Salesforce, White Cup CRM, SugarCRM, Pipedrive | Customer data, pipeline, activity tracking |
| CPQ | Salesforce CPQ, DealHub, PandaDoc, QuoteWerks | Configure-price-quote automation |
| ERP (Quote Module) | Epicor Prophet 21, NetSuite, SAP B1, Odoo | Integrated quote-to-order |
| RFQ Parsing | Distro, SETVI Auto-RFQ, Iris AI | Extract line items from PDFs/emails |
| Communication | Slack, Teams, shared email inboxes | Internal coordination |

---

## 2. PROCUREMENT WORKFLOW: Supplier Sourcing

### Step-by-Step Process

**STEP 1: Receive Internal Sourcing Request (T+0)**
- Procurement receives request from sales with BOM, quantities, required delivery date
- Procurement analyst reviews for completeness
- Maps items to approved vendor list (AVL)
- Identifies which suppliers can provide each line item

**STEP 2: Supplier Selection Strategy (T+15 min)**
- **Closed RFQ**: Send only to pre-approved suppliers (faster, for known commodities)
- **Open RFQ**: Broader supplier outreach (for specialty items or when seeking better pricing)
- Typical: contact 3-5 suppliers per line item
- Priority order: preferred/contracted suppliers first, then alternates

**STEP 3: Contact Suppliers (T+30 min)**

| Method | When Used | Response Rate | Speed |
|--------|-----------|---------------|-------|
| **Supplier Portal** | Large/tech-savvy suppliers with portals | Highest (tracked) | 24-48 hrs |
| **Email** | Most common; uses standardized templates | Medium | 24-72 hrs |
| **Phone Call** | Urgent items, non-responsive suppliers, relationship-based | High | Immediate-4 hrs |
| **EDI/API** | Integrated suppliers (automated PO/quote exchange) | Automatic | Minutes-hours |

**Standard Supplier Inquiry Email Template:**
```
Subject: Quote Request - [Project/Customer Reference] - [Date Needed By]

Hi [Supplier Contact],

We need pricing and availability for the following items:

[Line Item Table: Part#, Description, Qty, Required Delivery Date]

Please provide:
- Unit pricing (FOB origin / delivered)
- Lead time from order placement
- MOQ if applicable
- Validity period of your quote

Deadline for response: [Date, typically 24-48 hrs]

Thank you,
[Procurement Contact]
```

**STEP 4: Track Supplier Responses (Ongoing)**
- Maintain a centralized tracking spreadsheet or portal showing:
  - Which suppliers were contacted
  - Date/time contacted
  - Response status (pending, received, declined)
  - Follow-up dates
- **Non-responsive supplier protocol:**
  - First follow-up: phone call at 24 hours
  - Second follow-up: email + phone at 48 hours
  - After 72 hours: mark as non-responsive, contact alternate supplier
  - Log non-responsiveness for future supplier scoring

**STEP 5: Normalize and Compare Quotes (T+24-72 hrs after issuance)**
- Incoming supplier quotes require standardization:
  - Convert currencies if international suppliers
  - Align Incoterms (shipping terms: FOB, CIF, DDP)
  - Adjust for MOQ differences
  - Account for packaging/freight costs
  - Verify specs match requirements exactly
  - Check lead times against customer need date
- Build comparison matrix (side-by-side view):

| Criteria | Supplier A | Supplier B | Supplier C |
|----------|------------|------------|------------|
| Unit Price | $X | $Y | $Z |
| Freight | Included | $F | $G |
| Lead Time | 2 weeks | 3 weeks | 10 days |
| MOQ | 100 units | 50 units | 200 units |
| Payment Terms | Net 30 | Net 45 | Net 60 |
| Quality Rating | 4.5/5 | 3.8/5 | 4.2/5 |

**STEP 6: Select Supplier and Negotiate (T+48-96 hrs)**
- Shortlist top 1-2 suppliers
- Negotiate: unit price, volume discounts, delivery schedule, payment terms, warranty
- Common trade-offs:
  - Lower unit cost vs. larger order volumes
  - Shorter lead times vs. expedited freight charges
  - Extended warranties vs. higher upfront price
- Get final confirmed pricing from selected supplier(s)

**STEP 7: Hand Back to Sales with Cost Data**
- Deliver to sales rep:
  - Confirmed supplier cost per line item
  - Freight/logistics cost estimate
  - Lead time commitment
  - Any supplier conditions or limitations
  - Recommended margin based on product category norms

### Typical Response Times

| Scenario | Supplier Response Time | Total Procurement Cycle |
|----------|----------------------|------------------------|
| Stock items, known suppliers | 2-4 hours | Same day |
| Standard items, multiple suppliers | 24-48 hours | 1-2 business days |
| Specialty/custom items | 3-5 business days | 5-10 business days |
| International sourcing | 5-10 business days | 2-4 weeks |
| Production material lead times (ISM 2025 data) | Average 84-85 days | -- |

---

## 3. QUOTE BUILDING AND APPROVAL WORKFLOW

### Who Builds the Quote?

**In most distributors: SALES builds the final customer-facing quote, using cost data from PROCUREMENT.**

The division of labor:
- **Procurement** provides: landed cost per item, freight estimates, lead times
- **Sales** adds: margin/markup, customer-specific terms, delivery commitments, presentation formatting
- **Finance** sets: margin floors, payment terms, credit limits

### Margin Decision Framework

```
MARGIN AUTHORITY LEVELS (Typical):

Inside Sales Rep:    Can quote at standard margin (e.g., 18-25%)
                     No approval needed

Senior Sales Rep:    Can discount up to 5% below standard
                     No approval needed

Sales Manager:       Can approve margins down to floor (e.g., 12-15%)
                     Required for discounts > 5%

VP Sales / GM:       Can approve below-floor margins (e.g., 8-12%)
                     Required for strategic/competitive deals

CEO / CFO:           Required for any deal below 8% margin
                     Required for deals > $1M (dual approval)
                     Required for non-standard payment terms
```

**Margin Calculation:**
```
Customer Price = Supplier Cost + Freight + Margin
Margin % = (Customer Price - Total Cost) / Customer Price x 100

Example:
  Supplier cost: $50,000
  Freight: $3,000
  Target margin: 20%
  Customer price: ($50,000 + $3,000) / (1 - 0.20) = $66,250
  Gross profit: $13,250
```

### Quote Approval Workflow

```
SEQUENTIAL APPROVAL CHAIN:

1. Sales Rep creates quote in CPQ/ERP
   |
   v
2. SYSTEM CHECK: Is margin within rep's authority?
   |
   YES --> Auto-approved, skip to step 5
   NO --> Route to next approver
   |
   v
3. Sales Manager reviews:
   - Is margin justified? (competitive pressure, strategic value, volume)
   - Is customer creditworthy?
   - Is delivery timeline realistic?
   |
   APPROVED --> Step 5
   REJECTED --> Back to rep with feedback
   |
   v
4. VP/CFO reviews (if above manager authority):
   - Strategic fit assessment
   - Cash flow impact for large deals
   - Payment terms risk
   |
   v
5. Quote finalized and formatted
   |
   v
6. Quote sent to customer
```

### Rush Quote Process

| Priority | Trigger | Target Turnaround | Process Modification |
|----------|---------|-------------------|---------------------|
| Standard | Normal RFQ | 24-72 hours | Full process |
| Priority | Customer flags urgent | 4-8 hours | Skip comparison matrix, use preferred supplier |
| Emergency | Active jobsite needs | 1-2 hours | Phone-based pricing, verbal approval, quote follows |

### Average Turnaround Times (Industry Benchmarks)

| Complexity | Manual Process | With Automation |
|------------|---------------|-----------------|
| Simple (stock items, known pricing) | 30 min - 2 hours | Under 5 minutes |
| Medium (3-10 line items, sourcing needed) | 1-3 business days | 4-8 hours |
| Complex (50+ items, specialty sourcing) | 5-10 business days | 2-3 business days |
| International sourcing required | 2-4 weeks | 1-2 weeks |

**Key stat**: As many as 50% of deals go to the vendor who responds first. When a proposal takes 3 days instead of 1, momentum dies.

---

## 4. ORDER FULFILLMENT WORKFLOW

### Post-Quote-Acceptance Process

**STEP 1: Order Confirmation (T+0 -- Customer accepts quote)**
- Sales rep receives acceptance (email, signed quote, PO from customer)
- Sales rep converts quote to sales order in ERP
- System validates: customer credit check, inventory availability, pricing confirmation
- Order confirmation sent to customer with: SO number, expected delivery dates, payment terms

**STEP 2: Procurement Creates Supplier PO (T+0-2 hrs)**
- If items are in stock: skip to Step 4 (warehouse)
- If items need to be ordered (most cases for project-based orders):
  - Procurement creates Purchase Order from the approved supplier quote
  - PO includes: exact specs, quantities, delivery address (warehouse or direct), required delivery date
  - PO sent to supplier via: EDI, email, or supplier portal
  - PO acknowledgment requested from supplier within 24 hours

**STEP 3: Supplier Order Tracking (Ongoing)**
- Procurement tracks supplier order status:
  - PO acknowledged? If not, follow up at 24 hours
  - Production/shipping on schedule?
  - Any delays or substitutions?
- Update internal order status in ERP
- Communicate any changes to sales rep --> customer

**STEP 4: Goods Receipt / Warehouse (When materials arrive)**

```
FULFILLMENT PATHS:

Path A: WAREHOUSE FULFILLMENT (Standard)
  Supplier --> HyperQuote Warehouse --> Customer Jobsite
  - Receiving team inspects incoming goods against PO
  - Quality check: quantities, specs, damage
  - Items entered into inventory (lot tracking, serial numbers)
  - Pick/pack for customer order
  - Stage for delivery or pickup

Path B: DROP-SHIP (Direct from Supplier to Customer)
  Supplier --> Customer Jobsite (directly)
  - Used for: bulk materials, oversized items, items not worth warehousing
  - Procurement coordinates delivery between supplier and customer
  - Challenge: limited visibility into shipment status
  - Must get tracking/delivery confirmation from supplier
  - HyperQuote still invoices customer (supplier invoices HyperQuote)

Path C: CROSS-DOCK (Consolidation)
  Multiple Suppliers --> HyperQuote Warehouse --> Customer Jobsite
  - Materials from multiple suppliers consolidated at warehouse
  - Combined into single delivery to customer
  - Common for project-based orders with 10+ line items from different sources
```

**STEP 5: Handling Partial Fulfillment**
- Common in building materials (long lead times, backordered items)
- Process:
  1. Ship available items first (partial shipment)
  2. Create backorder for remaining items
  3. Notify customer of partial delivery with updated ETA for balance
  4. Invoice for shipped items only (or hold invoice per customer agreement)
  5. Track backorder separately in ERP
  6. Ship balance when available
- Customer communication is critical -- no surprises

### Order Status Tracking

| Status | Meaning | Visible To |
|--------|---------|-----------|
| Quote Sent | Awaiting customer acceptance | Sales, Customer |
| Order Confirmed | SO created, PO pending | Sales, Procurement |
| PO Placed | Supplier order submitted | Sales, Procurement |
| PO Acknowledged | Supplier confirmed order | Procurement |
| In Production | Supplier manufacturing | Procurement |
| Shipped (Inbound) | En route to warehouse | Procurement, Warehouse |
| Received | At warehouse, QC pending | Warehouse |
| Ready for Dispatch | Picked, packed, staged | Warehouse, Dispatch |
| Out for Delivery | On truck to customer | Dispatch, Driver, Customer |
| Delivered | Proof of delivery captured | All |
| Invoiced | Invoice sent to customer | Sales, Finance |
| Paid | Payment received | Finance |

---

## 5. DISPATCH AND DELIVERY WORKFLOW

### Pre-Dispatch Planning

**DISPATCHER'S DAILY ROUTINE (starts 1-2 days before delivery):**

1. **Review delivery queue** -- all orders marked "Ready for Dispatch"
2. **Assess delivery requirements per order:**
   - Total weight and dimensions (determines truck type)
   - Equipment needed: flatbed, crane, Moffett (truck-mounted forklift), standard box truck
   - Special handling: fragile materials, hazardous, oversized
   - Jobsite access restrictions: narrow roads, weight limits, gate codes, working hours
3. **Route optimization:**
   - Group deliveries by geographic area
   - Sequence stops by time windows and priority
   - Factor in: traffic patterns, bridge heights, road weight restrictions, weather
   - Use route optimization software (Descartes, DispatchTrack, OptimoRoute, Route4Me)
4. **Assign drivers:**
   - Match driver capability to load requirements (CDL class, equipment certification)
   - Balance workload across fleet
   - Consider driver familiarity with delivery area
5. **Generate delivery manifest:**
   - Stop sequence with addresses and GPS coordinates
   - Customer contact info per stop
   - Material list per stop
   - Special instructions per stop
   - Required signatures

### Driver Information Package

Each driver receives (via mobile app or printed):
- Turn-by-turn navigation to each stop
- Delivery manifest with item details
- Customer contact name and phone number
- Site access instructions (gate codes, which entrance, where to unload)
- Equipment notes (forklift needed, crane scheduled)
- Photo requirements for proof of delivery
- PPE requirements for jobsite entry
- Time windows for each delivery

### Building Materials Specific Challenges

| Challenge | Solution |
|-----------|----------|
| No dock at construction sites | Moffett (truck-mounted forklift) or crane coordination |
| GPS inaccurate for new construction | Pre-verified coordinates + driver site visit notes |
| Active jobsite hazards | Driver safety training, PPE requirements, site orientation |
| Delivery timing critical (crews waiting) | Realistic time windows, real-time ETA updates |
| Weather impact on materials | Weather-sensitive materials in covered transport |
| Remote/rural sites | Pre-scout routes, verify road conditions |

### Delivery Exception Handling

**Customer Not Available:**
1. Driver calls customer 30 minutes before arrival
2. If no answer: driver calls dispatch
3. Dispatch calls customer and backup contact
4. If still no contact: driver waits max 15-30 minutes
5. If unresolved: return to warehouse, reschedule, customer charged redelivery fee

**Wrong Address / Cannot Access Site:**
1. Driver contacts dispatch immediately
2. Dispatch contacts sales rep who contacts customer
3. Get corrected address or access instructions
4. If nearby: reroute immediately. If far: reschedule

**Damaged Goods Discovered:**
1. Driver photographs damage before unloading
2. Driver notes damage on delivery receipt
3. Customer signs with damage notation
4. Dispatch notifies warehouse and sales rep
5. Replacement order initiated (expedited)
6. Insurance/supplier claim process begins

**Partial Delivery Rejection:**
1. Customer inspects delivery, rejects specific items
2. Driver documents rejection with photos and customer signature
3. Rejected items returned to warehouse
4. Sales rep follows up with customer on resolution
5. Credit memo or replacement processed

### Communication Flow

```
REAL-TIME DELIVERY COMMUNICATION:

Dispatcher <---> Driver (Mobile app, radio, phone)
  - Route changes, delays, emergencies

Dispatcher ---> Customer (SMS/email automated)
  - ETA notifications: "Your delivery arrives in ~30 min"
  - Delivery confirmation: "Delivered at [time], signed by [name]"

Driver ---> System (Mobile app)
  - GPS tracking (continuous)
  - Status updates: arrived, unloading, completed
  - Photo proof of delivery
  - Digital signature capture

Sales Rep <--- System (Notifications)
  - Delivery completed notification
  - Exception alerts (damage, rejection, delay)
```

### Real-World Technology Stack

| Company | Fleet Size | Technology |
|---------|-----------|-----------|
| SRS Distribution | 4,000 vehicles | Descartes route optimization, telematics, in-cab dash cams, custom contractor app ($1.5B in app-driven sales) |
| New Castle Building Products | 20+ locations | Centralized digital dispatch (reduced 25,000 miles/year), photo proof of delivery |
| Richards Building Supply | Regional | Mobile safety training, photo-based proof of delivery |

---

## 6. FINANCE WORKFLOW FOR OFFLINE PAYMENTS

### Invoice Generation Process

**Trigger:** Delivery confirmed (proof of delivery received) OR per customer contract terms

1. **Invoice Creation (T+0, delivery day):**
   - ERP auto-generates invoice from sales order + delivery confirmation
   - Invoice includes: SO reference, PO reference, line items delivered, unit prices, total, tax if applicable
   - Payment terms printed: Net 30, Net 45, Net 60 (as negotiated)
   - Wire transfer instructions, check mailing address, LC details included
   - Invoice approved by finance team (or auto-approved if standard)
   - Sent to customer via: email (PDF), customer portal, or mail

2. **For Large Project Orders ($1M+):**
   - Progress billing / milestone invoicing (30% on order, 40% on delivery, 30% on completion)
   - Or draw schedule aligned with construction phases
   - Each milestone triggers partial invoice

### Payment Methods & Processing

| Method | Processing Time | Reconciliation Complexity | Common For |
|--------|----------------|--------------------------|-----------|
| **Wire Transfer** | 24 hours | Medium -- need to match to invoice | Large orders $500K+ |
| **ACH** | 3-5 business days | Medium | Repeat customers |
| **Check** | 5-10 business days (mail + processing) | High -- manual matching | Smaller orders, government |
| **Letter of Credit** | Varies (bank-mediated) | High -- document compliance | International, very large deals |

### AR Clerk Daily Routine

**MORNING (8:00-10:00 AM):**
1. Log into bank portal(s) -- check for overnight wire transfers and ACH deposits
2. Download bank transaction report
3. Match incoming payments to open invoices in ERP:
   - Wire: match by reference number, amount, customer name
   - ACH: match by amount and customer identifier
   - Check: open mail, scan checks, match to remittance advice
4. Post matched payments to customer accounts
5. Flag unmatched payments for investigation

**MID-MORNING (10:00-12:00 PM):**
6. Generate new invoices for yesterday's deliveries
7. Review and send invoices to customers
8. Process any credit memos (returns, adjustments, pricing corrections)
9. Respond to customer billing inquiries

**AFTERNOON (1:00-3:00 PM):**
10. Run aging report -- review all overdue accounts
11. Collections activity (see escalation below)
12. Follow up on unmatched payments
13. Reconcile any discrepancies between bank and ERP

**END OF DAY (3:00-5:00 PM):**
14. Update cash receipts journal
15. Prepare daily cash position report for CFO
16. File documentation for processed payments
17. Prepare next-day collection call list

### Wire Transfer Reconciliation Process

```
WIRE RECONCILIATION:

1. Wire arrives at bank (often with cryptic reference info)
   |
   v
2. AR clerk checks:
   - Does the amount match an open invoice exactly? --> Easy match
   - Is it a round number not matching any invoice? --> Could be partial payment
   - Does the wire reference contain a PO# or invoice#? --> Match by reference
   - Is this from a known customer bank account? --> Match by customer
   |
   v
3. If no match found:
   - Check if payment is for multiple invoices combined
   - Contact customer's AP department for remittance advice
   - Hold in "unapplied cash" account pending resolution
   |
   v
4. Once matched:
   - Apply payment to invoice(s) in ERP
   - Update customer account balance
   - If overpayment: create credit on account
   - If underpayment: flag remaining balance for follow-up
```

### Partial Payment Handling

1. Customer pays less than invoice total
2. AR clerk determines reason:
   - **Intentional partial**: customer paying in installments (document agreement)
   - **Dispute-related**: customer withholding amount for damaged/missing goods
   - **Error**: wrong amount sent
3. Apply received amount to invoice
4. Remaining balance stays open on aging report
5. Sales rep notified if dispute-related
6. Collections process begins on remaining balance per normal schedule

### Collections Escalation Timeline

| Timeline | Action | Owner | Method |
|----------|--------|-------|--------|
| **7 days before due** | Courtesy reminder | Auto-email | Email |
| **Due date** | Payment due notification | Auto-email | Email |
| **7 days past due** | Friendly reminder | AR Clerk | Email |
| **15 days past due** | Second reminder, more direct | AR Clerk | Email + Phone |
| **30 days past due** | Formal collection call | AR Clerk | Phone + Email |
| **45 days past due** | Escalate to Sales Rep | AR Clerk + Sales | Phone |
| **60 days past due** | Credit hold placed on account | AR Manager | Written notice |
| **60-90 days past due** | Final internal demand letter | AR Manager / Legal | Certified mail |
| **90+ days past due** | External collections agency OR legal action | Management decision | Agency/Legal |

**Credit Hold Trigger:** When an account hits 60 days past due, the system blocks new orders until payment is received. Sales rep is notified immediately.

### Bad Debt Reserve Calculations (Industry Standard)

| Aging Bucket | Reserve % |
|-------------|-----------|
| Current | 1% |
| 1-30 days past due | 4% |
| 31-60 days past due | 10% |
| 61-90 days past due | 30% |
| 90+ days past due | 50% |

---

## 7. INTERNAL COMMUNICATION PATTERNS

### Channel Architecture

```
RECOMMENDED CHANNEL STRUCTURE (Slack/Teams):

#sales-general          -- Sales team announcements, wins, general discussion
#sales-rfq-queue        -- Live feed of incoming RFQs, assignments, status
#procurement-sourcing   -- Procurement team, supplier discussions
#procurement-urgent     -- Urgent sourcing requests (alerts enabled)
#orders-fulfillment     -- Order status updates, warehouse coordination
#dispatch-operations    -- Delivery planning, driver issues
#finance-ar             -- Billing questions, payment status
#cross-team-escalations -- Issues requiring multiple departments
#customer-[name]        -- Dedicated channel per major customer/project

PER-ORDER THREADS:
- Each order gets a thread in the relevant channel
- All updates, questions, and decisions documented in thread
- @mentions to pull in specific people
```

### Communication Patterns by Interaction Type

| Interaction | Method | Why |
|-------------|--------|-----|
| RFQ assignment to sales rep | System notification + Slack @mention | Speed + traceability |
| Sales --> Procurement sourcing request | Internal ticket in ERP + Slack message in #procurement-sourcing | Structured data + human alert |
| Procurement --> Sales with supplier pricing | Update on ERP ticket + Slack thread reply | Data in system, notification in chat |
| Sales --> Customer quote delivery | Email with PDF attachment | Formal, customer-preferred |
| Order status questions | Slack thread on order channel | Quick, documented |
| Delivery exceptions | Phone call + Slack alert in #dispatch-operations | Urgency requires phone, documentation in Slack |
| Payment inquiries | Email (finance --> customer AP) | Formal paper trail |
| Escalations | Phone first, then documented in Slack/ERP | Urgency + accountability |
| Weekly pipeline review | Video meeting (Zoom/Teams) | Face-to-face for nuance |
| Daily dispatch briefing | 15-min standup (in person or video) | Operational coordination |

### What Causes Communication Breakdowns

| Breakdown | Symptom | Prevention |
|-----------|---------|------------|
| **Siloed departments** | Sales doesn't know procurement status | Shared order tracking visible to all |
| **Lost context on order changes** | Customer changes quantity, procurement doesn't know | Mandatory ERP note + @mention on every change |
| **No single source of truth** | Conflicting info in email vs. Slack vs. ERP | Rule: ERP is the system of record, always |
| **Verbal agreements not documented** | Customer claims different price/terms | All agreements confirmed in writing (email), logged in ERP |
| **Late escalations** | Problem festers for days before surfacing | Auto-alerts at thresholds (e.g., RFQ > 24hrs without response) |
| **Too many channels** | Important messages buried in noise | Strict channel discipline, pin important messages |

### Meeting Cadence

| Meeting | Frequency | Attendees | Duration | Purpose |
|---------|-----------|-----------|----------|---------|
| Daily dispatch huddle | Daily, 7:00 AM | Dispatch, warehouse | 15 min | Today's deliveries, exceptions |
| Sales standup | Daily, 8:30 AM | Sales team | 15 min | Hot RFQs, pipeline priorities |
| Procurement sync | Daily, 9:00 AM | Procurement, relevant sales | 15 min | Pending supplier responses, blockers |
| Sales-Finance review | Weekly, Monday | Sales managers, AR lead | 30 min | Outstanding receivables, credit issues |
| Operations review | Weekly, Friday | All department leads | 60 min | KPIs, bottlenecks, upcoming large orders |
| Pipeline review | Weekly, Wednesday | Sales team + GM | 60 min | Quote pipeline, win/loss analysis |

---

## 8. AUTOMATION OPPORTUNITIES

### What Can Be Automated TODAY

| Process | Automation | Tool/Method | Impact |
|---------|-----------|-------------|--------|
| **RFQ Ingestion** | Auto-extract line items from PDF/email RFQs | NLP/AI tools (Distro, SETVI) | 30 min --> 2 min per RFQ |
| **RFQ Assignment** | Auto-route to correct rep based on rules | CRM workflow (Salesforce, HubSpot) | Eliminates manual triage |
| **Customer Acknowledgment** | Auto-send "received your RFQ" email | Email automation | Instant vs. hours |
| **Supplier Inquiry** | Auto-send RFQ to preferred suppliers | Procurement platform (QuoteToMe, Kavida) | Minutes vs. hours |
| **Quote Comparison** | Auto-normalize supplier quotes side-by-side | RFQ management software (Part Analytics, Surefront) | Hours --> minutes |
| **Margin Calculation** | Auto-apply margin rules per customer tier/product | CPQ engine (DealHub, Salesforce CPQ) | Eliminates pricing errors |
| **Approval Routing** | Auto-route quotes to correct approver based on rules | CPQ + workflow automation | No bottleneck hunting |
| **Quote Document Generation** | Auto-merge data into branded PDF template | CPQ, PandaDoc, Power Automate | 15 min --> seconds |
| **Quote Follow-up** | Auto-send reminders at 24/48/72 hrs if no response | CRM + email automation | Zero missed follow-ups |
| **PO Generation** | Auto-create supplier PO from accepted quote | ERP workflow (Prophet 21, NetSuite) | One-click conversion |
| **Invoice Generation** | Auto-create invoice upon delivery confirmation | ERP + delivery system integration | Same day vs. next day+ |
| **Payment Reminders** | Auto-send at 7 days before due, due date, 7/15/30 past due | AR automation (Billtrust, Bill360) | Consistent, never missed |
| **Aging Reports** | Auto-generate daily/weekly aging reports | ERP standard feature | Always current |
| **Delivery ETAs** | Auto-send customer ETA updates based on GPS | Dispatch software (DispatchTrack) | Real-time visibility |
| **Proof of Delivery** | Auto-capture photos + digital signatures | Driver mobile app | Instant, irrefutable |

### What Should NEVER Be Automated

| Process | Why It Needs Humans |
|---------|-------------------|
| **Final margin decisions on large deals** | Strategic judgment, relationship context, competitive intelligence |
| **Customer relationship management** | Trust, empathy, understanding customer's real needs |
| **Supplier negotiation** | Leverage reading, creative deal structuring, relationship |
| **Credit decisions for new customers** | Risk assessment requires judgment beyond data |
| **Exception handling (delivery problems)** | Requires real-time problem solving, customer empathy |
| **Collections calls** | Requires tact, negotiation skills, reading the situation |
| **Strategic supplier selection** | Quality, reliability, and strategic fit are nuanced |
| **Complex quote configuration** | Custom/engineered products need expertise |

### Automation ROI Estimates

| Automation | Time Saved Per Instance | Volume Per Month | Monthly Hours Saved |
|-----------|----------------------|------------------|-------------------|
| RFQ parsing | 28 minutes | 200 RFQs | 93 hours |
| Supplier inquiry auto-send | 15 minutes | 400 inquiries | 100 hours |
| Quote document generation | 12 minutes | 200 quotes | 40 hours |
| Payment reminder emails | 5 minutes | 500 reminders | 42 hours |
| Invoice generation | 10 minutes | 300 invoices | 50 hours |
| **TOTAL** | | | **~325 hours/month** |

---

## 9. COMMON BOTTLENECKS AND FAILURES

### TOP 5 OPERATIONAL FAILURES (Ranked by Revenue Impact)

**#1: SLOW QUOTE RESPONSE TIME**
- **Impact:** 50% of deals go to the vendor who responds first
- **Root Cause:** Manual BOM parsing (50% of cycle time), waiting for supplier quotes, approval bottlenecks
- **Symptom:** Customer already bought from competitor by the time quote arrives
- **Prevention:**
  - Automate RFQ parsing and acknowledge within 15 minutes
  - Pre-negotiate pricing with top 20 suppliers for common items
  - Set maximum turnaround SLAs: 4 hours for stock items, 24 hours for standard, 48 hours for complex
  - Escalation alert if RFQ sits unassigned for > 30 minutes

**#2: LOST OR FORGOTTEN RFQs**
- **Impact:** Deals lost not from rejection but from neglect
- **Root Cause:** RFQs buried in email inboxes, no centralized queue, no assignment tracking
- **Symptom:** Customer calls asking "where's my quote?" or just goes silent
- **Prevention:**
  - Centralized RFQ queue with auto-assignment
  - Dashboard showing all open RFQs with aging timer
  - Alert when any RFQ exceeds 24 hours without action
  - Weekly audit of quote pipeline for stale items

**#3: PRICING ERRORS (Quoting with Outdated Costs)**
- **Impact:** Eroded margins, customer confusion, need to re-quote (loses credibility)
- **Root Cause:** Static price sheets, manual cost lookups, supplier price changes not updated in system
- **Symptom:** Margins 5-10% lower than expected, or customer gets better price from competitor
- **Prevention:**
  - Supplier cost updates fed into ERP automatically or on regular schedule
  - Real-time cost validation before quote generation
  - Margin floor alerts: system blocks quotes below minimum margin
  - Monthly price review meetings with procurement

**#4: DELIVERY FAILURES (Late, Damaged, Wrong Items)**
- **Impact:** Customer trust destroyed, redelivery costs, potential project delay claims
- **Root Cause:** Supplier delays not tracked, poor warehouse QC, dispatch miscommunication
- **Symptom:** Customer calls about missing/damaged/wrong delivery
- **Prevention:**
  - Proactive supplier shipment tracking with alerts for delays
  - Receiving QC checklist (match PO, inspect for damage, verify quantities)
  - Pre-delivery confirmation call to customer
  - Photo proof of delivery at every stop
  - Backup suppliers pre-identified for critical items

**#5: POOR FOLLOW-UP AFTER QUOTE SENT**
- **Impact:** Quotes go stale, customer forgets, competitor swoops in
- **Root Cause:** No tracking of quote opens/views, no systematic follow-up, rep overwhelmed
- **Symptom:** Low quote-to-order conversion rate (industry average: 20-30%)
- **Prevention:**
  - Track quote opens/views (document tracking in PandaDoc, DocuSign)
  - Automated follow-up sequence: 24 hrs, 72 hrs, 1 week
  - CRM task for personal follow-up call at 48 hours
  - Weekly quote pipeline review: what's open? what's stale? what's lost? why?
  - Measure and track: quote conversion rate, average time to close, win/loss reasons

### Additional Common Failures

| Failure | Impact | Fix |
|---------|--------|-----|
| **Approval bottleneck** | Manager on vacation, quote stuck for days | Delegate approval authority, auto-escalate after X hours |
| **Supplier non-responsiveness** | Can't quote because supplier won't respond | Multiple suppliers per item, auto-follow-up rules, supplier scorecards |
| **Inventory discrepancies** | Promise delivery but item not actually in stock | Cycle counting, real-time inventory sync, safety stock for fast movers |
| **Credit issues discovered late** | Order processed, then credit hold blocks fulfillment | Credit check at RFQ stage, not just order stage |
| **Miscommunication on specs** | Customer ordered 4" pipe, supplier shipped 3" | Spec confirmation step with customer before PO placement |
| **Payment disputes block reorders** | Customer can't place new orders due to unresolved old invoice | Proactive dispute resolution, separate dispute workflow |

---

## 10. REAL EXAMPLES OF INTERNAL TOOLS

### ERP Systems Used by Top Building Materials Distributors

| Company | Revenue | ERP / Key Technology | Notes |
|---------|---------|---------------------|-------|
| **Builders FirstSource** | ~$17B | Microsoft Azure cloud, acquired WTS Paradigm ($450M) for end-to-end building products software (ERP for door/window manufacturers, takeoff, design) | 28,000 employees, 585 locations |
| **Ferguson Enterprises** | ~$21.5B | Microsoft Azure, Red Hat JBoss, AppDynamics APM. Custom-built systems with API integrations. | 27,000 employees, digital-first strategy |
| **SRS Distribution** | ~$10B | Custom contractor app ($1.5B in app-driven sales), Descartes for route optimization and dispatch, telematics, in-cab dash cams | 4,000-vehicle fleet |
| **HD Supply** | Subsidiary of Home Depot | Home Depot enterprise systems, 100+ distribution centers, direct-ship capability, digital tools for ordering | Focused on MRO/institutional |

### ERP Platform Comparison for Mid-Market Distributors

#### Epicor Prophet 21
- **Best for:** Pure-play wholesale distributors
- **Key modules:** Quote and order entry from single screen, advanced matrix pricing, contract pricing, rebate management, warehouse management (directed putaway/picking), counter sales with POS, integrated CRM (360-degree customer view), AR/AP, GL
- **Quote workflow:** Quote created in Order Management --> pricing pulled from pricing engine (matrix pricing, customer-specific contracts) --> approval workflow --> one-click conversion to sales order --> PO auto-generation for out-of-stock items
- **Strengths:** Purpose-built for distribution, minimal customization needed, vendor rebate tracking
- **API:** Prophet 21 API for ecommerce, CRM, and logistics integrations

#### Oracle NetSuite (Distribution Edition)
- **Best for:** Multi-entity, multi-location distributors needing financial depth
- **Key modules:** Sales orders, purchase orders, inventory management, demand planning, financial management, CRM, warehouse management
- **Quote workflow:** Quote created in CRM or Sales module --> approval workflow --> convert to sales order --> auto-generate PO based on fulfillment rules --> invoice on shipment
- **Strengths:** Cloud-native, strong financial reporting, customizable with SuiteScript
- **Weakness:** Requires significant customization for distribution-specific workflows vs. Prophet 21

#### SAP Business One
- **Best for:** Growing distributors who may also do light manufacturing
- **Key modules:** Purchasing (4-step procurement: PO --> Goods Receipt --> AP Invoice --> Payment), sales quotation --> sales order --> delivery --> AR invoice, warehouse management, financial management
- **Quote workflow:** Sales Quotation document --> approval workflow based on authorization levels --> convert to Sales Order --> Purchasing module auto-generates PO --> Goods Receipt PO --> Delivery note --> AR Invoice
- **Strengths:** Global capabilities, multi-currency, robust approval workflows
- **Procurement flow:** Purchase Requisition --> Purchase Quotation (to suppliers) --> Purchase Order --> Goods Receipt PO --> AP Invoice --> Outgoing Payment

#### Odoo (Distribution Configuration)
- **Best for:** Budget-conscious distributors, highly customizable
- **Key modules:** Sales (quotation management), Purchase (vendor RFQ, PO), Inventory (multi-warehouse, routes), Accounting (AR/AP), CRM
- **Quote workflow:** Quotation created in Sales --> pricing from pricelists/rules --> approval workflow --> confirm to Sales Order --> auto-generate Purchase Order for procurement --> Warehouse processes delivery --> Invoice generated
- **Strengths:** Open source, modular, very affordable, drop-ship and backorder native support
- **Automation:** Automated procurement rules, vendor selection, reorder points, delivery scheduling

### Integration Architecture (Typical)

```
CUSTOMER-FACING:
  Customer Portal / Website
        |
        v
  CRM (Salesforce / HubSpot / Built-in)
        |
        v
  CPQ Engine (Configure-Price-Quote)
        |
        v
CORE ERP (Prophet 21 / NetSuite / SAP B1 / Odoo)
  |         |         |         |
  v         v         v         v
Sales    Purchasing  Inventory  Finance
Module   Module      Module     Module
  |         |         |         |
  v         v         v         v
OPERATIONAL:
  Warehouse Mgmt (WMS)
  Route Optimization (Descartes / DispatchTrack)
  Driver Mobile App (custom or DispatchTrack)
  Accounting (GL / AR / AP)
        |
        v
SUPPLIER-FACING:
  EDI / Supplier Portal / Email Integration
  Supplier PO transmission
  Inbound shipment tracking
        |
        v
FINANCE:
  Bank Integration (wire/ACH monitoring)
  AR Automation (Billtrust / Bill360)
  Collections Management
  Financial Reporting / BI
```

### Specialized Tools by Function

| Function | Tool | What It Does |
|----------|------|-------------|
| RFQ Parsing | Distro, SETVI Auto-RFQ | Extracts line items from messy PDFs/emails |
| CPQ | DealHub, Salesforce CPQ, PandaDoc | Quote configuration, pricing, approval, document generation |
| Procurement RFQ | QuoteToMe, Kavida, Part Analytics RFQ IQ | Sends RFQs to suppliers, tracks responses, compares bids |
| Route Optimization | Descartes, DispatchTrack, OptimoRoute, Route4Me | Plans efficient delivery routes with constraints |
| Proof of Delivery | DispatchTrack, custom mobile app | Photo capture, digital signature, GPS stamp |
| AR Automation | Billtrust, Bill360, Gaviti | Invoice delivery, payment reminders, cash application |
| Document Tracking | PandaDoc, DocuSign | Track when customers open/view quotes |
| Construction Takeoff | WTS Paradigm, PlanSwift | Read blueprints and generate material lists |

---

## COMPLETE END-TO-END TIMELINE

### Scenario: $500K Multi-Material Order

```
DAY 1 (Monday):
  08:15  Customer emails RFQ with BOM (47 line items, 12 product categories)
  08:17  System auto-ingests, assigns to Inside Sales Rep (Sarah)
  08:18  Auto-acknowledgment sent to customer
  08:30  Sarah reviews BOM, identifies 15 stock items (pricing known)
         and 32 items requiring supplier quotes
  08:45  Sarah creates internal sourcing request for procurement
  09:00  Procurement (Mike) receives request, maps items to suppliers
  09:30  Mike sends RFQs to 8 suppliers covering all 32 items
  11:00  First 2 supplier responses come in (stock items, quick pricing)
  14:00  3 more suppliers respond
  17:00  Mike follows up with 3 non-responsive suppliers by phone

DAY 2 (Tuesday):
  09:00  Remaining 3 suppliers respond (all 8 now quoted)
  10:00  Mike normalizes all quotes, builds comparison matrix
  11:00  Mike selects best suppliers per item, confirms availability
  11:30  Mike sends cost package to Sarah with margin recommendations
  12:00  Sarah builds customer quote:
         - Applies 20% standard margin to commodity items
         - Applies 25% margin to specialty items
         - Total quote: $520,000
  12:30  System checks: margin within Sarah's authority for 42 items,
         3 items below threshold --> auto-routes to Sales Manager
  13:00  Sales Manager approves discounted items
  13:15  Quote document auto-generated (branded PDF with all line items)
  13:30  Sarah reviews, adds personal note, sends to customer via email
  13:31  Quote tracking shows customer opened email at 13:45

DAY 3 (Wednesday):
  10:00  Auto follow-up reminder sent to customer
  14:00  Customer calls Sarah with questions about 3 line items
  14:30  Sarah clarifies specs, sends updated quote (minor changes)

DAY 5 (Friday):
  09:00  Customer sends signed quote acceptance + PO
  09:15  Sarah converts quote to sales order in ERP
  09:20  System auto-generates 4 supplier POs (grouped by supplier)
  09:30  Procurement sends POs to suppliers
  10:00  Credit check passes (existing customer, good history)
  10:15  Order confirmation sent to customer

DAYS 6-15 (Next 2 weeks):
  Procurement tracks supplier production/shipping
  Partial shipments arrive at warehouse on days 8, 10, 13
  Warehouse receives, inspects, stages for delivery

DAY 12:
  First partial delivery (60% of order) shipped to customer
  Delivery confirmed with photos + signature
  Partial invoice generated: $312,000

DAY 16:
  Remaining 40% delivered
  Final invoice: $208,000
  Customer notified of payment terms (Net 30)

DAY 46 (30 days after first invoice):
  First payment due
  Auto-reminder sent at Day 39
  Wire transfer received Day 44: $312,000
  AR clerk matches wire to invoice, posts payment

DAY 52 (30 days after second invoice):
  Second payment due
  Wire transfer received Day 50: $208,000
  AR clerk matches wire to invoice, posts payment
  ORDER COMPLETE
```

---

## KEY PERFORMANCE INDICATORS (KPIs) TO TRACK

| KPI | Target | Measured By |
|-----|--------|-------------|
| RFQ acknowledgment time | < 15 minutes | CRM timestamp |
| Quote turnaround (simple) | < 4 hours | CRM: RFQ received to quote sent |
| Quote turnaround (complex) | < 48 hours | CRM: RFQ received to quote sent |
| Quote conversion rate | > 30% | Quotes won / quotes sent |
| Average margin achieved | 18-22% | Finance reporting |
| On-time delivery rate | > 95% | Dispatch system |
| Invoice accuracy rate | > 99% | Credit memo ratio |
| Days Sales Outstanding (DSO) | < 45 days | AR aging report |
| Supplier response rate | > 90% within 48 hrs | Procurement tracking |
| Customer satisfaction (NPS) | > 50 | Customer survey |

---

## Sources

- [5 Mistakes Distributors Make When Quoting | Osmos](https://www.osmoscloud.com/blog/5-mistakes-distributors-make-when-quoting/)
- [RFQ Process: What Happens After a BOM Hits Your Inbox](https://www.elisaindustriq.com/resources/blog/rfq-process)
- [AI in Distribution: How Quoting and Takeoffs Are Transforming Wholesale | Distro](https://distro.app/blog/ai-in-distribution-how-quoting-and-takeoffs-automation-are-transforming-wholesale)
- [Eliminating Manual RFQ Processing for Distributors | SETVI](https://www.setvi.com/blogs/auto-rfq-eliminating-manual-rfq-processing-for-distributors-manufacturers)
- [Self-Service RFQ Software For B2B Manufacturers | Zoovu](https://zoovu.com/rfq-software)
- [RFQ Management: How to Handle Requests for Quotation Efficiently | SiftHub](https://www.sifthub.io/blog/rfq-management)
- [The Request for Quotation Process in 6 Steps | Sievo](https://sievo.com/blog/the-simple-request-for-quotation-rfq-process-for-procurement)
- [RFQ in Direct Materials Procurement: A Strategic Guide | LightSource](https://lightsource.ai/blog/rfq-in-procurement)
- [Epicor Prophet 21 ERP for Distributors | B2Sell](https://www.b2sell.com/blog/epicor-prophet-21-erp-for-distributors)
- [Epicor Prophet 21 | Epicor](https://www.epicor.com/en-us/products/enterprise-resource-planning-erp/prophet-21/)
- [SAP Business One for Wholesale Distribution | Zyple](https://www.zyplesoft.com/wholesale/)
- [The Role of SAP B1 in Procurement for Wholesale Distributors | Michell Consulting](https://michellgroup.com/blog/the-role-of-sap-business-one-in-streamlining-the-procurement-process-for-wholesale-distributors/)
- [Odoo ERP Automates Distribution Companies | Bista Solutions](https://www.bistasolutions.com/resources/blogs/how-odoo-erp-solution-automates-distribution-companies-key-modules-for-2025/)
- [NetSuite vs Epicor 2025 | EC Solutions](https://www.e-c-solutions.com/en/netsuite-vs-epicor/)
- [Optimizing Building Materials Delivery | Descartes](https://www.descartes.com/resources/knowledge-center/whats-helping-building-supply-distributors-improve-delivery)
- [Construction Material Delivery to Site | Mercer Transportation](https://mercer-trans.com/2025/05/27/how-to-get-construction-material-to-site/)
- [Dispatch Tech for Delivery Wins | Curri](https://www.curri.com/article/delivery-dispatch-systems)
- [Dispatch Application for Building Supplies | DispatchTrack](https://www.dispatchtrack.com/blog/dispatch-application/)
- [QuoteToMe: Construction Procurement Software](https://quotetome.com/)
- [Why Builders FirstSource Spent $450M on Software | MDM](https://www.mdm.com/article/featured/featured-blog/why-did-builders-firstsource-spend-450-million-on-a-software-company/)
- [Ferguson Enterprises Digital Transformation | AppsRunTheWorld](https://www.appsruntheworld.com/customers-database/customers/view/ferguson-enterprises-usa)
- [Builders FirstSource Software Purchases | AppsRunTheWorld](https://www.appsruntheworld.com/customers-database/customers/view/builders-firstsource-inc-united-states)
- [Building Materials: Keys to Outperformance | McKinsey](https://www.mckinsey.com/industries/engineering-construction-and-building-materials/our-insights/building-materials-understanding-the-keys-to-outperformance)
- [Strategic Pricing in Industrial Distribution | MDM](https://www.mdm.com/article/top-distributor-sectors/building-materials-construction/the-power-of-strategic-pricing-in-industrial-distribution/)
- [RFQ Automation in Manufacturing | Markovate](https://markovate.com/rfq-automation/)
- [Streamlining RFQ Process with Automation | Iris AI](https://www.heyiris.ai/blog/streamlining-your-rfq-process-with-automation)
- [How to Build a Killer Inside Sales Team | NAW](https://www.naw.org/how-to-build-a-killer-inside-sales-team-leveraging-the-power-of-ai-20/)
- [CPQ Approval Process | Cflow](https://www.cflowapps.com/cpq-approval-process/)
- [Quote Approval | DealHub](https://dealhub.io/glossary/quote-approval/)
- [Accounts Receivable Aging Report | QuickBooks](https://quickbooks.intuit.com/r/payments/accounts-receivable-aging-report/)
- [AR Reconciliation: Steps & Best Practices | Numeric](https://www.numeric.io/blog/accounts-receivable-reconciliation)
- [Past Due vs Overdue: 30-Day Threshold | Southwest Recovery](https://www.swrecovery.com/resources/blog/past-due-vs-overdue-balances-the-30-day-threshold-for-collection-escalation/)
- [B2B Payment Methods Ranking | Quadient](https://www.quadient.com/en/blog/definitive-ranking-b2b-payment-methods)
- [Accounts Receivable Bookkeeping | Billtrust](https://www.billtrust.com/resources/blog/understanding-accounts-receivable-bookkeeping)
