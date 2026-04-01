> ⚠️ **REFERENCE DOCUMENT — NOT THE SOURCE OF TRUTH**
> This file was written during the research phase and may contain outdated decisions, US-centric references, or superseded technical choices.
> **Always defer to `essential/RESEARCH.md` for current decisions.**
> Key changes since this file was written: TanStack Start (not Next.js), Capacitor (not Expo), React Aria (not shadcn), Egyptian law (not US FMCSA), EGP (not USD), dual auth pools, no online payments, no mobile wallets, spatial glass UI (not traditional dashboards).

# WALKTHROUGH: Complete Driver Perspective
## HyperQuote B2B Building Materials Distribution -- Egypt Market

**Date:** 2026-03-29
**Scope:** Every path a driver can take from first day to completed delivery, covering INTERNAL (W2) and EXTERNAL (ON_DEMAND) driver types.
**System context:** Driver app is Vite + React SPA + Capacitor native. Offline-first via PowerSync + Supabase. Background GPS via @transistorsoft/capacitor-background-geolocation. Truck-safe navigation via Sygic/HERE.

---

## Part 1: Mohammed -- Internal (W2) Driver, Full Day Walkthrough

### 1.1 Hiring and Onboarding (Before Day One)

Mohammed sees a HyperQuote driver posting on a local Egyptian job board. He applies online. HyperQuote's HR process begins:

**Screening steps:**
1. Application review -- driving license verification, years of experience, equipment familiarity
2. Driving record check through Egyptian traffic authority records
3. Reference check with previous employers
4. In-person interview at the HyperQuote depot
5. Practical driving evaluation -- cargo securement skills, Moffett operation if applicable, reversing at a simulated construction site approach
6. Medical fitness check (Egyptian labor law requires medical certificate for commercial drivers)
7. Background check per Egyptian labor regulations

**Onboarding (first week):**
1. Employment contract signed per Egyptian Labour Law No. 12 of 2003
2. Social insurance registration (employer and employee contributions per Law No. 148 of 2019)
3. Company uniform issued -- HyperQuote-branded shirt, hard hat, safety vest, steel-toed boots, gloves
4. Safety orientation: construction site hazards, PPE requirements, load securement basics, heat safety (critical in Egyptian summer -- temperatures exceed 40C)
5. App training session:
   - Download HyperQuote Driver app from Play Store / App Store
   - Login credentials issued (phone number + PIN, biometric enrollment)
   - Walk-through of every screen: shift start, DVIR, load verification, navigation, POD, exceptions, end-of-day
   - Practice POD capture: take sample photos, capture test signature
   - Offline mode demonstration: app works without connectivity
6. Vehicle familiarization: assigned truck type, pre-trip inspection walk-through with a senior driver
7. Ride-along day: Mohammed rides with an experienced driver for a full shift, observing every step
8. Solo test day: Mohammed runs a light route (2-3 easy stops) under supervision

Mohammed is now cleared for full solo routes.

---

### 1.2 Shift Start -- 5:30 AM, HyperQuote Depot, Cairo

**Step 1: App Login**

Mohammed arrives at the depot. He opens the HyperQuote Driver app on his company-issued Android phone. The login screen appears.

- He taps the fingerprint sensor. Biometric authentication via `@capgo/capacitor-native-biometric`. One tap. He is in.
- Fallback scenario: His fingers are dirty from the morning (common for drivers). Biometric fails. He enters his 6-digit PIN instead.
- The app session persists for the entire shift -- he will not need to log in again unless he explicitly logs out or the session expires after 12 hours of inactivity.
- The app is in Arabic (RTL layout). Language was set during onboarding. He can switch to English in settings.

**What the app shows on the dashboard (Screen 2: Shift Start / Dashboard):**

```
TODAY'S ROUTE
--------------
6 stops | ~185 km total | Est. finish: 2:45 PM
Total weight on truck: 18,400 kg
Special notes: "Stop #3 -- new site, no previous delivery data. Call foreman 15 min before arrival."

[Start Shift]  [Pre-Trip Inspection]  [View Full Route]  [Messages (2)]

Vehicle: Truck #HQ-017 (Flatbed + Moffett, Mitsubishi Fuso)
```

Mohammed taps **Start Shift**. The app records his clock-in time (5:32 AM), GPS coordinates (at the depot), and transitions his status to "On Duty -- Not Driving."

Background GPS tracking begins via `@transistorsoft/capacitor-background-geolocation`. The plugin uses accelerometer-based motion detection -- GPS is only activated when the device detects movement. Battery impact is minimal.

**Step 2: Vehicle Selection**

The app shows Truck #HQ-017 pre-assigned by dispatch. Mohammed confirms this is the correct vehicle. If the assigned truck is unavailable (maintenance, another driver took it), he taps "Change Vehicle" and selects from available trucks. Dispatch is notified of the swap.

**Step 3: Pre-Trip Inspection (DVIR) -- Screen 3**

Mohammed walks to Truck #HQ-017 in the depot yard. He opens the Pre-Trip Inspection screen.

The digital checklist is organized by vehicle area. Each item has a **Pass / Fail / N/A** toggle, plus a camera button for defect photos. Touch targets are 56-64dp -- glove-friendly.

**Exterior walk-around:**
- Tires (tread depth, inflation, damage) -- all 10 tires checked: PASS
- Lights (headlights, taillights, turn signals, marker lights, reflective tape): PASS
- Mirrors (both sides, adjustment, cracks): PASS
- Body/frame (cracks, damage, unsecured components): PASS
- Fluid leaks underneath: PASS
- Coupling devices (if applicable): N/A (single unit, no trailer today)

**Under hood:**
- Engine oil level: PASS
- Coolant level: PASS
- Belts and hoses: PASS
- Power steering fluid: PASS

**Cab:**
- Steering play: PASS
- Brake pedal feel: PASS
- Parking brake: PASS
- Horn: PASS
- Windshield wipers: PASS
- Gauges (fuel, temp, oil pressure, voltmeter): PASS
- Seatbelt: PASS
- Air conditioning (critical in Egypt): PASS

**Specialized equipment -- Moffett forklift:**
- Mounting brackets secure: PASS
- Hydraulic connections (no leaks): PASS
- Fork condition (no bending, cracks): PASS
- Moffett tires: PASS
- Fuel level on Moffett: PASS
- Safety restraint/seatbelt on Moffett: PASS

**Cargo area:**
- Deck condition: PASS
- Tie-down points: PASS
- Straps/chains/binders available and in good condition: PASS
- Edge protectors available: PASS

**Defect found scenario:** Mohammed notices a small hydraulic fluid weep on the Moffett's tilt cylinder. He taps FAIL on "Hydraulic connections," takes a photo, and writes a note: "Minor weep on tilt cylinder -- not actively dripping, appears stable." He marks severity as "Minor -- can still operate."

He signs the DVIR digitally. The inspection is timestamped (5:47 AM), GPS-tagged (depot), and auto-submitted to the fleet manager and maintenance queue. The maintenance team will schedule a repair, but the truck is cleared for today's route.

**Previous day's post-trip DVIR is visible** for reference: the previous driver noted no defects.

If Mohammed had found a Major defect (brake failure, tire blowout, structural crack), the truck would be red-tagged. He would tap "Report Major Defect" and the app would:
1. Flag the truck as out of service
2. Notify dispatch immediately
3. Prompt Mohammed to select a different vehicle or wait for reassignment

---

### 1.3 Loading at the Warehouse -- 5:50 AM

Mohammed drives Truck #HQ-017 from the parking area to the loading dock. He taps "Navigate to Loading Bay" in the app -- a short on-site navigation to Bay #3 where his orders are staged.

**Load Verification screen (Screen 4) activates.**

The screen shows:

```
LOAD PLAN -- Truck #HQ-017
===========================
Loading sequence: Load Order #2089 FIRST (last delivery), then #2085, then #2091 LAST (first delivery)

ORDER #2091 (First delivery -- load LAST, on top)
  Customer: Al-Nour Construction
  50x Cement bags (50kg each) -- 2,500 kg
  20x Rebar bundles (12mm, 12m) -- 1,800 kg

ORDER #2085 (Second delivery)
  Customer: Delta Engineering
  40x Plywood sheets (18mm, 1220x2440) -- 1,600 kg
  30x Drywall sheets (12.5mm, 1200x2400) -- 900 kg

ORDER #2089 (Last delivery -- load FIRST, on bottom)
  Customer: Pyramid Contractors
  15x Lumber bundles (treated pine, 50x100mm, 3m) -- 4,500 kg
  8x Steel beam (IPE 200, 6m) -- 2,100 kg

... (3 more orders)

TOTAL WEIGHT: 18,400 kg
TRUCK CAPACITY: 22,000 kg
REMAINING CAPACITY: 3,600 kg
```

**The warehouse team loads the truck.** Mohammed does NOT do the physical loading. He stands at the truck supervising:

1. **Warehouse forklift operator** loads lumber bundles and steel beams first (Order #2089, last delivery). Mohammed watches placement for weight distribution -- heavy items centered over axles, balanced side-to-side.

2. Mohammed scans each pallet/bundle as it is loaded:
   - He opens barcode scan mode. The camera activates (`@capacitor-mlkit/barcode-scanning`).
   - He points the phone at the QR code on each pallet tag. Scan takes <0.2 seconds.
   - The app checks scanned item against the manifest. Green checkmark for match.
   - For items without barcodes (loose rebar bundles), he switches to manual check mode and taps to confirm count.

3. **Mismatch scenario:** The manifest says 50 cement bags but only 48 are on the pallet. Mohammed taps the line item and adjusts the count to 48. The app shows: "SHORT 2 -- Expected 50, Loaded 48." He taps "Report Shortage." The warehouse team confirms: two bags were damaged in storage and removed. Dispatch is notified. The shortage is documented before departure.

4. **Cargo securement:** After all loading is complete, Mohammed secures the load:
   - Ratchet straps for lumber bundles (2 per bundle, plus edge protectors)
   - Chains and binders for steel beams
   - Straps for cement pallets, plywood, and drywall stacks
   - Dunnage (wooden spacers) between layers

5. **Photos:** Mohammed takes two photos via the app:
   - "Loaded truck" -- wide shot showing the entire load
   - "Cargo securement" -- showing straps, chains, edge protectors in place
   - Photos are auto-tagged with GPS (depot) and timestamp (6:18 AM)

6. **Weight verification:** The truck drives over the depot's weighbridge. Mohammed enters the scale ticket reading manually: 18,420 kg net cargo weight. The app compares to the calculated manifest weight (18,400 kg). Within tolerance. The app shows: "Weight OK -- 83.7% of capacity."

7. **Damage check at loading:** "Any damage visible before departure?" Mohammed taps "No."

8. **Sign-off:** Mohammed taps "I confirm this load is correct and secured." Digital signature captured. He taps **Ready to Depart**.

The app transitions to Route View (Screen 5).

---

### 1.4 Route Execution -- 6:30 AM Departure

**Route View (Screen 5):**

The map shows all 6 stops as numbered pins across Greater Cairo and Giza. The optimal route path is highlighted. Traffic overlay shows real-time conditions (powered by HERE Traffic or Sygic data).

```
Stop list (swipeable bottom sheet):
1. Al-Nour Construction -- 6th October City -- ETA 7:15 AM -- [Cement + Rebar] -- Moffett unload
2. Delta Engineering -- Sheikh Zayed -- ETA 8:30 AM -- [Plywood + Drywall] -- Manual + site crane
3. Pyramid Contractors -- Giza -- ETA 10:00 AM -- [Lumber + Steel] -- Moffett unload
4. Masr El-Gadida Build -- Heliopolis -- ETA 11:30 AM -- [Windows + fixtures] -- Manual
5. Suez Canal Developers -- Nasr City -- ETA 12:45 PM -- [Cement blocks] -- Moffett
6. Nile Valley Construction -- New Cairo -- ETA 1:45 PM -- [Rebar + mesh] -- Moffett

Route stats: 6 stops | 185 km | Est. finish 2:45 PM
```

Mohammed taps **"Navigate to First Stop."**

**Turn-by-Turn Navigation (Screen 6):**

The app launches integrated truck-safe navigation (Sygic or HERE SDK, NOT Google Maps). The routing engine accounts for:
- Weight-restricted bridges avoided (critical in Egypt where many bridges have posted limits)
- Low clearance underpasses avoided (common in Cairo)
- Truck-prohibited roads avoided (residential areas, narrow streets)
- One-way systems and construction zone detours

Voice guidance in Arabic. Hands-free operation.

The navigation screen shows:
- Turn-by-turn directions with distance to next maneuver
- Bottom bar: "Al-Nour Construction | 6th October City | Window: 7:00-9:00 AM"
- "Call Customer" button (one-tap, for approach calls)

**Traffic scenario:** At 6:45 AM, Mohammed hits heavy traffic on the Ring Road (typical Cairo morning). The ETA to Stop #1 jumps from 7:15 AM to 7:40 AM. The app:
1. Recalculates the route, searching for alternatives
2. Updates the ETA for all subsequent stops
3. Since he is still within the delivery window (7:00-9:00 AM), no alert is triggered
4. If the ETA would breach the delivery window, the app alerts dispatch automatically

**Connectivity loss scenario:** Mohammed enters an area with poor cellular coverage (common in construction zones on the outskirts of Cairo). The app continues working:
- Map tiles are pre-cached for the entire delivery area (PMTiles stored locally)
- Turn-by-turn navigation works offline
- All delivery data was synced to local SQLite (via PowerSync) before departure
- Any actions he takes (status updates, notes) are queued locally and sync when connectivity returns

---

### 1.5 Arrival at First Stop -- Al-Nour Construction, 6th October City, 7:35 AM

**Geofence trigger at ~500 meters:**

The `@transistorsoft/capacitor-background-geolocation` plugin detects Mohammed entering the 500m geofence around the delivery site. The app auto-expands **Stop Details (Screen 7):**

```
STOP #1 -- Al-Nour Construction
================================
Contact: Eng. Hassan (Foreman) -- 010-XXXX-XXXX
Address: Plot 47, Industrial Zone B, 6th October City
Delivery window: 7:00-9:00 AM
Access: Enter through Gate #2 (south side). Tell security "HyperQuote delivery."
PPE Required: Hard hat, safety vest, steel-toed boots [Acknowledge checkbox]
Unloading: Moffett -- "Place cement on the east side of the foundation slab. Rebar bundles near the column line."
Previous delivery notes: "Ground firm. Adequate space for Moffett. Watch for excavation trench on the north side."
```

**Step 1: Approach call**

Mohammed taps "Call Site Contact." The app dials Eng. Hassan directly:
"Sabah el-kheir, Eng. Hassan. I'm Mohammed from HyperQuote. I'm 5 minutes away with your cement and rebar delivery. Are you ready for me?"

Hassan confirms: "Yes, come through Gate #2. I'll meet you at the east foundation."

**Step 2: Site entry**

Mohammed arrives at the construction site. He checks the PPE acknowledgment box in the app (confirming he is wearing hard hat, vest, boots). He announces himself to the security guard, who waves him through.

**Step 3: Arrival**

Mohammed taps **"Arrived"** in the app. This:
- Records arrival timestamp (7:38 AM) and GPS coordinates
- Notifies dispatch: "Driver #Mohammed arrived at Stop #1"
- Triggers automated customer notification (if configured): SMS/WhatsApp to the customer's project manager

**Step 4: Site safety assessment**

Mohammed scans the area before unloading:
- Overhead power lines? -- None in the immediate unloading area. CLEAR.
- Soft ground? -- Foundation slab area is compacted gravel. FIRM. Good for Moffett.
- Excavation trenches? -- Trench visible on the north side (as noted in previous delivery data). He will stay clear.
- Other equipment? -- A tower crane is operating on the opposite end of the site. Not in his work zone. CLEAR.
- Workers nearby? -- Two laborers in the area. Mohammed asks them to stand clear during unloading.

**Step 5: Unloading with Moffett**

Mohammed positions the truck, sets the parking brake, and chocks the wheels. He dismounts the Moffett forklift from the rear bracket:

1. Releases Moffett mounting locks
2. Starts the Moffett, performs quick operational check (forks, tilt, steering)
3. Drives the Moffett off the truck bracket
4. Picks up the first cement pallet (25 bags, ~1,250 kg) from the truck
5. Drives the Moffett to the designated location (east side of foundation slab)
6. Places the pallet. Eng. Hassan confirms placement.
7. Returns for the second cement pallet. Places it next to the first.
8. Picks up the rebar bundles. Places them near the column line as instructed.
9. Re-mounts the Moffett onto the truck bracket. Locks it in place.

Total unloading time: ~25 minutes.

**Step 6: Customer verification**

Eng. Hassan counts the delivered materials:
- 48 cement bags (he was expecting 50 -- Mohammed explains the 2-bag shortage noted at loading)
- 20 rebar bundles -- all present, condition good

Hassan notes the 2-bag shortage but accepts the delivery. He will receive the 2 replacement bags on the next delivery run.

---

### 1.6 POD Capture -- Screen 9

**Step 1: Photos (required, minimum 1)**

Mohammed captures three photos through the app:
1. **Wide shot:** Shows the cement pallets and rebar bundles placed at the east foundation. The construction site is visible in the background for context.
2. **Close-up:** Shows the cement bags in good condition, brand labels visible.
3. **Placement verification:** Shows the rebar bundles positioned near the column line, matching the customer's instructions.

All photos are auto-tagged with GPS coordinates + timestamp via the Capacitor Camera plugin. Metadata embedded in the image file.

**Step 2: Signature capture**

Mohammed hands his phone to Eng. Hassan. The full-screen signature pad appears (optimized for finger input, large touch area).
- Hassan signs with his finger on the touchscreen.
- Below the signature: "Print name" field -- he types "Hassan Mohamed Ali"
- "Title/role" dropdown -- he selects "Foreman"

**Step 3: Quantity confirmation**

The app shows the delivery manifest with checkboxes:
- [x] Cement bags -- Delivered: 48 of 50 (SHORT 2 -- noted at loading)
- [x] Rebar bundles 12mm -- Delivered: 20 of 20

**Step 4: Condition and notes**

Mohammed selects: "Materials delivered in good condition."
Quick note: "2 cement bags short -- damaged at warehouse, replacement scheduled."

**Step 5: Completion**

Mohammed performs a **swipe-to-confirm** gesture: "Complete Delivery." This prevents accidental completion (the gesture requires intentional thumb swipe across the full screen width).

The POD is:
- Stored locally in SQLite immediately (offline-safe)
- Queued for upload to Supabase Storage (photos) and Supabase database (POD record)
- When connectivity is available, PowerSync pushes the data to the server
- Dispatch sees the completed delivery appear on their dashboard
- The customer's project manager receives an automated delivery confirmation via WhatsApp/SMS

**Step 6: HyperQuote-branded delivery note**

The app generates a HyperQuote-branded delivery note (PDF) containing:
- HyperQuote logo and company details
- Order number, date, delivery address
- Itemized list of delivered materials with quantities
- Shortage notation (2 cement bags)
- Driver name, signature, timestamp
- Receiver name, signature, title
- GPS coordinates and map thumbnail
- Photo thumbnails

This delivery note is available to the customer via the HyperQuote customer portal and can be shared via WhatsApp.

**Departure from Stop #1:**

Mohammed re-secures the remaining cargo on the truck (the partial unload shifted some items). He checks straps and tightens where needed. He taps "Navigate to Next Stop." The app routes him to Stop #2: Delta Engineering, Sheikh Zayed.

---

### 1.7 Problem at Second Stop -- Delta Engineering, Sheikh Zayed, 8:45 AM

Mohammed arrives at Stop #2. Geofence triggers the stop details. He calls the site contact, Eng. Mona.

**No answer.** He calls again. No answer.

He calls a second contact listed in the app (the company's office number). The office says: "Eng. Mona is in a meeting, she will be available in about an hour."

**Exception handling workflow -- Screen 11:**

Mohammed taps **"Report Issue"** in the app. He selects exception type: **"No one to receive."**

The guided workflow begins:
1. "Did you call the site contact?" -- Yes, 2 attempts at [8:46 AM] and [8:48 AM]
2. "Did you try an alternate contact?" -- Yes, called office at [8:50 AM]
3. "Response received?" -- "Contact will be available in approximately 1 hour"
4. "Can you wait?" -- The app calculates: waiting 1 hour would push remaining stops but still fit within the route. It shows: "If you wait 60 min, estimated completion shifts to 3:30 PM (was 2:45 PM)."

**Decision point -- what happens next:**

The app presents options:
- **Wait** -- driver stays on site. Timer starts. Status: "Waiting at Stop #2."
- **Skip and Return Later** -- driver proceeds to Stop #3, comes back to Stop #2 after
- **Mark Failed -- Return to Warehouse** -- materials go back to depot

Mohammed contacts dispatch via in-app messaging:
"At Stop #2, Delta Engineering. Site contact unavailable for ~1 hour. Should I wait or skip?"

Dispatch responds (in-app, within 2 minutes):
"Skip Stop #2. Proceed to Stop #3 (Pyramid Contractors). We will reschedule Stop #2 for your return pass this afternoon."

Mohammed taps **"Skip and Return Later."** The app:
1. Records the exception with timestamp, call log, and reason
2. Moves Stop #2 to the end of the route (after Stop #6, or dispatched as a return pass)
3. Notifies Delta Engineering's office via automated message: "Your delivery has been rescheduled. New ETA: approximately 2:30 PM."
4. Updates all remaining ETAs
5. Navigates Mohammed to Stop #3

**Critical detail:** Mohammed does NOT leave any materials at the site without a signature. There is no pre-authorization for unattended delivery at this customer.

---

### 1.8 Damaged Goods Discovered at Third Stop -- Pyramid Contractors, Giza, 10:15 AM

Mohammed arrives at Pyramid Contractors. The foreman, Eng. Tarek, meets him at the unloading area.

Mohammed begins unloading with the Moffett. After placing the lumber bundles, he picks up the steel beams. As he positions the first set on the ground, Eng. Tarek immediately notices a problem.

**"These beams are bent. Look -- this one has a visible bow. And this one has rust pitting that was not on the spec."**

Mohammed stops unloading. He walks over and confirms: 3 of the 8 steel beams (IPE 200, 6m) show a noticeable bend, and 2 have surface rust beyond normal mill scale.

**Damage Reporting Workflow -- Screen 10:**

Mohammed opens the Damage Reporting screen:

1. **When discovered:** "At delivery"
2. **Damage type:** He selects "Bent/Deformed" for 3 beams and "Corroded/Rusted" for 2 beams
3. **Affected items:** He taps the steel beam line item and adjusts: "3 beams bent, 2 beams rusted (some overlap -- 1 beam is both bent and rusted)"
4. **Severity:** "Moderate -- partial loss of function" for the bent beams, "Minor -- cosmetic" for the rust-only beams
5. **Photos:** Mohammed takes 6 photos:
   - Wide shot of all beams on the ground
   - Close-up of bent beam #1 (showing the bow against a straight edge)
   - Close-up of bent beam #2
   - Close-up of bent beam #3
   - Close-up of rust pitting on beam #4
   - The delivery note with Eng. Tarek pointing at the damaged beams (context shot)
6. **Who noticed:** "Customer"
7. **Notes:** "3 of 8 IPE 200 beams have visible bowing. 2 beams have rust pitting beyond normal mill scale. Customer (Eng. Tarek, Foreman) refuses the 3 bent beams. Accepts the 2 rust-only beams at this time. Accepts the remaining 3 undamaged beams."

**Automatic notifications fire:**
- Dispatch receives a push notification with damage summary and photos
- The claims/operations team is flagged
- The damage report is linked to Order #2089 and this specific delivery

**The dispatcher calls Mohammed:**

Dispatcher: "Mohammed, I see the damage report on the 3 bent beams. Did the customer accept the other 5?"
Mohammed: "Yes, Eng. Tarek will take the 5 good beams and the 15 lumber bundles. He is refusing the 3 bent beams. He wants replacements."
Dispatcher: "OK, load the 3 bent beams back on the truck and bring them back to the depot. I am filing a supplier claim now and will schedule replacement beams."

**Partial delivery execution:**

Mohammed proceeds with the delivery of the accepted items:
- 15 lumber bundles: all delivered, good condition
- 5 steel beams (3 undamaged + 2 with minor rust): delivered, customer accepts with notation
- 3 bent steel beams: REFUSED, remain on truck for return to depot

**POD for partial delivery:**

On the POD screen, Mohammed:
1. Marks lumber bundles as "Delivered -- all 15"
2. Marks steel beams as "Partial -- 5 of 8 delivered"
3. Selects reason for undelivered items: "Damaged -- customer refused"
4. Remaining 3 beams auto-flagged for follow-up (replacement delivery)
5. Takes POD photos of delivered items at placement location
6. Eng. Tarek signs the POD with annotation: "3 IPE 200 beams refused due to bending. Replacement required."
7. Condition statement: "Damage noted -- see photos and exception report"

The app generates a partial delivery note. The 3 refused beams are tracked as "Return to depot -- damaged goods."

**Meanwhile, dispatch is working the upstream claim:**
1. Dispatch contacts the supplier via WhatsApp with photos (timestamped notification per Egyptian Commercial Code -- within 15 days of receipt, but best practice is immediately)
2. Formal damage claim initiated in the HyperQuote system
3. Replacement beams sourced -- either from same supplier (if batch issue is isolated) or alternate supplier
4. Customer is notified of replacement timeline

Mohammed loads the 3 bent beams back onto the truck, secures them, and proceeds to Stop #4.

---

### 1.9 Communication with Dispatch Throughout the Day

Communication between Mohammed and dispatch happens through multiple channels, all tracked in the app (Screen 13: Messaging/Communication):

**In-app messaging (primary, keeps a record):**
- Mohammed sends: "Departed Stop #1, heading to Stop #2" (quick message tap)
- Mohammed sends: "Running ~15 min late due to Ring Road traffic"
- Dispatch sends: "Noted. Stop #2 customer informed."
- Mohammed sends: "Stop #2 -- no receiver, see exception report"
- Dispatch sends: "Skip Stop #2, return later. Acknowledged."
- Mohammed sends: photo of damaged beams at Stop #3

**Phone calls (urgent/complex issues):**
- Dispatch calls Mohammed about the beam damage (voice is faster for complex decisions)
- Mohammed calls dispatch when he needs immediate guidance at Stop #5 (gate code in the app does not work)

**Automated system notifications:**
- System to customer: "Your driver is 15 minutes away" (triggered at 5 km geofence)
- System to customer: "Your delivery is complete" (triggered on POD submission)
- System to dispatch: "Driver #Mohammed arrived at Stop #4" (triggered by geofence)
- System to Mohammed: push notification "New message from dispatch" with distinct notification sound

**Quick message templates (pre-defined, one-tap):**
- "On my way to stop #X"
- "Running approximately [15/30/45/60] minutes late"
- "Delivery complete"
- "Cannot access site -- gate locked"
- "Need dispatcher callback"

These minimize typing -- critical for glove-wearing drivers on construction sites.

---

### 1.10 Remaining Stops (4, 5, 6) and Return to Stop #2

**Stop #4 -- Masr El-Gadida Build, Heliopolis, 11:20 AM:**
Routine delivery. Windows and fixtures, manual unload with site crew assistance. Customer present, materials in good condition. POD captured -- photo, signature from site engineer. Completed in 20 minutes.

**Stop #5 -- Suez Canal Developers, Nasr City, 12:35 PM:**
Gate code in the app (4521) does not work. Mohammed calls the site contact -- no answer. He calls dispatch. Dispatch contacts the customer's office and gets the updated code (4578). Mohammed enters. Delivery proceeds normally -- cement blocks unloaded via Moffett. POD captured. Completed.

**Note:** The app's site access notes are now outdated. Mohammed adds a note to the delivery record: "Gate code changed to 4578 as of today." This note will appear for the next driver delivering to this site. (Historical delivery notes are a key feature of the stop details screen.)

**Stop #6 -- Nile Valley Construction, New Cairo, 1:40 PM:**
Routine delivery. Rebar and mesh. Moffett unload. POD captured.

**Return to Stop #2 -- Delta Engineering, Sheikh Zayed, 2:45 PM:**
Mohammed drives back to Delta Engineering. Eng. Mona is now available. The delivery proceeds:
- 40 plywood sheets and 30 drywall sheets unloaded manually with site crew
- Drywall requires careful handling (fragile edges)
- Eng. Mona inspects and counts. All items present and in good condition.
- POD captured with signature from Eng. Mona (title: "Site Engineer")
- Delivery note records that this was a rescheduled delivery (original ETA: 8:30 AM, actual: 2:45 PM)

---

### 1.11 End of Day -- 3:30 PM, Return to Depot

**Step 1: Return to depot**

Mohammed navigates back to the HyperQuote depot. He drives through the gate and parks at the unloading area.

**Step 2: Returns**

Mohammed has 3 bent steel beams to return. He drives to the receiving dock.

In the app (End of Day screen -- Screen 15), he logs the returned items:
- Item: IPE 200 steel beam, 6m
- Quantity returned: 3
- Reason code: "Damaged -- customer refused"
- Linked to: Order #2089, Delivery to Pyramid Contractors, Damage Report #DR-0472

The warehouse receiving team takes custody of the 3 beams. They are placed in the "damaged returns" staging area pending supplier claim resolution.

**Step 3: Fuel**

Fuel gauge shows 1/4 tank. Company policy requires minimum 1/2 tank at end of shift. Mohammed drives to the depot fuel pump, fills up, and enters the fuel amount in the app (optional -- some depots have automated fuel tracking via fleet card).

**Step 4: Post-Trip Inspection (DVIR)**

Mohammed opens the Post-Trip Inspection in the app. Same checklist as the pre-trip. He walks the truck:
- Everything checks out PASS except:
- The Moffett hydraulic weep he noted this morning is unchanged (still minor)
- He notices a new issue: one ratchet strap has fraying. He marks FAIL on "Securement equipment condition," takes a photo, notes: "4-inch ratchet strap #3 showing fraying at the buckle. Should be replaced before next use."
- He signs the post-trip DVIR digitally.

The frayed strap defect is auto-routed to the maintenance queue. A mechanic will review and either replace the strap or tag it for disposal.

**Step 5: Day Summary**

The End of Day screen shows:

```
DAY SUMMARY -- Mohammed -- 2026-03-29
=======================================
Stops completed:    6 of 6 (1 rescheduled)
Stops failed:       0
Total km driven:    207 km
Total drive time:   4h 12m
Total on-duty time: 9h 58m
On-time delivery:   83% (5 of 6 within window; Stop #2 rescheduled)
Exceptions logged:  2 (1 no-receiver, 1 damaged goods)
Returns:            3 steel beams (damaged)
Pending items:      Replacement beams for Pyramid Contractors (Order #2089)
```

**Step 6: End Shift**

Mohammed taps **"End Shift."** The app:
1. Records clock-out time (3:28 PM) and GPS (depot)
2. Stops background GPS tracking
3. Calculates total shift hours: 9 hours 56 minutes
4. Pushes all remaining queued data to the server via PowerSync
5. Transitions Mohammed's status to "Off Duty"

Mohammed locks the truck, returns the key to the key box, and goes home.

---

## Part 2: Fatima -- External (ON_DEMAND) Driver

### 2.1 Sign-Up and Verification

Fatima is an independent owner-operator with a Hyundai HD72 flatbed truck (3.5-ton payload, non-CDL equivalent in Egypt). She hears about HyperQuote's driver platform through a WhatsApp group for Egyptian truck operators.

**Registration process:**

1. **Download the HyperQuote Driver app** from the Play Store.
2. **Select "Register as External Driver"** on the login screen. This routes her to a different onboarding flow than internal drivers.
3. **Personal information:**
   - Full legal name (Arabic and English transliteration)
   - National ID number (Egyptian national ID card -- required)
   - Phone number (verified via OTP SMS)
   - Photo of her national ID (front and back) -- captured via app camera
   - Selfie for identity verification (compared against ID photo)
4. **Driver credentials:**
   - Driving license photo (front and back)
   - License class and expiration date
   - Years of commercial driving experience
5. **Vehicle information:**
   - Vehicle registration card (photo)
   - Vehicle type: Flatbed
   - Vehicle make/model/year: Hyundai HD72, 2022
   - Payload capacity: 3,500 kg
   - Photos of vehicle: front, rear, left side, right side, cargo area (5 photos minimum)
   - Vehicle insurance document (photo) -- must show valid third-party liability coverage
6. **Bank/payment information:**
   - Bank name and account number (for payout)
   - Or mobile wallet details (Vodafone Cash, Orange Money, Etisalat Cash, InstaPay -- common in Egypt)
7. **Terms acceptance:**
   - Independent contractor agreement
   - HyperQuote delivery standards acknowledgment
   - Safety requirements acknowledgment
   - Data privacy consent (GPS tracking during active deliveries)

**Verification process (24-72 hours):**
- HyperQuote's operations team reviews submitted documents
- Driving license verified against Egyptian traffic authority database
- Vehicle registration verified
- Insurance validity confirmed
- Vehicle photos reviewed for condition (no obvious safety issues)
- Background check (criminal record check where feasible in Egypt)

**Approval notification:**
Fatima receives a push notification: "Welcome to HyperQuote! Your driver account is approved. You can now see available delivery jobs."

Her app now shows the **Job Offers screen (Screen -- External)** instead of the dispatch-assigned route that Mohammed sees.

---

### 2.2 Seeing and Accepting a Job

**Fatima's app dashboard looks different from Mohammed's:**

```
AVAILABLE JOBS (3 nearby)
==========================

JOB #J-4521
  Pickup: HyperQuote Depot, 10th of Ramadan City
  Delivery: Construction site, Shorouk City (22 km from pickup)
  Materials: 30x Cement bags (50kg), 10x PVC pipes (4m)
  Total weight: 1,650 kg
  Unloading: Manual (customer crew assists)
  Pay: EGP 850
  Pickup window: Today, 9:00-10:00 AM
  Delivery window: Today, 10:30 AM-12:00 PM
  [Accept Job]  [Decline]

JOB #J-4523
  Pickup: Supplier warehouse, Badr City
  Delivery: 2 stops in New Cairo (35 km total)
  Materials: Mixed -- tiles + adhesive
  Total weight: 2,800 kg
  Unloading: Manual
  Pay: EGP 1,200
  Pickup window: Today, 11:00 AM-12:00 PM
  [Accept Job]  [Decline]

JOB #J-4525
  Pickup: HyperQuote Depot, 6th October City
  Delivery: Giza, single stop (18 km)
  Materials: Insulation rolls
  Total weight: 400 kg
  Unloading: Manual
  Pay: EGP 500
  Pickup window: Today, 2:00-3:00 PM
  [Accept Job]  [Decline]
```

**Job matching logic:** The jobs shown to Fatima are filtered by:
- Her vehicle type and capacity (flatbed, 3,500 kg max -- so no jobs requiring Moffett, boom, or CDL-class vehicles)
- Her current GPS location (jobs with nearby pickup points are prioritized)
- Her rating (higher-rated drivers see more jobs and see them sooner)
- The job requirements (manual unload only -- no equipment certification needed)

**Fatima reviews Job #J-4521:** Single stop, 22 km, 1,650 kg (well within her truck's capacity), manual unload, EGP 850. She knows the area. Good pay for the distance.

She taps **"Accept Job."**

The app confirms:
```
JOB #J-4521 ACCEPTED
=====================
Pickup: HyperQuote Depot, 10th of Ramadan City
Pickup window: 9:00-10:00 AM (arrive by 9:45 AM latest)
Navigate to pickup? [Yes]
```

She taps "Yes." Navigation to the HyperQuote depot begins.

**What happens if she does not accept fast enough?**
Jobs are offered to multiple qualified drivers simultaneously. The first to accept gets the job. If Fatima takes too long, the job is assigned to another driver. The app shows "Job no longer available."

---

### 2.3 How Her Experience Differs from Mohammed's

**Key differences between Fatima (ON_DEMAND) and Mohammed (INTERNAL):**

| Aspect | Mohammed (Internal) | Fatima (On-Demand) |
|--------|--------------------|--------------------|
| Route assignment | Dispatch assigns full route (6+ stops) | Single job (1-2 stops typically) |
| Vehicle | Company truck, pre-assigned | Her own truck |
| Pre-trip inspection | Full DVIR in app, submitted to fleet manager | Simplified self-inspection checklist (her truck, her responsibility -- but HyperQuote requires basic safety confirmation) |
| Loading | Warehouse team loads, Mohammed supervises | Warehouse loads, Fatima verifies. For light loads, she may self-load. |
| Load verification | Full barcode scan, manifest check | Same process -- she must scan/verify before departure |
| Navigation | Truck-safe routing | Same truck-safe routing |
| POD capture | Full POD (photos, signature, quantity confirm) | Same -- identical POD requirements |
| Damage reporting | Same damage workflow | Same -- she reports damage, dispatch handles |
| Communication | In-app messaging with dedicated dispatcher | In-app messaging with dispatch (but lower priority than internal drivers) |
| End of day | Post-trip DVIR, day summary, returns to depot | Job completion. No post-trip DVIR submitted to HyperQuote. No return to depot unless she has returns. |
| GPS tracking | Tracked for entire shift | Tracked only during active job (pickup to delivery completion) |
| HOS/compliance | HyperQuote tracks and enforces | Fatima's own responsibility (HyperQuote may set maximum job duration but does not manage her hours) |
| Uniform | HyperQuote branded | Her own clothing (may be given a HyperQuote vest for brand consistency during delivery) |
| Equipment jobs | Can do Moffett, boom, crane | Cannot -- limited to manual unload and light equipment |

**At the depot for pickup:**

Fatima arrives at the HyperQuote depot. She checks in at the gate -- security verifies her job assignment via the app (or a printed confirmation).

She drives to the loading bay. The warehouse team loads 30 cement bags and 10 PVC pipes onto her flatbed. Fatima verifies the load:
- Scans the pallet QR code (same barcode scanning as Mohammed)
- Counts manually: 30 bags, 10 pipes. Match.
- Takes departure photo of the loaded truck
- Secures the load herself (her truck, her equipment -- she carries her own straps and ropes)

She taps "Ready to Depart."

**During delivery:**

The experience is identical to Mohammed's for the delivery itself:
- Navigation to the site
- Arrival, geofence trigger, stop details
- Site contact call
- Unloading (manual, with customer crew)
- POD capture (photos, signature, quantity)
- Completion

The key operational difference: Fatima does not have a dispatcher watching her every move the way Mohammed does. She is more autonomous. If she encounters an exception, she uses the same exception reporting workflow, but the response from dispatch may be slower (internal drivers get priority dispatch attention).

**After delivery:**

Fatima taps "Job Complete." The app:
1. Records completion time and GPS
2. Submits POD to HyperQuote's system
3. Shows her earnings for this job: EGP 850
4. Returns her to the "Available Jobs" screen
5. Stops GPS tracking

She can immediately accept another job, or go offline.

---

### 2.4 How Fatima Gets Paid

**Payment model for ON_DEMAND drivers:**

1. **Per-job pricing:** Each job has a fixed price shown upfront before acceptance. Pricing factors:
   - Distance (pickup to delivery)
   - Weight/volume of materials
   - Number of stops
   - Time of day (urgency premium for same-day rush)
   - Unloading method (manual vs. equipment -- equipment jobs pay more but Fatima does not qualify)

2. **Payout timing:**
   - After POD is submitted and dispatch validates the delivery (dispatcher reviews photos and signature)
   - Validation typically happens within 1-4 hours of delivery
   - Once validated: payment is credited to Fatima's account

3. **Payout methods (Egypt-specific):**
   - **Mobile wallet** (Vodafone Cash, Orange Money, Etisalat Cash): Instant transfer once validated. Most popular among Egyptian gig workers.
   - **InstaPay**: Bank-to-bank instant transfer within Egypt's national payment infrastructure
   - **Bank transfer**: Standard EGP transfer to her bank account. May take 1-2 business days.
   - **Weekly settlement**: Fatima can choose to accumulate earnings and receive a weekly payout instead of per-job

4. **Earnings screen in the app:**

```
EARNINGS -- March 2026
=======================
This week:     EGP 4,250 (5 jobs)
This month:    EGP 17,800 (21 jobs)
Pending:       EGP 850 (Job #J-4521, awaiting validation)
Available:     EGP 3,400 (ready for withdrawal)

[Withdraw to Vodafone Cash]  [View History]
```

5. **Deductions:**
   - HyperQuote takes a platform commission (percentage of the job price -- the driver sees the net amount)
   - No deductions for fuel, insurance, vehicle maintenance (Fatima's own costs)
   - Tax: Fatima is responsible for her own tax obligations as an independent operator

6. **Rating impact on earnings:**
   - Higher-rated drivers see jobs first (more earning opportunities)
   - Consistently low ratings may lead to account suspension
   - Rating based on: on-time arrival, POD quality, customer feedback, damage rate

---

## Part 3: Complete Exception Scenarios

### Exception 1: Customer Not Available

**Trigger:** Driver arrives at delivery site, no authorized person present to receive.

**Workflow:**
1. Driver taps "Arrived" -- GPS and timestamp recorded
2. Driver calls primary site contact -- no answer
3. Driver calls secondary contact (if available) -- no answer
4. Driver taps "Report Issue" > "No one to receive"
5. App logs call attempts with timestamps
6. **Timer starts: 15-minute mandatory wait** (configurable per company policy)
7. During wait, dispatch is auto-notified. Dispatch attempts to reach the customer through their own channels (office number, account manager, WhatsApp).
8. **After 15 minutes:**
   - **If pre-authorization for unattended delivery exists:** Driver can unload at designated location, take POD photos (no signature -- replaced by timestamped GPS-tagged photos of placement), mark as "Unattended delivery -- pre-authorized." Customer's account in HyperQuote must have an "unattended delivery" flag enabled.
   - **If no pre-authorization:** Driver marks delivery as "Failed -- No Receiver." Materials remain on truck. Dispatch reschedules (same day if route allows, next day otherwise).
9. Driver proceeds to next stop.
10. Cost of failed delivery: wasted driver time, fuel, and route disruption.

**Gaps identified:**
- Who authorizes unattended delivery? Is it per-customer, per-order, or per-site?
- Liability for theft/damage of materials left unattended
- What if the pre-authorized unloading spot is inaccessible?
- Does the 15-minute wait count toward HOS? (Yes, it is on-duty time.)

---

### Exception 2: Site Access Blocked

**Trigger:** Driver cannot physically enter the delivery site (locked gate, construction barrier, road closure, flooding).

**Workflow:**
1. Driver taps "Report Issue" > "Access blocked"
2. Driver takes photo of the obstruction (locked gate, barrier, flooded road)
3. Driver calls site contact: "I'm at your site but the gate is locked / road is blocked."
4. If site contact can resolve (send someone to open gate, provide alternate entrance): driver waits.
5. If not resolvable within a reasonable time (15-20 minutes): driver contacts dispatch.
6. Dispatch contacts customer to arrange resolution or reschedule.
7. If alternate access exists: app should show alternate entry routes (from historical data or customer-provided info).
8. If no resolution: mark as "Failed -- Access blocked." Document with photos. Reschedule.

**Gaps identified:**
- No defined timeout for how long to wait for access resolution
- Historical access issues should trigger a pre-delivery customer confirmation call
- What if alternate access requires a different size vehicle?

---

### Exception 3: Wrong Address

**Trigger:** Driver arrives at the GPS coordinates but the address does not match, or the construction site does not exist at this location.

**Workflow:**
1. Driver taps "Report Issue" > "Wrong address"
2. Driver documents: photo of the location showing it is not the correct site
3. Driver calls site contact: "I'm at [address] but I don't see your site. Can you confirm the correct location?"
4. If correct address obtained: driver enters the new address in the app. App recalculates route. Driver proceeds.
5. If correct address is far from current location: dispatch evaluates whether rerouting is feasible within the route plan.
6. If customer cannot be reached or correct address is unknown: mark as "Failed -- Wrong address." Return materials or proceed to next stop.
7. Dispatch investigates the address discrepancy (data entry error in the order? customer gave wrong address?).

**Gaps identified:**
- Egypt has well-known addressing challenges (many construction sites are on unnamed roads or use landmark-based directions)
- What3words or plus codes should be captured at order entry, not just street addresses
- Who is responsible for address verification before dispatch? Sales? Dispatch? System?
- No process for the driver to "discover" the correct site by calling the customer and getting verbal directions, then pinning the correct GPS location for future deliveries

---

### Exception 4: Damaged Goods Found During Delivery

**Trigger:** Materials are discovered to be damaged when unloaded at the customer site (bent, broken, wet, crushed).

**Workflow:**
1. Driver stops unloading the damaged items immediately.
2. Driver opens Damage Reporting screen (Screen 10).
3. Documents: when discovered, damage type, affected items, severity, photos (minimum 2, recommended 4-6).
4. Customer annotates the delivery note with specific damage descriptions BEFORE signing.
5. Driver and customer both co-sign the annotated delivery note.
6. Dispatch and claims team auto-notified.
7. **Decision tree:**
   - Customer accepts undamaged portion + refuses damaged portion = **Partial delivery POD** (accepted items documented, refused items returned to depot or left on truck)
   - Customer refuses entire delivery = **Full refusal POD** (all items returned, refusal reason documented with customer signature)
   - Customer accepts all items including damaged ones (at a discount) = **Full delivery POD with damage notation** (rare, requires dispatch/sales approval for price adjustment)
8. For refused items: driver loads them back on the truck and returns to depot.
9. HyperQuote initiates the 3-tier inspection process based on damage value:
   - Tier 1 (<2% of order value): remote photo review, resolved in 24 hours
   - Tier 2 (2-10%): HyperQuote field rep visits site within 24-48 hours
   - Tier 3 (>10%): third-party inspector (SGS, Bureau Veritas, GOST Egypt)
10. Resolution: one of 6 options (replacement, partial replacement, credit note, price reduction, full refund, return-and-reorder)

**Legal timeline per Egyptian Commercial Code:**
- Customer must report within 15 days of actual receipt
- Legal action within 60 days of receipt
- Overall claim expiry at 6 months

**Gaps identified:**
- Who determines whether damage happened at the supplier, during loading, in transit, or at the site?
- The driver's pre-departure photos of the loaded truck become critical evidence -- but what if the driver did not take good photos?
- Process for hidden damage (discovered days after delivery) is separate from this driver workflow and handled through the customer portal
- No clear guideline for the driver on whether to re-load refused items or leave them at the site for customer disposal

---

### Exception 5: Partial Delivery (Customer Only Wants Some Items)

**Trigger:** Customer requests only a portion of the materials be delivered now, the rest held or returned.

**Workflow:**
1. Customer tells driver: "We are not ready for the drywall yet. Just deliver the cement today."
2. Driver contacts dispatch: "Customer wants partial delivery. Cement only, not drywall."
3. Dispatch confirms: is this OK operationally? (Are the items loaded so that the cement can be removed without moving the drywall? LIFO loading sequence matters here.)
4. If approved: driver delivers the accepted items. POD captures only the delivered items.
5. Undelivered items marked with reason code: "Customer request -- not ready"
6. Undelivered items remain on truck. They either:
   - Get delivered to another customer on the same route (if another order matches)
   - Return to the depot
   - Get rescheduled for this customer on a future date
7. Partial delivery note generated. Customer signs for what they received.

**Gaps identified:**
- Financially, does a partial delivery trigger a partial invoice? Or is the full invoice held until complete delivery?
- What if the undelivered items were loaded first (underneath)? Driver cannot access the wanted items without unloading the unwanted ones.
- Who pays for the re-delivery trip? Customer (since they requested partial)? Or HyperQuote (cost of doing business)?
- No automated split-order functionality described in the order/invoice system

---

### Exception 6: Weather Delay

**Trigger:** Rain, sandstorm, extreme heat, or other weather conditions make delivery unsafe.

**Workflow:**
1. Driver assesses conditions. For heavy building materials:
   - Rain: makes construction sites muddy (Moffett can get stuck), wet cement bags are ruined, road visibility reduced
   - Sandstorm (khamsin): zero visibility, sand damages exposed materials, driving hazardous
   - Extreme heat (>45C): heat exhaustion risk for driver during manual unloading, tire blowout risk increases
   - Wind: boom/crane operations unsafe above 25-30 km/h wind speed
2. Driver contacts dispatch: "Weather conditions are [description]. I cannot safely [deliver/operate boom/access muddy site]."
3. Dispatch makes the call:
   - **Suspend remaining route**: all affected customers notified of reschedule
   - **Selective delay**: skip affected stops (outdoor sites in rain) but proceed with covered/indoor deliveries
   - **Wait it out**: driver parks safely, waits for conditions to improve (if forecast suggests short duration)
4. Driver marks status as "Weather delay" in the app. Timer tracks the delay duration.
5. All affected customers receive automated notifications.
6. Route is rescheduled for the next available day.

**Gaps identified:**
- No integration with weather data APIs to proactively warn dispatch and reroute
- Who decides if conditions are unsafe -- the driver or dispatch? (Should be the driver for safety, but dispatch may pressure the driver to continue.)
- Egyptian khamsin (sandstorm) season (March-May) needs a specific protocol
- What about materials already on the truck? Cement bags exposed to rain on a flatbed are ruined. Does the driver need to tarp the load? Is tarping equipment provided?
- Heat safety protocol: mandatory water breaks, shade requirements, maximum outdoor work duration in extreme heat

---

### Exception 7: Vehicle Breakdown

**Trigger:** Truck breaks down mid-route (engine failure, flat tire, hydraulic failure, electrical issue).

**Workflow:**
1. Driver safely pulls over to the side of the road.
2. Driver activates hazard lights.
3. Driver sets reflective warning triangles behind the vehicle (Egyptian traffic law requires this).
4. Driver taps "Report Issue" > "Vehicle breakdown" in the app.
5. Driver describes the issue: "Engine overheating / flat tire / hydraulic leak on Moffett / etc."
6. Driver takes photos of the breakdown situation and any visible mechanical issue.
7. **Driver calls dispatch immediately** (phone call, not just in-app message -- this is urgent).
8. Dispatch coordinates:
   - Roadside assistance / tow truck
   - Replacement vehicle (if available and materials must be transferred)
   - Customer notifications for affected remaining stops
   - Rescheduling of undelivered stops
9. If the breakdown is minor and repairable roadside (flat tire with spare): driver fixes it if trained and equipped, documents the repair, and continues the route.
10. If the truck must be towed: driver stays with the vehicle until tow arrives. Materials are either transferred to a replacement truck or returned to the depot on the tow.

**Gaps identified:**
- Does HyperQuote have roadside assistance contracts in place? With whom? (Egyptian market: what services exist?)
- What is the SLA for getting a replacement vehicle to the breakdown location?
- Driver safety while waiting on the side of an Egyptian highway (poor shoulder conditions, traffic)
- What happens to perishable/time-sensitive materials (ready-mix concrete is irrelevant here, but some materials have site schedule dependencies)?
- Insurance process for the breakdown: who covers the tow, the repair, the rescheduling cost?
- The driver's phone battery: if the truck's electrical system is dead, the driver cannot charge the phone. How long will the driver app last on battery with GPS tracking active?

---

### Exception 8: Accident

**Trigger:** Traffic accident involving the delivery truck, whether minor or major.

**Workflow:**
1. **Safety first:** Driver checks for injuries to self and others.
2. **If injuries:** Call Egyptian emergency services immediately (123 for ambulance, 122 for traffic police).
3. **Secure the scene:** Hazard lights, warning triangles, move to safety if possible without leaving the scene.
4. **Call dispatch IMMEDIATELY via phone** (not app -- this is a voice call).
5. **Do NOT admit fault** to any party.
6. **Document the scene:**
   - Photos of all vehicles involved (damage, license plates, positions)
   - Photos of the road conditions, traffic signs, weather
   - Photos of any injuries (if appropriate)
   - Exchange information with other parties (name, license, insurance, phone)
   - Get witness contact information if available
7. **Wait for Egyptian traffic police** -- in Egypt, a police report (mahdar) is required for insurance claims and is typically mandatory for any accident involving commercial vehicles.
8. **In the app:** Once safe, tap "Report Issue" > "Accident/Incident." Fill in the incident report:
   - Location, time, description
   - Other parties involved
   - Injuries (yes/no, description)
   - Vehicle damage (photos)
   - Police report number (when available)
9. **Dispatch handles:**
   - Notifies safety department and management
   - Contacts insurance company
   - Arranges vehicle recovery
   - Reschedules affected deliveries
   - If driver is injured: arranges medical care, ensures social insurance claim is filed

**Gaps identified:**
- Egyptian accident procedures are different from US/EU -- the police report (mahdar) process can take hours
- Is the driver trained on what to say and what NOT to say at an accident scene?
- Does the driver have emergency contact cards in the cab (in Arabic)?
- Who contacts the driver's family in case of serious injury?
- What happens to the materials on the truck? (Potentially spilled/damaged in the accident -- this becomes a separate cargo damage claim)
- Insurance coverage: is HyperQuote's policy comprehensive enough for full cargo value + vehicle + third-party liability?
- Drug/alcohol testing post-accident: Egyptian regulations on this are less formalized than FMCSA, but company policy should define when testing occurs
- Psychological support: is there any support for a driver after a serious accident?

---

### Exception 9: Driver Exceeds HOS Limits Mid-Route

**Context note:** Egypt does not have a direct equivalent of the US FMCSA HOS regulations. Egyptian labour law (Law No. 12 of 2003) sets maximum working hours at 8 hours per day (or 48 hours per week), with provisions for overtime. However, enforcement in the transport sector is uneven. HyperQuote should implement its own driver hours policy for safety, regardless of enforcement gaps.

**Trigger:** The HyperQuote app tracks Mohammed's shift duration. He has been on duty for 10 hours and has 2 stops remaining. The app warns: "Approaching maximum duty hours. 2 hours remaining."

**Workflow:**
1. App sends a warning push notification at configurable thresholds:
   - 2 hours before limit: yellow warning
   - 1 hour before limit: orange warning
   - 30 minutes before limit: red warning
   - At limit: "You have reached maximum duty hours. You cannot accept new stops."
2. The app calculates whether the remaining stops can be completed before the limit.
3. If the remaining stops CANNOT be completed:
   - App notifies dispatch automatically
   - Dispatch evaluates: can the last stop(s) be reassigned to another driver?
   - If yes: stops are reassigned. Mohammed completes what he can and returns to depot.
   - If no: dispatch may authorize overtime (with driver consent and per Egyptian labour law overtime rules -- maximum 3 additional hours per day, compensated at 135% for daytime and 170% for nighttime overtime).
4. If the driver reaches the hard limit:
   - App blocks navigation to next stop
   - Driver must return to depot or park safely
   - Remaining stops rescheduled

**Gaps identified:**
- Egyptian labour law allows overtime (up to 3 hours/day) but requires employee consent and premium pay. The app needs an "Accept Overtime" confirmation flow.
- No ELD integration in Egypt (ELDs are a US/EU concept). The app is the sole hours tracker. What if the driver manipulates it?
- Night driving safety: if overtime pushes the driver into evening hours in Cairo traffic, fatigue risk is real
- What counts as "driving" vs. "on duty not driving" vs. "waiting"? The app's duty status tracking needs clear definitions.
- Weekly cumulative hours tracking: does the app track across the 6-day Egyptian workweek?

---

### Exception 10: Customer Refuses Delivery Entirely

**Trigger:** Customer refuses to accept any materials. Reasons vary: order cancelled too late, wrong materials sent, materials not needed anymore, dispute with HyperQuote.

**Workflow:**
1. Customer tells driver: "We do not want this delivery. Send it back."
2. Driver asks for the reason (important for documentation).
3. Driver taps "Report Issue" > "Customer refuses delivery."
4. **Refusal documentation workflow:**
   - Reason code selection: "Order cancelled," "Wrong materials," "Not needed," "Dispute," "Other"
   - Customer asked to sign a refusal acknowledgment on the driver's device (optional -- customer may refuse to sign)
   - If customer refuses to sign: driver notes "Customer refused to sign refusal document" and takes a photo of the site/customer interaction context
   - Photo of the materials still on the truck (proof they were not delivered)
5. Driver contacts dispatch.
6. Dispatch contacts the customer's account manager / sales team to understand and resolve the underlying issue.
7. Materials remain on the truck. Driver:
   - Returns to depot (if this was the last stop or materials are heavy/perishable)
   - Continues the route and returns materials at end of day (if other stops remain)
8. At the depot, refused materials are logged as returns with the refusal documentation.
9. The order is placed in a disputed/cancelled state. Finance team handles credit/refund.

**Gaps identified:**
- Who pays for the wasted delivery trip? (Contractual terms with the customer should specify cancellation/refusal fees.)
- Does HyperQuote have a restocking fee policy for refused deliveries?
- If the customer claims "wrong materials" but the manifest matches the order, who arbitrates?
- What if the driver arrives and the customer's representative at the site refuses, but the actual buyer (who placed the order) did not authorize the refusal? Site foreman vs. company owner conflict.
- Can a partial refusal become a full refusal mid-unloading? (Customer starts accepting, then decides to refuse everything after seeing a problem.)

---

## Part 4: Comprehensive Gap Analysis

### Category A: App and Technology Gaps

**A1. Arabic/RTL Support Depth**
The app is described as having Arabic language support, but the depth is unclear. Every screen, notification, error message, and PDF delivery note must be fully localized in Arabic with RTL layout. Quick message templates must be in Arabic. Voice guidance must be in Arabic. Barcode scanning UI must work in RTL. This is a significant localization effort that is not detailed anywhere.

**A2. Offline POD Photo Storage Limits**
Each POD requires 1-6 photos. At ~2-3 MB per photo (compressed), a full day of 6-8 stops generates 12-48 photos = 36-144 MB. Over multiple offline days (if connectivity is poor for extended periods), local storage could fill up. There is no defined storage management policy: when are local photos purged after successful sync? What if sync fails repeatedly?

**A3. Signature Validity Under Egyptian Law**
The research references E-SIGN Act and UETA (US laws) for electronic signature validity. Egypt has its own electronic signature law (Law No. 15 of 2004 on Electronic Signature) which establishes the legal framework. The app's signature capture must comply with Egyptian law, not US law. Has this been verified?

**A4. Phone as Single Point of Failure**
The driver's entire workflow depends on a single smartphone. If the phone breaks, gets stolen, runs out of battery, or overheats (common in Egyptian summer -- phones can shut down at 45C+), the driver is completely stranded with no access to route, customer contacts, or POD tools. What is the fallback? Paper forms? A backup device? Calling dispatch for verbal instructions?

**A5. PowerSync Conflict Resolution for POD**
If a driver captures a POD while offline and dispatch simultaneously marks the delivery as "cancelled" (because the customer called to cancel), what happens when the data syncs? PowerSync handles conflicts, but the business logic for this specific scenario is not defined. Does the POD win? Does the cancellation win?

**A6. Dark Mode for Daytime Outdoor Use**
The research mentions dark mode as a feature, but building materials delivery is primarily daytime outdoor work. Dark mode is unreadable in direct sunlight. The app needs a HIGH CONTRAST / OUTDOOR mode with maximum brightness and high-contrast colors, not just a dark theme.

**A7. Capacitor Background GPS Battery on Older Android Devices**
The Transistorsoft plugin is optimized for battery life, but Egyptian drivers may use lower-end Android devices with smaller batteries. A full 10-hour shift of background GPS tracking could drain the battery. Has real-device testing been done? Is an in-cab charger assumed?

**A8. Map Tile Coverage for Egyptian Construction Zones**
PMTiles for offline maps are mentioned, but construction zones in Egypt's new cities (New Administrative Capital, New Alamein, etc.) are rapidly changing. Roads appear and disappear. OpenStreetMap coverage of these areas may be incomplete or outdated. What is the update cycle for offline map tiles?

---

### Category B: Operational and Process Gaps

**B1. No Defined Driver Training on the App**
Onboarding mentions "app training session" but there is no structured curriculum. How long is the training? Is there a test/certification? What if the driver cannot use a smartphone proficiently (common among older Egyptian truck drivers)? Is there a simplified mode for less tech-savvy drivers?

**B2. Drop-Ship Driver Integration Missing**
At launch, HyperQuote uses drop-ship (supplier's truck delivers directly). This means the delivery driver is NOT a HyperQuote driver -- they are the supplier's driver. How does POD work? Does the supplier's driver use the HyperQuote app? Do they use WhatsApp and the customer takes photos? The entire driver walkthrough assumes HyperQuote-controlled drivers, but launch operations may involve zero HyperQuote drivers.

**B3. No Process for Multi-Order Single-Stop**
What if two separate orders are being delivered to the same construction site? Does the driver capture one POD or two? Does the customer sign twice? Can they accept one order and refuse another? The app's stop-based workflow needs to handle multiple orders per stop.

**B4. Loading Sequence Conflicts**
The LIFO loading principle is mentioned (last delivery loaded first). But what happens when:
- A stop is skipped (like Stop #2 in Mohammed's day) and the underlying items need to be accessed?
- The customer requests partial delivery and the wanted items are underneath the unwanted items?
- The truck has to detour to an unplanned stop mid-route?
There is no process for re-sequencing a partially loaded truck.

**B5. Return-to-Depot Routing**
The app handles outbound routing (depot to stops) but there is no mention of return-to-depot optimization. After the last stop, does the driver get navigation back to the depot? What if the driver has a return-pass stop (like Mohammed's return to Stop #2)?

**B6. No Cash-on-Delivery (COD) Process**
Egyptian B2B transactions for smaller orders may involve cash or check on delivery. The research says "no online payments" and orders are via wire/check/LC, but for smaller ad-hoc orders, COD is common in Egypt. There is no driver workflow for collecting payment, issuing receipts, or handling cash.

**B7. Fuel Management**
Mohammed fills up at the depot fuel pump, but there is no process for:
- Fuel receipts during the route (if the depot pump is unavailable or the driver runs low)
- Fuel card management
- Fuel theft prevention (a significant concern for Egyptian fleet operators)
- Fuel expense reporting for external drivers

**B8. Night Delivery Operations**
The walkthrough assumes a 5:30 AM - 3:30 PM schedule, but some construction sites operate at night (cooler temperatures for concrete pours, less traffic for heavy deliveries in Cairo). Is the app and workflow designed for night operations? Dark mode matters here. So do safety considerations (visibility, site lighting, driver fatigue).

**B9. Cross-City Delivery Logistics**
Cairo is a megacity with extreme traffic. A route crossing from 6th October City to Heliopolis can take 2+ hours in traffic. The dispatch optimization needs to account for Cairo-specific traffic patterns (Ring Road bottlenecks, downtown avoidance, bridge construction). Is the routing engine calibrated for Egyptian traffic realities?

**B10. Prayer Time Considerations**
In Egypt, prayer times (salah) affect operations. Many construction sites pause for prayer, and drivers will need prayer breaks. The app should account for prayer times in route scheduling (especially the midday Dhuhr prayer). This is not mentioned anywhere in the research.

---

### Category C: Legal and Compliance Gaps

**C1. Egyptian Labour Law vs. Driver Classification**
Egyptian Labour Law No. 12 of 2003 has strict rules about employee classification. ON_DEMAND drivers classified as independent contractors must truly be independent (own schedule, own equipment, no exclusivity). If HyperQuote controls too much of their workflow (requiring the HyperQuote app, specific POD procedures, branded vests), they may be reclassified as employees under Egyptian law, triggering social insurance obligations, severance, and benefits.

**C2. Driver Social Insurance**
Internal drivers must be registered for social insurance (Law No. 148 of 2019). HyperQuote must contribute employer's share. This is mentioned briefly in onboarding but the ongoing compliance tracking (annual salary updates, contribution calculations) is not addressed.

**C3. Commercial Vehicle Licensing in Egypt**
Egyptian commercial vehicle licensing requires a "commercial vehicle license" (rukhsa tigariyya) that is separate from the driver's personal license. The vehicle must be registered for commercial use. This is not mentioned in the onboarding or vehicle verification process.

**C4. Egyptian Traffic Law Compliance**
The research extensively covers FMCSA/DOT regulations (US law) but barely addresses Egyptian traffic law. Egyptian regulations differ significantly:
- No ELD requirement in Egypt
- Different HOS rules (governed by Labour Law, not transport-specific regulation)
- Different cargo securement standards (less codified than FMCSA 49 CFR Part 393)
- Different vehicle inspection requirements
- Different accident reporting procedures
The entire compliance framework needs to be rebuilt for Egyptian law.

**C5. Data Privacy -- Egyptian Law**
Egypt enacted a Data Protection Law (Law No. 151 of 2020) that governs personal data processing. GPS tracking of drivers, photo capture, biometric data (fingerprint login) all fall under this law. HyperQuote needs:
- Explicit consent from drivers for GPS tracking and data processing
- A privacy notice in Arabic
- Data retention policies
- A data protection officer or compliance mechanism
This is not addressed in the driver app design.

**C6. Insurance for External Drivers' Cargo**
When Fatima (ON_DEMAND) carries HyperQuote's cargo on her own truck, who insures the cargo? Her personal vehicle insurance likely does not cover commercial cargo belonging to a third party. HyperQuote either needs to require cargo insurance from external drivers or carry a blanket cargo policy. This is not defined.

---

### Category D: Business Logic Gaps

**D1. Dispatcher Validation of POD**
The research says "dispatcher validates POD, then marks delivered." But the validation criteria are not defined. What is the dispatcher checking? Photo quality? Signature presence? GPS coordinates matching the delivery address? Quantity match? This needs to be a checklist, not subjective judgment.

**D2. Driver Rating System for External Drivers**
External drivers are rated, and ratings affect job visibility. But what metrics are used? On-time arrival? POD quality? Customer feedback? Damage rate? How are ratings calculated? What is the threshold for suspension? Is there an appeal process?

**D3. Job Pricing for ON_DEMAND Drivers**
Job prices are shown upfront, but how are they calculated? Is there a formula (base rate + distance rate + weight rate + urgency multiplier)? Who sets the prices? Can the driver negotiate? What about surge pricing during peak demand?

**D4. Multi-Stop Jobs for External Drivers**
Mohammed (internal) gets multi-stop routes. Can Fatima (external) also get multi-stop jobs? Job #J-4523 in the example has 2 stops. How does this work operationally? She would need to manage stop sequence, partial loads, and returns -- all the same complexity as an internal driver but with less support.

**D5. No Escalation Path for Driver-Dispatch Disagreements**
What happens when Mohammed disagrees with dispatch? Example: dispatch wants him to take on a 7th stop but Mohammed knows the road to that site is flooded. Or dispatch wants him to operate the boom near power lines. The driver should have the right to refuse unsafe assignments, with a documented escalation path. This is not defined.

**D6. Vehicle Maintenance Trigger from Driver Reports**
The post-trip DVIR feeds into a maintenance queue, but the workflow from "defect reported" to "defect repaired" to "truck cleared for use" is not described. Who reviews DVIRs? What is the SLA for repairs? Can a truck with an open minor defect be assigned the next day?

**D7. Customer Notification Preferences**
Automated customer notifications (ETA, arrival, delivery complete) are mentioned but the channel is not defined. SMS? WhatsApp? Email? Push notification on the customer portal? In Egypt, WhatsApp is dominant -- but does the customer get to choose their preferred channel? Is WhatsApp Business API integrated?

**D8. HyperQuote-Branded Delivery Note Generation**
Every delivery must have a HyperQuote-branded delivery note. But when does this get generated? At dispatch (pre-printed)? At POD capture (generated by the driver app)? Is it a PDF? Can the driver print it on-site (portable Bluetooth printer)? Many Egyptian construction sites expect a PAPER delivery note, not a digital one.

**D9. No Re-Attempt Policy**
When a delivery fails (no receiver, access blocked, etc.), it gets rescheduled. But how many re-attempts are allowed before the order is cancelled or escalated? After 2 failed attempts? 3? Is there a fee after the first failed attempt?

**D10. Contracted (RECURRING) Driver Workflow Missing**
The walkthrough covers INTERNAL and ON_DEMAND drivers in detail but the CONTRACTED driver type is mentioned only briefly. Contracted drivers are a significant part of the hybrid fleet model (10-20% of deliveries). Their workflow needs equal detail: how do they receive jobs, use their own ELD/app or HyperQuote's, capture POD, communicate with dispatch, get paid?

---

### Category E: Edge Cases Not Covered

**E1.** Driver delivers to the wrong site (customer at the right address, but the driver went to a different address).
**E2.** Customer claims they never received the delivery despite the driver having a POD with signature -- disputed delivery.
**E3.** Materials are stolen from the truck while the driver is unloading at a construction site (theft from the vehicle).
**E4.** Driver's phone is stolen at a construction site, with the app containing all delivery data and customer contacts.
**E5.** Two deliveries arrive at the same construction site at the same time (HyperQuote and another supplier) -- site congestion.
**E6.** Customer asks the driver to deliver to a DIFFERENT address than what is on the order (redirect request on-site).
**E7.** Government checkpoint/inspection stops the truck mid-route (common on Egyptian highways -- traffic police or military checkpoint).
**E8.** Material spillage during transit (unsecured load falls off the truck on a public road).
**E9.** Currency of job pricing: EGP is volatile. Do ON_DEMAND job prices adjust with fuel prices? Is there a fuel surcharge mechanism?
**E10.** Ramadan operations: shorter working hours, driver fasting (no food/water during daylight -- affects stamina for physical unloading), earlier delivery windows, site schedule changes.
**E11.** Public holiday delivery: Egyptian national holidays affect site access. Is there a holiday calendar integrated into dispatch?
**E12.** Driver onboarding for illiterate or semi-literate drivers: some Egyptian truck drivers have limited reading ability. Can the app use voice prompts and icon-based navigation instead of text?

---

### Summary of Critical Gaps (Must-Fix Before Launch)

| # | Gap | Severity | Reason |
|---|-----|----------|--------|
| 1 | Drop-ship driver integration (B2) | **Critical** | Launch uses drop-ship -- no HyperQuote drivers at all. Who captures POD? |
| 2 | Egyptian legal framework instead of US (C4) | **Critical** | Entire compliance model is based on FMCSA/US law, not Egyptian law |
| 3 | Electronic signature under Egyptian law (A3) | **High** | POD legal validity depends on this |
| 4 | Arabic/RTL full localization (A1) | **High** | Egyptian drivers need Arabic-first app |
| 5 | Cash-on-delivery process (B6) | **High** | Common in Egyptian B2B for smaller orders |
| 6 | Data privacy compliance (C5) | **High** | Egyptian Data Protection Law applies to GPS/biometric data |
| 7 | External driver classification risk (C1) | **High** | Misclassification liability under Egyptian labour law |
| 8 | Phone as single point of failure (A4) | **Medium** | No fallback for device failure mid-route |
| 9 | Prayer time scheduling (B10) | **Medium** | Operationally important in Egypt |
| 10 | HyperQuote-branded paper delivery notes (D8) | **Medium** | Egyptian construction sites expect paper |
| 11 | Dispatcher POD validation criteria (D1) | **Medium** | Unstructured validation leads to inconsistency |
| 12 | Contracted driver workflow (D10) | **Medium** | 10-20% of delivery volume has no defined process |

---

*End of document. This walkthrough should be revisited after each major design decision to verify that identified gaps have been addressed.*
