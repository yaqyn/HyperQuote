# Phase 11: Portal Orders + Delivery + Remaining Windows - Research

**Researched:** 2026-04-01
**Domain:** Portal customer experience -- orders, tracking, notifications, documents, support, settings, PWA
**Confidence:** HIGH

## Summary

Phase 11 is the largest portal phase, building 10 requirements across 7+ distinct windows/features. The codebase already has established patterns: WindowShell for glass windows, server functions with dev-mode fallback, React Aria Tabs (already used in orders), Zustand for UI state, TanStack Query for server state, and i18n with portal namespace.

The three technically complex areas are: (1) GPS delivery tracking with MapLibre GL via react-map-gl/maplibre, which must be wrapped in ClientOnly, (2) real-time notifications via Supabase Realtime postgres_changes subscription with TanStack Query cache invalidation, and (3) PWA with manual Workbox (vite-plugin-pwa is incompatible with TanStack Start). Everything else is standard CRUD UI with React Aria components following existing patterns.

**Primary recommendation:** Decompose into 7-8 plans by window/feature. Orders window upgrade (tabs with real data) first since it exists. Then Market, Notifications (with Realtime), Documents, Support, Settings, Tracking+POD (map-heavy), and PWA+Guest Claiming last.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- MapLibre GL in ClientOnly for GPS map
- react-map-gl/maplibre import for React integration
- Supabase Realtime for notifications (postgres_changes)
- Manual Workbox for PWA (NOT vite-plugin-pwa)
- PWA install prompt after 3rd visit (localStorage counter)
- Push notification permission on first notification-worthy action
- React Aria Components for all UI elements
- Three colors only (white/black/blue), semantic status colors for data only
- Geist Mono for ALL numbers
- WindowShell pattern for all glass windows
- Hidden not disabled for unauthorized elements (multi-user roles)
- Settings save immediately on blur/change for toggles, "Save" button for text fields
- Drop-ship POD 72h auto-confirm is pg_cron (not UI timer)
- Guest claiming links auth_user_id to existing customer record

### Claude's Discretion
- Plan decomposition and ordering
- Component file structure within established patterns
- Zustand store design for new features
- How to structure the 5-stage progress bar component
- Notification grouping algorithm (by time buckets)
- Market window filter sidebar implementation approach

### Deferred Ideas (OUT OF SCOPE)
- Supplier portal (Phase 12)
- Internal platform (Phase 15+)
- WhatsApp integration (Phase 27)
- ETA e-invoicing (Phase 29)
- AI pipeline (Phase 30)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PORT-06 | Orders window: 4 tabs (Active, Quotes, History, Drafts), status badges, one-tap reorder | Existing orders.tsx has tab structure + DraftsTab. Needs real data from getCustomerOrders server fn, status badge mapping, reorder mutation. |
| PORT-07 | Order tracking: 5-stage progress bar, GPS map, driver location, ETA, POD flow | react-map-gl ^8.1.0 + maplibre-gl ^5.21.1 in ClientOnly. 5-stage component. POD confirm/dispute mutations from BACKEND.md. |
| PORT-08 | Market window: catalog in glass window, infinite scroll, quick-add mode | useInfiniteQuery with maxPages:5. Reuse product search from Phase 5. Quick-add is quantity popover on product click. |
| PORT-09 | Notifications: real-time via Supabase Realtime, grouped by time, click-through | Supabase channel subscription in useEffect with cleanup. Invalidates TanStack Query cache. ListBox for notification items. |
| PORT-10 | Documents window: invoices, delivery notes, quote PDFs, certificates | React Aria Tabs + Table. downloadInvoicePDF server fn returns signed R2 URL. View opens in new tab. |
| PORT-11 | Support window: WhatsApp primary, in-app chat, ticket submission | submitSupportTicket + replySupportTicket server fns. Ticket thread UI. WhatsApp link (tel: deep link). |
| PORT-12 | Settings: profile, addresses, projects, team, notifications, language/theme, security | Largest sub-feature. Vertical menu + content panels. React Aria Switch/RadioGroup/TextField. Multi-user team management with invitation flow. |
| PORT-14 | Repeat purchase: saved lists, one-tap reorder, favorites, AI suggestions | submitReorder server fn. Heart toggle on products. Reorder pre-fills builder. AI suggestion card above chat input. |
| PORT-15 | Guest order claiming: phone match, masked hint, link account | Server fn to check unclaimed customers by phone. Masked name display. Link auth_user_id mutation. |
| PORT-16 | PWA: service worker, install prompt, push notifications | Manual Workbox service worker. beforeinstallprompt event. Push via web-push API + Supabase for subscription storage. |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Architecture:** TanStack Start, React Aria, Motion v12, Bun, Cloudflare Workers
- **Code:** `useWatch()` never `watch()`. `.inputValidator()` not `.validator()`. Colors in `:root {}`. `ClientOnly` for maps. `isKeyboardDismissDisabled` on Dialogs.
- **Design:** Three colors only. Spatial glass UI. Geist Mono for ALL numbers.
- **i18n:** Arabic-Indic numerals in Arabic context. All numbers, dates, references.
- **Egyptian law:** 14% VAT, wire/cheque/cash/LC only
- **Realtime:** ALWAYS unsubscribe in useEffect cleanup
- **RLS:** `(SELECT auth.uid())` in policies, INDEX every RLS column
- **Server fns:** `createServerFn` + `.inputValidator()` with Zod. Dev mode fallback pattern established.

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-aria-components | ^1.16.0 | All UI: Tabs, ListBox, Table, Switch, RadioGroup, DatePicker, ComboBox | Project mandate |
| @tanstack/react-query | ^5.96.1 | Server state, useInfiniteQuery for Market | Already used throughout |
| zustand | ^5.0.12 | UI state (notification badge count, settings form dirty state) | Already used |
| motion | ^12.38.0 | Spring enter / tween exit on windows, notification spring-in | Already used |
| lucide-react | ^1.7.0 | Icons (Package, Truck, MapPin, FileCheck, Heart, etc.) | Already used |
| @supabase/supabase-js | ^2.101.1 | Realtime subscriptions, auth | Already used |

### New Dependencies
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-map-gl | ^8.1.0 | React wrapper for MapLibre GL | Order tracking GPS map |
| maplibre-gl | ^5.21.1 | Map rendering engine | Peer dep of react-map-gl |
| workbox-precaching | ^7.4.0 | Precache app shell in service worker | PWA service worker |
| workbox-routing | ^7.4.0 | Runtime cache routing | PWA API caching |
| workbox-strategies | ^7.4.0 | StaleWhileRevalidate, CacheFirst | PWA caching strategies |
| workbox-cacheable-response | ^7.4.0 | Filter cacheable responses | PWA -- only cache 200s |
| workbox-expiration | ^7.4.0 | Cache TTL management | PWA -- expire old entries |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| react-map-gl | Raw maplibre-gl | react-map-gl provides React-idiomatic API, typed for maplibre via /maplibre export |
| Manual Workbox | vite-plugin-pwa | vite-plugin-pwa incompatible with TanStack Start (CONTEXT.md locked decision) |

**Installation:**
```bash
bun add react-map-gl maplibre-gl workbox-precaching workbox-routing workbox-strategies workbox-cacheable-response workbox-expiration
```

## Architecture Patterns

### Recommended Project Structure
```
apps/portal/src/
  routes/_portal/
    orders.tsx              # Upgraded: 4 tabs with real data + status badges
    orders_.$orderId.tsx    # Order detail + tracking view
    market.tsx              # Upgraded: catalog, infinite scroll, quick-add
    market.$productSlug.tsx # Product detail sub-view within Market window
    notifications.tsx       # Upgraded: real-time notification list
    documents.tsx           # Upgraded: tabbed document browser
    support.tsx             # Upgraded: ticket list + submission
    settings.tsx            # Upgraded: settings sections with vertical nav
  components/
    orders/
      OrderCard.tsx         # Shared order/quote card with status badge
      ProgressBar.tsx       # 5-stage delivery progress bar
      DeliveryMap.tsx       # MapLibre GL map (ClientOnly wrapped)
      PODConfirmFlow.tsx    # Confirm/dispute drop-ship POD
      ReorderDialog.tsx     # Reorder confirmation with "Quick Submit" / "Edit First"
    market/
      MarketProductGrid.tsx # Infinite scroll product grid
      QuickAddPopover.tsx   # Compact quantity popover for quick-add mode
      FilterSidebar.tsx     # Filter sidebar / bottom sheet on narrow
    notifications/
      NotificationItem.tsx  # Individual notification row
      useRealtimeNotifications.ts  # Supabase Realtime hook
    documents/
      DocumentTable.tsx     # Sortable table with download actions
    support/
      TicketList.tsx        # Active tickets
      TicketForm.tsx        # New ticket submission
      TicketThread.tsx      # Ticket conversation thread
    settings/
      SettingsNav.tsx       # Vertical menu (inline-start)
      ProfileSection.tsx    # Company, contact, trade license, photo
      AddressesSection.tsx  # Address CRUD
      ProjectsSection.tsx   # Project CRUD
      TeamSection.tsx       # Multi-user management
      NotificationsSection.tsx  # Per-channel + per-event toggles
      AppearanceSection.tsx # Language, theme, number format, date format
      SecuritySection.tsx   # Active sessions, MFA setup
      ReferralsSection.tsx  # Referral program dashboard
    pwa/
      useInstallPrompt.ts   # beforeinstallprompt + 3rd visit counter
      usePushPermission.ts  # Push notification permission request
  lib/server/
    orders.ts               # getCustomerOrders, getCustomerOrderDetail, submitReorder
    deliveries.ts           # Delivery tracking, POD confirm/dispute
    notifications.ts        # getNotifications, markNotificationRead, markAllRead
    documents.ts            # getCustomerInvoices, downloadInvoicePDF
    support.ts              # submitSupportTicket, replySupportTicket
    settings.ts             # getCustomerProfile, updateCustomerProfile, updateNotificationPreferences
    team.ts                 # inviteTeamMember, removeTeamMember, changeTeamMemberRole
    guest-claiming.ts       # Check unclaimed customers, link account
  stores/
    notifications.ts        # Unread count, realtime subscription state
  types/
    order.ts                # Order, OrderStatus, DeliveryStage types
    notification.ts         # Notification type definitions
    document.ts             # Document types
    settings.ts             # Settings, TeamMember types
  public/
    sw.js                   # Service worker (manual Workbox)
    manifest.json           # PWA manifest
```

### Pattern 1: Server Function with Dev Fallback
**What:** Every server function checks `isSupabaseConfigured()` and returns mock data in dev mode.
**When to use:** All new server functions in this phase.
**Example:**
```typescript
// Source: existing pattern in apps/portal/src/lib/server/quotes.ts
export const getCustomerOrders = createServerFn({ method: 'GET' })
  .inputValidator(z.object({
    status: z.string().optional(),
    page: z.number().default(1),
    limit: z.number().default(20),
    dateRange: z.object({ from: z.string(), to: z.string() }).optional(),
  }))
  .handler(async ({ data: input }) => {
    if (!isSupabaseConfigured()) {
      return { orders: MOCK_ORDERS, total: MOCK_ORDERS.length }
    }
    const { supabase } = await getAuthenticatedClient()
    // ... real query
  })
```

### Pattern 2: Supabase Realtime with TanStack Query Invalidation
**What:** Subscribe to postgres_changes, invalidate query cache on new data. Never write directly to Zustand from realtime.
**When to use:** Notifications window, notification badge count.
**Example:**
```typescript
// Custom hook: useRealtimeNotifications
function useRealtimeNotifications(userId: string) {
  const queryClient = useQueryClient()

  useEffect(() => {
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['notifications'] })
        queryClient.invalidateQueries({ queryKey: ['notification-count'] })
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel) // MUST unsubscribe
    }
  }, [userId, queryClient])
}
```

### Pattern 3: ClientOnly Map Wrapper
**What:** MapLibre GL crashes on SSR. Wrap in ClientOnly from TanStack Start.
**When to use:** DeliveryMap component.
**Example:**
```typescript
import { ClientOnly } from '@tanstack/react-start'

function OrderTracking({ orderId }: { orderId: string }) {
  return (
    <div>
      <ProgressBar stage={currentStage} />
      <ClientOnly fallback={<Skeleton className="h-[300px] rounded-xl" />}>
        {() => <DeliveryMap orderId={orderId} />}
      </ClientOnly>
    </div>
  )
}
```

### Pattern 4: WindowShell with Enhanced Header
**What:** All windows use WindowShell. Some need extra header content (buttons, tabs).
**When to use:** Orders (New Quote Request button), Market (search + quick-add toggle).
**Example:** The existing WindowShell accepts `title` and `children`. For windows needing header actions, pass them as part of the content area below the header, as the current pattern does in orders.tsx.

### Pattern 5: Hidden Not Disabled (Multi-User Roles)
**What:** Unauthorized elements are hidden, not disabled. Check role in component, conditionally render.
**When to use:** Team management (owner only), invoice viewing (approver only), quote acceptance (approver only).
**Example:**
```typescript
// From CONTEXT.md Section 2.17 permissions matrix
const role = useTeamRole() // 'buyer' | 'approver' | 'site_manager'
return (
  <>
    {role === 'approver' && <AcceptQuoteButton />}
    {/* Buyer never sees AcceptQuoteButton -- hidden, not disabled */}
  </>
)
```

### Anti-Patterns to Avoid
- **Direct Zustand writes from Realtime:** Always invalidate TanStack Query cache instead. Zustand is for UI state only.
- **Map without ClientOnly:** MapLibre GL will crash during SSR. Always wrap.
- **`watch()` instead of `useWatch()`:** Broken with React 19 / React Compiler.
- **Disabled buttons for unauthorized actions:** Use hidden-not-disabled per UI-VISION.md.
- **Colors outside three-color rule:** Status badge colors are semantic data only. UI chrome is white/black/blue.
- **Popover/Menu with Motion:** Use CSS transitions for Popover. Motion causes race condition (#9158).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Map rendering | Custom canvas/SVG map | react-map-gl/maplibre + maplibre-gl | Vector tiles, GPS, route lines, markers, Arabic labels |
| Service worker | Raw service worker from scratch | Workbox libraries | Precache manifest, cache strategies, update flow |
| Tabs | Custom tab switching logic | React Aria Tabs | Accessibility, keyboard nav, RTL, focus management |
| Toggle switches | Custom checkbox styling | React Aria Switch | Accessibility, keyboard, ARIA states |
| Date pickers | Custom date input | React Aria DatePicker | i18n, Hijri calendar support, keyboard nav |
| Radio groups | Custom radio styling | React Aria RadioGroup | Accessibility, arrow key navigation |
| Data tables | Custom table from divs | React Aria Table | Sorting, selection, accessibility, keyboard nav |
| Relative time | Custom "X minutes ago" | Intl.RelativeTimeFormat | Locale-aware, Arabic support |
| Number formatting | Manual regex | Intl.NumberFormat('ar-EG') | Arabic-Indic numerals, currency |
| Install prompt | Custom banner | beforeinstallprompt event | Browser-native, standards-compliant |

**Key insight:** React Aria provides every interactive component needed (Tabs, ListBox, Table, Switch, RadioGroup, DatePicker, ComboBox, Dialog, ToggleButton). Do not create custom interactive elements.

## Common Pitfalls

### Pitfall 1: Supabase Realtime Subscription Leak
**What goes wrong:** Notifications keep arriving after component unmounts, hitting channel limit.
**Why it happens:** Missing cleanup in useEffect.
**How to avoid:** Always `supabase.removeChannel(channel)` in useEffect cleanup.
**Warning signs:** Console warnings about max channels, duplicate notifications.

### Pitfall 2: MapLibre GL SSR Crash
**What goes wrong:** `window is not defined` during server render.
**Why it happens:** MapLibre GL accesses browser APIs at import time.
**How to avoid:** Always wrap in `ClientOnly` from `@tanstack/react-start`. Never import maplibre-gl at module top level in components that render on server.
**Warning signs:** Server-side render error, blank page on navigation.

### Pitfall 3: MapLibre GL v5 Breaking Changes
**What goes wrong:** Event handlers break, canvas options change.
**Why it happens:** MapLibre GL v5 changed `on()` to return Subscription objects, added new `canvasContextAttributes`.
**How to avoid:** Use react-map-gl ^8.1.0 which abstracts these changes. If using raw maplibre-gl, follow v5 migration guide.
**Warning signs:** TypeScript errors on map event handlers.

### Pitfall 4: PWA Install Prompt Timing
**What goes wrong:** Browser prompt fires before user is engaged, or never fires.
**Why it happens:** `beforeinstallprompt` fires once per session. Must capture and defer.
**How to avoid:** Capture event in window listener, store in ref/state, show custom UI after 3rd visit (localStorage counter).
**Warning signs:** Install prompt appears too early or not at all.

### Pitfall 5: Push Notification Permission Denied Permanently
**What goes wrong:** User clicks "Block" and can never enable push notifications.
**Why it happens:** Requesting permission too early without context.
**How to avoid:** Only request on first notification-worthy action (e.g., quote ready). Show explanation UI before the browser prompt.
**Warning signs:** `Notification.permission === 'denied'`.

### Pitfall 6: Infinite Scroll Memory Leak
**What goes wrong:** Market window accumulates hundreds of product cards, browser becomes sluggish.
**Why it happens:** useInfiniteQuery keeps all pages in memory.
**How to avoid:** Set `maxPages: 5` on useInfiniteQuery. Old pages are garbage collected when scrolling forward.
**Warning signs:** Increasing memory usage, jank on scroll.

### Pitfall 7: Settings Form State Management
**What goes wrong:** Changes lost when navigating between settings sections.
**Why it happens:** Component unmounts when switching sections, losing local state.
**How to avoid:** Use React Hook Form with `useWatch()` for text fields. Toggles/selects save immediately on change (no form state needed). Use `beforeLoad` prompt for unsaved text changes.
**Warning signs:** User changes text field, clicks another section, changes are gone.

### Pitfall 8: Guest Claiming Race Condition
**What goes wrong:** Two users claim the same customer record simultaneously.
**Why it happens:** No locking on customers.auth_user_id update.
**How to avoid:** Use `UPDATE ... WHERE auth_user_id IS NULL` with row-level check. Return error if already claimed.
**Warning signs:** Two different auth users linked to same customer.

## Code Examples

### 5-Stage Progress Bar
```typescript
// Source: FRONTEND.md Section 2.7b
const DELIVERY_STAGES = [
  'confirmed',
  'being_prepared',
  'out_for_delivery',
  'delivered',
  'invoice_generated',
] as const

type DeliveryStage = typeof DELIVERY_STAGES[number]

function ProgressBar({ currentStage }: { currentStage: DeliveryStage }) {
  const { t } = useTranslation('portal')
  const currentIndex = DELIVERY_STAGES.indexOf(currentStage)

  return (
    <div className="flex items-center gap-2">
      {DELIVERY_STAGES.map((stage, i) => (
        <div key={stage} className="flex items-center gap-2 flex-1">
          <div className={[
            'w-8 h-8 rounded-full flex items-center justify-center text-xs font-mono font-semibold',
            i <= currentIndex
              ? 'bg-[var(--color-primary)] text-white'
              : 'bg-[var(--color-surface)] text-[var(--color-text-muted)]',
          ].join(' ')}>
            {i + 1}
          </div>
          {i < DELIVERY_STAGES.length - 1 && (
            <div className={[
              'flex-1 h-0.5',
              i < currentIndex ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]',
            ].join(' ')} />
          )}
        </div>
      ))}
    </div>
  )
}
```

### Notification Item with Relative Time
```typescript
// Source: FRONTEND.md Section 2.8
import { ListBoxItem } from 'react-aria-components'
import { FileCheck, Truck, MapPin, CreditCard, MessageCircle } from 'lucide-react'

const NOTIFICATION_ICONS = {
  quote_ready: FileCheck,
  order_update: Truck,
  delivery: MapPin,
  payment: CreditCard,
  support: MessageCircle,
} as const

function NotificationItem({ notification }: { notification: NotificationData }) {
  const Icon = NOTIFICATION_ICONS[notification.type] ?? Bell

  return (
    <ListBoxItem
      id={notification.id}
      className="flex items-start gap-3 px-4 py-3 min-h-16 border-b border-[var(--color-border)] cursor-pointer hover:bg-[var(--color-surface)] transition-colors"
    >
      {!notification.read && (
        <div className="w-2 h-2 rounded-full bg-[var(--color-primary)] mt-2 shrink-0" />
      )}
      <Icon size={20} className="text-[var(--color-primary)] shrink-0 mt-0.5" />
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-sm font-medium text-[var(--color-text)] truncate">
          {notification.title}
        </span>
        <span className="text-[13px] text-[var(--color-text-muted)] line-clamp-2">
          {notification.body}
        </span>
        <span className="text-[11px] font-mono text-[var(--color-text-subtle)]">
          {formatRelativeTime(notification.createdAt)}
        </span>
      </div>
    </ListBoxItem>
  )
}
```

### PWA Install Prompt Hook
```typescript
// Source: FRONTEND.md Section 2.18
function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [canInstall, setCanInstall] = useState(false)

  useEffect(() => {
    // Increment visit counter
    const visits = Number(localStorage.getItem('hq-visit-count') ?? '0') + 1
    localStorage.setItem('hq-visit-count', String(visits))

    const handler = (e: Event) => {
      e.preventDefault()
      const event = e as BeforeInstallPromptEvent
      setDeferredPrompt(event)
      // Only show after 3rd visit
      if (visits >= 3) {
        setCanInstall(true)
      }
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const install = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    setDeferredPrompt(null)
    setCanInstall(false)
    return outcome
  }

  return { canInstall, install }
}
```

### Manual Workbox Service Worker
```typescript
// Source: Workbox docs + CONTEXT.md constraint (no vite-plugin-pwa)
// apps/portal/public/sw.js
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { registerRoute, NavigationRoute } from 'workbox-routing'
import { StaleWhileRevalidate, CacheFirst } from 'workbox-strategies'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'
import { ExpirationPlugin } from 'workbox-expiration'

// Precache app shell (injected by build)
precacheAndRoute(self.__WB_MANIFEST || [])
cleanupOutdatedCaches()

// Runtime cache: API responses (stale-while-revalidate, 5min)
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new StaleWhileRevalidate({
    cacheName: 'api-cache',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 300 }),
    ],
  })
)

// Cache-first for static assets
registerRoute(
  ({ request }) => ['style', 'script', 'image'].includes(request.destination),
  new CacheFirst({
    cacheName: 'static-assets',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 30 * 24 * 60 * 60 }),
    ],
  })
)
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| vite-plugin-pwa | Manual Workbox | TanStack Start incompatibility | Must write SW manually |
| maplibre-gl v4 | maplibre-gl v5 | 2025 | `on()` returns Subscription, new canvas attributes |
| react-map-gl v7 | react-map-gl v8 | 2024 | Dedicated /maplibre export, typed for maplibre-gl |
| Supabase Realtime v1 | Supabase Realtime v2 | 2024 | Channel-based API, postgres_changes filter syntax |

## Open Questions

1. **MapTiler API key for Arabic labels**
   - What we know: MapTiler provides Arabic-labeled vector tiles. react-map-gl needs a style URL.
   - What's unclear: Whether a MapTiler API key is already provisioned for this project.
   - Recommendation: Use MapTiler free tier for dev. Add VITE_MAPTILER_KEY env var. Plan task should include env setup.

2. **Push notification backend**
   - What we know: Web Push API requires a VAPID key pair and a subscription endpoint.
   - What's unclear: Whether push notification subscriptions should be stored in Supabase or Cloudflare KV.
   - Recommendation: Store in Supabase `push_subscriptions` table (needs RLS). VAPID keys in env vars. Actual push sending deferred to Phase 27 (WhatsApp/notifications integration).

3. **Service worker build pipeline**
   - What we know: Manual Workbox needs `self.__WB_MANIFEST` injected at build time.
   - What's unclear: How to integrate Workbox manifest injection with TanStack Start's Vite build without vite-plugin-pwa.
   - Recommendation: Use `workbox-build` CLI in a post-build step: `npx workbox-build injectManifest workbox-config.js`.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest ^4.1.2 |
| Config file | apps/portal/vitest.config.ts |
| Quick run command | `cd apps/portal && bun test` |
| Full suite command | `cd apps/portal && bun test` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PORT-06 | Orders 4 tabs render with mock data | unit | `cd apps/portal && bun test -- orders` | No -- Wave 0 |
| PORT-07 | Progress bar renders correct stage | unit | `cd apps/portal && bun test -- progress-bar` | No -- Wave 0 |
| PORT-07 | POD confirm/dispute mutations | unit | `cd apps/portal && bun test -- pod` | No -- Wave 0 |
| PORT-08 | Market infinite scroll loads pages | unit | `cd apps/portal && bun test -- market` | No -- Wave 0 |
| PORT-09 | Notification items render grouped | unit | `cd apps/portal && bun test -- notifications` | No -- Wave 0 |
| PORT-10 | Document table renders with download | unit | `cd apps/portal && bun test -- documents` | No -- Wave 0 |
| PORT-11 | Ticket form submits | unit | `cd apps/portal && bun test -- support` | No -- Wave 0 |
| PORT-12 | Settings sections render | unit | `cd apps/portal && bun test -- settings` | No -- Wave 0 |
| PORT-14 | Reorder pre-fills builder | unit | `cd apps/portal && bun test -- reorder` | No -- Wave 0 |
| PORT-15 | Guest claiming masked hint | unit | `cd apps/portal && bun test -- guest-claiming` | No -- Wave 0 |
| PORT-16 | Install prompt after 3rd visit | unit | `cd apps/portal && bun test -- pwa` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `cd apps/portal && bun test`
- **Per wave merge:** `cd apps/portal && bun test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/__tests__/orders-window.test.tsx` -- covers PORT-06
- [ ] `src/__tests__/progress-bar.test.tsx` -- covers PORT-07
- [ ] `src/__tests__/notifications.test.tsx` -- covers PORT-09
- [ ] `src/__tests__/settings.test.tsx` -- covers PORT-12
- [ ] `src/__tests__/install-prompt.test.tsx` -- covers PORT-16

## Sources

### Primary (HIGH confidence)
- Existing codebase: `apps/portal/src/` -- established patterns (WindowShell, server fns, stores, hooks)
- CONTEXT.md (11-CONTEXT.md) -- locked decisions and spec references
- FRONTEND.md sections referenced in CONTEXT.md -- pixel-level UI specs

### Secondary (MEDIUM confidence)
- [npm registry](https://www.npmjs.com/package/react-map-gl) -- react-map-gl ^8.1.0 verified
- [npm registry](https://www.npmjs.com/package/maplibre-gl) -- maplibre-gl ^5.21.1 verified
- [npm registry](https://www.npmjs.com/package/workbox-precaching) -- workbox ^7.4.0 verified
- [Supabase Realtime docs](https://supabase.com/docs/guides/realtime/postgres-changes) -- postgres_changes API
- [Workbox docs](https://developer.chrome.com/docs/workbox/modules/workbox-precaching) -- precache and route patterns
- [MapLibre GL JS docs](https://maplibre.org/maplibre-gl-js/docs/) -- v5 API

### Tertiary (LOW confidence)
- PWA push notification flow on Cloudflare Workers -- needs validation during implementation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all packages verified against npm registry, existing codebase patterns clear
- Architecture: HIGH -- extends well-established portal patterns (WindowShell, server fns, stores)
- Pitfalls: HIGH -- documented from official docs and known project constraints (MapLibre ClientOnly, Realtime cleanup, PWA timing)

**Research date:** 2026-04-01
**Valid until:** 2026-05-01 (stable libraries, locked stack)
