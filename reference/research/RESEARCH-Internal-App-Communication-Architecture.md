> ⚠️ **REFERENCE DOCUMENT — NOT THE SOURCE OF TRUTH**
> This file was written during the research phase and may contain outdated decisions, US-centric references, or superseded technical choices.
> **Always defer to `essential/RESEARCH.md` for current decisions.**
> Key changes since this file was written: TanStack Start (not Next.js), Capacitor (not Expo), React Aria (not shadcn), Egyptian law (not US FMCSA), EGP (not USD), dual auth pools, no online payments, no mobile wallets, spatial glass UI (not traditional dashboards).

# INTERNAL APP COMMUNICATION ARCHITECTURE
## How Apps Connect and Communicate in a B2B Building Materials Distribution Platform
### Research for: Customer Portal, Supplier Portal, Internal Sales App, Internal Procurement App, Internal Operations App, Internal Finance App, Driver App, CEO App

---

## Table of Contents

1. [Unified Platform vs Separate Apps](#1-unified-platform-vs-separate-apps)
2. [Real-Time Notifications Between Departments](#2-real-time-notifications-between-departments)
3. [Activity Feeds and Audit Trails](#3-activity-feeds-and-audit-trails)
4. [Approval Chains Across Departments](#4-approval-chains-across-departments)
5. [Shared Views vs Role-Specific Views](#5-shared-views-vs-role-specific-views)
6. [Dashboard Design for Cross-Departmental Visibility](#6-dashboard-design-for-cross-departmental-visibility)
7. [Handoff Points Between Departments](#7-handoff-points-between-departments)
8. [Internal AI Assistant](#8-internal-ai-assistant)
9. [Mobile Access for Internal Roles](#9-mobile-access-for-internal-roles)
10. [Admin Panel and System Configuration](#10-admin-panel-and-system-configuration)

---

## 1. UNIFIED PLATFORM VS SEPARATE APPS

### The Verdict: ONE Platform, Role-Based Views, Modular Structure

The modern consensus (2025-2026) is overwhelmingly clear: **build ONE unified platform with role-based views, not separate apps per department.** This is what every major ERP (NetSuite, Odoo, SAP) does, and what custom B2B platforms should emulate.

### How the Major ERPs Handle This

**NetSuite (Unified Monolith)**
- Single unified platform where everything shares one database, one data model, one interface
- Users access all ERP modules through a single sign-on portal
- A sales order in CRM creates inventory allocations, triggers fulfillment workflows, generates invoices, posts revenue -- all in one transaction flow
- Role-based dashboards show each user only what they need
- Result: Zero data duplication, no integration headaches, real-time cross-department visibility

**Odoo (Modular Monolith)**
- Modular architecture: you install the apps you need (Accounting, Inventory, CRM, etc.)
- Each "app" is really a module within a single platform sharing one database
- You can start with CRM + Sales, add Inventory later, then Manufacturing
- All modules share the same user system, navigation, and data layer
- Trade-off: Modules are well-integrated but not as deeply as NetSuite (e.g., Manufacturing and Accounting may not perfectly agree on costs)

**SAP Business One**
- Single-instance platform with functional modules
- Shared master data (customers, suppliers, items) across all modules
- Authorization system controls what each user sees and can do

### Architecture Recommendation for This Platform

```
RECOMMENDED: UNIFIED PLATFORM WITH MODULE STRUCTURE

+------------------------------------------------------------------+
|                    SHARED PLATFORM SHELL                          |
|  [Auth] [Navigation] [Notifications] [Search] [AI Assistant]     |
+------------------------------------------------------------------+
|                                                                    |
|  +------------+  +-------------+  +------------+  +-----------+  |
|  | SALES      |  | PROCUREMENT |  | OPERATIONS |  | FINANCE   |  |
|  | MODULE     |  | MODULE      |  | MODULE     |  | MODULE    |  |
|  |            |  |             |  |            |  |           |  |
|  | - Quotes   |  | - Inquiries |  | - Orders   |  | - AR/AP   |  |
|  | - Pipeline |  | - Suppliers |  | - Delivery |  | - Credit  |  |
|  | - CRM      |  | - POs       |  | - Warehouse|  | - Margins |  |
|  | - RFQs     |  | - Compare   |  | - Dispatch |  | - Reports |  |
|  +------------+  +-------------+  +------------+  +-----------+  |
|                                                                    |
|  +-----------+   +-----------+                                    |
|  | CEO/MGMT  |   | ADMIN     |                                   |
|  | MODULE    |   | MODULE    |                                   |
|  |           |   |           |                                   |
|  | - KPIs    |   | - Users   |                                   |
|  | - Alerts  |   | - Roles   |                                   |
|  | - Reports |   | - Config  |                                   |
|  +-----------+   +-----------+                                   |
|                                                                    |
+------------------------------------------------------------------+
|                    SHARED DATA LAYER                               |
|  [Customers] [Suppliers] [Products] [Orders] [Quotes] [Payments] |
+------------------------------------------------------------------+
```

### Why NOT Separate Apps

| Factor | Unified Platform | Separate Apps |
|--------|-----------------|---------------|
| **Data consistency** | Single source of truth | Data duplication, sync conflicts |
| **Cross-department views** | Native -- sales can see delivery status | Requires API integration per view |
| **Notifications** | Single notification system | Each app needs its own + cross-app routing |
| **User experience** | One login, consistent UI, familiar patterns | Multiple logins, different UIs, context-switching |
| **Maintenance** | One codebase, one deployment, one upgrade | N codebases, N deployments, version mismatches |
| **TCO** | ~22% better total cost of ownership (OroCommerce data) | Higher cost at every level |
| **Development speed** | Shared components, single schema changes | Every feature requires cross-app coordination |
| **Audit trail** | Centralized -- all actions in one log | Fragmented across apps, hard to reconstruct |
| **AI assistant** | One assistant with full context | Multiple assistants or one with limited context |
| **Search** | Global search across all entities | Searching requires switching apps |

### The Exception: External-Facing Apps Are Separate

While internal apps should be unified, external-facing apps remain separate for good reasons:

```
SEPARATE DEPLOYMENTS (different auth, different UX, different security):
  - Customer Portal     (customer-facing, self-service)
  - Supplier Portal     (supplier-facing, inquiry response)
  - Driver App          (mobile-native, offline-capable)

UNIFIED INTERNAL PLATFORM (one deployment, role-based views):
  - Sales Module
  - Procurement Module
  - Operations Module
  - Finance Module
  - CEO/Management Module
  - Admin Module
```

The Driver App is separate because it is mobile-native, needs heavy offline support, and has a fundamentally different UX (map-centric, delivery-focused). The Customer and Supplier Portals are separate because they serve external users with different auth systems, security boundaries, and UX requirements.

### How Modules Connect Inside the Unified Platform

```
MODULE BOUNDARY PATTERN:

Each module is a "namespace" within the platform:
  /sales/quotes
  /sales/pipeline
  /procurement/inquiries
  /procurement/purchase-orders
  /operations/fulfillment
  /operations/dispatch
  /finance/invoices
  /finance/payments
  /ceo/dashboard
  /admin/users

But they share:
  - Navigation sidebar (filtered by role)
  - Notification bell (unified inbox)
  - Global search bar
  - AI assistant
  - Entity detail pages (a quote page has tabs for sales, procurement, finance context)
  - Activity feed component
  - Approval workflow engine
  - File/document storage
  - User/auth system
```

---

## 2. REAL-TIME NOTIFICATIONS BETWEEN DEPARTMENTS

### Notification Architecture

The notification system is the nervous system of the platform. Every inter-department communication flows through a centralized notification service.

### The Five Notification Channels

```
CHANNEL HIERARCHY (escalation order):

1. IN-APP NOTIFICATION (Bell icon, always first)
   - Appears in notification center
   - Badge count on bell icon
   - Grouped by entity (all notifications about QT-0891 together)
   - Click to navigate directly to the relevant screen
   - Persists until read/dismissed

2. IN-APP TOAST (Real-time popup)
   - Shows for 5-8 seconds, auto-dismisses
   - For urgent items: "Quote QT-0891 requires your approval"
   - User can click to go directly, or dismiss

3. PUSH NOTIFICATION (Mobile/desktop)
   - For time-sensitive items when user is not actively in the app
   - Approval requests, deadline warnings, status changes
   - Links directly to the entity in the app

4. EMAIL DIGEST
   - Batched summary: hourly during business hours, daily overnight
   - For non-urgent: "You have 3 pending approvals, 5 new price responses"
   - Each item links back to the app

5. EXTERNAL CHANNEL (Slack/Teams integration)
   - Optional: for teams that live in Slack/Teams
   - Bot posts to department channel: "#procurement: New pricing request from Sales (QT-0891)"
   - Actionable: can approve/reject from Slack with buttons
   - Links back to full context in the app
```

### Notification Triggers: Every Cross-Department Event

```
SALES --> PROCUREMENT:
  Trigger: Sales creates a sourcing request for a quote
  Notification: "New pricing request: QT-0891 (14 line items, due Mar 30)"
  Recipients: Assigned procurement officer OR procurement queue
  Channel: In-app toast + push notification
  Action: [View Request] [Accept Assignment]

PROCUREMENT --> SALES:
  Trigger: Supplier prices received and selected
  Notification: "Pricing ready for QT-0891: 12 of 14 items priced, 2 pending"
  Recipients: Quote owner (sales rep)
  Channel: In-app toast + push notification
  Action: [Build Quote] [View Pricing]

SALES --> SALES MANAGER:
  Trigger: Quote submitted for margin approval (margin below rep authority)
  Notification: "Approval needed: QT-0891, margin 11.5% (floor: 12%)"
  Recipients: Sales manager
  Channel: In-app toast + push + email
  Action: [Approve] [Reject] [Adjust] [View Details]

SALES MANAGER --> FINANCE:
  Trigger: Quote exceeds credit limit or needs credit approval
  Notification: "Credit review: QT-0891 for Delta ($450K, customer at 90% credit limit)"
  Recipients: Credit controller / finance manager
  Channel: In-app toast + push
  Action: [Approve Credit] [Increase Limit] [Reject] [View Customer]

SALES --> CUSTOMER PORTAL:
  Trigger: Quote sent to customer
  Notification: "New quote from [Company]: QT-0891 ($2.1M, 14 items)"
  Recipients: Customer portal user
  Channel: Portal notification + email

CUSTOMER PORTAL --> SALES:
  Trigger: Customer accepts/rejects/comments on quote
  Notification: "Customer accepted QT-0891! Order ready to process"
  Recipients: Quote owner
  Channel: In-app toast + push + email
  Action: [Create Order] [View Quote]

SALES --> OPERATIONS:
  Trigger: Order confirmed (customer accepted, payment terms set)
  Notification: "New order for fulfillment: ORD-301 (ABC Corp, $2.1M, 14 items)"
  Recipients: Operations manager
  Channel: In-app toast + push
  Action: [View Order] [Assign Fulfillment]

PROCUREMENT --> OPERATIONS:
  Trigger: PO placed with supplier / shipment tracking updated
  Notification: "PO-2201 shipped from SupplierA, ETA: Apr 5"
  Recipients: Operations manager
  Channel: In-app notification
  Action: [Track Shipment] [View PO]

OPERATIONS --> OPERATIONS (DISPATCH):
  Trigger: Goods received and ready for customer delivery
  Notification: "ORD-301 ready for dispatch: 14 items at Warehouse B"
  Recipients: Dispatch coordinator
  Channel: In-app toast + push
  Action: [Schedule Delivery] [Assign Driver]

OPERATIONS --> DRIVER APP:
  Trigger: Delivery assigned to driver
  Notification: "New delivery: ORD-301 to ABC Corp (Riyadh)"
  Recipients: Assigned driver
  Channel: Push notification in Driver App
  Action: [View Route] [Accept]

DRIVER APP --> OPERATIONS:
  Trigger: Delivery completed (POD captured)
  Notification: "ORD-301 delivered. POD captured."
  Recipients: Operations coordinator
  Channel: In-app notification
  Action: [View POD] [Confirm Delivery]

OPERATIONS --> FINANCE:
  Trigger: Delivery confirmed
  Notification: "ORD-301 delivered and confirmed. Ready for invoicing."
  Recipients: AR clerk
  Channel: In-app toast + push
  Action: [Generate Invoice] [View Delivery]

FINANCE --> CUSTOMER PORTAL:
  Trigger: Invoice generated
  Notification: "Invoice INV-4501 ($2.1M) - Payment due: Apr 30"
  Recipients: Customer portal user
  Channel: Portal notification + email
  Action: [View Invoice] [Download PDF]

FINANCE --> SALES:
  Trigger: Payment received
  Notification: "Payment received for INV-4501 ($2.1M) from ABC Corp via wire"
  Recipients: Account owner (sales rep)
  Channel: In-app notification
  Action: [View Payment]

FINANCE --> CEO APP:
  Trigger: Large payment received, overdue escalation, margin alerts
  Notification: "Alert: Delta Builders 90+ days overdue on $300K"
  Recipients: CEO
  Channel: In-app notification + push
  Action: [View Details]
```

### Should the Platform Have Built-In Messaging?

**YES -- but scoped, not a full chat system.**

```
BUILT-IN MESSAGING MODEL: CONTEXTUAL COMMENTS, NOT CHAT

What to build:
  - Comment threads on every major entity (quote, order, PO, invoice)
  - @mention any internal user: "@john.procurement Can we get pricing faster on the rebar?"
  - @mention triggers notification to that user
  - Comments are part of the audit trail (timestamped, immutable)
  - Support file attachments in comments (spec sheets, photos)
  - Support internal-only vs customer-visible comments (flag)

What NOT to build:
  - Full 1:1 chat (use Slack/Teams for this)
  - Group chat rooms (use Slack/Teams channels)
  - Video/voice calls (use Zoom/Teams)
  - Social features (reactions, status, stories)

Why this approach:
  - Context stays with the entity (conversation about QT-0891 stays on QT-0891)
  - No lost context from searching through Slack history
  - Audit trail captures all decisions and discussions
  - @mention replaces "Hey, check Slack" with "look at the quote"
  - Reduces app-switching: no need to open Slack to discuss a quote

The model that works:
  - Think GitHub Issues (comments on issues)
  - Think Jira (comments on tickets)
  - Think Linear (threaded discussion on issues)
  - NOT Slack (free-flowing conversation)
```

### Slack/Teams Integration Pattern

```
INTEGRATION APPROACH:

1. BOT IN SLACK/TEAMS
   - Platform bot posts to department channels:
     #sales: "New RFQ from ABC Corp assigned to @sarah"
     #procurement: "Pricing request for QT-0891 (14 items, due Mar 30)"
     #operations: "New order ORD-301 ready for fulfillment"
     #finance: "Delivery confirmed for ORD-301, ready for invoicing"

2. ACTIONABLE MESSAGES
   - Slack messages include action buttons:
     [Approve] [Reject] [View in Platform]
   - Simple approvals can happen without leaving Slack
   - Complex actions redirect to the platform

3. BI-DIRECTIONAL SYNC
   - Comments in the platform post to relevant Slack thread
   - Slack thread replies sync back as comments on the entity
   - This is OPTIONAL and team-configurable

4. NOTIFICATION ROUTING
   - User preference: "Notify me via [In-App] [Push] [Email] [Slack] [Teams]"
   - Per-event granularity: "Approval requests via Push + Slack, status updates via In-App only"
```

### Notification Preferences Screen

```
+---------------------------------------------------------------+
|  NOTIFICATION PREFERENCES                                      |
+---------------------------------------------------------------+
|                                                                |
|  NOTIFICATION CHANNELS                                         |
|  [x] In-App Notifications     [Always on]                     |
|  [x] Push Notifications       [On]                             |
|  [x] Email Digests            [Hourly during business hours]   |
|  [ ] Slack Integration        [Connect Slack]                  |
|  [ ] Teams Integration        [Connect Teams]                  |
|                                                                |
+---------------------------------------------------------------+
|  EVENT-LEVEL SETTINGS                                          |
|                                                                |
|  Category              | In-App | Push | Email | Slack        |
|  ---------------------|--------|------|-------|------          |
|  Approval Requests     | [x]    | [x]  | [x]   | [x]          |
|  Quote Status Changes  | [x]    | [x]  | [ ]   | [ ]          |
|  Price Responses       | [x]    | [x]  | [ ]   | [x]          |
|  Order Updates         | [x]    | [ ]  | [ ]   | [ ]          |
|  Delivery Confirmations| [x]    | [x]  | [x]   | [ ]          |
|  Payment Received      | [x]    | [ ]  | [x]   | [ ]          |
|  Overdue Alerts        | [x]    | [x]  | [x]   | [x]          |
|  @Mentions             | [x]    | [x]  | [x]   | [x]          |
|  System Announcements  | [x]    | [ ]  | [x]   | [ ]          |
|                                                                |
+---------------------------------------------------------------+
|  QUIET HOURS                                                   |
|  Push notifications paused: [10:00 PM] to [7:00 AM]          |
|  Except: [x] Urgent approvals  [ ] Delivery issues            |
+---------------------------------------------------------------+
```

---

## 3. ACTIVITY FEEDS AND AUDIT TRAILS

### YES -- Every Entity Gets a Timeline

Every quote, order, PO, invoice, and customer record should have an activity feed showing everything that happened, in chronological order, across all departments.

### Activity Feed Data Model

```
ACTIVITY EVENT SCHEMA:

{
  entity_type: "quote" | "order" | "purchase_order" | "invoice" | "customer" | "supplier",
  entity_id: "QT-0891",
  event_type: "status_change" | "comment" | "approval" | "assignment" | "notification_sent"
               | "document_uploaded" | "price_update" | "payment" | "delivery" | "system_auto",
  actor: {
    user_id: "user-123",
    name: "Sarah Ahmed",
    role: "Sales Rep",
    department: "Sales"
  },
  timestamp: "2025-03-28T14:32:00Z",
  action: "Submitted quote for approval",
  details: {
    from_status: "draft",
    to_status: "pending_approval",
    margin: "11.5%",
    total_value: "$2,100,000"
  },
  metadata: {
    ip_address: "192.168.1.100",
    device: "desktop",
    browser: "Chrome 124"
  },
  visibility: "internal" | "customer_visible",
  immutable: true   // Cannot be edited or deleted
}
```

### Timeline UI Component

```
+---------------------------------------------------------------+
|  QUOTE QT-0891 - ACTIVITY TIMELINE                             |
|  [All] [Comments] [Status Changes] [Approvals] [System]       |
+---------------------------------------------------------------+
|                                                                |
|  TODAY                                                         |
|  14:45  FINANCE  Tom (Credit Controller)                       |
|         [APPROVED] Credit check passed. Customer within limits.|
|         [Credit utilized: $3.2M of $5M limit]                  |
|                                                                |
|  14:32  SALES  Sarah Ahmed (Sales Rep)                         |
|         [STATUS CHANGE] Draft --> Pending Approval              |
|         Submitted for margin approval (margin: 11.5%)          |
|         Note: "Customer countered, had to reduce margin to     |
|         win against CompetitorX. Strategic account."            |
|                                                                |
|  13:15  SALES  Sarah Ahmed                                     |
|         [COMMENT] "@mike.salesmgr Margin is below standard but |
|         this is a strategic account -- they have 3 more         |
|         projects coming in Q2. Recommend we approve at 11.5%." |
|         --> Notification sent to Mike (Sales Manager)           |
|                                                                |
|  YESTERDAY                                                     |
|  16:20  PROCUREMENT  Ali Khan (Procurement Officer)            |
|         [UPDATE] Pricing complete for all 14 items.            |
|         Total supplier cost: $1,858,500                         |
|         Best price per item breakdown attached.                 |
|         [View Price Comparison]                                 |
|                                                                |
|  16:18  PROCUREMENT  Ali Khan                                  |
|         [UPDATE] Supplier response received: SupplierC         |
|         (Portland Cement, $85/ton, 10-day lead time)           |
|                                                                |
|  14:00  PROCUREMENT  Ali Khan                                  |
|         [UPDATE] Supplier response received: SupplierA         |
|         (Steel Beams, $42/unit, 14-day lead time)              |
|                                                                |
|  MAR 26                                                        |
|  09:30  PROCUREMENT  Ali Khan                                  |
|         [STATUS CHANGE] Sourcing request accepted               |
|         Inquiries sent to 5 suppliers for 14 items.            |
|                                                                |
|  09:15  SALES  Sarah Ahmed                                     |
|         [ASSIGNMENT] Sourcing request created                   |
|         Assigned to: Procurement (Ali Khan)                     |
|         Priority: High (customer deadline: Mar 30)             |
|         [View Sourcing Request]                                 |
|                                                                |
|  09:00  SYSTEM                                                 |
|         [AUTO] RFQ received from ABC Construction              |
|         14 line items, auto-assigned to Sarah Ahmed            |
|         Source: Customer Portal submission                       |
|                                                                |
+---------------------------------------------------------------+
|  ADD COMMENT                                                   |
|  +-----------------------------------------------------------+|
|  | Type a comment... @mention a colleague                     ||
|  |                                                            ||
|  | [Internal Only v]  [Attach File]  [Send]                  ||
|  +-----------------------------------------------------------+|
+---------------------------------------------------------------+
```

### Cross-Department Visibility Rules for Activity Feed

```
WHO SEES WHAT ON THE ACTIVITY TIMELINE:

SALES REP on a Quote:
  - All sales activities (own and team)
  - Procurement pricing updates (summary, not full supplier details)
  - Approval decisions
  - Customer actions (viewed, accepted, commented)
  - Finance credit decisions
  - Operations status (once it becomes an order)
  - HIDDEN: Supplier cost breakdowns (unless authorized), internal procurement notes

PROCUREMENT OFFICER on a Quote:
  - Own sourcing activities
  - Sales context (customer urgency, deadline, strategic notes)
  - Supplier response details
  - HIDDEN: Customer-facing price/margin details (unless authorized)

OPERATIONS MANAGER on an Order:
  - All fulfillment activities
  - PO tracking and logistics
  - Delivery scheduling
  - Sales context (customer expectations, delivery promises)
  - HIDDEN: Margin details, supplier cost details

FINANCE on an Order/Invoice:
  - Payment tracking
  - Credit decisions
  - Invoice generation/sending
  - Margin details
  - HIDDEN: Detailed supplier negotiation history

CEO/MANAGEMENT:
  - Everything (full visibility)
  - Can drill into any department's activities
  - Exception and alert activities highlighted
```

### Audit Trail vs Activity Feed

```
TWO LAYERS -- SAME DATA, DIFFERENT PURPOSE:

ACTIVITY FEED (user-facing):
  - Friendly, readable timeline
  - Filtered by role
  - Shows comments, status changes, key events
  - Used for: daily work, context, handoffs, customer history
  - UI: Timeline component on entity detail pages

AUDIT LOG (admin/compliance-facing):
  - Raw, complete, immutable record
  - Every field change, every API call, every login
  - Captures before/after values for every change
  - Used for: compliance, disputes, forensics, debugging
  - UI: Admin panel --> Audit Log (searchable, filterable, exportable)
  - Retention: Minimum 7 years for financial records, configurable

WHAT THE AUDIT LOG CAPTURES THAT THE ACTIVITY FEED DOES NOT:
  - Field-level changes: "Margin changed from 14.2% to 11.5%"
  - Who viewed what (read access logging for sensitive data)
  - Failed login attempts
  - Permission changes
  - API access by external systems
  - Bulk operations
  - System configuration changes
```

---

## 4. APPROVAL CHAINS ACROSS DEPARTMENTS

### Approval Architecture: Event-Driven, Parallel Where Possible

The key insight from 2025 best practices: **approvals should run in parallel when possible, not always sequentially.** Sequential chains create bottlenecks that kill deal velocity.

### Approval Workflow Engine Design

```
APPROVAL WORKFLOW CONFIGURATION:

Each approval rule consists of:
  - TRIGGER: What event starts the approval
  - CONDITION: When is approval needed (threshold-based)
  - APPROVER(S): Who must approve
  - ROUTING: Sequential, parallel, or conditional
  - ESCALATION: What happens if no response within SLA
  - TIMEOUT: Auto-escalate or auto-approve after N hours
```

### Quote Approval Chain (The Primary Flow)

```
QUOTE APPROVAL: THREE POTENTIAL GATES

GATE 1: MARGIN APPROVAL (Sales Department)
  Trigger: Quote submitted with margin below rep's authority
  Condition: margin < rep_authority_threshold
  Approver: Sales Manager
  Escalation: VP Sales if manager doesn't respond in 4 hours

  Thresholds (configurable in Admin):
    Rep authority:     >= 18% margin, no approval needed
    Sales Manager:     >= 12% margin
    VP Sales / GM:     >= 8% margin
    CEO / CFO:         < 8% margin (requires justification)

GATE 2: CREDIT APPROVAL (Finance Department)
  Trigger: Order value would push customer beyond credit limit
  Condition: (current_exposure + order_value) > credit_limit * 0.9
  Approver: Credit Controller / Finance Manager
  Escalation: CFO if no response in 4 hours

  Can run IN PARALLEL with Gate 1 (both start simultaneously)

GATE 3: SPECIAL TERMS APPROVAL (Finance + Legal)
  Trigger: Non-standard payment terms, custom T&Cs, warranty changes
  Condition: Any deviation from standard terms
  Approver: Finance Manager (payment terms), Legal (T&Cs)
  Escalation: CFO after 8 hours

PARALLEL EXECUTION:
  Gate 1 (Margin) and Gate 2 (Credit) run simultaneously
  Gate 3 only triggers if special terms exist
  Quote is approved when ALL triggered gates pass
```

### Approval Flow Diagram

```
QUOTE SUBMITTED FOR APPROVAL
         |
         v
   +-----|-----+
   |  SYSTEM   |
   |  CHECKS   |
   +-----|-----+
         |
    +----+----+----+
    |         |    |
    v         v    v
 [MARGIN]  [CREDIT] [TERMS?]     <-- All run in parallel
    |         |    |
    v         v    v
 Approved? Approved? Approved?
    |         |    |
    +----+----+----+
         |
         v
   ALL APPROVED?
   YES --> Quote finalized, send to customer
   NO  --> Return to sales rep with rejection reason(s)
         "Margin rejected: Sales Manager requires minimum 13%"
         "Credit rejected: Customer at limit, need $200K payment first"
```

### Approval UI: The Approver's Screen

```
+---------------------------------------------------------------+
|  PENDING APPROVALS                              [3 pending]     |
+---------------------------------------------------------------+
|                                                                |
|  +-----------------------------------------------------------+|
|  | MARGIN APPROVAL                          PRIORITY: HIGH    ||
|  | Quote: QT-0891 (ABC Construction)                          ||
|  | Sales Rep: Sarah Ahmed                                      ||
|  |                                                            ||
|  | Requested Margin: 11.5%  (Standard: 18%, Floor: 12%)      ||
|  | Deal Value: $2,100,000                                      ||
|  | Gross Profit: $241,500                                      ||
|  | Customer: ABC Construction (Tier 1, $4.2M YTD)            ||
|  |                                                            ||
|  | Rep's Justification:                                        ||
|  | "Strategic account -- 3 more projects in Q2 pipeline.      ||
|  |  Competitor quoted at $2.05M. We need to match."           ||
|  |                                                            ||
|  | CONTEXT PANEL:                                              ||
|  | Last 5 deals with ABC: avg margin 16.2%                    ||
|  | Customer lifetime value: $12.8M                             ||
|  | Payment history: Always on time                             ||
|  |                                                            ||
|  | [APPROVE]  [REJECT]  [ADJUST MARGIN TO: ___]  [COMMENT]   ||
|  +-----------------------------------------------------------+|
|                                                                |
|  +-----------------------------------------------------------+|
|  | CREDIT APPROVAL                         PRIORITY: MEDIUM   ||
|  | Quote: QT-0893 (Delta Builders)                            ||
|  | Credit Limit: $2,000,000                                    ||
|  | Current Exposure: $1,800,000 (90%)                          ||
|  | This Order: $450,000                                        ||
|  | Would Exceed By: $250,000                                   ||
|  |                                                            ||
|  | [APPROVE] [REJECT] [INCREASE LIMIT TO: ___] [REQUIRE DEPOSIT]||
|  +-----------------------------------------------------------+|
+---------------------------------------------------------------+
```

### Anti-Bottleneck Strategies

```
PREVENTING APPROVAL BOTTLENECKS:

1. AUTO-APPROVE WITHIN AUTHORITY
   - If margin is within rep's authority, no approval needed
   - If credit is within limits, auto-approved
   - System should auto-approve ~70% of quotes

2. DELEGATION
   - Approvers can set delegates: "When I'm out, route to [person]"
   - System auto-detects OOO status and reroutes

3. ESCALATION TIMERS
   - 2 hours: First reminder to approver
   - 4 hours: Escalate to next level + notify sales rep
   - 8 hours: Auto-escalate to department head
   - Configurable per approval type and priority

4. MOBILE APPROVAL
   - Approvers can approve/reject from push notification
   - Quick approve with one tap for pre-reviewed items
   - Full context available on mobile if needed

5. BATCH APPROVAL
   - Approvers see all pending items in one screen
   - Can bulk-approve standard items
   - Only need to review exceptions individually

6. APPROVAL CONTEXT
   - Show all relevant data on the approval screen
   - No need to click away to check customer history, margins, etc.
   - AI-suggested action: "Based on customer history, recommend APPROVE"

7. CONDITIONAL AUTO-APPROVAL
   - "Auto-approve margins 12-15% for Tier 1 customers with clean payment history"
   - Reduces human review for predictable cases
```

---

## 5. SHARED VIEWS VS ROLE-SPECIFIC VIEWS

### The Core Design Pattern: One Entity, Multiple Tabs

A single order (e.g., ORD-301) contains data relevant to every department. Instead of duplicating pages, use a **tabbed detail page** where each tab shows the department-specific perspective, and users see only the tabs relevant to their role.

### Order Detail Page: Role-Specific Tabs

```
+---------------------------------------------------------------+
|  ORDER ORD-301                                                 |
|  Customer: ABC Construction | Value: $2,100,000 | Status: Fulfilling |
+---------------------------------------------------------------+
|  [Summary] [Sales] [Procurement] [Operations] [Finance] [Timeline] |
+---------------------------------------------------------------+

TAB VISIBILITY BY ROLE:
  Sales Rep:        Summary, Sales, Timeline
  Sales Manager:    Summary, Sales, Finance (margin view), Timeline
  Procurement:      Summary, Procurement, Timeline
  Operations:       Summary, Operations, Timeline
  Finance:          Summary, Finance, Timeline
  CEO:              All tabs visible
```

### Tab Content: What Each Department Sees

**SUMMARY TAB (visible to all roles)**
```
+---------------------------------------------------------------+
|  SUMMARY                                                       |
+---------------------------------------------------------------+
|  Order: ORD-301          Status: Fulfilling                    |
|  Customer: ABC Construction     |  Contact: Ahmed Al-Rashid   |
|  Order Value: $2,100,000        |  Payment Terms: Net 45      |
|  Order Date: Mar 25, 2025       |  Expected Delivery: Apr 10  |
|  Items: 14 line items           |  Payment Status: Pending     |
|                                                                |
|  PROGRESS BAR:                                                 |
|  [Quote ✓] [Approved ✓] [PO Placed ✓] [Shipped ◐] [Delivered ○] [Invoiced ○] [Paid ○] |
|                                                                |
|  LINE ITEMS (summary):                                         |
|  | Item            | Qty    | Status         |                |
|  | Steel Beams     | 500    | In Transit     |                |
|  | Portland Cement | 200 MT | At Warehouse   |                |
|  | Rebar 12mm      | 1000   | PO Placed      |                |
|  | ...             |        |                |                |
+---------------------------------------------------------------+
```

**SALES TAB (Sales Rep, Sales Manager)**
```
+---------------------------------------------------------------+
|  SALES CONTEXT                                                 |
+---------------------------------------------------------------+
|  Quote: QT-0891 (originated from this quote)                  |
|  Sales Rep: Sarah Ahmed                                        |
|  Quote Sent: Mar 20  |  Customer Accepted: Mar 25             |
|                                                                |
|  CUSTOMER CONTEXT:                                             |
|  ABC Construction -- Tier 1 Account                            |
|  YTD Revenue: $4.2M  |  Lifetime: $12.8M                     |
|  Last Interaction: Mar 24 (meeting with PM)                   |
|  Upcoming: 3 projects in Q2 pipeline ($6.5M estimated)        |
|                                                                |
|  MARGIN DETAILS (visible to Sales Manager+):                  |
|  Target Margin: 18%  |  Actual Margin: 11.5%                 |
|  Gross Profit: $241,500                                        |
|  Approval: Approved by Mike (Sales Manager) on Mar 26         |
|  Justification: Strategic account, competitive counter         |
|                                                                |
|  RELATED QUOTES:                                               |
|  QT-0899 (Pending) - Phase 2 materials - $1.8M               |
|  QT-0903 (Draft) - Finishing materials - $450K                |
|                                                                |
|  CUSTOMER COMMUNICATION LOG:                                   |
|  Mar 25: Customer accepted via portal                          |
|  Mar 24: Sarah met with project manager on site               |
|  Mar 22: Customer requested 3% discount, countered at 1.5%   |
+---------------------------------------------------------------+
```

**PROCUREMENT TAB (Procurement Officer)**
```
+---------------------------------------------------------------+
|  PROCUREMENT CONTEXT                                           |
+---------------------------------------------------------------+
|  PURCHASE ORDERS:                                              |
|  | PO       | Supplier   | Items      | Value    | Status     |
|  | PO-2201  | SupplierA  | Steel Beams| $420K    | Shipped    |
|  | PO-2203  | SupplierC  | Cement     | $170K    | Delivered  |
|  | PO-2205  | SupplierB  | Rebar      | $380K    | Confirmed  |
|  | PO-2207  | SupplierA  | Misc items | $245K    | Pending    |
|                                                                |
|  SUPPLIER PERFORMANCE ON THIS ORDER:                           |
|  SupplierA: On track (shipped Mar 27, ETA Apr 2)             |
|  SupplierC: Delivered early (delivered Mar 26)                |
|  SupplierB: Confirmed, production starts Apr 1               |
|                                                                |
|  TOTAL COST BREAKDOWN:                                         |
|  Materials: $1,750,000                                         |
|  Freight: $108,500                                             |
|  Total Cost: $1,858,500                                        |
|                                                                |
|  SOURCING HISTORY:                                             |
|  [View original supplier comparison for this order]           |
+---------------------------------------------------------------+
```

**OPERATIONS TAB (Operations Manager, Warehouse, Dispatch)**
```
+---------------------------------------------------------------+
|  OPERATIONS CONTEXT                                            |
+---------------------------------------------------------------+
|  FULFILLMENT STATUS:                                           |
|  | Item            | Source PO | Warehouse | Delivery Status  |
|  | Steel Beams     | PO-2201  | In Transit| ETA: Apr 2       |
|  | Portland Cement | PO-2203  | Warehouse B| Ready to ship   |
|  | Rebar 12mm      | PO-2205  | Pending   | ETA: Apr 8       |
|  | Misc items      | PO-2207  | Pending   | ETA: Apr 5       |
|                                                                |
|  DELIVERY PLAN:                                                |
|  Phase 1 (Apr 3): Cement (200 MT) - Truck 14T x 5           |
|  Phase 2 (Apr 5): Steel Beams + Misc - Flatbed x 3          |
|  Phase 3 (Apr 10): Rebar - Truck 14T x 8                    |
|                                                                |
|  DELIVERY ADDRESS:                                             |
|  ABC Construction Site, Industrial Area, Riyadh               |
|  Contact: Mohammed (Site Manager) +966-55-XXX-XXXX            |
|  Special Instructions: Gate 3 access, unloading crane available|
|                                                                |
|  ASSIGNED DRIVERS:                                             |
|  Phase 1: Driver Ahmed (TRK-014)                              |
|  Phase 2: Not yet assigned                                     |
|  Phase 3: Not yet assigned                                     |
+---------------------------------------------------------------+
```

**FINANCE TAB (Finance Manager, AR/AP)**
```
+---------------------------------------------------------------+
|  FINANCE CONTEXT                                               |
+---------------------------------------------------------------+
|  REVENUE:                                                      |
|  Order Value: $2,100,000                                       |
|  Margin: 11.5%  |  Gross Profit: $241,500                    |
|                                                                |
|  INVOICING:                                                    |
|  | Invoice    | Amount     | Status    | Due Date   |         |
|  | INV-4501   | $680,000   | Sent      | Apr 15     |         |
|  | INV-4502   | $1,420,000 | Pending   | (on delivery)|       |
|  | Total      | $2,100,000 |           |            |         |
|                                                                |
|  PAYMENT STATUS:                                               |
|  Payment Method: Wire Transfer                                 |
|  Payment Terms: Net 45                                         |
|  Deposit Received: $0                                          |
|  Outstanding: $2,100,000                                       |
|                                                                |
|  ACCOUNTS PAYABLE (supplier payments):                         |
|  | PO       | Supplier   | Amount   | Due    | Status        |
|  | PO-2201  | SupplierA  | $420K    | Apr 10 | Pending       |
|  | PO-2203  | SupplierC  | $170K    | Apr 5  | Pending       |
|  | PO-2205  | SupplierB  | $380K    | Apr 15 | Pending       |
|  | PO-2207  | SupplierA  | $245K    | Apr 12 | Pending       |
|                                                                |
|  CUSTOMER CREDIT:                                              |
|  Credit Limit: $5,000,000                                      |
|  Current Exposure: $3,200,000 (including this order)          |
|  Utilization: 64%                                              |
|  Payment History: Always on time (12 of 12 payments)          |
|                                                                |
|  CASH FLOW IMPACT:                                             |
|  Payables due before receivable: -$590,000 (net negative)     |
|  Expected collection: Apr 30 (45 days after delivery)         |
+---------------------------------------------------------------+
```

### Underlying Data Model: One Entity, Many Perspectives

```
DATA MODEL PRINCIPLE: ENTITY-CENTRIC WITH ROLE PROJECTIONS

Core Entities (shared, single source of truth):
  - Quote (quote_id, customer_id, status, items[], margin, total, dates)
  - Order (order_id, quote_id, customer_id, status, items[], delivery_plan)
  - PurchaseOrder (po_id, order_id, supplier_id, items[], status, tracking)
  - Invoice (invoice_id, order_id, amount, status, due_date, payment_method)
  - Payment (payment_id, invoice_id, amount, method, date, reconciled)
  - Customer (customer_id, name, credit_limit, exposure, tier, contacts[])
  - Supplier (supplier_id, name, rating, items[], contacts[])

Relationship Chain:
  Customer --> Quote --> Order --> PurchaseOrder(s) --> Delivery(s) --> Invoice(s) --> Payment(s)

Each entity has:
  - Core fields (visible to all authorized roles)
  - Department-specific fields (margin visible only to sales+finance+CEO)
  - Computed fields per role (e.g., "cash flow impact" only computed for finance)
  - Activity feed (filtered by role)

FIELD-LEVEL VISIBILITY MATRIX:
  | Field               | Sales | Procurement | Operations | Finance | CEO |
  |---------------------|-------|-------------|------------|---------|-----|
  | Customer Name       | R     | R           | R          | R       | R   |
  | Order Total         | R     | -           | R          | R       | R   |
  | Supplier Cost       | -     | R/W         | -          | R       | R   |
  | Margin %            | R*    | -           | -          | R       | R   |
  | Credit Limit        | R     | -           | -          | R/W     | R   |
  | Delivery Address    | R     | -           | R/W        | -       | R   |
  | Payment Status      | R     | -           | -          | R/W     | R   |
  | Driver Assignment   | -     | -           | R/W        | -       | R   |

  R = Read, W = Write, R* = Read with threshold (managers only see below-floor margins)
  - = Hidden
```

---

## 6. DASHBOARD DESIGN FOR CROSS-DEPARTMENTAL VISIBILITY

### Principle: Relevant Cross-Visibility, Not Total Transparency

The goal is NOT to show everyone everything. It is to show each role the cross-department data that helps them do their job better.

### What Each Role Should See From Other Departments

**SALES SHOULD SEE:**
```
FROM PROCUREMENT:
  [YES] "Pricing ready" / "Pricing in progress" (status)
  [YES] Expected date for pricing completion
  [YES] Number of supplier responses received
  [NO]  Actual supplier costs (procurement handles this)
  [NO]  Which specific suppliers were contacted
  WHY: Sales needs to know WHEN they can build the quote, not HOW procurement sources

FROM OPERATIONS:
  [YES] Order fulfillment status (on track / delayed / delivered)
  [YES] Expected delivery dates
  [YES] Delivery confirmation + POD
  [NO]  Warehouse inventory levels
  [NO]  Driver assignments and routes
  WHY: Sales needs to update customers on delivery status

FROM FINANCE:
  [YES] Customer credit status (green/yellow/red)
  [YES] Payment received confirmation
  [YES] Invoice sent/overdue status
  [NO]  Detailed AR aging across all customers
  [NO]  AP payment schedules
  WHY: Sales needs to know if a customer can place more orders and if they paid

SALES DASHBOARD CROSS-DEPARTMENT WIDGETS:
+----------------------------+
| DELIVERY STATUS            |
| On Track: 8 orders         |
| Delayed: 2 orders [!]      |
|  ORD-298: 3 days late      |
|  ORD-301: partial received |
+----------------------------+
| CUSTOMER CREDIT ALERTS     |
| Delta Builders: 90% [!]   |
| All others: Green          |
+----------------------------+
| PENDING FROM PROCUREMENT   |
| 3 quotes awaiting pricing  |
| QT-0891: Due today         |
| QT-0895: Due tomorrow      |
+----------------------------+
```

**PROCUREMENT SHOULD SEE:**
```
FROM SALES:
  [YES] Quote urgency and customer deadline
  [YES] Customer tier (Tier 1 = prioritize)
  [YES] Sales rep who requested (for coordination)
  [NO]  Customer-facing price (to avoid anchoring bias)
  [NO]  Full customer CRM data
  WHY: Procurement needs urgency context to prioritize sourcing

FROM OPERATIONS:
  [YES] Goods receipt confirmation (PO items arrived)
  [YES] Quality issues with received goods
  [NO]  Delivery scheduling to customers
  WHY: Procurement needs to track if suppliers delivered as promised

FROM FINANCE:
  [YES] Supplier payment status (have we paid this supplier?)
  [NO]  Customer payment details
  WHY: Suppliers may delay if payments are late
```

**OPERATIONS SHOULD SEE:**
```
FROM SALES:
  [YES] Customer delivery expectations and promises
  [YES] Customer contact at delivery site
  [YES] Special delivery instructions
  [NO]  Quote negotiations, pricing, margin
  WHY: Operations needs to meet delivery promises

FROM PROCUREMENT:
  [YES] PO status and supplier shipment tracking
  [YES] Expected arrival dates from suppliers
  [YES] Partial shipment alerts
  [NO]  Pricing details, supplier negotiations
  WHY: Operations needs to plan warehouse capacity and delivery scheduling

FROM FINANCE:
  [YES] "OK to deliver" flag (credit/payment verified)
  [NO]  Payment details, credit limit numbers
  WHY: Operations shouldn't ship if there's a payment hold
```

**FINANCE SHOULD SEE:**
```
FROM SALES:
  [YES] Order values, margins, payment terms agreed
  [YES] Customer relationship context (tier, lifetime value)
  [NO]  Sales pipeline details, CRM notes
  WHY: Finance needs margin and revenue data

FROM PROCUREMENT:
  [YES] Supplier invoice amounts and payment terms
  [YES] PO values for AP scheduling
  [NO]  Sourcing process details
  WHY: Finance needs AP data for cash flow management

FROM OPERATIONS:
  [YES] Delivery confirmations (trigger for invoicing)
  [YES] Partial deliveries (partial invoicing decisions)
  [NO]  Warehouse operations details
  WHY: Finance invoices upon delivery confirmation
```

### CEO Dashboard: The Exception

The CEO sees a curated cross-department view focused on exceptions and KPIs, not operational detail.

```
+---------------------------------------------------------------+
|  CEO DASHBOARD                                                 |
+---------------------------------------------------------------+
|                                                                |
|  KPI STRIP:                                                    |
|  Revenue MTD   Pipeline   Avg Margin   Cash Position   AR >90d |
|  $3.8M         $12.6M     14.2%        $5.6M          $300K [!]|
|                                                                |
+----------------------------+----------------------------------+
|  EXCEPTIONS & ALERTS (5)   |  REVENUE TREND (12-month chart)  |
|                            |                                  |
|  [!] Delta at 90% credit  |  [Line chart with target line]   |
|  [!] Supplier D late on   |                                  |
|      3 POs this month     |                                  |
|  [!] Margin below 10% on  |  MARGIN TREND (12-month chart)   |
|      2 deals this week    |  [Line chart with floor line]    |
|  [!] AR overdue >90d $300K|                                  |
|  [!] 3 quotes expiring    |                                  |
|      tomorrow ($1.2M)     |                                  |
+----------------------------+----------------------------------+
|  TOP DEALS IN PIPELINE     |  DEPARTMENT HEALTH               |
|  QT-0891: $2.1M (90%)    |  Sales: 23 open quotes           |
|  QT-0899: $1.8M (60%)    |  Procurement: 18 pending inquiries|
|  QT-0903: $450K (40%)    |  Operations: 15 orders in progress|
|                            |  Finance: $2.1M overdue AR       |
|  DEALS WON THIS MONTH     |                                  |
|  6 deals, $2.8M total     |  Avg quote-to-order: 4.2 days   |
|  Avg margin: 16.3%        |  Avg fulfillment: 8.5 days      |
+----------------------------+----------------------------------+
```

### Information Overload Prevention

```
RULES FOR AVOIDING INFORMATION OVERLOAD:

1. DEFAULT TO MINIMUM
   Show the minimum data needed for each role
   Additional data is available via drill-down, not on the dashboard

2. EXCEPTION-BASED ALERTS
   Don't show "everything is fine" -- show deviations
   Green = no notification; Yellow/Red = visible alert
   "8 orders on track" is noise; "2 orders delayed" is actionable

3. PROGRESSIVE DISCLOSURE
   Dashboard = KPIs + alerts (30 seconds to scan)
   Click = entity detail with role-specific tabs (2 minutes)
   Drill = full history, audit trail, all data (as needed)

4. CONFIGURABLE WIDGETS
   Each user can add/remove/reorder dashboard widgets
   Start with sensible defaults per role
   Power users customize; most users use defaults

5. TIME-BASED FILTERING
   Default view = TODAY / THIS WEEK
   Overdue items always visible
   Historical data behind date filters
```

---

## 7. HANDOFF POINTS BETWEEN DEPARTMENTS

### Complete Handoff Map

Every handoff in the platform should be explicit, tracked, and carry all necessary data to prevent back-and-forth.

### Handoff 1: Customer --> Sales (RFQ Received)

```
TRIGGER: Customer submits RFQ (via portal, email, phone, fax)

DATA THAT MUST PASS:
  - Customer identity (new or existing)
  - Bill of Materials (items, quantities, specifications)
  - Required delivery date
  - Delivery location
  - Any special requirements (certifications, testing, brands)
  - Budget indication (if provided)
  - Project reference

SYSTEM ACTIONS:
  1. RFQ parsed and logged in system (auto-extract from PDF/email if possible)
  2. Customer matched to existing account (or flagged as new)
  3. Auto-assigned to sales rep based on: account ownership, territory, workload
  4. Acknowledgment sent to customer: "RFQ received, expect quote by [date]"
  5. Notification to assigned sales rep

HANDOFF QUALITY CHECK:
  - Is the BOM complete? (flag incomplete items)
  - Is the customer creditworthy? (auto-check credit status)
  - Is this a repeat order? (show last order for reference)
```

### Handoff 2: Sales --> Procurement (Need Pricing)

```
TRIGGER: Sales rep creates sourcing request (costs not available or stale)

DATA THAT MUST PASS:
  - Full BOM with specifications
  - Quantities per item
  - Required delivery date (customer deadline)
  - Customer context: urgency level, account tier, competitive pressure
  - Target margin guidance (from sales manager)
  - Preferred suppliers (if any)
  - Special requirements (certs, testing, specific brands)
  - Quote reference (QT-XXXX) for tracking

SYSTEM ACTIONS:
  1. Sourcing request created, linked to quote
  2. Notification to procurement team (or specific officer)
  3. SLA clock starts (expected pricing turnaround time displayed)
  4. Auto-suggest suppliers based on item history

HANDOFF QUALITY CHECK:
  - All items have clear specs? (flag ambiguous items)
  - Quantities reasonable? (compare to historical orders)
  - Delivery date achievable? (compare to typical lead times)
```

### Handoff 3: Procurement --> Sales (Pricing Ready)

```
TRIGGER: All (or sufficient) supplier prices received and selected

DATA THAT MUST PASS:
  - Cost per line item (landed cost including freight)
  - Supplier lead time per item
  - Minimum order quantities (if any)
  - Supplier conditions (payment terms, validity period)
  - Freight estimate
  - Alternative options (e.g., "Item X available from SupplierB at +5% but 1 week faster")
  - Procurement notes/recommendations
  - Total cost summary

SYSTEM ACTIONS:
  1. Pricing data populated on quote draft
  2. Notification to sales rep: "Pricing ready for QT-XXXX"
  3. SLA clock stops (procurement turnaround time logged)
  4. System auto-calculates margins at standard markup

HANDOFF QUALITY CHECK:
  - All items priced? (flag missing items)
  - Lead times within customer deadline? (flag delays)
  - Any MOQ issues? (flag if MOQ > requested quantity)
```

### Handoff 4: Sales --> Customer (Quote Sent)

```
TRIGGER: Quote approved and finalized

DATA THAT MUST PASS TO CUSTOMER:
  - Quote document (PDF + portal view)
  - Line items with customer prices (NOT supplier costs)
  - Delivery timeline
  - Payment terms
  - Quote validity period
  - Terms and conditions
  - Sales rep contact information

SYSTEM ACTIONS:
  1. Quote status changed to "Sent"
  2. Quote published to Customer Portal
  3. Email notification to customer contacts
  4. Auto-follow-up scheduled (configurable: 2, 5, 7 days)
  5. Track if customer views the quote (portal analytics)
  6. Notification to sales rep when customer views/acts

HANDOFF QUALITY CHECK:
  - Quote formatted correctly? (auto-validate)
  - All items included? (compare to original RFQ)
  - Delivery dates still valid? (check against supplier lead times)
```

### Handoff 5: Customer --> Sales (Quote Accepted)

```
TRIGGER: Customer accepts quote (portal acceptance, signed PO, email confirmation)

DATA THAT MUST PASS:
  - Customer PO number (reference)
  - Confirmed quantities (may differ from quote)
  - Confirmed delivery schedule
  - Confirmed payment terms
  - Any modifications from original quote

SYSTEM ACTIONS:
  1. Quote status: "Accepted"
  2. Order created from quote (auto-populated)
  3. Notification to sales rep
  4. Auto-trigger: PO generation to suppliers (if configured)
  5. Auto-trigger: Credit check (if not already done)
  6. Handoff to operations (see next)
```

### Handoff 6: Sales --> Operations (Fulfill Order)

```
TRIGGER: Order confirmed + supplier POs placed + credit cleared

DATA THAT MUST PASS:
  - Order details (all line items, quantities)
  - Customer delivery requirements (date, location, contact, instructions)
  - Supplier PO references and expected arrival dates
  - Delivery priority and customer tier
  - Special handling instructions
  - Partial delivery permissions (can we deliver in phases?)

SYSTEM ACTIONS:
  1. Order appears on operations board
  2. Notification to operations manager
  3. Auto-create delivery plan (if phased delivery)
  4. Warehouse allocation triggered (for items in stock)
  5. PO tracking linked to order for inbound visibility

HANDOFF QUALITY CHECK:
  - All items have POs placed? (flag missing POs)
  - Delivery dates realistic given supplier lead times?
  - Warehouse capacity available?
  - Delivery address complete?
```

### Handoff 7: Operations --> Dispatch (Schedule Delivery)

```
TRIGGER: Goods received at warehouse + quality check passed

DATA THAT MUST PASS:
  - Items ready for delivery (what's available now)
  - Delivery address with GPS coordinates
  - Customer site contact name and phone
  - Special delivery instructions (crane needed, gate access, time windows)
  - Required delivery date
  - Vehicle requirements (truck type, size, number of vehicles)
  - Loading instructions (sequence, weight distribution)

SYSTEM ACTIONS:
  1. Delivery task created
  2. Route optimization suggested
  3. Driver assigned (based on availability, route, vehicle type)
  4. Driver App notification: "New delivery assigned"
  5. Loading list generated for warehouse team

HANDOFF QUALITY CHECK:
  - All items passed quality check? (flag issues)
  - Correct vehicle type assigned?
  - Driver available on required date?
  - Route calculated and ETA within delivery window?
```

### Handoff 8: Dispatch --> Driver (Execute Delivery)

```
TRIGGER: Delivery assigned to driver

DATA THAT MUST PASS (via Driver App):
  - Delivery address with turn-by-turn navigation
  - Customer contact (name, phone -- tap to call)
  - Items to deliver (checklist for loading/unloading)
  - Special instructions (displayed prominently)
  - Expected delivery window
  - Loading bay assignment (for warehouse pickup)

DRIVER APP ACTIONS:
  1. Accept delivery assignment
  2. Confirm loading complete (with checklist)
  3. Start route (GPS tracking begins)
  4. Arrive at customer site
  5. Capture proof of delivery (signature, photos)
  6. Mark delivery complete

HANDOFF QUALITY CHECK:
  - All items loaded? (checklist verification)
  - Vehicle inspection completed?
  - Correct delivery documentation included?
```

### Handoff 9: Driver --> Operations (Delivery Confirmed)

```
TRIGGER: Driver marks delivery complete with POD

DATA THAT MUST PASS:
  - Proof of delivery (digital signature)
  - Delivery photos (material at site)
  - Delivery timestamp (GPS-verified)
  - Items delivered (confirmed checklist)
  - Any exceptions (partial delivery, damaged items, refused items)
  - Customer comments (if any)

SYSTEM ACTIONS:
  1. Order status updated: "Delivered" (or "Partially Delivered")
  2. POD documents attached to order
  3. Notification to operations: "ORD-301 delivered"
  4. Notification to sales rep: "Delivery complete for ORD-301"
  5. Auto-trigger handoff to finance for invoicing
  6. If exceptions: flag for operations manager review

HANDOFF QUALITY CHECK:
  - POD captured? (signature + photo required)
  - All items confirmed delivered?
  - Any damage/exception reported?
```

### Handoff 10: Operations --> Finance (Ready to Invoice)

```
TRIGGER: Delivery confirmed (full or partial)

DATA THAT MUST PASS:
  - Delivery confirmation details
  - Items delivered (for partial invoicing)
  - Proof of delivery reference
  - Order value and line item amounts
  - Payment terms agreed
  - Customer billing contact and address
  - Any adjustments (returns, credits, damage deductions)

SYSTEM ACTIONS:
  1. Invoice auto-generated (draft) from delivered items
  2. Notification to AR clerk: "ORD-301 ready for invoicing"
  3. Invoice reviewed and finalized
  4. Posted to Customer Portal
  5. Email sent to customer billing contact

HANDOFF QUALITY CHECK:
  - Delivery fully confirmed? (no pending exceptions)
  - Invoice amounts match delivered items?
  - Payment terms correctly applied?
  - Tax calculations correct?
```

### Handoff 11: Finance --> Customer (Invoice Sent)

```
TRIGGER: Invoice approved and finalized

DATA THAT MUST PASS TO CUSTOMER:
  - Invoice document (PDF + portal view)
  - Amount due
  - Due date
  - Payment instructions (bank details for wire, address for check, LC instructions)
  - Reference numbers for payment matching
  - Summary of delivered items

SYSTEM ACTIONS:
  1. Invoice published to Customer Portal
  2. Email with invoice PDF to billing contacts
  3. Payment tracking initiated
  4. Auto-reminders scheduled: 7 days before due, on due date, 1/7/14/30 days overdue
  5. AR aging clock starts
```

### Handoff 12: Customer --> Finance (Payment Received)

```
TRIGGER: Payment received (wire confirmed, check deposited, LC drawn)

DATA THAT MUST PASS:
  - Payment amount
  - Payment method and reference
  - Bank confirmation
  - Customer remittance advice (which invoices this covers)

SYSTEM ACTIONS:
  1. Payment matched to invoice(s)
  2. Invoice status: "Paid"
  3. Customer credit exposure reduced
  4. Notification to sales rep: "Payment received from ABC Corp"
  5. Order status: "Complete" (if fully paid)
  6. AP trigger: Pay suppliers (if payment-dependent)
```

### Complete Handoff Flow Diagram

```
CUSTOMER                SALES           PROCUREMENT        OPERATIONS       FINANCE
   |                      |                  |                  |               |
   |---RFQ--------------->|                  |                  |               |
   |                      |---Need Pricing-->|                  |               |
   |                      |                  |---(Supplier      |               |
   |                      |                  |    Inquiries)--->|               |
   |                      |                  |<--(Supplier      |               |
   |                      |                  |    Responses)    |               |
   |                      |<--Pricing Ready--|                  |               |
   |                      |                  |                  |               |
   |                      |---Approval-------|----------------->|--Credit Check |
   |                      |<--Approved-------|------------------|               |
   |                      |                  |                  |               |
   |<--Quote Sent---------|                  |                  |               |
   |---Quote Accepted---->|                  |                  |               |
   |                      |                  |---PO Placed----->|               |
   |                      |---Fulfill--------|----------------->|               |
   |                      |                  |                  |               |
   |                      |                  |  Goods Received  |               |
   |                      |                  |  Delivery Sched  |               |
   |                      |                  |  Driver Assigned |               |
   |                      |                  |  Delivered + POD |               |
   |                      |                  |                  |               |
   |                      |                  |--Delivery Done-->|---Invoice---->|
   |                      |                  |                  |               |
   |<-----------------------------------------Invoice Sent-----|               |
   |---Payment------------|---Payment Notif--|----------------->|--Payment Rcvd |
   |                      |                  |                  |               |
   [COMPLETE]             [COMPLETE]         [COMPLETE]         [COMPLETE]
```

---

## 8. INTERNAL AI ASSISTANT

### Architecture: One AI Assistant, Role-Aware

The internal AI assistant should be a single system that adapts its capabilities based on the user's role. It differs fundamentally from the customer-facing AI.

### Internal vs Customer AI Comparison

```
| Capability                   | Customer AI              | Internal AI                    |
|------------------------------|--------------------------|--------------------------------|
| Data access                  | Own orders, quotes only  | All data per role permissions   |
| Knowledge base               | Product catalog, FAQs    | Policies, procedures, margins  |
| Actions                      | Place orders, track      | Create, approve, assign, report|
| Tone                         | Friendly, professional   | Direct, efficient, data-rich   |
| Complexity                   | Simple self-service      | Cross-department queries       |
| Integration                  | Customer Portal only     | All internal modules + CRM     |
| Users                        | External customers       | Sales, procurement, ops, fin   |
```

### What the Internal AI Assistant Does

**FOR SALES REPS:**
```
Natural Language Queries:
  "Show me all open quotes for ABC Construction"
  "What's the status of QT-0891?"
  "How many quotes did I send this week?"
  "What's ABC Corp's payment history?"
  "What's my pipeline value this month?"
  "Which quotes are expiring in the next 3 days?"
  "What was our last margin on rebar for Delta Builders?"

Draft Actions:
  "Draft a follow-up email to Ahmed at ABC about their pending quote"
  "Summarize the activity on QT-0891 for my weekly report"
  "Prepare talking points for my meeting with Delta tomorrow"

Intelligent Suggestions:
  "ABC Corp viewed their quote 3 times today but hasn't accepted. Consider following up."
  "Delta Builders usually orders cement quarterly -- they haven't ordered in 4 months."
  "Based on ABC's history, they typically negotiate 5-8% off initial quotes."
```

**FOR PROCUREMENT:**
```
Natural Language Queries:
  "What's the status of PO-2201?"
  "Which suppliers have we used for rebar in the last 6 months?"
  "Show me SupplierA's on-time delivery rate"
  "What was the last price we paid for Portland Cement?"
  "Which sourcing requests are overdue?"

Smart Actions:
  "Compare the 3 supplier quotes for QT-0891 steel beams"
  "Draft a follow-up to SupplierB about their late response"
  "Recommend suppliers for 500 tons of rebar based on past performance"

Analysis:
  "Are our cement costs trending up or down over the last quarter?"
  "Which suppliers have increased prices by more than 10% this year?"
```

**FOR OPERATIONS:**
```
Natural Language Queries:
  "What deliveries are scheduled for tomorrow?"
  "Which orders are at risk of missing their delivery date?"
  "Show me all orders waiting for goods receipt"
  "What's the warehouse capacity right now?"

Smart Actions:
  "Optimize delivery routes for tomorrow's 5 deliveries"
  "Which driver is available for a Riyadh delivery on April 3?"
  "Flag any POs that are running late"
```

**FOR FINANCE:**
```
Natural Language Queries:
  "Show me all invoices overdue by more than 30 days"
  "What's our total AR exposure to Delta Builders?"
  "How much do we owe SupplierA this month?"
  "What's the average collection period this quarter?"

Smart Actions:
  "Generate the weekly AR aging report"
  "Draft a payment reminder for Delta Builders' overdue invoice"
  "Calculate cash flow projection for next month based on open orders"

Analysis:
  "Which customers have the highest average days-to-pay?"
  "Is our average margin improving or declining?"
```

**FOR CEO:**
```
Natural Language Queries:
  "How are we doing this month vs last month?"
  "What are the top 5 deals in the pipeline?"
  "Any alerts I should know about?"
  "What's our win rate this quarter?"

Strategic Summaries:
  "Summarize this week's business performance in 3 bullet points"
  "Compare Q1 performance vs Q1 last year"
  "Which customers are growing? Which are declining?"
```

### AI Assistant UI

```
PERSISTENT AI PANEL (right side of screen, collapsible):

+--------------------------------+
|  AI ASSISTANT              [x] |
+--------------------------------+
|                                |
|  [Recent conversations...]     |
|                                |
|  USER: What quotes are         |
|  expiring this week?           |
|                                |
|  AI: You have 3 quotes         |
|  expiring this week:           |
|                                |
|  1. QT-0887 (Summit Builders) |
|     $450K - Expires Apr 5     |
|     Last viewed: Mar 26       |
|     [View Quote] [Follow Up]  |
|                                |
|  2. QT-0890 (Mega Corp)       |
|     $210K - Expires Apr 3     |
|     Not viewed since sent     |
|     [View Quote] [Follow Up]  |
|                                |
|  3. QT-0892 (Al-Faisal Group) |
|     $1.2M - Expires Apr 4    |
|     Viewed 2x, no response    |
|     [View Quote] [Follow Up]  |
|                                |
|  Would you like me to draft   |
|  follow-up emails for these?  |
|                                |
|  +----------------------------+|
|  | Ask anything...         [>] ||
|  +----------------------------+|
+--------------------------------+

ALSO AVAILABLE AS:
  - Keyboard shortcut (Cmd+K / Ctrl+K) for quick queries
  - Slash commands in comment boxes: /ai summarize this order
  - Mobile: dedicated AI tab in bottom navigation
```

### AI Assistant Technical Architecture

```
AI ASSISTANT ARCHITECTURE:

+-----------------------+
|  NATURAL LANGUAGE     |
|  INTERFACE            |
+-----------+-----------+
            |
+-----------v-----------+
|  INTENT RECOGNITION   |
|  - Query (read-only)  |
|  - Draft (create text)|
|  - Action (do thing)  |
|  - Analysis (compute) |
+-----------+-----------+
            |
+-----------v-----------+
|  PERMISSION CHECK     |
|  - User role          |
|  - Data access scope  |
|  - Action permissions |
+-----------+-----------+
            |
+-----------v-----------+
|  DATA ACCESS LAYER    |
|  - Same APIs as UI    |
|  - Same permissions   |
|  - Query builder      |
+-----------+-----------+
            |
+-----------v-----------+
|  RESPONSE GENERATOR   |
|  - Structured data    |
|  - Natural language   |
|  - Action buttons     |
|  - Follow-up prompts  |
+-----------+-----------+

KEY PRINCIPLE: The AI assistant NEVER has more access than the user.
A sales rep asking "What's the supplier cost?" gets "I can't show supplier cost details for your role."
The AI uses the same permission system as the rest of the platform.
```

---

## 9. MOBILE ACCESS FOR INTERNAL ROLES

### Mobile vs Desktop Matrix

```
| Role                | Mobile Need  | Primary Device | Key Mobile Features               |
|---------------------|-------------|----------------|-----------------------------------|
| Outside Sales Rep   | ESSENTIAL   | Phone + Tablet | CRM, quotes, customer lookup      |
| Inside Sales Rep    | NICE TO HAVE| Desktop        | Notifications, quick approvals    |
| Sales Manager       | HIGH        | Desktop + Phone| Approvals, pipeline, alerts       |
| Procurement Officer | LOW         | Desktop        | Notifications only                |
| Operations Manager  | HIGH        | Desktop + Phone| Delivery tracking, alerts         |
| Warehouse Worker    | ESSENTIAL   | Tablet/Scanner | Goods receipt, picking, loading   |
| Dispatch Coordinator| HIGH        | Desktop + Phone| Driver tracking, route management |
| Driver              | ESSENTIAL   | Phone (Driver App) | Deliveries, navigation, POD   |
| Finance (AR/AP)     | LOW         | Desktop        | Notifications only                |
| Finance Manager     | MEDIUM      | Desktop + Phone| Approvals, alerts                 |
| CEO                 | HIGH        | Phone + Tablet | KPIs, alerts, approvals           |
```

### Mobile Feature Set Per Role

**SALES REP MOBILE (High Priority)**
```
MUST HAVE:
  - Customer lookup (contact info, order history, credit status)
  - Quote status checking and notifications
  - Approval status tracking
  - Push notifications (new RFQs, customer actions, approvals)
  - Add notes/comments on quotes and orders
  - Calendar and meeting logging
  - AI assistant (voice-first for hands-free in car)
  - Click-to-call customer contacts

NICE TO HAVE:
  - Create quick quote (simple items)
  - View delivery tracking for customer questions
  - CRM activity logging (log a visit, log a call)
  - Document scanner (photograph customer POs, signed docs)

NOT ON MOBILE (desktop only):
  - Full quote building with complex BOMs
  - Detailed margin analysis
  - Pipeline management and reporting
  - Bulk operations
```

**SALES MANAGER MOBILE (High Priority)**
```
MUST HAVE:
  - Approval queue with one-tap approve/reject
  - Push notifications for pending approvals
  - Pipeline summary KPIs
  - Alert feed (exceptions, escalations)
  - Quick view of team activity

NOT ON MOBILE:
  - Detailed reports and analytics
  - Team management
  - Margin rule configuration
```

**OPERATIONS MOBILE (Medium-High Priority)**
```
MUST HAVE:
  - Delivery tracking map (real-time driver locations)
  - Delivery schedule for today/tomorrow
  - Alert notifications (delays, exceptions)
  - Goods receipt confirmation
  - Quick driver communication

WAREHOUSE TABLET:
  - Goods receipt scanning (barcode/QR)
  - Picking list with item locations
  - Loading checklist
  - Quality check forms
  - Photo capture for damage documentation
```

**CEO MOBILE (High Priority)**
```
MUST HAVE:
  - KPI dashboard (revenue, margin, pipeline, cash)
  - Exception alerts (push notifications)
  - Approval queue (rare, high-value only)
  - AI assistant for quick queries
  - Weekly/monthly summary view

DESIGN: Glanceable cards, no data entry required
```

### Mobile Design Principles

```
MOBILE DESIGN RULES:

1. READ-HEAVY, WRITE-LIGHT
   Mobile is for checking, approving, and responding
   Desktop is for creating, editing, and analyzing

2. OFFLINE CAPABILITY
   Driver App: FULL offline (GPS, checklists, POD capture, sync when online)
   Sales Mobile: Cached customer data, queued comments/notes
   Other roles: Online-only is acceptable

3. PUSH NOTIFICATIONS AS PRIMARY
   Most internal mobile usage is notification-driven
   User gets push -> opens app -> takes action -> closes app
   Average mobile session: 30-90 seconds

4. PROGRESSIVE COMPLEXITY
   Mobile shows summary -> tap for details -> tap for full view
   Never show desktop-density data on mobile

5. RESPONSIVE WEB APP (NOT NATIVE) for internal users
   Driver App: Native (Android + iOS) for offline/GPS/camera
   Internal Platform Mobile: Responsive web app (PWA)
   Rationale: One codebase, faster updates, no app store distribution needed
   Exception: If heavy camera/scanning needed for warehouse, consider native module
```

### Mobile Screen Examples

**Sales Rep Mobile - Home**
```
+---------------------------+
| [Logo] PLATFORM      [Bell 3] |
+---------------------------+
|                           |
| Good morning, Sarah       |
|                           |
| TODAY'S PRIORITIES        |
| +-------------------------+
| | [!] 2 quotes expiring   |
| |     QT-0887, QT-0890   |
| +-------------------------+
| | [!] QT-0891 approved!  |
| |     Ready to send       |
| +-------------------------+
| | ABC Corp viewed quote  |
| |     QT-0891 (3x today) |
| +-------------------------+
|                           |
| MY OPEN QUOTES (23)      |
| QT-0891  ABC Corp  $2.1M |
|   Approved - Ready to send|
| QT-0887  Summit   $450K  |
|   Sent - Expires in 2 days|
| QT-0895  Delta    $780K  |
|   Awaiting Pricing        |
| [View All]                |
|                           |
+---------------------------+
| [Home] [Quotes] [AI] [More] |
+---------------------------+
```

**CEO Mobile - Dashboard**
```
+---------------------------+
| [Logo] CEO VIEW      [Bell 1] |
+---------------------------+
|                           |
| MARCH 2025               |
| Revenue: $3.8M  (+12% MoM)|
| Margin:  14.2%  (-0.9%)  |
| Pipeline: $12.6M         |
|                           |
| ALERTS (3)                |
| +-------------------------+
| | [!] Delta 90% credit   |
| |     $1.8M of $2M used  |
| +-------------------------+
| | [!] AR >90d: $300K     |
| |     2 customers        |
| +-------------------------+
| | [!] Low margin deals   |
| |     2 deals below 10%  |
| +-------------------------+
|                           |
| THIS WEEK                 |
| Won: 2 deals ($890K)     |
| Sent: 5 quotes ($3.2M)   |
| Delivered: 4 orders       |
| Collected: $1.4M          |
|                           |
| [Ask AI anything...]     |
+---------------------------+
| [Dashboard] [Alerts] [AI] |
+---------------------------+
```

---

## 10. ADMIN PANEL AND SYSTEM CONFIGURATION

### Who Manages What

```
ADMIN ROLE HIERARCHY:

SUPER ADMIN (IT/System Administrator):
  - Full system configuration
  - User management across all departments
  - Integration management (API keys, webhooks)
  - System health monitoring
  - Backup and recovery
  - Feature flags and rollout

DEPARTMENT ADMIN (Department Managers):
  - User management within their department
  - Approval threshold configuration (within limits)
  - Notification rules for their team
  - Dashboard customization for their team
  - Workflow rules specific to their department

DELEGATED ADMIN (Team Leads):
  - Add/remove users in their team
  - Reset passwords
  - Configure personal notification preferences
  - No system-wide changes
```

### Admin Panel Structure

```
ADMIN PANEL NAVIGATION:

/admin
  /users
    /user-list           -- View, search, filter all users
    /user-create         -- Create new user
    /user-edit/:id       -- Edit user profile, role, permissions
    /user-bulk           -- Bulk import/update users
  /roles
    /role-list           -- View all roles
    /role-create         -- Create custom role
    /role-edit/:id       -- Edit role permissions
    /permission-matrix   -- Full matrix view: roles x permissions
  /departments
    /department-list     -- Department structure
    /department-config   -- Department-specific settings
  /approvals
    /approval-rules      -- Configure approval workflows
    /margin-thresholds   -- Set margin authority per role
    /credit-rules        -- Credit approval thresholds
    /delegation          -- OOO delegation settings
    /escalation-timers   -- SLA timers for approvals
  /notifications
    /notification-rules  -- System-wide notification configuration
    /templates           -- Email/notification templates
    /channels            -- Enable/disable channels (push, email, Slack)
  /products
    /categories          -- Product category management
    /specifications      -- Spec templates and fields
  /customers
    /credit-policies     -- Default credit limits, tiers
    /customer-tiers      -- Tier definitions and benefits
  /suppliers
    /approved-list       -- Approved vendor list management
    /scoring-criteria    -- Supplier performance scoring config
  /finance
    /payment-terms       -- Standard payment terms templates
    /tax-rules           -- Tax calculation rules
    /currency            -- Supported currencies and exchange rates
    /numbering           -- Auto-numbering sequences (QT-, ORD-, INV-, PO-)
  /system
    /integrations        -- API keys, webhook configuration
    /email-settings      -- SMTP/email service configuration
    /file-storage        -- Document storage configuration
    /audit-log           -- System audit log viewer
    /feature-flags       -- Feature toggles
    /backup              -- Backup and export tools
```

### Key Admin Screens

**User Management**
```
+---------------------------------------------------------------+
|  ADMIN > USERS                                                 |
+---------------------------------------------------------------+
|  [+ Add User]  [Bulk Import]  [Export]    Search: [________]   |
+---------------------------------------------------------------+
|                                                                |
|  | Name          | Email              | Role        | Dept    | Status  | Last Login |
|  |---------------|--------------------|-----------  |---------|---------|------------|
|  | Sarah Ahmed   | sarah@company.com  | Sales Rep   | Sales   | Active  | 2hr ago    |
|  | Ali Khan      | ali@company.com    | Procurement | Procure | Active  | 30min ago  |
|  | Mike Johnson  | mike@company.com   | Sales Mgr   | Sales   | Active  | 1hr ago    |
|  | Tom Williams  | tom@company.com    | Credit Ctrl | Finance | Active  | 4hr ago    |
|  | Ahmed Driver  | ahmed.d@company.com| Driver      | Ops     | Active  | Today 9AM  |
|                                                                |
|  Showing 1-20 of 45 users                                     |
+---------------------------------------------------------------+
```

**Role & Permission Matrix**
```
+---------------------------------------------------------------+
|  ADMIN > ROLES > PERMISSION MATRIX                             |
+---------------------------------------------------------------+
|                                                                |
|  Module: QUOTES                                                |
|                                                                |
|  Permission          | Sales Rep | Sales Mgr | Procurement | Ops | Finance | CEO |
|  --------------------|-----------|-----------|-------------|-----|---------|-----|
|  View own quotes     | [x]       | [x]       | [ ]         | [ ] | [ ]     | [x] |
|  View all quotes     | [ ]       | [x]       | [x]*        | [ ] | [x]*    | [x] |
|  Create quote        | [x]       | [x]       | [ ]         | [ ] | [ ]     | [ ] |
|  Edit quote          | [x]**     | [x]       | [ ]         | [ ] | [ ]     | [ ] |
|  Delete quote        | [ ]       | [x]       | [ ]         | [ ] | [ ]     | [x] |
|  Approve margin      | [ ]       | [x]       | [ ]         | [ ] | [x]     | [x] |
|  View supplier costs | [ ]       | [ ]       | [x]         | [ ] | [x]     | [x] |
|  View margins        | [x]***    | [x]       | [ ]         | [ ] | [x]     | [x] |
|  Send to customer    | [x]       | [x]       | [ ]         | [ ] | [ ]     | [ ] |
|                                                                |
|  * = Limited view (no margin details)                          |
|  ** = Own quotes only, before approval                         |
|  *** = Within authority range only                             |
|                                                                |
|  [+ Add Custom Role]                                           |
+---------------------------------------------------------------+
```

**Approval Threshold Configuration**
```
+---------------------------------------------------------------+
|  ADMIN > APPROVALS > MARGIN THRESHOLDS                         |
+---------------------------------------------------------------+
|                                                                |
|  MARGIN APPROVAL RULES                                         |
|                                                                |
|  Role              | Auto-Approve Above | Can Approve Down To |
|  ------------------|-------------------|---------------------|
|  Sales Rep         | 18%               | (cannot approve)    |
|  Senior Sales Rep  | 15%               | (cannot approve)    |
|  Sales Manager     | (no limit)        | 12%                 |
|  VP Sales          | (no limit)        | 8%                  |
|  CEO / CFO         | (no limit)        | 0% (any margin)     |
|                                                                |
|  SPECIAL RULES:                                                |
|  [x] Dual approval required for orders > $1,000,000          |
|  [x] CFO approval required for payment terms > Net 60        |
|  [x] CEO notification (info only) for margins below 10%      |
|  [ ] Auto-approve returning customers with clean history      |
|                                                                |
|  ESCALATION TIMERS:                                            |
|  First reminder:    [2] hours                                 |
|  Auto-escalate:     [4] hours                                 |
|  Final escalation:  [8] hours (to department head)            |
|                                                                |
|  [Save Changes]                                                |
+---------------------------------------------------------------+
```

**Notification Rules Configuration**
```
+---------------------------------------------------------------+
|  ADMIN > NOTIFICATIONS > RULES                                 |
+---------------------------------------------------------------+
|                                                                |
|  EVENT                          | Recipients   | Channels     |
|  -------------------------------|-------------|---------------|
|  New RFQ received               | Assigned rep | In-App, Push |
|  Sourcing request created       | Procurement  | In-App, Push |
|  Supplier price received        | Procurement  | In-App       |
|  All pricing ready              | Sales rep    | In-App, Push |
|  Approval needed (margin)       | Sales Mgr    | Push, Email  |
|  Approval needed (credit)       | Finance      | Push, Email  |
|  Quote accepted by customer     | Sales rep    | Push, Email  |
|  Order created                  | Operations   | In-App, Push |
|  Delivery completed             | Ops, Sales   | In-App       |
|  Invoice ready                  | Finance      | In-App       |
|  Payment received               | Finance, Sales| In-App, Email|
|  Overdue > 30 days              | Finance, Sales| Push, Email  |
|  Overdue > 90 days              | Finance, CEO | Push, Email  |
|  Credit limit > 80%             | Finance      | In-App       |
|  Credit limit > 90%             | Finance, Sales, CEO | Push  |
|  Quote expiring in 3 days       | Sales rep    | In-App       |
|  Quote expiring tomorrow        | Sales rep    | Push         |
|                                                                |
|  [+ Add Rule]  [Edit Existing]                                 |
+---------------------------------------------------------------+
```

**System Numbering Configuration**
```
+---------------------------------------------------------------+
|  ADMIN > SYSTEM > NUMBERING SEQUENCES                          |
+---------------------------------------------------------------+
|                                                                |
|  Entity           | Prefix  | Example      | Next Number     |
|  -----------------|---------|--------------|-----------------|
|  Quote            | QT-     | QT-2025-0901 | 0902            |
|  Order            | ORD-    | ORD-2025-301 | 302             |
|  Purchase Order   | PO-     | PO-2025-2210 | 2211            |
|  Invoice          | INV-    | INV-2025-4502| 4503            |
|  Payment          | PAY-    | PAY-2025-1001| 1002            |
|  Sourcing Request | SR-     | SR-2025-0445 | 0446            |
|  Delivery         | DEL-    | DEL-2025-0120| 0121            |
|  Customer         | CUS-    | CUS-0089     | 0090            |
|  Supplier         | SUP-    | SUP-0034     | 0035            |
|                                                                |
|  Format: [Prefix][Year]-[Sequential Number]                    |
|  [x] Include year in sequence                                  |
|  [x] Reset sequence annually                                   |
|  Minimum digits: [4]                                           |
+---------------------------------------------------------------+
```

---

## ARCHITECTURE SUMMARY

### The Big Picture

```
+====================================================================+
|                        UNIFIED INTERNAL PLATFORM                     |
|                    (Single deployment, shared database)               |
+====================================================================+
|                                                                      |
|  SHARED SERVICES LAYER:                                              |
|  [Auth/SSO] [Notifications] [AI Assistant] [Search] [Audit Log]    |
|  [File Storage] [Comments/Activity] [Approval Engine] [Admin]       |
|                                                                      |
+---+----------+----------+-----------+---------+--------+-----+------+
|   | SALES    |PROCUREMENT| OPERATIONS| FINANCE | CEO    |ADMIN|      |
|   | MODULE   | MODULE   | MODULE    | MODULE  | MODULE |MOD  |      |
|   |          |          |           |         |        |     |      |
|   |Quotes    |Inquiries |Fulfillment|AR/AP    |KPIs    |Users|      |
|   |Pipeline  |Suppliers |Delivery   |Credit   |Alerts  |Roles|      |
|   |CRM       |POs       |Dispatch   |Margins  |Reports |Rules|      |
|   |RFQs      |Compare   |Warehouse  |Payments |Trends  |Conf |      |
+---+----------+----------+-----------+---------+--------+-----+------+
|                                                                      |
|  SHARED DATA LAYER:                                                  |
|  [Customers] [Suppliers] [Products] [Quotes] [Orders]               |
|  [POs] [Invoices] [Payments] [Deliveries] [Users]                   |
|                                                                      |
+====================================================================+
|                                                                      |
|  EXTERNAL CONNECTIONS:                                               |
|  [Customer Portal] <--API--> [Internal Platform]                     |
|  [Supplier Portal] <--API--> [Internal Platform]                     |
|  [Driver App]      <--API--> [Internal Platform]                     |
|  [Email Service]   <--API--> [Internal Platform]                     |
|  [Slack/Teams]     <--Bot--> [Internal Platform]                     |
|                                                                      |
+====================================================================+
```

### Key Design Decisions Summary

| Decision | Recommendation | Rationale |
|----------|---------------|-----------|
| Unified vs Separate | ONE unified platform with modules | Data consistency, lower TCO, faster development |
| Notifications | Multi-channel with user preferences | In-app always, push for urgent, email for digest |
| Activity Feeds | Yes, on every entity, filtered by role | Context preservation, audit trail, reduces back-and-forth |
| Approvals | Parallel where possible, with escalation | Prevents bottlenecks, maintains velocity |
| Views | Tabbed entity pages, role-filtered | One data model, multiple perspectives |
| Dashboards | Role-specific with selective cross-dept data | Relevant visibility without overload |
| Messaging | Contextual comments on entities, not full chat | Audit-friendly, context-preserving |
| AI Assistant | One assistant, role-aware, read+draft+analyze | Productivity multiplier for all roles |
| Mobile | PWA for internal, native for drivers | Cost-effective, easy updates, offline where needed |
| Admin | Layered: Super Admin, Dept Admin, Delegated | Scalable governance without bottleneck |

---

## Sources

- [Unified Commerce Architecture - OroCommerce](https://oroinc.com/b2b-ecommerce/blog/unified-commerce-architecture/)
- [Enterprise Software Architecture Patterns - vFunction](https://vfunction.com/blog/enterprise-software-architecture-patterns/)
- [B2B Notification Service Design - SuprSend](https://www.suprsend.com/post/what-is-an-effective-notification-service-in-b2b-context---selecting-implementing-and-optimizing-notification-services-for-saas-business)
- [Best Notification Infrastructure Software 2025 - Courier](https://www.courier.com/blog/best-notification-infrastructure-software-2025)
- [Audit Trail Complete Guide 2025 - Spendflo](https://www.spendflo.com/blog/audit-trail-complete-guide)
- [Automated Audit Trail Software - HubiFi](https://www.hubifi.com/blog/automated-audit-trail-software)
- [B2B Buyer Approval Flows - commercetools](https://commercetools.com/blog/b2b-product-spotlight-a-beginners-guide-to-buyer-approval-flows)
- [Purchase Approval Workflow Examples - Procurify](https://www.procurify.com/blog/purchase-approval-workflow-examples/)
- [How to Create an Approval Workflow - Zip](https://ziphq.com/blog/how-to-create-an-approval-workflow)
- [B2B Data Modeling: Platform-Centric Schema Design - Medium](https://medium.com/@bryan.bashaw/b2b-data-modeling-lessons-from-platform-centric-schema-design-51391b9cda17)
- [B2B Commerce Data Model - Salesforce](https://developer.salesforce.com/docs/commerce/salesforce-commerce/guide/b2b-b2c-dev-data-model.html)
- [Breaking Down Silos with Digital Workflows - HUBTGI](https://hubtgi.com/breaking-down-silos-with-digital-workflows/)
- [Dashboard Benefits for Distribution Industry - BlueLinkERP](https://www.bluelinkerp.com/blog/take-control-of-your-business-with-executive-dashboards-wholesale-distribution-software/)
- [Top Executive Dashboards for CEO and COO - Perceptive Analytics](https://www.perceptive-analytics.com/top-executive-dashboards/)
- [6 Core Capabilities to Scale Agent Adoption 2026 - Microsoft Copilot](https://www.microsoft.com/en-us/microsoft-copilot/blog/copilot-studio/6-core-capabilities-to-scale-agent-adoption-in-2026/)
- [AI Copilot in Procurement - Zycus](https://www.zycus.com/blog/artificial-intelligence/ai-copilot-in-procurement-bridging-generative-and-agentic-intelligence)
- [JAI Procurement AI Copilot - JAGGAER](https://www.jaggaer.com/solutions/jai)
- [Odoo vs NetSuite ERP Comparison - BrokenRubik](https://www.brokenrubik.com/blog/odoo-vs-netsuite)
- [NetSuite vs Odoo Comparison 2025 - Folio3](https://netsuite.folio3.com/services/migration/odoo-to-netsuite/)
- [How to Design Effective SaaS Roles and Permissions - Perpetual](https://www.perpetualny.com/blog/how-to-design-effective-saas-roles-and-permissions)
- [Roles and Permissions in SaaS - Frontegg](https://frontegg.com/guides/roles-and-permissions-handling-in-saas-applications)
- [Slack Business Communication Hub 2025 - David Tries](https://davidtries.com/slack-business-communication-hub/)
- [Mobile Sales Enablement in Field Sales - DeltaSalesApp](https://deltasalesapp.com/blog/what-role-does-mobile-sales-enablement-play-in-modern-field-sales)
- [Mobile Workforce Management Software 2025 - theEmployeeApp](https://theemployeeapp.com/blog/best-mobile-workforce-management-software/)
- [Field Service Mobile Apps - eLogii](https://elogii.com/blog/field-service-mobile-app)
- [RBAC Examples - Oso](https://www.osohq.com/learn/rbac-examples)
- [SaaS User Management Guide 2026 - Zluri](https://www.zluri.com/blog/saas-user-management)
