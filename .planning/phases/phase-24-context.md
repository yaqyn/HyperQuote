# Phase 24: Driver App Scaffold + Auth + Shift

## Goal
Driver app builds natively for iOS and Android, authenticates via phone OTP + PIN + biometric, and captures pre-trip vehicle inspection.

## Dependencies
- Phase 3 (Shared Packages) must be complete — @hyperquote/ui, @hyperquote/auth, @hyperquote/i18n
- Phase 14 (Database tables) must be complete — drivers, vehicles, driver_shifts, vehicle_inspections
- Phase 2 (Auth) must be complete

## Requirements

- **DRV-01**: Vite + Capacitor native setup (NOT TanStack Start), login (phone OTP -> PIN -> biometric)
  - External driver registration flow: personal info, national ID photos (front + back), selfie, license photos, vehicle info (5 photos), insurance, bank/payment info, terms acceptance (contractor agreement, delivery standards, safety, GPS consent), verification 24-72h with push notification on approval
- **DRV-02**: Shift start: vehicle selection, pre-trip DVIR inspection (10-point checklist with photos), odometer, GPS consent
- **DRV-12**: Offline-first: PowerSync + SQLite, full delivery flow without internet, background sync, photo queue

## Success Criteria
1. Vite + Capacitor app builds and runs on both iOS and Android (NOT TanStack Start)
2. Login completes phone OTP -> 6-digit PIN -> biometric enrollment flow
3. Shift start captures vehicle selection, 10-point DVIR checklist with photos, odometer, GPS consent
4. PowerSync + SQLite is initialized and syncs driver-relevant tables from Supabase

## What to Build
- Vite + React SPA (NOT TanStack Start)
- Capacitor 8 native setup (iOS + Android)
- Login: phone OTP -> 6-digit PIN -> biometric enrollment
- Shift start: vehicle selection, pre-trip inspection (10-point checklist with photos), odometer, signature
- Home dashboard: today's stats, first stop preview, vehicle info
- GPS consent capture (Data Protection Law 151/2020)
- PowerSync + SQLite initialization

## Spec References

### FRONTEND.md — APP 5: DRIVER APP (Screens 1-3)

#### Architecture

- **Framework:** Vite + React SPA (NOT TanStack Start -- server functions do not work in Capacitor WebViews)
- **Native wrapper:** Capacitor 8
- **Deploy:** App Store (iOS) + Play Store (Android). Web fallback at `driver.hyperquote.net` as PWA.
- **Offline sync:** PowerSync (Capacitor SDK) + Supabase. Local SQLite for instant reads/writes. Upload queue with retry.
- **GPS:** `@transistorsoft/capacitor-background-geolocation` v9.0.2. Adaptive: 5s active, 15s en route, 30s idle. $399 license.
- **Camera:** `@capacitor-mlkit/barcode-scanning` for barcode/QR. Capacitor Camera plugin for photos.
- **Auth:** Supabase auth with biometric via `@capgo/capacitor-native-biometric`. Session persists 12 hours.
- **Maps:** MapLibre GL + react-map-gl + PMTiles for offline tiles. Cairo: ~200-400MB vector tiles.
- **Navigation:** External launch to Sygic or HERE (NOT Google Maps).
- **i18n:** react-i18next. Arabic primary (RTL). English secondary.
- **State:** Zustand (UI) + PowerSync (data) + TanStack Query (when online).

#### UI Vision (Non-Negotiable)

- **Ultra-simple.** Uber driver simplicity. Zero cognitive load.
- **Big cards.** One delivery at a time.
- **Giant buttons:** 56-64dp minimum touch targets. Primary actions in bottom 40%.
- **Swipe to complete:** full screen width gesture for delivery completion.
- **Glove-friendly.** Large touch targets, no precision taps.
- **One-handed operation.**
- **Auto dark mode:** activates during night shifts (6PM-6AM default). Manual toggle available.
- **Three colors:** White, Black, Blue (driver app uses blue unlike CEO app).
- **Semantic status:** Green, Yellow, Red, Blue-gray.

#### Typography Rules

| Font | Usage |
|------|-------|
| Inter 600 | Screen titles, customer names, primary data |
| Inter 500 | Button labels, section headers |
| Inter 400 | Body text, instructions |
| Geist Mono 500 | Quantities, weights, distances, times, IDs |
| Geist Mono 400 | Timestamps, secondary numeric data |
| IBM Plex Sans Arabic | All Arabic text |

Base: 16px (larger than other apps for outdoor readability). Primary text: 18-20sp. Quantity input: 24sp bold. Confirmed data: 32sp bold. 7:1 contrast (WCAG AAA for dirty screens/sunlight).

#### Screen 1: Login

**First-time login:**
- Phone number input with Egyptian +20 prefix.
- OTP via WhatsApp primary, SMS fallback (30s), voice fallback (60s).
- 6-digit OTP with auto-advance.
- Biometric enrollment prompt: "Enable fingerprint/face login?" [Enable] / [Skip].

**Subsequent logins:**
- Biometric prompt (one tap).
- If fails (dirty fingers, gloves): 6-digit PIN fallback.
- If PIN fails 3x: OTP fallback.

**Session:** 12-hour JWT. No re-auth during shift.

**External driver registration:**
- Personal info, national ID photos (front + back), selfie, license photos, vehicle info (5 photos), insurance, bank/payment info.
- Terms acceptance: contractor agreement, delivery standards, safety, GPS consent.
- Verification: 24-72 hours. Push notification on approval.

**Layout:** Logo centered top. Phone input 56dp. OTP 6 boxes 48dp each. PIN custom keypad 56dp buttons.

**Offline:** Login requires network. "No connection" with retry.

#### Screen 2: Shift Start

**Pre-shift device health check (automatic):**
- Battery: warn if <50%, continue enabled.
- GPS: block shift start if unavailable.
- App version: force update if outdated.
- Camera: prompt to enable if denied.

**Vehicle selection:**
- Pre-assigned vehicle shown in large card.
- [Confirm] (56dp, full width, blue).
- [Change Vehicle] secondary -> dropdown.
- External drivers: skip (own vehicle).

**Pre-trip inspection (10-item DVIR -- internal policy):**

Each item: **Pass / Fail / N/A** toggle with 56dp buttons (green/red/gray).

1. Tires (tread, inflation, damage)
2. Lights (headlights, taillights, turn signals, reflective tape)
3. Mirrors (both sides, clean, adjusted)
4. Brakes (pedal feel, parking brake)
5. Fluid levels (oil, coolant, visible leaks)
6. Horn and wipers
7. Fire extinguisher (present and charged)
8. Load securement equipment (straps, chains, edge protectors)
9. Cab condition (seatbelt, A/C, gauges)
10. Moffett / specialized equipment (if applicable)

**For each item:**
- Camera button on Fail -> photo required.
- Severity on Fail: Minor (can operate) / Major (cannot leave).
- Notes field (optional).

**Major defect:** Vehicle flagged out of service. Dispatch notified. Driver prompted to select different vehicle.

**Odometer entry:** Large numeric input (React Aria NumberField). Geist Mono, 48dp. Photo of odometer.

**Sign-off:** Confirmation checkbox + digital signature canvas + GPS-tagged timestamp. Auto-submitted to fleet manager + maintenance queue.

**Previous day's post-trip inspection visible** for reference at the top of the screen (collapsible). Open defects highlighted in red.

**External driver variation:** Simplified 5-item self-inspection. No odometer.

**Layout:** Single scrollable screen. Progress: "4 of 10 checked."

**Offline:** Full inspection works offline.

#### Screen 3: Home Dashboard

**Layout:** Single card design. One delivery at a time.

```
TODAY'S ROUTE
6 stops | ~185 km | Est. finish: 2:45 PM
Total weight: 18,400 kg

First stop: Al-Nour Construction
  6th October City | ETA 7:15 AM
  Cement + Rebar | Moffett unload

Special notes from dispatch:
  "Stop #3 -- new site, call foreman 15 min before."

[Start Route]                        (56dp, full-width, blue)

[View Full Route]  [Messages (2)]  [Contact Dispatch]
```

**Data:** Total stops, distance, finish time, weight vs capacity (all Geist Mono). First stop preview. Dispatch notes. Unread messages badge. Vehicle info strip.

**Status indicator:** Driver status in a small badge: "On Duty -- Not Driving" (auto-updates based on motion detection).

**Offline:** All route data synced to local SQLite via PowerSync. Fully functional offline.

### BACKEND.md — Server Functions (Driver -- relevant to Phase 24)

| Function | Method | Input | Output | Auth | Side Effects |
|---|---|---|---|---|---|
| `getDriverDashboard` | GET | `{}` | `{ activeShipment?, todayStops, completedToday, nextPrayerTime }` | driver | none |
| `submitDVIR` | POST | `{ vehicleId, inspectionType, items[], odometerReading, signature }` | `{ inspectionId }` | driver | Creates inspection |
| `startShift` | POST | `{ vehicleId, inspectionId }` | `{ shiftId }` | driver | Opens shift |
| `updateDriverLocation` | POST | `{ lat, lng, heading?, speed? }` | `{ success }` | driver | Upsert + Realtime broadcast |
| `updateDriverAvailability` | POST | `{ available, reason?, until? }` | `{ success }` | driver | Notify dispatch |
| `registerExternalDriver` | POST | `{ phone, name, vehicleType, licenseClass, licenseNumber }` | `{ driverId, status: 'pending' }` | none | Creates pending record |

### Capacitor Setup (from STACK-DECISION.md)

**Driver App Architecture:**
- Vite + React SPA + Capacitor (NOT TanStack Start)
- Server functions don't work in Capacitor WebViews — shares @hyperquote packages but uses direct Supabase client
- Capacitor 8 native wrapper

**Key packages:**
- `@capacitor/core` + `@capacitor/ios` + `@capacitor/android`
- `@capacitor/camera` — photo capture
- `@capacitor-mlkit/barcode-scanning` — barcode/QR scanning
- `@capgo/capacitor-native-biometric` — biometric auth
- `@transistorsoft/capacitor-background-geolocation` v9.0.2 — background GPS ($399 license)
- PowerSync Capacitor SDK — offline SQLite sync
- MapLibre GL + react-map-gl + PMTiles — offline maps

**Vite Config (Driver — NO cloudflare, NO tanstackStart):**
```tsx
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
  ],
})
```

## Business Rules

**Three Driver Types:**
- INTERNAL: Employee, company vehicle, full equipment, dispatched directly
- CONTRACTED: Recurring external, own verified vehicle/equipment, priority overflow, 30-min accept window
- ON_DEMAND: One-off external, own vehicle, light loads only, claimed from pool

**DVIR (Internal Policy):**
No Egyptian legal requirement for daily vehicle inspection. HyperQuote implements as internal policy. Major failures block departure until resolved or vehicle swapped.

**GPS Consent (Data Protection Law 151/2020):**
- GPS tracking legal with explicit employee consent
- Penalties up to EGP 5M for violations
- Capture consent at shift start

**Egyptian Driver Licenses:**
- Third Degree: lighter vehicles
- Second Degree: heavy trucks (minimum for building materials)
- First Degree: semi-trailers

**Night Delivery Safety (Cairo):**
- High-visibility vests, functional lighting, emergency kit
- Site must have adequate lighting for unloading
- Auto dark mode during night shifts

**Biometric Auth Fallback Chain:**
Face ID -> Fingerprint -> PIN -> Phone OTP

## Non-Negotiable Rules

1. **Vite + React SPA, NOT TanStack Start.** Capacitor WebView incompatible with server functions.
2. **Three colors:** White, Black, Blue. Driver app USES blue (unlike CEO app).
3. **Giant touch targets:** 56-64dp minimum. Primary actions in bottom 40%.
4. **Geist Mono for ALL numbers.**
5. **React Aria Components, NOT shadcn.**
6. **Motion v12.** Import from `motion/react`.
7. **`useWatch()`, NEVER `watch()`.**
8. **Colors in `:root {}`, NEVER in `@theme`.**
9. **ALL numbers -> Arabic-Indic numerals in Arabic context.**
10. **Everything must work offline.** Queue mutations in PowerSync/SQLite.
11. **16px base font** (larger for outdoor readability).
12. **7:1 contrast** (WCAG AAA for dirty screens/sunlight).

## Known Risks & Gotchas

- **Capacitor BG Geolocation v9:** requires Capacitor 8. $399 license. License key regeneration may be needed.
- **PowerSync initialization:** ensure SQLite tables are created before any data access
- **Photo compression:** 1920px max, JPEG 0.7 before queuing for upload
- **Driver app has NO server functions** — it calls Supabase directly (protected by RLS)
- **Biometric enrollment** must gracefully handle devices without biometric hardware
- **Background GPS** requires proper Android/iOS permissions and battery optimization exclusion
- **PMTiles for offline maps:** Cairo vector tiles ~200-400MB — download before first use

## Tips

- Start with Capacitor scaffold + basic Vite React app + build verification on both platforms
- Then add auth (OTP -> PIN -> biometric) — this is the most critical path
- Then DVIR inspection (the 10-point checklist with photos)
- Then home dashboard
- PowerSync initialization can happen in parallel with UI work
- Test on REAL devices — emulators don't properly test biometric, GPS, or camera
- The driver app vite config does NOT have cloudflare() or tanstackStart() plugins
- External driver registration is a separate flow from the main login — it's a longer onboarding
