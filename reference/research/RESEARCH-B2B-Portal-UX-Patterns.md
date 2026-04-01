# B2B Portal & Marketplace UX Patterns Research

> Research date: March 2026
> Scope: Functional UX patterns for a building materials platform (visual style excluded -- spatial glass design already decided)
> Sources: McMaster-Carr, Grainger, Adobe Commerce B2B, OroCommerce, Linear, Raycast, Baymard Institute, Nielsen Norman Group, and others

---

## 1. Material List Builder UX

### 1A. Search-and-Add Autocomplete (McMaster-Carr Model)

McMaster-Carr is the gold standard for B2B product search. Their pattern:

**Step-by-step flow:**
1. User focuses search input (always visible in header, never hidden behind an icon)
2. User types a general term (e.g., "cement" or "rebar")
3. Autocomplete dropdown appears INSTANTLY showing suggested categories tied to actual inventory -- not generic suggestions, but real available products
4. Product images update in real-time on the page AS the user types -- no page reload, no submit button needed
5. User selects a subcategory from suggestions (e.g., "Portland Cement Type II")
6. Left sidebar shows specification-based filters: size, grade, weight, certifications
7. User narrows via filters until specific products appear in a specification table
8. User enters quantity and adds to cart/quote directly from the table row

**Key technical patterns:**
- Server-side rendering for instant initial load
- Prefetching on hover: when user hovers a link, the browser pre-fetches that page so click feels instant
- Aggressive CDN caching for product data
- Minimal JavaScript -- no heavy frameworks, selective script loading per page
- Fixed-width image containers to prevent layout shift
- Grayscale product images to reduce visual noise and keep focus on specifications

**What to adopt:** The instant-filter-to-result flow. Users should never land on a "search results page" -- they should progressively narrow FROM categories TO specifications TO products.

### 1B. CSV Upload for Bulk Material Lists

**Standard 4-step flow (industry best practice):**

| Step | Screen | Key Elements |
|------|--------|-------------|
| 1. Upload | File drop zone | Drag-and-drop area + file picker button. Show accepted formats (.csv, .xlsx). Show max row limit. Provide "Download Template" link prominently |
| 2. Header Selection | Preview table | Show first 5 rows of uploaded file. Let user confirm which row is the header row (sometimes row 1, sometimes row 2). Skip this if format is standardized |
| 3. Column Mapping | Two-column mapper | Left: detected CSV columns. Right: system fields (Product Name, SKU, Quantity, Unit, Notes). Auto-suggest mappings via fuzzy matching on header names. Allow "Skip this column" option |
| 4. Validation & Review | Error table | Show ALL errors at once (never fail on first error). Each error row shows: row number, field name, value found, what was expected. Allow inline correction without re-upload |

**Validation tiers:**
- **Format validation:** Is the quantity a number? Is the unit recognized? Is the date formatted correctly?
- **Cross-field validation:** Does the quantity match the unit type? (e.g., "5 tons" not "5 pieces" for cement)
- **Database validation:** Does this SKU exist? Is this product still available? Is this supplier still active?

**Error handling UX:**
- Never fail silently. Never fail on first error and force re-upload
- Validate the ENTIRE file at once, show all errors in a summary table
- Allow inline editing of errors directly in the review table
- Show a progress bar: "247 of 250 items validated successfully. 3 need attention."
- Provide "Fix & Continue" (edit in place) and "Re-upload" (start over) options
- After successful import, show confirmation with count: "250 items added to your quote request"

**Critical detail:** Support messy real-world files. Accept UTF-8 with or without BOM, handle comma/semicolon/tab delimiters automatically, handle .xlsx files renamed to .csv gracefully.

### 1C. Quick Order Pad (Grainger Model)

**Layout:**
- Spreadsheet-style grid, 10 rows visible by default
- Each row: [SKU Input] [Product Name (auto-populated)] [Quantity] [Unit] [Add to Quote button per row]
- "Add 10 more rows" button at bottom
- Tab key moves: SKU -> Quantity -> next row's SKU (skip auto-populated fields)

**Step-by-step interaction:**
1. User types or pastes SKU into first field
2. System validates SKU in real-time (debounced, ~300ms after typing stops)
3. If valid: product name, unit, and available stock populate automatically. Row gets green checkmark
4. If ambiguous: dropdown shows 2-3 matching products for user to pick
5. If invalid: row highlights red, shows "SKU not found. Did you mean...?" with suggestions
6. User tabs to quantity field, enters number
7. User tabs to next row -- cursor auto-focuses on the next empty SKU field
8. After filling rows, user clicks "Add All to Quote" button (bulk action)

**Keyboard navigation (critical for B2B power users):**
- `Tab` moves forward through fields
- `Shift+Tab` moves backward
- `Enter` on a row = add that single item
- `Ctrl+Enter` = add all valid items at once
- `Ctrl+V` in SKU field = paste and auto-advance to quantity
- Arrow keys navigate between rows when focused on any field

**Multi-SKU paste mode:**
- User can paste a block of text (one SKU per line, or SKU+quantity separated by tab/comma)
- System parses and fills multiple rows at once
- Shows validation results for all pasted items simultaneously

### 1D. Barcode/QR Scan

**Flow on mobile (via Capacitor camera API):**
1. User taps "Scan" button (camera icon) in the material list builder
2. Camera activates with a viewfinder overlay showing scan target area
3. On successful scan: haptic vibration + success sound + green flash on viewfinder
4. Product info slides up from bottom as a card: name, SKU, last ordered price, stock status
5. Quantity input appears pre-focused with keyboard open
6. User enters quantity, taps "Add" -- item joins the list
7. Camera stays active for continuous scanning (scan-add-scan-add loop)
8. "Done Scanning" button returns to full list view

**Error states:**
- Unrecognized barcode: "Product not found. Try entering SKU manually." with a text input fallback
- Camera permission denied: Clear instructions with deep-link to device settings
- Poor lighting: "Move to a brighter area" overlay with flashlight toggle button

---

## 2. Quote Management UX

### 2A. Quote Card Design (At-a-Glance Info)

**A quote card in a list view should show in this priority order:**
1. **Quote Number** (e.g., QR-2026-0847) -- bold, top-left
2. **Status Badge** -- colored pill: Draft (gray), Submitted (blue), Under Review (amber), Quoted (green), Expired (red), Accepted (dark green), Declined (dark red)
3. **Total Value** -- large number, right-aligned (e.g., "EGP 2,450,000")
4. **Item Count** -- "14 line items"
5. **Created Date** / **Last Updated** -- relative time ("2 hours ago") with exact date on hover
6. **Expiration** -- if applicable, countdown ("Expires in 3 days") turning red when < 24h
7. **Assigned Sales Rep** -- avatar + name
8. **Customer/Company Name** -- for internal views

**Card interaction:** Click anywhere on card opens full quote detail. Swipe actions on mobile: swipe right = accept, swipe left = archive.

### 2B. Version History (Adobe Commerce / OroCommerce Patterns)

**How negotiation versioning works:**

The Adobe Commerce model tracks every exchange as a version:

1. **v1 (Buyer submits RFQ):** Buyer selects items from cart, sets desired quantities, optionally proposes prices. Status: "Submitted"
2. **v2 (Seller responds):** Sales rep adjusts prices (percentage discount, fixed amount, or proposed price), adds/removes products, changes quantities, sets shipping method, sets expiration date (default 30 days), adds internal notes. Status: "Quoted"
3. **v3 (Buyer counter-offers):** Buyer reviews, changes quantities, proposes different prices, sends reply. Status: "Updated"
4. **v4+ (Back and forth):** Each exchange creates a new version until one party accepts or declines

**UX for version display:**
- Timeline on the right side of the quote detail page
- Each version is a node showing: who acted, what changed, when
- Expandable diff view: "Price changed from EGP 450 to EGP 420 per unit"
- Current version always shown in the main content area
- "Compare versions" button: side-by-side diff of any two versions
- Comments/notes attached to specific versions or specific line items

**Key Adobe Commerce features:**
- Seller can lock a discount to prevent further discounting on a line item
- Line-item discounts apply first, then cart-level discounts
- System sends notification 24 hours before expiration
- Expired quotes revert to original prices but can be re-submitted by buyer
- Both buyer and seller can re-open declined/expired quotes

### 2C. Counter-Offer Interface

**Best pattern: Inline editing on the quote detail page (not a separate form).**

1. Buyer views quoted prices in a table
2. Each price cell has an "edit" icon or is directly clickable
3. Clicking a price cell turns it into an input field with the current value pre-filled
4. User types their counter-price
5. Changed cells highlight with a different background color (e.g., amber)
6. A floating "changes bar" appears at bottom: "3 items modified. [Discard Changes] [Submit Counter-Offer]"
7. On submit: optional comment field for explaining the counter-offer
8. System creates new version, notifies other party

### 2D. Partial Acceptance (Per-Line Accept/Reject)

**Pattern:**
- Each line item in a quote has three action buttons: Accept | Reject | Negotiate
- Accepting a line locks it (grayed out, checkmark)
- Rejecting a line strikes it through with an optional "reason" dropdown (Too expensive / Not needed / Found alternative / Other)
- Negotiating a line opens inline price editing for just that item
- Summary bar at top updates in real-time: "8 accepted, 2 rejected, 4 pending"
- "Submit Partial Response" becomes available once all lines have a decision

---

## 3. Order Tracking UX

### 3A. Timeline/Stepper Design (Best Pattern for B2B)

**Use a horizontal stepper for the main flow, with vertical timeline for detailed events.**

**Main stepper (always visible):**
```
[Order Placed] ----> [Confirmed] ----> [In Production/Sourcing] ----> [Ready to Ship] ----> [Shipped] ----> [Delivered]
     (filled)        (filled)           (current/pulsing)              (empty)              (empty)         (empty)
```

**Visual states per step:**
- Completed: filled circle + checkmark + date shown below
- Current: filled circle + pulsing animation + "Estimated: Apr 2"
- Upcoming: empty circle + estimated date (gray)
- Problem: red circle + warning icon + explanation text

**Below the stepper, a vertical detail timeline:**
```
Apr 1, 10:32 AM  - Order confirmed by Ahmed (Sales)
Apr 1, 11:15 AM  - Sent to supplier: Al-Ahram Building Materials
Apr 2, 09:00 AM  - Supplier confirmed availability
Apr 2, 02:30 PM  - Payment verification completed
Apr 3, 08:00 AM  - Loading at supplier warehouse
Apr 3, 10:45 AM  - Departed supplier warehouse [Track on map -->]
```

### 3B. Multi-Shipment / Partial Delivery

**For B2B building materials where one order may ship from multiple suppliers:**
- Show a "Shipments" tab on the order detail page
- Each shipment is a card with its own mini-stepper
- Line items grouped by shipment, showing which items are in which shipment
- Table view: Item | Ordered Qty | Shipped Qty | Remaining | Shipment # | Status

**Key pattern:** Line-item level tracking, not just order-level. Display: "7 of 10 items shipped. 3 awaiting supplier confirmation."

### 3C. GPS / Map Tracking

**For delivery vehicles (via Capacitor + map embed):**
- Map takes 60% of screen on desktop (right side), full-width on mobile
- Driver pin with real-time position updates (every 30 seconds)
- Route line showing: completed (solid) vs remaining (dashed)
- ETA countdown: "Arriving in ~45 minutes" -- updates every minute
- Delivery address pin with geofence radius indicator
- Below map: driver name, vehicle info, phone button (tap to call)

**ETA best practices:**
- Show a range, not exact time: "Between 2:00 - 2:30 PM" rather than "2:15 PM"
- Update proactively -- if delay detected, push notification before customer wonders
- Use precise dates, never "tomorrow" or "shortly" -- these cause confusion

### 3D. Status Notifications

**Notification triggers (automated):**
| Event | In-App | Push | Email | WhatsApp |
|-------|--------|------|-------|----------|
| Order confirmed | Yes | No | Yes | Yes |
| Payment verified | Yes | No | Yes | No |
| Shipped | Yes | Yes | Yes | Yes |
| Out for delivery | Yes | Yes | No | Yes |
| Delivered | Yes | Yes | Yes | Yes |
| Delay/Exception | Yes | Yes | Yes | Yes |

**80% of customers expect regular shipping updates or will switch brands.** Proactive exception notifications (delays, partial stock) are more important than routine confirmations.

---

## 4. AI Chat in B2B Portals

### 4A. Placement: Centered Portal (Not Floating Bubble)

For a platform where AI is the primary interface (per the project vision), the chat is NOT a floating widget. It is the center of the experience.

**Recommended layout:**
- **Full-width centered chat** on the home/dashboard screen -- this IS the dashboard
- Messages appear in a conversational flow, centered, max-width ~720px
- AI responses can contain rich elements inline: product cards, price tables, status trackers, action buttons
- Sidebar (collapsible) shows: conversation history, pinned conversations, quick actions

**When user navigates to specific features** (orders, quotes, etc.), the chat becomes a contextual sidebar:
- Right-side panel, 380-420px wide
- Aware of the current page context ("I see you're looking at Quote #847...")
- Can perform actions on the current view ("Update quantity for line 3 to 500 units")

### 4B. Message Types and Rich Responses

**AI messages should support these content types inline:**

1. **Text** -- standard conversational response
2. **Product Cards** -- image, name, specs, price, "Add to Quote" button
3. **Price Tables** -- formatted comparison tables with supplier prices
4. **Status Cards** -- mini order tracker with current status
5. **Action Buttons** -- "Create Quote", "Track Order #847", "Contact Supplier"
6. **File Attachments** -- PDFs (quotes, invoices), images (product photos, delivery receipts)
7. **Forms** -- inline forms for quick data entry (e.g., "Enter delivery address" with structured fields)
8. **Charts** -- spending trends, price history over time
9. **Confirmation Cards** -- "I've created Quote #848 with 12 items. [View Quote] [Edit] [Send to Supplier]"

### 4C. Quick Action Buttons (Suggestion Chips)

**Below the chat input, show context-aware suggestion chips:**
- On empty/home state: "Get a quote" | "Track my order" | "Check prices" | "Upload material list"
- After discussing a product: "Add to quote" | "Check stock" | "See alternatives" | "Compare prices"
- After order creation: "Track this order" | "Download PO" | "Notify my team"

These chips reduce typing and show users what the AI can do -- critical for discoverability.

### 4D. Input Area Design

- Multi-line text input (auto-expanding, 1 line default, max 6 lines before scroll)
- File attachment button (clip icon) supporting: images, PDFs, CSVs, Excel
- Voice input button (microphone icon) for mobile
- Send button (or Enter to send, Shift+Enter for new line)
- Slash commands: `/quote`, `/track`, `/price`, `/help` -- typed in input, show command palette

### 4E. Conversation History

- Left sidebar: list of past conversations grouped by date ("Today", "Yesterday", "This week", "March 2026")
- Each conversation shows: first message preview + key entity (Quote #, Order #, etc.)
- Pin important conversations to top
- Search across all conversations
- Conversations are persistent and resumable

---

## 5. Supplier Portal UX

### 5A. Product Catalog Upload

**Two methods, equally prominent:**

**Method 1: Spreadsheet Upload (Bulk)**
- Same 4-step flow as customer CSV upload (Section 1B)
- Template download with columns: Product Name, SKU, Category, Description, Unit, Min Order Qty, Lead Time, Price (optional -- quotes may be dynamic)
- AI-assisted optimization: system suggests better product titles, categories, and descriptions after upload (Alibaba's "Intelligent Posting System" model)
- Validation: image requirements (min resolution, max file size), required fields, category matching

**Method 2: Single Product Form (One-by-One)**
- Multi-step form with auto-save: Basic Info -> Specifications -> Pricing -> Images -> Review
- Each step shows completion percentage
- Draft products saved automatically, visible in "Drafts" tab
- Image upload: drag-and-drop zone, camera capture on mobile, crop/rotate tools, AI auto-background-removal

### 5B. Stock Management Grid

**A data grid (see Section 7 for grid patterns) with these specific columns:**
- Product Name | SKU | Current Stock | Reserved | Available | Min Stock Level | Status | Actions
- **Inline editing** for stock levels: click a cell, type new value, Enter to save
- **Bulk update**: select multiple rows -> "Update Stock" -> enter adjustment value (add/subtract)
- **Low stock alerts**: rows where Available < Min Stock Level highlighted in amber
- **Out of stock**: rows highlighted in red, with "Mark as Unavailable" quick action
- **Status column**: In Stock (green) | Low Stock (amber) | Out of Stock (red) | Discontinued (gray)

### 5C. Pricing Update UI

**Price management should support:**
- Individual price editing (inline, click-to-edit on the price cell)
- Bulk price adjustment: select products -> "Adjust Prices" -> options:
  - Increase/decrease by percentage
  - Increase/decrease by fixed amount
  - Set to specific value
  - Apply to: selected items / entire category / all products
- Price history per product: small sparkline chart showing last 6 months
- Effective date: schedule price changes for a future date
- Price approval workflow: if customer relationships have negotiated pricing, changes may need buyer notification

### 5D. PO Inbox and Confirmation

**Layout: Email-inbox style with three panels:**
1. **Left panel**: PO list with filters (New / Confirmed / Shipped / Completed / Disputed)
2. **Center panel**: Selected PO detail with line items table
3. **Right panel**: Actions and communication thread

**PO confirmation flow:**
1. New PO arrives -> push notification + WhatsApp message to supplier
2. Supplier opens PO in portal -> sees line items, quantities, requested delivery date
3. **Per-line confirmation**: Each line item has [Confirm] [Partial] [Reject] buttons
   - Confirm: locks in the line item at quoted price and quantity
   - Partial: supplier enters available quantity (e.g., "Can supply 800 of 1000 units")
   - Reject: requires reason selection (Out of stock / Price change / Lead time issue / Other)
4. Supplier sets expected ship date per confirmed line
5. Supplier clicks "Submit Confirmation" -> system notifies buyer of any partial/rejected items
6. For partials: buyer can accept partial, find alternative supplier for remainder, or cancel

### 5E. Invoice Submission

- "Create Invoice" button on confirmed POs
- Auto-populated from PO data (buyer info, line items, quantities, prices)
- Supplier adds: invoice number, tax details, bank details (saved from profile), attachments (scanned stamp/signature if required)
- PDF preview before submission
- Status tracking: Submitted -> Under Review -> Approved -> Paid

### 5F. Supplier Analytics Dashboard

**Key metrics to display:**
- Total orders (this month / trend)
- Revenue (this month / trend)
- Average response time to POs
- Fulfillment rate (confirmed vs total PO value)
- Customer satisfaction score
- Top selling products (bar chart)
- Order volume over time (line chart)

---

## 6. Confirmation Prompts and Validation

### 6A. When to Show Confirmation Dialogs

**USE confirmation dialogs for:**
- Deleting data that cannot be recovered (quotes, orders, products)
- Sending a quote or PO to a customer/supplier (external communication)
- Canceling an order that is already in progress
- Changing pricing that affects existing quotes
- Removing a team member / revoking access
- Any action involving money movement (payment confirmation)

**DO NOT use confirmation dialogs for:**
- Adding items to a list/quote (use undo instead)
- Changing a filter or sort order
- Navigating away from a page (use auto-save + drafts instead)
- Editing individual fields (use inline save + undo)
- Archiving items (use undo toast)
- Any routine, low-risk, easily reversible action

### 6B. Undo Instead of Confirm

**The undo toast pattern (preferred for reversible actions):**
1. User takes action (e.g., removes item from quote)
2. Action executes IMMEDIATELY -- no dialog
3. Toast notification slides in from bottom: "Item removed. [Undo]"
4. Toast persists for 8-10 seconds with a shrinking progress bar
5. If user clicks "Undo": action is reversed silently
6. If toast expires: action is permanent
7. Multiple undo toasts can stack (show latest on top, max 3 visible)

**This is faster than confirmation dialogs and feels more responsive.** Users are not interrupted for routine actions.

### 6C. Destructive Confirmation Dialog Design

**When confirmation IS needed, follow these rules:**

1. **Be specific about consequences**: Not "Are you sure?" but "Delete Quote #847? This will remove all 14 line items and cannot be undone."
2. **Action-specific button labels**: Not "Yes / No" but "Delete Quote" / "Keep Quote"
3. **Default focus on safe option**: Focus lands on "Keep Quote" (the non-destructive option)
4. **Visual warning for irreversible actions**: Warning icon, red destructive button
5. **For critical actions, require typing**: "Type DELETE to confirm" -- breaks the auto-click habit
6. **Keyboard accessible**: Tab between buttons, Enter activates focused button, Escape closes dialog (equivalent to cancel)
7. **Never pre-select the destructive option**

### 6D. Form Validation Patterns

**Inline validation (field-by-field) -- the best pattern:**
1. Validate on blur (when user leaves a field), NOT on every keystroke
2. Show error message directly below the field, in red, with an icon
3. Error message states what went wrong AND how to fix it: "Quantity must be at least 10 units" not "Invalid input"
4. Valid fields get a subtle green checkmark (optional, don't overdo)
5. If field was previously in error and user fixes it, clear the error immediately (on change, not on blur)

**On-submit validation (for complex multi-field rules):**
- After submit attempt, scroll to first error and focus the field
- Show error summary at top of form: "Please fix 3 errors below"
- Each error in summary is a clickable link that scrolls to/focuses the field

**Never:**
- Validate on every keystroke (frustrating while typing email, phone, etc.)
- Show errors before the user has interacted with the field
- Clear the form on validation failure
- Use only color to indicate errors (accessibility: always include text + icon)

---

## 7. Table / Data Grid UX

### 7A. Core Interaction Patterns

**Sorting:**
- Click column header to sort ascending, click again for descending, third click clears sort
- Show sort indicator: arrow icon + "A-Z" / "Z-A" or up/down chevron
- Default sort: most recent first (for orders, quotes, invoices) or by status priority (action-needed items first)
- Multi-column sort: hold Shift + click additional columns

**Filtering:**
- Filter bar above the table with horizontal filter chips
- Click a chip to open a dropdown with filter options (multiselect checkboxes)
- Active filters shown as removable pills: [Status: Active x] [Date: Last 30 days x]
- "Clear all filters" link when any filter is active
- Save filter combinations as named "views" (e.g., "My Open Quotes", "Overdue Invoices")

**Column Management:**
- Resize columns by dragging separator lines (cursor changes to col-resize on hover)
- Reorder columns via drag-and-drop on headers
- Show/hide columns via a "Columns" button that opens a checklist
- Sticky first column (always visible during horizontal scroll) -- typically the ID or name
- Sticky last column for action buttons (if applicable)
- User column preferences persist across sessions

### 7B. Row Interactions

**Selection:**
- Checkbox on each row for multi-select
- Click header checkbox to select all (on current page, not all pages -- show "Select all 247 results" link)
- Shift+click for range selection
- Selected rows get a subtle highlight background

**Bulk Actions:**
- Actions toolbar appears ONLY when rows are selected (above the table)
- Shows count: "3 items selected"
- Action buttons: Export | Archive | Delete | Change Status | Assign
- Confirm before destructive bulk actions

**Row Expansion (Progressive Disclosure):**
- Chevron icon on each row (or click anywhere on the row)
- Expands to show: additional details, sub-items, activity history
- Only one row expanded at a time (accordion pattern) -- prevents information overload
- Alternative: click row to open a quick-view sidebar panel (380px) on the right -- keeps table context visible

**Inline Editing:**
- Double-click a cell to edit (for editable tables like stock management)
- Cell turns into an input field with the current value
- Enter to save, Escape to cancel
- Changed cells show a subtle indicator (small dot) until the page is saved
- For tables with many editable fields, use "Edit Mode" toggle that makes all cells editable at once

### 7C. Performance for Large Datasets

**Virtual scrolling (mandatory for 1000+ rows):**
- Render only visible rows + buffer (typically viewport + 10 rows above/below)
- Maintain smooth 60fps scrolling
- Show total count in table footer: "Showing 1-50 of 2,847 results"
- Use TanStack Virtual (compatible with TanStack Start stack)

**Pagination vs. infinite scroll:**
- For reference data (product catalogs, order history): pagination with 25/50/100 rows-per-page selector
- For action-oriented lists (PO inbox, notifications): infinite scroll with virtual rendering
- Never load all data at once for tables with 100+ potential rows

### 7D. Display Density

**Offer density toggle (three levels):**
- **Compact** (36-40px rows): for power users scanning large datasets
- **Default** (44-48px rows): balanced for daily use
- **Comfortable** (52-56px rows): for occasional users or when rows have multi-line content
- Persist preference per user

### 7E. Alignment and Formatting

- **Text**: left-aligned
- **Numbers/Currency**: right-aligned, monospace font for column alignment
- **Dates**: left-aligned, consistent format throughout (e.g., "1 Apr 2026" or "2026-04-01", pick one)
- **Status badges**: center-aligned in their column
- **Row dividers**: subtle 1px border (not zebra stripes -- they create visual noise with selection highlights and hover states)

---

## 8. Empty States and Onboarding

### 8A. Empty State Framework: What / Why / Next

Every empty state answers three questions:
1. **What** -- What is this page for?
2. **Why** -- Why should I care? What value does it provide?
3. **Next** -- What is my first action?

### 8B. Empty States by Feature

**Quotes (empty):**
- Illustration: simple line drawing of a document with a price tag
- Headline: "No quotes yet"
- Body: "Request a quote for building materials and get competitive prices from verified suppliers."
- Primary CTA: "Create your first quote"
- Secondary CTA: "Upload a material list (CSV)"

**Orders (empty):**
- Headline: "No orders yet"
- Body: "Once you accept a quote and confirm payment, your orders will appear here with real-time tracking."
- Primary CTA: "Browse your quotes" (link to quotes page)

**Supplier catalog (empty -- supplier side):**
- Headline: "Your product catalog is empty"
- Body: "Add your products so buyers can find and order from you. You can add products one by one or upload your entire catalog."
- Primary CTA: "Add a product"
- Secondary CTA: "Upload catalog (CSV/Excel)"
- Tertiary: "Download template"

**Search results (no match):**
- Headline: "No results for '[search term]'"
- Suggestions: "Check your spelling" | "Try broader terms" | "Browse categories"
- Show: "Popular in Building Materials: Cement | Steel Rebar | PVC Pipes | Ceramic Tiles"
- Alternative CTA: "Can't find what you need? Request a custom quote"

**Notifications (empty):**
- Headline: "You're all caught up!"
- Body: "When there's activity on your quotes, orders, or deliveries, you'll see it here."
- No CTA needed -- this is a completion state, keep it lightweight

### 8C. First-Time User Experience

**Progressive disclosure over first 3 sessions, NOT a tutorial walkthrough:**

**Session 1: Core Value**
- After login, land on the AI chat center
- AI greets: "Welcome to [Platform]. I can help you get quotes for building materials, track orders, and manage your suppliers. What would you like to do?"
- Show 3-4 suggestion chips for the most common first actions
- NO product tour, NO tooltip walkthroughs, NO "complete your profile" nag

**Session 2: Contextual Hints**
- On pages the user hasn't visited yet, show a single subtle hint (small info banner, dismissible)
- Example: first visit to Quotes page shows: "Tip: You can upload a CSV of materials for a quick quote. [Try it] [Dismiss]"
- Dismissed hints never come back

**Session 3+: Feature Discovery**
- Use the AI chat to proactively suggest features: "I noticed you've been entering items one by one. Did you know you can upload a CSV?"
- Show "What's new" badge on features that were recently added (disappears after click)

### 8D. Role-Based Onboarding

Different first experiences per role:
- **Buyer (procurement):** Focus on quote creation and order tracking
- **Supplier (sales):** Focus on catalog setup and PO management
- **Admin:** Focus on team setup, roles, and settings
- **Driver:** Focus on delivery assignments and navigation

---

## 9. Notification Center UX

### 9A. Bell Icon and Badge

- Bell icon in header, right side, always visible
- Unread count badge: filled circle with number (max "99+")
- Badge disappears when all notifications read, NOT when dropdown is opened (common mistake)
- Click bell opens a dropdown panel (not a full page)

### 9B. Notification Dropdown Design

**Layout (420px wide dropdown):**
- Header: "Notifications" title + "Mark all as read" link
- Tabs: All | Unread | Mentions (optional based on features)
- Notification list: reverse chronological
- Each notification shows:
  - Colored left border (by category: blue for orders, green for quotes, amber for alerts)
  - Icon (by type: package for delivery, document for quote, alert for urgency)
  - Title (bold if unread): "Quote #847 has a response"
  - Preview text: "Ahmed from Al-Ahram offered 5% discount on cement"
  - Timestamp: "2 hours ago"
  - Quick actions: [View Quote] button inline (optional per notification type)
- Unread notifications have slightly different background (subtle, not aggressive)
- Click notification: navigates to relevant page, marks as read
- "See all notifications" link at bottom -> opens full-page notifications view

### 9C. Full-Page Notification Inbox (Linear Model)

**For power users who want triage capabilities:**
- Keyboard navigation: `J`/`K` or arrow keys to move between notifications
- `U` to toggle read/unread
- `Backspace` to delete/archive
- `H` to snooze (reappears later as unread)
- Quick search (`Cmd+F`) to filter by title, type, or assignee
- Snooze options: "Later today" | "Tomorrow" | "Next week" | Custom date/time
- Snoozed items reappear as new unread notifications at the specified time

### 9D. Notification Settings

**Per-category granular control:**

| Category | In-App | Push | Email | WhatsApp |
|----------|--------|------|-------|----------|
| Quote responses | Always | On/Off | On/Off | On/Off |
| Order status changes | Always | On/Off | On/Off | On/Off |
| Delivery updates | Always | On/Off | On/Off | On/Off |
| Payment confirmations | Always | On/Off | On/Off | On/Off |
| Team mentions | Always | On/Off | On/Off | Off |
| System announcements | Always | Off | On/Off | Off |

- In-app notifications are always on (they are the baseline)
- Each additional channel is independently togglable
- "Quiet hours" setting: suppress push notifications between specified times (e.g., 10 PM - 7 AM)
- Frequency control for email: "Instant" | "Hourly digest" | "Daily digest"

---

## 10. Search UX

### 10A. Command Palette / Universal Search (Cmd+K)

**This is the #1 keyboard pattern for power users in 2025-2026.**

**Activation:**
- `Cmd+K` (Mac) / `Ctrl+K` (Windows) from anywhere in the app
- Also: clicking the search bar in the header (which shows the keyboard shortcut hint: "Search or jump to... `Cmd+K`")
- The shortcut is togglable: pressing it again closes the palette

**The search overlay:**
- Centered modal, ~600px wide, appears with a subtle scale-in animation
- Large search input at top, auto-focused, with placeholder: "Search products, orders, quotes, or type a command..."
- Below input: sections that change based on context

### 10B. Empty State (Before Typing)

When opened with no query, show:
1. **Recent searches**: last 5 searches with their result type icon
2. **Quick actions**: "Create Quote" | "Upload Material List" | "Track Order" -- these are commands, not searches
3. **Suggested**: trending products, frequently accessed orders

### 10C. As User Types (Search-to-Action)

**Results appear instantly (debounced ~150ms), grouped by category:**

```
Products (3)
  [icon] Portland Cement Type II - 50kg bag
  [icon] Portland Cement Type V - 50kg bag
  [icon] White Portland Cement - 25kg bag

Orders (2)
  [icon] Order #ORD-2026-1234 - Delivered Mar 28
  [icon] Order #ORD-2026-1199 - In Transit

Quotes (1)
  [icon] Quote #QR-2026-0847 - Under Review

Actions (2)
  [icon] Create a new quote for "portland cement"
  [icon] Check price for "portland cement"
```

**Each result group shows max 3-5 items** with a "See all X results" link.

### 10D. Keyboard Navigation Within Results

- Arrow Up/Down moves between results (highlighted result shows preview info on the right, if space allows)
- `Enter` opens the selected result
- `Tab` moves between categories (jumps from Products to Orders to Quotes)
- `Escape` closes the palette
- `Cmd+Enter` opens result in a new tab / side panel
- Category prefixes: type `>` for commands only, `#` for orders, `@` for people, `$` for quotes

### 10E. Search Result Previews

For the highlighted result, show a preview panel on the right side of the palette (if screen width > 900px):
- **Product**: image, key specs, current price, stock status
- **Order**: status stepper, delivery date, total value
- **Quote**: status badge, item count, total value, expiration
- **Person**: role, company, recent interactions

### 10F. Fuzzy Matching and Forgiveness

- Support typos: "cment" should find "cement"
- Support Arabic AND English queries for the same products
- Support SKU fragments: typing "PRT-50" matches "PRT-50-KG-CEMENT"
- Support natural language: "my last order" should show the most recent order
- Highlight matching characters in results (bold the matched portion)

---

## Cross-Cutting Patterns

### Keyboard-First Design (Applies to All Features)

Since the platform vision is keyboard-first:
- Every major action has a keyboard shortcut
- Shortcut hints shown next to buttons/actions in tooltips
- `?` opens a keyboard shortcut cheat sheet overlay
- Focus management: after any action, focus moves to the logical next element (not back to top of page)
- Tab order follows visual layout and logical workflow
- Skip-to-content links for accessibility

### Responsive Adaptation

All patterns above should adapt:
- **Desktop (>1024px)**: full experience with multi-panel layouts, sidebars, keyboard shortcuts
- **Tablet (768-1024px)**: single-panel with slide-over panels, touch-optimized targets (44px min)
- **Mobile (<768px)**: bottom sheet modals instead of dropdowns, full-screen overlays instead of sidebars, swipe gestures for common actions

### Loading States

- Skeleton screens (not spinners) for initial page loads
- Optimistic updates for user actions (show change immediately, sync in background)
- Progress bars for long operations (CSV upload, bulk price update)
- Never show empty screen while loading -- always show skeleton of expected content

### Error Recovery

- Auto-save drafts every 30 seconds for any form/editor
- "Resume where you left off" for interrupted workflows
- Network error: show banner at top, retry automatically when connection returns, never lose user input
- API error: show user-friendly message with "Try Again" button, log technical details for support
