> ⚠️ **REFERENCE DOCUMENT — NOT THE SOURCE OF TRUTH**
> This file was written during the research phase and may contain outdated decisions, US-centric references, or superseded technical choices.
> **Always defer to `essential/RESEARCH.md` for current decisions.**
> Key changes since this file was written: TanStack Start (not Next.js), Capacitor (not Expo), React Aria (not shadcn), Egyptian law (not US FMCSA), EGP (not USD), dual auth pools, no online payments, no mobile wallets, spatial glass UI (not traditional dashboards).

# RESEARCH: Complete Roles, Departments & Responsibilities
## Quote-Based B2B Building Materials Distributor

**Date:** 2026-03-28
**Context:** Company sources from external suppliers, sells to construction companies. No inventory held initially (made-to-order/sourced per deal). No published prices. Orders $100K-$100M+. Uses Customer Portal (PWA), Supplier Portal, and Internal Apps.

**Companion Document:** See also `RESEARCH-Internal-Operations-Org-Structure.md` for the complete order lifecycle, module map, KPIs, and scaling guide.

---

## TABLE OF CONTENTS

1. [Every Role Needed and What They Do](#1-every-role-needed-and-what-they-do)
2. [Sales Department Deep Dive](#2-sales-department-deep-dive)
3. [Procurement Department Deep Dive](#3-procurement-department-deep-dive)
4. [Operations Department Deep Dive](#4-operations-department-deep-dive)
5. [Finance Department Deep Dive](#5-finance-department-deep-dive)
6. [Dispatch and Delivery Deep Dive](#6-dispatch-and-delivery-deep-dive)
7. [Customer Service Deep Dive](#7-customer-service-deep-dive)
8. [IT / Tech Team Deep Dive](#8-it--tech-team-deep-dive)
9. [Minimum Viable Team at Different Stages](#9-minimum-viable-team-at-different-stages)
10. [How Roles Interact with Each App](#10-how-roles-interact-with-each-app)
11. [Communication Flows Between Departments](#11-communication-flows-between-departments)

---

## 1. EVERY ROLE NEEDED AND WHAT THEY DO

### COMPLETE ROLE CATALOG

Below is every role a quote-based B2B building materials distributor needs, from founding through enterprise scale. Roles are grouped by department with full detail on daily tasks, app usage, decisions, reporting lines, communication, and KPIs.

---

### 1.1 EXECUTIVE LEADERSHIP

#### CEO / General Manager

| Field | Detail |
|---|---|
| **Department** | Executive |
| **Reports To** | Board of Directors / Ownership |
| **Direct Reports** | COO, CFO, VP Sales, VP Supply Chain, CIO, CHRO, CLO |
| **Daily Tasks** | Review overnight alerts and financial dashboard (7:30am). Morning standup with department heads (8:00am). Approve high-value quotes above $2M threshold. Meet key customers and suppliers for strategic relationships. Review P&L, cash flow, and margin analysis. Make hiring/organizational decisions. Set pricing strategy and margin targets. Evaluate market expansion opportunities. |
| **Primary App/Screen** | CEO Dashboard App -- real-time KPIs across all departments: revenue, margin, pipeline, AR aging, on-time delivery, cash flow. Quote approval queue for high-value deals. |
| **Key Decisions** | Final quote approval (high value), credit policy, major supplier partnerships, pricing strategy, capital allocation (fleet, warehouse, technology), hiring, market expansion |
| **Communicates With (Internal)** | All department heads daily. Sales Manager on deal strategy. Finance on cash flow. Operations on capacity. |
| **Communicates With (External)** | Key customers (relationship building), strategic suppliers (partnership negotiation), bankers, investors, industry associations |
| **KPIs** | Revenue growth (10-25% YoY), gross margin (15-25%), net profit margin (3-8%), operating expense ratio (<15-20% of revenue), revenue per employee (>$800K-$1M+), customer NPS (>50), employee retention (>85%) |

#### COO (Chief Operating Officer)

| Field | Detail |
|---|---|
| **Department** | Executive |
| **Reports To** | CEO |
| **Direct Reports** | Operations Manager, Warehouse Manager, Logistics Manager, Fleet Manager, CS Manager |
| **Daily Tasks** | Review delivery performance dashboard. Morning ops standup to identify exceptions. Review capacity utilization across warehouse and fleet. Resolve escalated operational issues. Coordinate cross-departmental workflow improvements. Evaluate vendor and carrier performance. Lead weekly operational reviews. |
| **Primary App/Screen** | Internal Operations App -- operations dashboard showing today's deliveries, inbound expected, warehouse capacity, fleet utilization, exceptions |
| **Key Decisions** | Warehouse expansion/new locations, fleet vs. third-party carrier strategy, operational process changes, technology investments for operations, staffing levels |
| **Communicates With** | Operations team (daily), Sales VP (delivery commitments), CFO (capital expenditures), suppliers (major delivery issues) |
| **KPIs** | OTIF delivery rate (>95%), warehouse throughput, fleet utilization (>75%), operational cost as % of revenue, order fill rate (>97%) |

#### CFO (Chief Financial Officer)

| Field | Detail |
|---|---|
| **Department** | Executive / Finance |
| **Reports To** | CEO |
| **Direct Reports** | Controller, Credit Manager, AR Manager, AP Manager |
| **Daily Tasks** | Review cash position and cash flow forecast. Review AR aging summary. Approve large payments to suppliers. Review credit decisions for high-exposure accounts. Monthly P&L review and variance analysis. Manage banking relationships. Oversee financial reporting and compliance. |
| **Primary App/Screen** | Internal Finance App -- financial dashboard (cash flow, DSO, AR aging, margin realization, AP due), CEO App for cross-departmental financial view |
| **Key Decisions** | Credit policy, payment terms strategy, supplier payment prioritization, capital allocation, banking/financing arrangements, financial controls |
| **Communicates With** | Credit Manager (daily on high-risk accounts), Controller (reporting), CEO (strategy), banks and financial institutions, auditors |
| **KPIs** | DSO (35-55 days), cash conversion cycle, bad debt (<0.5% of revenue), working capital efficiency, AP utilization of early pay discounts |

---

### 1.2 SALES DEPARTMENT

#### VP of Sales / Sales Director

| Field | Detail |
|---|---|
| **Department** | Sales |
| **Reports To** | CEO |
| **Direct Reports** | Sales Managers, Business Development Manager |
| **Daily Tasks** | Review team pipeline in CRM. Participate in high-value quote approvals ($500K-$2M). Coach sales reps on deal strategy. Set territory assignments and quotas. Lead weekly pipeline review meetings. Analyze win/loss data. Develop pricing strategy with CEO. Manage key account relationships. |
| **Primary App/Screen** | Internal Sales App -- pipeline dashboard, team performance metrics, quote approval queue, CRM |
| **Key Decisions** | Pricing strategy, territory assignments, quote approval ($500K-$2M range), discount authorization, hiring decisions for sales team |
| **Communicates With** | Sales Managers (daily), CEO (strategy), Procurement Director (supplier strategy), CFO (margin targets) |
| **KPIs** | Team revenue vs. quota, pipeline coverage ratio (3-4x), quote-to-order conversion (25-40%), average margin across team, new customer acquisition rate |

#### Sales Manager

| Field | Detail |
|---|---|
| **Department** | Sales |
| **Reports To** | VP of Sales |
| **Direct Reports** | Account Managers (Outside Sales), Inside Sales Reps, Quoting Specialists |
| **Daily Tasks** | Morning review of all pending quotes and their status. Approve quotes in $100K-$500K range. Coach reps on active deals. Join customer calls for major negotiations. Review daily sales activity metrics. Resolve pricing disputes between Sales and Procurement. Weekly 1:1s with each rep. Monthly territory reviews. |
| **Primary App/Screen** | Internal Sales App -- team quote queue, margin analysis per deal, pipeline visualization, rep activity feed |
| **Key Decisions** | Quote approval ($100K-$500K), margin exceptions within guidelines, deal prioritization, rep performance issues, customer escalation handling |
| **Communicates With** | Sales Reps (continuously), Procurement Manager (cost updates), Credit Manager (credit decisions affecting deals), VP Sales (escalations), customers (major negotiations) |
| **KPIs** | Team conversion rate, team revenue, average margin per deal, quote turnaround time, rep productivity |

#### Account Manager (Outside Sales)

| Field | Detail |
|---|---|
| **Department** | Sales |
| **Reports To** | Sales Manager |
| **Daily Tasks** | 7:30am: Review overnight emails, new RFQs, customer messages. 8:00-9:00: Check order status for key accounts. 9:00-10:30: Work on active quotes (build pricing, calculate margins). 10:30-12:00: Customer calls to follow up on pending quotes. 1:00-3:00: Customer site visits and meetings. 3:00-4:00: Coordinate with Procurement on supplier pricing. 4:00-5:00: Update CRM pipeline, send end-of-day quotes. |
| **Primary App/Screen** | Internal Sales App (CRM, Quote Builder, Order Management), Customer Portal (to see what customer sees), Mobile app for field access |
| **Key Decisions** | Which RFQs to prioritize, margin levels within guidelines, when to escalate for approval, how aggressively to negotiate, which issues to resolve vs. delegate |
| **Communicates With** | Customers (daily, primary relationship), Procurement (sourcing requests), Inside Sales (handoff of admin tasks), CS team (customer issues), Sales Manager (approvals) |
| **KPIs** | Revenue per territory, quote-to-order conversion (30-50% by value), number of active quotes (15-30), customer retention (>85%), new accounts (2-5/quarter), average deal size, gross margin per deal (12-25%) |

#### Inside Sales Representative

| Field | Detail |
|---|---|
| **Department** | Sales |
| **Reports To** | Sales Manager |
| **Daily Tasks** | Monitor Customer Portal for new material list submissions and AI chat escalations. Process inbound quote requests (phone, email, portal). Enter and structure RFQs in the system. Coordinate with Procurement for supplier costing. Build initial quote documents using the Quote Builder. Handle re-quotes and quote revisions. Manage smaller accounts directly (under threshold). Support Account Managers with admin and follow-up. Handle inbound calls from existing customers about pricing. |
| **Primary App/Screen** | Internal Sales App -- RFQ inbox (from Customer Portal + email + phone), Quote Builder, CRM activity feed |
| **Key Decisions** | Qualify inbound leads (real opportunity vs. tire-kicker), prioritize quote requests by urgency and value, apply standard margin rules, when to push to Account Manager vs. handle directly |
| **Communicates With** | Customers (inbound inquiries), Account Managers (handoffs), Procurement (sourcing requests), CS team (order status questions that come through sales) |
| **KPIs** | Quotes processed per day (8-15), quote turnaround time (<48 hrs standard, <24 hrs urgent), inbound conversion rate, average quote value, accuracy (re-quote rate) |

#### Quoting Specialist

| Field | Detail |
|---|---|
| **Department** | Sales |
| **Reports To** | Sales Manager |
| **Daily Tasks** | Receive costed BOMs from Procurement. Apply margin rules per product category, customer tier, and order size. Build formal quote documents with line-item pricing. Calculate freight and delivery costs. Manage quote versioning (V1, V2, V3 for revisions). Format and generate professional quote PDFs. Route quotes through approval workflow. Track quote expiration dates. Maintain pricing databases and margin templates. |
| **Primary App/Screen** | Internal Sales App -- Quote Builder (primary tool), margin calculator, document generation |
| **Key Decisions** | Margin application within rules (which tier to apply), identifying pricing anomalies, flagging below-margin-floor deals for manager review |
| **Communicates With** | Inside Sales and Account Managers (receive costing, deliver formatted quotes), Procurement (cost clarification), Sales Manager (approval routing) |
| **KPIs** | Quotes produced per day, accuracy rate (errors requiring correction), turnaround time from costing to formatted quote, margin calculation accuracy |

#### Business Development Representative (BDR)

| Field | Detail |
|---|---|
| **Department** | Sales |
| **Reports To** | VP Sales or Sales Manager |
| **Daily Tasks** | Research and identify prospective construction companies. Cold outreach via phone, email, LinkedIn. Qualify leads against ideal customer profile. Schedule introductory meetings for Account Managers. Attend industry events and trade shows. Monitor construction project databases for new opportunities. Track outreach activity in CRM. |
| **Primary App/Screen** | Internal Sales App -- CRM prospecting module, lead tracking, activity logging |
| **Key Decisions** | Which prospects to target, when a lead is qualified enough to hand off to Account Manager, outreach strategy |
| **Communicates With** | Account Managers (qualified lead handoff), Sales Manager (pipeline building), Marketing (content and events) |
| **KPIs** | Qualified meetings set per week (8-15), outbound activities per day (50-80 touches), lead-to-meeting conversion, pipeline generated |

---

### 1.3 PROCUREMENT DEPARTMENT

#### Director of Procurement / VP Supply Chain

| Field | Detail |
|---|---|
| **Department** | Procurement |
| **Reports To** | CEO or COO |
| **Direct Reports** | Category Managers, Buyers, Vendor Relations Manager |
| **Daily Tasks** | Review procurement dashboard for bottlenecks. Approve high-value POs (>$250K). Negotiate strategic supplier agreements. Evaluate new supplier onboarding. Monitor material market trends and price movements. Weekly review of supplier scorecards. Monthly vendor business reviews. |
| **Primary App/Screen** | Internal Procurement App -- procurement dashboard, supplier scorecards, cost trend analytics, PO approval queue |
| **Key Decisions** | Strategic supplier selection, long-term supply agreements, pricing strategy with key suppliers, new supplier qualification, inventory strategy (when to stock vs. source per deal) |
| **Communicates With** | Buyers and Category Managers (daily), VP Sales (cost implications for pricing), CFO (payment terms negotiation), CEO (strategic supplier partnerships), Suppliers (executive-level relationships) |
| **KPIs** | Total cost savings vs. benchmark (3-8% YoY improvement), supplier on-time delivery (>90%), supplier quality/reject rate (<2%), supplier base health |

#### Category Manager

| Field | Detail |
|---|---|
| **Department** | Procurement |
| **Reports To** | Director of Procurement |
| **Daily Tasks** | Monitor market pricing for assigned product categories (e.g., structural steel, concrete, lumber, MEP). Analyze cost trends and forecast price movements. Develop and maintain preferred supplier lists per category. Negotiate annual pricing agreements with key suppliers. Evaluate supplier performance within category. Identify alternative products and suppliers for cost savings. Coordinate with Sales on product availability and lead times. Update category strategy documentation. |
| **Primary App/Screen** | Internal Procurement App -- category analytics, supplier comparison matrix, market price tracking, Supplier Portal (monitor supplier catalogs and pricing) |
| **Key Decisions** | Which suppliers to qualify per category, when to renegotiate agreements, product substitution recommendations, single-source vs. multi-source strategy |
| **Communicates With** | Buyers (execution of category strategy), Suppliers (strategic negotiations), Sales team (product expertise, availability guidance), Director of Procurement (strategy alignment) |
| **KPIs** | Category cost savings (% YoY), supplier performance within category, number of qualified suppliers per category (2-4 preferred), lead time improvement, price competitiveness vs. market |

#### Buyer / Procurement Officer

| Field | Detail |
|---|---|
| **Department** | Procurement |
| **Reports To** | Director of Procurement or Category Manager |
| **Daily Tasks** | 7:30-8:00: Review new sourcing requests from Sales. 8:00-9:30: Send RFQs to suppliers through Supplier Portal and email. 9:30-10:30: Evaluate received supplier quotes, compare pricing in comparison matrix. 10:30-11:30: Generate Purchase Orders for confirmed sales orders. 11:30-12:00: Track open POs, confirm supplier acknowledgments and delivery dates. 1:00-2:30: Supplier calls to negotiate pricing and resolve delivery issues. 2:30-3:30: Coordinate with Warehouse/Operations on expected inbound deliveries. 3:30-4:30: Update cost sheets, analyze price trends. 4:30-5:00: Update supplier scorecards. |
| **Primary App/Screen** | Internal Procurement App -- sourcing request inbox, supplier RFQ management, quote comparison matrix, PO generation and tracking. Also uses Supplier Portal to view supplier catalogs, stock levels, and pricing. |
| **Key Decisions** | Which suppliers to solicit for each order, best-value supplier selection per line item (not just lowest price), when to negotiate harder vs. accept, whether to consolidate orders for volume discounts, accept supplier substitutions or not |
| **Communicates With** | Sales Reps (receive sourcing requests, provide cost sheets), Suppliers (daily -- RFQs, negotiations, PO management), Warehouse (inbound delivery coordination), Finance/AP (supplier invoice matching), Category Manager (category strategy alignment) |
| **KPIs** | Supplier response time (<24 hrs standard), cost savings vs. benchmark, PO cycle time (<4 hrs for standard), supplier on-time delivery, number of quotes obtained per sourcing request (min 2-3) |

#### Vendor Relations Manager

| Field | Detail |
|---|---|
| **Department** | Procurement |
| **Reports To** | Director of Procurement |
| **Daily Tasks** | Manage Supplier Portal onboarding for new suppliers. Train suppliers on portal usage (catalog upload, pricing updates, order management). Resolve supplier portal issues. Track supplier performance metrics. Coordinate quarterly business reviews with key suppliers. Manage supplier documentation (certificates, insurance, W-9s). Handle supplier disputes and claims for damaged/defective goods. |
| **Primary App/Screen** | Supplier Portal (admin view), Internal Procurement App -- supplier scorecards and performance analytics |
| **Key Decisions** | Supplier qualification (approve/reject), supplier tier classification, escalation of supplier performance issues |
| **Communicates With** | Suppliers (primary contact for relationship and portal issues), Buyers (supplier performance data), Category Managers (supplier strategy), Operations (supplier delivery issues) |
| **KPIs** | Supplier portal adoption rate, supplier satisfaction scores, number of active/qualified suppliers, dispute resolution time |

---

### 1.4 OPERATIONS DEPARTMENT

#### Operations Manager

| Field | Detail |
|---|---|
| **Department** | Operations |
| **Reports To** | COO or CEO |
| **Direct Reports** | Warehouse Manager, Logistics Coordinator, Dispatcher |
| **Daily Tasks** | 6:00-7:00: Review day's inbound and outbound schedule. 7:00-9:00: Morning operations standup with warehouse and logistics team. 9:00-11:00: Handle exceptions (supplier delays, customer reschedules, capacity issues). 11:00-12:00: Review delivery performance metrics. 1:00-3:00: Coordinate with Sales on upcoming large orders needing special handling. 3:00-4:00: Plan next-day operations. 4:00-5:00: Review staffing needs and operational costs. |
| **Primary App/Screen** | Internal Operations App -- operations dashboard (today's deliveries, inbound expected, exceptions, capacity utilization) |
| **Key Decisions** | Delivery priority when capacity is constrained, carrier selection (own fleet vs. third-party), staffing adjustments, exception handling strategy, warehouse layout/process changes |
| **Communicates With** | Warehouse team (daily), Logistics/Dispatch (daily), Sales (delivery commitments), Procurement (inbound coordination), COO (escalations) |
| **KPIs** | OTIF (>95%), order fill rate (>97%), operational cost per order, damage rate (<0.5%), throughput volume |

#### Warehouse Manager

| Field | Detail |
|---|---|
| **Department** | Operations |
| **Reports To** | Operations Manager |
| **Direct Reports** | Warehouse Workers |
| **Daily Tasks** | 6:00-6:30: Review expected inbound/outbound. 6:30-8:00: Supervise receiving and inspection. 8:00-9:30: Direct picking and staging for outbound. 9:30-10:30: Walk floor for safety and organization. 10:30-11:30: Handle discrepancies (damaged goods, count variances). 1:00-2:30: Process afternoon receiving. 2:30-3:30: Cycle counting and inventory reconciliation. 3:30-5:00: Prepare for next day, pre-stage orders. |
| **Primary App/Screen** | Internal Operations App -- WMS module (inventory levels, receiving queue, pick lists, cycle count) |
| **Key Decisions** | Accept/reject inbound shipments, warehouse layout optimization, staff allocation, inventory accuracy remediation, safety compliance |
| **Communicates With** | Warehouse Workers (direction), Logistics Coordinator (outbound readiness), Procurement (receiving discrepancies), Operations Manager (reporting) |
| **KPIs** | Inventory accuracy (>99%), picking accuracy (>99.5%), receiving turnaround (same day), damage rate in warehouse, orders processed per labor hour |

#### Warehouse Worker

| Field | Detail |
|---|---|
| **Department** | Operations |
| **Reports To** | Warehouse Manager |
| **Daily Tasks** | Receive and inspect inbound shipments (check quantity, quality, specs vs. PO). Scan items into inventory system. Put away materials in designated locations. Pick orders from inventory per pick lists. Stage materials for outbound delivery. Load trucks. Perform cycle counts when assigned. Maintain clean and safe work area. Report damages or discrepancies. |
| **Primary App/Screen** | Internal Operations App -- mobile/tablet WMS interface (scan to receive, pick list, location lookup) |
| **Key Decisions** | Flag quality issues on receipt, report discrepancies, safety judgment calls |
| **Communicates With** | Warehouse Manager (tasks, issues), other Warehouse Workers (coordination), Drivers (loading) |
| **KPIs** | Units processed per hour, picking accuracy, damage incidents, safety compliance |

#### Logistics Coordinator

| Field | Detail |
|---|---|
| **Department** | Operations |
| **Reports To** | Operations Manager |
| **Daily Tasks** | Plan delivery schedule based on customer requirements and supplier lead times. Arrange third-party carriers for shipments (get quotes, book, track). Coordinate with customers on site delivery requirements (crane access, site hours, offloading). Track all in-transit shipments (both inbound from suppliers and outbound to customers). Handle delivery exceptions (delays, reschedules). Generate shipping documentation. Update delivery status in system for Sales and Customer Service visibility. |
| **Primary App/Screen** | Internal Operations App -- delivery calendar, carrier management, shipment tracking, TMS module |
| **Key Decisions** | Carrier selection and rate negotiation, route optimization, delivery priority, how to handle exceptions (partial delivery, reschedule) |
| **Communicates With** | Third-party carriers (booking, tracking), Customers (delivery coordination), Sales Reps (delivery status updates), Procurement (inbound tracking from suppliers), Dispatcher (if own fleet) |
| **KPIs** | On-time delivery rate, freight cost per order, carrier performance, delivery exception rate, customer delivery satisfaction |

#### Dispatcher

| Field | Detail |
|---|---|
| **Department** | Operations |
| **Reports To** | Operations Manager or Fleet Manager |
| **Daily Tasks** | 5:30-6:30: Plan routes, assign drivers to deliveries based on load, location, vehicle type. 6:30-7:30: Pre-trip briefing with drivers, distribute delivery tickets. 7:30-12:00: Monitor live deliveries via GPS, handle exceptions, communicate with drivers and customers. 1:00-3:00: Process completed PODs, coordinate afternoon deliveries. 3:00-4:00: Coordinate next-day staging with Warehouse. 4:00-5:00: Review fleet utilization, maintenance needs, driver hours. |
| **Primary App/Screen** | Internal Operations App -- dispatch module (route planner, GPS tracking, driver assignment), Driver App (communication) |
| **Key Decisions** | Route assignments, driver-to-delivery matching, real-time rerouting, vehicle maintenance scheduling, when to engage third-party carriers |
| **Communicates With** | Drivers (continuous via app), Customers (delivery windows), Warehouse (staging coordination), Sales (delivery status), Logistics Coordinator (carrier coordination) |
| **KPIs** | Fleet utilization (>75%), on-time delivery (>95%), cost per delivery, driver productivity (deliveries per day), fuel efficiency |

#### Driver

| Field | Detail |
|---|---|
| **Department** | Operations |
| **Reports To** | Dispatcher / Fleet Manager |
| **Daily Tasks** | Pre-trip vehicle inspection. Receive delivery assignments via Driver App. Load or verify load. Follow optimized route. Deliver materials to construction sites. Capture proof of delivery (photo + digital signature). Note any damages, shortages, or delivery issues on POD. Return to base or proceed to next delivery. End-of-day vehicle check. |
| **Primary App/Screen** | Driver App -- delivery assignments, navigation, POD capture (photo + signature), status updates, communication with dispatch |
| **Key Decisions** | Safe delivery approach at construction sites, flagging site issues, load security, route adjustments |
| **Communicates With** | Dispatcher (continuous via app), Customers (on-site delivery coordination), Warehouse (loading) |
| **KPIs** | Deliveries per day, on-time rate, POD completeness, damage claims, safety incidents, fuel efficiency |

---

### 1.5 FINANCE DEPARTMENT

#### Controller

| Field | Detail |
|---|---|
| **Department** | Finance |
| **Reports To** | CFO |
| **Direct Reports** | AR Manager, AP Manager, Staff Accountant |
| **Daily Tasks** | Review daily financial summary. Oversee month-end close process. Review and approve journal entries. Ensure compliance with accounting standards. Prepare financial statements. Review margin analysis (quoted vs. realized). Manage tax compliance and filings. Coordinate with external auditors. Review cost allocations. |
| **Primary App/Screen** | Internal Finance App -- general ledger, financial reporting, margin analysis, P&L by customer/project/category |
| **Key Decisions** | Accounting policy, revenue recognition timing, expense capitalization, financial control procedures |
| **Communicates With** | CFO (reporting), AR/AP managers (daily), External auditors, Tax advisors |
| **KPIs** | Financial close timeliness, reporting accuracy, audit findings, margin realization vs. quoted |

#### AR Manager / AR Clerk

| Field | Detail |
|---|---|
| **Department** | Finance |
| **Reports To** | Controller or Finance Manager |
| **Daily Tasks** | 8:00-9:00: Process previous day's delivery confirmations into invoices (auto-generated from POD). 9:00-10:00: Post incoming payments -- wire transfers (check bank portal), checks (record deposits), LC draws (process with bank). Apply payments to correct invoices. 10:00-11:00: Review AR aging report, identify accounts at 30/60/90+ days overdue. 11:00-12:00: Send payment reminders to overdue accounts (automated + manual calls for large amounts). 1:00-2:00: Handle billing disputes -- investigate pricing discrepancies, short payments, deductions. 2:00-3:00: Process credit memos for approved returns/adjustments. 3:00-4:00: Reconcile customer accounts. 4:00-5:00: Prepare daily cash receipts summary. |
| **Primary App/Screen** | Internal Finance App -- AR module (aging report, payment application, invoice generation), banking portal for wire/check verification |
| **Key Decisions** | Payment application (which invoice a payment applies to), when to escalate overdue accounts to Credit Manager, credit memo processing within authority |
| **Communicates With** | Credit Manager (overdue accounts), Sales Reps (billing disputes involving their customers), Customers (payment inquiries, reminders), Controller (reporting), Operations (POD verification for invoicing) |
| **KPIs** | Invoice turnaround time (<24 hrs after delivery), payment application accuracy (>99%), DSO tracking, AR aging distribution (>80% current), collection call completion rate |

#### AP Manager / AP Clerk

| Field | Detail |
|---|---|
| **Department** | Finance |
| **Reports To** | Controller or Finance Manager |
| **Daily Tasks** | 8:00-9:00: Receive and log supplier invoices. 9:00-10:30: Perform three-way match -- compare supplier invoice against PO and receiving report. Flag discrepancies. 10:30-11:30: Process approved invoices for payment scheduling per terms (Net 30, Net 60). 11:30-12:00: Identify early payment discount opportunities. 1:00-2:00: Process payment runs (wire transfers, checks). 2:00-3:00: Resolve supplier invoice discrepancies with Procurement. 3:00-4:00: Reconcile supplier statements. 4:00-5:00: Update AP aging report, forecast upcoming payment obligations. |
| **Primary App/Screen** | Internal Finance App -- AP module (invoice matching, payment scheduling, supplier ledger), banking portal for payment execution |
| **Key Decisions** | Approve matched invoices for payment, flag discrepancies for investigation, prioritize payments when cash is tight, take or decline early payment discounts |
| **Communicates With** | Procurement/Buyers (invoice discrepancies, PO matching), Suppliers (payment inquiries), CFO/Controller (payment prioritization when cash constrained), Warehouse (receiving verification) |
| **KPIs** | Invoice processing time, three-way match rate (% auto-matched), payment accuracy, early payment discount capture rate (>80% when beneficial), AP aging management |

#### Credit Manager

| Field | Detail |
|---|---|
| **Department** | Finance |
| **Reports To** | CFO or Controller |
| **Direct Reports** | Credit Analyst(s) at scale |
| **Daily Tasks** | 8:00-9:00: Review new credit applications (pull D&B reports, verify references, review financial statements). 9:00-10:30: Perform credit analysis -- analyze personal guarantees, verify with Secretary of State, review account open length, calculate average days to pay. 10:30-11:30: Review orders on credit hold, make release/hold decisions. 11:30-12:00: Communicate credit decisions to Sales. 1:00-2:30: Contact overdue customers, negotiate payment plans. 2:30-3:30: Review letter of credit documents. 3:30-4:30: Update credit files, review portfolio risk exposure. 4:30-5:00: Report credit metrics, flag high-risk accounts. Enter new jobs, verify appraisal district owner info, confirm general contractors, locate bond documentation. |
| **Primary App/Screen** | Internal Finance App -- credit management module (applications, credit limits, exposure dashboard, credit hold queue), D&B integration |
| **Key Decisions** | Approve/deny credit applications, set credit limits per customer, determine payment terms (prepay, COD, Net 30/60/90, LC required), release or hold orders exceeding limits, when to escalate to collections or legal, whether to require LC/payment bond/prepayment |
| **Communicates With** | Sales team (credit decisions affecting their deals -- monthly/weekly meetings with Sales to discuss AR status, lien filings, new customer info, risk of new jobs), Customers (collections, payment negotiations), CFO (policy and high-risk decisions), External credit agencies (D&B, trade references), Legal (collections escalation) |
| **KPIs** | Credit application turnaround (<48 hrs existing, <5 days new), bad debt write-offs (<0.3-0.5% of AR), credit hold release time (<4 hrs during business), portfolio concentration (no single customer >10% of AR), collection effectiveness index (>85%), delinquency rate 60+ days (<5% of AR) |

---

### 1.6 CUSTOMER SERVICE DEPARTMENT

#### CS Manager

| Field | Detail |
|---|---|
| **Department** | Customer Service |
| **Reports To** | COO or VP Sales |
| **Direct Reports** | CS Representatives, Claims/Returns Specialist |
| **Daily Tasks** | Review ticket queue and SLA compliance. Assign and prioritize escalated tickets. Monitor AI chat performance on Customer Portal (review escalated conversations). Train team on product knowledge and system updates. Analyze customer satisfaction trends. Coordinate with Sales and Operations on recurring issues. Develop knowledge base content for portal AI. |
| **Primary App/Screen** | Internal Operations App -- ticketing dashboard, SLA tracking, Customer Portal admin view (AI chat logs) |
| **Key Decisions** | Escalation routing, SLA exceptions, process improvements, when to credit vs. investigate, AI chatbot response quality |
| **Communicates With** | CS Reps (daily), Sales team (customer escalations), Operations (delivery issues), Finance (credit memos), Product/Tech team (portal AI improvements) |
| **KPIs** | Average resolution time, first-contact resolution rate, CSAT score, ticket volume trends, SLA compliance (>95%), AI deflection rate |

#### CS Representative

| Field | Detail |
|---|---|
| **Department** | Customer Service |
| **Reports To** | CS Manager |
| **Daily Tasks** | Handle inbound calls and emails: order status inquiries, delivery ETAs, pricing questions, complaint intake. Receive AI chat escalations from Customer Portal when the AI cannot resolve (complex questions, emotional customers, multi-step issues). Process returns and claims, coordinate with Warehouse and Sales. Follow up on open issues. Update customers on resolution status. Document issues and update knowledge base/FAQ. Log all interactions in CRM. |
| **Primary App/Screen** | Internal Operations App -- ticketing system, Customer Portal (view customer's perspective, take over AI chat sessions), order tracking view |
| **Key Decisions** | Issue urgency classification, when to involve Sales Rep vs. handle directly, when to issue replacement orders, routing complaints to appropriate department |
| **Communicates With** | Customers (primary), Sales Reps (their accounts' issues), Operations/Warehouse (delivery and quality issues), Finance (billing disputes) |
| **KPIs** | Tickets resolved per day, average resolution time, first-contact resolution rate, CSAT score, escalation rate |

#### Claims/Returns Specialist

| Field | Detail |
|---|---|
| **Department** | Customer Service |
| **Reports To** | CS Manager |
| **Daily Tasks** | Investigate quality complaints (wrong material, damaged, defective). Coordinate with Warehouse for physical inspection of returned goods. File claims against suppliers for defective/damaged materials. Process return authorizations. Track return shipments. Prepare credit memo requests. Maintain claims database and trend reporting. |
| **Primary App/Screen** | Internal Operations App -- claims/returns module, supplier claims tracking |
| **Key Decisions** | Whether to accept return, whether claim is valid, whether to file supplier claim, credit memo amounts |
| **Communicates With** | Customers (claim resolution), Warehouse (physical inspection), Procurement (supplier claims), Sales (customer impact), Finance (credit memos) |
| **KPIs** | Claim resolution time, claim acceptance rate, supplier claim recovery rate, return processing time |

---

### 1.7 IT / TECHNOLOGY DEPARTMENT

*(Detailed in Section 8)*

---

### 1.8 HR / ADMIN

#### HR Manager

| Field | Detail |
|---|---|
| **Department** | HR |
| **Reports To** | CEO or COO |
| **Daily Tasks** | Manage recruitment pipeline. Process new hire onboarding. Handle employee relations issues. Manage payroll and benefits administration. Ensure labor law compliance. Coordinate training programs. Performance review management. |
| **Primary App/Screen** | HRIS system, Admin Panel (user provisioning for internal apps) |
| **Key Decisions** | Hiring recommendations, compensation decisions (with management), policy enforcement, benefit selections |
| **Communicates With** | All department managers (hiring, performance), Finance/Payroll, External recruiters, Benefits providers |
| **KPIs** | Time to hire, employee retention, training completion rates, compliance metrics |

---

## 2. SALES DEPARTMENT DEEP DIVE

### Who Does What: Account Manager vs. Sales Rep vs. Inside Sales vs. Quoting Specialist

The sales department in a quote-based B2B building materials distributor has distinct roles that are often confused. Here is the definitive breakdown:

### THE HUNTING vs. FARMING MODEL

```
HUNTING (New Business)                    FARMING (Existing Accounts)
+---------------------------+            +---------------------------+
| Business Development Rep  |            | Account Manager           |
| (BDR)                     |            | (Outside Sales)           |
|                           |            |                           |
| - Prospecting             |  handoff   | - Owns customer relationship |
| - Cold outreach           | -------->  | - Handles their RFQs      |
| - Qualify leads           |  qualified | - Negotiates deals         |
| - Schedule meetings       |  lead      | - Customer site visits     |
| - No quoting              |            | - Manages renewals         |
+---------------------------+            +---------------------------+
                                                    |
                                            creates sourcing
                                             request for...
                                                    |
                                                    v
INBOUND PROCESSING                        QUOTE PRODUCTION
+---------------------------+            +---------------------------+
| Inside Sales Rep          |            | Quoting Specialist        |
|                           |            |                           |
| - Monitors portal for     |            | - Receives costed BOM     |
|   new requests            | -------->  |   from Procurement        |
| - Processes inbound RFQs  | passes to  | - Applies margin rules    |
| - Qualifies & structures  | for quote  | - Builds quote document   |
| - Small account ownership |  build     | - Handles versioning      |
| - Customer first contact  |            | - Routes for approval     |
+---------------------------+            +---------------------------+
```

### DETAILED COMPARISON TABLE

| Dimension | BDR | Inside Sales Rep | Account Manager (Outside) | Quoting Specialist |
|---|---|---|---|---|
| **Primary Focus** | Find new customers | Process inbound requests | Own customer relationships | Build quote documents |
| **Inbound vs. Outbound** | 100% outbound | 80% inbound, 20% outbound follow-up | 50/50 mix | 100% internal processing |
| **Customer Contact** | Cold prospects only | Existing + new inbound customers | Assigned accounts (deep relationships) | Rarely talks to customers directly |
| **Portal Interaction** | None | Monitors Customer Portal for new submissions and AI chat escalations | Views customer portal to see what customer sees | None (works in internal Quote Builder) |
| **Quoting Role** | None | Creates initial RFQ structure, may build simple quotes | Defines pricing strategy per deal, approves quotes before sending | Builds the actual quote document with pricing, terms, formatting |
| **Negotiation** | None | Handles routine price questions | Primary negotiator with customer | None |
| **Procurement Interaction** | None | Submits sourcing requests | Provides strategic input on sourcing | Receives costed BOMs, asks clarification questions |
| **Revenue Responsibility** | Pipeline generation only | Revenue on small accounts, support on large | Full revenue quota on assigned accounts | None (operational support) |
| **Typical Day** | 50-80 outreach touches, 5-10 conversations | 8-15 quotes processed, 20+ customer interactions | 3-5 customer meetings/calls, 2-4 active quotes worked | 10-20 quotes formatted, multiple revision rounds |

### INBOUND QUOTE REQUEST FLOW (FROM CUSTOMER PORTAL)

When a customer submits a material list request through the Customer Portal (PWA) or the AI chat identifies a quote need:

```
Step 1: Customer Portal / AI Chat
  |
  v
Step 2: INSIDE SALES REP receives notification
  - Reviews submission for completeness
  - Qualifies: Is this a real project? Do we serve this product range?
  - Checks if customer has assigned Account Manager
  - Structures the RFQ in the system (standardizes product descriptions, quantities)
  |
  +-- If customer has Account Manager --> Notifies AM, who takes over relationship
  |                                        but Inside Sales continues processing
  |
  v
Step 3: INSIDE SALES or ACCOUNT MANAGER creates sourcing request
  - Sends structured BOM to Procurement via internal system
  - Includes delivery requirements, timeline, customer tier info
  |
  v
Step 4: PROCUREMENT BUYER receives sourcing request
  - Sends RFQs to 2-5 suppliers (via Supplier Portal + email)
  - Collects and compares supplier quotes
  - Selects best supplier per line item
  - Creates internal cost sheet with landed costs
  |
  v
Step 5: Cost sheet returns to Sales
  - QUOTING SPECIALIST receives costed BOM
  - Applies margin rules (8-25% depending on product, customer tier, volume)
  - Builds formal quote document with line items, freight, terms
  - Versions it (V1)
  |
  v
Step 6: ACCOUNT MANAGER reviews the quote
  - Validates pricing strategy for this customer
  - May adjust margins within authorized range
  - Routes through approval workflow
  |
  v
Step 7: SALES MANAGER (or VP/CEO depending on value) approves
  - Reviews margin, customer creditworthiness, delivery feasibility
  |
  v
Step 8: ACCOUNT MANAGER sends quote to customer
  - Via Customer Portal (customer can view in their dashboard)
  - Discusses via phone/meeting for large deals
  - Negotiates. If re-pricing needed, cycles back to Step 3-5
```

### HANDOFF TO PROCUREMENT

The handoff from Sales to Procurement happens at **Step 3** above and works as follows:

1. **Sales creates a "Sourcing Request"** in the Internal Sales App
   - This is NOT a PO -- it's a request to price materials
   - Contains: product specs, quantities, delivery date needed, delivery location, customer tier (for urgency ranking), competitive notes
2. **Procurement sees it in their queue** in the Internal Procurement App
   - Sourcing requests are prioritized by: urgency, order value, customer tier
3. **Procurement works the sourcing** and returns a "Cost Sheet"
   - Contains: supplier selected per line item, unit cost, freight cost, lead time, payment terms
4. **Sales takes the Cost Sheet** and builds the customer quote
5. After customer acceptance, **Sales converts quote to Sales Order**
6. **Procurement receives automatic notification** and generates POs to suppliers

---

## 3. PROCUREMENT DEPARTMENT DEEP DIVE

### Buyer vs. Procurement Officer vs. Category Manager

These terms are often used interchangeably at smaller companies, but they represent distinct functions at scale:

### ROLE HIERARCHY AND DISTINCTION

```
Director of Procurement / VP Supply Chain
  |
  +--- Category Manager (STRATEGIC)
  |      |
  |      +--- Responsible for entire product CATEGORY (e.g., all steel products)
  |      +--- Negotiates annual/multi-year supplier agreements
  |      +--- Analyzes market trends and price forecasting
  |      +--- Develops sourcing strategy (single vs. multi-source)
  |      +--- Evaluates and qualifies new suppliers
  |      +--- Does NOT process individual POs day-to-day
  |
  +--- Buyer / Procurement Officer (TACTICAL/OPERATIONAL)
  |      |
  |      +--- Executes sourcing for individual customer orders
  |      +--- Sends RFQs to suppliers from preferred list
  |      +--- Compares supplier quotes and selects per line item
  |      +--- Generates and tracks Purchase Orders
  |      +--- Follows up on supplier delivery dates
  |      +--- Resolves day-to-day supplier issues
  |
  +--- Vendor Relations Manager (RELATIONSHIP)
         |
         +--- Manages supplier onboarding to Supplier Portal
         +--- Maintains supplier documentation and compliance
         +--- Coordinates supplier performance reviews
         +--- Handles supplier disputes and claims
```

### DETAILED COMPARISON

| Dimension | Category Manager | Buyer / Procurement Officer | Vendor Relations Manager |
|---|---|---|---|
| **Focus** | Strategic -- long-term cost position | Tactical -- daily order execution | Relationship -- supplier ecosystem health |
| **Time Horizon** | Quarterly/Annual | Daily/Weekly | Monthly/Quarterly |
| **Supplier Contact** | Executive-level negotiations, annual reviews | Daily operational contact (RFQs, POs, delivery tracking) | Onboarding, portal training, performance reviews |
| **Customer Contact** | Indirect (via Sales for product availability guidance) | None (talks to Sales, not customers) | None |
| **Key Tool** | Market analytics, supplier scorecards, category dashboards | Sourcing request queue, PO system, supplier RFQ tool | Supplier Portal admin, compliance tracking |
| **Decision Authority** | Which suppliers to qualify, annual pricing agreements, category strategy | Which supplier for THIS order, day-to-day pricing negotiation | Supplier portal access, documentation requirements |
| **When to Hire** | $25M+ revenue (when category specialization matters) | Day 1 (core function from the start) | $10M+ revenue (when supplier base exceeds 20-30) |

### HOW PROCUREMENT WORKS WITH THE SUPPLIER PORTAL

```
SUPPLIER PORTAL FUNCTIONS:

For SUPPLIERS (their view):
  - Upload and maintain product catalog (specs, images, certifications)
  - Set and update pricing (base price, volume tiers, special offers)
  - Publish current stock/availability levels
  - Receive and respond to RFQs from our Buyers
  - Receive and confirm Purchase Orders
  - Update delivery dates and shipment tracking
  - Upload invoices for payment processing
  - View their performance scorecard
  - Manage their company documentation (insurance, certifications)

For INTERNAL TEAM (admin view):
  - BUYER: Browse supplier catalogs to find products for customer orders,
    view real-time pricing and availability, send RFQs to multiple
    suppliers simultaneously, compare responses side-by-side
  - CATEGORY MANAGER: Monitor pricing trends across suppliers, review
    catalog completeness, analyze supplier competitiveness
  - VENDOR RELATIONS: Manage supplier accounts (activate, deactivate),
    onboard new suppliers, review documentation compliance, monitor
    portal adoption metrics
  - PROCUREMENT DIRECTOR: View aggregate supplier performance dashboards,
    identify supply chain risks, benchmark pricing across categories
```

### SUPPLIER SELECTION PROCESS (PER LINE ITEM)

When a Buyer needs to source materials for a customer order:

1. **Check Supplier Portal** for current pricing and availability from preferred suppliers
2. If preferred supplier pricing is current and stock is available, may use portal pricing directly
3. If not, **send RFQ to 2-5 suppliers** via Supplier Portal RFQ feature + email
4. Suppliers respond with: unit price, MOQ, lead time, freight terms, payment terms
5. Buyer enters all responses into **comparison matrix** in Internal Procurement App
6. Buyer evaluates on weighted criteria:
   - Price (40% weight typically)
   - Lead time / delivery reliability (25%)
   - Quality history / reject rate (15%)
   - Payment terms (10%)
   - Relationship / strategic value (10%)
7. Buyer selects supplier and documents rationale
8. For high-value items (>threshold), Category Manager or Director reviews selection
9. Cost sheet is generated and sent to Sales

---

## 4. OPERATIONS DEPARTMENT DEEP DIVE

### The No-Inventory / Drop-Ship Model

When the company does NOT hold inventory (sourced per deal, drop-shipped from supplier directly to customer job site), operations looks very different:

### WHAT OPERATIONS DOES WITHOUT INVENTORY

```
TRADITIONAL MODEL:                    DROP-SHIP / NO INVENTORY MODEL:
Supplier --> OUR Warehouse --> Customer   Supplier --> Customer (direct)
                                          But WE manage the entire process
```

**Operations still exists, but shifts from physical handling to coordination:**

| Function | With Warehouse | Without Warehouse (Drop-Ship) |
|---|---|---|
| **Receiving** | Physical receiving, inspection, put-away | ELIMINATED -- supplier ships direct |
| **Storage** | Inventory management, cycle counts | ELIMINATED |
| **Picking/Staging** | Pull from inventory, stage for delivery | ELIMINATED |
| **Delivery** | Own fleet or arrange carrier from warehouse | Still needed: arrange carrier from SUPPLIER to customer, or supplier handles delivery |
| **Coordination** | Moderate -- internal warehouse workflow | HEAVY -- coordinate between supplier, carrier, and customer site |
| **Tracking** | Track own inventory and own deliveries | Track SUPPLIER's shipment to customer -- less control, more communication needed |
| **Quality Control** | Inspect at receiving | Must rely on supplier QC OR do site inspection at delivery |
| **Documentation** | Generate own delivery tickets, PODs | Collect PODs from carrier/supplier, may need to verify at customer site |

### THE DROP-SHIP COORDINATOR ROLE

In a no-inventory model, the key operations role is the **Drop-Ship Coordinator** (replaces Warehouse Manager + Logistics Coordinator):

| Field | Detail |
|---|---|
| **Title** | Drop-Ship Coordinator / Order Fulfillment Coordinator |
| **Reports To** | Operations Manager or directly to COO at small scale |
| **Daily Tasks** | Process confirmed sales orders and create shipping requests to suppliers. Coordinate delivery dates between supplier capability and customer needs. Arrange third-party freight when supplier does not deliver (get carrier quotes, book, track). Monitor all in-transit shipments via carrier tracking systems. Communicate ETAs to Sales and customers. Handle exceptions: supplier delays, carrier issues, site access problems. Collect and verify PODs from carriers and suppliers. Coordinate multi-supplier deliveries for single customer orders (ensuring all materials arrive in correct sequence). Flag quality issues reported by customer at delivery. |
| **Primary App/Screen** | Internal Operations App -- order fulfillment dashboard, carrier tracking, Supplier Portal (delivery status from suppliers), Customer Portal (delivery status visible to customer) |
| **Key Decisions** | Carrier selection, delivery sequencing for multi-item orders, exception handling (partial shipment vs. hold for complete delivery), when to push supplier for faster delivery |

### WHAT CHANGES WHEN THE COMPANY STARTS HOLDING INVENTORY

The transition from drop-ship to warehousing typically happens in stages:

**STAGE 1: Pure Drop-Ship ($0-$5M)**
- All materials sourced per deal, shipped direct from supplier to customer
- No warehouse needed
- Operations team = 1-2 people (coordinator + admin)
- Pros: Zero inventory risk, low overhead, low capital requirement
- Cons: No control over delivery quality, longer lead times, dependent on supplier logistics

**STAGE 2: Cross-Dock / Consolidation Point ($5-$15M)**
- Rent small warehouse or use cross-dock facility
- Materials from multiple suppliers converge at your facility for inspection, consolidation, then delivery to customer
- Enables: Quality inspection before customer delivery, combining multiple supplier shipments into one customer delivery, adding value (kitting, repackaging, labeling)
- Need: 1 Warehouse Worker, basic WMS
- Trigger: Customer complaints about quality or delivery coordination failures

**STAGE 3: Strategic Inventory ($15-$30M)**
- Stock high-volume, frequently-ordered items
- Continue to source specialty/custom items per deal
- Hybrid model: 60-70% drop-ship, 30-40% from stock
- Enables: Faster delivery for common items, better negotiating leverage with suppliers (bulk purchasing), serve as buffer against supply chain disruptions
- Need: Warehouse Manager + 2-3 Workers, full WMS
- Trigger: When specific products are ordered repeatedly (>10x/month) and lead time is competitive advantage

**STAGE 4: Full Distribution ($30M+)**
- Maintain significant inventory across key categories
- Multiple warehouse locations
- Own fleet for delivery
- Drop-ship only for specialty/custom items (20-30% of orders)
- Need: Full warehouse team, fleet, dispatch, inventory management
- Trigger: Volume justifies the carrying cost, customers expect same/next-day delivery

### KEY METRICS THAT TRIGGER THE TRANSITION

| Indicator | Threshold | Action |
|---|---|---|
| Customer quality complaints from supplier delivery | >5% of orders | Consider cross-dock for inspection |
| Multi-supplier coordination failures | >3% of orders with timing issues | Consider consolidation point |
| Same product ordered >10x/month | Pattern established over 3 months | Consider stocking that SKU |
| Customer demand for same/next-day delivery | >20% of orders | Must hold inventory for those items |
| Revenue per product category | >$2M/year in category | Category justifies dedicated inventory |
| Supplier lead time unreliability | >10% late deliveries | Buffer stock for unreliable categories |

---

## 5. FINANCE DEPARTMENT DEEP DIVE

### Who Does What: Accountant vs. AR Clerk vs. AP Clerk vs. Credit Manager

### THE FINANCE DEPARTMENT STRUCTURE

```
CFO (at scale) / Finance Manager (growth stage)
  |
  +--- Controller (reporting, compliance, GL)
  |      |
  |      +--- Staff Accountant (journal entries, reconciliation, month-end close)
  |
  +--- AR Manager
  |      |
  |      +--- AR Clerks (invoicing, payment posting, collections calls)
  |
  +--- AP Manager
  |      |
  |      +--- AP Clerks (invoice processing, three-way match, payment runs)
  |
  +--- Credit Manager
         |
         +--- Credit Analyst(s) (credit applications, ongoing monitoring)
```

### DETAILED FUNCTION BREAKDOWN

#### Who Generates Invoices?

**AR Clerk** -- but mostly automated:
- System auto-generates invoice when POD (Proof of Delivery) is confirmed in the system
- AR Clerk reviews auto-generated invoices for accuracy (correct pricing, quantities match delivery, correct customer PO reference)
- AR Clerk handles exceptions: partial deliveries requiring adjusted invoicing, progress billing milestones, custom billing formats required by customer
- For very large projects with milestone billing, the AR Manager sets up the billing schedule
- Invoice is sent to customer via email AND visible on Customer Portal

#### Who Records Incoming Payments?

**AR Clerk**:
- **Wire transfers**: Check bank portal each morning. Match incoming wire to customer and invoice(s). Post payment in AR module. Wire reference usually includes invoice number or customer PO.
- **Checks**: Receive physical checks (or lockbox service where bank processes). Record deposit, match to invoice, post payment. For large check volumes, use lockbox with bank auto-matching.
- **Letters of Credit**: Work with bank to process LC draws. Submit required documentation (invoice, POD, shipping documents). Bank remits funds after document verification.
- **Customer Portal Payments**: If customer pays through portal (future feature), system auto-matches and posts.

#### Who Manages Credit Limits?

**Credit Manager** (or Finance Manager at small scale):
- New customer: Sales submits credit application via system. Credit Manager pulls D&B report, contacts trade references (3 minimum), reviews financial statements if provided. Sets initial credit limit based on analysis. Determines payment terms (prepay for risky, Net 30 for solid, Net 60 for strong/large).
- Existing customer requesting increase: Reviews payment history (average days to pay, any late payments), current credit utilization, updated financial condition. Approves/adjusts.
- Automatic monitoring: System flags when customer's outstanding balance approaches credit limit. Credit Manager reviews and decides: increase limit, require prepayment for this order, or hold order.

#### Who Handles Collections?

**Escalating responsibility chain:**

| Days Overdue | Who Acts | What They Do |
|---|---|---|
| Day 1-15 | System | Automated payment reminder email sent |
| Day 15-30 | AR Clerk | Phone call + email. "Friendly reminder" tone. |
| Day 30-45 | AR Clerk + Credit Manager | Stronger communication. Credit Manager reviews account. May place on credit hold (no new orders ship). |
| Day 45-60 | Credit Manager | Direct contact with customer's AP department. Negotiate payment plan if needed. Formal demand letter. |
| Day 60-90 | Credit Manager + Sales Manager | Joint effort. Sales Manager contacts their customer relationship. Discuss payment terms. |
| Day 90+ | Credit Manager + CFO/CEO | Decide: negotiate final settlement, engage collection agency, or pursue legal action. Construction industry: file mechanics lien if applicable. |

#### Who Pays Suppliers?

**AP Clerk** executes, **AP Manager** approves, **CFO** prioritizes when cash is tight:

1. Supplier submits invoice (via Supplier Portal, email, or mail)
2. AP Clerk matches invoice to PO and receiving confirmation (three-way match)
3. If matched: scheduled for payment per agreed terms (Net 30, Net 60)
4. If discrepancy: AP Clerk flags, Procurement Buyer investigates
5. Payment run executed (typically weekly or bi-weekly):
   - Wire transfer for large/international suppliers
   - Check for smaller/domestic suppliers
   - ACH for routine payments
6. AP Manager approves payment run above threshold
7. CFO/Finance Manager approves when total exceeds authority or cash is constrained

### CASH FLOW CHALLENGE IN BUILDING MATERIALS

The fundamental finance challenge: **You pay suppliers before customers pay you.**

```
Timeline for a typical order:

Day 0:  Customer accepts quote
Day 1:  PO sent to supplier
Day 14: Supplier ships (you may need to pay NET 30 from PO date)
Day 21: Materials delivered to customer
Day 22: Invoice sent to customer
Day 30: You pay supplier (NET 30 from PO)   <-- CASH OUT
Day 52: Customer pays you (NET 30 from invoice)  <-- CASH IN

GAP: 22 days of cash flow gap per order
```

For $100M in annual revenue with average 22-day cash gap:
- Working capital requirement: ~$6M constantly tied up in the cycle
- This is why credit management, payment terms, and cash flow forecasting are critical
- This is also why LCs and progress payments are used for very large orders

---

## 6. DISPATCH AND DELIVERY DEEP DIVE

### Own Fleet vs. Third-Party: When to Decide

| Factor | Third-Party Carriers | Own Fleet |
|---|---|---|
| **Revenue Stage** | $0-$30M (start here) | $15M+ (consider adding) |
| **Capital Required** | None | $50K-$200K per truck + insurance + maintenance |
| **Control** | Low -- depend on carrier schedules | High -- control timing, quality, branding |
| **Flexibility** | High for volume fluctuations | Fixed cost regardless of volume |
| **Construction Site Expertise** | Often lacking -- carriers unfamiliar with sites | Train your drivers on site protocols |
| **Customer Experience** | Variable -- carrier driver is the "face" | Consistent -- your branded driver |
| **Cost at Low Volume** | Lower (pay per delivery) | Higher (fixed costs spread over few deliveries) |
| **Cost at High Volume** | Higher per delivery | Lower per delivery (amortize fixed costs) |
| **Specialized Equipment** | Available from carriers (flatbed, crane, boom) | Must purchase/lease |
| **Best For** | Long-haul, specialty equipment, overflow, new markets | Local/regional, high frequency, repeat routes |

**Typical Progression:**

1. **$0-$10M**: 100% third-party carriers. Logistics Coordinator arranges each delivery.
2. **$10-$20M**: Begin with 1-2 owned trucks for highest-frequency routes. Rest third-party.
3. **$20-$40M**: Build fleet of 3-8 trucks. Own fleet handles 50-60% of local deliveries. Third-party for long-haul and overflow.
4. **$40M+**: Full fleet with Dispatcher and Fleet Manager. Third-party for specialty and overflow only.

### What the Dispatcher Does When Deliveries Are Drop-Shipped

When deliveries go directly from supplier to customer:

| Traditional Dispatch | Drop-Ship Dispatch |
|---|---|
| Assign OUR drivers | Coordinate with SUPPLIER's shipping department or CARRIER |
| Optimize OUR routes | Monitor carrier tracking numbers |
| Pre-trip briefing with OUR drivers | Confirm delivery appointment with customer |
| GPS tracking of OUR fleet | Track via carrier's tracking system (FedEx, UPS, freight carrier portals) |
| Collect POD from OUR driver | Collect POD from carrier/supplier -- often delayed or incomplete |
| Direct communication with driver via app | Indirect communication via carrier dispatch |

**The Dispatcher/Logistics Coordinator role in drop-ship still includes:**
- Monitoring all carrier tracking (manual, checking multiple carrier websites/portals)
- Proactively communicating ETAs to Sales and customers (the customer only knows YOU, not the carrier)
- Handling exceptions: carrier delays, missed deliveries, damage in transit
- Arranging returns/re-delivery when issues occur
- Consolidating multi-carrier deliveries when a single customer order ships from multiple suppliers
- Ensuring PODs are collected and uploaded to the system (critical for invoicing trigger)

### Delivery Tracking Integration

```
OWN FLEET:                         THIRD-PARTY CARRIER:
+------------------+               +------------------+
| Driver App       |               | Carrier API      |
| - Real-time GPS  |               | - Tracking number |
| - Status updates |               | - Status updates  |
| - Photo POD      |               | - POD (delayed)   |
| - Digital sig    |               | - May lack photos |
+--------+---------+               +--------+---------+
         |                                  |
         v                                  v
+---------------------------------------------+
| Internal Operations App                      |
| - Unified delivery tracking dashboard        |
| - Shows ALL deliveries regardless of source  |
| - Color-coded: own fleet vs. carrier         |
| - Exception alerts                           |
+---------------------------------------------+
         |
         v
+---------------------------------------------+
| Customer Portal (PWA)                        |
| - Customer sees unified delivery status      |
| - "Your order is in transit"                 |
| - ETA updates                                |
| - Delivery confirmation with POD             |
| - Customer doesn't know/care if own fleet or |
|   third-party -- they see ONE interface      |
+---------------------------------------------+
```

---

## 7. CUSTOMER SERVICE DEEP DIVE

### CS Rep vs. Account Manager: Division of Responsibility

| Issue Type | Who Handles | Why |
|---|---|---|
| "Where is my order?" (order status) | **CS Rep** -- first line | Routine inquiry. CS Rep looks up order status in system. |
| "When will my delivery arrive?" (ETA) | **CS Rep** initially, escalates to **Logistics Coordinator** if complex | CS Rep checks system. If carrier tracking shows issue, loops in Logistics. |
| "Your quote is too expensive" (pricing complaint) | **Account Manager** | Pricing is a sales/relationship issue. AM negotiates. |
| "The materials were damaged on arrival" (quality complaint) | **CS Rep** intake + **Claims Specialist** investigation | CS Rep logs the complaint and initial details. Claims Specialist investigates and resolves. |
| "I received the wrong materials" (order error) | **CS Rep** intake --> **Operations** investigation | CS Rep logs. Operations checks what was shipped vs. ordered. |
| "I need to change my order" (change order) | **Account Manager** (pricing impact) + **CS Rep** (logistics impact) | If change affects pricing: AM handles. If just delivery date change: CS can handle. |
| "I need to return unused materials" (return) | **CS Rep** / **Claims Specialist** | Process per return policy. Coordinate pickup. |
| "I need a copy of my invoice" (admin) | **CS Rep** or **Customer Portal self-service** | Customer can access via portal. CS Rep helps if they can't find it. |
| "My company needs credit terms" (credit request) | **Account Manager** initiates, **Credit Manager** decides | AM submits application. Credit Manager evaluates. |
| "I'm unhappy with your overall service" (escalation) | **Account Manager** + **CS Manager** | Relationship issue requires AM involvement. CS Manager provides service recovery. |

### HOW CS INTERACTS WITH THE CUSTOMER PORTAL AI

The Customer Portal includes an AI chat assistant. Here is the interaction model:

```
CUSTOMER PORTAL AI CHAT
  |
  |-- Tier 0: AI handles autonomously (70-80% of inquiries)
  |     |
  |     +-- "What's the status of order #12345?" --> AI looks up order, provides status
  |     +-- "When is my delivery arriving?" --> AI checks tracking, provides ETA
  |     +-- "Can I get a copy of invoice #67890?" --> AI provides download link
  |     +-- "What products do you carry in steel beams?" --> AI searches catalog
  |     +-- "I need to submit an RFQ for a new project" --> AI guides through submission form
  |     +-- "What are your payment terms?" --> AI provides standard terms info
  |
  |-- Tier 1: AI escalates to CS Rep (15-25% of inquiries)
  |     |
  |     +-- AI confidence drops below 50% on response
  |     +-- Customer expresses frustration (sentiment detection)
  |     +-- AI fails to answer twice consecutively
  |     +-- Customer explicitly asks for human
  |     +-- Complex multi-step issue requiring investigation
  |     +-- Quality complaint or damage report
  |     |
  |     HOW ESCALATION WORKS:
  |     1. AI hands conversation to CS Rep with FULL context:
  |        - Conversation history
  |        - Customer account details
  |        - Related orders/quotes
  |        - AI's attempted answers
  |        - Reason for escalation
  |     2. CS Rep sees it in ticketing queue with "AI escalated" flag
  |     3. CS Rep can respond via same chat interface
  |     4. Customer experiences seamless transition (may or may not realize)
  |
  |-- Tier 2: CS Rep escalates to specialist (5-10% of inquiries)
        |
        +-- CS Rep escalates to Account Manager (pricing, relationship)
        +-- CS Rep escalates to Claims Specialist (quality, returns)
        +-- CS Rep escalates to Logistics (delivery exceptions)
        +-- CS Rep escalates to Credit Manager (credit/billing disputes)
```

**Internal Roles That Monitor/Manage the AI:**
- **CS Manager**: Reviews AI chat logs weekly, identifies training gaps, updates AI knowledge base
- **IT/Product Team**: Maintains AI model, integrates with backend systems, monitors performance
- **Sales Manager**: Reviews AI-initiated RFQs to ensure quality lead capture

---

## 8. IT / TECH TEAM DEEP DIVE

### For a Company Building Custom Software (This Company)

This company is building its own Customer Portal, Supplier Portal, Internal Apps, and Driver App. This requires a dedicated technology team that is larger than a typical building materials distributor.

### TECH TEAM STRUCTURE BY STAGE

#### Pre-Launch (Building the Platform): 3-5 People

| Role | What They Do | Full-Time? |
|---|---|---|
| **CTO / Technical Co-Founder** | Architecture decisions, technology selection, hands-on coding (full-stack), security design, infrastructure setup, team hiring | Yes |
| **Full-Stack Developer #1** | Build Customer Portal (PWA), API development, database design, core business logic | Yes |
| **Full-Stack Developer #2** | Build Internal Apps, Supplier Portal, integrations, testing | Yes |
| **UI/UX Designer** | Design all interfaces (Customer Portal, Internal Apps, Supplier Portal, Driver App), user research, prototyping | Contract or Part-Time |
| **DevOps/Infrastructure** | CI/CD pipeline, cloud infrastructure (Cloudflare Workers, D1, R2), monitoring, security | Part-Time or CTO handles |

**Key Note:** At pre-launch, no dedicated system admin is needed if using modern PaaS/serverless (Cloudflare, Vercel, Supabase). The CTO or a developer handles infrastructure via code (Infrastructure as Code).

#### Launch (First 10 Customers): 4-6 People

| Role | What They Do | Full-Time? |
|---|---|---|
| **CTO** | Architecture, code review, security, vendor management, some coding | Yes |
| **Full-Stack Developer #1** | Customer Portal features, bug fixes, performance | Yes |
| **Full-Stack Developer #2** | Internal Apps, Supplier Portal | Yes |
| **Full-Stack Developer #3** | Driver App, integrations (payment gateways, carrier APIs, accounting) | Yes |
| **QA/Tester** | Manual and automated testing, bug tracking, user acceptance testing | Part-Time or shared |
| **UI/UX Designer** | Ongoing design improvements based on user feedback | Part-Time |

#### Growth ($1M-$10M Revenue): 6-10 People

| Role | What They Do | Full-Time? |
|---|---|---|
| **CTO** | Technology strategy, architecture, team management, less coding | Yes |
| **Engineering Manager / Tech Lead** | Code quality, sprint planning, mentoring developers, architecture decisions | Yes |
| **Frontend Developer(s)** (2) | Customer Portal, Supplier Portal, Internal App UIs (React/Next.js) | Yes |
| **Backend Developer(s)** (2) | API development, business logic, integrations, data processing | Yes |
| **Mobile Developer** | Driver App, PWA optimization, offline capabilities | Yes |
| **DevOps Engineer** | CI/CD, monitoring, performance optimization, security, infrastructure scaling | Yes |
| **QA Engineer** | Automated testing, manual testing, release management | Yes |
| **UI/UX Designer** | Full-time design, user research, design system maintenance | Yes |

#### Scale ($10M-$50M Revenue): 10-18 People

| Role | What They Do | Full-Time? |
|---|---|---|
| **CTO** | Technology strategy, vendor relationships, security oversight | Yes |
| **VP Engineering** | Team management, process, hiring, technical roadmap execution | Yes |
| **Engineering Managers** (2) | Lead teams (Platform Team + Product Team) | Yes |
| **Frontend Developers** (3) | All portal and app interfaces | Yes |
| **Backend Developers** (3) | APIs, business logic, integrations, data pipeline | Yes |
| **Mobile Developer** | Driver App, PWA | Yes |
| **DevOps/SRE** (2) | Infrastructure, monitoring, incident response, scaling | Yes |
| **QA Engineers** (2) | Test automation, release quality | Yes |
| **UI/UX Designer(s)** (2) | Design across all products | Yes |
| **Data Engineer / Analyst** | Reporting, dashboards, AI/ML data pipeline | Yes |
| **IT Support / System Admin** | Internal systems, hardware, employee onboarding, helpdesk | Yes |

#### Enterprise ($50M+ Revenue): 18-30+ People

Add: Security Engineer, Data Science team (AI/ML for pricing, demand forecasting), Solution Architects, Product Managers per app, multiple development squads aligned to business domains.

### WHEN TO HIRE EACH ROLE

| Role | Revenue Trigger | Why |
|---|---|---|
| CTO | Day 0 | Core architecture decisions cannot be delegated |
| Full-Stack Developers | Day 0 | Building the platform |
| UI/UX Designer | Pre-launch (contract) | Good UX is critical for portal adoption |
| DevOps Engineer | $3-5M | Deployment complexity requires dedicated attention |
| QA Engineer | $3-5M | Manual testing by developers isn't sustainable |
| IT Support/System Admin | $10M+ | Internal team of 20+ needs IT helpdesk |
| Data Engineer | $10M+ | Reporting and analytics become strategic |
| Security Engineer | $25M+ | Dedicated security expertise needed |
| VP Engineering | $25M+ | CTO needs to focus on strategy, not team management |

---

## 9. MINIMUM VIABLE TEAM AT DIFFERENT STAGES

### STAGE 1: PRE-LAUNCH (Building the Platform)

**Headcount: 4-6 people**
**Revenue: $0**
**Duration: 6-12 months**

| Person | Roles Covered | Focus |
|---|---|---|
| Founder/CEO | Business strategy, supplier outreach, customer pipeline building, product direction | 50% business, 50% product |
| CTO | Architecture, full-stack development, infrastructure | 90% building |
| Developer #1 | Full-stack development (Customer Portal, Internal App) | 100% building |
| Developer #2 | Full-stack development (Supplier Portal, integrations) | 100% building |
| UI/UX Designer | All interface design | Contract/Part-time |
| Business Advisor/Mentor | Industry connections, credibility | Advisory only |

**What gets built:** MVP of Customer Portal (submit RFQs, view quotes), basic Internal App (manage quotes, basic CRM), Supplier Portal skeleton (catalog upload), basic finance module (invoicing, payment tracking).

**What gets deferred:** Driver App (use phone/WhatsApp), advanced analytics, AI features, warehouse management.

### STAGE 2: LAUNCH (First 10 Customers)

**Headcount: 7-10 people**
**Revenue: $0-$2M**

| Person | Roles Covered | Primary App |
|---|---|---|
| Founder/CEO | Key account sales, supplier partnerships, quote approval, strategy | CEO App, Internal Sales App |
| Sales/Account Manager | All customer-facing: RFQ intake, quoting, negotiation, customer service | Internal Sales App, Customer Portal |
| Procurement/Operations | Supplier sourcing, PO management, delivery coordination, drop-ship management | Internal Procurement App, Supplier Portal, Internal Operations App |
| Finance/Admin | Invoicing, AR/AP, credit checks, bookkeeping, office management | Internal Finance App |
| CTO | Platform maintenance, feature development, bug fixes, security | All apps (admin access) |
| Developer #1 | Feature development, Customer Portal improvements | Technical |
| Developer #2 | Integrations, Supplier Portal, Internal App | Technical |

**Key Characteristic:** Everyone wears multiple hats. The Founder personally approves all quotes over $100K. The Sales person is also customer service. The Finance person does everything from invoicing to credit checks to paying suppliers. Tech team of 3 handles all software.

### STAGE 3: GROWTH ($1M-$10M Revenue)

**Headcount: 12-22 people**

| Department | Headcount | Roles |
|---|---|---|
| Executive | 1 | CEO/GM |
| Sales | 3-5 | Sales Manager, Inside Sales (1-2), Account Manager (1-2) |
| Procurement | 1-2 | Buyer (1), starts to specialize from Operations |
| Operations | 2-3 | Operations Manager, Logistics Coordinator (1), Warehouse Worker (1 if starting cross-dock) |
| Finance | 2-3 | Finance Manager, AR/AP Clerk (1-2) |
| Customer Service | 1 | CS Rep (handles portal escalations, phones, email) |
| Tech | 5-7 | CTO, 3-4 Developers, QA, Designer |

**Key Changes:**
- Sales splits into management and execution
- Procurement separates from Operations
- First dedicated CS hire
- Tech team grows to support multiple apps

### STAGE 4: SCALE ($10M-$50M Revenue)

**Headcount: 25-50 people**

| Department | Headcount | Roles |
|---|---|---|
| Executive | 2-3 | CEO, COO, CFO (may be fractional) |
| Sales | 8-12 | VP Sales, Sales Manager, Inside Sales (3-4), Account Managers (3-5), BDR (1) |
| Procurement | 4-6 | Procurement Director, Category Manager (1), Buyers (2-3), Vendor Relations (1) |
| Operations | 6-12 | Ops Manager, Warehouse Manager, Warehouse Workers (3-5), Logistics Coordinator (1-2), Dispatcher (1) |
| Finance | 5-7 | Controller, Credit Manager, AR team (2), AP Clerk (1), Staff Accountant (1) |
| Customer Service | 3-5 | CS Manager, CS Reps (2-3), Claims Specialist (1) |
| Tech | 8-12 | CTO, Tech Lead, Frontend (2), Backend (2), Mobile (1), DevOps (1), QA (1), Designer (1) |
| HR/Admin | 2 | HR Manager, Office Admin |

**Key Changes:**
- Full departmental structure emerges
- Dedicated credit management
- Warehouse operations (now holding some inventory)
- Own fleet begins (1-3 trucks, Dispatcher hired)
- Larger tech team supporting all apps

### STAGE 5: ENTERPRISE ($50M+ Revenue)

**Headcount: 60-120+ people**

| Department | Headcount | Roles |
|---|---|---|
| Executive | 5-7 | CEO, COO, CFO, CRO/VP Sales, VP Supply Chain, CIO, CHRO |
| Sales | 18-25 | Regional Sales Managers (3-4), Account Managers (8-12), Inside Sales/Quoting (4-6), Sales Support (2-3), BDR team (2-3) |
| Procurement | 8-12 | Director, Category Managers (2-3), Buyers (4-6), Vendor Relations (1-2) |
| Operations | 20-35 | Director, Warehouse Managers (per location), WH Staff (varies), Logistics Manager, Dispatchers (2-4), Fleet Manager, Drivers (if own fleet 5-15+) |
| Finance | 10-15 | Controller, Credit Manager + Analysts (2-3), AR Manager + team (3-5), AP Manager + team (2-3), Financial Analysts (1-2) |
| Customer Service | 5-10 | CS Manager, CS Reps (4-8), Claims Specialist (1-2) |
| Tech | 15-25 | CTO, VP Engineering, Eng. Managers (2), Developers (8-12), DevOps/SRE (2), QA (2), Designers (2), Data team (2-3), IT Support (1-2) |
| HR | 3-5 | HR Director, Recruiter, HR Coordinator, Payroll, Benefits |
| Marketing | 2-4 | Marketing Manager, Content, Digital Marketing |
| Legal/Compliance | 1-2 | In-house counsel or managed externally |

---

## 10. HOW ROLES INTERACT WITH EACH APP

### APP-TO-ROLE MAPPING

#### Customer Portal (PWA)

| Internal Role | Access Level | What They Do In It |
|---|---|---|
| **Inside Sales Rep** | Read + Respond | Monitor new material list submissions. View customer chat history. Receive AI chat escalations and respond. |
| **Account Manager** | Read | View what their customers see. Check submitted RFQs. Review customer's order history and quotes on portal. |
| **CS Rep** | Read + Respond | Take over AI chat conversations. View customer order status. Respond to customer support messages. |
| **CS Manager** | Admin | Review AI chat logs. Update knowledge base/FAQ that AI uses. Monitor portal support metrics. |
| **Sales Manager** | Read | View team's customer activity on portal. Monitor quote request volume. |
| **CEO/GM** | Read | Occasionally check portal for customer experience review. |
| **CTO/Tech Team** | Admin/Dev | Maintain platform, deploy updates, monitor performance, manage AI model. |

#### Supplier Portal

| Internal Role | Access Level | What They Do In It |
|---|---|---|
| **Buyer/Procurement Officer** | Full Access | Browse supplier catalogs. View pricing and availability. Send RFQs. Receive and compare supplier quotes. Manage POs. Track supplier delivery status. |
| **Category Manager** | Full Access | Monitor pricing trends. Review catalog completeness. Analyze supplier competitiveness. |
| **Vendor Relations Manager** | Admin | Onboard new suppliers. Manage supplier accounts. Monitor portal adoption. Train suppliers. |
| **Procurement Director** | Read/Admin | View aggregate dashboards. Approve new supplier accounts. |
| **Operations/Logistics** | Read | Check supplier delivery dates. View shipping status from suppliers. |
| **AP Clerk** | Read | View supplier invoices submitted through portal. Verify against POs. |
| **CTO/Tech Team** | Admin/Dev | Maintain platform, deploy updates, manage integrations. |

#### Internal Sales App

| Role | What They Use |
|---|---|
| **Account Manager** | CRM (customer records, interaction history, pipeline), Quote Builder (create/edit quotes, margin calculator), Order Management (track orders for their customers), Dashboard (personal KPIs) |
| **Inside Sales Rep** | RFQ Inbox (new requests from portal/email/phone), Quote Builder (structure RFQs, build initial quotes), CRM (log interactions, lookup customer info) |
| **Quoting Specialist** | Quote Builder (primary -- format quotes, apply margins, generate PDFs), Quote Approval Queue |
| **Sales Manager** | Pipeline Dashboard (team view), Quote Approval Queue, Rep Activity Feed, CRM (team-wide), Margin Analysis Reports |
| **VP Sales** | Revenue Dashboard, Team Performance, Pipeline Analytics, Quote Approval (high value) |
| **BDR** | CRM Prospecting Module (lead management, outreach tracking, activity logging) |

#### Internal Procurement App

| Role | What They Use |
|---|---|
| **Buyer** | Sourcing Request Queue (from Sales), RFQ Management (send to suppliers, track responses), Quote Comparison Matrix, PO Generator, PO Tracking Dashboard, Supplier Communication |
| **Category Manager** | Supplier Scorecards, Market Price Analytics, Category Cost Dashboards, Supplier Qualification Workflows |
| **Vendor Relations Manager** | Supplier Master Data Management, Compliance Tracking, Performance Reports |
| **Procurement Director** | Procurement Dashboard (aggregate KPIs), Approval Queue (high-value POs), Supplier Strategy Tools |
| **Sales Rep** | Read-only: Sourcing request status, estimated costs (limited visibility) |

#### Internal Operations App

| Role | What They Use |
|---|---|
| **Operations Manager** | Operations Dashboard (deliveries, inbound, exceptions, capacity), Staffing/Scheduling |
| **Warehouse Manager** | WMS Module (inventory, receiving queue, pick lists, cycle count, bin locations) |
| **Warehouse Worker** | Mobile WMS (scan to receive, pick list, location lookup) |
| **Logistics Coordinator** | Delivery Calendar, Carrier Management, Shipment Tracking (own + third-party), TMS Module |
| **Dispatcher** | Dispatch Module (route planner, driver assignment, GPS tracking), Vehicle Management |
| **CS Rep** | Order Tracking (read-only view to answer customer queries), Ticketing System |
| **CS Manager** | Ticketing Dashboard, SLA Tracking, AI Chat Admin |

#### Internal Finance App

| Role | What They Use |
|---|---|
| **Controller** | General Ledger, Financial Statements, Margin Analysis, Month-End Close Workflows |
| **AR Manager/Clerk** | Invoicing Module (auto-generate from POD, send to customer), Payment Application (post wires/checks/LC), AR Aging Reports, Collection Task Queue, Dispute Management |
| **AP Manager/Clerk** | Invoice Processing (three-way match vs. PO + receiving), Payment Scheduling, Supplier Ledger, Payment Run Execution |
| **Credit Manager** | Credit Application Workflow, Credit Limit Management, Credit Hold Queue, Exposure Dashboard, D&B Integration, LC Management |
| **Staff Accountant** | Journal Entries, Bank Reconciliation, Expense Management |
| **CFO** | Financial Dashboard (cash flow, P&L, balance sheet), Forecast Models |
| **Sales Manager** | Read-only: Customer credit status (to understand deal constraints), margin reports |

#### Driver App

| Role | What They Use |
|---|---|
| **Driver** | Delivery assignments, turn-by-turn navigation, status updates (departed, arrived, delivering, completed), POD capture (photo + digital signature), issue reporting, communication with Dispatch |
| **Dispatcher** | Monitor driver locations, send messages, reassign deliveries |
| **Operations Manager** | Read-only: Fleet overview, live tracking |

#### CEO App

| Role | What They Use |
|---|---|
| **CEO/GM** | Cross-departmental dashboard: Revenue + margin, pipeline value, AR aging, on-time delivery, cash flow, quote approval queue (high value), key alerts (large overdue, margin exceptions, delivery failures) |
| **COO** | Operational subset: delivery performance, capacity, exceptions |
| **CFO** | Financial subset: cash position, AR/AP aging, margin realization |

#### Admin Panel

| Role | What They Manage |
|---|---|
| **CTO/Tech Lead** | System configuration, API keys, integrations, database management, feature flags, deployment settings |
| **IT Support** | User accounts, role permissions, password resets, access control |
| **HR Manager** | User provisioning (new hire setup, termination cleanup), role assignments |
| **Finance Manager** | Tax settings, payment gateway configuration, chart of accounts, billing templates |
| **Sales Manager** | Territory assignments, margin rules, quote approval thresholds, CRM configuration |
| **Procurement Director** | Supplier portal settings, approval thresholds, category configuration |
| **CEO** | Master settings approval (rarely used directly) |

---

## 11. COMMUNICATION FLOWS BETWEEN DEPARTMENTS

### THE EXACT CHAIN: Quote Request to Delivery

Here is the precise communication chain when a quote request arrives:

```
MINUTE 0: Customer submits material list on Customer Portal
  |
  | [SYSTEM] Auto-notification to Inside Sales queue
  | [SYSTEM] AI Chat acknowledges: "We've received your request, reference #RFQ-2024-1234"
  |
  v
HOUR 0-2: INSIDE SALES REP picks up
  |
  | Reviews submission for completeness
  | Checks: Is customer assigned to an Account Manager?
  |
  | --> YES: @mentions Account Manager on the RFQ in Internal Sales App
  |          "New RFQ from [Customer] - $350K est. structural steel + rebar"
  |          Account Manager acknowledges, takes relationship ownership
  |
  | --> NO (new customer): Inside Sales handles directly, flags Sales Manager
  |
  | Structures RFQ: standardizes product descriptions, verifies quantities
  | Creates Sourcing Request in Internal Sales App
  |
  | [SYSTEM] Auto-notification to Procurement queue
  | [INTERNAL CHAT] Inside Sales may @mention specific Buyer:
  |   "Sourcing request SR-2024-567 ready. Customer needs delivery by March 15.
  |    3 categories: structural steel, rebar, concrete accessories."
  |
  v
HOUR 2-24: PROCUREMENT BUYER picks up Sourcing Request
  |
  | Breaks BOM into procurement categories
  | Checks Supplier Portal for current pricing from preferred suppliers
  | Sends RFQs to 2-5 suppliers per category:
  |   - Via Supplier Portal RFQ feature
  |   - Via email for suppliers not on portal
  |   - Via phone for urgent items
  |
  | [SYSTEM] Supplier Portal notifications to suppliers
  |
  v
HOURS 24-72: SUPPLIERS respond (via Supplier Portal or email)
  |
  | BUYER collects responses into comparison matrix
  | Evaluates: price, lead time, quality score, payment terms
  | Selects best supplier per line item
  | May negotiate with top contenders for better pricing
  |
  | Creates COST SHEET (internal document):
  |   Line item | Supplier | Unit Cost | Freight | Lead Time | Total Landed Cost
  |
  | [SYSTEM] Auto-notification to Sales: "Cost sheet ready for SR-2024-567"
  | [INTERNAL CHAT] Buyer may message Sales Rep:
  |   "Costs in for your RFQ. Steel prices came in 8% above estimate.
  |    Rebar is good. Delivery dates work except Item #7 -- 2 weeks late."
  |
  v
HOURS 24-48 (AFTER COSTING): QUOTING SPECIALIST + ACCOUNT MANAGER
  |
  | QUOTING SPECIALIST:
  |   - Receives cost sheet
  |   - Applies margin rules (12% on steel, 18% on rebar, 22% on accessories)
  |   - Calculates freight to customer site
  |   - Builds formal quote document (V1)
  |   - Routes through approval workflow
  |
  | [SYSTEM] Auto-notification based on value:
  |   < $100K: Auto-approved
  |   $100K-$500K: Sent to SALES MANAGER approval queue
  |   > $500K: Sent to VP SALES / CEO approval queue
  |
  | SALES MANAGER reviews:
  |   - Checks margin vs. guidelines
  |   - Reviews customer credit status
  |   - Validates delivery commitments
  |   - Approves (or requests changes via @mention on the quote)
  |
  | [SYSTEM] Approval notification to Account Manager: "Quote approved"
  |
  v
SAME DAY AS APPROVAL: ACCOUNT MANAGER sends quote to customer
  |
  | Sends via Customer Portal (customer gets email + sees in their dashboard)
  | For large deals: calls customer to walk through pricing
  |
  | [CUSTOMER PORTAL] Customer can: view, download PDF, accept, request revision
  |
  v
DAYS 1-14: NEGOTIATION (Account Manager + Customer)
  |
  | Customer may push back on price, terms, delivery dates
  | Account Manager negotiates within authorized range
  |
  | If re-pricing needed:
  |   [INTERNAL CHAT] AM to Procurement: "Customer wants 5% off on steel. Can we get
  |    supplier to sharpen pencil? Or alternative supplier?"
  |   Procurement re-negotiates or re-sources
  |   Loop back to Quoting Specialist for V2, V3...
  |
  | If discount exceeds authority:
  |   [SYSTEM] Escalation to Sales Manager/VP via approval workflow
  |
  v
QUOTE ACCEPTED: Customer clicks "Accept" on Portal (or sends PO)
  |
  | [SYSTEM] Auto-notification to: Account Manager, Inside Sales, Procurement
  |
  | INSIDE SALES / ACCOUNT MANAGER:
  |   - Converts quote to Sales Order (one-click in system)
  |   - Confirms specs, quantities, delivery schedule
  |   - Sends Order Acknowledgment to customer (via Portal + email)
  |
  | [SYSTEM] Credit check triggered:
  |   - If within credit limit: auto-proceed
  |   - If exceeds limit: order held, CREDIT MANAGER notified
  |   - Credit Manager reviews, releases or holds
  |   [INTERNAL CHAT] Credit Manager may message AM:
  |     "Order SO-2024-890 on credit hold. Customer is at 95% of limit.
  |      Need $150K limit increase or prepayment for this order."
  |
  v
SAME DAY AS SO: PROCUREMENT generates Purchase Orders
  |
  | [SYSTEM] Auto-generates PO drafts from confirmed SO, linked to selected suppliers
  | BUYER reviews and sends POs to suppliers via Supplier Portal
  | [SYSTEM] Supplier receives PO notification on Supplier Portal
  | Supplier confirms PO (acknowledgment)
  |
  | [SYSTEM] PO status updates visible to Sales and Operations
  |
  v
DAYS VARY: SUPPLIER FULFILLMENT + DELIVERY
  |
  | LOGISTICS COORDINATOR monitors supplier delivery status
  | Coordinates delivery date with customer site
  |
  | [INTERNAL CHAT] Logistics to Sales: "Delivery for SO-2024-890 confirmed
  |  for March 15. Customer contact: John Smith, 555-1234. Site hours 7am-4pm."
  |
  | [CUSTOMER PORTAL] Customer can see delivery status, ETA
  | [SYSTEM] Auto-notifications to customer: "Your order has shipped" / "Delivery tomorrow"
  |
  | DRIVER (or carrier) delivers materials
  | Captures POD (photo + signature)
  |
  | [SYSTEM] POD uploaded triggers:
  |   1. Delivery confirmed in Operations App
  |   2. Auto-notification to Finance: "Ready for invoicing"
  |   3. Customer Portal updated: "Delivered"
  |
  v
POST-DELIVERY: FINANCE processes
  |
  | AR CLERK: Auto-invoice generated from POD, reviewed, sent to customer
  |   Via email + available on Customer Portal
  |
  | AR CLERK monitors payment per terms (Net 30/60)
  | [SYSTEM] Automated reminders at 15 days, 25 days
  |
  | Payment received:
  |   AR Clerk posts payment, SO marked as paid
  |   [SYSTEM] Notification to Sales: "SO-2024-890 paid in full"
  |
  | Order complete.
```

### COMMUNICATION METHODS USED

| Communication Type | Tool | When Used | Example |
|---|---|---|---|
| **System Notifications** | In-app notifications (bell icon in each app) | Every status change, automated alerts | "New RFQ assigned to you", "Quote approved", "Payment received" |
| **@Mentions on Orders** | Comment thread on each RFQ/Quote/SO/PO in internal apps | When humans need to communicate context about a specific order | "@john - Customer needs delivery 2 days earlier. Can we push supplier?" |
| **Internal Chat** | Slack-like channels or built-in chat in internal apps | Real-time coordination, quick questions, department discussions | "#procurement: Anyone have a contact at ABC Steel? Need urgent quote." |
| **Email** | External email | Formal communication with customers and suppliers not on portals | Quote PDFs, PO confirmations, invoice delivery |
| **Phone** | Direct calls | Urgent issues, customer negotiation, supplier negotiation | "Your delivery is delayed 3 days. Here's what we can do..." |
| **Meetings** | Video/in-person | Regular cadence reviews | Weekly pipeline review, monthly business review, daily ops standup |
| **Customer Portal Chat** | AI chat with human escalation | Customer self-service inquiries | "Where is my order?" "I need to submit a new request" |
| **Supplier Portal Messages** | Portal messaging feature | Structured supplier communication | RFQ responses, PO acknowledgments, delivery updates |

### REGULAR MEETING CADENCE

| Meeting | Frequency | Attendees | Purpose |
|---|---|---|---|
| **Daily Ops Standup** | Daily, 15 min | Ops Manager, Logistics, Warehouse Manager, Dispatcher | Today's deliveries, exceptions, inbound |
| **Sales Huddle** | Daily, 15 min | Sales Manager, Sales Team | Pipeline updates, hot deals, blockers |
| **Quote Review** | Daily or 2x/week, 30 min | Sales Manager, Procurement Manager | Review open sourcing requests, discuss cost issues, align on pricing |
| **Weekly Pipeline Review** | Weekly, 1 hour | VP Sales, Sales Managers, Sales Team | Full pipeline review, forecast, win/loss analysis |
| **Weekly AR Review** | Weekly, 30 min | Credit Manager, AR team, Sales Manager | Overdue accounts, credit holds, collection strategy |
| **Monthly Business Review** | Monthly, 2 hours | CEO, all department heads | Revenue, margin, KPIs, strategic issues, planning |
| **Quarterly Supplier Review** | Quarterly, 1 hour each | Procurement Director, Category Managers, key suppliers | Supplier performance, pricing agreements, strategic alignment |

---

## SUMMARY: CRITICAL INSIGHTS

### 1. The Quote-Based Model Is Communication-Intensive
Unlike catalog-based distribution, every order requires a multi-step communication chain between Sales, Procurement, and the customer. The platform's primary job is reducing friction in this chain.

### 2. Operations Changes Dramatically Based on Inventory Strategy
From pure drop-ship (coordination-heavy, small team) to full distribution (warehouse-heavy, large team), the operations department can range from 2 people to 40+ people.

### 3. Finance/Credit Is Disproportionately Important
With $100K-$100M+ orders and Net 30-90 payment terms, credit management is life-or-death. A single bad debt on a $5M order can wipe out a year of profit.

### 4. The Tech Team Is Larger Than Typical for This Industry
Because this company is building its own platform (Customer Portal, Supplier Portal, Internal Apps, Driver App), the tech team is 3-5x larger than a typical building materials distributor of the same revenue.

### 5. AI Changes the CS Model
The Customer Portal AI should handle 70-80% of routine inquiries (order status, ETAs, document requests), allowing a smaller CS team to focus on complex issues. This is a significant competitive advantage.

### 6. The Supplier Portal Is a Competitive Moat
Most building materials distributors communicate with suppliers via email, phone, and spreadsheets. A Supplier Portal that gives suppliers self-service catalog management, automated RFQ response, and performance visibility creates stickiness and efficiency that competitors lack.

---

## Sources

- [BMCareers: Building Materials Sales Roles](https://bmcareers.com/job-families/sales/)
- [SPEC Building Materials: Inside Sales / Customer Service Associates](https://www.speccorp.com/inside-sales-customer-service-associates)
- [Pipeline CRM: Account Manager vs. Sales Rep](https://pipelinecrm.com/blog/sales-vs-account-management/)
- [TechTarget: Sales vs. Account Management](https://www.techtarget.com/searchcustomerexperience/feature/Sales-vs-account-management-Whats-the-difference)
- [Factor 8: Inside Sales Roles Explained](https://factor8.com/the-different-inside-sales-roles-explained/)
- [eSUB: Procurement Manager Responsibilities in Construction](https://esub.com/blog/procurement-manager-responsibilities-in-construction)
- [CIPS: Category Manager Job Profile](https://www.cips.org/careers/job-profiles/category-manager)
- [GoConstruct: Construction Buyer Job Description](https://www.goconstruct.org/construction-careers/what-jobs-are-right-for-me/buyer)
- [Indeed: Buyer Job Description](https://www.indeed.com/hire/job-description/buyer)
- [Art of Procurement: What Does a Category Manager Do?](https://artofprocurement.com/blog/learn-category-manager)
- [Indeed: Logistics Coordinator Job Description](https://www.indeed.com/hire/job-description/logistics-coordinator)
- [Ziprecruiter: Drop Ship Coordinator](https://www.ziprecruiter.com/Jobs/Drop-Ship-Coordinator)
- [GetClue: What Are Construction Dispatchers](https://www.getclue.com/blog/what-are-construction-dispatchers)
- [Geo2: Own Fleet or Carriers](https://geo2.com/blog/own-fleet-or-carriers-which-is-best-for-your-business)
- [Carter Lumber: Benefits of Supplier with Own Fleet](https://www.carterlumber.com/blog/benefits-of-using-a-materials-supplier-with-their-own-fleet-for-commercial-casework-millwork-delivery)
- [Levelset: Credit Manager Role](https://www.levelset.com/blog/credit-manager-role/)
- [Handle: 9 Qualities of Effective Credit Managers in Construction](https://www.handle.com/9-qualities-smart-credit-managers-construction/)
- [ProAlt: Essential Role of a Credit Manager](https://www.proalt.com/the-essential-role-of-a-credit-manager-a-guide-to-navigating-credit-excellence/)
- [Indeed: Accounts Receivable Clerk](https://www.indeed.com/career-advice/finding-a-job/what-does-accounts-receivable-clerk-do)
- [Monster: Accounts Payable and Receivable Job Description](https://hiring.monster.com/resources/job-descriptions/administrative/accounts-receivable-payable-clerk/)
- [Levelset: Accounts Receivable Management for Construction](https://www.levelset.com/blog/accounts-receivable-management-for-construction-industry-controllers/)
- [RingCentral: What is B2B Customer Service](https://www.ringcentral.com/us/en/blog/b2b-customer-service/)
- [Kommunicate: AI Customer Service Escalation](https://www.kommunicate.io/blog/ai-customer-service-escalation/)
- [Social Intents: AI Chatbot with Human Handoff](https://www.socialintents.com/blog/ai-chatbot-with-human-handoff/)
- [Replicant: When to Hand Off to a Human](https://www.replicant.com/blog/when-to-hand-off-to-a-human-how-to-set-effective-ai-escalation-rules)
- [Creatuity: B2B Quote-to-Order Workflow Optimization](https://www.creatuity.com/insights/b2b-quote-to-order-workflow-optimization-2026/)
- [KVY Technology: Quote-Based Ordering in B2B](https://kvytechnology.com/blog/ecommerce/quote-based-ordering-in-b2b/)
- [DealHub: What is Quote-to-Order](https://dealhub.io/glossary/quote-to-order/)
- [TheOrg: Foundation Building Materials Org Chart](https://theorg.com/org/foundation-building-materials)
- [Procore: Construction Company Hierarchy](https://www.procore.com/library/construction-company-organizational-chart)
- [NetSuite: Procurement KPIs](https://www.netsuite.com/portal/resource/articles/erp/procurement-kpis.shtml)
- [Financial Models Lab: Construction Materials KPIs](https://financialmodelslab.com/blogs/kpi-metrics/construction-materials)
- [CSI Market: Wholesale Industry Efficiency](https://csimarket.com/Industry/industry_Efficiency.php?ind=1310)
- [ER Marketing: KPI Cheat Sheet for Building Materials Industry](https://ermarketing.net/navigate-the-channel/kpi-cheat-sheet-for-the-building-materials-industry/)
- [Ironspring Ventures: The Rise of Building Material Distributors](https://ironspring.com/4-the-rise-of-the-building-material-distributors/)
- [OroCommerce: B2B eCommerce for Construction Industry](https://oroinc.com/b2b-ecommerce/construction-material-b2b-ecommerce/)
- [Coaxsoft: How to Launch Online Marketplace for Building Materials](https://coaxsoft.com/blog/how-to-launch-an-online-marketplace-for-selling-building-materials)
