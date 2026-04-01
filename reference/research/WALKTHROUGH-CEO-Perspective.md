> ⚠️ **REFERENCE DOCUMENT — NOT THE SOURCE OF TRUTH**
> This file was written during the research phase and may contain outdated decisions, US-centric references, or superseded technical choices.
> **Always defer to `essential/RESEARCH.md` for current decisions.**
> Key changes since this file was written: TanStack Start (not Next.js), Capacitor (not Expo), React Aria (not shadcn), Egyptian law (not US FMCSA), EGP (not USD), dual auth pools, no online payments, no mobile wallets, spatial glass UI (not traditional dashboards).

# CEO Perspective: Complete Walkthrough
## HyperQuote CEO Command Center (ceo.hyperquote.net)

**Date:** 2026-03-29
**Subject:** Karim, CEO of HyperQuote -- a B2B building materials distributor in Egypt
**Device:** iPhone (primary), iPad and MacBook (secondary)
**App:** TanStack Start SPA/PWA at ceo.hyperquote.net
**Design:** Zero accent colors. Emphasis through typography weight and contrast only. Semantic status colors are the only non-gray colors.

---

## The App at a Glance

The CEO app is the most minimal of all five HyperQuote apps. There is no sidebar, no navigation bar, no dashboard cards, no KPI strips, no widgets. The entire interface is:

- Wide empty space (white in light mode, black in dark mode)
- A centered search bar
- The lion watermark at barely-perceptible opacity behind the search bar
- Nothing else

Everything Karim needs is summoned through the search bar. Type characters for instant database search. Press Enter or Send for AI conversation. That is the entire interaction model.

---

## 1. Monday 7:30 AM -- Karim Opens the App

Karim is in the back of a car heading to the office in Cairo. He pulls his phone from his pocket and taps the HyperQuote CEO icon on his home screen (PWA installed to home screen).

### What he sees

The screen loads in under one second (service worker cache for the shell, Cloudflare edge delivery). The app opens to:

- Pure white space (Karim uses light mode)
- The lion watermark, centered, at roughly 3-5% opacity -- barely visible, a ghost of the brand
- A search bar floating in the vertical center of the screen, horizontally centered
- Placeholder text in the search bar: a faint, rotating hint -- "Search employees, customers, orders..." in Inter 400, muted gray
- Above the search bar, a greeting: **"Good morning, Karim"** in Inter 600, text-2xl (20px), black. The greeting uses the system clock and his first name from the session. No exclamation marks.
- Below the greeting, if there are urgent items: a single line of text -- **"3 items need attention"** in Inter 400, text-base (14px), with "3" in Geist Mono 500 and the error semantic color (red-600). The number is tappable.

If there are no urgent items, the line below the greeting simply does not exist. There is no "Everything looks good" message. Absence is the message.

### What "items need attention" means

This count comes from a pre-computed materialized view (`ceo_attention_items`) refreshed every 5 minutes via pg_cron. It includes only items that cross predefined thresholds:

- Bounced cheques (any amount)
- AR overdue beyond 90 days above a configurable EGP threshold
- Credit limit breach requests pending approval
- Margin alerts (deals closed below floor margin)
- Delivery failures on high-value orders
- Supplier payment defaults

Karim taps "3 items need attention." The search bar slides upward with a spring animation. Below it, a clean list appears -- three items, each in a glass-tinted row:

```
[Error badge] Customer Y -- Bounced cheque -- EGP 250,000
              Today at 6:42 AM

[Warning badge] Delta Builders -- AR overdue 94 days -- EGP 1,800,000
                Since Dec 25, 2025

[Warning badge] Quote QT-1204 -- Margin 7.2% (floor: 10%)
                Approved by Sales Director yesterday
```

Each row has: a semantic status badge (error = red text on red-50 bg, warning = yellow-600 on yellow-50 bg), the entity name in Inter 500, a short description in Inter 400, and a timestamp in Geist Mono 400 text-xs. No icons, no avatars, no decorative elements.

Tapping any row crossfades to its detail view.

### First interaction

Karim taps the bounced cheque row. The attention list fades. A detail view slides in with a subtle spring animation. He sees:

```
Customer Y
Al-Masriya Construction Co.

Bounced Cheque                                    [Error]
Amount: EGP 250,000
Cheque #: 4478201
Bank: CIB
Date presented: Mar 28, 2026
Bounce reason: Insufficient funds

Related invoice: INV-3892
Invoice amount: EGP 420,000
Invoice date: Feb 15, 2026
Due date: Mar 15, 2026 (14 days overdue)

Customer credit status: EGP 1,200,000 limit / EGP 980,000 used
Account manager: Ahmed Fawzi

[Route to Finance]    [Route to Sales]    [Call Ahmed]
```

All monetary values in Geist Mono 500. The status badge uses the semantic error color. The three action buttons at the bottom are the only interactive elements -- rendered as text buttons with Inter 500, no background, separated by generous spacing. "Call Ahmed" triggers the phone's native dialer via `tel:` link.

Karim taps "Route to Finance." A minimal compose overlay appears (elevated glass):

```
Route to: [Finance]
Recipient: [auto-filled: Mona, AR Manager]

Message:
[Text area with placeholder: "Add context..."]

Priority: [Normal] [Urgent]

[Cancel]                              [Send]
```

Karim types "Follow up immediately. Put account on credit hold until resolved." Taps Urgent. Taps Send. A subtle toast appears at the top: "Routed to Mona." The toast auto-dismisses after 3 seconds. This creates a notification in the internal app (app.hyperquote.net) for Mona with the full context of the bounced cheque attached.

Karim taps the back arrow (or swipes right on iOS). He is back at the attention items. He mentally notes the other two items but does not act on them yet.

He swipes right again (or taps back). He is back at the home state -- wide space, search bar, greeting. The "3 items need attention" text is still there (he addressed one but the underlying data has not changed yet -- the count will update on the next materialized view refresh).

---

## 2. Karim Searches for an Employee

Karim wants to check on a new hire. He taps the search bar. The keyboard slides up. He types "A".

### What happens instantly

The search bar slides upward to the top of the screen (spring animation, 300ms). Below it, results begin streaming in, grouped by category. The search hits the `search_index` table -- a dedicated denormalized table that combines data from employees, customers, orders, suppliers, and products into a single searchable surface. pg_trgm handles the fuzzy matching; tsvector handles the full-text ranking. The query is debounced at 150ms and targets <100ms response time via Hyperdrive-cached Supabase queries.

Results appear grouped:

```
Employees (4)
  Ahmed Fawzi -- Sales Rep -- Sales
  Amira Hassan -- AR Clerk -- Finance
  Ali Mostafa -- Warehouse Worker -- Operations
  Aya Soliman -- Customer Service Agent -- CS

Customers (6)
  Al-Masriya Construction Co.
  Al-Faisal Group
  Apex Building Solutions
  Arab Contractors
  ...

Orders (2)
  ORD-A1204 -- Al-Masriya -- EGP 3,200,000
  ORD-A1198 -- Apex -- EGP 890,000

Products (3)
  Angle Iron 50x50x5
  Aluminum Composite Panel
  Anti-crack Mesh 4x4
```

Category headers are in Inter 500, text-sm (12px), uppercase tracking-wide, muted gray. Results under each category show the most relevant fields for that entity type. Monetary values are in Geist Mono. Each result row has comfortable touch targets (minimum 44px height per Apple HIG).

If there are more than 3 results in a category, a "View all" text link appears after the third result.

### Karim taps an employee

Karim taps "Ahmed Fawzi." The search results fade. A detail view slides in:

```
Ahmed Fawzi
Sales Rep -- Sales Department
Joined: Sep 12, 2024

Contact
  Phone: +20 100 XXX XXXX               [Call]
  Email: ahmed.fawzi@hyperquote.net      [Email]

Quick stats
  Active quotes: 8
  Pipeline value: EGP 12,400,000
  Win rate (90d): 34%
  Avg margin: 14.8%

Recent activity
  Mar 28 -- Sent quote QT-1210 to Nile Developers (EGP 2.1M)
  Mar 27 -- Closed order ORD-1201 from Arab Contractors (EGP 890K)
  Mar 26 -- Updated quote QT-1204 margin to 7.2%

[View full profile in HR →]
```

Numeric values in Geist Mono. The "View full profile in HR" link at the bottom is the deep link. Tapping it navigates to `app.hyperquote.net/hr/employees/{ahmed-fawzi-uuid}`. Because SSO cookies are shared across `.hyperquote.net` via `@supabase/ssr` with `Domain=.hyperquote.net`, Karim is already authenticated on the internal app. The internal app opens (either in the same PWA browser context if the internal app is not installed as a separate PWA, or opens the internal app PWA if installed). The full HR profile loads with complete employee data -- documents, attendance, leave history, compensation, performance notes.

### Navigation back

If Karim was redirected to the internal app, he uses the browser's back navigation or switches back to the CEO PWA. The CEO app state is preserved (service worker + TanStack Router state).

---

## 3. Karim Asks AI About Revenue

Back at the search bar, Karim types "revenue" and presses Enter (or taps the Send button on the mobile keyboard).

### The transition

The search results (if any were showing) fade out. The search bar slides to the top of the screen. An AI chat interface rises from the bottom with a tween animation. The chat area shows:

```
Karim: revenue

[Thinking indicator -- three subtle dots pulsing]
```

### AI routing (invisible to Karim)

The 4-tier AI system activates:

1. **GLM (Tier 1, free)** -- Intent classification. GLM-4.7-Flash on Cloudflare Workers AI receives the message, classifies intent as `analytics_query`, identifies the entity as `revenue`, and identifies the time scope as `current` (no specific period mentioned, so default to MTD). Cost: effectively zero.

2. **Groq (Tier 2, fast)** -- Chat generation. Groq receives the classified intent along with pre-computed metrics from the `ceo_metrics` materialized view. Groq composes the natural language response using the structured data. Latency: ~200ms.

Claude (Tier 3/4) is not invoked because this is a straightforward metrics query -- no complex reasoning or document search needed.

### What Karim sees

The thinking indicator is replaced by the AI response:

```
Karim: revenue

AI: Here is your revenue overview.

March 2026 (MTD)
  Revenue:          EGP 18,400,000
  vs. Feb 2026:     +12.3%
  vs. Mar 2025:     +28.7%

  Orders closed:    14
  Avg order value:  EGP 1,314,286
  Avg margin:       15.2%

Top 3 customers this month:
  1. Arab Contractors    EGP 4,200,000
  2. Nile Developers     EGP 3,800,000
  3. Delta Builders      EGP 2,900,000

[View revenue breakdown →]
```

All numbers in Geist Mono 500. The AI response text is in Inter 400. "View revenue breakdown" is a tappable link that opens a detailed view (still within the CEO app) showing revenue by customer, by product category, and by week.

The chat input bar sits at the bottom of the screen. Karim can continue the conversation.

### Karim follows up

Karim types: "break it down by product category"

The AI responds (Groq again, since this is still structured analytics):

```
AI: Revenue by product category, March 2026:

  Steel & Rebar         EGP 7,200,000    39.1%
  Cement & Concrete     EGP 4,600,000    25.0%
  Finishing Materials   EGP 3,100,000    16.8%
  Electrical            EGP 1,900,000    10.3%
  Plumbing              EGP 1,600,000     8.7%

Steel & Rebar continues to be the dominant category,
consistent with Q4 2025 trends.
```

Percentages in Geist Mono 400. The AI adds a brief insight sentence at the end -- this is generated by Groq based on trailing-12-month trend data from `business_data_embeddings`.

---

## 4. Karim Asks a Document Question

Still in the AI chat, Karim types: "what are our payment terms with El-Nasr Steel?"

### AI routing

1. **GLM (Tier 1)** -- Classifies intent as `document_search`, entity as `supplier:el-nasr-steel`, topic as `payment_terms`.

2. **RAG pipeline activates** -- The query is embedded (text-embedding-3-small, 1536 dimensions). The embedding is searched against `document_embeddings` using the `search_embeddings` function with `source_type = 'policy'` OR `'sop'` OR `'contract'`. The top 5 chunks by cosine similarity (threshold 0.7) are retrieved.

3. **Claude (Tier 4, complex reasoning)** -- Because this is a document-grounded answer requiring citation accuracy, Claude Sonnet receives the retrieved chunks plus the question. Claude synthesizes the answer and provides source citations. Cost: ~$0.01-0.03 per query.

### What Karim sees

```
Karim: what are our payment terms with El-Nasr Steel?

AI: Based on the supplier agreement signed on August 14, 2025:

Payment terms with El-Nasr Steel:
  Standard terms:     Net 60 from delivery
  Early payment:      2% discount if paid within 15 days
  Currency:           EGP only
  Payment method:     Wire transfer to CIB account
  Minimum order:      EGP 500,000

Additional notes:
  - Volume rebate: 1.5% on quarterly purchases exceeding EGP 5,000,000
  - Price validity: 30 days from quote date
  - Force majeure clause covers steel price volatility beyond ±15%

Source: El-Nasr Steel Supply Agreement (Aug 2025), pages 4-5
[View source document →]
```

The source citation at the bottom is critical. The document title and page reference come from the `metadata` JSONB field on the embedding chunk. "View source document" links to the PDF stored in R2, opened in a document viewer within the CEO app (or the browser's native PDF viewer on mobile).

### Citation confidence

If the RAG retrieval returns chunks below the 0.7 similarity threshold, the AI response includes a disclaimer:

```
AI: I found partial information but am not fully confident in the answer.
The closest match is from [document name], but it may not cover your
exact question. I recommend checking with Procurement directly.

[Route to Procurement]
```

---

## 5. Push Alert: Bounced Cheque

This scenario was covered in the opening (Karim saw it in his attention items), but here is the push notification flow for when Karim is NOT in the app.

### The trigger

At 6:42 AM, the Finance team records a bounced cheque in the internal app. The `cheque_bounced` event fires a database trigger. The trigger inserts a row into `ceo_notifications` with `tier = 'immediate'`. The notification edge function picks this up and sends a push notification via the Web Push API (service worker registered on the CEO PWA).

### What Karim sees on his phone

A native push notification appears on the lock screen:

```
HyperQuote
Customer Y's cheque bounced -- EGP 250,000
Cheque #4478201, CIB. Invoice INV-3892 (EGP 420,000, 14 days overdue).
```

The notification uses the standard iOS/Android notification format. No custom branding in the notification itself (platform limitation). The title is "HyperQuote." The body is concise -- entity, event, amount, context.

### Karim taps the notification

The CEO app opens directly to the bounced cheque detail view (deep link via the notification payload containing the entity type and ID). Karim sees the same detail view described in Section 1 -- the bounced cheque details with route-to-finance and call-Ahmed actions.

### Immediate tier criteria

Not every event sends a push. The three notification tiers:

| Tier | Delivery | Criteria |
|------|----------|----------|
| **Immediate** | Push notification | Bounced cheques (any), AR > 90 days crossing EGP threshold, credit limit breach, delivery failure on order > EGP 1M, margin below emergency floor |
| **Daily digest** | In-app + optional email, 7:00 AM | New orders, revenue summary, pipeline changes, supplier updates, HR flags |
| **Weekly insight** | In-app + email, Sunday 8:00 PM | Trend analysis, week-over-week comparisons, strategic recommendations |

Karim can configure which events are immediate vs. daily in the CEO app settings. Push notifications are paused between 11:00 PM and 6:00 AM by default (configurable), except for immediate-tier alerts.

---

## 6. Tuesday Morning -- Daily Digest

Karim opens the CEO app at 7:15 AM on Tuesday. The greeting says "Good morning, Karim." Below it, in addition to the attention items count (if any), there is a new line:

**"Tuesday digest ready"** in Inter 400, muted gray, tappable.

Karim taps it. The search bar slides up. The digest appears as a scrollable view:

```
TUESDAY, MARCH 30, 2026

Revenue yesterday: EGP 1,240,000                           +8% vs. Mon avg
Orders closed: 2
  ORD-1215 -- Nile Developers -- EGP 780,000 (margin 16.1%)
  ORD-1216 -- Cairo Towers -- EGP 460,000 (margin 13.8%)

Pipeline movement:
  3 new quotes sent (total: EGP 4,200,000)
  1 quote accepted (ORD-1215 above)
  2 quotes expired (EGP 890,000 total)

Cash position: EGP 8,400,000
  Inflows yesterday: EGP 2,100,000 (wire from Arab Contractors)
  Outflows yesterday: EGP 1,600,000 (payment to El-Nasr Steel)

AR aging snapshot:
  Current:         EGP 12,400,000
  1-30 days:       EGP 3,200,000
  31-60 days:      EGP 1,800,000
  61-90 days:      EGP 600,000
  90+ days:        EGP 1,800,000    [Warning]

Delivery performance:
  Deliveries completed: 4/4 (100% on-time)
  No delivery failures.

Supplier updates:
  El-Nasr Steel confirmed PO-0892 shipment for Apr 2
  Alexandria Cement price increase notice: +5% effective Apr 15

HR:
  1 new hire started: Youssef Kamal (Warehouse Worker)
  No leave requests pending approval.
```

All numbers in Geist Mono. Section headers in Inter 600. The "Warning" badge next to 90+ days AR uses the semantic warning color. The digest is generated by a pg_cron job at 6:00 AM daily that queries the relevant materialized views and compiles the data into a structured JSON payload stored in `ceo_digests`.

The digest is read-only. Karim scans it in 30-60 seconds. If something concerns him, he taps back to the home screen and uses the search bar or AI to dig deeper.

### Optional email delivery

The same digest content can be sent as a plain-text email (no HTML templates, no marketing formatting -- just clean text matching the app's minimal aesthetic). Karim configures this in settings. Default: in-app only.

---

## 7. Karim Queries Overdue Customers

From the home screen, Karim taps the search bar, types "which customers are overdue more than 60 days?" and presses Enter.

### AI routing

GLM classifies this as `analytics_query` with filters: `entity=customers`, `metric=ar_aging`, `threshold=60_days`. Groq generates the response using the `ar_aging_snapshots` materialized view (pre-computed daily at 1 AM).

### What Karim sees

```
Karim: which customers are overdue more than 60 days?

AI: 4 customers have outstanding balances overdue by more than 60 days,
totaling EGP 2,400,000:

  1. Delta Builders           EGP 1,800,000    94 days
     3 invoices, oldest: INV-3712 (Dec 25)
     Account manager: Ahmed Fawzi
     Last payment: Jan 15

  2. Al-Masriya Construction  EGP 250,000      72 days
     1 invoice: INV-3801 (Jan 16)
     Account manager: Ahmed Fawzi
     Note: Bounced cheque on Mar 28

  3. Sunrise Properties       EGP 200,000      65 days
     1 invoice: INV-3820 (Jan 23)
     Account manager: Sara Mahmoud
     Last payment: Feb 28 (partial)

  4. Metro Contracting        EGP 150,000      61 days
     1 invoice: INV-3845 (Jan 27)
     Account manager: Sara Mahmoud
     Last payment: Feb 10

Total exposure: EGP 2,400,000
% of total AR: 8.7%

Would you like me to break this down further or route an
action to Finance?
```

Each customer row is tappable -- tapping crossfades to the customer detail view showing full AR history, payment history, and contact details.

### Karim follows up in the same chat

Karim types: "put Delta Builders and Al-Masriya on credit hold"

The AI responds:

```
AI: I cannot directly change credit status -- that requires Finance
authorization. I can route this request to Mona (AR Manager) with
your instruction.

Route credit hold request for:
  - Delta Builders (EGP 1,800,000 overdue)
  - Al-Masriya Construction (EGP 250,000 overdue + bounced cheque)

To: Mona Ibrahim, AR Manager

[Send request]    [Cancel]
```

Karim taps "Send request." A routing notification is created in the internal app. The AI does not execute operational changes directly -- it routes instructions to the responsible person. This is a deliberate design decision: the CEO app is an observation and direction tool, not an operational execution tool.

---

## 8. Karim Asks for a Chart: Q1 Revenue vs. Last Year

Karim types: "Q1 revenue vs last year" and presses Enter.

### AI routing

GLM classifies: `analytics_query`, `metric=revenue`, `period=Q1_2026`, `comparison=Q1_2025`. The Analytics AI (Groq) pulls from `ceo_metrics` and `business_data_embeddings` (which include quarterly snapshots).

### What Karim sees

```
Karim: Q1 revenue vs last year

AI: Q1 2026 vs Q1 2025 revenue comparison:

                    Q1 2025         Q1 2026         Change
  January           EGP 14,200,000  EGP 16,800,000  +18.3%
  February          EGP 12,600,000  EGP 15,900,000  +26.2%
  March (to date)   EGP 15,800,000  EGP 18,400,000  +16.5%

  Q1 Total          EGP 42,600,000  EGP 51,100,000  +20.0%

  [Bar chart]
```

Below the table, a simple bar chart renders. The chart uses only black/dark-gray bars for Q1 2025 and a slightly lighter gray for Q1 2026 (no blue -- zero accent color rule in CEO app). The chart is generated client-side using a lightweight charting library (likely a minimal canvas-based renderer or SVG). Bars are labeled with Geist Mono values.

```
  ┌─────────────────────────────────────────────────────┐
  │                                                     │
  │  Jan  ██████████████ 14.2M                         │
  │       ████████████████▓ 16.8M                      │
  │                                                     │
  │  Feb  ████████████▓ 12.6M                          │
  │       ███████████████▓ 15.9M                       │
  │                                                     │
  │  Mar  ███████████████▓ 15.8M                       │
  │       ██████████████████ 18.4M                     │
  │                                                     │
  │  ■ Q1 2025   ▓ Q1 2026                            │
  └─────────────────────────────────────────────────────┘
```

The AI adds a brief insight:

```
AI: Revenue is up 20% year-over-year in Q1. February showed the
strongest growth at 26.2%, driven primarily by a EGP 3.8M order
from Nile Developers. March pace is on track to close above
EGP 20M if the current weekly run rate holds.
```

The insight is generated by Claude (Tier 4) because it requires multi-step reasoning: comparing growth rates, identifying the driver (largest order), and projecting the month-end. This is where Claude's complex reasoning tier earns its cost.

---

## 9. Friday -- Weekly Insight

On Friday (or Sunday in the Egyptian context, since the Egyptian work week is Sunday-Thursday), Karim receives his weekly insight. In the CEO app, the greeting shows:

**"Weekly insight ready"** -- tappable, similar to the daily digest.

The weekly insight is fundamentally different from the daily digest. The digest is data. The insight is analysis. The weekly insight is generated by Claude (Tier 4) using the full week's pre-computed data, trend comparisons, and business context from `business_data_embeddings`.

```
WEEK OF MARCH 23-27, 2026

Performance summary:
  Weekly revenue: EGP 6,800,000 (target: EGP 7,500,000) -- 90.7%
  Orders closed: 8 (avg: 10/week trailing 4 weeks)
  Average margin: 14.6% (target: 15%) -- slightly below floor
  On-time delivery: 92% (18/19 deliveries, 1 rescheduled)
  Cash collected: EGP 5,200,000 vs. EGP 4,800,000 invoiced

Key observations:

  1. Revenue gap driven by delayed closes
     3 quotes totaling EGP 4.1M are in final negotiation but did not
     close this week. All three have verbal commitment. Expected to
     close next week. If they do, the month will finish above target.

  2. Margin compression on steel orders
     Average margin on steel orders dropped to 12.1% this week from
     14.8% trailing average. This correlates with El-Nasr Steel's
     recent price increase. Recommend reviewing steel pricing strategy
     with Sales before the April 15 price adjustment takes effect.

  3. AR aging trend is worsening
     Total 60+ day AR increased from EGP 1,900,000 to EGP 2,400,000
     this week. Delta Builders accounts for 75% of the increase. If
     Delta does not pay by mid-April, consider engaging legal counsel.

  4. Positive signal: Nile Developers expanding
     Nile Developers placed their third order this quarter (EGP 780K).
     Their quarterly spend is now EGP 4,600,000, up from EGP 1,200,000
     in Q1 2025. They may be the fastest-growing account. Consider
     assigning a dedicated account manager.

Recommended actions:
  - Schedule pricing review meeting with Sales Director (steel margins)
  - Escalate Delta Builders AR to legal if no payment by April 15
  - Consider dedicated account manager for Nile Developers
```

The insight uses Inter 400 for body text, Inter 600 for section headers. The numbered observations are the core content -- written in natural language by Claude, not just data points. The "Recommended actions" section at the bottom gives Karim specific next steps.

Each recommended action has a subtle [Route] button that lets Karim send it as an instruction to the relevant person (Sales Director, Legal, HR).

---

## 10. Karim Spots a Problem and Takes Action

While reviewing the weekly insight, Karim notices the margin compression on steel orders. He wants to act.

### Option A: Route from the insight

Karim taps the [Route] button next to "Schedule pricing review meeting with Sales Director." A routing overlay appears:

```
Route to: [Sales]
Recipient: [auto-filled: Omar, Sales Director]

Message: "Schedule a pricing review meeting for steel products
this week. Margins dropped to 12.1%. We need a strategy before
El-Nasr's April 15 price increase."

Priority: [Normal] [Urgent]

[Cancel]                              [Send]
```

Karim edits the message, sets it to Urgent, and sends. Omar receives a push notification in the internal app.

### Option B: Use the AI to compose

Karim goes to the search bar, opens AI chat, and types:

"Tell Omar to schedule a steel pricing review meeting this week. Margins are down to 12%. We need a plan before April 15."

The AI responds:

```
AI: I will route this message to Omar (Sales Director):

"Karim requests a steel pricing review meeting this week. Steel
margins dropped to 12.1% this week vs. 14.8% trailing average.
Action needed before El-Nasr Steel's April 15 price increase
takes effect."

Priority: Urgent
Delivery: Push notification + in-app

[Send]    [Edit before sending]    [Cancel]
```

The AI reformulates Karim's casual language into a professional internal message, adds the supporting data (it knows the exact margin numbers from context), and presents it for confirmation. Karim never sends a message without reviewing it first.

### Option C: Deep link to the internal app

If Karim wants to handle something directly that requires the internal app (approving a credit limit increase, reviewing a quote in detail), the CEO app surfaces a "View in app" link that deep-links to the relevant page in `app.hyperquote.net`. The CEO app is for observation and direction. The internal app is for execution.

---

## Edge Cases

### Edge Case 1: Karim searches for something that does not exist

Karim types "Pyramids Construction" in the search bar. No results match in any category.

**What he sees:**

The search results area shows:

```
No results for "Pyramids Construction"

Try searching by:
  - Company trade name or legal name
  - Customer account number
  - Employee name or department
```

The empty state is clean -- no sad face icon, no illustration, no lion. Just clear text in Inter 400 with helpful suggestions in muted gray. The search bar remains active so Karim can immediately refine his query.

If Karim presses Enter on a no-result query, the AI opens and responds:

```
AI: I could not find "Pyramids Construction" in the system. This
company is not registered as a customer or supplier.

Would you like me to:
  - Search for similar names (Pyramid Builders, Pyramids Group)?
  - Route a request to Sales to look into this company?
```

The AI provides fuzzy alternatives (from pg_trgm similarity scores that were below the display threshold for instant search but above zero) and offers an actionable fallback.

---

### Edge Case 2: The AI gives wrong information

Karim asks: "What was our revenue last March?" The AI responds with a number. Karim knows it is wrong -- perhaps because the data migration missed some legacy orders, or the materialized view has stale data.

**How the app handles this:**

Every AI response includes a subtle footer:

```
Source: Analytics (pre-computed Mar 29, 06:00 AM)    [Report issue]
```

or for RAG responses:

```
Source: El-Nasr Steel Agreement (Aug 2025), p.4-5    [Report issue]
```

The source line is in Inter 400 text-xs, muted gray. It shows where the data came from and when it was last computed.

If Karim taps [Report issue], a minimal form appears:

```
Report data issue

What is wrong?
  ( ) Number seems incorrect
  ( ) Information is outdated
  ( ) Missing data
  ( ) Other

Details (optional):
[Text area]

This report will be sent to the system administrator.

[Cancel]    [Submit]
```

The report creates a ticket in the support system tagged `ceo_data_issue` with high priority. The admin team investigates whether the underlying data, the materialized view, or the AI prompt/retrieval is at fault.

Additionally, the AI proactively hedges when confidence is low. If the RAG similarity scores are between 0.7-0.8, the AI includes: "This information is based on available documents but may not be fully current. Verify with [department] for the latest terms."

---

### Edge Case 3: Karim wants to approve something from the CEO app

Karim receives a push notification: "Credit limit increase request: Delta Builders from EGP 1,200,000 to EGP 2,000,000. Requires CEO approval."

**The approval flow:**

Karim taps the notification. The CEO app opens to an approval detail view:

```
Approval Required

Credit Limit Increase
Customer: Delta Builders
Current limit: EGP 1,200,000
Requested limit: EGP 2,000,000
Increase: +66.7%

Requested by: Mona Ibrahim (AR Manager)
Reason: "Customer has a new EGP 8M project starting in April.
Current limit insufficient to cover expected order volume."

Supporting data:
  Customer since: Jun 2023
  Lifetime revenue: EGP 18,400,000
  Current AR: EGP 980,000 (82% of limit)
  Payment history: Avg 42 days to pay
  Bounced cheques (12 months): 1 (EGP 250,000, Mar 28)
  Credit score: B+ (internal rating)

Warning: This customer has a bounced cheque from 2 days ago.

[Approve]    [Reject]    [Request more info]
```

The approval is a genuine write operation. The CEO app has permission to execute approvals that are specifically routed to the CEO role. This is handled via a dedicated `ceo_approvals` table and RLS policies that allow the CEO user to update approval status. The actual credit limit change in the `customers` table is triggered by a database function that fires when the approval status changes to `approved`.

Karim sees the bounced cheque warning (semantic error color) and taps "Reject." A reason field appears:

```
Rejection reason:
[Text area with placeholder: "Add reason..."]

Pre-filled: "Cannot approve increase while bounced cheque
(EGP 250,000, Mar 28) remains unresolved."

[Cancel]    [Confirm rejection]
```

The rejection reason is pre-filled by the AI (which noticed the conflict) but Karim can edit it. He confirms. The rejection notification goes back to Mona with the reason attached.

**What approvals are supported in the CEO app:**

- Credit limit increases/decreases
- Large discounts (below margin floor)
- Write-off authorization (above threshold)
- New supplier onboarding (above spend threshold)
- Expense approvals (above threshold)

Approvals are the ONE area where the CEO app performs write operations. Everything else is read + route.

---

### Edge Case 4: Karim is offline (poor connection)

Karim enters a parking garage with no signal, or is on a Cairo highway with intermittent 4G.

**What happens:**

The PWA service worker detects the connection loss. A subtle banner appears at the top of the screen:

```
You are offline -- showing cached data
```

The banner is a thin strip -- 28px height, muted gray background, Inter 400 text-xs. It does not obstruct the interface.

**What still works:**

- The app shell loads (cached by service worker)
- The most recent daily digest is available (cached in IndexedDB)
- The most recent search results Karim viewed are available (TanStack Query gcTime = 10 minutes)
- The most recent AI conversation is available (cached locally)
- The attention items count from the last refresh is shown (may be stale)

**What does not work:**

- New searches return no results (search requires a database query). The search bar shows: "Search unavailable offline"
- AI chat shows: "AI requires a connection. Your previous conversation is available above."
- Approvals are disabled. The approve/reject buttons are hidden (not grayed out -- hidden, per the UI vision's rule that unauthorized/unavailable elements are hidden, not disabled). If Karim taps where an approve button was, nothing happens.
- Routing messages are queued. If Karim composes a route-to-finance message while offline, it is stored locally and sent when connectivity resumes. A subtle indicator shows: "Message queued -- will send when online."

**When connection returns:**

The offline banner auto-dismisses. Data refreshes silently in the background. If Karim had queued a routing message, a toast confirms: "Queued message sent to Mona."

---

### Edge Case 5: Karim wants to share data with his board

Karim has a board meeting next week. He wants to share the Q1 revenue comparison and the AR aging report.

**Option A: Screenshot**

The simplest path. Karim takes a screenshot on his phone or tablet. The CEO app's minimal design produces clean, readable screenshots with no visual clutter.

**Option B: Export from AI chat**

In the AI chat, after receiving the Q1 revenue comparison, Karim sees a subtle [Export] button at the bottom of the AI response:

```
[Export as PDF]    [Copy to clipboard]
```

"Export as PDF" generates a clean PDF with:
- HyperQuote letterhead (logo + company details)
- The data table from the AI response
- The chart (if one was rendered)
- A footer: "Generated from HyperQuote CEO Command Center, Mar 29, 2026"
- No AI branding or chat UI in the export -- just clean data

The PDF is generated client-side (or via a Cloudflare Worker edge function that renders the HTML to PDF) and shared via the native iOS/Android share sheet (share to WhatsApp, email, AirDrop, etc.).

"Copy to clipboard" copies the data as formatted text (preserving the Geist Mono number alignment) for pasting into an email or document.

**Option C: Scheduled board report**

In the CEO app settings, Karim can configure a recurring export:

```
Board report: Monthly
Contents: Revenue summary, AR aging, margin trends, top customers,
           pipeline overview
Format: PDF
Delivery: Email to [board-distribution-list@company.com]
Schedule: 1st of every month at 8:00 AM
```

This is a pg_cron job that triggers a Cloudflare Worker to compile the report from materialized views and email it via the notification system.

---

## Complete Gap Analysis

### GAP 1: Search Index Table -- Not Designed

The `search_index` table that unifies employees, customers, orders, suppliers, and products into a single searchable surface is referenced in the architecture but not yet designed in the database schema. Specifically missing:

- Table schema for `search_index` (columns, types, indexes)
- pg_trgm similarity threshold configuration
- tsvector weight distribution for cross-entity search
- Trigger or pg_cron mechanism to keep `search_index` synchronized with source tables
- How search results are ranked when results span multiple entity types
- Pagination strategy for search results (infinite scroll vs. "View all" per category)

### GAP 2: CEO Materialized Views -- Not Defined

The following materialized views are referenced but not designed:

- `ceo_attention_items` -- What exact queries define "needs attention"? What are the configurable thresholds?
- `ceo_metrics` -- What exact metrics are pre-computed? Revenue, margin, cash, AR aging, OTIF -- but at what granularity? MTD, QTD, YTD, trailing 30/60/90 days?
- `ceo_digests` -- What is the storage format? JSON blob? Structured table?
- Refresh schedule for each view (5 min? 15 min? Hourly? Daily?)
- Materialized view refresh strategy: `REFRESH MATERIALIZED VIEW CONCURRENTLY` requires a unique index -- what are the unique keys?

### GAP 3: AI Chat Conversation Persistence

Unclear from the research:

- Are AI conversations persisted across sessions? If Karim closes the app and reopens, does he see his conversation history?
- Is there a conversation list (like ChatGPT's sidebar)? Or does each session start fresh?
- Where are conversations stored -- Supabase `ai_conversations` table? Local IndexedDB?
- Is there a limit on conversation length or history retention?
- Can Karim search his past AI conversations?

### GAP 4: Routing/Delegation System -- Not Designed

The "Route to Finance/Sales/Procurement" flow is described but the underlying system is not:

- What table stores routing messages? Is it the same as `notifications`? A separate `ceo_directives` table?
- How does a routed message appear in the internal app? As a notification? A task? A comment on an entity?
- Does the recipient need to acknowledge/complete the routed task? Is there a status lifecycle (sent, seen, in-progress, completed)?
- Can Karim see the status of his past routed instructions? ("I told Mona to put Delta on credit hold three days ago -- did she do it?")
- Escalation: what happens if a routed instruction is not acted upon within a configurable timeframe?

### GAP 5: Approval Queue and Workflow

The credit limit approval is described, but the system is not:

- Where is the `ceo_approvals` table? What is its schema?
- How does a request enter the CEO approval queue? Which events from which departments create CEO-level approvals?
- Are there approval thresholds (e.g., credit limit increases under EGP 500,000 can be approved by the Finance Manager, above that requires CEO)?
- Multi-step approvals: does CEO approval come after or instead of other approvals?
- Approval SLA: is there a timeout after which an unapproved request auto-escalates or auto-rejects?
- Can Karim delegate approvals to another person (e.g., the COO) when he is unavailable?

### GAP 6: Chart Rendering Technology

The CEO app renders charts in AI responses, but:

- What charting library? Must be lightweight (CEO app is mobile-first). Options: lightweight SVG (custom), Chart.js (moderate), or server-rendered chart images
- How does the AI specify chart data? Does the AI return structured chart JSON that the frontend interprets? Or does the AI return markdown-like syntax?
- Chart interaction: can Karim tap a bar to see details? Or are charts static?
- Chart rendering in exported PDFs -- client-side canvas-to-image? Server-side rendering?
- The zero-accent-color rule means charts use only grays and semantic colors. Is that sufficient for readability when comparing multiple series?

### GAP 7: Arabic Language Experience

The research mentions Arabic-Indic numerals and RTL support, but:

- Can Karim switch the CEO app to Arabic? If so, is the AI capable of responding in Arabic?
- Are AI prompts/responses bilingual? Does the AI detect language from input?
- Arabic search: does pg_trgm work with Arabic characters? (Answer: yes, but configuration is different -- Arabic text tokenization does not use English stemming)
- Daily digest and weekly insight: are these available in Arabic or English only?
- Export PDFs: do they support Arabic RTL layout?

### GAP 8: Push Notification Configuration

- Where does Karim configure notification preferences? A settings screen in the CEO app?
- What does the settings screen look like? (It must follow the spatial glass design)
- Can Karim configure per-entity thresholds (e.g., "alert me on bounced cheques above EGP 100,000 only")?
- Can Karim mute all notifications temporarily ("Do not disturb" mode)?
- Push notification permissions: what if Karim denies push permission in the browser? Fallback to email? SMS?

### GAP 9: Board Report/Export System

- The export-as-PDF feature is described but not designed
- PDF generation: client-side (jsPDF? html2canvas?) or server-side (Cloudflare Worker with Puppeteer/Playwright)?
- Template system for board reports: who designs the layout? Is it hardcoded or configurable?
- Recurring board report: how does Karim configure the email recipients? Is there a mailing list management feature?
- Data access control: if the PDF contains sensitive financial data, is there access control on the generated file?

### GAP 10: Session and Authentication Edge Cases

- Session timeout: what happens if Karim's session expires while he is in the middle of an AI conversation? (Supabase token refresh should handle this silently, but edge cases exist)
- Biometric lock: should the CEO app require Face ID / fingerprint on every open (given the sensitivity of the data)?
- Multiple devices: if Karim opens the CEO app on his phone AND his iPad simultaneously, are notifications delivered to both? Does read status sync?
- Account compromise: if someone gains access to the CEO PWA, what is the blast radius? Can they approve credit limit changes? (Yes, per the current design -- this may need a second factor for approvals)

### GAP 11: Offline Queue Conflict Resolution

- If Karim queues a routing message offline and the underlying data changes before the message is sent (e.g., the bounced cheque is resolved while he is offline), the message may be outdated
- Should queued messages include a staleness check on send?
- Should the app warn: "This was composed 45 minutes ago. The situation may have changed. [Send anyway] [Review first]"?

### GAP 12: Performance Metrics and Targets

- The weekly insight references "target: EGP 7,500,000" and "target: 15% margin" -- where are these targets configured?
- Is there a target-setting interface in the CEO app? Or in the internal app only?
- Are targets set annually, quarterly, monthly? By whom?
- How do targets feed into the AI's analysis? Are they stored in a `business_targets` table?

### GAP 13: Data Freshness Indicators

- The daily digest shows "pre-computed Mar 29, 06:00 AM" -- but what about real-time data?
- If Karim asks "what is revenue right now?" at 3 PM, does the AI show the 6 AM pre-computed number or a live query?
- Should the CEO app distinguish between "live data" and "snapshot data"?
- What is the maximum acceptable staleness for each data type?

### GAP 14: CEO App Settings Screen

The CEO app has settings (notification preferences, language, dark mode, board report config, DND schedule), but:

- What does the settings screen look like? Glass panel? Accessible from where?
- Is there a settings icon somewhere, or is it accessed via search ("settings") or AI ("open settings")?
- The UI vision says no sidebar, no nav -- so how does the user discover settings?

### GAP 15: Onboarding and First-Time Experience

- When Karim first installs the CEO PWA, what does he see?
- Is there a brief tour? Or does the empty-space-plus-search-bar speak for itself?
- Does the app suggest installing to home screen? (UI Vision says: "In settings only. Never auto-prompt.")
- Is there a brief text like "Type to search, press Enter for AI" on first use?

### GAP 16: Multi-Tenant Considerations

- The database schema includes `tenant_id` on all tables -- is the CEO app always single-tenant?
- If HyperQuote expands to multiple subsidiaries or branches, does each branch CEO get their own view?
- Or is this a non-issue because HyperQuote is a single company?

### GAP 17: Audit Trail for CEO Actions

- Every routing message and approval from the CEO app should be logged immutably
- Who can see what the CEO did? (Audit trail for compliance)
- Is the `entity_timeline` audit log used for CEO actions?
- Are AI conversations logged? (They should be, for data governance)

### GAP 18: Egyptian Work Week and Calendar

- The weekly insight was described as arriving on Friday, but the Egyptian work week is Sunday-Thursday
- The digest and insight schedule must account for Egyptian holidays (Eid, national holidays)
- Should the system auto-detect working days from an Egyptian holiday calendar?
- Ramadan hours: should digest timing change during Ramadan?

### GAP 19: Currency Formatting Specifics

- The examples show "EGP 250,000" -- but the UI vision says Egyptian format is "250,000 ج.م"
- Which format does the CEO app use? International (EGP prefix) or local (ج.م suffix)?
- Is this user-configurable? Language-dependent (English = EGP, Arabic = ج.م)?
- Thousands separator: comma in English (250,000), but Arabic uses a different convention

### GAP 20: Deep Link Behavior Between Apps

- When Karim taps "View full profile in HR" and goes to `app.hyperquote.net/hr/employees/{id}`:
  - Does the internal app open in the same browser tab (replacing the CEO PWA)?
  - Or does it open in a new tab?
  - If the CEO PWA is installed as a standalone PWA, does the link open in the system browser or inside the PWA?
  - Can Karim navigate back to the CEO app seamlessly?
  - What if Karim does not have internal app access for a specific module?

---

*This document covers the complete CEO perspective walkthrough and identifies 20 gaps that require design decisions or additional research before implementation.*

*Created: 2026-03-29*
*Companion research: UI-VISION.md, RESEARCH-Multi-App-Architecture-Connecting-5-Apps.md, RESEARCH-Complete-Supabase-Database-Design.md, RESEARCH-AI-Inference-Providers-GLM-vs-Groq.md, RESEARCH-Internal-App-Communication-Architecture.md*
