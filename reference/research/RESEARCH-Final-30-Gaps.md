> ⚠️ **REFERENCE DOCUMENT — NOT THE SOURCE OF TRUTH**
> This file was written during the research phase and may contain outdated decisions, US-centric references, or superseded technical choices.
> **Always defer to `essential/RESEARCH.md` for current decisions.**
> Key changes since this file was written: TanStack Start (not Next.js), Capacitor (not Expo), React Aria (not shadcn), Egyptian law (not US FMCSA), EGP (not USD), dual auth pools, no online payments, no mobile wallets, spatial glass UI (not traditional dashboards).

# RESEARCH: 20 Remaining Gaps from Audit
## HyperQuote B2B Building Materials Distribution Platform

**Date:** 2026-03-29
**Scope:** Decisions and specifications for 20 items identified as gaps during the completeness audit -- 3 partially covered in existing research and 17 additional gaps surfaced from walkthrough scenarios.

---

## TABLE OF CONTENTS

**Partially Covered (Existing Research Gaps)**
1. [Explicit List of 18 External Integrations with Connection Details](#1-explicit-list-of-18-external-integrations-with-connection-details)
2. [Traffic Law 66/1973 Specific Article Citations](#2-traffic-law-661973-specific-article-citations)
3. [December 2025 Traffic Law Amendments](#3-december-2025-traffic-law-amendments)

**Additional Gaps from Walkthroughs**
4. [Multi-Device CEO Authentication](#4-multi-device-ceo-authentication)
5. [Biometric Auth Failure Fallback](#5-biometric-auth-failure-fallback)
6. [CEO App First-Time Onboarding](#6-ceo-app-first-time-onboarding)
7. [CEO Approval Queue from CEO App](#7-ceo-approval-queue-from-ceo-app)
8. [Data Freshness Indicators](#8-data-freshness-indicators)
9. [CEO App Settings Screen](#9-ceo-app-settings-screen)
10. [Egyptian Calendar and Hijri Date Support](#10-egyptian-calendar-and-hijri-date-support)
11. [Currency Formatting (EGP)](#11-currency-formatting-egp)
12. [Deep Link Behavior Between PWAs](#12-deep-link-behavior-between-pwas)
13. [Supplier Contract Terms Management](#13-supplier-contract-terms-management)
14. [API Specification for Supplier Stock Sync](#14-api-specification-for-supplier-stock-sync)
15. [Regional Pricing for Large Suppliers](#15-regional-pricing-for-large-suppliers)
16. [Product Matching and Deduplication](#16-product-matching-and-deduplication)
17. [Supplier Channel Conflict](#17-supplier-channel-conflict)
18. [Non-Technical Supplier Onboarding](#18-non-technical-supplier-onboarding)
19. [Bulk Operations for Large Suppliers](#19-bulk-operations-for-large-suppliers)
20. [Customer NPS/Feedback Integration](#20-customer-npsfeedback-integration)

---

## 1. EXPLICIT LIST OF 18 EXTERNAL INTEGRATIONS WITH CONNECTION DETAILS

`RESEARCH-External-Integration-Map.md` already documents these in depth. Below is the consolidated quick-reference table with connection method, SDK/protocol, and which app uses each integration.

| # | External Service | Connection Method | Protocol/SDK | Which Apps Use It |
|---|-----------------|-------------------|-------------|-------------------|
| 1 | **Supabase (Auth, DB, Realtime, Storage, Edge Functions, pgvector, pg_cron, supa_audit)** | Direct SDK + Hyperdrive pooling | `@supabase/ssr` v0.9, `@supabase/supabase-js`, PostgreSQL wire protocol via Hyperdrive | All 6 apps |
| 2 | **Cloudflare (Workers, R2, Hyperdrive, AI Gateway, Queues, Cron Triggers, Durable Objects, KV, Workflows, Secrets)** | Platform runtime -- all apps deploy as Workers | Wrangler bindings, REST APIs | All 6 apps |
| 3 | **Claude API (Anthropic)** | REST API via Cloudflare AI Gateway proxy | `@cloudflare/tanstack-ai` (server), `@tanstack/ai-react` (client). Models: Haiku 3.5 (routing), Sonnet 4 (80% of queries), Opus 4 (complex reasoning). | All apps with AI features |
| 4 | **WhatsApp Business API (Meta Cloud API)** | Webhook (inbound) + REST API (outbound) | Meta Cloud API v21+. Webhook POST to Cloudflare Worker. Outbound via Queue -> Worker -> Meta API. | Customer Portal, Supplier Portal, Internal (CS, Sales, Dispatch) |
| 5 | **Twilio** | REST API | `twilio` Node SDK. Verify API for OTP. Messages API for SMS. | All apps (OTP), Internal (notifications), fallback for WhatsApp |
| 6 | **Resend** | REST API via Cloudflare Queue | `resend` SDK. React Email templates (`@react-email/components`). | All apps (transactional email) |
| 7 | **Avalara (AvaTax)** | REST API from Supabase Edge Functions | AvaTax REST v2. Tax calculation per delivery address. | Internal (invoicing), Customer Portal (tax estimates) |
| 8 | **ETA (Egyptian Tax Authority)** | REST API for e-invoicing | JSON/XML e-invoice submission. Digital signature required per invoice. UUID assigned by ETA per invoice. | Internal (Finance) |
| 9 | **QuickBooks Online** | REST API via OAuth 2.0 | QBO REST API. Sync: invoices, payments, journal entries, chart of accounts. Nightly reconciliation via Cloudflare Cron Trigger + Queue. | Internal (Finance) |
| 10 | **MapLibre + MapTiler** | Client-side JS SDK (maps) + REST API (tiles) | `maplibre-gl` for rendering. MapTiler for vector tile hosting + geocoding API. | Customer Portal (delivery tracking), Internal (dispatch dashboard), CEO App (map overlays) |
| 11 | **Sygic / HERE Maps** | REST API (routing + ETA) | HERE Routing API v8 for turn-by-turn, ETA calculation, multi-stop optimization. | Internal (Dispatch), Driver App (navigation) |
| 12 | **Samsara / Geotab** | REST API + Webhook | Fleet telematics: OBD-II vehicle diagnostics, fuel monitoring, speed alerts. Webhook for real-time alerts. | Internal (Fleet Management) |
| 13 | **Orderful / SPS Commerce** | NOT USED | Per `RESEARCH-External-Integration-Map.md`, EDI is not needed. Supplier Portal + WhatsApp replaces EDI for Egyptian/ME regional suppliers. | N/A |
| 14 | **Plaid** | REST API | Bank feed aggregation for payment matching. Daily pull via Cron Trigger. | Internal (Finance -- bank reconciliation) |
| 15 | **Dun & Bradstreet / Experian Business** | REST API | Credit report pull during credit application. D-U-N-S number lookup for B2B customers. | Internal (Credit Management) |
| 16 | **Transistor Software (Background Geolocation)** | Capacitor plugin | `@transistorsoft/capacitor-background-geolocation` for persistent GPS tracking even when app is backgrounded. | Driver App (Capacitor native) |
| 17 | **Google Cloud Vision / Claude Vision** | REST API | OCR for supplier catalog parsing (PDF/image to structured data). Used alongside Mistral OCR. | Internal (Procurement -- catalog import) |
| 18 | **PowerSync** | Client-side SDK + sync service | `@powersync/web` for offline-first data sync in Driver App. Syncs delivery data, POD, inventory movements when offline. | Driver App |

**Note on #13:** The integration map lists Orderful/SPS Commerce as a placeholder but explicitly states it is not needed. Egyptian/ME regional suppliers do not use EDI. The effective count of active integrations is 17.

---

## 2. TRAFFIC LAW 66/1973 SPECIFIC ARTICLE CITATIONS

### Complete Article Reference for Building Materials Delivery Operations

The following table maps every relevant provision of Traffic Law No. 66 of 1973 (as amended by Law 17 of 2024 and December 2025 cabinet amendments) to its governing article.

| Topic | Article(s) | Summary |
|-------|-----------|---------|
| **Speed limits (general)** | Executive Regulations, Chapter on Speed | Urban: 60 km/h (cars), 50 km/h (trucks), 40 km/h (trailers). Highway: 90-100 km/h (cars), 70 km/h (trucks), 60 km/h (trailers). Densely populated: 40 km/h all vehicles. |
| **Speed limiters (mandatory)** | Executive Regulations + Ministerial Decree (2024/2025) | All commercial, fleet, and public service vehicles must have certified speed limiting devices. EOSQ certification required. UNECE Regulation No. 89 compliance. Enforcement from January 1, 2026 for new registrations. |
| **Speeding penalties** | Article 74 (as amended Dec 2025) | EGP 2,000 to 10,000 for speeding on designated roads. Repeat offenders face escalating sanctions. |
| **Minimum speed violation** | Article 74 bis | Fine of EGP 50-100 for driving below minimum speed causing traffic obstruction. |
| **Weight limits** | Ministry of Transport Decree No. 149 of 2024 | Axle load limits enforced at weighbridges. Overweight vehicles fined and impounded until excess removed. General Authority for Roads, Bridges and Land Transport is enforcement authority. |
| **Vehicle dimensions** | Executive Regulations Article 133 | Max length: 12m (two-axle). Max width: 2.6m. Max height: 3.5m (within cities). |
| **Cargo load violations** | Article 74 (original) | Fine of EGP 50-200 for violating weight, height, width, or length of load. Note: December 2025 amendments increased these significantly. |
| **Unsecured/hazardous cargo** | Article 72 bis 2 (Dec 2025 amendment) | EGP 5,000 to 15,000 for: transporting flammable/harmful materials that leak or spill, carrying loads that damage road surface, dumping construction debris. |
| **Environmental violations (smoke, noise)** | Article 72 bis 2 (Dec 2025 amendment) | EGP 5,000 to 15,000 for excessive smoke, foul odors, loud noise. |
| **DUI (no accident)** | Article 76 | 3 months to 1 year imprisonment + EGP 500-1,000 fine. |
| **DUI (repeat within 1 year)** | Article 76 | Double penalties. |
| **DUI causing injury** | Article 76 | Up to 2 years imprisonment + EGP 10,000 fine. |
| **DUI causing death** | Article 76 | 3-7 years imprisonment + minimum EGP 20,000 fine. |
| **Driving without valid license** | Dec 2025 amendments | Up to 1 year prison + up to EGP 5,000 fine. Doubled for repeat. Mandatory imprisonment for third offense. |
| **License plate tampering** | Dec 2025 amendments | Up to 1 year prison + up to EGP 5,000 fine. |
| **Expired registration** | Dec 2025 amendments | Administrative impoundment + retroactive annual tax + 1/3 annual tax levy (capped at 5 years). |
| **Commercial vehicle license category violations** | Dec 2025 amendments | Fines up to EGP 30,000 for breaching regulations governing specific vehicle categories. |
| **Annual commercial vehicle fee** | Dec 2025 amendments | EGP 2,500 annually for commercial vehicles. |
| **Commercial driving license** | Traffic Law Chapter on Licenses (amended by Law 17 of 2024) | Three-tier professional license: Third Degree (up to 1.5 tons), Second Degree (heavy transport, requires 2yr at Third), First Degree (all vehicles, requires 2yr at Second). Valid 3 years. |
| **Drug testing (pre-license)** | Decision No. 1741 of 2025 | Mandatory drug screening before license issuance or renewal. |
| **Vehicle technical inspection** | Executive Regulations (Ministerial Decision 1613/2008) | Annual inspection: brakes, tires, lights, engine, fire extinguisher, mirrors, chassis. |
| **Electronic signatures (POD validity)** | Law No. 15 of 2004, Articles 14-15 | E-signatures have same legal effect as handwritten. Digital delivery notes valid if timestamped, source-verifiable, and tamper-evident. |

### What the Platform Must Track Per Driver/Vehicle

Based on the above articles, the driver app and fleet management system must enforce:

1. Speed limiter certification status per vehicle (EOSQ certificate number, expiry)
2. Professional license grade per driver (Third/Second/First) matched against assigned vehicle class
3. License expiry date (3-year cycle) with 30-day advance renewal alert
4. Annual vehicle inspection date and next-due
5. Drug test date per driver (required at license renewal)
6. Real-time speed monitoring against road-type-specific limits
7. Load dimension validation workflow (photo-based) at pickup
8. Commercial vehicle annual fee payment status (EGP 2,500)

---

## 3. DECEMBER 2025 TRAFFIC LAW AMENDMENTS

### What Changed (Cabinet Approval: December 24, 2025)

On December 24, 2025, Egypt's cabinet approved amendments to Traffic Law No. 66 of 1973. These are the most significant changes affecting building materials delivery:

### New and Increased Fines

| Violation | Previous Penalty | New Penalty (Dec 2025) |
|-----------|-----------------|----------------------|
| Speeding on designated roads | Varied, generally EGP 100-500 | EGP 2,000 to 10,000 |
| Dumping construction debris on roads | Minor fine | EGP 5,000 to 15,000 |
| Transporting unsecured loads that spill/leak | EGP 50-200 (Article 74) | EGP 5,000 to 15,000 (Article 72 bis 2) |
| Excessive vehicle smoke/emissions | Minor fine | EGP 5,000 to 15,000 |
| Driving without circulation license | Fine | Up to 1 year prison + EGP 5,000 |
| License plate tampering/concealment | Fine | Up to 1 year prison + EGP 5,000 |
| Expired vehicle registration | Fine | Impoundment + retroactive tax + 1/3 annual levy |
| Vehicle category regulation breaches | Varied | Up to EGP 30,000 |

### Repeat Offender Escalation

The December 2025 amendments introduce a formal escalation system:
- **Second offense:** Doubled fines and license suspension
- **Third offense:** Mandatory imprisonment (no option for fine-only)

### New Annual Commercial Vehicle Fee

Commercial vehicles now pay **EGP 2,500 annually** as a dedicated commercial vehicle fee.

### Impact on Building Materials Delivery

| Area | Impact | Platform Response |
|------|--------|------------------|
| **Load securement** | Spill/leak fines increased 25-75x (from ~EGP 200 to EGP 5,000-15,000). This makes unsecured cement bags, loose rebar, or uncovered sand loads extremely expensive violations. | Driver app MUST require load securement photos before marking "departed." Pre-departure checklist enforced. |
| **Construction debris** | Dumping fines now EGP 5,000-15,000. Drivers who leave packaging debris at delivery sites create liability. | POD workflow must include "site cleanup confirmed" checkbox. Customer signs off on clean delivery. |
| **Speeding** | Fines 4-20x higher. With mandatory speed limiters from Jan 1, 2026, and higher fines, speeding enforcement is real. | Speed limiter certification tracked per vehicle. GPS speed monitoring with automatic alerts in driver app. |
| **Vehicle documentation** | Expired registration = impoundment + retroactive fees. This can take a truck out of service for days. | 60-day advance alerts for registration renewal. Fleet dashboard shows compliance status per vehicle. |
| **Driver licensing** | Third offense = mandatory imprisonment. Drivers with prior violations are higher risk. | Violation history tracked in driver profile. Drivers with 2+ violations flagged for review before dispatch. |

### Sources

- [Daily News Egypt: Egyptian cabinet approves tougher traffic law penalties](https://www.dailynewsegypt.com/2025/12/24/egyptian-cabinet-approves-tougher-traffic-law-penalties-to-improve-road-safety/)
- [SIS Egypt: Cabinet approves tougher traffic law penalties](https://sis.gov.eg/en/media-center/news/egypt-cabinet-approves-tougher-traffic-law-penalties-to-curb-road-accidents/)
- [Ahram Online: Tougher traffic law penalties](https://english.ahram.org.eg/News/559276.aspx)
- [Egypt Independent: New fines of up to LE 15,000](https://www.egyptindependent.com/new-fines-of-up-to-le-15000-for-road-pollution-and-traffic-violations/)
- [Resolute Dynamics: Speed Limiters Mandatory in Egypt 2026](https://speed.resolute-dynamics.com/blog/are-speed-limiters-mandatory-in-egypt/)

---

## 4. MULTI-DEVICE CEO AUTHENTICATION

### Decision: Concurrent Sessions Allowed on All Devices

**How it works with Supabase Auth:**

Supabase Auth issues independent JWT access tokens per device session. Each login creates a separate session record with its own `refresh_token`. There is no built-in "single active session" constraint -- concurrent sessions are the default behavior.

**Session management for Karim (CEO):**

| Device | Login Method | Session |
|--------|-------------|---------|
| iPhone (primary) | Face ID -> Supabase session via cookie | Independent session, `Domain=.hyperquote.net` |
| iPad | Face ID -> Supabase session via cookie | Independent session, same cookie domain |
| MacBook | Password + MFA -> Supabase session via cookie | Independent session, same cookie domain |

**Key behaviors:**

1. **Simultaneous login:** All devices can be logged in at the same time. This is standard B2B executive behavior -- no need to restrict it.
2. **Session isolation:** Actions on one device do not force logout on another. Each device has its own access_token/refresh_token pair.
3. **Real-time sync:** Supabase Realtime ensures that if Karim routes a task on his phone, his iPad reflects the change within seconds (via `postgres_changes` subscription invalidating TanStack Query cache).
4. **Token refresh:** Each device independently refreshes its JWT via `@supabase/ssr` before the access_token expires (default 1 hour). If one device goes offline for days, it uses its refresh_token to get a new access_token on reconnect.
5. **Logout:** Logging out on one device does NOT log out other devices. If a forced global logout is needed (e.g., phone stolen), an admin can revoke all refresh tokens via Supabase Admin API (`auth.admin.signOut(userId, 'global')`).
6. **Session limits:** Optional -- cap at 5 concurrent sessions per user. Supabase does not enforce this natively, but a Custom Access Token Hook could check `auth.sessions` table count and reject if exceeded.

**Security for CEO specifically:**
- MFA is required on first login per device (TOTP or SMS OTP)
- After MFA verification, biometric (Face ID / fingerprint) unlocks the existing session on subsequent opens
- Session timeout: 30 days of inactivity (configurable via Supabase Auth settings)
- All CEO sessions logged in `audit_log` with device fingerprint

---

## 5. BIOMETRIC AUTH FAILURE FALLBACK

### Decision: Three-Step Fallback Chain

The CEO app and all HyperQuote apps use a graceful degradation chain when biometric authentication fails:

```
Attempt 1: Face ID (iOS) / Face Unlock (Android)
  |
  +--> Fails (sunlight glare, mask, wet face, camera blocked)
  |
Attempt 2: Fingerprint (Touch ID / Android Fingerprint)
  |
  +--> Fails (wet hands, dirty hands, cut finger, gloves)
  |
Attempt 3: Device PIN / Pattern / Password
  |
  +--> Fails (forgotten, too many attempts)
  |
Attempt 4: Supabase session still valid --> Password login
  |
  +--> Fails (forgotten password)
  |
Attempt 5: OTP via SMS to registered phone number
```

### Implementation Detail

**Biometric is NOT the authentication method -- it is the device unlock for an existing Supabase session.** The distinction matters:

1. **First login on a new device:** Email/phone + password + MFA (TOTP or SMS OTP). This creates the Supabase session. Biometric is not involved.
2. **Subsequent app opens:** The Supabase session cookie exists. The app shows a biometric prompt as a **local device lock** -- verifying the person holding the phone is the account owner. This uses the Web Authentication API (`navigator.credentials`) or Capacitor's biometric plugin.
3. **Biometric failure:** Falls back to device-level PIN/pattern (this is handled by the OS, not by the app). If the user passes device PIN, the existing Supabase session is unlocked.
4. **Device lock failure (3 failed PIN attempts):** The app requires a full re-authentication: email + password + MFA.
5. **Password forgotten:** Standard Supabase Auth password reset flow via email (Resend) or SMS OTP (Twilio).

### Construction Site Scenario

A CEO or driver at a construction site with dusty/wet hands:
- Face ID fails due to dust on camera -> fingerprint fails due to dirty hands -> device PIN (numeric) works fine with dirty hands
- The PIN fallback is always available and is the most reliable in harsh conditions
- No app-specific PIN is needed -- the OS-level device lock is sufficient and avoids yet another credential to manage

---

## 6. CEO APP FIRST-TIME ONBOARDING

### Decision: No Tutorial, No Wizard, Straight to the Interface

**Rationale:** The CEO app's entire design philosophy is radical minimalism. A tutorial or setup wizard contradicts this. The interface has exactly one interaction point (the search bar), which is self-explanatory.

**First-time experience:**

1. CEO receives an invitation link from the admin (sent via internal onboarding process)
2. CEO opens the link, creates password, sets up MFA (TOTP app or SMS)
3. CEO installs the PWA to home screen (prompted by browser)
4. CEO opens the app for the first time

**What Karim sees on first open:**

```
[Pure white space]

Good morning, Karim

[Search bar with rotating placeholder: "Search employees, customers, orders..."]
```

That is it. No tutorial overlay. No feature highlights. No "Did you know?" cards. No setup wizard.

**Why this works:**
- The app has ONE interaction model: type in the search bar. There is nothing to teach.
- If Karim types characters, he gets instant database search results.
- If Karim types a question and presses Enter, he gets AI conversation.
- If there are urgent items, "X items need attention" appears below the greeting. Tapping it reveals the list.

**The only concession to onboarding:**
- The rotating placeholder text in the search bar acts as a subtle hint: "Search employees, customers, orders..." then "Ask about revenue, margins, deliveries..." then "Try: 'How did we do this month?'"
- The placeholder cycles every 4 seconds, showing 3-4 examples, then stops on a generic placeholder
- This teaches by example without any modal, overlay, or wizard

**If the system has no data yet (pre-launch):**
- The greeting shows with no attention items (nothing needs attention because nothing has happened)
- Searching returns empty results with the message "No results for [query]"
- AI conversation works immediately (connected to company configuration data even before operational data exists)

---

## 7. CEO APPROVAL QUEUE FROM CEO APP

### Decision: Approvals Surface Through the Attention System and AI Chat

The CEO app has no traditional approval queue screen, no inbox, no task list. Approvals surface through the two existing interaction patterns:

### Pattern 1: Attention Items (Passive Surfacing)

Items requiring CEO approval are included in the `ceo_attention_items` materialized view. They appear in the "X items need attention" count on the home screen.

```
4 items need attention

[Warning badge] Credit limit increase -- Delta Builders -- EGP 2M -> 5M
              Requested by Mona (Credit Manager), Mar 28

[Warning badge] Discount override -- QT-1210 -- 18% discount (floor: 12%)
              Requested by Ahmed (Sales Rep), Mar 29

[Info badge] PO approval -- PO-892 -- EGP 4,200,000 (above PO threshold)
             Requested by Procurement, Mar 29

[Info badge] New supplier onboarding -- Sahara Cement Co.
             Submitted by Procurement, Mar 28
```

**Tapping any item** opens its detail view with full context and action buttons:

```
Credit Limit Increase Request

Customer: Delta Builders (Tier 3 -- Established)
Current limit: EGP 2,000,000
Requested limit: EGP 5,000,000
Requested by: Mona (Credit Manager)

Justification:
  Annual purchases: EGP 18,400,000
  Payment score: 92/100
  On-time rate: 96%
  Customer since: Jan 2024
  Current AR: EGP 1,200,000 / EGP 2,000,000 (60% utilized)

Mona's recommendation: Approve at EGP 4,000,000 (conservative)

[Approve at 5M]    [Approve at 4M]    [Deny]    [Ask Mona]
```

Action buttons are contextual. "Ask Mona" opens a compose overlay that creates an internal message routed to Mona.

### Pattern 2: AI Chat (Active Querying)

Karim can ask the AI about pending approvals:

```
Karim: what needs my approval

AI: You have 4 items pending your approval:

1. Credit limit increase -- Delta Builders (EGP 2M -> 5M)
   Mona recommends EGP 4M. Payment score 92.

2. Discount override -- QT-1210 (18%, floor 12%)
   Ahmed's largest deal this quarter. Margin would be 8.2%.

3. PO approval -- PO-892 (EGP 4.2M)
   Nile Cement quarterly restock. Standard terms.

4. New supplier -- Sahara Cement Co.
   Procurement completed reference checks. 3 references positive.

Want me to show details on any of these?
```

Karim can then say "approve the PO and the supplier" and the AI executes both approvals (draft-review-confirm pattern: AI prepares the action, shows confirmation, Karim taps Confirm).

### Approval Thresholds (What Requires CEO Approval)

| Action | Threshold | Below Threshold Approver |
|--------|-----------|--------------------------|
| Credit limit increase | Any increase above EGP 1,000,000 | Credit Manager approves below this |
| Discount override | Any discount exceeding the role's floor margin by >5 points | Sales Director approves smaller overrides |
| Purchase order | Single PO above EGP 3,000,000 | Procurement Manager approves below this |
| New supplier activation | All new suppliers (Phase 1). Later: only strategic suppliers. | Procurement Manager auto-approves vetted commodity suppliers |
| Customer write-off | Any write-off above EGP 100,000 | Finance Director approves below this |

### Technical Implementation

- `ceo_attention_items` materialized view is refreshed every 5 minutes via `pg_cron`
- Approval actions write to the relevant table (e.g., `credit_applications.status = 'approved'`) with `approved_by = karim_user_id` and `approved_at = now()`
- All approvals logged in `audit_log` with full before/after state
- Push notification sent to CEO's devices when a new approval-required item enters the queue (Supabase Realtime -> service worker push)

---

## 8. DATA FRESHNESS INDICATORS

### Decision: Per-Section "Last Updated" Timestamp in Geist Mono

Data freshness is critical for a CEO making decisions on stale data. The system uses a layered approach:

### Layer 1: Materialized View Freshness (Attention Items, Metrics)

The `ceo_attention_items` and `ceo_metrics` materialized views are refreshed every 5 minutes. When displayed, a subtle timestamp appears:

```
March 2026 (MTD)
  Revenue:          EGP 18,400,000
  vs. Feb 2026:     +12.3%

                                    Updated 3 min ago
```

The "Updated X min ago" text is in Geist Mono 400, text-xs (10px), muted gray (text-gray-400). It appears at the bottom-right of each data section.

### Layer 2: Real-Time Data (Orders, Deliveries)

Data fetched via Supabase Realtime subscriptions is live. No staleness indicator needed -- the data updates as it changes. When the WebSocket connection is active, no timestamp is shown (the absence of a timestamp implies "live").

### Layer 3: Disconnected/Offline State

If the device loses internet connectivity:
- A subtle bar appears at the top of the screen: **"Offline -- showing data from 2:45 PM"** in Inter 400, text-sm, on a muted yellow-50 background
- The bar remains until connectivity is restored
- On reconnection, the bar says "Reconnecting..." then disappears, and data refreshes

### Layer 4: Stale Data Warning

If a materialized view refresh fails (e.g., database issue) and data is older than 15 minutes:
- The "Updated" text changes color to warning semantic color (yellow-600): **"Updated 18 min ago"**
- If older than 30 minutes: error semantic color (red-600): **"Updated 34 min ago -- may be stale"**

### AI Responses

When the AI provides data, it includes the data source's freshness in its response:

```
AI: Revenue this month is EGP 18.4M (as of 5 minutes ago).
```

This is injected automatically by the AI system prompt, which includes the materialized view's `refreshed_at` timestamp in the context.

---

## 9. CEO APP SETTINGS SCREEN

### Decision: Minimal Settings, Accessible via Search

There is no settings icon or gear button visible in the CEO app UI. Settings are accessed by typing "settings" in the search bar.

### Settings Available

```
Settings

Appearance
  Theme: [Light] [Dark] [System]
  Language: [English] [Arabic]

Notifications
  Push notifications: [On/Off]
  Attention items: [All] [Critical only] [Off]
  Daily morning brief: [On/Off]
  Delivery alerts (high-value): [On/Off]
  Payment alerts (bounced cheques): [On/Off]

Alert Thresholds
  AR overdue alert after: [90] days
  Margin floor alert below: [10] %
  PO approval threshold: [EGP 3,000,000]
  Credit increase approval threshold: [EGP 1,000,000]

Reports
  Weekly summary email: [On/Off] -- [Sunday/Monday]
  Monthly report auto-generate: [On/Off] -- [1st/5th of month]

Account
  Change password
  Manage MFA devices
  Active sessions (view/revoke)

About
  Version: 1.0.0
  Last updated: Mar 29, 2026
```

### Design

- Settings screen follows the same design language: white space, Inter typography, no icons
- Each setting group has a header in Inter 500, text-sm, uppercase tracking-wide
- Toggle switches use the spatial glass style with green/gray states
- Numeric thresholds are editable with Geist Mono input fields
- Changes auto-save (no Save button) with a subtle toast confirmation

### Storage

Settings are stored in `user_preferences` table in Supabase, keyed by `user_id`. Synced across devices in real-time via Supabase Realtime.

---

## 10. EGYPTIAN CALENDAR AND HIJRI DATE SUPPORT

### Decision: Gregorian Only for All Business Documents. Hijri Dates as Optional Display.

**Rationale:**

Egypt's entire commercial and tax system runs on the Gregorian calendar:
- The Egyptian Tax Authority (ETA) e-invoicing system accepts Gregorian dates exclusively
- Tax filing periods are January 1 - December 31
- The Egyptian Civil Code, Commercial Code, and all business law reference Gregorian dates
- Bank statements, cheques, and financial instruments use Gregorian dates
- Construction contracts in Egypt use Gregorian dates

**This is different from Saudi Arabia**, where Hijri dates are legally required on many business documents (the Saudi fiscal year follows the Hijri calendar for government entities).

### Implementation

| Context | Calendar | Format |
|---------|----------|--------|
| **Invoices** | Gregorian only | "Mar 29, 2026" (English) / "29 مارس 2026" (Arabic) |
| **Quotes** | Gregorian only | Same format |
| **Delivery notes** | Gregorian only | Same format |
| **Cheque dates** | Gregorian only | Banks process Gregorian dates |
| **Contracts** | Gregorian only | Standard legal practice in Egypt |
| **E-invoices (ETA)** | Gregorian only | ETA API accepts ISO 8601 |
| **Customer portal display** | Gregorian primary | Optional Hijri secondary in user preferences |
| **Internal app display** | Gregorian only | No Hijri needed for operations |

### Optional Hijri Display

For customers who prefer to see Hijri dates (some construction companies with Gulf ownership):
- User preference toggle: "Show Hijri dates alongside Gregorian"
- When enabled, dates appear as: "Mar 29, 2026 (Shawwal 1, 1447)"
- Conversion uses `Intl.DateTimeFormat` with `calendar: 'islamic-umalqura'` -- native browser API, no external library needed
- Hijri dates are DISPLAY ONLY -- never stored, never used in business logic, never sent to ETA

---

## 11. CURRENCY FORMATTING (EGP)

### Decision: Dual Format Based on Language Context

| Context | Format | Example |
|---------|--------|---------|
| **English UI** | "EGP" prefix + Western Arabic numerals + comma thousand separator | `EGP 1,250,000.50` |
| **Arabic UI** | "ج.م" suffix + Eastern Arabic numerals + comma thousand separator | `١٬٢٥٠٬٠٠٠٫٥٠ ج.م` |
| **Bilingual documents** (invoices, quotes) | Both formats on the same document | Amount line: `EGP 1,250,000.50` / `١٬٢٥٠٬٠٠٠٫٥٠ ج.م` |
| **Geist Mono display** (CEO app, dashboards) | Always Western Arabic numerals + "EGP" | `EGP 1,250,000` |
| **WhatsApp messages** | "EGP" prefix + Western Arabic numerals | `EGP 1,250,000` (most readable in chat context) |
| **ETA e-invoices** | Numeric only, no symbol | `1250000.50` (ISO format in JSON/XML) |

### Formatting Rules

1. **Thousand separator:** Always comma (`,`) in both English and Arabic. Egypt uses comma as thousand separator, not period.
2. **Decimal separator:** Period (`.`) in English mode. Arabic comma (`٫`) in Arabic mode with Eastern Arabic numerals.
3. **Decimal places:** 2 for invoices/payments (EGP 1,250,000.50). 0 for display in CEO app and dashboards (EGP 1,250,000) unless sub-pound precision matters.
4. **Symbol placement:** "EGP" before the number in English. "ج.م" after the number in Arabic.
5. **Negative amounts:** Parentheses for accounting contexts: `(EGP 50,000)`. Minus sign for general display: `-EGP 50,000`.

### Implementation

Use `Intl.NumberFormat` with `locale: 'en-EG'` (English in Egypt) or `locale: 'ar-EG'` (Arabic in Egypt):

```typescript
// English format
new Intl.NumberFormat('en-EG', {
  style: 'currency',
  currency: 'EGP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
}).format(1250000.50)
// Result: "EGP 1,250,000.50"

// Arabic format (Eastern Arabic numerals automatic)
new Intl.NumberFormat('ar-EG', {
  style: 'currency',
  currency: 'EGP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
}).format(1250000.50)
// Result: "١٬٢٥٠٬٠٠٠٫٥٠ ج.م."
```

### CEO App Exception

The CEO app always uses Western Arabic (Latin) numerals in Geist Mono regardless of language setting, because Geist Mono does not include Eastern Arabic numeral glyphs and financial figures must remain instantly parseable.

---

## 12. DEEP LINK BEHAVIOR BETWEEN PWAs

### Decision: Open in Browser Tab, Not Inside PWA Shell

When Karim is in the CEO PWA (`ceo.hyperquote.net`) and taps a link to the internal app (`app.hyperquote.net`), the behavior depends on the platform:

### Cross-Subdomain Navigation in PWAs

PWA `scope` is defined per subdomain. The CEO app manifest declares `scope: "/"` on `ceo.hyperquote.net`. When a navigation targets a different origin (`app.hyperquote.net`), the PWA cannot handle it within its own scope.

| Scenario | Behavior |
|----------|----------|
| CEO PWA taps link to `app.hyperquote.net/hr/employees/...` | **Opens in the device's default browser** as a new tab, outside the PWA standalone window. If the Internal app is also installed as a separate PWA, some browsers (Chrome 120+) may open it in that PWA's standalone window instead. |
| Internal PWA taps link to `ceo.hyperquote.net/...` | Same -- opens in browser or CEO PWA if installed. |
| Links within same subdomain | Stay inside the PWA shell. Normal SPA navigation. |
| Browser (non-PWA) accessing any subdomain | Standard browser tab behavior. Links between subdomains work normally. |

### Auth Continuity

Regardless of which app opens, authentication is seamless:
- All apps share the Supabase session cookie on `Domain=.hyperquote.net`
- When the internal app opens in a new browser tab, Karim is already authenticated
- No re-login required, no MFA re-prompt (the session cookie is valid across all subdomains)

### UX Implications

1. **Chrome on Android/Desktop:** Shows a thin URL bar at the top when navigating outside scope, making it clear the user left the PWA. This is acceptable -- the CEO app's links to the internal app are intentional "deep dives" into full operational data.
2. **Safari on iOS:** Opens in Safari rather than the PWA standalone window. The back gesture returns to Safari, not the CEO PWA. Karim switches back to the CEO PWA via the iOS app switcher.
3. **Mitigation:** Deep links in the CEO app are clearly labeled as external: "View full profile in HR -->" with the arrow indicating it opens another app. This sets the correct expectation.

### URL Handler Registration (Future Enhancement)

Chrome supports `"url_handlers"` in the PWA manifest (currently behind a flag). This would allow `app.hyperquote.net` to register as a handler for its URLs, so tapping a link to it from the CEO app would open the Internal PWA directly. Monitor this API for production readiness.

---

## 13. SUPPLIER CONTRACT TERMS MANAGEMENT

### Decision: Stored in Database + RAG-Searchable Documents

Supplier contract terms operate at two levels: structured data in the database (for automated enforcement) and unstructured documents (for reference and AI-powered querying).

### Structured Contract Data (Database)

The existing `contract_prices` table (from `RESEARCH-Complete-Supabase-Database-Design.md`, migration `016_products.sql`) stores pricing agreements. Extend the supplier domain with:

```sql
-- Supplier framework agreements
CREATE TABLE public.supplier_agreements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  agreement_type agreement_type NOT NULL,  -- 'framework', 'exclusive', 'preferred', 'spot'

  -- Terms
  start_date DATE NOT NULL,
  end_date DATE,                           -- NULL = open-ended
  auto_renew BOOLEAN DEFAULT false,
  notice_period_days INTEGER DEFAULT 30,

  -- Volume commitments
  minimum_volume_qty NUMERIC,              -- e.g., 10,000 bags/quarter
  minimum_volume_period period_type,       -- 'monthly', 'quarterly', 'annual'
  volume_shortfall_penalty TEXT,           -- Free text describing penalty

  -- Exclusivity
  exclusive_products UUID[],               -- Array of product_ids with exclusivity
  exclusive_regions TEXT[],                -- e.g., ['cairo', 'giza', 'upper_egypt']

  -- Price escalation
  price_escalation_type escalation_type,   -- 'fixed', 'cpi_linked', 'quarterly_review', 'none'
  price_escalation_cap NUMERIC,            -- Maximum annual increase % (e.g., 10%)
  price_escalation_formula TEXT,           -- Human-readable formula

  -- Payment terms
  payment_terms TEXT,                      -- e.g., 'Net 30 from delivery'
  early_payment_discount NUMERIC,          -- e.g., 2.0 (means 2% discount for early payment)

  -- Documents
  contract_document_url TEXT,              -- R2 storage URL for signed PDF

  -- Status
  status agreement_status NOT NULL DEFAULT 'draft',
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE TYPE agreement_type AS ENUM ('framework', 'exclusive', 'preferred', 'spot');
CREATE TYPE escalation_type AS ENUM ('fixed', 'cpi_linked', 'quarterly_review', 'market_review', 'none');
CREATE TYPE agreement_status AS ENUM ('draft', 'pending_approval', 'active', 'expired', 'terminated');
```

### How Contracts Affect Quoting

The pricing engine's rule priority cascade (from `RESEARCH-Live-Quoting-Instant-Pricing.md`) already includes contract prices. The lookup order:

1. **Customer-specific negotiated price** (from previous quotes/deals)
2. **Contract price** (from `contract_prices` table, linked to `supplier_agreements`)
3. **Supplier price list** (latest published price from supplier portal)
4. **Market price** (average of all supplier prices for the product)

When a contract exists with volume commitments, the quoting system:
- Checks volume consumed against commitment (e.g., "7,200 bags ordered this quarter out of 10,000 commitment")
- If under-committed, flags to procurement: "Order more from Nile Cement -- 2,800 bags short of quarterly commitment"
- If exclusive products, prevents sourcing from other suppliers for those products in those regions

### Who Manages Contracts

| Action | Responsible Role |
|--------|-----------------|
| Negotiate terms | Procurement Manager |
| Draft agreement in system | Procurement Officer |
| Review and approve | Procurement Manager + CEO (if above threshold) |
| Upload signed document | Procurement Officer |
| Monitor volume commitments | Procurement Officer (automated alerts) |
| Trigger renewal/renegotiation | System auto-alerts 60 days before expiry |

### AI/RAG Integration

Contract PDFs uploaded to R2 are parsed and embedded into pgvector. The CEO can ask:
- "What's our agreement with Nile Cement?"
- "When does the Sahara Steel exclusive expire?"
- "Which suppliers have price escalation caps below 8%?"

The AI searches both structured data (database) and unstructured documents (vector search on contract text).

---

## 14. API SPECIFICATION FOR SUPPLIER STOCK SYNC

### Decision: REST API with API Key Authentication

For suppliers who want to automate stock updates (instead of using the portal UI or WhatsApp), HyperQuote provides a simple REST API.

### Base URL

```
https://api.hyperquote.net/supplier/v1
```

Deployed as a dedicated Cloudflare Worker route, separate from the Supplier Portal app.

### Authentication

| Method | Details |
|--------|---------|
| **API Key** | Issued per supplier via Supplier Portal settings. Header: `Authorization: Bearer {api_key}` |
| **Scoping** | Each API key is scoped to one `supplier_id`. Cannot access other suppliers' data. |
| **Rate Limiting** | 100 requests/minute per supplier (burst: 20 requests/second). 429 Too Many Requests on exceeded. |
| **IP Allowlisting** | Optional. Supplier can restrict API key to specific IP addresses. |

### Endpoints

#### Update Stock for a Single Product

```
PATCH /products/{product_id}/stock
Content-Type: application/json
Authorization: Bearer sk_sup_...

{
  "available_qty": 5000,
  "unit": "bags",
  "price_per_unit": 92.50,
  "currency": "EGP",
  "location": "cairo_warehouse",    // Optional: supplier's warehouse location
  "lead_time_days": 2,              // Optional: days to deliver
  "notes": "New batch arriving Thursday"  // Optional
}

Response 200:
{
  "product_id": "...",
  "supplier_id": "...",
  "available_qty": 5000,
  "price_per_unit": 92.50,
  "updated_at": "2026-03-29T10:30:00Z"
}
```

#### Bulk Stock Update

```
PUT /stock/bulk
Content-Type: application/json
Authorization: Bearer sk_sup_...

{
  "updates": [
    {
      "product_id": "...",
      "available_qty": 5000,
      "price_per_unit": 92.50
    },
    {
      "product_id": "...",
      "available_qty": 0,
      "price_per_unit": null    // null = keep existing price
    }
  ]
}

Response 200:
{
  "updated": 2,
  "failed": 0,
  "errors": []
}
```

Maximum 500 items per bulk request.

#### Get My Products

```
GET /products
Authorization: Bearer sk_sup_...

Response 200:
{
  "products": [
    {
      "product_id": "...",
      "name": "OPC Cement 50kg",
      "sku": "NCC-OPC-50",
      "current_stock": 5000,
      "current_price": 92.50,
      "last_updated": "2026-03-29T10:30:00Z"
    }
  ],
  "total": 42,
  "page": 1,
  "per_page": 50
}
```

#### Webhook (Stock Change Notifications to Supplier)

Suppliers can register a webhook URL to receive notifications when HyperQuote needs stock:

```
POST /webhooks
Authorization: Bearer sk_sup_...

{
  "url": "https://supplier-erp.example.com/hyperquote-webhook",
  "events": ["stock_inquiry", "po_created", "po_updated"],
  "secret": "whsec_..."  // For HMAC signature verification
}
```

### Error Handling

Standard HTTP status codes. All errors return:
```json
{
  "error": "PRODUCT_NOT_FOUND",
  "message": "Product abc-123 does not belong to your supplier account",
  "request_id": "req_..."
}
```

### Versioning

API is versioned in the URL path (`/v1`). Breaking changes increment the version. Non-breaking additions (new optional fields) do not.

---

## 15. REGIONAL PRICING FOR LARGE SUPPLIERS

### Decision: Location-Based Price Lists with Region Tagging

Large suppliers like Nile Cement want different prices for different delivery regions because their own logistics costs vary (factory in Suez, delivery to Cairo is cheap, delivery to Aswan is expensive).

### Data Model

The existing `supplier_price_lists` table is extended with a region dimension:

```sql
-- Each supplier can have multiple price lists, each for a region
ALTER TABLE supplier_price_lists
  ADD COLUMN region region_code;  -- NULL = nationwide/default pricing

CREATE TYPE region_code AS ENUM (
  'cairo_giza',        -- Greater Cairo + Giza
  'delta',             -- Nile Delta governorates
  'alexandria',        -- Alexandria + Beheira
  'canal',             -- Suez Canal zone (Suez, Ismailia, Port Said)
  'upper_egypt_north', -- Minya, Beni Suef, Fayoum
  'upper_egypt_south', -- Assiut, Sohag, Qena, Luxor, Aswan
  'sinai',             -- North & South Sinai
  'red_sea',           -- Red Sea governorate
  'matrouh'            -- Marsa Matrouh / Western Desert
);
```

### Pricing Resolution

When the sales rep builds a quote, the pricing engine resolves prices in this order:

1. Look up the **customer's delivery address** and map it to a `region_code`
2. Check if the selected supplier has a **region-specific price list** for that region
3. If yes: use the regional price
4. If no: fall back to the supplier's **default (nationwide) price list**
5. If no default: use the last known price or flag for manual pricing

### Supplier Portal UX

In the Supplier Portal, a large supplier sees:

```
Price Management

[Tab: All Regions] [Tab: Cairo/Giza] [Tab: Delta] [Tab: Upper Egypt] ...

Cairo/Giza Prices (23 products)
  OPC Cement 50kg          EGP 92.50/bag     [Edit]
  SRC Cement 50kg          EGP 105.00/bag    [Edit]
  ...

Upper Egypt South Prices (23 products)
  OPC Cement 50kg          EGP 98.00/bag     [Edit]    +5.95% vs Cairo
  SRC Cement 50kg          EGP 112.00/bag    [Edit]    +6.67% vs Cairo
  ...

[Copy Cairo prices to new region] [Bulk adjust: +X% for region]
```

### Convenience Features

- **Copy and adjust:** Supplier copies Cairo prices to Upper Egypt and applies a +6% markup across all products in one action
- **Bulk percentage adjustment:** "Increase all Upper Egypt prices by 3%" -- applies to all products in that region
- **Price comparison view:** Side-by-side view of same product across all regions

---

## 16. PRODUCT MATCHING AND DEDUPLICATION

### Decision: Master Product Catalog with Manual Mapping, AI-Assisted Suggestions

### The Problem

Supplier A lists "OPC Cement 50kg - Al-Masriya Brand"
Supplier B lists "Ordinary Portland Cement, 50 Kg bag (Al-Masriya)"
Supplier C lists "اسمنت بورتلاندي عادي ٥٠ كجم المصرية"

These are all the same product. The system must know this.

### Architecture: Three-Layer Product Model

```
LAYER 1: MASTER PRODUCT CATALOG (HyperQuote-managed)
  - Canonical product records with standardized names, specs, and categories
  - Created and maintained by Procurement team
  - Example: { name: "OPC Cement 50kg", brand: "Al-Masriya", category: "cement/opc" }

LAYER 2: SUPPLIER PRODUCT LISTINGS (Supplier-managed)
  - Each supplier's own product names, SKUs, and descriptions
  - Uploaded via portal, CSV, or AI catalog parsing
  - Example: { supplier_name: "Ordinary Portland Cement, 50 Kg bag", supplier_sku: "AMS-OPC50" }

LAYER 3: MAPPING TABLE (product_suppliers)
  - Links supplier listings to master products
  - Many-to-one: multiple supplier listings -> one master product
  - Example: { master_product_id: "...", supplier_id: "...", supplier_sku: "AMS-OPC50" }
```

### The `product_suppliers` Table (Already Exists)

From `RESEARCH-Complete-Supabase-Database-Design.md`, the `product_suppliers` table serves exactly this mapping role:

```sql
-- Already designed in migration 016_products.sql
CREATE TABLE product_suppliers (
  id UUID PRIMARY KEY,
  product_id UUID REFERENCES products(id),       -- Master product
  supplier_id UUID REFERENCES suppliers(id),
  supplier_sku TEXT,                               -- Supplier's own SKU
  supplier_product_name TEXT,                      -- Supplier's own name for the product
  is_primary_supplier BOOLEAN DEFAULT false,
  lead_time_days INTEGER,
  minimum_order_qty NUMERIC,
  -- pricing linked via supplier_price_lists
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Matching Workflow

**When a new supplier uploads a catalog:**

1. **AI Catalog Parsing** (Mistral OCR or Claude Vision) extracts structured product data from PDF/CSV
2. **AI Matching Suggestions:** For each extracted product, the system runs:
   - Exact match on brand + category + weight/size
   - Fuzzy match on product name using `pg_trgm` similarity (threshold: 0.6)
   - Embedding similarity search on product descriptions via pgvector (threshold: 0.85)
3. **Procurement Review UI:** Side-by-side view showing supplier's product and suggested master product matches:

```
Supplier Product                          Suggested Match (Confidence)
------------------------------------------------------------------
"Ordinary Portland Cement, 50 Kg"    -->  OPC Cement 50kg - Al-Masriya (94%)  [Accept] [Reject]
"SRC Cement Type V 50kg"             -->  SRC Cement 50kg (89%)               [Accept] [Reject]
"حديد تسليح ١٢ مم"                   -->  Rebar 12mm (91%)                    [Accept] [Reject]
"Special Waterproof Additive 20L"    -->  [No match found]                    [Create New Master Product]
```

4. **Manual Override:** Procurement officer can reject AI suggestions and manually map, or create new master products for genuinely new items
5. **Learning:** Accepted and rejected matches feed back into the matching model's training data

### No Fully Automatic Deduplication

Product matching is NEVER fully automatic. The AI suggests, the human confirms. This is critical because:
- A wrong match means wrong pricing (quoting Al-Masriya cement at Sinai Cement's price)
- A wrong match means wrong availability data
- Building materials have subtle spec differences that matter (OPC vs SRC vs white cement all look similar but are different products)

---

## 17. SUPPLIER CHANNEL CONFLICT

### Decision: Acknowledge It, Price Strategically, Differentiate on Service

Channel conflict is inherent in distribution. A supplier selling through HyperQuote AND directly to some customers is not a problem to solve -- it is a market reality to navigate.

### Strategy

| Concern | Approach |
|---------|----------|
| **Price consistency** | HyperQuote does NOT guarantee matching supplier-direct prices. HyperQuote adds margin for its service (logistics, credit, project management, consolidated ordering). If a customer can get a better price going direct, they should -- HyperQuote's value is not being the cheapest, it is being the most convenient. |
| **Customer confusion** | If a customer says "I can get this for EGP 85 direct from Nile Cement," the sales rep's response is: "That price doesn't include delivery to your site, credit terms, consolidated invoicing for your whole project, or our quality guarantee. Our price of EGP 92 includes all of that." |
| **Supplier undercutting** | If a supplier systematically undercuts HyperQuote on the supplier's own direct-sales customers, that supplier's priority ranking decreases in the sourcing algorithm. The supplier gets fewer orders through HyperQuote. This is the leverage. |
| **Exclusive agreements** | For strategic suppliers, negotiate exclusive distribution for specific regions or customer segments via `supplier_agreements` (see Gap #13). Exclusivity is earned through volume. |
| **Information asymmetry** | Suppliers should NOT see which customers HyperQuote is quoting (customer identity is masked in POs -- the supplier sees "HyperQuote Order PO-892" not "Delta Builders wants 10,000 bags"). This prevents the supplier from going around HyperQuote. |

### Platform Enforcement

1. **PO anonymization:** Purchase orders sent to suppliers show "HyperQuote" as the buyer, never the end customer. Delivery address is the HyperQuote warehouse (for warehouse-routed orders) or a generic "Project Site - Cairo" (for direct deliveries).
2. **Supplier performance scoring:** Suppliers who frequently match or undercut HyperQuote's price to direct customers get flagged. The procurement team investigates.
3. **Multi-source quoting:** For every product, maintain 2-3 qualified suppliers. No single-supplier dependency. If one supplier becomes hostile, alternatives exist.
4. **Value-add lock-in:** Customers who use HyperQuote for credit terms, project tracking, consolidated ordering, and WhatsApp-based support become sticky. The switching cost is not price -- it is convenience.

---

## 18. NON-TECHNICAL SUPPLIER ONBOARDING

### Decision: Three Onboarding Tiers Based on Supplier Capability

Not every supplier can use a web portal. The system must support all literacy and technology levels.

### Tier 1: WhatsApp-Only Supplier (Lowest Tech)

**Target:** Small cement dealer, aggregate yard, local steel stockist. Barely uses smartphone beyond WhatsApp and phone calls.

**How it works:**

1. **Onboarding:** HyperQuote procurement officer calls the supplier, gets basic info (business name, contact, products, approximate prices). Procurement officer enters all data into the Internal Platform manually.
2. **Stock updates:** Supplier sends a WhatsApp message to HyperQuote's business number:
   - "Cement 50kg available 3000 bags at 90" (free text)
   - AI parses the message (Claude Haiku intent classification + entity extraction) and updates the supplier's stock in the system
   - System confirms: "Updated: OPC Cement 50kg, 3,000 bags at EGP 90. Correct?" [Yes] [No]
3. **Price updates:** Same WhatsApp flow. "Cement now 95" -> AI updates price -> confirmation sent.
4. **PO notification:** When HyperQuote creates a PO, the supplier receives a WhatsApp message with PO details. Supplier confirms by replying "OK" or tapping a [Confirm] button.
5. **No portal login, no app, no email required.**

### Tier 2: Basic Portal Supplier (Medium Tech)

**Target:** Mid-size supplier with someone who can use a computer or smartphone browser.

**How it works:**

1. **Onboarding:** Magic link sent via WhatsApp or SMS. No password to remember. Supplier clicks link, lands in a simplified portal view.
2. **Simplified portal:** Reduced UI showing only:
   - "My Products" -- list of products with editable quantity and price fields
   - "My Orders" -- incoming POs with [Confirm] / [Reject] buttons
   - "Messages" -- communication thread with HyperQuote
3. **Stock updates:** Edit quantity fields directly in the portal. Big [Save] button.
4. **Catalog upload:** Drag-and-drop PDF or photo of price list. AI parses it.

### Tier 3: Full Portal / API Supplier (High Tech)

**Target:** Large manufacturer like Nile Cement with IT staff. Wants to automate.

**How it works:**

1. **Full Supplier Portal access:** All features including analytics, price management by region, bulk operations, performance dashboard.
2. **API integration:** REST API (see Gap #14) for automated stock/price sync from their ERP.
3. **Webhook notifications:** Real-time PO notifications pushed to their system.

### Onboarding Process

| Step | Tier 1 | Tier 2 | Tier 3 |
|------|--------|--------|--------|
| Initial contact | Phone call | Phone + WhatsApp link | Meeting + technical kickoff |
| Data entry | HyperQuote staff enters | Supplier enters via simplified portal | Supplier's IT team via API/bulk upload |
| Product mapping | HyperQuote staff maps to master catalog | AI-assisted with supplier review | API with automated matching |
| Ongoing stock updates | WhatsApp messages | Portal edits | API sync |
| Training needed | None | 15-minute WhatsApp video walkthrough | API documentation + sandbox environment |

---

## 19. BULK OPERATIONS FOR LARGE SUPPLIERS

### Decision: CSV Upload, Bulk Edit UI, and API for Programmatic Updates

A supplier like Nile Cement with 200+ products needs efficient bulk operations.

### Bulk Price Update via CSV

```
Portal > Price Management > Bulk Update > Upload CSV

CSV format:
sku,region,new_price,effective_date
NCC-OPC-50,cairo_giza,92.50,2026-04-01
NCC-OPC-50,upper_egypt_south,98.00,2026-04-01
NCC-SRC-50,cairo_giza,105.00,2026-04-01
...
```

**Upload flow:**
1. Supplier uploads CSV (drag-and-drop or file picker)
2. System validates: all SKUs exist, all regions valid, prices are numbers, dates are valid
3. Preview screen shows changes: "142 prices will be updated across 3 regions"
4. Diff view: old price vs new price for each item, with percentage change highlighted
5. Supplier clicks [Apply All] or selects specific rows to apply
6. Changes are staged with `effective_date` -- they apply at midnight on that date

### Bulk Price Update via UI

```
Portal > Price Management > Cairo/Giza > Select All > Bulk Actions

[Increase by %] [Decrease by %] [Set fixed price] [Copy to other region]

Increase by: [5] %

Preview:
  OPC Cement 50kg    EGP 88.10 -> EGP 92.51    +5%
  SRC Cement 50kg    EGP 100.00 -> EGP 105.00   +5%
  White Cement 40kg  EGP 120.00 -> EGP 126.00   +5%
  ...200 more items...

[Cancel] [Apply to 203 products]
```

### Bulk Stock Update via CSV

Same flow as price update, different CSV format:

```
sku,available_qty,notes
NCC-OPC-50,15000,New shipment received
NCC-SRC-50,8000,
NCC-WHT-40,0,Out of stock until April
```

### Bulk Stock Update via API

See Gap #14, `PUT /stock/bulk` endpoint -- accepts up to 500 items per request.

### Monthly Price Update Workflow

For suppliers who update prices monthly:
1. System sends a reminder on the 25th of each month: "Monthly price update due by March 31"
2. Supplier downloads current price list as CSV (pre-filled with current prices)
3. Supplier updates prices in Excel/Numbers, re-uploads CSV
4. System validates, previews, and applies with effective date of the 1st

### Audit Trail

All bulk operations are logged:
- Who uploaded/applied the change
- Timestamp
- Before and after values for every affected row
- CSV file stored in R2 for reference

---

## 20. CUSTOMER NPS/FEEDBACK INTEGRATION

### Decision: Post-Delivery Survey via WhatsApp, Data Feeds into Account Health Score

### Survey Trigger and Channel

| Event | When Sent | Channel | Questions |
|-------|-----------|---------|-----------|
| **Delivery completed** | 2 hours after delivery confirmation | WhatsApp (primary), SMS (fallback) | 3 questions |
| **Large order completed** (>EGP 500K) | 24 hours after final delivery | WhatsApp + Email | 3 questions + optional comment |
| **Issue resolved** | 1 hour after support ticket closed | WhatsApp | 2 questions |

### Survey Design (3 Questions Max)

Industry research confirms: B2B surveys exceeding 3 questions see dramatically lower response rates and lower quality answers.

**Post-delivery survey:**

```
WhatsApp Message (Template: delivery_feedback):

Hi {name}, your delivery for {order_ref} is complete.

Quick feedback (takes 30 seconds):

1. How likely are you to recommend HyperQuote? (0-10)
   [0-3] [4-6] [7-8] [9-10]

2. Rate this delivery experience:
   [Poor] [OK] [Good] [Excellent]

3. Anything we should improve?
   [Reply with text or skip]
```

WhatsApp interactive buttons handle questions 1 and 2. Question 3 is a free-text reply.

### Data Storage

```sql
CREATE TABLE customer_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  customer_id UUID NOT NULL REFERENCES customers(id),
  order_id UUID REFERENCES orders(id),
  ticket_id UUID REFERENCES tickets(id),

  -- NPS
  nps_score INTEGER CHECK (nps_score BETWEEN 0 AND 10),
  nps_category TEXT GENERATED ALWAYS AS (
    CASE WHEN nps_score >= 9 THEN 'promoter'
         WHEN nps_score >= 7 THEN 'passive'
         ELSE 'detractor'
    END
  ) STORED,

  -- Experience rating
  experience_rating experience_rating,  -- 'poor', 'ok', 'good', 'excellent'

  -- Open text
  comment TEXT,
  comment_sentiment sentiment,  -- AI-classified: 'positive', 'neutral', 'negative'
  comment_topics TEXT[],        -- AI-extracted: ['delivery_speed', 'driver_behavior', 'product_quality']

  -- Meta
  survey_type TEXT NOT NULL,  -- 'post_delivery', 'post_issue', 'quarterly'
  channel TEXT NOT NULL,      -- 'whatsapp', 'sms', 'email', 'portal'
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Account Health Score Integration

Customer health score is a composite metric already partially defined in `RESEARCH-Customer-Tier-Progression-Credit-Management.md`. NPS/feedback adds a dimension:

| Health Score Component | Weight | Source |
|----------------------|--------|--------|
| Payment timeliness | 30% | `payments` table -- on-time percentage |
| Order frequency | 20% | `orders` table -- orders per quarter |
| Order value trend | 15% | `orders` table -- growing, stable, or declining |
| NPS score (rolling 12-month average) | 15% | `customer_feedback` table |
| Support ticket volume and resolution satisfaction | 10% | `tickets` + `customer_feedback` table |
| Engagement (portal logins, AI chat usage, reorder rate) | 10% | `audit_log` + `orders` table |

### Health Score Calculation

```sql
-- Materialized view refreshed daily via pg_cron
CREATE MATERIALIZED VIEW customer_health_scores AS
SELECT
  c.id AS customer_id,
  c.tenant_id,
  -- Payment health (30%)
  COALESCE(payment_scores.score, 50) * 0.30 AS payment_component,
  -- Order frequency (20%)
  COALESCE(order_freq.score, 50) * 0.20 AS frequency_component,
  -- Order value trend (15%)
  COALESCE(order_trend.score, 50) * 0.15 AS trend_component,
  -- NPS (15%)
  COALESCE(nps_avg.score, 50) * 0.15 AS nps_component,
  -- Support satisfaction (10%)
  COALESCE(support_scores.score, 50) * 0.10 AS support_component,
  -- Engagement (10%)
  COALESCE(engagement.score, 50) * 0.10 AS engagement_component,
  -- Total
  (COALESCE(payment_scores.score, 50) * 0.30 +
   COALESCE(order_freq.score, 50) * 0.20 +
   COALESCE(order_trend.score, 50) * 0.15 +
   COALESCE(nps_avg.score, 50) * 0.15 +
   COALESCE(support_scores.score, 50) * 0.10 +
   COALESCE(engagement.score, 50) * 0.10
  ) AS total_health_score,
  now() AS refreshed_at
FROM customers c
LEFT JOIN LATERAL (...) payment_scores ON true
LEFT JOIN LATERAL (...) order_freq ON true
LEFT JOIN LATERAL (...) order_trend ON true
LEFT JOIN LATERAL (...) nps_avg ON true
LEFT JOIN LATERAL (...) support_scores ON true
LEFT JOIN LATERAL (...) engagement ON true;
```

### Automated Actions Based on Health Score

| Health Score | Category | Automated Action |
|-------------|----------|-----------------|
| 80-100 | Healthy | No action. Candidate for tier upgrade review. |
| 60-79 | At Risk | Sales rep receives alert: "Delta Builders health declining -- schedule check-in." Account flagged for proactive outreach. |
| 40-59 | Unhealthy | Sales Manager alerted. Mandatory customer meeting within 1 week. Credit review triggered. |
| 0-39 | Critical | CEO attention item. Account freeze review. Emergency retention plan. |

### Detractor Rescue Flow

When a customer submits an NPS score of 0-6 (detractor):

1. **Immediate alert** to assigned sales rep (WhatsApp notification within 5 minutes)
2. **AI comment analysis:** If customer left a comment, AI extracts specific issues
3. **Ticket auto-created:** Support ticket with tag `nps_detractor_rescue` and priority `urgent`
4. **24-hour SLA:** Sales rep must make personal contact within 24 hours
5. **Follow-up survey:** 14 days after rescue contact, a brief follow-up: "Has your experience improved? [Yes] [Somewhat] [No]"

### Response Rate Optimization

- **Timing:** 2 hours post-delivery (customer is still engaged, not yet distracted)
- **Channel:** WhatsApp buttons (one-tap, no typing required for first 2 questions)
- **Brevity:** 3 questions maximum
- **No incentives:** B2B relationships should not need gift cards for feedback. The relationship itself is the incentive.
- **Frequency cap:** No more than 1 survey per customer per 2 weeks, regardless of how many deliveries occur. Survey the most recent/largest delivery if multiple qualify.

---

## SUMMARY

All 20 gaps now have clear decisions and implementation specifications:

| # | Gap | Resolution Type |
|---|-----|----------------|
| 1 | External integrations list | Reference table consolidating existing research |
| 2 | Traffic Law article citations | Specific article mapping with penalties |
| 3 | December 2025 amendments | New fine schedule with delivery impact analysis |
| 4 | Multi-device CEO auth | Concurrent sessions allowed, independent per device |
| 5 | Biometric fallback | 5-step fallback chain: Face ID -> Fingerprint -> Device PIN -> Password + MFA -> OTP |
| 6 | CEO first-time onboarding | No tutorial. Search bar placeholder text teaches by example. |
| 7 | CEO approval queue | Approvals surface via attention items + AI chat. No separate queue screen. |
| 8 | Data freshness | Per-section "Updated X min ago" in Geist Mono. Offline banner. Stale data color warnings. |
| 9 | CEO settings | Accessed via search bar. Theme, notifications, thresholds, reports, account. |
| 10 | Hijri calendar | Gregorian only for business. Optional Hijri display via `Intl.DateTimeFormat`. |
| 11 | EGP formatting | "EGP" prefix in English, "ج.م" suffix in Arabic. `Intl.NumberFormat` with locale-specific behavior. |
| 12 | PWA deep links | Cross-subdomain links open in browser tab. Auth seamless via shared cookie. |
| 13 | Supplier contracts | `supplier_agreements` table + RAG-searchable contract PDFs. Affects quoting priority. |
| 14 | Supplier stock API | REST API at `api.hyperquote.net/supplier/v1`. API key auth. 100 req/min. |
| 15 | Regional pricing | Region-tagged price lists. Resolves by delivery address -> region mapping. |
| 16 | Product matching | Master catalog + supplier mapping table. AI suggests matches, human confirms. |
| 17 | Channel conflict | PO anonymization. Differentiate on service, not price. Multi-source everything. |
| 18 | Non-technical supplier | Three tiers: WhatsApp-only, simplified portal, full portal + API. |
| 19 | Bulk operations | CSV upload + bulk UI + API. Preview/diff before apply. Monthly reminder workflow. |
| 20 | NPS/feedback | WhatsApp survey 2h post-delivery. 3 questions. Feeds health score. Detractor rescue within 24h. |
