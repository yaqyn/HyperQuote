> ⚠️ **REFERENCE DOCUMENT — NOT THE SOURCE OF TRUTH**
> This file was written during the research phase and may contain outdated decisions, US-centric references, or superseded technical choices.
> **Always defer to `essential/RESEARCH.md` for current decisions.**
> Key changes since this file was written: TanStack Start (not Next.js), Capacitor (not Expo), React Aria (not shadcn), Egyptian law (not US FMCSA), EGP (not USD), dual auth pools, no online payments, no mobile wallets, spatial glass UI (not traditional dashboards).

# RESEARCH: Customer & Supplier Support System
## B2B Building Materials Distribution Platform (HyperQuote)

**Date:** 2026-03-28
**Context:** HyperQuote is a B2B building materials distribution platform connecting customers (construction companies, GCs, developers) with suppliers (material manufacturers/wholesalers). WhatsApp is the primary support channel. Tech stack: Supabase + Cloudflare + WhatsApp Business API.

---

## TABLE OF CONTENTS

1. [Support Ticket Taxonomy](#1-support-ticket-taxonomy)
2. [Ticket Lifecycle and SLAs](#2-ticket-lifecycle-and-slas)
3. [WhatsApp-First Support System](#3-whatsapp-first-support-system)
4. [AI-First Support Triage](#4-ai-first-support-triage)
5. [Supplier Support](#5-supplier-support)
6. [Internal Support Workflows](#6-internal-support-workflows)
7. [Knowledge Base and Self-Service](#7-knowledge-base-and-self-service)
8. [Support Metrics and Reporting](#8-support-metrics-and-reporting)
9. [Live Chat vs Async Messaging](#9-live-chat-vs-async-messaging)
10. [Support Tools: Buy vs Build](#10-support-tools-buy-vs-build)
11. [Escalation Paths](#11-escalation-paths)
12. [Returns and Claims Process](#12-returns-and-claims-process)

---

## 1. SUPPORT TICKET TAXONOMY

### Design Principles

Industry best practice is a **two-tier hierarchical taxonomy** with 30-50 total tags. Each ticket gets a **High-Level Category Tag** plus a **Specific Reason Tag**. This avoids "tag bloat" (organizations with 500+ manual categories see agents selecting the first match rather than the most accurate one).

Naming convention: Use clear, descriptive names like `Order_Damaged_Items` or `Payment_Invoice_Dispute` rather than abbreviations or codes.

---

### Complete Taxonomy for HyperQuote

#### CATEGORY 1: ORDER ISSUES

| Reason Tag | Description | Priority | Typical Owner |
|---|---|---|---|
| `Order_Delayed` | Order not delivered by promised date | High | Operations |
| `Order_Wrong_Items` | Received incorrect materials/specs | Critical | Operations + Procurement |
| `Order_Damaged_Items` | Materials arrived damaged | Critical | Operations + Claims |
| `Order_Missing_Items` | Partial delivery, items missing | High | Operations |
| `Order_Quantity_Mismatch` | Received more/less than ordered | High | Operations |
| `Order_Status_Inquiry` | "Where is my order?" | Normal | CS (AI-handleable) |
| `Order_Modification` | Change items/quantities after placement | High | Sales + Operations |
| `Order_Cancellation` | Cancel before fulfillment | High | Sales + Finance |
| `Order_Quality_Issue` | Materials don't meet specs/grade | Critical | Procurement + QA |

#### CATEGORY 2: QUOTE ISSUES

| Reason Tag | Description | Priority | Typical Owner |
|---|---|---|---|
| `Quote_Pricing_Dispute` | Customer disagrees with quoted price | High | Sales |
| `Quote_Expired` | Quote validity period passed | Normal | Sales |
| `Quote_Revision_Request` | Customer wants quote changes | Normal | Sales |
| `Quote_Missing_Items` | Quote doesn't include all requested items | Normal | Sales |
| `Quote_Comparison` | Customer comparing with competitor pricing | Normal | Sales + Management |
| `Quote_Approval_Delay` | Internal approval bottleneck | Normal | Sales Management |

#### CATEGORY 3: DELIVERY ISSUES

| Reason Tag | Description | Priority | Typical Owner |
|---|---|---|---|
| `Delivery_Driver_No_Show` | Scheduled delivery didn't arrive | Critical | Dispatch + Operations |
| `Delivery_Wrong_Address` | Delivered to incorrect site | Critical | Dispatch |
| `Delivery_Site_Access` | Driver couldn't access construction site | High | Dispatch + Customer |
| `Delivery_Reschedule` | Customer needs different date/time | Normal | Dispatch |
| `Delivery_Unloading_Issue` | Equipment needed, forklift not available | High | Dispatch |
| `Delivery_Partial` | Only part of order delivered | High | Operations |
| `Delivery_POD_Missing` | Proof of delivery not provided | Normal | Dispatch |
| `Delivery_Window_Missed` | Arrived outside agreed time window | High | Dispatch |

#### CATEGORY 4: PAYMENT & BILLING ISSUES

| Reason Tag | Description | Priority | Typical Owner |
|---|---|---|---|
| `Payment_Invoice_Dispute` | Customer disputes invoice amount | High | Finance |
| `Payment_Missing` | Payment not received/reconciled | High | Finance |
| `Payment_Credit_Limit` | Customer hit credit limit, order blocked | High | Finance + Sales |
| `Payment_Wire_Issue` | Wire transfer not confirmed | Normal | Finance |
| `Payment_Credit_Note_Request` | Customer requesting credit for issues | High | Finance + CS |
| `Payment_Overdue` | Customer overdue on payment terms | High | Finance + Account Mgr |
| `Payment_LC_Issue` | Letter of credit documentation problem | High | Finance |
| `Payment_Statement_Request` | Customer needs account statement | Low | Finance (AI-handleable) |

#### CATEGORY 5: ACCOUNT ISSUES

| Reason Tag | Description | Priority | Typical Owner |
|---|---|---|---|
| `Account_Login` | Can't log into portal | Normal | CS (AI-handleable) |
| `Account_Permissions` | User needs different access level | Normal | CS + Account Mgr |
| `Account_New_User` | Add new user to company account | Normal | CS |
| `Account_Company_Update` | Update company info, tax ID, etc. | Normal | CS + Finance |
| `Account_Credit_Application` | New credit limit request | High | Finance + Sales |
| `Account_Deactivation` | Close or suspend account | Normal | Account Mgr |

#### CATEGORY 6: PRODUCT INQUIRIES

| Reason Tag | Description | Priority | Typical Owner |
|---|---|---|---|
| `Product_Availability` | Is item in stock? When available? | Normal | Sales (AI-handleable) |
| `Product_Specs` | Technical specifications question | Normal | Sales + Procurement |
| `Product_Alternative` | Looking for substitute material | Normal | Sales |
| `Product_Certification` | Need material certificates/test reports | Normal | Procurement |
| `Product_Catalog` | Request for product catalog/list | Low | Sales (AI-handleable) |

#### CATEGORY 7: PLATFORM/TECHNICAL ISSUES

| Reason Tag | Description | Priority | Typical Owner |
|---|---|---|---|
| `Platform_Bug` | App/portal not working correctly | High | Engineering |
| `Platform_Feature_Request` | Customer wants new functionality | Low | Product |
| `Platform_Integration` | API or ERP integration issues | High | Engineering |
| `Platform_Mobile_Issue` | Mobile app specific problems | Normal | Engineering |

---

### Supplier-Specific Taxonomy (see Section 5 for details)

| Category | Reason Tags |
|---|---|
| **Portal** | `Supplier_Login`, `Supplier_Catalog_Upload`, `Supplier_Profile_Update` |
| **Orders** | `Supplier_PO_Dispute`, `Supplier_PO_Modification`, `Supplier_Fulfillment_Delay` |
| **Payments** | `Supplier_Payment_Status`, `Supplier_Invoice_Issue`, `Supplier_Payment_Dispute` |
| **Operations** | `Supplier_Shipping_Issue`, `Supplier_Quality_Claim`, `Supplier_Return_Request` |

---

## 2. TICKET LIFECYCLE AND SLAs

### Ticket States

```
[New] --> [Assigned] --> [In Progress] --> [Waiting on Customer]
                                      |-> [Waiting on Internal]
                                      |-> [Waiting on Supplier]
                                      |-> [Escalated]
                                      --> [Resolved] --> [Closed]
                                                    --> [Reopened] --> [In Progress]
```

**State Definitions:**

| State | Description | SLA Clock |
|---|---|---|
| **New** | Ticket just created, unassigned | Running |
| **Assigned** | Assigned to agent/team, not yet worked | Running |
| **In Progress** | Agent actively working on it | Running |
| **Waiting on Customer** | Agent needs info from customer | Paused |
| **Waiting on Internal** | Needs action from another department (ops, finance, procurement) | Running |
| **Waiting on Supplier** | Waiting for supplier response/action | Running (separate SLA) |
| **Escalated** | Moved to higher authority or specialist | Running (escalation SLA) |
| **Resolved** | Solution provided, awaiting customer confirmation | Paused (auto-close timer) |
| **Closed** | Confirmed resolved or auto-closed after X days | Stopped |
| **Reopened** | Customer reopened after resolution | Running (new SLA) |

### Auto-Close Rules
- Tickets in "Resolved" state auto-close after **72 hours** if no customer response
- Tickets in "Waiting on Customer" send reminder after **24 hours**, auto-close after **7 days**
- Reopened tickets get a **new SLA clock** but retain original ticket history

---

### SLA Benchmarks by Priority

Industry benchmarks for B2B distribution (adapted from multiple sources):

| Priority | First Response | Resolution Target | Escalation Trigger |
|---|---|---|---|
| **Critical** (site shut down, safety issue, major financial impact) | 15 minutes | 4 hours | Auto-escalate after 30 min without response |
| **High** (order blocked, delivery failed, payment dispute >$10K) | 1 hour | 8 hours (1 business day) | Auto-escalate after 2 hours |
| **Normal** (general inquiries, modifications, status updates) | 4 hours | 24 hours (1 business day) | Auto-escalate after 8 hours |
| **Low** (feature requests, info requests, non-urgent updates) | 8 hours | 48 hours (2 business days) | Auto-escalate after 24 hours |

### SLA by Customer Tier

For HyperQuote's context with high-value B2B customers:

| Customer Tier | First Response (WhatsApp) | First Response (Email) | Resolution |
|---|---|---|---|
| **Strategic** (>$5M annual) | Under 5 minutes | 2-4 hours | 4 hours (critical), 8 hours (high) |
| **Enterprise** ($1M-$5M annual) | Under 15 minutes | 4-8 hours | 8 hours (critical), 24 hours (high) |
| **Standard** (<$1M annual) | Under 1 hour | 12-24 hours | 24 hours (critical), 48 hours (high) |

### SLA Compliance Target
- **Overall target**: 90%+ SLA compliance
- Companies responding in under 2 hours see approximately **40% higher customer retention**
- Companies responding within 5 minutes are **21x more likely to qualify leads**

---

## 3. WHATSAPP-FIRST SUPPORT SYSTEM

### Architecture Overview

```
Customer WhatsApp Message
        |
        v
[WhatsApp Cloud API] (Meta-hosted, only option since Oct 2025)
        |
        v
[Cloudflare Worker - Webhook Receiver]
        |
        v
[AI Triage Layer] (Cloudflare Workers AI or external LLM)
    |           |           |
    v           v           v
[Auto-Reply]  [Create     [Route to
 (AI handles) Ticket]     Human Agent]
                |
                v
        [Supabase - Tickets Table]
                |
                v
        [Agent Dashboard / Internal App]
                |
                v
        [Agent Reply via WhatsApp API]
```

### WhatsApp Business API: Key Facts (2025-2026)

- **Cloud API only**: The On-Premises API was retired in October 2025. All integrations use Meta's Cloud API.
- **Pricing model** (since July 2025): Charges are per delivered template message. No more flat 24-hour conversation fees.
- **Free service messages**: Within a 24-hour window after a customer's message, service replies are free.
- **Shared Account Model**: Providers can no longer manage WABAs on behalf of clients. Each business owns its own WABA.
- **Template messages**: Pre-approved message templates required for initiating conversations outside the 24-hour window (e.g., proactive order updates).

### Converting Messages into Tickets

**Step 1: Webhook Reception**
- Cloudflare Worker receives webhook from WhatsApp Cloud API
- Extracts: sender phone number, message content, media (photos/documents), timestamp

**Step 2: Customer Identification**
- Look up phone number in Supabase `contacts` table
- Match to company account (one phone can map to one company, or require verification)
- If unknown number: create temporary contact, ask for identification

**Step 3: Conversation Threading**
- Check for open tickets from this customer
- If existing open ticket: append message to that ticket's conversation thread
- If no open ticket: create new ticket
- If multiple open tickets: AI asks "Is this about your order #12345 or something new?"

**Step 4: Ticket Creation**
- Auto-populate: customer, company, contact method (WhatsApp), timestamp
- AI classifies: category, priority, suggested assignee
- Store in Supabase `tickets` table with full conversation history

### Handling Multiple Conversations per Customer

This is a core challenge. Solutions:

1. **Order-referenced routing**: When customer mentions an order number, auto-link to that order's ticket
2. **AI disambiguation**: "I see you have 2 open issues. Are you asking about: (1) Delivery for PO-4521 or (2) Invoice #890?"
3. **Conversation tags**: Each WhatsApp thread has a context tag; when topic shifts, AI detects and creates/routes to appropriate ticket
4. **Structured menus**: Use WhatsApp interactive messages (buttons/lists) to let customer select topic

### Multi-Agent Handling

- All agents access the **same unified queue** in the internal dashboard
- **Assignment rules**: Round-robin, skills-based, or account-based (dedicated account managers)
- **Agent collision prevention**: When an agent claims a ticket, it's locked; other agents see "Assigned to [Agent]"
- **Internal notes**: Agents add notes visible only to team, not sent to customer via WhatsApp
- Agents reply through the internal dashboard; messages are sent to customer via WhatsApp API

### WhatsApp Message Types for Support

| Type | Use Case | Example |
|---|---|---|
| **Text** | General replies | "Your order #4521 is scheduled for delivery tomorrow at 9 AM" |
| **Interactive Buttons** | Quick choices | [Track Order] [Talk to Agent] [New Issue] |
| **Interactive Lists** | Category selection | Select from: Order Issues, Delivery, Payment, Account, Other |
| **Media (Image)** | Damage evidence | Customer sends photo of damaged materials |
| **Document** | Invoices, credit notes | Send PDF of credit note |
| **Location** | Delivery confirmation | Share delivery site location |
| **Template** | Proactive updates | "Your order #4521 has shipped. Track: [link]" |

---

## 4. AI-FIRST SUPPORT TRIAGE

### What AI Can Handle Automatically (60-80% of Tickets)

Based on industry data, AI can resolve 40-60% of B2B support tickets automatically, with up to 80% of routine inquiries being manageable. For HyperQuote:

#### Tier 0: Fully Automated (No Human Needed)

| Query Type | AI Action | % of Volume (est.) |
|---|---|---|
| "Where is my order?" | Look up order status in DB, respond with current status + ETA | 25-30% |
| "What's my invoice balance?" | Query finance records, respond with amount | 5-8% |
| "Can I get a copy of invoice #X?" | Retrieve PDF from storage, send via WhatsApp | 3-5% |
| "What's the status of my quote?" | Look up quote, respond with status + expiry date | 5-8% |
| "I can't log in" | Trigger password reset flow, send link | 3-5% |
| "What are your delivery hours?" | Respond from knowledge base | 2-3% |
| "Do you have [product] in stock?" | Query inventory, respond with availability | 5-8% |
| "What's the lead time for [product]?" | Query supplier lead times, respond | 3-5% |
| Account statement request | Generate and send PDF | 2-3% |

**Estimated AI auto-resolution: 55-75% of incoming messages**

#### Tier 1: AI-Assisted (AI Gathers Info, Human Confirms)

| Query Type | AI Action | Human Action |
|---|---|---|
| Quote revision request | AI collects new requirements, drafts revised quote | Sales rep reviews and approves |
| Delivery reschedule | AI checks available slots, offers options | Dispatch confirms |
| Order modification | AI validates feasibility, calculates impact | Operations approves |
| Credit limit increase | AI collects financial docs, pre-screens | Finance reviews |

#### Tier 2: Human Required (AI Routes + Summarizes)

| Query Type | Why Human Needed | Routing |
|---|---|---|
| Damaged goods claim | Judgment call, negotiation, photo review | Claims team |
| Pricing dispute >$5K | Financial authority needed | Sales manager |
| Quality complaint | Technical assessment needed | QA + Procurement |
| Contract negotiation | Relationship management | Account manager |
| Payment dispute >$10K | Financial authority + legal implications | Finance manager |
| Safety issue with materials | Liability, regulatory | QA + Legal + Management |
| Frustrated/angry customer | Empathy, de-escalation | Senior CS + Account manager |

### AI-to-Human Handoff Design

**Three Categories of Escalation Triggers:**

1. **Customer Signals**
   - Customer explicitly requests human ("I want to talk to a person")
   - Customer repeats themselves multiple times without progress
   - Frustrated language detected ("This is ridiculous", profanity, ALL CAPS)
   - Issue falls outside AI's defined scope

2. **AI-Initiated Scenarios**
   - Conversation goes off-script or enters a loop
   - Fallback responses delivered 2+ times in succession
   - Backend API timeout or integration failure
   - VIP/high-value customer flagged for human service
   - Confidence score below threshold (e.g., <70% intent confidence)

3. **Business Rules**
   - Financial disputes above threshold ($5K+)
   - Safety or quality concerns
   - Legal or compliance issues
   - Tickets open longer than SLA without resolution

**Warm Handoff Protocol:**
1. AI says: "Let me connect you with [Agent Name] who specializes in [issue type]. I'm sharing our conversation so you won't need to repeat anything."
2. AI generates conversation summary for agent: customer name, company, issue, what was tried, relevant order/invoice numbers
3. Agent receives ticket with full context in dashboard
4. Agent sends first message within SLA (human first response SLA)

**What NOT to Escalate:**
- Unexpected but simple responses (use clarifying questions first)
- Mild confusion (reference knowledge base)
- Issues within AI scope even if customer sounds frustrated (attempt resolution first, then escalate if unresolved)

---

## 5. SUPPLIER SUPPORT

### Should Suppliers Use the Same System?

**Recommendation: Unified system, separate queues.**

Use the same Supabase ticketing infrastructure but with:
- Separate routing rules for supplier tickets
- Different SLAs (suppliers are partners, not customers)
- Dedicated supplier support team/agents
- Supplier-specific ticket categories
- Separate supplier portal interface

This avoids maintaining two systems while ensuring suppliers get specialized support.

### Supplier Support Categories

#### Portal & Account Issues
| Issue | Priority | Owner |
|---|---|---|
| Can't log into supplier portal | Normal | CS/Tech |
| Catalog upload failed | High | Tech + Procurement |
| Product data sync errors | High | Tech |
| Profile/bank details update | Normal | Finance + CS |
| New user access request | Normal | CS |
| API integration issues | High | Engineering |

#### Order & Fulfillment Issues
| Issue | Priority | Owner |
|---|---|---|
| PO dispute (pricing, quantities) | High | Procurement |
| PO modification request | Normal | Procurement |
| Can't fulfill order on time | Critical | Procurement + Operations |
| Shipping label/documentation issue | Normal | Operations |
| Delivery coordination problem | High | Dispatch |

#### Payment Issues
| Issue | Priority | Owner |
|---|---|---|
| Payment status inquiry | Normal | Finance (AI-handleable) |
| Invoice submission problem | Normal | Finance |
| Payment dispute/discrepancy | High | Finance + Procurement |
| Tax document request | Normal | Finance (AI-handleable) |
| Payment terms negotiation | High | Finance + Procurement Mgr |

#### Quality & Returns
| Issue | Priority | Owner |
|---|---|---|
| Quality claim against supplier | High | QA + Procurement |
| Return authorization request | Normal | Procurement |
| Warranty claim processing | High | Procurement + Finance |
| Material certification issue | High | QA + Procurement |

### Supplier Communication Channels

| Channel | Use Case |
|---|---|
| **WhatsApp** | Urgent issues, delivery coordination, quick questions |
| **Supplier Portal** | PO management, catalog updates, payment status, document exchange |
| **Email** | Formal communications, contracts, payment confirmations |
| **Phone** | Critical/urgent issues only (delivery failures, quality emergencies) |

### Routing Logic for Supplier Tickets

```
Supplier WhatsApp Message
        |
        v
[Identify as Supplier] (phone number lookup in suppliers table)
        |
        v
[AI Triage - Supplier Context]
    |           |           |
    v           v           v
[Auto-Reply]  [Route to    [Route to
              Procurement]  Finance]
```

Key routing rules:
- PO-related messages -> Procurement team
- Payment-related messages -> Finance team
- Portal/tech issues -> Technical support
- Quality issues -> QA team
- Everything else -> Procurement (default supplier owner)

---

## 6. INTERNAL SUPPORT WORKFLOWS

### Cross-Department Workflow: Damaged Goods Example

This is the most complex internal workflow because it spans CS, Operations, Procurement, Finance, and back to CS.

```
Step 1: CUSTOMER REPORTS
Customer sends WhatsApp: "Order #4521 arrived, 20 bags of cement are damaged"
    |
    v
Step 2: AI TRIAGE
AI responds: "I'm sorry to hear that. Can you please send photos of the damaged items and the delivery receipt?"
AI creates ticket: Category=Order_Damaged_Items, Priority=Critical
    |
    v
Step 3: CS COLLECTS EVIDENCE
CS agent reviews photos, confirms with customer:
- Number of damaged items
- Type of damage (crushed, wet, torn)
- Photos of items + packaging
- Delivery receipt / POD
- Was damage noted at time of delivery?
    |
    v
Step 4: OPERATIONS INVESTIGATES
Internal sub-ticket created for Operations:
- Was damage from shipping or pre-existing?
- Check driver's delivery notes
- Review loading/unloading records
- Check if other deliveries from same batch had issues
    |
    v
Step 5: PROCUREMENT CONTACTS SUPPLIER
If supplier fault:
- Forward evidence to supplier
- Request credit note or replacement
- Supplier has 48-hour response SLA
- Track supplier response in ticket
    |
    v
Step 6: DECISION
Operations Manager + Finance decide:
- Full credit note to customer?
- Partial credit (shared fault)?
- Replacement shipment?
- Timeline for resolution?
    |
    v
Step 7: FINANCE ISSUES CREDIT NOTE
- Create credit note in system
- Apply to customer account
- Send credit note PDF to customer via WhatsApp
    |
    v
Step 8: CS UPDATES CUSTOMER
- Inform customer of resolution
- Send credit note or replacement tracking
- Confirm customer satisfaction
- Close ticket
```

### Internal Sub-Ticket System

A single customer ticket can spawn multiple internal sub-tickets:

```
Main Ticket #1234 (Customer-facing)
  |
  |-- Sub-ticket #1234-A: Operations Investigation
  |     Owner: Operations Team
  |     SLA: 4 hours
  |
  |-- Sub-ticket #1234-B: Supplier Claim
  |     Owner: Procurement
  |     SLA: 48 hours (supplier response)
  |
  |-- Sub-ticket #1234-C: Credit Note Issuance
  |     Owner: Finance
  |     SLA: 24 hours after decision
  |
  |-- Sub-ticket #1234-D: Replacement Shipment
  |     Owner: Dispatch
  |     SLA: Per delivery schedule
```

### Other Cross-Department Workflows

#### Wrong Items Delivered
```
CS receives report -> Operations confirms (check BOL vs order) ->
Dispatch schedules pickup of wrong items + delivery of correct items ->
If supplier sent wrong items: Procurement files claim ->
Finance adjusts invoice if needed -> CS updates customer
```

#### Invoice Dispute
```
CS receives dispute -> Finance reviews invoice vs PO vs delivery receipt ->
If billing error: Finance issues corrected invoice ->
If pricing dispute: Sales reviews original quote ->
If delivery shortage: Operations confirms quantities ->
Finance adjusts -> CS updates customer
```

#### Credit Limit Increase Request
```
CS/Sales receives request -> Finance pulls payment history ->
Finance runs credit check -> Finance Manager approves/denies ->
Sales informed of new limit -> CS updates customer ->
Account updated in system
```

### Workflow Tracking in Supabase

Key tables needed:

```sql
-- Main tickets (customer/supplier facing)
tickets (
  id, ticket_number, type, category, reason_tag,
  priority, status, customer_id, supplier_id,
  assigned_to, assigned_team, channel,
  sla_first_response, sla_resolution,
  created_at, first_responded_at, resolved_at, closed_at
)

-- Sub-tickets (internal cross-department)
sub_tickets (
  id, parent_ticket_id, department,
  assigned_to, status, sla_deadline,
  created_at, completed_at
)

-- Conversation messages
ticket_messages (
  id, ticket_id, sender_type, -- 'customer', 'agent', 'ai', 'internal_note'
  sender_id, content, media_urls,
  channel, -- 'whatsapp', 'email', 'portal', 'internal'
  created_at
)

-- SLA tracking
ticket_sla_events (
  id, ticket_id, event_type, -- 'paused', 'resumed', 'breached', 'met'
  triggered_at, reason
)

-- Escalation history
ticket_escalations (
  id, ticket_id, from_agent, to_agent,
  escalation_type, reason, created_at
)
```

---

## 7. KNOWLEDGE BASE AND SELF-SERVICE

### Knowledge Base Structure for Customers

#### Getting Started
- How to create your account
- How to add team members
- Understanding your dashboard
- How to request a quote
- Understanding quote validity and terms
- How to place an order from an approved quote

#### Orders & Tracking
- How to track your order status
- Understanding order statuses (Confirmed, In Production, Shipped, Delivered)
- How to modify an order after placement
- How to cancel an order
- What happens if an item is out of stock
- Lead times for common materials

#### Delivery
- Delivery scheduling and time windows
- Site preparation for delivery (access, unloading equipment)
- What to do if driver can't access the site
- How to reschedule a delivery
- Proof of delivery and signing
- What to check when receiving materials (inspection checklist)

#### Payments & Billing
- Understanding your invoice
- Payment methods accepted (wire, check, LC)
- Payment terms and due dates
- How to view your account statement
- How to dispute an invoice
- Credit limit: how it works and how to increase it

#### Returns & Claims
- How to report damaged goods (step-by-step with photo requirements)
- Return policy for building materials
- How credit notes work
- Timeline for claims processing
- What qualifies for a return vs. what doesn't

#### Products
- Material specifications and certifications
- How to request material test reports
- Finding alternative/substitute materials
- Minimum order quantities

### Knowledge Base Structure for Suppliers

#### Getting Started
- Supplier onboarding process
- Setting up your supplier portal account
- Uploading your product catalog
- Understanding how POs work on HyperQuote

#### Orders & Fulfillment
- How to confirm/acknowledge a PO
- How to report fulfillment delays
- Shipping and documentation requirements
- Delivery coordination with HyperQuote dispatch

#### Payments
- Payment terms and schedules
- How to submit invoices
- Payment status tracking
- Resolving payment discrepancies

#### Quality & Returns
- Quality standards and expectations
- How claims are processed against suppliers
- Return authorization process
- Providing material certifications

### AI Chatbot + Knowledge Base Integration

The AI chatbot should use the knowledge base as its primary source of truth:

1. **Retrieval-Augmented Generation (RAG)**: Store knowledge base articles as embeddings in Supabase (pgvector). When customer asks a question, retrieve relevant articles and use them to generate accurate responses.
2. **Confidence scoring**: If the AI's confidence in the KB-sourced answer is >80%, respond directly. If 50-80%, respond with "Based on our information..." and offer human agent option. If <50%, route to human.
3. **Feedback loop**: Track which AI responses customers accept vs. escalate to improve the KB over time.
4. **Proactive suggestions**: When AI detects an issue pattern (e.g., many "where is my order" queries for a specific shipment), proactively send updates before customers ask.

---

## 8. SUPPORT METRICS AND REPORTING

### Core KPIs to Track

#### Responsiveness Metrics

| KPI | Definition | Target | Measurement |
|---|---|---|---|
| **First Response Time (FRT)** | Time from ticket creation to first agent response | <5 min (WhatsApp), <4 hr (email) | Median, by channel and tier |
| **Average Resolution Time (ART)** | Time from creation to resolution | <8 hours (high), <24 hours (normal) | Median, by category |
| **SLA Compliance Rate** | % of tickets meeting SLA targets | >90% | By priority, category, team |

#### Quality Metrics

| KPI | Definition | Target | Measurement |
|---|---|---|---|
| **CSAT Score** | Post-resolution satisfaction (1-5 scale) | >85% positive (4-5) | Per ticket, per agent |
| **First Contact Resolution (FCR)** | % resolved without follow-ups or escalation | >70% | By category |
| **Customer Effort Score (CES)** | How easy was it to get help? | >90% "easy" | Survey after resolution |
| **NPS (Support)** | Would you recommend our support? | >50 | Quarterly survey |

#### Efficiency Metrics

| KPI | Definition | Target | Measurement |
|---|---|---|---|
| **Ticket Volume** | Total tickets per period | Track trend | Daily/weekly/monthly, by category |
| **AI Resolution Rate** | % of tickets fully resolved by AI | >50% | By category |
| **Escalation Rate** | % of tickets escalated to higher tier | <15% | By team, category |
| **Agent Utilization** | % of agent time on active tickets | 70-80% | Per agent |
| **Cost Per Resolution** | Total support cost / resolved tickets | Decrease over time | Monthly |
| **Repeat Contact Rate** | % of customers with multiple tickets on same issue | <10% | By customer, category |
| **Average Handle Time (AHT)** | Time agent spends per ticket actively | Track trend | Per agent, category |

#### Operational Health Metrics

| KPI | Definition | Target | Measurement |
|---|---|---|---|
| **Backlog** | Open tickets unresolved beyond SLA | <5% of total | Real-time dashboard |
| **Ticket Reopen Rate** | % of resolved tickets reopened | <5% | By agent, category |
| **Agent Satisfaction (eNPS)** | Would agents recommend their job? | >30 | Quarterly survey |

### Reporting Dashboard Design

**Real-Time Dashboard (for CS Managers):**
- Open tickets by priority (with SLA countdown timers)
- Tickets approaching SLA breach (amber/red alerts)
- Agent availability and current workload
- AI resolution rate (last 24 hours)
- Incoming volume trend (last 7 days)

**Weekly Report (for Management):**
- Total tickets created/resolved/backlog
- SLA compliance by priority and team
- Top 5 ticket categories (volume and trend)
- CSAT score trend
- AI vs. human resolution split
- Escalation patterns
- Repeat issue analysis

**Monthly Report (for Executives):**
- Cost per resolution trend
- Customer retention correlation with support quality
- Supplier ticket patterns (systemic issues)
- Headcount efficiency (tickets per agent)
- Knowledge base effectiveness (deflection rate)
- Improvement actions from previous month's findings

### Using Metrics to Improve Operations

- **High volume in one category** (e.g., Order_Delayed): signals operational issue, not support issue. Escalate to operations leadership.
- **Low CSAT from specific supplier's orders**: signal to procurement to address supplier quality.
- **High repeat contact rate**: knowledge base gap or resolution quality issue.
- **Rising escalation rate**: agent training needed, or AI triage rules need tuning.
- **SLA breaches concentrated in specific hours**: staffing/scheduling adjustment needed.

---

## 9. LIVE CHAT VS ASYNC MESSAGING

### The Verdict: Async-First for Construction Professionals

**Why async messaging wins for HyperQuote:**

1. **Construction professionals are on job sites.** They can't sit at a computer waiting for live chat. They send a WhatsApp message between tasks and check the reply when they can.

2. **75% of business customers now prefer messaging over traditional channels** (industry benchmark).

3. **61% of B2B businesses offer live chat**, but usage patterns show async is preferred for non-urgent matters.

4. **WhatsApp is inherently async.** Customers send when convenient, agents respond per SLA. The conversation persists and doesn't "end" like a live chat session.

5. **B2B issues are often complex.** A damaged goods claim requires photos, investigation, cross-department review. This naturally takes hours/days, not minutes.

### Hybrid Approach Recommendation

| Scenario | Mode | Channel |
|---|---|---|
| "Where is my order?" | Async (AI auto-responds instantly) | WhatsApp |
| Delivery coordination (same-day) | Near-real-time (<5 min) | WhatsApp |
| Damaged goods report | Async (collect evidence, investigate) | WhatsApp |
| Invoice dispute | Async | WhatsApp or Email |
| Emergency (driver stuck, site issue) | Real-time | WhatsApp or Phone |
| Complex negotiation | Scheduled call | Phone/Video |

### Implementation

The same WhatsApp-based system handles both modes:
- **AI auto-replies** are effectively instant (live chat feel for simple queries)
- **SLA-driven responses** provide async support with guaranteed response windows
- **Priority flag for urgent**: Customer can indicate urgency, triggering faster SLA
- **No separate "live chat" tool needed**: WhatsApp serves as both

### Response Time Expectations to Set with Customers

Communicate clearly:
- "Most questions answered instantly by our AI assistant"
- "Complex issues: first response within 1 hour during business hours"
- "Urgent/critical: call [phone number] for immediate assistance"

---

## 10. SUPPORT TOOLS: BUY VS BUILD

### Options Analysis

#### Option A: Full SaaS (Zendesk/Freshdesk)

**Zendesk:**
- Pricing: $55-169/agent/month
- Pros: Mature, extensive integrations, WhatsApp native, robust reporting
- Cons: Expensive at scale, AI add-ons cost extra, less customizable, data lives outside your stack

**Freshdesk:**
- Pricing: $14-40/agent/month
- Pros: Affordable, good WhatsApp integration, solid for mid-size
- Cons: Less customizable than custom, still a separate data silo

**Intercom:**
- Pricing: $39-139/seat/month
- Pros: Great AI chatbot (Fin), modern UX, good WhatsApp support
- Cons: More B2C oriented, expensive, less suited for complex B2B workflows

#### Option B: Hybrid (SaaS for Ticketing + Custom for WhatsApp/AI)

Use Freshdesk or similar for ticket management while building custom WhatsApp integration and AI layer on Supabase + Cloudflare Workers. Route tickets to SaaS via API.

#### Option C: Custom-Built on Supabase + Cloudflare (Recommended)

**Why build for HyperQuote:**

1. **Data co-location**: Tickets, orders, quotes, payments, customers are all in Supabase. No need to sync between systems. AI can look up order status, invoice details, delivery tracking in the same database.

2. **WhatsApp is primary channel**: SaaS tools treat WhatsApp as "one of many channels." Custom gives you WhatsApp-native design.

3. **AI-first architecture**: Build AI triage directly into the message flow (Cloudflare Workers AI) rather than bolting on a SaaS AI add-on.

4. **Cost**: At 10-20 agents, Zendesk costs $6,600-40,560/year. Custom is effectively free on existing infrastructure (Supabase, Cloudflare Workers).

5. **Customization**: Complex cross-department workflows (sub-tickets, supplier claims, credit notes) are hard to configure in off-the-shelf tools.

6. **Single experience**: Agents use one internal app for orders, quotes, support -- not multiple tools.

### Recommended Build Architecture

```
Layer 1: WhatsApp Cloud API (Meta)
    Webhooks -> Cloudflare Worker (message receiver)

Layer 2: AI Triage (Cloudflare Workers AI / OpenAI / Anthropic)
    Intent classification, entity extraction, auto-response generation
    RAG from knowledge base (Supabase pgvector)

Layer 3: Supabase (Data + Business Logic)
    Tables: tickets, sub_tickets, ticket_messages, ticket_sla_events
    Edge Functions: ticket creation, assignment, SLA calculation
    Realtime: live updates to agent dashboard
    RLS: agents see only their assigned tickets + team queue

Layer 4: Internal Dashboard (React/Next.js on Cloudflare Pages)
    Ticket queue with filters (priority, category, status, assigned)
    Conversation view (WhatsApp-style chat interface)
    Customer context panel (account, orders, quotes, payment history)
    Internal notes + sub-ticket management
    SLA countdown timers
    Reporting dashboards

Layer 5: Proactive Messaging (Cloudflare Workers Cron)
    Order status updates (template messages)
    Delivery notifications
    Payment reminders
    SLA breach alerts to agents
```

### Build vs Buy Decision Matrix

| Factor | Build (Supabase) | Buy (Zendesk/Freshdesk) |
|---|---|---|
| **Cost (10 agents, year 1)** | ~$0 marginal (existing infra) + dev time | $6,600-40,560 |
| **Time to launch** | 4-8 weeks for MVP | 1-2 weeks |
| **WhatsApp integration depth** | Full control, custom flows | Limited to provider's connector |
| **AI customization** | Full control over prompts, models, RAG | Locked to vendor's AI |
| **Data co-location** | Same DB as orders/quotes/payments | Separate system, needs sync |
| **Cross-dept workflows** | Fully custom | Limited by vendor's workflow engine |
| **Reporting** | Custom dashboards, any metric | Pre-built reports, some customization |
| **Scaling** | Supabase + Cloudflare scale naturally | Per-seat pricing adds up |
| **Maintenance** | Your team maintains | Vendor maintains |
| **Risk** | Depends on your dev capacity | Proven, established |

**Verdict**: For HyperQuote, **build custom** on Supabase + Cloudflare. The tight integration with order/quote/payment data, WhatsApp-first design, and AI-first triage make custom the clear winner. The existing tech stack already provides everything needed. The only scenario to buy is if development capacity is severely constrained and you need support operational immediately.

---

## 11. ESCALATION PATHS

### Escalation Matrix

```
Level 0: AI Chatbot
    Handles: Status inquiries, FAQ, simple lookups, password resets
    Escalation trigger: Can't resolve, customer requests human, sentiment negative

Level 1: CS Representative
    Handles: Standard issues, evidence collection, routine requests
    Escalation trigger: Can't resolve in SLA, needs authority, customer demands

Level 2: Senior CS / Team Lead
    Handles: Complex issues, multi-department coordination, unhappy customers
    Escalation trigger: Financial authority needed, process exception required

Level 3: Account Manager
    Handles: Relationship-critical issues, contract disputes, retention risks
    Escalation trigger: Customer threatens to leave, strategic account issue

Level 4: Department Manager (Operations / Finance / Procurement)
    Handles: Cross-department decisions, policy exceptions, large claims
    Escalation trigger: Cross-functional impasse, large financial impact

Level 5: GM / Director
    Handles: Company-level decisions, legal issues, major account crises
    Escalation trigger: >$100K impact, legal threat, safety issue, PR risk
```

### Automatic Escalation Triggers

| Trigger | Escalation Action |
|---|---|
| SLA 50% elapsed, no first response | Alert assigned agent + team lead |
| SLA 80% elapsed, no first response | Auto-reassign to available agent |
| SLA breached | Escalate to team lead, mark red in dashboard |
| SLA breached x2 (double the target) | Escalate to department manager |
| Customer sends 3+ messages without response | Escalate to team lead |
| Negative sentiment detected (AI) | Flag for human review |
| Customer explicitly requests escalation | Immediate route to next level |
| Ticket reopened 2+ times | Escalate to senior CS |
| VIP/Strategic customer ticket created | Auto-notify account manager |
| Financial impact >$10K | Auto-notify finance manager |
| Safety/quality keyword detected | Auto-notify QA manager |

### Escalation Types

| Type | Description | Example |
|---|---|---|
| **Functional** | Route to specialist with right expertise | Payment issue -> Finance team |
| **Hierarchical** | Move up to someone with more authority | CS Rep -> CS Manager (for credit >$5K) |
| **Priority** | Increase ticket priority, tighten SLA | Normal -> Critical (customer escalated) |
| **External** | Engage supplier or third party | Supplier quality claim, carrier claim |

### Escalation SLAs

| Escalation Level | Response After Escalation | Resolution Target |
|---|---|---|
| L1 -> L2 | 30 minutes | 4 hours |
| L2 -> L3 | 1 hour | 8 hours |
| L3 -> L4 | 2 hours | 24 hours |
| L4 -> L5 | 4 hours | 48 hours |

### De-escalation

Once the escalated authority resolves the core issue, the ticket can be de-escalated back to the original level for customer communication and closure. The escalation history is preserved in the ticket for reporting and learning.

---

## 12. RETURNS AND CLAIMS PROCESS

### Building Materials Return Challenges

Building materials returns are fundamentally different from typical e-commerce:

1. **Heavy/bulky items**: Returning 10 tons of steel requires logistics, not a shipping label
2. **Custom/cut materials**: Custom-cut lumber or fabricated steel cannot be returned
3. **Installed materials**: Materials already installed cannot be returned (but can be claimed)
4. **Weather exposure**: Materials left on-site may degrade; determining pre-existing vs. site damage is complex
5. **Batch issues**: One bad batch may affect multiple customers
6. **Certification issues**: Wrong material grade may not be visually apparent

### Return Policy Framework

| Scenario | Returnable? | Resolution |
|---|---|---|
| Wrong item delivered | Yes | Pickup + redeliver correct item |
| Damaged in transit | Yes (with evidence) | Credit note or replacement |
| Defective/below spec | Yes (with test results) | Credit note or replacement; supplier claim |
| Customer ordered wrong item | Conditional (restocking fee) | Return if unopened/undamaged, 10-20% restocking |
| Excess quantity ordered | Conditional | Return if unopened, within 30 days |
| Custom/fabricated items | No | Not returnable unless defective |
| Materials already installed | No return | Claim for replacement cost + labor if defective |

### Claims Process: Step-by-Step

#### Phase 1: Report and Document (Day 0-1)

```
1. Customer reports issue via WhatsApp
2. AI creates ticket (Category: Order_Damaged_Items or Order_Quality_Issue)
3. AI requests:
   - Photos of damaged items (multiple angles)
   - Photo of packaging/wrapping condition
   - Delivery receipt / POD (was damage noted at delivery?)
   - Quantity affected
   - Description of issue
4. CS agent reviews submission for completeness
5. If incomplete: request additional evidence
6. If complete: advance to investigation
```

**Photo Requirements:**
- Overall view of damaged items
- Close-up of specific damage
- Packaging condition (was it damaged in transit or packed poorly?)
- Labels/markings visible
- Comparison with undamaged items (if partial damage)

#### Phase 2: Investigation (Day 1-3)

```
1. Operations reviews:
   - Loading records: was it loaded properly?
   - Driver notes: any incidents during transport?
   - Other deliveries from same batch: any similar issues?
   - Warehouse records: was it stored correctly?

2. Determination of fault:
   a) Shipping damage (HyperQuote's carrier) -> HyperQuote absorbs cost
   b) Supplier defect (manufacturing issue) -> Claim filed with supplier
   c) Customer handling (damage after delivery) -> Customer's responsibility
   d) Ambiguous -> Negotiate resolution

3. For supplier defect:
   - Procurement sends evidence to supplier
   - Supplier has 48-hour response window
   - If supplier accepts: supplier issues credit to HyperQuote
   - If supplier disputes: escalate to procurement manager
```

#### Phase 3: Resolution (Day 2-5)

```
Decision options:
A) Full credit note
   - Applied to customer's account
   - Can be used against future invoices

B) Partial credit note
   - For partial damage or shared fault
   - Documented with reasoning

C) Replacement shipment
   - Expedited delivery of replacement items
   - Original damaged goods picked up or written off

D) Repair/remediation
   - For minor issues (e.g., surface damage on non-structural items)
   - Discount applied instead of full replacement

E) Rejection
   - If evidence shows customer fault
   - Detailed explanation provided
   - Escalation path offered if customer disagrees
```

#### Phase 4: Financial Settlement (Day 3-7)

```
1. Finance creates credit note in system
2. Credit note sent to customer via WhatsApp (PDF)
3. Credit applied to customer account
4. If supplier at fault: debit note issued to supplier
5. If carrier at fault: carrier insurance claim filed
6. All financial documents linked to original ticket
```

#### Phase 5: Closure (Day 5-10)

```
1. CS confirms customer received resolution
2. CSAT survey sent
3. Ticket closed
4. If replacement shipped: new delivery tracked to completion
5. Post-mortem: if systemic issue, flag for operations review
```

### Claims Timelines

| Phase | Target | Maximum |
|---|---|---|
| Customer reports issue | Day 0 | Must report within 48 hours of delivery |
| Evidence collection complete | Day 1 | Day 3 |
| Investigation complete | Day 2 | Day 5 |
| Decision communicated to customer | Day 3 | Day 5 |
| Credit note issued | Day 5 | Day 7 |
| Replacement shipped | Day 3-5 | Day 7 |
| Supplier claim filed | Day 2 | Day 5 |
| Supplier responds | Day 4 | Day 7 |
| Ticket closed | Day 7 | Day 14 |

### Special Case: Materials Already Installed

When defective materials are discovered after installation:

1. **Documentation**: Customer provides photos of installed materials + defect evidence + test results if applicable
2. **Scope assessment**: What area/quantity is affected?
3. **Liability determination**: Was defect detectable at delivery? Was installation per manufacturer specs?
4. **Resolution options**:
   - Replacement material cost credit
   - Labor cost contribution (negotiated, typically 50-100% depending on fault)
   - Full replacement including removal + reinstallation (rare, only for clear manufacturer defect)
5. **Supplier involvement**: Critical -- manufacturer warranty terms govern post-installation claims
6. **Timeline**: These claims typically take 2-4 weeks due to complexity and supplier involvement

### RMA (Return Material Authorization) Process

```
1. Customer requests return via ticket
2. CS creates RMA request with:
   - Original order number
   - Items to return (SKU, quantity)
   - Reason for return
   - Photos/evidence
3. Operations reviews and approves/denies RMA
4. If approved: RMA number issued
5. Customer receives RMA number + return instructions
6. HyperQuote schedules pickup (for large/heavy items)
   OR customer arranges return shipping (for small items)
7. Items received at warehouse
8. Inspection:
   - Matches RMA request?
   - Condition assessment
   - Restockable or scrap?
9. Finance processes credit note based on inspection
10. Customer notified of credit amount
11. RMA closed
```

---

## APPENDIX: SUPABASE SCHEMA OUTLINE

### Core Support Tables

```sql
-- Enum types
CREATE TYPE ticket_status AS ENUM (
  'new', 'assigned', 'in_progress',
  'waiting_customer', 'waiting_internal', 'waiting_supplier',
  'escalated', 'resolved', 'closed', 'reopened'
);

CREATE TYPE ticket_priority AS ENUM ('critical', 'high', 'normal', 'low');
CREATE TYPE ticket_channel AS ENUM ('whatsapp', 'email', 'portal', 'phone', 'internal');
CREATE TYPE sender_type AS ENUM ('customer', 'supplier', 'agent', 'ai', 'system');

-- Main tickets table
CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number TEXT UNIQUE NOT NULL, -- Human-readable: TK-2026-00001
  type TEXT NOT NULL, -- 'customer', 'supplier'
  category TEXT NOT NULL, -- High-level: 'order', 'delivery', 'payment', etc.
  reason_tag TEXT NOT NULL, -- Specific: 'Order_Damaged_Items'
  priority ticket_priority NOT NULL DEFAULT 'normal',
  status ticket_status NOT NULL DEFAULT 'new',

  -- Parties
  customer_id UUID REFERENCES customers(id),
  supplier_id UUID REFERENCES suppliers(id),
  contact_id UUID REFERENCES contacts(id),
  company_id UUID REFERENCES companies(id),

  -- Assignment
  assigned_agent_id UUID REFERENCES users(id),
  assigned_team TEXT,

  -- Related entities
  order_id UUID REFERENCES orders(id),
  quote_id UUID REFERENCES quotes(id),
  invoice_id UUID REFERENCES invoices(id),

  -- Channel
  channel ticket_channel NOT NULL,
  whatsapp_phone TEXT,

  -- SLA tracking
  sla_first_response_deadline TIMESTAMPTZ,
  sla_resolution_deadline TIMESTAMPTZ,
  first_responded_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,

  -- AI fields
  ai_classified BOOLEAN DEFAULT false,
  ai_confidence FLOAT,
  ai_resolved BOOLEAN DEFAULT false,
  ai_summary TEXT,

  -- Metadata
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conversation messages
CREATE TABLE ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES tickets(id) NOT NULL,
  sender_type sender_type NOT NULL,
  sender_id UUID, -- user/contact ID
  content TEXT,
  media_urls TEXT[],
  is_internal_note BOOLEAN DEFAULT false,
  channel ticket_channel NOT NULL,
  whatsapp_message_id TEXT, -- For delivery tracking
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sub-tickets for cross-department workflows
CREATE TABLE sub_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_ticket_id UUID REFERENCES tickets(id) NOT NULL,
  department TEXT NOT NULL, -- 'operations', 'procurement', 'finance', 'dispatch', 'qa'
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'open',
  sla_deadline TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  result TEXT, -- Summary of outcome
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RMA / Claims
CREATE TABLE claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES tickets(id) NOT NULL,
  rma_number TEXT UNIQUE,
  claim_type TEXT NOT NULL, -- 'damaged', 'wrong_item', 'quality', 'shortage'
  order_id UUID REFERENCES orders(id),

  -- Items
  items JSONB NOT NULL, -- [{sku, description, qty_claimed, qty_approved, reason}]

  -- Evidence
  photo_urls TEXT[],
  documents JSONB, -- [{type: 'delivery_receipt', url: '...'}]

  -- Investigation
  fault_determination TEXT, -- 'shipping', 'supplier', 'customer', 'unknown'
  investigation_notes TEXT,

  -- Resolution
  resolution_type TEXT, -- 'credit_note', 'replacement', 'partial_credit', 'rejected'
  credit_note_id UUID REFERENCES credit_notes(id),
  replacement_order_id UUID REFERENCES orders(id),
  resolution_amount DECIMAL(12,2),

  -- Supplier claim
  supplier_claim_filed BOOLEAN DEFAULT false,
  supplier_claim_status TEXT,
  supplier_credit_amount DECIMAL(12,2),

  -- Lifecycle
  status TEXT NOT NULL DEFAULT 'reported',
  reported_at TIMESTAMPTZ DEFAULT NOW(),
  investigated_at TIMESTAMPTZ,
  decided_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ
);

-- Knowledge base articles (for RAG)
CREATE TABLE kb_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  audience TEXT NOT NULL, -- 'customer', 'supplier', 'internal'
  category TEXT NOT NULL,
  tags TEXT[],
  embedding VECTOR(1536), -- For RAG search
  published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CSAT responses
CREATE TABLE ticket_satisfaction (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES tickets(id) NOT NULL,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Key Indexes

```sql
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_priority ON tickets(priority);
CREATE INDEX idx_tickets_assigned ON tickets(assigned_agent_id);
CREATE INDEX idx_tickets_customer ON tickets(customer_id);
CREATE INDEX idx_tickets_supplier ON tickets(supplier_id);
CREATE INDEX idx_tickets_sla_deadline ON tickets(sla_resolution_deadline);
CREATE INDEX idx_ticket_messages_ticket ON ticket_messages(ticket_id);
CREATE INDEX idx_sub_tickets_parent ON sub_tickets(parent_ticket_id);
CREATE INDEX idx_claims_ticket ON claims(ticket_id);
```

### Realtime Subscriptions (for Agent Dashboard)

```sql
-- Agents subscribe to their queue
-- Supabase Realtime listens on tickets table for:
-- INSERT (new ticket in their team)
-- UPDATE (status change, reassignment, SLA breach)
-- ticket_messages INSERT (new message from customer)
```

---

## SOURCES

- [Help Desk Ticket Categories Best Practices (SentiSum)](https://www.sentisum.com/customer-service-analytics/help-desk-ticket-categories-best-practices)
- [B2B Customer Support Response Time Benchmarks (Thena)](https://www.thena.ai/post/b2b-customer-support-response-time-benchmarks)
- [Ticket Resolution Statistics: Industry Benchmarks 2025 (Converzation)](https://converzation.com/article/statistics/ticket-resolution-statistics/)
- [WhatsApp Ticketing System (InvGate)](https://blog.invgate.com/whatsapp-ticketing-system)
- [WhatsApp Business API 2026 (Convex Interactive)](https://convexinteractive.com/blog/whatsapp-business-api/)
- [WhatsApp Business API Guide 2026 (Trengo)](https://trengo.com/blog/whatsapp-business-api-guide)
- [AI Revolution in Customer Support: 2025 Statistics (LiveChatAI)](https://livechatai.com/blog/ai-revolution-in-customer-support-statistics)
- [State of AI Customer Support Automation 2026 (FastBots)](https://blog.fastbots.ai/the-state-of-ai-customer-support-automation-in-2026/)
- [AI Chatbot with Human Handoff Guide 2026 (Social Intents)](https://www.socialintents.com/blog/ai-chatbot-with-human-handoff/)
- [When to Hand Off to a Human (Replicant)](https://www.replicant.com/blog/when-to-hand-off-to-a-human-how-to-set-effective-ai-escalation-rules)
- [13 Customer Support KPIs B2B Businesses Need (Pylon)](https://www.usepylon.com/blog/13-customer-support-kpis-b2b-businesses-need-to-track)
- [Best B2B Customer Support Platforms 2025 (Pylon)](https://www.usepylon.com/blog/best-b2b-customer-support-platforms-2025)
- [B2B Companies Switching from Zendesk 2025 (Pylon)](https://www.usepylon.com/blog/b2b-companies-switching-zendesk-2025)
- [Ticket Escalation Process (Wrangle)](https://www.wrangle.io/post/ticket-escalation-process)
- [Escalation Management Best Practices (Zendesk)](https://www.zendesk.com/blog/escalation-management/)
- [Return Material Authorization RMA (Propel)](https://www.propelsoftware.com/glossary/return-material-authorization-rma)
- [WhatsApp Multi Agent Guide (respond.io)](https://respond.io/blog/whatsapp-multi-agent)
- [Customer Support Dashboard Examples (Pylon)](https://www.usepylon.com/blog/customer-support-dashboard-examples)
- [Freshdesk vs Zendesk Comparison 2025 (HelpDesk)](https://www.helpdesk.com/blog/freshdesk-vs-zendesk/)
- [6 Ticket Categories for Help Desk (Wrangle)](https://www.wrangle.io/post/6-ticket-categories-you-need-for-your-help-desk)
