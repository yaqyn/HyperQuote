> ⚠️ **REFERENCE DOCUMENT — NOT THE SOURCE OF TRUTH**
> This file was written during the research phase and may contain outdated decisions, US-centric references, or superseded technical choices.
> **Always defer to `essential/RESEARCH.md` for current decisions.**
> Key changes since this file was written: TanStack Start (not Next.js), Capacitor (not Expo), React Aria (not shadcn), Egyptian law (not US FMCSA), EGP (not USD), dual auth pools, no online payments, no mobile wallets, spatial glass UI (not traditional dashboards).

# RESEARCH: Egyptian Operational Realities — 10 Remaining Gaps

> Platform design decisions that must account for Egypt-specific operational conditions: prayer schedules, weather, accidents, holidays, SMS/OTP, invoice disputes, driver device failure, board reporting, offline behavior, and material-weather interactions.

---

## Gap 1: Prayer Time Scheduling in Egyptian Business

### The Five Daily Prayers — Cairo Time Ranges

Prayer times in Cairo shift daily based on sun position. The Egyptian General Authority of Survey calculation method is used nationally. Approximate seasonal ranges for Cairo:

| Prayer | Winter (Dec-Jan) | Spring (Mar) | Summer (Jun-Aug) | Autumn (Oct) | Duration |
|--------|------------------|--------------|-------------------|--------------|----------|
| **Fajr** (pre-dawn) | ~5:15 AM | ~4:20-4:55 AM | ~3:15-3:45 AM | ~4:40-5:30 AM | 5-7 min |
| **Dhuhr** (midday) | ~11:50 AM | ~12:00 PM | ~11:55 AM-12:05 PM | ~11:40 AM-12:45 PM | 8-10 min |
| **Asr** (afternoon) | ~2:45-3:00 PM | ~3:25-3:30 PM | ~3:40-3:45 PM | ~2:45-4:10 PM | 8-10 min |
| **Maghrib** (sunset) | ~5:00-5:10 PM | ~5:55-6:15 PM | ~7:00-7:05 PM | ~5:10-6:40 PM | 6-8 min |
| **Isha** (night) | ~6:20-6:30 PM | ~7:10-7:30 PM | ~8:25-8:30 PM | ~6:25-7:58 PM | ~10 min |

**Total daily prayer time per person: approximately 30-40 minutes across all five prayers.**

### Friday Jumu'ah Prayer

- Friday midday prayer (Jumu'ah) replaces the regular Dhuhr prayer.
- Includes a sermon (khutbah) + congregational prayer: **30-45 minutes total**.
- Most businesses effectively shut down from ~12:00-1:30 PM on Fridays.
- Egypt's Dar Al-Ifta has ruled that employees unable to attend Friday prayer due to office hours may perform the regular Dhuhr prayer at their workplace instead, but this is the exception, not the norm.

### How Prayer Affects Business Operations

**Delivery windows:**
- Each prayer creates a 10-15 minute pause (prayer itself + wudu/ablution).
- Warehouses and loading docks pause briefly 4 times during the work day (Dhuhr, Asr, Maghrib, Isha during winter evening shifts).
- Customers at construction sites may be unavailable for 10-15 minutes around each prayer.

**Sales calls:**
- Avoid scheduling calls during prayer windows.
- The system should maintain a prayer-time API (e.g., Aladhan API) and flag "prayer window" periods.

**Warehouse shifts:**
- Workers typically pray in a designated musalla (prayer room) on-site.
- Stagger break times so operations don't fully stop.

### System Design Implications

1. **Prayer time API integration**: Use the Aladhan API or similar to calculate daily prayer times for Cairo. Update daily since times shift by 1-2 minutes per day.
2. **Delivery ETA calculation**: Add 10-15 minute buffer if a delivery window overlaps with a prayer time.
3. **Dispatch scheduling**: Avoid dispatching deliveries that would arrive during a prayer window — the customer won't be available to receive.
4. **Friday blackout**: No deliveries scheduled between 11:30 AM - 1:30 PM on Fridays. The system should enforce this as a hard rule.
5. **Notification muting**: Consider muting non-urgent push notifications during prayer windows.

---

## Gap 2: Weather Impact on Building Materials Delivery in Egypt

### Khamsin Dust Storms (March-May)

**What happens:**
- Hot desert winds from the south/southwest carry massive amounts of sand and dust.
- Wind speeds: 40-60 km/h sustained, gusts up to 80 km/h.
- Visibility drops below 1,000 meters, sometimes to near-zero in severe storms.
- Duration: individual storms last 1-3 days. The season produces roughly 5-10 significant events.
- The name "Khamsin" means "fifty" in Arabic — referring to the 50-day period in which these storms can occur.

**Real 2025 event:** On April 29-30, 2025, a major Khamsin storm forced nationwide school closures, disrupted maritime activities on the Gulf of Suez (waves 2-3 meters), and reduced visibility to hazardous levels across Greater Cairo, North Upper Egypt, the Suez Canal, and Sinai. The Egyptian Meteorological Authority issued alerts from April 29 through May 4.

**Impact on delivery:**
- Driving becomes extremely dangerous — poor visibility, sand on roads, risk of vehicle damage.
- Open-bed trucks carrying materials get covered in fine dust/sand.
- Workers cannot load/unload safely outdoors.
- Road accidents spike during dust storms.

### Rain Events (October-March, rare)

- Egypt receives very little rainfall (~25mm/year in Cairo, ~200mm on the Mediterranean coast).
- When it does rain, infrastructure is not designed for it — roads flood quickly, drainage is poor.
- Flash flooding in desert areas can close highways.
- Even light rain can be disruptive because the city is not prepared for it.

### Extreme Summer Heat (June-September)

- Cairo regularly hits 40-45 degrees C in summer; Upper Egypt can exceed 49-50 degrees C.
- Heat waves are becoming more frequent — average annual temperatures have increased by 0.53 degrees C per decade over the past 30 years.
- Worker safety: outdoor labor becomes dangerous. OSHA-equivalent guidelines recommend mandatory shade breaks, hydration, and reduced hours.
- Driver safety: vehicle tires, engines, and brakes are stressed. Asphalt softens.
- Material impact: cement degrades faster, adhesives lose effectiveness, asphalt softens.

### System Design Implications

1. **Weather alert integration**: Connect to the Egyptian Meteorological Authority feed or a weather API. Trigger alerts when Khamsin conditions or unusual rain are forecast.
2. **Delivery pause protocol**: When visibility drops below 1 km or wind exceeds 60 km/h, the system should recommend pausing deliveries and notify affected customers with revised ETAs.
3. **Summer heat rules**: For temperatures above 43 degrees C, flag deliveries as "high-heat" — drivers need extra water, breaks every 2 hours, and no extended waiting at sites.
4. **Storm season banner**: During March-May, show a Khamsin awareness banner in the dispatch interface with quick access to pause/reschedule controls.

---

## Gap 3: Egyptian Accident Procedures for Commercial Vehicles

### Immediate Steps After an Accident

1. **Secure the scene**: Driver must stop, turn on hazards, place warning triangles. Do not move the vehicle (it's evidence).
2. **Call police**: Dial 122 (traffic police) or the emergency number. For commercial vehicles, the police must be called for any accident — there is no "exchange details and leave" option.
3. **Police arrive and create the Mahdar (محضر)**: This is the official incident report/minutes. The police officer documents:
   - Date, time, exact location
   - Parties involved (names, license numbers, vehicle registration)
   - Witness statements
   - Sketch of the accident scene
   - Initial fault assessment
4. **Prosecution referral**: The mahdar goes to the Public Prosecution (النيابة العامة), which issues:
   - A certificate of register
   - Model 40 Prosecutions form (نموذج 40 نيابات)
   - A decision on culpability

### Driver Legal Exposure

- If the accident causes injury or death, the driver can be **detained pending investigation**. This is at the Public Prosecution's discretion.
- For serious accidents (fatalities), drivers may be held for up to **4 days** before a judge reviews the detention.
- Egyptian law treats fatal traffic accidents as criminal matters, not just civil.
- The driver's company is not automatically liable — the driver personally faces potential criminal charges.

### Insurance Requirements and Claims

- **Mandatory insurance**: All commercial vehicles must carry Third-Party Liability Insurance (compulsory by law, required for vehicle licensing).
- **Notification window**: The insurance company must be notified within **48-72 hours** (varies by policy). Missing this deadline gives the insurer grounds to refuse the claim.
- **Compensation under Law 72 of 2007**:
  - Death or total disability: 40,000 EGP (from the compulsory insurance pool)
  - Partial disability: proportional to disability percentage
  - Property damage: up to 10,000 EGP
- **Payout timeline**: Insurance must pay within **1 month** of being informed of the accident, once all documents are complete.
- **Statute of limitations**: Right to claim compensation expires **3 years** after the accident date.

### Required Documentation for Insurance Claim

- Official copy of the mahdar (accident minutes)
- Official copy of the prosecution decision + certificate + Model 40
- Expert damage assessment report
- Photos of the scene and damage
- Medical reports (if injuries)
- Notarized power of attorney (if filing through a representative)

### Vehicle Impoundment

- The vehicle may be impounded as evidence, especially if there are injuries or fatalities.
- Impoundment can last days to weeks depending on prosecution decisions.
- This means the truck is out of service — the company loses an asset from the fleet.

### System Design Implications

1. **Accident reporting flow**: The driver app needs an "Accident" emergency button that:
   - Captures GPS location and timestamp
   - Sends immediate alert to dispatch
   - Starts a guided checklist (are you safe? injuries? police called?)
   - Opens camera for scene documentation
2. **Dispatch response protocol**: When an accident is reported:
   - Auto-flag remaining deliveries on that truck's route
   - Trigger rerouting to backup driver/vehicle
   - Notify affected customers with revised ETAs
   - Alert the fleet manager and insurance coordinator
3. **Insurance documentation module**: Store mahdar reference numbers, prosecution decision tracking, photo evidence, and claim status per incident.
4. **Driver unavailability tracking**: If a driver is detained, the system marks them as "unavailable — legal hold" with a follow-up reminder.
5. **Fleet impact dashboard**: Show which vehicles are impounded, estimated return dates, and fleet capacity impact.

---

## Gap 4: Egyptian Work Week and Holiday Calendar

### Work Week Structure

- **Official work week**: Sunday through Thursday.
- **Weekend**: Friday and Saturday. Friday is the primary rest day (aligned with Jumu'ah prayer). Saturday is the second rest day.
- **Standard hours**: 8 hours/day, 48 hours/week (6-day maximum).
- Some private-sector companies adopt a 5-day week (Sun-Thu) with both Friday and Saturday off.
- **Overtime**: Work on the weekly rest day or public holidays must be compensated at **200% of normal wage** (2x pay), plus a substitute rest day.

### Public Holidays — 2025

| Date | Holiday | Notes |
|------|---------|-------|
| Jan 7 | Coptic Christmas | Fixed |
| Jan 25 | Revolution Day / Police Day | Fixed |
| Mar 19-23 | Eid al-Fitr | End of Ramadan (5 days declared for 2025 private sector) |
| Apr 20 | Coptic Easter Sunday | |
| Apr 21 | Sham El-Nessim | Spring festival, day after Easter |
| Apr 25 | Sinai Liberation Day | Fixed |
| May 1 | Labour Day | Fixed |
| Jun 5 | Arafat Day | Day before Eid al-Adha |
| Jun 6-9 | Eid al-Adha | Feast of the Sacrifice (3-4 days) |
| Jun 26 | Islamic New Year (El Hijra) | |
| Jul 23 | Revolution Day (July 23) | Fixed |
| Sep 4 | Mawlid (Prophet's Birthday) | |
| Oct 6 | Armed Forces Day | Fixed |

### Public Holidays — 2026

| Date | Holiday | Notes |
|------|---------|-------|
| Jan 1 | New Year's Day | Bank holiday |
| Jan 7 | Coptic Christmas | Fixed |
| Jan 25 | Revolution Day / Police Day | Fixed |
| Feb 18-19 | Ramadan begins | Religious observance |
| Mar 19-22 | Eid al-Fitr | 3-4 days |
| Apr 13 | Sham El-Nessim | Spring festival |
| Apr 25 | Sinai Liberation Day | Fixed |
| May 1 | Labour Day | Fixed |
| May 26 | Arafat Day | |
| May 27-29 | Eid al-Adha | 3 days |
| Jun 16 | Islamic New Year | |
| Jun 30 | June 30 Revolution Day | |
| Jul 23 | July 23 Revolution Day | Fixed |
| Aug 26 | Mawlid (Prophet's Birthday) | |
| Oct 6 | Armed Forces Day | Fixed |

**Critical note:** Islamic holidays (Eid al-Fitr, Eid al-Adha, Islamic New Year, Mawlid) are based on the lunar calendar and can shift by 1-2 days depending on official moon sighting. The Egyptian government announces exact dates shortly before each holiday.

### Holiday Scheduling Rules (since 2020)

- Egypt moves most mid-week holidays to Thursday (creating a long weekend with Fri-Sat).
- Some holidays may also be moved to Sunday.
- The Prime Minister issues official decrees announcing holiday dates, often with short notice.

### Ramadan Schedule

- **2025 Ramadan**: approximately March 1 - March 30, 2025
- **2026 Ramadan**: expected to begin around February 18-19, 2026
- **Working hours during Ramadan**: Reduced to **6 hours/day** (36 hours/week) for Muslim employees per Egyptian labor law. Some sources cite a 1-hour reduction to 7 hours; in practice, most companies implement the 6-hour day.
- Business hours typically shift: **9:00 AM - 3:00 PM** during Ramadan (vs. normal 9:00 AM - 5:00 PM).
- **Evening activity surge**: After Iftar (breaking the fast at Maghrib), Egyptian cities come alive. Some business activity shifts to evening hours (8:00 PM - midnight).
- Delivery patterns change: morning deliveries are preferred, afternoon productivity drops significantly as fasting workers tire.

### System Design Implications

1. **Holiday calendar service**: Maintain a dynamic holiday calendar that accounts for:
   - Fixed national holidays (known years in advance)
   - Islamic holidays (entered when officially announced, typically 1-2 weeks before)
   - Holiday-shift decrees from the Prime Minister
2. **Ramadan mode toggle**: When Ramadan is active:
   - Adjust default working hours to 9 AM - 3 PM
   - Shift delivery windows earlier in the day
   - Reduce delivery capacity expectations by ~25%
   - Show Iftar countdown in the driver app
3. **Delivery blackout dates**: Auto-block scheduling on holidays. Allow manual override for emergency deliveries at 2x cost.
4. **Customer/supplier availability**: Mark known holidays in the scheduling system so sales reps don't schedule calls on holidays.

---

## Gap 5: SMS/OTP Delivery Issues with Egyptian Carriers

### Egyptian Mobile Carrier Market

| Carrier | Market Share | Notes |
|---------|-------------|-------|
| Vodafone Egypt | 40.1% | Largest carrier |
| Orange Egypt | 33.7% | Second largest |
| Etisalat Egypt (now e&) | 24.6% | Third |
| WE (Telecom Egypt) | 1.6% | State-owned, smallest |

- **Total mobile subscribers**: ~98 million (97.8% mobile penetration in a population of ~100 million).
- **Internet users**: 96.3 million (81.9% internet penetration as of early 2025).

### SMS OTP Problems in Egypt

- **General SMS delivery rates** in emerging markets (including Egypt) drop below **85%** due to carrier filtering and DND (Do Not Disturb) restrictions.
- **Cost per SMS**: approximately EUR 0.22 per message (~EGP 10-12 at current rates) — expensive.
- **One failed OTP can cost EGP 50+** in lost sales and support overhead.
- Common failure modes:
  - Carrier-level spam filtering blocks OTP messages
  - Network congestion during peak hours delays delivery
  - DND registrations prevent delivery to opted-out numbers
  - SIM-related issues on dual-SIM phones
  - Gray-route SMS (cheaper but unreliable aggregators) get blocked

### WhatsApp as Primary OTP Channel

- **WhatsApp users in Egypt**: ~56 million daily active users.
- **WhatsApp penetration**: ~75% of the population (research by Northwestern University in Qatar).
- **WhatsApp Business downloads in Egypt**: over 30 million.
- **WhatsApp OTP delivery rate**: 99.5%+ success rate, with 2-4 second delivery.
- **Cost**: approximately EUR 0.006 per message (~EGP 0.30) — **37x cheaper than SMS**.

### Recommended OTP Strategy

**Primary: WhatsApp OTP**
- Use WhatsApp Business API to send OTP codes.
- Delivery rate: >99.5%.
- Cost: fraction of SMS.
- Most Egyptian users already have WhatsApp and keep it active.

**Fallback 1: SMS OTP**
- For users without WhatsApp (rare, ~25% of population).
- Use premium/direct routes (not gray routes) for better delivery.
- Implement sender ID registration with each carrier.

**Fallback 2: Voice OTP**
- Automated voice call that reads the OTP code.
- Works on any phone (even feature phones).
- Useful when both WhatsApp and SMS fail.

**Fallback 3: Email OTP**
- Last resort for users who have registered email addresses.

### System Design Implications

1. **OTP cascade**: WhatsApp first -> SMS (after 30s timeout) -> Voice call (after 60s timeout).
2. **Carrier detection**: Detect the user's carrier from their phone number prefix (+20 10x = Vodafone, +20 11x = Etisalat, +20 12x = Orange, +20 15x = WE) to route SMS through the best aggregator for that carrier.
3. **Delivery tracking**: Log OTP delivery status per carrier to identify carrier-specific issues.
4. **Cost dashboard**: Track OTP costs by channel to monitor spend.
5. **WhatsApp Business API integration**: Register as a verified business on WhatsApp to use authentication message templates.

---

## Gap 6: Invoice Dispute Resolution Workflow

### Egypt's E-Invoicing Context

- **Mandatory since 2023**: All VAT-registered businesses in Egypt must issue electronic invoices for B2B transactions via the ETA (Egyptian Tax Authority) portal.
- Invoices must be in XML/JSON format, digitally signed, and transmitted via the ETA API.
- Each invoice receives a unique UUID from ETA upon validation.
- **Once submitted and validated, an e-invoice cannot be deleted** — it can only be canceled or adjusted via credit/debit notes.

### When a Customer Says "This Invoice is Wrong"

**Step-by-step internal process:**

1. **Customer contacts their account manager** (via the portal, phone, or WhatsApp) claiming an error. Common disputes:
   - VAT calculation is wrong
   - Quantity received differs from quantity invoiced
   - Agreed price differs from invoiced price
   - Wrong items listed
   - Duplicate invoice

2. **Account manager logs the dispute** in the system with:
   - Invoice UUID (from ETA)
   - Nature of the dispute (category selection)
   - Customer's claimed correct values
   - Supporting evidence (photos of delivery, signed POD, etc.)

3. **Internal review** (Finance/Operations team):
   - Pull the original invoice, the corresponding purchase order, and the delivery note (POD).
   - Cross-reference: Does the PO match the invoice? Does the POD match the invoice?
   - Check the VAT calculation against current rates.
   - Timeline: Internal review should complete within **2 business days**.

4. **Decision:**

   **If the customer is RIGHT:**
   - Issue an electronic **Credit Note** referencing the original invoice UUID.
   - Credit note must include: original invoice reference, reason for adjustment, corrected amounts, VAT adjustment.
   - Submit the credit note to ETA via API (same process as invoices).
   - The credit note amount **cannot exceed the original invoice amount**.
   - Supplier reduces output VAT; customer reduces input VAT accordingly.
   - Both parties update books so VAT returns reflect the correction.
   - If additional amounts are owed: issue a **Debit Note** (same technical process as credit notes).

   **If the customer is WRONG:**
   - Provide documentation proving the invoice is correct (signed POD, PO, delivery photos).
   - Communicate findings to customer with evidence.
   - If customer still disputes: escalate to management-level discussion.
   - Egyptian commercial dispute norms favor personal relationship resolution — a phone call or in-person meeting often resolves what emails cannot.

5. **ETA portal actions available:**
   - **Cancel an invoice**: Within the legal timeframe defined by ETA (typically before the monthly VAT return is filed).
   - **Issue credit/debit note**: At any time, referencing the original invoice UUID.
   - **Buyer rejection**: The buyer can reject an invoice sent to them on the ETA portal if it was sent by mistake or they dispute it.

6. **Record retention**: All invoices, credit notes, debit notes, and supporting documentation must be archived for **5 years** following the tax period.

### Non-Compliance Penalties

- Inability to claim VAT deductions or refunds
- Financial fines
- Removal from the registry of exporters and importers
- Suspension from dealing with government entities

### System Design Implications

1. **Dispute workflow module**: Structured dispute logging with categories, evidence upload, and status tracking (Open -> Under Review -> Resolved/Rejected).
2. **Automated cross-reference**: When a dispute is filed, auto-pull the PO, invoice, and POD for side-by-side comparison.
3. **Credit note generation**: One-click credit note creation from a resolved dispute, pre-filled with original invoice data and the adjustment amounts.
4. **ETA integration**: Submit credit/debit notes to ETA via the same API used for invoices.
5. **Dispute aging report**: Flag disputes older than 5 business days for escalation.
6. **Audit trail**: Every action on a dispute is logged with timestamp and user — required for the 5-year retention period.

---

## Gap 7: Driver Device Failure Mid-Route

### Common Failure Scenarios

- Phone battery dies (most common)
- App crashes or freezes
- Phone dropped, cracked screen, water damage
- Phone stolen
- Network connectivity lost (separate from device failure)

### What the Driver Should Do

**If the phone dies or is damaged:**
1. Continue to the next delivery using the printed/memorized route.
2. Call dispatch from any available phone (borrowed phone, store phone, personal backup phone).
3. Report the device failure and current location.
4. Request verbal routing instructions for remaining deliveries.
5. Collect proof of delivery on paper backup forms.

**Paper backup delivery notes** (pre-printed in the truck):
- Each truck should carry a pad of pre-numbered delivery note forms.
- Form includes: date, delivery number, customer name, items delivered, quantity, customer signature, notes.
- The driver fills this out manually and has the customer sign.
- Paper notes are returned to the warehouse at end of shift for data entry.

### How Dispatch Handles a "Dark" Driver

When a driver stops sending location updates:

1. **5-minute grace period**: GPS gaps are common in tunnels, under bridges, and in basements. The system waits 5 minutes.
2. **Auto-alert at 5 minutes**: Dispatch sees a "Driver Offline" warning with last known location and time.
3. **Dispatch calls the driver**: First attempt on the app's VoIP channel, then the driver's personal phone number.
4. **If no answer after 3 attempts (over 15 minutes)**:
   - Escalate to fleet manager.
   - Check if the driver's last location was on a known route.
   - Consider sending another driver or a manager to the last known location.
   - Begin rerouting remaining deliveries to other available drivers.
5. **Customer notification**: If a delivery is affected, auto-notify the customer: "Your delivery may be delayed. We're working on it."

### POD Without the App

**Backup POD methods (ranked by preference):**
1. **Paper delivery note** with customer signature (carried in truck).
2. **Photo via any phone**: Driver borrows a phone, photographs the delivery with timestamp. Sends via WhatsApp to a dedicated dispatch WhatsApp number.
3. **Customer confirmation**: Dispatch calls the customer directly to confirm delivery was received.
4. **Retroactive app entry**: When the driver gets a working device (or the phone charges), they enter the POD data retroactively with a note explaining the delay.

### Prevention Measures

- **Mandatory: truck-mounted USB charger** (12V cigarette lighter adapter).
- **Recommended: rugged phone case** (construction site deliveries involve dust, drops, vibration).
- **Pre-shift device check**: The app shows a "Ready for shift" checklist — battery level must be above 50%, GPS must be working, camera must be functional.
- **Offline mode in the driver app**: Route data and delivery list should be cached locally so the driver can view them even without network.

### System Design Implications

1. **Offline-capable driver app**: Cache the day's route, delivery addresses, customer phone numbers, and item lists locally on the device. Use Capacitor's local storage.
2. **Heartbeat monitoring**: Driver app sends a GPS ping every 60 seconds. Dispatch dashboard shows "last seen" timestamp per driver.
3. **"Driver Offline" escalation workflow**: Automated 5-min -> 15-min -> 30-min escalation ladder.
4. **Paper POD digitization**: Allow warehouse staff to photograph and upload paper delivery notes at end-of-day, linked to the correct delivery record.
5. **WhatsApp POD channel**: A dedicated WhatsApp Business number that drivers can send delivery photos to. Auto-parse and attach to delivery records.
6. **Device health dashboard**: Track per-driver device battery levels, app crash rates, and offline frequency to identify problem devices.

---

## Gap 8: CEO Board Reporting and PDF Export

### What Egyptian Boards Expect

**Language:**
- Egyptian financial statements are legally required to be published in **Arabic** (condensed form in an Arabic-language newspaper).
- For companies with foreign investors or international board members, reports are prepared in **both Arabic and English**.
- Internal board reports for a private B2B company: typically **English** for international investors, **Arabic** for local board members. Best practice: **bilingual** (Arabic primary, English translation).

**Format:**
- Egyptian Accounting Standards (EAS), which are based on IFRS.
- Financial statements must include: balance sheet, income statement, cash flow statement, changes in stockholders' equity, external auditor's report, and directors' report.
- Board packages in Egypt follow a formal structure — PDF is the expected distribution format.

### Key Reports for a B2B Logistics Platform CEO

**Financial Reports:**
1. **Profit & Loss (Monthly/Quarterly)**: Revenue, COGS, gross margin, operating expenses, EBITDA, net income.
2. **Cash Flow Statement**: Operating cash flow, AR aging, AP aging, capital expenditure.
3. **Balance Sheet**: Assets, liabilities, equity snapshot.
4. **Revenue Breakdown**: By customer tier, by product category, by region.
5. **Operating Ratio**: Operating cost / Revenue — lower is better. Key logistics metric.

**Operational KPIs:**
1. **Order volume**: Total orders, GMV (gross merchandise value), average order value.
2. **On-time delivery rate**: Percentage of orders delivered on or before promised date.
3. **Order accuracy**: Percentage of orders shipped without errors.
4. **Customer acquisition**: New customers per period, churn rate.
5. **Transportation costs**: Total cost per delivery, cost per km, fuel costs.
6. **Warehouse utilization**: Throughput, pick accuracy, dock-to-stock time.
7. **Supplier performance**: Lead times, quality rates, pricing competitiveness.

**Strategic Reports:**
1. **Market expansion metrics**: New regions served, new supplier onboarding rate.
2. **Credit risk report**: Outstanding receivables, days sales outstanding (DSO), bad debt ratio.
3. **Customer satisfaction**: NPS score, dispute resolution rate, repeat order rate.

### PDF Export System Design

**Generation approach:**
- Server-side PDF generation (using a library like Puppeteer or React-PDF).
- Styled with the company brand — logo, colors, typography.
- Bilingual: Arabic (RTL) and English (LTR) versions.
- Charts and graphs embedded as rendered images.
- Digital signature of the CFO/CEO on financial reports.

**Distribution:**
- **Scheduled reports**: Weekly operations summary (email every Sunday), monthly financials (email on the 5th of each month), quarterly board package (email 10 days before board meeting).
- **On-demand**: CEO can generate any report from the app and download as PDF or share via email.
- **Email delivery**: Automated email with PDF attachment to a configured distribution list.
- **Secure access**: Board members can access reports via a secure link (password-protected or time-limited).

### System Design Implications

1. **Report builder**: A configurable report engine that can assemble different metrics into a PDF template.
2. **Bilingual rendering**: Support Arabic (RTL) and English (LTR) in the same PDF, or generate separate versions.
3. **Scheduled email delivery**: Cron-based report generation and email dispatch (weekly/monthly/quarterly).
4. **Data snapshot**: Reports should capture point-in-time data, not live data. Store the snapshot so historical reports are reproducible.
5. **Export formats**: PDF (primary), Excel (for board members who want to analyze data), and a web-based interactive version in the CEO app.

---

## Gap 9: CEO App Offline Behavior

### What Works Offline

**Available (from local cache):**
- **Dashboard snapshot**: The last-synced version of key KPIs (revenue, orders, delivery stats). Displayed with a "Last updated: [timestamp]" badge.
- **Recent AI conversations**: Previously loaded AI chat threads are stored locally and fully readable.
- **Contact list**: Customer and supplier contacts are cached locally — the CEO can look up phone numbers and email addresses.
- **Order history**: Recently viewed orders (last 50-100) with full details.
- **Downloaded reports**: Any PDFs previously downloaded or viewed are available in local storage.
- **Notifications history**: Previously loaded notifications.
- **Local search**: Search across cached data (contacts, orders, conversations) using IndexedDB.

**Partially available:**
- **Navigation**: All screens load (the app shell is cached), but data-dependent screens show cached data with a staleness indicator.
- **Notes/drafts**: The CEO can write notes or draft messages that queue for sending when online.

**Disabled (requires network):**
- **New AI queries**: Cannot send new prompts to the AI (LLM requires server-side inference).
- **Real-time fleet tracking**: No live GPS data.
- **New report generation**: Cannot pull fresh data from the database.
- **Sending messages**: WhatsApp/email messages queue but don't send.
- **Approval actions**: Cannot approve quotes, orders, or credit notes (these require server-side validation).
- **Fresh search**: Cannot search data that isn't in the local cache.

### How the App Communicates Offline Status

1. **Persistent banner**: A subtle but visible banner at the top of the screen: "You're offline. Showing cached data from [time]." — in the spatial glass design style (translucent, not intrusive).
2. **Disabled action buttons**: Buttons that require network (Send, Approve, Generate Report) are visually dimmed with a tooltip: "Available when online."
3. **Queued actions indicator**: A small badge showing "3 actions queued" — these will execute when connectivity returns.
4. **No aggressive popups**: Don't show a modal every time the user taps something unavailable. The banner is enough.

### Sync When Connection Returns

1. **Automatic detection**: The app monitors `navigator.onLine` and/or periodic connectivity checks (ping a lightweight health endpoint).
2. **Background sync**: When connectivity returns:
   - Send queued actions (notes, drafts, approvals) in order.
   - Refresh dashboard KPIs.
   - Sync any new notifications.
   - Update the AI conversation list.
3. **Conflict resolution**: If the CEO approved something offline but the underlying data changed (e.g., an order was canceled), show a conflict resolution prompt: "This order was canceled while you were offline. Your approval has been discarded."
4. **Sync progress indicator**: Brief "Syncing..." animation when reconnecting, then "All caught up" confirmation.

### Caching Strategy

| Data Type | Cache Strategy | Storage | TTL |
|-----------|---------------|---------|-----|
| App shell (HTML/CSS/JS) | Cache-first | Service Worker / Cache Storage | Until new deploy |
| Dashboard KPIs | Stale-while-revalidate | IndexedDB | 1 hour |
| AI conversations | Cache-first, network-update | IndexedDB | Indefinite |
| Contact list | Cache-first, background refresh | IndexedDB | 24 hours |
| Recent orders | Network-first, cache fallback | IndexedDB | 4 hours |
| PDF reports | Cache-only (explicit download) | File system / Cache Storage | Indefinite |
| Notifications | Network-first, cache fallback | IndexedDB | 2 hours |

### System Design Implications

1. **Service worker**: Register a service worker for the CEO app that caches the app shell and implements the caching strategies above.
2. **IndexedDB for structured data**: Use IndexedDB (not localStorage) for orders, contacts, conversations — it supports search/indexing.
3. **Background Sync API**: Use the Background Sync API to queue and retry failed network requests.
4. **Cache size management**: Set a maximum cache size (e.g., 50 MB) and evict oldest items when exceeded.
5. **Offline-first architecture**: Design the app to always read from cache first, then update from network — this makes the app feel fast even on slow 3G connections.

---

## Gap 10: Weather Impact on Specific Building Materials

### Cement

**Vulnerability:** Extremely sensitive to moisture. Cement is hygroscopic — it absorbs moisture from the air.

| Threat | Impact | Threshold |
|--------|--------|-----------|
| Rain/moisture | Begins hydration process, cement hardens into unusable lumite | Any direct water contact |
| Humidity > 60% | Gradual strength loss, clumping | Shelf life drops from 3 months to weeks |
| Dust storm (Khamsin) | Fine dust contaminates exposed bags, sand infiltration | Wind > 40 km/h |
| Extreme heat > 40C | Accelerates chemical deterioration, reduces reactivity | Cumulative exposure |

**Storage requirements:**
- Store on raised wooden pallets/platforms **150-200mm above ground** (ground absorbs and releases moisture).
- Cover with **700-gauge polyethylene sheets**.
- Enclosed warehouse with controlled humidity preferred.
- **Shelf life: 3 months** from production in ideal conditions; up to 6 months maximum. After that, strength drops significantly.
- If moisture content exceeds **5%**, cement is unusable.
- FIFO (first-in-first-out) rotation is mandatory.

**Delivery precautions:**
- Covered trucks only — never open-bed.
- Do not deliver during rain or active dust storms.
- Unload into covered receiving area immediately upon arrival.

### Steel / Rebar

**Vulnerability:** Susceptible to surface rust from moisture. Structural integrity is not affected by light surface rust, but heavy corrosion weakens the material.

| Threat | Impact | Threshold |
|--------|--------|-----------|
| Rain | Surface rust begins within hours of exposure | Any prolonged wet contact |
| Humidity + salt air (coastal) | Accelerated corrosion | Coastal areas year-round |
| Dust storm | Abrasive damage to coatings, sand traps moisture | Wind > 40 km/h |

**Storage requirements:**
- Store under cover (shed or warehouse). If outdoor: use heavy-duty tarpaulins secured at edges.
- Raise on **non-metallic platforms** (wooden pallets) — ground moisture causes rust.
- Separate galvanized and uncoated rebar (galvanic corrosion occurs if they touch).
- Separate stainless steel from carbon steel (rust migrates from carbon to stainless).
- Apply **Vapor Corrosion Inhibitor (VCI)** wrapping for long-term storage.
- Apply rust-inhibiting paint or sealant if storing for more than 2 weeks uncovered.

**Delivery precautions:**
- Covered or tarped trucks for delivery during rain.
- Inspect for rust upon receipt — reject heavily rusted shipments.
- Avoid delivery during dust storms (abrasive damage + moisture trapped under dust).

### Lumber / Wood

**Vulnerability:** Absorbs and releases moisture, causing warping, swelling, and mold.

| Threat | Impact | Threshold |
|--------|--------|-----------|
| Rain | Swelling, warping within hours | Any direct water contact |
| Humidity > 70% RH | Mold growth begins | Moisture content > 19% |
| Extreme dry heat | Cracking, splitting, checking | Rapid humidity change |
| Dust storm | Sand embeds in surface, moisture trapped under dust | Wind > 40 km/h |

**Storage requirements:**
- Indoor, climate-controlled storage ideal. Target: **30-50% RH, 15-27 degrees C**.
- If outdoor: use **breathable covers (canvas tarps, not plastic)** — non-breathable plastic traps moisture and accelerates mold.
- Stack with **spacer sticks (stickers)** between layers for airflow.
- Seal cut ends immediately with **wax-based end sealer** to prevent moisture migration.
- Keep off the ground on pallets or dunnage.
- Good ventilation around stored lumber is critical.

**Delivery precautions:**
- Covered trucks only.
- Do not deliver in rain — even brief exposure during unloading causes damage.
- In extreme heat: deliver early morning to avoid thermal shock (cool warehouse to hot truck to hot site).

### Adhesives, Sealants, and Coatings

**Vulnerability:** Temperature-sensitive chemistry. Heat degrades active ingredients.

| Threat | Impact | Threshold |
|--------|--------|-----------|
| Extreme heat > 40C | Reduced shelf life, altered viscosity, curing failure | Varies by product |
| Direct sunlight | Container pressure buildup, product degradation | Continuous exposure |
| Freezing (rare in Egypt) | Some products permanently damaged | Below 5C |

**Storage requirements:**
- Climate-controlled storage: **15-25 degrees C** recommended.
- Away from direct sunlight.
- Monitor expiration dates closely — heat accelerates expiration.
- FIFO rotation mandatory.

### Sheet Materials (Plywood, Drywall, Metal Sheets)

**Vulnerability:** Lightweight + large surface area = wind hazard. Also moisture-sensitive.

| Threat | Impact | Threshold |
|--------|--------|-----------|
| Wind (Khamsin) | Sheets blow off trucks during transport, become projectiles | Wind > 30 km/h |
| Rain | Plywood delaminates, drywall dissolves, metal sheets rust | Any prolonged exposure |
| Humidity | Plywood warping, drywall sagging, mold | > 60% RH |

**Delivery precautions:**
- **Do not transport sheet materials during Khamsin storms** — they act as sails on an open truck.
- Secure with ratchet straps AND edge protectors.
- Covered truck required for drywall (even light rain ruins it).
- Stack flat, never on edge during transport.

### System Design Implications

1. **Weather-triggered material alerts**: When the weather API detects:
   - Khamsin conditions: Alert warehouse to cover/secure all outdoor materials. Pause deliveries of sheet materials and exposed cement.
   - Rain forecast: Alert warehouse to protect cement, steel, lumber. Pause deliveries unless trucks are fully enclosed.
   - Heat above 43C: Flag adhesive/sealant shipments for expedited handling. Alert drivers about heat safety.

2. **Material-weather compatibility matrix**: A system table mapping each material category to weather conditions, with thresholds that trigger automatic warnings or delivery blocks.

3. **Warehouse operations dashboard**: Show current weather conditions and auto-generated action items:
   - "Khamsin warning: Check tarpaulin coverage on outdoor steel storage."
   - "Rain expected at 3 PM: Move cement pallets to covered area."
   - "Heat advisory: Verify adhesive storage temperature."

4. **Delivery dispatch rules**:
   - Cement: Block dispatch during rain or dust storms.
   - Sheet materials: Block dispatch when wind > 30 km/h.
   - All materials: Add "weather hold" status that requires manual override.

5. **Receiving inspection prompts**: When a delivery arrives during adverse weather, the system prompts the warehouse to inspect for weather damage before accepting.

6. **Shelf life tracking**: Per-SKU expiration dates with alerts at 75% and 90% of shelf life. Adjust effective shelf life based on storage conditions (reduce by 50% if stored in non-climate-controlled areas during summer).

---

## Summary: Cross-Cutting System Requirements

These 10 gaps produce several cross-cutting requirements that affect the entire platform:

| Requirement | Affected Apps | Priority |
|-------------|--------------|----------|
| Prayer time API integration | Dispatch, Driver, Customer portal | High |
| Weather API integration | Dispatch, Warehouse, CEO dashboard | High |
| WhatsApp Business API (OTP + communication) | All apps (auth), Driver (POD), Sales | Critical |
| Holiday calendar service | All apps | High |
| Ramadan mode | All apps | High |
| Offline-first architecture | CEO app, Driver app | High |
| ETA e-invoice API (credit/debit notes) | Finance module | Critical |
| Accident reporting workflow | Driver app, Dispatch | Medium |
| PDF report generation (bilingual) | CEO app | Medium |
| Material-weather alert system | Warehouse app, Dispatch | High |

---

## Sources

- [Aladhan Prayer Times Calendar - Cairo](https://aladhan.com/calendar/Cairo/Egypt)
- [AlMosaly Prayer Times - Cairo](https://almosaly.com/en/mawaquit/countries/egypt/cairo/402/2025/03)
- [Al-Habib Prayer Times - Cairo August](https://www.al-habib.info/prayer-time/for/Egypt/Cairo,+Cairo/NT_crOWwkD0iXQX8hsycG9yNB/2025/8/)
- [Dar Al-Ifta - Friday Prayer and Office Hours](https://www.dar-alifta.org/en/fatwa/details/10511/missing-the-friday-prayer-due-to-office-hours)
- [Quran Janan - Prayer Duration](https://quranjanan.com/how-long-does-prayer-last-for-muslims/)
- [The National - Dust Storm Cairo 2025](https://www.thenationalnews.com/news/mena/2025/04/30/dust-storm-sweeps-through-cairo-forcing-school-shutdowns/)
- [Egyptian Streets - Khamaseen Dust Storm 2025](https://egyptianstreets.com/2025/04/29/egypt-braces-for-seasonal-khamaseen-dust-storm/)
- [Egypt Today - Khamaseeni Low Pressure System](https://www.egypttoday.com/Article/1/139866/Dust-storms-approach-Cairo-amid-Khamaseeni-low-pressure-system-Here%E2%80%99s)
- [Ahram Online - Khamsin Storm Alert](https://english.ahram.org.eg/News/545393.aspx)
- [Ahram Online - School Closures Khamsin](https://english.ahram.org.eg/NewsContent/1/2/545414/Egypt/Society/Egypt-closes-schools-nationwide-on-Wednesday-due-t.aspx)
- [Wikipedia - Khamsin](https://en.wikipedia.org/wiki/Khamsin)
- [Wikipedia - Climate of Egypt](https://en.wikipedia.org/wiki/Climate_of_Egypt)
- [ThinkHazard - Egypt Extreme Heat](https://thinkhazard.org/en/report/40765-arab-republic-of-egypt/EH)
- [Egypt Tours Portal - Weather in Egypt](https://www.egypttoursportal.com/the-weather-in-egypt/)
- [Hamada Lawyer - Traffic Accident Claims Egypt](https://www.hamadalawyer.com/index.php/legal-services/compensation-claims-road-traffic-accidents-egypt)
- [Brokerage Insurance - Third Party Liability Egypt](https://brokerage-insurance.com/en/blog/article/cars-third-party-liability-insurance-in-egypt)
- [MEI - Traffic Accidents in Egypt Reform](https://www.mei.edu/publications/traffic-accidents-egypt-need-reform)
- [Libya Observer - Truck Driver Jailed Egypt](https://libyaobserver.ly/news/libyan-truck-driver-jailed-egypt-after-causing-horrific-traffic-accident-matrouh)
- [WUZZUF - Working Hours Egyptian Labor Law](https://wuzzuf.net/careers/working-hours-in-the-new-egyptian-labor-law-2/)
- [WUZZUF - Official Public Holidays Egypt](https://wuzzuf.net/careers/official-public-holidays-in-egypt/)
- [Ahram Online - Eid Al-Fitr Holiday 2025](https://english.ahram.org.eg/NewsContent/1/2/563890/Egypt/Society/Egypt-declares-%E2%80%93-March-paid-Eid-AlFitr-holiday-for.aspx)
- [Office Holidays - Egypt 2025](https://www.officeholidays.com/countries/egypt/2025)
- [ZenHR - Egypt Public Holidays 2026](https://blog.zenhr.com/en/egypt-public-holidays-observances-2026)
- [Multiplier - Employment Laws Egypt](https://www.usemultiplier.com/egypt/employment-laws)
- [Playroll - Egypt Working Hours](https://www.playroll.com/working-hours/egypt)
- [Remofirst - Ramadan 2026 Employers Guide](https://knowledgebase.remofirst.com/hc/en-us/articles/46213628370324--Ramadan-2026-What-Employers-and-Employees-Should-Know)
- [Zimyo - Egypt Labor Law 2026](https://www.zimyo.com/middle-east/insights/egypt-labour-law/)
- [TimeChart - Friday-Saturday Weekend Countries](https://www.timechart.org/blogs/which-countries-have-a-friday-saturday-weekend-in-the-arab-world.html)
- [SceneNow - Six-Day Workweek Egypt](https://scenenow.com/buzz/kamel-el-wazir-introduces-six-day-workweek-in-first-official-decision)
- [Messaggio - Egypt Messaging](https://messaggio.com/messaging/egypt/)
- [Dexatel - WhatsApp OTP vs SMS OTP](https://dexatel.com/blog/whatsapp-otp-vs-sms/)
- [DataReportal - Digital 2025 Egypt](https://datareportal.com/reports/digital-2025-egypt)
- [NAOS Solutions - Egyptians and Digital 2025](https://naos-solutions.com/egyptians-and-digital-2025-report/)
- [World Population Review - WhatsApp Users by Country](https://worldpopulationreview.com/country-rankings/whatsapp-users-by-country)
- [Flick Network - Credit Note in Egypt](https://www.flick.network/en-eg/credit-note-in-egypt)
- [ETA SDK - Document Types](https://sdk.invoicing.eta.gov.eg/types/)
- [ETA SDK - Credit Note v1.0](https://sdk.invoicing.eta.gov.eg/documents/credit-note-v1-0/)
- [Orchidax - ETA E-Invoicing FAQ](https://orchidatax.com/eta-e-invoicing-egypt-faq/)
- [ClearTax - E-Invoicing in Egypt](https://www.cleartax.com/eg/en/e-invoicing-egypt)
- [SNI Technology - Egypt B2B E-Invoicing](https://snitechnology.net/egypt-einvoicing/)
- [GSL - Egyptian Company Audit](https://gsl.org/en/audit-foreign/audit-egypt/)
- [Baker McKenzie - Egyptian Exchange Reporting](https://resourcehub.bakermckenzie.com/en/resources/cross-border-listings-guide/europe-middle-east--africa/egyptian-exchange/topics/continuing-obligationsperiodic-reporting)
- [Fonoa - Egypt E-Invoicing Guide](https://www.fonoa.com/resources/country-tax-guides/egypt/e-invoicing-and-digital-reporting)
- [UltraTech Cement - Storage Guide](https://www.ultratechcement.com/for-homebuilders/home-building-explained-single/descriptive-articles/storage-of-cement)
- [SharMarket - Cement Storage Guidelines](https://sharmarket.co/blog/cement-storage-guidelines-for-warehouses-and-construction-sites)
- [Thackray Crane - Rebar Storage](https://thackraycrane.com/tips-for-protecting-and-storing-your-rebar/)
- [TheConstructor - Reinforcing Bars Storage](https://theconstructor.org/practical-guide/handle-store-reinforcing-bars/65391/)
- [Stewart Lumber - Lumber Storage](https://thestewartlumberco.com/blog/how-to-properly-store-and-maintain-lumber-to-prevent-warping-and-decay/)
- [Site Storage - Weather Impact on Construction Materials](https://sitestorage.net/construction-sites/the-impact-of-weather-conditions-on-your-construction-materials-how-on-site-storage-containers-can-help/)
- [MDN - PWA Offline Operation](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Offline_and_background_operation)
- [web.dev - Offline Data](https://web.dev/learn/pwa/offline-data)
- [insightsoftware - Logistics KPIs](https://insightsoftware.com/blog/20-best-logistics-kpis-and-metric-examples/)
- [NetSuite - Financial KPIs](https://www.netsuite.com/portal/resource/articles/accounting/financial-kpis-metrics.shtml)
- [Locate2u - Failed Delivery Causes](https://www.locate2u.com/blog/route-optimization/what-actually-causes-failed-deliveries-and-how-logistics-teams-reduce-them/)
