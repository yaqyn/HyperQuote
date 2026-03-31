# Phase 20: Finance Module

## Goal
Finance team can generate ETA-compliant invoices, track AR/AP aging, record payments across 4 instruments, manage credit, and reconcile bank statements.

## Dependencies
- Phase 15 (Internal Platform Shell) must be complete
- Phase 13-14 (Database tables) must be complete — invoices, invoice_items, payments, payment_allocations, cheque_tracking, letters_of_credit, credit_notes, withholding_tax_certificates
- Phase 3 (Shared Packages) must be complete

## Requirements

- **FIN-01**: Invoicing: auto-generated from delivery confirmation, ETA e-invoicing submission (real-time JSON/XML), digital signature, Arabic-primary PDF
- **FIN-02**: AR aging: KPI strip + drill-down table (customer -> bucket -> invoice), severity color coding, sparkline trends
- **FIN-03**: Payment recording: wire transfer (auto-match by amount+reference), cheque (PDC tracking with status machine), letter of credit (draw-down tracking)
- **FIN-04**: PDC grid + calendar: maturity view, 3-day-before notifications, bounce handling (credit hold + legal notification + Tier 5)
- **FIN-05**: AP: supplier invoice list with three-way match (PO vs receipt vs invoice), variance tolerance rules, withholding tax tracking (1% goods, 5% services)
- **FIN-06**: Credit management: profile card with utilization bar, auto-hold triggers (5 types), limit change approval chain, new customer defaults (50% advance + 50% COD)
- **FIN-07**: Bank reconciliation: CSV import, auto-matching, unmatched item handling
- **FIN-08**: Reports: daily cash, AR/AP aging, 13-week forecast, P&L by customer/product/project, margin analysis, cheque tracking, ETA submission status
- **FIN-09**: Invoice dispute workflow: create dispute, investigate, resolve (4 resolution types), escalate, 48h SLA, customer-facing dispute status in portal

## Success Criteria
1. Invoices auto-generate from delivery confirmation with Arabic-primary PDF and ETA e-invoicing JSON/XML submission
2. AR aging shows KPI strip + drill-down table (customer -> bucket -> invoice) with severity color coding
3. Payment recording handles all 4 instruments: wire (auto-match), cheque (PDC tracking with status machine), LC (draw-down tracking), cash
4. Credit management shows profile card with utilization bar, auto-hold triggers (5 types), and new customer defaults (50% advance + 50% COD)
5. Bank reconciliation imports CSV, auto-matches by amount+reference, and surfaces unmatched items

## What to Build
Invoicing + ETA submission, AR aging (KPI strip + drill-down), payment recording (wire/cheque/LC), PDC grid + calendar, 3-way AP match, credit management (profile card + utilization bar), bank reconciliation, reports.

## Spec References

### FRONTEND.md — MODULE 5: FINANCE (Full Spec)

**Primary users:** Controller, AR Clerk, AP Clerk, Credit Manager, CFO
**Hotkey:** `F`

#### 5.1 Finance Home View

**Tabs:** `[Home] [Invoicing] [AR] [AP] [Payments] [Credit] [Bank Reconciliation] [Reports]`

**Home content:**
- Key metrics bar: Revenue MTD, Outstanding AR, Overdue AR, Cash Position (all Geist Mono)
- AR Aging summary: Current, 1-30, 31-60, 61-90, 90+ with amounts
- Expected payments this week: customer, amount, method, due date
- Payment method breakdown: Wire %, Cheque %, LC %
- Customer credit utilization: top customers approaching limits
- AP due this week + overdue AP
- Margin tracking: avg margin MTD, highest/lowest margin deals

#### 5.2 Invoicing

**Auto-generated from delivery confirmation.** When dispatcher marks "Delivered" with valid POD, invoice generates automatically.

**Invoice includes:**
- Seller: company name (Arabic), CR number, TRN, address, logo, digital stamp (ختم الشركة)
- Buyer: company name, TRN, contact person
- Invoice number, date, due date (based on payment terms)
- Line items: product name (bilingual), EGS/GPC code (required for ETA), UOM, quantity, unit price (ex-VAT), line total
- Delivery charges as separate line
- Subtotal, VAT 14%, Grand total (VAT-inclusive)
- Payment terms, bank details for wire transfer
- Digitally signed (HSM or ITIDA software-based) for ETA e-invoicing compliance

**ETA E-Invoicing submission:** Every invoice submitted in real-time to Egyptian Tax Authority API in JSON/XML format. Both seller and buyer TRN (9-digit) required. System validates all required fields before submission. Failed submissions flagged for manual review.

**Invoice list:** table with number, customer, amount, date, due date, status, ETA submission status
**Statuses:** Draft -> Sent -> Viewed -> Partially Paid -> Paid / Overdue -> Collections / Disputed -> Resolved / Adjusted / Written-Off

**Actions:** `[View PDF]` `[Send to Customer]` `[Record Payment]` `[Issue Credit Note]` `[Dispute]`

**Multi-channel send (modal):**
- Checkboxes: `[x] Customer Portal` | `[x] Email` | `[ ] WhatsApp` | `[ ] Print & Mail`
- Pre-filled message template (editable). `[Send Now]` or `[Schedule for DATE]`.
- Post-send tracking per channel

**Credit note generation:**
- Linked to original invoice. Reason: Goods returned / Price adjustment / Damaged goods / Other
- Select affected lines from original invoice. Amount auto-calculated or manual override.
- Approval required if > configurable threshold. Auto-reverses AR on approval.

#### 5.3 Accounts Receivable (AR)

**KPI Strip (top of AR view):**
- Horizontal row of 4-6 KPI cards: Total Outstanding, DSO, CEI%, Overdue Amount, Current Period Collections
- Each card: glass panel container, click to filter table below.

**AR Aging Table:**
- Columns: Customer Name | Current | 1-30 | 31-60 | 61-90 | 90+ | Total | Trend Sparkline
- All amounts in Geist Mono, right-aligned
- Color coding: current=green, 1-30=yellow, 31-60=orange, 61-90=red, 90+=dark red bold
- Row background shifts based on worst aging bucket
- Each cell clickable -- drills into invoices for that customer+bucket
- Sparkline in last column: 6-month aging trend per customer
- Column headers show aggregate totals per bucket

**Drill-down flow (progressive disclosure):**
1. Dashboard level: summary KPI strip + aging table
2. Click aging cell -> filtered invoice list
3. Click invoice -> invoice detail with payment history, communication log, dispute status
4. Breadcrumb: "AR Dashboard > 61-90 Days > ACME Corp > INV-2025-0342"

**Filtering & segmentation:**
- Filter by: customer tier, sales rep, date range, amount range, customer group
- Group by: customer, region, salesperson
- Sort by: total outstanding, oldest invoice, highest risk
- Save filter combinations as named views ("My Open Quotes", "Overdue Invoices")
- Active filters shown as removable pills. "Clear all filters" link.

**Automation:**
- Invoice overdue 30 days: auto-send reminder (WhatsApp + email)
- Invoice overdue 60 days: auto-escalate to Credit Manager + hold new orders
- Invoice overdue 90 days: collections status, legal notification option

#### 5.4 Payment Recording Flow

**Step-by-step for recording a received payment:**

1. **Select method:** `[Wire Transfer]` `[Cheque]` `[Letter of Credit]`

2. **Wire Transfer flow:**
   - Bank reference number, amount received (Geist Mono), date received, receiving bank account
   - `[Match to Invoice]` -- system auto-suggests matching invoices based on customer + amount + memo
   - Running balance shown live
   - If exact match: auto-match, one click confirm
   - If partial: allocate across invoices. "Auto-allocate FIFO" button.
   - If overpayment: `[Apply to Next Invoice]` `[Hold as Credit]` `[Initiate Refund]`
   - `[Confirm Payment]` -- generates payment receipt PDF

   **Bank statement import (batch):** Bulk import from CSV/MT940. Auto-matching. `[Apply All Matches]` for bulk processing.

3. **Cheque flow (Post-Dated Cheque Tracking):**
   - Cheque number, bank name, amount, cheque date (may be future), payer name
   - **Cheque status tracking:** Received -> Deposited -> Cleared / Bounced
   - Calendar reminder to deposit on cheque date
   - **Bounced cheque:** immediate credit hold, legal notification, Tier 5 status, alert Sales + Credit Manager
   - **Bounce handling flow:** Mark "Bounced" -> reason dropdown -> auto-reverses accounting -> adds back to AR -> options: Re-present / Request Replacement / Write Off / Escalate

   **PDC Grid View:**
   - Columns: # | Cheque No | Customer | Bank | Amount | Maturity Date | Status | Actions
   - Status state machine: Received (blue) -> Deposited (orange) -> Cleared (green). Bounced (red) -> Re-presented -> Cleared/Written Off/Replaced.
   - Summary footer row: totals per status

   **PDC Calendar / Maturity View:**
   - Monthly calendar with color-coded dots per due date
   - "Due This Week" summary bar
   - Notifications: 3 days before maturity

4. **Letter of Credit flow:**
   - LC number, issuing bank, amount, expiry date
   - Document compliance checklist
   - Draw-down recording

**Payment receipt generation:** Auto-generates PDF (ايصال استلام) on verified payment, sent to customer.

#### 5.5 Accounts Payable (AP)

**Supplier payment tracking:**
- Invoice list with three-way match status: PO + Receipt + Supplier Invoice
- Match status: green (all match), yellow (within tolerance), red (exceeds tolerance)

**Three-way match review (side-by-side):**
- Three columns: PO | Goods Receipt | Supplier Invoice
- Discrepancy highlighting per cell
- Tolerance rules (configurable): Price 0-5%, Quantity 0-2%, Tax 0%, Delivery per PO terms
- Actions: Approve All / Approve Matched / Dispute / Hold / Reject
- Withholding tax tracking: gross amount, 1% withholding, net payment
- Withholding tax certificate generation
- Quarterly withholding remittance to ETA via Form 41

**AP Aging:** Current, 1-30, 31-60, 61-90, 90+ days payable to suppliers

#### 5.6 Credit Management

**Customer credit profile card:**
- Header: Customer name, Tier badge, Status badge
- Credit Limit (Geist Mono 20px)
- Utilization bar: color-coded gradient (0-60% green, 60-80% yellow, 80-95% orange, 95-100% red, >100% pulsing red + "OVER LIMIT")
- Available credit, overdue amount, Payment Score (0-100), Avg Days to Pay, Bounced Cheques (12mo), Last Payment date
- Quick actions: `[Hold Orders]` `[Adjust Limit]` `[Review]`
- Auto-hold triggers: (1) Credit limit exceeded, (2) Days overdue >30, (3) Overdue >X% of limit, (4) Bounced cheque count exceeds threshold, (5) Credit limit expired
- New customer defaults: 50% advance + 50% COD by certified bank cheque
- Net terms only after 2-3 successful cash transactions + credit application

**Credit review & limit increase:**
- Current limit + requested limit + supporting data
- AI recommendation
- Actions: Approve / Approve Different Amount / Deny / Defer

**Credit limit approval chain:**
- Increase <20%: Finance Manager
- Increase 20-50%: Finance Manager + CFO
- Increase >50% or >EGP 50M: Finance Manager + CFO + CEO

#### 5.7 Bank Reconciliation

- Bank statement import (CSV initially, Plaid API in Phase 2)
- Auto-matching by amount + date + reference
- Unmatched items highlighted
- Status: matched, partially matched, unmatched, exception

#### 5.8 Finance Reports

- Daily cash position, AR aging, AP aging, 13-week cash forecast
- P&L by customer/product/project, Margin analysis
- Payment method distribution, Cheque tracking, ETA submission report, Credit utilization
- Filters + Export CSV/PDF/Email

#### 5.9 Finance Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `G` then `I` | Go to Invoicing |
| `G` then `A` | Go to AR Aging |
| `G` then `P` | Go to AP |
| `G` then `C` | Go to Credit Management |
| `N` | Record New Payment |

### BACKEND.md — Server Functions (Finance)

| Function | Method | Input | Output | Auth | Side Effects |
|---|---|---|---|---|---|
| `getFinanceDashboard` | GET | `{}` | `{ receivables, payables, cashPosition, overdueAR, overdueAP, monthlyRevenue }` | finance | none |
| `createInvoice` | POST | `{ orderId, lines[], dueDate, currency }` | `{ invoiceId, etaInvoiceId? }` | accountant | Generate PDF, submit ETA, notify customer |
| `recordPayment` | POST | `{ invoiceId, amount, method, reference, date, bankAccount? }` | `{ paymentId, remainingBalance }` | accountant | Update invoice, credit exposure |
| `recordCheque` | POST | `{ invoiceId, chequeNumber, bankName, amount, maturityDate, drawerName }` | `{ chequeId }` | accountant | Schedule maturity check |
| `getARAgingReport` | GET | `{ asOfDate? }` | `{ current, days30, days60, days90, days90plus, details[] }` | finance | none |
| `getAPAgingReport` | GET | `{ asOfDate? }` | `{ current, days30, days60, days90, details[] }` | finance | none |
| `createSupplierPayment` | POST | `{ supplierId, poIds[], amount, method, reference }` | `{ paymentId }` | finance_manager | Update PO payment, notify supplier |
| `generateForm41` | POST | `{ quarter, year }` | `{ reportId, downloadUrl }` | finance_manager | Generate PDF to R2 |
| `reconcileBankStatement` | POST | `{ bankAccountId, entries[] }` | `{ matched, unmatched[] }` | accountant | Update reconciliation |
| `getCashFlowForecast` | GET | `{ months }` | `{ forecast[] }` | finance_manager | none |
| `sendInvoice` | POST | `{ invoiceId, channels[] }` | `{ sentVia[] }` | finance | Dispatches via channels |
| `createCreditNote` | POST | `{ invoiceId, reason, lineItems?, amount? }` | `{ creditNoteId }` | finance | Adjusts customer balance |
| `updateChequeStatus` | PATCH | `{ chequeId, status, reason? }` | `{ success }` | finance | Updates cheque tracking |
| `getInvoiceDetail` | GET | `{ invoiceId }` | `{ invoice, items, payments, timeline }` | finance | none |
| `getCreditProfile` | GET | `{ customerId }` | `{ credit, utilization, history, score }` | finance | none |
| `updateCreditLimit` | POST | `{ customerId, newLimit, reason }` | `{ success, approvalRequired? }` | finance_manager | May require approval |
| `importBankStatement` | POST | `{ fileUrl, bankAccountId }` | `{ transactionCount, autoMatchedCount }` | finance | Auto-matches payments |
| `generateProformaInvoice` | POST | `{ quoteId? or orderId? }` | `{ invoiceId, invoiceNumber, pdfUrl }` | sales, finance | Generate proforma |
| `batchGenerateInvoices` | POST | `{ deliveryIds[], invoiceDate?, taxRate? }` | `{ batchId, invoices[], skipped[] }` | finance | Batch create invoices |
| `batchRecordPayments` | POST | `{ payments[], sourceType? }` | `{ batchId, payments[], invoicesFullyPaid[] }` | finance | Batch record payments |
| `batchSendInvoices` | POST | `{ invoiceIds[], channels[] }` | `{ batchId, results[], totalSent }` | finance | Batch send |
| `batchUpdateChequeStatus` | POST | `{ updates[] }` | `{ batchId, updated[], customersOnCreditHold[] }` | finance | Batch cheque updates |
| `createDispute` | POST | `{ invoiceId, disputeReason, description, evidenceUrls? }` | `{ disputeId }` | customer, finance | Open dispute, 48h SLA |
| `assignDispute` | POST | `{ disputeId, assignedTo }` | `{ success }` | finance_manager | Assign dispute to team member |
| `resolveDispute` | POST | `{ disputeId, resolutionType, resolutionNotes }` | `{ success }` | finance | Close dispute |
| `escalateDispute` | POST | `{ disputeId, escalatedTo, notes }` | `{ success }` | finance | Escalate |
| `generateProformaPDF` | GET | `{ invoiceId }` | `{ url }` | customer, sales, finance | On-demand PDF generation |

## Business Rules

**Egyptian VAT:** 14% on ALL building materials (no exemptions). Quotes show prices ex-VAT with separate VAT line + VAT-inclusive total.

**ETA E-Invoicing (Mandatory):**
- All B2B invoices submitted electronically to ETA in JSON/XML format
- Digital signature via HSM or ITIDA
- Products must have EGS/GPC item codes
- Both seller and buyer TRN (9-digit) required
- Credit notes also submitted to ETA
- **E-invoices cannot be deleted.** If a customer rejects on the ETA portal, a credit/debit note must be issued instead. This is a legal requirement.

**Withholding Tax:**
- 1% on payments to suppliers for goods
- 5% on payments for services (driver payments)
- Remitted quarterly via Form 41
- Certificate generated per supplier

**Payment Methods (ALL transactions):**
- Bank wire transfer, certified bank cheque / post-dated cheques, cash, letters of credit
- NO mobile wallets, NO digital payment apps

**Post-Dated Cheques (PDC):**
- Core payment instrument in Egyptian B2B
- Bounced cheque is a CRIMINAL OFFENSE under Egyptian law
- Status machine: Received -> Deposited -> Cleared / Bounced
- Bounced triggers: immediate credit hold + legal notification + Tier 5 status

**Customer Tiers (Payment Requirements):**
- Tier 1 (New): Cash Before Delivery or PDCs required
- Tier 2 (Developing): Net 30 with PDCs
- Tier 3 (Established): Net 30-60, cheques or wire
- Tier 4 (Strategic/VIP): Net 60-90, maximum flexibility
- Tier 5 (Flagged): CBD only, no exceptions

**Payment Behavior Score (0-100):**
- Dollar-weighted, recency-biased
- 80+ = eligible for tier upgrade
- 50-79 = maintain tier
- Below 50 = automatic downgrade

**Late Payment Escalation:**
- 1-7 days: Grace period
- 8-15 days: Warning
- 16-30 days: Order holds
- 31-60 days: Tier downgrade
- 60+ days: Account freeze + legal

**Invoice Dispute Workflow:**
- Customer rejects on ETA portal -> credit/debit note required (cannot delete e-invoices)
- 48h SLA for resolution
- 5-year record retention

**Payment Methods by Order Size (RESEARCH.md Section 8):**
| Order Size (EGP) | Accepted Payment Methods |
|---|---|
| 500K-5M | Company cheque / wire transfer |
| 5M-50M | Wire transfer / certified cheque |
| 50M-500M | Wire transfer / Letter of Credit |
| 500M-5B+ | Letter of Credit / wire series / bank guarantee |

**Tier 5 Rehabilitation (RESEARCH.md Section 8):**
12-18 months recovery path: full debt settlement -> 6 months Cash Before Delivery probation -> limited credit at 50% prior limit -> gradual restoration. Repeat offenders (2+ bounced cheques) = permanent blacklist.

**Cash Flow Benchmarks (RESEARCH.md Section 8):**
Cash Conversion Cycle 45-90 days. Working capital requirement 10-18% of annual revenue. Primary tool: bank credit lines secured by PDCs (cheque discounting at 85-90% face value).

**Retainage Tracking (RESEARCH.md Section 8):**
Retainage 5-10% held until project completion. Common in large Egyptian construction projects. Terms negotiated per contract.

**Chronically Late-But-Reliable Payers (RESEARCH.md Section 8):**
Don't penalize -- adjust terms instead. Move from Net 30 to Net 45 to match actual behavior. Penalizing reliable-but-slow payers loses good customers.

**Credit Insurance (RESEARCH.md Section 8):**
Credit insurance available via Coface Cairo office and Atradius from Dubai at 0.3-0.8% of insured turnover. Consider selectively when individual credit limits exceed EGP 5M. Skip at launch.

## Non-Negotiable Rules

1. **Three colors only.** White, Black, Blue. Semantic status colors for DATA only (AR aging colors are data).
2. **Spatial glass, not dashboards.** Finance module inside glass window.
3. **Geist Mono for ALL numbers.** Every monetary value, every percentage, every date.
4. **React Aria Components, NOT shadcn.**
5. **`useWatch()`, NEVER `watch()`.**
6. **Colors in `:root {}`, NEVER in `@theme`.**
7. **ALL numbers -> Arabic-Indic numerals in Arabic context.**
8. **Currency:** EGP. `Intl.NumberFormat`. "EGP" prefix in English, "ج.م" suffix in Arabic.

## Known Risks & Gotchas

- AR aging sparklines: use a lightweight SVG chart library, not a full charting lib
- PDC calendar requires a real calendar component — React Aria Calendar
- Cheque status machine must enforce valid transitions only
- Bank reconciliation CSV parser must handle various Egyptian bank formats
- ETA e-invoicing is a complex integration — Phase 20 builds the UI and data model, actual ETA API integration is Phase 29
- Credit utilization bar with pulsing red at >100% requires Motion animation

## Tips

- Finance is the second-largest module. Build incrementally: Invoicing first, then AR, then Payments, then PDC, then AP, then Credit, then Recon, then Reports.
- The AR aging drill-down flow is the most complex interaction: KPI click -> table cell click -> invoice detail -> breadcrumb navigation
- Three-way match review uses a side-by-side layout — this is a complex comparison UI
- Batch operations (batchGenerateInvoices, batchRecordPayments, etc.) are essential for operational efficiency
- The PDC grid and calendar are two views of the same data
