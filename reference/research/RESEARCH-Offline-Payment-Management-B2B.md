> ⚠️ **REFERENCE DOCUMENT — NOT THE SOURCE OF TRUTH**
> This file was written during the research phase and may contain outdated decisions, US-centric references, or superseded technical choices.
> **Always defer to `essential/RESEARCH.md` for current decisions.**
> Key changes since this file was written: TanStack Start (not Next.js), Capacitor (not Expo), React Aria (not shadcn), Egyptian law (not US FMCSA), EGP (not USD), dual auth pools, no online payments, no mobile wallets, spatial glass UI (not traditional dashboards).

# RESEARCH: Offline / Traditional Payment Management for Large-Scale B2B Building Materials Distribution

**Research Date:** 2026-03-28
**Scope:** Payment management for orders $10M-$100M+ via wire transfers, certified checks, letters of credit, bank guarantees
**Target System:** Custom-built on Supabase + Cloudflare

---

## Table of Contents

1. [How Large B2B Building Materials Distributors Handle Payments](#1-how-large-b2b-distributors-handle-payments)
2. [Payment Terms for Large Construction Orders](#2-payment-terms-for-large-construction-orders)
3. [Credit Management for High-Value B2B](#3-credit-management-for-high-value-b2b)
4. [Invoice and Payment Tracking System Design](#4-invoice-and-payment-tracking-system-design)
5. [Bank Reconciliation for B2B Distribution](#5-bank-reconciliation-for-b2b-distribution)
6. [Letters of Credit and Bank Guarantees](#6-letters-of-credit-and-bank-guarantees)
7. [Retention/Retainage in Construction](#7-retentionretainage-in-construction)
8. [Progress Billing / Milestone Payments](#8-progress-billing--milestone-payments)
9. [Multi-Currency for International Suppliers](#9-multi-currency-for-international-suppliers)
10. [Construction Lien Rights and Preliminary Notices](#10-construction-lien-rights-and-preliminary-notices)
11. [Accounts Receivable at Scale](#11-accounts-receivable-at-scale)
12. [ERP Payment Module Features to Replicate](#12-erp-payment-module-features-to-replicate)

---

## 1. How Large B2B Distributors Handle Payments

### Industry Context

Companies like Builders FirstSource (largest US structural building products supplier), CRH, Saint-Gobain, and Ferguson handle billions in annual revenue through traditional offline payment methods. These are NOT online checkout flows.

### Payment Methods by Order Size

| Order Size | Primary Methods | Secondary Methods |
|---|---|---|
| $10K-$100K | Company check, ACH transfer | Credit card (rare, 2-3% surcharge) |
| $100K-$1M | Wire transfer, certified check | ACH, company check with credit approval |
| $1M-$10M | Wire transfer, letter of credit | Certified check, progress payments |
| $10M-$100M+ | Letter of credit, wire transfer series | Bank guarantee, progress billing with retainage |

### Standard Payment Flow for Large Orders

```
1. CREDIT APPLICATION
   Customer submits credit application
   -> Trade references checked (3-5 supplier references)
   -> Bank references verified
   -> Business credit report pulled (D&B, Experian Business)
   -> Financial statements reviewed (for large limits)
   -> Credit limit established

2. ORDER PLACEMENT
   Purchase order received
   -> Credit check against available limit
   -> If order exceeds limit: require LC, deposit, or bond
   -> Order confirmed with payment terms

3. INVOICING
   Materials shipped / milestones reached
   -> Invoice generated with payment terms
   -> Invoice sent (email PDF + mailed hard copy for large accounts)
   -> Payment clock starts (Net-30/60/90)

4. PAYMENT RECEIPT
   Customer sends payment via:
   -> Wire transfer: Bank notifies AR team, reference number matched
   -> Certified check: Received by mail, deposited, hold period
   -> ACH: Received electronically, 1-3 day settlement
   -> LC draw: Documents presented to bank, bank pays

5. PAYMENT APPLICATION
   AR team matches payment to invoice(s)
   -> Full payment: Close invoice
   -> Partial payment: Apply to oldest invoices first (or per remittance)
   -> Overpayment: Apply credit to account
   -> Unidentified: Hold in suspense until matched

6. RECONCILIATION
   Daily/weekly bank reconciliation
   -> Match bank transactions to recorded payments
   -> Investigate discrepancies
   -> Update AR aging
```

### Builders FirstSource Specific Terms (from their published T&Cs)

- All invoices due within **30 days**
- Not an installment or revolving account
- Late fee: **1.5% per month** compounded on unpaid balance after the month following purchase
- Credit determined by Credit Department after processing application
- Company reserves right to suspend, terminate, reduce, or increase credit limits at any time
- No obligation to extend credit

### Wire Transfer Process Detail

```
Buyer's Process:
1. Buyer receives invoice with wire instructions
2. Wire instructions include: Bank name, routing number, account number,
   SWIFT code (international), reference/invoice number
3. Buyer initiates wire through their bank
4. Wire typically settles same-day (domestic) or 1-3 days (international)
5. Buyer sends remittance advice (email with wire confirmation + invoice references)

Seller's Process:
1. Bank receives wire, posts to account
2. AR team checks bank portal or receives bank notification
3. Match wire to customer using: amount, remittance advice, reference number
4. Apply payment to specific invoice(s)
5. Update customer account balance
6. Send payment confirmation/receipt to customer
```

### Certified Check Process

```
1. Customer obtains certified check from their bank
2. Check mailed or hand-delivered to supplier's lockbox or office
3. Check received and logged by mailroom/AR team
4. Check deposited (often via mobile deposit for speed)
5. Bank hold period: typically 1-2 business days for certified checks
   (vs 5-7 days for regular checks over $5,525)
6. Funds available, payment applied to invoice(s)
7. Receipt sent to customer
```

---

## 2. Payment Terms for Large Construction Orders

### Standard Terms in Building Materials

| Term | Usage | Typical Customer |
|---|---|---|
| **Net 30** | Most common, standard for established accounts | Mid-size GCs, established builders |
| **Net 60** | Common for large projects, new relationships | Large GCs, institutional buyers |
| **Net 90** | Large private commercial projects | Major developers, government (sometimes longer) |
| **2/10 Net 30** | 2% discount if paid within 10 days | Incentive for early payment |
| **COD** | New customers, no credit established | New accounts, small orders |
| **CIA (Cash in Advance)** | Custom/specialty materials, high-risk customers | Custom fabrication, international |
| **Progress Payments** | Multi-month deliveries, large projects | Projects $1M+ |

### Payment Term Negotiation Factors

- **Customer size and creditworthiness**: Larger, more creditworthy customers negotiate longer terms
- **Order size**: Larger orders may warrant longer terms
- **Relationship history**: Established customers with good payment history get better terms
- **Material type**: Custom/fabricated materials often require deposits (25-50%)
- **Project type**: Government projects often have mandated payment terms
- **Market conditions**: In tight markets, suppliers have more leverage on terms

### Progress Payment Structures

For orders delivered over weeks/months:

```
Structure A: Time-Based
- Payment every 30 days for work completed
- Invoice submitted with proof of delivery
- Common for ongoing supply agreements

Structure B: Milestone-Based
- 25% at order confirmation (deposit)
- 25% at first delivery
- 25% at 50% delivery completion
- 25% at final delivery
- Less retainage holdback

Structure C: Percentage-of-Completion
- Monthly billing based on % of materials delivered
- Uses AIA G702/G703 format
- Retainage withheld per payment (5-10%)
- Retainage released at substantial completion

Structure D: Pay-When-Paid (Construction Specific)
- Supplier paid when GC receives payment from owner
- Enforceability varies by state
- RISKY for suppliers -- many states limit enforceability
- Supplier should always preserve lien rights as backup
```

### Early Payment Discounts

```
Common Discount Terms:
- 2/10 Net 30: 2% discount if paid within 10 days (most common)
- 1/10 Net 30: 1% discount if paid within 10 days
- 3/10 Net 60: 3% discount if paid within 10 days of 60-day term
- 5/10 Net 90: 5% discount on large, long-term orders

Annualized Return of 2/10 Net 30:
- Customer saves 2% by paying 20 days early
- Annualized: ~36% return on money
- Smart buyers ALWAYS take this discount
- System must track discount eligibility and expiration
```

### System Implementation: Payment Terms

```sql
-- Payment Terms Configuration
CREATE TABLE payment_terms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) NOT NULL UNIQUE,        -- 'NET30', 'NET60', '2_10_NET30'
    name VARCHAR(100) NOT NULL,               -- 'Net 30', '2/10 Net 30'
    due_days INTEGER NOT NULL,                -- 30, 60, 90
    discount_percent DECIMAL(5,2) DEFAULT 0,  -- 2.00 for 2/10
    discount_days INTEGER DEFAULT 0,          -- 10 for 2/10
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Customer Payment Terms (can vary by customer)
CREATE TABLE customer_payment_terms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id),
    payment_term_id UUID NOT NULL REFERENCES payment_terms(id),
    effective_date DATE NOT NULL,
    end_date DATE,                            -- NULL = currently active
    approved_by UUID REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Insert standard terms
INSERT INTO payment_terms (code, name, due_days, discount_percent, discount_days) VALUES
('COD', 'Cash on Delivery', 0, 0, 0),
('CIA', 'Cash in Advance', -1, 0, 0),  -- -1 = before shipment
('NET30', 'Net 30', 30, 0, 0),
('NET60', 'Net 60', 60, 0, 0),
('NET90', 'Net 90', 90, 0, 0),
('2_10_NET30', '2/10 Net 30', 30, 2.00, 10),
('1_10_NET30', '1/10 Net 30', 30, 1.00, 10),
('PROGRESS', 'Progress Payments', 30, 0, 0),
('MILESTONE', 'Milestone-Based', 0, 0, 0);
```

---

## 3. Credit Management for High-Value B2B

### Credit Assessment Process

```
TIER 1: Small Accounts ($0 - $100K credit limit)
- Basic credit application
- 3 trade references
- Bank reference
- D&B report
- Approval: Regional credit manager

TIER 2: Medium Accounts ($100K - $1M credit limit)
- Full credit application + financial statements
- 5 trade references
- Bank reference + bank rating
- D&B + Experian Business reports
- Last 2-3 years of financials (P&L, Balance Sheet)
- Personal guarantee from principals (if privately held)
- Approval: Senior credit manager

TIER 3: Large Accounts ($1M - $10M credit limit)
- Everything in Tier 2 PLUS:
- Audited financial statements
- Credit insurance evaluation
- Payment bond or surety bond consideration
- Construction lien rights assessment
- Site visits / relationship management
- Approval: VP of Finance or Credit Committee

TIER 4: Major Accounts ($10M+ credit limit)
- Everything in Tier 3 PLUS:
- Letter of credit or bank guarantee required
- Credit insurance mandatory (or self-insured with reserves)
- Surety bond from rated surety company
- Ongoing financial monitoring (quarterly)
- Credit committee approval with CEO/CFO sign-off
- May require parent company guarantee
```

### Credit Risk Management Tools

#### 1. Trade Credit Insurance

The Big Three providers control ~75% of the global market:

- **Allianz Trade (formerly Euler Hermes)**: Largest global credit insurer
- **Coface**: Strong in construction and emerging markets
- **Atradius**: Strong in Europe and Americas

**How it works:**
- Insurer evaluates your customer portfolio
- Sets credit limits per customer (may be lower than your internal limits)
- Covers 80-90% of losses if customer defaults
- Premium: typically 0.1% to 0.5% of insured sales
- For a $100M portfolio: $100K-$500K annual premium
- Insurer also provides credit intelligence and early warnings
- Construction sector gets extra scrutiny -- premiums may be higher

**System tracking needed:**
```sql
CREATE TABLE credit_insurance_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    insurer VARCHAR(100) NOT NULL,          -- 'Allianz Trade', 'Coface', 'Atradius'
    policy_number VARCHAR(50) NOT NULL,
    effective_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    coverage_percent DECIMAL(5,2) NOT NULL, -- 85.00 = 85%
    annual_premium DECIMAL(15,2),
    max_coverage DECIMAL(15,2),             -- Total policy limit
    deductible DECIMAL(15,2),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE customer_credit_insurance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id),
    policy_id UUID NOT NULL REFERENCES credit_insurance_policies(id),
    insured_limit DECIMAL(15,2) NOT NULL,   -- Limit set by insurer for this customer
    effective_date DATE NOT NULL,
    expiry_date DATE,
    status VARCHAR(20) DEFAULT 'active',    -- active, suspended, declined, expired
    last_review_date DATE,
    next_review_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);
```

#### 2. Surety Bonds / Payment Bonds

- **Payment Bond**: Guarantees that the contractor will pay all suppliers and subcontractors
- **Performance Bond**: Guarantees project completion
- Required by law on federal projects over $150K (Miller Act)
- Required on most state/municipal projects (Little Miller Acts)
- Common on large private projects

**Bond costs:**
- Premium: 0.5% to 3% of bond amount (based on contractor's credit/history)
- For a $100M project: $500K-$3M bond premium
- Three-party agreement: Principal (contractor), Obligee (project owner), Surety (bond company)

**System tracking:**
```sql
CREATE TABLE bonds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bond_type VARCHAR(30) NOT NULL,         -- 'payment', 'performance', 'bid'
    bond_number VARCHAR(50) NOT NULL,
    surety_company VARCHAR(100) NOT NULL,   -- 'Travelers', 'Liberty Mutual', 'CNA'
    principal_id UUID REFERENCES customers(id),  -- The contractor
    project_id UUID REFERENCES projects(id),
    bond_amount DECIMAL(15,2) NOT NULL,
    premium DECIMAL(15,2),
    effective_date DATE NOT NULL,
    expiry_date DATE,
    status VARCHAR(20) DEFAULT 'active',
    document_url TEXT,                       -- Link to bond document in R2/storage
    created_at TIMESTAMPTZ DEFAULT now()
);
```

#### 3. Letters of Credit (detailed in Section 6)

#### 4. Personal Guarantees

```sql
CREATE TABLE personal_guarantees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id),
    guarantor_name VARCHAR(200) NOT NULL,
    guarantor_title VARCHAR(100),
    guarantee_amount DECIMAL(15,2),          -- NULL = unlimited
    effective_date DATE NOT NULL,
    expiry_date DATE,                        -- NULL = until revoked
    document_url TEXT,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT now()
);
```

### Credit Limit Management

```sql
CREATE TABLE customer_credit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id),
    credit_limit DECIMAL(15,2) NOT NULL,
    temporary_limit DECIMAL(15,2),           -- Temporary increase
    temp_limit_expiry DATE,
    credit_score_internal INTEGER,            -- Internal 1-100 score
    risk_rating VARCHAR(10),                  -- 'A', 'B', 'C', 'D', 'F'
    dun_bradstreet_number VARCHAR(20),
    dun_bradstreet_rating VARCHAR(10),
    last_review_date DATE,
    next_review_date DATE,
    credit_hold BOOLEAN DEFAULT false,        -- Account on hold
    hold_reason TEXT,
    approved_by UUID REFERENCES users(id),
    notes TEXT,
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Credit utilization tracking (real-time view)
CREATE OR REPLACE VIEW customer_credit_utilization AS
SELECT
    c.id AS customer_id,
    c.company_name,
    cc.credit_limit,
    COALESCE(cc.temporary_limit, cc.credit_limit) AS effective_limit,
    COALESCE(ar.outstanding_balance, 0) AS outstanding_ar,
    COALESCE(oo.open_orders_value, 0) AS open_orders_value,
    COALESCE(ar.outstanding_balance, 0) + COALESCE(oo.open_orders_value, 0) AS total_exposure,
    COALESCE(cc.temporary_limit, cc.credit_limit) -
        (COALESCE(ar.outstanding_balance, 0) + COALESCE(oo.open_orders_value, 0)) AS available_credit,
    ROUND(
        (COALESCE(ar.outstanding_balance, 0) + COALESCE(oo.open_orders_value, 0)) /
        NULLIF(COALESCE(cc.temporary_limit, cc.credit_limit), 0) * 100, 2
    ) AS utilization_percent,
    cc.risk_rating,
    cc.credit_hold
FROM customers c
JOIN customer_credit cc ON c.id = cc.customer_id
LEFT JOIN (
    SELECT customer_id, SUM(balance_due) AS outstanding_balance
    FROM invoices WHERE status != 'paid' AND status != 'cancelled'
    GROUP BY customer_id
) ar ON c.id = ar.customer_id
LEFT JOIN (
    SELECT customer_id, SUM(total_amount - COALESCE(invoiced_amount, 0)) AS open_orders_value
    FROM orders WHERE status IN ('confirmed', 'in_progress', 'shipped')
    GROUP BY customer_id
) oo ON c.id = oo.customer_id;
```

---

## 4. Invoice and Payment Tracking System Design

### Core Database Schema

This is the heart of the payment management system. The key insight is that **invoices and payments are separate entities connected by a many-to-many allocation table**, because one payment can cover multiple invoices and one invoice can receive multiple partial payments.

```sql
-- ============================================================
-- CORE INVOICING TABLES
-- ============================================================

CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(30) NOT NULL UNIQUE,  -- 'INV-2026-000001'
    order_id UUID REFERENCES orders(id),
    customer_id UUID NOT NULL REFERENCES customers(id),
    project_id UUID REFERENCES projects(id),

    -- Financial
    subtotal DECIMAL(15,2) NOT NULL,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    shipping_amount DECIMAL(15,2) DEFAULT 0,
    retainage_percent DECIMAL(5,2) DEFAULT 0,    -- 5.00, 10.00
    retainage_amount DECIMAL(15,2) DEFAULT 0,    -- Calculated withheld amount
    total_amount DECIMAL(15,2) NOT NULL,          -- Subtotal + tax + shipping
    amount_due DECIMAL(15,2) NOT NULL,            -- Total - retainage (what's actually billed now)
    amount_paid DECIMAL(15,2) DEFAULT 0,
    balance_due DECIMAL(15,2) NOT NULL,           -- amount_due - amount_paid

    -- Currency
    currency VARCHAR(3) DEFAULT 'USD',
    exchange_rate DECIMAL(12,6) DEFAULT 1.000000,

    -- Dates
    invoice_date DATE NOT NULL,
    due_date DATE NOT NULL,
    discount_date DATE,                           -- Date early payment discount expires
    discount_amount DECIMAL(15,2) DEFAULT 0,      -- Early payment discount available

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    -- draft, sent, partially_paid, paid, overdue, disputed, cancelled, written_off

    -- Payment terms snapshot (frozen at invoice creation)
    payment_term_code VARCHAR(20),
    payment_term_days INTEGER,

    -- Metadata
    notes TEXT,
    internal_notes TEXT,
    po_number VARCHAR(50),                        -- Customer's PO number
    created_by UUID REFERENCES users(id),
    sent_at TIMESTAMPTZ,
    sent_method VARCHAR(20),                      -- 'email', 'mail', 'portal', 'edi'

    -- Lien tracking
    preliminary_notice_sent BOOLEAN DEFAULT false,
    preliminary_notice_date DATE,
    lien_deadline DATE,

    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Invoice line items (denormalized product info -- frozen at invoice time)
CREATE TABLE invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    line_number INTEGER NOT NULL,
    order_item_id UUID REFERENCES order_items(id),
    delivery_id UUID REFERENCES deliveries(id),

    -- Product snapshot
    product_id UUID REFERENCES products(id),
    product_sku VARCHAR(50),
    description TEXT NOT NULL,
    unit_of_measure VARCHAR(20),

    -- Quantities and amounts
    quantity DECIMAL(12,3) NOT NULL,
    unit_price DECIMAL(12,4) NOT NULL,
    line_total DECIMAL(15,2) NOT NULL,
    tax_rate DECIMAL(5,2) DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,

    -- For progress billing
    scheduled_value DECIMAL(15,2),             -- Total contract value for this line
    previous_completed DECIMAL(15,2) DEFAULT 0, -- Previously billed
    this_period DECIMAL(15,2),                 -- This billing period
    materials_stored DECIMAL(15,2) DEFAULT 0,  -- Materials stored but not installed
    percent_complete DECIMAL(5,2),

    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- PAYMENT RECORDING TABLES
-- ============================================================

-- Payments received (each wire, check, etc. is one record)
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_number VARCHAR(30) NOT NULL UNIQUE,   -- 'PMT-2026-000001'
    customer_id UUID NOT NULL REFERENCES customers(id),

    -- Payment details
    payment_method VARCHAR(30) NOT NULL,
    -- 'wire_transfer', 'certified_check', 'company_check', 'ach',
    -- 'letter_of_credit', 'cash', 'credit_card'

    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    exchange_rate DECIMAL(12,6) DEFAULT 1.000000,
    amount_in_base_currency DECIMAL(15,2),        -- Amount in home currency

    -- Allocation tracking
    allocated_amount DECIMAL(15,2) DEFAULT 0,     -- How much has been applied to invoices
    unallocated_amount DECIMAL(15,2),              -- Remaining unapplied amount

    -- Payment reference info
    reference_number VARCHAR(100),                 -- Wire ref, check number, ACH trace
    bank_reference VARCHAR(100),                   -- Bank's internal reference
    remittance_info TEXT,                           -- Customer's remittance advice text
    payer_bank_name VARCHAR(200),
    payer_account_last4 VARCHAR(4),

    -- Dates
    payment_date DATE NOT NULL,                    -- Date payment was made
    received_date DATE NOT NULL,                   -- Date we received it
    deposit_date DATE,                             -- Date deposited (for checks)
    cleared_date DATE,                             -- Date funds cleared/available
    value_date DATE,                               -- Bank value date

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'received',
    -- received, deposited, cleared, allocated, partially_allocated,
    -- returned, bounced, cancelled, suspense

    -- Bank reconciliation
    bank_transaction_id VARCHAR(100),              -- ID from bank feed
    reconciled BOOLEAN DEFAULT false,
    reconciled_at TIMESTAMPTZ,
    reconciled_by UUID REFERENCES users(id),

    -- Metadata
    recorded_by UUID NOT NULL REFERENCES users(id),
    notes TEXT,
    document_url TEXT,                              -- Scan of check, wire confirmation

    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- PAYMENT ALLOCATION TABLE (the critical many-to-many join)
-- ============================================================

-- This table connects payments to invoices
-- One payment can be split across multiple invoices
-- One invoice can receive multiple partial payments
CREATE TABLE payment_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID NOT NULL REFERENCES payments(id),
    invoice_id UUID NOT NULL REFERENCES invoices(id),
    amount DECIMAL(15,2) NOT NULL,                 -- Amount of this payment applied to this invoice
    discount_taken DECIMAL(15,2) DEFAULT 0,        -- Early payment discount taken
    write_off_amount DECIMAL(15,2) DEFAULT 0,      -- Small balance write-off
    allocation_date DATE NOT NULL,
    notes TEXT,
    allocated_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT now(),

    -- Prevent duplicate allocations
    UNIQUE(payment_id, invoice_id)
);

-- ============================================================
-- CREDIT MEMOS / ADJUSTMENTS
-- ============================================================

CREATE TABLE credit_memos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    memo_number VARCHAR(30) NOT NULL UNIQUE,       -- 'CM-2026-000001'
    customer_id UUID NOT NULL REFERENCES customers(id),
    original_invoice_id UUID REFERENCES invoices(id),
    reason VARCHAR(50) NOT NULL,
    -- 'return', 'pricing_error', 'damaged_goods', 'short_shipment',
    -- 'early_payment_discount', 'volume_rebate', 'goodwill'
    amount DECIMAL(15,2) NOT NULL,
    applied_to_invoice_id UUID REFERENCES invoices(id),
    status VARCHAR(20) DEFAULT 'pending',           -- pending, approved, applied, cancelled
    approved_by UUID REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================

CREATE INDEX idx_invoices_customer ON invoices(customer_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);
CREATE INDEX idx_invoices_number ON invoices(invoice_number);
CREATE INDEX idx_payments_customer ON payments(customer_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_date ON payments(payment_date);
CREATE INDEX idx_payment_alloc_payment ON payment_allocations(payment_id);
CREATE INDEX idx_payment_alloc_invoice ON payment_allocations(invoice_id);

-- Composite index for aging queries
CREATE INDEX idx_invoices_aging ON invoices(customer_id, status, due_date)
    WHERE status NOT IN ('paid', 'cancelled', 'written_off');
```

### Payment Recording Workflow

```
WIRE TRANSFER RECEIVED:
1. Bank notification arrives (email alert or bank portal check)
2. AR clerk creates payment record:
   - payment_method: 'wire_transfer'
   - reference_number: wire reference from bank
   - amount: exact amount received
   - received_date: today
   - status: 'cleared' (wires are immediate)
3. Match to customer using: remittance advice, amount, reference
4. Allocate to invoice(s):
   - Open customer's outstanding invoices
   - Apply payment (oldest first, or per customer's remittance)
   - Create payment_allocation record for each invoice touched
5. Update invoice balances:
   - invoice.amount_paid += allocation.amount
   - invoice.balance_due = invoice.amount_due - invoice.amount_paid
   - If balance_due = 0: invoice.status = 'paid'
   - If balance_due > 0 and amount_paid > 0: status = 'partially_paid'

CHECK RECEIVED:
1. Mail opened, check logged
2. AR clerk creates payment record:
   - payment_method: 'certified_check' or 'company_check'
   - reference_number: check number
   - amount: check amount
   - received_date: today
   - status: 'received'
3. Check deposited:
   - deposit_date: date deposited
   - status: 'deposited'
4. Check clears:
   - cleared_date: date funds available
   - status: 'cleared'
5. Allocate to invoices (same as wire step 4-5)

ACH RECEIVED:
1. Bank shows ACH credit
2. AR clerk creates payment record:
   - payment_method: 'ach'
   - reference_number: ACH trace number
   - received_date: today
   - status: 'cleared' (after settlement)
3. Allocate to invoices
```

### Auto-Matching Logic

```sql
-- Function to attempt auto-matching a payment to invoices
CREATE OR REPLACE FUNCTION attempt_payment_auto_match(p_payment_id UUID)
RETURNS TABLE(invoice_id UUID, confidence VARCHAR(10)) AS $$
BEGIN
    RETURN QUERY
    WITH payment_info AS (
        SELECT p.customer_id, p.amount, p.reference_number, p.remittance_info
        FROM payments p WHERE p.id = p_payment_id
    )
    -- Exact amount match on single open invoice
    SELECT i.id AS invoice_id, 'high'::VARCHAR(10) AS confidence
    FROM invoices i, payment_info pi
    WHERE i.customer_id = pi.customer_id
      AND i.balance_due = pi.amount
      AND i.status IN ('sent', 'overdue', 'partially_paid')

    UNION ALL

    -- Reference number in invoice number
    SELECT i.id, 'medium'::VARCHAR(10)
    FROM invoices i, payment_info pi
    WHERE i.customer_id = pi.customer_id
      AND i.status IN ('sent', 'overdue', 'partially_paid')
      AND pi.reference_number IS NOT NULL
      AND (
          i.invoice_number ILIKE '%' || pi.reference_number || '%'
          OR i.po_number ILIKE '%' || pi.reference_number || '%'
          OR pi.remittance_info ILIKE '%' || i.invoice_number || '%'
      )

    ORDER BY confidence;
END;
$$ LANGUAGE plpgsql;
```

---

## 5. Bank Reconciliation for B2B Distribution

### Overview

Bank reconciliation matches your internal payment records against actual bank transactions. For large B2B distribution, this is critical because:
- Multiple high-value wire transfers daily
- Checks in transit (deposited but not yet cleared)
- ACH batches that may combine multiple payments
- International wires with currency conversion

### Reconciliation Approaches

#### Option A: Manual Reconciliation (Small Scale)

```
Daily Process:
1. Download bank statement (CSV/PDF) from bank portal
2. Compare each bank transaction to internal payment records
3. Match by: amount, date, reference number
4. Mark matched items as reconciled
5. Investigate unmatched items:
   - Bank transaction with no internal record: unknown deposit
   - Internal record with no bank transaction: timing difference or error
6. Record reconciliation results

Pros: Simple, no integration needed
Cons: Time-consuming, error-prone at scale, delayed visibility
```

#### Option B: Semi-Automated with Bank File Import

```
Daily Process:
1. Bank provides daily transaction file (BAI2, MT940, CSV)
2. System imports file into bank_transactions table
3. Auto-matching engine runs:
   - Match by exact amount + date range
   - Match by reference number
   - Match by customer name in description
4. Present unmatched items to AR team for manual review
5. AR team matches or creates new payment records

Pros: Much faster, catches most matches automatically
Cons: Requires bank file format handling, some manual work
```

#### Option C: Automated with Bank Feed API (Recommended)

```
Real-Time/Near-Real-Time Process:
1. Bank feed API pulls transactions automatically
2. Transactions land in bank_transactions table
3. Auto-matching engine runs continuously
4. Dashboard shows:
   - Auto-matched (high confidence)
   - Suggested matches (medium confidence)
   - Unmatched (requires manual review)
5. AR team handles exceptions only

Providers:
- Plaid: Transactions API + Transfer API (US focused)
  - Supports wire transfers, ACH, check deposits
  - Business account categorization
  - Added end_to_end_id for reconciliation (March 2026)
  - Pricing: per-connection model

- Codat: Bank Feeds API
  - Syncs to accounting software (Xero, QuickBooks, NetSuite)
  - Good for multi-system environments

- AccessPay: sFTP/API bank connectivity
  - Direct bank connections
  - BAI2, MT940, CAMT.053 file processing
  - Good for large enterprise with multiple banks

- MX (formerly MX Technologies): Financial data API
  - Alternative to Plaid
  - Strong business account support

- Yodlee (Envestnet): Bank data aggregation
  - Enterprise-grade
  - Good international bank coverage
```

### Bank Reconciliation Database Schema

```sql
-- Raw bank transactions (imported from bank feed or file)
CREATE TABLE bank_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_account_id UUID NOT NULL REFERENCES bank_accounts(id),
    transaction_id VARCHAR(100),               -- Bank's transaction ID
    transaction_date DATE NOT NULL,
    post_date DATE,
    value_date DATE,
    amount DECIMAL(15,2) NOT NULL,              -- Positive = credit, negative = debit
    currency VARCHAR(3) DEFAULT 'USD',
    description TEXT,
    reference VARCHAR(200),
    counterparty_name VARCHAR(200),
    counterparty_account VARCHAR(50),
    transaction_type VARCHAR(30),               -- 'wire_credit', 'ach_credit', 'check_deposit', etc.
    balance_after DECIMAL(15,2),
    raw_data JSONB,                             -- Full raw data from bank feed

    -- Matching
    matched_payment_id UUID REFERENCES payments(id),
    match_confidence VARCHAR(10),               -- 'auto_high', 'auto_medium', 'manual'
    matched_at TIMESTAMPTZ,
    matched_by UUID REFERENCES users(id),

    -- Status
    status VARCHAR(20) DEFAULT 'unmatched',     -- unmatched, matched, excluded, investigated
    source VARCHAR(20) NOT NULL,                -- 'plaid', 'file_import', 'manual'
    imported_at TIMESTAMPTZ DEFAULT now(),

    UNIQUE(bank_account_id, transaction_id)
);

CREATE TABLE bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_name VARCHAR(100) NOT NULL,
    bank_name VARCHAR(100) NOT NULL,
    account_number_last4 VARCHAR(4),
    routing_number VARCHAR(20),
    swift_code VARCHAR(11),
    currency VARCHAR(3) DEFAULT 'USD',
    account_type VARCHAR(20),                   -- 'checking', 'savings', 'money_market'

    -- Plaid integration
    plaid_item_id VARCHAR(100),
    plaid_account_id VARCHAR(100),
    plaid_access_token_encrypted TEXT,           -- Encrypted!

    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Bank reconciliation sessions
CREATE TABLE bank_reconciliations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_account_id UUID NOT NULL REFERENCES bank_accounts(id),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    statement_balance DECIMAL(15,2) NOT NULL,
    book_balance DECIMAL(15,2) NOT NULL,
    reconciled_balance DECIMAL(15,2),
    difference DECIMAL(15,2),
    status VARCHAR(20) DEFAULT 'in_progress',    -- in_progress, completed, approved
    completed_by UUID REFERENCES users(id),
    completed_at TIMESTAMPTZ,
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for matching queries
CREATE INDEX idx_bank_tx_unmatched ON bank_transactions(bank_account_id, status, transaction_date)
    WHERE status = 'unmatched';
CREATE INDEX idx_bank_tx_amount ON bank_transactions(amount, transaction_date)
    WHERE status = 'unmatched' AND amount > 0;
```

### Auto-Matching Algorithm

```sql
-- Attempt to match unmatched bank transactions to payments
CREATE OR REPLACE FUNCTION auto_match_bank_transactions(p_bank_account_id UUID)
RETURNS INTEGER AS $$
DECLARE
    matched_count INTEGER := 0;
    bt RECORD;
BEGIN
    FOR bt IN
        SELECT * FROM bank_transactions
        WHERE bank_account_id = p_bank_account_id
          AND status = 'unmatched'
          AND amount > 0  -- Credits only (incoming payments)
        ORDER BY transaction_date
    LOOP
        -- Strategy 1: Exact amount + reference match
        UPDATE bank_transactions SET
            matched_payment_id = p.id,
            match_confidence = 'auto_high',
            matched_at = now(),
            status = 'matched'
        FROM payments p
        WHERE bank_transactions.id = bt.id
          AND p.amount = bt.amount
          AND p.status IN ('received', 'deposited', 'cleared')
          AND p.reconciled = false
          AND (
              p.reference_number = bt.reference
              OR bt.description ILIKE '%' || p.reference_number || '%'
          )
          AND ABS(p.received_date - bt.transaction_date) <= 3;

        IF FOUND THEN
            matched_count := matched_count + 1;
            -- Update payment as reconciled
            UPDATE payments SET
                reconciled = true,
                reconciled_at = now(),
                bank_transaction_id = bt.transaction_id
            WHERE id = (SELECT matched_payment_id FROM bank_transactions WHERE id = bt.id);
            CONTINUE;
        END IF;

        -- Strategy 2: Exact amount match within date range (single match only)
        WITH candidates AS (
            SELECT p.id, COUNT(*) OVER() AS total_matches
            FROM payments p
            WHERE p.amount = bt.amount
              AND p.status IN ('received', 'deposited', 'cleared')
              AND p.reconciled = false
              AND ABS(p.received_date - bt.transaction_date) <= 5
        )
        UPDATE bank_transactions SET
            matched_payment_id = c.id,
            match_confidence = 'auto_medium',
            matched_at = now(),
            status = 'matched'
        FROM candidates c
        WHERE bank_transactions.id = bt.id
          AND c.total_matches = 1;  -- Only if exactly one candidate

        IF FOUND THEN
            matched_count := matched_count + 1;
            UPDATE payments SET
                reconciled = true,
                reconciled_at = now(),
                bank_transaction_id = bt.transaction_id
            WHERE id = (SELECT matched_payment_id FROM bank_transactions WHERE id = bt.id);
        END IF;
    END LOOP;

    RETURN matched_count;
END;
$$ LANGUAGE plpgsql;
```

---

## 6. Letters of Credit and Bank Guarantees

### How Letters of Credit Work in Building Materials

A Letter of Credit (LC) is a bank-issued guarantee that the buyer's bank will pay the seller when specific documentary conditions are met. For building materials orders of $10M+, LCs are common, especially for:
- International purchases from overseas suppliers
- Large domestic orders where the buyer's credit is insufficient
- First-time relationships with large order values

### LC Workflow

```
1. NEGOTIATION
   Buyer and seller agree on LC terms in the purchase agreement:
   - LC amount and currency
   - Issuing bank (buyer's bank)
   - Advising/confirming bank (seller's bank)
   - Required documents for payment
   - Expiry date
   - Partial shipments allowed?
   - Transhipment allowed?

2. ISSUANCE
   Buyer applies to their bank to issue LC
   Bank evaluates buyer's creditworthiness
   Bank issues LC (charges 0.5-3% of LC value as fee)
   LC sent to seller's bank (advising bank)
   Advising bank notifies seller

3. SHIPMENT & DOCUMENT PREPARATION
   Seller ships materials
   Seller prepares required documents:
   - Commercial invoice
   - Bill of lading / delivery receipt
   - Packing list
   - Certificate of origin
   - Inspection certificate
   - Insurance certificate
   - Weight/measurement certificate

4. DOCUMENT PRESENTATION
   Seller presents documents to advising bank
   Bank checks documents against LC terms (strict compliance)
   If compliant: bank pays seller
   If discrepancies: seller notified, must correct or get buyer waiver

5. REIMBURSEMENT
   Advising bank seeks reimbursement from issuing bank
   Issuing bank debits buyer's account
   Buyer receives documents, can claim goods

6. AMENDMENTS (if needed)
   LC can be amended (e.g., extend expiry, change amount)
   Requires agreement of all parties
   Amendment fee applies
```

### Types of LCs Used in Construction/Materials

| Type | Use Case |
|---|---|
| **Irrevocable LC** | Standard -- cannot be cancelled without all parties' consent |
| **Confirmed LC** | Seller's bank also guarantees payment (extra security) |
| **Standby LC** | Backup guarantee -- only drawn if buyer defaults on terms |
| **Revolving LC** | For ongoing supply -- reinstates after each draw |
| **Transferable LC** | Seller can transfer to their supplier (back-to-back) |
| **Red Clause LC** | Allows advance payment before shipment |

### Bank Guarantees

Bank guarantees in construction:
- **Bid Bond/Guarantee**: Guarantees bidder will enter contract if awarded (typically 5-10% of bid)
- **Performance Guarantee**: Guarantees contractor will complete work (typically 10% of contract)
- **Advance Payment Guarantee**: Protects buyer if seller doesn't deliver after receiving advance
- **Retention Money Guarantee**: Replaces cash retainage with bank guarantee

### System Schema for LC/Guarantee Tracking

```sql
CREATE TABLE letters_of_credit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lc_number VARCHAR(50) NOT NULL UNIQUE,
    lc_type VARCHAR(30) NOT NULL,
    -- 'irrevocable', 'confirmed', 'standby', 'revolving', 'transferable'

    -- Parties
    applicant_id UUID REFERENCES customers(id),     -- Buyer
    beneficiary_type VARCHAR(20),                    -- 'us' (we're seller) or 'supplier'
    supplier_id UUID REFERENCES suppliers(id),       -- If we're the buyer
    issuing_bank VARCHAR(200) NOT NULL,
    issuing_bank_swift VARCHAR(11),
    advising_bank VARCHAR(200),
    advising_bank_swift VARCHAR(11),
    confirming_bank VARCHAR(200),

    -- Financial
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    tolerance_percent DECIMAL(5,2) DEFAULT 0,        -- +/- % allowed
    amount_drawn DECIMAL(15,2) DEFAULT 0,
    amount_available DECIMAL(15,2),

    -- Dates
    issue_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    latest_shipment_date DATE,
    latest_presentation_date DATE,                    -- Usually 21 days after shipment

    -- Terms
    partial_shipments_allowed BOOLEAN DEFAULT true,
    transhipment_allowed BOOLEAN DEFAULT true,
    documents_required JSONB,
    -- Example: ["commercial_invoice", "bill_of_lading", "packing_list",
    --           "certificate_of_origin", "inspection_certificate"]
    special_conditions TEXT,
    incoterms VARCHAR(10),                            -- 'FOB', 'CIF', 'DAP', etc.

    -- Related records
    order_id UUID REFERENCES orders(id),
    project_id UUID REFERENCES projects(id),

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    -- draft, issued, advised, confirmed, partially_drawn, fully_drawn,
    -- expired, cancelled, amended

    -- Fees
    issuance_fee DECIMAL(12,2),
    confirmation_fee DECIMAL(12,2),
    amendment_fees DECIMAL(12,2) DEFAULT 0,

    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- LC Amendments
CREATE TABLE lc_amendments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lc_id UUID NOT NULL REFERENCES letters_of_credit(id),
    amendment_number INTEGER NOT NULL,
    amendment_date DATE NOT NULL,
    description TEXT NOT NULL,
    -- What changed: amount, expiry, documents, etc.
    old_value TEXT,
    new_value TEXT,
    fee DECIMAL(12,2),
    status VARCHAR(20) DEFAULT 'pending',            -- pending, accepted, rejected
    document_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- LC Draws (presentations)
CREATE TABLE lc_draws (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lc_id UUID NOT NULL REFERENCES letters_of_credit(id),
    draw_number INTEGER NOT NULL,
    draw_date DATE NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',

    -- Documents presented
    documents_presented JSONB,
    -- [{"type": "commercial_invoice", "doc_url": "...", "status": "compliant"},
    --  {"type": "bill_of_lading", "doc_url": "...", "status": "compliant"}]

    -- Status
    status VARCHAR(20) DEFAULT 'presented',
    -- presented, under_examination, compliant, discrepant, paid, refused
    discrepancies TEXT,                               -- If documents have issues
    buyer_waiver BOOLEAN DEFAULT false,               -- Buyer waived discrepancies

    -- Payment
    payment_date DATE,
    payment_amount DECIMAL(15,2),
    payment_id UUID REFERENCES payments(id),          -- Link to our payment record

    -- Related
    invoice_id UUID REFERENCES invoices(id),
    shipment_id UUID REFERENCES shipments(id),

    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- LC Documents (stored in R2 or similar)
CREATE TABLE lc_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lc_id UUID NOT NULL REFERENCES letters_of_credit(id),
    draw_id UUID REFERENCES lc_draws(id),
    document_type VARCHAR(50) NOT NULL,
    -- 'lc_original', 'amendment', 'commercial_invoice', 'bill_of_lading',
    -- 'packing_list', 'certificate_of_origin', 'inspection_cert',
    -- 'insurance_cert', 'weight_cert', 'presentation_cover'
    file_name VARCHAR(200),
    file_url TEXT NOT NULL,                            -- R2 URL
    file_size INTEGER,
    uploaded_by UUID REFERENCES users(id),
    uploaded_at TIMESTAMPTZ DEFAULT now()
);

-- Bank Guarantees
CREATE TABLE bank_guarantees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guarantee_number VARCHAR(50) NOT NULL UNIQUE,
    guarantee_type VARCHAR(30) NOT NULL,
    -- 'bid_bond', 'performance', 'advance_payment', 'retention_money', 'warranty'

    -- Parties
    guarantor_bank VARCHAR(200) NOT NULL,
    guarantor_bank_swift VARCHAR(11),
    applicant_id UUID,                                -- Who requested it
    beneficiary_type VARCHAR(20),                     -- 'us' or 'customer'
    customer_id UUID REFERENCES customers(id),
    supplier_id UUID REFERENCES suppliers(id),

    -- Financial
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    amount_claimed DECIMAL(15,2) DEFAULT 0,

    -- Dates
    issue_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    claim_deadline DATE,

    -- Related
    project_id UUID REFERENCES projects(id),
    order_id UUID REFERENCES orders(id),
    contract_reference VARCHAR(100),

    -- Status
    status VARCHAR(20) DEFAULT 'active',
    -- active, expired, claimed, partially_claimed, released, cancelled

    -- Documents
    document_url TEXT,

    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 7. Retention/Retainage in Construction

### How Retainage Works

Retainage is a portion (typically 5-10%) of each progress payment withheld by the project owner until the work is substantially complete. This flows down the chain:

```
Owner withholds 10% from GC
  -> GC withholds 10% from subcontractors
    -> Subcontractors withhold 10% from material suppliers
      -> YOUR COMPANY may have retainage withheld

Total retained on a $50M project at 10% = $5M held back
```

### Retainage Process Flow

```
1. CONTRACT NEGOTIATION
   - Retainage percentage agreed (5% or 10% typical)
   - Release conditions defined:
     a. Substantial completion (most common)
     b. Final completion
     c. Milestone-based partial release
   - Some contracts reduce retainage at 50% completion
     (e.g., 10% retained until 50% complete, then 5% thereafter)

2. PROGRESS BILLING
   - Invoice for $500,000 of materials delivered
   - Retainage at 10% = $50,000 withheld
   - Amount due now: $450,000
   - $50,000 goes to retainage receivable

3. ACCUMULATION
   - Over 6 months of a $5M order:
   - Total invoiced: $5,000,000
   - Total retainage: $500,000
   - Total received: $4,500,000

4. SUBSTANTIAL COMPLETION
   - Project reaches substantial completion milestone
   - Punch list created
   - Some contracts release 50% of retainage here

5. FINAL COMPLETION
   - Punch list resolved
   - Final inspection passed
   - All closeout documents submitted
   - Remaining retainage released

6. RETAINAGE INVOICE
   - Separate invoice generated for retainage release
   - Payment due per contract terms (often Net 30 from release)
   - Track as separate receivable
```

### State Retainage Laws (Key Examples)

| State | Max Retainage | Release Rules |
|---|---|---|
| **Federal (Miller Act)** | 10% | Released at substantial completion |
| **California** | 5% (public), varies private | Must pay within 60 days of completion; retainage to subs within 10 days of receipt |
| **Texas** | 10% (public) | Released within 30 days of completion |
| **Florida** | 10% (reduced to 5% at 50%) | Released per contract, but prompt payment act applies |
| **New York** | 5% (public) | Released within 30 days of final acceptance |
| **Illinois** | 10% | Released within 60 days of completion |

### Retainage Database Schema

```sql
-- Retainage tracking per invoice
CREATE TABLE retainage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id),
    order_id UUID NOT NULL REFERENCES orders(id),
    customer_id UUID NOT NULL REFERENCES customers(id),
    project_id UUID REFERENCES projects(id),

    -- Amounts
    retainage_percent DECIMAL(5,2) NOT NULL,         -- 5.00, 10.00
    retainage_amount DECIMAL(15,2) NOT NULL,          -- Amount withheld
    released_amount DECIMAL(15,2) DEFAULT 0,
    outstanding_amount DECIMAL(15,2) NOT NULL,        -- retainage_amount - released_amount

    -- Status
    status VARCHAR(20) DEFAULT 'held',
    -- held, partially_released, released, invoiced, paid, disputed, written_off

    -- Release tracking
    release_eligible_date DATE,                       -- When eligible for release
    release_requested_date DATE,
    release_approved_date DATE,
    release_invoice_id UUID REFERENCES invoices(id),  -- Invoice for retainage release
    release_payment_id UUID REFERENCES payments(id),  -- Payment received for retainage

    -- Contract terms
    release_condition VARCHAR(50),
    -- 'substantial_completion', 'final_completion', 'milestone', 'time_based'
    release_milestone TEXT,                            -- Description of release trigger

    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Retainage release events
CREATE TABLE retainage_releases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    retainage_id UUID NOT NULL REFERENCES retainage(id),
    release_date DATE NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    release_type VARCHAR(30),                          -- 'partial', 'final'
    trigger_event TEXT,                                -- What triggered the release
    invoice_id UUID REFERENCES invoices(id),           -- Release invoice
    approved_by UUID REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Summary view
CREATE OR REPLACE VIEW retainage_summary AS
SELECT
    r.customer_id,
    c.company_name,
    r.project_id,
    p.project_name,
    SUM(r.retainage_amount) AS total_retainage,
    SUM(r.released_amount) AS total_released,
    SUM(r.outstanding_amount) AS total_outstanding,
    COUNT(*) AS invoice_count,
    MIN(r.release_eligible_date) AS earliest_release_date
FROM retainage r
JOIN customers c ON r.customer_id = c.id
LEFT JOIN projects p ON r.project_id = p.id
WHERE r.status NOT IN ('paid', 'written_off')
GROUP BY r.customer_id, c.company_name, r.project_id, p.project_name;
```

---

## 8. Progress Billing / Milestone Payments

### AIA G702/G703 Payment Applications

The AIA G702 (Application and Certificate for Payment) and G703 (Continuation Sheet) are the construction industry standard for progress billing. Even material suppliers often need to use this format when billing to GCs.

### G702 (Cover Sheet) Key Fields

```
- Project Name
- Project Number
- Application Number (sequential: 1, 2, 3...)
- Application Date
- Period From / To
- Contractor (your company)
- Contract For (materials supply)

Financial Summary:
1. Original Contract Sum
2. Net Change by Change Orders
3. Contract Sum to Date (1 + 2)
4. Total Completed & Stored to Date (from G703)
5. Retainage:
   a. __% of completed work
   b. __% of stored materials
   Total Retainage
6. Total Earned Less Retainage (4 - 5)
7. Less Previous Certificates for Payment
8. Current Payment Due (6 - 7)
9. Balance to Finish (3 - 4)

Signatures: Contractor + Architect/Engineer certification
```

### G703 (Continuation Sheet) Line Items

```
For each schedule of values line item:
A. Item Number
B. Description of Work
C. Scheduled Value (original budget for this item)
D. Work Completed - From Previous Application
E. Work Completed - This Period
F. Materials Presently Stored (not yet installed)
G. Total Completed and Stored to Date (D + E + F)
H. % Complete (G / C)
I. Balance to Finish (C - G)
J. Retainage (if tracked per line)
```

### System Schema for Progress Billing

```sql
-- Progress billing applications (AIA G702 equivalent)
CREATE TABLE payment_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_number INTEGER NOT NULL,
    order_id UUID NOT NULL REFERENCES orders(id),
    customer_id UUID NOT NULL REFERENCES customers(id),
    project_id UUID REFERENCES projects(id),

    -- Period
    period_from DATE NOT NULL,
    period_to DATE NOT NULL,

    -- Contract values
    original_contract_sum DECIMAL(15,2) NOT NULL,
    change_orders_total DECIMAL(15,2) DEFAULT 0,
    contract_sum_to_date DECIMAL(15,2) NOT NULL,

    -- This application totals (computed from line items)
    total_completed_stored DECIMAL(15,2) NOT NULL,
    retainage_on_completed DECIMAL(15,2) DEFAULT 0,
    retainage_on_stored DECIMAL(15,2) DEFAULT 0,
    total_retainage DECIMAL(15,2) DEFAULT 0,
    total_earned_less_retainage DECIMAL(15,2) NOT NULL,
    less_previous_payments DECIMAL(15,2) DEFAULT 0,
    current_payment_due DECIMAL(15,2) NOT NULL,
    balance_to_finish DECIMAL(15,2) NOT NULL,

    -- Status
    status VARCHAR(20) DEFAULT 'draft',
    -- draft, submitted, under_review, approved, rejected, paid, partially_paid
    submitted_date DATE,
    approved_date DATE,
    approved_by VARCHAR(200),                   -- Architect/engineer name

    -- Generated invoice
    invoice_id UUID REFERENCES invoices(id),

    -- Document
    document_url TEXT,                           -- PDF of signed G702

    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    UNIQUE(order_id, application_number)
);

-- Progress billing line items (AIA G703 equivalent)
CREATE TABLE payment_application_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES payment_applications(id) ON DELETE CASCADE,
    item_number VARCHAR(20) NOT NULL,
    description TEXT NOT NULL,

    -- Schedule of values
    scheduled_value DECIMAL(15,2) NOT NULL,

    -- Work completed
    from_previous DECIMAL(15,2) DEFAULT 0,     -- Previously billed
    this_period DECIMAL(15,2) DEFAULT 0,        -- This billing period
    materials_stored DECIMAL(15,2) DEFAULT 0,   -- Stored but not installed/delivered

    -- Calculated
    total_completed_stored DECIMAL(15,2) NOT NULL,  -- from_previous + this_period + materials_stored
    percent_complete DECIMAL(5,2) NOT NULL,          -- total / scheduled_value * 100
    balance_to_finish DECIMAL(15,2) NOT NULL,        -- scheduled_value - total_completed_stored
    retainage DECIMAL(15,2) DEFAULT 0,

    -- Link to actual deliveries
    delivery_ids UUID[],                              -- Array of delivery IDs for this period

    created_at TIMESTAMPTZ DEFAULT now()
);

-- Change orders (affect contract sum)
CREATE TABLE change_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    change_order_number INTEGER NOT NULL,
    order_id UUID NOT NULL REFERENCES orders(id),
    description TEXT NOT NULL,
    amount DECIMAL(15,2) NOT NULL,                    -- Positive = addition, negative = deduction
    status VARCHAR(20) DEFAULT 'pending',
    -- pending, approved, rejected, incorporated
    approved_date DATE,
    approved_by VARCHAR(200),
    document_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(order_id, change_order_number)
);
```

---

## 9. Multi-Currency for International Suppliers

### Common Scenarios for Building Materials

```
Scenario 1: Buying steel from Turkish supplier
- PO in USD, supplier invoices in TRY (Turkish Lira)
- Exchange rate locked at PO time or floating until invoice

Scenario 2: Buying marble from Italian supplier
- PO in EUR
- Payment via international wire in EUR
- Book in USD at exchange rate on payment date

Scenario 3: Buying lumber from Canadian supplier
- PO in CAD
- Regular purchases, exchange rate fluctuates
- Monthly reconciliation of FX gains/losses
```

### Multi-Currency System Requirements

```
1. PURCHASE ORDER
   - Store PO in supplier's currency AND home currency
   - Lock exchange rate at PO creation (optional)
   - If not locked, use rate at invoice receipt

2. INVOICE RECEIPT
   - Record supplier invoice in their currency
   - Convert to home currency at:
     a. Spot rate on invoice date, or
     b. Locked PO rate, or
     c. Average monthly rate (accounting policy choice)
   - Track exchange rate used

3. PAYMENT
   - Pay in supplier's currency
   - Record actual exchange rate achieved
   - Calculate FX gain/loss:
     FX Gain/Loss = Payment in home currency - Invoice amount in home currency
   - Post to FX gain/loss account

4. PERIOD-END
   - Revalue open AP balances at period-end rate
   - Unrealized FX gains/losses
```

### Database Schema for Multi-Currency

```sql
CREATE TABLE currencies (
    code VARCHAR(3) PRIMARY KEY,                -- 'USD', 'EUR', 'GBP', 'CAD'
    name VARCHAR(50) NOT NULL,
    symbol VARCHAR(5),
    decimal_places INTEGER DEFAULT 2,
    is_active BOOLEAN DEFAULT true
);

CREATE TABLE exchange_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_currency VARCHAR(3) NOT NULL REFERENCES currencies(code),
    to_currency VARCHAR(3) NOT NULL REFERENCES currencies(code),
    rate DECIMAL(18,8) NOT NULL,
    rate_date DATE NOT NULL,
    source VARCHAR(30),                          -- 'openexchangerates', 'manual', 'bank'
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(from_currency, to_currency, rate_date)
);

-- On purchase orders
-- Add to orders table:
--   currency VARCHAR(3) DEFAULT 'USD',
--   exchange_rate DECIMAL(12,6),
--   exchange_rate_locked BOOLEAN DEFAULT false,
--   home_currency_amount DECIMAL(15,2),

-- On supplier invoices (AP side)
CREATE TABLE supplier_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID NOT NULL REFERENCES suppliers(id),
    invoice_number VARCHAR(50) NOT NULL,
    purchase_order_id UUID REFERENCES orders(id),

    -- Original currency
    currency VARCHAR(3) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) NOT NULL,

    -- Home currency conversion
    home_currency VARCHAR(3) DEFAULT 'USD',
    exchange_rate DECIMAL(12,6) NOT NULL,
    home_currency_amount DECIMAL(15,2) NOT NULL,

    -- FX tracking
    fx_gain_loss DECIMAL(12,2) DEFAULT 0,            -- Realized on payment
    unrealized_fx_gain_loss DECIMAL(12,2) DEFAULT 0,  -- Period-end revaluation

    -- Payment
    amount_paid DECIMAL(15,2) DEFAULT 0,
    balance_due DECIMAL(15,2) NOT NULL,
    payment_currency VARCHAR(3),
    payment_exchange_rate DECIMAL(12,6),

    -- Status and dates
    invoice_date DATE NOT NULL,
    due_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    -- pending, approved, partially_paid, paid, disputed, cancelled

    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Exchange rate API integration (via Cloudflare Worker)
-- Use openexchangerates.org or exchangeratesapi.io
-- Cron trigger to fetch daily rates
-- Store in exchange_rates table
-- Pricing: openexchangerates.org ~$12/month for hourly updates
```

---

## 10. Construction Lien Rights and Preliminary Notices

### Why This Matters for Building Materials Suppliers

Mechanics lien rights are a building materials supplier's most powerful collection tool. If a customer doesn't pay, you can place a lien on the property where your materials were used. This effectively makes the property owner responsible for ensuring you get paid, even if your direct customer (the GC or sub) doesn't pay you.

**BUT: You MUST follow strict procedural requirements or you lose this right.**

### Preliminary Notice Requirements

**38 states require preliminary notice** for private projects. Key requirements:

| State | Deadline | Who Must Send | To Whom |
|---|---|---|---|
| **California** | 20 days from first furnishing | All claimants except direct GC | Owner, GC, construction lender |
| **Arizona** | 20 days from first furnishing | All claimants | Owner, GC, construction lender |
| **Texas** | 15th of 2nd month after first furnishing | All except those with direct contract with GC/owner | Owner, GC |
| **Florida** | 45 days from first furnishing (Notice to Owner) | All except those with direct contract with owner | Owner |
| **Oregon** | 8 days from first furnishing | All claimants | Owner, GC, mortgage lender |
| **Nevada** | 31 days from first furnishing | All except those with direct contract with owner | Owner, GC |
| **Washington** | 60 days from first furnishing | All except those with direct contract with owner | Owner |

**States NOT requiring preliminary notice:** Colorado, Connecticut, Delaware, Kansas, Maine, Nebraska, New Hampshire, New Jersey, New York, North Dakota, Pennsylvania, Rhode Island, Vermont.

### Best Practice: Send Preliminary Notice on EVERY Job

Even in states where it's not required, sending notice:
- Alerts the owner that you're supplying materials
- Creates documentation trail
- Improves payment likelihood (owners pressure GCs to pay)
- Preserves lien rights if laws change or you misidentify the project type

### System Schema for Lien Tracking

```sql
CREATE TABLE preliminary_notices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id),
    customer_id UUID NOT NULL REFERENCES customers(id),
    project_id UUID REFERENCES projects(id),

    -- Project info
    project_name VARCHAR(200),
    project_address TEXT NOT NULL,
    project_state VARCHAR(2) NOT NULL,
    project_type VARCHAR(20),                    -- 'private', 'public', 'federal'

    -- Parties
    property_owner_name VARCHAR(200),
    property_owner_address TEXT,
    general_contractor_name VARCHAR(200),
    general_contractor_address TEXT,
    construction_lender_name VARCHAR(200),
    construction_lender_address TEXT,

    -- Dates
    first_furnishing_date DATE NOT NULL,         -- When we first supplied materials
    notice_deadline DATE NOT NULL,               -- Calculated from state law
    notice_sent_date DATE,
    notice_delivery_date DATE,

    -- Delivery tracking
    sent_method VARCHAR(20),                     -- 'certified_mail', 'registered_mail', 'personal'
    tracking_number VARCHAR(100),
    return_receipt_received BOOLEAN DEFAULT false,
    return_receipt_date DATE,

    -- Financial
    estimated_materials_value DECIMAL(15,2),
    actual_materials_furnished DECIMAL(15,2),

    -- Status
    status VARCHAR(20) DEFAULT 'pending',
    -- pending, sent, delivered, confirmed, expired, not_required

    -- Document
    notice_document_url TEXT,                    -- R2 URL for the notice PDF
    proof_of_delivery_url TEXT,

    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Mechanics liens (if payment not received)
CREATE TABLE mechanics_liens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    preliminary_notice_id UUID REFERENCES preliminary_notices(id),
    order_id UUID NOT NULL REFERENCES orders(id),
    customer_id UUID NOT NULL REFERENCES customers(id),

    -- Property
    property_address TEXT NOT NULL,
    property_legal_description TEXT,
    county VARCHAR(100) NOT NULL,
    state VARCHAR(2) NOT NULL,

    -- Lien details
    lien_amount DECIMAL(15,2) NOT NULL,
    last_furnishing_date DATE NOT NULL,
    lien_deadline DATE NOT NULL,                  -- Calculated from state law
    lien_filed_date DATE,
    recording_number VARCHAR(50),
    recording_fee DECIMAL(10,2),

    -- Enforcement
    lawsuit_deadline DATE,                        -- Must sue to enforce within this date
    lawsuit_filed BOOLEAN DEFAULT false,
    lawsuit_date DATE,
    case_number VARCHAR(50),

    -- Resolution
    status VARCHAR(20) DEFAULT 'pending',
    -- pending, filed, enforcing, settled, released, expired
    resolution_amount DECIMAL(15,2),
    resolution_date DATE,
    release_recorded BOOLEAN DEFAULT false,
    release_date DATE,

    -- Legal
    attorney_name VARCHAR(200),
    attorney_firm VARCHAR(200),

    -- Documents
    lien_document_url TEXT,
    release_document_url TEXT,

    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Automated deadline alerts
-- (Implement as Cloudflare Worker cron job)
-- Daily check: preliminary_notices WHERE notice_deadline <= NOW() + INTERVAL '7 days' AND status = 'pending'
-- Daily check: mechanics_liens WHERE lien_deadline <= NOW() + INTERVAL '14 days' AND status = 'pending'
-- Alert via: email, SMS, in-app notification
```

### Deadline Calculation Logic

```sql
-- Function to calculate preliminary notice deadline
CREATE OR REPLACE FUNCTION calc_prelim_notice_deadline(
    p_state VARCHAR(2),
    p_first_furnishing_date DATE,
    p_project_type VARCHAR(20)
) RETURNS DATE AS $$
BEGIN
    RETURN CASE p_state
        WHEN 'CA' THEN p_first_furnishing_date + INTERVAL '20 days'
        WHEN 'AZ' THEN p_first_furnishing_date + INTERVAL '20 days'
        WHEN 'FL' THEN p_first_furnishing_date + INTERVAL '45 days'
        WHEN 'TX' THEN (DATE_TRUNC('month', p_first_furnishing_date) + INTERVAL '2 months' + INTERVAL '14 days')::DATE
        WHEN 'OR' THEN p_first_furnishing_date + INTERVAL '8 days'
        WHEN 'NV' THEN p_first_furnishing_date + INTERVAL '31 days'
        WHEN 'WA' THEN p_first_furnishing_date + INTERVAL '60 days'
        WHEN 'OH' THEN p_first_furnishing_date + INTERVAL '21 days'
        WHEN 'GA' THEN p_first_furnishing_date + INTERVAL '30 days'
        -- States that don't require notice
        WHEN 'CO' THEN NULL
        WHEN 'NY' THEN NULL
        WHEN 'PA' THEN NULL
        WHEN 'NJ' THEN NULL
        -- Default: conservative 15-day deadline
        ELSE p_first_furnishing_date + INTERVAL '15 days'
    END;
END;
$$ LANGUAGE plpgsql;
```

---

## 11. Accounts Receivable at Scale

### AR Aging Report Structure

```
Standard Aging Buckets:
- Current (not yet due)
- 1-30 days past due
- 31-60 days past due
- 61-90 days past due
- 91-120 days past due
- 120+ days past due

For construction/building materials, also track:
- Retainage receivable (separate bucket)
- Disputed amounts
- Amounts with active lien rights
```

### DSO (Days Sales Outstanding) Calculation

```
Basic DSO = (Accounts Receivable / Total Credit Sales) x Number of Days

Example for Building Materials Distributor:
- AR Balance: $45,000,000
- Annual Credit Sales: $200,000,000
- DSO = ($45M / $200M) x 365 = 82 days

Industry Benchmarks (Building Materials Distribution):
- Excellent: < 45 days
- Good: 45-60 days
- Average: 60-75 days
- Concerning: 75-90 days
- Poor: 90+ days

Note: Construction industry DSO tends to be higher than other
industries due to retainage and progress billing structures.
Best-in-class distributors target 50-65 days.
```

### Collection Workflow for Large Invoices

```
DAY 0: Invoice sent
DAY 7: Automated reminder email ("Invoice attached, due in X days")
DAY -3 (3 days before due): Courtesy reminder
DAY 0 (due date): Payment due notification
DAY 1 (1 day past due): Past due notice - friendly
DAY 7 past due: Phone call from AR team
DAY 14 past due: Second notice - firmer tone
DAY 21 past due: AR manager call, discuss payment plan
DAY 30 past due: Credit hold warning letter
DAY 31 past due: CREDIT HOLD - no new orders ship
DAY 45 past due: Demand letter from credit manager
DAY 60 past due: Attorney demand letter / lien notice
DAY 75 past due: File mechanics lien (if applicable)
DAY 90 past due: Escalate to VP, consider collection agency or lawsuit
DAY 120 past due: Write-off evaluation, reserve for bad debt
DAY 180+ past due: Potential write-off or settlement negotiation

For invoices over $1M:
- Personal VP/Director involvement from Day 1 past due
- Shorter escalation timeline
- Legal counsel engaged at Day 30
- Lien rights exercised immediately when eligible
```

### Bad Debt Reserves by Aging Bucket

```
Typical Reserve Percentages (Building Materials):
- Current: 0.5%
- 1-30 days: 2%
- 31-60 days: 5%
- 61-90 days: 15%
- 91-120 days: 30%
- 120-180 days: 50%
- 180+ days: 75-100%

Adjustments for:
- Accounts with payment bonds: reduce reserve by 80%
- Accounts with credit insurance: reduce by coverage %
- Accounts with active lien rights: reduce by 50%
- Government accounts: reduce by 90% (sovereign credit)
- Disputed amounts: individual assessment
```

### AR System Schema

```sql
-- Collection activities log
CREATE TABLE collection_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id),
    invoice_id UUID REFERENCES invoices(id),            -- Specific invoice, or NULL for account-level

    activity_type VARCHAR(30) NOT NULL,
    -- 'reminder_email', 'phone_call', 'past_due_notice', 'credit_hold_warning',
    -- 'demand_letter', 'attorney_letter', 'lien_filed', 'collection_agency',
    -- 'payment_plan', 'dispute_opened', 'dispute_resolved', 'promise_to_pay',
    -- 'escalation', 'write_off'

    activity_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    performed_by UUID NOT NULL REFERENCES users(id),
    contact_name VARCHAR(200),
    contact_method VARCHAR(20),                          -- 'email', 'phone', 'mail', 'in_person'

    -- Promise to pay
    promise_amount DECIMAL(15,2),
    promise_date DATE,
    promise_kept BOOLEAN,

    -- Notes
    notes TEXT NOT NULL,
    follow_up_date DATE,
    follow_up_assigned_to UUID REFERENCES users(id),

    -- Documents
    document_url TEXT,                                    -- Letter sent, etc.

    created_at TIMESTAMPTZ DEFAULT now()
);

-- Credit holds
CREATE TABLE credit_holds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id),
    hold_type VARCHAR(20) NOT NULL,                      -- 'soft' (warning), 'hard' (blocks orders)
    reason TEXT NOT NULL,
    placed_by UUID NOT NULL REFERENCES users(id),
    placed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    released_by UUID REFERENCES users(id),
    released_at TIMESTAMPTZ,
    release_reason TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Payment plans
CREATE TABLE payment_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id),
    total_amount DECIMAL(15,2) NOT NULL,
    number_of_installments INTEGER NOT NULL,
    installment_amount DECIMAL(15,2) NOT NULL,
    first_payment_date DATE NOT NULL,
    frequency VARCHAR(20) NOT NULL,                      -- 'weekly', 'biweekly', 'monthly'
    status VARCHAR(20) DEFAULT 'active',                 -- active, completed, defaulted, cancelled
    approved_by UUID REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE payment_plan_installments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES payment_plans(id),
    installment_number INTEGER NOT NULL,
    due_date DATE NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    paid_amount DECIMAL(15,2) DEFAULT 0,
    payment_id UUID REFERENCES payments(id),
    status VARCHAR(20) DEFAULT 'pending',                -- pending, paid, partial, missed
    created_at TIMESTAMPTZ DEFAULT now()
);

-- AR Aging materialized view (refresh daily or on-demand)
CREATE MATERIALIZED VIEW ar_aging_report AS
SELECT
    i.customer_id,
    c.company_name,
    cc.risk_rating,
    cc.credit_limit,
    COUNT(i.id) AS invoice_count,
    SUM(i.balance_due) AS total_outstanding,
    SUM(CASE WHEN i.due_date >= CURRENT_DATE THEN i.balance_due ELSE 0 END) AS current_amount,
    SUM(CASE WHEN i.due_date < CURRENT_DATE
             AND i.due_date >= CURRENT_DATE - 30 THEN i.balance_due ELSE 0 END) AS past_due_1_30,
    SUM(CASE WHEN i.due_date < CURRENT_DATE - 30
             AND i.due_date >= CURRENT_DATE - 60 THEN i.balance_due ELSE 0 END) AS past_due_31_60,
    SUM(CASE WHEN i.due_date < CURRENT_DATE - 60
             AND i.due_date >= CURRENT_DATE - 90 THEN i.balance_due ELSE 0 END) AS past_due_61_90,
    SUM(CASE WHEN i.due_date < CURRENT_DATE - 90
             AND i.due_date >= CURRENT_DATE - 120 THEN i.balance_due ELSE 0 END) AS past_due_91_120,
    SUM(CASE WHEN i.due_date < CURRENT_DATE - 120 THEN i.balance_due ELSE 0 END) AS past_due_120_plus,
    -- Retainage (separate)
    COALESCE(ret.total_retainage_outstanding, 0) AS retainage_outstanding,
    -- Weighted average days past due
    CASE WHEN SUM(i.balance_due) > 0 THEN
        SUM(GREATEST(CURRENT_DATE - i.due_date, 0) * i.balance_due) / SUM(i.balance_due)
    ELSE 0 END AS weighted_avg_days_past_due,
    -- Bad debt reserve
    SUM(CASE WHEN i.due_date >= CURRENT_DATE THEN i.balance_due * 0.005
             WHEN i.due_date >= CURRENT_DATE - 30 THEN i.balance_due * 0.02
             WHEN i.due_date >= CURRENT_DATE - 60 THEN i.balance_due * 0.05
             WHEN i.due_date >= CURRENT_DATE - 90 THEN i.balance_due * 0.15
             WHEN i.due_date >= CURRENT_DATE - 120 THEN i.balance_due * 0.30
             WHEN i.due_date >= CURRENT_DATE - 180 THEN i.balance_due * 0.50
             ELSE i.balance_due * 0.75 END) AS estimated_bad_debt_reserve
FROM invoices i
JOIN customers c ON i.customer_id = c.id
LEFT JOIN customer_credit cc ON i.customer_id = cc.customer_id
LEFT JOIN (
    SELECT customer_id, SUM(outstanding_amount) AS total_retainage_outstanding
    FROM retainage WHERE status IN ('held', 'partially_released')
    GROUP BY customer_id
) ret ON i.customer_id = ret.customer_id
WHERE i.status NOT IN ('paid', 'cancelled', 'written_off', 'draft')
GROUP BY i.customer_id, c.company_name, cc.risk_rating, cc.credit_limit, ret.total_retainage_outstanding;

-- Refresh command (run via cron or on-demand)
-- REFRESH MATERIALIZED VIEW CONCURRENTLY ar_aging_report;

-- DSO tracking over time
CREATE TABLE dso_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    snapshot_date DATE NOT NULL,
    total_ar DECIMAL(15,2) NOT NULL,
    credit_sales_period DECIMAL(15,2) NOT NULL,         -- Sales for the measurement period
    period_days INTEGER NOT NULL,                        -- 30, 60, 90, 365
    dso DECIMAL(8,2) NOT NULL,                           -- Calculated DSO
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(snapshot_date, period_days)
);
```

---

## 12. ERP Payment Module Features to Replicate

### Key Features from SAP, NetSuite, and Epicor

Based on what these enterprise ERPs provide for distribution companies, here are the features a custom system must replicate:

### Must-Have Features

```
1. INVOICE MANAGEMENT
   [x] Invoice creation from orders/deliveries
   [x] Invoice numbering (sequential, configurable format)
   [x] Multi-line invoices with product detail
   [x] Tax calculation (by state/jurisdiction)
   [x] Invoice PDF generation and email
   [x] Invoice status tracking (draft -> sent -> paid)
   [x] Credit memo generation
   [x] Recurring invoices
   [x] Progress billing (AIA format)
   [x] Retainage tracking on invoices
   [x] Invoice dispute management

2. PAYMENT PROCESSING
   [x] Manual payment entry (wire, check, ACH, cash)
   [x] Payment allocation to invoices (many-to-many)
   [x] Partial payment support
   [x] Early payment discount calculation and tracking
   [x] Overpayment handling (credit on account)
   [x] Unidentified payment suspense
   [x] Payment reversal / void
   [x] Batch payment entry
   [x] Payment confirmation/receipt generation

3. CREDIT MANAGEMENT
   [x] Credit application workflow
   [x] Credit limit tracking (with temporary increases)
   [x] Real-time credit utilization (AR + open orders)
   [x] Credit hold management (soft and hard holds)
   [x] Credit review scheduling
   [x] Risk rating system
   [x] Credit insurance tracking
   [x] Bond and LC tracking

4. ACCOUNTS RECEIVABLE
   [x] AR aging report (standard buckets)
   [x] Customer statement generation
   [x] Collection activity tracking
   [x] Dunning letter automation (configurable cadence)
   [x] Promise-to-pay tracking
   [x] Payment plan management
   [x] Bad debt reserve calculation
   [x] Write-off workflow (approval required)
   [x] DSO tracking and reporting

5. BANK RECONCILIATION
   [x] Bank transaction import (file or API)
   [x] Auto-matching engine
   [x] Manual matching interface
   [x] Reconciliation audit trail
   [x] Outstanding items report

6. CONSTRUCTION SPECIFIC
   [x] Retainage tracking and release workflow
   [x] Preliminary notice management and deadline alerts
   [x] Mechanics lien tracking
   [x] AIA G702/G703 payment application support
   [x] Change order tracking
   [x] Pay-when-paid tracking
   [x] Joint check tracking

7. MULTI-CURRENCY
   [x] Multi-currency invoices and payments
   [x] Exchange rate management (auto-fetch + manual)
   [x] FX gain/loss calculation
   [x] Period-end revaluation

8. REPORTING & ANALYTICS
   [x] AR aging (by customer, project, salesperson)
   [x] Cash receipts journal
   [x] DSO trend analysis
   [x] Customer payment history
   [x] Credit utilization report
   [x] Retainage summary
   [x] Collection effectiveness index
   [x] Bad debt aging
   [x] Revenue recognition report
```

### NetSuite-Specific Features Worth Replicating

- **Dunning Letters**: Configurable letter templates with escalation levels
- **Electronic Bank Payments**: Automated payment file generation
- **Revenue Recognition**: ASC 606 compliance for milestone billing
- **SuiteBilling**: Subscription and usage billing (less relevant for materials)
- **Customer Center Portal**: Self-service portal for customers to view invoices and make payments

### Epicor Distribution Features

- **Credit Card Manager**: Process credit card payments for smaller orders
- **Cash Receipts Entry**: Batch entry of multiple payments
- **AR Tracker**: Dashboard for collections team
- **Automated Invoicing**: Invoice generation triggered by shipment confirmation
- **EDI Integration**: EDI 810 (Invoice) and EDI 820 (Payment/Remittance) for large accounts

### SAP S/4HANA Features

- **Credit Management**: Real-time credit exposure across all modules
- **Dispute Management**: Full case management for invoice disputes
- **Collections Management**: Work list-based collections with prioritization
- **Bank Communication Management**: Direct bank integration via SAP Multi-Bank Connectivity
- **Payment Factory**: Centralized payment processing across entities

---

## Implementation Priority for Supabase + Cloudflare

### Phase 1: Core (Weeks 1-4)
1. Invoice generation from orders/deliveries
2. Manual payment recording (wire, check, ACH)
3. Payment allocation to invoices (the many-to-many table)
4. Basic AR aging report
5. Credit limit tracking and hold management

### Phase 2: Construction Specific (Weeks 5-8)
6. Retainage tracking and release workflow
7. Preliminary notice deadline tracking and alerts
8. Progress billing (AIA G702/G703)
9. Change order management

### Phase 3: Automation (Weeks 9-12)
10. Bank feed integration (Plaid or file import)
11. Auto-matching engine for bank reconciliation
12. Dunning letter automation
13. Collection activity tracking

### Phase 4: Advanced (Weeks 13-16)
14. Letter of credit tracking
15. Multi-currency support
16. Credit insurance integration
17. Mechanics lien management
18. Customer self-service portal

### Cloudflare Worker Cron Jobs Needed

```
1. Daily: Check preliminary notice deadlines (alert 7 days before)
2. Daily: Check lien filing deadlines (alert 14 days before)
3. Daily: Update invoice statuses (sent -> overdue when past due date)
4. Daily: Fetch exchange rates (for multi-currency)
5. Daily: Refresh AR aging materialized view
6. Weekly: Generate dunning letters for past-due accounts
7. Weekly: DSO snapshot calculation
8. Monthly: Bad debt reserve recalculation
9. If using Plaid: Every 4-6 hours fetch bank transactions
10. Daily: Credit insurance expiration alerts
11. Daily: LC/guarantee expiration alerts
12. Weekly: Credit review scheduling alerts
```

---

## Sources

- [Builders FirstSource Credit Services](https://www.bldr.com/services/credit)
- [Builders FirstSource Terms & Conditions](https://www.bldr.com/customer-terms-conditions)
- [Ferguson Business Credit](https://www.ferguson.com/content/pro-services/branch-services/business-credit/)
- [Net 30/60/90 Terms Guide for Construction Materials Suppliers](https://resolvepay.com/blog/net-terms-guide-for-construction-materials-parts-suppliers)
- [Construction Payment Terms: Net 30 vs Net 60](https://clearreceivables.com/blog/construction-payment-terms-net-30-vs-net-60)
- [Construction Payment Schedules - NetSuite](https://www.netsuite.com/portal/resource/articles/accounting/construction-payment-schedule.shtml)
- [Retainage in Construction - Construction Coverage](https://constructioncoverage.com/glossary/retainage)
- [Retainage Guide - Siteline](https://www.siteline.com/blog/guide-to-construction-retainage)
- [Retainage Accounting - Levvigo](https://www.levvigo.com/blog/retainage-accounting-in-construction-how-it-works-and-why-it-matters)
- [AIA G702/G703 Forms Guide - Autodesk](https://www.autodesk.com/blogs/construction/g702-g703-forms-aia-billing/)
- [AIA G702 Application for Payment - Procore](https://www.procore.com/library/aia-g702-application-for-payment)
- [G702/G703 AIA Documents - Trimble](https://www.trimble.com/blog/construction/en-US/article/a-quick-guide-to-g702-g703-aia-documents)
- [Preliminary Notice Rules - Levelset](https://www.levelset.com/preliminary-notice/)
- [Mechanics Lien Guide - Levelset](https://www.levelset.com/mechanics-lien/)
- [Materialman's Lien Guide](https://northwestlienservice.com/blog/materialmans-lien-guide-to-materials-supplier-lien-rights/)
- [50 State Summary Mechanics Lien Law](https://fullertonlaw.com/50-state-summary-mechanics-lien-law)
- [B2B Invoicing Guide - Billtrust](https://www.billtrust.com/resources/blog/b2b-invoicing)
- [AR Process Flowchart - Versapay](https://www.versapay.com/resources/the-accounts-receivable-system-flowchart-of-the-future)
- [Invoice Management ERD - Red Gate](https://www.red-gate.com/blog/erd-for-invoice-management/)
- [AR Star Schema Design](https://andrew-borst.com/2021/05/24/accounts-receivable-star-schema/)
- [Bank Feeds API Integration - Apideck](https://www.apideck.com/blog/bank-feeds-api-integration)
- [Bank Feeds - Codat](https://docs.codat.io/bank-feeds/overview)
- [Automated Bank Statement Feeds - AccessPay](https://accesspay.com/solutions/bank-statement-feeds/)
- [Plaid Transactions API](https://plaid.com/docs/api/products/transactions/)
- [Plaid Transfer API](https://plaid.com/docs/transfer/)
- [Letters of Credit Guide - Trade Finance Global](https://www.tradefinanceglobal.com/letters-of-credit/)
- [LC vs Bank Guarantees - Financely Group](https://www.financely-group.com/differences-between-letters-of-credit-and-bank-guarantees)
- [Trade Credit Insurance Market - Allianz Trade](https://www.allianz-trade.com/en_global/news-insights/news/report-finds-a-strong-economic-recovery-relies-on-safe-and-conti.html)
- [Top Trade Credit Insurance Carriers](https://www.accountsreceivableinsurance.net/top-5-trade-credit-insurance-carriers-compared/)
- [Surety Bond Companies - Construction Coverage](https://constructioncoverage.com/surety-bonds)
- [Multi-Currency PO Systems - Stokly](https://www.stok.ly/inventory-management/understanding-multi-currency-purchase-order-systems/)
- [Multi-Currency Payments - Bill.com](https://www.bill.com/learning/multi-currency-payment-processing)
- [DSO Reduction - Intuit](https://www.intuit.com/enterprise/blog/financials/reduce-dso/)
- [AR Aging Reports - HighRadius](https://www.highradius.com/resources/Blog/accounts-receivable-aging-report/)
- [ERP Modules - NetSuite](https://www.netsuite.com/portal/resource/articles/erp/erp-modules.shtml)
- [AR Automation for Plumbing Distributors - Resolve Pay](https://resolvepay.com/blog/ar-automation-software-plumbing-supplies-distributors)
- [ERPNext Open Source Accounting](https://frappe.io/erpnext/open-source-accounting)
- [Progress Payments in Construction - MASTT](https://www.mastt.com/blogs/progress-payments-construction)
- [Federal Acquisition Regulation 32.103](https://www.acquisition.gov/far/32.103)
