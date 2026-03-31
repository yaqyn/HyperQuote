# Phase 28: Email + PDF Generation

## Goal
All transactional emails send via Resend and all business documents generate as Arabic-primary PDFs.

## Dependencies
- Phase 11 (Portal Orders + Delivery)
- Phase 20 (Finance Module -- invoicing)

## Requirements

- **INTG-02**: Email: Resend + React Email templates for transactional emails (quote ready, order confirmed, invoice, etc.)
- **INTG-03**: PDF generation: pdf-lib for invoice, quote, proforma, delivery note, BOL, credit note, receipt, board report (all Arabic-primary, digital stamp)

## Success Criteria
1. Transactional emails (quote ready, order confirmed, invoice attached) send via Resend with React Email templates
2. Invoice PDF generates Arabic-primary with ETA-required fields, digital stamp, and Geist Mono for all numbers
3. All 8 document types generate correctly: invoice, quote, proforma, delivery note, BOL, credit note, receipt, board report

## What to Build
From GSD.md: Resend integration for transactional email, pdf-lib for invoice/quote/delivery note/BOL/credit note/proforma/receipt/board report PDFs (all Arabic-primary).

## Spec References

### PDF Generation Architecture (from RESEARCH.md + BACKEND.md)

**Library:** pdf-lib in Cloudflare Workers (pure JS, works everywhere).
**Storage:** Cloudflare R2 with signed URLs.
**Shared data layer:** Same `prepareInvoiceData()` feeds both PDF and email templates.
**Driver signatures:** Canvas capture in app -> PNG -> composited onto BOL PDF.

**R2 Storage Paths:**
- `/{tenant_id}/invoices/{year}/{month}/` -- Invoice PDFs, credit notes
- `/{tenant_id}/quotes/{year}/{month}/` -- Quote PDFs, proforma invoices
- `/{tenant_id}/delivery-notes/` -- Branded delivery notes, BOLs
- `/{tenant_id}/receipts/` -- Payment receipts, withholding certificates
- `/{tenant_id}/reports/` -- Board reports, recurring reports

### 8 Document Types

#### 1. Invoice PDF

**Arabic-primary. ETA-required fields.**

**Required fields (from RESEARCH.md):**
- Seller: company name (Arabic), Commercial Registration (CR) number, Tax Registration Number (TRN, 9 digits), address, logo
- Buyer: company name, TRN, contact person
- Invoice metadata: invoice number, date (delivery date), ETA UUID
- Line items: product name (bilingual), SKU, EGS/GPC code, UOM, quantity, unit price (ex-VAT), line total
- Delivery: separate line item (zone-based pricing)
- Subtotal, VAT 14%, Grand total (VAT-inclusive)
- Payment terms
- Digital company stamp (ختم الشركة)
- Digital signature (PKI via ITIDA)

**Invoice table schema (from BACKEND.md):**
```sql
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  invoice_number TEXT NOT NULL,
  invoice_type invoice_type DEFAULT 'standard', -- standard, proforma, credit_note
  order_id UUID NOT NULL REFERENCES orders(id),
  delivery_id UUID REFERENCES deliveries(id), -- NULL for proforma
  customer_id UUID NOT NULL REFERENCES customers(id),
  status invoice_status DEFAULT 'draft',
  subtotal DECIMAL(15,2) NOT NULL,
  tax_amount DECIMAL(15,2) DEFAULT 0,
  delivery_charges DECIMAL(15,2) DEFAULT 0,
  total DECIMAL(15,2) NOT NULL,
  currency TEXT DEFAULT 'EGP',
  payment_terms payment_terms,
  due_date DATE NOT NULL,
  tax_rate DECIMAL(5,4),
  -- ETA e-invoicing
  eta_uuid TEXT,
  eta_status TEXT, -- 'pending','submitted','valid','rejected','cancelled'
  digital_signature_url TEXT,
  company_stamp_url TEXT,
  buyer_trn TEXT, -- 9 digits
  seller_trn TEXT, -- 9 digits
  -- ...lifecycle fields
);
```

#### 2. Quote PDF

**Required fields (from RESEARCH.md):**
- Seller: company name (Arabic), CR number, TRN, address, logo
- Buyer: company name, TRN, contact person
- Quote metadata: reference number, date, validity period
- Line items: product name (bilingual), SKU, UOM, quantity, unit price (ex-VAT), line total
- Delivery: separate line item (zone-based pricing), area/governorate, terms (DAP or Franco site)
- Subtotal, VAT 14%, Grand total (VAT-inclusive)
- Payment terms: explicit ("50% advance, 50% COD by certified bank check" for new customers)
- Delivery surcharges if applicable
- Price disclaimer: "Prices valid for [X] days."
- Free delivery note if applicable
- Digital company stamp

#### 3. Proforma Invoice PDF

Same data as Quote PDF but formatted like an invoice. Includes bank details. Needed for Egyptian companies to process internal purchase approvals and open Letters of Credit.

#### 4. Delivery Note PDF

**HyperQuote-branded. Generated for EVERY delivery including drop-ships.**
- HyperQuote logo + company details
- Order number, date, address
- Line items with quantities
- **NO prices** (prices are the margin secret)
- Driver name + signature
- Receiver name + signature + title
- GPS coordinates

Sent to supplier for drop-ship deliveries. Supplier prints and attaches to shipment. Customer signs this document.

#### 5. Bill of Lading (BOL)

- Carrier information
- Shipper and consignee details
- Item descriptions, weights, quantities
- Vehicle information
- Driver signature (composited from app capture)
- Receiver signature

#### 6. Credit Note PDF

**Must be submitted to ETA e-invoicing system.**
- References original invoice UUID
- Cannot exceed original invoice amounts
- Reduces output VAT in the period issued
- Penalties for non-compliance: EGP 20,000 - 100,000

**Credit notes table schema (from BACKEND.md):**
```sql
CREATE TABLE credit_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  credit_note_number TEXT NOT NULL,
  customer_id UUID NOT NULL REFERENCES customers(id),
  invoice_id UUID REFERENCES invoices(id),
  original_invoice_id UUID REFERENCES invoices(id), -- required ref
  status credit_note_status DEFAULT 'draft',
  amount DECIMAL(15,2) NOT NULL,
  reason TEXT NOT NULL,
  eta_uuid TEXT,
  -- ...lifecycle fields
);
```

#### 7. Payment Receipt (إيصال استلام)

Auto-generated when any payment is received and verified (wire, cheque cleared, LC drawn). Sent to customer via portal + WhatsApp.

#### 8. Board Report PDF

Export of any view or AI conversation. Bilingual (Arabic required for Egyptian financial statements, English for international boards). Recurring scheduled reports (weekly/monthly) via pg_cron -> PDF -> email.

### Email Templates (Resend + React Email)

**Transactional emails:**
- Quote ready notification
- Order confirmed
- Invoice attached (with PDF)
- Delivery dispatched
- Delivery completed
- Payment received confirmation
- AR reminder (overdue)
- CEO daily digest
- CEO weekly insight (with PDF attachment)
- Account creation confirmation
- Password/PIN reset
- Team member invitation

### EGS/GPC Product Codes (from RESEARCH.md)

Every product in the catalog requires an EGS (Egyptian General Standard) or GPC (Global Product Classification) code for ETA e-invoicing compliance. Suppliers must provide these when publishing products via the portal. System validates code presence before a product can be included in an invoice.

### Digital Company Stamp (ختم الشركة) (from RESEARCH.md)

All PDF documents (quotes, proformas, invoices, delivery notes, credit notes) include HyperQuote's digital company stamp -- standard expectation in Egyptian business documents.

### Zero-Value Line Items (from RESEARCH.md)

NEVER submit EGP 0 items to ETA. For free replacements (damaged goods): issue credit note against original invoice + new invoice for replacement at original price. Net = zero to customer, but both are ETA-compliant documents.

## Business Rules

**Invoice Generation:** One invoice per delivery (not per order). ETA e-invoicing requires same-day reporting -- invoice must be issued on delivery date. Each invoice gets its own ETA UUID.

**PDF Format Requirements:**
- A4 size, printable in B&W
- WhatsApp-friendly file size (< 5MB ideally)
- Arabic-primary: Arabic is the legally binding version
- Bilingual product names
- All numbers in Geist Mono font (or equivalent in PDF)
- Arabic-Indic numerals in Arabic version
- Currency: EGP with locale-appropriate formatting

**Revenue Recognition:** EAS 48 (Egyptian IFRS 15 equivalent) -- revenue recognized at point of delivery. Invoice should be same day as delivery.

**Withholding Tax Certificate:**
- Generated when HyperQuote pays suppliers
- Gross amount - 1% withholding = net payment
- Filed quarterly via Form 41 to ETA
- Certificate sent to supplier

## Non-Negotiable Rules

1. **Cloudflare Workers** for PDF generation and email sending.
2. **pdf-lib** for PDF generation. Pure JS, works in Workers.
3. **Resend + React Email** for transactional email.
4. **Bun, NOT npm/yarn/pnpm.**
5. **Geist Mono for ALL numbers** in PDFs -- prices, quantities, IDs, dates.
6. **Arabic-primary PDFs.** Arabic is the legally binding version.
7. **Digital company stamp** on all business documents.
8. **Arabic-Indic numerals** in Arabic PDFs. No exceptions.

## Known Risks & Gotchas

1. **Arabic text rendering in pdf-lib.** pdf-lib does not natively support RTL/Arabic text shaping. You need to use a font that includes Arabic glyphs (IBM Plex Sans Arabic WOFF2 -> OTF) and handle RTL text direction manually or via a shaping library (e.g., `arabic-reshaper` for connected letter forms).
2. **Font embedding.** pdf-lib requires embedding fonts as binary. Load WOFF2 files, convert or use OTF/TTF directly. Self-host in R2.
3. **Cloudflare Workers 128MB memory limit.** PDF generation with embedded fonts and images must stay under this. Stream where possible.
4. **PDF file size.** Photos embedded in delivery notes can balloon file size. Compress images before embedding.
5. **Resend rate limits.** $20/mo plan includes 50K emails. Track usage.
6. **Email deliverability.** Configure SPF, DKIM, DMARC for hyperquote.net domain. Resend handles most of this.
7. **React Email SSR.** React Email templates are rendered server-side to HTML. Ensure Cloudflare Workers can run the render function.

## Tips

- Build a shared `PDFBuilder` class that handles: font loading, Arabic text shaping, number formatting (Arabic-Indic), company stamp compositing, signature compositing, currency formatting.
- Use the same data preparation function for both PDF and email: `prepareInvoiceData()`, `prepareQuoteData()`, etc.
- Store generated PDFs in R2 immediately. Generate presigned URLs for download.
- For board reports, build a generic "report-to-PDF" pipeline that takes structured data + template -> PDF.
- Test Arabic rendering thoroughly. Connected Arabic letters, bidirectional text (Arabic + English + numbers in same line), and RTL table alignment are all tricky.
- Email templates should be simple and focused -- the real document is the attached PDF.
