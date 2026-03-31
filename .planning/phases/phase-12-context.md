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
- Table (React Aria Table): Product (bilingual), SKU (Geist Mono), Current Price (Geist Mono, editable), Stock Qty (Geist Mono, editable), Last Updated (Geist Mono, relative time), Status badge, Actions.
- Editable cells: click -> inline NumberField. On blur/Enter: saves immediately via PATCH. Success: cell flashes green for 500ms. Error: revert + toast.
- Freshness color coding: < 24h green, 1-3 days yellow, > 3 days red.
- Pagination: 50 per page.

**Product edit drawer:** slides from inline-end, 480px width, elevated glass. Fields: Price, MOQ, Stock qty, Lead time, Region pricing, Notes.

**Upload Catalog flow:**
1. Upload modal (elevated glass): drag-and-drop, PDF/Excel/CSV, max 50MB.
2. Processing: "AI is parsing your catalog..."
3. Review: two-column (original document + extracted data with confidence scores). High >90% green, Medium 70-90% yellow, Low <70% red. Editable.
4. "Submit for Review" -> trusted suppliers auto-approved.

**Bulk Update flow:**
1. Download current prices as CSV.
2. Upload modified CSV.
3. Diff preview: changed values highlighted (old -> new). Unchanged grayed.
4. "Apply Changes" with confirmation.

### FRONTEND.md Section 2.12 — Purchase Orders Inbox

**URL:** `/supplier/orders`. Tabs: "Pending Action", "Confirmed", "History".

**Pending Action:** PO cards sorted by urgency (oldest first). Each: PO reference (Geist Mono), status badge, date received, response deadline (color-coded), items summary.

**PO Detail:** Back button, header, line items table with per-line confirm checkbox. If cannot fulfill: reason dropdown (Out of Stock, Partial Only, Price Changed, Lead Time Needed). If partial: quantity field. If price changed: new price field. Delivery scheduling: ship date (DatePicker), method (Supplier Delivers/HyperQuote Pickup), tracking number, notes.

Actions: "Confirm PO" (green, confirmation modal) and "Reject PO" (red, requires reason).

**Confirmed tab:** PO cards with "Update Status" and "Submit Invoice" buttons.

### FRONTEND.md Section 2.13 — Invoice Submission

**URL:** `/supplier/invoices`. Tabs: "Submit New", "Submitted Invoices".

**Submit New:** Form with Related PO (ComboBox), Invoice number, Invoice date, Line items (auto-populated, editable prices), Subtotal/VAT/Total (calculated, Geist Mono), Invoice PDF upload (required). Validation: total matches within 1% tolerance.

**Submitted Invoices:** Table with status badges (Submitted, Under Review, Approved, Paid, Disputed).

### FRONTEND.md Section 2.14 — Analytics Window

**URL:** `/supplier/analytics`. Date range picker.

4 KPI cards: Revenue, Fill Rate, On-Time Rate, Quote Inclusion. Each with trend arrow.
Product performance table: Product, Views, Quote Inclusions, POs, Revenue, Win Rate.
Monthly revenue chart placeholder (bar chart).

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
