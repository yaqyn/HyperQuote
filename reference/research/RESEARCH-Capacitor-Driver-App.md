> ⚠️ **REFERENCE DOCUMENT — NOT THE SOURCE OF TRUTH**
> This file was written during the research phase and may contain outdated decisions, US-centric references, or superseded technical choices.
> **Always defer to `essential/RESEARCH.md` for current decisions.**
> Key changes since this file was written: TanStack Start (not Next.js), Capacitor (not Expo), React Aria (not shadcn), Egyptian law (not US FMCSA), EGP (not USD), dual auth pools, no online payments, no mobile wallets, spatial glass UI (not traditional dashboards).

# RESEARCH: Capacitor for Building Materials Delivery Driver App

> Research date: March 2026
> Focus: PWA wrapped in Capacitor for native capabilities (NOT React Native/Expo)

---

## 1. Capacitor vs Expo for a Delivery Driver App -- Honest Comparison

### Where Capacitor Wins

- **Web-first architecture**: Your web developers write React/TypeScript and it runs everywhere. No learning React Native's View/Text/FlatList components.
- **PWA + Native from one codebase**: The driver app works in a browser AND as a native app. Expo cannot do this -- it generates a web app via React Native Web, but it is not a real PWA.
- **Simpler mental model**: It is just a web app in a WebView with a native bridge. No Metro bundler, no Hermes engine, no native module linking headaches.
- **Full HTML/CSS**: You can use any CSS library (Tailwind, etc.), any React component library, any charting library -- they all just work.
- **No vendor lock-in on build infrastructure**: Expo requires EAS Build ($99/mo for teams) for native builds. Capacitor builds are standard Xcode/Gradle projects you can build anywhere.
- **Plugin ecosystem breadth**: Capacitor can use any Cordova plugin (thousands) plus its own growing ecosystem.

### Where Expo Wins

- **Background GPS is built-in**: `expo-location` has background location tracking that works without a $399 license. Capacitor requires Transistorsoft's commercial plugin.
- **Performance ceiling**: React Native renders with native UI components. For 60fps animations and complex gesture interactions, Expo/RN has an edge. For a driver app (forms, maps, lists), this difference is minimal.
- **OTA updates mature**: Expo EAS Updates is deeply integrated and battle-tested. Capacitor has Capgo (from $12/mo) and Capawesome, but they are younger.
- **Ecosystem momentum**: Larger community, more StackOverflow answers, more tutorials.
- **Managed workflow**: Expo handles native build configuration automatically. Capacitor requires you to maintain Xcode/Android Studio projects (though this is also a strength -- you have full control).

### For a Driver App Specifically

A delivery driver app is mostly: forms, camera, GPS tracking, barcode scanning, and maps. It is NOT a social media app with complex animations. **Capacitor is genuinely competitive here** because:
- WebView performance is more than adequate for form-heavy apps
- The critical native features (GPS, camera, barcodes) all have mature Capacitor plugins
- The PWA fallback means a driver can use a browser if the native app has issues
- Your main web team can contribute to the driver app without learning React Native

### Honest Risk with Capacitor

- **Ionic's commercial products were shut down** in 2025 (Appflow, Identity Vault, Portals). Capacitor itself remains MIT-licensed and actively maintained, but commercial support options narrowed.
- **Smaller community** than React Native/Expo. Fewer tutorials, fewer answers on forums.
- **WebView performance floor**: On low-end Android devices, WebView rendering can feel sluggish compared to native rendering. Test on the actual devices your drivers will use.

---

## 2. Background Geolocation: @transistorsoft/capacitor-background-geolocation

### Overview

This is THE plugin for background GPS in Capacitor. It is the same codebase (Transistorsoft) that powers background location in React Native, Flutter, and Cordova. It has 4+ years of R&D behind it.

### How It Works

- Uses accelerometer-based motion detection to power down GPS when the device is stationary
- Automatically tracks when the device starts moving, stops when stationary
- Persists every location fix to a native SQLite database -- never loses data even with no network
- Built-in configurable HTTP service for batch-syncing location data to your server with automatic retry
- Continues tracking after app termination and device reboot
- iOS `preventSuspend` mode enables 24-hour background operation

### Battery Impact

Battery conservation is the core design philosophy. The plugin:
- Samples the accelerometer periodically (not GPS) while stationary
- Only activates GPS when motion is detected
- Powers down GPS the moment the device stops
- Real-world reports from logistics users: battery drain is significantly lower than continuous GPS polling

### Accuracy

- Uses the device's best available location provider (GPS, WiFi, cell tower)
- Configurable desired accuracy levels
- Motion activity recognition: `on_foot`, `in_vehicle`, `on_bicycle`, `still`, `running` -- useful for detecting when a driver is driving vs. at a stop

### Geofencing

- **Unlimited geofence monitoring** with ENTRY, EXIT, and DWELL transitions
- **Polygon geofences** of any geometry and size (not just circles)
- Geofences persist across device reboot and app termination
- Perfect for job site arrival/departure detection

### Licensing (2026 Prices)

| Plan | Apps | Price | Support |
|------|------|-------|---------|
| Starter | 1 app | $399 | GitHub issues, perpetual license, 1 year updates |
| Venture | 5 apps | $599 | GitHub issues, perpetual license, 1 year updates |
| Pro | 25 apps | $749 | GitHub + Slack support, 1 year updates |
| Studio | 100 apps | $999 | Premium support, 1 year updates |

- License keys bind to a single app identifier but support **unlimited devices**
- The $399 Starter is a one-time cost for a perpetual license. After year 1, you keep using it -- you just don't get new version updates.

### Production-Proven?

Yes. Used in fleet tracking, fitness apps, security systems, emergency response. The npm package gets ~2,700 weekly downloads across all framework variants. The same Transistorsoft codebase powers location tracking in React Native and Flutter apps used by major logistics companies.

### Verdict

**This is a solved problem.** The $399 is absolutely worth it for a production logistics app. Building your own background geolocation would cost 10-100x more in engineering time and would never match the battery optimization.

---

## 3. Capacitor Offline-First: SQLite and Sync Options

### Local SQLite: @capacitor-community/sqlite

The standard choice. v8.0.1 as of March 2026, actively maintained.

**Features:**
- Cross-platform: iOS, Android, Electron, Web
- Database encryption via SQLCipher (native platforms)
- JSON import/export for data backup and migration
- Data synchronization primitives for offline-first apps
- Recommended by the community as the best-maintained open source option

### PowerSync + Capacitor

**Status: Production-ready (v1.0 released November 2025)**

PowerSync now has a dedicated Capacitor SDK (`@powersync/capacitor`). This is NOT Expo-only.

**How it works:**
- Automatically uses native SQLite on iOS/Android (via @capacitor-community/sqlite)
- Falls back to WA-SQLite on web
- Reactive queries with `useQuery()` work identically across platforms
- Full offline-first with automatic background sync
- Syncs between client-side SQLite and server-side Postgres (also supports MongoDB, MySQL, SQL Server)

**Architecture:**
1. Platform detection via Capacitor APIs
2. Automatic driver swapping (native SQLite vs. web SQLite)
3. PowerSync Core extension handles sync protocol
4. Table change notifications for reactive updates

**Supabase integration**: PowerSync is an official Supabase partner integration. Postgres on Supabase syncs to SQLite on the device via PowerSync.

**Known limitations (as of March 2026):**
- No multiple tab support on native iOS/Android
- Encryption for native mobile not yet supported
- Still relatively new (expect some rough edges)

### WatermelonDB + Capacitor

WatermelonDB can work with Capacitor but it is primarily designed for React Native. Reports indicate synchronization can become problematic with large datasets. **PowerSync is the better choice for Capacitor.**

### RxDB + Capacitor

RxDB supports Capacitor via its SQLite RxStorage adapter. It is a viable alternative if you want a reactive database with built-in replication, but PowerSync is more purpose-built for the Postgres-to-SQLite sync pattern.

### Recommended Stack for Offline-First

```
Supabase (Postgres) <-> PowerSync <-> SQLite (on device)
```

- PowerSync handles bidirectional sync, conflict resolution, offline queueing
- @capacitor-community/sqlite provides the native SQLite engine
- Your app reads/writes to local SQLite (instant, works offline)
- PowerSync syncs changes in the background when network is available

---

## 4. Capacitor + Supabase Integration

### Auth

- **Email/password**: Works out of the box with `@supabase/supabase-js`
- **OAuth (Google, Apple)**: Requires deep linking configuration. The `@capgo/capacitor-supabase` plugin provides native SDK integration for auth flows.
- **Deep linking for OAuth**: Supabase docs have a specific guide for native mobile deep linking. You configure redirect URLs to use your app's custom scheme (e.g., `com.newvision.driver://callback`).
- **Session persistence**: Supabase stores sessions in AsyncStorage/localStorage. On Capacitor, this persists in the WebView's storage.

**Gotcha**: OAuth redirect flows can be tricky. The recommended approach is using `@capgo/capacitor-social-login` which handles the native OAuth flow and returns tokens to Supabase. This avoids browser redirect issues.

### Realtime

Supabase Realtime (WebSocket subscriptions) works in Capacitor without modification. The `@supabase/supabase-js` client works identically in a WebView as in a browser.

**Consideration**: WebSocket connections drop when the app goes to background. You need reconnection logic when the app resumes (Supabase client handles this automatically with `autoReconnect`).

### Storage (Photo Uploads)

Supabase Storage for uploading POD photos works with the standard JS SDK. Workflow:
1. Capture photo with Capacitor Camera plugin (returns file URI or base64)
2. Convert to Blob/File
3. Upload to Supabase Storage bucket via `supabase.storage.from('pod-photos').upload()`

**Offline handling**: Queue uploads locally when offline, sync when connection returns. This is NOT built into Supabase -- you build this with your local SQLite queue.

### Overall Compatibility

Supabase JS SDK is a standard JavaScript library. It works in any JavaScript environment including Capacitor WebViews. There are no fundamental compatibility issues. The main complexity is OAuth deep linking, which is a one-time setup.

---

## 5. Camera and Barcode Scanning

### Camera for POD Photos

**@capacitor/camera** (official Capacitor plugin):
- Take photos or select from gallery
- Returns file URI, base64, or data URL
- Configurable quality, dimensions, and direction
- Works on iOS, Android, and Web
- Well-maintained, part of the official plugin set

For proof-of-delivery: capture photo -> store locally with delivery ID -> upload to Supabase Storage when online.

### Barcode/QR Scanning

**Option 1: @capacitor-mlkit/barcode-scanning** (recommended)
- Uses Google ML Kit under the hood
- Scans directly on-device (no network needed)
- Supports QR codes, UPC, EAN, Code 128, Code 39, and more
- Torch and autofocus support
- Multi-barcode scanning in a single frame
- Ready-to-use scanning interface
- Free and open source

**Option 2: Scanbot Barcode Scanner SDK** (enterprise)
- Designed for warehouse/logistics use cases
- Multi-barcode batch scanning (scan many barcodes without closing the scanner)
- Works offline in remote environments, warehouses, and field operations
- Commercial license

### Warehouse/Outdoor Performance

- ML Kit barcode scanning performs well in varied lighting conditions
- Autofocus and torch support help in dark warehouses
- QR codes on materials/pallets scan reliably at reasonable distances
- For damaged or dirty barcodes, the Scanbot SDK has more advanced image processing

### Compared to Expo

Expo has `expo-camera` and `expo-barcode-scanner`. The capabilities are roughly equivalent. Neither platform has a significant advantage for basic barcode scanning. Capacitor's ML Kit plugin is arguably more flexible because it uses Google's ML Kit directly rather than an abstraction layer.

---

## 6. Push Notifications

### Capacitor Setup

**Recommended plugin**: `@capacitor-firebase/messaging` (community-maintained)

**Setup process:**
1. Create Firebase project, add iOS and Android apps
2. For iOS: Generate APNs Authentication Key (.p8) from Apple Developer Portal
3. Upload .p8 to Firebase Console Cloud Messaging settings
4. Install plugin, configure in `capacitor.config.ts`
5. Handle token registration and message receipt in app code

**Result**: Unified FCM token for both platforms. You send push notifications through Firebase, which handles APNs delivery for iOS.

### Compared to Expo Push

| Aspect | Capacitor + Firebase | Expo Push |
|--------|---------------------|-----------|
| Setup complexity | Medium -- you manage Firebase project and APNs keys | Lower -- Expo abstracts certificates (but SDK 53 removed push from Expo Go on Android) |
| Token type | FCM token | Expo push token (wraps FCM/APNs) |
| Vendor dependency | Firebase (Google) | Expo servers as middleware |
| Reliability | Same as Firebase -- industry standard | Same underlying delivery, but routes through Expo proxy |
| Data notifications | Full control | Full control |
| Rich notifications | Via Firebase extensions | Via Expo notification categories |

**Key 2025 change**: Expo SDK 53 dropped push notification support from Expo Go on Android. You now need development builds to test push, meaning you deal with certificates anyway. This narrows the convenience gap.

### For a Driver App

Push notifications for: new delivery assignments, route changes, dispatch messages, delivery reminders. Standard FCM/APNs capabilities are more than sufficient. The extra Firebase setup is a one-time cost.

---

## 7. PWA-to-Native Bridge

### How It Works

Capacitor wraps your web app in a native WebView. The key insight: **your web app IS the app** in both environments.

```
Browser (PWA):     [Your React App] -> Web APIs
Native (Capacitor): [Your React App] -> Capacitor Bridge -> Native APIs
```

### What Works Identically (No Conditional Code)

- All UI rendering (HTML, CSS, JavaScript)
- React components, routing, state management
- API calls to your backend (fetch, axios)
- Most Capacitor plugins (they have web fallbacks)
- localStorage, IndexedDB
- WebSocket connections (Supabase Realtime)

### What Needs Conditional Code

```typescript
import { Capacitor } from '@capacitor/core';

if (Capacitor.isNativePlatform()) {
  // Native-only code
  // e.g., background geolocation, biometric auth, deep links
} else {
  // Web-only code
  // e.g., service worker registration, web push API
}
```

**Specific cases requiring conditional code:**
- **Background geolocation**: Only works natively (web has no background GPS)
- **Biometric auth**: Native Face ID/fingerprint vs. WebAuthn
- **Push notifications**: FCM tokens (native) vs. Web Push API (PWA)
- **File system access**: Native file paths vs. browser File API
- **Deep linking**: Custom URL schemes (native) vs. standard URLs (web)
- **OAuth redirects**: Custom scheme redirects (native) vs. HTTP redirects (web)

### What Does NOT Work in WebView

- **Service workers do not run in native WebView**. The app manifest is ignored. You do not need them -- Capacitor provides native equivalents.
- **Web Push API** does not work in WebView. Use Capacitor's push notification plugin instead.
- PWA install prompts do not appear (you are already "installed" as a native app).

### Practical Architecture

Build your app as a standard Vite + React SPA. Use Capacitor's platform detection to progressively enhance with native features. The same build artifact serves both web deployment and native app packaging.

---

## 8. App Store Deployment and OTA Updates

### Building for App Stores

Capacitor generates standard native projects:
- **iOS**: Xcode project in `ios/` directory. Build with Xcode or `xcodebuild`. Submit via App Store Connect.
- **Android**: Gradle project in `android/` directory. Build with Android Studio or `./gradlew`. Submit via Google Play Console.

The process is identical to any native app submission. No special requirements.

### OTA Updates

OTA updates push changes to the web layer (HTML, CSS, JavaScript) without app store resubmission.

**Capgo** (leading Capacitor OTA service):
- From $12/month
- 1.1 trillion+ updates delivered
- 95% user update rate
- 434ms average API response time (global CDN)
- E2E encryption
- Self-hosting option available
- Rollback capabilities

**Capawesome Live Update** (alternative):
- Cloud-hosted update delivery
- Automatic and manual update modes
- Delta updates for smaller download sizes

**Rules:**
- OTA updates are ONLY for web code changes (HTML, CSS, JS)
- Adding new native plugins or changing native code requires a full app store submission
- Apple allows this as long as you don't change the app's core functionality via OTA
- Apple's 2025 policy updates confirm compliance for Capacitor live updates

### Live Reload in Development

```bash
npx cap run ios --livereload --external
npx cap run android --livereload --external
```

- Changes to web code hot-reload on the device
- Adding plugins or changing native code requires rebuild
- Works over WiFi -- your dev machine and device must be on the same network

### Compared to Expo

| Feature | Capacitor (Capgo) | Expo (EAS Update) |
|---------|-------------------|-------------------|
| OTA updates | Yes, $12/mo+ | Yes, included in EAS |
| Self-host option | Yes | No |
| E2E encryption | Yes | No |
| Update speed | ~434ms avg | Similar |
| Native builds | Standard Xcode/Gradle or cloud (Capgo/Capawesome) | EAS Build ($99/mo for teams) |

---

## 9. Capacitor + TanStack Start

### Can It Work?

**Yes, with an important architectural consideration.**

There is a working proof-of-concept by Aaron K Saunders (published on DEV.to and GitHub) demonstrating TanStack Start with Capacitor.

### Architecture

```
TanStack Start (deployed server)
  |
  ├── SSR Web App (browser users)
  └── SPA Build (packaged in Capacitor for mobile)
       └── API calls to deployed server via VITE_SERVER_BASE_URL
```

### Setup Requirements

1. TanStack Start project with **SPA mode enabled**:
   ```
   ssr: false (SPA mode)
   prerender: { crawlLinks: true, outputPath: 'index.html' }
   ```
2. Capacitor `webDir` points to `dist/client`
3. `VITE_SERVER_BASE_URL` environment variable for API endpoint

### Critical Gotcha: createServerFn Does NOT Work in Mobile

`createServerFn` expects a co-located server at `/__server`. In a Capacitor WebView (running from `capacitor://` or `file://` origin), there is no server. **Server functions will fail silently or error.**

**Solution**: Use explicit API routes (`src/routes/api/*`) instead. Fetch with fully-qualified URLs. Use `Capacitor.isNativePlatform()` to switch between relative URLs (web) and absolute URLs (mobile).

### Should the Driver App Be a Separate Vite + React App?

**Recommended: Yes, keep it as a separate Vite + React SPA.**

Reasons:
- Simpler architecture -- no SSR/server function complexity
- TanStack Router (without Start) gives you the same routing
- TanStack Query gives you the same data fetching
- No `createServerFn` gotchas to work around
- Cleaner Capacitor integration
- Your main web app (TanStack Start) and driver app (Vite + React + Capacitor) share component libraries and API types but are separate deployments

If you DO want TanStack Start for the driver app (e.g., to share more code with the main app), it works in SPA mode, but you lose the primary benefit of Start (server functions) on mobile.

---

## 10. Production Examples

### Known Capacitor Apps in Production

- **Domino's Pizza Espana** -- production Capacitor app
- **KAI Access** (Indonesian railway) -- 13.5M downloads, transportation/logistics sector
- **GetTransfer.com** -- 2.8M downloads, travel transfer booking and logistics
- **Multiple banking apps** -- 28M+ downloads, demonstrating enterprise reliability
- **Government health apps** -- 21.8M downloads, demonstrating scale

### Delivery/Logistics Specifically

No publicly documented "building materials delivery app built with Capacitor" exists. However:
- The Transistorsoft background geolocation plugin is explicitly used in fleet tracking and logistics
- Capacitor apps handle 13.5M+ downloads in the transportation sector
- The plugin ecosystem covers every feature a delivery app needs

### Real-World Performance

- WebView rendering is adequate for form-heavy, list-based apps
- Map rendering (MapLibre) maintains 60fps on modern devices
- SQLite operations are near-instantaneous for typical delivery app data volumes
- Background GPS (Transistorsoft) is proven in fleet tracking with good battery life

---

## 11. Capacitor + MapLibre for Offline Maps

### MapLibre GL JS in Capacitor

MapLibre GL JS runs in the WebView. It is a JavaScript library -- it works in Capacitor the same way it works in a browser.

### Offline Maps with PMTiles

**PMTiles**: Single-file tile archives that can be read with HTTP range requests or loaded locally.

**Approach for offline delivery maps:**
1. Pre-download PMTiles file for the delivery area (city/region)
2. Store on device filesystem via Capacitor Filesystem plugin
3. MapLibre reads tiles from local file
4. No network needed for map rendering

**Existing work**: `@yermo/maplibre-gl-capacitor-offline` -- a MapLibre GL JS build capable of reading local mbtiles in Capacitor. Tested on Android and iOS.

### Performance on Mobile

- MapLibre's worker architecture maintains 60fps on modern devices
- WebGPU backend (experimental) promises 2x fps improvement on Apple Silicon
- Split cache system (sprites, fonts, PMTiles directories, tiles) each with configurable limits
- Sprites and fonts are cached, speeding up vector map rendering

### Compared to Native Map SDKs

| Aspect | MapLibre GL JS (WebView) | Native MapLibre / Mapbox |
|--------|--------------------------|--------------------------|
| Rendering | WebGL in WebView | OpenGL/Metal native |
| FPS on modern devices | 60fps typical | 60fps typical |
| FPS on low-end Android | May drop below 60 | More consistent |
| Offline tiles | PMTiles, mbtiles | Built-in offline packs |
| Customization | Full CSS/JS control | Native APIs |
| Integration effort | Drop-in (it's just JS) | Requires Capacitor plugin |

### Real-World Example

Humanitarian OpenStreetMap Team uses MapLibre + PMTiles for offline field-mapping on tablets in rural Zambia with no cloud connectivity. This is the same use case pattern as offline delivery maps.

### Recommendation

MapLibre GL JS in Capacitor is **more than adequate** for a delivery driver map. You get:
- Turn-by-turn route display
- Delivery stop markers
- Driver location tracking
- Offline map tiles via PMTiles
- All with standard web JavaScript

Only consider a native map SDK if you need: 3D building rendering at scale, complex map animations, or are targeting very low-end devices.

---

## Overall Verdict: Can Capacitor Match Expo for This Use Case?

### YES, with caveats.

**Capacitor can absolutely build a production building materials delivery driver app.** Here is the honest assessment:

| Feature | Capacitor | Expo | Winner |
|---------|-----------|------|--------|
| Background GPS | Transistorsoft ($399) -- excellent | expo-location -- good, free | Tie (both work, Capacitor costs more but may be more battle-tested for logistics) |
| Offline SQLite | @capacitor-community/sqlite -- mature | expo-sqlite -- mature | Tie |
| Offline sync | PowerSync Capacitor SDK (stable) | PowerSync React Native SDK (stable) | Tie |
| Camera/POD photos | @capacitor/camera -- solid | expo-camera -- solid | Tie |
| Barcode scanning | ML Kit plugin -- excellent | expo-barcode-scanner -- good | Slight Capacitor edge (ML Kit directly) |
| Push notifications | Firebase plugin -- standard | Expo Push -- simpler initial setup | Expo slightly easier to start, converges long-term |
| Biometric auth | Multiple plugins available | expo-local-authentication | Tie |
| Offline maps | MapLibre GL JS -- native to web | MapLibre via react-native-maplibre | Capacitor edge (JS library, no bridge overhead) |
| PWA fallback | Built-in (it IS a web app) | Not a real PWA | **Capacitor wins decisively** |
| OTA updates | Capgo ($12/mo) | EAS Updates | Tie |
| Performance on low-end devices | WebView floor | Native rendering | **Expo wins** |
| Team skill reuse (web devs) | Full reuse | Must learn RN | **Capacitor wins** |
| Community/ecosystem size | Smaller | Larger | **Expo wins** |

### The Decisive Factors for YOUR Case

1. **Your team is web-first** (React, TypeScript, Tailwind). Capacitor lets them build the driver app without learning React Native.
2. **PWA fallback is valuable** for a delivery app. If a driver's native app crashes, they can use the web version.
3. **The main platform is TanStack Start web app**. Sharing components and types between the web app and a Capacitor driver app is trivial. Sharing between TanStack Start and Expo requires bridging two different rendering systems.
4. **PowerSync works with Capacitor** (as of late 2025). This was previously a blocker -- it is no longer.

### Recommended Architecture

```
Driver App Stack:
├── Vite + React + TanStack Router + TanStack Query (SPA)
├── Capacitor (native wrapper)
├── PowerSync + @capacitor-community/sqlite (offline-first sync)
├── @transistorsoft/capacitor-background-geolocation ($399)
├── @capacitor/camera (POD photos)
├── @capacitor-mlkit/barcode-scanning (material scanning)
├── @capacitor-firebase/messaging (push notifications)
├── @capgo/capacitor-native-biometric (biometric auth)
├── MapLibre GL JS + PMTiles (offline maps)
├── Supabase JS SDK (auth, realtime, storage)
└── Capgo (OTA updates, $12/mo)
```

**Total additional cost**: ~$399 one-time (GPS) + ~$144/year (OTA) = ~$543 first year, ~$144/year ongoing.

---

## Sources

- [Transistorsoft Capacitor Background Geolocation](https://www.transistorsoft.com/shop/products/capacitor-background-geolocation)
- [Transistorsoft GitHub](https://github.com/transistorsoft/capacitor-background-geolocation)
- [PowerSync Capacitor SDK Announcement](https://www.powersync.com/blog/introducing-the-powersync-capacitor-sdk)
- [PowerSync Capacitor Docs](https://docs.powersync.com/client-sdks/reference/capacitor)
- [@capacitor-community/sqlite GitHub](https://github.com/capacitor-community/sqlite)
- [Capgo OTA Updates](https://capgo.app/)
- [Capgo 2025 Year in Review](https://capgo.app/blog/capgo-2025-year-in-review/)
- [ML Kit Barcode Scanning for Capacitor](https://capawesome.io/plugins/mlkit/barcode-scanning/)
- [Capacitor Push Notifications Guide](https://capawesome.io/blog/the-push-notifications-guide-for-capacitor/)
- [TanStack Start + Capacitor Tutorial](https://dev.to/aaronksaunders/tanstack-start-to-mobile-building-robust-apps-with-capacitor-24ae)
- [TanStack Start + Capacitor Template (GitHub)](https://github.com/aaronksaunders/tanstack-capacitor-mobile-1)
- [Capacitor PWA Documentation](https://capacitorjs.com/docs/web/progressive-web-apps)
- [Ionic's Future Announcement](https://ionic.io/blog/important-announcement-the-future-of-ionics-commercial-products)
- [Capacitor Backlog Health](https://ionic.io/blog/keeping-capacitors-backlog-healthy)
- [Top Capacitor Apps](https://capgo.app/top_capacitor_app/)
- [MapLibre GL Capacitor Offline](https://github.com/Yermo/maplibre-gl-capacitor-offline)
- [MapLibre GL JS](https://maplibre.org/)
- [Capawesome Biometrics Plugin](https://capawesome.io/plugins/biometrics/)
- [Supabase Native Mobile Deep Linking](https://supabase.com/docs/guides/auth/native-mobile-deep-linking)
- [Capgo Supabase Social Login Setup](https://capgo.app/blog/setup-supabase-with-capacitor-social-login/)
- [Supabase + PowerSync Integration](https://supabase.com/partners/integrations/powersync)
- [Capacitor vs React Native (nextnative.dev)](https://nextnative.dev/blog/capacitor-vs-react-native)
- [Apple Policy Updates for Capacitor Apps 2025](https://capgo.app/blog/apple-policy-updates-for-capacitor-apps-2025/)
- [Capacitor App Deployment Guide](https://capacitorjs.com/docs/guides/deploying-updates)
- [TanStack Start SPA Mode Docs](https://tanstack.com/start/latest/docs/framework/react/guide/spa-mode)
