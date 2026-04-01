> ⚠️ **REFERENCE DOCUMENT — NOT THE SOURCE OF TRUTH**
> This file was written during the research phase and may contain outdated decisions, US-centric references, or superseded technical choices.
> **Always defer to `essential/RESEARCH.md` for current decisions.**
> Key changes since this file was written: TanStack Start (not Next.js), Capacitor (not Expo), React Aria (not shadcn), Egyptian law (not US FMCSA), EGP (not USD), dual auth pools, no online payments, no mobile wallets, spatial glass UI (not traditional dashboards).

# RESEARCH: Full Accounting System for B2B Building Materials Distribution

**Research Date:** 2026-03-28
**Scope:** Complete accounting system design for HyperQuote -- a B2B building materials distributor with no online payments, wire/check/LC only, orders $100K-$100M+
**Target System:** Custom-built on Supabase + Cloudflare, integrated with external accounting software

---

## Table of Contents

1. [What a Distributor Accountant Actually Does Daily](#1-what-a-distributor-accountant-actually-does-daily)
2. [Chart of Accounts for a Building Materials Distributor](#2-chart-of-accounts-for-a-building-materials-distributor)
3. [Accounts Receivable Management for Offline Payments](#3-accounts-receivable-management-for-offline-payments)
4. [Accounts Payable Management for Supplier Payments](#4-accounts-payable-management-for-supplier-payments)
5. [Cash Flow Management](#5-cash-flow-management)
6. [Build vs Integrate -- What Lives Where](#6-build-vs-integrate----what-lives-where)
7. [Tax Management for Building Materials](#7-tax-management-for-building-materials)
8. [Financial Reporting](#8-financial-reporting)
9. [Audit Trail Requirements](#9-audit-trail-requirements)
10. [Bank Feed Integration](#10-bank-feed-integration)
11. [HyperQuote Implementation Recommendations](#11-hyperquote-implementation-recommendations)

---

## 1. What a Distributor Accountant Actually Does Daily

### How Distribution Accounting Differs from Retail/SaaS

| Aspect | Retail/SaaS | Building Materials Distribution |
|---|---|---|
| Payment timing | Immediate (POS/subscription) | Net 30-90+ days after delivery |
| Payment method | Credit card, auto-debit | Wire transfer, check, letter of credit |
| Order value | $5-$500 | $100K-$100M+ |
| Revenue recognition | At sale or ratably | At shipment/delivery, sometimes milestone-based |
| Tax complexity | Single location | Destination-based, multi-jurisdiction, exemption certificates |
| COGS tracking | Simple unit cost | Landed cost (product + freight-in + import duties + warehousing) |
| Customer credit | None/minimal | Full credit underwriting, credit limits, lien rights |
| Inventory method | FIFO/weighted average | Weighted average or specific identification (for large specialty orders) |
| Rebates/discounts | Simple coupons | Volume rebates, early payment discounts (2/10 net 30), project-based pricing |
| Cash cycle | Immediate | Negative -- you pay suppliers before customers pay you (30-90 day gap) |

### Morning Routine (7:00-9:00 AM)

1. **Check bank accounts** -- Review overnight wire transfers received. Banks typically post wires between 4-6 PM previous day or overnight for international wires. Note new incoming amounts and reference numbers.

2. **Review bank reconciliation queue** -- Identify any unmatched deposits from the prior day. Pull the previous day's bank statement (or bank feed if automated). Compare to expected payments from the AR aging report.

3. **Process check deposits** -- Any checks received in yesterday's mail need to be deposited (remote deposit capture or physical). Log check details: amount, check number, customer name, any remittance advice included.

4. **Review overnight supplier invoices** -- Suppliers email or mail invoices. These need to be logged, matched to POs and receiving reports (three-way match), and entered into the AP queue.

5. **Cash position check** -- What is the bank balance right now? What payments are due out today? What payments are expected in? This is the single most critical daily task for a distributor.

### Mid-Morning Tasks (9:00 AM-12:00 PM)

6. **Cash application** -- The core AR task. Match incoming payments to open invoices:
   - Wire transfers: Match using reference number, amount, and customer name
   - Checks: Match using remittance advice (the stub that comes with the check) or call the customer
   - Handle exceptions: partial payments, overpayments, unidentified payments
   - Post applied payments to the general ledger

7. **AR follow-up** -- Call/email customers with overdue invoices. Prioritize by amount and age:
   - 1-15 days past due: Friendly reminder email
   - 16-30 days past due: Phone call to AP contact
   - 31-60 days past due: Escalate to sales rep + formal demand
   - 60+ days past due: Credit hold on account, collections process

8. **AP invoice processing** -- Enter new supplier invoices. Perform three-way match:
   - Does the invoice match the PO (quantities, prices, terms)?
   - Does the invoice match the receiving report (did we actually get what they billed)?
   - Flag any discrepancies for review with procurement

### Afternoon Tasks (1:00-5:00 PM)

9. **Payment run preparation** -- Determine which supplier invoices are due for payment this week. Prioritize:
   - Invoices with early payment discounts expiring (2/10 net 30 means save 2% if paid in 10 days)
   - Critical suppliers (materials needed for active orders)
   - Invoices approaching due date
   - Get approval signatures for payment batch

10. **Revenue recognition** -- As shipments go out, ensure invoices are generated and revenue is recognized. In distribution, revenue is typically recognized at point of delivery (FOB destination) or point of shipment (FOB origin), depending on terms.

11. **Inventory cost reconciliation** -- Verify that the cost of goods shipped today matches what is in the inventory system. Address any variance between physical counts and system counts.

12. **Journal entries and adjustments** -- Post any necessary journal entries: bad debt write-offs, supplier rebate accruals, freight cost allocations, intercompany transactions.

13. **End-of-day reporting** -- Update the daily cash position report. Flag any AR concerns to the CFO. Ensure all transactions are posted.

### Weekly Tasks

- Full bank reconciliation (match every bank transaction to a GL entry)
- AR aging report review with sales management
- AP aging report review with procurement
- Cash flow forecast update (13-week rolling)
- Inventory valuation review
- Supplier rebate tracking update

### Monthly Tasks

- Month-end close (3-5 business days typically)
- Financial statement preparation (P&L, Balance Sheet, Cash Flow)
- Sales tax filing and remittance
- Customer profitability analysis
- Margin analysis by product category
- Bad debt reserve recalculation
- Budget vs actual variance analysis

### Systems Typically Used

| System | Purpose | Examples |
|---|---|---|
| ERP/Accounting | General ledger, AP, AR | SAP, NetSuite, Sage, QuickBooks Enterprise |
| Bank portal | View transactions, initiate wires | Chase Commercial, BofA CashPro, Wells Fargo CEO |
| AR automation | Cash application, collections | Versapay, Billtrust, HighRadius |
| AP automation | Invoice capture, three-way match | Bill.com, Tipalti, Coupa |
| Tax compliance | Sales tax calculation and filing | Avalara AvaTax, Vertex |
| Spreadsheets | Ad-hoc analysis, cash forecasting | Excel (still king in distribution) |
| CRM | Customer credit data reference | Salesforce, HubSpot |

---

## 2. Chart of Accounts for a Building Materials Distributor

### COA Numbering Structure

The standard numbering convention for a wholesale distributor:

```
1000-1999  Assets
2000-2999  Liabilities
3000-3999  Equity
4000-4999  Revenue
5000-5999  Cost of Goods Sold (COGS)
6000-6999  Operating Expenses (Selling)
7000-7999  Operating Expenses (General & Admin)
8000-8999  Other Income / Expense
9000-9999  Reserved (intercompany, special projects)
```

### Complete Chart of Accounts

#### ASSETS (1000-1999)

**Current Assets**
| Account | Name | Notes |
|---|---|---|
| 1000 | Cash - Operating Account | Primary bank account for daily operations |
| 1010 | Cash - Payroll Account | Separate account for payroll |
| 1020 | Cash - Escrow/Trust | For retainage or held deposits |
| 1030 | Petty Cash | Small office cash fund |
| 1050 | Short-Term Investments | Money market, CDs < 1 year |
| 1100 | Accounts Receivable - Trade | Customer invoices outstanding |
| 1110 | Accounts Receivable - Retainage | Amounts held back per contract (construction industry standard: 5-10%) |
| 1120 | Allowance for Doubtful Accounts | Contra asset -- bad debt reserve (typically 2-5% of AR for distributors) |
| 1130 | Notes Receivable | Promissory notes from customers |
| 1150 | Accrued Revenue | Revenue earned but not yet invoiced |
| 1200 | Inventory - Raw Materials/Stock | Building materials held for resale |
| 1210 | Inventory - In Transit | Materials purchased but not yet received (FOB shipping point) |
| 1220 | Inventory - Consignment | Materials held on consignment from suppliers |
| 1230 | Inventory Reserve | Contra asset for obsolete/damaged inventory |
| 1300 | Prepaid Insurance | Insurance paid in advance |
| 1310 | Prepaid Rent | Warehouse/office rent paid in advance |
| 1320 | Prepaid Licenses | Software licenses paid annually |
| 1350 | Supplier Rebates Receivable | Earned but not yet received volume rebates from suppliers |
| 1400 | Employee Advances | Advances to employees (driver per diem, etc.) |
| 1500 | Deposits - Supplier | Deposits paid to secure material supply |
| 1510 | Deposits - Lease | Security deposits on leased properties |

**Fixed Assets**
| Account | Name | Notes |
|---|---|---|
| 1600 | Land | Warehouse/yard land |
| 1610 | Buildings | Warehouse, office buildings |
| 1620 | Accumulated Depreciation - Buildings | |
| 1630 | Leasehold Improvements | Improvements to leased warehouse space |
| 1640 | Accumulated Amortization - Leasehold | |
| 1650 | Vehicles - Delivery Fleet | Trucks, flatbeds, cranes |
| 1660 | Accumulated Depreciation - Vehicles | |
| 1670 | Warehouse Equipment | Forklifts, conveyors, racking |
| 1680 | Accumulated Depreciation - Warehouse Equipment | |
| 1690 | Office Equipment & Furniture | Computers, desks, phones |
| 1700 | Accumulated Depreciation - Office Equipment | |
| 1710 | Software & Technology | Capitalized software costs |
| 1720 | Accumulated Amortization - Software | |

**Other Assets**
| Account | Name | Notes |
|---|---|---|
| 1800 | Goodwill | If acquired businesses |
| 1810 | Other Intangible Assets | Customer lists, non-compete agreements |
| 1900 | Long-Term Notes Receivable | |

#### LIABILITIES (2000-2999)

**Current Liabilities**
| Account | Name | Notes |
|---|---|---|
| 2000 | Accounts Payable - Trade | Amounts owed to material suppliers |
| 2010 | Accounts Payable - Freight | Owed to trucking/shipping companies |
| 2020 | Accounts Payable - Other | Utilities, services, etc. |
| 2050 | Accrued Expenses | Expenses incurred but not yet billed |
| 2060 | Accrued Wages & Salaries | |
| 2070 | Accrued Payroll Taxes | |
| 2080 | Accrued Interest | |
| 2100 | Customer Deposits | Deposits received from customers on large orders |
| 2110 | Customer Credits / Overpayments | Credit balances on customer accounts |
| 2120 | Deferred Revenue | Payment received but materials not yet delivered |
| 2130 | Retainage Payable | Amounts held from subcontractors |
| 2200 | Sales Tax Payable | Collected sales tax awaiting remittance |
| 2210 | Use Tax Payable | Use tax on interstate purchases |
| 2300 | Current Portion - Long-Term Debt | |
| 2310 | Line of Credit | Revolving credit facility (critical for distributors) |
| 2400 | Accrued Customer Rebates | Volume rebates owed to customers |
| 2410 | Warranty Reserve | For materials with warranty obligations |

**Long-Term Liabilities**
| Account | Name | Notes |
|---|---|---|
| 2500 | Long-Term Debt - Bank Loan | Term loans for equipment/property |
| 2510 | Equipment Finance/Lease Obligations | Vehicle and equipment leases |
| 2520 | Mortgage Payable | On owned warehouse/office |
| 2600 | Letter of Credit Obligations | LCs issued to international suppliers |
| 2700 | Deferred Tax Liabilities | |

#### EQUITY (3000-3999)

| Account | Name | Notes |
|---|---|---|
| 3000 | Common Stock / Owner's Equity | |
| 3100 | Additional Paid-In Capital | |
| 3200 | Retained Earnings | Accumulated profits |
| 3300 | Owner's Draws / Distributions | |
| 3400 | Current Year Net Income | Auto-calculated |

#### REVENUE (4000-4999)

| Account | Name | Notes |
|---|---|---|
| 4000 | Sales - Structural Materials | Lumber, steel, concrete |
| 4010 | Sales - Finishing Materials | Tile, flooring, fixtures |
| 4020 | Sales - Plumbing & HVAC | Pipes, fittings, HVAC equipment |
| 4030 | Sales - Electrical | Wiring, panels, fixtures |
| 4040 | Sales - Insulation & Drywall | |
| 4050 | Sales - Roofing | |
| 4060 | Sales - Other Materials | Miscellaneous categories |
| 4100 | Delivery/Freight Revenue | Delivery charges billed to customers |
| 4200 | Service Revenue | Cut-to-size, kitting, material handling |
| 4300 | Restocking Fees | Charged on returns |
| 4400 | Early Payment Discount Given | Contra revenue (discounts offered to customers for early payment) |
| 4500 | Sales Returns & Allowances | Contra revenue |
| 4600 | Sales Discounts | Contra revenue (volume/project discounts) |

#### COST OF GOODS SOLD (5000-5999)

This is where distribution accounting gets specific. COGS must capture the full landed cost.

| Account | Name | Notes |
|---|---|---|
| 5000 | COGS - Structural Materials | Direct material cost |
| 5010 | COGS - Finishing Materials | |
| 5020 | COGS - Plumbing & HVAC | |
| 5030 | COGS - Electrical | |
| 5040 | COGS - Insulation & Drywall | |
| 5050 | COGS - Roofing | |
| 5060 | COGS - Other Materials | |
| 5100 | Freight-In | Inbound shipping from suppliers to warehouse -- THIS IS COGS, NOT OPERATING EXPENSE |
| 5110 | Import Duties & Customs | For international material sourcing |
| 5120 | Brokerage & Clearing Fees | Customs brokerage for imports |
| 5200 | Inventory Shrinkage | Theft, damage, spoilage |
| 5210 | Inventory Adjustments | Count variances, write-downs |
| 5300 | Purchase Returns & Allowances | Credits from suppliers |
| 5310 | Purchase Discounts Taken | Early payment discounts received from suppliers (2/10 net 30) |
| 5400 | Supplier Rebates Earned | Volume rebates reduce COGS -- accrued as earned |
| 5500 | Warehouse Direct Labor | Labor directly handling product (pickers, loaders) |
| 5510 | Warehouse Supplies | Pallets, shrink wrap, packaging for shipment |

**Critical distinction:** Freight-in (5100) is COGS because it is part of the landed cost of inventory. Freight-out/delivery (6200) is a selling expense. This matters for gross margin calculation.

#### OPERATING EXPENSES - SELLING (6000-6999)

| Account | Name | Notes |
|---|---|---|
| 6000 | Sales Salaries & Commissions | Sales team compensation |
| 6010 | Sales Bonuses | Performance bonuses |
| 6050 | Marketing & Advertising | |
| 6060 | Trade Shows & Events | |
| 6100 | Customer Entertainment | |
| 6150 | Travel - Sales | |
| 6200 | Freight-Out / Delivery Costs | Shipping to customers -- selling expense |
| 6210 | Delivery Vehicle Fuel | |
| 6220 | Delivery Vehicle Maintenance | |
| 6230 | Delivery Vehicle Insurance | |
| 6240 | Driver Wages | Delivery drivers |
| 6250 | Third-Party Delivery Services | When using external carriers |
| 6300 | Bad Debt Expense | Write-offs of uncollectible AR |
| 6310 | Collection Agency Fees | Third-party collection costs |
| 6400 | Credit & Collection Costs | Credit reports, monitoring services |
| 6500 | Customer Returns Processing | Labor/cost of processing returns |

#### OPERATING EXPENSES - GENERAL & ADMIN (7000-7999)

| Account | Name | Notes |
|---|---|---|
| 7000 | Officer/Owner Compensation | |
| 7010 | Administrative Salaries | |
| 7020 | Payroll Taxes - Employer | |
| 7030 | Employee Benefits | Health, dental, vision |
| 7040 | Workers' Compensation | |
| 7050 | 401(k) / Retirement Contributions | |
| 7100 | Rent - Warehouse | |
| 7110 | Rent - Office | |
| 7120 | Utilities - Warehouse | |
| 7130 | Utilities - Office | |
| 7140 | Property Taxes | |
| 7150 | Building Maintenance | |
| 7200 | Insurance - General Liability | |
| 7210 | Insurance - Property | |
| 7220 | Insurance - Umbrella/Excess | |
| 7300 | Office Supplies | |
| 7310 | Software & Subscriptions | SaaS tools, ERP license |
| 7320 | IT Services | |
| 7330 | Telephone & Internet | |
| 7400 | Professional Fees - Accounting | External CPA/auditor |
| 7410 | Professional Fees - Legal | |
| 7420 | Professional Fees - Consulting | |
| 7500 | Bank Fees & Service Charges | Wire fees, lockbox fees, bank service charges |
| 7510 | Credit Card Processing Fees | If accepting cards (rare at this scale) |
| 7520 | Letter of Credit Fees | Bank fees for LCs (typically 0.5-1.5% of LC amount) |
| 7600 | Depreciation - Buildings | |
| 7610 | Depreciation - Vehicles | |
| 7620 | Depreciation - Equipment | |
| 7630 | Amortization - Software | |
| 7640 | Amortization - Leasehold Improvements | |
| 7700 | Licenses & Permits | Business licenses, contractor licenses |
| 7710 | Dues & Subscriptions | Industry associations (NWBMA, STAFDA, etc.) |
| 7800 | Training & Education | |
| 7900 | Miscellaneous Expense | |

#### OTHER INCOME / EXPENSE (8000-8999)

| Account | Name | Notes |
|---|---|---|
| 8000 | Interest Income | On bank balances, short-term investments |
| 8010 | Interest Expense | On line of credit, loans |
| 8020 | Finance Charges Earned | Late payment charges billed to customers (typically 1.5%/month) |
| 8100 | Gain/Loss on Asset Disposal | Selling used trucks, equipment |
| 8200 | Foreign Exchange Gain/Loss | When buying from international suppliers |
| 8300 | Other Income | |
| 8400 | Other Expense | |
| 8500 | Income Tax Expense | Federal + state income tax |

### Distribution-Specific Accounts That Differ from Other Industries

1. **Freight-In (5100)** as COGS -- not present in SaaS, treated differently in retail
2. **Supplier Rebates Receivable (1350) / Earned (5400)** -- volume-based rebates from suppliers are a major profit driver for distributors, sometimes 1-3% of purchases
3. **Inventory - In Transit (1210)** -- materials on the water or on trucks, paid for but not in warehouse
4. **Retainage Receivable (1110)** -- construction industry standard, 5-10% held back pending project completion
5. **Customer Deposits (2100)** -- common for large orders; deposits of 25-50% before material procurement
6. **Freight-Out / Delivery (6200-6250)** -- major expense category, often 5-10% of revenue
7. **Letter of Credit Fees (7520)** -- bank fees for international trade instruments
8. **Bad Debt Expense (6300)** -- significantly higher risk than retail due to large order values and extended terms

---

## 3. Accounts Receivable Management for Offline Payments

### The Core Problem

In B2B building materials distribution, cash application is the single most labor-intensive accounting task. Unlike SaaS where Stripe auto-matches payments to invoices, an AR clerk must manually connect a wire transfer or check to the correct invoice(s) from the correct customer.

### Daily AR Workflow

#### Step 1: Gather Payment Data (7:00-8:00 AM)

```
Sources of incoming payment information:
- Bank portal: Wire transfers received (amount, sender name, reference)
- Lockbox service: Scanned checks with remittance advice (if using)
- Mail: Physical checks with remittance stubs
- Bank statement: ACH deposits
- Email: Customer-sent remittance advice PDFs
```

For a distributor processing $5M-$50M/month in receipts, expect 20-200+ payment transactions per day, most as wire transfers or checks.

#### Step 2: Cash Application (8:00 AM-12:00 PM)

This is the process of matching each payment to the correct customer and invoice(s).

**Easy matches (60-70% of payments):**
- Wire transfer reference includes invoice number
- Check includes remittance advice listing invoice numbers
- Payment amount exactly matches a single open invoice
- Customer has only one open invoice

**Moderate matches (20-25% of payments):**
- Customer pays multiple invoices with a single wire/check
- Remittance advice lists invoice numbers but amounts do not match due to:
  - Customer took an early payment discount (2/10 net 30)
  - Customer deducted for damaged goods (short pay)
  - Customer deducted a disputed freight charge
  - Currency conversion differences (for international customers)

**Hard matches / Exceptions (10-15% of payments):**
- Wire transfer with no reference -- just an amount from a bank name
- Check with no remittance advice
- Payment amount does not match any combination of open invoices
- Payment from a company name that does not match any customer on file (parent company paying for subsidiary, factoring company, etc.)
- Overpayment with no explanation

#### Step 3: Exception Handling Workflow

```
UNIDENTIFIED PAYMENT received:
  1. Check bank details -- sender name, bank, reference
  2. Search customer database for matching name/bank
  3. Search open invoices for matching amount
  4. If no match found:
     -> Post to "Unapplied Cash" suspense account (1095 or similar)
     -> Flag for research
     -> Contact sales team: "Do you know who sent $247,500 via wire from First National Bank?"
     -> If still unresolved after 5 business days, attempt customer contact
     -> Unapplied cash should be reviewed weekly; target: zero balance

PARTIAL PAYMENT received:
  1. Check for remittance advice indicating which invoices
  2. If remittance provided:
     -> Apply to specified invoices
     -> Leave remaining balance open on those invoices
  3. If no remittance:
     -> Apply to oldest invoices first (FIFO application)
     -> Or apply to largest invoice first if amount nearly matches
  4. Flag short-paid invoices for collections follow-up
  5. If the short pay is due to a claimed deduction:
     -> Create a deduction record
     -> Route to deduction resolution team (sales, customer service, or warehouse)
     -> Track deduction aging separately from invoice aging

OVERPAYMENT received:
  1. Apply full payment to open invoices
  2. Remaining balance options:
     a. Create a credit memo on the customer account (most common)
     b. Issue a refund check/wire (if customer requests)
     c. Apply to the next invoice when issued
  3. Overpayments > $1,000 should be communicated to the customer proactively

CREDIT MEMO processing:
  - Issued for: returned materials, pricing errors, damaged goods, billing errors
  - Must be approved (typically by sales manager or finance manager)
  - Applied against open invoices or held as account credit
  - Tracked separately in AR aging
```

#### Step 4: Collections Workflow (Ongoing)

```
AR AGING BUCKETS:
  Current (0-30 days)
  31-60 days past due
  61-90 days past due
  91-120 days past due
  120+ days past due

COLLECTION ACTIONS BY AGE:
  Day 1 past due:  Automated reminder email
  Day 7:           Second reminder email
  Day 15:          Phone call to customer AP department
  Day 21:          Email to customer with copy to their project manager
  Day 30:          Formal past-due notice; notify sales rep
  Day 45:          Credit hold on customer account (no new shipments)
  Day 60:          Demand letter from finance
  Day 75:          Final demand; warn of collections/lien action
  Day 90:          Engage collection agency or file mechanic's lien
  Day 120:         Evaluate for write-off; submit for legal action if warranted
  Day 180:         Write off to bad debt (with proper documentation)
```

### Key AR Metrics to Track

| Metric | Target | Why It Matters |
|---|---|---|
| Days Sales Outstanding (DSO) | 35-50 days | How fast you collect; industry avg is ~45 for distributors |
| Cash Application Rate | 85%+ same-day | Percentage of payments matched on day received |
| Unapplied Cash | < 2% of receipts | Amount sitting in suspense |
| AR Aging > 90 days | < 5% of total AR | Aged debt at risk of write-off |
| Bad Debt as % of Revenue | < 0.5-1% | Industry benchmark for well-managed distributors |
| Collection Effectiveness Index | > 80% | Percentage of outstanding AR collected in a period |

---

## 4. Accounts Payable Management for Supplier Payments

### The Three-Way Match Process

This is the foundation of AP integrity for any distributor. Every supplier invoice must be verified against three documents before payment.

```
DOCUMENT 1: PURCHASE ORDER (PO)
  Created by: Procurement team
  Contains: Item descriptions, quantities ordered, agreed prices, terms, delivery date
  Generated in: HyperQuote platform (this is a MUST-HAVE in-platform feature)

DOCUMENT 2: GOODS RECEIPT NOTE (GRN) / RECEIVING REPORT
  Created by: Warehouse team at time of delivery
  Contains: Items actually received, quantities counted, condition notes, damage reports
  Generated in: HyperQuote warehouse module (MUST-HAVE in-platform feature)

DOCUMENT 3: SUPPLIER INVOICE
  Created by: Supplier
  Contains: Items billed, quantities, prices, payment terms, due date
  Received via: Email PDF, EDI, mail, or supplier portal upload
```

### Daily AP Workflow

#### Morning: Invoice Receipt and Entry (8:00-10:00 AM)

```
1. Collect all new supplier invoices (email, mail, portal)
2. Enter into AP system:
   - Invoice number, date, due date
   - Supplier name and ID
   - Line items with quantities and prices
   - Payment terms
   - GL coding (which COGS account)
3. System automatically attempts to match to open POs
4. Matched invoices go to "Ready for Approval" queue
5. Unmatched invoices go to "Exception" queue
```

#### Mid-Morning: Exception Resolution (10:00 AM-12:00 PM)

```
COMMON AP EXCEPTIONS:

Price Variance:
  PO says $12.50/unit, invoice says $13.00/unit
  -> Check if price increase was communicated
  -> Check if PO has a price escalation clause
  -> Contact procurement for resolution
  -> If legitimate: create PO amendment, approve variance
  -> If error: send back to supplier for correction (debit memo)

Quantity Variance:
  PO: 500 units, GRN: 480 units, Invoice: 500 units
  -> Supplier billed for 500 but we only received 480
  -> Short-pay the invoice for 480 units
  -> Or request a credit memo for 20 units
  -> Note: some suppliers ship the remaining 20 later

Missing PO:
  Invoice received with no matching PO
  -> This is a RED FLAG -- no PO means unauthorized purchase
  -> Route to procurement manager for authorization
  -> If approved: create retroactive PO
  -> If not: reject invoice, return to supplier

Duplicate Invoice:
  Same invoice number from same supplier already in system
  -> Reject and flag -- duplicate payment prevention is critical
  -> Verify against prior payment records
```

#### Afternoon: Payment Scheduling (1:00-3:00 PM)

```
PAYMENT PRIORITIZATION LOGIC:

Priority 1: EARLY PAYMENT DISCOUNTS
  Terms: 2/10 net 30 (save 2% by paying within 10 days)
  Math: 2% discount for paying 20 days early = 36.5% annualized return
  Decision rule: ALWAYS take early payment discounts if cash is available
  For a $500K invoice: discount = $10,000 saved

Priority 2: CRITICAL SUPPLIER RELATIONSHIPS
  Suppliers providing materials for active customer orders
  Any supplier threatening to hold shipments
  Sole-source suppliers with no alternatives

Priority 3: STANDARD TERMS
  Pay on due date -- not early (preserve cash), not late (preserve credit)
  Group payments by day to minimize wire transfer fees
  Wire fee: $15-$35 per domestic wire; international wires: $35-$75

Priority 4: DISPUTED INVOICES
  Hold payment until dispute is resolved
  Communicate hold to supplier
  Track dispute aging
```

#### Payment Execution (3:00-5:00 PM)

```
PAYMENT METHODS FOR SUPPLIERS:
  Wire Transfer: Most common for large amounts ($10K+)
    -> Prepare wire details: bank name, routing, account, SWIFT/BIC
    -> Dual authorization required (maker/checker)
    -> Document wire confirmation number

  ACH Transfer: For recurring domestic suppliers
    -> Lower cost than wire ($0-$1 per transaction)
    -> Slower settlement (1-3 business days)
    -> Good for predictable, regular payments

  Check: Declining but still used for smaller suppliers
    -> Print check run, get signatures
    -> Mail or courier

  Letter of Credit: For international suppliers (large orders)
    -> Work with bank to establish LC
    -> Bank fee: 0.5-1.5% of LC value
    -> Documents presented -> bank pays supplier
    -> LC payment scheduled based on document presentation

PAYMENT BATCH APPROVAL:
  1. AP clerk prepares payment batch
  2. AP manager reviews and approves batch
  3. Controller/CFO approves any payment > threshold (e.g., $100K)
  4. Two authorized signers for checks > $25K
  5. Dual authorization on bank portal for wires > $50K
```

### Key AP Metrics

| Metric | Target | Why It Matters |
|---|---|---|
| Days Payable Outstanding (DPO) | 30-45 days | How long you take to pay suppliers |
| Invoice Processing Time | < 3 days from receipt | Speed of three-way match |
| Three-Way Match Rate | > 80% auto-match | Percentage matched without manual intervention |
| Early Payment Discount Capture | > 95% | How often you take available discounts |
| Duplicate Payment Rate | < 0.1% | Critical control metric |
| AP Aging > 60 days | < 5% | Avoid supplier relationship damage |

---

## 5. Cash Flow Management

### The Distributor Cash Flow Problem

Building materials distributors have a structural negative cash flow cycle:

```
TYPICAL CASH CONVERSION CYCLE:

Day 0:   Customer places order ($1M of materials)
Day 1:   Procurement issues POs to suppliers
Day 5:   Supplier ships materials (terms: Net 30 from ship date)
Day 10:  Materials arrive at warehouse
Day 12:  Materials inspected, received into inventory
Day 14:  Materials shipped/delivered to customer
Day 14:  Invoice sent to customer (terms: Net 45)
Day 35:  Supplier payment due (Day 5 + 30 days)
Day 59:  Customer payment due (Day 14 + 45 days)

GAP: You pay the supplier on Day 35.
     You get paid by the customer on Day 59.
     That is 24 days of financing $1M out of your own cash.
     At scale ($50M/month in orders), you need $40M+ in working capital.
```

### Cash Conversion Cycle (CCC) Calculation

```
CCC = DIO + DSO - DPO

Where:
  DIO = Days Inventory Outstanding (how long inventory sits)
        Building materials: 20-40 days typical
  DSO = Days Sales Outstanding (how long customers take to pay)
        Building materials: 35-55 days typical
  DPO = Days Payable Outstanding (how long you take to pay suppliers)
        Building materials: 25-40 days typical

Example:
  DIO = 30 days
  DSO = 45 days
  DPO = 35 days
  CCC = 30 + 45 - 35 = 40 days

  Meaning: Cash is tied up for 40 days on average.
  At $200M annual revenue: ~$22M tied up in working capital at any time.
```

### Cash Flow Forecasting: The 13-Week Rolling Forecast

This is the most critical financial tool for a distributor. Updated weekly.

```
WEEKLY CASH FLOW FORECAST STRUCTURE:

INFLOWS:
  + Expected customer payments (from AR aging, adjusted for actual payment behavior)
  + Customer deposits expected
  + Supplier rebate payments expected
  + Other income (asset sales, interest, etc.)
  = Total Expected Inflows

OUTFLOWS:
  - Supplier payments due (from AP aging)
  - Payroll (fixed, known dates)
  - Rent and lease payments (fixed)
  - Insurance premiums (fixed)
  - Tax payments (estimated/known dates)
  - Loan/interest payments (fixed)
  - Capital expenditures (planned)
  - Other operating expenses
  = Total Expected Outflows

NET CASH FLOW = Inflows - Outflows
OPENING BALANCE + NET CASH FLOW = CLOSING BALANCE
```

**Critical adjustment:** Customer payment forecasting must use ACTUAL payment behavior, not contractual terms. If a customer has Net 30 terms but historically pays on Day 52, use Day 52 in the forecast.

### Daily Cash Position Report

```
DAILY CASH POSITION (produced every morning):

Opening bank balance (per bank statement)
+ Deposits in transit (checks deposited, not yet cleared)
+ Expected incoming wires (confirmed by customers)
- Outstanding checks (issued but not yet cashed)
- Scheduled wire payments (today)
- Payroll (if pay date)
= Projected Closing Balance

VERSUS:
- Minimum cash reserve requirement (e.g., $2M)
- Upcoming large payments (next 7 days)
= Available Cash / (Shortfall)

If shortfall:
  -> Draw on line of credit
  -> Delay non-critical supplier payments
  -> Accelerate collections on key accounts
  -> Request customer deposits on new large orders
```

### Working Capital Financing Options

| Method | Cost | Speed | Best For |
|---|---|---|---|
| Revolving Line of Credit | Prime + 1-3% | Same day | Covering timing gaps |
| Invoice Factoring | 1-5% of invoice | 24-48 hours | Cash-strapped companies |
| Supply Chain Finance | Supplier discount rate | Varies | Large, creditworthy distributors |
| Customer Deposits | Free | Upfront | Large/custom orders |
| Early Payment Discount | 2% cost | Saves cash | When cash-rich |

### Reports the CFO Needs

**Daily:**
- Cash position report
- Incoming payments summary
- Outgoing payments summary
- AR collections activity

**Weekly:**
- 13-week cash flow forecast (updated)
- AR aging summary
- AP aging summary
- Inventory value and turnover

**Monthly:**
- Full P&L (actual vs budget vs prior year)
- Balance sheet
- Cash flow statement (indirect method)
- Working capital analysis
- Customer profitability analysis
- Margin analysis by product category
- Bank covenant compliance report

---

## 6. Build vs Integrate -- What Lives Where

### The Definitive Answer

**Do NOT build a general ledger, journal entry system, or full double-entry accounting engine. Integrate with external accounting software.**

The industry standard for custom-built B2B platforms is: build the operational/transactional layer, integrate with dedicated accounting software for the financial/compliance layer.

### What MUST Live in HyperQuote (the Platform)

These features are core to the business workflow and cannot be efficiently managed in external accounting software:

```
MUST BUILD IN HYPERQUOTE:

1. INVOICING ENGINE
   - Generate invoices from confirmed orders/shipments
   - Invoice numbering, dating, terms assignment
   - Line items with quantities, prices, taxes
   - PDF generation and email delivery
   - Invoice versioning (for corrections)
   - Progress/milestone invoicing for large projects
   - Retainage calculation and tracking
   WHY: Invoicing is tightly coupled to order fulfillment. The warehouse
   confirms shipment -> invoice auto-generates. This cannot be done well
   from external accounting software.

2. PURCHASE ORDER MANAGEMENT
   - PO creation from customer orders
   - PO approval workflow
   - PO transmission to suppliers
   - PO status tracking (ordered, shipped, received)
   WHY: POs are generated from the quoting/ordering process in HyperQuote.
   The data already lives here.

3. GOODS RECEIPT / RECEIVING
   - Receive against PO
   - Quantity and condition verification
   - Generates receiving report for three-way match
   WHY: Warehouse operations happen in the platform. The receiving data
   is created here.

4. THREE-WAY MATCH ENGINE
   - Automatic matching of PO + Receipt + Supplier Invoice
   - Variance detection and exception flagging
   - Approval routing for exceptions
   WHY: All three documents originate or are captured in the platform.
   Matching logic belongs here.

5. AR TRACKING (SUB-LEDGER LEVEL)
   - Customer balances and open invoices
   - Payment recording (mark invoices as paid)
   - Credit memo creation and application
   - AR aging calculation
   - Customer credit limit tracking
   - Dunning/collection workflow triggers
   WHY: Sales, customer service, and credit teams need to see AR status
   in real-time within the platform they already work in. A salesperson
   should not need to log into QuickBooks to check if a customer is current.

6. AP TRACKING (SUB-LEDGER LEVEL)
   - Supplier invoice entry and status
   - Payment scheduling and approval workflow
   - Supplier balances and open invoices
   - AP aging calculation
   WHY: Procurement needs visibility into what is owed to suppliers.

7. PAYMENT RECORDING
   - Record that a wire/check/LC payment was received or sent
   - Match payments to invoices
   - Handle partial payments, overpayments, credit memos
   WHY: AR clerks need to do cash application in the platform that
   has all the customer and invoice data.

8. TAX CALCULATION (via API)
   - Calculate sales tax per line item per delivery address
   - Integrate Avalara AvaTax or similar API
   - Store tax exemption certificates
   - Track tax collected for remittance
   WHY: Tax must be calculated at time of invoicing. The delivery
   address (which determines tax) lives in HyperQuote.

9. BASIC FINANCIAL DASHBOARDS
   - AR aging summary
   - AP aging summary
   - Cash position (bank balance + expected in/out)
   - Revenue this month/quarter/year
   - Outstanding POs value
   - Margin summary
   WHY: The CEO and CFO should see key metrics without leaving the platform.

10. SUPPLIER REBATE TRACKING
    - Track purchase volumes per supplier
    - Calculate earned rebates based on tier thresholds
    - Track rebate claims and payments received
    WHY: Rebate calculations depend on purchase data that lives in HyperQuote.
```

### What Should Live in External Accounting Software

```
INTEGRATE WITH QUICKBOOKS ONLINE (for SMB) or NETSUITE / SAP (for enterprise):

1. GENERAL LEDGER
   - Double-entry bookkeeping
   - Journal entries
   - Trial balance
   - Chart of accounts management
   WHY: This is what accounting software does best. Building a GL is
   thousands of hours of development with zero competitive advantage.

2. BANK RECONCILIATION
   - Match bank transactions to GL entries
   - Bank feeds and auto-import
   WHY: QuickBooks/Xero have built-in bank feeds with 10,000+ bank
   connections. Do not recreate this.

3. FINANCIAL STATEMENTS
   - Balance Sheet
   - Income Statement (P&L)
   - Cash Flow Statement
   - Statement of Equity
   WHY: GAAP-compliant financial statements have specific formatting
   and calculation rules. Use certified software.

4. PAYROLL
   - Employee pay processing
   - Tax withholdings
   - W-2s, 1099s
   WHY: Payroll is a completely separate domain. Use Gusto, ADP, etc.

5. TAX FILING & REMITTANCE
   - File sales tax returns
   - Remit collected taxes to jurisdictions
   - File income tax returns
   WHY: Compliance filings require certified platforms. Avalara handles
   filing; QuickBooks handles income tax data for CPA.

6. DEPRECIATION SCHEDULES
   - Fixed asset tracking
   - Depreciation calculations
   WHY: Accounting software handles this well; no business need for it
   in the operations platform.

7. FINANCIAL AUDIT SUPPORT
   - Auditor access to GL and financial statements
   - Audit-ready trial balance
   WHY: Auditors expect data from recognized accounting software.
```

### The Integration Architecture

```
HYPERQUOTE                           EXTERNAL ACCOUNTING
(Operational System of Record)       (Financial System of Record)

Invoices created      ──────────>    Revenue journal entries posted
Payments recorded     ──────────>    Cash receipt entries posted
Supplier invoices     ──────────>    AP entries posted
Payments to suppliers ──────────>    Cash disbursement entries posted
Inventory movements   ──────────>    COGS and inventory entries posted
Tax collected         ──────────>    Tax liability entries posted
Credit memos          ──────────>    Revenue adjustment entries posted

                      <──────────    Bank transactions (for reconciliation display)
                      <──────────    GL account balances (for dashboard)
                      <──────────    Financial statement data (for reporting)
```

### Integration Methods by Scale

| Company Size | Revenue | Recommended Accounting | Integration Method |
|---|---|---|---|
| Startup/Small | < $10M | QuickBooks Online | QuickBooks API (REST) |
| Mid-Market | $10M-$100M | QuickBooks Enterprise or NetSuite | QuickBooks API or NetSuite SuiteTalk |
| Enterprise | $100M+ | SAP or Oracle | Middleware (MuleSoft, Boomi) or direct API |
| Multi-Entity | Any | NetSuite OneWorld | NetSuite SuiteTalk API |

### API Integration Design

For QuickBooks Online (most common starting point):

```
SYNC FREQUENCY AND APPROACH:

Real-time sync (webhook + API call):
  - Invoice created in HyperQuote -> POST to QBO as Invoice
  - Payment recorded in HyperQuote -> POST to QBO as Payment
  - Credit memo issued -> POST to QBO as Credit Memo

Batch sync (every 15-60 minutes):
  - Supplier invoices -> POST to QBO as Bills
  - Supplier payments -> POST to QBO as Bill Payments
  - Inventory adjustments -> POST to QBO as Journal Entries

Daily sync:
  - Bank transactions pulled FROM QBO -> displayed in HyperQuote for reference
  - GL balances pulled FROM QBO -> displayed on dashboards

CRITICAL DESIGN RULES:
  1. HyperQuote is the system of record for AR, AP, and inventory transactions
  2. Accounting software is the system of record for GL and financial statements
  3. All sync is one-directional by transaction type (no bi-directional edits)
  4. Every sync has an idempotency key to prevent duplicate entries
  5. Failed syncs go to a retry queue with alerting
  6. Never block a business operation because sync failed
```

### Cost Comparison: Build vs Integrate

| Approach | Initial Cost | Annual Maintenance | Time to Market | Risk |
|---|---|---|---|---|
| Build full GL + accounting | $500K-$2M+ | $200K+/year | 12-24 months | Very high |
| Integrate with QuickBooks API | $50K-$100K | $20K-$40K/year | 2-4 months | Low |
| Unified API (Rutter, Merge) | $30K-$80K | $15K-$30K/year + usage | 1-3 months | Low |

**Recommendation for HyperQuote:** Start with QuickBooks Online API integration. Build the operational layer (invoicing, AR tracking, AP tracking, three-way match, payment recording) in-platform. As customers grow to enterprise scale, add NetSuite integration as a second option.

---

## 7. Tax Management for Building Materials

### The Core Complexity

Building materials sales tax is destination-based in most states. This means the tax rate is determined by where the materials are DELIVERED, not where the seller is located and not where the buyer is located.

```
EXAMPLE:
  HyperQuote warehouse: Houston, TX (8.25% combined rate)
  Customer billing address: Dallas, TX (8.25% combined rate)
  Delivery address: Austin, TX construction site (8.25% combined rate)

  Tax rate applied: AUSTIN rate (8.25%) -- the delivery destination

  Same customer, different job site:
  Delivery address: Dripping Springs, TX (6.25% state only)
  Tax rate applied: DRIPPING SPRINGS rate (6.25%)
```

### Tax Exemption Certificates

A huge portion of building materials customers are TAX EXEMPT or partially exempt:

```
COMMON EXEMPTION TYPES:

1. RESALE CERTIFICATE
   - Contractor buys materials to install in a project
   - Some states: contractor pays tax (they are the end consumer)
   - Other states: contractor can buy tax-free with resale cert
   - THIS VARIES BY STATE -- it is the #1 complexity in construction tax

2. GOVERNMENT / NONPROFIT EXEMPTION
   - Federal government projects: exempt
   - State/municipal projects: usually exempt
   - Nonprofit construction: exempt in most states
   - Requires: Certificate of exemption with entity tax ID

3. MANUFACTURING EXEMPTION
   - Materials used in manufacturing process
   - Varies by state

4. AGRICULTURAL EXEMPTION
   - Building materials for agricultural structures
   - Varies by state

MANAGEMENT REQUIREMENTS:
  - Store exemption certificates per customer (or per customer + jurisdiction)
  - Certificates expire -- track expiration dates
  - Certificates must be on file BEFORE the sale (not after audit)
  - If certificate is invalid or expired: charge tax
  - Retain certificates for 4-7 years (varies by state)
  - Avalara CertCapture or similar tool for certificate management
```

### State-by-State Contractor Rules (Major Variation)

```
STATES WHERE CONTRACTORS PAY SALES TAX ON MATERIALS:
  (Contractor is the "consumer" -- they buy materials, install them)
  California, New York, Ohio, Arizona, and many others
  -> Distributor charges tax on sale to contractor (unless contractor
     has a valid exemption certificate for specific exempt projects)

STATES WHERE CONTRACTORS CAN BUY TAX-FREE WITH RESALE CERT:
  (Contractor "resells" the materials as part of the finished project)
  Florida (real property contractors are tax-exempt on materials
  they incorporate into real property), and others
  -> Distributor does NOT charge tax; contractor handles tax on their
     end contract with the building owner

THIS IS WHY YOU NEED AVALARA OR VERTEX -- you cannot manually track
50 states x local jurisdictions x exemption rules. There are 13,000+
tax jurisdictions in the United States.
```

### Implementation for HyperQuote

```
TAX SYSTEM ARCHITECTURE:

1. AVALARA AVATAX API INTEGRATION
   - Call Avalara for every invoice line item
   - Inputs: product category, ship-from address, ship-to (delivery) address,
     customer tax status, exemption certificate ID
   - Outputs: tax amount per line, jurisdiction breakdown
   - Cost: ~$0.04-$0.10 per API call (volume pricing available)

2. TAX EXEMPTION CERTIFICATE MANAGEMENT
   - Upload and store exemption certificates in HyperQuote
   - Link certificates to customer accounts
   - Track certificate validity dates
   - Auto-flag expired certificates
   - Sync certificate data to Avalara CertCapture

3. PRODUCT TAX CODES
   - Each product in catalog must have a tax code
   - Building materials have specific tax codes in Avalara
   - Some materials are tax-exempt in some states (e.g., energy-efficient
     insulation in certain states)

4. TAX REPORTING
   - Track tax collected by jurisdiction
   - Monthly/quarterly tax filing data export
   - Avalara Returns handles actual filing and remittance
```

### Delivery Charges and Tax

```
IMPORTANT: Delivery/freight charges to customer:
  - In most states, if delivery is part of the sale of taxable goods,
    the delivery charge is ALSO taxable
  - If delivery is separately stated on the invoice and is optional,
    some states exempt it
  - Avalara handles this automatically based on jurisdiction rules
  - ALWAYS separately state delivery charges on invoices (best practice)
```

---

## 8. Financial Reporting

### Reports by Audience and Frequency

#### CEO / Owner -- Daily Dashboard

```
DAILY KPIs (displayed in HyperQuote CEO App):

1. Cash Position
   - Bank balance (all accounts)
   - Cash in transit (deposits clearing)
   - Net available cash
   - vs. minimum reserve threshold

2. Sales Snapshot
   - Invoiced today / this week / MTD
   - Orders booked today
   - Quotes outstanding (pipeline value)

3. Collections
   - Cash received today
   - Top 5 past-due accounts (by amount)
   - Total AR > 60 days

4. Key Alerts
   - Customers newly past due
   - Large payments received
   - Credit holds triggered
   - Low inventory alerts
```

#### CFO / Controller -- Weekly Reports

```
1. AR AGING REPORT
   +-----------+----------+--------+--------+--------+--------+---------+
   | Customer  | Current  | 1-30   | 31-60  | 61-90  | 91-120 | 120+    |
   +-----------+----------+--------+--------+--------+--------+---------+
   | ABC Const | $450,000 | $0     | $0     | $0     | $0     | $0      |
   | XYZ Build | $0       | $85,000| $42,000| $0     | $0     | $0      |
   | DEF Dev   | $200,000 | $50,000| $0     | $12,000| $0     | $0      |
   +-----------+----------+--------+--------+--------+--------+---------+
   | TOTAL     |$2.1M     |$890K   |$340K   |$95K    |$22K    |$8K      |
   +-----------+----------+--------+--------+--------+--------+---------+

   KEY METRICS:
   - Total AR: $3.455M
   - DSO: 42 days
   - % Current: 60.8%
   - % > 60 days: 3.6% (target: < 5%)

2. AP AGING REPORT (same format, by supplier)

3. 13-WEEK CASH FLOW FORECAST (updated weekly)

4. MARGIN ANALYSIS
   - Gross margin by product category
   - Gross margin by customer (top 20)
   - Gross margin by order size band
   - Trend: margin this week vs. 4-week average

5. INVENTORY REPORT
   - Total inventory value
   - Inventory turnover rate
   - Slow-moving inventory (> 90 days)
   - Inventory on order (POs outstanding)
```

#### CFO -- Monthly Reports (Month-End Close Package)

```
1. INCOME STATEMENT (P&L) -- DISTRIBUTOR FORMAT

   Revenue
     Gross Sales                          $4,250,000
     Less: Returns & Allowances             ($85,000)
     Less: Sales Discounts                  ($42,000)
     Less: Early Payment Discounts Given    ($18,000)
   NET REVENUE                            $4,105,000

   Cost of Goods Sold
     Beginning Inventory                  $1,800,000
     + Purchases                          $3,200,000
     + Freight-In                           $128,000
     + Import Duties                         $45,000
     - Purchase Returns                     ($32,000)
     - Purchase Discounts Taken             ($48,000)
     - Supplier Rebates Earned              ($64,000)
     - Ending Inventory                  ($1,750,000)
   TOTAL COGS                            $3,279,000

   GROSS PROFIT                             $826,000
   GROSS MARGIN                               20.1%

   Selling Expenses
     Sales Salaries & Commissions           $145,000
     Delivery/Freight-Out                   $185,000
     Driver Wages                            $72,000
     Vehicle Costs                           $38,000
     Bad Debt Expense                        $12,000
     Marketing                               $15,000
   TOTAL SELLING                            $467,000

   General & Administrative
     Admin Salaries                         $125,000
     Rent (Warehouse + Office)               $65,000
     Utilities                               $18,000
     Insurance                               $22,000
     Professional Fees                       $12,000
     Software & IT                           $15,000
     Depreciation                            $28,000
     Bank Fees                                $8,000
     Other G&A                               $10,000
   TOTAL G&A                               $303,000

   OPERATING INCOME                          $56,000
   OPERATING MARGIN                            1.4%

   Other Income / Expense
     Interest Expense                       ($12,000)
     Interest Income                          $2,000
     Finance Charges Earned                   $3,500
     FX Gain/Loss                           ($1,200)

   NET INCOME BEFORE TAX                     $48,300
   Income Tax                               ($12,075)
   NET INCOME                                $36,225
   NET MARGIN                                  0.9%

   Note: 1-3% net margin is NORMAL for distribution.
   Volume is the game, not margin percentage.

2. BALANCE SHEET

3. CASH FLOW STATEMENT (Indirect Method)

4. P&L BY CUSTOMER (Top 20 customers)
   Shows: Revenue, COGS, Gross Margin, Allocated Delivery Cost,
   Allocated Credit Cost, Net Customer Profitability

5. P&L BY PRODUCT CATEGORY
   Shows: Revenue, COGS, Gross Margin per material category

6. P&L BY PROJECT (if tracked)
   For large projects, track profitability at the project level

7. BUDGET VS ACTUAL VARIANCE REPORT

8. BANK COVENANT COMPLIANCE REPORT
   If company has loans, banks require:
   - Current ratio > 1.5x
   - Debt-to-equity < 3.0x
   - Minimum tangible net worth
   - Minimum EBITDA coverage
```

### Margin Analysis Deep Dive

```
MARGIN ANALYSIS FOR DISTRIBUTORS:

Gross Margin Analysis (the most important metric):
  Target: 18-25% for building materials distributors
  Below 15%: Unsustainable unless very high volume
  Above 30%: Exceptional, usually specialty/value-add products

Margin by Customer:
  Key insight: Not all revenue is equal.
  Customer A: $5M revenue, 22% margin = $1.1M gross profit
  Customer B: $5M revenue, 12% margin = $600K gross profit
  Customer B also has: slower payment (DSO 65 vs 35), more returns,
  more delivery stops, more service calls.
  ACTUAL profitability of Customer B might be negative.

Margin by Product:
  Structural steel: 8-12% (commodity, price-sensitive)
  Specialty fixtures: 30-45% (value-add, less competition)
  Standard lumber: 15-20% (volume play)
  Imported tile: 25-35% (specialty, long lead time)

Margin Erosion Tracking:
  - Quote margin vs. actual margin (did we discount during negotiation?)
  - Freight cost variance (quoted delivery vs actual cost)
  - Return/damage impact on margin
  - Early payment discount impact
```

---

## 9. Audit Trail Requirements

### What Must Be Tracked

Every financial transaction in HyperQuote must maintain a complete, immutable audit trail.

```
AUDIT TRAIL REQUIREMENTS PER TRANSACTION:

For EVERY record (invoice, payment, PO, credit memo, journal entry):
  1. Who created it (user ID, name, role)
  2. When it was created (UTC timestamp)
  3. What was created (full record snapshot)
  4. Who approved it (if applicable)
  5. When it was approved
  6. Every modification: who, when, what changed (before/after)
  7. If voided/cancelled: who, when, reason

  CRITICAL: Financial records should NEVER be physically deleted.
  They should be voided/cancelled with a reason code.

  This applies to:
  - Invoices (cannot delete; can void and reissue)
  - Payments (cannot delete; can reverse with reason)
  - Purchase orders (cannot delete; can cancel with reason)
  - Credit memos (cannot delete; can void)
  - Price changes (log every price override with approver)
  - Credit limit changes (log every change with approver)
  - Discount/rebate overrides (log every exception)
```

### SOX Considerations

SOX (Sarbanes-Oxley) technically applies to publicly traded companies. However, many private distributors follow SOX-like controls because:
- Banks and lenders may require it
- Private equity owners often require it
- It is best practice for audit readiness
- If the company ever goes public or gets acquired

```
SOX-RELEVANT CONTROLS FOR HYPERQUOTE:

1. SEGREGATION OF DUTIES
   - Person who creates POs != person who approves payments
   - Person who records AR != person who handles cash
   - Person who adjusts inventory != person who does physical counts
   IMPLEMENTATION: Role-based access control (RBAC) in HyperQuote

2. AUTHORIZATION CONTROLS
   - Payment approvals based on amount thresholds
   - Credit limit changes require manager approval
   - Price overrides require sales manager approval
   - Write-offs require controller/CFO approval
   IMPLEMENTATION: Approval workflow engine

3. RECONCILIATION CONTROLS
   - Daily bank reconciliation
   - Monthly AR sub-ledger to GL reconciliation
   - Monthly AP sub-ledger to GL reconciliation
   - Monthly inventory sub-ledger to GL reconciliation
   IMPLEMENTATION: Reconciliation reports with sign-off

4. ACCESS CONTROLS
   - Unique user IDs (no shared accounts)
   - Strong password policy
   - MFA for financial functions
   - Quarterly access reviews
   - Immediate deprovisioning on termination
   IMPLEMENTATION: Supabase auth + RBAC

5. CHANGE MANAGEMENT
   - All system changes logged
   - No direct production database modifications
   - Code review before deployment
   IMPLEMENTATION: Git-based deployment pipeline

6. DATA RETENTION
   - All financial records retained for 7 years minimum
   - Audit logs retained indefinitely (or 7+ years)
   - Must be retrievable and searchable
   IMPLEMENTATION: Supabase with no hard deletes + archival policy
```

### What Makes Auditors Happy vs What Triggers Red Flags

```
AUDITORS LOVE:
  + Clean audit trail for every transaction
  + Consistent approval workflows actually followed
  + Timely bank reconciliations (done within 5 days of month-end)
  + Segregation of duties enforced by system (not just policy)
  + Systematic bad debt reserve calculation (not ad hoc)
  + Three-way match documentation readily available
  + Sequential invoice numbering with no gaps
  + Clear revenue recognition policy consistently applied
  + Written credit policies actually followed

AUDITORS RED FLAGS:
  - Manual journal entries to revenue accounts (possible manipulation)
  - Large round-number journal entries near period-end
  - Adjustments to prior periods without documentation
  - Users with excessive access (e.g., can create AND approve payments)
  - Bank reconciliation not performed for months
  - Large unapplied cash balances (old unmatched payments)
  - Significant related-party transactions without disclosure
  - Revenue recognized before delivery confirmed
  - Inventory adjustments without physical count support
  - Missing or expired tax exemption certificates
  - Gaps in invoice numbering (deleted invoices?)
  - Backdated transactions
  - Price overrides without documented approval
```

### Implementation in HyperQuote

```
DATABASE DESIGN FOR AUDIT TRAIL:

Option A: Audit Log Table (recommended for HyperQuote)
  audit_log (
    id UUID PRIMARY KEY,
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    action TEXT NOT NULL,  -- 'CREATE', 'UPDATE', 'VOID', 'APPROVE'
    changed_by UUID REFERENCES auth.users(id),
    changed_at TIMESTAMPTZ DEFAULT now(),
    old_values JSONB,
    new_values JSONB,
    reason TEXT,  -- required for voids and adjustments
    ip_address TEXT,
    user_agent TEXT
  )

Option B: Temporal Tables (PostgreSQL built-in)
  - Every table has a history table that auto-captures changes
  - More storage but more queryable for point-in-time reporting

RECOMMENDATION: Use BOTH.
  - Audit log table for all financial events (human-readable)
  - Temporal tables on key financial tables (invoices, payments, inventory)
    for point-in-time reconstruction

SOFT DELETE PATTERN:
  Every financial record has:
    is_voided BOOLEAN DEFAULT false
    voided_at TIMESTAMPTZ
    voided_by UUID
    void_reason TEXT

  Never DELETE. Always soft-delete with void reason.
```

---

## 10. Bank Feed Integration

### How Distributors Get Bank Data Into Their Systems

#### Option 1: Manual Entry (Still Common, Unfortunately)

```
WORKFLOW:
  1. Log into bank portal each morning
  2. Download previous day's transactions (CSV or PDF)
  3. Manually enter each transaction into accounting system
  4. Match to invoices/bills

PROS: Zero setup cost, works with any bank
CONS: Error-prone, time-consuming, delayed
WHO USES THIS: Small distributors, $1M-$10M revenue
```

#### Option 2: CSV Import

```
WORKFLOW:
  1. Download bank transactions as CSV from bank portal
  2. Import CSV into accounting system (most support this)
  3. Map columns (date, description, amount, reference)
  4. System suggests matches to existing transactions
  5. User confirms or manually matches

PROS: Low cost, works with most banks, batch processing
CONS: Not real-time, requires daily manual download, formatting issues
WHO USES THIS: Small to mid-size distributors, $5M-$50M revenue
```

#### Option 3: Bank Direct Feeds (OFX/BAI2)

```
WORKFLOW:
  1. Bank provides direct connection to accounting software
  2. Transactions auto-import daily (usually overnight batch)
  3. System auto-matches transactions
  4. User reviews and confirms matches

PROTOCOLS:
  - OFX (Open Financial Exchange): Consumer-grade, most small banks
  - BAI2: Commercial banking standard, major banks for business accounts
  - SWIFT MT940/MT942: International banking statements

PROS: Automated, no manual download, standardized format
CONS: Setup requires bank coordination, not real-time, limited to
      banks that support the protocol
WHO USES THIS: Mid-size to large distributors, $50M+ revenue
```

#### Option 4: Plaid API (Modern Approach)

```
CAPABILITIES:
  - Connect to 12,000+ US financial institutions
  - Pull transaction history (real-time or daily refresh)
  - Get account balances
  - Identity verification
  - Transfer initiation (ACH, RTP, wire)

WIRE TRANSFER SPECIFICS:
  - Plaid CAN see incoming and outgoing wire transfers in transaction feeds
  - Wire details include: amount, date, counterparty name, reference number
  - Plaid Transfer product can INITIATE wire transfers via API
  - LIMITATION: Wire reference/memo field detail varies by bank
  - LIMITATION: Some business/commercial bank accounts have restricted
    Plaid access (banks may block aggregator access for commercial accounts)

COST:
  - Transactions API: $0.10-$0.50 per connection per month (volume pricing)
  - Transfer API: Per-transaction pricing varies
  - Auth: $0.30-$1.50 per verification

IMPLEMENTATION FOR HYPERQUOTE:
  1. User links their bank account via Plaid Link (OAuth flow)
  2. HyperQuote pulls transactions daily via /transactions/sync
  3. Auto-matching engine compares bank transactions to:
     - Open invoices (for incoming payments)
     - Recorded supplier payments (for outgoing payments)
  4. Matches displayed for user confirmation
  5. Unmatched transactions flagged for manual review

IMPORTANT LIMITATIONS FOR B2B:
  - Many commercial/business bank accounts at major banks (Chase Commercial,
    BofA CashPro, Wells Fargo CEO Portal) have LIMITED Plaid support
  - Wire transfer detail (reference numbers) may be truncated
  - Real-time wire notifications are NOT available via Plaid
  - For large distributors, bank direct feeds (BAI2) may be more reliable
```

#### Option 5: Major Bank APIs (Enterprise)

```
FOR LARGE DISTRIBUTORS ($100M+ revenue):

JP Morgan Access API:
  - Real-time balance and transaction reporting
  - Wire initiation and tracking
  - Full remittance data for incoming wires
  - BAI2 and SWIFT statement delivery

Bank of America CashPro API:
  - Real-time notifications for incoming wires
  - Transaction reporting with full detail
  - Payment initiation (wire, ACH)

Wells Fargo CEO Portal API:
  - Similar capabilities to above

HSBC HSBCnet API:
  - Strong for international wire transfers
  - Multi-currency support

PROS: Full wire transfer detail, real-time notifications, reliable
CONS: Requires relationship with the bank, complex onboarding,
      minimum account size requirements, each bank is different
```

### Recommended Approach for HyperQuote

```
PHASE 1 (MVP): CSV Import + Manual Entry
  - Build a bank transaction import screen
  - Accept CSV files from any bank
  - Column mapping interface (which column is date, amount, etc.)
  - Auto-suggest matches to open invoices and recorded payments
  - Manual confirmation workflow
  - TIME TO BUILD: 2-3 weeks
  - COST: $0

PHASE 2 (v2): Plaid Integration
  - Add Plaid Link for bank account connection
  - Auto-pull daily transactions
  - Enhanced auto-matching with AI assistance
  - Works well for many business bank accounts
  - TIME TO BUILD: 3-4 weeks
  - COST: Plaid usage fees ($500-$2,000/month depending on connections)

PHASE 3 (Enterprise): Bank Direct Feeds
  - BAI2 file import for commercial banks
  - Direct API integration with JP Morgan / BofA / Wells Fargo
  - Real-time wire notifications
  - Full remittance data capture
  - TIME TO BUILD: 4-8 weeks per bank
  - COST: Bank-specific (may require minimum relationship size)

INTERIM SOLUTION (all phases):
  - Allow users to manually record payments from the bank portal
  - Email notification parsing: many banks send wire notification emails
  - Forward wire notifications to a HyperQuote email address for parsing
```

---

## 11. HyperQuote Implementation Recommendations

### Phase 1 -- Core Financial Operations (Build First)

```
MUST-HAVE FOR LAUNCH:

1. Invoice Generation
   - Auto-generate from confirmed orders/shipments
   - Support progress billing and milestone invoicing
   - Retainage calculation
   - Tax calculation via Avalara API
   - PDF generation and email delivery
   - Sequential numbering, no gaps

2. AR Sub-Ledger
   - Customer balances dashboard
   - AR aging report (current, 1-30, 31-60, 61-90, 91-120, 120+)
   - Payment recording (wire, check, LC)
   - Cash application (match payment to invoice)
   - Partial payment handling
   - Credit memo creation and application
   - Unapplied cash tracking
   - Customer credit limit enforcement

3. PO Management
   - PO creation from customer orders
   - PO approval workflow
   - PO transmission to suppliers
   - Receiving against PO

4. AP Sub-Ledger
   - Supplier invoice entry
   - Three-way match engine (PO + Receipt + Invoice)
   - Exception flagging and resolution
   - AP aging report
   - Payment scheduling with approval workflow

5. Payment Recording
   - Record outgoing payments (wire, check, ACH)
   - Record incoming payments
   - Match to invoices/bills
   - Dual authorization for large payments

6. Basic Dashboards
   - Cash position
   - AR aging summary
   - AP aging summary
   - Revenue MTD/YTD
   - Margin summary

7. QuickBooks Online Integration
   - Sync invoices -> QBO as Invoices
   - Sync payments -> QBO as Payments
   - Sync supplier invoices -> QBO as Bills
   - Sync supplier payments -> QBO as Bill Payments
   - Pull bank balances from QBO

8. Audit Trail
   - Complete audit log on all financial records
   - Soft delete pattern (no hard deletes)
   - User attribution on every action
```

### Phase 2 -- Advanced Financial Features

```
BUILD AFTER LAUNCH:

1. Bank Feed Integration (CSV import + Plaid)
2. 13-Week Cash Flow Forecast
3. Supplier Rebate Tracking
4. Customer Profitability Analysis
5. Bad Debt Reserve Calculation (automated aging-based)
6. Dunning/Collections Automation (auto-emails)
7. Margin Analysis Reports (by customer, product, project)
8. Tax Exemption Certificate Management
9. Budget vs. Actual Reporting
10. Multi-entity support (if white-label clients have subsidiaries)
```

### Phase 3 -- Enterprise Features

```
BUILD WHEN NEEDED:

1. NetSuite / SAP integration (for enterprise clients)
2. Bank direct feeds (BAI2, bank APIs)
3. LC management module
4. Multi-currency accounting
5. Intercompany transactions
6. Consolidated financial reporting
7. Custom financial statement builder
8. Automated month-end close checklist
```

### Data Model Considerations

```
KEY FINANCIAL TABLES IN HYPERQUOTE:

invoices
  - id, invoice_number, customer_id, order_id
  - issue_date, due_date, payment_terms
  - subtotal, tax_amount, total_amount
  - amount_paid, amount_due, status
  - retainage_percent, retainage_amount
  - created_by, approved_by, voided_by
  - synced_to_accounting (boolean + external_id)

invoice_line_items
  - id, invoice_id, product_id, description
  - quantity, unit_price, line_total
  - tax_code, tax_amount
  - cost_price (for margin calculation)

payments_received
  - id, customer_id, payment_date, amount
  - payment_method (wire, check, ach, lc)
  - reference_number (wire ref, check #, LC #)
  - bank_account, status
  - unapplied_amount
  - created_by, approved_by

payment_applications
  - id, payment_id, invoice_id
  - amount_applied, application_date
  - created_by

credit_memos
  - id, customer_id, invoice_id (original)
  - amount, reason_code, reason_text
  - status, approved_by

supplier_invoices
  - id, supplier_id, po_id, invoice_number
  - invoice_date, due_date, payment_terms
  - subtotal, tax_amount, total_amount
  - three_way_match_status (matched, exception, pending)
  - approved_for_payment, approved_by

payments_sent
  - id, supplier_id, payment_date, amount
  - payment_method, reference_number
  - batch_id, approved_by

supplier_invoice_applications
  - id, payment_sent_id, supplier_invoice_id
  - amount_applied

audit_log
  - id, table_name, record_id, action
  - changed_by, changed_at
  - old_values (JSONB), new_values (JSONB)
  - reason, ip_address
```

---

## Sources

- [Vencru - Chart of Accounts for Wholesale Distributors](https://vencru.com/blog/chart-of-accounts-for-wholesale-distributors/)
- [AccountingCoach - Chart of Accounts Explanation](https://www.accountingcoach.com/chart-of-accounts/explanation)
- [Scribd - QB Wholesale Distribution Chart of Accounts](https://www.scribd.com/document/585535619/QB-Wholesale-Distribution-chart-of-Accounts)
- [Fastlane - Accounting for Wholesale Industry](https://fastlane-global.com/hk/industry/accounting-for-wholesale-industry/)
- [Versapay - What is Cash Application](https://www.versapay.com/resources/what-is-cash-application)
- [Emagia - Unapplied Cash in Cash Application](https://www.emagia.com/resources/glossary/unapplied-cash-in-cash-application/)
- [SafeBooks - Cash Application Complete Guide](https://safebooks.ai/resources/financial-data-governance/cash-application-101-complete-guide-to-process-automation-and-best-practices/)
- [Billtrust - What is Cash Application](https://www.billtrust.com/resources/blog/what-is-cash-application)
- [Ramp - What is 3-Way Matching in Accounts Payable](https://ramp.com/blog/accounts-payable/3-way-match)
- [NetSuite - Three-Way Matching](https://www.netsuite.com/portal/resource/articles/accounting/three-way-matching.shtml)
- [Mercury - Three-Way Match AP Process](https://mercury.com/blog/three-way-match-accounts-payable)
- [HighRadius - 2/10 Net 30 Early Payment Discount](https://www.highradius.com/resources/Blog/2-10-net-30/)
- [Grant Thornton - Inventory Discounts and Rebates IFRS](https://www.grantthornton.global/globalassets/1.-member-firms/global/insights/article-pdfs/ifrs/ifrs-viewpoint-3---inventory-discounts-and-rebates.pdf)
- [Deloitte - Enhanced Cash Flow Forecasting and Working Capital](https://www2.deloitte.com/us/en/pages/operations/articles/enhancing-cash-flow-forecasting.html)
- [Finoya - Cash Flow Planning for Manufacturing](https://www.finoya.ai/blog/cash-flow-planning-for-manufacturing-businesses-a-practical-guide/)
- [Versapay - 8 Ways for Distributors to Preserve Cash Flow](https://www.versapay.com/resources/8-ways-for-distributors-to-preserve-cash-flow-in-a-slowing-economy)
- [Westport Financial - Cash Flow Management for Manufacturers](https://westportfinancial.com/blog/03/06/2026/cash-flow-manufacturers/)
- [Unified.to - 15 Accounting APIs to Integrate With in 2026](https://unified.to/blog/15_accounting_apis_to_integrate_with_in_2026_quickbooks_xero_freshbooks_and_unified_accounting_apis)
- [Apideck - ERP Integration for Fintech and SaaS](https://www.apideck.com/blog/erp-integration-for-fintech-and-saas-connecting-quickbooks-netsuite-and-sage)
- [NetSuite - QuickBooks vs ERP](https://www.netsuite.com/portal/resource/articles/accounting/quickbooks-vs-erp.shtml)
- [Apideck - Bank API Integration](https://www.apideck.com/blog/bank-api-integration)
- [Rutter - Bank Feeds: Sync Banking Data to Any Accounting System](https://www.rutter.com/blog/bank-feeds-sync-banking-data-to-any-accounting-system-netsuite-sage)
- [Plaid - Transactions API](https://plaid.com/docs/api/products/transactions/)
- [Plaid - Transfer Overview](https://plaid.com/docs/transfer/)
- [Acumatica - Bank Feed Software](https://www.acumatica.com/cloud-erp-software/financial-management/bank-feeds/)
- [Wolters Kluwer - Sales Tax Rules for Construction](https://www.wolterskluwer.com/en/expert-insights/understanding-sales-tax-rules-for-the-construction-industry)
- [Avalara - Origin vs Destination Sales Tax](https://www.avalara.com/us/en/learn/whitepapers/origin-vs-destination-sales-tax.html)
- [Avalara - AvaTax Sales Tax Calculation](https://www.avalara.com/us/en/products/calculations.html)
- [Avalara - Tax API Developer Docs](https://developer.avalara.com/documentation/)
- [Planful - Measuring and Managing Customer Profitability](https://planful.com/blog/a-key-task-for-finance-measuring-and-managing-customer-profitability/)
- [Versapay - Allowance for Doubtful Accounts Guide](https://www.versapay.com/resources/allowance-for-doubtful-accounts)
- [Allianz Trade - Allowance for Doubtful Accounts](https://www.allianz-trade.com/en_US/insights/disadvantages-of-bad-debt-reserves.html)
- [HighRadius - Bad Debt Expense Calculation](https://www.highradius.com/resources/Blog/bad-debt-expense-calculation/)
- [Bitsight - SOX Compliance Checklist](https://www.bitsight.com/learn/compliance/sox-compliance-checklist)
- [Imperva - SOX Compliance](https://www.imperva.com/learn/data-security/sarbanes-oxley-act-sox/)
- [IBM - SOX Compliance](https://www.ibm.com/think/topics/sox-compliance)
- [UpGuard - SOX Compliance 2026](https://www.upguard.com/blog/sox-compliance)
- [NetSuite - Wholesale Distribution Accounting Software](https://www.netsuite.com/portal/industries/wholesale-distribution-accounting.shtml)
- [Trade Finance Global - Documentary Collections](https://www.tradefinanceglobal.com/letters-of-credit/documentary-collections/)
- [Numeric - Cash Reconciliation Guide](https://www.numeric.io/blog/cash-reconciliation-guide)
- [BusinessNewsDaily - Accounting Checklist Daily Weekly Monthly](https://www.businessnewsdaily.com/11079-daily-accounting-checklist.html)
- [AccountingSeed - Accounting Process Checklist](https://www.accountingseed.com/resource/blog/accounting-process-checklist-streamline-your-workflows/)
