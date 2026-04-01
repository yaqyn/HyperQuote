> ⚠️ **REFERENCE DOCUMENT — NOT THE SOURCE OF TRUTH**
> This file was written during the research phase and may contain outdated decisions, US-centric references, or superseded technical choices.
> **Always defer to `essential/RESEARCH.md` for current decisions.**
> Key changes since this file was written: TanStack Start (not Next.js), Capacitor (not Expo), React Aria (not shadcn), Egyptian law (not US FMCSA), EGP (not USD), dual auth pools, no online payments, no mobile wallets, spatial glass UI (not traditional dashboards).

# HyperQuote: Three Complete Perspectives
## Repeat Customer, Support Scenarios, New Supplier Onboarding

**Date:** 2026-03-29
**Context:** Egyptian B2B building materials distribution. Quote-based pricing (no published prices, price ranges shown). WhatsApp-first support. 5-tier customer payment model. Post-dated cheques as primary payment instrument. Supabase + Cloudflare stack.

---

# PERSPECTIVE 1: REPEAT CUSTOMER (Ahmed Orders Again)

Ahmed completed his first order 6 weeks ago. He paid on time (50% advance via post-dated cheque, 50% on delivery). He is Tier 1 (New) -- needs 2 more successful orders to reach Tier 2 (Developing). He needs materials for Phase 2 of his tower project.

---

## 1.1 Ahmed Opens the Portal -- What Is Different Now

Ahmed opens the PWA on his phone. The experience is fundamentally different from his first visit as a stranger.

**What Ahmed sees on login:**

- **Welcome back bar**: "Welcome back, Ahmed | Al-Nour Construction" -- his company name, his name. The portal knows him.
- **Quick Actions panel**: Three prominent actions based on his history:
  - "Reorder Phase 1 Materials" (one-tap reorder of his previous order)
  - "Start New Quote Request"
  - "View Phase 1 Order" (his completed order, with delivery receipts and invoices)
- **Project Sidebar/Organization**: Ahmed's account now has a "Projects" section. His tower project is listed. Inside it:
  - Phase 1 (completed) -- green checkmark, invoice paid, delivery confirmed
  - Phase 2 (empty, ready to populate)
- **AI Chat floating button**: Still present, but now the AI has context. It knows Ahmed, knows his project, knows his previous order line items.
- **Price Range Indicators**: On materials Ahmed previously ordered, the portal shows price range indicators (not exact prices) like "EGP 85-95/bag" based on recent market data. These are tighter ranges than what a guest sees because the system has Ahmed's actual last-purchase price as an anchor.
- **Saved Lists / Favorites**: Materials from Phase 1 appear in "Recently Ordered" and "Favorites" if Ahmed starred them.
- **Notification badge**: If there are any proactive messages (e.g., "Cement prices dropped 5% since your last order" or "Phase 2 reminder -- ready to order?"), they appear here.

**What is different in the backend:**

- Ahmed's `customer_profile` record is populated: verified delivery address, site foreman contact (from Phase 1 delivery), payment history (on-time), credit score internal flag (green).
- His `customer_tier` is still `NEW` but his `orders_completed` counter is 1, `on_time_payment_count` is 1.
- The pricing engine has his previous quote cached -- cost basis, margin applied, final price per item. This becomes the starting point for Phase 2 pricing.
- His assigned sales rep is Mariam. This relationship is stored. Any new quote request routes to Mariam first.

---

## 1.2 Ahmed Uses "Reorder"

Ahmed taps "Reorder Phase 1 Materials" from his dashboard.

**Step-by-step flow:**

1. **Material list pre-populated**: The system loads every line item from his Phase 1 order into a new draft quote request. Each item shows:
   - Material name (e.g., "OPC 50kg Cement - Al-Masriya")
   - Previous quantity (e.g., 500 bags)
   - Previous unit price range (e.g., "~EGP 90/bag" -- shown as approximate, not exact)
   - Current availability indicator (green/yellow/red based on supplier portal cache)
   - Editable quantity field

2. **Ahmed modifies quantities**: He changes cement from 500 to 1,000 bags. He changes rebar from 200 to 150 tons. He removes sand entirely (already procured locally).

3. **Ahmed adds new items**: He taps "Add Item" and searches for "plaster." The AI-powered search returns:
   - Gypsum Plaster 40kg bags (3 suppliers, price range EGP 45-55/bag)
   - Cement-Based Plaster 50kg bags (2 suppliers, price range EGP 60-70/bag)
   - He selects Gypsum Plaster 40kg, enters quantity: 500 bags.

4. **Project assignment**: The system asks "Assign to which project?" -- Ahmed's tower project is pre-selected. He creates "Phase 2" under it.

5. **Delivery details**: The system pre-fills his Phase 1 delivery address and site contact (his foreman, Mohamed). Ahmed confirms -- same site, same foreman.

6. **Ahmed submits the quote request**: One tap. The request enters the system as `QR-2026-00047` linked to Ahmed's account, tower project, Phase 2.

**What happens in the backend on submission:**

- Quote request created with status `SUBMITTED`
- Soft reservation: NONE yet (principle: no reservation on unverified input)
- Auto-assignment: Routes to Mariam (Ahmed's assigned sales rep) immediately
- Parallel processing kicks off:
  - Stock check against cached supplier data for all line items
  - Price resolution: pricing engine runs the rule priority cascade for each item
  - AI flags: "Ahmed doubled cement -- confirm this is intentional, not a typo" (anomaly detection based on Phase 1 quantities and typical Phase 2 patterns)
- WhatsApp auto-acknowledgment sent to Ahmed: "We received your quote request QR-2026-00047 for Phase 2 of your tower project. Mariam will have your quote ready within 2 hours."

---

## 1.3 Ahmed Uses AI Chat Instead

Alternatively, Ahmed taps the floating AI chat button and types:

> "Same as last order but double the cement and add 500 bags of plaster"

**AI processing:**

1. **Context retrieval**: The AI pulls Ahmed's most recent order (ORD-2026-00031). It retrieves all line items.
2. **Intent parsing**: The AI understands:
   - "Same as last order" = clone all line items from ORD-2026-00031
   - "Double the cement" = find cement line items, multiply quantity by 2
   - "Add 500 bags of plaster" = new line item, 500 bags, plaster (type unspecified)
3. **Clarification needed**: The AI responds:

   > "Got it, Ahmed. I've prepared your order based on Phase 1. Here's what I have:
   >
   > - OPC 50kg Cement: 1,000 bags (doubled from 500)
   > - 12mm Rebar: 200 tons (same as before)
   > - River Sand: 50 m3 (same as before)
   > - **NEW: Plaster 500 bags** -- I see two options:
   >   1. Gypsum Plaster 40kg (EGP 45-55/bag range)
   >   2. Cement-Based Plaster 50kg (EGP 60-70/bag range)
   >
   > Which plaster type? And should I keep sand and rebar at the same quantities, or adjust anything?"

4. **Ahmed replies**: "Gypsum plaster. Remove sand. Rebar down to 150 tons."

5. **AI confirms and submits**:

   > "Updated. Your quote request:
   > - OPC 50kg Cement: 1,000 bags
   > - 12mm Rebar: 150 tons
   > - Gypsum Plaster 40kg: 500 bags
   >
   > Delivering to the same site (Tower Project, 6th October City)?
   > [Confirm & Submit] [Edit More]"

6. Ahmed taps **Confirm & Submit**. Same backend flow as Section 1.2.

**Key difference**: The AI chat path is faster for simple reorders with modifications. It took Ahmed 4 messages instead of manually editing a material list. The AI knows his history, his project, his delivery address. This is the "power user" path.

---

## 1.4 Quote Process -- Why It Is Faster This Time

The Phase 2 quote is significantly faster than Phase 1. Here is why:

| Factor | Phase 1 (First Order) | Phase 2 (Repeat) | Time Saved |
|--------|----------------------|-------------------|------------|
| **Customer verification** | Credit check, trade license review, company verification | Already verified. Green flag. | 30-60 min |
| **Delivery address validation** | New address, needed to verify site access, crane availability | Same site. Foreman contact on file. Validated. | 15-30 min |
| **Supplier pricing** | Full procurement cycle for unfamiliar items | Cached prices from 6 weeks ago. Most items: instant price from cache. Only plaster (new item) needs fresh sourcing. | 1-3 hours |
| **Margin calculation** | First-time customer margin rules, manual review | System auto-applies same margin rules. Previous quote as template. | 15-30 min |
| **Sales rep familiarity** | Mariam had to learn Ahmed's business, project scope, preferences | Mariam has notes from Phase 1. She knows the project timeline, the foreman's name, Ahmed's communication style. | Intangible but significant |
| **Internal approvals** | Potential manager review for new customer, large order | Standard approval. Ahmed is a known, on-time payer. | 15-30 min |

**Net result**: Phase 1 quote took ~4 hours. Phase 2 quote is ready in ~45 minutes to 1 hour.

**Price cache specifics:**

- Cement (Al-Masriya): Supplier price cached from 3 days ago (supplier updates weekly). Cache is fresh. Instant price.
- Rebar: Supplier price cached from 1 week ago. Fresh enough. Instant price.
- Plaster (NEW item): No cached price for this specific product. Procurement checks 3 supplier portals. Two have published prices for gypsum plaster. One needs a call. This item adds 30 minutes.

**The pricing engine resolves:**

```
For each line item:
1. Check Ahmed's customer-specific pricing -> none (Tier 1, no custom deals yet)
2. Check tier pricing -> Tier 1 (New) = standard margin, no discount
3. Check volume breaks -> 1,000 bags cement triggers volume tier ($X/bag at 500+)
4. Apply category default margin -> Cement 18-22%, Rebar 12-18%, Plaster 22-28%
5. Result: quoted price per item
```

---

## 1.5 Mariam's Interaction -- Does She Call?

**The one-call-maximum principle applies, but differently for repeat customers.**

Mariam receives the quote request. The internal dashboard shows:

- Customer: Ahmed / Al-Nour Construction (Tier 1, 1 completed order, on-time payer)
- Request: 3 items, estimated value ~EGP 850,000
- Anomaly flags: "Cement doubled (expected for Phase 2)" -- AI assessment: normal
- All items priced from cache except plaster (sourcing in progress)
- Delivery: same site as Phase 1 (validated)

**Mariam's decision tree:**

- Is everything straightforward? YES -- same customer, same site, standard items, one new item (plaster) that is readily available.
- Does Ahmed need hand-holding? NO -- he has been through this before.
- Is there anything to clarify? The AI flagged the cement doubling but assessed it as normal for Phase 2.

**Mariam does NOT call.** Instead:

1. She builds the quote in ~20 minutes (most prices auto-populated, she adjusts plaster after procurement confirms pricing).
2. She sends the quote via WhatsApp (primary channel) with a brief message:

   > "Hi Ahmed, your Phase 2 quote is ready -- QT-2026-00058. Three items, delivery to same site. Total: EGP 847,500. Quote valid for 7 days. Let me know if you need any changes!"

3. The quote PDF is attached via WhatsApp document message.
4. The portal also shows the quote under Ahmed's "Pending Quotes" section.

**When would Mariam call?**

- If the order value was significantly higher (say 3x Phase 1) -- she might call to discuss payment terms
- If Ahmed added unusual items or very large quantities that suggest a scope change
- If there were availability issues (e.g., "Rebar is backordered 2 weeks")
- If Ahmed's payment on Phase 1 had been late (see Section 1.10)

**Soft reservation now triggers**: When Mariam sends the quote, the system creates soft reservations against supplier stock for the quoted quantities. These soft reservations expire when the quote expires (7 days).

---

## 1.6 Payment Terms -- Has Ahmed Earned Better?

**Short answer: No. Ahmed is still Tier 1 (New). Payment terms are unchanged.**

**The 5-tier payment model:**

| Tier | Name | Requirement | Payment Terms |
|------|------|-------------|---------------|
| 0 | New | Default | CBD -- 50% advance (post-dated cheque or wire), 50% on delivery |
| 1 | Developing | 3 completed orders, all on time | Net 30 with post-dated cheques |
| 2 | Established | 8 completed orders, 12+ months relationship | Net 60 with post-dated cheques |
| 3 | Strategic | 20+ orders, $X annual volume | Net 90, negotiable terms |
| 4 | Flagged | Late payment, bounced cheque, dispute | CBD only, no credit |

**Ahmed's current position:**

- Completed orders: 1
- Orders needed for Tier 2: 3 total (2 more)
- Payment history: 1/1 on time
- Current terms: 50% advance, 50% on delivery

**What Ahmed sees on his quote:**

```
PAYMENT TERMS:
- 50% advance payment due upon order confirmation
  (Post-dated cheque or wire transfer)
- 50% due on delivery
  (Post-dated cheque, wire transfer, or certified cheque)
```

**Can Mariam override this?** Not on her own. The tier system is automatic. A sales manager could approve an exception (e.g., if Ahmed's order is very large and he is complaining about terms), but this requires:
1. Sales manager approval in the system
2. Finance team sign-off
3. The exception is logged and tracked

**What if Ahmed asks for better terms?** Mariam can say: "After your third on-time order, you'll automatically qualify for Net 30 terms with post-dated cheques. Just two more orders to go!" This is a retention lever -- Ahmed now has an incentive to keep ordering through HyperQuote.

---

## 1.7 Delivery -- The Foreman Knows the Drill

**Phase 2 delivery is smoother because the site is known.**

**What the system already has from Phase 1:**
- GPS coordinates of the construction site
- Site access notes: "Enter through Gate 3, construction entrance. Crane available on-site. Foreman Mohamed (phone: +20 1xx-xxx-xxxx)"
- Delivery window preferences: "Preferred 7-9 AM before concrete pouring starts"
- Unloading requirements: "Cement: ground level storage, no crane needed. Rebar: crane required."
- Photos of the site entrance and unloading area (uploaded by driver during Phase 1 delivery)

**Delivery scheduling:**

1. Ahmed confirms the order. Hard reservation triggers on supplier stock.
2. Supplier POs are generated and sent:
   - PO to Al-Masriya: 1,000 bags OPC cement
   - PO to Steel supplier: 150 tons 12mm rebar
   - PO to plaster supplier: 500 bags gypsum plaster
3. Dispatch coordinator schedules deliveries. The system auto-suggests:
   - Split delivery: Cement + Plaster together (same truck type), Rebar separate (flatbed needed)
   - Delivery windows: Based on Phase 1 preferences, schedule 7-9 AM slots
4. Ahmed receives WhatsApp notification: "Your delivery is scheduled for [date]. Cement + Plaster arriving 7-8 AM, Rebar arriving 8-9 AM. Your foreman Mohamed will be contacted 30 minutes before arrival."

**On delivery day:**

- Driver has pre-loaded site notes from Phase 1 -- knows exactly where to go, which gate, where to unload
- Mohamed (foreman) receives a WhatsApp 30 minutes before arrival: "Driver Tarek is 30 minutes away with your cement + plaster delivery. Order ORD-2026-00048."
- Driver arrives, Mohamed signs delivery note (HyperQuote-branded -- supplier identity not hidden but the commercial relationship is HyperQuote's)
- Digital proof of delivery captured: Mohamed's signature, photo of materials at site, GPS timestamp
- Ahmed receives WhatsApp: "Delivery 1 of 2 confirmed. 1,000 bags cement + 500 bags plaster received by Mohamed at 7:42 AM."

---

## 1.8 Project-Based Organization

**How Ahmed sees Phase 1 vs Phase 2 in the portal:**

```
MY PROJECTS
  |
  +-- Tower Project (6th October City)
       |
       +-- Phase 1 -- Foundation [COMPLETED]
       |    |-- Quote QT-2026-00023 (Accepted)
       |    |-- Order ORD-2026-00031
       |    |    |-- Invoice INV-2026-00001 (Paid)
       |    |    +-- Delivery DEL-2026-00015 (Delivered, signed by Mohamed)
       |    +-- Total Spent: EGP 425,000
       |
       +-- Phase 2 -- Superstructure [IN PROGRESS]
       |    |-- Quote QT-2026-00058 (Pending Acceptance)
       |    |-- Estimated: EGP 847,500
       |    +-- Status: Awaiting your approval
       |
       +-- Phase 3 -- Finishing [PLANNED - no orders yet]
       |    +-- (Ahmed can create this as a placeholder)
       |
       +-- PROJECT SUMMARY
            |-- Total Quoted: EGP 1,272,500
            |-- Total Spent: EGP 425,000
            |-- Total Remaining: EGP 847,500 (pending)
```

**Project features:**

- **Project-level view**: Total spend across all phases, all orders, all invoices. Ahmed can see his tower project as a whole.
- **Phase templates**: Ahmed can pre-plan Phase 3 materials based on the building spec, even before he is ready to order. These sit as "Planned" lists that can be converted to quote requests with one tap.
- **Document archive**: All delivery notes, invoices, credit notes, and receipts organized under each phase. Ahmed can pull these for his own client billing or regulatory compliance.
- **Multi-user visibility**: If Ahmed adds his project manager or accountant to his company account, they can see the project view with appropriate permissions (e.g., accountant sees invoices, project manager sees delivery schedules).
- **Budget tracking**: If Ahmed sets a project budget (optional), the portal shows spend vs budget per phase and total. This is informational only -- no enforcement.

---

## 1.9 Tier Progression -- What Triggers Tier 2

**Trigger: 3 completed orders, all paid on time.**

Ahmed is at 1/3. After Phase 2 completes and he pays on time, he will be at 2/3. One more order after that and he reaches Tier 2.

**The progression system:**

```
TIER EVALUATION runs automatically after each order completion + payment clearance:

IF order.status = 'COMPLETED'
   AND all invoices for order are 'PAID'
   AND payment was within terms (not late):

   INCREMENT customer.successful_orders

   IF customer.successful_orders >= 3
      AND customer.tier = 'NEW':
      UPGRADE customer.tier to 'DEVELOPING'
      NOTIFY sales rep (Mariam)
      NOTIFY customer (Ahmed) via WhatsApp:
        "Congratulations! You've been upgraded to Developing tier.
         You now qualify for Net 30 payment terms with post-dated cheques."
      UPDATE payment terms for future orders
```

**What Ahmed gains at Tier 2 (Developing):**
- Net 30 payment terms (no more 50% advance)
- Post-dated cheques accepted for full amount
- Slightly tighter price ranges shown in portal (his pricing history helps narrow estimates)
- Priority in delivery scheduling (ahead of Tier 1 customers when slots conflict)

**What does NOT change:**
- He still gets quotes (no published prices)
- He still goes through Mariam for all orders
- He still has the same support SLAs (SLA upgrade comes at Tier 3+)

---

## 1.10 What If Ahmed Paid Late on Phase 1

**Scenario: Ahmed's Phase 1 payment arrived 15 days late.**

This changes the Phase 2 experience significantly:

**Immediate consequences of late payment:**

1. **Internal flag**: Ahmed's account is flagged with `payment_late_count: 1` and `last_late_payment_date`. His credit risk score adjusts.
2. **Late fee**: Per HyperQuote terms, a late fee of 1.5% per month (prorated) is applied. On a EGP 212,500 balance (50% of order), 15 days late = ~EGP 1,594 late fee. An adjusted invoice or debit note is generated.
3. **Mariam is notified**: "Ahmed's payment was 15 days late. Review before processing next order."

**Impact on Phase 2:**

- **Tier progression paused**: The late payment does not count as "on time." Ahmed's `successful_orders` stays at 0 for tier purposes. He now needs 3 MORE on-time orders to reach Tier 2 (the late one does not count).
- **Payment terms tightened**: Instead of 50% advance / 50% on delivery, finance may require:
  - 100% advance for Phase 2 (cash before delivery), OR
  - 50% advance + 50% with certified cheque (not post-dated), OR
  - Same terms but with explicit late fee warning
- **Mariam DOES call this time**: She needs to address the late payment and set expectations. The call covers:
  - "Ahmed, we noticed your Phase 1 payment was 15 days late. There's a late fee of EGP 1,594."
  - "For Phase 2, our finance team has adjusted your terms to [X]. Once we see consistent on-time payments, we'll restore standard terms."
  - She addresses any reasons Ahmed might have (cash flow issue, bank delay, oversight)
- **Quote includes stricter language**: The quote PDF explicitly states payment terms and late penalty clause.

**If Ahmed had a bounced cheque (worse scenario):**

- Account immediately flagged as Tier 4 (Flagged)
- CBD only -- 100% cash before delivery, wire transfer required (no cheques accepted)
- Potential requirement for bank guarantee on orders above a threshold
- Account review by finance manager before any new orders are accepted
- Mariam must get finance approval before even sending a quote

**Rehabilitation path:**
- 3 consecutive on-time orders at CBD terms to return to Tier 1
- Bounced cheque must be settled (cheque amount + bank fees + penalty)
- Finance manager reviews and approves tier restoration

---

# PERSPECTIVE 2: SUPPORT SCENARIOS (Ahmed Has a Problem)

---

## Scenario A: Ahmed Cannot Log In to the Portal

**The situation**: Ahmed opens the PWA on his phone. He enters his phone number for OTP login. The OTP never arrives. He cannot access his account.

### Path 1: Ahmed WhatsApps HyperQuote (most likely)

Ahmed already has HyperQuote's WhatsApp from his previous order. He sends:

> "I can't log in. OTP not coming to my phone."

**AI Triage Layer processes the message:**

1. **Customer identification**: Phone number matched to Ahmed / Al-Nour Construction.
2. **Intent classification**: `Account_Login` -- Normal priority, AI-handleable.
3. **AI auto-response** (within 30 seconds):

   > "Hi Ahmed! Sorry you're having trouble logging in. Let me help:
   >
   > 1. **Check your SMS inbox** (not WhatsApp) -- the OTP is sent via SMS to +20 1xx-xxx-xxxx
   > 2. **Check if the number is correct** -- is +20 1xx-xxx-xxxx still your active number?
   > 3. **Try again in 60 seconds** -- there's a cooldown between OTP requests
   >
   > If the OTP still doesn't arrive, reply 'Still not working' and I'll connect you with support."

4. **If Ahmed replies "Still not working":**

   AI escalates to check:
   - Is the Supabase Auth OTP delivery service operational? (system health check)
   - Has Ahmed's phone number changed?
   - Is there an SMS delivery issue with his carrier? (common in Egypt -- certain carriers throttle OTPs)

5. **If it is a system issue (OTP service down):**
   - AI responds: "We've identified an issue on our end. Our team is working on it. In the meantime, you can try logging in via email OTP if you have email linked to your account. I'll notify you when SMS login is restored."
   - Ticket created as `Platform_Bug`, High priority, auto-assigned to engineering.

6. **If it is a carrier issue:**
   - AI offers alternative: "Try logging in with your email address instead. We'll send the OTP there."
   - If no email on file: "I'll have a support agent send you a magic link via WhatsApp."
   - A human agent generates a one-time login link, sends it via WhatsApp.

**Resolution time**:
- AI-resolved (user error, needs to check SMS): 2 minutes
- Carrier/system issue requiring human: 10-30 minutes
- System-wide outage: depends on engineering fix, but Ahmed gets workaround within 10 minutes

### Path 2: Ahmed Calls the HyperQuote Number

- Call is answered by IVR with options: "Press 1 for order status, Press 2 for support, Press 3 for sales"
- Ahmed presses 2. Routed to support agent.
- Agent verifies Ahmed's identity (phone number on file, company name).
- Agent checks the OTP delivery logs in the admin dashboard.
- Resolves same as above.

**Resolution time**: 5-15 minutes (longer due to call queue)

### Path 3: Ahmed Emails

- Less likely in Egypt's WhatsApp-first culture, but possible.
- Email hits the support queue. AI triage classifies as `Account_Login`.
- Same resolution flow, but slower (email SLA: 4-8 hours first response).

---

## Scenario B: Ahmed Disputes an Invoice

**The situation**: Ahmed receives invoice INV-2026-00001 for his Phase 1 order. He believes the VAT is calculated incorrectly.

### Ahmed Sends WhatsApp Message

> "Invoice INV-2026-00001 shows wrong VAT amount. The total doesn't add up."

**AI Triage:**

1. **Customer identification**: Ahmed / Al-Nour Construction.
2. **Intent classification**: `Payment_Invoice_Dispute` -- High priority.
3. **AI first response** (within 60 seconds):

   > "Hi Ahmed, I'm pulling up invoice INV-2026-00001 for you.
   >
   > I see:
   > - Subtotal: EGP 425,000
   > - VAT (14%): EGP 59,500
   > - Total: EGP 484,500
   >
   > Egypt's standard VAT rate is 14%. Could you tell me what amount you expected? This will help me investigate faster."

   (Note: Egypt's VAT rate is 14%, not 15% or 20%. The AI knows the correct rate.)

4. **Ahmed replies**: "The cement was EGP 90/bag x 500 = EGP 45,000. But the invoice shows EGP 47,250 for cement. Where did the extra EGP 2,250 come from?"

5. **AI checks the quote vs invoice**:

   The AI cross-references:
   - Quote QT-2026-00023: Cement unit price EGP 90/bag, quantity 500, subtotal EGP 45,000
   - Invoice INV-2026-00001: Cement unit price EGP 94.50/bag, quantity 500, subtotal EGP 47,250

   There is a discrepancy. The invoice price is 5% higher than the quoted price.

6. **AI cannot resolve this automatically** -- it is a genuine discrepancy, not a calculation error. AI responds:

   > "Ahmed, I see a difference between your quoted price and your invoiced price for cement:
   > - Quoted: EGP 90/bag
   > - Invoiced: EGP 94.50/bag
   >
   > I'm escalating this to your account manager Mariam and our finance team. They'll investigate and get back to you within 4 hours."

7. **Ticket created**: `Payment_Invoice_Dispute`, High priority, assigned to Finance + Mariam.

### Internal Investigation

**Finance team checks:**

- Was the quote accepted at EGP 90/bag? YES -- quote acceptance is on record.
- Why does the invoice show EGP 94.50? Possible causes:
  - Data entry error when generating invoice
  - Price was updated after quote acceptance (which should NOT happen -- accepted quote price is locked)
  - Delivery included different material than quoted (spec mismatch)
  - System bug in invoice generation

**If Ahmed is RIGHT (price should be EGP 90/bag):**

1. Finance issues a **credit note** (CN-2026-00001) for the difference: EGP 2,250 + VAT on the difference (EGP 315) = EGP 2,565 total credit.
2. Credit note sent to Ahmed via WhatsApp + portal.
3. Ahmed's account balance updated.
4. Mariam WhatsApps Ahmed:

   > "Ahmed, you were right -- there was an error on your invoice. We've issued credit note CN-2026-00001 for EGP 2,565. This will be applied to your next order or refunded, whichever you prefer. Sorry for the inconvenience."

5. Root cause analysis: Why did the invoice price differ from the quote? Bug ticket created for engineering if it is a system issue. If human error, process updated.

**If Ahmed is WRONG (invoice is correct):**

This can happen if:
- The quote had a price escalation clause (e.g., "prices valid for 7 days, subject to material cost adjustment")
- Ahmed accepted a revised quote with updated pricing
- Delivery charges were added that Ahmed forgot about

In this case:

1. Mariam calls Ahmed (this warrants a call -- it is a payment dispute):
   - "Ahmed, I checked and the invoice is correct. Here's why: your quote included a price escalation clause because cement prices increased between quote acceptance and delivery. The adjusted price of EGP 94.50 reflects the supplier cost increase. Here's the breakdown..."
   - She walks through the math on WhatsApp with a clear breakdown.
2. If Ahmed accepts: ticket closed.
3. If Ahmed pushes back: escalate to sales manager for potential goodwill credit (partial or full difference absorbed by HyperQuote to maintain relationship).

**Resolution time**: 2-8 hours depending on investigation complexity.

---

## Scenario C: Ahmed Wants to Cancel a Confirmed Order

**The situation**: Order ORD-2026-00048 (Phase 2) is confirmed. Supplier POs have been sent. Materials are being prepared at supplier factories. Ahmed calls:

> "I need to cancel. The project is on hold -- my client pulled funding."

### What Has Already Happened

When Ahmed confirmed the order, the following chain fired:

1. **Hard reservation** locked against supplier stock
2. **Supplier POs generated and sent**:
   - PO-S-001 to Al-Masriya: 1,000 bags cement (standard stock item, not yet loaded)
   - PO-S-002 to Steel supplier: 150 tons rebar (being cut to spec -- partially fabricated)
   - PO-S-003 to Plaster supplier: 500 bags plaster (standard stock item, not yet loaded)
3. **Ahmed's 50% advance payment** (EGP 423,750) already received via post-dated cheque (cheque dated for today, already deposited)

### Cancellation Process

**Step 1: Mariam receives the cancellation request**

- She documents the reason in the system
- Status change: Order moves to `CANCELLATION_REQUESTED`
- System blocks any further fulfillment actions (no dispatch, no additional POs)

**Step 2: Procurement assesses each supplier PO**

Each PO is evaluated for reversibility:

| Supplier PO | Item | Status | Reversible? | Cancellation Impact |
|-------------|------|--------|-------------|-------------------|
| PO-S-001 | Cement 1,000 bags | Acknowledged, not loaded | YES -- standard stock, supplier can resell | Minimal -- possible 2-5% restocking fee |
| PO-S-002 | Rebar 150 tons | Partially cut to spec | PARTIAL -- cut rebar cannot be returned. Uncut portion can be cancelled. | Significant -- 60% already cut. Cut rebar is Ahmed's liability. |
| PO-S-003 | Plaster 500 bags | Acknowledged, not loaded | YES -- standard stock | Minimal -- possible 2-5% restocking fee |

**Step 3: Procurement contacts suppliers**

- Al-Masriya (cement): Accepts cancellation. No restocking fee (good relationship, standard product). PO-S-001 cancelled.
- Steel supplier: 90 tons already cut to Ahmed's specifications. Cannot resell cut rebar easily. Supplier demands payment for cut portion. 60 tons uncut -- cancellable. Cost of cut rebar: ~EGP 270,000.
- Plaster supplier: Accepts cancellation. 3% restocking fee. EGP 825 fee.

**Step 4: Financial calculation**

```
Ahmed's advance payment:                    EGP 423,750 (50% of EGP 847,500)

Cancellation costs:
- Rebar (cut, non-returnable): 90 tons     EGP 270,000
- Plaster restocking fee (3%):              EGP     825
- Cement restocking:                        EGP       0
- HyperQuote cancellation fee (5% of
  cancelled items that had no supplier
  cost -- admin/processing):                EGP  14,419
                                           ____________
Total cancellation cost:                    EGP 285,244

Refund to Ahmed:                            EGP 138,506
```

**Step 5: Mariam calls Ahmed**

This absolutely requires a call. Mariam explains:

> "Ahmed, I understand the project is on hold. Here's what we can do:
>
> Unfortunately, 90 tons of your rebar has already been cut to your specifications and can't be returned. That's EGP 270,000. The cement and plaster can be cancelled with a small restocking fee of EGP 825.
>
> Your total cancellation cost would be EGP 285,244. From your advance of EGP 423,750, you'd receive a refund of EGP 138,506.
>
> Alternatively:
> 1. **We can hold the cut rebar in storage** for up to 30 days at no extra charge. If your project restarts, you only pay the original price.
> 2. **We can try to resell the cut rebar** to another customer and credit you for whatever we recover.
> 3. **You can take partial delivery** of just the rebar (since you're paying for it anyway) and cancel the rest."

**Step 6: Ahmed chooses an option**

- If full cancellation: Credit note issued for EGP 138,506. Refund processed via wire transfer (7-10 business days). The advance post-dated cheque already deposited cannot be "uncashed" -- refund is a separate outbound payment from HyperQuote.
- If hold + partial: Order status changes to `ON_HOLD` with a 30-day expiry. If not reactivated, auto-cancels with the same cost structure.

**Step 7: Documentation**

- Cancellation recorded with full audit trail
- Credit note generated
- Supplier PO statuses updated (cancelled / partially fulfilled)
- Ahmed's account shows the cancellation in his project view
- Financial impact recorded for HyperQuote P&L

### What If Ahmed Disputes the Cancellation Fees?

- Escalate to sales manager
- Sales manager evaluates: Is Ahmed a valuable long-term customer? Is the project likely to restart?
- Possible goodwill: absorb the plaster restocking fee (EGP 825), offer to sell the cut rebar at cost if they find another buyer
- HyperQuote's leverage: the cancellation terms should be stated in the original order confirmation that Ahmed accepted

---

## Scenario D: Ahmed Wants to Change a Confirmed Order

**The situation**: Ahmed's order ORD-2026-00048 is confirmed, POs sent. He WhatsApps:

> "Can you add 200 more bags of cement to my existing order?"

### Change Order Process

**Step 1: AI Triage**

AI classifies: `Order_Modification`, High priority. AI cannot handle this automatically -- it requires pricing, PO modification, and potentially new supplier sourcing.

AI responds:

> "Hi Ahmed, I've forwarded your request to Mariam. She'll process the change order for 200 additional bags of cement and get back to you within 2 hours."

**Step 2: Mariam Evaluates**

She checks:
- Can the existing supplier PO (PO-S-001 to Al-Masriya) be amended? YES -- cement has not shipped yet.
- What is the current price? Al-Masriya's cached price has not changed. Same rate applies.
- Does this need a new quote? For a simple quantity increase of the same item: **a change order amendment, not a full re-quote.**

**Step 3: Change Order Created**

System generates: **CO-2026-00001** (Change Order) linked to ORD-2026-00048.

```
CHANGE ORDER CO-2026-00001
Order: ORD-2026-00048
Type: Quantity Increase

Changes:
  OPC 50kg Cement:
    Original: 1,000 bags @ EGP 90/bag = EGP 90,000
    Change:   +200 bags @ EGP 90/bag  = EGP 18,000
    New Total: 1,200 bags             = EGP 108,000

Order Value Change:
    Original Order Total:  EGP 847,500
    Change Order Addition: EGP  18,000
    New Order Total:       EGP 865,500

Additional VAT (14%):     EGP   2,520
Additional Payment Due:   EGP  20,520

Payment Terms:
    Additional 50% advance: EGP 10,260 due before processing
    Remaining 50%: on delivery with original balance
```

**Step 4: Mariam Sends Change Order to Ahmed**

Via WhatsApp:

> "Ahmed, the 200 extra bags of cement are available at the same price (EGP 90/bag). I've prepared change order CO-2026-00001 -- additional cost is EGP 20,520 including VAT. An additional advance of EGP 10,260 is needed to process this. Shall I proceed?"

Change order PDF attached.

**Step 5: Ahmed Approves**

Ahmed replies "Approved" or taps approve in the portal.

**Step 6: Backend Processing**

1. Change order status: `APPROVED`
2. Original order updated with new line items/quantities
3. Supplier PO amendment sent to Al-Masriya: PO-S-001 updated from 1,000 to 1,200 bags
4. Additional advance payment tracked -- system sends payment instructions to Ahmed
5. Delivery schedule updated if needed (200 more bags may fit on the same truck or require a small addition)

**What if the change is more complex?**

- Adding a completely new item (not in original order): Requires sourcing + pricing. Treated as a mini-quote within the change order. May take 1-4 hours.
- Reducing quantities: If supplier PO can be amended downward (items not yet prepared), straightforward. If items already prepared, same cancellation cost logic as Scenario C applies.
- Changing delivery date: Requires coordination with dispatch and supplier. Change order tracks the schedule change.
- Changing delivery address: New address needs validation. Delivery cost may change. Change order captures both.

---

# PERSPECTIVE 3: NEW SUPPLIER ONBOARDING (Nile Cement Factory)

Nile Cement Factory is a major Egyptian cement manufacturer. 200+ products, multiple factory locations (Suez, Assiut, Alexandria), their own fleet of cement mixer trucks and flatbed trailers. Annual revenue: EGP 2+ billion. They want to sell through HyperQuote to reach smaller contractors they currently do not serve.

---

## 3.1 Nile Cement Discovers HyperQuote

**How they find out:**

- **Scenario A**: HyperQuote's business development team actively targets them. A BD manager calls Nile Cement's sales director: "We're a digital distribution platform connecting your products to 500+ contractors across Egypt. We handle logistics, credit, and collections. You just ship."
- **Scenario B**: Nile Cement sees smaller competitors' products on HyperQuote. Their sales team investigates. They visit the HyperQuote website/PWA and see the "Become a Supplier" button.
- **Scenario C**: Word of mouth in Egypt's tight-knit building materials industry. A Nile Cement sales manager hears about HyperQuote at a construction expo.

**First contact**: Nile Cement's commercial director, Eng. Khaled, visits the HyperQuote portal.

---

## 3.2 Application Process

**Step 1: Eng. Khaled clicks "Become a Supplier"**

He already has a personal account (he signed up to browse as a customer). The "Become a Supplier" button triggers the supplier application form.

**Application form -- what Nile Cement fills out:**

```
SUPPLIER APPLICATION

COMPANY INFORMATION:
- Legal Company Name: Nile Cement Manufacturing S.A.E.
- Trade Name: Nile Cement
- Commercial Registration Number: xxxxx
- Tax ID (TIN): xxx-xxx-xxx
- Company Type: [Egyptian Joint Stock Company]
- Year Established: 1978
- Annual Revenue Range: [EGP 1B+]
- Number of Employees: [1,000+]
- Website: www.nilecement.com.eg

PRIMARY CONTACT:
- Name: Eng. Khaled Hassan
- Title: Commercial Director
- Phone: +20 1xx-xxx-xxxx
- Email: khaled@nilecement.com.eg

FACTORY LOCATIONS:
- [Add multiple]
  - Suez Factory: [address, GPS]
  - Assiut Factory: [address, GPS]
  - Alexandria Factory: [address, GPS]

PRODUCT CATEGORIES:
- [x] Cement (OPC, SRC, White, Blended)
- [x] Ready-Mix Concrete
- [x] Admixtures
- [ ] Rebar
- [ ] Other: ___

LOGISTICS CAPABILITY:
- [x] Own delivery fleet
- Fleet size: 85 trucks (cement mixers, flatbeds, tankers)
- Delivery coverage: All of Egypt (Cairo, Delta, Upper Egypt, Red Sea coast)
- Typical lead time: 2-5 days depending on location

DOCUMENTS TO UPLOAD:
- Commercial Registration Certificate [PDF]
- Tax Card [PDF]
- Industrial License [PDF]
- Product Catalog [PDF - 200 pages]
- Quality Certificates (ISO 9001, Egyptian Standards) [PDF]
- Bank Details for Payment [form]

INTEGRATION PREFERENCES:
- [x] API integration (we have an ERP -- SAP)
- [ ] Manual portal updates
- [ ] Excel upload

PAYMENT TERMS EXPECTED:
- Net 15 days from delivery
```

**Step 2: Application submitted**

Eng. Khaled uploads all documents and submits. He receives:

> WhatsApp: "Thank you for applying to become a HyperQuote supplier. Your application is under review. Due to your company size, we'll schedule a call within 2 business days to discuss partnership terms."

---

## 3.3 HyperQuote Due Diligence

**Nile Cement is a major supplier -- due diligence is deeper and more strategic than for small supplier Omar.**

**Standard verification (same as any supplier):**
- Commercial registration validity check
- Tax card verification with Egyptian Tax Authority
- Industrial license verification
- Bank account verification (small test deposit)

**Enhanced verification for large suppliers:**
- **Financial health check**: Request last 2 years audited financial statements. Nile Cement is a public company -- financials are available.
- **Production capacity verification**: HyperQuote's procurement manager visits the Suez factory. They verify:
  - Actual production capacity (Nile claims 5,000 tons/day)
  - Quality control processes
  - Storage and loading facilities
  - Fleet condition and maintenance records
- **Quality certification validation**: Contact ISO certification body directly. Verify Egyptian Standards Organization compliance certificates for each product.
- **Reference check**: Contact 3-5 existing customers of Nile Cement (large contractors). Ask about product quality, delivery reliability, dispute resolution.
- **Legal review**: HyperQuote's legal team reviews the supplier agreement terms. Given Nile Cement's size, they will negotiate terms (unlike small suppliers who accept standard terms).

**Strategic assessment:**
- Is Nile Cement a good fit for HyperQuote's customer base?
- Does adding Nile Cement create dependency risk? (If they supply 40% of all cement orders, HyperQuote is vulnerable)
- Competitive analysis: Does Nile Cement also sell directly to HyperQuote's customers? Is there channel conflict?
- Pricing competitiveness: How do their prices compare to HyperQuote's existing cement suppliers?

**Timeline**: 1-2 weeks for large supplier due diligence (vs 3-5 days for small suppliers).

---

## 3.4 Product Catalog Upload via AI Parsing

**Nile Cement has a 200-page PDF catalog in Arabic and English.**

The catalog contains:
- 200+ product SKUs across cement types, grades, bag sizes, bulk options
- Technical specifications (compressive strength, setting time, chemical composition)
- Arabic product names + English equivalents
- Product images
- Packaging options (25kg bags, 50kg bags, 1-ton jumbo bags, bulk tanker)
- Regional pricing guidance (different for Cairo vs Upper Egypt)

**AI Catalog Parsing Pipeline:**

**Step 1: Upload**

Eng. Khaled uploads the 200-page PDF through the supplier portal. The portal shows:

> "We're processing your catalog. This typically takes 10-15 minutes for a catalog of this size. We'll notify you when it's ready for review."

**Step 2: Mistral OCR Processing**

- The system sends the PDF to Mistral OCR 3 (`mistral-ocr-2512`)
- OCR extracts all text, tables, and images
- Output: structured markdown with HTML tables preserving catalog layout
- **Arabic handling**: Mistral OCR handles Arabic text. RTL text is extracted correctly.
- **Cost**: ~$0.45 per 200 pages (based on Mistral OCR pricing)

**Step 3: LLM Structuring**

A second AI pass (using a language model) takes the OCR output and structures it into product records:

```json
{
  "products": [
    {
      "sku_supplier": "NC-OPC-50",
      "name_en": "Ordinary Portland Cement 50kg",
      "name_ar": "اسمنت بورتلاندي عادي 50 كجم",
      "category": "Cement",
      "subcategory": "OPC",
      "unit": "bag",
      "weight_kg": 50,
      "specs": {
        "type": "CEM I 42.5N",
        "compressive_strength_28d": "42.5 MPa",
        "setting_time_initial": "45 min",
        "standard": "ES 4756-1"
      },
      "packaging_options": ["50kg bag", "1-ton jumbo bag", "bulk tanker"],
      "image_ref": "page_45_img_1.jpg",
      "factory_origin": ["Suez", "Assiut"]
    },
    // ... 199 more products
  ]
}
```

**Step 4: Human Review**

The parsed catalog appears in the supplier portal for Eng. Khaled to review:

```
CATALOG REVIEW - Nile Cement Factory
Parsed: 213 products from 200-page catalog
Confidence: 94% average (items below 85% flagged for manual review)

[HIGH CONFIDENCE - 195 products]
  NC-OPC-50: Ordinary Portland Cement 50kg .............. [✓ Correct] [Edit]
  NC-OPC-25: Ordinary Portland Cement 25kg .............. [✓ Correct] [Edit]
  NC-SRC-50: Sulphate Resistant Cement 50kg ............. [✓ Correct] [Edit]
  ...

[NEEDS REVIEW - 18 products] (flagged)
  NC-ADM-01: [Name unclear - OCR read "عجينة إ..."] .... [Edit Required]
  NC-BLK-03: [Specs table partially extracted] .......... [Edit Required]
  ...
```

Eng. Khaled (or his catalog manager) reviews the 18 flagged items, corrects any OCR errors, and approves the full catalog.

**Step 5: Product Matching**

HyperQuote's system attempts to match Nile Cement products to existing products in the marketplace catalog:

- NC-OPC-50 matches existing product "OPC 50kg Cement" (already sold by Al-Masriya and 2 other suppliers)
- System creates a new **supplier offer** linked to the existing product, with Nile Cement's specific specs, pricing, and availability
- Products unique to Nile Cement (e.g., specialty blended cements) are added as new products to the marketplace

---

## 3.5 Pricing Setup

**Nile Cement wants regional pricing -- different prices for different areas of Egypt.**

**Pricing structure Nile Cement uploads:**

```
PRICING ZONES:

Zone 1: Greater Cairo (Cairo, Giza, Qalyubia)
  - OPC 50kg: EGP 82/bag (ex-factory Suez + delivery)
  - SRC 50kg: EGP 95/bag
  - White Cement 50kg: EGP 140/bag

Zone 2: Delta (Alexandria, Beheira, Dakahlia, etc.)
  - OPC 50kg: EGP 78/bag (ex-factory Alexandria)
  - SRC 50kg: EGP 92/bag

Zone 3: Upper Egypt (Assiut, Sohag, Qena, etc.)
  - OPC 50kg: EGP 75/bag (ex-factory Assiut, lower transport cost)
  - SRC 50kg: EGP 88/bag

Zone 4: Red Sea / Sinai
  - OPC 50kg: EGP 88/bag (longer haul from Suez)
  - SRC 50kg: EGP 102/bag

VOLUME TIERS (apply across all zones):
  - 1-499 bags: list price
  - 500-999 bags: 3% off
  - 1,000-4,999 bags: 5% off
  - 5,000+ bags: 7% off

BULK (tanker delivery, minimum 30 tons):
  - OPC: EGP 1,550/ton (Zone 1)
  - Prices negotiable for 100+ ton orders
```

**How this maps to HyperQuote's system:**

The supplier portal has a pricing matrix:
- Product x Zone x Volume Tier = Price
- Nile Cement can update any cell at any time through the portal
- Prices have a "valid until" date (default: 7 days, Nile Cement sets it)
- Price changes trigger notifications to HyperQuote procurement: "Nile Cement updated OPC Zone 1 from EGP 82 to EGP 85"

**HyperQuote's margin is then applied on top of Nile Cement's prices.** The customer never sees the supplier price. The customer sees HyperQuote's quoted price (supplier cost + HyperQuote margin).

---

## 3.6 Stock Sync via API Integration

**Nile Cement has SAP and wants automated stock sync, not manual portal updates.**

**Integration options:**

**Option A: API Integration (Nile Cement preferred)**

HyperQuote provides a REST API that Nile Cement's SAP instance calls:

```
HyperQuote Supplier API:

POST /api/v1/supplier/stock/update
{
  "supplier_id": "nile-cement",
  "updates": [
    {
      "sku": "NC-OPC-50",
      "factory": "suez",
      "available_qty": 50000,
      "unit": "bags",
      "next_production_date": "2026-04-05",
      "updated_at": "2026-03-29T08:00:00Z"
    },
    {
      "sku": "NC-OPC-50",
      "factory": "assiut",
      "available_qty": 35000,
      "unit": "bags"
    }
  ]
}

Response: 200 OK
{
  "accepted": 2,
  "rejected": 0,
  "warnings": []
}
```

Nile Cement's SAP is configured to push stock updates:
- **Real-time**: When production batches complete, SAP triggers an update
- **Scheduled**: Daily full sync at 6 AM (all SKUs, all factories)
- **On-demand**: HyperQuote can request current stock via `GET /api/v1/supplier/stock/{sku}`

**Option B: SFTP File Drop (simpler alternative)**

Nile Cement generates a CSV/Excel file from SAP daily and drops it to an SFTP server. HyperQuote ingests it automatically.

**Option C: Webhook from HyperQuote to Nile Cement**

When HyperQuote needs current stock for a specific item (e.g., customer is requesting 10,000 bags), HyperQuote calls Nile Cement's API:

```
GET https://api.nilecement.com.eg/stock/NC-OPC-50?factory=suez

Response:
{
  "available": 48500,
  "reserved": 2000,
  "net_available": 46500,
  "unit": "bags",
  "as_of": "2026-03-29T07:45:00Z"
}
```

**Recommended approach**: Option A (Nile Cement pushes to HyperQuote) as primary, with Option C (HyperQuote pulls on-demand) for real-time confirmation before hard reservation.

**Stock freshness indicators in HyperQuote's system:**

| Freshness | Age | Display |
|-----------|-----|---------|
| Live | < 1 hour | Green -- "In stock (live)" |
| Recent | 1-24 hours | Yellow -- "In stock (as of today)" |
| Stale | 1-7 days | Orange -- "In stock (may have changed)" |
| Expired | 7+ days | Red -- "Availability unconfirmed" |

For Nile Cement with API integration, stock data is always "Live" or "Recent." For small supplier Omar who updates manually, stock data is often "Stale."

---

## 3.7 First PO from HyperQuote

**A customer orders 2,000 bags of OPC cement. HyperQuote sources from Nile Cement.**

**PO generation:**

The system generates Supplier PO: PO-S-2026-00089.

```
PURCHASE ORDER

From: HyperQuote Distribution LLC
To: Nile Cement Manufacturing S.A.E.
PO Number: PO-S-2026-00089
Date: 2026-04-02

Ship To: [Customer's site address]
Delivery Date: 2026-04-05

LINE ITEMS:
| SKU | Description | Qty | Unit Price | Total |
|-----|-------------|-----|------------|-------|
| NC-OPC-50 | OPC 50kg Bag | 2,000 | EGP 82.00 | EGP 164,000 |

Subtotal: EGP 164,000
VAT (14%): EGP 22,960
Total: EGP 186,960

DELIVERY INSTRUCTIONS:
- Ship from: Suez Factory
- Deliver to: [Site Address, GPS coordinates]
- Contact on site: Mohamed (foreman), +20 1xx-xxx-xxxx
- Preferred window: 7:00-9:00 AM
- Unloading: Ground level, bags stacked on pallets
- IMPORTANT: Delivery using HyperQuote-branded delivery notes.
  Attached: HyperQuote delivery note template (DN-2026-xxxxx)

PAYMENT TERMS: Net 15 from delivery confirmation

SPECIAL NOTES:
- Nile Cement will use their own fleet for delivery
- Driver must carry HyperQuote delivery note alongside Nile Cement's own waybill
- Driver must collect signature from site contact on HyperQuote delivery note
- Driver must upload photo proof of delivery to HyperQuote driver app (or WhatsApp)
```

**PO delivery method:**

For Nile Cement (API-integrated), the PO is sent electronically:
- API push to Nile Cement's SAP: structured JSON PO
- Simultaneously: PDF version emailed to Eng. Khaled and the Suez factory dispatch
- WhatsApp notification to Nile Cement's designated operations contact

**Nile Cement acknowledges the PO:**
- Their SAP automatically sends acknowledgment via API
- Or: their operations team clicks "Acknowledge" in the supplier portal
- Acknowledgment includes: confirmed delivery date, confirmed factory (Suez), assigned truck/driver

---

## 3.8 Delivery -- Nile Cement Uses Their Own Fleet

**This is different from small suppliers where HyperQuote arranges delivery.**

Cement delivery requires specialized trucks -- cement mixers for bulk, flatbed trucks with crane for bagged cement. Nile Cement has their own fleet of 85 trucks. They insist on using their own fleet because:
- Their insurance covers their trucks and drivers
- Their drivers know how to handle cement (it is moisture-sensitive, time-sensitive for ready-mix)
- They have GPS tracking on all trucks
- They control quality until the moment of delivery

**Delivery flow with supplier's own fleet:**

1. **Nile Cement dispatches**: Their logistics team assigns a truck and driver from the Suez factory. They load 2,000 bags.

2. **HyperQuote tracking integration**: Two options:
   - **API integration**: Nile Cement shares truck GPS coordinates in real-time via API. HyperQuote's system shows the delivery moving on a map. Customer can track.
   - **Manual update**: Nile Cement's driver calls/WhatsApps HyperQuote dispatch when departing, en route, and arriving. HyperQuote manually updates status.

3. **Delivery documentation**: The driver carries TWO sets of documents:
   - **Nile Cement's waybill**: Their internal document for factory dispatch, weight ticket, etc.
   - **HyperQuote's delivery note**: Branded with HyperQuote logo. Shows:
     - HyperQuote order number (not Nile Cement's internal PO)
     - Customer name (Ahmed / Al-Nour Construction)
     - Material description and quantity
     - Delivery address
     - Signature block for customer/foreman
   - The customer sees HyperQuote as the seller. The delivery truck may have Nile Cement branding (cannot avoid this), but the commercial relationship is between Ahmed and HyperQuote.

4. **Proof of delivery**:
   - Foreman Mohamed signs the HyperQuote delivery note
   - Nile Cement's driver takes a photo (their own process)
   - Driver uploads the signed HyperQuote delivery note:
     - **If Nile Cement integrates their driver app**: Photo pushed via API to HyperQuote
     - **If not**: Driver WhatsApps the photo to HyperQuote's operations WhatsApp number
   - HyperQuote system receives POD, marks delivery as confirmed

5. **Quality check at site**:
   - Mohamed checks bags for damage, checks bag count, checks cement type matches order
   - Any issues: Mohamed notes on delivery note and contacts HyperQuote (not Nile Cement) -- HyperQuote owns the customer relationship

---

## 3.9 Payment -- Nile Cement Expects Net 15

**Nile Cement has leverage. They are a major manufacturer. They dictate payment terms.**

**Negotiation:**

- Nile Cement demands: Net 15 from delivery confirmation
- HyperQuote's standard supplier terms: Net 30
- The negotiation:
  - Nile Cement: "Our standard terms for distributors are Net 15. We have cash flow commitments and factory operating costs."
  - HyperQuote: "We understand. We can do Net 15 for orders where the customer has paid in advance. For Net 30/60 customer orders, we need Net 30 from you to manage cash flow."
  - Compromise: **Net 15 for CBD customers (advance payment received), Net 21 for credit customers.**

**Payment flow:**

```
Day 0: Delivery confirmed (POD received)
Day 15: HyperQuote pays Nile Cement via wire transfer

Nile Cement's invoice: EGP 186,960
HyperQuote pays: EGP 186,960

HyperQuote's customer invoice: EGP 214,800 (after margin)
HyperQuote keeps: EGP 27,840 (margin)
```

**Cash flow consideration:**

If Ahmed (Tier 1) paid 50% advance:
- Day 0: HyperQuote has EGP 107,400 (50% of customer invoice) in hand
- Day 0: Delivery happens
- Day 15: HyperQuote must pay Nile Cement EGP 186,960
- Day 15: HyperQuote is short EGP 79,560 -- needs to cover from working capital
- Day 30 (or on delivery): Ahmed pays remaining EGP 107,400

This is a **15-day cash flow gap** on each Nile Cement order where the customer is not CBD. For a Tier 3 customer (Net 90):
- HyperQuote pays Nile Cement on Day 15
- Customer pays HyperQuote on Day 90
- HyperQuote finances 75 days of float

**This is the core working capital challenge of distribution.** HyperQuote needs either:
- A credit facility / line of credit from a bank
- Factoring (selling receivables)
- Strict customer payment terms that align with supplier terms
- Or volume-based negotiation with Nile Cement for longer terms as relationship grows

---

## 3.10 Ongoing -- How Nile Cement's Experience Differs from Small Supplier Omar

| Dimension | Omar (Small Supplier) | Nile Cement (Large Supplier) |
|-----------|----------------------|------------------------------|
| **Products** | 15 SKUs | 200+ SKUs |
| **Catalog upload** | Manual entry or small Excel | AI-parsed 200-page PDF |
| **Price updates** | Manual via portal (weekly) | API from SAP (real-time) |
| **Stock updates** | Manual via portal (daily, often stale) | API from SAP (real-time, always fresh) |
| **PO delivery** | WhatsApp + Portal notification | API to SAP + Email + Portal |
| **Delivery** | HyperQuote arranges delivery (third-party or HQ fleet) | Nile Cement's own fleet |
| **Delivery tracking** | Manual updates from third-party driver | GPS API integration from Nile Cement fleet |
| **Payment terms** | Net 30 (HyperQuote's standard) | Net 15-21 (Nile Cement's leverage) |
| **Payment method** | Wire transfer or post-dated cheque | Wire transfer only (large amounts) |
| **Account management** | Handled by procurement team member | Dedicated supplier account manager at HyperQuote |
| **Quality issues** | HyperQuote handles claim, deducts from next payment | Formal quality claim process, Nile Cement's QA team involved |
| **Volume** | 5-20 POs/month | 50-200+ POs/month |
| **Negotiation power** | HyperQuote sets terms | Nile Cement negotiates terms |
| **Portal usage** | Primary interface | Portal + API (portal for exceptions, API for routine) |
| **Support** | WhatsApp with generic support | Dedicated WhatsApp group with key contacts |
| **Onboarding time** | 3-5 days | 2-4 weeks (due diligence, API integration, catalog parsing) |
| **Contract** | Standard supplier agreement (click-to-accept) | Negotiated contract with legal review on both sides |

**Nile Cement's supplier dashboard shows:**

```
SUPPLIER DASHBOARD - Nile Cement Factory

This Month:
- Active POs: 47
- Delivered: 38
- Pending: 9
- Total Value: EGP 8,450,000
- On-Time Delivery Rate: 94.7%
- Average Days to Deliver: 3.2

Payments:
- Pending Payment: EGP 2,890,000 (6 invoices)
- Next Payment Due: EGP 850,000 on April 3
- Paid This Month: EGP 5,560,000

Product Performance:
- Top Seller: OPC 50kg (68% of volume)
- Growing: White Cement 50kg (+23% MoM)
- Slow Mover: Admixture Type A (2 orders this month)

Pricing:
- Last Updated: 2 hours ago (via API)
- Price Change Alerts: None pending
- Competitor Price Check: [HyperQuote does NOT share competitor pricing]

Integration Status:
- Stock API: Connected (last sync: 5 min ago)
- PO API: Connected
- Delivery Tracking: Connected
```

---

# GAP ANALYSIS

---

## PERSPECTIVE 1 GAPS: Repeat Customer

### G1.1: Tier Progression Rules -- Incomplete
- **What order value counts?** Does a EGP 10,000 order count the same as a EGP 1,000,000 order toward tier progression? Should there be a minimum order value?
- **What about partial payments on time?** If Ahmed pays 50% on time but the remaining 50% is 3 days late, does the order count as "on time"?
- **Grace period definition**: How many days late is "late"? Is 1 day late the same as 30 days late for tier purposes?
- **Tier regression rules**: If Ahmed reaches Tier 2 and then pays late, does he drop back to Tier 1? How many late payments trigger a downgrade? Is there a probation period?

### G1.2: Reorder Pricing Logic
- **Price guarantee on reorder**: When Ahmed taps "Reorder," do the old prices apply? Or is it always current market pricing? If prices went up 15% in 6 weeks, Ahmed might be shocked.
- **Price change notification**: Should Ahmed be warned before submitting? "Note: cement prices have increased 12% since your last order."
- **Quote expiry and reorder timing**: If Ahmed reorders the same items but his old quote expired 4 weeks ago, the entire re-quoting process happens again. Is there a "fast re-quote" for repeat items?

### G1.3: Project Organization -- Undefined
- **Who creates projects?** Ahmed? His account admin? Sales rep? All of the above?
- **Project budget tracking**: Is this mandatory or optional? What happens when budget is exceeded?
- **Project archival**: When a project is complete, what happens to it? Archived? Deleted? Read-only?
- **Cross-project material reuse**: Can Ahmed copy a material list from Project A to Project B?
- **Project-level reporting**: Can Ahmed export all invoices for a project as a ZIP for his own client billing?

### G1.4: AI Chat Capabilities -- Boundaries Unclear
- **Can the AI chat submit a quote request directly?** Or does it always redirect to the form?
- **Can the AI chat show estimated pricing?** "Your estimated total is around EGP 850,000" -- is this allowed given "no published prices"?
- **Multi-language**: Does the AI chat work in Arabic? Egyptian dialect? Code-switching (Arabic + English in same message)?
- **What happens if AI misinterprets?** "Double the cement" -- what if Ahmed meant a different cement type? Error handling and confirmation flow.

### G1.5: Multi-User Account Behavior on Reorder
- **Ahmed is the buyer. His project manager Youssef is a viewer.** Can Youssef initiate a reorder? Or only Ahmed?
- **Approval workflows**: For large companies, does a reorder need internal approval (buyer submits, approver approves) before it goes to HyperQuote?
- **Notification preferences**: Who gets notified about quote updates -- Ahmed, Youssef, or both?

### G1.6: Saved Lists vs Favorites vs Reorder
- **Three overlapping features**: Reorder (clone previous order), Saved Lists (curated material lists), Favorites (starred items). How do they differ in the UI? Are they confusing?
- **Saved list sharing**: Can Ahmed share a saved list with another customer? With his foreman for review?

### G1.7: Late Payment Rehabilitation Path -- Vague
- **Exact rules for bounced cheque rehabilitation**: "3 consecutive on-time orders" -- at what tier? CBD only? What if the bounced cheque was for EGP 5M -- is 3 small orders enough?
- **Legal action threshold**: At what point does HyperQuote pursue legal action for non-payment vs just flagging the account?
- **Post-dated cheque management**: How are post-dated cheques tracked? When are they deposited? What happens if a cheque bounces after the materials are delivered?

---

## PERSPECTIVE 2 GAPS: Support Scenarios

### G2.1: OTP Delivery Reliability
- **Egypt-specific SMS delivery issues**: Which carriers have OTP delivery problems? Is there a fallback (WhatsApp OTP? Email OTP? Voice OTP)?
- **OTP rate limiting**: How many OTP attempts before lockout? What is the cooldown?
- **Magic link via WhatsApp**: This was mentioned as a workaround but is not defined. How is it generated? How long is it valid? Security implications?

### G2.2: Invoice Dispute Resolution SLA
- **Who has authority to issue credit notes?** Finance clerk? Finance manager? Sales manager? What is the approval hierarchy based on amount?
- **Credit note threshold for auto-approval**: For small discrepancies (under EGP 500), can the system auto-issue a credit note without manager approval?
- **Dispute tracking**: How is the dispute tracked in the accounting system? Does it freeze the payment clock on the disputed invoice?

### G2.3: Cancellation Policy -- Not Formalized
- **Cancellation fee schedule**: The walkthrough showed a 5% admin fee, but this is not formally defined. What percentage? Is it tiered by order stage?
- **Cut-to-spec materials liability**: At what point does the customer become liable for custom/fabricated items? At PO acknowledgment? At fabrication start? Who determines "fabrication started"?
- **Cancellation window**: Is there a grace period (e.g., 2 hours after confirmation) where cancellation is free? Industry practice: many B2B companies allow 24-hour cancellation without penalty.
- **Partial cancellation**: Can Ahmed cancel specific line items but keep others? How does this affect multi-supplier POs?

### G2.4: Change Order Pricing
- **Does the original price apply to additional quantities?** Or is it current market price? The walkthrough assumed same price -- but what if prices changed?
- **Change order limits**: Can Ahmed keep adding items indefinitely via change orders? Or at some point should it be a new order?
- **Change order approval threshold**: Small changes (under 10% of order value) auto-approved by sales rep. Larger changes need manager approval. Where is this threshold?

### G2.5: Refund Process
- **Refund method**: If Ahmed paid by post-dated cheque (already deposited), how is the refund issued? Wire transfer back? Cheque from HyperQuote? Credit on account?
- **Refund timeline**: "7-10 business days" was mentioned but is not formalized. What is the SLA?
- **Currency risk on refund**: If material prices changed between payment and refund, is the refund at original price or current price?

### G2.6: Escalation to Legal / Collections
- **When does a support issue become a legal matter?** Dispute threshold, time elapsed, customer behavior triggers.
- **Collections process**: Overdue accounts -- when does soft collection (reminders) become hard collection (legal demand letter)?

### G2.7: Support Channel Handoff
- **What if Ahmed starts on WhatsApp and wants to switch to phone call?** Can the agent call Ahmed? Does the context transfer?
- **What if Ahmed messages from a different phone number?** Does the system recognize him? Or treat it as a new contact?

---

## PERSPECTIVE 3 GAPS: New Supplier Onboarding

### G3.1: Supplier Contract Terms -- Undefined
- **Standard supplier agreement**: What are the key clauses? Exclusivity? Non-compete? Minimum order commitment from HyperQuote? Liability?
- **Termination clause**: How can either party end the relationship? Notice period? What happens to open POs?
- **Intellectual property**: Nile Cement's product data, images, specs are uploaded to HyperQuote's platform. Who owns this data? Can HyperQuote use it in marketing?

### G3.2: API Integration Specification
- **Full API documentation does not exist yet.** What endpoints does HyperQuote expose for suppliers? What authentication method? Rate limits?
- **Error handling**: What happens when Nile Cement's API push fails? Retry logic? Fallback to portal?
- **Data format**: JSON? XML? EDI (ruled out for now, but Nile Cement's SAP may prefer iDoc)? CSV?
- **Webhook vs polling**: Does HyperQuote push POs to Nile Cement's API, or does Nile Cement poll for new POs?
- **Testing/sandbox environment**: Is there a staging API for Nile Cement to test integration before going live?

### G3.3: Regional Pricing Complexity
- **Price zone definition**: Who defines the zones? HyperQuote or the supplier? What if two suppliers have different zone definitions?
- **Zone boundary disputes**: What zone is a delivery site in El-Saff (between Cairo and Fayoum)?
- **Delivery cost in zoned pricing**: Is the zoned price inclusive of delivery? Or is delivery charged separately?
- **Price zone updates**: When Nile Cement updates Zone 1 pricing, does it affect already-sent quotes? Already-confirmed orders?

### G3.4: Dual Fleet Management
- **HyperQuote delivers for small suppliers. Nile Cement delivers for themselves.** The dispatch system must handle BOTH models.
- **Tracking inconsistency**: Nile Cement has GPS tracking. Small supplier Omar's third-party truck does not. How does the customer experience remain consistent?
- **Delivery note branding when supplier delivers**: Nile Cement's truck has Nile Cement branding. The delivery note says HyperQuote. Is this confusing to the customer? Does it matter?
- **Insurance and liability during supplier-delivered orders**: If Nile Cement's truck damages materials during transit, who is liable to the customer? HyperQuote (the seller) or Nile Cement (the carrier)?

### G3.5: Supplier Payment at Scale
- **Cash flow modeling**: With Nile Cement at Net 15 and customers at Net 30-90, HyperQuote has a structural cash flow gap. This has not been modeled financially.
- **Payment batching**: Does HyperQuote pay Nile Cement per-PO or batch payments weekly? Per-PO is cleaner for reconciliation but operationally heavy (50+ payments/month).
- **Early payment discount from supplier**: Does Nile Cement offer 2/10 Net 15? Should HyperQuote take it?
- **Multi-factory invoicing**: Does Nile Cement send one invoice per factory or one consolidated invoice? How does reconciliation work?

### G3.6: Product Matching Across Suppliers
- **How does the system match "OPC 50kg" from Nile Cement with "OPC 50kg" from Al-Masriya?** Product normalization / canonical product database.
- **Spec differences**: Nile Cement's OPC 50kg might be CEM I 42.5N while Al-Masriya's is CEM I 42.5R. Same category but different specs. How are these presented to customers?
- **Customer preference**: If Ahmed always orders from Al-Masriya, does the system remember and default to that supplier? Or does it always pick cheapest/best available?

### G3.7: Supplier Quality Management
- **Quality rating system**: How is supplier quality tracked? Defect rate? Return rate? Customer complaints per order?
- **Quality issue resolution**: If customers consistently complain about Nile Cement's White Cement quality, what happens? Warning? Suspension? Removal?
- **Quality certificates per batch**: Does HyperQuote require batch-level quality certificates (mill test reports for cement)? How are these stored and shared with customers?

### G3.8: Channel Conflict
- **Nile Cement sells directly to large contractors.** What prevents Ahmed from bypassing HyperQuote and buying directly from Nile Cement after learning they are the supplier?
- **Price comparison risk**: If Ahmed realizes Nile Cement's direct price is lower than HyperQuote's price (no margin), why would he stay?
- **Non-solicitation clause**: Should the supplier agreement prevent Nile Cement from soliciting HyperQuote's customers? Is this enforceable in Egypt?

### G3.9: Supplier Onboarding for Non-Technical Suppliers
- **Nile Cement has SAP and an IT team. Most Egyptian suppliers do not.** The onboarding must work for both.
- **Training and support**: What training does a new supplier receive? Portal walkthrough? Video tutorials? In-person training?
- **Supplier support channel**: Does Nile Cement get dedicated support? Or the same WhatsApp support as everyone?

### G3.10: Bulk Operations
- **200+ products means bulk price updates, bulk stock updates, bulk operations.** Portal UI must support bulk edit, not one-by-one.
- **Bulk PO acknowledgment**: If Nile Cement has 47 active POs, can they acknowledge/update multiple POs at once?
- **Reporting and analytics**: Nile Cement wants to see which products sell best through HyperQuote, which regions have demand, seasonal trends. What reports are available?

---

## CROSS-CUTTING GAPS (All Perspectives)

### GX.1: Arabic Language Support
- Portal UI, AI chat, delivery notes, invoices, WhatsApp messages -- all must work in Arabic. Full RTL support. Is this designed into every touchpoint?

### GX.2: Egyptian Legal Framework
- Post-dated cheque law in Egypt (issuing a bounced cheque can be a criminal offense, not just civil). How does this affect the payment model?
- VAT calculation rules specific to Egypt (14% standard rate, exemptions for certain building materials?)
- Consumer protection and B2B contract law under Egyptian Commercial Code.

### GX.3: WhatsApp Business API Limitations
- Template message approval process (takes 24-48 hours for new templates)
- 24-hour service window -- what happens when HyperQuote needs to proactively contact a customer outside this window?
- Media file size limits for sending invoices, delivery notes as PDFs

### GX.4: Offline/Low-Connectivity Scenarios
- Egyptian construction sites often have poor connectivity. What happens when:
  - Ahmed tries to submit a quote request with weak signal?
  - The driver cannot upload POD photos at a remote site?
  - The foreman cannot sign digitally due to no connection?
- PWA offline capabilities -- what works offline?

### GX.5: Currency and Pricing Stability
- Egyptian Pound (EGP) has been volatile. Supplier prices may change daily for imported raw materials.
- Quote validity period (7 days) -- is this realistic in a volatile market? Should it be shorter?
- Forex impact on imported materials (some building materials are imported -- steel prices track international markets).

---

*End of document. All three perspectives complete. Gap analysis covers 40+ identified gaps across business logic, technical implementation, legal, and operational domains.*
