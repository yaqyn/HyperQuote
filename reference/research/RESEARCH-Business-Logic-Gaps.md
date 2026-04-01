> ⚠️ **REFERENCE DOCUMENT — NOT THE SOURCE OF TRUTH**
> This file was written during the research phase and may contain outdated decisions, US-centric references, or superseded technical choices.
> **Always defer to `essential/RESEARCH.md` for current decisions.**
> Key changes since this file was written: TanStack Start (not Next.js), Capacitor (not Expo), React Aria (not shadcn), Egyptian law (not US FMCSA), EGP (not USD), dual auth pools, no online payments, no mobile wallets, spatial glass UI (not traditional dashboards).

# HyperQuote - Complete Business Logic Gaps Analysis
# Every Missing Piece Across 15 Domains
**Date:** 2026-03-28 | **Method:** Web research + gap analysis against existing RESEARCH.md

---

## STATUS LEGEND
- **MISSING** = Not covered at all in existing research
- **SHALLOW** = Mentioned but lacks implementation detail
- **NEEDS RULES** = Concept exists but specific business rules not defined

---

## 1. PRICING ENGINE LOGIC

### What Exists
The existing research covers margin benchmarks by category (lumber 15-20%, cement 18-22%, steel 12-18%, roofing 22-28%, specialty 30-45%) and mentions floor margins. It mentions "margin engine applies rules" but never specifies HOW.

### MISSING: Complete Price Waterfall
The industry-standard B2B pricing model is a **price waterfall** — a cascading series of deductions from list price to pocket price. HyperQuote needs this fully defined:

```
Supplier Cost (landed)
  + Margin (by rule priority)
  = Internal Target Price
  - Customer-specific discount
  - Volume discount (tier-based)
  - Multi-line/bundle discount
  - Project discount
  - Early payment discount (2/10 Net 30)
  - Promotional discount
  = Quoted Price (what customer sees)
  - Actual early payment taken
  - Freight allowance
  - Returns/credits
  = Pocket Price (actual realized revenue)
  - Cost to serve (delivery, handling, credit cost)
  = Pocket Margin (true profitability)
```

**GAP: The system tracks NONE of the pocket price deductions. Without this, the CEO cannot see true profitability per customer/order.**

### MISSING: Rule Priority Engine (Exact Logic)

The pricing engine must evaluate rules in strict priority order. First match wins:

| Priority | Rule Type | Example | Override? |
|----------|-----------|---------|-----------|
| 1 | Contract price (fixed) | "Henderson Construction gets $42/bag cement for 12 months" | No — locked by contract |
| 2 | Customer-specific price | "ABC Builders gets 8% off cement" | Sales Manager can adjust |
| 3 | Customer tier price | "Gold tier = 5% off all categories" | Automatic |
| 4 | Project-based price | "Mall Project = special pricing on steel" | Sales Manager |
| 5 | Volume tier price | "500+ bags = $44/bag" | Automatic |
| 6 | Category default margin | "Cement = 20% margin" | Only Procurement Manager |
| 7 | Global default margin | "All products = 25% margin" | Only Admin |

**Implementation needed:**
```sql
-- Price resolution function (pseudocode)
FUNCTION resolve_price(product_id, customer_id, project_id, quantity):
  -- 1. Check active contract for this customer + product
  price = contracts.find(customer_id, product_id, active=true)
  IF price THEN RETURN {price, source: 'contract'}

  -- 2. Check customer-specific price list
  price = customer_prices.find(customer_id, product_id)
  IF price THEN RETURN {price, source: 'customer_specific'}

  -- 3. Check customer tier pricing
  tier = customers.get_tier(customer_id)
  discount = tier_discounts.find(tier, product.category_id)
  IF discount THEN RETURN {base_price * (1 - discount), source: 'tier'}

  -- 4. Check project pricing
  IF project_id THEN
    price = project_prices.find(project_id, product_id)
    IF price THEN RETURN {price, source: 'project'}

  -- 5. Check volume breaks
  volume_price = volume_tiers.find(product_id, quantity)
  IF volume_price THEN RETURN {volume_price, source: 'volume'}

  -- 6. Apply category margin
  cost = get_supplier_cost(product_id)  -- weighted avg or selected supplier
  margin = category_margins.find(product.category_id)
  RETURN {cost * (1 + margin), source: 'category_default'}
```

### MISSING: Multi-Supplier Cost Resolution

When the same product (e.g., OPC 50kg cement) is available from 3 suppliers at different costs, how does the system determine the "cost" for margin calculation?

**Options (need to pick one or allow configuration):**

| Method | How It Works | When to Use |
|--------|-------------|-------------|
| **Weighted Average Cost (WAC)** | Total inventory value / total units | When inventory is stocked and commingled (Phase 2+) |
| **Last Purchase Price** | Most recent supplier cost | Quick estimates, drop-ship Phase 1 |
| **Lowest Available Cost** | Cheapest supplier who has stock | Maximize margin |
| **Selected Supplier Cost** | Cost from the specific supplier chosen for this order | Most accurate per-order |
| **FIFO** | Cost of oldest inventory first | When tracking lot-level inventory |

**Recommendation:** Phase 1 (drop-ship) use **Selected Supplier Cost** since each order sources from a specific supplier. Phase 2+ (stocked inventory) use **Weighted Average Cost** — this is the most common method for building materials where bags of cement from different suppliers are commingled in a warehouse.

**GAP: The existing research mentions inventory but never addresses inventory costing method. This affects every P&L report, every margin calculation, and QuickBooks sync.**

### MISSING: Multi-Line / Bundle Discount Rules

When a customer orders multiple product categories together, additional discounts should apply:

```json
{
  "bundle_rules": [
    {
      "name": "Foundation Package",
      "condition": "order contains cement AND rebar AND sand",
      "discount": "additional 2% off total",
      "minimum_value": 50000
    },
    {
      "name": "Structural Steel Bundle",
      "condition": "order contains rebar AND structural steel AND wire mesh",
      "discount": "additional 3% off steel items",
      "minimum_value": 100000
    },
    {
      "name": "Full House Package",
      "condition": "order contains items from 5+ categories",
      "discount": "additional 1.5% off total",
      "minimum_value": 200000
    }
  ]
}
```

**Implementation:** Bundle rules evaluated AFTER individual line pricing. Discount stacking: bundle discounts are additive to volume discounts but subject to floor margin check. If applying the bundle discount would push any line item below floor margin, that line is excluded from the bundle discount.

### MISSING: Price Versioning and Audit

Every price change must create a new version:

```
price_list_versions:
  - version: 1, effective_date: 2026-01-01, created_by: procurement_mgr
  - version: 2, effective_date: 2026-03-15, created_by: procurement_mgr, reason: "supplier cost increase"

price_change_impacts:
  - When a supplier price changes, system must:
    1. Flag all OPEN quotes that used the old price
    2. Calculate margin impact on each affected quote
    3. Notify quoting specialist: "Quote Q-1234 margin dropped from 22% to 14%"
    4. If margin < floor: auto-flag for re-quote
```

### MISSING: Quote Margin Approval Thresholds

| Margin Level | Approval Required |
|-------------|-------------------|
| >= Category target | Auto-approved |
| >= Floor margin but < target | Sales Manager approval |
| < Floor margin but >= absolute minimum (8%) | VP Sales / GM approval |
| < Absolute minimum (8%) | CEO approval (strategic deal) |
| < 0% (loss leader) | CEO + documented justification |

---

## 2. TAX CALCULATION

### What Exists
The existing research mentions "Avalara API" and "tax calculation" in passing but provides zero implementation detail.

### MISSING: US Destination-Based Tax Logic

**Core rule:** Tax is calculated based on the DELIVERY ADDRESS, not the billing address or company address.

```
Tax Determination Flow:
1. Get delivery address (street, city, state, ZIP)
2. Call Avalara AvaTax API with:
   - Ship-to address (delivery site)
   - Ship-from address (warehouse or supplier for drop-ship)
   - Product tax codes (per line item)
   - Customer tax exemption status
   - Transaction date
3. Avalara returns tax breakdown by jurisdiction:
   - State tax: X%
   - County tax: Y%
   - City tax: Z%
   - Special district tax: W%
   - Total: X+Y+Z+W%
4. Store tax breakdown per line item on the quote/invoice
```

**Multi-jurisdiction complexity for building materials:**
- A single order delivered to a construction site in Texas has: state (6.25%) + city (up to 2%) = up to 8.25%
- Same product delivered to a site 5 miles away in a different city could be different rate
- Some states tax delivery charges (if delivered by seller's own vehicle), others don't
- Some states tax building materials differently than finished goods

### MISSING: Contractor Tax Exemption Handling

Contractors are treated differently across states:

| State Tax Treatment | States | What It Means |
|-------------------|--------|---------------|
| Contractor is end consumer | FL, AZ, HI, MS, NM | Contractor pays tax when buying materials. NO tax exemption. |
| Contractor is reseller (lump-sum) | NY, TX, CA (varies by contract type) | May claim resale exemption depending on contract structure |
| Contractor is exempt on government projects | Most states | Tax-exempt when working on government/public projects |
| Materials taxed, labor exempt | Many states | Materials always taxed, installation labor may be exempt |

**System requirements:**
1. **Tax Exemption Certificate Store** — customers upload certificates per state
2. **Certificate Validation** — expiration date tracking, auto-renewal reminders
3. **Certificate-to-Order Matching** — when customer places order, check if valid cert exists for delivery state
4. **Partial Exemption** — some items exempt (raw materials) while others taxed (tools, equipment)
5. **Avalara CertCapture Integration** — or equivalent for managing exemption certificates

```
Entity: tax_exemption_certificates
  - id
  - customer_id
  - state_code (or country for international)
  - certificate_number
  - exemption_type (resale, government, nonprofit, manufacturing)
  - effective_date
  - expiration_date
  - document_url (R2 stored PDF/image)
  - status (pending_review, active, expired, revoked)
  - verified_by (employee who verified)
  - verified_at
```

### MISSING: UAE/Saudi VAT Implementation

| Country | VAT Rate | E-Invoicing Required? | Key Rules |
|---------|---------|----------------------|-----------|
| UAE | 5% | No (voluntary) | Zero-rate on new residential construction; standard rate on commercial |
| Saudi Arabia | 15% | Yes (mandatory for SAR 7M+ revenue since Jan 2025) | ZATCA Phase 2 e-invoicing with QR code |
| Oman | 5% | No | Standard on most building materials |
| Bahrain | 10% | No | Standard on most building materials |
| Qatar | 0% (no VAT yet) | N/A | Expected to implement; monitor |
| Kuwait | 0% (no VAT yet) | N/A | Expected to implement; monitor |

**UAE construction-specific VAT rules:**
- New residential buildings: first supply is zero-rated
- Commercial construction: standard 5%
- Bare land: exempt
- Building materials sold standalone: standard 5%
- Mixed-use buildings require apportionment based on floor area

**Saudi ZATCA e-invoicing requirements:**
- Phase 2 (Integration Phase): invoices must be generated in specific XML/PDF-A3 format
- Each invoice must include QR code with: seller name, VAT number, timestamp, total, VAT amount
- Invoice must be reported to ZATCA within 24 hours
- Clearance required for B2B invoices (real-time validation)

**GAP: If HyperQuote operates in UAE/Saudi, ZATCA e-invoicing compliance is mandatory and affects the entire invoice generation pipeline. This is NOT optional.**

### MISSING: Avalara Integration Architecture

```
Quote Creation:
  -> Estimate tax (Avalara AvaTax estimate call) -> show on quote
  -> Tax shown as "estimated" until delivery confirmed

Invoice Creation (triggered by delivery confirmation):
  -> Calculate final tax (Avalara AvaTax commit call)
  -> Record tax in Avalara for filing
  -> Tax shown as "final" on invoice

Tax Filing:
  -> Avalara Returns handles state-by-state filing
  -> Monthly/quarterly depending on state requirements
  -> Avalara manages nexus determination

API Integration Point:
  Supabase Edge Function -> Avalara AvaTax REST API
  - POST /api/v2/transactions/create (for tax calculation)
  - POST /api/v2/transactions/{id}/commit (for final recording)
  - Rate: ~$0.01-0.04 per transaction
  - Latency: 50-200ms per call
  - Cache: Tax rates can be cached for 24h for estimation
```

---

## 3. CREDIT MANAGEMENT SYSTEM

### What Exists
The existing research has credit limit tiers ($0-100K, $100K-1M, $1M-10M, $10M+) and mentions automated credit checks on every order. But the WORKFLOW is not defined.

### MISSING: Credit Application Workflow (Step by Step)

```
Stage 1: Application Submitted
  Customer fills credit application form:
  - Company legal name, DBA, address
  - Tax ID / EIN
  - Years in business
  - Annual revenue range
  - Requested credit limit
  - Bank reference (bank name, account number, contact)
  - 3 trade references (company, contact, phone, account number)
  - Owner/officer personal guarantee (if requested)
  - Signed authorization to check credit

Stage 2: Automated Data Collection (parallel, 1-2 days)
  System automatically:
  a) Pull D&B report (PAYDEX score, D&B Rating, financial stress)
  b) Pull Experian Business report (Intelliscore, payment history)
  c) Send trade reference requests (email template with web form link)
  d) Verify business entity (Secretary of State lookup)
  e) Check OFAC/sanctions list
  f) Check mechanic's lien filings (construction-specific)

Stage 3: Credit Scoring (automated)
  Internal credit score calculated:

  | Factor | Weight | Source |
  |--------|--------|--------|
  | D&B PAYDEX score | 20% | D&B API |
  | Experian Intelliscore | 15% | Experian API |
  | Years in business | 10% | Application |
  | Trade reference avg days to pay | 20% | Reference responses |
  | Bank reference (satisfactory/unsatisfactory) | 10% | Bank response |
  | Revenue vs requested limit ratio | 10% | Application |
  | Industry risk (construction sector risk) | 10% | Internal model |
  | Prior relationship history | 5% | Internal data |

  Score ranges:
  - 80-100: Excellent — approve at requested limit
  - 60-79: Good — approve at 75% of requested or with conditions
  - 40-59: Fair — approve at 50% with monthly review
  - 20-39: Poor — COD only, or approve small limit with personal guarantee
  - 0-19: Decline — too risky, COD or prepayment only

Stage 4: Credit Decision
  Based on score and requested limit:

  | Requested Limit | Score >= 60 | Score 40-59 | Score < 40 |
  |----------------|-------------|-------------|------------|
  | < $50K | Auto-approve | Credit Mgr review | Decline/COD |
  | $50K-$250K | Credit Mgr approve | Credit Mgr + FM | Decline/COD |
  | $250K-$1M | FM approve | FM + VP Finance | Decline |
  | > $1M | VP Finance approve | CFO/CEO approve | Decline |

Stage 5: Notification
  - Approved: customer notified with terms, welcome packet
  - Conditional: customer notified with requirements (personal guarantee, etc.)
  - Declined: customer offered COD terms, no reason required to disclose

Stage 6: Ongoing Monitoring
  - D&B monitoring alerts (PAYDEX drops, legal filings, ownership changes)
  - Payment behavior tracking (internal DSO per customer)
  - Annual review of all accounts > $100K
  - Quarterly review of all accounts with late payments
  - Auto-reduce limit if DSO exceeds 2x terms
```

### MISSING: Credit Hold Logic (What Blocks an Order)

```
Order Submission Check (synchronous, <500ms):

CHECK 1: Credit limit
  IF (customer.ar_balance + order.total) > customer.credit_limit
  THEN → HOLD: "Credit limit exceeded"
  Action: Order enters CREDIT_HOLD state
  Notify: Credit Manager, Sales Rep

CHECK 2: Overdue balance
  IF customer has ANY invoice overdue > 60 days
  THEN → HOLD: "Past due balance"
  Action: Order enters CREDIT_HOLD state
  Notify: Credit Manager, AR Clerk

CHECK 3: Payment terms compliance
  IF customer.avg_days_to_pay > (customer.terms * 1.5)
  THEN → WARNING (not hold): "Customer consistently pays late"
  Action: Flag for Sales Manager review, order can proceed

CHECK 4: Disputed invoices
  IF customer has > 3 disputed invoices
  THEN → WARNING: "Multiple disputes"
  Action: Flag for Credit Manager review

CHECK 5: Credit expired
  IF customer.credit_review_date < today - 365 days
  THEN → HOLD: "Credit review overdue"
  Action: Trigger credit re-review

CHECK 6: External alerts
  IF D&B monitoring shows PAYDEX drop > 20 points in 30 days
  THEN → HOLD: "External credit deterioration"
  Action: Immediate credit review triggered
```

### MISSING: Credit Release Workflow

```
Credit Hold Resolution:

Option A: Override (authorized users only)
  - Sales Manager can override for orders < $25K with documented reason
  - VP Sales can override for orders < $100K
  - CEO can override any amount
  - All overrides logged in audit trail with reason

Option B: Partial Release
  - Release order up to remaining credit limit
  - Hold amount exceeding limit until payment received

Option C: Payment Required
  - Customer pays overdue balance → system auto-releases held orders
  - Customer makes partial payment → releases orders in FIFO order up to freed credit

Option D: Temporary Credit Increase
  - Credit Manager grants temporary increase (30-60 days)
  - System auto-reverts to original limit on expiry
  - Requires documented justification

Option E: Secured Release
  - Customer provides additional security (LC, personal guarantee, lien waiver)
  - Credit Manager approves with security documentation
```

### MISSING: Credit Insurance Integration

**Trade credit insurance** covers 80-90% of losses when customers default:

```
Policy Management:
  - Carrier: Allianz Trade (Euler Hermes), Atradius, or Coface
  - Coverage: typically 80-90% of invoice value
  - Cost: ~$1.00-$1.50 per $1,000 of insured sales (0.1-0.15%)
  - Per-buyer limits: insurer sets max coverage per customer

System Integration:
  Entity: credit_insurance_policies
    - policy_number
    - carrier (allianz_trade, atradius, coface)
    - effective_date, expiry_date
    - aggregate_limit
    - per_buyer_default_limit

  Entity: credit_insurance_buyer_limits
    - customer_id
    - insured_limit (max covered per customer)
    - status (approved, declined, pending, reduced)

  Business Logic:
    - When setting credit limit: credit_limit = MAX(internal_assessment, insured_limit)
    - When customer defaults: file claim with carrier, track claim status
    - When insurer reduces/declines buyer: auto-reduce credit limit, notify Credit Mgr
    - Monthly premium reporting: insured sales volume to carrier
```

---

## 4. REPORTING AND ANALYTICS

### What Exists
The existing research lists some KPIs per role dashboard but lacks specific report definitions, frequencies, and data sources.

### MISSING: Complete Report Catalog by Role

#### Sales Reports (Daily/Weekly/Monthly)

| Report | Frequency | Audience | Key Metrics |
|--------|-----------|----------|-------------|
| Pipeline Report | Daily | Sales Rep, Sales Mgr | Open quotes by stage, value, age, probability |
| Quote Aging | Daily | Sales Rep | Quotes > 7 days without response, expiring within 48h |
| Win/Loss Analysis | Weekly | Sales Mgr | Conversion rate by rep, by product category, by customer tier |
| Customer Activity | Weekly | Account Mgr | Orders per customer vs last period, inactive accounts, at-risk accounts |
| Revenue Forecast | Weekly | Sales Mgr, VP Sales | Expected close by week, weighted pipeline, actual vs forecast |
| Sales Rep Scorecard | Monthly | Sales Mgr | Quotes sent, win rate, revenue, avg margin, response time |
| Customer Profitability | Monthly | Sales Mgr, Finance | Revenue - COGS - cost to serve per customer (top 20, bottom 20) |
| Lost Deal Analysis | Monthly | VP Sales | Reasons for lost quotes, competitor mentions, price sensitivity |
| Cross-Sell Opportunity | Monthly | Sales Rep | Customers buying in <3 categories vs potential |
| New Customer Acquisition | Monthly | VP Sales | New accounts, first order value, acquisition channel |

#### Procurement Reports

| Report | Frequency | Audience | Key Metrics |
|--------|-----------|----------|-------------|
| Supplier Response Time | Daily | Buyer | Avg time to respond to RFQs by supplier |
| Price Comparison | Per-RFQ | Buyer | Side-by-side supplier pricing for same product |
| Supplier Scorecard | Monthly | Category Mgr | On-time delivery %, quality reject rate, price competitiveness, responsiveness |
| Cost Trend Analysis | Monthly | Category Mgr | Price movement by product category, supplier, market index |
| PO Status Summary | Daily | Buyer | Open POs by status, overdue POs, expected receipts this week |
| Supplier Concentration Risk | Quarterly | Procurement Mgr | Revenue dependency on top suppliers, single-source products |
| Savings Report | Monthly | Procurement Mgr | Negotiated savings vs. last period, vs. market price |
| Inventory Cost Variance | Monthly | Procurement Mgr, Finance | Actual cost vs. standard cost by product |

#### Operations Reports

| Report | Frequency | Audience | Key Metrics |
|--------|-----------|----------|-------------|
| Order Fulfillment | Daily | Ops Mgr | Orders by fulfillment stage, bottlenecks, stuck items |
| On-Time Delivery | Daily/Weekly | Ops Mgr | % delivered on promised date, avg delay, reasons for late |
| Delivery Cost | Weekly | Ops Mgr | Cost per delivery, cost per mile, cost per stop |
| Driver Utilization | Daily | Dispatcher | Deliveries per driver, miles, hours, idle time |
| Failed Delivery Report | Daily | Dispatcher, Ops Mgr | Failed deliveries with reasons, costs, resolution status |
| Route Efficiency | Weekly | Dispatcher | Planned vs actual routes, miles, stops, time |
| Warehouse Throughput | Daily | Warehouse Mgr | Items received, picked, shipped, cycle count accuracy |
| Backorder Report | Daily | Ops Mgr | Items on backorder, expected availability, customer impact |

#### Finance Reports

| Report | Frequency | Audience | Key Metrics |
|--------|-----------|----------|-------------|
| Daily Cash Position | Daily | Controller | Cash on hand, expected inflows (7 days), expected outflows (7 days) |
| AR Aging | Daily | AR Clerk, Controller | Current, 1-30, 31-60, 61-90, 90+ by customer |
| AP Aging | Weekly | AP Clerk, Controller | Current, 1-30, 31-60 by supplier |
| 13-Week Cash Forecast | Weekly | Controller, CFO | Week-by-week projected cash position |
| Margin Analysis | Weekly | Controller | Gross margin by customer, product category, sales rep |
| Credit Utilization | Weekly | Credit Mgr | Credit used vs limit by customer, approaching limit |
| Collections Activity | Daily | AR Clerk | Calls made, promises to pay, broken promises, escalations |
| Invoice Dispute Summary | Weekly | Controller | Open disputes by category, age, value |
| Payment Application | Daily | AR Clerk | Payments received, matched, unmatched, overpayments |
| Revenue Recognition | Monthly | Controller | Revenue by delivery date, deferred revenue, adjustments |
| P&L by Segment | Monthly | Controller, CEO | Profit by customer tier, product category, region, project |
| Balance Sheet | Monthly | Controller | Standard B/S with AR, AP, inventory detail |
| Tax Liability Summary | Monthly | Controller | Sales tax collected by jurisdiction, VAT liability |

#### Executive Reports (CEO Dashboard Data Feeds)

| Report | Frequency | Audience | Key Metrics |
|--------|-----------|----------|-------------|
| KPI Scorecard | Real-time | CEO, GM | Revenue (MTD/YTD), margin, cash, OTIF, customer count |
| Exception Alert Digest | Daily AM | CEO | Items requiring attention: large orders, credit issues, delivery failures |
| Weekly Business Review | Weekly | CEO, Leadership | Revenue vs plan, pipeline, collections, operational metrics |
| Monthly Business Review | Monthly | CEO, Board | Full P&L, B/S, cash flow, headcount, market analysis |
| Customer Concentration | Monthly | CEO | Top 10 customers as % of revenue, trend |
| Working Capital Report | Weekly | CEO, CFO | DSO, DPO, inventory days, cash conversion cycle |

### MISSING: KPIs That Feed the CEO Dual-AI

The Analytics AI needs these pre-computed metrics:

```
Metric Library (50+ parameterized queries):

Revenue Metrics:
  - total_revenue(period, segment?)
  - revenue_by_customer(period, top_n?)
  - revenue_by_category(period)
  - revenue_by_region(period)
  - revenue_growth_rate(period, comparison_period)
  - average_order_value(period)
  - revenue_per_employee(period)

Margin Metrics:
  - gross_margin_pct(period, segment?)
  - margin_by_customer(period)
  - margin_by_category(period)
  - margin_by_sales_rep(period)
  - pocket_margin_vs_quoted_margin(period) -- THE KEY GAP
  - margin_erosion_waterfall(period)

Cash Metrics:
  - cash_position(date)
  - cash_forecast(weeks_ahead)
  - dso(period) -- Days Sales Outstanding
  - dpo(period) -- Days Payable Outstanding
  - cash_conversion_cycle(period)

Operations Metrics:
  - on_time_in_full_rate(period)
  - average_delivery_time(period)
  - quote_to_order_conversion_rate(period)
  - average_quote_response_time(period)
  - first_attempt_delivery_rate(period)
  - delivery_cost_per_revenue_pct(period)

Customer Metrics:
  - active_customers(period)
  - new_customers(period)
  - churned_customers(period, inactive_days?)
  - customer_lifetime_value(customer_id?)
  - net_promoter_score(period)
  - customer_concentration_index(period)

Supplier Metrics:
  - supplier_on_time_rate(period, supplier_id?)
  - supplier_quality_rate(period, supplier_id?)
  - supplier_price_competitiveness(period)
  - single_source_product_count()
```

---

## 5. USER PERMISSIONS AND RBAC

### What Exists
The existing research defines roles (25+) and mentions Supabase RLS with custom access token hooks. But the actual permission matrix is missing.

### MISSING: Complete Permission Matrix

#### Permission Model Structure

```
Permissions are defined as: {module}.{resource}.{action}

Modules: sales, procurement, operations, warehouse, finance, dispatch, cs, crm, admin, reports
Resources: quotes, orders, products, suppliers, customers, invoices, payments, deliveries, users, settings
Actions: view, create, edit, delete, approve, export

Special permissions:
  - pricing.override_margin (override margin below target)
  - pricing.override_floor (override margin below floor — dangerous)
  - credit.override_hold (release credit-held orders)
  - credit.set_limit (set/change credit limits)
  - order.cancel_confirmed (cancel a confirmed order)
  - finance.void_invoice (void a posted invoice)
  - finance.write_off (write off bad debt)
  - admin.manage_users (create/edit/deactivate users)
  - admin.manage_roles (create/edit roles and permissions)
  - reports.view_cost (see supplier costs — sensitive)
  - reports.view_margin (see margins — sensitive)
  - reports.export_data (export data to CSV/Excel)
```

#### Permission Matrix (Key Roles x Key Resources)

| Permission | CEO | Sales Mgr | Sales Rep | Buyer | Credit Mgr | Controller | Warehouse Mgr | Dispatcher | CS Rep | Driver |
|-----------|-----|-----------|-----------|-------|------------|------------|---------------|------------|--------|--------|
| quotes.view | All | Team's | Own | Related | Related | All | No | No | Related | No |
| quotes.create | Yes | Yes | Yes | No | No | No | No | No | No | No |
| quotes.edit | Yes | Team's | Own draft | No | No | No | No | No | No | No |
| quotes.approve | Yes | Below $X | No | No | No | No | No | No | No | No |
| quotes.view_cost | Yes | Yes | No | Yes | No | Yes | No | No | No | No |
| orders.view | All | Team's | Own | Related | Related | All | Confirmed+ | Dispatched | Related | Assigned |
| orders.cancel | Yes | With approval | No | No | No | No | No | No | No | No |
| products.view | All | All | All | All | No | No | All | No | All | No |
| products.edit | Yes | No | No | Yes | No | No | No | No | No | No |
| suppliers.view | Yes | Limited | No | All | No | All | No | No | No | No |
| suppliers.edit | Yes | No | No | Yes | No | No | No | No | No | No |
| customers.view | All | Team's | Own | No | All | All | No | No | Related | No |
| customers.edit_credit | Yes | No | No | No | Yes | Yes | No | No | No | No |
| invoices.view | All | Own cust | Own cust | No | Related | All | No | No | Related | No |
| invoices.create | Yes | No | No | No | No | Yes | No | No | No | No |
| invoices.void | Yes | No | No | No | No | Yes (approval) | No | No | No | No |
| payments.record | Yes | No | No | No | No | Yes | No | No | No | No |
| payments.view | All | No | No | No | Yes | All | No | No | No | No |
| deliveries.view | All | Own cust | Own cust | No | No | No | All | All | Related | Assigned |
| deliveries.assign_driver | Yes | No | No | No | No | No | Yes | Yes | No | No |
| pricing.view_margin | Yes | Yes | No | Yes | No | Yes | No | No | No | No |
| pricing.override_margin | Yes | Yes | No | No | No | No | No | No | No | No |
| pricing.override_floor | Yes | No | No | No | No | No | No | No | No | No |
| credit.override_hold | Yes | No | No | No | Yes | Yes | No | No | No | No |
| reports.view_cost | Yes | No | No | Yes | No | Yes | No | No | No | No |
| reports.export_data | Yes | Yes | No | Yes | Yes | Yes | Yes | No | No | No |
| admin.manage_users | Yes | No | No | No | No | No | No | No | No | No |

### MISSING: Temporary Permission Delegation (Vacation Coverage)

```
Entity: permission_delegations
  - id
  - delegator_user_id (person going on vacation)
  - delegate_user_id (person covering)
  - permissions[] (specific permissions being delegated)
  - start_date
  - end_date
  - reason ("Annual leave", "Medical", "Training")
  - approved_by (must be delegator's manager)
  - status (active, expired, revoked)
  - created_at

Business Rules:
  - Delegation cannot grant permissions the delegator doesn't have
  - Delegation auto-expires at end_date (cron job)
  - All actions during delegation period logged with "acting_as" flag
  - Delegator can revoke at any time
  - Max delegation period: 30 days (longer requires admin approval)
  - Cannot delegate admin.manage_users or admin.manage_roles
  - Cannot delegate pricing.override_floor
```

### MISSING: Data Scope Rules

Beyond permission types, WHO can see WHAT data:

```
Data Scope Rules:
  - Sales Rep: sees only customers assigned to them
  - Sales Manager: sees all customers assigned to their team
  - Regional Manager: sees all customers in their region
  - VP Sales: sees all customers

  - Buyer: sees all suppliers in their assigned categories
  - Procurement Manager: sees all suppliers

  - CS Rep: sees tickets assigned to them + unassigned in their queue
  - CS Manager: sees all tickets

  - Driver: sees only deliveries assigned to them for today + next day
  - Dispatcher: sees all deliveries in their region/warehouse

  - Warehouse Worker: sees orders for their assigned warehouse
  - Warehouse Manager: sees orders for all warehouses they manage
```

---

## 6. AUDIT TRAIL AND COMPLIANCE

### What Exists
The existing research mentions `supa_audit` extension and `audit_log` via triggers. But WHAT to log is not defined.

### MISSING: Complete Audit Event Catalog

#### Financial Events (SOX-relevant, 7-year retention)

| Event | What to Log | Why |
|-------|-------------|-----|
| Price change | Old price, new price, product, changed by, reason, approval | Margin integrity |
| Margin override | Quote ID, standard margin, overridden margin, approver, reason | Revenue assurance |
| Credit limit change | Customer, old limit, new limit, changed by, supporting docs | Credit risk |
| Credit hold override | Order ID, hold reason, overrider, authorization level | Financial control |
| Invoice creation | Invoice ID, order ID, amounts, tax, created by | Revenue recognition |
| Invoice modification | Invoice ID, field changed, old value, new value, reason | Audit integrity |
| Invoice void/cancel | Invoice ID, reason, approved by, offsetting entries | Financial accuracy |
| Payment recording | Payment ID, amount, method, invoice(s) matched, recorded by | Cash management |
| Payment reversal | Payment ID, reason, reversed by, approved by | Fraud prevention |
| Write-off | Customer, amount, aged days, approved by, approval chain | Bad debt management |
| Credit note issuance | Credit note ID, reason, amount, approved by | Revenue adjustment |
| Supplier payment | PO, amount, payment method, authorized by | AP control |

#### Operational Events (2-year retention)

| Event | What to Log | Why |
|-------|-------------|-----|
| Order status change | Order ID, old status, new status, changed by, timestamp | Fulfillment tracking |
| Quote status change | Quote ID, old status, new status, changed by | Pipeline tracking |
| Delivery status change | Delivery ID, old/new status, driver, GPS coordinates | Chain of custody |
| Inventory adjustment | Product, quantity change, reason, adjusted by, count ref | Inventory accuracy |
| Supplier PO change | PO ID, field changed, old/new value, changed by | Procurement integrity |
| Customer data change | Customer ID, field changed, old/new, changed by | Data integrity |

#### Security Events (retain indefinitely)

| Event | What to Log | Why |
|-------|-------------|-----|
| Login (success/fail) | User, IP, device, timestamp, method | Security monitoring |
| Permission change | User, old roles, new roles, changed by | Access control |
| Permission delegation | Delegator, delegate, permissions, period | Audit trail |
| Data export | User, data type, record count, format | Data loss prevention |
| Failed authorization | User, attempted action, resource, denied reason | Threat detection |
| API key creation/revocation | Key ID, scope, created/revoked by | API security |

### MISSING: SOX Compliance Considerations

Even as a private company, preparing for SOX-readiness is valuable for future IPO or acquisition:

```
SOX Section 302: Management Certification
  - CEO and CFO certify financial reports accuracy
  - Requires: documented financial controls, segregation of duties

SOX Section 404: Internal Controls
  - Document ALL controls over financial reporting
  - HyperQuote controls needed:
    1. Segregation of duties (who can create vs approve)
    2. Access controls (who can see financial data)
    3. Change management (all system changes logged)
    4. Reconciliation controls (bank recs, AR/AP matching)
    5. Approval hierarchies (quote approval, credit approval, payment approval)

Data Retention Requirements:
  - Financial records: 7 years minimum
  - Audit work papers: 7 years
  - Email/communications related to financial matters: 7 years
  - System access logs: 7 years
  - Tax records: 7 years (IRS) or state-specific
  - Employee records: 3-7 years post-employment

  Implementation:
  - Hot storage (Supabase): 2 years detailed
  - Warm storage (R2 archives): 2-5 years compressed
  - Cold storage (R2 Glacier-equivalent): 5-7 years
  - pg_cron job to move data between tiers
  - WORM (Write-Once-Read-Many) for financial records
```

### MISSING: What Auditors Actually Check in a Distribution Company

```
External Audit Focus Areas:
  1. Revenue recognition: Is revenue recorded when delivery occurs? (ASC 606 / IFRS 15)
     - Check: delivery confirmation timestamp vs invoice date
     - Check: are partial deliveries recognized correctly?

  2. Accounts receivable: Are AR balances real?
     - Check: customer confirmations (AR balance letters)
     - Check: aging accuracy, bad debt provisions
     - Check: credit memo justification

  3. Inventory: Does physical match book?
     - Check: cycle count accuracy rate
     - Check: inventory valuation method consistency (WAC/FIFO)
     - Check: obsolescence reserves (building materials can expire/degrade)
     - Check: consignment inventory handling

  4. Accounts payable: Are AP balances complete?
     - Check: three-way matching (PO + receipt + invoice)
     - Check: unrecorded liabilities at period end
     - Check: related party transactions

  5. Cash: Is cash real?
     - Check: bank reconciliations
     - Check: outstanding checks, deposits in transit
     - Check: LC/bank guarantee reconciliation

  6. Pricing/margin: Is pricing consistent?
     - Check: price exception approvals documented
     - Check: margin override authorizations
     - Check: customer discount justifications
```

---

## 7. MULTI-CURRENCY HANDLING

### What Exists
Not addressed at all in existing research. The research mentions UAE/Saudi operations but never addresses currency.

### MISSING: Complete Multi-Currency Framework

#### Currency Configuration

```
Entity: currencies
  - code (USD, AED, SAR, EUR)
  - name
  - symbol
  - decimal_places (2 for most, 0 for some)
  - is_base_currency (boolean — the currency the company reports in)

Entity: exchange_rates
  - from_currency
  - to_currency
  - rate
  - rate_date
  - source (manual, api_xe, api_ecb, api_openexchange)
  - type (spot, contracted, budget)

Entity: currency_settings (per tenant)
  - base_currency (AED for UAE tenant, SAR for Saudi tenant, USD for US tenant)
  - exchange_rate_source (manual, automatic API)
  - exchange_rate_update_frequency (daily, hourly)
  - revaluation_frequency (monthly, quarterly)
  - rounding_method (up, down, half_up, banker)
```

#### Multi-Currency Transaction Flow

```
Scenario: UAE company buys from Chinese supplier in USD, sells to customer in AED

1. Supplier PO created in USD:
   PO Amount: $50,000 USD
   Exchange rate at PO date: 3.6725 AED/USD
   AED equivalent: AED 183,625

2. Goods received (2 weeks later):
   Exchange rate at receipt: 3.6750 AED/USD
   Inventory recorded at: AED 183,750

3. Customer invoiced in AED:
   Sale price: AED 220,000 (20% margin on receipt-date cost)

4. Supplier paid in USD (Net 30):
   Exchange rate at payment: 3.6800 AED/USD
   Actual payment in AED: AED 184,000
   FX Loss: AED 184,000 - AED 183,750 = AED 250 (unrealized → realized)

5. Period-end revaluation:
   All open USD-denominated AP/AR revalued at closing rate
   Differences posted to "Unrealized FX Gain/Loss" account
```

#### Display Rules

```
Customer-facing (quotes, invoices):
  - Always in customer's preferred currency
  - Exchange rate shown if different from base currency
  - Rate lock: quoted price locked for quote validity period

Internal views:
  - Default: base currency
  - Toggle: show in transaction currency
  - Margin calculations always in base currency

Reports:
  - All reports in base currency
  - Option to show dual-currency for international transactions
  - Budget vs actual comparison at budget rate vs actual rate
```

#### Hedging (Phase 3+ / Large Scale)

```
For significant FX exposure ($1M+):
  - Forward contracts: lock exchange rate for future supplier payments
  - System tracks: contract amount, forward rate, maturity date, counterparty
  - At settlement: compare forward rate vs spot rate → calculate hedge effectiveness
  - Accounting: hedge gains/losses recorded per ASC 815 / IFRS 9

  Entity: fx_hedges
    - id, currency_pair, direction (buy/sell)
    - notional_amount, forward_rate
    - trade_date, settlement_date
    - counterparty (bank)
    - related_po_ids[] (which POs this hedge covers)
    - status (open, settled, expired)
    - settlement_rate, gain_loss
```

---

## 8. NOTIFICATIONS SYSTEM - COMPLETE MATRIX

### What Exists
The existing research mentions notification channels and costs but provides no event-to-channel mapping.

### MISSING: Complete Notification Event Matrix

#### Legend
- **IA** = In-App (Supabase Realtime)
- **E** = Email (Resend)
- **S** = SMS (Twilio)
- **W** = WhatsApp (Twilio WhatsApp API)
- **P** = Push (Expo Push / FCM)

#### Quote Events

| Event | Customer | Sales Rep | Sales Mgr | Procurement |
|-------|----------|-----------|-----------|-------------|
| Quote request submitted | IA, E, W | IA, P | IA (if large) | — |
| Quote request assigned | — | IA, P | — | — |
| Supplier pricing received | — | IA | — | IA, P |
| Quote ready for review | — | IA | IA, P | — |
| Quote approved internally | — | IA | — | — |
| Quote sent to customer | IA, E, W, P | IA | IA | — |
| Quote viewed by customer | — | IA | — | — |
| Quote accepted | IA, E, W | IA, P, E | IA, P | IA |
| Quote declined | IA, E | IA, P | IA | — |
| Quote counter-offer | IA, E, W, P | IA, P, E | IA | — |
| Quote expiring (48h) | IA, E, W | IA, P | — | — |
| Quote expired | IA, E | IA | IA | — |

#### Order Events

| Event | Customer | Sales Rep | Ops Mgr | Warehouse | Dispatcher |
|-------|----------|-----------|---------|-----------|------------|
| Order confirmed | IA, E, W | IA | IA | IA, P | — |
| Order on credit hold | — | IA, P | IA | — | — |
| Order released from hold | — | IA | IA | IA, P | — |
| Supplier PO sent | — | — | — | — | — |
| Supplier PO confirmed | — | IA | IA | IA | — |
| Supplier PO delayed | — | IA, P | IA, P | IA | — |
| Order being prepared | IA, P | — | — | — | — |
| Order ready for dispatch | — | — | IA | — | IA, P |
| Order cancelled | IA, E, W | IA, P, E | IA | IA | — |
| Backorder notification | IA, E, W | IA, P | IA, P | IA | — |

#### Delivery Events

| Event | Customer | Driver | Dispatcher | Sales Rep | Ops Mgr |
|-------|----------|--------|------------|-----------|---------|
| Delivery scheduled | IA, E, W | IA, P | IA | — | — |
| Delivery ETA (day-of) | IA, S, W | — | — | — | — |
| Delivery ETA (30 min) | IA, S, P | IA, P | IA | — | — |
| Driver en route | IA, P | — | IA | — | — |
| Driver arrived | IA, P | — | IA | — | — |
| Delivery completed | IA, E, W, P | IA, P | IA | IA | — |
| Delivery failed | IA, E, S, W | IA, P | IA, P, S | IA, P | IA, P |
| Partial delivery | IA, E, W | IA, P | IA | IA | IA |
| Delivery rescheduled | IA, E, W | IA, P | IA | — | — |
| POD available | IA, E | — | IA | — | — |

#### Payment Events

| Event | Customer | Sales Rep | AR Clerk | Credit Mgr | Controller |
|-------|----------|-----------|----------|------------|------------|
| Invoice generated | IA, E, W | IA | IA | — | — |
| Invoice due reminder (7d) | IA, E | — | IA | — | — |
| Invoice overdue (1 day) | E, W | IA | IA, P | — | — |
| Invoice overdue (30d) | E, W, S | IA, P | IA, P | IA | — |
| Invoice overdue (60d) | E, S | IA, P | IA, P | IA, P, E | IA |
| Invoice overdue (90d) | S | IA, P | IA, P | IA, P, E | IA, P |
| Payment received | IA, E | IA | IA, P | — | IA |
| Payment bounced | — | IA, P | IA, P | IA, P, E | IA, P |
| Credit note issued | IA, E | IA | IA | IA | IA |
| Credit limit approaching | — | IA | — | IA, P | — |
| Credit limit exceeded | — | IA, P | — | IA, P, E | IA |

#### Support Events

| Event | Customer | CS Rep | CS Mgr | Related Dept |
|-------|----------|--------|--------|-------------|
| Ticket created | IA, E, W | IA, P | — | — |
| Ticket assigned | — | IA, P | — | — |
| Ticket response | IA, E, W, P | — | — | — |
| Ticket escalated | IA, E | IA, P | IA, P | IA, P |
| Ticket resolved | IA, E, W | IA | — | — |
| SLA breach warning | — | IA, P | IA, P | — |
| SLA breached | — | IA, P | IA, P, E | — |
| Claim filed | IA, E | IA, P | IA | IA, P |
| Claim resolved | IA, E, W | IA | IA | — |

#### System Events

| Event | Recipient | Channel |
|-------|-----------|---------|
| System maintenance window | All active users | IA, E |
| New feature announcement | All users | IA, E |
| Password expiry (7 days) | Affected user | E |
| Account deactivated | Affected user | E |
| API rate limit approaching | Admin | IA, E |
| Integration failure (QuickBooks, Avalara) | Admin, Controller | IA, E, S |
| Database approaching storage limit | Admin | IA, E |
| Unusual login activity | Affected user, Admin | E, S |

#### Escalation Events

| Event | Time Trigger | Escalation To | Channel |
|-------|-------------|---------------|---------|
| Quote unassigned | >30 min | Sales Manager | IA, P |
| Quote un-responded | >4 hours | Sales Manager | IA, P, E |
| Supplier RFQ no response | >48 hours | Procurement Manager | IA, P |
| Credit hold unresolved | >24 hours | VP Finance | IA, P, E |
| Delivery not scheduled | <24h before promise | Ops Manager | IA, P, S |
| Driver no GPS signal | >15 min | Dispatcher | IA, P |
| Failed delivery unresolved | >4 hours | Ops Manager | IA, P |
| Customer complaint unresolved | >24 hours | CS Manager | IA, P, E |
| Invoice dispute unresolved | >7 days | Controller | IA, P, E |

### MISSING: Notification Preferences and Quiet Hours

```
Entity: notification_preferences
  - user_id
  - event_type (enum of all events above)
  - channels[] (which channels enabled)
  - quiet_hours_start (e.g., 22:00)
  - quiet_hours_end (e.g., 07:00)
  - quiet_hours_exceptions[] (critical events that bypass quiet hours)
  - digest_mode (immediate, hourly_digest, daily_digest)
  - language (en, ar)

Business Rules:
  - Critical events (delivery failure, payment bounce, SLA breach) bypass quiet hours
  - Users can mute specific orders/customers
  - Managers can set team-wide notification policies
  - WhatsApp requires opt-in (GDPR/TCPA compliance)
  - SMS limited to: delivery day-of, payment issues, 2FA only
```

---

## 9. DATA MODEL GAPS

### What Exists
The existing research has: organizations, profiles, quotes (with versions), orders, inventory_movements, payment_records, audit_log, documents.

### MISSING: Critical Entities

#### Projects (Grouping Multiple Orders)

```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES organizations(id),
  customer_id UUID NOT NULL REFERENCES customers(id),
  name TEXT NOT NULL, -- "Mall of Arabia Phase 2"
  code TEXT, -- "MOA-P2" (short reference)
  description TEXT,
  site_address_id UUID REFERENCES addresses(id),
  status TEXT NOT NULL DEFAULT 'active', -- active, completed, on_hold, cancelled
  estimated_value DECIMAL(15,2),
  start_date DATE,
  expected_end_date DATE,
  actual_end_date DATE,
  project_manager_contact_id UUID REFERENCES contacts(id),
  pricing_tier TEXT, -- override customer pricing for this project
  tax_exemption_id UUID REFERENCES tax_exemption_certificates(id),
  notes TEXT,
  metadata JSONB, -- flexible fields: permit number, GC name, architect, etc.
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Every quote, order, delivery, invoice can link to a project
ALTER TABLE quotes ADD COLUMN project_id UUID REFERENCES projects(id);
ALTER TABLE orders ADD COLUMN project_id UUID REFERENCES projects(id);
ALTER TABLE deliveries ADD COLUMN project_id UUID REFERENCES projects(id);
ALTER TABLE invoices ADD COLUMN project_id UUID REFERENCES projects(id);
```

#### Contacts (Separate from Customer Companies)

```sql
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  customer_id UUID REFERENCES customers(id), -- can be NULL for prospects
  supplier_id UUID REFERENCES suppliers(id), -- or supplier contact
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  title TEXT, -- "Procurement Manager", "Site Foreman"
  email TEXT,
  phone TEXT,
  mobile TEXT,
  whatsapp_number TEXT, -- may differ from mobile
  role TEXT, -- buyer, approver, site_manager, accounts_payable, decision_maker
  is_primary BOOLEAN DEFAULT false,
  is_billing_contact BOOLEAN DEFAULT false,
  is_delivery_contact BOOLEAN DEFAULT false,
  preferred_language TEXT DEFAULT 'en',
  preferred_contact_method TEXT DEFAULT 'whatsapp', -- email, phone, whatsapp
  notes TEXT,
  status TEXT DEFAULT 'active', -- active, inactive
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Multi-user account mapping
CREATE TABLE customer_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id),
  user_id UUID REFERENCES auth.users(id), -- Supabase auth user
  customer_id UUID NOT NULL REFERENCES customers(id),
  role TEXT NOT NULL, -- admin, buyer, approver, viewer, site_manager
  permissions JSONB, -- granular overrides
  is_active BOOLEAN DEFAULT true,
  invited_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### Addresses (Delivery Sites as Separate Entity)

```sql
CREATE TABLE addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  addressable_type TEXT NOT NULL, -- 'customer', 'supplier', 'warehouse', 'project'
  addressable_id UUID NOT NULL,
  label TEXT, -- "Main Office", "Site A - Downtown Tower", "Warehouse 2"
  type TEXT NOT NULL, -- billing, delivery, both
  street_1 TEXT NOT NULL,
  street_2 TEXT,
  city TEXT NOT NULL,
  state_province TEXT,
  postal_code TEXT,
  country TEXT NOT NULL DEFAULT 'US',
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),
  geocoded BOOLEAN DEFAULT false,
  delivery_instructions TEXT, -- "Enter from Gate 3, ask for Mohammed"
  access_hours TEXT, -- "Mon-Sat 6AM-4PM"
  site_contact_id UUID REFERENCES contacts(id),
  equipment_available TEXT[], -- ['forklift', 'crane'] at delivery site
  is_default BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false, -- has been delivered to successfully
  metadata JSONB, -- parking, clearance height, weight limits
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### Price Lists (Versioned)

```sql
CREATE TABLE price_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL, -- "Standard 2026 Q1", "Gold Tier", "Henderson Custom"
  type TEXT NOT NULL, -- standard, customer_specific, project, promotional
  customer_id UUID REFERENCES customers(id), -- NULL for standard/tier lists
  customer_tier TEXT, -- 'gold', 'silver', 'bronze' for tier lists
  project_id UUID REFERENCES projects(id), -- for project-specific pricing
  currency TEXT NOT NULL DEFAULT 'USD',
  effective_date DATE NOT NULL,
  expiry_date DATE,
  status TEXT DEFAULT 'draft', -- draft, active, expired, superseded
  version INTEGER DEFAULT 1,
  previous_version_id UUID REFERENCES price_lists(id),
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE price_list_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  price_list_id UUID NOT NULL REFERENCES price_lists(id),
  product_id UUID NOT NULL REFERENCES products(id),
  unit_price DECIMAL(12,4), -- fixed price
  discount_pct DECIMAL(5,2), -- OR percentage discount from standard
  min_quantity INTEGER DEFAULT 1,
  max_quantity INTEGER, -- NULL = unlimited
  notes TEXT
);
```

#### Contracts (Long-Term Agreements)

```sql
CREATE TABLE contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  contract_number TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL, -- 'customer_supply', 'supplier_framework', 'blanket_po'
  customer_id UUID REFERENCES customers(id),
  supplier_id UUID REFERENCES suppliers(id),
  title TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  auto_renew BOOLEAN DEFAULT false,
  renewal_notice_days INTEGER DEFAULT 60,
  status TEXT DEFAULT 'draft', -- draft, pending_approval, active, expired, terminated
  total_value DECIMAL(15,2), -- estimated total contract value
  consumed_value DECIMAL(15,2) DEFAULT 0, -- how much ordered against it
  payment_terms TEXT, -- override standard terms
  price_list_id UUID REFERENCES price_lists(id), -- linked pricing
  price_escalation_clause TEXT, -- "CPI adjustment annually" or "fixed for term"
  minimum_commitment DECIMAL(15,2), -- minimum purchase obligation
  penalty_clause TEXT,
  terms_document_url TEXT, -- signed contract PDF in R2
  signed_by_customer TEXT,
  signed_by_company TEXT,
  signed_date DATE,
  approved_by UUID REFERENCES profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Link orders to contracts for tracking commitment
ALTER TABLE orders ADD COLUMN contract_id UUID REFERENCES contracts(id);
```

#### Purchase Requisitions (Internal Requests)

```sql
CREATE TABLE purchase_requisitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  requisition_number TEXT UNIQUE NOT NULL,
  requested_by UUID NOT NULL REFERENCES profiles(id),
  department TEXT, -- 'warehouse', 'operations', 'sales'
  reason TEXT NOT NULL, -- 'customer_order', 'restock', 'new_product', 'emergency'
  related_order_id UUID REFERENCES orders(id), -- if tied to customer order
  status TEXT DEFAULT 'draft', -- draft, submitted, approved, rejected, converted_to_po
  priority TEXT DEFAULT 'normal', -- low, normal, high, urgent
  needed_by DATE,
  notes TEXT,
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  total_estimated_cost DECIMAL(12,2),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE purchase_requisition_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requisition_id UUID NOT NULL REFERENCES purchase_requisitions(id),
  product_id UUID REFERENCES products(id),
  description TEXT, -- for non-catalog items
  quantity DECIMAL(12,3) NOT NULL,
  unit TEXT NOT NULL,
  estimated_unit_cost DECIMAL(12,4),
  preferred_supplier_id UUID REFERENCES suppliers(id),
  notes TEXT
);

-- Approval Rules:
-- < $5,000: auto-approve for approved requesters
-- $5,000 - $25,000: Procurement Manager approval
-- $25,000 - $100,000: Procurement Manager + Finance Manager
-- > $100,000: VP/CEO approval
```

#### Additional Missing Entities

```sql
-- Customer Tiers (for pricing and service levels)
CREATE TABLE customer_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL, -- 'Bronze', 'Silver', 'Gold', 'Platinum', 'Strategic'
  min_annual_revenue DECIMAL(15,2), -- auto-qualify threshold
  discount_pct DECIMAL(5,2), -- default discount percentage
  payment_terms TEXT, -- 'net_30', 'net_60'
  priority_level INTEGER, -- for SLA and support priority
  benefits JSONB, -- free delivery over $X, dedicated rep, etc.
  review_frequency TEXT -- 'quarterly', 'annually'
);

-- Product Categories (hierarchical)
CREATE TABLE product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  parent_id UUID REFERENCES product_categories(id),
  name TEXT NOT NULL,
  code TEXT,
  default_margin_pct DECIMAL(5,2),
  floor_margin_pct DECIMAL(5,2),
  tax_code TEXT, -- Avalara tax code for this category
  is_active BOOLEAN DEFAULT true
);

-- Units of Measure (critical for building materials)
CREATE TABLE units_of_measure (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, -- 'bag', 'ton', 'cubic_meter', 'linear_foot', 'sheet', 'piece'
  abbreviation TEXT NOT NULL, -- 'bag', 't', 'm3', 'lft', 'sht', 'pc'
  type TEXT, -- 'weight', 'volume', 'length', 'area', 'count'
  base_unit_id UUID REFERENCES units_of_measure(id), -- for conversion
  conversion_factor DECIMAL(15,6) -- multiply by this to get base unit
);

-- Product UOM Conversions (same product sold in different units)
CREATE TABLE product_uom_conversions (
  product_id UUID NOT NULL REFERENCES products(id),
  from_uom_id UUID NOT NULL REFERENCES units_of_measure(id),
  to_uom_id UUID NOT NULL REFERENCES units_of_measure(id),
  conversion_factor DECIMAL(15,6) NOT NULL,
  -- e.g., 1 pallet of cement = 40 bags
  PRIMARY KEY (product_id, from_uom_id, to_uom_id)
);
```

---

## 10. INTEGRATION POINTS

### What Exists
The existing research mentions: Avalara, QuickBooks, WhatsApp, Twilio, Resend, Mapbox, Claude API, Sygic, PowerSync, Orderful/SPS.

### MISSING: Integration Architecture Details

#### Avalara AvaTax

```
Integration Type: REST API (real-time)
Endpoint: POST https://rest.avatax.com/api/v2/transactions/create
Auth: Basic Auth (account_id:license_key)
When Called:
  - Quote creation (type: SalesOrder, uncommitted estimate)
  - Invoice creation (type: SalesInvoice, committed)
  - Credit note (type: ReturnInvoice)
  - Void (POST /transactions/{id}/void)
Data Sent: line items with tax codes, addresses (ship-from, ship-to), customer exempt status
Data Received: tax per line by jurisdiction, total tax, tax authority details
Error Handling: If Avalara down, use cached tax rates (last 24h), flag for reconciliation
Cost: ~$0.04/transaction (AvaTax Basic) or ~$0.01/transaction (volume plan)
Annual estimate: 10,000 transactions/year = ~$400/year

Supabase Edge Function Implementation:
  - Edge Function: calculate-tax
  - Called from: quote builder (estimate), invoice generator (commit)
  - Caches: product tax codes, customer exemption status
  - Fallback: cached rates table if API timeout
```

#### QuickBooks Online Sync

```
Integration Type: OAuth 2.0 REST API
Sync Direction: HyperQuote → QBO (primary), QBO → HyperQuote (bank feeds)
Frequency: Near real-time (webhook/event-driven) for transactions, daily for reconciliation

What Syncs TO QuickBooks:
  - Customers (create/update) → QBO Customer
  - Invoices → QBO Invoice
  - Credit Notes → QBO Credit Memo
  - Payments received → QBO Payment
  - Suppliers → QBO Vendor
  - Supplier bills (approved) → QBO Bill
  - Supplier payments → QBO Bill Payment
  - Journal entries (FX gain/loss, adjustments) → QBO Journal Entry

What Syncs FROM QuickBooks:
  - Bank transactions (via QBO bank feeds) → for reconciliation
  - Chart of accounts (initial setup)
  - Tax rates (if using QBO tax instead of Avalara)

Sync Architecture:
  Cloudflare Queue → Worker → QBO API
  - Queue ensures retry on failure
  - Idempotency keys prevent duplicate entries
  - Conflict: QBO is source of truth for GL, HyperQuote for AR/AP subledger
  - Reconciliation job: nightly comparison of AR/AP balances

Error Handling:
  - QBO rate limit: 500 requests/minute
  - OAuth token refresh: every 60 minutes
  - If sync fails: retry 3x, then flag for manual review
  - Dashboard: "QBO Sync Status" showing last sync, pending items, errors
```

#### WhatsApp Business API (via Twilio or Meta Cloud API)

```
Since July 2025: Meta charges per template message (no more conversation windows)

Template Messages Needed:
  1. quote_ready: "Hi {{name}}, your quote {{ref}} for {{total}} is ready. View: {{link}}"
  2. order_confirmed: "Order {{ref}} confirmed! Expected delivery: {{date}}. Track: {{link}}"
  3. delivery_scheduled: "Your delivery for {{date}} between {{time_start}}-{{time_end}}. Driver: {{driver_name}}"
  4. delivery_eta_30min: "Your driver is 30 minutes away! Track live: {{link}}"
  5. delivery_completed: "Delivered! {{items_count}} items. View POD: {{link}}"
  6. invoice_sent: "Invoice {{ref}} for {{amount}} is ready. Due: {{date}}. View: {{link}}"
  7. payment_reminder: "Friendly reminder: Invoice {{ref}} for {{amount}} is due in {{days}} days."
  8. payment_overdue: "Invoice {{ref}} for {{amount}} is {{days}} days overdue. Please arrange payment."
  9. payment_received: "Payment of {{amount}} received. Thank you! Balance: {{balance}}"
  10. support_update: "Update on your inquiry {{ticket_ref}}: {{status}}. Reply for more info."

Interactive Buttons:
  - Quote ready: [View Quote] [Call Rep] [Reply]
  - Delivery scheduled: [Confirm] [Reschedule] [Call Driver]
  - Invoice: [View Invoice] [Pay Now Instructions] [Dispute]

Template Approval: Submit to Meta for review (24-48 hours)
Language: English + Arabic templates required for UAE/Saudi

Architecture:
  Event trigger (DB) → Cloudflare Worker → Twilio/Meta API → WhatsApp
  Inbound messages → Twilio webhook → Worker → AI triage → route to agent or auto-respond
```

#### Samsara/Geotab Telematics

```
Integration Type: REST API + Webhooks
Purpose: ELD/HOS compliance, vehicle diagnostics, fuel, DVIR

What to Pull:
  - HOS status per driver (driving, on-duty, sleeper, off-duty)
  - Vehicle location (alternative/complement to Mapbox)
  - Fault codes and maintenance alerts
  - Fuel consumption and idling
  - DVIR reports (pre/post-trip inspections)
  - Speed and harsh braking events

When to Use vs Own GPS:
  - If fleet has existing Samsara/Geotab hardware → USE their API for location + compliance
  - If no existing telematics → use Mapbox + expo-location for GPS, handle HOS in-app
  - Hybrid: Samsara for compliance/diagnostics, own GPS for real-time customer-facing tracking

API Integration:
  Samsara: GET /fleet/vehicles/locations (poll every 30s)
  Samsara: Webhook → vehicle enters/exits geofence
  Geotab: MyGeotab API → similar data points

  Cloudflare Worker polls telematics API → updates driver_current_location table
  OR: Telematics webhook → Worker → Supabase update
```

#### Plaid (Bank Feeds)

```
Integration Type: OAuth 2.0 (Plaid Link for account connection)
Purpose: Automated bank feed for payment reconciliation

Phase 1 (Launch): Manual CSV import from bank
Phase 2 ($5M+): Plaid integration

Flow:
  1. Finance user connects bank account via Plaid Link widget
  2. Plaid syncs transactions daily (or real-time with Plaid Transactions webhooks)
  3. Worker processes new transactions:
     a. Match to open invoices by amount, reference number, customer name
     b. Auto-match high-confidence matches (exact amount + reference)
     c. Suggest matches for review (close amount, partial match)
     d. Flag unmatched for manual review
  4. Confirmed matches create payment records in HyperQuote
  5. Synced to QuickBooks as payment receipts

Cost: $500/month Plaid Production (covers ~100 connected accounts)
```

### MISSING: ERP Migration / Data Import Tools

```
For customers migrating FROM existing systems (QuickBooks, NetSuite, SAP, spreadsheets):

Import Templates (CSV/Excel):
  1. Customers: name, address, contact, credit limit, terms, tier
  2. Products: SKU, name, description, category, UOM, cost, price
  3. Suppliers: name, contact, address, lead times, terms
  4. Open AR: customer, invoice#, date, amount, due date, balance
  5. Open AP: supplier, invoice#, date, amount, due date, balance
  6. Price Lists: customer/tier, product, price, effective date
  7. Inventory: product, warehouse, quantity, lot, cost
  8. Contacts: company, name, role, email, phone

Import Process:
  1. Upload CSV → Edge Function validates schema
  2. AI assists mapping columns (Claude: "This looks like 'Customer Name' maps to 'company_name'")
  3. Validation report: errors, warnings, duplicates
  4. Preview: show first 10 records as they would appear
  5. Confirm → bulk insert with progress bar
  6. Post-import reconciliation report

API for Customer Integrations:
  - REST API (Hono) with API key auth
  - Rate limited: 100 req/min standard, 1000 req/min enterprise
  - Endpoints: /api/v1/products, /api/v1/orders, /api/v1/inventory
  - Webhooks: order.created, delivery.completed, invoice.generated
  - API documentation: auto-generated OpenAPI spec from Hono
  - SDK: TypeScript SDK for large customers
```

---

## 11. ONBOARDING FLOWS

### What Exists
Customer 7-day sequence defined. Supplier portal onboarding mentioned. Driver onboarding (compliance) extensively covered.

### MISSING: Detailed Onboarding for Each User Type

#### Customer Company Onboarding (Expanded)

```
Pre-Day 0: Lead Qualification
  - AI chatbot or sales rep qualifies: company type, project scope, estimated volume
  - Sales rep creates prospect in CRM with estimated tier
  - If estimated annual volume > $500K → assign dedicated Account Manager

Day 0 (Signup):
  Stage 1 signup: Phone OTP + Company name + Full name
  System auto-creates:
    - Customer record (status: prospect)
    - Primary contact
    - Default billing address (from registration)

  Automated:
    - WhatsApp: "Welcome to HyperQuote! Here's how to get started: [link]"
    - Email: Welcome email with login link, FAQ, contact info
    - Internal: Notify assigned sales rep, create onboarding task

Hour 1 (if no activity):
  - WhatsApp: 60-second video walkthrough
  - In-app: guided tour overlay (highlight Browse Market, Build Quote, My Quotes)

Day 1:
  - Account Manager personal outreach (WhatsApp preferred)
  - "Hi {{name}}, I'm {{rep_name}}, your account manager at HyperQuote.
     I see you're in {{industry}}. Can I help you find materials for your current project?"
  - If customer responds → move to Stage 2 qualification

Day 1 (internal):
  - Sales rep completes: industry, company size estimate, project types
  - If qualified: trigger credit application invitation

Day 2-3 (if quote submitted):
  - Priority processing for first quote (guaranteed <4 hour response)
  - Personal follow-up from Account Manager after quote sent

Day 3 (if no quote):
  - WhatsApp: "Popular products in your area: [personalized based on industry/location]"
  - Email: "3 ways to save time ordering materials" (feature education)

Day 5 (if still no quote):
  - Account Manager phone call
  - Offer: "Let me build your first quote for you — just tell me what you need"

Day 7 (if inactive):
  - Escalate to Sales Manager
  - Final outreach attempt with incentive: free delivery on first order

Day 14 (if converted):
  - Stage 2 info request: Trade license, company email
  - Credit application invitation
  - Set up multi-user accounts (invite procurement team)
  - Set up projects and delivery sites

Day 30 (first review):
  - Account Manager check-in: "How was your experience?"
  - NPS survey
  - Review pricing tier based on actual volume
```

#### Supplier Onboarding (Detailed)

```
Day 0: Registration
  - Self-service registration OR procurement team creates supplier record
  - Required: Company name, contact, business license, product categories
  - System creates: supplier record (status: pending_verification)

Day 0-1: Verification (mostly automated)
  - Business license validation (OCR + manual check)
  - Insurance certificate verification (GL, product liability)
  - Bank details verification (for payments)
  - If manufacturer: verify production capacity and certifications
  - Background: check for liens, judgments, compliance issues

Day 1-3: Catalog Setup
  - Supplier uploads catalog (PDF, Excel, CSV — any format)
  - AI parses catalog (Claude Sonnet) → extracts structured data
  - Supplier reviews extraction in side-by-side UI
  - Procurement team reviews and maps to HyperQuote categories
  - Set initial quality tier: New (100% inspection on first shipments)

Day 3-5: Commercial Setup
  - Negotiate and enter pricing terms
  - Set payment terms (Net 30/60)
  - Define lead times by product category
  - Set minimum order quantities
  - Define delivery capabilities (own delivery vs pickup only)
  - Agree on return/defect policy

Day 5-7: Integration Setup (if applicable)
  - Portal-only suppliers: training on PO management, invoice submission
  - API suppliers: provide API credentials, test webhooks
  - EDI suppliers: set up via Orderful/SPS, test 850/855/810 transactions

Day 7-14: Test Cycle
  - Place test PO
  - Verify: PO receipt → confirmation → shipment → delivery → invoice
  - Resolve any issues
  - Upgrade status: pending_verification → approved

Day 30: First Review
  - Review: response times, delivery performance, quality
  - Adjust tier if needed
  - Feedback session with procurement
```

#### Employee Onboarding (Role-Based)

```
Day 0: Account Creation
  - Admin creates user account
  - Assign role(s) and department
  - System auto-provisions: permissions, module access, dashboard
  - Welcome email with login credentials and getting started guide

Day 0-1: Platform Training (role-specific)

  Sales Rep Training:
    1. CRM: customer lookup, contact management
    2. Quote builder: creating quotes, applying pricing, margin rules
    3. Pipeline management: tracking opportunities
    4. Customer portal: what customers see, how to assist
    5. AI assistant: how to use for lookups, draft emails
    Duration: 4-6 hours, mix of video + hands-on

  Procurement Buyer Training:
    1. Supplier management: catalog, pricing, scorecard
    2. RFQ process: sending to suppliers, comparing responses
    3. PO creation and management
    4. Three-way matching: PO + receipt + invoice
    5. Supplier portal: what suppliers see
    Duration: 4-6 hours

  Warehouse Worker Training:
    1. Mobile app: barcode scanning, receiving, picking
    2. Inventory management: counts, adjustments
    3. Loading workflow: verification, documentation
    4. Safety procedures
    Duration: 2-3 hours + floor shadowing

  Finance/AR Training:
    1. Invoice creation and management
    2. Payment recording and matching
    3. AR aging and collections workflow
    4. Credit management: applications, holds, releases
    5. QuickBooks sync and reconciliation
    Duration: 6-8 hours

  Dispatcher Training:
    1. Route planning and optimization
    2. Driver assignment and management
    3. Real-time tracking dashboard
    4. Exception handling: failed deliveries, re-routing
    5. Equipment and vehicle management
    Duration: 4-6 hours

Day 1-5: Supervised Operation
  - Work alongside experienced team member
  - Restricted permissions (view-only for sensitive operations)
  - Daily check-in with manager

Day 5-10: Gradual Independence
  - Full permissions granted (with approval limits)
  - Manager reviews work daily
  - System tracks performance metrics from day 1

Day 30: First Review
  - Manager reviews metrics and competency
  - Adjust permissions if needed
  - Identify additional training needs
```

#### Tenant/White-Label Onboarding (New Company Setup)

```
Phase 1: Configuration (Day 0-3)
  1. Create organization record
  2. Upload branding: logo (light/dark), favicon
  3. Set brand colors: primary, secondary, accent, background
  4. Set typography: heading font, body font
  5. Configure domain: subdomain.hyperquote.com OR custom domain (CNAME)
  6. Set base currency, timezone, locale
  7. Configure: tax settings, payment terms defaults, credit policy
  8. Set up email domain (DKIM, SPF for Resend)

Phase 2: Data Setup (Day 3-7)
  1. Import product catalog (CSV or API)
  2. Import customer list (if migrating)
  3. Import supplier list
  4. Set up warehouses/locations
  5. Configure price lists and margin rules
  6. Set up tax codes (Avalara account)
  7. Connect QuickBooks Online

Phase 3: User Setup (Day 7-10)
  1. Create admin users
  2. Create department managers
  3. Bulk invite employees
  4. Role-specific training sessions (see above)

Phase 4: Testing (Day 10-14)
  1. End-to-end test: quote → order → delivery → invoice → payment
  2. Test customer portal experience
  3. Test supplier portal
  4. Test driver app
  5. Verify integrations (tax, accounting, notifications)

Phase 5: Go-Live (Day 14)
  1. Switch DNS to production
  2. Import opening balances (AR, AP, inventory)
  3. Invite first customers
  4. Monitor for 48 hours (support on standby)

Phase 6: Post-Launch (Day 14-30)
  1. Daily check-ins with account manager
  2. Address issues and feature requests
  3. Onboard remaining customers and suppliers
  4. First month review and optimization
```

---

## 12. EDGE CASES AND FAILURE MODES

### What Exists
The existing research covers failed deliveries (7 types), damaged goods handling, and some escalation paths. But many critical failure modes are unaddressed.

### MISSING: Complete Failure Mode Catalog

#### System Failures

| Failure | Impact | Mitigation |
|---------|--------|------------|
| **Supabase down during delivery** | Drivers can't update status, GPS stops, POD can't sync | PowerSync offline mode: all data cached locally, queue updates, sync when restored. Driver app continues to work fully offline. |
| **Cloudflare down** | Website/portal inaccessible, API calls fail, Workers offline | DNS failover to origin server (Supabase direct). Critical: order status API has backup endpoint. Customer sees "experiencing issues" page from DNS-level failover. WhatsApp/SMS still work (Twilio independent). |
| **Internet down at warehouse** | Can't update inventory, can't print pick lists, scanning fails | Local network with cached data. Warehouse app has offline mode for picking/receiving. Sync queue on restore. Paper pick lists as last resort. |
| **Avalara API down** | Can't calculate tax | Cache last 24h of tax rates by jurisdiction. Apply cached rates, flag invoices as "tax estimated." Reconcile when API restores. |
| **QuickBooks sync fails** | Financial data out of sync | Queue all transactions. Retry with exponential backoff. Dashboard shows "QBO sync: X items pending." Manual reconciliation report. |
| **WhatsApp API down** | Customer notifications fail | Fallback chain: WhatsApp → SMS → Email. All channels attempted in order. |
| **GPS signal lost for driver** | Can't track delivery | Last known position shown with timestamp. Alert dispatcher after 15 min. Driver can manually update status via app. Cell tower triangulation as fallback. |
| **AI (Claude API) down** | Chatbot, estimator, AI features fail | Graceful degradation: show "AI assistant temporarily unavailable" with alternatives (phone, chat with human). Pre-built responses for top 20 questions. Queue AI requests for retry. |

#### Financial Failures

| Failure | Impact | Mitigation |
|---------|--------|------------|
| **Double payment recorded** | AR shows incorrect balance, customer overcharged | Idempotency: payment reference number + amount + date = unique key. If duplicate detected: alert AR clerk, auto-create "pending review" status. Never auto-apply duplicate. |
| **Payment applied to wrong invoice** | AR mismatch, customer confusion | Unapply mechanism: reverse application, re-apply to correct invoice. Full audit trail of both actions. Customer statement shows correction. |
| **Check bounced after order shipped** | Loss of goods + revenue | NSF process: auto-reverse payment, reopen invoice, flag customer, notify Credit Manager, auto credit-hold. If goods not yet delivered: hold shipment. If delivered: collections escalation. |
| **Overpayment received** | Customer credit balance | Auto-detect: payment > invoice total. Options: apply to next invoice, hold as credit, refund. Customer notified of credit balance. |
| **FX rate changes significantly between quote and payment** | Margin erosion | Quote shows: "Prices valid for 14 days. FX rate locked at time of quote." If rate moves >5% before order: flag for re-quote. For open POs: track unrealized FX exposure. |
| **Customer disputes EVERY delivery** | Chronic disputes signal fraud or relationship issue | Auto-flag: >3 disputes in 30 days triggers review. Escalate to Sales Manager + Credit Manager. Options: terminate account, require POD signature from authorized person only, send company inspector with delivery. |

#### Supply Chain Failures

| Failure | Impact | Mitigation |
|---------|--------|------------|
| **Supplier goes bankrupt mid-order** | Unfulfilled POs, customer orders at risk | Detection: D&B monitoring alerts, supplier stops responding. Immediate: notify all affected orders. Procurement: find alternative suppliers within 24h. Customer: notify with new timeline. If prepaid: file claim with trade credit insurance. Supplier status → "suspended." |
| **Supplier delivers wrong product** | Customer receives incorrect materials | Receiving inspection catches at warehouse. If caught: refuse shipment, NCMR filed, re-order from alternate supplier. If not caught and delivered to customer: immediate pickup + correct delivery, credit note for inconvenience. Root cause: SCAR to supplier. |
| **Price spike in commodity market** | Open quotes become unprofitable | Quotes have validity period (14 days). System tracks: if supplier cost increases >10% on any product in an open quote, auto-notify quoting specialist. Options: contact customer to renegotiate, honor quote and take margin hit (decision logged), expire quote. |
| **Natural disaster disrupts supply** | Multiple suppliers/routes affected | Force majeure protocol: identify affected suppliers, notify affected customers, activate alternate suppliers, update delivery timelines. Insurance claims if applicable. |

#### Operational Failures

| Failure | Impact | Mitigation |
|---------|--------|------------|
| **Driver has accident** | Delivery delayed, safety concern, liability | Immediate: driver reports via emergency button in app. Dispatch alerted automatically. Protocol: 1) Check driver safety, 2) Call 911 if needed, 3) Document scene (photos), 4) Notify insurance, 5) Re-route remaining deliveries to another driver, 6) Notify affected customers. Goods: assess damage, file carrier insurance claim. |
| **Employee leaves with open quotes** | Orphaned quotes, customer confusion | Offboarding process: 1) System identifies all open quotes/orders assigned to employee, 2) Bulk reassign to manager or team, 3) Automated notification to affected customers: "Your new contact is {{name}}", 4) Deactivate user (don't delete — audit trail), 5) Revoke all permissions immediately, 6) Change any shared passwords/API keys. |
| **Warehouse theft/shrinkage** | Inventory mismatch, financial loss | Detection: cycle count discrepancies trigger investigation. If >2% shrinkage: escalate to Ops Manager. Prevention: barcode scan at every movement, CCTV footage linked to inventory events, access control by zone. Insurance: commercial property policy covers theft. System: adjustment requires reason code + manager approval. |
| **Customer provided wrong delivery address** | Failed delivery, wasted trip | Prevention: geocode and validate addresses on entry, flag "new address" deliveries for confirmation call. If discovered during delivery: driver contacts dispatch, dispatch contacts customer. Options: deliver to correct address (if nearby), return to warehouse. Cost: assess if customer error → customer bears redelivery cost. |

#### Data Integrity Failures

| Failure | Impact | Mitigation |
|---------|--------|------------|
| **Inventory count discrepancy** | Orders promised on phantom stock | Cycle count program: ABC analysis (A items counted monthly, B quarterly, C annually). When discrepancy found: quarantine affected products, investigate, adjust with documented reason. If overcount caused promised delivery: notify customer of delay. |
| **Duplicate customer records** | Split credit, fragmented history | Prevention: fuzzy matching on creation (company name similarity, phone, email). Detection: weekly duplicate scan. Resolution: merge tool that combines: orders, quotes, contacts, addresses, AR history. Master record designated, duplicate marked as "merged_into." |
| **Corrupted GPS data** | Wrong delivery tracking shown to customer | Validation: filter GPS points outside expected area (geofence + speed check). If speed > 120mph → discard. If location jumps > 50km in 1 minute → discard. Show "location updating" instead of wrong position. |

---

## 13. LEGAL AND COMPLIANCE GAPS

### What Exists
The existing research covers UCC 2-305 (price confirmation), FMCSA compliance for drivers, and mentions GDPR/data retention briefly.

### MISSING: Mechanic's Lien Rights

```
CRITICAL for building materials distributors:

What: A mechanic's lien allows unpaid material suppliers to place a lien on the
      property where materials were delivered, even if the property owner already
      paid the general contractor.

Why It Matters: This is the #1 payment protection tool for building materials suppliers.

State-by-State Requirements (key states):

| State | Preliminary Notice Required? | Deadline | Lien Filing Deadline |
|-------|---------------------------|----------|---------------------|
| California | Yes (20-day Preliminary Notice) | Within 20 days of first furnishing | 90 days after completion |
| Texas | Yes (for non-contracted parties) | By 15th of 2nd month after delivery | 15th of 4th month after last delivery |
| Florida | Yes (Notice to Owner) | Within 45 days of first furnishing | 90 days after last furnishing |
| New York | No preliminary notice for suppliers | N/A | 8 months from last furnishing |
| Illinois | Yes (Subcontractor Notice) | Within 60 days of first delivery | 4 months after completion |
| Arizona | Yes (Preliminary 20-Day Notice) | Within 20 days | 120 days after completion |

System Requirements:
  Entity: lien_rights_tracking
    - id
    - order_id / delivery_id
    - customer_id
    - project_id
    - property_address
    - property_owner (may differ from customer!)
    - general_contractor
    - state
    - first_furnishing_date
    - last_furnishing_date
    - preliminary_notice_required (boolean)
    - preliminary_notice_deadline (calculated from state rules)
    - preliminary_notice_sent_date
    - preliminary_notice_method (certified mail, personal service)
    - lien_filing_deadline (calculated from state rules)
    - lien_filed (boolean)
    - lien_filed_date
    - total_amount_owed
    - status (monitoring, notice_sent, lien_filed, paid, released)

  Automations:
    - On first delivery to new project: calculate preliminary notice deadline
    - 5 days before deadline: alert Credit Manager + AR Clerk
    - Auto-generate preliminary notice document (state-specific template)
    - Track certified mail confirmation
    - After each delivery: update last_furnishing_date, recalculate lien deadline
    - When customer becomes past due: alert with lien rights status
```

### MISSING: Terms and Conditions (Legal Templates Needed)

```
Documents the platform must generate and store:

1. Quote Terms & Conditions
   - Validity period (14 days unless stated)
   - Prices subject to change if materials not available
   - Quantities approximate (+/- 5% tolerance for bulk materials)
   - Tax not included unless stated
   - Delivery charges separate unless stated

2. Order Terms & Conditions (Sale of Goods)
   - Title passes on delivery
   - Risk of loss passes on delivery to site
   - Warranty: manufacturer's warranty pass-through only
   - WARRANTY DISCLAIMER: "SELLER DISCLAIMS ALL WARRANTIES, EXPRESS OR IMPLIED,
     INCLUDING MERCHANTABILITY AND FITNESS FOR PARTICULAR PURPOSE" (must be conspicuous per UCC)
   - Limitation of liability: max = invoice amount
   - No consequential damages
   - Force majeure clause
   - Dispute resolution: arbitration in [jurisdiction]
   - Returns: only with prior written consent, 25% restocking fee, must be resalable condition
   - Delivery: estimated dates not guaranteed
   - Shortages: must report within 48 hours of delivery

3. Credit Agreement
   - Payment terms
   - Late payment penalty (1.5% per month / 18% APR, or state maximum)
   - Attorney's fees clause (customer pays collection costs)
   - Personal guarantee (for credit > threshold)
   - Right to file mechanic's lien
   - Right to report to credit bureaus
   - UCC-1 financing statement (security interest in materials)

4. Supplier Terms
   - Payment terms
   - Quality requirements and inspection rights
   - Warranty requirements (pass-through to end customer)
   - Insurance requirements (GL, product liability minimums)
   - Indemnification
   - Cancellation rights
```

### MISSING: Data Privacy (GDPR + CCPA)

```
GDPR (if operating in EU/UAE with EU nationals):
  - Legal basis: Legitimate interest (B2B) or contract performance
  - Data Processing Agreement required with Supabase, Cloudflare, Twilio
  - Right to erasure: GDPR erasure function (already mentioned but not detailed)
  - Data portability: export all customer data in machine-readable format
  - Consent management: separate consent for marketing vs operational comms
  - Data breach notification: 72 hours to supervisory authority
  - DPO (Data Protection Officer): required if large-scale processing

CCPA (if ANY California customers, which is likely):
  - Since Jan 2023: B2B exemption EXPIRED — full CCPA applies to business contacts
  - Right to know: what data collected, sold, shared
  - Right to delete: upon request
  - Right to opt-out of sale/sharing
  - "Do Not Sell My Personal Information" link on website
  - Privacy policy must disclose: categories of data, purpose, retention periods
  - Fine: $2,500-$7,500 per violation

Implementation:
  - Privacy center: self-service data access, deletion, opt-out
  - Cookie consent banner (even for B2B)
  - Marketing opt-in tracking per contact
  - Data processing agreements with all vendors
  - Annual privacy audit
  - Data breach response plan documented

  Entity: privacy_consents
    - user_id
    - consent_type (marketing_email, marketing_sms, marketing_whatsapp, analytics)
    - granted (boolean)
    - granted_at
    - revoked_at
    - source (signup_form, preference_center, import)
    - ip_address
```

### MISSING: Construction Insurance Requirements

```
Insurance the company needs:
  - Commercial General Liability (CGL): $1M-$5M per occurrence
  - Commercial Auto: $1M per accident (covers fleet)
  - Workers' Compensation: state-mandated
  - Umbrella/Excess: $5M-$10M over primary policies
  - Product Liability: covered under CGL or separate
  - Professional Liability (E&O): if providing design/engineering advice
  - Inland Marine/Installation Floater: covers materials in transit and at job site
  - Trade Credit Insurance: covers customer defaults (see Section 3)
  - Cyber Insurance: covers data breach costs, ransomware
  - Property Insurance: warehouse, office, equipment

Insurance certificates the system should track:
  Entity: insurance_certificates
    - entity_type (company, supplier, driver_contracted)
    - entity_id
    - insurance_type (gl, auto, workers_comp, umbrella, product_liability)
    - carrier_name
    - policy_number
    - coverage_amount
    - effective_date
    - expiry_date
    - certificate_url (R2)
    - additional_insured (boolean — is HyperQuote listed?)
    - status (active, expiring_soon, expired)

  Automations:
    - 30 days before expiry: notify entity to renew
    - 7 days before expiry: escalate to account manager
    - On expiry: if supplier/driver → suspend until renewed
    - Dashboard: insurance compliance overview
```

---

## 14. PERFORMANCE AND SCALING

### What Exists
The existing research mentions Supabase Realtime limits, Cloudflare Worker limits (5 min CPU, 128 MB), and risk register.

### MISSING: Scaling Analysis by Growth Stage

#### Order Volume Analysis

| Stage | Daily Orders | Concurrent Users | GPS Pings/min | AI Queries/day | DB Size |
|-------|-------------|-----------------|---------------|----------------|---------|
| Launch (0-$1M) | 5-20 | 20-50 | 50-200 | 200-500 | <10 GB |
| Growth ($1-5M) | 20-100 | 50-200 | 200-1000 | 500-2000 | 10-50 GB |
| Scale ($5-20M) | 100-500 | 200-1000 | 1000-5000 | 2000-10000 | 50-200 GB |
| Enterprise ($20-50M) | 500-2000 | 1000-5000 | 5000-20000 | 10000-50000 | 200GB-1TB |
| Large ($50M+) | 2000-10000 | 5000-20000 | 20000-100000 | 50000-200000 | 1TB+ |

#### Bottleneck Analysis

```
Bottleneck 1: Supabase Realtime (GPS at scale)
  Problem: Postgres Changes processes on single thread
  At 100 drivers (5s interval): 1,200 updates/min → fine
  At 500 drivers: 6,000 updates/min → approaching limits
  At 2000 drivers: 24,000 updates/min → BOTTLENECK

  Solution (progressive):
  - Phase 1: Use Realtime Broadcast (not Postgres Changes) for GPS — ephemeral, no DB write
  - Phase 2: Batch GPS writes (write every 30s to DB, broadcast every 5s)
  - Phase 3: Redis Pub/Sub layer between drivers and Supabase
  - Phase 4: Dedicated GPS microservice with TimescaleDB

Bottleneck 2: Supabase Connection Pool
  Problem: Default connection limits
  Micro: 60 connections, Small: 90, Medium: 120, Large: 160
  With Hyperdrive pooling: 10 connections can serve ~1000 users

  At 500 concurrent users: need Medium plan minimum
  At 2000 concurrent users: need Large or XL plan
  At 10000 concurrent users: need dedicated instance or read replicas

  Solution:
  - Use connection pooler (PgBouncer via Supabase or Hyperdrive)
  - Read replicas for reporting queries (Supabase supports this)
  - Cache hot data in Cloudflare KV (product catalog, tax rates, user permissions)
  - Offload analytics to separate database/data warehouse at $20M+

Bottleneck 3: AI Cost at Scale
  Current estimate: $100-240/month at 50 users

  At 500 users (20 queries/day each):
  - Haiku routing: ~$300/month
  - 20% escalated to Sonnet: ~$800/month
  - 2% to Opus: ~$500/month
  - Total: ~$1,600/month

  At 5000 users:
  - Total: ~$16,000/month

  Mitigation:
  - Prompt caching (90% cost reduction for repeated schemas)
  - Cloudflare AI Gateway caching for identical queries
  - Pre-computed metrics library (avoid text-to-SQL for common questions)
  - Rate limiting per user: 50 AI queries/day
  - Haiku for routing saves 80% vs using Sonnet for everything

Bottleneck 4: File Storage (R2)
  Per delivery: 3-5 photos (each ~500KB compressed) = ~2MB
  At 100 deliveries/day: 200MB/day = 6GB/month = 72GB/year
  At 1000 deliveries/day: 2GB/day = 60GB/month = 720GB/year
  Plus: invoices, BOLs, catalogs, contracts

  R2 pricing: $0.015/GB/month storage, $0 egress
  At 1TB: $15/month → negligible
  At 10TB: $150/month → still manageable

  Solution: Lifecycle policy to move old files to cheaper tier after 2 years

Bottleneck 5: Supabase Database Size
  Free: 500MB, Pro: 8GB (then $0.125/GB)
  At 50GB: $5.25/month additional
  At 200GB: $24/month additional
  At 1TB: $124/month additional

  Mitigation:
  - Partition GPS data by month (DROP old partitions after 90 days of detail)
  - Archive audit logs to R2 after 2 years
  - Materialized views for reporting (don't query raw data)
  - VACUUM/ANALYZE scheduled via pg_cron

Bottleneck 6: Cloudflare Worker CPU Limits
  10ms CPU per request (free), 50ms (paid)
  Complex operations (tax calculation + pricing engine + AI routing): may exceed

  Solution:
  - Offload heavy computation to Supabase Edge Functions (no CPU limit, 150s timeout)
  - Use Cloudflare Workers for routing/auth, Edge Functions for business logic
  - Cloudflare Workflows for multi-step operations (durable execution)
```

---

## 15. DISASTER RECOVERY AND BUSINESS CONTINUITY

### What Exists
Not addressed in existing research.

### MISSING: Complete DR/BC Plan

#### RTO/RPO Targets

| System | RTO (max downtime) | RPO (max data loss) | Justification |
|--------|-------------------|---------------------|---------------|
| Customer portal | 4 hours | 1 hour | Quotes can wait, but orders shouldn't be lost |
| Internal platform | 2 hours | 30 minutes | Operations must resume quickly |
| Driver app | 0 (offline-capable) | 0 (local data) | Drivers continue working offline |
| GPS tracking | 1 hour | 5 minutes | Near-real-time expectation |
| Financial data | 1 hour | 0 (zero data loss) | Financial records cannot be lost |
| AI features | 8 hours | N/A (stateless) | AI is convenience, not critical path |
| Notifications | 4 hours | 0 | Can queue and send later |

#### Backup Strategy

```
Supabase (Database):
  - Point-in-time recovery: enabled by default on Pro plan (up to 7 days)
  - Daily backups: Supabase manages automatically
  - Custom backups: pg_dump via cron to R2 (daily full, hourly incremental WAL)
  - Cross-region: replicate to second Supabase project in different region
  - Test restore: quarterly test of full restore to staging

Cloudflare R2 (Files):
  - R2 has built-in 99.999999999% (11 nines) durability
  - No additional backup needed for R2 objects
  - But: maintain R2 object inventory for reconciliation

Cloudflare KV/D1 (Cache/Config):
  - KV: ephemeral by nature, rebuilt from DB on miss
  - D1: if used, backup to R2 daily

Application Code:
  - Git (GitHub): inherently backed up
  - Infrastructure-as-code: all deployments reproducible

Secrets/Config:
  - Stored in: Cloudflare secrets (encrypted), Supabase vault
  - Backup: encrypted copy in password manager (1Password Teams)
```

#### Failure Scenarios and Response

```
Scenario 1: Supabase Complete Outage (Region Down)
  Detection: Health check endpoint fails, Supabase status page
  Impact: All DB reads/writes fail, Auth fails, Realtime stops
  Response:
    1. Driver app continues offline (PowerSync local SQLite)
    2. Website serves cached pages from Cloudflare CDN
    3. API returns "maintenance mode" response
    4. Notifications queued in Cloudflare Queue (persist across outages)
    5. If > 30 min: activate read replica (if configured)
    6. If > 2 hours: consider failover to backup Supabase project
  Recovery:
    1. Supabase restores service
    2. PowerSync auto-syncs queued driver data
    3. Cloudflare Queue drains queued messages
    4. Verify data consistency (reconciliation report)

  Supabase SLA: 99.9% uptime on Pro plan = max 8.7 hours downtime/year

Scenario 2: Cloudflare Complete Outage
  Detection: Website unreachable, Workers fail
  Impact: All web apps down, API unreachable, but DB still fine
  Response:
    1. DNS failover to backup hosting (Vercel emergency deploy)
    2. Driver app communicates directly with Supabase (bypass Workers)
    3. Critical operations: fall back to phone/WhatsApp
  Recovery:
    1. Cloudflare restores service
    2. DNS TTL ensures fast recovery (set TTL to 5 min)

  Cloudflare SLA: 100% uptime guarantee (Enterprise), 99.9% on Business

Scenario 3: Data Breach / Ransomware
  Detection: Unusual access patterns, encrypted files, alert from monitoring
  Response:
    1. Isolate affected systems (revoke API keys, rotate passwords)
    2. Assess scope of breach (what data accessed?)
    3. If financial data: notify affected customers within 72 hours (GDPR)
    4. Engage incident response team / legal
    5. Restore from backup if data corrupted
    6. Post-incident: root cause analysis, implement fixes
  Prevention:
    - RLS ensures tenant isolation
    - API keys scoped and rotated quarterly
    - 2FA mandatory for all internal users
    - Audit log monitoring for anomalies
    - Supabase vault for secrets

Scenario 4: Complete Data Loss (Worst Case)
  Probability: Extremely low (would require simultaneous Supabase + R2 failure)
  Response:
    1. Restore from cross-region backup
    2. Reconcile with QuickBooks (financial data)
    3. Reconcile with Avalara (tax records)
    4. Manual recovery of any gap period
  Prevention:
    - Cross-region replication
    - Daily backup verification (automated restore test)
    - Financial data also exists in QuickBooks (redundancy)
```

#### Business Continuity (Non-Technical)

```
If the platform is completely down:

1. Orders: Accept via phone/WhatsApp, enter into system when restored
2. Quotes: Sales reps use Excel templates, enter later
3. Deliveries: Drivers use paper BOL, capture POD on phone camera, enter later
4. Payments: Continue recording in QuickBooks directly, reconcile later
5. Customer communication: Phone and WhatsApp still work independently

Key: The business operated before the platform existed. The platform makes it efficient,
but the business can survive degraded operations for 24-48 hours manually.

Runbook Location: Printed copy in office + Google Drive (independent of HyperQuote infra)
```

---

## SUMMARY: TOP 20 MOST CRITICAL GAPS

| # | Gap | Severity | Why |
|---|-----|----------|-----|
| 1 | **Price waterfall / pocket margin tracking** | CRITICAL | Without this, you don't know real profitability per customer |
| 2 | **Pricing rule priority engine (exact logic)** | CRITICAL | Core business logic — must be defined before building |
| 3 | **Multi-supplier cost resolution (WAC/FIFO/selected)** | CRITICAL | Affects every margin calculation |
| 4 | **Tax calculation implementation (Avalara API flow)** | CRITICAL | Legal compliance, affects every invoice |
| 5 | **ZATCA e-invoicing (Saudi Arabia)** | CRITICAL | Mandatory for Saudi operations, affects invoice pipeline |
| 6 | **Credit hold/release workflow (exact triggers)** | HIGH | Orders get stuck without clear rules |
| 7 | **Credit application workflow (scoring model)** | HIGH | Can't extend credit without a process |
| 8 | **Complete permission matrix** | HIGH | Must be defined before building RBAC |
| 9 | **Mechanic's lien rights tracking** | HIGH | #1 payment protection tool, state-specific deadlines |
| 10 | **Notification event-to-channel matrix** | HIGH | Must be defined before building notification system |
| 11 | **Multi-currency framework** | HIGH | Required for UAE/Saudi international operations |
| 12 | **Complete audit event catalog** | HIGH | Compliance requirement, affects database design |
| 13 | **Data model: Projects, Contacts, Addresses, Contracts** | HIGH | Missing entities affect every module |
| 14 | **Price lists (versioned, with impact analysis)** | HIGH | No way to manage pricing without this |
| 15 | **QuickBooks sync architecture** | MEDIUM | Core integration, must be designed before building |
| 16 | **Disaster recovery plan** | MEDIUM | Must have before production launch |
| 17 | **Terms and conditions legal templates** | MEDIUM | Legal exposure without these |
| 18 | **ERP migration / data import tools** | MEDIUM | Every new customer needs to import data |
| 19 | **Scaling plan by growth stage** | MEDIUM | Know bottlenecks before they hit |
| 20 | **Employee onboarding (role-based training)** | LOW | Can be manual initially, systematize later |

---

*This document identifies gaps only. Implementation requires architecture decisions and prioritization based on launch timeline and target market (US vs UAE vs both).*
