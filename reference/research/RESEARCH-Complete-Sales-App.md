> ⚠️ **REFERENCE DOCUMENT — NOT THE SOURCE OF TRUTH**
> This file was written during the research phase and may contain outdated decisions, US-centric references, or superseded technical choices.
> **Always defer to `essential/RESEARCH.md` for current decisions.**
> Key changes since this file was written: TanStack Start (not Next.js), Capacitor (not Expo), React Aria (not shadcn), Egyptian law (not US FMCSA), EGP (not USD), dual auth pools, no online payments, no mobile wallets, spatial glass UI (not traditional dashboards).

# RESEARCH: Complete Sales App for HyperQuote B2B Building Materials Distribution

**Research Date:** 2026-03-28
**Scope:** Every screen, workflow, feature, and integration for the sales rep application in a quote-based B2B building materials distributor
**Context:** No published prices (RFQ model). Orders $100K-$100M+. Sales reps handle inbound RFQs, outbound prospecting, quote building, negotiation, and customer relationship management. Offline payments. Multi-supplier sourcing. Construction company customers.

---

## Table of Contents

1. [Sales App Screens — Every Single One](#1-sales-app-screens--every-single-one)
2. [RFQ Inbox and Triage](#2-rfq-inbox-and-triage)
3. [Quote Builder UX](#3-quote-builder-ux)
4. [Supplier Cost Visibility for Sales](#4-supplier-cost-visibility-for-sales)
5. [Negotiation Tracking](#5-negotiation-tracking)
6. [Customer 360 View](#6-customer-360-view)
7. [Pipeline and Forecasting](#7-pipeline-and-forecasting)
8. [CRM Features for High-Value B2B](#8-crm-features-for-high-value-b2b)
9. [Mobile Sales App](#9-mobile-sales-app)
10. [Sales AI Assistant](#10-sales-ai-assistant)
11. [Commission and Performance Tracking](#11-commission-and-performance-tracking)
12. [Integration with Other Modules](#12-integration-with-other-modules)
13. [Real Sales Tools in Distribution — Competitive Analysis](#13-real-sales-tools-in-distribution--competitive-analysis)

---

## 1. Sales App Screens — Every Single One

### 1.1 Home Dashboard

The dashboard is the sales rep's command center upon login. It must provide a morning briefing — what happened overnight, what needs attention today, and where the money is.

**Layout: Three-Zone Design**

```
+------------------------------------------------------------------+
|  TOP BAR: Today's Date | Greeting | Quick Search | Notifications |
+------------------------------------------------------------------+
|                                                                    |
|  ZONE 1: URGENT ATTENTION (Red/Orange indicators)                 |
|  +--------------------+  +--------------------+  +--------------+ |
|  | RFQs Awaiting      |  | Quotes Expiring    |  | Overdue      | |
|  | Response: 7        |  | This Week: 4       |  | Follow-ups: 3| |
|  | Oldest: 4hrs ago   |  | Total Value: $2.1M |  |              | |
|  +--------------------+  +--------------------+  +--------------+ |
|                                                                    |
|  ZONE 2: PIPELINE SNAPSHOT                                        |
|  +--------------------------------------------------------------+ |
|  | Pipeline Value: $47.2M | Weighted: $18.8M | MTD Won: $5.1M  | |
|  | [=========>          ] 64% of monthly target                  | |
|  |                                                                | |
|  | Mini funnel chart: RFQ(12) > Quoting(8) > Sent(15) >         | |
|  |                    Negotiating(6) > Won(3) Lost(2)            | |
|  +--------------------------------------------------------------+ |
|                                                                    |
|  ZONE 3: TODAY'S AGENDA + ACTIVITY FEED                           |
|  +---------------------------+  +-------------------------------+ |
|  | 9:00 Call - ABC Concrete  |  | 8:47 New RFQ from MetroBuild | |
|  | 10:30 Site Visit - XYZ    |  | 8:32 Quote #4521 viewed by  | |
|  | 14:00 Quote Review - DEF  |  |      customer (3rd time)     | |
|  | 16:00 Internal pricing    |  | 8:15 Order #1209 shipped    | |
|  |        meeting            |  | Yesterday: Won Quote #4498  | |
|  +---------------------------+  +-------------------------------+ |
+------------------------------------------------------------------+
```

**Data Displayed:**
- **RFQ count and aging**: Number of unresponded RFQs, time since oldest arrived, customer tier of each
- **Expiring quotes**: Quotes whose validity period ends within 3/5/7 days, with total value at risk
- **Overdue follow-ups**: Promised callbacks, pending clarifications, stale negotiations
- **Pipeline summary**: Total pipeline value (unweighted), weighted forecast, monthly/quarterly target progress
- **Mini funnel visualization**: Deal count per stage with stage-to-stage conversion arrows
- **Today's calendar**: Meetings, calls, site visits pulled from integrated calendar
- **Live activity feed**: Real-time stream of customer actions (RFQ submitted, quote viewed, order placed), system events (delivery shipped, payment received), and team notifications
- **Personal KPIs**: MTD revenue, margin %, win rate, average response time to RFQs

**Actions Available:**
- Click any RFQ to open it directly
- Click any quote to open detail/negotiation view
- Quick-add: New RFQ, new contact, new note, log a call
- Filter activity feed by type (customer actions, system events, team)
- Set date range for KPI cards (MTD/QTD/YTD)

---

### 1.2 RFQ Inbox Screen

A dedicated inbox for all inbound quote requests. This is the highest-traffic screen for inside sales reps.

**Layout: Email-Inbox Style with Enhanced Metadata**

```
+------------------------------------------------------------------+
| INBOX TOOLBAR:                                                     |
| [All] [My RFQs] [Unassigned] [Needs Clarification] [Urgent]     |
| Sort: [Newest] [Oldest] [Highest Value] [Customer Tier]          |
| Filter: [Date Range] [Customer] [Material Category] [Status]     |
+------------------------------------------------------------------+
| PRIORITY | AGE    | CUSTOMER          | TIER | EST VALUE  | ITEMS|
|----------|--------|-------------------|------|------------|------|
| !!!      | 2h 15m | MetroBuild Corp   | A    | $1.2M      | 47   |
| !!       | 5h 30m | Pacific Concrete   | A    | $890K      | 23   |
| !!       | 1d 2h  | Summit Builders    | B    | $340K      | 15   |
| !        | 3h 45m | Valley Materials   | B    | $125K      | 8    |
|          | 6h 10m | GreenField Dev     | C    | $67K       | 31   |
| CLAR     | 2d 1h  | Apex Construction  | B    | ~$200K     | 12   |
+------------------------------------------------------------------+
| PREVIEW PANE (right side or bottom):                               |
| Customer: MetroBuild Corp                                          |
| Contact: Sarah Chen, Procurement Director                          |
| Project: Downtown Tower Phase 2                                    |
| Requested Delivery: April 15, 2026                                |
| Materials: Structural Steel (60%), Rebar (25%), Fasteners (15%)   |
| Notes: "Need pricing urgently — competitor quoted already"         |
| Customer History: 12 orders, $8.2M lifetime, Avg margin 18%      |
| AR Status: Current, $0 overdue                                    |
| [OPEN] [ASSIGN TO ME] [ASSIGN TO...] [REQUEST CLARIFICATION]     |
+------------------------------------------------------------------+
```

**Data Per RFQ Row:**
- Priority indicator (auto-calculated from customer tier + estimated value + age + delivery urgency)
- Age timer (counting since submission — changes color at 2h, 4h, 8h, 24h thresholds)
- Customer company name with tier badge (A/B/C)
- Estimated quote value (AI-estimated from material quantities and recent pricing)
- Line item count
- Status: New, Assigned, In Progress, Needs Clarification, Quoted, Expired
- Assigned rep (photo/initials)

**Actions Available:**
- Assign to self or another rep
- Open full RFQ detail
- Request clarification from customer (sends message through portal)
- Convert directly to quote builder
- Bulk actions: assign multiple, mark as priority, archive
- Quick-view customer history without leaving inbox

---

### 1.3 RFQ Detail Screen

When a rep opens a specific RFQ, they see everything needed to decide whether and how to quote.

```
+------------------------------------------------------------------+
| RFQ #2847 — MetroBuild Corp — Downtown Tower Phase 2             |
| Status: NEW | Submitted: Mar 28, 2026 8:47 AM | Age: 2h 15m     |
+------------------------------------------------------------------+
|                                                                    |
| LEFT COLUMN (60%): MATERIAL REQUEST                               |
| +--------------------------------------------------------------+ |
| | # | Material          | Spec        | Qty    | Unit | Notes  | |
| |---|-------------------|-------------|--------|------|--------| |
| | 1 | Structural Steel  | ASTM A992   | 450 MT | MT   | W-beam | |
| | 2 | Rebar #4          | Grade 60    | 200 MT | MT   |        | |
| | 3 | Rebar #8          | Grade 60    | 150 MT | MT   |        | |
| | 4 | Concrete Anchors  | 3/4" x 6"  | 5,000  | EA   | Hilti  | |
| | ...47 total items                                              | |
| +--------------------------------------------------------------+ |
|                                                                    |
| Delivery Requirements:                                            |
| - Location: 123 Main St, Metro City                              |
| - Requested Date: April 15, 2026 (18 days from now)             |
| - Delivery Type: Jobsite delivery, crane offload required        |
| - Special Instructions: "Must arrive before 6AM, gated site"    |
|                                                                    |
| RIGHT COLUMN (40%): CUSTOMER CONTEXT                              |
| +--------------------------------------------------------------+ |
| | CUSTOMER SNAPSHOT                                              | |
| | MetroBuild Corp — Tier A                                       | |
| | Contact: Sarah Chen, Procurement Director                      | |
| | Phone: 555-0147 | Email: sarah@metrobuild.com                 | |
| |                                                                | |
| | HISTORY WITH US                                                | |
| | Orders: 12 | Lifetime Value: $8.2M                            | |
| | Avg Order Size: $683K | Avg Margin: 18.2%                     | |
| | Last Order: 45 days ago | Payment History: Excellent           | |
| | Credit Limit: $2M | Available: $1.4M                          | |
| |                                                                | |
| | SIMILAR PAST QUOTES                                            | |
| | Quote #4312 — Similar steel order — Won at 17% margin         | |
| | Quote #4189 — Rebar bulk — Lost (competitor 3% lower)         | |
| |                                                                | |
| | AI INSIGHTS                                                    | |
| | "MetroBuild typically counters 8-12% below first quote.       | |
| |  Recommend starting at 20% margin. High win probability       | |
| |  (78%) if response within 4 hours."                           | |
| +--------------------------------------------------------------+ |
|                                                                    |
| ACTIONS:                                                          |
| [START QUOTE] [REQUEST CLARIFICATION] [DECLINE RFQ] [ASSIGN]    |
| [ADD NOTE] [CALL CUSTOMER] [VIEW FULL CUSTOMER PROFILE]         |
+------------------------------------------------------------------+
```

---

### 1.4 Quote Builder Screen

The most complex and critical screen. This is where the sales rep builds the actual price quote. Detailed workflow in Section 3.

```
+------------------------------------------------------------------+
| QUOTE BUILDER — RFQ #2847 — MetroBuild Corp                      |
| Quote Version: v1 (Draft) | Auto-saved 30s ago                   |
+------------------------------------------------------------------+
|                                                                    |
| LINE ITEMS TABLE:                                                 |
| +--------------------------------------------------------------+ |
| |#|Material      |Spec    |Qty  |Unit|Cost  |Price |Margin|Total| |
| |-|------------- |--------|-----|----|----- |------|------|-----| |
| |1|Struct Steel  |A992    |450MT|MT  |$1,200|$1,440|16.7% |$648K| |
| |2|Rebar #4      |Gr60    |200MT|MT  |$890  |$1,068|16.7% |$214K| |
| |3|Rebar #8      |Gr60    |150MT|MT  |$920  |$1,104|16.7% |$166K| |
| |4|Conc Anchors  |3/4x6   |5000 |EA  |$3.20 |$4.16 |23.1% |$21K | |
| |...|                                                            | |
| | SUBTOTAL: $1,049,000   AVG MARGIN: 17.4%   COST: $865,650    | |
| +--------------------------------------------------------------+ |
|                                                                    |
| MARGIN CONTROL PANEL (right sidebar):                             |
| +----------------------------+                                    |
| | Overall Margin: 17.4%     |   [===========>     ]             |
| | Target: 18%               |                                    |
| | Floor: 12%                |   Above floor: YES                 |
| | Approval needed: NO       |                                    |
| |                            |                                    |
| | Quick Adjust:              |                                    |
| | [Set All to 15%]          |                                    |
| | [Set All to 18%]          |                                    |
| | [Set All to 20%]          |                                    |
| |                            |                                    |
| | If customer counters -5%: |                                    |
| |   New margin: 12.9%       |                                    |
| |   Revenue impact: -$52K   |                                    |
| |   Needs approval: YES     |                                    |
| +----------------------------+                                    |
|                                                                    |
| TERMS SECTION:                                                    |
| +--------------------------------------------------------------+ |
| | Delivery: [April 15, 2026 ▼] [Jobsite Delivery ▼]            | |
| | Payment Terms: [Net 30 ▼]  Credit Check: PASSED               | |
| | Quote Valid Until: [April 11, 2026] (14 days)                  | |
| | Special Conditions: [Free text area]                           | |
| +--------------------------------------------------------------+ |
|                                                                    |
| ACTIONS:                                                          |
| [SAVE DRAFT] [PREVIEW PDF] [SEND TO CUSTOMER] [REQUEST APPROVAL]|
| [ADD LINE ITEM] [IMPORT FROM CATALOG] [COPY FROM PAST QUOTE]    |
+------------------------------------------------------------------+
```

---

### 1.5 Quote Detail / Negotiation Screen

After a quote is sent, this screen tracks the ongoing negotiation. See Section 5 for full negotiation workflow.

```
+------------------------------------------------------------------+
| QUOTE #4521 — MetroBuild Corp — Downtown Tower Phase 2           |
| Status: NEGOTIATING | Sent: Mar 25 | Views: 3 | Last: 2h ago    |
+------------------------------------------------------------------+
|                                                                    |
| VERSION TIMELINE:                                                 |
| v1 (Mar 25) -----> v2 (Mar 26, customer counter) -----> v3 (now)|
| $1.12M  17.4%     $1.05M  requested                  $1.08M 14.8%|
|                                                                    |
| SIDE-BY-SIDE COMPARISON:                                          |
| +----------------------------+----------------------------+       |
| | YOUR LATEST (v3)           | CUSTOMER REQUEST (v2)      |       |
| |----------------------------|----------------------------|       |
| | Struct Steel: $1,400/MT    | Struct Steel: $1,320/MT    |       |
| | Rebar #4: $1,040/MT        | Rebar #4: $980/MT          |       |
| | Rebar #8: $1,075/MT        | Rebar #8: $1,010/MT        |       |
| | ...                        | ...                        |       |
| |                            |                            |       |
| | Total: $1,080,000         | Total: $1,050,000          |       |
| | Margin: 14.8%             | Margin: 11.2%              |       |
| | Profit: $159,840          | Profit: $117,600           |       |
| +----------------------------+----------------------------+       |
|                                                                    |
| NEGOTIATION CONVERSATION:                                         |
| Mar 25: Quote v1 sent ($1,120,000)                               |
| Mar 26: Customer: "Price too high on steel. Can you do $1,320?"  |
| Mar 26: You: Internal note — checked with procurement,            |
|         alt supplier can do $1,150/MT cost                        |
| Mar 27: You sent v3 ($1,080,000) — "Met you halfway on steel"   |
| Mar 28: Customer viewed quote (3 times today)                    |
|                                                                    |
| WHAT-IF CALCULATOR:                                               |
| If I drop total by: [$30,000] => New total: $1,050,000           |
|   Margin drops to: 11.2% | Profit: $117,600                     |
|   [!] Below 12% floor — requires VP approval                     |
|                                                                    |
| ACTIONS:                                                          |
| [REVISE QUOTE] [ACCEPT CUSTOMER COUNTER] [MARK AS WON]          |
| [MARK AS LOST] [ADD NOTE] [CALL CUSTOMER] [SEND MESSAGE]        |
+------------------------------------------------------------------+
```

---

### 1.6 Customer 360 View Screen

Everything about one customer on a single screen. See Section 6 for full detail.

```
+------------------------------------------------------------------+
| METROBUILD CORP                                        Tier: A    |
| 456 Commerce Way, Metro City | Est. 2005 | 200+ employees       |
+------------------------------------------------------------------+
|                                                                    |
| TAB: [Overview] [Contacts] [Quotes] [Orders] [Financials]       |
|      [Projects] [Communications] [Documents] [Notes]              |
|                                                                    |
| OVERVIEW TAB:                                                     |
| +---------------------------+  +-------------------------------+  |
| | ACCOUNT HEALTH: 87/100   |  | KEY METRICS                   |  |
| | [===============>   ]    |  | Lifetime Value: $8.2M         |  |
| | Status: HEALTHY          |  | Orders (12mo): 8              |  |
| |                           |  | Revenue (12mo): $4.1M         |  |
| | Last Order: 45 days ago  |  | Avg Margin: 18.2%             |  |
| | Last Contact: 3 days ago |  | Avg Order Size: $683K         |  |
| | Payment: Always on time  |  | Win Rate: 68% (our quotes)   |  |
| | Growth Trend: +12% YoY   |  | Open Quotes: 2 ($1.4M)       |  |
| +---------------------------+  +-------------------------------+  |
|                                                                    |
| +---------------------------+  +-------------------------------+  |
| | CREDIT & AR               |  | KEY CONTACTS                  |  |
| | Credit Limit: $2,000,000 |  | James Wu - CEO                |  |
| | Current Balance: $600K   |  | Sarah Chen - Procurement Dir  |  |
| | Available: $1,400,000    |  | Mike Torres - Site Super      |  |
| | Overdue: $0              |  | Lisa Park - AP Manager        |  |
| | Avg Days to Pay: 28      |  | [+Add Contact]                |  |
| +---------------------------+  +-------------------------------+  |
|                                                                    |
| RECENT ACTIVITY TIMELINE:                                         |
| Mar 28: New RFQ submitted — Downtown Tower Phase 2 ($1.2M)      |
| Mar 25: Quote #4521 sent — $1.12M                                |
| Mar 20: Order #1209 delivered — Westside Project                 |
| Mar 15: Payment received — Invoice #8834 ($340K)                 |
| Mar 10: Site visit — Mike Torres showed new project site         |
| Feb 28: Won Quote #4498 — Parking Structure ($890K)             |
+------------------------------------------------------------------+
```

---

### 1.7 Pipeline / Funnel View Screen

Visual representation of all active deals for the rep or the team.

```
+------------------------------------------------------------------+
| MY PIPELINE                                    Q1 2026 Forecast   |
| Total: $47.2M | Weighted: $18.8M | Target: $25M | Gap: $6.2M   |
+------------------------------------------------------------------+
|                                                                    |
| VIEW: [Kanban Board] [List View] [Funnel Chart]                  |
|                                                                    |
| KANBAN VIEW:                                                      |
| +----------+----------+----------+----------+----------+          |
| |RFQ RECV  |QUOTING   |SENT      |NEGOTIAT  |CLOSING   |          |
| |12 deals  |8 deals   |15 deals  |6 deals   |3 deals   |          |
| |$14.2M    |$9.8M     |$12.4M    |$7.1M     |$3.7M     |          |
| |          |          |          |          |          |          |
| |[MetroBld]|[PacConc] |[SummitB] |[ApexCon] |[GrnFld]  |          |
| |$1.2M     |$890K     |$340K     |$200K     |$1.8M     |          |
| |2h old    |In prog   |5d ago    |Counter   |Final rev |          |
| |          |          |          |recv'd    |          |          |
| |[ValleyM] |[BayCon]  |[WstSide] |[TriCity] |[MtnView] |          |
| |$125K     |$2.1M     |$1.5M     |$3.2M     |$890K     |          |
| |3h old    |Waiting   |7d ago    |2nd round |Verbal    |          |
| |          |supplier  |          |          |yes       |          |
| |...       |cost      |...       |...       |          |          |
| +----------+----------+----------+----------+----------+          |
|                                                                    |
| WON/LOST THIS MONTH:                                             |
| Won: 3 deals, $5.1M, 17.8% avg margin                           |
| Lost: 2 deals, $1.9M (reasons: price 1, lead time 1)            |
| Win Rate: 60% (by count) | 73% (by value)                       |
|                                                                    |
| AGING ALERTS:                                                     |
| [!] 4 quotes sent >7 days with no response                      |
| [!] 2 RFQs >24h without quote started                           |
+------------------------------------------------------------------+
```

**Kanban Card Data:**
- Customer name and tier badge
- Deal value
- Stage-specific status (e.g., "Waiting supplier cost" in Quoting, "Counter received" in Negotiating)
- Days in current stage
- Probability percentage
- Assigned rep (for team view)
- Color coding: green (on track), yellow (aging), red (at risk)

**Actions:**
- Drag cards between stages
- Click to open quote detail
- Filter by rep, customer tier, value range, material category
- Toggle between personal and team pipeline

---

### 1.8 Activity Feed / Recent Activity Screen

A chronological stream of everything happening across the rep's accounts.

```
+------------------------------------------------------------------+
| ACTIVITY FEED                                                      |
| Filter: [All] [RFQs] [Quotes] [Orders] [Payments] [Comms]      |
| Accounts: [All My Accounts] [Tier A Only] [Specific Customer]   |
+------------------------------------------------------------------+
|                                                                    |
| TODAY                                                              |
| 10:32  QUOTE VIEWED — Quote #4521 viewed by Sarah Chen           |
|        MetroBuild Corp | 3rd view today | Negotiating             |
|        [Open Quote] [Call Customer]                                |
|                                                                    |
| 10:15  NEW RFQ — RFQ #2847 from MetroBuild Corp                 |
|        47 items | Est $1.2M | Downtown Tower Phase 2              |
|        [Open RFQ] [Start Quote]                                   |
|                                                                    |
|  9:48  PAYMENT RECEIVED — Invoice #8834 paid by Pacific Concrete |
|        $340,000 | On time | Balance now $0                        |
|                                                                    |
|  9:30  DELIVERY CONFIRMED — Order #1209 delivered                |
|        MetroBuild Corp | 45 MT Rebar | Signed by Mike Torres     |
|        [View POD]                                                  |
|                                                                    |
| YESTERDAY                                                          |
| 16:45  QUOTE WON — Quote #4498 accepted by GreenField Dev       |
|        $890K | 19.2% margin | Converting to order...              |
|                                                                    |
| 14:20  NOTE ADDED — You added note to Apex Construction          |
|        "Spoke with Jim, they're waiting on project approval"      |
|                                                                    |
| 11:00  CUSTOMER COUNTER — Pacific Concrete countered Quote #4510 |
|        Requested 8% discount on rebar items                       |
|        [View Counter] [Open Negotiation]                          |
+------------------------------------------------------------------+
```

---

### 1.9 Calendar Screen

Integrated calendar showing meetings, follow-ups, quote deadlines, and delivery dates.

```
+------------------------------------------------------------------+
| CALENDAR — March 2026                                              |
| View: [Day] [Week] [Month] | [+ New Event]                      |
+------------------------------------------------------------------+
|                                                                    |
| WEEK VIEW:                                                        |
| Mon 25 | Tue 26  | Wed 27  | Thu 28  | Fri 29                   |
|---------|---------|---------|---------|---------|                  |
| 9:00    |         |         | 9:00    |         |                  |
| Call:   |         |         | Call:   |         |                  |
| ABC     | 10:00   |         | MetroBld| 10:00   |                  |
| Concrete| Site    |         |         | Internal|                  |
|         | Visit:  | 11:00   |         | Pricing |                  |
|         | XYZ     | Follow  | 10:30   | Meeting |                  |
|         | Build   | up:     | Site    |         |                  |
|         |         | Summit  | Visit:  | 14:00   |                  |
|         | 14:00   |         | XYZ     | Quote   |                  |
|         | Quote   |         |         | Review  |                  |
|         | Review  |         | 14:00   |         |                  |
|         |         |         | Int.    |         |                  |
|         |         |         | Pricing |         |                  |
|---------|---------|---------|---------|---------|                  |
|                                                                    |
| UPCOMING DEADLINES:                                               |
| Mar 30: Quote #4510 expires (Pacific Concrete, $340K)            |
| Mar 31: Delivery promise — Order #1215 (Summit Builders)         |
| Apr 02: Follow-up due — Apex Construction (stale 2 weeks)        |
| Apr 05: Credit review — TriCity Group (limit increase request)   |
+------------------------------------------------------------------+
```

**Calendar Event Types (color-coded):**
- Blue: Customer meetings/calls
- Green: Site visits
- Orange: Quote deadlines/expiry dates
- Red: Overdue follow-ups
- Purple: Internal meetings (pricing committee, pipeline reviews)
- Gray: Delivery milestones for active orders

**Actions:**
- Create events linked to specific customers, quotes, or orders
- Drag to reschedule
- Set reminders (15m, 1h, 1d before)
- Add meeting notes post-meeting
- Auto-populate pre-meeting brief (customer summary, open quotes, recent orders)

---

### 1.10 Contacts Screen

All contacts across all customer accounts, with relationship context.

```
+------------------------------------------------------------------+
| CONTACTS                                                           |
| Search: [_______________] Filter: [Role] [Company] [Last Contact]|
+------------------------------------------------------------------+
|                                                                    |
| NAME              | COMPANY          | ROLE              | LAST   |
|-------------------|------------------|-------------------|-CONTACT|
| Sarah Chen        | MetroBuild Corp  | Procurement Dir   | 3d ago |
| James Wu          | MetroBuild Corp  | CEO               | 30d    |
| Mike Torres       | MetroBuild Corp  | Site Super        | 7d ago |
| David Kim         | Pacific Concrete | VP Procurement    | 1d ago |
| Jennifer Walsh    | Summit Builders  | Project Manager   | 14d    |
| Robert Garcia     | Apex Construction| Owner             | 21d    |
| ...                                                               |
+------------------------------------------------------------------+
|                                                                    |
| CONTACT DETAIL (click to expand):                                 |
| +--------------------------------------------------------------+ |
| | Sarah Chen — Procurement Director                              | |
| | MetroBuild Corp (Tier A)                                       | |
| | Phone: 555-0147 | Email: sarah@metrobuild.com                 | |
| | LinkedIn: linkedin.com/in/sarachen                             | |
| |                                                                | |
| | Role in Deals: Primary decision maker for orders <$500K       | |
| |                Recommender for orders >$500K (CEO decides)     | |
| | Relationship: Strong — 3 years working together               | |
| | Communication Preference: Email first, then phone              | |
| | Notes: "Prefers detailed material specs in quotes. Always     | |
| |         compares with 2 other suppliers."                      | |
| |                                                                | |
| | Recent Activity:                                               | |
| | - Submitted RFQ #2847 (today)                                  | |
| | - Viewed Quote #4521 (3 times today)                           | |
| | - Accepted Quote #4498 (last week)                             | |
| +--------------------------------------------------------------+ |
+------------------------------------------------------------------+
```

---

### 1.11 Reports Screen

Sales performance analytics, filterable by time period, rep, customer, product category.

```
+------------------------------------------------------------------+
| REPORTS                                                            |
| Period: [MTD ▼] | Rep: [All ▼] | Customer Tier: [All ▼]         |
+------------------------------------------------------------------+
|                                                                    |
| REPORT CATEGORIES:                                                |
|                                                                    |
| REVENUE & MARGIN                    PIPELINE ANALYTICS            |
| - Revenue by period                 - Pipeline by stage            |
| - Margin by customer                - Conversion rate by stage     |
| - Margin by product category        - Average deal cycle time      |
| - Revenue vs target                 - Win/loss analysis            |
| - Top 10 deals this period          - Lost deal reasons            |
|                                                                    |
| ACTIVITY METRICS                    CUSTOMER ANALYTICS            |
| - Quotes sent per rep               - Customer revenue ranking     |
| - Avg response time to RFQ          - Customer margin ranking      |
| - Follow-up completion rate         - At-risk accounts             |
| - Calls/meetings per week           - New vs repeat customers      |
| - Quote-to-order conversion         - Customer acquisition cost    |
|                                                                    |
| PRODUCT ANALYTICS                   FORECAST                      |
| - Revenue by material category      - Weighted pipeline forecast   |
| - Margin by material category       - Forecast vs actual (trend)   |
| - Most quoted products              - Rep forecast accuracy        |
| - Price trend analysis              - Quarterly projection         |
|                                                                    |
| SAMPLE REPORT VIEW:                                               |
| Win/Loss Analysis — Q1 2026                                      |
| +--------------------------------------------------------------+ |
| | Won: 24 deals ($15.2M) | Lost: 11 deals ($8.1M)              | |
| | Win Rate: 68.6%                                                | |
| |                                                                | |
| | LOST REASONS:          | COMPETITOR WINS:                     | |
| | Price too high: 5      | BuildersCo: 3 deals                  | |
| | Lead time too long: 3  | SteelDirect: 2 deals                 | |
| | Spec mismatch: 2       | Unknown: 6 deals                     | |
| | No response: 1         |                                       | |
| +--------------------------------------------------------------+ |
+------------------------------------------------------------------+
```

---

### 1.12 Additional Screens

**1.12.1 Product Catalog / Material Search**
- Searchable catalog of all materials HyperQuote can source
- Filterable by category, specification, supplier, availability
- Shows last-known cost range (if permitted), lead time, and supplier options
- Used when adding line items in the quote builder

**1.12.2 Notifications Center**
- All alerts in one place: new RFQs, customer actions (quote viewed, counter received), system alerts (delivery delayed, credit hold), internal messages (approval requested/granted, pricing update)
- Mark as read, snooze, act directly from notification

**1.12.3 Settings / Preferences**
- Notification preferences (email, push, in-app)
- Default quote validity period
- Default payment terms
- Signature block for quotes
- Territory/account assignment preferences
- Working hours and out-of-office

**1.12.4 Team View (for Sales Managers)**
- All reps' pipelines aggregated
- Leaderboard by revenue, margin, activity
- Quota attainment by rep
- RFQ response time by rep
- Manager can reassign accounts, approve quotes, override pricing

---

## 2. RFQ Inbox and Triage

### 2.1 How Inbound Quote Requests Arrive

In a building materials distributor, RFQs arrive through multiple channels:

1. **Customer Portal** — Customer logs in, uploads a material list (BOM/bill of materials), selects delivery requirements, and submits. This is the primary structured channel.
2. **Email** — Customer sends a material list as an email attachment (Excel, PDF). AI parses and converts to structured RFQ.
3. **Phone** — Sales rep takes the request over the phone and enters it manually.
4. **On-site** — Outside sales rep at a jobsite captures requirements and enters via mobile app.
5. **Repeat/Template** — Customer re-orders from a previous quote or saved material list.

### 2.2 RFQ Display and Priority Scoring

**Auto-Priority Calculation Formula:**

```
Priority Score = (Customer Tier Weight x 40%) +
                 (Estimated Value Weight x 30%) +
                 (Age Urgency Weight x 20%) +
                 (Delivery Urgency Weight x 10%)

Where:
  Customer Tier: A=100, B=60, C=30, New=20
  Estimated Value: >$1M=100, $500K-1M=80, $100K-500K=50, <$100K=20
  Age Urgency: <1h=20, 1-4h=40, 4-8h=60, 8-24h=80, >24h=100
  Delivery Urgency: <7d=100, 7-14d=70, 14-30d=40, >30d=20
```

Priority scores above 75 are flagged as "!!!" (critical), 50-75 as "!!" (high), 25-50 as "!" (medium), below 25 as normal.

**Visual Indicators:**
- Color-coded age timers: Green (<2h), Yellow (2-8h), Orange (8-24h), Red (>24h)
- Customer tier badges with distinct colors (Gold=A, Silver=B, Bronze=C)
- Value estimates shown in abbreviated format ($1.2M, $340K)
- Flashing indicator if customer has noted "urgent" or competitor involvement

### 2.3 Auto-Assignment Rules

RFQs should be auto-assigned based on a rule hierarchy:

1. **Account Owner First** — If the customer has an assigned sales rep, route to them
2. **Territory Fallback** — If account owner is unavailable (OOO, at capacity), route to territory backup
3. **Round-Robin for Unassigned** — New customers without an account owner get round-robin assignment weighted by current workload
4. **Specialization Override** — Certain material categories (specialty steel, hazmat materials) route to product specialists regardless of territory
5. **Value-Based Escalation** — RFQs estimated over $5M route to senior sales or sales director in addition to the primary rep
6. **Capacity Throttle** — If a rep has more than X active quotes, new assignments go to the next available rep in the territory

**Auto-assignment happens within 30 seconds** of RFQ arrival. The assigned rep gets an immediate push notification.

### 2.4 Handling Requests That Need Clarification

When an RFQ is incomplete or ambiguous, the rep marks it as "Needs Clarification" and uses a structured clarification workflow:

**Common Clarification Scenarios in Building Materials:**
- Material spec ambiguous (e.g., "steel beams" without grade, size, or standard)
- Quantity unclear (e.g., "enough for a 3-story building" — needs engineering takeoff)
- Delivery access constraints not specified (crane needed? forklift offload? site hours?)
- No delivery date provided
- Mixed units (some items in metric tons, others in linear feet)
- Referenced spec sheet not attached

**Clarification Workflow:**
1. Rep clicks "Request Clarification"
2. System presents a structured form with common clarification questions (checkboxes + free text)
3. Message is sent to customer via portal notification + email
4. RFQ moves to "Awaiting Clarification" status with a visible timer
5. Customer responds through portal — RFQ returns to rep's queue with "Clarification Received" badge
6. If no response within 48h, system sends automatic follow-up
7. If no response within 7 days, RFQ can be archived with "No Response" reason

**Key UX principle:** The clarification request should never feel like rejection. The message tone should be: "We want to give you the best price — we just need a few details."

### 2.5 SLA Timers and Escalation

| Customer Tier | Target Response Time | Escalation Trigger |
|---|---|---|
| Tier A | 2 hours | 4 hours to sales manager |
| Tier B | 4 hours | 8 hours to sales manager |
| Tier C | 8 hours | 24 hours to sales manager |
| New Customer | 4 hours | 8 hours — potential new business |

Response time is measured from RFQ submission to first meaningful action (quote started, clarification sent, or acknowledgment sent).

---

## 3. Quote Builder UX

### 3.1 Step-by-Step Quote Building Workflow

**Step 1: Initialize Quote**
- Rep clicks "Start Quote" from RFQ detail screen
- System auto-populates: customer info, delivery address, material list from RFQ
- Quote gets a version number (v1) and auto-save begins
- System checks customer credit status and displays warning if near/over limit

**Step 2: Review and Refine Line Items**
- Each line item from the RFQ is displayed in an editable table
- Rep can:
  - Edit quantities (if customer made an error or rep has better info)
  - Add/remove line items
  - Split one line item into multiple (e.g., source from two suppliers)
  - Substitute materials (e.g., equivalent grade from a different mill)
  - Import additional items from catalog search
  - Copy line items from a previous quote to this customer
- For each item, system shows: material description, specification, quantity, unit of measure

**Step 3: Procurement Cost Lookup (Per Line Item)**
- For each line item, the system fetches the latest supplier cost data:
  - **If cost is current** (refreshed within 24h from procurement): Shows cost with confidence indicator (green checkmark)
  - **If cost is stale** (older than 24h): Shows last known cost with warning icon and "Request Fresh Cost" button
  - **If no cost available**: Shows "Awaiting Procurement Input" — rep can send a cost request to the procurement team
  - **Multiple supplier options**: If multiple suppliers can provide the item, system shows cost from each, with recommended supplier highlighted (best combination of cost, lead time, and reliability)
- Rep does NOT manually enter costs — they come from procurement/system
- See Section 4 for what cost information is actually visible to the rep

**Step 4: Set Pricing Per Line Item**
- For each line item, the rep sets the selling price (or adjusts margin):
  - **Method 1: Set margin %** — Rep enters desired margin (e.g., 18%), system calculates sell price
  - **Method 2: Set price directly** — Rep enters the price per unit, system calculates margin
  - **Method 3: Apply blanket margin** — "Set all items to 18% margin" button
  - **Method 4: Price from history** — "Use price from Quote #4312" for the same customer/material
- **Margin Visualization per line item:**
  - Green: At or above target margin
  - Yellow: Between target and floor
  - Red: Below floor margin (requires approval)
- **Pricing Guardrails:**
  - System prevents saving a price below the cost (negative margin)
  - Floor margin warnings appear in real-time
  - If any line item is below floor, the overall quote status shows "Requires Approval"

**Step 5: Delivery Terms**
- Delivery date selection (calendar picker)
- System cross-references with warehouse stock availability and supplier lead times
- If requested delivery date is infeasible: warning with earliest feasible date
- Delivery method: Jobsite delivery, Customer pickup, Third-party carrier
- Special delivery instructions (crane offload, restricted hours, multiple drops)
- Delivery cost: included in price, separate line item, or FOB pricing

**Step 6: Payment Terms**
- Select from customer's approved payment terms (set by finance):
  - Net 30, Net 45, Net 60, Net 90
  - Progress payments (for large orders: 30% upfront, 40% on delivery, 30% Net 30)
  - Letter of credit (for very large or international deals)
- System shows customer's current credit status alongside:
  - Credit limit
  - Current outstanding balance
  - Available credit (limit minus outstanding)
  - If quote value exceeds available credit: warning + option to request credit limit increase from finance
- Early payment discount option (e.g., 2/10 Net 30)

**Step 7: Quote Validity Period**
- Default: 14 days (configurable per company policy)
- Rep can adjust: 7 days (for volatile commodity pricing) to 30 days (for stable items)
- System warns if validity exceeds 14 days for materials with volatile pricing (steel, copper)
- After expiry: quote auto-moves to "Expired" status, customer must request re-quote

**Step 8: Approval Workflow (if needed)**

```
Margin Check:
  >= Target (18%): No approval needed → Rep can send immediately
  >= Floor (12%) but < Target: Manager approval required
  < Floor (12%): VP Sales approval required
  < Absolute Minimum (8%): CEO/Owner approval required (strategic deal)

Approval Process:
  1. Rep clicks "Request Approval"
  2. Quote enters "Pending Approval" status
  3. Approver receives notification with:
     - Quote summary (total value, margin %, profit $)
     - Customer context (tier, history, strategic importance)
     - Rep's justification note ("Strategic account, competitor priced at $X")
     - One-click Approve/Reject/Request Changes
  4. Approval is logged with timestamp for audit trail
  5. Upon approval, rep is notified and can send quote

Escalation:
  - If not approved within 2 hours: escalated to next level
  - Rep can add urgency note ("Customer deciding today")
```

**Step 9: Preview Before Sending**
- PDF preview of the quote as the customer will see it
- Professional branded layout with:
  - Company logo, quote number, date
  - Customer name and address
  - Line item table (NO cost or margin columns — only sell price)
  - Subtotal, tax (if applicable), total
  - Delivery terms and date
  - Payment terms
  - Validity period
  - Terms and conditions (standard legal text)
  - Contact information and signature
- Rep can toggle: "Show spec details" vs "Summary view"
- Rep can add a personalized cover note visible on the quote

**Step 10: Send to Customer**
- Send via: Customer portal (preferred), email (PDF attachment), or both
- Confirm recipients (may want to CC additional contacts)
- Optionally schedule send (send at 8 AM tomorrow)
- Upon sending: quote status changes to "Sent", activity is logged, follow-up reminder is auto-scheduled

### 3.2 Quote Builder UX Principles

1. **Single-screen editing** — All line items, pricing, terms, and margin visible simultaneously. No multi-step wizard that hides data.
2. **Real-time margin calculation** — Every change to price or quantity instantly recalculates margin at line level and quote level.
3. **Auto-save** — Draft saves every 30 seconds. Rep never loses work.
4. **Keyboard shortcuts** — Tab between cells, Enter to move to next line item, shortcut to set margin for selected rows.
5. **Inline editing** — Click any cell to edit. No modal dialogs for simple changes.
6. **Smart defaults** — Default margin from customer tier target, default payment terms from customer profile, default delivery terms from last quote.
7. **Copy and template support** — Copy entire quotes from history, save quote structures as templates for recurring material lists.

---

## 4. Supplier Cost Visibility for Sales

### 4.1 The Central Question: Should Sales See Actual Cost?

This is one of the most debated topics in distribution. Industry practice varies, and the answer depends on company culture, sales team maturity, and deal complexity.

### 4.2 Three Models in Practice

**Model A: Full Cost Visibility (Most Common in Building Materials Distribution)**

Sales reps see the actual supplier cost per item and the resulting margin percentage.

*Why many distributors do this:*
- Building materials distribution involves complex, multi-line quotes where reps need to make strategic margin decisions per item (e.g., lower margin on commodity steel to win the deal, higher margin on specialty fasteners where competition is less)
- Reps need to know if a cost has changed since the last quote to the same customer
- In high-value B2B ($100K-$100M), the sales rep IS the pricing strategist — they need the data
- Industry norm in traditional distribution: the rep has always known cost
- Prevents embarrassing situations where the rep quotes below cost for an item unknowingly

*Guardrails when using this model:*
- Floor margin per category that system enforces (cannot quote below X%)
- Target margin per customer tier displayed prominently
- Approval workflow for below-target margins
- Commission tied to margin (not revenue) to align incentives
- Historical cost marked as "stale" if older than procurement's last refresh
- Reps should NOT see supplier rebate details or volume incentive structures

**Model B: Margin-Only Visibility (Recommended for HyperQuote)**

Sales reps see a "cost basis" (which may be the actual cost or an adjusted cost) and the margin percentage, but not necessarily the raw supplier invoice cost.

*How this works:*
- Procurement sets a "transfer price" or "internal cost" for each item
- This transfer price may include a procurement buffer (e.g., 2-3% above actual supplier cost)
- The buffer protects the company's margin even if the sales rep negotiates down to the "floor"
- Rep sees: Internal Cost | Sell Price | Margin %
- Rep does NOT see: Actual supplier invoice cost, rebates, volume discounts from supplier

*Why this is recommended for HyperQuote:*
- Protects the company's actual margin structure from being exposed if a rep leaves for a competitor
- Creates a built-in margin floor that sales can't accidentally breach
- Procurement can adjust transfer prices based on market conditions without explaining supplier negotiations
- Still gives reps enough data to make informed pricing decisions
- The 2-3% buffer on a $1M order is $20K-$30K in protected margin

**Model C: No Cost Visibility (Rare in Distribution)**

Reps only see sell price recommendations and a green/yellow/red indicator for margin health.

*Why this is uncommon in building materials:*
- Reps can't make strategic per-item pricing decisions
- Too rigid for negotiation scenarios where customer pushes back on specific line items
- Doesn't work for experienced reps who expect cost data
- Only works in highly standardized, low-negotiation environments

### 4.3 Recommended Implementation for HyperQuote

```
WHAT THE SALES REP SEES:
+--------------------------------------------------------------+
| Material      | Internal Cost | Your Price | Margin | Status |
|---------------|---------------|------------|--------|--------|
| Struct Steel  | $1,220/MT     | $1,440/MT  | 15.3%  | OK     |
| Rebar #4      | $910/MT       | $1,068/MT  | 14.8%  | OK     |
| Conc Anchors  | $3.30/EA      | $4.16/EA   | 20.7%  | GOOD   |
+--------------------------------------------------------------+
| "Internal Cost" = Actual supplier cost + procurement buffer    |
| Target Margin: 18% | Floor Margin: 12%                        |
+--------------------------------------------------------------+

WHAT PROCUREMENT SEES (behind the scenes):
+--------------------------------------------------------------+
| Material      | Supplier Cost | Buffer | Int. Cost | Rebate  |
|---------------|---------------|--------|-----------|---------|
| Struct Steel  | $1,180/MT     | 3.4%   | $1,220/MT | 2% vol  |
| Rebar #4      | $885/MT       | 2.8%   | $910/MT   | 1.5%    |
| Conc Anchors  | $3.15/EA      | 4.8%   | $3.30/EA  | None    |
+--------------------------------------------------------------+
```

### 4.4 Preventing Margin Erosion

Key strategies regardless of which visibility model is used:

1. **Margin floor enforcement** — System prevents sending quotes below the floor without approval
2. **Commission on margin** — Reps earn more when they maintain higher margins (see Section 11)
3. **Historical pricing analysis** — System flags when a rep's quotes trend below the customer tier target over time
4. **Competitive intelligence** — Collect and display market pricing data so reps know when they can hold firm
5. **Approval escalation** — Multi-tier approval for deeper and deeper discounts
6. **Pricing dashboards for managers** — Visibility into per-rep margin performance
7. **Time-limited discounts** — If a one-time discount is approved, it doesn't set a precedent — the system doesn't auto-apply it to future quotes
8. **Customer expectation anchoring** — Always show the "list price" on the quote even if the customer gets a discount, so they see the value they're receiving

---

## 5. Negotiation Tracking

### 5.1 The Negotiation Lifecycle in Building Materials

Building materials quotes rarely close on the first submission. The typical cycle:

1. **Customer receives quote** — Reviews internally with project team
2. **Customer counters** — Pushes back on specific items, requests bulk discount, or provides a competitor quote to beat
3. **Sales rep revises** — Adjusts pricing, may substitute materials, may change delivery terms
4. **Back-and-forth** — 2-4 rounds typical for large deals, sometimes more
5. **Resolution** — Won (customer accepts), Lost (customer goes elsewhere), or Expired (customer ghosts)

**Average negotiation duration by deal size:**
- Under $250K: 1-2 rounds, 3-7 days
- $250K-$1M: 2-3 rounds, 7-14 days
- $1M-$10M: 3-5 rounds, 14-30 days
- Over $10M: 4-8 rounds, 30-90 days (may involve executive-level negotiations)

### 5.2 Version Tracking

Every revision creates a new quote version. The system maintains a complete history:

```
QUOTE VERSION HISTORY:
+------+----------+--------+-----------+-------+-------------------+
| Ver  | Date     | Total  | Margin    | By    | Change Summary    |
+------+----------+--------+-----------+-------+-------------------+
| v1   | Mar 25   | $1.12M | 17.4%     | Rep   | Initial quote     |
| v2   | Mar 26   | $1.05M | —         | Cust  | Counter: -6.3%    |
| v3   | Mar 27   | $1.08M | 14.8%     | Rep   | Revised: steel -3%|
| v4   | Mar 28   | $1.06M | —         | Cust  | Counter: -1.9%    |
| v5   | Mar 28   | $1.07M | 13.6%     | Rep   | Final offer       |
+------+----------+--------+-----------+-------+-------------------+
```

**Each version stores:**
- Complete line item snapshot (so you can see exactly what was in any version)
- Total amount and margin (for rep's versions)
- Who created it (rep or customer)
- Change summary (auto-generated diff)
- Notes/justification from the creator
- Timestamp
- Approval status (if applicable)

### 5.3 Side-by-Side Comparison View

The rep needs to compare any two versions instantly:

```
COMPARING: v3 (Your Latest) vs v2 (Customer Counter)

LINE ITEM DIFFERENCES:
+------------------+-----------+-----------+---------+
| Material         | v3 Price  | v2 Req    | Delta   |
+------------------+-----------+-----------+---------+
| Struct Steel     | $1,400/MT | $1,320/MT | +$80    |
| Rebar #4         | $1,040/MT | $980/MT   | +$60    |
| Rebar #8         | $1,075/MT | $1,010/MT | +$65    |
| Conc Anchors     | $4.16/EA  | $4.16/EA  | $0 (=)  |
| ...              |           |           |         |
+------------------+-----------+-----------+---------+

SUMMARY:
| Metric           | v3          | v2 (Cust)   | Difference |
|------------------|-------------|-------------|------------|
| Total            | $1,080,000  | $1,050,000  | $30,000    |
| Your Margin      | 14.8%       | 11.2%       | -3.6pp     |
| Your Profit $    | $159,840    | $117,600    | -$42,240   |
```

Items that changed are highlighted. Items that stayed the same are grayed. The rep can immediately see where the disagreement is and what it costs.

### 5.4 Margin Impact Calculator / What-If Scenarios

An interactive tool embedded in the negotiation screen:

```
WHAT-IF CALCULATOR:
+--------------------------------------------------------------+
| SCENARIO 1: Meet customer halfway                            |
| Adjust: Steel -$40/MT, Rebar -$30/MT                        |
| New Total: $1,065,000                                        |
| New Margin: 13.2% | Profit: $140,580                        |
| Status: Above floor (12%) — No approval needed               |
+--------------------------------------------------------------+
| SCENARIO 2: Accept customer price on steel, hold on rebar    |
| Adjust: Steel to $1,320/MT, Rebar unchanged                 |
| New Total: $1,044,000                                        |
| New Margin: 12.1% | Profit: $126,324                        |
| Status: Above floor (barely) — Manager review recommended    |
+--------------------------------------------------------------+
| SCENARIO 3: Accept all customer prices                       |
| New Total: $1,050,000                                        |
| New Margin: 11.2% | Profit: $117,600                        |
| Status: BELOW FLOOR — VP approval required                   |
+--------------------------------------------------------------+
| CUSTOM SCENARIO:                                              |
| Drop total price by: [$___________]                          |
| Or set target margin at: [_____%]                            |
| [CALCULATE]                                                   |
+--------------------------------------------------------------+
```

**What-if features:**
- Adjust individual line items and see instant total/margin impact
- Set a target total and see which items to reduce
- Compare margin impact across 3-4 scenarios simultaneously
- "Split the difference" auto-calculator (automatically finds midpoint between your price and customer's request)
- Approval requirement preview (shows whether the scenario needs approval before the rep commits)

### 5.5 Negotiation Communication Log

All communications related to a quote are tracked in a single thread:

```
NEGOTIATION LOG:
+--------------------------------------------------------------+
| Mar 25 09:15 — SYSTEM: Quote v1 sent to sarah@metrobuild.com |
| Mar 25 14:30 — SYSTEM: Quote viewed by Sarah Chen            |
| Mar 26 08:45 — CUSTOMER: Counter received via portal         |
|   "Steel price is too high compared to our other supplier.   |
|    Can you match $1,320/MT? Rebar pricing also needs to      |
|    come down. Anchors are fine."                              |
| Mar 26 09:00 — REP NOTE (internal): Called procurement.      |
|   Alt supplier (SteelWorks Inc) can do $1,150/MT for steel.  |
|   Gives us room to go to $1,400 at 17.9% margin.            |
| Mar 26 11:00 — REP NOTE (internal): Discussed with manager.  |
|   Approved going to 14% margin floor for this strategic acct.|
| Mar 27 08:00 — SYSTEM: Quote v3 sent                        |
|   Rep message: "Sarah, we've sharpened pricing on steel and  |
|   rebar. Steel is now at $1,400/MT — we've gone to our best  |
|   supplier to make this work. Let me know your thoughts."     |
| Mar 28 08:32 — SYSTEM: Quote viewed by Sarah Chen (1st)     |
| Mar 28 09:15 — SYSTEM: Quote viewed by Sarah Chen (2nd)     |
| Mar 28 10:32 — SYSTEM: Quote viewed by Sarah Chen (3rd)     |
+--------------------------------------------------------------+
```

**Tracked events:**
- Quote sent/viewed (with view count)
- Customer messages and counters
- Rep internal notes (visible only to sales team, not customer)
- Approval requests and decisions
- Phone call logs (manual or VoIP integration)
- Email exchanges (if integrated)
- Status changes
- Timestamp and actor for every entry

---

## 6. Customer 360 View

### 6.1 Information Architecture

The Customer 360 view aggregates data from every module (sales, procurement, warehouse, finance, dispatch, customer portal) into a single account page.

**Most Important Information (ranked by what sales reps say they need most):**

1. **Credit status and available credit** — Can this customer even place an order right now?
2. **Open quotes and their status** — What's active with this customer?
3. **Recent orders and delivery status** — Are we delivering well? Any problems?
4. **Payment status / AR** — Are they paying on time? Any overdue invoices?
5. **Account health score** — Is this customer growing, stable, or at risk of churn?
6. **Key contacts and decision makers** — Who do I call?
7. **Communication history** — When did we last talk and about what?
8. **Lifetime value and margin** — How important is this customer to us?

### 6.2 Tab-by-Tab Breakdown

**OVERVIEW TAB (Default Landing)**

This is the "executive summary" of the account:

| Section | Data Points |
|---------|-------------|
| Account Header | Company name, tier (A/B/C), industry, address, website, employee count, year established |
| Health Score Card | Score (0-100), trend arrow (improving/declining), contributing factors |
| Key Metrics | Lifetime value, 12-month revenue, 12-month margin %, order count, average order size, win rate on quotes |
| Credit & AR | Credit limit, current balance, available credit, overdue amount, average days to pay |
| Key Contacts | Top 3-5 contacts with roles, last contact date, preferred contact method |
| Open Items | Active quotes (count + value), pending orders (count + value), pending deliveries |
| Recent Timeline | Last 10 activities across all types |
| AI Insights | "This customer ordered 15% more in Q4. Two active projects suggest Q1 will be even larger." |

**CONTACTS TAB**

| Data Point | Detail |
|------------|--------|
| Contact List | Name, title, role, phone, email, LinkedIn |
| Relationship Map | Visual org chart showing decision makers, influencers, gatekeepers, and users |
| Role Tags | Decision Maker, Influencer, Technical, Procurement, Accounts Payable, Site Contact |
| Communication Preferences | Per contact: prefers email/phone/portal, best time to call, language |
| Engagement Recency | Last interaction date per contact, color-coded (green <7d, yellow 7-30d, red >30d) |
| Personal Notes | Birthday, interests, relationship quality notes (for relationship-driven sales) |

**QUOTES TAB**

| Data Point | Detail |
|------------|--------|
| Quote List | All quotes with: number, date, status, total, margin, line item count |
| Filters | By status (active/won/lost/expired), date range, value range, material type |
| Win/Loss Stats | Overall win rate, average margin on won deals, average discount from initial quote |
| Lost Reasons | Aggregated reasons for lost quotes with this customer |
| Active Negotiations | Quotes in "Sent" or "Negotiating" status with age and last activity |

**ORDERS TAB**

| Data Point | Detail |
|------------|--------|
| Order List | All orders with: number, date, status, total, delivery status |
| Fulfillment Status | Per order: % fulfilled, pending deliveries, backorders |
| On-Time Delivery Rate | What % of their orders have we delivered on time? |
| Returns/Claims | Any returns or quality claims from this customer |
| Repeat Ordering Patterns | Which materials do they reorder regularly? What's the cycle? |

**FINANCIALS TAB**

| Data Point | Detail |
|------------|--------|
| Credit Summary | Limit, balance, available, last review date, next review date |
| Invoice List | All invoices with: number, date, amount, due date, status (paid/outstanding/overdue) |
| Payment History | Payment amounts and dates, average days to pay, payment methods used |
| Aging Analysis | 0-30, 31-60, 61-90, 90+ day buckets for outstanding receivables |
| Revenue Chart | Monthly/quarterly revenue trend over 12-24 months |
| Margin Chart | Margin trend over time — is it stable, improving, or eroding? |
| Revenue Concentration | What % of their spend is with us vs estimated total spend? (wallet share) |

**PROJECTS TAB (Building Materials Specific)**

| Data Point | Detail |
|------------|--------|
| Active Projects | Project name, location, estimated value, start/end dates, project manager |
| Project-Quote Mapping | Which quotes are tied to which projects |
| Material Requirements | Known upcoming material needs per project |
| Site Information | Delivery access details, restrictions, crane availability, storage areas |
| Project Photos | Photos captured during site visits (by outside sales reps) |

**COMMUNICATIONS TAB**

| Data Point | Detail |
|------------|--------|
| Unified Inbox | All emails, portal messages, call logs, meeting notes in chronological order |
| Channel Breakdown | Communication by channel (email, phone, portal, in-person) |
| Sentiment Tracking | AI-analyzed sentiment of recent communications (positive, neutral, concerning) |
| Upcoming Follow-ups | Scheduled callbacks, follow-ups, and reminders |

**DOCUMENTS TAB**

| Data Point | Detail |
|------------|--------|
| Contracts | Master supply agreements, pricing agreements, terms |
| Certificates | Business license, insurance certificates, tax-exempt certificates |
| Quotes (PDFs) | Archived quote PDFs |
| Purchase Orders | Customer POs received |
| Other | Any uploaded documents (spec sheets, project plans, etc.) |

**NOTES TAB**

| Data Point | Detail |
|------------|--------|
| Chronological Notes | All internal notes with author, date, and tags |
| Pinned Notes | Important sticky notes (e.g., "ALWAYS cc the AP manager on invoices") |
| Meeting Summaries | Structured meeting notes with action items and follow-ups |
| Tags | Filterable tags (#pricing-sensitive, #slow-payer, #growth-opportunity) |

### 6.3 Account Health Score Calculation

For a building materials distributor, the account health score should use a modified RFM (Recency, Frequency, Monetary) model:

```
Account Health Score (0-100):

Recency (35%):
  Last order within 30 days: 100
  31-60 days: 75
  61-90 days: 50
  91-180 days: 25
  >180 days: 0

Frequency (25%):
  Monthly+ orders: 100
  Quarterly orders: 75
  Semi-annual: 50
  Annual: 25
  Less than annual: 0

Monetary Trend (20%):
  Spend increasing >10% YoY: 100
  Spend stable (+/-10%): 70
  Spend declining 10-25%: 40
  Spend declining >25%: 10

Payment Behavior (10%):
  Always on time: 100
  Usually on time (>90%): 80
  Sometimes late (70-90%): 50
  Frequently late (<70%): 20

Engagement (10%):
  Regular communication: 100
  Occasional communication: 60
  Minimal communication: 30
  No recent communication: 0

THRESHOLDS:
  80-100: Healthy (Green) — Standard engagement
  60-79:  Watch (Yellow) — Increase touchpoints
  40-59:  At Risk (Orange) — Proactive outreach, manager review
  0-39:   Critical (Red) — Immediate intervention required
```

---

## 7. Pipeline and Forecasting

### 7.1 Pipeline Stages for a Quote-Based Distributor

Unlike SaaS pipelines that track lead-to-close, a building materials distributor pipeline starts at the RFQ and emphasizes the quoting and negotiation phases.

**Recommended Pipeline Stages:**

| Stage | Definition | Probability | Typical Duration |
|---|---|---|---|
| **1. RFQ Received** | Customer has submitted request, not yet quoted | 10% | 1-2 days |
| **2. Quoting** | Rep is building the quote (awaiting costs, building pricing) | 15% | 1-3 days |
| **3. Quote Sent** | Quote delivered to customer, awaiting response | 25% | 3-7 days |
| **4. Under Review** | Customer has viewed/acknowledged, no counter yet | 35% | 3-14 days |
| **5. Negotiating** | Customer has countered, active back-and-forth | 50% | 5-30 days |
| **6. Verbal Commitment** | Customer verbally agreed, awaiting PO/formal acceptance | 80% | 1-7 days |
| **7. Won** | Customer accepted, converting to order | 100% | — |
| **8. Lost** | Customer chose competitor or canceled | 0% | — |
| **9. Expired** | Quote validity period passed without response | 0% | — |

### 7.2 How This Differs From SaaS Pipeline

| Aspect | SaaS Pipeline | Distribution (HyperQuote) Pipeline |
|---|---|---|
| **Entry point** | Lead/MQL from marketing | RFQ from customer (they come to you) |
| **Discovery stage** | Long qualification period | Short — customer already knows what they need |
| **Pricing model** | Published tiers, annual contracts | Custom per-quote, per-material pricing |
| **Decision criteria** | Features, ROI, implementation | Price, delivery time, material availability, relationship |
| **Negotiation** | Seat count, discount from list price | Line-by-line material pricing, delivery terms |
| **Revenue model** | Recurring (MRR/ARR) | Transaction-based (per order) |
| **Upsell mechanism** | Upgrade tier, add seats | Cross-sell materials, win next project |
| **Win/loss factors** | Feature fit, budget cycle | Price competitiveness, speed of response, reliability |
| **Pipeline velocity** | Weeks to months | Days to weeks (faster cycle) |
| **Forecasting method** | ARR pipeline coverage ratio | Weighted pipeline with commodity price volatility adjustment |
| **Deal size variance** | 2-5x between small/large | 100x+ between small/large ($100K vs $100M) |

### 7.3 Pipeline Metrics and KPIs

**Primary Pipeline Metrics:**

| Metric | Formula | Target (Example) |
|---|---|---|
| Pipeline Value (Unweighted) | Sum of all active deal values | 3-4x quota |
| Pipeline Value (Weighted) | Sum of (deal value x stage probability) | 1.2-1.5x quota |
| Pipeline Velocity | (# deals x win rate x avg deal size) / avg cycle length | Increasing QoQ |
| Stage Conversion Rate | Deals that move from Stage N to Stage N+1 / Deals in Stage N | Varies by stage |
| Quote-to-Order Conversion | Won quotes / Total quotes sent | 40-60% for Tier A, 25-40% overall |
| Average Deal Cycle | Days from RFQ received to Won/Lost | 14-30 days |
| RFQ Response Time | Time from RFQ submission to first quote sent | < 4 hours (Tier A), < 8 hours (Tier B) |
| Aging Deals | Quotes in Sent/Negotiating for > 2x average cycle | < 10% of pipeline |

**Forecasting Approach:**

For a building materials distributor, weighted pipeline alone is insufficient because:
- Commodity prices fluctuate (a quote's value may change before close)
- Large project timelines shift (a "90% likely" deal might delay 6 months)
- Repeat customers have predictable ordering patterns that aren't in the pipeline

**Recommended forecast model:**

```
Total Forecast = Weighted Pipeline Forecast
               + Committed/Verbal Orders
               + Predictive Reorder Forecast (AI-based on past ordering patterns)
               - Commodity Price Volatility Adjustment
               - Seasonal Adjustment Factor
```

**Forecast Display:**

```
+--------------------------------------------------------------+
| Q1 2026 FORECAST                                              |
|                                                                |
| Committed (verbal + signed):     $8.2M   ████████████         |
| Weighted Pipeline:               $10.6M  ██████████████████   |
| Predicted Reorders:              $3.4M   █████████            |
| TOTAL FORECAST:                  $22.2M                       |
| QUOTA:                           $25.0M                       |
| GAP:                             $2.8M   (Need to find)       |
|                                                                |
| Forecast Accuracy (last 3 Qs):  87%, 91%, 83%                |
+--------------------------------------------------------------+
```

---

## 8. CRM Features for High-Value B2B

### 8.1 Relationship Mapping

For deals in the $1M-$100M+ range, knowing the organizational structure and decision-making process at the customer company is critical.

**Relationship Map Features:**

```
METROBUILD CORP — RELATIONSHIP MAP

                    [James Wu]
                    CEO
                    Decision Maker (>$500K)
                    Relationship: Our VP knows him
                    Last Contact: 30d ago
                        |
            +-----------+-----------+
            |                       |
        [Sarah Chen]           [Tom Reed]
        Procurement Dir        CFO
        Decision Maker (<$500K) Financial Approver
        Primary Contact         Last Contact: 90d
        Relationship: Strong    Relationship: None
            |
        [Amy Lee]
        Procurement Analyst
        Influencer / Evaluator
        Does the price comparisons
        Last Contact: 7d
            |
        [Mike Torres]
        Site Superintendent
        Technical Influencer
        Gives feedback on quality
        Last Contact: 7d (site visit)
```

**Relationship Data Tracked:**
- Organizational hierarchy (who reports to whom)
- Role in buying process: Decision Maker, Influencer, Evaluator, Gatekeeper, User, Financial Approver
- Relationship strength with our company: Strong, Good, Neutral, Weak, None
- Who at our company has the relationship (rep, manager, VP, technical team)
- Champions vs. blockers for our business
- Communication frequency and recency
- Personal relationship notes

### 8.2 Meeting Notes and Follow-Up System

**Structured Meeting Notes Template:**

```
MEETING NOTE
Date: Mar 28, 2026 | Type: Site Visit
Customer: MetroBuild Corp
Contacts Present: Mike Torres (Site Super), Amy Lee (Procurement)
Our Team: John Smith (Sales Rep), Dave Clark (Technical Sales)

DISCUSSION SUMMARY:
- Reviewed progress on Downtown Tower Phase 2
- Mike showed the new basement level — will need additional waterproofing materials
- Amy mentioned Phase 3 bidding starts in June ($5M+ estimated)

ACTION ITEMS:
[ ] Send waterproofing product options to Amy by April 1 — John
[ ] Schedule meeting with Sarah Chen about Phase 3 — John
[ ] Get Phase 3 spec sheet from Mike — Dave

OPPORTUNITIES IDENTIFIED:
- Waterproofing materials add-on: ~$80K (create quote)
- Phase 3 early engagement: ~$5M (add to pipeline as future)

FOLLOW-UP DATE: April 3, 2026
```

**Follow-Up Reminder System:**
- Auto-reminders based on meeting action items
- Configurable follow-up cadence by customer tier:
  - Tier A: Weekly touchpoint
  - Tier B: Bi-weekly touchpoint
  - Tier C: Monthly touchpoint
- Overdue follow-up alerts on dashboard
- "Snooze" option to push reminders forward
- Escalation to manager if follow-up overdue > 1 week

### 8.3 Customer Segmentation

**Tier Criteria for Building Materials Distributor:**

| Tier | Annual Revenue | Margin Profile | Strategic Value | Service Level |
|---|---|---|---|---|
| **A (Strategic)** | > $2M/year | Any | Growth potential, reference accounts | White glove: dedicated rep, priority quoting, custom terms |
| **B (Core)** | $500K-$2M/year | > 15% margin | Stable business | Dedicated rep, standard SLA, competitive terms |
| **C (Standard)** | $100K-$500K/year | > 12% margin | Transactional | Shared rep, standard terms |
| **D (Emerging)** | < $100K/year | Any | Potential for growth | Portal-first, rep on request |

**Dynamic Tier Re-evaluation:**
- Quarterly automatic review based on trailing 12-month data
- Tier upgrade triggers: revenue growth > 30%, win rate > 70%, payment always on time
- Tier downgrade triggers: revenue decline > 30%, frequent late payments, margin erosion below 10%
- Manual override by sales manager for strategic reasons

### 8.4 Account Health Scoring for $100M Deals

For mega-deals ($10M-$100M+), the standard account health score needs additional dimensions:

```
MEGA-DEAL HEALTH INDICATORS:

1. STAKEHOLDER COVERAGE (25%):
   - Have we mapped all decision makers? (CEO, CFO, CPO, Project Director)
   - Do we have a champion inside the organization?
   - Have we met the financial approver?
   - Score: 0-100 based on coverage %

2. COMPETITIVE POSITION (25%):
   - Are we the incumbent (have we supplied before)?
   - Do we know who we're competing against?
   - Have we been told our pricing is competitive?
   - Score: Incumbent=90, Preferred=80, Competitive=60, Disadvantaged=30

3. TECHNICAL FIT (20%):
   - Can we supply all requested materials?
   - Do we have the delivery capacity?
   - Have we solved any technical questions from the customer?
   - Score: Full fit=100, Partial=60, Major gaps=20

4. RELATIONSHIP DEPTH (15%):
   - How many years have we worked with this customer?
   - How many contacts do we have engaged?
   - Have we had executive-to-executive meetings?
   - Score: Deep multi-level=100, Good single-level=60, New=20

5. DEAL MOMENTUM (15%):
   - Is the customer responding to communications?
   - Are we progressing through negotiation stages?
   - Is the project timeline firm or speculative?
   - Score: Active engagement=100, Slowing=60, Stalled=20
```

---

## 9. Mobile Sales App

### 9.1 Use Case: Outside Sales Reps in the Field

Building materials distributors typically have outside sales reps who spend 60-80% of their time visiting customer offices, construction sites, and potential new customer locations. Their mobile needs are distinct from inside sales.

### 9.2 Mobile App Screens (Priority Order)

**Screen 1: Today's Route / Agenda**
- Map view showing today's customer visits with optimized route
- Tap any pin for quick customer summary
- ETA between stops
- Add unplanned stop
- Check-in/check-out at customer location (GPS timestamp)

**Screen 2: Quick Customer Lookup**
- Search by company name, contact name, or address
- One-tap to call or email
- Quick view of: credit status, open quotes, recent orders, account health
- Full customer 360 accessible with one more tap
- "Nearby customers" — GPS-based list of other customers in the area (opportunistic visits)

**Screen 3: Submit RFQ on Behalf of Customer**
- Simplified material list entry (search catalog, set quantity)
- Photo-to-RFQ: Take a photo of a handwritten material list or spec sheet, AI extracts items
- Voice-to-RFQ: Dictate material list while walking a jobsite
- Select customer and delivery details
- Submit — goes directly into the RFQ system as if customer submitted it

**Screen 4: Quote History / Status**
- List of all quotes for the customer being visited
- Status of each (sent, viewed, negotiating, won, lost)
- Quick resend of any quote
- View PDF of any quote
- Cannot build full quotes on mobile (complex UX — directs to desktop) but can initiate a draft

**Screen 5: Order Status Check**
- For the customer being visited: all active orders with delivery status
- Expected delivery dates
- Any exceptions (backordered items, delayed shipments)
- Proof of delivery documents for recent deliveries
- Useful when customer asks "Where's my order?" during a visit

**Screen 6: Post-Meeting Notes**
- Structured note entry: Who met, what discussed, action items
- Quick tags: #opportunity, #complaint, #reorder, #new-project
- Voice-to-text for faster note-taking
- Link note to a specific customer, quote, or order
- Follow-up date picker

**Screen 7: Photo Capture**
- Camera integration for capturing:
  - Materials needed at a jobsite (for quoting)
  - Site access conditions (for delivery planning)
  - Quality issues with delivered materials (for claims)
  - Competitor products on-site (competitive intelligence)
  - Business cards (auto-create contact)
- Photos are tagged with customer, location, and date
- Integrated into the customer record

**Screen 8: Notifications**
- Push notifications for:
  - New RFQ from an assigned account
  - Quote viewed by customer
  - Customer counter-offer received
  - Delivery completed for their customer
  - Payment received
  - Approval requested/granted
- One-tap actions from notifications (call customer, view quote, etc.)

### 9.3 Offline Capability

Outside sales reps are frequently on construction sites with poor connectivity. The mobile app must support:

- **Offline customer lookup**: Last-synced customer data available without connection
- **Offline note-taking**: Notes save locally and sync when connected
- **Offline photo capture**: Photos stored locally, uploaded when connected
- **Offline RFQ draft**: Can create draft RFQ offline, submits when connected
- **Queued actions**: Any action taken offline is queued and executed upon reconnection
- **Sync indicator**: Clear visual showing last sync time and pending items

### 9.4 Mobile-Specific Features

- **Business card scanner**: OCR to create contact records from business cards
- **Expense tracking**: Log travel expenses linked to customer visits
- **Mileage tracker**: Auto-track driving miles for expense reporting
- **Competitor price capture**: Quick form to log competitor pricing heard during visits
- **Quick share**: Share a quote PDF directly from the app via email, text, or WhatsApp

---

## 10. Sales AI Assistant

### 10.1 AI Capabilities Prioritized for Building Materials Distribution

**Tier 1: High-Value, Near-Term (Build First)**

| Capability | Description | Business Impact |
|---|---|---|
| **Pre-meeting brief** | Auto-generate a 1-page summary before any customer meeting: recent orders, open quotes, payment status, AI-detected insights | Saves 15-20 min prep per meeting |
| **Quote win/loss prediction** | Score each quote 0-100 for probability of winning based on: customer history, pricing vs history, material type, competitive factors, response time | Focus effort on winnable deals |
| **Follow-up prioritization** | "Who should I call today?" — AI ranks customers by: expected reorder timing, stale quotes, at-risk accounts, upcoming project milestones | Increase proactive touchpoints |
| **Pricing recommendation** | Suggest per-line-item pricing based on: this customer's historical acceptance rates, similar deals, market conditions, customer tier target margin | Faster quote building, better margins |
| **RFQ auto-classification** | Automatically parse unstructured RFQs (emails, PDFs) into structured material lists with specs and quantities | Reduce manual data entry by 60-90% |

**Tier 2: High-Value, Medium-Term**

| Capability | Description | Business Impact |
|---|---|---|
| **Email drafting** | Draft follow-up emails, quote cover letters, negotiation responses based on context | Save 10+ min per email |
| **Customer churn prediction** | Alert when ordering patterns suggest a customer is leaving: declining frequency, smaller orders, longer payment cycles | Retain revenue |
| **Cross-sell recommendations** | "Customers who ordered structural steel also ordered X, Y, Z — this customer hasn't ordered Z" | Increase wallet share |
| **Competitive intelligence summary** | Aggregate and summarize competitor mentions from lost deal notes, customer conversations | Strategic pricing decisions |
| **Quote template suggestions** | Based on the RFQ materials and customer, suggest the most similar past successful quote as a starting template | Faster, more accurate quoting |

**Tier 3: Future / Advanced**

| Capability | Description | Business Impact |
|---|---|---|
| **Negotiation coaching** | Real-time guidance during negotiation: "Based on 50 similar negotiations, customers who counter at this level typically accept a 3% discount" | Better negotiation outcomes |
| **Demand forecasting** | Predict material demand by category for inventory planning, based on pipeline + historical + market signals | Supply chain optimization |
| **Conversation summarization** | Auto-summarize phone calls (with transcription) and long email threads into key points and action items | Reduce admin time |
| **Relationship strength scoring** | AI-analyze communication patterns and sentiment to score relationship health per contact | Identify at-risk relationships |

### 10.2 Specific AI Assistant Interactions

**Example 1: Morning Briefing**
```
AI: "Good morning, John. Here's your daily brief:

PRIORITY ACTIONS:
1. MetroBuild has viewed Quote #4521 three times — they're likely ready to
   decide. Call Sarah Chen. (Win probability: 78%)
2. Pacific Concrete hasn't placed an order in 52 days — they usually order
   every 35 days. May be buying from a competitor. (Churn risk: HIGH)
3. New RFQ from GreenField Dev — $890K estimated. They're a Tier B
   account with 62% win rate. Start quote today.

MARKET INSIGHT:
- Steel prices rose 3% this week. Consider adjusting pending quotes
  or shortening validity periods to 7 days.

YOUR NUMBERS:
- MTD: $5.1M won (68% of $7.5M target)
- 4 business days remaining
- Need $2.4M more to hit target — you have $8.3M in pipeline"
```

**Example 2: Pre-Meeting Brief**
```
AI: "Preparing brief for your 10:30 meeting with MetroBuild...

METROBUILD CORP — MEETING BRIEF
Account Health: 87/100 (Healthy)
Your relationship: Strong (3 years)

CURRENT SITUATION:
- Active quote: #4521 ($1.08M, Negotiating, 14.8% margin)
  They've countered at $1.05M — you're $30K apart
- Last order: 45 days ago (Westside Project, $340K, delivered on time)
- Payment: All current, avg 28 days to pay

TALKING POINTS:
- They have a new Phase 3 project starting in June (~$5M)
  Mentioned by Mike Torres during Mar 10 site visit
- Their Downtown Tower project is on schedule — good sign for our quote
- Consider: If we close #4521 today, it strengthens our position for Phase 3

SUGGESTED APPROACH:
- Offer to close at $1.065M (split the difference) — margin would be 13.9%
- Tie the discussion to Phase 3 — long-term relationship value
- Ask about waterproofing materials Amy Lee requested specs for"
```

**Example 3: Email Drafting**
```
AI drafts follow-up email:

Subject: Following up on Quote #4521 — Downtown Tower Steel & Rebar

Hi Sarah,

I hope the Downtown Tower project is progressing well. I wanted to follow
up on our revised quote for the structural steel and rebar package.

We've worked with our supply partners to bring the steel pricing to
$1,400/MT — this is our best rate for this grade and timeline. Combined
with our guaranteed April 15 delivery and crane offload service, I believe
this offers strong value for the project.

I'm available to discuss anytime this week — would Thursday morning work
for a quick call?

Best regards,
John Smith

[EDIT] [SEND] [ADJUST TONE: More Formal / More Casual]
```

### 10.3 AI Data Sources

The AI assistant draws from:
- Customer order history (ERP data)
- Quote history and outcomes (won/lost with reasons)
- Communication logs (emails, call notes, meeting notes)
- Market price data (commodity indices for steel, rebar, copper, lumber, etc.)
- Pipeline data (deal stages, aging, probabilities)
- Industry data (construction project databases, building permits)
- Customer portal activity (views, searches, quote requests)

---

## 11. Commission and Performance Tracking

### 11.1 Commission Structures for Building Materials Sales

**Recommended Model: Hybrid Base + Margin-Based Commission**

```
COMPENSATION STRUCTURE:

Base Salary: $70,000 - $100,000
  (varies by territory size, experience, account portfolio value)

Commission: Based on GROSS MARGIN (not revenue)

  Tier 1: 8% of gross margin on first $500K in margin
  Tier 2: 10% of gross margin on $500K - $1M in margin
  Tier 3: 12% of gross margin above $1M in margin

  Example:
  Rep sells $5M in revenue at 16% average margin = $800K gross margin
  Commission = ($500K x 8%) + ($300K x 10%) = $40K + $30K = $70K
  Total comp = $85K base + $70K commission = $155K

BONUSES:
  - Quarterly target bonus: $5K if quota met, $10K if exceeded by 20%
  - New customer acquisition bonus: $1K per new Tier A/B customer
  - Margin excellence: $2K bonus if average margin > 20% for the quarter
  - Win rate bonus: $1K if win rate > 60% for the quarter
```

**Why Margin-Based (Not Revenue-Based):**
- Revenue-based commission incentivizes reps to drop price to win deals (margin erosion)
- Margin-based commission aligns rep interests with company profitability
- In building materials: a $5M order at 10% margin ($500K profit) is worse than a $3M order at 20% margin ($600K profit)
- Reps learn to sell value (delivery reliability, quality, service) rather than competing purely on price
- Industry trend: 65% of wholesale distributors now use margin-based or hybrid commission structures

**Commission on Different Deal Types:**

| Deal Type | Commission Rate Adjustment |
|---|---|
| Standard customer reorder | Standard rate |
| New customer first order | 1.5x standard (incentivize acquisition) |
| Cross-sell (new material category) | 1.25x standard |
| Large project (>$1M) | Standard rate with milestone payouts |
| Emergency/rush order | Standard rate (margin already higher from rush premium) |
| Below-floor margin (approved exception) | 0.5x standard (discourage low-margin deals) |

### 11.2 KPIs Tracked for Sales Reps

**Activity KPIs:**

| KPI | Target | Frequency |
|---|---|---|
| RFQs responded to | 100% within SLA | Daily |
| Quotes sent | 15-25/week | Weekly |
| Customer touchpoints (calls, meetings, visits) | 20-30/week | Weekly |
| Site visits (outside sales) | 8-12/week | Weekly |
| Meeting notes logged | 100% of meetings | Real-time |
| Follow-up completion rate | > 90% | Weekly |

**Performance KPIs:**

| KPI | Target | Frequency |
|---|---|---|
| Revenue (closed orders) | Quota-dependent | Monthly/Quarterly |
| Gross Margin % | > 16% average | Monthly |
| Gross Margin $ | Quota-dependent | Monthly/Quarterly |
| Win rate (by count) | > 40% | Monthly |
| Win rate (by value) | > 50% | Monthly |
| Average deal size | Increasing trend | Quarterly |
| Average deal cycle (days) | < 21 days | Monthly |
| Customer retention rate | > 90% (Tier A/B) | Quarterly |
| Pipeline coverage ratio | > 3x quota | Monthly |
| Forecast accuracy | Within +/- 15% | Quarterly |

### 11.3 Performance Dashboard for Sales Reps

```
+--------------------------------------------------------------+
| MY PERFORMANCE — March 2026                                    |
+--------------------------------------------------------------+
|                                                                |
| EARNINGS THIS MONTH:                                          |
| +----------------------------------------------------------+ |
| | Base (Prorated):    $7,083                                 | |
| | Commission Earned:  $5,420  (on $67,750 margin closed)    | |
| | Projected Monthly:  $8,130  (based on pipeline forecast)  | |
| | TOTAL PROJECTED:    $15,213                                | |
| +----------------------------------------------------------+ |
|                                                                |
| QUOTA ATTAINMENT:                                             |
| Revenue:  $4.2M of $7.5M  [=========>          ] 56%        |
| Margin $: $672K of $1.2M  [=========>          ] 56%        |
| 4 business days remaining                                     |
|                                                                |
| WIN/LOSS:                                                     |
| Won: 8 deals ($4.2M) | Lost: 4 deals ($1.8M) | Pending: 22  |
| Win Rate: 67% (by count) | 70% (by value)                   |
|                                                                |
| TOP DEALS THIS MONTH:                                         |
| 1. GreenField Phase 2 — $1.8M @ 19.2% margin — WON         |
| 2. Pacific Concrete Rebar — $890K @ 17.1% margin — WON      |
| 3. Summit Builders — $680K @ 16.5% margin — WON             |
|                                                                |
| ACTIVITY METRICS:                                             |
| Quotes Sent: 18 | Calls: 42 | Meetings: 11 | Site Visits: 6|
| Avg RFQ Response Time: 2.8 hours                             |
+--------------------------------------------------------------+
```

### 11.4 Team Leaderboard (Manager View)

```
+--------------------------------------------------------------+
| SALES LEADERBOARD — Q1 2026                                    |
+--------------------------------------------------------------+
| RANK | REP          | REVENUE  | MARGIN$ | MARGIN% | WIN RATE|
|------|------------- |----------|---------|---------|---------|
| 1    | J. Smith     | $15.2M   | $2.74M  | 18.0%   | 67%     |
| 2    | A. Johnson   | $13.8M   | $2.48M  | 18.0%   | 62%     |
| 3    | M. Williams  | $12.1M   | $1.94M  | 16.0%   | 58%     |
| 4    | S. Davis     | $11.5M   | $1.84M  | 16.0%   | 55%     |
| 5    | R. Martinez  | $9.8M    | $1.47M  | 15.0%   | 51%     |
+--------------------------------------------------------------+
| MOST IMPROVED: R. Martinez (+34% vs Q4 2025)                 |
| HIGHEST MARGIN: J. Smith (18.0% avg)                         |
| FASTEST RESPONSE: A. Johnson (1.9h avg RFQ response)         |
+--------------------------------------------------------------+
```

---

## 12. Integration with Other Modules

### 12.1 Integration Architecture Overview

```
                        ┌─────────────────┐
                        │   SALES APP     │
                        │  (HyperQuote)   │
                        └────────┬────────┘
                                 │
         ┌───────────┬───────────┼───────────┬───────────┐
         │           │           │           │           │
    ┌────▼────┐ ┌────▼────┐ ┌───▼────┐ ┌───▼────┐ ┌───▼────┐
    │PROCURE- │ │WAREHOUSE│ │FINANCE │ │CUSTOMER│ │DISPATCH│
    │MENT     │ │& INVEN- │ │& ACCTG │ │PORTAL  │ │& DLVRY │
    │         │ │TORY     │ │        │ │        │ │        │
    └─────────┘ └─────────┘ └────────┘ └────────┘ └────────┘
```

### 12.2 Sales <-> Procurement Integration

**What Sales Needs from Procurement:**
| Data Point | Real-Time? | Description |
|---|---|---|
| Material cost (internal cost basis) | Yes | Current cost per item for margin calculation |
| Lead time per item | Yes | How long from PO to receipt, per supplier |
| Supplier availability | Yes | Is the item in stock at the supplier? |
| Alternative suppliers | On request | Other sources if primary is unavailable or expensive |
| Commodity price trends | Daily | Price direction for steel, rebar, lumber, etc. |

**What Procurement Needs from Sales:**
| Data Point | Real-Time? | Description |
|---|---|---|
| Pipeline forecast by material | Weekly | Expected material demand for procurement planning |
| Cost request (for specific quote) | Yes | "I need current cost for 450 MT ASTM A992 steel" |
| Won deal notification | Yes | Triggers supplier PO creation |
| Market intelligence | Ongoing | Competitor pricing heard from customers |

**Integration Workflows:**

```
1. COST REQUEST FLOW:
   Sales builds quote → System checks cost freshness →
   If stale: Auto-sends cost request to procurement →
   Procurement updates cost (from supplier or estimate) →
   Cost appears in sales quote builder within minutes

2. WON DEAL → SUPPLIER PO FLOW:
   Quote marked as Won → Order created →
   System generates draft supplier POs (one per supplier) →
   Procurement reviews and sends POs →
   Procurement tracks confirmations →
   Sales sees "POs placed" status on order

3. PIPELINE → DEMAND PLANNING:
   Sales pipeline data aggregated weekly →
   Materials in quotes weighted by win probability →
   Procurement sees: "Expected demand for Q2:
   2,000 MT structural steel (65% confidence)"
```

### 12.3 Sales <-> Warehouse/Inventory Integration

**What Sales Needs from Warehouse:**
| Data Point | Real-Time? | Description |
|---|---|---|
| Stock availability per item | Yes | What's in stock now (available to promise) |
| Reserved stock per item | Yes | Already committed to other orders |
| Available-to-promise (ATP) | Yes | Stock minus reservations = what can be quoted |
| Warehouse location | Yes | Which warehouse has the stock (multi-warehouse) |
| Expected receipts | Yes | Incoming stock with ETAs |

**Integration in Quote Builder:**
```
When sales rep adds a line item:
  System checks: "450 MT Structural Steel ASTM A992"

  Result displayed:
  +--------------------------------------------------------------+
  | AVAILABILITY CHECK:                                           |
  | Warehouse A (Metro City): 200 MT available                   |
  | Warehouse B (East Side):  150 MT available                   |
  | Total Available:          350 MT                              |
  | Requested:                450 MT                              |
  | SHORTAGE:                 100 MT (needs procurement)          |
  |                                                                |
  | Expected Receipt: 80 MT arriving April 5 (PO #3342)          |
  | Remaining Gap: 20 MT — Source from supplier (lead time: 7d)  |
  |                                                                |
  | Earliest Full Delivery: April 12, 2026                        |
  | Customer Requested: April 15, 2026 — FEASIBLE                |
  +--------------------------------------------------------------+
```

### 12.4 Sales <-> Finance/Accounting Integration

**What Sales Needs from Finance:**
| Data Point | Real-Time? | Description |
|---|---|---|
| Customer credit limit | Yes | Maximum outstanding balance allowed |
| Current outstanding balance | Yes | Total unpaid invoices |
| Available credit | Yes | Limit minus outstanding |
| Overdue invoices | Yes | Any past-due amounts (and how past-due) |
| Payment history/rating | On-demand | Pattern of payment behavior |
| Credit hold status | Yes | Is the customer on credit hold? |

**Integration Workflows:**

```
1. CREDIT CHECK DURING QUOTING:
   Rep opens quote builder → System auto-checks credit →
   If available credit > quote value: Green light
   If available credit < quote value: Warning displayed
   If customer on credit hold: BLOCKED — must resolve before quoting

   Credit check details:
   +----------------------------------------------+
   | Credit Limit:      $2,000,000                |
   | Outstanding:        $600,000                 |
   | Available:          $1,400,000               |
   | This Quote:         $1,080,000               |
   | Remaining After:    $320,000                 |
   | Status: APPROVED — sufficient credit         |
   +----------------------------------------------+

2. WON QUOTE → ORDER → INVOICE FLOW:
   Quote won → Order created → Sales can see order status →
   Delivery completed → Invoice auto-generated →
   Sales sees invoice status on customer 360 →
   Payment received → Sales sees updated AR on customer 360

3. OVERDUE PAYMENT ALERT:
   Invoice becomes overdue → Sales rep alerted →
   "MetroBuild Invoice #8890 ($120K) is 15 days overdue.
    Contact Lisa Park (AP Manager) at lisa@metrobuild.com"
   → Rep can coordinate with collections team
```

### 12.5 Sales <-> Customer Portal Integration

**What Sales Sees from Customer Portal Activity:**
| Activity | Sales View |
|---|---|
| Customer submitted RFQ | Appears in RFQ inbox immediately |
| Customer viewed quote | Activity feed: "Sarah Chen viewed Quote #4521" |
| Customer countered quote | Notification + counter appears in negotiation screen |
| Customer accepted quote | Notification + auto-conversion to order starts |
| Customer browsed catalog | "MetroBuild searched for 'waterproofing membrane' 3 times this week" |
| Customer checked order status | Visible in activity log (shows engagement) |
| Customer downloaded documents | "Sarah downloaded Invoice #8834 PDF" |

**Sales Rep Actions That Appear in Customer Portal:**
| Action | Customer Portal View |
|---|---|
| Quote sent | Customer sees new quote in their portal inbox |
| Clarification requested | Customer sees message requesting additional details |
| Order status updated | Customer sees updated delivery tracking |
| Message sent | Customer sees rep's message in communication thread |

### 12.6 Sales <-> Dispatch/Delivery Integration

**What Sales Needs from Dispatch:**
| Data Point | Real-Time? | Description |
|---|---|---|
| Delivery schedule | Yes | When is the order scheduled for delivery? |
| Delivery status | Yes | In progress, completed, delayed |
| Proof of delivery | Yes | Signed POD documents and photos |
| Delivery exceptions | Yes | Delays, partial deliveries, access issues |
| Available delivery slots | During quoting | Can we deliver on the date promised? |

**Delivery Promise During Quoting:**
```
When sales rep sets delivery date in quote builder:
  System checks with dispatch:
  - Is a delivery vehicle available for that date + route?
  - Does the delivery require special equipment (crane, flatbed)?
  - What's the earliest available delivery slot?

  Result:
  "April 15 delivery — CONFIRMED. Flatbed with crane available.
   Time window: 6:00 AM - 8:00 AM (as requested by customer)"

   OR

  "April 15 delivery — NOT AVAILABLE. Crane truck booked.
   Earliest available: April 17. [UPDATE QUOTE DATE] [OVERRIDE]"
```

---

## 13. Real Sales Tools in Distribution — Competitive Analysis

### 13.1 Epicor Prophet 21

**What Prophet 21 Offers for Sales:**
- Single-screen order entry for quotes and orders
- Quote-to-order conversion in one click
- Counter sales with signature capture (walk-in customers)
- Browser-based mobile access for field reps
- Integrated CRM with contact management, sales tracking, lead management
- Customer Buying Trend Analysis module — proactive insights on customer purchasing patterns
- Strategic Pricing module — optimal pricing based on market data and sales history
- Revenue recovery tools — identifies at-risk customers and revenue decline
- Epicor Commerce — customer self-service portal for online ordering
- Epicor Cash Collect — AR automation with workflow-driven collections
- Epicor Quick Ship — streamlined fulfillment and carrier communication
- 2025: Epicor Prism AI launched for cloud customers — agentic AI for automating routine decisions

**Strengths:**
- Purpose-built for distribution — understands multi-warehouse, contract pricing, vendor rebates, split shipments
- Unified ERP means sales sees real-time inventory, cost, and financials without integration headaches
- Strong counter sales support (unique to distribution vs generic CRM)
- Buying trend analysis is uniquely valuable for distribution (proactive reorder alerts)

**Weaknesses / Gaps:**
- CRM is functional but basic compared to Salesforce — lacks advanced relationship mapping, deal coaching
- Quote negotiation tracking is minimal — no version history, no side-by-side comparison
- No built-in CPQ with margin waterfall visualization
- Mobile experience is browser-based, not a native mobile app — UX is suboptimal for field use
- No AI-powered pricing recommendations (though Prism AI is beginning to address this)
- Pipeline and forecasting views are limited compared to modern CRM tools
- No customer 360 view aggregating all touchpoints — data is spread across modules

### 13.2 Oracle NetSuite CRM

**What NetSuite Offers for Sales:**
- Sales force automation (SFA) with opportunity management
- Quote management with CPQ capabilities
- Integrated with ERP — sales, inventory, finance all in one system
- Customer 360 view with recent enhancements (2025 v1 release)
- Commission management
- Sales forecasting
- Partner relationship management
- Marketing automation
- Omnichannel order management (counter, ecommerce, field)
- Real-time inventory visibility across all warehouses

**Strengths:**
- True all-in-one platform — CRM + ERP + eCommerce in a single system
- Customer 360 is genuine — one place for all customer data
- Strong for wholesale distribution with multi-warehouse, complex pricing
- Good reporting and analytics
- Cloud-native, modern UI

**Weaknesses / Gaps:**
- Generic CRM — not distribution-specific in its sales workflows
- No RFQ-specific inbox or triage system
- Quote builder lacks distribution-specific features (material spec handling, supplier cost lookup)
- CPQ is basic compared to dedicated CPQ tools (Salesforce CPQ, DealHub)
- Negotiation tracking is minimal
- No built-in AI for pricing recommendations or win/loss prediction (though Oracle AI is being integrated)
- Customer 360 enhancements are recent and still maturing
- Expensive — licensing and implementation costs are high for mid-market distributors

### 13.3 Salesforce Sales Cloud + CPQ

**What Salesforce Offers for Sales:**
- Industry-leading CRM with deep customization
- Salesforce CPQ — full configure, price, quote with:
  - Price waterfall visualization (list price → net price → pocket margin)
  - Multi-tier approval workflows based on discount thresholds
  - Product configuration rules and bundling
  - Guided selling
- Opportunity management with customizable pipeline stages
- Advanced analytics (Tableau integration)
- Einstein AI — deal scoring, next-best-action, forecasting
- Mobile app — native iOS/Android with offline support
- AppExchange ecosystem — thousands of distribution-specific add-ons
- Integration with Rootstock ERP for distribution back-office

**Strengths:**
- Best-in-class CRM capabilities — relationship mapping, activity tracking, forecasting
- CPQ is the most powerful on the market — handles complex pricing rules, approval workflows
- Einstein AI is mature — predictive lead scoring, deal insights, recommended actions
- Highly customizable — can be configured for any industry including distribution
- Massive ecosystem and community
- Strong mobile app

**Weaknesses / Gaps:**
- Not built for distribution — requires significant customization to handle:
  - Multi-warehouse inventory visibility (needs ERP integration)
  - Material specifications and substitutions
  - RFQ-specific workflows
  - Construction project tracking
- Expensive — licensing + CPQ + customization + implementation = $200K+ for mid-size distributor
- Requires Salesforce admin/developer to maintain
- CPQ is powerful but complex — sales reps find it overwhelming without training
- No native ERP — needs integration with separate ERP (complexity, data sync issues)
- Generic opportunity stages don't match the RFQ→Quote→Negotiate→Order lifecycle

### 13.4 HubSpot CRM

**What HubSpot Offers for Sales:**
- Free tier CRM with contact management and deal tracking
- Sales Hub for pipeline management, sequences, and automation
- Quote tool with electronic signature
- Meeting scheduler
- Email tracking and templates
- Reporting dashboards
- Marketing Hub integration
- Custom objects (limited compared to Salesforce)

**Strengths:**
- Extremely easy to set up and use — minimal training needed
- Free tier is generous for small teams
- Great marketing-to-sales handoff
- Email tracking is excellent
- Clean, modern UX

**Weaknesses / Gaps:**
- Not designed for distribution at all — major gaps:
  - No RFQ management
  - Quote tool is basic (no line-item margin management, no cost lookup)
  - No inventory integration
  - No material/product specification handling
  - No multi-warehouse awareness
  - Pipeline stages are generic
- Limited customization — can't handle the complexity of building materials quoting
- Advanced features only in expensive Enterprise tier
- No CPQ capabilities
- No distribution-specific AI
- No credit check integration
- Not suitable for $100K-$100M deal complexity

### 13.5 Proton.ai (Distribution-Specific)

**What Proton Offers:**
- AI-powered CRM built specifically for distributors
- Customer spending gap analysis — shows where customers are underspending
- Cross-sell and product recommendations per customer
- At-risk account identification
- Reorder prediction — flags when customers are due to reorder
- ERP integration (Epicor, Infor, SAP, etc.)
- Sales rep prioritization — tells reps which accounts to focus on
- Coming soon: "Pronto" — real-time AI co-pilot for sales teams
- Coming soon: "Proton BI" — embedded business intelligence

**Strengths:**
- Purpose-built for distribution — understands the industry
- AI recommendations are powerful and distribution-specific
- Strong ERP integration
- Addresses the #1 pain point: "Which customer should I call and what should I sell them?"
- Growing rapidly (100%+ YoY growth)

**Weaknesses / Gaps:**
- CRM-only — no quote builder, no RFQ management, no CPQ
- No quote negotiation tracking
- No delivery/dispatch integration
- No financial/credit integration
- Meant to augment ERP, not replace it — still need an order entry system
- Relatively new — less mature than established platforms
- No mobile-native app (as of research date)

### 13.6 Construct CRM (Building Products Specific)

**What Construct CRM Offers:**
- AI-powered eCommerce and order platform for building products distributors
- White-label contractor CRM (customer-facing)
- AI product information management (auto-enhance catalogs)
- AI email/text order conversion (unstructured messages → structured ERP orders)
- Instant quoting
- Invoicing and payments
- Scheduling and dispatch
- ERP integration (Epicor, DMSI, Infor) in 1 week implementation
- Outcome-based pricing (pay only on profitable orders)

**Strengths:**
- Built specifically for building products distribution
- Rapid implementation (1 week vs months for traditional ERP)
- AI order processing reduces manual data entry by 90%
- Customer-facing CRM creates stickiness
- Outcome-based pricing reduces implementation risk
- Handles the full quote-to-cash cycle

**Weaknesses / Gaps:**
- Relatively new company — limited track record
- Sales rep-facing CRM features are less clear (focus seems to be on customer self-service)
- No detailed information available on negotiation tracking, pipeline management
- Dependent on ERP integration quality
- May not handle complex $10M+ deal negotiation workflows
- Limited information on margin management and pricing guardrails

### 13.7 What HyperQuote Should Replicate — and What's Missing

**Must-Have Features (present in existing tools):**

| Feature | Source |
|---|---|
| Single-screen quote and order entry | Prophet 21 |
| Real-time inventory/availability check during quoting | Prophet 21, NetSuite |
| CPQ with price waterfall and margin guardrails | Salesforce CPQ |
| Multi-tier approval workflows | Salesforce CPQ |
| Customer 360 view | NetSuite, Salesforce |
| Pipeline management with weighted forecasting | Salesforce, HubSpot |
| AI-powered customer recommendations | Proton.ai |
| Buying pattern analysis and churn prediction | Prophet 21, Proton.ai |
| Native mobile app for field sales | Salesforce, RepMove |
| Credit check integration during quoting | NetSuite, Prophet 21 |
| Customer self-service portal with RFQ submission | Construct CRM, Adobe Commerce |
| ERP integration for finance, warehouse, procurement | All |

**Differentiating Features (missing from existing tools — HyperQuote's opportunity):**

| Feature | Why It's Missing | HyperQuote Advantage |
|---|---|---|
| **Dedicated RFQ inbox with AI triage** | No existing tool has a purpose-built RFQ inbox with auto-priority scoring and intelligent routing | First-class RFQ management is the entry point for a quote-based distributor |
| **Quote negotiation tracking with version history and side-by-side comparison** | Salesforce CPQ tracks versions but doesn't provide the negotiation UI. Adobe Commerce has it for B2B ecommerce but not for internal sales teams | Building materials negotiation is multi-round and line-item-specific — needs dedicated UX |
| **What-if margin calculator in the negotiation screen** | No existing tool provides real-time "if I drop 5%, what happens?" alongside the negotiation conversation | Reps need instant margin impact analysis during customer calls |
| **AI pricing recommendations based on customer history + market conditions** | Proton.ai does some of this but not at the line-item level during quote building | Per-item pricing intelligence during the quoting process is transformative |
| **Integrated procurement cost request during quoting** | Prophet 21 and NetSuite show cost but don't have a real-time cost request workflow from sales to procurement | For non-stock or volatile-price items, the "request fresh cost" workflow is essential |
| **Construction project tracking linked to quotes and orders** | Generic CRMs don't understand construction projects. RepMove has jobsite tracking but not linked to quoting | Building materials sales revolve around projects — every quote is tied to a project |
| **Offline-capable mobile app with photo-to-RFQ** | No existing tool converts jobsite photos into structured RFQs using AI | Outside sales reps at construction sites need this desperately |
| **Commission calculator tied to real-time margin data** | Commission tools exist separately but aren't integrated into the quote builder | Rep should see "If I close this deal at this margin, my commission is $X" |
| **Unified sales + operations view** | Sales CRMs don't show delivery status. ERPs don't show CRM data. No one combines them well | The rep is the customer's single point of contact and needs visibility into everything |

---

## Summary: The Complete Sales App for HyperQuote

### Screen Inventory

| # | Screen | Primary User | Priority |
|---|---|---|---|
| 1 | Home Dashboard | All sales reps | P0 |
| 2 | RFQ Inbox | Inside sales, sales ops | P0 |
| 3 | RFQ Detail | All sales reps | P0 |
| 4 | Quote Builder | All sales reps | P0 |
| 5 | Quote Detail / Negotiation | All sales reps | P0 |
| 6 | Customer 360 View | All sales reps | P0 |
| 7 | Pipeline / Funnel View | All sales reps, managers | P0 |
| 8 | Activity Feed | All sales reps | P1 |
| 9 | Calendar | All sales reps | P1 |
| 10 | Contacts | All sales reps | P1 |
| 11 | Reports | Managers, reps | P1 |
| 12 | Product Catalog / Search | All sales reps | P1 |
| 13 | Performance / Commission | All sales reps | P1 |
| 14 | Team View / Leaderboard | Managers | P2 |
| 15 | Notifications Center | All sales reps | P1 |
| 16 | Settings | All sales reps | P2 |
| 17 | Mobile: Today's Route | Outside sales | P1 |
| 18 | Mobile: Quick Customer Lookup | Outside sales | P0 |
| 19 | Mobile: Submit RFQ | Outside sales | P1 |
| 20 | Mobile: Post-Meeting Notes | Outside sales | P1 |
| 21 | Mobile: Photo Capture | Outside sales | P2 |

### Key Design Principles

1. **Speed is everything** — In building materials distribution, the first distributor to respond to an RFQ wins 35-50% of the time. Every screen should be optimized for speed.
2. **Margin visibility everywhere** — Margin should be visible on every screen that shows a price. The rep should never not know the margin implication of their actions.
3. **Customer context always accessible** — Whether building a quote, checking a pipeline, or reviewing a delivery, the customer's full context should be one click away.
4. **Single source of truth** — The sales app must pull real-time data from procurement, warehouse, finance, and dispatch. No stale data, no data entry duplication.
5. **Mobile-first for outside sales** — Field reps live on their phones. The mobile experience must be a first-class citizen, not a responsive desktop.
6. **AI as copilot, not replacement** — AI should augment the rep's judgment (pricing suggestions, follow-up reminders, pattern detection) but never auto-send a quote or auto-accept a deal.
7. **Built for negotiation** — Unlike SaaS sales tools, this app must treat multi-round negotiation as a core workflow, not an edge case.

---

## Sources

- [Epicor Prophet 21 Sales Management](https://www.epicor.com/en-us/products/enterprise-resource-planning-erp/prophet-21/sales-marketing/)
- [Epicor Prophet 21 CRM](https://www.epicor.com/en-us/products/enterprise-resource-planning-erp/prophet-21/customer-relationship-management-crm/)
- [Epicor Prophet 21 Modules & Features](https://www.estesgrp.com/solutions/erp-solutions/prophet-21/prophet-21-modules/)
- [NetSuite CRM](https://www.netsuite.com/portal/products/crm.shtml)
- [NetSuite Wholesale Distribution](https://www.netsuite.com/portal/industries/wholesale.shtml)
- [Salesforce CPQ](https://www.salesforce.com/sales/cpq/what-is-salesforce-cpq/)
- [Salesforce Industries CPQ](https://trailhead.salesforce.com/content/learn/modules/industries-cpq-foundations/explore-the-industries-cpq-solution)
- [DealHub CPQ](https://dealhub.io/glossary/cpq/)
- [PandaDoc CPQ Price Waterfall](https://www.pandadoc.com/blog/cpq-price-waterfall/)
- [Proton.ai — AI for Distributors](https://www.proton.ai/)
- [Proton.ai CRM Overview](https://www.proton.ai/crm-overview)
- [Construct CRM — Building Products Distribution](https://constructcrm.com/)
- [Richards Building Supply CRM](https://www.roofingcontractor.com/articles/101728-richards-building-supply-adds-property-intelligence-to-crm)
- [Rotabull — Build a Better RFQ Inbox](https://rotabull.com/blog/build-a-better-rfq-inbox)
- [Adobe Commerce Negotiable Quotes](https://experienceleague.adobe.com/en/docs/commerce-admin/b2b/quotes/quotes)
- [B2B Quote-to-Order Workflow Optimization](https://www.creatuity.com/insights/b2b-quote-to-order-workflow-optimization-2026/)
- [Scalable Quoting Approval Workflow](https://blog.varstreetinc.com/from-chaos-to-close-a-simple-scalable-quoting-workflow-for-b2b-teams/)
- [BetterCommerce AI in B2B Sales](https://www.bettercommerce.io/blog/ai-in-b2b-sales-9-gamechanging-ai-automation-strategies)
- [Construction Sales Commission Guide](https://www.everstage.com/sales-commission/construction-sales-commission)
- [QuotaPath Commission Rates by Industry](https://www.quotapath.com/blog/commission-rates-by-industry/)
- [RepMove — Outside Sales for Construction](https://repmove.app/construction-sales-software/)
- [SPOTIO — Best Apps for Sales Reps](https://spotio.com/blog/best-apps-for-sales-reps/)
- [Monday.com — 360 Customer View](https://monday.com/blog/crm-and-sales/360-degree-customer-view/)
- [EvaluationsHub — 360 B2B Customer View](https://evaluationshub.com/how-to-build-a-360-view-of-your-b2b-customers/)
- [Customer Health Score Guide](https://firstdistro.com/learn/customer-health-score)
- [RFM Segmentation Guide](https://mcpanalytics.ai/articles/rfm-segmentation-practical-guide-for-data-driven-decisions)
- [Pipeline Weighted Forecasting](https://www.drivetrain.ai/post/pipeline-weighted-sales-forecasting)
- [Pricefx — Sales Margin Pricing](https://www.pricefx.com/learning-center/how-to-get-your-sales-team-to-focus-on-margin-pricing)
- [Pragmatic Institute — Sales Pricing Champions](https://www.pragmaticinstitute.com/resources/articles/product/make-salespeople-the-champions-of-your-pricing-strategy/)
- [B2B Distributor Pricing Trends](https://www.the-future-of-commerce.com/2024/07/17/b2b-distributors-pricing-trends-that-threaten-profitability/)
- [Nutshell CRM for Building Materials](https://www.nutshell.com/industries/building-materials-suppliers)
- [Prospect CRM for Construction](https://www.prospectsoft.com/industries/construction/)
