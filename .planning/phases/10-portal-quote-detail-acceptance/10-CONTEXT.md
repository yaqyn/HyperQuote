# Phase 10: Portal Quote Detail + Acceptance

## Goal
Customers can review received quotes and respond with accept, counter-offer, partial accept, or decline — triggering downstream order creation.

## Dependencies
- Phase 9 (Material List Builder + Quote Submission) must be complete
- Database tables: `quotes`, `quote_items`, `orders`, `order_items`, `invoices`, `invoice_items` must exist
- The `on_quote_accepted()` trigger must be in place (creates order + proforma invoice on acceptance)

## Requirements

**PORT-05: Quote detail** — timeline, line items with prices (Geist Mono), accept/counter-offer/partial accept/decline actions, version history and comparison.

## Success Criteria
1. Quote detail shows timeline, line items with prices in Geist Mono, VAT breakdown, and validity countdown
2. "Accept" creates an order + supplier POs + proforma invoice in one transaction
3. Counter-offer allows total discount OR per-line price editing with amber highlights and floating changes bar
4. Version history shows collapsible diffs and side-by-side comparison between quote versions

## What to Build
- Quote header: reference, status badge, validity countdown, assigned rep
- Quote timeline (vertical, 7 steps)
- Line items table with prices (Geist Mono), VAT, total
- Accept -> confirmation modal -> order created (+ proforma invoice auto-generated)
- Counter-offer: total discount OR per-line price editing (amber highlight, floating changes bar)
- Partial accept: per-line Accept/Reject/Negotiate
- Decline with reason
- Version history (collapsible diffs)
- Version comparison modal (side-by-side)
- Server functions: `acceptQuote()`, `submitCounterOffer()`, `submitPartialResponse()`
- Trigger: quote accepted -> auto-create order + supplier POs + proforma invoice

## Spec References

### FRONTEND.md Section 2.7 — Quote Detail & Response (Customer View)

**URL:** `/orders/{quote-id}`
**Sub-view within Orders window.**

**Layout:**
- Back button: "< Back to Orders"
- Quote header: Reference (Geist Mono 20px), Status badge (large format), Date submitted (Geist Mono 14px), Validity period with countdown (warning if < 3 days, error if expired), Assigned rep with WhatsApp link.

**Quote timeline (vertical on desktop, horizontal on mobile):**
- Steps: "Submitted" -> "Under Review" -> "Sourcing" -> "Quote Ready" -> "Sent to You" -> "Accepted/Negotiating" -> "Order Confirmed".
- Completed: green check. Current: blue pulsing ring. Future: gray.

**Line items table (when quote is ready):**
- Columns: "#", "Product" (bilingual), "Qty" (Geist Mono), "UOM", "Unit Price" (Geist Mono), "Line Total" (Geist Mono).
- Currency formatted per locale: "EGP 56.40" (EN) / "٥٦٫٤٠ ج.م" (AR).
- Per-line counter link if enabled.

**Subtotals section:**
- Subtotal: Geist Mono 14px.
- Delivery fee: as line item. If free: "(Free)" in `var(--color-success)`.
- VAT (14%): Geist Mono 14px.
- **Total (VAT inclusive):** Geist Mono 18px, Inter 700 for label. `var(--color-text)`.
- All amounts right-aligned (end-aligned in logical terms).
- Payment terms: highlighted box — `var(--color-surface)` bg, rounded-lg, p-12px. Inter 400 14px.
- Price disclaimer: "Prices valid until {date}. Subject to supplier cost changes for volatile materials." Inter 400 12px `var(--color-text-muted)`, italic.

**Action buttons (sticky bottom bar when quote is "Sent"):**

1. **"Accept Quote"** (green bg, flex-1):
   - Confirmation modal: "Accept this quote?" with total, payment terms, "This will create an order."
   - On confirm: POST `acceptQuote()`. Brief confetti animation. View updates to Order tracking. Toast: "Order confirmed!"

2. **"Counter-Offer"** (yellow/warning outline, height 48px, px-24px, rounded-lg):
   - Options: "Counter on total" (single discount input — React Aria `NumberField`, suffix "%") OR "Counter per line" (enables inline price editing in the table — click price cell -> becomes input, changed cells highlight amber).
   - Floating "changes bar" at bottom of table: "{N} items modified" + `[Discard]` + `[Submit Counter-Offer]`. Updates in real-time as user edits prices.
   - Volume counter: "I'll order {X} instead of {Y}" with quantity fields that recalculate.
   - Delivery terms: checkbox "I'll arrange my own pickup (reduce price)".
   - Notes: TextArea for Arabic free-text negotiation notes.
   - "Submit Counter-Offer" button (blue, 44px). Confirmation modal: "Submit counter-offer? HyperQuote will review and respond." On submit: creates new quote version. Status -> "Negotiating". Toast: "Counter-offer submitted."

3. **"Partial Accept"** (blue outline, height 48px, px-24px, rounded-lg):
   - Per-line item buttons appear: `[Accept]` `[Reject]` `[Negotiate]`.
   - Accept: locks line, green checkmark, row grays out.
   - Reject: strikethrough + reason dropdown (Too expensive / Not needed / Found alternative / Other).
   - Negotiate: inline price edit for that line (amber highlight).
   - Summary bar updates live: "8 accepted, 2 rejected, 4 pending".
   - `[Submit Partial Response]` available when all lines have a decision.

4. **"Decline"** (red outline, height 48px, px-24px, rounded-lg):
   - Confirmation modal: "Decline this quote?" + optional reason dropdown (React Aria `Select`, options: "Price too high", "Found alternative", "Project cancelled", "Other") + optional notes TextArea. "Cancel" + "Decline" (red). On confirm: status -> "Declined". Card updates.

**Quote version history:**
- Collapsible sections per version with diffs (changed prices highlighted, items added/removed).

**Version comparison modal (elevated glass, max-width 960px, max-height 80vh, centered):**
- Two-column layout. Left: "Version A" with dropdown selector (React Aria `Select`). Right: "Version B" with same dropdown. Defaults: A = previous version, B = current version.
- Columns compared: Product, Qty, Unit Price, Line Total, Lead Time, Notes.
- Diff rendering: changed cells amber/yellow bg (old value strikethrough Geist Mono 400 muted + new value Geist Mono 500). Added items: green-tinted bg + "NEW" badge. Removed items: red-tinted bg + strikethrough + "REMOVED" badge.
- Summary bar at top: "Total changed from EGP 245,000 to EGP 231,500 (-5.5%)" — Geist Mono for all numbers. Percentage green if decreased, red if increased.
- Mobile: stacked layout (Version A on top, Version B below) with "Swipe to compare" gesture hint.
- Close: Escape or X button. Modal uses `isKeyboardDismissDisabled` (Escape handled by hotkeys).

**Order tracking view (after acceptance — status "Order Confirmed" and beyond):**
- Order reference replaces quote reference: "ORD-2026-00015" Geist Mono.
- 5-stage progress bar: "Confirmed" -> "Being Prepared" -> "Out for Delivery" -> "Delivered" -> "Invoice Generated". Same visual as timeline but horizontal, prominent.
- Current stage details:
  - "Being Prepared": "Your order is being fulfilled by our suppliers. Expected dispatch: {date}." Lucide `Package` animation.
  - "Out for Delivery": GPS map (MapLibre GL, wrapped in ClientOnly). Shows driver location as blue dot + route line. ETA: Geist Mono 16px. "Driver: {name}" with call/WhatsApp buttons. Map height: 300px, rounded-xl, border 1px.
  - "Delivered": Proof of delivery: photo thumbnail (click to expand), signature image, delivery timestamp in Geist Mono. "View Full Delivery Report" link.
  - "Invoice Generated": link to invoice in Documents window. "View Invoice" button.
- Payment instructions (shown when order confirmed): bank details card — `var(--color-surface)` bg, rounded-xl, p-20px. Bank name, account number (Geist Mono, copyable — click to copy with Lucide `Copy` 14px), IBAN, SWIFT, reference to include. "Copy All" button (outline, 32px). WhatsApp message: "These details were also sent to your WhatsApp."

**Mobile:** Line items table becomes card layout (one card per line item with stacked label:value pairs). Action buttons become fixed bottom bar full width. Map fills full width. Counter-offer in full-screen sub-view.

### Database Tables

**quotes:**
```sql
CREATE TABLE quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  quote_number TEXT NOT NULL,
  quote_request_id UUID REFERENCES quote_requests(id),
  customer_id UUID NOT NULL REFERENCES customers(id),
  project_id UUID REFERENCES projects(id),
  version_number INTEGER DEFAULT 1,
  previous_version_id UUID REFERENCES quotes(id),
  status quote_status DEFAULT 'draft',
  subtotal DECIMAL(15,2) DEFAULT 0,
  tax_amount DECIMAL(15,2) DEFAULT 0,
  delivery_fee DECIMAL(15,2) DEFAULT 0,
  discount_amount DECIMAL(15,2) DEFAULT 0,
  total DECIMAL(15,2) DEFAULT 0,
  margin_percent DECIMAL(5,2),
  margin_amount DECIMAL(15,2),
  currency TEXT DEFAULT 'EGP',
  payment_terms payment_terms,
  validity_days INTEGER DEFAULT 30,
  valid_until DATE,
  -- ... (full table in BACKEND.md Section 3.5)
  UNIQUE (tenant_id, quote_number)
);
```

**quote_items:**
```sql
CREATE TABLE quote_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  product_name TEXT NOT NULL,
  quantity DECIMAL(12,3) NOT NULL,
  unit_of_measure unit_of_measure NOT NULL,
  unit_price DECIMAL(12,4) NOT NULL,
  line_total DECIMAL(15,2) NOT NULL,
  margin_percent DECIMAL(5,2),
  customer_counter_price DECIMAL(15,4),
  line_status TEXT DEFAULT 'pending',
  is_accepted BOOLEAN,
  sort_order INTEGER DEFAULT 0,
  -- ... (full table in BACKEND.md Section 3.5)
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Server Functions

| Function | Method | Input | Output | Auth |
|---|---|---|---|---|
| `acceptQuote` | POST | `{ quoteId }` | `{ orderId, status }` | customer (owner) |
| `rejectQuote` | POST | `{ quoteId, reason? }` | `{ success }` | customer (owner) |
| `submitCounterOffer` | POST | `{ quoteId, counterType, lineItems?, totalDiscount?, notes? }` | `{ quoteVersionId }` | customer |
| `submitPartialResponse` | POST | `{ quoteId, lineResponses[] }` | `{ success }` | customer |

### Key Trigger: on_quote_accepted()

When quote status -> 'accepted':
1. Creates Order (copies from quote)
2. Copies quote items to order items
3. Tier 4 auto-bypass: sets payment_instrument_verified = TRUE, Net 30 terms
4. Generates Proforma Invoice with wire instructions from company_bank_accounts
5. Copies line items to invoice_items

### State Machine Transitions

**Quote states:** draft -> internal_review -> pending_approval -> approved -> sent -> viewed -> negotiating -> revised -> accepted/declined/expired/cancelled
- Customer can only update quotes in 'sent' status to 'accepted' or 'rejected'
- 'negotiating' -> 'revised' creates new version
- 'accepted' is terminal (triggers order creation)

### RLS Policies

```sql
CREATE POLICY quotes_customer_select ON public.quotes
  FOR SELECT TO authenticated
  USING (
    (SELECT is_external_user())
    AND customer_id = (SELECT current_customer_id())
    AND status IN ('sent', 'accepted', 'rejected', 'expired')
  );

CREATE POLICY quotes_customer_update ON public.quotes
  FOR UPDATE TO authenticated
  USING (
    (SELECT is_external_user())
    AND customer_id = (SELECT current_customer_id())
    AND status = 'sent'
  )
  WITH CHECK (status IN ('accepted', 'rejected'));
```

## Non-Negotiable Rules

1. **Geist Mono for ALL numbers.** Prices, quantities, dates, reference numbers, VAT amounts, totals.
2. **Three colors only.** White, Black, Blue. Status colors (green for accept, red for decline) are data-semantic only.
3. **`ClientOnly` for maps.** MapLibre GL in the order tracking GPS view must be wrapped in `ClientOnly`.
4. **`isKeyboardDismissDisabled` on Dialogs.** Confirmation modals use React Aria Dialog with this prop.
5. **React Aria Components** for all interactive elements (Tabs, Dialog, Select, NumberField, etc.).
6. **VAT is 14%** on all invoices. Always shown as separate line.
7. **Proforma invoice sent immediately on acceptance** (before payment instrument selection).
8. **Tier 4 customers skip payment instrument screen** (auto-bypass).

## Known Risks & Gotchas

- **Status badge colors must match SM.8 cross-app mapping** (see DS.11 in FRONTEND.md).
- **Version comparison modal** needs `isKeyboardDismissDisabled` — Escape handled by hotkeys.
- **Proforma invoice auto-generation** is a database trigger, not a UI action. The UI just calls `acceptQuote()`.
- **Counter-offer creates a new quote version** — the old version is archived, not modified.
- **Partial acceptance** results in accepted items forming one order; declined items die or become a new quote request.

## Tips

- Proforma invoice sent immediately on acceptance (before payment instrument)
- Tier 4 customers skip payment instrument screen (auto-bypass)
- Status badge colors per SM.8 cross-app mapping
- Build order: migration -> server function -> TanStack Query hook -> component -> i18n keys
