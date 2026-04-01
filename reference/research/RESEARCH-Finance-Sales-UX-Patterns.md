# Finance Module & Sales CRM UX Patterns Research
## Best Practices from Leading B2B Platforms (2025-2026)

---

## 1. Accounts Receivable Aging Display

### Top-Level KPI Strip
Every best-in-class AR dashboard opens with a horizontal strip of 4-6 KPI cards:
- **Total Outstanding** (big number, currency)
- **DSO** (Days Sales Outstanding, trend arrow vs. prior period)
- **CEI** (Collection Effectiveness Index, percentage)
- **Overdue Amount** (red-highlighted if above threshold)
- **Current Period Collections** (vs. target)

### Aging Visualization — Recommended: Horizontal Stacked Bar
| Chart Type | When to Use | Pros | Cons |
|---|---|---|---|
| **Horizontal stacked bar** | Primary aging view | Each segment = aging bucket (Current, 1-30, 31-60, 61-90, 90+). Color gradient from green to red. Width = dollar amount. One bar per customer or one summary bar. | Can be hard to compare individual segments |
| **Waterfall chart** | Showing flow from invoiced → collected → remaining | Shows how total outstanding decomposes | Less intuitive for aging buckets |
| **Heatmap grid** | Customer x Bucket matrix | Instantly spot which customers are in which buckets. Color intensity = dollar severity | Needs enough customers to be useful |
| **Treemap** | Portfolio-level view | Area = exposure size, color = severity | Hard to read exact numbers |

### Best Practice: The "Aging Table with Embedded Sparklines"
```
Customer     | Current  | 1-30    | 31-60   | 61-90   | 90+     | Total    | Trend
-------------|----------|---------|---------|---------|---------|----------|--------
ACME Corp    | 50,000   | 12,000  | 0       | 0       | 0       | 62,000   | [spark]
Beta Trading | 0        | 30,000  | 45,000  | 20,000  | 8,000   | 103,000  | [spark]
```
- Each cell is clickable — drills into the individual invoices in that bucket
- Row background shifts from white → pale yellow → pale red based on worst bucket
- Sparkline in last column shows 6-month aging trend for that customer
- Column headers show aggregate totals

### Drill-Down Flow
1. **Dashboard level**: Summary stacked bar + KPI cards
2. **Click aging bucket segment** → Filtered list of customers in that bucket
3. **Click customer row** → All invoices for that customer, grouped by bucket
4. **Click invoice** → Invoice detail with payment history, communication log, dispute status

### Color Coding (Severity)
- Current: `--color-green-500` or neutral/gray
- 1-30 days: `--color-yellow-400`
- 31-60 days: `--color-orange-500`
- 61-90 days: `--color-red-400`
- 90+ days: `--color-red-600` with bold/badge treatment

### Filtering & Segmentation
- Filter by: customer tier, sales rep, date range, amount range, customer group
- Group by: customer, region, salesperson
- Sort by: total outstanding, oldest invoice, highest risk

---

## 2. Payment Recording UX

### The Payment Application Flow (Wire Transfer Scenario)

**Step 1: Payment Entry / Import**
```
+--------------------------------------------------+
| RECORD PAYMENT                                    |
|                                                   |
| Payment Method: [Wire Transfer v]                 |
| Bank Account:   [Company Bank Account v]          |
| Reference #:    [WT-2025-03-4521___________]      |
| Amount:         [EGP 247,500.00___________]       |
| Date Received:  [2025-03-15___]                   |
| Payer Name:     [Auto-detected: ACME Corp__]      |
|                                                   |
| [Find Matching Invoices]                          |
+--------------------------------------------------+
```

**Step 2: Invoice Matching**
System auto-suggests matches based on: customer name, amount (exact or combination), reference numbers in wire memo.

```
+--------------------------------------------------+
| MATCH TO INVOICES           Amount: EGP 247,500   |
|                                                   |
| Customer: ACME Corp                               |
|                                                   |
| [x] INV-2025-0342  |  Mar 01  |  EGP 150,000    |
| [x] INV-2025-0356  |  Mar 08  |  EGP  97,500    |
| [ ] INV-2025-0371  |  Mar 12  |  EGP  85,000    |
|                                                   |
| Selected Total:  EGP 247,500                      |
| Remaining:       EGP 0.00        [Matched!]       |
|                                                   |
| [Apply Payment]  [Save as Unmatched]              |
+--------------------------------------------------+
```

**Step 3: Handling Edge Cases**

*Partial Payment:*
```
Payment: EGP 100,000 against INV-2025-0342 (EGP 150,000)
→ Applied: EGP 100,000
→ Invoice remaining: EGP 50,000 (status changes to "Partially Paid")
→ System creates open balance record linked to original invoice
```

*Overpayment:*
```
Payment: EGP 260,000 against invoices totaling EGP 247,500
→ Applied: EGP 247,500
→ Unapplied: EGP 12,500
→ Options: [Apply to Next Invoice] [Hold as Credit] [Refund]
```

*Multiple Invoices, One Payment (Batch Application):*
- Checkboxes next to invoices, running total at bottom
- "Auto-allocate" button applies FIFO (oldest invoice first)
- Manual override: type specific amount per invoice line

### Key UX Principles
- **Auto-match first**: System proposes matches; clerk confirms (not the other way around)
- **Running balance**: Always show "Payment Amount — Applied = Remaining" live
- **One-click FIFO**: "Apply to oldest first" button for quick allocation
- **Undo-friendly**: Payment application is reversible before end-of-day close
- **Bank statement import**: Bulk import from CSV/MT940, then match each line

---

## 3. Post-Dated Cheque (PDC) Management UX

### PDC Grid View
```
+------------------------------------------------------------------+
| POST-DATED CHEQUES                    [+ New PDC]  [Calendar View]|
|                                                                    |
| Filter: [All Status v] [All Banks v] [Date Range] [Customer]     |
|                                                                    |
| # | Cheque No | Customer     | Bank      | Amount    | Maturity  | Status    | Actions     |
|---|-----------|-------------|-----------|-----------|-----------|-----------|-------------|
| 1 | 458721    | ACME Corp   | CIB       | 150,000   | Mar 20    | Received  | [Deposit]   |
| 2 | 339201    | Beta Trade  | NBE       | 85,000    | Mar 25    | Received  | [Deposit]   |
| 3 | 112908    | Gamma LLC   | QNB       | 200,000   | Mar 15    | Deposited | [Clear][Bounce]|
| 4 | 774523    | Delta Co    | Banque M. | 45,000    | Mar 10    | Cleared   | --          |
| 5 | 881234    | ACME Corp   | CIB       | 120,000   | Feb 28    | Bounced   | [Re-present][Write Off]|
+------------------------------------------------------------------+
| Summary: Received: EGP 235,000 | Deposited: EGP 200,000 | Cleared: EGP 45,000 | Bounced: EGP 120,000 |
+------------------------------------------------------------------+
```

### Status State Machine
```
Received → Deposited → Cleared
                    ↘ Bounced → Re-presented → Cleared
                               ↘ Written Off
                               ↘ Replaced (new cheque linked)
```

### Calendar / Maturity View
- Monthly calendar showing cheques due on each date
- Color-coded dots: blue (received, not yet deposited), orange (deposited, awaiting clearance), green (cleared), red (bounced)
- Click a date → shows all cheques maturing that day
- "Due This Week" summary bar at top with total amount and count
- **Notification system**: Alert 3 days before maturity date, daily until deposited

### Bounce Handling Flow
1. Mark cheque as "Bounced" → system prompts for bounce reason (insufficient funds, signature mismatch, date issue, other)
2. Auto-reverses the accounting entry
3. Adds bounce amount back to customer's outstanding AR
4. Options presented: **Re-present** (set new deposit date), **Request Replacement** (links to communication), **Write Off** (requires approval), **Escalate** (flags customer credit profile)
5. Customer credit score automatically impacted
6. If customer has multiple bounced cheques → auto-triggers credit hold review

### PDC Entry Form
```
Cheque Number:    [____________]
Bank Name:        [Dropdown + search]
Branch:           [____________]
Amount:           [____________]
Issue Date:       [Date picker]
Maturity Date:    [Date picker]
Customer:         [Auto-complete]
Linked Invoice:   [Search/select]
Notes:            [____________]
```

---

## 4. Three-Way Match UX

### Side-by-Side Comparison Layout
```
+-------------------+-------------------+-------------------+
| PURCHASE ORDER    | GOODS RECEIPT     | SUPPLIER INVOICE  |
| PO-2025-0891      | GR-2025-1204      | SI-2025-7732      |
+-------------------+-------------------+-------------------+
| Line 1: Steel Rods                                        |
| Qty:    500 units  | Qty:    500 units | Qty:    500 units |  ✓
| Price:  EGP 120/u  | --                | Price:  EGP 125/u |  ⚠ +4.2%
| Total:  EGP 60,000 | --                | Total:  EGP 62,500|  ⚠ +EGP 2,500
+-------------------+-------------------+-------------------+
| Line 2: Copper Wire                                       |
| Qty:    200 kg     | Qty:    180 kg    | Qty:    200 kg    |  ⚠ Receipt short
| Price:  EGP 450/kg | --                | Price:  EGP 450/kg|  ✓
| Total:  EGP 90,000 | --                | Total:  EGP 90,000|  ⚠ Invoiced > Received
+-------------------+-------------------+-------------------+
| TOTALS                                                     |
| PO:     EGP 150,000 | GR:  EGP 141,000 | SI: EGP 152,500 |
+-------------------+-------------------+-------------------+
```

### Discrepancy Highlighting
- **Green check**: All three documents match within tolerance
- **Yellow warning**: Variance within tolerance but notable (e.g., 2-5%)
- **Red flag**: Variance exceeds tolerance threshold
- **Gray dash**: Field not applicable (GR has no price)

### Tolerance Rules
| Match Type | Typical Tolerance | Action if Exceeded |
|---|---|---|
| Price variance | 0-5% configurable | Route to procurement manager |
| Quantity variance | 0-2% or exact match | Route to warehouse manager |
| Tax difference | 0% (must match exactly) | Route to finance |
| Delivery charges | Per PO terms | Route to logistics |

### Action Bar
```
+------------------------------------------------------------------+
| Match Status: 1 of 2 lines matched    Variance: EGP 2,500       |
|                                                                    |
| [Approve All ✓] [Approve Matched Lines] [Dispute] [Hold] [Reject]|
|                                                                    |
| Dispute Reason: [Price increase not agreed v]                     |
| Note to supplier: [________________________________]              |
+------------------------------------------------------------------+
```

### Workflow
1. **Auto-match**: System attempts automatic matching on PO number + line items
2. **Exception queue**: Unmatched or variance-flagged items appear in a work queue
3. **Side-by-side review**: Clerk sees all three documents simultaneously
4. **Per-line action**: Each line can be individually approved, disputed, or held
5. **Batch approve**: "Approve all matched" button for lines that pass tolerance
6. **Dispute flow**: Generates communication to supplier with specific variance details
7. **Hold**: Parks the invoice pending resolution (e.g., waiting for credit note)

---

## 5. Credit Management UX

### Customer Credit Profile Card
```
+------------------------------------------------------------------+
| CUSTOMER CREDIT PROFILE                                           |
|                                                                    |
| ACME Corporation                          Tier: [Gold ★★★]       |
|                                                                    |
| Credit Limit:  EGP 500,000                                       |
| ████████████████████░░░░░  78% utilized (EGP 390,000)            |
|                                                                    |
| Available:     EGP 110,000                                        |
| Overdue:       EGP 45,000 (2 invoices)                           |
|                                                                    |
| Payment Score: 82/100  [████████░░]  "Good"                      |
| Avg Days to Pay: 38 days                                          |
| Bounced Cheques (12mo): 1                                         |
| Last Payment: Mar 10, 2025                                        |
|                                                                    |
| Status: [● Active]     [Hold Orders] [Adjust Limit] [Review]     |
+------------------------------------------------------------------+
```

### Utilization Bar Design
- **0-60%**: Green fill
- **60-80%**: Yellow fill
- **80-95%**: Orange fill
- **95-100%**: Red fill
- **Over 100%**: Red fill + pulsing border + "OVER LIMIT" badge

### Credit Hold/Release Flow
**Automatic Hold Triggers (D365-style):**
1. Credit limit exceeded
2. Days overdue exceeds threshold (e.g., 30+ days)
3. Overdue amount exceeds X% of credit limit
4. Payment terms changed without approval
5. Bounced cheque count exceeds threshold
6. Credit limit expired (with grace period option)

**Hold Applied:**
```
⚠ CREDIT HOLD — Reason: 2 invoices overdue > 60 days
  Held Orders: SO-2025-0445 (EGP 85,000), SO-2025-0448 (EGP 32,000)
  Held Since: Mar 12, 2025

  [Release with Approval] [Release One-Time] [Escalate]
```

**Release requires**: Credit manager approval (or auto-release if blocking condition clears)

### Credit Review Screen
```
+------------------------------------------------------------------+
| CREDIT REVIEW — ACME Corporation                                  |
|                                                                    |
| Current Limit:     EGP 500,000                                   |
| Requested Limit:   EGP 750,000  (by: Sales Rep Ahmed)            |
| Date Requested:    Mar 14, 2025                                   |
|                                                                    |
| --- Supporting Data ---                                            |
| Payment History:   [12-month chart showing on-time %]             |
| Order Volume:      [Trend chart, growing 15% QoQ]                |
| Current Exposure:  EGP 390,000                                   |
| Overdue History:   2 instances in 12 months, resolved < 15 days  |
| External Score:    B+ (from credit bureau)                        |
|                                                                    |
| Recommendation:    AI suggests EGP 650,000 (+30%)                |
|                                                                    |
| Decision: [Approve EGP 750K] [Approve EGP 650K] [Deny] [Defer]  |
| Notes:   [________________________________]                       |
+------------------------------------------------------------------+
```

### Credit Application Workflow
1. Sales rep or customer requests credit increase
2. System auto-gathers: payment history, current exposure, order trends, external scores
3. AI/rules engine generates recommendation
4. Credit manager reviews one-page profile with all data
5. Approve (full or partial) / Deny / Defer decision
6. Auto-updates customer record, releases any held orders if applicable
7. Notification sent to sales rep and customer

---

## 6. Invoice Generation & Sending UX

### Auto-Generation from Delivery
```
Delivery Confirmed (GR signed) → System auto-generates draft invoice
                                → Pulls: line items, prices, quantities from SO
                                → Applies: VAT rules, payment terms from customer profile
                                → Status: "Draft" (not yet sent)
```

### Invoice Preview & Edit Screen
```
+------------------------------------------------------------------+
| INVOICE PREVIEW                          [Edit] [Send] [Download] |
|                                                                    |
| ┌──────────────────────────────────────┐                          |
| │  [Company Logo]                       │                          |
| │                                       │                          |
| │  INVOICE #INV-2025-0456              │                          |
| │  Date: March 15, 2025                │                          |
| │  Due: April 14, 2025                 │                          |
| │                                       │                          |
| │  Bill To:         Ship To:           │                          |
| │  ACME Corp        Warehouse 3        │                          |
| │  Cairo, Egypt     10th Ramadan City  │                          |
| │                                       │                          |
| │  Item      | Qty | Price  | Total    │                          |
| │  Steel Rods| 500 | 120.00 | 60,000  │                          |
| │  Copper W. | 180 | 450.00 | 81,000  │                          |
| │                                       │                          |
| │  Subtotal:          EGP 141,000      │                          |
| │  VAT (14%):         EGP  19,740      │                          |
| │  Total:             EGP 160,740      │                          |
| │                                       │                          |
| │  Payment Terms: Net 30               │                          |
| │  Bank Details: [Company bank info]   │                          |
| └──────────────────────────────────────┘                          |
|                                                                    |
| Linked: SO-2025-0342 → DEL-2025-0891 → This Invoice              |
+------------------------------------------------------------------+
```

### Multi-Channel Send
```
+----------------------------------+
| SEND INVOICE                     |
|                                  |
| Channels:                        |
| [x] Customer Portal (instant)   |
| [x] Email (accounts@acme.com)   |
| [ ] WhatsApp (+20 10 xxxx xxxx) |
| [ ] Print & Mail                 |
|                                  |
| Attach: [x] PDF  [ ] E-invoice  |
| Message: [Pre-filled template__] |
|                                  |
| [Send Now]  [Schedule for ____]  |
+----------------------------------+
```

- Portal: Invoice appears in customer's portal immediately
- Email: PDF attachment + summary in body
- WhatsApp: PDF attachment + short message with amount and due date
- Status tracking: Sent → Viewed → Downloaded (per channel)

### Credit Note Generation
```
Credit Note linked to: INV-2025-0456
Reason: [Goods returned v] / [Price adjustment] / [Damaged goods] / [Other]
Lines affected: [Select from original invoice lines]
Amount: EGP 9,000 (auto-calculated from selected lines, or manual override)
Approval: Required if > EGP 10,000
```

---

## 7. Sales Pipeline / Kanban UX

### Stage Configuration for B2B Distribution
```
RFQ Received → Quoting → Quote Sent → Negotiating → Won / Lost
```

### Kanban Board Layout
```
| RFQ Received (4)  | Quoting (3)      | Quote Sent (5)   | Negotiating (2)  | Won (8)     |
| EGP 1.2M          | EGP 890K         | EGP 2.1M         | EGP 650K         | EGP 3.4M    |
|                    |                   |                   |                   |             |
| ┌──────────┐      | ┌──────────┐     | ┌──────────┐     | ┌──────────┐     |             |
| │ ACME Corp│      | │ Beta Ltd │     | │ Delta Co │     | │ Zeta Ind │     |             |
| │ EGP 340K │      | │ EGP 250K │     | │ EGP 520K │     | │ EGP 400K │     |             |
| │ 2 days   │      | │ 1 day    │     | │ 5 days   │     | │ 12 days  │     |             |
| │ Ahmed ●  │      | │ Sara ●   │     | │ Ahmed ●  │     | │ Sara ●   │     |             |
| │ ■■■□□    │      | │ ■■■■□    │     | │ ■■□□□    │     | │ ■■■■■    │     |             |
| └──────────┘      | └──────────┘     | └──────────┘     | └──────────┘     |             |
```

### Card Design (Each Deal)
```
┌─────────────────────────┐
│ ACME Corporation        │  ← Customer name (bold)
│ RFQ: Steel rods bulk    │  ← Short description
│                         │
│ EGP 340,000            │  ← Deal value (large)
│ 2 days in stage        │  ← Days counter (red if > threshold)
│                         │
│ Ahmed ●                │  ← Assigned rep (avatar dot)
│ Priority: ■■■□□        │  ← Visual priority indicator
│ Next: Follow up Mar 18 │  ← Next action
└─────────────────────────┘
```

### Drag-and-Drop vs. Click-to-Advance

**For B2B distribution: Click-to-advance is better.** Reasons:
- Stage transitions often require data entry (e.g., moving to "Quote Sent" should prompt for send confirmation)
- Accidental drags are costly (accidentally marking as Won/Lost)
- Mobile usage (drag is hard on touch)
- **Recommendation**: Click card → side panel opens → "Advance to [Next Stage]" button with required fields

**But keep drag-and-drop as an option** for power users who want speed. Add a confirmation dialog on critical transitions (Won/Lost).

### Filtering
- By sales rep (avatar row at top, click to filter)
- By customer (search/autocomplete)
- By value range (slider or preset ranges: <100K, 100K-500K, 500K-1M, >1M)
- By age in stage (overdue items highlighted)
- By product category

### Pipeline Analytics (in same view, collapsible)
- Conversion rate per stage
- Average time in each stage
- Total pipeline value
- Weighted pipeline (value x probability per stage)

---

## 8. Customer 360 / Account Page UX

### Layout: Fixed Header + Tabbed Content

**Header (always visible, ~120px):**
```
+------------------------------------------------------------------+
| [Logo] ACME Corporation                    Tier: Gold ★★★         |
| Cairo, Egypt | Since 2019 | Rep: Ahmed     Status: [● Active]    |
|                                                                    |
| ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐             |
| │ Lifetime │ │ Open     │ │ Credit   │ │ Avg Days │             |
| │ Revenue  │ │ Orders   │ │ Available│ │ to Pay   │             |
| │ EGP 12.4M│ │ 3        │ │ EGP 110K │ │ 38       │             |
| └──────────┘ └──────────┘ └──────────┘ └──────────┘             |
+------------------------------------------------------------------+
```

**Tab Structure:**
```
[Overview] [Contacts] [Quotes] [Orders] [Financials] [Documents] [Activity]
```

### Tab Contents

**Overview Tab:**
- Recent activity feed (last 10 events: orders, payments, communications)
- Quick stats: YTD revenue, order frequency, top products
- Upcoming: pending quotes, scheduled deliveries, overdue invoices
- Relationship health score (composite of payment behavior + order frequency + responsiveness)

**Contacts Tab:**
- Grid of contacts at this company
- Fields: Name, Title, Email, Phone, WhatsApp, Role (Decision Maker / Buyer / Accounts / Receiver)
- Primary contact flagged
- Last contacted date per person

**Quotes Tab:**
- List of all quotes, newest first
- Status badges (Draft, Sent, Accepted, Expired, Rejected)
- Quick actions: Duplicate, Resend, Convert to Order
- Filter by status, date range

**Orders Tab:**
- Order history with status pipeline indicator per order
- Columns: Order #, Date, Items, Total, Status, Delivery Date
- Click → full order detail

**Financials Tab:**
- Credit profile card (from Section 5)
- AR aging for this customer only
- Payment history chart (12 months)
- Outstanding invoices list
- PDC status for this customer

**Documents Tab:**
- All documents grouped: Invoices, Credit Notes, Delivery Notes, Contracts, Certificates
- Upload capability
- Version tracking

**Activity Tab:**
- Chronological timeline of ALL interactions
- Types: calls, emails, WhatsApp messages, portal activity, order events, payment events
- Filterable by type
- Each entry: timestamp, type icon, brief description, linked entity

### Why Tabs (Not Scrollable Sections)
- Customers have years of history; scrollable sections become unwieldy
- Tabs let the user focus on one context at a time
- URL-addressable tabs (deep linking: `/customers/acme/financials`)
- Keyboard-navigable: Tab key or number shortcuts (1-7)

---

## 9. Quote Builder UX

### Recommended: Single-Page with Sections (Not Step-by-Step Wizard)

B2B quotes need frequent back-and-forth between sections. A wizard forces linear flow. A single page with collapsible sections lets the user jump around.

### Layout
```
+------------------------------------------------------------------+
| QUOTE #Q-2025-0234                    Status: [Draft]  [● Save]  |
| Customer: [ACME Corp ▼]  Contact: [Mohamed Hassan ▼]             |
| Valid Until: [Apr 15, 2025]  Payment Terms: [Net 30 ▼]           |
+------------------------------------------------------------------+
|                                                                    |
| LINE ITEMS                                          [+ Add Line]  |
| ┌────────────────────────────────────────────────────────────────┐|
| │ # │ Product        │ Qty │ Unit  │ Cost   │ Price  │ Margin │ Total    │|
| │ 1 │ Steel Rods 12m │ 500 │ unit  │ 95.00  │ 120.00 │ 26.3%  │ 60,000  │|
| │ 2 │ Copper Wire 2mm│ 200 │ kg    │ 380.00 │ 450.00 │ 18.4%  │ 90,000  │|
| │ 3 │ [Search product...]                                        │|
| └────────────────────────────────────────────────────────────────┘|
|                                                                    |
| Discount: [0__]%  or  [0__] EGP flat                              |
|                                                                    |
|                          Subtotal:    EGP 150,000                 |
|                          Discount:    EGP 0                       |
|                          VAT (14%):   EGP 21,000                  |
|                          ─────────────────────                    |
|                          TOTAL:       EGP 171,000                 |
|                          Blended Margin: 22.1%                    |
|                                                                    |
+------------------------------------------------------------------+
| TERMS & CONDITIONS                              [Edit] [Template] |
| Payment: Net 30 from delivery date                                |
| Delivery: 7-10 business days from order confirmation              |
| Validity: This quote expires on April 15, 2025                   |
| [Standard terms attached as PDF]                                  |
+------------------------------------------------------------------+
| APPROVAL                                                          |
| Required: [● Yes — Margin below 20% on line 2]                   |
| Approver: Finance Manager                                         |
| Status: Pending                                                   |
+------------------------------------------------------------------+
| ACTIONS                                                           |
| [Send Quote ▼]  [Duplicate]  [Convert to Order]  [Delete Draft]  |
|   ├─ Via Portal                                                   |
|   ├─ Via Email                                                    |
|   └─ Via WhatsApp                                                 |
+------------------------------------------------------------------+
```

### Inline Editing
- Click any cell to edit in-place
- Product column: type-ahead search with recent products shown first
- Quantity: number input with +/- steppers
- Price: editable, with cost shown for reference (cost column visible to internal users, hidden on customer-facing quote)
- Margin: auto-calculated, turns red if below minimum threshold
- Drag rows to reorder, or keyboard Shift+Up/Down

### Margin Calculator Per Line
- Shows cost, price, and margin percentage for each line
- Color coding: green (>25%), yellow (15-25%), red (<15%)
- Blended margin for entire quote shown in summary
- **Approval auto-triggered** if any line falls below configurable threshold

### Send Flow
- "Send Quote" dropdown → select channel(s)
- Preview of what customer will see (PDF preview for email/WhatsApp, portal view for portal)
- Personalized message field (pre-filled with template)
- CC field for internal stakeholders
- Schedule send option

---

## 10. Data Visualization in Glass Windows

### Core Principles for Glass Panel Charts

**The glass panel IS the container.** Charts float inside semi-transparent panels rather than sitting on a canvas.

```
┌─────────────────────────────────────┐
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │  ← Frosted glass panel
│ ░  Revenue This Month          ░░░ │     background-blur: 12px
│ ░                              ░░░ │     background: rgba(255,255,255,0.08)
│ ░  EGP 2.4M                   ░░░ │     border: 1px solid rgba(255,255,255,0.12)
│ ░  ▁▂▃▅▆█▇▅▆▇█              ░░░ │     border-radius: 16px
│ ░  J F M A M J J A S O N D    ░░░ │
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
└─────────────────────────────────────┘
```

### Chart Types That Work in Glass Panels

| Chart Type | Best For | Glass Compatibility |
|---|---|---|
| **Sparkline** | Inline trend in KPI cards | Excellent — minimal, no axes needed |
| **Area chart (gradient fill)** | Revenue/volume over time | Excellent — gradient fades into glass |
| **Single-color bar chart** | Comparisons (top customers, products) | Good — use translucent bars |
| **Donut chart** | Composition (revenue by category) | Good — center can show total |
| **Progress bar / gauge** | Utilization, targets, credit usage | Excellent — native to glass aesthetic |
| **Line chart (thin)** | Trends with multiple series | Good — keep to 2-3 lines max |
| **Number + delta** | KPI with change indicator | Excellent — the purest glass metric |

### Chart Types to AVOID in Glass Panels
- **Pie charts**: Too heavy, too many colors
- **Stacked bar charts**: Too busy against translucent background
- **Scatter plots**: Dots get lost in glass blur
- **Complex tables**: Text density fights blur readability
- **3D charts**: Never. Especially not in glass.

### Color Palette for Charts in Glass
- **Primary data**: Single accent color (your brand blue/teal) at varying opacities
- **Secondary data**: White at 60% opacity
- **Positive delta**: Soft green glow (`rgba(74, 222, 128, 0.8)`)
- **Negative delta**: Soft red glow (`rgba(248, 113, 113, 0.8)`)
- **Gridlines**: `rgba(255, 255, 255, 0.06)` — barely visible
- **Axis labels**: `rgba(255, 255, 255, 0.5)` — subdued

### Readability Rules
- Maintain WCAG 4.5:1 contrast for data labels
- Use semi-opaque tint layer between glass and text
- Numbers should be `font-weight: 600` minimum on glass
- Keep blur between 8-16px (too much = foggy, too little = no effect)
- Design light and dark modes separately (same blur that works in dark mode may be too strong in light)

### Layout Patterns (Referencing Linear, Vercel, Stripe)

**Linear-style: Focused Metric Windows**
- One metric per glass panel
- Big number top-left, sparkline bottom
- Minimal chrome, no borders on charts
- Click panel to expand into detail view

**Vercel-style: Stacked Metric Cards**
- Horizontal row of 3-4 metric cards
- Each card: label, number, small chart, delta badge
- Cards are glass panels with consistent sizing
- Below cards: one larger panel with detailed chart

**Stripe-style: Clean Data Tables in Glass**
- Glass panel contains a clean table (not a chart)
- Alternating row opacity (0.03 and 0.06)
- Inline status badges with soft color fills
- Sort/filter controls built into column headers
- Pagination or virtual scroll inside the panel

### Interaction Patterns
- **Hover**: Glass panel brightens slightly (`background: rgba(255,255,255,0.12)`)
- **Click/Focus**: Panel gains subtle glow border (box-shadow with accent color at 20% opacity)
- **Expand**: Panel smoothly scales to fill view, other panels fade to 50% opacity
- **Drill-down**: Content cross-fades within same panel (no page navigation)

---

## Cross-Cutting UX Principles

### Keyboard-First (Per Your UI Vision)
- Every action reachable via keyboard shortcut
- Command palette (Cmd+K) for quick navigation: "Go to customer ACME", "New quote", "Record payment"
- Tab navigation through form fields with logical order
- Enter to confirm, Escape to cancel, at every level

### Glass Panel Consistency
- All modules use the same glass panel component
- Panels have consistent padding (24px), border-radius (16px), blur (12px)
- Content density varies per module but chrome is identical
- Panels are the ONLY container — no cards, no boxes, no sections — just glass panels

### AI Integration Points
- Payment matching: AI suggests matches, clerk confirms
- Credit scoring: AI recommends limit based on history
- Quote pricing: AI suggests based on market + margin targets
- Pipeline: AI predicts close probability per deal
- AR aging: AI prioritizes collection calls by likelihood of payment

---

## Sources

- [NetSuite AR Dashboard](https://www.netsuite.com/portal/resource/articles/accounting/accounts-receivable-ar-dashboard.shtml)
- [HighRadius Collections Best Practices](https://www.highradius.com/resources/Blog/7-collections-strategies-that-havent-aged/)
- [Versapay AR Aging Reports](https://www.versapay.com/resources/ar-aging-reports-how-to-create)
- [HighRadius Payment Invoice Matching](https://www.highradius.com/software/order-to-cash/cash-application-management/payment-invoice-matching/)
- [Coupa Invoice Matching](https://www.coupa.com/blog/what-is-invoice-matching/)
- [Optis 3-Way Match Best Practices](https://optisconsulting.com/best-practices-for-2-way-and-3-way-match/)
- [SAP 3-Way Match in MM/LIV](https://blog.erpsuites.com/blog/sap/ap/invoices-3-way-match-sap-mm-liv)
- [Odoo PDC Management Module](https://apps.odoo.com/apps/modules/18.0/pdc_management_account_odoo)
- [Absolute ERP PDC Management](https://www.erpabsolute.com/products/finance/pdc-management-software/)
- [D365 Credit Management](https://www.loganconsulting.com/blog/optimizing-credit-management-in-microsoft-dynamics-365-finance-and-supply-chain-management/)
- [Esker Credit Management](https://www.esker.com/business-process-solutions/order-to-cash/accounts-receivable-management-software/credit-management/)
- [HighRadius Credit Cloud](https://www.highradius.com/software/order-to-cash/credit-cloud/)
- [Quadient Invoice Delivery](https://www.quadient.com/en/ar-automation/invoice-delivery)
- [WhatsApp Invoice Delivery](https://www.tallyatcloud.com/article/whatsapp-invoice-delivery-in-2025-the-fastest-way-to-send-bills-reduce-payment-delays-and-improve-customer-communication/478/0/1)
- [PandaDoc CPQ](https://www.pandadoc.com/cpq-software/)
- [Pipedrive Pipeline Management](https://www.pipedrive.com/en/features/pipeline-management)
- [Pipedrive vs HubSpot CRM Comparison](https://routine-automation.com/blog/pipedrive-vs-hubspot/)
- [Salesforce Customer 360](https://www.salesforce.com/products/what-is-customer-360/)
- [Glassmorphism UI Best Practices](https://uxpilot.ai/blogs/glassmorphism-ui)
- [Glassmorphism Dashboard Figma Kit](https://www.figma.com/community/file/1514405085901665002/glassmorphism-dashboard-ui-kit)
- [Glassmorphism 2025 Trends](https://www.atvoid.com/blog/what-is-glassmorphism-the-transparent-trend-defining-2025-ui-design)
- [Leanpay AR Dashboard](https://www.leanpay.io/en/features/accounts-receivable-dashboard)
- [Growfin AR Automation Guide](https://www.growfin.ai/blog/accounts-receivable-automation-the-complete-2025-guide-to-efficient-operations)
