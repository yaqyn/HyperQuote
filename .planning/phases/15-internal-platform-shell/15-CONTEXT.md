# Phase 15: Internal Platform Shell

## Goal
Internal users land on a spatial canvas with glass windows, hotkeys for 11 modules, and a command palette — the operational hub that replaces traditional dashboards.

## Dependencies
- Phase 3 (Shared Packages) must be complete — GlassWindow, StatusBadge, CommandPalette, etc.
- Phase 14 (Database -- all tables) must be complete — urgent item queries need all business tables
- Auth tables and internal pool must exist (from Phase 2)

## Requirements

- **INT-01**: Auth — `beforeLoad` with internal pool check (`hq-internal-session` cookie)
- **INT-02**: Canvas — time-aware greeting, urgent item count (aggregated from 6 sources), lion watermark, role-based quick actions
- **INT-03**: Icon strip — 11 module icons (permission-filtered), hotkeys (S/P/O/W/F/D/C/H/A/R/I)
- **INT-04**: Glass windows — spring open/tween close, ~90% viewport, window state preservation on swap (Zustand keyed by module)
- **INT-05**: Command palette — Ctrl+K, elevated glass, fuse.js cross-entity search, keyboard navigation, permission-filtered
- **INT-06**: Notifications — badge on bell icon, glass window, grouped by time, real-time via Supabase Realtime
- **INT-07**: Mobile — canvas grid of tappable glass cards, full-screen module views, back gesture
- **INT-08**: Shared activity feed / @mention / handoff infrastructure

## Success Criteria
1. Auth gate checks internal pool (`hq-internal-session` cookie) and rejects external users
2. Canvas shows time-aware greeting, urgent item count (aggregated from 6 sources), and lion watermark
3. Pressing S/P/O/W/F/D/C/H/A/R/I opens the corresponding module in a glass window (permission-filtered)
4. Ctrl+K opens command palette with fuse.js cross-entity search and keyboard navigation
5. Swapping between windows preserves each window's state (Zustand keyed by module)
6. Shared activity feed component renders on any entity with @mentions, internal/external comments, and system events

## What to Build
- Auth: `beforeLoad` with internal pool check
- Canvas: greeting, urgent item count, lion watermark
- Icon strip (11 icons, permission-filtered)
- Glass window open/close with spring/tween animations
- Hotkey system (S/P/O/W/F/D/C/H/A/R/I) with keyboard scope state machine
- Window state preservation on swap (Zustand keyed by module)
- Window header: module icon + name + close button
- Ctrl+K command palette (Elevated glass, cross-entity search)
- Notifications window
- Mobile: canvas shows tappable glass cards
- Activity feed / @mention infrastructure

## Spec References

### FRONTEND.md — APP 3 SHELL: Layout, Navigation, and Canvas

**Type:** TanStack Start SPA. Single unified application with 11 role-based modules.
**Deploy:** Cloudflare Worker at `app.hyperquote.net`
**Auth:** Supabase Auth via `@supabase/ssr`, internal auth pool cookie on `.hyperquote.net`. SSO with CEO app.

**Post-Login Layout:**
Wide open space. Pure white (light) or pure black (dark). No decoration.

**Left edge:** Soft vertical strip of minimal icons, one per module (left side in LTR, right side in RTL). Always visible, never hidden behind hover. Icons are permission-filtered -- if the employee lacks access to a module, the icon does not render and the hotkey does not register.

**Canvas (home state):**
- Clean greeting: "Good morning, Ahmed" (time-aware, localized)
- If urgent items: "Good morning, Ahmed -- 3 items need attention" with subtle emphasis
- 1-2 contextual quick-action buttons based on role
- NO KPI cards, NO metrics, NO charts on the canvas
- Lion watermark at barely-perceptible opacity

**Urgent item sources (6):**
1. RFQs unassigned > 30 minutes
2. Quotes expiring within 24 hours
3. Approvals pending for this user
4. Deliveries with problems (red status)
5. Invoices overdue > 60 days (finance only)
6. SLA breaches in progress

### Navigation Model

**Icon strip (11 modules):**

| Position | Icon | Module | Hotkey |
|----------|------|--------|--------|
| 1 | Sales tag | Sales | `S` |
| 2 | Shopping cart | Procurement | `P` |
| 3 | Clipboard list | Orders/Operations | `O` |
| 4 | Warehouse | Warehouse | `W` |
| 5 | Banknote | Finance | `F` |
| 6 | Truck | Logistics/Dispatch | `D` |
| 7 | Headset | Customer Service | `C` |
| 8 | Users | HR | `H` |
| 9 | Settings gear | Admin | `A` |
| 10 | Bar chart | Reports/Analytics | `R` |
| 11 | Sparkles | AI | `I` |

**Interaction:**
- Click icon or press hotkey: glass window opens with spring animation, canvas recedes
- Press different hotkey while window open: crossfade swap to new module
- Press `Escape`: close current window, return to canvas
- Press same hotkey: close current window (toggle behavior)
- Hotkeys fire only when no text input is focused (keyboard scope via XState store: Canvas -> Panel -> Input)

**Ctrl+K: Command Palette**
- Elevated glass window (stronger frosted effect)
- Built from React Aria `Autocomplete` + `Dialog` + `Menu`
- Fuzzy search via fuse.js across: entities (orders, quotes, customers, suppliers, products), actions ("Create Quote", "Assign Driver"), module navigation, recent items
- Results grouped by category with keyboard navigation
- Permission-filtered

**Notifications:**
- Badge/dot indicator on a bell icon in the top-right area of the canvas (no glow, no pulse, no animation on the badge itself)
- Click opens a notifications glass window (same pattern as modules)
- Grouped by time (Today, Yesterday, Older)
- Each notification: icon + title + timestamp + action link
- Mark as read, mark all read, mute by type
- Sources: system events, @mentions, approval requests, SLA warnings, delivery status changes
- Real-time via Supabase Realtime `postgres_changes`

### Mobile Adaptation

- Canvas shows module icons as tappable glass cards in a grid (2 columns)
- Each card: module icon + name + badge count if applicable
- Tapping opens full-screen module view
- Back gesture (swipe from edge) returns to canvas
- No icon strip on mobile -- the canvas grid replaces it
- Ctrl+K equivalent: search icon in top bar, opens full-screen search overlay
- Bottom safe area respected on all screens

### Glass Window Behavior

**Window tier (modules):**
- Frosted glass effect: `backdrop-blur-xl bg-white/80 dark:bg-black/80`
- Subtle shadow for depth
- Rounded corners (consistent radius from brand tokens)
- Spring animation on open (Motion v12), tween on close
- **Window header:** Every glass window has a 56px header bar at the top. Left side (inline-start): module icon (Lucide, 20px, `var(--color-text-muted)`) + module name (Inter 600 16px, `var(--color-text)`), gap 8px. Right side (inline-end): close button (Lucide `X` 20px, 44px touch target, `var(--color-text-muted)`, hover `var(--color-text)`). Subtle bottom border (1px `var(--color-border)` at 50% opacity). px-24px. The header identifies which module is active at all times -- critical when switching between modules via hotkeys.
- Windows take up ~90% of viewport width and height on desktop, 100% on mobile
- Scrollable content within the window
- **State preservation:** When a user presses a different hotkey to swap modules, the current window's state is preserved in Zustand store (keyed by module name). Preserved state includes: scroll position, active tab/sub-view, form input values, step progress in multi-step flows, selected filters, and expanded/collapsed sections. On return (pressing the same hotkey again), the window restores to the exact previous state with no loading delay (data from TanStack Query cache). State is session-scoped -- cleared on logout or browser close. Auto-saved form drafts (persisted to server via `saveDraft()` server function) are separate from window state -- drafts survive across sessions, window state does not.

**Elevated tier (modals, command palette, confirmations):**
- Stronger glass: `backdrop-blur-2xl bg-white/90 dark:bg-black/90`
- Deeper shadow
- Content behind dims slightly
- `isKeyboardDismissDisabled` on React Aria Dialog -- Escape handled by hotkeys system only to avoid double-fire

### Loading, Empty, and Error States

**Loading:** Skeleton shimmer loaders matching the expected content shape. No spinners. No "Loading..." text.

**Empty states:** Meaningful message + contextual CTA button. Example: "No RFQs yet" + "View quote pipeline" button. Lion watermark at barely-perceptible opacity behind the message when contextually appropriate.

**Error states:**
- Failed data fetch: inline error message + "Retry" button
- Failed action: toast notification (minimal, top of viewport, stacked)
- Network offline: subtle top banner "You're offline -- showing cached data" with auto-dismiss on reconnect
- Permission denied: redirect to canvas

### Offline Behavior

IndexedDB for structured data, Service Worker for app shell. Cached data shown with "Last synced" timestamp. Mutations disabled when offline.

### PWA Configuration

- PWA manifest present
- Install prompt: in Settings only. Never auto-prompt.
- Offline: subtle top banner "You're offline -- showing cached data." Mutations disabled. Reconnect: banner auto-dismisses, data refreshes.

### Realtime Pattern

Realtime data invalidates TanStack Query cache -- never writes directly to the store. Real-time updates via Supabase Realtime `postgres_changes`.

### Cross-Cutting: Activity Feed / @Mentions / Handoff

- Activity feed on every entity (orders, quotes, customers, deliveries, tickets)
- @mentions with role-aware routing
- Internal vs external comments (blue=internal, gray=external)
- System events interleaved
- "Hot Potato" rule: unacknowledged within 30 min -> escalates to department manager
- Vacation delegation routing

## Non-Negotiable Rules

1. **TanStack Start, NOT Next.js.** Use `@tanstack/react-start`.
2. **React Aria Components, NOT shadcn.** Autocomplete, Dialog, Menu for command palette.
3. **Motion v12, NOT framer-motion.** Spring for entering windows, tween for exiting.
4. **Spatial glass, not dashboards.** NO sidebar nav, NO breadcrumbs, NO KPI cards on canvas.
5. **`isKeyboardDismissDisabled` on Dialogs.** Escape handled by hotkeys only.
6. **Geist Mono for ALL numbers.** Urgent item counts, timestamps, badge counts.
7. **Three colors only.** White, Black, Blue #2563EB.
8. **Permission-filtered.** If employee lacks access, icon and hotkey don't exist.
9. **Colors in `:root {}`, NEVER in `@theme`.**
10. **Bun, NOT npm/yarn/pnpm.**

## Known Risks & Gotchas

- **@tanstack/react-hotkeys is 0.x pre-alpha** — wrap behind `useShortcut()` abstraction. If unstable, swap to `react-hotkeys-hook`.
- **Arrow keys conflict:** ListBox/Menu + global hotkeys. Use `{ enabled: !isMenuOpen }` on arrow key hotkeys.
- **Escape key conflict:** React Aria Dialog and global hotkeys both fire on Escape. Use `isKeyboardDismissDisabled`.
- **Keyboard scope state machine** (Canvas -> Panel -> Input) managed via @xstate/store (<1KB).
- **Window state preservation:** Zustand store keyed by module name. Must not cause hydration mismatches with SSR.
- **100+ routes** may slow Vite dev server — use lazy imports, code-split route tree.
- **Zustand SSR:** Use `skipHydration: true` + `rehydrate()` in useEffect.

## Tips

- Icon strip icons: Lucide, 24px, currentColor. Permission check via `authorize()` helper.
- GlassWindow component from @hyperquote/ui: spring enter (stiffness 200, damping 20), tween exit (200ms easeIn).
- Command palette: ~200 lines, built from React Aria Autocomplete + Dialog + Menu.
- Urgent items: aggregate from 6 different queries — use server function with parallel queries.
- Popovers and menus: use CSS transitions, NOT Motion v12 (avoids race condition #9158).
