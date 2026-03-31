# Phase 29: ETA E-Invoicing

## Goal
Invoices submit to the Egyptian Tax Authority in real-time with valid digital signatures, satisfying legal compliance.

## Dependencies
- Phase 20 (Finance Module -- invoicing UI and workflows)
- Phase 28 (Email + PDF Generation -- invoice PDF generation)

## Requirements

- **INTG-04**: ETA e-invoicing: Egyptian Tax Authority API integration, digital signature (HSM/ITIDA), real-time submission, credit note submission

## Success Criteria
1. Invoice JSON/XML submits to ETA API in real-time upon invoice generation
2. Digital signature via HSM/ITIDA signs each submission correctly
3. Credit note submissions reference the original invoice per ETA requirements
4. Submission status (accepted/rejected/pending) tracks per invoice with retry on failure

## What to Build
From GSD.md: Egyptian Tax Authority API integration, digital signature (HSM/ITIDA), real-time submission, status tracking, credit note submission.

## Spec References

### ETA E-Invoicing Requirements (from RESEARCH.md)

**Mandatory for ALL B2B invoices in Egypt:**
- All B2B invoices must be submitted electronically to the Egyptian Tax Authority (ETA) in JSON/XML format
- Each invoice requires digital signature (HSM or software-based via ITIDA)
- Products must have EGS/GPC item codes
- Both seller and buyer Tax Registration Numbers (9-digit TRN) required
- Real-time submission to ETA platform
- Integration with ETA API is a Phase 1 requirement, not optional

### Invoice Table Schema (from BACKEND.md)

```sql
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  invoice_number TEXT NOT NULL,
  invoice_type invoice_type DEFAULT 'standard',
  order_id UUID NOT NULL REFERENCES orders(id),
  delivery_id UUID REFERENCES deliveries(id), -- NULL for proforma
  quote_id UUID REFERENCES quotes(id),
  customer_id UUID NOT NULL REFERENCES customers(id),
  status invoice_status DEFAULT 'draft',
  subtotal DECIMAL(15,2) NOT NULL,
  tax_amount DECIMAL(15,2) DEFAULT 0,
  delivery_charges DECIMAL(15,2) DEFAULT 0,
  discount_amount DECIMAL(15,2) DEFAULT 0,
  total DECIMAL(15,2) NOT NULL,
  amount_paid DECIMAL(15,2) DEFAULT 0,
  balance_due DECIMAL(15,2) GENERATED ALWAYS AS (total - amount_paid - adjustment_amount) STORED,
  currency TEXT DEFAULT 'EGP',
  payment_terms payment_terms,
  due_date DATE NOT NULL,
  tax_rate DECIMAL(5,4),
  -- ETA e-invoicing fields
  eta_uuid TEXT,                    -- ETA document UUID assigned by ETA
  eta_status TEXT,                  -- 'pending','submitted','valid','rejected','cancelled'
  eta_submission_date TIMESTAMPTZ,
  digital_signature_url TEXT,       -- PKI digital signature file
  company_stamp_url TEXT,           -- company stamp image
  buyer_trn TEXT,                   -- buyer tax registration number (9 digits)
  seller_trn TEXT,                  -- seller tax registration number (9 digits)
  -- ...other fields
  UNIQUE (tenant_id, invoice_number)
);
```

### Credit Notes Table Schema (from BACKEND.md)

```sql
CREATE TABLE credit_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  credit_note_number TEXT NOT NULL,
  customer_id UUID NOT NULL REFERENCES customers(id),
  return_id UUID REFERENCES returns(id),
  invoice_id UUID REFERENCES invoices(id),
  original_invoice_id UUID REFERENCES invoices(id), -- required reference; amount <= original
  order_id UUID REFERENCES orders(id),
  status credit_note_status DEFAULT 'draft',
  amount DECIMAL(15,2) NOT NULL,
  applied_amount DECIMAL(15,2) DEFAULT 0,
  remaining_amount DECIMAL(15,2) GENERATED ALWAYS AS (amount - applied_amount) STORED,
  currency TEXT DEFAULT 'EGP',
  reason TEXT NOT NULL,
  -- ETA e-invoicing
  eta_uuid TEXT,
  -- ...lifecycle fields
  UNIQUE (tenant_id, credit_note_number)
);
```

### Invoice Generation Rules (from RESEARCH.md)

**One invoice per delivery** (not per order). ETA e-invoicing requires same-day reporting -- invoice must be issued on delivery date. Each invoice gets its own ETA UUID. Multiple invoices reference the same sales order number.

### Zero-Value Line Items (from RESEARCH.md)

**NEVER submit EGP 0 items to ETA.** For free replacements (damaged goods): issue credit note against original invoice + new invoice for replacement at original price. Net = zero to customer, but both are ETA-compliant documents.

### Credit Note Rules (from RESEARCH.md)

- Separate ETA document with own UUID.
- Must reference original invoice UUID.
- Cannot exceed original invoice amounts.
- Reduces output VAT in the period issued (not the period of original invoice).
- **Penalties for non-compliance: EGP 20,000 - 100,000.**

**Every credit note (for damage, returns, price adjustments) must be submitted to the Egyptian Tax Authority e-invoicing system as a debit/credit document -- digitally signed, same format as invoices.**

### EGS/GPC Product Codes (from RESEARCH.md)

Every product requires an EGS (Egyptian General Standard) or GPC (Global Product Classification) code. Suppliers must provide these when publishing products. System validates code presence before a product can be included in an invoice.

### Withholding Tax (from RESEARCH.md)

- Rate: **1% on payments to suppliers for goods (building materials)**
- 3% for services, 5% for professional services
- Auto-calculated on every supplier payment
- Filed quarterly via Form 41 (electronic, mandatory) with payment to ETA
- Withholding certificate generated through ETA portal -> sent to supplier
- Penalties: EGP 3,000 - 50,000 for late filing; up to 12.5% of unpaid amount for late payment

### Withholding Tax Certificates Table (from BACKEND.md)

```sql
CREATE TABLE withholding_tax_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  payment_id UUID NOT NULL REFERENCES payments(id),
  gross_amount DECIMAL(15,2) NOT NULL,
  withholding_rate DECIMAL(5,2) NOT NULL, -- e.g. 1.00 for 1%
  withholding_amount DECIMAL(15,2) NOT NULL,
  certificate_number TEXT NOT NULL UNIQUE,
  quarter TEXT NOT NULL, -- 'Q1','Q2','Q3','Q4'
  year INTEGER NOT NULL,
  pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### ETA Integration Config (from BACKEND.md)

```
| ETA e-Invoicing | Egyptian Tax Authority electronic invoicing (mandatory) | REST API (OAuth2) | Client ID + Secret | Worker + KV + Queue |
```

### VAT Rate

**14% on ALL building materials (no exemptions).** Quotes show prices ex-VAT with separate VAT line + VAT-inclusive total. B2B buyers reclaim input VAT.

## Business Rules

**ETA Submission Flow:**
1. Invoice generated (from delivery confirmation trigger or manual)
2. System validates: all line items have EGS/GPC codes, buyer TRN present, seller TRN present, amounts correct, VAT calculated at 14%
3. Invoice document serialized to ETA JSON/XML format
4. Digital signature applied via HSM/ITIDA
5. Submitted to ETA API in real-time
6. ETA responds with UUID and status (accepted/rejected)
7. `eta_uuid` and `eta_status` stored on invoice record
8. If rejected: error details stored, notification sent to finance team, retry after correction
9. If accepted: invoice is now legally valid

**Digital Signature:**
- HSM (Hardware Security Module) or software-based via ITIDA (Egyptian IT Industry Development Agency)
- Each submission must be individually signed
- Certificate must be valid and not expired
- Private key stored securely (never in code, never in database)

**Credit Note Submission:**
- Same signing and submission process as invoices
- Must include `original_invoice_uuid` reference
- Amount must not exceed original invoice amount
- Submitted as a separate document type to ETA

**ETA Status Tracking:**
- `pending` -- generated, not yet submitted
- `submitted` -- sent to ETA, awaiting response
- `valid` -- accepted by ETA
- `rejected` -- rejected by ETA (with error details)
- `cancelled` -- cancelled (credit note issued)

**Retry Logic:**
- On network failure: queue for retry (Cloudflare Queues)
- On rejection: store error, notify finance, require manual correction
- Maximum retries: 3 automatic, then manual intervention
- Same-day submission required by law

**Invoice Dispute Workflow (from RESEARCH.md):**
- Customer rejects on ETA portal -> credit/debit note required (cannot delete e-invoices)
- 5-year record retention

## Non-Negotiable Rules

1. **Cloudflare Workers** for ETA API communication.
2. **Cloudflare KV** for caching ETA access tokens (OAuth2).
3. **Cloudflare Queues** for reliable submission with retry.
4. **Arabic required** on all ETA submissions per law.
5. **Same-day submission** -- invoice must be submitted to ETA on the delivery date.
6. **Never delete e-invoices** -- only credit notes can reverse them.
7. **All amounts in EGP.**
8. **9-digit TRN** required for both buyer and seller.

## Known Risks & Gotchas

1. **ETA API availability.** The Egyptian Tax Authority API can have downtime. Implement retry with exponential backoff. Queue submissions via Cloudflare Queues.
2. **Digital signature complexity.** HSM integration requires specific hardware or cloud HSM service. ITIDA software-based signing may be simpler for initial setup. Research current ITIDA requirements.
3. **EGS/GPC code mapping.** All products must have valid codes before they can appear on invoices. Build a validation step that blocks invoice generation if codes are missing. Include in product onboarding workflow.
4. **ETA format changes.** The Egyptian Tax Authority may update their JSON/XML schema. Build the serializer as a versioned module that can be updated independently.
5. **Testing environment.** ETA provides a sandbox/preprod environment. Use it for all development and testing. Never test against production.
6. **Certificate management.** Digital signing certificates expire. Build monitoring and alerts for certificate expiry.
7. **Penalties are significant.** EGP 20,000 - 100,000 for credit note non-compliance. EGP 3,000 - 50,000 for late withholding tax filing. Get this right.
8. **Record retention.** 5-year retention for all e-invoicing records. Ensure R2 lifecycle policies support this.

## Tips

- Start with the ETA sandbox environment. Get a successful submission before building the full pipeline.
- Build the JSON/XML serializer as a standalone function that can be unit tested with fixtures.
- The digital signature is the hardest part. Research ITIDA's current software-based signing SDK early.
- Store the full ETA request and response payloads in the database for debugging.
- Build a monitoring dashboard showing: submissions today, acceptance rate, pending submissions, rejected submissions needing attention.
- Credit note flow: ensure the UI prevents creating credit notes that exceed original invoice amounts.
- Withholding tax: auto-calculate on supplier payment recording. Generate certificates quarterly via pg_cron.
