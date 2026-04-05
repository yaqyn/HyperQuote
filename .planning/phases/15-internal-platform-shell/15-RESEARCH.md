# Phase 15: Internal Platform Shell - Research

**Researched:** 2026-04-05
**Domain:** TanStack Start SPA shell with spatial glass UI, hotkey navigation, command palette, state preservation
**Confidence:** HIGH

## Summary

Phase 15 builds the internal platform shell -- a spatial canvas with 11 module windows navigated by single-key hotkeys and a Ctrl+K command palette. The portal app (Phase 7) already established the core patterns: `useShortcut()` abstraction over `@tanstack/react-hotkeys`, `WindowShell` component with spring enter/tween exit, `Greeting` component with time-aware text, and `useRealtimeNotifications` hook. The internal app differs in three key ways: (1) it has 11 modules vs the portal's 3-4 windows, requiring keyed Zustand state preservation on swap; (2) it uses a persistent icon strip instead of nav buttons; (3) it requires a keyboard scope state machine (Canvas/Panel/Input) via `@xstate/store` to prevent hotkey conflicts with text inputs.

The internal app skeleton already exists at `apps/internal/` with TanStack Start, React 19, Vite 7, Cloudflare plugin, and Tailwind v4 configured. It needs dependencies added (zustand, motion, react-aria-components, lucide-react, fuse.js, @xstate/store, @tanstack/react-hotkeys, i18next, @supabase/supabase-js, @hyperquote/ui, @hyperquote/auth, @hyperquote/i18n) and the shell built.

**Primary recommendation:** Mirror portal patterns (layout route with `beforeLoad` auth guard, `useShortcut()`, `WindowShell`), add keyed Zustand stores for window state preservation, and implement keyboard scope via `@xstate/store` to manage hotkey/input focus conflicts.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
No CONTEXT.md `## Decisions` section found -- all decisions come from the CONTEXT.md spec references and non-negotiable rules embedded in the file.

Key locked constraints from CONTEXT.md:
- TanStack Start, NOT Next.js
- React Aria Components, NOT shadcn
- Motion v12, NOT framer-motion
- Spatial glass, not dashboards -- NO sidebar nav, NO breadcrumbs, NO KPI cards on canvas
- `isKeyboardDismissDisabled` on Dialogs
- Geist Mono for ALL numbers
- Three colors only (white/black/blue #2563EB)
- Permission-filtered: if employee lacks access, icon and hotkey don't exist
- Colors in `:root {}`, NEVER in `@theme`
- Bun, NOT npm/yarn/pnpm
- @tanstack/react-hotkeys wrapped behind `useShortcut()` abstraction
- Keyboard scope state machine via @xstate/store
- Window state preservation via Zustand keyed by module name
- `skipHydration: true` + `rehydrate()` in useEffect for Zustand SSR
- Command palette built from React Aria Autocomplete + Dialog + Menu
- Popovers and menus use CSS transitions, NOT Motion v12
- GlassWindow and GlassElevated are separate components (from Phase 3 decision)

### Claude's Discretion
No explicit discretion areas defined. CONTEXT.md is comprehensive -- follow spec exactly.

### Deferred Ideas (OUT OF SCOPE)
- Offline/PWA behavior (mentioned in spec but not in Phase 15 requirements)
- Module content (Phases 16-22 build the actual module screens)
- Service worker registration
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INT-01 | Auth: `beforeLoad` with internal pool check (`hq-internal-session` cookie) | `@hyperquote/auth` `authGuard()` with `requiredPool: 'internal'` -- pattern proven in portal `_portal.tsx` |
| INT-02 | Canvas: time-aware greeting, urgent item count (6 sources), lion watermark, role-based quick actions | Portal `Greeting` component reusable; `LionMark` from `@hyperquote/ui`; urgent items need server function with 6 parallel queries |
| INT-03 | Icon strip: 11 module icons (permission-filtered), hotkeys (S/P/O/W/F/D/C/H/A/R/I) | `useShortcut()` hook from portal, `lucide-react` icons, `hasPermission()` from `@hyperquote/auth` |
| INT-04 | Glass windows: spring open/tween close, ~90% viewport, window state preservation on swap | `GlassWindow` from `@hyperquote/ui`, Zustand store keyed by module ID for state preservation |
| INT-05 | Command palette: Ctrl+K, elevated glass, fuse.js cross-entity search, keyboard navigation | `CommandPalette` shell from `@hyperquote/ui`, `GlassElevated`, React Aria `Autocomplete` + `Dialog` + `Menu`, fuse.js 7.3 |
| INT-06 | Notifications: badge on bell, glass window, grouped by time, real-time via Supabase Realtime | Portal `useRealtimeNotifications` pattern, `NotificationBell` pattern |
| INT-07 | Mobile: canvas grid of tappable glass cards, full-screen module views, back gesture | Responsive breakpoint switch: icon strip on desktop, card grid on mobile; no icon strip on mobile |
| INT-08 | Shared activity feed / @mention / handoff infrastructure | New component: `ActivityFeed` with internal/external comment types, @mention parsing, Hot Potato timer |
</phase_requirements>

## Standard Stack

### Core (already configured in apps/internal)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @tanstack/react-start | ^1.167.12 | SSR framework | Project standard, already in internal app |
| React | ^19.2.4 | UI library | Already configured |
| Vite | ~7.3.1 | Build tool | NOT Vite 8 -- compatibility issue |
| Tailwind CSS | ^4.2.2 | Styling | Already configured |
| TypeScript | ^6.0.2 | Type safety | Already configured |

### To Add (dependencies needed for Phase 15)
| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| zustand | ^5.0.12 | Window state preservation, UI store | Keyed by module for swap preservation; `skipHydration: true` for SSR |
| motion | ^12.38.0 | Spring enter / tween exit on glass windows | Project standard, used by GlassWindow/GlassElevated |
| react-aria-components | ^1.16.0 | Dialog, Autocomplete, Menu for command palette | Project standard, NOT shadcn |
| tailwindcss-react-aria-components | ^2.0.1 | Tailwind data-attribute selectors for RAC | Required for RAC styling |
| lucide-react | ^1.7.0 | Module icons (11 icons) | Tree-shaken, ~200-300 bytes/icon |
| fuse.js | ^7.3.0 | Fuzzy search in command palette | Lightweight client-side fuzzy search |
| @xstate/store | ^3.17.1 | Keyboard scope state machine (Canvas/Panel/Input) | <1KB gzipped, manages hotkey vs text input conflicts |
| @tanstack/react-hotkeys | ^0.9.1 | Hotkey binding (wrapped by useShortcut) | Project standard, pre-alpha but working in portal |
| @tanstack/react-query | ^5.95.2 | Server state for urgent items, notifications | SSR dehydrate/hydrate via router integration |
| @tanstack/react-router-ssr-query | ^1.166.10 | SSR query integration | Automatic dehydrate/hydrate |
| i18next | ^26.0.3 | Internationalization | AR+EN, time-aware greetings |
| react-i18next | ^17.0.0 | React bindings for i18next | useTranslation hook |
| @supabase/supabase-js | ^2.101.1 | Realtime notifications, auth | Client-side realtime subscriptions |
| @hyperquote/ui | workspace:* | GlassWindow, GlassElevated, CommandPalette, LionMark, StatusBadge, Skeleton, Toast, EmptyState | Shared design system |
| @hyperquote/auth | workspace:* | authGuard, hasPermission, AuthSession types | Auth guard with pool check |
| @hyperquote/i18n | workspace:* | formatNumber, Arabic-Indic numerals | Number formatting in greeting |
| @hyperquote/types | workspace:* | Shared TypeScript types | DB enums, entity types |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @tanstack/react-hotkeys | react-hotkeys-hook 5.2.4 | Fallback if TanStack hotkeys breaks -- useShortcut() abstraction makes swap painless |
| @xstate/store | Plain Zustand enum | @xstate/store gives explicit state machine transitions; Zustand is manual -- xstate is correct for keyboard scope |
| fuse.js | flexsearch | fuse.js already used in portal + website; don't introduce a second search lib |

**Installation:**
```bash
cd apps/internal && bun add zustand motion react-aria-components tailwindcss-react-aria-components lucide-react fuse.js @xstate/store @tanstack/react-hotkeys @tanstack/react-query @tanstack/react-router-ssr-query i18next react-i18next @supabase/supabase-js @hyperquote/ui@workspace:* @hyperquote/auth@workspace:* @hyperquote/i18n@workspace:* @hyperquote/types@workspace:*
```

## Architecture Patterns

### Recommended Project Structure
```
apps/internal/src/
  routes/
    __root.tsx              # HTML shell, I18nProvider, QueryClient
    _internal.tsx           # Layout route: beforeLoad auth guard, icon strip, shortcuts
    _internal/
      index.tsx             # Canvas (greeting, urgent items, lion watermark)
      $module.tsx            # Dynamic module route (or individual module routes)
  components/
    shell/
      IconStrip.tsx         # 11 permission-filtered module icons
      WindowHeader.tsx      # 56px header: icon + name + close
      InternalCanvas.tsx    # Greeting + urgent count + lion + quick actions
      NotificationBell.tsx  # Badge + bell icon
      MobileModuleGrid.tsx  # 2-column card grid for mobile
    command-palette/
      InternalCommandPalette.tsx  # Fuse.js search + React Aria Autocomplete
      CommandResult.tsx     # Individual search result row
    activity-feed/
      ActivityFeed.tsx      # Shared activity feed component
      ActivityItem.tsx      # Single activity entry
      MentionInput.tsx      # @mention text input
  stores/
    internal.ts             # Active module, window states keyed by module
    keyboard-scope.ts       # @xstate/store: Canvas -> Panel -> Input
    notifications.ts        # Notification state
  hooks/
    useShortcut.ts          # Copy from portal -- same abstraction
    useKeyboardScope.ts     # Hook wrapping @xstate/store
    useWindowState.ts       # Read/write keyed Zustand state for module
    useUrgentItems.ts       # Aggregate 6 urgent item sources
  lib/
    modules.ts              # Module registry: id, icon, label, hotkey, permission
    server/
      urgent-items.ts       # Server function: 6 parallel queries
      notifications.ts      # Server functions for notification CRUD
      activity-feed.ts      # Server functions for activity feed
      command-search.ts     # Server function for entity search
```

### Pattern 1: Layout Route with Internal Auth Guard
**What:** `_internal.tsx` layout route with `beforeLoad` checking internal pool
**When to use:** Every internal platform route must be wrapped
**Example:**
```typescript
// apps/internal/src/routes/_internal.tsx
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { authGuard } from '@hyperquote/auth'

export const Route = createFileRoute('/_internal')({
  beforeLoad: async () => {
    const auth = await authGuard({
      supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
      supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      requiredPool: 'internal',
      loginPath: '/login',
    })
    return { auth }
  },
  component: InternalLayout,
})
```

### Pattern 2: Keyboard Scope State Machine
**What:** @xstate/store managing Canvas/Panel/Input states to control when hotkeys fire
**When to use:** Prevents single-letter hotkeys from firing when user types in text inputs
**Example:**
```typescript
// stores/keyboard-scope.ts
import { createStore } from '@xstate/store'

export const keyboardScopeStore = createStore({
  context: { scope: 'canvas' as 'canvas' | 'panel' | 'input' },
  on: {
    openPanel: { scope: 'panel' },
    closePanel: { scope: 'canvas' },
    focusInput: { scope: 'input' },
    blurInput: (ctx) => ({
      scope: ctx.context.scope === 'input'
        ? (/* check if panel open */ 'panel')
        : 'canvas',
    }),
  },
})

// In useShortcut wrapper:
// Single-letter hotkeys only fire when scope === 'canvas'
// Mod+key hotkeys fire in canvas and panel
// No hotkeys fire in input scope (except Escape)
```

### Pattern 3: Keyed Window State Preservation
**What:** Zustand store with per-module state maps
**When to use:** When user swaps between modules and expects to return to previous state
**Example:**
```typescript
// stores/internal.ts
import { create } from 'zustand'

interface WindowState {
  scrollTop: number
  activeTab?: string
  expandedSections: string[]
  filters: Record<string, unknown>
}

interface InternalStore {
  activeModule: string | null
  windowStates: Record<string, WindowState>
  setActiveModule: (module: string | null) => void
  saveWindowState: (module: string, state: Partial<WindowState>) => void
  getWindowState: (module: string) => WindowState | undefined
}

export const useInternalStore = create<InternalStore>()((set, get) => ({
  activeModule: null,
  windowStates: {},
  setActiveModule: (module) => set({ activeModule: module }),
  saveWindowState: (module, state) =>
    set((s) => ({
      windowStates: {
        ...s.windowStates,
        [module]: { ...s.windowStates[module], ...state } as WindowState,
      },
    })),
  getWindowState: (module) => get().windowStates[module],
}))
```

### Pattern 4: Module Registry
**What:** Static config array defining all 11 modules with their icons, hotkeys, and required permissions
**When to use:** Drives icon strip rendering, hotkey registration, and permission filtering
**Example:**
```typescript
// lib/modules.ts
import {
  Tag, ShoppingCart, ClipboardList, Warehouse, Banknote,
  Truck, Headset, Users, Settings, BarChart3, Sparkles,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface ModuleConfig {
  id: string
  icon: LucideIcon
  labelKey: string  // i18n key
  hotkey: string
  permission: string
}

export const MODULES: ModuleConfig[] = [
  { id: 'sales', icon: Tag, labelKey: 'modules.sales', hotkey: 'S', permission: 'sales.read' },
  { id: 'procurement', icon: ShoppingCart, labelKey: 'modules.procurement', hotkey: 'P', permission: 'procurement.read' },
  { id: 'orders', icon: ClipboardList, labelKey: 'modules.orders', hotkey: 'O', permission: 'orders.read' },
  { id: 'warehouse', icon: Warehouse, labelKey: 'modules.warehouse', hotkey: 'W', permission: 'warehouse.read' },
  { id: 'finance', icon: Banknote, labelKey: 'modules.finance', hotkey: 'F', permission: 'finance.read' },
  { id: 'dispatch', icon: Truck, labelKey: 'modules.dispatch', hotkey: 'D', permission: 'dispatch.read' },
  { id: 'customer-service', icon: Headset, labelKey: 'modules.customerService', hotkey: 'C', permission: 'customer_service.read' },
  { id: 'hr', icon: Users, labelKey: 'modules.hr', hotkey: 'H', permission: 'hr.read' },
  { id: 'admin', icon: Settings, labelKey: 'modules.admin', hotkey: 'A', permission: 'admin.read' },
  { id: 'reports', icon: BarChart3, labelKey: 'modules.reports', hotkey: 'R', permission: 'reports.read' },
  { id: 'ai', icon: Sparkles, labelKey: 'modules.ai', hotkey: 'I', permission: 'ai.read' },
]
```

### Pattern 5: Internal Window Shell (distinct from portal WindowShell)
**What:** Glass window that fills ~90% viewport on desktop, 100% on mobile, with module header
**When to use:** Every module opens in this shell
**Key differences from portal:**
- Portal WindowShell is full-screen with centered content (like claude.ai)
- Internal window is a floating glass panel (~90% viewport) with backdrop dimming
- Uses `GlassWindow` from `@hyperquote/ui`, NOT a custom full-screen overlay
- 56px header with module icon + name + close button (per spec)

### Anti-Patterns to Avoid
- **Dashboard layout:** No sidebars, breadcrumbs, or KPI cards on canvas. The canvas is empty space with greeting.
- **Direct @tanstack/react-hotkeys import:** Always go through `useShortcut()` abstraction.
- **Motion on Popover/Menu:** Use CSS transitions per React Aria gotcha (#9158).
- **watch() from RHF:** Use `useWatch()` -- `watch()` broken with React Compiler.
- **Disabled elements for unauthorized:** Hide entirely. `hasPermission` false = element doesn't render.
- **Navigator.language in render:** Detect locale from cookie/header server-side, pass as prop.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Fuzzy search | Custom string matching | fuse.js 7.3 | Handles typos, partial matches, weighted fields; <10KB |
| Keyboard shortcuts | addEventListener('keydown') | useShortcut() -> @tanstack/react-hotkeys | Scope management, modifier keys, cleanup |
| State machine | Manual enum + switch | @xstate/store | Prevents invalid transitions, <1KB, type-safe |
| Glass panel animations | Manual CSS transitions | GlassWindow / GlassElevated from @hyperquote/ui | Spring/tween physics already tuned |
| Auth guard | Manual cookie parsing | @hyperquote/auth authGuard() | Pool check, role extraction, redirect all handled |
| Realtime notifications | Polling | Supabase Realtime postgres_changes | Instant delivery, auto-reconnect, filter by user_id |
| Number formatting (Arabic-Indic) | Manual digit replacement | @hyperquote/i18n formatNumber() | Handles all edge cases: decimals, negatives, thousands |

## Common Pitfalls

### Pitfall 1: Hotkey Fires in Text Input
**What goes wrong:** User types "S" in command palette search and Sales module opens
**Why it happens:** Single-letter hotkeys have no modifier key
**How to avoid:** Keyboard scope state machine. When scope is 'input', suppress all single-letter hotkeys. Only Escape and Mod+key combos fire in input scope. Detect focus/blur on all text inputs via focus event delegation.
**Warning signs:** Module unexpectedly opens while typing

### Pitfall 2: Escape Key Double-Fire
**What goes wrong:** Pressing Escape both closes React Aria Dialog AND fires global Escape handler
**Why it happens:** React Aria Dialog has built-in Escape handling
**How to avoid:** `isKeyboardDismissDisabled` on all React Aria Dialogs. Global Escape handler in useShortcut manages close behavior exclusively.
**Warning signs:** Flash/flicker on Escape press, window closes and immediately reopens

### Pitfall 3: Zustand SSR Hydration Mismatch
**What goes wrong:** Server renders with empty store, client has cached state; React hydration warning
**Why it happens:** Zustand store initializes differently on server vs client
**How to avoid:** `skipHydration: true` on store creation, `rehydrate()` call in useEffect. Window states are session-scoped (no persist middleware).
**Warning signs:** Console hydration mismatch warnings, flash of wrong content

### Pitfall 4: Window State Not Saved Before Swap
**What goes wrong:** User is in Sales with filters applied, presses P for Procurement, returns to Sales with filters lost
**Why it happens:** State save not triggered before module swap
**How to avoid:** On module change, save current window's scroll position, active tab, filters to Zustand store BEFORE opening new module. Use a cleanup effect or pre-swap callback.
**Warning signs:** State resets when returning to a previously visited module

### Pitfall 5: 100+ Routes Slow Vite Dev
**What goes wrong:** Vite dev server takes 10+ seconds to start
**Why it happens:** All routes imported eagerly
**How to avoid:** Lazy imports for all module content routes. Phase 15 only creates the shell -- module content routes come in Phases 16-22.
**Warning signs:** Dev server startup > 5 seconds

### Pitfall 6: Command Palette Arrow Keys Conflict with Global Hotkeys
**What goes wrong:** Arrow key navigation in Autocomplete menu triggers unrelated actions
**Why it happens:** Global arrow key hotkeys and React Aria menu both listen
**How to avoid:** Disable arrow key global hotkeys when keyboard scope is 'panel' or 'input'. `useShortcut('ArrowDown', handler, { enabled: scope === 'canvas' })`
**Warning signs:** Unexpected navigation when using command palette

### Pitfall 7: Notification Badge Count Hydration
**What goes wrong:** Server renders 0 badges, client shows real count -- flash
**Why it happens:** Notification count is user-specific, changes in real-time
**How to avoid:** Don't SSR the notification count. Render badge client-side only after query resolves. Use Skeleton placeholder.
**Warning signs:** Badge flashes from 0 to N on page load

## Code Examples

### Urgent Items Server Function
```typescript
// lib/server/urgent-items.ts
import { createServerFn } from '@tanstack/react-start'

export const getUrgentItems = createServerFn({ method: 'GET' })
  .handler(async () => {
    // 6 parallel queries for urgent item sources
    const [
      unassignedRfqs,
      expiringQuotes,
      pendingApprovals,
      problemDeliveries,
      overdueInvoices,
      slaBreaches,
    ] = await Promise.all([
      countUnassignedRfqs(),    // > 30 min old
      countExpiringQuotes(),    // within 24h
      countPendingApprovals(),  // for this user
      countProblemDeliveries(), // red status
      countOverdueInvoices(),   // > 60 days (finance role only)
      countSlaBreaches(),       // in progress
    ])

    return {
      total: unassignedRfqs + expiringQuotes + pendingApprovals
             + problemDeliveries + overdueInvoices + slaBreaches,
      breakdown: {
        unassignedRfqs,
        expiringQuotes,
        pendingApprovals,
        problemDeliveries,
        overdueInvoices,
        slaBreaches,
      },
    }
  })
```

### Icon Strip with Permission Filtering
```typescript
// components/shell/IconStrip.tsx
import { Button } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { hasPermission } from '@hyperquote/auth'
import { MODULES } from '../../lib/modules'
import { useInternalStore } from '../../stores/internal'

export function IconStrip({ auth }: { auth: AuthSession }) {
  const { t } = useTranslation('internal')
  const activeModule = useInternalStore((s) => s.activeModule)
  const setActiveModule = useInternalStore((s) => s.setActiveModule)

  const allowedModules = MODULES.filter((m) =>
    hasPermission(auth, m.permission)
  )

  return (
    <nav className="fixed inset-y-0 start-0 z-30 flex flex-col items-center gap-1 py-16 px-2 max-md:hidden">
      {allowedModules.map((mod) => (
        <Button
          key={mod.id}
          onPress={() =>
            setActiveModule(activeModule === mod.id ? null : mod.id)
          }
          aria-label={t(mod.labelKey)}
          className={cn(
            'flex items-center justify-center w-10 h-10 rounded-lg transition-colors cursor-pointer',
            activeModule === mod.id
              ? 'text-[var(--color-primary)] bg-[var(--color-primary)]/10'
              : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]',
          )}
        >
          <mod.icon size={24} />
        </Button>
      ))}
    </nav>
  )
}
```

### React Aria Command Palette with Fuse.js
```typescript
// components/command-palette/InternalCommandPalette.tsx
import { Dialog, Autocomplete, Menu, MenuItem, Input } from 'react-aria-components'
import { GlassElevated } from '@hyperquote/ui'
import Fuse from 'fuse.js'

// Dialog uses isKeyboardDismissDisabled -- Escape handled by hotkeys only
<Dialog isKeyboardDismissDisabled>
  <Autocomplete
    inputValue={query}
    onInputChange={setQuery}
    items={results}
    filter={(/* custom filter via fuse */)}
  >
    <Input autoFocus placeholder={t('commandPalette.placeholder')} />
    <Menu>
      {(item) => <MenuItem>{item.label}</MenuItem>}
    </Menu>
  </Autocomplete>
</Dialog>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@tanstack/start` | `@tanstack/react-start` | v1.120+ | Old package frozen at 1.120.20; must use react-start |
| `framer-motion` | `motion/react` | Motion v12 | Import path changed; package renamed |
| `zodResolver` | `standardSchemaResolver` | @hookform/resolvers 5.x | Standard schema support; zodResolver deprecated |
| React Aria Popover + Motion | React Aria Popover + CSS transitions | Always | Motion causes race condition #9158 |
| `@tanstack/react-hotkeys` 0.8.3 | 0.9.1 | Recent | API: `useHotkey` (singular), not `useHotkeys` |

## Open Questions

1. **hasPermission() is currently a stub (returns true)**
   - What we know: The function exists in `@hyperquote/auth/session.ts` but always returns true. RLS is the real enforcement.
   - What's unclear: When will role-permission mapping be loaded client-side? Phase 15 needs it for icon filtering.
   - Recommendation: Load role_permissions seed data as a static lookup in the auth package. For Phase 15, implement the lookup from the `role_permissions` table. If DB queries aren't wired yet, use a hardcoded permissions map matching the 359 seed rows from Phase 2.

2. **Activity feed database schema**
   - What we know: DB tables exist from Phase 13/14 (activity_logs, notifications tables). INT-08 needs @mention parsing and Hot Potato escalation.
   - What's unclear: Exact table structure for @mentions and handoff routing.
   - Recommendation: Use activity_logs table for feed entries, notifications table for @mention delivery. Hot Potato escalation is a pg_cron/trigger concern from Phase 14.

3. **Module content placeholder**
   - What we know: Phases 16-22 build actual module content. Phase 15 only builds the shell.
   - What's unclear: What should empty modules show?
   - Recommendation: Each module window renders EmptyState from @hyperquote/ui with "Coming soon" message and module icon. This is explicit -- not a loading state.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest ^4.1.2 |
| Config file | `apps/internal/vitest.config.ts` (needs creation -- portal has one) |
| Quick run command | `cd apps/internal && bun test` |
| Full suite command | `cd apps/internal && bun test --run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INT-01 | Auth guard rejects external pool users | unit | `bun test src/__tests__/auth-guard.test.ts -t "rejects external"` | Wave 0 |
| INT-02 | Greeting shows correct time period + urgent count | unit | `bun test src/__tests__/canvas.test.ts -t "greeting"` | Wave 0 |
| INT-03 | Icon strip renders only permitted modules | unit | `bun test src/__tests__/icon-strip.test.ts -t "permission filter"` | Wave 0 |
| INT-04 | Window state preserved across module swap | unit | `bun test src/__tests__/window-state.test.ts -t "preserves state"` | Wave 0 |
| INT-05 | Command palette filters results with fuse.js | unit | `bun test src/__tests__/command-palette.test.ts -t "fuzzy search"` | Wave 0 |
| INT-06 | Notification realtime subscription triggers invalidation | unit | `bun test src/__tests__/notifications.test.ts -t "realtime"` | Wave 0 |
| INT-07 | Mobile grid renders modules as cards | unit | `bun test src/__tests__/mobile-grid.test.ts -t "card grid"` | Wave 0 |
| INT-08 | Activity feed renders mixed entry types | unit | `bun test src/__tests__/activity-feed.test.ts -t "mixed entries"` | Wave 0 |

### Sampling Rate
- **Per task commit:** `cd apps/internal && bun test --run`
- **Per wave merge:** `cd apps/internal && bun test --run`
- **Phase gate:** Full suite green before verification

### Wave 0 Gaps
- [ ] `apps/internal/vitest.config.ts` -- copy from portal, adjust paths
- [ ] `apps/internal/src/__tests__/` directory
- [ ] All 8 test files listed above
- [ ] Vitest + @testing-library/react as devDependencies

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Bun | Package management, test runner | Verify at execution | -- | -- |
| Supabase (local or remote) | Auth guard, realtime, urgent items | Dev mode fallback exists | -- | Mock auth like portal does |
| Node.js | Vite dev server | Verify at execution | -- | -- |

## Sources

### Primary (HIGH confidence)
- Codebase: `apps/portal/` -- established patterns for shell, auth, shortcuts, windows, notifications
- Codebase: `packages/ui/` -- GlassWindow, GlassElevated, CommandPalette, LionMark components
- Codebase: `packages/auth/` -- authGuard, hasPermission, AuthSession types
- Codebase: `apps/internal/` -- existing skeleton with configured Vite, TanStack Start, Tailwind

### Secondary (MEDIUM confidence)
- npm registry: verified versions for fuse.js (7.3.0), @xstate/store (3.17.1), @tanstack/react-hotkeys (0.9.1)
- STACK-DECISION.md: comprehensive version matrix with audit dates

### Tertiary (LOW confidence)
- None -- all findings verified against codebase and npm registry

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all packages already used in portal or verified on npm
- Architecture: HIGH -- patterns established in portal, internal app follows same conventions
- Pitfalls: HIGH -- keyboard scope conflicts documented in CONTEXT.md, SSR gotchas proven in portal

**Research date:** 2026-04-05
**Valid until:** 2026-05-05 (stable stack, no anticipated breaking changes)

## Project Constraints (from CLAUDE.md)

- **TanStack Start** (NOT Next.js), **React Aria** (NOT shadcn), **Motion v12** (NOT framer-motion), **Bun** (NOT npm)
- `useWatch()` never `watch()`, `.inputValidator()` not `.validator()`, colors in `:root {}` never `@theme`
- `ClientOnly` for maps, `isKeyboardDismissDisabled` on Dialogs
- Three colors only: white/black/blue #2563EB. Geist Mono for ALL numbers.
- 14% VAT, Arabic-Indic numerals, Arabic unit translations
- Fix from the root, never patch over symptoms
- Fix all means fix ALL -- no silent triage
- Verify ALL tiers
- Components under 800 lines
- Logical properties only: `ps-4` NOT `pl-4`, `me-2` NOT `mr-2`
- Popovers/menus use CSS transitions, NOT Motion v12
- `@plugin` NOT `@import` for Tailwind plugins
- `group-data-[selected]:` NOT `group-selected:`
