# Phase 25: Driver Route + Delivery + POD

## Goal
Drivers can follow their route, verify loading, execute deliveries, and capture proof of delivery -- all working offline.

## Dependencies
- Phase 24 (Driver App Scaffold + Auth + Shift) must be complete: Vite + Capacitor app builds, OTP/PIN/biometric auth works, shift start with DVIR works, PowerSync + SQLite initialized.

## Requirements

- **DRV-03**: Route overview: map with numbered pins + list view, color-coded by status
- **DRV-04**: Stop detail: customer info, order items, unloading method, site access instructions
- **DRV-05**: Navigation: deep-link to Sygic/HERE (truck-safe routing, NOT Google Maps)
- **DRV-06**: Loading verification: barcode scan per item, weight check, photo of loaded truck
- **DRV-07**: Delivery execution: geofence auto-detect arrival, per-line item confirmation, unloading timer
- **DRV-08**: POD capture: photos + digital signature + GPS location + quantity confirmation per item

## Success Criteria
1. Route overview shows map with numbered pins and list view, color-coded by delivery status
2. Navigation deep-links to Sygic/HERE for truck-safe routing (NOT Google Maps)
3. Loading verification scans barcodes per item, checks weight, and captures photo of loaded truck
4. Delivery execution auto-detects arrival via geofence, confirms per-line items, and runs unloading timer
5. POD captures photos + digital signature + GPS location + quantity confirmation per item

## What to Build
From GSD.md: Route overview, stop detail, navigation (deep-link to Sygic/HERE), loading verification, arrival (geofence), delivery execution (per-line items), POD capture (photos + signature + GPS), skip-stop flow.

## Spec References

### Screen 4: Route Overview (FRONTEND.md)

**Layout:** Two views, toggleable:

**Map view (default):**
- MapLibre GL map filling upper 60% of screen.
- Numbered pins at each stop location. Color-coded: Gray = pending, Green = completed, Blue = current/next, Red = failed/skipped.
- Route path highlighted on map in blue.
- Traffic overlay (real-time when online, hidden when offline).
- Current location shown as blue dot.

**List view (swipeable bottom sheet, 40% of screen by default, expandable to full):**
Each stop row: 56dp minimum height. Stop number (Geist Mono, large), customer name (Inter 600), address (Inter 400), ETA (Geist Mono 500), materials summary (Inter 400), unloading method icon.

**Status per stop:** Pending / En Route / Arrived / Completed / Failed / Skipped. Color-coded pins and text.

**Route change acknowledgment:** If dispatch modifies the route while driver is en route, a push notification fires. The app shows an overlay. Driver must acknowledge before proceeding.

**Interactions:**
- Tap [Navigate] on any stop -> launches navigation (Screen 6).
- Tap stop row -> opens Stop Detail (Screen 5).
- Drag-and-drop stop reordering: long-press + drag. Requires dispatch approval.
- **Skip stop:** Each stop card has "Skip to Next" button. On confirm: stop moves to end of route list. Route recalculates ETAs. Dispatch notified automatically. Skip reasons (optional).

**Offline behavior:** Map uses pre-cached PMTiles. Stop data from local SQLite. Traffic overlay hidden.
**RTL/Arabic:** Map labels in Arabic (MapTiler Arabic labels). List view mirrors.

### Screen 5: Stop Detail (FRONTEND.md)

**Trigger:** Geofence auto-expand at ~500m from delivery site. Or manual tap from Route Overview.

**Data displayed:**
- Customer name and company (Inter 600).
- Site contact name and phone (masked). [Call] triggers phone dialer via Capacitor.
- Full address with plus code / what3words pin if available.
- Delivery window with on-time/late indicator (semantic green or yellow/red).
- Access instructions: gate code, entry point, security procedures.
- PPE acknowledgment checkbox: must be checked before [Arrived] becomes active.
- Unloading method: Moffett / Boom / Manual / Site Equipment with specific placement instructions.
- Previous delivery notes from historical visits.
- Previous site photos.
- Items manifest: itemized with quantities and weights in Geist Mono.

**Cairo truck ban indicator:**
- If delivery is within Greater Cairo AND vehicle is 5+ tons AND current time is 6:00 AM - midnight: Red banner.
- If correctly scheduled in midnight-6AM window: muted gray indicator.

**Interactions:**
- [Navigate]: launches Sygic/HERE (Screen 6).
- [Call Site Contact]: masked number.
- [Arrived]: records arrival timestamp + GPS.
- [Report Issue]: opens Exception Reporting (Screen 11).

**PPE acknowledgment:** Must be checked before [Arrived] button is enabled. Unchecked = [Arrived] hidden.

### Screen 6: Navigation (FRONTEND.md)

The driver app does NOT include built-in turn-by-turn navigation. It launches an external truck-safe navigation app.

**Launch flow:**
1. Driver taps [Navigate].
2. App checks for installed navigation apps (Sygic Truck Navigation preferred, HERE WeGo as fallback).
3. Launches the selected app with destination coordinates via deep link / intent.
4. If neither is installed: prompt to download Sygic.

**What the driver app shows during navigation:**
- Minimal overlay bar at top (persistent notification on Android).
- Bar content: "Navigating to [customer] | ETA [time]"
- [Call Customer] button accessible.
- Background GPS tracking continues independent of the navigation app.

**Truck-safe routing features (via Sygic/HERE):**
- Weight-restricted bridges avoided.
- Low clearance underpasses avoided.
- Truck-prohibited roads avoided.
- Cairo Ring Road truck ban enforcement.
- Voice guidance in Arabic.

**Traffic scenario handling:**
- If ETA jumps beyond delivery window, driver app detects and alerts dispatch automatically.

### Screen 7: Loading Verification (FRONTEND.md)

**Trigger:** At the warehouse before departure.

**Layout:** Load plan with loading sequence (last delivery loaded first, first delivery on top).

**Barcode scan mode:**
- Tap [Scan] per order or per item.
- Camera activates via `@capacitor-mlkit/barcode-scanning`.
- Green checkmark for match. Red alert for mismatch.
- For items without barcodes: switch to manual check mode.

**Shortage handling:**
- If scanned count < manifest count: "SHORT {N}" in semantic error color.
- [Report Shortage] button opens quick form.

**Photos:**
- "Loaded truck" photo: wide shot. Required.
- "Cargo securement" photo: showing straps, chains. Required.
- Auto-tagged with GPS + timestamp.

**Weight verification:**
- Manual entry from scale ticket reading (Geist Mono input, large).
- App compares to calculated manifest weight. Tolerance: +/- 2%.
- If overweight beyond truck GVWR: red alert, block departure.

**Sign-off:**
- "I confirm this load is correct and secured" checkbox.
- Digital signature: full-screen canvas, finger-optimized.
- [Ready to Depart]: enabled only after all items checked + photos taken + weight entered + signature captured.

### Screen 8: Arrival (FRONTEND.md)

**Geofence auto-detect:**
- `@transistorsoft/capacitor-background-geolocation` geofence fires at 150-300m radius.
- App vibrates + notification.
- If driver does not tap within 2 minutes while within geofence: automatic arrival recorded.

**On arrival:**
- Timestamp recorded (Geist Mono).
- GPS coordinates captured.
- Dispatch notified.
- Customer notified (if configured): automated WhatsApp/SMS.

**Contact customer before arrival:**
- At ~500m, app shows prominent [Call Site Contact] button.

### Screen 9: Delivery Execution (FRONTEND.md)

**Trigger:** After arrival confirmation.

**Line-item confirmation:**
- Tap item row to confirm full quantity delivered. Green checkmark.
- Tap "Adjust quantity" for partial delivery. Geist Mono number input.
- Tap "Flag damage" per item -> damage checkbox + photo capture.

**Unloading timer:** Starts when first item is confirmed. Tracks total unloading duration. Geist Mono display.

**Partial delivery:**
- Reason code required per item: "Damaged at warehouse", "Not loaded", "Customer request", "Other."
- Undelivered items tracked for follow-up.

**Completion:** [Mark delivery complete -->] enabled only when all items have a status.

### Screen 10: POD Capture (FRONTEND.md)

**Photos:**
- Minimum 1 required. Up to 6.
- Auto-tagged with GPS + timestamp via Capacitor Camera.
- Compressed on-device: 1920px max width, JPEG 0.7 quality.

**Signature:**
- Full-screen signature pad. Large canvas optimized for finger input.
- "Print name" field.
- "Title/role" dropdown: Foreman, PM, Site Engineer, Owner, Superintendent, Other.
- Legally valid under Egyptian E-Signature Law 15/2004.

**Quantity confirmation:**
- Pre-filled from delivery execution (Screen 9).
- Shows shortages.

**Condition statement:**
- Radio group: "Good condition" / "Damage noted."

**Swipe to complete:**
- Full-screen-width swipe gesture. Must swipe minimum 80% of width.
- On complete: POD stored locally in SQLite immediately. Queued for upload.

**HyperQuote-branded delivery note:**
- App generates delivery note PDF: logo, order number, date, address, itemized materials, driver signature, receiver signature, GPS, photo thumbnails.
- NO prices on delivery note.

**Automated notifications on POD:**
- Dispatch: delivery completion notification.
- Customer: WhatsApp/SMS with portal link.
- Finance: triggers invoice generation workflow.

## Business Rules

**Loading to Delivery Flow (from RESEARCH.md):**
1. Warehouse picks order (barcode scan verification)
2. Items staged at dock (tally check)
3. Loaded onto truck (weight verification via onboard + platform scale)
4. Photo documentation of secured load
5. Driver + warehouse sign-off -> status: PREPARING
6. Driver departs -> GPS detects movement -> status: IN_TRANSIT
7. Fleet app tracks on color-coded map (Yellow=loading, Green=transit, Blue=at site, Red=problem)
8. Geofence detects arrival -> driver checks in -> status: AT_SITE
9. Unloading (Moffett/crane/manual, timer running)
10. POD captured (photos + signature + quantity confirmation)
11. Driver submits POD -> syncs to fleet app
12. Dispatcher validates POD -> marks DELIVERED -> triggers invoice generation

**GPS Tracking:** Adaptive intervals: 5s during active delivery, 15s en route, 30s idle. Motion-activated (accelerometer-based).

**Geofencing:** 150-300m radius for construction sites. Auto-detect arrival/departure.

**Navigation:** Sygic/HERE for truck-safe routing. NOT Google Maps (lacks truck profiles). Weight-restricted bridges avoided, low clearance underpasses avoided, truck-prohibited roads avoided.

**Cairo Truck Ban:** Heavy trucks (5+ tons) BANNED from Cairo Ring Road 6:00 AM to midnight. Night delivery window: midnight-6AM. Auto-block scheduling. Night delivery safety: high-vis vests, adequate site lighting, max 6-hour night shift.

**Drop-Ship POD (Dual Confirmation):**
- Supplier driver photographs signed HyperQuote delivery note -> sends via WhatsApp within 4 hours
- Customer confirms receipt via WhatsApp/portal
- Invoice triggers on FIRST confirmation
- Auto-confirm at 72 hours if dispatched but no confirmation or dispute
- Dispute window: 72 hours from dispatch

**Masked Phone Numbers:** Customer never sees driver's personal number. Call routes through backend masking service.

**Paper Backup:** Every truck carries pre-printed HyperQuote-branded delivery notes in triplicate. Used when device fails.

**Device Failure Escalation:**
- 5 minutes "dark": yellow alert on dispatch dashboard.
- 15 minutes "dark": orange alert, dispatch calls driver.
- 30 minutes "dark": red alert, escalate to operations manager.

## Non-Negotiable Rules

1. **Vite + React SPA, NOT TanStack Start.** Driver app uses Capacitor, NOT TanStack Start.
2. **Geist Mono for ALL numbers.** Quantities, weights, distances, times, IDs, ETAs.
3. **ClientOnly for maps.** MapLibre GL must be wrapped in ClientOnly for SSR compatibility.
4. **Motion v12, NOT framer-motion.** Import from `motion/react`.
5. **React Aria Components, NOT shadcn.** All interactive elements via react-aria-components.
6. **Bun, NOT npm/yarn/pnpm.** Use `bun add`, `bun run`.
7. **Three colors only.** White, Black (#0F172A), Blue (#2563EB). Semantic status colors for data only.
8. **Arabic-Indic numerals** in Arabic context. No exceptions.
9. **All units translated to Arabic** in Arabic context: kg -> كجم, ton -> طن, m2 -> م2.

## Known Risks & Gotchas

1. **MapLibre v5 breaking changes:** New `canvasContextAttributes`, `on()` returns Subscription. Update at this phase.
2. **Capacitor BG Geolocation v9:** Requires Capacitor 8. License key regeneration may be needed. $399 Starter license.
3. **PMTiles for offline:** Cairo metro area ~200-400MB vector tiles pre-cached. Storage management needed.
4. **Barcode scanning:** `@capacitor-mlkit/barcode-scanning` for QR/barcode. Some items lack barcodes -- manual check mode needed.
5. **Photo compression:** 1920px max, JPEG 0.7 quality. Approx 1-2MB per photo. Upload queue must handle poor connectivity.
6. **PowerSync sync conflicts:** Driver is authority for delivery status, dispatcher for routes.
7. **Background GPS:** Requires explicit user consent (Egyptian Data Protection Law 151/2020). Penalties up to EGP 5M for violations.

## Tips

- Driver app is ultra-simple: Uber driver simplicity. Zero cognitive load.
- Giant buttons: 56-64dp minimum touch targets. Primary actions in bottom 40% of screen.
- Glove-friendly: large touch targets, no precision taps.
- One-handed operation: all critical actions reachable with one thumb.
- Everything must work offline -- queue mutations in PowerSync/SQLite.
- Auto dark mode for night shifts (Cairo truck ban delivery window: midnight-6AM).
- Base font 16px for outdoor readability. Primary text 18-20sp minimum. All text 7:1 contrast (WCAG AAA for dirty screens/sunlight).
- Photo evidence at every stage: loading, delivery, exceptions.
