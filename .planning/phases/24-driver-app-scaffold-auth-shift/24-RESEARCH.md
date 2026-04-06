# Phase 24: Driver App Scaffold + Auth + Shift - Research

**Researched:** 2026-04-06
**Domain:** Capacitor 8 native mobile app, biometric auth, offline-first sync, vehicle inspection
**Confidence:** HIGH

## Summary

Phase 24 transforms the minimal Vite + React SPA at `apps/driver/` into a Capacitor 8 native mobile app with phone OTP authentication, biometric enrollment, shift start with DVIR inspection, and offline-first data sync via PowerSync + SQLite.

The driver app is architecturally distinct from all other HyperQuote apps: it is a plain Vite SPA (no TanStack Start, no server functions, no SSR). It communicates with Supabase directly via `@supabase/supabase-js` (not `@supabase/ssr`), protected by RLS policies. PowerSync provides local SQLite for offline reads/writes with background sync to Supabase.

The existing `apps/driver/` scaffold has React 19, Vite 7, Tailwind 4, and a placeholder App.tsx. Everything else must be built: Capacitor native projects, routing, auth flow, PowerSync initialization, inspection UI, and home dashboard.

**Primary recommendation:** Build in layers: (1) Capacitor scaffold + native project generation, (2) routing + Supabase client, (3) auth flow (OTP -> PIN -> biometric), (4) PowerSync + SQLite initialization, (5) shift start + DVIR inspection, (6) home dashboard.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Vite + React SPA, NOT TanStack Start (Capacitor WebView incompatible with server functions)
- Capacitor 8 native wrapper
- Three colors: White, Black, Blue (driver app USES blue)
- Giant touch targets: 56-64dp minimum, primary actions in bottom 40%
- Geist Mono for ALL numbers
- React Aria Components, NOT shadcn
- Motion v12, import from `motion/react`
- `useWatch()`, NEVER `watch()`
- Colors in `:root {}`, NEVER in `@theme`
- ALL numbers -> Arabic-Indic numerals in Arabic context
- Everything must work offline (queue mutations in PowerSync/SQLite)
- 16px base font (larger for outdoor readability)
- 7:1 contrast (WCAG AAA for dirty screens/sunlight)
- No server functions -- calls Supabase directly (protected by RLS)
- Login requires network; inspection works offline
- Photo compression: 1920px max, JPEG 0.7 before queuing for upload

### Claude's Discretion
- Router choice for SPA (recommendation: TanStack Router standalone for ecosystem consistency)
- PowerSync schema structure and sync rules design
- Component file organization within apps/driver/src/
- State management patterns (Zustand + PowerSync + TanStack Query when online)

### Deferred Ideas (OUT OF SCOPE)
- Route overview (Phase 25: DRV-03)
- Stop detail (Phase 25: DRV-04)
- Navigation deep-link (Phase 25: DRV-05)
- Loading verification (Phase 25: DRV-06)
- Delivery execution (Phase 25: DRV-07)
- POD capture (Phase 25: DRV-08)
- Exception reporting (Phase 26: DRV-09)
- End of day (Phase 26: DRV-10)
- External driver job offers (Phase 26: DRV-11)
- Background GPS tracking (initialized but not actively used until Phase 25)
- Offline map tiles download (Phase 25)
- External driver full registration flow (captured in DRV-01 spec but complex -- implement login + registration shell, full multi-step onboarding can be Phase 25/26)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DRV-01 | Vite + Capacitor native setup, login (phone OTP -> PIN -> biometric) | Capacitor 8 scaffold, `@capgo/capacitor-native-biometric` for biometric, Supabase Auth for OTP, secure credential storage for PIN |
| DRV-02 | Shift start: vehicle selection, pre-trip DVIR (10-point checklist with photos), odometer, GPS consent | `@capacitor/camera` for photos, `@capacitor/geolocation` for GPS consent, React Aria form components, signature canvas |
| DRV-12 | Offline-first: PowerSync + SQLite, full delivery flow without internet, background sync, photo queue | `@powersync/capacitor` + `@capacitor-community/sqlite` + `@powersync/web`, schema definition, SupabaseConnector, upload queue |
</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@capacitor/core` | 8.3.0 | Capacitor runtime | Required for native bridge |
| `@capacitor/cli` | 8.3.0 | Capacitor CLI tools | Project init, sync, build |
| `@capacitor/ios` | 8.3.0 | iOS native project | Required for iOS builds |
| `@capacitor/android` | 8.3.0 | Android native project | Required for Android builds |
| `@capacitor/camera` | 8.0.2 | Photo capture | DVIR inspection photos, odometer photo |
| `@capacitor/geolocation` | 8.2.0 | GPS access | GPS consent capture, location tagging |
| `@capacitor/preferences` | 8.0.1 | Key-value storage | PIN hash storage, settings |
| `@capacitor/app` | 8.1.0 | App lifecycle | Version check, background/foreground |
| `@capacitor/status-bar` | 8.0.2 | Status bar control | Dark mode, immersive |
| `@capacitor/splash-screen` | 8.0.1 | Splash screen | Launch screen |
| `@capgo/capacitor-native-biometric` | 8.4.2 | Biometric auth | Face ID, fingerprint, secure credential storage |
| `@powersync/capacitor` | 0.5.2 | Offline sync (Capacitor) | Native SQLite on mobile, WA-SQLite on web |
| `@powersync/web` | (peer dep) | PowerSync core | Schema, query, watch APIs |
| `@capacitor-community/sqlite` | (peer dep) | Native SQLite driver | Required by @powersync/capacitor |
| `@journeyapps/wa-sqlite` | (peer dep) | Web SQLite fallback | Required by @powersync/capacitor for web |
| `@supabase/supabase-js` | 2.101.1 | Supabase client | Direct API calls (no SSR needed) |
| `@tanstack/react-router` | 1.168.10 | Client-side routing | SPA routing, consistent with other apps |
| `@tanstack/react-query` | 5.95.2 | Server state (online) | Cache management when online |
| `zustand` | 5.0.12 | UI state | Auth state, inspection progress, theme |
| `react-hook-form` | 7.72.0 | Form state | Inspection form, login form |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@capacitor/haptics` | 8.0.2 | Haptic feedback | Inspection pass/fail toggles |
| `react-signature-canvas` | 1.0.7 | Signature capture | DVIR sign-off |
| `@hookform/resolvers` | 5.2.2 | Form validation | Zod schema validation |
| `zod` | 3.x | Schema validation | Input validation |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| TanStack Router | react-router-dom 7 | TanStack Router chosen for ecosystem consistency; all other apps use TanStack Router (via Start) |
| @capgo/capacitor-native-biometric | @aparajita/capacitor-biometric-auth | @capgo is more actively maintained, supports Capacitor 8, has secure credential storage built-in |
| @powersync/capacitor | WatermelonDB | PowerSync is specified in CONTEXT.md, provides Supabase-native sync |

**Installation:**
```bash
bun add @capacitor/core @capacitor/camera @capacitor/geolocation @capacitor/preferences @capacitor/app @capacitor/status-bar @capacitor/splash-screen @capacitor/haptics @capgo/capacitor-native-biometric @powersync/capacitor @powersync/web @capacitor-community/sqlite @journeyapps/wa-sqlite @supabase/supabase-js @tanstack/react-router @tanstack/react-query zustand react-hook-form @hookform/resolvers zod react-signature-canvas
bun add -D @capacitor/cli
```

## Architecture Patterns

### Recommended Project Structure
```
apps/driver/
├── capacitor.config.ts        # Capacitor config (webDir: 'dist')
├── ios/                        # Generated iOS project
├── android/                    # Generated Android project
├── index.html
├── vite.config.ts
├── package.json
├── tsconfig.json
└── src/
    ├── main.tsx                # App entry, providers
    ├── App.tsx                 # Router outlet
    ├── styles.css              # Tailwind + tokens import
    ├── router.ts               # TanStack Router instance
    ├── routes/
    │   ├── __root.tsx          # Root layout (providers, theme)
    │   ├── login.tsx           # Login screen (OTP + PIN + biometric)
    │   ├── shift-start.tsx     # Shift start + DVIR
    │   └── home.tsx            # Dashboard
    ├── components/
    │   ├── auth/               # OTP input, PIN pad, biometric prompt
    │   ├── inspection/         # DVIR checklist, photo capture, signature
    │   └── shared/             # Buttons, cards, layout primitives
    ├── lib/
    │   ├── supabase.ts         # Supabase client singleton
    │   ├── powersync.ts        # PowerSync database + schema
    │   ├── connector.ts        # PowerSync <-> Supabase connector
    │   ├── biometric.ts        # Biometric helpers (check, enroll, verify)
    │   └── camera.ts           # Camera helpers (capture, compress, queue)
    ├── stores/
    │   ├── auth.ts             # Auth state (session, driver profile)
    │   ├── shift.ts            # Active shift state
    │   └── theme.ts            # Dark/light mode
    └── i18n/
        ├── config.ts           # i18next init for driver app
        └── locales/
            ├── ar/
            │   └── driver.json
            └── en/
                └── driver.json
```

### Pattern 1: Supabase Direct Client (No SSR)
**What:** The driver app uses `@supabase/supabase-js` directly, not `@supabase/ssr`.
**When to use:** Capacitor apps where there is no server-side rendering.
**Example:**
```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // 12-hour session as specified
    flowType: 'pkce',
  },
})
```

### Pattern 2: PowerSync + Supabase Connector
**What:** PowerSync manages local SQLite, syncs with Supabase via a connector.
**When to use:** All data reads/writes in the driver app go through PowerSync.
**Example:**
```typescript
// src/lib/powersync.ts
import { PowerSyncDatabase } from '@powersync/capacitor'
import { column, Schema, Table } from '@powersync/web'

const vehicles = new Table({
  plate_number: column.text,
  type: column.text,
  make: column.text,
  model: column.text,
  year: column.integer,
  status: column.text,
  assigned_driver_id: column.text,
})

const driver_shifts = new Table({
  driver_id: column.text,
  vehicle_id: column.text,
  inspection_id: column.text,
  started_at: column.text,
  ended_at: column.text,
  status: column.text,
  start_odometer: column.real,
  start_location: column.text,
})

const vehicle_inspections = new Table({
  vehicle_id: column.text,
  driver_id: column.text,
  inspection_type: column.text,
  status: column.text,
  odometer_reading: column.real,
  signature_url: column.text,
  gps_lat: column.real,
  gps_lng: column.real,
  created_at: column.text,
})

const vehicle_inspection_items = new Table({
  inspection_id: column.text,
  item_name: column.text,
  status: column.text, // pass/fail/na
  severity: column.text, // minor/major
  notes: column.text,
  photo_url: column.text,
})

export const DriverSchema = new Schema({
  vehicles,
  driver_shifts,
  vehicle_inspections,
  vehicle_inspection_items,
})

export const db = new PowerSyncDatabase({
  schema: DriverSchema,
  database: { dbFilename: 'hyperquote-driver.db' },
})
```

```typescript
// src/lib/connector.ts
import { supabase } from './supabase'
import type { PowerSyncBackendConnector } from '@powersync/web'

export class SupabaseConnector implements PowerSyncBackendConnector {
  async fetchCredentials() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Not authenticated')
    return {
      endpoint: import.meta.env.VITE_POWERSYNC_URL,
      token: session.access_token,
    }
  }

  async uploadData(database: any) {
    const tx = await database.getNextCrudTransaction()
    if (!tx) return

    for (const op of tx.crud) {
      const { table, opType, opData } = op
      if (opType === 'PUT') {
        await supabase.from(table).upsert(opData)
      } else if (opType === 'PATCH') {
        await supabase.from(table).update(opData).eq('id', op.id)
      } else if (opType === 'DELETE') {
        await supabase.from(table).delete().eq('id', op.id)
      }
    }
    await tx.complete()
  }
}
```

### Pattern 3: Biometric Auth Flow
**What:** Three-tier auth: OTP -> PIN enrollment -> biometric enrollment. Subsequent logins: biometric -> PIN fallback -> OTP fallback.
**When to use:** Login screen.
**Example:**
```typescript
// src/lib/biometric.ts
import { NativeBiometric } from '@capgo/capacitor-native-biometric'

const SERVER_KEY = 'hyperquote-driver'

export async function isBiometricAvailable() {
  const result = await NativeBiometric.isAvailable({ useFallback: false })
  return result.isAvailable
}

export async function enrollBiometric(phone: string, pinHash: string) {
  await NativeBiometric.setCredentials({
    username: phone,
    password: pinHash,
    server: SERVER_KEY,
  })
}

export async function verifyBiometric() {
  await NativeBiometric.verifyIdentity({
    reason: 'Verify your identity',
    title: 'HyperQuote Driver',
    useFallback: true,
  })
  const credentials = await NativeBiometric.getSecureCredentials({
    server: SERVER_KEY,
  })
  return credentials
}
```

### Pattern 4: Photo Capture + Compression Queue
**What:** Capture photo, compress to 1920px max / JPEG 0.7, store locally, queue for upload.
**When to use:** DVIR inspection fail photos, odometer photo.
**Example:**
```typescript
// src/lib/camera.ts
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'

export async function capturePhoto(): Promise<string> {
  const photo = await Camera.getPhoto({
    quality: 70,
    allowEditing: false,
    resultType: CameraResultType.Uri,
    source: CameraSource.Camera,
    width: 1920,
    height: 1920,
  })
  return photo.webPath!
}
```

### Anti-Patterns to Avoid
- **Using `@supabase/ssr` in driver app:** No SSR exists. Use `@supabase/supabase-js` directly.
- **Using `@hyperquote/auth` package directly:** It has peer deps on TanStack Start/Router. The driver app creates its own Supabase client.
- **Server functions in driver app:** Capacitor WebViews cannot execute server functions. All API calls go through Supabase client or PowerSync.
- **`watch()` from React Hook Form:** Use `useWatch()` per project rules.
- **Hash routing:** Not needed with Capacitor. Use standard browser history routing.
- **Storing PIN in plaintext:** Hash the PIN before storing in biometric keychain.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Biometric auth | Custom native bridge | `@capgo/capacitor-native-biometric` | Handles Face ID, fingerprint, secure keychain/keystore, fallback chain |
| Offline SQLite sync | Custom sync engine | `@powersync/capacitor` | Conflict resolution, delta sync, retry queue all handled |
| Photo capture | Custom camera access | `@capacitor/camera` | Permissions, platform differences, result handling |
| Secure storage | localStorage for tokens | `@capacitor/preferences` + biometric keychain | localStorage is not secure on mobile |
| Signature capture | Custom canvas drawing | `react-signature-canvas` | Touch handling, export as image, clear/undo |
| SPA routing | Custom history management | `@tanstack/react-router` | Type-safe, code splitting, guards |

**Key insight:** The driver app has more native dependencies than any other HyperQuote app. Every native capability should use a Capacitor plugin, never a web polyfill.

## Common Pitfalls

### Pitfall 1: PowerSync Schema Must Match Sync Rules
**What goes wrong:** PowerSync client schema tables/columns don't match the server-side sync rules, causing silent data loss or sync failures.
**Why it happens:** Client schema is defined in TypeScript, sync rules in YAML on the PowerSync dashboard. They drift.
**How to avoid:** Define sync rules YAML alongside the client schema. Keep a `sync-rules.yaml` in the driver app for reference. Only sync driver-relevant tables.
**Warning signs:** Data appears locally but never reaches Supabase, or vice versa.

### Pitfall 2: Capacitor Plugin Not Synced After Install
**What goes wrong:** Installing a Capacitor plugin via npm but forgetting `npx cap sync` causes runtime "plugin not found" errors.
**Why it happens:** Capacitor plugins have native code that must be copied to ios/ and android/ projects.
**How to avoid:** Always run `npx cap sync` after installing any `@capacitor/*` or Capacitor community plugin.
**Warning signs:** "X is not implemented on this platform" errors at runtime.

### Pitfall 3: Biometric Enrollment on Devices Without Hardware
**What goes wrong:** Calling `verifyIdentity()` on a device without biometric hardware crashes or shows confusing error.
**Why it happens:** Not checking `isAvailable()` first.
**How to avoid:** Always call `isAvailable()` before showing biometric enrollment prompt. If unavailable, skip to PIN-only flow.
**Warning signs:** `isAvailable` returns `{ isAvailable: false, biometryType: 'NONE' }`.

### Pitfall 4: PowerSync DB Must Initialize Before Any Data Access
**What goes wrong:** Components try to query PowerSync before `db.connect()` completes, causing "database not ready" errors.
**Why it happens:** PowerSync initialization is async but components render synchronously.
**How to avoid:** Use a PowerSyncProvider that gates rendering until DB is initialized. Show splash screen during init.
**Warning signs:** "PowerSync not connected" or "database not open" errors on app launch.

### Pitfall 5: Supabase Auth Token Expiry During Long Shifts
**What goes wrong:** 12-hour JWT expires mid-shift, breaking sync.
**Why it happens:** Supabase tokens have fixed TTL. If refresh fails (offline), session is lost.
**How to avoid:** Configure `autoRefreshToken: true`. Store refresh token securely. Handle token refresh failure gracefully (don't log out, queue operations for later).
**Warning signs:** 401 errors from Supabase after several hours.

### Pitfall 6: Photo Queue Growing Without Upload
**What goes wrong:** DVIR photos captured offline accumulate in local storage, filling device storage.
**Why it happens:** No background upload mechanism, no storage limit monitoring.
**How to avoid:** Implement upload queue with retry. Monitor queue size. Compress photos before queuing (1920px max, JPEG 0.7). Alert driver if queue exceeds threshold.
**Warning signs:** Device storage warnings, slow app performance.

### Pitfall 7: GPS Permission Denied Blocks Shift Start
**What goes wrong:** Driver denies GPS permission, shift start is blocked, driver is stuck.
**Why it happens:** GPS is required for shift start (spec says "block if unavailable").
**How to avoid:** Show clear explanation of why GPS is needed (legal requirement, Data Protection Law 151/2020 consent). Provide "Open Settings" button if denied. Do not allow shift start without GPS.
**Warning signs:** `Geolocation.checkPermissions()` returns `denied`.

### Pitfall 8: @hyperquote/auth Package Incompatible with Driver App
**What goes wrong:** Importing from `@hyperquote/auth` pulls in TanStack Start dependencies that don't exist in the driver app.
**Why it happens:** Auth package has peer deps on `@tanstack/react-start` and `@tanstack/react-router`.
**How to avoid:** Driver app creates its own Supabase client directly using `@supabase/supabase-js`. Do NOT import from `@hyperquote/auth`. Can still use `@hyperquote/types`, `@hyperquote/i18n`, `@hyperquote/ui`.
**Warning signs:** Build errors about missing `@tanstack/react-start`.

## Code Examples

### Capacitor Config
```typescript
// apps/driver/capacitor.config.ts
import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'net.hyperquote.driver',
  appName: 'HyperQuote Driver',
  webDir: 'dist',
  server: {
    // For dev: use live reload
    // url: 'http://192.168.x.x:3004',
    // cleartext: true,
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: false, // manual hide after PowerSync init
    },
  },
}

export default config
```

### OTP Login with Supabase
```typescript
// Supabase phone OTP login
async function sendOTP(phone: string) {
  const { error } = await supabase.auth.signInWithOtp({
    phone: `+20${phone}`, // Egyptian prefix
  })
  if (error) throw error
}

async function verifyOTP(phone: string, token: string) {
  const { data, error } = await supabase.auth.verifyOtp({
    phone: `+20${phone}`,
    token,
    type: 'sms',
  })
  if (error) throw error
  return data.session
}
```

### Pre-Shift Device Health Check
```typescript
import { Geolocation } from '@capacitor/geolocation'
import { Camera } from '@capacitor/camera'
import { App } from '@capacitor/app'
import { Device } from '@capacitor/device'

interface HealthCheck {
  battery: { level: number; isCharging: boolean; warning: boolean }
  gps: { available: boolean; blocked: boolean }
  camera: { available: boolean }
  appVersion: { current: string; needsUpdate: boolean }
}

async function runHealthCheck(): Promise<HealthCheck> {
  const batteryInfo = await Device.getBatteryInfo()
  const gpsPermission = await Geolocation.checkPermissions()
  const cameraPermission = await Camera.checkPermissions()
  const appInfo = await App.getInfo()

  return {
    battery: {
      level: batteryInfo.batteryLevel ?? 1,
      isCharging: batteryInfo.isCharging ?? false,
      warning: (batteryInfo.batteryLevel ?? 1) < 0.5,
    },
    gps: {
      available: gpsPermission.location === 'granted',
      blocked: gpsPermission.location === 'denied',
    },
    camera: {
      available: cameraPermission.camera === 'granted' || cameraPermission.camera === 'prompt',
    },
    appVersion: {
      current: appInfo.version,
      needsUpdate: false, // check against remote config
    },
  }
}
```

### DVIR Inspection Item Component Pattern
```typescript
// Inspection item with Pass/Fail/N-A toggles (56dp buttons)
// Uses React Aria ToggleButton for accessibility
import { ToggleButton } from 'react-aria-components'

interface InspectionItemProps {
  name: string
  status: 'pass' | 'fail' | 'na' | null
  onStatusChange: (status: 'pass' | 'fail' | 'na') => void
  onPhotoCapture: () => void
  severity?: 'minor' | 'major'
  onSeverityChange?: (severity: 'minor' | 'major') => void
}
// 56dp minimum touch targets, green/red/gray colors
// Camera button appears on Fail
// Severity selector appears on Fail
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Cordova plugins | Capacitor 8 native plugins | 2024-2025 | Modern, maintained, TypeScript-first |
| @capacitor-community/sqlite alone | PowerSync + @capacitor-community/sqlite | 2024-2025 | Automatic sync, conflict resolution, offline queue |
| capacitor-native-biometric (original) | @capgo/capacitor-native-biometric | 2024 | Forked and actively maintained for Capacitor 8 |
| react-router for SPA | TanStack Router standalone | 2024-2025 | Type-safe routes, consistent with project ecosystem |
| localStorage for tokens | Capacitor Preferences + biometric keychain | Always | Secure storage on mobile, encrypted at rest |

## Open Questions

1. **PowerSync Cloud Account**
   - What we know: PowerSync requires a cloud instance (or self-hosted) for the sync service
   - What's unclear: Whether the team has a PowerSync account set up
   - Recommendation: Phase plan should include a task for PowerSync account setup + sync rules deployment. For development, mock the connector.

2. **External Driver Registration Scope**
   - What we know: DRV-01 includes external driver registration (personal info, ID photos, vehicle photos, terms acceptance)
   - What's unclear: Full multi-step registration is complex (10+ screens). How much to include in Phase 24 vs defer?
   - Recommendation: Implement login + registration entry point in Phase 24. Full multi-step onboarding can be a later plan or Phase 25/26.

3. **Background GPS License**
   - What we know: `@transistorsoft/capacitor-background-geolocation` requires a $399 license
   - What's unclear: Whether license has been purchased
   - Recommendation: Phase 24 uses `@capacitor/geolocation` for foreground GPS (consent + shift start location). Background tracking (Phase 25) requires the paid plugin.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Bun | Package management | Yes | 1.3.11 | -- |
| Node.js | Capacitor CLI | Yes | 25.8.0 | -- |
| Java/Android SDK | Android builds | No | -- | Web-only dev; native builds on CI or Mac |
| Xcode | iOS builds | No | -- | Web-only dev; native builds on Mac |
| Capacitor CLI | Native project gen | No (install as devDep) | 8.3.0 | -- |

**Missing dependencies with no fallback:**
- Java/Android SDK and Xcode are not available on this Linux machine. Native builds must happen on CI or a Mac. However, all code development and web preview work fine without them.

**Missing dependencies with fallback:**
- `npx cap add ios` and `npx cap add android` will fail without platform SDKs. The native project directories can be generated on a machine with the SDKs, or the scaffold can be committed as empty directories with generation deferred to CI.

**Recommendation:** Generate `capacitor.config.ts` and add Capacitor packages. Skip `npx cap add ios/android` on this machine. Use `bun run dev` (Vite dev server) for all UI development. Native project generation happens when building on a machine with the SDKs.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 |
| Config file | `apps/driver/vitest.config.ts` (Wave 0 -- create) |
| Quick run command | `cd apps/driver && bun run test` |
| Full suite command | `cd apps/driver && bun run test -- --run` |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DRV-01 | Supabase client initialization | unit | `bun run test -- src/lib/supabase.test.ts` | Wave 0 |
| DRV-01 | Auth state management (login/logout) | unit | `bun run test -- src/stores/auth.test.ts` | Wave 0 |
| DRV-01 | Biometric availability check | unit | `bun run test -- src/lib/biometric.test.ts` | Wave 0 |
| DRV-02 | DVIR inspection state (10 items) | unit | `bun run test -- src/stores/shift.test.ts` | Wave 0 |
| DRV-02 | Inspection item validation (fail requires photo) | unit | `bun run test -- src/components/inspection/inspection.test.ts` | Wave 0 |
| DRV-12 | PowerSync schema definition | unit | `bun run test -- src/lib/powersync.test.ts` | Wave 0 |
| DRV-12 | Connector credential fetch | unit | `bun run test -- src/lib/connector.test.ts` | Wave 0 |

### Sampling Rate
- **Per task commit:** `cd apps/driver && bun run test -- --run`
- **Per wave merge:** Full suite
- **Phase gate:** Full suite green before verify

### Wave 0 Gaps
- [ ] `apps/driver/vitest.config.ts` -- Vitest config for driver app
- [ ] `apps/driver/src/test/setup.ts` -- Test setup (mock Capacitor plugins)
- [ ] Mock utilities for `@capacitor/camera`, `@capacitor/geolocation`, `@capgo/capacitor-native-biometric`

## Project Constraints (from CLAUDE.md)

- **Bun, NOT npm:** All package operations use `bun add`, `bun install`, `bun run`
- **React Aria Components, NOT shadcn:** All interactive UI built with React Aria
- **Motion v12:** Import from `motion/react`, NOT `framer-motion`
- **Colors in `:root {}`, NEVER `@theme`:** Tailwind v4 color registration rule
- **`useWatch()` NEVER `watch()`:** React 19 + React Compiler compatibility
- **Geist Mono for ALL numbers:** Quantities, weights, distances, times, IDs
- **Arabic-Indic numerals:** All numbers in Arabic locale context
- **Logical properties ONLY:** `ps-4` not `pl-4`, `me-2` not `mr-2` (RTL support)
- **16px base font, 7:1 contrast:** Outdoor readability requirements for driver app
- **Three colors only:** White, Black, Blue (#2563EB). Driver app uses blue (unlike CEO app which is monochrome).

## Sources

### Primary (HIGH confidence)
- npm registry -- verified all package versions via `npm view` (2026-04-06)
- CONTEXT.md -- locked decisions from user discussion
- FRONTEND.md spec -- Screen 1-3 specifications (via CONTEXT.md extraction)
- BACKEND.md spec -- Server function signatures (via CONTEXT.md extraction)
- STACK-DECISION.md -- Technology choices and version constraints
- `.claude/rules/driver-app.md` -- Driver app specific rules

### Secondary (MEDIUM confidence)
- [PowerSync Capacitor SDK docs](https://docs.powersync.com/client-sdks/reference/capacitor) -- setup, schema, connector patterns
- [PowerSync + Supabase Vite React template](https://github.com/powersync-community/vite-react-ts-powersync-supabase) -- project structure reference
- [@capgo/capacitor-native-biometric docs](https://capgo.app/docs/plugins/native-biometric/getting-started/) -- API reference, setup
- [Capacitor getting started](https://capacitorjs.com/docs/getting-started) -- init, add platforms, sync

### Tertiary (LOW confidence)
- PowerSync Capacitor SDK is alpha (0.5.2) -- core functionality stable but edge cases may exist

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all versions verified against npm registry, all specified in CONTEXT.md/STACK-DECISION.md
- Architecture: HIGH -- Capacitor + Vite SPA is well-established pattern, PowerSync connector pattern documented
- Pitfalls: HIGH -- based on Capacitor/PowerSync documentation and known platform constraints

**Research date:** 2026-04-06
**Valid until:** 2026-05-06 (30 days -- stable ecosystem, PowerSync alpha may advance)
