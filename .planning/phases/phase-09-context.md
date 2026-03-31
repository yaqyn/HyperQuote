# Phase 9: Portal Material List Builder + Quote Submission

## Goal
Customers can build a material list using any of 4 input methods and submit it for quoting, with buyer-side approval workflows for team accounts.

## Dependencies
- Phase 7 (Portal Auth + Shell) must be complete — spatial canvas, glass windows, auth gate working
- Phase 8 (Portal AI Chat) should be complete for the "AI Assist" input method
- Database tables: `quote_requests`, `quote_request_items`, `addresses`, `projects`, `products` must exist (from Phase 2 + earlier migrations)

## Requirements

**PORT-04: Material list builder** — 3-step flow (Build -> Details -> Review), 4 input methods (Search & Add, CSV/Excel upload, Quick Pad, AI Assist), auto-save drafts.

**PORT-13: Buyer-side approval workflows** — submit for approval action, approver notification, pending approvals tab (research gap identified).

## Success Criteria
1. All 4 input methods work: Search & Add, CSV/Excel upload (handles messy files), Quick Pad, AI Assist
2. 3-step flow (Build -> Details -> Review) completes and creates a quote_request in the database
3. Auto-save preserves draft every 30 seconds; returning user sees their in-progress list
4. Buyer with "approver" role receives notification when team member submits; pending approvals tab shows actionable items
5. Delivery address ComboBox loads saved addresses and auto-expands new address form for first-time users

## What to Build
- 3-step flow: Build List -> Details -> Review & Submit
- 4 input methods: Search & Add, Upload (CSV/Excel), Quick Pad, AI Assist
- Product list table with drag reorder, quantity editing, notes
- Delivery address (ComboBox with saved addresses, auto-expand for first-time)
- Date picker (business days only — no Friday/Saturday)
- File attachments (drawings/specs)
- Server functions: `submitQuoteRequest()`, `parseUploadedFile()`, `parseWithAI()`, `saveDraft()`
- Supabase migration: `quote_requests`, `quote_request_items`, `customer_addresses`, `projects` tables

## Spec References

### FRONTEND.md Section 2.6 — Material List Builder (Customer View)

**URL:** `/orders/new` (within Orders window)
**Accessed from:** "New Quote Request" button in Orders window, "Submit as Quote" from AI chat, "Reorder" from history.

**This is the core product action — building a list of materials to request a quote.**

**Layout within Orders window (replaces tab content):**
- Back button at top: "< Back to Orders" (Lucide `ArrowLeft` + text, Inter 500 14px `var(--color-text-muted)`). Returns to Orders tab view.
- Window header updates: title becomes "New Quote Request" with a step indicator.

**Step indicator (top, below header):**
- 3 steps: "Build List" -> "Details" -> "Review". Horizontal bar with circles.
- Each step: 24px circle with step number (Geist Mono 12px). Active: `var(--color-primary)` bg, white text. Completed: `var(--color-success)` bg, white Lucide `Check` 14px. Upcoming: `var(--color-border)` bg, `var(--color-text-muted)`.
- Connecting line between steps: 2px, `var(--color-primary)` for completed, `var(--color-border)` for upcoming.

**Step 1 — Build List:**

**Input methods (tab-like selector at top):**
- React Aria `Tabs`, compact. Options: "Search & Add" (default), "Upload", "Quick Pad", "AI Assist".

**Method 1 — Search & Add (default):**
- Search field: full width, height 44px, React Aria `ComboBox` with `Autocomplete`. Placeholder: "Search for materials...". Lucide `Search` 16px inline-start.
- As user types (debounced 150ms): dropdown of matching products. Each item in dropdown: product name (Inter 400 14px) + category badge + availability dot. Max 8 results visible, scrollable.
- On select: product added to the list below with default quantity 1. Focus moves to quantity field of the newly added item.
- Product list table:
  - Columns: "#" (row number, Geist Mono 12px), "Product" (name + SKU), "Qty" (editable NumberField), "UOM" (read-only label), "Notes" (optional TextField, compact), "Actions" (delete button).
  - Each row: height 52px. Border-bottom 1px `var(--color-border)`.
  - Quantity field: React Aria `NumberField`, 80px width, height 36px, Geist Mono. Min 1. Step varies by product UOM.
  - Notes field: React Aria `TextField`, 160px width, height 36px. Placeholder: "Optional notes". For specs like "Grade 43" or "OPC Type I".
  - Delete: Lucide `Trash2` 16px, `var(--color-text-muted)`, hover `var(--color-error)`. On click: row removed immediately (no confirmation). Tween fade-out.
  - Row drag handle (Lucide `GripVertical` 16px, `var(--color-text-subtle)`) at inline-start for reordering via React Aria `useDrag`/`useDrop`.

**Method 2 — Upload:**
- Drag-and-drop zone: 200px height, border 2px dashed `var(--color-border)`, rounded-xl, centered content.
  - Lucide `Upload` 32px `var(--color-text-subtle)`.
  - "Drop your file here or click to browse" — Inter 400 14px `var(--color-text-muted)`.
  - "Supports: CSV, Excel (.xlsx), PDF" — Inter 400 12px `var(--color-text-subtle)`.
- Processing state: file icon + filename + progress bar (NOT a spinner), Geist Mono percentage. "Parsing your file..."
- Validation tiers (all errors shown at once, never fail on first error):
  - Format validation, cross-field validation, database validation.
- Error table shows ALL errors: row number, field name, value found, what expected. Inline correction without re-upload.
- Progress text: "247 of 250 items validated successfully. 3 need attention."
- `[Fix & Continue]` (edit in place) and `[Re-upload]` (start over) options.
- On success: parsed items populate the product list table. Items the system couldn't match show a yellow warning badge "Unmatched — please verify" with a dropdown to manually select the correct product.
- On failure: error message with retry. "Could not parse this file. Try CSV or Excel format."
- Support messy real-world files: UTF-8 with/without BOM, auto-detect delimiters (comma/semicolon/tab), handle .xlsx renamed to .csv gracefully.
- "Download Template" link: below the drop zone. Downloads a CSV template with column headers (Product Name, SKU, Quantity, UOM, Notes).

**Method 3 — Quick Pad:**
- Spreadsheet-style grid optimized for power users who have a written list. 2 columns: SKU/name input (React Aria `ComboBox`, 60% width) + Quantity input (React Aria `NumberField`, 20% width) + UOM display (20% width, auto-populated).
- 10 empty rows shown by default. As user fills rows, more empty rows appear at bottom.
- Tab key advances: SKU -> auto-populate product name/unit/stock -> Qty -> next row's SKU (skip auto-populated fields). Shift+Tab moves backward.
- Enter adds one item. Ctrl+Enter adds all valid items at once.
- Multi-SKU paste mode: paste one per line or tab/comma-separated from spreadsheet.
- Real-time SKU validation (300ms debounce). Invalid SKU: red border + inline error.

**Method 4 — AI Assist:**
- Large textarea (6 rows). "Parse with AI" button. AI parses into structured items.
- AI can ask clarifying questions inline.

**Project assignment:** React Aria `ComboBox` with create option. Lists existing projects.

**Step 2 — Details:**
- Delivery address: React Aria `ComboBox`. Lists saved addresses. "Add New Address" expands inline fields.
- **First-time behavior:** If zero saved addresses, ComboBox hidden, "Add New Address" auto-expands.
- Preferred delivery date: React Aria `DatePicker`. Min: tomorrow. Business day validation (not Friday/Saturday).
- Notes: TextArea. File attachments: max 5 files, 10MB each.

**Step 3 — Review & Submit:**
- Full summary displayed:
  - Item list (read-only table): Product, Qty, UOM, Notes. Geist Mono for all numeric columns.
  - Delivery details: address, date, notes.
  - Attached files listed.
  - Project name if assigned.
- "Edit" links next to each section (Lucide `Pencil` 14px + "Edit" text, `var(--color-primary)`). Clicking navigates back to the relevant step.
- "Prices are not shown here. We'll prepare a quote for you." — blue info banner (`var(--color-info-bg)`, `var(--color-info)` text, rounded-lg, p-12px).
- "Submit Quote Request" button: full width max 400px, centered, blue bg, white text, Inter 600 16px, height 52px, rounded-xl. Shadow-sm.
  - On click: Confirmation modal (elevated glass): "Submit quote request for {N} items?" + "We'll prepare your quote within 4 hours." + "Cancel" (outline, 40px) + "Submit" (blue, 40px).
  - On submit: POST `submitQuoteRequest()`. Submit button shows "Submitting..." Skeleton loader replaces form.
  - On success: full confirmation view:
    - Lucide `CheckCircle` 48px `var(--color-success)`. Spring animation.
    - "Quote Request Submitted!" — Inter 700 24px.
    - "Reference: QR-2026-{XXXXX}" — Geist Mono 16px `var(--color-primary)`.
    - "We'll have your quote ready within 4 hours. You'll receive a notification on WhatsApp." — Inter 400 14px muted.
    - "Track Quote" button (blue, 44px) — opens the quote in the Active tab.
    - "Back to Orders" link.
  - On error: error toast "Failed to submit. Please try again." Button re-enables.

**Mobile:** Full-screen flow. Product list table becomes card layout (one card per item with stacked fields). Quick Pad shows one row at a time. Upload area larger (easier to tap). Step indicator is compact (numbers only, no labels).

### Database Tables (from BACKEND.md)

**quote_requests:**
```sql
CREATE TABLE quote_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  request_number TEXT NOT NULL,
  customer_id UUID NOT NULL REFERENCES customers(id),
  project_id UUID REFERENCES projects(id),
  delivery_address_id UUID REFERENCES addresses(id),
  requested_delivery_date DATE,
  urgency urgency DEFAULT 'standard',
  sla_deadline TIMESTAMPTZ,
  status quote_request_status DEFAULT 'draft',
  assigned_to UUID REFERENCES employees(id),
  hold_reason TEXT,
  rejection_reason TEXT,
  source TEXT DEFAULT 'portal',
  notes TEXT,
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  priority_score DECIMAL(5,2),
  estimated_value DECIMAL(15,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, request_number)
);
```

**quote_request_items:**
```sql
CREATE TABLE quote_request_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_request_id UUID NOT NULL REFERENCES quote_requests(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  customer_description TEXT NOT NULL,
  specifications TEXT,
  quantity DECIMAL(12,3) NOT NULL,
  unit_of_measure unit_of_measure,
  matched_product_name TEXT,
  match_confidence DECIMAL(5,2),
  is_available BOOLEAN,
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Server Functions

| Function | Method | Input | Output | Auth |
|---|---|---|---|---|
| `submitQuoteRequest` | POST | `{ items, deliveryAddressId, deliveryDate, notes?, attachments, projectId? }` | `{ requestId, reference }` | customer |
| `saveDraft` | POST | `{ items, deliveryAddressId?, notes? }` | `{ draftId }` | customer |
| `parseUploadedFile` | POST | `{ fileUrl, fileType }` | `{ parsedItems[] }` | customer |
| `parseWithAI` | POST | `{ text }` | `{ parsedItems[] }` | customer |
| `addToQuoteDraft` | POST | `{ productId, quantity, unit }` | `{ draftId, itemId }` | customer |

### RLS Policies

```sql
CREATE POLICY qr_customer_insert ON public.quote_requests
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT is_external_user()) AND customer_id = (SELECT current_customer_id()));

CREATE POLICY qr_customer_update ON public.quote_requests
  FOR UPDATE TO authenticated
  USING (
    (SELECT is_external_user())
    AND customer_id = (SELECT current_customer_id())
    AND status IN ('draft', 'submitted')
  );
```

## Non-Negotiable Rules

1. **React Aria Components, NOT shadcn.** All interactive elements (ComboBox, NumberField, DatePicker, Tabs, TextArea, etc.) use `react-aria-components`.
2. **`useWatch()`, NEVER `watch()`.** React Hook Form's `watch()` is broken with React 19.
3. **Geist Mono for ALL numbers.** Quantities, item counts, dates in the step indicator.
4. **Three colors only.** White, Black, Blue. Semantic status colors for data only.
5. **Spatial glass, not dashboards.** The material list builder lives INSIDE a glass window.
6. **Arabic-Indic numerals** when locale is Arabic. All quantities, item counts, reference numbers.
7. **ALL units -> Arabic translations.** kg -> كجم, ton -> طن, etc.
8. **Colors in `:root {}`, NEVER in `@theme`.**
9. **Business day validation.** Egyptian weekend is Friday + Saturday. Delivery dates cannot fall on weekend or public holidays.

## Known Risks & Gotchas

- **CSV upload must handle messy files:** UTF-8 BOM, auto-detect delimiters, .xlsx renamed to .csv.
- **All errors shown at once** — never fail on first error for upload validation.
- **Auto-save draft every 30 seconds** to localStorage, not just server. Server save is secondary.
- **First address auto-expand:** If customer has zero saved addresses, skip the ComboBox and auto-expand the address form.
- **React Aria DatePicker:** min/max constraints enforced. Business day validation: Friday/Saturday flagged.
- **0.x packages:** @tanstack/ai (for AI Assist method) is 0.x — wrap behind abstraction.
- **Motion Popover race condition (#9158):** Use CSS transitions for popovers/menus, Motion only for modals.

## Tips

- CSV upload: support messy files (UTF-8 BOM, auto-detect delimiters, .xlsx renamed to .csv)
- All errors shown at once, never fail on first error
- Auto-save draft every 30 seconds to localStorage
- First address: auto-expand new address form if customer has zero saved addresses
- Product search uses fuse.js client-side + server fallback
- Build order: migration -> server function -> TanStack Query hook -> React component -> i18n keys
