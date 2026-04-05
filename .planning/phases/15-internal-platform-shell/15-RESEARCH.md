# Phase 15: Internal Platform Shell - Research

**Researched:** 2026-04-05
**Domain:** TanStack Start SPA shell, spatial glass UI, hotkey navigation, command palette, real-time notifications
**Confidence:** HIGH

## Summary

Phase 15 builds the internal platform app shell -- the operational hub for HyperQuote employees. It is NOT a traditional dashboard. It is a spatial canvas with glass windows, single-key hotkeys for 11 modules, a command palette (Ctrl+K), real-time notifications, and a shared activity feed infrastructure.

The portal app (Phase 7) already established all core patterns: `beforeLoad` auth guard, `useShortcut` abstraction over `@tanstack/react-hotkeys`, `GlassWindow`/`GlassElevated` from `@hyperquote/ui`, `SpatialCanvas`, `Greeting` component, `WindowShell`, Zustand stores, and the notification bell. The internal app mirrors this architecture with key differences: internal auth pool (`hq-internal-session`), 11 modules instead of 2-3 windows, keyed window state preservation in Zustand, and a keyboard scope state machine via `@xstate/store`.

**Primary recommendation:** Follow the portal's established patterns exactly. The internal app's `_internal.tsx` layout route mirrors `_portal.tsx`. New infrastructure needed: (1) keyboard scope state machine, (2) Zustand window state store keyed by module, (3) activity feed database tables + shared component, (4) Supabase Realtime subscription for notifications. The internal app shell currently has only a placeholder `index.tsx` and `__root.tsx` -- everything is greenfield within the existing monorepo scaffold.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
Phase 15 CONTEXT.md does not have a separate Decisions/Discretion/Deferred structure -- it is a comprehensive spec. All items in the CONTEXT.md are locked decisions from the frontend spec. Key locked decisions:

- TanStack Start SPA at `app.hyperquote.net`
- Supabase Auth via `@supabase/ssr`, internal auth pool cookie `hq-internal-session`
- 11 module icon strip with single-key hotkeys (S/P/O/W/F/D/C/H/A/R/I)
- Glass windows: spring open (stiffness 200, damping 20), tween close (200ms easeIn)
- Window state preservation via Zustand keyed by module name
- Keyboard scope state machine via @xstate/store (Canvas -> Panel -> Input)
- Command palette: React Aria Autocomplete + Dialog + Menu, fuse.js search
- `isKeyboardDismissDisabled` on React Aria Dialog -- Escape handled by hotkeys only
- Notifications: Supabase Realtime `postgres_changes`, grouped by time
- Mobile: 2-column tappable glass card grid, full-screen module views
- Activity feed / @mention / handoff infrastructure
- NO KPI cards, NO metrics, NO charts on canvas
- Permission-filtered: hidden, not disabled

### Claude's Discretion
Not explicitly separated. Implementation details of the activity feed schema, notification grouping logic, and window state shape are implicit discretion areas.

### Deferred Ideas (OUT OF SCOPE)
- Module content (Sales, Procurement, etc.) -- those are Phases 16-22
- Offline/PWA for internal app -- mentioned in spec but can follow portal pattern later
- Service worker registration -- not needed for shell phase
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INT-01 | Auth: `beforeLoad` with internal pool check (`hq-internal-session` cookie) | Portal's `checkPortalAuth` pattern + `authGuard` from `@hyperquote/auth` with `requiredPool: 'internal'` |
| INT-02 | Canvas: time-aware greeting, urgent item count (6 sources), lion watermark, role-based quick actions | Portal's `Greeting` + `SpatialCanvas` components, `LionMark` from `@hyperquote/ui`, server function for aggregated urgent counts |
| INT-03 | Icon strip: 11 module icons (permission-filtered), hotkeys (S/P/O/W/F/D/C/H/A/R/I) | Portal's `useShortcut` hook, `hasPermission` from `@hyperquote/auth`, Lucide icons, permission-to-module mapping |
| INT-04 | Glass windows: spring open/tween close, ~90% viewport, window state preservation | `GlassWindow` from `@hyperquote/ui`, Zustand store with `skipHydration: true`, keyed by module name |
| INT-05 | Command palette: Ctrl+K, elevated glass, fuse.js cross-entity search, keyboard navigation | `CommandPalette` shell from `@hyperquote/ui`, React Aria Autocomplete + Dialog + Menu, fuse.js 7.3.0 |
| INT-06 | Notifications: badge on bell, glass window, grouped by time, real-time | Portal's `NotificationBell` pattern, `notifications` table exists (migration 021), Supabase Realtime |
| INT-07 | Mobile: canvas grid of tappable glass cards, full-screen module views, back gesture | Responsive breakpoints, 2-column grid, media query to hide icon strip |
| INT-08 | Shared activity feed / @mention / handoff infrastructure | NEW: requires `entity_comments` + `mentions` tables (migration), shared `ActivityFeed` component |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @tanstack/react-start | ^1.167.12 | App framework (SSR + server functions) | Project stack decision |
| @tanstack/react-router | ^1.168.0 | File-based routing, `beforeLoad` guards | Project stack decision |
| @tanstack/react-query | ^5.96.2 | Server state, cache invalidation on Realtime | Project stack decision |
| @tanstack/react-hotkeys | ^0.9.1 | Keyboard shortcuts (via `useShortcut` abstraction) | Already in portal, wrapped behind abstraction |
| react-aria-components | ^1.16.0 | Accessible Dialog, Autocomplete, Menu for command palette | Project stack decision |
| motion | ^12.38.0 | Spring enter / tween exit on glass windows | Project stack decision |
| zustand | ^5.0.12 | Window state preservation (keyed by module), UI state | Project stack decision |
| fuse.js | ^7.3.0 | Fuzzy search in command palette | Already in portal |
| @xstate/store | ^3.17.1 | Keyboard scope state machine (~1KB) | Specified in CONTEXT.md |
| lucide-react | ^1.7.0 | Module icons (11 icons) | Already in portal |
| i18next | ^26.0.3 | AR+EN translations | Project stack decision |
| @supabase/supabase-js | ^2.101.1 | Realtime subscriptions, auth | Project stack decision |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @hyperquote/ui | workspace:* | GlassWindow, GlassElevated, CommandPalette, LionMark, StatusBadge, Skeleton, EmptyState | All shell UI |
| @hyperquote/auth | workspace:* | authGuard, getServerSession, hasPermission | Auth gate, permission filtering |
| @hyperquote/i18n | workspace:* | formatNumber, formatDate | Urgent counts, timestamps |
| @hyperquote/types | workspace:* | DB enums, entity types | Type safety |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @xstate/store | Plain Zustand | @xstate/store is specified in CONTEXT.md for keyboard scope -- it provides explicit state machines with ~1KB overhead. Zustand would work but lacks transition validation |
| @tanstack/react-hotkeys | react-hotkeys-hook | CONTEXT.md says fallback to react-hotkeys-hook if tanstack is unstable. Portal has been using tanstack successfully since Phase 7 |

**Installation (for internal app):**
```bash
cd apps/internal && bun add @hyperquote/auth@workspace:* @hyperquote/forms@workspace:* @hyperquote/i18n@workspace:* @hyperquote/types@workspace:* @hyperquote/ui@workspace:* @supabase/supabase-js @tanstack/react-hotkeys @tanstack/react-query react-aria-components motion zustand fuse.js @xstate/store lucide-react i18next react-i18next zod
```

**Dev dependencies:**
```bash
cd apps/internal && bun add -d tailwindcss-react-aria-components
```

## Architecture Patterns

### Recommended Project Structure
```
apps/internal/src/
  routes/
    __root.tsx              # html/head/body, I18nProvider, QueryClientProvider
    _internal.tsx           # Auth guard layout, icon strip, shortcuts
    _internal/
      index.tsx             # Canvas home (greeting, urgent, lion)
      sales.tsx             # Lazy: Sales module placeholder
      procurement.tsx       # Lazy: Procurement module placeholder
      orders.tsx            # ...
      warehouse.tsx
      finance.tsx
      dispatch.tsx
      customer-service.tsx
      hr.tsx
      admin.tsx
      reports.tsx
      ai.tsx
      notifications.tsx     # Notifications window
  components/
    shell/
      IconStrip.tsx         # 11 module icons, permission-filtered
      InternalHeader.tsx    # Bell icon, profile menu, theme toggle
      WindowShell.tsx       # Internal-specific: 90% viewport glass + header
    canvas/
      InternalCanvas.tsx    # Greeting + urgent + lion + quick actions
      Greeting.tsx          # Reuse or adapt from portal
    command/
      InternalCommandPalette.tsx  # Ctrl+K search with fuse.js
    activity/
      ActivityFeed.tsx      # Shared: renders on any entity
      CommentInput.tsx      # @mention autocomplete
      ActivityItem.tsx      # Single feed entry
    notifications/
      NotificationList.tsx  # Grouped by time
  hooks/
    useShortcut.ts          # Copy from portal (same abstraction)
    useKeyboardScope.ts     # @xstate/store: Canvas | Panel | Input
    useWindowState.ts       # Read/write Zustand window state
    useUrgentItems.ts       # Aggregate 6 urgent sources
    useNotifications.ts     # Supabase Realtime subscription
  stores/
    internal.ts             # activeModule, windowStates (keyed map)
    notifications.ts        # Unread count, notification list
  lib/
    auth.ts                 # checkInternalAuth server function
    modules.ts              # Module registry (icon, hotkey, permission, label)
    server/
      urgent-items.ts       # Parallel queries for 6 urgent sources
      notifications.ts      # CRUD for notifications
      activity.ts           # CRUD for activity feed
  styles.css                # @import tokens.css, tailwind, fonts
```

### Pattern 1: Module Registry
**What:** Single source of truth for all 11 modules -- icon, hotkey, permission, route, i18n key.
**When to use:** Icon strip rendering, hotkey registration, command palette navigation, permission filtering.
**Example:**
```typescript
// src/lib/modules.ts
import {
  Tag, ShoppingCart, ClipboardList, Warehouse, Banknote,
  Truck, Headset, Users, Settings, BarChart3, Sparkles
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface ModuleDef {
  id: string
  icon: LucideIcon
  hotkey: string
  permission: string  // entity.read permission to check
  route: string
  i18nKey: string
}

export const MODULES: ModuleDef[] = [
  { id: 'sales', icon: Tag, hotkey: 'S', permission: 'quote_requests.read', route: '/sales', i18nKey: 'modules.sales' },
  { id: 'procurement', icon: ShoppingCart, hotkey: 'P', permission: 'purchase_orders.read', route: '/procurement', i18nKey: 'modules.procurement' },
  { id: 'orders', icon: ClipboardList, hotkey: 'O', permission: 'orders.read', route: '/orders', i18nKey: 'modules.orders' },
  { id: 'warehouse', icon: Warehouse, hotkey: 'W', permission: 'inventory.read', route: '/warehouse', i18nKey: 'modules.warehouse' },
  { id: 'finance', icon: Banknote, hotkey: 'F', permission: 'invoices.read', route: '/finance', i18nKey: 'modules.finance' },
  { id: 'dispatch', icon: Truck, hotkey: 'D', permission: 'deliveries.read', route: '/dispatch', i18nKey: 'modules.dispatch' },
  { id: 'customer-service', icon: Headset, hotkey: 'C', permission: 'tickets.read', route: '/customer-service', i18nKey: 'modules.customerService' },
  { id: 'hr', icon: Users, hotkey: 'H', permission: 'drivers.read', route: '/hr', i18nKey: 'modules.hr' },
  { id: 'admin', icon: Settings, hotkey: 'A', permission: 'users.manage', route: '/admin', i18nKey: 'modules.admin' },
  { id: 'reports', icon: BarChart3, hotkey: 'R', permission: 'reports.read', route: '/reports', i18nKey: 'modules.reports' },
  { id: 'ai', icon: Sparkles, hotkey: 'I', permission: 'ai.use', route: '/ai', i18nKey: 'modules.ai' },
]
```

### Pattern 2: Keyboard Scope State Machine
**What:** Prevents hotkeys from firing when user is typing in text inputs or interacting with menus.
**When to use:** Always active. Transitions: Canvas (hotkeys active) -> Panel (hotkeys active, some keys reserved) -> Input (hotkeys disabled).
**Example:**
```typescript
// src/hooks/useKeyboardScope.ts
import { createStore, useSelector } from '@xstate/store'

type Scope = 'canvas' | 'panel' | 'input'

const keyboardScopeStore = createStore({
  context: { scope: 'canvas' as Scope },
  on: {
    'scope.set': (context, event: { scope: Scope }) => ({
      scope: event.scope,
    }),
  },
})

export function setKeyboardScope(scope: Scope) {
  keyboardScopeStore.send({ type: 'scope.set', scope })
}

export function useKeyboardScope() {
  return useSelector(keyboardScopeStore, (s) => s.context.scope)
}

export function useHotkeysEnabled() {
  const scope = useKeyboardScope()
  return scope !== 'input'
}
```

### Pattern 3: Window State Preservation (Zustand keyed by module)
**What:** When swapping modules via hotkeys, each window's state is preserved and restored.
**When to use:** Every module window. State includes scroll position, active tab, form values, filters, expanded sections.
**Example:**
```typescript
// src/stores/internal.ts
import { create } from 'zustand'

interface WindowState {
  scrollTop: number
  activeTab?: string
  filters?: Record<string, unknown>
  expandedSections?: string[]
  // Modules extend this via metadata
  [key: string]: unknown
}

interface InternalStore {
  activeModule: string | null
  windowStates: Record<string, WindowState>
  openModule: (id: string) => void
  closeModule: () => void
  saveWindowState: (moduleId: string, state: Partial<WindowState>) => void
  getWindowState: (moduleId: string) => WindowState | undefined
}

export const useInternalStore = create<InternalStore>()((set, get) => ({
  activeModule: null,
  windowStates: {},

  openModule: (id) => set({ activeModule: id }),

  closeModule: () => set({ activeModule: null }),

  saveWindowState: (moduleId, state) =>
    set((s) => ({
      windowStates: {
        ...s.windowStates,
        [moduleId]: { ...s.windowStates[moduleId], ...state } as WindowState,
      },
    })),

  getWindowState: (moduleId) => get().windowStates[moduleId],
}))
```

### Pattern 4: Auth Guard (Internal Pool)
**What:** `beforeLoad` server function that checks `hq-internal-session` cookie and rejects external users.
**When to use:** `_internal.tsx` layout route.
**Example:**
```typescript
// Mirrors portal's checkPortalAuth but requires pool === 'internal'
export const checkInternalAuth = createServerFn().handler(async () => {
  if (isDevMode()) {
    return {
      auth: { /* dev mock with internal pool */ },
      isExternalUser: false,
    }
  }

  const session = await getServerSession({ supabaseUrl, supabaseAnonKey })
  if (!session) return { auth: null, isExternalUser: false }
  if (session.pool !== 'internal') return { auth: null, isExternalUser: true }
  return { auth: session, isExternalUser: false }
})
```

### Pattern 5: Urgent Items Server Function
**What:** Parallel queries to 6 tables, returns aggregate count.
**When to use:** Canvas greeting, displayed via Geist Mono.
**Example:**
```typescript
// src/lib/server/urgent-items.ts
export const getUrgentItemCount = createServerFn().handler(async () => {
  const client = await getAuthenticatedClient()

  // Parallel queries for all 6 sources
  const [rfqs, quotes, approvals, deliveries, invoices, sla] = await Promise.all([
    client.from('quote_requests').select('id', { count: 'exact', head: true })
      .eq('status', 'pending').lt('created_at', thirtyMinutesAgo()),
    client.from('quotes').select('id', { count: 'exact', head: true })
      .eq('status', 'sent').lt('valid_until', twentyFourHoursFromNow()),
    client.from('approvals').select('id', { count: 'exact', head: true })
      .eq('status', 'pending').eq('approver_id', userId),
    client.from('deliveries').select('id', { count: 'exact', head: true })
      .eq('status', 'problem'),
    client.from('invoices').select('id', { count: 'exact', head: true })
      .eq('status', 'overdue').lt('due_date', sixtyDaysAgo()),
    client.from('sla_breaches_view_or_query')  // depends on Phase 14 setup
  ])

  return {
    total: (rfqs.count ?? 0) + (quotes.count ?? 0) + (approvals.count ?? 0)
      + (deliveries.count ?? 0) + (invoices.count ?? 0) + (sla.count ?? 0),
    breakdown: { rfqs: rfqs.count ?? 0, quotes: quotes.count ?? 0, /* ... */ }
  }
})
```

### Anti-Patterns to Avoid
- **Dashboard layout:** NO sidebars, NO breadcrumbs, NO KPI cards on canvas. The canvas is open space.
- **Disabled icons:** Permission-filtered means HIDDEN, not grayed out. If no permission, the icon and hotkey don't exist.
- **watch() instead of useWatch():** React 19 + React Compiler breaks watch(). Always useWatch().
- **Motion on Popover/Menu:** Use CSS transitions for Popover and Menu. Motion + AnimatePresence causes race condition (#9158).
- **@theme for colors:** Colors MUST be in `:root {}`. `--color-base` in @theme makes `text-base` set color.
- **Zustand without skipHydration:** SSR mismatch. Use `skipHydration: true` + `rehydrate()` in useEffect.
- **Date.now() in render:** Causes hydration mismatch. Compute greeting time in useEffect or server function.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Fuzzy search | Custom string matching | fuse.js 7.3.0 | Handles typos, Arabic text, ranking, thresholds |
| Hotkey handling | addEventListener + key parsing | @tanstack/react-hotkeys via useShortcut | Handles modifiers, scoping, cleanup, SSR |
| Glass window animations | Custom CSS transitions | GlassWindow / GlassElevated from @hyperquote/ui | Spring/tween already tuned, backdrop, z-index |
| State machine | if/else chains | @xstate/store | Explicit transitions, <1KB, prevents invalid states |
| Accessible dialog | div with role="dialog" | React Aria Dialog | Focus trap, keyboard handling, screen reader |
| Autocomplete | Custom dropdown | React Aria Autocomplete | Keyboard navigation, ARIA roles, filtering |
| Real-time subscriptions | Polling | Supabase Realtime postgres_changes | Efficient, server-pushed, auto-reconnect |
| Number formatting | String concatenation | @hyperquote/i18n formatNumber | Arabic-Indic numerals, locale-aware |

**Key insight:** The @hyperquote/ui package already has GlassWindow, GlassElevated, CommandPalette, LionMark, Skeleton, EmptyState, and StatusBadge. The internal app should compose these, not rebuild them.

## Common Pitfalls

### Pitfall 1: Escape Key Double-Fire
**What goes wrong:** React Aria Dialog catches Escape and closes itself, AND the global hotkey handler also fires.
**Why it happens:** Both listeners respond to the same keydown event.
**How to avoid:** Set `isKeyboardDismissDisabled` on ALL React Aria Dialogs. Handle Escape exclusively in the hotkey system via `useShortcut('Escape', ...)`.
**Warning signs:** Window closes and something else happens (e.g., parent also responds).

### Pitfall 2: Hotkeys Fire While Typing
**What goes wrong:** Pressing 'S' in a text input opens the Sales module.
**Why it happens:** Global hotkey listener doesn't check focus target.
**How to avoid:** Keyboard scope state machine. When any input is focused, set scope to 'input'. Pass `{ enabled: scope !== 'input' }` to useShortcut.
**Warning signs:** Module windows opening while filling out forms.

### Pitfall 3: Arrow Key Conflicts
**What goes wrong:** Arrow keys navigate both the command palette's Menu/ListBox AND some global hotkey.
**Why it happens:** Both systems listen for ArrowUp/ArrowDown.
**How to avoid:** Disable global arrow key hotkeys when command palette or any menu is open: `{ enabled: !isMenuOpen }`.
**Warning signs:** Focus jumps unexpectedly in menus.

### Pitfall 4: Zustand Hydration Mismatch
**What goes wrong:** Server renders with default store state, client rehydrates with different state, React warns.
**Why it happens:** Zustand store is module-scoped and shared between server/client.
**How to avoid:** `skipHydration: true` on store creation. Call `useInternalStore.persist.rehydrate()` in a `useEffect` at the root. Or simply don't persist to localStorage -- window state is session-scoped per spec.
**Warning signs:** React hydration mismatch warnings in console.

### Pitfall 5: Greeting Time-Awareness in SSR
**What goes wrong:** Server renders "Good morning" but client is in different timezone, causing mismatch.
**Why it happens:** `new Date().getHours()` returns server time during SSR.
**How to avoid:** Compute greeting in a `useEffect` or via `useState` with initial null, rendering a neutral skeleton during SSR. The portal's Greeting already handles this correctly with `useState`.
**Warning signs:** Flash of wrong greeting text.

### Pitfall 6: Notification Realtime Channel Leak
**What goes wrong:** Unsubscribed channels accumulate, hitting Supabase channel limit.
**Why it happens:** useEffect cleanup not properly unsubscribing from Supabase Realtime.
**How to avoid:** Always `channel.unsubscribe()` in useEffect cleanup. Use a single channel for notifications, not one per notification.
**Warning signs:** "Too many channels" error from Supabase.

### Pitfall 7: 100+ Routes Slowing Vite Dev
**What goes wrong:** Vite dev server becomes sluggish with all module routes.
**Why it happens:** TanStack Router generates route tree eagerly.
**How to avoid:** Use lazy route imports (`route.lazy(() => import('./...'))`). Module content is deferred to Phases 16-22, so Phase 15 only has placeholder routes. Keep it lean.
**Warning signs:** HMR taking >2 seconds.

### Pitfall 8: Activity Feed Tables Don't Exist
**What goes wrong:** Server functions fail because `entity_comments` / `mentions` tables are missing.
**Why it happens:** Phase 14 (database) didn't include activity feed tables -- they weren't in the original 94-table spec.
**How to avoid:** Phase 15 MUST include a new migration creating activity feed infrastructure tables. Minimum: `entity_comments` (id, tenant_id, entity_type, entity_id, user_id, body, is_internal, created_at) and `comment_mentions` (id, comment_id, mentioned_user_id, acknowledged_at).
**Warning signs:** "relation does not exist" errors.

## Code Examples

### Internal Auth Check (mirrors portal pattern)
```typescript
// src/lib/auth.ts
import { createServerFn } from '@tanstack/react-start'
import { getServerSession } from '@hyperquote/auth'
import type { AuthSession } from '@hyperquote/auth'

function getSupabaseConfig() {
  return {
    supabaseUrl: process.env.SUPABASE_URL ?? 'https://placeholder.supabase.co',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? 'placeholder',
  }
}

function isDevMode(): boolean {
  return !process.env.SUPABASE_URL || process.env.SUPABASE_URL === 'https://placeholder.supabase.co'
}

export const checkInternalAuth = createServerFn().handler(
  async (): Promise<{ auth: AuthSession | null; isExternalUser: boolean }> => {
    if (isDevMode()) {
      return {
        auth: {
          session: {} as AuthSession['session'],
          user: {
            id: 'dev-internal-user',
            user_metadata: { name: 'Dev Employee' },
            app_metadata: { pool: 'internal', roles: ['admin'], tenant_id: 'dev-tenant' },
          } as AuthSession['user'],
          pool: 'internal',
          roles: ['admin'],
          tenantId: 'dev-tenant',
        },
        isExternalUser: false,
      }
    }

    const session = await getServerSession(getSupabaseConfig())
    if (!session) return { auth: null, isExternalUser: false }
    if (session.pool !== 'internal') return { auth: null, isExternalUser: true }
    return { auth: session, isExternalUser: false }
  },
)
```

### Notifications Realtime Subscription
```typescript
// src/hooks/useNotifications.ts
import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@supabase/supabase-js'

export function useNotificationsRealtime(userId: string) {
  const queryClient = useQueryClient()

  useEffect(() => {
    const supabase = createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY,
    )

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          // Invalidate TanStack Query cache -- never write to store directly
          queryClient.invalidateQueries({ queryKey: ['notifications'] })
        },
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [userId, queryClient])
}
```

### Window Header (56px, spec-compliant)
```typescript
// Component pattern for every module glass window header
<div className="flex items-center justify-between h-14 px-6 border-b border-[var(--color-border)]/50">
  <div className="flex items-center gap-2">
    <ModuleIcon size={20} className="text-[var(--color-text-muted)]" />
    <span className="font-semibold text-[var(--text-lg)] text-[var(--color-text)]">
      {t(module.i18nKey)}
    </span>
  </div>
  <Button
    onPress={onClose}
    aria-label={t('window.close')}
    className="flex items-center justify-center w-11 h-11 rounded-full text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors cursor-pointer"
  >
    <X size={20} strokeWidth={1.5} />
  </Button>
</div>
```

## Database Migration Needed

Phase 15 requires a NEW migration for activity feed / @mention infrastructure. These tables do NOT exist yet in any migration.

### Required Tables

```sql
-- entity_comments: polymorphic activity feed
CREATE TABLE entity_comments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id),
  entity_type   TEXT NOT NULL,          -- 'order', 'quote', 'customer', 'delivery', 'ticket'
  entity_id     UUID NOT NULL,
  user_id       UUID NOT NULL REFERENCES auth.users(id),
  body          TEXT NOT NULL,
  is_internal   BOOLEAN DEFAULT TRUE,   -- blue=internal, gray=external
  is_system     BOOLEAN DEFAULT FALSE,  -- system events (status changes, auto-actions)
  metadata      JSONB DEFAULT '{}',     -- flexible data for system events
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- comment_mentions: @mention tracking
CREATE TABLE comment_mentions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id        UUID NOT NULL REFERENCES entity_comments(id) ON DELETE CASCADE,
  mentioned_user_id UUID NOT NULL REFERENCES auth.users(id),
  acknowledged_at   TIMESTAMPTZ,
  escalated_at      TIMESTAMPTZ,        -- Hot Potato: set when 30min timeout fires
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_entity_comments_entity ON entity_comments(tenant_id, entity_type, entity_id);
CREATE INDEX idx_entity_comments_user ON entity_comments(tenant_id, user_id);
CREATE INDEX idx_comment_mentions_user ON comment_mentions(mentioned_user_id, acknowledged_at);

-- RLS
ALTER TABLE entity_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_mentions ENABLE ROW LEVEL SECURITY;
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| framer-motion | motion/react (v12) | 2024 | Import path changed, same API |
| @tanstack/start | @tanstack/react-start | TanStack Start v1.x | Package name was stabilized |
| zodResolver | standardSchemaResolver | RHF 7.70+ | Zod 4 uses Standard Schema |
| watch() | useWatch() | React 19 | watch() broken with React Compiler |

**Deprecated/outdated:**
- `framer-motion` import path: use `motion/react`
- `@tanstack/start`: use `@tanstack/react-start`
- `validator()` on server functions: use `inputValidator()`

## Open Questions

1. **Permission Loading Strategy**
   - What we know: `hasPermission()` currently returns `true` always (stub). Role-permission seed data exists in DB (359 rows across 20 roles).
   - What's unclear: How/when to load the user's permissions client-side. Options: (a) include in JWT claims via custom access token hook, (b) fetch on app load and cache in Zustand, (c) fetch per-module on demand.
   - Recommendation: Fetch once on auth and store in Zustand. JWT claims are limited in size; 359 permissions could exceed JWT size limits. Cache in store with session scope.

2. **SLA Breach Query for Urgent Items**
   - What we know: Phase 14 includes `pg_cron` for SLA breach detection. There may be a materialized view or a query pattern.
   - What's unclear: Exact table/view name for active SLA breaches.
   - Recommendation: Use a count query against relevant tables with SLA conditions inline. If a view exists from Phase 14, use it.

3. **Activity Feed Hot Potato Escalation**
   - What we know: Spec says unacknowledged @mentions escalate to department manager after 30 minutes.
   - What's unclear: How escalation triggers -- pg_cron job vs. application-level check.
   - Recommendation: Create the data model (escalated_at column) in Phase 15. The actual escalation trigger (cron or application) can be wired in a later phase when department manager routing is fully implemented.

4. **Vacation Delegation Routing**
   - What we know: Spec mentions vacation delegation for @mentions.
   - What's unclear: No `delegation` or `vacation` table exists yet.
   - Recommendation: Defer actual delegation to the HR module (Phase 22). Phase 15 activity feed should have the routing hook point but not implement delegation logic.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Bun | Package management | Needs verification | -- | -- |
| Vite | Dev server + build | Available via deps | ~7.3.1 | -- |
| @xstate/store | Keyboard scope | Available on npm | 3.17.1 | Zustand (less explicit) |
| Supabase (local) | Auth + Realtime testing | Dev mode fallback exists | -- | Mock data pattern from portal |

**Missing dependencies with no fallback:** None -- all external deps are npm packages. Supabase has dev mode fallback.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest ^4.1.2 |
| Config file | None yet for internal app -- Wave 0 gap |
| Quick run command | `cd apps/internal && bun test` |
| Full suite command | `cd apps/internal && bun test --run` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INT-01 | Auth guard rejects external pool | unit | `bun test src/lib/auth.test.ts` | Wave 0 |
| INT-02 | Urgent item count aggregates 6 sources | unit | `bun test src/lib/server/urgent-items.test.ts` | Wave 0 |
| INT-03 | Module registry maps all 11 modules | unit | `bun test src/lib/modules.test.ts` | Wave 0 |
| INT-04 | Window state preserves and restores | unit | `bun test src/stores/internal.test.ts` | Wave 0 |
| INT-05 | Fuse.js search returns relevant results | unit | `bun test src/hooks/useCommandSearch.test.ts` | Wave 0 |
| INT-06 | Notification subscription cleanup | unit | `bun test src/hooks/useNotifications.test.ts` | Wave 0 |
| INT-07 | Mobile responsive breakpoints | manual-only | Manual viewport testing | N/A |
| INT-08 | Activity feed renders comments + system events | unit | `bun test src/components/activity/ActivityFeed.test.ts` | Wave 0 |

### Sampling Rate
- **Per task commit:** `cd apps/internal && bun test --run`
- **Per wave merge:** Full suite across internal app
- **Phase gate:** All tests green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `apps/internal/vitest.config.ts` -- test configuration
- [ ] `apps/internal/src/lib/modules.test.ts` -- module registry validation
- [ ] `apps/internal/src/stores/internal.test.ts` -- window state store tests

## Project Constraints (from CLAUDE.md)

- **Three colors only:** White, Black, Blue #2563EB. Semantic status colors for DATA only.
- **TanStack Start, NOT Next.js.** React Aria, NOT shadcn. Motion v12, NOT framer-motion. Bun, NOT npm.
- **useWatch() never watch().** `.inputValidator()` not `.validator()`. Colors in `:root {}` never `@theme`.
- **`isKeyboardDismissDisabled` on Dialogs.** Escape handled by hotkeys system only.
- **Geist Mono for ALL numbers.** Urgent item counts, badge counts, timestamps.
- **Permission-filtered = hidden, not disabled.**
- **Zustand SSR:** `skipHydration: true` + `rehydrate()` in useEffect.
- **Popovers and menus:** CSS transitions, NOT Motion v12 (race condition #9158).
- **Logical properties ONLY:** `ps-4` NOT `pl-4`, `me-2` NOT `mr-2`.
- **Arabic-Indic numerals** when locale is Arabic. All numbers via `formatNumber()`.
- **Fix from the root, never patch over symptoms.**
- **Dynamic fixes only** -- never hardcode counts or static workarounds.

## Sources

### Primary (HIGH confidence)
- Portal codebase (apps/portal/) -- established patterns for auth, shortcuts, windows, canvas
- @hyperquote/ui package -- GlassWindow, GlassElevated, CommandPalette, LionMark, Skeleton, EmptyState
- @hyperquote/auth package -- authGuard, getServerSession, hasPermission
- Supabase migrations (020, 021) -- notifications table schema verified
- CONTEXT.md Phase 15 -- comprehensive spec from FRONTEND.md

### Secondary (MEDIUM confidence)
- @xstate/store v3.17.1 API -- verified version on npm, ~178KB unpacked (small)
- fuse.js v7.3.0 -- verified version on npm
- @tanstack/react-hotkeys v0.9.1 -- already used in portal since Phase 7

### Tertiary (LOW confidence)
- Permission loading strategy -- no established pattern yet in codebase, recommendation is analytical
- SLA breach query details -- depends on Phase 14 implementation specifics

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already used in portal or verified on npm
- Architecture: HIGH -- mirrors portal patterns with well-documented differences
- Pitfalls: HIGH -- most pitfalls observed and solved during portal development (Phases 7-12)
- Activity feed schema: MEDIUM -- new tables, no prior art in codebase, but straightforward polymorphic pattern

**Research date:** 2026-04-05
**Valid until:** 2026-05-05 (stable domain, no fast-moving dependencies)
