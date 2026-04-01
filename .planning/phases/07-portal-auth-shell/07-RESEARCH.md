# Phase 7: Portal Auth + Shell - Research

**Researched:** 2026-04-01
**Domain:** TanStack Start app scaffold, Supabase SSR auth, spatial glass UI, Motion v12 animations, Zustand state
**Confidence:** HIGH

## Summary

Phase 7 creates the `apps/portal` application from its current scaffold state (bare __root.tsx + index route) into a fully authenticated spatial canvas with glass window navigation. The portal already has a working TanStack Start + Cloudflare Workers setup (vite.config.ts, wrangler.jsonc, router.tsx) from Phase 1. The `@hyperquote/auth` package already implements `authGuard()` with `beforeLoad` + `requiredPool` support, and `@hyperquote/ui` already exports `GlassWindow` and `GlassElevated` components with correct spring/tween animations. The i18n system, theme utilities, and token CSS are proven patterns from the website app.

The primary work is: (1) wiring auth guard to redirect unauthenticated users to the website login, (2) building the spatial canvas with greeting + AI chat input + navigation buttons, (3) implementing the glass window open/close system with URL deep-linking, and (4) adding keyboard shortcuts, role toggle, notifications bell, and profile menu.

**Primary recommendation:** Mirror the website's __root.tsx pattern (locale detection, theme init, I18nProvider) and use the existing `authGuard({ requiredPool: 'external' })` in a layout route that wraps all portal routes. Glass windows are URL-routed via TanStack Router -- each window route renders inside a `GlassWindow` component with canvas recede animation managed by Zustand.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- Portal uses `beforeLoad` route guard with SSO cookie check -- redirect to `hyperquote.net?login=portal&redirect={encoded_path}` if no session
- Spatial canvas: wide empty space, centered AI chat, two glass buttons (Orders + Market), greeting with urgent items
- Glass windows: spring open (stiffness 200, damping 20), tween close (150ms), canvas recedes (scale 0.96, blur 2px, opacity 0.5)
- React Aria Components for all interactions: Modal for glass windows, ToggleButtonGroup for role switch, Popover for profile menu
- Motion v12 for animations (import from `motion/react`)
- `isKeyboardDismissDisabled` on Dialogs -- handle Escape via hotkeys only
- Geist Mono for ALL numbers (badge counts, timestamps)
- Arabic-Indic numerals in Arabic context
- Zustand for UI state (activeRole, activeWindow) with `skipHydration: true`
- URL deep-linking for all windows -- opening Orders -> URL becomes `/orders`
- @tanstack/react-hotkeys wrapped behind `useShortcut()` abstraction
- Portal uses external auth pool + `hq-external-session` cookie
- Greeting fades after 3s to 0.4 opacity
- Customer/Supplier role toggle (pill in header) -- both roles same session
- Floating AI button (Ctrl+J) when windows open
- Notification bell with unread count
- Theme/language toggles

### Claude's Discretion
None specified -- all decisions are locked.

### Deferred Ideas (OUT OF SCOPE)
- AI chat streaming / conversation logic (Phase 8)
- Material list builder (Phase 9)
- Quote detail, order tracking (Phase 10-11)
- Market window content (Phase 11)
- Notifications window content (Phase 11)
- Documents, Support, Settings windows (Phase 11)
- Supplier role views -- Stock, POs, Invoices, Analytics (Phase 12)
- PWA service worker / push notifications (Phase 11)
- Offline data caching (Phase 11)

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PORT-01 | Auth gate: `beforeLoad` route guard, redirect to website login if no session, SSO cookie on `.hyperquote.net` | `@hyperquote/auth` already has `authGuard()` with `requiredPool` support. Layout route pattern wraps all portal routes. Redirect URL includes `?login=portal&redirect={encoded_path}`. |
| PORT-02 | Spatial canvas: wide empty space, centered AI chat (max-width 640px), two glass buttons (Orders + Market), greeting with urgent items | Canvas is the portal index route. Greeting uses time-aware i18n keys. AI chat input is visual placeholder only (Phase 8 wires streaming). Navigation buttons are glass-styled cards. |
| PORT-17 | Glass window behavior: spring open/tween close, canvas recedes, escape closes, deep-linking via URL routes | `GlassWindow` component from `@hyperquote/ui` handles animation. Zustand store tracks `activeWindow`. TanStack Router file-based routes (`/orders`, `/market`) each render inside GlassWindow. Canvas recede via motion `animate` driven by Zustand `activeWindow !== null`. |

</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Architecture:** TanStack Start (NOT Next.js), React Aria (NOT shadcn), Motion v12 (NOT framer-motion), Bun (NOT npm), Cloudflare Workers (NOT Vercel)
- **Design:** Three colors only (white/black/blue #2563EB). Spatial glass, not dashboards. Geist Mono for ALL numbers
- **Code:** `useWatch()` never `watch()`. `.inputValidator()` not `.validator()`. Colors in `:root {}` never `@theme`. `isKeyboardDismissDisabled` on Dialogs
- **Tailwind v4:** `@tailwindcss/vite` required. `@plugin` not `@import`. Logical properties only (`ps-*`/`pe-*`/`ms-*`/`me-*`)
- **Motion v12:** Import from `motion/react`. CSS transitions for Popover/Menu. Motion for Modal only
- **SSR:** Zustand `skipHydration: true`. Locale from cookie/header server-side. `dir`/`lang` on `<html>` during SSR
- **i18n:** ALL numbers -> Arabic-Indic numerals in Arabic. ALL user-facing strings through react-i18next
- **Monorepo:** Import via `@hyperquote/*`, never relative paths. `workspace:*` protocol

## Standard Stack

### Core (already installed in monorepo)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @tanstack/react-start | ^1.167.12 | Framework | SSR on Cloudflare Workers, file-based routing |
| @tanstack/react-router | ^1.168.0 | Routing + URL state | `beforeLoad` auth guards, deep-linking, search params |
| react-aria-components | ^1.16.0 | Accessible UI primitives | Modal, ToggleButtonGroup, Popover, Button |
| motion | ^12.38.0 | Animation | Spring enter / tween exit, AnimatePresence |
| zustand | ^5.0.12 | UI state | activeWindow, activeRole, SSR-safe with skipHydration |
| @tanstack/react-hotkeys | ^0.8.3 | Keyboard shortcuts | Pre-alpha, wrapped in useShortcut() |
| lucide-react | ^1.7.0 | Icons | ShoppingBag, Store, Bell, Sparkles, X, AlertCircle |
| i18next + react-i18next | ^25.10.10 / ^17.0.0 | i18n | AR/EN, type-safe keys, Arabic-Indic numerals |
| @hyperquote/auth | workspace | Auth utilities | authGuard(), getServerSession(), createSupabaseBrowserClient() |
| @hyperquote/ui | workspace | Glass components | GlassWindow, GlassElevated, Skeleton, Toast, OfflineBanner |
| @hyperquote/i18n | workspace | i18n config | initI18n(), formatters |

### Needs Adding to Portal package.json

| Library | Version | Purpose |
|---------|---------|---------|
| @hyperquote/auth | workspace:* | Auth guard + session |
| @hyperquote/ui | workspace:* | GlassWindow, GlassElevated, OfflineBanner, Skeleton |
| @hyperquote/i18n | workspace:* | i18n setup |
| @hyperquote/types | workspace:* | Shared TypeScript types |
| @supabase/supabase-js | ^2.100.1 | Supabase client (peer dep of auth) |
| react-aria-components | ^1.16.0 | UI primitives |
| motion | ^12.38.0 | Animations |
| zustand | ^5.0.12 | UI state |
| lucide-react | ^1.7.0 | Icons |
| i18next | ^25.10.10 | i18n core |
| react-i18next | ^17.0.0 | React bindings |
| @tanstack/react-hotkeys | ^0.8.3 | Keyboard shortcuts |
| tailwindcss-react-aria-components | ^2.0.1 | React Aria Tailwind plugin (devDep) |
| zod | ^4.3.6 | Validation (search params) |

**Installation:**
```bash
cd apps/portal
bun add @hyperquote/auth@workspace:* @hyperquote/ui@workspace:* @hyperquote/i18n@workspace:* @hyperquote/types@workspace:* @supabase/supabase-js react-aria-components motion zustand lucide-react i18next react-i18next @tanstack/react-hotkeys zod
bun add -d tailwindcss-react-aria-components
```

## Architecture Patterns

### Portal Route Structure
```
apps/portal/src/
  router.tsx              # getRouter() with routerContext type
  styles.css              # Tailwind imports + tokens + custom variants
  routes/
    __root.tsx            # HTML shell, locale detection, theme, I18nProvider
    _portal.tsx           # Layout route: authGuard + canvas wrapper
    _portal/
      index.tsx           # Spatial canvas: greeting + AI chat + nav buttons
      orders.tsx          # Orders glass window (placeholder content)
      market.tsx          # Market glass window (placeholder content)
  lib/
    i18n.ts               # initI18n wrapper (same pattern as website)
    theme.ts              # getTheme/setTheme/initTheme (copy from website)
    env.ts                # Supabase URL/key from import.meta.env
  stores/
    portal.ts             # Zustand: activeWindow, activeRole, greeting state
  hooks/
    useShortcut.ts        # Wrapper around @tanstack/react-hotkeys
  components/
    canvas/
      SpatialCanvas.tsx   # Full viewport canvas with recede animation
      Greeting.tsx        # Time-aware greeting with fade animation
      AIChatInput.tsx     # Visual chat input (no streaming yet)
      NavButtons.tsx      # Orders + Market glass-style cards
    shell/
      PortalHeader.tsx    # Role toggle + notification bell + profile avatar
      ProfileMenu.tsx     # React Aria Popover with menu items
      NotificationBell.tsx # Bell icon with badge count
      RoleToggle.tsx      # React Aria ToggleButtonGroup
    windows/
      WindowShell.tsx     # Wrapper: GlassWindow + header bar + close button
      FloatingAIButton.tsx # 44px circle, bottom-right when windows open
```

### Pattern 1: Auth Layout Route
**What:** A pathless layout route (`_portal.tsx`) that runs `authGuard` in `beforeLoad` and provides auth context to all child routes.
**When to use:** Every portal route requires authentication.
**Example:**
```typescript
// src/routes/_portal.tsx
import { Outlet, createFileRoute } from '@tanstack/react-router'
import { authGuard } from '@hyperquote/auth'

export const Route = createFileRoute('/_portal')({
  beforeLoad: async () => {
    const auth = await authGuard({
      supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
      supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      // Cross-app redirect to website login
      loginPath: 'https://hyperquote.net?login=portal',
      requiredPool: 'external',
    })
    return { auth }
  },
  component: PortalLayout,
})

function PortalLayout() {
  return (
    <div className="relative h-dvh w-full overflow-hidden">
      <PortalHeader />
      <Outlet />
    </div>
  )
}
```

**Critical detail:** The `authGuard` currently uses `throw redirect({ to: ... })` which is for same-app routes. For cross-app redirect to `https://hyperquote.net`, the guard needs modification to handle external URLs. TanStack Router's `redirect()` supports `href` for external redirects:
```typescript
throw redirect({ href: `https://hyperquote.net?login=portal&redirect=${encodeURIComponent(location.href)}` })
```

### Pattern 2: URL-Routed Glass Windows
**What:** Each window is a TanStack Router route that renders inside a GlassWindow component. The canvas detects window routes and applies recede animation.
**When to use:** Deep-linkable windows that update the URL.
**Example:**
```typescript
// src/routes/_portal/orders.tsx
import { createFileRoute } from '@tanstack/react-router'
import { WindowShell } from '../../components/windows/WindowShell'

export const Route = createFileRoute('/_portal/orders')({
  component: OrdersWindow,
})

function OrdersWindow() {
  return (
    <WindowShell title="Orders" titleAr="الطلبات">
      {/* Placeholder content -- Phase 11 fills this */}
      <EmptyState message="Orders coming soon" />
    </WindowShell>
  )
}
```

### Pattern 3: Canvas Recede via Route Detection
**What:** The SpatialCanvas component checks if the current route is a window route and applies scale/blur/opacity animation.
**Example:**
```typescript
// In SpatialCanvas.tsx
const matches = useMatches()
const isWindowOpen = matches.some(m =>
  ['/orders', '/market'].some(p => m.pathname.startsWith(p))
)

return (
  <motion.div
    animate={isWindowOpen
      ? { scale: 0.96, filter: 'blur(2px)', opacity: 0.5 }
      : { scale: 1, filter: 'blur(0px)', opacity: 1 }
    }
    transition={{ duration: 0.3, ease: 'easeInOut' }}
  >
    {/* greeting, chat input, nav buttons */}
  </motion.div>
)
```

### Pattern 4: Zustand Portal Store
**What:** Single store for portal UI state -- activeRole, and any ephemeral UI state.
**Example:**
```typescript
import { create } from 'zustand'

interface PortalStore {
  activeRole: 'customer' | 'supplier'
  setActiveRole: (role: 'customer' | 'supplier') => void
  isFloatingAIOpen: boolean
  toggleFloatingAI: () => void
}

export const usePortalStore = create<PortalStore>()((set) => ({
  activeRole: 'customer',
  setActiveRole: (role) => set({ activeRole: role }),
  isFloatingAIOpen: false,
  toggleFloatingAI: () => set((s) => ({ isFloatingAIOpen: !s.isFloatingAIOpen })),
}))

// skipHydration not needed here since this store has no persistence
// skipHydration is for persisted stores that would cause hydration mismatch
```

### Pattern 5: useShortcut Abstraction
**What:** Thin wrapper around @tanstack/react-hotkeys to make it swappable.
**Example:**
```typescript
import { useHotkeys } from '@tanstack/react-hotkeys'

export function useShortcut(
  key: string,
  callback: () => void,
  opts?: { enabled?: boolean }
) {
  useHotkeys(key, callback, {
    enabled: opts?.enabled ?? true,
    enableOnFormTags: false,
  })
}
```

### Anti-Patterns to Avoid
- **Using React Aria Dialog without `isKeyboardDismissDisabled`:** Both Dialog and hotkeys fire on Escape. Always disable Dialog's Escape handling and use hotkeys.
- **Animating Popover/Menu with Motion v12:** Race condition (#9158). Use CSS transitions for React Aria Popover and Menu.
- **Module-level Supabase client on Workers:** Workers are long-lived isolates. Always create client inside request handler.
- **`navigator.language` in render:** Causes hydration mismatch. Detect locale from cookie/header on server.
- **`watch()` instead of `useWatch()`:** Broken with React 19 / React Compiler.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Glass window animations | Custom spring physics | `@hyperquote/ui` GlassWindow + Motion v12 AnimatePresence | Already built with correct spring/tween params |
| Auth guard | Manual cookie parsing | `@hyperquote/auth` authGuard() | Handles Supabase session, pool check, role extraction |
| Accessible modal | Custom overlay + focus trap | React Aria Modal/ModalOverlay | Focus trap, screen reader, aria attributes |
| Toggle buttons | Custom radio group | React Aria ToggleButtonGroup | Keyboard nav, ARIA, RTL |
| Profile menu | Custom dropdown | React Aria Popover + Menu | Focus management, keyboard nav, dismissal |
| Number formatting | Manual Arabic-Indic conversion | `@hyperquote/i18n` formatNumber() | Handles locale, grouping, Arabic-Indic digits |
| Keyboard shortcuts | addEventListener | @tanstack/react-hotkeys via useShortcut() | Input detection, modifier keys, cleanup |

## Common Pitfalls

### Pitfall 1: External Redirect in authGuard
**What goes wrong:** `authGuard` currently uses `redirect({ to: '/login' })` which is for same-app routes. Portal needs to redirect to a different domain (hyperquote.net).
**Why it happens:** The auth package was built for same-app use. Portal auth is cross-app.
**How to avoid:** Use `redirect({ href: externalUrl })` for external URLs. TanStack Router supports `href` for full URL redirects. May need to update the `authGuard` function or handle the redirect in the portal's `beforeLoad` directly.
**Warning signs:** Redirect goes to `/login` on the portal (404) instead of the website.

### Pitfall 2: GlassWindow Component Mismatch with Spec
**What goes wrong:** The existing `GlassWindow` in `@hyperquote/ui` uses `fixed inset-0` positioning with a backdrop click handler, but the portal spec requires the canvas to remain visible (receded) behind the window, not a full overlay.
**Why it happens:** The current GlassWindow was built as a generic modal overlay.
**How to avoid:** The portal's `WindowShell` component should compose `GlassWindow` or create a portal-specific variant. The window needs `max-width: 1200px, max-height: 90vh, centered` per spec, while the canvas remains interactive (receded but visible). May need to extend GlassWindow or use a portal-specific wrapper that positions the window as a layer over the receded canvas.
**Warning signs:** Canvas disappears completely when window opens, or window covers entire viewport.

### Pitfall 3: AnimatePresence with Route Changes
**What goes wrong:** AnimatePresence exit animations don't play when TanStack Router removes the component during navigation.
**Why it happens:** Router unmounts components immediately on route change. AnimatePresence needs the child to remain in the tree briefly for exit animation.
**How to avoid:** Use TanStack Router's `Outlet` with a wrapper that manages presence. Or render windows as overlays that are always mounted but conditionally visible, driven by route state rather than route unmounting.
**Warning signs:** Windows disappear instantly without tween exit animation.

### Pitfall 4: Zustand SSR Hydration Mismatch
**What goes wrong:** Zustand store has different initial state on server vs client.
**Why it happens:** Server renders with default values, client may have persisted state.
**How to avoid:** Use `skipHydration: true` only on persisted stores. For non-persisted stores (like portal UI state), defaults are the same on both sides. The portal store has no persistence, so this is less of a concern. Theme preference is handled separately via the inline script in __root.tsx.
**Warning signs:** React hydration warnings about mismatched content.

### Pitfall 5: Escape Key Conflict
**What goes wrong:** Pressing Escape fires both React Aria Dialog dismiss AND the hotkey handler.
**Why it happens:** Both listen for the same key event.
**How to avoid:** Set `isKeyboardDismissDisabled` on all React Aria Dialog/Modal components. Handle Escape exclusively through `useShortcut('Escape', ...)` with layered priority (elevated > window > canvas).
**Warning signs:** Window closes AND something else happens, or Escape doesn't work at all.

### Pitfall 6: i18n Namespace for Portal
**What goes wrong:** Portal tries to use `website` namespace translations.
**Why it happens:** The i18n config only has `common`, `units`, `website` namespaces. Portal needs its own namespace.
**How to avoid:** Add `portal` namespace JSON files to `@hyperquote/i18n/src/locales/{ar,en}/portal.json` and register in config.ts. Portal routes use `useTranslation('portal')`.
**Warning signs:** Missing translation keys, fallback to key strings.

## Code Examples

### Root Route (from website pattern, adapted for portal)
```typescript
// src/routes/__root.tsx
import { HeadContent, Outlet, Scripts, createRootRoute } from '@tanstack/react-router'
import { I18nProvider } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { useEffect } from 'react'
import { OfflineBanner } from '@hyperquote/ui'
import styles from '../styles.css?url'
import { setupI18n } from '../lib/i18n'
import { initTheme } from '../lib/theme'

function detectLocale(request?: Request): 'ar' | 'en' {
  if (!request) {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('hq-locale')
      if (stored === 'ar' || stored === 'en') return stored
    }
    return 'en'
  }
  const cookieHeader = request.headers.get('cookie') ?? ''
  const match = cookieHeader.match(/hq-locale=(ar|en)/)
  if (match) return match[1] as 'ar' | 'en'
  return 'en'
}

export const Route = createRootRoute({
  beforeLoad: async ({ context }) => {
    const request = (context as Record<string, unknown>).request as Request | undefined
    const locale = detectLocale(request)
    await setupI18n(locale)
    return { locale }
  },
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
    ],
    links: [{ rel: 'stylesheet', href: styles }],
  }),
  component: RootComponent,
})
```

### Time-Aware Greeting
```typescript
function getGreetingKey(): string {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return 'greeting.morning'
  if (hour >= 12 && hour < 17) return 'greeting.afternoon'
  if (hour >= 17 && hour < 22) return 'greeting.evening'
  return 'greeting.night'
}
```

### Glass Window Header Bar (per spec)
```typescript
// h-56px, px-24px, border-bottom, title left, close button right
<div className="flex items-center justify-between h-14 px-6 border-b border-[var(--color-border)]">
  <div>
    <h2 className="font-semibold text-[var(--text-xl)] text-[var(--color-text)]">{title}</h2>
    {subtitle && <p className="text-[var(--text-sm)] text-[var(--color-text-muted)]">{subtitle}</p>}
  </div>
  <Button
    onPress={onClose}
    className="flex items-center justify-center w-11 h-11 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
    aria-label={t('window.close')}
  >
    <X size={24} />
  </Button>
</div>
```

### Navigation Button (glass-style card)
```typescript
<Link
  to="/orders"
  className="flex items-center gap-3 h-16 px-5 rounded-2xl
    bg-[var(--color-card)] border border-[var(--color-border)]
    shadow-sm hover:shadow-lg hover:-translate-y-0.5
    transition-all duration-200"
>
  <ShoppingBag size={24} className="text-[var(--color-primary)]" />
  <span className="font-semibold text-[var(--text-lg)]">{t('nav.orders')}</span>
  {badgeCount > 0 && (
    <span className="font-mono text-[var(--text-sm)] bg-[var(--color-primary)] text-white rounded-full px-2 py-0.5">
      {formatNumber(badgeCount, locale)}
    </span>
  )}
</Link>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@tanstack/start` package | `@tanstack/react-start` | v1.121.0 | Old package frozen. Use react-start only |
| `vinxi` bundler | Pure Vite 7 | v1.121.0 | `vite dev` / `vite build` directly |
| `zodResolver` for forms | `standardSchemaResolver` | hookform/resolvers 5.x | New API, works with Zod 3 and 4 |
| `framer-motion` import | `motion/react` import | Motion v12 rebrand | Same API, new package name |
| TanStack Router `redirect({ to })` | Also supports `redirect({ href })` | v1.x | External URL redirects supported |

## Open Questions

1. **authGuard external redirect**
   - What we know: `authGuard()` uses `redirect({ to: loginPath })`. Portal needs external redirect to `hyperquote.net`.
   - What's unclear: Whether to modify the shared `authGuard` to support `href` or handle the redirect in portal's `beforeLoad` directly.
   - Recommendation: Handle in portal's `beforeLoad` -- call `getServerSession()` and throw `redirect({ href: ... })` if null. Simpler than modifying the shared package. The shared `authGuard` remains useful for same-app redirects (internal app).

2. **GlassWindow component adaptation**
   - What we know: Current `GlassWindow` is a full-screen overlay with backdrop. Portal needs a centered panel (max-width 1200px) over a visible receded canvas.
   - What's unclear: Whether to modify the shared component or create a portal-specific variant.
   - Recommendation: Create a `WindowShell` component in the portal that uses Motion directly for the window panel, while `SpatialCanvas` handles its own recede animation. The shared `GlassWindow` stays unchanged for other apps (internal platform uses ~90% viewport).

3. **Window route exit animations**
   - What we know: AnimatePresence needs children to stay mounted briefly for exit. TanStack Router unmounts immediately.
   - What's unclear: Best pattern for exit animations with file-based routing.
   - Recommendation: Keep windows as overlay components that render based on route match state. Use `useMatches()` to detect active window route and drive AnimatePresence. The window component wraps `Outlet` content -- when route changes away, AnimatePresence handles the exit.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 (browser mode for React Aria) |
| Config file | None yet -- needs creation for portal app |
| Quick run command | `cd apps/portal && bun run vitest run --reporter=verbose` |
| Full suite command | `cd apps/portal && bun run vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PORT-01 | Unauthenticated redirect to website login | unit | `bun run vitest run src/__tests__/auth-guard.test.ts -t "redirect"` | Wave 0 |
| PORT-01 | Internal-pool user gets error page | unit | `bun run vitest run src/__tests__/auth-guard.test.ts -t "internal pool"` | Wave 0 |
| PORT-02 | Canvas renders greeting + chat input + nav buttons | unit | `bun run vitest run src/__tests__/canvas.test.ts` | Wave 0 |
| PORT-02 | Time-aware greeting shows correct period | unit | `bun run vitest run src/__tests__/greeting.test.ts` | Wave 0 |
| PORT-17 | Window opens with spring animation on route | manual-only | Visual verification -- spring physics not testable in unit | N/A |
| PORT-17 | Escape closes topmost window | unit | `bun run vitest run src/__tests__/shortcuts.test.ts -t "escape"` | Wave 0 |
| PORT-17 | Deep-link `/orders` opens Orders window | unit | `bun run vitest run src/__tests__/deep-link.test.ts` | Wave 0 |

### Sampling Rate
- **Per task commit:** `cd apps/portal && bun run vitest run --reporter=verbose`
- **Per wave merge:** Full suite
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `apps/portal/vitest.config.ts` -- Vitest config for portal app
- [ ] `apps/portal/src/__tests__/auth-guard.test.ts` -- auth redirect tests
- [ ] `apps/portal/src/__tests__/canvas.test.ts` -- canvas render tests
- [ ] `apps/portal/src/__tests__/greeting.test.ts` -- time-aware greeting
- [ ] `apps/portal/src/__tests__/shortcuts.test.ts` -- keyboard shortcut tests

## Sources

### Primary (HIGH confidence)
- Codebase inspection: `@hyperquote/auth` package (guard.ts, server.ts, session.ts, types.ts)
- Codebase inspection: `@hyperquote/ui` package (GlassWindow.tsx, GlassElevated.tsx)
- Codebase inspection: `apps/website` (root route, layout route, i18n, theme patterns)
- Codebase inspection: `apps/portal` (existing scaffold -- vite.config.ts, wrangler.jsonc, package.json)
- `essential/brand/tokens.css` -- design tokens
- `essential/brand/UI-VISION.md` -- spatial philosophy, glass windows, three colors
- `essential/brand/STACK-DECISION.md` -- all package versions verified

### Secondary (MEDIUM confidence)
- [TanStack Router Authenticated Routes](https://tanstack.com/router/v1/docs/guide/authenticated-routes) -- beforeLoad pattern
- [Motion AnimatePresence](https://motion.dev/docs/react-animate-presence) -- exit animations
- [Motion Transitions](https://motion.dev/docs/react-transitions) -- spring vs tween config

### Tertiary (LOW confidence)
- None -- all findings verified against codebase or official docs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all packages already in monorepo, versions verified from package.json
- Architecture: HIGH -- patterns proven in website app (6 phases of production code)
- Pitfalls: HIGH -- identified from codebase inspection and STACK-DECISION.md known issues

**Research date:** 2026-04-01
**Valid until:** 2026-05-01 (stable stack, no fast-moving dependencies)
