# Phase 12: Supplier Portal

## Goal
Suppliers can manage their catalog, respond to POs, submit invoices, and track their performance — all within the same portal app via role toggle.

## Dependencies
- Phase 7 (Portal Auth + Shell) must be complete — role toggle, glass windows
- Database tables: `suppliers`, `supplier_contacts`, `source_inventory`, `supplier_pos`, `supplier_po_items`, `supplier_invoices`, `products`, `product_suppliers` must exist

## Requirements

- **SUPP-01**: Supplier role toggle — switches canvas, navigation buttons, AI context
- **SUPP-02**: Stock & Pricing — product table with inline edit (price + qty), freshness color coding, bulk CSV update with diff preview
- **SUPP-03**: Catalog upload — drag-and-drop (PDF/Excel/CSV), AI parsing with confidence scores, side-by-side review, submit for approval
- **SUPP-04**: PO inbox — pending/confirmed/history tabs, per-PO confirm/reject with per-line actions, delivery scheduling
- **SUPP-05**: Invoice submission — auto-populate from confirmed PO, PDF upload, three-way match validation
- **SUPP-06**: Analytics — KPIs (revenue, fill rate, on-time rate, quote inclusion), product performance table, monthly revenue chart

## Success Criteria
1. Role toggle switches canvas, navigation buttons, and AI context between customer and supplier views
2. Stock & Pricing table supports inline edit (price + qty) with freshness color coding, plus bulk CSV update with diff preview
3. Catalog upload accepts drag-and-drop (PDF/Excel/CSV), AI parses with confidence scores, and side-by-side review works
4. PO inbox shows pending/confirmed/history tabs with per-PO confirm/reject and per-line actions
5. Analytics dashboard shows KPIs (revenue, fill rate, on-time rate) and monthly revenue chart

## What to Build
- Supplier role toggle switches view
- Stock & Pricing: product grid with inline edit, bulk CSV upload, AI catalog parsing
- PO Inbox: list with status filters, confirm/reject per PO, per-line actions
- Invoice Submission: auto-populate from confirmed PO, file upload
- Analytics: KPIs (orders, revenue, response time), top products chart
- Server functions: `updateSupplierStock()`, `confirmPO()`, `rejectPO()`, `submitSupplierInvoice()`, `uploadCatalog()`, `bulkUpdatePrices()`, `getSupplierAnalytics()`

## Spec References

### FRONTEND.md Section 2.10 — Supplier View Overview

When user toggles to Supplier mode, canvas updates:
- AI Chat context switches to supplier prompts: "Update my cement prices", "Show my pending POs"
- Navigation buttons change to: "Stock & Pricing" (Package icon), "Purchase Orders" (ClipboardList, badge with pending count), "Analytics" (BarChart3)
- Profile popover adds: "Invoice Submission", "Catalog Upload", "Quality Requirements"
- Keyboard shortcuts: S=Stock, P=Purchase Orders, A=Analytics

### FRONTEND.md Section 2.11 — Stock & Pricing Window

**URL:** `/supplier/stock`. Glass window with tabs: "My Products", "Price Updates", "Upload History".

**My Products tab:**
- Table (React Aria Table): Product (bilingual), SKU (Geist Mono), Current Price (Geist Mono, editable), Stock Qty (Geist Mono, editable), Last Updated (Geist Mono, relative time), Status badge ("Active" green, "Low Stock" yellow, "Out of Stock" red, "Suppressed" gray), Actions.
- Actions column: "Edit" (Lucide `Pencil` 16px) opens product edit drawer. "Deactivate" (Lucide `EyeOff` 16px) toggles product visibility.
- Editable cells: click -> inline NumberField. On blur/Enter: saves immediately via PATCH. Success: cell flashes `var(--color-success-bg)` for 500ms. Error: revert + toast.
- Freshness color coding on "Last Updated": < 24h green, 1-3 days yellow, > 3 days red.
- Pagination: 50 per page.
- **Empty state:** "You haven't added any products yet." + "Upload Catalog" button (blue, 44px) + "Or add products manually" link that opens product edit drawer with empty fields.

**Product edit drawer:** slides from inline-end, 480px width, elevated glass. Fields: Product name (read-only — name changes require HyperQuote review), Price (NumberField, required, currency prefix/suffix per locale), Minimum Order Quantity (NumberField), Stock quantity (NumberField), Lead time (NumberField + "days" label, "if made-to-order" qualifier), Region pricing (if multiple regions, a table of region -> price), Notes (TextArea). "Save" button (blue, 44px, full width). "Cancel" closes drawer.

**Price Updates tab:**
- History of all price changes. Table: Product, Old Price (Geist Mono, strikethrough), New Price (Geist Mono), Changed By, Date (Geist Mono), Status (badge: "Applied", "Pending Review", "Rejected").
- Filter by date range.
- For "Pending Review" items: note explaining why review is needed ("New supplier — first 3 months require price review").

**Upload History tab:**
- List of catalog uploads. Each: filename, date (Geist Mono), items parsed count (Geist Mono), status (badge: "Processing", "Completed", "Failed", "Review Required").
- Click to see details: opens side-by-side view of original document + extracted data.

**Upload Catalog flow:**
1. Upload modal (elevated glass): drag-and-drop, PDF/Excel/CSV, max 50MB.
2. Processing: "AI is parsing your catalog..."
3. Review: two-column (original document + extracted data with confidence scores). High >90% green, Medium 70-90% yellow, Low <70% red. Editable.
4. "Submit for Review" -> trusted suppliers auto-approved.

**Bulk Update flow:**
1. Download current prices as CSV.
2. Upload modified CSV.
3. Diff preview: changed values highlighted (old -> new, red -> green). Unchanged rows grayed out.
4. "Apply Changes" with confirmation: "Update {N} prices and {M} stock quantities?"

### FRONTEND.md Section 2.12 — Purchase Orders Inbox

**URL:** `/supplier/orders`. Tabs: "Pending Action", "Confirmed", "History".

**Pending Action:** PO cards sorted by urgency (oldest first). Each: PO reference (Geist Mono), status badge, date received, response deadline (color-coded), items summary.

**PO Detail:** Back button, header (PO reference, date, status, from "HyperQuote"), line items table: "#", "Product", "Qty Requested" (Geist Mono), "Unit Price" (Geist Mono), "Line Total" (Geist Mono), "Confirm" (per-line toggle).
- Each line: confirm checkbox (React Aria `Checkbox`). If supplier cannot fulfill: uncheck + "Reason" dropdown appears (Select: "Out of Stock", "Partial Only", "Price Changed", "Lead Time Needed").
- If "Partial Only": quantity field appears (NumberField, max = requested qty).
- If "Price Changed": new price field appears (NumberField) + "Requires HyperQuote review".
- Delivery scheduling: estimated ship date (React Aria `DatePicker`, required), delivery method (Select: "Supplier Delivers" / "HyperQuote Pickup"), tracking number (TextField, optional), notes (TextArea).

Actions (sticky bottom):
- "Confirm PO" (green, 48px, flex-1): confirmation modal "Confirm {N} of {M} items? {partial details}." + "Cancel" / "Confirm" (green). On success: status -> "Confirmed". Toast: "PO confirmed."
- "Reject PO" (red outline, 48px, px-24px): requires reason — TextArea in confirmation modal: "Why are you rejecting this PO? This will be reviewed by HyperQuote." On submit: status -> "Rejected". Toast: "PO rejected. HyperQuote has been notified."

**Confirmed tab:** PO cards with status "Confirmed" / "In Production" / "Shipped". Each shows ship date, tracking number, delivery progress. "Update Status" button: dropdown to advance status ("Shipped" -> enter tracking number, "Delivered" -> add delivery note). "Submit Invoice" button: opens Invoice Submission flow (2.13).

### FRONTEND.md Section 2.13 — Invoice Submission

**URL:** `/supplier/invoices`. Tabs: "Submit New", "Submitted Invoices".

**Submit New:** Form (React Hook Form + Zod): Related PO (React Aria `ComboBox`, lists confirmed/shipped POs without invoices, required), Invoice number (TextField, required, supplier's own number, Geist Mono), Invoice date (DatePicker, default today, required), Line items (auto-populated from PO, editable prices), Subtotal/VAT (14%)/Total (calculated, Geist Mono 18px bold), Invoice PDF upload (required, "Upload your invoice (PDF)" drag-and-drop, max 10MB), Notes (TextArea, optional). Validation: total matches within 1% tolerance — if mismatch: warning "Your total doesn't match the calculated total. Please verify."

**Submitted Invoices:** Table with status badges (Submitted, Under Review, Approved, Paid, Disputed).

### FRONTEND.md Section 2.14 — Analytics Window

**URL:** `/supplier/analytics`. Date range picker.

**KPI cards (top row, 4 cards across, 2x2 on mobile):**
- Each card: bg `var(--color-surface)`, rounded-xl, p-20px. Min-width 200px.
  - KPI label: Inter 500 12px `var(--color-text-muted)`, uppercase, letter-spacing 0.05em.
  - KPI value: Geist Mono 600, 28px, `var(--color-text)`.
  - Trend indicator: small arrow (Lucide `TrendingUp` or `TrendingDown` 14px) + percentage (Geist Mono 12px). Green for positive, red for negative.
  - Cards: "Revenue" (total PO value), "Fill Rate" (% of PO lines confirmed), "On-Time Rate" (% delivered by promised date), "Quote Inclusion" (% of customer quotes that include supplier's products).

**Product performance table:** Columns: Product, Views (Geist Mono), Quote Inclusions (Geist Mono), POs (Geist Mono), Revenue (Geist Mono), Win Rate (Geist Mono, percentage). Sortable. Top 20 products. "View All" expands.

**Monthly revenue chart placeholder:** bar chart, monthly totals, Geist Mono axis labels, blue bars, hover tooltip with exact values. Dimensions: full width, 300px height, rounded-xl border.

**Analytics empty state (new supplier, no data):** "No analytics data yet." + "Analytics will appear after your first confirmed purchase order." + icon Lucide `BarChart3` 48px muted.

### Supplier Keyboard Shortcuts (when supplier mode active)
- `S` — Stock & Pricing window
- `P` — Purchase Orders window
- `A` — Analytics window

### Mobile Adaptation (Supplier)
- Tables become card lists. Editable fields: tap to edit (opens inline). Edit drawer becomes full-screen. Upload flow same but upload area larger.

### Database Tables

**source_inventory:**
```sql
CREATE TABLE source_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  product_id UUID NOT NULL REFERENCES products(id),
  reported_quantity DECIMAL(15,4) NOT NULL DEFAULT 0,
  available_quantity DECIMAL(15,4) NOT NULL DEFAULT 0,
  reserved_quantity DECIMAL(15,4) NOT NULL DEFAULT 0,
  unit_cost DECIMAL(15,4),
  currency TEXT DEFAULT 'EGP',
  lead_time_days INTEGER,
  min_order_quantity DECIMAL(15,4),
  last_updated_at TIMESTAMPTZ DEFAULT NOW(),
  confidence stock_confidence,
  is_suppressed BOOLEAN DEFAULT FALSE,
  UNIQUE (tenant_id, supplier_id, product_id)
);
```

**supplier_invoices:**
```sql
CREATE TABLE supplier_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  invoice_number TEXT NOT NULL,
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  supplier_po_id UUID REFERENCES supplier_pos(id),
  subtotal DECIMAL(15,2) NOT NULL,
  tax_amount DECIMAL(15,2) DEFAULT 0,
  total DECIMAL(15,2) NOT NULL,
  currency TEXT DEFAULT 'EGP',
  po_matched BOOLEAN DEFAULT FALSE,
  receipt_matched BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'received',
  due_date DATE,
  UNIQUE (tenant_id, supplier_id, invoice_number)
);
```

### Server Functions

| Function | Method | Input | Output | Auth |
|---|---|---|---|---|
| `getSupplierDashboard` | GET | `{}` | `{ pendingPOs, activeDeliveries, openPayments }` | supplier |
| `getSupplierPOs` | GET | `{ status?, page, limit }` | `{ purchaseOrders[], total }` | supplier |
| `confirmPO` | POST | `{ poId, confirmedDate, notes? }` | `{ success }` | supplier |
| `rejectPO` | POST | `{ poId, reason }` | `{ success }` | supplier |
| `updateSupplierStock` | PATCH | `{ productId, quantity?, price? }` | `{ success }` | supplier |
| `uploadCatalog` | POST | `{ fileUrl, fileType }` | `{ uploadId, status: 'processing' }` | supplier |
| `submitSupplierInvoice` | POST | `{ poId, invoiceNumber, amount, taxAmount, fileUrl }` | `{ invoiceId }` | supplier |
| `bulkUpdatePrices` | POST | `{ fileUrl }` | `{ updatedCount, errors[] }` | supplier |
| `getSupplierAnalytics` | GET | `{ period }` | `{ metrics }` | supplier |
| `uploadDeliveryNote` | POST | `{ poId, file, deliveryDate, qty }` | `{ deliveryNoteId }` | supplier (owner) | Upload to R2, notify warehouse |
| `getSupplierPayments` | GET | `{ status?, page, limit }` | `{ payments[], total }` | supplier |
| `getSupplierProducts` | GET | `{ page, limit, search? }` | `{ products[], total }` | supplier |
| `getSupplierPriceHistory` | GET | `{ productId }` | `{ history[] }` | supplier |
| `getSupplierUploadHistory` | GET | `{ page, limit }` | `{ uploads[] }` | supplier |

### RLS Policies

```sql
CREATE POLICY suppliers_external_select ON public.suppliers
  FOR SELECT TO authenticated
  USING ((SELECT is_external_user()) AND id = (SELECT current_supplier_id()));

CREATE POLICY spo_supplier_select ON public.supplier_pos
  FOR SELECT TO authenticated
  USING ((SELECT is_external_user()) AND supplier_id = (SELECT current_supplier_id()));

CREATE POLICY spo_supplier_update ON public.supplier_pos
  FOR UPDATE TO authenticated
  USING (
    (SELECT is_external_user())
    AND supplier_id = (SELECT current_supplier_id())
    AND status IN ('sent', 'acknowledged')
  );
```

## Business Rules

**Supplier Account Roles (RESEARCH.md Section 5.10c):**
Supplier accounts support 3 roles: Owner (full access), Operations (stock/POs), Finance (invoices/payments).

**Rejected Supplier Application 3-Status Model (RESEARCH.md Section 5.10c):**
Approved / Pending (fixable) / Declined (6-month wait). Always provide specific reason. Phone call for declined (Egyptian business culture).

**Non-Technical Supplier Onboarding 3 Tiers (RESEARCH.md Section 3.3):**
- Tier 1: WhatsApp-only (AI parses free text)
- Tier 2: Simplified portal (magic link, reduced UI)
- Tier 3: Full portal + API

## Non-Negotiable Rules

1. **React Aria Components** for all UI. Inline edit uses React Aria NumberField.
2. **Geist Mono for ALL numbers.** Prices, quantities, PO references, dates, KPIs.
3. **Three colors only.** Freshness colors (green/yellow/red) are data-semantic only.
4. **Glass windows, not dashboards.** All supplier views are glass windows over the spatial canvas.
5. **AI catalog parsing** uses 0.x packages — wrap behind abstraction.
6. **Supplier never sees customer name** — PO anonymization via `coded_delivery_reference`.
7. **Arabic-Indic numerals** in Arabic context.

## Known Risks & Gotchas

- **Inline table editing** needs careful focus management with React Aria.
- **Catalog AI parsing** (Mistral OCR + Groq) is async — queue via Cloudflare Queue.
- **Confidence scores** drive the review UI: high auto-approved, medium needs verification, low needs manual input.
- **Three-way match** (PO vs receipt vs invoice) validation happens server-side.
- **Stock freshness** (`confidence` field on `source_inventory`): computed from `last_updated_at`. > 7 days = suppressed.

## Tips

- Stock edit saves immediately on blur — no "Save" button for inline edits.
- Bulk update: generate CSV from current data, user modifies, upload shows diff.
- PO anonymization: supplier POs show `coded_delivery_reference` (HQ-YYYY-NNNN) not customer name.
- Catalog upload is async — show processing state, poll for completion.
