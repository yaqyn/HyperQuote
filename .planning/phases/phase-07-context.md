# Phase 7: Portal Auth + Shell

## Goal
Authenticated customers land on a spatial canvas with centered AI chat and glass window navigation -- the portal feels like a calm environment, not a dashboard.

## Dependencies
Phase 6 (Website Remaining Pages must be complete -- login flow needed for portal auth).

## Requirements

- **PORT-01**: Auth gate: `beforeLoad` route guard, redirect to website login if no session, SSO cookie on `.hyperquote.net`
- **PORT-02**: Spatial canvas: wide empty space, centered AI chat (max-width 640px), two glass buttons (Orders + Market), greeting with urgent items
- **PORT-17**: Glass window behavior: spring open/tween close, canvas recedes, escape closes, deep-linking via URL routes

## Success Criteria
1. Unauthenticated users are redirected to website login via `beforeLoad` route guard
2. Spatial canvas renders wide empty space with centered AI chat input (max-width 640px) and greeting with urgent items
3. Two glass buttons (Orders + Market) open glass windows with spring animation; Escape closes them
4. Glass windows deep-link via URL routes (e.g., `/orders` opens Orders window directly)

## What to Build
- Portal auth: `beforeLoad` route guard -> redirect to website login if no session
- Spatial canvas: wide empty space, AI chat centered (max-width 720px)
- Two glass window buttons below chat: "Orders" and "Market"
- Customer/Supplier role toggle (pill in header)
- Floating AI button (Ctrl+J) for when windows are open
- Notification bell with unread count (Supabase Realtime subscription)
- Theme/language toggles
- Glass window open/close animation system
- Deep-linking via URL routes

## Spec References

### 2.1 Authentication Gate

When unauthenticated user visits any portal route:
- Check SSO cookie in `beforeLoad` route guard (server-side, zero flash).
- If no valid session: redirect to `hyperquote.net?login=portal&redirect={encoded_path}`. Website opens Login Modal automatically.
- If valid session but no portal access (internal-only): error page with "Go to Internal App" button.

### 2.2 Portal Shell -- Spatial Layout

**THE PORTAL IS THE SPATIAL PHILOSOPHY. No sidebar. No top nav. No traditional page chrome.**

**Base canvas:** Full viewport. `var(--color-base)`. Completely empty -- no gradients, no patterns. The emptiness IS the design.

**PWA install prompt:** After 3rd visit (localStorage counter), subtle bottom banner: `var(--color-card)` bg, rounded-xl, shadow-md, max-width 400px, centered horizontally, mb-16px from viewport bottom. Content: HyperQuote icon 24px + "Install HyperQuote for quick access" Inter 400 14px + "Install" button (blue, 32px height) + close (Lucide `X` 16px). Dismissible. Once dismissed or installed, never shows again.

**Welcome greeting (canvas center, above AI chat):**
- Spring animation on load.
- Time-aware: "Good morning, Ahmed" / "صباح الخير، أحمد". Times: 5AM-12PM morning ("Good morning" / "صباح الخير"), 12-5PM afternoon ("Good afternoon" / "مساء الخير"), 5-10PM evening ("Good evening" / "مساء الخير"), 10PM-5AM night ("Good night" / "تصبح على خير").
- If urgent items: "3 items need your attention" with AlertCircle icon. Items: quotes awaiting response, orders with status changes, overdue actions.
- Greeting fades after 3s to opacity 0.4 (stays visible, becomes background).

**AI Chat -- centered, primary interaction:**
- Position: centered horizontally, ~40% from top of viewport.
- Input: h-56px, rounded-2xl, border 1px, bg card, shadow-sm. px-20px.
- Placeholder rotates every 8s (CSS opacity crossfade): "What do you need today?" -> "Try: I need 500 bags of cement" -> "Try: Reorder my last purchase" -> "Try: What's the status of my order?" / Arabic equivalents.
- Sparkles icon 20px at inline-start, `var(--color-primary)` at 50% opacity. Send button: 40px circle, blue bg, ArrowUp icon. Opacity 0.3 when empty, 1.0 when input has text.
- On focus: border becomes `var(--color-primary)` 1.5px, shadow `0 0 0 3px rgba(37,99,235,0.1)`. Placeholder stops rotating, shows single placeholder.

**Chat message area (grows above input):**
- User messages: blue bg, white text, rounded-2xl.
- AI messages: card bg, border, can contain: plain text, product cards, material list preview, order status card, action buttons.
- Typing indicator: "HyperQuote is thinking..."
- Cancel: send button becomes stop button (Square icon, red tint). AbortController.

**Navigation buttons (below chat input, mt-24px):**
- Two glass-style cards side by side, gap 16px.
- "Orders": ShoppingBag 24px blue + "Orders" Inter 600 16px + badge count (active quotes + orders). h-64px, rounded-2xl.
- "Market": Store 24px blue + "Market" Inter 600 16px. No badge.
- Hover: translateY(-2px), shadow-lg. On click: opens glass window.
- Mobile: stack vertically if < 480px.

**Supplier role toggle (users with supplier role only):**
- Top-right, ToggleButtonGroup with "Customer" / "Supplier" segments. 200px total, h-36px, rounded-full.
- Active: blue bg, white text. Inactive: transparent, muted text. Sliding indicator.
- On switch: all windows close (tween 150ms). Canvas resets. Navigation buttons change: Customer = "Orders" + "Market", Supplier = "Stock" (Package) + "Purchase Orders" (ClipboardList).
- Both roles in same session. Zustand: `activeRole: 'customer' | 'supplier'`. TanStack Query keyed by role.
- URL: `/` for customer, `/supplier` for supplier.

**Settings / Profile (top inline-end):**
- Notification bell: Bell 20px. Blue dot if unread. Opens Notifications window.
- Profile avatar: 32px circle. Click -> popover (React Aria Popover): name, company, menu (Settings, Documents, Support, Language, Theme, Sign Out).
- Sign Out: on click shows inline "Are you sure?" with "Cancel" and "Sign Out" buttons (red text). On confirm: POST to sign-out server function, clear SSO cookie, redirect to `hyperquote.net`.

**Glass window behavior (universal for all portal windows):**
- When window opens:
  - Canvas elements scale to 0.96, blur(2px), opacity 0.5. Tween 300ms.
  - Window: spring animation (opacity 0->1, scale 0.98->1, stiffness 200, damping 20).
  - Max-width 1200px, max-height 90vh, centered. Card bg, backdrop-blur-xl 85% opacity. Rounded-3xl. Shadow-2xl.
  - Header bar: h-56px, px-24px, border-bottom 1px `var(--color-border)`. Left: title (Inter 600 18px) + optional subtitle (Inter 400 13px muted). Right: close button (X 24px, 44px touch target, `var(--color-text-muted)`, hover `var(--color-text)`).
  - Border: 1px `var(--color-border)` at 50% opacity.
  - Escape closes. Click outside window (on dimmed canvas) closes window.
- When window closes: tween (opacity 1->0, 150ms). Canvas restores.
- Deep linking: `/orders` opens Orders window. `/` closes all. Browser back closes window.

**Elevated layer (modals OVER windows):**
- Stronger glass: backdrop-blur-2xl, 90% opacity, shadow-3xl. Overlay: black 40%.
- Focus trapped. Escape closes elevated (window stays open).

**Mobile (< 768px):**
- Canvas: greeting + chat full width px-16px. Buttons stack vertically.
- Glass windows: full-screen (100vw, 100vh). Slides up from bottom. No rounded corners. Swipe right/back to close.
- Profile popover -> full-screen bottom sheet.
- Supplier toggle moves inside profile menu (not floating).

**Keyboard shortcuts:**
- `/` -- Focus AI chat input
- `Escape` -- Close topmost layer
- `O` -- Open Orders window (when no input focused)
- `M` -- Open Market window
- `N` -- Open Notifications
- All via @tanstack/react-hotkeys, fire only when no text input focused.

**Floating AI button (when windows open):**
- 44px circle, blue bg, Sparkles 20px. Bottom-right. Spring entrance after window opens.
- On click: mini AI chat as Elevated glass panel (380px width, 60vh max-height, anchored bottom-right/bottom-left RTL). `backdrop-blur-2xl bg-white/90 dark:bg-black/90`, rounded-2xl, shadow-2xl. Contains: compact chat input (44px height) + scrollable message area + close button (X 16px).
- Context-aware greeting examples: "I see you're looking at Order #847 — need help?" / "Browsing the market — want me to find something specific?"
- `Ctrl+J` toggles from anywhere.
- Auto-closes when parent window closes.

**Offline:** Subtle top banner appears. Chat input disabled with placeholder "Chat unavailable offline". Windows show cached data with "Showing cached data" label. Mutations disabled — add-to-quote, submit-quote buttons show tooltip "You're offline" on hover.

### Portal Route Map
| Route | Window/View | Auth |
|-------|-------------|------|
| `/` | Home canvas (AI chat + buttons) | Required |
| `/orders` | Orders window | Required |
| `/orders/new` | Material list builder | Required |
| `/orders/[id]` | Quote/order detail | Required |
| `/market` | Market window | Required |
| `/market/[slug]` | Product detail | Required |
| `/notifications` | Notifications window | Required |
| `/documents` | Documents window | Required |
| `/support` | Support window | Required |
| `/settings` | Settings window | Required |
| `/supplier` | Supplier home | Required + supplier role |
| `/supplier/stock` | Stock & pricing | Required + supplier role |
| `/supplier/orders` | PO inbox (supplier view) | Required + supplier role |
| `/supplier/invoices` | Invoice submission (supplier view) | Required + supplier role |
| `/supplier/analytics` | Analytics (supplier view) | Required + supplier role |
| `/join` | Team invitation acceptance | Token-based |

### Dual Auth Pool (Portal)
Portal uses external auth pool + `hq-external-session` cookie. Cross-pool access impossible.

## Non-Negotiable Rules
1. **Spatial glass, not dashboards.** No sidebar, no breadcrumbs, no traditional navigation. Glass windows float over empty space.
2. **AI chat is the PRIMARY interface.** Buttons are for users who prefer direct navigation.
3. **React Aria Components** for all interactions. Modal for glass windows, ToggleButtonGroup for role switch, Popover for profile menu.
4. **Motion v12** for spring open / tween close on glass windows. Import from `motion/react`.
5. **`isKeyboardDismissDisabled` on Dialogs.** Handle Escape via hotkeys only.
6. **Geist Mono for ALL numbers** -- badge counts, timestamps, prices.
7. **Arabic-Indic numerals** in Arabic context.
8. **Zustand** for UI state (activeRole, activeWindow). `skipHydration: true` for SSR.
9. **URL deep-linking** for all windows. Opening Orders -> URL becomes `/orders`.

## Known Risks & Gotchas

### Portal Auth
- `beforeLoad` must check SSO cookie server-side -- zero flash of unauthenticated content.
- Redirect back to original portal URL after login on website.
- If internal-only user somehow reaches portal: show error with redirect to internal app.

### Glass Window System
- Spring enter + tween exit must be consistent across all windows.
- Canvas must recede (scale + blur + opacity) when window opens -- this is the spatial philosophy.
- **Window state preservation:** When user swaps modules, current window state preserved in Zustand (keyed by module name). Preserved state includes: scroll position, active tab/sub-view, form input values, step progress in multi-step flows, selected filters, and expanded/collapsed sections. On return, window restores to exact previous state with no loading delay (data from TanStack Query cache). State is session-scoped — cleared on logout or browser close. Auto-saved form drafts (persisted to server via `saveDraft()` server function) are SEPARATE from window state — drafts survive across sessions, window state does not.

### Supplier Role Toggle
- Both roles operate in same session. No page reload.
- AI chat context resets on switch (new conversation, different system prompt).
- TanStack Query caches keyed by role.

### Pre-Alpha Packages
- @tanstack/react-hotkeys (0.8.3) is pre-alpha. Wrap behind `useShortcut()` abstraction. Swappable to react-hotkeys-hook if unstable.
- Arrow keys: ListBox/Menu + global hotkeys conflict. `{ enabled: !isMenuOpen }` on arrow key hotkeys.

## Tips
- AI chat is the PRIMARY interface. Buttons are for users who prefer direct navigation.
- Portal uses external auth pool + `hq-external-session` cookie
- Spatial philosophy: no sidebar, no breadcrumbs, glass windows float over empty space
- Greeting fades after 3s to 0.4 opacity -- does not disappear completely
- Glass windows: spring open (stiffness 200, damping 20), tween close (150ms)
- Role toggle: Zustand store holds `activeRole`, TanStack Query caches keyed by role
- Deep-linking: each window has a URL route. Browser back closes window.
