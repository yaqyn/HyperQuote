---
phase: 16-sales-module
plan: 05
subsystem: sales/quote-builder
tags: [quote-builder, delivery, payment, validity, preview, send, cairo-truck-ban]
dependency_graph:
  requires: [16-04]
  provides: [complete-quote-builder-steps-5-10]
  affects: [quote-lifecycle, customer-communication]
tech_stack:
  added: []
  patterns: [react-aria-radiogroup, react-aria-datepicker, react-aria-numberfield, react-aria-modal, react-aria-switch, useWatch]
key_files:
  created:
    - apps/internal/src/components/sales/quote-builder/DeliveryTerms.tsx
    - apps/internal/src/components/sales/quote-builder/PaymentTerms.tsx
    - apps/internal/src/components/sales/quote-builder/ValidityPeriod.tsx
    - apps/internal/src/components/sales/quote-builder/QuotePreviewModal.tsx
    - apps/internal/src/components/sales/quote-builder/SendQuote.tsx
  modified:
    - apps/internal/src/components/sales/quote-builder/QuoteBuilderView.tsx
    - apps/internal/src/components/sales/quote-builder/LineItemsTable.tsx
decisions:
  - "DeliveryTerms uses pattern-matching for Greater Cairo addresses (cairo/giza + Arabic variants)"
  - "PaymentTerms restricts new customers to advance_cod only, existing customers see approved terms"
  - "QuotePreviewModal is styled HTML preview, not actual PDF (PDF generation deferred to Phase 28)"
  - "Fixed watch() to useWatch() in QuoteBuilderView per React 19 requirement"
metrics:
  duration: 7min
  completed: "2026-04-05T18:37:15Z"
  tasks: 2
  files: 7
---

# Phase 16 Plan 05: Quote Builder Steps 5-10 Summary

Completed the quote builder with delivery terms (Cairo truck ban enforcement), payment terms (credit-aware), validity period (volatile material detection), customer-facing preview modal (no cost/margin), and send via portal/email/both with schedule send.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | DeliveryTerms, PaymentTerms, ValidityPeriod (Steps 5-7) | 34b3142 | DeliveryTerms.tsx, PaymentTerms.tsx, ValidityPeriod.tsx |
| 2 | QuotePreviewModal (Step 9) and SendQuote (Step 10) | b5f17da | QuotePreviewModal.tsx, SendQuote.tsx |

## What Was Built

### Step 5: DeliveryTerms
- React Aria DatePicker with minimum lead time enforcement
- RadioGroup for delivery method (Jobsite / Customer Pickup / Third-Party Carrier)
- Special instructions textarea (crane offload, restricted hours)
- Zone-based delivery pricing with weight surcharges
- Free delivery threshold check
- **Cairo Truck Ban (NON-NEGOTIABLE):** Pattern-matches Greater Cairo addresses (cairo, giza, Arabic variants). If >5 tons, auto-locks delivery window to 12:00 AM - 06:00 AM. Time picker disabled, yellow warning banner shown. Cannot be overridden.

### Step 6: PaymentTerms
- React Aria Select with customer's approved payment terms
- Credit status display: limit, outstanding, available (all Geist Mono)
- CreditStatusBanner for low credit situations
- Warning + "Request Credit Limit Increase" when quote exceeds available credit
- New customer default: 50% advance + 50% COD, auto-applied
- Early payment discount checkbox (2/10 Net 30)

### Step 7: ValidityPeriod
- React Aria NumberField with 5-30 day range, default 14
- Volatile material detection from line item product names (steel, rebar, cement, concrete)
- Warning when validity >14 days with volatile materials
- Computed expiry date in Geist Mono
- Quick-set buttons (7, 14, 21, 30 days)

### Step 9: QuotePreviewModal
- Elevated glass modal (backdrop-blur-2xl bg-white/90)
- isKeyboardDismissDisabled on Dialog
- Customer-facing: NO supplier cost, NO margin, NO internal columns
- Seller info (Arabic company name, CR, TRN, digital stamp placeholder)
- Buyer info, quote metadata (reference, date, validity)
- Line items with sell price and line total only
- Subtotal, VAT 14%, Grand total (all Geist Mono)
- Toggle: spec details vs summary view
- Cover note, price disclaimer

### Step 10: SendQuote
- RadioGroup: Portal (preferred, highlighted) / Email (PDF) / Both
- Recipient selection with CC capability
- Schedule send with Switch + "8 AM tomorrow" suggestion
- Partial quote detection: missing freshness items show "Price on Application"
- Confirmation dialog with isKeyboardDismissDisabled
- Calls sendQuote server function mutation
- On success: status -> "Sent"

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed watch() to useWatch() in QuoteBuilderView**
- **Found during:** Task 1
- **Issue:** QuoteBuilderView used `methods.watch('lineItems')` which is broken with React 19
- **Fix:** Changed to `useWatch({ control: methods.control, name: 'lineItems' })`
- **Files modified:** QuoteBuilderView.tsx
- **Commit:** 34b3142

**2. [Rule 2 - Missing] Extended QuoteFormValues with delivery/payment fields**
- **Found during:** Task 1
- **Issue:** QuoteFormValues lacked deliveryDate, deliveryWindow, specialInstructions, earlyPaymentDiscount fields
- **Fix:** Added missing fields to the interface and default values
- **Files modified:** LineItemsTable.tsx, QuoteBuilderView.tsx
- **Commit:** 34b3142

## Known Stubs

None -- all components are fully wired with form state and server function calls. PDF generation in QuotePreviewModal is intentionally a styled HTML preview (Phase 28 will add actual PDF).

## Threat Model Verification

- **HIGH:** Customer-facing preview confirmed: zero occurrences of supplierCost, supplier_cost, or marginPercent in QuotePreviewModal.tsx
- **MEDIUM:** Cairo truck ban enforced: pattern matching for Greater Cairo, weight threshold check, disabled time picker, yellow warning banner
- **LOW:** Schedule send stores ISO timestamp for server-side processing, no client-side timer

## Self-Check: PASSED

All 7 files verified present. Commits 34b3142 and b5f17da verified in git log.
