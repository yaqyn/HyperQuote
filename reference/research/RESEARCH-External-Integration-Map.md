> ⚠️ **REFERENCE DOCUMENT — NOT THE SOURCE OF TRUTH**
> This file was written during the research phase and may contain outdated decisions, US-centric references, or superseded technical choices.
> **Always defer to `essential/RESEARCH.md` for current decisions.**
> Key changes since this file was written: TanStack Start (not Next.js), Capacitor (not Expo), React Aria (not shadcn), Egyptian law (not US FMCSA), EGP (not USD), dual auth pools, no online payments, no mobile wallets, spatial glass UI (not traditional dashboards).

# COMPLETE EXTERNAL INTEGRATION MAP
## HyperQuote B2B Building Materials Platform (2025-2026)

**Date:** 2026-03-28
**Scope:** Every external service connection for the HyperQuote platform
**Apps:** Website, Customer Portal (PWA), Supplier Portal (PWA), Internal Platform (unified), Driver App (Capacitor native), CEO App (PWA)

---

## TABLE OF CONTENTS

1. [Supabase](#1-supabase)
2. [Cloudflare](#2-cloudflare)
3. [Claude API (Anthropic)](#3-claude-api-anthropic)
4. [WhatsApp Business API](#4-whatsapp-business-api)
5. [Twilio](#5-twilio)
6. [Resend](#6-resend)
7. [Avalara (AvaTax)](#7-avalara-avatax)
8. [ETA / ZATCA (Egypt / Saudi Arabia)](#8-eta--zatca-egypt--saudi-arabia)
9. [QuickBooks Online](#9-quickbooks-online)
10. [MapLibre / MapTiler](#10-maplibre--maptiler)
11. [Sygic / HERE Maps](#11-sygic--here-maps)
12. [Samsara / Geotab](#12-samsara--geotab)
13. [Orderful / SPS Commerce](#13-orderful--sps-commerce)
14. [Plaid](#14-plaid)
15. [Dun & Bradstreet / Experian Business](#15-dun--bradstreet--experian-business)
16. [Transistor Software](#16-transistor-software)
17. [Google Cloud Vision / Claude Vision](#17-google-cloud-vision--claude-vision)
18. [PowerSync](#18-powersync)
19. [Integration Cost Summary](#19-integration-cost-summary)
20. [Integration Dependency Graph](#20-integration-dependency-graph)

---

## 1. SUPABASE

### What It Is
Backend-as-a-Service providing PostgreSQL database, authentication, realtime subscriptions, file storage, Edge Functions, and pgvector for AI embeddings. The operational system of record for HyperQuote.

### Services Used

| Service | Purpose | Used By |
|---------|---------|---------|
| **Auth** | Multi-role authentication (CEO, admin, employee, customer, supplier, driver). Custom Access Token Hook injects `tenant_id`, `user_type`, `roles[]` into every JWT. Phone OTP for signup. | All apps |
| **Database (PostgreSQL)** | 179 migrations. Orders, quotes, invoices, inventory, payments, customers, suppliers, products, deliveries, tickets, audit log. Multi-tenant with `tenant_id` column on all tables. | All apps (via Workers/Edge Functions) |
| **Row Level Security** | Enforces data isolation. Helper functions: `auth.user_org_id()`, `auth.user_role()`. CEO/Admin see all within org; customers see only their quotes/orders; suppliers see POs containing their products; drivers see assigned deliveries. | All apps |
| **Realtime** | Three channels: `postgres_changes` for persistent data (order status, delivery updates, quote notifications); `broadcast` for ephemeral high-frequency data (GPS pings from drivers); `presence` for online status (dispatch dashboard). Invalidates TanStack Query cache -- never writes directly. | Internal Platform (dispatch), Customer Portal (order tracking), Driver App (GPS broadcast) |
| **Storage** | Authenticated file storage. Supplier catalogs, exemption certificates, credit application documents, internal documents. Presigned URLs for upload/download. | Supplier Portal, Internal Platform (Finance, Procurement) |
| **Edge Functions** | Heavy business logic that exceeds Cloudflare Worker CPU limits: tax calculation (Avalara calls), AI orchestration (Claude API calls), PDF generation (pdf-lib), invoice generation, ticket creation, SLA calculation, credit scoring. 150-second timeout, no CPU limit. | All apps (server-side) |
| **pgvector** | HNSW index for AI/RAG similarity search. Knowledge base articles as embeddings. Supplier contracts, pricing agreements, policies, SOPs for CEO RAG AI. RLS-aware -- even AI queries respect data isolation. | Website (chatbot), Customer Portal (AI chat), CEO App (RAG AI), Internal Platform (AI assistant) |
| **pg_cron** | Scheduled jobs: VACUUM/ANALYZE, data retention (2yr detailed, 7yr summary), AR aging materialized view refresh, dunning reminders, credit review reminders. | Internal Platform (Finance) |
| **supa_audit** | Change tracking extension for audit trail. SOX 7-year retention. WORM for immutability. Every price/status/approval/payment change logged. | All apps |

### Connection Pattern from Cloudflare Workers

```
Client Browser/App
  → Cloudflare Worker (auth verification, rate limiting, routing)
    → Supabase via Hyperdrive (connection pooling, eliminates cold-connection latency)
      OR
    → Supabase Edge Function (for complex operations)
      → Supabase Database (direct, no pooling needed within Edge Functions)
```

**JWT verification in Workers:** `jose` library against Supabase JWKS endpoint. Optional KV-based JWKS caching for performance.

### @supabase/ssr Package for TanStack Start

- Package: `@supabase/ssr` v0.9.0
- Pattern: `beforeLoad` in TanStack Router for zero-flash SSR auth
- Server-side: creates Supabase client with cookie-based session
- Client-side: hydrates from server session, no flash of unauthenticated content
- **Known issue (#37592):** `dynamic require of "stream"` reported when running on Cloudflare Workers. Must test early in Phase 1 and potentially use workaround (polyfill or restructure imports).

### Estimated Cost

| Plan | Monthly | Included |
|------|---------|----------|
| Pro plan (launch) | $25/month | 8GB DB, 250MB storage, 500K Edge Function invocations, 500MB bandwidth |
| Pro + overages (growth, $5-20M revenue) | $100-300/month | 50-200GB DB at $0.125/GB, increased Edge Function invocations |
| Team/Enterprise (scale, $20M+) | $500-2,000/month | Read replicas, dedicated instances, SOC2, SLA |

### Known Issues

- Realtime Postgres Changes processes on single thread -- bottleneck at 500+ drivers (24,000 updates/min). Mitigation: use Broadcast (ephemeral) for GPS, batch DB writes to every 30s.
- Connection pool limits: Micro 60, Small 90, Medium 120, Large 160. Hyperdrive pooling (10 connections serve ~1,000 users).
- Point-in-time recovery: Pro plan covers 7 days. Custom pg_dump to R2 for longer retention.

---

## 2. CLOUDFLARE

### What It Is
Edge computing platform. All web apps deploy as Cloudflare Workers. File storage via R2. Database connection pooling via Hyperdrive. AI proxy via AI Gateway. Async processing via Queues. Scheduled jobs via Cron Triggers. Real-time coordination via Durable Objects.

### Services Used

| Service | Purpose | Used By |
|---------|---------|---------|
| **Workers (5 apps)** | Runtime for all web applications. TanStack Start apps deploy as Workers. `main: "@tanstack/react-start/server-entry"` in wrangler.jsonc. 5-minute CPU time limit (paid plan), 128MB memory. | Website, Customer Portal, Supplier Portal, Internal Platform, CEO App |
| **R2** | Public/shared file storage (zero egress fees). Delivery photos, invoices, BOLs, signatures, supplier catalogs, POD documents. Tenant-prefixed paths: `/{tenant_id}/invoices/{year}/{month}/`. Presigned URLs for direct upload/download from mobile. 11 nines durability. | All apps |
| **Hyperdrive** | Connection pooling from Workers to Supabase PostgreSQL. Eliminates cold-connection latency. 10 connections serve ~1,000 users. | All Workers |
| **AI Gateway** | Proxy for Claude API calls. Provides: response caching (identical queries), rate limiting, cost analytics/tracking, fallback routing (Sonnet -> Haiku on overload), logging. | All apps with AI features |
| **Queues** | Async processing with guaranteed delivery. Use cases: QuickBooks sync (retry on failure), WhatsApp/SMS/email notifications, supplier catalog parsing jobs, bulk data imports, PDF generation. Dead letter queue for failed items. | Internal Platform, notification system |
| **Cron Triggers** | Scheduled jobs (up to 250). Use cases: nightly QuickBooks reconciliation, daily bank feed pull (Plaid), AR aging materialized view refresh, exchange rate updates, credit review reminders, GPS data partition management. | Internal Platform (Finance, Operations) |
| **Durable Objects** | Real-time coordination with persistent state. Use cases: dispatch coordination (32K WebSocket connections per DO), collaborative quote editing, real-time inventory reservation (prevent overselling during concurrent orders). | Internal Platform (Dispatch), Driver App (GPS tracking) |
| **KV** | Key-value cache. Use cases: product catalog cache, tax rate cache, user permission cache, JWKS cache for JWT verification. Ephemeral by nature -- rebuilt from DB on cache miss. | All Workers |
| **Workflows** | Multi-step durable execution. Use cases: quote-to-order conversion (multiple DB writes + supplier PO generation + notifications), invoice generation pipeline (calculate tax + generate PDF + submit to ETA + send to customer). | Internal Platform |
| **Secrets** | Encrypted storage for API keys: Supabase service key, Claude API key, Twilio credentials, Avalara credentials, QuickBooks OAuth tokens, Plaid credentials, D&B API key. | All Workers |

### How All Services Connect

```
                                  ┌─────────────────────────┐
                                  │     CLOUDFLARE EDGE      │
                                  │                         │
  Browser/App ──── DNS ─────────► │  Worker (TanStack Start) │
                                  │    │                     │
                                  │    ├── Hyperdrive ──────────► Supabase PostgreSQL
                                  │    ├── R2 ───────────────────► File Storage
                                  │    ├── KV ───────────────────► Cache
                                  │    ├── AI Gateway ───────────► Claude API (Anthropic)
                                  │    ├── Queue.send() ─────────► Queue Consumer Worker
                                  │    ├── Durable Object ───────► WebSocket Hub
                                  │    └── fetch() ──────────────► Supabase Edge Functions
                                  │                         │
                                  │  Cron Trigger ──────────► Scheduled Worker
                                  │  Queue Consumer ────────► Process + call external APIs
                                  └─────────────────────────┘
```

### Wrangler Configuration Pattern

```jsonc
// wrangler.jsonc (per app)
{
  "main": "@tanstack/react-start/server-entry",
  "compatibility_date": "2025-03-01",
  "bindings": {
    "HYPERDRIVE": { "type": "hyperdrive", "id": "..." },
    "R2_BUCKET": { "type": "r2_bucket", "bucket_name": "hyperquote-files" },
    "AI_GATEWAY": { "type": "ai", "binding": "AI" },
    "NOTIFICATION_QUEUE": { "type": "queue", "queue_name": "notifications" },
    "SYNC_QUEUE": { "type": "queue", "queue_name": "qbo-sync" }
  }
}
```

### Estimated Cost

| Service | Monthly (Launch) | Monthly (Growth) | Monthly (Scale) |
|---------|-----------------|-----------------|----------------|
| Workers (Paid plan) | $5 | $5 | $5 |
| Workers requests (10M included) | $0 | $5-20 | $50-200 |
| R2 storage (first 10GB free) | $0 | $1-5 | $15-150 |
| R2 operations | $0-5 | $5-20 | $20-100 |
| Hyperdrive | $0 (included) | $0 | $0 |
| AI Gateway | $0 (included) | $0 | $0 |
| Queues | $0-5 | $5-20 | $20-50 |
| KV | $0-5 | $5 | $5-20 |
| Durable Objects | $0-5 | $5-20 | $20-100 |
| **Total** | **$10-25** | **$30-95** | **$135-625** |

### Known Issues

- 128MB memory limit per Worker -- must stream data, never load large datasets into memory
- `cloudflare:workers` import only usable in server functions, NOT middleware (#6185)
- Durable Objects: 32K connections per DO instance. For 10K+ concurrent dispatch users, shard by region/warehouse.

---

## 3. CLAUDE API (ANTHROPIC)

### What It Is
Large language model API for AI features across the entire platform. Accessed exclusively through Cloudflare AI Gateway for caching, rate limiting, and cost analytics.

### Model Routing Strategy

| Model | Use Cases | Cost/Query | When |
|-------|-----------|-----------|------|
| **Claude Haiku 3.5** | Intent classification, simple lookups, routing queries to Sonnet/Opus, FAQ matching, notification text generation | ~$0.001 | Every AI query first hits Haiku for routing |
| **Claude Sonnet 4** | Customer chatbot (production), internal AI assistant, text-to-SQL for analytics, order drafting from NL, supplier catalog parsing, quote auto-building, AI triage for support tickets | ~$0.008 | 80% of queries that pass Haiku routing |
| **Claude Opus 4** | Complex executive analytics, multi-step reasoning, CEO RAG with citations, contract analysis, complex estimation problems | ~$0.05 | 2% of queries -- complex/high-value only |

### AI Features by App

| App | Feature | Model | Pattern |
|-----|---------|-------|---------|
| **Website** | Lead capture chatbot, guided product discovery, FAQ RAG | Haiku (routing) + Sonnet | RAG + structured flows. pgvector similarity search on knowledge base. |
| **Customer Portal** | NL material list building ("I need 400 units of wood"), project estimation ("3-floor apartment, 200sqm/floor"), reorder suggestions, quote request drafting | Sonnet | Tool use (draft-review-confirm). Customer edits before submitting. |
| **Supplier Portal** | Catalog parsing (PDF/Excel/CSV to structured data), 3-way matching assistance, reorder suggestions | Sonnet | $0.45 per 200-page catalog. 85-95% extraction accuracy. Side-by-side review UI. |
| **Internal Platform (Sales)** | Auto-parse customer RFQs, recommend suppliers per line item, predict prices from history, auto-calculate margins, NL order entry | Sonnet | Tools: DB lookups, price history, supplier scorecards |
| **Internal Platform (CS)** | AI triage (intent classification + entity extraction), auto-response generation (55-75% of incoming messages), sentiment detection, conversation summary for handoff | Haiku (classify) + Sonnet (respond) | WhatsApp message -> Haiku classifies intent -> Sonnet generates response or routes to human |
| **Internal Platform (Finance)** | Anomaly detection, collection scoring, NL report generation | Sonnet | Read-only DB access via parameterized queries |
| **Internal Platform (Warehouse)** | Voice-driven picking (future), anomaly detection on inventory counts | Sonnet | Emerging feature |
| **Internal Platform (Dispatch)** | AI site briefings for drivers, dynamic re-routing suggestions | Sonnet | Context injection from delivery history |
| **CEO App** | Analytics AI (text-to-data via pre-computed metrics library), RAG AI (document intelligence on contracts/agreements) | Sonnet (analytics) + Opus (complex reasoning) | Pre-computed metrics library (50-100 parameterized queries). Falls back to text-to-SQL against read replica. Hybrid search (vector + BM25). Citations mandatory. |
| **Data Import** | Column mapping assistance ("This looks like 'Customer Name' maps to 'company_name'") | Haiku | Simple classification task |

### Connection Architecture

```
Client (any app)
  → TanStack Start server function (auth + rate limit)
    → Cloudflare AI Gateway (caching, analytics, rate limiting)
      → Anthropic Claude API
        ← Streaming response (SSE via @tanstack/ai)
      ← Cache hit (for identical queries)
```

**Client-side SDK:** `@tanstack/ai-react` v0.7.5 -- `useChat()` hook with SSE streaming and AbortController cancellation.
**Server-side SDK:** `@cloudflare/tanstack-ai` v0.1.6 -- first-party Workers AI + AI Gateway support.
**Embeddings:** Workers AI bge-m3 (multilingual Arabic+English, already implemented). Stored in Supabase pgvector with HNSW index.

### Cost Management

```
Cost Mitigation Stack:
1. Haiku routing: 80% cheaper than sending everything to Sonnet
2. Prompt caching: 90% cost reduction for repeated schemas (system prompts, table schemas)
3. AI Gateway caching: identical queries return cached response ($0)
4. Pre-computed metrics library: avoid text-to-SQL for top 50-100 common CEO questions
5. Rate limiting: 50 AI queries/day per user
6. Response streaming: reduces perceived latency, allows early termination

Estimated Monthly Cost by Scale:
  50 users (launch):     $100-240/month
  500 users (growth):    $1,600/month (Haiku $300 + Sonnet $800 + Opus $500)
  5,000 users (scale):   $16,000/month
```

### Safety Patterns

- AI never constructs raw SQL -- parameterized queries only
- Read-only database connection for all AI queries
- Draft-review-confirm pattern for all mutations (AI drafts, human approves)
- Capability tiers per user role (customers get fewer tools than internal users)
- Full audit log of every AI query and action in `audit_log` table
- Confidence scoring: >80% auto-respond, 50-80% respond with caveat, <50% route to human

### Known Issues

- AI Gateway is currently 0.x -- wrap behind abstraction layer
- `@tanstack/ai` and `@tanstack/ai-react` are both 0.x pre-release
- Opus cost can spike on complex multi-turn conversations -- enforce max turns
- Arabic language quality varies by model -- Sonnet 4 has best Arabic support

---

## 4. WHATSAPP BUSINESS API

### What It Is
Primary customer communication channel for HyperQuote. Egypt/Middle East markets live on WhatsApp for business communication. Used for support, delivery notifications, order updates, and onboarding sequences.

### Provider Decision: Meta Cloud API Direct

**NOT Twilio.** Since October 2025, the On-Premises API was retired. All integrations use Meta's Cloud API directly. Twilio is used separately for SMS only (see section 5).

**Rationale:** Meta Cloud API is the only option since Oct 2025. Direct integration avoids Twilio's per-message markup. For WhatsApp specifically, Twilio adds no value -- it is just a pass-through to Meta's API.

### Pricing Model (Since July 2025)

- **Template messages:** Charged per delivered template message (no more flat 24-hour conversation fees)
- **Service messages:** Free within 24-hour window after customer's message
- **Shared Account Model:** Each business owns its own WABA (WhatsApp Business Account). Providers cannot manage WABAs on behalf of clients.

### Template Messages Required

| Template ID | Use Case | Content | Buttons |
|-------------|----------|---------|---------|
| `quote_ready` | Quote delivered | "Hi {{name}}, your quote {{ref}} for {{total}} is ready. View: {{link}}" | [View Quote] [Call Rep] [Reply] |
| `order_confirmed` | Order confirmation | "Order {{ref}} confirmed! Expected delivery: {{date}}. Track: {{link}}" | [Track Order] |
| `delivery_scheduled` | Delivery scheduling | "Your delivery for {{date}} between {{start}}-{{end}}. Driver: {{driver}}" | [Confirm] [Reschedule] [Call Driver] |
| `delivery_eta_30min` | Driver approaching | "Your driver is 30 minutes away! Track live: {{link}}" | [Track Live] |
| `delivery_completed` | Delivery done | "Delivered! {{count}} items. View POD: {{link}}" | [View POD] |
| `invoice_sent` | Invoice delivery | "Invoice {{ref}} for {{amount}} is ready. Due: {{date}}. View: {{link}}" | [View Invoice] [Pay Now Instructions] [Dispute] |
| `payment_reminder` | Payment reminder | "Friendly reminder: Invoice {{ref}} for {{amount}} is due in {{days}} days." | [View Invoice] |
| `payment_overdue` | Overdue notice | "Invoice {{ref}} for {{amount}} is {{days}} days overdue." | [View Invoice] |
| `payment_received` | Payment confirmation | "Payment of {{amount}} received. Thank you! Balance: {{balance}}" | — |
| `support_update` | Ticket update | "Update on your inquiry {{ref}}: {{status}}. Reply for more info." | — |

**Template approval:** Submit to Meta for review (24-48 hours). English + Arabic templates required.

### Webhook Architecture

```
Customer sends WhatsApp message
  → Meta Cloud API
    → Webhook POST to Cloudflare Worker (message receiver)
      → Extract: sender phone, message content, media, timestamp
      → Lookup phone in Supabase contacts table
      → Check for open tickets from this customer
        → If existing: append to ticket conversation thread
        → If none: create new ticket
      → AI triage (Haiku classifies intent)
        → Auto-respond (55-75% of messages): status lookups, FAQ, simple queries
        → Route to human agent: complex issues, disputes, angry customers
      → Store in Supabase tickets table with full conversation history
```

### Message-to-Ticket Conversion

1. **Customer identification:** Phone number lookup in `contacts` table. Match to company account.
2. **Conversation threading:** Check for open tickets. If multiple, AI asks disambiguation question.
3. **Order-referenced routing:** When customer mentions order number, auto-link to that order's ticket.
4. **AI disambiguation:** "I see you have 2 open issues. Are you asking about: (1) Delivery for PO-4521 or (2) Invoice #890?"
5. **Structured menus:** WhatsApp interactive messages (buttons/lists) for topic selection.

### Which Apps Use It

| App | How | Direction |
|-----|-----|-----------|
| **Customer Portal** | Support (primary channel), order updates, delivery tracking, onboarding sequence | Bidirectional |
| **Supplier Portal** | PO notifications, inquiry responses, communication | Outbound + inbound |
| **Internal Platform (CS)** | Unified agent dashboard -- agents reply through internal UI, messages sent via WhatsApp API | Agent -> Customer |
| **Internal Platform (Sales)** | Quote ready notifications, follow-up sequences | Outbound |
| **Internal Platform (Dispatch)** | Delivery notifications to customers | Outbound |

### Where Code Lives

- **Webhook receiver:** Cloudflare Worker (dedicated worker or route in main app)
- **Message sending:** Cloudflare Queue -> Worker -> Meta Cloud API (ensures retry on failure)
- **AI triage:** Supabase Edge Function (Claude API calls)
- **Ticket storage:** Supabase Database
- **Conversation history:** Supabase Database (`ticket_messages` table)

### Estimated Cost

| Scale | Template Messages/Month | Service Replies | Total |
|-------|------------------------|-----------------|-------|
| Launch (100 customers) | 2,000 | Free (within 24h) | ~$20-50/month |
| Growth (1,000 customers) | 20,000 | Free | ~$200-500/month |
| Scale (5,000 customers) | 100,000 | Free | ~$1,000-2,500/month |

(Template message pricing varies by country. Egypt: ~$0.01-0.03 per message. UAE/Saudi: ~$0.02-0.05.)

### Known Issues

- WhatsApp consent required before first message (legal doc exists: `brand/legal/whatsapp-consent.md`)
- Template approval can take 24-48 hours -- plan ahead for new templates
- 24-hour service window: if customer hasn't messaged in 24h, must use template (costs money)
- Media limitations: max 16MB for documents, 5MB for images
- Rate limits: 80 messages/second per phone number (new accounts start at 1K/day business-initiated, scales to 100K/day)

---

## 5. TWILIO

### What It Is
Communications API used for SMS notifications and phone number verification (OTP). NOT used for WhatsApp (Meta Cloud API direct is used instead).

### Use Cases

| Feature | Channel | Purpose |
|---------|---------|---------|
| **Delivery day-of notifications** | SMS | "Your delivery arrives today between 9-11 AM. Driver: Ahmed, Truck #42" |
| **Delivery ETA updates** | SMS | "Driver is 30 minutes away from your site" |
| **Payment reminders** | SMS | "Reminder: Invoice #1234 for $50,000 is due in 3 days" |
| **Phone number verification** | SMS OTP | 6-digit code for customer/supplier signup (Stage 1 progressive signup) |
| **Fallback notifications** | SMS | When WhatsApp delivery fails, SMS is the fallback channel |

### Connection Pattern

```
Event trigger (Supabase DB change or Edge Function)
  → Cloudflare Queue (notification queue)
    → Worker (queue consumer)
      → Twilio REST API (POST /Messages)
        → Customer's phone

For OTP:
TanStack Start server function
  → Twilio Verify API (POST /Services/{sid}/Verifications)
    → Customer receives SMS
  → Twilio Verify API (POST /Services/{sid}/VerificationCheck)
    → Verify code
```

### Integration with TanStack Start Server Functions

```typescript
// Server function for OTP
const sendOTP = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ phone: z.string() }))
  .handler(async ({ data }) => {
    const twilio = new Twilio(env.TWILIO_SID, env.TWILIO_TOKEN);
    await twilio.verify.v2
      .services(env.TWILIO_VERIFY_SID)
      .verifications.create({ to: data.phone, channel: 'sms' });
  });
```

### Where Code Lives

- **OTP send/verify:** TanStack Start server functions (in each app that needs signup)
- **Notification sending:** Cloudflare Worker (queue consumer)
- **Notification triggering:** Supabase triggers + Cloudflare Queue

### Estimated Cost

| Item | Unit Cost | Monthly (Launch) | Monthly (Growth) |
|------|----------|-----------------|-----------------|
| SMS (US) | $0.0079/msg | ~$20 | ~$80-150 |
| SMS (Egypt) | ~$0.05/msg | ~$50 | ~$200-400 |
| SMS (UAE/Saudi) | ~$0.03/msg | ~$30 | ~$100-300 |
| Verify (OTP) | $0.05/verification | ~$25 | ~$100-250 |
| Phone number | $1-2/month | $2 | $2-10 |
| **Total** | — | **$80-150** | **$200-600** |

### Known Issues

- Twilio Verify has 5-minute expiry on OTP codes by default (configurable)
- SMS delivery rates vary by country -- Egypt SMS can have delays
- Must register sender ID in some countries (Saudi requires pre-registration)
- For cost optimization, always try WhatsApp first, fall back to SMS

---

## 6. RESEND

### What It Is
Transactional email service with React Email template support. Used for all platform email communications.

### Use Cases

| Email Type | Trigger | Template |
|------------|---------|----------|
| **Order confirmation** | Order created | Order details, delivery timeline, tracking link |
| **Quote ready** | Quote sent to customer | Quote summary, line items, validity period, CTA button |
| **Invoice sent** | Invoice generated (post-delivery) | Invoice PDF attached, amount, due date, payment instructions |
| **Payment received** | Payment recorded | Amount, applied invoices, remaining balance |
| **Payment reminder** | Cron (dunning schedule) | Amount due, invoice reference, days until/past due |
| **Delivery notification** | Delivery status change | Status, ETA, driver info, tracking link |
| **Onboarding sequence** | Signup + timed triggers | Welcome, video walkthrough (Hour 1), popular products (Day 3) |
| **Credit application status** | Credit decision made | Approved/conditional/declined, terms if approved |
| **Support ticket updates** | Ticket status change | Update summary, link to ticket |
| **Password reset** | User requests | Reset link (Supabase Auth handles this natively) |
| **Trade reference request** | Credit application | Web form link for trade references to fill out |

### Connection Pattern

**From Cloudflare Workers (primary):**
```
Event trigger (DB change or scheduled)
  → Cloudflare Queue (email queue)
    → Worker (queue consumer)
      → Resend REST API (POST /emails)
        → Recipient inbox
```

**From Supabase Edge Functions (alternative for complex emails):**
```
Edge Function (e.g., invoice generation)
  → Generate PDF (pdf-lib)
  → Upload PDF to R2
  → Call Resend API with PDF attachment URL
```

### React Email Templates

Templates built with React Email (`@react-email/components`), rendered to HTML on the server. Shared data layer: same `prepareInvoiceData()` feeds both PDF and email templates.

- Bilingual support (English + Arabic)
- RTL layout for Arabic emails
- Company branding from `brand.config.json` (white-label)
- Responsive for mobile email clients

### Email Domain Setup

- DKIM + SPF configuration required during tenant onboarding
- Custom sending domain per tenant (e.g., `notifications@acme-materials.com`)
- Resend handles domain verification

### Estimated Cost

| Plan | Monthly | Included |
|------|---------|----------|
| Pro (launch) | $20/month | 50,000 emails/month |
| Business (growth) | $90/month | 250,000 emails/month |
| Scale | Custom | Volume pricing |

### Known Issues

- Resend has no built-in email tracking dashboard in the free tier -- use Pro for analytics
- React Email templates must be pre-compiled for Edge Functions (no JSX transform at runtime)
- Attachment size limit: 40MB per email
- Rate limit: 100 emails/second on Pro plan

---

## 7. AVALARA (AVATAX)

### What It Is
Tax calculation API for US sales tax. Handles destination-based sourcing (tax rate determined by delivery address), 13,000+ US tax jurisdictions, contractor exemption certificates, and tax filing/remittance.

### Why Required

Building materials sales tax is destination-based in most US states. The tax rate is determined by where materials are DELIVERED. A single customer ordering to multiple job sites may have different tax rates per delivery. 13,000+ tax jurisdictions make manual management impossible.

### API Integration Pattern

```
Invoice/Quote Creation in HyperQuote
  → Supabase Edge Function: calculate-tax
    → POST https://rest.avatax.com/api/v2/transactions/create
      Auth: Basic Auth (account_id:license_key)
      Body: {
        type: "SalesOrder" (quote estimate) or "SalesInvoice" (committed),
        lines: [{ itemCode, quantity, amount, taxCode, addresses: { shipFrom, shipTo } }],
        customerCode: "CUST-123",
        exemptionNo: "EX-456" (if applicable)
      }
    ← Response: { totalTax, lines: [{ tax, jurisdictions: [...] }] }
```

### When Called

| Event | Transaction Type | Purpose |
|-------|-----------------|---------|
| Quote creation | `SalesOrder` (uncommitted) | Estimate tax for customer |
| Invoice creation | `SalesInvoice` (committed) | Final tax calculation, recorded in Avalara |
| Credit note | `ReturnInvoice` | Reverse tax on returns |
| Void invoice | `POST /transactions/{id}/void` | Cancel tax record |

### Tax Exemption Certificate Management

```
Exemption Certificate Workflow:
1. Customer uploads exemption certificate in portal or provides to sales rep
2. Certificate stored in Supabase Storage (linked to customer account)
3. Certificate data synced to Avalara CertCapture
4. Validity dates tracked -- auto-flag expired certificates
5. On invoice: pass exemptionNo to Avalara API -- tax calculated as $0 for exempt items
6. Certificates retained 4-7 years (varies by state)
```

**Contractor-specific complexity:** In some states contractors pay sales tax on materials (they are the "consumer"); in others, contractors buy tax-free with resale certificate. Avalara handles this per-jurisdiction.

### Delivery Charges and Tax

In most states, if delivery is part of the sale of taxable goods, the delivery charge is ALSO taxable. If delivery is separately stated on the invoice and is optional, some states exempt it. Avalara handles this automatically. Best practice: always separately state delivery charges on invoices.

### Where Code Lives

- **Edge Function:** `calculate-tax` -- called from quote builder (estimate) and invoice generator (commit)
- **Cache:** Product tax codes and customer exemption status cached in Supabase
- **Fallback:** Cached tax rates table if Avalara API times out (last 24h rates)

### Which Apps Use It

- **Internal Platform (Sales):** Quote builder calls tax estimate
- **Internal Platform (Finance):** Invoice generator commits tax calculation
- **Customer Portal:** Quote display shows tax breakdown

### Estimated Cost

| Item | Cost |
|------|------|
| AvaTax Basic | ~$0.04/transaction |
| AvaTax volume plan | ~$0.01/transaction |
| Annual (10,000 transactions) | ~$400/year |
| CertCapture | Additional (contact sales) |
| Avalara Returns (filing) | ~$200-500/month |

### Known Issues

- API latency: 200-500ms per call. Cache aggressively for quote builder (users editing quantities shouldn't wait for Avalara on every change).
- Product tax codes: every product must be mapped to an Avalara tax code. Building materials have specific codes.
- Rate limits: 150 requests/second (more than sufficient).

---

## 8. ETA / ZATCA (EGYPT / SAUDI ARABIA)

### What It Is
Government e-invoicing compliance systems. **ETA** (Egyptian Tax Authority) for Egypt operations. **ZATCA** (Zakat, Tax and Customs Authority) for Saudi Arabia operations. Both are mandatory -- not optional features.

### ETA (Egypt) -- E-Invoicing

**Legal basis:** Egyptian Tax Procedure Law. Mandatory for all B2B transactions.

**Data submitted per invoice:**

| Field | Description |
|-------|-------------|
| Invoice number | Unique identifier from HyperQuote |
| Invoice date | Issuance date |
| Seller Tax ID | HyperQuote tenant's TIN |
| Buyer Tax ID | Customer's TIN |
| Item descriptions | Building materials/services |
| Quantities | Per line item |
| Unit prices | Per line item |
| Tax amounts | VAT per line item |
| Tax subtypes | ETA classification codes |
| Total amounts | Including taxes |
| Discount amounts | If applicable |

**Integration pattern:**
```
Invoice generated in HyperQuote
  → Supabase Edge Function: submit-eta-invoice
    → Format invoice data per ETA XML schema
    → POST to ETA API (signed with digital certificate)
    ← Receive: ETA reference number, QR code data
    → Store ETA reference on invoice record
    → Include ETA QR code on PDF invoice
```

**Timing:** Invoices submitted within legally required timeframe after issuance. HyperQuote handles submission automatically.

### ZATCA (Saudi Arabia) -- Phase 2 E-Invoicing

**Mandatory for:** Businesses with SAR 7M+ revenue (since January 2025).

**Phase 2 (Integration Phase) requirements:**

| Requirement | Detail |
|-------------|--------|
| Format | XML/PDF-A3 format |
| QR code | Must include: seller name, VAT number, timestamp, total, VAT amount |
| Reporting | Invoice reported to ZATCA within 24 hours |
| Clearance | B2B invoices require real-time validation (clearance) from ZATCA |
| Signing | Invoices must be digitally signed |

**Integration pattern:**
```
Invoice generated in HyperQuote
  → Supabase Edge Function: submit-zatca-invoice
    → Generate XML per ZATCA schema (UBL 2.1 based)
    → Generate QR code with required fields (TLV-encoded)
    → Digitally sign invoice (X.509 certificate from ZATCA)
    → POST to ZATCA Clearance API (for B2B)
    ← Receive: clearance status, ZATCA stamp
    → Store ZATCA reference on invoice record
    → Embed QR code in PDF invoice
```

### Where Code Lives

- **Edge Functions:** `submit-eta-invoice`, `submit-zatca-invoice`
- **Invoice generation pipeline:** Invoice created -> tax calculated (Avalara or VAT) -> PDF generated (pdf-lib) -> e-invoice submitted (ETA/ZATCA) -> QR code embedded -> PDF finalized -> stored in R2 -> sent to customer (email + WhatsApp)

### Which Apps Use It

- **Internal Platform (Finance):** Invoice generation triggers e-invoice submission
- **Customer Portal:** Invoice display shows ETA/ZATCA QR code and reference
- **Supplier Portal:** For supplier invoices received (matching/validation)

### Estimated Cost

| Item | Cost |
|------|------|
| ETA digital certificate | Varies (government fee) |
| ZATCA certificate | SAR 500-2,000 (one-time) |
| Integration development | Significant -- complex XML schemas, certificate management |
| Ongoing | $0 (government APIs are free to use) |

### Known Issues

- ZATCA API can have downtime -- must queue and retry failed submissions
- Certificate renewal: digital certificates expire, must automate renewal
- Schema changes: government may update XML schema -- monitor for breaking changes
- B2B clearance (ZATCA) adds latency to invoice generation -- invoice not final until ZATCA clears it
- Egypt ETA: API documentation quality varies, community support limited

---

## 9. QUICKBOOKS ONLINE

### What It Is
External accounting software serving as the Financial System of Record. HyperQuote is the Operational System of Record. Clear boundary: HyperQuote owns AR/AP sub-ledgers and operational transactions; QuickBooks owns the general ledger and financial statements.

### Sync Architecture

```
HYPERQUOTE (Operational)              QUICKBOOKS ONLINE (Financial)

Invoices created      ──────────>     Revenue journal entries
Payments recorded     ──────────>     Cash receipt entries
Credit memos          ──────────>     Revenue adjustments
Supplier invoices     ──────────>     AP entries (Bills)
Supplier payments     ──────────>     Cash disbursements (Bill Payments)
Inventory movements   ──────────>     COGS and inventory entries
Tax collected         ──────────>     Tax liability entries
Journal entries       ──────────>     FX gain/loss, adjustments

Bank transactions     <──────────     Bank feed data (for reconciliation display)
GL account balances   <──────────     Dashboard display
Financial statements  <──────────     Reporting
```

### API Integration

```
Integration Type: OAuth 2.0 REST API
Auth: OAuth 2.0 (token refresh every 60 minutes)
Rate Limit: 500 requests/minute

Sync Flow:
  Event trigger (DB change)
    → Cloudflare Queue (qbo-sync queue)
      → Worker (queue consumer)
        → QBO REST API
          POST /v3/company/{id}/invoice (create invoice)
          POST /v3/company/{id}/payment (record payment)
          POST /v3/company/{id}/bill (create supplier bill)
          etc.
```

### Sync Frequency

| Direction | Type | Frequency |
|-----------|------|-----------|
| HyperQuote → QBO | Invoice created | Real-time (event-driven via Queue) |
| HyperQuote → QBO | Payment recorded | Real-time (event-driven via Queue) |
| HyperQuote → QBO | Credit memo issued | Real-time (event-driven via Queue) |
| HyperQuote → QBO | Supplier invoices (approved) | Batch (every 15-60 minutes) |
| HyperQuote → QBO | Supplier payments | Batch (every 15-60 minutes) |
| HyperQuote → QBO | Inventory adjustments | Batch (as journal entries) |
| QBO → HyperQuote | Bank transactions | Daily (Cron Trigger) |
| QBO → HyperQuote | GL balances | Daily (Cron Trigger, for dashboards) |

### Critical Design Rules

1. HyperQuote is system of record for AR, AP, and inventory transactions
2. QuickBooks is system of record for GL and financial statements
3. All sync is one-directional by transaction type (no bi-directional edits on same entity)
4. Every sync has an idempotency key to prevent duplicate entries
5. Failed syncs go to retry queue with alerting
6. Never block a business operation because sync failed
7. Reconciliation job runs nightly (compare AR/AP balances between systems)
8. Dashboard: "QBO Sync Status" showing last sync, pending items, errors

### Where Code Lives

- **Queue consumer Worker:** Handles all sync to QBO
- **Cron Trigger Worker:** Pulls bank transactions and GL balances from QBO
- **Supabase tables:** `qbo_sync_log` (tracks sync status per entity), `qbo_tokens` (OAuth tokens)
- **Internal Platform (Finance):** Sync status dashboard

### Which Apps Use It

- **Internal Platform (Finance):** Primary consumer -- sync dashboard, reconciliation reports
- **CEO App:** GL balances displayed on financial dashboards

### Estimated Cost

| Item | Cost |
|------|------|
| QuickBooks Online Plus | $90/month |
| QuickBooks Online Advanced | $200/month |
| API calls | Included (no per-call charge) |
| Integration development | $50K-100K (estimated) |
| Annual maintenance | $20K-40K/year |

### Known Issues

- OAuth token refresh every 60 minutes -- must handle in Worker
- QBO has 500 req/min rate limit -- batch operations during off-peak
- QBO entity limits: invoices, customers, etc. have character/field limits that may not match HyperQuote's data model
- Two-way sync NOT recommended: leads to data conflicts. Keep it one-directional by entity type.
- For enterprise scale ($100M+), migrate to NetSuite SuiteTalk API

---

## 10. MAPLIBRE / MAPTILER

### What It Is
Open-source map rendering (MapLibre GL JS) with Arabic label support (MapTiler). Replaced Mapbox for web apps (the earlier RESEARCH.md mentions Mapbox, but STACK-DECISION.md shows MapLibre was chosen for web). Driver app may still use Mapbox via @rnmapbox/maps for native performance.

### Package Stack

| Package | Version | Purpose |
|---------|---------|---------|
| `maplibre-gl` | 5.21.0 | Map rendering engine (web) |
| `react-map-gl` | 8.1.0 | React wrapper. Import via `react-map-gl/maplibre` |
| `pmtiles` | 4.4.0 | Offline vector tiles for driver app. Cairo region ~200-400MB |
| MapTiler (service) | — | Arabic label tile server, style hosting |

### Use Cases

| App | Feature | Details |
|-----|---------|---------|
| **Internal Platform (Dispatch)** | Fleet tracking map | Real-time driver positions on map. Supabase Realtime Broadcast for GPS. Color-coded by status (available, en route, at site, returning). Click driver for details. |
| **Internal Platform (Dispatch)** | Route visualization | Planned routes overlaid on map. Drag-and-drop stop reordering. Geofence visualization around delivery sites. |
| **Customer Portal** | Delivery tracking | Customer sees driver position on map during "Out for Delivery" stage. ETA countdown. Simplified view (no fleet data). |
| **CEO App** | Operations overview | Heatmap of delivery density. Regional performance overlay. |
| **Driver App** | Navigation map | Turn-by-turn navigation. Offline tiles via PMTiles. |

### MapTiler for Arabic Labels

- MapTiler provides vector tile styles with Arabic label support
- Supports Arabic-Indic numerals
- RTL text rendering handled by MapLibre's built-in RTL plugin
- Tile server URL configured per tenant locale

### PMTiles for Offline Maps (Driver App)

```
Offline Tile Strategy:
1. Pre-download PMTiles file for operating region (Cairo ~200-400MB)
2. Store on device local storage
3. MapLibre reads tiles from local PMTiles file (no network needed)
4. Update tiles monthly or on-demand (background download)
5. Protomaps (open-source) generates PMTiles from OpenStreetMap data
```

### SSR Considerations

**Critical:** MapLibre GL JS is CLIENT ONLY. Must wrap in `ClientOnly` component for TanStack Start SSR. The map canvas cannot render on the server.

```typescript
// Must use ClientOnly wrapper
<ClientOnly>
  <Map mapLib={maplibregl} ... />
</ClientOnly>
```

### Connection Pattern

- **Tile fetching:** Client browser -> MapTiler CDN (or local PMTiles)
- **GPS data:** Driver App -> Supabase Realtime Broadcast -> Dispatch map subscription
- **Route data:** Supabase Database (delivery routes) -> Map overlay

### Estimated Cost

| Item | Cost |
|------|------|
| MapTiler Free tier | 100K tile requests/month |
| MapTiler Flex | $25/month (500K requests) |
| MapTiler Pro | $100/month (2.5M requests) |
| PMTiles generation | Free (open-source Protomaps) |
| MapLibre GL JS | Free (open-source, BSD license) |

### Known Issues

- MapLibre v5 breaking changes: new `canvasContextAttributes`, `on()` returns Subscription. Deferred to Phase 17.
- Arabic text rendering: MapLibre has built-in RTL support but quality depends on font stack in tile style.
- PMTiles download: 200-400MB is significant for initial app install. Show progress bar, allow background download.
- Mobile performance: many simultaneous markers (100+ drivers) can cause frame drops. Use clustering.

---

## 11. SYGIC / HERE MAPS

### What It Is
Truck-safe navigation for the driver app. Standard consumer navigation (Google Maps, Waze) does not account for vehicle dimensions, weight restrictions, low bridges, or hazmat restrictions. Building materials delivery trucks need specialized routing.

### Provider Evaluation

| Feature | Sygic Truck Navigation | HERE Truck Routing |
|---------|----------------------|-------------------|
| Vehicle profiles | Height, weight, width, length, axle weight, hazmat | Height, weight, width, length, axle count, trailer count |
| Low bridge avoidance | Yes (offline database) | Yes (HERE map data) |
| Weight limit avoidance | Yes | Yes |
| Offline navigation | Full offline maps (industry-leading) | Limited offline (requires pre-download) |
| Mobile SDK | iOS + Android native SDK | REST API + Mobile SDK |
| Pricing | Per-device license ($20-50/device/year fleet) | Per-transaction API pricing |
| Arabic language | Yes | Yes |
| Integration | Native SDK (Capacitor plugin needed) | REST API (easier integration) |

### Recommended Approach: Hybrid

```
Phase 1 (Launch): HERE Truck Routing API
  - REST API: easy to integrate from Capacitor app
  - No native SDK dependency
  - Vehicle profile sent with each route request
  - Cost: per-transaction (manageable at small fleet size)

Phase 2 (Scale, 25+ trucks): Sygic Truck Navigation SDK
  - Full offline truck navigation
  - Better UX (turn-by-turn with truck warnings)
  - Per-device licensing becomes more economical at scale
  - Requires Capacitor native plugin (community or custom)

Both phases: MapLibre for the map display, HERE/Sygic for routing logic only
```

### Vehicle Dimension Profiles

```
Vehicle Profile Table (Supabase):
  - vehicle_id
  - vehicle_type (flatbed, boom_truck, semi_trailer, box_truck)
  - height_meters (e.g., 4.2m for boom truck with boom stowed)
  - weight_kg (GVW including typical load)
  - width_meters
  - length_meters
  - axle_count
  - trailer_attached (boolean)
  - hazmat_class (if applicable)

Route Request includes vehicle profile:
  HERE API: GET /v8/routes?transportMode=truck&truck[height]=420&truck[grossWeight]=36000
  Sygic SDK: setVehicleProfile({ height: 4.2, weight: 36000, ... })
```

### Integration with Capacitor

```
Driver App (TanStack Start + Capacitor)
  → User taps "Navigate to next stop"
    → Fetch route from HERE API with vehicle profile
      OR
    → Launch Sygic SDK in-app with destination + vehicle profile
  → Turn-by-turn navigation with truck restrictions
  → Low bridge warning: "Bridge ahead: 3.5m clearance. Your vehicle: 4.2m. Rerouting."
  → Weigh station alerts
```

### Where Code Lives

- **Route calculation:** TanStack Start server function (HERE API) or Capacitor native plugin (Sygic)
- **Vehicle profiles:** Supabase Database (`vehicles` table)
- **Route display:** MapLibre in Driver App (route polyline overlay)

### Estimated Cost

| Provider | Model | Cost (10 trucks) | Cost (50 trucks) |
|----------|-------|-----------------|-----------------|
| HERE Truck Routing | Per transaction | ~$50-100/month | ~$200-500/month |
| Sygic Fleet License | Per device/year | ~$200-500/year total | ~$1,000-2,500/year total |

### Known Issues

- HERE API latency: 500-1000ms per route calculation. Cache frequently used routes.
- Sygic SDK: no official Capacitor plugin. May need community plugin or custom native module.
- Bridge/weight data accuracy: not 100%. Driver app should have "Report Incorrect Restriction" button.
- Offline maps (Sygic): 1-3GB per country. Must manage download and updates.
- HERE recently changed pricing tiers -- verify current rates before committing.

---

## 12. SAMSARA / GEOTAB

### What It Is
Vehicle telematics hardware + software. Physical devices installed in trucks that provide GPS, engine diagnostics, ELD (Electronic Logging Device) compliance, fuel monitoring, and safety data. Optional integration -- only relevant if the fleet has (or will install) telematics hardware.

### Provider Comparison for Building Materials

| Feature | Samsara | Geotab |
|---------|---------|--------|
| **Best for** | Mid-to-large fleets (25+ vehicles) | Data-heavy fleets, open API ecosystem |
| **ELD compliance** | Yes (FMCSA certified) | Yes (FMCSA certified) |
| **GPS tracking** | Real-time (5-10s updates) | Real-time (configurable) |
| **AI dashcam** | Yes (integrated, AI safety scoring) | Via marketplace partners |
| **DVIR** | Yes (digital vehicle inspection) | Yes |
| **Maintenance alerts** | Yes (fault code alerts, PM scheduling) | Yes (deep diagnostics) |
| **Fuel monitoring** | Yes | Yes |
| **Onboard scale data** | Via integrations (Air-Weigh, etc.) | Via marketplace (wider ecosystem) |
| **API quality** | Modern REST API, well-documented | MyGeotab API, SDK available, large marketplace |
| **Pricing** | $25-45/vehicle/month | $25-40/vehicle/month |
| **Building materials fit** | Strong (good for mixed fleet operations) | Strong (best for data analysis, has more integrations) |

### Recommendation

**Samsara** for HyperQuote. Reasons:
- Integrated AI dashcam (important for delivery liability protection)
- Cleaner API for custom integration
- Better out-of-box analytics dashboard
- Geotab is superior for pure data analysis but requires more integration work

**However:** If the fleet already has Geotab hardware, use Geotab's API. Don't rip and replace.

### What to Pull via API

```
Data from Telematics API → Supabase:

1. Vehicle locations (GPS):
   GET /fleet/vehicles/locations (poll every 30s)
   → Update driver_current_location table
   → Alternative to Transistor Software GPS for fleet tracking

2. HOS/ELD status per driver:
   GET /fleet/drivers/{id}/hos
   → driving, on-duty, sleeper, off-duty
   → Enforce HOS limits in route planning

3. Vehicle diagnostics:
   Webhook → vehicle fault code detected
   → Create maintenance alert in HyperQuote
   → Notify fleet manager

4. Fuel consumption:
   GET /fleet/vehicles/{id}/stats
   → Cost per mile calculation
   → Idle time monitoring

5. DVIR reports:
   GET /fleet/vehicles/{id}/dvirs
   → Pre/post-trip inspections
   → FMCSA compliance records

6. Geofence events:
   Webhook → vehicle enters/exits geofence
   → Auto-trigger arrival/departure in delivery workflow
   → Update customer tracking

7. Speed/harsh braking:
   Webhook → safety event detected
   → Driver safety scorecard
```

### Integration Pattern

```
Option A: Polling (simpler)
  Cloudflare Cron Trigger (every 30s)
    → Worker polls Samsara API for vehicle locations
      → Batch update Supabase driver_current_location
      → Broadcast via Supabase Realtime to dispatch dashboard

Option B: Webhooks (preferred)
  Samsara webhook events → Cloudflare Worker endpoint
    → Process event (geofence, fault code, safety event)
    → Update Supabase
    → Trigger notifications if needed

Hybrid (recommended):
  - Webhooks for events (geofence, faults, safety)
  - Polling for location (most reliable for real-time tracking)
```

### When to Use vs Own GPS (Transistor Software)

| Scenario | GPS Source | Why |
|----------|-----------|-----|
| Fleet has existing Samsara/Geotab | Telematics API | Don't duplicate GPS hardware/software |
| No existing telematics | Transistor Software (phone GPS) | Lower cost, no hardware installation |
| Hybrid (recommended for scale) | Telematics for compliance + own GPS for customer-facing tracking | Samsara for ELD/diagnostics, phone GPS for delivery UX (more frequent updates) |

### Where Code Lives

- **Polling Worker:** Cloudflare Cron Trigger + Worker
- **Webhook receiver:** Cloudflare Worker endpoint
- **Data storage:** Supabase tables (`vehicle_telemetry`, `driver_current_location`, `dvir_reports`, `maintenance_alerts`)
- **Display:** Internal Platform (Dispatch dashboard, Fleet health dashboard)

### Estimated Cost

| Item | Per Vehicle/Month | 10 Trucks | 50 Trucks |
|------|------------------|-----------|-----------|
| Samsara hardware (one-time) | $100-200 | $1,000-2,000 | $5,000-10,000 |
| Samsara subscription | $25-45 | $250-450/month | $1,250-2,250/month |
| Geotab hardware | $100-150 | $1,000-1,500 | $5,000-7,500 |
| Geotab subscription | $25-40 | $250-400/month | $1,250-2,000/month |
| AI dashcam add-on (Samsara) | +$10-15 | +$100-150/month | +$500-750/month |

### Known Issues

- Samsara API rate limits: 10 requests/second (sufficient for most use cases)
- GPS accuracy: +-3-5m with hardware device (better than phone GPS)
- Data ownership: clarify with provider that you own the data and can export it
- Contract lock-in: typically 3-5 year contracts. Negotiate shorter terms initially.
- If fleet is small (<10 trucks), telematics cost may not justify -- use Transistor Software phone GPS instead

---

## 13. ORDERFUL / SPS COMMERCE

### What It Is
Managed EDI (Electronic Data Interchange) services. EDI is mandatory for building materials distribution -- large trading partners (Home Depot, Lowe's, buying groups) require it. HyperQuote should NOT build EDI infrastructure; use a managed service.

### Provider Comparison

| Feature | Orderful | SPS Commerce |
|---------|----------|--------------|
| **Architecture** | API-first, modern REST/webhook | Traditional EDI + web portal |
| **Best for** | Custom platforms (like HyperQuote on Supabase) | Immediate Home Depot/Lowe's compliance |
| **Inbound POs** | Webhook-based (push to your endpoint) | Web portal + API + webhook |
| **Outbound invoices** | API-based (POST from your system) | API + portal upload |
| **EDI translation** | Cloud-based, no on-prem | Cloud-based |
| **Trading partner onboarding** | Self-service + Orderful network | Managed by SPS team |
| **Pricing** | ~$6,000-12,000/year | ~$8,000-15,000/year |
| **Integration complexity** | Lower (modern API) | Medium (more established but older patterns) |

### Recommendation

**Orderful** for HyperQuote. API-first design integrates naturally with the Supabase + Cloudflare stack. SPS Commerce is the fallback if specific trading partners require it (SPS has the largest retail partner network).

### EDI Document Types

| EDI Code | Document | Direction | Priority |
|----------|----------|-----------|----------|
| **850** | Purchase Order | Inbound (trading partner -> HyperQuote) | Phase 1 |
| **855** | PO Acknowledgment | Outbound (HyperQuote -> trading partner) | Phase 1 |
| **810** | Invoice | Outbound | Phase 1 |
| **997** | Functional Acknowledgment | Both | Phase 1 |
| **856** | ASN (Advance Ship Notice) | Outbound | Phase 2 |
| **846** | Inventory Inquiry/Advice | Outbound | Phase 2 |

### Integration Pattern

```
INBOUND (Trading partner sends PO):
  Trading Partner EDI system
    → Orderful cloud (translates X12 → JSON)
      → Webhook POST to Cloudflare Worker
        → Validate and transform to HyperQuote order format
        → Insert into Supabase (orders table)
        → Send 855 PO Acknowledgment back via Orderful API
        → Notify Operations team (Supabase Realtime)

OUTBOUND (HyperQuote sends Invoice):
  Invoice generated in HyperQuote
    → Cloudflare Queue (edi-outbound queue)
      → Worker formats invoice data per trading partner requirements
        → POST to Orderful API (JSON)
          → Orderful translates to X12 810
            → Trading partner receives EDI invoice
```

### Where Code Lives

- **Webhook receiver:** Cloudflare Worker (dedicated route)
- **Outbound sender:** Cloudflare Worker (queue consumer)
- **EDI mapping:** Configuration in Supabase (per trading partner, maps HyperQuote fields to EDI fields)
- **Monitoring:** Internal Platform (Admin) -- EDI transaction log, error dashboard

### Which Apps Use It

- **Internal Platform (Operations):** See inbound POs from EDI partners
- **Internal Platform (Finance):** Outbound invoices/ASNs
- **Internal Platform (Admin):** Trading partner configuration, EDI monitoring

### Estimated Cost

| Item | Cost |
|------|------|
| Orderful platform | $6,000-12,000/year |
| SPS Commerce (alternative) | $8,000-15,000/year |
| Per-trading-partner setup | $500-2,000 (one-time) |
| Integration development | $20K-50K (one-time) |

### Known Issues

- EDI is inherently complex -- X12/AS2 standards are decades old
- Trading partner testing: each new partner requires weeks of testing/validation
- Compliance requirements vary per retailer (Home Depot vs Lowe's have different specs)
- Managed service handles all X12/AS2 complexity -- worth the cost vs. building
- Small supplier integration: most small suppliers use portal-only or API, not EDI

---

## 14. PLAID

### What It Is
Bank account connection service for automated bank feed integration. Matches wire transfers and check deposits to open invoices for payment reconciliation.

### Phased Implementation

```
Phase 1 (Launch, $0-5M revenue): Manual CSV import from bank
  - Finance user exports bank statement as CSV
  - Upload to HyperQuote
  - System attempts auto-matching by amount + reference
  - Manual matching for exceptions

Phase 2 ($5M+ revenue): Plaid integration
  - Automated daily bank feed
  - Real-time transaction webhooks
  - Auto-matching with confidence scoring
```

### Integration Flow

```
1. Finance user connects bank account:
   → Plaid Link widget (client-side JavaScript)
   → User authenticates with bank
   → Plaid returns access_token
   → Store encrypted in Supabase (or Cloudflare Secrets)

2. Daily transaction sync:
   Cloudflare Cron Trigger (daily)
     → Worker calls Plaid /transactions/sync
       → New transactions received
       → For each transaction:
         a. Match to open invoices by amount + reference number + customer name
         b. High-confidence match (exact amount + reference): auto-apply
         c. Medium-confidence match (close amount, partial match): suggest for review
         d. No match: flag for manual review
       → Create payment records in HyperQuote for confirmed matches
       → Sync confirmed payments to QuickBooks

3. Real-time webhooks (optional):
   Plaid webhook → Cloudflare Worker
     → Process new transaction immediately
     → Update payment status in real-time
```

### Limitations with Commercial Bank Accounts

- **Coverage:** Plaid supports most major US/UK banks for business accounts. Coverage in Egypt, UAE, and Saudi Arabia is limited or nonexistent. Check Plaid's institution list for MENA region.
- **Commercial accounts:** Some commercial banking platforms (Chase Commercial, BofA CashPro) have limited Plaid support. Wire transfers may not appear in Plaid feeds -- they come through different banking systems.
- **International wires:** Often not captured by Plaid. These may still require manual recording.
- **Alternative for MENA:** Use bank's Open Banking API directly (if available) or continue with manual CSV import.

### Where Code Lives

- **Plaid Link:** Client-side component in Internal Platform (Finance module)
- **Token storage:** Supabase (encrypted) or Cloudflare Secrets
- **Transaction sync:** Cloudflare Cron Trigger + Worker
- **Matching engine:** Supabase Edge Function (complex matching logic)
- **Display:** Internal Platform (Finance) -- bank reconciliation dashboard

### Which Apps Use It

- **Internal Platform (Finance):** Bank reconciliation, payment matching

### Estimated Cost

| Plan | Monthly | Included |
|------|---------|----------|
| Plaid Production | ~$500/month | ~100 connected accounts |
| Per-account overage | ~$1-3/account/month | — |
| Transaction sync | Included | — |

### Known Issues

- Plaid does not operate in all MENA countries -- may need alternative for Egypt/UAE/Saudi
- Wire transfers may not appear in Plaid feeds for commercial accounts
- Bank connection can break (requires user re-authentication every 90-180 days)
- Plaid Link requires HTTPS -- works fine on Cloudflare Workers
- Matching confidence requires tuning -- too aggressive auto-matching risks misapplication

---

## 15. DUN & BRADSTREET / EXPERIAN BUSINESS

### What It Is
Business credit reporting services for customer credit checks. Used during credit application processing to assess customer creditworthiness before extending trade credit.

### Credit Scoring Integration

| Factor | Weight | Source |
|--------|--------|--------|
| D&B PAYDEX score | 20% | D&B API |
| Experian Intelliscore | 15% | Experian API |
| Years in business | 10% | Customer application |
| Trade reference avg days to pay | 20% | Reference responses |
| Bank reference | 10% | Bank response |
| Revenue vs requested limit ratio | 10% | Application |
| Industry risk (construction sector) | 10% | Internal model |
| Prior relationship history | 5% | Internal data |

### D&B (Dun & Bradstreet) Integration

```
API: D&B Direct+ API
Auth: API key (Bearer token)
Endpoint: GET /v1/data/duns/{duns_number}/...

What to Pull:
  - PAYDEX score (0-100, payment behavior index)
  - D&B Rating (composite credit appraisal)
  - Financial Stress Score
  - Commercial Credit Score
  - Legal filings (judgments, liens, bankruptcies)
  - Ownership/executive changes
  - Company verification (name, address, DUNS number)

Monitoring Alerts:
  - D&B Monitoring API: webhook when PAYDEX drops, legal filings, ownership changes
  - Cloudflare Worker receives alert → updates customer credit profile → notifies Credit Manager
```

### Experian Business Integration

```
API: Experian Business REST API
Auth: OAuth 2.0
Endpoint: POST /businesses/v1/reports

What to Pull:
  - Intelliscore Plus (1-100, predictive score)
  - Payment history (how business pays its bills)
  - Commercial credit score
  - Trade payment trends
  - Public records (liens, judgments, bankruptcies)
  - Business facts (years in business, SIC code, employee count)
```

### Integration Pattern

```
Customer submits credit application
  → Supabase Edge Function: process-credit-application
    → Parallel API calls:
      a) D&B Direct+ API → PAYDEX, rating, financials
      b) Experian Business API → Intelliscore, payment history
      c) OFAC/sanctions list check
      d) Send trade reference requests (email via Resend)
    → Calculate internal credit score (weighted formula)
    → Auto-approve or route to Credit Manager based on score + limit thresholds
    → Store all credit data in Supabase (encrypted PII fields)
```

### Approval Thresholds

| Requested Limit | Score >= 60 | Score 40-59 | Score < 40 |
|----------------|-------------|-------------|------------|
| < $50K | Auto-approve | Credit Manager review | Decline/COD |
| $50K-$250K | Credit Manager approve | Credit Manager + Finance Manager | Decline/COD |
| $250K-$1M | Finance Manager approve | FM + VP Finance | Decline |
| > $1M | VP Finance approve | CFO/CEO approve | Decline |

### Ongoing Monitoring

- D&B Monitoring Alerts: PAYDEX drops, new legal filings, ownership changes
- Internal tracking: DSO per customer, payment behavior vs. terms
- Annual review: all accounts >$100K
- Quarterly review: all accounts with late payments
- Auto-reduce limit if DSO exceeds 2x terms

### Where Code Lives

- **Credit application processing:** Supabase Edge Function
- **Credit data storage:** Supabase (encrypted columns for sensitive data)
- **Monitoring webhooks:** Cloudflare Worker
- **Display:** Internal Platform (Finance -- Credit Manager dashboard)

### Which Apps Use It

- **Internal Platform (Finance):** Credit application workflow, credit dashboard
- **Internal Platform (Sales):** Credit status visible on customer 360 view

### Estimated Cost

| Service | Cost |
|---------|------|
| D&B Direct+ API | $2,000-5,000/year base + ~$5-15/report |
| D&B Monitoring | ~$3-8/account/year |
| Experian Business | $2,000-5,000/year base + ~$3-10/report |
| Total (100 credit checks/year) | ~$5,000-12,000/year |

### Known Issues

- D&B data quality: not all businesses have a DUNS number (especially small contractors). May need to request DUNS number as part of credit application.
- Experian coverage: strong in US, limited in MENA region. For Egyptian/UAE customers, may need local credit bureaus (I-Score in Egypt, Al Etihad Credit Bureau in UAE).
- Cost per lookup can add up -- only pull reports for credit applications, not routine checks. Use internal payment history for ongoing monitoring.
- API rate limits: typically generous (100+ requests/minute) but reports take time to generate.

---

## 16. TRANSISTOR SOFTWARE

### What It Is
Background geolocation plugin for the Capacitor driver app. Enables GPS tracking even when the app is in the background or the screen is off. Industry standard for delivery/fleet tracking apps.

### Package

- **Package:** `@transistorsoft/capacitor-background-geolocation` v9.0.2
- **Requires:** Capacitor 8
- **License:** $399 Starter license (one-time, covers development + one production app)

### Capabilities

| Feature | Detail |
|---------|--------|
| **Background GPS** | Continues tracking when app is backgrounded or screen locked |
| **Motion detection** | Automatically increases/decreases tracking frequency based on movement |
| **Geofencing** | Trigger events when entering/exiting defined areas (delivery sites, warehouses) |
| **Offline GPS buffering** | Stores GPS points locally when offline, uploads when connection restored |
| **Battery optimization** | Motion-activated GPS (only tracks when moving -- saves 80%+ battery) |
| **Adaptive refresh rates** | 5-15 seconds while driving, 60 seconds when stationary |
| **Native background task** | Uses iOS/Android native background task APIs for reliable tracking |

### Integration Pattern

```
Driver App (TanStack Start + Capacitor)
  → Transistor Software plugin captures GPS coordinates
    → While online: POST to Supabase via API
      → Supabase Realtime Broadcast (ephemeral, to dispatch dashboard)
      → Batch write to driver_locations table (every 30s, not every GPS point)
    → While offline: buffer GPS points locally (SQLite)
      → When back online: flush buffer to Supabase

Geofence Configuration:
  → Dispatch creates delivery → delivery address geocoded
  → Geofence created (150-300m radius for construction sites)
  → Driver enters geofence → auto-trigger "AT_SITE" status
  → Driver exits geofence → prompt for departure confirmation
```

### GPS Data Flow

```
Driver Phone (Transistor Software)
  ├── GPS point every 5-15s (driving)
  │   └── Supabase Realtime Broadcast (ephemeral)
  │       └── Dispatch dashboard (real-time map)
  │       └── Customer tracking page (if "Out for Delivery")
  │
  ├── Batched location history every 30s
  │   └── Supabase: driver_locations table (partitioned by month)
  │       └── Route history, analytics, proof of route
  │
  └── Geofence events
      └── Supabase: delivery status transitions
          └── Trigger: "AT_SITE" → auto-notify customer
```

### Where Code Lives

- **Plugin configuration:** Driver App Capacitor config
- **GPS handler:** Driver App service layer (TypeScript)
- **Geofence management:** Supabase Edge Function (create/remove geofences per delivery)
- **Data storage:** Supabase (`driver_current_location` for real-time, `driver_locations` for history)

### Which Apps Use It

- **Driver App:** Primary user (GPS source)
- **Internal Platform (Dispatch):** Consumer (map display)
- **Customer Portal:** Consumer (delivery tracking)

### Estimated Cost

| Item | Cost |
|------|------|
| Starter license | $399 (one-time) |
| Enterprise license | $999 (one-time, unlimited apps) |
| Annual maintenance/updates | Included with license |

### Known Issues

- Capacitor BG Geolocation v9 requires Capacitor 8. License key regeneration may be needed when upgrading.
- iOS background GPS restrictions: Apple limits background location access. Plugin handles this, but user must grant "Always Allow" location permission.
- Android 12+ background location: requires foreground service notification (persistent notification showing "Tracking your delivery route").
- Battery drain: even with motion-activated GPS, expect 10-15% additional battery drain per shift. Drivers should have car chargers.
- GPS accuracy: phone GPS is +-5-15m (less accurate than dedicated telematics hardware +-3-5m). Sufficient for delivery tracking, not for precision navigation.

---

## 17. GOOGLE CLOUD VISION / CLAUDE VISION

### What It Is
OCR (Optical Character Recognition) capability for scanning supplier catalogs in Arabic + English. Two approaches possible: dedicated OCR service (Google Cloud Vision) or Claude's built-in vision capability.

### Approach Decision: Claude Vision (Not Separate OCR)

**Recommended:** Use Claude Sonnet's vision capability directly. Do NOT add a separate Google Cloud Vision dependency.

**Rationale:**
- Claude Sonnet already has strong vision/OCR capability (included in the Claude API cost)
- One fewer external dependency to manage
- Claude can simultaneously OCR AND structure the data (extract product names, prices, specs into JSON)
- Google Cloud Vision would require a separate OCR step, then a separate Claude call for structuring
- Arabic + English mixed text: Claude handles bilingual content in a single pass

### Supplier Catalog Parsing Pipeline

```
Supplier uploads catalog (PDF, Excel, CSV, images)
  → Upload to Cloudflare R2 (temporary processing bucket)
  → Cloudflare Queue (catalog-parsing queue)
    → Worker initiates processing:
      For PDF: Extract pages as images (pdf-lib or external service)
      For Excel/CSV: Parse directly (no vision needed)
      For images: Use directly

  → Supabase Edge Function: parse-catalog
    → For each page/image:
      → Claude Sonnet Vision API call:
        System: "Extract product data from this supplier catalog page.
                 Return structured JSON: { products: [{ name, name_ar, sku,
                 unit, price, min_order, description }] }"
        Image: [page image as base64]
      ← Structured JSON response with confidence scores per field

    → Aggregate all pages into full catalog
    → Store extracted data in Supabase (pending_catalog_items table)
    → Supplier reviews in side-by-side UI (original doc + extracted data)
    → Procurement team reviews and maps to HyperQuote categories
    → Approved items become active products
```

### Performance and Cost

| Metric | Value |
|--------|-------|
| Cost per 200-page catalog | ~$0.45 (Claude Sonnet vision) |
| Extraction accuracy | 85-95% (varies by document quality) |
| Processing time | 2-5 minutes per 200-page catalog |
| Languages | Arabic + English (bilingual in single pass) |

### Where Code Lives

- **Upload handling:** Cloudflare Worker (presigned URL to R2)
- **Processing queue:** Cloudflare Queue
- **Parsing logic:** Supabase Edge Function (Claude API calls with vision)
- **Review UI:** Supplier Portal (side-by-side original + extracted data)
- **Approval workflow:** Internal Platform (Procurement module)

### Which Apps Use It

- **Supplier Portal:** Upload catalogs, review AI extraction
- **Internal Platform (Procurement):** Approve/reject extracted products, map categories

### Known Issues

- Handwritten catalogs: much lower accuracy. May need manual entry for poor quality documents.
- Complex table layouts: Claude vision can struggle with dense multi-column tables. Consider pre-processing with table detection.
- Large catalogs (500+ pages): process in batches to avoid timeout. Cloudflare Queue handles this naturally.
- Price detection: Arabic-Indic numerals vs Western numerals -- Claude handles both, but verify.
- If Claude vision accuracy proves insufficient for specific document types, Google Cloud Vision can be added as a fallback (Document AI specifically handles Arabic well).

---

## 18. POWERSYNC

### What It Is
Offline-first sync engine for the Driver App. Reads PostgreSQL WAL (Write-Ahead Log), syncs to local SQLite on device. Provides bi-directional sync between Supabase and local device database.

### Why Required

Driver App operates in construction sites with poor/no connectivity. Must work fully offline:
- View delivery route and stop details
- Capture proof of delivery (photos, signatures)
- Record delivery status changes
- Buffer GPS coordinates
- Complete delivery workflows without internet

### Integration Pattern

```
Supabase PostgreSQL
  ↕ (WAL replication)
PowerSync Cloud Service
  ↕ (sync protocol)
Driver App Local SQLite (PowerSync client SDK)
  ↕ (read/write)
Driver App UI (TanStack Query reads from local SQLite)
```

### Sync Rules

| Data | Sync Direction | Conflict Resolution |
|------|---------------|-------------------|
| Delivery route (stops, addresses, products) | Server → Device | Server is authority |
| Delivery status changes | Device → Server | Driver is authority for delivery status |
| GPS coordinates | Device → Server | Device is authority |
| Photos/signatures | Device → Server (upload queue) | Device is authority |
| Customer contact info | Server → Device | Server is authority |
| Route assignments | Server → Device | Dispatcher is authority |

### Where Code Lives

- **PowerSync client:** Driver App (Capacitor, local SQLite)
- **PowerSync config:** Server-side sync rules defining what data syncs to which drivers
- **Upload queue:** Built-in PowerSync feature + custom photo upload queue
- **Server:** PowerSync Cloud (managed service) connected to Supabase

### Estimated Cost

| Plan | Monthly |
|------|---------|
| Starter (~50 devices) | ~$49/month |
| Growth (~200 devices) | ~$199/month |
| Enterprise | Custom pricing |

### Known Issues

- Photo sync: photos are NOT synced through PowerSync (too large). Use separate upload queue to R2.
- Initial sync: first sync downloads all assigned delivery data. Can be slow on poor connection.
- Conflict resolution: must define clear ownership rules per data type. Driver is authority for delivery status; dispatcher is authority for route assignments.

---

## 19. INTEGRATION COST SUMMARY

### Monthly Cost by Growth Stage

| Integration | Launch ($0-1M) | Growth ($1-10M) | Scale ($10-50M) | Enterprise ($50M+) |
|-------------|---------------|----------------|----------------|-------------------|
| **Supabase** | $25 | $100-300 | $500-2,000 | $2,000-5,000 |
| **Cloudflare** | $10-25 | $30-95 | $135-625 | $500-2,000 |
| **Claude API** | $100-240 | $500-1,600 | $5,000-16,000 | $16,000-50,000 |
| **WhatsApp (Meta)** | $20-50 | $200-500 | $1,000-2,500 | $2,500-10,000 |
| **Twilio (SMS + OTP)** | $80-150 | $200-600 | $500-1,500 | $1,500-5,000 |
| **Resend** | $20 | $20-90 | $90-200 | Custom |
| **Avalara** | $50-100 | $100-400 | $400-1,000 | $1,000-3,000 |
| **ETA/ZATCA** | $0 (gov API) | $0 | $0 | $0 |
| **QuickBooks** | $90-200 | $200 | $200 (or migrate to NetSuite) | NetSuite $1,000-5,000 |
| **MapTiler** | $0-25 | $25-100 | $100-300 | Custom |
| **HERE/Sygic** | $0-100 | $100-500 | $500-2,000 | Custom |
| **Samsara/Geotab** | $0 (optional) | $250-450 | $1,250-2,250 | $5,000-15,000 |
| **Orderful/SPS** | $0 (if no EDI partners) | $500-1,000 | $1,000-1,500 | $1,500-3,000 |
| **Plaid** | $0 (Phase 2) | $500 | $500-1,000 | $1,000-3,000 |
| **D&B/Experian** | $0 (manual) | $400-1,000 | $1,000-2,000 | $2,000-5,000 |
| **Transistor Software** | $33 (amortized) | $33 | $33 | $83 (Enterprise) |
| **PowerSync** | $49 | $49-199 | $199-500 | Custom |
| **TOTAL** | **$477-1,020** | **$3,207-7,462** | **$11,412-33,913** | **$35,083-109,083** |

### One-Time Costs

| Item | Cost |
|------|------|
| Transistor Software license | $399-999 |
| Samsara/Geotab hardware (per vehicle) | $100-200 |
| ETA/ZATCA digital certificates | $500-2,000 |
| EDI trading partner setup (per partner) | $500-2,000 |
| QuickBooks integration development | $50K-100K |
| EDI integration development | $20K-50K |
| Total integration development | $100K-250K (estimated) |

---

## 20. INTEGRATION DEPENDENCY GRAPH

### Which Integrations Depend on Which

```
LAYER 0: FOUNDATION (must be first)
├── Supabase (database, auth, realtime)
└── Cloudflare (workers, R2, edge compute)

LAYER 1: CORE BUSINESS (Phase 1-5)
├── Claude API (AI features -- via Cloudflare AI Gateway)
├── WhatsApp Business API (customer communication -- webhook to Worker)
├── Twilio (SMS + OTP -- called from server functions)
├── Resend (email -- called from Workers/Edge Functions)
└── @supabase/ssr (auth for TanStack Start)

LAYER 2: COMPLIANCE (Phase 6-10)
├── ETA e-invoicing (Egypt -- depends on invoice pipeline)
├── ZATCA e-invoicing (Saudi -- depends on invoice pipeline)
└── Avalara AvaTax (US tax -- depends on quote/invoice builder)

LAYER 3: FINANCIAL (Phase 10-15)
├── QuickBooks Online (accounting sync -- depends on invoice/payment system)
├── D&B / Experian (credit checks -- depends on customer onboarding)
└── Plaid (bank feeds -- Phase 2, depends on payment recording)

LAYER 4: LOGISTICS (Phase 15-20)
├── MapLibre / MapTiler (maps -- depends on delivery data model)
├── Transistor Software (driver GPS -- depends on Capacitor driver app)
├── PowerSync (offline sync -- depends on driver app + Supabase schema)
├── HERE / Sygic (truck navigation -- depends on driver app + vehicle profiles)
└── Samsara / Geotab (telematics -- optional, depends on fleet hardware)

LAYER 5: TRADING PARTNERS (Phase 20+)
└── Orderful / SPS Commerce (EDI -- depends on order/invoice pipeline)
```

### Data Flow Between Integrations

```
Customer sends WhatsApp message
  → Meta Cloud API webhook → Cloudflare Worker → Supabase (ticket)
  → Claude AI (triage) → auto-respond OR route to human agent
  → Agent replies via Internal Platform → Cloudflare Worker → Meta Cloud API → Customer

Customer submits quote request
  → Supabase (quote_request) → Cloudflare Worker notifies Sales (Realtime)
  → Sales builds quote → Avalara (tax calc) → Claude AI (margin suggestion)
  → Quote sent → WhatsApp template + Email (Resend) + In-app (Realtime)

Customer accepts quote → Order created
  → Supabase (order) → Cloudflare Queue → QuickBooks (sync invoice)
  → Supplier POs generated → Orderful (if EDI partner)
  → ETA/ZATCA (e-invoice submission) → PDF generated (pdf-lib) → R2 (storage)

Delivery dispatched
  → Driver App → Transistor Software (GPS) → Supabase Realtime Broadcast
  → Dispatch map (MapLibre) → Customer tracking (MapLibre)
  → HERE API (truck-safe route) → Driver navigation
  → Samsara (ELD compliance, if hardware installed)

Delivery completed
  → POD captured → R2 (photos) → Supabase (delivery status)
  → Auto-generate invoice → Avalara (commit tax) → ETA/ZATCA (submit)
  → Send invoice → Email (Resend) + WhatsApp (Meta) → Customer
  → Sync to QuickBooks (revenue entry)

Payment received
  → Plaid (bank feed) OR manual entry → Supabase (payment record)
  → Match to invoice → Update AR → Sync to QuickBooks (cash receipt)
  → WhatsApp template confirmation → Customer
```

---

*This integration map covers every external service connection for the HyperQuote B2B building materials platform as of 2026-03-28. Total: 17 external integrations + 1 offline sync service. All connection patterns, costs, and known issues documented. Source data from 20+ research documents in the project.*
