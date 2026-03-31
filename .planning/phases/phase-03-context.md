# Phase 3: Shared Packages

## Goal
All 7 shared packages build and export correct APIs, with a vertical slice proving the full stack end-to-end (auth -> RLS -> server fn -> component -> i18n -> dark mode).

## Dependencies
Phase 1 (Monorepo Scaffold), Phase 2 (Supabase + Initial Migrations).

## Requirements

- **FOUND-05**: Shared packages build: @hyperquote/ui (GlassWindow, StatusBadge, Skeleton, Toast, EmptyState, CurrencyDisplay, DateDisplay, UnitDisplay, LionMark, CommandPalette), @hyperquote/types, @hyperquote/i18n, @hyperquote/auth, @hyperquote/forms, @hyperquote/tables
- **FOUND-06**: Tailwind v4 with tokens.css renders correctly, colors in `:root {}` not `@theme`, RTL logical properties work
- **FOUND-07**: React Aria Components render with correct RTL support and Arabic-Indic numerals
- **FOUND-08**: i18next (^25.10.10) configured with AR+EN namespaces, type-safe keys, Arabic-Indic number formatting

## Success Criteria
1. GlassWindow component renders with spring-enter/tween-exit animation in both light and dark mode
2. Arabic-Indic numerals display correctly via CurrencyDisplay, DateDisplay, and UnitDisplay when locale is AR
3. i18next (^25.10.10) loads AR+EN namespaces with type-safe keys and switches locale without page reload
4. A vertical slice page fetches data through a server function, enforces RLS, renders with React Aria in RTL Arabic, and toggles dark mode
5. Tailwind v4 tokens.css with colors in `:root {}` renders correctly, RTL logical properties (ps-/pe-/ms-/me-) work

## What to Build
- `@hyperquote/types`: All TypeScript types from BACKEND.md Section 13 (enums as union types + entity interfaces)
- `@hyperquote/ui`: GlassWindow, GlassElevated, StatusBadge, Skeleton, EmptyState, Toast, CurrencyDisplay, DateDisplay, UnitDisplay, OfflineBanner, LionMark, CommandPalette
- `@hyperquote/i18n`: react-i18next config, AR+EN namespace files, number formatting utils, unit translations
- `@hyperquote/auth`: Supabase SSR client factory, `beforeLoad` auth guard, session helpers, SSO cookie config
- `@hyperquote/forms`: React Hook Form + Zod integration, React Aria form field wrappers, standardSchemaResolver
- `@hyperquote/tables`: TanStack Table + React Aria table component, sort/filter/select patterns
- Copy brand assets: tokens.css, font-face.css, WOFF2 files, logos into the appropriate package or public dirs

## Spec References

### DS.1 Color System
Three colors. Period.

| Token | Value | Role |
|-------|-------|------|
| `--color-base` | `#FFFFFF` (light) / `#09090B` (dark) | Background, space, canvas |
| `--color-text` | `#0F172A` (light) / `#FFFFFF` (dark) | Primary text, headings |
| `--color-primary` | `#2563EB` | Brand accent, interactive elements, links, CTAs |

**Derived tokens (generated from three colors):**

| Token | Purpose | Exact Value |
|-------|---------|-------------|
| `--color-text-muted` | Secondary text | 70% opacity |
| `--color-text-subtle` | Tertiary text | 50% opacity |
| `--color-border` | Dividers, table borders | 15% opacity |
| `--color-surface` | Slightly elevated bg | light: `#F8FAFC`, dark: `#18181B` |
| `--color-base-alt` | Footer, alternate sections | light: `#EFF6FF`, dark: `#18181B` |
| `--color-card` | Card/panel bg | light: `#FFFFFF`, dark: `#1C1C1E` |

**Semantic status colors (data only, not design):**

| Token | Value | Usage |
|-------|-------|-------|
| `--color-success` | Green | Confirmed, delivered, cleared, healthy, on-time |
| `--color-warning` | Yellow/Amber | Expiring, aging (1-30 days), idle, low stock |
| `--color-error` | Red | Failed, overdue, bounced, stopped, problem |
| `--color-info` | Blue-gray | Informational, in-transit, quoting |

**CEO app exception:** Zero accent colors. No blue for interactive elements. Emphasis through typography weight and contrast only. Semantic status colors remain for data.

**AR aging severity colors (Finance module + CEO):**

| Bucket | Color | Token |
|--------|-------|-------|
| Current | Green/Neutral | `--color-success` |
| 1-30 days | Yellow | `--color-yellow-400` |
| 31-60 days | Orange | `--color-orange-500` |
| 61-90 days | Red | `--color-red-400` |
| 90+ days | Dark Red (bold/badge) | `--color-red-600` |

Same colors apply across all AR views (portal, internal, CEO) for consistency.

Dark mode is literal inversion of White and Black. User-controlled toggle. System preference respected on first load.

Dark mode variant: `@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *))` -- not Tailwind `dark:` prefix.

**CRITICAL:** Colors in `:root {}`, NEVER in `@theme`. `--color-base` in `@theme` makes `text-base` set color instead of font-size.

### DS.2 Typography

All fonts self-hosted as WOFF2 from `essential/brand/fonts/`. Never from external URLs.

| Font | Usage |
|------|-------|
| **Inter** | All Latin text — headings, body, labels, buttons |
| **IBM Plex Sans Arabic** | All Arabic text. Weights 100-700 only. Never use Inter 800/900 in bilingual contexts. |
| **Geist Mono** | ALL numeric data — prices, quantities, IDs, dates, timestamps, KPIs. Brand rule: if it displays a number, it uses monospace. |

**Base font size:** 14px for all apps. **Website exception:** 16px for body text.

**Weight scale:**

| Weight | Usage |
|--------|-------|
| Inter 700 | Page/section titles, celebration text |
| Inter 600 | Section headers, entity names, greeting, emphasis |
| Inter 500 | Sub-headers, action buttons, row primary text, tab labels |
| Inter 400 | Body text, descriptions, secondary info, AI response text |
| Geist Mono 500 | Primary monetary values, KPI numbers, counts, percentages |
| Geist Mono 400 | Timestamps, dates, IDs, secondary numeric data |

**Driver app override:** Primary text (item names, quantities): 18-20sp minimum. Quantity input: 24sp bold. Confirmed data: 32sp bold. All text at 7:1 contrast ratio (WCAG AAA — dirty screens/sunlight/gloves).

**Warehouse mobile override:** Same large sizes as driver app. Numbers: 600+ font-weight minimum on glass backgrounds.

### DS.3 Spacing & Layout

**Grid:** 4px base unit. All spacing is a multiple of 4.

**Tailwind logical properties only:** `ps-*`, `pe-*`, `ms-*`, `me-*` — never `margin-left`/`padding-right`. Enables automatic RTL support.

**Max widths:**

| Context | Max Width |
|---------|-----------|
| Website content | 1280px, centered |
| Glass windows (desktop) | ~90% viewport width/height |
| Glass windows (mobile) | 100% viewport |
| AI chat (centered, home) | 720px |
| AI chat (sidebar) | 380-420px |
| Command palette | ~600px |
| Login panels | 360-400px |

### DS.4 Icons

**Library:** Lucide only. No other icon libraries.

| Property | Value |
|----------|-------|
| Style | Outlined, 1.5px stroke |
| Color | `currentColor` (inherits text color) |
| Size — inline | 16px |
| Size — buttons | 20px |
| Size — navigation | 24px |
| Size — empty states | 32-48px |

**Driver/Warehouse override:** Visual icon 24px but tappable area 48px+ with padding (WCAG touch target compliance).

### DS.5 Motion
| Type | When | Engine |
|------|------|--------|
| Spring | Entering | Motion v12 |
| Tween | Exiting | Motion v12 |
| CSS transition | Popovers, menus, hover states | Native CSS |

Three speeds: Fast (100-150ms), Medium (200-300ms), Slow (400-600ms). Colors change instantly -- never animate color transitions. 60fps minimum. Spring physics for all entering elements. CSS type includes scroll-triggered blur.

### DS.6 Glass Window System
**Window tier:** backdrop-blur-xl, rgba(255,255,255,0.80) / dark: rgba(0,0,0,0.80), subtle shadow, spring on open, tween on close. Desktop: ~90% viewport. Mobile: 100%.

**Elevated tier:** backdrop-blur-2xl, rgba(255,255,255,0.90) / dark: rgba(0,0,0,0.90), deeper shadow, floats above window tier.

**Glass panel container (for charts/data in glass):**
- `backdrop-filter: blur(12px)`
- `background: rgba(255,255,255,0.08)`
- `border: 1px solid rgba(255,255,255,0.12)`
- `border-radius: 16px`
- `padding: 24px`
- Hover: background brightens to `0.12`. Focus: `box-shadow` with accent color at 20% opacity.

**Charts in glass:** Use sparklines, area charts with gradient, single-color bar charts, donut charts, thin line charts (2-3 lines max), progress bars. Avoid pie charts, stacked bars, scatter plots, 3D. Gridlines at `rgba(255,255,255,0.06)`. Axis labels at `rgba(255,255,255,0.5)`.

### DS.7 Loading, Empty, Error States
- Loading: Skeleton shimmer loaders. No spinners. No "Loading..." text.
- Empty: Meaningful message + contextual CTA button.
- Error: inline error + retry button. Toast for async feedback. Offline banner at top.

### DS.8 Confirmation & Undo Patterns

**Undo pattern (reversible actions):** Execute immediately. Show toast with `[Undo]` link (8-10 second timeout). No confirmation dialog. Examples: removing an item from cart, archiving a conversation, marking a notification read.

**Confirmation dialog (irreversible actions):** Elevated glass modal. Action name in Inter 600 18px. Description in Inter 400 14px. "Cancel" (outline) + "[Action]" (colored per severity). Required for: sending to customer, applying payment, deleting records, accepting/declining quotes, advancing critical pipeline stages.

### DS.9 i18n & RTL

**Engine:** react-i18next with type-safe keys. All user-facing strings through i18n. Zero hardcoded English.

**Languages:** Arabic primary, English secondary.

**Direction:** `dir="rtl"` / `dir="ltr"` on `<html>`. Logical CSS properties handle layout flip automatically.

**Number translation (Arabic-Indic numerals):**

When locale is Arabic, ALL displayed numbers convert to Arabic-Indic numerals. No exceptions.

| Context | English | Arabic |
|---------|---------|--------|
| Quantities | 500 | ٥٠٠ |
| Prices | 56,400 | ٥٦٬٤٠٠ |
| Percentages | 14% | ١٤٪ |
| IDs / References | QR-2026-00042 | QR-٢٠٢٦-٠٠٠٤٢ |
| Dates | 2026-03-29 | ٢٠٢٦-٠٣-٢٩ |
| Phone numbers | +20 101 234 5678 | +٢٠ ١٠١ ٢٣٤ ٥٦٧٨ |
| Counts | "3 items" | "٣ عناصر" |
| Weights | "2,500 kg" | "٢٬٥٠٠ كجم" |
| Distances | "45 km" | "٤٥ كم" |
| Time | "4 hours" | "٤ ساعات" |
| Page numbers | "Page 2 of 5" | "صفحة ٢ من ٥" |

**Implementation:** Use `Intl.NumberFormat('ar-EG')` for all numeric formatting. For inline numbers in strings, use i18next interpolation with `formatParams: { val: { locale: 'ar-EG' } }`. Geist Mono font supports Arabic-Indic numerals — no font swap needed.

**Currency formatting:**
- English: `"EGP 56,400"` (prefix, comma separator)
- Arabic: `"٥٦٬٤٠٠ ج.م"` (suffix, Arabic-Indic numerals, momayyez separator)
- All via `Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP' })`

**Unit of Measure translation (full 28-unit table):**

When locale is Arabic, all unit abbreviations translate to Arabic. Stored as enum in database, displayed via i18n.

| Enum Value | English Display | Arabic Display | Arabic Abbreviation |
|------------|----------------|---------------|-------------------|
| `kg` | kg | كيلو جرام | كجم |
| `ton` | ton | طن | طن |
| `metric_ton` | metric ton | طن متري | ط.م |
| `meter` | m | متر | م |
| `sqm` | m² | متر مربع | م² |
| `cubic_meter` | m³ | متر مكعب | م³ |
| `liter` | L | لتر | ل |
| `piece` | pc | قطعة | قطعة |
| `bag` | bag | كيس | كيس |
| `bundle` | bundle | حزمة | حزمة |
| `pallet` | pallet | لوح تحميل | لوح |
| `roll` | roll | لفة | لفة |
| `sheet` | sheet | لوح | لوح |
| `box` | box | صندوق | صندوق |
| `carton` | carton | كرتونة | كرتونة |
| `set` | set | طقم | طقم |
| `pair` | pair | زوج | زوج |
| `foot` | ft | قدم | قدم |
| `inch` | in | بوصة | بوصة |
| `yard` | yd | ياردة | ياردة |
| `sqft` | ft² | قدم مربع | قدم² |
| `cubic_yard` | yd³ | ياردة مكعبة | يارده³ |
| `gallon` | gal | جالون | جالون |
| `lb` | lb | رطل | رطل |
| `linear_foot` | LF | قدم طولي | ق.ط |
| `linear_meter` | LM | متر طولي | م.ط |
| `board_foot` | BF | قدم خشبي | ق.خ |
| `truck_load` | TL | حمولة شاحنة | حمولة |

**Implementation:** Unit translations live in `@hyperquote/i18n` namespace `units`. Display component: `<UnitDisplay value={quantity} unit={unitEnum} />` renders both number and unit in the correct locale. Example: `<UnitDisplay value={500} unit="kg" />` → EN: "500 kg" → AR: "٥٠٠ كجم".

In data tables (Geist Mono for numbers): quantity and unit displayed as two elements — quantity in Geist Mono, unit in Inter/IBM Plex. Example: `<span className="font-mono">٥٠٠</span> <span>كجم</span>`.

**Date formatting:** Locale-aware via `Intl.DateTimeFormat`. Gregorian default. Islamic calendar option in settings. Arabic day/month names in Arabic context. All date numbers in Arabic-Indic when locale is Arabic.

**Relative time:** "2 hrs ago" (EN) / "منذ ساعتين" (AR) via `Intl.RelativeTimeFormat`.

**Table behavior:** Column order doesn't change in RTL. "#" always first, "Actions" always last. Numeric inputs stay LTR even in RTL context (user types Western digits, display converts to Arabic-Indic on blur/save).

### DS.10 Data Grids & Tables
TanStack Table + React Aria. Click to edit inline. Tab advances. Arrow keys navigate. Sort by column headers. Row selection via checkbox. Bulk actions toolbar. Numeric columns right-aligned in Geist Mono.

**Row states:** Hover: `var(--color-surface)` bg. Selected: `var(--color-primary)` at 8% opacity. Error: red left border 3px.

**Alternating rows:** Even rows: transparent. Odd rows: `var(--color-surface)` at 50% opacity.

**Sort indicator:** Lucide `ChevronUp`/`ChevronDown` 12px.

**Selection:** Shift+click for range select. Ctrl+click for multi-select.

### DS.11 Status Color System
| Status | Color | Used In |
|--------|-------|---------|
| Moving/Active | Green | Dispatch, Orders, Deliveries |
| Idle/Pending/Aging | Yellow/Amber | Dispatch, AR, Quotes |
| Stopped/Overdue/Error | Red | Dispatch, AR, Deliveries, Payments |
| Assigned/In Progress | Blue | Dispatch, Sales, Orders |
| Unassigned/Offline | Gray | Dispatch, Drivers, Tasks |

### DS.12 Keyboard-First Design

**Universal shortcut:** `Ctrl+K` / `Cmd+K` — command palette from anywhere.

**Hotkey scoping:** Single-key hotkeys fire only when no text input is focused. Keyboard scope managed via state machine: Canvas → Panel → Input.

**Every major action has a keyboard shortcut.** Shown in tooltips: "New Quote (Cmd+N)". Help overlay (`?` key) shows cheat sheet.

**Tab order:** Logical, following visual/workflow sequence. Skip-to-content links for accessibility. Focus management after actions: focus moves to logical next element, not back to top.

**Module hotkeys (Internal Platform):** S=Sales, P=Procurement, O=Orders, W=Warehouse, F=Finance, D=Dispatch, C=Customer Service, H=HR, A=Admin, R=Reports, I=AI. Pressing same hotkey toggles window. Escape closes current window.

**CEO app:** `/` focuses search. `Esc` clears/goes back. `Enter` triggers AI. No domain hotkeys.

### DS.13 Form Patterns

**Library:** React Hook Form + Zod for validation + React Aria Components for accessible inputs.

**Validation:** Inline field-level errors. Errors appear below field on blur or submit. Red border + error text in `var(--color-error)` Inter 400 12px. Never use toasts for validation.

**Auto-save:** Drafts auto-saved every 30 seconds for any form/editor. "Resume where you left off" for interrupted workflows.

**Required fields:** No asterisk convention. Instead, mark optional fields with "(optional)" suffix in label.

**Date pickers:** React Aria `DatePicker`. Geist Mono for date display. Min/max constraints enforced. Business day validation: Friday/Saturday (Egyptian weekend) flagged.

### DS.14 Offline Behavior

| App | Offline Strategy |
|-----|-----------------|
| Website | Service Worker for static assets. Offline fallback page. |
| Portal | IndexedDB for structured data. Cached pages served. Mutations disabled. |
| Internal | IndexedDB for structured data. "Last synced" timestamp. Mutations disabled. |
| CEO | Service Worker for app shell + IndexedDB cache. Read-only mode. |
| Driver | PowerSync + local SQLite. Full offline capability. GPS buffered. Photos queued. Mutations ENABLED (syncs on reconnect). |

**Offline banner (all apps except Driver):** Subtle top banner "You're offline — showing cached data." Auto-dismisses on reconnect.

**Driver offline:** No banner — offline is normal. Sync indicator: green (online) / amber (weak) / red (offline). All scans and POD captures work offline. Queue syncs automatically on reconnection.

### DS.15 PWA Configuration

| App | PWA | Install Prompt |
|-----|-----|---------------|
| Website | No | N/A |
| Portal | Yes | Subtle banner after 3rd visit (localStorage counter) |
| Internal | Yes | In Settings only. Never auto-prompt. |
| CEO | Yes | In Settings only. Never auto-prompt. |
| Driver | No (Capacitor native) | App store distribution |

Push notification permission: never requested immediately. Triggered after a notification-worthy action. Prompt: "Get notified when [context]?" + "Enable" / "Not now".

### DS.16 Touch Targets (Mobile & Warehouse)

| Context | Minimum Size | Gap |
|---------|-------------|-----|
| Standard mobile | 44dp (WCAG) | 8dp |
| Warehouse/Driver (gloves, dirty screens) | 56-64dp | 8-16dp |
| Primary action buttons | 64dp | — |
| Numeric keypad keys | 56dp | 4dp |

**One-handed layout (warehouse/driver):** Status bar (top, read-only) → Main content (middle) → Action buttons (bottom, thumb-reachable). Primary action always at bottom, full-width, 56-64dp.

**Audio feedback (warehouse):** Four sounds: beep (scan detected), OK tone (success), error tone (failure), success melody (task complete). Enabled by default. Workers react by sound without looking at screen.

### DS.17 Shared UI Component Library
| Component | Description |
|-----------|-------------|
| `GlassWindow` | Window-tier glass panel with spring open / tween close |
| `GlassElevated` | Elevated-tier glass panel for modals/confirmations |
| `LionMark` | SVG lion watermark (auto-switches by theme) |
| `Skeleton` | Content-shaped shimmer loader |
| `EmptyState` | Message + CTA + optional lion watermark |
| `StatusBadge` | Color-coded pill badge (semantic colors) |
| `CurrencyDisplay` | Locale-aware currency formatting (Geist Mono) |
| `DateDisplay` | Locale-aware date/time formatting |
| `OfflineBanner` | Top-of-viewport offline indicator |
| `Toast` | Minimal notification with optional Undo |
| `CommandPalette` | Ctrl+K search overlay (elevated glass) |

### DS.18 Shadow Scale

| Token | CSS Value | Usage |
|-------|-----------|-------|
| `shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` | Subtle cards, hover states |
| `shadow-md` | `0 4px 6px -1px rgba(0,0,0,0.1)` | Glass window tier |
| `shadow-lg` | `0 10px 15px -3px rgba(0,0,0,0.1)` | Elevated tier (modals) |
| `shadow-xl` | `0 20px 25px -5px rgba(0,0,0,0.1)` | Floating elements, command palette |
| `shadow-2xl` | `0 25px 50px -12px rgba(0,0,0,0.25)` | Full-screen overlays |

Dark mode: shadow opacity increases by 1.5x for visibility against dark backgrounds.

### DS.19 Responsive Breakpoints

Mobile-first approach. Use Tailwind v4 breakpoints:

| Breakpoint | Min Width | Target |
|------------|-----------|--------|
| (default) | 0px | Mobile phones |
| `sm` | 640px | Large phones, small tablets |
| `md` | 768px | Tablets, desktop-threshold |
| `lg` | 1024px | Laptops, desktop |
| `xl` | 1280px | Large desktop (max-width for content) |
| `2xl` | 1536px | Wide screens |

**Key thresholds:**
- < 768px: mobile layout (single column, stacked cards, bottom action bars, full-screen glass windows)
- ≥ 768px: desktop layout (multi-column, side panels, inline action bars, sized glass windows)
- ≥ 1440px: wide layout (TOC sidebar on docs, expanded data tables)

### DS.20 State Management Decision Tree

| Data Type | Tool | Persist | Example |
|-----------|------|---------|---------|
| Server data (lists, entities) | TanStack Query | Memory + 5min stale | Orders list, quote detail, product catalog |
| URL state (shareable) | TanStack Router search params + Zod | URL | `?category=cement&page=2`, `?status=sent` |
| UI state (fast, local) | Zustand | Memory (sessionStorage for chat) | Modal open/closed, active window, sidebar collapsed |
| Form state (temporary) | React Hook Form | Auto-save to localStorage every 30s | Quote builder draft, payment form |
| Auth/session | Supabase `@supabase/ssr` | Cookie on `.hyperquote.net` | Current user, JWT, permissions |
| Offline queue | IndexedDB (Portal/Internal) or PowerSync SQLite (Driver) | Device | Pending submissions, cached data |

**Cache invalidation:** On mutation success, `queryClient.invalidateQueries({ queryKey: [entity] })`. Real-time updates via Supabase Realtime override stale times.

### State Machines and Route Maps

State Machines (SM.1-SM.8) and Route Maps: see phase context files for each app (Phases 7-12 for Portal, 15-22 for Internal, 23 for CEO, 24-26 for Driver).

### Tailwind v4 Configuration Rules
- `@tailwindcss/vite` REQUIRED in vite.config.ts
- Colors in `:root {}`, NEVER in `@theme`
- React Aria plugin: `@plugin 'tailwindcss-react-aria-components'` -- NOT `@import`
- RTL: built-in logical properties `ps-*/pe-*/ms-*/me-*`
- `group-selected:` may break with TW v4 -- fallback to `group-data-[selected]:`

## Non-Negotiable Rules
1. **Three colors only.** White (#FFFFFF), Black (#0F172A / #09090B), Blue (#2563EB). Semantic colors for DATA only.
2. **Spatial glass, not dashboards.** Glass windows float over empty space. No sidebars, no breadcrumbs.
3. **Geist Mono for ALL numbers.** Prices, quantities, IDs, dates, timestamps, percentages, phone numbers.
4. **React Aria Components, NOT shadcn.** Use `react-aria-components` for all interactive elements.
5. **Motion v12, NOT framer-motion.** Import from `motion/react`.
6. **Colors in `:root {}`, NEVER in `@theme`.** Tailwind v4 critical.
7. **`useWatch()`, NEVER `watch()`.** React Hook Form's `watch()` is broken with React 19.
8. **`isKeyboardDismissDisabled` on Dialogs.** React Aria Dialog and global hotkeys both fire on Escape.
9. **ALL numbers -> Arabic-Indic numerals in Arabic context.** No exceptions.
10. **ALL units -> Arabic translations.** kg -> كجم, ton -> طن, m² -> م².

## Known Risks & Gotchas

### CRITICAL: Tailwind v4 `@theme` Color Collision
`--color-*` in `@theme` collides with built-in utilities. Keep colors in `:root {}`.

### HIGH: React Aria I18nProvider SSR Hydration Bug (#7474)
Pass locale explicitly to `I18nProvider` or wrap in `ClientOnly`.

### HIGH: React Hook Form `watch()` Broken
`watch()` unreliable with React Compiler. Use `useWatch()` everywhere.

### MEDIUM: Motion Popover Race Condition (#9158)
CSS animations for Popover/Menu, Motion for Modal only.

### MEDIUM: tailwindcss-react-aria-components Group Modifiers (#15401)
`group-selected:` may break with Tailwind v4. Fallback: `group-data-[selected]:`.

### LOW: i18next Version Discrepancy
NOTE: CLAUDE.md indicates i18next should be ^26.0.1. The ^25.10.10 in STACK-DECISION.md may need updating. Breaking change in v26: `interpolation.format` API removed (use `i18n.services.formatter.add()` instead).

### LOW: Zustand SSR Hydration Mismatch
`skipHydration: true` + `rehydrate()` in `useEffect`.

## Tips
- GlassWindow: spring enter (stiffness 200, damping 20), tween exit (200ms easeIn)
- StatusBadge: takes `status` prop, maps to color via DS.11 rules. Inter 500 11px.
- UnitDisplay: takes `value` + `unit` enum, renders with locale-aware number + translated unit.
- CurrencyDisplay: Intl.NumberFormat('ar-EG') for Arabic, Geist Mono font.
- All components use React Aria for accessibility. Never shadcn.
- Use `standardSchemaResolver` from `@hookform/resolvers`, NOT `zodResolver`.
- IBM Plex Sans Arabic supports weights 100-700 only. Never use Inter 800/900 in bilingual contexts.
