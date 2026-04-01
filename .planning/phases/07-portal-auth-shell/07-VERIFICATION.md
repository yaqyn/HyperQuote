---
phase: 07-portal-auth-shell
verified: 2026-04-01T07:56:35Z
status: gaps_found
score: 26/29 items verified (all tiers)
gaps:
  - truth: "Numbers rendered with Geist Mono font"
    status: partial
    reason: "urgentCount in Greeting is interpolated into the i18n string as a plain string value — no font-mono span wrapper. Plan spec and CLAUDE.md both mandate Geist Mono for ALL numbers."
    artifacts:
      - path: "apps/portal/src/components/canvas/Greeting.tsx"
        issue: "formatNumber(urgentCount, locale) is passed as t() interpolation value, rendering without font-mono class. Span at line 48 has no font-mono."
    missing:
      - "Wrap count in <span className=\"font-mono\"> inside the urgentItems i18n string, or restructure Greeting to render count outside the t() call with explicit font-mono"

  - truth: "Logical CSS properties used throughout (ps-/pe-/ms-/me-)"
    status: partial
    reason: "WindowShell header uses px-6 (physical shorthand) instead of logical ps-6 pe-6. Frontend rules mandate logical properties only."
    artifacts:
      - path: "apps/portal/src/components/windows/WindowShell.tsx"
        issue: "Line 57: className includes px-6 which expands to pl-6 pr-6 (physical). Should be ps-6 pe-6 for RTL correctness."
    missing:
      - "Replace px-6 with ps-6 pe-6 in WindowShell header div (line 57)"

  - truth: "Ctrl+J shortcut fires on Ctrl key (not Cmd on Mac)"
    status: partial
    reason: "FloatingAIButton registers 'Mod+j' via useShortcut, not 'ctrl+j'. 'Mod' maps to Cmd on Mac and Ctrl on Windows/Linux. The plan spec says Ctrl+J. This is a behavioral ambiguity — on macOS, Ctrl+J will NOT work; Cmd+J fires instead. Acceptable if Mac is not a primary target, but deviates from spec."
    artifacts:
      - path: "apps/portal/src/components/windows/FloatingAIButton.tsx"
        issue: "Line 41: useShortcut('Mod+j', ...) — Mod key is platform-aware (Cmd on Mac). Plan spec says 'Ctrl+J' explicitly."
    missing:
      - "If Ctrl+J is strictly required, change to 'ctrl+j'. If cross-platform is intended, document the Mod key decision in the SUMMARY."
human_verification:
  - test: "Visit portal at /orders — verify glass window springs open with correct animation, canvas recedes to scale 0.96 / blur 2px / opacity 0.5"
    expected: "Window appears with spring (stiffness 200, damping 20). Canvas visibly recedes behind it."
    why_human: "Animation parameters verified in code but visual result can only be confirmed in browser"
  - test: "Press Escape with a window open"
    expected: "Window closes, canvas restores to full opacity/scale"
    why_human: "Keyboard event handling with React hooks cannot be confirmed programmatically"
  - test: "Switch locale to Arabic — verify RTL layout and Arabic-Indic numerals in counts"
    expected: "Header flips to RTL, NavButtons reverse, all numbers render in Arabic-Indic"
    why_human: "RTL layout correctness and numeral rendering requires visual verification"
  - test: "Mobile (<768px) — open window from phone viewport"
    expected: "Window occupies full screen, no rounded corners, slides from bottom"
    why_human: "Responsive behavior requires visual/device verification"
---

# Phase 7: Portal Auth + Shell Verification Report

**Phase Goal:** Authenticated customers land on a spatial canvas with centered AI chat and glass window navigation — the portal feels like a calm environment, not a dashboard
**Verified:** 2026-04-01T07:56:35Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Unauthenticated users are redirected to hyperquote.net login | ✓ VERIFIED | `_portal.tsx:14` — `throw redirect({ href: WEBSITE_URL + '?login=portal&redirect=...' })` |
| 2 | Internal-pool users see an error page, not the portal | ✓ VERIFIED | `auth.ts` pool check returns `isInternalUser: true`; `_portal.tsx:27` renders error with goInternal link |
| 3 | Portal renders with correct locale (AR/EN) and theme from SSR | ✓ VERIFIED | `__root.tsx:15-39` — detectLocale reads hq-locale cookie, setupI18n called in beforeLoad, I18nProvider at line 82 |
| 4 | Portal i18n namespace loads with all portal-specific keys | ✓ VERIFIED | `en/portal.json` + `ar/portal.json` with 40+ keys; `config.ts` registers portal namespace |
| 5 | Canvas renders full viewport with centered content at ~35-40vh | ✓ VERIFIED | `SpatialCanvas.tsx` — `h-dvh w-full flex flex-col items-center pt-[35vh]` |
| 6 | Time-aware greeting shows correct period and user name | ✓ VERIFIED | `Greeting.tsx:7-12` — getGreetingKey() with 4 time buckets; name interpolated |
| 7 | Greeting fades to opacity 0.4 after 3 seconds | ✓ VERIFIED | `Greeting.tsx:26-28` — setTimeout 3000ms; `animate={{ opacity: hasFaded ? 0.4 : 1 }}` at line 33 |
| 8 | AI chat input centered at max-width 640px with rotating placeholders | ✓ VERIFIED | `AIChatInput.tsx:60` — `max-w-[640px]`; `setInterval` every 8s with crossfade |
| 9 | Two navigation buttons (Orders + Market) render below chat input | ✓ VERIFIED | `NavButtons.tsx` — ShoppingBag/Store for customer, Package/ClipboardList for supplier |
| 10 | Role toggle appears for users with supplier role | ✓ VERIFIED | `RoleToggle.tsx` renders only when `hasSupplierRole=true`; `PortalHeader` passes auth roles check |
| 11 | Notification bell shows in header with unread dot | ✓ VERIFIED | `NotificationBell.tsx` — Bell icon with 8px dot, `aria-label` from i18n, links to `/notifications` |
| 12 | Profile avatar opens popover with menu items | ✓ VERIFIED | `ProfileMenu.tsx` — React Aria `DialogTrigger + Popover` with 6 menu items + sign-out confirmation |
| 13 | Glass windows open with spring animation (stiffness 200, damping 20) | ✓ VERIFIED | `WindowShell.tsx:41-42` — `stiffness: 200, damping: 20` in transition |
| 14 | Canvas recedes when window opens (scale 0.96, blur 2px, opacity 0.5) | ✓ VERIFIED | `SpatialCanvas.tsx:38-39` — exact values match spec |
| 15 | Escape closes the topmost window | ✓ VERIFIED | `WindowShell.tsx:24` — `useShortcut('Escape', handleClose)` |
| 16 | Clicking outside (dimmed canvas) closes window | ✓ VERIFIED | `WindowShell.tsx` — backdrop div onClick calls `navigate({ to: '/' })` |
| 17 | Deep-linking works: /orders opens Orders window directly | ✓ VERIFIED | `orders.tsx` — `createFileRoute('/_portal/orders')` renders WindowShell |
| 18 | Browser back closes window and returns to canvas | ✓ VERIFIED | TanStack Router history-based navigation — `navigate({ to: '/' })` pushes to history |
| 19 | Floating AI button appears when windows are open | ✓ VERIFIED | `FloatingAIButton.tsx:50` — `if (!isWindowOpen) return null` based on useMatches |
| 20 | Ctrl+J toggles floating AI panel | ? UNCERTAIN | Registered as `Mod+j` (line 41), not `ctrl+j`. Works on Win/Linux as Ctrl+J but fires Cmd+J on Mac |
| 21 | Keyboard shortcuts O/M/N open respective windows | ✓ VERIFIED | `_portal.tsx:68-70` — useShortcut('o'), ('m'), ('n') navigate to respective routes |
| 22 | Numbers rendered with Geist Mono font | ✗ FAILED | `Greeting.tsx:49-51` — urgentCount rendered via t() interpolation, no font-mono span |
| 23 | Logical CSS properties used throughout | ✗ FAILED | `WindowShell.tsx:57` — `px-6` (physical). All other components use logical properties correctly |

**Score:** 21/23 truths verified (2 failed, 1 uncertain)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `apps/portal/src/routes/_portal.tsx` | Auth layout route with beforeLoad guard | ✓ VERIFIED | redirect, pool check, PortalHeader all wired |
| `apps/portal/src/routes/__root.tsx` | Root HTML shell with locale/theme/I18nProvider | ✓ VERIFIED | detectLocale, setupI18n, I18nProvider, FOUC script |
| `apps/portal/src/stores/portal.ts` | Zustand portal store (activeRole, isFloatingAIOpen) | ✓ VERIFIED | All 5 store fields + actions present |
| `apps/portal/src/hooks/useShortcut.ts` | Keyboard shortcut abstraction | ✓ VERIFIED | Wraps useHotkey (correct v0.9.1 API) |
| `apps/portal/src/lib/env.ts` | Environment variable exports | ✓ VERIFIED | SUPABASE_URL, SUPABASE_ANON_KEY, WEBSITE_URL |
| `apps/portal/src/lib/i18n.ts` | i18n setup with setupI18n | ✓ VERIFIED | setupI18n exported, wraps initI18n |
| `apps/portal/src/lib/theme.ts` | Theme utilities | ✓ VERIFIED | getTheme, setTheme, toggleTheme, initTheme, persistTheme |
| `apps/portal/src/lib/auth.ts` | Server function for portal auth check | ✓ VERIFIED | createServerFn wrapping getServerSession with pool check |
| `packages/i18n/src/locales/en/portal.json` | English portal translations | ✓ VERIFIED | 40+ keys including all copywriting contract keys |
| `packages/i18n/src/locales/ar/portal.json` | Arabic portal translations | ✓ VERIFIED | Arabic text present: صباح الخير etc. |
| `packages/i18n/src/config.ts` | Portal namespace registered | ✓ VERIFIED | arPortal/enPortal imported, added to resources + ns array |
| `apps/portal/src/components/canvas/SpatialCanvas.tsx` | Full viewport canvas with recede animation | ✓ VERIFIED | motion.div, scale 0.96, blur 2px, opacity 0.5, useMatches |
| `apps/portal/src/components/canvas/Greeting.tsx` | Time-aware greeting with fade animation | ✓ VERIFIED | getGreetingKey, 3s fade, spring entrance |
| `apps/portal/src/components/canvas/AIChatInput.tsx` | Centered chat input with rotating placeholders | ✓ VERIFIED | max-w-[640px], Sparkles, ArrowUp, 8s rotation crossfade |
| `apps/portal/src/components/canvas/NavButtons.tsx` | Role-aware nav buttons | ✓ VERIFIED | ShoppingBag, Store, usePortalStore activeRole, links to /orders /market |
| `apps/portal/src/components/shell/PortalHeader.tsx` | Header with role toggle + bell + profile | ✓ VERIFIED | Absolute positioned, composes RoleToggle + NotificationBell + ProfileMenu |
| `apps/portal/src/components/shell/ProfileMenu.tsx` | React Aria Popover with menu + sign-out | ✓ VERIFIED | DialogTrigger + Popover, CSS transitions, inline sign-out confirmation |
| `apps/portal/src/components/shell/NotificationBell.tsx` | Bell icon with aria-label | ✓ VERIFIED | Bell, aria-label from t('bell.label'), Link to /notifications |
| `apps/portal/src/components/shell/RoleToggle.tsx` | CSS pill toggle | ✓ VERIFIED | usePortalStore setActiveRole, CSS transition on sliding indicator |
| `apps/portal/src/routes/_portal/index.tsx` | Portal home composing canvas components | ✓ VERIFIED | SpatialCanvas > Greeting > AIChatInput > NavButtons, real auth data from context |
| `apps/portal/src/components/windows/WindowShell.tsx` | Glass window wrapper | ✓ VERIFIED | stiffness 200, damping 20, max-w-[1200px], max-h-[90vh], backdrop-blur-xl, rounded-3xl, Escape |
| `apps/portal/src/components/windows/FloatingAIButton.tsx` | 44px blue circle + AI panel | ✓ VERIFIED | Sparkles, isFloatingAIOpen, 380px panel, isKeyboardDismissDisabled, isWindowOpen guard |
| `apps/portal/src/routes/_portal/orders.tsx` | Orders window route | ✓ VERIFIED | createFileRoute('/_portal/orders'), WindowShell, FloatingAIButton |
| `apps/portal/src/routes/_portal/market.tsx` | Market window route | ✓ VERIFIED | WindowShell, FloatingAIButton |
| `apps/portal/src/routes/_portal/notifications.tsx` | Notifications window route | ✓ VERIFIED | WindowShell, FloatingAIButton |
| `apps/portal/src/routes/_portal/documents.tsx` | Documents window route | ✓ VERIFIED | WindowShell, FloatingAIButton |
| `apps/portal/src/routes/_portal/support.tsx` | Support window route | ✓ VERIFIED | WindowShell, FloatingAIButton |
| `apps/portal/src/routes/_portal/settings.tsx` | Settings window route | ✓ VERIFIED | WindowShell, FloatingAIButton |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `_portal.tsx` | `@hyperquote/auth` | checkPortalAuth server fn | ✓ WIRED | `auth.ts` createServerFn wraps getServerSession; called in beforeLoad |
| `_portal.tsx` | `WEBSITE_URL` | redirect href | ✓ WIRED | `redirect({ href: redirectUrl })` at line 14 with login=portal param |
| `__root.tsx` | `@hyperquote/i18n` | setupI18n | ✓ WIRED | setupI18n imported from lib/i18n, called in beforeLoad |
| `SpatialCanvas.tsx` | `_portal/index.tsx` | component import | ✓ WIRED | imported and rendered in index.tsx line 2 |
| `RoleToggle.tsx` | `portal.ts` store | usePortalStore | ✓ WIRED | setActiveRole called on toggle click |
| `NavButtons.tsx` | `/orders`, `/market` routes | Link component | ✓ WIRED | `<Link to={item.to}>` with correct paths |
| `orders.tsx` | `WindowShell.tsx` | component import | ✓ WIRED | WindowShell imported and used in all 6 window routes |
| `WindowShell.tsx` | `motion/react` | spring/tween animations | ✓ WIRED | stiffness 200, damping 20 transition |
| URL `/orders` | `_portal/orders.tsx` | TanStack file-based routing | ✓ WIRED | createFileRoute('/_portal/orders') |
| `FloatingAIButton.tsx` | `portal.ts` store | isFloatingAIOpen | ✓ WIRED | usePortalStore toggleFloatingAI |
| `_portal.tsx` | `useShortcut` | O/M/N/Slash shortcuts | ✓ WIRED | PortalShortcuts component at line 65-71 |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `index.tsx` → Greeting | `userName` | `auth?.user?.user_metadata?.name` from checkPortalAuth server fn | Yes — live Supabase session | ✓ FLOWING |
| `index.tsx` → Greeting | `urgentCount` | Hardcoded `0` | No — documented stub for Phase 11 | ⚠️ STUB (documented) |
| `NotificationBell.tsx` | `hasUnread` | Hardcoded `false` | No — documented stub for Phase 11 | ⚠️ STUB (documented) |
| `NavButtons.tsx` | `badgeCount` | Hardcoded `0` | No — documented stub for Phase 11 | ⚠️ STUB (documented) |
| `AIChatInput.tsx` | submit action | Clears input only | No — Phase 8 wires AI streaming | ⚠️ STUB (documented) |

All stubs are explicitly documented in SUMMARYs with Phase 11/8 as the delivery point. They do not block the phase goal.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Portal builds without errors | `bun run build` in apps/portal | `✓ built in 3.73s` | ✓ PASS |
| Auth server fn compiles (not bundled to client) | Build produces separate `auth-aPhV2tEi.js` server chunk | Server chunk present | ✓ PASS |
| All 6 window routes exist | `ls apps/portal/src/routes/_portal/` | orders, market, notifications, documents, support, settings | ✓ PASS |
| No framer-motion imports | `grep -rn framer-motion apps/portal/src/` | No results | ✓ PASS |
| Portal namespace in i18n config | `grep portal packages/i18n/src/config.ts` | Registered in resources + ns array | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| PORT-01 | 07-01-PLAN | Auth gate: beforeLoad guard, redirect to website login, SSO cookie | ✓ SATISFIED | `_portal.tsx` beforeLoad with cross-app redirect to `?login=portal`; pool check rejects internal users |
| PORT-02 | 07-02-PLAN | Spatial canvas: wide empty space, centered AI chat (640px), two glass buttons, greeting | ✓ SATISFIED | SpatialCanvas + Greeting + AIChatInput + NavButtons all wired in index.tsx; recede animation present |
| PORT-17 | 07-03-PLAN | Glass window behavior: spring open/tween close, canvas recedes, escape closes, deep-linking | ✓ SATISFIED | WindowShell spring 200/20, SpatialCanvas recede 0.96/blur/opacity, Escape useShortcut, createFileRoute per window |

No orphaned requirements — all three mapped IDs match plans and have verified implementations.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `apps/portal/src/components/canvas/Greeting.tsx` | 49-51 | urgentCount interpolated into t() without font-mono span | ⚠️ Warning | Numbers display in default font, violating Geist Mono rule for ALL numbers |
| `apps/portal/src/components/windows/WindowShell.tsx` | 57 | `px-6` physical shorthand in header div | ⚠️ Warning | In RTL (Arabic), header start/end padding will not mirror correctly. `ps-6 pe-6` needed. |
| `apps/portal/src/components/windows/FloatingAIButton.tsx` | 41 | `Mod+j` instead of `ctrl+j` | ℹ️ Info | Fires Cmd+J on Mac instead of Ctrl+J. Deviates from plan spec. Acceptable if cross-platform intent is documented. |

### Human Verification Required

#### 1. Glass Window Spring Animation

**Test:** Navigate to `/orders` with a real or bypassed auth session
**Expected:** Window panel springs open (perceivably elastic, not linear), canvas visibly recedes behind it with blur
**Why human:** Motion animation quality cannot be asserted programmatically

#### 2. Escape Key and Backdrop Click-to-Close

**Test:** Open Orders window, press Escape; open again, click the dimmed backdrop
**Expected:** Both close the window; canvas restores to full opacity/scale/sharpness
**Why human:** Keyboard event + navigation interaction requires live browser

#### 3. Arabic RTL Layout

**Test:** Switch locale to Arabic via ProfileMenu language toggle
**Expected:** Text aligns right, layout mirrors, NavButtons order reverses, numbers show Arabic-Indic (١٢٣)
**Why human:** RTL correctness and numeral rendering requires visual inspection

#### 4. Mobile Full-Screen Windows

**Test:** Open Orders at <768px viewport width
**Expected:** Window occupies 100% screen, no rounded corners, slides from bottom instead of center-scale
**Why human:** Responsive behavior requires device or browser devtools simulation

### Gaps Summary

Three issues found:

1. **Geist Mono on urgentCount (Greeting.tsx)** — The `urgentCount` number is interpolated into the i18n `urgentItems` string as a plain value via `t()`. No `font-mono` span wraps the number. This violates the "Geist Mono for ALL numbers" rule. The fix is small: render the count separately with `font-mono`, or use a custom interpolation renderer. Does not affect the phase goal delivery but violates a non-negotiable design rule.

2. **px-6 physical shorthand in WindowShell header (WindowShell.tsx:57)** — `px-6` expands to `padding-left: 1.5rem; padding-right: 1.5rem` (physical). In Arabic (RTL), the window header start/end padding will not mirror, making it asymmetric. Should be `ps-6 pe-6` per the Tailwind v4 logical properties rule.

3. **Mod+j vs ctrl+j in FloatingAIButton** — `Mod+j` is cross-platform (Cmd on Mac, Ctrl elsewhere). The plan spec says "Ctrl+J". If the app targets Linux/Windows primarily, this is functionally correct. If macOS is expected, document the intent. This is informational, not blocking.

None of these gaps block the core phase goal (spatial canvas, auth gate, glass windows are fully functional). They are convention/quality violations.

---

_Verified: 2026-04-01T07:56:35Z_
_Verifier: Claude (gsd-verifier)_
