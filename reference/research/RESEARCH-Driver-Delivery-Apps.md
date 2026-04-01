> ⚠️ **REFERENCE DOCUMENT — NOT THE SOURCE OF TRUTH**
> This file was written during the research phase and may contain outdated decisions, US-centric references, or superseded technical choices.
> **Always defer to `essential/RESEARCH.md` for current decisions.**
> Key changes since this file was written: TanStack Start (not Next.js), Capacitor (not Expo), React Aria (not shadcn), Egyptian law (not US FMCSA), EGP (not USD), dual auth pools, no online payments, no mobile wallets, spatial glass UI (not traditional dashboards).

# Driver / Delivery App Research for Building Materials Logistics
## Current Findings as of 2025-2026

---

## 1. Features of Modern Delivery Driver Apps

### Core Feature Set (Industry Standard 2025-2026)

**GPS Tracking & Navigation**
- Real-time GPS visibility across entire fleet -- dispatchers see every driver's location and route progress
- Turn-by-turn navigation integrated into the driver workflow (not a separate app)
- Specialized delivery GPS apps combined with route optimization deliver 40% higher route efficiency vs. standalone navigation
- Live route editing -- dispatchers can modify stops mid-route and drivers receive updates instantly
- Leading apps: Upper, Circuit, Onfleet, Track-POD, Detrack all integrate navigation directly

**Route Optimization**
- AI-powered route optimization saves 2+ hours daily per driver by calculating optimal stop sequences in seconds
- Considers: time windows, priority stops, vehicle capacity constraints, traffic patterns, job site accessibility
- 2026 advancement: AI trained on millions of deliveries can dynamically reorder stops mid-route in response to live traffic conditions
- Auto-dispatch can weave on-demand orders into active routes in real time
- Platforms surface delay risk earlier in the day using predictive analytics

**Delivery Sequence Management**
- Optimized stop ordering with drag-and-drop manual overrides
- Priority flagging for time-sensitive deliveries
- Dependency management (e.g., concrete must arrive before rebar)
- Customer time-window enforcement with alerts

**Proof of Delivery (POD)**
- Photo capture: multiple photos per stop for visual confirmation
- Electronic signatures: legal standing under U.S. E-SIGN Act
- GPS-stamped timestamps on every delivery event
- Driver notes field for special conditions
- Customizable POD forms (checkboxes, dropdowns, text fields)
- POD data automatically shared with customers in real time

**Barcode / QR Scanning**
- Camera-based scanning (no external hardware needed)
- Scan-and-count for multi-item orders
- Each barcode read takes <0.2 seconds vs. several seconds manual entry
- Drivers using scanners process 25-40% more packages per hour
- Over a full shift, saved time equals 1-2 extra delivery stops
- Supports partial delivery and overdelivery quantity tracking

**Load Verification**
- Pre-departure load scanning to confirm all items are on truck
- Item count verification against manifest
- Weight/quantity confirmation fields
- Photo documentation of loaded truck
- Mismatch alerts before departure

**Damage Reporting**
- Photo capture of damaged items at pickup and delivery
- Timestamped damage documentation with GPS coordinates
- Pre-defined damage categories (crushed, wet, broken, missing)
- Integration with claims/returns workflow
- Attach damage photos to specific line items

**Customer Communication**
- Automated ETA notifications (SMS, email, push)
- "Driver is X minutes away" alerts
- Two-way messaging between driver and customer
- Delivery preparation instructions sent ahead of arrival
- Post-delivery rating/feedback collection

**Break / Availability Status**
- Driver status toggles: Available, On Break, Off Duty, En Route
- HOS (Hours of Service) compliance tracking for CDL drivers
- Break time reminders and mandatory rest period enforcement
- Real-time availability visible to dispatchers

### Advanced 2026 Features
- AI-driven mid-route dynamic reoptimization based on urban sensor data
- Predictive delay risk surfaced before problems occur
- Auto-dispatch weaving on-demand orders into active routes
- Computer vision for package condition assessment
- Voice-first interfaces for hands-free operation

---

## 2. Building Materials Specific Delivery Challenges

### The Scale of the Problem
- Global construction industry: $15.78T (2024) growing to $16.45T (2025)
- Last-mile delivery represents 53% of total delivery costs
- 63% of time on large construction projects is consumed by non-construction activities -- waiting for materials is a primary cause
- Trucking industry shortage: ~78,000 drivers as of 2024

### Heavy / Oversized Item Challenges

**Weight & Dimensions**
- Building materials range from lumber bundles (2,000+ lbs) to drywall sheets (60 lbs each but awkward), concrete bags, steel beams, roofing materials
- Require specialized vehicles: flatbeds, boom trucks, semi-trailers
- Vehicle weight limits on roads/bridges must be factored into routing
- Pallet configurations vary widely -- driver app must show expected pallet count and dimensions

**How Apps Should Handle This**
- Vehicle capacity constraints in route optimization (weight AND volume)
- Vehicle type matching: assign appropriate truck to order
- Bridge/road weight limit awareness in navigation
- Loading sequence optimization: last delivery loaded first
- Special handling instructions prominently displayed per item

### Forklift / Crane Delivery

**Crane Operations**
- Crane offloading suitable for most residential addresses but requires sufficient space on side of lorry
- Must clear 3 metres from overhead power/telephone lines
- Driver app needs: overhead obstruction warnings, crane reach specifications, site clearance dimensions

**Forklift Operations**
- Ideal for large-scale projects with on-site equipment
- Provides flexibility for pallet movement and stacking in restricted access areas
- Driver app needs: confirm forklift availability at site, pallet specifications, unloading area location

**App Features Needed**
- Unloading method field per delivery: crane, forklift, manual, customer equipment
- Equipment availability confirmation from customer
- Safety checklist before unloading begins
- Clearance requirements displayed to driver
- Photo documentation of unloading area before and after

### Site Access Instructions

**Common Construction Site Barriers**
- Limited access: narrow roads, mud, steep grades
- No formal addresses -- GPS may be inaccurate
- Moving machinery, unstable surfaces, ongoing excavation
- Gate codes, security checkpoints, sign-in requirements
- Specific unloading locations within large sites

**App Features Needed**
- Site access notes with photos/maps (pin drop for exact unloading spot)
- Gate codes stored and displayed at arrival
- PPE requirements displayed before arrival (hard hat, hi-vis, steel toes)
- Plus Code or what3words integration for sites without street addresses
- Historical delivery notes: "Last time we used the south entrance"
- Geofence-triggered site instructions (auto-display when approaching)

### Safety Requirements

**Driver Safety at Construction Sites**
- PPE requirements vary by site (hard hat, safety vest, steel-toed boots)
- Site induction/orientation may be required for first visit
- Active construction hazards: overhead loads, excavations, heavy equipment
- OSHA compliance documentation

**App Features Needed**
- PPE checklist per site with acknowledgment
- Safety briefing display on first visit to new site
- Hazard alerts based on site conditions
- Incident reporting workflow
- Emergency contact information for site

### Partial Deliveries

**Common Scenarios**
- Backordered items shipped separately
- Phased construction requires materials at different stages
- Customer requests split delivery to match project timeline
- Some items damaged and need replacement

**App Features Needed**
- Line-item level delivery confirmation (not just order-level)
- Partial delivery reason codes
- Remaining items tracking with expected dates
- Customer acknowledgment of partial delivery
- Automatic follow-up delivery scheduling

### Returns / Refused Deliveries

**Common Scenarios**
- Wrong materials delivered
- Damaged goods on arrival
- Customer changed order / project cancelled
- No one available to receive
- Site not accessible

**App Features Needed**
- Refusal reason codes (wrong item, damaged, not ordered, site inaccessible)
- Photo documentation of refused items
- Return-to-warehouse routing
- Automatic dispatch notification
- Customer signature on refusal document
- Restocking workflow trigger

---

## 3. Offline-First Driver App Architecture

### Why Offline-First is Critical for Building Materials
- Construction sites frequently have poor or no cellular signal
- Underground parking, basements, remote job sites
- Drivers spend significant time in areas with spotty coverage
- App must never block the driver from doing their job due to connectivity

### Recommended Architecture: React Native/Expo + Supabase

#### Option A: PowerSync + Supabase (RECOMMENDED)

**How It Works**
1. PowerSync reads the Write Ahead Log (WAL) from Supabase Postgres
2. Maintains versioned data and syncs to embedded SQLite on device
3. App reads/writes to local SQLite -- feels instant (<200ms latency)
4. Changes queue locally and sync when connection returns
5. "Sync Streams" scope data per user (integrates with Row-Level Security)

**Advantages**
- No custom backend sync implementation needed
- Automatic RLS integration
- Causal+ consistency model (strong consistency guarantees)
- SDKs for React Native, Flutter, Web, Swift, Kotlin
- Real-time streaming when online

**Considerations**
- Commercial license with restrictions
- PowerSync service is a dependency (hosted or self-hosted)

#### Option B: WatermelonDB + Supabase

**How It Works**
1. WatermelonDB provides SQLite-based local storage on device
2. Two Postgres functions (push/pull) handle bidirectional sync via RPC
3. Push: local changes sent as JSON (created, updated, deleted records)
4. Pull: client requests all changes since last sync timestamp
5. Supabase Realtime triggers sync on other devices

**Advantages**
- Built specifically for React Native
- Handles tens of thousands of records with lazy loading
- Open source (MIT license)
- Proven in production apps

**Conflict Resolution**: Last-write-wins strategy -- latest change of a record wins

**Considerations**
- Requires custom backend sync functions in Postgres
- Schema changes require updates across 3 layers (WatermelonDB models, Postgres schema, sync functions)

#### Option C: RxDB + Supabase

**How It Works**
- Real-time NoSQL database built on RxJS
- Uses expo-sqlite via SQLite storage adapter
- Multiple replication plugins (HTTP, GraphQL, Supabase, custom)
- Reactive queries -- UI updates automatically when data changes

**Advantages**
- Most flexible replication options
- Strong real-time capabilities
- Cross-platform support

#### Comparison Matrix

| Feature | PowerSync | WatermelonDB | RxDB |
|---------|-----------|--------------|------|
| Sync complexity | Low (managed) | Medium (custom) | Medium (plugins) |
| Performance | Good | Best (lazy loading) | Good |
| Supabase integration | Native | Via RPC functions | Via plugin |
| Conflict resolution | Server-side | Last-write-wins | Configurable |
| License | Commercial | MIT | Apache 2.0 |
| React Native support | Yes | Yes (primary) | Yes |
| Offline writes | Queue-based | Sync engine | Replication |

#### Recommended Approach for Building Materials App

**Use PowerSync + Supabase** because:
1. Construction site connectivity is unreliable -- need robust offline
2. Driver data must sync correctly (no lost deliveries)
3. PowerSync's managed sync reduces development complexity
4. RLS integration means drivers only see their assigned deliveries
5. Causal+ consistency prevents data anomalies

**Key Implementation Patterns**
- Store delivery manifest locally before driver departs
- Queue all POD data (photos, signatures, scans) for upload
- Compress photos on-device before queuing (reduce sync payload)
- Conflict resolution: for delivery status changes, use server-side logic (not last-write-wins)
- Prefetch route data and map tiles for offline navigation

#### Other Libraries from Expo Local-First Guide

| Tool | Function | Notes |
|------|----------|-------|
| Legend-State | State management + sync | Fine-grained reactivity, Supabase integration |
| TinyBase | Reactive data store | Works with Yjs, SQLite, Expo Go |
| Yjs | CRDT implementation | Multi-client sync via Y.Array, Y.Map |
| LiveStore | Data layer | SQLite-based, high-performance |
| Turso | Database service | Bidirectional sync with conflict detection |

---

## 4. Real-Time Driver Tracking

### Architecture: Supabase Realtime for GPS Broadcasting

**Why Supabase Realtime (not raw WebSockets)**
- Built on Elixir/Phoenix -- handles massive concurrent connections
- Three primitives perfect for driver tracking:
  1. **Broadcast**: Send driver GPS to dispatchers/customers (low latency, ephemeral)
  2. **Presence**: Track which drivers are online/active with shared state
  3. **Postgres Changes**: Listen to delivery status updates in real time
- Global infrastructure -- client in US can receive updates from driver in another region
- Already part of your Supabase stack (no additional infrastructure)

**Implementation Pattern**
```
Driver App:
  1. Join channel: `delivery:{delivery_id}` or `fleet:{company_id}`
  2. Send GPS via Broadcast every N seconds
  3. Update Presence with driver status (driving, delivering, on break)

Dispatcher Dashboard:
  1. Subscribe to `fleet:{company_id}` channel
  2. Receive all driver GPS updates via Broadcast
  3. Track driver online/offline via Presence
  4. Listen to Postgres Changes for delivery status updates

Customer Tracking Page:
  1. Subscribe to `delivery:{delivery_id}` channel
  2. Receive GPS updates for their specific driver
  3. See ETA updates in real time
```

### GPS Collection on Device

**Primary: expo-location (Basic)**
- Good for foreground tracking
- Limited background capability in managed Expo workflow

**Production: react-native-background-geolocation (Recommended)**
- By Transistor Software -- industry standard for fleet apps
- Motion-detection using accelerometer, gyroscope, magnetometer
- GPS only activates when device is moving (80%+ battery savings)
- Configurable distanceFilter (meters between updates)
- Automatic sleep mode when vehicle is stationary
- Works with Expo via config plugin (requires dev client, not Expo Go)
- Supports geofencing (thousands of polygon zones with on-device AI)

**Battery Optimization Strategies**
1. Motion-based activation: GPS off when stationary, on when moving
2. Adaptive refresh rates:
   - Driving on highway: every 10-15 seconds
   - Driving in city: every 5-10 seconds
   - Stationary/parked: every 60 seconds or off entirely
   - Approaching delivery: every 5 seconds (high accuracy)
3. Batch GPS points and send in groups rather than individual WebSocket messages
4. Use significant location changes (cell tower changes) as fallback when GPS is off
5. Reduce accuracy when fine precision isn't needed (saves battery)

### Refresh Rate Standards (2025)

| Use Case | Refresh Rate | Notes |
|----------|-------------|-------|
| Live fleet map (dispatcher) | 10-15 seconds | Balance between smoothness and bandwidth |
| Customer tracking page | 15-30 seconds | Less frequent is fine for ETA display |
| Approaching delivery | 5 seconds | High accuracy for arrival detection |
| Parked/idle | 60 seconds or off | Conserve battery |
| Geofence detection | Continuous (low power) | Uses cell towers + WiFi, not GPS |

### WebSocket vs Polling

**WebSocket (via Supabase Realtime) -- USE THIS**
- Full-duplex: server pushes updates instantly
- Single persistent connection (low overhead)
- Real-time feel for dispatchers watching fleet
- Supabase handles connection management, reconnection, auth

**HTTP Polling -- AVOID**
- Creates unnecessary server load (constant requests)
- Higher latency (gaps between polls)
- More battery drain on mobile (wake radio for each request)
- Only use as fallback if WebSocket connection fails

### Scaling Considerations
- Supabase Realtime built on Elixir/Phoenix (handles millions of connections)
- Use channel segmentation: `fleet:{company_id}` for dispatchers, `delivery:{id}` for customers
- Customer channels are short-lived (only active during delivery window)
- Consider rate limiting broadcasts from driver to prevent flooding

---

## 5. Route Optimization

### API Comparison for Delivery Route Optimization

#### Google Maps Platform

**Strengths**
- Best real-time traffic data
- Most accurate global map data
- Familiar to all drivers
- Routes Preferred API for fleet-specific optimization

**Limitations**
- Expensive at scale: $5-$30 per 1,000 calls depending on SKU
- Distance matrix limited to 25x25
- No built-in VRP solver (must combine with third-party)
- Can add up to thousands/month for active fleet

**Best For**: Customer-facing tracking maps, navigation fallback

#### Mapbox

**Strengths**
- Significantly cheaper than Google Maps at all tiers
- Free tier available, no upfront licenses
- Optimization v2 API (Beta): time windows, vehicle capacity, driver shifts, pickup/dropoff constraints
- Superior performance: 1.8s WiFi load, 45MB initial memory
- Lowest battery drain: 8.2%/hr
- Customizable map styles

**Limitations**
- Optimization v2 still in Beta
- Traffic data less comprehensive than Google in some regions
- Matrix limited to 25x25 (same as Google)

**Best For**: In-app maps, turn-by-turn navigation, basic route optimization

#### HERE Maps

**Strengths**
- Enterprise-grade: 200+ countries
- Full offline map support (critical for construction sites)
- 5-year historical speed data for accurate ETAs
- Strong fleet management APIs
- Flexible routing API with truck-specific profiles (height, weight, hazmat)

**Limitations**
- Enterprise pricing (contact sales)
- Less developer community than Google/Mapbox

**Best For**: Truck routing with vehicle constraints, offline maps

#### OSRM (Open Source Routing Machine)

**Strengths**
- Completely free (self-hosted)
- Fastest query performance -- milliseconds even for 1,000+ km routes
- Matrix API handles millions of results in seconds
- Used by Mapbox, Pinterest, Foursquare in production
- Contraction Hierarchies algorithm for blazing speed

**Limitations**
- No real-time traffic (uses static speed data from OSM)
- No built-in VRP solver (pair with VROOM)
- High RAM requirements for precomputed data
- Cannot customize routing preferences at runtime
- Requires infrastructure to host and maintain

**Best For**: High-volume distance matrix calculations, backend routing engine

#### Valhalla (Open Source)

**Strengths**
- Low memory footprint -- runs on constrained devices
- Runtime-customizable routing parameters (per-request costing)
- Truck routing profiles (height, weight, axle load)
- Time-based routing, isochrones, multi-modal
- Tiled data architecture (streaming-friendly, cacheable)
- Used by Tesla for navigation

**Limitations**
- Slower than OSRM for raw query speed
- No real-time traffic out of box
- Single-threaded initialization

**Best For**: On-device routing, truck-specific routing, flexible route customization

#### VROOM (Vehicle Routing Open-source Optimization Machine)

**Strengths**
- Purpose-built VRP solver
- Supports: time windows, service duration, vehicle capacity on arbitrary metrics, skills, driver breaks, working hours
- Full integration with OSRM, Valhalla, and Openrouteservice
- Solves complex multi-vehicle routing in milliseconds
- Open source

**Best For**: Multi-stop route optimization with constraints

### Recommended Stack for Building Materials Delivery

```
NAVIGATION (driver-facing):
  Mapbox Navigation SDK
  - Turn-by-turn with customizable UI
  - Low battery drain
  - Offline map tile caching for construction sites

ROUTE OPTIMIZATION (backend):
  VROOM + OSRM (self-hosted)
  - OSRM for distance/time matrix calculations
  - VROOM for VRP solving with constraints:
    * Vehicle weight/volume capacity
    * Delivery time windows
    * Driver shift hours and breaks
    * Forklift/crane equipment requirements (skills)
    * Site access hours

CUSTOMER TRACKING MAP:
  Mapbox GL JS (web) or Google Maps (if budget allows)
  - Show driver location on map
  - ETA display

TRUCK ROUTING:
  Valhalla or HERE Maps
  - Truck-specific profiles (weight limits, height clearance)
  - Bridge/tunnel restrictions
  - Hazmat routing if applicable
```

### Multi-Stop Optimization Considerations

**For Building Materials Specifically**
- Loading sequence matters: optimize for LIFO (last delivery loaded first)
- Weight distribution: heavier items loaded over axles
- Mixed delivery types: some need crane, some forklift, some hand-unload
- Time windows are critical: concrete has a pour window, lumber before framing crew arrives
- Partial loads: truck may need to return to warehouse mid-route
- Site access hours: many construction sites have strict delivery windows (7am-3pm)

---

## 6. Driver App UX Best Practices

### Touch Targets & Sizing

**Minimum Standards**
- iOS: 44x44pt minimum for all tappable elements
- Android: 48x48dp minimum
- For driver apps (gloves, vibration, distraction): use 56-64dp MINIMUM
- Primary action buttons (Complete Delivery, Navigate): 72dp+ height
- Spacing between buttons: minimum 8dp to prevent mis-taps

### One-Hand Operation

**Critical Design Principle**
- 72.56% of users operate smartphones with one hand (right hand dominant)
- Place all primary actions in the bottom 40% of screen (thumb reach zone)
- Use bottom sheet navigation, not top menus
- Swipe gestures for common actions (swipe to complete, swipe to call)
- Avoid small targets in top corners

**Screen Layout Pattern**
```
TOP:     Status bar, delivery info (read-only, glanceable)
MIDDLE:  Map or delivery details (scrollable)
BOTTOM:  Primary action buttons (thumb zone)
         [Navigate]  [Complete]  [Issue]
```

### Voice Input

**Implementation**
- Voice is the least-distracting modality for in-vehicle technology
- Use for: notes, damage descriptions, delivery instructions lookup
- "Hey [App], mark delivery complete" pattern
- Voice-to-text for all text input fields
- Pre-built voice commands for common actions
- Confirm voice actions with haptic feedback (not just visual)

### Dark Mode for Night Driving

**Requirements**
- Automatic dark mode based on time of day or ambient light sensor
- True dark mode (OLED black, not dark grey) saves battery and reduces eye strain
- High contrast for critical buttons (bright green for navigate, bright red for issues)
- Flashlight integration for night-time barcode scanning
- Reduce screen brightness automatically when in navigation mode

### Minimal Typing

**Strategies**
- Pre-defined options for common inputs (damage types, refusal reasons, delivery notes)
- Tap-to-select instead of type wherever possible
- Smart defaults: auto-fill common values
- Voice-to-text as primary text input method
- Photo capture instead of written descriptions
- Barcode scanning instead of manual item entry

### Patterns from Major Delivery Apps

**Amazon Flex**
- Route itinerary with all stops visible at a glance
- One-tap navigation to next stop
- Integrated camera for POD photos
- Block-based scheduling (accept delivery blocks in advance)
- Hands-free voice navigation
- Research shows UX issues: GPS inaccuracies, task flow inefficiencies, package sorting difficulties

**UPS (DIAD Device)**
- Dedicated hardware device (not phone-based) -- purpose-built for delivery
- ORION route optimization software
- Physical buttons for gloved operation
- Rugged design for drops and weather
- Lesson: purpose-built UX beats general-purpose

**FedEx (DRO - Dynamic Route Optimization)**
- Dynamic route reoptimization during the day
- Ground drivers use personal devices with FedEx app
- Express drivers use dedicated scanners
- Lesson: dynamic reoptimization is table stakes

**DoorDash**
- Dark mode available ("easier on the eyes at night")
- Simple accept/decline flow
- Large map with clear next-stop indicator
- Swipe-to-complete pattern
- Lesson: simplicity wins for driver satisfaction

### Driver App Screen Flow (Recommended)

```
1. LOGIN / SHIFT START
   - One-tap biometric login
   - Today's route summary (# stops, estimated hours)
   - Vehicle inspection checklist (if required)

2. LOAD VERIFICATION
   - Scan items onto truck
   - Mismatch warnings
   - Loading sequence guidance (LIFO)
   - Photo of loaded truck

3. EN ROUTE (main screen during driving)
   - Large map with next stop highlighted
   - ETA to next stop
   - Bottom bar: next delivery summary
   - Minimal info -- driver should be watching the road

4. APPROACHING DELIVERY
   - Geofence triggers detail view
   - Site access instructions appear
   - PPE requirements displayed
   - Unloading method reminder (crane/forklift/manual)
   - Customer contact button

5. AT DELIVERY
   - Item checklist (scan or manual check)
   - Unloading instructions
   - Damage inspection
   - POD capture: photo + signature
   - Partial delivery option
   - Refuse delivery option

6. DELIVERY COMPLETE
   - Swipe to confirm
   - Auto-navigate to next stop
   - Running tally: X of Y deliveries complete

7. END OF DAY
   - Route summary
   - Issues/exceptions log
   - Vehicle return checklist
```

---

## 7. Driver App Notification Patterns

### Notification Categories & Priority

**Critical (Immediate, Cannot Miss)**
- New delivery assigned
- Route changed by dispatch
- Delivery cancelled while en route
- Safety alert for destination
- Customer requests urgent callback

**Important (Timely, Should See Soon)**
- Customer message received
- Approaching delivery geofence
- Traffic delay affecting ETA
- Break reminder (HOS compliance)
- Load ready for pickup

**Informational (Can Wait)**
- Daily route published
- Schedule change for tomorrow
- Performance summary
- System maintenance notice

### Push Notification Implementation

**Expo Push Notifications (Recommended for React Native/Expo)**
- expo-notifications library
- Expo Push Notification Service handles token management
- Works on iOS (APNs) and Android (FCM) with single API
- Support for notification categories with action buttons

**Notification Patterns**

```
NEW DELIVERY ASSIGNED:
  Title: "New Delivery Added"
  Body: "Order #1234 - 3 pallets lumber to 123 Main St"
  Actions: [Accept] [View Details]
  Sound: distinct chime
  Priority: HIGH

ROUTE CHANGE:
  Title: "Route Updated"
  Body: "Stop #4 moved to position #2 - Priority change"
  Actions: [View Route] [Call Dispatch]
  Sound: alert tone
  Priority: HIGH

CUSTOMER MESSAGE:
  Title: "Message from John (Stop #3)"
  Body: "Gate code is 4521, use south entrance"
  Actions: [Reply] [View]
  Sound: message tone
  Priority: NORMAL

APPROACHING DELIVERY:
  Title: "Arriving at Stop #3"
  Body: "PPE Required: Hard hat, Safety vest"
  Actions: [View Instructions]
  Sound: gentle chime
  Priority: NORMAL
  Trigger: Geofence (500m from site)

DISPATCH ALERT:
  Title: "Dispatch: Call Required"
  Body: "Customer at Stop #5 not available - call dispatch"
  Actions: [Call Dispatch] [View Details]
  Sound: urgent tone
  Priority: HIGH
```

### In-App Notification Patterns

**Persistent Banner (While Driving)**
- Slide-down banner for new assignments
- Auto-dismiss after 10 seconds
- Tap to expand, swipe to dismiss
- Never cover the map during navigation

**Full-Screen Interstitial (When Stopped)**
- Route change confirmation
- New delivery details
- Safety briefings
- Only show when vehicle is stationary (use motion detection)

**Badge Counts**
- Unread messages count on Messages tab
- Exception count on Issues tab
- New assignment count on Route tab

### Notification Channels (Android)

Configure separate Android notification channels for granular user control:
```
critical_dispatch    - Dispatch alerts (cannot silence)
route_updates        - Route changes
customer_messages    - Customer communications
delivery_reminders   - Approaching delivery
system_info          - General notifications (can silence)
```

### Multi-Channel Delivery Strategy

- Push notification as primary channel
- In-app notification as backup (for when push fails)
- SMS fallback for critical dispatch messages
- Audible alerts with distinct sounds per notification type
- Haptic feedback for critical notifications
- Do Not Disturb override for safety-critical alerts

### Reducing Notification Fatigue
- Group related notifications (don't send 5 separate "route updated" messages)
- Smart timing: batch non-critical notifications
- Allow drivers to customize notification preferences
- Mute customer messages while driving (queue for next stop)
- Summary notifications at shift start instead of individual messages

---

## Technical Stack Recommendation Summary

```
FRAMEWORK:        React Native with Expo (managed workflow + dev client)
BACKEND:          Supabase (Postgres + Auth + Realtime + Storage)
OFFLINE SYNC:     PowerSync + Supabase
LOCAL DB:         SQLite (via PowerSync SDK)
MAPS/NAV:         Mapbox Navigation SDK (driver) + Mapbox GL (web dashboard)
ROUTE ENGINE:     VROOM + OSRM (self-hosted) for optimization
TRUCK ROUTING:    Valhalla (vehicle profiles) or HERE Maps API
GPS TRACKING:     react-native-background-geolocation (Transistor Software)
REAL-TIME:        Supabase Realtime (Broadcast + Presence)
PUSH NOTIFS:      expo-notifications + Expo Push Service
BARCODE SCAN:     expo-camera or react-native-vision-camera
PHOTO STORAGE:    Supabase Storage (compressed on-device before upload)
STATE MGMT:       Zustand or Legend-State
```

---

## Sources

- [Top GPS Apps for Delivery Drivers 2026](https://www.upperinc.com/blog/best-gps-for-delivery-drivers/)
- [Detrack - Delivery Software](https://www.detrack.com/)
- [Best Last Mile Delivery Software 2026](https://cigotracker.com/blog/last-mile-delivery-software-2026/)
- [DispatchTrack - Construction Material Delivery App](https://www.dispatchtrack.com/blog/construction-material-delivery-app)
- [Construction Material Delivery to Site Safely](https://mercer-trans.com/2025/05/27/how-to-get-construction-material-to-site/)
- [Fero - Building Materials Delivery](https://feronow.com/building-materials-delivery/)
- [GoShare - Construction Materials Delivery](https://goshare.co/service/construction-materials-delivery-app/)
- [Expo Local-First Architecture Guide](https://docs.expo.dev/guides/local-first/)
- [Supabase - Offline-First with WatermelonDB](https://supabase.com/blog/react-native-offline-first-watermelon-db)
- [PowerSync - Offline-First for Supabase](https://www.powersync.com/blog/bringing-offline-first-to-supabase)
- [Morrow - Building Offline-First App with Expo + WatermelonDB + Supabase](https://www.themorrow.digital/blog/building-an-offline-first-app-with-expo-supabase-and-watermelondb)
- [Fintech Mobile Architecture with Expo + Supabase](https://medium.com/@seyhunak/fintech-mobile-architecture-clean-architecture-react-native-expo-supabase-backend-with-zustand-5857fb7a531f)
- [Navixy WebSocket API for Real-Time Data](https://www.navixy.com/blog/navixy-websocket-api-real-time-data-exchange/)
- [Real-Time Location Tracking with WebSockets](https://slaptijack.com/programming/implementing-real-time-location-tracking-with-websockets.html)
- [Damoov - Real-Time GPS Tracking API](https://docs.damoov.com/docs/live-gps-tracking)
- [Supabase Realtime - Broadcast](https://supabase.com/docs/guides/realtime/broadcast)
- [Supabase Realtime - Presence](https://supabase.com/docs/guides/realtime/presence)
- [OSRM vs Valhalla Comparison (Telenav)](https://github.com/Telenav/open-source-spec/blob/master/osrm/doc/osrm-vs-valhalla.md)
- [VROOM - Vehicle Routing Optimization](http://vroom-project.org/)
- [Mapbox Optimization API v2](https://docs.mapbox.com/api/navigation/optimization/)
- [NextBillion.ai - Route Optimization Tools](https://nextbillion.ai/blog/top-open-source-tools-for-route-optimization)
- [Amazon Flex UX Case Study](https://medium.com/@mikeatripoli/case-study-revamping-the-ux-design-of-amazons-flex-app-for-delivery-drivers-22d073ac575f)
- [React Native Background Geolocation](https://github.com/transistorsoft/react-native-background-geolocation)
- [Expo Location Documentation](https://docs.expo.dev/versions/latest/sdk/location/)
- [PowerSync - React Native Local Database Options](https://www.powersync.com/blog/react-native-local-database-options)
- [RxDB - React Native Database](https://rxdb.info/react-native-database.html)
- [Mobile App Design Best Practices 2025](https://gegobyteapps.com/resources/mobile-app-design-best-practices)
- [Voice UI Design Best Practices 2025](https://lollypop.design/blog/2025/august/voice-user-interface-design-best-practices/)
- [Elite EXTRA - Proof of Delivery Apps 2025](https://eliteextra.com/reviewed-ranked-a-guide-to-best-proof-of-delivery-apps/)
- [Onfleet - Proof of Delivery Apps 2026](https://onfleet.com/blog/proof-of-delivery-apps-couriers/)
- [Upper - Delivery Barcode Scanner App 2025](https://www.upperinc.com/blog/delivery-barcode-scanner-app/)
- [Routific - Delivery Notifications](https://www.routific.com/blog/delivery-notifications)
- [Smart Push Notification Strategies 2025](https://retailtechinnovationhub.com/home/2025/5/26/smart-push-notification-strategies-from-todays-leading-food-delivery-case-studies)
- [Courier - Notification Infrastructure Software 2025](https://www.courier.com/blog/best-notification-infrastructure-software-2025)
- [DispatchTrack - Construction Material Delivery Features](https://www.dispatchtrack.com/blog/construction-material-delivery-app-what-to-look-for/)
- [Brickhunter - Brick Transport and Delivery Guide](https://brickhunter.com/blog/your-guide-to-brick-transport)
