> ⚠️ **REFERENCE DOCUMENT — NOT THE SOURCE OF TRUTH**
> This file was written during the research phase and may contain outdated decisions, US-centric references, or superseded technical choices.
> **Always defer to `essential/RESEARCH.md` for current decisions.**
> Key changes since this file was written: TanStack Start (not Next.js), Capacitor (not Expo), React Aria (not shadcn), Egyptian law (not US FMCSA), EGP (not USD), dual auth pools, no online payments, no mobile wallets, spatial glass UI (not traditional dashboards).

# RESEARCH: Complete Damaged Delivery Handling Process
## B2B Building Materials Distribution — Egypt Market (2025-2026)

**Research Date:** 2026-03-29
**Context:** HyperQuote sources building materials from Egyptian/ME regional suppliers and delivers to construction sites via drop-ship (supplier delivers directly) or own fleet. Orders are $100K+ via wire/check/LC. No online payments. Quote-based RFQ model.

---

## Table of Contents

1. [Legal Framework — Egyptian Law](#1-legal-framework--egyptian-law)
2. [Damage Discovery and Initial Response](#2-damage-discovery-and-initial-response)
3. [Photo Evidence and Documentation Requirements](#3-photo-evidence-and-documentation-requirements)
4. [Reporting Timelines and Deadlines](#4-reporting-timelines-and-deadlines)
5. [Liability Determination — Who Pays?](#5-liability-determination--who-pays)
6. [Damage Inspection Process](#6-damage-inspection-process)
7. [Resolution Options](#7-resolution-options)
8. [Supplier Claims Process](#8-supplier-claims-process)
9. [Carrier/Freight Claims](#9-carrierfreight-claims)
10. [Partial Delivery Damage](#10-partial-delivery-damage)
11. [Material-Specific Damage Handling](#11-material-specific-damage-handling)
12. [Damage Prevention in Delivery](#12-damage-prevention-in-delivery)
13. [Insurance for Damaged Goods](#13-insurance-for-damaged-goods)
14. [System Workflow for Damage Claims](#14-system-workflow-for-damage-claims)
15. [Customer Retention After Damage Incident](#15-customer-retention-after-damage-incident)
16. [HyperQuote Implementation Recommendations](#16-hyperquote-implementation-recommendations)

---

## 1. Legal Framework — Egyptian Law

### 1.1 Egyptian Civil Code (Articles 447-455) — Hidden Defects Warranty

The foundational legal framework for damaged/defective goods in Egypt comes from the Egyptian Civil Code:

**Article 447 — Seller's Warranty Obligation:**
The seller is liable to the buyer if, at the time of delivery, the product does not possess the qualities the seller guaranteed, OR if the product has defects that diminish its value or usefulness for the intended purpose (as indicated in the contract or from the nature of the product).

**Article 449 — Buyer's Notification Obligation:**
- The buyer must verify the item's condition "as soon as he is able to do so, in accordance with customary practice."
- If a defect is discovered, the buyer must notify the seller "within a reasonable period."
- Failure to notify = the buyer is deemed to have accepted the goods with the defect.
- For defects that CANNOT be discovered by normal inspection (hidden defects), notification must occur "as soon as it appears."

**Article 452 — Prescription Period:**
- The guarantee claim expires after **1 year from the date of delivery**, even if the buyer did not discover the defect until after that period.
- **Critical exception:** The seller CANNOT invoke this 1-year deadline if they intentionally concealed the defect (fraud).

**Seller Is NOT Liable If:**
- The buyer knew of the defect at the time of sale
- The buyer could have discovered the defect through ordinary examination ("care of an ordinary person")
- The defect is "customarily tolerated" (industry-standard minor imperfections)
- The defect arose AFTER delivery

**Remedies Under Civil Code:**
1. Terminate the contract (return item, receive full refund)
2. Retain the item and obtain a price reduction equivalent to the defect's diminished value

### 1.2 Egyptian Commercial Code (Law No. 17 of 1999) — Commercial Sales

The Commercial Code adds specific B2B provisions on top of the Civil Code:

**Article 99 — Delivery Documentation Acceptance:**
- If a buyer receives a goods list and does not object within **10 days**, it is considered implicit acceptance.
- After acceptance, the buyer cannot later challenge the list's contents.

**Article 101 — Notification of Defects in Commercial Sales:**
- The buyer must notify the seller of any discovered shortage, defect, or non-conformity within **15 days from actual receipt.**
- Legal action for rescission or price reduction must be filed within **60 days from receipt.**
- The overall claim expires after **6 months from delivery** — unless the seller committed fraud.

**Article 94 — Risk Transfer During Transport:**
- When goods are shipped, the risk of deterioration passes to the buyer from the moment the goods are delivered to the transporter — unless the law or contract states otherwise.
- This is critical for drop-ship: once the supplier hands goods to the carrier, damage risk may shift depending on the contract terms.

### 1.3 Consumer Protection Law (Law No. 181 of 2018)

While HyperQuote's customers are B2B (not consumers), this law establishes minimum standards:
- **14 days** from receiving goods to return defective items for refund/exchange (Article 8(1))
- **30 days** from receipt to exchange or return non-conforming goods
- Suppliers must inform the Consumer Protection Agency within **7 days** of discovering a product defect

### 1.4 Transport/Carrier Liability Under Egyptian Law

Egypt's Maritime Trade Law No. 8 of 1990 governs maritime carriage, but for **domestic road freight** (which is HyperQuote's primary concern):
- Carriers are liable for loss, damage, or delay to cargo during their custody
- Exceptions: force majeure, inherent defects of goods, shipper fault
- The carrier has a duty to deliver cargo safely and on time
- For international road freight, the CMR Convention applies — motor carriers are liable unless they prove exempt circumstances (inherent defects, acts of war, natural disasters)

### 1.5 Limitation of Liability Clauses

Egyptian law permits contractual limitations of liability (freedom of contract principle), BUT:
- Clauses limiting liability for **gross negligence or fraud are void** (violate public order)
- Courts apply a corrective/compensatory approach — damages must represent actual, foreseeable losses
- Speculative or indirect damages are NOT awarded

### 1.6 Practical Legal Summary for HyperQuote

| Timeline | What Must Happen | Legal Basis |
|----------|-----------------|-------------|
| At delivery | Buyer examines goods per customary practice | Civil Code Art. 449 |
| 10 days | Object to goods list or lose right to challenge | Commercial Code Art. 99 |
| 15 days | Notify seller of shortage/defect/non-conformity | Commercial Code Art. 101 |
| 60 days | File legal action for rescission or price reduction | Commercial Code Art. 101 |
| 6 months | Overall claim expiry (unless fraud) | Commercial Code Art. 101 |
| 1 year | Civil Code warranty claim expiry (unless fraud) | Civil Code Art. 452 |

---

## 2. Damage Discovery and Initial Response

### 2.1 What Happens When Materials Arrive Damaged

**Scenario:** A construction company receives a delivery of cement bags, rebar, plywood, or pipes at their construction site. Some or all items are visibly damaged.

**Standard Process in Egyptian Building Materials Market:**

**Step 1 — On-Site Visual Inspection at Delivery (CRITICAL)**
- The site foreman/receiving clerk inspects goods AS the delivery truck is being unloaded
- Compare delivered quantities against the delivery note/BOL
- Check for visible damage: torn bags, bent bars, wet packaging, cracked pipes
- This is the MOST IMPORTANT moment — damage noted at delivery is virtually undeniable

**Step 2 — Annotate the Delivery Note/BOL**
- If ANY damage is found, the receiver MUST write specific notes on the delivery receipt BEFORE signing
- Example annotations: "15 cement bags torn/wet," "3 rebar bundles bent," "Plywood stack water-damaged on edges"
- Have the delivery driver co-sign the annotated receipt
- If the driver refuses to sign, note "Driver refused to acknowledge damage" and have a witness sign

**Step 3 — Immediate Photo/Video Documentation**
- Photograph everything before moving damaged goods
- Get wide shots showing truck, packaging, and damage context
- Get close-up shots of each damaged item
- Record the delivery note with annotations visible in frame
- Timestamp everything (phone cameras do this automatically)

**Step 4 — Contact the Seller**
- In Egyptian B2B practice: phone call FIRST, then formal written notice (WhatsApp + email)
- For HyperQuote customers: call HyperQuote's operations team immediately
- Do NOT wait — the 15-day Commercial Code clock starts at actual receipt

**Step 5 — Segregate Damaged from Undamaged Goods**
- Accept the undamaged portion (refusing the entire shipment creates storage liability and extra cost)
- Physically separate and mark damaged items
- Do NOT use, modify, or attempt to repair damaged items before the claim is resolved

### 2.2 Who Does the Customer Call?

In the HyperQuote model:
- **Customer calls HyperQuote** — HyperQuote is the seller of record regardless of delivery method
- HyperQuote is the customer's single point of contact
- HyperQuote then manages the upstream claim against the supplier/carrier
- The customer should NEVER need to deal directly with the supplier or carrier for damage claims

---

## 3. Photo Evidence and Documentation Requirements

### 3.1 What Photos Are Needed

**Minimum photo evidence for a defensible damage claim:**

| Photo Type | What to Capture | Why It Matters |
|-----------|----------------|---------------|
| **Truck/vehicle** | License plate, truck condition, load state before unloading | Proves which delivery caused the damage |
| **Packaging overview** | Wide shot of entire load on truck or at delivery point | Shows overall condition of shipment |
| **Packaging damage** | Torn bags, wet cartons, crushed pallets, broken strapping | Proves damage occurred during transit, not after |
| **Product damage** | Close-up of bent rebar, cracked pipes, delaminated plywood, hardened cement | Proves actual material damage |
| **Delivery note/BOL** | The annotated delivery document with damage notes visible | Links photos to specific delivery |
| **Quantity shots** | Damaged items counted and laid out | Proves quantity of damaged goods |
| **Environmental context** | Weather conditions, site conditions (dry ground vs. muddy) | Prevents "you stored it wrong" defense |
| **Label/markings** | Supplier labels, batch numbers, order references on packaging | Links damage to specific order/supplier |

### 3.2 Photo Quality Standards

- **Resolution:** Standard phone camera (12MP+) is sufficient — no professional photography needed
- **Lighting:** Natural daylight preferred; flash for dark areas
- **Angles:** Each damaged item from at least 2 angles (overview + close-up)
- **Scale reference:** Include a known object (hand, ruler, pen) in close-up shots for scale
- **Timestamp:** Use phone's built-in timestamp (verify date/time is correct)
- **GPS/Location:** Enable location services for geotagged photos proving the delivery site

### 3.3 Legal Sufficiency of Phone-Camera Evidence

**In Egyptian commercial disputes:**
- Phone-camera photos ARE accepted as evidence in Egyptian courts and arbitration
- No requirement for professional/notarized photography in commercial claims
- Key factors for legal weight:
  - Timestamps must be consistent with delivery date
  - Photos should be contemporaneous (taken at or very near delivery time)
  - Metadata (EXIF data) adds credibility
  - Chain of custody matters: original files from the phone > screenshots > forwarded copies
- WhatsApp photo messages to the seller serve as timestamped notification AND evidence simultaneously

### 3.4 Video Evidence

- Video is more powerful than photos for showing the EXTENT of damage
- Walk-around video of the truck and unloading process is ideal
- Voice narration describing what is visible adds context
- 30-60 second clips are sufficient per damage area

### 3.5 BOL/Delivery Note Annotations

The Bill of Lading or delivery note is the MOST important document:
- Must be annotated BEFORE signing for receipt
- Specific language matters: "50 bags torn" is better than "some bags damaged"
- Both receiver and driver should sign the annotated copy
- Photographs of the annotated BOL are essential backup
- If the receiver signs a clean BOL (no annotations), it becomes MUCH harder to prove damage occurred during transit

---

## 4. Reporting Timelines and Deadlines

### 4.1 Egyptian Law Timelines

**Commercial Code (B2B — the applicable framework for HyperQuote):**
- **Immediate:** Examine goods as soon as possible per customary practice
- **15 days from actual receipt:** Notify seller in writing of shortage, defect, or non-conformity
- **60 days from receipt:** File legal action for rescission or price reduction
- **6 months from delivery:** Overall claim expiry (commercial sales)

**Civil Code (fallback for hidden defects):**
- **"Reasonable period"** after discovery: Notify seller of hidden defects
- **1 year from delivery:** Overall warranty claim expiry
- **For operational suitability guarantees:** Notify within 1 month of defect appearance; sue within 6 months

### 4.2 Industry Standard in Egyptian Building Materials

In practice, the Egyptian building materials industry operates on tighter timelines than the legal maximums:

| Damage Type | Industry-Expected Reporting | Practical Consequence of Delay |
|------------|---------------------------|-------------------------------|
| Visible damage (torn bags, bent rebar) | At delivery, before signing | If not noted at delivery, supplier will deny |
| Visible damage discovered during unloading | Same day / within 24 hours | Supplier likely still accepts claim |
| Quantity shortage | At delivery, count against BOL | Very hard to prove after signing clean receipt |
| Hidden damage (cement hardened internally, internal pipe cracks) | Within 48-72 hours of delivery | Supplier accepts if discovery is documented |
| Latent defects (plywood delamination over time, rebar quality issues) | Within 15 days (Commercial Code) | Must prove defect existed before delivery |

### 4.3 Hidden Damage Discovery

Hidden damage is damage that cannot be detected by normal visual inspection at delivery:

**Examples in building materials:**
- Cement bags appear intact but cement inside has absorbed moisture and hardened (lumps)
- Rebar passes visual check but has internal stress fractures from rough handling
- Plywood appears dry on outside but inner layers have moisture damage
- Pipes appear intact but have hairline cracks only visible under pressure testing

**Process for hidden damage:**
1. Document the moment of discovery (photos, time, who discovered it)
2. Notify HyperQuote immediately (within hours, not days)
3. Do NOT use the material — using it weakens the claim
4. HyperQuote sends inspector or requests supplier inspection within 24-48 hours
5. Joint inspection report documents the hidden damage
6. Claim proceeds under Civil Code hidden defects provisions (1 year from delivery)

### 4.4 What Happens If the Customer Reports Late?

| Timing | Legal Position | Practical Reality |
|--------|---------------|-------------------|
| At delivery | Full rights, strongest position | Supplier/carrier cannot deny |
| 1-3 days | Strong position | Supplier usually cooperates |
| 4-15 days | Still within Commercial Code limit | Supplier may resist, needs strong evidence |
| 16-60 days | Outside notification window, can still sue | Weak position, supplier will argue acceptance |
| 61 days - 6 months | Cannot sue for rescission/price reduction | Only Civil Code hidden defects route remains |
| Over 6 months | Commercial claim expired | Only Civil Code (1 year) for hidden defects |
| Over 1 year | All claims expired | No legal remedy unless seller committed fraud |

---

## 5. Liability Determination — Who Pays?

### 5.1 The Three-Party Liability Chain

In HyperQuote's model, three parties may be responsible for damage:

```
Supplier → [Carrier/Transport] → Customer (Construction Site)
        ↕                              ↕
    HyperQuote (seller of record / intermediary)
```

**Fundamental principle:** HyperQuote is ALWAYS liable to the customer as the seller. HyperQuote then recovers from the responsible party upstream.

### 5.2 Liability by Delivery Scenario

#### Scenario A: HyperQuote's Own Fleet Delivery

| Party | Liability | Reasoning |
|-------|-----------|-----------|
| HyperQuote | **Fully liable to customer** | Both seller AND carrier — no one else to blame |
| Supplier | Liable to HyperQuote if goods were damaged before pickup | Only if HyperQuote can prove goods were defective at supplier's warehouse |
| HyperQuote's driver | Employment liability — HyperQuote is responsible for employee actions | Driver may face internal disciplinary action |

**Process:** HyperQuote resolves with customer directly and absorbs the cost OR claims against supplier if damage was pre-existing.

#### Scenario B: Drop-Ship (Supplier Delivers Directly)

| Party | Liability | Reasoning |
|-------|-----------|-----------|
| HyperQuote | **Liable to customer as seller of record** | Egyptian law: seller warrants goods at delivery (Civil Code Art. 447) |
| Supplier | Liable to HyperQuote | Supplier contracted to deliver goods in good condition |
| Supplier's carrier | Liable to supplier (or HyperQuote if HyperQuote arranged transport) | Carrier liability for goods in their custody |

**Key legal point (Art. 94):** Risk of deterioration passes to the buyer when goods are handed to the transporter — BUT this is between supplier and HyperQuote. To the end customer, HyperQuote is still the seller and responsible.

**Process:** HyperQuote resolves with customer first, then claims against supplier. Supplier claims against their carrier if damage was in-transit.

#### Scenario C: Third-Party Carrier (HyperQuote Arranges Transport)

| Party | Liability | Reasoning |
|-------|-----------|-----------|
| HyperQuote | **Liable to customer as seller** | Arranged the transport, chose the carrier |
| Carrier | Liable to HyperQuote | Contractual duty to deliver safely |
| Supplier | Not liable (if goods were in good condition when carrier picked up) | Risk transferred at handover to carrier |

**Process:** HyperQuote resolves with customer, then files freight claim against carrier.

### 5.3 How to Determine Where Damage Occurred

**Evidence that damage occurred at supplier (pre-shipment):**
- Multiple deliveries from same batch show same defect
- Damage type inconsistent with transit damage (e.g., manufacturing defect)
- Supplier's own loading photos show pre-existing issues
- Driver's pre-trip inspection photos show goods already damaged

**Evidence that damage occurred in transit:**
- Goods loaded in good condition (supplier loading photos/inspection)
- Damage consistent with movement/vibration/impact (shifted loads, crushed items)
- Weather exposure during transport (wet cement, sun-damaged materials)
- Accident report or incident during delivery

**Evidence that damage occurred at customer site (post-delivery):**
- Clean, signed delivery receipt with no annotations
- Photos show goods in good condition at delivery
- Damage discovered long after delivery
- Damage consistent with improper storage at site

### 5.4 Contractual Allocation — What HyperQuote's Contracts Should Specify

**With Suppliers:**
- Supplier warrants goods free of defects at point of handover
- Supplier responsible for proper packaging meeting transport requirements
- For drop-ship: supplier assumes full delivery responsibility until customer signs receipt
- Damage claim response within 48 hours of notification
- Credit note or replacement within 5 business days of confirmed damage
- Supplier bears return transport cost for damaged goods

**With Customers:**
- Customer must inspect goods at delivery and note damage on BOL
- Customer must report damage within 48 hours (tighter than 15-day legal minimum)
- Customer must provide photo evidence per HyperQuote's documentation checklist
- HyperQuote commits to acknowledge damage report within 4 hours
- HyperQuote commits to resolution proposal within 24-48 hours
- Customer must segregate and preserve damaged goods until resolution

**With Carriers (own fleet or contracted):**
- Carrier assumes custody and liability from pickup to delivery
- Carrier provides pre-loading and post-delivery photos
- Carrier insures goods in transit (or HyperQuote carries blanket cargo policy)
- Claims must be filed within 14 days of delivery
- Carrier responds within 30 days, resolves within 120 days

---

## 6. Damage Inspection Process

### 6.1 Inspection Tiers

The inspection process should scale with the value and severity of the damage:

#### Tier 1: Minor Damage (< 2% of order value)
**Examples:** 5 torn cement bags out of 500, minor packaging scuffs, small quantity shortage
**Inspector:** Customer self-inspection with photo evidence
**Process:**
1. Customer takes photos per checklist
2. Submits via HyperQuote portal/WhatsApp
3. HyperQuote operations reviews photos remotely
4. Approved/denied within 24 hours
5. Credit note or replacement scheduled

#### Tier 2: Moderate Damage (2-10% of order value)
**Examples:** 50 damaged bags out of 500, several bent rebar bundles, water-damaged plywood section
**Inspector:** HyperQuote representative visits site
**Process:**
1. Customer reports and documents immediately
2. HyperQuote sends field representative within 24-48 hours
3. Joint inspection with customer's site foreman
4. Written inspection report with photos, signed by both parties
5. HyperQuote proposes resolution within 48 hours
6. If supplier is responsible, HyperQuote files upstream claim simultaneously

#### Tier 3: Major Damage (> 10% of order value OR structural/safety concern)
**Examples:** Entire truck load water-damaged, widespread rebar deformation, cracked structural pipes
**Inspector:** Third-party inspection company
**Process:**
1. Customer reports immediately, does not move goods
2. HyperQuote engages third-party inspector (e.g., GOST Egypt, SGS, Bureau Veritas, or Pro QC)
3. Independent inspection within 48-72 hours
4. Inspector produces formal report with photos, measurements, material testing if needed
5. Report shared with all parties (customer, HyperQuote, supplier, insurer)
6. Resolution based on independent findings
7. If disputed, arbitration or court using inspector's report as evidence

### 6.2 What the Inspector Checks

**General inspection checklist:**
- Quantity count (actual vs. BOL vs. order)
- Visual condition of packaging
- Visual condition of product
- Damage type classification (mechanical, water, heat, chemical)
- Damage cause assessment (transit, handling, storage, manufacturing)
- Percentage of goods affected
- Usability assessment: can damaged goods still be used? At what capacity?
- Photos and measurements
- Witness statements

**Material-specific checks:**

| Material | Inspection Method | Pass/Fail Criteria |
|----------|------------------|-------------------|
| Cement | Visual (bags), tactile (hardness through bag), weight check | Torn bags = fail; lumpy/hardened = fail; weight < 49kg on 50kg bag = fail |
| Rebar | Visual straightness check, measurement against tolerances | Bend > specified tolerance = fail; rust beyond surface = fail |
| Plywood | Visual (edges, faces), moisture meter reading, delamination check | Moisture > 12% = concern; visible delamination = fail; warping = fail |
| Pipes (PVC/metal) | Visual crack check, roundness check, pressure test for critical applications | Any visible crack = fail; out-of-round beyond tolerance = fail |
| Tiles/ceramics | Visual chip/crack check, percentage sampling | Chips > 5% = fail; cracks = fail |
| Steel sections | Visual, straightness, measurement | Twist/bow beyond tolerance = fail |

### 6.3 Third-Party Inspection Companies Operating in Egypt

| Company | Services | Notes |
|---------|----------|-------|
| GOST Egypt | Project third-party inspection, materials testing | Strong in construction materials |
| SGS Egypt | Conformity assessment, product testing, inspection | Global brand, widely recognized |
| Bureau Veritas Egypt | Quality inspection, testing | Global brand |
| Pro QC International | Factory audit, product inspection | Good for supplier-side verification |
| ECQA | Quality inspection, testing, audit | Egyptian company |

---

## 7. Resolution Options

### 7.1 All Possible Outcomes

Listed from most common to least common in Egyptian building materials:

#### Option 1: Full Replacement (Most Common for Total Damage)
- Supplier/HyperQuote ships replacement goods at no cost to customer
- Customer returns damaged goods OR HyperQuote arranges pickup
- Original delivery timeline is reset
- **When used:** Entire delivery or large portion is unusable
- **Timeline:** ASAP — often next available truck/delivery window
- **Financial impact:** No change to invoice; cost absorbed by responsible party

#### Option 2: Partial Replacement (Most Common for Partial Damage)
- Only damaged items are replaced
- Undamaged items remain with customer
- Replacement delivery for damaged quantity only
- **When used:** Some items damaged, most are fine (e.g., 50/500 cement bags)
- **Timeline:** Replacement included in next delivery or dedicated run
- **Financial impact:** No change to invoice; replacement cost absorbed

#### Option 3: Credit Note (Very Common in Egyptian B2B)
- HyperQuote issues a credit note for the value of damaged goods
- Credit applied against current invoice or future purchases
- Customer does NOT return damaged goods (often impractical for building materials)
- **When used:** Damage is clear, return is impractical (heavy/bulky items), ongoing relationship
- **Timeline:** Credit note issued within 3-5 business days
- **Financial impact:** Invoice reduced by credit amount; HyperQuote claims upstream

#### Option 4: Price Reduction / Discount (Customer Keeps Damaged Goods)
- Customer agrees to keep damaged goods at a negotiated discount
- Useful when goods are still partially usable
- **When used:** Minor damage, goods still functional (slightly bent rebar that can be straightened, cosmetically damaged tiles used in hidden areas, etc.)
- **Timeline:** Negotiated immediately or within 48 hours
- **Financial impact:** Invoice adjusted downward; discount amount = agreed depreciation

#### Option 5: Full Refund (Rare for Established Relationships)
- Customer returns all goods, full refund issued
- Essentially, the sale is cancelled
- **When used:** Entire delivery catastrophically damaged, customer has lost confidence, first-time order gone wrong
- **Timeline:** Refund processed within payment terms
- **Financial impact:** Full reversal; relationship at risk

#### Option 6: Return and Reorder (Effectively Replacement with Delay)
- Damaged goods returned, new order placed (may be from different supplier/batch)
- **When used:** Original supplier batch was defective, need different source
- **Timeline:** Depends on new sourcing
- **Financial impact:** Original transaction reversed, new transaction created

### 7.2 Decision Matrix for Resolution

| Factor | Replacement | Credit Note | Price Reduction | Refund |
|--------|------------|-------------|-----------------|--------|
| Damage < 5% of order | Partial replacement | Preferred | If goods are usable | Never |
| Damage 5-50% of order | Partial replacement | Common | Negotiate | Rare |
| Damage > 50% of order | Full replacement | Less common | Unlikely | Possible |
| Customer needs material urgently | Best option | Acceptable (they buy elsewhere) | Only if usable NOW | Bad option |
| Return logistics impractical | N/A (ship new, customer disposes) | Best option | Good option | Requires return |
| First-time customer | Replacement + goodwill | Acceptable | Avoid | Last resort |
| Repeat customer | Standard replacement | Standard | Negotiable | Never |
| High-value order | Replacement | Common | Negotiate carefully | Avoid |

### 7.3 Most Common in Egyptian Building Materials Market

Based on industry practice:
1. **Partial replacement** — Default for moderate damage where customer needs the material
2. **Credit note** — Default for situations where return is impractical or customer does not need immediate replacement
3. **Price reduction** — Common for cosmetic/minor damage where goods are still usable
4. **Full replacement** — Used for total damage or quality defects across entire batch
5. **Refund** — Rare; only when relationship is already strained or damage is catastrophic

---

## 8. Supplier Claims Process

### 8.1 Overview

When HyperQuote receives a damage report from a customer, HyperQuote must simultaneously:
1. Resolve the customer's issue (customer-facing)
2. File a claim against the responsible supplier (upstream)

These are PARALLEL processes — never make the customer wait for the supplier claim to resolve.

### 8.2 Step-by-Step Supplier Claim Process

**Step 1: Immediate Notification (Day 0)**
- Phone call to supplier's sales/account manager
- WhatsApp message with photos (creates timestamped record)
- Formal email notification with:
  - Order number / PO number
  - Delivery date and BOL reference
  - Description of damage
  - Photo evidence attached
  - Customer impact statement
  - Preliminary claim amount

**Step 2: Formal Claim Submission (Days 1-3)**
- Written claim letter / debit note sent to supplier
- Include ALL documentation:
  - Original purchase order
  - Delivery note / BOL (annotated copy)
  - Photo evidence package
  - Inspection report (if applicable)
  - Customer's damage report
  - Invoice reference
  - Claim amount with calculation

**Step 3: Supplier Investigation (Days 3-14)**
- Supplier may request to inspect goods
- Supplier may send their own representative
- Supplier reviews internal records (batch quality, loading photos, carrier records)
- HyperQuote facilitates supplier access to damaged goods at customer site or HyperQuote warehouse

**Step 4: Supplier Response (Days 7-30)**
- Supplier accepts claim fully → issues credit note or arranges replacement
- Supplier accepts claim partially → negotiation on amount
- Supplier denies claim → escalation process

**Step 5: Resolution (Days 14-45)**
- Credit note received and applied to supplier account
- Replacement goods shipped
- Or negotiated settlement reached

### 8.3 Documentation Required for Supplier Claims

| Document | Purpose | Who Provides |
|----------|---------|-------------|
| Purchase Order | Proves what was ordered | HyperQuote |
| Delivery Note / BOL (annotated) | Proves what was delivered and damage noted | Customer / Driver |
| Photos of damage | Visual proof | Customer / HyperQuote inspector |
| Inspection report | Independent verification (for Tier 2/3) | HyperQuote or third-party |
| Customer complaint record | Proves customer reported damage | HyperQuote system |
| Invoice | Proves financial value at stake | HyperQuote |
| Debit note | Formal financial claim | HyperQuote to supplier |
| Previous correspondence | Paper trail of notifications | HyperQuote |

### 8.4 Typical Supplier Response Times in Egypt

| Response Type | Timeline | Notes |
|--------------|----------|-------|
| Acknowledgment of claim | 1-3 days | Verbal/WhatsApp |
| Formal response | 7-14 days | Written acceptance or denial |
| Credit note issuance | 7-30 days | After acceptance |
| Replacement shipment | 3-14 days | Depending on availability |
| Disputed claim resolution | 30-90 days | May require escalation |

### 8.5 When the Supplier Denies Responsibility

**Common supplier defenses:**
- "Goods left our warehouse in perfect condition" — Counter with: BOL annotations, loading photos, carrier records
- "Damage happened during transport" — Counter with: supplier arranged transport (drop-ship), so supplier is liable to HyperQuote
- "Customer stored goods improperly" — Counter with: photos taken at delivery, timeline of report
- "Normal wear and tear / industry tolerance" — Counter with: quantify the actual impact, reference specs
- "Customer reported too late" — Counter with: timestamp evidence, Commercial Code 15-day window

**Escalation path for denied claims:**
1. First escalation: Senior management meeting (HyperQuote procurement + supplier management)
2. Second escalation: Formal demand letter with legal reference (Commercial Code Articles)
3. Third escalation: Engage third-party mediator
4. Final escalation: Arbitration or court action (Economic Courts for commercial disputes)

**Leverage HyperQuote has:**
- Future order volume (the real leverage in Egyptian B2B)
- Outstanding payables to the supplier (can offset against damage claim)
- Supplier's reputation in the market
- Threat of switching to alternative suppliers

### 8.6 Debit Note vs. Credit Note

- **Debit note:** HyperQuote issues TO the supplier, reducing what HyperQuote owes. "We are deducting X from our next payment because of damage."
- **Credit note:** Supplier issues TO HyperQuote, acknowledging the claim. "We credit your account with X for the damaged goods."

In practice, the supplier issuing a credit note is cleaner accounting. If the supplier refuses, HyperQuote issues a debit note and offsets against the next payment — this is common practice but can strain the relationship.

---

## 9. Carrier/Freight Claims

### 9.1 When to File a Carrier Claim

File against the carrier when:
- HyperQuote arranged the transport (own fleet or contracted carrier)
- Goods were in good condition when loaded (supplier confirms, loading photos exist)
- Damage is consistent with transit damage (impact, vibration, weather exposure)
- Carrier documentation (BOL, GPS, incident reports) shows issues during transport

### 9.2 Carrier Claim Process in Egypt

**Step 1: Note damage at delivery**
- Annotate the delivery receipt/BOL with specific damage descriptions
- Driver must be informed and acknowledge (or note refusal to acknowledge)

**Step 2: Preserve evidence**
- Photos of truck condition, load securement, and damaged goods
- Retain all packaging and damaged items
- Obtain driver statements if possible

**Step 3: File written claim**
- Within **14 days of delivery** (industry best practice; many carriers contractually require this)
- Include: BOL, photos, damage assessment, claim amount, invoice for goods
- Send via traceable method (email + registered mail)

**Step 4: Carrier investigation**
- Carrier must acknowledge claim within **30 days**
- Carrier investigates: driver logs, GPS data, incident reports, vehicle inspection records
- Carrier may send adjuster to inspect goods

**Step 5: Carrier response**
- Carrier must issue substantive response within **120 days**
- If more time needed, carrier provides status updates every **60 days**
- Decision: accept, partially accept, or deny

**Step 6: Resolution**
- Accepted: payment or credit within agreed terms
- Denied: request reconsideration with additional evidence, then legal action if necessary

### 9.3 Carrier Claim Documentation

| Document | Requirement |
|----------|-------------|
| Bill of Lading (signed, annotated) | Mandatory |
| Commercial invoice for goods | Mandatory |
| Packing list | Mandatory |
| Photos of damage | Mandatory |
| Inspection report | Recommended for claims > EGP 50,000 |
| Carrier contract / rate confirmation | For proving carrier's obligations |
| Weather reports (if weather damage) | Supporting evidence |
| GPS/tracking data | If available from carrier |

### 9.4 Common Carrier Defenses

- "Goods were already damaged when loaded" — Counter: supplier's pre-shipment inspection, loading photos
- "Inherent defect of goods" — Counter: goods were properly packaged per industry standards
- "Force majeure / act of God" — Counter: carrier should have taken precautions (tarps for rain, etc.)
- "Shipper's fault / inadequate packaging" — Counter: packaging met contractual specifications

---

## 10. Partial Delivery Damage

### 10.1 The 50/500 Scenario

**Example:** 500 cement bags ordered, 50 arrive damaged (10%), 450 are fine.

**Best Practice:**

**At delivery:**
1. Accept the ENTIRE shipment (do not refuse)
2. Annotate the BOL: "50 bags torn/damaged out of 500 delivered. Accepted with reservations."
3. Photograph the 50 damaged bags
4. Physically segregate the 50 damaged bags from the 450 good ones
5. Report to HyperQuote immediately

**Why accept the whole shipment:**
- Refusing the entire load because 10% is damaged is impractical and costly
- Carrier may place refused goods in storage at YOUR expense
- Customer needs the 450 good bags for their construction schedule
- Legal position is stronger when you accept with documented reservations

### 10.2 Invoice Adjustment Methods

**Method 1: Partial Credit Note (Preferred)**
- Original invoice for 500 bags at full price
- Credit note issued for 50 damaged bags
- Net payment = 450 bags at full price
- Clean accounting trail

**Method 2: Revised Invoice**
- Cancel original invoice
- Issue new invoice for 450 bags only
- Simpler but disrupts accounting if original invoice was already in the system

**Method 3: Deduction at Payment**
- Customer pays original invoice minus deduction for 50 bags
- Customer references the damage claim number with payment
- Less formal, can cause reconciliation issues

**Recommended for HyperQuote:** Method 1 (Partial Credit Note) — it creates the clearest audit trail, links to the damage claim in the system, and preserves the original invoice for supplier claims.

### 10.3 Tracking Partial Damage in the System

The system must track:
- Original order: 500 bags
- Delivered: 500 bags
- Accepted (good): 450 bags
- Damaged: 50 bags
- Damage claim #: [reference]
- Status: Open → Under Review → Approved → Credit Issued → Closed
- Credit note #: [reference]
- Supplier claim #: [reference]
- Supplier credit received: Yes/No

### 10.4 What Happens to the Damaged Goods?

| Scenario | Action | Who Pays |
|----------|--------|----------|
| Customer can't use damaged goods at all | HyperQuote arranges pickup OR customer disposes | HyperQuote bears cost |
| Damaged goods have scrap value | Customer keeps at scrap value, credit reduced accordingly | Credit = full price minus scrap value |
| Return is impractical (e.g., torn cement bags at remote site) | Customer disposes, full credit issued | HyperQuote claims from supplier without physical return |
| Supplier requires physical return to process claim | HyperQuote arranges return transport | HyperQuote bears cost, recovers from supplier |

---

## 11. Material-Specific Damage Handling

### 11.1 Cement (Bags and Bulk)

**Most common damage types:**
- Torn/punctured bags (hooks, rough handling, sharp edges)
- Moisture ingress (rain during transport, torn bags absorbing humidity)
- Hardened/lumpy cement (from moisture exposure over time)
- Short weight bags (manufacturing defect or material loss from torn bags)

**Salvage potential:**
- Torn bags: If caught immediately, contents can be transferred to other containers. Quality may be unaffected if no moisture contact.
- Moisture-damaged: Generally UNSALVAGEABLE. Cement that has absorbed moisture begins to hydrate and loses binding properties permanently. Lumpy cement cannot be reliably used in structural applications.
- Short weight: Can still be used if recalibrated, but customer loses material.

**Egyptian-specific concerns:**
- High ambient humidity in coastal areas (Alexandria, Port Said) and Nile Delta accelerates moisture damage
- Summer heat can cause bags to become brittle and tear more easily
- Dust/sand exposure during transport can contaminate exposed cement

**Handling protocol:**
1. Count damaged bags at delivery
2. Photograph torn bags with contents visible
3. For moisture suspicion: squeeze several bags to check for hardness/lumps
4. Segregate damaged bags immediately — do NOT stack good bags on top of torn ones
5. Cover remaining good bags with tarp/plastic sheeting immediately
6. Claim: credit note for damaged bags; replacement if urgently needed

### 11.2 Steel Rebar

**Most common damage types:**
- Bending/deformation during loading/unloading (improper crane use, dropped bundles)
- Bending during transport (inadequate load securement, shifting loads)
- Rust/corrosion (rain exposure, saltwater proximity, long transit times)
- Mixed grades/sizes (loading error, not damage per se)
- Bundle breakage (strapping failure, bars spilling)

**Salvage potential:**
- Minor bends (< 2-3 degrees): Can often be straightened on-site with mechanical straighteners. Common practice in Egypt. Usually acceptable for non-structural applications.
- Major bends (> 5 degrees): Cannot be reliably straightened for structural use. Cold-working changes material properties. Must be rejected for structural applications.
- Surface rust: Light surface rust is normal and does not affect structural performance. Only deep corrosion or pitting is a defect.
- Kinked/sharply bent: UNSALVAGEABLE for structural use. Scrap value only.

**Egyptian-specific concerns:**
- Rebar is transported in long bundles (6m, 9m, 12m) on flatbed trucks
- Egyptian roads can be rough, causing vibration and shifting
- Improper strapping is common — bundles slide and bend
- Rebar is often delivered to remote construction sites with poor access roads

**Handling protocol:**
1. Inspect bundles while still on truck before accepting
2. Check strapping integrity
3. Photograph any visible bends against a straight edge
4. Measure deformation if possible (ruler or string line)
5. Separate bent bars from straight bars during unloading
6. Claim: replacement for unusable bars; price reduction for bars that can be straightened on-site

### 11.3 Plywood and Wood Products

**Most common damage types:**
- Water damage / delamination (rain, leaks, ground moisture)
- Warping (uneven moisture exposure)
- Edge damage (impact during handling, forklift punctures)
- Surface scratches/scuffs (abrasion during transport)
- Mold/mildew (prolonged moisture + heat = fungal growth)

**Salvage potential:**
- Light water exposure (< 24-48 hours, exterior only): May dry out and be usable, but monitor for warping. Interior plywood more susceptible than marine/exterior grade.
- Delaminated plywood: UNSALVAGEABLE. Structural integrity is permanently compromised.
- Warped sheets: Minor warping may flatten under load. Severe warping = unusable.
- Mold: Surface mold can be treated, but deep mold penetration = reject.
- Edge damage: Can often be trimmed if sheets are oversized. Otherwise, downgrade to non-visible applications.

**Egyptian-specific concerns:**
- October-March rain season can expose uncovered loads to water
- Summer humidity in Delta region promotes mold growth
- Dust storms (khamaseen) can sandblast exposed surfaces

**Handling protocol:**
1. Inspect top and bottom sheets of each pallet (middle sheets are usually protected)
2. Check edges for delamination by gently prying
3. Use moisture meter if available (> 12% = concern)
4. Photograph any discoloration, warping, or layer separation
5. Claim: full replacement for delaminated/moldy sheets; price reduction for cosmetic damage

### 11.4 Pipes (PVC, UPVC, Metal)

**Most common damage types:**
- Cracking (impact, compression, dropping during handling)
- Crushing/ovalization (stacking too many layers, inadequate dunnage)
- Scratching/scoring (abrasion against other materials in mixed loads)
- UV degradation (prolonged sun exposure for PVC)
- Joint/bell damage (impacts on the socket/bell end)

**Salvage potential:**
- Cracked pipes: UNSALVAGEABLE. Any crack compromises pressure integrity. Cannot be reliably repaired for structural/pressure applications.
- Ovalized pipes: Minor ovalization may be correctable with heat (PVC) or may self-round under internal pressure. Severe ovalization = reject.
- Scratched pipes: Surface scratches generally acceptable unless > 10% of wall thickness. Deep scores = reject.
- UV-degraded PVC: Brittle, unreliable. UNSALVAGEABLE.
- Damaged bells/joints: Individual pipe ends can sometimes be cut and recoupled. Depends on application and length requirements.

**Egyptian-specific concerns:**
- PVC becomes brittle in high heat (Egyptian summers can exceed 45C)
- Metal pipes exposed to salty/humid air develop surface corrosion quickly
- Construction sites often lack proper pipe storage — pipes left in sun

**Handling protocol:**
1. Inspect bell/socket ends first (most vulnerable)
2. Roll each pipe to check for cracks and roundness
3. Tap test for metallic ring (cracked pipes sound dull)
4. Photograph every crack with scale reference
5. Claim: full replacement for cracked pipes; no partial credit (cracked pipe = worthless)

### 11.5 Tiles and Ceramics

**Most common damage types:**
- Chipping (impact, poor packaging, shifting loads)
- Cracking (compression, impact, thermal shock)
- Surface scratches (abrasion between tiles if poorly separated)
- Color/batch inconsistency (not damage, but non-conformity)

**Salvage potential:**
- Chipped tiles: Usable in cut areas (behind fixtures, edges under baseboards). Cannot be used in visible, full-piece applications.
- Cracked tiles: UNSALVAGEABLE for installation.
- Scratched tiles: Depends on depth and material. Polished porcelain = visible defect. Matte finish = may be acceptable.

**Handling protocol:**
1. Open packaging and sample check (10-20% random inspection)
2. Photograph damaged tiles with close-ups of defects
3. Note batch numbers and box counts
4. Claim: replacement for cracked/chipped; percentage discount for minor cosmetic issues

---

## 12. Damage Prevention in Delivery

### 12.1 Load Securement Standards

**For HyperQuote's fleet and contracted carriers:**

| Material | Securement Method | Minimum Requirements |
|----------|------------------|---------------------|
| Cement bags | Palletized + shrink wrap + strapping | Tarp/plastic cover mandatory; straps every 1.5m of pallet height |
| Rebar bundles | Bundled with steel strapping + friction mats | Minimum 4 tie-downs for 10m+ bundles; dunnage between bundle layers |
| Plywood sheets | Palletized + edge protectors + wrap | Covered load (tarp mandatory); edge boards to prevent corner damage |
| Pipes | Cradled/chocked + strapped | Wedges/cradles under round loads; straps prevent rolling; dunnage between layers |
| Tiles | Palletized + shrink wrap + corner protectors | Upright storage preferred; shock-absorbing material between boxes |
| Steel sections | Bundled + chained | Chains rated for load weight; blocking to prevent lengthwise shift |

### 12.2 Packaging Requirements (for Suppliers)

HyperQuote should specify in supplier contracts:

- **Cement:** Sealed bags (ideally plastic-lined paper or full poly bags); palletized loads wrapped in stretch film; moisture indicators on pallets
- **Rebar:** Bundled with minimum 3 steel straps per 6m bundle; painted/tagged bundle ends for grade identification
- **Plywood:** Edge protectors on all four corners; full wrap for exterior transport; moisture-indicating labels
- **Pipes:** Bell-end protection caps; separation materials between pipe layers; padding in mixed loads
- **Tiles:** Foam/cardboard separators between tiles; shrink-wrapped boxes on pallets; "FRAGILE" marking

### 12.3 Weather Protection

**Egypt-specific requirements:**
- **Tarps/covers:** Mandatory for ALL loads in October-March (rain season) and for cement/plywood year-round
- **Timing:** Schedule cement and plywood deliveries for early morning in summer to avoid peak humidity/heat
- **Tarp quality:** Heavy-duty 700-gauge+ polyethylene; secured at all edges (not just draped)
- **Route planning:** Avoid coastal routes during high-humidity periods when carrying cement
- **Unloading timing:** Do not leave loaded trucks parked overnight at sites without covered storage

### 12.4 Driver Training / Loading Standards

**For HyperQuote's drivers:**
- Pre-trip load inspection checklist (strapping, tarps, load stability)
- Photo documentation at loading (proof goods were loaded in good condition)
- Mid-route check points for long deliveries (re-tension straps, check tarps)
- Delivery unloading protocol (safe handling, no hooks on cement bags, controlled lowering of rebar)
- Customer communication protocol (present BOL, allow inspection, accept annotations professionally)

### 12.5 Damage Rate Benchmarks

Industry benchmarks for building materials delivery:

| Category | Acceptable Damage Rate | Warning Level | Action Required |
|----------|----------------------|---------------|-----------------|
| Cement | < 0.5% of bags per delivery | 0.5-2% | > 2% |
| Rebar | < 0.2% of tonnage | 0.2-1% | > 1% |
| Plywood | < 1% of sheets | 1-3% | > 3% |
| Pipes | < 0.3% of pieces | 0.3-1% | > 1% |
| Tiles | < 2% of pieces | 2-5% | > 5% |

If damage rates exceed "Action Required" thresholds consistently, investigate root causes: specific supplier, carrier, route, driver, or loading facility.

---

## 13. Insurance for Damaged Goods

### 13.1 Types of Relevant Insurance

| Insurance Type | What It Covers | Who Needs It |
|---------------|---------------|-------------|
| **Cargo/Transit Insurance** | Goods while in transit from supplier to customer | HyperQuote (for own fleet); or require carriers to carry it |
| **Inland Marine Insurance** | Goods in transit, temporary storage, at customer sites | HyperQuote |
| **Product Liability Insurance** | Injury/damage caused by defective products | HyperQuote (as seller) |
| **Commercial General Liability** | Third-party claims during delivery operations | HyperQuote |
| **Warehouse Insurance** | Goods while stored in HyperQuote's warehouse | HyperQuote |

### 13.2 Cargo/Transit Insurance Details

**Premium costs (general market rates):**
- Range: 0.2% to 2.0% of goods' total value per shipment
- Average: ~0.5% of shipment value
- Higher risk categories (fragile, hazardous): 1-2%
- Building materials (medium risk): 0.3-0.8%

**Example for HyperQuote:**
- Monthly shipment value: EGP 50M
- Annual shipment value: EGP 600M
- At 0.5% rate: ~EGP 3M/year premium (approximately $60K USD)
- Deductible: typically 5-10% of claim amount

**Coverage types:**
- **All Risk:** Covers all damage except excluded perils. Most comprehensive. Recommended.
- **Named Perils:** Only covers specifically listed risks. Cheaper but gaps in coverage.
- **Total Loss Only:** Only pays if entire shipment is lost. Not suitable for building materials (partial damage is more common).

### 13.3 Is Insurance Worth It for a New Distributor?

**Analysis:**

| Factor | Argument For | Argument Against |
|--------|-------------|-----------------|
| Cost | ~0.5% of revenue is manageable | Cash-strapped startups need every EGP |
| Protection | One bad delivery can wipe out months of profit | Small operation means small exposure initially |
| Customer confidence | "We're fully insured" is a selling point | Customers rarely ask about distributor's insurance |
| Supplier leverage | Can process claims without supplier cooperation | Adds administrative burden for small claims |
| Legal compliance | Not legally required but shows professionalism | No regulatory mandate for cargo insurance in Egypt |

**Recommendation:** Start with cargo insurance from Day 1. The premium is a fraction of the potential loss. A single truck of cement (EGP 500K+) lost to rain exposure would cost more than a year's premium.

### 13.4 Insurance Claim Process

1. **Report to insurer within 24-48 hours** of discovering damage
2. Submit: policy number, description of loss, estimated value, photos, BOL
3. Insurer assigns adjuster (may be third-party)
4. Adjuster inspects goods (within 3-7 days)
5. Insurer makes decision (30-60 days)
6. Payment minus deductible (if approved)

**Key point:** Insurance is a BACKSTOP, not the primary resolution mechanism. Always resolve with the customer first, then claim from the responsible party (supplier/carrier), then fall back to insurance if other avenues fail.

---

## 14. System Workflow for Damage Claims

### 14.1 End-to-End Workflow

```
PHASE 1: INTAKE (0-4 hours)
┌─────────────────────────────────┐
│ Customer reports damage          │
│ ├── Via portal (preferred)       │
│ ├── Via WhatsApp                 │
│ ├── Via phone call               │
│ └── Via email                    │
│                                  │
│ System auto-creates claim ticket │
│ Status: NEW                      │
│ Priority: Auto-assigned by value │
│ Assigned: Operations team        │
└──────────────┬──────────────────┘
               ▼
PHASE 2: TRIAGE (4-24 hours)
┌─────────────────────────────────┐
│ Operations reviews claim         │
│ ├── Verify documentation         │
│ │   ├── Photos sufficient?       │
│ │   ├── BOL annotated?           │
│ │   └── Timeline within limits?  │
│ ├── Classify damage tier (1/2/3) │
│ ├── Determine responsible party  │
│ └── Assign claim handler         │
│                                  │
│ Status: UNDER_REVIEW             │
│ Customer notified: "Received,    │
│ reviewing your claim"            │
└──────────────┬──────────────────┘
               ▼
PHASE 3: INVESTIGATION (24-72 hours)
┌─────────────────────────────────┐
│ Based on tier:                   │
│ ├── Tier 1: Remote review        │
│ ├── Tier 2: Site visit           │
│ └── Tier 3: Third-party inspect  │
│                                  │
│ Investigation includes:          │
│ ├── Review delivery records      │
│ ├── Check driver photos/logs     │
│ ├── Contact supplier if needed   │
│ ├── On-site inspection           │
│ └── Determine resolution         │
│                                  │
│ Status: INVESTIGATING            │
└──────────────┬──────────────────┘
               ▼
PHASE 4: RESOLUTION PROPOSAL (24-48 hours after investigation)
┌─────────────────────────────────┐
│ Propose resolution to customer:  │
│ ├── Replacement (full/partial)   │
│ ├── Credit note                  │
│ ├── Price reduction              │
│ └── Refund                       │
│                                  │
│ Status: RESOLUTION_PROPOSED      │
│ Customer must accept/negotiate   │
│ within 5 business days           │
└──────────────┬──────────────────┘
               ▼
PHASE 5: CUSTOMER ACCEPTANCE (1-5 days)
┌─────────────────────────────────┐
│ Customer accepts or negotiates   │
│ ├── Accepted → proceed           │
│ └── Counter-proposal → negotiate │
│                                  │
│ Status: ACCEPTED or NEGOTIATING  │
└──────────────┬──────────────────┘
               ▼
PHASE 6: EXECUTION (1-14 days)
┌─────────────────────────────────┐
│ Execute the resolution:          │
│ ├── Ship replacement goods       │
│ ├── Issue credit note            │
│ ├── Adjust invoice               │
│ └── Process refund               │
│                                  │
│ Status: EXECUTING                │
│ Track: replacement delivery,     │
│ credit note number, etc.         │
└──────────────┬──────────────────┘
               ▼
PHASE 7: SUPPLIER CLAIM (parallel, 1-45 days)
┌─────────────────────────────────┐
│ File claim against supplier:     │
│ ├── Send notification + evidence │
│ ├── Track supplier response      │
│ ├── Negotiate if denied          │
│ └── Receive credit/replacement   │
│                                  │
│ Status: SUPPLIER_CLAIM_OPEN      │
│ → SUPPLIER_CLAIM_ACCEPTED        │
│ → SUPPLIER_CLAIM_SETTLED         │
│ → SUPPLIER_CLAIM_DENIED          │
│ → SUPPLIER_CLAIM_ESCALATED       │
└──────────────┬──────────────────┘
               ▼
PHASE 8: FINANCIAL SETTLEMENT (1-30 days)
┌─────────────────────────────────┐
│ Close financial loop:            │
│ ├── Customer credit applied      │
│ ├── Supplier credit received     │
│ ├── Insurance claim (if needed)  │
│ ├── P&L impact calculated        │
│ └── Claim cost absorbed/recovered│
│                                  │
│ Status: FINANCIALLY_SETTLED      │
└──────────────┬──────────────────┘
               ▼
PHASE 9: CLOSE (after all settlements)
┌─────────────────────────────────┐
│ Close the claim:                 │
│ ├── All parties resolved         │
│ ├── Customer satisfaction check  │
│ ├── Root cause documented        │
│ └── Prevention action logged     │
│                                  │
│ Status: CLOSED                   │
│ Archive: full audit trail        │
└─────────────────────────────────┘
```

### 14.2 Claim Statuses

| Status | Description | Owner | SLA |
|--------|-------------|-------|-----|
| `NEW` | Claim received, not yet reviewed | System (auto) | Auto-create < 1 min |
| `UNDER_REVIEW` | Operations reviewing documentation | Operations Agent | Acknowledge within 4 hours |
| `AWAITING_EVIDENCE` | Customer needs to provide more docs/photos | Customer | Customer has 72 hours |
| `INVESTIGATING` | On-site inspection or internal review | Claim Handler | Complete within 72 hours |
| `RESOLUTION_PROPOSED` | Resolution offered to customer | Claim Handler | Propose within 24h of investigation |
| `NEGOTIATING` | Customer counter-proposed | Operations Manager | Resolve within 5 days |
| `ACCEPTED` | Customer accepted resolution | System | N/A |
| `EXECUTING` | Resolution being implemented | Operations | Complete within 7 days |
| `SUPPLIER_CLAIM_OPEN` | Upstream claim filed | Procurement | File within 3 days of customer claim |
| `SUPPLIER_CLAIM_PENDING` | Awaiting supplier response | Procurement | Follow up at 7, 14, 21 days |
| `SUPPLIER_CLAIM_SETTLED` | Supplier resolved the claim | Finance | N/A |
| `SUPPLIER_CLAIM_ESCALATED` | Supplier denied, escalation in progress | Management | Resolve within 30 days |
| `FINANCIALLY_SETTLED` | All money has moved correctly | Finance | Complete within 30 days of resolution |
| `CLOSED` | Fully resolved, archived | System | Auto-close after financial settlement |
| `CANCELLED` | Claim withdrawn by customer | System | N/A |
| `REJECTED` | Claim invalid (no evidence, outside timeline, etc.) | Operations Manager | Must explain rejection reason |

### 14.3 SLA Targets

| Metric | Target | Escalation Trigger |
|--------|--------|-------------------|
| First response to customer | < 4 hours | > 8 hours → auto-escalate to manager |
| Documentation review complete | < 24 hours | > 48 hours → escalate |
| Investigation complete | < 72 hours | > 5 days → escalate |
| Resolution proposed | < 48 hours after investigation | > 72 hours → escalate |
| Resolution executed (replacement shipped / credit issued) | < 7 days from acceptance | > 14 days → escalate |
| Supplier claim filed | < 3 business days | > 5 days → escalate |
| Total claim-to-close (customer side) | < 14 days | > 21 days → management review |
| Total claim-to-close (including supplier) | < 45 days | > 60 days → executive review |

### 14.4 Role Assignments

| Role | Responsibilities | Phase |
|------|-----------------|-------|
| **Customer** | Report damage, provide evidence, accept resolution | 1, 5 |
| **Operations Agent** | Intake, triage, initial review, customer communication | 1, 2 |
| **Claim Handler** | Investigation, inspection coordination, resolution proposal | 3, 4, 6 |
| **Operations Manager** | Escalation point, approve high-value resolutions, rejections | 2, 4, 5 |
| **Procurement** | Supplier claims, supplier negotiations | 7 |
| **Finance** | Credit notes, invoice adjustments, insurance claims, settlement | 6, 8 |
| **Field Inspector** | On-site inspection for Tier 2 claims | 3 |
| **Third-Party Inspector** | Independent inspection for Tier 3 claims | 3 |
| **General Manager** | Final escalation, policy decisions | Any |

### 14.5 Automation Opportunities

| Automation | Description | Priority |
|------------|-------------|----------|
| Auto-create claim from WhatsApp | Customer sends photos + description via WhatsApp → system creates claim | High |
| Auto-classify damage tier | Based on order value and reported damage percentage | Medium |
| Auto-assign handler | Based on territory, material type, availability | Medium |
| Auto-notify supplier | When claim is created for drop-ship orders, auto-send notification to supplier | High |
| SLA escalation alerts | Auto-notify manager when SLA is approaching breach | High |
| Photo validation | AI check: are photos sufficient? (quantity, quality, types) | Future |
| Auto-calculate credit | Based on damaged quantity × unit price → pre-fill credit note | Medium |
| Customer satisfaction survey | Auto-send after claim closure | Medium |
| Damage trend alerts | Alert when damage rates exceed thresholds for a supplier/carrier/route | High |

---

## 15. Customer Retention After Damage Incident

### 15.1 The Severity of the Problem

Research shows:
- **23%** of B2B customers never order again after a poor delivery experience
- **85%** say they would not return after a bad delivery in consumer contexts (B2B is more forgiving but the principle holds)
- For HyperQuote's market (high-value B2B orders), losing a customer over a damage incident means losing potentially millions in lifetime revenue

### 15.2 The Service Recovery Paradox

**Key insight:** Effectively resolving a damage issue can build MORE loyalty than if the issue had never occurred. Customers who experience excellent problem resolution often become stronger advocates than those who never had a problem.

This means a damage incident is not just a cost — it is an OPPORTUNITY to demonstrate HyperQuote's reliability and customer commitment.

### 15.3 First-Order Damage — The Critical Scenario

A new customer's first delivery arrives damaged. This is the HIGHEST RISK scenario for customer retention.

**What the best distributors do:**

**Immediate Response (First 4 Hours):**
1. Senior person (not junior agent) calls the customer personally
2. Apologize sincerely — take ownership even if not HyperQuote's fault
3. DO NOT blame the supplier or carrier to the customer
4. Ask: "What do you need right now to keep your project on track?"
5. Commit to a specific resolution timeline (and beat it)

**Resolution (First 24-48 Hours):**
1. Ship emergency replacement from nearest source — own warehouse, alternative supplier, or competitor purchase if necessary
2. Absorb ALL costs (expedited shipping, premium pricing from alternative source)
3. Do NOT make the customer fill out forms, email photos to five different people, or wait for "the process"
4. Have ONE person own the entire resolution end-to-end

**Follow-Up (First Week):**
1. Confirm replacement arrived in good condition
2. Explain (briefly) what went wrong and what you have changed to prevent it
3. Offer a goodwill gesture:
   - Discount on next order (5-10%)
   - Free delivery on next order
   - Priority delivery scheduling
   - Extended payment terms on next invoice
4. Assign a dedicated account manager for their next 3 orders

**Long-Term (First Month):**
1. Personal check-in after second delivery
2. Ensure the second delivery is PERFECT (flag internally as VIP handling)
3. Ask for feedback: "How are we doing compared to your previous supplier?"

### 15.4 Goodwill Gesture Framework

| Customer Tier | Damage Severity | Goodwill Gesture |
|--------------|-----------------|------------------|
| New customer | Any | Free delivery on next order + 5% discount + personal account manager |
| Regular customer | Minor (< 5%) | Credit note + priority on next delivery |
| Regular customer | Major (> 5%) | Full replacement + free delivery + apology call from manager |
| Strategic account | Any | Immediate replacement + dedicated handler + management visit + review of all future orders with enhanced QC |

### 15.5 What NOT to Do

- DO NOT argue about who is responsible in front of the customer
- DO NOT make the customer chase you for updates
- DO NOT promise timelines you cannot meet (under-promise, over-deliver)
- DO NOT treat it as a "routine process" — treat every damage claim as if the relationship depends on it (because it might)
- DO NOT send generic automated messages without human follow-up
- DO NOT require the customer to return damaged heavy materials before processing the credit

---

## 16. HyperQuote Implementation Recommendations

### 16.1 Day-One Essentials (Before First Delivery)

1. **Damage claim form/workflow** in the system (portal + WhatsApp intake)
2. **Photo evidence checklist** distributed to all customers with their first order
3. **BOL annotation training** for drivers (own fleet)
4. **Supplier contracts** with damage liability, credit note, and response time clauses
5. **Cargo insurance** policy activated
6. **Internal escalation matrix** documented and distributed to operations team

### 16.2 Standard Operating Procedures to Create

| SOP | Description | Priority |
|-----|-------------|----------|
| SOP-DMG-001 | Customer Damage Report Intake | Critical |
| SOP-DMG-002 | Damage Evidence Requirements | Critical |
| SOP-DMG-003 | Tier Classification and Inspection Protocol | Critical |
| SOP-DMG-004 | Resolution Decision Matrix | Critical |
| SOP-DMG-005 | Credit Note Issuance for Damage Claims | Critical |
| SOP-DMG-006 | Supplier Damage Claim Filing | Critical |
| SOP-DMG-007 | Carrier Freight Claim Filing | High |
| SOP-DMG-008 | Insurance Claim Filing | High |
| SOP-DMG-009 | Partial Delivery Damage Handling | High |
| SOP-DMG-010 | First-Order Damage Escalation Protocol | Critical |
| SOP-DMG-011 | Load Securement Standards (Own Fleet) | High |
| SOP-DMG-012 | Damage Prevention Packaging Requirements (Suppliers) | High |

### 16.3 Data Model Essentials

The system needs to track these entities for damage claims:

```
DamageClaim
├── claim_id (unique)
├── order_id (FK → Order)
├── delivery_id (FK → Delivery)
├── customer_id (FK → Customer)
├── reported_by (customer contact name)
├── reported_at (timestamp)
├── channel (portal | whatsapp | phone | email)
├── delivery_type (own_fleet | drop_ship | third_party_carrier)
├── damage_description (text)
├── tier (1 | 2 | 3)
├── status (see status list above)
├── priority (low | medium | high | critical)
├── assigned_to (FK → User)
├── total_claim_amount (money)
├── resolution_type (replacement | credit_note | price_reduction | refund)
├── resolution_amount (money)
├── customer_accepted_at (timestamp)
├── resolved_at (timestamp)
├── closed_at (timestamp)
├── root_cause (transit | handling | packaging | manufacturing | storage | unknown)
├── responsible_party (supplier | carrier | hyperquote | customer | unknown)
│
├── DamageClaimItem[] (one per damaged line item)
│   ├── product_id (FK → Product)
│   ├── ordered_quantity
│   ├── delivered_quantity
│   ├── damaged_quantity
│   ├── damage_type (torn | bent | cracked | wet | delaminated | short | other)
│   ├── salvageable (boolean)
│   ├── unit_claim_amount (money)
│   └── photos[] (FK → Attachment)
│
├── DamageClaimEvidence[] (photos, documents)
│   ├── type (photo | video | document | bol_annotated | inspection_report)
│   ├── file_url
│   ├── uploaded_by
│   ├── uploaded_at
│   └── metadata (GPS, timestamp, etc.)
│
├── DamageClaimActivity[] (audit trail)
│   ├── action (created | status_changed | note_added | escalated | etc.)
│   ├── performed_by
│   ├── performed_at
│   └── details (text)
│
├── SupplierClaim (0..1)
│   ├── supplier_id (FK → Supplier)
│   ├── filed_at (timestamp)
│   ├── claim_amount (money)
│   ├── supplier_response (accepted | partially_accepted | denied | pending)
│   ├── credit_note_number
│   ├── credit_note_amount (money)
│   ├── settled_at (timestamp)
│   └── notes
│
├── CarrierClaim (0..1)
│   ├── carrier_id (FK → Carrier)
│   ├── filed_at
│   ├── claim_amount
│   ├── carrier_response
│   ├── settled_amount
│   ├── settled_at
│   └── notes
│
└── InsuranceClaim (0..1)
    ├── policy_number
    ├── filed_at
    ├── claim_amount
    ├── adjuster_assigned
    ├── decision (approved | partially_approved | denied)
    ├── payout_amount
    ├── payout_at
    └── notes
```

### 16.4 Key Metrics to Track

| Metric | Formula | Target |
|--------|---------|--------|
| Damage rate | (Damaged value / Total delivered value) × 100 | < 0.5% |
| Claim resolution time (customer) | Average days from report to resolution | < 7 days |
| Claim resolution time (total) | Average days from report to full financial close | < 30 days |
| First-response time | Average hours from report to first acknowledgment | < 4 hours |
| Customer satisfaction on claims | Post-claim survey score | > 4/5 |
| Supplier recovery rate | (Amount recovered from suppliers / Amount credited to customers) × 100 | > 85% |
| Insurance claim success rate | (Approved claims / Filed claims) × 100 | > 90% |
| Repeat damage by supplier | Number of damage claims per supplier per month | Track and act on trends |
| Repeat damage by carrier | Number of damage claims per carrier per month | Track and act on trends |
| Repeat damage by material | Damage rate per material category | Track and benchmark |

---

## Sources

### Egyptian Law
- [Guarantee of Hidden Defects in Egyptian Law](https://mnasserlaw.com/guarantee-of-hidden-defects-in-the-egyptian-law/) — Articles 447-455 Civil Code analysis
- [Egyptian Commercial Code (Law No. 17 of 1999)](https://www.wipo.int/wipolex/en/legislation/details/13558) — WIPO Lex reference
- [Commercial Contracts 2025 — Egypt](https://practiceguides.chambers.com/practice-guides/commercial-contracts-2025/egypt/trends-and-developments) — Chambers & Partners
- [Contractual Liability Under Egyptian Law](https://www.lexology.com/library/detail.aspx?g=1ddbc079-8a9b-456f-8915-6238ff29a90b) — Lexology
- [Liability Under Egyptian Law](https://www.mondaq.com/contracts-and-commercial-law/980060/liability-under-egyptian-law) — Mondaq
- [Product Liability Under Egyptian Law](https://www.lexology.com/commentary/product-regulation-liability/egypt/alexander-partner-rechtsanwlte/product-liability-under-egyptian-law) — Lexology
- [Shipping Laws and Regulations Egypt 2025-2026](https://iclg.com/practice-areas/shipping-laws-and-regulations/egypt) — ICLG
- [Commercial Litigation in Egypt 2026](https://consortiolawfirm.com/commercial-litigation-in-egypt/) — Consortio Law Firm
- [Compensation According to Egyptian Laws](https://www.mondaq.com/contracts-and-commercial-law/778650/compensation-according-to-egyptian-laws) — Mondaq

### Freight Claims & Carrier Liability
- [Understanding Cargo Claims](https://www.setlifflaw.com/understanding-cargo-claims/) — Setliff Law
- [Freight Claims Guide](https://www.gofclogistics.com/a-complete-guide-to-freight-claims/) — GFC Logistics
- [Cargo Damage Claim Guide](https://marlinblue.com/cargo-damage-claim-guide/) — Marlin Blue
- [Lost or Damaged Shipments: Carrier and Freight Forwarder Liability](https://outsidegc.com/blog/lost-or-damaged-shipments-understanding-carrier-and-freight-forwarder-liability/) — OGC
- [Carrier Liability on Road Transport](https://marlinblue.com/carriers-liability-on-road-transport/) — Marlin Blue

### Photo Evidence & Documentation
- [Why Photo Documentation Is Your Best Defence in a Cargo Claim](https://www.blimp-app.com/blog/why-photo-documentation-is-your-best-defence-in-a-cargo-claim) — Blimp
- [Documents Needed to Submit a Damage Claim](https://www.veritasclaims.com/blog/what-documentation-do-you-need-to-submit-a-damage-claim-for-shipped-goods) — Veritas Claims

### B2B Returns & Credit Notes
- [B2B Returns Guide 2025](https://www.claimlane.com/resources/blog/how-to-simplify-b2b-returns) — Claimlane
- [Credit Notes Guide](https://www.zenskar.com/blog/credit-note) — Zenskar
- [Damaged Freight: Supplier's Guide](https://blog.inymbus.com/damaged-freight) — iNymbus

### Building Materials Damage
- [Storage of Cement — UltraTech](https://www.ultratechcement.com/for-homebuilders/home-building-explained-single/descriptive-articles/storage-of-cement) — UltraTech Cement
- [Effect of Moisture on Cement Bags](https://gharpedia.com/blog/effect-of-moisture-on-cement-bags/) — Gharpedia
- [How to Repair Water-Damaged Plywood](https://www.centuryply.com/blog/how-to-repair-water-damaged-plywood-and-prevent-future-warping) — CenturyPly
- [Rebar Transportation — From Mill to Site](https://nsdrafter.com/from-mill-to-site-journey-of-rebar-transportation/) — NS Drafter

### Insurance
- [Cargo & Inland Marine for Modern Distributors](https://skyscraperinsurance.com/understanding-cargo-inland-marine-for-modern-distributors/) — Skyscraper Insurance
- [Marine Cargo Insurance Costs](https://freightinsurancecoverage.com/process/marine-cargo-insurance-cost/) — Freight Insurance Coverage

### Customer Retention
- [B2B Customer Retention Strategies](https://oroinc.com/b2b-ecommerce/blog/successful-b2b-customer-retention/) — OroCommerce
- [Goodwill Gestures for Better Customer Relationships](https://www.callcentrehelper.com/goodwill-gestures-better-customer-relationships-219934.htm) — Call Centre Helper
- [B2B Customer Retention 2026](https://www.sparklayer.io/blog/2025/12/28/b2b-customer-retention/) — SparkLayer

### Load Securement
- [Cargo Securement Rules — FMCSA](https://www.fmcsa.dot.gov/regulations/cargo-securement/cargo-securement-rules) — US DOT (reference standard)
- [Flatbed Load Securement Best Practices](https://logitydispatch.com/blog/flatbed-load-securement-101-best-practices-for-safety/) — Logity Dispatch

### Third-Party Inspection in Egypt
- [GOST Egypt Third-Party Inspection](https://www.gostegypt.com/third-party-inspection/) — GOST Egypt
- [SGS Egypt Conformity Assessment](https://www.sgs.com/en/services/egypt-product-conformity-assessment-pca) — SGS
- [Pro QC Egypt Inspection Services](https://proqc.com/egypt/inspection-and-audit-services/) — Pro QC
