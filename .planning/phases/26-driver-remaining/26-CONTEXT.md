# Phase 26: Driver Remaining

## Goal
Drivers can report exceptions, complete end-of-day routines, and external drivers can manage job offers and earnings -- all offline-capable.

## Dependencies
- Phase 25 (Driver Route + Delivery + POD) must be complete: route overview, navigation, loading verification, delivery execution, and POD capture all working.

## Requirements

- **DRV-09**: Exception reporting: 7 failure types with photo evidence + reason categorization
- **DRV-10**: End of day: shift summary, returns processing, post-trip DVIR, odometer, sign-off
- **DRV-11**: External driver: job offers (accept/decline with payout), earnings dashboard

## Success Criteria
1. Exception reporting captures 7 failure types with photo evidence and reason categorization
2. End of day completes shift summary, returns processing, post-trip DVIR, odometer, and sign-off
3. External drivers see job offers (accept/decline with payout visibility) and earnings dashboard
4. Full delivery flow completes without internet; mutations queue in PowerSync and sync on reconnect

## What to Build
From GSD.md: Exception reporting (7 types), communication, end of day (returns, fuel, post-trip DVIR, summary), external driver job offers, external driver earnings + withdrawal.

## Spec References

### Screen 11: Exception Reporting (FRONTEND.md)

**Trigger:** [Report Issue] button available on Stop Detail, Delivery, and Route Overview screens.

**7 exception types with guided workflows:**

**1. Customer Unavailable**
- Did you call the site contact? (auto-filled from call log)
- Did you try an alternate contact?
- Response received?
- Timer: 15-minute mandatory wait started.
- Can you wait? App calculates impact on remaining stops.
- [Wait] [Skip and Return Later] [Mark Failed -- Return to Warehouse]

**2. Site Blocked**
- Photo of obstruction (required)
- Type of blockage: Gate locked / Construction barrier / Road closure / Flooding / Other
- Called site contact: Yes/No
- Resolution options
- [Wait] [Skip] [Mark Failed]

**3. Wrong Address**
- Photo of location (required)
- What is at this location? (text input)
- Called customer for correct address
- If new address received: app recalculates route, shows distance and time impact.
- [Navigate to new address] [Skip -- too far]

**4. Damaged Goods**
- When discovered: At loading / In transit / At delivery
- Affected items (select from manifest)
- Per item: Damage type (Bent/Deformed/Broken/Wet/Crushed/Rusted/Other), Severity (Minor/Moderate/Severe), Quantity affected
- Photos (minimum 2, recommended 4-6)
- Who noticed: Driver / Customer / Warehouse
- Customer decision: Accepts undamaged portion / Refuses entire delivery / Accepts all with damage notation
- [Submit damage report] -- auto-notifies dispatch + claims team

**5. Partial Delivery (Customer Request)**
- Customer says: (text input)
- Items customer WANTS now (checkboxes)
- Contacted dispatch (auto one-tap)
- Dispatch approved: Yes / Waiting
- Undelivered items: reason code "Customer request -- not ready"

**6. Weather Delay**
- Condition: Rain (heavy) / Sandstorm (Khamsin) / Extreme heat (>45C) / High wind (>30 km/h)
- Impact: Cannot drive safely / Cannot unload safely / Materials at risk
- Photo of conditions
- Khamsin-specific: "Block deliveries of sheet materials above 30 km/h wind."

**7. Vehicle Issue**
- Issue type: Engine failure / Flat tire / Hydraulic failure / Electrical issue / Overheating / Other
- Severity: Can continue after minor fix / Cannot continue -- need roadside assistance
- Photos of issue
- [Call Dispatch IMMEDIATELY] (56dp, red bg)
- Driver safety prompts: "Are you safe? Pull over. Activate hazard lights."

**All exceptions:** Timestamped + GPS-tagged. Auto-notify dispatch. Photos required for most types. Full audit trail.

### Screen 12: Communication (FRONTEND.md)

**In-app messaging:**
- Chat threads: with dispatch (primary), with warehouse, per-customer per delivery.
- Pre-defined quick message templates (one-tap, minimize typing for gloved hands):
  - "On my way to stop #X"
  - "Running approximately [15/30/45/60] minutes late"
  - "Delivery complete"
  - "Cannot access site -- gate locked"
  - "Need dispatcher callback"
- Photo and voice message support.
- Read receipts.

**Phone calls:**
- [Call Dispatch]: one-tap, direct to dispatch desk.
- [Call Customer]: masked number. Driver never sees customer's real phone number.
- [Emergency Call]: large red button. One-tap to Egyptian emergency services (123 ambulance, 122 traffic police). Also sends automatic alert to dispatch with GPS location.

**Automated system notifications (driver receives):**
- Route updated by dispatch, Customer message received, Delivery cancelled, Weather alert, Break reminder (8 hours on duty).
- Critical alerts override Do Not Disturb.

### Screen 13: End of Day (FRONTEND.md)

**Trigger:** Driver returns to depot. Taps "End Shift" from any screen.

**Returns processing:**
- Each return: item, quantity, reason code (damaged, customer refused, not needed, other), linked order + damage report.
- Warehouse receiving confirmation.

**Fuel:**
- Fuel gauge: 1/4, 1/2, 3/4, Full.
- Policy: minimum 1/2 tank at end of shift. If below: "Fill up before ending shift."
- Fuel receipt photo (optional).

**Post-Trip Inspection (DVIR):**
- Same 10-item checklist as pre-trip.
- Note any NEW defects found during the day.
- Digital signature.
- Open defects from pre-trip shown at top.
- New defects: photo required, severity, auto-routed to maintenance queue.

**Odometer (end):**
- Large numeric input. Photo of odometer reading.

**Day Summary:**
- Stops completed/failed, total km driven, total drive/on-duty time, on-time delivery %, exceptions logged, returns.
- All values in Geist Mono 500.

**End Shift:**
- [End Shift] button: 56dp, full-width, red bg (terminal action).
- Records clock-out time + GPS (depot). Stops background GPS tracking. Calculates total shift hours. Pushes all remaining queued data via PowerSync. Transitions driver status to "Off Duty."

**External driver variation:**
- No post-trip DVIR. No returns processing.
- Job completion screen: "Job Complete. Earnings: EGP 850."

### Screen 14: External Driver -- Job Offer (FRONTEND.md)

**Audience:** ON_DEMAND and CONTRACTED drivers only.

**Job listing:** Each job shows: Pickup location, Delivery location + distance, Materials summary, Total weight, Unloading method, Pay (EGP), Pickup + delivery windows, Countdown timer (Geist Mono 500, large).

**Job matching logic (invisible to driver):**
- Filtered by: vehicle type and capacity, driver GPS location, driver rating, job requirements.
- Jobs offered to multiple qualified drivers simultaneously. First to accept gets the job.

**Accept flow:**
- [Accept Job] -> confirmation overlay with details.
- GPS tracking begins. Job appears on Home Dashboard.
- Driver follows same screens as internal drivers (Route Overview, Stop Detail, Navigation, Loading Verification, Delivery Execution, POD Capture).

**After acceptance:**
- Dispatch reassignment window: 30 minutes. Driver notified if reassigned.
- Driver cancellation after 30 minutes: -5 reliability points. 3 cancellations in 30 days = 7-day cool-off.
- Driver cancellation within 30 minutes: no penalty.
- Job completion: payment added to earnings after POD validation. 48-hour hold before available for withdrawal.

**Contracted driver variation:**
- Jobs are "offered" (not claimed from pool). 30-minute acceptance window.
- Performance tracked via scorecard (on-time rate, POD compliance, damage rate).

### Screen 15: External Driver -- Earnings (FRONTEND.md)

**Audience:** ON_DEMAND and CONTRACTED drivers only.

**Earnings data:**
- This week, this month, pending (awaiting validation), available (ready for withdrawal).
- All amounts in Geist Mono 500.
- History: per-job breakdown with date, job ID, amount, status (Pending / Paid / Processing).
- Weekly breakdown.

**Payout methods (Egypt-specific):**
- Bank transfer (1-2 business days).
- Cash at HyperQuote office.
- HyperQuote withholds 5% (services rate per Egyptian tax law).

**Withdrawal rules:**
- Minimum withdrawal: EGP 500.
- Processing time: 1-3 Egyptian business days (Sunday-Thursday).
- Auto-payout option: configurable -- weekly or monthly. Toggle: "Auto-withdraw when balance exceeds EGP ___" (NumberField, default 2000, min 500).
- 48-hour hold after job completion before amount moves from "Pending" to "Available".

**Earnings breakdown per job (expandable row):** base pay + distance bonus (if > 30km) + heavy load surcharge (if > 3,000kg) + night delivery premium (if 10PM-6AM). Each component in Geist Mono 400.

**Rating impact:** Higher ratings = more job offers. Rating based on: on-time arrival, POD quality, customer feedback, damage rate. Star rating at top of earnings screen.

### Server Functions (from BACKEND.md Section 6 — Driver)

> **Note:** Driver app calls Supabase directly (RLS-protected) for reads, but uses these server functions for mutations that need server-side validation.

| Function | Method | Input | Output | Auth | Side Effects |
|---|---|---|---|---|---|
| `reportIssue` | POST | `{ shipmentId, type, description, photos? }` | `{ issueId }` | driver | Notify dispatch, escalate if critical |
| `getDriverHistory` | GET | `{ page, limit, dateRange? }` | `{ deliveries[], stats }` | driver | none |
| `endShift` | POST | `{ odometerEnd, fuelLevel?, postTripInspectionId? }` | `{ shiftSummary }` | driver | Closes shift |
| `submitEndOfDayReport` | POST | `{ shiftId, returns?, fuelLevel?, notes? }` | `{ success }` | driver | Submits EOD report |
| `getJobOffers` | GET | `{}` | `{ jobs[] }` | driver (external) | none |
| `acceptJob` | POST | `{ jobId }` | `{ success }` | driver (external) | Assigns job |
| `declineJob` | POST | `{ jobId, reason? }` | `{ success }` | driver (external) | Releases to pool |
| `getDriverEarnings` | GET | `{ period }` | `{ earnings, pending, available }` | driver (external) | none |
| `requestWithdrawal` | POST | `{ amount, bankAccountId }` | `{ withdrawalId }` | driver (external) | Creates withdrawal request |

## Business Rules

**Three Driver Types (from RESEARCH.md):**

| Type | Vehicle | Equipment Access | Dispatch | Pay |
|------|---------|-----------------|----------|-----|
| INTERNAL | Company vehicle | Full (Moffett, boom, crane) | Dispatched directly | Egyptian labor law + benefits |
| CONTRACTED | Own commercial vehicle | Own verified equipment | Priority overflow, offered (30-min window) | Per-trip negotiated |
| ON_DEMAND | Own vehicle (light loads only) | None | Claimed from available pool | Per-delivery via platform |

**Equipment-tagged dispatch:** Moffett/boom/CDL jobs -> INTERNAL or CONTRACTED only, never ON_DEMAND.

**External Driver Onboarding:** License verification, CDL check, insurance verification, background check, vehicle inspection, drug test (if CDL), signed contractor agreement -- 3-10 business days.

**Contracted Driver Workflow:** Receive jobs via same app as internal drivers, but "offered" not "assigned." Accept/reject within 30 minutes. Insurance verified monthly. Invoicing: submit invoices via portal; HyperQuote pays weekly with 5% withholding.

**Failed Delivery Handling:**
- 7 failure types: customer not available, site blocked, wrong address, damaged goods, partial refused, weather, vehicle issue.
- Each requires: photo evidence, categorized reason, dispatch notification.
- Cost per failure: $150-400+
- Target: 93-97% first-attempt success rate
- Options: return to warehouse, attempt redelivery, leave with alternate contact (with POD)

**Accident Procedures (Egyptian Context):**
1. Check for injuries. Call 123 (ambulance) or 122 (traffic police).
2. Secure scene: hazard lights, warning triangles.
3. Call dispatch via phone immediately (not app).
4. Do NOT admit fault.
5. Document: photos of all vehicles, damage, road conditions, license plates.
6. Wait for traffic police -- mahdar (police report) is mandatory for insurance claims.
7. In-app: Report Issue > Accident/Incident.
8. Dispatch: notify management, contact insurance (within 48-72h), arrange vehicle recovery, reschedule deliveries.
9. If driver detained (possible for fatal accidents): dispatch arranges legal representation immediately.

**Offline Sync Strategy:**
- PowerSync reads Supabase WAL, syncs to local SQLite.
- Upload queue for delivery confirmations, GPS breadcrumbs, photos.
- Photo compression: 1920px max, JPEG 0.7 before queuing.
- Background sync via Capacitor background task.
- Conflict resolution: driver is authority for delivery status, dispatcher for routes.

## Non-Negotiable Rules

1. **Vite + React SPA, NOT TanStack Start.** Driver app uses Capacitor.
2. **Geist Mono for ALL numbers.** Earnings, distances, times, weights, IDs.
3. **React Aria Components, NOT shadcn.** All interactive elements.
4. **Motion v12, NOT framer-motion.** Import from `motion/react`.
5. **Bun, NOT npm/yarn/pnpm.**
6. **Three colors only.** White, Black, Blue. Semantic status colors for data only.
7. **Arabic-Indic numerals** in Arabic context.
8. **All units translated to Arabic** in Arabic context.

## Known Risks & Gotchas

1. **Offline-first is critical.** Full delivery flow must complete without internet. All mutations queue in PowerSync. Test thoroughly.
2. **Photo queue management.** Multiple exception reports can accumulate photos. Storage management needed on device.
3. **External driver payment calculations.** Base pay + distance bonus + heavy load surcharge + night premium. Ensure all components calculate correctly.
4. **5% withholding tax on external drivers.** Services rate, not 1% goods rate. Must be tracked separately.
5. **48-hour hold on earnings.** Pending -> Available transition must be time-based, reliable even if app is offline.
6. **Reliability score system.** Cancellation penalties (-5 points), 7-day cool-off after 3 cancellations in 30 days. Must persist across sessions.

## Tips

- Exception reporting screens should be guided workflows, not blank forms. Pre-fill as much as possible from context.
- Pre-defined quick messages minimize typing for gloved hands.
- [Emergency Call] must work even when app is in background or partially crashed.
- End of Day is a terminal action -- make it deliberate (red button, confirmation).
- External driver earnings: show net amounts (after 5% withholding). Make the math transparent.
- Test offline sync thoroughly: create deliveries, exceptions, PODs, then reconnect and verify data integrity.
