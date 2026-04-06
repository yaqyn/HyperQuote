---
phase: 21-dispatch-module
plan: 01b
type: execute
wave: 1
depends_on: [21-01a]
files_modified:
  - apps/internal/src/lib/server/dispatch.ts
  - apps/internal/src/components/dispatch/DispatchModule.tsx
  - apps/internal/src/components/dispatch/DispatchTabStrip.tsx
  - apps/internal/src/components/dispatch/DispatchShortcuts.tsx
  - apps/internal/src/components/dispatch/home/DispatchHomeView.tsx
  - apps/internal/src/components/dispatch/shared/CapacityBar.tsx
  - apps/internal/src/components/dispatch/shared/ConstraintBadge.tsx
  - apps/internal/src/components/dispatch/shared/MapSkeleton.tsx
  - apps/internal/src/components/shell/ModuleWindow.tsx
autonomous: true
requirements: [DISP-01, DISP-02, DISP-03]

must_haves:
  truths:
    - "Server functions return mock data for dispatch board, driver list, driver locations, routes, and POD"
    - "ModuleWindow renders DispatchModule when moduleId is 'dispatch'"
    - "DispatchHomeView shows today's delivery counts, fleet status, alerts, and weather warnings"
    - "DispatchTabStrip shows all 5 tabs and switches via store"
    - "Shared components (CapacityBar, ConstraintBadge, MapSkeleton) available for Wave 2 plans"
  artifacts:
    - path: "apps/internal/src/lib/server/dispatch.ts"
      provides: "All dispatch server functions with mock data"
      exports: ["getDispatchBoard", "getDriverList", "getDriverLocations", "createShipment", "optimizeRoute", "reassignDriver", "confirmDeliveryPOD", "flagDeliveryIssue", "publishRoutes", "getDeliveryAnalytics"]
    - path: "apps/internal/src/components/dispatch/DispatchModule.tsx"
      provides: "Root dispatch module with home tab only — other tabs added in Plan 05"
      exports: ["DispatchModule"]
    - path: "apps/internal/src/components/shell/ModuleWindow.tsx"
      provides: "Dispatch module lazy registration"
      contains: "DispatchModule"
  key_links:
    - from: "apps/internal/src/components/dispatch/DispatchModule.tsx"
      to: "apps/internal/src/stores/dispatch.ts"
      via: "useDispatchStore"
      pattern: "useDispatchStore"
    - from: "apps/internal/src/components/shell/ModuleWindow.tsx"
      to: "apps/internal/src/components/dispatch/DispatchModule.tsx"
      via: "lazy import"
      pattern: "import.*DispatchModule"
    - from: "apps/internal/src/components/dispatch/home/DispatchHomeView.tsx"
      to: "apps/internal/src/lib/server/dispatch.ts"
      via: "getDispatchBoard"
      pattern: "getDispatchBoard"
---

<objective>
Server functions (mock data), DispatchModule shell with home view, tab strip, shortcuts, shared UI components (CapacityBar, ConstraintBadge, MapSkeleton), and ModuleWindow registration.

Purpose: Build the module shell and all shared components so Wave 2 plans can build feature views in parallel without conflicts.
Output: Working dispatch module shell with home tab, all server functions available, shared components ready.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/21-dispatch-module/21-CONTEXT.md
@.planning/phases/21-dispatch-module/21-RESEARCH.md
@.planning/phases/21-dispatch-module/21-01a-SUMMARY.md
@apps/internal/src/components/finance/FinanceModule.tsx
@apps/internal/src/components/finance/FinanceTabStrip.tsx
@apps/internal/src/components/finance/FinanceShortcuts.tsx
@apps/internal/src/components/finance/home/FinanceHome.tsx
@apps/internal/src/components/shell/ModuleWindow.tsx
@apps/internal/src/components/warehouse/WarehouseShortcuts.tsx
@apps/portal/src/components/orders/DeliveryMap.tsx

<interfaces>
<!-- From Plan 01a outputs -->
From apps/internal/src/types/dispatch.ts:
```typescript
export type DispatchTab = 'home' | 'route-planning' | 'live-map' | 'driver-management' | 'delivery-log'
export type VehicleStatus = 'loading' | 'transit' | 'at_site' | 'delivered' | 'problem' | 'offline'
export type DriverType = 'INTERNAL' | 'CONTRACTED' | 'ON_DEMAND'
export interface DeliveryRoute { id: string; driverId: string; vehicleId: string; stops: RouteStop[]; date: string; status: string; totalWeight: number; totalDistance: number; estimatedDuration: number }
export interface RouteStop { id: string; deliveryId: string; orderId: string; customerName: string; address: string; lat: number; lng: number; weight: number; equipmentNeeded: string; timeWindow: { start: string; end: string }; sequence: number; status: string }
export interface Vehicle { id: string; plateNumber: string; type: string; capacityKg: number; hasEquipment: { moffett: boolean; boom: boolean; crane: boolean }; currentDriverId: string; status: VehicleStatus }
export interface Driver { id: string; name: string; type: DriverType; phone: string; vehicleId: string; licenseExpiry: string; medicalExpiry: string; certifications: string[]; complianceStatus: string; activeRouteId: string | null; available: boolean }
export interface ConstraintViolation { type: string; message: string; severity: 'error' | 'warning' }
export interface GPSPosition { driverId: string; lat: number; lng: number; speed: number; heading: number; timestamp: string; status: VehicleStatus }
export interface DriverPerformance { driverId: string; onTimeRate: number; podComplianceRate: number; damageRate: number; avgDeliveriesPerDay: number; avgDeliveryDuration: number }
```

From apps/internal/src/stores/dispatch.ts:
```typescript
export const useDispatchStore: { activeTab, setActiveTab, selectedDriverId, setSelectedDriverId, selectedDeliveryId, setSelectedDeliveryId, selectedRouteId, setSelectedRouteId, mapViewport, setMapViewport, routePlanningDate, setRoutePlanningDate }
```

From apps/internal/src/lib/constraints.ts:
```typescript
export function validateAllConstraints(stop: RouteStop, driver: Driver, vehicle: Vehicle, date: Date, weather?: { windSpeedKmh: number }): ConstraintViolation[]
```

From apps/internal/src/components/shell/ModuleWindow.tsx:
```typescript
// Lazy import pattern for modules
const FinanceModule = lazy(() =>
  import('../finance/FinanceModule').then((m) => ({ default: m.FinanceModule })),
)
// Module rendering pattern: moduleId === 'finance' ? <FinanceModule /> : ...
```

From apps/internal/src/lib/modules.ts:
```typescript
// dispatch is already registered with id: 'dispatch', hotkey: 'D', permission: 'dispatch.read'
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Server functions with mock data</name>
  <files>
    apps/internal/src/lib/server/dispatch.ts
  </files>
  <read_first>
    apps/internal/src/lib/server/finance-dashboard.ts,
    apps/internal/src/types/dispatch.ts
  </read_first>
  <action>
    Create `apps/internal/src/lib/server/dispatch.ts` with ALL server functions returning mock data. Follow existing pattern from finance-dashboard.ts.

    Functions: getDispatchBoard, getDriverList, getDriverLocations, createShipment, optimizeRoute, reassignDriver, confirmDeliveryPOD, flagDeliveryIssue, publishRoutes, getDeliveryAnalytics.

    Mock data should include 3-4 drivers (mix of INTERNAL, CONTRACTED, ON_DEMAND types), 2-3 routes with realistic Cairo addresses/coordinates (Maadi, Heliopolis, 6th October City, Nasr City), 5-8 route stops per route, vehicle data with equipment flags, GPS positions near Cairo landmarks, POD records with mock photo URLs and quantities, and driver performance metrics.

    Each function should be typed against the dispatch.ts types. Use `createServerFn` from `@tanstack/react-start` if that pattern exists in finance-dashboard.ts, otherwise export plain async functions.
  </action>
  <verify>
    <automated>cd apps/internal && npx tsc --noEmit 2>&1 | head -30</automated>
  </verify>
  <done>All 10 server functions exported with realistic mock data covering Cairo addresses, driver types, vehicle equipment, POD records, and performance metrics.</done>
</task>

<task type="auto">
  <name>Task 2: DispatchModule shell, home view, tab strip, shortcuts, shared components, ModuleWindow</name>
  <files>
    apps/internal/src/components/dispatch/DispatchModule.tsx,
    apps/internal/src/components/dispatch/DispatchTabStrip.tsx,
    apps/internal/src/components/dispatch/DispatchShortcuts.tsx,
    apps/internal/src/components/dispatch/home/DispatchHomeView.tsx,
    apps/internal/src/components/dispatch/shared/CapacityBar.tsx,
    apps/internal/src/components/dispatch/shared/ConstraintBadge.tsx,
    apps/internal/src/components/dispatch/shared/MapSkeleton.tsx,
    apps/internal/src/components/shell/ModuleWindow.tsx
  </files>
  <read_first>
    apps/internal/src/components/finance/FinanceModule.tsx,
    apps/internal/src/components/finance/FinanceTabStrip.tsx,
    apps/internal/src/components/finance/FinanceShortcuts.tsx,
    apps/internal/src/components/finance/home/FinanceHome.tsx,
    apps/internal/src/components/shell/ModuleWindow.tsx,
    apps/internal/src/components/warehouse/WarehouseShortcuts.tsx
  </read_first>
  <action>
    1. Create `DispatchModule.tsx` following FinanceModule pattern:
       - Import useDispatchStore, DispatchTabStrip, DispatchShortcuts
       - Render DispatchTabStrip + tab content in flex column
       - For NOW, only wire the 'home' tab to DispatchHomeView
       - Other tabs render a centered placeholder div with tab name text (NOT imported components — those come in Plan 05)
       - This prevents merge conflicts when Plans 02-04 run in parallel

    2. Create `DispatchTabStrip.tsx` following FinanceTabStrip pattern:
       - Tabs: Home, Route Planning, Live Map, Driver Management, Delivery Log
       - Use useDispatchStore activeTab/setActiveTab
       - React Aria TabList/Tab components
       - i18n keys from dispatch namespace

    3. Create `DispatchShortcuts.tsx` following existing shortcuts pattern:
       - `M` -> toggle to Live Map tab
       - `G` then `R` -> Route Planning (use two-key sequence pattern)
       - `G` then `D` -> Driver Management
       - `1`-`9` -> select vehicle by list position (dispatch custom event)
       - Use `useHotkey` from @tanstack/react-hotkeys

    4. Create `DispatchHomeView.tsx`:
       - Call getDispatchBoard server function for today's data
       - 4 summary sections in glass cards (spatial glass style, NOT dashboard):
         a. Today's Deliveries: count, completed, in progress, pending (Geist Mono numbers)
         b. Fleet Status: available, in transit, loading, at site (Geist Mono)
         c. Alerts: delayed deliveries, failed deliveries, driver issues (list with ConstraintBadge)
         d. Weather Alerts: Khamsin warnings if active (amber warning card)
       - Use `useTranslation('dispatch')` for all labels
       - Arabic-Indic numerals via existing formatters

    5. Create shared components:
       - `CapacityBar.tsx`: Horizontal bar showing route capacity. Green <70%, Yellow 70-90%, Red >90%. Width proportional to fill. Geist Mono percentage label. Props: `currentKg`, `capacityKg`.
       - `ConstraintBadge.tsx`: Small badge showing constraint violation type. Red for errors, amber for warnings. Icon + short label. Props: `violation: ConstraintViolation`.
       - `MapSkeleton.tsx`: Loading placeholder for map views. Pulsing grey rectangle with map icon centered. Used as ClientOnly fallback.

    6. Update `ModuleWindow.tsx`:
       - Add lazy import: `const DispatchModule = lazy(() => import('../dispatch/DispatchModule').then((m) => ({ default: m.DispatchModule })))`
       - Add `moduleId === 'dispatch'` case in the render chain with same Suspense spinner pattern
  </action>
  <verify>
    <automated>cd apps/internal && npx tsc --noEmit 2>&1 | head -30</automated>
  </verify>
  <acceptance_criteria>
    - grep -q "DispatchModule" apps/internal/src/components/dispatch/DispatchModule.tsx
    - grep -q "DispatchTabStrip" apps/internal/src/components/dispatch/DispatchTabStrip.tsx
    - grep -q "DispatchShortcuts" apps/internal/src/components/dispatch/DispatchShortcuts.tsx
    - grep -q "DispatchHomeView" apps/internal/src/components/dispatch/home/DispatchHomeView.tsx
    - grep -q "CapacityBar" apps/internal/src/components/dispatch/shared/CapacityBar.tsx
    - grep -q "DispatchModule" apps/internal/src/components/shell/ModuleWindow.tsx
    - grep -q "dispatch" apps/internal/src/components/shell/ModuleWindow.tsx
  </acceptance_criteria>
  <done>Dispatch module opens from icon strip (hotkey D), shows tabbed interface with home view populated with mock delivery/fleet data, shortcuts work, ModuleWindow registers dispatch module. Shared components available for Wave 2.</done>
</task>

</tasks>

<verification>
- TypeScript compiles: `cd apps/internal && npx tsc --noEmit`
- Dispatch module lazy-loads from ModuleWindow: grep confirms DispatchModule in ModuleWindow.tsx
- Server functions available: grep confirms getDispatchBoard, getDriverLocations in server/dispatch.ts
- Shared components exist: CapacityBar.tsx, ConstraintBadge.tsx, MapSkeleton.tsx
</verification>

<success_criteria>
Working dispatch module shell accessible via D hotkey, home tab shows delivery/fleet summary with mock data, all server functions available for Wave 2 plans, shared components ready for reuse.
</success_criteria>

<output>
After completion, create `.planning/phases/21-dispatch-module/21-01b-SUMMARY.md`
</output>
